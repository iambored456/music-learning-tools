<script lang="ts">
  import { createLessonPianoVoice, createLessonQuestion, lessonOutsidePlacement } from '@mlt/lesson-kit';
  const questionNarration = createLessonQuestion(cancelLessonAvatarSpeech, setLessonAvatarThinking);
  import "@mlt/lesson-kit/styles.css";
  import { lessonNoteAppearance, calculateLessonNoteLabelSize, lessonPacing, completeLessonExercise } from '@mlt/lesson-kit';
  import { lessonGridAppearance, calculateLessonGridLayout, createLessonAudioOutput, createLessonClock, snapLessonPlacement, lessonScreenSlide, lessonGridMask } from '@mlt/lesson-kit';
  import { fullRowData } from '@mlt/pitch-data';
  import { PianoKeyboard } from '@mlt/ui-components';
  import { PitchGrid, getLegendFontSize, getLegendTextStrokeWidth } from '@mlt/ui-components/canvas';
  import type {
    PitchGridViewport,
    SingingModeConfig,
  } from '@mlt/ui-components/canvas';
  import { getContext, onDestroy, onMount, untrack } from 'svelte';
  import { lessonInspectorKey, type LessonInspector } from './lessonInspector.svelte';
  import { getLesson12SeekTarget, lesson12Cues, octavePracticePairs } from './lesson12Cues';
  import { blackKeyIntroduction, blackKeyDescent, blackKeyNoteColumns, blackKeySpeech } from './lesson12BlackKeys';
  import { lesson12LegendMotion } from './lesson12LegendMotion';
  import { letterPositionExamples } from './lesson12LetterPositions';
  import { calculatePianoGridMorph, pianoTransitionRange, type PianoGridMorph } from './lesson12PianoGridMorph';
  import { pianoLessonRange, pianoWhiteKeys } from './lesson12PianoRange';
  import { lesson12GridAppearance, lesson12LegendColumns as legendWidthUnits } from './lesson12Grid';
  import LessonAvatarDock from './LessonAvatarDock.svelte';
  import PitchDistanceBracket from './PitchDistanceBracket.svelte';
  import PitchGridArrow from './PitchGridArrow.svelte';
  import { calculateBoundaryArrow } from './lesson12BoundaryArrow';
  import { setLessonAvatarThinking, cancelLessonAvatarSpeech, speakWithLessonAvatar } from './lessonAvatar';
  import type { LessonSection } from './lessons';

  const audioOutput = createLessonAudioOutput();
  const clock = createLessonClock();

  type Props = {
    section: LessonSection;
    isPlaying?: boolean;
    volume?: number;
    onComplete?: () => void;
  };

  type GridKind = 'letter-seven' | 'natural-a' | 'natural-c' | 'chromatic-c' | 'practice';
  type InteractionKind = 'none' | 'placement' | 'choice' | 'note-choice';

  type ChoiceOption = {
    label: string;
    spokenLabel?: string;
    toneNote?: string;
    correct: boolean;
  };

  type ChoiceGridPlacement = {
    leftPercent: number;
    answerColumnOffset?: number;
    referenceToneNote: string;
    referenceLabel: string;
  };

  type DisplayNote = {
    slideIn?: boolean;
    slideOut?: boolean;
    instant?: boolean;
    widthColumns?: number;
    highlighted?: boolean;
    columnOffset?: number;
    columnShift?: number;
    id: string;
    toneNote: string;
    label: string;
    leftPercent: number;
    clickable?: boolean;
  };

  type PracticeQuestion = {
    toneNote: string;
    prompt: string;
    spokenPrompt: string;
    revealLabel: string;
  };

  type ActiveVoice = {
    oscillator: OscillatorNode;
    gain: GainNode;
  };

  let {
    section,
    isPlaying = true,
    volume = 72,
    onComplete,
  }: Props = $props();

  const inspector = getContext<LessonInspector | undefined>(lessonInspectorKey);
  const cuePlan = $derived(lesson12Cues[section.id] ?? []);
  let unregisterInspector: (() => void) | undefined;
  let seekTarget: string | null = null;
  let seeking = false;
  let activeCueId = $state<string | null>(null);
  let activeActionId: string | null = null;
  let pendingRetryActionId: string | null = null;

  function mark(cueId: string, actionId: string): void {
    const key = `${cueId}/${actionId}`;
    if (seeking) {
      if (key !== seekTarget) return;
      seeking = false;
      seekTarget = null;
    }
    if (activeCueId !== cueId) {
      if (activeCueId) inspector?.status('completed');
      activeCueId = cueId;
      inspector?.enter(cueId);
    }
    inspector?.action(actionId);
    activeActionId = actionId;
    inspector?.status('running');
  }

  function markRetry(baseActionId: string): void {
    if (activeCueId) mark(activeCueId, `retry-${baseActionId}`);
  }

  function restoreQuestionMark(baseActionId: string): void {
    if (activeCueId) mark(activeCueId, baseActionId);
  }

  function resetForSeek(): void {
    cancelBoundaryArrow();
    cancelLetterArrival();
    cancelNoteMotion();
    cancelGridMotion();
    pianoGridMorph = null;
    octaveGridMinMidi = 57;
    octaveGridRevealing = false;
    gridVerticalShift = 0;
    gridMaskInstant = true;
    letterGridRevealing = false;
    hidePiano();
    pianoPlayback = false;
    interaction = 'none';
    answerLocked = true;
    choiceOptions = [];
    choiceGridPlacement = null;
    selectedChoiceLabel = null;
    choiceFeedbackState = null;
    transientChoiceNote = null;
    placementTargetTone = null;
    placementBaseNotes = [];
    noteChoiceTargetTone = null;
    displayNotes = [];
    questionNote = null;
    feedbackState = null;
    placementPreviewTone = null;
    activeToneNote = null;
    narrationText = '';
    upperNarrationText = '';
    animateSpeechPromotion = false;
    clearBlackKeyLabels();
    activeCueId = null;
    activeActionId = null;
    showOctaveBracket = false;
    legendSpotlight = false;
    legendMidiLabelOverrides = new Map();
    legendOctaveLabelProgress = 1;
  }

  function seekTo(cueId: string, actionId?: string): void {
    const target = getLesson12SeekTarget(cuePlan, cueId, actionId);
    if (!target) return;
    sequenceToken += 1;
    questionNarration.submit();
    cancelPlacementGesture();
    clock.cancel();
    resolveResponse();
    stopVoice();
    cancelLessonAvatarSpeech();
    resetForSeek();
    inspector?.resetFrom(cueId);
    pendingRetryActionId = target.retry;
    seekTarget = target.targetKey;
    seeking = true;
    sequenceStarted = true;
    void runSection(sequenceToken);
  }

  const pitchRows = fullRowData;
  const sourceRowByTone = new Map(pitchRows.map((row) => [row.toneNote, row]));
  const singingConfig: SingingModeConfig = { pitchHistory: [] };
  const gridColumnCount = 28;
  const fallbackCellSize = 18;

  function selectPitchRows(minMidi: number, maxMidi: number) {
    return pitchRows.filter((row) => {
      const midi = row.midi;
      return (
        typeof midi === 'number' &&
        midi >= minMidi &&
        midi <= maxMidi
      );
    });
  }

  const rowsByGridKind = {
    'letter-seven': selectPitchRows(57, 67),
    'natural-a': selectPitchRows(57, 72),
    'natural-c': selectPitchRows(60, 84),
    'chromatic-c': selectPitchRows(pianoLessonRange.minMidi, pianoLessonRange.maxMidi),
    practice: selectPitchRows(pianoLessonRange.minMidi, pianoLessonRange.maxMidi),
  } satisfies Record<GridKind, ReturnType<typeof selectPitchRows>>;

  const naturalLetterLegend = new Map<number, string>([
    [0, 'C'],
    [2, 'D'],
    [4, 'E'],
    [5, 'F'],
    [7, 'G'],
    [9, 'A'],
    [11, 'B'],
  ]);

  const naturalPlacementQuestions: PracticeQuestion[] = [
    {
      toneNote: 'D4',
      prompt: 'Place a D on the grid.',
      spokenPrompt: 'Place a D on the grid.',
      revealLabel: 'D',
    },
    {
      toneNote: 'F4',
      prompt: 'Place an F on the grid.',
      spokenPrompt: 'Place an F on the grid.',
      revealLabel: 'F',
    },
    {
      toneNote: 'B3',
      prompt: 'Place a B on the grid.',
      spokenPrompt: 'Place a B on the grid.',
      revealLabel: 'B',
    },
  ];

  const combinedPracticeQuestions: PracticeQuestion[] = [
    {
      toneNote: 'Bb4',
      prompt: 'Place B♭ / A♯ on the grid.',
      spokenPrompt: 'Place B flat, or A sharp, on the grid.',
      revealLabel: 'B♭ / A♯',
    },
    {
      toneNote: 'Gb4',
      prompt: 'Place G♭ / F♯ on the grid.',
      spokenPrompt: 'Place G flat, or F sharp, on the grid.',
      revealLabel: 'G♭ / F♯',
    },
    {
      toneNote: 'Db4',
      prompt: 'Place D♭ / C♯ on the grid.',
      spokenPrompt: 'Place D flat, or C sharp, on the grid.',
      revealLabel: 'D♭ / C♯',
    },
  ];

  const flatPracticeQuestions: PracticeQuestion[] = [
    {
      toneNote: 'Eb4',
      prompt: 'Place E♭ on the grid.',
      spokenPrompt: 'Place E flat on the grid.',
      revealLabel: 'E♭',
    },
    {
      toneNote: 'Ab4',
      prompt: 'Place A♭ on the grid.',
      spokenPrompt: 'Place A flat on the grid.',
      revealLabel: 'A♭',
    },
    {
      toneNote: 'Db4',
      prompt: 'Place D♭ on the grid.',
      spokenPrompt: 'Place D flat on the grid.',
      revealLabel: 'D♭',
    },
  ];

  const sharpPracticeQuestions: PracticeQuestion[] = [
    {
      toneNote: 'Db4',
      prompt: 'Place C♯ on the grid.',
      spokenPrompt: 'Place C sharp on the grid.',
      revealLabel: 'C♯',
    },
    {
      toneNote: 'Gb4',
      prompt: 'Place F♯ on the grid.',
      spokenPrompt: 'Place F sharp on the grid.',
      revealLabel: 'F♯',
    },
    {
      toneNote: 'Ab4',
      prompt: 'Place G♯ on the grid.',
      spokenPrompt: 'Place G sharp on the grid.',
      revealLabel: 'G♯',
    },
  ];

  let gridKind = $state<GridKind>(untrack(() => section.id === 'letter-names' ? 'letter-seven'
    : section.id === 'accidentals' ? 'chromatic-c' : section.id === 'naming-practice' ? 'practice' : 'natural-a'));
  const compactGrid = $derived(section.id === 'accidentals' || section.id === 'naming-practice');
  let letterRangeMinMidi = $state(57);
  let letterRangeMaxMidi = $state(67);
  let letterLayoutMaxMidi = $state(72);
  let letterGridRevealing = $state(false);
  let letterLegendOnly = $state(true);
  let visibleLetterPitchClasses = $state<Set<number> | null>(null);
  let accidentalMode = $state({ sharp: false, flat: false });
  let frameWidth = $state(0);
  let frameHeight = $state(0);
  let compactGridWidth = $state(0);
  let pianoGridMorph = $state<PianoGridMorph | null>(null);
  let viewportWidth = $state(0);
  let viewportHeight = $state(0);
  let avatarReady = $state(false);
  let sequenceStarted = $state(false);
  let gridPresented = $state(false);
  let narrationText = $state('');
  let upperNarrationText = $state('');
  let animateSpeechPromotion = $state(false);
  let blackKeyLabels = $state<Array<{ toneNote: string; text: string; version: number; instant: boolean; token: number; sourceToneNote?: string }>>([]);
  let legendPixelRatio = $state(1);
  onMount(() => {
    const updatePixelRatio = () => { legendPixelRatio = window.devicePixelRatio || 1; };
    updatePixelRatio();
    window.addEventListener('resize', updatePixelRatio);
    return () => window.removeEventListener('resize', updatePixelRatio);
  });
  let blackKeyLabelVersion = 0;
  let resolveLegendArrival: (() => void) | null = null;
  let interaction = $state<InteractionKind>('none');
  let answerLocked = $state(true);
  let choiceOptions = $state<ChoiceOption[]>([]);
  let choiceSuccessText = $state('Correct!');
  let selectedChoiceLabel = $state<string | null>(null);
  let choiceFeedbackState = $state<'correct' | 'incorrect' | null>(null);
  let choiceGridPlacement = $state<ChoiceGridPlacement | null>(null);
  let transientChoiceNote = $state<DisplayNote | null>(null);
  let activePromptText = $state('');
  let activePromptSpoken = $state('');
  let placementTargetTone = $state<string | null>(null);
  let placementRevealLabel = $state('');
  let placementLeftPercent = $state(48);
  let placementBaseNotes = $state<DisplayNote[]>([]);
  let noteChoiceTargetTone = $state<string | null>(null);
  let noteChoiceLabels = $state(new Map<string, string>());
  let displayNotes = $state<DisplayNote[]>([]);
  let questionNote = $state<DisplayNote | null>(null);
  let placementPreviewTone = $state<string | null>(null);
  let placementPointerId = $state<number | null>(null);
  let placementLayer = $state<HTMLDivElement | null>(null);
  let activeToneNote = $state<string | null>(null);
  const heldBlackKeyTone = $derived(section.id === 'accidentals' && activeCueId === 'black-keys'
    && ['flat-example', 'flat-direction', 'sharp-label', 'sharp-example'].includes(activeActionId ?? '')
    ? 'Ab4' : null);
  let feedbackState = $state<'success' | 'error' | null>(null);
  let legendSpotlight = $state(false);
  let legendMidiLabelOverrides = $state(new Map<number, string>());
  let legendOctaveLabelProgress = $state(1);
  let hiddenLegendMidi = $state(new Set<number>());
  let showOctaveBracket = $state(false);
  let boundaryArrow = $state<{ entering: boolean; progress: number; instant: boolean } | null>(null);
  let boundaryArrowVersion = $state(0);
  let resolveBoundaryArrow: (() => void) | null = null;
  let responseResolve: (() => void) | null = null;
  let sequenceToken = $state(0);
  let comparisonCycleGeneration = 0;
  let audioContext: AudioContext | null = null;
  let activeVoice: ActiveVoice | null = null;
  let pianoVoice: ActiveVoice | null = null;
  let showPiano = $state(false);
  let pianoEntering = $state(false);
  let pianoSlideVersion = $state(0);
  let pianoSpaceHeight = $state(0);
  let visiblePianoLabelMidi = $state(new Set<number>());
  let resolvePianoArrival: (() => void) | null = null;
  let resolveLetterArrival: (() => void) | null = null;
  let arrivingLetterNoteId: string | null = null;
  let noteMotionVersion = 0;
  let pendingNoteMotion = new Set<string>();
  let resolveNoteMotion: (() => void) | null = null;
  let octaveGridMinMidi = $state(57);
  let octaveGridRevealing = $state(false);
  let gridVerticalShift = $state(0);
  let gridMaskInstant = $state(true);
  let gridMaskVersion = $state(0);
  let gridSlideVersion = $state(0);
  let resolveGridMask: (() => void) | null = null;
  let resolveGridSlide: (() => void) | null = null;
  let pianoPlayback = false;

  function hidePiano(): void {
    pianoSlideVersion++;
    resolvePianoArrival?.(); resolvePianoArrival = null;
    showPiano = false; pianoEntering = false;
    visiblePianoLabelMidi = new Set();
  }
  function pianoArrived(version: number, token: number): void {
    if (version !== pianoSlideVersion || !isCurrentSequence(token)) return;
    resolvePianoArrival?.(); resolvePianoArrival = null;
  }

  const revealLetterRange = $derived(section.id === 'letter-cycle' && gridKind === 'letter-seven');
  const displayRows = $derived(
    pianoGridMorph ? selectPitchRows(pianoTransitionRange.minMidi, pianoTransitionRange.maxMidi) : gridKind === 'letter-seven'
      ? selectPitchRows(letterRangeMinMidi, revealLetterRange || section.id === 'octave-numbers' ? letterLayoutMaxMidi : letterRangeMaxMidi)
      : rowsByGridKind[gridKind],
  );
  const displayRowCount = $derived(Math.max(1, displayRows.length));
  const freeColumnPlacement = $derived(section.id === 'letter-names');
  const layoutRowCount = $derived(
    // Reserve the numbered-octave range throughout the continuous opening grid.
    ['letter-names', 'letter-cycle', 'octaves', 'octave-numbers'].includes(section.id)
      ? selectPitchRows(60, 84).length : gridKind === 'letter-seven'
      ? selectPitchRows(letterRangeMinMidi, letterLayoutMaxMidi).length
      : displayRowCount,
  );
  const layoutGridColumnCount = $derived(
    compactGrid ? pianoLessonRange.gridColumns : frameWidth > 0 && frameWidth <= 720 ? 20 : gridColumnCount,
  );
  const pianoMorphLayout = $derived(pianoGridMorph ? calculatePianoGridMorph({
    morph: pianoGridMorph, frameWidth, frameHeight,
    compactWidth: compactGridWidth || frameWidth, pianoHeight: pianoSpaceHeight,
  }) : null);
  const gridLayout = $derived(pianoMorphLayout?.layout ?? calculateLessonGridLayout({
    width: compactGrid ? compactGridWidth || frameWidth : frameWidth,
    height: Math.max(0, frameHeight - (compactGrid ? pianoSpaceHeight : 0)),
    columns: layoutGridColumnCount, rows: displayRowCount,
    layoutRows: layoutRowCount, legendColumns: legendWidthUnits,
    fallbackCellSize,
  }));
  const shellWidth = $derived(gridLayout.width);
  const shellHeight = $derived(gridLayout.height);
  const cellWidth = $derived(gridLayout.cellWidth);
  const cellHeight = $derived(gridLayout.cellHeight);
  const legendWidth = $derived(cellWidth * legendWidthUnits);
  const noteSize = $derived(gridLayout.noteDiameter);
  const pianoLabelSize = $derived(calculateLessonNoteLabelSize(noteSize, noteSize, 'circle', cellWidth));
  $effect(() => {
    // Keep measuring the reserved space, but show the stage only once its
    // teaching range and measured viewport agree with the fitted dimensions.
    if (gridPresented || !sequenceStarted || frameWidth <= 0 || frameHeight <= 0
      || viewportWidth <= 0 || viewportHeight <= 0) return;
    if (Math.abs(viewportWidth - shellWidth) < 1 && Math.abs(viewportHeight - shellHeight) < 1) {
      gridPresented = true;
    }
  });
  // Render the final rows and legend once; reveal upward without moving their coordinates.
  const gridRevealTop = $derived(revealLetterRange
    ? Math.max(0, displayRowCount - selectPitchRows(57, letterRangeMaxMidi).length) * cellWidth
    : 0);
  const octaveGridMaskTop = $derived(section.id === 'octave-numbers'
    ? Math.max(0, displayRowCount - selectPitchRows(letterRangeMinMidi, letterRangeMaxMidi).length) * cellWidth : 0);
  const octaveGridMaskBottom = $derived(section.id === 'octaves' ? Math.max(0, octaveGridMinMidi - 57) * cellWidth : 0);
  const hasCurrentPlacementNote = $derived(
    displayNotes.some((note) => note.id === 'placement-current'),
  );
  const pitchGridViewport = $derived<PitchGridViewport>({
    startRow: 0,
    endRow: displayRowCount - 1,
    zoomLevel: 1,
    containerWidth: viewportWidth,
    containerHeight: viewportHeight,
  });
  const legendLabelOverrides = $derived.by(() => {
    if (!letterLegendOnly) return undefined;
    if (visibleLetterPitchClasses === null) return naturalLetterLegend;

    const overrides = new Map<number, string>();
    for (const [pitchClass, label] of naturalLetterLegend) {
      overrides.set(
        pitchClass,
        visibleLetterPitchClasses.has(pitchClass) ? label : '',
      );
    }
    return overrides;
  });
  const pianoActiveMidi = $derived(!activeToneNote
    ? null : sourceRowByTone.get(activeToneNote)?.midi ?? null);
  const placementLegendHighlight = $derived.by(() => {
    if (section.id !== 'letter-names' || interaction !== 'placement' || !placementTargetTone) return undefined;
    const row = sourceRowByTone.get(placementTargetTone);
    if (typeof row?.midi !== 'number') return undefined;
    return { pitchClass: null, midi: row.midi, opacity: 0.8, color: '#fff4b8', style: 'glow' as const };
  });
  const underlinedWords = $derived(
    narrationText === blackKeySpeech.flatDirection[0] ? ['lower']
      : narrationText === blackKeySpeech.sharpDirection[0] ? ['raise']
      : narrationText.includes('octave')
      ? ['octave']
      : narrationText.includes('flat')
        ? ['flat']
        : narrationText.includes('sharp')
          ? ['sharp']
          : [],
  );

  function displayRowIndex(toneNote: string): number {
    return displayRows.findIndex((row) => row.toneNote === toneNote);
  }

  function rowCenter(toneNote: string): number {
    const rowIndex = displayRowIndex(toneNote);
    return rowIndex < 0 ? -100 : ((rowIndex + 1) / (displayRowCount + 1)) * 100;
  }

  function isCurrentSequence(token: number): boolean {
    return token === sequenceToken;
  }

  async function waitMs(durationMs: number, token: number): Promise<boolean> {
    if (!isCurrentSequence(token)) return false;
    if (seeking) return true;
    clock.setPaused(!isPlaying);
    return await clock.wait(durationMs) && isCurrentSequence(token);
  }

  async function waitForPlayback(token: number): Promise<boolean> {
    return waitMs(0, token);
  }

  function stopVoice(): void {
    if (pianoVoice) {
      try { pianoVoice.oscillator.stop(); } catch { /* Already stopped. */ }
      pianoVoice.oscillator.disconnect();
      pianoVoice.gain.disconnect();
      audioOutput.forget(pianoVoice.gain);
      pianoVoice = null;
    }
    if (!activeVoice) return;
    try {
      activeVoice.oscillator.stop();
    } catch {
      // The oscillator may already have stopped naturally.
    }
    activeVoice.oscillator.disconnect();
    audioOutput.forget(activeVoice.gain);
    activeVoice.gain.disconnect();
    activeVoice = null;
    activeToneNote = null;
  }

  async function ensureAudioContext(): Promise<AudioContext | null> {
    if (typeof window === 'undefined') return null;
    audioContext ??= new AudioContext();
    if (audioContext.state === 'suspended') {
      await audioContext.resume().catch(() => {});
    }
    return audioContext.state === 'running' ? audioContext : null;
  }

  function revealPianoKeyLabel(toneNote: string): void {
    const midi = sourceRowByTone.get(toneNote)?.midi;
    if (typeof midi !== 'number' || visiblePianoLabelMidi.has(midi)) return;
    visiblePianoLabelMidi = new Set([...visiblePianoLabelMidi, midi]);
  }

  async function playTone(toneNote: string, token: number, durationMs: number = lessonPacing.noteMs, canPlay: () => boolean = () => true): Promise<void> {
    if (!isCurrentSequence(token)) return;
    if (seeking) {
      if (pianoPlayback) revealPianoKeyLabel(toneNote);
      return;
    }
    if (!(await waitForPlayback(token)) || !canPlay()) return;
    const row = sourceRowByTone.get(toneNote);
    if (!row || typeof row.frequency !== 'number') return;
    const context = await ensureAudioContext();
    if (!context || !isCurrentSequence(token) || !canPlay()) return;

    stopVoice();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const end = now + durationMs / 1000;
    const peak = 0.2;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(row.frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.025);
    gain.gain.setValueAtTime(peak, Math.max(now + 0.03, end - 0.08));
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(gain);
    audioOutput.connect(gain, context, volume, { frequency: row.frequency, start: now, attackEnd: now + 0.025, releaseStart: Math.max(now + 0.03, end - 0.08), end, peak });
    if (pianoPlayback) {
      pianoVoice = createLessonPianoVoice(context, row.frequency, now, durationMs / 1000);
      audioOutput.connect(pianoVoice.gain, context, volume);
      pianoVoice.oscillator.start(now);
      pianoVoice.oscillator.stop(end + .02);
      revealPianoKeyLabel(toneNote);
    }
    activeVoice = { oscillator, gain };
    activeToneNote = toneNote;
    oscillator.start(now);
    oscillator.stop(end + 0.02);
    await waitMs(durationMs, token);
    if (activeVoice?.oscillator === oscillator) stopVoice();
  }

  async function playSequence(toneNotes: readonly string[], token: number, trailingGap = true): Promise<void> {
    for (const [index, toneNote] of toneNotes.entries()) {
      if (!isCurrentSequence(token)) return;
      await playTone(toneNote, token);
      if ((trailingGap || index < toneNotes.length - 1)
        && !(await waitMs(lessonPacing.betweenNotesMs, token))) return;
    }
  }

  async function say(text: string, spokenText: string, token: number, bubble: 'lower' | 'upper' = 'lower', isOpen: () => boolean = () => true): Promise<void> {
    if (bubble === 'upper') {
      upperNarrationText = text;
      narrationText = '';
    } else {
      narrationText = text;
    }
    if (seeking) return;
    if (!(await waitForPlayback(token))) return;
    if (!avatarReady || !isCurrentSequence(token) || !isOpen()) return;
    await speakWithLessonAvatar(spokenText, {
      lang: 'en-CA',
      rate: 0.92,
      chunking: 'sentence',
    }).catch(() => {});
  }

  function waitForResponse(): Promise<void> {
    return new Promise((resolve) => {
      responseResolve = resolve;
    });
  }

  function resolveResponse(): void {
    const resolve = responseResolve;
    responseResolve = null;
    resolve?.();
  }

  function setDisplayNotes(
    notes: Array<{ toneNote: string; label?: string; leftPercent?: number; clickable?: boolean; widthColumns?: number }>,
  ): void {
    displayNotes = notes.map((note, index) => ({
      id: `${note.toneNote}-${index}`,
      toneNote: note.toneNote,
      label: note.label ?? '',
      leftPercent: note.leftPercent ?? 55,
      clickable: note.clickable,
      widthColumns: note.widthColumns,
    }));
  }

  async function startQuestionNarration(
    token: number,
    speak: (isOpen: () => boolean) => Promise<void>,
    unlock: () => void,
  ): Promise<void> {
    const generation = ++comparisonCycleGeneration;
    await questionNarration.start(speak, unlock);
    const current = () => isCurrentSequence(token) && generation === comparisonCycleGeneration
      && activeCueId === 'compare-as' && !answerLocked && !seeking;
    if (section.id !== 'octaves' || !current()) return;
    const tones = displayNotes.map(note => note.toneNote);
    while (current()) {
      for (const tone of tones) {
        if (!current()) return;
        await playTone(tone, token, lessonPacing.comparisonNoteMs, current);
        if (!current() || !(await waitMs(lessonPacing.betweenComparisonNotesMs, token))) return;
      }
    }
  }

  async function repeatPrompt(token: number): Promise<void> {
    void startQuestionNarration(token, 
      isOpen => say(activePromptText, activePromptSpoken, token, 'lower', isOpen),
      () => { answerLocked = false; },
    );
  }

  async function askChoice(
    prompt: string,
    spokenPrompt: string,
    options: ChoiceOption[],
    token: number,
    successText = 'Correct!',
    gridPlacement: ChoiceGridPlacement | null = null,
  ): Promise<void> {
    interaction = 'choice';
    choiceOptions = options;
    choiceSuccessText = successText;
    choiceGridPlacement = gridPlacement;
    selectedChoiceLabel = null;
    choiceFeedbackState = null;
    transientChoiceNote = null;
    activePromptText = prompt;
    activePromptSpoken = spokenPrompt;
    answerLocked = true;
    feedbackState = null;
    const baseActionId = activeActionId;
    const replayRetry = pendingRetryActionId === `retry-${baseActionId}`;
    if (replayRetry) narrationText = prompt;
    // Register the response before opening input and starting narration.
    if (!isCurrentSequence(token)) return;
    if (seeking) {
      const answer = options.find((option) => option.correct);
      revealOctaveComparisonLabels(baseActionId);
      if (choiceGridPlacement && answer?.toneNote) {
        const index = displayNotes.length;
        displayNotes = [...displayNotes,
          { id: `choice-reference-${index}`, toneNote: choiceGridPlacement.referenceToneNote,
            label: choiceGridPlacement.referenceLabel, leftPercent: choiceGridPlacement.leftPercent },
          { id: `choice-answer-${index}`, toneNote: answer.toneNote,
            label: answer.label, leftPercent: choiceGridPlacement.leftPercent, columnOffset: choiceGridPlacement.answerColumnOffset },
        ];
        questionNote = null;
      }
      interaction = 'none';
      choiceOptions = [];
      choiceGridPlacement = null;
      return;
    }
    answerLocked = false;
    const response = waitForResponse();
    if (!replayRetry) void startQuestionNarration(token, 
      isOpen => say(prompt, spokenPrompt, token, 'lower', isOpen),
      () => { answerLocked = false; },
    );
    if (replayRetry) {
      pendingRetryActionId = null;
      const wrong = options.find((option) => !option.correct);
      if (wrong) await handleChoice(wrong, true);
    }
    await response;
    if (!isCurrentSequence(token)) return;
    interaction = 'none';
    choiceOptions = [];
    choiceGridPlacement = null;
    selectedChoiceLabel = null;
    choiceFeedbackState = null;
    transientChoiceNote = null;
    feedbackState = null;
    await waitMs(280, token);
  }

  async function askPlacement(
    question: PracticeQuestion,
    token: number,
    options: { accumulate?: boolean; leftPercent?: number } = {},
  ): Promise<void> {
    interaction = 'placement';
    placementTargetTone = question.toneNote;
    placementRevealLabel = question.revealLabel;
    placementLeftPercent = options.leftPercent ?? 48;
    if (freeColumnPlacement) {
      placementLeftPercent = snapLessonPlacement(placementLeftPercent, 0, 100, 1,
        layoutGridColumnCount, 1)?.leftPercent ?? placementLeftPercent;
    }
    activePromptText = question.prompt;
    activePromptSpoken = question.spokenPrompt;
    placementBaseNotes = options.accumulate
      ? displayNotes.map((note, index) => ({ ...note, id: `confirmed-${index}-${note.toneNote}` }))
      : [];
    displayNotes = [...placementBaseNotes];
    placementPreviewTone = null;
    feedbackState = null;
    if (seeking) {
      displayNotes = [...placementBaseNotes, {
        id: 'placement-current', toneNote: question.toneNote,
        label: question.revealLabel, leftPercent: placementLeftPercent,
      }];
      interaction = 'none';
      placementTargetTone = null;
      return;
    }
    const response = waitForResponse();
    answerLocked = false;
    const baseActionId = activeActionId;
    const replayRetry = pendingRetryActionId === `retry-${baseActionId}`;
    if (replayRetry) {
      narrationText = question.prompt;
      pendingRetryActionId = null;
      await handleRowChoice(question.toneNote === 'C4' ? 'D4' : 'C4', true);
    } else {
      void startQuestionNarration(token, 
        isOpen => say(question.prompt, question.spokenPrompt, token, 'lower', isOpen),
        () => { answerLocked = false; },
      );
    }
    await response;
    if (!isCurrentSequence(token)) return;
    interaction = 'none';
    placementTargetTone = null;
    feedbackState = null;
    await waitMs(lessonPacing.betweenPlacementQuestionsMs, token);
  }

  async function askNoteChoice(
    prompt: string,
    spokenPrompt: string,
    toneNotes: readonly string[],
    correctToneNote: string,
    labels: ReadonlyMap<string, string>,
    token: number,
  ): Promise<void> {
    interaction = 'note-choice';
    noteChoiceTargetTone = correctToneNote;
    noteChoiceLabels = new Map(labels);
    activePromptText = prompt;
    activePromptSpoken = spokenPrompt;
    if (displayNotes.length === toneNotes.length && displayNotes.every((note, index) => note.toneNote === toneNotes[index])) {
      displayNotes = displayNotes.map(note => ({ ...note, clickable: true }));
    } else setDisplayNotes(toneNotes.map((toneNote) => ({ toneNote, clickable: true })));
    answerLocked = true;
    feedbackState = null;
    const baseActionId = activeActionId;
    const replayRetry = pendingRetryActionId === `retry-${baseActionId}`;
    if (replayRetry) narrationText = prompt;
    // Register the response before opening input and starting narration.
    if (!isCurrentSequence(token)) return;
    if (seeking) {
      displayNotes = displayNotes.map((note) => ({
        ...note, clickable: false, label: labels.get(note.toneNote) ?? '',
      }));
      interaction = 'none';
      noteChoiceTargetTone = null;
      return;
    }
    answerLocked = false;
    const response = waitForResponse();
    if (!replayRetry) void startQuestionNarration(token, 
      isOpen => say(prompt, spokenPrompt, token, 'lower', isOpen),
      () => { answerLocked = false; },
    );
    if (replayRetry) {
      pendingRetryActionId = null;
      const wrong = toneNotes.find((toneNote) => toneNote !== correctToneNote);
      if (wrong) await handleNoteChoice(wrong, true);
    }
    await response;
    if (!isCurrentSequence(token)) return;
    interaction = 'none';
    noteChoiceTargetTone = null;
    displayNotes = displayNotes.map((note) => ({ ...note, clickable: false }));
    feedbackState = null;
    await waitMs(320, token);
  }

  async function handleChoice(option: ChoiceOption, fromInspector = false): Promise<void> {
    if (interaction !== 'choice' || answerLocked || (!isPlaying && !fromInspector)) return;
    comparisonCycleGeneration++;
    stopVoice();
    questionNarration.submit();
    const token = sequenceToken;
    const questionActionId = activeActionId ?? '';
    answerLocked = true;
    selectedChoiceLabel = option.label;
    if (!option.correct) {
      markRetry(questionActionId);
      choiceFeedbackState = 'incorrect';
      feedbackState = 'error';
      if (choiceGridPlacement && option.toneNote) {
        transientChoiceNote = {
          id: `incorrect-${option.toneNote}`,
          toneNote: option.toneNote,
          label: option.label,
          leftPercent: choiceGridPlacement.leftPercent, columnOffset: choiceGridPlacement.answerColumnOffset,
        };
        await playTone(option.toneNote, token, 360);
        if (!isCurrentSequence(token)) return;
      }
      await say('Try again.', 'Try again.', token);
      if (!(await waitMs(lessonPacing.afterRetryMs, token))) return;
      transientChoiceNote = null;
      selectedChoiceLabel = null;
      choiceFeedbackState = null;
      feedbackState = null;
      await repeatPrompt(token);
      if (isCurrentSequence(token)) {
        answerLocked = false;
        questionNarration.wait();
        restoreQuestionMark(questionActionId);
      }
      return;
    }

    choiceFeedbackState = 'correct';
    feedbackState = 'success';
    revealOctaveComparisonLabels(questionActionId);
    if (questionNote?.label === '?') questionNote = { ...questionNote, label: option.label };
    if (choiceGridPlacement && option.toneNote) {
      const answerIndex = displayNotes.length;
      displayNotes = [
        ...displayNotes,
        {
          id: `choice-reference-${answerIndex}`,
          toneNote: choiceGridPlacement.referenceToneNote,
          label: choiceGridPlacement.referenceLabel,
          leftPercent: choiceGridPlacement.leftPercent,
        },
        {
          id: `choice-answer-${answerIndex}`,
          toneNote: option.toneNote,
          label: option.label,
          leftPercent: choiceGridPlacement.leftPercent, columnOffset: choiceGridPlacement.answerColumnOffset,
        },
      ];
      questionNote = null;
      await playTone(option.toneNote, token, 360);
      if (!isCurrentSequence(token)) return;
    }
    await say(choiceSuccessText, choiceSuccessText, token);
    if (!(await waitMs(520, token))) return;
    resolveResponse();
  }

  function placementLabel(toneNote: string): string {
    if (toneNote === placementTargetTone) return placementRevealLabel;
    const row = sourceRowByTone.get(toneNote)!;
    if (freeColumnPlacement) return row.flatName.replace(/\d+$/, '');
    const label = !row.isAccidental ? row.flatName
      : accidentalMode.sharp && accidentalMode.flat ? `${row.flatName} / ${row.sharpName}`
      : accidentalMode.sharp ? row.sharpName : row.flatName;
    return section.id === 'naming-practice' ? label.replace(/\d+/g, '') : label;
  }

  const boundaryArrowPoints = $derived.by(() => {
    if (!boundaryArrow) return null;
    const b = displayNotes.find(note => note.toneNote === 'B4');
    const c = displayNotes.find(note => note.toneNote === 'C5');
    if (!b || !c) return null;
    const musicalWidth = Math.max(0, viewportWidth - legendWidth);
    return calculateBoundaryArrow(
      { x: b.leftPercent / 100 * musicalWidth, y: rowCenter('B4') / 100 * viewportHeight },
      { x: c.leftPercent / 100 * musicalWidth, y: rowCenter('C5') / 100 * viewportHeight },
      cellWidth, boundaryArrow.progress,
    );
  });

  async function handleRowChoice(toneNote: string, fromInspector = false): Promise<void> {
    if (interaction !== 'placement' || answerLocked || (!isPlaying && !fromInspector) || !placementTargetTone) return;
    comparisonCycleGeneration++;
    stopVoice();
    questionNarration.submit();
    const token = sequenceToken;
    const questionActionId = activeActionId ?? '';
    answerLocked = true;
    placementPreviewTone = null;
    displayNotes = [
      ...placementBaseNotes,
      {
        id: 'placement-current',
        toneNote,
        label: placementLabel(toneNote),
        leftPercent: placementLeftPercent,
      },
    ];
    await playTone(toneNote, token);
    if (!isCurrentSequence(token)) return;

    if (toneNote !== placementTargetTone) {
      markRetry(questionActionId);
      feedbackState = 'error';
      await say('Try again.', 'Try again.', token);
      if (!(await waitMs(lessonPacing.afterRetryMs, token))) return;
      displayNotes = [...placementBaseNotes];
      feedbackState = null;
      await repeatPrompt(token);
      if (isCurrentSequence(token)) {
        answerLocked = false;
        questionNarration.wait();
        restoreQuestionMark(questionActionId);
      }
      return;
    }

    feedbackState = 'success';
    await say('Correct!', 'Correct!', token);
    if (!isCurrentSequence(token)) return;
    if (!(await waitMs(lessonPacing.afterCorrectPlacementMs, token))) return;
    resolveResponse();
  }

  async function handleNoteChoice(toneNote: string, fromInspector = false): Promise<void> {
    if (interaction !== 'note-choice' || answerLocked || (!isPlaying && !fromInspector) || !noteChoiceTargetTone) return;
    comparisonCycleGeneration++;
    stopVoice();
    questionNarration.submit();
    const token = sequenceToken;
    const questionActionId = activeActionId ?? '';
    answerLocked = true;
    await playTone(toneNote, token);
    if (!isCurrentSequence(token)) return;

    if (toneNote !== noteChoiceTargetTone) {
      markRetry(questionActionId);
      feedbackState = 'error';
      await say('Try again.', 'Try again.', token);
      if (!isCurrentSequence(token)) return;
      await playSequence(displayNotes.map((note) => note.toneNote), token);
      if (!(await waitMs(300, token))) return;
      feedbackState = null;
      await repeatPrompt(token);
      if (isCurrentSequence(token)) {
        answerLocked = false;
        questionNarration.wait();
        restoreQuestionMark(questionActionId);
      }
      return;
    }

    feedbackState = 'success';
    await say('Correct!', 'Correct!', token);
    if (!isCurrentSequence(token)) return;
    displayNotes = displayNotes.map((note) => ({
      ...note,
      label: noteChoiceLabels.get(note.toneNote) ?? '',
    }));
    if (!(await waitMs(760, token))) return;
    resolveResponse();
  }

  function showPlacementPreview(toneNote: string): void {
    if (interaction !== 'placement' || answerLocked || !isPlaying) return;
    placementPreviewTone = toneNote;
  }

  function hidePlacementPreview(toneNote: string): void {
    if (placementPointerId === null && placementPreviewTone === toneNote) placementPreviewTone = null;
  }

  function cancelPlacementGesture(): void {
    const pointerId = placementPointerId;
    placementPointerId = null;
    if (pointerId !== null && placementLayer?.hasPointerCapture(pointerId)) {
      placementLayer.releasePointerCapture(pointerId);
    }
    placementPreviewTone = null;
  }

  function updatePlacementPointer(event: PointerEvent): void {
    if (interaction !== 'placement' || answerLocked || !isPlaying || !placementLayer
      || (placementPointerId !== null && event.pointerId !== placementPointerId)) return;
    const rect = placementLayer.getBoundingClientRect();
    const snapped = snapLessonPlacement(event.clientX - rect.left, event.clientY - rect.top,
      rect.width, rect.height, layoutGridColumnCount, displayRowCount);
    if (!snapped) return;
    placementPreviewTone = displayRows[snapped.row]?.toneNote ?? null;
    if (freeColumnPlacement) placementLeftPercent = snapped.leftPercent;
  }

  function beginPlacementPointer(event: PointerEvent): void {
    if (!freeColumnPlacement || event.button !== 0 || answerLocked || !isPlaying
      || placementPointerId !== null || !placementLayer) return;
    event.preventDefault();
    updatePlacementPointer(event);
    placementPointerId = event.pointerId;
    placementLayer.setPointerCapture(event.pointerId);
  }

  function finishPlacementPointer(event: PointerEvent, fromOutside = false): void {
    if ((fromOutside ? placementPointerId !== null : event.pointerId !== placementPointerId) || !placementLayer) return;
    updatePlacementPointer(event);
    const rect = placementLayer.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right
      && event.clientY >= rect.top && event.clientY <= rect.bottom;
    const tone = placementPreviewTone;
    cancelPlacementGesture();
    if (inside && tone && !answerLocked && isPlaying) void handleRowChoice(tone);
  }

  function movePlacementColumn(event: KeyboardEvent, toneNote: string): void {
    if (!freeColumnPlacement || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const current = Math.round(placementLeftPercent / 100 * layoutGridColumnCount) - 1;
    const column = event.key === 'Home' ? 0 : event.key === 'End' ? layoutGridColumnCount - 2
      : current + (event.key === 'ArrowLeft' ? -1 : 1);
    const snapped = snapLessonPlacement((column + 1) * cellWidth, 0,
      layoutGridColumnCount * cellWidth, 1, layoutGridColumnCount, 1);
    if (snapped) placementLeftPercent = snapped.leftPercent;
    showPlacementPreview(toneNote);
  }

  async function finishSection(token: number, beforeAdvance?: () => Promise<void>): Promise<void> {
    interaction = 'none';
    answerLocked = true;
    await say('Bravo!', 'Bravo!', token);
    if (!(await waitMs(450, token))) return;
    await beforeAdvance?.();
    if (!isCurrentSequence(token)) return;
    onComplete?.();
  }

  async function runLetterNames(token: number): Promise<void> {
    gridKind = 'letter-seven';
    letterRangeMinMidi = 57;
    letterRangeMaxMidi = 67;
    letterLayoutMaxMidi = 72;
    letterLegendOnly = true;
    visibleLetterPitchClasses = new Set();
    accidentalMode = { sharp: false, flat: false };
    legendSpotlight = false;
    mark('introduce-letters', 'alphabet');
    await say(
      'In Western music, pitches are named using the first seven letters of the alphabet: A through G.',
      'In Western music, pitches are named using the first seven letters of the alphabet: A through G.',
      token,
    );
    if (!isCurrentSequence(token)) return;
    mark('introduce-letters', 'legend');
    legendSpotlight = true;
    await say(
      'The legend on the left shows those letter names.',
      'The legend on the left shows those letter names.',
      token,
    );
    if (!isCurrentSequence(token)) return;

    for (const toneNote of ['A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4']) {
      mark('reveal-letters', `tone-${toneNote}`);
      const pitchClass = sourceRowByTone.get(toneNote)?.pitchClass;
      if (typeof pitchClass === 'number') {
        visibleLetterPitchClasses = new Set([
          ...(visibleLetterPitchClasses ?? []),
          pitchClass,
        ]);
      }
      await playTone(toneNote, token, 360);
      if (!(await waitMs(90, token))) return;
    }
    if (!(await waitMs(300, token))) return;
    legendSpotlight = false;

    await runLetterPositions(token);
    if (!isCurrentSequence(token)) return;

    for (const [index, question] of naturalPlacementQuestions.entries()) {
      mark('place-letters', `place-${question.toneNote}`);
      if (index === 0) {
        await say(
          "Let's practice placing notes on the grid.",
          "Let's practice placing notes on the grid.",
          token, 'upper',
        );
        if (!isCurrentSequence(token)) return;
      } else {
        upperNarrationText = '';
      }
      await askPlacement(question, token, {
        accumulate: true,
        leftPercent: 26 + index * 18,
      });
      if (!isCurrentSequence(token)) return;
    }

    interaction = 'none';
    answerLocked = true;
    mark('place-letters', 'finish');
    if (!(await completeLessonExercise({
      replay: () => playSequence(
        [...displayNotes].sort((a, b) => a.leftPercent - b.leftPercent).map(note => note.toneNote),
        token, false,
      ),
      wait: milliseconds => waitMs(milliseconds, token),
      isCurrent: () => isCurrentSequence(token),
    }))) return;
    await slideDisplayNotesOut(token);
    if (!isCurrentSequence(token)) return;
    await prepareLetterCycleGrid(token);
    if (!isCurrentSequence(token)) return;
    inspector?.status('completed');
    onComplete?.();
  }

  async function runLetterCycle(token: number): Promise<void> {
    gridKind = 'letter-seven';
    gridVerticalShift = 0;
    gridMaskInstant = true;
    letterGridRevealing = true;
    letterRangeMinMidi = 57;
    letterRangeMaxMidi = 67;
    letterLayoutMaxMidi = 72;
    letterLegendOnly = true;
    visibleLetterPitchClasses = null;
    accidentalMode = { sharp: false, flat: false };
    displayNotes = [];
    questionNote = null;
    upperNarrationText = '';

    mark('repeat-cycle', 'expand');
    const expansionNarration = say(
      'After that, we start over and repeat the letters A through G.',
      'After that, we start over and repeat the letters A through G.',
      token,
    );
    if (!(await waitMs(420, token))) return;
    const expansion = waitForGridMask();
    gridMaskInstant = seeking;
    letterRangeMaxMidi = 72; // C5; the higher rows and legend are already rendered.
    await expansion;
    if (!isCurrentSequence(token)) return;
    letterGridRevealing = false;
    await expansionNarration;
    if (!isCurrentSequence(token)) return;
    mark('identify-next', 'above-A');
    await say("Let's test your knowledge.", "Let's test your knowledge.", token, 'upper');
    if (!isCurrentSequence(token)) return;
    questionNote = {
      id: 'question-A3',
      toneNote: 'A3',
      label: 'A',
      leftPercent: 26,
    };
    await askChoice(
      'What is directly above A?',
      'What is directly above A?',
      [
        { label: 'G', toneNote: 'G4', correct: false },
        { label: 'B', toneNote: 'B3', correct: true },
      ],
      token,
      'Correct!',
      {
        leftPercent: 26,
        referenceToneNote: 'A3',
        referenceLabel: 'A',
      },
    );
    if (!isCurrentSequence(token)) return;
    upperNarrationText = '';
    questionNote = {
      id: 'question-E4',
      toneNote: 'E4',
      label: 'E',
      leftPercent: 44,
    };
    mark('identify-next', 'above-E');
    await askChoice(
      'What is directly above E?',
      'What is directly above E?',
      [
        { label: 'F', toneNote: 'F4', correct: true },
        { label: 'G', toneNote: 'G4', correct: false },
      ],
      token,
      'Correct!',
      {
        leftPercent: 44,
        answerColumnOffset: 2,
        referenceToneNote: 'E4',
        referenceLabel: 'E',
      },
    );
    if (!isCurrentSequence(token)) return;
    questionNote = {
      id: 'question-G4',
      toneNote: 'G4',
      label: 'G',
      leftPercent: 62,
    };
    mark('identify-next', 'above-G');
    await askChoice(
      'What is directly above G?',
      'What is directly above G?',
      [
        { label: 'A', toneNote: 'A4', correct: true },
        { label: 'H', correct: false },
      ],
      token,
      'Correct! Above G, the letter names begin again at A.',
      {
        leftPercent: 62,
        referenceToneNote: 'G4',
        referenceLabel: 'G',
      },
    );
    if (!isCurrentSequence(token)) return;
    interaction = 'none';
    answerLocked = true;
    mark('identify-next', 'finish');
    if (!(await waitMs(220, token))) return;
    await slideDisplayNotesOut(token);
    if (!isCurrentSequence(token)) return;
    inspector?.status('completed');
    onComplete?.();
  }

  async function runOctaves(token: number): Promise<void> {
    gridKind = 'natural-a';
    octaveGridMinMidi = 57;
    gridVerticalShift = 0;
    gridMaskInstant = true;
    letterLegendOnly = true;
    visibleLetterPitchClasses = null;
    accidentalMode = { sharp: false, flat: false };
    legendMidiLabelOverrides = new Map();
    mark('hear-two-as', 'listen');
    await Promise.all([
      slideOctaveNotesIn(['A3', 'A4'], token),
      say('Listen to these two pitches.', 'Listen to these two pitches.', token),
    ]);
    if (!isCurrentSequence(token)) return;
    mark('hear-two-as', 'play-as');
    await playSequence(['A3', 'A4'], token);
    if (!isCurrentSequence(token)) return;
    mark('hear-two-as', 'same-name');
    await say(
      'These pitches have the same letter name, but one is higher than the other.',
      'These pitches have the same letter name, but one is higher than the other.',
      token,
    );
    if (!isCurrentSequence(token)) return;
    mark('hear-two-as', 'bracket');
    showOctaveBracket = true;
    await say(
      'The distance from one A to the next A is called an octave.',
      'The distance from one A to the next A is called an octave.',
      token,
    );
    if (!isCurrentSequence(token)) return;
    mark('compare-as', 'higher');
    await askNoteChoice(
      'Click on the higher pitch',
      'Click on the higher pitch',
      ['A3', 'A4'],
      'A4',
      new Map([
        ['A3', ''],
        ['A4', ''],
      ]),
      token,
    );
    if (!isCurrentSequence(token)) return;
    mark('compare-as', 'same-letter');
    await askChoice(
      'Do these pitches have the same letter name?',
      'Do these pitches have the same letter name?',
      [
        { label: 'Yes', correct: true },
        { label: 'No', correct: false },
      ],
      token,
    );
    if (!isCurrentSequence(token)) return;
    showOctaveBracket = false;
    await slideDisplayNotesOut(token);
    if (!isCurrentSequence(token)) return;
    for (const pair of octavePracticePairs) {
      mark('compare-as', `${pair.id}-distance`);
      await slideOctaveNotesIn(pair.tones, token);
      if (!isCurrentSequence(token)) return;
      await askChoice(
        'Are these two notes an octave apart?', 'Are these two notes an octave apart?',
        [{ label: 'Yes', correct: pair.isOctave }, { label: 'No', correct: !pair.isOctave }], token,
      );
      if (!isCurrentSequence(token)) return;
      mark('compare-as', `${pair.id}-names`);
      await askChoice(
        'Do they have the same letter names?', 'Do they have the same letter names?',
        [{ label: 'Yes', correct: pair.isOctave }, { label: 'No', correct: !pair.isOctave }], token,
      );
      if (!isCurrentSequence(token)) return;
      await slideDisplayNotesOut(token);
      if (!isCurrentSequence(token)) return;
    }
    // Restore the original pair for the following explanation of octave numbers.
    mark('name-octaves', 'numbers');
    await slideOctaveNotesIn(['A3', 'A4'], token, true);
    if (!isCurrentSequence(token)) return;
    showOctaveBracket = true;

    await say(
      'Because letter names repeat, we add a number to identify the exact pitch.',
      'Because letter names repeat, we add a number to identify the exact pitch.',
      token,
    );
    if (!isCurrentSequence(token)) return;
    legendMidiLabelOverrides = new Map([[57, 'A3']]);
    displayNotes = displayNotes.map((note) => ({
      ...note,
      label: note.toneNote === 'A3' ? 'A3' : 'A',
    }));
    mark('name-octaves', 'lower-a');
    await say('The lower pitch is A3.', 'The lower pitch is A 3.', token);
    if (!isCurrentSequence(token)) return;
    legendMidiLabelOverrides = new Map([
      [57, 'A3'],
      [69, 'A4'],
    ]);
    displayNotes = displayNotes.map((note) => ({
      ...note,
      label: note.toneNote === 'A4' ? 'A4' : note.label,
    }));
    mark('name-octaves', 'higher-a');
    await say('The higher pitch is A4.', 'The higher pitch is A 4.', token);
    if (!isCurrentSequence(token)) return;
    mark('name-octaves', 'summary');
    await say(
      'The octave number tells us which octave the pitch is in.',
      'The octave number tells us which octave the pitch is in.',
      token,
    );
    if (!(await waitMs(420, token))) return;
    mark('name-octaves', 'finish');
    interaction = 'none';
    answerLocked = true;
    showOctaveBracket = false;
    await slideDisplayNotesOut(token);
    if (!isCurrentSequence(token)) return;
    narrationText = '';
    await prepareOctaveNumberGrid(token);
    if (!isCurrentSequence(token)) return;
    inspector?.status('completed');
    onComplete?.();
  }

  async function askAdjacentNote(
    actionId: string, reference: string, answer: string, distractor: string,
    direction: 'above' | 'below', token: number, carriedReference?: DisplayNote,
  ): Promise<void> {
    mark('practice-octave-numbers', actionId);
    const pairIndex = carriedReference ? 0 : Math.floor(displayNotes.length / 2);
    const column = 2 + Math.round(pairIndex * (layoutGridColumnCount - 6) / 3);
    const leftPercent = column * 100 / layoutGridColumnCount;
    if (carriedReference) {
      await slideReferenceIntoPractice(carriedReference, leftPercent, token);
      if (!isCurrentSequence(token)) return;
    } else {
      displayNotes = [...displayNotes, {
        id: `adjacent-reference-${actionId}`, toneNote: reference, label: reference, leftPercent,
      }];
    }
    questionNote = {
      id: `unknown-${actionId}`, toneNote: answer, label: '?', leftPercent,
      columnOffset: 2,
    };
    const prompt = `What note is just ${direction} ${reference}?`;
    await askChoice(prompt, prompt, [
      { label: answer, correct: true }, { label: distractor, correct: false },
    ], token);
    if (!isCurrentSequence(token)) return;
    displayNotes = [...displayNotes, {
      id: `adjacent-answer-${actionId}`, toneNote: answer, label: answer, leftPercent, columnOffset: 2,
    }];
    questionNote = null;
  }

  async function runOctaveNumbers(token: number): Promise<void> {
    gridKind = 'letter-seven';
    letterRangeMinMidi = 60;
    letterRangeMaxMidi = 72;
    letterLayoutMaxMidi = 84;
    octaveGridRevealing = true;
    gridVerticalShift = 0;
    gridMaskInstant = true;
    letterLegendOnly = false;
    visibleLetterPitchClasses = null;
    accidentalMode = { sharp: false, flat: false };
    // A4 was already numbered in 1.2.3; retain it while the plain letters animate.
    legendMidiLabelOverrides = new Map([[69, 'A4']]);
    legendOctaveLabelProgress = 0;
    showOctaveBracket = false;
    displayNotes = [];
    mark('show-octave-range', 'expand');
    const labelReveal = revealOctaveLegend(token);
    const rangeNarration = say(
      'Each numbered octave begins on C and ends on B.',
      'Each numbered octave begins on C and ends on B.',
      token,
    );
    if (!(await waitMs(260, token))) return;
    const expansion = waitForGridMask();
    gridMaskInstant = seeking;
    letterRangeMaxMidi = 84; // C6; the lower edge remains fixed at C4.
    await expansion;
    if (!isCurrentSequence(token)) return;
    octaveGridRevealing = false;
    await Promise.all([rangeNarration, labelReveal]);
    if (!isCurrentSequence(token)) return;
    legendMidiLabelOverrides = new Map();
    const boundaryNotes = ['G4', 'A4', 'B4', 'C5', 'D5'];
    // Leave room for the connecting arrow, including on the compact grid.
    const boundaryPositions = [22, 36, 50, 72, 86];
    setDisplayNotes(boundaryNotes.map((toneNote, index) => ({
      toneNote, label: toneNote, leftPercent: boundaryPositions[index],
    })));
    mark('show-octave-range', 'play-boundary');
    await playSequence(boundaryNotes, token);
    if (!isCurrentSequence(token)) return;
    mark('show-octave-range', 'boundary');
    await explainOctaveBoundary(token);
    if (!isCurrentSequence(token)) return;

    cancelBoundaryArrow();
    await askAdjacentNote('after-B4', 'B4', 'C5', 'C4', 'above', token,
      displayNotes.find(note => note.toneNote === 'B4'));
    if (!isCurrentSequence(token)) return;
    await askAdjacentNote('after-G4', 'G4', 'A4', 'A5', 'above', token);
    if (!isCurrentSequence(token)) return;
    await askAdjacentNote('below-C6', 'C6', 'B5', 'B6', 'below', token);
    if (!isCurrentSequence(token)) return;
    await askAdjacentNote('below-D4', 'D4', 'C4', 'C5', 'below', token);
    if (!isCurrentSequence(token)) return;
    mark('practice-octave-numbers', 'finish');
    await slideDisplayNotesOut(token);
    if (!isCurrentSequence(token)) return;
    await finishSection(token, () => morphToPianoGrid(token));
    if (!isCurrentSequence(token)) return;
    inspector?.status('completed');
  }

  function revealOctaveComparisonLabels(actionId: string | null): void {
    if (section.id !== 'octaves' || activeCueId !== 'compare-as'
      || !(actionId === 'same-letter' || actionId?.endsWith('-names'))) return;
    displayNotes = displayNotes.map(note => ({ ...note, label: note.toneNote.replace(/\d+$/, '') }));
  }

  function cancelNoteMotion(): void {
    pendingNoteMotion.clear();
    resolveNoteMotion?.();
    resolveNoteMotion = null;
  }

  function noteMotionArrived(id: string): void {
    if (!pendingNoteMotion.delete(id) || pendingNoteMotion.size > 0) return;
    cancelNoteMotion();
  }

  function waitForNoteMotion(ids: string[]): Promise<void> {
    cancelNoteMotion();
    if (seeking || ids.length === 0) return Promise.resolve();
    pendingNoteMotion = new Set(ids);
    return new Promise<void>(resolve => { resolveNoteMotion = resolve; });
  }

  async function slideOctaveNotesIn(tones: readonly string[], token: number, labelled = false): Promise<void> {
    if (!isCurrentSequence(token) || (!seeking && !(await waitForPlayback(token)))) return;
    const version = ++noteMotionVersion;
    const notes = tones.map((toneNote, index) => ({
      id: `octave-${token}-${version}-${index}`, toneNote, leftPercent: 55,
      label: labelled ? toneNote.replace(/\d+$/, '') : '', slideIn: true, instant: seeking,
    }));
    const arrival = waitForNoteMotion(notes.map(note => note.id));
    displayNotes = notes;
    await arrival;
    if (isCurrentSequence(token)) displayNotes = displayNotes.map(note => ({ ...note, slideIn: false }));
  }

  async function slideDisplayNotesOut(token: number): Promise<void> {
    if (!isCurrentSequence(token) || (!seeking && !(await waitForPlayback(token)))) return;
    const departure = waitForNoteMotion(displayNotes.map(note => note.id));
    displayNotes = displayNotes.map(note => ({ ...note, slideIn: false, slideOut: true, instant: seeking }));
    await departure;
    if (isCurrentSequence(token)) displayNotes = [];
  }

  async function slideReferenceIntoPractice(note: DisplayNote, leftPercent: number, token: number): Promise<void> {
    if (!isCurrentSequence(token) || (!seeking && !(await waitForPlayback(token)))) return;
    const arrival = waitForNoteMotion([note.id]);
    const musicalWidth = Math.max(0, viewportWidth - legendWidth);
    // Keep the existing keyed note mounted; the shared action moves it to the question.
    displayNotes = [{ ...note, slideIn: false, slideOut: false, instant: seeking,
      columnShift: (leftPercent - note.leftPercent) / 100 * musicalWidth / cellWidth }];
    await arrival;
    if (!isCurrentSequence(token)) return;
    // Rebase the resting position before future exits so accumulated pairs stay aligned.
    displayNotes = [{ ...note, leftPercent, slideIn: false, slideOut: false, columnShift: undefined, instant: seeking }];
  }

  function cancelGridMotion(): void {
    gridMaskVersion++;
    gridSlideVersion++;
    resolveGridMask?.(); resolveGridMask = null;
    resolveGridSlide?.(); resolveGridSlide = null;
  }

  function cancelBoundaryArrow(): void {
    boundaryArrowVersion++;
    resolveBoundaryArrow?.(); resolveBoundaryArrow = null;
    boundaryArrow = null;
  }

  function boundaryArrowArrived(version: number, token: number): void {
    if (version !== boundaryArrowVersion || !isCurrentSequence(token)) return;
    resolveBoundaryArrow?.(); resolveBoundaryArrow = null;
  }

  async function moveBoundaryArrow(token: number): Promise<void> {
    const instant = seeking || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const frames = instant ? 1 : 40;
    for (let frame = 1; frame <= frames; frame++) {
      if (!instant && !(await waitMs(650 / frames, token))) return;
      if (!isCurrentSequence(token) || !boundaryArrow) return;
      const progress = frame / frames;
      boundaryArrow.progress = progress * progress * (3 - 2 * progress);
    }
  }

  async function explainOctaveBoundary(token: number): Promise<void> {
    if (!isCurrentSequence(token) || (!seeking && !(await waitForPlayback(token)))) return;
    boundaryArrowVersion++;
    const arrival = seeking ? Promise.resolve() : new Promise<void>(resolve => { resolveBoundaryArrow = resolve; });
    boundaryArrow = { entering: true, progress: 0, instant: seeking };
    await Promise.all([arrival, say('Notice that the octave number changes when we move from B',
      'Notice that the octave number changes when we move from B', token)]);
    if (!isCurrentSequence(token) || !boundaryArrow) return;
    boundaryArrow.entering = false;
    if (!(await waitMs(650, token))) return;
    await Promise.all([moveBoundaryArrow(token), say('Notice that the octave number changes when we move from B to C.',
      'to C.', token)]);
    if (!isCurrentSequence(token)) return;
    await waitMs(450, token);
  }

  async function revealOctaveLegend(token: number): Promise<void> {
    if (!isCurrentSequence(token)) return;
    if (seeking || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      legendOctaveLabelProgress = 1;
      return;
    }
    // The lesson clock pauses and cancels these frames alongside speech and grid motion.
    const frames = 40;
    for (let frame = 1; frame <= frames; frame++) {
      if (!(await waitMs(650 / frames, token))) return;
      const progress = frame / frames;
      legendOctaveLabelProgress = progress * progress * (3 - 2 * progress);
    }
  }

  async function morphToPianoGrid(token: number): Promise<void> {
    if (!isCurrentSequence(token) || (!seeking && !(await waitForPlayback(token)))) return;
    pianoGridMorph = { from: { ...gridLayout }, progress: 0 };
    const instant = seeking || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const frames = instant ? 1 : 60;
    for (let frame = 1; frame <= frames; frame++) {
      if (!instant && !(await waitMs(1000 / frames, token))) return;
      if (!isCurrentSequence(token) || !pianoGridMorph) return;
      const progress = frame / frames;
      pianoGridMorph.progress = progress * progress * (3 - 2 * progress);
      legendOctaveLabelProgress = 1 - pianoGridMorph.progress;
    }
  }

  function waitForGridMask(): Promise<void> {
    gridMaskVersion++;
    if (seeking) return Promise.resolve();
    return new Promise<void>(resolve => { resolveGridMask = resolve; });
  }

  function gridMaskArrived(version: number, token: number): void {
    if (version !== gridMaskVersion || !isCurrentSequence(token)) return;
    resolveGridMask?.(); resolveGridMask = null;
  }

  function gridSlideArrived(version: number, token: number): void {
    if (version !== gridSlideVersion || !isCurrentSequence(token)) return;
    resolveGridSlide?.(); resolveGridSlide = null;
  }

  async function prepareLetterCycleGrid(token: number): Promise<void> {
    if (!isCurrentSequence(token) || (!seeking && !(await waitForPlayback(token)))) return;
    gridMaskInstant = seeking;
    gridSlideVersion++;
    const slide = seeking ? Promise.resolve() : new Promise<void>(resolve => { resolveGridSlide = resolve; });
    const futureRows = selectPitchRows(letterRangeMinMidi, letterLayoutMaxMidi).length;
    // Align the current rows with the lower portion of the centered, expanded grid.
    gridVerticalShift = (futureRows - displayRowCount) / 2 * cellWidth;
    await slide;
  }

  async function prepareOctaveNumberGrid(token: number): Promise<void> {
    if (!isCurrentSequence(token) || (!seeking && !(await waitForPlayback(token)))) return;
    const trim = waitForGridMask();
    gridMaskInstant = seeking;
    octaveGridMinMidi = 60;
    await trim;
    if (!isCurrentSequence(token)) return;
    const futureRows = selectPitchRows(60, 84).length;
    const initialRows = selectPitchRows(60, 72).length;
    gridSlideVersion++;
    const slide = seeking ? Promise.resolve() : new Promise<void>(resolve => { resolveGridSlide = resolve; });
    // Match the visible C4–C5 portion of the centered, pre-rendered C4–C6 grid.
    gridVerticalShift = ((displayRowCount - futureRows) / 2 + futureRows - initialRows) * cellWidth;
    await slide;
  }

  function clearBlackKeyLabels(): void {
    blackKeyLabelVersion++;
    resolveLegendArrival?.(); resolveLegendArrival = null;
    blackKeyLabels = [];
    hiddenLegendMidi = new Set();
  }

  function cancelLetterArrival(): void {
    arrivingLetterNoteId = null;
    resolveLetterArrival?.();
    resolveLetterArrival = null;
  }

  function letterNoteArrived(id: string): void {
    if (id !== arrivingLetterNoteId) return;
    cancelLetterArrival();
  }

  async function introduceLetterPosition(example: typeof letterPositionExamples[number], token: number): Promise<void> {
    if (!isCurrentSequence(token)) return;
    if (!seeking && !(await waitForPlayback(token))) return;
    const id = `letter-position-${example.toneNote}-${token}`;
    const arrival = seeking ? Promise.resolve() : new Promise<void>(resolve => {
      arrivingLetterNoteId = id;
      resolveLetterArrival = resolve;
    });
    displayNotes = [...displayNotes, {
      id, toneNote: example.toneNote, label: example.toneNote.slice(0, -1),
      leftPercent: 0, columnOffset: 2, slideIn: true, instant: seeking,
    }];
    await Promise.all([arrival, say(example.text, example.spokenText, token)]);
    if (isCurrentSequence(token)) {
      displayNotes = displayNotes.map(note => note.id === id ? { ...note, slideIn: false } : note);
    }
  }

  async function shiftLetterLineNotes(token: number): Promise<void> {
    if (!isCurrentSequence(token) || (!seeking && !(await waitForPlayback(token)))) return;
    const ids = displayNotes.map(note => note.id);
    const shifted = waitForNoteMotion(ids);
    displayNotes = displayNotes.map(note => ({ ...note, slideIn: false, columnShift: 2, instant: seeking }));
    await shifted;
  }

  async function runLetterPositions(token: number): Promise<void> {
    setDisplayNotes([]);
    for (const example of letterPositionExamples) {
      if (!isCurrentSequence(token)) return;
      mark('letter-lines-spaces', example.id);
      if (example.id === 'space-A3') {
        await Promise.all([shiftLetterLineNotes(token), introduceLetterPosition(example, token)]);
      } else await introduceLetterPosition(example, token);
    }
    if (!isCurrentSequence(token)) return;
    if (!(await waitMs(lessonPacing.afterExerciseMs, token))) return;
    mark('letter-lines-spaces', 'slide-out');
    await slideDisplayNotesOut(token);
  }

  function blackKeyLabelArrived(version: number, token: number): void {
    if (version !== blackKeyLabelVersion || !isCurrentSequence(token)) return;
    resolveLegendArrival?.(); resolveLegendArrival = null;
  }

  function showBlackKeyNote(toneNote: string): void {
    if (displayNotes.some(note => note.toneNote === toneNote)) return;
    displayNotes = [...displayNotes, {
      id: `black-${toneNote}`, toneNote, label: '', leftPercent: 0,
      columnOffset: 1 + blackKeyNoteColumns / 2,
    }];
  }

  function addBlackKeyNoteName(toneNote: string, spelling: 'flat' | 'sharp'): void {
    const row = sourceRowByTone.get(toneNote);
    if (!row) return;
    const name = (spelling === 'flat' ? row.flatName : row.sharpName).replace(/\d+$/, '');
    displayNotes = displayNotes.map(note => {
      if (note.toneNote !== toneNote) return note;
      const names = note.label ? note.label.split('/') : [];
      if (names.includes(name)) return note;
      const label = [...names, name].join('/');
      return { ...note, label, highlighted: true, widthColumns: names.length > 0 ? blackKeyNoteColumns : undefined };
    });
  }

  async function revealBlackKeyLabel(toneNote: string, text: string, token: number, sourceToneNote?: string): Promise<void> {
    if (!isCurrentSequence(token)) return;
    showBlackKeyNote(toneNote);
    const version = ++blackKeyLabelVersion;
    const instant = seeking;
    const arrival = instant ? Promise.resolve() : new Promise<void>(resolve => { resolveLegendArrival = resolve; });
    blackKeyLabels = [...blackKeyLabels.filter(label => label.toneNote !== toneNote),
      { toneNote, text: text.replace(/\d+$/, ''), version, instant, token, sourceToneNote }];
    await arrival;
    if (!isCurrentSequence(token)) return;
    if (text.includes('♭')) addBlackKeyNoteName(toneNote, 'flat');
    if (text.includes('♯')) addBlackKeyNoteName(toneNote, 'sharp');
    await playTone(toneNote, token);
  }

  async function runBlackKeysIntroduction(token: number): Promise<void> {
    setDisplayNotes([]);
    letterLegendOnly = false;
    accidentalMode = { sharp: true, flat: true };
    // Animated replacements own both the background and text of these cells.
    const hiddenAccidentalCells = new Set<number>();
    for (const row of displayRows) {
      if (row.isAccidental && typeof row.midi === 'number') hiddenAccidentalCells.add(row.midi);
    }
    hiddenLegendMidi = hiddenAccidentalCells;
    upperNarrationText = '';
    animateSpeechPromotion = false;
    mark('black-keys', 'introduction');
    await say(...blackKeySpeech.introduction, token);
    if (!isCurrentSequence(token)) return;
    pianoPlayback = true;
    for (const toneNote of blackKeyIntroduction) {
      mark('black-keys', `play-${toneNote}`);
      showBlackKeyNote(toneNote);
      await playTone(toneNote, token);
      if (!(await waitMs(lessonPacing.betweenNotesMs, token))) return;
    }
    mark('black-keys', 'two-names');
    await say(...blackKeySpeech.twoNames, token);
    if (!isCurrentSequence(token)) return;

    mark('black-keys', 'flat-label');
    mark('black-keys', 'flat-example');
    await Promise.all([revealBlackKeyLabel('Ab4', 'A♭', token, 'A4'), say(...blackKeySpeech.flatExample, token)]);
    if (!isCurrentSequence(token)) return;
    mark('black-keys', 'flat-direction');
    upperNarrationText = narrationText;
    animateSpeechPromotion = !seeking;
    await say(...blackKeySpeech.flatDirection, token);
    if (!isCurrentSequence(token)) return;

    mark('black-keys', 'sharp-label');
    upperNarrationText = '';
    animateSpeechPromotion = false;
    mark('black-keys', 'sharp-example');
    await Promise.all([revealBlackKeyLabel('Ab4', 'G♯', token, 'G4'), say(...blackKeySpeech.sharpExample, token)]);
    if (!isCurrentSequence(token)) return;
    mark('black-keys', 'sharp-direction');
    upperNarrationText = narrationText;
    animateSpeechPromotion = !seeking;
    await say(...blackKeySpeech.sharpDirection, token);
    if (!isCurrentSequence(token)) return;

    for (const toneNote of blackKeyDescent) {
      mark('black-keys', `descend-${toneNote}`);
      const row = sourceRowByTone.get(toneNote)!;
      await revealBlackKeyLabel(toneNote, row.pitch, token);
      if (!(await waitMs(lessonPacing.betweenNotesMs, token))) return;
    }
    pianoPlayback = false;
    upperNarrationText = '';
    animateSpeechPromotion = false;
    clearBlackKeyLabels();
    legendMidiLabelOverrides = new Map();
  }

  async function runAccidentals(token: number): Promise<void> {
    gridKind = 'chromatic-c';
    letterLegendOnly = true;
    accidentalMode = { sharp: false, flat: false };
    const naturalNotes = [...pianoWhiteKeys];
    setDisplayNotes(naturalNotes.map((toneNote, index) => ({
      toneNote, label: toneNote.slice(0, -1), leftPercent: (1 + index * 2) * 100 / layoutGridColumnCount,
    })));
    mark('white-keys', 'letter-names');
    await say('We are now familiar with notes that have simple letter names.', 'We are now familiar with notes that have simple letter names.', token);
    if (!isCurrentSequence(token)) return;
    mark('white-keys', 'grid-playback');
    await playSequence(naturalNotes, token, false);
    if (!(await waitMs(lessonPacing.afterExerciseMs, token))) return;
    mark('white-keys', 'piano');
    pianoSlideVersion++;
    pianoEntering = !seeking;
    const pianoArrival = new Promise<void>(resolve => {
      if (pianoEntering) resolvePianoArrival = resolve;
      else resolve();
    });
    showPiano = true;
    await say('On a piano, these are all the white keys.', 'On a piano, these are all the white keys.', token);
    await pianoArrival;
    if (!isCurrentSequence(token)) return;
    mark('white-keys', 'piano-playback');
    pianoPlayback = true;
    await playSequence(naturalNotes, token, false);
    if (!isCurrentSequence(token)) return;
    pianoPlayback = false;
    if (!(await waitMs(lessonPacing.afterExerciseMs, token))) return;
    mark('white-keys', 'remaining-pitches');
    await say("Now we're going to learn the names of the rest of the pitches.", "Now we're going to learn the names of the rest of the pitches.", token);
    if (!isCurrentSequence(token)) return;
    await runBlackKeysIntroduction(token);
    if (!isCurrentSequence(token)) return;
    hidePiano();
    mark('black-keys', 'finish');
    await finishSection(token);
    inspector?.status('completed');
  }

  async function runPractice(token: number): Promise<void> {
    gridKind = 'practice';
    letterLegendOnly = false;
    accidentalMode = { sharp: true, flat: true };
    mark('practice-intro', 'start');
    await say('Let’s practice!', 'Let us practice!', token);
    if (!isCurrentSequence(token)) return;
    for (const question of combinedPracticeQuestions) {
      mark('combined-names', `place-${question.toneNote}`);
      await askPlacement(question, token);
      if (!isCurrentSequence(token)) return;
    }

    accidentalMode = { sharp: false, flat: true };
    for (const question of flatPracticeQuestions) {
      mark('flat-practice', `place-${question.toneNote}`);
      await askPlacement(question, token);
      if (!isCurrentSequence(token)) return;
    }

    accidentalMode = { sharp: true, flat: false };
    for (const question of sharpPracticeQuestions) {
      mark('sharp-practice', `place-${question.toneNote}`);
      await askPlacement(question, token);
      if (!isCurrentSequence(token)) return;
    }
    mark('sharp-practice', 'finish');
    await finishSection(token);
    inspector?.status('completed');
  }

  async function runSection(token: number): Promise<void> {
    switch (section.id) {
      case 'letter-names':
        await runLetterNames(token);
        break;
      case 'letter-cycle':
        await runLetterCycle(token);
        break;
      case 'octaves':
        await runOctaves(token);
        break;
      case 'octave-numbers':
        await runOctaveNumbers(token);
        break;
      case 'accidentals':
        await runAccidentals(token);
        break;
      case 'naming-practice':
        await runPractice(token);
        break;
      default:
        await say(section.description, section.description, token);
    }
  }

  function handleAvatarReady(): void {
    avatarReady = true;
  }

  let runningSectionId: string | null = null;
  $effect(() => {
    const sectionId = section.id;
    const ready = avatarReady;
    const plan = cuePlan;
    if (!ready || runningSectionId === sectionId) return;
    untrack(() => {
      if (runningSectionId !== null) {
        sequenceToken++;
        questionNarration.submit();
        cancelLessonAvatarSpeech();
        clock.cancel();
        resolveResponse();
        stopVoice();
        resetForSeek();
      }
      runningSectionId = sectionId;
      unregisterInspector?.();
      unregisterInspector = inspector?.register(plan, seekTo);
      sequenceStarted = true;
      const token = ++sequenceToken;
      void runSection(token);
    });
  });

  $effect(() => {
    clock.setPaused(!isPlaying);
    if (!isPlaying) cancelPlacementGesture();
    if (!audioContext || audioContext.state === 'closed') return;
    if (isPlaying) void audioContext.resume().catch(() => {});
    else void audioContext.suspend().catch(() => {});
  });

  onDestroy(() => {
    unregisterInspector?.();
    sequenceToken += 1;
    cancelBoundaryArrow();
    cancelLetterArrival();
    cancelNoteMotion();
    cancelGridMotion();
    hidePiano();
    clearBlackKeyLabels();
    questionNarration.submit();
    cancelPlacementGesture();
    clock.cancel();
    resolveResponse();
    stopVoice();
    cancelLessonAvatarSpeech();
    if (audioContext && audioContext.state !== 'closed') void audioContext.close();
  });
  $effect(() => audioOutput.setVolume(volume));
</script>

<div
  class="lesson-12-scene"
  class:is-paused={!isPlaying}
  style={`--legend-width:${legendWidth}px; --lesson-note-size:${noteSize}px;`}
>
  <div class="lesson-12-support">
    <div class="question-avatar-anchor">
      <LessonAvatarDock
        character="grammy"
        speechText={narrationText}
        upperSpeechText={upperNarrationText}
        {animateSpeechPromotion}
        paused={!isPlaying}
        {underlinedWords}
        on:ready={handleAvatarReady}
      />

      {#if interaction === 'choice'}
        <div class="choice-answers" aria-label={activePromptText}>
          {#each choiceOptions as option (option.label)}
            <button
              class={selectedChoiceLabel === option.label && choiceFeedbackState
                ? `is-${choiceFeedbackState}`
                : ''}
              type="button"
              disabled={answerLocked || !isPlaying}
              aria-label={option.spokenLabel ?? option.label}
              onclick={() => void handleChoice(option)}
            >
              {option.label}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <section
    class={`lesson-12-workspace ${feedbackState ? `is-${feedbackState}` : ''}`}
    aria-label={`${section.code} ${section.label}`}
  >
    <div class="mlt-lesson-grid-frame pitch-grid-frame" class:is-compact={compactGrid} bind:clientWidth={frameWidth} bind:clientHeight={frameHeight}>
      <div class="compact-grid-measure" aria-hidden="true" bind:clientWidth={compactGridWidth}></div>
      <div class="pitch-grid-stage" class:is-preparing={!gridPresented} style:width={`${shellWidth}px`}
        style:translate={pianoMorphLayout ? `${pianoMorphLayout.x}px ${pianoMorphLayout.y}px` : undefined}>
      <div class="pitch-grid-shell"
        use:lessonGridMask={{ enabled: Boolean(pianoMorphLayout) || (revealLetterRange && letterGridRevealing) || (section.id === 'octaves' ? octaveGridMinMidi > 57 : section.id === 'octave-numbers' && octaveGridRevealing),
          top: pianoMorphLayout?.top ?? (revealLetterRange ? gridRevealTop : octaveGridMaskTop),
          bottom: pianoMorphLayout?.bottom ?? octaveGridMaskBottom,
          paused: !isPlaying, instant: Boolean(pianoMorphLayout) || gridMaskInstant,
          durationMs: revealLetterRange || section.id === 'octave-numbers' ? 1200 : undefined, replayKey: gridMaskVersion,
          onComplete: () => gridMaskArrived(gridMaskVersion, sequenceToken) }}
        use:lessonScreenSlide={{ direction: gridVerticalShift ? 'to-offset' : null, offset: { x: 0, y: gridVerticalShift },
          paused: !isPlaying, instant: gridMaskInstant, replayKey: gridSlideVersion,
          onComplete: () => gridSlideArrived(gridSlideVersion, sequenceToken) }}
        style:width={`${shellWidth}px`} style:height={`${shellHeight}px`}>
        <div
          class="pitch-grid-field"
          bind:clientWidth={viewportWidth}
          bind:clientHeight={viewportHeight}
        >
          {#if viewportWidth > 0 && viewportHeight > 0 && sequenceStarted}
            <div class="pitch-grid-render">
              <PitchGrid
                mode="singing"
                fullRowData={displayRows}
                viewport={pitchGridViewport}
                {cellWidth}
                {cellHeight}
                colorMode="color"
                {accidentalMode}
                showOctaveLabels={!compactGrid}
                showLegendLabels={true}
                showAccidentalLabels={true}
                showFrequencyLabels={false}
                showRightLegend={false}
                legendLabelOverrides={legendLabelOverrides}
                legendHighlight={placementLegendHighlight}
                {legendMidiLabelOverrides}
                {legendOctaveLabelProgress}
                {hiddenLegendMidi}
                {singingConfig}
                showHorizontalGridLines={true}
                extendHorizontalGridLinesBehindLegend={true}
                {...lessonGridAppearance}
                {...lesson12GridAppearance}
                showColumnGrid={false}
              />
            </div>

            <div class="accidental-legend-overlay" aria-hidden="true">
              {#each blackKeyLabels as label (label.version)}
                {@const row = sourceRowByTone.get(label.toneNote)!}
                <span class="accidental-legend-label"
                  style:top={`${rowCenter(label.toneNote)}%`}
                  style:left={row.column === 'B' ? '0%' : '50%'}
                  style:height={`${cellHeight}px`}
                  style:background-color={row.hex}
                  style:font-size={`${getLegendFontSize(cellWidth, cellHeight, label.text.length, legendPixelRatio)}px`}
                  style={`-webkit-text-stroke-width:${getLegendTextStrokeWidth(legendPixelRatio)}px`}
                  use:lesson12LegendMotion={{ color: row.hex, paused: !isPlaying, instant: label.instant,
                    source: label.sourceToneNote ? {
                      x: ((sourceRowByTone.get(label.sourceToneNote)!.column === 'B' ? 0 : 0.5) - (row.column === 'B' ? 0 : 0.5)) * legendWidth,
                      y: (rowCenter(label.sourceToneNote) - rowCenter(label.toneNote)) / 100 * viewportHeight,
                      color: sourceRowByTone.get(label.sourceToneNote)!.hex,
                    } : undefined,
                    onComplete: () => blackKeyLabelArrived(label.version, label.token) }}>
                  <span class="accidental-legend-text">{label.text}</span>
                </span>
              {/each}
            </div>

            <div class="pitch-grid-overlay">
              {#if interaction === 'placement'}
                <div
                  class="row-choice-layer"
                  class:is-free-placement={freeColumnPlacement}
                  bind:this={placementLayer}
                  use:lessonOutsidePlacement={{
                    enabled: !answerLocked && isPlaying && placementPointerId === null,
                    questionKey: `${sequenceToken}-${activeCueId}-${placementTargetTone}`,
                    onMove: updatePlacementPointer,
                    onDrop: (event) => finishPlacementPointer(event, true),
                    onCancel: () => { if (placementPointerId === null) placementPreviewTone = null; },
                  }}
                  aria-label={activePromptText}
                  onpointermove={updatePlacementPointer}
                  onpointerup={finishPlacementPointer}
                  onpointercancel={cancelPlacementGesture}
                  onlostpointercapture={() => { if (placementPointerId !== null) cancelPlacementGesture(); }}
                >
                  {#each displayRows as row (row.toneNote)}
                    <button
                      type="button"
                      style={`top:${rowCenter(row.toneNote)}%; height:${100 / (displayRowCount + 1)}%;`}
                      disabled={answerLocked || !isPlaying}
                      aria-label={`Choose the ${placementLabel(row.toneNote)} pitch row${freeColumnPlacement ? '; use Left and Right arrows to choose a column, then Enter to place' : ''}`}
                      onpointerenter={() => showPlacementPreview(row.toneNote)}
                      onpointerleave={() => hidePlacementPreview(row.toneNote)}
                      onfocus={() => showPlacementPreview(row.toneNote)}
                      onblur={() => hidePlacementPreview(row.toneNote)}
                      onpointerdown={beginPlacementPointer}
                      onkeydown={(event) => movePlacementColumn(event, row.toneNote)}
                      onclick={(event) => {
                        if (!freeColumnPlacement || event.detail === 0) void handleRowChoice(row.toneNote);
                      }}
                    ></button>
                  {/each}
                </div>
              {/if}

              {#if interaction === 'placement' && placementPreviewTone && !hasCurrentPlacementNote}
                {@const previewRow = sourceRowByTone.get(placementPreviewTone)}
                <span
                  class={`mlt-lesson-note lesson-pitch-note mlt-lesson-note--preview ${placementPointerId !== null ? 'is-active' : ''}`}
                  use:lessonNoteAppearance={{ audioOutput, cellWidth, frequency: previewRow?.frequency }}
                  style:top={`${rowCenter(placementPreviewTone)}%`}
                  style:left={`${placementLeftPercent}%`}
                  style:color={previewRow?.hex ?? '#6a5140'}
                  aria-hidden="true"
                ></span>
              {/if}

              {#if questionNote}
                {@const questionRow = sourceRowByTone.get(questionNote.toneNote)}
                <span
                  class="mlt-lesson-note lesson-pitch-note is-current is-question-note"
                  use:lessonNoteAppearance={{ audioOutput, cellWidth, frequency: questionRow?.frequency }}
                  style:top={`${rowCenter(questionNote.toneNote)}%`}
                  style:left={`${questionNote.leftPercent + (questionNote.columnOffset ?? 0) * 100 / layoutGridColumnCount}%`}
                  style:color={questionRow?.hex ?? '#6a5140'}
                  aria-hidden="true"
                >
                  <span class="mlt-lesson-note-label" class:mlt-lesson-note-label--question={questionNote.label === '?'}>{questionNote.label}</span>
                </span>
              {/if}

              {#if transientChoiceNote}
                {@const transientRow = sourceRowByTone.get(transientChoiceNote.toneNote)}
                <span
                  class="mlt-lesson-note lesson-pitch-note mlt-lesson-note--incorrect"
                  use:lessonNoteAppearance={{ audioOutput, cellWidth, frequency: transientRow?.frequency }}
                  style:top={`${rowCenter(transientChoiceNote.toneNote)}%`}
                  style:left={`${transientChoiceNote.leftPercent + (transientChoiceNote.columnOffset ?? 0) * 100 / layoutGridColumnCount}%`}
                  style:color={transientRow?.hex ?? '#6a5140'}
                  aria-hidden="true"
                >
                  <span class="mlt-lesson-note-label">{transientChoiceNote.label}</span>
                </span>
              {/if}

              {#each displayNotes as note (note.id)}
                {@const row = sourceRowByTone.get(note.toneNote)}
                {#if note.clickable || freeColumnPlacement}
                  <button
                    class={`mlt-lesson-note lesson-pitch-note is-clickable ${activeToneNote === note.toneNote ? 'is-active' : ''} ${note.label.length > 5 ? 'has-long-label' : ''}`}
                    class:mlt-lesson-note--capsule={Boolean(note.widthColumns)}
                    use:lessonNoteAppearance={{ audioOutput, cellWidth, frequency: row?.frequency, highlighted: note.highlighted || heldBlackKeyTone === note.toneNote,
                      shape: note.widthColumns ? 'capsule' : 'circle' }}
                    use:lessonScreenSlide={{ direction: note.slideOut ? 'exit-right' : note.slideIn ? 'enter-left' : note.columnShift ? 'to-offset' : null,
                      offset: { x: (note.columnShift ?? 0) * cellWidth, y: 0 }, instant: note.instant,
                      paused: !isPlaying, onComplete: () => { letterNoteArrived(note.id); noteMotionArrived(note.id); } }}
                    type="button"
                    style:top={`${rowCenter(note.toneNote)}%`}
                    style:left={`${note.leftPercent + (note.columnOffset ?? 0) * 100 / layoutGridColumnCount}%`}
                    style:color={row?.hex ?? '#6a5140'}
                    style:width={note.widthColumns ? `${note.widthColumns * cellWidth}px` : undefined}
                    disabled={answerLocked || !isPlaying}
                    aria-label={`${note.clickable ? 'Choose' : 'Play'} the note at ${row?.flatName ?? note.toneNote}`}
                    onclick={() => {
                      if (note.clickable) void handleNoteChoice(note.toneNote);
                      else void playTone(note.toneNote, sequenceToken);
                    }}
                  >
                    <span class="mlt-lesson-note-label">{note.label}</span>
                  </button>
                {:else}
                  <span
                    class={`mlt-lesson-note lesson-pitch-note ${activeToneNote === note.toneNote ? 'is-active' : ''} ${note.label.length > 5 ? 'has-long-label' : ''}`}
                    class:mlt-lesson-note--capsule={Boolean(note.widthColumns)}
                    use:lessonNoteAppearance={{ audioOutput, cellWidth, frequency: row?.frequency, highlighted: note.highlighted || heldBlackKeyTone === note.toneNote,
                      shape: note.widthColumns ? 'capsule' : 'circle' }}
                    use:lessonScreenSlide={{ direction: note.slideOut ? 'exit-right' : note.slideIn ? 'enter-left' : note.columnShift ? 'to-offset' : null,
                      offset: { x: (note.columnShift ?? 0) * cellWidth, y: 0 }, instant: note.instant,
                      paused: !isPlaying, onComplete: () => { letterNoteArrived(note.id); noteMotionArrived(note.id); } }}
                    style:top={`${rowCenter(note.toneNote)}%`}
                    style:left={`${note.leftPercent + (note.columnOffset ?? 0) * 100 / layoutGridColumnCount}%`}
                    style:color={row?.hex ?? '#6a5140'}
                    style:width={note.widthColumns ? `${note.widthColumns * cellWidth}px` : undefined}
                    aria-hidden="true"
                  >
                    <span class="mlt-lesson-note-label">{note.label}</span>
                  </span>
                {/if}
              {/each}

              {#if boundaryArrow && boundaryArrowPoints}
                {#key boundaryArrowVersion}
                  {@const arrowVersion = boundaryArrowVersion}
                  {@const arrowToken = sequenceToken}
                  <PitchGridArrow start={boundaryArrowPoints.start} end={boundaryArrowPoints.end} {cellWidth}
                    entering={boundaryArrow.entering} instant={boundaryArrow.instant} paused={!isPlaying}
                    onArrive={() => boundaryArrowArrived(arrowVersion, arrowToken)} />
                {/key}
              {/if}

              {#if showOctaveBracket}
                <PitchDistanceBracket side="right" top={rowCenter('A4')}
                  height={rowCenter('A3') - rowCenter('A4')}
                  left="calc(55% + var(--lesson-note-size) / 2 + 0.4rem)" />
              {/if}

            </div>
          {/if}
        </div>

        {#if legendSpotlight}
          <div class="legend-spotlight" aria-hidden="true"></div>
        {/if}
      </div>
      {#if compactGrid || pianoGridMorph}
        <div class="piano-space" bind:clientHeight={pianoSpaceHeight}>
          {#if showPiano}
            <div class="piano-reveal" use:lessonScreenSlide={{ direction: pianoEntering ? 'enter-right' : null, paused: !isPlaying,
              replayKey: pianoSlideVersion, onComplete: () => pianoArrived(pianoSlideVersion, sequenceToken) }}>
              <PianoKeyboard minMidi={pianoLessonRange.minMidi} maxMidi={pianoLessonRange.maxMidi}
                showLabels showOctaveLabels={false} labelFontSize={pianoLabelSize} visibleLabelMidi={visiblePianoLabelMidi}
                activeMidi={pianoActiveMidi} />
            </div>
          {/if}
        </div>
      {/if}
      </div>
    </div>
  </section>
</div>

<style>
  .pitch-grid-stage { max-width: 100%; }
  .piano-space { --piano-keyboard-height: clamp(5.75rem, 13.5vw, 9rem); height: calc(var(--piano-keyboard-height) + .75rem); padding-top: .75rem; box-sizing: border-box; }
  .piano-reveal { width: 100%; margin-inline: auto; }

  .is-paused :global(*) { animation-play-state: paused !important; }
  .lesson-12-scene {
    display: grid;
    grid-template-columns: minmax(16rem, 20rem) minmax(0, 1fr);
    gap: 1rem;
    align-items: stretch;
    min-height: 0;
  }

  .lesson-12-support {
    position: relative;
    box-sizing: border-box;
    padding-bottom: 4.25rem;
    min-height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
  }

  .question-avatar-anchor {
    position: relative;
    width: min(18rem, 100%);
  }

  .choice-answers {
    position: absolute;
    top: calc(100% + 1rem);
    left: 50%;
    transform: translateX(-50%);
    width: min(18rem, 100%);
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }

  .choice-answers button {
    min-height: 3.25rem;
    padding: 0.7rem 0.85rem;
    border: 2px solid rgba(84, 65, 39, 0.2);
    border-radius: 1rem;
    background: rgba(255, 255, 255, 0.94);
    color: #29353c;
    font: inherit;
    font-size: 1.25rem;
    font-weight: 900;
    cursor: pointer;
    box-shadow: 0 8px 18px rgba(49, 36, 23, 0.08);
    transition:
      transform 0.15s ease,
      border-color 0.15s ease,
      box-shadow 0.15s ease;
  }

  .choice-answers button:hover:not(:disabled),
  .choice-answers button:focus-visible {
    transform: translateY(-2px);
    border-color: rgba(61, 121, 170, 0.55);
    box-shadow: 0 10px 22px rgba(49, 36, 23, 0.13);
  }

  .choice-answers button:disabled {
    cursor: default;
    opacity: 0.72;
  }

  .choice-answers button.is-correct {
    border-color: #2f9d55;
    background: #71dc8f;
    color: #102b18;
    box-shadow: 0 0 0 3px rgba(47, 157, 85, 0.2);
    opacity: 1;
  }

  .choice-answers button.is-incorrect {
    border-color: #d0a92f;
    background: #ffe178;
    color: #3e3107;
    box-shadow: 0 0 0 3px rgba(208, 169, 47, 0.2);
    opacity: 1;
  }

  .lesson-12-workspace {
    min-width: 0;
    min-height: 0;
    width: 100%;
    max-width: 100%;
    justify-self: stretch;
    align-self: start;
    padding: 0;
  }

  .lesson-12-workspace.is-success .pitch-grid-field {
    border-color: rgba(66, 151, 94, 0.35);
    box-shadow: var(--amt-shadow), 0 0 0 2px rgba(66, 151, 94, 0.15);
  }

  .lesson-12-workspace.is-error .pitch-grid-field {
    border-color: rgba(201, 90, 77, 0.34);
    box-shadow: var(--amt-shadow), 0 0 0 2px rgba(201, 90, 77, 0.13);
  }

  .pitch-grid-frame {
    position: relative;
    width: 100%;
    height: calc(clamp(35rem, calc(100svh - 10rem), 54rem) + 2rem);
  }

  .compact-grid-measure { position: absolute; width: min(100%, 36rem); height: 0; pointer-events: none; }
  .pitch-grid-frame.is-compact { justify-content: center; }

  .pitch-grid-stage.is-preparing { visibility: hidden; }

  .pitch-grid-shell {
    position: relative;
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
    outline: 1px solid rgba(84, 65, 39, 0.14);
    outline-offset: -1px;
    box-shadow: var(--amt-shadow);
    transition: border-color 0.16s ease, box-shadow 0.16s ease;
    border-radius: 22px;
    background:
      radial-gradient(580px 260px at 100% 8%, rgba(78, 176, 226, 0.06), transparent 62%),
      radial-gradient(620px 260px at 0% 100%, rgba(202, 187, 102, 0.06), transparent 64%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(247, 241, 231, 0.94));
  }

  .pitch-grid-render {
    position: absolute;
    z-index: 1;
    inset: 0;
    overflow: hidden;
    border-radius: 22px;
  }

  .accidental-legend-overlay { position: absolute; inset: 0 auto 0 0; width: var(--legend-width); z-index: 7; pointer-events: none; }
  .accidental-legend-label {
    position: absolute; width: 50%; display: grid; place-items: center; transform: translateY(-50%); text-align: center; white-space: nowrap;
    font-family: 'Atkinson Hyperlegible Next', sans-serif; font-weight: 700; line-height: 1;
    color: white; -webkit-text-stroke: 1.2px #212529; paint-order: stroke fill;
  }

  .legend-spotlight {
    position: absolute;
    z-index: 10;
    top: -5px;
    bottom: -5px;
    left: -5px;
    width: calc(var(--legend-width) + 10px);
    box-sizing: border-box;
    border: 4px solid rgba(255, 209, 60, 0.88);
    border-radius: 27px 4px 4px 27px;
    background: transparent;
    box-shadow:
      0 0 0 2px rgba(255, 255, 255, 0.76),
      0 0 24px rgba(245, 188, 42, 0.5);
    pointer-events: none;
    animation: legend-pulse 1.4s ease-in-out infinite;
  }

  .pitch-grid-overlay {
    position: absolute;
    z-index: 6;
    inset: 0 0 0 var(--legend-width);
    pointer-events: none;
  }

  .row-choice-layer {
    position: absolute;
    inset: 0;
    pointer-events: auto;
  }

  .row-choice-layer.is-free-placement {
    touch-action: none;
  }

  .row-choice-layer button {
    position: absolute;
    left: 0;
    width: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    transform: translateY(-50%);
    cursor: crosshair;
  }

  .row-choice-layer button:focus {
    outline: none;
  }

  .row-choice-layer button:disabled {
    cursor: default;
  }

  .lesson-pitch-note {
    position: absolute;
    z-index: 4;
    width: var(--lesson-note-size);
    height: var(--lesson-note-size);
    display: grid;
    place-items: center;
    padding: 0;


    color: #6a5140;
    transform: translate(-50%, -50%);
    pointer-events: none;
    transition:
      width 0.18s ease,
      background-color 0.15s ease,
      box-shadow 0.15s ease,
      transform 0.15s ease;
  }

  button.lesson-pitch-note.is-clickable {
    appearance: none;
    pointer-events: auto;
    cursor: pointer;
  }






  @keyframes legend-pulse {
    0%,
    100% {
      box-shadow:
        0 0 0 2px rgba(255, 255, 255, 0.76),
        0 0 18px rgba(245, 188, 42, 0.4);
    }
    50% {
      box-shadow:
        0 0 0 2px rgba(255, 255, 255, 0.86),
        0 0 30px rgba(245, 188, 42, 0.7);
    }
  }


  @media (max-width: 980px) {
    .lesson-12-scene {
      grid-template-columns: 1fr;
    }

    .lesson-12-support {
      min-height: auto;
    }

    .pitch-grid-frame {
      height: calc(clamp(30rem, calc(100svh - 12rem), 45rem) + 2rem);
    }
  }

  @media (max-width: 720px) {
    .lesson-12-scene {
      gap: 0.7rem;
    }

    .lesson-12-support {
      width: 100%;
      gap: 0.65rem;
    }

    .pitch-grid-frame {
      width: 100%;
      height: calc(clamp(22rem, 66svh, 34rem) + 1.3rem);
    }

    button.lesson-pitch-note.is-clickable::after {
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
    .pitch-grid-field {
      transition: none;
    }

    .legend-spotlight {
      animation: none;
    }

  
    .lesson-pitch-note,
    .choice-answers button {
      transition: none;
    }
  }
</style>
