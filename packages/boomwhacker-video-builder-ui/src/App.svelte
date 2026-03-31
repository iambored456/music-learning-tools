<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import {
    BOOMWHACKER_LANES,
    clampNoteEndSlotIndex,
    createConstantTempoBeatPins,
    createBoomwhackerVideoBuilderProject,
    createSampleBoomwhackerVideoBuilderProject,
    deriveGuideLines,
    deriveTimedNotes,
    deriveTimingModel,
    estimateTempoFromBeatPins,
    getDefaultSlotRangeForShape,
    notesOverlap,
    parseBoomwhackerVideoBuilderProject,
    slotIndexToTimeSec,
    sortGridNotes,
    stampProjectUpdatedAt,
    type BeatPin,
    type DerivedBeatSpan,
    type BoomwhackerGridNote,
    type BoomwhackerVideoBuilderProject,
    type MacrobeatGrouping,
    type TimedBoomwhackerNote,
  } from '@mlt/boomwhacker-video-builder-core';

  import {
    hydrateProjectAudio,
    hydrateProjectAudioFromBlob,
    importAudioFile,
    type ImportedAudioAsset,
  } from './browser/audio.js';
  import {
    loadLocalProjectAudio,
    saveLocalProjectAudio,
  } from './browser/audioStore.js';
  import {
    audioBufferToWavBlob,
    renderTransposedAudioBuffer,
  } from './browser/audioTransform.js';
  import { readFileAsDataUrl, saveBlobFile, saveTextFile } from './browser/files.js';
  import { getExportTotalDurationSec, renderExportFrame } from './browser/exportRenderer.js';
  import { TrianglePreviewSynth } from './browser/previewSynth.js';
  import {
    exportProjectVideo,
    getPreferredExportContainer,
    type ExportVideoContainer,
  } from './browser/videoExport.js';
  import {
    getActiveHighwayBeatSpan,
    getHighwayJudgmentAreaWidthPx,
    getHighwayNoteLayout,
    getVisibleHighwayGuides,
    shouldHighlightDownbeatGuide,
    shouldRenderGuideAsBeat,
  } from './highwayLayout.js';

  type NoteShape = BoomwhackerGridNote['shape'];

  const reuseHighlights = [
    'Reuse Boomwhacker note-bank ids, colors, and pitch intervals from boomwhacker-sketchpad-core.',
    'Reuse Student Notation grouping semantics and the grid-to-time adapter pattern.',
    'Reuse note-highway judgment-line and renderer primitives later in the preview/export path.',
  ];

  const newModules = [
    'Audio ingest + waveform extraction',
    'Audio transposition to C with duration preserved',
    'Beat-pin analysis and manual correction',
    'Beat-pin-to-slot timing derivation',
    'Deterministic browser export pipeline',
  ];
  const noteShapeOptions: Array<{
    shape: NoteShape;
    label: string;
    hint: string;
  }> = [
    { shape: 'circle', label: 'Circle', hint: 'Places a full beat span on the lane you click.' },
    { shape: 'oval', label: 'Oval', hint: 'Places the local half-beat on the lane you click.' },
    { shape: 'diamond', label: 'Sixteenth', hint: 'Places one derived slot on the lane you click.' },
  ];
  const VISUAL_BOOMWHACKER_LANES = [...BOOMWHACKER_LANES].reverse();

  const AUTOSAVE_STORAGE_KEY = 'mlt/boomwhacker-video-builder/autosave-v1';
  const MIN_TIMELINE_ZOOM = 1;
  const MAX_TIMELINE_ZOOM = 8;
  const COMPACT_WAVEFORM_HEIGHT_PX = 120;
  const CIRCLE_RESIZE_HOTZONE_PX = 18;
  const TRANSPOSE_MIN_SEMITONES = -12;
  const TRANSPOSE_MAX_SEMITONES = 12;
  const SOURCE_TONIC_OPTIONS = [
    { label: 'C', pitchClass: 0 },
    { label: 'C# / Db', pitchClass: 1 },
    { label: 'D', pitchClass: 2 },
    { label: 'D# / Eb', pitchClass: 3 },
    { label: 'E', pitchClass: 4 },
    { label: 'F', pitchClass: 5 },
    { label: 'F# / Gb', pitchClass: 6 },
    { label: 'G', pitchClass: 7 },
    { label: 'G# / Ab', pitchClass: 8 },
    { label: 'A', pitchClass: 9 },
    { label: 'A# / Bb', pitchClass: 10 },
    { label: 'B', pitchClass: 11 },
  ] as const;
  const highwayWidthPx = 920;
  const judgmentLineRatio = 0.24;
  const msVisibleAhead = 3200;
  const pixelsPerSecond = (highwayWidthPx * (1 - judgmentLineRatio)) / (msVisibleAhead / 1000);
  const HISTORY_LIMIT = 80;
  const SINGLE_SLOT_SIXTEENTH_HEX_PATH = 'M60 5 L35 30 L35 90 L60 115 L85 90 L85 30 Z';
  const BLANK_HIGHWAY_MIN_BPM = 20;
  const BLANK_HIGHWAY_MAX_BPM = 320;
  const BLANK_HIGHWAY_MIN_BEAT_COUNT = 1;
  const BLANK_HIGHWAY_MAX_BEAT_COUNT = 256;
  const BLANK_HIGHWAY_DEFAULT_BPM = 120;
  const BLANK_HIGHWAY_DEFAULT_BEAT_COUNT = 16;
  const NOTE_HIT_FLASH_MIN_DURATION_SEC = 0.12;
  const NOTE_HIT_FLASH_MAX_DURATION_SEC = 0.38;
  const TAP_ENTRY_COUNT_IN_BEATS = 4;
  const TAP_ENTRY_COUNT_IN_STEPS = [0, 1, 2, 3] as const;
  const SKETCHPAD_DEFAULT_ROOT_MIDI = 60;
  const hubHref = '../';
  const homeIconHref = new URL('../../boomwhacker-sketchpad-ui/src/assets/home-icon.svg', import.meta.url).href;
  const studentNotationLassoIconHref = new URL('../../student-notation-ui/public/assets/icons/lasso-tool.svg', import.meta.url).href;
  const studentNotationEraserIconHref = new URL('../../student-notation-ui/public/assets/icons/eraser.svg', import.meta.url).href;

  type EditorHistoryEntry = {
    project: BoomwhackerVideoBuilderProject;
    selectedNoteIds: string[];
    selectedBeatPinId: string | null;
  };

  type NoteDragState = {
    historyEntry: EditorHistoryEntry;
    noteIds: string[];
    anchorRow: number;
    anchorSlotIndex: number;
    stageRect: DOMRect;
    currentRowDelta: number;
    currentSlotDelta: number;
  };

  type NoteBoxSelectionState = {
    startClientX: number;
    startClientY: number;
    currentClientX: number;
    currentClientY: number;
    stageRect: DOMRect;
    initialSelectedNoteIds: string[];
    hasMoved: boolean;
  };

  type NoteResizeState = {
    historyEntry: EditorHistoryEntry;
    noteId: string;
    stageRect: DOMRect;
    currentEndSlotIndex: number;
  };

  type HighwayPlacementPreview = {
    shape: NoteShape;
    row: number;
    startSlotIndex: number;
    endSlotIndex: number;
  };

  type HighwayEditorTool = 'place' | 'lasso' | 'eraser';

  type HighwayEraserPreview = {
    row: number;
    startSlotIndex: number;
    endSlotIndex: number;
  };

  type HighwayEraseState = {
    historyEntry: EditorHistoryEntry;
    stageRect: DOMRect;
    deletedNoteIds: string[];
  };

  type NoteBankPlacementState = {
    shape: NoteShape;
    startClientX: number;
    startClientY: number;
    currentClientX: number;
    currentClientY: number;
    hasMoved: boolean;
    preview: HighwayPlacementPreview | null;
  };

  type PreviewScrubState = {
    pointerId: number;
    startPlaybackOnRelease: boolean;
  };

  type AutosaveEnvelope = {
    savedAtIso: string;
    project: BoomwhackerVideoBuilderProject;
  };

  type AutosaveRecoveryState = {
    savedAtIso: string | null;
    title: string;
    audioFileName: string | null;
    requiresAudioReattach: boolean;
  };

  type AudioInputMode = 'setup-import' | 'reattach-project';
  type BeatMapStartMode = 'tap' | 'auto';
  type TapEntryPhase = 'idle' | 'count-in' | 'capturing';
  type TapEntryPreviewPin = {
    id: string;
    timeSec: number;
  };

  let project = createBoomwhackerVideoBuilderProject();
  let audioInput: HTMLInputElement | null = null;
  let projectInput: HTMLInputElement | null = null;
  let backgroundImageInput: HTMLInputElement | null = null;
  let setupAudioPreviewPlayer: HTMLAudioElement | null = null;
  let audioPlayer: HTMLAudioElement | null = null;
  let beatEditorCurrentTimeSec = 0;
  let beatEditorIsPlaying = false;
  let beatEditorAnimationFrameId: number | null = null;
  let previewAudioPlayer: HTMLAudioElement | null = null;
  let compactWaveformViewport: HTMLDivElement | null = null;
  let detailWaveformViewport: HTMLDivElement | null = null;
  let beatEditorTimeline: HTMLDivElement | null = null;
  let editorHighwayViewport: HTMLDivElement | null = null;
  let editorHighwayStage: HTMLDivElement | null = null;
  let editorHighwayViewportWidthPx = highwayWidthPx;
  let editorHighwayPixelsPerSecond = pixelsPerSecond;
  let editorHighwayLeadingPaddingPx = highwayWidthPx * judgmentLineRatio;
  let editorHighwayTrailingPaddingPx = Math.max(0, highwayWidthPx - editorHighwayLeadingPaddingPx);
  let editorHighwayDurationSec = 0;
  let editorHighwayStageWidthPx = highwayWidthPx;
  let exportPreviewCanvas: HTMLCanvasElement | null = null;
  let decodedAudioBuffer: AudioBuffer | null = null;
  let playbackAudioBuffer: AudioBuffer | null = null;
  let sourceAudioPreviewUrl: string | null = null;
  let audioPreviewUrl: string | null = null;
  let waveformPeaks: number[] = [];
  let estimatedTempoBpm: number | null = null;
  let statusMessage = 'Create a new project or upload audio to begin.';
  let errorMessage = '';
  let busyMessage = '';
  let activeNoteShape: NoteShape = 'circle';
  let activePlacementRow = BOOMWHACKER_LANES[0]?.row ?? 0;
  let selectedBeatPinId: string | null = null;
  let selectedNoteIds: string[] = [];
  let clipboardNotes: BoomwhackerGridNote[] = [];
  let suppressNextNoteClick = false;
  let suppressNextSlotCellClick = false;
  let isDraggingBeatPin = false;
  let tapBeatTimesSec: number[] = [];
  let tapSessionStartMs: number | null = null;
  let tapEntryPhase: TapEntryPhase = 'idle';
  let tapEntrySessionToken = 0;
  let tapEntryCountInBeatsRemaining = TAP_ENTRY_COUNT_IN_BEATS;
  let tapEntryCountInBeatProgress = 0;
  let tapEntryCountInBeatDurationSec = 60 / BLANK_HIGHWAY_DEFAULT_BPM;
  let tapEntryStartTimeSec = 0;
  let tapEntryAnimationFrameId: number | null = null;
  let tapEntryPreviewPins: TapEntryPreviewPin[] = [];
  let previewCurrentTimeSec = 0;
  let previewIsPlaying = false;
  let previewAnimationFrameId: number | null = null;
  let previewClockAnchorTimeSec = 0;
  let previewClockAnchorMs = 0;
  let waveformDurationSec = 0;
  let previewDurationSec = 0;
  let previewSynthCursorTimeSec = 0;
  let previewScrubState: PreviewScrubState | null = null;
  const DEBUG_BEAT_EDITOR_PLAYHEAD = false;
  const DEBUG_HIGHWAY_SCROLL = false;

  function hasCapturedTapEntryData(): boolean {
    return tapBeatTimesSec.length > 0;
  }

  function hasExistingEditorWork(sourceProject: BoomwhackerVideoBuilderProject = project): boolean {
    return (
      sourceProject.beatMap.beatPins.length > 0
      || sourceProject.notes.placedNotes.length > 0
      || sourceProject.annotations.sections.length > 0
      || sourceProject.annotations.timelineNotes.length > 0
      || hasCapturedTapEntryData()
    );
  }
  let beatEditorDebugLastAnimationBucket = -1;
  let highwayScrollDebugLastBucket = -1;
  let highwayZoomPreview = '';
  let highwayZoomPreviewTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let exportPreviewTimeSec = 0;
  let exportRenderError = '';
  let exportCapabilityWarning = '';
  let preferredExportContainer: ExportVideoContainer | null = null;
  let hasInitializedAutosave = false;
  let suppressAutosave = false;
  let transposeSourceTonicLabel = 'C';
  let audioTransformRequestId = 0;
  let isSetupModalOpen = false;
  let isGroupingModalOpen = false;
  let pendingSetupAudioFile: File | null = null;
  let setupModalTitle = project.metadata.title;
  let setupModalTitleTouched = false;
  let setupModalGrouping: MacrobeatGrouping = project.grid.defaultMacrobeatGrouping;
  let setupModalBeatMapMode: BeatMapStartMode = 'tap';
  let groupingModalSelection: MacrobeatGrouping = project.grid.defaultMacrobeatGrouping;
  let blankHighwayBpm = BLANK_HIGHWAY_DEFAULT_BPM;
  let blankHighwayBeatCount = BLANK_HIGHWAY_DEFAULT_BEAT_COUNT;
  let undoHistory: EditorHistoryEntry[] = [];
  let redoHistory: EditorHistoryEntry[] = [];
  let beatPinDragHistoryEntry: EditorHistoryEntry | null = null;
  let noteDragState: NoteDragState | null = null;
  let noteBoxSelectionState: NoteBoxSelectionState | null = null;
  let noteResizeState: NoteResizeState | null = null;
  let noteBankPlacementState: NoteBankPlacementState | null = null;
  let highwayEditorTool: HighwayEditorTool = 'place';
  let highwayTemporaryEraserActive = false;
  let highwayEraseState: HighwayEraseState | null = null;
  let highwayHoverPreview: HighwayPlacementPreview | null = null;
  let activeHighwayPlacementPreview: HighwayPlacementPreview | null = null;
  let highwayEraserPreview: HighwayEraserPreview | null = null;
  let removeHighwayEraseListeners: (() => void) | null = null;
  let resizeHotspotNoteId: string | null = null;
  let autosaveWriteTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let hasPendingAutosaveWrite = false;
  let lastAutosaveAtIso: string | null = null;
  let autosaveRecoveryState: AutosaveRecoveryState | null = null;
  let audioInputMode: AudioInputMode = 'setup-import';
  let canRenderBeatEditorTimeline = false;
  let activeJudgmentBeatSpan: DerivedBeatSpan | null = null;
  const previewSynth = new TrianglePreviewSynth();

  function replaceAudioPreviewUrl(nextUrl: string | null): void {
    if (audioPreviewUrl && audioPreviewUrl !== nextUrl && audioPreviewUrl !== sourceAudioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
    }
    audioPreviewUrl = nextUrl;
  }

  function replaceSourceAudioPreviewUrl(nextUrl: string | null): void {
    if (sourceAudioPreviewUrl && sourceAudioPreviewUrl !== nextUrl && sourceAudioPreviewUrl !== audioPreviewUrl) {
      URL.revokeObjectURL(sourceAudioPreviewUrl);
    }
    sourceAudioPreviewUrl = nextUrl;
  }

  function formatTimestampLabel(value: string | null): string {
    if (!value) {
      return 'unknown time';
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      return 'unknown time';
    }

    const now = new Date();
    const isSameDay = parsedDate.toDateString() === now.toDateString();
    return isSameDay
      ? parsedDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : parsedDate.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }

  function clampTransposeSemitones(value: number): number {
    const roundedValue = Number.isFinite(value) ? Math.round(value) : 0;
    return Math.max(
      TRANSPOSE_MIN_SEMITONES,
      Math.min(TRANSPOSE_MAX_SEMITONES, roundedValue),
    );
  }

  function formatSignedSemitones(value: number): string {
    const normalizedValue = clampTransposeSemitones(value);
    if (normalizedValue === 0) {
      return '0 semitones';
    }
    return `${normalizedValue > 0 ? '+' : ''}${normalizedValue} semitone${Math.abs(normalizedValue) === 1 ? '' : 's'}`;
  }

  function formatTransposeSummary(value: number): string {
    const normalizedValue = clampTransposeSemitones(value);
    return normalizedValue === 0 ? 'Original key' : formatSignedSemitones(normalizedValue);
  }

  function getClosestTransposeToC(pitchClass: number): number {
    const normalizedPitchClass = ((pitchClass % 12) + 12) % 12;
    if (normalizedPitchClass === 0) {
      return 0;
    }

    const downwardShift = -normalizedPitchClass;
    const upwardShift = 12 - normalizedPitchClass;
    return Math.abs(downwardShift) <= Math.abs(upwardShift)
      ? downwardShift
      : upwardShift;
  }

  function clampTimelineZoom(value: number): number {
    if (!Number.isFinite(value)) {
      return MIN_TIMELINE_ZOOM;
    }
    return Math.max(MIN_TIMELINE_ZOOM, Math.min(MAX_TIMELINE_ZOOM, value));
  }

  function clampPreviewVolume(value: number): number {
    if (!Number.isFinite(value)) {
      return 1;
    }

    return Math.max(0, Math.min(1, value));
  }

  function formatVolumePercent(value: number): string {
    return `${Math.round(clampPreviewVolume(value) * 100)}%`;
  }

  function normalizeWheelDelta(delta: number, deltaMode: number): number {
    if (deltaMode === WheelEvent.DOM_DELTA_LINE) {
      return delta * 16;
    }
    if (deltaMode === WheelEvent.DOM_DELTA_PAGE) {
      return delta * Math.max(1, window.innerHeight);
    }
    return delta;
  }

  function isFreshBlankProject(sourceProject: BoomwhackerVideoBuilderProject = project): boolean {
    return (
      !sourceProject.audio
      && sourceProject.beatMap.beatPins.length === 0
      && sourceProject.notes.placedNotes.length === 0
    );
  }

  function needsAudioReattach(sourceProject: BoomwhackerVideoBuilderProject = project): boolean {
    return Boolean(
      sourceProject.audio
      && !sourceAudioPreviewUrl
      && !decodedAudioBuffer,
    );
  }

  function getProjectAudioToken(projectId: string): string {
    return `project-audio:${projectId}`;
  }

  $: {
    const audioVolume = clampPreviewVolume(project.previewState.audioVolume);
    if (setupAudioPreviewPlayer) {
      setupAudioPreviewPlayer.volume = audioVolume;
    }
    if (audioPlayer) {
      audioPlayer.volume = audioVolume;
    }
    if (previewAudioPlayer) {
      previewAudioPlayer.volume = audioVolume;
    }
  }

  $: previewSynth.setMasterVolume(project.previewState.synthVolume);

  async function persistProjectAudioLocally(
    projectId: string,
    file: File,
    sourceAudio: BoomwhackerVideoBuilderProject['audio'],
  ): Promise<BoomwhackerVideoBuilderProject['audio']> {
    if (!sourceAudio) {
      return null;
    }

    const token = getProjectAudioToken(projectId);
    try {
      const saved = await saveLocalProjectAudio(token, file);
      if (!saved) {
        return sourceAudio;
      }

      return {
        ...sourceAudio,
        storageStrategy: 'external-file',
        externalFileToken: token,
      };
    } catch (error) {
      console.warn('Boomwhacker Video Builder local audio persistence failed.', error);
      return sourceAudio;
    }
  }

  async function hydrateProjectAudioFromLocalStore(
    projectAudio: NonNullable<BoomwhackerVideoBuilderProject['audio']>,
  ): Promise<ImportedAudioAsset | null> {
    const token = projectAudio.externalFileToken;
    if (!token) {
      return null;
    }

    try {
      const storedFile = await loadLocalProjectAudio(token);
      if (!storedFile) {
        return null;
      }

      return hydrateProjectAudioFromBlob(projectAudio, storedFile);
    } catch (error) {
      console.warn('Boomwhacker Video Builder local audio restore failed.', error);
      return null;
    }
  }

  function syncSetupModalState(sourceProject: BoomwhackerVideoBuilderProject = project): void {
    setupModalTitle = sourceProject.metadata.title;
    setupModalGrouping = sourceProject.grid.defaultMacrobeatGrouping;
    setupModalBeatMapMode = 'tap';
    setupModalTitleTouched = false;
    pendingSetupAudioFile = null;
  }

  function openSetupModal(): void {
    syncSetupModalState();
    isSetupModalOpen = true;
  }

  function closeSetupModal(): void {
    isSetupModalOpen = false;
    pendingSetupAudioFile = null;
    setupModalTitleTouched = false;
  }

  function openGroupingModal(): void {
    groupingModalSelection = project.grid.defaultMacrobeatGrouping;
    isGroupingModalOpen = true;
  }

  function closeGroupingModal(): void {
    isGroupingModalOpen = false;
    groupingModalSelection = project.grid.defaultMacrobeatGrouping;
  }

  function handleSetupTitleInput(event: Event): void {
    setupModalTitle = (event.currentTarget as HTMLInputElement).value;
    setupModalTitleTouched = true;
  }

  function promptSetupAudioSelection(): void {
    audioInputMode = 'setup-import';
    audioInput?.click();
  }

  function promptAudioReattachSelection(): void {
    audioInputMode = 'reattach-project';
    audioInput?.click();
  }

  function applyProjectSetup(title: string, grouping: MacrobeatGrouping, nextStatus: string): void {
    const nextTitle = title.trim() || 'Untitled Boomwhacker Video';
    setProjectState(
      touchProject({
        ...project,
        metadata: {
          ...project.metadata,
          title: nextTitle,
        },
        grid: {
          ...project.grid,
          defaultMacrobeatGrouping: grouping,
        },
        viewState: {
          ...project.viewState,
          activeTab: project.viewState.activeTab === 'setup' ? 'editor' : project.viewState.activeTab,
        },
        exportState: {
          ...project.exportState,
          titleCard: {
            ...project.exportState.titleCard,
            title: nextTitle,
          },
        },
      }),
      nextStatus,
      { recordHistory: true },
    );
  }

  async function applyTimelineZoom(
    zoomFactor: number,
    viewport: HTMLDivElement | null,
    clientX: number,
  ): Promise<void> {
    if (!viewport || !Number.isFinite(zoomFactor) || zoomFactor <= 0) {
      return;
    }

    const nextZoom = clampTimelineZoom(project.viewState.zoom * zoomFactor);
    if (Math.abs(nextZoom - project.viewState.zoom) < 0.001) {
      return;
    }

    const rect = viewport.getBoundingClientRect();
    const anchorOffsetPx = Math.min(rect.width, Math.max(0, clientX - rect.left));
    const contentWidthBefore = Math.max(rect.width, viewport.scrollWidth);
    const anchorContentRatio = contentWidthBefore > 0
      ? (viewport.scrollLeft + anchorOffsetPx) / contentWidthBefore
      : 0.5;

    updateViewState({ zoom: nextZoom });
    if (viewport === editorHighwayViewport) {
      showHighwayZoomPreview(nextZoom);
    }
    await tick();

    const contentWidthAfter = Math.max(viewport.clientWidth, viewport.scrollWidth);
    const unclampedScrollLeft = (contentWidthAfter * anchorContentRatio) - anchorOffsetPx;
    const maxScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    viewport.scrollLeft = Math.max(0, Math.min(maxScrollLeft, unclampedScrollLeft));
  }

  function showHighwayZoomPreview(zoom: number): void {
    highwayZoomPreview = `${zoom.toFixed(2)}x`;
    if (highwayZoomPreviewTimeoutId !== null) {
      clearTimeout(highwayZoomPreviewTimeoutId);
    }
    highwayZoomPreviewTimeoutId = setTimeout(() => {
      highwayZoomPreview = '';
      highwayZoomPreviewTimeoutId = null;
    }, 900);
  }

  function handleTimelineWheel(event: WheelEvent): void {
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      return;
    }

    const viewport = event.currentTarget as HTMLDivElement | null;
    if (!viewport) {
      return;
    }

    event.preventDefault();
    const normalizedDeltaY = normalizeWheelDelta(event.deltaY, event.deltaMode);
    const zoomFactor = Math.exp(-normalizedDeltaY * 0.003);
    void applyTimelineZoom(zoomFactor, viewport, event.clientX);
  }

  function clearAudioPresentation(): void {
    tapEntrySessionToken += 1;
    resetTapEntryState();
    cancelBeatEditorAnimation();
    beatEditorIsPlaying = false;
    beatEditorCurrentTimeSec = 0;
    decodedAudioBuffer = null;
    playbackAudioBuffer = null;
    waveformPeaks = [];
    estimatedTempoBpm = estimateTempoFromBeatPins(project.beatMap.beatPins);
    replaceAudioPreviewUrl(null);
    replaceSourceAudioPreviewUrl(null);
    forceGridOnlyPlaybackWhenAudioMissing();
  }

  async function refreshPlaybackAudioPresentation(): Promise<boolean> {
    const requestId = ++audioTransformRequestId;

    if (!decodedAudioBuffer || !sourceAudioPreviewUrl) {
      playbackAudioBuffer = null;
      replaceAudioPreviewUrl(null);
      return true;
    }

    const transposeSemitones = clampTransposeSemitones(project.audioProcessing.transposeSemitones);
    playbackAudioBuffer = decodedAudioBuffer;

    if (transposeSemitones === 0) {
      replaceAudioPreviewUrl(sourceAudioPreviewUrl);
      return true;
    }

    busyMessage = `Rendering transposed audio (${formatSignedSemitones(transposeSemitones)})...`;

    try {
      const transformedBuffer = await renderTransposedAudioBuffer(decodedAudioBuffer, transposeSemitones);
      if (requestId !== audioTransformRequestId) {
        return false;
      }

      playbackAudioBuffer = transformedBuffer;
      replaceAudioPreviewUrl(URL.createObjectURL(audioBufferToWavBlob(transformedBuffer)));
      return true;
    } catch (error) {
      if (requestId !== audioTransformRequestId) {
        return false;
      }

      console.error('Boomwhacker Video Builder audio transpose failed.', error);
      playbackAudioBuffer = decodedAudioBuffer;
      replaceAudioPreviewUrl(sourceAudioPreviewUrl);
      errorMessage = 'Audio transpose failed in this browser. Preview and export are using the original audio.';
      return false;
    } finally {
      if (requestId === audioTransformRequestId) {
        busyMessage = '';
      }
    }
  }

  async function applyAudioPresentation(asset: ImportedAudioAsset | null): Promise<void> {
    if (!asset) {
      clearAudioPresentation();
      return;
    }

    const shouldRestorePlayAudio = (
      !project.previewState.playAudio
      && !sourceAudioPreviewUrl
      && !decodedAudioBuffer
    );

    if (shouldRestorePlayAudio) {
      project = {
        ...project,
        previewState: {
          ...project.previewState,
          playAudio: true,
        },
      };
    }

    replaceAudioPreviewUrl(null);
    replaceSourceAudioPreviewUrl(asset.audioPreviewUrl);
    decodedAudioBuffer = asset.audioBuffer;
    playbackAudioBuffer = asset.audioBuffer;
    waveformPeaks = asset.waveform.peaks;
    estimatedTempoBpm = estimateTempoFromBeatPins(project.beatMap.beatPins) ?? asset.beatAnalysis.estimatedTempoBpm;
    replaceAudioPreviewUrl(asset.audioPreviewUrl);
    await refreshPlaybackAudioPresentation();
  }

  function createHistoryEntry(sourceProject: BoomwhackerVideoBuilderProject = project): EditorHistoryEntry {
    return {
      project: sourceProject,
      selectedNoteIds: [...selectedNoteIds],
      selectedBeatPinId,
    };
  }

  function resetHistory(): void {
    undoHistory = [];
    redoHistory = [];
    beatPinDragHistoryEntry = null;
    noteDragState = null;
    noteBoxSelectionState = null;
    noteResizeState = null;
    noteBankPlacementState = null;
    highwayHoverPreview = null;
  }

  function clearPendingAutosaveWrite(): void {
    if (autosaveWriteTimeoutId !== null) {
      clearTimeout(autosaveWriteTimeoutId);
      autosaveWriteTimeoutId = null;
    }
  }

  function buildAutosaveEnvelope(sourceProject: BoomwhackerVideoBuilderProject): AutosaveEnvelope {
    return {
      savedAtIso: new Date().toISOString(),
      project: buildAutosaveSnapshot(sourceProject),
    };
  }

  function flushAutosaveWrite(): void {
    clearPendingAutosaveWrite();
    hasPendingAutosaveWrite = false;

    if (
      !hasInitializedAutosave
      || suppressAutosave
      || isDraggingBeatPin
      || noteDragState !== null
      || noteResizeState !== null
      || noteBankPlacementState !== null
    ) {
      return;
    }

    try {
      const autosaveEnvelope = buildAutosaveEnvelope(project);
      localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(autosaveEnvelope));
      lastAutosaveAtIso = autosaveEnvelope.savedAtIso;
    } catch (error) {
      console.warn('Boomwhacker Video Builder autosave write failed.', error);
    }
  }

  function queueAutosaveWrite(): void {
    if (
      !hasInitializedAutosave
      || suppressAutosave
      || isDraggingBeatPin
      || noteDragState !== null
      || noteResizeState !== null
      || noteBankPlacementState !== null
    ) {
      return;
    }

    clearPendingAutosaveWrite();
    hasPendingAutosaveWrite = true;
    autosaveWriteTimeoutId = setTimeout(() => {
      autosaveWriteTimeoutId = null;
      flushAutosaveWrite();
    }, 450);
  }

  function clearAutosaveRecoveryCopy(nextStatus = 'Cleared the browser recovery copy.'): void {
    clearPendingAutosaveWrite();
    hasPendingAutosaveWrite = false;
    lastAutosaveAtIso = null;
    autosaveRecoveryState = null;
    localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
    statusMessage = nextStatus;
  }

  function dismissAutosaveRecoveryBanner(): void {
    autosaveRecoveryState = null;
  }

  function parseAutosaveEnvelope(serializedValue: string): AutosaveEnvelope {
    const parsedValue = JSON.parse(serializedValue) as unknown;
    const parsedRecord = parsedValue !== null && typeof parsedValue === 'object'
      ? parsedValue as Record<string, unknown>
      : null;

    if (parsedRecord && parsedRecord.project !== undefined) {
      const savedAtIso = typeof parsedRecord.savedAtIso === 'string'
        ? parsedRecord.savedAtIso
        : null;
      const project = parseBoomwhackerVideoBuilderProject(JSON.stringify(parsedRecord.project));
      return {
        savedAtIso: savedAtIso ?? project.metadata.updatedAtIso,
        project,
      };
    }

    const project = parseBoomwhackerVideoBuilderProject(serializedValue);
    return {
      savedAtIso: project.metadata.updatedAtIso,
      project,
    };
  }

  function normalizeLocalMacrobeatGroupings(
    localMacrobeatGroupings: BoomwhackerVideoBuilderProject['grid']['localMacrobeatGroupings'],
    defaultGrouping: MacrobeatGrouping,
    beatSpanCount: number,
  ): BoomwhackerVideoBuilderProject['grid']['localMacrobeatGroupings'] {
    const overrideMap = new Map<number, MacrobeatGrouping>();

    for (const override of localMacrobeatGroupings) {
      if (
        !Number.isInteger(override.beatIndex)
        || override.beatIndex < 0
        || override.beatIndex >= beatSpanCount
        || override.grouping === defaultGrouping
      ) {
        continue;
      }

      overrideMap.set(override.beatIndex, override.grouping);
    }

    return [...overrideMap.entries()]
      .sort((left, right) => left[0] - right[0])
      .map(([beatIndex, grouping]) => ({ beatIndex, grouping }));
  }

  function sanitizeProjectGrid(sourceProject: BoomwhackerVideoBuilderProject): BoomwhackerVideoBuilderProject {
    const beatSpanCount = Math.max(0, sourceProject.beatMap.beatPins.length - 1);
    const localMacrobeatGroupings = normalizeLocalMacrobeatGroupings(
      sourceProject.grid.localMacrobeatGroupings,
      sourceProject.grid.defaultMacrobeatGrouping,
      beatSpanCount,
    );

    const isUnchanged = (
      localMacrobeatGroupings.length === sourceProject.grid.localMacrobeatGroupings.length
      && localMacrobeatGroupings.every((override, index) => (
        override.beatIndex === sourceProject.grid.localMacrobeatGroupings[index]?.beatIndex
        && override.grouping === sourceProject.grid.localMacrobeatGroupings[index]?.grouping
      ))
    );

    if (isUnchanged) {
      return sourceProject;
    }

    return {
      ...sourceProject,
      grid: {
        ...sourceProject.grid,
        localMacrobeatGroupings,
      },
    };
  }

  function applyHistoryEntry(entry: EditorHistoryEntry, nextStatus: string): void {
    project = sanitizeProjectGrid(entry.project);
    selectedNoteIds = [...entry.selectedNoteIds];
    selectedBeatPinId = entry.selectedBeatPinId;
    estimatedTempoBpm = estimateTempoFromBeatPins(project.beatMap.beatPins);
    if (!isSetupModalOpen) {
      setupModalGrouping = project.grid.defaultMacrobeatGrouping;
    }
    if (!isGroupingModalOpen) {
      groupingModalSelection = project.grid.defaultMacrobeatGrouping;
    }
    statusMessage = nextStatus;
    errorMessage = '';
  }

  type SetProjectStateOptions = {
    recordHistory?: boolean;
    historyEntry?: EditorHistoryEntry | null;
    clearRedo?: boolean;
  };

  function setProjectState(
    nextProject: BoomwhackerVideoBuilderProject,
    nextStatus?: string,
    options?: SetProjectStateOptions,
  ): void {
    if (options?.recordHistory) {
      const historyEntry = options.historyEntry ?? createHistoryEntry();
      undoHistory = [
        ...undoHistory.slice(-(HISTORY_LIMIT - 1)),
        historyEntry,
      ];
      if (options.clearRedo ?? true) {
        redoHistory = [];
      }
    }

    project = sanitizeProjectGrid(nextProject);
    estimatedTempoBpm = estimateTempoFromBeatPins(project.beatMap.beatPins);
    if (!isSetupModalOpen) {
      setupModalGrouping = project.grid.defaultMacrobeatGrouping;
    }
    if (!isGroupingModalOpen) {
      groupingModalSelection = project.grid.defaultMacrobeatGrouping;
    }
    if (nextStatus) {
      statusMessage = nextStatus;
    }
    errorMessage = '';
  }

  function updateViewState(nextViewState: Partial<BoomwhackerVideoBuilderProject['viewState']>): void {
    project = {
      ...project,
      viewState: {
        ...project.viewState,
        ...nextViewState,
      },
    };
  }

  function setActiveTab(activeTab: BoomwhackerVideoBuilderProject['viewState']['activeTab']): void {
    if (activeTab === 'setup') {
      openSetupModal();
      return;
    }
    updateViewState({ activeTab });
  }

  function describePlaybackMode(): string {
    const canUseAudio = Boolean(audioPreviewUrl) && project.previewState.playAudio;
    if (canUseAudio && project.previewState.playGrid) {
      return 'audio and grid';
    }
    if (canUseAudio) {
      return 'audio only';
    }
    return 'grid only';
  }

  function forceGridOnlyPlaybackWhenAudioMissing(): void {
    if (audioPreviewUrl || (!project.previewState.playAudio && project.previewState.playGrid)) {
      return;
    }

    project = {
      ...project,
      previewState: {
        ...project.previewState,
        playAudio: false,
        playGrid: true,
      },
    };
  }

  function updatePreviewState(
    nextPreviewState: Partial<BoomwhackerVideoBuilderProject['previewState']>,
    nextStatus?: string,
  ): void {
    const shouldSyncPreviewOutputs = (
      'playAudio' in nextPreviewState
      || 'playGrid' in nextPreviewState
      || 'includeSynthPlayback' in nextPreviewState
      || 'playbackOffsetSec' in nextPreviewState
    );
    const shouldRefreshPreviewSynth = (
      'playGrid' in nextPreviewState
      || 'includeSynthPlayback' in nextPreviewState
    );

    setProjectState(
      touchProject({
        ...project,
        previewState: {
          ...project.previewState,
          ...nextPreviewState,
        },
      }),
      nextStatus,
    );

    if (shouldSyncPreviewOutputs) {
      void syncPreviewOutputsWhilePlaying();
    }
    if (shouldRefreshPreviewSynth) {
      if (previewIsPlaying) {
        restartPreviewSynthAtTime(previewCurrentTimeSec);
      } else {
        stopPreviewSynth();
      }
    }
  }

  function setPreviewAudioVolume(nextVolume: number, nextStatus?: string): void {
    const audioVolume = clampPreviewVolume(nextVolume);
    updatePreviewState({ audioVolume }, nextStatus);
  }

  function setPreviewSynthVolume(nextVolume: number, nextStatus?: string): void {
    const synthVolume = clampPreviewVolume(nextVolume);
    updatePreviewState({ synthVolume }, nextStatus);
  }

  function togglePlaybackAudio(): void {
    if (!audioPreviewUrl && !project.previewState.playAudio) {
      statusMessage = 'Attach audio before enabling audio playback.';
      return;
    }

    if (project.previewState.playAudio && !project.previewState.playGrid) {
      statusMessage = 'Audio or grid playback must stay enabled.';
      return;
    }

    updatePreviewState(
      { playAudio: !project.previewState.playAudio },
      `Playback mode set to ${project.previewState.playAudio ? (project.previewState.playGrid ? 'grid only' : 'audio and grid') : (project.previewState.playGrid ? 'audio and grid' : 'audio only')}.`,
    );
  }

  function togglePlaybackGrid(): void {
    if (project.previewState.playGrid && !project.previewState.playAudio) {
      statusMessage = 'Audio or grid playback must stay enabled.';
      return;
    }

    updatePreviewState(
      { playGrid: !project.previewState.playGrid },
      `Playback mode set to ${project.previewState.playGrid ? (project.previewState.playAudio ? 'audio only' : 'audio and grid') : (project.previewState.playAudio ? 'audio and grid' : 'grid only')}.`,
    );
  }

  function handlePreviewAudioVolumeInput(event: Event): void {
    setPreviewAudioVolume(Number((event.currentTarget as HTMLInputElement).value));
  }

  function handlePreviewAudioVolumeChange(event: Event): void {
    const audioVolume = Number((event.currentTarget as HTMLInputElement).value);
    setPreviewAudioVolume(audioVolume, `Source audio volume set to ${formatVolumePercent(audioVolume)}.`);
  }

  function handlePreviewSynthVolumeInput(event: Event): void {
    setPreviewSynthVolume(Number((event.currentTarget as HTMLInputElement).value));
  }

  function handlePreviewSynthVolumeChange(event: Event): void {
    const synthVolume = Number((event.currentTarget as HTMLInputElement).value);
    setPreviewSynthVolume(synthVolume, `Canvas note volume set to ${formatVolumePercent(synthVolume)}.`);
  }

  async function setAudioTransposeSemitones(nextTransposeSemitones: number): Promise<void> {
    const transposeSemitones = clampTransposeSemitones(nextTransposeSemitones);
    setProjectState(
      touchProject({
        ...project,
        audioProcessing: {
          ...project.audioProcessing,
          transposeSemitones,
        },
      }),
    );

    if (!decodedAudioBuffer || !sourceAudioPreviewUrl) {
      statusMessage = transposeSemitones === 0
        ? 'Audio transpose reset to the original key.'
        : `Saved an audio transpose of ${formatSignedSemitones(transposeSemitones)}. Attach audio to hear it.`;
      return;
    }

    resetPreviewTransport();
    audioPlayer?.pause();
    const transposeApplied = await refreshPlaybackAudioPresentation();
    if (transposeApplied) {
      statusMessage = transposeSemitones === 0
        ? 'Source audio reset to the original key.'
        : `Source audio transposed ${formatSignedSemitones(transposeSemitones)} while preserving duration.`;
    }
  }

  function applyClosestTransposeToC(): void {
    const tonicOption = SOURCE_TONIC_OPTIONS.find((option) => option.label === transposeSourceTonicLabel);
    if (!tonicOption) {
      return;
    }

    void setAudioTransposeSemitones(getClosestTransposeToC(tonicOption.pitchClass));
  }

  function touchProject(nextProject: BoomwhackerVideoBuilderProject): BoomwhackerVideoBuilderProject {
    return stampProjectUpdatedAt(nextProject);
  }

  function formatGroupingLabel(grouping: MacrobeatGrouping): string {
    return `${grouping}-based`;
  }

  function setGlobalGrouping(grouping: MacrobeatGrouping, clearLocalOverrides: boolean, nextStatus: string): void {
    setProjectState(
      touchProject({
        ...project,
        grid: {
          defaultMacrobeatGrouping: grouping,
          localMacrobeatGroupings: clearLocalOverrides
            ? []
            : normalizeLocalMacrobeatGroupings(
                project.grid.localMacrobeatGroupings,
                grouping,
                Math.max(0, project.beatMap.beatPins.length - 1),
              ),
        },
      }),
      nextStatus,
      { recordHistory: true },
    );
  }

  function applyGroupingModal(): void {
    setGlobalGrouping(
      groupingModalSelection,
      true,
      `Applied ${formatGroupingLabel(groupingModalSelection)} grouping to the full grid and cleared local beat overrides.`,
    );
    closeGroupingModal();
  }

  function undoProjectChange(): void {
    const previousEntry = undoHistory[undoHistory.length - 1];
    if (!previousEntry) {
      statusMessage = 'Nothing to undo.';
      return;
    }

    redoHistory = [
      ...redoHistory.slice(-(HISTORY_LIMIT - 1)),
      createHistoryEntry(),
    ];
    undoHistory = undoHistory.slice(0, -1);
    applyHistoryEntry(previousEntry, 'Undid the last editor change.');
  }

  function redoProjectChange(): void {
    const nextEntry = redoHistory[redoHistory.length - 1];
    if (!nextEntry) {
      statusMessage = 'Nothing to redo.';
      return;
    }

    undoHistory = [
      ...undoHistory.slice(-(HISTORY_LIMIT - 1)),
      createHistoryEntry(),
    ];
    redoHistory = redoHistory.slice(0, -1);
    applyHistoryEntry(nextEntry, 'Redid the last editor change.');
  }

  function stripExtension(fileName: string): string {
    return fileName.replace(/\.[^.]+$/, '');
  }

  function slugifyTitle(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 72);
  }

  function getProjectFileName(): string {
    const slug = slugifyTitle(project.metadata.title);
    return `${slug || 'boomwhacker-video-project'}.bvb.json`;
  }

  function formatSeconds(value: number): string {
    return `${value.toFixed(2)}s`;
  }

  function formatTempo(value: number | null): string {
    return value === null ? 'n/a' : `${value.toFixed(1)} BPM`;
  }

  function clampBlankHighwayBpm(value: number): number {
    if (!Number.isFinite(value)) {
      return BLANK_HIGHWAY_DEFAULT_BPM;
    }

    return Math.max(BLANK_HIGHWAY_MIN_BPM, Math.min(BLANK_HIGHWAY_MAX_BPM, Math.round(value)));
  }

  function clampBlankHighwayBeatCount(value: number): number {
    if (!Number.isFinite(value)) {
      return BLANK_HIGHWAY_DEFAULT_BEAT_COUNT;
    }

    return Math.max(BLANK_HIGHWAY_MIN_BEAT_COUNT, Math.min(BLANK_HIGHWAY_MAX_BEAT_COUNT, Math.trunc(value)));
  }

  function laneClass(marker: 'underline' | 'overline' | 'none'): string {
    if (marker === 'underline') return 'label-marker-underline';
    if (marker === 'overline') return 'label-marker-overline';
    return '';
  }

  function getEditorLaneHeightPx(): number {
    return 54;
  }

  function getEditorHighwayPixelsPerSecond(): number {
    return editorHighwayPixelsPerSecond;
  }

  // Mirror the singing-trainer timeline model: keep the judgment line fixed and
  // place the editable track inside a padded time range before and after content.
  function getEditorHighwayLeadingPaddingPx(): number {
    return editorHighwayLeadingPaddingPx;
  }

  function getEditorHighwayTrailingPaddingPx(): number {
    return editorHighwayTrailingPaddingPx;
  }

  function getEditorHighwayDurationSec(): number {
    return editorHighwayDurationSec;
  }

  function getEditorHighwayStageWidthPx(): number {
    return editorHighwayStageWidthPx;
  }

  function timeToEditorHighwayX(timeSec: number): number {
    return getEditorHighwayLeadingPaddingPx() + (Math.max(0, timeSec) * getEditorHighwayPixelsPerSecond());
  }

  function highwayGuideStyle(timeSec: number): string {
    return `left:${timeToEditorHighwayX(timeSec)}px;`;
  }

  function judgmentAreaStyle(beatSpan: DerivedBeatSpan): string {
    const width = getHighwayJudgmentAreaWidthPx(beatSpan, getEditorHighwayPixelsPerSecond());
    const height = BOOMWHACKER_LANES.length * getEditorLaneHeightPx();
    return `left:${getEditorHighwayLeadingPaddingPx()}px;width:${width}px;height:${height}px;`;
  }

  function getHighwayNoteHitFlashOpacity(note: TimedBoomwhackerNote): number {
    if (!project.previewState.playGrid) {
      return 0;
    }

    const elapsedSinceHitSec = previewCurrentTimeSec - note.startTimeSec;
    if (elapsedSinceHitSec < 0) {
      return 0;
    }

    const flashDurationSec = Math.min(
      NOTE_HIT_FLASH_MAX_DURATION_SEC,
      Math.max(NOTE_HIT_FLASH_MIN_DURATION_SEC, note.durationSec * 0.75),
    );
    if (elapsedSinceHitSec >= flashDurationSec) {
      return 0;
    }

    return Number((1 - (elapsedSinceHitSec / flashDurationSec)).toFixed(3));
  }

  function logHighwayScrollDebug(
    reason: string,
    options?: {
      timeSec?: number;
      targetScrollLeftPx?: number;
      force?: boolean;
    },
  ): void {
    if (!DEBUG_HIGHWAY_SCROLL) {
      return;
    }

    const timeSec = options?.timeSec ?? previewCurrentTimeSec;
    const animationBucket = Math.floor(Math.max(0, timeSec) * 4);
    if (!options?.force && reason === 'animation' && animationBucket === highwayScrollDebugLastBucket) {
      return;
    }
    if (reason === 'animation') {
      highwayScrollDebugLastBucket = animationBucket;
    }

    const viewport = editorHighwayViewport;
    const viewportWidthPx = viewport?.clientWidth ?? editorHighwayViewportWidthPx;
    const stageWidthPx = editorHighwayStage?.clientWidth ?? getEditorHighwayStageWidthPx();
    const targetScrollLeftPx = options?.targetScrollLeftPx ?? getEditorHighwayScrollLeftForTime(timeSec);
    const actualScrollLeftPx = viewport?.scrollLeft ?? null;
    const maxScrollLeftPx = Math.max(0, stageWidthPx - Math.max(1, viewportWidthPx));

    console.log('[BVB highway scroll]', {
      reason,
      activeTab: project.viewState.activeTab,
      previewIsPlaying,
      previewCanPlayGrid: previewCanPlayGrid(),
      previewCurrentTimeSec,
      timeSec,
      targetScrollLeftPx,
      actualScrollLeftPx,
      viewportWidthPx,
      stageWidthPx,
      maxScrollLeftPx,
      leadingPaddingPx: getEditorHighwayLeadingPaddingPx(),
      pixelsPerSecond: getEditorHighwayPixelsPerSecond(),
      previewDurationSec,
    });
  }

  function getVisualLaneRow(row: number): number {
    return (BOOMWHACKER_LANES.length - 1) - row;
  }

  function getHighwayNoteLayoutForNote(note: TimedBoomwhackerNote) {
    return getHighwayNoteLayout({
      note,
      startX: timeToEditorHighwayX(note.startTimeSec),
      endX: timeToEditorHighwayX(note.endTimeSec),
      visualRow: getVisualLaneRow(note.row),
      laneHeightPx: getEditorLaneHeightPx(),
    });
  }

  function highwayNoteStyle(note: TimedBoomwhackerNote): string {
    const layout = getHighwayNoteLayoutForNote(note);
    return `left:${layout.left}px;width:${layout.width}px;top:${layout.top}px;height:${layout.height}px;--note-label-size:${layout.labelFontPx}px;`;
  }

  function getPlacementPreviewStyle(preview: HighwayPlacementPreview): string {
    const lane = getLaneByRow(preview.row);
    return highwayNoteStyle({
      id: 'placement-preview',
      row: preview.row,
      noteId: '',
      label: lane?.label ?? '',
      marker: lane?.marker ?? 'none',
      pitchInterval: lane?.pitchInterval ?? 0,
      startSlotIndex: preview.startSlotIndex,
      endSlotIndex: preview.endSlotIndex,
      startTimeSec: slotIndexToTimeSec(timing, preview.startSlotIndex),
      endTimeSec: slotIndexToTimeSec(timing, preview.endSlotIndex + 1),
      durationSec: Math.max(
        0,
        slotIndexToTimeSec(timing, preview.endSlotIndex + 1) - slotIndexToTimeSec(timing, preview.startSlotIndex),
      ),
      color: lane?.color ?? '#ffffff',
      shape: preview.shape,
    });
  }

  function getEditorHighwayScrollLeftForTime(timeSec: number): number {
    const viewportWidth = Math.max(1, editorHighwayViewportWidthPx);
    const unclampedScrollLeft = timeToEditorHighwayX(timeSec) - getEditorHighwayLeadingPaddingPx();
    const maxScrollLeft = Math.max(0, getEditorHighwayStageWidthPx() - viewportWidth);
    return Math.max(0, Math.min(maxScrollLeft, unclampedScrollLeft));
  }

  function syncEditorHighwayViewportToTime(timeSec: number): void {
    if (!editorHighwayViewport) {
      logHighwayScrollDebug('sync-missing-viewport', {
        timeSec,
        force: true,
      });
      return;
    }

    const targetScrollLeftPx = getEditorHighwayScrollLeftForTime(timeSec);
    editorHighwayViewport.scrollLeft = targetScrollLeftPx;
    logHighwayScrollDebug('sync-scroll', {
      timeSec,
      targetScrollLeftPx,
    });
  }

  function handleEditorHighwayViewportScroll(): void {
    logHighwayScrollDebug('viewport-scroll', {
      force: true,
    });
  }

  function waveformPlayheadStyle(
    currentTimeSec: number,
    waveformDurationSec: number,
    isVisible = true,
  ): string {
    if (!isVisible || waveformDurationSec <= 0) {
      return 'display:none;';
    }

    const clampedTimeSec = Math.min(waveformDurationSec, Math.max(0, currentTimeSec));
    return `left:${(clampedTimeSec / waveformDurationSec) * 100}%;`;
  }

  function getDetailWaveformTimeline(): HTMLDivElement | null {
    return detailWaveformViewport?.querySelector<HTMLDivElement>('.beat-editor__timeline') ?? null;
  }

  function getCompactWaveformTimeline(): HTMLDivElement | null {
    return compactWaveformViewport?.querySelector<HTMLDivElement>('.beat-editor__timeline') ?? null;
  }

  function getDetailWaveformPlayhead(): HTMLSpanElement | null {
    return detailWaveformViewport?.querySelector<HTMLSpanElement>('.waveform-playhead--detail') ?? null;
  }

  function getSharedTimelineContext(): 'detail' | 'compact' | 'none' | 'unknown' {
    const detailTimeline = getDetailWaveformTimeline();
    const compactTimeline = getCompactWaveformTimeline();
    if (!beatEditorTimeline) {
      return 'none';
    }
    if (beatEditorTimeline === detailTimeline) {
      return 'detail';
    }
    if (beatEditorTimeline === compactTimeline) {
      return 'compact';
    }
    return 'unknown';
  }

  function logBeatEditorPlayheadDebug(reason: string, details: Record<string, unknown> = {}): void {
    if (!DEBUG_BEAT_EDITOR_PLAYHEAD) {
      return;
    }

    const snapshot = {
      beatEditorCurrentTimeSec,
      audioCurrentTimeSec: audioPlayer?.currentTime ?? null,
      waveformDurationSec: getWaveformDurationSec(),
      detailViewportWidthPx: detailWaveformViewport?.clientWidth ?? null,
      detailViewportScrollLeftPx: detailWaveformViewport?.scrollLeft ?? null,
      sharedTimelineWidthPx: beatEditorTimeline?.clientWidth ?? null,
      sharedTimelineContext: getSharedTimelineContext(),
      audioPaused: audioPlayer?.paused ?? null,
      audioEnded: audioPlayer?.ended ?? null,
      ...details,
    };

    void tick().then(() => {
      const detailTimeline = getDetailWaveformTimeline();
      const compactTimeline = getCompactWaveformTimeline();
      const playhead = getDetailWaveformPlayhead();
      const detailTimelineRect = detailTimeline?.getBoundingClientRect();
      const playheadRect = playhead?.getBoundingClientRect();
      const clampedTimeSec = Math.min(snapshot.waveformDurationSec, Math.max(0, snapshot.beatEditorCurrentTimeSec));
      const leftPercent = snapshot.waveformDurationSec > 0 ? (clampedTimeSec / snapshot.waveformDurationSec) * 100 : null;

      console.log('[BVB beat-editor playhead]', {
        reason,
        ...snapshot,
        leftPercent,
        renderedLeft: playhead ? getComputedStyle(playhead).left : null,
        playheadScreenLeftPx: playheadRect?.left ?? null,
        detailTimelineWidthPx: detailTimeline?.clientWidth ?? null,
        detailTimelineLeftPx: detailTimelineRect?.left ?? null,
        compactTimelineWidthPx: compactTimeline?.clientWidth ?? null,
      });
    });
  }

  function getCompactWaveformTimelineXForTime(timeSec: number): number {
    const timelineWidth = beatEditorTimeline?.clientWidth ?? 0;
    const durationSec = getWaveformDurationSec();
    if (timelineWidth <= 0 || durationSec <= 0) {
      return 0;
    }

    const ratio = Math.min(1, Math.max(0, timeSec / durationSec));
    return ratio * timelineWidth;
  }

  function revealCompactWaveformTime(timeSec: number): void {
    const viewport = compactWaveformViewport;
    const timeline = beatEditorTimeline;
    if (!viewport || !timeline) {
      return;
    }

    const viewportWidth = viewport.clientWidth;
    const maxScrollLeft = Math.max(0, timeline.clientWidth - viewportWidth);
    if (viewportWidth <= 0 || maxScrollLeft <= 0) {
      return;
    }

    const targetX = getCompactWaveformTimelineXForTime(timeSec);
    const marginPx = Math.min(96, Math.max(24, viewportWidth * 0.18));
    const visibleStartX = viewport.scrollLeft;
    const visibleEndX = visibleStartX + viewportWidth;
    let nextScrollLeft = visibleStartX;

    if (targetX < visibleStartX + marginPx) {
      nextScrollLeft = targetX - marginPx;
    } else if (targetX > visibleEndX - marginPx) {
      nextScrollLeft = targetX - viewportWidth + marginPx;
    }

    viewport.scrollLeft = Math.max(0, Math.min(maxScrollLeft, nextScrollLeft));
  }

  function getWaveformDurationSec(): number {
    return waveformDurationSec;
  }

  function getPreviewDurationSec(): number {
    return previewDurationSec;
  }

  function clampPreviewTimeSec(timeSec: number): number {
    const durationSec = getPreviewDurationSec();
    if (durationSec <= 0) {
      return Math.max(0, timeSec);
    }
    return Math.min(durationSec, Math.max(0, timeSec));
  }

  function previewCanUseSourceAudio(): boolean {
    return Boolean(audioPreviewUrl) && project.previewState.playAudio;
  }

  function previewHasActiveSourceAudio(): boolean {
    return previewCanUseSourceAudio() && Boolean(previewAudioPlayer && !previewAudioPlayer.paused);
  }

  function previewCanPlayGrid(): boolean {
    return project.previewState.playGrid;
  }

  function previewCanPlaySynth(): boolean {
    return previewCanPlayGrid() && project.previewState.includeSynthPlayback && timedNotes.length > 0;
  }

  function stopPreviewSynth(): void {
    previewSynth.stopAll();
    previewSynthCursorTimeSec = previewCurrentTimeSec;
  }

  function restartPreviewSynthAtTime(timeSec: number): void {
    previewSynth.stopAll();
    previewSynthCursorTimeSec = timeSec;
    if (!previewCanPlaySynth()) {
      return;
    }

    for (const note of timedNotes) {
      if (note.startTimeSec <= timeSec && note.endTimeSec > timeSec) {
        void previewSynth.playNote(
          note.id,
          note.pitchInterval,
          Math.max(0.04, note.endTimeSec - timeSec),
          { rootMidi: SKETCHPAD_DEFAULT_ROOT_MIDI },
        );
      }
    }
  }

  function advancePreviewSynth(toTimeSec: number): void {
    if (!previewCanPlaySynth()) {
      stopPreviewSynth();
      return;
    }

    const fromTimeSec = previewSynthCursorTimeSec;
    if (toTimeSec < fromTimeSec - 0.001) {
      restartPreviewSynthAtTime(toTimeSec);
      return;
    }

    for (const note of timedNotes) {
      if (note.startTimeSec > fromTimeSec && note.startTimeSec <= toTimeSec) {
        void previewSynth.playNote(
          note.id,
          note.pitchInterval,
          Math.max(0.04, note.durationSec),
          { rootMidi: SKETCHPAD_DEFAULT_ROOT_MIDI },
        );
      }
    }

    previewSynthCursorTimeSec = toTimeSec;
  }

  function syncPreviewClockAnchor(): void {
    previewClockAnchorTimeSec = previewCurrentTimeSec;
    previewClockAnchorMs = performance.now();
  }

  function cancelPreviewAnimation(): void {
    if (previewAnimationFrameId !== null) {
      cancelAnimationFrame(previewAnimationFrameId);
      previewAnimationFrameId = null;
    }
  }

  function getTapEntryTempoBpm(): number {
    return clampBlankHighwayBpm(estimatedTempoBpm ?? blankHighwayBpm);
  }

  function cancelTapEntryAnimation(): void {
    if (tapEntryAnimationFrameId !== null) {
      cancelAnimationFrame(tapEntryAnimationFrameId);
      tapEntryAnimationFrameId = null;
    }
  }

  function resetTapEntryState(nextPhase: TapEntryPhase = 'idle'): void {
    cancelTapEntryAnimation();
    tapEntryPhase = nextPhase;
    tapEntryCountInBeatsRemaining = TAP_ENTRY_COUNT_IN_BEATS;
    tapEntryCountInBeatProgress = 0;
    tapEntryCountInBeatDurationSec = 60 / getTapEntryTempoBpm();
    if (nextPhase === 'idle') {
      tapEntryStartTimeSec = 0;
    }
  }

  function getTapEntryCountInProgressStyle(progress: number): string {
    const clampedProgress = Math.min(1, Math.max(0, progress));
    return `transform:scaleX(${clampedProgress});`;
  }

  async function startTapEntryCapture(sessionToken: number): Promise<void> {
    if (sessionToken !== tapEntrySessionToken || tapEntryPhase !== 'count-in' || !audioPlayer || !audioPreviewUrl) {
      return;
    }

    tapEntryPhase = 'capturing';
    tapEntryCountInBeatsRemaining = 0;
    tapEntryCountInBeatProgress = 0;
    audioPlayer.currentTime = tapEntryStartTimeSec;
    syncBeatEditorTimeFromAudio('tap-entry-capture-start');

    errorMessage = '';
    try {
      await audioPlayer.play();
      if (sessionToken !== tapEntrySessionToken || tapEntryPhase !== 'capturing') {
        audioPlayer.pause();
        return;
      }
      statusMessage = 'Tap entry is live. Press Space on each beat.';
    } catch (error) {
      if (sessionToken !== tapEntrySessionToken) {
        return;
      }

      resetTapEntryState();
      console.error('Boomwhacker Video Builder tap entry playback failed.', error);
      errorMessage = 'Tap entry could not start playback. Interact with the page and try again.';
    }
  }

  function stopTapEntry(options?: {
    applyTapSequence?: boolean;
    pauseAudio?: boolean;
    nextStatus?: string;
  }): void {
    const wasCapturing = tapEntryPhase === 'capturing';
    const shouldApply = options?.applyTapSequence ?? wasCapturing;

    tapEntrySessionToken += 1;
    resetTapEntryState();

    if (options?.pauseAudio ?? wasCapturing) {
      audioPlayer?.pause();
    }

    if (!shouldApply) {
      if (options?.nextStatus) {
        statusMessage = options.nextStatus;
      }
      return;
    }

    const didApply = applyTapBeatSequence();
    if (!didApply) {
      statusMessage = options?.nextStatus
        ?? 'Tap entry stopped. Capture at least two distinct taps to replace the beat map.';
    }
  }

  function beginTapEntry(): void {
    if (busyMessage) {
      return;
    }

    if (!audioPlayer || !audioPreviewUrl) {
      statusMessage = 'No playable audio preview is attached.';
      return;
    }

    tapEntrySessionToken += 1;
    const sessionToken = tapEntrySessionToken;
    const durationSec = getWaveformDurationSec();

    clearTapBeatSequence();
    audioPlayer.pause();
    tapEntryStartTimeSec = audioPlayer.currentTime >= Math.max(0, durationSec - 0.001) ? 0 : clampTimeSec(audioPlayer.currentTime);
    audioPlayer.currentTime = tapEntryStartTimeSec;
    syncBeatEditorTimeFromAudio('tap-entry-begin');
    tapEntryCountInBeatDurationSec = 60 / getTapEntryTempoBpm();
    tapEntryCountInBeatsRemaining = TAP_ENTRY_COUNT_IN_BEATS;
    tapEntryCountInBeatProgress = 0;
    tapEntryPhase = 'count-in';
    cancelTapEntryAnimation();
    getDetailWaveformTimeline()?.focus();
    statusMessage = `Tap entry armed. ${TAP_ENTRY_COUNT_IN_BEATS}-beat count-in at ${formatTempo(getTapEntryTempoBpm())}.`;

    const countInStartedAtMs = performance.now();
    const totalCountInDurationSec = TAP_ENTRY_COUNT_IN_BEATS * tapEntryCountInBeatDurationSec;

    const step = () => {
      if (sessionToken !== tapEntrySessionToken || tapEntryPhase !== 'count-in') {
        tapEntryAnimationFrameId = null;
        return;
      }

      const elapsedSec = (performance.now() - countInStartedAtMs) / 1000;
      const completedBeats = Math.min(TAP_ENTRY_COUNT_IN_BEATS, Math.floor(elapsedSec / tapEntryCountInBeatDurationSec));

      tapEntryCountInBeatsRemaining = Math.max(1, TAP_ENTRY_COUNT_IN_BEATS - completedBeats);
      tapEntryCountInBeatProgress = Math.min(1, (elapsedSec / tapEntryCountInBeatDurationSec) - completedBeats);

      if (elapsedSec >= totalCountInDurationSec) {
        tapEntryAnimationFrameId = null;
        void startTapEntryCapture(sessionToken);
        return;
      }

      tapEntryAnimationFrameId = requestAnimationFrame(step);
    };

    tapEntryAnimationFrameId = requestAnimationFrame(step);
  }

  function toggleTapEntry(): void {
    if (tapEntryPhase === 'idle') {
      beginTapEntry();
      return;
    }

    stopTapEntry({
      applyTapSequence: tapEntryPhase === 'capturing',
      pauseAudio: tapEntryPhase === 'capturing',
      nextStatus: tapEntryPhase === 'count-in'
        ? 'Tap entry cancelled.'
        : 'Tap entry stopped. Capture at least two distinct taps to replace the beat map.',
    });
  }

  function syncBeatEditorTimeFromAudio(reason = 'sync'): void {
    beatEditorCurrentTimeSec = clampTimeSec(audioPlayer?.currentTime ?? 0);

    if (!DEBUG_BEAT_EDITOR_PLAYHEAD) {
      return;
    }

    if (reason !== 'animation') {
      logBeatEditorPlayheadDebug(reason);
      return;
    }

    const nextBucket = Math.floor(beatEditorCurrentTimeSec * 4);
    if (nextBucket !== beatEditorDebugLastAnimationBucket) {
      beatEditorDebugLastAnimationBucket = nextBucket;
      logBeatEditorPlayheadDebug(reason, { animationBucket: nextBucket });
    }
  }

  function cancelBeatEditorAnimation(): void {
    if (beatEditorAnimationFrameId !== null) {
      cancelAnimationFrame(beatEditorAnimationFrameId);
      beatEditorAnimationFrameId = null;
    }
  }

  function startBeatEditorAnimation(): void {
    cancelBeatEditorAnimation();
    beatEditorDebugLastAnimationBucket = -1;
    logBeatEditorPlayheadDebug('animation-start');

    const step = () => {
      if (!audioPlayer) {
        beatEditorAnimationFrameId = null;
        beatEditorIsPlaying = false;
        logBeatEditorPlayheadDebug('animation-stop-missing-audio');
        return;
      }

      syncBeatEditorTimeFromAudio('animation');

      if (!audioPlayer.paused && !audioPlayer.ended) {
        beatEditorAnimationFrameId = requestAnimationFrame(step);
        return;
      }

      beatEditorAnimationFrameId = null;
      logBeatEditorPlayheadDebug('animation-stop-settled');
    };

    beatEditorAnimationFrameId = requestAnimationFrame(step);
  }

  async function toggleBeatEditorPlayback(): Promise<void> {
    logBeatEditorPlayheadDebug('toggle-playback');

    if (!audioPlayer || !audioPreviewUrl) {
      statusMessage = 'No playable audio preview is attached.';
      logBeatEditorPlayheadDebug('toggle-playback-missing-audio');
      return;
    }

    if (!audioPlayer.paused) {
      audioPlayer.pause();
      statusMessage = 'Audio playback paused.';
      logBeatEditorPlayheadDebug('toggle-playback-paused');
      return;
    }

    if (audioPlayer.currentTime >= Math.max(0, getWaveformDurationSec() - 0.001)) {
      audioPlayer.currentTime = 0;
      syncBeatEditorTimeFromAudio('toggle-reset-to-start');
    }

    errorMessage = '';
    try {
      if (audioPlayer.readyState === HTMLMediaElement.HAVE_NOTHING) {
        audioPlayer.load();
      }
      await audioPlayer.play();
      statusMessage = 'Audio playback started.';
      logBeatEditorPlayheadDebug('toggle-playback-started');
    } catch (error) {
      console.error('Boomwhacker Video Builder beat editor audio playback failed.', error);
      errorMessage = 'Audio playback failed. Interact with the page and try again.';
      logBeatEditorPlayheadDebug('toggle-playback-failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function handleBeatEditorAudioPlay(): void {
    beatEditorIsPlaying = true;
    syncBeatEditorTimeFromAudio('audio-play');
    startBeatEditorAnimation();
  }

  function handleBeatEditorAudioPause(): void {
    beatEditorIsPlaying = false;
    cancelBeatEditorAnimation();
    syncBeatEditorTimeFromAudio('audio-pause');
  }

  function handleBeatEditorAudioTimeUpdate(): void {
    if (!beatEditorIsPlaying) {
      syncBeatEditorTimeFromAudio('audio-timeupdate');
    }
  }

  function handleBeatEditorAudioSeeked(): void {
    syncBeatEditorTimeFromAudio('audio-seeked');
  }

  function handleBeatEditorAudioLoadedMetadata(): void {
    syncBeatEditorTimeFromAudio('audio-loadedmetadata');
  }

  function handleBeatEditorAudioEnded(): void {
    beatEditorIsPlaying = false;
    cancelBeatEditorAnimation();
    syncBeatEditorTimeFromAudio('audio-ended');
    if (tapEntryPhase === 'capturing') {
      stopTapEntry({
        applyTapSequence: true,
        pauseAudio: false,
        nextStatus: 'Tap entry stopped. Capture at least two distinct taps to replace the beat map.',
      });
      return;
    }
    statusMessage = 'Audio playback complete.';
  }

  async function syncPreviewOutputsWhilePlaying(): Promise<void> {
    if (!previewIsPlaying) {
      return;
    }

    syncPreviewClockAnchor();

    if (previewCanUseSourceAudio() && previewAudioPlayer) {
      previewAudioPlayer.currentTime = clampPreviewTimeSec(previewCurrentTimeSec);
      if (previewAudioPlayer.paused) {
        try {
          if (previewAudioPlayer.readyState === HTMLMediaElement.HAVE_NOTHING) {
            previewAudioPlayer.load();
          }
          await previewAudioPlayer.play();
        } catch (error) {
          console.error('Boomwhacker Video Builder audio playback failed.', error);
          previewAudioPlayer.pause();
          errorMessage = 'Audio playback failed. Interact with the page and try again.';
        }
      }
    } else {
      previewAudioPlayer?.pause();
    }
  }

  async function advancePreviewFrame(): Promise<void> {
    if (!previewIsPlaying) {
      return;
    }

    const nextTimeSec = clampPreviewTimeSec(
      previewHasActiveSourceAudio()
        ? (previewAudioPlayer?.currentTime ?? previewCurrentTimeSec)
        : previewClockAnchorTimeSec + ((performance.now() - previewClockAnchorMs) / 1000),
    );

    previewCurrentTimeSec = nextTimeSec;
    advancePreviewSynth(nextTimeSec);
    logHighwayScrollDebug('animation', {
      timeSec: nextTimeSec,
    });
    if (previewCanPlayGrid()) {
      syncEditorHighwayViewportToTime(nextTimeSec);
    }

    if (nextTimeSec >= getPreviewDurationSec() - 0.001) {
      previewIsPlaying = false;
      cancelPreviewAnimation();
      previewAudioPlayer?.pause();
      stopPreviewSynth();
      previewCurrentTimeSec = clampPreviewTimeSec(getPreviewDurationSec());
      syncPreviewClockAnchor();
      statusMessage = 'Playback complete.';
      return;
    }

    previewAnimationFrameId = requestAnimationFrame(() => {
      void advancePreviewFrame();
    });
  }

  function startPreviewAnimation(): void {
    cancelPreviewAnimation();
    previewAnimationFrameId = requestAnimationFrame(() => {
      void advancePreviewFrame();
    });
  }

  async function playPreview(): Promise<void> {
    const durationSec = getPreviewDurationSec();
    if (durationSec <= 0) {
      statusMessage = 'Nothing is ready for playback yet.';
      return;
    }

    if (!previewCanPlayGrid() && !previewCanUseSourceAudio()) {
      statusMessage = 'Turn on grid playback or attach audio before playing.';
      return;
    }

    if (previewCurrentTimeSec >= durationSec) {
      previewCurrentTimeSec = 0;
    }

    previewIsPlaying = true;
    errorMessage = '';
    syncPreviewClockAnchor();
    logHighwayScrollDebug('play-preview', {
      timeSec: previewCurrentTimeSec,
      force: true,
    });
    restartPreviewSynthAtTime(previewCurrentTimeSec);
    if (previewCanPlayGrid()) {
      syncEditorHighwayViewportToTime(previewCurrentTimeSec);
    }

    if (previewCanUseSourceAudio() && previewAudioPlayer) {
      previewAudioPlayer.currentTime = clampPreviewTimeSec(previewCurrentTimeSec);
      try {
        if (previewAudioPlayer.readyState === HTMLMediaElement.HAVE_NOTHING) {
          previewAudioPlayer.load();
        }
        await previewAudioPlayer.play();
      } catch (error) {
        console.error('Boomwhacker Video Builder audio playback failed.', error);
        previewAudioPlayer.pause();
        errorMessage = 'Audio playback failed. Interact with the page and try again.';
      }
    }

    startPreviewAnimation();
    statusMessage = `Playing ${describePlaybackMode()}.`;
  }

  function pausePreview(nextStatus = 'Playback paused.'): void {
    previewIsPlaying = false;
    cancelPreviewAnimation();
    previewAudioPlayer?.pause();
    stopPreviewSynth();
    syncPreviewClockAnchor();
    if (nextStatus) {
      statusMessage = nextStatus;
    }
  }

  function seekPreview(timeSec: number, nextStatus?: string): void {
    previewCurrentTimeSec = clampPreviewTimeSec(timeSec);
    syncEditorHighwayViewportToTime(previewCurrentTimeSec);
    revealCompactWaveformTime(previewCurrentTimeSec);
    if (previewCanUseSourceAudio() && previewAudioPlayer) {
      previewAudioPlayer.currentTime = previewCurrentTimeSec;
    }
    if (previewIsPlaying) {
      restartPreviewSynthAtTime(previewCurrentTimeSec);
    } else {
      stopPreviewSynth();
    }
    syncPreviewClockAnchor();
    if (nextStatus) {
      statusMessage = nextStatus;
    }
  }

  function resetPreviewTransport(): void {
    pausePreview('');
    tapEntrySessionToken += 1;
    resetTapEntryState();
    cancelBeatEditorAnimation();
    beatEditorIsPlaying = false;
    beatEditorCurrentTimeSec = 0;
    previewCurrentTimeSec = 0;
    exportPreviewTimeSec = 0;
    if (previewAudioPlayer) {
      previewAudioPlayer.currentTime = 0;
    }
    if (audioPlayer) {
      audioPlayer.pause();
      audioPlayer.currentTime = 0;
    }
    syncPreviewClockAnchor();
    syncEditorHighwayViewportToTime(0);
    revealCompactWaveformTime(0);
  }

  function stopPreviewPlayback(): void {
    resetPreviewTransport();
    statusMessage = 'Playback stopped.';
  }

  function togglePreviewPlayback(): void {
    if (previewIsPlaying) {
      pausePreview();
      return;
    }

    void playPreview();
  }

  function handlePreviewAudioEnded(): void {
    previewCurrentTimeSec = clampPreviewTimeSec(getPreviewDurationSec());
    pausePreview('Playback complete.');
  }

  function getExportDurationSec(): number {
    return getExportTotalDurationSec(project, timing);
  }

  function clampExportPreviewTimeSec(timeSec: number): number {
    const durationSec = getExportDurationSec();
    if (durationSec <= 0) {
      return Math.max(0, timeSec);
    }
    return Math.min(durationSec, Math.max(0, timeSec));
  }

  function getExportFrameFileName(): string {
    const slug = slugifyTitle(project.metadata.title);
    return `${slug || 'boomwhacker-video-export'}-frame-${Math.round(exportPreviewTimeSec * project.exportState.fps)
      .toString()
      .padStart(5, '0')}.png`;
  }

  function getExportVideoFileName(extension: string): string {
    const slug = slugifyTitle(project.metadata.title);
    return `${slug || 'boomwhacker-video-export'}${extension}`;
  }

  function updateExportState(
    nextExportState: Partial<BoomwhackerVideoBuilderProject['exportState']>,
    nextStatus?: string,
  ): void {
    setProjectState(
      touchProject({
        ...project,
        exportState: {
          ...project.exportState,
          ...nextExportState,
        },
      }),
      nextStatus,
    );
  }

  function updateExportTitleCard(
    nextTitleCard: Partial<BoomwhackerVideoBuilderProject['exportState']['titleCard']>,
    nextStatus?: string,
  ): void {
    updateExportState(
      {
        titleCard: {
          ...project.exportState.titleCard,
          ...nextTitleCard,
        },
      },
      nextStatus,
    );
  }

  function setExportBackgroundType(backgroundType: BoomwhackerVideoBuilderProject['exportState']['background']['type']): void {
    if (backgroundType === 'solid') {
      updateExportState(
        {
          background: {
            type: 'solid',
            color: project.exportState.background.type === 'solid' ? project.exportState.background.color : '#08111b',
          },
        },
        'Export background set to solid color.',
      );
      return;
    }

    if (backgroundType === 'image') {
      updateExportState(
        {
          background: {
            type: 'image',
            imageDataUrl: project.exportState.background.type === 'image' ? project.exportState.background.imageDataUrl ?? null : null,
            fit: project.exportState.background.type === 'image' ? project.exportState.background.fit : 'cover',
            opacity: project.exportState.background.type === 'image' ? project.exportState.background.opacity : 1,
          },
        },
        'Export background set to image mode.',
      );
      return;
    }

    updateExportState(
      {
        background: {
          type: 'gradient',
          topColor: project.exportState.background.type === 'gradient' ? project.exportState.background.topColor : '#16233a',
          bottomColor: project.exportState.background.type === 'gradient' ? project.exportState.background.bottomColor : '#091018',
        },
      },
      'Export background set to gradient.',
    );
  }

  function updateExportBackgroundSolid(color: string): void {
    if (project.exportState.background.type !== 'solid') {
      return;
    }

    updateExportState({
      background: {
        ...project.exportState.background,
        color,
      },
    });
  }

  function updateExportBackgroundGradient(partial: Partial<Extract<BoomwhackerVideoBuilderProject['exportState']['background'], { type: 'gradient' }>>): void {
    if (project.exportState.background.type !== 'gradient') {
      return;
    }

    updateExportState({
      background: {
        ...project.exportState.background,
        ...partial,
      },
    });
  }

  function updateExportBackgroundImage(partial: Partial<Extract<BoomwhackerVideoBuilderProject['exportState']['background'], { type: 'image' }>>): void {
    if (project.exportState.background.type !== 'image') {
      return;
    }

    updateExportState({
      background: {
        ...project.exportState.background,
        ...partial,
      },
    });
  }

  async function handleBackgroundImageFile(file: File): Promise<void> {
    busyMessage = 'Loading export background image...';
    errorMessage = '';

    try {
      const imageDataUrl = await readFileAsDataUrl(file);
      updateExportState(
        {
          background: {
            type: 'image',
            imageDataUrl,
            fit: project.exportState.background.type === 'image' ? project.exportState.background.fit : 'cover',
            opacity: project.exportState.background.type === 'image' ? project.exportState.background.opacity : 1,
          },
        },
        `Loaded "${file.name}" as the export background.`,
      );
    } catch (error) {
      console.error('Boomwhacker Video Builder export background image load failed.', error);
      errorMessage = 'Background image load failed.';
    } finally {
      busyMessage = '';
    }
  }

  function handleBackgroundImageInputChange(event: Event): void {
    const input = event.currentTarget as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }

    void handleBackgroundImageFile(file);
    input.value = '';
  }

  function clearExportBackgroundImage(): void {
    if (project.exportState.background.type !== 'image') {
      return;
    }

    updateExportState(
      {
        background: {
          ...project.exportState.background,
          imageDataUrl: null,
        },
      },
      'Cleared the export background image.',
    );
  }

  function syncExportPreviewToHighway(): void {
    exportPreviewTimeSec = clampExportPreviewTimeSec(previewCurrentTimeSec + project.exportState.leadInDurationSec);
    statusMessage = 'Export preview synced to the Highway transport.';
  }

  async function saveExportFrameSnapshot(): Promise<void> {
    const previewCanvas = exportPreviewCanvas;
    if (!previewCanvas) {
      statusMessage = 'Open the Export tab before saving a frame snapshot.';
      return;
    }

    busyMessage = 'Saving export frame snapshot...';
    errorMessage = '';

    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        previewCanvas.toBlob((value) => {
          if (value) {
            resolve(value);
            return;
          }
          reject(new Error('Canvas did not produce a PNG blob.'));
        }, 'image/png');
      });

      await saveBlobFile(blob, getExportFrameFileName(), {
        description: 'Boomwhacker Video Builder Export Frame',
        mimeType: 'image/png',
        extensions: ['.png'],
      });
      statusMessage = `Saved ${getExportFrameFileName()}.`;
    } catch (error) {
      console.error('Boomwhacker Video Builder export frame save failed.', error);
      errorMessage = 'Export frame snapshot save failed.';
    } finally {
      busyMessage = '';
    }
  }

  async function handleExportVideo(): Promise<void> {
    if (!preferredExportContainer) {
      errorMessage = 'This browser does not expose a supported MediaRecorder format for video export.';
      return;
    }

    const progressInterval = Math.max(1, Math.round(project.exportState.fps / 2));
    busyMessage = 'Preparing export video...';
    errorMessage = '';
    exportRenderError = '';

    try {
      const result = await exportProjectVideo({
        project,
        timing,
        guides: highwayGuides,
        timedNotes,
        sourceAudioBuffer: playbackAudioBuffer,
        onProgress: ({ frameIndex, totalFrames }) => {
          if (
            frameIndex === 1
            || frameIndex === totalFrames
            || frameIndex % progressInterval === 0
          ) {
            busyMessage = `Rendering export video... ${frameIndex}/${totalFrames} frames`;
          }
        },
      });

      const fileName = getExportVideoFileName(result.container.extension);
      await saveBlobFile(result.blob, fileName, {
        description: result.container.description,
        mimeType: result.container.saveMimeType,
        extensions: [result.container.extension],
      });

      const warningSuffix = result.warnings.length > 0
        ? ` ${result.warnings.join(' ')}`
        : '';
      statusMessage = `Saved ${fileName} as ${result.container.label}.${warningSuffix}`;
    } catch (error) {
      console.error('Boomwhacker Video Builder video export failed.', error);
      errorMessage = error instanceof Error
        ? error.message
        : 'Video export failed.';
    } finally {
      busyMessage = '';
    }
  }

  async function renderExportPreviewFrame(canvas: HTMLCanvasElement): Promise<void> {
    try {
      await renderExportFrame({
        canvas,
        project,
        timing,
        guides: highwayGuides,
        timedNotes,
        frameTimeSec: exportPreviewTimeSec,
      });
      exportRenderError = '';
    } catch (error) {
      console.error('Boomwhacker Video Builder export preview render failed.', error);
      exportRenderError = 'The export preview frame could not be rendered.';
    }
  }

  function beatPinStyle(timeSec: number): string {
    const durationSec = getWaveformDurationSec();
    const ratio = durationSec > 0 ? Math.min(1, Math.max(0, timeSec / durationSec)) : 0;
    return `left:${ratio * 100}%;`;
  }

  function clampTimeSec(timeSec: number): number {
    const durationSec = getWaveformDurationSec();
    if (durationSec <= 0) {
      return Math.max(0, timeSec);
    }
    return Math.min(durationSec, Math.max(0, timeSec));
  }

  function getTimelineTimeSecFromClientX(clientX: number): number {
    const rect = beatEditorTimeline?.getBoundingClientRect();
    if (!rect) {
      return 0;
    }

    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(1, rect.width)));
    return clampTimeSec(ratio * getWaveformDurationSec());
  }

  function createBeatPinId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `beat-${crypto.randomUUID()}`;
    }
    return `beat-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function normalizeBeatPins(beatPins: BeatPin[]): BeatPin[] {
    const orderedBeatPins = [...beatPins].sort((left, right) => left.timeSec - right.timeSec);
    if (orderedBeatPins.length > 0 && !orderedBeatPins.some((pin) => pin.isDownbeat)) {
      orderedBeatPins[0] = {
        ...orderedBeatPins[0],
        isDownbeat: true,
      };
    }
    return orderedBeatPins;
  }

  function addBeatPinAtTime(timeSec: number): void {
    const nextBeatPinId = createBeatPinId();
    const nextBeatPins = normalizeBeatPins([
      ...project.beatMap.beatPins,
      {
        id: nextBeatPinId,
        timeSec: Number(clampTimeSec(timeSec).toFixed(4)),
        isDownbeat: project.beatMap.beatPins.length === 0,
        annotationIds: [],
      },
    ]);

    selectedBeatPinId = nextBeatPinId;
    setProjectState(
      touchProject({
        ...project,
        beatMap: {
          beatPins: nextBeatPins,
        },
      }),
      `Added a beat pin at ${formatSeconds(timeSec)}.`,
      { recordHistory: true },
    );
  }

  function selectBeatPin(beatPinId: string): void {
    selectedBeatPinId = beatPinId;
  }

  function updateBeatPinTime(
    beatPinId: string,
    timeSec: number,
    nextStatus?: string,
    options?: SetProjectStateOptions,
  ): void {
    const nextBeatPins = normalizeBeatPins(
      project.beatMap.beatPins.map((beatPin) => (
        beatPin.id === beatPinId
          ? {
              ...beatPin,
              timeSec: Number(clampTimeSec(timeSec).toFixed(4)),
            }
          : beatPin
      )),
    );

    selectedBeatPinId = beatPinId;
    setProjectState(
      touchProject({
        ...project,
        beatMap: {
          beatPins: nextBeatPins,
        },
      }),
      nextStatus,
      options,
    );
  }

  function handleBeatEditorTimelineClick(event: MouseEvent): void {
    if (busyMessage) {
      return;
    }
    addBeatPinAtTime(getTimelineTimeSecFromClientX(event.clientX));
  }

  function handleBeatEditorTimelineKeyDown(event: KeyboardEvent): void {
    if (tapEntryPhase !== 'idle' && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      return;
    }

    if (busyMessage || (event.key !== 'Enter' && event.key !== ' ')) {
      return;
    }

    event.preventDefault();
    addBeatPinAtTime(audioPlayer?.currentTime ?? previewCurrentTimeSec);
  }

  function handleCompactWaveformClick(event: MouseEvent): void {
    if (busyMessage || previewScrubState) {
      return;
    }

    const nextTimeSec = getTimelineTimeSecFromClientX(event.clientX);
    seekPreview(
      nextTimeSec,
      previewIsPlaying ? undefined : `Playback moved to ${formatSeconds(nextTimeSec)}.`,
    );
  }

  function handleCompactWaveformKeyDown(event: KeyboardEvent): void {
    if (busyMessage) {
      return;
    }

    const durationSec = getPreviewDurationSec();
    const scrubStepSec = event.shiftKey ? 1 : 0.1;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      togglePreviewPlayback();
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      seekPreview(0, 'Playback moved to the start.');
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      seekPreview(durationSec, `Playback moved to ${formatSeconds(durationSec)}.`);
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const nextTimeSec = clampPreviewTimeSec(previewCurrentTimeSec + (direction * scrubStepSec));
      seekPreview(nextTimeSec, `Playback moved to ${formatSeconds(nextTimeSec)}.`);
    }
  }

  function startCompactWaveformScrub(event: PointerEvent): void {
    if (busyMessage || previewScrubState || getPreviewDurationSec() <= 0) {
      return;
    }

    const target = event.currentTarget as HTMLElement | null;
    if (!target) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const startPlaybackOnRelease = previewIsPlaying || previewCanPlayGrid() || previewCanUseSourceAudio();
    if (previewIsPlaying) {
      pausePreview('');
    }

    previewScrubState = {
      pointerId: event.pointerId,
      startPlaybackOnRelease,
    };
    target.setPointerCapture(event.pointerId);
    seekPreview(getTimelineTimeSecFromClientX(event.clientX));
  }

  function updateCompactWaveformScrub(event: PointerEvent): void {
    if (!previewScrubState || previewScrubState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    seekPreview(getTimelineTimeSecFromClientX(event.clientX));
  }

  function finishCompactWaveformScrub(event: PointerEvent): void {
    if (!previewScrubState || previewScrubState.pointerId !== event.pointerId) {
      return;
    }

    const target = event.currentTarget as HTMLElement | null;
    if (target?.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }

    event.preventDefault();
    event.stopPropagation();

    const startPlaybackOnRelease = previewScrubState.startPlaybackOnRelease;
    const nextTimeSec = getTimelineTimeSecFromClientX(event.clientX);
    previewScrubState = null;
    seekPreview(
      nextTimeSec,
      startPlaybackOnRelease ? undefined : `Playback moved to ${formatSeconds(nextTimeSec)}.`,
    );
    if (startPlaybackOnRelease) {
      void playPreview();
    }
  }

  function handleHighwayStageKeyDown(event: KeyboardEvent): void {
    if (
      busyMessage
      || previewIsPlaying
      || highwayEditorTool !== 'place'
      || (event.key !== 'Enter' && event.key !== ' ')
    ) {
      return;
    }

    event.preventDefault();
    placeNoteAtSlot(activePlacementRow, getSlotIndexForTimeSec(previewCurrentTimeSec));
  }

  function startBeatPinDrag(event: MouseEvent, beatPinId: string): void {
    event.preventDefault();
    event.stopPropagation();
    selectedBeatPinId = beatPinId;
    isDraggingBeatPin = true;
    beatPinDragHistoryEntry = createHistoryEntry();

    const handlePointerMove = (moveEvent: MouseEvent) => {
      updateBeatPinTime(
        beatPinId,
        getTimelineTimeSecFromClientX(moveEvent.clientX),
        undefined,
        { recordHistory: false },
      );
    };

    const handlePointerUp = (upEvent: MouseEvent) => {
      const nextTimeSec = getTimelineTimeSecFromClientX(upEvent.clientX);
      const initialTimeSec = beatPinDragHistoryEntry?.project.beatMap.beatPins.find((beatPin) => beatPin.id === beatPinId)?.timeSec ?? nextTimeSec;
      const didMove = Math.abs(initialTimeSec - nextTimeSec) >= 0.0001;
      updateBeatPinTime(
        beatPinId,
        nextTimeSec,
        didMove ? `Moved selected beat pin to ${formatSeconds(nextTimeSec)}.` : undefined,
        {
          recordHistory: didMove,
          historyEntry: beatPinDragHistoryEntry,
        },
      );
      isDraggingBeatPin = false;
      beatPinDragHistoryEntry = null;
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
  }

  function handleWaveformClick(event: MouseEvent): void {
    const durationSec = getWaveformDurationSec();
    if (durationSec <= 0 || busyMessage) {
      return;
    }

    const target = event.currentTarget as HTMLElement | null;
    if (!target) {
      return;
    }

    const rect = target.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / Math.max(1, rect.width)));
    addBeatPinAtTime(ratio * durationSec);
  }

  function toggleBeatPinDownbeat(beatPinId: string, checked: boolean): void {
    const nextBeatPins = normalizeBeatPins(
      project.beatMap.beatPins.map((beatPin) => ({
        ...beatPin,
        isDownbeat: beatPin.id === beatPinId ? checked : beatPin.isDownbeat,
      })),
    );

    setProjectState(
      touchProject({
        ...project,
        beatMap: {
          beatPins: nextBeatPins,
        },
      }),
      checked ? 'Marked beat pin as a downbeat.' : 'Removed downbeat marker.',
      { recordHistory: true },
    );
  }

  function deleteBeatPin(beatPinId: string): void {
    const nextBeatPins = normalizeBeatPins(project.beatMap.beatPins.filter((beatPin) => beatPin.id !== beatPinId));
    setProjectState(
      touchProject({
        ...project,
        beatMap: {
          beatPins: nextBeatPins,
        },
      }),
      'Deleted beat pin.',
      { recordHistory: true },
    );
  }

  function clearTapBeatSequence(): void {
    tapBeatTimesSec = [];
    tapSessionStartMs = null;
  }

  function recordBeatTap(): void {
    const timeSec = audioPlayer && !audioPlayer.paused
      ? Number(audioPlayer.currentTime.toFixed(4))
      : (() => {
          const nowMs = performance.now();
          if (tapSessionStartMs === null) {
            tapSessionStartMs = nowMs;
            return 0;
          }
          return Number((((nowMs - tapSessionStartMs) / 1000)).toFixed(4));
        })();

    tapBeatTimesSec = [...tapBeatTimesSec, timeSec].sort((left, right) => left - right);
    statusMessage = `Captured tap ${tapBeatTimesSec.length} at ${formatSeconds(timeSec)}.`;
  }

  function applyTapBeatSequence(): boolean {
    const tappedTimes = tapBeatTimesSec.filter((timeSec, index, values) => {
      const previousTimeSec = values[index - 1];
      return previousTimeSec === undefined || Math.abs(timeSec - previousTimeSec) >= 0.04;
    });

    if (tappedTimes.length < 2) {
      statusMessage = 'Capture at least two distinct taps before applying them.';
      return false;
    }

    const nextBeatPins = tappedTimes.map((timeSec, index) => ({
      id: `beat-tap-${index + 1}`,
      timeSec,
      isDownbeat: index === 0,
      annotationIds: [],
    }));

    selectedBeatPinId = nextBeatPins[0]?.id ?? null;
    tapSessionStartMs = null;
    setProjectState(
      touchProject({
        ...project,
        beatMap: {
          beatPins: nextBeatPins,
        },
      }),
      `Replaced the beat map with ${nextBeatPins.length} tapped beats.`,
      { recordHistory: true },
    );
    return true;
  }

  function generateBlankHighway(): void {
    const bpm = clampBlankHighwayBpm(blankHighwayBpm);
    const beatCount = clampBlankHighwayBeatCount(blankHighwayBeatCount);
    const nextBeatPins = createConstantTempoBeatPins({ bpm, beatCount });

    blankHighwayBpm = bpm;
    blankHighwayBeatCount = beatCount;
    selectedBeatPinId = nextBeatPins[0]?.id ?? null;
    selectedNoteIds = [];
    clearTapBeatSequence();
    resetPreviewTransport();

    setProjectState(
      touchProject({
        ...project,
        beatMap: {
          beatPins: nextBeatPins,
        },
        grid: {
          defaultMacrobeatGrouping: 2,
          localMacrobeatGroupings: [],
        },
        notes: {
          placedNotes: [],
        },
        annotations: {
          sections: [],
          timelineNotes: [],
        },
        viewState: {
          ...project.viewState,
          activeTab: 'editor',
          scrollSlotIndex: 0,
        },
      }),
      `Generated a blank 2-based highway at ${bpm} BPM for ${beatCount} beats.`,
      { recordHistory: true },
    );
  }

  function createNoteId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `note-${crypto.randomUUID()}`;
    }
    return `note-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function getLaneByRow(row: number) {
    return BOOMWHACKER_LANES.find((lane) => lane.row === row) ?? null;
  }

  function getLaneByNoteId(noteId: string) {
    return BOOMWHACKER_LANES.find((lane) => lane.noteId === noteId) ?? null;
  }

  function getMaxSlotIndex(): number {
    return Math.max(0, timing.totalSlotCount - 1);
  }

  function getSlotIndexForTimeSec(timeSec: number): number {
    if (timing.totalSlotCount <= 0) {
      return 0;
    }

    for (let slotIndex = 0; slotIndex < timing.totalSlotCount; slotIndex += 1) {
      const nextBoundaryTimeSec = timing.slotBoundaries[slotIndex + 1]?.timeSec ?? Number.POSITIVE_INFINITY;
      if (timeSec < nextBoundaryTimeSec) {
        return slotIndex;
      }
    }

    return getMaxSlotIndex();
  }

  function getHighwayTimeSecFromClientX(clientX: number, stageRect: DOMRect): number {
    const xWithinStage = Math.min(stageRect.width, Math.max(0, clientX - stageRect.left));
    return clampPreviewTimeSec(
      (xWithinStage - getEditorHighwayLeadingPaddingPx()) / Math.max(1, getEditorHighwayPixelsPerSecond()),
    );
  }

  function getSlotIndexFromHighwayClientX(clientX: number, stageRect: DOMRect): number {
    return getSlotIndexForTimeSec(getHighwayTimeSecFromClientX(clientX, stageRect));
  }

  function getRowFromHighwayClientY(clientY: number, stageRect: DOMRect): number {
    const laneHeightPx = getEditorLaneHeightPx();
    const visualRow = Math.floor((clientY - stageRect.top) / Math.max(1, laneHeightPx));
    const clampedVisualRow = Math.min(BOOMWHACKER_LANES.length - 1, Math.max(0, visualRow));
    return getVisualLaneRow(clampedVisualRow);
  }

  function clampClientPointToRect(value: number, start: number, end: number): number {
    return Math.min(end, Math.max(start, value));
  }

  function getNormalizedClientRect(
    startClientX: number,
    startClientY: number,
    currentClientX: number,
    currentClientY: number,
  ) {
    const left = Math.min(startClientX, currentClientX);
    const right = Math.max(startClientX, currentClientX);
    const top = Math.min(startClientY, currentClientY);
    const bottom = Math.max(startClientY, currentClientY);

    return {
      left,
      top,
      right,
      bottom,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
    };
  }

  function getRelativeSelectionBoxStyle(selection: NoteBoxSelectionState): string {
    const rect = getNormalizedClientRect(
      selection.startClientX,
      selection.startClientY,
      selection.currentClientX,
      selection.currentClientY,
    );

    return [
      `left:${rect.left - selection.stageRect.left}px`,
      `top:${rect.top - selection.stageRect.top}px`,
      `width:${rect.width}px`,
      `height:${rect.height}px`,
    ].join(';');
  }

  function isHighwayEraserToolActive(): boolean {
    return highwayEditorTool === 'eraser' || highwayTemporaryEraserActive || highwayEraseState !== null;
  }

  function isHighwayLassoToolActive(): boolean {
    return highwayEditorTool === 'lasso';
  }

  function setHighwayEditorTool(nextTool: HighwayEditorTool): void {
    highwayEditorTool = nextTool;
    if (nextTool === 'place') {
      highwayTemporaryEraserActive = false;
      if (highwayEraseState === null) {
        highwayEraserPreview = null;
      }
      return;
    }

    clearHighwayHoverPreview();
    if (nextTool !== 'eraser' && highwayEraseState === null) {
      highwayEraserPreview = null;
    }
  }

  function toggleHighwayLassoTool(): void {
    setHighwayEditorTool(highwayEditorTool === 'lasso' ? 'place' : 'lasso');
  }

  function toggleHighwayEraserTool(): void {
    setHighwayEditorTool(highwayEditorTool === 'eraser' ? 'place' : 'eraser');
  }

  function shouldStartHighwayErase(event: MouseEvent): boolean {
    return event.button === 2 || (event.button === 0 && highwayEditorTool === 'eraser');
  }

  function getHighwayEraserPreviewAtClientPoint(
    clientX: number,
    clientY: number,
    options?: {
      stageRect?: DOMRect;
      clampToStage?: boolean;
    },
  ): HighwayEraserPreview | null {
    const stageRect = options?.stageRect ?? editorHighwayStage?.getBoundingClientRect();
    if (!stageRect || timing.totalSlotCount === 0) {
      return null;
    }

    const clampToStage = options?.clampToStage ?? false;
    if (
      !clampToStage
      && (
        clientX < stageRect.left
        || clientX > stageRect.right
        || clientY < stageRect.top
        || clientY > stageRect.bottom
      )
    ) {
      return null;
    }

    const resolvedClientX = clampToStage
      ? clampClientPointToRect(clientX, stageRect.left, stageRect.right)
      : clientX;
    const resolvedClientY = clampToStage
      ? clampClientPointToRect(clientY, stageRect.top, stageRect.bottom)
      : clientY;
    const slotIndex = getSlotIndexFromHighwayClientX(resolvedClientX, stageRect);

    return {
      row: getRowFromHighwayClientY(resolvedClientY, stageRect),
      startSlotIndex: slotIndex,
      endSlotIndex: slotIndex,
    };
  }

  function getHighwayEraserPreviewStyle(preview: HighwayEraserPreview): string {
    const top = getVisualLaneRow(preview.row) * getEditorLaneHeightPx();
    const startX = timeToEditorHighwayX(slotIndexToTimeSec(timing, preview.startSlotIndex));
    const endX = timeToEditorHighwayX(slotIndexToTimeSec(timing, preview.endSlotIndex + 1));
    return [
      `left:${startX}px`,
      `width:${Math.max(2, endX - startX)}px`,
      `top:${top}px`,
      `height:${getEditorLaneHeightPx()}px`,
    ].join(';');
  }

  function noteIntersectsHighwayEraserPreview(
    note: BoomwhackerGridNote,
    preview: HighwayEraserPreview,
  ): boolean {
    return (
      note.row === preview.row
      && note.startSlotIndex <= preview.endSlotIndex
      && note.endSlotIndex >= preview.startSlotIndex
    );
  }

  function applyHighwayErasePass(preview: HighwayEraserPreview, eraseState: HighwayEraseState): void {
    highwayEraserPreview = preview;

    const nextDeletedNoteIds = [...new Set([
      ...eraseState.deletedNoteIds,
      ...eraseState.historyEntry.project.notes.placedNotes
        .filter((note) => noteIntersectsHighwayEraserPreview(note, preview))
        .map((note) => note.id),
    ])];

    if (nextDeletedNoteIds.length === eraseState.deletedNoteIds.length) {
      return;
    }

    const deletedNoteIdSet = new Set(nextDeletedNoteIds);
    const nextPlacedNotes = eraseState.historyEntry.project.notes.placedNotes.filter((note) => !deletedNoteIdSet.has(note.id));
    highwayEraseState = {
      ...eraseState,
      deletedNoteIds: nextDeletedNoteIds,
    };
    selectedNoteIds = selectedNoteIds.filter((noteId) => !deletedNoteIdSet.has(noteId));
    setProjectState(
      {
        ...eraseState.historyEntry.project,
        notes: {
          placedNotes: sortGridNotes(nextPlacedNotes),
        },
      },
      undefined,
      { recordHistory: false, clearRedo: false },
    );
  }

  function finishHighwayErase(event?: MouseEvent): void {
    removeHighwayEraseListeners?.();
    removeHighwayEraseListeners = null;

    const finishedEraseState = highwayEraseState;
    highwayEraseState = null;
    highwayTemporaryEraserActive = false;
    highwayEraserPreview = (
      highwayEditorTool === 'eraser'
      && event
    )
      ? getHighwayEraserPreviewAtClientPoint(event.clientX, event.clientY)
      : null;

    if (!finishedEraseState || finishedEraseState.deletedNoteIds.length === 0) {
      return;
    }

    const deletedNoteIdSet = new Set(finishedEraseState.deletedNoteIds);
    const nextPlacedNotes = finishedEraseState.historyEntry.project.notes.placedNotes.filter((note) => !deletedNoteIdSet.has(note.id));
    setProjectState(
      touchProject({
        ...finishedEraseState.historyEntry.project,
        notes: {
          placedNotes: sortGridNotes(nextPlacedNotes),
        },
      }),
      `Erased ${finishedEraseState.deletedNoteIds.length} note${finishedEraseState.deletedNoteIds.length === 1 ? '' : 's'} from the highway.`,
      {
        recordHistory: true,
        historyEntry: finishedEraseState.historyEntry,
      },
    );
  }

  function startHighwayErase(event: MouseEvent): void {
    if (
      busyMessage
      || previewIsPlaying
      || noteBankPlacementState !== null
      || noteDragState !== null
      || noteResizeState !== null
      || noteBoxSelectionState !== null
      || highwayEraseState !== null
      || timing.totalSlotCount === 0
    ) {
      return;
    }

    const stageElement = editorHighwayStage;
    if (!stageElement) {
      return;
    }

    const stageRect = stageElement.getBoundingClientRect();
    const preview = getHighwayEraserPreviewAtClientPoint(event.clientX, event.clientY, {
      stageRect,
      clampToStage: true,
    });
    if (!preview) {
      return;
    }

    clearHighwayHoverPreview();
    event.preventDefault();
    event.stopPropagation();

    const isTemporary = event.button === 2 && highwayEditorTool !== 'eraser';
    if (isTemporary) {
      highwayTemporaryEraserActive = true;
    }

    const nextEraseState: HighwayEraseState = {
      historyEntry: createHistoryEntry(),
      stageRect,
      deletedNoteIds: [],
    };
    highwayEraseState = nextEraseState;
    highwayEraserPreview = preview;
    applyHighwayErasePass(preview, nextEraseState);

    const handlePointerMove = (moveEvent: MouseEvent) => {
      const activeEraseState = highwayEraseState;
      if (!activeEraseState) {
        return;
      }

      moveEvent.preventDefault();
      const nextPreview = getHighwayEraserPreviewAtClientPoint(moveEvent.clientX, moveEvent.clientY, {
        stageRect: activeEraseState.stageRect,
        clampToStage: true,
      });
      if (!nextPreview) {
        return;
      }

      applyHighwayErasePass(nextPreview, activeEraseState);
    };

    const handlePointerUp = (upEvent: MouseEvent) => {
      finishHighwayErase(upEvent);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    removeHighwayEraseListeners = () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };
  }

  function rectsIntersect(
    leftRect: { left: number; top: number; right: number; bottom: number },
    rightRect: { left: number; top: number; right: number; bottom: number },
  ): boolean {
    return (
      leftRect.left <= rightRect.right
      && leftRect.right >= rightRect.left
      && leftRect.top <= rightRect.bottom
      && leftRect.bottom >= rightRect.top
    );
  }

  function getNoteIdsInClientSelectionRect(selectionRect: { left: number; top: number; right: number; bottom: number }): string[] {
    if (!editorHighwayStage) {
      return [];
    }

    const noteElements = editorHighwayStage.querySelectorAll<HTMLButtonElement>('.highway__note[data-note-id]');
    const selectedIds: string[] = [];
    for (const noteElement of noteElements) {
      const noteId = noteElement.dataset.noteId;
      if (!noteId) {
        continue;
      }

      const noteRect = noteElement.getBoundingClientRect();
      if (rectsIntersect(selectionRect, noteRect)) {
        selectedIds.push(noteId);
      }
    }

    return selectedIds;
  }

  function createPlacedNote(
    row: number,
    startSlotIndex: number,
    endSlotIndex: number,
    shape: NoteShape,
  ): BoomwhackerGridNote | null {
    const lane = getLaneByRow(row);
    if (!lane) {
      return null;
    }

    return {
      id: createNoteId(),
      row,
      startSlotIndex,
      endSlotIndex,
      shape,
      color: lane.color,
      noteId: lane.noteId,
      pitchInterval: lane.pitchInterval,
    };
  }

  function validatePlacedNotes(placedNotes: BoomwhackerGridNote[]): string | null {
    if (timing.totalSlotCount === 0 && placedNotes.length > 0) {
      return 'Beat pins drive note placement. Generate at least two pins first.';
    }

    const orderedNotes = sortGridNotes(placedNotes);
    for (const note of orderedNotes) {
      if (note.row < 0 || note.row >= BOOMWHACKER_LANES.length) {
        return 'Notes must stay on the eight Boomwhacker lanes.';
      }
      if (note.startSlotIndex < 0 || note.endSlotIndex > getMaxSlotIndex()) {
        return 'That move would place a note outside the derived slot map.';
      }
    }

    for (let index = 1; index < orderedNotes.length; index += 1) {
      const previousNote = orderedNotes[index - 1];
      const currentNote = orderedNotes[index];
      if (notesOverlap(previousNote, currentNote)) {
        return 'Notes cannot overlap on the same lane.';
      }
    }

    return null;
  }

  function buildMovedPlacedNotes(
    sourceProject: BoomwhackerVideoBuilderProject,
    noteIds: string[],
    rowDelta: number,
    slotDelta: number,
  ): BoomwhackerGridNote[] {
    const selectedIdSet = new Set(noteIds);
    return sourceProject.notes.placedNotes.map((note) => {
      if (!selectedIdSet.has(note.id)) {
        return note;
      }

      const nextRow = note.row + rowDelta;
      const nextLane = getLaneByRow(nextRow);
      if (!nextLane) {
        return {
          ...note,
          row: -1,
        };
      }

      return {
        ...note,
        row: nextRow,
        startSlotIndex: note.startSlotIndex + slotDelta,
        endSlotIndex: note.endSlotIndex + slotDelta,
        color: nextLane.color,
        noteId: nextLane.noteId,
        pitchInterval: nextLane.pitchInterval,
      };
    });
  }

  function commitPlacedNotes(nextPlacedNotes: BoomwhackerGridNote[], nextStatus: string): boolean {
    const validationError = validatePlacedNotes(nextPlacedNotes);
    if (validationError) {
      statusMessage = validationError;
      return false;
    }

    setProjectState(
      touchProject({
        ...project,
        notes: {
          placedNotes: sortGridNotes(nextPlacedNotes),
        },
      }),
      nextStatus,
      { recordHistory: true },
    );
    return true;
  }

  function placePreparedNote(
    row: number,
    startSlotIndex: number,
    endSlotIndex: number,
    shape: NoteShape,
    nextStatus?: string,
  ): boolean {
    const note = createPlacedNote(row, startSlotIndex, endSlotIndex, shape);
    const lane = getLaneByRow(row);
    if (!note || !lane) {
      statusMessage = 'That lane is not available for note placement.';
      return false;
    }

    const didCommit = commitPlacedNotes(
      [
        ...project.notes.placedNotes,
        note,
      ],
      nextStatus ?? `Placed a ${shape} note on ${lane.spokenLabel}.`,
    );

    if (didCommit) {
      activePlacementRow = row;
      selectedNoteIds = [note.id];
    }

    return didCommit;
  }

  function placeNoteAtSlot(row: number, slotIndex: number): void {
    if (busyMessage) {
      return;
    }
    if (timing.totalSlotCount === 0) {
      statusMessage = 'Beat pins drive note placement. Generate at least two pins first.';
      return;
    }

    const placement = getDefaultSlotRangeForShape(timing, slotIndex, activeNoteShape);
    placePreparedNote(row, placement.startSlotIndex, placement.endSlotIndex, activeNoteShape);
  }

  function handleHighwayStageMouseDown(event: MouseEvent): void {
    if (shouldStartHighwayErase(event)) {
      startHighwayErase(event);
    }
  }

  function handleHighwayStageClick(event: MouseEvent): void {
    if (suppressNextSlotCellClick) {
      suppressNextSlotCellClick = false;
      return;
    }

    if (
      busyMessage
      || previewIsPlaying
      || highwayEditorTool !== 'place'
      || isHighwayEraserToolActive()
      || event.shiftKey
      || event.metaKey
      || event.ctrlKey
    ) {
      return;
    }

    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target || target.closest('.highway__note')) {
      return;
    }

    const stageRect = editorHighwayStage?.getBoundingClientRect();
    if (!stageRect) {
      return;
    }

    const row = getRowFromHighwayClientY(event.clientY, stageRect);
    activePlacementRow = row;
    clearHighwayHoverPreview();
    placeNoteAtSlot(
      row,
      getSlotIndexFromHighwayClientX(event.clientX, stageRect),
    );
  }

  function handleHighwayStageContextMenu(event: MouseEvent): void {
    event.preventDefault();
  }

  function clearHighwayHoverPreview(): void {
    highwayHoverPreview = null;
  }

  function handleHighwayStageMouseLeave(): void {
    clearHighwayHoverPreview();
    if (highwayEraseState === null) {
      highwayEraserPreview = null;
    }
  }

  function handleHighwayStageMouseMove(event: MouseEvent): void {
    if (
      busyMessage
      || previewIsPlaying
      || noteBankPlacementState !== null
      || noteDragState !== null
      || noteResizeState !== null
      || noteBoxSelectionState !== null
      || timing.totalSlotCount === 0
      || event.shiftKey
      || event.metaKey
      || event.ctrlKey
    ) {
      clearHighwayHoverPreview();
      if (highwayEraseState === null) {
        highwayEraserPreview = null;
      }
      return;
    }

    if (isHighwayEraserToolActive()) {
      clearHighwayHoverPreview();
      highwayEraserPreview = getHighwayEraserPreviewAtClientPoint(event.clientX, event.clientY);
      return;
    }

    if (isHighwayLassoToolActive()) {
      clearHighwayHoverPreview();
      highwayEraserPreview = null;
      return;
    }

    highwayEraserPreview = null;
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target?.closest('.highway__note[data-note-id]')) {
      clearHighwayHoverPreview();
      return;
    }

    highwayHoverPreview = getPlacementPreviewAtClientPoint(activeNoteShape, event.clientX, event.clientY);
  }

  function selectNote(noteId: string, options?: { toggle?: boolean }): void {
    if (options?.toggle) {
      selectedNoteIds = selectedNoteIds.includes(noteId)
        ? selectedNoteIds.filter((selectedId) => selectedId !== noteId)
        : [...selectedNoteIds, noteId];
      return;
    }

    selectedNoteIds = [noteId];
  }

  function handleNoteClick(event: MouseEvent, noteId: string): void {
    if (isHighwayEraserToolActive()) {
      return;
    }

    if (suppressNextNoteClick) {
      suppressNextNoteClick = false;
      return;
    }

    const note = project.notes.placedNotes.find((placedNote) => placedNote.id === noteId);
    if (note) {
      activePlacementRow = note.row;
    }

    const shouldToggle = event.shiftKey || event.metaKey || event.ctrlKey;
    selectNote(noteId, { toggle: shouldToggle });
  }

  function isCircleResizeHotspot(note: TimedBoomwhackerNote, clientX: number, rect: DOMRect): boolean {
    if (note.shape !== 'circle') {
      return false;
    }

    const hotzoneWidth = Math.min(CIRCLE_RESIZE_HOTZONE_PX, Math.max(10, rect.width * 0.28));
    return clientX >= rect.right - hotzoneWidth && clientX <= rect.right;
  }

  function updateNoteHoverCursor(event: MouseEvent, note: TimedBoomwhackerNote): void {
    const currentTarget = event.currentTarget;
    if (!(currentTarget instanceof HTMLElement)) {
      return;
    }

    const shouldShowHotspot = isCircleResizeHotspot(note, event.clientX, currentTarget.getBoundingClientRect());
    if (shouldShowHotspot) {
      resizeHotspotNoteId = note.id;
      return;
    }

    if (resizeHotspotNoteId === note.id) {
      resizeHotspotNoteId = null;
    }
  }

  function clearNoteHoverCursor(noteId: string): void {
    if (resizeHotspotNoteId === noteId) {
      resizeHotspotNoteId = null;
    }
  }

  function startNoteBoxSelection(event: MouseEvent): void {
    if (
      busyMessage
      || previewIsPlaying
      || isHighwayEraserToolActive()
      || event.button !== 0
      || (!event.shiftKey && !isHighwayLassoToolActive())
    ) {
      return;
    }

    clearHighwayHoverPreview();

    const gridElement = editorHighwayStage;
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!gridElement || !target) {
      return;
    }

    if (target.closest('.highway__note')) {
      return;
    }

    if (!(target.closest('.highway__stage') || target.classList.contains('highway__viewport'))) {
      return;
    }

    event.preventDefault();
    const gridRect = gridElement.getBoundingClientRect();
    const startClientX = clampClientPointToRect(event.clientX, gridRect.left, gridRect.right);
    const startClientY = clampClientPointToRect(event.clientY, gridRect.top, gridRect.bottom);

    noteBoxSelectionState = {
      startClientX,
      startClientY,
      currentClientX: startClientX,
      currentClientY: startClientY,
      stageRect: gridRect,
      initialSelectedNoteIds: isHighwayLassoToolActive() && !event.shiftKey
        ? []
        : [...selectedNoteIds],
      hasMoved: false,
    };

    const handlePointerMove = (moveEvent: MouseEvent) => {
      if (!noteBoxSelectionState) {
        return;
      }

      const currentClientX = clampClientPointToRect(moveEvent.clientX, gridRect.left, gridRect.right);
      const currentClientY = clampClientPointToRect(moveEvent.clientY, gridRect.top, gridRect.bottom);
      const hasMoved = (
        Math.abs(currentClientX - noteBoxSelectionState.startClientX) >= 4
        || Math.abs(currentClientY - noteBoxSelectionState.startClientY) >= 4
      );

      noteBoxSelectionState = {
        ...noteBoxSelectionState,
        currentClientX,
        currentClientY,
        hasMoved,
      };

      if (!hasMoved) {
        return;
      }

      const selectionRect = getNormalizedClientRect(
        noteBoxSelectionState.startClientX,
        noteBoxSelectionState.startClientY,
        currentClientX,
        currentClientY,
      );
      const draggedNoteIds = getNoteIdsInClientSelectionRect(selectionRect);
      selectedNoteIds = [
        ...new Set([
          ...noteBoxSelectionState.initialSelectedNoteIds,
          ...draggedNoteIds,
        ]),
      ];
    };

    const handlePointerUp = () => {
      const finishedSelection = noteBoxSelectionState;
      noteBoxSelectionState = null;
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);

      if (!finishedSelection) {
        return;
      }

      if (finishedSelection.hasMoved) {
        suppressNextSlotCellClick = true;
        suppressNextNoteClick = true;
        statusMessage = selectedNoteIds.length > 0
          ? `Selected ${selectedNoteIds.length} note${selectedNoteIds.length === 1 ? '' : 's'} with a box selection.`
          : 'The selection box did not cover any notes.';
      }
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
  }

  function startNoteDrag(event: MouseEvent, noteId: string): void {
    if (busyMessage || previewIsPlaying || event.button !== 0 || event.shiftKey || event.metaKey || event.ctrlKey) {
      return;
    }

    const anchorNote = project.notes.placedNotes.find((note) => note.id === noteId);
    const stageElement = editorHighwayStage;
    if (!anchorNote || !stageElement) {
      return;
    }

    clearHighwayHoverPreview();
    event.preventDefault();
    event.stopPropagation();

    const dragNoteIds = selectedNoteIds.includes(noteId)
      ? [...selectedNoteIds]
      : [noteId];
    selectedNoteIds = dragNoteIds;

    noteDragState = {
      historyEntry: createHistoryEntry(),
      noteIds: dragNoteIds,
      anchorRow: anchorNote.row,
      anchorSlotIndex: anchorNote.startSlotIndex,
      stageRect: stageElement.getBoundingClientRect(),
      currentRowDelta: 0,
      currentSlotDelta: 0,
    };

    const handlePointerMove = (moveEvent: MouseEvent) => {
      if (!noteDragState) {
        return;
      }

      const rowDelta = getRowFromHighwayClientY(moveEvent.clientY, noteDragState.stageRect) - noteDragState.anchorRow;
      const slotDelta = getSlotIndexFromHighwayClientX(moveEvent.clientX, noteDragState.stageRect) - noteDragState.anchorSlotIndex;
      if (
        rowDelta === noteDragState.currentRowDelta
        && slotDelta === noteDragState.currentSlotDelta
      ) {
        return;
      }

      const nextPlacedNotes = buildMovedPlacedNotes(
        noteDragState.historyEntry.project,
        noteDragState.noteIds,
        rowDelta,
        slotDelta,
      );
      if (validatePlacedNotes(nextPlacedNotes)) {
        return;
      }

      noteDragState = {
        ...noteDragState,
        currentRowDelta: rowDelta,
        currentSlotDelta: slotDelta,
      };
      setProjectState(
        {
          ...noteDragState.historyEntry.project,
          notes: {
            placedNotes: sortGridNotes(nextPlacedNotes),
          },
        },
        undefined,
        { recordHistory: false, clearRedo: false },
      );
    };

    const handlePointerUp = () => {
      const finishedDragState = noteDragState;
      noteDragState = null;
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);

      if (!finishedDragState) {
        return;
      }

      const didMove = (
        finishedDragState.currentRowDelta !== 0
        || finishedDragState.currentSlotDelta !== 0
      );
      if (!didMove) {
        setProjectState(
          finishedDragState.historyEntry.project,
          undefined,
          { recordHistory: false, clearRedo: false },
        );
        return;
      }

      const nextPlacedNotes = buildMovedPlacedNotes(
        finishedDragState.historyEntry.project,
        finishedDragState.noteIds,
        finishedDragState.currentRowDelta,
        finishedDragState.currentSlotDelta,
      );
      const validationError = validatePlacedNotes(nextPlacedNotes);
      if (validationError) {
        setProjectState(
          finishedDragState.historyEntry.project,
          validationError,
          { recordHistory: false, clearRedo: false },
        );
        return;
      }

      setProjectState(
        touchProject({
          ...finishedDragState.historyEntry.project,
          notes: {
            placedNotes: sortGridNotes(nextPlacedNotes),
          },
        }),
        `Dragged ${finishedDragState.noteIds.length} selected note${finishedDragState.noteIds.length === 1 ? '' : 's'}.`,
        {
          recordHistory: true,
          historyEntry: finishedDragState.historyEntry,
        },
      );
      selectedNoteIds = [...finishedDragState.noteIds];
      suppressNextNoteClick = true;
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
  }

  function handleNotePointerDown(event: MouseEvent, note: TimedBoomwhackerNote): void {
    const currentTarget = event.currentTarget;
    if (!(currentTarget instanceof HTMLElement)) {
      return;
    }

    activePlacementRow = note.row;

    if (shouldStartHighwayErase(event)) {
      startHighwayErase(event);
      return;
    }

    if (isCircleResizeHotspot(note, event.clientX, currentTarget.getBoundingClientRect())) {
      startNoteResize(event, note.id);
      return;
    }

    startNoteDrag(event, note.id);
  }

  function startNoteResize(event: MouseEvent, noteId: string): void {
    if (busyMessage || previewIsPlaying || event.button !== 0) {
      return;
    }

    const note = project.notes.placedNotes.find((placedNote) => placedNote.id === noteId);
    const stageElement = editorHighwayStage;
    if (!note || !stageElement) {
      return;
    }

    clearHighwayHoverPreview();
    event.preventDefault();
    event.stopPropagation();
    selectedNoteIds = [noteId];

    noteResizeState = {
      historyEntry: createHistoryEntry(),
      noteId,
      stageRect: stageElement.getBoundingClientRect(),
      currentEndSlotIndex: note.endSlotIndex,
    };

    const handlePointerMove = (moveEvent: MouseEvent) => {
      if (!noteResizeState) {
        return;
      }

      const sourceNote = noteResizeState.historyEntry.project.notes.placedNotes.find((placedNote) => placedNote.id === noteId);
      if (!sourceNote) {
        return;
      }

      const nextEndSlotIndex = clampNoteEndSlotIndex(
        sourceNote.startSlotIndex,
        getSlotIndexFromHighwayClientX(moveEvent.clientX, noteResizeState.stageRect),
        sourceNote.shape,
        getMaxSlotIndex(),
        timing,
      );

      if (nextEndSlotIndex === noteResizeState.currentEndSlotIndex) {
        return;
      }

      const nextPlacedNotes = noteResizeState.historyEntry.project.notes.placedNotes.map((placedNote) => (
        placedNote.id === noteId
          ? {
              ...placedNote,
              endSlotIndex: nextEndSlotIndex,
            }
          : placedNote
      ));
      if (validatePlacedNotes(nextPlacedNotes)) {
        return;
      }

      noteResizeState = {
        ...noteResizeState,
        currentEndSlotIndex: nextEndSlotIndex,
      };
      setProjectState(
        {
          ...noteResizeState.historyEntry.project,
          notes: {
            placedNotes: sortGridNotes(nextPlacedNotes),
          },
        },
        undefined,
        { recordHistory: false, clearRedo: false },
      );
    };

    const handlePointerUp = () => {
      const finishedResizeState = noteResizeState;
      noteResizeState = null;
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);

      if (!finishedResizeState) {
        return;
      }

      const sourceNote = finishedResizeState.historyEntry.project.notes.placedNotes.find((placedNote) => placedNote.id === noteId);
      if (!sourceNote) {
        setProjectState(
          finishedResizeState.historyEntry.project,
          undefined,
          { recordHistory: false, clearRedo: false },
        );
        return;
      }

      const didResize = sourceNote.endSlotIndex !== finishedResizeState.currentEndSlotIndex;
      if (!didResize) {
        setProjectState(
          finishedResizeState.historyEntry.project,
          undefined,
          { recordHistory: false, clearRedo: false },
        );
        return;
      }

      const nextPlacedNotes = finishedResizeState.historyEntry.project.notes.placedNotes.map((placedNote) => (
        placedNote.id === noteId
          ? {
              ...placedNote,
              endSlotIndex: finishedResizeState.currentEndSlotIndex,
            }
          : placedNote
      ));
      const validationError = validatePlacedNotes(nextPlacedNotes);
      if (validationError) {
        setProjectState(
          finishedResizeState.historyEntry.project,
          validationError,
          { recordHistory: false, clearRedo: false },
        );
        return;
      }

      setProjectState(
        touchProject({
          ...finishedResizeState.historyEntry.project,
          notes: {
            placedNotes: sortGridNotes(nextPlacedNotes),
          },
        }),
        'Resized the selected note.',
        {
          recordHistory: true,
          historyEntry: finishedResizeState.historyEntry,
        },
      );
      suppressNextNoteClick = true;
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
  }

  function getPlacementPreviewAtClientPoint(
    shape: NoteShape,
    clientX: number,
    clientY: number,
  ): HighwayPlacementPreview | null {
    const stageRect = editorHighwayStage?.getBoundingClientRect();
    if (!stageRect || timing.totalSlotCount === 0) {
      return null;
    }

    if (
      clientX < stageRect.left
      || clientX > stageRect.right
      || clientY < stageRect.top
      || clientY > stageRect.bottom
    ) {
      return null;
    }

    const row = getRowFromHighwayClientY(clientY, stageRect);
    const slotIndex = getSlotIndexFromHighwayClientX(clientX, stageRect);
    const placement = getDefaultSlotRangeForShape(timing, slotIndex, shape);
    return {
      shape,
      row,
      startSlotIndex: placement.startSlotIndex,
      endSlotIndex: placement.endSlotIndex,
    };
  }

  function startNoteBankPlacement(event: MouseEvent, shape: NoteShape): void {
    if (busyMessage || previewIsPlaying || event.button !== 0) {
      return;
    }

    clearHighwayHoverPreview();
    highwayEraserPreview = null;
    activeNoteShape = shape;
    setHighwayEditorTool('place');
    noteBankPlacementState = {
      shape,
      startClientX: event.clientX,
      startClientY: event.clientY,
      currentClientX: event.clientX,
      currentClientY: event.clientY,
      hasMoved: false,
      preview: getPlacementPreviewAtClientPoint(shape, event.clientX, event.clientY),
    };

    const handlePointerMove = (moveEvent: MouseEvent) => {
      if (!noteBankPlacementState) {
        return;
      }

      const hasMoved = (
        Math.abs(moveEvent.clientX - noteBankPlacementState.startClientX) >= 4
        || Math.abs(moveEvent.clientY - noteBankPlacementState.startClientY) >= 4
      );

      noteBankPlacementState = {
        ...noteBankPlacementState,
        currentClientX: moveEvent.clientX,
        currentClientY: moveEvent.clientY,
        hasMoved,
        preview: getPlacementPreviewAtClientPoint(shape, moveEvent.clientX, moveEvent.clientY),
      };
    };

    const handlePointerUp = () => {
      const finishedPlacement = noteBankPlacementState;
      noteBankPlacementState = null;
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);

      if (!finishedPlacement?.hasMoved || !finishedPlacement.preview) {
        return;
      }

      placePreparedNote(
        finishedPlacement.preview.row,
        finishedPlacement.preview.startSlotIndex,
        finishedPlacement.preview.endSlotIndex,
        finishedPlacement.preview.shape,
        `Dropped a ${finishedPlacement.preview.shape} note onto the highway.`,
      );
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
  }

  function clearNoteSelection(): void {
    selectedNoteIds = [];
    statusMessage = 'Cleared the note selection.';
  }

  function deleteNotesById(noteIds: string[], nextStatus: string, emptyStatus?: string): void {
    const uniqueNoteIds = [...new Set(noteIds)];
    if (uniqueNoteIds.length === 0) {
      statusMessage = emptyStatus ?? 'Select at least one note first.';
      return;
    }

    const selectedIdSet = new Set(uniqueNoteIds);
    const nextPlacedNotes = project.notes.placedNotes.filter((note) => !selectedIdSet.has(note.id));
    const deletedCount = project.notes.placedNotes.length - nextPlacedNotes.length;
    if (deletedCount <= 0) {
      return;
    }

    selectedNoteIds = [];
    void commitPlacedNotes(
      nextPlacedNotes,
      deletedCount === uniqueNoteIds.length
        ? nextStatus
        : `Deleted ${deletedCount} note${deletedCount === 1 ? '' : 's'}.`,
    );
  }

  function deleteSelectedNotes(): void {
    deleteNotesById(
      selectedNoteIds,
      `Deleted ${selectedNoteIds.length} selected note${selectedNoteIds.length === 1 ? '' : 's'}.`,
    );
  }

  function moveSelectedNotes(rowDelta: number, slotDelta: number): void {
    if (selectedNoteIds.length === 0) {
      statusMessage = 'Select at least one note first.';
      return;
    }

    const nextPlacedNotes = buildMovedPlacedNotes(project, selectedNoteIds, rowDelta, slotDelta);

    const didCommit = commitPlacedNotes(
      nextPlacedNotes,
      `Moved ${selectedNoteIds.length} selected note${selectedNoteIds.length === 1 ? '' : 's'}.`,
    );

    if (!didCommit) {
      return;
    }

    selectedNoteIds = [...selectedNoteIds];
  }

  function resizeSelectedNotes(deltaSlots: number): void {
    if (selectedNoteIds.length === 0) {
      statusMessage = 'Select at least one note first.';
      return;
    }

    const selectedIdSet = new Set(selectedNoteIds);
    const maxSlotIndex = getMaxSlotIndex();
    const nextPlacedNotes = project.notes.placedNotes.map((note) => {
      if (!selectedIdSet.has(note.id)) {
        return note;
      }

      return {
        ...note,
        endSlotIndex: clampNoteEndSlotIndex(
          note.startSlotIndex,
          note.endSlotIndex + deltaSlots,
          note.shape,
          maxSlotIndex,
          timing,
        ),
      };
    });

    void commitPlacedNotes(
      nextPlacedNotes,
      `${deltaSlots > 0 ? 'Extended' : 'Shortened'} ${selectedNoteIds.length} selected note${selectedNoteIds.length === 1 ? '' : 's'}.`,
    );
  }

  function copySelectedNotes(): void {
    if (selectedNoteIds.length === 0) {
      statusMessage = 'Select at least one note first.';
      return;
    }

    const selectedIdSet = new Set(selectedNoteIds);
    clipboardNotes = sortGridNotes(
      project.notes.placedNotes
        .filter((note) => selectedIdSet.has(note.id))
        .map((note) => ({ ...note })),
    );
    statusMessage = `Copied ${clipboardNotes.length} note${clipboardNotes.length === 1 ? '' : 's'} to the local clipboard.`;
  }

  function pasteSelectedNotes(): void {
    if (clipboardNotes.length === 0) {
      statusMessage = 'Copy at least one note before pasting.';
      return;
    }

    const maxSlotIndex = getMaxSlotIndex();
    const anchorNote = selectedNotes[0] ?? null;
    const sourceMinRow = Math.min(...clipboardNotes.map((note) => note.row));
    const sourceMinSlotIndex = Math.min(...clipboardNotes.map((note) => note.startSlotIndex));
    const targetRow = anchorNote?.row ?? sourceMinRow;
    const targetSlotIndex = anchorNote
      ? Math.min(maxSlotIndex, anchorNote.startSlotIndex + 1)
      : Math.min(maxSlotIndex, Math.max(0, project.viewState.scrollSlotIndex));
    const rowDelta = targetRow - sourceMinRow;
    const slotDelta = targetSlotIndex - sourceMinSlotIndex;

    const pastedNotes = clipboardNotes.map((note) => {
      const lane = getLaneByRow(note.row + rowDelta);
      if (!lane) {
        return null;
      }

      return {
        ...note,
        id: createNoteId(),
        row: note.row + rowDelta,
        startSlotIndex: note.startSlotIndex + slotDelta,
        endSlotIndex: note.endSlotIndex + slotDelta,
        color: lane.color,
        noteId: lane.noteId,
        pitchInterval: lane.pitchInterval,
      };
    }).filter((note): note is BoomwhackerGridNote => note !== null);

    if (pastedNotes.length !== clipboardNotes.length) {
      statusMessage = 'The pasted notes would fall outside the available Boomwhacker lanes.';
      return;
    }

    const didCommit = commitPlacedNotes(
      [
        ...project.notes.placedNotes,
        ...pastedNotes,
      ],
      `Pasted ${pastedNotes.length} note${pastedNotes.length === 1 ? '' : 's'}.`,
    );

    if (didCommit) {
      selectedNoteIds = pastedNotes.map((note) => note.id);
    }
  }

  function updateProjectTitle(title: string): void {
    const nextTitle = title || 'Untitled Boomwhacker Video';
    setProjectState(
      touchProject({
        ...project,
        metadata: {
          ...project.metadata,
          title: nextTitle,
        },
        exportState: {
          ...project.exportState,
          titleCard: {
            ...project.exportState.titleCard,
            title: nextTitle,
          },
        },
      }),
    );
  }

  async function handleAudioImport(
    file: File,
    options?: {
      title?: string;
      grouping?: MacrobeatGrouping;
      beatMapMode?: BeatMapStartMode;
    },
  ): Promise<void> {
    busyMessage = 'Decoding audio and building a waveform...';
    errorMessage = '';

    try {
      resetPreviewTransport();
      selectedNoteIds = [];
      clipboardNotes = [];
      autosaveRecoveryState = null;
      const importedAsset = await importAudioFile(file);
      const nextTitle = options?.title?.trim() || stripExtension(file.name) || project.metadata.title;
      const nextGrouping = options?.grouping ?? project.grid.defaultMacrobeatGrouping;
      const beatMapMode = options?.beatMapMode ?? 'tap';
      const shouldAutoSuggestBeats = beatMapMode === 'auto';
      const preserveExistingEditorData = hasExistingEditorWork() && !shouldAutoSuggestBeats;
      const baseProject = preserveExistingEditorData
        ? touchProject({
            ...project,
            metadata: {
              ...project.metadata,
              title: nextTitle,
            },
            audio: importedAsset.audio,
            grid: {
              ...project.grid,
              defaultMacrobeatGrouping: nextGrouping,
            },
            exportState: {
              ...project.exportState,
              titleCard: {
                ...project.exportState.titleCard,
                title: nextTitle,
              },
            },
          })
        : touchProject({
            ...createBoomwhackerVideoBuilderProject({
              title: nextTitle,
              appVersion: project.metadata.appVersion,
              audio: importedAsset.audio,
            }),
            audioProcessing: {
              ...project.audioProcessing,
            },
            grid: {
              defaultMacrobeatGrouping: nextGrouping,
              localMacrobeatGroupings: [],
            },
            viewState: {
              ...project.viewState,
              activeTab: shouldAutoSuggestBeats ? 'editor' : 'beats',
              scrollSlotIndex: 0,
            },
            previewState: {
              ...project.previewState,
            },
            exportState: {
              ...project.exportState,
              titleCard: {
                ...project.exportState.titleCard,
                title: nextTitle,
              },
            },
            beatMap: {
              beatPins: shouldAutoSuggestBeats ? importedAsset.beatAnalysis.beatPins : [],
            },
            notes: {
              placedNotes: [],
            },
            annotations: {
              sections: [],
              timelineNotes: [],
            },
          });
      const persistedAudio = await persistProjectAudioLocally(baseProject.metadata.id, file, importedAsset.audio);
      const nextProject = touchProject({
        ...baseProject,
        audio: persistedAudio,
      });

      setProjectState(
        nextProject,
        preserveExistingEditorData
          ? `Loaded "${file.name}" without clearing the current beat map, notes, or captured taps.`
          : shouldAutoSuggestBeats
          ? `Loaded "${file.name}" and generated ${importedAsset.beatAnalysis.beatPins.length} suggested beat pins.`
          : `Loaded "${file.name}". Tap along with playback in the Beat Editor to build the beat map.`,
      );
      syncSetupModalState(nextProject);
      resetHistory();
      await applyAudioPresentation(importedAsset);
    } catch (error) {
      console.error('Boomwhacker Video Builder audio import failed.', error);
      errorMessage = 'Audio upload failed. Use a browser-decodable WAV, MP3, M4A, or OGG file.';
    } finally {
      busyMessage = '';
    }
  }

  async function reattachAudioToCurrentProject(file: File): Promise<void> {
    busyMessage = 'Reattaching source audio...';
    errorMessage = '';

    try {
      resetPreviewTransport();
      const importedAsset = await importAudioFile(file);
      const persistedAudio = await persistProjectAudioLocally(project.metadata.id, file, importedAsset.audio);
      const nextProject = touchProject({
        ...project,
        audio: persistedAudio,
      });

      setProjectState(
        nextProject,
        project.beatMap.beatPins.length === 0
          ? `Attached "${file.name}". Tap along with playback to build the beat map for this chart.`
          : `Reattached "${file.name}" to the current chart without changing the note grid.`,
      );
      syncSetupModalState(nextProject);
      autosaveRecoveryState = autosaveRecoveryState
        ? {
            ...autosaveRecoveryState,
            audioFileName: file.name,
            requiresAudioReattach: false,
          }
        : null;
      await applyAudioPresentation(importedAsset);
    } catch (error) {
      console.error('Boomwhacker Video Builder audio reattach failed.', error);
      errorMessage = 'Audio reattach failed. Choose the original song file to restore waveform and preview playback.';
    } finally {
      busyMessage = '';
      audioInputMode = 'setup-import';
    }
  }

  async function loadProjectIntoShell(
    nextProject: BoomwhackerVideoBuilderProject,
    successMessage: string,
  ): Promise<void> {
    busyMessage = 'Loading project...';
    errorMessage = '';

    try {
      resetPreviewTransport();
      clearTapBeatSequence();
      selectedNoteIds = [];
      let hydratedProject: BoomwhackerVideoBuilderProject = nextProject.viewState.activeTab === 'setup'
        ? {
            ...nextProject,
            viewState: {
              ...nextProject.viewState,
              activeTab: nextProject.beatMap.beatPins.length === 0 ? 'beats' as const : 'editor' as const,
            },
          }
        : nextProject;

      const hydratedAudio = nextProject.audio
        ? await hydrateProjectAudioFromLocalStore(nextProject.audio)
          ?? await hydrateProjectAudio(nextProject.audio)
        : null;

      if (hydratedAudio) {
        setProjectState(hydratedProject, successMessage);
        syncSetupModalState(hydratedProject);
        resetHistory();
        await applyAudioPresentation(hydratedAudio);
        estimatedTempoBpm = estimateTempoFromBeatPins(hydratedProject.beatMap.beatPins);
        return;
      }

      setProjectState(
        hydratedProject,
        hydratedProject.audio
          ? `${successMessage} Reattach the source audio if you need waveform and source-audio preview. Grid playback remains available.`
          : successMessage,
      );
      syncSetupModalState(hydratedProject);
      resetHistory();
      clearAudioPresentation();
    } catch (error) {
      console.error('Boomwhacker Video Builder project load failed.', error);
      errorMessage = 'Project load failed. The file may be invalid or from an incompatible schema.';
    } finally {
      busyMessage = '';
    }
  }

  async function saveProject(): Promise<void> {
    busyMessage = 'Saving project file...';
    errorMessage = '';

    try {
      const savedProject = touchProject(project);
      project = savedProject;
      await saveTextFile(
        JSON.stringify(savedProject, null, 2),
        getProjectFileName(),
        {
          description: 'Boomwhacker Video Builder Project',
          mimeType: 'application/json',
          extensions: ['.json'],
        },
      );
      statusMessage = `Saved ${getProjectFileName()}.`;
    } catch (error) {
      console.error('Boomwhacker Video Builder save failed.', error);
      errorMessage = 'Project save failed.';
    } finally {
      busyMessage = '';
    }
  }

  function handleAudioInputChange(event: Event): void {
    const input = event.currentTarget as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }

    if (audioInputMode === 'reattach-project') {
      input.value = '';
      void reattachAudioToCurrentProject(file);
      return;
    }

    if (!isSetupModalOpen) {
      openSetupModal();
    }
    pendingSetupAudioFile = file;
    if (!setupModalTitleTouched || setupModalTitle.trim() === '' || isFreshBlankProject()) {
      setupModalTitle = stripExtension(file.name) || setupModalTitle;
      setupModalTitleTouched = false;
    }
    input.value = '';
  }

  async function applySetupModal(): Promise<void> {
    const nextTitle = setupModalTitle.trim()
      || (pendingSetupAudioFile ? stripExtension(pendingSetupAudioFile.name) : project.metadata.title)
      || 'Untitled Boomwhacker Video';

    if (pendingSetupAudioFile) {
      const file = pendingSetupAudioFile;
      closeSetupModal();
      await handleAudioImport(file, {
        title: nextTitle,
        grouping: setupModalGrouping,
        beatMapMode: setupModalBeatMapMode,
      });
      return;
    }

    applyProjectSetup(nextTitle, setupModalGrouping, 'Updated project setup.');
    closeSetupModal();
  }

  function handleProjectInputChange(event: Event): void {
    const input = event.currentTarget as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }

    autosaveRecoveryState = null;
    void file.text().then((content) => {
      const nextProject = parseBoomwhackerVideoBuilderProject(content);
      return loadProjectIntoShell(nextProject, `Loaded "${file.name}".`);
    }).catch((error) => {
      console.error('Boomwhacker Video Builder project file read failed.', error);
      errorMessage = 'Project file read failed.';
    });

    input.value = '';
  }

  function buildAutosaveSnapshot(sourceProject: BoomwhackerVideoBuilderProject): BoomwhackerVideoBuilderProject {
    return {
      ...sourceProject,
      audio: sourceProject.audio
        ? {
            ...sourceProject.audio,
            embeddedBase64: null,
          }
        : null,
    };
  }

  async function restoreAutosave(): Promise<void> {
    suppressAutosave = true;

    try {
      const storedProject = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
      if (!storedProject) {
        return;
      }

      const autosaveEnvelope = parseAutosaveEnvelope(storedProject);
      lastAutosaveAtIso = autosaveEnvelope.savedAtIso;
      await loadProjectIntoShell(
        {
          ...autosaveEnvelope.project,
          viewState: {
            ...autosaveEnvelope.project.viewState,
            zoom: 1,
          },
        },
        'Recovered autosave.',
      );
      autosaveRecoveryState = {
        savedAtIso: autosaveEnvelope.savedAtIso,
        title: autosaveEnvelope.project.metadata.title,
        audioFileName: autosaveEnvelope.project.audio?.originalFileName ?? null,
        requiresAudioReattach: Boolean(autosaveEnvelope.project.audio && !decodedAudioBuffer),
      };
    } catch (error) {
      console.warn('Boomwhacker Video Builder autosave restore failed.', error);
      localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
      lastAutosaveAtIso = null;
    } finally {
      suppressAutosave = false;
      hasPendingAutosaveWrite = false;
      hasInitializedAutosave = true;
    }
  }

  function createNewProject(): void {
    resetPreviewTransport();
    clearTapBeatSequence();
    selectedNoteIds = [];
    clipboardNotes = [];
    const nextProject = createBoomwhackerVideoBuilderProject();
    setProjectState(nextProject, 'Created a new empty project.');
    clearAudioPresentation();
    syncSetupModalState(nextProject);
    resetHistory();
    autosaveRecoveryState = null;
  }

  function loadDemoChart(): void {
    resetPreviewTransport();
    clearTapBeatSequence();
    selectedNoteIds = [];
    clipboardNotes = [];
    const demoProject = createSampleBoomwhackerVideoBuilderProject();
    setProjectState(demoProject, 'Loaded the demo chart. Upload audio to replace it with a real song.');
    syncSetupModalState(demoProject);
    clearAudioPresentation();
    resetHistory();
    autosaveRecoveryState = null;
  }

  function shouldIgnoreEditorShortcut(target: EventTarget | null): boolean {
    const element = target instanceof HTMLElement ? target : null;
    return Boolean(element?.closest('input, textarea, select, [contenteditable="true"]'));
  }

  function handleBeforeUnload(): void {
    flushAutosaveWrite();
  }

  function handleWindowKeydown(event: KeyboardEvent): void {
    if (shouldIgnoreEditorShortcut(event.target)) {
      return;
    }

    const modifierKey = event.metaKey || event.ctrlKey;
    const normalizedKey = event.key.toLowerCase();

    if (project.viewState.activeTab === 'beats' && tapEntryPhase !== 'idle') {
      if (event.code === 'Space' && !modifierKey) {
        event.preventDefault();
        if (tapEntryPhase === 'capturing') {
          recordBeatTap();
        }
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        stopTapEntry({
          applyTapSequence: tapEntryPhase === 'capturing',
          pauseAudio: tapEntryPhase === 'capturing',
          nextStatus: tapEntryPhase === 'count-in'
            ? 'Tap entry cancelled.'
            : 'Tap entry stopped. Capture at least two distinct taps to replace the beat map.',
        });
        return;
      }
    }

    if (project.viewState.activeTab !== 'editor') {
      return;
    }

    if (modifierKey && normalizedKey === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        redoProjectChange();
      } else {
        undoProjectChange();
      }
      return;
    }

    if (modifierKey && normalizedKey === 'y') {
      event.preventDefault();
      redoProjectChange();
      return;
    }

    if (modifierKey && normalizedKey === 'c') {
      event.preventDefault();
      copySelectedNotes();
      return;
    }

    if (modifierKey && normalizedKey === 'v') {
      event.preventDefault();
      pasteSelectedNotes();
      return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      deleteSelectedNotes();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      clearNoteSelection();
      return;
    }

    if (event.code === 'Space' && !modifierKey) {
      event.preventDefault();
      togglePreviewPlayback();
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveSelectedNotes(0, event.shiftKey ? -4 : -1);
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveSelectedNotes(0, event.shiftKey ? 4 : 1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveSelectedNotes(-1, 0);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveSelectedNotes(1, 0);
      return;
    }

    if (event.key === '[') {
      event.preventDefault();
      resizeSelectedNotes(-1);
      return;
    }

    if (event.key === ']') {
      event.preventDefault();
      resizeSelectedNotes(1);
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleWindowKeydown);
    window.addEventListener('beforeunload', handleBeforeUnload);
    void restoreAutosave();
  });

  onDestroy(() => {
    flushAutosaveWrite();
    finishHighwayErase();
    previewSynth.dispose();
    cancelPreviewAnimation();
    cancelBeatEditorAnimation();
    cancelTapEntryAnimation();
    if (highwayZoomPreviewTimeoutId !== null) {
      clearTimeout(highwayZoomPreviewTimeoutId);
      highwayZoomPreviewTimeoutId = null;
    }
    window.removeEventListener('keydown', handleWindowKeydown);
    window.removeEventListener('beforeunload', handleBeforeUnload);
    replaceAudioPreviewUrl(null);
    replaceSourceAudioPreviewUrl(null);
  });

  $: timing = deriveTimingModel(project.beatMap.beatPins, project.grid);
  $: waveformDurationSec = project.audio?.durationSec ?? timing.totalDurationSec;
  $: previewDurationSec = Math.max(project.audio?.durationSec ?? 0, timing.totalDurationSec);
  $: editorHighwayPixelsPerSecond = 72 * project.viewState.zoom;
  $: editorHighwayLeadingPaddingPx = Math.max(1, editorHighwayViewportWidthPx) * judgmentLineRatio;
  $: editorHighwayTrailingPaddingPx = Math.max(0, Math.max(1, editorHighwayViewportWidthPx) - editorHighwayLeadingPaddingPx);
  $: editorHighwayDurationSec = Math.max(previewDurationSec, timing.totalDurationSec);
  $: editorHighwayStageWidthPx = Math.max(
    Math.max(1, editorHighwayViewportWidthPx),
    Math.ceil(
      (editorHighwayDurationSec * editorHighwayPixelsPerSecond)
      + editorHighwayLeadingPaddingPx
      + editorHighwayTrailingPaddingPx
    ),
  );
  $: guides = deriveGuideLines(timing);
  $: highwayGuides = getVisibleHighwayGuides(guides);
  $: activeJudgmentBeatSpan = getActiveHighwayBeatSpan(timing, previewCurrentTimeSec);
  $: activeHighwayPlacementPreview = noteBankPlacementState?.preview ?? (
    highwayEditorTool === 'place' && !highwayTemporaryEraserActive && highwayEraseState === null
      ? highwayHoverPreview
      : null
  );
  $: if (project.viewState.activeTab !== 'editor' && highwayHoverPreview !== null) {
    highwayHoverPreview = null;
  }
  $: if (project.viewState.activeTab !== 'editor' && highwayEraseState !== null) {
    finishHighwayErase();
  }
  $: if (project.viewState.activeTab !== 'editor') {
    highwayTemporaryEraserActive = false;
    if (highwayEraseState === null && highwayEraserPreview !== null) {
      highwayEraserPreview = null;
    }
  }
  $: if (timing.totalSlotCount === 0 && highwayHoverPreview !== null) {
    highwayHoverPreview = null;
  }
  $: if (timing.totalSlotCount === 0 && highwayEraserPreview !== null && highwayEraseState === null) {
    highwayEraserPreview = null;
  }
  $: timedNotes = deriveTimedNotes(project.notes.placedNotes, timing);
  $: canRenderBeatEditorTimeline = waveformPeaks.length > 0 || timing.totalSlotCount > 0;
  $: selectedNotes = sortGridNotes(project.notes.placedNotes.filter((note) => selectedNoteIds.includes(note.id)));
  $: tapEntryPreviewPins = tapEntryPhase === 'idle'
    ? []
    : tapBeatTimesSec.map((timeSec, index) => ({
        id: `tap-preview-${index + 1}`,
        timeSec,
      }));
  $: if (selectedNoteIds.some((noteId) => !project.notes.placedNotes.some((note) => note.id === noteId))) {
    selectedNoteIds = selectedNoteIds.filter((noteId) => project.notes.placedNotes.some((note) => note.id === noteId));
  }
  $: if (
    selectedBeatPinId !== null
    && !project.beatMap.beatPins.some((beatPin) => beatPin.id === selectedBeatPinId)
    && project.beatMap.beatPins.length > 0
  ) {
    selectedBeatPinId = project.beatMap.beatPins[0]?.id ?? null;
  }
  $: if (selectedBeatPinId === null && project.beatMap.beatPins.length > 0) {
    selectedBeatPinId = project.beatMap.beatPins[0]?.id ?? null;
  }
  $: if (project.beatMap.beatPins.length === 0 && selectedBeatPinId !== null) {
    selectedBeatPinId = null;
  }
  $: if (project.viewState.activeTab !== 'editor' && previewIsPlaying) {
    pausePreview('Playback paused while leaving the Highway tab.');
  }
  $: if (project.viewState.activeTab !== 'beats' && beatEditorIsPlaying) {
    audioPlayer?.pause();
    cancelBeatEditorAnimation();
    beatEditorIsPlaying = false;
  }
  $: if (project.viewState.activeTab !== 'beats' && tapEntryPhase !== 'idle') {
    stopTapEntry({
      applyTapSequence: tapEntryPhase === 'capturing',
      pauseAudio: tapEntryPhase === 'capturing',
      nextStatus: tapEntryPhase === 'count-in'
        ? 'Tap entry cancelled while leaving the Beat Editor.'
        : 'Tap entry stopped while leaving the Beat Editor.',
    });
  }
  $: if (previewCurrentTimeSec > previewDurationSec) {
    previewCurrentTimeSec = clampPreviewTimeSec(previewCurrentTimeSec);
    syncPreviewClockAnchor();
  }
  $: preferredExportContainer = getPreferredExportContainer(project.exportState.transparentBackground);
  $: exportCapabilityWarning = !preferredExportContainer
    ? 'This browser does not expose a supported MediaRecorder container for video export.'
    : project.exportState.transparentBackground && !preferredExportContainer.supportsAlpha
      ? `Transparent export is enabled, but ${preferredExportContainer.label} does not guarantee alpha preservation.`
      : '';
  $: if (exportPreviewTimeSec > getExportDurationSec()) {
    exportPreviewTimeSec = clampExportPreviewTimeSec(exportPreviewTimeSec);
  }
  $: if (exportPreviewCanvas && project.viewState.activeTab === 'export') {
    void renderExportPreviewFrame(exportPreviewCanvas);
  }
  $: visibleBeatPins = project.beatMap.beatPins.slice(0, 16);
  $: if (
    hasInitializedAutosave
    && !suppressAutosave
    && !isDraggingBeatPin
    && noteDragState === null
    && noteResizeState === null
    && noteBankPlacementState === null
  ) {
    queueAutosaveWrite();
  }
