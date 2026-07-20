<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { TempoControls } from '@mlt/tempo-controls-ui';
  import {
    BOOMWHACKER_LANES,
    clampNoteEndSlotIndex,
    createBoomwhackerVideoBuilderProject,
    createSampleBoomwhackerVideoBuilderProject,
    deriveGuideLines,
    deriveTimedNotes,
    deriveTimingModel,
    getDefaultSlotRangeForShape,
    getMinimumSlotSpanForShape,
    notesOverlap,
    parseBoomwhackerVideoBuilderProject,
    serializeBoomwhackerVideoBuilderProject,
    slotIndexToTimeSec,
    sortGridNotes,
    stampProjectUpdatedAt,
    type BoomwhackerGridNote,
    type BoomwhackerVideoBuilderProject,
    type BoomwhackerNoteShape,
    type DerivedBeatSpan,
    type MacrobeatGrouping,
    type SongTimingState,
    type TimedBoomwhackerNote,
  } from '@mlt/boomwhacker-video-builder-core';

  import {
    audioBufferToWavBlob,
    hydrateProjectAudio,
    hydrateProjectAudioFromBlob,
    importAudioFile,
    type ImportedAudioAsset,
  } from './browser/audio.js';
  import { renderTransposedAudioBuffer } from './browser/audioTransform.js';
  import {
    loadLocalProjectAudio,
    saveLocalProjectAudio,
  } from './browser/audioStore.js';
  import { readFileAsDataUrl, saveBlobFile, saveTextFile } from './browser/files.js';
  import { getExportStartTimeSec, getExportTotalDurationSec, renderExportFrame } from './browser/exportRenderer.js';
  import { TrianglePreviewSynth } from './browser/previewSynth.js';
  import {
    exportProjectVideo,
    getPreferredExportContainer,
    type ExportVideoContainer,
  } from './browser/videoExport.js';
  import HighwayNoteGlyph from './HighwayNoteGlyph.svelte';
  import {
    getActiveHighwayBeatSpan,
    getHighwayJudgmentAreaWidthPx,
    getHighwayNoteLayout,
    getVisibleHighwayGuides,
    shouldRenderGuideAsBeat,
    type HighwayNoteLayout,
  } from './highwayLayout.js';

  type NoteShape = BoomwhackerNoteShape;
  type HighwayEditorTool = 'place' | 'lasso' | 'eraser';

  type EditorHighwayLayoutContext = {
    laneHeightPx: number;
    pixelsPerSecond: number;
    leadingPaddingPx: number;
    previewStartTimeSec: number;
  };

  type EditorHistoryEntry = {
    project: BoomwhackerVideoBuilderProject;
    selectedNoteIds: string[];
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

  type NoteResizeState = {
    historyEntry: EditorHistoryEntry;
    noteId: string;
    stageRect: DOMRect;
    currentEndSlotIndex: number;
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

  type HighwayPlacementPreview = {
    shape: NoteShape;
    row: number;
    startSlotIndex: number;
    endSlotIndex: number;
  };

  type HighwayEraserPreview = {
    row: number;
    startSlotIndex: number;
    endSlotIndex: number;
  };

  type HighwayPlaybackHighlight = {
    id: string;
    left: number;
    top: number;
    width: number;
    height: number;
  };

  type CountInBeatEvent = {
    id: string;
    timeSec: number;
    remainingCount: number | null;
    isAccent: boolean;
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

  const noteShapeOptions: Array<{
    shape: NoteShape;
    label: string;
    shortcut: '1' | '2' | '3';
  }> = [
    { shape: 'circle', label: 'Circle', shortcut: '1' },
    { shape: 'oval', label: 'Oval', shortcut: '2' },
    { shape: 'diamond', label: 'Sixteenth', shortcut: '3' },
  ];

  const exportAspectPresets = [
    { label: '16:9', width: 1920, height: 1080 },
    { label: '9:16', width: 1080, height: 1920 },
    { label: '1:1', width: 1080, height: 1080 },
    { label: '4:5', width: 1080, height: 1350 },
    { label: '4:3', width: 1440, height: 1080 },
  ];

  const VISUAL_BOOMWHACKER_LANES = [...BOOMWHACKER_LANES].reverse();
  const AUTOSAVE_STORAGE_KEY = 'mlt/boomwhacker-video-builder/autosave-v2';
  const MIN_TIMELINE_ZOOM = 0.01;
  const MAX_TIMELINE_ZOOM = 8;
  const EDITOR_BASE_LANE_MIN_PX = 42;
  const EDITOR_BASE_LANE_MAX_PX = 78;
  const EDITOR_LANE_MIN_PX = 2;
  const EDITOR_LANE_MAX_PX = 220;
  const PLAYBACK_HIGHWAY_VERTICAL_CHROME_PX = 24;
  const COMPACT_WAVEFORM_HEIGHT_PX = 120;
  const CIRCLE_RESIZE_HOTZONE_PX = 18;
  const HISTORY_LIMIT = 80;
  const TEMPO_MIN_BPM = 20;
  const TEMPO_MAX_BPM = 320;
  const BEAT_COUNT_MIN = 1;
  const BEAT_COUNT_MAX = 1024;
  const COUNT_IN_BEATS_MIN = 0;
  const COUNT_IN_BEATS_MAX = 32;
  const TRANSPOSE_MIN_SEMITONES = -12;
  const TRANSPOSE_MAX_SEMITONES = 12;
  const TIME_SIGNATURE_NUMERATOR_MIN = 1;
  const TIME_SIGNATURE_NUMERATOR_MAX = 16;
  const TIME_SIGNATURE_DENOMINATORS = [2, 4, 8, 16] as const;
  const TEMPO_SHORTCUT_VALUES = [80, 90, 100, 110, 120, 140] as const;
  const SIMPLE_NOTATION_DEFAULT_ROOT_MIDI = 60;
  const hubHref = '../';
  const homeIconHref = new URL('../../simple-notation-ui/src/assets/home-icon.svg', import.meta.url).href;
  const volumeIconHref = new URL('../../simple-notation-ui/src/assets/volume.svg', import.meta.url).href;
  const studentNotationSettingsIconHref = new URL('../../student-notation-ui/public/assets/icons/settings.svg', import.meta.url).href;
  const studentNotationNewPageIconHref = new URL('../../student-notation-ui/public/assets/icons/newPage.svg', import.meta.url).href;
  const studentNotationOpenIconHref = new URL('../../student-notation-ui/public/assets/icons/open.svg', import.meta.url).href;
  const studentNotationSaveAsIconHref = new URL('../../student-notation-ui/public/assets/icons/saveAs.svg', import.meta.url).href;
  const studentNotationPrintIconHref = new URL('../../student-notation-ui/public/assets/icons/print.svg', import.meta.url).href;
  const studentNotationLassoIconHref = new URL('../../student-notation-ui/public/assets/icons/lasso-tool.svg', import.meta.url).href;
  const studentNotationEraserIconHref = new URL('../../student-notation-ui/public/assets/icons/eraser.svg', import.meta.url).href;
  const studentNotationZoomInIconHref = new URL('../../student-notation-ui/public/assets/icons/zoomIn.svg', import.meta.url).href;
  const studentNotationZoomOutIconHref = new URL('../../student-notation-ui/public/assets/icons/zoomOut.svg', import.meta.url).href;

  let project = createBoomwhackerVideoBuilderProject();
  let audioInput: HTMLInputElement | null = null;
  let projectInput: HTMLInputElement | null = null;
  let backgroundImageInput: HTMLInputElement | null = null;
  let previewAudioPlayer: HTMLAudioElement | null = null;
  let compactWaveformViewport: HTMLDivElement | null = null;
  let projectMenuWrapper: HTMLDivElement | null = null;
  let volumeControlWrapper: HTMLDivElement | null = null;
  let editorHighwayViewport: HTMLDivElement | null = null;
  let editorHighwayStage: HTMLDivElement | null = null;
  let editorBaseLaneHeightPx = 54;
  let editorLaneHeightPx = 54;
  let editorHighwayViewportWidthPx = 920;
  let editorHighwayPixelsPerSecond = 72;
  let editorHighwayLeadingPaddingPx = 220;
  let editorHighwayTrailingPaddingPx = 700;
  let editorHighwayDurationSec = 0;
  let editorHighwayStageWidthPx = 920;
  let topToolbarHeightPx = 0;
  let exportPreviewCanvas: HTMLCanvasElement | null = null;
  let viewportHeightPx = 900;
  let sourceAudioBuffer: AudioBuffer | null = null;
  let decodedAudioBuffer: AudioBuffer | null = null;
  let renderedTransposeSemitones: number | null = null;
  let audioPresentationVersion = 0;
  let audioPreviewUrl: string | null = null;
  let waveformPeaks: number[] = [];
  let statusMessage = 'Set a tempo, place Boomwhacker notes, and preview the chart.';
  let errorMessage = '';
  let busyMessage = '';
  let projectMenuOpen = false;
  let volumePopupOpen = false;
  let isSetupModalOpen = false;
  let setupModalTitle = project.metadata.title;
  let setupModalTempoBpm = project.songTiming.tempoBpm;
  let setupModalFirstBeatOffsetSec = project.songTiming.firstBeatOffsetSec;
  let setupModalBeatCount = project.songTiming.beatCount;
  let setupModalCountInBeats = project.songTiming.countInBeats;
  let setupModalTimeSignatureNumerator = project.songTiming.timeSignatureNumerator;
  let setupModalTimeSignatureDenominator = project.songTiming.timeSignatureDenominator;
  let setupModalGrouping: MacrobeatGrouping = project.grid.defaultMacrobeatGrouping;
  let setupModalTitleTouched = false;
  let pendingSetupAudioFile: File | null = null;
  let activeNoteShape: NoteShape | null = 'circle';
  let activePlacementRow = BOOMWHACKER_LANES[0]?.row ?? 0;
  let selectedNoteIds: string[] = [];
  let clipboardNotes: BoomwhackerGridNote[] = [];
  let suppressNextNoteClick = false;
  let suppressNextSlotCellClick = false;
  let previewCurrentTimeSec = 0;
  let previewStartTimeSec = 0;
  let editorHighwayLayoutContext: EditorHighwayLayoutContext = {
    laneHeightPx: editorLaneHeightPx,
    pixelsPerSecond: editorHighwayPixelsPerSecond,
    leadingPaddingPx: editorHighwayLeadingPaddingPx,
    previewStartTimeSec,
  };
  let previewIsPlaying = false;
  let previewAnimationFrameId: number | null = null;
  let previewClockAnchorTimeSec = 0;
  let previewClockAnchorMs = 0;
  let previewDurationSec = 0;
  let waveformDurationSec = 0;
  let previewSynthCursorTimeSec = 0;
  let previewScrubState: PreviewScrubState | null = null;
  let exportPreviewTimeSec = 0;
  let exportRenderError = '';
  let exportCapabilityWarning = '';
  let preferredExportContainer: ExportVideoContainer | null = null;
  let undoHistory: EditorHistoryEntry[] = [];
  let redoHistory: EditorHistoryEntry[] = [];
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
  let activePlaybackHighlights: HighwayPlaybackHighlight[] = [];
  let removeHighwayEraseListeners: (() => void) | null = null;
  let resizeHotspotNoteId: string | null = null;
  let autosaveWriteTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let hasInitializedAutosave = false;
  let suppressAutosave = false;
  let hasPendingAutosaveWrite = false;
  let activeJudgmentBeatSpan: DerivedBeatSpan | null = null;
  let selectedBeatSpan: DerivedBeatSpan | null = null;
  let playbackStartBeatSpan: DerivedBeatSpan | null = null;
  let highwayZoomPreview = '';
  let highwayZoomPreviewTimeoutId: ReturnType<typeof setTimeout> | null = null;
  const previewSynth = new TrianglePreviewSynth();

  function clampTempoBpm(value: number): number {
    if (!Number.isFinite(value)) {
      return project.songTiming.tempoBpm;
    }
    return Math.max(TEMPO_MIN_BPM, Math.min(TEMPO_MAX_BPM, Math.round(value)));
  }

  function clampBeatCount(value: number): number {
    if (!Number.isFinite(value)) {
      return project.songTiming.beatCount;
    }
    return Math.max(BEAT_COUNT_MIN, Math.min(BEAT_COUNT_MAX, Math.trunc(value)));
  }

  function clampFirstBeatOffsetSec(value: number): number {
    if (!Number.isFinite(value)) {
      return project.songTiming.firstBeatOffsetSec;
    }
    return Math.max(0, Number(value.toFixed(3)));
  }

  function clampCountInBeats(value: number): number {
    if (!Number.isFinite(value)) {
      return project.songTiming.countInBeats;
    }
    return Math.max(COUNT_IN_BEATS_MIN, Math.min(COUNT_IN_BEATS_MAX, Math.round(value)));
  }

  function clampTimeSignatureNumerator(value: number): number {
    if (!Number.isFinite(value)) {
      return project.songTiming.timeSignatureNumerator;
    }
    return Math.max(TIME_SIGNATURE_NUMERATOR_MIN, Math.min(TIME_SIGNATURE_NUMERATOR_MAX, Math.round(value)));
  }

  function clampTimeSignatureDenominator(value: number): number {
    return TIME_SIGNATURE_DENOMINATORS.includes(value as (typeof TIME_SIGNATURE_DENOMINATORS)[number])
      ? value
      : project.songTiming.timeSignatureDenominator;
  }

  function clampTransposeSemitones(value: number): number {
    if (!Number.isFinite(value)) {
      return project.audioProcessing.transposeSemitones;
    }
    return Math.max(TRANSPOSE_MIN_SEMITONES, Math.min(TRANSPOSE_MAX_SEMITONES, Math.round(value)));
  }

  function formatSemitones(value: number): string {
    const semitones = clampTransposeSemitones(value);
    if (semitones === 0) {
      return '0 semitones';
    }
    return `${semitones > 0 ? '+' : ''}${semitones} semitone${Math.abs(semitones) === 1 ? '' : 's'}`;
  }

  function getSecondsPerBeat(): number {
    return timing.secondsPerBeat > 0 ? timing.secondsPerBeat : 60 / Math.max(TEMPO_MIN_BPM, project.songTiming.tempoBpm);
  }

  function getAudioFitBeatCount(durationSec: number, tempoBpm = project.songTiming.tempoBpm, firstBeatOffsetSec = project.songTiming.firstBeatOffsetSec): number {
    const secondsPerBeat = 60 / Math.max(TEMPO_MIN_BPM, tempoBpm);
    const chartDurationSec = Math.max(secondsPerBeat, durationSec - Math.max(0, firstBeatOffsetSec));
    return clampBeatCount(Math.ceil(chartDurationSec / secondsPerBeat));
  }

  function formatSeconds(value: number): string {
    return `${value.toFixed(2)}s`;
  }

  function formatTempo(value: number): string {
    return `${value.toFixed(0)} BPM`;
  }

  function clampTimelineZoom(value: number): number {
    if (!Number.isFinite(value)) {
      return MIN_TIMELINE_ZOOM;
    }
    return Math.max(MIN_TIMELINE_ZOOM, Math.min(MAX_TIMELINE_ZOOM, value));
  }

  function getEditorBaseLaneHeightForViewport(
    viewportHeight: number,
    playbackActive = false,
    toolbarHeightPx = 0,
  ): number {
    if (playbackActive) {
      const availableHighwayHeight = (
        Math.max(1, viewportHeight)
        - Math.max(0, toolbarHeightPx)
        - PLAYBACK_HIGHWAY_VERTICAL_CHROME_PX
      );
      return Math.max(EDITOR_LANE_MIN_PX, Math.floor(availableHighwayHeight / BOOMWHACKER_LANES.length));
    }

    return Math.max(
      EDITOR_BASE_LANE_MIN_PX,
      Math.min(
        EDITOR_BASE_LANE_MAX_PX,
        Math.floor((viewportHeight - 330) / BOOMWHACKER_LANES.length),
      ),
    );
  }

  function getZoomedEditorLaneHeight(baseLaneHeightPx: number, zoom: number): number {
    return Math.max(
      EDITOR_LANE_MIN_PX,
      Math.min(EDITOR_LANE_MAX_PX, baseLaneHeightPx * zoom),
    );
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
      && sourceProject.notes.placedNotes.length === 0
      && sourceProject.metadata.title === 'Untitled Boomwhacker Video'
    );
  }

  function hasExistingEditorWork(sourceProject: BoomwhackerVideoBuilderProject = project): boolean {
    return sourceProject.notes.placedNotes.length > 0 || sourceProject.annotations.sections.length > 0 || sourceProject.annotations.timelineNotes.length > 0;
  }

  function needsAudioReattach(sourceProject: BoomwhackerVideoBuilderProject = project): boolean {
    return Boolean(sourceProject.audio && !audioPreviewUrl && !decodedAudioBuffer);
  }

  function getProjectAudioToken(projectId: string): string {
    return `project-audio:${projectId}`;
  }

  function replaceAudioPreviewUrl(nextUrl: string | null): void {
    if (audioPreviewUrl && audioPreviewUrl !== nextUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
    }
    audioPreviewUrl = nextUrl;
  }

  function touchProject(nextProject: BoomwhackerVideoBuilderProject): BoomwhackerVideoBuilderProject {
    return stampProjectUpdatedAt(nextProject);
  }

  function createHistoryEntry(sourceProject: BoomwhackerVideoBuilderProject = project): EditorHistoryEntry {
    return {
      project: sourceProject,
      selectedNoteIds: [...selectedNoteIds],
    };
  }

  function resetHistory(): void {
    undoHistory = [];
    redoHistory = [];
    noteDragState = null;
    noteBoxSelectionState = null;
    noteResizeState = null;
    noteBankPlacementState = null;
    highwayHoverPreview = null;
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

    project = nextProject;
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
    updateViewState({ activeTab });
  }

  function syncSetupModalState(sourceProject: BoomwhackerVideoBuilderProject = project): void {
    setupModalTitle = sourceProject.metadata.title;
    setupModalTempoBpm = sourceProject.songTiming.tempoBpm;
    setupModalFirstBeatOffsetSec = sourceProject.songTiming.firstBeatOffsetSec;
    setupModalBeatCount = sourceProject.songTiming.beatCount;
    setupModalCountInBeats = sourceProject.songTiming.countInBeats;
    setupModalTimeSignatureNumerator = sourceProject.songTiming.timeSignatureNumerator;
    setupModalTimeSignatureDenominator = sourceProject.songTiming.timeSignatureDenominator;
    setupModalGrouping = sourceProject.grid.defaultMacrobeatGrouping;
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

  function promptSetupAudioSelection(): void {
    audioInput?.click();
  }

  function updateProjectTitle(title: string): void {
    const nextTitle = title.trim() || 'Untitled Boomwhacker Video';
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

  function applyProjectSetup(
    title: string,
    songTiming: SongTimingState,
    grouping: MacrobeatGrouping,
    nextStatus: string,
    options?: SetProjectStateOptions,
  ): void {
    const nextTitle = title.trim() || 'Untitled Boomwhacker Video';
    setProjectState(
      touchProject({
        ...project,
        metadata: {
          ...project.metadata,
          title: nextTitle,
        },
        songTiming,
        grid: {
          defaultMacrobeatGrouping: grouping,
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
      options,
    );
  }

  function updateSongTiming(partial: Partial<SongTimingState>, nextStatus?: string): void {
    const nextTiming: SongTimingState = {
      tempoBpm: clampTempoBpm(partial.tempoBpm ?? project.songTiming.tempoBpm),
      firstBeatOffsetSec: clampFirstBeatOffsetSec(partial.firstBeatOffsetSec ?? project.songTiming.firstBeatOffsetSec),
      beatCount: clampBeatCount(partial.beatCount ?? project.songTiming.beatCount),
      countInBeats: clampCountInBeats(partial.countInBeats ?? project.songTiming.countInBeats),
      timeSignatureNumerator: clampTimeSignatureNumerator(partial.timeSignatureNumerator ?? project.songTiming.timeSignatureNumerator),
      timeSignatureDenominator: clampTimeSignatureDenominator(partial.timeSignatureDenominator ?? project.songTiming.timeSignatureDenominator),
    };

    setProjectState(
      touchProject({
        ...project,
        songTiming: nextTiming,
      }),
      nextStatus,
      { recordHistory: true },
    );
    resetPreviewTransport();
  }

  function getMeasureBeatCount(): number {
    return Math.max(1, clampTimeSignatureNumerator(project.songTiming.timeSignatureNumerator));
  }

  function canAddMeasure(): boolean {
    return project.songTiming.beatCount < BEAT_COUNT_MAX;
  }

  function canDeleteMeasure(): boolean {
    return project.songTiming.beatCount > getMeasureBeatCount();
  }

  async function changeSongLengthByMeasures(deltaMeasures: 1 | -1): Promise<void> {
    const measureBeatCount = getMeasureBeatCount();
    const currentBeatCount = clampBeatCount(project.songTiming.beatCount);
    const minimumBeatCount = measureBeatCount;
    if (deltaMeasures < 0 && currentBeatCount <= minimumBeatCount) {
      statusMessage = 'Keep at least one measure in the chart.';
      return;
    }
    const nextBeatCount = deltaMeasures > 0
      ? clampBeatCount(currentBeatCount + measureBeatCount)
      : Math.max(minimumBeatCount, currentBeatCount - measureBeatCount);

    if (nextBeatCount === currentBeatCount) {
      statusMessage = deltaMeasures > 0
        ? 'The song is already at the maximum length.'
        : 'Keep at least one measure in the chart.';
      return;
    }

    const preservedHighwayScrollLeft = editorHighwayViewport?.scrollLeft ?? null;
    const nextTiming: SongTimingState = {
      ...project.songTiming,
      beatCount: nextBeatCount,
    };
    const nextTimingModel = deriveTimingModel(nextTiming, project.grid);
    const nextMaxSlotIndex = Math.max(0, nextTimingModel.totalSlotCount - 1);
    let removedNoteCount = 0;
    let shortenedNoteCount = 0;
    const nextPlacedNotes = sortGridNotes(project.notes.placedNotes.map((note) => {
      if (deltaMeasures > 0 || note.endSlotIndex <= nextMaxSlotIndex) {
        return note;
      }

      if (note.startSlotIndex > nextMaxSlotIndex) {
        removedNoteCount += 1;
        return null;
      }

      const minimumEndSlotIndex = note.startSlotIndex + getMinimumSlotSpanForShape(note.shape, nextTimingModel, note.startSlotIndex) - 1;
      if (minimumEndSlotIndex > nextMaxSlotIndex) {
        removedNoteCount += 1;
        return null;
      }

      shortenedNoteCount += 1;
      return {
        ...note,
        endSlotIndex: Math.min(nextMaxSlotIndex, Math.max(minimumEndSlotIndex, note.endSlotIndex)),
      };
    }).filter((note): note is BoomwhackerGridNote => note !== null));

    const nextSelectedBeatIndex = Math.max(0, Math.min(nextBeatCount - 1, project.viewState.selectedBeatIndex));
    const changedBeatCount = Math.abs(nextBeatCount - currentBeatCount);
    const statusParts = deltaMeasures > 0
      ? [changedBeatCount === measureBeatCount ? 'Added 1 measure.' : `Extended the song length to ${nextBeatCount} beats.`]
      : [changedBeatCount === measureBeatCount ? 'Deleted 1 measure.' : `Reduced the song length to ${nextBeatCount} beats.`];
    if (removedNoteCount > 0) {
      statusParts.push(`Removed ${removedNoteCount} note${removedNoteCount === 1 ? '' : 's'} beyond the new song end.`);
    }
    if (shortenedNoteCount > 0) {
      statusParts.push(`Shortened ${shortenedNoteCount} sustain note${shortenedNoteCount === 1 ? '' : 's'} at the new song end.`);
    }

    setProjectState(
      touchProject({
        ...project,
        songTiming: nextTiming,
        notes: {
          placedNotes: nextPlacedNotes,
        },
        viewState: {
          ...project.viewState,
          selectedBeatIndex: nextSelectedBeatIndex,
        },
      }),
      statusParts.join(' '),
      { recordHistory: true },
    );
    resetPreviewTransport();
    await tick();
    if (preservedHighwayScrollLeft !== null && editorHighwayViewport) {
      const maxScrollLeft = Math.max(0, editorHighwayViewport.scrollWidth - editorHighwayViewport.clientWidth);
      editorHighwayViewport.scrollLeft = Math.max(0, Math.min(maxScrollLeft, preservedHighwayScrollLeft));
    }
  }

  function addMeasure(): void {
    void changeSongLengthByMeasures(1);
  }

  function deleteMeasure(): void {
    void changeSongLengthByMeasures(-1);
  }

  function fitBeatCountToAudio(): void {
    const durationSec = project.audio?.durationSec ?? waveformDurationSec;
    if (durationSec <= 0) {
      statusMessage = 'Attach audio before fitting the beat count.';
      return;
    }

    updateSongTiming(
      { beatCount: getAudioFitBeatCount(durationSec) },
      'Beat count fitted to the attached audio duration.',
    );
  }

  function handleSetupTitleInput(event: Event): void {
    setupModalTitle = (event.currentTarget as HTMLInputElement).value;
    setupModalTitleTouched = true;
  }

  function setSetupBeatCountToAudioDuration(): void {
    const durationSec = pendingSetupAudioFile ? 0 : project.audio?.durationSec ?? 0;
    if (durationSec <= 0) {
      statusMessage = 'Import audio first, then fit beats to the song duration.';
      return;
    }
    setupModalBeatCount = getAudioFitBeatCount(durationSec, setupModalTempoBpm, setupModalFirstBeatOffsetSec);
  }

  async function applySetupModal(): Promise<void> {
    const nextTitle = setupModalTitle.trim()
      || (pendingSetupAudioFile ? stripExtension(pendingSetupAudioFile.name) : project.metadata.title)
      || 'Untitled Boomwhacker Video';
    const nextTiming: SongTimingState = {
      tempoBpm: clampTempoBpm(setupModalTempoBpm),
      firstBeatOffsetSec: clampFirstBeatOffsetSec(setupModalFirstBeatOffsetSec),
      beatCount: clampBeatCount(setupModalBeatCount),
      countInBeats: clampCountInBeats(setupModalCountInBeats),
      timeSignatureNumerator: clampTimeSignatureNumerator(setupModalTimeSignatureNumerator),
      timeSignatureDenominator: clampTimeSignatureDenominator(setupModalTimeSignatureDenominator),
    };

    if (pendingSetupAudioFile) {
      const file = pendingSetupAudioFile;
      closeSetupModal();
      await handleAudioImport(file, {
        title: nextTitle,
        songTiming: nextTiming,
        grouping: setupModalGrouping,
      });
      return;
    }

    applyProjectSetup(nextTitle, nextTiming, setupModalGrouping, 'Updated project setup.', { recordHistory: true });
    closeSetupModal();
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
    showHighwayZoomPreview(nextZoom);
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

  async function zoomHighwayBy(zoomFactor: number): Promise<void> {
    const viewport = editorHighwayViewport;
    if (!viewport) {
      return;
    }
    const rect = viewport.getBoundingClientRect();
    await applyTimelineZoom(zoomFactor, viewport, rect.left + (rect.width / 2));
  }

  async function fitHighwayToSong(): Promise<void> {
    const durationSec = Math.max(0.001, previewDurationSec - previewStartTimeSec);
    const secondsPerBeat = Math.max(0.001, getSecondsPerBeat());
    const pixelsPerSecondAtZoomOne = Math.max(EDITOR_LANE_MIN_PX, editorBaseLaneHeightPx) / secondsPerBeat;
    const availableTimelineWidthPx = Math.max(160, editorHighwayViewportWidthPx - editorHighwayLeadingPaddingPx - 24);
    const nextZoom = clampTimelineZoom(availableTimelineWidthPx / Math.max(1, durationSec * pixelsPerSecondAtZoomOne));

    updateViewState({ zoom: nextZoom });
    showHighwayZoomPreview(nextZoom);
    await tick();
    if (editorHighwayViewport) {
      editorHighwayViewport.scrollLeft = 0;
    }
    statusMessage = 'Zoomed to fit the full song timeline.';
  }

  function clearAudioPresentation(): void {
    sourceAudioBuffer = null;
    decodedAudioBuffer = null;
    renderedTransposeSemitones = null;
    waveformPeaks = [];
    audioPresentationVersion += 1;
    replaceAudioPreviewUrl(null);
    forceGridOnlyPlaybackWhenAudioMissing();
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

  async function refreshActiveAudioPresentation(nextStatus?: string): Promise<void> {
    const sourceBuffer = sourceAudioBuffer;
    const refreshVersion = audioPresentationVersion + 1;
    audioPresentationVersion = refreshVersion;
    if (!sourceBuffer) {
      decodedAudioBuffer = null;
      renderedTransposeSemitones = null;
      replaceAudioPreviewUrl(null);
      return;
    }

    const useOriginalPreview = project.previewState.previewOriginalAudio;
    const transposeSemitones = clampTransposeSemitones(project.audioProcessing.transposeSemitones);
    busyMessage = transposeSemitones !== 0 && !useOriginalPreview ? 'Rendering transposed audio preview...' : busyMessage;
    try {
      const nextAudioBuffer = useOriginalPreview || transposeSemitones === 0
        ? sourceBuffer
        : await renderTransposedAudioBuffer(sourceBuffer, transposeSemitones);
      if (refreshVersion !== audioPresentationVersion) {
        return;
      }

      decodedAudioBuffer = nextAudioBuffer;
      renderedTransposeSemitones = useOriginalPreview ? null : transposeSemitones;
      replaceAudioPreviewUrl(URL.createObjectURL(audioBufferToWavBlob(nextAudioBuffer)));
      if (nextStatus) {
        statusMessage = nextStatus;
      }
    } catch (error) {
      console.error('Boomwhacker Video Builder audio transposition failed.', error);
      errorMessage = 'Audio transposition failed. The original decoded audio is still available for preview.';
      decodedAudioBuffer = sourceBuffer;
      renderedTransposeSemitones = null;
      replaceAudioPreviewUrl(URL.createObjectURL(audioBufferToWavBlob(sourceBuffer)));
    } finally {
      if (busyMessage === 'Rendering transposed audio preview...') {
        busyMessage = '';
      }
    }
  }

  async function applyAudioPresentation(asset: ImportedAudioAsset | null): Promise<void> {
    if (!asset) {
      clearAudioPresentation();
      return;
    }

    if (!project.previewState.playAudio && !audioPreviewUrl && !decodedAudioBuffer) {
      project = {
        ...project,
        previewState: {
          ...project.previewState,
          playAudio: true,
        },
      };
    }

    sourceAudioBuffer = asset.audioBuffer;
    decodedAudioBuffer = asset.audioBuffer;
    renderedTransposeSemitones = 0;
    waveformPeaks = asset.waveform.peaks;
    URL.revokeObjectURL(asset.audioPreviewUrl);
    await refreshActiveAudioPresentation();
  }

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

  function getProjectAudioSummary(): string {
    return project.audio ? `${project.audio.originalFileName} / ${formatSeconds(project.audio.durationSec)}` : 'No audio attached';
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

  function updatePreviewState(
    nextPreviewState: Partial<BoomwhackerVideoBuilderProject['previewState']>,
    nextStatus?: string,
  ): void {
    const shouldSyncPreviewOutputs = (
      'playAudio' in nextPreviewState
      || 'playGrid' in nextPreviewState
      || 'includeSynthPlayback' in nextPreviewState
      || 'playbackOffsetSec' in nextPreviewState
      || 'previewOriginalAudio' in nextPreviewState
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
    if ('previewOriginalAudio' in nextPreviewState) {
      void refreshActiveAudioPresentation(nextPreviewState.previewOriginalAudio ? 'Previewing original audio.' : 'Previewing transposed audio.');
    }
    if (shouldRefreshPreviewSynth) {
      if (previewIsPlaying) {
        restartPreviewSynthAtTime(previewCurrentTimeSec);
      } else {
        stopPreviewSynth();
      }
    }
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
      'Updated playback channels.',
    );
  }

  function togglePlaybackGrid(): void {
    if (project.previewState.playGrid && !project.previewState.playAudio) {
      statusMessage = 'Audio or grid playback must stay enabled.';
      return;
    }

    updatePreviewState(
      { playGrid: !project.previewState.playGrid },
      'Updated playback channels.',
    );
  }

  function setPreviewAudioVolume(nextVolume: number, nextStatus?: string): void {
    updatePreviewState({ audioVolume: clampPreviewVolume(nextVolume) }, nextStatus);
  }

  function setPreviewSynthVolume(nextVolume: number, nextStatus?: string): void {
    updatePreviewState({ synthVolume: clampPreviewVolume(nextVolume) }, nextStatus);
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

  function closeProjectMenu(): void {
    projectMenuOpen = false;
  }

  function handleProjectMenuIconClick(event: MouseEvent): void {
    event.stopPropagation();
    projectMenuOpen = !projectMenuOpen;
    if (projectMenuOpen) {
      closeVolumePopup();
    }
  }

  function runProjectMenuAction(action: () => void | Promise<void>): void {
    closeProjectMenu();
    void action();
  }

  function openProjectFilePicker(): void {
    projectInput?.click();
  }

  function toggleEditorExportTab(): void {
    setActiveTab(project.viewState.activeTab === 'export' ? 'editor' : 'export');
  }

  function handleVolumeIconClick(event: MouseEvent): void {
    event.stopPropagation();
    volumePopupOpen = !volumePopupOpen;
    if (volumePopupOpen) {
      closeProjectMenu();
    }
  }

  function closeVolumePopup(): void {
    volumePopupOpen = false;
  }

  function handleDocumentPointerDownForPopups(event: PointerEvent): void {
    const target = event.target;

    if (volumePopupOpen) {
      if (target instanceof Node && volumeControlWrapper?.contains(target)) {
        return;
      }
      closeVolumePopup();
    }

    if (projectMenuOpen) {
      if (target instanceof Node && projectMenuWrapper?.contains(target)) {
        return;
      }
      closeProjectMenu();
    }
  }

  function handleQuarterTempoChange(quarterTempo: number): void {
    updateSongTiming({ tempoBpm: quarterTempo }, 'Updated song tempo.');
  }

  function setQuarterTempoShortcut(quarterTempo: number): void {
    handleQuarterTempoChange(quarterTempo);
  }

  function isEditorInteractionBlocked(): boolean {
    return Boolean(busyMessage && busyMessage !== 'Rendering transposed audio preview...');
  }

  function updateTransposeSemitones(value: number): void {
    const transposeSemitones = clampTransposeSemitones(value);
    setProjectState(
      touchProject({
        ...project,
        audioProcessing: {
          ...project.audioProcessing,
          transposeSemitones,
        },
      }),
      `Audio transposition set to ${formatSemitones(transposeSemitones)}.`,
      { recordHistory: true },
    );
    if (project.previewState.previewOriginalAudio) {
      return;
    }
    void refreshActiveAudioPresentation();
  }

  function togglePreviewOriginalAudio(): void {
    updatePreviewState(
      { previewOriginalAudio: !project.previewState.previewOriginalAudio },
      !project.previewState.previewOriginalAudio ? 'Previewing original audio.' : 'Previewing transposed audio.',
    );
  }

  async function getExportSourceAudioBuffer(): Promise<AudioBuffer | null> {
    const sourceBuffer = sourceAudioBuffer;
    if (!sourceBuffer) {
      return null;
    }

    const transposeSemitones = clampTransposeSemitones(project.audioProcessing.transposeSemitones);
    if (transposeSemitones === 0) {
      return sourceBuffer;
    }

    if (!project.previewState.previewOriginalAudio && decodedAudioBuffer && renderedTransposeSemitones === transposeSemitones) {
      return decodedAudioBuffer;
    }

    busyMessage = 'Rendering transposed export audio...';
    const renderedBuffer = await renderTransposedAudioBuffer(sourceBuffer, transposeSemitones);
    renderedTransposeSemitones = transposeSemitones;
    return renderedBuffer;
  }

  function applyHistoryEntry(entry: EditorHistoryEntry, nextStatus: string): void {
    project = entry.project;
    selectedNoteIds = [...entry.selectedNoteIds];
    statusMessage = nextStatus;
    errorMessage = '';
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

  function laneClass(marker: 'underline' | 'overline' | 'none'): string {
    if (marker === 'underline') return 'label-marker-underline';
    if (marker === 'overline') return 'label-marker-overline';
    return '';
  }

  function getEditorLaneHeightPx(): number {
    return editorLaneHeightPx;
  }

  function getVisualLaneRow(row: number): number {
    return (BOOMWHACKER_LANES.length - 1) - row;
  }

  function timeToEditorHighwayX(timeSec: number): number {
    return editorHighwayLeadingPaddingPx + ((timeSec - previewStartTimeSec) * editorHighwayPixelsPerSecond);
  }

  function highwayGuideStyle(
    timeSec: number,
    layoutContext: EditorHighwayLayoutContext = getCurrentEditorHighwayLayoutContext(),
  ): string {
    return `left:${getHighwayXForLayoutContext(timeSec, layoutContext)}px;`;
  }

  function judgmentAreaStyle(
    beatSpan: DerivedBeatSpan,
    layoutContext: EditorHighwayLayoutContext = getCurrentEditorHighwayLayoutContext(),
    fixedToViewport = false,
  ): string {
    const left = fixedToViewport
      ? layoutContext.leadingPaddingPx
      : getHighwayXForLayoutContext(getJudgmentStartTimeSec(), layoutContext);
    const width = getHighwayJudgmentAreaWidthPx(beatSpan, layoutContext.pixelsPerSecond);
    const height = BOOMWHACKER_LANES.length * layoutContext.laneHeightPx;
    return `left:${left}px;width:${width}px;height:${height}px;--lane-height:${layoutContext.laneHeightPx}px;`;
  }

  function selectedBeatStyle(
    beatSpan: DerivedBeatSpan,
    layoutContext: EditorHighwayLayoutContext = getCurrentEditorHighwayLayoutContext(),
  ): string {
    const left = getHighwayXForLayoutContext(beatSpan.startTimeSec, layoutContext);
    const right = getHighwayXForLayoutContext(beatSpan.endTimeSec, layoutContext);
    const height = BOOMWHACKER_LANES.length * layoutContext.laneHeightPx;
    return `left:${left}px;width:${Math.max(1, right - left)}px;height:${height}px;`;
  }

  function highwayCursorCellStyle(
    beatSpan: DerivedBeatSpan,
    row: number,
    layoutContext: EditorHighwayLayoutContext = getCurrentEditorHighwayLayoutContext(),
  ): string {
    const left = getHighwayXForLayoutContext(beatSpan.startTimeSec, layoutContext);
    const right = getHighwayXForLayoutContext(beatSpan.endTimeSec, layoutContext);
    const top = getVisualLaneRow(row) * layoutContext.laneHeightPx;
    return `left:${left}px;width:${Math.max(1, right - left)}px;top:${top}px;height:${layoutContext.laneHeightPx}px;`;
  }

  function getCurrentEditorHighwayLayoutContext(): EditorHighwayLayoutContext {
    return editorHighwayLayoutContext;
  }

  function getHighwayXForLayoutContext(timeSec: number, layoutContext: EditorHighwayLayoutContext): number {
    return layoutContext.leadingPaddingPx + ((timeSec - layoutContext.previewStartTimeSec) * layoutContext.pixelsPerSecond);
  }

  function getJudgmentStartTimeSec(): number {
    return project.songTiming.countInBeats > 0
      ? timing.countInStartTimeSec
      : project.songTiming.firstBeatOffsetSec;
  }

  function getHighwayNoteLayoutForNote(
    note: TimedBoomwhackerNote,
    layoutContext: EditorHighwayLayoutContext = getCurrentEditorHighwayLayoutContext(),
  ) {
    return getHighwayNoteLayout({
      note,
      startX: getHighwayXForLayoutContext(note.startTimeSec, layoutContext),
      endX: getHighwayXForLayoutContext(note.endTimeSec, layoutContext),
      visualRow: getVisualLaneRow(note.row),
      laneHeightPx: layoutContext.laneHeightPx,
      isSustained: isSustainedCircleNote(note),
    });
  }

  function highwayNoteStyle(layout: HighwayNoteLayout): string {
    return `left:${layout.left}px;width:${layout.width}px;top:${layout.top}px;height:${layout.height}px;--note-label-size:${layout.labelFontPx}px;`;
  }

  function isSustainedCircleNote(note: Pick<TimedBoomwhackerNote, 'shape' | 'startSlotIndex' | 'endSlotIndex'>): boolean {
    if (note.shape !== 'circle') {
      return false;
    }
    const minimumEndSlotIndex = note.startSlotIndex + getMinimumSlotSpanForShape(note.shape, timing, note.startSlotIndex) - 1;
    return note.endSlotIndex > minimumEndSlotIndex;
  }

  function getHighwayPlaybackHighlightForNote(
    note: TimedBoomwhackerNote,
    layoutContext: EditorHighwayLayoutContext = getCurrentEditorHighwayLayoutContext(),
  ): HighwayPlaybackHighlight {
    const left = getHighwayXForLayoutContext(note.startTimeSec, layoutContext);
    const right = getHighwayXForLayoutContext(note.endTimeSec, layoutContext);

    return {
      id: note.id,
      left,
      top: getVisualLaneRow(note.row) * layoutContext.laneHeightPx,
      width: Math.max(1, right - left),
      height: layoutContext.laneHeightPx,
    };
  }

  function getActiveHighwayPlaybackHighlights(
    notes: TimedBoomwhackerNote[],
    layoutContext: EditorHighwayLayoutContext = getCurrentEditorHighwayLayoutContext(),
    currentTimeSec = previewCurrentTimeSec,
    isPlaying = previewIsPlaying,
    playGrid = project.previewState.playGrid,
  ): HighwayPlaybackHighlight[] {
    if (!isPlaying || !playGrid) {
      return [];
    }

    return notes
      .filter((note) => note.startTimeSec <= currentTimeSec && note.endTimeSec > currentTimeSec)
      .map((note) => getHighwayPlaybackHighlightForNote(note, layoutContext));
  }

  function highwayPlaybackHighlightStyle(highlight: HighwayPlaybackHighlight): string {
    return `left:${highlight.left}px;width:${highlight.width}px;top:${highlight.top}px;height:${highlight.height}px;`;
  }

  function getPlacementPreviewStyle(
    preview: HighwayPlacementPreview,
    layoutContext: EditorHighwayLayoutContext = getCurrentEditorHighwayLayoutContext(),
  ): string {
    const lane = getLaneByRow(preview.row);
    const startTimeSec = slotIndexToTimeSec(timing, preview.startSlotIndex);
    const endTimeSec = slotIndexToTimeSec(timing, preview.endSlotIndex + 1);
    const layout = getHighwayNoteLayoutForNote({
      id: 'placement-preview',
      row: preview.row,
      noteId: '',
      label: lane?.label ?? '',
      marker: lane?.marker ?? 'none',
      pitchInterval: lane?.pitchInterval ?? 0,
      startSlotIndex: preview.startSlotIndex,
      endSlotIndex: preview.endSlotIndex,
      startTimeSec,
      endTimeSec,
      durationSec: Math.max(0, endTimeSec - startTimeSec),
      color: lane?.color ?? '#ffffff',
      shape: preview.shape,
    }, layoutContext);

    return highwayNoteStyle(layout);
  }

  function getEditorHighwayScrollLeftForTime(timeSec: number): number {
    const viewportWidth = Math.max(1, editorHighwayViewportWidthPx);
    const unclampedScrollLeft = timeToEditorHighwayX(timeSec) - editorHighwayLeadingPaddingPx;
    const maxScrollLeft = Math.max(0, editorHighwayStageWidthPx - viewportWidth);
    return Math.max(0, Math.min(maxScrollLeft, unclampedScrollLeft));
  }

  function syncEditorHighwayViewportToTime(timeSec: number): void {
    if (!editorHighwayViewport) {
      return;
    }
    editorHighwayViewport.scrollLeft = getEditorHighwayScrollLeftForTime(timeSec);
  }

  function waveformPlayheadStyle(currentTimeSec: number, durationSec: number, isVisible = true): string {
    if (!isVisible || durationSec <= 0) {
      return 'display:none;';
    }

    const clampedTimeSec = Math.min(durationSec, Math.max(0, currentTimeSec));
    return `left:${(clampedTimeSec / durationSec) * 100}%;`;
  }

  function getCompactWaveformTimeline(): HTMLDivElement | null {
    return compactWaveformViewport?.querySelector<HTMLDivElement>('.compact-waveform__timeline') ?? null;
  }

  function getTimelineTimeSecFromClientX(clientX: number): number {
    const timeline = getCompactWaveformTimeline();
    const rect = timeline?.getBoundingClientRect();
    if (!rect) {
      return 0;
    }
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(1, rect.width)));
    return clampPreviewTimeSec(ratio * waveformDurationSec);
  }

  function getCompactWaveformTimelineXForTime(timeSec: number): number {
    const timelineWidth = getCompactWaveformTimeline()?.clientWidth ?? 0;
    const durationSec = waveformDurationSec;
    if (timelineWidth <= 0 || durationSec <= 0) {
      return 0;
    }

    const ratio = Math.min(1, Math.max(0, timeSec / durationSec));
    return ratio * timelineWidth;
  }

  function revealCompactWaveformTime(timeSec: number): void {
    const viewport = compactWaveformViewport;
    const timeline = getCompactWaveformTimeline();
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

  function clampPreviewTimeSec(timeSec: number): number {
    if (previewDurationSec <= 0) {
      return Math.max(previewStartTimeSec, timeSec);
    }
    return Math.min(previewDurationSec, Math.max(previewStartTimeSec, timeSec));
  }

  function previewCanUseSourceAudio(): boolean {
    return Boolean(audioPreviewUrl) && project.previewState.playAudio;
  }

  function previewHasActiveSourceAudio(): boolean {
    return previewCurrentTimeSec >= 0 && previewCanUseSourceAudio() && Boolean(previewAudioPlayer && !previewAudioPlayer.paused);
  }

  function previewCanPlayGrid(): boolean {
    return project.previewState.playGrid;
  }

  function previewCanPlaySynth(): boolean {
    return previewCanPlayGrid() && project.previewState.includeSynthPlayback && timedNotes.length > 0;
  }

  function getCountInBeatEvents(): CountInBeatEvent[] {
    const secondsPerBeat = getSecondsPerBeat();
    const countInBeats = clampCountInBeats(project.songTiming.countInBeats);
    if (secondsPerBeat <= 0 || countInBeats <= 0) {
      return [];
    }

    const leadInBeats = Math.max(0, Math.round(timing.countInLeadInBeats));
    const totalCountInBeats = countInBeats + leadInBeats;
    return Array.from({ length: totalCountInBeats }, (_, index) => {
      const visibleIndex = index - leadInBeats;
      const remainingCount = visibleIndex >= 0 ? countInBeats - visibleIndex : null;
      return {
        id: `count-in-${index}`,
        timeSec: timing.countInStartTimeSec + (index * secondsPerBeat),
        remainingCount,
        isAccent: remainingCount === 1,
      };
    });
  }

  function playCountInBeatEvent(countInBeat: CountInBeatEvent): void {
    if (countInBeat.remainingCount === null) {
      return;
    }
    void previewSynth.playNote(
      `${countInBeat.id}-${countInBeat.timeSec}`,
      countInBeat.isAccent ? 19 : 12,
      0.08,
      { rootMidi: SIMPLE_NOTATION_DEFAULT_ROOT_MIDI },
    );
  }

  function stopPreviewSynth(): void {
    previewSynth.stopAll();
    previewSynthCursorTimeSec = previewCurrentTimeSec;
  }

  function restartPreviewSynthAtTime(timeSec: number): void {
    previewSynth.stopAll();
    previewSynthCursorTimeSec = timeSec;

    if (previewCanPlayGrid()) {
      const countInBeatAtStart = getCountInBeatEvents().find(
        (countInBeat) => Math.abs(countInBeat.timeSec - timeSec) < 0.001,
      );
      if (countInBeatAtStart) {
        playCountInBeatEvent(countInBeatAtStart);
      }
    }

    if (!previewCanPlaySynth()) {
      return;
    }

    for (const note of timedNotes) {
      if (note.startTimeSec <= timeSec && note.endTimeSec > timeSec) {
        void previewSynth.playNote(
          note.id,
          note.pitchInterval,
          Math.max(0.04, note.endTimeSec - timeSec),
          { rootMidi: SIMPLE_NOTATION_DEFAULT_ROOT_MIDI },
        );
      }
    }
  }

  function advancePreviewSynth(toTimeSec: number): void {
    if (!previewCanPlayGrid()) {
      stopPreviewSynth();
      return;
    }

    const fromTimeSec = previewSynthCursorTimeSec;
    if (toTimeSec < fromTimeSec - 0.001) {
      restartPreviewSynthAtTime(toTimeSec);
      return;
    }

    for (const countInBeat of getCountInBeatEvents()) {
      if (countInBeat.timeSec > fromTimeSec && countInBeat.timeSec <= toTimeSec) {
        playCountInBeatEvent(countInBeat);
      }
    }

    if (previewCanPlaySynth()) {
      for (const note of timedNotes) {
        if (note.startTimeSec > fromTimeSec && note.startTimeSec <= toTimeSec) {
          void previewSynth.playNote(
            note.id,
            note.pitchInterval,
            Math.max(0.04, note.durationSec),
            { rootMidi: SIMPLE_NOTATION_DEFAULT_ROOT_MIDI },
          );
        }
      }
    }

    previewSynthCursorTimeSec = toTimeSec;
  }

  function syncPreviewClockAnchor(): void {
    previewClockAnchorTimeSec = previewCurrentTimeSec;
    previewClockAnchorMs = performance.now();
  }

  async function startPreviewAudioAtCurrentTime(): Promise<void> {
    if (!previewCanUseSourceAudio() || !previewAudioPlayer || previewCurrentTimeSec < 0) {
      previewAudioPlayer?.pause();
      return;
    }

    previewAudioPlayer.currentTime = Math.max(0, clampPreviewTimeSec(previewCurrentTimeSec));
    if (!previewAudioPlayer.paused) {
      return;
    }

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

  function cancelPreviewAnimation(): void {
    if (previewAnimationFrameId !== null) {
      cancelAnimationFrame(previewAnimationFrameId);
      previewAnimationFrameId = null;
    }
  }

  async function syncPreviewOutputsWhilePlaying(): Promise<void> {
    if (!previewIsPlaying) {
      return;
    }

    syncPreviewClockAnchor();
    await startPreviewAudioAtCurrentTime();
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
    if (previewCanUseSourceAudio() && previewAudioPlayer && previewAudioPlayer.paused && nextTimeSec >= 0) {
      void startPreviewAudioAtCurrentTime();
    }
    advancePreviewSynth(nextTimeSec);
    if (previewCanPlayGrid()) {
      syncEditorHighwayViewportToTime(nextTimeSec);
    }

    if (nextTimeSec >= previewDurationSec - 0.001) {
      previewIsPlaying = false;
      cancelPreviewAnimation();
      previewAudioPlayer?.pause();
      stopPreviewSynth();
      previewCurrentTimeSec = clampPreviewTimeSec(previewDurationSec);
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
    if (previewDurationSec <= 0) {
      statusMessage = 'Nothing is ready for playback yet.';
      return;
    }

    if (!previewCanPlayGrid() && !previewCanUseSourceAudio()) {
      statusMessage = 'Turn on grid playback or attach audio before playing.';
      return;
    }

    if (previewCurrentTimeSec >= previewDurationSec) {
      previewCurrentTimeSec = getPlaybackResetTimeSec();
    }

    previewIsPlaying = true;
    errorMessage = '';
    await tick();
    syncPreviewClockAnchor();
    restartPreviewSynthAtTime(previewCurrentTimeSec);
    if (previewCanPlayGrid()) {
      syncEditorHighwayViewportToTime(previewCurrentTimeSec);
    }

    await startPreviewAudioAtCurrentTime();

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
    selectBeatAtSlot(getSlotIndexForTimeSec(previewCurrentTimeSec));
    syncEditorHighwayViewportToTime(previewCurrentTimeSec);
    revealCompactWaveformTime(previewCurrentTimeSec);
    if (previewCanUseSourceAudio() && previewAudioPlayer) {
      previewAudioPlayer.currentTime = Math.max(0, previewCurrentTimeSec);
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
    previewCurrentTimeSec = getPlaybackResetTimeSec();
    exportPreviewTimeSec = clampExportPreviewTimeSec(previewCurrentTimeSec - getExportStartTimeSec(project, timing));
    if (previewAudioPlayer) {
      previewAudioPlayer.currentTime = Math.max(0, previewCurrentTimeSec);
    }
    syncPreviewClockAnchor();
    syncEditorHighwayViewportToTime(previewCurrentTimeSec);
    revealCompactWaveformTime(previewCurrentTimeSec);
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
    if (!project.previewState.playGrid || previewCurrentTimeSec >= previewDurationSec - 0.001) {
      previewCurrentTimeSec = clampPreviewTimeSec(previewDurationSec);
      pausePreview('Playback complete.');
      return;
    }
    pausePreview('Source audio ended.');
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
    exportPreviewTimeSec = clampExportPreviewTimeSec(previewCurrentTimeSec - getExportStartTimeSec(project, timing));
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
      const exportSourceAudioBuffer = await getExportSourceAudioBuffer();
      const result = await exportProjectVideo({
        project,
        timing,
        guides: highwayGuides,
        timedNotes,
        sourceAudioBuffer: exportSourceAudioBuffer,
        onProgress: ({ frameIndex, totalFrames }) => {
          if (frameIndex === 1 || frameIndex === totalFrames || frameIndex % progressInterval === 0) {
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

      const warningSuffix = result.warnings.length > 0 ? ` ${result.warnings.join(' ')}` : '';
      statusMessage = `Saved ${fileName} as ${result.container.label}.${warningSuffix}`;
    } catch (error) {
      console.error('Boomwhacker Video Builder video export failed.', error);
      errorMessage = error instanceof Error ? error.message : 'Video export failed.';
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

  function createNoteId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `note-${crypto.randomUUID()}`;
    }
    return `note-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function getLaneByRow(row: number) {
    return BOOMWHACKER_LANES.find((lane) => lane.row === row) ?? null;
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

  function getBeatSpanForSlotIndex(slotIndex: number): DerivedBeatSpan | null {
    return timing.beatSpans.find((span) => slotIndex >= span.startSlotIndex && slotIndex <= span.endSlotIndex) ?? null;
  }

  function getSelectedBeatSpan(): DerivedBeatSpan | null {
    const clampedBeatIndex = Math.max(0, Math.min(timing.beatSpans.length - 1, project.viewState.selectedBeatIndex));
    return timing.beatSpans[clampedBeatIndex] ?? null;
  }

  function getPlaybackStartBeatSpan(): DerivedBeatSpan | null {
    const beatIndex = project.viewState.playbackStartBeatIndex;
    if (beatIndex === null || timing.beatSpans.length === 0) {
      return null;
    }
    const clampedBeatIndex = Math.max(0, Math.min(timing.beatSpans.length - 1, beatIndex));
    return timing.beatSpans[clampedBeatIndex] ?? null;
  }

  function getPlaybackResetTimeSec(): number {
    return getPlaybackStartBeatSpan()?.startTimeSec ?? previewStartTimeSec;
  }

  function getMeasureSpanForBeat(beatIndex: number): { startBeat: DerivedBeatSpan; endTimeSec: number } | null {
    const startBeat = timing.beatSpans[beatIndex];
    if (!startBeat) {
      return null;
    }
    const measureBeatCount = Math.max(1, timing.timeSignatureNumerator);
    const measureEndBeatIndex = Math.min(timing.beatSpans.length - 1, startBeat.beatIndex + measureBeatCount - 1);
    const endBeat = timing.beatSpans[measureEndBeatIndex];
    if (!endBeat) {
      return null;
    }
    return {
      startBeat,
      endTimeSec: endBeat.endTimeSec,
    };
  }

  function playbackStartMeasureStyle(
    startBeat: DerivedBeatSpan | null,
    layoutContext: EditorHighwayLayoutContext = getCurrentEditorHighwayLayoutContext(),
  ): string {
    if (!startBeat) {
      return 'display:none;';
    }
    const measureSpan = getMeasureSpanForBeat(startBeat.beatIndex);
    if (!measureSpan) {
      return 'display:none;';
    }
    const left = getHighwayXForLayoutContext(measureSpan.startBeat.startTimeSec, layoutContext);
    const right = getHighwayXForLayoutContext(measureSpan.endTimeSec, layoutContext);
    const height = BOOMWHACKER_LANES.length * layoutContext.laneHeightPx;
    return `left:${left}px;width:${Math.max(1, right - left)}px;height:${height}px;`;
  }

  function selectPlaybackStartMeasure(beatIndex: number, label?: string): void {
    if (previewIsPlaying) {
      return;
    }
    const measureSpan = getMeasureSpanForBeat(beatIndex);
    if (!measureSpan) {
      return;
    }

    updateViewState({
      playbackStartBeatIndex: measureSpan.startBeat.beatIndex,
      selectedBeatIndex: measureSpan.startBeat.beatIndex,
    });
    seekPreview(
      measureSpan.startBeat.startTimeSec,
      `Playback will begin at measure ${label ?? Math.floor(measureSpan.startBeat.beatIndex / Math.max(1, timing.timeSignatureNumerator)) + 1}.`,
    );
  }

  function handleMeasureLabelPointerDown(event: PointerEvent): void {
    event.stopPropagation();
  }

  function handleMeasureLabelClick(event: MouseEvent, beatIndex: number, label?: string): void {
    event.preventDefault();
    event.stopPropagation();
    selectPlaybackStartMeasure(beatIndex, label);
  }

  function clampPlacementRow(row: number): number {
    return Math.max(0, Math.min(BOOMWHACKER_LANES.length - 1, row));
  }

  function selectBeatAtSlot(slotIndex: number): void {
    const beatSpan = getBeatSpanForSlotIndex(slotIndex);
    if (!beatSpan || beatSpan.beatIndex === project.viewState.selectedBeatIndex) {
      return;
    }
    updateViewState({ selectedBeatIndex: beatSpan.beatIndex });
  }

  function moveHighwayCursor(rowDelta: number, beatDelta: number): void {
    if (timing.beatSpans.length === 0) {
      return;
    }
    const currentBeatIndex = Math.max(0, Math.min(timing.beatSpans.length - 1, project.viewState.selectedBeatIndex));
    const nextBeatIndex = Math.max(0, Math.min(timing.beatSpans.length - 1, currentBeatIndex + beatDelta));
    activePlacementRow = clampPlacementRow(activePlacementRow + rowDelta);
    updateViewState({ selectedBeatIndex: nextBeatIndex });
    const nextBeatSpan = timing.beatSpans[nextBeatIndex];
    if (nextBeatSpan) {
      syncEditorHighwayViewportToTime(nextBeatSpan.startTimeSec);
    }
  }

  function getHighwayTimeSecFromClientX(clientX: number, stageRect: DOMRect): number {
    const xWithinStage = Math.min(stageRect.width, Math.max(0, clientX - stageRect.left));
    return clampPreviewTimeSec(previewStartTimeSec + ((xWithinStage - editorHighwayLeadingPaddingPx) / Math.max(1, editorHighwayPixelsPerSecond)));
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

  function setHighwayCursorFromClientPoint(clientX: number, clientY: number, stageRect: DOMRect): { row: number; slotIndex: number } {
    const row = getRowFromHighwayClientY(clientY, stageRect);
    const slotIndex = getSlotIndexFromHighwayClientX(clientX, stageRect);
    activePlacementRow = row;
    selectBeatAtSlot(slotIndex);
    return { row, slotIndex };
  }

  function clampClientPointToRect(value: number, start: number, end: number): number {
    return Math.min(end, Math.max(start, value));
  }

  function getNormalizedClientRect(startClientX: number, startClientY: number, currentClientX: number, currentClientY: number) {
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

  function isHighwayCursorToolActive(): boolean {
    return highwayEditorTool === 'place' && activeNoteShape === null;
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

  function setActiveShapeTool(shape: NoteShape | null): void {
    activeNoteShape = shape;
    setHighwayEditorTool('place');
    if (shape === null) {
      clearHighwayHoverPreview();
    }
  }

  function toggleActiveShapeTool(shape: NoteShape): void {
    setActiveShapeTool(activeNoteShape === shape && highwayEditorTool === 'place' ? null : shape);
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

  function getHighwayEraserPreviewAtClientPoint(clientX: number, clientY: number, options?: { stageRect?: DOMRect; clampToStage?: boolean }): HighwayEraserPreview | null {
    const stageRect = options?.stageRect ?? editorHighwayStage?.getBoundingClientRect();
    if (!stageRect || timing.totalSlotCount === 0) {
      return null;
    }

    const clampToStage = options?.clampToStage ?? false;
    if (!clampToStage && (clientX < stageRect.left || clientX > stageRect.right || clientY < stageRect.top || clientY > stageRect.bottom)) {
      return null;
    }

    const resolvedClientX = clampToStage ? clampClientPointToRect(clientX, stageRect.left, stageRect.right) : clientX;
    const resolvedClientY = clampToStage ? clampClientPointToRect(clientY, stageRect.top, stageRect.bottom) : clientY;
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

  function noteIntersectsHighwayEraserPreview(note: BoomwhackerGridNote, preview: HighwayEraserPreview): boolean {
    return note.row === preview.row && note.startSlotIndex <= preview.endSlotIndex && note.endSlotIndex >= preview.startSlotIndex;
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
    highwayEraserPreview = highwayEditorTool === 'eraser' && event
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
    if (isEditorInteractionBlocked() || previewIsPlaying || noteBankPlacementState !== null || noteDragState !== null || noteResizeState !== null || noteBoxSelectionState !== null || highwayEraseState !== null || timing.totalSlotCount === 0) {
      return;
    }

    const stageElement = editorHighwayStage;
    if (!stageElement) {
      return;
    }

    const stageRect = stageElement.getBoundingClientRect();
    const preview = getHighwayEraserPreviewAtClientPoint(event.clientX, event.clientY, { stageRect, clampToStage: true });
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

  function rectsIntersect(leftRect: { left: number; top: number; right: number; bottom: number }, rightRect: { left: number; top: number; right: number; bottom: number }): boolean {
    return leftRect.left <= rightRect.right && leftRect.right >= rightRect.left && leftRect.top <= rightRect.bottom && leftRect.bottom >= rightRect.top;
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
      if (rectsIntersect(selectionRect, noteElement.getBoundingClientRect())) {
        selectedIds.push(noteId);
      }
    }
    return selectedIds;
  }

  function createPlacedNote(row: number, startSlotIndex: number, endSlotIndex: number, shape: NoteShape): BoomwhackerGridNote | null {
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
      return 'Set a valid song tempo before placing notes.';
    }

    const orderedNotes = sortGridNotes(placedNotes);
    for (const note of orderedNotes) {
      if (note.row < 0 || note.row >= BOOMWHACKER_LANES.length) {
        return 'Notes must stay on the eight Boomwhacker lanes.';
      }
      if (note.startSlotIndex < 0 || note.endSlotIndex > getMaxSlotIndex()) {
        return 'That move would place a note outside the song timing grid.';
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

  function buildMovedPlacedNotes(sourceProject: BoomwhackerVideoBuilderProject, noteIds: string[], rowDelta: number, slotDelta: number): BoomwhackerGridNote[] {
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

  function placePreparedNote(row: number, startSlotIndex: number, endSlotIndex: number, shape: NoteShape, nextStatus?: string): boolean {
    const note = createPlacedNote(row, startSlotIndex, endSlotIndex, shape);
    const lane = getLaneByRow(row);
    if (!note || !lane) {
      statusMessage = 'That lane is not available for note placement.';
      return false;
    }

    const didCommit = commitPlacedNotes(
      [...project.notes.placedNotes, note],
      nextStatus ?? `Placed a ${shape} note on ${lane.spokenLabel}.`,
    );
    if (didCommit) {
      activePlacementRow = row;
      selectedNoteIds = [note.id];
    }
    return didCommit;
  }

  function placeNoteAtSlot(row: number, slotIndex: number): void {
    if (isEditorInteractionBlocked()) {
      return;
    }
    if (activeNoteShape === null) {
      statusMessage = 'Select a shape to place notes, or use the cursor to choose a paste target.';
      return;
    }
    if (timing.totalSlotCount === 0) {
      statusMessage = 'Set a valid song tempo before placing notes.';
      return;
    }
    const placement = getDefaultSlotRangeForShape(timing, slotIndex, activeNoteShape);
    if (placePreparedNote(row, placement.startSlotIndex, placement.endSlotIndex, activeNoteShape)) {
      selectBeatAtSlot(placement.startSlotIndex);
    }
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
    if (isEditorInteractionBlocked() || previewIsPlaying || highwayEditorTool !== 'place' || isHighwayEraserToolActive() || event.shiftKey || event.metaKey || event.ctrlKey) {
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

    const { row, slotIndex } = setHighwayCursorFromClientPoint(event.clientX, event.clientY, stageRect);
    clearHighwayHoverPreview();
    if (activeNoteShape === null) {
      selectedNoteIds = [];
      const lane = getLaneByRow(row);
      statusMessage = `Selected ${lane?.spokenLabel ?? 'row'} as the paste target.`;
      return;
    }
    placeNoteAtSlot(row, slotIndex);
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
    if (isEditorInteractionBlocked() || previewIsPlaying || noteBankPlacementState !== null || noteDragState !== null || noteResizeState !== null || noteBoxSelectionState !== null || timing.totalSlotCount === 0 || event.shiftKey || event.metaKey || event.ctrlKey) {
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
    if (activeNoteShape === null) {
      clearHighwayHoverPreview();
      const stageRect = editorHighwayStage?.getBoundingClientRect();
      if (stageRect) {
        setHighwayCursorFromClientPoint(event.clientX, event.clientY, stageRect);
      }
      return;
    }
    const placementPreview = getPlacementPreviewAtClientPoint(activeNoteShape, event.clientX, event.clientY);
    highwayHoverPreview = placementPreview;
    if (placementPreview) {
      activePlacementRow = placementPreview.row;
      selectBeatAtSlot(placementPreview.startSlotIndex);
    }
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
      selectBeatAtSlot(note.startSlotIndex);
    }
    selectNote(noteId, { toggle: event.shiftKey || event.metaKey || event.ctrlKey });
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
    resizeHotspotNoteId = isCircleResizeHotspot(note, event.clientX, currentTarget.getBoundingClientRect()) ? note.id : null;
  }

  function clearNoteHoverCursor(noteId: string): void {
    if (resizeHotspotNoteId === noteId) {
      resizeHotspotNoteId = null;
    }
  }

  function startNoteBoxSelection(event: MouseEvent): void {
    if (
      isEditorInteractionBlocked()
      || previewIsPlaying
      || isHighwayEraserToolActive()
      || event.button !== 0
      || (!event.shiftKey && !isHighwayLassoToolActive() && !isHighwayCursorToolActive())
    ) {
      return;
    }

    clearHighwayHoverPreview();
    const gridElement = editorHighwayStage;
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!gridElement || !target || target.closest('.highway__note')) {
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
      initialSelectedNoteIds: (isHighwayLassoToolActive() || isHighwayCursorToolActive()) && !event.shiftKey ? [] : [...selectedNoteIds],
      hasMoved: false,
    };

    const handlePointerMove = (moveEvent: MouseEvent) => {
      if (!noteBoxSelectionState) {
        return;
      }
      const currentClientX = clampClientPointToRect(moveEvent.clientX, gridRect.left, gridRect.right);
      const currentClientY = clampClientPointToRect(moveEvent.clientY, gridRect.top, gridRect.bottom);
      const hasMoved = Math.abs(currentClientX - noteBoxSelectionState.startClientX) >= 4 || Math.abs(currentClientY - noteBoxSelectionState.startClientY) >= 4;
      noteBoxSelectionState = {
        ...noteBoxSelectionState,
        currentClientX,
        currentClientY,
        hasMoved,
      };
      if (!hasMoved) {
        return;
      }
      const selectionRect = getNormalizedClientRect(noteBoxSelectionState.startClientX, noteBoxSelectionState.startClientY, currentClientX, currentClientY);
      selectedNoteIds = [...new Set([...noteBoxSelectionState.initialSelectedNoteIds, ...getNoteIdsInClientSelectionRect(selectionRect)])];
    };

    const handlePointerUp = () => {
      const finishedSelection = noteBoxSelectionState;
      noteBoxSelectionState = null;
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      if (finishedSelection?.hasMoved) {
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
    if (isEditorInteractionBlocked() || previewIsPlaying || event.button !== 0 || event.shiftKey || event.metaKey || event.ctrlKey) {
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
    selectBeatAtSlot(anchorNote.startSlotIndex);

    const dragNoteIds = selectedNoteIds.includes(noteId) ? [...selectedNoteIds] : [noteId];
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
      if (rowDelta === noteDragState.currentRowDelta && slotDelta === noteDragState.currentSlotDelta) {
        return;
      }
      const nextPlacedNotes = buildMovedPlacedNotes(noteDragState.historyEntry.project, noteDragState.noteIds, rowDelta, slotDelta);
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

      const didMove = finishedDragState.currentRowDelta !== 0 || finishedDragState.currentSlotDelta !== 0;
      if (!didMove) {
        setProjectState(finishedDragState.historyEntry.project, undefined, { recordHistory: false, clearRedo: false });
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
        setProjectState(finishedDragState.historyEntry.project, validationError, { recordHistory: false, clearRedo: false });
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
    if (isEditorInteractionBlocked() || previewIsPlaying || event.button !== 0) {
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
    selectBeatAtSlot(note.startSlotIndex);
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
        placedNote.id === noteId ? { ...placedNote, endSlotIndex: nextEndSlotIndex } : placedNote
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
        setProjectState(finishedResizeState.historyEntry.project, undefined, { recordHistory: false, clearRedo: false });
        return;
      }

      const didResize = sourceNote.endSlotIndex !== finishedResizeState.currentEndSlotIndex;
      if (!didResize) {
        setProjectState(finishedResizeState.historyEntry.project, undefined, { recordHistory: false, clearRedo: false });
        return;
      }

      const nextPlacedNotes = finishedResizeState.historyEntry.project.notes.placedNotes.map((placedNote) => (
        placedNote.id === noteId ? { ...placedNote, endSlotIndex: finishedResizeState.currentEndSlotIndex } : placedNote
      ));
      const validationError = validatePlacedNotes(nextPlacedNotes);
      if (validationError) {
        setProjectState(finishedResizeState.historyEntry.project, validationError, { recordHistory: false, clearRedo: false });
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

  function getPlacementPreviewAtClientPoint(shape: NoteShape, clientX: number, clientY: number): HighwayPlacementPreview | null {
    const stageRect = editorHighwayStage?.getBoundingClientRect();
    if (!stageRect || timing.totalSlotCount === 0) {
      return null;
    }
    if (clientX < stageRect.left || clientX > stageRect.right || clientY < stageRect.top || clientY > stageRect.bottom) {
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
    if (isEditorInteractionBlocked() || previewIsPlaying || event.button !== 0) {
      return;
    }
    clearHighwayHoverPreview();
    highwayEraserPreview = null;
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
      const hasMoved = Math.abs(moveEvent.clientX - noteBankPlacementState.startClientX) >= 4 || Math.abs(moveEvent.clientY - noteBankPlacementState.startClientY) >= 4;
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
      setActiveShapeTool(finishedPlacement.shape);
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
    void commitPlacedNotes(nextPlacedNotes, deletedCount === uniqueNoteIds.length ? nextStatus : `Deleted ${deletedCount} note${deletedCount === 1 ? '' : 's'}.`);
  }

  function deleteSelectedNotes(): void {
    deleteNotesById(selectedNoteIds, `Deleted ${selectedNoteIds.length} selected note${selectedNoteIds.length === 1 ? '' : 's'}.`);
  }

  function moveSelectedNotes(rowDelta: number, slotDelta: number): void {
    if (selectedNoteIds.length === 0) {
      statusMessage = 'Select at least one note first.';
      return;
    }
    const didCommit = commitPlacedNotes(
      buildMovedPlacedNotes(project, selectedNoteIds, rowDelta, slotDelta),
      `Moved ${selectedNoteIds.length} selected note${selectedNoteIds.length === 1 ? '' : 's'}.`,
    );
    if (didCommit) {
      selectedNoteIds = [...selectedNoteIds];
    }
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
        endSlotIndex: clampNoteEndSlotIndex(note.startSlotIndex, note.endSlotIndex + deltaSlots, note.shape, maxSlotIndex, timing),
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
    clipboardNotes = sortGridNotes(project.notes.placedNotes.filter((note) => selectedIdSet.has(note.id)).map((note) => ({ ...note })));
    statusMessage = `Copied ${clipboardNotes.length} note${clipboardNotes.length === 1 ? '' : 's'} to the local clipboard.`;
  }

  function cutSelectedNotes(): void {
    if (selectedNoteIds.length === 0) {
      statusMessage = 'Select at least one note first.';
      return;
    }

    const selectedIdSet = new Set(selectedNoteIds);
    const nextClipboardNotes = sortGridNotes(project.notes.placedNotes.filter((note) => selectedIdSet.has(note.id)).map((note) => ({ ...note })));
    if (nextClipboardNotes.length === 0) {
      statusMessage = 'Select at least one note first.';
      return;
    }

    clipboardNotes = nextClipboardNotes;
    const nextPlacedNotes = project.notes.placedNotes.filter((note) => !selectedIdSet.has(note.id));
    const cutCount = nextClipboardNotes.length;
    selectedNoteIds = [];
    void commitPlacedNotes(nextPlacedNotes, `Cut ${cutCount} note${cutCount === 1 ? '' : 's'} to the local clipboard.`);
  }

  function pasteSelectedNotes(): void {
    if (clipboardNotes.length === 0) {
      statusMessage = 'Copy at least one note before pasting.';
      return;
    }

    const maxSlotIndex = getMaxSlotIndex();
    const pasteBeatSpan = getSelectedBeatSpan();
    const sourceMinRow = Math.min(...clipboardNotes.map((note) => note.row));
    const sourceMinSlotIndex = Math.min(...clipboardNotes.map((note) => note.startSlotIndex));
    const targetRow = clampPlacementRow(activePlacementRow);
    const targetSlotIndex = Math.min(maxSlotIndex, pasteBeatSpan?.startSlotIndex ?? Math.max(0, project.viewState.scrollSlotIndex));
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
    const didCommit = commitPlacedNotes([...project.notes.placedNotes, ...pastedNotes], `Pasted ${pastedNotes.length} note${pastedNotes.length === 1 ? '' : 's'}.`);
    if (didCommit) {
      activePlacementRow = targetRow;
      selectedNoteIds = pastedNotes.map((note) => note.id);
      selectBeatAtSlot(targetSlotIndex);
    }
  }

  async function handleAudioImport(file: File, options?: { title?: string; songTiming?: SongTimingState; grouping?: MacrobeatGrouping }): Promise<void> {
    busyMessage = 'Decoding audio and building a waveform...';
    errorMessage = '';
    try {
      resetPreviewTransport();
      selectedNoteIds = [];
      clipboardNotes = [];
      const importedAsset = await importAudioFile(file);
      const nextTitle = options?.title?.trim() || stripExtension(file.name) || project.metadata.title;
      const optionTiming = options?.songTiming ?? project.songTiming;
      const nextTiming: SongTimingState = {
        tempoBpm: clampTempoBpm(optionTiming.tempoBpm),
        firstBeatOffsetSec: clampFirstBeatOffsetSec(optionTiming.firstBeatOffsetSec),
        beatCount: options?.songTiming
          ? clampBeatCount(optionTiming.beatCount)
          : getAudioFitBeatCount(importedAsset.audio.durationSec, optionTiming.tempoBpm, optionTiming.firstBeatOffsetSec),
        countInBeats: clampCountInBeats(optionTiming.countInBeats),
        timeSignatureNumerator: clampTimeSignatureNumerator(optionTiming.timeSignatureNumerator),
        timeSignatureDenominator: clampTimeSignatureDenominator(optionTiming.timeSignatureDenominator),
      };
      const nextGrouping = options?.grouping ?? project.grid.defaultMacrobeatGrouping;
      const preserveExistingEditorData = hasExistingEditorWork();
      const baseProject = preserveExistingEditorData
        ? touchProject({
            ...project,
            metadata: {
              ...project.metadata,
              title: nextTitle,
            },
            audio: importedAsset.audio,
            songTiming: nextTiming,
            grid: {
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
            songTiming: nextTiming,
            grid: {
              defaultMacrobeatGrouping: nextGrouping,
            },
            viewState: {
              ...project.viewState,
              activeTab: 'editor',
              scrollSlotIndex: 0,
            },
            previewState: {
              ...project.previewState,
              playAudio: true,
              playGrid: true,
            },
            exportState: {
              ...project.exportState,
              titleCard: {
                ...project.exportState.titleCard,
                title: nextTitle,
              },
            },
          });
      const persistedAudio = await persistProjectAudioLocally(baseProject.metadata.id, file, importedAsset.audio);
      const nextProject = touchProject({
        ...baseProject,
        audio: persistedAudio,
      });
      setProjectState(nextProject, preserveExistingEditorData ? `Loaded "${file.name}" without clearing current notes.` : `Loaded "${file.name}" and fitted the constant-tempo grid.`);
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
      setProjectState(nextProject, `Reattached "${file.name}" to the current chart.`);
      syncSetupModalState(nextProject);
      await applyAudioPresentation(importedAsset);
    } catch (error) {
      console.error('Boomwhacker Video Builder audio reattach failed.', error);
      errorMessage = 'Audio reattach failed. Choose the original song file to restore waveform and preview playback.';
    } finally {
      busyMessage = '';
    }
  }

  async function loadProjectIntoShell(nextProject: BoomwhackerVideoBuilderProject, successMessage?: string): Promise<void> {
    busyMessage = 'Loading project...';
    errorMessage = '';
    try {
      resetPreviewTransport();
      selectedNoteIds = [];
      const hydratedProject: BoomwhackerVideoBuilderProject = nextProject.viewState.activeTab === 'export' ? nextProject : {
        ...nextProject,
        viewState: {
          ...nextProject.viewState,
          activeTab: 'editor',
        },
      };
      const hydratedAudio = nextProject.audio
        ? await hydrateProjectAudioFromLocalStore(nextProject.audio) ?? await hydrateProjectAudio(nextProject.audio)
        : null;
      const loadStatus = hydratedAudio || !hydratedProject.audio
        ? successMessage
        : successMessage
          ? `${successMessage} Reattach the source audio if you need waveform and source-audio preview. Grid playback remains available.`
          : 'Reattach the source audio if you need waveform and source-audio preview. Grid playback remains available.';
      setProjectState(hydratedProject, loadStatus);
      syncSetupModalState(hydratedProject);
      resetHistory();
      if (hydratedAudio) {
        await applyAudioPresentation(hydratedAudio);
      } else {
        clearAudioPresentation();
      }
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
        serializeBoomwhackerVideoBuilderProject(savedProject),
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

    if (needsAudioReattach()) {
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

  function handleProjectInputChange(event: Event): void {
    const input = event.currentTarget as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }

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

  function buildAutosaveEnvelope(sourceProject: BoomwhackerVideoBuilderProject): AutosaveEnvelope {
    return {
      savedAtIso: new Date().toISOString(),
      project: buildAutosaveSnapshot(sourceProject),
    };
  }

  function clearPendingAutosaveWrite(): void {
    if (autosaveWriteTimeoutId !== null) {
      clearTimeout(autosaveWriteTimeoutId);
      autosaveWriteTimeoutId = null;
    }
  }

  function flushAutosaveWrite(): void {
    clearPendingAutosaveWrite();
    hasPendingAutosaveWrite = false;
    if (!hasInitializedAutosave || suppressAutosave || noteDragState !== null || noteResizeState !== null || noteBankPlacementState !== null || highwayEraseState !== null) {
      return;
    }
    try {
      const autosaveEnvelope = buildAutosaveEnvelope(project);
      localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(autosaveEnvelope));
    } catch (error) {
      console.warn('Boomwhacker Video Builder autosave write failed.', error);
    }
  }

  function queueAutosaveWrite(): void {
    if (!hasInitializedAutosave || suppressAutosave || noteDragState !== null || noteResizeState !== null || noteBankPlacementState !== null || highwayEraseState !== null) {
      return;
    }
    clearPendingAutosaveWrite();
    hasPendingAutosaveWrite = true;
    autosaveWriteTimeoutId = setTimeout(() => {
      autosaveWriteTimeoutId = null;
      flushAutosaveWrite();
    }, 450);
  }

  function parseAutosaveEnvelope(serializedValue: string): AutosaveEnvelope {
    const parsedValue = JSON.parse(serializedValue) as unknown;
    const parsedRecord = parsedValue !== null && typeof parsedValue === 'object' ? parsedValue as Record<string, unknown> : null;
    if (parsedRecord && parsedRecord.project !== undefined) {
      const savedAtIso = typeof parsedRecord.savedAtIso === 'string' ? parsedRecord.savedAtIso : null;
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

  async function restoreAutosave(): Promise<void> {
    suppressAutosave = true;
    try {
      const storedProject = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
      if (!storedProject) {
        return;
      }
      const autosaveEnvelope = parseAutosaveEnvelope(storedProject);
      await loadProjectIntoShell(autosaveEnvelope.project);
    } catch (error) {
      console.warn('Boomwhacker Video Builder autosave restore failed.', error);
      localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
    } finally {
      suppressAutosave = false;
      hasPendingAutosaveWrite = false;
      hasInitializedAutosave = true;
    }
  }

  function createNewProject(): void {
    resetPreviewTransport();
    selectedNoteIds = [];
    clipboardNotes = [];
    const nextProject = createBoomwhackerVideoBuilderProject();
    setProjectState(nextProject, 'Created a new empty project.');
    clearAudioPresentation();
    syncSetupModalState(nextProject);
    resetHistory();
  }

  function loadDemoChart(): void {
    resetPreviewTransport();
    selectedNoteIds = [];
    clipboardNotes = [];
    const demoProject = createSampleBoomwhackerVideoBuilderProject();
    setProjectState(demoProject, 'Loaded the demo chart.');
    syncSetupModalState(demoProject);
    clearAudioPresentation();
    resetHistory();
  }

  function getShapeOptionForShortcut(event: KeyboardEvent): typeof noteShapeOptions[number] | null {
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
      return null;
    }
    return noteShapeOptions.find((option) => event.key === option.shortcut || event.code === `Digit${option.shortcut}` || event.code === `Numpad${option.shortcut}`) ?? null;
  }

  function shouldIgnoreEditorShortcut(target: EventTarget | null): boolean {
    const element = target instanceof HTMLElement ? target : null;
    return Boolean(element?.closest('input, textarea, select, [contenteditable="true"]'));
  }

  function handleBeforeUnload(): void {
    flushAutosaveWrite();
  }

  function handleWindowKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || project.viewState.activeTab !== 'editor') {
      return;
    }
    if (event.key === 'Escape' && (volumePopupOpen || projectMenuOpen)) {
      event.preventDefault();
      closeVolumePopup();
      closeProjectMenu();
      return;
    }
    if (shouldIgnoreEditorShortcut(event.target)) {
      return;
    }
    const modifierKey = event.metaKey || event.ctrlKey;
    const normalizedKey = event.key.toLowerCase();
    const hasSelectedNotes = selectedNoteIds.length > 0;
    const measureBeatStep = Math.max(1, project.songTiming.timeSignatureNumerator);
    const shortcutShapeOption = getShapeOptionForShortcut(event);

    if (shortcutShapeOption) {
      event.preventDefault();
      setActiveShapeTool(shortcutShapeOption.shape);
      statusMessage = `${shortcutShapeOption.label} note tool selected.`;
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
    if (modifierKey && normalizedKey === 'x') {
      event.preventDefault();
      cutSelectedNotes();
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
      if (hasSelectedNotes) {
        moveSelectedNotes(0, event.shiftKey ? -4 : -1);
      } else {
        moveHighwayCursor(0, event.shiftKey ? -measureBeatStep : -1);
      }
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      if (hasSelectedNotes) {
        moveSelectedNotes(0, event.shiftKey ? 4 : 1);
      } else {
        moveHighwayCursor(0, event.shiftKey ? measureBeatStep : 1);
      }
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (hasSelectedNotes) {
        moveSelectedNotes(-1, 0);
      } else {
        moveHighwayCursor(1, 0);
      }
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (hasSelectedNotes) {
        moveSelectedNotes(1, 0);
      } else {
        moveHighwayCursor(-1, 0);
      }
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

  function handleCompactWaveformClick(event: MouseEvent): void {
    if (busyMessage || previewScrubState) {
      return;
    }
    const nextTimeSec = getTimelineTimeSecFromClientX(event.clientX);
    seekPreview(nextTimeSec, previewIsPlaying ? undefined : `Playback moved to ${formatSeconds(nextTimeSec)}.`);
  }

  function handleCompactWaveformKeyDown(event: KeyboardEvent): void {
    if (busyMessage) {
      return;
    }
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
      seekPreview(previewDurationSec, `Playback moved to ${formatSeconds(previewDurationSec)}.`);
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
    if (busyMessage || previewScrubState || previewDurationSec <= 0) {
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
    seekPreview(nextTimeSec, startPlaybackOnRelease ? undefined : `Playback moved to ${formatSeconds(nextTimeSec)}.`);
    if (startPlaybackOnRelease) {
      void playPreview();
    }
  }

  function handleHighwayStageKeyDown(event: KeyboardEvent): void {
    if (isEditorInteractionBlocked() || previewIsPlaying || highwayEditorTool !== 'place' || activeNoteShape === null || (event.key !== 'Enter' && event.key !== ' ')) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const cursorBeatSpan = getSelectedBeatSpan();
    placeNoteAtSlot(activePlacementRow, cursorBeatSpan?.startSlotIndex ?? getSlotIndexForTimeSec(previewCurrentTimeSec));
  }

  onMount(() => {
    window.addEventListener('keydown', handleWindowKeydown);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('pointerdown', handleDocumentPointerDownForPopups);
    void restoreAutosave();
  });

  onDestroy(() => {
    flushAutosaveWrite();
    finishHighwayErase();
    previewSynth.dispose();
    cancelPreviewAnimation();
    if (highwayZoomPreviewTimeoutId !== null) {
      clearTimeout(highwayZoomPreviewTimeoutId);
      highwayZoomPreviewTimeoutId = null;
    }
    window.removeEventListener('keydown', handleWindowKeydown);
    window.removeEventListener('beforeunload', handleBeforeUnload);
    document.removeEventListener('pointerdown', handleDocumentPointerDownForPopups);
    replaceAudioPreviewUrl(null);
  });

  $: {
    const audioVolume = clampPreviewVolume(project.previewState.audioVolume);
    if (previewAudioPlayer) {
      previewAudioPlayer.volume = audioVolume;
    }
  }
  $: previewSynth.setMasterVolume(project.previewState.synthVolume);
  $: timing = deriveTimingModel(project.songTiming, project.grid);
  $: waveformDurationSec = project.audio?.durationSec ?? timing.totalDurationSec;
  $: isEditorPlaybackActive = project.viewState.activeTab === 'editor' && previewIsPlaying;
  $: editorBaseLaneHeightPx = getEditorBaseLaneHeightForViewport(viewportHeightPx, isEditorPlaybackActive, topToolbarHeightPx);
  $: editorLaneHeightPx = isEditorPlaybackActive
    ? editorBaseLaneHeightPx
    : getZoomedEditorLaneHeight(editorBaseLaneHeightPx, project.viewState.zoom);
  $: previewStartTimeSec = Math.min(0, timing.countInStartTimeSec);
  $: previewDurationSec = Math.max(project.audio?.durationSec ?? 0, timing.totalDurationSec);
  $: editorHighwayPixelsPerSecond = editorLaneHeightPx / Math.max(
    0.001,
    timing.secondsPerBeat > 0 ? timing.secondsPerBeat : 60 / Math.max(TEMPO_MIN_BPM, project.songTiming.tempoBpm),
  );
  $: editorHighwayLeadingPaddingPx = Math.max(1, editorHighwayViewportWidthPx) * 0.24;
  $: editorHighwayTrailingPaddingPx = Math.max(0, Math.max(1, editorHighwayViewportWidthPx) - editorHighwayLeadingPaddingPx);
  $: editorHighwayLayoutContext = {
    laneHeightPx: editorLaneHeightPx,
    pixelsPerSecond: editorHighwayPixelsPerSecond,
    leadingPaddingPx: editorHighwayLeadingPaddingPx,
    previewStartTimeSec,
  };
  $: editorHighwayDurationSec = Math.max(0, Math.max(previewDurationSec, timing.totalDurationSec) - previewStartTimeSec);
  $: editorHighwayStageWidthPx = Math.max(
    Math.max(1, editorHighwayViewportWidthPx),
    Math.ceil((editorHighwayDurationSec * editorHighwayPixelsPerSecond) + editorHighwayLeadingPaddingPx + editorHighwayTrailingPaddingPx),
  );
  $: guides = deriveGuideLines(timing);
  $: highwayGuides = getVisibleHighwayGuides(guides);
  $: activeJudgmentBeatSpan = getActiveHighwayBeatSpan(timing, previewCurrentTimeSec);
  $: selectedBeatSpan = timing.beatSpans[Math.max(0, Math.min(timing.beatSpans.length - 1, project.viewState.selectedBeatIndex))] ?? null;
  $: {
    const playbackStartBeatIndex = project.viewState.playbackStartBeatIndex;
    playbackStartBeatSpan = playbackStartBeatIndex === null || playbackStartBeatIndex === undefined || timing.beatSpans.length === 0
      ? null
      : timing.beatSpans[Math.max(0, Math.min(timing.beatSpans.length - 1, playbackStartBeatIndex))] ?? null;
  }
  $: activeHighwayPlacementPreview = noteBankPlacementState?.preview ?? (
    highwayEditorTool === 'place' && !highwayTemporaryEraserActive && highwayEraseState === null ? highwayHoverPreview : null
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
  $: activePlaybackHighlights = getActiveHighwayPlaybackHighlights(
    timedNotes,
    editorHighwayLayoutContext,
    previewCurrentTimeSec,
    previewIsPlaying,
    project.previewState.playGrid,
  );
  $: selectedNotes = sortGridNotes(project.notes.placedNotes.filter((note) => selectedNoteIds.includes(note.id)));
  $: if (selectedNoteIds.some((noteId) => !project.notes.placedNotes.some((note) => note.id === noteId))) {
    selectedNoteIds = selectedNoteIds.filter((noteId) => project.notes.placedNotes.some((note) => note.id === noteId));
  }
  $: if (project.viewState.activeTab !== 'editor' && previewIsPlaying) {
    pausePreview('Playback paused while leaving the Highway tab.');
  }
  $: if (previewCurrentTimeSec > previewDurationSec) {
    previewCurrentTimeSec = clampPreviewTimeSec(previewCurrentTimeSec);
    syncPreviewClockAnchor();
  }
  $: if (previewCurrentTimeSec < previewStartTimeSec) {
    previewCurrentTimeSec = previewStartTimeSec;
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
  $: if (hasInitializedAutosave && !suppressAutosave && noteDragState === null && noteResizeState === null && noteBankPlacementState === null && highwayEraseState === null) {
    queueAutosaveWrite();
  }
</script>

<svelte:head>
  <title>Boomwhacker Video Builder</title>
</svelte:head>

<svelte:window bind:innerHeight={viewportHeightPx} />

<div class="builder-shell" class:playback-active={isEditorPlaybackActive}>
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

  <header class="top-toolbar" class:playback-compact={isEditorPlaybackActive} bind:clientHeight={topToolbarHeightPx}>
    <div class="top-toolbar__brand">
      <div class="top-toolbar__brand-row">
        <p class="eyebrow">Boomwhacker Video Builder</p>
      </div>
      <p class="top-toolbar__meta">
        {project.metadata.title || 'Untitled Boomwhacker Video'} &middot; {formatTempo(project.songTiming.tempoBpm)}
      </p>
    </div>

    <div class="top-toolbar__actions">
      {#if project.viewState.activeTab === 'editor' && !isEditorPlaybackActive}
        <div class="tempo-inline-group bvb-tempo-panel">
          <div class="tempo-stack">
            <div class="tempo-left-stack">
              <TempoControls
                quarterTempo={project.songTiming.tempoBpm}
                minQuarter={TEMPO_MIN_BPM}
                maxQuarter={TEMPO_MAX_BPM}
                step={1}
                sliderOrientation="vertical"
                onchange={handleQuarterTempoChange}
                showEighth={false}
                showQuarter={true}
                showDottedQuarter={false}
                showRows={true}
                showSlider={false}
              />
              <div class="tempo-shortcut-buttons" aria-label="Tempo shortcuts">
                {#each TEMPO_SHORTCUT_VALUES as tempoValue}
                  <button
                    type="button"
                    class:active={project.songTiming.tempoBpm === tempoValue}
                    aria-pressed={project.songTiming.tempoBpm === tempoValue}
                    on:click={() => setQuarterTempoShortcut(tempoValue)}
                  >
                    {tempoValue}
                  </button>
                {/each}
              </div>
            </div>
            <div class="tempo-slider-column">
              <TempoControls
                quarterTempo={project.songTiming.tempoBpm}
                minQuarter={TEMPO_MIN_BPM}
                maxQuarter={TEMPO_MAX_BPM}
                step={1}
                sliderOrientation="vertical"
                onchange={handleQuarterTempoChange}
                showEighth={false}
                showQuarter={false}
                showDottedQuarter={false}
                showRows={false}
                showSlider={true}
              />
            </div>
          </div>
        </div>
      {/if}

      <div class="project-menu-wrapper" bind:this={projectMenuWrapper}>
        <button
          type="button"
          class="project-menu-button"
          class:active={projectMenuOpen}
          title="Project menu"
          aria-label="Open project menu"
          aria-expanded={projectMenuOpen}
          aria-haspopup="menu"
          aria-controls="project-menu"
          on:click={handleProjectMenuIconClick}
        >
          <img src={studentNotationSettingsIconHref} alt="" class="project-menu-button__icon" />
        </button>
        {#if projectMenuOpen}
          <div id="project-menu" class="project-menu" role="menu" aria-label="Project menu">
            <button type="button" class="project-menu__item" disabled={Boolean(busyMessage)} on:click={() => runProjectMenuAction(createNewProject)} role="menuitem">
              <img src={studentNotationNewPageIconHref} alt="" class="project-menu__icon" />
              <span>New</span>
            </button>
            <button type="button" class="project-menu__item" disabled={Boolean(busyMessage)} on:click={() => runProjectMenuAction(openSetupModal)} role="menuitem">
              <img src={studentNotationSettingsIconHref} alt="" class="project-menu__icon" />
              <span>Setup</span>
            </button>
            <button type="button" class="project-menu__item" disabled={Boolean(busyMessage)} on:click={() => runProjectMenuAction(saveProject)} role="menuitem">
              <img src={studentNotationSaveAsIconHref} alt="" class="project-menu__icon" />
              <span>Save</span>
            </button>
            <button type="button" class="project-menu__item" disabled={Boolean(busyMessage)} on:click={() => runProjectMenuAction(openProjectFilePicker)} role="menuitem">
              <img src={studentNotationOpenIconHref} alt="" class="project-menu__icon" />
              <span>Load</span>
            </button>
            <button
              type="button"
              class="project-menu__item"
              class:active={project.viewState.activeTab === 'export'}
              disabled={Boolean(busyMessage)}
              on:click={() => runProjectMenuAction(toggleEditorExportTab)}
              role="menuitem"
            >
              <img src={studentNotationPrintIconHref} alt="" class="project-menu__icon" />
              <span>{project.viewState.activeTab === 'export' ? 'Editor' : 'Export'}</span>
            </button>
            <a class="project-menu__item" href={hubHref} role="menuitem">
              <img src={homeIconHref} alt="" class="project-menu__icon" />
              <span>Home</span>
            </a>
          </div>
        {/if}
      </div>
    </div>

    {#if project.viewState.activeTab === 'editor'}
      <div class="top-toolbar__editor-bar" aria-label="Editor tools">
        <div class="top-toolbar__editor-center">
          <div class="shape-tool-bank" role="group" aria-label="Generic highway shape tools">
            {#each noteShapeOptions as option}
              <button
                type="button"
                class="shape-tool-button"
                class:is-active-shape-tool={activeNoteShape === option.shape && highwayEditorTool === 'place'}
                title={`${activeNoteShape === option.shape && highwayEditorTool === 'place' ? `Unselect ${option.label}` : option.label} (${option.shortcut})`}
                aria-label={activeNoteShape === option.shape && highwayEditorTool === 'place' ? `Unselect ${option.label} tool` : `Select ${option.label} tool`}
                aria-pressed={activeNoteShape === option.shape && highwayEditorTool === 'place'}
                on:click={() => toggleActiveShapeTool(option.shape)}
                on:mousedown={(event) => {
                  if (activeNoteShape === option.shape && highwayEditorTool === 'place') {
                    return;
                  }
                  startNoteBankPlacement(event, option.shape);
                }}
              >
                <span class={`shape-tool-button__glyph shape-${option.shape}`} aria-hidden="true">
                  <HighwayNoteGlyph shape={option.shape} showLabel={false} />
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
            <button type="button" class:active={project.previewState.playAudio} disabled={!audioPreviewUrl && !project.previewState.playAudio} on:click={togglePlaybackAudio}>
              Audio
            </button>
            <button type="button" class:active={project.previewState.playGrid} on:click={togglePlaybackGrid}>
              Grid
            </button>
          </div>
          <div class="volume-control-wrapper" bind:this={volumeControlWrapper}>
            <button
              type="button"
              class="preview-transport-button volume-icon-button"
              class:active={volumePopupOpen}
              title="Volume"
              aria-label="Volume"
              aria-expanded={volumePopupOpen}
              aria-controls="preview-volume-popup"
              on:click={handleVolumeIconClick}
            >
              <img src={volumeIconHref} alt="" class="preview-transport-icon" />
            </button>
            <div id="preview-volume-popup" class="volume-popup" class:visible={volumePopupOpen}>
              <label class="volume-popup-control">
                <span class="range-field__label">Source audio</span>
                <input
                  class="volume-slider"
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

              <label class="volume-popup-control">
                <span class="range-field__label">Canvas notes</span>
                <input
                  class="volume-slider"
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
          </div>
          <button type="button" class="ghost-button" disabled={Boolean(busyMessage)} on:click={loadDemoChart}>
            Demo chart
          </button>
          <button type="button" class="ghost-button ghost-button--icon" disabled={previewDurationSec <= 0} aria-label="Zoom out" title="Zoom out" on:click={() => void zoomHighwayBy(0.8)}>
            <img src={studentNotationZoomOutIconHref} alt="" class="toolbar-icon" />
          </button>
          <button type="button" class="ghost-button ghost-button--icon" disabled={previewDurationSec <= 0} aria-label="Zoom in" title="Zoom in" on:click={() => void zoomHighwayBy(1.25)}>
            <img src={studentNotationZoomInIconHref} alt="" class="toolbar-icon" />
          </button>
          <button type="button" class="ghost-button" disabled={previewDurationSec <= 0} on:click={() => void fitHighwayToSong()}>
            Fit song
          </button>
        </div>
      </div>
    {/if}
  </header>

  <p class="visually-hidden" aria-live="polite">{busyMessage || statusMessage}</p>

  {#if isSetupModalOpen}
    <div class="modal-backdrop">
      <button type="button" class="modal-backdrop__dismiss" aria-label="Close setup modal" on:click={closeSetupModal}></button>
      <div class="modal-card" role="dialog" tabindex="-1" aria-modal="true" aria-labelledby="setup-modal-title">
        <div class="panel__header">
          <p class="panel__eyebrow">Project Setup</p>
          <h2 id="setup-modal-title">Song + Timing</h2>
        </div>

        <div class="export-grid">
          <label class="field">
            <span class="field__label">Project title</span>
            <input class="text-input" type="text" value={setupModalTitle} on:input={handleSetupTitleInput} />
          </label>

          <div class="field">
            <span class="field__label">Audio file</span>
            <div class="modal-audio-box">
              <strong>{pendingSetupAudioFile?.name ?? getProjectAudioSummary()}</strong>
              <button type="button" class="action-button action-button--small" disabled={Boolean(busyMessage)} on:click={promptSetupAudioSelection}>
                {pendingSetupAudioFile || project.audio ? 'Choose different audio' : 'Choose audio file'}
              </button>
            </div>
          </div>
        </div>

        <div class="panel__subsection">
          <p class="panel__eyebrow">Constant Song Timing</p>
          <div class="export-grid">
            <label class="field">
              <span class="field__label">Tempo BPM</span>
              <input
                class="text-input"
                type="number"
                min={TEMPO_MIN_BPM}
                max={TEMPO_MAX_BPM}
                step="1"
                value={setupModalTempoBpm}
                on:change={(event) => {
                  setupModalTempoBpm = clampTempoBpm(Number((event.currentTarget as HTMLInputElement).value));
                }}
              />
            </label>
            <label class="field">
              <span class="field__label">First beat offset</span>
              <input
                class="text-input"
                type="number"
                min="0"
                step="0.01"
                value={setupModalFirstBeatOffsetSec}
                on:change={(event) => {
                  setupModalFirstBeatOffsetSec = clampFirstBeatOffsetSec(Number((event.currentTarget as HTMLInputElement).value));
                }}
              />
            </label>
            <label class="field">
              <span class="field__label">Beats</span>
              <input
                class="text-input"
                type="number"
                min={BEAT_COUNT_MIN}
                max={BEAT_COUNT_MAX}
                step="1"
                value={setupModalBeatCount}
                on:change={(event) => {
                  setupModalBeatCount = clampBeatCount(Number((event.currentTarget as HTMLInputElement).value));
                }}
              />
            </label>
            <label class="field">
              <span class="field__label">Count-in beats</span>
              <input
                class="text-input"
                type="number"
                min={COUNT_IN_BEATS_MIN}
                max={COUNT_IN_BEATS_MAX}
                step="1"
                value={setupModalCountInBeats}
                on:change={(event) => {
                  setupModalCountInBeats = clampCountInBeats(Number((event.currentTarget as HTMLInputElement).value));
                }}
              />
            </label>
            <label class="field">
              <span class="field__label">Time signature beats</span>
              <input
                class="text-input"
                type="number"
                min={TIME_SIGNATURE_NUMERATOR_MIN}
                max={TIME_SIGNATURE_NUMERATOR_MAX}
                step="1"
                value={setupModalTimeSignatureNumerator}
                on:change={(event) => {
                  setupModalTimeSignatureNumerator = clampTimeSignatureNumerator(Number((event.currentTarget as HTMLInputElement).value));
                }}
              />
            </label>
            <label class="field">
              <span class="field__label">Time signature note</span>
              <select
                class="text-input"
                value={setupModalTimeSignatureDenominator}
                on:change={(event) => {
                  setupModalTimeSignatureDenominator = clampTimeSignatureDenominator(Number((event.currentTarget as HTMLSelectElement).value));
                }}
              >
                {#each TIME_SIGNATURE_DENOMINATORS as denominator}
                  <option value={denominator}>{denominator}</option>
                {/each}
              </select>
            </label>
            <label class="field">
              <span class="field__label">Subdivision feel</span>
              <select class="text-input" bind:value={setupModalGrouping}>
                <option value={2}>2-based</option>
                <option value={3}>3-based</option>
              </select>
            </label>
          </div>
        </div>

        <div class="modal-card__actions">
          <button type="button" class="ghost-button" on:click={closeSetupModal}>Cancel</button>
          <button type="button" class="ghost-button" disabled={Boolean(pendingSetupAudioFile) || !project.audio} on:click={setSetupBeatCountToAudioDuration}>
            Fit beats to current audio
          </button>
          <button type="button" class="action-button action-button--primary" disabled={Boolean(busyMessage)} on:click={() => void applySetupModal()}>
            {pendingSetupAudioFile ? 'Import Audio' : 'Apply Setup'}
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if errorMessage}
    <p class="banner banner--error">{errorMessage}</p>
  {/if}

  {#if project.viewState.activeTab === 'editor'}
    <section class="workspace editor-preview-workspace">
      <article class="panel panel--highway">
        {#if audioPreviewUrl}
          <audio bind:this={previewAudioPlayer} class="visually-hidden" preload="metadata" src={audioPreviewUrl} on:ended={handlePreviewAudioEnded}></audio>
        {/if}

        <div class="highway-shell">
          {#if highwayZoomPreview}
            <div class="highway-shell__zoom-preview" aria-live="polite">
              Zoom {highwayZoomPreview}
            </div>
          {/if}
          <div class="highway">
            <div
              class="highway__labels"
              style={`--lane-height:${editorLaneHeightPx}px;--lane-label-font-size:${Math.min(16, Math.max(4, editorLaneHeightPx * 0.38))}px;`}
            >
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
                class:is-cursor-selecting={isHighwayCursorToolActive()}
                on:wheel={handleTimelineWheel}
              >
                <div
                  bind:this={editorHighwayStage}
                  class="highway__stage highway__stage--editor"
                  class:hide-note-outlines={!project.viewState.showNoteOutlines}
                  role="button"
                  tabindex="0"
                  aria-label="Editable boomwhacker note highway"
                  style={`height:${BOOMWHACKER_LANES.length * editorLaneHeightPx}px;width:${editorHighwayStageWidthPx}px;--lane-height:${editorLaneHeightPx}px;`}
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
                      style={`top:${getVisualLaneRow(lane.row) * editorLaneHeightPx}px;height:${editorLaneHeightPx}px;`}
                      aria-hidden="true"
                    ></div>
                  {/each}

                  {#if playbackStartBeatSpan}
                    <span class="highway__playback-start-measure" style={playbackStartMeasureStyle(playbackStartBeatSpan, editorHighwayLayoutContext)} aria-hidden="true"></span>
                  {/if}

                  {#if selectedBeatSpan}
                    <span class="highway__selected-beat" style={selectedBeatStyle(selectedBeatSpan, editorHighwayLayoutContext)} aria-hidden="true"></span>
                    <span
                      class="highway__cursor-cell"
                      style={highwayCursorCellStyle(selectedBeatSpan, activePlacementRow, editorHighwayLayoutContext)}
                      aria-hidden="true"
                    ></span>
                  {/if}

                  {#each highwayGuides as guide (guide.id)}
                    <span
                      class="highway__guide"
                      class:is-beat={shouldRenderGuideAsBeat(guide)}
                      class:is-measure={guide.kind === 'measure'}
                      class:is-playback-start-measure={playbackStartBeatSpan?.beatIndex === guide.beatIndex}
                      class:is-count-in={guide.kind === 'count-in'}
                      class:is-subdivision={guide.kind === 'subdivision'}
                      style={highwayGuideStyle(guide.timeSec, editorHighwayLayoutContext)}
                    >
                      {#if guide.kind === 'count-in' && guide.label}
                        <span class="highway__guide-label highway__guide-label--count-in">{guide.label}</span>
                      {:else if guide.kind === 'measure' && project.viewState.showMeasureLabels && guide.label}
                        <button
                          type="button"
                          class="highway__guide-label highway__guide-label--measure"
                          class:is-playback-start={playbackStartBeatSpan?.beatIndex === guide.beatIndex}
                          disabled={previewIsPlaying}
                          aria-pressed={playbackStartBeatSpan?.beatIndex === guide.beatIndex}
                          aria-label={`Start playback at measure ${guide.label}`}
                          title={`Start playback at measure ${guide.label}`}
                          on:pointerdown={handleMeasureLabelPointerDown}
                          on:click={(event) => handleMeasureLabelClick(event, guide.beatIndex, guide.label)}
                        >
                          M{guide.label}
                        </button>
                      {/if}
                    </span>
                  {/each}

                  {#each activePlaybackHighlights as highlight (highlight.id)}
                    <span
                      class="highway__playback-highlight"
                      style={highwayPlaybackHighlightStyle(highlight)}
                      aria-hidden="true"
                    ></span>
                  {/each}

                  {#each timedNotes as note (note.id)}
                    {@const noteLayout = getHighwayNoteLayoutForNote(note, editorHighwayLayoutContext)}
                    {@const isSustainedCircle = isSustainedCircleNote(note)}
                    <button
                      type="button"
                      class="highway__note"
                      class:is-selected={selectedNoteIds.includes(note.id)}
                      class:is-crossing={project.previewState.playGrid && note.startTimeSec <= previewCurrentTimeSec && note.endTimeSec >= previewCurrentTimeSec}
                      class:is-past={note.endTimeSec < previewCurrentTimeSec}
                      class:is-resize-hotspot={resizeHotspotNoteId === note.id}
                      class:shape-circle={note.shape === 'circle'}
                      class:shape-oval={note.shape === 'oval'}
                      class:shape-diamond={note.shape === 'diamond'}
                      class:is-sustained-circle={isSustainedCircle}
                      data-note-id={note.id}
                      style={`${highwayNoteStyle(noteLayout)}--token-color:${note.color};`}
                      title={`${note.noteId} - ${formatSeconds(note.startTimeSec)} to ${formatSeconds(note.endTimeSec)}`}
                      aria-label={`${note.noteId} note from ${formatSeconds(note.startTimeSec)} to ${formatSeconds(note.endTimeSec)}`}
                      on:click={(event) => handleNoteClick(event, note.id)}
                      on:mousedown={(event) => handleNotePointerDown(event, note)}
                      on:mousemove={(event) => updateNoteHoverCursor(event, note)}
                      on:mouseleave={() => clearNoteHoverCursor(note.id)}
                    >
                      <HighwayNoteGlyph shape={note.shape} label={note.label} markerClass={laneClass(note.marker)} showLabel={noteLayout.showLabel} sustained={isSustainedCircle} />
                    </button>
                  {/each}

                  {#if activeHighwayPlacementPreview}
                    {@const previewLane = getLaneByRow(activeHighwayPlacementPreview.row)}
                    {@const previewStyle = getPlacementPreviewStyle(activeHighwayPlacementPreview, editorHighwayLayoutContext)}
                    <span
                      class="highway__note highway__note--ghost"
                      class:shape-circle={activeHighwayPlacementPreview.shape === 'circle'}
                      class:shape-oval={activeHighwayPlacementPreview.shape === 'oval'}
                      class:shape-diamond={activeHighwayPlacementPreview.shape === 'diamond'}
                      style={`${previewStyle}--token-color:${previewLane?.color ?? '#ffffff'};`}
                      aria-hidden="true"
                    >
                      <HighwayNoteGlyph
                        shape={activeHighwayPlacementPreview.shape}
                        label={previewLane?.label ?? ''}
                        markerClass={laneClass(previewLane?.marker ?? 'none')}
                        sustained={false}
                      />
                    </span>
                  {/if}

                  {#if highwayEraserPreview}
                    <span class="highway__eraser-preview" style={getHighwayEraserPreviewStyle(highwayEraserPreview)} aria-hidden="true"></span>
                  {/if}

                  {#if noteBoxSelectionState?.hasMoved}
                    <div class="highway__selection-box" style={getRelativeSelectionBoxStyle(noteBoxSelectionState)} aria-hidden="true"></div>
                  {/if}

                  {#if activeJudgmentBeatSpan && !isEditorPlaybackActive}
                    <span class="highway__judgment-area" style={judgmentAreaStyle(activeJudgmentBeatSpan, editorHighwayLayoutContext)} aria-hidden="true"></span>
                  {/if}
                </div>
                <div class="highway__measure-gutter" style={`width:${editorHighwayStageWidthPx}px;`}>
                  <div class="highway__measure-actions" aria-label="Measure controls" on:pointerdown={(event) => event.stopPropagation()}>
                    <button type="button" on:click={deleteMeasure} disabled={!canDeleteMeasure()} title="Delete measure" aria-label="Delete measure">-</button>
                    <button type="button" on:click={addMeasure} disabled={!canAddMeasure()} title="Add measure" aria-label="Add measure">+</button>
                  </div>
                </div>
              </div>
              {#if activeJudgmentBeatSpan && isEditorPlaybackActive}
                <span class="highway__judgment-area highway__judgment-area--overlay" style={judgmentAreaStyle(activeJudgmentBeatSpan, editorHighwayLayoutContext, true)} aria-hidden="true"></span>
              {/if}
            </div>
          </div>
        </div>

        <div class="panel__subsection panel__subsection--waveform">
          {#if waveformPeaks.length > 0}
            <div class="compact-waveform">
              <div bind:this={compactWaveformViewport} class="compact-waveform__viewport" on:wheel={handleTimelineWheel}>
                <div class="compact-waveform__timeline-wrap" style={`width:${Math.max(100, project.viewState.zoom * 100)}%;`}>
                  <div
                    class="compact-waveform__timeline"
                    role="button"
                    tabindex="0"
                    aria-label="Playback waveform transport"
                    style={`height:${COMPACT_WAVEFORM_HEIGHT_PX}px;`}
                    on:click={handleCompactWaveformClick}
                    on:keydown={handleCompactWaveformKeyDown}
                  >
                    <div class="waveform-bars compact-waveform__bars" style={`--waveform-bar-count:${waveformPeaks.length};`}>
                      {#each waveformPeaks as peak}
                        <span class="waveform-bars__bar" style={`height:${Math.max(8, peak * 100)}%;`}></span>
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
                <span class="compact-waveform__readout">{formatSeconds(previewCurrentTimeSec)} / {formatSeconds(previewDurationSec)}</span>
              </div>
            </div>
          {:else}
            <div class="empty-state empty-state--compact">
              <p>{getProjectAudioSummary()}</p>
              <button type="button" class="ghost-button" on:click={openSetupModal}>Setup song timing</button>
            </div>
          {/if}
        </div>

        <div class="panel__subsection">
          <p class="panel__eyebrow">Audio Processing</p>
          <div class="summary-grid summary-grid--editor">
            <div>
              <span>Transpose</span>
              <strong>{formatSemitones(project.audioProcessing.transposeSemitones)}</strong>
            </div>
            <div>
              <span>Preview</span>
              <strong>{project.previewState.previewOriginalAudio ? 'Original' : 'Transposed'}</strong>
            </div>
            <div>
              <span>Export audio</span>
              <strong>{project.exportState.includeSynthPlayback ? 'Transposed + boomwhackers' : 'Transposed only'}</strong>
            </div>
          </div>

          <div class="export-grid">
            <label class="range-field">
              <span class="range-field__label">Transpose audio</span>
              <input
                type="range"
                min={TRANSPOSE_MIN_SEMITONES}
                max={TRANSPOSE_MAX_SEMITONES}
                step="1"
                value={project.audioProcessing.transposeSemitones}
                disabled={!sourceAudioBuffer}
                on:input={(event) => updateTransposeSemitones(Number((event.currentTarget as HTMLInputElement).value))}
              />
              <strong>{formatSemitones(project.audioProcessing.transposeSemitones)}</strong>
            </label>
            <label class="field">
              <span class="field__label">Semitones</span>
              <input
                class="text-input"
                type="number"
                min={TRANSPOSE_MIN_SEMITONES}
                max={TRANSPOSE_MAX_SEMITONES}
                step="1"
                value={project.audioProcessing.transposeSemitones}
                disabled={!sourceAudioBuffer}
                on:change={(event) => updateTransposeSemitones(Number((event.currentTarget as HTMLInputElement).value))}
              />
            </label>
          </div>

          <div class="action-row action-row--stack">
            <button type="button" class="ghost-button" class:is-active-toolbar={project.previewState.previewOriginalAudio} disabled={!sourceAudioBuffer} on:click={togglePreviewOriginalAudio}>
              {project.previewState.previewOriginalAudio ? 'Preview transposed audio' : 'Preview original audio'}
            </button>
            <label class="checkbox">
              <input
                type="checkbox"
                checked={project.previewState.includeSynthPlayback}
                on:change={(event) => updatePreviewState({ includeSynthPlayback: (event.currentTarget as HTMLInputElement).checked }, (event.currentTarget as HTMLInputElement).checked ? 'Preview boomwhacker playback enabled.' : 'Preview boomwhacker playback disabled.')}
              />
              <span>Preview boomwhacker sounds</span>
            </label>
          </div>
        </div>

        <div class="panel__subsection">
          <p class="panel__eyebrow">Song Timing</p>
          <div class="summary-grid summary-grid--editor">
            <div>
              <span>Tempo</span>
              <strong>{formatTempo(project.songTiming.tempoBpm)}</strong>
            </div>
            <div>
              <span>First beat</span>
              <strong>{formatSeconds(project.songTiming.firstBeatOffsetSec)}</strong>
            </div>
            <div>
              <span>Beats</span>
              <strong>{project.songTiming.beatCount}</strong>
            </div>
            <div>
              <span>Subdivision</span>
              <strong>{project.grid.defaultMacrobeatGrouping}-based</strong>
            </div>
            <div>
              <span>Count-in</span>
              <strong>{project.songTiming.countInBeats} beats</strong>
            </div>
            <div>
              <span>Signature</span>
              <strong>{project.songTiming.timeSignatureNumerator}/{project.songTiming.timeSignatureDenominator}</strong>
            </div>
          </div>

          <div class="export-grid">
            <label class="field">
              <span class="field__label">Tempo BPM</span>
              <input
                class="text-input"
                type="number"
                min={TEMPO_MIN_BPM}
                max={TEMPO_MAX_BPM}
                step="1"
                value={project.songTiming.tempoBpm}
                on:change={(event) => updateSongTiming({ tempoBpm: Number((event.currentTarget as HTMLInputElement).value) }, 'Updated song tempo.')}
              />
            </label>
            <label class="field">
              <span class="field__label">First beat offset</span>
              <input
                class="text-input"
                type="number"
                min="0"
                step="0.01"
                value={project.songTiming.firstBeatOffsetSec}
                on:change={(event) => updateSongTiming({ firstBeatOffsetSec: Number((event.currentTarget as HTMLInputElement).value) }, 'Updated first beat offset.')}
              />
            </label>
            <label class="field">
              <span class="field__label">Beats</span>
              <input
                class="text-input"
                type="number"
                min={BEAT_COUNT_MIN}
                max={BEAT_COUNT_MAX}
                step="1"
                value={project.songTiming.beatCount}
                on:change={(event) => updateSongTiming({ beatCount: Number((event.currentTarget as HTMLInputElement).value) }, 'Updated song length.')}
              />
            </label>
            <label class="field">
              <span class="field__label">Count-in beats</span>
              <input
                class="text-input"
                type="number"
                min={COUNT_IN_BEATS_MIN}
                max={COUNT_IN_BEATS_MAX}
                step="1"
                value={project.songTiming.countInBeats}
                on:change={(event) => updateSongTiming({ countInBeats: Number((event.currentTarget as HTMLInputElement).value) }, 'Updated count-in.')}
              />
            </label>
            <label class="field">
              <span class="field__label">Measure beats</span>
              <input
                class="text-input"
                type="number"
                min={TIME_SIGNATURE_NUMERATOR_MIN}
                max={TIME_SIGNATURE_NUMERATOR_MAX}
                step="1"
                value={project.songTiming.timeSignatureNumerator}
                on:change={(event) => updateSongTiming({ timeSignatureNumerator: Number((event.currentTarget as HTMLInputElement).value) }, 'Updated time signature.')}
              />
            </label>
            <label class="field">
              <span class="field__label">Beat note</span>
              <select
                class="text-input"
                value={project.songTiming.timeSignatureDenominator}
                on:change={(event) => updateSongTiming({ timeSignatureDenominator: Number((event.currentTarget as HTMLSelectElement).value) }, 'Updated time signature.')}
              >
                {#each TIME_SIGNATURE_DENOMINATORS as denominator}
                  <option value={denominator}>{denominator}</option>
                {/each}
              </select>
            </label>
            <label class="field">
              <span class="field__label">Subdivision feel</span>
              <select
                class="text-input"
                value={project.grid.defaultMacrobeatGrouping}
                on:change={(event) => {
                  const grouping = Number((event.currentTarget as HTMLSelectElement).value) === 3 ? 3 : 2;
                  setProjectState(
                    touchProject({
                      ...project,
                      grid: {
                        defaultMacrobeatGrouping: grouping,
                      },
                    }),
                    `Set the chart to ${grouping}-based subdivision.`,
                    { recordHistory: true },
                  );
                }}
              >
                <option value={2}>2-based</option>
                <option value={3}>3-based</option>
              </select>
            </label>
          </div>

          <div class="action-row">
            <button type="button" class="ghost-button" disabled={!project.audio} on:click={fitBeatCountToAudio}>Fit beats to audio</button>
            <label class="checkbox">
              <input
                type="checkbox"
                checked={project.viewState.showMeasureLabels}
                on:change={(event) => updateViewState({ showMeasureLabels: (event.currentTarget as HTMLInputElement).checked })}
              />
              <span>Measure labels</span>
            </label>
            <label class="checkbox">
              <input
                type="checkbox"
                checked={project.viewState.showNoteOutlines}
                on:change={(event) => updateViewState({ showNoteOutlines: (event.currentTarget as HTMLInputElement).checked })}
              />
              <span>Note outlines</span>
            </label>
          </div>
        </div>
      </article>
    </section>
  {/if}

  {#if project.viewState.activeTab === 'export'}
    <section class="workspace workspace--export">
      <article class="panel panel--wide">
        <div class="panel__header">
          <p class="panel__eyebrow">Frame Renderer</p>
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
            <span>Count-in</span>
            <strong>{project.songTiming.countInBeats} beats</strong>
          </div>
          <div>
            <span>Background</span>
            <strong>{project.exportState.background.type}</strong>
          </div>
          <div>
            <span>Export audio</span>
            <strong>{project.exportState.includeSynthPlayback ? 'transposed + boomwhackers' : 'transposed only'}</strong>
          </div>
          <div>
            <span>Timing</span>
            <strong>{formatTempo(project.songTiming.tempoBpm)}</strong>
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
          <div class="aspect-preset-row" role="group" aria-label="Video aspect ratio presets">
            {#each exportAspectPresets as preset}
              <button
                type="button"
                class="ghost-button"
                class:is-active-toolbar={project.exportState.width === preset.width && project.exportState.height === preset.height}
                on:click={() => updateExportState({ width: preset.width, height: preset.height }, `Set export aspect ratio to ${preset.label}.`)}
              >
                {preset.label}
              </button>
            {/each}
          </div>
          <div class="export-grid">
            <label class="field">
              <span class="field__label">Width</span>
              <input class="text-input" type="number" min="320" step="10" value={project.exportState.width} on:change={(event) => updateExportState({ width: Math.max(320, Number((event.currentTarget as HTMLInputElement).value) || project.exportState.width) })} />
            </label>
            <label class="field">
              <span class="field__label">Height</span>
              <input class="text-input" type="number" min="180" step="10" value={project.exportState.height} on:change={(event) => updateExportState({ height: Math.max(180, Number((event.currentTarget as HTMLInputElement).value) || project.exportState.height) })} />
            </label>
            <label class="field">
              <span class="field__label">FPS</span>
              <input class="text-input" type="number" min="1" step="1" value={project.exportState.fps} on:change={(event) => updateExportState({ fps: Math.max(1, Number((event.currentTarget as HTMLInputElement).value) || project.exportState.fps) })} />
            </label>
          </div>

          <div class="action-row action-row--stack">
            <label class="checkbox">
              <input
                type="checkbox"
                checked={project.exportState.includeSynthPlayback}
                on:change={(event) => updateExportState({ includeSynthPlayback: (event.currentTarget as HTMLInputElement).checked }, (event.currentTarget as HTMLInputElement).checked ? 'Export synth-note playback enabled.' : 'Export synth-note playback disabled.')}
              />
              <span>Export boomwhacker sounds</span>
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
              <span>Show title card during count-in</span>
            </label>
          </div>
          <label class="field">
            <span class="field__label">Title</span>
            <input class="text-input" type="text" value={project.exportState.titleCard.title} on:change={(event) => updateExportTitleCard({ title: (event.currentTarget as HTMLInputElement).value || project.metadata.title })} />
          </label>
          <label class="field">
            <span class="field__label">Subtitle</span>
            <input class="text-input" type="text" value={project.exportState.titleCard.subtitle ?? ''} on:change={(event) => updateExportTitleCard({ subtitle: (event.currentTarget as HTMLInputElement).value || undefined })} />
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
              <input class="color-input" type="color" value={project.exportState.background.color} on:input={(event) => updateExportBackgroundSolid((event.currentTarget as HTMLInputElement).value)} />
            </label>
          {/if}

          {#if project.exportState.background.type === 'gradient'}
            <div class="export-grid">
              <label class="field">
                <span class="field__label">Top color</span>
                <input class="color-input" type="color" value={project.exportState.background.topColor} on:input={(event) => updateExportBackgroundGradient({ topColor: (event.currentTarget as HTMLInputElement).value })} />
              </label>
              <label class="field">
                <span class="field__label">Bottom color</span>
                <input class="color-input" type="color" value={project.exportState.background.bottomColor} on:input={(event) => updateExportBackgroundGradient({ bottomColor: (event.currentTarget as HTMLInputElement).value })} />
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
                <select class="text-input" value={project.exportState.background.fit} on:change={(event) => updateExportBackgroundImage({ fit: ((event.currentTarget as HTMLSelectElement).value === 'contain' ? 'contain' : 'cover') })}>
                  <option value="cover">Cover</option>
                  <option value="contain">Contain</option>
                </select>
              </label>
              <label class="range-field">
                <span class="range-field__label">Opacity</span>
                <input type="range" min="0" max="1" step="0.05" value={project.exportState.background.opacity} on:input={(event) => updateExportBackgroundImage({ opacity: Number((event.currentTarget as HTMLInputElement).value) })} />
                <strong>{Math.round(project.exportState.background.opacity * 100)}%</strong>
              </label>
            </div>
          {/if}
        </div>
      </article>
    </section>
  {/if}

  {#if noteBankPlacementState && !noteBankPlacementState.preview}
    <div class="highway__cursor-ghost" style={`left:${noteBankPlacementState.currentClientX}px;top:${noteBankPlacementState.currentClientY}px;--token-color:#d9ebff;`} aria-hidden="true">
      <div
        class="highway__note highway__note--ghost highway__note--cursor"
        class:shape-circle={noteBankPlacementState.shape === 'circle'}
        class:shape-oval={noteBankPlacementState.shape === 'oval'}
        class:shape-diamond={noteBankPlacementState.shape === 'diamond'}
      >
        <HighwayNoteGlyph shape={noteBankPlacementState.shape} showLabel={false} />
      </div>
    </div>
  {/if}
</div>
