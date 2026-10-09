<script lang="ts">
  import '@mlt/lesson-kit/styles.css';
  import {
    calculateLessonGridLayout, lessonGridAppearance, lessonNoteAppearance,
    createLessonAudioOutput, createLessonClock, createLessonQuestion, createLessonPianoVoice,
    snapLessonPlacement, lessonPacing, lessonOutsidePlacement, lessonScreenSlide, lessonScreenSlideMs,
  } from '@mlt/lesson-kit';
  import { fullRowData } from '@mlt/pitch-data';
  import { PitchGrid } from '@mlt/ui-components/canvas';
  import { getContext, onDestroy, untrack } from 'svelte';
  import LessonAvatarDock from './LessonAvatarDock.svelte';
  import PitchDistanceBracket from './PitchDistanceBracket.svelte';
  import ScaleIntervalPattern from './ScaleIntervalPattern.svelte';
  import { scaleOpeningGridGeometry, scaleUpperGridGeometry } from './lesson14OpeningGrid';
  import { cancelLessonAvatarSpeech, speakWithLessonAvatar, setLessonAvatarThinking } from './lessonAvatar';
  import { lessonInspectorKey, type LessonInspector } from './lessonInspector.svelte';
  import type { LessonSectionProps } from './lessonScene';
  import {
    scalePlans, diatonicPattern, createScaleNotes, scaleColumn,
    evaluateScalePair, remainingScalePairs, isScalePlacementCorrect, getScaleCheckpoint, getScaleSeekTarget, getScaleBubbleCheckpoint,
    type ScaleNote, type ScaleStep,
  } from './lesson14Scale';

  let { section, isPlaying, volume, ensureAudioContext, onComplete }: LessonSectionProps = $props();
  const inspector = getContext<LessonInspector | undefined>(lessonInspectorKey);
  const plan = $derived(scalePlans[section.id]);
  const scaleMidi = $derived(createScaleNotes(8, 0, plan.tonic).map(note => note.midi));
  const clock = createLessonClock();
  const audioOutput = createLessonAudioOutput();
  const questionNarration = createLessonQuestion(cancelLessonAvatarSpeech, setLessonAvatarThinking);
  const rowByMidi = new Map(fullRowData.map((row, index) => [row.midi, { ...row, index }]));
  const openingGrid = $derived(section.id === 'scale-introduction' || section.id === 'seven-notes');
  const buildingGrid = $derived(section.id === 'build-scale' || section.id === 'build-scale-f');
  const firstRow = $derived(fullRowData.findIndex(row => row.midi === (buildingGrid ? 77 : plan.highMidi ?? 72)));
  const continuousFinding = $derived(section.id === 'find-major-seconds');
  const lastRow = $derived(fullRowData.findIndex(row => row.midi === (openingGrid ? 48 : plan.lowMidi)));
  const rowCount = $derived(lastRow - firstRow + 1);
  const legendColumns = 6;
  const singingConfig = { pitchHistory: [] };
  const voices = new Set<ReturnType<typeof createLessonPianoVoice>>();
  type Question = Extract<ScaleStep, { kind: 'find' | 'place' }>;

  let frameWidth = $state(0);
  let frameHeight = $state(0);
  let viewportWidth = $state(0);
  let viewportHeight = $state(0);
  const columns = $derived(frameWidth > 0 && frameWidth <= 720 ? 20 : 28);
  const layout = $derived(calculateLessonGridLayout({ width: frameWidth, height: frameHeight, columns, rows: rowCount, legendColumns }));
  const cellWidth = $derived(layout.cellWidth);
  let openingShift = $state(untrack(() => section.id === 'seven-notes' ? 1 : 0));
  let openingExpansion = $state(untrack(() => section.id === 'seven-notes' ? 1 : 0));
  const openingGeometry = $derived(scaleOpeningGridGeometry(cellWidth, openingShift, openingExpansion));
  let upperShift = $state(0);
  let upperExpansion = $state(0);
  const upperGeometry = $derived(scaleUpperGridGeometry(cellWidth, upperShift, upperExpansion));
  const viewport = $derived({ startRow: firstRow, endRow: lastRow, zoomLevel: 1, containerWidth: viewportWidth, containerHeight: viewportHeight });
  let teacherWidth = $state(0);
  let notes = $state<ScaleNote[]>([]);
  let notesEntering = $state(false);
  let notesVersion = $state(0);
  let found = $state<number[]>([]);
  let exampleBracket = $state<readonly [number, number] | null>(null);
  let activePair = $state<number | null>(null);
  let patternVisible = $state(false);
  let patternEntering = $state(false);
  let patternVersion = $state(0);
  let narration = $state('');
  let upperNarration = $state('');
  let departingNarration = $state('');
  let animateBubblePromotion = $state(false);
  let currentQuestion = $state<Question | null>(null);
  let answerLocked = $state(true);
  let selected = $state<number | null>(null);
  let preview = $state<{ midi: number; column: number } | null>(null);
  let attempt = $state<{ midi: number; column: number } | null>(null);
  let placementLayer = $state<HTMLDivElement | null>(null);
  let pointerId = $state<number | null>(null);
  let avatarReady = $state(false);
  let startedSectionCode: string | null = null;
  let complete = $state(false);
  let sequence = $state(0);
  let disposed = false;
  let activeCue = $state<string | null>(null);
  let responseResolve: ((correct: boolean) => void) | null = null;
  let pairFeedback: Promise<void> = Promise.resolve();
  let pairFeedbackPending = false;
  let unregisterInspector: (() => void) | undefined;
  const targetIndex = $derived(currentQuestion?.kind === 'place' ? currentQuestion.index : null);
  const patternActiveIndex = $derived(targetIndex !== null ? targetIndex - 1 : activePair);
  const legendLabels = $derived(new Map(notes.map(note => [note.midi, noteLabel(note)])));
  const underlinedWords = $derived(narration.includes('major second') ? ['major second']
    : narration.includes('minor second') ? ['minor second'] : narration.includes('diatonic scale') ? ['diatonic scale'] : []);
  const brackets = $derived.by(() => {
    const pairs: Array<{ first: ScaleNote; second: ScaleNote; label: string; active: boolean }> = [];
    for (const index of found) {
      const first = notes.find(note => note.midi === scaleMidi[index]);
      const second = notes.find(note => note.midi === scaleMidi[index + 1]);
      if (first && second) pairs.push({ first, second, label: `+${diatonicPattern[index]}`, active: activePair === index });
    }
    if (exampleBracket) {
      const [first, second] = exampleBracket.map(index => notes[index]);
      if (first && second) pairs.push({ first, second, label: Math.abs(first.midi - second.midi) === 12 ? 'octave' : `+${Math.abs(first.midi - second.midi)}`, active: true });
    }
    return pairs.map(pair => {
      const upper = pair.first.midi > pair.second.midi ? pair.first : pair.second;
      const lower = upper === pair.first ? pair.second : pair.first;
      const leftColumn = Math.min(scaleColumn(pair.first.index, columns), scaleColumn(pair.second.index, columns));
      const arm = (note: ScaleNote) => `${(0.6 + scaleColumn(note.index, columns) - leftColumn) * cellWidth}px`;
      return { ...pair, top: rowCenter(upper.midi), height: rowCenter(lower.midi) - rowCenter(upper.midi),
        left: `calc(${leftColumn / columns * 100}% - ${cellWidth * 1.8}px)`,
        topArmLength: arm(upper), bottomArmLength: arm(lower) };
    });
  });

  function noteLabel(note: ScaleNote): string { return plan.hideOctaveLabels ? note.label.replace(/\d+$/, '') : note.label; }
  function rowCenter(midi: number): number { return (rowByMidi.get(midi)!.index - firstRow + 1) / (rowCount + 1) * 100; }
  function noteLeft(index: number): number { return scaleColumn(index, columns) / columns * 100; }
  function isCurrent(token: number): boolean { return !disposed && token === sequence; }
  async function wait(ms: number, token: number): Promise<boolean> {
    clock.setPaused(!isPlaying);
    return isCurrent(token) && await clock.wait(ms) && isCurrent(token);
  }
  function mark(cueId: string, actionId: string): void {
    if (activeCue !== cueId) {
      if (activeCue) inspector?.status('completed');
      activeCue = cueId; inspector?.enter(cueId);
    }
    inspector?.action(actionId); inspector?.status('running');
  }
  function releaseVoice(voice: ReturnType<typeof createLessonPianoVoice>): void {
    if (!voices.delete(voice)) return;
    try { voice.oscillator.stop(); } catch { /* Scheduled stop may already have fired. */ }
    voice.oscillator.disconnect(); voice.gain.disconnect(); audioOutput.forget(voice.gain);
  }
  function stopVoices(): void { for (const voice of voices) releaseVoice(voice); }
  function cancelPointer(): void {
    const captured = pointerId; pointerId = null;
    if (captured !== null && placementLayer?.hasPointerCapture(captured)) placementLayer.releasePointerCapture(captured);
    preview = null;
  }
  function reset(): number {
    sequence++;
    questionNarration.submit(); cancelLessonAvatarSpeech(); clock.cancel(); stopVoices(); cancelPointer();
    responseResolve?.(false); responseResolve = null;
    pairFeedback = Promise.resolve(); pairFeedbackPending = false;
    notesEntering = false; notesVersion++;
    currentQuestion = null; answerLocked = true; selected = null; attempt = null; activePair = null;
    activeCue = null; narration = ''; upperNarration = ''; departingNarration = ''; animateBubblePromotion = false; complete = false;
    return sequence;
  }
  async function say(text: string, token: number, valid: () => boolean = () => true): Promise<void> {
    if (!(await wait(0, token)) || !valid()) return;
    narration = text;
    await speakWithLessonAvatar(text.replace(/♭/g, ' flat'), { rate: 0.92, lang: 'en-CA' }).catch(error => {
      if (isCurrent(token)) inspector?.record('error', `Scale narration failed: ${String(error)}`);
    });
  }
  async function sayStacked(text: string, token: number): Promise<void> {
    if (!(await wait(0, token))) return;
    departingNarration = upperNarration;
    upperNarration = narration;
    animateBubblePromotion = Boolean(upperNarration);
    narration = text;
    await say(text, token);
  }
  async function expandOpeningGrid(token: number): Promise<boolean> {
    if (!(await wait(0, token))) return false;
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) { openingShift = 1; openingExpansion = 1; return true; }
    for (const phase of ['shift', 'expand'] as const) {
      const duration = phase === 'shift' ? 650 : 900;
      for (let frame = 1; frame <= 40; frame++) {
        if (!(await wait(duration / 40, token))) return false;
        const progress = frame / 40;
        const eased = progress * progress * (3 - 2 * progress);
        if (phase === 'shift') openingShift = eased;
        else openingExpansion = eased;
      }
    }
    return true;
  }
  async function expandUpperGrid(token: number): Promise<boolean> {
    if (!(await wait(0, token))) return false;
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) { upperShift = 1; upperExpansion = 1; return true; }
    for (const phase of ['shift', 'expand'] as const) {
      const duration = phase === 'shift' ? 650 : 900;
      for (let frame = 1; frame <= 40; frame++) {
        if (!(await wait(duration / 40, token))) return false;
        const progress = frame / 40;
        const eased = progress * progress * (3 - 2 * progress);
        if (phase === 'shift') upperShift = eased;
        else upperExpansion = eased;
      }
    }
    return true;
  }
  async function playNote(note: Pick<ScaleNote, 'midi' | 'id'>, token: number): Promise<void> {
    if (!(await wait(0, token))) return;
    const context = await ensureAudioContext();
    if (!context || !isCurrent(token) || !(await wait(0, token))) return;
    const frequency = rowByMidi.get(note.midi)!.frequency;
    const start = context.currentTime;
    const end = start + lessonPacing.noteMs / 1000;
    const voice = createLessonPianoVoice(context, frequency, start, lessonPacing.noteMs / 1000);
    audioOutput.connect(voice.gain, context, volume, { frequency, noteIds: [note.id], start, attackEnd: start + 0.01,
      releaseStart: end - 0.08, end, peak: 0.16 });
    voices.add(voice); voice.oscillator.start(start); voice.oscillator.stop(end + 0.02);
    await wait(lessonPacing.noteMs, token); releaseVoice(voice);
  }
  async function playNotes(items: readonly Pick<ScaleNote, 'midi' | 'id'>[], token: number, highlightPattern = false): Promise<void> {
    for (const [index, note] of items.entries()) {
      if (!isCurrent(token)) return;
      if (highlightPattern) activePair = index > 0 ? index - 1 : null;
      await playNote(note, token);
      if (index < items.length - 1 && !(await wait(lessonPacing.betweenNotesMs, token))) return;
    }
  }
  function openQuestion(token: number, narrate: boolean): void {
    if (!isCurrent(token) || !currentQuestion) return;
    selected = null; attempt = null; cancelPointer();
    const text = currentQuestion.text;
    narration = text;
    mark(activeCue!, 'question'); inspector?.status('waiting');
    if (narrate && continuousFinding && pairFeedbackPending) {
      // Open the next question now; speak its prompt after the preceding pair.
      answerLocked = false; questionNarration.wait();
      const question = currentQuestion;
      const pending = pairFeedback;
      void pending.then(() => {
        if (!isCurrent(token) || currentQuestion !== question || pairFeedback !== pending || answerLocked) return;
        void questionNarration.start(valid => say(text, token, valid), () => { answerLocked = false; });
      });
    }
    else if (narrate) void questionNarration.start(valid => say(text.replace(/([A-G])4/g, '$1 4'), token, valid), () => { answerLocked = false; });
    else { answerLocked = false; questionNarration.wait(); }
  }
  function queuePairFeedback(items: ScaleNote[], pair: number, token: number): Promise<void> {
    pairFeedbackPending = true;
    const feedback = pairFeedback.then(async () => {
      if (!isCurrent(token)) return;
      activePair = pair;
      await playNotes(items, token);
      if (!isCurrent(token)) return;
      await say('Correct!', token);
      if (!(await wait(lessonPacing.afterCorrectPlacementMs, token))) return;
      if (currentQuestion?.kind === 'find' && !answerLocked) {
        // Preserve any first note already selected for the next answer.
        narration = currentQuestion.text; questionNarration.wait();
      }
    }).finally(() => {
      if (isCurrent(token) && pairFeedback === feedback) pairFeedbackPending = false;
    });
    pairFeedback = feedback;
    return feedback;
  }
  async function choose(index: number, token = sequence): Promise<void> {
    if (!isCurrent(token) || currentQuestion?.kind !== 'find' || answerLocked || !isPlaying) return;
    if (continuousFinding) void playNote(notes[index], token);
    if (selected === null) { selected = index; return; }
    if (selected === index) { selected = null; return; }
    const first = selected;
    const question = currentQuestion;
    questionNarration.submit();
    if (!continuousFinding) stopVoices();
    answerLocked = true;
    const result = evaluateScalePair(first, index, question.distance, found);
    if (result.result === 'correct') found = [...found, result.pair!];
    mark(activeCue!, result.result === 'correct' ? 'correct' : 'retry');
    inspector?.record('input', `${notes[first].label} / ${notes[index].label}: ${result.result}`);
    const items = [notes[first], notes[index]].sort((a, b) => a.index - b.index);
    if (continuousFinding && result.result === 'correct') {
      selected = null; answerLocked = false;
      const feedback = queuePairFeedback(items, result.pair!, token);
      if (found.length >= question.targetTotal) {
        if (question.targetTotal < remainingScalePairs(question.distance, []).length) {
          currentQuestion = null; responseResolve?.(true); responseResolve = null;
        } else {
          answerLocked = true;
          await feedback;
          if (!isCurrent(token)) return;
          currentQuestion = null; responseResolve?.(true); responseResolve = null;
        }
      }
      await feedback;
      return;
    }
    if (continuousFinding) {
      await pairFeedback;
      if (!isCurrent(token)) return;
    }
    if (result.result === 'correct') activePair = result.pair;
    await playNotes(items, token);
    if (!isCurrent(token)) return;
    await say(result.result === 'correct' ? 'Correct!' : result.result === 'duplicate' ? 'You already found that pair. Find another pair.' : 'Try again.', token);
    if (!(await wait(result.result === 'correct' ? lessonPacing.afterCorrectPlacementMs : lessonPacing.afterRetryMs, token))) return;
    selected = null;
    if (found.length >= question.targetTotal) {
      currentQuestion = null; responseResolve?.(true); responseResolve = null;
    } else openQuestion(token, false);
  }
  async function submitPlacement(midi: number, column: number, token = sequence): Promise<void> {
    if (!isCurrent(token) || currentQuestion?.kind !== 'place' || answerLocked || !isPlaying) return;
    const question = currentQuestion;
    questionNarration.submit(); stopVoices(); cancelPointer(); answerLocked = true;
    const correct = isScalePlacementCorrect(question.index, midi, column, columns, scaleMidi);
    attempt = correct ? null : { midi, column };
    if (correct) { notes = createScaleNotes(question.index + 1, 0, plan.tonic); found = [...found, question.index - 1]; }
    mark(activeCue!, correct ? 'correct' : 'retry');
    inspector?.record('input', `MIDI ${midi}, musical column ${column}: ${correct ? 'correct' : 'incorrect'}`);
    await playNotes([notes[question.index - 1], correct ? notes[question.index] : { midi, id: 'attempt' }], token);
    if (!isCurrent(token)) return;
    await say(correct ? 'Correct!' : midi === scaleMidi[question.index] ? 'Use the highlighted column. Try again.' : 'Try again.', token);
    if (!(await wait(correct ? lessonPacing.afterCorrectPlacementMs : lessonPacing.afterRetryMs, token))) return;
    if (correct) { currentQuestion = null; responseResolve?.(true); responseResolve = null; }
    else openQuestion(token, false);
  }
  async function questionStep(question: Question, token: number, branch: 'normal' | 'retry' | 'correct'): Promise<boolean> {
    currentQuestion = question;
    if (!continuousFinding || question.kind === 'place') activePair = question.kind === 'place' ? question.index - 1 : null;
    const response = new Promise<boolean>(resolve => { responseResolve = resolve; });
    if (branch === 'normal') openQuestion(token, true);
    else {
      if (!(await wait(0, token))) return false;
      answerLocked = false;
      if (question.kind === 'place') void submitPlacement(branch === 'correct' ? scaleMidi[question.index] : scaleMidi[question.index - 1], scaleColumn(question.index, columns), token);
      else {
        const pair = remainingScalePairs(question.distance, found)[0];
        selected = branch === 'correct' ? pair : 0;
        void choose(branch === 'correct' ? pair + 1 : 7, token);
      }
    }
    return await response && isCurrent(token);
  }
  async function run(cueIndex = 0, stepIndex = 0, branch: 'normal' | 'retry' | 'correct' = 'normal', continueOpening = false): Promise<void> {
    const token = reset();
    const currentPlan = plan;
    const state = getScaleCheckpoint(currentPlan, cueIndex, stepIndex);
    notes = state.notes; found = state.found; exampleBracket = state.bracket;
    upperShift = state.upperExpanded ? 1 : 0; upperExpansion = upperShift;
    patternVisible = state.patternVisible; patternEntering = false; patternVersion++;
    const bubbles = getScaleBubbleCheckpoint(currentPlan, cueIndex, stepIndex);
    upperNarration = bubbles.upper; narration = bubbles.current;
    if (continueOpening) {
      if (!(await expandOpeningGrid(token))) return;
    } else {
      openingShift = section.id === 'seven-notes' ? 1 : 0;
      openingExpansion = openingShift;
    }
    for (let ci = cueIndex; ci < currentPlan.cues.length; ci++) {
      const cue = currentPlan.cues[ci];
      for (let si = ci === cueIndex ? stepIndex : 0; si < cue.steps.length; si++) {
        if (!isCurrent(token)) return;
        const step = cue.steps[si];
        if (step.kind === 'retry' || step.kind === 'correct') continue;
        mark(cue.id, step.id);
        if (step.kind === 'expand-upper' && !(await expandUpperGrid(token))) return;
        if (step.kind === 'setup') {
          notesEntering = Boolean(step.slideIn); notesVersion++;
          notes = [...step.notes];
          if (step.slideIn) {
            if (!(await wait(lessonScreenSlideMs, token))) return;
            notesEntering = false;
          }
        }
        if (step.kind === 'bracket') exampleBracket = step.indices;
        if (step.kind === 'pattern') { patternEntering = !patternVisible; patternVisible = true; }
        if (step.kind === 'say') {
          if (step.stackBubble) await sayStacked(step.text, token);
          else { upperNarration = ''; departingNarration = ''; await say(step.text, token); }
        }
        if (step.kind === 'play') {
          if (step.indices.length === 2) activePair = Math.min(...step.indices);
          await playNotes(step.indices.map(index => notes[index]), token, step.highlightPattern);
        }
        if (step.kind === 'find' || step.kind === 'place') {
          if (!(await questionStep(step, token, ci === cueIndex && si === stepIndex ? branch : 'normal'))) return;
          if (!(continuousFinding && step.kind === 'find') && !(await wait(lessonPacing.betweenPlacementQuestionsMs, token))) return;
        }
        if (step.kind === 'finish') {
          if (!(await wait(lessonPacing.afterExerciseMs, token))) return;
          if (step.text) await say(step.text, token);
          if (!(await wait(lessonPacing.afterCelebrationMs, token))) return;
          inspector?.status('completed'); complete = true; onComplete?.(); return;
        }
      }
    }
  }
  function seek(cueId: string, actionId?: string): void {
    const target = getScaleSeekTarget(plan, cueId, actionId);
    if (!target) return;
    inspector?.resetFrom(cueId);
    void run(target.cueIndex, target.stepIndex, target.branch);
  }
  function ready(): void {
    avatarReady = true;
  }
  function updatePointer(event: PointerEvent): void {
    if (currentQuestion?.kind !== 'place' || answerLocked || !isPlaying || !placementLayer
      || (pointerId !== null && pointerId !== event.pointerId)) return;
    const bounds = placementLayer.getBoundingClientRect();
    const position = snapLessonPlacement(event.clientX - bounds.left, event.clientY - bounds.top, bounds.width, bounds.height, columns, rowCount);
    const midi = position && fullRowData[firstRow + position.row].midi;
    if (position && typeof midi === 'number' && midi >= plan.lowMidi && midi <= (plan.highMidi ?? 72)) {
      preview = { midi, column: position.column + 1 };
    } else preview = null;
  }
  function beginPointer(event: PointerEvent): void {
    if (event.button !== 0 || pointerId !== null || answerLocked || !isPlaying || currentQuestion?.kind !== 'place' || !placementLayer) return;
    event.preventDefault(); updatePointer(event);
    pointerId = event.pointerId; placementLayer.setPointerCapture(event.pointerId);
  }
  function finishPointer(event: PointerEvent, fromOutside = false): void {
    if ((fromOutside ? pointerId !== null : event.pointerId !== pointerId) || !placementLayer) return;
    updatePointer(event);
    const bounds = placementLayer.getBoundingClientRect();
    const inside = event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
    const answer = preview; cancelPointer();
    if (inside && answer) void submitPlacement(answer.midi, answer.column);
  }
  function initialPreview(): { midi: number; column: number } {
    return { midi: scaleMidi[(targetIndex ?? 1) - 1], column: scaleColumn(targetIndex ?? 1, columns) };
  }
  function keyboard(event: KeyboardEvent): void {
    if (currentQuestion?.kind !== 'place' || answerLocked || !isPlaying) return;
    const choice = preview ?? initialPreview();
    const midi = event.key === 'ArrowUp' ? Math.min(plan.highMidi ?? 72, choice.midi + 1) : event.key === 'ArrowDown' ? Math.max(plan.lowMidi, choice.midi - 1) : choice.midi;
    const column = event.key === 'Home' ? 1 : event.key === 'End' ? columns - 1
      : event.key === 'ArrowLeft' ? choice.column - 1 : event.key === 'ArrowRight' ? choice.column + 1 : choice.column;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault(); preview = { midi, column: Math.max(1, Math.min(columns - 1, column)) };
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); void submitPlacement(choice.midi, choice.column);
    } else if (event.key === 'Escape') cancelPointer();
  }
  $effect(() => { clock.setPaused(!isPlaying); if (!isPlaying) { stopVoices(); cancelPointer(); } });
  $effect(() => audioOutput.setVolume(volume));
  $effect(() => {
    const code = section.code;
    if (avatarReady && startedSectionCode !== code) {
      const previous = startedSectionCode;
      startedSectionCode = code;
      untrack(() => {
        unregisterInspector?.();
        unregisterInspector = inspector?.register(plan.cues, seek);
        void run(0, 0, 'normal', previous === '1.4.1' && section.id === 'seven-notes');
      });
    }
  });
  onDestroy(() => { disposed = true; reset(); unregisterInspector?.(); });
