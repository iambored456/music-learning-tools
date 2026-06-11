<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { createSixteenthHexPath } from '@mlt/notation-glyphs';
  import { TempoControls } from '@mlt/tempo-controls-ui';
  import NoteGlyph from './NoteGlyph.svelte';
  import {
    COLOR_PALETTE,
    DEFAULTS,
    KEY_CODES,
    MICROBEAT_TEMPO_MAX,
    MICROBEAT_TEMPO_MIN,
    NOTE_BANK_DISPLAY_GROUPS,
    TONIC_OPTIONS,
    createBoomwhackerSketchpadAudioEngine,
    createBoomwhackerSketchpadModel,
    findNoteDefinitionById,
    getDiatonicNoteDetailsFromKeyboard,
    getPitchNameForDisplay,
    type NoteDefinition,
    type BoomwhackerSketchpadState,
    type ScheduledPlaybackAudioEvent,
    type TonicValue,
  } from '@mlt/boomwhacker-sketchpad-core';
  import {
    deleteSketchpadLibraryEntry,
    listSketchpadLibraryEntries,
    saveSketchpadLibraryEntry,
    type SketchpadLibraryEntry,
  } from './libraryStore.js';
  import {
    LOCAL_DRUM_SAMPLE_ENTRIES,
    type LocalDrumSampleEntry,
  } from '@mlt/audio-samples/local-samples';

  const hubHref = new URL('..', `https://music-learning-tools.local${import.meta.env.BASE_URL}`).pathname;

  type NoteShape = 'oval' | 'diamond' | 'circle';

  type SixteenthSlot = 0 | 1;

  type PlacedNote = {
    noteId: string;
    label: string;
    interval: number;
    color: string;
    shape: NoteShape;
  };

  type NoteIconId = 'clap' | 'stomp' | 'djembe' | 'stick-clicks' | 'tambourine';

  type ExtendedNoteDefinition = NoteDefinition & {
    sampleId?: string;
    iconId?: NoteIconId;
  };

  type OvalCellContent = {
    shape: 'oval';
    notes: [PlacedNote];
  };

  type DiamondCellContent = {
    shape: 'diamond';
    notes: [PlacedNote | null, PlacedNote | null];
  };

  type CircleStartCellContent = {
    shape: 'circle';
    role: 'start';
    notes: [PlacedNote];
  };

  type CircleContinuationCellContent = {
    shape: 'circle';
    role: 'continuation';
    startCellIndex: number;
  };

  type GridCellContent = OvalCellContent | DiamondCellContent | CircleStartCellContent | CircleContinuationCellContent;

  type GridZone = 'pickup' | 'main';

  type VoiceIndex = 0 | 1 | 2 | 3;

  type VoiceCountMode = 1 | 2 | 3 | 4;

  type VoiceLayoutMode = 'intertwined' | 'separate';

  type TrackStyle = 'stacked' | 'horizontal';

  type PercussionNoteId = 'clap' | 'stomp' | 'djembe' | 'stick-clicks' | 'tambourine';

  type PercussionSampleSelections = Record<PercussionNoteId, string>;

  type LocalDrumSampleGroup = {
    machineId: string;
    machineLabel: string;
    samples: LocalDrumSampleEntry[];
  };

  type GridRow = {
    id: string;
    cells: Array<GridCellContent | null>;
  };

  type PersistedCanvasCell =
    | { shape: 'oval'; noteId: string }
    | { shape: 'diamond'; noteIds: [string | null, string | null] }
    | { shape: 'circle'; role: 'start'; noteId: string }
    | { shape: 'circle'; role: 'continuation'; startCellIndex: number };

  type PersistedCanvasState = {
    version: 1;
    pickupBeats: number;
    microbeatTempo?: number;
    rows: Array<Array<PersistedCanvasCell | null>>;
    pickupCells: Array<PersistedCanvasCell | null>;
    voiceCount?: VoiceCountMode;
    voiceLayoutMode?: VoiceLayoutMode;
    trackStyle?: TrackStyle;
    percussionSamples?: Partial<PercussionSampleSelections>;
    voices?: PersistedVoiceCanvas[];
  };

  type CanvasHistorySnapshot = {
    pickupBeats: number;
    voiceCount: VoiceCountMode;
    voiceLayoutMode: VoiceLayoutMode;
    voices: PersistedVoiceCanvas[];
  };

  type DragPayload = {
    source: 'bank' | 'cell';
    note: PlacedNote;
    voiceIndex?: VoiceIndex;
    zone?: GridZone;
    rowIndex?: number;
    cellIndex?: number;
    noteIndex?: number;
  };

  type PendingBankTouchActivation = {
    pointerId: number;
    noteId: string;
    shape: NoteShape;
    startX: number;
    startY: number;
  };

  type GridCellRef = {
    zone: GridZone;
    rowIndex: number;
    cellIndex: number;
    sourceRowIndex?: number;
  };

  type PlaybackStartSelection = {
    zone: GridZone;
    rowIndex: number;
    startIndex: number;
  };

  type GridDropTarget = GridCellRef & {
    voiceIndex: VoiceIndex;
    sixteenthSlot: SixteenthSlot | null;
  };

  type NoteSelectionRef = GridCellRef & {
    voiceIndex: VoiceIndex;
    noteIndex: number;
  };

  type BoxSelectionState = {
    pointerId: number | null;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    active: boolean;
    additive: boolean;
    initialSelection: string[];
  };

  type ClipboardNote = {
    voiceOffset: number;
    cellOffset: number;
    noteIndex: number;
    note: PlacedNote;
  };

  type SelectionClipboard = {
    notes: ClipboardNote[];
  };

  type KaraokeAnchor = {
    rowIndex: number;
    leftPercent: number;
  };

  type KaraokeBallOverlayMetrics = {
    leftPx: number;
    topPx: number;
    arcOffsetPx: number;
    sizePx: number;
    anchorY: string;
  };

  type PlaybackHighlight = {
    zone: GridZone;
    rowIndex: number;
    startCellIndex: number;
    span: 1 | 2;
    pulseClass: 'playback-pulse-a' | 'playback-pulse-b';
  };

  type BankLatticeToken = {
    noteId: string;
    label: string;
    color: string;
    column: number;
  };

  type BankLatticeRows = {
    top: BankLatticeToken[];
    middle: BankLatticeToken[];
    bottom: BankLatticeToken[];
  };

  type PersistedVoiceCanvas = {
    rows: Array<Array<PersistedCanvasCell | null>>;
    pickupCells: Array<PersistedCanvasCell | null>;
  };

  type RenderedTrackRow = {
    voiceIndex: VoiceIndex;
    rowIndex: number;
    sourceRowIndex: number;
    loopCycle: number;
    includesPickup: boolean;
    key: string;
    row: GridRow;
    pickupRow: GridRow;
  };

  type ColorPaletteMode = 'oklch' | 'chromanotes';

  type MobileViewportProfile = {
    name: string;
    width: number;
    height: number;
  };

  type AdaptiveLayoutProfile = 'comfortable' | 'compact' | 'tight';

  type AdaptiveLayoutConfig = {
    profile: AdaptiveLayoutProfile;
    controlsColumns: number;
    rowsColumns: number;
    controlsScale: number;
    controlsGapPx: number;
    controlsPanelPaddingPx: number;
    groupMinWidthPx: number;
    bankScale: number;
    cellHeightRatio: number;
    rowsGapPx: number;
  };

  type AdaptiveLayoutMetrics = {
    viewportWidth: number;
    viewportHeight: number;
    coarsePointer: boolean;
    controlsGroupCount: number;
    rowCount: number;
  };

  type KaraokeAnchorTransition = {
    anchor: KaraokeAnchor;
    targetIndex: number;
    durationMs: number;
  };

  type HorizontalPlaybackHighwayState = {
    activationIndex: number | null;
    pinnedVoiceIndex: VoiceIndex | null;
    referenceViewportLeftPx: number | null;
  };

  type HorizontalPlaybackScrollAnimationState = {
    targetScrollLeft: number;
    startedAtMs: number;
    durationMs: number;
  };

  type RectSnapshot = {
    x: number;
    y: number;
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  };

  type PlaybackGeometryCache = {
    scrollLeft: number;
    panelRect: RectSnapshot;
    scrollShellRect: RectSnapshot | null;
    rowRects: Map<string, RectSnapshot>;
    cellRects: Map<string, RectSnapshot>;
    cellElements: Map<string, HTMLElement>;
    firstCellRects: Map<string, RectSnapshot>;
  };

  type AudioReadinessResult = {
    ready: boolean;
    resumedAudioContext: boolean;
    stabilizationDelayMs: number;
    startElapsedMs: number;
  };

  type StudentViewSettings = {
    hideMainVoice?: boolean;
    hideVolumeSlider?: boolean;
    hideGearSettings?: boolean;
    hideEighthBank?: boolean;
    hideSixteenthBank?: boolean;
    hidePickupBeats?: boolean;
    hideCanvasActions?: boolean;
    hideEighthTempo?: boolean;
    hideQuarterTempo?: boolean;
    hideDottedQuarterTempo?: boolean;
    hideTempoSlider?: boolean;
  };

  type ShareDocument = {
    v: 1;
    tonic: TonicValue;
    tempo: number;
    timeSig?: [number, number];
    pickupBeats: number;
    rows: Array<Array<PersistedCanvasCell | null>>;
    pickupCells: Array<PersistedCanvasCell | null>;
    voiceCount?: VoiceCountMode;
    voiceLayoutMode?: VoiceLayoutMode;
    trackStyle?: TrackStyle;
    percussionSamples?: Partial<PercussionSampleSelections>;
    voices?: PersistedVoiceCanvas[];
    sv?: StudentViewSettings;
  };

  type ShareDecodeResult =
    | { ok: true; doc: ShareDocument }
    | { ok: false; reason: 'checksum' | 'decode' | 'decompress' | 'parse' | 'version-unknown' | 'schema' | 'version-mismatch' };

  type LibrarySketchSettings = {
    countInEnabled: boolean;
    macrobeatMetronomeEnabled: boolean;
    metronomeVolume: number;
    colorPaletteMode: ColorPaletteMode;
    showAccidentals: boolean;
    showEighthsBank: boolean;
    showSixteenthsBank: boolean;
    mainPlaybackVoice: OscillatorType;
    mainVolume: number;
    playbackHighwayHeightPercent?: number;
  };

  type LibrarySketchDocument = {
    v: 1;
    composition: ShareDocument;
    settings: LibrarySketchSettings;
  };

  type LibrarySketchExportDocument = {
    v: 1;
    source: 'boomwhacker-sketchpad-library';
    name: string;
    savedAt: string;
    exportedAt: string;
    document: LibrarySketchDocument;
  };

  const PERCUSSION_NOTE_IDS: readonly PercussionNoteId[] = ['clap', 'stomp', 'djembe', 'stick-clicks', 'tambourine'] as const;

  const SUPPLEMENTAL_NOTE_DEFINITIONS: ExtendedNoteDefinition[] = [
    {
      id: 'clap',
      label: 'Clap',
      interval: 0,
      colorId: 'clap',
      sampleId: 'roland-tr-909-roland-tr-909-handclp2',
      iconId: 'clap',
    },
    {
      id: 'stomp',
      label: 'Stomp',
      interval: 0,
      colorId: 'stomp',
      sampleId: 'roland-tr-909-roland-tr-909-st3t0s3',
      iconId: 'stomp',
    },
    {
      id: 'djembe',
      label: 'Djembe',
      interval: 0,
      colorId: 'djembe',
      sampleId: 'kpr-series-kprlotom',
      iconId: 'djembe',
    },
    {
      id: 'stick-clicks',
      label: 'Stick Clicks',
      interval: 0,
      colorId: 'stick-clicks',
      sampleId: 'roland-tr-909-roland-tr-909-hhcd4',
      iconId: 'stick-clicks',
    },
    {
      id: 'tambourine',
      label: 'Tambourine',
      interval: 0,
      colorId: 'tambourine',
      sampleId: 'generic-percussion-tamb-1',
      iconId: 'tambourine',
    },
  ];

  const DEFAULT_PERCUSSION_SAMPLE_SELECTIONS: PercussionSampleSelections = Object.fromEntries(
    PERCUSSION_NOTE_IDS.map((noteId) => {
      const definition = SUPPLEMENTAL_NOTE_DEFINITIONS.find((note) => note.id === noteId);
      return [noteId, definition?.sampleId ?? ''];
    }),
  ) as PercussionSampleSelections;

  const LOCAL_DRUM_SAMPLE_BY_ID = new Map(LOCAL_DRUM_SAMPLE_ENTRIES.map((sample) => [sample.id, sample]));

  const LOCAL_DRUM_SAMPLE_GROUPS: LocalDrumSampleGroup[] = Array.from(
    LOCAL_DRUM_SAMPLE_ENTRIES.reduce<Map<string, LocalDrumSampleGroup>>((groups, sample) => {
      const existingGroup = groups.get(sample.machineId);
      if (existingGroup) {
        existingGroup.samples.push(sample);
        return groups;
      }

      groups.set(sample.machineId, {
        machineId: sample.machineId,
        machineLabel: sample.machineLabel,
        samples: [sample],
      });
      return groups;
    }, new Map()).values(),
  )
    .map((group) => ({
      ...group,
      samples: [...group.samples].sort((a, b) => a.label.localeCompare(b.label)),
    }))
    .sort((a, b) => a.machineLabel.localeCompare(b.machineLabel));

  const SUPPLEMENTAL_NOTE_COLORS = {
    clap: '#dfa049',
    stomp: '#24c1e1',
    djembe: '#7ac379',
    'stick-clicks': '#aaa0fa',
    tambourine: '#ef8aab',
  } as const;

  const CHROMANOTES_PALETTE: Record<string, string> = {
    '1': '#e20011',
    b2_s1: '#e32302',
    '2': '#ef6602',
    b3_s2: '#f5c202',
    '3': '#f8df01',
    '4': '#a7dd12',
    b5_s4: '#5ac757',
    '5': '#006e6d',
    b6_s5: '#0057b9',
    '6': '#262388',
    b7_s6: '#6e2771',
    '7': '#b9017a',
    clap: SUPPLEMENTAL_NOTE_COLORS.clap,
    stomp: SUPPLEMENTAL_NOTE_COLORS.stomp,
    djembe: SUPPLEMENTAL_NOTE_COLORS.djembe,
    'stick-clicks': SUPPLEMENTAL_NOTE_COLORS['stick-clicks'],
    tambourine: SUPPLEMENTAL_NOTE_COLORS.tambourine,
  };

  const model = createBoomwhackerSketchpadModel();
  const audio = createBoomwhackerSketchpadAudioEngine(model);

  const GRID_COLUMNS = 8;
  const INITIAL_ROWS = 4;
  const MICROBEATS_PER_BEAT = 2;
  const PICKUP_MAX_BEATS = 3;
  const CANVAS_PERSISTENCE_KEY = 'boomwhacker-sketchpad-ui:canvas:v1';
  const CANVAS_PERSISTENCE_VERSION = 1;
  const SHARE_FRAGMENT_PREFIX = 'share/';
  const SHARE_ROUTE_VERSION = 'v1';
  const SHARE_URL_WARN_LENGTH = 2000;
  const SHARE_URL_SEVERE_LENGTH = 4000;
  const KARAOKE_ARC_HEIGHT_MIN = 0;
  const KARAOKE_ARC_HEIGHT_MAX = 100;
  const KARAOKE_BALL_SIZE_MIN = 8;
  const KARAOKE_BALL_SIZE_MAX = 72;
  const PLAYBACK_HIGHWAY_HEIGHT_PERCENT_MIN = 35;
  const PLAYBACK_HIGHWAY_HEIGHT_PERCENT_MAX = 100;
  const PLAYBACK_HIGHWAY_HEIGHT_PERCENT_DEFAULT = 70;
  const LOW_SCALE_DEGREE_ONE_NOTE_ID = '1';
  const HIGH_SCALE_DEGREE_ONE_NOTE_ID = 'oct';
  const LOW_SCALE_DEGREE_ONE_LEGACY_LABEL = '1\u0332';
  const HIGH_SCALE_DEGREE_ONE_LEGACY_LABEL = '1\u0305';
  const BANK_LATTICE_TOKEN_SPAN = 24;
  const BANK_LATTICE_ACCIDENTAL_OFFSET = BANK_LATTICE_TOKEN_SPAN / 2;
  const BANK_LATTICE_COMPRESSED_NO_ACCIDENTAL_ADVANCE_TIGHT = 12;
  const BANK_LATTICE_COMPRESSED_NO_ACCIDENTAL_ADVANCE_CIRCLE = 15; // 2.5 on the original 4-unit scale
  const BANK_LATTICE_COMPRESSED_NO_ACCIDENTAL_ADVANCE_OVAL = 14; // ~2.33 on the original 4-unit scale
  const BANK_LATTICE_COLUMN_COUNT_CIRCLE = calculateBankLatticeColumnCount(true, BANK_LATTICE_COMPRESSED_NO_ACCIDENTAL_ADVANCE_CIRCLE);
  const BANK_LATTICE_COLUMN_COUNT_OVAL = calculateBankLatticeColumnCount(true, BANK_LATTICE_COMPRESSED_NO_ACCIDENTAL_ADVANCE_OVAL);
  const BANK_LATTICE_COLUMN_COUNT_DIAMOND = calculateBankLatticeColumnCount(true, BANK_LATTICE_COMPRESSED_NO_ACCIDENTAL_ADVANCE_TIGHT);
  const NOTE_BANK_SHORTCUT_NOTE_IDS = NOTE_BANK_DISPLAY_GROUPS.map((group) => group.natural);
  const CIRCLE_NOTE_SHORTCUT_CODES = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8'] as const;
  const OVAL_NOTE_SHORTCUT_CODES = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI'] as const;
  const DIAMOND_NOTE_SHORTCUT_CODES = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK'] as const;
  const countInIconUrl = new URL('./assets/count-in.svg', import.meta.url).href;
  const metronomeIconUrl = new URL('./assets/metronome.svg', import.meta.url).href;
  const loopIconUrl = new URL('./assets/loop.svg', import.meta.url).href;
  const volumeIconUrl = new URL('./assets/volume.svg', import.meta.url).href;
  const audioSamplesIconUrl = new URL('./assets/audio-samples.svg', import.meta.url).href;
  const undoIconUrl = new URL('./assets/undo.svg', import.meta.url).href;
  const redoIconUrl = new URL('./assets/redo.svg', import.meta.url).href;
  const eraserIconUrl = new URL('./assets/eraser.svg', import.meta.url).href;
  const CANVAS_HISTORY_MAX_SIZE = 300;
  const PLAYBACK_HIGHLIGHT_DEBUG = false;
  const PLAYED_NOTE_MUTING_DEBUG = false;
  const PLAYBACK_STARTUP_DEBUG = false;
  const PICKUP_RENDER_DEBUG = false;
  const MOBILE_LAYOUT_DEBUG = false;
  const TEMPO_SLIDER_LAYOUT_DEBUG = false;
  const AUDIO_RESUME_STABILIZATION_MS = 120;
  const CANVAS_PANEL_REPOSITION_MS = 240;
  const BANK_TOUCH_TAP_MAX_MOVEMENT_PX = 12;
  const VIEWPORT_FIT_HEIGHT_MAX = 1100;
  const VIEWPORT_FIT_WIDTH_MIN = 700;
  const ADAPTIVE_LAYOUT_DEFAULT: AdaptiveLayoutConfig = {
    profile: 'comfortable',
    controlsColumns: 4,
    rowsColumns: 1,
    controlsScale: 1,
    controlsGapPx: 8,
    controlsPanelPaddingPx: 8,
    groupMinWidthPx: 146,
    bankScale: 1,
    cellHeightRatio: 2,
    rowsGapPx: 14,
  };
  const IPAD_VIEWPORT_PROFILES: MobileViewportProfile[] = [
    { name: 'iPad 9.7 portrait', width: 768, height: 1024 },
    { name: 'iPad 9.7 landscape', width: 1024, height: 768 },
    { name: 'iPad Air 10.9 portrait', width: 820, height: 1180 },
    { name: 'iPad Air 10.9 landscape', width: 1180, height: 820 },
    { name: 'iPad Pro 11 portrait', width: 834, height: 1194 },
    { name: 'iPad Pro 11 landscape', width: 1194, height: 834 },
    { name: 'iPad Pro 12.9 portrait', width: 1024, height: 1366 },
    { name: 'iPad Pro 12.9 landscape', width: 1366, height: 1024 },
    { name: 'iPad Mini 8.3 portrait', width: 744, height: 1133 },
    { name: 'iPad Mini 8.3 landscape', width: 1133, height: 744 },
  ];

  // Keep notebank sizing from Student Notation while allowing cell-placed sixteenths to fill slot height.
  const BANK_SIXTEENTH_HEX_PATH = createSixteenthHexPath(60, 60, 50, 110);
  // Keep placed sixteenths close to slot bounds while avoiding top/bottom stroke clipping.
  const PLACED_SIXTEENTH_HEX_PATH = createSixteenthHexPath(12.5, 50, 21, 96);
  const PLACED_SIXTEENTH_HEX_VIEWBOX = '0 0 25 100';
  const SIXTEENTH_SLOTS: SixteenthSlot[] = [0, 1];
  const COUNT_IN_NUMBERS = [4, 3, 2, 1] as const;
  const ACCENTED_COUNT_IN_INDEX = COUNT_IN_NUMBERS.length - 1;
  const DEFAULT_METRONOME_VOLUME = 0.72;
  const DEFAULT_VOICE_COUNT: VoiceCountMode = 1;
  const DEFAULT_VOICE_LAYOUT_MODE: VoiceLayoutMode = 'intertwined';
  const DEFAULT_TRACK_STYLE: TrackStyle = 'horizontal';
  const VOICE_INDEXES = [0, 1, 2, 3] as const;
  const HORIZONTAL_PLAYBACK_SCROLL_AHEAD_RATIO = 0.34;
  const HORIZONTAL_KARAOKE_BALL_NOTE_GAP_PX = 4;
  const HORIZONTAL_LOOP_RENDER_CYCLES = 3;
  const HORIZONTAL_LOOP_ANCHOR_CYCLE = 1;
  const HORIZONTAL_LOOP_RECENTER_CYCLE = 2;
  const TRACK_ZOOM_MIN = 0.65;
  const TRACK_ZOOM_MAX = 1.8;
  const TRACK_ZOOM_WHEEL_SENSITIVITY = 0.0016;
  const TEMPO_SHORTCUT_VALUES = [60, 65, 70, 75, 80, 85] as const;
  const AUDIO_SCHEDULE_START_DELAY_MS = 0;
  const PLAYBACK_CELL_CLASS_NAMES = [
    'playback-illuminated',
    'playback-pulse-a',
    'playback-pulse-b',
    'playback-span-start',
    'playback-span-continuation',
  ] as const;
  const PLAYED_NOTE_MUTED_CLASS = 'played-note-muted';

  const voiceOptions: OscillatorType[] = ['sine', 'square', 'triangle', 'sawtooth'];

  let state: BoomwhackerSketchpadState = model.getState();

  let audioReady = false;
  let audioStartPromise: Promise<AudioReadinessResult> | null = null;

  let isPlaying = false;
  let isLooping = false;
  let playbackIndex = 0;
  let playbackPaused = false;
  let playbackStartToken = 0;
  let playbackStartSelection: PlaybackStartSelection | null = null;
  let selectedNoteKeys = new Set<string>();
  let boxSelectionState: BoxSelectionState | null = null;
  let selectionClipboard: SelectionClipboard | null = null;
  let playbackFrame: number | null = null;
  let playbackVisualLoopToken = 0;
  let playbackVisualStartedAtMs = 0;
  let playbackVisualStartIndex = 0;
  let playbackVisualLastRenderedIndex = -1;
  let pendingPlaybackTimeouts = new Set<ReturnType<typeof setTimeout>>();
  let voicePlaybackCursorCellKeys: Array<string | null> = VOICE_INDEXES.map(() => null);
  let voiceKaraokeBallRowIndexes: Array<number | null> = VOICE_INDEXES.map(() => null);
  let voiceKaraokeBallLeftPercents: number[] = VOICE_INDEXES.map(() => 50);
  let voiceKaraokeBallPinnedLeftPxs: Array<number | null> = VOICE_INDEXES.map(() => null);
  let voiceKaraokeBallArcOffsetPxs: number[] = VOICE_INDEXES.map(() => 0);
  let karaokeArcHeightPx = 64;
  let karaokeBallSizePx = 40;
  let playbackHighwayHeightPercent = PLAYBACK_HIGHWAY_HEIGHT_PERCENT_DEFAULT;
  let countInEnabled = true;
  let macrobeatMetronomeEnabled = false;
  let countInDisplayNumber: number | null = null;
  let metronomeVolume = DEFAULT_METRONOME_VOLUME;
  let voiceKaraokeAnchors: Array<KaraokeAnchor | null> = VOICE_INDEXES.map(() => null);
  let voiceKaraokeAnimationFrames: Array<number | null> = VOICE_INDEXES.map(() => null);
  let voiceKaraokeAnimationTokens: number[] = VOICE_INDEXES.map(() => 0);
  let horizontalPlaybackHighway: HorizontalPlaybackHighwayState = {
    activationIndex: null,
    pinnedVoiceIndex: null,
    referenceViewportLeftPx: null,
  };
  let horizontalPlaybackScrollFrame: number | null = null;
  let horizontalPlaybackScrollToken = 0;
  let horizontalPlaybackScrollAnimation: HorizontalPlaybackScrollAnimationState | null = null;
  let horizontalPlaybackVirtualScrollLeft: number | null = null;
  let horizontalPlaybackRunwayPx = 0;
  let trackZoom = 1;
  let trackPlaybackShellHeightPx = 0;
  let voiceHorizontalPlaybackLaneShiftPxs: number[] = VOICE_INDEXES.map(() => 0);
  let voiceHorizontalPlaybackLaneShiftFrames: Array<number | null> = VOICE_INDEXES.map(() => null);
  let voiceHorizontalPlaybackLaneShiftTokens: number[] = VOICE_INDEXES.map(() => 0);
  let rowsGridElement: HTMLElement | null = null;
  let voiceTrackRowElements: Array<Array<HTMLElement | null>> = VOICE_INDEXES.map(() => []);
  let voicePlaybackHighlightAnchors: Array<KaraokeAnchor | null> = VOICE_INDEXES.map(() => null);
  let voicePlaybackHighlightCellKeys: Array<Set<string>> = VOICE_INDEXES.map(() => new Set<string>());
  let voicePlaybackPulseFlips: boolean[] = VOICE_INDEXES.map(() => false);
  let voicePlayedCellKeys: Array<Set<string>> = VOICE_INDEXES.map(() => new Set<string>());
  let playbackKaraokeAnchorCache: Array<Map<number, KaraokeAnchor | null>> = VOICE_INDEXES.map(() => new Map());
  let playbackGeometryCache: PlaybackGeometryCache | null = null;
  let karaokeBallElements: Array<HTMLElement | null> = VOICE_INDEXES.map(() => null);

  let dragPayload: DragPayload | null = null;
  let dragOverCell: GridDropTarget | null = null;
  let tapPlacementPayload: DragPayload | null = null;
  let activePreviewPayload: DragPayload | null = null;
  let cursorPreview: { note: PlacedNote; x: number; y: number } | null = null;
  let cursorOverCanvas = false;
  let lastPointerPosition: { x: number; y: number } | null = null;
  let pendingBankTouchActivation: PendingBankTouchActivation | null = null;
  let suppressNextBankClick = false;
  let pickupPreviewLogKey: string | null = null;
  let mobileLayoutLogKey: string | null = null;
  let adaptiveLayoutLogKey: string | null = null;
  let keyboardHighlightedNoteId: string | null = null;
  let viewportFitMode = false;
  let adaptiveLayout: AdaptiveLayoutConfig = ADAPTIVE_LAYOUT_DEFAULT;
  let colorPaletteMode: ColorPaletteMode = 'chromanotes';
  let percussionSampleSelections: PercussionSampleSelections = { ...DEFAULT_PERCUSSION_SAMPLE_SELECTIONS };
  let activeSamplePickerNoteId: PercussionNoteId = 'clap';
  let showAccidentals = false;
  let showEighthsBank = true;
  let showSixteenthsBank = false;
  let settingsOpen = false;
  let settingsDialog: HTMLDialogElement | undefined;
  let shareModalOpen = false;
  let shareUrl = '';
  let shareCode = '';
  let shareCopied = false;
  let shareCodeCopied = false;
  let shareFailed = false;
  let shareDecodeError: string | null = null;
  let loadCodeValue = '';
  let libraryModalOpen = false;
  let libraryBusy = false;
  let libraryError: string | null = null;
  let libraryStatus: string | null = null;
  let libraryFileName = '';
  let libraryEntries: Array<SketchpadLibraryEntry<LibrarySketchDocument>> = [];
  let librarySelectedEntryId: string | null = null;
  let libraryPendingAction: { type: 'open' | 'delete'; entryId: string } | null = null;
  let currentLibraryEntryId: string | null = null;
  let currentLibraryName: string | null = null;

  let studentViewModalOpen = false;
  let studentViewSettings: StudentViewSettings = {};
  let shareStudentViewUrl = '';
  let shareStudentViewCode = '';
  let shareStudentViewCopied = false;
  let shareStudentViewCodeCopied = false;
  let isStudentView = false;
  let activeStudentView: StudentViewSettings = {};
  let volumePopupOpen = false;
  let volumeControlWrapper: HTMLDivElement | null = null;
  let audioSamplesPopupOpen = false;
  let audioSamplesControlWrapper: HTMLDivElement | null = null;
  let audioSamplesPopupStyle = '';
  let canvasPanelElement: HTMLElement | null = null;
  let canvasScrollShellElement: HTMLDivElement | null = null;
  let canvasScrollRevision = 0;
  let eraserMode = false;
  let canvasHistory: CanvasHistorySnapshot[] = [];
  let canvasHistoryPointer = -1;
  let suppressCanvasHistoryTracking = false;
  let bankNativeDragEnabled = true;
  let canvasPanelRepositionAnimation: Animation | null = null;
  let canvasPanelRepositionToken = 0;

  let pickupBeats = 0;
  let voiceCount: VoiceCountMode = DEFAULT_VOICE_COUNT;
  let voiceLayoutMode: VoiceLayoutMode = DEFAULT_VOICE_LAYOUT_MODE;
  let trackStyle: TrackStyle = DEFAULT_TRACK_STYLE;
  let activeCanvasVoiceIndex: VoiceIndex = 0;
  let mutedVoiceStates: boolean[] = VOICE_INDEXES.map(() => false);
  let soloedVoiceStates: boolean[] = VOICE_INDEXES.map(() => false);
  let voicePickupRows: GridRow[] = VOICE_INDEXES.map((voiceIndex) => createEmptyRow(`pickup_${voiceKey(voiceIndex)}`));
  let voiceRows: GridRow[][] = VOICE_INDEXES.map((voiceIndex) =>
    Array.from({ length: INITIAL_ROWS }, () => createEmptyRow(`row_${voiceKey(voiceIndex)}`)),
  );
  let renderedTrackRows: RenderedTrackRow[] = [];
  let canvasPersistenceReady = false;

  let unsubscribeModel: (() => void) | null = null;

  audio.setMetronomeVolume(metronomeVolume);

  let bankLatticeRowsCircle: BankLatticeRows = buildBankLatticeRows(true, BANK_LATTICE_COMPRESSED_NO_ACCIDENTAL_ADVANCE_CIRCLE);
  let bankLatticeRowsOval: BankLatticeRows = buildBankLatticeRows(true, BANK_LATTICE_COMPRESSED_NO_ACCIDENTAL_ADVANCE_OVAL);
  let bankLatticeRowsDiamond: BankLatticeRows = buildBankLatticeRows(true, BANK_LATTICE_COMPRESSED_NO_ACCIDENTAL_ADVANCE_TIGHT);
  let showToolbarEighthBank = true;
  let showLowerSixteenthBank = false;

  $: {
    colorPaletteMode;
    bankLatticeRowsCircle = buildBankLatticeRows(true, BANK_LATTICE_COMPRESSED_NO_ACCIDENTAL_ADVANCE_CIRCLE);
    bankLatticeRowsOval = buildBankLatticeRows(true, BANK_LATTICE_COMPRESSED_NO_ACCIDENTAL_ADVANCE_OVAL);
    bankLatticeRowsDiamond = buildBankLatticeRows(true, BANK_LATTICE_COMPRESSED_NO_ACCIDENTAL_ADVANCE_TIGHT);
  }

  $: activePreviewPayload = isPlaying ? null : dragPayload ?? tapPlacementPayload;
  $: showToolbarEighthBank = (!isStudentView || !activeStudentView.hideEighthBank) && showEighthsBank;
  $: showLowerSixteenthBank = (!isStudentView || !activeStudentView.hideSixteenthBank) && showSixteenthsBank;
  $: {
    trackStyle;
    isPlaying;
    canvasScrollRevision;
    horizontalPlaybackHighway.referenceViewportLeftPx;
    const scrollShellWidth = canvasScrollShellElement?.clientWidth ?? 0;
    const scrollShellHeight = canvasScrollShellElement?.clientHeight ?? 0;
    horizontalPlaybackRunwayPx =
      trackStyle === 'horizontal' && horizontalPlaybackHighway.referenceViewportLeftPx !== null
        ? Math.max(0, scrollShellWidth - horizontalPlaybackHighway.referenceViewportLeftPx)
        : 0;
    trackPlaybackShellHeightPx = trackStyle === 'horizontal' && isPlaying ? Math.max(0, scrollShellHeight) : 0;
  }
  $: {
    voiceRows;
    voicePickupRows;
    voiceCount;
    voiceLayoutMode;
    trackStyle;
    isPlaying;
    isLooping;
    playbackStartSelection;
    renderedTrackRows = buildRenderedTrackRows();
  }
  $: {
    renderedTrackRows;
    applyHorizontalPlaybackLaneShiftStyles();
  }
  $: {
    voiceRows;
    pickupBeats;
    if (playbackStartSelection) {
      const refreshedStartIndex = playbackStartIndexForMeasure(playbackStartSelection.zone, playbackStartSelection.rowIndex);
      if (refreshedStartIndex === null) {
        playbackStartSelection = null;
        if (!isPlaying && !playbackPaused) playbackIndex = 0;
      } else if (refreshedStartIndex !== playbackStartSelection.startIndex) {
        playbackStartSelection = {
          ...playbackStartSelection,
          startIndex: refreshedStartIndex,
        };
        if (!isPlaying && !playbackPaused) playbackIndex = refreshedStartIndex;
      }
    }
  }

  $: if (canvasPersistenceReady) {
    voiceRows;
    voicePickupRows;
    pickupBeats;
    voiceCount;
    voiceLayoutMode;
    trackStyle;
    percussionSampleSelections;
    state.microbeatTempo;
    persistCanvasState();
    trackCanvasHistorySnapshot();
  }

  $: if (canvasPersistenceReady && MOBILE_LAYOUT_DEBUG && typeof window !== 'undefined') {
    pickupBeats;
    sharedRowCount();
    voiceCount;
    voiceLayoutMode;
    trackStyle;
    showAccidentals;
    viewportFitMode;
    updateAdaptiveLayout();
    settingsOpen;
    shareModalOpen;
    queueMobileLayoutSnapshot('UI state changed.');
  }

  $: if (canvasPersistenceReady && TEMPO_SLIDER_LAYOUT_DEBUG && typeof window !== 'undefined') {
    viewportFitMode;
    adaptiveLayout;
    settingsOpen;
    shareModalOpen;
    isStudentView;
    activeStudentView.hideTempoSlider;
    activeStudentView.hideQuarterTempo;
    queueTempoSliderLayoutSnapshot('UI state changed.');
  }

  $: if (
    (isStudentView && activeStudentView.hideVolumeSlider)
    || shareModalOpen
    || studentViewModalOpen
    || settingsOpen
    || libraryModalOpen
  ) {
    volumePopupOpen = false;
    audioSamplesPopupOpen = false;
  }

  onMount(() => {
    void (async () => {
      const loadedFromShare = await tryLoadShareFragment();
      if (!loadedFromShare) {
        loadPersistedCanvasState();
      }
      canvasPersistenceReady = true;
    })();

    unsubscribeModel = model.subscribe((nextState) => {
      const previousState = state;
      state = nextState;
      syncAudioWithState(nextState, previousState);
    });

    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('keyup', handleGlobalKeyUp);
    window.addEventListener('pointerdown', handleDocumentPointerDownForPopups);
    window.addEventListener('pointermove', handleWindowPointerMoveForBankActivation);
    window.addEventListener('pointerup', handleWindowPointerUpForBankActivation);
    window.addEventListener('pointercancel', handleWindowPointerCancelForBankActivation);
    window.addEventListener('pointermove', handleWindowPointerMoveForBoxSelection);
    window.addEventListener('pointerup', handleWindowPointerUpForBoxSelection);
    window.addEventListener('pointercancel', handleWindowPointerCancelForBoxSelection);
    window.addEventListener('mousedown', handleWindowMouseDownForBoxSelection);
    window.addEventListener('mousemove', handleWindowMouseMoveForCursorPreview);
    window.addEventListener('mousemove', handleWindowMouseMoveForBoxSelection);
    window.addEventListener('mouseup', handleWindowMouseUpForBoxSelection);
    const handleViewportDiagnostics = () => {
      updateViewportFitMode();
      updateTapPlacementHintVisibility();
      updateAdaptiveLayout();
      updateAudioSamplesPopupPlacement();
      queueTempoSliderLayoutSnapshot('Viewport changed.');
      queueMobileLayoutSnapshot('Viewport changed.');
    };
    const handleVisualViewportDiagnostics = () => {
      updateViewportFitMode();
      updateTapPlacementHintVisibility();
      updateAdaptiveLayout();
      updateAudioSamplesPopupPlacement();
      queueTempoSliderLayoutSnapshot('Visual viewport changed.');
      queueMobileLayoutSnapshot('Visual viewport changed.');
    };
    updateViewportFitMode();
    updateTapPlacementHintVisibility();
    updateAdaptiveLayout();
    window.addEventListener('resize', handleViewportDiagnostics);
    window.addEventListener('orientationchange', handleViewportDiagnostics);
    window.visualViewport?.addEventListener('resize', handleVisualViewportDiagnostics);
    const tempoLayoutResizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver((entries) => {
            if (!TEMPO_SLIDER_LAYOUT_DEBUG) return;
            const targets = entries
              .map((entry) => {
                const element = entry.target as HTMLElement;
                return element.className || element.tagName;
              })
              .join(', ');
            queueTempoSliderLayoutSnapshot(`Observed tempo layout resize (${targets}).`);
          })
        : null;
    const topToolbar = document.querySelector<HTMLElement>('.top-toolbar');
    const controlsPanel = document.querySelector<HTMLElement>('.controls-panel');
    const toolbarNotebankPanel = document.querySelector<HTMLElement>('.toolbar-notebank-panel');

    if (topToolbar) {
      tempoLayoutResizeObserver?.observe(topToolbar);
    }
    if (controlsPanel) {
      tempoLayoutResizeObserver?.observe(controlsPanel);
    }
    if (toolbarNotebankPanel) {
      tempoLayoutResizeObserver?.observe(toolbarNotebankPanel);
    }
    queueTempoSliderLayoutSnapshot('Mounted.');
    queueMobileLayoutSnapshot('Mounted.');
    return () => {
      stopPlayback();
      canvasPanelRepositionToken += 1;
      canvasPanelRepositionAnimation?.cancel();
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('keyup', handleGlobalKeyUp);
      window.removeEventListener('pointerdown', handleDocumentPointerDownForPopups);
      window.removeEventListener('pointermove', handleWindowPointerMoveForBankActivation);
      window.removeEventListener('pointerup', handleWindowPointerUpForBankActivation);
      window.removeEventListener('pointercancel', handleWindowPointerCancelForBankActivation);
      window.removeEventListener('pointermove', handleWindowPointerMoveForBoxSelection);
      window.removeEventListener('pointerup', handleWindowPointerUpForBoxSelection);
      window.removeEventListener('pointercancel', handleWindowPointerCancelForBoxSelection);
      window.removeEventListener('mousedown', handleWindowMouseDownForBoxSelection);
      window.removeEventListener('mousemove', handleWindowMouseMoveForCursorPreview);
      window.removeEventListener('mousemove', handleWindowMouseMoveForBoxSelection);
      window.removeEventListener('mouseup', handleWindowMouseUpForBoxSelection);
      window.removeEventListener('resize', handleViewportDiagnostics);
      window.removeEventListener('orientationchange', handleViewportDiagnostics);
      window.visualViewport?.removeEventListener('resize', handleVisualViewportDiagnostics);
      tempoLayoutResizeObserver?.disconnect();
      unsubscribeModel?.();
      audio.dispose();
    };
  });

  function createId(prefix: string): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return `${prefix}_${crypto.randomUUID()}`;
    }

    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function createEmptyRow(prefix = 'row'): GridRow {
    return {
      id: createId(prefix),
      cells: Array.from({ length: GRID_COLUMNS }, () => null),
    };
  }

  function voiceLabel(voiceIndex: VoiceIndex): 'A' | 'B' | 'C' | 'D' {
    return ['A', 'B', 'C', 'D'][voiceIndex] as 'A' | 'B' | 'C' | 'D';
  }

  function voiceKey(voiceIndex: VoiceIndex): 'a' | 'b' | 'c' | 'd' {
    return ['a', 'b', 'c', 'd'][voiceIndex] as 'a' | 'b' | 'c' | 'd';
  }

  function createEmptyVoiceRows(voiceIndex: VoiceIndex, rowCount = INITIAL_ROWS): GridRow[] {
    return Array.from({ length: rowCount }, () => createEmptyRow(`row_${voiceKey(voiceIndex)}`));
  }

  function createEmptyVoicePickupRow(voiceIndex: VoiceIndex): GridRow {
    return createEmptyRow(`pickup_${voiceKey(voiceIndex)}`);
  }

  function sharedRowCount(): number {
    return voiceRows[0].length;
  }

  function visibleVoiceIndices(): VoiceIndex[] {
    return VOICE_INDEXES.slice(0, voiceCount);
  }

  function coerceVoiceIndex(value: number): VoiceIndex | null {
    return VOICE_INDEXES.includes(value as VoiceIndex) ? value as VoiceIndex : null;
  }

  function isVoiceVisible(voiceIndex: VoiceIndex): boolean {
    return voiceIndex < voiceCount;
  }

  function isVoiceMuted(voiceIndex: VoiceIndex): boolean {
    return mutedVoiceStates[voiceIndex] === true;
  }

  function isVoiceSoloed(voiceIndex: VoiceIndex): boolean {
    return soloedVoiceStates[voiceIndex] === true;
  }

  function isVoiceAudible(voiceIndex: VoiceIndex): boolean {
    if (!isVoiceVisible(voiceIndex)) return false;
    if (mutedVoiceStates[voiceIndex]) return false;
    return !soloedVoiceStates.some(Boolean) || soloedVoiceStates[voiceIndex] === true;
  }

  function toggleVoiceMute(event: MouseEvent, voiceIndex: VoiceIndex): void {
    event.stopPropagation();
    mutedVoiceStates = mutedVoiceStates.map((muted, index) => index === voiceIndex ? !muted : muted);
  }

  function toggleVoiceSolo(event: MouseEvent, voiceIndex: VoiceIndex): void {
    event.stopPropagation();
    soloedVoiceStates = soloedVoiceStates.map((soloed, index) => index === voiceIndex ? !soloed : soloed);
  }

  function rowsForVoice(voiceIndex: VoiceIndex): GridRow[] {
    return voiceRows[voiceIndex];
  }

  function pickupRowForVoice(voiceIndex: VoiceIndex): GridRow {
    return voicePickupRows[voiceIndex];
  }

  function setActiveCanvasVoice(voiceIndex: VoiceIndex): void {
    activeCanvasVoiceIndex = voiceIndex;
  }

  function coerceVoiceCount(value: unknown): VoiceCountMode {
    return value === 4 ? 4 : value === 3 ? 3 : value === 2 ? 2 : 1;
  }

  function ensureVoiceRowCount(rows: GridRow[], voiceIndex: VoiceIndex, rowCount: number): GridRow[] {
    if (rows.length === rowCount) return rows;

    const nextRows = rows.slice(0, rowCount);
    while (nextRows.length < rowCount) {
      nextRows.push(createEmptyRow(`row_${voiceKey(voiceIndex)}`));
    }

    return nextRows;
  }

  function normalizeVoiceRows(
    nextVoiceRows: GridRow[][],
    preferredRowCount: number | null = null,
  ): GridRow[][] {
    const rowCount = Math.max(preferredRowCount ?? 0, ...VOICE_INDEXES.map((voiceIndex) => nextVoiceRows[voiceIndex]?.length ?? 0), 1);
    return VOICE_INDEXES.map((voiceIndex) =>
      ensureVoiceRowCount(nextVoiceRows[voiceIndex] ?? [], voiceIndex, rowCount),
    );
  }

  function isHorizontalLoopPlaybackActive(): boolean {
    return isPlaying && shouldUseHorizontalLoopIndexing();
  }

  function shouldUseHorizontalLoopIndexing(): boolean {
    return trackStyle === 'horizontal' && isLooping && totalPlaybackCells() > 0;
  }

  function horizontalLoopSegmentStartIndex(): number {
    return playbackResetIndex();
  }

  function horizontalLoopSegmentSourceStartRow(): number {
    const startIndex = horizontalLoopSegmentStartIndex();
    const pickupCells = pickupMicrobeatCount();
    if (startIndex <= pickupCells) return 0;
    return Math.max(0, Math.min(sharedRowCount() - 1, Math.floor((startIndex - pickupCells) / GRID_COLUMNS)));
  }

  function horizontalLoopSegmentIncludesPickup(): boolean {
    return pickupMicrobeatCount() > 0 && horizontalLoopSegmentStartIndex() < pickupMicrobeatCount();
  }

  function horizontalLoopSegmentRowCount(): number {
    return Math.max(1, sharedRowCount() - horizontalLoopSegmentSourceStartRow());
  }

  function pushRenderedTrackRow(
    rows: RenderedTrackRow[],
    voiceIndex: VoiceIndex,
    sourceRowIndex: number,
    rowIndex: number,
    loopCycle = 0,
    includesPickup = sourceRowIndex === 0 && pickupBeats > 0,
  ): void {
    rows.push({
      voiceIndex,
      rowIndex,
      sourceRowIndex,
      loopCycle,
      includesPickup,
      key: `voice-${voiceKey(voiceIndex)}-${loopCycle}-${rowIndex}-${voiceRows[voiceIndex][sourceRowIndex]?.id ?? sourceRowIndex}`,
      row: voiceRows[voiceIndex][sourceRowIndex],
      pickupRow: voicePickupRows[voiceIndex],
    });
  }

  function buildHorizontalLoopRenderedTrackRows(): RenderedTrackRow[] {
    const rows: RenderedTrackRow[] = [];
    const sourceStartRow = horizontalLoopSegmentSourceStartRow();
    const segmentRowCount = horizontalLoopSegmentRowCount();
    const includesPickup = horizontalLoopSegmentIncludesPickup();

    for (let loopCycle = 0; loopCycle < HORIZONTAL_LOOP_RENDER_CYCLES; loopCycle += 1) {
      for (let sourceOffset = 0; sourceOffset < segmentRowCount; sourceOffset += 1) {
        const sourceRowIndex = sourceStartRow + sourceOffset;
        const visualRowIndex = loopCycle * segmentRowCount + sourceOffset;
        const rowIncludesPickup = includesPickup && sourceOffset === 0;

        for (const voiceIndex of visibleVoiceIndices()) {
          pushRenderedTrackRow(rows, voiceIndex, sourceRowIndex, visualRowIndex, loopCycle, rowIncludesPickup);
        }
      }
    }

    return rows;
  }

  function buildRenderedTrackRows(): RenderedTrackRow[] {
    const rowCount = sharedRowCount();
    const rows: RenderedTrackRow[] = [];

    if (isHorizontalLoopPlaybackActive()) {
      return buildHorizontalLoopRenderedTrackRows();
    }

    if (voiceCount === 1) {
      for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
        pushRenderedTrackRow(rows, 0, rowIndex, rowIndex);
      }
      return rows;
    }

    if (voiceLayoutMode === 'intertwined') {
      for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
        for (const voiceIndex of visibleVoiceIndices()) {
          pushRenderedTrackRow(rows, voiceIndex, rowIndex, rowIndex);
        }
      }
      return rows;
    }

    for (const voiceIndex of visibleVoiceIndices()) {
      for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
        pushRenderedTrackRow(rows, voiceIndex, rowIndex, rowIndex);
      }
    }

    return rows;
  }

  function pickupMicrobeatCount(): number {
    return pickupBeats * MICROBEATS_PER_BEAT;
  }

  function macrobeatSegmentTrackCount(cellCount: number): number {
    if (cellCount <= 0) return 0;
    return cellCount + Math.floor((cellCount - 1) / MICROBEATS_PER_BEAT);
  }

  function macrobeatGridTemplate(segmentCellCounts: number[]): string {
    const tracks: string[] = [];

    for (const cellCount of segmentCellCounts) {
      for (let cellIndex = 0; cellIndex < cellCount; cellIndex += 1) {
        tracks.push('minmax(0, 1fr)');
        if ((cellIndex + 1) % MICROBEATS_PER_BEAT === 0 && cellIndex < cellCount - 1) {
          tracks.push('var(--macrobeat-gap)');
        }
      }
    }

    return tracks.join(' ');
  }

  function trackGridInlineStyle(includeInlinePickup: boolean): string {
    const segmentCellCounts = includeInlinePickup ? [pickupMicrobeatCount(), GRID_COLUMNS] : [GRID_COLUMNS];
    return `grid-template-columns:${macrobeatGridTemplate(segmentCellCounts)};`;
  }

  function macrobeatCellInlineStyle(zone: GridZone, cellIndex: number, includeInlinePickup: boolean): string {
    const segmentOffset = zone === 'pickup' || !includeInlinePickup ? 0 : macrobeatSegmentTrackCount(pickupMicrobeatCount());
    const gridColumn = segmentOffset + cellIndex + 1 + Math.floor(cellIndex / MICROBEATS_PER_BEAT);
    return `grid-column:${gridColumn};`;
  }

  function enforcePickupCellBoundaries(cells: Array<GridCellContent | null>, beats: number): void {
    const activeCells = beats * MICROBEATS_PER_BEAT;
    for (let index = activeCells; index < GRID_COLUMNS; index += 1) {
      cells[index] = null;
    }

    if (activeCells > 0) {
      const edgeCell = cells[activeCells - 1];
      if (edgeCell && edgeCell.shape === 'circle' && edgeCell.role === 'start') {
        cells[activeCells - 1] = null;
      }
    }
  }

  function setPickupBeats(nextBeats: number): void {
    const clamped = Math.max(0, Math.min(PICKUP_MAX_BEATS, Math.round(nextBeats)));
    if (clamped === pickupBeats) return;

    pickupBeats = clamped;

    updateGridData((_rowsByVoice, pickupCellsByVoice) => {
      for (const voiceIndex of VOICE_INDEXES) {
        enforcePickupCellBoundaries(pickupCellsByVoice[voiceIndex], clamped);
      }
    });

    if (isPlaying) {
      stopPlayback();
    }
  }

  function colorFromColorId(colorId: string): string {
    const palette = colorPaletteMode === 'chromanotes' ? CHROMANOTES_PALETTE : (COLOR_PALETTE as Record<string, string>);
    return palette[colorId] ?? SUPPLEMENTAL_NOTE_COLORS[colorId as keyof typeof SUPPLEMENTAL_NOTE_COLORS] ?? '#d9d9d9';
  }

  function isPercussionNoteId(noteId: string): noteId is PercussionNoteId {
    return (PERCUSSION_NOTE_IDS as readonly string[]).includes(noteId);
  }

  function normalizePercussionSampleSelections(value: unknown): PercussionSampleSelections {
    const source = value && typeof value === 'object'
      ? value as Record<string, unknown>
      : {};

    const selections: PercussionSampleSelections = { ...DEFAULT_PERCUSSION_SAMPLE_SELECTIONS };
    for (const noteId of PERCUSSION_NOTE_IDS) {
      const sampleId = source[noteId];
      if (typeof sampleId === 'string' && LOCAL_DRUM_SAMPLE_BY_ID.has(sampleId)) {
        selections[noteId] = sampleId;
      }
    }

    return selections;
  }

  function serializePercussionSampleSelections(): Partial<PercussionSampleSelections> | undefined {
    const changedEntries = PERCUSSION_NOTE_IDS.flatMap((noteId) =>
      percussionSampleSelections[noteId] !== DEFAULT_PERCUSSION_SAMPLE_SELECTIONS[noteId]
        ? [[noteId, percussionSampleSelections[noteId]] as const]
        : [],
    );

    return changedEntries.length > 0 ? Object.fromEntries(changedEntries) as Partial<PercussionSampleSelections> : undefined;
  }

  function selectedPercussionSample(noteId: PercussionNoteId): LocalDrumSampleEntry | null {
    return LOCAL_DRUM_SAMPLE_BY_ID.get(percussionSampleSelections[noteId]) ?? null;
  }

  function selectedPercussionSampleLabel(noteId: PercussionNoteId): string {
    const sample = selectedPercussionSample(noteId);
    return sample ? `${sample.machineLabel} / ${sample.label}` : 'Default';
  }

  function noteSampleId(noteId: string): string | undefined {
    if (isPercussionNoteId(noteId)) {
      return percussionSampleSelections[noteId];
    }

    return noteDefinitionFromId(noteId)?.sampleId;
  }

  function noteDefinitionFromId(noteId: string): ExtendedNoteDefinition | null {
    const supplementalNote = SUPPLEMENTAL_NOTE_DEFINITIONS.find((note) => note.id === noteId || note.aliasId === noteId);
    if (supplementalNote) {
      return isPercussionNoteId(supplementalNote.id)
        ? { ...supplementalNote, sampleId: percussionSampleSelections[supplementalNote.id] }
        : supplementalNote;
    }

    return findNoteDefinitionById(noteId);
  }

  function noteIconClass(noteId: string): string | null {
    const iconId = noteDefinitionFromId(noteId)?.iconId;
    if (iconId === 'clap') return 'glyph-icon--clap';
    if (iconId === 'stomp') return 'glyph-icon--stomp';
    if (iconId === 'djembe') return 'glyph-icon--djembe';
    if (iconId === 'stick-clicks') return 'glyph-icon--stick-clicks';
    if (iconId === 'tambourine') return 'glyph-icon--tambourine';
    return null;
  }

  function displayLabelFromText(label: string): string {
    if (label === HIGH_SCALE_DEGREE_ONE_LEGACY_LABEL) return '1';
    if (label === LOW_SCALE_DEGREE_ONE_LEGACY_LABEL) return '1';
    return label === '^1' ? '1' : label;
  }

  function rawLabelFromNoteId(noteId: string): string {
    if (noteId === 'oct') return '^1';
    if (noteId.startsWith('s')) return `♯${noteId.slice(1)}`;
    if (noteId.startsWith('b')) return `♭${noteId.slice(1)}`;
    return noteId;
  }

  function displayLabelFromId(noteId: string): string {
    const note = noteDefinitionFromId(noteId);
    if (note?.sampleId) return displayLabelFromText(note.label);
    return displayLabelFromText(rawLabelFromNoteId(noteId));
  }

  function scaleDegreeOneMarkerClass(noteId: string): string {
    if (noteId === HIGH_SCALE_DEGREE_ONE_NOTE_ID) return 'scale-degree-one-high';
    if (noteId === LOW_SCALE_DEGREE_ONE_NOTE_ID) return 'scale-degree-one-low';
    return '';
  }

  function noteColor(noteId: string): string {
    const note = noteDefinitionFromId(noteId);
    if (!note) return '#d9d9d9';
    return colorFromColorId(note.colorId);
  }

  function recolorCellNotes(cell: GridCellContent | null): void {
    if (!cell) return;

    if (cell.shape === 'oval') {
      cell.notes[0].color = noteColor(cell.notes[0].noteId);
      return;
    }

    if (cell.shape === 'circle') {
      if (cell.role === 'start') {
        cell.notes[0].color = noteColor(cell.notes[0].noteId);
      }
      return;
    }

    for (const note of cell.notes) {
      if (!note) continue;
      note.color = noteColor(note.noteId);
    }
  }

  function applyPaletteToPlacedNotes(): void {
    updateGridData((rowsByVoice, pickupCellsByVoice) => {
      for (const voiceIndex of VOICE_INDEXES) {
        for (const row of rowsByVoice[voiceIndex]) {
          for (const cell of row.cells) {
            recolorCellNotes(cell);
          }
        }

        for (const cell of pickupCellsByVoice[voiceIndex]) {
          recolorCellNotes(cell);
        }
      }
    });
  }

  function createBankLatticeToken(noteId: string, column: number): BankLatticeToken {
    return {
      noteId,
      label: displayLabelFromId(noteId),
      color: noteColor(noteId),
      column,
    };
  }

  function groupHasAccidentalSlot(group: (typeof NOTE_BANK_DISPLAY_GROUPS)[number]): boolean {
    return Boolean(group.sharp || group.flat);
  }

  function calculateBankLatticeColumnCount(compressMissingAccidentalColumns: boolean, compressedNoAccidentalAdvance: number): number {
    let naturalColumn = 0;
    let highestNaturalColumn = 0;

    for (const group of NOTE_BANK_DISPLAY_GROUPS) {
      highestNaturalColumn = Math.max(highestNaturalColumn, naturalColumn);
      const hasAccidentalSlot = groupHasAccidentalSlot(group);
      naturalColumn += hasAccidentalSlot || !compressMissingAccidentalColumns ? BANK_LATTICE_TOKEN_SPAN : compressedNoAccidentalAdvance;
    }

    return highestNaturalColumn + BANK_LATTICE_TOKEN_SPAN;
  }

  function bankTokenInlineStyle(token: BankLatticeToken): string {
    return `--token-color:${token.color}; grid-column:${token.column + 1} / span ${BANK_LATTICE_TOKEN_SPAN}; grid-row:1;`;
  }

  function buildBankLatticeRows(compressMissingAccidentalColumns: boolean, compressedNoAccidentalAdvance: number): BankLatticeRows {
    const top: BankLatticeToken[] = [];
    const middle: BankLatticeToken[] = [];
    const bottom: BankLatticeToken[] = [];

    let naturalColumn = 0;

    for (const group of NOTE_BANK_DISPLAY_GROUPS) {
      middle.push(createBankLatticeToken(group.natural, naturalColumn));

      const hasAccidentalSlot = groupHasAccidentalSlot(group);
      if (hasAccidentalSlot) {
        const accidentalColumn = naturalColumn + BANK_LATTICE_ACCIDENTAL_OFFSET;
        if (group.sharp) {
          top.push(createBankLatticeToken(group.sharp, accidentalColumn));
        }
        if (group.flat) {
          bottom.push(createBankLatticeToken(group.flat, accidentalColumn));
        }
      }

      naturalColumn += hasAccidentalSlot || !compressMissingAccidentalColumns ? BANK_LATTICE_TOKEN_SPAN : compressedNoAccidentalAdvance;
    }

    return { top, middle, bottom };
  }

  function notesEquivalent(a: string | null, b: string | null): boolean {
    if (!a || !b) return false;

    const noteA = noteDefinitionFromId(a);
    const noteB = noteDefinitionFromId(b);

    if (!noteA || !noteB) {
      return a === b;
    }

    return noteA.id === noteB.id || noteA.aliasId === noteB.id || noteB.aliasId === noteA.id;
  }

  function tokenIsHighlighted(noteId: string): boolean {
    return notesEquivalent(keyboardHighlightedNoteId, noteId);
  }

  function formatPitchWithAccidentals(pitch: string): string {
    return pitch.replace(/#/g, '♯').replace(/([A-G])b/g, '$1♭');
  }

  function notePitchTooltip(noteId: string): string {
    const note = noteDefinitionFromId(noteId);
    if (note?.sampleId) {
      return note.label;
    }

    const interval = note?.interval ?? 0;
    const pitch = getPitchNameForDisplay(model.getFullRootNote(), interval);
    return pitch ? formatPitchWithAccidentals(pitch) : 'n/a';
  }

  function noteBankTokenTitle(noteId: string): string {
    const note = noteDefinitionFromId(noteId);
    if (!note) return displayLabelFromId(noteId);
    if (note.sampleId) return note.label;

    const pitch = getPitchNameForDisplay(model.getFullRootNote(), note.interval);
    return pitch ? `${displayLabelFromId(noteId)} (${formatPitchWithAccidentals(pitch)})` : displayLabelFromId(noteId);
  }

  function createPlacedNote(noteId: string, shape: NoteShape): PlacedNote | null {
    const note = noteDefinitionFromId(noteId);
    if (!note) return null;

    return {
      noteId,
      label: displayLabelFromId(noteId),
      interval: note.interval,
      color: colorFromColorId(note.colorId),
      shape,
    };
  }

  function clonePlacedNote(note: PlacedNote): PlacedNote {
    return {
      noteId: note.noteId,
      label: note.label,
      interval: note.interval,
      color: note.color,
      shape: note.shape,
    };
  }

  function cloneCellContent(cell: GridCellContent | null): GridCellContent | null {
    if (!cell) return null;

    if (cell.shape === 'oval') {
      return {
        shape: 'oval',
        notes: [clonePlacedNote(cell.notes[0])],
      };
    }

    if (cell.shape === 'circle') {
      if (cell.role === 'start') {
        return {
          shape: 'circle',
          role: 'start',
          notes: [clonePlacedNote(cell.notes[0])],
        };
      }

      // Legacy continuation cells are normalized away in-memory.
      return null;
    }

    return {
      shape: 'diamond',
      notes: [cell.notes[0] ? clonePlacedNote(cell.notes[0]) : null, cell.notes[1] ? clonePlacedNote(cell.notes[1]) : null],
    };
  }

  function noteShapeLabel(shape: NoteShape): string {
    if (shape === 'circle') return 'quarter';
    if (shape === 'oval') return 'eighth';
    return 'sixteenth';
  }

  function serializeCellForPersistence(cell: GridCellContent | null): PersistedCanvasCell | null {
    if (!cell) return null;

    if (cell.shape === 'oval') {
      return cell.notes[0] ? { shape: 'oval', noteId: cell.notes[0].noteId } : null;
    }

    if (cell.shape === 'circle') {
      if (cell.role === 'start') {
        return cell.notes[0] ? { shape: 'circle', role: 'start', noteId: cell.notes[0].noteId } : null;
      }

      // Continuation cells are legacy-only and no longer persisted.
      return null;
    }

    const leftNoteId = cell.notes[0]?.noteId ?? null;
    const rightNoteId = cell.notes[1]?.noteId ?? null;
    if (!leftNoteId && !rightNoteId) return null;

    return {
      shape: 'diamond',
      noteIds: [leftNoteId, rightNoteId],
    };
  }

  function deserializePersistedCell(rawCell: unknown): GridCellContent | null {
    if (!rawCell || typeof rawCell !== 'object') return null;

    const cell = rawCell as Record<string, unknown>;
    const shape = cell.shape;
    if (shape === 'oval') {
      const noteId = cell.noteId;
      if (typeof noteId !== 'string') return null;
      const note = createPlacedNote(noteId, 'oval');
      return note ? { shape: 'oval', notes: [note] } : null;
    }

    if (shape === 'circle') {
      const role = cell.role;
      if (role === 'start') {
        const noteId = cell.noteId;
        if (typeof noteId !== 'string') return null;
        const note = createPlacedNote(noteId, 'circle');
        return note ? { shape: 'circle', role: 'start', notes: [note] } : null;
      }

      if (role === 'continuation') {
        // Legacy continuation cells are ignored; start cells render across both microbeats.
        return null;
      }

      return null;
    }

    if (shape === 'diamond') {
      const rawNoteIds = cell.noteIds;
      if (!Array.isArray(rawNoteIds)) return null;

      const leftId = typeof rawNoteIds[0] === 'string' ? rawNoteIds[0] : null;
      const rightId = typeof rawNoteIds[1] === 'string' ? rawNoteIds[1] : null;
      const left = leftId ? createPlacedNote(leftId, 'diamond') : null;
      const right = rightId ? createPlacedNote(rightId, 'diamond') : null;

      if (!left && !right) return null;
      return { shape: 'diamond', notes: [left, right] };
    }

    return null;
  }

  function serializeVoiceCanvas(rows: GridRow[], pickupRowData: GridRow): PersistedVoiceCanvas {
    return {
      rows: rows.map((row) => row.cells.map((cell) => serializeCellForPersistence(cell))),
      pickupCells: pickupRowData.cells.map((cell) => serializeCellForPersistence(cell)),
    };
  }

  function deserializeRowsInput(rawRows: unknown, voiceIndex: VoiceIndex): GridRow[] {
    const rowsInput = Array.isArray(rawRows) ? rawRows : [];
    const restoredRows = rowsInput
      .map((rawRow) => {
        if (!Array.isArray(rawRow)) return null;
        return {
          id: createId(`row_${voiceKey(voiceIndex)}`),
          cells: Array.from({ length: GRID_COLUMNS }, (_, index) => deserializePersistedCell(rawRow[index] ?? null)),
        };
      })
      .filter((row): row is GridRow => row !== null);

    return restoredRows;
  }

  function deserializePickupRowInput(rawPickupCells: unknown, voiceIndex: VoiceIndex, beats: number): GridRow {
    const pickupCellsInput = Array.isArray(rawPickupCells) ? rawPickupCells : [];
    const restoredPickupCells = Array.from({ length: GRID_COLUMNS }, (_, index) =>
      deserializePersistedCell(pickupCellsInput[index] ?? null),
    );
    enforcePickupCellBoundaries(restoredPickupCells, beats);

    return {
      id: createId(`pickup_${voiceKey(voiceIndex)}`),
      cells: restoredPickupCells,
    };
  }

  function emptyVoiceCanvas(rowCount: number, _voiceIndex: VoiceIndex): PersistedVoiceCanvas {
    return {
      rows: Array.from({ length: rowCount }, () => Array.from({ length: GRID_COLUMNS }, () => null)),
      pickupCells: Array.from({ length: GRID_COLUMNS }, () => null),
    };
  }

  function applyVoiceCanvasState(
    nextVoiceRows: GridRow[][],
    nextVoicePickupRows: GridRow[],
    nextVoiceCount: VoiceCountMode = voiceCount,
    nextVoiceLayoutMode: VoiceLayoutMode = voiceLayoutMode,
  ): void {
    voiceRows = normalizeVoiceRows(nextVoiceRows);
    voicePickupRows = VOICE_INDEXES.map((voiceIndex) => nextVoicePickupRows[voiceIndex] ?? createEmptyVoicePickupRow(voiceIndex));
    voiceCount = nextVoiceCount;
    voiceLayoutMode = nextVoiceLayoutMode;
    if (!isVoiceVisible(activeCanvasVoiceIndex)) {
      activeCanvasVoiceIndex = 0;
    }
  }

  function captureCanvasHistorySnapshot(): CanvasHistorySnapshot {
    return {
      pickupBeats,
      voiceCount,
      voiceLayoutMode,
      voices: VOICE_INDEXES.map((voiceIndex) => serializeVoiceCanvas(voiceRows[voiceIndex], voicePickupRows[voiceIndex])),
    };
  }

  function applyCanvasHistorySnapshot(snapshot: CanvasHistorySnapshot): void {
    const restoredVoiceRows = normalizeVoiceRows(VOICE_INDEXES.map((voiceIndex) =>
      deserializeRowsInput(snapshot.voices[voiceIndex]?.rows, voiceIndex),
    ));
    const restoredVoicePickupRows = VOICE_INDEXES.map((voiceIndex) =>
      deserializePickupRowInput(snapshot.voices[voiceIndex]?.pickupCells, voiceIndex, snapshot.pickupBeats),
    );

    suppressCanvasHistoryTracking = true;
    pickupBeats = snapshot.pickupBeats;
    applyVoiceCanvasState(
      restoredVoiceRows,
      restoredVoicePickupRows,
      snapshot.voiceCount,
      snapshot.voiceLayoutMode,
    );
    suppressCanvasHistoryTracking = false;

    activeCanvasVoiceIndex = 0;
    clearTapPlacementSelection();
  }

  function trackCanvasHistorySnapshot(): void {
    if (suppressCanvasHistoryTracking) return;

    const snapshot = captureCanvasHistorySnapshot();
    const snapshotKey = JSON.stringify(snapshot);
    const currentSnapshot = canvasHistoryPointer >= 0 ? canvasHistory[canvasHistoryPointer] : null;
    const currentKey = currentSnapshot ? JSON.stringify(currentSnapshot) : null;
    if (snapshotKey === currentKey) return;

    const truncatedHistory = canvasHistory.slice(0, canvasHistoryPointer + 1);
    truncatedHistory.push(snapshot);

    if (truncatedHistory.length > CANVAS_HISTORY_MAX_SIZE) {
      truncatedHistory.splice(0, truncatedHistory.length - CANVAS_HISTORY_MAX_SIZE);
    }

    canvasHistory = truncatedHistory;
    canvasHistoryPointer = canvasHistory.length - 1;
  }

  function resetCanvasHistoryToCurrent(): void {
    const snapshot = captureCanvasHistorySnapshot();
    canvasHistory = [snapshot];
    canvasHistoryPointer = 0;
  }

  function canCanvasUndo(): boolean {
    return canvasHistoryPointer > 0;
  }

  function canCanvasRedo(): boolean {
    return canvasHistoryPointer >= 0 && canvasHistoryPointer < canvasHistory.length - 1;
  }

  function undoCanvas(): void {
    if (!canCanvasUndo()) return;
    canvasHistoryPointer -= 1;
    applyCanvasHistorySnapshot(canvasHistory[canvasHistoryPointer]);
    if (isPlaying) {
      stopPlayback();
    }
  }

  function redoCanvas(): void {
    if (!canCanvasRedo()) return;
    canvasHistoryPointer += 1;
    applyCanvasHistorySnapshot(canvasHistory[canvasHistoryPointer]);
    if (isPlaying) {
      stopPlayback();
    }
  }

  function persistCanvasState(): void {
    if (typeof window === 'undefined') return;

    const persistedVoices = VOICE_INDEXES.map((voiceIndex) => serializeVoiceCanvas(voiceRows[voiceIndex], voicePickupRows[voiceIndex]));
    const primaryVoice = persistedVoices[0];
    const percussionSamples = serializePercussionSampleSelections();

    const persistedState: PersistedCanvasState = {
      version: 1,
      pickupBeats,
      microbeatTempo: state.microbeatTempo,
      rows: primaryVoice.rows,
      pickupCells: primaryVoice.pickupCells,
      voiceCount,
      voiceLayoutMode,
      trackStyle,
      ...(percussionSamples ? { percussionSamples } : {}),
      voices: persistedVoices,
    };

    try {
      window.localStorage.setItem(CANVAS_PERSISTENCE_KEY, JSON.stringify(persistedState));
    } catch (error) {
      console.warn('Simple Notation canvas persistence save failed.', error);
    }
  }

  function loadPersistedCanvasState(): void {
    if (typeof window === 'undefined') return;

    let parsed: unknown;
    try {
      const rawState = window.localStorage.getItem(CANVAS_PERSISTENCE_KEY);
      if (!rawState) return;
      parsed = JSON.parse(rawState);
    } catch (error) {
      console.warn('Simple Notation canvas persistence load failed.', error);
      return;
    }

    if (!parsed || typeof parsed !== 'object') return;
    const persisted = parsed as Record<string, unknown>;
    if (persisted.version !== CANVAS_PERSISTENCE_VERSION) return;

    const pickupValue = Number(persisted.pickupBeats);
    const nextPickupBeats =
      Number.isFinite(pickupValue) ? Math.max(0, Math.min(PICKUP_MAX_BEATS, Math.round(pickupValue))) : 0;
    const persistedTempoValue = Number(persisted.microbeatTempo);
    const nextMicrobeatTempo = Number.isFinite(persistedTempoValue)
      ? Math.max(MICROBEAT_TEMPO_MIN, Math.min(MICROBEAT_TEMPO_MAX, Math.round(persistedTempoValue)))
      : DEFAULTS.MICROBEAT_TEMPO;

    const rowsInput = Array.isArray(persisted.rows) ? persisted.rows : [];
    const storedVoiceCount = coerceVoiceCount(persisted.voiceCount);
    const storedVoiceLayoutMode = persisted.voiceLayoutMode === 'separate' ? 'separate' : 'intertwined';
    const storedTrackStyle =
      persisted.trackStyle === 'stacked' || persisted.trackStyle === 'horizontal'
        ? persisted.trackStyle
        : DEFAULT_TRACK_STYLE;
    const storedPercussionSamples = normalizePercussionSampleSelections(persisted.percussionSamples);
    const persistedVoices = Array.isArray(persisted.voices) ? persisted.voices : [];
    const primaryVoiceSource = (persistedVoices[0] as PersistedVoiceCanvas | undefined) ?? {
      rows: rowsInput,
      pickupCells: Array.isArray(persisted.pickupCells) ? persisted.pickupCells : [],
    };
    const fallbackRowCount = Math.max(Array.isArray(primaryVoiceSource.rows) ? primaryVoiceSource.rows.length : 0, INITIAL_ROWS);
    const voiceSources = VOICE_INDEXES.map((voiceIndex) =>
      (persistedVoices[voiceIndex] as PersistedVoiceCanvas | undefined) ??
      (voiceIndex === 0 ? primaryVoiceSource : emptyVoiceCanvas(fallbackRowCount, voiceIndex)),
    );
    const restoredVoiceRows = normalizeVoiceRows(VOICE_INDEXES.map((voiceIndex) =>
      deserializeRowsInput(voiceSources[voiceIndex].rows, voiceIndex),
    ));
    const restoredVoicePickupRows = VOICE_INDEXES.map((voiceIndex) =>
      deserializePickupRowInput(voiceSources[voiceIndex].pickupCells, voiceIndex, nextPickupBeats),
    );

    pickupBeats = nextPickupBeats;
    percussionSampleSelections = storedPercussionSamples;
    applyVoiceCanvasState(restoredVoiceRows, restoredVoicePickupRows, storedVoiceCount, storedVoiceLayoutMode);
    trackStyle = storedTrackStyle;
    activeCanvasVoiceIndex = 0;
    model.setMicrobeatTempo(nextMicrobeatTempo);
    resetCanvasHistoryToCurrent();
  }

  function clampUnitInterval(value: unknown, fallback: number): number {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return fallback;
    return Math.max(0, Math.min(1, numericValue));
  }

  function clampPlaybackHighwayHeightPercent(value: unknown, fallback = PLAYBACK_HIGHWAY_HEIGHT_PERCENT_DEFAULT): number {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return fallback;
    return Math.max(
      PLAYBACK_HIGHWAY_HEIGHT_PERCENT_MIN,
      Math.min(PLAYBACK_HIGHWAY_HEIGHT_PERCENT_MAX, Math.round(numericValue)),
    );
  }

  function normalizeLibrarySketchSettings(value: unknown): LibrarySketchSettings {
    const source = value && typeof value === 'object'
      ? value as Record<string, unknown>
      : {};

    const mainPlaybackVoiceCandidate = source.mainPlaybackVoice;
    const mainPlaybackVoice = (
      typeof mainPlaybackVoiceCandidate === 'string'
      && voiceOptions.includes(mainPlaybackVoiceCandidate as OscillatorType)
    )
      ? mainPlaybackVoiceCandidate as OscillatorType
      : state.mainPlaybackVoice;

    const colorPaletteModeCandidate = source.colorPaletteMode;
    const colorPalette = colorPaletteModeCandidate === 'oklch' ? 'oklch' : 'chromanotes';

    return {
      countInEnabled: typeof source.countInEnabled === 'boolean' ? source.countInEnabled : true,
      macrobeatMetronomeEnabled: typeof source.macrobeatMetronomeEnabled === 'boolean'
        ? source.macrobeatMetronomeEnabled
        : false,
      metronomeVolume: clampUnitInterval(source.metronomeVolume, DEFAULT_METRONOME_VOLUME),
      colorPaletteMode: colorPalette,
      showAccidentals: typeof source.showAccidentals === 'boolean' ? source.showAccidentals : false,
      showEighthsBank: typeof source.showEighthsBank === 'boolean' ? source.showEighthsBank : true,
      showSixteenthsBank: typeof source.showSixteenthsBank === 'boolean' ? source.showSixteenthsBank : false,
      mainPlaybackVoice,
      mainVolume: clampUnitInterval(source.mainVolume, state.mainVolume),
      playbackHighwayHeightPercent: clampPlaybackHighwayHeightPercent(source.playbackHighwayHeightPercent),
    };
  }

  function normalizeLibrarySketchDocument(value: unknown): LibrarySketchDocument | null {
    if (!value || typeof value !== 'object') return null;
    const source = value as Record<string, unknown>;
    if (source.v !== 1) return null;

    const compositionResult = validateShareDocument(source.composition);
    if (!compositionResult.ok) return null;

    return {
      v: 1,
      composition: compositionResult.doc,
      settings: normalizeLibrarySketchSettings(source.settings),
    };
  }

  function buildLibrarySketchDocument(): LibrarySketchDocument {
    return {
      v: 1,
      composition: buildShareDocument(),
      settings: {
        countInEnabled,
        macrobeatMetronomeEnabled,
        metronomeVolume,
        colorPaletteMode,
        showAccidentals,
        showEighthsBank,
        showSixteenthsBank,
        mainPlaybackVoice: state.mainPlaybackVoice,
        mainVolume: state.mainVolume,
        playbackHighwayHeightPercent,
      },
    };
  }

  function loadFromLibrarySketchDocument(document: LibrarySketchDocument): void {
    loadFromShareDocument(document.composition, { preserveLibraryContext: true });

    const settings = normalizeLibrarySketchSettings(document.settings);
    countInEnabled = settings.countInEnabled;
    macrobeatMetronomeEnabled = settings.macrobeatMetronomeEnabled;
    metronomeVolume = settings.metronomeVolume;
    audio.setMetronomeVolume(metronomeVolume);
    colorPaletteMode = settings.colorPaletteMode;
    showAccidentals = settings.showAccidentals;
    showEighthsBank = settings.showEighthsBank;
    showSixteenthsBank = settings.showSixteenthsBank;
    playbackHighwayHeightPercent = clampPlaybackHighwayHeightPercent(settings.playbackHighwayHeightPercent);
    applyPaletteToPlacedNotes();
    model.setMainPlaybackVoice(settings.mainPlaybackVoice);
    model.setMainVolume(settings.mainVolume);
  }

  function buildSuggestedLibraryName(): string {
    if (currentLibraryName?.trim()) {
      return currentLibraryName.trim();
    }

    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    return `Boomwhacker Sketch ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}.${pad(now.getMinutes())}`;
  }

  function sanitizeLibraryDownloadFileName(name: string): string {
    const sanitized = name
      .trim()
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
      .replace(/\s+/g, ' ')
      .replace(/\.+$/g, '');

    return sanitized || 'boomwhacker-sketch';
  }

  function buildLibrarySketchExportDocument(
    entry: SketchpadLibraryEntry<LibrarySketchDocument>,
  ): LibrarySketchExportDocument {
    return {
      v: 1,
      source: 'boomwhacker-sketchpad-library',
      name: entry.name,
      savedAt: entry.savedAt,
      exportedAt: new Date().toISOString(),
      document: entry.document,
    };
  }

  function downloadLibraryEntry(entry: SketchpadLibraryEntry<LibrarySketchDocument>): void {
    if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof Blob === 'undefined') {
      throw new Error('File downloads are unavailable in this environment.');
    }

    const exportDocument = buildLibrarySketchExportDocument(entry);
    const blob = new Blob([`${JSON.stringify(exportDocument, null, 2)}\n`], { type: 'application/json' });
    const downloadUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = downloadUrl;
    downloadLink.download = `${sanitizeLibraryDownloadFileName(entry.name)}.boomwhacker-sketch.json`;
    downloadLink.style.display = 'none';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
  }

  function formatLibrarySavedAt(savedAt: string): string {
    const parsed = new Date(savedAt);
    if (Number.isNaN(parsed.getTime())) {
      return savedAt;
    }

    return parsed.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function selectedLibraryEntry(): SketchpadLibraryEntry<LibrarySketchDocument> | null {
    if (!librarySelectedEntryId) return null;
    return libraryEntries.find((entry) => entry.id === librarySelectedEntryId) ?? null;
  }

  async function refreshLibraryEntries(preferredEntryId: string | null = librarySelectedEntryId): Promise<void> {
    const storedEntries = await listSketchpadLibraryEntries<LibrarySketchDocument>();
    const normalizedEntries = storedEntries.flatMap((entry) => {
      const normalizedDocument = normalizeLibrarySketchDocument(entry.document);
      if (!normalizedDocument) return [];
      return [{
        ...entry,
        document: normalizedDocument,
      }];
    });

    libraryEntries = normalizedEntries;
    if (preferredEntryId && normalizedEntries.some((entry) => entry.id === preferredEntryId)) {
      librarySelectedEntryId = preferredEntryId;
      return;
    }
    librarySelectedEntryId = normalizedEntries[0]?.id ?? null;
  }

  async function openLibraryModal(): Promise<void> {
    shareModalOpen = false;
    studentViewModalOpen = false;
    libraryModalOpen = true;
    libraryPendingAction = null;
    libraryError = null;
    libraryStatus = null;
    libraryFileName = buildSuggestedLibraryName();
    libraryBusy = true;

    try {
      await refreshLibraryEntries(currentLibraryEntryId);
    } catch (error) {
      libraryError = error instanceof Error ? error.message : 'Sketch library could not be loaded.';
    } finally {
      libraryBusy = false;
    }
  }

  function closeLibraryModal(): void {
    libraryModalOpen = false;
    libraryPendingAction = null;
    libraryError = null;
    libraryStatus = null;
  }

  function selectLibraryEntry(entryId: string): void {
    librarySelectedEntryId = entryId;
    libraryPendingAction = null;
    libraryError = null;
    libraryStatus = null;
  }

  async function handleLibrarySaveAs(): Promise<void> {
    const nextName = libraryFileName.trim();
    if (!nextName) {
      libraryError = 'Please enter a file name before saving.';
      libraryStatus = null;
      return;
    }

    libraryBusy = true;
    libraryPendingAction = null;
    libraryError = null;
    libraryStatus = null;

    try {
      const entry = await saveSketchpadLibraryEntry<LibrarySketchDocument>({
        name: nextName,
        document: buildLibrarySketchDocument(),
      });

      currentLibraryEntryId = entry.id;
      currentLibraryName = entry.name;
      libraryFileName = entry.name;
      libraryStatus = `Saved "${entry.name}".`;
      await refreshLibraryEntries(entry.id);
    } catch (error) {
      libraryError = error instanceof Error ? error.message : 'Sketch could not be saved to the library.';
    } finally {
      libraryBusy = false;
    }
  }

  function handleLibraryExport(): void {
    const entry = selectedLibraryEntry();
    if (!entry) return;

    libraryPendingAction = null;
    libraryError = null;
    libraryStatus = null;

    try {
      downloadLibraryEntry(entry);
      libraryStatus = `Exported "${entry.name}".`;
    } catch (error) {
      libraryError = error instanceof Error ? error.message : 'Sketch could not be exported.';
    }
  }

  function requestLibraryAction(type: 'open' | 'delete'): void {
    const entry = selectedLibraryEntry();
    if (!entry) return;

    libraryPendingAction = {
      type,
      entryId: entry.id,
    };
    libraryError = null;
    libraryStatus = null;
  }

  function cancelLibraryAction(): void {
    libraryPendingAction = null;
  }

  async function confirmLibraryAction(): Promise<void> {
    const pendingAction = libraryPendingAction;
    if (!pendingAction) return;

    const entry = libraryEntries.find((candidate) => candidate.id === pendingAction.entryId);
    if (!entry) {
      libraryPendingAction = null;
      return;
    }

    libraryBusy = true;
    libraryError = null;
    libraryStatus = null;

    try {
      if (pendingAction.type === 'open') {
        loadFromLibrarySketchDocument(entry.document);
        currentLibraryEntryId = entry.id;
        currentLibraryName = entry.name;
        libraryFileName = entry.name;
        libraryPendingAction = null;
        libraryModalOpen = false;
        return;
      }

      await deleteSketchpadLibraryEntry(entry.id);
      if (currentLibraryEntryId === entry.id) {
        currentLibraryEntryId = null;
      }
      libraryPendingAction = null;
      libraryStatus = `Deleted "${entry.name}".`;
      await refreshLibraryEntries(librarySelectedEntryId === entry.id ? null : librarySelectedEntryId);
    } catch (error) {
      libraryError = error instanceof Error ? error.message : 'Library action failed.';
    } finally {
      libraryBusy = false;
    }
  }

  // --- Share feature ---

  function buildShareDocument(): ShareDocument {
    const shareVoices = VOICE_INDEXES.map((voiceIndex) => serializeVoiceCanvas(voiceRows[voiceIndex], voicePickupRows[voiceIndex]));
    const primaryVoice = shareVoices[0];
    const percussionSamples = serializePercussionSampleSelections();

    return {
      v: 1,
      tonic: state.rootNoteTonic,
      tempo: state.microbeatTempo,
      timeSig: [4, 4],
      pickupBeats,
      rows: primaryVoice.rows,
      pickupCells: primaryVoice.pickupCells,
      voiceCount,
      voiceLayoutMode,
      trackStyle,
      ...(percussionSamples ? { percussionSamples } : {}),
      voices: shareVoices,
    };
  }

  async function computeChecksum(payload: string): Promise<string | null> {
    if (typeof crypto === 'undefined' || !crypto.subtle) return null;
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
      return Array.from(new Uint8Array(hashBuffer).slice(0, 4))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      return null;
    }
  }

  async function encodeShareDocument(doc: ShareDocument): Promise<{ payload: string; code: string }> {
    const inputBytes = new TextEncoder().encode(JSON.stringify(doc));
    const cs = new CompressionStream('deflate-raw');
    const writer = cs.writable.getWriter();
    void writer.write(inputBytes);
    void writer.close();
    const compressed = await new Response(cs.readable).arrayBuffer();
    const compressedArray = new Uint8Array(compressed);
    let binary = '';
    for (let i = 0; i < compressedArray.length; i++) {
      binary += String.fromCharCode(compressedArray[i]);
    }
    const base64url = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const checksum = await computeChecksum(base64url);
    const code = checksum ? `${base64url}.${checksum}` : base64url;
    const payload = `${SHARE_FRAGMENT_PREFIX}${SHARE_ROUTE_VERSION}/${code}`;
    return { payload, code };
  }

  async function decodeBase64urlPayload(base64url: string): Promise<ShareDecodeResult> {
    let binaryString: string;
    try {
      const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
      binaryString = atob(padded);
    } catch (error) {
      console.warn('Simple Notation share decode (base64) failed.', error);
      return { ok: false, reason: 'decode' };
    }

    let decompressed: ArrayBuffer;
    try {
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const ds = new DecompressionStream('deflate-raw');
      const dsWriter = ds.writable.getWriter();
      void dsWriter.write(bytes);
      void dsWriter.close();
      decompressed = await new Response(ds.readable).arrayBuffer();
    } catch (error) {
      console.warn('Simple Notation share decode (decompress) failed.', error);
      return { ok: false, reason: 'decompress' };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(new TextDecoder().decode(decompressed));
    } catch (error) {
      console.warn('Simple Notation share decode (JSON) failed.', error);
      return { ok: false, reason: 'parse' };
    }

    return validateShareDocument(parsed);
  }

  async function decodeShareFragment(rawFragment: string): Promise<ShareDecodeResult | null> {
    const fragment = rawFragment.startsWith('#') ? rawFragment.slice(1) : rawFragment;
    if (!fragment.startsWith(SHARE_FRAGMENT_PREFIX)) return null;

    const afterPrefix = fragment.slice(SHARE_FRAGMENT_PREFIX.length);

    // New versioned format: share/v1/<code>
    const versionMatch = afterPrefix.match(/^(v\d+)\/(.+)$/);
    if (versionMatch) {
      const routeVersion = versionMatch[1];
      const codeStr = versionMatch[2];

      if (routeVersion !== SHARE_ROUTE_VERSION) {
        console.warn('Simple Notation share link has unrecognized route version:', routeVersion);
        return { ok: false, reason: 'version-unknown' };
      }

      // Split code into payload + optional checksum (last '.', followed by exactly 8 hex chars)
      const dotIndex = codeStr.lastIndexOf('.');
      const hasChecksum = dotIndex !== -1 && codeStr.length - dotIndex === 9;
      const base64url = hasChecksum ? codeStr.slice(0, dotIndex) : codeStr;
      const storedChecksum = hasChecksum ? codeStr.slice(dotIndex + 1) : null;

      if (storedChecksum) {
        const expectedChecksum = await computeChecksum(base64url);
        if (expectedChecksum && storedChecksum !== expectedChecksum) {
          console.warn('Simple Notation share link checksum mismatch.');
          return { ok: false, reason: 'checksum' };
        }
      }

      return decodeBase64urlPayload(base64url);
    }

    // Legacy format: share/<payload> (no version segment, no checksum)
    return decodeBase64urlPayload(afterPrefix);
  }

  function validateShareDocument(parsed: unknown): ShareDecodeResult {
    if (!parsed || typeof parsed !== 'object') return { ok: false, reason: 'schema' };
    const doc = parsed as Record<string, unknown>;
    if (typeof doc.v !== 'number') return { ok: false, reason: 'schema' };
    if (doc.v !== 1) return { ok: false, reason: 'version-mismatch' };
    if (typeof doc.tonic !== 'string') return { ok: false, reason: 'schema' };
    if (typeof doc.tempo !== 'number') return { ok: false, reason: 'schema' };
    if (typeof doc.pickupBeats !== 'number') return { ok: false, reason: 'schema' };
    if (!Array.isArray(doc.rows)) return { ok: false, reason: 'schema' };
    if (!Array.isArray(doc.pickupCells)) return { ok: false, reason: 'schema' };
    if (
      doc.voiceCount !== undefined &&
      doc.voiceCount !== 1 &&
      doc.voiceCount !== 2 &&
      doc.voiceCount !== 3 &&
      doc.voiceCount !== 4
    ) return { ok: false, reason: 'schema' };
    if (doc.voiceLayoutMode !== undefined && doc.voiceLayoutMode !== 'intertwined' && doc.voiceLayoutMode !== 'separate') {
      return { ok: false, reason: 'schema' };
    }
    if (doc.trackStyle !== undefined && doc.trackStyle !== 'stacked' && doc.trackStyle !== 'horizontal') {
      return { ok: false, reason: 'schema' };
    }
    if (doc.percussionSamples !== undefined && (typeof doc.percussionSamples !== 'object' || doc.percussionSamples === null)) {
      return { ok: false, reason: 'schema' };
    }
    if (doc.voices !== undefined && !Array.isArray(doc.voices)) return { ok: false, reason: 'schema' };
    return { ok: true, doc: doc as unknown as ShareDocument };
  }

  function loadFromShareDocument(
    doc: ShareDocument,
    options: { preserveLibraryContext?: boolean } = {},
  ): void {
    if (isPlaying) {
      stopPlayback();
    }
    if (!options.preserveLibraryContext) {
      currentLibraryEntryId = null;
      currentLibraryName = null;
    }

    model.setRootNoteTonic(doc.tonic);
    model.setMicrobeatTempo(doc.tempo);

    const clampedPickupBeats = Math.max(0, Math.min(PICKUP_MAX_BEATS, Math.round(doc.pickupBeats)));
    const nextVoiceCount = coerceVoiceCount(doc.voiceCount);
    const nextVoiceLayoutMode = doc.voiceLayoutMode === 'separate' ? 'separate' : 'intertwined';
    const nextTrackStyle = doc.trackStyle === 'horizontal' ? 'horizontal' : 'stacked';
    const nextPercussionSamples = normalizePercussionSampleSelections(doc.percussionSamples);
    const docVoices = Array.isArray(doc.voices) ? doc.voices : [];
    const primaryVoiceSource = (docVoices[0] as PersistedVoiceCanvas | undefined) ?? {
      rows: doc.rows,
      pickupCells: doc.pickupCells,
    };
    const fallbackRowCount = Math.max(Array.isArray(primaryVoiceSource.rows) ? primaryVoiceSource.rows.length : 0, INITIAL_ROWS);
    const voiceSources = VOICE_INDEXES.map((voiceIndex) =>
      (docVoices[voiceIndex] as PersistedVoiceCanvas | undefined) ??
      (voiceIndex === 0 ? primaryVoiceSource : emptyVoiceCanvas(fallbackRowCount, voiceIndex)),
    );
    const restoredVoiceRows = normalizeVoiceRows(VOICE_INDEXES.map((voiceIndex) =>
      deserializeRowsInput(voiceSources[voiceIndex].rows, voiceIndex),
    ));
    const restoredVoicePickupRows = VOICE_INDEXES.map((voiceIndex) =>
      deserializePickupRowInput(voiceSources[voiceIndex].pickupCells, voiceIndex, clampedPickupBeats),
    );

    pickupBeats = clampedPickupBeats;
    percussionSampleSelections = nextPercussionSamples;
    applyVoiceCanvasState(restoredVoiceRows, restoredVoicePickupRows, nextVoiceCount, nextVoiceLayoutMode);
    trackStyle = nextTrackStyle;
    activeCanvasVoiceIndex = 0;
    resetCanvasHistoryToCurrent();

    if (doc.sv && Object.keys(doc.sv).length > 0) {
      isStudentView = true;
      activeStudentView = doc.sv;
    } else {
      isStudentView = false;
      activeStudentView = {};
    }
  }

  type ShareErrorReason = Exclude<ShareDecodeResult, { ok: true }>['reason'];

  function shareDecodeErrorMessage(reason: ShareErrorReason): string {
    switch (reason) {
      case 'checksum': return 'Link appears altered in transit — ask the sender to share again.';
      case 'decode': return 'Link characters appear corrupted — try copying fresh from the browser.';
      case 'decompress': return 'Link appears truncated — copy the full URL or ask the sender to reshare.';
      case 'parse': return 'Share link is unreadable — it may have been modified.';
      case 'version-unknown': return 'This link needs a newer version of Simple Notation to open.';
      case 'version-mismatch': return 'This share link was created with a newer version of Simple Notation.';
      case 'schema': return 'Share link format is invalid — it may not have come from Simple Notation.';
    }
  }

  async function tryLoadShareFragment(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    const hash = window.location.hash;
    if (!hash || !hash.startsWith('#' + SHARE_FRAGMENT_PREFIX)) return false;

    history.replaceState(null, '', window.location.pathname + window.location.search);

    const result = await decodeShareFragment(hash);
    if (!result) return false;

    if (!result.ok) {
      shareDecodeError = shareDecodeErrorMessage(result.reason);
      console.warn('Simple Notation share load failed:', result.reason);
      return false;
    }

    loadFromShareDocument(result.doc);
    return true;
  }

  async function handleShare(): Promise<void> {
    try {
      shareFailed = false;
      const doc = buildShareDocument();
      const { payload, code } = await encodeShareDocument(doc);
      shareUrl = `${window.location.origin}${window.location.pathname}#${payload}`;
      shareCode = code;
      shareCopied = false;
      shareCodeCopied = false;
      shareModalOpen = true;
    } catch (error) {
      console.error('Simple Notation share encoding failed.', error);
      shareFailed = true;
      shareUrl = '';
      shareCode = '';
      shareModalOpen = true;
    }
  }

  async function copyShareUrl(): Promise<void> {
    try {
      await navigator.clipboard.writeText(shareUrl);
      shareCopied = true;
      setTimeout(() => { shareCopied = false; }, 3000);
    } catch {
      // URL is visible in modal for manual selection
    }
  }

  async function copyShareCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(shareCode);
      shareCodeCopied = true;
      setTimeout(() => { shareCodeCopied = false; }, 3000);
    } catch {
      // Code is visible in modal for manual selection
    }
  }

  async function handleLoadFromCode(): Promise<void> {
    const trimmed = loadCodeValue.trim();
    if (!trimmed) return;
    const syntheticHash = `#${SHARE_FRAGMENT_PREFIX}${SHARE_ROUTE_VERSION}/${trimmed}`;
    const result = await decodeShareFragment(syntheticHash);
    if (!result || !result.ok) {
      shareDecodeError = result ? shareDecodeErrorMessage(result.reason) : 'Code could not be recognized.';
      return;
    }
    loadFromShareDocument(result.doc);
    loadCodeValue = '';
    shareModalOpen = false;
  }

  async function handleShareStudentView(): Promise<void> {
    try {
      const doc: ShareDocument = { ...buildShareDocument(), sv: studentViewSettings };
      const { payload, code } = await encodeShareDocument(doc);
      shareStudentViewUrl = `${window.location.origin}${window.location.pathname}#${payload}`;
      shareStudentViewCode = code;
      shareStudentViewCopied = false;
      shareStudentViewCodeCopied = false;
    } catch (error) {
      console.error('Simple Notation student view share encoding failed.', error);
      shareStudentViewUrl = '';
      shareStudentViewCode = '';
    }
  }

  async function copyStudentViewUrl(): Promise<void> {
    try {
      await navigator.clipboard.writeText(shareStudentViewUrl);
      shareStudentViewCopied = true;
      setTimeout(() => { shareStudentViewCopied = false; }, 3000);
    } catch {
      // URL is visible in modal for manual selection
    }
  }

  async function copyStudentViewCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(shareStudentViewCode);
      shareStudentViewCodeCopied = true;
      setTimeout(() => { shareStudentViewCodeCopied = false; }, 3000);
    } catch {
      // Code is visible in modal for manual selection
    }
  }

  function buildGmailComposeUrl(code: string): string {
    const subject = encodeURIComponent('Simple Notation composition');
    const body = encodeURIComponent(
      `Hello, I'd like to share my Simple Notation composition with you.\n\nTo open it:\n1. Go to https://iambored456.github.io/music-learning-tools/boomwhacker-sketchpad/\n2. Click the Share button\n3. Paste this code into the "Load from code" field:\n\n${code}\n\nEnjoy!`
    );
    return `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`;
  }

  function openGmailShare(): void {
    if (!shareCode) return;
    window.open(buildGmailComposeUrl(shareCode), '_blank', 'noopener,noreferrer');
  }

  function openGmailShareStudentView(): void {
    if (!shareStudentViewCode) return;
    window.open(buildGmailComposeUrl(shareStudentViewCode), '_blank', 'noopener,noreferrer');
  }

  // --- End share feature ---

  function createCellContentForNote(note: PlacedNote, slot: SixteenthSlot = 0): GridCellContent {
    if (note.shape === 'oval') {
      return {
        shape: 'oval',
        notes: [clonePlacedNote(note)],
      };
    }

    if (note.shape === 'circle') {
      return {
        shape: 'circle',
        role: 'start',
        notes: [clonePlacedNote(note)],
      };
    }

    const notes: [PlacedNote | null, PlacedNote | null] = [null, null];
    notes[slot] = clonePlacedNote(note);

    return {
      shape: 'diamond',
      notes,
    };
  }

  function resolvePreferredSixteenthSlot(cell: GridCellContent | null, preferredSlot: SixteenthSlot | null): SixteenthSlot {
    if (preferredSlot !== null) {
      return preferredSlot;
    }

    if (!cell || cell.shape !== 'diamond') {
      return 0;
    }

    if (!cell.notes[0]) return 0;
    if (!cell.notes[1]) return 1;
    return 1;
  }

  function getCellsForZone(
    rows: GridRow[],
    pickupCells: Array<GridCellContent | null>,
    zone: GridZone,
    rowIndex: number,
  ): Array<GridCellContent | null> | null {
    if (zone === 'pickup') {
      return pickupCells;
    }

    return rows[rowIndex]?.cells ?? null;
  }

  function maxCellsForZone(zone: GridZone): number {
    return zone === 'pickup' ? pickupMicrobeatCount() : GRID_COLUMNS;
  }

  function clearCircleAtCell(cells: Array<GridCellContent | null>, cellIndex: number): void {
    const cell = cells[cellIndex];
    if (cell && cell.shape === 'circle') {
      if (cell.role === 'start') {
        cells[cellIndex] = null;
        const continuationCell = cells[cellIndex + 1];
        if (
          continuationCell &&
          continuationCell.shape === 'circle' &&
          continuationCell.role === 'continuation' &&
          continuationCell.startCellIndex === cellIndex
        ) {
          cells[cellIndex + 1] = null;
        }
        return;
      }

      cells[cellIndex] = null;
      const startCellIndex = cell.startCellIndex;
      if (startCellIndex < 0 || startCellIndex >= cells.length) return;

      const startCell = cells[startCellIndex];
      if (startCell && startCell.shape === 'circle' && startCell.role === 'start') {
        cells[startCellIndex] = null;
      }
      return;
    }

    const macrobeatStart = macrobeatStartCellIndex(cellIndex);
    if (macrobeatStart === cellIndex) return;

    const startCell = cells[macrobeatStart];
    if (!startCell || startCell.shape !== 'circle' || startCell.role !== 'start') return;

    cells[macrobeatStart] = null;
    const continuationCell = cells[macrobeatStart + 1];
    if (
      continuationCell &&
      continuationCell.shape === 'circle' &&
      continuationCell.role === 'continuation' &&
      continuationCell.startCellIndex === macrobeatStart
    ) {
      cells[macrobeatStart + 1] = null;
    }
  }

  function clearCirclePairAtStartCell(cells: Array<GridCellContent | null>, startCellIndex: number): void {
    clearCircleAtCell(cells, startCellIndex);
    if (startCellIndex + 1 < cells.length) {
      // Circle notes reserve the paired microbeat even though only the first cell stores data.
      cells[startCellIndex + 1] = null;
    }
  }

  function isCircleSpanContinuationCell(cells: Array<GridCellContent | null>, cellIndex: number): boolean {
    const macrobeatStart = macrobeatStartCellIndex(cellIndex);
    if (macrobeatStart === cellIndex) return false;
    const startCell = cells[macrobeatStart] ?? null;
    return Boolean(startCell && startCell.shape === 'circle' && startCell.role === 'start' && startCell.notes[0]);
  }

  function placeNoteAtLocation(
    rows: GridRow[],
    pickupCells: Array<GridCellContent | null>,
    zone: GridZone,
    rowIndex: number,
    cellIndex: number,
    incoming: PlacedNote,
    preferredSlot: SixteenthSlot | null,
  ): void {
    const cells = getCellsForZone(rows, pickupCells, zone, rowIndex);
    if (!cells) return;

    const maxCells = maxCellsForZone(zone);
    if (cellIndex < 0 || cellIndex >= maxCells) return;

    if (incoming.shape === 'circle') {
      if (!isMacrobeatStartCell(cellIndex)) {
        return;
      }

      if (cellIndex + 1 >= maxCells) {
        return;
      }

      clearCirclePairAtStartCell(cells, cellIndex);

      cells[cellIndex] = {
        shape: 'circle',
        role: 'start',
        notes: [clonePlacedNote(incoming)],
      };
      return;
    }

    clearCircleAtCell(cells, cellIndex);

    const targetCell = cells[cellIndex] ?? null;
    const nextCell = placeNoteIntoCell(targetCell, incoming, preferredSlot);
    cells[cellIndex] = nextCell;
  }

  function placeNoteIntoCell(
    cell: GridCellContent | null,
    incoming: PlacedNote,
    preferredSlot: SixteenthSlot | null = null,
  ): GridCellContent {
    if (incoming.shape === 'oval') {
      return createCellContentForNote(incoming);
    }

    if (incoming.shape === 'circle') {
      return createCellContentForNote(incoming);
    }

    const slot = resolvePreferredSixteenthSlot(cell, preferredSlot);

    if (!cell || cell.shape !== 'diamond') {
      return createCellContentForNote(incoming, slot);
    }

    const nextNotes: [PlacedNote | null, PlacedNote | null] = [
      cell.notes[0] ? clonePlacedNote(cell.notes[0]) : null,
      cell.notes[1] ? clonePlacedNote(cell.notes[1]) : null,
    ];
    nextNotes[slot] = clonePlacedNote(incoming);

    return {
      shape: 'diamond',
      notes: nextNotes,
    };
  }

  function removeNoteFromCell(cell: GridCellContent | null, noteIndex: number | null = null): GridCellContent | null {
    if (!cell) return null;

    if (cell.shape === 'oval') {
      return null;
    }

    if (cell.shape === 'circle') {
      return null;
    }

    if (noteIndex !== 0 && noteIndex !== 1) {
      return null;
    }

    const nextNotes: [PlacedNote | null, PlacedNote | null] = [
      cell.notes[0] ? clonePlacedNote(cell.notes[0]) : null,
      cell.notes[1] ? clonePlacedNote(cell.notes[1]) : null,
    ];
    nextNotes[noteIndex] = null;

    if (!nextNotes[0] && !nextNotes[1]) {
      return null;
    }

    return {
      shape: 'diamond',
      notes: nextNotes,
    };
  }

  function getDraftCell(
    rows: GridRow[],
    pickupCells: Array<GridCellContent | null>,
    zone: GridZone,
    rowIndex: number,
    cellIndex: number,
  ): GridCellContent | null {
    if (zone === 'pickup') {
      return pickupCells[cellIndex] ?? null;
    }
    return rows[rowIndex]?.cells[cellIndex] ?? null;
  }

  function setDraftCell(
    rows: GridRow[],
    pickupCells: Array<GridCellContent | null>,
    zone: GridZone,
    rowIndex: number,
    cellIndex: number,
    nextCell: GridCellContent | null,
  ): void {
    if (zone === 'pickup') {
      pickupCells[cellIndex] = nextCell;
      return;
    }
    rows[rowIndex].cells[cellIndex] = nextCell;
  }

  function cellHasAnyNotes(cell: GridCellContent | null): boolean {
    if (!cell) return false;
    if (cell.shape === 'oval') return Boolean(cell.notes[0]);
    if (cell.shape === 'circle') {
      return cell.role === 'start' ? Boolean(cell.notes[0]) : false;
    }
    return Boolean(cell.notes[0] || cell.notes[1]);
  }

  function resolveSixteenthSlotFromClientX(currentTarget: EventTarget | null, clientX: number): SixteenthSlot {
    if (currentTarget instanceof HTMLElement) {
      const rect = currentTarget.getBoundingClientRect();
      if (rect.width > 0) {
        return clientX >= rect.left + rect.width / 2 ? 1 : 0;
      }
    }

    return 0;
  }

  function resolveSixteenthSlotFromEvent(event: DragEvent): SixteenthSlot {
    return resolveSixteenthSlotFromClientX(event.currentTarget, event.clientX);
  }

  function macrobeatStartCellIndex(cellIndex: number): number {
    return cellIndex - (cellIndex % MICROBEATS_PER_BEAT);
  }

  function isMacrobeatStartCell(cellIndex: number): boolean {
    return cellIndex % MICROBEATS_PER_BEAT === 0;
  }

  function isTouchLikePointerEvent(event: PointerEvent): boolean {
    return event.pointerType === 'touch' || event.pointerType === 'pen';
  }

  function tapPlacementSelectionMatches(noteId: string, shape: NoteShape): boolean {
    return Boolean(tapPlacementPayload && tapPlacementPayload.note.noteId === noteId && tapPlacementPayload.note.shape === shape);
  }

  function noteBankShortcutForCode(code: string): { noteId: string; shape: NoteShape } | null {
    const circleIndex = CIRCLE_NOTE_SHORTCUT_CODES.indexOf(code as (typeof CIRCLE_NOTE_SHORTCUT_CODES)[number]);
    if (circleIndex >= 0) return { noteId: NOTE_BANK_SHORTCUT_NOTE_IDS[circleIndex], shape: 'circle' };

    const ovalIndex = OVAL_NOTE_SHORTCUT_CODES.indexOf(code as (typeof OVAL_NOTE_SHORTCUT_CODES)[number]);
    if (ovalIndex >= 0) return { noteId: NOTE_BANK_SHORTCUT_NOTE_IDS[ovalIndex], shape: 'oval' };

    const diamondIndex = DIAMOND_NOTE_SHORTCUT_CODES.indexOf(code as (typeof DIAMOND_NOTE_SHORTCUT_CODES)[number]);
    if (diamondIndex >= 0) return { noteId: NOTE_BANK_SHORTCUT_NOTE_IDS[diamondIndex], shape: 'diamond' };

    return null;
  }

  function cursorPreviewCoordinates(): { x: number; y: number } {
    if (lastPointerPosition) return lastPointerPosition;
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }

  function updateCursorOverCanvasFromTarget(target: EventTarget | null): void {
    cursorOverCanvas = Boolean(target instanceof Node && canvasPanelElement?.contains(target));
  }

  function updateCursorPreviewForTapPayload(note: PlacedNote | null): void {
    if (!note) {
      cursorPreview = null;
      cursorOverCanvas = false;
      return;
    }

    const { x, y } = cursorPreviewCoordinates();
    cursorPreview = { note, x, y };
    if (typeof document !== 'undefined') {
      updateCursorOverCanvasFromTarget(document.elementFromPoint(x, y));
    }
  }

  function clearPlacementHoverPreview(): void {
    dragOverCell = null;
    pickupPreviewLogKey = null;
  }

  function clearPlacementPreviewState(): void {
    dragPayload = null;
    clearPlacementHoverPreview();
  }

  function clearTapPlacementSelection(): void {
    tapPlacementPayload = null;
    updateCursorPreviewForTapPayload(null);
    clearPlacementPreviewState();
    pendingBankTouchActivation = null;
  }

  function armTapPlacementSelection(noteId: string, shape: NoteShape): boolean {
    if (tapPlacementSelectionMatches(noteId, shape)) {
      clearTapPlacementSelection();
      return false;
    }

    const note = createPlacedNote(noteId, shape);
    if (!note) return false;

    tapPlacementPayload = {
      source: 'bank',
      note,
    };
    updateCursorPreviewForTapPayload(note);
    clearPlacementPreviewState();
    return true;
  }

  function handleBankTokenPointerDown(event: PointerEvent, noteId: string, shape: NoteShape): void {
    if (eraserMode) return;
    if (!isTouchLikePointerEvent(event)) return;
    if (bankNativeDragEnabled) return;

    pendingBankTouchActivation = {
      pointerId: event.pointerId,
      noteId,
      shape,
      startX: event.clientX,
      startY: event.clientY,
    };
  }

  function handleBankTokenMouseDown(event: MouseEvent, noteId: string, shape: NoteShape): void {
    if (eraserMode) return;
    if (!bankNativeDragEnabled) return;
    if (event.button !== 0) return;

    const note = createPlacedNote(noteId, shape);
    if (!note) return;

    cursorPreview = { note, x: event.clientX, y: event.clientY };

    const onMove = (e: MouseEvent) => {
      if (cursorPreview) cursorPreview = { ...cursorPreview, x: e.clientX, y: e.clientY };
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (!dragPayload) cursorPreview = null;
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  function handleBankTokenClick(event: MouseEvent, noteId: string, shape: NoteShape): void {
    if (suppressNextBankClick) {
      suppressNextBankClick = false;
      event.preventDefault();
      return;
    }

    if (eraserMode) {
      void previewBankNote(noteId);
      return;
    }

    const armed = armTapPlacementSelection(noteId, shape);
    if (armed) {
      void previewBankNote(noteId);
    }
  }

  function handleWindowPointerMoveForBankActivation(event: PointerEvent): void {
    if (!pendingBankTouchActivation) return;
    if (event.pointerId !== pendingBankTouchActivation.pointerId) return;

    const deltaX = event.clientX - pendingBankTouchActivation.startX;
    const deltaY = event.clientY - pendingBankTouchActivation.startY;
    if (Math.hypot(deltaX, deltaY) >= BANK_TOUCH_TAP_MAX_MOVEMENT_PX) {
      pendingBankTouchActivation = null;
    }
  }

  function handleWindowPointerUpForBankActivation(event: PointerEvent): void {
    if (!pendingBankTouchActivation) return;
    if (event.pointerId !== pendingBankTouchActivation.pointerId) return;

    const { noteId, shape } = pendingBankTouchActivation;
    pendingBankTouchActivation = null;
    suppressNextBankClick = true;

    const armed = armTapPlacementSelection(noteId, shape);
    if (armed) {
      void previewBankNote(noteId);
    }
  }

  function handleWindowPointerCancelForBankActivation(event: PointerEvent): void {
    if (!pendingBankTouchActivation) return;
    if (event.pointerId !== pendingBankTouchActivation.pointerId) return;
    pendingBankTouchActivation = null;
  }

  function handleCursorGhostDragOver(event: DragEvent): void {
    if (!cursorPreview) return;
    cursorPreview = { ...cursorPreview, x: event.clientX, y: event.clientY };
  }

  function handleWindowMouseMoveForCursorPreview(event: MouseEvent): void {
    lastPointerPosition = { x: event.clientX, y: event.clientY };
    updateCursorOverCanvasFromTarget(event.target);

    if (!cursorPreview || !tapPlacementPayload) return;
    cursorPreview = { ...cursorPreview, x: event.clientX, y: event.clientY };
  }

  function handleCanvasDragEnter(): void {
    cursorOverCanvas = true;
  }

  function handleCanvasDragLeave(event: DragEvent): void {
    const target = event.currentTarget as HTMLElement;
    if (!target.contains(event.relatedTarget as Node | null)) {
      cursorOverCanvas = false;
      clearPlacementHoverPreview();
    }
  }

  function handleCanvasMouseMove(event: MouseEvent): void {
    if (dragPayload) return;

    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('.macrobeat-cell')) return;

    clearPlacementHoverPreview();
  }

  function handleWindowMouseDownForBoxSelection(event: MouseEvent): void {
    if (boxSelectionState) return;
    if (event.button !== 0) return;
    if (dragPayload || tapPlacementPayload || eraserMode || isPlaying) return;

    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!canvasPanelElement?.contains(target)) return;
    if (target.closest('.macrobeat-cell, .placed-note, .voice-control-bar, button, input, textarea, select')) return;

    event.preventDefault();
    boxSelectionState = {
      pointerId: null,
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
      active: false,
      additive: event.shiftKey || event.ctrlKey || event.metaKey,
      initialSelection: Array.from(selectedNoteKeys),
    };
  }

  function handleCanvasMouseLeave(): void {
    if (dragPayload) return;
    if (boxSelectionState) return;

    clearPlacementHoverPreview();
  }

  function invalidateCanvasLayout(): void {
    canvasScrollRevision += 1;
    playbackGeometryCache = null;
    clearPlaybackKaraokeAnchorCache();
  }

  function clearPlaybackKaraokeAnchorCache(): void {
    for (const cache of playbackKaraokeAnchorCache) {
      cache.clear();
    }
  }

  function rectSnapshot(rect: DOMRect): RectSnapshot {
    return {
      x: rect.x,
      y: rect.y,
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    };
  }

  function rectFromSnapshot(snapshot: RectSnapshot, offsetX = 0, offsetY = 0): DOMRect {
    return DOMRect.fromRect({
      x: snapshot.x + offsetX,
      y: snapshot.y + offsetY,
      width: snapshot.width,
      height: snapshot.height,
    });
  }

  function rowGeometryKey(voiceIndex: VoiceIndex, rowIndex: number): string {
    return `${voiceIndex}:${rowIndex}`;
  }

  function cellGeometryKey(voiceIndex: VoiceIndex, zone: GridZone, rowIndex: number, cellIndex: number): string {
    return `${voiceIndex}:${zone}:${rowIndex}:${cellIndex}`;
  }

  function isHorizontalPlaybackTransformScrollActive(): boolean {
    return (
      trackStyle === 'horizontal' &&
      isPlaying &&
      horizontalPlaybackHighway.referenceViewportLeftPx !== null &&
      !!canvasScrollShellElement &&
      !!rowsGridElement
    );
  }

  function effectiveHorizontalPlaybackScrollLeft(): number {
    return isHorizontalPlaybackTransformScrollActive() && horizontalPlaybackVirtualScrollLeft !== null
      ? horizontalPlaybackVirtualScrollLeft
      : canvasScrollShellElement?.scrollLeft ?? 0;
  }

  function cachedRectWithScrollOffset(snapshot: RectSnapshot): DOMRect {
    const scrollDeltaX =
      trackStyle === 'horizontal' && canvasScrollShellElement && playbackGeometryCache
        ? effectiveHorizontalPlaybackScrollLeft() - playbackGeometryCache.scrollLeft
        : 0;
    return rectFromSnapshot(snapshot, -scrollDeltaX, 0);
  }

  function rebuildPlaybackGeometryCache(): void {
    if (typeof document === 'undefined') return;
    if (!canvasPanelElement) return;

    const rowRects = new Map<string, RectSnapshot>();
    const cellRects = new Map<string, RectSnapshot>();
    const cellElements = new Map<string, HTMLElement>();
    const firstCellRects = new Map<string, RectSnapshot>();

    for (const voiceIndex of VOICE_INDEXES) {
      for (const [rowIndex, rowElement] of voiceTrackRowElements[voiceIndex].entries()) {
        if (!rowElement) continue;

        rowRects.set(rowGeometryKey(voiceIndex, rowIndex), rectSnapshot(rowElement.getBoundingClientRect()));

        const cells = rowElement.querySelectorAll<HTMLElement>('.macrobeat-cell');
        for (const cellElement of cells) {
          const zone = cellElement.dataset.trackZone === 'pickup' ? 'pickup' : 'main';
          const parsedRowIndex = Number(cellElement.dataset.rowIndex);
          const parsedCellIndex = Number(cellElement.dataset.cellIndex);
          if (!Number.isInteger(parsedRowIndex) || !Number.isInteger(parsedCellIndex)) continue;

          const snapshot = rectSnapshot(cellElement.getBoundingClientRect());
          const key = cellGeometryKey(voiceIndex, zone, parsedRowIndex, parsedCellIndex);
          cellRects.set(key, snapshot);
          cellElements.set(key, cellElement);
          const firstCellKey = rowGeometryKey(voiceIndex, parsedRowIndex);
          if (!firstCellRects.has(firstCellKey)) {
            firstCellRects.set(firstCellKey, snapshot);
          }
        }
      }
    }

    playbackGeometryCache = {
      scrollLeft: canvasScrollShellElement?.scrollLeft ?? 0,
      panelRect: rectSnapshot(canvasPanelElement.getBoundingClientRect()),
      scrollShellRect: canvasScrollShellElement ? rectSnapshot(canvasScrollShellElement.getBoundingClientRect()) : null,
      rowRects,
      cellRects,
      cellElements,
      firstCellRects,
    };
  }

  function getCachedTrackRowRect(voiceIndex: VoiceIndex, rowIndex: number): DOMRect | null {
    const snapshot = playbackGeometryCache?.rowRects.get(rowGeometryKey(voiceIndex, rowIndex));
    return snapshot ? cachedRectWithScrollOffset(snapshot) : null;
  }

  function getCachedTrackCellRect(
    voiceIndex: VoiceIndex,
    zone: GridZone,
    rowIndex: number,
    cellIndex: number,
  ): DOMRect | null {
    const snapshot = playbackGeometryCache?.cellRects.get(cellGeometryKey(voiceIndex, zone, rowIndex, cellIndex));
    return snapshot ? cachedRectWithScrollOffset(snapshot) : null;
  }

  function handleCanvasScroll(): void {
    if (isHorizontalPlaybackTransformScrollActive()) {
      clearHorizontalPlaybackScrollAnimation();
      horizontalPlaybackVirtualScrollLeft = canvasScrollShellElement?.scrollLeft ?? 0;
      applyHorizontalPlaybackTrackTransform();
      applyKaraokeBallElementStyles();
      return;
    }

    if (trackStyle === 'horizontal' && isPlaying && horizontalPlaybackHighway.referenceViewportLeftPx !== null) {
      return;
    }

    if (trackStyle === 'horizontal' && playbackGeometryCache) {
      applyKaraokeBallElementStyles();
      return;
    }

    invalidateCanvasLayout();
    rebuildPlaybackGeometryCache();
    applyKaraokeBallElementStyles();
  }

  function handleTrackWheel(event: WheelEvent): void {
    if (!event.ctrlKey) return;

    event.preventDefault();
    event.stopPropagation();

    const container = canvasScrollShellElement;
    const containerRect = container?.getBoundingClientRect() ?? null;
    const anchorX = containerRect ? event.clientX - containerRect.left : 0;
    const scrollWidthBefore = container ? Math.max(1, container.scrollWidth) : 1;
    const anchorRatio = container ? (container.scrollLeft + anchorX) / scrollWidthBefore : null;
    const nextZoom = roundTo2(clamp(trackZoom * Math.exp(-event.deltaY * TRACK_ZOOM_WHEEL_SENSITIVITY), TRACK_ZOOM_MIN, TRACK_ZOOM_MAX));

    if (nextZoom === trackZoom) return;

    trackZoom = nextZoom;
    invalidateCanvasLayout();

    if (!container || anchorRatio === null) return;

    void tick().then(() => {
      const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
      container.scrollLeft = clamp(anchorRatio * container.scrollWidth - anchorX, 0, maxScrollLeft);
      invalidateCanvasLayout();
    });
  }

  function notifyCanvasLayoutChange(node: HTMLElement): { destroy(): void } {
    invalidateCanvasLayout();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        invalidateCanvasLayout();
      });
      resizeObserver.observe(node);
    }

    return {
      destroy() {
        resizeObserver?.disconnect();
        invalidateCanvasLayout();
      },
    };
  }

  function removeDraggedSource(
    rowsByVoice: GridRow[][],
    pickupCellsByVoice: Array<Array<GridCellContent | null>>,
    payload: DragPayload,
  ): void {
    if (payload.voiceIndex === undefined || payload.zone === undefined || payload.rowIndex === undefined || payload.cellIndex === undefined) return;

    const sourceZone = payload.zone;
    const sourceRowIndex = payload.rowIndex;
    const sourceCellIndex = payload.cellIndex;
    const sourceRows = rowsByVoice[payload.voiceIndex];
    const sourcePickupCells = pickupCellsByVoice[payload.voiceIndex];
    const sourceCells = getCellsForZone(sourceRows, sourcePickupCells, sourceZone, sourceRowIndex);
    if (!sourceCells) return;

    const sourceCell = sourceCells[sourceCellIndex] ?? null;
    if (!sourceCell) return;

    if (sourceCell.shape === 'oval') {
      setDraftCell(sourceRows, sourcePickupCells, sourceZone, sourceRowIndex, sourceCellIndex, null);
      return;
    }

    if (sourceCell.shape === 'circle') {
      clearCircleAtCell(sourceCells, sourceCellIndex);
      return;
    }

    const sourceNoteIndex = payload.noteIndex ?? 0;
    const nextCell = removeNoteFromCell(sourceCell, sourceNoteIndex);
    setDraftCell(sourceRows, sourcePickupCells, sourceZone, sourceRowIndex, sourceCellIndex, nextCell);
  }

  function placedNoteTitle(note: PlacedNote): string {
    return displayLabelFromText(note.label);
  }

  function updateGridData(
    mutator: (
      rowsByVoice: GridRow[][],
      pickupCellsByVoice: Array<Array<GridCellContent | null>>,
    ) => void,
  ): void {
    const nextVoiceRows = VOICE_INDEXES.map((voiceIndex) =>
      voiceRows[voiceIndex].map((row) => ({
        id: row.id,
        cells: row.cells.map((cell) => cloneCellContent(cell)),
      })),
    );
    const nextVoicePickupCells = VOICE_INDEXES.map((voiceIndex) =>
      voicePickupRows[voiceIndex].cells.map((cell) => cloneCellContent(cell)),
    );

    mutator(nextVoiceRows, nextVoicePickupCells);
    applyVoiceCanvasState(
      normalizeVoiceRows(nextVoiceRows, Math.max(...nextVoiceRows.map((rows) => rows.length), 1)),
      VOICE_INDEXES.map((voiceIndex) => ({
        ...voicePickupRows[voiceIndex],
        cells: nextVoicePickupCells[voiceIndex],
      })),
    );
    pruneSelectedNotes();
  }

  function noteSelectionKey(
    voiceIndex: VoiceIndex,
    zone: GridZone,
    rowIndex: number,
    cellIndex: number,
    noteIndex: number,
  ): string {
    return `${voiceIndex}:${zone}:${rowIndex}:${cellIndex}:${noteIndex}`;
  }

  function noteSelectionRefFromKey(key: string): NoteSelectionRef | null {
    const [voiceValue, zoneValue, rowValue, cellValue, noteValue] = key.split(':');
    const voiceIndex = coerceVoiceIndex(Number(voiceValue));
    const zone = zoneValue === 'pickup' || zoneValue === 'main' ? zoneValue : null;
    const rowIndex = Number(rowValue);
    const cellIndex = Number(cellValue);
    const noteIndex = Number(noteValue);
    if (voiceIndex === null || zone === null) return null;
    if (!Number.isInteger(rowIndex) || !Number.isInteger(cellIndex) || !Number.isInteger(noteIndex)) return null;
    return { voiceIndex, zone, rowIndex, cellIndex, noteIndex };
  }

  function noteAtSelectionRef(ref: NoteSelectionRef): PlacedNote | null {
    const cell =
      ref.zone === 'pickup'
        ? pickupRowForVoice(ref.voiceIndex).cells[ref.cellIndex]
        : rowsForVoice(ref.voiceIndex)[ref.rowIndex]?.cells[ref.cellIndex];
    if (!cell) return null;

    if (cell.shape === 'oval' || cell.shape === 'circle') {
      if (cell.shape === 'circle' && cell.role !== 'start') return null;
      return ref.noteIndex === 0 ? cell.notes[0] : null;
    }

    return cell.notes[ref.noteIndex] ?? null;
  }

  function clearSelectedNotes(): void {
    if (selectedNoteKeys.size === 0) return;
    selectedNoteKeys = new Set<string>();
  }

  function toggleNoteSelection(
    voiceIndex: VoiceIndex,
    zone: GridZone,
    rowIndex: number,
    cellIndex: number,
    noteIndex: number,
  ): void {
    const key = noteSelectionKey(voiceIndex, zone, rowIndex, cellIndex, noteIndex);
    const next = new Set(selectedNoteKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    selectedNoteKeys = next;
  }

  function pruneSelectedNotes(): void {
    if (selectedNoteKeys.size === 0) return;

    const next = new Set<string>();
    for (const key of selectedNoteKeys) {
      const ref = noteSelectionRefFromKey(key);
      if (ref && noteAtSelectionRef(ref)) next.add(key);
    }
    selectedNoteKeys = next;
  }

  function viewportRectsIntersect(a: DOMRect, b: DOMRect): boolean {
    return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
  }

  function boxSelectionViewportRect(): DOMRect | null {
    if (!boxSelectionState) return null;

    const left = Math.min(boxSelectionState.startX, boxSelectionState.currentX);
    const top = Math.min(boxSelectionState.startY, boxSelectionState.currentY);
    const width = Math.abs(boxSelectionState.currentX - boxSelectionState.startX);
    const height = Math.abs(boxSelectionState.currentY - boxSelectionState.startY);
    return new DOMRect(left, top, width, height);
  }

  function boxSelectionOverlayStyle(): string | null {
    const selectionRect = boxSelectionViewportRect();
    const panelRect = canvasPanelElement?.getBoundingClientRect() ?? null;
    if (!selectionRect || !panelRect || !boxSelectionState?.active) return null;

    return [
      `left:${selectionRect.left - panelRect.left}px`,
      `top:${selectionRect.top - panelRect.top}px`,
      `width:${selectionRect.width}px`,
      `height:${selectionRect.height}px`,
    ].join(';');
  }

  function updateSelectedNotesFromBox(): void {
    const selectionRect = boxSelectionViewportRect();
    if (!selectionRect || typeof document === 'undefined') return;

    const next = new Set<string>(boxSelectionState?.additive ? boxSelectionState.initialSelection : []);
    const noteElements = document.querySelectorAll<HTMLElement>('.placed-note[data-selection-key]');
    for (const noteElement of noteElements) {
      const key = noteElement.dataset.selectionKey;
      if (!key) continue;
      if (viewportRectsIntersect(selectionRect, noteElement.getBoundingClientRect())) {
        next.add(key);
      }
    }
    selectedNoteKeys = next;
  }

  function finishBoxSelection(): void {
    if (!boxSelectionState) return;

    if (boxSelectionState.active) {
      updateSelectedNotesFromBox();
    } else if (!boxSelectionState.additive) {
      clearSelectedNotes();
    }
    boxSelectionState = null;
  }

  function handleWindowPointerMoveForBoxSelection(event: PointerEvent): void {
    if (!boxSelectionState || event.pointerId !== boxSelectionState.pointerId) return;

    const deltaX = event.clientX - boxSelectionState.startX;
    const deltaY = event.clientY - boxSelectionState.startY;
    const active = boxSelectionState.active || Math.hypot(deltaX, deltaY) >= 4;
    boxSelectionState = {
      ...boxSelectionState,
      currentX: event.clientX,
      currentY: event.clientY,
      active,
    };

    if (active) {
      event.preventDefault();
      updateSelectedNotesFromBox();
    }
  }

  function handleWindowPointerUpForBoxSelection(event: PointerEvent): void {
    if (!boxSelectionState || event.pointerId !== boxSelectionState.pointerId) return;
    finishBoxSelection();
  }

  function handleWindowPointerCancelForBoxSelection(event: PointerEvent): void {
    if (!boxSelectionState || event.pointerId !== boxSelectionState.pointerId) return;
    finishBoxSelection();
  }

  function handleWindowMouseMoveForBoxSelection(event: MouseEvent): void {
    if (!boxSelectionState || boxSelectionState.pointerId !== null) return;

    const deltaX = event.clientX - boxSelectionState.startX;
    const deltaY = event.clientY - boxSelectionState.startY;
    const active = boxSelectionState.active || Math.hypot(deltaX, deltaY) >= 4;
    boxSelectionState = {
      ...boxSelectionState,
      currentX: event.clientX,
      currentY: event.clientY,
      active,
    };

    if (active) {
      event.preventDefault();
      updateSelectedNotesFromBox();
    }
  }

  function handleWindowMouseUpForBoxSelection(): void {
    if (!boxSelectionState || boxSelectionState.pointerId !== null) return;
    finishBoxSelection();
  }

  function copySelectedNotesToClipboard(): void {
    const refs = Array.from(selectedNoteKeys)
      .map((key) => noteSelectionRefFromKey(key))
      .filter((ref): ref is NoteSelectionRef => Boolean(ref));
    const selectedNotes = refs
      .map((ref) => {
        const note = noteAtSelectionRef(ref);
        const absoluteIndex = absolutePlaybackCellIndex(ref.zone, ref.rowIndex, ref.cellIndex);
        return note && absoluteIndex !== null ? { ref, note, absoluteIndex } : null;
      })
      .filter((entry): entry is { ref: NoteSelectionRef; note: PlacedNote; absoluteIndex: number } => Boolean(entry));

    if (selectedNotes.length === 0) return;

    const minVoiceIndex = Math.min(...selectedNotes.map((entry) => entry.ref.voiceIndex));
    const minAbsoluteIndex = Math.min(...selectedNotes.map((entry) => entry.absoluteIndex));
    selectionClipboard = {
      notes: selectedNotes.map((entry) => ({
        voiceOffset: entry.ref.voiceIndex - minVoiceIndex,
        cellOffset: entry.absoluteIndex - minAbsoluteIndex,
        noteIndex: entry.ref.noteIndex,
        note: clonePlacedNote(entry.note),
      })),
    };
  }

  function deleteSelectedNotes(): void {
    if (selectedNoteKeys.size === 0) return;

    const refs = Array.from(selectedNoteKeys)
      .map((key) => noteSelectionRefFromKey(key))
      .filter((ref): ref is NoteSelectionRef => Boolean(ref));

    updateGridData((rowsByVoice, pickupCellsByVoice) => {
      for (const ref of refs) {
        const rows = rowsByVoice[ref.voiceIndex];
        const pickupCells = pickupCellsByVoice[ref.voiceIndex];
        const cells = getCellsForZone(rows, pickupCells, ref.zone, ref.rowIndex);
        if (!cells) continue;

        const currentCell = cells[ref.cellIndex] ?? null;
        if (!currentCell) continue;

        if (currentCell.shape === 'circle') {
          clearCircleAtCell(cells, ref.cellIndex);
          continue;
        }

        const nextCell = removeNoteFromCell(currentCell, ref.noteIndex);
        setDraftCell(rows, pickupCells, ref.zone, ref.rowIndex, ref.cellIndex, nextCell);
      }
    });

    clearSelectedNotes();
  }

  function cutSelectedNotesToClipboard(): void {
    copySelectedNotesToClipboard();
    deleteSelectedNotes();
  }

  function pasteSelectionClipboard(): void {
    if (!selectionClipboard || selectionClipboard.notes.length === 0) return;

    const targetStartIndex = playbackStartSelection?.startIndex ?? pickupMicrobeatCount();
    const targetVoiceIndex = activeCanvasVoiceIndex;
    const pastedKeys = new Set<string>();

    updateGridData((rowsByVoice, pickupCellsByVoice) => {
      for (const clipboardNote of selectionClipboard?.notes ?? []) {
        const nextVoiceIndex = coerceVoiceIndex(targetVoiceIndex + clipboardNote.voiceOffset);
        if (nextVoiceIndex === null || !isVoiceVisible(nextVoiceIndex)) continue;

        const targetIndex = targetStartIndex + clipboardNote.cellOffset;
        if (targetIndex < 0 || targetIndex >= totalPlaybackCells()) continue;

        const targetRef = cellRefFromIndex(targetIndex);
        const rows = rowsByVoice[nextVoiceIndex];
        const pickupCells = pickupCellsByVoice[nextVoiceIndex];
        const targetSlot: SixteenthSlot | null =
          clipboardNote.note.shape === 'diamond' && (clipboardNote.noteIndex === 0 || clipboardNote.noteIndex === 1)
            ? clipboardNote.noteIndex as SixteenthSlot
            : null;

        placeNoteAtLocation(
          rows,
          pickupCells,
          targetRef.zone,
          targetRef.rowIndex,
          targetRef.cellIndex,
          clonePlacedNote(clipboardNote.note),
          targetSlot,
        );

        pastedKeys.add(noteSelectionKey(nextVoiceIndex, targetRef.zone, targetRef.rowIndex, targetRef.cellIndex, targetSlot ?? 0));
      }
    });

    selectedNoteKeys = pastedKeys;
    pruneSelectedNotes();
  }

  function syncAudioWithState(nextState: BoomwhackerSketchpadState, previousState: BoomwhackerSketchpadState | null): void {
    if (!audioReady) return;

    audio.setTempo(nextState.microbeatTempo);
    audio.setMainVoiceType(nextState.mainPlaybackVoice);
    audio.setMainVolume(nextState.mainVolume);
    audio.setDroneVoiceType(nextState.droneVoice);
    audio.setDroneVolume(nextState.droneVolume);

    const rootChanged =
      !previousState ||
      previousState.rootNoteTonic !== nextState.rootNoteTonic ||
      previousState.droneOctave !== nextState.droneOctave;

    if (rootChanged) {
      audio.updateRootNoteFrequency();
    }

    if (!previousState || previousState.droneIsOn !== nextState.droneIsOn) {
      audio.toggleMainDrone(nextState.droneIsOn);
    }
  }

  async function ensureAudioReady(): Promise<AudioReadinessResult> {
    audioReady = audio.isReady();

    if (audioReady) {
      return {
        ready: true,
        resumedAudioContext: false,
        stabilizationDelayMs: 0,
        startElapsedMs: 0,
      };
    }

    if (audioStartPromise) {
      return audioStartPromise;
    }

    const startRequestedAt = performance.now();
    audioStartPromise = (async () => {
      try {
        const started = await audio.start();
        audioReady = started && audio.isReady();
        const result: AudioReadinessResult = {
          ready: audioReady,
          resumedAudioContext: audioReady,
          stabilizationDelayMs: audioReady ? AUDIO_RESUME_STABILIZATION_MS : 0,
          startElapsedMs: Math.round(performance.now() - startRequestedAt),
        };

        if (audioReady) {
          syncAudioWithState(state, null);
          audio.setMetronomeVolume(metronomeVolume);
        }

        debugPlaybackStartup('Audio readiness requested.', result);
        return result;
      } catch (error) {
        audioReady = false;
        console.warn('Simple Notation audio initialization failed.', error);
        return {
          ready: false,
          resumedAudioContext: false,
          stabilizationDelayMs: 0,
          startElapsedMs: Math.round(performance.now() - startRequestedAt),
        };
      } finally {
        audioStartPromise = null;
      }
    })();

    return audioStartPromise;
  }

  function handleRootTonicChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    model.setRootNoteTonic(target.value);
  }

  function handleColorPaletteModeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const nextMode = target.value as ColorPaletteMode;

    if (nextMode === colorPaletteMode) return;

    colorPaletteMode = nextMode;
    applyPaletteToPlacedNotes();

    if (dragPayload) {
      dragPayload = {
        ...dragPayload,
        note: {
          ...dragPayload.note,
          color: noteColor(dragPayload.note.noteId),
        },
      };
    }
  }

  function setMainVoice(event: Event): void {
    const target = event.target as HTMLSelectElement;
    model.setMainPlaybackVoice(target.value as OscillatorType);
  }

  function setMainVolume(event: Event): void {
    const target = event.target as HTMLInputElement;
    model.setMainVolume(Number(target.value) / 100);
  }

  function setMetronomeVolume(event: Event): void {
    const target = event.currentTarget;
    if (!(target instanceof HTMLInputElement)) return;

    const nextValue = Math.max(0, Math.min(100, Math.round(Number(target.value))));
    if (!Number.isFinite(nextValue)) return;

    metronomeVolume = nextValue / 100;
    audio.setMetronomeVolume(metronomeVolume);
  }

  function handleVoiceCountModeChange(event: Event): void {
    const target = event.currentTarget;
    if (!(target instanceof HTMLSelectElement)) return;

    const nextVoiceCount = coerceVoiceCount(Number(target.value));
    if (nextVoiceCount === voiceCount) return;

    voiceCount = nextVoiceCount;
    if (!isVoiceVisible(activeCanvasVoiceIndex)) {
      activeCanvasVoiceIndex = 0;
    }
    mutedVoiceStates = mutedVoiceStates.map((muted, index) => isVoiceVisible(index as VoiceIndex) ? muted : false);
    soloedVoiceStates = soloedVoiceStates.map((soloed, index) => isVoiceVisible(index as VoiceIndex) ? soloed : false);
    for (const voiceIndex of VOICE_INDEXES) {
      if (!isVoiceVisible(voiceIndex)) clearKaraokeBallDisplay(voiceIndex);
    }

    if (isPlaying) {
      stopPlayback();
    }
  }

  function handleVoiceLayoutModeChange(event: Event): void {
    const target = event.currentTarget;
    if (!(target instanceof HTMLSelectElement)) return;

    const nextVoiceLayoutMode: VoiceLayoutMode = target.value === 'separate' ? 'separate' : 'intertwined';
    if (nextVoiceLayoutMode === voiceLayoutMode) return;

    voiceLayoutMode = nextVoiceLayoutMode;
    if (isPlaying) {
      stopPlayback();
    }
  }

  function handleTrackStyleChange(event: Event): void {
    const target = event.currentTarget;
    if (!(target instanceof HTMLSelectElement)) return;

    const nextTrackStyle: TrackStyle = target.value === 'horizontal' ? 'horizontal' : 'stacked';
    if (nextTrackStyle === trackStyle) return;

    trackStyle = nextTrackStyle;
    if (trackStyle === 'horizontal' && isPlaying && totalPlaybackCells() > 0) {
      void tick().then(() => {
        const totalCells = totalPlaybackCells();
        const currentIndex = isHorizontalLoopPlaybackActive() ? playbackIndex : positiveModulo(playbackIndex, totalCells);
        queueHorizontalPlaybackScroll(currentIndex, 'auto');
      });
    }
  }

  function toggleEraserMode(): void {
    eraserMode = !eraserMode;
    clearTapPlacementSelection();
  }

  function handleVolumeIconClick(event: Event): void {
    event.stopPropagation();
    volumePopupOpen = !volumePopupOpen;
    if (volumePopupOpen) {
      audioSamplesPopupOpen = false;
    }
  }

  function handleAudioSamplesIconClick(event: Event): void {
    event.stopPropagation();
    audioSamplesPopupOpen = !audioSamplesPopupOpen;
    if (audioSamplesPopupOpen) {
      volumePopupOpen = false;
      void tick().then(updateAudioSamplesPopupPlacement);
    } else {
      audioSamplesPopupStyle = '';
    }
  }

  function updateAudioSamplesPopupPlacement(): void {
    if (!audioSamplesPopupOpen || typeof window === 'undefined' || !audioSamplesControlWrapper) {
      audioSamplesPopupStyle = '';
      return;
    }

    const margin = 12;
    const minPopupHeight = 240;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const controlRect = audioSamplesControlWrapper.getBoundingClientRect();
    const width = Math.min(720, Math.max(280, viewportWidth - margin * 2));
    const left = clamp(controlRect.right - width, margin, Math.max(margin, viewportWidth - width - margin));
    const preferredTop = controlRect.bottom + 6;
    const preferredMaxHeight = Math.min(620, Math.max(minPopupHeight, viewportHeight - margin * 2));
    const hasEnoughSpaceBelow = viewportHeight - preferredTop - margin >= minPopupHeight;
    const fallbackTop = controlRect.top - preferredMaxHeight - 6;
    const top = clamp(
      hasEnoughSpaceBelow ? preferredTop : fallbackTop,
      margin,
      Math.max(margin, viewportHeight - minPopupHeight - margin),
    );
    const maxHeight = Math.min(620, Math.max(minPopupHeight, viewportHeight - top - margin));

    audioSamplesPopupStyle = `left:${left}px;top:${top}px;width:${width}px;max-height:${maxHeight}px;`;
  }

  function handleDocumentPointerDownForPopups(event: PointerEvent): void {
    const target = event.target;
    if (!(target instanceof Node)) return;

    if (volumePopupOpen && !volumeControlWrapper?.contains(target)) {
      volumePopupOpen = false;
    }

    if (audioSamplesPopupOpen && !audioSamplesControlWrapper?.contains(target)) {
      audioSamplesPopupOpen = false;
    }
  }

  function navigateHome(): void {
    window.location.href = hubHref;
  }

  function handleQuarterTempoChange(quarterTempo: number): void {
    model.setMicrobeatTempo(quarterTempo * 2);

    if (isPlaying) {
      restartPlaybackTimer();
    }
  }

  function setQuarterTempoShortcut(quarterTempo: number): void {
    handleQuarterTempoChange(quarterTempo);
  }

  function addRow(): void {
    voiceRows = VOICE_INDEXES.map((voiceIndex) => [
      ...voiceRows[voiceIndex],
      createEmptyRow(`row_${voiceKey(voiceIndex)}`),
    ]);
  }

  function removeRow(): void {
    if (sharedRowCount() <= 1) return;

    voiceRows = VOICE_INDEXES.map((voiceIndex) => voiceRows[voiceIndex].slice(0, -1));

    const totalCells = pickupMicrobeatCount() + sharedRowCount() * GRID_COLUMNS;
    if (playbackIndex >= totalCells) {
      stopPlayback();
    }
  }

  function clearGrid(): void {
    updateGridData((rowsByVoice, pickupCellsByVoice) => {
      for (const voiceIndex of VOICE_INDEXES) {
        for (const row of rowsByVoice[voiceIndex]) {
          row.cells = row.cells.map(() => null);
        }
        for (let index = 0; index < pickupCellsByVoice[voiceIndex].length; index += 1) {
          pickupCellsByVoice[voiceIndex][index] = null;
        }
      }
    });

    stopPlayback();
    model.setMicrobeatTempo(DEFAULTS.MICROBEAT_TEMPO);
  }

  function setPercussionSample(noteId: PercussionNoteId, sampleId: string): void {
    if (!LOCAL_DRUM_SAMPLE_BY_ID.has(sampleId)) return;

    percussionSampleSelections = {
      ...percussionSampleSelections,
      [noteId]: sampleId,
    };

    if (audioReady) {
      void audio.loadSample(sampleId);
    }
  }

  async function previewAudioSample(sampleId: string): Promise<void> {
    const readiness = await ensureAudioReady();
    if (!readiness.ready) return;

    const loaded = await audio.loadSample(sampleId);
    if (loaded) {
      audio.playSampleNow(sampleId);
    }
  }

  async function preloadConfiguredPercussionSamples(): Promise<void> {
    const sampleIds = Array.from(new Set(PERCUSSION_NOTE_IDS.map((noteId) => percussionSampleSelections[noteId])));
    await Promise.all(sampleIds.map((sampleId) => audio.loadSample(sampleId).catch(() => false)));
  }

  async function previewBankNote(noteId: string): Promise<void> {
    const readiness = await ensureAudioReady();
    if (!readiness.ready) return;

    const note = noteDefinitionFromId(noteId);
    if (!note) return;

    if (note.sampleId) {
      const loaded = await audio.loadSample(note.sampleId);
      if (loaded) {
        audio.playSampleNow(note.sampleId);
      }
      return;
    }

    const pitch = getPitchNameForDisplay(model.getFullRootNote(), note.interval);
    if (!pitch) return;

    audio.playNoteNow(pitch);
  }

  function handleBankDragStart(event: DragEvent, noteId: string, shape: NoteShape): void {
    if (eraserMode) {
      event.preventDefault();
      return;
    }
    if (!bankNativeDragEnabled) {
      event.preventDefault();
      return;
    }

    const note = createPlacedNote(noteId, shape);
    if (!note) return;

    tapPlacementPayload = null;
    clearPlacementHoverPreview();
    dragPayload = {
      source: 'bank',
      note,
    };

    event.dataTransfer?.setData('text/plain', `${noteId}:${shape}`);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copyMove';
      const emptyImg = document.createElement('canvas');
      emptyImg.width = 1;
      emptyImg.height = 1;
      event.dataTransfer.setDragImage(emptyImg, 0, 0);
    }
  }

  function handleCellDragStart(
    event: DragEvent,
    voiceIndex: VoiceIndex,
    zone: GridZone,
    rowIndex: number,
    cellIndex: number,
    note: PlacedNote,
    noteIndex: number | null = null,
  ): void {
    if (eraserMode) {
      event.preventDefault();
      return;
    }

    setActiveCanvasVoice(voiceIndex);
    tapPlacementPayload = null;
    clearPlacementHoverPreview();
    dragPayload = {
      source: 'cell',
      note: clonePlacedNote(note),
      voiceIndex,
      zone,
      rowIndex,
      cellIndex,
      noteIndex: noteIndex ?? undefined,
    };
    event.dataTransfer?.setData('text/plain', `${note.noteId}:${note.shape}`);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  function handlePlacedNoteClick(
    event: MouseEvent,
    voiceIndex: VoiceIndex,
    zone: GridZone,
    rowIndex: number,
    cellIndex: number,
    noteIndex: number,
  ): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      toggleNoteSelection(voiceIndex, zone, rowIndex, cellIndex, noteIndex);
      return;
    }

    selectedNoteKeys = new Set([noteSelectionKey(voiceIndex, zone, rowIndex, cellIndex, noteIndex)]);
  }

  function handleAnyDragEnd(): void {
    clearPlacementPreviewState();
    cursorPreview = null;
    cursorOverCanvas = false;
    pendingBankTouchActivation = null;
    debugPickupRender('Drag ended; pickup preview state cleared.');
  }

  function updateCellPreviewTarget(
    activePayload: DragPayload,
    voiceIndex: VoiceIndex,
    zone: GridZone,
    rowIndex: number,
    cellIndex: number,
    currentTarget: EventTarget | null,
    clientX: number,
  ): boolean {
    if (activePayload.note.shape === 'circle') {
      const maxCells = maxCellsForZone(zone);
      const circleStartCellIndex = macrobeatStartCellIndex(cellIndex);
      if (circleStartCellIndex + 1 >= maxCells) {
        if (zone === 'pickup') {
          debugPickupRender('Ignoring pickup circle hover target: pair would overflow.', {
            rowIndex,
            hoverCellIndex: cellIndex,
            circleStartCellIndex,
            maxCells,
          });
        }
        clearPlacementHoverPreview();
        return false;
      }
    }

    dragOverCell = {
      voiceIndex,
      zone,
      rowIndex,
      cellIndex,
      sixteenthSlot: activePayload.note.shape === 'diamond' ? resolveSixteenthSlotFromClientX(currentTarget, clientX) : null,
    };

    if (zone === 'pickup') {
      debugPickupRender('Pickup drag over target updated.', {
        rowIndex,
        hoverCellIndex: cellIndex,
        normalizedCircleStartCellIndex: activePayload.note.shape === 'circle' ? macrobeatStartCellIndex(cellIndex) : null,
        shape: activePayload.note.shape,
      });
    }

    return true;
  }

  function handleCellDragOver(event: DragEvent, voiceIndex: VoiceIndex, zone: GridZone, rowIndex: number, cellIndex: number): void {
    if (!dragPayload) return;

    event.preventDefault();
    if (!updateCellPreviewTarget(dragPayload, voiceIndex, zone, rowIndex, cellIndex, event.currentTarget, event.clientX)) return;

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = dragPayload.source === 'bank' ? 'copy' : 'move';
    }
  }

  function handleCellMouseMove(event: MouseEvent, voiceIndex: VoiceIndex, zone: GridZone, rowIndex: number, cellIndex: number): void {
    if (dragPayload) return;
    if (eraserMode) return;
    if (!bankNativeDragEnabled) return;
    if (!tapPlacementPayload) return;

    updateCellPreviewTarget(tapPlacementPayload, voiceIndex, zone, rowIndex, cellIndex, event.currentTarget, event.clientX);
  }

  function applyPayloadDropToCell(
    activePayload: DragPayload,
    voiceIndex: VoiceIndex,
    zone: GridZone,
    rowIndex: number,
    cellIndex: number,
    targetSixteenthSlot: SixteenthSlot | null,
  ): void {
    const placementCellIndex = activePayload.note.shape === 'circle' ? macrobeatStartCellIndex(cellIndex) : cellIndex;

    const droppingIntoOriginCell =
      activePayload.source === 'cell' &&
      activePayload.voiceIndex === voiceIndex &&
      activePayload.zone === zone &&
      activePayload.rowIndex === rowIndex &&
      activePayload.cellIndex === placementCellIndex;

    if (droppingIntoOriginCell) {
      return;
    }

    if (activePayload.note.shape === 'circle') {
      const maxCells = maxCellsForZone(zone);
      if (placementCellIndex + 1 >= maxCells) {
        return;
      }
    }

    updateGridData((rowsByVoice, pickupCellsByVoice) => {
      const incoming = clonePlacedNote(activePayload.note);
      const targetRows = rowsByVoice[voiceIndex];
      const targetPickupCells = pickupCellsByVoice[voiceIndex];

      if (activePayload.source === 'cell') {
        removeDraggedSource(rowsByVoice, pickupCellsByVoice, activePayload);
      }

      placeNoteAtLocation(targetRows, targetPickupCells, zone, rowIndex, placementCellIndex, incoming, targetSixteenthSlot);
    });

    if (zone === 'pickup') {
      debugPickupRender('Pickup drop applied.', {
        rowIndex,
        hoverCellIndex: cellIndex,
        placementCellIndex,
        shape: activePayload.note.shape,
      });
    }
  }

  function handleCellDrop(event: DragEvent, voiceIndex: VoiceIndex, zone: GridZone, rowIndex: number, cellIndex: number): void {
    event.preventDefault();
    setActiveCanvasVoice(voiceIndex);

    if (!dragPayload) {
      clearPlacementHoverPreview();
      return;
    }

    const activePayload = dragPayload;
    const targetSixteenthSlot: SixteenthSlot | null =
      activePayload.note.shape === 'diamond' ? resolveSixteenthSlotFromEvent(event) : null;
    applyPayloadDropToCell(activePayload, voiceIndex, zone, rowIndex, cellIndex, targetSixteenthSlot);

    clearPlacementPreviewState();
  }

  function handleCellPointerDown(event: PointerEvent, voiceIndex: VoiceIndex, zone: GridZone, rowIndex: number, cellIndex: number): void {
    setActiveCanvasVoice(voiceIndex);

    if (eraserMode) {
      event.preventDefault();
      const targetSixteenthSlot = resolveSixteenthSlotFromClientX(event.currentTarget, event.clientX);
      eraseCellAtLocation(voiceIndex, zone, rowIndex, cellIndex, targetSixteenthSlot);
      return;
    }

    if (!isTouchLikePointerEvent(event)) return;
    if (!tapPlacementPayload) return;

    event.preventDefault();
    const targetSixteenthSlot: SixteenthSlot | null =
      tapPlacementPayload.note.shape === 'diamond'
        ? resolveSixteenthSlotFromClientX(event.currentTarget, event.clientX)
        : null;

    applyPayloadDropToCell(tapPlacementPayload, voiceIndex, zone, rowIndex, cellIndex, targetSixteenthSlot);
    clearPlacementPreviewState();
  }

  function handleCellClick(event: MouseEvent, voiceIndex: VoiceIndex, zone: GridZone, rowIndex: number, cellIndex: number): void {
    setActiveCanvasVoice(voiceIndex);

    if (eraserMode) return;
    if (!tapPlacementPayload) {
      if (!dragPayload && !isPlaying) {
        event.preventDefault();
        selectPlaybackStartMeasure(zone, rowIndex);
      }
      return;
    }
    if (!bankNativeDragEnabled) return;

    event.preventDefault();
    const targetSixteenthSlot: SixteenthSlot | null =
      tapPlacementPayload.note.shape === 'diamond'
        ? resolveSixteenthSlotFromClientX(event.currentTarget, event.clientX)
        : null;

    applyPayloadDropToCell(tapPlacementPayload, voiceIndex, zone, rowIndex, cellIndex, targetSixteenthSlot);
    clearPlacementPreviewState();
  }

  function handleCellKeyDown(event: KeyboardEvent, voiceIndex: VoiceIndex, zone: GridZone, rowIndex: number, cellIndex: number): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    setActiveCanvasVoice(voiceIndex);
    event.preventDefault();

    if (eraserMode) {
      eraseCellAtLocation(voiceIndex, zone, rowIndex, cellIndex, 0);
      return;
    }

    if (!tapPlacementPayload) {
      if (!isPlaying) selectPlaybackStartMeasure(zone, rowIndex);
      return;
    }

    const targetSixteenthSlot: SixteenthSlot | null = tapPlacementPayload.note.shape === 'diamond' ? 0 : null;
    applyPayloadDropToCell(tapPlacementPayload, voiceIndex, zone, rowIndex, cellIndex, targetSixteenthSlot);
    clearPlacementPreviewState();
  }

  function eraseCellAtLocation(
    voiceIndex: VoiceIndex,
    zone: GridZone,
    rowIndex: number,
    cellIndex: number,
    preferredSlot: SixteenthSlot | null,
  ): void {
    updateGridData((rowsByVoice, pickupCellsByVoice) => {
      const rows = rowsByVoice[voiceIndex];
      const pickupCells = pickupCellsByVoice[voiceIndex];
      const cells = getCellsForZone(rows, pickupCells, zone, rowIndex);
      if (!cells) return;

      const currentCell = cells[cellIndex] ?? null;
      if (!currentCell && !isCircleSpanContinuationCell(cells, cellIndex)) return;

      if ((currentCell && currentCell.shape === 'circle') || isCircleSpanContinuationCell(cells, cellIndex)) {
        clearCircleAtCell(cells, cellIndex);
        return;
      }

      if (!currentCell) return;

      if (currentCell.shape === 'diamond') {
        const slotToErase = resolvePreferredSixteenthSlot(currentCell, preferredSlot);
        const nextCell = removeNoteFromCell(currentCell, slotToErase);
        setDraftCell(rows, pickupCells, zone, rowIndex, cellIndex, nextCell);
        return;
      }

      setDraftCell(rows, pickupCells, zone, rowIndex, cellIndex, null);
    });
  }

  function removeCellNote(
    event: MouseEvent,
    voiceIndex: VoiceIndex,
    zone: GridZone,
    rowIndex: number,
    cellIndex: number,
    noteIndex: number | null = null,
  ): void {
    event.preventDefault();
    setActiveCanvasVoice(voiceIndex);

    updateGridData((rowsByVoice, pickupCellsByVoice) => {
      const rows = rowsByVoice[voiceIndex];
      const pickupCells = pickupCellsByVoice[voiceIndex];
      const cells = getCellsForZone(rows, pickupCells, zone, rowIndex);
      if (!cells) return;

      const currentCell = cells[cellIndex] ?? null;
      if ((currentCell && currentCell.shape === 'circle') || isCircleSpanContinuationCell(cells, cellIndex)) {
        clearCircleAtCell(cells, cellIndex);
        return;
      }

      const nextCell = removeNoteFromCell(currentCell, noteIndex);
      setDraftCell(rows, pickupCells, zone, rowIndex, cellIndex, nextCell);
    });
  }

  function handleKaraokeArcHeightInput(event: Event): void {
    const target = event.currentTarget;
    if (!(target instanceof HTMLInputElement)) return;

    const nextValue = Math.round(Number(target.value));
    if (!Number.isFinite(nextValue)) return;

    karaokeArcHeightPx = Math.max(KARAOKE_ARC_HEIGHT_MIN, Math.min(KARAOKE_ARC_HEIGHT_MAX, nextValue));
  }

  function handleKaraokeBallSizeInput(event: Event): void {
    const target = event.currentTarget;
    if (!(target instanceof HTMLInputElement)) return;

    const nextValue = Math.round(Number(target.value));
    if (!Number.isFinite(nextValue)) return;

    karaokeBallSizePx = Math.max(KARAOKE_BALL_SIZE_MIN, Math.min(KARAOKE_BALL_SIZE_MAX, nextValue));
  }

  function handlePlaybackHighwayHeightInput(event: Event): void {
    const target = event.currentTarget;
    if (!(target instanceof HTMLInputElement)) return;

    playbackHighwayHeightPercent = clampPlaybackHighwayHeightPercent(target.value);
  }

  function resetPlaybackHighwayHeight(): void {
    playbackHighwayHeightPercent = PLAYBACK_HIGHWAY_HEIGHT_PERCENT_DEFAULT;
  }

  function clearKaraokeAnimation(voiceIndex: VoiceIndex): void {
    voiceKaraokeAnimationTokens[voiceIndex] += 1;
    if (voiceKaraokeAnimationFrames[voiceIndex] !== null) {
      cancelAnimationFrame(voiceKaraokeAnimationFrames[voiceIndex]!);
      voiceKaraokeAnimationFrames[voiceIndex] = null;
    }

    voiceKaraokeBallArcOffsetPxs.splice(voiceIndex, 1, 0);
    applyKaraokeBallElementStyle(voiceIndex);
  }

  function setKaraokeBallState(
    voiceIndex: VoiceIndex,
    rowIndex: number | null,
    leftPercent = voiceKaraokeBallLeftPercents[voiceIndex] ?? 50,
    arcOffsetPx = 0,
  ): void {
    voiceKaraokeBallRowIndexes.splice(voiceIndex, 1, rowIndex);
    voiceKaraokeBallLeftPercents.splice(voiceIndex, 1, leftPercent);
    voiceKaraokeBallArcOffsetPxs.splice(voiceIndex, 1, arcOffsetPx);
    applyKaraokeBallElementStyle(voiceIndex);
  }

  function karaokeBallOverlayMetricsForState(
    voiceIndex: VoiceIndex,
    rowIndex: number | null,
    leftPercent: number,
    arcOffsetPx: number,
  ): KaraokeBallOverlayMetrics | null {
    if (rowIndex === null || !isVoiceVisible(voiceIndex)) return null;

    const panel = canvasPanelElement;
    const rowElement = getTrackRowElement(voiceIndex, rowIndex);
    if (!panel || !rowElement) return null;

    const panelRect = playbackGeometryCache ? rectFromSnapshot(playbackGeometryCache.panelRect) : panel.getBoundingClientRect();
    const rowRect = getTrackRowRect(voiceIndex, rowIndex);
    if (!rowRect) return null;
    const pinnedLeftPx = trackStyle === 'horizontal' ? voiceKaraokeBallPinnedLeftPxs[voiceIndex] : null;
    const leftPx = pinnedLeftPx ?? (rowRect.left - panelRect.left - panel.clientLeft + (leftPercent / 100) * rowRect.width);
    const horizontalPlaybackActive = trackStyle === 'horizontal' && isPlaying;
    const laneRect = horizontalPlaybackActive ? karaokePlaybackLaneRect(voiceIndex, rowIndex) ?? rowRect : rowRect;
    const topPx =
      laneRect.top -
      panelRect.top -
      panel.clientTop -
      (horizontalPlaybackActive ? HORIZONTAL_KARAOKE_BALL_NOTE_GAP_PX : 0);
    const anchorY = '-100%';

    return {
      leftPx,
      topPx,
      arcOffsetPx,
      sizePx: karaokeBallSizePx,
      anchorY,
    };
  }

  function karaokeBallOverlayStyleForState(
    voiceIndex: VoiceIndex,
    rowIndex: number | null,
    leftPercent: number,
    arcOffsetPx: number,
  ): string | null {
    const metrics = karaokeBallOverlayMetricsForState(voiceIndex, rowIndex, leftPercent, arcOffsetPx);
    if (!metrics) return null;

    return `left:${metrics.leftPx}px; top:${metrics.topPx}px; --karaoke-ball-y:${metrics.arcOffsetPx}px; --karaoke-ball-size-px:${metrics.sizePx}px; --karaoke-ball-anchor-y:${metrics.anchorY};`;
  }

  function applyKaraokeBallElementStyle(
    voiceIndex: VoiceIndex,
    rowIndex = voiceKaraokeBallRowIndexes[voiceIndex],
    leftPercent = voiceKaraokeBallLeftPercents[voiceIndex] ?? 50,
    arcOffsetPx = voiceKaraokeBallArcOffsetPxs[voiceIndex] ?? 0,
  ): void {
    const element = karaokeBallElements[voiceIndex];
    if (!element) return;

    const metrics = karaokeBallOverlayMetricsForState(voiceIndex, rowIndex, leftPercent, arcOffsetPx);
    if (!metrics) {
      element.style.display = 'none';
      return;
    }

    element.style.left = `${metrics.leftPx}px`;
    element.style.top = `${metrics.topPx}px`;
    element.style.setProperty('--karaoke-ball-y', `${metrics.arcOffsetPx}px`);
    element.style.setProperty('--karaoke-ball-size-px', `${metrics.sizePx}px`);
    element.style.setProperty('--karaoke-ball-anchor-y', metrics.anchorY);
    element.style.display = '';
  }

  function applyKaraokeBallArcOffsetStyle(voiceIndex: VoiceIndex, arcOffsetPx: number): void {
    const element = karaokeBallElements[voiceIndex];
    if (!element || element.style.display === 'none') {
      applyKaraokeBallElementStyle(voiceIndex, undefined, undefined, arcOffsetPx);
      return;
    }

    element.style.setProperty('--karaoke-ball-y', `${arcOffsetPx}px`);
  }

  function applyKaraokeBallElementStyles(): void {
    for (const voiceIndex of VOICE_INDEXES) {
      applyKaraokeBallElementStyle(voiceIndex);
    }
  }

  function setKaraokeBallToAnchor(voiceIndex: VoiceIndex, anchor: KaraokeAnchor): void {
    setKaraokeBallState(voiceIndex, anchor.rowIndex, anchor.leftPercent, 0);
  }

  function clearKaraokeBallDisplay(voiceIndex: VoiceIndex): void {
    clearKaraokeAnimation(voiceIndex);
    setKaraokeBallState(voiceIndex, null, 50, 0);
    voiceKaraokeAnchors[voiceIndex] = null;
  }

  function clearHorizontalPlaybackScrollAnimation(): void {
    horizontalPlaybackScrollToken += 1;
    horizontalPlaybackScrollAnimation = null;
    if (horizontalPlaybackScrollFrame !== null) {
      cancelAnimationFrame(horizontalPlaybackScrollFrame);
      horizontalPlaybackScrollFrame = null;
    }
  }

  function setHorizontalPlaybackLaneShiftPx(voiceIndex: VoiceIndex, shiftPx: number): void {
    voiceHorizontalPlaybackLaneShiftPxs.splice(voiceIndex, 1, shiftPx);
    applyHorizontalPlaybackLaneShiftStyle(voiceIndex, shiftPx);
  }

  function applyHorizontalPlaybackLaneShiftStyle(voiceIndex: VoiceIndex, shiftPx: number): void {
    for (const rowElement of voiceTrackRowElements[voiceIndex]) {
      rowElement?.style.setProperty('--horizontal-playback-lane-shift-px', `${shiftPx}px`);
    }
  }

  function applyHorizontalPlaybackLaneShiftStyles(): void {
    for (const voiceIndex of VOICE_INDEXES) {
      applyHorizontalPlaybackLaneShiftStyle(voiceIndex, voiceHorizontalPlaybackLaneShiftPxs[voiceIndex] ?? 0);
    }
  }

  function maxHorizontalPlaybackScrollLeft(): number {
    const container = canvasScrollShellElement;
    return container ? Math.max(0, container.scrollWidth - container.clientWidth) : 0;
  }

  function clampHorizontalPlaybackScrollLeft(scrollLeft: number): number {
    return clamp(scrollLeft, 0, maxHorizontalPlaybackScrollLeft());
  }

  function applyHorizontalPlaybackTrackTransform(): void {
    const container = canvasScrollShellElement;
    const grid = rowsGridElement;
    if (!container || !grid || horizontalPlaybackVirtualScrollLeft === null) return;

    const translateX = container.scrollLeft - horizontalPlaybackVirtualScrollLeft;
    grid.style.transform = `translate3d(${translateX}px, 0, 0)`;
    grid.style.willChange = 'transform';
  }

  function setHorizontalPlaybackScrollLeft(scrollLeft: number): void {
    const container = canvasScrollShellElement;
    if (!container) return;

    const clampedScrollLeft = clampHorizontalPlaybackScrollLeft(scrollLeft);
    if (isHorizontalPlaybackTransformScrollActive()) {
      horizontalPlaybackVirtualScrollLeft = clampedScrollLeft;
      applyHorizontalPlaybackTrackTransform();
      return;
    }

    horizontalPlaybackVirtualScrollLeft = null;
    container.scrollLeft = clampedScrollLeft;
  }

  function resetHorizontalPlaybackTrackTransform(commitVirtualScroll = false): void {
    const container = canvasScrollShellElement;
    if (commitVirtualScroll && container && horizontalPlaybackVirtualScrollLeft !== null) {
      container.scrollLeft = clampHorizontalPlaybackScrollLeft(horizontalPlaybackVirtualScrollLeft);
    }

    horizontalPlaybackVirtualScrollLeft = null;
    if (rowsGridElement) {
      rowsGridElement.style.transform = '';
      rowsGridElement.style.willChange = '';
    }
  }

  function clearHorizontalPlaybackLaneShiftAnimation(voiceIndex: VoiceIndex): void {
    voiceHorizontalPlaybackLaneShiftTokens[voiceIndex] += 1;
    if (voiceHorizontalPlaybackLaneShiftFrames[voiceIndex] !== null) {
      cancelAnimationFrame(voiceHorizontalPlaybackLaneShiftFrames[voiceIndex]!);
      voiceHorizontalPlaybackLaneShiftFrames[voiceIndex] = null;
    }
  }

  function clearHorizontalPlaybackLaneShiftAnimations(): void {
    for (const voiceIndex of VOICE_INDEXES) {
      clearHorizontalPlaybackLaneShiftAnimation(voiceIndex);
    }
  }

  function resetHorizontalPlaybackHighway(commitVirtualScroll = false): void {
    clearHorizontalPlaybackScrollAnimation();
    resetHorizontalPlaybackTrackTransform(commitVirtualScroll);
    clearHorizontalPlaybackLaneShiftAnimations();
    horizontalPlaybackHighway = {
      activationIndex: null,
      pinnedVoiceIndex: null,
      referenceViewportLeftPx: null,
    };
    voiceKaraokeBallPinnedLeftPxs = VOICE_INDEXES.map(() => null);
    voiceHorizontalPlaybackLaneShiftPxs = VOICE_INDEXES.map(() => 0);
    applyHorizontalPlaybackLaneShiftStyles();
  }

  function prepareHorizontalPlaybackHighway(startIndex: number, totalCells: number): void {
    resetHorizontalPlaybackHighway();
    if (trackStyle !== 'horizontal') return;
    const activationIndex = startIndex + MICROBEATS_PER_BEAT;
    if (activationIndex >= totalCells) return;

    horizontalPlaybackHighway = {
      activationIndex,
      pinnedVoiceIndex: resolvePlaybackScrollVoiceIndex(),
      referenceViewportLeftPx: null,
    };
  }

  function debugPlaybackHighlight(message: string, details?: Record<string, unknown>): void {
    if (!PLAYBACK_HIGHLIGHT_DEBUG) return;
    console.log(`[BoomwhackerSketchpad][PlaybackHighlight] ${message}`, details ?? {});
  }

  function debugPlayedNoteMuting(message: string, details?: Record<string, unknown>): void {
    if (!PLAYED_NOTE_MUTING_DEBUG) return;
    console.log(`[BoomwhackerSketchpad][PlayedNoteMuting] ${message}`, details ?? {});
  }

  function debugPickupRender(message: string, details?: Record<string, unknown>): void {
    if (!PICKUP_RENDER_DEBUG) return;
    console.log(`[BoomwhackerSketchpad][PickupRender] ${message}`, details ?? {});
  }

  function debugMobileLayout(message: string, details?: Record<string, unknown>): void {
    if (!MOBILE_LAYOUT_DEBUG) return;
    console.log(`[BoomwhackerSketchpad][MobileLayout] ${message}`, details ?? {});
  }

  function debugTempoSliderLayout(message: string, details?: Record<string, unknown>): void {
    if (!TEMPO_SLIDER_LAYOUT_DEBUG) return;
    console.log(`[BoomwhackerSketchpad][TempoSlider] ${message}`, details ?? {});
  }

  function debugPlaybackStartup(message: string, details?: Record<string, unknown>): void {
    if (!PLAYBACK_STARTUP_DEBUG) return;
    console.info(`[BoomwhackerSketchpad][PlaybackStartup] ${message}`, details ?? {});
  }

  function queueCanvasPanelReposition(previousRect: DOMRect | null): void {
    if (typeof window === 'undefined' || !previousRect) return;

    const token = ++canvasPanelRepositionToken;
    void tick().then(() => {
      if (token !== canvasPanelRepositionToken) return;

      const element = canvasPanelElement;
      if (!element || typeof element.animate !== 'function') return;

      const nextRect = element.getBoundingClientRect();
      const deltaX = roundTo2(previousRect.left - nextRect.left);
      const deltaY = roundTo2(previousRect.top - nextRect.top);

      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;

      canvasPanelRepositionAnimation?.cancel();
      element.style.willChange = 'transform';

      const animation = element.animate(
        [
          { transform: `translate(${deltaX}px, ${deltaY}px)` },
          { transform: 'translate(0, 0)' },
        ],
        {
          duration: CANVAS_PANEL_REPOSITION_MS,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        },
      );

      const clearAnimation = (): void => {
        if (canvasPanelRepositionAnimation === animation) {
          canvasPanelRepositionAnimation = null;
        }
        if (canvasPanelElement === element) {
          element.style.willChange = '';
        }
      };

      canvasPanelRepositionAnimation = animation;
      animation.onfinish = clearAnimation;
      animation.oncancel = clearAnimation;
    });
  }

  function setPlaybackUiState(nextPlaying: boolean): void {
    if (isPlaying === nextPlaying) return;

    const previousRect = canvasPanelElement?.getBoundingClientRect() ?? null;
    isPlaying = nextPlaying;
    queueCanvasPanelReposition(previousRect);
  }

  function shouldUseViewportFitMode(): boolean {
    if (typeof window === 'undefined') return false;
    const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const anyCoarsePointer = window.matchMedia('(any-pointer: coarse)').matches;

    return anyCoarsePointer && viewportWidth >= VIEWPORT_FIT_WIDTH_MIN && viewportHeight <= VIEWPORT_FIT_HEIGHT_MAX;
  }

  function updateViewportFitMode(): void {
    viewportFitMode = shouldUseViewportFitMode();
  }

  function updateTapPlacementHintVisibility(): void {
    if (typeof window === 'undefined') {
      bankNativeDragEnabled = true;
      return;
    }

    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    bankNativeDragEnabled = !coarsePointer;
    if (bankNativeDragEnabled) {
      pendingBankTouchActivation = null;
      suppressNextBankClick = false;
    }
  }

  function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  function collectAdaptiveLayoutMetrics(): AdaptiveLayoutMetrics {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return {
        viewportWidth: 1024,
        viewportHeight: 768,
        coarsePointer: false,
        controlsGroupCount: 1,
        rowCount: sharedRowCount(),
      };
    }

    const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const coarsePointer = window.matchMedia('(any-pointer: coarse)').matches;
    const controlsGroupCount = document.querySelectorAll('#boomwhacker-sketchpad-app .controls-panel > .controls-group').length;

    return {
      viewportWidth,
      viewportHeight,
      coarsePointer,
      controlsGroupCount: controlsGroupCount > 0 ? controlsGroupCount : 1,
      rowCount: sharedRowCount(),
    };
  }

  function computeAdaptiveLayout(metrics: AdaptiveLayoutMetrics): AdaptiveLayoutConfig {
    if (!viewportFitMode || !metrics.coarsePointer) {
      return {
        ...ADAPTIVE_LAYOUT_DEFAULT,
        rowsColumns: 1,
        cellHeightRatio: 2,
      };
    }

    const veryShortViewport = metrics.viewportHeight <= 760;
    const shortViewport = metrics.viewportHeight <= 860;
    const narrowViewport = metrics.viewportWidth < 940;
    const mediumWidth = metrics.viewportWidth < 1240;

    let profile: AdaptiveLayoutProfile = 'comfortable';
    if (veryShortViewport || narrowViewport) {
      profile = 'tight';
    } else if (shortViewport || mediumWidth) {
      profile = 'compact';
    }

    const profileTuning: Record<
      AdaptiveLayoutProfile,
      Omit<AdaptiveLayoutConfig, 'profile' | 'controlsColumns' | 'rowsColumns'>
    > = {
      comfortable: {
        controlsScale: 0.96,
        controlsGapPx: 5,
        controlsPanelPaddingPx: 5,
        groupMinWidthPx: 132,
        bankScale: 0.8,
        cellHeightRatio: 1.2,
        rowsGapPx: 8,
      },
      compact: {
        controlsScale: 0.86,
        controlsGapPx: 4,
        controlsPanelPaddingPx: 4,
        groupMinWidthPx: 116,
        bankScale: 0.68,
        cellHeightRatio: 1.02,
        rowsGapPx: 6,
      },
      tight: {
        controlsScale: 0.8,
        controlsGapPx: 3,
        controlsPanelPaddingPx: 3,
        groupMinWidthPx: 104,
        bankScale: 0.6,
        cellHeightRatio: 0.9,
        rowsGapPx: 5,
      },
    };

    const tuning = profileTuning[profile];
    const controlsGroupCount = clamp(metrics.controlsGroupCount, 1, 5);
    const availableControlsWidth = Math.max(320, metrics.viewportWidth - tuning.controlsPanelPaddingPx * 2 - 20);
    const tempoGroupWidthPremium = 34;
    const estimatedSingleRowWidth =
      (controlsGroupCount - 1) * tuning.groupMinWidthPx +
      (tuning.groupMinWidthPx + tempoGroupWidthPremium) +
      (controlsGroupCount - 1) * tuning.controlsGapPx;

    let controlsColumns = controlsGroupCount;
    if (estimatedSingleRowWidth > availableControlsWidth) {
      const estimatedGroupWidth = tuning.groupMinWidthPx + tuning.controlsGapPx;
      const fittedColumns = Math.floor((availableControlsWidth + tuning.controlsGapPx) / estimatedGroupWidth);
      const minimumColumns = controlsGroupCount > 1 ? 2 : 1;
      controlsColumns = clamp(fittedColumns, minimumColumns, controlsGroupCount);
    }

    const canTryTwoCanvasColumns = metrics.rowCount >= 4 && metrics.viewportWidth >= 700;
    const rowsColumns = canTryTwoCanvasColumns ? 2 : 1;

    return {
      profile,
      controlsColumns,
      rowsColumns,
      ...tuning,
    };
  }

  function updateAdaptiveLayout(): void {
    const metrics = collectAdaptiveLayoutMetrics();
    const next = computeAdaptiveLayout(metrics);
    const key = JSON.stringify(next);
    if (key === adaptiveLayoutLogKey) return;

    adaptiveLayoutLogKey = key;
    adaptiveLayout = next;
  }

  function roundTo2(value: number): number {
    return Number(value.toFixed(2));
  }

  function tempoSliderElementSnapshot(selector: string): Record<string, unknown> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return { selector, exists: false };
    }

    const element = document.querySelector<HTMLElement>(selector);
    if (!element) {
      return { selector, exists: false };
    }

    const rect = element.getBoundingClientRect();
    const computed = window.getComputedStyle(element);
    return {
      selector,
      exists: true,
      className: element.className,
      inlineHeight: element.style.height || null,
      width: roundTo2(rect.width),
      height: roundTo2(rect.height),
      clientWidth: element.clientWidth,
      clientHeight: element.clientHeight,
      scrollWidth: element.scrollWidth,
      scrollHeight: element.scrollHeight,
      hasHorizontalOverflow: element.scrollWidth > element.clientWidth + 1,
      hasVerticalOverflow: element.scrollHeight > element.clientHeight + 1,
      overflowY: computed.overflowY,
      display: computed.display,
      position: computed.position,
      alignSelf: computed.alignSelf,
      alignItems: computed.alignItems,
      alignContent: computed.alignContent,
      justifyContent: computed.justifyContent,
      justifySelf: computed.justifySelf,
      gridTemplateRows: computed.gridTemplateRows,
      gridTemplateColumns: computed.gridTemplateColumns,
      minHeight: computed.minHeight,
      maxHeight: computed.maxHeight,
      writingMode: computed.writingMode,
      direction: computed.direction,
    };
  }

  function tempoSliderRelationSnapshot(childSelector: string, parentSelector: string): Record<string, unknown> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return { childSelector, parentSelector, exists: false };
    }

    const child = document.querySelector<HTMLElement>(childSelector);
    const parent = document.querySelector<HTMLElement>(parentSelector);
    if (!child || !parent) {
      return {
        childSelector,
        parentSelector,
        exists: false,
        hasChild: Boolean(child),
        hasParent: Boolean(parent),
      };
    }

    const childRect = child.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    const overflowTopPx = Math.max(0, parentRect.top - childRect.top);
    const overflowBottomPx = Math.max(0, childRect.bottom - parentRect.bottom);

    return {
      childSelector,
      parentSelector,
      exists: true,
      childClassName: child.className,
      parentClassName: parent.className,
      childHeightPx: roundTo2(childRect.height),
      parentHeightPx: roundTo2(parentRect.height),
      childTopWithinParentPx: roundTo2(childRect.top - parentRect.top),
      childBottomWithinParentPx: roundTo2(childRect.bottom - parentRect.top),
      remainingParentSpacePx: roundTo2(parentRect.bottom - childRect.bottom),
      overflowTopPx: roundTo2(overflowTopPx),
      overflowBottomPx: roundTo2(overflowBottomPx),
      exceedsParentTop: overflowTopPx > 1,
      exceedsParentBottom: overflowBottomPx > 1,
      childHeightPercentOfParent: parentRect.height > 0 ? roundTo2((childRect.height / parentRect.height) * 100) : null,
    };
  }

  function elementLayoutSnapshot(selector: string): Record<string, unknown> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return { selector, exists: false };
    }

    const element = document.querySelector<HTMLElement>(selector);
    if (!element) {
      return { selector, exists: false };
    }

    const rect = element.getBoundingClientRect();
    const computed = window.getComputedStyle(element);
    return {
      selector,
      exists: true,
      width: roundTo2(rect.width),
      height: roundTo2(rect.height),
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      hasHorizontalOverflow: element.scrollWidth > element.clientWidth + 1,
      hasVerticalOverflow: element.scrollHeight > element.clientHeight + 1,
      display: computed.display,
      position: computed.position,
      overflowX: computed.overflowX,
      overflowY: computed.overflowY,
      gridTemplateColumns: computed.gridTemplateColumns,
    };
  }

  function firstHitTargetSize(selector: string): Record<string, number | null> {
    if (typeof document === 'undefined') {
      return { width: null, height: null, minSide: null };
    }

    const element = document.querySelector<HTMLElement>(selector);
    if (!element) {
      return { width: null, height: null, minSide: null };
    }

    const rect = element.getBoundingClientRect();
    const width = roundTo2(rect.width);
    const height = roundTo2(rect.height);
    return {
      width,
      height,
      minSide: roundTo2(Math.min(width, height)),
    };
  }

  function responsiveCssEstimateForWidth(width: number): Record<string, unknown> {
    const max1200 = width <= 1200;
    const max760 = width <= 760;
    return {
      width,
      breakpoints: {
        max1200,
        max760,
      },
      controlsPanelColumns: max760 ? '1fr' : max1200 ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr)) auto',
      rowsGridColumns: max1200 ? '1fr' : 'repeat(auto-fit, minmax(430px, 1fr))',
      bankRowPairColumns: max760 ? '1fr' : 'max-content max-content',
      tokenDensity: max760 ? 'compact' : 'default',
    };
  }

  function inputCapabilitySnapshot(): Record<string, unknown> {
    if (typeof window === 'undefined' || typeof document === 'undefined') return {};

    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const anyCoarsePointer = window.matchMedia('(any-pointer: coarse)').matches;
    const hoverPrimary = window.matchMedia('(hover: hover)').matches;
    const anyHover = window.matchMedia('(any-hover: hover)').matches;
    const touchPoints = navigator.maxTouchPoints ?? 0;
    const touchEventSupport = 'ontouchstart' in window;
    const draggableNoteCount = document.querySelectorAll('[draggable="true"]').length;
    const dropCellCount = document.querySelectorAll('.macrobeat-cell').length;

    return {
      maxTouchPoints: touchPoints,
      touchEventSupport,
      coarsePointer,
      anyCoarsePointer,
      hoverPrimary,
      anyHover,
      draggableNoteCount,
      dropCellCount,
      usesHtml5DragModel: true,
      hasTouchTapPlacementFallback: true,
      tempoDragUsesMouseOnly: false,
    };
  }

  function queueTempoSliderLayoutSnapshot(reason: string): void {
    if (!TEMPO_SLIDER_LAYOUT_DEBUG) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    requestAnimationFrame(() => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const visualViewport = window.visualViewport
        ? {
            width: roundTo2(window.visualViewport.width),
            height: roundTo2(window.visualViewport.height),
            scale: roundTo2(window.visualViewport.scale),
            offsetTop: roundTo2(window.visualViewport.offsetTop),
            offsetLeft: roundTo2(window.visualViewport.offsetLeft),
          }
        : null;

      const snapshot = {
        reason,
        viewport: {
          innerWidth: viewportWidth,
          innerHeight: viewportHeight,
          devicePixelRatio: roundTo2(window.devicePixelRatio || 1),
          visualViewport,
        },
        viewportFitMode,
        breakpoints: {
          max1200: window.matchMedia('(max-width: 1200px)').matches,
          max920: window.matchMedia('(max-width: 920px)').matches,
          max760: window.matchMedia('(max-width: 760px)').matches,
        },
        adaptiveLayout,
        tempo: {
          topToolbar: tempoSliderElementSnapshot('.top-toolbar'),
          controlsPanel: tempoSliderElementSnapshot('.controls-panel'),
          toolbarNotebankPanel: tempoSliderElementSnapshot('.toolbar-notebank-panel'),
          tempoInlineGroup: tempoSliderElementSnapshot('.tempo-inline-group'),
          tempoControls: tempoSliderElementSnapshot('.tempo-controls'),
          tempoRows: tempoSliderElementSnapshot('.tempo-rows'),
          tempoSliderContainer: tempoSliderElementSnapshot('.tempo-slider-container'),
          tempoSlider: tempoSliderElementSnapshot('.tempo-slider'),
        },
        relations: {
          controlsPanelWithinTopToolbar: tempoSliderRelationSnapshot('.controls-panel', '.top-toolbar'),
          toolbarNotebankPanelWithinTopToolbar: tempoSliderRelationSnapshot('.toolbar-notebank-panel', '.top-toolbar'),
          tempoInlineGroupWithinControlsPanel: tempoSliderRelationSnapshot('.tempo-inline-group', '.controls-panel'),
          tempoControlsWithinTempoInlineGroup: tempoSliderRelationSnapshot('.tempo-controls', '.tempo-inline-group'),
          tempoRowsWithinTempoControls: tempoSliderRelationSnapshot('.tempo-rows', '.tempo-controls'),
          tempoSliderContainerWithinTempoControls: tempoSliderRelationSnapshot('.tempo-slider-container', '.tempo-controls'),
          tempoSliderWithinTempoSliderContainer: tempoSliderRelationSnapshot('.tempo-slider', '.tempo-slider-container'),
        },
      };

      debugTempoSliderLayout('Tempo slider layout snapshot.', snapshot);
    });
  }

  function queueMobileLayoutSnapshot(reason: string): void {
    if (!MOBILE_LAYOUT_DEBUG) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    requestAnimationFrame(() => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const visualViewport = window.visualViewport
        ? {
            width: roundTo2(window.visualViewport.width),
            height: roundTo2(window.visualViewport.height),
            scale: roundTo2(window.visualViewport.scale),
            offsetTop: roundTo2(window.visualViewport.offsetTop),
            offsetLeft: roundTo2(window.visualViewport.offsetLeft),
          }
        : null;

      const breakpoints = {
        max1200: window.matchMedia('(max-width: 1200px)').matches,
        max760: window.matchMedia('(max-width: 760px)').matches,
      };

      const targetSizes = {
        transportButton: firstHitTargetSize('.transport-btn'),
        pickupButton: firstHitTargetSize('.pickup-controls button'),
        tokenHitbox: firstHitTargetSize('.token-hitbox.single'),
      };

      const snapshot = {
        reason,
        viewport: {
          innerWidth: viewportWidth,
          innerHeight: viewportHeight,
          devicePixelRatio: roundTo2(window.devicePixelRatio || 1),
          visualViewport,
          orientation: viewportWidth >= viewportHeight ? 'landscape' : 'portrait',
        },
        viewportFitMode,
        adaptiveLayout,
        breakpoints,
        estimatesForCurrentWidth: responsiveCssEstimateForWidth(viewportWidth),
        ipadProfileEstimates: IPAD_VIEWPORT_PROFILES.map((profile) => ({
          profile,
          estimate: responsiveCssEstimateForWidth(profile.width),
        })),
        inputCapabilities: inputCapabilitySnapshot(),
        touchTargetSizes: targetSizes,
        layout: {
          app: elementLayoutSnapshot('#boomwhacker-sketchpad-app'),
          topToolbar: elementLayoutSnapshot('.top-toolbar'),
          controlsPanel: elementLayoutSnapshot('.controls-panel'),
          toolbarNotebankPanel: elementLayoutSnapshot('.toolbar-notebank-panel'),
          lowerNotebankPanel: elementLayoutSnapshot('.lower-notebank-panel'),
          canvasPanel: elementLayoutSnapshot('.canvas-panel'),
          rowsGrid: elementLayoutSnapshot('.rows-grid'),
          firstTrackRow: elementLayoutSnapshot('.track-row'),
          firstMainGrid: elementLayoutSnapshot('.track-grid.main-grid'),
        },
      };

      const topToolbarRect = document.querySelector<HTMLElement>('.top-toolbar')?.getBoundingClientRect() ?? null;
      const lowerNotebankRect = document.querySelector<HTMLElement>('.lower-notebank-panel')?.getBoundingClientRect() ?? null;
      const firstTrackRowRect = document.querySelector<HTMLElement>('.track-row')?.getBoundingClientRect() ?? null;
      const appGapPx =
        Number.parseFloat(window.getComputedStyle(document.querySelector<HTMLElement>('#boomwhacker-sketchpad-app') ?? document.body).rowGap || '0') || 0;
      const fitViewportHeight = visualViewport?.height ?? viewportHeight;
      const estimatedHeightForTwoRows =
        (topToolbarRect?.height ?? 0) +
        (lowerNotebankRect?.height ?? 0) +
        (firstTrackRowRect?.height ?? 0) * 2 +
        appGapPx * (lowerNotebankRect ? 2 : 1);
      const fitHeuristic = {
        fitViewportHeight: roundTo2(fitViewportHeight),
        estimatedHeightForTwoRows: roundTo2(estimatedHeightForTwoRows),
        estimatedCanFitTwoRows: estimatedHeightForTwoRows <= fitViewportHeight,
      };
      (snapshot as Record<string, unknown>).fitHeuristic = fitHeuristic;

      const logKey = JSON.stringify({
        reason,
        width: viewportWidth,
        height: viewportHeight,
        adaptiveProfile: adaptiveLayout.profile,
        adaptiveControlsColumns: adaptiveLayout.controlsColumns,
        adaptiveRowsColumns: adaptiveLayout.rowsColumns,
        pickupBeats,
        rows: sharedRowCount(),
        showAccidentals,
        isPlaying,
        viewportFitMode,
        settingsOpen,
        shareModalOpen,
      });

      if (logKey === mobileLayoutLogKey) return;
      mobileLayoutLogKey = logKey;
      debugMobileLayout('Responsive layout snapshot.', snapshot);
    });
  }

  function getTrackRowRect(voiceIndex: VoiceIndex, rowIndex: number): DOMRect | null {
    return getCachedTrackRowRect(voiceIndex, rowIndex)
      ?? voiceTrackRowElements[voiceIndex][rowIndex]?.getBoundingClientRect()
      ?? null;
  }

  function getTrackRowElement(voiceIndex: VoiceIndex, rowIndex: number): HTMLElement | null {
    return voiceTrackRowElements[voiceIndex][rowIndex] ?? null;
  }

  function resolvePlaybackScrollVoiceIndex(): VoiceIndex {
    if (isVoiceVisible(activeCanvasVoiceIndex)) {
      return activeCanvasVoiceIndex;
    }

    return visibleVoiceIndices()[0] ?? 0;
  }

  function karaokeAnchorViewportLeftPx(
    voiceIndex: VoiceIndex,
    anchor: KaraokeAnchor,
    relativeTo: 'panel' | 'scroll-shell',
  ): number | null {
    const rowElement = getTrackRowElement(voiceIndex, anchor.rowIndex);
    const referenceElement = relativeTo === 'panel' ? canvasPanelElement : canvasScrollShellElement;
    if (!rowElement || !referenceElement) return null;

    const rowRect = getTrackRowRect(voiceIndex, anchor.rowIndex);
    const cachedReferenceRect =
      relativeTo === 'panel'
        ? playbackGeometryCache ? rectFromSnapshot(playbackGeometryCache.panelRect) : null
        : playbackGeometryCache?.scrollShellRect ? rectFromSnapshot(playbackGeometryCache.scrollShellRect) : null;
    const referenceRect = cachedReferenceRect ?? referenceElement.getBoundingClientRect();
    if (!rowRect) return null;
    const referenceBorder = relativeTo === 'panel' ? canvasPanelElement?.clientLeft ?? 0 : canvasScrollShellElement?.clientLeft ?? 0;
    return rowRect.left - referenceRect.left - referenceBorder + (anchor.leftPercent / 100) * rowRect.width;
  }

  function karaokeAnchorContentLeftPx(voiceIndex: VoiceIndex, anchor: KaraokeAnchor): number | null {
    const container = canvasScrollShellElement;
    if (!container) return null;

    const viewportLeft = karaokeAnchorViewportLeftPx(voiceIndex, anchor, 'scroll-shell');
    if (viewportLeft === null) return null;
    return effectiveHorizontalPlaybackScrollLeft() + viewportLeft;
  }

  function scrollLeftForKaraokeAnchor(
    voiceIndex: VoiceIndex,
    anchor: KaraokeAnchor,
    targetViewportLeftPx: number,
  ): number | null {
    const container = canvasScrollShellElement;
    if (!container) return null;

    const anchorContentLeft = karaokeAnchorContentLeftPx(voiceIndex, anchor);
    if (anchorContentLeft === null) return null;

    const maxScrollLeft = maxHorizontalPlaybackScrollLeft();
    return Math.max(0, Math.min(maxScrollLeft, anchorContentLeft - targetViewportLeftPx));
  }

  function animateHorizontalPlaybackScrollTo(
    targetScrollLeft: number,
    durationMs: number,
    startedAtMs: number = performance.now(),
  ): void {
    const container = canvasScrollShellElement;
    if (!container) return;

    const clampedTarget = clampHorizontalPlaybackScrollLeft(targetScrollLeft);
    const currentScrollLeft = effectiveHorizontalPlaybackScrollLeft();
    if (Math.abs(clampedTarget - currentScrollLeft) < 0.5) {
      clearHorizontalPlaybackScrollAnimation();
      setHorizontalPlaybackScrollLeft(clampedTarget);
      return;
    }

    if (
      horizontalPlaybackScrollFrame !== null &&
      horizontalPlaybackScrollAnimation &&
      Math.abs(horizontalPlaybackScrollAnimation.targetScrollLeft - clampedTarget) < 0.5
    ) {
      return;
    }

    clearHorizontalPlaybackScrollAnimation();

    const token = horizontalPlaybackScrollToken;
    const startedAt = Math.min(startedAtMs, performance.now());
    const startScrollLeft = currentScrollLeft;
    const deltaScrollLeft = clampedTarget - startScrollLeft;
    const motionDurationMs = Math.max(24, Math.floor(durationMs));
    horizontalPlaybackScrollAnimation = {
      targetScrollLeft: clampedTarget,
      startedAtMs: startedAt,
      durationMs: motionDurationMs,
    };

    const step = (now: number): void => {
      if (token !== horizontalPlaybackScrollToken) return;

      const progress = Math.min(1, (now - startedAt) / motionDurationMs);
      setHorizontalPlaybackScrollLeft(startScrollLeft + deltaScrollLeft * progress);

      if (progress >= 1) {
        horizontalPlaybackScrollFrame = null;
        horizontalPlaybackScrollAnimation = null;
        return;
      }

      horizontalPlaybackScrollFrame = requestAnimationFrame(step);
    };

    horizontalPlaybackScrollFrame = requestAnimationFrame(step);
  }

  function scrollHorizontalTrackToAnchor(
    voiceIndex: VoiceIndex,
    anchor: KaraokeAnchor,
    behavior: ScrollBehavior = 'smooth',
    targetViewportLeftPx: number | null = null,
    durationMs: number | null = null,
    startedAtMs: number | null = null,
  ): void {
    if (trackStyle !== 'horizontal') return;
    if (typeof window === 'undefined') return;

    const container = canvasScrollShellElement;
    if (!container) return;

    const resolvedViewportLeftPx = targetViewportLeftPx ?? container.clientWidth * HORIZONTAL_PLAYBACK_SCROLL_AHEAD_RATIO;
    const targetScrollLeft = scrollLeftForKaraokeAnchor(voiceIndex, anchor, resolvedViewportLeftPx);
    if (targetScrollLeft === null) return;

    if (Math.abs(targetScrollLeft - effectiveHorizontalPlaybackScrollLeft()) < 6) return;
    if (durationMs !== null) {
      animateHorizontalPlaybackScrollTo(targetScrollLeft, durationMs, startedAtMs ?? performance.now());
      return;
    }

    clearHorizontalPlaybackScrollAnimation();
    if (isPlaying) {
      setHorizontalPlaybackScrollLeft(targetScrollLeft);
      return;
    }

    container.scrollTo({ left: targetScrollLeft, behavior });
  }

  function queueHorizontalPlaybackScroll(index: number, behavior: ScrollBehavior = 'smooth'): void {
    if (trackStyle !== 'horizontal') return;
    if (typeof window === 'undefined') return;

    requestAnimationFrame(() => {
      if (trackStyle !== 'horizontal') return;

      const preferredVoiceIndex = resolvePlaybackScrollVoiceIndex();
      const preferredAnchor = karaokeAnchorFromPlaybackIndex(preferredVoiceIndex, index);
      if (preferredAnchor) {
        scrollHorizontalTrackToAnchor(preferredVoiceIndex, preferredAnchor, behavior);
        return;
      }

      for (const voiceIndex of visibleVoiceIndices()) {
        const anchor = karaokeAnchorFromPlaybackIndex(voiceIndex, index);
        if (anchor) {
          scrollHorizontalTrackToAnchor(voiceIndex, anchor, behavior);
          return;
        }
      }
    });
  }

  function activateHorizontalPlaybackHighway(currentIndex: number): void {
    if (trackStyle !== 'horizontal') return;
    if (horizontalPlaybackHighway.activationIndex !== currentIndex) return;
    if (horizontalPlaybackHighway.referenceViewportLeftPx !== null) return;

    const panel = canvasPanelElement;
    const container = canvasScrollShellElement;
    if (!panel || !container) return;

    const preferredVoiceIndex = horizontalPlaybackHighway.pinnedVoiceIndex;
    let fallbackVoiceIndex: VoiceIndex | null = null;
    let fallbackReferenceViewportLeftPx: number | null = null;
    let fallbackPinnedLeftPx: number | null = null;
    let preferredReferenceViewportLeftPx: number | null = null;
    let preferredPinnedLeftPx: number | null = null;

    for (const voiceIndex of visibleVoiceIndices()) {
      const anchor = karaokeAnchorFromPlaybackIndex(voiceIndex, currentIndex);
      if (!anchor) continue;

      const panelLeftPx = karaokeAnchorViewportLeftPx(voiceIndex, anchor, 'panel');
      const containerLeftPx = karaokeAnchorViewportLeftPx(voiceIndex, anchor, 'scroll-shell');
      if (panelLeftPx === null || containerLeftPx === null) continue;

      voiceKaraokeBallPinnedLeftPxs[voiceIndex] = panelLeftPx;
      if (fallbackReferenceViewportLeftPx === null) {
        fallbackReferenceViewportLeftPx = containerLeftPx;
        fallbackPinnedLeftPx = panelLeftPx;
        fallbackVoiceIndex = voiceIndex;
      }
      if (voiceIndex === preferredVoiceIndex) {
        preferredReferenceViewportLeftPx = containerLeftPx;
        preferredPinnedLeftPx = panelLeftPx;
      }
    }

    const resolvedPinnedLeftPx = preferredPinnedLeftPx ?? fallbackPinnedLeftPx;
    if (resolvedPinnedLeftPx !== null) {
      for (const voiceIndex of visibleVoiceIndices()) {
        voiceKaraokeBallPinnedLeftPxs[voiceIndex] = resolvedPinnedLeftPx;
      }
    }

    horizontalPlaybackHighway = {
      activationIndex: null,
      pinnedVoiceIndex: preferredReferenceViewportLeftPx !== null ? preferredVoiceIndex : fallbackVoiceIndex,
      referenceViewportLeftPx: preferredReferenceViewportLeftPx ?? fallbackReferenceViewportLeftPx,
    };

    if (horizontalPlaybackHighway.referenceViewportLeftPx !== null) {
      horizontalPlaybackVirtualScrollLeft = container.scrollLeft;
      applyHorizontalPlaybackTrackTransform();
    }
  }

  function queuePlaybackScrollForCurrentStep(currentIndex: number, totalCells: number, stepStartedAtMs: number): void {
    if (trackStyle !== 'horizontal') return;
    if (typeof window === 'undefined') return;

    const referenceViewportLeftPx = horizontalPlaybackHighway.referenceViewportLeftPx;
    if (referenceViewportLeftPx === null) return;

    if (voiceCount > 1) return;

    if (currentIndex + 1 >= totalCells) return;

    const preferredVoiceIndex = horizontalPlaybackHighway.pinnedVoiceIndex ?? resolvePlaybackScrollVoiceIndex();
    const preferredTransition = nextDistinctKaraokeAnchorTransition(preferredVoiceIndex, currentIndex, totalCells);
    if (preferredTransition) {
      scrollHorizontalTrackToAnchor(
        preferredVoiceIndex,
        preferredTransition.anchor,
        'auto',
        referenceViewportLeftPx,
        preferredTransition.durationMs,
        stepStartedAtMs,
      );
      return;
    }

    for (const voiceIndex of visibleVoiceIndices()) {
      const transition = nextDistinctKaraokeAnchorTransition(voiceIndex, currentIndex, totalCells);
      if (transition) {
        scrollHorizontalTrackToAnchor(
          voiceIndex,
          transition.anchor,
          'auto',
          referenceViewportLeftPx,
          transition.durationMs,
          stepStartedAtMs,
        );
        return;
      }
    }
  }

  function karaokeBallOverlayStyle(voiceIndex: VoiceIndex): string | null {
    canvasScrollRevision;

    return karaokeBallOverlayStyleForState(
      voiceIndex,
      voiceKaraokeBallRowIndexes[voiceIndex],
      voiceKaraokeBallLeftPercents[voiceIndex] ?? 50,
      voiceKaraokeBallArcOffsetPxs[voiceIndex] ?? 0,
    );
  }

  function karaokePlaybackLaneRect(voiceIndex: VoiceIndex, rowIndex: number): DOMRect | null {
    let laneLeft = Number.POSITIVE_INFINITY;
    let laneTop = Number.POSITIVE_INFINITY;
    let laneRight = Number.NEGATIVE_INFINITY;
    let laneBottom = Number.NEGATIVE_INFINITY;

    for (const key of voicePlaybackHighlightCellKeys[voiceIndex]) {
      const ref = playbackCellRefFromKey(key);
      if (!ref || ref.rowIndex !== rowIndex) continue;

      const rect = getTrackCellRect(ref.voiceIndex, ref.zone, ref.rowIndex, ref.cellIndex);
      if (!rect) continue;

      laneLeft = Math.min(laneLeft, rect.left);
      laneTop = Math.min(laneTop, rect.top);
      laneRight = Math.max(laneRight, rect.right);
      laneBottom = Math.max(laneBottom, rect.bottom);
    }

    if (Number.isFinite(laneLeft) && Number.isFinite(laneTop) && laneRight > laneLeft && laneBottom > laneTop) {
      return DOMRect.fromRect({
        x: laneLeft,
        y: laneTop,
        width: laneRight - laneLeft,
        height: laneBottom - laneTop,
      });
    }

    const firstCellSnapshot = playbackGeometryCache?.firstCellRects.get(rowGeometryKey(voiceIndex, rowIndex));
    if (firstCellSnapshot) return cachedRectWithScrollOffset(firstCellSnapshot);

    const rowElement = getTrackRowElement(voiceIndex, rowIndex);
    return rowElement?.querySelector<HTMLElement>('.macrobeat-cell')?.getBoundingClientRect() ?? null;
  }

  function rowsAreOnSameVisualLine(voiceIndex: VoiceIndex, rowA: number, rowB: number): boolean {
    const rectA = getTrackRowRect(voiceIndex, rowA);
    const rectB = getTrackRowRect(voiceIndex, rowB);
    if (!rectA || !rectB) return false;
    return Math.abs(rectA.top - rectB.top) < 2;
  }

  function mapAnchorLeftPercentIntoRowFrame(
    voiceIndex: VoiceIndex,
    sourceRowIndex: number,
    targetAnchor: KaraokeAnchor,
  ): number | null {
    const sourceRect = getTrackRowRect(voiceIndex, sourceRowIndex);
    const targetRect = getTrackRowRect(voiceIndex, targetAnchor.rowIndex);
    if (!sourceRect || !targetRect || sourceRect.width <= 0) return null;

    const targetX = targetRect.left + (targetAnchor.leftPercent / 100) * targetRect.width;
    return ((targetX - sourceRect.left) / sourceRect.width) * 100;
  }

  function karaokeAnchorsEqual(a: KaraokeAnchor, b: KaraokeAnchor): boolean {
    return a.rowIndex === b.rowIndex && Math.abs(a.leftPercent - b.leftPercent) < 0.0001;
  }

  function karaokeRowLeftBoundaryPercent(rowIndex: number): number {
    const pickupColumns = pickupMicrobeatCount();
    if (pickupColumns <= 0 || rowIndex <= 0) return 0;
    return (pickupColumns / (pickupColumns + GRID_COLUMNS)) * 100;
  }

  function getTrackCellElement(
    voiceIndex: VoiceIndex,
    zone: GridZone,
    rowIndex: number,
    cellIndex: number,
  ): HTMLElement | null {
    const cachedElement = playbackGeometryCache?.cellElements.get(cellGeometryKey(voiceIndex, zone, rowIndex, cellIndex));
    if (cachedElement?.isConnected) return cachedElement;

    const rowElement = getTrackRowElement(voiceIndex, rowIndex);
    if (!rowElement) return null;

    return rowElement.querySelector<HTMLElement>(
      `.macrobeat-cell[data-voice-index="${voiceIndex}"][data-track-zone="${zone}"][data-row-index="${rowIndex}"][data-cell-index="${cellIndex}"]`,
    );
  }

  function playbackCellKey(voiceIndex: VoiceIndex, zone: GridZone, rowIndex: number, cellIndex: number): string {
    return `${voiceIndex}:${zone}:${rowIndex}:${cellIndex}`;
  }

  function playbackCellRefFromKey(
    key: string,
  ): { voiceIndex: VoiceIndex; zone: GridZone; rowIndex: number; cellIndex: number } | null {
    const [voiceIndexValue, zoneValue, rowIndexValue, cellIndexValue] = key.split(':');
    const voiceIndex = Number(voiceIndexValue);
    const rowIndex = Number(rowIndexValue);
    const cellIndex = Number(cellIndexValue);

    if (!VOICE_INDEXES.includes(voiceIndex as VoiceIndex)) return null;
    if (zoneValue !== 'pickup' && zoneValue !== 'main') return null;
    if (!Number.isInteger(rowIndex) || !Number.isInteger(cellIndex)) return null;

    return { voiceIndex: voiceIndex as VoiceIndex, zone: zoneValue, rowIndex, cellIndex };
  }

  function getTrackCellElementFromKey(key: string): HTMLElement | null {
    const ref = playbackCellRefFromKey(key);
    return ref ? getTrackCellElement(ref.voiceIndex, ref.zone, ref.rowIndex, ref.cellIndex) : null;
  }

  function clearPlaybackCellClasses(element: HTMLElement | null): void {
    element?.classList.remove(...PLAYBACK_CELL_CLASS_NAMES);
  }

  function setCellNotesMuted(element: HTMLElement | null, muted: boolean): void {
    if (!element) return;

    for (const noteElement of element.querySelectorAll<HTMLElement>('.placed-note:not(.drag-preview-note)')) {
      noteElement.classList.toggle(PLAYED_NOTE_MUTED_CLASS, muted);
    }
  }

  function clearPlaybackCursorClassForVoice(voiceIndex: VoiceIndex): void {
    const previousKey = voicePlaybackCursorCellKeys[voiceIndex];
    if (!previousKey) return;

    getTrackCellElementFromKey(previousKey)?.classList.remove('playback-target');
    voicePlaybackCursorCellKeys.splice(voiceIndex, 1, null);
  }

  function applyPlaybackCursorClass(voiceIndex: VoiceIndex, cursor: GridCellRef): void {
    const key = playbackCellKey(voiceIndex, cursor.zone, cursor.rowIndex, cursor.cellIndex);
    if (voicePlaybackCursorCellKeys[voiceIndex] === key) return;

    clearPlaybackCursorClassForVoice(voiceIndex);
    getTrackCellElementFromKey(key)?.classList.add('playback-target');
    voicePlaybackCursorCellKeys.splice(voiceIndex, 1, key);
  }

  function clearPlaybackHighlightClassesForVoice(voiceIndex: VoiceIndex): void {
    for (const key of voicePlaybackHighlightCellKeys[voiceIndex]) {
      clearPlaybackCellClasses(getTrackCellElementFromKey(key));
    }

    voicePlaybackHighlightCellKeys[voiceIndex].clear();
  }

  function applyPlaybackHighlightClasses(voiceIndex: VoiceIndex, highlight: PlaybackHighlight): void {
    clearPlaybackHighlightClassesForVoice(voiceIndex);

    for (let offset = 0; offset < highlight.span; offset += 1) {
      const cellIndex = highlight.startCellIndex + offset;
      const key = playbackCellKey(voiceIndex, highlight.zone, highlight.rowIndex, cellIndex);
      const element = getTrackCellElementFromKey(key);
      if (!element) continue;

      element.classList.add('playback-illuminated', highlight.pulseClass);
      if (highlight.span === 2) {
        element.classList.add(offset === 0 ? 'playback-span-start' : 'playback-span-continuation');
      }
      voicePlaybackHighlightCellKeys[voiceIndex].add(key);
    }
  }

  function clearPlaybackDomClassesForVoice(voiceIndex: VoiceIndex): void {
    clearPlaybackCursorClassForVoice(voiceIndex);
    clearPlaybackHighlightClassesForVoice(voiceIndex);
    voicePlaybackHighlightAnchors.splice(voiceIndex, 1, null);
  }

  function clearPlaybackDomClasses(): void {
    for (const voiceIndex of VOICE_INDEXES) {
      clearPlaybackDomClassesForVoice(voiceIndex);
    }
  }

  function clearPlayedNoteMuteClasses(): void {
    canvasPanelElement
      ?.querySelectorAll<HTMLElement>(`.placed-note.${PLAYED_NOTE_MUTED_CLASS}`)
      .forEach((element) => element.classList.remove(PLAYED_NOTE_MUTED_CLASS));

    for (const voiceIndex of VOICE_INDEXES) {
      voicePlayedCellKeys[voiceIndex].clear();
    }
  }

  function getTrackCellRect(
    voiceIndex: VoiceIndex,
    zone: GridZone,
    rowIndex: number,
    cellIndex: number,
  ): DOMRect | null {
    return getCachedTrackCellRect(voiceIndex, zone, rowIndex, cellIndex)
      ?? getTrackCellElement(voiceIndex, zone, rowIndex, cellIndex)?.getBoundingClientRect()
      ?? null;
  }

  function sourceRowIndexForCursor(cursor: GridCellRef): number {
    return cursor.zone === 'pickup' ? 0 : cursor.sourceRowIndex ?? cursor.rowIndex;
  }

  function resolveRenderedKaraokeAnchorLeftPercent(
    voiceIndex: VoiceIndex,
    cursor: GridCellRef,
    anchorRowIndex: number,
    anchorStartCellIndex: number,
    anchorSpan: 1 | 2,
  ): number | null {
    const rowRect = getTrackRowRect(voiceIndex, anchorRowIndex);
    const startRect = getTrackCellRect(voiceIndex, cursor.zone, cursor.rowIndex, anchorStartCellIndex);
    if (!rowRect || !startRect) return null;
    if (rowRect.width <= 0 || startRect.width <= 0) return null;

    let anchorLeftPx = startRect.left;
    let anchorRightPx = startRect.right;
    if (anchorSpan === 2) {
      const endRect = getTrackCellRect(voiceIndex, cursor.zone, cursor.rowIndex, anchorStartCellIndex + 1);
      if (endRect && endRect.width > 0) {
        anchorLeftPx = Math.min(anchorLeftPx, endRect.left);
        anchorRightPx = Math.max(anchorRightPx, endRect.right);
      }
    }

    const anchorCenterPx = (anchorLeftPx + anchorRightPx) / 2;
    return ((anchorCenterPx - rowRect.left) / rowRect.width) * 100;
  }

  function isCircleMacrobeatPair(cells: Array<GridCellContent | null>, startCellIndex: number): boolean {
    const leftCell = cells[startCellIndex] ?? null;
    const rightCell = cells[startCellIndex + 1] ?? null;

    if (!leftCell) return false;
    if (leftCell.shape !== 'circle' || leftCell.role !== 'start') return false;
    if (!rightCell) return true;
    if (rightCell.shape !== 'circle' || rightCell.role !== 'continuation') return false;

    return rightCell.startCellIndex === startCellIndex;
  }

  function isEmptyMacrobeatPair(cells: Array<GridCellContent | null>, startCellIndex: number): boolean {
    const leftCell = cells[startCellIndex] ?? null;
    const rightCell = cells[startCellIndex + 1] ?? null;
    return !leftCell && !rightCell;
  }

  function shouldUseMacrobeatMidpoint(cells: Array<GridCellContent | null>, maxCells: number, cellIndex: number): boolean {
    const macrobeatStart = macrobeatStartCellIndex(cellIndex);
    if (macrobeatStart < 0 || macrobeatStart + 1 >= maxCells) return false;

    return isCircleMacrobeatPair(cells, macrobeatStart) || isEmptyMacrobeatPair(cells, macrobeatStart);
  }

  function resolveKaraokeAnchor(voiceIndex: VoiceIndex, cursor: GridCellRef | null): KaraokeAnchor | null {
    if (!cursor) return null;

    const pickupColumns = pickupMicrobeatCount();
    const isPickupZone = cursor.zone === 'pickup';
    const rowIndex = cursor.rowIndex;
    const sourceRowIndex = sourceRowIndexForCursor(cursor);
    const rowCells = isPickupZone
      ? pickupRowForVoice(voiceIndex).cells
      : rowsForVoice(voiceIndex)[sourceRowIndex]?.cells;

    if (!rowCells) return null;

    const maxCells = isPickupZone ? pickupColumns : GRID_COLUMNS;
    if (cursor.cellIndex < 0 || cursor.cellIndex >= maxCells) return null;

    const macrobeatMidpoint = shouldUseMacrobeatMidpoint(rowCells, maxCells, cursor.cellIndex);
    const anchorStartCellIndex = macrobeatMidpoint
      ? cursor.cellIndex - (cursor.cellIndex % MICROBEATS_PER_BEAT)
      : cursor.cellIndex;
    const renderedLeftPercent = typeof window !== 'undefined'
      ? resolveRenderedKaraokeAnchorLeftPercent(
          voiceIndex,
          cursor,
          rowIndex,
          anchorStartCellIndex,
          macrobeatMidpoint ? 2 : 1,
        )
      : null;
    if (renderedLeftPercent !== null) {
      return { rowIndex, leftPercent: renderedLeftPercent };
    }

    const localColumn = macrobeatMidpoint
      ? cursor.cellIndex - (cursor.cellIndex % MICROBEATS_PER_BEAT) + 1
      : cursor.cellIndex + 0.5;

    const hasPickup = pickupColumns > 0;
    const totalColumns = hasPickup ? pickupColumns + GRID_COLUMNS : GRID_COLUMNS;
    const leadingColumns = !isPickupZone && hasPickup ? pickupColumns : 0;
    const leftPercent = ((leadingColumns + localColumn) / totalColumns) * 100;

    return { rowIndex, leftPercent };
  }

  function karaokeAnchorFromPlaybackIndex(voiceIndex: VoiceIndex, index: number): KaraokeAnchor | null {
    const totalCells = totalPlaybackCells();
    const endIndex = isHorizontalLoopPlaybackActive() ? horizontalLoopDisplayEndIndex(totalCells) : totalCells;
    if (index < 0 || index >= endIndex) return null;

    const cache = playbackKaraokeAnchorCache[voiceIndex];
    if (cache.has(index)) {
      return cache.get(index) ?? null;
    }

    const anchor = resolveKaraokeAnchor(voiceIndex, cellRefFromPlaybackIndex(index, totalCells));
    cache.set(index, anchor);
    return anchor;
  }

  function nextDistinctKaraokeAnchorTransition(
    voiceIndex: VoiceIndex,
    currentIndex: number,
    totalCells: number,
    currentAnchor: KaraokeAnchor | null = null,
  ): KaraokeAnchorTransition | null {
    const resolvedCurrentAnchor = currentAnchor ?? karaokeAnchorFromPlaybackIndex(voiceIndex, currentIndex);
    if (!resolvedCurrentAnchor) return null;

    for (let targetIndex = currentIndex + 1; targetIndex < totalCells; targetIndex += 1) {
      const targetAnchor = karaokeAnchorFromPlaybackIndex(voiceIndex, targetIndex);
      if (!targetAnchor || karaokeAnchorsEqual(resolvedCurrentAnchor, targetAnchor)) continue;

      return {
        anchor: targetAnchor,
        targetIndex,
        durationMs: Math.max(24, Math.floor((targetIndex - currentIndex) * playbackIntervalMs())),
      };
    }

    return null;
  }

  function animateKaraokeBall(
    voiceIndex: VoiceIndex,
    from: KaraokeAnchor,
    to: KaraokeAnchor,
    durationMs: number = playbackIntervalMs(),
  ): void {
    clearKaraokeAnimation(voiceIndex);

    if (karaokeAnchorsEqual(from, to)) {
      setKaraokeBallToAnchor(voiceIndex, to);
      return;
    }

    const motionDurationMs = Math.max(80, Math.floor(durationMs));
    const token = voiceKaraokeAnimationTokens[voiceIndex];
    const runArcSegment = (
      rowIndex: number,
      startLeft: number,
      endLeft: number,
      segmentDurationMs: number,
      arcPhase: 'full' | 'first-half' | 'second-half' = 'full',
      onComplete: (() => void) | null = null,
      arcHeightPx: number = karaokeArcHeightPx,
    ): void => {
      voiceKaraokeBallRowIndexes.splice(voiceIndex, 1, rowIndex);
      applyKaraokeBallElementStyle(voiceIndex, rowIndex, startLeft, voiceKaraokeBallArcOffsetPxs[voiceIndex] ?? 0);

      const segmentStartedAt = performance.now();
      const deltaLeft = endLeft - startLeft;
      const clampedSegmentMs = Math.max(24, Math.floor(segmentDurationMs));

      const step = (now: number): void => {
        if (token !== voiceKaraokeAnimationTokens[voiceIndex]) return;

        const progress = Math.min(1, (now - segmentStartedAt) / clampedSegmentMs);
        const leftPercent = startLeft + deltaLeft * progress;
        let arcOffsetPx = 0;

        if (arcPhase === 'first-half') {
          arcOffsetPx = -arcHeightPx * (2 * progress - progress * progress);
        } else if (arcPhase === 'second-half') {
          arcOffsetPx = -arcHeightPx * (1 - progress * progress);
        } else {
          arcOffsetPx = -4 * arcHeightPx * progress * (1 - progress);
        }

        applyKaraokeBallElementStyle(voiceIndex, rowIndex, leftPercent, arcOffsetPx);

        if (progress >= 1) {
          setKaraokeBallState(voiceIndex, rowIndex, endLeft, arcPhase === 'first-half' ? -arcHeightPx : 0);
          if (onComplete) {
            onComplete();
          } else {
            voiceKaraokeAnimationFrames[voiceIndex] = null;
          }
          return;
        }

        voiceKaraokeAnimationFrames[voiceIndex] = requestAnimationFrame(step);
      };

      voiceKaraokeAnimationFrames[voiceIndex] = requestAnimationFrame(step);
    };

    const runArcTransition = (
      transitionFrom: KaraokeAnchor,
      transitionTo: KaraokeAnchor,
      transitionDurationMs: number,
      arcHeightPx: number,
    ): void => {
      if (transitionFrom.rowIndex === transitionTo.rowIndex) {
        runArcSegment(
          transitionFrom.rowIndex,
          voiceKaraokeBallLeftPercents[voiceIndex],
          transitionTo.leftPercent,
          transitionDurationMs,
          'full',
          null,
          arcHeightPx,
        );
        return;
      }

      if (rowsAreOnSameVisualLine(voiceIndex, transitionFrom.rowIndex, transitionTo.rowIndex)) {
        const targetLeftInSourceFrame = mapAnchorLeftPercentIntoRowFrame(voiceIndex, transitionFrom.rowIndex, transitionTo);
        if (targetLeftInSourceFrame !== null) {
          runArcSegment(transitionFrom.rowIndex, voiceKaraokeBallLeftPercents[voiceIndex], targetLeftInSourceFrame, transitionDurationMs, 'full', () => {
            if (token !== voiceKaraokeAnimationTokens[voiceIndex]) return;
            setKaraokeBallToAnchor(voiceIndex, transitionTo);
            voiceKaraokeAnimationFrames[voiceIndex] = null;
          }, arcHeightPx);
          return;
        }
      }

      const toRowLeftBoundary = karaokeRowLeftBoundaryPercent(transitionTo.rowIndex);
      const outgoingDurationMs = Math.max(20, Math.floor(transitionDurationMs / 2));
      const incomingDurationMs = Math.max(20, transitionDurationMs - outgoingDurationMs);
      runArcSegment(transitionFrom.rowIndex, voiceKaraokeBallLeftPercents[voiceIndex], 100, outgoingDurationMs, 'first-half', () => {
        if (token !== voiceKaraokeAnimationTokens[voiceIndex]) return;
        setKaraokeBallState(voiceIndex, transitionTo.rowIndex, toRowLeftBoundary, -arcHeightPx);
        runArcSegment(transitionTo.rowIndex, toRowLeftBoundary, transitionTo.leftPercent, incomingDurationMs, 'second-half', null, arcHeightPx);
      }, arcHeightPx);
    };

    runArcTransition(from, to, motionDurationMs, karaokeArcHeightPx);
  }

  function animateKaraokeBallVertical(
    voiceIndex: VoiceIndex,
    anchor: KaraokeAnchor,
    durationMs: number = countInBeatIntervalMs(),
    arcHeightPx: number = karaokeArcHeightPx,
  ): void {
    clearKaraokeAnimation(voiceIndex);
    setKaraokeBallState(voiceIndex, anchor.rowIndex, anchor.leftPercent, 0);

    const motionDurationMs = Math.max(80, Math.floor(durationMs));
    const token = voiceKaraokeAnimationTokens[voiceIndex];
    const startedAt = performance.now();

    const step = (now: number): void => {
      if (token !== voiceKaraokeAnimationTokens[voiceIndex]) return;

      const progress = Math.min(1, (now - startedAt) / motionDurationMs);
      const arcOffsetPx = -4 * arcHeightPx * progress * (1 - progress);
      applyKaraokeBallArcOffsetStyle(voiceIndex, arcOffsetPx);

      if (progress >= 1) {
        setKaraokeBallToAnchor(voiceIndex, anchor);
        voiceKaraokeAnimationFrames[voiceIndex] = null;
        return;
      }

      voiceKaraokeAnimationFrames[voiceIndex] = requestAnimationFrame(step);
    };

    voiceKaraokeAnimationFrames[voiceIndex] = requestAnimationFrame(step);
  }

  function animatePinnedKaraokeBallVertical(
    voiceIndex: VoiceIndex,
    currentAnchor: KaraokeAnchor,
    nextAnchor: KaraokeAnchor,
    durationMs: number = playbackIntervalMs(),
    arcHeightPx: number = karaokeArcHeightPx,
    startedAtMs: number = performance.now(),
  ): void {
    clearKaraokeAnimation(voiceIndex);
    setKaraokeBallState(voiceIndex, currentAnchor.rowIndex, currentAnchor.leftPercent, 0);

    const motionDurationMs = Math.max(80, Math.floor(durationMs));
    const token = voiceKaraokeAnimationTokens[voiceIndex];
    const startedAt = startedAtMs;

    const step = (now: number): void => {
      if (token !== voiceKaraokeAnimationTokens[voiceIndex]) return;

      const progress = Math.min(1, (now - startedAt) / motionDurationMs);
      const arcOffsetPx = -4 * arcHeightPx * progress * (1 - progress);
      applyKaraokeBallArcOffsetStyle(voiceIndex, arcOffsetPx);

      if (progress >= 1) {
        setKaraokeBallState(voiceIndex, nextAnchor.rowIndex, nextAnchor.leftPercent, 0);
        voiceKaraokeAnimationFrames[voiceIndex] = null;
        return;
      }

      voiceKaraokeAnimationFrames[voiceIndex] = requestAnimationFrame(step);
    };

    voiceKaraokeAnimationFrames[voiceIndex] = requestAnimationFrame(step);
  }

  function animateHorizontalPlaybackLaneShift(
    voiceIndex: VoiceIndex,
    currentAnchorViewportLeftPx: number,
    targetAnchorViewportLeftPx: number,
    pinnedLeftPx: number,
    durationMs: number = playbackIntervalMs(),
    startedAtMs: number = performance.now(),
  ): void {
    if (trackStyle !== 'horizontal' || voiceCount <= 1) return;

    clearHorizontalPlaybackLaneShiftAnimation(voiceIndex);

    const startShiftPx = voiceHorizontalPlaybackLaneShiftPxs[voiceIndex] ?? 0;
    const normalizedStartShiftPx = startShiftPx + pinnedLeftPx - currentAnchorViewportLeftPx;
    const targetShiftPx = startShiftPx + pinnedLeftPx - targetAnchorViewportLeftPx;
    setHorizontalPlaybackLaneShiftPx(voiceIndex, normalizedStartShiftPx);
    if (Math.abs(targetShiftPx - normalizedStartShiftPx) < 0.25) {
      setHorizontalPlaybackLaneShiftPx(voiceIndex, targetShiftPx);
      return;
    }

    const motionDurationMs = Math.max(24, Math.floor(durationMs));
    const token = voiceHorizontalPlaybackLaneShiftTokens[voiceIndex];

    const step = (now: number): void => {
      if (token !== voiceHorizontalPlaybackLaneShiftTokens[voiceIndex]) return;

      const progress = Math.min(1, (now - startedAtMs) / motionDurationMs);
      setHorizontalPlaybackLaneShiftPx(
        voiceIndex,
        normalizedStartShiftPx + (targetShiftPx - normalizedStartShiftPx) * progress,
      );

      if (progress >= 1) {
        voiceHorizontalPlaybackLaneShiftFrames[voiceIndex] = null;
        return;
      }

      voiceHorizontalPlaybackLaneShiftFrames[voiceIndex] = requestAnimationFrame(step);
    };

    voiceHorizontalPlaybackLaneShiftFrames[voiceIndex] = requestAnimationFrame(step);
  }

  function startKaraokeLeadIn(voiceIndex: VoiceIndex, firstAnchor: KaraokeAnchor): number {
    const leadInMs = Math.max(40, Math.floor(playbackIntervalMs() / 2));

    clearKaraokeAnimation(voiceIndex);
    setKaraokeBallState(voiceIndex, firstAnchor.rowIndex, firstAnchor.leftPercent, -karaokeArcHeightPx);

    const token = voiceKaraokeAnimationTokens[voiceIndex];
    const startedAt = performance.now();

    const step = (now: number): void => {
      if (token !== voiceKaraokeAnimationTokens[voiceIndex]) return;

      const progress = Math.min(1, (now - startedAt) / leadInMs);
      const arcOffsetPx = -karaokeArcHeightPx * (1 - progress * progress);
      applyKaraokeBallArcOffsetStyle(voiceIndex, arcOffsetPx);

      if (progress >= 1) {
        setKaraokeBallToAnchor(voiceIndex, firstAnchor);
        voiceKaraokeAnchors[voiceIndex] = firstAnchor;
        voiceKaraokeAnimationFrames[voiceIndex] = null;
        return;
      }

      voiceKaraokeAnimationFrames[voiceIndex] = requestAnimationFrame(step);
    };

    voiceKaraokeAnimationFrames[voiceIndex] = requestAnimationFrame(step);
    return leadInMs;
  }

  function updateKaraokeAfterPlaybackStep(
    voiceIndex: VoiceIndex,
    currentIndex: number,
    totalCells: number,
    currentCursor: GridCellRef,
    stepStartedAtMs: number,
  ): void {
    const currentAnchor = karaokeAnchorFromPlaybackIndex(voiceIndex, currentIndex);
    if (!currentAnchor) {
      debugPlaybackHighlight('No current karaoke anchor from playback index.', { currentIndex, totalCells });
      clearKaraokeBallDisplay(voiceIndex);
      return;
    }

    if (
      trackStyle === 'horizontal' &&
      horizontalPlaybackHighway.referenceViewportLeftPx !== null &&
      voicePlaybackHighlightAnchors[voiceIndex] &&
      karaokeAnchorsEqual(voicePlaybackHighlightAnchors[voiceIndex]!, currentAnchor)
    ) {
      markPlayedCellsForCursor(voiceIndex, currentCursor);
      voiceKaraokeAnchors[voiceIndex] = currentAnchor;
      return;
    }

    clearKaraokeAnimation(voiceIndex);
    setKaraokeBallToAnchor(voiceIndex, currentAnchor);
    voiceKaraokeAnchors[voiceIndex] = currentAnchor;

    if (trackStyle === 'horizontal') {
      activateHorizontalPlaybackHighway(currentIndex);
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex >= totalCells) {
      markPlayedCellsForCursor(voiceIndex, currentCursor);
      return;
    }

    const nextAnchor = karaokeAnchorFromPlaybackIndex(voiceIndex, nextIndex);
    if (!nextAnchor) {
      debugPlaybackHighlight('No next karaoke anchor from playback index.', { nextIndex, totalCells });
      return;
    }

    if (trackStyle === 'horizontal' && horizontalPlaybackHighway.referenceViewportLeftPx !== null) {
      markPlayedCellsForCursor(voiceIndex, currentCursor);
      const highwayTransition = nextDistinctKaraokeAnchorTransition(voiceIndex, currentIndex, totalCells, currentAnchor);
      if (!highwayTransition) {
        return;
      }

      const pinnedLeftPx = voiceKaraokeBallPinnedLeftPxs[voiceIndex];
      const currentAnchorViewportLeftPx = karaokeAnchorViewportLeftPx(voiceIndex, currentAnchor, 'panel');
      const targetAnchorViewportLeftPx = karaokeAnchorViewportLeftPx(voiceIndex, highwayTransition.anchor, 'panel');
      if (pinnedLeftPx !== null && currentAnchorViewportLeftPx !== null && targetAnchorViewportLeftPx !== null) {
        animateHorizontalPlaybackLaneShift(
          voiceIndex,
          currentAnchorViewportLeftPx,
          targetAnchorViewportLeftPx,
          pinnedLeftPx,
          highwayTransition.durationMs,
          stepStartedAtMs,
        );
      }
      animatePinnedKaraokeBallVertical(
        voiceIndex,
        currentAnchor,
        highwayTransition.anchor,
        highwayTransition.durationMs,
        karaokeArcHeightPx,
        stepStartedAtMs,
      );
      voiceKaraokeAnchors[voiceIndex] = highwayTransition.anchor;
      return;
    }

    if (karaokeAnchorsEqual(currentAnchor, nextAnchor)) {
      debugPlaybackHighlight('Karaoke anchors equal; no arc animation needed.', { currentAnchor, nextAnchor });
      return;
    }

    markPlayedCellsForCursor(voiceIndex, currentCursor);
    animateKaraokeBall(voiceIndex, currentAnchor, nextAnchor, playbackIntervalMs());
    voiceKaraokeAnchors[voiceIndex] = nextAnchor;
  }

  function resolvePlaybackHighlightForCursor(voiceIndex: VoiceIndex, cursor: GridCellRef): Omit<PlaybackHighlight, 'pulseClass'> | null {
    const isPickupZone = cursor.zone === 'pickup';
    const rowIndex = cursor.rowIndex;
    const sourceRowIndex = sourceRowIndexForCursor(cursor);
    const rowCells = isPickupZone
      ? pickupRowForVoice(voiceIndex).cells
      : rowsForVoice(voiceIndex)[sourceRowIndex]?.cells;
    if (!rowCells) return null;

    const maxCells = isPickupZone ? pickupMicrobeatCount() : GRID_COLUMNS;
    if (cursor.cellIndex < 0 || cursor.cellIndex >= maxCells) return null;

    const macrobeatStart = cursor.cellIndex - (cursor.cellIndex % MICROBEATS_PER_BEAT);
    const useMacrobeatSpan = shouldUseMacrobeatMidpoint(rowCells, maxCells, cursor.cellIndex);
    if (useMacrobeatSpan && macrobeatStart + 1 < maxCells) {
      return {
        zone: cursor.zone,
        rowIndex,
        startCellIndex: macrobeatStart,
        span: 2,
      };
    }

    return {
      zone: cursor.zone,
      rowIndex,
      startCellIndex: cursor.cellIndex,
      span: 1,
    };
  }

  function updatePlaybackHighlight(voiceIndex: VoiceIndex, cursor: GridCellRef): void {
    const anchor = resolveKaraokeAnchor(voiceIndex, cursor);
    if (!anchor) {
      debugPlaybackHighlight('Clearing highlight: no resolved anchor for cursor.', { cursor });
      clearPlaybackHighlightClassesForVoice(voiceIndex);
      voicePlaybackHighlightAnchors.splice(voiceIndex, 1, null);
      return;
    }

    if (voicePlaybackHighlightAnchors[voiceIndex] && karaokeAnchorsEqual(voicePlaybackHighlightAnchors[voiceIndex]!, anchor)) {
      debugPlaybackHighlight('Skipping highlight update: anchor unchanged.', { cursor, anchor });
      return;
    }

    const nextHighlight = resolvePlaybackHighlightForCursor(voiceIndex, cursor);
    if (!nextHighlight) {
      debugPlaybackHighlight('Clearing highlight: failed to resolve highlight span.', { cursor, anchor });
      clearPlaybackHighlightClassesForVoice(voiceIndex);
      voicePlaybackHighlightAnchors.splice(voiceIndex, 1, null);
      return;
    }

    voicePlaybackPulseFlips[voiceIndex] = !voicePlaybackPulseFlips[voiceIndex];
    const nextPlaybackHighlight: PlaybackHighlight = {
      ...nextHighlight,
      pulseClass: voicePlaybackPulseFlips[voiceIndex] ? 'playback-pulse-a' : 'playback-pulse-b',
    };
    applyPlaybackHighlightClasses(voiceIndex, nextPlaybackHighlight);
    voicePlaybackHighlightAnchors.splice(voiceIndex, 1, anchor);
    debugPlaybackHighlight('Highlight updated.', { cursor, anchor, highlight: nextPlaybackHighlight });
  }

  function clearPlaybackTimer(): void {
    playbackVisualLoopToken += 1;
    if (playbackFrame !== null) {
      cancelAnimationFrame(playbackFrame);
      playbackFrame = null;
    }
  }

  function clearPendingPlaybackTimeouts(): void {
    for (const timeoutId of pendingPlaybackTimeouts) {
      clearTimeout(timeoutId);
    }
    pendingPlaybackTimeouts.clear();
  }

  function queuePlaybackTimeout(callback: () => void, delayMs: number): void {
    const timeoutId = setTimeout(() => {
      pendingPlaybackTimeouts.delete(timeoutId);
      callback();
    }, delayMs);

    pendingPlaybackTimeouts.add(timeoutId);
  }

  function schedulePlaybackAudioRun(
    startIndex: number,
    traversalEndIndex: number,
    timelineOffsetMs = 0,
    includeCountIn = false,
    countInStartupDelayMs = 0,
  ): void {
    const events = [
      ...(includeCountIn ? buildCountInAudioEvents(countInStartupDelayMs) : []),
      ...buildPlaybackAudioEvents(startIndex, traversalEndIndex, timelineOffsetMs),
    ];
    audio.schedulePlaybackAudio(events, AUDIO_SCHEDULE_START_DELAY_MS / 1000);
  }

  function startPlaybackVisualLoop(startIndex: number): void {
    clearPlaybackTimer();
    const loopToken = playbackVisualLoopToken;
    playbackVisualStartedAtMs = performance.now();
    playbackVisualStartIndex = startIndex;
    playbackVisualLastRenderedIndex = startIndex - 1;

    const step = (now: number): void => {
      if (!isPlaying || loopToken !== playbackVisualLoopToken) {
        playbackFrame = null;
        return;
      }

      const intervalMs = playbackIntervalMs();
      const elapsedSteps = Math.max(0, Math.floor((now - playbackVisualStartedAtMs) / intervalMs));
      const targetIndex = playbackVisualStartIndex + elapsedSteps;
      let renderedSteps = 0;

      while (isPlaying && loopToken === playbackVisualLoopToken && playbackVisualLastRenderedIndex < targetIndex && renderedSteps < 4) {
        playbackStep();
        playbackVisualLastRenderedIndex += 1;
        renderedSteps += 1;
      }

      if (!isPlaying || loopToken !== playbackVisualLoopToken) {
        playbackFrame = null;
        return;
      }

      playbackFrame = requestAnimationFrame(step);
    };

    playbackFrame = requestAnimationFrame(step);
  }

  function playbackIntervalMs(): number {
    return Math.max(70, Math.round(60_000 / state.microbeatTempo));
  }

  function countInBeatIntervalMs(): number {
    return Math.max(140, Math.round(playbackIntervalMs() * MICROBEATS_PER_BEAT));
  }

  function playbackPulseDurationMs(): number {
    return Math.max(220, Math.min(760, Math.round(playbackIntervalMs() * 1.15)));
  }

  function rootInlineStyle(): string {
    return [
      `--playback-pulse-duration:${playbackPulseDurationMs()}ms`,
      `--adaptive-controls-columns:${adaptiveLayout.controlsColumns}`,
      `--adaptive-controls-scale:${adaptiveLayout.controlsScale}`,
      `--adaptive-controls-gap-px:${adaptiveLayout.controlsGapPx}`,
      `--adaptive-controls-panel-padding-px:${adaptiveLayout.controlsPanelPaddingPx}`,
      `--adaptive-group-min-width-px:${adaptiveLayout.groupMinWidthPx}`,
      `--adaptive-bank-scale:${adaptiveLayout.bankScale}`,
      `--adaptive-cell-height-ratio:${adaptiveLayout.cellHeightRatio}`,
      `--adaptive-rows-columns:${adaptiveLayout.rowsColumns}`,
      `--adaptive-rows-gap-px:${adaptiveLayout.rowsGapPx}`,
    ].join(';');
  }

  function totalPlaybackCells(): number {
    return pickupMicrobeatCount() + sharedRowCount() * GRID_COLUMNS;
  }

  function absolutePlaybackCellIndex(zone: GridZone, rowIndex: number, cellIndex: number): number | null {
    const pickupCells = pickupMicrobeatCount();
    const visualRowIndex = zone === 'pickup' ? Math.max(0, rowIndex) : rowIndex;
    const visualRowStride = pickupCells + GRID_COLUMNS;

    if (zone === 'pickup') {
      if (cellIndex < 0 || cellIndex >= pickupCells) return null;
      return visualRowIndex * visualRowStride + cellIndex;
    }

    const maxRowIndex = isHorizontalLoopPlaybackActive()
      ? HORIZONTAL_LOOP_RENDER_CYCLES * horizontalLoopSegmentRowCount()
      : sharedRowCount();
    if (rowIndex < 0 || rowIndex >= maxRowIndex) return null;
    if (cellIndex < 0 || cellIndex >= GRID_COLUMNS) return null;
    return rowIndex * visualRowStride + pickupCells + cellIndex;
  }

  function playbackStartIndexForMeasure(zone: GridZone, rowIndex: number): number | null {
    if (zone === 'pickup') {
      return pickupMicrobeatCount() > 0 ? 0 : null;
    }

    if (rowIndex < 0 || rowIndex >= sharedRowCount()) return null;
    return pickupMicrobeatCount() + rowIndex * GRID_COLUMNS;
  }

  function selectPlaybackStartMeasure(zone: GridZone, rowIndex: number): void {
    const startIndex = playbackStartIndexForMeasure(zone, rowIndex);
    if (startIndex === null) return;

    playbackStartSelection = { zone, rowIndex, startIndex };
    playbackPaused = false;
    playbackIndex = startIndex;

    if (trackStyle === 'horizontal') {
      queueHorizontalPlaybackScroll(startIndex, 'smooth');
    }
  }

  function playbackResetIndex(): number {
    const totalCells = totalPlaybackCells();
    if (totalCells <= 0) return 0;

    const startIndex = playbackStartSelection?.startIndex ?? 0;
    return Math.max(0, Math.min(totalCells - 1, startIndex));
  }

  function isPlaybackStartSelected(zone: GridZone, rowIndex: number): boolean {
    return playbackStartSelection?.zone === zone && playbackStartSelection?.rowIndex === rowIndex;
  }

  function markPlayedCellsForCursor(voiceIndex: VoiceIndex, cursor: GridCellRef): void {
    const highlight = resolvePlaybackHighlightForCursor(voiceIndex, cursor);
    if (!highlight) return;

    for (let offset = 0; offset < highlight.span; offset += 1) {
      const cellIndex = highlight.startCellIndex + offset;
      const key = playbackCellKey(voiceIndex, highlight.zone, highlight.rowIndex, cellIndex);
      voicePlayedCellKeys[voiceIndex].add(key);
      setCellNotesMuted(getTrackCellElementFromKey(key), true);
    }

    debugPlayedNoteMuting('Marked cells as played.', {
      voice: voiceLabel(voiceIndex),
      cursor,
      highlight,
      playedCount: voicePlayedCellKeys[voiceIndex].size,
    });
  }

  function positiveModulo(value: number, modulus: number): number {
    if (modulus <= 0) return 0;
    return ((value % modulus) + modulus) % modulus;
  }

  function horizontalLoopSegmentLength(totalCells: number = totalPlaybackCells()): number {
    return Math.max(1, totalCells - horizontalLoopSegmentStartIndex());
  }

  function horizontalLoopDisplayIndexForLogicalIndex(logicalIndex: number, cycle = HORIZONTAL_LOOP_ANCHOR_CYCLE): number {
    const totalCells = totalPlaybackCells();
    const startIndex = horizontalLoopSegmentStartIndex();
    const segmentLength = horizontalLoopSegmentLength(totalCells);
    const offset = positiveModulo(Math.max(startIndex, logicalIndex) - startIndex, segmentLength);
    return startIndex + cycle * segmentLength + offset;
  }

  function horizontalLoopDisplayEndIndex(totalCells: number = totalPlaybackCells()): number {
    return horizontalLoopSegmentStartIndex() + HORIZONTAL_LOOP_RENDER_CYCLES * horizontalLoopSegmentLength(totalCells);
  }

  function horizontalLoopDisplayCycleForIndex(index: number, totalCells: number = totalPlaybackCells()): number {
    const startIndex = horizontalLoopSegmentStartIndex();
    const segmentLength = horizontalLoopSegmentLength(totalCells);
    return Math.max(0, Math.floor((index - startIndex) / segmentLength));
  }

  function logicalPlaybackIndexFromDisplayIndex(index: number, totalCells: number = totalPlaybackCells()): number {
    if (shouldUseHorizontalLoopIndexing()) {
      const startIndex = horizontalLoopSegmentStartIndex();
      const segmentLength = horizontalLoopSegmentLength(totalCells);
      return startIndex + positiveModulo(index - startIndex, segmentLength);
    }

    return positiveModulo(index, totalCells);
  }

  function cellRefFromIndex(index: number): GridCellRef {
    const pickupCells = pickupMicrobeatCount();
    if (index < pickupCells) {
      return {
        zone: 'pickup',
        rowIndex: -1,
        cellIndex: index,
      };
    }

    const mainIndex = index - pickupCells;
    return {
      zone: 'main',
      rowIndex: Math.floor(mainIndex / GRID_COLUMNS),
      cellIndex: mainIndex % GRID_COLUMNS,
    };
  }

  function cellRefFromPlaybackIndex(index: number, totalCells: number = totalPlaybackCells()): GridCellRef {
    if (!isHorizontalLoopPlaybackActive()) {
      const ref = cellRefFromIndex(logicalPlaybackIndexFromDisplayIndex(index, totalCells));
      return ref.zone === 'pickup'
        ? { ...ref, rowIndex: 0, sourceRowIndex: 0 }
        : ref;
    }

    const logicalIndex = logicalPlaybackIndexFromDisplayIndex(index, totalCells);
    const logicalRef = cellRefFromIndex(logicalIndex);
    const loopCycle = horizontalLoopDisplayCycleForIndex(index, totalCells);
    const sourceStartRow = horizontalLoopSegmentSourceStartRow();
    const segmentRowCount = horizontalLoopSegmentRowCount();

    if (logicalRef.zone === 'pickup') {
      return {
        ...logicalRef,
        rowIndex: loopCycle * segmentRowCount,
        sourceRowIndex: 0,
      };
    }

    return {
      ...logicalRef,
      rowIndex: loopCycle * segmentRowCount + Math.max(0, logicalRef.rowIndex - sourceStartRow),
      sourceRowIndex: logicalRef.rowIndex,
    };
  }

  function cellForPlaybackVoice(voiceIndex: VoiceIndex, cellRef: GridCellRef): GridCellContent | null {
    const sourceRowIndex = sourceRowIndexForCursor(cellRef);
    return cellRef.zone === 'pickup'
      ? pickupRowForVoice(voiceIndex).cells[cellRef.cellIndex] ?? null
      : rowsForVoice(voiceIndex)[sourceRowIndex]?.cells[cellRef.cellIndex] ?? null;
  }

  function scheduledAudioEventForPlacedNote(note: PlacedNote, timeSeconds: number): ScheduledPlaybackAudioEvent | null {
    const sampleId = noteSampleId(note.noteId);
    if (sampleId) {
      return { type: 'sample', timeSeconds, sampleId };
    }

    const pitch = getPitchNameForDisplay(model.getFullRootNote(), note.interval);
    return pitch ? { type: 'note', timeSeconds, pitch } : null;
  }

  function appendScheduledCellAudioEvents(
    events: ScheduledPlaybackAudioEvent[],
    voiceIndex: VoiceIndex,
    cellRef: GridCellRef,
    timeSeconds: number,
    microbeatSeconds: number,
  ): void {
    const cell = cellForPlaybackVoice(voiceIndex, cellRef);
    if (!cell || !cellHasAnyNotes(cell)) return;

    if (cell.shape === 'oval') {
      const event = scheduledAudioEventForPlacedNote(cell.notes[0], timeSeconds);
      if (event) events.push(event);
      return;
    }

    if (cell.shape === 'circle') {
      if (cell.role === 'continuation') return;

      const event = scheduledAudioEventForPlacedNote(cell.notes[0], timeSeconds);
      if (event) events.push(event);
      return;
    }

    const [leftSixteenth, rightSixteenth] = cell.notes;
    if (leftSixteenth) {
      const event = scheduledAudioEventForPlacedNote(leftSixteenth, timeSeconds);
      if (event) events.push(event);
    }

    if (rightSixteenth) {
      const event = scheduledAudioEventForPlacedNote(rightSixteenth, timeSeconds + microbeatSeconds / 2);
      if (event) events.push(event);
    }
  }

  function buildPlaybackAudioEvents(
    startIndex: number,
    traversalEndIndex: number,
    timelineOffsetMs: number,
  ): ScheduledPlaybackAudioEvent[] {
    const events: ScheduledPlaybackAudioEvent[] = [];
    const intervalSeconds = playbackIntervalMs() / 1000;
    const timelineOffsetSeconds = timelineOffsetMs / 1000;

    for (let index = startIndex; index < traversalEndIndex; index += 1) {
      const cellRef = cellRefFromPlaybackIndex(index);
      const timeSeconds = timelineOffsetSeconds + (index - startIndex) * intervalSeconds;

      if (macrobeatMetronomeEnabled && cellRef.cellIndex % MICROBEATS_PER_BEAT === 0) {
        events.push({ type: 'macrobeatCue', timeSeconds });
      }

      for (const voiceIndex of visibleVoiceIndices()) {
        if (!isVoiceAudible(voiceIndex)) continue;
        appendScheduledCellAudioEvents(events, voiceIndex, cellRef, timeSeconds, intervalSeconds);
      }
    }

    return events;
  }

  function buildCountInAudioEvents(startupDelayMs: number): ScheduledPlaybackAudioEvent[] {
    const beatMs = countInBeatIntervalMs();
    return COUNT_IN_NUMBERS.map((_, index) => ({
      type: 'countInCue' as const,
      timeSeconds: (startupDelayMs + beatMs * index) / 1000,
      accented: index === ACCENTED_COUNT_IN_INDEX,
    }));
  }

  function playPlacedNote(note: PlacedNote): void {
    if (!audioReady) return;

    const sampleId = noteSampleId(note.noteId);
    if (sampleId) {
      audio.playSampleNow(sampleId);
      return;
    }

    const pitch = getPitchNameForDisplay(model.getFullRootNote(), note.interval);
    if (!pitch) return;

    audio.playNoteNow(pitch);
  }

  function recenterHorizontalLoopPlaybackIfNeeded(totalCells: number): void {
    if (!isHorizontalLoopPlaybackActive()) return;

    const segmentLength = horizontalLoopSegmentLength(totalCells);
    const currentCycle = horizontalLoopDisplayCycleForIndex(playbackIndex, totalCells);
    if (currentCycle < HORIZONTAL_LOOP_RECENTER_CYCLE) return;

    const shiftCycles = currentCycle - HORIZONTAL_LOOP_ANCHOR_CYCLE;
    if (shiftCycles <= 0) return;

    const container = canvasScrollShellElement;
    if (!container) return;

    const preferredVoiceIndex = horizontalPlaybackHighway.pinnedVoiceIndex ?? resolvePlaybackScrollVoiceIndex();
    const beforeAnchor = karaokeAnchorFromPlaybackIndex(preferredVoiceIndex, playbackIndex);
    const beforeContentLeft = beforeAnchor ? karaokeAnchorContentLeftPx(preferredVoiceIndex, beforeAnchor) : null;
    const nextPlaybackIndex = playbackIndex - shiftCycles * segmentLength;
    const rowShift = shiftCycles * horizontalLoopSegmentRowCount();

    playbackIndex = nextPlaybackIndex;
    for (const voiceIndex of VOICE_INDEXES) {
      if (voiceKaraokeBallRowIndexes[voiceIndex] !== null) {
        voiceKaraokeBallRowIndexes.splice(voiceIndex, 1, Math.max(0, voiceKaraokeBallRowIndexes[voiceIndex]! - rowShift));
        applyKaraokeBallElementStyle(voiceIndex);
      }

      if (voiceKaraokeAnchors[voiceIndex]) {
        voiceKaraokeAnchors[voiceIndex] = {
          ...voiceKaraokeAnchors[voiceIndex]!,
          rowIndex: Math.max(0, voiceKaraokeAnchors[voiceIndex]!.rowIndex - rowShift),
        };
      }

      if (voicePlaybackHighlightAnchors[voiceIndex]) {
        voicePlaybackHighlightAnchors.splice(voiceIndex, 1, {
          ...voicePlaybackHighlightAnchors[voiceIndex]!,
          rowIndex: Math.max(0, voicePlaybackHighlightAnchors[voiceIndex]!.rowIndex - rowShift),
        });
      }
    }

    clearPlaybackDomClasses();
    clearPlayedNoteMuteClasses();

    const afterAnchor = karaokeAnchorFromPlaybackIndex(preferredVoiceIndex, playbackIndex);
    const afterContentLeft = afterAnchor ? karaokeAnchorContentLeftPx(preferredVoiceIndex, afterAnchor) : null;

    if (beforeContentLeft !== null && afterContentLeft !== null) {
      clearHorizontalPlaybackScrollAnimation();
      setHorizontalPlaybackScrollLeft(effectiveHorizontalPlaybackScrollLeft() + afterContentLeft - beforeContentLeft);
    }

    invalidateCanvasLayout();
  }

  function playbackStep(): void {
    const totalCells = totalPlaybackCells();
    if (totalCells <= 0) {
      debugPlaybackHighlight('Stopping playback: no cells available.');
      stopPlayback();
      return;
    }

    const horizontalLoopActive = isHorizontalLoopPlaybackActive();
    if (horizontalLoopActive && playbackIndex < horizontalLoopSegmentStartIndex()) {
      playbackIndex = horizontalLoopDisplayIndexForLogicalIndex(playbackIndex);
    }

    const currentIndex = horizontalLoopActive ? playbackIndex : positiveModulo(playbackIndex, totalCells);
    const traversalEndIndex = horizontalLoopActive ? horizontalLoopDisplayEndIndex(totalCells) : totalCells;
    const cursor = cellRefFromPlaybackIndex(currentIndex, totalCells);
    const stepStartedAtMs = performance.now();
    debugPlaybackHighlight('Playback step.', { currentIndex, totalCells, cursor });

    if (trackStyle === 'horizontal' && horizontalPlaybackHighway.activationIndex === currentIndex) {
      activateHorizontalPlaybackHighway(currentIndex);
    }

    for (const voiceIndex of visibleVoiceIndices()) {
      applyPlaybackCursorClass(voiceIndex, cursor);
      updateKaraokeAfterPlaybackStep(voiceIndex, currentIndex, traversalEndIndex, cursor, stepStartedAtMs);
      updatePlaybackHighlight(voiceIndex, cursor);
    }
    queuePlaybackScrollForCurrentStep(currentIndex, traversalEndIndex, stepStartedAtMs);
    if (PLAYED_NOTE_MUTING_DEBUG && typeof window !== 'undefined' && typeof document !== 'undefined') {
      requestAnimationFrame(() => {
        debugPlayedNoteMuting('DOM muted-note classes.', {
          playedCellCount: visibleVoiceIndices().reduce<number>((sum, voiceIndex) => sum + voicePlayedCellKeys[voiceIndex].size, 0),
          mutedNoteCount: document.querySelectorAll('.placed-note.played-note-muted').length,
        });
      });
    }

    playbackIndex = currentIndex + 1;
    if (horizontalLoopActive) {
      recenterHorizontalLoopPlaybackIfNeeded(totalCells);
      return;
    }

    if (playbackIndex >= totalCells) {
      clearPlaybackTimer();
      const finalCellDurationMs = playbackIntervalMs();

      if (isLooping) {
        queuePlaybackTimeout(() => {
          clearPlaybackDomClasses();
          clearPlayedNoteMuteClasses();
          playbackIndex = playbackResetIndex();
          restartPlaybackTimer();
        }, finalCellDurationMs);
      } else {
        queuePlaybackTimeout(() => {
          stopPlayback();
        }, finalCellDurationMs);
      }
    }
  }

  function restartPlaybackTimer(): void {
    if (!isPlaying) return;

    clearPlaybackTimer();
    clearPendingPlaybackTimeouts();
    clearPlaybackKaraokeAnchorCache();
    rebuildPlaybackGeometryCache();
    applyKaraokeBallElementStyles();
    const totalCells = totalPlaybackCells();
    const currentIndex = isHorizontalLoopPlaybackActive() ? playbackIndex : positiveModulo(playbackIndex, totalCells);
    const traversalEndIndex = isHorizontalLoopPlaybackActive() ? horizontalLoopDisplayEndIndex(totalCells) : totalCells;
    if (currentIndex === playbackResetIndex() || isHorizontalLoopPlaybackActive()) {
      prepareHorizontalPlaybackHighway(currentIndex, traversalEndIndex);
      queueHorizontalPlaybackScroll(currentIndex, 'auto');
    }
    schedulePlaybackAudioRun(currentIndex, traversalEndIndex);
    startPlaybackVisualLoop(currentIndex);
  }

  function clearCountInDisplay(): void {
    countInDisplayNumber = null;
  }

  function triggerCountInBeat(
    firstAnchors: Map<VoiceIndex, KaraokeAnchor>,
    index: number,
    beatMs: number,
    scheduledDelayMs: number | null = null,
    actualDelayMs: number | null = null,
    playAudio = true,
  ): void {
    countInDisplayNumber = COUNT_IN_NUMBERS[index];

    const accented = index === ACCENTED_COUNT_IN_INDEX;
    const played = playAudio ? audio.playCountInCueNow(accented) : true;
    debugPlaybackStartup('Count-in beat fired.', {
      count: COUNT_IN_NUMBERS[index],
      accented,
      beatMs,
      played,
      scheduledDelayMs,
      actualDelayMs,
      driftMs:
        scheduledDelayMs !== null && actualDelayMs !== null
          ? actualDelayMs - scheduledDelayMs
          : null,
    });

    for (const [voiceIndex, anchor] of firstAnchors) {
      voiceKaraokeAnchors[voiceIndex] = anchor;

      if (accented) {
        animateKaraokeBallVertical(voiceIndex, anchor, beatMs);
      } else {
        clearKaraokeAnimation(voiceIndex);
        setKaraokeBallToAnchor(voiceIndex, anchor);
      }
    }
  }

  function startCountIn(firstAnchors: Map<VoiceIndex, KaraokeAnchor>, startupDelayMs = 0, playAudio = true): number {
    const beatMs = countInBeatIntervalMs();
    const sequenceStartedAt = performance.now();

    for (const [voiceIndex, anchor] of firstAnchors) {
      clearKaraokeAnimation(voiceIndex);
      setKaraokeBallToAnchor(voiceIndex, anchor);
      voiceKaraokeAnchors[voiceIndex] = anchor;
    }

    for (let index = 0; index < COUNT_IN_NUMBERS.length; index += 1) {
      const scheduledDelayMs = startupDelayMs + beatMs * index;
      queuePlaybackTimeout(() => {
        if (!isPlaying) return;
        triggerCountInBeat(
          firstAnchors,
          index,
          beatMs,
          scheduledDelayMs,
          Math.round(performance.now() - sequenceStartedAt),
          playAudio,
        );
      }, scheduledDelayMs);
    }

    return startupDelayMs + beatMs * COUNT_IN_NUMBERS.length;
  }

  function holdKaraokeAtFirstAnchors(firstAnchors: Map<VoiceIndex, KaraokeAnchor>): void {
    for (const [voiceIndex, anchor] of firstAnchors) {
      clearKaraokeAnimation(voiceIndex);
      setKaraokeBallToAnchor(voiceIndex, anchor);
      voiceKaraokeAnchors[voiceIndex] = anchor;
    }
  }

  function startKaraokeLeadInWithDelay(firstAnchors: Map<VoiceIndex, KaraokeAnchor>, startupDelayMs = 0): number {
    if (startupDelayMs <= 0) {
      for (const [voiceIndex, anchor] of firstAnchors) {
        startKaraokeLeadIn(voiceIndex, anchor);
      }
      return Math.max(40, Math.floor(playbackIntervalMs() / 2));
    }

    const leadInMs = Math.max(40, Math.floor(playbackIntervalMs() / 2));
    for (const [voiceIndex, anchor] of firstAnchors) {
      clearKaraokeAnimation(voiceIndex);
      setKaraokeBallToAnchor(voiceIndex, anchor);
      voiceKaraokeAnchors[voiceIndex] = anchor;
    }
    queuePlaybackTimeout(() => {
      if (!isPlaying) return;
      for (const [voiceIndex, anchor] of firstAnchors) {
        startKaraokeLeadIn(voiceIndex, anchor);
      }
    }, startupDelayMs);
    return startupDelayMs + leadInMs;
  }

  async function startPlayback(readiness: AudioReadinessResult): Promise<void> {
    if (isPlaying) return;

    playbackStartToken += 1;
    const startToken = playbackStartToken;
    debugPlaybackHighlight('Starting playback.', { playbackIndex, totalCells: totalPlaybackCells() });
    const resumingPlayback = playbackPaused;
    volumePopupOpen = false;
    audioSamplesPopupOpen = false;
    clearTapPlacementSelection();
    clearPlaybackTimer();
    clearPendingPlaybackTimeouts();
    clearPlaybackDomClasses();
    clearPlayedNoteMuteClasses();
    for (const voiceIndex of VOICE_INDEXES) {
      clearKaraokeAnimation(voiceIndex);
    }
    clearCountInDisplay();

    const totalCells = totalPlaybackCells();
    if (totalCells <= 0) {
      stopPlayback();
      return;
    }

    if (trackStyle === 'horizontal' && isLooping) {
      playbackIndex = horizontalLoopDisplayIndexForLogicalIndex(
        logicalPlaybackIndexFromDisplayIndex(playbackIndex, totalCells),
      );
    }

    setPlaybackUiState(true);
    playbackPaused = false;
    await tick();
    clearPlaybackKaraokeAnchorCache();
    rebuildPlaybackGeometryCache();

    if (!isPlaying || playbackStartToken !== startToken) return;

    const layoutTotalCells = totalPlaybackCells();
    if (layoutTotalCells <= 0) {
      stopPlayback();
      return;
    }

    const currentIndex = isHorizontalLoopPlaybackActive() ? playbackIndex : positiveModulo(playbackIndex, layoutTotalCells);
    const traversalEndIndex = isHorizontalLoopPlaybackActive() ? horizontalLoopDisplayEndIndex(layoutTotalCells) : layoutTotalCells;
    prepareHorizontalPlaybackHighway(currentIndex, traversalEndIndex);
    queueHorizontalPlaybackScroll(currentIndex, 'auto');

    const firstAnchors = new Map<VoiceIndex, KaraokeAnchor>();
    for (const voiceIndex of visibleVoiceIndices()) {
      const firstAnchor = karaokeAnchorFromPlaybackIndex(voiceIndex, currentIndex);
      if (firstAnchor) {
        firstAnchors.set(voiceIndex, firstAnchor);
      }
    }
    const shouldRunCountIn = countInEnabled && !resumingPlayback;
    const startupDelayMs = readiness.stabilizationDelayMs;
    const shouldUseHorizontalPlaybackHighway = trackStyle === 'horizontal' && firstAnchors.size > 0;
    debugPlaybackStartup('Playback requested.', {
      playbackIndex,
      shouldRunCountIn,
      resumedAudioContext: readiness.resumedAudioContext,
      stabilizationDelayMs: startupDelayMs,
      startElapsedMs: readiness.startElapsedMs,
    });
    const leadInMs = firstAnchors.size > 0
      ? shouldRunCountIn
        ? startCountIn(firstAnchors, startupDelayMs, false)
        : shouldUseHorizontalPlaybackHighway
          ? (holdKaraokeAtFirstAnchors(firstAnchors), startupDelayMs)
          : startKaraokeLeadInWithDelay(firstAnchors, startupDelayMs)
      : startupDelayMs;
    schedulePlaybackAudioRun(currentIndex, traversalEndIndex, leadInMs, shouldRunCountIn, startupDelayMs);
    applyKaraokeBallElementStyles();
    if (firstAnchors.size === 0) {
      for (const voiceIndex of visibleVoiceIndices()) {
        clearKaraokeBallDisplay(voiceIndex);
      }
    }

    const playbackRequestedAt = performance.now();
    queuePlaybackTimeout(() => {
      if (!isPlaying || playbackStartToken !== startToken) return;
      debugPlaybackStartup('Playback lead-in completed.', {
        leadInMs,
        actualDelayMs: Math.round(performance.now() - playbackRequestedAt),
      });
      clearCountInDisplay();
      startPlaybackVisualLoop(currentIndex);
    }, leadInMs);
  }

  function pausePlayback(): void {
    debugPlaybackHighlight('Pausing playback.', { playbackIndex });
    const pausedLogicalIndex = shouldUseHorizontalLoopIndexing()
      ? logicalPlaybackIndexFromDisplayIndex(playbackIndex)
      : playbackIndex;
    setPlaybackUiState(false);
    playbackStartToken += 1;
    playbackPaused = true;
    playbackIndex = pausedLogicalIndex;
    clearPlaybackTimer();
    clearPendingPlaybackTimeouts();
    audio.stopScheduledPlaybackAudio();
    resetHorizontalPlaybackHighway(true);
    playbackGeometryCache = null;
    clearPlaybackDomClasses();
    clearPlayedNoteMuteClasses();
    for (const voiceIndex of VOICE_INDEXES) {
      clearKaraokeAnimation(voiceIndex);
    }
    clearCountInDisplay();
  }

  function stopPlayback(): void {
    debugPlaybackHighlight('Stopping playback.', { playbackIndex });
    setPlaybackUiState(false);
    playbackStartToken += 1;
    playbackPaused = false;
    clearPlaybackTimer();
    clearPendingPlaybackTimeouts();
    audio.stopScheduledPlaybackAudio();
    resetHorizontalPlaybackHighway(true);
    playbackGeometryCache = null;
    clearPlaybackDomClasses();
    clearPlayedNoteMuteClasses();
    for (const voiceIndex of VOICE_INDEXES) {
      clearKaraokeBallDisplay(voiceIndex);
    }
    clearCountInDisplay();
    playbackIndex = playbackResetIndex();
  }

  async function togglePlayback(): Promise<void> {
    if (isPlaying) {
      pausePlayback();
      return;
    }

    clearTapPlacementSelection();
    const readiness = await ensureAudioReady();
    if (!readiness.ready) return;
    await preloadConfiguredPercussionSamples();

    void startPlayback(readiness);
  }

  async function playFromStart(): Promise<void> {
    clearTapPlacementSelection();
    const readiness = await ensureAudioReady();
    if (!readiness.ready) return;
    await preloadConfiguredPercussionSamples();

    if (isPlaying) {
      pausePlayback();
    }

    playbackPaused = false;
    playbackIndex = 0;
    void startPlayback(readiness);
  }

  function toggleCountIn(): void {
    countInEnabled = !countInEnabled;
  }

  function toggleMacrobeatMetronome(): void {
    macrobeatMetronomeEnabled = !macrobeatMetronomeEnabled;
  }

  function toggleLoop(): void {
    const nextLooping = !isLooping;
    const logicalIndex = totalPlaybackCells() > 0
      ? logicalPlaybackIndexFromDisplayIndex(playbackIndex)
      : 0;

    isLooping = nextLooping;

    if (trackStyle === 'horizontal' && isPlaying && totalPlaybackCells() > 0) {
      playbackIndex = nextLooping ? horizontalLoopDisplayIndexForLogicalIndex(logicalIndex) : logicalIndex;
      resetHorizontalPlaybackHighway(true);
      void tick().then(() => {
        if (!isPlaying || trackStyle !== 'horizontal') return;
        const totalCells = totalPlaybackCells();
        const currentIndex = isHorizontalLoopPlaybackActive() ? playbackIndex : positiveModulo(playbackIndex, totalCells);
        const traversalEndIndex = isHorizontalLoopPlaybackActive() ? horizontalLoopDisplayEndIndex(totalCells) : totalCells;
        prepareHorizontalPlaybackHighway(currentIndex, traversalEndIndex);
        queueHorizontalPlaybackScroll(currentIndex, 'auto');
      });
    }
  }

  function isDropTarget(target: GridDropTarget | null, voiceIndex: VoiceIndex, rowIndex: number, cellIndex: number): boolean {
    return target?.voiceIndex === voiceIndex && target?.zone === 'main' && target?.rowIndex === rowIndex && target?.cellIndex === cellIndex;
  }

  function isPickupDropTarget(target: GridDropTarget | null, voiceIndex: VoiceIndex, cellIndex: number): boolean {
    return target?.voiceIndex === voiceIndex && target?.zone === 'pickup' && target?.cellIndex === cellIndex;
  }

  function isSixteenthSlotDropTarget(
    payload: DragPayload | null,
    target: GridDropTarget | null,
    voiceIndex: VoiceIndex,
    zone: GridZone,
    rowIndex: number,
    cellIndex: number,
    slotIndex: number,
  ): boolean {
    if (!payload || payload.note.shape !== 'diamond') return false;
    if (slotIndex !== 0 && slotIndex !== 1) return false;

    return (
      target?.voiceIndex === voiceIndex &&
      target?.zone === zone &&
      target?.rowIndex === rowIndex &&
      target?.cellIndex === cellIndex &&
      target?.sixteenthSlot === slotIndex
    );
  }

  function isDragPreviewTarget(
    payload: DragPayload | null,
    target: GridDropTarget | null,
    voiceIndex: VoiceIndex,
    zone: GridZone,
    rowIndex: number,
    cellIndex: number,
  ): boolean {
    return (
      Boolean(payload) &&
      target?.voiceIndex === voiceIndex &&
      target?.zone === zone &&
      target?.rowIndex === rowIndex &&
      target?.cellIndex === cellIndex
    );
  }

  function dragPreviewNote(
    payload: DragPayload | null,
    target: GridDropTarget | null,
    voiceIndex: VoiceIndex,
    zone: GridZone,
    rowIndex: number,
    cellIndex: number,
  ): PlacedNote | null {
    const previewNote = payload?.note ?? null;
    if (!previewNote) return null;

    if (previewNote.shape === 'circle') {
      if (target?.voiceIndex !== voiceIndex || target?.zone !== zone || target?.rowIndex !== rowIndex) return null;
      const hoveredCellIndex = target.cellIndex;
      if (macrobeatStartCellIndex(hoveredCellIndex) !== cellIndex) return null;
    } else if (!isDragPreviewTarget(payload, target, voiceIndex, zone, rowIndex, cellIndex)) {
      return null;
    }

    if (zone === 'pickup') {
      const nextKey = `${voiceIndex}:${rowIndex}:${cellIndex}:${target?.cellIndex ?? 'n'}:${previewNote.shape}:${previewNote.noteId}`;
      if (pickupPreviewLogKey !== nextKey) {
        debugPickupRender('Pickup preview note resolved for render.', {
          rowIndex,
          renderCellIndex: cellIndex,
          hoverCellIndex: target?.cellIndex ?? null,
          shape: previewNote.shape,
          noteId: previewNote.noteId,
        });
        pickupPreviewLogKey = nextKey;
      }
    }

    return previewNote;
  }

  function isDragPreviewSixteenthSlot(
    payload: DragPayload | null,
    target: GridDropTarget | null,
    voiceIndex: VoiceIndex,
    zone: GridZone,
    rowIndex: number,
    cellIndex: number,
    slotIndex: SixteenthSlot,
  ): boolean {
    if (!payload || payload.note.shape !== 'diamond') return false;
    return isDragPreviewTarget(payload, target, voiceIndex, zone, rowIndex, cellIndex) && target?.sixteenthSlot === slotIndex;
  }

  function isCircleDragPreviewOnSecondMicrobeat(
    payload: DragPayload | null,
    target: GridDropTarget | null,
    voiceIndex: VoiceIndex,
    zone: GridZone,
    rowIndex: number,
    cellIndex: number,
  ): boolean {
    if (!payload || payload.note.shape !== 'circle') return false;
    return isDragPreviewTarget(payload, target, voiceIndex, zone, rowIndex, cellIndex) && !isMacrobeatStartCell(cellIndex);
  }

  function isCircleDragPreviewSpanStart(
    payload: DragPayload | null,
    target: GridDropTarget | null,
    voiceIndex: VoiceIndex,
    zone: GridZone,
    rowIndex: number,
    cellIndex: number,
  ): boolean {
    if (!payload || payload.note.shape !== 'circle') return false;
    if (target?.voiceIndex !== voiceIndex || target?.zone !== zone || target?.rowIndex !== rowIndex) return false;
    const hoveredCellIndex = target?.cellIndex;
    if (hoveredCellIndex === undefined) return false;
    const spanStartCellIndex = macrobeatStartCellIndex(hoveredCellIndex);
    const isSpanStart = spanStartCellIndex === cellIndex;

    if (zone === 'pickup' && isSpanStart) {
      debugPickupRender('Pickup span-start cell resolved for circle preview.', {
        rowIndex,
        hoveredCellIndex,
        spanStartCellIndex,
        evaluatedCellIndex: cellIndex,
      });
    }

    return isSpanStart;
  }

  function cellHasNote(voiceIndex: VoiceIndex, rowIndex: number, cellIndex: number): boolean {
    const rowCells = rowsForVoice(voiceIndex)[rowIndex]?.cells ?? null;
    if (!rowCells) return false;
    return cellHasAnyNotes(rowCells[cellIndex] ?? null) || isCircleSpanContinuationCell(rowCells, cellIndex);
  }

  function pickupCellHasNote(voiceIndex: VoiceIndex, cellIndex: number): boolean {
    const pickupCells = pickupRowForVoice(voiceIndex).cells;
    return cellHasAnyNotes(pickupCells[cellIndex]) || isCircleSpanContinuationCell(pickupCells, cellIndex);
  }

  function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;

    if (target.isContentEditable) return true;

    const tag = target.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select';
  }

  function handleGlobalKeyDown(event: KeyboardEvent): void {
    const isUndoRedoShortcut =
      (event.ctrlKey || event.metaKey) && (event.code === KEY_CODES.KEY_Z || event.code === KEY_CODES.KEY_Y);
    if (isUndoRedoShortcut) {
      if (isEditableTarget(event.target)) return;
      event.preventDefault();

      if (event.code === KEY_CODES.KEY_Y || (event.code === KEY_CODES.KEY_Z && event.shiftKey)) {
        redoCanvas();
      } else {
        undoCanvas();
      }
      return;
    }

    if (event.key === 'Escape' && volumePopupOpen) {
      volumePopupOpen = false;
      return;
    }

    if (event.key === 'Escape' && audioSamplesPopupOpen) {
      audioSamplesPopupOpen = false;
      return;
    }

    if (isEditableTarget(event.target)) return;

    if ((event.ctrlKey || event.metaKey) && event.code === 'KeyC') {
      if (selectedNoteKeys.size === 0) return;
      event.preventDefault();
      copySelectedNotesToClipboard();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.code === 'KeyX') {
      if (selectedNoteKeys.size === 0) return;
      event.preventDefault();
      cutSelectedNotesToClipboard();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.code === 'KeyV') {
      if (!selectionClipboard) return;
      event.preventDefault();
      pasteSelectionClipboard();
      return;
    }

    if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNoteKeys.size > 0) {
      event.preventDefault();
      deleteSelectedNotes();
      return;
    }

    if (event.key === 'Escape' && tapPlacementPayload) {
      event.preventDefault();
      clearTapPlacementSelection();
      clearSelectedNotes();
      return;
    }

    if (event.key === 'Escape' && selectedNoteKeys.size > 0) {
      event.preventDefault();
      clearSelectedNotes();
      return;
    }

    const bankShortcut = noteBankShortcutForCode(event.code);
    if (bankShortcut && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      if (event.repeat) return;

      eraserMode = false;
      const armed = armTapPlacementSelection(bankShortcut.noteId, bankShortcut.shape);
      if (armed) {
        void previewBankNote(bankShortcut.noteId);
      }
      return;
    }

    if (event.code === 'KeyE') {
      event.preventDefault();
      toggleEraserMode();
      return;
    }

    if (event.code === KEY_CODES.KEY_P) {
      event.preventDefault();
      togglePlayback();
      return;
    }

    if (event.code === KEY_CODES.KEY_O) {
      event.preventDefault();
      stopPlayback();
      return;
    }

    const noteDetail = getDiatonicNoteDetailsFromKeyboard(event.code);
    if (!noteDetail || event.repeat) return;

    event.preventDefault();

    const pitch = getPitchNameForDisplay(model.getFullRootNote(), noteDetail.interval);
    if (audioReady && pitch) {
      audio.playNoteNow(pitch);
    }

    keyboardHighlightedNoteId = noteDetail.originalId;
  }

  function handleGlobalKeyUp(event: KeyboardEvent): void {
    const noteDetail = getDiatonicNoteDetailsFromKeyboard(event.code);
    if (!noteDetail) return;

    keyboardHighlightedNoteId = null;
  }

  $: if (settingsDialog) {
    if (settingsOpen) settingsDialog.showModal();
    else if (settingsDialog.open) settingsDialog.close();
  }

</script>

<main
  class="boomwhacker-sketchpad"
  id="boomwhacker-sketchpad-app"
  class:chromanotes-palette={colorPaletteMode === 'chromanotes'}
  class:viewport-fit={viewportFitMode}
  class:track-style-horizontal={trackStyle === 'horizontal'}
  class:playback-active={isPlaying}
  style={`${rootInlineStyle()};--track-zoom:${trackZoom};--track-playback-shell-height-px:${trackPlaybackShellHeightPx};--playback-highway-height-percent:${playbackHighwayHeightPercent};`}
  on:dragover={handleCursorGhostDragOver}
>
  <div class="top-toolbar" class:playback-compact={isPlaying} class:eighth-bank-visible={showToolbarEighthBank && !isPlaying}>
  <section class="panel controls-panel">
    <div class="controls-group transport-group">
      <div class="transport-actions">
        <div class="transport-row">
          <button type="button" class="transport-btn play-from-start-btn" on:click={playFromStart} title="Play from start" aria-label="Play from start">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="4" y="5" width="2.5" height="14" rx="0.75" />
              <path d="M9 6.75v10.5c0 1.06 1.17 1.69 2.05 1.1l7.8-5.25a1.32 1.32 0 0 0 0-2.2l-7.8-5.25A1.32 1.32 0 0 0 9 6.75Z" />
            </svg>
          </button>
          <button type="button" class="transport-btn play-pause-btn" on:click={togglePlayback} title={isPlaying ? 'Pause' : 'Play'} aria-label={isPlaying ? 'Pause' : 'Play'}>
            {#if isPlaying}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="5" y="4" width="4" height="16" rx="1" />
                <rect x="15" y="4" width="4" height="16" rx="1" />
              </svg>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none" aria-hidden="true">
                <path fill="currentColor" d="M 152 104 L 144 106 L 143 108 L 141 108 L 133 114 L 130 120 L 128 130 L 128 382 L 132 396 L 140 404 L 147 406 L 149 408 L 164 408 L 165 406 L 168 406 L 178 401 L 180 398 L 184 397 L 207 381 L 224 372 L 229 367 L 240 362 L 242 359 L 249 356 L 254 351 L 267 345 L 269 342 L 286 333 L 293 327 L 304 322 L 306 319 L 316 314 L 322 309 L 326 308 L 331 303 L 335 302 L 344 295 L 354 290 L 356 287 L 367 282 L 378 271 L 381 265 L 382 250 L 377 239 L 367 230 L 363 229 L 343 215 L 325 205 L 318 199 L 309 195 L 308 193 L 301 190 L 287 180 L 283 179 L 281 176 L 274 173 L 268 168 L 259 164 L 257 161 L 246 156 L 244 153 L 237 150 L 232 145 L 221 140 L 217 136 L 210 133 L 201 126 L 197 125 L 195 122 L 183 116 L 177 111 L 164 105 Z"/>
              </svg>
            {/if}
          </button>
          <button type="button" class="transport-btn stop-btn" on:click={stopPlayback} title="Stop" aria-label="Stop">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="5" y="5" width="14" height="14" rx="3" ry="3" />
            </svg>
          </button>
          {#if !isPlaying}
          <button
            type="button"
            class="transport-btn count-in-btn"
            class:active={countInEnabled}
            on:click={toggleCountIn}
            title={countInEnabled ? 'Disable count-in' : 'Enable count-in'}
            aria-label={countInEnabled ? 'Disable count-in' : 'Enable count-in'}
            aria-pressed={countInEnabled}
          >
            <img src={countInIconUrl} alt="" class="transport-icon transport-icon--count-in" />
          </button>
          <button
            type="button"
            class="transport-btn"
            class:active={macrobeatMetronomeEnabled}
            on:click={toggleMacrobeatMetronome}
            title={macrobeatMetronomeEnabled ? 'Disable macrobeat click' : 'Enable macrobeat click'}
            aria-label={macrobeatMetronomeEnabled ? 'Disable macrobeat click' : 'Enable macrobeat click'}
            aria-pressed={macrobeatMetronomeEnabled}
          >
            <img src={metronomeIconUrl} alt="" class="transport-icon transport-icon--metronome" />
          </button>
          <button
            type="button"
            class="transport-btn"
            class:active={isLooping}
            on:click={toggleLoop}
            title={isLooping ? 'Disable Loop' : 'Enable Loop'}
            aria-label={isLooping ? 'Disable Loop' : 'Enable Loop'}
          >
            <img src={loopIconUrl} alt="Loop" class="transport-icon" />
          </button>
          {/if}
          {#if !isStudentView || !activeStudentView.hideVolumeSlider}
          <div class="volume-control-wrapper" bind:this={volumeControlWrapper}>
            <button
              type="button"
              class="transport-btn volume-icon-button"
              class:active={volumePopupOpen}
              on:click={handleVolumeIconClick}
              title="Volume"
              aria-label="Volume"
              aria-expanded={volumePopupOpen}
              aria-controls="main-volume-popup"
            >
              <img src={volumeIconUrl} alt="Volume" class="transport-icon" />
            </button>
            <div id="main-volume-popup" class="volume-popup" class:visible={volumePopupOpen}>
              <input
                id="main-volume"
                class="volume-slider"
                type="range"
                min="0"
                max="100"
                step="1"
                value={state.mainVolume * 100}
                on:input={setMainVolume}
                title="Main volume"
                aria-label="Main volume"
              />
            </div>
          </div>
          {/if}
        </div>

        {#if !isPlaying}
        <div class="transport-row">
          {#if !isStudentView || !activeStudentView.hideCanvasActions}
          <button
            type="button"
            class="transport-btn clear-canvas-btn"
            on:click={clearGrid}
            title="Clear canvas"
            aria-label="Clear canvas"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 372 372" fill="none" aria-hidden="true">
              <path fill="currentColor" fill-rule="evenodd" d="M 167.00 326.50 L 156.00 324.50 L 45.50 215.00 L 42.50 210.00 L 43.50 199.00 L 49.00 192.50 L 128.00 151.50 L 147.00 132.50 L 151.00 130.50 L 163.00 129.50 L 169.00 131.50 L 189.00 149.50 L 291.00 46.50 L 298.00 43.50 L 307.00 43.50 L 312.00 45.50 L 321.50 54.00 L 326.50 63.00 L 327.50 70.00 L 323.50 81.00 L 221.50 184.00 L 238.50 202.00 L 240.50 207.00 L 239.50 219.00 L 222.50 236.00 L 179.50 316.00 L 172.00 324.50 L 167.00 326.50 Z M 210.50 172.00 L 309.50 73.00 L 310.50 68.00 L 304.00 60.50 L 300.00 60.50 L 198.50 161.00 L 209.00 172.50 L 210.50 172.00 Z M 215.50 221.00 L 224.50 212.00 L 224.50 209.00 L 160.00 145.50 L 158.00 145.50 L 148.50 155.00 L 148.50 157.00 L 212.00 219.50 L 215.50 221.00 Z M 164.50 308.00 L 204.50 235.00 L 137.00 167.50 L 134.00 165.50 L 59.50 206.00 L 88.00 234.50 L 116.00 215.50 L 120.00 213.50 L 127.00 214.50 L 129.50 218.00 L 129.50 224.00 L 100.50 247.00 L 124.00 270.50 L 145.00 248.50 L 153.00 248.50 L 157.50 254.00 L 156.50 259.00 L 136.50 281.00 L 136.50 283.00 L 162.00 308.50 L 164.50 308.00 Z M 252.00 295.50 L 245.00 295.50 L 238.50 289.00 L 239.50 280.00 L 248.00 274.50 L 253.00 275.50 L 258.50 281.00 L 259.50 285.00 L 257.50 291.00 L 252.00 295.50 Z M 218.00 326.50 L 211.00 325.50 L 205.50 318.00 L 206.50 312.00 L 212.00 306.50 L 220.00 306.50 L 225.50 312.00 L 225.50 321.00 L 218.00 326.50 Z"/>
            </svg>
          </button>
          {/if}
          <button
            type="button"
            class="transport-btn"
            on:click={redoCanvas}
            disabled={!canCanvasRedo()}
            title="Redo (Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z)"
            aria-label="Redo"
          >
            <img src={redoIconUrl} alt="Redo" class="transport-icon" />
          </button>
          <button
            type="button"
            class="transport-btn"
            on:click={undoCanvas}
            disabled={!canCanvasUndo()}
            title="Undo (Ctrl/Cmd+Z)"
            aria-label="Undo"
          >
            <img src={undoIconUrl} alt="Undo" class="transport-icon" />
          </button>
          <button
            type="button"
            class="transport-btn eraser-btn"
            class:active={eraserMode}
            on:click={toggleEraserMode}
            title={eraserMode ? 'Disable eraser (E)' : 'Enable eraser (E)'}
            aria-label={eraserMode ? 'Disable eraser' : 'Enable eraser'}
            aria-pressed={eraserMode}
          >
            <img src={eraserIconUrl} alt="Eraser" class="transport-icon" />
          </button>
          {#if !isStudentView}
          <div class="audio-samples-control-wrapper" bind:this={audioSamplesControlWrapper}>
            <button
              type="button"
              class="transport-btn audio-samples-btn"
              class:active={audioSamplesPopupOpen}
              on:click={handleAudioSamplesIconClick}
              title="Audio samples"
              aria-label="Audio samples"
              aria-expanded={audioSamplesPopupOpen}
              aria-controls="audio-samples-popup"
            >
              <img src={audioSamplesIconUrl} alt="" class="transport-icon transport-icon--audio-samples" />
            </button>
            {#if audioSamplesPopupOpen}
              {@const activeSample = selectedPercussionSample(activeSamplePickerNoteId)}
              <div
                id="audio-samples-popup"
                class="audio-samples-popup"
                role="dialog"
                aria-label="Audio samples"
                style={audioSamplesPopupStyle}
              >
                <div class="audio-samples-note-tabs" role="tablist" aria-label="Percussion notes">
                  {#each PERCUSSION_NOTE_IDS as noteId (noteId)}
                    <button
                      type="button"
                      class="audio-samples-note-tab"
                      class:active={activeSamplePickerNoteId === noteId}
                      style={`--sample-note-color:${noteColor(noteId)};`}
                      role="tab"
                      aria-selected={activeSamplePickerNoteId === noteId}
                      title={selectedPercussionSampleLabel(noteId)}
                      on:click={() => (activeSamplePickerNoteId = noteId)}
                    >
                      <span class="audio-samples-note-color" aria-hidden="true"></span>
                      <span class="audio-samples-note-name">{displayLabelFromId(noteId)}</span>
                      <span class="audio-samples-note-sample">{selectedPercussionSample(noteId)?.label ?? 'Default'}</span>
                    </button>
                  {/each}
                </div>
                <div class="audio-samples-current">
                  <span class="audio-samples-current-note">{displayLabelFromId(activeSamplePickerNoteId)}</span>
                  <span class="audio-samples-current-sample">{activeSample ? `${activeSample.machineLabel} / ${activeSample.label}` : 'Default'}</span>
                </div>
                <div class="audio-sample-tree" role="tree" aria-label="Audio sample folders">
                  {#each LOCAL_DRUM_SAMPLE_GROUPS as group (group.machineId)}
                    <details class="audio-sample-folder" open={group.samples.some((sample) => sample.id === percussionSampleSelections[activeSamplePickerNoteId])}>
                      <summary>
                        <span class="audio-sample-folder-name">{group.machineLabel}</span>
                        <span class="audio-sample-folder-count">{group.samples.length}</span>
                      </summary>
                      <div class="audio-sample-list">
                        {#each group.samples as sample (sample.id)}
                          {@const sampleSelected = percussionSampleSelections[activeSamplePickerNoteId] === sample.id}
                          <div class="audio-sample-row" class:selected={sampleSelected} role="treeitem" aria-selected={sampleSelected}>
                            <button
                              type="button"
                              class="audio-sample-preview-btn"
                              title={`Preview ${sample.label}`}
                              aria-label={`Preview ${sample.label}`}
                              on:click={() => void previewAudioSample(sample.id)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <path d="M8 5.8v12.4c0 .72.8 1.15 1.4.75l9.3-6.2a.9.9 0 0 0 0-1.5L9.4 5.05A.9.9 0 0 0 8 5.8Z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              class="audio-sample-use-btn"
                              class:selected={sampleSelected}
                              disabled={sampleSelected}
                              title={`Use ${sample.label} for ${displayLabelFromId(activeSamplePickerNoteId)}`}
                              aria-label={`Use ${sample.label} for ${displayLabelFromId(activeSamplePickerNoteId)}`}
                              on:click={() => setPercussionSample(activeSamplePickerNoteId, sample.id)}
                            >
                              <span class="audio-sample-label">{sample.label}</span>
                              <span class="audio-sample-meta">{sample.voiceMetadata?.description ?? sample.fileName}</span>
                              <span class="audio-sample-use-state">{sampleSelected ? 'Selected' : 'Use'}</span>
                            </button>
                          </div>
                        {/each}
                      </div>
                    </details>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
          {/if}
          <button
            type="button"
            class="transport-btn home-btn"
            on:click={navigateHome}
            title="Back to home"
            aria-label="Back to home"
          >
            <span class="transport-icon-mask home-btn-icon" aria-hidden="true"></span>
          </button>
          {#if !isStudentView}
          <button
            type="button"
            class="transport-btn library-btn"
            class:active={libraryModalOpen}
            on:click={() => void openLibraryModal()}
            title="Open sketch library"
            aria-label="Open sketch library"
            aria-pressed={libraryModalOpen}
          >
            <span class="transport-icon-mask library-btn-icon" aria-hidden="true"></span>
          </button>
          {/if}
          <button type="button" class="transport-btn share-btn" on:click={handleShare} title="Share composition" aria-label="Share composition">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </button>
          {#if !isStudentView || !activeStudentView.hideGearSettings}
          <button type="button" class="transport-btn settings-gear-btn" class:settings-open={settingsOpen} on:click={() => (settingsOpen = true)} title="Settings" aria-label="Open settings">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09A1.65 1.65 0 0 0 19.4 15z"/>
            </svg>
          </button>
          {/if}
        </div>
        {/if}
      </div>

      {#if !isPlaying && ((!isStudentView || !activeStudentView.hideTempoSlider) || (!isStudentView || !activeStudentView.hideQuarterTempo))}
      <div class="tempo-inline-group">
        <div class="tempo-stack">
          <TempoControls
            quarterTempo={state.microbeatTempo / 2}
            minQuarter={MICROBEAT_TEMPO_MIN / 2}
            maxQuarter={MICROBEAT_TEMPO_MAX / 2}
            step={1}
            sliderOrientation="vertical"
            onchange={handleQuarterTempoChange}
            showEighth={false}
            showQuarter={!isStudentView || !activeStudentView.hideQuarterTempo}
            showDottedQuarter={false}
            showRows={!isStudentView || !activeStudentView.hideQuarterTempo}
            showSlider={!isStudentView || !activeStudentView.hideTempoSlider}
          />
          <div class="tempo-shortcut-buttons" aria-label="Tempo shortcuts">
            {#each TEMPO_SHORTCUT_VALUES as tempoValue}
              <button
                type="button"
                class:active={Math.round(state.microbeatTempo / 2) === tempoValue}
                on:click={() => setQuarterTempoShortcut(tempoValue)}
                aria-pressed={Math.round(state.microbeatTempo / 2) === tempoValue}
              >
                {tempoValue}
              </button>
            {/each}
          </div>
        </div>
      </div>
      {/if}
    </div>
  </section>

  <section class="panel notebank-panel toolbar-notebank-panel toolbar-quarter-notebank-panel" class:playback-content-hidden={isPlaying}>
      <div class="toolbar-notebank-stack">
        <div class="toolbar-bank-row">
          <div class="bank-row-wrap">
            <span class="bank-row-corner-label">Quarters</span>
            <div class="bank-row-main">
            <div class="bank-lattice circle-row" class:accidentals-hidden={!showAccidentals} style={`--lattice-columns:${BANK_LATTICE_COLUMN_COUNT_CIRCLE};`}>
              {#if showAccidentals}
              <div class="bank-lattice-row top">
                {#each bankLatticeRowsCircle.top as token (token.noteId)}
                  <div
                    class="bank-token-shell circle sharp-token"
                    class:keyboard-highlight={tokenIsHighlighted(token.noteId)}
                    style={bankTokenInlineStyle(token)}
                  >
                    <svg class="token-glyph circle" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
                      <ellipse cx="50" cy="50" rx="44" ry="44" />
                    </svg>
                    <button
                      type="button"
                      class="token-hitbox single sharp"
                      class:selection-armed={tapPlacementSelectionMatches(token.noteId, 'circle')}
                      draggable={bankNativeDragEnabled}
                      title={noteBankTokenTitle(token.noteId)}
                      aria-label={`Add ${token.label} quarter sharp`}
                      aria-pressed={tapPlacementSelectionMatches(token.noteId, 'circle')}
                      on:click={(event) => handleBankTokenClick(event, token.noteId, 'circle')}
                      on:pointerdown={(event) => handleBankTokenPointerDown(event, token.noteId, 'circle')}
                      on:mousedown={(event) => handleBankTokenMouseDown(event, token.noteId, 'circle')}
                      on:dragstart={(event) => handleBankDragStart(event, token.noteId, 'circle')}
                      on:dragend={handleAnyDragEnd}
                    >
                      <NoteGlyph label={token.label} markerClass={scaleDegreeOneMarkerClass(token.noteId)} iconClass={noteIconClass(token.noteId)} />
                    </button>
                  </div>
                {/each}
              </div>
              {/if}

              <div class="bank-lattice-row middle">
                {#each bankLatticeRowsCircle.middle as token (token.noteId)}
                  <div
                    class="bank-token-shell circle natural-token"
                    class:keyboard-highlight={tokenIsHighlighted(token.noteId)}
                    style={bankTokenInlineStyle(token)}
                  >
                    <svg class="token-glyph circle" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
                      <ellipse cx="50" cy="50" rx="44" ry="44" />
                    </svg>
                    <button
                      type="button"
                      class="token-hitbox single natural"
                      class:selection-armed={tapPlacementSelectionMatches(token.noteId, 'circle')}
                      draggable={bankNativeDragEnabled}
                      title={noteBankTokenTitle(token.noteId)}
                      aria-label={`Add ${token.label} quarter`}
                      aria-pressed={tapPlacementSelectionMatches(token.noteId, 'circle')}
                      on:click={(event) => handleBankTokenClick(event, token.noteId, 'circle')}
                      on:pointerdown={(event) => handleBankTokenPointerDown(event, token.noteId, 'circle')}
                      on:mousedown={(event) => handleBankTokenMouseDown(event, token.noteId, 'circle')}
                      on:dragstart={(event) => handleBankDragStart(event, token.noteId, 'circle')}
                      on:dragend={handleAnyDragEnd}
                    >
                      <NoteGlyph label={token.label} markerClass={scaleDegreeOneMarkerClass(token.noteId)} iconClass={noteIconClass(token.noteId)} />
                    </button>
                  </div>
                {/each}
              </div>

              {#if showAccidentals}
              <div class="bank-lattice-row bottom">
                {#each bankLatticeRowsCircle.bottom as token (token.noteId)}
                  <div
                    class="bank-token-shell circle flat-token"
                    class:keyboard-highlight={tokenIsHighlighted(token.noteId)}
                    style={bankTokenInlineStyle(token)}
                  >
                    <svg class="token-glyph circle" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
                      <ellipse cx="50" cy="50" rx="44" ry="44" />
                    </svg>
                    <button
                      type="button"
                      class="token-hitbox single flat"
                      class:selection-armed={tapPlacementSelectionMatches(token.noteId, 'circle')}
                      draggable={bankNativeDragEnabled}
                      title={noteBankTokenTitle(token.noteId)}
                      aria-label={`Add ${token.label} quarter flat`}
                      aria-pressed={tapPlacementSelectionMatches(token.noteId, 'circle')}
                      on:click={(event) => handleBankTokenClick(event, token.noteId, 'circle')}
                      on:pointerdown={(event) => handleBankTokenPointerDown(event, token.noteId, 'circle')}
                      on:mousedown={(event) => handleBankTokenMouseDown(event, token.noteId, 'circle')}
                      on:dragstart={(event) => handleBankDragStart(event, token.noteId, 'circle')}
                      on:dragend={handleAnyDragEnd}
                    >
                      <NoteGlyph label={token.label} markerClass={scaleDegreeOneMarkerClass(token.noteId)} iconClass={noteIconClass(token.noteId)} />
                    </button>
                  </div>
                {/each}
              </div>
              {/if}
            </div>
            <div class="supplemental-note-bank supplemental-note-bank--circle" class:accidentals-hidden={!showAccidentals}>
              {#each PERCUSSION_NOTE_IDS as noteId}
                <div class="bank-token-shell circle supplemental-token">
                  <svg class="token-glyph circle" viewBox="0 0 100 100" aria-hidden="true" focusable="false" style={`--token-color:${noteColor(noteId)};`}>
                    <ellipse cx="50" cy="50" rx="44" ry="44" />
                  </svg>
                  <button
                    type="button"
                    class="token-hitbox single natural"
                    class:selection-armed={tapPlacementSelectionMatches(noteId, 'circle')}
                    draggable={bankNativeDragEnabled}
                    title={noteBankTokenTitle(noteId)}
                    aria-label={`Add ${displayLabelFromId(noteId)} quarter`}
                    aria-pressed={tapPlacementSelectionMatches(noteId, 'circle')}
                    on:click={(event) => handleBankTokenClick(event, noteId, 'circle')}
                    on:pointerdown={(event) => handleBankTokenPointerDown(event, noteId, 'circle')}
                    on:mousedown={(event) => handleBankTokenMouseDown(event, noteId, 'circle')}
                    on:dragstart={(event) => handleBankDragStart(event, noteId, 'circle')}
                    on:dragend={handleAnyDragEnd}
                    style={`--token-color:${noteColor(noteId)};`}
                  >
                    <NoteGlyph label={displayLabelFromId(noteId)} markerClass={scaleDegreeOneMarkerClass(noteId)} iconClass={noteIconClass(noteId)} />
                  </button>
                </div>
              {/each}
            </div>
            </div>
          </div>
        </div>
      </div>
  </section>

  {#if showToolbarEighthBank}
  <section class="panel notebank-panel toolbar-notebank-panel toolbar-eighth-notebank-panel" class:playback-content-hidden={isPlaying}>
      <div class="toolbar-notebank-stack">
        <div class="toolbar-bank-row">
          <div class="bank-row-wrap">
            <span class="bank-row-corner-label">Eighths</span>
            <div class="bank-row-main">
            <div class="bank-lattice oval-row" class:accidentals-hidden={!showAccidentals} style={`--lattice-columns:${BANK_LATTICE_COLUMN_COUNT_OVAL};`}>
              {#if showAccidentals}
              <div class="bank-lattice-row top">
                {#each bankLatticeRowsOval.top as token (token.noteId)}
                  <div
                    class="bank-token-shell oval sharp-token"
                    class:keyboard-highlight={tokenIsHighlighted(token.noteId)}
                    style={bankTokenInlineStyle(token)}
                  >
                    <svg class="token-glyph oval" viewBox="0 0 100 160" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                      <ellipse cx="50" cy="80" rx="44" ry="70.4" />
                    </svg>
                    <button
                      type="button"
                      class="token-hitbox single sharp"
                      class:selection-armed={tapPlacementSelectionMatches(token.noteId, 'oval')}
                      draggable={bankNativeDragEnabled}
                      title={noteBankTokenTitle(token.noteId)}
                      aria-label={`Add ${token.label} oval sharp`}
                      aria-pressed={tapPlacementSelectionMatches(token.noteId, 'oval')}
                      on:click={(event) => handleBankTokenClick(event, token.noteId, 'oval')}
                      on:pointerdown={(event) => handleBankTokenPointerDown(event, token.noteId, 'oval')}
                      on:mousedown={(event) => handleBankTokenMouseDown(event, token.noteId, 'oval')}
                      on:dragstart={(event) => handleBankDragStart(event, token.noteId, 'oval')}
                      on:dragend={handleAnyDragEnd}
                    >
                      <NoteGlyph label={token.label} markerClass={scaleDegreeOneMarkerClass(token.noteId)} iconClass={noteIconClass(token.noteId)} />
                    </button>
                  </div>
                {/each}
              </div>
              {/if}

              <div class="bank-lattice-row middle">
                {#each bankLatticeRowsOval.middle as token (token.noteId)}
                  <div
                    class="bank-token-shell oval natural-token"
                    class:keyboard-highlight={tokenIsHighlighted(token.noteId)}
                    style={bankTokenInlineStyle(token)}
                  >
                    <svg class="token-glyph oval" viewBox="0 0 100 160" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                      <ellipse cx="50" cy="80" rx="44" ry="70.4" />
                    </svg>
                    <button
                      type="button"
                      class="token-hitbox single natural"
                      class:selection-armed={tapPlacementSelectionMatches(token.noteId, 'oval')}
                      draggable={bankNativeDragEnabled}
                      title={noteBankTokenTitle(token.noteId)}
                      aria-label={`Add ${token.label} oval`}
                      aria-pressed={tapPlacementSelectionMatches(token.noteId, 'oval')}
                      on:click={(event) => handleBankTokenClick(event, token.noteId, 'oval')}
                      on:pointerdown={(event) => handleBankTokenPointerDown(event, token.noteId, 'oval')}
                      on:mousedown={(event) => handleBankTokenMouseDown(event, token.noteId, 'oval')}
                      on:dragstart={(event) => handleBankDragStart(event, token.noteId, 'oval')}
                      on:dragend={handleAnyDragEnd}
                    >
                      <NoteGlyph label={token.label} markerClass={scaleDegreeOneMarkerClass(token.noteId)} iconClass={noteIconClass(token.noteId)} />
                    </button>
                  </div>
                {/each}
              </div>

              {#if showAccidentals}
              <div class="bank-lattice-row bottom">
                {#each bankLatticeRowsOval.bottom as token (token.noteId)}
                  <div
                    class="bank-token-shell oval flat-token"
                    class:keyboard-highlight={tokenIsHighlighted(token.noteId)}
                    style={bankTokenInlineStyle(token)}
                  >
                    <svg class="token-glyph oval" viewBox="0 0 100 160" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                      <ellipse cx="50" cy="80" rx="44" ry="70.4" />
                    </svg>
                    <button
                      type="button"
                      class="token-hitbox single flat"
                      class:selection-armed={tapPlacementSelectionMatches(token.noteId, 'oval')}
                      draggable={bankNativeDragEnabled}
                      title={noteBankTokenTitle(token.noteId)}
                      aria-label={`Add ${token.label} oval flat`}
                      aria-pressed={tapPlacementSelectionMatches(token.noteId, 'oval')}
                      on:click={(event) => handleBankTokenClick(event, token.noteId, 'oval')}
                      on:pointerdown={(event) => handleBankTokenPointerDown(event, token.noteId, 'oval')}
                      on:mousedown={(event) => handleBankTokenMouseDown(event, token.noteId, 'oval')}
                      on:dragstart={(event) => handleBankDragStart(event, token.noteId, 'oval')}
                      on:dragend={handleAnyDragEnd}
                    >
                      <NoteGlyph label={token.label} markerClass={scaleDegreeOneMarkerClass(token.noteId)} iconClass={noteIconClass(token.noteId)} />
                    </button>
                  </div>
                {/each}
              </div>
              {/if}
            </div>
            <div class="supplemental-note-bank supplemental-note-bank--oval" class:accidentals-hidden={!showAccidentals}>
              {#each PERCUSSION_NOTE_IDS as noteId}
                <div class="bank-token-shell oval supplemental-token">
                  <svg class="token-glyph oval" viewBox="0 0 100 160" preserveAspectRatio="none" aria-hidden="true" focusable="false" style={`--token-color:${noteColor(noteId)};`}>
                    <ellipse cx="50" cy="80" rx="44" ry="70.4" />
                  </svg>
                  <button
                    type="button"
                    class="token-hitbox single natural"
                    class:selection-armed={tapPlacementSelectionMatches(noteId, 'oval')}
                    draggable={bankNativeDragEnabled}
                    title={noteBankTokenTitle(noteId)}
                    aria-label={`Add ${displayLabelFromId(noteId)} eighth`}
                    aria-pressed={tapPlacementSelectionMatches(noteId, 'oval')}
                    on:click={(event) => handleBankTokenClick(event, noteId, 'oval')}
                    on:pointerdown={(event) => handleBankTokenPointerDown(event, noteId, 'oval')}
                    on:mousedown={(event) => handleBankTokenMouseDown(event, noteId, 'oval')}
                    on:dragstart={(event) => handleBankDragStart(event, noteId, 'oval')}
                    on:dragend={handleAnyDragEnd}
                    style={`--token-color:${noteColor(noteId)};`}
                  >
                    <NoteGlyph label={displayLabelFromId(noteId)} markerClass={scaleDegreeOneMarkerClass(noteId)} iconClass={noteIconClass(noteId)} />
                  </button>
                </div>
              {/each}
            </div>
            </div>
          </div>
        </div>
      </div>
  </section>
  {/if}
  </div>

  {#if showLowerSixteenthBank}
  <section class="panel notebank-panel lower-notebank-panel" class:playback-content-hidden={isPlaying}>
    <div class="bank-row-wrap">
      <span class="bank-row-corner-label">Sixteenths</span>
      <div class="bank-lattice diamond-row" class:accidentals-hidden={!showAccidentals} style={`--lattice-columns:${BANK_LATTICE_COLUMN_COUNT_DIAMOND};`}>
        {#if showAccidentals}
        <div class="bank-lattice-row top">
          {#each bankLatticeRowsDiamond.top as token (token.noteId)}
            <div
              class="bank-token-shell diamond sharp-token"
              class:keyboard-highlight={tokenIsHighlighted(token.noteId)}
              style={bankTokenInlineStyle(token)}
            >
              <svg class="token-glyph diamond" viewBox="0 0 120 120" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                <path d={BANK_SIXTEENTH_HEX_PATH} />
              </svg>
              <button
                type="button"
                class="token-hitbox single sharp"
                class:selection-armed={tapPlacementSelectionMatches(token.noteId, 'diamond')}
                draggable={bankNativeDragEnabled}
                title={noteBankTokenTitle(token.noteId)}
                aria-label={`Add ${token.label} sixteenth sharp`}
                aria-pressed={tapPlacementSelectionMatches(token.noteId, 'diamond')}
                on:click={(event) => handleBankTokenClick(event, token.noteId, 'diamond')}
                on:pointerdown={(event) => handleBankTokenPointerDown(event, token.noteId, 'diamond')}
                on:mousedown={(event) => handleBankTokenMouseDown(event, token.noteId, 'diamond')}
                on:dragstart={(event) => handleBankDragStart(event, token.noteId, 'diamond')}
                on:dragend={handleAnyDragEnd}
              >
                <NoteGlyph label={token.label} markerClass={scaleDegreeOneMarkerClass(token.noteId)} iconClass={noteIconClass(token.noteId)} />
              </button>
            </div>
          {/each}
        </div>
        {/if}

        <div class="bank-lattice-row middle">
          {#each bankLatticeRowsDiamond.middle as token (token.noteId)}
            <div
              class="bank-token-shell diamond natural-token"
              class:keyboard-highlight={tokenIsHighlighted(token.noteId)}
              style={bankTokenInlineStyle(token)}
            >
              <svg class="token-glyph diamond" viewBox="0 0 120 120" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                <path d={BANK_SIXTEENTH_HEX_PATH} />
              </svg>
              <button
                type="button"
                class="token-hitbox single natural"
                class:selection-armed={tapPlacementSelectionMatches(token.noteId, 'diamond')}
                draggable={bankNativeDragEnabled}
                title={noteBankTokenTitle(token.noteId)}
                aria-label={`Add ${token.label} sixteenth`}
                aria-pressed={tapPlacementSelectionMatches(token.noteId, 'diamond')}
                on:click={(event) => handleBankTokenClick(event, token.noteId, 'diamond')}
                on:pointerdown={(event) => handleBankTokenPointerDown(event, token.noteId, 'diamond')}
                on:mousedown={(event) => handleBankTokenMouseDown(event, token.noteId, 'diamond')}
                on:dragstart={(event) => handleBankDragStart(event, token.noteId, 'diamond')}
                on:dragend={handleAnyDragEnd}
              >
                <NoteGlyph label={token.label} markerClass={scaleDegreeOneMarkerClass(token.noteId)} iconClass={noteIconClass(token.noteId)} />
              </button>
            </div>
          {/each}
        </div>

        {#if showAccidentals}
        <div class="bank-lattice-row bottom">
          {#each bankLatticeRowsDiamond.bottom as token (token.noteId)}
            <div
              class="bank-token-shell diamond flat-token"
              class:keyboard-highlight={tokenIsHighlighted(token.noteId)}
              style={bankTokenInlineStyle(token)}
            >
              <svg class="token-glyph diamond" viewBox="0 0 120 120" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                <path d={BANK_SIXTEENTH_HEX_PATH} />
              </svg>
              <button
                type="button"
                class="token-hitbox single flat"
                class:selection-armed={tapPlacementSelectionMatches(token.noteId, 'diamond')}
                draggable={bankNativeDragEnabled}
                title={noteBankTokenTitle(token.noteId)}
                aria-label={`Add ${token.label} sixteenth flat`}
                aria-pressed={tapPlacementSelectionMatches(token.noteId, 'diamond')}
                on:click={(event) => handleBankTokenClick(event, token.noteId, 'diamond')}
                on:pointerdown={(event) => handleBankTokenPointerDown(event, token.noteId, 'diamond')}
                on:mousedown={(event) => handleBankTokenMouseDown(event, token.noteId, 'diamond')}
                on:dragstart={(event) => handleBankDragStart(event, token.noteId, 'diamond')}
                on:dragend={handleAnyDragEnd}
              >
                <NoteGlyph label={token.label} markerClass={scaleDegreeOneMarkerClass(token.noteId)} iconClass={noteIconClass(token.noteId)} />
              </button>
            </div>
          {/each}
        </div>
        {/if}
      </div>
    </div>
  </section>
  {/if}

  <section
    class="panel canvas-panel"
    class:track-style-horizontal={trackStyle === 'horizontal'}
    bind:this={canvasPanelElement}
    aria-label="Sketch canvas"
    role="application"
    on:dragenter={handleCanvasDragEnter}
    on:dragleave={handleCanvasDragLeave}
    on:mousemove={handleCanvasMouseMove}
    on:mouseleave={handleCanvasMouseLeave}
  >
    <div
      class="canvas-scroll-shell"
      class:track-style-horizontal={trackStyle === 'horizontal'}
      class:two-voice-mode={voiceCount > 1}
      class:playback-highway-expanded={trackStyle === 'horizontal' && isPlaying}
      class:playback-highway-active={trackStyle === 'horizontal' && isPlaying && horizontalPlaybackHighway.referenceViewportLeftPx !== null}
      bind:this={canvasScrollShellElement}
      use:notifyCanvasLayoutChange
      on:scroll|passive={handleCanvasScroll}
      on:wheel|nonpassive={handleTrackWheel}
    >
      <div
        class="rows-grid"
        bind:this={rowsGridElement}
        class:has-active-pickup={pickupBeats > 0}
        class:two-voice-mode={voiceCount > 1}
        class:track-style-horizontal={trackStyle === 'horizontal'}
        style={`--pickup-columns:${pickupMicrobeatCount()}; --visible-voice-count:${voiceCount}; --karaoke-ball-size-px:${karaokeBallSizePx}px; --karaoke-arc-height-px:${karaokeArcHeightPx}px; --horizontal-playback-runway-px:${horizontalPlaybackRunwayPx}px;`}
      >
        {#each renderedTrackRows as renderedRow, renderedRowIndex (renderedRow.key)}
        {@const voiceIndex = renderedRow.voiceIndex}
        {@const rowIndex = renderedRow.rowIndex}
        {@const sourceRowIndex = renderedRow.sourceRowIndex}
        {@const row = renderedRow.row}
        {@const pickupRow = renderedRow.pickupRow}
        {@const hasInlinePickup = renderedRow.includesPickup}
        <article
          class="track-row voice-track-row"
          class:voice-track-row--a={voiceIndex === 0}
          class:voice-track-row--b={voiceIndex === 1}
          class:voice-track-row--c={voiceIndex === 2}
          class:voice-track-row--d={voiceIndex === 3}
          class:voice-track-row--active={activeCanvasVoiceIndex === voiceIndex}
          class:voice-track-row--muted={mutedVoiceStates[voiceIndex] || (soloedVoiceStates.some(Boolean) && !soloedVoiceStates[voiceIndex])}
          class:with-inline-pickup={hasInlinePickup}
          class:track-row--loop-copy={isHorizontalLoopPlaybackActive()}
          bind:this={voiceTrackRowElements[voiceIndex][rowIndex]}
          use:notifyCanvasLayoutChange
          style:--track-row-column={trackStyle === 'horizontal' && voiceCount > 1 ? `${rowIndex + 1}` : null}
          style:--horizontal-playback-lane-shift-px={trackStyle === 'horizontal' && voiceCount > 1 ? `${voiceHorizontalPlaybackLaneShiftPxs[voiceIndex] ?? 0}px` : null}
          on:pointerdown={() => setActiveCanvasVoice(voiceIndex)}
        >
          {#if voiceCount > 1}
            <div
              class="voice-control-bar"
              class:voice-control-bar--spacer={rowIndex !== 0}
              aria-label={`Voice ${voiceLabel(voiceIndex)} playback controls`}
              on:pointerdown={(event) => event.stopPropagation()}
            >
              {#if rowIndex === 0}
                <button
                  type="button"
                  class="voice-control-btn"
                  class:active={mutedVoiceStates[voiceIndex]}
                  aria-pressed={mutedVoiceStates[voiceIndex]}
                  title={`Mute Voice ${voiceLabel(voiceIndex)}`}
                  on:pointerdown={(event) => event.stopPropagation()}
                  on:click={(event) => toggleVoiceMute(event, voiceIndex)}
                >M</button>
                <button
                  type="button"
                  class="voice-control-btn"
                  class:active={soloedVoiceStates[voiceIndex]}
                  aria-pressed={soloedVoiceStates[voiceIndex]}
                  title={`Solo Voice ${voiceLabel(voiceIndex)}`}
                  on:pointerdown={(event) => event.stopPropagation()}
                  on:click={(event) => toggleVoiceSolo(event, voiceIndex)}
                >S</button>
              {/if}
            </div>
          {/if}
          <div
            class="track-row-grids"
            class:with-inline-pickup={hasInlinePickup}
          >
            <div
              class="track-grid main-grid"
              class:with-inline-pickup={hasInlinePickup}
              style={trackGridInlineStyle(hasInlinePickup)}
              role="group"
              aria-label={`Row ${sourceRowIndex + 1}`}
            >
              {#if trackStyle === 'horizontal' || voiceCount > 1}
                <span class="voice-track-row-label" aria-hidden="true">{sourceRowIndex + 1}</span>
              {/if}
              {#if hasInlinePickup}
                {#each pickupRow.cells.slice(0, pickupMicrobeatCount()) as cell, cellIndex}
                  {@const pickupPreviewNote = dragPreviewNote(activePreviewPayload, dragOverCell, voiceIndex, 'pickup', -1, cellIndex)}
                  <div
                    class="macrobeat-cell"
                    class:has-note={pickupCellHasNote(voiceIndex, cellIndex)}
                    class:circle-span-start={cell?.shape === 'circle' && cell.role === 'start' || isCircleDragPreviewSpanStart(activePreviewPayload, dragOverCell, voiceIndex, 'pickup', -1, cellIndex)}
                    class:drop-target={isPickupDropTarget(dragOverCell, voiceIndex, cellIndex)}
                    class:playback-start-selected={isPlaybackStartSelected('pickup', -1)}
                    class:two-based-divider={(cellIndex + 1) % 2 === 0 && cellIndex < pickupMicrobeatCount() - 1}
                    data-voice-index={voiceIndex}
                    data-track-zone="pickup"
                    data-row-index={rowIndex}
                    data-cell-index={cellIndex}
                    style={macrobeatCellInlineStyle('pickup', cellIndex, hasInlinePickup)}
                    role="gridcell"
                    tabindex={tapPlacementPayload || eraserMode ? 0 : -1}
                    aria-label={`Voice ${voiceLabel(voiceIndex)} pickup macrobeat ${Math.floor(cellIndex / MICROBEATS_PER_BEAT) + 1}, microbeat ${(cellIndex % MICROBEATS_PER_BEAT) + 1}`}
                    on:mousemove={(event) => handleCellMouseMove(event, voiceIndex, 'pickup', -1, cellIndex)}
                    on:dragover={(event) => handleCellDragOver(event, voiceIndex, 'pickup', -1, cellIndex)}
                    on:drop={(event) => handleCellDrop(event, voiceIndex, 'pickup', -1, cellIndex)}
                    on:pointerdown={(event) => handleCellPointerDown(event, voiceIndex, 'pickup', -1, cellIndex)}
                    on:click={(event) => handleCellClick(event, voiceIndex, 'pickup', -1, cellIndex)}
                    on:keydown={(event) => handleCellKeyDown(event, voiceIndex, 'pickup', -1, cellIndex)}
                  >
                    {#if cell}
                      {#if cell.shape === 'oval' && cell.notes[0]}
                        <button
                          type="button"
                          class="placed-note oval"
                          class:selected-note={selectedNoteKeys.has(noteSelectionKey(voiceIndex, 'pickup', -1, cellIndex, 0))}
                          data-selection-key={noteSelectionKey(voiceIndex, 'pickup', -1, cellIndex, 0)}
                          style={`--token-color:${cell.notes[0].color};`}
                          draggable="true"
                          title={placedNoteTitle(cell.notes[0])}
                          on:click={(event) => handlePlacedNoteClick(event, voiceIndex, 'pickup', -1, cellIndex, 0)}
                          on:dragstart={(event) => handleCellDragStart(event, voiceIndex, 'pickup', -1, cellIndex, cell.notes[0], 0)}
                          on:dragend={handleAnyDragEnd}
                          on:contextmenu={(event) => removeCellNote(event, voiceIndex, 'pickup', -1, cellIndex, 0)}
                        >
                          <svg
                            class="token-glyph oval"
                            viewBox="0 0 100 160"
                            preserveAspectRatio="none"
                            aria-hidden="true"
                            focusable="false"
                          >
                            <ellipse cx="50" cy="80" rx="47" ry="77" />
                          </svg>
                          <span class="glyph-label">
                            <NoteGlyph label={displayLabelFromText(cell.notes[0].label)} markerClass={scaleDegreeOneMarkerClass(cell.notes[0].noteId)} iconClass={noteIconClass(cell.notes[0].noteId)} />
                          </span>
                        </button>
                      {:else if cell.shape === 'circle' && cell.role === 'start' && cell.notes[0]}
                        <button
                          type="button"
                          class="placed-note circle"
                          class:selected-note={selectedNoteKeys.has(noteSelectionKey(voiceIndex, 'pickup', -1, cellIndex, 0))}
                          data-selection-key={noteSelectionKey(voiceIndex, 'pickup', -1, cellIndex, 0)}
                          style={`--token-color:${cell.notes[0].color};`}
                          draggable="true"
                          title={placedNoteTitle(cell.notes[0])}
                          on:click={(event) => handlePlacedNoteClick(event, voiceIndex, 'pickup', -1, cellIndex, 0)}
                          on:dragstart={(event) => handleCellDragStart(event, voiceIndex, 'pickup', -1, cellIndex, cell.notes[0], 0)}
                          on:dragend={handleAnyDragEnd}
                          on:contextmenu={(event) => removeCellNote(event, voiceIndex, 'pickup', -1, cellIndex, 0)}
                        >
                          <svg
                            class="token-glyph circle"
                            viewBox="0 0 100 100"
                            preserveAspectRatio="none"
                            aria-hidden="true"
                            focusable="false"
                          >
                            <ellipse cx="50" cy="50" rx="47" ry="47" />
                          </svg>
                          <span class="glyph-label">
                            <NoteGlyph label={displayLabelFromText(cell.notes[0].label)} markerClass={scaleDegreeOneMarkerClass(cell.notes[0].noteId)} iconClass={noteIconClass(cell.notes[0].noteId)} />
                          </span>
                        </button>
                      {:else if cell.shape === 'diamond'}
                        <div class="placed-sixteenth-pair">
                          {#each cell.notes as diamondNote, slotIndex}
                            <div class="sixteenth-slot" class:slot-drop-target={isSixteenthSlotDropTarget(activePreviewPayload, dragOverCell, voiceIndex, 'pickup', -1, cellIndex, slotIndex)}>
                              {#if diamondNote}
                                <button
                                  type="button"
                                  class={`placed-note diamond sixteenth ${cell.notes[0] && cell.notes[1] ? 'split' : 'single'}`}
                                  class:selected-note={selectedNoteKeys.has(noteSelectionKey(voiceIndex, 'pickup', -1, cellIndex, slotIndex))}
                                  data-selection-key={noteSelectionKey(voiceIndex, 'pickup', -1, cellIndex, slotIndex)}
                                  style={`--token-color:${diamondNote.color};`}
                                  draggable="true"
                                  title={placedNoteTitle(diamondNote)}
                                  on:click={(event) => handlePlacedNoteClick(event, voiceIndex, 'pickup', -1, cellIndex, slotIndex)}
                                  on:dragstart={(event) => handleCellDragStart(event, voiceIndex, 'pickup', -1, cellIndex, diamondNote, slotIndex)}
                                  on:dragend={handleAnyDragEnd}
                                  on:contextmenu={(event) => removeCellNote(event, voiceIndex, 'pickup', -1, cellIndex, slotIndex)}
                                >
                                  <svg
                                    class="token-glyph diamond"
                                    viewBox={PLACED_SIXTEENTH_HEX_VIEWBOX}
                                    preserveAspectRatio="none"
                                    aria-hidden="true"
                                    focusable="false"
                                  >
                                    <path d={PLACED_SIXTEENTH_HEX_PATH} />
                                  </svg>
                                  <span class="glyph-label">
                                    <NoteGlyph label={displayLabelFromText(diamondNote.label)} markerClass={scaleDegreeOneMarkerClass(diamondNote.noteId)} iconClass={noteIconClass(diamondNote.noteId)} />
                                  </span>
                                </button>
                              {:else}
                                <svg
                                  class="empty-sixteenth"
                                  viewBox={PLACED_SIXTEENTH_HEX_VIEWBOX}
                                  preserveAspectRatio="none"
                                  aria-hidden="true"
                                  focusable="false"
                                >
                                  <path d={PLACED_SIXTEENTH_HEX_PATH} />
                                </svg>
                              {/if}
                            </div>
                          {/each}
                        </div>
                      {/if}
                    {:else}
                      <svg
                        class="empty-oval"
                        viewBox="0 0 100 160"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <ellipse cx="50" cy="80" rx="47.5" ry="77.5" />
                      </svg>
                    {/if}
                    {#if pickupPreviewNote}
                      {#if pickupPreviewNote.shape === 'diamond'}
                        <div class="placed-sixteenth-pair drag-preview-sixteenth-pair" aria-hidden="true">
                          {#each SIXTEENTH_SLOTS as previewSlot}
                            <div class="sixteenth-slot" class:slot-drop-target={isDragPreviewSixteenthSlot(activePreviewPayload, dragOverCell, voiceIndex, 'pickup', -1, cellIndex, previewSlot)}>
                              {#if isDragPreviewSixteenthSlot(activePreviewPayload, dragOverCell, voiceIndex, 'pickup', -1, cellIndex, previewSlot)}
                                <div
                                  class="drag-preview-note placed-note diamond sixteenth single"
                                  style={`--token-color:${pickupPreviewNote.color};`}
                                >
                                  <svg
                                    class="token-glyph diamond"
                                    viewBox={PLACED_SIXTEENTH_HEX_VIEWBOX}
                                    preserveAspectRatio="none"
                                    aria-hidden="true"
                                    focusable="false"
                                  >
                                    <path d={PLACED_SIXTEENTH_HEX_PATH} />
                                  </svg>
                                  <span class="glyph-label">
                                    <NoteGlyph label={displayLabelFromText(pickupPreviewNote.label)} markerClass={scaleDegreeOneMarkerClass(pickupPreviewNote.noteId)} iconClass={noteIconClass(pickupPreviewNote.noteId)} />
                                  </span>
                                </div>
                              {/if}
                            </div>
                          {/each}
                        </div>
                      {:else if pickupPreviewNote.shape === 'oval'}
                        <div class="drag-preview-layer" aria-hidden="true">
                          <div class="drag-preview-note placed-note oval" style={`--token-color:${pickupPreviewNote.color};`}>
                            <svg class="token-glyph oval" viewBox="0 0 100 160" preserveAspectRatio="none" focusable="false">
                              <ellipse cx="50" cy="80" rx="47" ry="77" />
                            </svg>
                            <span class="glyph-label">
                              <NoteGlyph label={displayLabelFromText(pickupPreviewNote.label)} markerClass={scaleDegreeOneMarkerClass(pickupPreviewNote.noteId)} iconClass={noteIconClass(pickupPreviewNote.noteId)} />
                            </span>
                          </div>
                        </div>
                      {:else}
                        <div class="drag-preview-layer" aria-hidden="true">
                          <div
                            class="drag-preview-note placed-note circle"
                            class:drag-preview-circle-continuation={isCircleDragPreviewOnSecondMicrobeat(activePreviewPayload, dragOverCell, voiceIndex, 'pickup', -1, cellIndex)}
                            style={`--token-color:${pickupPreviewNote.color};`}
                          >
                            <svg class="token-glyph circle" viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
                              <ellipse cx="50" cy="50" rx="47" ry="47" />
                            </svg>
                            <span class="glyph-label">
                              <NoteGlyph label={displayLabelFromText(pickupPreviewNote.label)} markerClass={scaleDegreeOneMarkerClass(pickupPreviewNote.noteId)} iconClass={noteIconClass(pickupPreviewNote.noteId)} />
                            </span>
                          </div>
                        </div>
                      {/if}
                    {/if}
                  </div>
                {/each}
              {/if}
            {#each row.cells as cell, cellIndex}
              {@const mainPreviewNote = dragPreviewNote(activePreviewPayload, dragOverCell, voiceIndex, 'main', sourceRowIndex, cellIndex)}
              <div
                class="macrobeat-cell"
                class:has-note={cellHasNote(voiceIndex, sourceRowIndex, cellIndex)}
                class:circle-span-start={cell?.shape === 'circle' && cell.role === 'start' || isCircleDragPreviewSpanStart(activePreviewPayload, dragOverCell, voiceIndex, 'main', sourceRowIndex, cellIndex)}
                class:drop-target={isDropTarget(dragOverCell, voiceIndex, sourceRowIndex, cellIndex)}
                class:playback-start-selected={isPlaybackStartSelected('main', sourceRowIndex)}
                class:two-based-divider={(cellIndex + 1) % 2 === 0 && cellIndex < GRID_COLUMNS - 1}
                data-voice-index={voiceIndex}
                data-track-zone="main"
                data-row-index={rowIndex}
                data-cell-index={cellIndex}
                style={macrobeatCellInlineStyle('main', cellIndex, hasInlinePickup)}
                role="gridcell"
                tabindex={tapPlacementPayload || eraserMode ? 0 : -1}
                aria-label={`Voice ${voiceLabel(voiceIndex)} row ${sourceRowIndex + 1}, macrobeat ${Math.floor(cellIndex / MICROBEATS_PER_BEAT) + 1}, microbeat ${(cellIndex % MICROBEATS_PER_BEAT) + 1}`}
                on:mousemove={(event) => handleCellMouseMove(event, voiceIndex, 'main', sourceRowIndex, cellIndex)}
                on:dragover={(event) => handleCellDragOver(event, voiceIndex, 'main', sourceRowIndex, cellIndex)}
                on:drop={(event) => handleCellDrop(event, voiceIndex, 'main', sourceRowIndex, cellIndex)}
                on:pointerdown={(event) => handleCellPointerDown(event, voiceIndex, 'main', sourceRowIndex, cellIndex)}
                on:click={(event) => handleCellClick(event, voiceIndex, 'main', sourceRowIndex, cellIndex)}
                on:keydown={(event) => handleCellKeyDown(event, voiceIndex, 'main', sourceRowIndex, cellIndex)}
              >
                {#if cell}
                  {#if cell.shape === 'oval' && cell.notes[0]}
                    <button
                      type="button"
                      class="placed-note oval"
                      class:selected-note={selectedNoteKeys.has(noteSelectionKey(voiceIndex, 'main', sourceRowIndex, cellIndex, 0))}
                      data-selection-key={noteSelectionKey(voiceIndex, 'main', sourceRowIndex, cellIndex, 0)}
                      style={`--token-color:${cell.notes[0].color};`}
                      draggable="true"
                      title={placedNoteTitle(cell.notes[0])}
                      on:click={(event) => handlePlacedNoteClick(event, voiceIndex, 'main', sourceRowIndex, cellIndex, 0)}
                      on:dragstart={(event) => handleCellDragStart(event, voiceIndex, 'main', sourceRowIndex, cellIndex, cell.notes[0], 0)}
                      on:dragend={handleAnyDragEnd}
                      on:contextmenu={(event) => removeCellNote(event, voiceIndex, 'main', sourceRowIndex, cellIndex, 0)}
                    >
                      <svg
                        class="token-glyph oval"
                        viewBox="0 0 100 160"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <ellipse cx="50" cy="80" rx="47" ry="77" />
                      </svg>
                      <span class="glyph-label">
                        <NoteGlyph label={displayLabelFromText(cell.notes[0].label)} markerClass={scaleDegreeOneMarkerClass(cell.notes[0].noteId)} iconClass={noteIconClass(cell.notes[0].noteId)} />
                      </span>
                    </button>
                  {:else if cell.shape === 'circle' && cell.role === 'start' && cell.notes[0]}
                    <button
                      type="button"
                      class="placed-note circle"
                      class:selected-note={selectedNoteKeys.has(noteSelectionKey(voiceIndex, 'main', sourceRowIndex, cellIndex, 0))}
                      data-selection-key={noteSelectionKey(voiceIndex, 'main', sourceRowIndex, cellIndex, 0)}
                      style={`--token-color:${cell.notes[0].color};`}
                      draggable="true"
                      title={placedNoteTitle(cell.notes[0])}
                      on:click={(event) => handlePlacedNoteClick(event, voiceIndex, 'main', sourceRowIndex, cellIndex, 0)}
                      on:dragstart={(event) => handleCellDragStart(event, voiceIndex, 'main', sourceRowIndex, cellIndex, cell.notes[0], 0)}
                      on:dragend={handleAnyDragEnd}
                      on:contextmenu={(event) => removeCellNote(event, voiceIndex, 'main', sourceRowIndex, cellIndex, 0)}
                    >
                      <svg
                        class="token-glyph circle"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <ellipse cx="50" cy="50" rx="47" ry="47" />
                      </svg>
                      <span class="glyph-label">
                        <NoteGlyph label={displayLabelFromText(cell.notes[0].label)} markerClass={scaleDegreeOneMarkerClass(cell.notes[0].noteId)} iconClass={noteIconClass(cell.notes[0].noteId)} />
                      </span>
                    </button>
                  {:else if cell.shape === 'diamond'}
                    <div class="placed-sixteenth-pair">
                      {#each cell.notes as diamondNote, slotIndex}
                        <div class="sixteenth-slot" class:slot-drop-target={isSixteenthSlotDropTarget(activePreviewPayload, dragOverCell, voiceIndex, 'main', sourceRowIndex, cellIndex, slotIndex)}>
                          {#if diamondNote}
                            <button
                              type="button"
                              class={`placed-note diamond sixteenth ${cell.notes[0] && cell.notes[1] ? 'split' : 'single'}`}
                              class:selected-note={selectedNoteKeys.has(noteSelectionKey(voiceIndex, 'main', sourceRowIndex, cellIndex, slotIndex))}
                              data-selection-key={noteSelectionKey(voiceIndex, 'main', sourceRowIndex, cellIndex, slotIndex)}
                              style={`--token-color:${diamondNote.color};`}
                              draggable="true"
                              title={placedNoteTitle(diamondNote)}
                              on:click={(event) => handlePlacedNoteClick(event, voiceIndex, 'main', sourceRowIndex, cellIndex, slotIndex)}
                              on:dragstart={(event) => handleCellDragStart(event, voiceIndex, 'main', sourceRowIndex, cellIndex, diamondNote, slotIndex)}
                              on:dragend={handleAnyDragEnd}
                              on:contextmenu={(event) => removeCellNote(event, voiceIndex, 'main', sourceRowIndex, cellIndex, slotIndex)}
                            >
                              <svg
                                class="token-glyph diamond"
                                viewBox={PLACED_SIXTEENTH_HEX_VIEWBOX}
                                preserveAspectRatio="none"
                                aria-hidden="true"
                                focusable="false"
                              >
                                <path d={PLACED_SIXTEENTH_HEX_PATH} />
                              </svg>
                              <span class="glyph-label">
                                <NoteGlyph label={displayLabelFromText(diamondNote.label)} markerClass={scaleDegreeOneMarkerClass(diamondNote.noteId)} iconClass={noteIconClass(diamondNote.noteId)} />
                              </span>
                            </button>
                          {:else}
                            <svg
                              class="empty-sixteenth"
                              viewBox={PLACED_SIXTEENTH_HEX_VIEWBOX}
                              preserveAspectRatio="none"
                              aria-hidden="true"
                              focusable="false"
                            >
                              <path d={PLACED_SIXTEENTH_HEX_PATH} />
                            </svg>
                          {/if}
                        </div>
                      {/each}
                    </div>
                  {/if}
                {:else}
                  <svg
                    class="empty-oval"
                    viewBox="0 0 100 160"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <ellipse cx="50" cy="80" rx="47.5" ry="77.5" />
                  </svg>
                {/if}
                {#if mainPreviewNote}
                  {#if mainPreviewNote.shape === 'diamond'}
                    <div class="placed-sixteenth-pair drag-preview-sixteenth-pair" aria-hidden="true">
                      {#each SIXTEENTH_SLOTS as previewSlot}
                        <div class="sixteenth-slot" class:slot-drop-target={isDragPreviewSixteenthSlot(activePreviewPayload, dragOverCell, voiceIndex, 'main', sourceRowIndex, cellIndex, previewSlot)}>
                          {#if isDragPreviewSixteenthSlot(activePreviewPayload, dragOverCell, voiceIndex, 'main', sourceRowIndex, cellIndex, previewSlot)}
                            <div
                              class="drag-preview-note placed-note diamond sixteenth single"
                              style={`--token-color:${mainPreviewNote.color};`}
                            >
                              <svg
                                class="token-glyph diamond"
                                viewBox={PLACED_SIXTEENTH_HEX_VIEWBOX}
                                preserveAspectRatio="none"
                                aria-hidden="true"
                                focusable="false"
                              >
                                <path d={PLACED_SIXTEENTH_HEX_PATH} />
                              </svg>
                              <span class="glyph-label">
                                <NoteGlyph label={displayLabelFromText(mainPreviewNote.label)} markerClass={scaleDegreeOneMarkerClass(mainPreviewNote.noteId)} iconClass={noteIconClass(mainPreviewNote.noteId)} />
                              </span>
                            </div>
                          {/if}
                        </div>
                      {/each}
                    </div>
                  {:else if mainPreviewNote.shape === 'oval'}
                    <div class="drag-preview-layer" aria-hidden="true">
                      <div class="drag-preview-note placed-note oval" style={`--token-color:${mainPreviewNote.color};`}>
                        <svg class="token-glyph oval" viewBox="0 0 100 160" preserveAspectRatio="none" focusable="false">
                          <ellipse cx="50" cy="80" rx="47" ry="77" />
                        </svg>
                        <span class="glyph-label">
                          <NoteGlyph label={displayLabelFromText(mainPreviewNote.label)} markerClass={scaleDegreeOneMarkerClass(mainPreviewNote.noteId)} iconClass={noteIconClass(mainPreviewNote.noteId)} />
                        </span>
                      </div>
                    </div>
                  {:else}
                    <div class="drag-preview-layer" aria-hidden="true">
                      <div
                        class="drag-preview-note placed-note circle"
                        class:drag-preview-circle-continuation={isCircleDragPreviewOnSecondMicrobeat(activePreviewPayload, dragOverCell, voiceIndex, 'main', sourceRowIndex, cellIndex)}
                        style={`--token-color:${mainPreviewNote.color};`}
                      >
                        <svg class="token-glyph circle" viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
                          <ellipse cx="50" cy="50" rx="47" ry="47" />
                        </svg>
                        <span class="glyph-label">
                          <NoteGlyph label={displayLabelFromText(mainPreviewNote.label)} markerClass={scaleDegreeOneMarkerClass(mainPreviewNote.noteId)} iconClass={noteIconClass(mainPreviewNote.noteId)} />
                        </span>
                      </div>
                    </div>
                  {/if}
                {/if}
              </div>
            {/each}
            </div>
            {#if renderedRowIndex === renderedTrackRows.length - 1 && (!isStudentView || !activeStudentView.hideCanvasActions)}
              <div class="measure-row-actions" aria-label="Measure controls" on:pointerdown={(event) => event.stopPropagation()}>
                <button type="button" on:click={removeRow} disabled={sharedRowCount() <= 1} title="Remove measure" aria-label="Remove measure">-</button>
                <button type="button" on:click={addRow} title="Add measure" aria-label="Add measure">+</button>
              </div>
            {/if}
          </div>
        </article>
        {/each}
      </div>
    </div>

    {#if boxSelectionState && boxSelectionOverlayStyle()}
      <div class="box-selection-marquee" style={boxSelectionOverlayStyle() ?? ''} aria-hidden="true"></div>
    {/if}

    <div class="karaoke-overlay" aria-hidden="true">
      {#each VOICE_INDEXES as overlayVoiceIndex (overlayVoiceIndex)}
        <div
          class="karaoke-ball"
          class:karaoke-ball--voice-a={voiceCount > 1 && overlayVoiceIndex === 0}
          class:karaoke-ball--voice-b={voiceCount > 1 && overlayVoiceIndex === 1}
          class:karaoke-ball--voice-c={voiceCount > 1 && overlayVoiceIndex === 2}
          class:karaoke-ball--voice-d={voiceCount > 1 && overlayVoiceIndex === 3}
          class:karaoke-ball--count-in={countInDisplayNumber !== null}
          bind:this={karaokeBallElements[overlayVoiceIndex]}
          style={karaokeBallOverlayStyle(overlayVoiceIndex) ?? 'display:none;'}
        >
          {#if countInDisplayNumber !== null && isVoiceVisible(overlayVoiceIndex)}
            <span class="karaoke-ball-count">{countInDisplayNumber}</span>
          {/if}
        </div>
      {/each}
    </div>

  </section>

  {#if cursorPreview && !cursorOverCanvas}
    <div
      class="cursor-ghost-wrapper"
      style={`left:${cursorPreview.x}px; top:${cursorPreview.y}px; --token-color:${cursorPreview.note.color};`}
      aria-hidden="true"
    >
      {#if cursorPreview.note.shape === 'oval'}
        <div class="drag-preview-note placed-note oval">
          <svg class="token-glyph oval" viewBox="0 0 100 160" preserveAspectRatio="none" focusable="false">
            <ellipse cx="50" cy="80" rx="47" ry="77" />
          </svg>
          <span class="glyph-label">
            <NoteGlyph label={displayLabelFromText(cursorPreview.note.label)} markerClass={scaleDegreeOneMarkerClass(cursorPreview.note.noteId)} iconClass={noteIconClass(cursorPreview.note.noteId)} />
          </span>
        </div>
      {:else if cursorPreview.note.shape === 'circle'}
        <div class="drag-preview-note placed-note circle">
          <svg class="token-glyph circle" viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
            <ellipse cx="50" cy="50" rx="47" ry="47" />
          </svg>
          <span class="glyph-label">
            <NoteGlyph label={displayLabelFromText(cursorPreview.note.label)} markerClass={scaleDegreeOneMarkerClass(cursorPreview.note.noteId)} iconClass={noteIconClass(cursorPreview.note.noteId)} />
          </span>
        </div>
      {:else}
        <div class="drag-preview-note placed-note diamond sixteenth single">
          <svg class="token-glyph diamond" viewBox={PLACED_SIXTEENTH_HEX_VIEWBOX} preserveAspectRatio="none" focusable="false">
            <path d={PLACED_SIXTEENTH_HEX_PATH} />
          </svg>
          <span class="glyph-label">
            <NoteGlyph label={displayLabelFromText(cursorPreview.note.label)} markerClass={scaleDegreeOneMarkerClass(cursorPreview.note.noteId)} iconClass={noteIconClass(cursorPreview.note.noteId)} />
          </span>
        </div>
      {/if}
    </div>
  {/if}
</main>

<dialog
  bind:this={settingsDialog}
  class="settings-dialog"
  on:close={() => (settingsOpen = false)}
>
  <div class="settings-dialog-header">
    <h2>Settings</h2>
    <button type="button" class="settings-close-btn" on:click={() => (settingsOpen = false)} aria-label="Close settings">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    </button>
  </div>
  <div class="settings-dialog-body">
    <div class="settings-section">
      <h3 class="settings-section-label">Display</h3>
      <div class="settings-row">
        <div class="settings-field">
          <label for="settings-root-tonic-select">Tonic Pitch</label>
          <select id="settings-root-tonic-select" value={state.rootNoteTonic} on:change={handleRootTonicChange}>
            {#each TONIC_OPTIONS as tonic}
              <option value={tonic.value}>{tonic.label}</option>
            {/each}
          </select>
        </div>
        {#if !isStudentView || !activeStudentView.hideMainVoice}
        <div class="settings-field">
          <label for="settings-main-voice-select">Main Voice</label>
          <select id="settings-main-voice-select" value={state.mainPlaybackVoice} on:change={setMainVoice}>
            {#each voiceOptions as voice}
              <option value={voice}>{voice}</option>
            {/each}
          </select>
        </div>
        {/if}
        <div class="settings-field">
          <label for="settings-color-palette-select">Palette</label>
          <select id="settings-color-palette-select" value={colorPaletteMode} on:change={handleColorPaletteModeChange}>
            <option value="oklch">OKLCH</option>
            <option value="chromanotes">ChromaNotes</option>
          </select>
        </div>
        <div class="settings-field">
          <label for="settings-track-style-select">Track style</label>
          <select id="settings-track-style-select" value={trackStyle} on:change={handleTrackStyleChange}>
            <option value="stacked">Stacked</option>
            <option value="horizontal">Horizontal highway</option>
          </select>
        </div>
        <div class="settings-slider-field">
          <label for="settings-playback-highway-height">Highway height</label>
          <input
            id="settings-playback-highway-height"
            type="range"
            min={PLAYBACK_HIGHWAY_HEIGHT_PERCENT_MIN}
            max={PLAYBACK_HIGHWAY_HEIGHT_PERCENT_MAX}
            step="1"
            value={playbackHighwayHeightPercent}
            on:input={handlePlaybackHighwayHeightInput}
            title="Playback highway height"
          />
          <output class="value-readout" for="settings-playback-highway-height">{playbackHighwayHeightPercent}%</output>
          <button type="button" class="settings-reset-btn" on:click={resetPlaybackHighwayHeight} disabled={playbackHighwayHeightPercent === PLAYBACK_HIGHWAY_HEIGHT_PERCENT_DEFAULT}>
            Reset
          </button>
        </div>
        <div class="settings-field settings-checkbox-field">
          <label>
            <input type="checkbox" bind:checked={showAccidentals} />
            Accidentals
          </label>
        </div>
        <div class="settings-field settings-checkbox-field">
          <label>
            <input type="checkbox" bind:checked={showEighthsBank} />
            Eighths bank
          </label>
        </div>
        <div class="settings-field settings-checkbox-field">
          <label>
            <input type="checkbox" bind:checked={showSixteenthsBank} />
            Sixteenths bank
          </label>
        </div>
      </div>
    </div>
    {#if !isStudentView || !activeStudentView.hidePickupBeats}
    <div class="settings-section">
      <h3 class="settings-section-label">Pickup Beats</h3>
      <div class="settings-row">
        <div class="pickup-controls" role="group" aria-label="Anacrusis pickup beats">
          {#each [0, 1, 2, 3] as beatCount}
            <button type="button" class:active={pickupBeats === beatCount} on:click={() => setPickupBeats(beatCount)}>
              {beatCount}
            </button>
          {/each}
        </div>
      </div>
    </div>
    {/if}
    <div class="settings-section">
      <h3 class="settings-section-label">Voices</h3>
      <div class="settings-row">
        <div class="settings-field">
          <label for="settings-voice-count-select">Canvas voices</label>
          <select id="settings-voice-count-select" value={String(voiceCount)} on:change={handleVoiceCountModeChange}>
            <option value="1">1 voice</option>
            <option value="2">2 voices</option>
            <option value="3">3 voices</option>
            <option value="4">4 voices</option>
          </select>
        </div>
        {#if voiceCount > 1}
          <div class="settings-field">
            <label for="settings-voice-layout-select">Row layout</label>
            <select id="settings-voice-layout-select" value={voiceLayoutMode} on:change={handleVoiceLayoutModeChange}>
              <option value="intertwined">Intertwined</option>
              <option value="separate">Grouped by voice</option>
            </select>
          </div>
        {/if}
      </div>
    </div>
    <div class="settings-section">
      <h3 class="settings-section-label">Audio</h3>
      <div class="settings-row">
        <div class="settings-slider-field">
          <label for="settings-metronome-volume">Metronome volume</label>
          <input
            id="settings-metronome-volume"
            type="range"
            min="0"
            max="100"
            step="1"
            value={metronomeVolume * 100}
            on:input={setMetronomeVolume}
            title="Metronome volume"
          />
          <output class="value-readout" for="settings-metronome-volume">{Math.round(metronomeVolume * 100)}%</output>
        </div>
      </div>
    </div>
    <div class="settings-section">
      <h3 class="settings-section-label">Karaoke Ball</h3>
      <div class="settings-row">
        <div class="settings-field settings-slider-field">
          <label for="settings-karaoke-arc-height">Arc height</label>
          <input
            id="settings-karaoke-arc-height"
            type="range"
            min={KARAOKE_ARC_HEIGHT_MIN}
            max={KARAOKE_ARC_HEIGHT_MAX}
            step="1"
            value={karaokeArcHeightPx}
            on:input={handleKaraokeArcHeightInput}
            title="Karaoke arc height"
          />
          <output class="value-readout" for="settings-karaoke-arc-height">{karaokeArcHeightPx}px</output>
        </div>
        <div class="settings-slider-field">
          <label for="settings-karaoke-ball-size">Ball size</label>
          <input
            id="settings-karaoke-ball-size"
            type="range"
            min={KARAOKE_BALL_SIZE_MIN}
            max={KARAOKE_BALL_SIZE_MAX}
            step="1"
            value={karaokeBallSizePx}
            on:input={handleKaraokeBallSizeInput}
            title="Karaoke ball size"
          />
          <output class="value-readout" for="settings-karaoke-ball-size">{karaokeBallSizePx}px</output>
        </div>
      </div>
    </div>
  </div>
</dialog>

{#if shareDecodeError}
  <div class="share-version-banner" role="alert">
    {shareDecodeError}
    <button type="button" class="share-version-dismiss" on:click={() => (shareDecodeError = null)} aria-label="Dismiss">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    </button>
  </div>
{/if}

{#if libraryModalOpen}
  <div class="share-modal-backdrop" on:click={closeLibraryModal} role="presentation"></div>
  <div class="share-modal library-modal" role="dialog" aria-modal="true" aria-label="Sketch library">
    <div class="share-modal-header">
      <h2>Sketch Library</h2>
      <button type="button" class="share-modal-close" on:click={closeLibraryModal} aria-label="Close">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>
    <div class="library-modal-body">
      <section class="library-save-panel">
        <label class="library-panel-label" for="library-file-name">File name</label>
        <div class="library-save-row">
          <input
            id="library-file-name"
            type="text"
            class="load-code-input library-file-name-input"
            bind:value={libraryFileName}
            placeholder="Boomwhacker Sketch"
            aria-label="Library file name"
            on:keydown={(event) => { if (event.key === 'Enter') void handleLibrarySaveAs(); }}
          />
          <button type="button" class="load-code-btn" on:click={() => void handleLibrarySaveAs()} disabled={libraryBusy}>
            Save As
          </button>
        </div>
        <p class="library-help">
          Save As stores the current sketch, tempo, tonic, layout, and playback settings as a new library item.
        </p>
      </section>

      {#if libraryError}
        <p class="share-error library-feedback">{libraryError}</p>
      {/if}
      {#if libraryStatus}
        <p class="library-status">{libraryStatus}</p>
      {/if}

      <section class="library-list-panel">
        <p class="library-panel-label">Saved sketches</p>
        {#if libraryBusy && libraryEntries.length === 0}
          <p class="library-empty-state">Loading library…</p>
        {:else if libraryEntries.length === 0}
          <p class="library-empty-state">No saved sketches yet.</p>
        {:else}
          <div class="library-entry-list" role="listbox" aria-label="Saved sketches">
            {#each libraryEntries as entry (entry.id)}
              <button
                type="button"
                class="library-entry"
                class:library-entry--selected={librarySelectedEntryId === entry.id}
                on:click={() => selectLibraryEntry(entry.id)}
                aria-pressed={librarySelectedEntryId === entry.id}
              >
                <span class="library-entry-copy">
                  <span class="library-entry-name">{entry.name}</span>
                  <span class="library-entry-meta">{formatLibrarySavedAt(entry.savedAt)}</span>
                </span>
              </button>
            {/each}
          </div>
        {/if}
      </section>

      {#if selectedLibraryEntry()}
        <div class="library-actions">
          <button type="button" class="load-code-open-btn" on:click={() => requestLibraryAction('open')} disabled={libraryBusy}>
            Open
          </button>
          <button type="button" class="load-code-open-btn" on:click={handleLibraryExport} disabled={libraryBusy}>
            Export
          </button>
          <button type="button" class="library-delete-btn" on:click={() => requestLibraryAction('delete')} disabled={libraryBusy}>
            Delete
          </button>
        </div>
      {/if}

      {#if libraryPendingAction}
        {@const pendingLibraryEntryName = libraryEntries.find((entry) => entry.id === libraryPendingAction?.entryId)?.name ?? 'this sketch'}
        <div class="library-confirm-panel" role="alert">
          <p class="library-confirm-copy">
            {#if libraryPendingAction.type === 'open'}
              Open "{pendingLibraryEntryName}" and replace the current canvas?
            {:else}
              Delete "{pendingLibraryEntryName}" from the library?
            {/if}
          </p>
          <div class="library-confirm-actions">
            <button type="button" class="load-code-btn" on:click={() => void confirmLibraryAction()} disabled={libraryBusy}>
              {#if libraryPendingAction.type === 'open'}Open{:else}Delete{/if}
            </button>
            <button type="button" class="load-code-cancel" on:click={cancelLibraryAction} disabled={libraryBusy}>
              Cancel
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

{#if shareModalOpen}
  <div class="share-modal-backdrop" on:click={() => (shareModalOpen = false)} role="presentation"></div>
  <div class="share-modal" role="dialog" aria-modal="true" aria-label="Share composition">
    <div class="share-modal-header">
      <h2>Share Composition</h2>
      <button type="button" class="share-modal-close" on:click={() => (shareModalOpen = false)} aria-label="Close">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>
    {#if shareFailed}
      <p class="share-error">Share link could not be generated. Please try again.</p>
    {:else}
      {#if shareUrl.length > SHARE_URL_SEVERE_LENGTH}
        <div class="share-warning share-warning--severe" role="status">
          This link is too long for most email clients. Use <strong>Copy Code</strong> for safer sharing.
        </div>
      {:else if shareUrl.length > SHARE_URL_WARN_LENGTH}
        <div class="share-warning" role="status">
          This link may break in some email clients. Use <strong>Copy Code</strong> for safer sharing.
        </div>
      {/if}
      <p class="share-instructions">Share via browser link:</p>
      <div class="share-url-row">
        <span class="share-url-display" title={shareUrl}>{shareUrl}</span>
        <button
          type="button"
          class="share-copy-btn"
          class:copied={shareCopied}
          disabled={shareUrl.length > SHARE_URL_SEVERE_LENGTH}
          on:click={copyShareUrl}
        >
          {#if shareCopied}Copied!{:else}Copy Link{/if}
        </button>
      </div>
      <div class="share-code-section">
        <p class="share-instructions">Share via code (email-safe):</p>
        <div class="share-url-row">
          <span class="share-url-display" title={shareCode}>{shareCode}</span>
          <button type="button" class="share-copy-btn share-copy-btn--code" class:copied={shareCodeCopied} on:click={copyShareCode}>
            {#if shareCodeCopied}Copied!{:else}Copy Code{/if}
          </button>
          <button type="button" class="gmail-btn" on:click={openGmailShare} title="Open Gmail compose with this code" aria-label="Share via Gmail">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#4caf50" d="M45 16.2l-5 2.75-5 4.75L35 40h7c1.657 0 3-1.343 3-3z"/>
              <path fill="#1e88e5" d="M3 16.2l3.614 1.71L13 23.7V40H6c-1.657 0-3-1.343-3-3z"/>
              <polygon fill="#e53935" points="35,11.2 24,19.45 13,11.2 12,17 13,23.7 24,31.45 35,23.7 36,17"/>
              <path fill="#c62828" d="M3 12.298V16.2l10 7.5V11.2L9.876 8.859C9.132 8.301 8.228 8 7.298 8 4.924 8 3 9.924 3 12.298z"/>
              <path fill="#fbc02d" d="M45 12.298V16.2l-10 7.5V11.2l3.124-2.341C38.868 8.301 39.772 8 40.702 8 43.076 8 45 9.924 45 12.298z"/>
            </svg>
          </button>
        </div>
      </div>
    {/if}
    {#if !isStudentView}
    <div class="sv-launch-section">
      <button type="button" class="sv-launch-btn" on:click={() => { shareModalOpen = false; studentViewModalOpen = true; }}>
        Share Student View…
      </button>
      <p class="sv-launch-description">Customize which controls students can see.</p>
    </div>
    {/if}
    <div class="share-load-section">
      <p class="share-instructions">Load from code:</p>
      <div class="load-code-row">
        <input
          type="text"
          class="load-code-input"
          bind:value={loadCodeValue}
          placeholder="Paste a composition code…"
          aria-label="Composition code"
          on:keydown={(e) => { if (e.key === 'Enter') void handleLoadFromCode(); }}
        />
        <button type="button" class="load-code-btn" on:click={() => void handleLoadFromCode()}>Load</button>
      </div>
    </div>
  </div>
{/if}

{#if studentViewModalOpen}
  <div class="share-modal-backdrop" on:click={() => (studentViewModalOpen = false)} role="presentation"></div>
  <div class="share-modal sv-modal" role="dialog" aria-modal="true" aria-label="Share Student View">
    <div class="share-modal-header">
      <h2>Share Student View</h2>
      <button type="button" class="share-modal-close" on:click={() => (studentViewModalOpen = false)} aria-label="Close">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>

    <p class="sv-intro">Check items to hide them from students in the shared link.</p>

    <div class="sv-section">
      <h3 class="sv-section-title">Controls</h3>
      <label class="sv-toggle-row">
        <input type="checkbox" bind:checked={studentViewSettings.hideMainVoice} />
        <span class="sv-toggle-label">Main Voice</span>
        <span class="sv-toggle-desc" class:sv-faded={studentViewSettings.hideMainVoice}>Voice waveform selector in Settings (sine, triangle, sawtooth, square)</span>
      </label>
      <label class="sv-toggle-row">
        <input type="checkbox" bind:checked={studentViewSettings.hideVolumeSlider} />
        <span class="sv-toggle-label">Volume Slider</span>
        <span class="sv-toggle-desc" class:sv-faded={studentViewSettings.hideVolumeSlider}>Main playback volume control</span>
      </label>
      <label class="sv-toggle-row">
        <input type="checkbox" bind:checked={studentViewSettings.hideGearSettings} />
        <span class="sv-toggle-label">Settings (gear icon)</span>
        <span class="sv-toggle-desc" class:sv-faded={studentViewSettings.hideGearSettings}>Opens the settings panel (color palette, accidentals, drone)</span>
      </label>
      <label class="sv-toggle-row">
        <input type="checkbox" bind:checked={studentViewSettings.hidePickupBeats} />
        <span class="sv-toggle-label">Pickup Beats</span>
        <span class="sv-toggle-desc" class:sv-faded={studentViewSettings.hidePickupBeats}>Anacrusis buttons (0–3 pickup beats)</span>
      </label>
      <label class="sv-toggle-row">
        <input type="checkbox" bind:checked={studentViewSettings.hideCanvasActions} />
        <span class="sv-toggle-label">Canvas Actions</span>
        <span class="sv-toggle-desc" class:sv-faded={studentViewSettings.hideCanvasActions}>Add Row, Remove Row, and Clear Canvas buttons</span>
      </label>
    </div>

    <div class="sv-section">
      <h3 class="sv-section-title">Note Banks</h3>
      <label class="sv-toggle-row">
        <input type="checkbox" bind:checked={studentViewSettings.hideEighthBank} />
        <span class="sv-toggle-label">Eighth Note Bank</span>
        <span class="sv-toggle-desc" class:sv-faded={studentViewSettings.hideEighthBank}>Oval note tokens for eighth notes</span>
      </label>
      <label class="sv-toggle-row">
        <input type="checkbox" bind:checked={studentViewSettings.hideSixteenthBank} />
        <span class="sv-toggle-label">Sixteenth Note Bank</span>
        <span class="sv-toggle-desc" class:sv-faded={studentViewSettings.hideSixteenthBank}>Diamond note tokens for sixteenth notes</span>
      </label>
    </div>

    <div class="sv-section">
      <h3 class="sv-section-title">Tempo Display</h3>
      <label class="sv-toggle-row">
        <input type="checkbox" bind:checked={studentViewSettings.hideQuarterTempo} />
        <span class="sv-toggle-label">Quarter Note BPM row</span>
        <span class="sv-toggle-desc" class:sv-faded={studentViewSettings.hideQuarterTempo}>Quarter note tempo number and stepper</span>
      </label>
      <label class="sv-toggle-row">
        <input type="checkbox" bind:checked={studentViewSettings.hideTempoSlider} />
        <span class="sv-toggle-label">Tempo Slider</span>
        <span class="sv-toggle-desc" class:sv-faded={studentViewSettings.hideTempoSlider}>The vertical drag slider alongside the BPM rows</span>
      </label>
    </div>

    <div class="sv-generate-section">
      <button type="button" class="sv-generate-btn" on:click={() => void handleShareStudentView()}>
        Generate Student Link
      </button>
    </div>

    {#if shareStudentViewUrl}
      {#if shareStudentViewUrl.length > SHARE_URL_WARN_LENGTH}
        <div class="share-warning" role="status">
          This link may break in some email clients. Use <strong>Copy Code</strong> for safer sharing.
        </div>
      {/if}
      <p class="share-instructions">Share via browser link:</p>
      <div class="share-url-row">
        <span class="share-url-display" title={shareStudentViewUrl}>{shareStudentViewUrl}</span>
        <button type="button" class="share-copy-btn" class:copied={shareStudentViewCopied} on:click={copyStudentViewUrl}>
          {#if shareStudentViewCopied}Copied!{:else}Copy Link{/if}
        </button>
      </div>
      <div class="share-code-section">
        <p class="share-instructions">Share via code (email-safe):</p>
        <div class="share-url-row">
          <span class="share-url-display" title={shareStudentViewCode}>{shareStudentViewCode}</span>
          <button type="button" class="share-copy-btn share-copy-btn--code" class:copied={shareStudentViewCodeCopied} on:click={copyStudentViewCode}>
            {#if shareStudentViewCodeCopied}Copied!{:else}Copy Code{/if}
          </button>
          <button type="button" class="gmail-btn" on:click={openGmailShareStudentView} title="Open Gmail compose with this code" aria-label="Share via Gmail">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#4caf50" d="M45 16.2l-5 2.75-5 4.75L35 40h7c1.657 0 3-1.343 3-3z"/>
              <path fill="#1e88e5" d="M3 16.2l3.614 1.71L13 23.7V40H6c-1.657 0-3-1.343-3-3z"/>
              <polygon fill="#e53935" points="35,11.2 24,19.45 13,11.2 12,17 13,23.7 24,31.45 35,23.7 36,17"/>
              <path fill="#c62828" d="M3 12.298V16.2l10 7.5V11.2L9.876 8.859C9.132 8.301 8.228 8 7.298 8 4.924 8 3 9.924 3 12.298z"/>
              <path fill="#fbc02d" d="M45 12.298V16.2l-10 7.5V11.2l3.124-2.341C38.868 8.301 39.772 8 40.702 8 43.076 8 45 9.924 45 12.298z"/>
            </svg>
          </button>
        </div>
      </div>
    {/if}
  </div>
{/if}
