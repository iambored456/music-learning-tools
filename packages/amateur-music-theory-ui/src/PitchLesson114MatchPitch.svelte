<script lang="ts">
  import { createLessonQuestion } from '@mlt/lesson-kit';
  const questionNarration = createLessonQuestion(cancelLessonAvatarSpeech, setLessonAvatarThinking);
  import "@mlt/lesson-kit/styles.css";
  import { lessonGridAppearance, calculateLessonGridLayout, lessonNoteAppearance } from '@mlt/lesson-kit';
  import { createLessonAudioOutput } from '@mlt/lesson-kit';
  import { fullRowData } from '@mlt/pitch-data';
  import { PitchGrid } from '@mlt/ui-components/canvas';
  import type { PitchGridViewport, SingingModeConfig } from '@mlt/ui-components/canvas';
  import { getContext, onDestroy, tick } from 'svelte';
  import { lessonInspectorKey, type LessonCue, type LessonInspector } from './lessonInspector.svelte';
  import LessonAvatarDock from './LessonAvatarDock.svelte';
  import { setLessonAvatarThinking, cancelLessonAvatarSpeech, speakWithLessonAvatar } from './lessonAvatar';
  import type { LessonSection } from './lessons';

  const audioOutput = createLessonAudioOutput();
  const inspector = getContext<LessonInspector | undefined>(lessonInspectorKey);
  let unregisterInspector: (() => void) | undefined;
  let activeInspectorCue: string | null = null;
  let demoSeekTarget: string | null = null;

  function cue(id: string, title: string, actions: Array<[string, string, string]>): LessonCue {
    return { id, title, prompt: '', visual: '', audio: '', gesture: '', input: '', completion: '', timing: {},
      actions: actions.map(([actionId, actionTitle, detail]) => ({ id: actionId, title: actionTitle, detail })) };
  }

  function mark(cueId: string, actionId: string): void {
    if (demoSeekTarget) {
      if (`${cueId}/${actionId}` !== demoSeekTarget) return;
      demoSeekTarget = null;
    }
    if (activeInspectorCue !== cueId) {
      if (activeInspectorCue) inspector?.status('completed');
      activeInspectorCue = cueId;
      inspector?.enter(cueId);
    }
    inspector?.action(actionId);
    inspector?.status('running');
  }

  export let section: LessonSection;
  export let isPlaying = true;
  export let volume = 72;
  export let avatarAlreadyPositioned = false;
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
  const viewportStartRow = rowIndexByTone.get('B5') ?? 0;
  const viewportEndRow = rowIndexByTone.get('A2') ?? pitchRows.length - 1;
  const viewportRowCount = Math.max(1, viewportEndRow - viewportStartRow + 1);
  const gridColumnCount = 34;
  const fallbackCellSize = 16;
  const singingConfig: SingingModeConfig = { pitchHistory: [] };
  const introductoryNotes = ['A2', 'D3', 'F4', 'A5'] as const;
  const firstChoiceNotes = ['A2', 'D3', 'F4', 'A5'] as const;
  const introductorySourceNote = 'F4';
  const introductoryCycle = { gridNotes: firstChoiceNotes, sourceNote: introductorySourceNote };
  const introductoryPrompt = 'Click the matching note on the grid.';
  const samePitchStatement = '...have the same pitch.';
  const questions: MatchQuestion[] = [
    {
      id: 'match-1',
      gridNotes: ['F3', 'E5'],
      sourceNote: 'E5',
      prompt: 'Click the matching note again.',
    },
    {
      id: 'match-2',
      gridNotes: ['D3', 'B4'],
      sourceNote: 'D3',
      prompt: 'Click the matching note again.',
    },
    {
      id: 'match-3',
      gridNotes: ['A2', 'B2', 'D3'],
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

  const cuePlan: LessonCue[] = [
    cue('demonstrate-match', 'Hear and see a matching pitch', [
      ['listen', '“Listen carefully.”', 'Grammy introduces the example.'],
      ['grid', 'Sound the grid from bottom to top', 'Highlight and play A2, D3, F4, and A5 in ascending order.'],
      ['source', '“This note...” and sound the source', 'Grammy points out and plays the source F4.'],
      ['matching-grid-note', '“...and this note...” and sound F4 on the grid', 'Play the corresponding grid note.'],
      ['same-pitch', 'Explain that the two notes have the same pitch', 'Underline “pitch”, move the source beside its match, and alternate both sounds.'],
      ['matches', '“These notes match.”', 'Hold the matching pair, then return the example note beneath Grammy before the first learner choice.'],
    ]),
    cue('first-choice', 'Find the demonstrated match', [
      ['prompt', introductoryPrompt, 'Unlock the grid, speak the prompt, then preview and cycle the source and grid notes just like the later questions.'],
      ['retry', 'If incorrect: “Try again.”', 'Move the source beside the selected note, compare the pair, then retry.'],
      ['correct', 'If correct: play the matching pair', 'Show the correct match, sound it, and advance to the next question.'],
    ]),
    ...questions.map((question, index) => cue(question.id, `Match pitch ${index + 1}`, [
      ['prompt', question.prompt, `Preview ${question.sourceNote}, cycle the grid sounds, and wait for a selection.`],
      ['retry', 'If incorrect: “Try again.”', 'Animate the selected pair, sound the mismatch, then retry this question.'],
      ['correct', 'If correct: settle the matching pair', 'Animate the source beside its matching grid note, play the pair, and advance.'],
    ])),
    cue('finish', 'Complete Match the Pitch', [
      ['bravo', '“Bravo!”', 'Speak the completion prompt and advance to the lesson outro.'],
    ]),
  ];

  let frameWidth = 0;
  let frameHeight = 0;
  let viewportWidth = 0;
  let viewportHeight = 0;
  let layoutGridColumnCount = gridColumnCount;
  let cellSize = fallbackCellSize;
  let shellWidth = fallbackCellSize * gridColumnCount;
  let shellHeight = fallbackCellSize * (viewportRowCount + 1);
  let cellHeight = fallbackCellSize * 2;
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
    phase === 'demonstration' ? introductoryNotes
      : phase === 'first-choice' ? firstChoiceNotes
      : currentQuestion?.gridNotes ?? [];
  $: visibleSourceNote =
    phase === 'demonstration' || phase === 'first-choice'
      ? introductorySourceNote
      : currentQuestion?.sourceNote ?? null;
  $: underlinedWords = narrationText === samePitchStatement ? ['pitch'] : [];
  $: layoutGridColumnCount = frameWidth > 0 && frameWidth <= 760 ? 22 : gridColumnCount;
  $: gridLayout = calculateLessonGridLayout({
    width: frameWidth, height: frameHeight,
    columns: layoutGridColumnCount, rows: viewportRowCount,
    fallbackCellSize,
  });
  $: cellSize = gridLayout.cellWidth;
  $: shellWidth = gridLayout.width;
  $: shellHeight = gridLayout.height;
  $: cellHeight = gridLayout.cellHeight;
  $: overlayNoteSize = gridLayout.noteDiameter;
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
      if (audioContext?.state === 'suspended') void audioContext.resume().catch(() => {});
      resumeWait();
      if (!waitResolve && !answerLocked && (phase === 'first-choice' || phase === 'question')) {
        const cycle = phase === 'first-choice' ? introductoryCycle : currentQuestion;
        if (cycle) void runQuestionCycle(cycle, sequenceToken);
      }
    } else {
      pauseWait();
      if (audioContext?.state === 'running') void audioContext.suspend().catch(() => {});
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
    questionNarration.submit();
    cancelLessonAvatarSpeech();
    cancelWait(true);
    stopAllVoices();
    activeGridNoteIndex = null;
    sourceNoteActive = false;
    sourceFlightNote = null;
    return sequenceToken;
  }

  function waitMs(durationMs: number): Promise<void> {
    if (demoSeekTarget) return Promise.resolve();
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
      audioOutput.forget(voice.gain);
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
    const peak = 0.045;
    const voice: ActiveVoice = { oscillator, gain, stopped: false };

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.025);
    gain.gain.setValueAtTime(peak, releaseStart);
    gain.gain.exponentialRampToValueAtTime(0.0001, endTime);
    oscillator.connect(gain);
    audioOutput.connect(gain, context, volume, { frequency, start: now, attackEnd: now + 0.025, releaseStart, end: endTime, peak });
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
    if (demoSeekTarget) return;
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
    questionNarration.submit();
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
    if (demoSeekTarget) return;
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
    if (demoSeekTarget) {
      sourceLanded = true;
      landedBesideGridIndex = targetIndex;
      sourceFlightNote = null;
      return;
    }
    const targetToneNote = gridNotes[targetIndex];
    const sourceRect = (sourceLanded ? landedSourceNoteEl : sourceNoteEl)?.getBoundingClientRect();
    const fieldRect = pitchGridFieldEl?.getBoundingClientRect();
    const sourceRow = pitchRows[getRowIndex(sourceNote)];
    if (!targetToneNote || targetIndex < 0 || !sourceRect || !fieldRect || !sourceRow) {
      sourceLanded = true;
      landedBesideGridIndex = targetIndex;
      return;
    }

    const contentLeft = fieldRect.left;
    const contentWidth = Math.max(0, fieldRect.width);
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

  async function returnSourceToGrammy(token: number): Promise<void> {
    const start = landedSourceNoteEl?.getBoundingClientRect();
    const destination = sourceNoteEl?.getBoundingClientRect();
    const sourceRow = visibleSourceNote ? pitchRows[getRowIndex(visibleSourceNote)] : null;
    if (!demoSeekTarget && sourceLanded && start && destination && sourceRow) {
      sourceFlightNote = {
        startX: start.left + start.width / 2,
        startY: start.top + start.height / 2,
        endX: destination.left + destination.width / 2,
        endY: destination.top + destination.height / 2,
        color: sourceRow.hex,
        landed: false,
      };
      await waitForAnimationFrame();
      await waitForAnimationFrame();
      if (!isCurrentSequence(token) || !sourceFlightNote) return;
      sourceFlightNote = { ...sourceFlightNote, landed: true };
      await waitMs(620);
      if (!isCurrentSequence(token)) return;
    }
    sourceLanded = false;
    landedBesideGridIndex = null;
    sourceFlightNote = null;
  }

  async function runIntroductoryDemonstration(): Promise<void> {
    const token = beginSequence();
    phase = 'demonstration';
    questionIndex = -1;
    answerLocked = true;
    sourceLanded = false;
    landedBesideGridIndex = null;
    feedbackState = null;

    mark('demonstrate-match', 'listen');
    await waitMs(260);
    if (!isCurrentSequence(token)) return;
    await say('Listen carefully.', token);
    if (!isCurrentSequence(token)) return;
    mark('demonstrate-match', 'grid');
    await playGridBottomToTop(introductoryNotes, token);
    if (!isCurrentSequence(token)) return;

    mark('demonstrate-match', 'source');
    await say('This note...', token);
    if (!isCurrentSequence(token)) return;
    await playNote(introductorySourceNote, token, { source: true, durationMs: 500 });
    if (!isCurrentSequence(token)) return;

    mark('demonstrate-match', 'matching-grid-note');
    await say('...and this note...', token);
    if (!isCurrentSequence(token)) return;
    await playNote(introductorySourceNote, token, {
      gridIndex: getCorrectIndex(introductoryNotes, introductorySourceNote),
      durationMs: 500,
    });
    if (!isCurrentSequence(token)) return;

    mark('demonstrate-match', 'same-pitch');
    await say(samePitchStatement, token);
    if (!isCurrentSequence(token)) return;
    await moveSourceBesideMatch(introductoryNotes, introductorySourceNote, token);
    if (!isCurrentSequence(token)) return;
    await playMatchingPair(introductoryNotes, introductorySourceNote, token);
    if (!isCurrentSequence(token)) return;

    mark('demonstrate-match', 'matches');
    await say('These notes match.', token);
    if (!isCurrentSequence(token)) return;
    await waitMs(180);
    if (!isCurrentSequence(token)) return;

    await returnSourceToGrammy(token);
    if (!isCurrentSequence(token)) return;
    phase = 'first-choice';
    answerLocked = false;
    mark('first-choice', 'prompt');
    await questionNarration.start(() => say(introductoryPrompt, token), () => { answerLocked = false; });
    if (!isCurrentSequence(token)) return;
    await playSourcePreview(introductorySourceNote, token);
    if (!isCurrentSequence(token)) return;
    if (demoSeekTarget === 'first-choice/retry' || demoSeekTarget === 'first-choice/correct') {
      const wrong = getCorrectIndex(firstChoiceNotes, introductorySourceNote) === 0 ? 1 : 0;
      await handleGridNoteClick(demoSeekTarget.endsWith('/correct')
        ? getCorrectIndex(firstChoiceNotes, introductorySourceNote) : wrong, true);
      return;
    }
    void runQuestionCycle(introductoryCycle, token);
  }

  async function startQuestion(index: number, startAt: 'prompt' | 'retry' | 'correct' = 'prompt'): Promise<void> {
    const question = questions[index];
    if (!question) return;
    const token = beginSequence();
    phase = 'question';
    questionIndex = index;
    answerLocked = true;
    sourceLanded = false;
    landedBesideGridIndex = null;
    feedbackState = null;

    if (startAt !== 'prompt') {
      answerLocked = false;
      await tick();
      if (!isCurrentSequence(token)) return;
      const correct = getCorrectIndex(question.gridNotes, question.sourceNote);
      const wrong = correct === 0 ? 1 : 0;
      await handleGridNoteClick(startAt === 'correct' ? correct : wrong, true);
      return;
    }

    mark(question.id, 'prompt');
    await waitMs(260);
    if (!isCurrentSequence(token)) return;
    answerLocked = false;
    await questionNarration.start(() => say(question.prompt, token), () => { answerLocked = false; });
    if (!isCurrentSequence(token)) return;
    await playSourcePreview(question.sourceNote, token);
    if (!isCurrentSequence(token)) return;
    void runQuestionCycle(question, token);
  }

  async function runQuestionCycle(question: { sourceNote: string; gridNotes: readonly string[] }, token: number): Promise<void> {
    const cycle = [
      { toneNote: question.sourceNote, source: true },
      ...question.gridNotes.map((toneNote, gridIndex) => ({ toneNote, gridIndex })),
    ];

    while (
      isCurrentSequence(token) &&
      isPlaying &&
      (phase === 'first-choice' || phase === 'question') &&
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

  async function handleGridNoteClick(index: number, fromInspector = false): Promise<void> {
    if (answerLocked || (!isPlaying && !fromInspector)) return;
    const gridNotes =
      phase === 'first-choice' ? firstChoiceNotes : currentQuestion?.gridNotes;
    const sourceNote =
      phase === 'first-choice' ? introductorySourceNote : currentQuestion?.sourceNote;
    if (!gridNotes || !sourceNote) return;
    questionNarration.submit();
    const correctIndex = getCorrectIndex(gridNotes, sourceNote);

    if (index !== correctIndex) {
      mark(phase === 'first-choice' ? 'first-choice' : currentQuestion?.id ?? '', 'retry');
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
        await returnSourceToGrammy(token);
        if (!isCurrentSequence(token)) return;
      } else {
        sourceLanded = false;
        landedBesideGridIndex = null;
      }

      feedbackState = null;
      narrationText =
        answerPhase === 'first-choice' ? introductoryPrompt : answeredQuestion?.prompt ?? '';
      answerLocked = false;
      mark(answerPhase === 'first-choice' ? 'first-choice' : answeredQuestion?.id ?? '', 'prompt');
      questionNarration.wait();
      if (answerPhase === 'first-choice') {
        void runQuestionCycle(introductoryCycle, token);
      } else if (answerPhase === 'question' && answeredQuestion) {
        void runQuestionCycle(answeredQuestion, token);
      }
      return;
    }

    mark(phase === 'first-choice' ? 'first-choice' : currentQuestion?.id ?? '', 'correct');
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
      await finishLesson(token);
      return;
    }

    await startQuestion(answeredQuestionIndex + 1);
  }

  async function finishLesson(token: number): Promise<void> {
    phase = 'complete';
    mark('finish', 'bravo');
    await say('Bravo!', token);
    if (!isCurrentSequence(token)) return;
    inspector?.status('completed');
    onComplete?.();
  }

  function seekTo(cueId: string, actionId?: string): void {
    const cueEntry = cuePlan.find((item) => item.id === cueId);
    const selectedAction = actionId ?? cueEntry?.actions?.[0]?.id;
    if (!cueEntry || !selectedAction || !cueEntry.actions?.some((item) => item.id === selectedAction)) return;
    beginSequence();
    sequenceStarted = true;
    activeInspectorCue = null;
    demoSeekTarget = null;
    inspector?.resetFrom(cueId);
    if (cueId === 'demonstrate-match' || cueId === 'first-choice') {
      demoSeekTarget = `${cueId}/${selectedAction}`;
      void runIntroductoryDemonstration();
      return;
    }
    if (cueId === 'finish') {
      void finishLesson(beginSequence());
      return;
    }
    const index = questions.findIndex((question) => question.id === cueId);
    if (index >= 0) void startQuestion(index, selectedAction as 'prompt' | 'retry' | 'correct');
  }

  function handleAvatarReady(): void {
    avatarReady = true;
    unregisterInspector?.();
    unregisterInspector = inspector?.register(cuePlan, seekTo);
  }

  onDestroy(() => {
    unregisterInspector?.();
    sequenceToken += 1;
    questionNarration.submit();
    cancelWait(true);
    stopAllVoices();
    cancelLessonAvatarSpeech();
    if (audioContext && audioContext.state !== 'closed') void audioContext.close();
  });
  $: audioOutput.setVolume(volume);
</script>

<div
  class="match-scene"
  style={`--match-note-size:${overlayNoteSize}px;`}
>
  <div class="match-support">
    <div class="mlt-lesson-avatar-anchor mlt-lesson-avatar-centered">
    <LessonAvatarDock
      character="grammy"
      speechText={narrationText}
      animateEntrance={!avatarAlreadyPositioned}
      {underlinedWords}
      on:ready={handleAvatarReady}
    />

    {#if visibleSourceNote && phase !== 'complete'}
      {@const sourceRow = pitchRows[getRowIndex(visibleSourceNote)]}
      <div class="source-note-wrap" class:is-hidden={sourceLanded || !!sourceFlightNote} aria-hidden={sourceLanded || !!sourceFlightNote} aria-label="Note to match">
        <span
          bind:this={sourceNoteEl}
          class={`mlt-lesson-note match-note match-note--source ${sourceNoteActive ? 'is-active' : ''}`}
          use:lessonNoteAppearance={{ cellWidth: cellSize, audioOutput, frequency: sourceRow?.frequency, active: sourceNoteActive }}
          style:color={sourceRow?.hex ?? '#6a5140'}
        ></span>
      </div>
    {/if}
    </div>
  </div>

  <section
    class={`match-workspace ${feedbackState ? `is-${feedbackState}` : ''}`}
    aria-label={section.label}
  >
    <div
      class="mlt-lesson-grid-frame pitch-grid-frame"
        bind:clientWidth={frameWidth}
        bind:clientHeight={frameHeight}
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
              {...lessonGridAppearance}
              showColumnGrid={false}
            />

            <div class="match-note-layer">
              {#each visibleGridNotes as toneNote, index (`${toneNote}-${index}`)}
                {@const row = pitchRows[getRowIndex(toneNote)]}
                <button
                  class={`mlt-lesson-note match-note match-note--grid ${activeGridNoteIndex === index ? 'is-active' : ''}`}
                  use:lessonNoteAppearance={{ cellWidth: cellSize, audioOutput, frequency: row?.frequency, active: activeGridNoteIndex === index }}
                  type="button"
                  style:top={`${rowCenter(toneNote)}%`}
                  style:left={`${getGridNoteLeft(index, visibleGridNotes.length)}%`}
                  style:color={row?.hex ?? '#6a5140'}
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
                  class={`mlt-lesson-note match-note match-note--landed-source ${sourceNoteActive ? 'is-active' : ''}`}
                  use:lessonNoteAppearance={{ cellWidth: cellSize, audioOutput, frequency: sourceRow?.frequency, active: sourceNoteActive }}
                  style:top={`${rowCenter(landingToneNote)}%`}
                  style:left={`${getLandedSourceLeft(landedBesideGridIndex, visibleGridNotes.length)}%`}
                  style:color={sourceRow?.hex ?? '#6a5140'}
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
    class={`mlt-lesson-note match-note match-note--flight ${sourceFlightNote.landed ? 'is-landed' : ''}`}
    use:lessonNoteAppearance={{ cellWidth: cellSize, audioOutput, frequency: undefined }}
    class:is-paused={!isPlaying}
    style:--match-note-size={`${overlayNoteSize}px`}
    style:--flight-start-x={`${sourceFlightNote.startX}px`}
    style:--flight-start-y={`${sourceFlightNote.startY}px`}
    style:--flight-end-x={`${sourceFlightNote.endX}px`}
    style:--flight-end-y={`${sourceFlightNote.endY}px`}
    style:color={sourceFlightNote.color}
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
    position: absolute;
    top: calc(100% + 0.85rem);
    left: 50%;
    transform: translateX(-50%);
    min-height: 4rem;
    display: grid;
    place-items: center;
  }

  .match-workspace {
    min-width: 0;
    min-height: 0;
    width: 100%;
    max-width: 100%;
    justify-self: start;
    align-self: start;
    padding: 0;
    transition:
      border-color 0.16s ease,
      box-shadow 0.16s ease;
  }


  .match-workspace.is-success .pitch-grid-field {
    border-color: rgba(66, 151, 94, 0.28);
    box-shadow: var(--amt-shadow), 0 0 0 1px rgba(66, 151, 94, 0.14);
  }

  .match-workspace.is-error .pitch-grid-field {
    border-color: rgba(201, 90, 77, 0.26);
    box-shadow: var(--amt-shadow), 0 0 0 1px rgba(201, 90, 77, 0.14);
  }

  .pitch-grid-frame {
    width: 100%;
    height: calc(clamp(36rem, calc(100svh - 10rem), 54rem) + 2rem);
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
    border: 0;
    outline: 1px solid rgba(102, 75, 40, 0.18);
    outline-offset: -1px;
    box-shadow: var(--amt-shadow);
    transition: border-color 0.18s ease, box-shadow 0.18s ease;
    background:
      radial-gradient(580px 260px at 100% 8%, rgba(78, 176, 226, 0.06), transparent 62%),
      radial-gradient(620px 260px at 0% 100%, rgba(202, 187, 102, 0.06), transparent 64%),
      linear-gradient(145deg, rgba(255, 255, 255, 0.84), rgba(248, 241, 229, 0.86));
  }

  .match-note-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 3;
  }

  .match-note {
    width: var(--match-note-size);
    height: var(--match-note-size);
    display: block;


    transition:
      background-color 0.12s ease,
      box-shadow 0.12s ease,
      transform 0.12s ease;
  }

  .source-note-wrap.is-hidden {
    visibility: hidden;
  }

  .match-note--source {
    position: relative;
  }


  .match-note--grid {
    position: absolute;
    padding: 0;
    appearance: none;
    transform: translate(-50%, -50%);
    pointer-events: auto;
    cursor: pointer;
  }



  .match-note--grid:disabled {
    cursor: default;
    opacity: 1;
  }

  .match-note--landed-source {
    position: absolute;
    transform: translate(-50%, -50%);
  }


  .match-note--flight {
    position: fixed;
    z-index: 60;
    pointer-events: none;
    transform: translate(-50%, -50%);
    left: var(--flight-start-x);
    top: var(--flight-start-y);
  }

  .match-note--flight.is-landed {
    animation: note-flight 0.6s cubic-bezier(0.2, 0.72, 0.2, 1) forwards;
  }

  .match-note--flight.is-paused { animation-play-state: paused; }

  @keyframes note-flight {
    from { left: var(--flight-start-x); top: var(--flight-start-y); }
    to { left: var(--flight-end-x); top: var(--flight-end-y); }
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
    .match-scene {
      gap: 0.7rem;
    }

    .match-support {
      width: 100%;
      gap: 0.6rem;
    }

    .match-workspace {
      width: 100%;
      justify-self: stretch;
      padding: 0;
    }

    .pitch-grid-frame {
      width: 100%;
      height: calc(clamp(22rem, 66svh, 34rem) + 1.3rem);
    }

    .match-note--grid::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 2.75rem;
      height: 2.75rem;
      transform: translate(-50%, -50%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .match-note--flight.is-landed { animation-duration: 1ms; }
    .match-note,
    .match-note--flight {
      transition: none;
    }
  }
</style>