</script>

<div class="scale-scene" style:--lesson-note-size={`${layout.noteDiameter}px`} style:--legend-width={`${cellWidth * legendColumns}px`}>
  <div class="teacher-column" bind:clientWidth={teacherWidth}>
    <div class="teacher-anchor" style:width={`${teacherWidth}px`}>
      <LessonAvatarDock character="grammy" speechText={narration} upperSpeechText={upperNarration}
        departingSpeechText={departingNarration} onSpeechDismissed={() => { departingNarration = ''; }}
        animateSpeechPromotion={animateBubblePromotion} paused={!isPlaying} {underlinedWords} anchoredStage on:ready={ready} />
      <div class="pattern-position">
        {#key patternVersion}
          {#if patternVisible}<ScaleIntervalPattern activeIndex={patternActiveIndex} paused={!isPlaying} enterFromLeft={patternEntering} />{/if}
        {/key}
        {#if complete}<p class="hint" role="status">Lesson complete.</p>{/if}
      </div>
    </div>
  </div>
  <div class="grid-column">
    <div class="mlt-lesson-grid-frame scale-grid-frame" bind:clientWidth={frameWidth} bind:clientHeight={frameHeight}>
      <div class="scale-grid-shell" style:width={`${layout.width}px`}
        style:height={`${openingGrid ? openingGeometry.height : buildingGrid ? upperGeometry.height : layout.height}px`}
        style:translate={`0px ${openingGrid ? openingGeometry.y : buildingGrid ? upperGeometry.y : 0}px`}>
      <div class="scale-grid-field" style:width={`${layout.width}px`} style:height={`${layout.height}px`}
        style:translate={`0px ${buildingGrid ? upperGeometry.fieldY : 0}px`} bind:clientWidth={viewportWidth} bind:clientHeight={viewportHeight}>
        {#if viewportWidth > 0 && viewportHeight > 0}
          <div class="grid-render">
            <PitchGrid mode="singing" {fullRowData} {viewport} {cellWidth} cellHeight={layout.cellHeight} {singingConfig}
              colorMode="color" accidentalMode={{ sharp: true, flat: true }} showRightLegend={false} showOctaveLabels={!plan.hideOctaveLabels}
              showLegendLabels={true} showAccidentalLabels={false} showFrequencyLabels={false} legendMidiLabelOverrides={legendLabels}
              {...lessonGridAppearance} showColumnGrid={false} />
          </div>
          <div class="musical-overlay">
            {#if targetIndex !== null}
              <span class="target-column" style:left={`${noteLeft(targetIndex)}%`} style:width={`${cellWidth * 2}px`} aria-hidden="true"></span>
              <div class="placement-layer" bind:this={placementLayer} role="group" aria-label="Build the scale"
                use:lessonOutsidePlacement={{
                  enabled: !answerLocked && isPlaying && pointerId === null,
                  questionKey: `${sequence}-${activeCue}-${targetIndex}`,
                  onMove: updatePointer, onDrop: (event) => finishPointer(event, true),
                  onCancel: () => { if (pointerId === null) preview = null; },
                }}
                onpointermove={updatePointer} onpointerup={finishPointer} onpointercancel={cancelPointer}
                onlostpointercapture={() => { if (pointerId !== null) cancelPointer(); }}>
                <button class="placement-surface" type="button" disabled={answerLocked || !isPlaying}
                  aria-label="Place the next note in the highlighted column. Use arrows for pitch and column, then Enter."
                  onpointerdown={beginPointer}
                  onpointerleave={() => { if (pointerId === null) preview = null; }} onkeydown={keyboard}
                  onfocus={() => { preview ??= initialPreview(); }} onblur={() => { if (pointerId === null) preview = null; }}
                  onclick={(event) => { if (event.detail === 0 && preview) void submitPlacement(preview.midi, preview.column); }}></button>
              </div>
            {/if}
            {#each notes as note (note.id)}
              {#if currentQuestion?.kind === 'find'}
                <button type="button" class="mlt-lesson-note scale-note selectable-note" class:selected={selected === note.index}
                  use:lessonNoteAppearance={{ audioOutput, cellWidth, frequency: rowByMidi.get(note.midi)!.frequency, noteId: note.id }}
                  style:top={`${rowCenter(note.midi)}%`} style:left={`${noteLeft(note.index)}%`} style:color={rowByMidi.get(note.midi)!.hex}
                  aria-label={`Select ${noteLabel(note)}`} aria-pressed={selected === note.index} disabled={answerLocked || !isPlaying}
                  onclick={() => { void choose(note.index); }}>
                  <span class="mlt-lesson-note-label">{noteLabel(note)}</span>
                </button>
              {:else}
                <span class="mlt-lesson-note scale-note"
                  use:lessonScreenSlide={{ direction: notesEntering ? 'enter-left' : null, paused: !isPlaying, replayKey: notesVersion }}
                  use:lessonNoteAppearance={{ audioOutput, cellWidth, frequency: rowByMidi.get(note.midi)!.frequency, noteId: note.id }}
                  style:top={`${rowCenter(note.midi)}%`} style:left={`${noteLeft(note.index)}%`} style:color={rowByMidi.get(note.midi)!.hex} aria-hidden="true">
                  <span class="mlt-lesson-note-label">{noteLabel(note)}</span>
                </span>
              {/if}
            {/each}
            {#each brackets as item}
              <div class="bracket" class:active={item.active}>
                <PitchDistanceBracket top={item.top} height={item.height} left={item.left} topArmLength={item.topArmLength} bottomArmLength={item.bottomArmLength} />
                <span class="distance-label" class:octave-label={item.label === 'octave'}
                  style:top={`${item.top + item.height / 2}%`} style:left={item.left}
                  style:font-size={`${Math.min(13.6, cellWidth * 0.65) * (item.label === 'octave' ? 1 : 2)}px`}>{item.label}</span>
              </div>
            {/each}
            {#if attempt}
              <span class="mlt-lesson-note scale-note" use:lessonNoteAppearance={{ audioOutput, cellWidth, frequency: rowByMidi.get(attempt.midi)!.frequency, noteId: 'attempt' }}
                style:top={`${rowCenter(attempt.midi)}%`} style:left={`${attempt.column / columns * 100}%`} style:color={rowByMidi.get(attempt.midi)!.hex} aria-hidden="true"></span>
            {/if}
            {#if preview && !answerLocked}
              <span class="mlt-lesson-note mlt-lesson-note--preview scale-note" use:lessonNoteAppearance={{ audioOutput, cellWidth, frequency: rowByMidi.get(preview.midi)!.frequency }}
                style:top={`${rowCenter(preview.midi)}%`} style:left={`${preview.column / columns * 100}%`} style:color={rowByMidi.get(preview.midi)!.hex} aria-hidden="true"></span>
            {/if}
          </div>
        {/if}
      </div>
      </div>
    </div>
    {#if currentQuestion?.kind === 'find'}
      {@const distance = currentQuestion.distance}
      <p class="hint" role="status">Select two notes. Tab and Enter also work.
        {found.filter(index => diatonicPattern[index] === distance).length}
        of {distance === 2 ? 5 : 2} {distance === 2 ? 'major' : 'minor'} 2nds found.
      </p>
    {:else if currentQuestion?.kind === 'place'}
      <p class="hint">Build from left to right in the highlighted column. Arrow keys also work; press Enter to place.</p>
    {/if}
  </div>
</div>

<style>
  .scale-scene { display: grid; grid-template-columns: minmax(16rem, 18rem) minmax(0, 1fr); gap: 1.25rem; align-items: start; }
  .teacher-column, .grid-column { min-width: 0; }
  .teacher-anchor { position: fixed; top: 50dvh; transform: translateY(-50%); pointer-events: none; }
  .pattern-position { position: absolute; top: calc(100% + 1rem); left: 0; width: 100%; }
  .scale-grid-frame { width: 100%; height: clamp(26rem, calc(100svh - 13rem), 42rem); }
  .scale-grid-shell { position: relative; overflow: hidden; border-radius: 22px; outline: 1px solid rgba(102, 75, 40, 0.18); outline-offset: -1px;
    background: linear-gradient(145deg, rgba(255,255,255,0.84), rgba(248,241,229,0.86)); box-shadow: var(--amt-shadow); }
  .scale-grid-field { position: relative; }
  .grid-render { position: absolute; inset: 0; overflow: hidden; border-radius: 22px; }
  .musical-overlay { position: absolute; inset: 0 0 0 var(--legend-width); pointer-events: none; }
  .placement-layer, .placement-surface { position: absolute; inset: 0; }
  .placement-layer { pointer-events: auto; }
  .placement-surface { width: 100%; height: 100%; padding: 0; border: 0; background: transparent; cursor: crosshair; touch-action: none; }
  .placement-surface:focus-visible { outline: 3px solid #3d79aa; outline-offset: -3px; }
  .placement-surface:disabled { cursor: default; }
  .scale-note { position: absolute; width: var(--lesson-note-size); height: var(--lesson-note-size); padding: 0; display: grid; place-items: center; transform: translate(-50%, -50%); }
  .selectable-note { pointer-events: auto; cursor: pointer; }
  .selectable-note:disabled { cursor: default; }
  .selectable-note.selected { outline: 3px solid #5b4a84; outline-offset: 4px; }
  .target-column { position: absolute; top: 0; bottom: 0; transform: translateX(-50%); background: rgba(91,74,132,0.12); border-inline: 1px dashed #5b4a84; }
  .bracket { position: absolute; inset: 0; opacity: 0.7; }
  .bracket.active { opacity: 1; }
  .distance-label { position: absolute; transform: translate(-120%, -50%); color: #5b4a84; font-weight: 700; line-height: 1; white-space: nowrap; }
  .distance-label.octave-label { transform: translate(0.25rem, -50%); }
  .hint { color: var(--amt-muted); font-size: 0.9rem; line-height: 1.4; }
  @media (max-width: 980px) {
    .scale-scene { grid-template-columns: clamp(7rem, 28vw, 18rem) minmax(0, 1fr); gap: 0.75rem; }
    .scale-grid-frame { height: clamp(22rem, 58svh, 34rem); }
  }
</style>
