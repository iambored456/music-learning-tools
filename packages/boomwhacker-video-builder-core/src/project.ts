import { getBoomwhackerLane } from './lanes.js';
import { deriveTimingModel } from './timing.js';
import type {
  AnnotationState,
  AudioProcessingState,
  BoomwhackerNoteShape,
  BoomwhackerGridNote,
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
  tempoBpm: 120,
  firstBeatOffsetSec: 0,
  beatCount: 64,
  countInBeats: 4,
  timeSignatureNumerator: 4,
  timeSignatureDenominator: 4,
};

export const DEFAULT_AUDIO_PROCESSING_STATE: AudioProcessingState = {
  transposeSemitones: 0,
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
  playAudio: true,
  playGrid: true,
  audioVolume: 1,
  synthVolume: 1,
  playbackOffsetSec: 0,
  previewOriginalAudio: false,
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
    audioProcessing: { ...DEFAULT_AUDIO_PROCESSING_STATE },
    songTiming: { ...DEFAULT_SONG_TIMING_STATE },
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

function createLaneNote(
  row: number,
  startSlotIndex: number,
  endSlotIndex: number,
  shape: BoomwhackerNoteShape,
): BoomwhackerGridNote {
  const lane = getBoomwhackerLane(row);
  if (!lane) {
    throw new Error(`Invalid Boomwhacker lane row: ${row}`);
  }

  return {
    id: createId('bvb-note'),
    row,
    startSlotIndex,
    endSlotIndex,
    shape,
    color: lane.color,
    noteId: lane.noteId,
    pitchInterval: lane.pitchInterval,
  };
}

export function createSampleBoomwhackerVideoBuilderProject(): BoomwhackerVideoBuilderProject {
  const project = createBoomwhackerVideoBuilderProject({
    title: 'Boomwhacker Video Builder Shell',
    audio: null,
  });

  project.songTiming = {
    tempoBpm: 112,
    firstBeatOffsetSec: 0.25,
    beatCount: 12,
    countInBeats: 4,
    timeSignatureNumerator: 4,
    timeSignatureDenominator: 4,
  };

  project.grid = {
    defaultMacrobeatGrouping: 2,
  };

  project.notes.placedNotes = [
    createLaneNote(0, 0, 3, 'circle'),
    createLaneNote(1, 4, 7, 'circle'),
    createLaneNote(2, 8, 11, 'circle'),
    createLaneNote(3, 12, 15, 'circle'),
    createLaneNote(4, 16, 16, 'diamond'),
    createLaneNote(5, 17, 19, 'oval'),
    createLaneNote(6, 20, 25, 'circle'),
    createLaneNote(7, 28, 33, 'circle'),
  ];

  project.annotations = {
    sections: [],
    timelineNotes: [],
  };

  project.viewState.activeTab = 'editor';
  project.exportState.leadInDurationSec = 2.25;

  const timing = deriveTimingModel(project.songTiming, project.grid);
  project.viewState.scrollSlotIndex = Math.min(12, timing.totalSlotCount);

  return project;
}
