<script lang="ts">
  import { createLessonQuestion } from '@mlt/lesson-kit';
  const questionNarration = createLessonQuestion(cancelLessonAvatarSpeech, setLessonAvatarThinking);
  import "@mlt/lesson-kit/styles.css";
  import { lessonNoteAppearance } from '@mlt/lesson-kit';
  import { lessonGridAppearance, calculateLessonGridLayout, createLessonAudioOutput, createLessonClock, lessonScreenSlide, lessonScreenSlideMs } from '@mlt/lesson-kit';
  import { fullRowData } from '@mlt/pitch-data';
  import { PitchGrid } from '@mlt/ui-components/canvas';
  import type {
    PitchGridViewport,
    SingingModeConfig,
  } from '@mlt/ui-components/canvas';
  import { getContext, onDestroy, tick } from 'svelte';
  import { lessonInspectorKey, type LessonInspector, type LessonEventKind } from './lessonInspector.svelte';
  import {
    linesSpacesCues, getLinesSpacesCue, getLinesSpacesCheckpoint, nextLinesSpacesActionIndex,
    linesSpacesInspectorCues, getLinesSpacesInspectorActionId,
    cueNarration, quizRetry, linesSpacesQuizIntroduction, type LinesSpacesCueId,
    lineToneSpecs, spaceToneSpecs, quizToneSpecs, dragToneSpecs, spaceDragToneSpecs,
  } from './linesSpacesCues';
  import LessonAvatarDock from './LessonAvatarDock.svelte';
  import { setLessonAvatarThinking, cancelLessonAvatarSpeech, speakWithLessonAvatar } from './lessonAvatar';
  import type { LessonSection } from './lessons';
  import { lesson11PitchRange } from './lesson11PitchData';

  const audioOutput = createLessonAudioOutput();

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

  const inspector = getContext<LessonInspector | undefined>(lessonInspectorKey);
  const clock = createLessonClock();
  let currentCueId: LinesSpacesCueId = 'introduce-pitch';
  let showBeatLines = $state(true);
  let unregisterInspector: (() => void) | undefined;

  function report(kind: LessonEventKind, detail: string): void {
    if (inspector?.sectionCode === section.code) inspector.record(kind, detail, currentCueId);
  }

  function enterCue(id: LinesSpacesCueId): void {
    currentCueId = id;
    inspector?.enter(id);
    report('visual', getLinesSpacesCue(id).visual);
  }

  const pitchRows = fullRowData;
  const rowIndexByTone = new Map(pitchRows.map((row, index) => [row.toneNote, index]));
  const viewportStartRow = rowIndexByTone.get(lesson11PitchRange.high) ?? 0;
  const viewportEndRow = rowIndexByTone.get(lesson11PitchRange.low) ?? pitchRows.length - 1;
  const viewportRowCount = Math.max(1, viewportEndRow - viewportStartRow + 1);
  const pitchGridFallbackColumnSize = 18;
  const pitchGridMusicalColumnCount = 32;
  const pitchGridSingingConfig: SingingModeConfig = { pitchHistory: [] };
  const quizQuestion = getLinesSpacesCue('identify-line-space').prompt;

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
  const initialSpaceDragNotes = buildDisplayNotes('space-drag', spaceDragToneSpecs, 'even').map(
    (note): DraggableNote => ({
      id: note.id,
      rowIndex: note.rowIndex,
      leftPercent: note.leftPercent,
    }),
  );
  const glowingSpaceRows = spaceNotes.map((note) => note.rowIndex);

  let frameWidth = $state(0);
  let frameHeight = $state(0);
  let viewportWidth = $state(0);
  let viewportHeight = $state(0);
  let avatarReady = $state(false);
  let sequenceStarted = $state(false);
  let narrationText = $state('');
  let upperNarrationText = $state('');
  let animateSpeechPromotion = $state(false);
  let stage = $state<LessonStage>('demonstration');
  let demoGroup = $state<DemoGroup>(null);
  let visibleDemoNoteCount = $state(0);
  let activeDemoNoteId = $state<string | null>(null);
  let linesGlowing = $state(false);
  let gridVisible = $state(false);
  let gridGlowing = $state(false);
  let spacesGlowing = $state(false);
  let quizNoteIndex = $state(0);
  let quizReview = $state(false);
  let visibleQuizNoteCount = $state(0);
  let quizEntryIndex = $state<number | null>(null);
  let quizExiting = $state(false);
  let dragExiting = $state(false);
  let dragEntering = $state(false);
  let quizAnimationKey = $state(0);
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
  let resolveInput: ((completed: boolean) => void) | null = null;
  let lastActionSkipSignal = $state(0);
  let skipSignalReady = $state(false);
  let audioContext: AudioContext | null = null;
  let activeOscillator: OscillatorNode | null = null;
  let activeGain: GainNode | null = null;

  const layoutMusicalColumnCount = $derived(
    frameWidth > 0 && frameWidth <= 760 ? 22 : pitchGridMusicalColumnCount,
  );
  const gridLayout = $derived(calculateLessonGridLayout({
    width: frameWidth, height: frameHeight,
    columns: layoutMusicalColumnCount, rows: viewportRowCount,
    fallbackCellSize: pitchGridFallbackColumnSize,
  }));
  const shellWidth = $derived(gridLayout.width);
  const shellHeight = $derived(gridLayout.height);
  const cellWidth = $derived(gridLayout.cellWidth);
  const cellHeight = $derived(gridLayout.cellHeight);
  const noteSize = $derived(gridLayout.noteDiameter);
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
  const visibleQuizNotes = $derived(quizNotes.slice(0, visibleQuizNoteCount));
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

  async function waitMs(durationMs: number, token: number): Promise<boolean> {
    if (!isCurrentSequence(token)) return false;
    clock.setPaused(!isPlaying);
    return await clock.wait(durationMs) && isCurrentSequence(token);
  }

  async function waitForPlayback(token: number): Promise<boolean> {
    return waitMs(0, token);
  }

  async function say(
    text: string,
    token: number,
    speechOptions: { preSpeakWaveMs?: number; rate?: number } = {},
    isOpen: () => boolean = () => true,
  ): Promise<void> {
    narrationText = text;
    if (!avatarReady || !(await waitForPlayback(token)) || !isOpen()) return;
    try {
      await speakWithLessonAvatar(text, {
        lang: 'en-CA',
        rate: speechOptions.rate ?? cueNarration.rate,
        chunking: 'sentence',
        preSpeakWaveMs: speechOptions.preSpeakWaveMs ?? cueNarration.preSpeakWaveMs,
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
    if (activeGain) audioOutput.release(activeGain, 0.035);
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
      if (isCurrentSequence(token)) report('error', 'Audio unavailable; retaining the planned delay.');
      await waitMs(durationMs, token);
      return;
    }

    stopTone();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const durationSeconds = Math.max(0.08, durationMs / 1000);
    const peak = 0.055;

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.018);
    gain.gain.setValueAtTime(peak, now + Math.max(0.03, durationSeconds - 0.045));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);
    oscillator.connect(gain);
    audioOutput.connect(gain, context, volume, { frequency, start: now, attackEnd: now + 0.018, releaseStart: now + Math.max(0.03, durationSeconds - 0.045), end: now + durationSeconds, peak });
    oscillator.start(now);
    report('audio', `Tone started: ${frequency.toFixed(2)} Hz, ${durationMs} ms`);
    oscillator.stop(now + durationSeconds + 0.02);
    activeOscillator = oscillator;
    activeGain = gain;
    oscillator.onended = () => {
      try {
        oscillator.disconnect();
        audioOutput.forget(gain);
        gain.disconnect();
      } catch {}
      if (activeOscillator === oscillator) {
        activeOscillator = null;
        activeGain = null;
      }
    };

    if (await waitMs(durationMs, token)) report('audio', 'Tone duration finished');
  }

  function prepareCue(cueId: LinesSpacesCueId, actionId?: string): void {
    const position = getLinesSpacesCheckpoint(cueId, actionId);
    if (!position) return;
    const { cue, action } = position;
    enterCue(cue.id);
    inspector?.action(getLinesSpacesInspectorActionId(cue.id, action.id)!);
    narrationText = action.id === 'lead-in' ? '' : position.openingNarration;
    upperNarrationText = position.upperNarration;
    animateSpeechPromotion = false;
    gridVisible = true;
    linesGlowing = action.kind === 'show-lines';
    gridGlowing = action.kind === 'glow-grid';
    spacesGlowing = action.kind === 'glow-spaces';
    visibleDemoNoteCount = position.visibleDemoNoteCount;
    visibleQuizNoteCount = position.visibleQuizNoteCount;
    quizEntryIndex = cue.id === 'identify-line-space' && action.kind === 'quiz-input' ? position.quizIndex : null;
    quizExiting = false;
    dragExiting = false;
    dragEntering = position.slideDragIn;
    activeDemoNoteId = null;
    activeDragNoteId = null;
    answersVisible = false;
    answerLocked = true;
    dragLocked = true;
    draggableNotes = [];
    demoGroup = null;

    if (position.clearCanvas) {
      clearCanvasForSuccess(position.keepGridVisible);
    } else if (cue.id === 'identify-line-space') {
      stage = 'quiz';
      quizNoteIndex = position.quizIndex;
      quizReview = position.quizReview;
      answersVisible = !quizReview && action.kind !== 'speech';
      if (quizReview) narrationText = '';
    } else if (cue.id === 'drag-to-line' || cue.id === 'drag-to-space') {
      stage = 'drag';
      dragTarget = cue.id === 'drag-to-line' ? 'line' : 'space';
      const startingNotes = dragTarget === 'space' ? initialSpaceDragNotes : initialDragNotes;
      draggableNotes = startingNotes.map((note) => ({
        ...note,
        rowIndex: position.settledDrag
          ? findClosestTargetRow(note.rowIndex, dragTarget)
          : note.rowIndex,
      }));
      if (action.kind === 'drag-gap' && action.index !== undefined) activeDragNoteId = draggableNotes[action.index]?.id ?? null;
    } else {
      stage = 'demonstration';
      demoGroup = cue.id === 'demonstrate-lines' ? 'lines' : cue.id === 'demonstrate-spaces' ? 'spaces' : null;
      const notes = demoGroup === 'lines' ? lineNotes : spaceNotes;
      if (action.kind === 'demo-gap' && action.index !== undefined) activeDemoNoteId = notes[action.index]?.id ?? null;
    }
  }

  function waitForInput(): Promise<boolean> {
    inspector?.status('waiting');
    return new Promise((resolve) => { resolveInput = resolve; });
  }

  function clearCanvasForSuccess(keepGridVisible = false): void {
    upperNarrationText = ''; animateSpeechPromotion = false;
    stopDragPitchPreview();
    stage = 'complete';
    gridVisible = keepGridVisible;
    gridGlowing = false;
    linesGlowing = false;
    spacesGlowing = false;
    draggableNotes = [];
    visibleDemoNoteCount = 0;
    activeDemoNoteId = null;
    activeDragNoteId = null;
    quizNoteIndex = -1;
    quizReview = false;
    visibleQuizNoteCount = 0;
    quizEntryIndex = null;
    quizExiting = false;
    answersVisible = false;
    answerLocked = true;
    dragLocked = true;
    draggingNoteId = null;
  }

  async function runLessonSequence(start: LinesSpacesCueId = 'introduce-pitch', actionId?: string): Promise<void> {
    const checkpoint = getLinesSpacesCheckpoint(start, actionId);
    if (!checkpoint) return;
    const token = cancelCurrentSequence();
    sequenceStarted = true;
    inspector?.resetFrom(start);
    const startCueIndex = linesSpacesCues.findIndex((cue) => cue.id === start);

    try {
      for (let cueIndex = startCueIndex; cueIndex < linesSpacesCues.length; cueIndex += 1) {
        const cue = linesSpacesCues[cueIndex];
        const firstActionIndex = cueIndex === startCueIndex ? checkpoint.actionIndex : 0;
        prepareCue(cue.id, cue.actions[firstActionIndex].id);
        let overlappingSpeech: Promise<void> = Promise.resolve();
        for (let index = firstActionIndex; index < cue.actions.length; index = nextLinesSpacesActionIndex(cue.actions, index)) {
          const action = cue.actions[index];
          if (!(await waitForPlayback(token))) return;
          showBeatLines = cue.id === 'introduce-pitch'
            && getLinesSpacesInspectorActionId(cue.id, action.id) === 'show-grid';
          inspector?.action(getLinesSpacesInspectorActionId(cue.id, action.id)!);
          inspector?.status('running');
          switch (action.kind) {
            case 'show-grid':
              gridVisible = true;
              if (!(await waitMs(action.durationMs ?? 0, token))) return;
              break;
            case 'glow-grid':
              gridGlowing = true;
              if (!(await waitMs(action.durationMs ?? 0, token))) return;
              break;
            case 'glow-spaces':
              spacesGlowing = true;
              if (!(await waitMs(action.durationMs ?? 0, token))) return;
              break;
            case 'show-lines':
              linesGlowing = true;
              if (!(await waitMs(action.durationMs ?? 0, token))) return;
              break;
            case 'hide-lines':
              linesGlowing = false;
              gridGlowing = false;
              spacesGlowing = false;
              if (!(await waitMs(action.durationMs ?? 0, token))) return;
              break;
            case 'speech':
              await say(action.prompt ?? cue.prompt, token);
              break;
            case 'parallel-speech':
              overlappingSpeech = say(cue.prompt, token);
              break;
            case 'join-speech':
              activeDemoNoteId = null;
              await overlappingSpeech;
              break;
            case 'demo-note': {
              const notes = demoGroup === 'lines' ? lineNotes : spaceNotes;
              const note = notes[action.index ?? 0];
              visibleDemoNoteCount = (action.index ?? 0) + 1;
              activeDemoNoteId = note.id;
              report('visual', `Reveal ${note.toneNote}`);
              await playPitch(note.frequency, action.durationMs ?? 0, token);
              break;
            }
            case 'quiz-input': {
              if (action.index === 0) {
                animateSpeechPromotion = narrationText === linesSpacesQuizIntroduction;
                upperNarrationText = linesSpacesQuizIntroduction;
              }
              quizReview = false;
              quizNoteIndex = action.index ?? 0;
              if (quizNoteIndex >= visibleQuizNoteCount) {
                quizEntryIndex = quizNoteIndex;
                visibleQuizNoteCount = quizNoteIndex + 1;
              }
              narrationText = quizQuestion;
              answersVisible = true;
              const response = waitForInput();
              // Mount the new note before measuring its entrance. A quick
              // answer can interrupt speech, but still lets the note arrive.
              await tick();
              if (!isCurrentSequence(token)) return;
              const entrance = quizEntryIndex === quizNoteIndex
                ? waitMs(lessonScreenSlideMs, token).then((completed) => {
                    if (completed) quizEntryIndex = null;
                    return completed;
                  })
                : Promise.resolve(true);
              void questionNarration.start(isOpen => say(quizQuestion, token, {}, isOpen), () => { answerLocked = false; });
              report('input', `Waiting: ${quizNotes[quizNoteIndex].toneNote}; expected ${getQuizAnswer(quizNotes[quizNoteIndex])}`);
              if (!(await response) || !isCurrentSequence(token)) return;
              if (!(await entrance)) return;
              break;
            }
            case 'quiz-retry':
              await say(quizRetry.prompt, token, quizRetry);
              break;
            case 'quiz-tone': {
              quizNoteIndex = action.index ?? 0;
              answersVisible = true;
              answerLocked = true;
              const note = quizNotes[quizNoteIndex];
              await playPitch(note.frequency, action.durationMs ?? 0, token);
              break;
            }
            case 'quiz-next':
              if (!(await waitMs(action.durationMs ?? 0, token))) return;
              break;
            case 'quiz-playback-note':
            case 'quiz-playback-gap': {
              upperNarrationText = ''; animateSpeechPromotion = false;
              quizReview = true;
              answersVisible = false;
              answerLocked = true;
              narrationText = '';
              if (action.leadInMs) {
                quizNoteIndex = -1;
                if (!(await waitMs(action.leadInMs, token))) return;
              }
              quizNoteIndex = action.index ?? 0;
              if (action.kind === 'quiz-playback-note') {
                await playPitch(quizNotes[quizNoteIndex].frequency, action.durationMs ?? 0, token);
              } else if (!(await waitMs(action.durationMs ?? 0, token))) return;
              break;
            }
            case 'quiz-exit':
              quizReview = true;
              quizNoteIndex = -1;
              answersVisible = false;
              answerLocked = true;
              narrationText = '';
              quizEntryIndex = null;
              quizExiting = true;
              await tick();
              if (!(await waitMs(action.durationMs ?? lessonScreenSlideMs, token))) return;
              visibleQuizNoteCount = 0;
              quizExiting = false;
              break;
            case 'drag-input': {
              const response = waitForInput();
              dragLocked = false;
              report('input', `Waiting for all ${draggableNotes.length} notes on ${dragTarget}s`);
              if (action.prompt) void questionNarration.start(
                isOpen => say(action.prompt!, token, {}, isOpen), () => { dragLocked = false; },
              );
              else questionNarration.wait();
              if (!(await response) || !isCurrentSequence(token)) return;
              break;
            }
            case 'drag-note': {
              const note = draggableNotes[action.index ?? 0];
              activeDragNoteId = note.id;
              const row = pitchRows[note.rowIndex];
              await playPitch(row.frequency, action.durationMs ?? 0, token);
              break;
            }
            case 'drag-exit':
              dragLocked = true;
              activeDragNoteId = null;
              narrationText = '';
              dragExiting = true;
              await tick();
              if (!(await waitMs(action.durationMs ?? lessonScreenSlideMs, token))) return;
              draggableNotes = [];
              dragExiting = false;
              break;
            case 'success':
              clearCanvasForSuccess(true);
              report('visual', 'Clear notes and keep the pitchGrid visible for success narration');
              await say(action.prompt ?? cue.prompt, token);
              if (!(await waitMs(action.durationMs ?? 0, token))) return;
              break;
            case 'end':
              narrationText = '';
              if (!(await waitMs(action.durationMs ?? 0, token))) return;
              inspector?.status('completed');
              onComplete?.();
              return;
            default:
              if (action.id === 'settle') {
                activeDemoNoteId = null;
                activeDragNoteId = null;
                if (stage === 'quiz') quizNoteIndex = -1;
              }
              if (!(await waitMs(action.durationMs ?? 0, token))) return;
          }
          if (!isCurrentSequence(token)) return;
        }
        inspector?.status('completed');
      }
    } catch (error) {
      if (isCurrentSequence(token)) {
        report('error', String(error));
        inspector?.status('failed');
      }
    }
  }

  function getRowAnswer(rowIndex: number): QuizAnswer {
    return pitchRows[rowIndex]?.column === 'A' ? 'line' : 'space';
  }

  function getQuizAnswer(note: DisplayNote): QuizAnswer {
    return getRowAnswer(note.rowIndex);
  }

  function allDraggableNotesMatch(target: DragTarget): boolean {
    const startingNotes = target === 'space' ? initialSpaceDragNotes : initialDragNotes;
    return draggableNotes.length === startingNotes.length
      && draggableNotes.every((note) => getRowAnswer(note.rowIndex) === target);
  }

  function handleDragTargetSuccess(token: number): void {
    if (!isCurrentSequence(token) || dragLocked || !allDraggableNotesMatch(dragTarget)) return;
    questionNarration.submit();
    dragLocked = true;
    draggingNoteId = null;
    report('input', `All notes match: ${dragTarget}`);
    const resolve = resolveInput;
    resolveInput = null;
    resolve?.(true);
  }

  async function answerQuiz(answer: QuizAnswer): Promise<void> {
    const note = currentQuizNote;
    if (!note || answerLocked || !isPlaying || stage !== 'quiz') return;
    questionNarration.submit();
    const token = sequenceToken;
    answerLocked = true;
    report('input', `${note.toneNote}: chose ${answer}; expected ${getQuizAnswer(note)}`);
    if (answer !== getQuizAnswer(note)) {
      inspector?.action(`retry-${quizNoteIndex}`);
      inspector?.status('running');
      await say(quizRetry.prompt, token, quizRetry);
      if (!isCurrentSequence(token)) return;
      narrationText = quizQuestion;
      answerLocked = false;
      questionNarration.wait();
      inspector?.action(`question-${quizNoteIndex}`);
      inspector?.status('waiting');
      return;
    }
    const resolve = resolveInput;
    resolveInput = null;
    resolve?.(true);
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
      audioOutput.retune(activeGain, row.frequency);
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
    const peak = 0.055;

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(row.frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.025);
    oscillator.connect(gain);
    audioOutput.connect(gain, context, volume, { frequency: row.frequency, start: now, attackEnd: now + 0.025, peak });
    oscillator.start(now);
    oscillator.onended = () => {
      try {
        oscillator.disconnect();
        audioOutput.forget(gain);
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
    questionNarration.submit();
    updateDraggedNote(noteId, event.clientY);
    const target = event.currentTarget as HTMLButtonElement;
    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
    stopDragPitchPreview();
    const droppedNote = draggableNotes.find((note) => note.id === noteId);
    if (droppedNote) report('input', `Dropped ${noteId} on ${pitchRows[droppedNote.rowIndex]?.toneNote}: ${getRowAnswer(droppedNote.rowIndex)}; target ${dragTarget}`);
    draggingNoteId = null;
    dragPointerId = null;
    void handleDragTargetSuccess(sequenceToken);
    if (!dragLocked) questionNarration.wait();
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
    if (sequenceStarted && inspector?.sectionCode === section.code) inspector.status('cancelled');
    sequenceToken += 1;
    quizAnimationKey += 1;
    dragExiting = false;
    dragEntering = false;
    quizEntryIndex = null;
    quizExiting = false;
    questionNarration.submit();
    clock.cancel();
    resolveInput?.(false);
    resolveInput = null;
    cancelLessonAvatarSpeech();
    stopDragPitchPreview();
    draggingNoteId = null;
    dragPointerId = null;
    activeDragNoteId = null;
    return sequenceToken;
  }

  async function skipCurrentAction(): Promise<void> {
    const next = linesSpacesCues[linesSpacesCues.findIndex((cue) => cue.id === currentCueId) + 1];
    if (next) await runLessonSequence(next.id);
  }

  function handleAvatarReady(): void {
    avatarReady = true;
    unregisterInspector = inspector?.register(linesSpacesInspectorCues, (id, actionId) => {
      void runLessonSequence(id as LinesSpacesCueId, actionId);
    });
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
    clock.setPaused(!isPlaying);
    if (!audioContext || audioContext.state === 'closed') return;
    if (isPlaying && audioContext.state === 'suspended') {
      void audioContext.resume().catch(() => {});
    } else if (!isPlaying && audioContext.state === 'running') {
      void audioContext.suspend().catch(() => {});
    }
  });

  onDestroy(() => {
    cancelCurrentSequence();
    unregisterInspector?.();
    if (audioContext && audioContext.state !== 'closed') {
      void audioContext.close();
    }
  });
  $effect(() => audioOutput.setVolume(volume));
</script>

<div
  class="lines-spaces-scene"
  style={`--lesson-note-size:${noteSize}px; --lesson-note-width:${cellWidth * 2}px;`}
>
  <div class="lines-spaces-support">
    <div class="avatar-answer-anchor">
    <LessonAvatarDock
      character="grammy"
      speechText={narrationText}
      upperSpeechText={upperNarrationText}
      {animateSpeechPromotion}
      paused={!isPlaying}
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
          Line
        </button>
        <button
          type="button"
          disabled={answerLocked || !isPlaying}
          onclick={() => void answerQuiz('space')}
        >
          Space
        </button>
      </div>
    {/if}
    </div>
  </div>

  <section class="lines-spaces-workspace" aria-label={`${section.code} ${section.label}`}>
    <div
      class="mlt-lesson-grid-frame pitch-grid-frame"
      bind:clientWidth={frameWidth}
      bind:clientHeight={frameHeight}
    >
      <div
        class="pitch-grid-shell"
        style={`width:${shellWidth}px; height:${shellHeight}px;`}
      >
        <div
          class="pitch-grid-field"
          class:grid-hidden={!gridVisible}
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
              {...lessonGridAppearance}
              showColumnGrid={showBeatLines}
            />

            <div class="pitch-grid-overlay" bind:this={dragFieldElement}>
              {#if gridGlowing}
                <div class="whole-grid-glow" aria-hidden="true"></div>
              {/if}
              {#if spacesGlowing}
                <div class="line-glow-layer" aria-hidden="true">
                  {#each glowingSpaceRows as rowIndex}
                    <span class="space-glow" style={`top:${rowCenter(rowIndex)}%; height:${cellHeight / 2}px;`}></span>
                  {/each}
                </div>
              {/if}
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
                    class={`mlt-lesson-note lesson-note ${activeDemoNoteId === note.id ? 'is-active' : ''}`}
                    use:lessonNoteAppearance={{ audioOutput, cellWidth, frequency: pitchRows[note.rowIndex]?.frequency, active: activeDemoNoteId === note.id }}
                    style:top={`${rowCenter(note.rowIndex)}%`}
                    style:left={`${note.leftPercent}%`}
                    style:color={note.color}
                    aria-hidden="true"
                  ></span>
                {/each}
              {:else if stage === 'quiz'}
                <div class="quiz-note-group"
                  use:lessonScreenSlide={{ direction: quizExiting ? 'exit-right' : null, paused: !isPlaying, replayKey: quizAnimationKey }}>
                  {#each visibleQuizNotes as note, index (note.id)}
                    <span
                      class={`mlt-lesson-note lesson-note quiz-note ${index === quizNoteIndex ? (quizReview ? 'is-active' : 'is-current') : ''}`}
                      use:lessonNoteAppearance={{ audioOutput, cellWidth, frequency: pitchRows[note.rowIndex]?.frequency, active: index === quizNoteIndex }}
                      use:lessonScreenSlide={{ direction: index === quizEntryIndex ? 'enter-left' : null, paused: !isPlaying, replayKey: quizAnimationKey }}
                      style:top={`${rowCenter(note.rowIndex)}%`}
                      style:left={`${note.leftPercent}%`}
                      style:color={note.color}
                      aria-hidden="true"
                    ></span>
                  {/each}
                </div>

                {#if currentQuizNote && !quizReview && quizEntryIndex !== quizNoteIndex}
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
                <div class="drag-note-group"
                  use:lessonScreenSlide={{ direction: dragExiting ? 'exit-right' : dragEntering ? 'enter-left' : null, paused: !isPlaying, replayKey: quizAnimationKey }}>
                {#each draggableNotes as note, index (note.id)}
                  <button
                    type="button"
                    class={`mlt-lesson-note lesson-note draggable-note ${activeDragNoteId === note.id || draggingNoteId === note.id ? 'is-active' : ''} ${draggingNoteId === note.id ? 'is-dragging' : ''}`}
                    use:lessonNoteAppearance={{ audioOutput, cellWidth, frequency: pitchRows[note.rowIndex]?.frequency, active: activeDragNoteId === note.id || draggingNoteId === note.id }}
                    style:top={`${rowCenter(note.rowIndex)}%`}
                    style:left={`${note.leftPercent}%`}
                    style:color={pitchRows[note.rowIndex]?.hex ?? '#6a5140'}
                    aria-label={`Note ${index + 1}: drag up or down`}
                    disabled={dragLocked || !isPlaying}
                    onpointerdown={(event) => handleDragPointerDown(event, note.id)}
                    onpointermove={(event) => handleDragPointerMove(event, note.id)}
                    onpointerup={(event) => handleDragPointerUp(event, note.id)}
                    onpointercancel={(event) => handleDragPointerCancel(event, note.id)}
                  ></button>
                {/each}
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </section>
</div>

<style>
  /* Clip at the screen edge rather than the grid edge, keeping the shared
     rightward exit from expanding the page's horizontal scroll area. */
  :global(html:has(.quiz-note-group, .drag-note-group)) {
    overflow-x: clip;
  }

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

  .avatar-answer-anchor {
    position: relative;
    width: min(18rem, 100%);
  }

  .lines-spaces-workspace {
    width: 100%;
    min-width: 0;
    min-height: 0;
    display: grid;
    align-content: start;
    padding: 0;
  }

  .pitch-grid-frame {
    width: 100%;
    height: calc(clamp(34rem, calc(100svh - 10rem), 52rem) + 2rem);
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
    border: 0;
    outline: 1px solid rgba(102, 75, 40, 0.18);
    outline-offset: -1px;
    box-shadow: var(--amt-shadow);
    transition: border-color 0.18s ease, box-shadow 0.18s ease;
    border-radius: 22px;
    background:
      radial-gradient(580px 260px at 100% 8%, rgba(78, 176, 226, 0.06), transparent 62%),
      radial-gradient(620px 260px at 0% 100%, rgba(202, 187, 102, 0.06), transparent 64%),
      linear-gradient(145deg, rgba(255, 255, 255, 0.84), rgba(248, 241, 229, 0.86));
  }

  .pitch-grid-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 2;
  }

  .quiz-note-group, .drag-note-group {
    position: absolute;
    inset: 0;
  }

  .grid-hidden { visibility: hidden; }
  .whole-grid-glow {
    position: absolute;
    inset: 0;
    background: rgba(255, 213, 74, 0.22);
    box-shadow: inset 0 0 28px rgba(255, 194, 52, 0.85);
    border-radius: 22px;
  }
  .space-glow {
    position: absolute;
    left: 0;
    right: 0;
    transform: translateY(-50%);
    background: rgba(255, 213, 74, 0.35);
    box-shadow: inset 0 0 8px rgba(255, 194, 52, 0.65);
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
    width: var(--lesson-note-width);
    height: var(--lesson-note-size);

    transform: translate(-50%, -50%);
    transition:
      filter 0.14s ease,
      box-shadow 0.14s ease,
      transform 0.14s ease;
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
    transform: translate(-50%, -50%);
    transition: none;
    z-index: 3;
  }

  .quiz-pointer {
    --pointer-head-height: 0.82rem;
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
    bottom: calc(var(--pointer-head-height) - 2px);
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
    border-top: var(--pointer-head-height) solid #c95a4d;
    transform: translateX(-50%);
  }

  .quiz-answers {
    position: absolute;
    top: calc(100% + 0.9rem);
    left: 50%;
    transform: translateX(-50%);
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


  @media (max-width: 980px) {
    .lines-spaces-scene {
      grid-template-columns: 1fr;
    }

    .lines-spaces-support {
      display: grid;
      grid-template-columns: minmax(0, 18rem) minmax(0, 1fr);
      align-items: start;
      min-height: auto;
      padding-bottom: 4.5rem;
    }
  }

  @media (max-width: 760px) {
    .avatar-answer-anchor {
      width: 100%;
    }

    .lines-spaces-scene {
      gap: 0.7rem;
    }

    .lines-spaces-support {
      grid-template-columns: 1fr;
      width: 100%;
      gap: 0.65rem;
    }

    .lines-spaces-workspace {
      width: 100%;
      padding: 0;
    }

    .pitch-grid-frame {
      height: calc(clamp(22rem, 66svh, 34rem) + 1.3rem);
    }

    .draggable-note::after {
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
    .line-glow,
    .quiz-note.is-current,
  
  
    .lesson-note {
      transition: none;
    }
  }
</style>