</script>

<svelte:head>
  <title>Boomwhacker Video Builder</title>
</svelte:head>

<div class="builder-shell">
  <input
    bind:this={audioInput}
    class="visually-hidden"
    type="file"
    accept="audio/*,.wav,.mp3,.m4a,.aac,.ogg"
    on:change={handleAudioInputChange}
  />
  <input
    bind:this={projectInput}
    class="visually-hidden"
    type="file"
    accept=".json,application/json"
    on:change={handleProjectInputChange}
  />
  <input
    bind:this={backgroundImageInput}
    class="visually-hidden"
    type="file"
    accept="image/*"
    on:change={handleBackgroundImageInputChange}
  />

  <header class="top-toolbar">
    <div class="top-toolbar__brand">
      <div class="top-toolbar__brand-row">
        <a
          class="top-toolbar__home-link"
          href={hubHref}
          aria-label="Return to the Music Learning Tools home page"
          title="Return to the Music Learning Tools home page"
        >
          <img src={homeIconHref} alt="" class="top-toolbar__home-icon" />
        </a>
        <p class="eyebrow">Boomwhacker Video Builder</p>
      </div>
      <p class="top-toolbar__meta">
        {#if project.audio}
          {project.metadata.title || 'Untitled Boomwhacker Video'} &middot; {formatSeconds(project.audio.durationSec)}
        {:else}
          {project.metadata.title || 'Untitled Boomwhacker Video'}
        {/if}
      </p>
    </div>

    <div class="top-toolbar__actions">
      <div class="action-row">
        <button type="button" class="action-button" disabled={Boolean(busyMessage)} on:click={createNewProject}>
          New
        </button>
        <button type="button" class="action-button action-button--primary" disabled={Boolean(busyMessage)} on:click={openSetupModal}>
          Upload Audio
        </button>
        <button type="button" class="action-button" disabled={Boolean(busyMessage)} on:click={saveProject}>
          Save
        </button>
        <button type="button" class="action-button" disabled={Boolean(busyMessage)} on:click={() => projectInput?.click()}>
          Load
        </button>
        <button type="button" class="action-button" class:is-active-toolbar={isSetupModalOpen} disabled={Boolean(busyMessage)} on:click={openSetupModal}>
          Setup
        </button>
        <button
          type="button"
          class="action-button"
          class:is-active-toolbar={project.viewState.activeTab === 'export'}
          disabled={Boolean(busyMessage)}
          on:click={() => setActiveTab(project.viewState.activeTab === 'export' ? 'editor' : 'export')}
        >
          Export
        </button>
      </div>
    </div>

    {#if project.viewState.activeTab === 'editor' || project.viewState.activeTab === 'beats'}
      <div class="top-toolbar__editor-bar" aria-label="Editor tools">
        <div class="mode-tabs">
          <button type="button" class="mode-tab" class:is-active={project.viewState.activeTab === 'editor'} on:click={() => setActiveTab('editor')}>
            Highway
          </button>
          <button type="button" class="mode-tab" class:is-active={project.viewState.activeTab === 'beats'} on:click={() => setActiveTab('beats')}>
            Beat Editor
          </button>
        </div>

        {#if project.viewState.activeTab === 'editor'}
          <div class="top-toolbar__editor-center">
            <div class="shape-tool-bank" role="group" aria-label="Generic highway shape tools">
              {#each noteShapeOptions as option}
                <button
                  type="button"
                  class="shape-tool-button"
                  class:is-active-shape-tool={activeNoteShape === option.shape}
                  title={option.label}
                  aria-label={`Select ${option.label} tool`}
                  on:click={() => {
                    activeNoteShape = option.shape;
                    setHighwayEditorTool('place');
                  }}
                  on:mousedown={(event) => startNoteBankPlacement(event, option.shape)}
                >
                  <span class={`shape-tool-button__glyph shape-${option.shape}`} aria-hidden="true">
                    {#if option.shape === 'circle'}
                      <svg class="token-glyph circle" viewBox="0 0 100 100" focusable="false">
                        <ellipse cx="50" cy="50" rx="44" ry="44" />
                      </svg>
                    {:else if option.shape === 'oval'}
                      <svg class="token-glyph oval" viewBox="0 0 100 160" preserveAspectRatio="none" focusable="false">
                        <ellipse cx="50" cy="80" rx="44" ry="70.4" />
                      </svg>
                    {:else}
                      <svg class="token-glyph diamond" viewBox="0 0 120 120" preserveAspectRatio="none" focusable="false">
                        <path d={SINGLE_SLOT_SIXTEENTH_HEX_PATH} />
                      </svg>
                    {/if}
                  </span>
                  <span class="visually-hidden">{option.label}</span>
                </button>
              {/each}
            </div>

            <div class="editor-tool-bank" role="group" aria-label="Highway edit tools">
              <button
                type="button"
                class="editor-tool-button editor-tool-button--lasso"
                class:is-selected-tool={highwayEditorTool === 'lasso'}
                title={highwayEditorTool === 'lasso' ? 'Return to note placement' : 'Lasso select'}
                aria-label={highwayEditorTool === 'lasso' ? 'Return to note placement' : 'Lasso select'}
                aria-pressed={highwayEditorTool === 'lasso'}
                on:click={toggleHighwayLassoTool}
              >
                <img src={studentNotationLassoIconHref} alt="" class="editor-tool-button__icon" />
                <span class="visually-hidden">Lasso select</span>
              </button>

              <button
                type="button"
                class="editor-tool-button editor-tool-button--eraser"
                class:is-selected-tool={highwayEditorTool === 'eraser'}
                class:is-erasing-active={highwayEraseState !== null || highwayTemporaryEraserActive}
                title={highwayEditorTool === 'eraser' ? 'Return to note placement' : 'Eraser'}
                aria-label={highwayEditorTool === 'eraser' ? 'Return to note placement' : 'Eraser'}
                aria-pressed={highwayEditorTool === 'eraser'}
                on:click={toggleHighwayEraserTool}
              >
                <img src={studentNotationEraserIconHref} alt="" class="editor-tool-button__icon" />
                <span class="visually-hidden">Eraser</span>
              </button>
            </div>
          </div>

          <div class="top-toolbar__editor-actions">
            <div class="preview-transport-controls" role="group" aria-label="Highway transport">
              <button
                type="button"
                class="preview-transport-button"
                disabled={previewDurationSec <= 0}
                title={previewIsPlaying ? 'Pause' : 'Play'}
                aria-label={previewIsPlaying ? 'Pause' : 'Play'}
                on:click={togglePreviewPlayback}
              >
                {#if previewIsPlaying}
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="5" y="4" width="5" height="16" rx="1.5" />
                    <rect x="14" y="4" width="5" height="16" rx="1.5" />
                  </svg>
                {:else}
                  <svg viewBox="0 0 512 512" aria-hidden="true">
                    <path d="M152 104L144 106L143 108L141 108L133 114L130 120L128 130L128 382L132 396L140 404L147 406L149 408L164 408L165 406L168 406L178 401L180 398L184 397L207 381L224 372L229 367L240 362L242 359L249 356L254 351L267 345L269 342L286 333L293 327L304 322L306 319L316 314L322 309L326 308L331 303L335 302L344 295L354 290L356 287L367 282L378 271L381 265L382 250L377 239L367 230L363 229L343 215L325 205L318 199L309 195L308 193L301 190L287 180L283 179L281 176L274 173L268 168L259 164L257 161L246 156L244 153L237 150L232 145L221 140L217 136L210 133L201 126L197 125L195 122L183 116L177 111L164 105Z" />
                  </svg>
                {/if}
              </button>
              <button
                type="button"
                class="preview-transport-button"
                disabled={previewDurationSec <= 0}
                title="Stop"
                aria-label="Stop"
                on:click={stopPreviewPlayback}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="5" y="5" width="14" height="14" rx="3" ry="3" />
                </svg>
              </button>
            </div>
            <div class="toggle-cluster" role="group" aria-label="Highway playback channels">
              <span class="toggle-cluster__label">Playback</span>
              <button
                type="button"
                class:active={project.previewState.playAudio}
                disabled={!audioPreviewUrl && !project.previewState.playAudio}
                on:click={togglePlaybackAudio}
              >
                Audio
              </button>
              <button
                type="button"
                class:active={project.previewState.playGrid}
                on:click={togglePlaybackGrid}
              >
                Grid
              </button>
            </div>
            <div class="preview-level-controls" role="group" aria-label="Highway playback levels">
              <label class="range-field preview-level-control">
                <span class="range-field__label">Source audio</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={project.previewState.audioVolume}
                  disabled={!audioPreviewUrl}
                  on:input={handlePreviewAudioVolumeInput}
                  on:change={handlePreviewAudioVolumeChange}
                />
                <strong>{formatVolumePercent(project.previewState.audioVolume)}</strong>
              </label>

              <label class="range-field preview-level-control">
                <span class="range-field__label">Canvas notes</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={project.previewState.synthVolume}
                  on:input={handlePreviewSynthVolumeInput}
                  on:change={handlePreviewSynthVolumeChange}
                />
                <strong>{formatVolumePercent(project.previewState.synthVolume)}</strong>
              </label>
            </div>
            <button type="button" class="ghost-button" disabled={Boolean(busyMessage)} on:click={loadDemoChart}>
              Demo chart
            </button>
          </div>
        {/if}
      </div>
    {/if}
  </header>

  <p class="visually-hidden" aria-live="polite">{busyMessage || statusMessage}</p>

  {#if isSetupModalOpen}
    <div class="modal-backdrop">
      <button type="button" class="modal-backdrop__dismiss" aria-label="Close setup modal" on:click={closeSetupModal}></button>
      <div
        class="modal-card"
        role="dialog"
        tabindex="-1"
        aria-modal="true"
        aria-labelledby="setup-modal-title"
      >
        <div class="panel__header">
          <p class="panel__eyebrow">Project Setup</p>
          <h2 id="setup-modal-title">Song + Grid Setup</h2>
        </div>

        <div class="export-grid">
          <label class="field">
            <span class="field__label">Project title</span>
            <input
              class="text-input"
              type="text"
              value={setupModalTitle}
              on:input={handleSetupTitleInput}
            />
          </label>

          <div class="field">
            <span class="field__label">Audio file</span>
            <div class="modal-audio-box">
              <strong>{pendingSetupAudioFile?.name ?? project.audio?.originalFileName ?? 'No audio selected yet'}</strong>
              <button type="button" class="action-button action-button--small" disabled={Boolean(busyMessage)} on:click={promptSetupAudioSelection}>
                {pendingSetupAudioFile || project.audio ? 'Choose different audio' : 'Choose audio file'}
              </button>
            </div>
          </div>
        </div>

        <div class="panel__subsection">
          <p class="panel__eyebrow">Global Grouping</p>
          <div class="toggle-cluster" role="group" aria-label="Setup grouping">
            <span class="toggle-cluster__label">Subdivision feel</span>
            <button type="button" class:active={setupModalGrouping === 2} on:click={() => (setupModalGrouping = 2)}>2-based</button>
            <button type="button" class:active={setupModalGrouping === 3} on:click={() => (setupModalGrouping = 3)}>3-based</button>
          </div>
        </div>

        <div class="panel__subsection">
          <p class="panel__eyebrow">Starting Beat Map</p>
          <div class="toggle-cluster" role="group" aria-label="Beat-map import mode">
            <span class="toggle-cluster__label">First pass</span>
            <button type="button" class:active={setupModalBeatMapMode === 'tap'} on:click={() => (setupModalBeatMapMode = 'tap')}>
              Tap beat map
            </button>
            <button type="button" class:active={setupModalBeatMapMode === 'auto'} on:click={() => (setupModalBeatMapMode = 'auto')}>
              Auto-suggest beats
            </button>
          </div>
          <p class="panel__hint">
            Tap mode opens the Beat Editor with empty pins so you can tap along with playback. Auto-suggest uses the browser beat analyzer as a rough starting point.
          </p>
        </div>

        <p class="panel__hint">
          The project title auto-fills from the selected audio file unless you override it. Confirm here to apply the title, grouping, and beat-map starting mode.
        </p>

        <div class="modal-card__actions">
          <button type="button" class="ghost-button" on:click={closeSetupModal}>Cancel</button>
          <button type="button" class="action-button action-button--primary" disabled={Boolean(busyMessage)} on:click={() => void applySetupModal()}>
            {pendingSetupAudioFile ? 'Import Audio' : 'Apply Setup'}
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if isGroupingModalOpen}
    <div class="modal-backdrop">
      <button type="button" class="modal-backdrop__dismiss" aria-label="Close grouping modal" on:click={closeGroupingModal}></button>
      <div
        class="modal-card"
        role="dialog"
        tabindex="-1"
        aria-modal="true"
        aria-labelledby="grouping-modal-title"
      >
        <div class="panel__header">
          <p class="panel__eyebrow">Macrobeat Grouping</p>
          <h2 id="grouping-modal-title">Global 2-Based / 3-Based Mode</h2>
        </div>

        <div class="summary-grid summary-grid--editor-note">
          <div>
            <span>Current default</span>
            <strong>{formatGroupingLabel(project.grid.defaultMacrobeatGrouping)}</strong>
          </div>
          <div>
            <span>Derived beats</span>
            <strong>{timing.beatSpans.length}</strong>
          </div>
          <div>
            <span>Preview effect</span>
            <strong>Guides + slot resolution</strong>
          </div>
        </div>

        <div class="panel__subsection">
          <p class="panel__eyebrow">Apply to Entire Grid</p>
          <div class="toggle-cluster" role="group" aria-label="Macrobeat grouping">
            <span class="toggle-cluster__label">Subdivision feel</span>
            <button type="button" class:active={groupingModalSelection === 2} on:click={() => (groupingModalSelection = 2)}>2-based</button>
            <button type="button" class:active={groupingModalSelection === 3} on:click={() => (groupingModalSelection = 3)}>3-based</button>
          </div>
        </div>

        <p class="panel__hint">
          Applying this modal resets any stored local beat overrides so every beat follows the same grouping again.
        </p>

        <div class="modal-card__actions">
          <button type="button" class="ghost-button" on:click={closeGroupingModal}>Cancel</button>
          <button type="button" class="action-button action-button--primary" on:click={applyGroupingModal}>
            Apply to all beats
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if autosaveRecoveryState}
    <div class="banner banner--warning banner--recovery" role="status">
      <div class="banner__content">
        <strong>Recovered autosave{#if autosaveRecoveryState.savedAtIso} from {formatTimestampLabel(autosaveRecoveryState.savedAtIso)}{/if}</strong>
        <span>
          Working copy: {autosaveRecoveryState.title}.
          {#if autosaveRecoveryState.requiresAudioReattach}
            Reattach {autosaveRecoveryState.audioFileName ?? 'the source audio'} to restore the waveform and audio preview.
          {/if}
        </span>
      </div>
      <div class="banner__actions">
        {#if autosaveRecoveryState.requiresAudioReattach}
          <button
            type="button"
            class="ghost-button"
            disabled={Boolean(busyMessage)}
            on:click={promptAudioReattachSelection}
          >
            Reattach audio
          </button>
        {/if}
        <button type="button" class="ghost-button" on:click={dismissAutosaveRecoveryBanner}>Dismiss</button>
        <button
          type="button"
          class="ghost-button"
          on:click={() => clearAutosaveRecoveryCopy('Cleared the local recovery snapshot for this browser.')}
        >
          Clear recovery copy
        </button>
      </div>
    </div>
  {/if}

  {#if errorMessage}
    <p class="banner banner--error">{errorMessage}</p>
  {/if}

  {#if project.viewState.activeTab === 'setup'}
  <section class="workspace">
    <article class="panel">
      <div class="panel__header">
        <p class="panel__eyebrow">Project Setup</p>
        <h2>Song File + Save</h2>
      </div>

      <label class="field">
        <span class="field__label">Project title</span>
        <input
          class="text-input"
          type="text"
          value={project.metadata.title}
          on:change={(event) => updateProjectTitle((event.currentTarget as HTMLInputElement).value)}
        />
      </label>

      <div class="summary-grid">
        <div>
          <span>Audio</span>
          <strong>{project.audio?.originalFileName ?? 'None attached'}</strong>
        </div>
        <div>
          <span>Duration</span>
          <strong>{project.audio ? formatSeconds(project.audio.durationSec) : 'n/a'}</strong>
        </div>
        <div>
          <span>Storage</span>
          <strong>{project.audio?.storageStrategy ?? 'n/a'}</strong>
        </div>
        <div>
          <span>Transpose</span>
          <strong>{formatTransposeSummary(project.audioProcessing.transposeSemitones)}</strong>
        </div>
        <div>
          <span>Updated</span>
          <strong>{new Date(project.metadata.updatedAtIso).toLocaleString()}</strong>
        </div>
      </div>

      <p class="panel__hint">
        Autosave keeps a recovery copy in local storage without the embedded audio payload, so a recovered project may require reattaching the source file for waveform and preview work.
      </p>

      {#if needsAudioReattach()}
        <div class="action-row">
          <button
            type="button"
            class="action-button action-button--small"
            disabled={Boolean(busyMessage)}
            on:click={promptAudioReattachSelection}
          >
            Reattach source audio
          </button>
        </div>
      {/if}

      <div class="panel__subsection">
        <p class="panel__eyebrow">Shared Packages</p>
        <ul class="compact-list compact-list--tight">
          {#each reuseHighlights as item}
            <li>{item}</li>
          {/each}
        </ul>
      </div>
    </article>

    <article class="panel">
      <div class="panel__header">
        <p class="panel__eyebrow">Audio Setup</p>
        <h2>Audio + Beat Map</h2>
      </div>

      {#if waveformPeaks.length > 0}
        <div class="waveform-card">
          <button type="button" class="waveform-card__viewport" on:click={handleWaveformClick}>
            <div class="waveform-bars" style={`--waveform-bar-count:${waveformPeaks.length};`}>
              {#each waveformPeaks as peak}
                <span class="waveform-bars__bar" style={`height:${Math.max(8, peak * 100)}%;`}></span>
              {/each}
            </div>

            <div class="waveform-pins" aria-hidden="true">
              {#each project.beatMap.beatPins as beatPin (beatPin.id)}
                <span
                  class="waveform-pin"
                  class:is-downbeat={beatPin.isDownbeat}
                  style={beatPinStyle(beatPin.timeSec)}
                ></span>
              {/each}
            </div>
          </button>

          <div class="waveform-card__footer">
            <span>Click the waveform to add a beat pin.</span>
          </div>
        </div>

        {#if audioPreviewUrl}
          <audio bind:this={setupAudioPreviewPlayer} class="audio-player" controls preload="metadata" src={audioPreviewUrl}></audio>
        {/if}
      {:else}
        <div class="empty-state">
          <p>Open the setup dialog to choose local audio, set the project title, and pick the default 2-based or 3-based grouping.</p>
          <button type="button" class="action-button action-button--primary" disabled={Boolean(busyMessage)} on:click={openSetupModal}>
            Open setup
          </button>
        </div>
      {/if}

      <div class="panel__subsection">
        <p class="panel__eyebrow">Audio Key</p>
        <h2>Transpose to C</h2>

        <div class="summary-grid summary-grid--editor-note">
          <div>
            <span>Preview audio</span>
            <strong>{project.audioProcessing.transposeSemitones === 0 ? 'Original upload' : `Transposed ${formatSignedSemitones(project.audioProcessing.transposeSemitones)}`}</strong>
          </div>
          <div>
            <span>Target</span>
            <strong>C major Boomwhackers</strong>
          </div>
        </div>

        <div class="export-grid">
          <label class="field">
            <span class="field__label">Source tonic helper</span>
            <select class="text-input" bind:value={transposeSourceTonicLabel} disabled={Boolean(busyMessage)}>
              {#each SOURCE_TONIC_OPTIONS as option}
                <option value={option.label}>{option.label}</option>
              {/each}
            </select>
          </label>

          <label class="field">
            <span class="field__label">Transpose semitones</span>
            <input
              class="text-input"
              type="number"
              min={TRANSPOSE_MIN_SEMITONES}
              max={TRANSPOSE_MAX_SEMITONES}
              step="1"
              value={project.audioProcessing.transposeSemitones}
              disabled={Boolean(busyMessage)}
              on:change={(event) => void setAudioTransposeSemitones(Number((event.currentTarget as HTMLInputElement).value))}
            />
          </label>
        </div>

        <div class="action-row action-row--stack">
          <button type="button" class="action-button action-button--small" disabled={Boolean(busyMessage)} on:click={applyClosestTransposeToC}>
            Set closest shift to C
          </button>
          <button
            type="button"
            class="action-button action-button--small"
            disabled={Boolean(busyMessage)}
            on:click={() => void setAudioTransposeSemitones(project.audioProcessing.transposeSemitones - 1)}
          >
            Down 1
          </button>
          <button
            type="button"
            class="action-button action-button--small"
            disabled={Boolean(busyMessage)}
            on:click={() => void setAudioTransposeSemitones(0)}
          >
            Reset
          </button>
          <button
            type="button"
            class="action-button action-button--small"
            disabled={Boolean(busyMessage)}
            on:click={() => void setAudioTransposeSemitones(project.audioProcessing.transposeSemitones + 1)}
          >
            Up 1
          </button>
        </div>

        <p class="panel__hint">
          Pitch shifting preserves duration so the beat pins stay aligned. Use the helper to jump from a known tonic into C, then fine-tune with the semitone control if needed.
        </p>
      </div>

      <div class="panel__subsection">
        <p class="panel__eyebrow">Project Data</p>
        <ul class="compact-list compact-list--tight">
          {#each newModules as item}
            <li>{item}</li>
          {/each}
        </ul>
      </div>
    </article>
  </section>

  <section class="workspace">
    <article class="panel">
      <div class="panel__header">
        <p class="panel__eyebrow">Beat Editor</p>
        <h2>Beat Pins</h2>
      </div>

      {#if visibleBeatPins.length > 0}
        <div class="beat-table">
          <div class="beat-table__head">Beat</div>
          <div class="beat-table__head">Time</div>
          <div class="beat-table__head">Downbeat</div>
          <div class="beat-table__head">Action</div>

          {#each visibleBeatPins as beatPin, beatIndex (beatPin.id)}
            <div class="beat-table__cell">{beatIndex + 1}</div>
            <div class="beat-table__cell">{formatSeconds(beatPin.timeSec)}</div>
            <div class="beat-table__cell">
              <label class="checkbox checkbox--table">
                <input
                  type="checkbox"
                  checked={beatPin.isDownbeat}
                  on:change={(event) => toggleBeatPinDownbeat(beatPin.id, (event.currentTarget as HTMLInputElement).checked)}
                />
                <span>Mark</span>
              </label>
            </div>
            <div class="beat-table__cell">
              <button type="button" class="ghost-button" on:click={() => deleteBeatPin(beatPin.id)}>Delete</button>
            </div>
          {/each}
        </div>

        {#if project.beatMap.beatPins.length > visibleBeatPins.length}
          <p class="panel__hint">
            Showing the first {visibleBeatPins.length} beat pins out of {project.beatMap.beatPins.length}.
          </p>
        {/if}
      {:else}
        <div class="empty-state empty-state--compact">
          <p>No beat pins yet. Upload audio or click the waveform after decoding a file.</p>
        </div>
      {/if}
    </article>

    <article class="panel">
      <div class="panel__header">
        <p class="panel__eyebrow">Project Data</p>
        <h2>Saved Project Data</h2>
      </div>

      <dl class="schema-grid">
        <div>
          <dt>metadata</dt>
          <dd>`id`, `title`, `schemaVersion`, timestamps</dd>
        </div>
        <div>
          <dt>audio</dt>
          <dd>single local source, embedded for file save, stripped for autosave</dd>
        </div>
        <div>
          <dt>beatMap</dt>
          <dd>`beatPins[]` with confidence + downbeat flag</dd>
        </div>
        <div>
          <dt>grid</dt>
          <dd>default grouping plus per-beat local overrides</dd>
        </div>
        <div>
          <dt>notes</dt>
          <dd>row + inclusive `startSlotIndex` / `endSlotIndex`</dd>
        </div>
        <div>
          <dt>exportState</dt>
          <dd>HD / 30 fps, lead-in, title card, background, synth-audio flag</dd>
        </div>
      </dl>
    </article>
  </section>
  {/if}

  {#if project.viewState.activeTab === 'beats'}
    <section class="workspace workspace--beat-editor">
      <article class="panel panel--beat-editor">
        <div class="panel__header">
          <p class="panel__eyebrow">Beat Editor</p>
          <h2>Waveform Timing View</h2>
        </div>

        {#if !project.audio}
          <div class="beat-editor-toolbar">
            <div class="blank-highway-builder">
              <label class="field blank-highway-builder__field">
                <span class="field__label">Blank BPM</span>
                <input
                  class="text-input"
                  type="number"
                  min={BLANK_HIGHWAY_MIN_BPM}
                  max={BLANK_HIGHWAY_MAX_BPM}
                  step="1"
                  value={blankHighwayBpm}
                  on:change={(event) => {
                    blankHighwayBpm = clampBlankHighwayBpm(Number((event.currentTarget as HTMLInputElement).value));
                  }}
                />
              </label>

              <label class="field blank-highway-builder__field">
                <span class="field__label">2-based beats</span>
                <input
                  class="text-input"
                  type="number"
                  min={BLANK_HIGHWAY_MIN_BEAT_COUNT}
                  max={BLANK_HIGHWAY_MAX_BEAT_COUNT}
                  step="1"
                  value={blankHighwayBeatCount}
                  on:change={(event) => {
                    blankHighwayBeatCount = clampBlankHighwayBeatCount(Number((event.currentTarget as HTMLInputElement).value));
                  }}
                />
              </label>

              <button
                type="button"
                class="action-button action-button--primary"
                disabled={Boolean(busyMessage)}
                on:click={generateBlankHighway}
              >
                Generate blank highway
              </button>

              <p class="blank-highway-builder__hint">
                Builds a fresh 2-based beat map with no notes or annotations, then opens the Highway editor.
              </p>
            </div>
          </div>
        {/if}

        {#if canRenderBeatEditorTimeline}
          <div class="beat-editor">
            <div
              bind:this={detailWaveformViewport}
              class="beat-editor__viewport"
              on:wheel={handleTimelineWheel}
            >
              <div class="beat-editor__timeline-wrap" style={`width:${Math.max(100, project.viewState.zoom * 100)}%;`}>
                <div
                  bind:this={beatEditorTimeline}
                  class="beat-editor__timeline"
                  role="button"
                  tabindex="0"
                  aria-label="Detailed beat timeline"
                  style={`height:${project.viewState.waveformHeight}px;`}
                  on:click={handleBeatEditorTimelineClick}
                  on:keydown={handleBeatEditorTimelineKeyDown}
                >
                  {#if waveformPeaks.length > 0}
                    <div class="waveform-bars beat-editor__bars" style={`--waveform-bar-count:${waveformPeaks.length};`}>
                      {#each waveformPeaks as peak}
                        <span class="waveform-bars__bar" style={`height:${Math.max(8, peak * 100)}%;`}></span>
                      {/each}
                    </div>
                  {:else}
                    <div class="beat-editor__blank-surface" aria-hidden="true"></div>
                  {/if}

                  <div class="waveform-pins" aria-hidden="true">
                    {#each project.beatMap.beatPins as beatPin (beatPin.id)}
                      <button
                        type="button"
                        class="beat-editor__pin"
                        class:is-selected={selectedBeatPinId === beatPin.id}
                        class:is-downbeat={beatPin.isDownbeat}
                        style={beatPinStyle(beatPin.timeSec)}
                        on:click|stopPropagation={() => selectBeatPin(beatPin.id)}
                        on:mousedown={(event) => startBeatPinDrag(event, beatPin.id)}
                        aria-label={`Beat pin at ${formatSeconds(beatPin.timeSec)}`}
                      ></button>
                    {/each}

                    {#each tapEntryPreviewPins as previewPin (previewPin.id)}
                      <span
                        class="beat-editor__pin beat-editor__pin--pending"
                        style={beatPinStyle(previewPin.timeSec)}
                      ></span>
                    {/each}
                  </div>

                  <span
                    class="waveform-playhead waveform-playhead--detail"
                    style={waveformPlayheadStyle(beatEditorCurrentTimeSec, waveformDurationSec, Boolean(audioPreviewUrl))}
                    aria-hidden="true"
                  >
                    <span class="waveform-playhead__cap"></span>
                  </span>

                  {#if tapEntryPhase !== 'idle'}
                    <div
                      class="tap-entry-overlay"
                      class:is-live={tapEntryPhase === 'capturing'}
                      aria-live="polite"
                    >
                      <p class="tap-entry-overlay__eyebrow">
                        {tapEntryPhase === 'count-in' ? 'Tap entry starts in' : 'Tap entry live'}
                      </p>

                      {#if tapEntryPhase === 'count-in'}
                        <div class="tap-entry-overlay__countdown">
                          <strong>{tapEntryCountInBeatsRemaining}</strong>
                          <span>{formatTempo(getTapEntryTempoBpm())}</span>
                        </div>

                        <div class="tap-entry-overlay__steps" aria-hidden="true">
                          {#each TAP_ENTRY_COUNT_IN_STEPS as stepIndex}
                            <span
                              class="tap-entry-overlay__step"
                              class:is-complete={stepIndex < TAP_ENTRY_COUNT_IN_BEATS - tapEntryCountInBeatsRemaining}
                              class:is-active={stepIndex === TAP_ENTRY_COUNT_IN_BEATS - tapEntryCountInBeatsRemaining}
                            ></span>
                          {/each}
                        </div>

                        <span class="tap-entry-overlay__progress" style={getTapEntryCountInProgressStyle(tapEntryCountInBeatProgress)}></span>
                      {:else}
                        <div class="tap-entry-overlay__live-copy">
                          <strong>Press Space on each beat</strong>
                          <span>{tapBeatTimesSec.length} taps captured</span>
                        </div>
                      {/if}
                    </div>
                  {/if}
                </div>
              </div>
            </div>

            {#if audioPreviewUrl}
              <audio
                bind:this={audioPlayer}
                class="visually-hidden"
                preload="metadata"
                src={audioPreviewUrl}
                on:play={handleBeatEditorAudioPlay}
                on:pause={handleBeatEditorAudioPause}
                on:timeupdate={handleBeatEditorAudioTimeUpdate}
                on:ended={handleBeatEditorAudioEnded}
                on:seeked={handleBeatEditorAudioSeeked}
                on:loadedmetadata={handleBeatEditorAudioLoadedMetadata}
              ></audio>

              <div class="beat-editor__transport">
                <div class="beat-editor__transport-actions">
                  <button
                    type="button"
                    class="action-button action-button--small"
                    disabled={Boolean(busyMessage) || tapEntryPhase !== 'idle'}
                    on:click={() => void toggleBeatEditorPlayback()}
                  >
                    {beatEditorIsPlaying ? 'Pause' : 'Play'}
                  </button>
                  <button
                    type="button"
                    class:action-button--primary={tapEntryPhase === 'idle'}
                    class="action-button action-button--small"
                    disabled={Boolean(busyMessage)}
                    on:click={toggleTapEntry}
                  >
                    {tapEntryPhase === 'count-in'
                      ? 'Cancel Count-In'
                      : tapEntryPhase === 'capturing'
                        ? 'Stop Tap Entry'
                        : 'Begin Tap Entry'}
                  </button>
                </div>
                <strong>{formatSeconds(beatEditorCurrentTimeSec)} / {formatSeconds(waveformDurationSec)}</strong>
              </div>
            {:else if timing.totalSlotCount > 0}
              <p class="panel__hint">
                No source audio is attached. This timing map is driven entirely by generated beat pins.
              </p>
            {/if}
          </div>
        {:else}
          <div class="empty-state empty-state--compact">
            <p>Upload audio from the top toolbar or use the blank-highway generator above to create a timing map without audio.</p>
          </div>
        {/if}

        <div class="panel__subsection">
          <div class="subpanel-heading">
            <div>
              <p class="panel__eyebrow">Beat Editor</p>
              <h3>Tap Entry</h3>
            </div>
          </div>

          <div class="action-row action-row--stack">
            <button type="button" class="action-button action-button--primary" disabled={tapEntryPhase !== 'idle'} on:click={recordBeatTap}>Tap beat</button>
            <button type="button" class="action-button" disabled={tapEntryPhase !== 'idle' || tapBeatTimesSec.length < 2} on:click={() => applyTapBeatSequence()}>Use taps as beat map</button>
            <button type="button" class="ghost-button" disabled={tapEntryPhase !== 'idle' || tapBeatTimesSec.length === 0} on:click={clearTapBeatSequence}>Clear taps</button>
          </div>

          {#if tapBeatTimesSec.length > 0}
            <div class="tap-list">
              {#each tapBeatTimesSec as timeSec, tapIndex}
                <span class="tap-list__item">#{tapIndex + 1} {formatSeconds(timeSec)}</span>
              {/each}
            </div>
          {:else}
            <p class="panel__hint">
              Use Begin Tap Entry for a 4-beat visual count-in, then tap Space while playback runs. Manual taps here still work when tap entry is idle.
            </p>
          {/if}
        </div>
      </article>
    </section>
  {/if}

  {#if project.viewState.activeTab === 'editor'}
  <section class="workspace editor-preview-workspace">
    <article class="panel panel--highway">
      {#if audioPreviewUrl}
        <audio
          bind:this={previewAudioPlayer}
          class="visually-hidden"
          preload="metadata"
          src={audioPreviewUrl}
          on:ended={handlePreviewAudioEnded}
        ></audio>
      {/if}

      <div class="highway-shell" class:is-dimmed={isFreshBlankProject()}>
        {#if highwayZoomPreview}
          <div class="highway-shell__zoom-preview" aria-live="polite">
            Zoom {highwayZoomPreview}
          </div>
        {/if}
        <div class="highway">
          <div class="highway__labels" style={`--lane-height:${getEditorLaneHeightPx()}px;`}>
            {#each VISUAL_BOOMWHACKER_LANES as lane}
              <div class="highway__label">
                <span class={laneClass(lane.marker)}>{lane.label}</span>
              </div>
            {/each}
          </div>

          <div class="highway__viewport-shell">
            <div
              bind:this={editorHighwayViewport}
              bind:clientWidth={editorHighwayViewportWidthPx}
              class="highway__viewport highway__viewport--editor"
              class:is-erasing={highwayEditorTool === 'eraser' || highwayTemporaryEraserActive || highwayEraseState !== null}
              on:scroll={handleEditorHighwayViewportScroll}
              on:wheel={handleTimelineWheel}
            >
              <div
                bind:this={editorHighwayStage}
                class="highway__stage highway__stage--editor"
                role="button"
                tabindex="0"
                aria-label="Editable boomwhacker note highway"
                style={`height:${BOOMWHACKER_LANES.length * getEditorLaneHeightPx()}px;width:${editorHighwayStageWidthPx}px;`}
                on:mousedown={handleHighwayStageMouseDown}
                on:mousedown={startNoteBoxSelection}
                on:click={handleHighwayStageClick}
                on:contextmenu={handleHighwayStageContextMenu}
                on:mousemove={handleHighwayStageMouseMove}
                on:mouseleave={handleHighwayStageMouseLeave}
                on:keydown={handleHighwayStageKeyDown}
              >
                {#each VISUAL_BOOMWHACKER_LANES as lane}
                  <div
                    class="highway__band"
                    class:is-placement-target={activeHighwayPlacementPreview?.row === lane.row}
                    style={`top:${getVisualLaneRow(lane.row) * getEditorLaneHeightPx()}px;height:${getEditorLaneHeightPx()}px;`}
                    aria-hidden="true"
                  ></div>
                {/each}

                {#each highwayGuides as guide (guide.id)}
                  <span
                    class="highway__guide"
                    class:is-downbeat={shouldHighlightDownbeatGuide(guide)}
                    class:is-beat={shouldRenderGuideAsBeat(guide)}
                    style={highwayGuideStyle(guide.timeSec)}
                    aria-hidden="true"
                  ></span>
                {/each}

                {#each timedNotes as note (note.id)}
                  {@const noteLayout = getHighwayNoteLayoutForNote(note)}
                  {@const noteHitFlashOpacity = getHighwayNoteHitFlashOpacity(note)}
                  <button
                    type="button"
                    class="highway__note"
                    class:is-selected={selectedNoteIds.includes(note.id)}
                    class:is-crossing={project.previewState.playGrid && note.startTimeSec <= previewCurrentTimeSec && note.endTimeSec >= previewCurrentTimeSec}
                    class:is-hit-flashing={noteHitFlashOpacity > 0}
                    class:is-past={note.endTimeSec < previewCurrentTimeSec}
                    class:is-resize-hotspot={resizeHotspotNoteId === note.id}
                    class:shape-circle={note.shape === 'circle'}
                    class:shape-oval={note.shape === 'oval'}
                    class:shape-diamond={note.shape === 'diamond'}
                    data-note-id={note.id}
                    style={`${highwayNoteStyle(note)}background-color:${note.color};--note-hit-flash-opacity:${noteHitFlashOpacity};`}
                    title={`${note.noteId} - ${formatSeconds(note.startTimeSec)} to ${formatSeconds(note.endTimeSec)}`}
                    aria-label={`${note.noteId} note from ${formatSeconds(note.startTimeSec)} to ${formatSeconds(note.endTimeSec)}`}
                    on:click={(event) => handleNoteClick(event, note.id)}
                    on:mousedown={(event) => handleNotePointerDown(event, note)}
                    on:mousemove={(event) => updateNoteHoverCursor(event, note)}
                    on:mouseleave={() => clearNoteHoverCursor(note.id)}
                  >
                    {#if noteLayout.showLabel}
                      <span class="highway__note-label highway__note-label--live">
                        {note.label}
                      </span>
                    {/if}
                  </button>
                {/each}

                {#if activeHighwayPlacementPreview}
                  {@const previewLane = getLaneByRow(activeHighwayPlacementPreview.row)}
                  <span
                    class="highway__note highway__note--ghost"
                    class:shape-circle={activeHighwayPlacementPreview.shape === 'circle'}
                    class:shape-oval={activeHighwayPlacementPreview.shape === 'oval'}
                    class:shape-diamond={activeHighwayPlacementPreview.shape === 'diamond'}
                    style={`${getPlacementPreviewStyle(activeHighwayPlacementPreview)}--token-color:${previewLane?.color ?? '#ffffff'};`}
                    aria-hidden="true"
                  >
                    {#if activeHighwayPlacementPreview.shape === 'circle'}
                      <svg class="token-glyph circle" viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
                        <ellipse cx="50" cy="50" rx="50" ry="50" />
                      </svg>
                    {:else if activeHighwayPlacementPreview.shape === 'oval'}
                      <svg class="token-glyph oval" viewBox="0 0 100 160" preserveAspectRatio="none" focusable="false">
                        <ellipse cx="50" cy="80" rx="50" ry="80" />
                      </svg>
                    {:else}
                      <svg class="token-glyph diamond" viewBox="0 0 120 120" preserveAspectRatio="none" focusable="false">
                        <path d={SINGLE_SLOT_SIXTEENTH_HEX_PATH} />
                      </svg>
                    {/if}
                    <span class="highway__note-label">
                      {previewLane?.label ?? ''}
                    </span>
                  </span>
                {/if}

                {#if highwayEraserPreview}
                  <span
                    class="highway__eraser-preview"
                    style={getHighwayEraserPreviewStyle(highwayEraserPreview)}
                    aria-hidden="true"
                  ></span>
                {/if}

                {#if noteBoxSelectionState?.hasMoved}
                  <div
                    class="highway__selection-box"
                    style={getRelativeSelectionBoxStyle(noteBoxSelectionState)}
                    aria-hidden="true"
                  ></div>
                {/if}
              </div>
            </div>
            {#if activeJudgmentBeatSpan}
              <span
                class="highway__judgment-area highway__judgment-area--overlay"
                style={judgmentAreaStyle(activeJudgmentBeatSpan)}
                aria-hidden="true"
              ></span>
            {/if}
          </div>
        </div>

        {#if timing.totalSlotCount === 0 && !isFreshBlankProject()}
          <div class="highway-shell__bubble highway-shell__bubble--secondary">
            Start in the Beat Editor and tap along with playback to create the beat map.
          </div>
        {/if}
      </div>

      <div class="panel__subsection panel__subsection--waveform">
        {#if waveformPeaks.length > 0}
          <div class="compact-waveform">
            <div
              bind:this={compactWaveformViewport}
              class="compact-waveform__viewport"
              on:wheel={handleTimelineWheel}
            >
              <div class="beat-editor__timeline-wrap" style={`width:${Math.max(100, project.viewState.zoom * 100)}%;`}>
                <div
                  bind:this={beatEditorTimeline}
                  class="beat-editor__timeline beat-editor__timeline--compact"
                  role="button"
                  tabindex="0"
                  aria-label="Playback waveform transport"
                  style={`height:${COMPACT_WAVEFORM_HEIGHT_PX}px;`}
                  on:click={handleCompactWaveformClick}
                  on:keydown={handleCompactWaveformKeyDown}
                >
                  <div class="waveform-bars beat-editor__bars" style={`--waveform-bar-count:${waveformPeaks.length};`}>
                    {#each waveformPeaks as peak}
                      <span class="waveform-bars__bar" style={`height:${Math.max(8, peak * 100)}%;`}></span>
                    {/each}
                  </div>

                  <div class="waveform-pins" aria-hidden="true">
                    {#each project.beatMap.beatPins as beatPin (beatPin.id)}
                      <button
                        type="button"
                        class="beat-editor__pin beat-editor__pin--compact"
                        class:is-selected={selectedBeatPinId === beatPin.id}
                        class:is-downbeat={beatPin.isDownbeat}
                        style={beatPinStyle(beatPin.timeSec)}
                        on:click|stopPropagation={() => selectBeatPin(beatPin.id)}
                        on:mousedown={(event) => startBeatPinDrag(event, beatPin.id)}
                        aria-label={`Beat pin at ${formatSeconds(beatPin.timeSec)}`}
                      ></button>
                    {/each}
                  </div>

                  <button
                    type="button"
                    class="waveform-playhead waveform-playhead--preview"
                    class:is-scrubbing={previewScrubState !== null}
                    style={waveformPlayheadStyle(previewCurrentTimeSec, waveformDurationSec)}
                    aria-label={`Playback cursor at ${formatSeconds(previewCurrentTimeSec)}`}
                    title="Drag to scrub playback"
                    on:click|stopPropagation
                    on:pointerdown={startCompactWaveformScrub}
                    on:pointermove={updateCompactWaveformScrub}
                    on:pointerup={finishCompactWaveformScrub}
                    on:pointercancel={finishCompactWaveformScrub}
                  >
                    <span class="waveform-playhead__cap"></span>
                  </button>
                </div>
              </div>
            </div>

            <div class="compact-waveform__footer">
              <span class="compact-waveform__readout">
                {formatSeconds(previewCurrentTimeSec)} / {formatSeconds(previewDurationSec)}
              </span>
            </div>
          </div>
        {:else}
          {#if timing.totalSlotCount > 0}
            <div class="empty-state empty-state--compact">
              <p>This project is using a generated timing map without source audio. Open the detailed Beat Editor to inspect or adjust the beat pins.</p>
              <button type="button" class="ghost-button" on:click={() => setActiveTab('beats')}>Detailed beat editor</button>
            </div>
          {:else}
            <div class="empty-state empty-state--compact">
              <p>Upload audio to decode a waveform and generate a first beat-pin pass.</p>
            </div>
          {/if}
        {/if}
      </div>
    </article>
  </section>
  {/if}

  {#if project.viewState.activeTab === 'export'}
  <section class="workspace workspace--export">
    <article class="panel panel--wide">
      <div class="panel__header">
        <p class="panel__eyebrow">Deterministic Frame Renderer</p>
        <h2>Export Preview</h2>
      </div>

      <div class="preview-toolbar">
        <div class="action-row">
          <button type="button" class="action-button action-button--primary" disabled={getExportDurationSec() <= 0} on:click={() => (exportPreviewTimeSec = 0)}>
            First frame
          </button>
          <button type="button" class="action-button action-button--small" disabled={getExportDurationSec() <= 0} on:click={syncExportPreviewToHighway}>
            Use highway playhead
          </button>
          <button type="button" class="action-button action-button--small" disabled={getExportDurationSec() <= 0} on:click={() => (exportPreviewTimeSec = clampExportPreviewTimeSec(exportPreviewTimeSec - (1 / project.exportState.fps)))}>
            Prev frame
          </button>
          <button type="button" class="action-button action-button--small" disabled={getExportDurationSec() <= 0} on:click={() => (exportPreviewTimeSec = clampExportPreviewTimeSec(exportPreviewTimeSec + (1 / project.exportState.fps)))}>
            Next frame
          </button>
          <button type="button" class="action-button" disabled={getExportDurationSec() <= 0} on:click={saveExportFrameSnapshot}>
            Save PNG snapshot
          </button>
          <button
            type="button"
            class="action-button action-button--primary"
            disabled={getExportDurationSec() <= 0 || Boolean(busyMessage) || !preferredExportContainer}
            on:click={handleExportVideo}
          >
            Export video
          </button>
        </div>

        <label class="preview-scrubber">
          <span class="range-field__label">Export time</span>
          <input
            type="range"
            min="0"
            max={Math.max(0.01, getExportDurationSec())}
            step={1 / Math.max(1, project.exportState.fps)}
            value={exportPreviewTimeSec}
            on:input={(event) => (exportPreviewTimeSec = clampExportPreviewTimeSec(Number((event.currentTarget as HTMLInputElement).value)))}
          />
          <strong>{formatSeconds(exportPreviewTimeSec)} / {formatSeconds(getExportDurationSec())}</strong>
        </label>
      </div>

      <div class="summary-grid summary-grid--editor">
        <div>
          <span>Total frames</span>
          <strong>{Math.ceil(getExportDurationSec() * project.exportState.fps)}</strong>
        </div>
        <div>
          <span>Lead-in</span>
          <strong>{formatSeconds(project.exportState.leadInDurationSec)}</strong>
        </div>
        <div>
          <span>Background</span>
          <strong>{project.exportState.background.type}</strong>
        </div>
        <div>
          <span>Export audio</span>
          <strong>{project.exportState.includeSynthPlayback ? 'source + synth option enabled' : 'source-only export mix'}</strong>
        </div>
        <div>
          <span>Audio transpose</span>
          <strong>{formatTransposeSummary(project.audioProcessing.transposeSemitones)}</strong>
        </div>
        <div>
          <span>Recorder format</span>
          <strong>{preferredExportContainer?.label ?? 'Unavailable'}</strong>
        </div>
      </div>

      {#if exportRenderError}
        <p class="banner banner--error">{exportRenderError}</p>
      {/if}

      {#if exportCapabilityWarning}
        <p class="banner banner--warning">{exportCapabilityWarning}</p>
      {/if}

      <div class="export-preview-shell">
        <canvas bind:this={exportPreviewCanvas} class="export-preview-canvas"></canvas>
      </div>

      <p class="panel__hint">
        This canvas is rendered from deterministic frame-state inputs: export time, beat pins, slot-derived notes, lead-in, title card, and background settings. Video packaging uses the same renderer, preferring MP4 when the current browser exposes it and falling back to WebM otherwise.
      </p>
    </article>

    <article class="panel">
      <div class="panel__header">
        <p class="panel__eyebrow">Export Settings</p>
        <h2>Video + Background</h2>
      </div>

      <div class="summary-grid">
        <div>
          <span>Width</span>
          <strong>{project.exportState.width}px</strong>
        </div>
        <div>
          <span>Height</span>
          <strong>{project.exportState.height}px</strong>
        </div>
        <div>
          <span>FPS</span>
          <strong>{project.exportState.fps}</strong>
        </div>
        <div>
          <span>Transparent</span>
          <strong>{project.exportState.transparentBackground ? 'Yes' : 'No'}</strong>
        </div>
      </div>

      <div class="panel__subsection">
        <p class="panel__eyebrow">Video</p>
        <div class="export-grid">
          <label class="field">
            <span class="field__label">Width</span>
            <input
              class="text-input"
              type="number"
              min="320"
              step="10"
              value={project.exportState.width}
              on:change={(event) => updateExportState({ width: Math.max(320, Number((event.currentTarget as HTMLInputElement).value) || project.exportState.width) })}
            />
          </label>

          <label class="field">
            <span class="field__label">Height</span>
            <input
              class="text-input"
              type="number"
              min="180"
              step="10"
              value={project.exportState.height}
              on:change={(event) => updateExportState({ height: Math.max(180, Number((event.currentTarget as HTMLInputElement).value) || project.exportState.height) })}
            />
          </label>

          <label class="field">
            <span class="field__label">FPS</span>
            <input
              class="text-input"
              type="number"
              min="1"
              step="1"
              value={project.exportState.fps}
              on:change={(event) => updateExportState({ fps: Math.max(1, Number((event.currentTarget as HTMLInputElement).value) || project.exportState.fps) })}
            />
          </label>

          <label class="field">
            <span class="field__label">Lead-in (sec)</span>
            <input
              class="text-input"
              type="number"
              min="0"
              step="0.1"
              value={project.exportState.leadInDurationSec}
              on:change={(event) => updateExportState({ leadInDurationSec: Math.max(0, Number((event.currentTarget as HTMLInputElement).value) || 0) })}
            />
          </label>
        </div>

        <div class="action-row action-row--stack">
          <label class="checkbox">
            <input
              type="checkbox"
              checked={project.exportState.includeSynthPlayback}
              on:change={(event) => updateExportState({ includeSynthPlayback: (event.currentTarget as HTMLInputElement).checked }, (event.currentTarget as HTMLInputElement).checked ? 'Export synth-note playback enabled.' : 'Export synth-note playback disabled.')}
            />
            <span>Include triangle synth notes in export</span>
          </label>

          <label class="checkbox">
            <input
              type="checkbox"
              checked={project.exportState.transparentBackground}
              on:change={(event) => updateExportState({ transparentBackground: (event.currentTarget as HTMLInputElement).checked }, (event.currentTarget as HTMLInputElement).checked ? 'Transparent export background enabled.' : 'Transparent export background disabled.')}
            />
            <span>Transparent background when supported</span>
          </label>
        </div>
      </div>

      <div class="panel__subsection">
        <p class="panel__eyebrow">Title Card</p>
        <div class="action-row">
          <label class="checkbox">
            <input
              type="checkbox"
              checked={project.exportState.titleCard.enabled}
              on:change={(event) => updateExportTitleCard({ enabled: (event.currentTarget as HTMLInputElement).checked }, (event.currentTarget as HTMLInputElement).checked ? 'Title card enabled.' : 'Title card disabled.')}
            />
            <span>Show title card during lead-in</span>
          </label>
        </div>

        <label class="field">
          <span class="field__label">Title</span>
          <input
            class="text-input"
            type="text"
            value={project.exportState.titleCard.title}
            on:change={(event) => updateExportTitleCard({ title: (event.currentTarget as HTMLInputElement).value || project.metadata.title })}
          />
        </label>

        <label class="field">
          <span class="field__label">Subtitle</span>
          <input
            class="text-input"
            type="text"
            value={project.exportState.titleCard.subtitle ?? ''}
            on:change={(event) => updateExportTitleCard({ subtitle: (event.currentTarget as HTMLInputElement).value || undefined })}
          />
        </label>
      </div>

      <div class="panel__subsection">
        <p class="panel__eyebrow">Background</p>

        <div class="toggle-cluster" role="group" aria-label="Export background type">
          <span class="toggle-cluster__label">Background</span>
          <button type="button" class:active={project.exportState.background.type === 'solid'} on:click={() => setExportBackgroundType('solid')}>Solid</button>
          <button type="button" class:active={project.exportState.background.type === 'gradient'} on:click={() => setExportBackgroundType('gradient')}>Gradient</button>
          <button type="button" class:active={project.exportState.background.type === 'image'} on:click={() => setExportBackgroundType('image')}>Image</button>
        </div>

        {#if project.exportState.background.type === 'solid'}
          <label class="field">
            <span class="field__label">Color</span>
            <input
              class="color-input"
              type="color"
              value={project.exportState.background.color}
              on:input={(event) => updateExportBackgroundSolid((event.currentTarget as HTMLInputElement).value)}
            />
          </label>
        {/if}

        {#if project.exportState.background.type === 'gradient'}
          <div class="export-grid">
            <label class="field">
              <span class="field__label">Top color</span>
              <input
                class="color-input"
                type="color"
                value={project.exportState.background.topColor}
                on:input={(event) => updateExportBackgroundGradient({ topColor: (event.currentTarget as HTMLInputElement).value })}
              />
            </label>

            <label class="field">
              <span class="field__label">Bottom color</span>
              <input
                class="color-input"
                type="color"
                value={project.exportState.background.bottomColor}
                on:input={(event) => updateExportBackgroundGradient({ bottomColor: (event.currentTarget as HTMLInputElement).value })}
              />
            </label>
          </div>
        {/if}

        {#if project.exportState.background.type === 'image'}
          <div class="action-row">
            <button type="button" class="action-button action-button--small" on:click={() => backgroundImageInput?.click()}>
              Choose image
            </button>
            <button type="button" class="ghost-button" disabled={!project.exportState.background.imageDataUrl} on:click={clearExportBackgroundImage}>
              Clear image
            </button>
          </div>

          <div class="summary-grid summary-grid--editor-note">
            <div>
              <span>Image</span>
              <strong>{project.exportState.background.imageDataUrl ? 'Attached' : 'None selected'}</strong>
            </div>
            <div>
              <span>Fit</span>
              <strong>{project.exportState.background.fit}</strong>
            </div>
            <div>
              <span>Opacity</span>
              <strong>{Math.round(project.exportState.background.opacity * 100)}%</strong>
            </div>
          </div>

          <div class="export-grid">
            <label class="field">
              <span class="field__label">Fit</span>
              <select
                class="text-input"
                value={project.exportState.background.fit}
                on:change={(event) => updateExportBackgroundImage({ fit: ((event.currentTarget as HTMLSelectElement).value === 'contain' ? 'contain' : 'cover') })}
              >
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
              </select>
            </label>

            <label class="range-field">
              <span class="range-field__label">Opacity</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={project.exportState.background.opacity}
                on:input={(event) => updateExportBackgroundImage({ opacity: Number((event.currentTarget as HTMLInputElement).value) })}
              />
              <strong>{Math.round(project.exportState.background.opacity * 100)}%</strong>
            </label>
          </div>
        {/if}
      </div>
    </article>
  </section>
  {/if}

  {#if noteBankPlacementState && !noteBankPlacementState.preview}
    <div
      class="highway__cursor-ghost"
      style={`left:${noteBankPlacementState.currentClientX}px;top:${noteBankPlacementState.currentClientY}px;--token-color:#d9ebff;`}
      aria-hidden="true"
    >
      <div
        class="highway__note highway__note--ghost highway__note--cursor"
        class:shape-circle={noteBankPlacementState.shape === 'circle'}
        class:shape-oval={noteBankPlacementState.shape === 'oval'}
        class:shape-diamond={noteBankPlacementState.shape === 'diamond'}
      >
        {#if noteBankPlacementState.shape === 'circle'}
          <svg class="token-glyph circle" viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
            <ellipse cx="50" cy="50" rx="50" ry="50" />
          </svg>
        {:else if noteBankPlacementState.shape === 'oval'}
          <svg class="token-glyph oval" viewBox="0 0 100 160" preserveAspectRatio="none" focusable="false">
            <ellipse cx="50" cy="80" rx="50" ry="80" />
          </svg>
        {:else}
          <svg class="token-glyph diamond" viewBox="0 0 120 120" preserveAspectRatio="none" focusable="false">
            <path d={SINGLE_SLOT_SIXTEENTH_HEX_PATH} />
          </svg>
        {/if}
      </div>
    </div>
  {/if}
</div>
