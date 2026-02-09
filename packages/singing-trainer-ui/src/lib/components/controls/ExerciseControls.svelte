<script lang="ts">
  /**
   * Exercise Controls Component
   *
   * UI for starting/stopping lesson playback and collecting results.
   * Extended with:
   * - Merged foundations support
   * - Avatar-spoken phase instructions
   * - Wait-for-input display state
   * - Per-segment scoring summaries
   */

  import { exerciseState, type SegmentSummary } from '../../stores/exerciseState.svelte.js';
  import { highwayState } from '../../stores/highwayState.svelte.js';
  import { appState } from '../../stores/appState.svelte.js';
  import { resultsState, type ResultsSummary } from '../../stores/resultsState.svelte.js';
  import { preferencesStore } from '../../stores/preferencesStore.svelte.js';
  import { chooserState } from '../../stores/chooserState.svelte.js';
  import { overdubExerciseChooserState } from '../../stores/overdubExerciseChooserState.svelte.js';
  import { referenceAudio } from '../../services/referenceAudio.js';
  import { getPitchByMidi } from '@mlt/pitch-data';
  import { onDestroy } from 'svelte';
  import type { SpeakingPitchUsage, AnyLessonTemplate } from '@mlt/lesson-templates';
  import { getTemplate } from '@mlt/lesson-templates';
  import {
    mountAndShowLessonAvatar,
    disposeLessonAvatar,
    speakWithLessonAvatar,
    cancelLessonAvatarSpeech,
  } from '../../engine/controllerAdapters.js';

  // Local state for exercise defaults
  let numLoops = $state(5);
  let tempo = $state(108);
  let referenceVolume = $state(-12);
  let speakingPitchUsage = $state<SpeakingPitchUsage>('none');
  let minAmplitudeDb = $state(-60);
  let minVoicedMs = $state(400);
  let minCoveragePct = $state(60);
  let bandLowMinOffsetSemis = $state(-8);
  let bandLowMaxOffsetSemis = $state(-3);
  let bandHighMinOffsetSemis = $state(3);
  let bandHighMaxOffsetSemis = $state(8);
  let holdBandSemitones = $state(1);
  let minSlideSemitones = $state(3);
  let waitForInput = $state(false);
  let showImmediateFeedback = $state(true);
  let showScore = $state(true);

  // Active lesson state
  let activeLessonId = $state<string | null>(null);
  let activeLesson = $derived<AnyLessonTemplate | null>(
    activeLessonId ? (getTemplate(activeLessonId) ?? null) : null
  );
  const usesSpeakingPitch = $derived(
    activeLesson?.speakingPitchUsage && activeLesson.speakingPitchUsage !== 'none'
  );

  // Speaking pitch note label
  const speakingPitchNote = $derived(preferencesStore.speakingPitchNoteName);

  // Completion tracking
  let completionTriggered = $state(false);

  // Polling interval for results collection (bypasses Svelte reactivity issues with 60fps animation)
  let resultsPollingInterval: ReturnType<typeof setInterval> | null = null;

  // Phase instruction tracking
  let lastInstructionKey = $state<string | null>(null);
  let transitionInstruction = $state<string | null>(null);
  let instructionTimeoutId: ReturnType<typeof setTimeout> | null = null;
  type GuideStep = { message: string; segmentName: string | null; phaseIndex: number };
  let lessonGuideSteps = $state<GuideStep[]>([]);
  let lessonGuideIndex = $state(0);
  let lessonGuideVisible = $state(false);
  let lessonGuideDismissed = $state(false);
  let isRetryingPortion = $state(false);

  // Reactive state from stores
  const isActive = $derived(exerciseState.state.isActive);
  const isPlaying = $derived(exerciseState.state.isPlaying);
  const currentPhase = $derived(exerciseState.state.currentPhase);
  const currentPhaseLabel = $derived(exerciseState.state.currentPhaseLabel);
  const currentSegmentName = $derived(exerciseState.state.currentSegmentName);
  const progress = $derived(exerciseState.getCurrentProgress());
  const results = $derived(exerciseState.getResults());
  const hasResults = $derived(results.length > 0);
  const isWaitingForInput = $derived(highwayState.state.isWaitingForInput);

  // Calculate stats from results
  const averageAccuracy = $derived(exerciseState.getAverageAccuracy());
  const hitCount = $derived(exerciseState.getHitCount());
  const totalCount = $derived(results.length);
  const segmentSummaries = $derived<SegmentSummary[]>(exerciseState.getSegmentSummaries());

  function setTransitionInstruction(message: string | null) {
    transitionInstruction = message;
    if (instructionTimeoutId) {
      clearTimeout(instructionTimeoutId);
      instructionTimeoutId = null;
    }
    if (!message) return;
    instructionTimeoutId = setTimeout(() => {
      transitionInstruction = null;
      instructionTimeoutId = null;
    }, 5200);
  }

  function getGuideStepIndexByMessage(message: string): number {
    return lessonGuideSteps.findIndex((step) => step.message === message);
  }

  function buildLessonGuideSteps(template: AnyLessonTemplate | null): GuideStep[] {
    if (!template || !('pattern' in template) || !template.pattern?.phases?.length) {
      return [];
    }
    const steps: GuideStep[] = [];
    const seen = new Set<string>();
    for (let phaseIndex = 0; phaseIndex < template.pattern.phases.length; phaseIndex++) {
      const phase = template.pattern.phases[phaseIndex];
      if (!phase.instructionMessage) continue;
      const key = `${phase.segmentName ?? ''}::${phase.instructionMessage}`;
      if (seen.has(key)) continue;
      seen.add(key);
      steps.push({
        message: phase.instructionMessage,
        segmentName: phase.segmentName ?? null,
        phaseIndex,
      });
    }
    return steps;
  }

  function getPhaseStartTimeMs(phaseIndex: number): number {
    const pattern = exerciseState.state.pattern;
    const tempoBpm = exerciseState.state.config.tempo;
    const leadInMs = exerciseState.state.config.leadInMs ?? 0;
    if (!pattern || !pattern.phases?.length || phaseIndex < 0) {
      return 0;
    }
    const microbeatDurationMs = (60 / tempoBpm) * 1000 / 2;
    let elapsedMicrobeats = 0;
    for (let i = 0; i < Math.min(phaseIndex, pattern.phases.length); i++) {
      elapsedMicrobeats += pattern.phases[i].durationMicrobeats;
    }
    return leadInMs + elapsedMicrobeats * microbeatDurationMs;
  }

  function scheduleReferenceFromTime(playbackTimeMs: number) {
    const notes = exerciseState.getGeneratedNotes();
    const referenceTones = notes
      .filter(isReferenceNote)
      .filter((n): n is { midi: number; startTimeMs: number; durationMs: number } => typeof n.midi === 'number')
      .map((n) => {
        const relativeStart = n.startTimeMs - playbackTimeMs;
        const relativeEnd = n.startTimeMs + n.durationMs - playbackTimeMs;
        if (relativeEnd <= 0) {
          return null;
        }
        return {
          midi: n.midi,
          startTimeMs: Math.max(0, relativeStart),
          durationMs: relativeStart < 0 ? relativeEnd : n.durationMs,
        };
      })
      .filter((tone): tone is { midi: number; startTimeMs: number; durationMs: number } => tone !== null);
    referenceAudio.stop();
    referenceAudio.scheduleReferenceTones(referenceTones);
  }

  function isFoundationsMergedLessonActive(): boolean {
    return activeLessonId === 'foundations-1-merged';
  }

  function getGuideStepIndexForTime(targetMs: number): number {
    let bestIndex = -1;
    let bestStart = -Infinity;
    for (let i = 0; i < lessonGuideSteps.length; i++) {
      const step = lessonGuideSteps[i];
      if (!step) continue;
      const start = getPhaseStartTimeMs(step.phaseIndex);
      if (start <= targetMs + 1 && start > bestStart) {
        bestStart = start;
        bestIndex = i;
      }
    }
    return bestIndex;
  }

  function getRetryFeedbackMessage(note: any): string {
    const label = String(note?.label ?? '').toUpperCase();
    if (note?.targetKind === 'slideWindow') {
      if (note?.slideDirection === 'down') {
        return 'Almost there. Keep the sound going and slide downward more clearly. Let us try that portion again.';
      }
      return 'Almost there. Keep the sound going and slide upward more clearly. Let us try that portion again.';
    }
    if (label.includes('LOW')) {
      return 'Almost there. Aim clearly for the lower zone. Let us try that portion again.';
    }
    if (label.includes('HIGH')) {
      return 'Almost there. Aim clearly for the higher zone. Let us try that portion again.';
    }
    if (label.includes('HOLD')) {
      return 'Almost there. Hold one pitch as steadily as you can. Let us try that portion again.';
    }
    if (note?.targetKind === 'windowAnyPitch') {
      return 'Almost there. Use a clear pitched sound and then release it. Let us try that portion again.';
    }
    return 'Let us try that portion again.';
  }

  async function retryFailedPortion(note: any): Promise<void> {
    if (!isActive || isRetryingPortion) return;

    isRetryingPortion = true;
    completionTriggered = false;

    const targetMs = Math.max(0, Number(note?.startTimeMs ?? 0));
    const retryMessage = getRetryFeedbackMessage(note);
    const stepIndex = getGuideStepIndexForTime(targetMs);

    if (stepIndex >= 0) {
      lessonGuideIndex = stepIndex;
    }
    setTransitionInstruction(retryMessage);
    lastInstructionKey = null;

    cancelLessonAvatarSpeech();
    referenceAudio.stop();

    // Hard-cut to the beginning of the failed portion and pause for corrective feedback.
    highwayState.hardCutTo(targetMs, false);
    exerciseState.setPlaying(false);
    exerciseState.updatePhase(targetMs);

    try {
      await speakWithLessonAvatar(retryMessage, {
        expression: 'feedback_bad',
        rate: 0.95,
      });
    } catch (error) {
      console.warn('[Exercise] Retry feedback speech failed:', error);
    }

    if (!isActive) {
      isRetryingPortion = false;
      return;
    }

    scheduleReferenceFromTime(targetMs);
    highwayState.resume();
    exerciseState.setPlaying(true);
    isRetryingPortion = false;
  }

  async function speakGuideStep(stepIndex: number) {
    const step = lessonGuideSteps[stepIndex];
    if (!step) return;
    setTransitionInstruction(step.message);
    try {
      await speakWithLessonAvatar(step.message, {
        expression: 'encouraging',
        rate: 0.95,
      });
    } catch (error) {
      console.warn('[Exercise] Avatar speech failed:', error);
    }
  }

  function hardCutToGuideStep(stepIndex: number) {
    const step = lessonGuideSteps[stepIndex];
    if (!step || !isActive) return;

    const targetMs = Math.max(0, getPhaseStartTimeMs(step.phaseIndex));

    // Hard-cut current portion and restart from the selected step.
    cancelLessonAvatarSpeech();
    referenceAudio.stop();
    completionTriggered = false;
    exerciseState.clearResults();
    lastInstructionKey = null;

    highwayState.hardCutTo(targetMs, true);
    exerciseState.setPlaying(highwayState.state.isPlaying);
    exerciseState.updatePhase(targetMs);
    scheduleReferenceFromTime(targetMs);
  }

  function initializeLessonGuide(template: AnyLessonTemplate | null) {
    lessonGuideSteps = buildLessonGuideSteps(template);
    lessonGuideIndex = 0;
    lessonGuideVisible = lessonGuideSteps.length > 0;
    lessonGuideDismissed = false;
  }

  function handleGuidePrev() {
    if (lessonGuideIndex <= 0) return;
    lessonGuideIndex -= 1;
    hardCutToGuideStep(lessonGuideIndex);
  }

  function handleGuideNext() {
    if (lessonGuideIndex >= lessonGuideSteps.length - 1) return;
    lessonGuideIndex += 1;
    hardCutToGuideStep(lessonGuideIndex);
  }

  function handleGuideExit() {
    if (isActive) {
      handleStop();
      return;
    }
    lessonGuideVisible = false;
    lessonGuideDismissed = true;
    cancelLessonAvatarSpeech();
  }

  /**
   * Track phase based on highway currentTimeMs
   */
  $effect(() => {
    if (!isActive || !isPlaying) return;

    const currentTimeMs = highwayState.state.currentTimeMs;
    exerciseState.updatePhase(currentTimeMs);
  });

  /**
   * Speak transition/instruction text as phases change.
   */
  $effect(() => {
    if (!isActive || !isPlaying) return;

    const phase = exerciseState.getCurrentPhaseMeta();
    if (!phase?.instructionMessage) return;
    if (lessonGuideDismissed) return;

    const key = `${exerciseState.state.currentLoop}:${exerciseState.state.currentPhaseIndex}:${phase.instructionMessage}`;
    if (key === lastInstructionKey) return;

    lastInstructionKey = key;
    setTransitionInstruction(phase.instructionMessage);
    const stepIndex = getGuideStepIndexByMessage(phase.instructionMessage);
    if (stepIndex >= 0) {
      lessonGuideIndex = stepIndex;
    }

    if (phase.speakInstruction) {
      void speakGuideStep(stepIndex >= 0 ? stepIndex : lessonGuideIndex);
    }
  });

  /**
   * Watch for restart request (from "Try Again" button)
   */
  $effect(() => {
    if (exerciseState.state.restartRequested && !isActive) {
      exerciseState.consumeRestartRequest();
      void handleStart();
    }
  });

  /**
   * Start polling for results (called when exercise starts)
   */
  function startResultsPolling() {
    resultsPollingInterval = setInterval(() => {
      collectResults();
      checkCompletion();
    }, 200); // Poll every 200ms
  }

  /**
   * Stop polling for results (called when exercise stops)
   */
  function stopResultsPolling() {
    if (resultsPollingInterval) {
      clearInterval(resultsPollingInterval);
      resultsPollingInterval = null;
    }
  }

  function isInputNote(note: any): boolean {
    return note?.role === 'input';
  }

  function isReferenceNote(note: any): boolean {
    return note?.role === 'reference';
  }

  function getTargetLabel(note: any): string | undefined {
    if (note?.label) return note.label;
    if (note?.lyric) return note.lyric;
    if (note?.targetKind === 'windowAnyPitch') return 'ANY PITCH';
    if (note?.targetKind === 'windowBand') return 'PITCH BAND';
    if (note?.targetKind === 'slideWindow') {
      return note?.slideDirection === 'down' ? 'SLIDE DOWN' : 'SLIDE UP';
    }
    return undefined;
  }

  function getResultLabel(result: any): string {
    if (result?.targetLabel) return result.targetLabel;
    if (typeof result?.targetPitch === 'number') return getPitchName(result.targetPitch);
    return 'Window';
  }

  function getSettingNumber(
    settings: Record<string, number | boolean>,
    key: string,
    fallback: number
  ): number {
    const value = settings[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  }

  function getSettingBoolean(
    settings: Record<string, number | boolean>,
    key: string,
    fallback: boolean
  ): boolean {
    const value = settings[key];
    return typeof value === 'boolean' ? value : fallback;
  }

  /**
   * Collect results from highway performance data
   */
  function collectResults() {
    if (isRetryingPortion) {
      return;
    }

    const performances = highwayState.getPerformanceResults();
    const notes = exerciseState.getGeneratedNotes();
    const inputNotes = notes
      .map((note, index) => ({ note, index }))
      .filter(({ note }) => isInputNote(note));

    // Check each input note for completion
    for (let inputIndex = 0; inputIndex < inputNotes.length; inputIndex++) {
      const { note, index } = inputNotes[inputIndex];
      const noteId = `target-${index}`;
      const perf = performances.get(noteId);

      if (perf && !exerciseState.hasResultForLoop(inputIndex)) {
        if (isFoundationsMergedLessonActive() && perf.hitStatus !== 'hit') {
          void retryFailedPortion(note);
          return;
        }

        const accuracy = calculateAccuracy(perf);
        const targetPitch = typeof note.midi === 'number' ? note.midi : null;
        const targetLabel = getTargetLabel(note);

        exerciseState.addResult({
          loopIndex: inputIndex,
          targetPitch,
          targetLabel,
          targetSegmentId: note.segmentId,
          targetSegmentName: note.segmentName,
          accuracy,
          performance: perf,
        });
      }
    }
  }

  /**
   * Check if exercise is complete and trigger results modal
   */
  function checkCompletion() {
    const completedLoops = exerciseState.state.results.length;
    const totalInputs = exerciseState.getGeneratedNotes().filter(isInputNote).length;

    if (completedLoops >= totalInputs && totalInputs > 0 && !completionTriggered) {
      completionTriggered = true;
      handleExerciseComplete();
    }
  }

  /**
   * Handle exercise completion - stop and show results modal
   */
  function handleExerciseComplete() {
    handleStop();

    // Reset highway to clear the pitch grid
    highwayState.reset();

    // Build summary from collected results
    const exerciseResults = exerciseState.getResults();
    const notesHit = exerciseResults.filter(r => r.performance?.hitStatus === 'hit').length;
    const totalNotes = exerciseResults.length;

    // Calculate average pitch deviation from hits
    let totalDeviation = 0;
    let deviationCount = 0;
    exerciseResults.forEach(r => {
      if (r.performance?.hitStatus === 'hit' && typeof r.performance.pitchAccuracyCents === 'number') {
        totalDeviation += Math.abs(r.performance.pitchAccuracyCents);
        deviationCount++;
      }
    });

    const summary: ResultsSummary = {
      totalNotes,
      notesHit,
      notesMissed: totalNotes - notesHit,
      accuracyPercent: totalNotes > 0 ? (notesHit / totalNotes) * 100 : 0,
      goldenNotesHit: 0,
      goldenNotesTotal: 0,
      phraseResults: exerciseResults.map((r, i) => ({
        phraseIndex: i,
        notesHit: r.performance?.hitStatus === 'hit' ? 1 : 0,
        totalNotes: 1,
        accuracyPercent: r.accuracy,
        lyricPreview: `${r.targetSegmentName ?? 'Segment'} - ${getResultLabel(r)}`,
      })),
      averagePitchDeviationCents: deviationCount > 0 ? totalDeviation / deviationCount : 0,
    };

    // Show results modal
    resultsState.show(summary, {
      title: 'Pitch Matching Lesson',
      source: 'exercise',
    });
  }

  /**
   * Calculate accuracy percentage from performance data
   */
  function calculateAccuracy(perf: any): number {
    const clamp = (value: number) => Math.max(0, Math.min(100, value));

    if (perf && typeof perf.pitchAccuracyCents === 'number' && perf.hitStatus === 'hit') {
      const maxCents = 50;
      const accuracy = 100 - (Math.abs(perf.pitchAccuracyCents) / maxCents) * 100;
      return clamp(accuracy);
    }

    if (typeof perf?.pitchCoverage === 'number') {
      return clamp(perf.pitchCoverage);
    }
    if (typeof perf?.voicedCoverage === 'number') {
      return clamp(perf.voicedCoverage);
    }
    if (typeof perf?.bandCoverage === 'number') {
      return clamp(perf.bandCoverage);
    }
    return perf?.hitStatus === 'hit' ? 100 : 0;
  }

  /**
   * Cleanup on component destroy
   */
  onDestroy(() => {
    setTransitionInstruction(null);
    stopResultsPolling();
    if (isActive) {
      handleStop();
    }
  });

  /**
   * Use current Y-axis range for pitch range
   */
  function useCurrentRange() {
    const range = appState.state.yAxisRange;
    exerciseState.setPitchRange(range.minMidi, range.maxMidi);
  }

  /**
   * Use full piano range
   */
  function useFullRange() {
    exerciseState.setPitchRange(21, 108); // A0 to C8
  }

  /**
   * Start the exercise
   */
  async function handleStart() {
    // Auto-switch to highway mode
    appState.setVisualizationMode('highway');

    // Mount and show the avatar for lesson instructions
    await mountAndShowLessonAvatar();
    if (lessonGuideSteps.length === 0) {
      initializeLessonGuide(activeLesson);
    }

    // Update configuration including speaking pitch usage
    exerciseState.configure({
      numLoops,
      tempo,
      referenceVolume,
      speakingPitchUsage,
      templateId: activeLessonId ?? undefined,
      minAmplitudeDb,
      minVoicedMs,
      minCoveragePct,
      bandLowMinOffsetSemis,
      bandLowMaxOffsetSemis,
      bandHighMinOffsetSemis,
      bandHighMaxOffsetSemis,
      holdBandSemitones,
      minSlideSemitones,
      waitForInput,
      showImmediateFeedback,
      showScore,
    });

    // Set pitch range to current Y-axis range
    useCurrentRange();

    // Initialize reference audio
    await referenceAudio.init();
    referenceAudio.setVolume(referenceVolume);

    // Start exercise (generates notes)
    exerciseState.start();

    const notes = exerciseState.getGeneratedNotes();

    // Speak first lesson instruction before playback begins.
    if (lessonGuideSteps.length > 0 && !lessonGuideDismissed) {
      lessonGuideIndex = 0;
      await speakGuideStep(0);
      const firstStep = lessonGuideSteps[0];
      if (firstStep) {
        lastInstructionKey = `0:${firstStep.phaseIndex}:${firstStep.message}`;
      }
    }
    if (!exerciseState.state.isActive) {
      return;
    }

    highwayState.setFeedbackConfig({
      minAmplitudeDb,
      minVoicedMs,
      minCoveragePct,
      minSlideSemitones,
    });
    highwayState.setWaitForInput(waitForInput);

    // Set highway state with generated notes
    highwayState.setTargetNotes(notes);

    // Start highway playback
    highwayState.start();
    exerciseState.setPlaying(true);

    // Start polling for results
    startResultsPolling();

    // Schedule reference tones aligned with current playback position.
    scheduleReferenceFromTime(0);
  }

  /**
   * Stop the exercise
   */
  function handleStop() {
    // Stop polling
    stopResultsPolling();

    // Reset completion flag
    completionTriggered = false;

    // Reset instruction state
    lastInstructionKey = null;
    setTransitionInstruction(null);
    lessonGuideVisible = false;
    lessonGuideIndex = 0;
    lessonGuideSteps = [];
    lessonGuideDismissed = false;
    cancelLessonAvatarSpeech();

    // Dispose the avatar
    disposeLessonAvatar();

    // Stop audio
    referenceAudio.stop();

    // Stop highway
    highwayState.stop();

    // Mark exercise as stopped
    exerciseState.stop();

    // Clear active lesson
    clearActiveLesson();
  }

  /**
   * Get phase label for display
   */
  function getPhaseLabel(phase: string): string {
    if (isWaitingForInput) {
      return 'WAIT FOR CORRECT INPUT';
    }
    if (currentPhaseLabel) {
      return currentPhaseLabel;
    }
    switch (phase) {
      case 'reference':
        return 'LISTEN';
      case 'input':
        return 'SING';
      default:
        return 'REST';
    }
  }

  /**
   * Get pitch name from MIDI number
   */
  function getPitchName(midi: number | null | undefined): string {
    if (typeof midi !== 'number') {
      return 'Window';
    }
    const pitch = getPitchByMidi(midi);
    return pitch?.pitch || `MIDI ${midi}`;
  }

  /**
   * Open the lesson chooser modal
   */
  function handleOpenChooser() {
    chooserState.show();
  }

  /**
   * Open the overdub exercise chooser modal
   */
  function handleOpenExerciseChooser() {
    overdubExerciseChooserState.show();
  }

  /**
   * Handle starting an exercise from the chooser
   */
  export function handleLessonStart(
    lessonId: string,
    settings: Record<string, number | boolean>
  ) {
    // Store the active lesson ID
    activeLessonId = lessonId;

    // Get the template
    const template = getTemplate(lessonId);
    if (!template) {
      console.error('[Exercise] Template not found:', lessonId);
      return;
    }
    initializeLessonGuide(template);

    // Apply settings from chooser
    numLoops = getSettingNumber(settings, 'loopCount', template.config?.numLoops ?? numLoops);
    tempo = getSettingNumber(settings, 'tempoBpm', template.config?.tempo ?? tempo);
    referenceVolume = template.config?.referenceVolume ?? referenceVolume;
    speakingPitchUsage = template.speakingPitchUsage;

    minAmplitudeDb = getSettingNumber(
      settings,
      'minAmplitudeDb',
      template.config?.minAmplitudeDb ?? minAmplitudeDb
    );
    minVoicedMs = getSettingNumber(settings, 'minVoicedMs', template.config?.minVoicedMs ?? minVoicedMs);
    minCoveragePct = getSettingNumber(
      settings,
      'minCoveragePct',
      template.config?.minCoveragePct ?? minCoveragePct
    );
    bandLowMinOffsetSemis = getSettingNumber(
      settings,
      'bandLowMinOffsetSemis',
      template.config?.bandLowMinOffsetSemis ?? bandLowMinOffsetSemis
    );
    bandLowMaxOffsetSemis = getSettingNumber(
      settings,
      'bandLowMaxOffsetSemis',
      template.config?.bandLowMaxOffsetSemis ?? bandLowMaxOffsetSemis
    );
    bandHighMinOffsetSemis = getSettingNumber(
      settings,
      'bandHighMinOffsetSemis',
      template.config?.bandHighMinOffsetSemis ?? bandHighMinOffsetSemis
    );
    bandHighMaxOffsetSemis = getSettingNumber(
      settings,
      'bandHighMaxOffsetSemis',
      template.config?.bandHighMaxOffsetSemis ?? bandHighMaxOffsetSemis
    );
    holdBandSemitones = getSettingNumber(
      settings,
      'holdBandSemitones',
      template.config?.holdBandSemitones ?? holdBandSemitones
    );
    minSlideSemitones = getSettingNumber(
      settings,
      'minSlideSemitones',
      template.config?.minSlideSemitones ?? minSlideSemitones
    );
    waitForInput = getSettingBoolean(
      settings,
      'waitForInput',
      template.config?.waitForInput ?? waitForInput
    );
    showImmediateFeedback = getSettingBoolean(
      settings,
      'showImmediateFeedback',
      template.config?.showImmediateFeedback ?? showImmediateFeedback
    );
    showScore = getSettingBoolean(
      settings,
      'showScore',
      template.config?.showScore ?? showScore
    );

    // Start the exercise
    void handleStart();
  }

  /**
   * Clear active lesson on stop
   */
  function clearActiveLesson() {
    activeLessonId = null;
  }
</script>

<div class="exercise-panel">
  <!-- Choose Lesson / Exercise Buttons -->
  {#if !isActive}
    <div class="chooser-buttons">
      <button class="choose-exercise-btn" onclick={handleOpenChooser}>
        Choose Lesson
      </button>
      <button class="choose-exercise-btn choose-exercise-btn--exercise" onclick={handleOpenExerciseChooser}>
        Choose Exercise
      </button>
    </div>
  {/if}

  <!-- Speaking Pitch Anchor Label (when lesson using speaking pitch is active) -->
  {#if isActive && usesSpeakingPitch && speakingPitchNote}
    <div class="speaking-pitch-anchor">
      <span class="anchor-text">Anchored to speaking pitch ({speakingPitchNote})</span>
    </div>
  {/if}

  <!-- Active Lesson Info -->
  {#if isActive && activeLesson}
    <div class="active-lesson-info">
      <span class="lesson-name">{activeLesson.name}</span>
      {#if currentSegmentName}
        <span class="segment-name">{currentSegmentName}</span>
      {/if}
    </div>
  {/if}

  {#if transitionInstruction}
    <div class="instruction-banner" aria-live="polite">
      {transitionInstruction}
    </div>
  {/if}

  {#if isActive && lessonGuideVisible && lessonGuideSteps.length > 0}
    <div class="lesson-guide-bubble" aria-live="polite">
      <div class="lesson-guide-nav">
        <button
          class="lesson-guide-btn"
          aria-label="Previous instruction"
          disabled={lessonGuideIndex <= 0}
          onclick={handleGuidePrev}
        >
          &#8592;
        </button>
        <span class="lesson-guide-count">{lessonGuideIndex + 1}/{lessonGuideSteps.length}</span>
        <button
          class="lesson-guide-btn"
          aria-label="Next instruction"
          disabled={lessonGuideIndex >= lessonGuideSteps.length - 1}
          onclick={handleGuideNext}
        >
          &#8594;
        </button>
        <button
          class="lesson-guide-btn lesson-guide-exit"
          aria-label="Exit lesson guide"
          onclick={handleGuideExit}
        >
          &#10005;
        </button>
      </div>
      {#if lessonGuideSteps[lessonGuideIndex]?.segmentName}
        <div class="lesson-guide-segment">{lessonGuideSteps[lessonGuideIndex].segmentName}</div>
      {/if}
      <div class="lesson-guide-text">{lessonGuideSteps[lessonGuideIndex]?.message}</div>
    </div>
  {/if}

  <!-- Main Controls (when active) -->
  <div class="exercise-controls">
    {#if isActive}
      <button class="stop-exercise-btn" onclick={handleStop}>
        Stop Lesson
      </button>

      <div class="progress-indicator">
        Loop {progress.current} / {progress.total}
      </div>

      <div class="phase-indicator" class:waiting={isWaitingForInput}>
        {getPhaseLabel(currentPhase)}
      </div>

      {#if segmentSummaries.length > 0}
        <div class="segment-progress">
          {#each segmentSummaries as segment}
            <div class="segment-row">
              <span class="segment-label">{segment.segmentName}</span>
              <span class="segment-value">{segment.hits}/{segment.total}</span>
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  </div>

  <!-- Results Display (after completion) -->
  {#if hasResults && !isActive}
    <div class="exercise-results">
      <h4 class="results-title">Results</h4>
      <div class="results-summary">
        <div class="stat">
          <span class="stat-label">Average Accuracy:</span>
          <span class="stat-value">{averageAccuracy.toFixed(1)}%</span>
        </div>
        <div class="stat">
          <span class="stat-label">Hits:</span>
          <span class="stat-value">{hitCount}/{totalCount}</span>
        </div>
      </div>

      {#if segmentSummaries.length > 0}
        <div class="segment-results">
          <h5 class="segment-results-title">Per Segment</h5>
          {#each segmentSummaries as segment}
            <div class="segment-result-item">
              <span class="segment-result-name">{segment.segmentName}</span>
              <span class="segment-result-score">{segment.hits}/{segment.total}</span>
              <span class="segment-result-acc">{segment.averageAccuracy.toFixed(0)}%</span>
            </div>
          {/each}
        </div>
      {/if}

      <details class="results-details">
        <summary class="results-summary-label">Detailed Results</summary>
        <div class="results-list">
          {#each results as result, i}
            <div class="result-item" class:hit={result.performance?.hitStatus === 'hit'}>
              <span class="result-loop">{result.targetSegmentName ?? `Window ${i + 1}`}</span>
              <span class="result-pitch">{getResultLabel(result)}</span>
              <span class="result-accuracy">{result.accuracy.toFixed(0)}%</span>
              <span class="result-status">
                {result.performance?.hitStatus === 'hit' ? 'OK' : 'MISS'}
              </span>
            </div>
          {/each}
        </div>
      </details>
    </div>
  {/if}
</div>

<style>
  .exercise-panel {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .chooser-buttons {
    display: flex;
    gap: var(--spacing-sm);
  }

  .choose-exercise-btn {
    flex: 1;
    padding: var(--spacing-md);
    font-size: var(--font-size-md);
    font-weight: 600;
    background-color: var(--color-primary);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .choose-exercise-btn:hover {
    background-color: var(--color-primary-dark, #4a7bc8);
  }

  .choose-exercise-btn--exercise {
    background-color: #6b5b95;
  }

  .choose-exercise-btn--exercise:hover {
    background-color: #574a7a;
  }

  .speaking-pitch-anchor {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm);
    background-color: rgba(var(--color-primary-rgb, 74, 123, 200), 0.15);
    border-radius: var(--radius-sm);
    border-left: 3px solid var(--color-primary);
  }

  .anchor-text {
    font-size: var(--font-size-sm);
    color: var(--color-text);
    font-weight: 500;
  }

  .active-lesson-info {
    text-align: center;
    padding: var(--spacing-xs);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .lesson-name {
    font-size: var(--font-size-sm);
    font-weight: 700;
    color: var(--color-text);
  }

  .segment-name {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    font-weight: 600;
  }

  .instruction-banner {
    padding: var(--spacing-sm);
    border-radius: var(--radius-sm);
    border: 1px solid rgba(var(--color-primary-rgb, 74, 123, 200), 0.45);
    background: linear-gradient(
      120deg,
      rgba(var(--color-primary-rgb, 74, 123, 200), 0.22),
      rgba(255, 255, 255, 0.05)
    );
    color: var(--color-text);
    font-size: var(--font-size-sm);
    line-height: 1.35;
    animation: instructionFade 260ms ease;
  }

  @keyframes instructionFade {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .lesson-guide-bubble {
    position: fixed;
    left: calc(33vw + 90px);
    bottom: 40px;
    width: min(360px, calc(100vw - 32px));
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background-color: rgba(18, 24, 31, 0.94);
    box-shadow: 0 18px 32px rgba(0, 0, 0, 0.25);
    padding: 10px 12px 12px 12px;
    z-index: 1001;
    animation: instructionFade 220ms ease;
  }

  .lesson-guide-nav {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .lesson-guide-btn {
    border: 1px solid rgba(255, 255, 255, 0.18);
    background-color: rgba(255, 255, 255, 0.06);
    color: var(--color-text);
    border-radius: 8px;
    width: 30px;
    height: 30px;
    line-height: 28px;
    text-align: center;
    cursor: pointer;
    padding: 0;
    font-size: 14px;
  }

  .lesson-guide-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .lesson-guide-exit {
    margin-left: auto;
  }

  .lesson-guide-count {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  .lesson-guide-segment {
    font-size: var(--font-size-xs);
    color: var(--color-primary, #4a7bc8);
    font-weight: 700;
    margin-bottom: 4px;
  }

  .lesson-guide-text {
    font-size: var(--font-size-sm);
    color: var(--color-text);
    line-height: 1.35;
  }

  @media (max-width: 900px) {
    .lesson-guide-bubble {
      left: 12px;
      right: 12px;
      width: auto;
      bottom: 150px;
    }
  }

  .exercise-controls {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .stop-exercise-btn {
    padding: var(--spacing-md);
    font-size: var(--font-size-md);
    font-weight: 600;
    background-color: var(--color-error, #dc3545);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .stop-exercise-btn:hover {
    background-color: #c82333;
  }

  .progress-indicator {
    text-align: center;
    font-size: var(--font-size-md);
    font-weight: 600;
    color: var(--color-text);
  }

  .phase-indicator {
    text-align: center;
    font-size: var(--font-size-lg);
    font-weight: 700;
    padding: var(--spacing-sm);
    background-color: var(--color-surface);
    border-radius: var(--radius-sm);
    color: var(--color-text);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .phase-indicator.waiting {
    border-color: rgba(255, 184, 0, 0.65);
    box-shadow: 0 0 0 1px rgba(255, 184, 0, 0.25) inset;
    animation: waitPulse 900ms ease-in-out infinite;
  }

  @keyframes waitPulse {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.015);
    }
    100% {
      transform: scale(1);
    }
  }

  .segment-progress {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: var(--spacing-sm);
    background-color: rgba(255, 255, 255, 0.03);
    border-radius: var(--radius-sm);
  }

  .segment-row {
    display: flex;
    justify-content: space-between;
    gap: var(--spacing-sm);
    font-size: var(--font-size-sm);
  }

  .segment-label {
    color: var(--color-text-muted);
  }

  .segment-value {
    color: var(--color-text);
    font-weight: 600;
  }

  .exercise-results {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    background-color: var(--color-surface);
    border-radius: var(--radius-sm);
    padding: var(--spacing-md);
  }

  .results-title {
    font-size: var(--font-size-sm);
    font-weight: 600;
    margin: 0;
    color: var(--color-text);
  }

  .results-summary {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .stat {
    display: flex;
    justify-content: space-between;
    font-size: var(--font-size-sm);
  }

  .stat-label {
    color: var(--color-text-muted);
  }

  .stat-value {
    color: var(--color-text);
    font-weight: 600;
  }

  .segment-results {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: var(--spacing-sm);
    background-color: rgba(255, 255, 255, 0.03);
    border-radius: var(--radius-sm);
  }

  .segment-results-title {
    margin: 0 0 4px 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    font-weight: 700;
  }

  .segment-result-item {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: var(--spacing-sm);
    font-size: var(--font-size-sm);
  }

  .segment-result-name {
    color: var(--color-text);
  }

  .segment-result-score,
  .segment-result-acc {
    color: var(--color-text);
    font-weight: 600;
  }

  .results-details {
    margin-top: var(--spacing-xs);
  }

  .results-summary-label {
    cursor: pointer;
    font-size: var(--font-size-sm);
    font-weight: 500;
    padding: var(--spacing-xs);
    user-select: none;
  }

  .results-summary-label:hover {
    color: var(--color-primary);
  }

  .results-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    padding-top: var(--spacing-sm);
  }

  .result-item {
    display: grid;
    grid-template-columns: 1.2fr 1fr auto auto;
    gap: var(--spacing-xs);
    align-items: center;
    padding: var(--spacing-xs);
    background-color: var(--color-bg);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
  }

  .result-item.hit {
    border-left: 3px solid var(--color-success, #28a745);
  }

  .result-item:not(.hit) {
    border-left: 3px solid var(--color-error, #dc3545);
  }

  .result-loop {
    color: var(--color-text-muted);
    font-weight: 500;
  }

  .result-pitch {
    color: var(--color-text);
    font-weight: 600;
  }

  .result-accuracy {
    color: var(--color-text);
  }

  .result-status {
    font-size: var(--font-size-xs);
    font-weight: 700;
  }

  .result-item.hit .result-status {
    color: var(--color-success, #28a745);
  }

  .result-item:not(.hit) .result-status {
    color: var(--color-error, #dc3545);
  }
</style>
