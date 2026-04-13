import type { NoteShape } from '@mlt/types';

import { createBoomwhackerVideoBuilderProject } from './project.js';
import {
  BOOMWHACKER_VIDEO_BUILDER_SCHEMA_VERSION,
  type AnnotationState,
  type AudioProcessingState,
  type AudioStorageStrategy,
  type BackgroundConfig,
  type BeatPin,
  type BoomwhackerGridNote,
  type BoomwhackerVideoBuilderProject,
  type ExportState,
  type GridSubdivisionState,
  type LocalMacrobeatGroupingOverride,
  type PlaybackMixMode,
  type PlaybackState,
  type ProjectAudio,
  type ProjectMetadata,
  type SectionMarker,
  type TimelineAnnotation,
  type TitleCardOptions,
  type ViewState,
} from './types.js';

const NOTE_SHAPES = new Set<NoteShape>(['circle', 'oval', 'diamond']);
const AUDIO_STORAGE_STRATEGIES = new Set<AudioStorageStrategy>(['embedded', 'file-handle', 'external-file']);
const PLAYBACK_MIX_MODES = new Set<PlaybackMixMode>(['source-only', 'source-and-synth', 'notes-only']);
const ACTIVE_TABS = new Set<ViewState['activeTab']>(['setup', 'editor', 'beats', 'export']);

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

function normalizeBeatPin(value: unknown, index: number): BeatPin | null {
  const source = asRecord(value);
  const timeSec = asFiniteNumber(source?.timeSec);
  if (timeSec === null) {
    return null;
  }

  return {
    id: asString(source?.id) ?? `beat-${index + 1}`,
    timeSec: Math.max(0, timeSec),
    confidence: asFiniteNumber(source?.confidence) ?? undefined,
    annotationIds: Array.isArray(source?.annotationIds)
      ? source.annotationIds.map((entry) => asString(entry)).filter((entry): entry is string => entry !== null)
      : [],
    label: asString(source?.label) ?? undefined,
  };
}

function normalizeGrid(value: unknown): GridSubdivisionState {
  const source = asRecord(value);
  const localMacrobeatGroupings = Array.isArray(source?.localMacrobeatGroupings)
    ? source.localMacrobeatGroupings
      .map((entry) => normalizeLocalGrouping(entry))
      .filter((entry): entry is LocalMacrobeatGroupingOverride => entry !== null)
    : [];

  const defaultMacrobeatGrouping = source?.defaultMacrobeatGrouping === 3 ? 3 : 2;
  return {
    defaultMacrobeatGrouping,
    localMacrobeatGroupings,
  };
}

function normalizeLocalGrouping(value: unknown): LocalMacrobeatGroupingOverride | null {
  const source = asRecord(value);
  const beatIndex = asFiniteNumber(source?.beatIndex);
  if (beatIndex === null) {
    return null;
  }

  const grouping = source?.grouping === 3 ? 3 : 2;
  return {
    beatIndex: Math.max(0, Math.round(beatIndex)),
    grouping,
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

  return {
    id: asString(source?.id) ?? `note-${index + 1}`,
    row: clampInteger(row, 0, 7, 0),
    startSlotIndex: normalizedStartSlotIndex,
    endSlotIndex: normalizedEndSlotIndex,
    shape: NOTE_SHAPES.has(shape as NoteShape) ? shape as NoteShape : 'circle',
    color,
    noteId,
    pitchInterval,
    lyric: asString(source?.lyric) ?? undefined,
    tonicNumber: asFiniteNumber(source?.tonicNumber),
  };
}

function normalizeSectionMarker(value: unknown, index: number): SectionMarker | null {
  const source = asRecord(value);
  const label = asString(source?.label);
  const startBeatPinId = asString(source?.startBeatPinId);
  if (!label || !startBeatPinId) {
    return null;
  }

  return {
    id: asString(source?.id) ?? `section-${index + 1}`,
    label,
    startBeatPinId,
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
    beatPinId: asString(source?.beatPinId) ?? undefined,
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
  };
}

function normalizePlaybackState(value: unknown): PlaybackState {
  const source = asRecord(value);
  const base = createBoomwhackerVideoBuilderProject().previewState;
  const mixMode = asString(source?.mixMode);
  const legacyPlayAudio = mixMode === 'notes-only'
    ? false
    : PLAYBACK_MIX_MODES.has(mixMode as PlaybackMixMode)
      ? true
      : base.playAudio;
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
  const beatPins = Array.isArray(asRecord(source?.beatMap)?.beatPins)
    ? (asRecord(source?.beatMap)?.beatPins as unknown[])
      .map((entry, index) => normalizeBeatPin(entry, index))
      .filter((entry): entry is BeatPin => entry !== null)
      .sort((left, right) => left.timeSec - right.timeSec)
    : [];

  return {
    metadata,
    audio: normalizeAudio(source?.audio),
    audioProcessing: normalizeAudioProcessingState(source?.audioProcessing),
    beatMap: {
      beatPins,
    },
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
