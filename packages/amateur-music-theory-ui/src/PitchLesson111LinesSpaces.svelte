<script lang="ts">
  import { fullRowData } from '@mlt/pitch-data';
  import { PitchGrid } from '@mlt/ui-components/canvas';
  import type {
    PitchGridViewport,
    SingingModeConfig,
  } from '@mlt/ui-components/canvas';
  import { onDestroy } from 'svelte';
  import LessonAvatarDock from './LessonAvatarDock.svelte';
  import { cancelLessonAvatarSpeech, speakWithLessonAvatar } from './lessonAvatar';
  import type { LessonSection } from './lessons';

  type Props = {
    section: LessonSection;
    isPlaying?: boolean;
    volume?: number;
    actionSkipSignal?: number;
    onComplete?: () => void;
  };

  type LessonStage = 'demonstration' | 'quiz' | 'drag' | 'complete';
  type DemoGroup = 'lines' | 'spaces' | null;
  type QuizAnswer = 'line' | 'space';
  type DragTarget = 'line' | 'space';

  type DisplayNote = {
    id: string;
    toneNote: string;
    spokenName: string;
    rowIndex: number;
    color: string;
    frequency: number;
    leftPercent: number;
  };

  type DraggableNote = {
    id: string;
    rowIndex: number;
    leftPercent: number;
  };

  let {
    section,
    isPlaying = true,
    volume = 72,
    actionSkipSignal = 0,
    onComplete,
  }: Props = $props();

  const pitchRows = fullRowData;
  const rowIndexByTone = new Map(pitchRows.map((row, index) => [row.toneNote, index]));
  const viewportStartRow = rowIndexByTone.get('A5') ?? 0;
  const viewportEndRow = rowIndexByTone.get('A3') ?? pitchRows.length - 1;
  const viewportRowCount = Math.max(1, viewportEndRow - viewportStartRow + 1);
  const pitchGridFallbackColumnSize = 18;
  const pitchGridLegendWidthUnits = 6;
  const pitchGridMusicalColumnCount = 32;
  const pitchGridSingingConfig: SingingModeConfig = { pitchHistory: [] };
  const quizQuestion = 'Is this note on a line or space?';

  const lineToneSpecs = [
    ['Bb3', 'A sharp 3'],
    ['C4', 'C 4'],
    ['D4', 'D 4'],
    ['E4', 'E 4'],
    ['Gb4', 'F sharp 4'],
    ['Ab4', 'G sharp 4'],
    ['Bb4', 'A sharp 4'],
    ['C5', 'C 5'],
    ['D5', 'D 5'],
    ['E5', 'E 5'],
    ['Gb5', 'F sharp 5'],
    ['Ab5', 'G sharp 5'],
  ] as const;

  const spaceToneSpecs = [
    ['A3', 'A 3'],
    ['B3', 'B 3'],
    ['Db4', 'C sharp 4'],
    ['Eb4', 'D sharp 4'],
    ['F4', 'F 4'],
    ['G4', 'G 4'],
    ['A4', 'A 4'],
    ['B4', 'B 4'],
    ['Db5', 'C sharp 5'],
    ['Eb5', 'D sharp 5'],
    ['F5', 'F 5'],
    ['G5', 'G 5'],
    ['A5', 'A 5'],
  ] as const;

  const quizToneSpecs = [
    ['Db4', 'C sharp 4'],
    ['Ab4', 'G sharp 4'],
    ['Eb5', 'D sharp 5'],
    ['D4', 'D 4'],
    ['F4', 'F 4'],
  ] as const;

  const dragToneSpecs = [
    ['Db4', 'C sharp 4'],
    ['B4', 'B 4'],
    ['G4', 'G 4'],
    ['F5', 'F 5'],
    ['A3', 'A 3'],
  ] as const;

  function buildDisplayNotes(
    prefix: string,
    specs: readonly (readonly [string, string])[],
    spacing: 'one-beat' | 'even',
  ): DisplayNote[] {
    return specs.flatMap(([toneNote, spokenName], index) => {
      const rowIndex = rowIndexByTone.get(toneNote);
      if (typeof rowIndex !== 'number') return [];
      const row = pitchRows[rowIndex];
      if (!row || typeof row.frequency !== 'number') return [];
      const note: DisplayNote = {
        id: `${prefix}-${toneNote}`,
        toneNote,
        spokenName,
        rowIndex,
        color: row.hex,
        frequency: row.frequency,
        leftPercent: spacing === 'one-beat'
          ? ((4 + index * 2) / pitchGridMusicalColumnCount) * 100
          : ((index + 1) / (specs.length + 1)) * 100,
      };
      return [note];
    });
  }

  const lineNotes = buildDisplayNotes('line', lineToneSpecs, 'one-beat');
  const spaceNotes = buildDisplayNotes('space', spaceToneSpecs, 'one-beat');
  const quizNotes = buildDisplayNotes('quiz', quizToneSpecs, 'even');
  const initialDragNotes = buildDisplayNotes('drag', dragToneSpecs, 'even').map(
    (note): DraggableNote => ({
      id: note.id,
      rowIndex: note.rowIndex,
      leftPercent: note.leftPercent,
    }),
  );
  const glowingLineRows = lineNotes.map((note) => note.rowIndex);

  let frameWidth = $state(0);
  let frameHeight = $state(0);
  let viewportWidth = $state(0);
  let viewportHeight = $state(0);
  let avatarReady = $state(false);
  let sequenceStarted = $state(false);
  let narrationText = $state('');
  let stage = $state<LessonStage>('demonstration');
  let demoGroup = $state<DemoGroup>(null);
  let visibleDemoNoteCount = $state(0);
  let activeDemoNoteId = $state<string | null>(null);
  let linesGlowing = $state(false);
  let quizNoteIndex = $state(0);
  let answerLocked = $state(true);
  let answersVisible = $state(false);
  let dragTarget = $state<DragTarget>('line');
  let dragLocked = $state(true);
  let draggableNotes = $state<DraggableNote[]>([]);
  let draggingNoteId = $state<string | null>(null);
  let activeDragNoteId = $state<string | null>(null);
  let dragPointerId: number | null = null;
  let dragPreviewRequestId = 0;
  let dragPreviewRowIndex: number | null = null;
  let dragFieldElement = $state<HTMLDivElement | null>(null);
  let sequenceToken = 0;
  let lastActionSkipSignal = $state(0);
  let skipSignalReady = $state(false);
  let audioContext: AudioContext | null = null;
  let activeOscillator: OscillatorNode | null = null;
  let activeGain: GainNode | null = null;

  const layoutColumnSize = $derived(
    frameWidth > 0 && frameHeight > 0
      ? Math.max(
          1,
          Math.min(
            frameHeight / (viewportRowCount + 1),
            frameWidth / (pitchGridMusicalColumnCount + pitchGridLegendWidthUnits),
          ),
        )
      : pitchGridFallbackColumnSize,
  );
  const shellWidth = $derived(
    layoutColumnSize * (pitchGridMusicalColumnCount + pitchGridLegendWidthUnits),
  );
  const shellHeight = $derived(layoutColumnSize * (viewportRowCount + 1));
  const cellWidth = $derived(layoutColumnSize);
  const cellHeight = $derived(
    viewportHeight > 0
      ? (viewportHeight * 2) / (viewportRowCount + 1)
      : layoutColumnSize * 2,
  );
  const legendWidth = $derived(cellWidth * pitchGridLegendWidthUnits);
  const noteSize = $derived(cellHeight);
  const pitchGridViewport = $derived<PitchGridViewport>({
    startRow: viewportStartRow,
    endRow: viewportEndRow,
    zoomLevel: 1,
    containerWidth: viewportWidth,
    containerHeight: viewportHeight,
  });
  const visibleDemoNotes = $derived.by(() => {
    const notes = demoGroup === 'lines'
      ? lineNotes
      : demoGroup === 'spaces'
        ? spaceNotes
        : [];
    return notes.slice(0, visibleDemoNoteCount);
  });
  const currentQuizNote = $derived(quizNotes[quizNoteIndex] ?? null);
  const underlinedWords = $derived(
    narrationText === quizQuestion ? ['line', 'space'] : [],
  );

  function rowCenter(rowIndex: number): number {
    const relativeRowIndex = rowIndex - viewportStartRow;
    return ((relativeRowIndex + 1) / (viewportRowCount + 1)) * 100;
  }

  function isCurrentSequence(token: number): boolean {
    return token === sequenceToken;
  }

  function rawDelay(durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, durationMs);
    });
  }

  async function waitMs(durationMs: number, token: number): Promise<boolean> {
    let remainingMs = Math.max(0, durationMs);
    while (remainingMs > 0 && isCurrentSequence(token)) {
      if (!isPlaying) {
        await rawDelay(50);
        continue;
      }
      const chunkMs = Math.min(remainingMs, 50);
      await rawDelay(chunkMs);
      remainingMs -= chunkMs;
    }
    return isCurrentSequence(token);
  }

  async function waitForPlayback(token: number): Promise<boolean> {
    while (!isPlaying && isCurrentSequence(token)) {
      await rawDelay(50);
    }
    return isCurrentSequence(token);
  }

  async function say(
    text: string,
    token: number,
    speechOptions: { preSpeakWaveMs?: number; rate?: number } = {},
  ): Promise<void> {
    narrationText = text;
    if (!avatarReady || !(await waitForPlayback(token))) return;
    try {
      await speakWithLessonAvatar(text, {
        lang: 'en-CA',
        rate: speechOptions.rate ?? 0.92,
        chunking: 'sentence',
        preSpeakWaveMs: speechOptions.preSpeakWaveMs,
      });
    } catch {}
  }

  async function ensureAudioContext(): Promise<AudioContext | null> {
    if (typeof window === 'undefined') return null;
    if (!audioContext || audioContext.state === 'closed') {
      audioContext = new AudioContext();
    }
    if (audioContext.state === 'suspended') {
      try {
        await audioContext.resume();
      } catch {
        return null;
      }
    }
    return audioContext;
  }

  function stopTone(): void {
    if (activeGain && audioContext) {
      const now = audioContext.currentTime;
      try {
        activeGain.gain.cancelScheduledValues(now);
        activeGain.gain.setValueAtTime(Math.max(0.0001, activeGain.gain.value), now);
        activeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
      } catch {}
    }
    if (activeOscillator && audioContext) {
      try {
        activeOscillator.stop(audioContext.currentTime + 0.045);
      } catch {}
    }
    activeOscillator = null;
    activeGain = null;
    dragPreviewRowIndex = null;
  }

  async function playPitch(
    frequency: number,
    durationMs: number,
    token: number,
  ): Promise<void> {
    if (!(await waitForPlayback(token))) return;
    const context = await ensureAudioContext();
    if (!context || !isCurrentSequence(token)) {
      await waitMs(durationMs, token);
      return;
    }

    stopTone();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const durationSeconds = Math.max(0.08, durationMs / 1000);
    const peak = Math.max(0.012, Math.min(0.075, (volume / 100) * 0.055));

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.018);
    gain.gain.setValueAtTime(peak, now + Math.max(0.03, durationSeconds - 0.045));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + durationSeconds + 0.02);
    activeOscillator = oscillator;
    activeGain = gain;
    oscillator.onended = () => {
      try {
        oscillator.disconnect();
        gain.disconnect();
      } catch {}
      if (activeOscillator === oscillator) {
        activeOscillator = null;
        activeGain = null;
      }
    };

    await waitMs(durationMs, token);
  }

  async function revealAndPlayNotes(notes: DisplayNote[], token: number): Promise<void> {
    visibleDemoNoteCount = 0;
    activeDemoNoteId = null;
    for (let index = 0; index < notes.length; index += 1) {
      if (!isCurrentSequence(token)) return;
      const note = notes[index];
      if (!note) continue;
      visibleDemoNoteCount = index + 1;
      activeDemoNoteId = note.id;
      await playPitch(note.frequency, 145, token);
      if (!(await waitMs(35, token))) return;
    }
    activeDemoNoteId = null;
  }

  async function beginQuiz(token: number): Promise<void> {
    if (!isCurrentSequence(token)) return;
    stage = 'quiz';
    demoGroup = null;
    visibleDemoNoteCount = 0;
    activeDemoNoteId = null;
    linesGlowing = false;
    quizNoteIndex = 0;
    answerLocked = true;
    answersVisible = false;
    await say(quizQuestion, token);
    if (isCurrentSequence(token)) {
      answersVisible = true;
      answerLocked = false;
    }
  }

  async function runLessonSequence(): Promise<void> {
    const token = ++sequenceToken;
    stage = 'demonstration';
    demoGroup = null;
    narrationText = '';
    linesGlowing = true;

    await waitMs(220, token);
    if (!isCurrentSequence(token)) return;
    await say('These horizontal lines together show PITCH.', token);
    if (!isCurrentSequence(token)) return;
    await waitMs(220, token);
    linesGlowing = false;

    demoGroup = 'lines';
    const lineSpeech = say('Notes can go on lines.', token);
    await waitMs(100, token);
    await revealAndPlayNotes(lineNotes, token);
    await lineSpeech;
    if (!isCurrentSequence(token)) return;
    await waitMs(220, token);

    demoGroup = 'spaces';
    const spaceSpeech = say('Or in the spaces.', token);
    await waitMs(100, token);
    await revealAndPlayNotes(spaceNotes, token);
    await spaceSpeech;
    if (!isCurrentSequence(token)) return;
    await waitMs(280, token);

    await beginQuiz(token);
  }

  function getRowAnswer(rowIndex: number): QuizAnswer {
    const row = pitchRows[rowIndex];
    return row?.column === 'A' ? 'line' : 'space';
  }

  function getQuizAnswer(note: DisplayNote): QuizAnswer {
    return getRowAnswer(note.rowIndex);
  }

  async function finishLesson(token: number): Promise<void> {
    stage = 'complete';
    answerLocked = true;
    dragLocked = true;
    narrationText = '';
    if (!(await waitMs(650, token))) return;
    onComplete?.();
  }

  async function beginDragExercise(token: number): Promise<void> {
    if (!isCurrentSequence(token)) return;
    stage = 'drag';
    answersVisible = false;
    answerLocked = true;
    demoGroup = null;
    visibleDemoNoteCount = 0;
    activeDemoNoteId = null;
    dragTarget = 'line';
    dragLocked = true;
    draggingNoteId = null;
    activeDragNoteId = null;
    draggableNotes = initialDragNotes.map((note) => ({ ...note }));
    narrationText = '';

    if (!(await waitMs(180, token))) return;
    await say('Move each note onto a line.', token);
    if (isCurrentSequence(token)) dragLocked = false;
  }

  async function playDraggableNotes(token: number): Promise<void> {
    for (const note of draggableNotes) {
      if (!isCurrentSequence(token)) return;
      const row = pitchRows[note.rowIndex];
      if (!row || typeof row.frequency !== 'number') continue;
      activeDragNoteId = note.id;
      await playPitch(row.frequency, 190, token);
      if (!(await waitMs(45, token))) return;
    }
    activeDragNoteId = null;
  }

  function allDraggableNotesMatch(target: DragTarget): boolean {
    return draggableNotes.length === initialDragNotes.length
      && draggableNotes.every((note) => getRowAnswer(note.rowIndex) === target);
  }

  async function handleDragTargetSuccess(token: number): Promise<void> {
    if (!isCurrentSequence(token) || !allDraggableNotesMatch(dragTarget)) return;
    dragLocked = true;
    draggingNoteId = null;
    await playDraggableNotes(token);
    if (!isCurrentSequence(token)) return;
    if (!(await waitMs(520, token))) return;

    if (dragTarget === 'line') {
      dragTarget = 'space';
      await say('Move each note into a space.', token);
      if (isCurrentSequence(token)) dragLocked = false;
      return;
    }

    await finishLesson(token);
  }

  async function answerQuiz(answer: QuizAnswer): Promise<void> {
    const note = currentQuizNote;
    if (!note || answerLocked || !isPlaying || stage !== 'quiz') return;
    const token = sequenceToken;
    answerLocked = true;

    if (answer !== getQuizAnswer(note)) {
      await say('Try again.', token, { preSpeakWaveMs: 90, rate: 1.02 });
      if (!isCurrentSequence(token)) return;
      narrationText = quizQuestion;
      answerLocked = false;
      return;
    }

    await playPitch(note.frequency, 480, token);
    if (!isCurrentSequence(token)) return;

    if (quizNoteIndex < quizNotes.length - 1) {
      quizNoteIndex += 1;
      await waitMs(140, token);
      if (isCurrentSequence(token)) {
        narrationText = quizQuestion;
        answerLocked = false;
      }
      return;
    }

    await beginDragExercise(token);
  }

  function getDraggedRow(clientY: number): number | null {
    if (!dragFieldElement) return null;
    const rect = dragFieldElement.getBoundingClientRect();
    if (rect.height <= 0) return null;
    const normalizedY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const relativeRow = normalizedY * (viewportRowCount + 1) - 1;
    return Math.max(
      viewportStartRow,
      Math.min(viewportEndRow, Math.round(viewportStartRow + relativeRow)),
    );
  }

  function updateDraggedNote(noteId: string, clientY: number): number | null {
    const rowIndex = getDraggedRow(clientY);
    if (rowIndex === null) return null;
    draggableNotes = draggableNotes.map((note) => (
      note.id === noteId ? { ...note, rowIndex } : note
    ));
    return rowIndex;
  }

  async function updateDragPitchPreview(rowIndex: number): Promise<void> {
    if (!draggingNoteId || !isPlaying || rowIndex === dragPreviewRowIndex) return;
    const row = pitchRows[rowIndex];
    if (!row || typeof row.frequency !== 'number') return;

    if (activeOscillator && activeGain && audioContext?.state === 'running') {
      const now = audioContext.currentTime;
      activeOscillator.frequency.cancelScheduledValues(now);
      activeOscillator.frequency.setTargetAtTime(row.frequency, now, 0.012);
      dragPreviewRowIndex = rowIndex;
      return;
    }

    const requestId = ++dragPreviewRequestId;
    const context = await ensureAudioContext();
    if (
      !context ||
      requestId !== dragPreviewRequestId ||
      !draggingNoteId ||
      !isPlaying
    ) {
      return;
    }

    stopTone();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const peak = Math.max(0.012, Math.min(0.075, (volume / 100) * 0.055));

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(row.frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.025);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.onended = () => {
      try {
        oscillator.disconnect();
        gain.disconnect();
      } catch {}
      if (activeOscillator === oscillator) {
        activeOscillator = null;
        activeGain = null;
        dragPreviewRowIndex = null;
      }
    };

    activeOscillator = oscillator;
    activeGain = gain;
    dragPreviewRowIndex = rowIndex;
  }

  function stopDragPitchPreview(): void {
    dragPreviewRequestId += 1;
    dragPreviewRowIndex = null;
    stopTone();
  }

  function handleDragPointerDown(event: PointerEvent, noteId: string): void {
    if (stage !== 'drag' || dragLocked || !isPlaying) return;
    event.preventDefault();
    draggingNoteId = noteId;
    dragPointerId = event.pointerId;
    const target = event.currentTarget as HTMLButtonElement;
    target.setPointerCapture(event.pointerId);
    const rowIndex = updateDraggedNote(noteId, event.clientY);
    if (rowIndex !== null) void updateDragPitchPreview(rowIndex);
  }

  function handleDragPointerMove(event: PointerEvent, noteId: string): void {
    if (draggingNoteId !== noteId || dragPointerId !== event.pointerId) return;
    const rowIndex = updateDraggedNote(noteId, event.clientY);
    if (rowIndex !== null) void updateDragPitchPreview(rowIndex);
  }

  function handleDragPointerUp(event: PointerEvent, noteId: string): void {
    if (draggingNoteId !== noteId || dragPointerId !== event.pointerId) return;
    updateDraggedNote(noteId, event.clientY);
    const target = event.currentTarget as HTMLButtonElement;
    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
    stopDragPitchPreview();
    draggingNoteId = null;
    dragPointerId = null;
    void handleDragTargetSuccess(sequenceToken);
  }

  function handleDragPointerCancel(event: PointerEvent, noteId: string): void {
    if (draggingNoteId !== noteId || dragPointerId !== event.pointerId) return;
    const target = event.currentTarget as HTMLButtonElement;
    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
    stopDragPitchPreview();
    draggingNoteId = null;
    dragPointerId = null;
  }

  function findClosestTargetRow(rowIndex: number, target: DragTarget): number {
    let closestRow = rowIndex;
    let closestDistance = Number.POSITIVE_INFINITY;
    for (let candidate = viewportStartRow; candidate <= viewportEndRow; candidate += 1) {
      if (getRowAnswer(candidate) !== target) continue;
      const distance = Math.abs(candidate - rowIndex);
      if (distance < closestDistance) {
        closestRow = candidate;
        closestDistance = distance;
      }
    }
    return closestRow;
  }

  function cancelCurrentSequence(): number {
    sequenceToken += 1;
    cancelLessonAvatarSpeech();
    stopDragPitchPreview();
    draggingNoteId = null;
    dragPointerId = null;
    activeDragNoteId = null;
    return sequenceToken;
  }

  async function skipCurrentAction(): Promise<void> {
    const skippedStage = stage;
    const token = cancelCurrentSequence();
    if (skippedStage === 'demonstration') {
      await beginQuiz(token);
      return;
    }

    if (skippedStage === 'quiz') {
      if (quizNoteIndex < quizNotes.length - 1) {
        quizNoteIndex += 1;
        narrationText = quizQuestion;
        answerLocked = false;
      } else {
        await beginDragExercise(token);
      }
      return;
    }

    if (skippedStage === 'drag') {
      draggableNotes = draggableNotes.map((note) => ({
        ...note,
        rowIndex: findClosestTargetRow(note.rowIndex, dragTarget),
      }));
      await handleDragTargetSuccess(token);
    }
  }

  function handleAvatarReady(): void {
    avatarReady = true;
  }

  $effect(() => {
    if (avatarReady && isPlaying && !sequenceStarted) {
      sequenceStarted = true;
      void runLessonSequence();
    }
  });

  $effect(() => {
    const signal = actionSkipSignal;
    if (!skipSignalReady) {
      lastActionSkipSignal = signal;
      skipSignalReady = true;
      return;
    }
    if (signal !== lastActionSkipSignal) {
      lastActionSkipSignal = signal;
      void skipCurrentAction();
    }
  });

  $effect(() => {
    if (!audioContext || audioContext.state === 'closed') return;
    if (isPlaying && audioContext.state === 'suspended') {
      void audioContext.resume().catch(() => {});
    } else if (!isPlaying && audioContext.state === 'running') {
      void audioContext.suspend().catch(() => {});
    }
  });

  onDestroy(() => {
    cancelCurrentSequence();
    if (audioContext && audioContext.state !== 'closed') {
      void audioContext.close();
    }
  });
