<script lang="ts">
  import { fullRowData } from '@mlt/pitch-data';
  import { PitchGrid } from '@mlt/ui-components/canvas';
  import type { PitchGridViewport, SingingModeConfig } from '@mlt/ui-components/canvas';
  import { onDestroy, onMount } from 'svelte';
  import LessonAvatarDock from './LessonAvatarDock.svelte';
  import { cancelLessonAvatarSpeech, speakWithLessonAvatar } from './lessonAvatar';
  import type { LessonSection } from './lessons';
  import lessonScoreFile from './lesson-assets/SN-score-April21.json';

  export let section: LessonSection;
  export let isPlaying = true;
  export let volume = 72;
  export let actionSkipSignal = 0;

  type PitchRegion = 'upper' | 'lower';
  type PracticeTask = {
    id: string;
    badge: string;
    title: string;
    prompt: string;
    narration: string;
    target: PitchRegion;
    tones: number[];
    snapTone: string;
    reinforcement: string;
    replayLabel: string;
  };

  type LegendCell = {
    id: string;
    rowIndex: number;
    column: 'A' | 'B';
    hex: string;
    textColor: string;
    anchorLabel: string | null;
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
  };

  type ScoreStampRenderItem = {
    id: string;
    kind: 'diamond' | 'oval';
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

  function getContrastColor(hex: string): string {
    const normalized = hex.replace('#', '');
    if (normalized.length !== 6) return '#ffffff';
    const red = Number.parseInt(normalized.slice(0, 2), 16);
    const green = Number.parseInt(normalized.slice(2, 4), 16);
    const blue = Number.parseInt(normalized.slice(4, 6), 16);
    const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
    return luminance > 164 ? '#1b221e' : '#ffffff';
  }

  function getLegendAnchorLabel(toneNote: string): string | null {
    if (toneNote === 'A0') return toneNote;
    return /^C[1-8]$/.test(toneNote) ? toneNote : null;
  }

  const pitchRows = fullRowData;
  const rowCount = pitchRows.length;
  const pitchGridFallbackColumnSize = 18;
  const pitchGridLegendWidthUnits = 6;
  const pitchGridMinHitTargetSize = 32;
  const pitchGridMaxHitTargetSize = 48;
  const pitchGridSingingConfig: SingingModeConfig = { pitchHistory: [] };
  const resetRowIndex = Math.floor(rowCount / 2);
  const resetY = ((resetRowIndex + 1) / (rowCount + 1)) * 100;
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
  const introScoreViewportStartRow = rowIndexByTone.get('C6') ?? 0;
  const introScoreViewportEndRow = rowIndexByTone.get('G3') ?? rowCount - 1;
  const scoreStampDiamondViewBox = '0 0 25 100';
  const scoreStampDiamondPath = 'M 12.5 2 L 2 12.5 L 2 87.5 L 12.5 98 L 23 87.5 L 23 12.5 Z';
  const legendCells: LegendCell[] = pitchRows.map((row, rowIndex) => ({
    id: `legend-${row.toneNote}`,
    rowIndex,
    column: row.column,
    hex: row.hex,
    textColor: getContrastColor(row.hex),
    anchorLabel: getLegendAnchorLabel(row.toneNote),
  }));
  const scoreTempo = Number.isFinite(lessonScore.tempo) && lessonScore.tempo > 0
    ? lessonScore.tempo
    : 66;
  const scoreQuarterMs = 60000 / scoreTempo;
  const scoreColumnDurationMs = scoreQuarterMs / 2;
  const scoreSlotDurationMs = scoreQuarterMs / 4;
  const scoreTotalColumns = getScoreTotalColumns(lessonScore);
  const scoreTotalSlots = scoreTotalColumns * 2;
  const scoreBoundaryStylesByColumn = getScoreBoundaryStylesByColumn(lessonScore);
  const scorePlaybackEvents = buildScorePlaybackEvents(lessonScore);
  const scorePlaybackEventsBySlot = groupScoreEventsBySlot(scorePlaybackEvents);
  const lowIntroToneNotes = ['C3', 'A2', 'F2'];
  const highIntroToneNotes = ['C6', 'E6', 'G6'];
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
      snapTone: 'A3',
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
      snapTone: 'A5',
      reinforcement: 'Good. Higher sounds belong higher in the pitch space.',
      replayLabel: 'Repeat prompt',
    },
    {
      id: 'contrast-1',
      badge: 'Prompt 3 - 1 of 4',
      title: 'Listen, then place the note',
      prompt: 'Listen, then place the note where it belongs.',
      narration: 'Listen, then place the note where it belongs.',
      target: 'lower',
      tones: [196],
      snapTone: 'G3',
      reinforcement: 'Yes. That sound belongs in the lower region.',
      replayLabel: 'Replay contrast tone',
    },
    {
      id: 'contrast-2',
      badge: 'Prompt 3 - 2 of 4',
      title: 'Listen, then place the note',
      prompt: 'Listen, then place the note where it belongs.',
      narration: 'Listen, then place the note where it belongs.',
      target: 'upper',
      tones: [783.99],
      snapTone: 'G5',
      reinforcement: 'Yes. That sound belongs in the higher region.',
      replayLabel: 'Replay contrast tone',
    },
    {
      id: 'contrast-3',
      badge: 'Prompt 3 - 3 of 4',
      title: 'Listen, then place the note',
      prompt: 'Listen, then place the note where it belongs.',
      narration: 'Listen, then place the note where it belongs.',
      target: 'lower',
      tones: [246.94],
      snapTone: 'B3',
      reinforcement: 'Yes. Lower sounds still belong lower.',
      replayLabel: 'Replay contrast tone',
    },
    {
      id: 'contrast-4',
      badge: 'Prompt 3 - 4 of 4',
      title: 'Listen, then place the note',
      prompt: 'Listen, then place the note where it belongs.',
      narration: 'Listen, then place the note where it belongs.',
      target: 'upper',
      tones: [1046.5],
      snapTone: 'C6',
      reinforcement: 'Yes. Higher sounds still belong higher.',
      replayLabel: 'Replay contrast tone',
    },
    {
      id: 'comparison',
      badge: 'Prompt 4',
      title: 'Match the higher sound',
      prompt: 'Drag the note to match the higher sound.',
      narration: 'Drag the note to match the higher sound.',
      target: 'upper',
      tones: [293.66, 880],
      snapTone: 'A5',
      reinforcement: 'Good. The second sound belongs higher in the pitch space.',
      replayLabel: 'Replay comparison',
    },
  ];

  let fieldEl: HTMLDivElement | null = null;
  let noteEl: HTMLButtonElement | null = null;
  let pitchGridFrameWidth = 0;
  let pitchGridFrameHeight = 0;
  let pitchGridViewportWidth = 0;
  let pitchGridViewportHeight = 0;
  let pitchGridLayoutColumnSize = pitchGridFallbackColumnSize;
  let pitchGridCellWidth = pitchGridFallbackColumnSize;
  let pitchGridCellHeight = pitchGridFallbackColumnSize * 2;
  let pitchGridOverlayNoteSize = pitchGridFallbackColumnSize * 2;
  let pitchGridHitTargetSize = pitchGridMinHitTargetSize;
  let pitchGridLegendWidth = pitchGridFallbackColumnSize * pitchGridLegendWidthUnits;
  let pitchGridShellWidth = pitchGridFallbackColumnSize * (scoreTotalColumns + pitchGridLegendWidthUnits);
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
  let scorePlaybackVisible = true;
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
  let narrationText = '';
  let promptBadge = section.code;
  let promptTitle = section.label;
  let promptStatus = 'This space shows pitch from low to high.';
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
  let visiblePitchGridStartRow = 0;
  let visiblePitchGridEndRow = rowCount - 1;
  let visiblePitchGridRowCount = rowCount;

  $: visiblePitchGridStartRow = scorePlaybackVisible ? introScoreViewportStartRow : 0;
  $: visiblePitchGridEndRow = scorePlaybackVisible ? introScoreViewportEndRow : rowCount - 1;
  $: visiblePitchGridRowCount = Math.max(1, visiblePitchGridEndRow - visiblePitchGridStartRow + 1);
  $: pitchGridLayoutColumnSize = pitchGridFrameWidth > 0 && pitchGridFrameHeight > 0
    ? Math.max(
        1,
        Math.min(
          pitchGridFrameHeight / (visiblePitchGridRowCount + 1),
          pitchGridFrameWidth / (scoreTotalColumns + pitchGridLegendWidthUnits)
        )
      )
    : pitchGridFallbackColumnSize;
  $: pitchGridShellWidth = pitchGridLayoutColumnSize * (scoreTotalColumns + pitchGridLegendWidthUnits);
  $: pitchGridShellHeight = pitchGridLayoutColumnSize * (visiblePitchGridRowCount + 1);
  $: pitchGridCellHeight = pitchGridViewportHeight > 0
    ? (pitchGridViewportHeight * 2) / (visiblePitchGridRowCount + 1)
    : pitchGridLayoutColumnSize * 2;
  $: pitchGridCellWidth = pitchGridCellHeight / 2;
  $: pitchGridOverlayNoteSize = pitchGridCellHeight;
  $: pitchGridHitTargetSize = Math.max(
    pitchGridMinHitTargetSize,
    Math.min(pitchGridMaxHitTargetSize, pitchGridOverlayNoteSize * 2.2)
  );
  $: pitchGridLegendWidth = pitchGridCellWidth * pitchGridLegendWidthUnits;
  $: pitchGridViewport = {
    startRow: visiblePitchGridStartRow,
    endRow: visiblePitchGridEndRow,
    zoomLevel: 1,
    containerWidth: pitchGridViewportWidth,
    containerHeight: pitchGridViewportHeight,
  };
  $: currentTask = taskIndex >= 0 && taskIndex < tasks.length ? tasks[taskIndex] : null;
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
    (!currentTaskUsesAvatarNoteSource || notePlacedOnGrid);
  $: noteIsSounding = dragging && draggingOverPitchGrid && dragPreviewVoice !== null;
  $: closingNotes = [
    { id: 'closing-low', top: `${rowCenter(getRowIndexForTone('A3'))}%`, left: '39%' },
    { id: 'closing-high', top: `${rowCenter(getRowIndexForTone('A5'))}%`, left: '66%' },
  ];
  $: scoreColumnWidthPx = scoreTotalColumns > 0 && pitchGridViewportWidth > 0
    ? Math.min(pitchGridCellWidth, pitchGridViewportWidth / scoreTotalColumns)
    : pitchGridCellWidth;
  $: scoreWidthPx = scoreTotalColumns * scoreColumnWidthPx;
  $: scoreShapeHeightPx = pitchGridCellHeight;
  $: scoreColumnGuides = buildScoreColumnGuides(scoreColumnWidthPx);
  $: scoreNoteRenderItems = buildScoreNoteRenderItems(scoreColumnWidthPx, scoreShapeHeightPx);
  $: scoreStampRenderItems = buildScoreStampRenderItems(scoreColumnWidthPx, scoreShapeHeightPx);

  $: if (avatarReady && !introStarted && isPlaying) {
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
    return clampRowIndex(visiblePitchGridStartRow + relativeRowIndex);
  }

  function taskUsesAvatarNoteSource(task: PracticeTask | null): boolean {
    return task?.prompt === 'Listen, then place the note where it belongs.';
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
        const baseWidth = note.shape === 'oval' ? columnWidthPx : columnWidthPx * 2;
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

        return {
          id: note.uuid,
          top: `${rowCenter(row)}%`,
          color: note.color,
          shape: note.shape,
          leftPx: baseLeft,
          widthPx: Math.max(5, baseWidth),
          heightPx: shapeHeightPx,
          tailLeftPx,
          tailWidthPx,
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
        });
      }

      return items;
    });
  }

  function beginSequence(cancelSpeech = true): number {
    sequenceToken += 1;
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
    const progress = Math.max(0, Math.min(1, elapsedMs / (scoreTotalSlots * scoreSlotDurationMs)));
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

  function setIntroExampleNotes(toneNotes: string[], color: string): void {
    introExampleNotes = toneNotes.map((toneNote, index) => {
      const rowIndex = getRowIndexForTone(toneNote);
      const leftPercent = 30 + index * 18;
      return {
        id: `intro-example-${toneNote}`,
        toneNote,
        top: `${rowCenter(rowIndex)}%`,
        left: `${leftPercent}%`,
        color,
        isActive: activeIntroExampleTone === toneNote,
      };
    });
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
    }, event.durationMs);
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
    const peak = Math.max(0.012, Math.min(0.075, (volume / 100) * 0.055));
    const voice: ActiveVoice = { oscillator, gain, stopped: false };

    oscillator.type = defaultLessonWaveform;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.025);
    oscillator.connect(gain);
    gain.connect(context.destination);
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
    waveform: OscillatorType = defaultLessonWaveform
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
    gain.connect(context.destination);
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
    const peak = Math.max(0.008, Math.min(0.065, (volume / 100) * 0.052));
    startVoice(context, event.frequency, event.durationMs, peak, token);
  }

  async function playTone(
    frequency: number,
    durationMs: number,
    region: PitchRegion,
    token: number,
    waveform: OscillatorType = defaultLessonWaveform
  ): Promise<void> {
    if (!isCurrentSequence(token) || !isPlaying) return;
    const context = await ensureAudioContext();
    if (!context || !isCurrentSequence(token)) return;

    stopTone();
    const waveGain = waveform === 'sawtooth' ? 0.058 : 0.08;
    const peak = Math.max(0.015, Math.min(0.11, (volume / 100) * waveGain));
    startVoice(context, frequency, durationMs, peak, token, waveform);

    pulseRegion(region, durationMs + 60);
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

  function sayDuringScorePrelude(text: string, token: number): void {
    narrationText = text;
    if (!avatarReady || !isCurrentSequence(token)) return;
    void speakWithLessonAvatar(text, {
      lang: 'en-CA',
      rate: 0.92,
      chunking: 'sentence',
    }).catch(() => {});
  }

  async function startLessonOpeningSequence(): Promise<void> {
    const scorePlayed = await playScorePreludeSequence();
    if (!scorePlayed) return;
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
    promptStatus = 'Listen first. The red cursor will play the score across the pitch grid.';
    noteY = resetY;
    activeRegion = null;
    clearIntroExampleNotes();

    if (skipScorePreludeRequested) {
      skipScorePreludeRequested = false;
      scorePlaybackVisible = false;
      scorePreludeRunning = false;
      return true;
    }

    await waitMs(260);
    if (!isCurrentSequence(token)) return false;

    startScoreCursorAnimation(token);
    const greetingSlot = Math.floor(scoreTotalSlots / 2);
    let greetingSpoken = false;
    for (let slot = 0; slot < scoreTotalSlots; slot += 1) {
      if (!greetingSpoken && slot >= greetingSlot) {
        greetingSpoken = true;
        sayDuringScorePrelude('Hello', token);
      }

      const events = scorePlaybackEventsBySlot.get(slot) ?? [];
      for (const event of events) {
        activateScoreEvent(event, token);
        void playScoreEvent(event, token);
      }

      await waitMs(scoreSlotDurationMs);
      if (!isCurrentSequence(token)) return false;
    }

    stopScoreCursorAnimation();
    clearScoreHighlights();
    scoreCursorColumn = scoreTotalColumns;
    await say("Let's begin", token);
    if (!isCurrentSequence(token)) return false;

    scorePlaybackVisible = false;
    scorePreludeRunning = false;
    scoreCursorColumn = 0;
    stopTone();
    return true;
  }

  async function startIntroSequence(): Promise<void> {
    const token = beginSequence();
    scorePlaybackVisible = false;
    scorePreludeRunning = false;
    introRunning = true;
    complete = false;
    taskIndex = -1;
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

    await waitMs(320);
    if (!isCurrentSequence(token)) return;

    await say('This space shows pitch from low to high.', token);
    if (!isCurrentSequence(token)) return;

    await waitMs(120);
    if (!isCurrentSequence(token)) return;

    setIntroExampleNotes(lowIntroToneNotes, '#2f8d83');
    await say('Lower notes belong lower down.', token);
    if (!isCurrentSequence(token)) return;

    promptStatus = 'Lower notes belong lower down.';
    await playToneNoteSequence(lowIntroToneNotes, 'lower', token);
    if (!isCurrentSequence(token)) return;

    await waitMs(160);
    if (!isCurrentSequence(token)) return;

    setIntroExampleNotes(highIntroToneNotes, '#c95a4d');
    await say('Higher sounds belong higher up.', token);
    if (!isCurrentSequence(token)) return;

    promptStatus = 'Higher sounds belong higher up.';
    await playToneNoteSequence(highIntroToneNotes, 'upper', token);
    if (!isCurrentSequence(token)) return;

    await waitMs(240);
    if (!isCurrentSequence(token)) return;

    clearIntroExampleNotes();
    introRunning = false;
    await startTask(0);
  }

  async function startTask(index: number): Promise<void> {
    if (index >= tasks.length) {
      await finishSubsection();
      return;
    }

    const task = tasks[index];
    const token = beginSequence();
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
      await say(task.narration, token);
      if (!isCurrentSequence(token)) return;
    }
  }

  async function finishSubsection(): Promise<void> {
    const token = beginSequence();
    complete = true;
    interactionEnabled = false;
    notePlacedOnGrid = true;
    sourceNoteActive = false;
    feedbackState = null;
    clearIntroExampleNotes();
    promptBadge = `${section.code} complete`;
    promptTitle = 'High and low are now separate regions';
    promptStatus =
      'Lower pitches belong lower in the space. Higher pitches belong higher in the space.';
    narrationText = promptStatus;
    noteY = resetY;
    activeRegion = null;
    await say(promptStatus, token);
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
    const token = beginSequence();
    interactionEnabled = false;
    notePlacedOnGrid = true;
    sourceNoteActive = false;
    feedbackState = 'success';
    clearIntroExampleNotes();
    noteY = rowCenter(getRowIndexForTone(currentTask.snapTone));
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
    await startTask(taskIndex + 1);
  }

  async function handleIncorrectDrop(): Promise<void> {
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

  onMount(() => {
    lastActionSkipSignal = actionSkipSignal;
    actionSkipSignalReady = true;
  });

  onDestroy(() => {
    sequenceToken += 1;
    resolveActionSkipWaiters();
    cancelWait(true);
    stopTone();
    stopScoreCursorAnimation();
    clearScoreHighlights();
    clearFlashRegion();
    cancelLessonAvatarSpeech();
    if (audioContext && audioContext.state !== 'closed') void audioContext.close();
  });
</script>

<div
  class="pitch-scene"
  style={`--pitch-overlay-note-size:${pitchGridOverlayNoteSize}px; --pitch-hit-target-size:${pitchGridHitTargetSize}px;`}
>
  <div class="pitch-scene-support">
    <LessonAvatarDock
      character="grammy"
      speechText={narrationText}
      on:ready={handleAvatarReady}
    />

    {#if avatarSourceNoteVisible}
      <button
        bind:this={noteEl}
        class={`pitch-note pitch-note--avatar-source ${dragging && dragOrigin === 'avatar' ? 'is-dragging' : ''} ${sourceNoteActive ? 'is-active' : ''} ${noteIsSounding ? 'is-sounding' : ''} ${interactionEnabled ? '' : 'is-muted'}`}
        type="button"
        style={dragging && dragOrigin === 'avatar'
          ? `--drag-x:${dragClientX}px; --drag-y:${dragClientY}px;`
          : ''}
        aria-label={interactionEnabled
          ? 'Draggable pitch note source'
          : 'Pitch note sounding beside the avatar'}
        on:pointerdown={(event) => handleNotePointerDown(event, 'avatar')}
        on:pointermove={handleNotePointerMove}
        on:pointerup={handleNotePointerUp}
        on:pointercancel={handleNotePointerCancel}
      ></button>
    {/if}
  </div>

  <section
    class={`pitch-workspace app-card ${feedbackState ? `is-${feedbackState}` : ''} ${scorePlaybackVisible ? 'is-score-prelude' : ''}`}
  >
    <div
      class="pitch-grid-frame"
      bind:clientWidth={pitchGridFrameWidth}
      bind:clientHeight={pitchGridFrameHeight}
      style={`--legend-width:${pitchGridLegendWidth}px;`}
    >
      <div
        class="pitch-grid-shell"
        style={`width:${pitchGridShellWidth}px; height:${pitchGridShellHeight}px;`}
      >
        <div class="pitch-grid-legend" aria-hidden="true">
          {#each legendCells as cell}
            <div
              class={`pitch-grid-legend-cell ${cell.column === 'B' ? 'is-column-b' : 'is-column-a'} ${cell.anchorLabel ? 'is-anchor-row' : ''}`}
              style={`top:${rowCenter(cell.rowIndex)}%; height:${pitchGridCellHeight}px; background:${cell.hex}; color:${cell.textColor};`}
            >
              {#if cell.anchorLabel}
                <span class="pitch-grid-legend-label">{cell.anchorLabel}</span>
              {/if}
            </div>
          {/each}
        </div>

        <div
          class="pitch-grid-field"
          bind:clientWidth={pitchGridViewportWidth}
          bind:clientHeight={pitchGridViewportHeight}
        >
          {#if pitchGridViewportWidth > 0 && pitchGridViewportHeight > 0}
            <PitchGrid
              mode="singing"
              fullRowData={pitchRows}
              viewport={pitchGridViewport}
              cellWidth={pitchGridCellWidth}
              cellHeight={pitchGridCellHeight}
              colorMode="color"
              showOctaveLabels={false}
              showFrequencyLabels={false}
              showRightLegend={false}
              singingConfig={pitchGridSingingConfig}
              showHorizontalGridLines={true}
              horizontalGridReferencePitchClass={0}
            />

            {#if scorePlaybackVisible}
              <div
                class="score-playback-layer"
                style={`--score-width:${scoreWidthPx}px; --score-cursor-x:${scoreCursorColumn * scoreColumnWidthPx}px;`}
                aria-hidden="true"
              >
                {#each scoreColumnGuides as guide}
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
                        style={`left:${note.tailLeftPx}px; width:${note.tailWidthPx}px; background:${note.color};`}
                      ></span>
                    {/if}
                    <span
                      class={`score-note-shape score-note-shape--${note.shape}`}
                      style={`left:${note.leftPx}px; width:${note.widthPx}px; height:${note.heightPx}px; color:${note.color}; border-color:${note.color}; box-shadow:0 0 0.7px ${note.color}, 0 0 9px color-mix(in srgb, ${note.color} 28%, transparent);`}
                    ></span>
                  </div>
                {/each}

                {#each scoreStampRenderItems as stamp}
                  {#if stamp.kind === 'diamond'}
                    <svg
                      class={`score-stamp-shape score-stamp-shape--diamond ${activeScoreItemIds.has(stamp.id) ? 'is-active' : ''}`}
                      viewBox={scoreStampDiamondViewBox}
                      preserveAspectRatio="none"
                      style={`left:${stamp.centerX}px; top:${stamp.top}; width:${stamp.widthPx}px; height:${stamp.heightPx}px; color:${stamp.color};`}
                      focusable="false"
                    >
                      <path
                        d={scoreStampDiamondPath}
                        fill="currentColor"
                        fill-opacity="0.12"
                        stroke="currentColor"
                        stroke-width="4"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  {:else}
                    <span
                      class={`score-stamp-shape score-stamp-shape--oval ${activeScoreItemIds.has(stamp.id) ? 'is-active' : ''}`}
                      style={`left:${stamp.centerX}px; top:${stamp.top}; width:${stamp.widthPx}px; height:${stamp.heightPx}px; border-color:${stamp.color};`}
                    ></span>
                  {/if}
                {/each}

                <div class="score-playback-cursor"></div>
              </div>
            {/if}

            <div class="pitch-grid-field-overlay" bind:this={fieldEl}>
              <div
                class={`pitch-field-half pitch-field-half--upper ${flashRegion === 'upper' || activeRegion === 'upper' ? 'is-active' : ''}`}
                aria-hidden="true"
              ></div>
              <div
                class={`pitch-field-half pitch-field-half--lower ${flashRegion === 'lower' || activeRegion === 'lower' ? 'is-active' : ''}`}
                aria-hidden="true"
              ></div>

              {#if introExampleNotes.length > 0}
                <div class="intro-example-note-layer" aria-hidden="true">
                  {#each introExampleNotes as note}
                    <div
                      class={`intro-example-note ${note.isActive ? 'is-active' : ''}`}
                      style={`top:${note.top}; left:${note.left}; color:${note.color}; border-color:${note.color};`}
                    >
                      <span>{note.toneNote}</span>
                    </div>
                  {/each}
                </div>
              {/if}

              {#if complete}
                {#each closingNotes as closingNote}
                  <div
                    class="pitch-note pitch-note--settled"
                    style={`top:${closingNote.top}; left:${closingNote.left};`}
                    aria-hidden="true"
                  ></div>
                {/each}
              {:else if gridPitchNoteVisible}
                <button
                  bind:this={noteEl}
                  class={`pitch-note ${dragging ? 'is-dragging' : ''} ${noteIsSounding ? 'is-sounding' : ''} ${interactionEnabled ? '' : 'is-muted'}`}
                  type="button"
                  style={`top:${noteY}%; left:18%;`}
                  aria-label={interactionEnabled
                    ? 'Draggable pitch note'
                    : 'Pitch note waiting for the next prompt'}
                  on:pointerdown={(event) => handleNotePointerDown(event, 'grid')}
                  on:pointermove={handleNotePointerMove}
                  on:pointerup={handleNotePointerUp}
                  on:pointercancel={handleNotePointerCancel}
                ></button>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </section>
</div>

<style>
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

  .pitch-workspace {
    display: grid;
    gap: 0.9rem;
    padding: 1rem;
    min-width: 0;
    min-height: 0;
    width: fit-content;
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

  .pitch-workspace.is-success {
    border-color: rgba(66, 151, 94, 0.26);
    box-shadow: var(--amt-shadow), 0 0 0 1px rgba(66, 151, 94, 0.12);
  }

  .pitch-workspace.is-error {
    border-color: rgba(201, 90, 77, 0.24);
    box-shadow: var(--amt-shadow), 0 0 0 1px rgba(201, 90, 77, 0.12);
  }

  .pitch-grid-frame {
    width: fit-content;
    max-width: 100%;
    height: clamp(34rem, calc(100svh - 10rem), 52rem);
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    overflow: hidden;
  }

  .pitch-workspace.is-score-prelude .pitch-grid-frame {
    width: 100%;
  }

  .pitch-grid-shell {
    display: grid;
    grid-template-columns: var(--legend-width) minmax(0, 1fr);
    gap: 0;
    align-items: stretch;
    max-width: 100%;
    max-height: 100%;
  }

  .pitch-grid-legend {
    position: relative;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    border-radius: 22px 0 0 22px;
    border: 1px solid rgba(84, 65, 39, 0.14);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.84), rgba(249, 245, 237, 0.9));
  }

  .pitch-grid-legend-cell {
    position: absolute;
    width: 50%;
    transform: translateY(-50%);
    box-shadow: inset 0 0 0 0.8px rgba(255, 255, 255, 0.35);
  }

  .pitch-grid-legend-cell.is-column-b {
    left: 0;
  }

  .pitch-grid-legend-cell.is-column-a {
    left: 50%;
  }

  .pitch-grid-legend-cell.is-anchor-row {
    z-index: 1;
  }

  .pitch-grid-legend-label {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.62rem;
    line-height: 1;
    font-weight: 800;
    letter-spacing: 0.01em;
    color: inherit;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35), 0 1px 3px rgba(23, 18, 14, 0.35);
  }

  .pitch-grid-field {
    position: relative;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    border-radius: 0 22px 22px 0;
    border: 1px solid rgba(84, 65, 39, 0.14);
    border-left: 0;
    background:
      radial-gradient(580px 260px at 100% 8%, rgba(78, 176, 226, 0.06), transparent 62%),
      radial-gradient(620px 260px at 0% 100%, rgba(202, 187, 102, 0.06), transparent 64%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(247, 241, 231, 0.94));
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
    background: rgba(62, 70, 65, 0.11);
  }

  .score-column-guide.is-boundary {
    background: transparent;
    border-left: 1px dashed rgba(62, 70, 65, 0.34);
  }

  .score-column-guide.is-dashed {
    border-left-style: dashed;
  }

  .score-column-guide.is-solid {
    border-left-style: solid;
    border-left-width: 2px;
    border-left-color: rgba(34, 44, 39, 0.45);
  }

  .score-column-guide.is-terminal {
    background: transparent;
    border-left: 2px solid rgba(34, 44, 39, 0.42);
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
    box-shadow: 0 0 8px rgba(74, 144, 226, 0.22);
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
    border: 2px solid currentColor;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.22);
    transition:
      background-color 0.08s ease,
      box-shadow 0.08s ease,
      transform 0.08s ease;
  }

  .score-note-item.is-active .score-note-tail {
    top: -2px;
    height: 4px;
    filter: saturate(1.35) brightness(1.08);
  }

  .score-note-item.is-active .score-note-shape {
    background: color-mix(in srgb, currentColor 24%, rgba(255, 255, 255, 0.9));
    box-shadow:
      0 0 0 2px rgba(255, 255, 255, 0.86),
      0 0 16px currentColor,
      0 0 28px color-mix(in srgb, currentColor 42%, transparent);
    transform: translateY(-50%) scale(1.08);
  }

  .score-note-item.is-active .score-note-shape--diamond {
    transform: translateY(-50%) rotate(45deg) scale(1.08);
  }

  .score-note-shape--diamond {
    border-radius: 0;
    transform: translateY(-50%) rotate(45deg);
  }

  .score-stamp-shape {
    position: absolute;
    display: block;
    transform: translate(-50%, -50%);
    filter: drop-shadow(0 0 5px rgba(74, 144, 226, 0.22));
    transition:
      filter 0.08s ease,
      transform 0.08s ease;
  }

  .score-stamp-shape--oval {
    border: 2px solid currentColor;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.12);
  }

  .score-stamp-shape.is-active {
    filter:
      drop-shadow(0 0 2px rgba(255, 255, 255, 0.92))
      drop-shadow(0 0 9px currentColor)
      drop-shadow(0 0 18px currentColor);
    transform: translate(-50%, -50%) scale(1.16);
  }

  .score-stamp-shape--diamond.is-active {
    filter:
      drop-shadow(0 0 1px rgba(255, 255, 255, 0.88))
      drop-shadow(0 0 4px currentColor)
      drop-shadow(0 0 8px color-mix(in srgb, currentColor 42%, transparent));
    transform: translate(-50%, -50%);
  }

  .score-stamp-shape--diamond.is-active path {
    fill-opacity: 0.26;
    stroke-width: 4.5;
  }

  .score-stamp-shape--oval.is-active {
    background: color-mix(in srgb, currentColor 24%, rgba(255, 255, 255, 0.9));
    box-shadow:
      0 0 0 2px rgba(255, 255, 255, 0.86),
      0 0 16px currentColor;
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
    border-radius: 999px;
    color: currentColor;
    transform: translate(-50%, -50%);
  }

  .intro-example-note::before {
    content: '';
    position: absolute;
    inset: 0;
    border: 2px solid currentColor;
    border-radius: inherit;
    background: rgba(255, 255, 255, 0.36);
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.6),
      0 5px 12px rgba(39, 28, 18, 0.1),
      0 0 10px color-mix(in srgb, currentColor 20%, transparent);
    transition:
      background-color 0.1s ease,
      box-shadow 0.1s ease,
      transform 0.1s ease;
  }

  .intro-example-note span {
    position: absolute;
    top: 50%;
    left: calc(100% + 0.24rem);
    transform: translateY(-50%);
    padding: 0.08rem 0.22rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.78);
    box-shadow: 0 2px 7px rgba(39, 28, 18, 0.08);
    color: #1f241f;
    font-size: 0.64rem;
    line-height: 1;
    font-weight: 800;
    letter-spacing: 0;
    white-space: nowrap;
  }

  .intro-example-note.is-active::before {
    background: color-mix(in srgb, currentColor 26%, rgba(255, 255, 255, 0.88));
    box-shadow:
      0 0 0 2px rgba(255, 255, 255, 0.86),
      0 0 18px currentColor,
      0 0 32px color-mix(in srgb, currentColor 48%, transparent);
    transform: scale(1.1);
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
    transition: top 0.22s cubic-bezier(0.2, 0.7, 0.2, 1);
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
    border-radius: 999px;
    border: 2px solid #c95a4d;
    background: transparent;
    transform: translate(-50%, -50%);
    box-shadow: 0 7px 16px rgba(39, 28, 18, 0.13), inset 0 0 0 1px rgba(255, 255, 255, 0.45);
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

  .pitch-note.is-active::before {
    background: color-mix(in srgb, #c95a4d 26%, rgba(255, 255, 255, 0.9));
    box-shadow:
      0 0 0 2px rgba(255, 255, 255, 0.86),
      0 0 18px rgba(201, 90, 77, 0.72),
      0 0 32px rgba(201, 90, 77, 0.34);
    transform: translate(-50%, -50%) scale(1.1);
  }

  .pitch-note.is-dragging::before {
    box-shadow: 0 10px 22px rgba(39, 28, 18, 0.22), 0 0 0 8px rgba(201, 90, 77, 0.08);
    transform: translate(-50%, -50%) scale(1.03);
  }

  .pitch-note.is-dragging.is-sounding::before {
    background: color-mix(in srgb, #c95a4d 24%, rgba(255, 255, 255, 0.88));
    box-shadow:
      0 0 0 2px rgba(255, 255, 255, 0.82),
      0 0 18px rgba(201, 90, 77, 0.7),
      0 0 30px rgba(201, 90, 77, 0.32);
    transform: translate(-50%, -50%) scale(1.08);
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
    opacity: 0.9;
    cursor: default;
  }

  .pitch-note--settled {
    cursor: default;
    pointer-events: none;
  }

  .pitch-note--settled::before {
    border-color: #2f8d83;
    background: radial-gradient(
      circle at 35% 35%,
      rgba(255, 255, 255, 0.98),
      rgba(243, 252, 249, 0.95) 62%,
      rgba(212, 236, 231, 0.92)
    );
  }

  .pitch-workspace.is-success .pitch-note::before {
    border-color: #42975e;
  }

  .pitch-workspace.is-error .pitch-note::before {
    border-color: #b94d42;
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
  }

  @media (max-width: 760px) {
    .pitch-scene-support {
      grid-template-columns: 1fr;
    }

    .pitch-grid-frame {
      height: clamp(25rem, calc(100svh - 12rem), 42rem);
    }

    .pitch-grid-shell {
      gap: 0;
    }

    .pitch-grid-legend,
    .pitch-grid-field {
      min-height: 0;
    }

    .pitch-grid-legend-label {
      font-size: 0.56rem;
    }
  }
</style>
