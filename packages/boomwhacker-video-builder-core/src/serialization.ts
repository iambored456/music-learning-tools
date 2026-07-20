import { getBoomwhackerLane } from './lanes.js';
import { createBoomwhackerVideoBuilderProject } from './project.js';
import {
  BOOMWHACKER_VIDEO_BUILDER_SCHEMA_VERSION,
  type AnnotationState,
  type AudioProcessingState,
  type AudioStorageStrategy,
  type BackgroundConfig,
  type BoomwhackerNoteShape,
  type BoomwhackerGridNote,
  type BoomwhackerVideoBuilderProject,
  type ExportState,
  type GridSubdivisionState,
  type PlaybackState,
  type ProjectAudio,
  type ProjectMetadata,
  type SectionMarker,
  type SongTimingState,
  type TimelineAnnotation,
  type TitleCardOptions,
  type ViewState,
} from './types.js';

const NOTE_SHAPES = new Set<BoomwhackerNoteShape>(['circle', 'oval', 'diamond']);
const AUDIO_STORAGE_STRATEGIES = new Set<AudioStorageStrategy>(['embedded', 'file-handle', 'external-file']);
const ACTIVE_TABS = new Set<ViewState['activeTab']>(['editor', 'export']);

interface LegacyBeatTime {
  timeSec: number;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = asFiniteNumber(value);
  if (parsed === null) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function clampUnitInterval(value: unknown, fallback: number): number {
  const parsed = asFiniteNumber(value);
  if (parsed === null) {
    return fallback;
  }
  return Math.min(1, Math.max(0, parsed));
}

function normalizeMetadata(value: unknown, fallbackTitle: string): ProjectMetadata {
  const source = asRecord(value);
  const base = createBoomwhackerVideoBuilderProject({ title: fallbackTitle }).metadata;

  return {
    id: asString(source?.id) ?? base.id,
    title: asString(source?.title) ?? fallbackTitle,
    createdAtIso: asString(source?.createdAtIso) ?? base.createdAtIso,
    updatedAtIso: asString(source?.updatedAtIso) ?? base.updatedAtIso,
    schemaVersion: BOOMWHACKER_VIDEO_BUILDER_SCHEMA_VERSION,
    appVersion: asString(source?.appVersion) ?? base.appVersion,
  };
}

function normalizeAudio(value: unknown): ProjectAudio | null {
  const source = asRecord(value);
  if (!source) {
    return null;
  }

  const storageStrategy = asString(source.storageStrategy);
  return {
    originalFileName: asString(source.originalFileName) ?? 'unknown-audio',
    mimeType: asString(source.mimeType) ?? 'application/octet-stream',
    durationSec: Math.max(0, asFiniteNumber(source.durationSec) ?? 0),
    sampleRate: asFiniteNumber(source.sampleRate) ?? undefined,
    channelCount: asFiniteNumber(source.channelCount) ?? undefined,
    storageStrategy: AUDIO_STORAGE_STRATEGIES.has(storageStrategy as AudioStorageStrategy)
      ? storageStrategy as AudioStorageStrategy
      : 'embedded',
    embeddedBase64: asString(source.embeddedBase64),
    externalFileToken: asString(source.externalFileToken),
  };
}

function normalizeAudioProcessingState(value: unknown): AudioProcessingState {
  const source = asRecord(value);
  const base = createBoomwhackerVideoBuilderProject().audioProcessing;
  return {
    transposeSemitones: clampInteger(source?.transposeSemitones, -12, 12, base.transposeSemitones),
  };
}

function normalizeLegacyBeatTime(value: unknown): LegacyBeatTime | null {
  const source = asRecord(value);
  const timeSec = asFiniteNumber(source?.timeSec);
  if (timeSec === null) {
    return null;
  }

  return {
    timeSec: Math.max(0, timeSec),
  };
}

function estimateTempoFromLegacyBeatTimes(legacyBeatTimes: LegacyBeatTime[]): number | null {
  const orderedBeatTimes = [...legacyBeatTimes].sort((left, right) => left.timeSec - right.timeSec);
  if (orderedBeatTimes.length < 2) {
    return null;
  }

  const intervals: number[] = [];
  for (let index = 1; index < orderedBeatTimes.length; index += 1) {
    const interval = orderedBeatTimes[index].timeSec - orderedBeatTimes[index - 1].timeSec;
    if (interval > 0) {
      intervals.push(interval);
    }
  }

  if (intervals.length === 0) {
    return null;
  }

  const sortedIntervals = [...intervals].sort((left, right) => left - right);
  const medianInterval = sortedIntervals[Math.floor(sortedIntervals.length / 2)] ?? intervals[0];
  return medianInterval > 0 ? 60 / medianInterval : null;
}

function normalizeSongTiming(value: unknown, legacyBeatTimes: LegacyBeatTime[] = []): SongTimingState {
  const source = asRecord(value);
  const base = createBoomwhackerVideoBuilderProject().songTiming;
  const legacyTempoBpm = estimateTempoFromLegacyBeatTimes(legacyBeatTimes);
  const legacyFirstBeatOffsetSec = legacyBeatTimes[0]?.timeSec;
  const legacyBeatCount = Math.max(0, legacyBeatTimes.length - 1);

  return {
    tempoBpm: Math.max(
      20,
      Math.min(320, asFiniteNumber(source?.tempoBpm) ?? legacyTempoBpm ?? base.tempoBpm),
    ),
    firstBeatOffsetSec: Math.max(
      0,
      asFiniteNumber(source?.firstBeatOffsetSec) ?? legacyFirstBeatOffsetSec ?? base.firstBeatOffsetSec,
    ),
    beatCount: clampInteger(source?.beatCount, 1, 1024, legacyBeatCount || base.beatCount),
    countInBeats: clampInteger(source?.countInBeats, 0, 32, base.countInBeats),
    timeSignatureNumerator: clampInteger(source?.timeSignatureNumerator, 1, 16, base.timeSignatureNumerator),
    timeSignatureDenominator: [2, 4, 8, 16].includes(asFiniteNumber(source?.timeSignatureDenominator) ?? 0)
      ? asFiniteNumber(source?.timeSignatureDenominator) as SongTimingState['timeSignatureDenominator']
      : base.timeSignatureDenominator,
  };
}

function normalizeGrid(value: unknown): GridSubdivisionState {
  const source = asRecord(value);
  const defaultMacrobeatGrouping = source?.defaultMacrobeatGrouping === 3 ? 3 : 2;
  return {
    defaultMacrobeatGrouping,
  };
}

function normalizeNote(value: unknown, index: number): BoomwhackerGridNote | null {
  const source = asRecord(value);
  const row = asFiniteNumber(source?.row);
  const startSlotIndex = asFiniteNumber(source?.startSlotIndex);
  const endSlotIndex = asFiniteNumber(source?.endSlotIndex);
  const shape = asString(source?.shape);
  const color = asString(source?.color);
  const noteId = asString(source?.noteId);
  const pitchInterval = asFiniteNumber(source?.pitchInterval);

  if (
    row === null
    || startSlotIndex === null
    || endSlotIndex === null
    || !shape
    || !color
    || !noteId
    || pitchInterval === null
  ) {
    return null;
  }

  const normalizedStartSlotIndex = Math.max(0, Math.round(startSlotIndex));
  const normalizedEndSlotIndex = Math.max(normalizedStartSlotIndex, Math.round(endSlotIndex));
  const normalizedRow = clampInteger(row, 0, 7, 0);
  const lane = getBoomwhackerLane(normalizedRow);
  const normalizedShape = shape === 'sustain'
    ? 'circle'
    : NOTE_SHAPES.has(shape as BoomwhackerNoteShape)
      ? shape as BoomwhackerNoteShape
      : 'circle';

  return {
    id: asString(source?.id) ?? `note-${index + 1}`,
    row: normalizedRow,
    startSlotIndex: normalizedStartSlotIndex,
    endSlotIndex: normalizedEndSlotIndex,
    shape: normalizedShape,
    color: lane?.color ?? color,
    noteId: lane?.noteId ?? noteId,
    pitchInterval: lane?.pitchInterval ?? pitchInterval,
    lyric: asString(source?.lyric) ?? undefined,
    tonicNumber: asFiniteNumber(source?.tonicNumber),
  };
}

function normalizeSectionMarker(value: unknown, index: number): SectionMarker | null {
  const source = asRecord(value);
  const label = asString(source?.label);
  if (!label) {
    return null;
  }

  return {
    id: asString(source?.id) ?? `section-${index + 1}`,
    label,
    startSlotIndex: Math.max(0, Math.round(asFiniteNumber(source?.startSlotIndex) ?? 0)),
    color: asString(source?.color) ?? undefined,
  };
}

function normalizeTimelineAnnotation(value: unknown, index: number): TimelineAnnotation | null {
  const source = asRecord(value);
  const text = asString(source?.text);
  if (!text) {
    return null;
  }

  const slotIndex = asFiniteNumber(source?.slotIndex);
  return {
    id: asString(source?.id) ?? `annotation-${index + 1}`,
    text,
    slotIndex: slotIndex === null ? undefined : Math.max(0, Math.round(slotIndex)),
  };
}

function normalizeAnnotations(value: unknown): AnnotationState {
  const source = asRecord(value);
  return {
    sections: Array.isArray(source?.sections)
      ? source.sections
        .map((entry, index) => normalizeSectionMarker(entry, index))
        .filter((entry): entry is SectionMarker => entry !== null)
      : [],
    timelineNotes: Array.isArray(source?.timelineNotes)
      ? source.timelineNotes
        .map((entry, index) => normalizeTimelineAnnotation(entry, index))
        .filter((entry): entry is TimelineAnnotation => entry !== null)
      : [],
  };
}

function normalizeViewState(value: unknown): ViewState {
  const source = asRecord(value);
  const base = createBoomwhackerVideoBuilderProject().viewState;

  const activeTab = asString(source?.activeTab);
  return {
    zoom: Math.max(0.25, asFiniteNumber(source?.zoom) ?? base.zoom),
    waveformHeight: Math.max(96, asFiniteNumber(source?.waveformHeight) ?? base.waveformHeight),
    laneHeight: Math.max(28, asFiniteNumber(source?.laneHeight) ?? base.laneHeight),
    activeTab: ACTIVE_TABS.has(activeTab as ViewState['activeTab']) ? activeTab as ViewState['activeTab'] : base.activeTab,
    scrollSlotIndex: Math.max(0, Math.round(asFiniteNumber(source?.scrollSlotIndex) ?? base.scrollSlotIndex)),
    selectedBeatIndex: Math.max(0, Math.round(asFiniteNumber(source?.selectedBeatIndex) ?? base.selectedBeatIndex)),
    playbackStartBeatIndex: source?.playbackStartBeatIndex === null
      ? null
      : asFiniteNumber(source?.playbackStartBeatIndex) === null
        ? base.playbackStartBeatIndex
        : Math.max(0, Math.round(asFiniteNumber(source?.playbackStartBeatIndex) ?? 0)),
    showNoteOutlines: asBoolean(source?.showNoteOutlines) ?? base.showNoteOutlines,
    showMeasureLabels: asBoolean(source?.showMeasureLabels) ?? base.showMeasureLabels,
  };
}

function normalizePlaybackState(value: unknown): PlaybackState {
  const source = asRecord(value);
  const base = createBoomwhackerVideoBuilderProject().previewState;
  const mixMode = asString(source?.mixMode);
  const legacyPlayAudio = mixMode === 'notes-only' ? false : base.playAudio;
  const playAudio = asBoolean(source?.playAudio) ?? legacyPlayAudio;
  let playGrid = asBoolean(source?.playGrid) ?? base.playGrid;
  if (!playAudio && !playGrid) {
    playGrid = true;
  }
  return {
    includeSynthPlayback: asBoolean(source?.includeSynthPlayback) ?? base.includeSynthPlayback,
    playAudio,
    playGrid,
    audioVolume: clampUnitInterval(source?.audioVolume, base.audioVolume),
    synthVolume: clampUnitInterval(source?.synthVolume, base.synthVolume),
    playbackOffsetSec: asFiniteNumber(source?.playbackOffsetSec) ?? base.playbackOffsetSec,
    previewOriginalAudio: asBoolean(source?.previewOriginalAudio) ?? base.previewOriginalAudio,
  };
}

function normalizeBackgroundConfig(value: unknown): BackgroundConfig {
  const source = asRecord(value);
  const base = createBoomwhackerVideoBuilderProject().exportState.background;
  const type = asString(source?.type);

  if (type === 'solid') {
    return {
      type: 'solid',
      color: asString(source?.color) ?? (base.type === 'solid' ? base.color : '#08111b'),
    };
  }

  if (type === 'image') {
    return {
      type: 'image',
      imageDataUrl: asString(source?.imageDataUrl),
      fit: source?.fit === 'contain' ? 'contain' : 'cover',
      opacity: Math.min(1, Math.max(0, asFiniteNumber(source?.opacity) ?? 1)),
    };
  }

  return {
    type: 'gradient',
    topColor: asString(source?.topColor) ?? (base.type === 'gradient' ? base.topColor : '#16233a'),
    bottomColor: asString(source?.bottomColor) ?? (base.type === 'gradient' ? base.bottomColor : '#091018'),
  };
}

function normalizeTitleCardOptions(value: unknown, fallbackTitle: string): TitleCardOptions {
  const source = asRecord(value);
  return {
    enabled: asBoolean(source?.enabled) ?? true,
    title: asString(source?.title) ?? fallbackTitle,
    subtitle: asString(source?.subtitle) ?? undefined,
  };
}

function normalizeExportState(value: unknown, fallbackTitle: string): ExportState {
  const source = asRecord(value);
  const base = createBoomwhackerVideoBuilderProject({ title: fallbackTitle }).exportState;

  return {
    width: Math.max(320, Math.round(asFiniteNumber(source?.width) ?? base.width)),
    height: Math.max(180, Math.round(asFiniteNumber(source?.height) ?? base.height)),
    fps: Math.max(1, Math.round(asFiniteNumber(source?.fps) ?? base.fps)),
    leadInDurationSec: Math.max(0, asFiniteNumber(source?.leadInDurationSec) ?? base.leadInDurationSec),
    titleCard: normalizeTitleCardOptions(source?.titleCard, fallbackTitle),
    background: normalizeBackgroundConfig(source?.background),
    includeSynthPlayback: asBoolean(source?.includeSynthPlayback) ?? base.includeSynthPlayback,
    transparentBackground: asBoolean(source?.transparentBackground) ?? base.transparentBackground,
  };
}

export function normalizeBoomwhackerVideoBuilderProject(input: unknown): BoomwhackerVideoBuilderProject {
  const source = asRecord(input);
  const rawMetadata = asRecord(source?.metadata);
  const fallbackTitle = asString(rawMetadata?.title) ?? 'Imported Boomwhacker Video';
  const metadata = normalizeMetadata(rawMetadata, fallbackTitle);
  const legacyBeatTimes = Array.isArray(asRecord(source?.beatMap)?.beatPins)
    ? (asRecord(source?.beatMap)?.beatPins as unknown[])
      .map((entry) => normalizeLegacyBeatTime(entry))
      .filter((entry): entry is LegacyBeatTime => entry !== null)
      .sort((left, right) => left.timeSec - right.timeSec)
    : [];

  return {
    metadata,
    audio: normalizeAudio(source?.audio),
    audioProcessing: normalizeAudioProcessingState(source?.audioProcessing),
    songTiming: normalizeSongTiming(source?.songTiming, legacyBeatTimes),
    grid: normalizeGrid(source?.grid),
    notes: {
      placedNotes: Array.isArray(asRecord(source?.notes)?.placedNotes)
        ? (asRecord(source?.notes)?.placedNotes as unknown[])
          .map((entry, index) => normalizeNote(entry, index))
          .filter((entry): entry is BoomwhackerGridNote => entry !== null)
        : [],
    },
    annotations: normalizeAnnotations(source?.annotations),
    viewState: normalizeViewState(source?.viewState),
    previewState: normalizePlaybackState(source?.previewState),
    exportState: normalizeExportState(source?.exportState, metadata.title),
  };
}

export function stampProjectUpdatedAt(
  project: BoomwhackerVideoBuilderProject,
  updatedAtIso: string = new Date().toISOString(),
): BoomwhackerVideoBuilderProject {
  return {
    ...project,
    metadata: {
      ...project.metadata,
      updatedAtIso,
      schemaVersion: BOOMWHACKER_VIDEO_BUILDER_SCHEMA_VERSION,
    },
  };
}

export function serializeBoomwhackerVideoBuilderProject(
  project: BoomwhackerVideoBuilderProject,
  spacing: number = 2,
): string {
  return JSON.stringify(stampProjectUpdatedAt(project), null, spacing);
}

export function parseBoomwhackerVideoBuilderProject(serializedProject: string): BoomwhackerVideoBuilderProject {
  const parsed = JSON.parse(serializedProject) as unknown;
  return normalizeBoomwhackerVideoBuilderProject(parsed);
}