</script>

<div
  class="lines-spaces-scene"
  style={`--legend-width:${legendWidth}px; --lesson-note-size:${noteSize}px;`}
>
  <div class="lines-spaces-support">
    <LessonAvatarDock
      character="grammy"
      speechText={narrationText}
      {underlinedWords}
      on:ready={handleAvatarReady}
    />

    {#if stage === 'quiz' && currentQuizNote && answersVisible}
      <div class="quiz-answers" aria-label="Choose whether the note is on a line or in a space">
        <button
          type="button"
          disabled={answerLocked || !isPlaying}
          onclick={() => void answerQuiz('line')}
        >
          On Line
        </button>
        <button
          type="button"
          disabled={answerLocked || !isPlaying}
          onclick={() => void answerQuiz('space')}
        >
          In Space
        </button>
      </div>
    {/if}
  </div>

  <section class="lines-spaces-workspace app-card" aria-label={`${section.code} ${section.label}`}>
    <div
      class="pitch-grid-frame"
      bind:clientWidth={frameWidth}
      bind:clientHeight={frameHeight}
    >
      <div
        class="pitch-grid-shell"
        style={`width:${shellWidth}px; height:${shellHeight}px;`}
      >
        <div
          class="pitch-grid-field"
          bind:clientWidth={viewportWidth}
          bind:clientHeight={viewportHeight}
        >
          {#if viewportWidth > 0 && viewportHeight > 0}
            <PitchGrid
              mode="singing"
              fullRowData={pitchRows}
              viewport={pitchGridViewport}
              {cellWidth}
              {cellHeight}
              colorMode="color"
              showOctaveLabels={true}
              showLegendLabels={false}
              showAccidentalLabels={false}
              showFrequencyLabels={false}
              showRightLegend={false}
              singingConfig={pitchGridSingingConfig}
              showHorizontalGridLines={true}
              horizontalGridReferencePitchClass={0}
            />

            <div class="pitch-grid-overlay" bind:this={dragFieldElement}>
              {#if linesGlowing}
                <div class="line-glow-layer" aria-hidden="true">
                  {#each glowingLineRows as rowIndex (`glow-${rowIndex}`)}
                    <span
                      class="line-glow"
                      style={`top:${rowCenter(rowIndex)}%;`}
                    ></span>
                  {/each}
                </div>
              {/if}

              {#if stage === 'demonstration'}
                {#each visibleDemoNotes as note (note.id)}
                  <span
                    class={`lesson-note ${activeDemoNoteId === note.id ? 'is-active' : ''}`}
                    style={`top:${rowCenter(note.rowIndex)}%; left:${note.leftPercent}%; color:${note.color};`}
                    aria-hidden="true"
                  ></span>
                {/each}
              {:else if stage === 'quiz'}
                {#each quizNotes as note, index (note.id)}
                  <span
                    class={`lesson-note quiz-note ${index === quizNoteIndex ? 'is-current' : ''}`}
                    style={`top:${rowCenter(note.rowIndex)}%; left:${note.leftPercent}%; color:${note.color};`}
                    aria-hidden="true"
                  ></span>
                {/each}

                {#if currentQuizNote}
                  <span
                    class="quiz-pointer"
                    style={`top:${rowCenter(currentQuizNote.rowIndex)}%; left:${currentQuizNote.leftPercent}%;`}
                    aria-hidden="true"
                  >
                    <span class="quiz-pointer-stem"></span>
                    <span class="quiz-pointer-head"></span>
                  </span>
                {/if}
              {:else if stage === 'drag'}
                {#each draggableNotes as note, index (note.id)}
                  <button
                    type="button"
                    class={`lesson-note draggable-note ${activeDragNoteId === note.id || draggingNoteId === note.id ? 'is-active' : ''} ${draggingNoteId === note.id ? 'is-dragging' : ''}`}
                    style={`top:${rowCenter(note.rowIndex)}%; left:${note.leftPercent}%; color:${pitchRows[note.rowIndex]?.hex ?? '#6a5140'};`}
                    aria-label={`Note ${index + 1}: drag up or down`}
                    disabled={dragLocked || !isPlaying}
                    onpointerdown={(event) => handleDragPointerDown(event, note.id)}
                    onpointermove={(event) => handleDragPointerMove(event, note.id)}
                    onpointerup={(event) => handleDragPointerUp(event, note.id)}
                    onpointercancel={(event) => handleDragPointerCancel(event, note.id)}
                  ></button>
                {/each}
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </section>
</div>

<style>
  .lines-spaces-scene {
    display: grid;
    grid-template-columns: minmax(16rem, 20rem) minmax(0, 1fr);
    gap: 1rem;
    align-items: stretch;
    min-height: 0;
  }

  .lines-spaces-support {
    display: flex;
    min-height: 100%;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.9rem;
  }

  .lines-spaces-workspace {
    width: 100%;
    min-width: 0;
    min-height: 0;
    display: grid;
    align-content: start;
    padding: 1rem;
  }

  .pitch-grid-frame {
    width: 100%;
    height: clamp(34rem, calc(100svh - 10rem), 52rem);
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    overflow: hidden;
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
    overflow: hidden;
    border: 1px solid rgba(84, 65, 39, 0.14);
    border-radius: 22px;
    background:
      radial-gradient(580px 260px at 100% 8%, rgba(78, 176, 226, 0.06), transparent 62%),
      radial-gradient(620px 260px at 0% 100%, rgba(202, 187, 102, 0.06), transparent 64%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(247, 241, 231, 0.94));
  }

  .pitch-grid-overlay {
    position: absolute;
    inset: 0 0 0 var(--legend-width);
    pointer-events: none;
    z-index: 2;
  }

  .line-glow-layer {
    position: absolute;
    inset: 0;
  }

  .line-glow {
    position: absolute;
    left: 0;
    right: 0;
    height: 3px;
    border-radius: 999px;
    background: rgba(255, 213, 74, 0.94);
    box-shadow:
      0 0 5px rgba(255, 225, 105, 0.98),
      0 0 14px rgba(255, 194, 52, 0.8),
      0 0 28px rgba(255, 174, 36, 0.48);
    transform: translateY(-50%);
    animation: line-shimmer 0.78s ease-in-out infinite alternate;
  }

  .lesson-note {
    position: absolute;
    width: var(--lesson-note-size);
    height: var(--lesson-note-size);
    border: max(1.5px, calc(var(--lesson-note-size) * 0.075)) solid currentColor;
    border-radius: 999px;
    background: transparent;
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.7),
      0 3px 8px rgba(39, 28, 18, 0.1);
    transform: translate(-50%, -50%);
    transition:
      filter 0.14s ease,
      box-shadow 0.14s ease,
      transform 0.14s ease;
  }

  .lesson-note.is-active,
  .quiz-note.is-current {
    box-shadow:
      0 0 0 2px rgba(255, 255, 255, 0.88),
      0 0 15px currentColor,
      0 0 28px color-mix(in srgb, currentColor 52%, transparent);
    transform: translate(-50%, -50%) scale(1.08);
  }

  .lesson-note.is-active {
    animation: playback-fill 0.28s ease-in-out infinite alternate;
  }

  .quiz-note.is-current {
    background: transparent;
    animation: note-pulse 0.8s ease-in-out infinite alternate;
  }

  .draggable-note {
    padding: 0;
    appearance: none;
    pointer-events: auto;
    cursor: ns-resize;
    touch-action: none;
  }

  .draggable-note:disabled {
    cursor: default;
  }

  .draggable-note.is-dragging {
    transform: translate(-50%, -50%) scale(1.12);
    transition: none;
    z-index: 3;
  }

  .quiz-pointer {
    position: absolute;
    width: max(1.5rem, calc(var(--lesson-note-size) * 1.2));
    height: max(2.3rem, calc(var(--lesson-note-size) * 1.7));
    transform: translate(-50%, calc(-100% - var(--lesson-note-size) * 0.62));
    filter: drop-shadow(0 3px 5px rgba(111, 50, 28, 0.24));
  }

  .quiz-pointer-stem {
    position: absolute;
    top: 0;
    left: 50%;
    width: 4px;
    height: 68%;
    border-radius: 999px;
    background: #c95a4d;
    transform: translateX(-50%);
  }

  .quiz-pointer-head {
    position: absolute;
    left: 50%;
    bottom: 0;
    width: 0;
    height: 0;
    border-left: 0.62rem solid transparent;
    border-right: 0.62rem solid transparent;
    border-top: 0.82rem solid #c95a4d;
    transform: translateX(-50%);
  }

  .quiz-answers {
    width: min(18rem, 100%);
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.65rem;
  }

  .quiz-answers button {
    min-height: 3rem;
    padding: 0.65rem 0.8rem;
    border: 1px solid rgba(47, 141, 131, 0.34);
    border-radius: 999px;
    background: rgba(47, 141, 131, 0.14);
    color: #254d44;
    font: inherit;
    font-size: 1rem;
    font-weight: 800;
    cursor: pointer;
    transition:
      transform 0.14s ease,
      background-color 0.14s ease,
      border-color 0.14s ease;
  }

  .quiz-answers button:hover:not(:disabled),
  .quiz-answers button:focus-visible {
    border-color: rgba(47, 141, 131, 0.58);
    background: rgba(47, 141, 131, 0.24);
    transform: translateY(-1px);
  }

  .quiz-answers button:disabled {
    cursor: default;
    opacity: 0.48;
  }

  @keyframes line-shimmer {
    from {
      opacity: 0.62;
      filter: brightness(0.98);
    }
    to {
      opacity: 1;
      filter: brightness(1.16);
    }
  }

  @keyframes note-pulse {
    from {
      filter: brightness(1);
    }
    to {
      filter: brightness(1.22);
      box-shadow:
        0 0 0 3px rgba(255, 255, 255, 0.9),
        0 0 20px currentColor,
        0 0 36px color-mix(in srgb, currentColor 62%, transparent);
    }
  }

  @keyframes playback-fill {
    from {
      background-color: transparent;
    }
    to {
      background-color: color-mix(in srgb, currentColor 34%, rgba(255, 255, 255, 0.72));
    }
  }

  @media (max-width: 980px) {
    .lines-spaces-scene {
      grid-template-columns: 1fr;
    }

    .lines-spaces-support {
      display: grid;
      grid-template-columns: minmax(0, 18rem) minmax(0, 1fr);
      align-items: start;
      min-height: auto;
    }
  }

  @media (max-width: 760px) {
    .lines-spaces-support {
      grid-template-columns: 1fr;
    }

    .pitch-grid-frame {
      height: clamp(25rem, calc(100svh - 12rem), 42rem);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .line-glow,
    .quiz-note.is-current,
    .lesson-note.is-active {
      animation: none;
    }

    .lesson-note.is-active {
      background-color: color-mix(in srgb, currentColor 28%, rgba(255, 255, 255, 0.72));
    }

    .lesson-note {
      transition: none;
    }
  }
</style>
