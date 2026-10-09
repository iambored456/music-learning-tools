<script lang="ts">
  import { createLessonQuestion } from '@mlt/lesson-kit';
  const questionNarration = createLessonQuestion(cancelLessonAvatarSpeech, setLessonAvatarThinking);
  import "@mlt/lesson-kit/styles.css";
  import { lessonNoteAppearance, lessonPacing, lessonScreenSlide, lessonScreenSlideMs, lessonOutsidePlacement } from '@mlt/lesson-kit';
  import { lessonGridAppearance, calculateLessonGridLayout, createLessonAudioOutput } from '@mlt/lesson-kit';
  import { fullRowData } from '@mlt/pitch-data';
  import { PitchGrid } from '@mlt/ui-components/canvas';
  import type { PitchGridViewport, SingingModeConfig } from '@mlt/ui-components/canvas';
  import { getContext, onDestroy, onMount, tick } from 'svelte';
  import { lessonInspectorKey, type LessonCue, type LessonInspector } from './lessonInspector.svelte';
  import LessonAvatarDock from './LessonAvatarDock.svelte';
  import { setLessonAvatarThinking, cancelLessonAvatarSpeech, speakWithLessonAvatar } from './lessonAvatar';
  import type { LessonSection } from './lessons';
  import { lesson11PitchRange, lowIntroToneNotes, highIntroToneNotes, comparisonPairs, type ComparisonPair } from './lesson11PitchData';
  import lessonScoreFile from './lesson-assets/SN-score-April21.json';
  import { Lesson11Motion } from './lesson11Motion.svelte';
  import { comparisonFinishActions, comparisonFinishCheckpoint } from './lesson11MotionPlan';

  const audioOutput = createLessonAudioOutput();
  const motion = new Lesson11Motion();
  const inspector = getContext<LessonInspector | undefined>(lessonInspectorKey);
  let unregisterInspector: (() => void) | undefined;
  let activeInspectorCue: string | null = null;

  function cue(id: string, title: string, actions: Array<[string, string, string]>): LessonCue {
    return { id, title, prompt: '', visual: '', audio: '', gesture: '', input: '', completion: '', timing: {},
      actions: actions.map(([actionId, actionTitle, detail]) => ({ id: actionId, title: actionTitle, detail })) };
  }

  function mark(cueId: string, actionId: string): void {
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
  export let actionSkipSignal = 0;
  export let phase: 'musical-intro' | 'musical-outro' | 'placement' | 'comparison' = 'placement';
  export let onMusicalIntroComplete: (() => void) | undefined = undefined;
  export let onMusicalOutroComplete: (() => void) | undefined = undefined;
  export let onPlacementComplete: (() => void) | undefined = undefined;
  export let onComparisonComplete: (() => void) | undefined = undefined;
  const isMusicalScorePhase = phase === 'musical-intro' || phase === 'musical-outro';
  const isMusicalOutro = phase === 'musical-outro';
  const startsWithComparison =
    phase === 'comparison' || section.id === 'differentiate-pitches';

  type PitchRegion = 'upper' | 'lower';
  type PracticeTask = {
    id: string;
    badge: string;
    title: string;
    prompt: string;
    narration: string;
    target: PitchRegion;
    tones: number[];
    reinforcement: string;
    replayLabel: string;
  };

  type ScoreNoteShape = 'circle' | 'oval' | 'diamond';

  type ScorePlacedNote = {
    row: number;
    globalRow?: number;
    startColumnIndex: number;
    endColumnIndex: number;
    color: string;
    shape: ScoreNoteShape;
    isDrum?: boolean;
    uuid: string;
  };

  type ScoreSixteenthStampPlacement = {
    id: string;
    sixteenthStampId: number;
    startColumn: number;
    endColumn: number;
    row: number;
    globalRow?: number;
    color: string;
    timestamp: number;
    shapeOffsets?: Record<string, number>;
  };

  type ScoreData = {
    placedNotes: ScorePlacedNote[];
    sixteenthStampPlacements: ScoreSixteenthStampPlacement[];
    macrobeatGroupings: number[];
    macrobeatBoundaryStyles: string[];
    tempo: number;
  };

  type StudentNotationScoreFile = {
    type: 'student-notation-score';
    version: number;
    data: ScoreData;
  };

  type SixteenthStampDefinition = {
    id: number;
    diamonds: number[];
    ovals: number[];
  };

  type ScoreNoteRenderItem = {
    id: string;
    top: string;
    color: string;
    shape: ScoreNoteShape;
    leftPx: number;
    widthPx: number;
    heightPx: number;
    tailLeftPx: number;
    tailWidthPx: number;
    frequency?: number;
    isCapsule: boolean;
  };

  type ScoreStampRenderItem = {
    id: string;
    kind: 'diamond' | 'oval';
    frequency?: number;
    top: string;
    centerX: number;
    widthPx: number;
    heightPx: number;
    color: string;
  };

  type ScoreColumnGuide = {
    id: string;
    leftPx: number;
    boundaryStyle: string | null;
    isTerminal: boolean;
  };

  type ScorePlaybackEvent = {
    id: string;
    visualIds: string[];
    startSlot: number;
    durationMs: number;
    frequency: number;
  };

  type IntroExampleNoteRenderItem = {
    id: string;
    toneNote: string;
    top: string;
    left: string;
    color: string;
    isActive: boolean;
  };

  type ActiveVoice = {
    oscillator: OscillatorNode;
    gain: GainNode;
    stopped: boolean;
  };

  type NoteDragOrigin = 'avatar' | 'grid';

  type SettledComparisonNote = {
    id: string;
    toneNote: string;
    rowIndex: number;
    leftPercent: number;
    color: string;
  };

  type ComparisonFlightNote = SettledComparisonNote & {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    landed: boolean;
  };

  const pitchRows = fullRowData;
  const rowCount = pitchRows.length;
  const pitchGridFallbackColumnSize = 18;
  const pitchGridMinHitTargetSize = 32;
  const pitchGridMaxHitTargetSize = 48;
  const pitchGridSingingConfig: SingingModeConfig = { pitchHistory: [] };
  const lessonScore = (lessonScoreFile as StudentNotationScoreFile).data;
  const sixteenthStamps: SixteenthStampDefinition[] = [
    { id: 1, diamonds: [0], ovals: [] },
    { id: 2, diamonds: [1], ovals: [] },
    { id: 3, diamonds: [2], ovals: [] },
    { id: 4, diamonds: [3], ovals: [] },
    { id: 5, diamonds: [0, 1], ovals: [] },
    { id: 6, diamonds: [1, 2], ovals: [] },
    { id: 7, diamonds: [2, 3], ovals: [] },
    { id: 8, diamonds: [0, 2], ovals: [] },
    { id: 9, diamonds: [1, 3], ovals: [] },
    { id: 10, diamonds: [0, 1, 2], ovals: [] },
    { id: 11, diamonds: [1, 2, 3], ovals: [] },
    { id: 12, diamonds: [0, 1, 3], ovals: [] },
    { id: 13, diamonds: [0, 2, 3], ovals: [] },
    { id: 14, diamonds: [0, 3], ovals: [] },
    { id: 15, diamonds: [0, 1, 2, 3], ovals: [] },
  ];
  const sixteenthStampById = new Map(sixteenthStamps.map((stamp) => [stamp.id, stamp]));
  const rowIndexByTone = new Map(pitchRows.map((row, index) => [row.toneNote, index]));
  const introScoreViewportStartRow = rowIndexByTone.get(lesson11PitchRange.high) ?? 0;
  const introScoreViewportEndRow = rowIndexByTone.get(lesson11PitchRange.low) ?? rowCount - 1;
  const resetRowIndex = Math.floor((introScoreViewportStartRow + introScoreViewportEndRow) / 2);
  const resetY = 50;
  const introScoreViewportRowCount = Math.max(
    1,
    introScoreViewportEndRow - introScoreViewportStartRow + 1
  );
  const scoreStampDiamondViewBox = '0 0 25 100';
  const scoreStampDiamondPath = 'M 12.5 2 L 2 12.5 L 2 87.5 L 12.5 98 L 23 87.5 L 23 12.5 Z';
  const scoreTempo = Number.isFinite(lessonScore.tempo) && lessonScore.tempo > 0
    ? lessonScore.tempo
    : 66;
  const scoreQuarterMs = 60000 / scoreTempo;
  const scoreColumnDurationMs = scoreQuarterMs / 2;
  const scoreSlotDurationMs = scoreQuarterMs / 4;
  const scorePlaybackRate = isMusicalOutro ? 1.2 : 1;
  const scorePlaybackSlotDurationMs = scoreSlotDurationMs / scorePlaybackRate;
  const scoreTotalColumns = getScoreTotalColumns(lessonScore);
  const scoreTotalSlots = scoreTotalColumns * 2;
  const scoreBoundaryStylesByColumn = getScoreBoundaryStylesByColumn(lessonScore);
  const scorePlaybackEvents = buildScorePlaybackEvents(lessonScore);
  const scorePlaybackEventsBySlot = groupScoreEventsBySlot(scorePlaybackEvents);
  const dragPreviewThrottleMs = 40;

  function clampRowIndex(rowIndex: number): number {
    return Math.max(0, Math.min(rowCount - 1, Math.round(rowIndex)));
  }

  function getScoreTotalColumns(score: ScoreData): number {
    const groupedColumns = score.macrobeatGroupings.reduce((total, grouping) => total + grouping, 0);
    const lastNoteColumn = score.placedNotes.reduce(
      (maxColumn, note) => Math.max(maxColumn, note.endColumnIndex + 1),
      0
    );
    const lastStampColumn = score.sixteenthStampPlacements.reduce(
      (maxColumn, stamp) => Math.max(maxColumn, stamp.endColumn),
      0
    );
    return Math.max(1, groupedColumns, lastNoteColumn, lastStampColumn);
  }

  function getScoreBoundaryStylesByColumn(score: ScoreData): Map<number, string> {
    const styles = new Map<number, string>();
    let column = 0;
    score.macrobeatGroupings.forEach((grouping, index) => {
      column += grouping;
      styles.set(column, score.macrobeatBoundaryStyles[index] ?? 'solid');
    });
    return styles;
  }

  function getScoreNoteRow(note: ScorePlacedNote): number {
    return clampRowIndex(note.globalRow ?? note.row);
  }

  function getScoreStampBaseRow(stamp: ScoreSixteenthStampPlacement): number {
    return clampRowIndex(stamp.globalRow ?? stamp.row);
  }

  function getFrequencyForRow(rowIndex: number): number | null {
    const frequency = pitchRows[clampRowIndex(rowIndex)]?.frequency;
    return typeof frequency === 'number' && Number.isFinite(frequency) ? frequency : null;
  }

  function getFrequencyForToneNote(toneNote: string): number | null {
    const rowIndex = rowIndexByTone.get(toneNote);
    if (typeof rowIndex !== 'number') return null;
    return getFrequencyForRow(rowIndex);
  }

  function buildScorePlaybackEvents(score: ScoreData): ScorePlaybackEvent[] {
    const noteEvents = score.placedNotes
      .filter((note) => !note.isDrum)
      .map((note): ScorePlaybackEvent | null => {
        const frequency = getFrequencyForRow(getScoreNoteRow(note));
        if (!frequency) return null;
        const columnSpan = Math.max(1, note.endColumnIndex - note.startColumnIndex + 1);
        return {
          id: `note-${note.uuid}`,
          visualIds: [note.uuid],
          startSlot: Math.max(0, note.startColumnIndex * 2),
          durationMs: columnSpan * scoreColumnDurationMs * 0.92,
          frequency,
        };
      })
      .filter((event): event is ScorePlaybackEvent => event !== null);

    const stampEvents = score.sixteenthStampPlacements.flatMap((placement) => {
      const stamp = sixteenthStampById.get(placement.sixteenthStampId);
      if (!stamp) return [];

      const baseRow = getScoreStampBaseRow(placement);
      const events: ScorePlaybackEvent[] = [];
      for (const slot of stamp.diamonds) {
        const shapeKey = `diamond_${slot}`;
        const row = baseRow + (placement.shapeOffsets?.[shapeKey] ?? 0);
        const frequency = getFrequencyForRow(row);
        if (!frequency) continue;
        events.push({
          id: `stamp-${placement.id}-${shapeKey}`,
          visualIds: [`${placement.id}-${shapeKey}`],
          startSlot: Math.max(0, placement.startColumn * 2 + slot),
          durationMs: scoreSlotDurationMs * 0.92,
          frequency,
        });
      }

      for (const slot of stamp.ovals) {
        const shapeKey = `oval_${slot}`;
        const row = baseRow + (placement.shapeOffsets?.[shapeKey] ?? 0);
        const frequency = getFrequencyForRow(row);
        if (!frequency) continue;
        events.push({
          id: `stamp-${placement.id}-${shapeKey}`,
          visualIds: [`${placement.id}-${shapeKey}`],
          startSlot: Math.max(0, placement.startColumn * 2 + slot),
          durationMs: scoreSlotDurationMs * 2 * 0.92,
          frequency,
        });
      }

      return events;
    });

    return [...noteEvents, ...stampEvents].sort((a, b) => a.startSlot - b.startSlot);
  }

  function groupScoreEventsBySlot(events: ScorePlaybackEvent[]): Map<number, ScorePlaybackEvent[]> {
    const grouped = new Map<number, ScorePlaybackEvent[]>();
    for (const event of events) {
      const slotEvents = grouped.get(event.startSlot) ?? [];
      slotEvents.push(event);
      grouped.set(event.startSlot, slotEvents);
    }
    return grouped;
  }

  const tasks: PracticeTask[] = [
    {
      id: 'low-place',
      badge: 'Prompt 1',
      title: 'Move the note into the low half',
      prompt: 'Drag the note into the lower part of the pitch space.',
      narration: 'Drag the note into the lower part of the pitch space.',
      target: 'lower',
      tones: [],
      reinforcement: 'Good. Lower sounds belong lower in the pitch space.',
      replayLabel: 'Repeat prompt',
    },
    {
      id: 'high-place',
      badge: 'Prompt 2',
      title: 'Move the note into the high half',
      prompt: 'Now drag the note into the higher part of the pitch space.',
      narration: 'Now drag the note into the higher part of the pitch space.',
      target: 'upper',
      tones: [],
      reinforcement: 'Good. Higher sounds belong higher in the pitch space.',
      replayLabel: 'Repeat prompt',
    },
  ];

  const cuePlan: LessonCue[] = isMusicalScorePhase
    ? [cue('musical-score', isMusicalOutro ? 'Closing musical example' : 'Opening musical example', [
        ['play', 'Play the score with the red cursor', 'Sound the score from left to right. Grammy greets during the opening or says goodbye during the closing.'],
      ])]
    : startsWithComparison
      ? [
          ...comparisonPairs.map((pair, index) => cue(pair.id,
            `Compare pitches ${index + 1}: ${pair.mode}`, [
              ['question', pair.question, `Slide the pair in beneath Grammy, speak the prompt, sound ${pair.toneNotes.join(' and ')} in a loop, and wait for a choice.`],
              ['retry', 'If incorrect: “Try again.”', 'Speak the retry prompt and repeat the same question.'],
              ['correct', 'If correct: settle and sound the notes', 'Animate the notes onto the grid, play the pair, then advance.'],
            ])),
          cue('finish', 'Complete pitch comparison', comparisonFinishActions),
        ]
      : [
          cue('introduce-height', 'Introduce high and low', [
            ['opening', '“This space shows pitch from low to high.”', 'Grammy explains the vertical pitch field.'],
            ['low-notes', '“Lower notes belong lower down.”', `Slide ${lowIntroToneNotes.join(', ')} into the lower region and play them.`],
            ['high-notes', '“Higher sounds belong higher up.”', `Slide ${highIntroToneNotes.join(', ')} into the upper region, retaining the low notes, and play them.`],
            ['slide-out', 'Slide all six notes off to the right', 'Move both demonstration groups together past the screen edge before placement.'],
          ]),
          ...tasks.map((task) => cue(task.id, task.title, [
            ['prompt', task.prompt, 'Slide the question note in, retaining prior placed notes, then Grammy gives the placement prompt.'],
            ['place', `Drag the note to the ${task.target} half`, 'Unlock dragging and wait for the note to reach the correct half of the pitch field.'],
            ['retry', 'If incorrect: retry the same note', 'Speak “Try again” and restore the current task.'],
            ['correct', task.reinforcement, 'Show success, speak the reinforcement, and advance to the next task.'],
            ...(task.id === 'high-place' ? [['slide-out', 'Slide both placed notes off to the right', 'Retain the low and high placements and move them together past the screen edge.'] as [string, string, string]] : []),
          ])),
        ];

  let fieldEl: HTMLDivElement | null = null;
  let avatarAnchorEl: HTMLDivElement | null = null;
  let noteEl: HTMLButtonElement | null = null;
  let pitchGridFrameWidth = 0;
  let pitchGridFrameHeight = 0;
  let pitchGridViewportWidth = 0;
  let pitchGridViewportHeight = 0;
  let pitchGridCellWidth = pitchGridFallbackColumnSize;
  let pitchGridCellHeight = pitchGridFallbackColumnSize * 2;
  let pitchGridOverlayNoteSize = pitchGridFallbackColumnSize * 2;
  let pitchGridHitTargetSize = pitchGridMinHitTargetSize;
  let pitchGridShellWidth = pitchGridFallbackColumnSize * scoreTotalColumns;
  let pitchGridShellHeight = pitchGridFallbackColumnSize * (rowCount + 1);
  let pitchGridViewport: PitchGridViewport = {
    startRow: 0,
    endRow: rowCount - 1,
    zoomLevel: 1,
    containerWidth: 0,
    containerHeight: 0,
  };
  let noteY = resetY;
  let dragging = false;
  let dragOrigin: NoteDragOrigin | null = null;
  let dragClientX = 0;
  let dragClientY = 0;
  let draggingOverPitchGrid = false;
  let notePlacedOnGrid = true;
  let interactionEnabled = false;
  let pointerId: number | null = null;
  let activeRegion: PitchRegion | null = null;
  let flashRegion: PitchRegion | null = null;
  let feedbackState: 'success' | 'error' | null = null;
  let avatarReady = false;
  let introStarted = false;
  let scorePreludeRunning = false;
  let scorePlaybackVisible = isMusicalScorePhase;
  let skipScorePreludeRequested = false;
  let scoreCursorColumn = 0;
  let scoreColumnWidthPx = pitchGridCellWidth;
  let scoreWidthPx = scoreTotalColumns * pitchGridCellWidth;
  let scoreShapeHeightPx = pitchGridCellHeight;
  let scoreColumnGuides: ScoreColumnGuide[] = [];
  let scoreNoteRenderItems: ScoreNoteRenderItem[] = [];
  let scoreStampRenderItems: ScoreStampRenderItem[] = [];
  let activeScoreItemIds = new Set<string>();
  let introExampleNotes: IntroExampleNoteRenderItem[] = [];
  let activeIntroExampleTone: string | null = null;
  let sourceNoteActive = false;
  let dragPreviewVoice: ActiveVoice | null = null;
  let dragPreviewRow: number | null = null;
  let dragPreviewLastAttackMs = 0;
  let dragPreviewRequestId = 0;
  let introRunning = false;
  let taskIndex = -1;
  let comparisonOptionsEl: HTMLDivElement | null = null;
  let comparisonStarted = false;
  let comparisonIndex = -1;
  let comparisonQuestionVisible = false;
  let comparisonAnswerLocked = true;
  let activeComparisonOptionIndex: number | null = null;
  let activeSettledComparisonNoteId: string | null = null;
  let settledComparisonNotes: SettledComparisonNote[] = [];
  let comparisonFlightNotes: ComparisonFlightNote[] = [];
  let narrationText = '';
  let promptBadge = section.code;
  let promptTitle = section.label;
  let promptStatus =
    isMusicalScorePhase
      ? isMusicalOutro
        ? 'Listen to the closing musical example.'
        : 'Listen first. The red cursor will play the score across the pitch grid.'
      : startsWithComparison
        ? comparisonPairs[0].question
        : 'This space shows pitch from low to high.';
  let complete = false;
  let previousIsPlaying = isPlaying;
  let flashTimer: ReturnType<typeof setTimeout> | null = null;
  let waitTimer: ReturnType<typeof setTimeout> | null = null;
  let waitResolve: (() => void) | null = null;
  let waitRemainingMs = 0;
  let waitStartedAt = 0;
  let waitPaused = false;
  let sequenceToken = 0;
  const activeVoices = new Set<ActiveVoice>();
  let scoreCursorAnimationFrame: number | null = null;
  let scoreCursorStartedAt = 0;
  let scoreCursorPausedElapsedMs = 0;
  const scoreHighlightTimers = new Set<ReturnType<typeof setTimeout>>();
  let audioContext: AudioContext | null = null;
  let lastActionSkipSignal = actionSkipSignal;
  let actionSkipSignalReady = false;
  let actionSkipEpoch = 0;
  const actionSkipResolvers = new Set<() => void>();
  const defaultLessonWaveform: OscillatorType = 'triangle';
  const dragPreviewWaveform: OscillatorType = 'sawtooth';
  let visiblePitchGridStartRow = 0;
  let visiblePitchGridEndRow = rowCount - 1;
  let visiblePitchGridRowCount = rowCount;
  let pitchGridLayoutColumnCount = scoreTotalColumns;
  let pitchGridContentWidth = 0;

  $: visiblePitchGridStartRow = introScoreViewportStartRow;
  $: visiblePitchGridEndRow = introScoreViewportEndRow;
  $: visiblePitchGridRowCount = Math.max(1, visiblePitchGridEndRow - visiblePitchGridStartRow + 1);
  $: pitchGridLayoutColumnCount =
    !isMusicalScorePhase && pitchGridFrameWidth > 0 && pitchGridFrameWidth <= 760
      ? 22
      : scoreTotalColumns;
  // Every segment uses one scale for time columns and half-cell pitch rows.
  // Measure the available frame, then let the fitted shell keep its own size.
  $: gridLayout = calculateLessonGridLayout({
    width: pitchGridFrameWidth,
    height: pitchGridFrameHeight,
    columns: pitchGridLayoutColumnCount,
    rows: visiblePitchGridRowCount,
    fallbackCellSize: pitchGridFallbackColumnSize,
  });
  $: pitchGridShellWidth = gridLayout.width;
  $: pitchGridShellHeight = gridLayout.height;
  $: pitchGridCellHeight = gridLayout.cellHeight;
  $: pitchGridCellWidth = gridLayout.cellWidth;
  $: pitchGridOverlayNoteSize = gridLayout.noteDiameter;
  $: pitchGridHitTargetSize = Math.max(
    pitchGridMinHitTargetSize,
    Math.min(pitchGridMaxHitTargetSize, pitchGridOverlayNoteSize * 2.2)
  );
  $: pitchGridContentWidth = Math.max(0, pitchGridViewportWidth);
  $: pitchGridViewport = {
    startRow: visiblePitchGridStartRow,
    endRow: visiblePitchGridEndRow,
    zoomLevel: 1,
    containerWidth: pitchGridViewportWidth,
    containerHeight: pitchGridViewportHeight,
  };
  $: currentPitchNoteColor =
    pitchRows[getRowIndexForPercent(noteY)]?.hex ?? '#c95a4d';
  $: currentTask = taskIndex >= 0 && taskIndex < tasks.length ? tasks[taskIndex] : null;
  $: currentComparisonPair =
    comparisonIndex >= 0 && comparisonIndex < comparisonPairs.length
      ? comparisonPairs[comparisonIndex]
      : null;
  $: currentComparisonQuestion =
    currentComparisonPair?.question ?? comparisonPairs[0].question;
  $: comparisonUnderlinedWords =
    currentComparisonPair && narrationText === currentComparisonQuestion
      ? [currentComparisonPair.underlinedWord]
      : [];
  $: currentTaskUsesAvatarNoteSource = taskUsesAvatarNoteSource(currentTask);
  $: avatarSourceNoteVisible =
    currentTaskUsesAvatarNoteSource &&
    !complete &&
    !scorePlaybackVisible &&
    introExampleNotes.length === 0 &&
    !notePlacedOnGrid;
  $: gridPitchNoteVisible =
    !scorePlaybackVisible &&
    introExampleNotes.length === 0 &&
    !introRunning &&
    !comparisonStarted &&
    !startsWithComparison &&
    (!currentTaskUsesAvatarNoteSource || notePlacedOnGrid);
  $: noteIsSounding = dragging && draggingOverPitchGrid && dragPreviewVoice !== null;
  $: closingNotes = [
    { id: 'closing-low', top: `${rowCenter(getRowIndexForTone('A3'))}%`, left: '39%', frequency: getFrequencyForToneNote('A3') ?? undefined },
    { id: 'closing-high', top: `${rowCenter(getRowIndexForTone('A5'))}%`, left: '66%', frequency: getFrequencyForToneNote('A5') ?? undefined },
  ];
  $: scoreColumnWidthPx = scoreTotalColumns > 0 && pitchGridContentWidth > 0
    ? Math.min(pitchGridCellWidth, pitchGridContentWidth / scoreTotalColumns)
    : pitchGridCellWidth;
  $: scoreWidthPx = scoreTotalColumns * scoreColumnWidthPx;
  $: scoreShapeHeightPx = pitchGridCellHeight;
  $: scoreColumnGuides = buildScoreColumnGuides(scoreColumnWidthPx);
  $: scoreNoteRenderItems = buildScoreNoteRenderItems(scoreColumnWidthPx, scoreShapeHeightPx);
  $: scoreStampRenderItems = buildScoreStampRenderItems(scoreColumnWidthPx, scoreShapeHeightPx);

  // Score playback can begin while the avatar finishes entering. Narrated
  // exercise phases still wait for the avatar before starting their sequence.
  $: if ((isMusicalScorePhase || avatarReady) && !introStarted && isPlaying) {
    introStarted = true;
    void startLessonOpeningSequence();
  }

  $: if (isPlaying !== previousIsPlaying) {
    previousIsPlaying = isPlaying;
    if (isPlaying) resumeSequencing();
    else pauseSequencing();
  }

  $: if (actionSkipSignalReady && actionSkipSignal !== lastActionSkipSignal) {
    lastActionSkipSignal = actionSkipSignal;
    void skipCurrentAction();
  }

  function getRowIndexForTone(toneNote: string): number {
    return rowIndexByTone.get(toneNote) ?? Math.floor(rowCount / 2);
  }

  function rowCenter(rowIndex: number): number {
    const relativeRowIndex = rowIndex - visiblePitchGridStartRow;
    return ((relativeRowIndex + 1) / (visiblePitchGridRowCount + 1)) * 100;
  }

  function getRowIndexForPercent(percentY: number): number {
    const relativeRowIndex = (percentY / 100) * (visiblePitchGridRowCount + 1) - 1;
    return Math.max(visiblePitchGridStartRow, Math.min(visiblePitchGridEndRow,
      Math.round(visiblePitchGridStartRow + relativeRowIndex)));
  }

  function taskUsesAvatarNoteSource(_task: PracticeTask | null): boolean {
    return false;
  }

  function buildScoreColumnGuides(columnWidthPx: number): ScoreColumnGuide[] {
    return Array.from({ length: scoreTotalColumns + 1 }, (_, index) => {
      const boundaryStyle = scoreBoundaryStylesByColumn.get(index) ?? null;
      const isTerminal = index === 0 || index === scoreTotalColumns;
      if (!boundaryStyle && !isTerminal) return null;
      return {
        id: `score-guide-${index}`,
        leftPx: index * columnWidthPx,
        boundaryStyle,
        isTerminal,
      };
    }).filter((guide): guide is ScoreColumnGuide => guide !== null);
  }

  function buildScoreNoteRenderItems(
    columnWidthPx: number,
    shapeHeightPx: number
  ): ScoreNoteRenderItem[] {
    return lessonScore.placedNotes
      .filter((note) => !note.isDrum)
      .map((note) => {
        const row = getScoreNoteRow(note);
        const baseLeft = note.startColumnIndex * columnWidthPx;
        const baseWidth = note.shape === 'diamond' ? columnWidthPx * 0.5 : note.shape === 'oval' ? columnWidthPx : columnWidthPx * 2;
        const baseEndColumn = note.shape === 'circle'
          ? note.startColumnIndex + 1
          : note.startColumnIndex;
        const tailStartColumn = note.shape === 'circle'
          ? note.startColumnIndex + 1
          : note.startColumnIndex + 0.5;
        const tailEndColumn = note.endColumnIndex + 1;
        const hasTail = note.endColumnIndex > baseEndColumn;
        const tailLeftPx = tailStartColumn * columnWidthPx;
        const tailWidthPx = hasTail
          ? Math.max(0, (tailEndColumn - tailStartColumn) * columnWidthPx)
          : 0;

        const isCapsule = note.shape === 'circle' && hasTail;
        return {
          id: note.uuid,
          isCapsule,
          top: `${rowCenter(row)}%`,
          color: note.color,
          shape: note.shape,
          leftPx: isCapsule ? baseLeft + columnWidthPx - shapeHeightPx / 2 : baseLeft,
          widthPx: Math.max(5, isCapsule ? (note.endColumnIndex - note.startColumnIndex - 1) * columnWidthPx + shapeHeightPx : baseWidth),
          frequency: pitchRows[row]?.frequency,
          heightPx: shapeHeightPx,
          tailLeftPx,
          tailWidthPx: note.shape === 'circle' ? 0 : tailWidthPx,
        };
      });
  }

  function buildScoreStampRenderItems(
    columnWidthPx: number,
    shapeHeightPx: number
  ): ScoreStampRenderItem[] {
    return lessonScore.sixteenthStampPlacements.flatMap((placement) => {
      const stamp = sixteenthStampById.get(placement.sixteenthStampId);
      if (!stamp) return [];

      const baseRow = getScoreStampBaseRow(placement);
      const stampWidthPx = Math.max(1, (placement.endColumn - placement.startColumn) * columnWidthPx);
      const startX = placement.startColumn * columnWidthPx;
      const items: ScoreStampRenderItem[] = [];

      for (const slot of stamp.diamonds) {
        const shapeKey = `diamond_${slot}`;
        const row = clampRowIndex(baseRow + (placement.shapeOffsets?.[shapeKey] ?? 0));
        items.push({
          id: `${placement.id}-${shapeKey}`,
          kind: 'diamond',
          top: `${rowCenter(row)}%`,
          centerX: startX + ((slot + 0.5) / 4) * stampWidthPx,
          widthPx: Math.max(5, stampWidthPx * 0.25),
          heightPx: shapeHeightPx,
          color: placement.color,
          frequency: pitchRows[row]?.frequency,
        });
      }

      for (const slot of stamp.ovals) {
        const shapeKey = `oval_${slot}`;
        const row = clampRowIndex(baseRow + (placement.shapeOffsets?.[shapeKey] ?? 0));
        items.push({
          id: `${placement.id}-${shapeKey}`,
          kind: 'oval',
          top: `${rowCenter(row)}%`,
          centerX: startX + (slot === 0 ? 0.25 : 0.75) * stampWidthPx,
          widthPx: Math.max(7, stampWidthPx * 0.48),
          heightPx: shapeHeightPx,
          color: placement.color,
          frequency: pitchRows[row]?.frequency,
        });
      }

      return items;
    });
  }

  function beginSequence(cancelSpeech = true): number {
    sequenceToken += 1;
    motion.cancel();
    questionNarration.submit();
    resolveActionSkipWaiters();
    sourceNoteActive = false;
    stopTone();
    stopScoreCursorAnimation();
    clearScoreHighlights();
    clearIntroExampleNotes();
    clearFlashRegion();
    cancelWait(true);
    if (cancelSpeech) cancelLessonAvatarSpeech();
    return sequenceToken;
  }

  function isCurrentSequence(token: number): boolean {
    return token === sequenceToken;
  }

  function clearFlashRegion(): void {
    flashRegion = null;
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = null;
  }

  function pulseRegion(region: PitchRegion, durationMs: number): void {
    clearFlashRegion();
    flashRegion = region;
    flashTimer = setTimeout(() => {
      flashRegion = null;
      flashTimer = null;
    }, durationMs);
  }

  function getScoreCursorColumnFromElapsed(elapsedMs: number): number {
    const progress = Math.max(
      0,
      Math.min(1, elapsedMs / (scoreTotalSlots * scorePlaybackSlotDurationMs)),
    );
    return progress * scoreTotalColumns;
  }

  function updateScoreCursorAnimation(token: number): void {
    if (!scorePreludeRunning || !scorePlaybackVisible || !isCurrentSequence(token)) {
      scoreCursorAnimationFrame = null;
      return;
    }

    const elapsedMs = scoreCursorPausedElapsedMs + (performance.now() - scoreCursorStartedAt);
    scoreCursorColumn = getScoreCursorColumnFromElapsed(elapsedMs);
    scoreCursorAnimationFrame = requestAnimationFrame(() => updateScoreCursorAnimation(token));
  }

  function startScoreCursorAnimation(token: number): void {
    stopScoreCursorAnimation();
    scoreCursorColumn = 0;
    scoreCursorPausedElapsedMs = 0;
    scoreCursorStartedAt = performance.now();
    scoreCursorAnimationFrame = requestAnimationFrame(() => updateScoreCursorAnimation(token));
  }

  function pauseScoreCursorAnimation(): void {
    if (scoreCursorAnimationFrame === null) return;
    cancelAnimationFrame(scoreCursorAnimationFrame);
    scoreCursorAnimationFrame = null;
    scoreCursorPausedElapsedMs += performance.now() - scoreCursorStartedAt;
    scoreCursorColumn = getScoreCursorColumnFromElapsed(scoreCursorPausedElapsedMs);
  }

  function resumeScoreCursorAnimation(token: number): void {
    if (!scorePreludeRunning || !scorePlaybackVisible || scoreCursorAnimationFrame !== null) return;
    scoreCursorStartedAt = performance.now();
    scoreCursorAnimationFrame = requestAnimationFrame(() => updateScoreCursorAnimation(token));
  }

  function stopScoreCursorAnimation(): void {
    if (scoreCursorAnimationFrame !== null) {
      cancelAnimationFrame(scoreCursorAnimationFrame);
      scoreCursorAnimationFrame = null;
    }
    scoreCursorPausedElapsedMs = 0;
  }

  function clearScoreHighlights(): void {
    scoreHighlightTimers.forEach((timer) => clearTimeout(timer));
    scoreHighlightTimers.clear();
    activeScoreItemIds = new Set();
  }

  function setIntroExampleNotes(toneNotes: string[], retain = false): void {
    const notes = toneNotes.map((toneNote, index) => {
      const rowIndex = getRowIndexForTone(toneNote);
      const leftPercent = 30 + index * 18;
      return {
        id: `intro-example-${toneNote}`,
        toneNote,
        top: `${rowCenter(rowIndex)}%`,
        left: `${leftPercent}%`,
        color: pitchRows[rowIndex]?.hex ?? '#6a5140',
        isActive: activeIntroExampleTone === toneNote,
      };
    });
    introExampleNotes = retain ? [...introExampleNotes, ...notes] : notes;
  }

  async function slideIntroNotesOut(token: number): Promise<void> {
    motion.introEntering = [];
    motion.introExiting = true;
    narrationText = '';
    await tick();
    if (!isCurrentSequence(token)) return;
    await waitMs(lessonScreenSlideMs);
    if (!isCurrentSequence(token)) return;
    clearIntroExampleNotes();
    motion.introExiting = false;
  }

  async function moveComparisonAvatar(centered: boolean, token: number, instant = false): Promise<void> {
    if (!avatarAnchorEl || !fieldEl) return;
    // Subtract the current individual translation to recover the resting
    // teacher position when measuring the return or restoring a checkpoint.
    const avatarBounds = avatarAnchorEl.querySelector('.lesson-avatar-stage')?.getBoundingClientRect()
      ?? avatarAnchorEl.getBoundingClientRect();
    const offset = getComputedStyle(avatarAnchorEl).translate.split(' ').map(parseFloat);
    const gridBounds = fieldEl.getBoundingClientRect();
    motion.avatarInstant = instant;
    motion.avatarOffset = centered ? {
      x: gridBounds.left + gridBounds.width / 2 - (avatarBounds.left + avatarBounds.width / 2 - (offset[0] || 0)),
      y: gridBounds.top + gridBounds.height / 2 - (avatarBounds.top + avatarBounds.height / 2 - (offset[1] || 0)),
    } : { x: 0, y: 0 };
    await tick();
    if (!isCurrentSequence(token)) return;
    if (!instant) await waitMs(lessonScreenSlideMs);
  }

  function refreshIntroExampleNotes(): void {
    if (introExampleNotes.length === 0) return;
    introExampleNotes = introExampleNotes.map((note) => ({
      ...note,
      isActive: activeIntroExampleTone === note.toneNote,
    }));
  }

  function clearIntroExampleNotes(): void {
    introExampleNotes = [];
    activeIntroExampleTone = null;
  }

  function setActiveIntroExampleTone(toneNote: string | null): void {
    activeIntroExampleTone = toneNote;
    refreshIntroExampleNotes();
  }

  function activateScoreEvent(event: ScorePlaybackEvent, token: number): void {
    if (!isCurrentSequence(token)) return;
    const nextActiveIds = new Set(activeScoreItemIds);
    event.visualIds.forEach((id) => nextActiveIds.add(id));
    activeScoreItemIds = nextActiveIds;

    const timer = setTimeout(() => {
      scoreHighlightTimers.delete(timer);
      if (!isCurrentSequence(token)) return;
      const remainingActiveIds = new Set(activeScoreItemIds);
      event.visualIds.forEach((id) => remainingActiveIds.delete(id));
      activeScoreItemIds = remainingActiveIds;
    }, event.durationMs / scorePlaybackRate);
    scoreHighlightTimers.add(timer);
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

  function resolveActionSkipWaiters(): void {
    actionSkipEpoch += 1;
    const resolvers = Array.from(actionSkipResolvers);
    actionSkipResolvers.clear();
    resolvers.forEach((resolve) => resolve());
  }

  function createActionSkipWait(epoch: number): { promise: Promise<void>; cleanup: () => void } {
    if (epoch !== actionSkipEpoch) {
      return { promise: Promise.resolve(), cleanup: () => {} };
    }

    let resolver: (() => void) | null = null;
    const promise = new Promise<void>((resolve) => {
      resolver = () => {
        if (resolver) actionSkipResolvers.delete(resolver);
        resolve();
      };
      actionSkipResolvers.add(resolver);
    });

    return {
      promise,
      cleanup: () => {
        if (resolver) actionSkipResolvers.delete(resolver);
      },
    };
  }

  function cancelDragInteraction(): void {
    if (!dragging) return;
    const origin = dragOrigin;
    if (noteEl && pointerId !== null) {
      try {
        noteEl.releasePointerCapture(pointerId);
      } catch {}
    }
    dragging = false;
    dragOrigin = null;
    draggingOverPitchGrid = false;
    pointerId = null;
    releaseDragPitchPreview();
    if (origin === 'avatar') notePlacedOnGrid = false;
  }

  function pauseSequencing(): void {
    if (waitTimer) {
      clearTimeout(waitTimer);
      waitTimer = null;
      waitRemainingMs = Math.max(0, waitRemainingMs - (performance.now() - waitStartedAt));
      waitPaused = true;
    }
    pauseScoreCursorAnimation();
    clearScoreHighlights();
    stopTone();
    sourceNoteActive = false;
  }

  function resumeSequencing(): void {
    if (!waitPaused || !waitResolve) return;
    waitPaused = false;
    waitStartedAt = performance.now();
    waitTimer = setTimeout(() => waitResolve?.(), waitRemainingMs);
    resumeScoreCursorAnimation(sequenceToken);
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

  function stopTone(): void {
    Array.from(activeVoices).forEach(stopVoice);
    dragPreviewVoice = null;
    dragPreviewRow = null;
    dragPreviewLastAttackMs = 0;
    dragPreviewRequestId += 1;
  }

  function getNowMs(): number {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();
  }

  function startDragPreviewVoice(context: AudioContext, frequency: number): ActiveVoice {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const peak = 0.055;
    const voice: ActiveVoice = { oscillator, gain, stopped: false };

    oscillator.type = dragPreviewWaveform;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.025);
    oscillator.connect(gain);
    audioOutput.connect(gain, context, volume, { frequency, start: now, attackEnd: now + 0.025, peak });
    oscillator.onended = () => {
      voice.stopped = true;
      disposeVoice(voice);
      if (dragPreviewVoice === voice) {
        dragPreviewVoice = null;
        dragPreviewRow = null;
      }
    };
    activeVoices.add(voice);
    oscillator.start(now);
    return voice;
  }

  function quickReleaseVoice(voice: ActiveVoice): void {
    if (voice.stopped) {
      disposeVoice(voice);
      return;
    }

    const now = voice.gain.context.currentTime;
    voice.stopped = true;
    audioOutput.release(voice.gain, 0.045);
    try {
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setValueAtTime(Math.max(0.0001, voice.gain.gain.value), now);
      voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
      voice.oscillator.stop(now + 0.055);
    } catch {
      try {
        voice.oscillator.stop();
      } catch {}
      disposeVoice(voice);
    }
  }

  function releaseDragPitchPreview(): void {
    dragPreviewRequestId += 1;
    const voice = dragPreviewVoice;
    dragPreviewVoice = null;
    dragPreviewRow = null;
    dragPreviewLastAttackMs = 0;
    if (voice) quickReleaseVoice(voice);
  }

  async function updateDragPitchPreview(bypassThrottle = false): Promise<void> {
    if (!dragging || !interactionEnabled || !isPlaying) return;
    if (!draggingOverPitchGrid) {
      releaseDragPitchPreview();
      return;
    }

    const targetRow = getRowIndexForPercent(noteY);
    if (targetRow === dragPreviewRow && dragPreviewVoice) return;

    const now = getNowMs();
    if (!bypassThrottle && now - dragPreviewLastAttackMs < dragPreviewThrottleMs) return;

    const requestId = ++dragPreviewRequestId;
    const context = await ensureAudioContext();
    if (
      !context ||
      requestId !== dragPreviewRequestId ||
      !dragging ||
      !interactionEnabled ||
      !isPlaying
    ) {
      return;
    }

    const rowIndex = getRowIndexForPercent(noteY);
    if (rowIndex === dragPreviewRow && dragPreviewVoice) return;
    const frequency = getFrequencyForRow(rowIndex);
    if (!frequency) return;

    releaseDragPitchPreview();
    dragPreviewVoice = startDragPreviewVoice(context, frequency);
    dragPreviewRow = rowIndex;
    dragPreviewLastAttackMs = getNowMs();
  }

  function startVoice(
    context: AudioContext,
    frequency: number,
    durationMs: number,
    peakGain: number,
    token: number,
    waveform: OscillatorType = defaultLessonWaveform,
    noteIds?: readonly string[]
  ): void {
    if (!isCurrentSequence(token) || !isPlaying) return;

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const durationSeconds = Math.max(0.06, durationMs / 1000);
    const releaseStart = now + Math.max(0.03, durationSeconds - 0.04);
    const endTime = now + durationSeconds;
    const voice: ActiveVoice = { oscillator, gain, stopped: false };

    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + 0.025);
    gain.gain.setValueAtTime(peakGain, releaseStart);
    gain.gain.exponentialRampToValueAtTime(0.0001, endTime);
    oscillator.connect(gain);
    audioOutput.connect(gain, context, volume, { frequency, start: now, attackEnd: now + 0.025, releaseStart, end: endTime, peak: peakGain, noteIds });
    oscillator.onended = () => {
      voice.stopped = true;
      disposeVoice(voice);
    };
    activeVoices.add(voice);
    oscillator.start(now);
    oscillator.stop(endTime + 0.02);
  }

  async function playScoreEvent(event: ScorePlaybackEvent, token: number): Promise<void> {
    if (!isCurrentSequence(token) || !isPlaying) return;
    const context = await ensureAudioContext();
    if (!context || !isCurrentSequence(token) || !isPlaying) return;
    const peak = 0.052;
    startVoice(context, event.frequency, event.durationMs / scorePlaybackRate, peak, token, defaultLessonWaveform, event.visualIds);
  }

  async function playTone(
    frequency: number,
    durationMs: number,
    region: PitchRegion,
    token: number,
    waveform: OscillatorType = defaultLessonWaveform,
    showRegionPulse = true
  ): Promise<void> {
    if (!isCurrentSequence(token) || !isPlaying) return;
    const context = await ensureAudioContext();
    if (!context || !isCurrentSequence(token)) return;

    stopTone();
    const waveGain = waveform === 'sawtooth' ? 0.058 : 0.08;
    const peak = waveGain;
    startVoice(context, frequency, durationMs, peak, token, waveform);

    if (showRegionPulse) pulseRegion(region, durationMs + 60);
    await waitMs(durationMs);
    if (!isCurrentSequence(token)) return;
    stopTone();
  }

  async function playToneNoteSequence(
    toneNotes: string[],
    region: PitchRegion,
    token: number
  ): Promise<void> {
    for (const toneNote of toneNotes) {
      const frequency = getFrequencyForToneNote(toneNote);
      if (!frequency || !isCurrentSequence(token)) return;
      setActiveIntroExampleTone(toneNote);
      await playTone(frequency, 460, region, token, 'sawtooth');
      if (!isCurrentSequence(token)) return;
      setActiveIntroExampleTone(null);
      await waitMs(110);
      if (!isCurrentSequence(token)) return;
    }
    setActiveIntroExampleTone(null);
  }

  function getComparisonQuestion(pair: ComparisonPair): string {
    return pair.question;
  }

  function getComparisonCorrectIndex(pair: ComparisonPair): number {
    const firstRow = getRowIndexForTone(pair.toneNotes[0]);
    const secondRow = getRowIndexForTone(pair.toneNotes[1]);
    if (pair.mode === 'higher') return firstRow < secondRow ? 0 : 1;
    return firstRow > secondRow ? 0 : 1;
  }

  function getComparisonNoteId(pair: ComparisonPair, optionIndex: number): string {
    return `${pair.id}-${optionIndex}`;
  }

  function getComparisonLeftPercent(pairIndex: number, optionIndex: number): number {
    const noteIndex = pairIndex * 2 + optionIndex;
    return ((noteIndex + 1) / (comparisonPairs.length * 2 + 1)) * 100;
  }

  function buildSettledComparisonNotes(
    pair: ComparisonPair,
    pairIndex: number
  ): SettledComparisonNote[] {
    return pair.toneNotes.map((toneNote, optionIndex) => {
      const rowIndex = getRowIndexForTone(toneNote);
      return {
        id: getComparisonNoteId(pair, optionIndex),
        toneNote,
        rowIndex,
        leftPercent: getComparisonLeftPercent(pairIndex, optionIndex),
        color: pitchRows[rowIndex]?.hex ?? '#6a5140',
      };
    });
  }

  function buildComparisonFlightNotes(
    pair: ComparisonPair,
    pairIndex: number
  ): ComparisonFlightNote[] {
    if (!comparisonOptionsEl || !fieldEl) return [];
    const sourceButtons = Array.from(
      comparisonOptionsEl.querySelectorAll<HTMLButtonElement>('.comparison-option')
    );
    if (sourceButtons.length !== pair.toneNotes.length) return [];

    const fieldRect = fieldEl.getBoundingClientRect();
    return buildSettledComparisonNotes(pair, pairIndex).map((note, optionIndex) => {
      const sourceRect = sourceButtons[optionIndex]?.getBoundingClientRect();
      const startX = sourceRect ? sourceRect.left + sourceRect.width / 2 : fieldRect.left;
      const startY = sourceRect ? sourceRect.top + sourceRect.height / 2 : fieldRect.top;
      return {
        ...note,
        startX,
        startY,
        endX: fieldRect.left + (note.leftPercent / 100) * fieldRect.width,
        endY: fieldRect.top + (rowCenter(note.rowIndex) / 100) * fieldRect.height,
        landed: false,
      };
    });
  }

  function waitForAnimationFrame(): Promise<void> {
    if (typeof requestAnimationFrame !== 'function') return Promise.resolve();
    return new Promise((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }

  function getComparisonRegion(rowIndex: number): PitchRegion {
    return rowIndex < resetRowIndex ? 'upper' : 'lower';
  }

  async function playComparisonTone(
    pair: ComparisonPair,
    optionIndex: number,
    durationMs: number,
    token: number,
    settled: boolean
  ): Promise<void> {
    const toneNote = pair.toneNotes[optionIndex];
    const rowIndex = getRowIndexForTone(toneNote);
    const frequency = getFrequencyForRow(rowIndex);
    if (!frequency || !isCurrentSequence(token)) return;

    if (settled) activeSettledComparisonNoteId = getComparisonNoteId(pair, optionIndex);
    else activeComparisonOptionIndex = optionIndex;

    await playTone(
      frequency,
      durationMs,
      getComparisonRegion(rowIndex),
      token,
      'sawtooth',
      false
    );

    if (!isCurrentSequence(token)) return;
    if (settled) activeSettledComparisonNoteId = null;
    else activeComparisonOptionIndex = null;
  }

  async function runComparisonLoop(pair: ComparisonPair, token: number): Promise<void> {
    while (
      isCurrentSequence(token) &&
      currentComparisonPair?.id === pair.id &&
      comparisonQuestionVisible &&
      !comparisonAnswerLocked
    ) {
      for (let optionIndex = 0; optionIndex < pair.toneNotes.length; optionIndex += 1) {
        if (
          !isCurrentSequence(token) ||
          !comparisonQuestionVisible ||
          comparisonAnswerLocked
        ) {
          return;
        }
        await playComparisonTone(pair, optionIndex, lessonPacing.comparisonNoteMs, token, false);
        if (!isCurrentSequence(token)) return;
        await waitMs(lessonPacing.betweenComparisonNotesMs);
      }
    }
  }

  async function startComparisonQuestion(
    index: number, announceQuestion: boolean, startAt: 'question' | 'retry' | 'correct' = 'question',
  ): Promise<void> {
    const pair = comparisonPairs[index];
    if (!pair) return;

    const token = beginSequence();
    const question = getComparisonQuestion(pair);
    comparisonStarted = true;
    comparisonIndex = index;
    taskIndex = tasks.length;
    comparisonQuestionVisible = true;
    comparisonAnswerLocked = true;
    activeComparisonOptionIndex = null;
    activeSettledComparisonNoteId = null;
    complete = false;
    interactionEnabled = false;
    notePlacedOnGrid = true;
    activeRegion = null;
    feedbackState = null;
    promptBadge = `Comparison ${index + 1} of ${comparisonPairs.length}`;
    promptTitle = pair.mode === 'higher' ? 'Find the higher pitch' : 'Find the lower pitch';
    promptStatus = question;
    narrationText = question;

    if (startAt !== 'question') {
      comparisonAnswerLocked = false;
      await tick();
      if (!isCurrentSequence(token)) return;
      const correct = getComparisonCorrectIndex(pair);
      await handleComparisonAnswer(startAt === 'correct' ? correct : 1 - correct, true);
      return;
    }

    mark(pair.id, 'question');

    motion.comparisonEntering = true;
    await tick();
    if (!isCurrentSequence(token)) return;
    await waitMs(lessonScreenSlideMs);
    if (!isCurrentSequence(token)) return;
    motion.comparisonEntering = false;
    await waitMs(160);
    if (!isCurrentSequence(token)) return;
    comparisonAnswerLocked = false;
    if (announceQuestion) {
      await questionNarration.start(() => say(question, token), () => { comparisonAnswerLocked = false; });
      if (!isCurrentSequence(token)) return;
    } else questionNarration.wait();

    comparisonAnswerLocked = false;
    void runComparisonLoop(pair, token);
  }

  async function playSettledPair(pair: ComparisonPair, token: number): Promise<void> {
    for (let repeat = 0; repeat < 3; repeat += 1) {
      for (let optionIndex = 0; optionIndex < pair.toneNotes.length; optionIndex += 1) {
        await playComparisonTone(pair, optionIndex, 145, token, true);
        if (!isCurrentSequence(token)) return;
        await waitMs(45);
      }
    }
    activeSettledComparisonNoteId = null;
  }

  async function finishComparisonSequence(token: number, startAt = 'playback'): Promise<void> {
    if (!isCurrentSequence(token)) return;
    const checkpoint = comparisonFinishCheckpoint(startAt);
    if (!checkpoint) return;
    comparisonStarted = true;
    comparisonIndex = comparisonPairs.length - 1;
    comparisonAnswerLocked = true;
    comparisonQuestionVisible = false;
    activeComparisonOptionIndex = null;
    promptBadge = `${section.code} complete`;
    promptTitle = 'Higher and lower pitches';
    promptStatus = '';
    narrationText = '';
    activeSettledComparisonNoteId = null;
    if (!checkpoint.notesVisible) settledComparisonNotes = [];
    motion.gridHidden = checkpoint.gridHidden;
    await tick();
    if (!isCurrentSequence(token)) return;
    if (checkpoint.avatarCentered) await moveComparisonAvatar(true, token, true);

    for (const [id] of comparisonFinishActions.slice(checkpoint.index)) {
      if (!isCurrentSequence(token)) return;
      mark('finish', id);
      switch (id) {
        case 'playback':
          for (const note of settledComparisonNotes) {
            const frequency = getFrequencyForRow(note.rowIndex);
            if (!frequency) continue;
            activeSettledComparisonNoteId = note.id;
            await playTone(frequency, 135, getComparisonRegion(note.rowIndex), token, 'sawtooth', false);
            if (!isCurrentSequence(token)) return;
            await waitMs(38);
            if (!isCurrentSequence(token)) return;
          }
          activeSettledComparisonNoteId = null;
          motion.comparisonExiting = true;
          await tick();
          if (!isCurrentSequence(token)) return;
          await waitMs(lessonScreenSlideMs);
          if (!isCurrentSequence(token)) return;
          settledComparisonNotes = [];
          motion.comparisonExiting = false;
          break;
        case 'hide-grid':
          motion.gridHidden = true;
          await tick();
          break;
        case 'center-avatar':
          await moveComparisonAvatar(true, token);
          break;
        case 'bravo':
          promptStatus = 'Bravo!';
          await say('Bravo!', token);
          if (!isCurrentSequence(token)) return;
          await waitMs(lessonPacing.afterCelebrationMs);
          break;
        case 'return-avatar':
          narrationText = '';
          await moveComparisonAvatar(false, token);
          break;
      }
    }
    if (!isCurrentSequence(token)) return;
    complete = true;
    inspector?.status('completed');
    onComparisonComplete?.();
  }

  async function handleComparisonAnswer(optionIndex: number, fromInspector = false): Promise<void> {
    const pair = currentComparisonPair;
    if (
      !pair ||
      comparisonAnswerLocked ||
      !comparisonQuestionVisible ||
      (!isPlaying && !fromInspector)
    ) {
      return;
    }

    questionNarration.submit();
    if (optionIndex !== getComparisonCorrectIndex(pair)) {
      mark(pair.id, 'retry');
      const token = beginSequence();
      comparisonAnswerLocked = true;
      activeComparisonOptionIndex = null;
      feedbackState = 'error';
      await say('Try again.', token);
      if (!isCurrentSequence(token)) return;
      feedbackState = null;
      narrationText = getComparisonQuestion(pair);
      comparisonAnswerLocked = false;
      questionNarration.wait();
      mark(pair.id, 'question');
      void runComparisonLoop(pair, token);
      return;
    }

    mark(pair.id, 'correct');
    const flightNotes = buildComparisonFlightNotes(pair, comparisonIndex);
    const token = beginSequence();
    comparisonAnswerLocked = true;
    comparisonQuestionVisible = false;
    activeComparisonOptionIndex = null;
    feedbackState = 'success';
    comparisonFlightNotes = flightNotes;

    if (comparisonFlightNotes.length > 0) {
      await waitForAnimationFrame();
      await waitForAnimationFrame();
      if (!isCurrentSequence(token)) return;
      comparisonFlightNotes = comparisonFlightNotes.map((note) => ({
        ...note,
        landed: true,
      }));
      await waitMs(680);
      if (!isCurrentSequence(token)) return;
    }

    settledComparisonNotes = [
      ...settledComparisonNotes,
      ...buildSettledComparisonNotes(pair, comparisonIndex),
    ];
    comparisonFlightNotes = [];
    feedbackState = null;

    await playSettledPair(pair, token);
    if (!isCurrentSequence(token)) return;

    await waitMs(180);
    if (!isCurrentSequence(token)) return;

    if (comparisonIndex >= comparisonPairs.length - 1) {
      await finishComparisonSequence(token);
      return;
    }

    const nextIndex = comparisonIndex + 1;
    await startComparisonQuestion(nextIndex, true);
  }

  async function say(text: string, token: number): Promise<void> {
    narrationText = text;
    if (!avatarReady || !isCurrentSequence(token)) return;
    const skipEpoch = actionSkipEpoch;
    const speechPromise = speakWithLessonAvatar(text, {
      lang: 'en-CA',
      rate: 0.92,
      chunking: 'sentence',
    }).catch(() => {});
    const skipWait = createActionSkipWait(skipEpoch);
    try {
      await Promise.race([speechPromise, skipWait.promise]);
    } catch {
    } finally {
      skipWait.cleanup();
    }
  }

  function sayDuringScorePrelude(text: string, token: number, wave = false): void {
    if (!isCurrentSequence(token)) return;
    narrationText = text;
    // Score narration may start while Grammy's mounted avatar is still entering.
    void speakWithLessonAvatar(text, {
      wave,
      lang: 'en-CA',
      rate: 0.92,
      chunking: 'sentence',
    }).catch(() => {});
  }

  async function startLessonOpeningSequence(): Promise<void> {
    if (isMusicalScorePhase) {
      const scorePlayed = await playScorePreludeSequence();
      if (scorePlayed) {
        inspector?.status('completed');
        if (isMusicalOutro) onMusicalOutroComplete?.();
        else onMusicalIntroComplete?.();
      }
      return;
    }

    if (startsWithComparison) {
      await startComparisonQuestion(0, true);
      return;
    }

    await startIntroSequence();
  }

  async function skipCurrentAction(): Promise<void> {
    resolveActionSkipWaiters();

    if (scorePlaybackVisible) {
      await skipScorePrelude();
      return;
    }

    cancelLessonAvatarSpeech();
    cancelDragInteraction();
    stopTone();
    clearFlashRegion();
    cancelWait(true);

    if (
      interactionEnabled &&
      currentTask &&
      !complete &&
      !introRunning &&
      !scorePreludeRunning &&
      feedbackState === null
    ) {
      interactionEnabled = false;
      activeRegion = null;
      await startTask(taskIndex + 1);
    }
  }

  async function skipScorePrelude(): Promise<void> {
    if (!scorePlaybackVisible) return;
    if (!scorePreludeRunning) {
      skipScorePreludeRequested = true;
      return;
    }
    beginSequence();
    skipScorePreludeRequested = false;
    scorePlaybackVisible = false;
    scorePreludeRunning = false;
    scoreCursorColumn = 0;
    await startIntroSequence();
  }

  async function playScorePreludeSequence(): Promise<boolean> {
    const token = beginSequence();
    mark('musical-score', 'play');
    scorePreludeRunning = true;
    scorePlaybackVisible = true;
    scoreCursorColumn = 0;
    complete = false;
    taskIndex = -1;
    interactionEnabled = false;
    notePlacedOnGrid = true;
    sourceNoteActive = false;
    feedbackState = null;
    narrationText = '';
    promptBadge = section.code;
    promptTitle = section.label;
    promptStatus = isMusicalOutro
      ? 'Listen to the closing musical example.'
      : 'Listen first. The red cursor will play the score across the pitch grid.';
    noteY = resetY;
    activeRegion = null;
    clearIntroExampleNotes();

    if (skipScorePreludeRequested) {
      skipScorePreludeRequested = false;
      scorePlaybackVisible = false;
      scorePreludeRunning = false;
      return true;
    }

    // Mount the avatar before dispatching speech, without waiting for its entrance.
    await tick();
    if (!isCurrentSequence(token)) return false;
    await waitMs(260);
    if (!isCurrentSequence(token)) return false;

    startScoreCursorAnimation(token);
    if (isMusicalOutro) {
      sayDuringScorePrelude('See you next time!', token);
    }
    const greetingSlot = Math.floor(scoreTotalSlots / 2);
    let greetingSpoken = false;
    for (let slot = 0; slot < scoreTotalSlots; slot += 1) {
      if (!isMusicalOutro && !greetingSpoken && slot >= greetingSlot) {
        greetingSpoken = true;
        sayDuringScorePrelude('Hello', token, true);
      }

      const events = scorePlaybackEventsBySlot.get(slot) ?? [];
      for (const event of events) {
        activateScoreEvent(event, token);
        void playScoreEvent(event, token);
      }

      await waitMs(scorePlaybackSlotDurationMs);
      if (!isCurrentSequence(token)) return false;
    }

    stopScoreCursorAnimation();
    clearScoreHighlights();
    scoreCursorColumn = scoreTotalColumns;

    if (isMusicalOutro) {
      scorePreludeRunning = false;
      stopTone();
      return true;
    }

    await say("Let's begin", token);
    if (!isCurrentSequence(token)) return false;

    scorePlaybackVisible = false;
    scorePreludeRunning = false;
    scoreCursorColumn = 0;
    stopTone();
    return true;
  }

  async function startIntroSequence(startAt: 'opening' | 'low-notes' | 'high-notes' | 'slide-out' = 'opening'): Promise<void> {
    const token = beginSequence();
    scorePlaybackVisible = false;
    scorePreludeRunning = false;
    introRunning = true;
    complete = false;
    taskIndex = -1;
    comparisonStarted = false;
    comparisonIndex = -1;
    comparisonQuestionVisible = false;
    comparisonAnswerLocked = true;
    activeComparisonOptionIndex = null;
    activeSettledComparisonNoteId = null;
    settledComparisonNotes = [];
    comparisonFlightNotes = [];
    interactionEnabled = false;
    notePlacedOnGrid = true;
    sourceNoteActive = false;
    feedbackState = null;
    promptBadge = section.code;
    promptTitle = section.label;
    promptStatus = 'This space shows pitch from low to high.';
    noteY = resetY;
    activeRegion = null;
    clearIntroExampleNotes();
    motion.placedNotes = [];
    motion.placementVisible = false;

    if (startAt === 'slide-out') {
      setIntroExampleNotes(lowIntroToneNotes);
      setIntroExampleNotes(highIntroToneNotes, true);
      mark('introduce-height', 'slide-out');
      await slideIntroNotesOut(token);
      if (!isCurrentSequence(token)) return;
      introRunning = false;
      await startTask(0);
      return;
    }

    if (startAt === 'opening') {
      mark('introduce-height', 'opening');
      await waitMs(320);
      if (!isCurrentSequence(token)) return;
      await say('This space shows pitch from low to high.', token);
      if (!isCurrentSequence(token)) return;
      await waitMs(120);
      if (!isCurrentSequence(token)) return;
    }

    if (startAt !== 'high-notes') {
      mark('introduce-height', 'low-notes');
      setIntroExampleNotes(lowIntroToneNotes);
      motion.introEntering = lowIntroToneNotes;
      await tick();
      if (!isCurrentSequence(token)) return;
      await waitMs(lessonScreenSlideMs);
      if (!isCurrentSequence(token)) return;
      motion.introEntering = [];
      await say('Lower notes belong lower down.', token);
      if (!isCurrentSequence(token)) return;
      promptStatus = 'Lower notes belong lower down.';
      await playToneNoteSequence(lowIntroToneNotes, 'lower', token);
      if (!isCurrentSequence(token)) return;
      await waitMs(160);
      if (!isCurrentSequence(token)) return;
    }

    mark('introduce-height', 'high-notes');
    if (startAt === 'high-notes') setIntroExampleNotes(lowIntroToneNotes);
    setIntroExampleNotes(highIntroToneNotes, true);
    motion.introEntering = highIntroToneNotes;
    await tick();
    if (!isCurrentSequence(token)) return;
    await waitMs(lessonScreenSlideMs);
    if (!isCurrentSequence(token)) return;
    motion.introEntering = [];
    await say('Higher sounds belong higher up.', token);
    if (!isCurrentSequence(token)) return;
    promptStatus = 'Higher sounds belong higher up.';
    await playToneNoteSequence(highIntroToneNotes, 'upper', token);
    if (!isCurrentSequence(token)) return;

    await waitMs(240);
    if (!isCurrentSequence(token)) return;

    mark('introduce-height', 'slide-out');
    await slideIntroNotesOut(token);
    if (!isCurrentSequence(token)) return;
    introRunning = false;
    await startTask(0);
  }

  function examplePlacedNotes(count: number) {
    return tasks.slice(0, count).map(task => {
      const rowIndex = getRowIndexForPercent(task.target === 'lower' ? 75 : 25);
      return { id: task.id, rowIndex, leftPercent: 50, color: pitchRows[rowIndex].hex };
    });
  }

  async function slidePlacedNotesOut(token: number): Promise<void> {
    motion.placementVisible = false;
    motion.placementEntering = false;
    motion.placementExiting = true;
    narrationText = '';
    await tick();
    if (!isCurrentSequence(token)) return;
    await waitMs(lessonScreenSlideMs);
    if (!isCurrentSequence(token)) return;
    motion.placedNotes = [];
    motion.placementExiting = false;
  }

  async function startTask(index: number, startAt: 'prompt' | 'place' | 'retry' | 'correct' | 'slide-out' = 'prompt'): Promise<void> {
    if (index >= tasks.length) {
      const token = beginSequence();
      interactionEnabled = false;
      notePlacedOnGrid = true;
      sourceNoteActive = false;
      feedbackState = null;
      activeRegion = null;
      await waitMs(420);
      if (isCurrentSequence(token)) {
        inspector?.status('completed');
        onPlacementComplete?.();
      }
      return;
    }

    const task = tasks[index];
    const token = beginSequence();
    motion.placedNotes = index === 0 ? [] : motion.placedNotes.length ? motion.placedNotes.slice(0, index) : examplePlacedNotes(index);
    motion.placementVisible = true;
    const usesAvatarNoteSource = taskUsesAvatarNoteSource(task);
    taskIndex = index;
    complete = false;
    interactionEnabled = false;
    notePlacedOnGrid = !usesAvatarNoteSource;
    sourceNoteActive = false;
    feedbackState = null;
    noteY = resetY;
    activeRegion = null;
    promptBadge = task.badge;
    promptTitle = task.title;
    promptStatus = task.prompt;
    narrationText = task.prompt;
    clearIntroExampleNotes();

    if (startAt === 'slide-out') {
      motion.placedNotes = examplePlacedNotes(tasks.length);
      mark(task.id, 'slide-out');
      await slidePlacedNotesOut(token);
      if (isCurrentSequence(token)) await startTask(tasks.length);
      return;
    }

    if (startAt === 'retry' || startAt === 'correct') {
      if (startAt === 'correct') noteY = task.target === 'lower' ? 75 : 25;
      await tick();
      if (!isCurrentSequence(token)) return;
      if (startAt === 'retry') await handleIncorrectDrop();
      else await handleSuccessfulDrop();
      return;
    }
    if (startAt === 'place') {
      mark(task.id, 'place');
      interactionEnabled = true;
      questionNarration.wait();
      return;
    }

    mark(task.id, 'prompt');

    motion.placementEntering = true;
    await tick();
    if (!isCurrentSequence(token)) return;
    await waitMs(lessonScreenSlideMs);
    if (!isCurrentSequence(token)) return;
    motion.placementEntering = false;
    await waitMs(140);
    if (!isCurrentSequence(token)) return;

    const sequence = task.tones.map((frequency, toneIndex) => ({
      frequency,
      region:
        toneIndex === task.tones.length - 1
          ? task.target
          : task.target === 'upper'
            ? 'lower'
            : 'upper',
    }));

    for (const item of sequence) {
      if (usesAvatarNoteSource) sourceNoteActive = true;
      await playTone(item.frequency, 650, item.region, token);
      if (usesAvatarNoteSource) sourceNoteActive = false;
      if (!isCurrentSequence(token)) return;
      await waitMs(150);
      if (!isCurrentSequence(token)) return;
    }

    interactionEnabled = true;
    if (index < 2 || index === 2 || index === tasks.length - 1) {
      await questionNarration.start(() => say(task.narration, token), () => { interactionEnabled = true; });
      if (!isCurrentSequence(token)) return;
    } else questionNarration.wait();
    interactionEnabled = true;
    mark(task.id, 'place');
  }

  async function replayCurrentTask(): Promise<void> {
    if (!currentTask || !isPlaying || complete || introRunning || scorePreludeRunning) return;
    await startTask(taskIndex);
  }

  async function restartSubsection(): Promise<void> {
    introStarted = true;
    await startLessonOpeningSequence();
  }

  async function handleSuccessfulDrop(): Promise<void> {
    if (!currentTask) return;
    questionNarration.submit();
    mark(currentTask.id, 'correct');
    const token = beginSequence();
    interactionEnabled = false;
    notePlacedOnGrid = true;
    sourceNoteActive = false;
    feedbackState = 'success';
    clearIntroExampleNotes();
    activeRegion = currentTask.target;
    promptStatus = currentTask.reinforcement;
    narrationText = currentTask.reinforcement;

    if (taskIndex < 2 || taskIndex === tasks.length - 1) {
      await say(currentTask.reinforcement, token);
      if (!isCurrentSequence(token)) return;
    }

    await waitMs(820);
    if (!isCurrentSequence(token)) return;

    feedbackState = null;
    const placedRow = getRowIndexForPercent(noteY);
    motion.placedNotes = [...motion.placedNotes, {
      id: currentTask.id, rowIndex: placedRow, leftPercent: 50, color: pitchRows[placedRow].hex,
    }];
    motion.placementVisible = false;
    if (taskIndex === tasks.length - 1) {
      mark(currentTask.id, 'slide-out');
      await slidePlacedNotesOut(token);
      if (!isCurrentSequence(token)) return;
    }
    await startTask(taskIndex + 1);
  }

  async function handleIncorrectDrop(): Promise<void> {
    questionNarration.submit();
    if (currentTask) mark(currentTask.id, 'retry');
    const token = beginSequence();
    interactionEnabled = false;
    sourceNoteActive = false;
    feedbackState = 'error';
    clearIntroExampleNotes();
    activeRegion = null;
    promptStatus = 'Try again. Listen for the sound and place the note in the correct half.';
    narrationText = promptStatus;
    noteY = resetY;

    await say(promptStatus, token);
    if (!isCurrentSequence(token)) return;

    feedbackState = null;
    await startTask(taskIndex);
  }

  function getFieldHalfFromY(percentY: number): PitchRegion {
    return percentY < 50 ? 'upper' : 'lower';
  }

  function getFieldPoint(clientX: number, clientY: number): {
    inField: boolean;
    snappedY: number;
    snappedClientY: number;
  } | null {
    if (!fieldEl) return null;
    const rect = fieldEl.getBoundingClientRect();
    const inField =
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom;
    const normalized = ((clientY - rect.top) / rect.height) * 100;
    const snappedRowIndex = getRowIndexForPercent(normalized);
    const snappedY = rowCenter(snappedRowIndex);
    const snappedClientY = rect.top + (snappedY / 100) * rect.height;
    return { inField, snappedY, snappedClientY };
  }

  function updateDraggedNote(clientX: number, clientY: number): boolean {
    const fieldPoint = getFieldPoint(clientX, clientY);
    if (!fieldPoint) return false;
    const { inField, snappedY, snappedClientY } = fieldPoint;
    draggingOverPitchGrid = dragOrigin === 'grid' || inField;
    if (!draggingOverPitchGrid) {
      activeRegion = null;
      releaseDragPitchPreview();
      dragClientY = clientY;
      return false;
    }

    noteY = snappedY;
    if (dragOrigin === 'avatar') dragClientY = snappedClientY;
    activeRegion = getFieldHalfFromY(noteY);
    return true;
  }

  function handleNotePointerDown(event: PointerEvent, origin: NoteDragOrigin): void {
    if (!interactionEnabled || !isPlaying || !noteEl) return;
    event.preventDefault();
    dragging = true;
    dragOrigin = origin;
    pointerId = event.pointerId;
    dragClientX = event.clientX;
    dragClientY = event.clientY;
    noteEl.setPointerCapture(event.pointerId);
    if (origin === 'grid') notePlacedOnGrid = true;
    updateDraggedNote(event.clientX, event.clientY);
    void updateDragPitchPreview(true);
  }

  async function placeNoteFromOutside(event: PointerEvent): Promise<void> {
    if (!interactionEnabled || !isPlaying || dragging || !currentTask) return;
    const point = getFieldPoint(event.clientX, event.clientY);
    if (!point?.inField) return;
    noteY = point.snappedY;
    notePlacedOnGrid = true;
    activeRegion = getFieldHalfFromY(noteY);
    if (activeRegion === currentTask.target) await handleSuccessfulDrop();
    else await handleIncorrectDrop();
  }

  function handleNotePointerMove(event: PointerEvent): void {
    if (!dragging || pointerId !== event.pointerId) return;
    dragClientX = event.clientX;
    dragClientY = event.clientY;
    updateDraggedNote(event.clientX, event.clientY);
    void updateDragPitchPreview();
  }

  async function handleNotePointerUp(event: PointerEvent): Promise<void> {
    if (!dragging || pointerId !== event.pointerId || !noteEl || !currentTask) return;
    const droppedOnGrid = updateDraggedNote(event.clientX, event.clientY);
    const origin = dragOrigin;
    noteEl.releasePointerCapture(event.pointerId);
    dragging = false;
    dragOrigin = null;
    draggingOverPitchGrid = false;
    pointerId = null;
    releaseDragPitchPreview();

    if (origin === 'avatar' && !droppedOnGrid) {
      notePlacedOnGrid = false;
      activeRegion = null;
      noteY = resetY;
      return;
    }

    notePlacedOnGrid = true;
    if (getFieldHalfFromY(noteY) === currentTask.target) await handleSuccessfulDrop();
    else await handleIncorrectDrop();
  }

  function handleNotePointerCancel(event: PointerEvent): void {
    if (!dragging || pointerId !== event.pointerId || !noteEl) return;
    const origin = dragOrigin;
    noteEl.releasePointerCapture(event.pointerId);
    dragging = false;
    dragOrigin = null;
    draggingOverPitchGrid = false;
    pointerId = null;
    releaseDragPitchPreview();
    noteY = resetY;
    if (origin === 'avatar') notePlacedOnGrid = false;
    activeRegion = null;
  }

  function handleAvatarReady(): void {
    avatarReady = true;
  }

  function seekTo(cueId: string, actionId?: string): void {
    const cueEntry = cuePlan.find((item) => item.id === cueId);
    const selectedAction = actionId ?? cueEntry?.actions?.[0]?.id;
    if (!cueEntry || !selectedAction || !cueEntry.actions?.some((item) => item.id === selectedAction)) return;
    beginSequence();
    introStarted = true;
    activeInspectorCue = null;
    inspector?.resetFrom(cueId);
    if (isMusicalScorePhase) {
      void startLessonOpeningSequence();
      return;
    }
    if (startsWithComparison) {
      const previous = comparisonPairs.findIndex((pair) => pair.id === cueId);
      const count = previous < 0 ? comparisonPairs.length : previous;
      settledComparisonNotes = comparisonPairs.slice(0, count)
        .flatMap((pair, index) => buildSettledComparisonNotes(pair, index));
      comparisonFlightNotes = [];
      if (cueId === 'finish') {
        void finishComparisonSequence(beginSequence(), selectedAction);
      } else {
        void startComparisonQuestion(previous, selectedAction === 'question', selectedAction as 'question' | 'retry' | 'correct');
      }
      return;
    }
    if (cueId === 'introduce-height') {
      void startIntroSequence(selectedAction as 'opening' | 'low-notes' | 'high-notes' | 'slide-out');
      return;
    }
    const index = tasks.findIndex((task) => task.id === cueId);
    if (index >= 0) void startTask(index, selectedAction as 'prompt' | 'place' | 'retry' | 'correct' | 'slide-out');
  }

  onMount(() => {
    lastActionSkipSignal = actionSkipSignal;
    actionSkipSignalReady = true;
    unregisterInspector = inspector?.register(cuePlan, seekTo);
  });

  onDestroy(() => {
    unregisterInspector?.();
    sequenceToken += 1;
    questionNarration.submit();
    resolveActionSkipWaiters();
    cancelWait(true);
    stopTone();
    stopScoreCursorAnimation();
    clearScoreHighlights();
    clearFlashRegion();
    cancelLessonAvatarSpeech();
    if (audioContext && audioContext.state !== 'closed') void audioContext.close();
  });
  $: audioOutput.setVolume(volume);
</script>

<div
  class="pitch-scene"
  style={`--pitch-overlay-note-size:${pitchGridOverlayNoteSize}px; --pitch-hit-target-size:${pitchGridHitTargetSize}px;`}
>
  <div class={`pitch-scene-support ${startsWithComparison || comparisonQuestionVisible ? 'is-comparison' : ''}`}>
    <div class="mlt-lesson-avatar-anchor" class:mlt-lesson-avatar-centered={startsWithComparison} bind:this={avatarAnchorEl}
      use:lessonScreenSlide={{ direction: 'to-offset', offset: motion.avatarOffset, instant: motion.avatarInstant, paused: !isPlaying, replayKey: motion.key }}>
    <LessonAvatarDock
      character="grammy"
      speechText={narrationText}
      underlinedWords={comparisonUnderlinedWords}
      on:ready={handleAvatarReady}
    />

    {#if avatarSourceNoteVisible}
      <button
        bind:this={noteEl}
        class={`mlt-lesson-note-target pitch-note pitch-note--avatar-source ${dragging && dragOrigin === 'avatar' ? 'is-dragging' : ''} ${sourceNoteActive ? 'is-active' : ''} ${noteIsSounding ? 'is-sounding' : ''} ${interactionEnabled ? '' : 'is-muted'}`}
        use:lessonNoteAppearance={{ audioOutput, cellWidth: pitchGridCellWidth, frequency: sourceNoteActive ? null : pitchRows[getRowIndexForPercent(noteY)]?.frequency }}
        type="button"
        style:--drag-x={dragging && dragOrigin === 'avatar' ? `${dragClientX}px` : null}
        style:--drag-y={dragging && dragOrigin === 'avatar' ? `${dragClientY}px` : null}
        aria-label={interactionEnabled
          ? 'Draggable pitch note source'
          : 'Pitch note sounding beside the avatar'}
        on:pointerdown={(event) => handleNotePointerDown(event, 'avatar')}
        on:pointermove={handleNotePointerMove}
        on:pointerup={handleNotePointerUp}
        on:pointercancel={handleNotePointerCancel}
      ></button>
    {/if}

    {#if comparisonQuestionVisible && currentComparisonPair}
      {#key comparisonIndex}
      <div
        class="comparison-options"
        bind:this={comparisonOptionsEl}
        use:lessonScreenSlide={{ direction: motion.comparisonEntering ? 'enter-left' : null, paused: !isPlaying, replayKey: motion.key }}
        aria-label={currentComparisonQuestion}
      >
        {#each currentComparisonPair.toneNotes as toneNote, optionIndex}
          {@const optionRow = getRowIndexForTone(toneNote)}
          <button
            class={`mlt-lesson-note-target comparison-option ${activeComparisonOptionIndex === optionIndex ? 'is-active' : ''}`}
            use:lessonNoteAppearance={{ audioOutput, cellWidth: pitchGridCellWidth, frequency: pitchRows[optionRow]?.frequency, active: activeComparisonOptionIndex === optionIndex }}
            type="button"
            style:color={pitchRows[optionRow]?.hex ?? '#6a5140'}
            aria-label={`Choose note ${optionIndex + 1}`}
            disabled={comparisonAnswerLocked || !isPlaying}
            on:click={() => void handleComparisonAnswer(optionIndex)}
          ></button>
        {/each}
      </div>
      {/key}
    {/if}
    </div>
  </div>

  <section
    class={`pitch-workspace ${feedbackState ? `is-${feedbackState}` : ''} ${scorePlaybackVisible ? 'is-score-prelude' : ''}`}
  >
    <div
      class="mlt-lesson-grid-frame pitch-grid-frame"
        bind:clientWidth={pitchGridFrameWidth}
        bind:clientHeight={pitchGridFrameHeight}
      >
      <div
        class="pitch-grid-shell"
        class:is-hidden={motion.gridHidden}
        style={`width:${pitchGridShellWidth}px; height:${pitchGridShellHeight}px;`}
      >
        <div
          class="pitch-grid-field"
          bind:clientWidth={pitchGridViewportWidth}
          bind:clientHeight={pitchGridViewportHeight}
        >
          {#if pitchGridViewportWidth > 0 && pitchGridViewportHeight > 0}
            <div class="pitch-grid-render">
            <PitchGrid
              mode="singing"
              fullRowData={pitchRows}
              viewport={pitchGridViewport}
              cellWidth={pitchGridCellWidth}
              cellHeight={pitchGridCellHeight}
              colorMode="color"
              showOctaveLabels={true}
              showLegendLabels={false}
              showAccidentalLabels={false}
              showFrequencyLabels={false}
              showRightLegend={false}
              singingConfig={pitchGridSingingConfig}
              showHorizontalGridLines={true}
              {...lessonGridAppearance}
              showColumnGrid={false}
            />
            </div>

            {#if scorePlaybackVisible}
              <div
                class="score-playback-layer"
                style={`--score-width:${scoreWidthPx}px; --score-cursor-x:${scoreCursorColumn * scoreColumnWidthPx}px;`}
                aria-hidden="true"
              >
                {#each isMusicalOutro ? [] : scoreColumnGuides as guide}
                  <div
                    class={`score-column-guide ${guide.boundaryStyle ? 'is-boundary' : ''} ${guide.boundaryStyle === 'solid' ? 'is-solid' : ''} ${guide.boundaryStyle === 'dashed' ? 'is-dashed' : ''} ${guide.isTerminal ? 'is-terminal' : ''}`}
                    style={`left:${guide.leftPx}px;`}
                  ></div>
                {/each}

                {#each scoreNoteRenderItems as note}
                  <div
                    class={`score-note-item ${activeScoreItemIds.has(note.id) ? 'is-active' : ''}`}
                    style={`top:${note.top};`}
                  >
                    {#if note.tailWidthPx > 0}
                      <span
                        class="score-note-tail"
                        style={`left:${note.tailLeftPx}px; width:${note.tailWidthPx}px; background:${note.color}; height:${Math.max(1, scoreColumnWidthPx * 0.2)}px;`}
                      ></span>
                    {/if}
                    {#if note.shape === 'diamond'}
                      <svg
                        class="mlt-lesson-note-svg score-note-shape"
                        use:lessonNoteAppearance={{ audioOutput, frequency: note.frequency, noteId: note.id, shape: 'diamond', cellWidth: scoreColumnWidthPx * 0.5 }}
                        viewBox="0 0 100 100" preserveAspectRatio="none"
                        style:left={`${note.leftPx}px`}
                        style:width={`${note.widthPx}px`}
                        style:height={`${note.heightPx}px`}
                        style:color={note.color}
                        aria-hidden="true"
                      ><polygon points="50,0 100,50 50,100 0,50" /></svg>
                    {:else}
                      <span
                        class={`mlt-lesson-note score-note-shape ${note.isCapsule ? 'mlt-lesson-note--capsule' : ''}`}
                        use:lessonNoteAppearance={{ audioOutput, frequency: note.frequency, noteId: note.id, shape: note.shape, cellWidth: scoreColumnWidthPx }}
                        style:left={`${note.leftPx}px`}
                        style:width={`${note.widthPx}px`}
                        style:height={`${note.heightPx}px`}
                        style:color={note.color}
                      ></span>
                    {/if}
                  </div>
                {/each}

                {#each scoreStampRenderItems as stamp}
                  {#if stamp.kind === 'diamond'}
                    <svg
                      class={`mlt-lesson-note-svg score-stamp-shape score-stamp-shape--diamond ${activeScoreItemIds.has(stamp.id) ? 'is-active' : ''}`}
                      use:lessonNoteAppearance={{ cellWidth: stamp.widthPx, audioOutput, frequency: stamp.frequency, noteId: stamp.id, shape: stamp.kind }}
                      viewBox={scoreStampDiamondViewBox}
                      preserveAspectRatio="none"
                      style:left={`${stamp.centerX}px`}
                      style:top={stamp.top}
                      style:width={`${stamp.widthPx}px`}
                      style:height={`${stamp.heightPx}px`}
                      style:color={stamp.color}
                      focusable="false"
                    >
                      <path
                        d={scoreStampDiamondPath}
                        fill="currentColor"
                        fill-opacity="1"
                        stroke="currentColor"
                        stroke-width="var(--mlt-lesson-note-stroke-width)"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  {:else}
                    <span
                      class={`mlt-lesson-note score-stamp-shape score-stamp-shape--oval ${activeScoreItemIds.has(stamp.id) ? 'is-active' : ''}`}
                      use:lessonNoteAppearance={{ cellWidth: stamp.widthPx, audioOutput, frequency: stamp.frequency, noteId: stamp.id, shape: stamp.kind }}
                      style:left={`${stamp.centerX}px`}
                      style:top={stamp.top}
                      style:width={`${stamp.widthPx}px`}
                      style:height={`${stamp.heightPx}px`}
                      style:color={stamp.color}
                    ></span>
                  {/if}
                {/each}

                <div class="score-playback-cursor"></div>
              </div>
            {/if}

            <div class="pitch-grid-field-overlay" bind:this={fieldEl}
              use:lessonOutsidePlacement={{
                enabled: interactionEnabled && isPlaying && !dragging,
                questionKey: `${sequenceToken}-${taskIndex}`,
                leftInset: pitchGridCellWidth * 6,
                onDrop: (event) => { void placeNoteFromOutside(event); },
              }}>
              <div
                class={`pitch-field-half pitch-field-half--upper ${flashRegion === 'upper' || activeRegion === 'upper' ? 'is-active' : ''}`}
                aria-hidden="true"
              ></div>
              <div
                class={`pitch-field-half pitch-field-half--lower ${flashRegion === 'lower' || activeRegion === 'lower' ? 'is-active' : ''}`}
                aria-hidden="true"
              ></div>

              {#if introExampleNotes.length > 0}
                <div class="intro-example-note-layer" aria-hidden="true"
                  use:lessonScreenSlide={{ direction: motion.introExiting ? 'exit-right' : null, paused: !isPlaying, replayKey: motion.key }}>
                  {#each introExampleNotes as note (note.id)}
                    <div
                      class={`mlt-lesson-note intro-example-note ${note.isActive ? 'is-active' : ''}`}
                      use:lessonNoteAppearance={{ audioOutput, cellWidth: pitchGridCellWidth, frequency: getFrequencyForToneNote(note.toneNote) ?? undefined, active: note.isActive }}
                      use:lessonScreenSlide={{ direction: motion.introEntering.includes(note.toneNote) ? 'enter-left' : null, paused: !isPlaying, replayKey: motion.key }}
                      style:top={note.top}
                      style:left={note.left}
                      style:color={note.color}
                    ></div>
                  {/each}
                </div>
              {/if}

              {#if settledComparisonNotes.length > 0}
                <div class="comparison-settled-layer" aria-hidden="true"
                  use:lessonScreenSlide={{ direction: motion.comparisonExiting ? 'exit-right' : null, paused: !isPlaying, replayKey: motion.key }}>
                  {#each settledComparisonNotes as note (note.id)}
                    <span
                      class={`mlt-lesson-note comparison-settled-note ${activeSettledComparisonNoteId === note.id ? 'is-active' : ''}`}
                      use:lessonNoteAppearance={{ audioOutput, cellWidth: pitchGridCellWidth, frequency: pitchRows[note.rowIndex]?.frequency, active: activeSettledComparisonNoteId === note.id }}
                      style:top={`${rowCenter(note.rowIndex)}%`}
                      style:left={`${note.leftPercent}%`}
                      style:color={note.color}
                    ></span>
                  {/each}
                </div>
              {/if}

              <div class="placement-note-layer"
                use:lessonScreenSlide={{ direction: motion.placementExiting ? 'exit-right' : null, paused: !isPlaying, replayKey: motion.key }}>
              {#each motion.placedNotes as note (note.id)}
                <span class="mlt-lesson-note placement-settled-note"
                  use:lessonNoteAppearance={{ audioOutput, cellWidth: pitchGridCellWidth, frequency: pitchRows[note.rowIndex]?.frequency }}
                  style:top={`${rowCenter(note.rowIndex)}%`} style:left={`${note.leftPercent}%`} style:color={note.color}
                  aria-hidden="true"></span>
              {/each}
              {#if complete && !comparisonStarted}
                {#each closingNotes as closingNote}
                  <div
                    class="mlt-lesson-note-target pitch-note pitch-note--settled"
                    use:lessonNoteAppearance={{ audioOutput, cellWidth: pitchGridCellWidth, frequency: closingNote.frequency }}
                    style:top={closingNote.top}
                    style:left={closingNote.left}
                    aria-hidden="true"
                  ></div>
                {/each}
              {:else if gridPitchNoteVisible && motion.placementVisible}
                {#key taskIndex}
                <button
                  bind:this={noteEl}
                  class={`mlt-lesson-note-target pitch-note ${dragging ? 'is-dragging' : ''} ${noteIsSounding ? 'is-sounding' : ''} ${interactionEnabled ? '' : 'is-muted'}`}
                  use:lessonNoteAppearance={{ audioOutput, cellWidth: pitchGridCellWidth, frequency: pitchRows[getRowIndexForPercent(noteY)]?.frequency }}
                  use:lessonScreenSlide={{ direction: motion.placementEntering ? 'enter-left' : null, paused: !isPlaying, replayKey: motion.key }}
                  type="button"
                  style:top={`${noteY}%`}
                  style:left="50%"
                  style:color={currentPitchNoteColor}
                  aria-label={interactionEnabled
                    ? 'Draggable pitch note'
                    : 'Pitch note waiting for the next prompt'}
                  on:pointerdown={(event) => handleNotePointerDown(event, 'grid')}
                  on:pointermove={handleNotePointerMove}
                  on:pointerup={handleNotePointerUp}
                  on:pointercancel={handleNotePointerCancel}
                ></button>
                {/key}
              {/if}
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </section>

  {#if comparisonFlightNotes.length > 0}
    <div class="comparison-flight-layer" aria-hidden="true">
      {#each comparisonFlightNotes as note (note.id)}
        <span
          class={`mlt-lesson-note comparison-flight-note ${note.landed ? 'is-landed' : ''}`}
          use:lessonNoteAppearance={{ audioOutput, cellWidth: pitchGridCellWidth, frequency: undefined }}
          style:left={`${note.landed ? note.endX : note.startX}px`}
          style:top={`${note.landed ? note.endY : note.startY}px`}
          style:color={note.color}
        ></span>
      {/each}
    </div>
  {/if}
</div>

<style>
  :global(html:has(.pitch-scene)) { overflow-x: clip; }

  .pitch-grid-shell.is-hidden { visibility: hidden; }
  .pitch-grid-render { position: absolute; inset: 0; overflow: hidden; border-radius: 22px; }

  .pitch-scene {
    display: grid;
    grid-template-columns: minmax(16rem, 20rem) minmax(0, 1fr);
    gap: 1rem;
    align-items: stretch;
    min-height: 0;
  }

  .pitch-scene-support {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0.85rem;
    min-height: 100%;
  }

  .pitch-scene-support.is-comparison {
    flex-direction: column;
    justify-content: center;
  }

  .pitch-workspace {
    display: grid;
    gap: 0.9rem;
    padding: 0;
    min-width: 0;
    min-height: 0;
    width: 100%;
    max-width: 100%;
    justify-self: start;
    align-self: start;
    align-content: start;
    transition: border-color 0.18s ease, box-shadow 0.18s ease;
  }

  .pitch-workspace.is-score-prelude {
    width: 100%;
    max-width: none;
    justify-self: stretch;
  }

  .pitch-workspace.is-success .pitch-grid-field {
    border-color: rgba(66, 151, 94, 0.26);
    box-shadow: var(--amt-shadow), 0 0 0 1px rgba(66, 151, 94, 0.12);
  }

  .pitch-workspace.is-error .pitch-grid-field {
    border-color: rgba(201, 90, 77, 0.24);
    box-shadow: var(--amt-shadow), 0 0 0 1px rgba(201, 90, 77, 0.12);
  }

  .pitch-grid-frame {
    width: 100%;
    max-width: 100%;
    height: calc(clamp(34rem, calc(100svh - 10rem), 52rem) + 2rem);
  }

  .pitch-workspace.is-score-prelude .pitch-grid-frame {
    width: 100%;
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


  .pitch-grid-field-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 2;
  }

  .score-playback-layer {
    position: absolute;
    inset: 0 auto 0 0;
    width: min(var(--score-width), 100%);
    pointer-events: none;
    overflow: hidden;
    z-index: 1;
  }

  .score-column-guide {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1px;
    background: #adb5bd;
  }

  .score-column-guide.is-boundary {
    background: transparent;
    background: repeating-linear-gradient(to bottom, #adb5bd 0 5px, transparent 5px 10px);
  }

  .score-column-guide.is-dashed {
    background: repeating-linear-gradient(to bottom, #adb5bd 0 5px, transparent 5px 10px);
  }

  .score-column-guide.is-solid {
    background: #adb5bd;
  }

  .score-column-guide.is-terminal {
    width: 2px;
    background: #adb5bd;
  }

  .score-note-item {
    position: absolute;
    left: 0;
    width: 100%;
    height: 0;
  }

  .score-note-tail {
    position: absolute;
    top: -1px;
    height: 2px;
    border-radius: 999px;
    opacity: 0.95;

    transition:
      height 0.08s ease,
      top 0.08s ease,
      filter 0.08s ease;
  }

  .score-note-shape {
    position: absolute;
    top: 0;
    display: block;
    transform: translateY(-50%);
    transition:
      background-color 0.08s ease,
      box-shadow 0.08s ease,
      transform 0.08s ease;
  }

  .score-stamp-shape {
    position: absolute;
    display: block;
    transform: translate(-50%, -50%);

    transition:
      filter 0.08s ease,
      transform 0.08s ease;
  }

  .score-playback-cursor {
    position: absolute;
    top: 0;
    bottom: 0;
    left: var(--score-cursor-x);
    width: 3px;
    border-radius: 999px;
    background: rgba(220, 31, 31, 0.92);
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.75),
      0 0 14px rgba(220, 31, 31, 0.42);
    will-change: left;
  }

  .pitch-field-half {
    position: absolute;
    inset-inline: 0;
    height: 50%;
    opacity: 0;
    transition: opacity 0.15s ease;
    pointer-events: none;
  }

  .pitch-field-half--upper {
    top: 0;
    background: linear-gradient(180deg, rgba(78, 176, 226, 0.18), rgba(78, 176, 226, 0.04));
  }

  .pitch-field-half--lower {
    bottom: 0;
    background: linear-gradient(180deg, rgba(202, 187, 102, 0.04), rgba(202, 187, 102, 0.18));
  }

  .pitch-field-half.is-active {
    opacity: 1;
  }

  .intro-example-note-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 3;
  }

  .intro-example-note {
    position: absolute;
    width: var(--pitch-overlay-note-size);
    height: var(--pitch-overlay-note-size);
    aspect-ratio: 1 / 1;
    transform: translate(-50%, -50%);
    transition:
      background-color 0.1s ease,
      box-shadow 0.1s ease,
      transform 0.1s ease;
  }


  .comparison-options {
    position: absolute;
    top: calc(100% + 0.85rem);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1.25rem;
    min-height: 4rem;
  }

  .comparison-option {
    position: relative;
    width: max(3.25rem, var(--pitch-overlay-note-size));
    height: max(3.25rem, var(--pitch-overlay-note-size));
    border: 0;
    background: transparent;
    flex: 0 0 auto;
    padding: 0;
    appearance: none;
    cursor: pointer;
    transition:
      background-color 0.14s ease,
      box-shadow 0.14s ease,
      transform 0.14s ease;
  }

  .comparison-option::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: var(--pitch-overlay-note-size);
    height: var(--pitch-overlay-note-size);
    transform: translate(-50%, -50%);
  }


  .comparison-option:disabled {
    cursor: default;
    opacity: 1;
  }

  .comparison-settled-layer, .placement-note-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 4;
  }

  .comparison-settled-note,
  .placement-settled-note,
  .comparison-flight-note {
    width: var(--pitch-overlay-note-size);
    height: var(--pitch-overlay-note-size);
    display: block;
    transform: translate(-50%, -50%);
  }

  .comparison-settled-note, .placement-settled-note {
    position: absolute;
    transition:
      background-color 0.1s ease,
      box-shadow 0.1s ease,
      transform 0.1s ease;
  }


  .comparison-flight-layer {
    position: fixed;
    inset: 0;
    z-index: 60;
    pointer-events: none;
  }

  .comparison-flight-note {
    position: fixed;
    transition:
      left 0.68s cubic-bezier(0.2, 0.72, 0.2, 1),
      top 0.68s cubic-bezier(0.2, 0.72, 0.2, 1);
  }

  .pitch-note {
    position: absolute;
    width: var(--pitch-hit-target-size);
    height: var(--pitch-hit-target-size);
    aspect-ratio: 1 / 1;
    padding: 0;
    border: 0;
    border-radius: 999px;
    appearance: none;
    background: transparent;
    transform: translate(-50%, -50%);
    transition:
      top 0.22s cubic-bezier(0.2, 0.7, 0.2, 1),
      color 0.12s ease;
    cursor: grab;
    z-index: 2;
    pointer-events: auto;
    touch-action: none;
  }

  .pitch-note::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: var(--pitch-overlay-note-size);
    height: var(--pitch-overlay-note-size);


    transform: translate(-50%, -50%);
    transition:
      background-color 0.16s ease,
      box-shadow 0.18s ease,
      border-color 0.18s ease,
      transform 0.18s ease;
  }

  .pitch-note.is-dragging {
    transition: none;
    cursor: grabbing;
  }

  .pitch-note--avatar-source {
    position: relative;
    top: auto;
    left: auto;
    flex: 0 0 auto;
    transform: none;
  }

  .pitch-note--avatar-source.is-dragging {
    position: fixed;
    top: var(--drag-y);
    left: var(--drag-x);
    transform: translate(-50%, -50%);
    z-index: 50;
  }

  .pitch-note.is-muted {
    cursor: default;
  }

  .pitch-note--settled {
    cursor: default;
    pointer-events: none;
  }

  @media (max-width: 980px) {
    .pitch-scene {
      grid-template-columns: 1fr;
    }

    .pitch-scene-support {
      display: grid;
      grid-template-columns: minmax(0, 18rem) minmax(0, 1fr);
      align-items: start;
      min-height: auto;
    }

    .pitch-scene-support.is-comparison {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
  }

  @media (max-width: 760px) {
    .pitch-scene {
      gap: 0.7rem;
    }

    .pitch-scene-support {
      grid-template-columns: 1fr;
      width: 100%;
      gap: 0.65rem;
    }

    .pitch-workspace {
      width: 100%;
      justify-self: stretch;
      padding: 0;
    }

    .pitch-grid-frame {
      width: 100%;
      height: calc(clamp(22rem, 66svh, 34rem) + 1.3rem);
    }

    .pitch-grid-shell {
      gap: 0;
    }

    .pitch-grid-field {
      min-height: 0;
    }

    .pitch-note {
      width: max(2.75rem, var(--pitch-hit-target-size));
      height: max(2.75rem, var(--pitch-hit-target-size));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .comparison-option,
    .comparison-settled-note,
    .comparison-flight-note {
      transition: none;
    }
  }
</style>
