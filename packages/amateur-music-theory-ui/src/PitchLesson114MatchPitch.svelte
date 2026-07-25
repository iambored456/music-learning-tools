<script lang="ts">
  import { fullRowData } from '@mlt/pitch-data';
  import { PitchGrid } from '@mlt/ui-components/canvas';
  import type { PitchGridViewport, SingingModeConfig } from '@mlt/ui-components/canvas';
  import { onDestroy } from 'svelte';
  import LessonAvatarDock from './LessonAvatarDock.svelte';
  import { cancelLessonAvatarSpeech, speakWithLessonAvatar } from './lessonAvatar';
  import type { LessonSection } from './lessons';

  export let section: LessonSection;
  export let isPlaying = true;
  export let volume = 72;
  export let onComplete: (() => void) | undefined = undefined;

  type ActiveVoice = {
    oscillator: OscillatorNode;
    gain: GainNode;
    stopped: boolean;
  };

  type MatchQuestion = {
    id: string;
    gridNotes: readonly string[];
    sourceNote: string;
    prompt: string;
  };

  type SourceFlightNote = {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    color: string;
    landed: boolean;
  };

  type ScenePhase =
    | 'demonstration'
    | 'first-choice'
    | 'question'
    | 'transition'
    | 'complete';

  const pitchRows = fullRowData;
  const rowIndexByTone = new Map(pitchRows.map((row, index) => [row.toneNote, index]));
  const viewportStartRow = rowIndexByTone.get('C6') ?? 0;
  const viewportEndRow = rowIndexByTone.get('G1') ?? pitchRows.length - 1;
  const viewportRowCount = Math.max(1, viewportEndRow - viewportStartRow + 1);
  const gridColumnCount = 34;
  const legendWidthUnits = 6;
  const fallbackCellSize = 16;
  const singingConfig: SingingModeConfig = { pitchHistory: [] };
  const introductoryNotes = ['C2', 'D3', 'F4', 'A5'] as const;
  const introductorySourceNote = 'F4';
  const introductoryPrompt = 'Click the matching note.';
  const samePitchStatement = '...have the same pitch.';
  const questions: MatchQuestion[] = [
    {
      id: 'match-1',
      gridNotes: ['F2', 'E5'],
      sourceNote: 'E5',
      prompt: 'Click the matching note again.',
    },
    {
      id: 'match-2',
      gridNotes: ['D2', 'B4'],
      sourceNote: 'D2',
      prompt: 'Click the matching note again.',
    },
    {
      id: 'match-3',
      gridNotes: ['G2', 'B2', 'D3'],
      sourceNote: 'D3',
      prompt: 'Click the matching note again.',
    },
    {
      id: 'match-4',
      gridNotes: ['B3', 'C4', 'A4'],
      sourceNote: 'C4',
      prompt: 'Click the matching note again.',
    },
    {
      id: 'match-5',
      gridNotes: ['A2', 'E3', 'G3', 'C5'],
      sourceNote: 'G3',
      prompt: 'Click the matching note again.',
    },
    {
      id: 'match-6',
      gridNotes: ['C3', 'A3', 'E4', 'G4'],
      sourceNote: 'G4',
      prompt: 'Click the matching note again.',
    },
  ];

  let frameWidth = 0;
  let frameHeight = 0;
  let viewportWidth = 0;
  let viewportHeight = 0;
  let cellSize = fallbackCellSize;
  let shellWidth = fallbackCellSize * (gridColumnCount + legendWidthUnits);
  let shellHeight = fallbackCellSize * (viewportRowCount + 1);
  let cellHeight = fallbackCellSize * 2;
  let legendWidth = fallbackCellSize * legendWidthUnits;
  let overlayNoteSize = fallbackCellSize * 2;
  let pitchGridViewport: PitchGridViewport = {
    startRow: viewportStartRow,
    endRow: viewportEndRow,
    zoomLevel: 1,
    containerWidth: 0,
    containerHeight: 0,
  };

  let avatarReady = false;
  let sourceNoteEl: HTMLSpanElement | null = null;
  let landedSourceNoteEl: HTMLSpanElement | null = null;
  let pitchGridFieldEl: HTMLDivElement | null = null;
  let sequenceStarted = false;
  let phase: ScenePhase = 'demonstration';
  let questionIndex = -1;
  let narrationText = '';
  let answerLocked = true;
  let activeGridNoteIndex: number | null = null;
  let sourceNoteActive = false;
  let sourceLanded = false;
  let landedBesideGridIndex: number | null = null;
  let sourceFlightNote: SourceFlightNote | null = null;
  let feedbackState: 'success' | 'error' | null = null;
  let sequenceToken = 0;
  let audioContext: AudioContext | null = null;
  const activeVoices = new Set<ActiveVoice>();
  let previousIsPlaying = isPlaying;
  let waitTimer: ReturnType<typeof setTimeout> | null = null;
  let waitResolve: (() => void) | null = null;
  let waitRemainingMs = 0;
  let waitStartedAt = 0;
  let waitPaused = false;

  $: currentQuestion =
    questionIndex >= 0 && questionIndex < questions.length ? questions[questionIndex] : null;
  $: visibleGridNotes =
    phase === 'demonstration' || phase === 'first-choice'
      ? introductoryNotes
      : currentQuestion?.gridNotes ?? [];
  $: visibleSourceNote =
    phase === 'demonstration' || phase === 'first-choice'
      ? introductorySourceNote
      : currentQuestion?.sourceNote ?? null;
  $: underlinedWords = narrationText === samePitchStatement ? ['pitch'] : [];
  $: cellSize =
    frameWidth > 0 && frameHeight > 0
      ? Math.max(
          1,
          Math.min(
            frameHeight / (viewportRowCount + 1),
            frameWidth / (gridColumnCount + legendWidthUnits),
          ),
        )
      : fallbackCellSize;
  $: shellWidth = cellSize * (gridColumnCount + legendWidthUnits);
  $: shellHeight = cellSize * (viewportRowCount + 1);
  $: cellHeight =
    viewportHeight > 0 ? (viewportHeight * 2) / (viewportRowCount + 1) : cellSize * 2;
  $: legendWidth = cellSize * legendWidthUnits;
  $: overlayNoteSize = cellHeight;
  $: pitchGridViewport = {
    startRow: viewportStartRow,
    endRow: viewportEndRow,
    zoomLevel: 1,
    containerWidth: viewportWidth,
    containerHeight: viewportHeight,
  };

  $: if (avatarReady && !sequenceStarted && isPlaying) {
    sequenceStarted = true;
    void runIntroductoryDemonstration();
  }

  $: if (isPlaying !== previousIsPlaying) {
    previousIsPlaying = isPlaying;
    if (isPlaying) {
      resumeWait();
      if (!waitResolve && !answerLocked && phase === 'question' && currentQuestion) {
        void runQuestionCycle(currentQuestion, sequenceToken);
      }
    } else {
      pauseWait();
      cancelLessonAvatarSpeech();
      stopAllVoices();
      activeGridNoteIndex = null;
      sourceNoteActive = false;
    }
  }

  function getRowIndex(toneNote: string): number {
    return rowIndexByTone.get(toneNote) ?? viewportEndRow;
  }

  function rowCenter(toneNote: string): number {
    const relativeRow = getRowIndex(toneNote) - viewportStartRow;
    return ((relativeRow + 1) / (viewportRowCount + 1)) * 100;
  }

  function getGridNoteLeft(index: number, noteCount: number): number {
    if (phase === 'demonstration' || phase === 'first-choice') return 50;
    return ((index + 1) / (noteCount + 1)) * 100;
  }

  function getLandedSourceLeft(targetIndex: number, noteCount: number): number {
    const targetLeft = getGridNoteLeft(targetIndex, noteCount);
    return Math.max(5, targetLeft - 7);
  }

  function getCorrectIndex(gridNotes: readonly string[], sourceNote: string): number {
    return gridNotes.findIndex((toneNote) => toneNote === sourceNote);
  }

  function isCurrentSequence(token: number): boolean {
    return token === sequenceToken;
  }

  function beginSequence(): number {
    sequenceToken += 1;
    cancelLessonAvatarSpeech();
    cancelWait(true);
    stopAllVoices();
    activeGridNoteIndex = null;
    sourceNoteActive = false;
    sourceFlightNote = null;
    return sequenceToken;
  }

  function waitMs(durationMs: number): Promise<void> {
    cancelWait(false);
    waitRemainingMs = durationMs;
    waitPaused = false;
    return new Promise((resolve) => {
      waitResolve = () => {
        if (waitTimer) clearTimeout(waitTimer);
        waitTimer = null;
        waitResolve = null;
        waitRemainingMs = 0;
        waitPaused = false;
        resolve();
      };

      if (!isPlaying) {
        waitPaused = true;
        return;
      }

      waitStartedAt = performance.now();
      waitTimer = setTimeout(() => waitResolve?.(), waitRemainingMs);
    });
  }

  function cancelWait(resolvePending = true): void {
    if (waitTimer) clearTimeout(waitTimer);
    waitTimer = null;
    const resolver = waitResolve;
    waitResolve = null;
    waitRemainingMs = 0;
    waitPaused = false;
    if (resolvePending) resolver?.();
  }

  function pauseWait(): void {
    if (!waitResolve || waitPaused) return;
    if (waitTimer) {
      clearTimeout(waitTimer);
      waitTimer = null;
      waitRemainingMs = Math.max(0, waitRemainingMs - (performance.now() - waitStartedAt));
    }
    waitPaused = true;
  }

  function resumeWait(): void {
    if (!waitResolve || !waitPaused) return;
    waitPaused = false;
    waitStartedAt = performance.now();
    waitTimer = setTimeout(() => waitResolve?.(), waitRemainingMs);
  }

  async function ensureAudioContext(): Promise<AudioContext | null> {
    try {
      if (!audioContext) audioContext = new AudioContext();
      if (audioContext.state === 'suspended') await audioContext.resume();
      return audioContext;
    } catch {
      return null;
    }
  }

  function disposeVoice(voice: ActiveVoice): void {
    try {
      voice.oscillator.disconnect();
    } catch {}
    try {
      voice.gain.disconnect();
    } catch {}
    activeVoices.delete(voice);
  }

  function stopVoice(voice: ActiveVoice): void {
    if (voice.stopped) {
      disposeVoice(voice);
      return;
    }
    voice.stopped = true;
    try {
      voice.oscillator.stop();
    } catch {}
    disposeVoice(voice);
  }

  function stopAllVoices(): void {
    Array.from(activeVoices).forEach(stopVoice);
  }

  function startVoice(
    context: AudioContext,
    frequency: number,
    durationMs: number,
    token: number,
  ): void {
    if (!isPlaying || !isCurrentSequence(token)) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const durationSeconds = Math.max(0.08, durationMs / 1000);
    const releaseStart = now + Math.max(0.04, durationSeconds - 0.055);
    const endTime = now + durationSeconds;
    const peak = Math.max(0.01, Math.min(0.065, (volume / 100) * 0.045));
    const voice: ActiveVoice = { oscillator, gain, stopped: false };

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.025);
    gain.gain.setValueAtTime(peak, releaseStart);
    gain.gain.exponentialRampToValueAtTime(0.0001, endTime);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.onended = () => {
      voice.stopped = true;
      disposeVoice(voice);
    };
    activeVoices.add(voice);
    oscillator.start(now);
    oscillator.stop(endTime + 0.02);
  }

  async function playNote(
    toneNote: string,
    token: number,
    options: { source?: boolean; gridIndex?: number; durationMs?: number } = {},
  ): Promise<void> {
    if (!isCurrentSequence(token) || !isPlaying) return;
    const row = pitchRows[getRowIndex(toneNote)];
    if (!row) return;
    const context = await ensureAudioContext();
    if (!context || !isCurrentSequence(token) || !isPlaying) return;

    stopAllVoices();
    sourceNoteActive = Boolean(options.source);
    activeGridNoteIndex =
      typeof options.gridIndex === 'number' ? options.gridIndex : null;
    const durationMs = options.durationMs ?? 440;
    startVoice(context, row.frequency, durationMs, token);
    await waitMs(durationMs);
    if (!isCurrentSequence(token)) return;
    stopAllVoices();
    sourceNoteActive = false;
    activeGridNoteIndex = null;
  }

  async function playSequence(
    items: Array<{ toneNote: string; source?: boolean; gridIndex?: number }>,
    token: number,
    durationMs = 420,
    gapMs = 150,
  ): Promise<void> {
    for (const item of items) {
      if (!isCurrentSequence(token)) return;
      await playNote(item.toneNote, token, { ...item, durationMs });
      if (!isCurrentSequence(token)) return;
      await waitMs(gapMs);
    }
  }

  async function playGridBottomToTop(
    gridNotes: readonly string[],
    token: number,
  ): Promise<void> {
    const ordered = gridNotes
      .map((toneNote, index) => ({ toneNote, gridIndex: index }))
      .sort((a, b) => getRowIndex(b.toneNote) - getRowIndex(a.toneNote));
    await playSequence(ordered, token, 410, 145);
  }

  async function playSourcePreview(toneNote: string, token: number): Promise<void> {
    await playSequence(
      [{ toneNote, source: true }],
      token,
      470,
      190,
    );
  }

  async function playMatchingPair(
    gridNotes: readonly string[],
    sourceNote: string,
    token: number,
  ): Promise<void> {
    const correctIndex = getCorrectIndex(gridNotes, sourceNote);
    if (correctIndex < 0) return;
    await playSequence(
      [
        { toneNote: sourceNote, source: true },
        { toneNote: sourceNote, gridIndex: correctIndex },
        { toneNote: sourceNote, source: true },
        { toneNote: sourceNote, gridIndex: correctIndex },
      ],
      token,
      390,
      130,
    );
  }

  async function say(text: string, token: number): Promise<void> {
    narrationText = text;
    if (!avatarReady || !isCurrentSequence(token)) return;
    await speakWithLessonAvatar(text, {
      lang: 'en-CA',
      rate: 0.92,
      chunking: 'sentence',
    }).catch(() => {});
  }

  function waitForAnimationFrame(): Promise<void> {
    return new Promise((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }

  async function moveSourceBesideGridNote(
    gridNotes: readonly string[],
    sourceNote: string,
    targetIndex: number,
    token: number,
  ): Promise<void> {
    const targetToneNote = gridNotes[targetIndex];
    const sourceRect = (sourceLanded ? landedSourceNoteEl : sourceNoteEl)?.getBoundingClientRect();
    const fieldRect = pitchGridFieldEl?.getBoundingClientRect();
    const sourceRow = pitchRows[getRowIndex(sourceNote)];
    if (!targetToneNote || targetIndex < 0 || !sourceRect || !fieldRect || !sourceRow) {
      sourceLanded = true;
      landedBesideGridIndex = targetIndex;
      return;
    }

    const contentLeft = fieldRect.left + legendWidth;
    const contentWidth = Math.max(0, fieldRect.width - legendWidth);
    sourceFlightNote = {
      startX: sourceRect.left + sourceRect.width / 2,
      startY: sourceRect.top + sourceRect.height / 2,
      endX:
        contentLeft +
        contentWidth * (getLandedSourceLeft(targetIndex, gridNotes.length) / 100),
      endY: fieldRect.top + fieldRect.height * (rowCenter(targetToneNote) / 100),
      color: sourceRow.hex,
      landed: false,
    };

    await waitForAnimationFrame();
    await waitForAnimationFrame();
    if (!isCurrentSequence(token) || !sourceFlightNote) return;
    sourceFlightNote = { ...sourceFlightNote, landed: true };
    await waitMs(620);
    if (!isCurrentSequence(token)) return;
    sourceLanded = true;
    landedBesideGridIndex = targetIndex;
    sourceFlightNote = null;
  }

  async function moveSourceBesideMatch(
    gridNotes: readonly string[],
    sourceNote: string,
    token: number,
  ): Promise<void> {
    await moveSourceBesideGridNote(
      gridNotes,
      sourceNote,
      getCorrectIndex(gridNotes, sourceNote),
      token,
    );
  }

  async function runIntroductoryDemonstration(): Promise<void> {
    const token = beginSequence();
    phase = 'demonstration';
    questionIndex = -1;
    answerLocked = true;
    sourceLanded = false;
    landedBesideGridIndex = null;
    feedbackState = null;

    await waitMs(260);
    if (!isCurrentSequence(token)) return;
    await say('Listen carefully.', token);
    if (!isCurrentSequence(token)) return;
    await playGridBottomToTop(introductoryNotes, token);
    if (!isCurrentSequence(token)) return;

    await say('This note...', token);
    if (!isCurrentSequence(token)) return;
    await playNote(introductorySourceNote, token, { source: true, durationMs: 500 });
    if (!isCurrentSequence(token)) return;

    await say('...and this note...', token);
    if (!isCurrentSequence(token)) return;
    await playNote(introductorySourceNote, token, {
      gridIndex: getCorrectIndex(introductoryNotes, introductorySourceNote),
      durationMs: 500,
    });
    if (!isCurrentSequence(token)) return;

    await say(samePitchStatement, token);
    if (!isCurrentSequence(token)) return;
    await moveSourceBesideMatch(introductoryNotes, introductorySourceNote, token);
    if (!isCurrentSequence(token)) return;
    await playMatchingPair(introductoryNotes, introductorySourceNote, token);
    if (!isCurrentSequence(token)) return;

    await say('These notes match.', token);
    if (!isCurrentSequence(token)) return;
    await waitMs(180);
    if (!isCurrentSequence(token)) return;

    phase = 'first-choice';
    answerLocked = false;
    await say(introductoryPrompt, token);
    if (!isCurrentSequence(token)) return;
    await playGridBottomToTop(introductoryNotes, token);
    if (!isCurrentSequence(token)) return;
  }

  async function startQuestion(index: number): Promise<void> {
    const question = questions[index];
    if (!question) return;
    const token = beginSequence();
    phase = 'question';
    questionIndex = index;
    answerLocked = true;
    sourceLanded = false;
    landedBesideGridIndex = null;
    feedbackState = null;

    await waitMs(260);
    if (!isCurrentSequence(token)) return;
    answerLocked = false;
    await say(question.prompt, token);
    if (!isCurrentSequence(token)) return;
    await playSourcePreview(question.sourceNote, token);
    if (!isCurrentSequence(token)) return;
    void runQuestionCycle(question, token);
  }

  async function runQuestionCycle(question: MatchQuestion, token: number): Promise<void> {
    const cycle = [
      { toneNote: question.sourceNote, source: true },
      ...question.gridNotes.map((toneNote, gridIndex) => ({ toneNote, gridIndex })),
    ];

    while (
      isCurrentSequence(token) &&
      isPlaying &&
      phase === 'question' &&
      !answerLocked
    ) {
      await playSequence(cycle, token, 430, 210);
      if (!isCurrentSequence(token) || answerLocked) return;
      await waitMs(260);
    }
  }

  async function playSelectedPair(
    gridNotes: readonly string[],
    sourceNote: string,
    selectedIndex: number,
    token: number,
  ): Promise<void> {
    const selectedToneNote = gridNotes[selectedIndex];
    if (!selectedToneNote) return;
    await playSequence(
      [
        { toneNote: sourceNote, source: true },
        { toneNote: selectedToneNote, gridIndex: selectedIndex },
        { toneNote: sourceNote, source: true },
        { toneNote: selectedToneNote, gridIndex: selectedIndex },
      ],
      token,
      390,
      150,
    );
  }

  async function handleGridNoteClick(index: number): Promise<void> {
    if (answerLocked || !isPlaying) return;
    const gridNotes =
      phase === 'first-choice' ? introductoryNotes : currentQuestion?.gridNotes;
    const sourceNote =
      phase === 'first-choice' ? introductorySourceNote : currentQuestion?.sourceNote;
    if (!gridNotes || !sourceNote) return;
    const correctIndex = getCorrectIndex(gridNotes, sourceNote);

    if (index !== correctIndex) {
      const answerPhase = phase;
      const answeredQuestion = currentQuestion;
      const token = beginSequence();
      answerLocked = true;
      feedbackState = 'error';
      await moveSourceBesideGridNote(gridNotes, sourceNote, index, token);
      if (!isCurrentSequence(token)) return;
      await Promise.all([
        say('Try again.', token),
        playSelectedPair(gridNotes, sourceNote, index, token),
      ]);
      if (!isCurrentSequence(token)) return;
      await waitMs(700);
      if (!isCurrentSequence(token)) return;

      if (answerPhase === 'first-choice') {
        await moveSourceBesideMatch(gridNotes, sourceNote, token);
        if (!isCurrentSequence(token)) return;
      } else {
        sourceLanded = false;
        landedBesideGridIndex = null;
      }

      feedbackState = null;
      narrationText =
        answerPhase === 'first-choice' ? introductoryPrompt : answeredQuestion?.prompt ?? '';
      answerLocked = false;
      if (answerPhase === 'question' && answeredQuestion) {
        void runQuestionCycle(answeredQuestion, token);
      }
      return;
    }

    const token = beginSequence();
    answerLocked = true;
    feedbackState = 'success';
    const answeredQuestionIndex = questionIndex;

    if (phase === 'first-choice') {
      if (!sourceLanded) {
        await moveSourceBesideMatch(gridNotes, sourceNote, token);
        if (!isCurrentSequence(token)) return;
      }
      await playMatchingPair(gridNotes, sourceNote, token);
      if (!isCurrentSequence(token)) return;
      feedbackState = null;
      await waitMs(900);
      if (!isCurrentSequence(token)) return;
      phase = 'transition';
      sourceLanded = false;
      landedBesideGridIndex = null;
      await waitMs(500);
      if (!isCurrentSequence(token)) return;
      await startQuestion(0);
      return;
    }

    await say('Correct!', token);
    if (!isCurrentSequence(token)) return;
    await moveSourceBesideMatch(gridNotes, sourceNote, token);
    if (!isCurrentSequence(token)) return;
    await playMatchingPair(gridNotes, sourceNote, token);
    if (!isCurrentSequence(token)) return;
    feedbackState = null;
    await waitMs(900);
    if (!isCurrentSequence(token)) return;
    phase = 'transition';
    questionIndex = -1;
    sourceLanded = false;
    landedBesideGridIndex = null;
    await waitMs(500);
    if (!isCurrentSequence(token)) return;

    if (answeredQuestionIndex >= questions.length - 1) {
      phase = 'complete';
      await say('Bravo!', token);
      if (!isCurrentSequence(token)) return;
      onComplete?.();
      return;
    }

    await startQuestion(answeredQuestionIndex + 1);
  }

  function handleAvatarReady(): void {
    avatarReady = true;
  }

  onDestroy(() => {
    sequenceToken += 1;
    cancelWait(true);
    stopAllVoices();
    cancelLessonAvatarSpeech();
    if (audioContext && audioContext.state !== 'closed') void audioContext.close();
  });
</script>

<div
  class="match-scene"
  style={`--match-note-size:${overlayNoteSize}px;`}
>
  <div class="match-support">
    <LessonAvatarDock
      character="grammy"
      speechText={narrationText}
      {underlinedWords}
      on:ready={handleAvatarReady}
    />

    {#if visibleSourceNote && !sourceLanded && !sourceFlightNote && phase !== 'complete'}
      {@const sourceRow = pitchRows[getRowIndex(visibleSourceNote)]}
      <div class="source-note-wrap" aria-label="Note to match">
        <span
          bind:this={sourceNoteEl}
          class={`match-note match-note--source ${sourceNoteActive ? 'is-active' : ''}`}
          style={`color:${sourceRow?.hex ?? '#6a5140'};`}
        ></span>
      </div>
    {/if}

  </div>

  <section
    class={`match-workspace app-card ${feedbackState ? `is-${feedbackState}` : ''}`}
    aria-label={section.label}
  >
    <div
      class="pitch-grid-frame"
      bind:clientWidth={frameWidth}
      bind:clientHeight={frameHeight}
      style={`--legend-width:${legendWidth}px;`}
    >
      <div class="pitch-grid-shell" style={`width:${shellWidth}px; height:${shellHeight}px;`}>
        <div
          class="pitch-grid-field"
          bind:this={pitchGridFieldEl}
          bind:clientWidth={viewportWidth}
          bind:clientHeight={viewportHeight}
        >
          {#if viewportWidth > 0 && viewportHeight > 0}
            <PitchGrid
              mode="singing"
              fullRowData={pitchRows}
              viewport={pitchGridViewport}
              cellWidth={cellSize}
              cellHeight={cellHeight}
              colorMode="color"
              showOctaveLabels={true}
              showLegendLabels={false}
              showAccidentalLabels={false}
              showFrequencyLabels={false}
              showRightLegend={false}
              singingConfig={singingConfig}
              showHorizontalGridLines={true}
              horizontalGridReferencePitchClass={0}
            />

            <div class="match-note-layer">
              {#each visibleGridNotes as toneNote, index (`${toneNote}-${index}`)}
                {@const row = pitchRows[getRowIndex(toneNote)]}
                <button
                  class={`match-note match-note--grid ${activeGridNoteIndex === index ? 'is-active' : ''}`}
                  type="button"
                  style={`top:${rowCenter(toneNote)}%; left:${getGridNoteLeft(index, visibleGridNotes.length)}%; color:${row?.hex ?? '#6a5140'};`}
                  aria-label={`Choose pitch ${toneNote}`}
                  disabled={answerLocked || !isPlaying || phase === 'demonstration' || phase === 'complete'}
                  on:click={() => void handleGridNoteClick(index)}
                ></button>
              {/each}

              {#if sourceLanded && visibleSourceNote && landedBesideGridIndex !== null && !sourceFlightNote}
                {@const landingToneNote = visibleGridNotes[landedBesideGridIndex]}
                {@const sourceRow = pitchRows[getRowIndex(visibleSourceNote)]}
                <span
                  bind:this={landedSourceNoteEl}
                  class={`match-note match-note--landed-source ${sourceNoteActive ? 'is-active' : ''}`}
                  style={`top:${rowCenter(landingToneNote)}%; left:${getLandedSourceLeft(landedBesideGridIndex, visibleGridNotes.length)}%; color:${sourceRow?.hex ?? '#6a5140'};`}
                  aria-hidden="true"
                ></span>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </section>
</div>

{#if sourceFlightNote}
  <span
    class={`match-note match-note--flight ${sourceFlightNote.landed ? 'is-landed' : ''}`}
    style={`--match-note-size:${overlayNoteSize}px; left:${sourceFlightNote.landed ? sourceFlightNote.endX : sourceFlightNote.startX}px; top:${sourceFlightNote.landed ? sourceFlightNote.endY : sourceFlightNote.startY}px; color:${sourceFlightNote.color};`}
    aria-hidden="true"
  ></span>
{/if}

<style>
  .match-scene {
    display: grid;
    grid-template-columns: minmax(16rem, 20rem) minmax(0, 1fr);
    gap: 1rem;
    align-items: stretch;
    min-height: 0;
  }

  .match-support {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    min-height: 100%;
  }

  .source-note-wrap {
    min-height: 4rem;
    display: grid;
    place-items: center;
  }

  .match-workspace {
    min-width: 0;
    min-height: 0;
    width: fit-content;
    max-width: 100%;
    justify-self: start;
    align-self: start;
    padding: 1rem;
    transition:
      border-color 0.16s ease,
      box-shadow 0.16s ease;
  }

  .match-workspace.is-success {
    border-color: rgba(66, 151, 94, 0.28);
    box-shadow: var(--amt-shadow), 0 0 0 1px rgba(66, 151, 94, 0.14);
  }

  .match-workspace.is-error {
    border-color: rgba(201, 90, 77, 0.26);
    box-shadow: var(--amt-shadow), 0 0 0 1px rgba(201, 90, 77, 0.14);
  }

  .pitch-grid-frame {
    width: min(100%, 60rem);
    height: clamp(36rem, calc(100svh - 10rem), 54rem);
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    overflow: visible;
  }

  .pitch-grid-shell {
    display: block;
    max-width: 100%;
    max-height: 100%;
  }

  .pitch-grid-field {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: visible;
    border-radius: 22px;
    border: 1px solid rgba(84, 65, 39, 0.14);
    background:
      radial-gradient(580px 260px at 100% 8%, rgba(78, 176, 226, 0.06), transparent 62%),
      radial-gradient(620px 260px at 0% 100%, rgba(202, 187, 102, 0.06), transparent 64%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(247, 241, 231, 0.94));
  }

  .match-note-layer {
    position: absolute;
    inset: 0 0 0 var(--legend-width);
    pointer-events: none;
    z-index: 3;
  }

  .match-note {
    width: var(--match-note-size);
    height: var(--match-note-size);
    display: block;
    border: 2px solid currentColor;
    border-radius: 999px;
    background: transparent;
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.72),
      0 5px 12px rgba(39, 28, 18, 0.12);
    transition:
      background-color 0.12s ease,
      box-shadow 0.12s ease,
      transform 0.12s ease;
  }

  .match-note.is-active {
    background: color-mix(in srgb, currentColor 30%, rgba(255, 255, 255, 0.9));
    box-shadow:
      0 0 0 2px rgba(255, 255, 255, 0.88),
      0 0 18px currentColor,
      0 0 32px color-mix(in srgb, currentColor 48%, transparent);
  }

  .match-note--source {
    position: relative;
  }

  .match-note--source.is-active {
    transform: scale(1.12);
  }

  .match-note--grid {
    position: absolute;
    padding: 0;
    appearance: none;
    transform: translate(-50%, -50%);
    pointer-events: auto;
    cursor: pointer;
  }

  .match-note--grid:hover:not(:disabled),
  .match-note--grid:focus-visible {
    transform: translate(-50%, -50%) scale(1.08);
  }

  .match-note--grid.is-active {
    transform: translate(-50%, -50%) scale(1.12);
  }

  .match-note--grid:disabled {
    cursor: default;
    opacity: 1;
  }

  .match-note--landed-source {
    position: absolute;
    transform: translate(-50%, -50%);
  }

  .match-note--landed-source.is-active {
    transform: translate(-50%, -50%) scale(1.12);
  }

  .match-note--flight {
    position: fixed;
    z-index: 60;
    pointer-events: none;
    transform: translate(-50%, -50%);
    transition:
      left 0.6s cubic-bezier(0.2, 0.72, 0.2, 1),
      top 0.6s cubic-bezier(0.2, 0.72, 0.2, 1);
  }

  @media (max-width: 980px) {
    .match-scene {
      grid-template-columns: 1fr;
    }

    .match-support {
      min-height: auto;
    }
  }

  @media (max-width: 760px) {
    .match-workspace {
      padding: 0.75rem;
    }

    .pitch-grid-frame {
      height: clamp(31rem, calc(100svh - 12rem), 46rem);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .match-note,
    .match-note--flight {
      transition: none;
    }
  }
</style>
