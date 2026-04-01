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
    type TonicValue,
  } from '@mlt/boomwhacker-sketchpad-core';
  import {
    deleteSketchpadLibraryEntry,
    listSketchpadLibraryEntries,
    saveSketchpadLibraryEntry,
    type SketchpadLibraryEntry,
  } from './libraryStore.js';

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

  type NoteIconId = 'clap' | 'stomp';

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

  type VoiceIndex = 0 | 1;

  type VoiceCountMode = 1 | 2;

  type VoiceLayoutMode = 'intertwined' | 'separate';

  type TrackStyle = 'stacked' | 'horizontal';

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
    voices?: PersistedVoiceCanvas[];
  };

  type CanvasHistorySnapshot = {
    pickupBeats: number;
    voiceCount: VoiceCountMode;
    voiceLayoutMode: VoiceLayoutMode;
    voices: [PersistedVoiceCanvas, PersistedVoiceCanvas];
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
  };

  type GridDropTarget = GridCellRef & {
    voiceIndex: VoiceIndex;
    sixteenthSlot: SixteenthSlot | null;
  };

  type KaraokeAnchor = {
    rowIndex: number;
    leftPercent: number;
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

  type KaraokeOverlayBall = {
    voiceIndex: VoiceIndex;
    style: string | null;
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

  const PERCUSSION_NOTE_IDS = ['clap', 'stomp'] as const;

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
  ];

  const SUPPLEMENTAL_NOTE_COLORS = {
    clap: '#f6c85f',
    stomp: '#c58b66',
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
  const countInIconUrl = new URL('./assets/count-in.svg', import.meta.url).href;
  const metronomeIconUrl = new URL('./assets/metronome.svg', import.meta.url).href;
  const loopIconUrl = new URL('./assets/loop.svg', import.meta.url).href;
  const volumeIconUrl = new URL('./assets/volume.svg', import.meta.url).href;
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
  const DEFAULT_TRACK_STYLE: TrackStyle = 'stacked';
  const VOICE_INDEXES = [0, 1] as const;
  const HORIZONTAL_PLAYBACK_SCROLL_AHEAD_RATIO = 0.34;

  const voiceOptions: OscillatorType[] = ['sine', 'square', 'triangle', 'sawtooth'];

  let state: BoomwhackerSketchpadState = model.getState();

  let audioReady = false;
  let audioStartPromise: Promise<AudioReadinessResult> | null = null;

  let isPlaying = false;
  let isLooping = false;
  let playbackIndex = 0;
  let playbackTimer: ReturnType<typeof setInterval> | null = null;
  let pendingPlaybackTimeouts = new Set<ReturnType<typeof setTimeout>>();
  let voicePlaybackCursors: [GridCellRef | null, GridCellRef | null] = [null, null];
  let voiceKaraokeBallRowIndexes: [number | null, number | null] = [null, null];
  let voiceKaraokeBallLeftPercents: [number, number] = [50, 50];
  let voiceKaraokeBallPinnedLeftPxs: [number | null, number | null] = [null, null];
  let voiceKaraokeBallArcOffsetPxs: [number, number] = [0, 0];
  let karaokeArcHeightPx = 64;
  let karaokeBallSizePx = 40;
  let countInEnabled = true;
  let macrobeatMetronomeEnabled = false;
  let countInDisplayNumber: number | null = null;
  let metronomeVolume = DEFAULT_METRONOME_VOLUME;
  let voiceKaraokeAnchors: [KaraokeAnchor | null, KaraokeAnchor | null] = [null, null];
  let voiceKaraokeAnimationFrames: [number | null, number | null] = [null, null];
  let voiceKaraokeAnimationTokens: [number, number] = [0, 0];
  let horizontalPlaybackHighway: HorizontalPlaybackHighwayState = {
    activationIndex: null,
    pinnedVoiceIndex: null,
    referenceViewportLeftPx: null,
  };
  let horizontalPlaybackScrollFrame: number | null = null;
  let horizontalPlaybackScrollToken = 0;
  let horizontalPlaybackRunwayPx = 0;
  let voiceHorizontalPlaybackLaneShiftPxs: [number, number] = [0, 0];
  let voiceHorizontalPlaybackLaneShiftFrames: [number | null, number | null] = [null, null];
  let voiceHorizontalPlaybackLaneShiftTokens: [number, number] = [0, 0];
  let voiceTrackRowElements: [Array<HTMLElement | null>, Array<HTMLElement | null>] = [[], []];
  let voicePlaybackHighlights: [PlaybackHighlight | null, PlaybackHighlight | null] = [null, null];
  let voicePlaybackHighlightAnchors: [KaraokeAnchor | null, KaraokeAnchor | null] = [null, null];
  let voicePlaybackPulseFlips: [boolean, boolean] = [false, false];
  let voicePlayedCellIndexes: [Set<number>, Set<number>] = [new Set<number>(), new Set<number>()];

  let dragPayload: DragPayload | null = null;
  let dragOverCell: GridDropTarget | null = null;
  let tapPlacementPayload: DragPayload | null = null;
  let activePreviewPayload: DragPayload | null = null;
  let cursorPreview: { note: PlacedNote; x: number; y: number } | null = null;
  let cursorOverCanvas = false;
  let pendingBankTouchActivation: PendingBankTouchActivation | null = null;
  let suppressNextBankClick = false;
  let pickupPreviewLogKey: string | null = null;
  let mobileLayoutLogKey: string | null = null;
  let adaptiveLayoutLogKey: string | null = null;
  let keyboardHighlightedNoteId: string | null = null;
  let viewportFitMode = false;
  let adaptiveLayout: AdaptiveLayoutConfig = ADAPTIVE_LAYOUT_DEFAULT;
  let colorPaletteMode: ColorPaletteMode = 'chromanotes';
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
  let pickupBeatsModalOpen = false;
  let studentViewSettings: StudentViewSettings = {};
  let shareStudentViewUrl = '';
  let shareStudentViewCode = '';
  let shareStudentViewCopied = false;
  let shareStudentViewCodeCopied = false;
  let isStudentView = false;
  let activeStudentView: StudentViewSettings = {};
  let volumePopupOpen = false;
  let volumeControlWrapper: HTMLDivElement | null = null;
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
  let voicePickupRows: [GridRow, GridRow] = [createEmptyRow('pickup_a'), createEmptyRow('pickup_b')];
  let voiceRows: [GridRow[], GridRow[]] = [
    Array.from({ length: INITIAL_ROWS }, () => createEmptyRow('row_a')),
    Array.from({ length: INITIAL_ROWS }, () => createEmptyRow('row_b')),
  ];
  let karaokeOverlayBalls: KaraokeOverlayBall[] = [];
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

  $: activePreviewPayload = dragPayload ?? tapPlacementPayload;
  $: showToolbarEighthBank = (!isStudentView || !activeStudentView.hideEighthBank) && showEighthsBank;
  $: showLowerSixteenthBank = (!isStudentView || !activeStudentView.hideSixteenthBank) && showSixteenthsBank;
  $: {
    trackStyle;
    canvasScrollRevision;
    horizontalPlaybackHighway.referenceViewportLeftPx;
    const scrollShellWidth = canvasScrollShellElement?.clientWidth ?? 0;
    horizontalPlaybackRunwayPx =
      trackStyle === 'horizontal' && horizontalPlaybackHighway.referenceViewportLeftPx !== null
        ? Math.max(0, scrollShellWidth - horizontalPlaybackHighway.referenceViewportLeftPx)
        : 0;
  }
  $: {
    voiceKaraokeBallRowIndexes;
    voiceKaraokeBallLeftPercents;
    voiceKaraokeBallArcOffsetPxs;
    karaokeBallSizePx;
    canvasScrollRevision;
    karaokeOverlayBalls = VOICE_INDEXES.map((voiceIndex) => ({
      voiceIndex,
      style: karaokeBallOverlayStyle(voiceIndex),
    }));
  }
  $: {
    voiceRows;
    voicePickupRows;
    voiceCount;
    voiceLayoutMode;
    trackStyle;
    renderedTrackRows = buildRenderedTrackRows();
  }

  $: if (canvasPersistenceReady) {
    voiceRows;
    voicePickupRows;
    pickupBeats;
    voiceCount;
    voiceLayoutMode;
    trackStyle;
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
    window.addEventListener('pointerdown', handleDocumentPointerDownForVolumePopup);
    window.addEventListener('pointermove', handleWindowPointerMoveForBankActivation);
    window.addEventListener('pointerup', handleWindowPointerUpForBankActivation);
    window.addEventListener('pointercancel', handleWindowPointerCancelForBankActivation);
    const handleViewportDiagnostics = () => {
      updateViewportFitMode();
      updateTapPlacementHintVisibility();
      updateAdaptiveLayout();
      queueTempoSliderLayoutSnapshot('Viewport changed.');
      queueMobileLayoutSnapshot('Viewport changed.');
    };
    const handleVisualViewportDiagnostics = () => {
      updateViewportFitMode();
      updateTapPlacementHintVisibility();
      updateAdaptiveLayout();
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
      window.removeEventListener('pointerdown', handleDocumentPointerDownForVolumePopup);
      window.removeEventListener('pointermove', handleWindowPointerMoveForBankActivation);
      window.removeEventListener('pointerup', handleWindowPointerUpForBankActivation);
      window.removeEventListener('pointercancel', handleWindowPointerCancelForBankActivation);
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

  function voiceLabel(voiceIndex: VoiceIndex): 'A' | 'B' {
    return voiceIndex === 0 ? 'A' : 'B';
  }

  function voiceKey(voiceIndex: VoiceIndex): 'a' | 'b' {
    return voiceIndex === 0 ? 'a' : 'b';
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
    return voiceCount === 2 ? [...VOICE_INDEXES] : [0];
  }

  function isVoiceVisible(voiceIndex: VoiceIndex): boolean {
    return voiceIndex === 0 || voiceCount === 2;
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

  function ensureVoiceRowCount(rows: GridRow[], voiceIndex: VoiceIndex, rowCount: number): GridRow[] {
    if (rows.length === rowCount) return rows;

    const nextRows = rows.slice(0, rowCount);
    while (nextRows.length < rowCount) {
      nextRows.push(createEmptyRow(`row_${voiceKey(voiceIndex)}`));
    }

    return nextRows;
  }

  function normalizeVoiceRows(
    nextVoiceRows: [GridRow[], GridRow[]],
    preferredRowCount: number | null = null,
  ): [GridRow[], GridRow[]] {
    const rowCount = Math.max(preferredRowCount ?? 0, nextVoiceRows[0].length, nextVoiceRows[1].length, 1);
    return [
      ensureVoiceRowCount(nextVoiceRows[0], 0, rowCount),
      ensureVoiceRowCount(nextVoiceRows[1], 1, rowCount),
    ];
  }

  function buildRenderedTrackRows(): RenderedTrackRow[] {
    const rowCount = sharedRowCount();
    const rows: RenderedTrackRow[] = [];

    if (voiceCount === 1) {
      for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
        rows.push({
          voiceIndex: 0,
          rowIndex,
          key: `voice-a-${voiceRows[0][rowIndex]?.id ?? rowIndex}`,
          row: voiceRows[0][rowIndex],
          pickupRow: voicePickupRows[0],
        });
      }
      return rows;
    }

    if (voiceLayoutMode === 'intertwined') {
      for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
        for (const voiceIndex of VOICE_INDEXES) {
          rows.push({
            voiceIndex,
            rowIndex,
            key: `voice-${voiceKey(voiceIndex)}-${voiceRows[voiceIndex][rowIndex]?.id ?? rowIndex}`,
            row: voiceRows[voiceIndex][rowIndex],
            pickupRow: voicePickupRows[voiceIndex],
          });
        }
      }
      return rows;
    }

    for (const voiceIndex of VOICE_INDEXES) {
      for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
        rows.push({
          voiceIndex,
          rowIndex,
          key: `voice-${voiceKey(voiceIndex)}-${voiceRows[voiceIndex][rowIndex]?.id ?? rowIndex}`,
          row: voiceRows[voiceIndex][rowIndex],
          pickupRow: voicePickupRows[voiceIndex],
        });
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

  function noteDefinitionFromId(noteId: string): ExtendedNoteDefinition | null {
    return SUPPLEMENTAL_NOTE_DEFINITIONS.find((note) => note.id === noteId || note.aliasId === noteId) ?? findNoteDefinitionById(noteId);
  }

  function noteIconClass(noteId: string): string | null {
    const iconId = noteDefinitionFromId(noteId)?.iconId;
    if (iconId === 'clap') return 'glyph-icon--clap';
    if (iconId === 'stomp') return 'glyph-icon--stomp';
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
    nextVoiceRows: [GridRow[], GridRow[]],
    nextVoicePickupRows: [GridRow, GridRow],
    nextVoiceCount: VoiceCountMode = voiceCount,
    nextVoiceLayoutMode: VoiceLayoutMode = voiceLayoutMode,
  ): void {
    voiceRows = normalizeVoiceRows(nextVoiceRows);
    voicePickupRows = nextVoicePickupRows;
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
      voices: [
        serializeVoiceCanvas(voiceRows[0], voicePickupRows[0]),
        serializeVoiceCanvas(voiceRows[1], voicePickupRows[1]),
      ],
    };
  }

  function applyCanvasHistorySnapshot(snapshot: CanvasHistorySnapshot): void {
    const restoredVoiceRows = normalizeVoiceRows([
      deserializeRowsInput(snapshot.voices[0]?.rows, 0),
      deserializeRowsInput(snapshot.voices[1]?.rows, 1),
    ]);
    const restoredVoicePickupRows: [GridRow, GridRow] = [
      deserializePickupRowInput(snapshot.voices[0]?.pickupCells, 0, snapshot.pickupBeats),
      deserializePickupRowInput(snapshot.voices[1]?.pickupCells, 1, snapshot.pickupBeats),
    ];

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

    const primaryVoice = serializeVoiceCanvas(voiceRows[0], voicePickupRows[0]);
    const secondaryVoice = serializeVoiceCanvas(voiceRows[1], voicePickupRows[1]);

    const persistedState: PersistedCanvasState = {
      version: 1,
      pickupBeats,
      microbeatTempo: state.microbeatTempo,
      rows: primaryVoice.rows,
      pickupCells: primaryVoice.pickupCells,
      voiceCount,
      voiceLayoutMode,
      trackStyle,
      voices: [primaryVoice, secondaryVoice],
    };

    try {
      window.localStorage.setItem(CANVAS_PERSISTENCE_KEY, JSON.stringify(persistedState));
    } catch (error) {
      console.warn('Boomwhacker Sketchpad canvas persistence save failed.', error);
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
      console.warn('Boomwhacker Sketchpad canvas persistence load failed.', error);
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
    const storedVoiceCount = persisted.voiceCount === 2 ? 2 : 1;
    const storedVoiceLayoutMode = persisted.voiceLayoutMode === 'separate' ? 'separate' : 'intertwined';
    const storedTrackStyle = persisted.trackStyle === 'horizontal' ? 'horizontal' : 'stacked';
    const persistedVoices = Array.isArray(persisted.voices) ? persisted.voices : [];
    const primaryVoiceSource = (persistedVoices[0] as PersistedVoiceCanvas | undefined) ?? {
      rows: rowsInput,
      pickupCells: Array.isArray(persisted.pickupCells) ? persisted.pickupCells : [],
    };
    const secondaryVoiceSource = (persistedVoices[1] as PersistedVoiceCanvas | undefined) ?? emptyVoiceCanvas(
      Math.max(Array.isArray(primaryVoiceSource.rows) ? primaryVoiceSource.rows.length : 0, INITIAL_ROWS),
      1,
    );
    const restoredVoiceRows = normalizeVoiceRows([
      deserializeRowsInput(primaryVoiceSource.rows, 0),
      deserializeRowsInput(secondaryVoiceSource.rows, 1),
    ]);
    const restoredVoicePickupRows: [GridRow, GridRow] = [
      deserializePickupRowInput(primaryVoiceSource.pickupCells, 0, nextPickupBeats),
      deserializePickupRowInput(secondaryVoiceSource.pickupCells, 1, nextPickupBeats),
    ];

    pickupBeats = nextPickupBeats;
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
    pickupBeatsModalOpen = false;
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
    const primaryVoice = serializeVoiceCanvas(voiceRows[0], voicePickupRows[0]);
    const secondaryVoice = serializeVoiceCanvas(voiceRows[1], voicePickupRows[1]);

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
      voices: [primaryVoice, secondaryVoice],
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
      console.warn('Boomwhacker Sketchpad share decode (base64) failed.', error);
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
      console.warn('Boomwhacker Sketchpad share decode (decompress) failed.', error);
      return { ok: false, reason: 'decompress' };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(new TextDecoder().decode(decompressed));
    } catch (error) {
      console.warn('Boomwhacker Sketchpad share decode (JSON) failed.', error);
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
        console.warn('Boomwhacker Sketchpad share link has unrecognized route version:', routeVersion);
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
          console.warn('Boomwhacker Sketchpad share link checksum mismatch.');
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
    if (doc.voiceCount !== undefined && doc.voiceCount !== 1 && doc.voiceCount !== 2) return { ok: false, reason: 'schema' };
    if (doc.voiceLayoutMode !== undefined && doc.voiceLayoutMode !== 'intertwined' && doc.voiceLayoutMode !== 'separate') {
      return { ok: false, reason: 'schema' };
    }
    if (doc.trackStyle !== undefined && doc.trackStyle !== 'stacked' && doc.trackStyle !== 'horizontal') {
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
    const nextVoiceCount = doc.voiceCount === 2 ? 2 : 1;
    const nextVoiceLayoutMode = doc.voiceLayoutMode === 'separate' ? 'separate' : 'intertwined';
    const nextTrackStyle = doc.trackStyle === 'horizontal' ? 'horizontal' : 'stacked';
    const docVoices = Array.isArray(doc.voices) ? doc.voices : [];
    const primaryVoiceSource = (docVoices[0] as PersistedVoiceCanvas | undefined) ?? {
      rows: doc.rows,
      pickupCells: doc.pickupCells,
    };
    const secondaryVoiceSource = (docVoices[1] as PersistedVoiceCanvas | undefined) ?? emptyVoiceCanvas(
      Math.max(Array.isArray(primaryVoiceSource.rows) ? primaryVoiceSource.rows.length : 0, INITIAL_ROWS),
      1,
    );
    const restoredVoiceRows = normalizeVoiceRows([
      deserializeRowsInput(primaryVoiceSource.rows, 0),
      deserializeRowsInput(secondaryVoiceSource.rows, 1),
    ]);
    const restoredVoicePickupRows: [GridRow, GridRow] = [
      deserializePickupRowInput(primaryVoiceSource.pickupCells, 0, clampedPickupBeats),
      deserializePickupRowInput(secondaryVoiceSource.pickupCells, 1, clampedPickupBeats),
    ];

    pickupBeats = clampedPickupBeats;
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
      case 'version-unknown': return 'This link needs a newer version of Boomwhacker Sketchpad to open.';
      case 'version-mismatch': return 'This share link was created with a newer version of Boomwhacker Sketchpad.';
      case 'schema': return 'Share link format is invalid — it may not have come from Boomwhacker Sketchpad.';
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
      console.warn('Boomwhacker Sketchpad share load failed:', result.reason);
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
      console.error('Boomwhacker Sketchpad share encoding failed.', error);
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
      console.error('Boomwhacker Sketchpad student view share encoding failed.', error);
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
    const subject = encodeURIComponent('Boomwhacker Sketchpad composition');
    const body = encodeURIComponent(
      `Hello, I'd like to share my Boomwhacker Sketchpad composition with you.\n\nTo open it:\n1. Go to https://iambored456.github.io/music-learning-tools/boomwhacker-sketchpad/\n2. Click the Share button\n3. Paste this code into the "Load from code" field:\n\n${code}\n\nEnjoy!`
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
    clearPlacementPreviewState();
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

  function handleCanvasMouseLeave(): void {
    if (dragPayload) return;

    clearPlacementHoverPreview();
  }

  function invalidateCanvasLayout(): void {
    canvasScrollRevision += 1;
  }

  function handleCanvasScroll(): void {
    invalidateCanvasLayout();
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
    rowsByVoice: [GridRow[], GridRow[]],
    pickupCellsByVoice: [Array<GridCellContent | null>, Array<GridCellContent | null>],
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
      rowsByVoice: [GridRow[], GridRow[]],
      pickupCellsByVoice: [
        Array<GridCellContent | null>,
        Array<GridCellContent | null>,
      ],
    ) => void,
  ): void {
    const nextVoiceRows = VOICE_INDEXES.map((voiceIndex) =>
      voiceRows[voiceIndex].map((row) => ({
        id: row.id,
        cells: row.cells.map((cell) => cloneCellContent(cell)),
      })),
    ) as [GridRow[], GridRow[]];
    const nextVoicePickupCells = VOICE_INDEXES.map((voiceIndex) =>
      voicePickupRows[voiceIndex].cells.map((cell) => cloneCellContent(cell)),
    ) as [Array<GridCellContent | null>, Array<GridCellContent | null>];

    mutator(nextVoiceRows, nextVoicePickupCells);
    applyVoiceCanvasState(
      normalizeVoiceRows(nextVoiceRows, Math.max(nextVoiceRows[0].length, nextVoiceRows[1].length, 1)),
      [
        {
          ...voicePickupRows[0],
          cells: nextVoicePickupCells[0],
        },
        {
          ...voicePickupRows[1],
          cells: nextVoicePickupCells[1],
        },
      ],
    );
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
        console.warn('Boomwhacker Sketchpad audio initialization failed.', error);
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

    const nextVoiceCount: VoiceCountMode = target.value === '2' ? 2 : 1;
    if (nextVoiceCount === voiceCount) return;

    voiceCount = nextVoiceCount;
    if (voiceCount === 1) {
      activeCanvasVoiceIndex = 0;
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
        queueHorizontalPlaybackScroll(playbackIndex % totalPlaybackCells(), 'auto');
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
  }

  function handleDocumentPointerDownForVolumePopup(event: PointerEvent): void {
    if (!volumePopupOpen) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (volumeControlWrapper?.contains(target)) return;
    volumePopupOpen = false;
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

  function addRow(): void {
    voiceRows = [
      [...voiceRows[0], createEmptyRow('row_a')],
      [...voiceRows[1], createEmptyRow('row_b')],
    ];
  }

  function removeRow(): void {
    if (sharedRowCount() <= 1) return;

    voiceRows = [
      voiceRows[0].slice(0, -1),
      voiceRows[1].slice(0, -1),
    ];

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

  async function previewBankNote(noteId: string): Promise<void> {
    const readiness = await ensureAudioReady();
    if (!readiness.ready) return;

    const note = noteDefinitionFromId(noteId);
    if (!note) return;

    if (note.sampleId) {
      audio.playSampleNow(note.sampleId);
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
    if (!bankNativeDragEnabled) return;
    if (!tapPlacementPayload) return;

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

    if (!tapPlacementPayload) return;

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

  function clearKaraokeAnimation(voiceIndex: VoiceIndex): void {
    voiceKaraokeAnimationTokens[voiceIndex] += 1;
    if (voiceKaraokeAnimationFrames[voiceIndex] !== null) {
      cancelAnimationFrame(voiceKaraokeAnimationFrames[voiceIndex]!);
      voiceKaraokeAnimationFrames[voiceIndex] = null;
    }

    voiceKaraokeBallArcOffsetPxs[voiceIndex] = 0;
  }

  function setKaraokeBallToAnchor(voiceIndex: VoiceIndex, anchor: KaraokeAnchor): void {
    voiceKaraokeBallRowIndexes[voiceIndex] = anchor.rowIndex;
    voiceKaraokeBallLeftPercents[voiceIndex] = anchor.leftPercent;
    voiceKaraokeBallArcOffsetPxs[voiceIndex] = 0;
  }

  function clearKaraokeBallDisplay(voiceIndex: VoiceIndex): void {
    clearKaraokeAnimation(voiceIndex);
    voiceKaraokeBallRowIndexes[voiceIndex] = null;
    voiceKaraokeBallLeftPercents[voiceIndex] = 50;
    voiceKaraokeAnchors[voiceIndex] = null;
  }

  function clearHorizontalPlaybackScrollAnimation(): void {
    horizontalPlaybackScrollToken += 1;
    if (horizontalPlaybackScrollFrame !== null) {
      cancelAnimationFrame(horizontalPlaybackScrollFrame);
      horizontalPlaybackScrollFrame = null;
    }
  }

  function setHorizontalPlaybackLaneShiftPx(voiceIndex: VoiceIndex, shiftPx: number): void {
    voiceHorizontalPlaybackLaneShiftPxs[voiceIndex] = shiftPx;
    voiceHorizontalPlaybackLaneShiftPxs = [...voiceHorizontalPlaybackLaneShiftPxs] as [number, number];
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

  function resetHorizontalPlaybackHighway(): void {
    clearHorizontalPlaybackScrollAnimation();
    clearHorizontalPlaybackLaneShiftAnimations();
    horizontalPlaybackHighway = {
      activationIndex: null,
      pinnedVoiceIndex: null,
      referenceViewportLeftPx: null,
    };
    voiceKaraokeBallPinnedLeftPxs = [null, null];
    voiceHorizontalPlaybackLaneShiftPxs = [0, 0];
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
    return voiceTrackRowElements[voiceIndex][rowIndex]?.getBoundingClientRect() ?? null;
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

    const rowRect = rowElement.getBoundingClientRect();
    const referenceRect = referenceElement.getBoundingClientRect();
    const referenceBorder = relativeTo === 'panel' ? canvasPanelElement?.clientLeft ?? 0 : canvasScrollShellElement?.clientLeft ?? 0;
    return rowRect.left - referenceRect.left - referenceBorder + (anchor.leftPercent / 100) * rowRect.width;
  }

  function karaokeAnchorContentLeftPx(voiceIndex: VoiceIndex, anchor: KaraokeAnchor): number | null {
    const container = canvasScrollShellElement;
    if (!container) return null;

    const viewportLeft = karaokeAnchorViewportLeftPx(voiceIndex, anchor, 'scroll-shell');
    if (viewportLeft === null) return null;
    return container.scrollLeft + viewportLeft;
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

    const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
    return Math.max(0, Math.min(maxScrollLeft, anchorContentLeft - targetViewportLeftPx));
  }

  function animateHorizontalPlaybackScrollTo(targetScrollLeft: number, durationMs: number): void {
    const container = canvasScrollShellElement;
    if (!container) return;

    clearHorizontalPlaybackScrollAnimation();

    const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
    const clampedTarget = Math.max(0, Math.min(maxScrollLeft, targetScrollLeft));
    if (Math.abs(clampedTarget - container.scrollLeft) < 0.5) {
      container.scrollLeft = clampedTarget;
      return;
    }

    const token = horizontalPlaybackScrollToken;
    const startedAt = performance.now();
    const startScrollLeft = container.scrollLeft;
    const deltaScrollLeft = clampedTarget - startScrollLeft;
    const motionDurationMs = Math.max(24, Math.floor(durationMs));

    const step = (now: number): void => {
      if (token !== horizontalPlaybackScrollToken) return;

      const progress = Math.min(1, (now - startedAt) / motionDurationMs);
      container.scrollLeft = startScrollLeft + deltaScrollLeft * progress;

      if (progress >= 1) {
        horizontalPlaybackScrollFrame = null;
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
  ): void {
    if (trackStyle !== 'horizontal') return;
    if (typeof window === 'undefined') return;

    const container = canvasScrollShellElement;
    if (!container) return;

    const resolvedViewportLeftPx = targetViewportLeftPx ?? container.clientWidth * HORIZONTAL_PLAYBACK_SCROLL_AHEAD_RATIO;
    const targetScrollLeft = scrollLeftForKaraokeAnchor(voiceIndex, anchor, resolvedViewportLeftPx);
    if (targetScrollLeft === null) return;

    if (Math.abs(targetScrollLeft - container.scrollLeft) < 6) return;
    if (durationMs !== null) {
      animateHorizontalPlaybackScrollTo(targetScrollLeft, durationMs);
      return;
    }

    clearHorizontalPlaybackScrollAnimation();
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
  }

  function queuePlaybackScrollForCurrentStep(currentIndex: number, totalCells: number): void {
    if (trackStyle !== 'horizontal') return;
    if (typeof window === 'undefined') return;

    const referenceViewportLeftPx = horizontalPlaybackHighway.referenceViewportLeftPx;
    if (referenceViewportLeftPx === null) return;

    if (voiceCount === 2) return;

    if (currentIndex + 1 >= totalCells) return;

    requestAnimationFrame(() => {
      if (trackStyle !== 'horizontal') return;

      const preferredVoiceIndex = horizontalPlaybackHighway.pinnedVoiceIndex ?? resolvePlaybackScrollVoiceIndex();
      const preferredTransition = nextDistinctKaraokeAnchorTransition(preferredVoiceIndex, currentIndex, totalCells);
      if (preferredTransition) {
        scrollHorizontalTrackToAnchor(
          preferredVoiceIndex,
          preferredTransition.anchor,
          'auto',
          referenceViewportLeftPx,
          preferredTransition.durationMs,
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
          );
          return;
        }
      }
    });
  }

  function karaokeBallOverlayStyle(voiceIndex: VoiceIndex): string | null {
    canvasScrollRevision;

    const rowIndex = voiceKaraokeBallRowIndexes[voiceIndex];
    if (rowIndex === null) return null;

    const panel = canvasPanelElement;
    const rowElement = getTrackRowElement(voiceIndex, rowIndex);
    if (!panel || !rowElement) return null;

    const panelRect = panel.getBoundingClientRect();
    const rowRect = rowElement.getBoundingClientRect();
    const pinnedLeftPx = trackStyle === 'horizontal' ? voiceKaraokeBallPinnedLeftPxs[voiceIndex] : null;
    const leftPx =
      pinnedLeftPx ??
      (rowRect.left - panelRect.left - panel.clientLeft + (voiceKaraokeBallLeftPercents[voiceIndex] / 100) * rowRect.width);
    const topPx = rowRect.top - panelRect.top - panel.clientTop;

    return `left:${leftPx}px; top:${topPx}px; --karaoke-ball-y:${voiceKaraokeBallArcOffsetPxs[voiceIndex]}px; --karaoke-ball-size-px:${karaokeBallSizePx}px;`;
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
    const containerRowIndex = zone === 'pickup' ? 0 : rowIndex;
    const rowElement = getTrackRowElement(voiceIndex, containerRowIndex);
    if (!rowElement) return null;

    return rowElement.querySelector<HTMLElement>(
      `.macrobeat-cell[data-voice-index="${voiceIndex}"][data-track-zone="${zone}"][data-row-index="${rowIndex}"][data-cell-index="${cellIndex}"]`,
    );
  }

  function resolveRenderedKaraokeAnchorLeftPercent(
    voiceIndex: VoiceIndex,
    cursor: GridCellRef,
    anchorRowIndex: number,
    anchorStartCellIndex: number,
    anchorSpan: 1 | 2,
  ): number | null {
    const rowElement = getTrackRowElement(voiceIndex, anchorRowIndex);
    const startCellElement = getTrackCellElement(voiceIndex, cursor.zone, cursor.rowIndex, anchorStartCellIndex);
    if (!rowElement || !startCellElement) return null;

    const rowRect = rowElement.getBoundingClientRect();
    const startRect = startCellElement.getBoundingClientRect();
    if (rowRect.width <= 0 || startRect.width <= 0) return null;

    let anchorLeftPx = startRect.left;
    let anchorRightPx = startRect.right;
    if (anchorSpan === 2) {
      const endCellElement = getTrackCellElement(voiceIndex, cursor.zone, cursor.rowIndex, anchorStartCellIndex + 1);
      const endRect = endCellElement?.getBoundingClientRect() ?? null;
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
    const rowIndex = isPickupZone ? 0 : cursor.rowIndex;
    const rowCells = isPickupZone
      ? pickupRowForVoice(voiceIndex).cells
      : rowsForVoice(voiceIndex)[cursor.rowIndex]?.cells;

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
    if (index < 0 || index >= totalCells) return null;

    return resolveKaraokeAnchor(voiceIndex, cellRefFromIndex(index));
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
      voiceKaraokeBallRowIndexes[voiceIndex] = rowIndex;

      const segmentStartedAt = performance.now();
      const deltaLeft = endLeft - startLeft;
      const clampedSegmentMs = Math.max(24, Math.floor(segmentDurationMs));

      const step = (now: number): void => {
        if (token !== voiceKaraokeAnimationTokens[voiceIndex]) return;

        const progress = Math.min(1, (now - segmentStartedAt) / clampedSegmentMs);
        voiceKaraokeBallLeftPercents[voiceIndex] = startLeft + deltaLeft * progress;

        if (arcPhase === 'first-half') {
          voiceKaraokeBallArcOffsetPxs[voiceIndex] = -arcHeightPx * (2 * progress - progress * progress);
        } else if (arcPhase === 'second-half') {
          voiceKaraokeBallArcOffsetPxs[voiceIndex] = -arcHeightPx * (1 - progress * progress);
        } else {
          voiceKaraokeBallArcOffsetPxs[voiceIndex] = -4 * arcHeightPx * progress * (1 - progress);
        }

        if (progress >= 1) {
          voiceKaraokeBallLeftPercents[voiceIndex] = endLeft;
          voiceKaraokeBallArcOffsetPxs[voiceIndex] = arcPhase === 'first-half' ? -arcHeightPx : 0;
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
        voiceKaraokeBallRowIndexes[voiceIndex] = transitionTo.rowIndex;
        voiceKaraokeBallLeftPercents[voiceIndex] = toRowLeftBoundary;
        voiceKaraokeBallArcOffsetPxs[voiceIndex] = -arcHeightPx;
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
    voiceKaraokeBallRowIndexes[voiceIndex] = anchor.rowIndex;
    voiceKaraokeBallLeftPercents[voiceIndex] = anchor.leftPercent;

    const motionDurationMs = Math.max(80, Math.floor(durationMs));
    const token = voiceKaraokeAnimationTokens[voiceIndex];
    const startedAt = performance.now();

    const step = (now: number): void => {
      if (token !== voiceKaraokeAnimationTokens[voiceIndex]) return;

      const progress = Math.min(1, (now - startedAt) / motionDurationMs);
      voiceKaraokeBallArcOffsetPxs[voiceIndex] = -4 * arcHeightPx * progress * (1 - progress);

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
    voiceKaraokeBallRowIndexes[voiceIndex] = currentAnchor.rowIndex;
    voiceKaraokeBallLeftPercents[voiceIndex] = currentAnchor.leftPercent;

    const motionDurationMs = Math.max(80, Math.floor(durationMs));
    const token = voiceKaraokeAnimationTokens[voiceIndex];
    const startedAt = startedAtMs;

    const step = (now: number): void => {
      if (token !== voiceKaraokeAnimationTokens[voiceIndex]) return;

      const progress = Math.min(1, (now - startedAt) / motionDurationMs);
      voiceKaraokeBallArcOffsetPxs[voiceIndex] = -4 * arcHeightPx * progress * (1 - progress);

      if (progress >= 1) {
        voiceKaraokeBallRowIndexes[voiceIndex] = nextAnchor.rowIndex;
        voiceKaraokeBallLeftPercents[voiceIndex] = nextAnchor.leftPercent;
        voiceKaraokeBallArcOffsetPxs[voiceIndex] = 0;
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
    if (trackStyle !== 'horizontal' || voiceCount !== 2) return;

    clearHorizontalPlaybackLaneShiftAnimation(voiceIndex);

    const startShiftPx = voiceHorizontalPlaybackLaneShiftPxs[voiceIndex];
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
    const crestLeft = karaokeRowLeftBoundaryPercent(firstAnchor.rowIndex);

    clearKaraokeAnimation(voiceIndex);
    voiceKaraokeBallRowIndexes[voiceIndex] = firstAnchor.rowIndex;
    voiceKaraokeBallLeftPercents[voiceIndex] = crestLeft;
    voiceKaraokeBallArcOffsetPxs[voiceIndex] = -karaokeArcHeightPx;

    const token = voiceKaraokeAnimationTokens[voiceIndex];
    const startedAt = performance.now();

    const step = (now: number): void => {
      if (token !== voiceKaraokeAnimationTokens[voiceIndex]) return;

      const progress = Math.min(1, (now - startedAt) / leadInMs);
      voiceKaraokeBallLeftPercents[voiceIndex] = crestLeft + (firstAnchor.leftPercent - crestLeft) * progress;
      voiceKaraokeBallArcOffsetPxs[voiceIndex] = -karaokeArcHeightPx * (1 - progress * progress);

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
    const rowIndex = isPickupZone ? -1 : cursor.rowIndex;
    const rowCells = isPickupZone
      ? pickupRowForVoice(voiceIndex).cells
      : rowsForVoice(voiceIndex)[cursor.rowIndex]?.cells;
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
      voicePlaybackHighlights[voiceIndex] = null;
      voicePlaybackHighlightAnchors[voiceIndex] = null;
      return;
    }

    if (voicePlaybackHighlightAnchors[voiceIndex] && karaokeAnchorsEqual(voicePlaybackHighlightAnchors[voiceIndex]!, anchor)) {
      debugPlaybackHighlight('Skipping highlight update: anchor unchanged.', { cursor, anchor });
      return;
    }

    const nextHighlight = resolvePlaybackHighlightForCursor(voiceIndex, cursor);
    if (!nextHighlight) {
      debugPlaybackHighlight('Clearing highlight: failed to resolve highlight span.', { cursor, anchor });
      voicePlaybackHighlights[voiceIndex] = null;
      voicePlaybackHighlightAnchors[voiceIndex] = null;
      return;
    }

    voicePlaybackPulseFlips[voiceIndex] = !voicePlaybackPulseFlips[voiceIndex];
    voicePlaybackHighlights[voiceIndex] = {
      ...nextHighlight,
      pulseClass: voicePlaybackPulseFlips[voiceIndex] ? 'playback-pulse-a' : 'playback-pulse-b',
    };
    voicePlaybackHighlightAnchors[voiceIndex] = anchor;
    debugPlaybackHighlight('Highlight updated.', { cursor, anchor, highlight: voicePlaybackHighlights[voiceIndex] });
  }

  function clearPlaybackTimer(): void {
    if (playbackTimer !== null) {
      clearInterval(playbackTimer);
      playbackTimer = null;
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

    if (zone === 'pickup') {
      if (cellIndex < 0 || cellIndex >= pickupCells) return null;
      return cellIndex;
    }

    if (rowIndex < 0 || rowIndex >= sharedRowCount()) return null;
    if (cellIndex < 0 || cellIndex >= GRID_COLUMNS) return null;
    return pickupCells + rowIndex * GRID_COLUMNS + cellIndex;
  }

  function markPlayedCellsForCursor(voiceIndex: VoiceIndex, cursor: GridCellRef): void {
    const highlight = resolvePlaybackHighlightForCursor(voiceIndex, cursor);
    if (!highlight) return;

    const nextPlayed = new Set(voicePlayedCellIndexes[voiceIndex]);
    for (let offset = 0; offset < highlight.span; offset += 1) {
      const absoluteIndex = absolutePlaybackCellIndex(highlight.zone, highlight.rowIndex, highlight.startCellIndex + offset);
      if (absoluteIndex === null) continue;
      nextPlayed.add(absoluteIndex);
    }

    voicePlayedCellIndexes[voiceIndex] = nextPlayed;
    debugPlayedNoteMuting('Marked cells as played.', {
      voice: voiceLabel(voiceIndex),
      cursor,
      highlight,
      playedCount: voicePlayedCellIndexes[voiceIndex].size,
    });
  }

  function isPlayedCell(playedIndexes: Set<number>, zone: GridZone, rowIndex: number, cellIndex: number): boolean {
    const absoluteIndex = absolutePlaybackCellIndex(zone, rowIndex, cellIndex);
    if (absoluteIndex === null) return false;
    return playedIndexes.has(absoluteIndex);
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

  function playPlacedNote(note: PlacedNote): void {
    if (!audioReady) return;

    const noteDefinition = noteDefinitionFromId(note.noteId);
    if (noteDefinition?.sampleId) {
      audio.playSampleNow(noteDefinition.sampleId);
      return;
    }

    const pitch = getPitchNameForDisplay(model.getFullRootNote(), note.interval);
    if (!pitch) return;

    audio.playNoteNow(pitch);
  }

  function playCellNote(voiceIndex: VoiceIndex, cellRef: GridCellRef): boolean {
    const cell =
      cellRef.zone === 'pickup'
        ? pickupRowForVoice(voiceIndex).cells[cellRef.cellIndex]
        : rowsForVoice(voiceIndex)[cellRef.rowIndex]?.cells[cellRef.cellIndex];

    if (!cell || !cellHasAnyNotes(cell)) return false;

    if (cell.shape === 'oval') {
      playPlacedNote(cell.notes[0]);
      return false;
    }

    if (cell.shape === 'circle') {
      if (cell.role === 'continuation') {
        return false;
      }

      playPlacedNote(cell.notes[0]);
      return false;
    }

    const [leftSixteenth, rightSixteenth] = cell.notes;
    if (!leftSixteenth && !rightSixteenth) {
      return false;
    }

    if (leftSixteenth) {
      playPlacedNote(leftSixteenth);
    }

    if (!rightSixteenth || !isPlaying) {
      return false;
    }

    queuePlaybackTimeout(() => {
      if (!isPlaying) return;
      playPlacedNote(rightSixteenth);
    }, Math.max(20, Math.floor(playbackIntervalMs() / 2)));

    return true;
  }

  function playbackStep(): void {
    const totalCells = totalPlaybackCells();
    if (totalCells <= 0) {
      debugPlaybackHighlight('Stopping playback: no cells available.');
      stopPlayback();
      return;
    }

    const currentIndex = playbackIndex % totalCells;
    const cursor = cellRefFromIndex(currentIndex);
    const stepStartedAtMs = performance.now();
    debugPlaybackHighlight('Playback step.', { currentIndex, totalCells, cursor });

    if (trackStyle === 'horizontal' && horizontalPlaybackHighway.activationIndex === currentIndex) {
      activateHorizontalPlaybackHighway(currentIndex);
    }

    if (macrobeatMetronomeEnabled && cursor.cellIndex % MICROBEATS_PER_BEAT === 0) {
      audio.playMacrobeatCueNow();
    }

    let hasSecondSixteenth = false;
    for (const voiceIndex of visibleVoiceIndices()) {
      voicePlaybackCursors[voiceIndex] = cursor;
      updateKaraokeAfterPlaybackStep(voiceIndex, currentIndex, totalCells, cursor, stepStartedAtMs);
      updatePlaybackHighlight(voiceIndex, cursor);
      hasSecondSixteenth = playCellNote(voiceIndex, cursor) || hasSecondSixteenth;
    }
    queuePlaybackScrollForCurrentStep(currentIndex, totalCells);
    if (PLAYED_NOTE_MUTING_DEBUG && typeof window !== 'undefined' && typeof document !== 'undefined') {
      requestAnimationFrame(() => {
        debugPlayedNoteMuting('DOM muted-note classes.', {
          playedCellCount: visibleVoiceIndices().reduce<number>((sum, voiceIndex) => sum + voicePlayedCellIndexes[voiceIndex].size, 0),
          mutedNoteCount: document.querySelectorAll('.placed-note.played-note-muted').length,
        });
      });
    }

    playbackIndex = currentIndex + 1;
    if (playbackIndex >= totalCells) {
      clearPlaybackTimer();

      if (isLooping) {
        if (hasSecondSixteenth) {
          queuePlaybackTimeout(() => {
            playbackIndex = 0;
            restartPlaybackTimer();
          }, Math.max(24, Math.floor(playbackIntervalMs() / 2) + 8));
        } else {
          playbackIndex = 0;
          restartPlaybackTimer();
        }
      } else {
        if (hasSecondSixteenth) {
          queuePlaybackTimeout(() => {
            stopPlayback();
          }, Math.max(24, Math.floor(playbackIntervalMs() / 2) + 8));
        } else {
          stopPlayback();
        }
      }
    }
  }

  function restartPlaybackTimer(): void {
    if (!isPlaying) return;

    clearPlaybackTimer();
    clearPendingPlaybackTimeouts();
    if (playbackIndex === 0) {
      prepareHorizontalPlaybackHighway(playbackIndex, totalPlaybackCells());
      queueHorizontalPlaybackScroll(playbackIndex, 'auto');
    }
    playbackTimer = setInterval(playbackStep, playbackIntervalMs());
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
  ): void {
    countInDisplayNumber = COUNT_IN_NUMBERS[index];

    const accented = index === ACCENTED_COUNT_IN_INDEX;
    const played = audio.playCountInCueNow(accented);
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

  function startCountIn(firstAnchors: Map<VoiceIndex, KaraokeAnchor>, startupDelayMs = 0): number {
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

  function startPlayback(readiness: AudioReadinessResult): void {
    if (isPlaying) return;

    debugPlaybackHighlight('Starting playback.', { playbackIndex, totalCells: totalPlaybackCells() });
    volumePopupOpen = false;
    clearPlaybackTimer();
    clearPendingPlaybackTimeouts();
    for (const voiceIndex of VOICE_INDEXES) {
      clearKaraokeAnimation(voiceIndex);
      voicePlaybackHighlights[voiceIndex] = null;
      voicePlaybackHighlightAnchors[voiceIndex] = null;
      voicePlaybackCursors[voiceIndex] = null;
      voicePlayedCellIndexes[voiceIndex] = new Set<number>();
    }
    clearCountInDisplay();

    const totalCells = totalPlaybackCells();
    if (totalCells <= 0) {
      stopPlayback();
      return;
    }

    const currentIndex = playbackIndex % totalCells;
    prepareHorizontalPlaybackHighway(currentIndex, totalCells);
    setPlaybackUiState(true);
    queueHorizontalPlaybackScroll(currentIndex, 'auto');

    const firstAnchors = new Map<VoiceIndex, KaraokeAnchor>();
    for (const voiceIndex of visibleVoiceIndices()) {
      const firstAnchor = karaokeAnchorFromPlaybackIndex(voiceIndex, currentIndex);
      if (firstAnchor) {
        firstAnchors.set(voiceIndex, firstAnchor);
      }
    }
    const shouldRunCountIn = countInEnabled && playbackIndex === 0;
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
        ? startCountIn(firstAnchors, startupDelayMs)
        : shouldUseHorizontalPlaybackHighway
          ? (holdKaraokeAtFirstAnchors(firstAnchors), startupDelayMs)
          : startKaraokeLeadInWithDelay(firstAnchors, startupDelayMs)
      : startupDelayMs;
    if (firstAnchors.size === 0) {
      for (const voiceIndex of visibleVoiceIndices()) {
        clearKaraokeBallDisplay(voiceIndex);
      }
    }

    const playbackRequestedAt = performance.now();
    queuePlaybackTimeout(() => {
      if (!isPlaying) return;
      debugPlaybackStartup('Playback lead-in completed.', {
        leadInMs,
        actualDelayMs: Math.round(performance.now() - playbackRequestedAt),
      });
      clearCountInDisplay();
      playbackStep();

      if (isPlaying) {
        playbackTimer = setInterval(playbackStep, playbackIntervalMs());
      }
    }, leadInMs);
  }

  function pausePlayback(): void {
    debugPlaybackHighlight('Pausing playback.', { playbackIndex });
    setPlaybackUiState(false);
    clearPlaybackTimer();
    clearPendingPlaybackTimeouts();
    resetHorizontalPlaybackHighway();
    for (const voiceIndex of VOICE_INDEXES) {
      clearKaraokeAnimation(voiceIndex);
      voicePlaybackHighlights[voiceIndex] = null;
      voicePlaybackHighlightAnchors[voiceIndex] = null;
    }
    clearCountInDisplay();
  }

  function stopPlayback(): void {
    debugPlaybackHighlight('Stopping playback.', { playbackIndex });
    setPlaybackUiState(false);
    clearPlaybackTimer();
    clearPendingPlaybackTimeouts();
    resetHorizontalPlaybackHighway();
    for (const voiceIndex of VOICE_INDEXES) {
      clearKaraokeBallDisplay(voiceIndex);
      voicePlaybackCursors[voiceIndex] = null;
      voicePlaybackHighlights[voiceIndex] = null;
      voicePlaybackHighlightAnchors[voiceIndex] = null;
      voicePlayedCellIndexes[voiceIndex] = new Set<number>();
    }
    clearCountInDisplay();
    playbackIndex = 0;
  }

  async function togglePlayback(): Promise<void> {
    if (isPlaying) {
      pausePlayback();
      return;
    }

    const readiness = await ensureAudioReady();
    if (!readiness.ready) return;

    startPlayback(readiness);
  }

  function toggleCountIn(): void {
    countInEnabled = !countInEnabled;
  }

  function toggleMacrobeatMetronome(): void {
    macrobeatMetronomeEnabled = !macrobeatMetronomeEnabled;
  }

  function toggleLoop(): void {
    isLooping = !isLooping;
  }

  function isPlaybackCell(cursor: GridCellRef | null, rowIndex: number, cellIndex: number): boolean {
    return cursor?.zone === 'main' && cursor?.rowIndex === rowIndex && cursor?.cellIndex === cellIndex;
  }

  function isPlaybackPickupCell(cursor: GridCellRef | null, cellIndex: number): boolean {
    return cursor?.zone === 'pickup' && cursor?.cellIndex === cellIndex;
  }

  function playbackHighlightMatches(
    highlight: PlaybackHighlight | null,
    zone: GridZone,
    rowIndex: number,
    cellIndex: number,
  ): boolean {
    if (!highlight || highlight.zone !== zone) return false;
    if (zone === 'main' && highlight.rowIndex !== rowIndex) return false;

    const start = highlight.startCellIndex;
    return cellIndex >= start && cellIndex < start + highlight.span;
  }

  function isPlaybackHighlightCell(highlight: PlaybackHighlight | null, rowIndex: number, cellIndex: number): boolean {
    return playbackHighlightMatches(highlight, 'main', rowIndex, cellIndex);
  }

  function isPlaybackPickupHighlightCell(highlight: PlaybackHighlight | null, cellIndex: number): boolean {
    return playbackHighlightMatches(highlight, 'pickup', -1, cellIndex);
  }

  function isPlaybackHighlightSpanStart(
    highlight: PlaybackHighlight | null,
    zone: GridZone,
    rowIndex: number,
    cellIndex: number,
  ): boolean {
    return playbackHighlightMatches(highlight, zone, rowIndex, cellIndex) && highlight?.span === 2 && highlight.startCellIndex === cellIndex;
  }

  function isPlaybackHighlightSpanContinuation(
    highlight: PlaybackHighlight | null,
    zone: GridZone,
    rowIndex: number,
    cellIndex: number,
  ): boolean {
    return (
      playbackHighlightMatches(highlight, zone, rowIndex, cellIndex) &&
      highlight?.span === 2 &&
      highlight.startCellIndex + 1 === cellIndex
    );
  }

  function isPlaybackPulseClass(
    highlight: PlaybackHighlight | null,
    zone: GridZone,
    rowIndex: number,
    cellIndex: number,
    pulseClass: PlaybackHighlight['pulseClass'],
  ): boolean {
    return playbackHighlightMatches(highlight, zone, rowIndex, cellIndex) && highlight?.pulseClass === pulseClass;
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

    if (isEditableTarget(event.target)) return;

    if (event.key === 'Escape' && tapPlacementPayload) {
      event.preventDefault();
      clearTapPlacementSelection();
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
  style={rootInlineStyle()}
  on:dragover={handleCursorGhostDragOver}
>
  <div class="top-toolbar" class:playback-compact={isPlaying}>
  <section class="panel controls-panel">
    <div class="controls-group transport-group">
      <div class="transport-actions">
        <div class="transport-row">
          <button type="button" class="transport-btn" on:click={togglePlayback} title={isPlaying ? 'Pause' : 'Play'} aria-label={isPlaying ? 'Pause' : 'Play'}>
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
          <button type="button" class="transport-btn" on:click={stopPlayback} title="Stop" aria-label="Stop">
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
          {#if !isStudentView || !activeStudentView.hidePickupBeats || !activeStudentView.hideCanvasActions}
          <button
            type="button"
            class="transport-btn pickup-modal-trigger"
            class:active={pickupBeatsModalOpen}
            on:click={() => (pickupBeatsModalOpen = true)}
            title="Pickup beats & canvas rows"
            aria-label="Pickup beats and canvas rows"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
              <ellipse cx="12.5" cy="15" rx="10" ry="13" stroke-dasharray="4 4"/>
              <ellipse cx="37.5" cy="15" rx="10" ry="13" stroke-dasharray="4 4"/>
            </svg>
          </button>
          {/if}
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
      </div>
      {/if}
    </div>
  </section>

  <section class="panel notebank-panel toolbar-notebank-panel" class:playback-content-hidden={isPlaying}>
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

        {#if showToolbarEighthBank}
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
        {/if}
      </div>
  </section>
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
    on:dragenter={handleCanvasDragEnter}
    on:dragleave={handleCanvasDragLeave}
    on:mousemove={handleCanvasMouseMove}
    on:mouseleave={handleCanvasMouseLeave}
  >
    <div
      class="canvas-scroll-shell"
      class:track-style-horizontal={trackStyle === 'horizontal'}
      class:two-voice-mode={voiceCount === 2}
      class:playback-highway-active={trackStyle === 'horizontal' && isPlaying && horizontalPlaybackHighway.referenceViewportLeftPx !== null}
      bind:this={canvasScrollShellElement}
      use:notifyCanvasLayoutChange
      on:scroll={handleCanvasScroll}
    >
      <div
        class="rows-grid"
        class:has-active-pickup={pickupBeats > 0}
        class:two-voice-mode={voiceCount === 2}
        class:track-style-horizontal={trackStyle === 'horizontal'}
        style={`--pickup-columns:${pickupMicrobeatCount()}; --karaoke-ball-size-px:${karaokeBallSizePx}px; --karaoke-arc-height-px:${karaokeArcHeightPx}px; --horizontal-playback-runway-px:${horizontalPlaybackRunwayPx}px;`}
      >
        {#each renderedTrackRows as renderedRow (renderedRow.key)}
        {@const voiceIndex = renderedRow.voiceIndex}
        {@const rowIndex = renderedRow.rowIndex}
        {@const row = renderedRow.row}
        {@const pickupRow = renderedRow.pickupRow}
        {@const playbackCursor = voicePlaybackCursors[voiceIndex]}
        {@const playbackHighlight = voicePlaybackHighlights[voiceIndex]}
        {@const playedCellIndexes = voicePlayedCellIndexes[voiceIndex]}
        {@const hasInlinePickup = rowIndex === 0 && pickupBeats > 0}
        <article
          class="track-row voice-track-row"
          class:voice-track-row--a={voiceIndex === 0}
          class:voice-track-row--b={voiceIndex === 1}
          class:voice-track-row--active={activeCanvasVoiceIndex === voiceIndex}
          class:with-inline-pickup={hasInlinePickup}
          bind:this={voiceTrackRowElements[voiceIndex][rowIndex]}
          use:notifyCanvasLayoutChange
          style:--track-row-column={trackStyle === 'horizontal' && voiceCount === 2 ? `${rowIndex + 1}` : null}
          style:--horizontal-playback-lane-shift-px={trackStyle === 'horizontal' && voiceCount === 2 ? `${voiceHorizontalPlaybackLaneShiftPxs[voiceIndex]}px` : null}
          on:pointerdown={() => setActiveCanvasVoice(voiceIndex)}
        >
          <div
            class="track-row-grids"
            class:with-inline-pickup={hasInlinePickup}
          >
            <div
              class="track-grid main-grid"
              class:with-inline-pickup={hasInlinePickup}
              style={trackGridInlineStyle(hasInlinePickup)}
              role="group"
              aria-label={`Row ${rowIndex + 1}`}
            >
              {#if voiceCount === 2 && rowIndex === 0}
                <span class="voice-track-badge" aria-hidden="true">Voice {voiceLabel(voiceIndex)}</span>
              {/if}
              {#if voiceCount === 2}
                <span class="voice-track-row-label" aria-hidden="true">{rowIndex + 1}</span>
              {/if}
              {#if rowIndex === 0 && pickupBeats > 0}
                {#each pickupRow.cells.slice(0, pickupMicrobeatCount()) as cell, cellIndex}
                  {@const pickupPreviewNote = dragPreviewNote(activePreviewPayload, dragOverCell, voiceIndex, 'pickup', -1, cellIndex)}
                  <div
                    class="macrobeat-cell"
                    class:has-note={pickupCellHasNote(voiceIndex, cellIndex)}
                    class:circle-span-start={cell?.shape === 'circle' && cell.role === 'start' || isCircleDragPreviewSpanStart(activePreviewPayload, dragOverCell, voiceIndex, 'pickup', -1, cellIndex)}
                    class:drop-target={isPickupDropTarget(dragOverCell, voiceIndex, cellIndex)}
                    class:playback-target={isPlaybackPickupCell(playbackCursor, cellIndex)}
                    class:playback-illuminated={isPlaybackPickupHighlightCell(playbackHighlight, cellIndex)}
                    class:playback-pulse-a={isPlaybackPulseClass(playbackHighlight, 'pickup', -1, cellIndex, 'playback-pulse-a')}
                    class:playback-pulse-b={isPlaybackPulseClass(playbackHighlight, 'pickup', -1, cellIndex, 'playback-pulse-b')}
                    class:playback-span-start={isPlaybackHighlightSpanStart(playbackHighlight, 'pickup', -1, cellIndex)}
                    class:playback-span-continuation={isPlaybackHighlightSpanContinuation(playbackHighlight, 'pickup', -1, cellIndex)}
                    class:two-based-divider={(cellIndex + 1) % 2 === 0 && cellIndex < pickupMicrobeatCount() - 1}
                    data-voice-index={voiceIndex}
                    data-track-zone="pickup"
                    data-row-index={-1}
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
                          class:played-note-muted={isPlayedCell(playedCellIndexes, 'pickup', -1, cellIndex)}
                          style={`--token-color:${cell.notes[0].color};`}
                          draggable="true"
                          title={placedNoteTitle(cell.notes[0])}
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
                          class:played-note-muted={isPlayedCell(playedCellIndexes, 'pickup', -1, cellIndex)}
                          style={`--token-color:${cell.notes[0].color};`}
                          draggable="true"
                          title={placedNoteTitle(cell.notes[0])}
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
                                  class:played-note-muted={isPlayedCell(playedCellIndexes, 'pickup', -1, cellIndex)}
                                  style={`--token-color:${diamondNote.color};`}
                                  draggable="true"
                                  title={placedNoteTitle(diamondNote)}
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
              {@const mainPreviewNote = dragPreviewNote(activePreviewPayload, dragOverCell, voiceIndex, 'main', rowIndex, cellIndex)}
              <div
                class="macrobeat-cell"
                class:has-note={cellHasNote(voiceIndex, rowIndex, cellIndex)}
                class:circle-span-start={cell?.shape === 'circle' && cell.role === 'start' || isCircleDragPreviewSpanStart(activePreviewPayload, dragOverCell, voiceIndex, 'main', rowIndex, cellIndex)}
                class:drop-target={isDropTarget(dragOverCell, voiceIndex, rowIndex, cellIndex)}
                class:playback-target={isPlaybackCell(playbackCursor, rowIndex, cellIndex)}
                class:playback-illuminated={isPlaybackHighlightCell(playbackHighlight, rowIndex, cellIndex)}
                class:playback-pulse-a={isPlaybackPulseClass(playbackHighlight, 'main', rowIndex, cellIndex, 'playback-pulse-a')}
                class:playback-pulse-b={isPlaybackPulseClass(playbackHighlight, 'main', rowIndex, cellIndex, 'playback-pulse-b')}
                class:playback-span-start={isPlaybackHighlightSpanStart(playbackHighlight, 'main', rowIndex, cellIndex)}
                class:playback-span-continuation={isPlaybackHighlightSpanContinuation(playbackHighlight, 'main', rowIndex, cellIndex)}
                class:two-based-divider={(cellIndex + 1) % 2 === 0 && cellIndex < GRID_COLUMNS - 1}
                data-voice-index={voiceIndex}
                data-track-zone="main"
                data-row-index={rowIndex}
                data-cell-index={cellIndex}
                style={macrobeatCellInlineStyle('main', cellIndex, hasInlinePickup)}
                role="gridcell"
                tabindex={tapPlacementPayload || eraserMode ? 0 : -1}
                aria-label={`Voice ${voiceLabel(voiceIndex)} row ${rowIndex + 1}, macrobeat ${Math.floor(cellIndex / MICROBEATS_PER_BEAT) + 1}, microbeat ${(cellIndex % MICROBEATS_PER_BEAT) + 1}`}
                on:mousemove={(event) => handleCellMouseMove(event, voiceIndex, 'main', rowIndex, cellIndex)}
                on:dragover={(event) => handleCellDragOver(event, voiceIndex, 'main', rowIndex, cellIndex)}
                on:drop={(event) => handleCellDrop(event, voiceIndex, 'main', rowIndex, cellIndex)}
                on:pointerdown={(event) => handleCellPointerDown(event, voiceIndex, 'main', rowIndex, cellIndex)}
                on:click={(event) => handleCellClick(event, voiceIndex, 'main', rowIndex, cellIndex)}
                on:keydown={(event) => handleCellKeyDown(event, voiceIndex, 'main', rowIndex, cellIndex)}
              >
                {#if cell}
                  {#if cell.shape === 'oval' && cell.notes[0]}
                    <button
                      type="button"
                      class="placed-note oval"
                      class:played-note-muted={isPlayedCell(playedCellIndexes, 'main', rowIndex, cellIndex)}
                      style={`--token-color:${cell.notes[0].color};`}
                      draggable="true"
                      title={placedNoteTitle(cell.notes[0])}
                      on:dragstart={(event) => handleCellDragStart(event, voiceIndex, 'main', rowIndex, cellIndex, cell.notes[0], 0)}
                      on:dragend={handleAnyDragEnd}
                      on:contextmenu={(event) => removeCellNote(event, voiceIndex, 'main', rowIndex, cellIndex, 0)}
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
                      class:played-note-muted={isPlayedCell(playedCellIndexes, 'main', rowIndex, cellIndex)}
                      style={`--token-color:${cell.notes[0].color};`}
                      draggable="true"
                      title={placedNoteTitle(cell.notes[0])}
                      on:dragstart={(event) => handleCellDragStart(event, voiceIndex, 'main', rowIndex, cellIndex, cell.notes[0], 0)}
                      on:dragend={handleAnyDragEnd}
                      on:contextmenu={(event) => removeCellNote(event, voiceIndex, 'main', rowIndex, cellIndex, 0)}
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
                        <div class="sixteenth-slot" class:slot-drop-target={isSixteenthSlotDropTarget(activePreviewPayload, dragOverCell, voiceIndex, 'main', rowIndex, cellIndex, slotIndex)}>
                          {#if diamondNote}
                            <button
                              type="button"
                              class={`placed-note diamond sixteenth ${cell.notes[0] && cell.notes[1] ? 'split' : 'single'}`}
                              class:played-note-muted={isPlayedCell(playedCellIndexes, 'main', rowIndex, cellIndex)}
                              style={`--token-color:${diamondNote.color};`}
                              draggable="true"
                              title={placedNoteTitle(diamondNote)}
                              on:dragstart={(event) => handleCellDragStart(event, voiceIndex, 'main', rowIndex, cellIndex, diamondNote, slotIndex)}
                              on:dragend={handleAnyDragEnd}
                              on:contextmenu={(event) => removeCellNote(event, voiceIndex, 'main', rowIndex, cellIndex, slotIndex)}
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
                        <div class="sixteenth-slot" class:slot-drop-target={isDragPreviewSixteenthSlot(activePreviewPayload, dragOverCell, voiceIndex, 'main', rowIndex, cellIndex, previewSlot)}>
                          {#if isDragPreviewSixteenthSlot(activePreviewPayload, dragOverCell, voiceIndex, 'main', rowIndex, cellIndex, previewSlot)}
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
                        class:drag-preview-circle-continuation={isCircleDragPreviewOnSecondMicrobeat(activePreviewPayload, dragOverCell, voiceIndex, 'main', rowIndex, cellIndex)}
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
          </div>
        </article>
        {/each}
      </div>
    </div>

    <div class="karaoke-overlay" aria-hidden="true">
      {#each karaokeOverlayBalls as overlayBall (overlayBall.voiceIndex)}
        {#if overlayBall.style}
          <div
            class="karaoke-ball"
            class:karaoke-ball--voice-a={voiceCount === 2 && overlayBall.voiceIndex === 0}
            class:karaoke-ball--voice-b={voiceCount === 2 && overlayBall.voiceIndex === 1}
            class:karaoke-ball--count-in={countInDisplayNumber !== null}
            style={overlayBall.style}
          >
            {#if countInDisplayNumber !== null}
              <span class="karaoke-ball-count">{countInDisplayNumber}</span>
            {/if}
          </div>
        {/if}
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
    <div class="settings-section">
      <h3 class="settings-section-label">Voices</h3>
      <div class="settings-row">
        <div class="settings-field">
          <label for="settings-voice-count-select">Canvas voices</label>
          <select id="settings-voice-count-select" value={String(voiceCount)} on:change={handleVoiceCountModeChange}>
            <option value="1">1 voice</option>
            <option value="2">2 voices</option>
          </select>
        </div>
        {#if voiceCount === 2}
          <div class="settings-field">
            <label for="settings-voice-layout-select">Row layout</label>
            <select id="settings-voice-layout-select" value={voiceLayoutMode} on:change={handleVoiceLayoutModeChange}>
              <option value="intertwined">A B A B</option>
              <option value="separate">A A B B</option>
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

{#if pickupBeatsModalOpen}
  <div class="share-modal-backdrop" on:click={() => (pickupBeatsModalOpen = false)} role="presentation"></div>
  <div class="pickup-modal" role="dialog" aria-modal="true" aria-label="Pickup beats and canvas rows">
    <div class="share-modal-header">
      <h2>Canvas</h2>
      <button type="button" class="share-modal-close" on:click={() => (pickupBeatsModalOpen = false)} aria-label="Close">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>
    <div class="pickup-modal-body">
      {#if !isStudentView || !activeStudentView.hidePickupBeats}
      <div class="pickup-modal-section">
        <h3 class="pickup-modal-section-label">Pickup Beats</h3>
        <div class="pickup-controls" role="group" aria-label="Anacrusis pickup beats">
          {#each [0, 1, 2, 3] as beatCount}
            <button type="button" class:active={pickupBeats === beatCount} on:click={() => setPickupBeats(beatCount)}>
              {beatCount}
            </button>
          {/each}
        </div>
      </div>
      {/if}
      {#if !isStudentView || !activeStudentView.hideCanvasActions}
      <div class="pickup-modal-section">
        <h3 class="pickup-modal-section-label">Canvas Rows</h3>
        <div class="canvas-actions">
          <button type="button" on:click={addRow}>Add Row</button>
          <button type="button" on:click={removeRow} disabled={sharedRowCount() <= 1}>Remove Row</button>
        </div>
      </div>
      {/if}
    </div>
  </div>
{/if}
