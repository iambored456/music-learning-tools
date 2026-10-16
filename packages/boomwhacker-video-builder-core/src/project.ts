import type {
  AnnotationState,
  BoomwhackerVideoBuilderProject,
  ExportState,
  GridSubdivisionState,
  PlaybackState,
  ProjectAudio,
  ProjectMetadata,
  SongTimingState,
  ViewState,
} from './types.js';
import { BOOMWHACKER_VIDEO_BUILDER_SCHEMA_VERSION } from './types.js';

const DEFAULT_APP_VERSION = '0.1.0';

function createId(prefix: string): string {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${randomPart}`;
}

export const DEFAULT_GRID_STATE: GridSubdivisionState = {
  defaultMacrobeatGrouping: 2,
};

export const DEFAULT_SONG_TIMING_STATE: SongTimingState = {
  beatTimesSec: [],
  midiFileName: null,
  firstDownbeatIndex: null,
  tempoBpm: 120,
  firstBeatOffsetSec: 0,
  beatCount: 0,
  countInEnabled: false,
  silentLeadInEnabled: false,
  timeSignatureNumerator: 4,
  timeSignatureDenominator: 4,
};

export const DEFAULT_VIEW_STATE: ViewState = {
  zoom: 1,
  waveformHeight: 160,
  laneHeight: 52,
  activeTab: 'editor',
  scrollSlotIndex: 0,
  selectedBeatIndex: 0,
  playbackStartBeatIndex: null,
  showNoteOutlines: true,
  showMeasureLabels: true,
};

export const DEFAULT_PREVIEW_STATE: PlaybackState = {
  includeSynthPlayback: true,
  playMetronome: false,
  metronomeVolume: 0.7,
  playAudio: true,
  playGrid: true,
  audioVolume: 1,
  synthVolume: 1,
  playbackOffsetSec: 0,
};

export const DEFAULT_EXPORT_STATE: ExportState = {
  width: 1920,
  height: 1080,
  fps: 30,
  leadInDurationSec: 2,
  titleCard: {
    enabled: true,
    title: 'Untitled Song',
  },
  background: {
    type: 'gradient',
    topColor: '#16233a',
    bottomColor: '#091018',
  },
  includeSynthPlayback: true,
  transparentBackground: false,
};

export const EMPTY_ANNOTATIONS: AnnotationState = {
  sections: [],
  timelineNotes: [],
};

function createProjectMetadata(title: string, appVersion: string): ProjectMetadata {
  const nowIso = new Date().toISOString();
  return {
    id: createId('bvb-project'),
    title,
    createdAtIso: nowIso,
    updatedAtIso: nowIso,
    schemaVersion: BOOMWHACKER_VIDEO_BUILDER_SCHEMA_VERSION,
    appVersion,
  };
}

export function createBoomwhackerVideoBuilderProject(options?: {
  title?: string;
  appVersion?: string;
  audio?: ProjectAudio | null;
}): BoomwhackerVideoBuilderProject {
  const title = options?.title ?? 'Untitled Boomwhacker Video';
  return {
    metadata: createProjectMetadata(title, options?.appVersion ?? DEFAULT_APP_VERSION),
    audio: options?.audio ?? null,
    songTiming: { ...DEFAULT_SONG_TIMING_STATE, beatTimesSec: [] },
    grid: { ...DEFAULT_GRID_STATE },
    notes: {
      placedNotes: [],
    },
    annotations: {
      ...EMPTY_ANNOTATIONS,
    },
    viewState: { ...DEFAULT_VIEW_STATE },
    previewState: { ...DEFAULT_PREVIEW_STATE },
    exportState: {
      ...DEFAULT_EXPORT_STATE,
      titleCard: {
        ...DEFAULT_EXPORT_STATE.titleCard,
        title,
      },
    },
  };
}

