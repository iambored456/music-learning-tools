import { getBoomwhackerLane } from './lanes.js';
import { deriveTimingModel } from './timing.js';
import type {
  AudioProcessingState,
  AnnotationState,
  BeatPin,
  BoomwhackerGridNote,
  BoomwhackerVideoBuilderProject,
  ExportState,
  GridSubdivisionState,
  PlaybackState,
  ProjectAudio,
  ProjectMetadata,
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

export function createConstantTempoBeatPins(options: {
  bpm: number;
  beatCount: number;
  startTimeSec?: number;
}): BeatPin[] {
  const bpm = Number.isFinite(options.bpm) ? options.bpm : Number.NaN;
  const beatCount = Number.isFinite(options.beatCount) ? Math.trunc(options.beatCount) : Number.NaN;
  const startTimeSec = Number.isFinite(options.startTimeSec) ? options.startTimeSec ?? 0 : 0;

  if (!(bpm > 0)) {
    throw new Error(`BPM must be greater than 0. Received: ${options.bpm}`);
  }

  if (!(beatCount >= 1)) {
    throw new Error(`Beat count must be at least 1. Received: ${options.beatCount}`);
  }

  const secondsPerBeat = 60 / bpm;
  return Array.from({ length: beatCount + 1 }, (_, index) => ({
    id: createId('beat'),
    timeSec: Number((startTimeSec + (index * secondsPerBeat)).toFixed(4)),
    confidence: 1,
    isDownbeat: index === 0,
    annotationIds: [],
  }));
}

export const DEFAULT_GRID_STATE: GridSubdivisionState = {
  defaultMacrobeatGrouping: 2,
  localMacrobeatGroupings: [],
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
};

export const DEFAULT_PREVIEW_STATE: PlaybackState = {
  includeSynthPlayback: true,
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
    audioProcessing: { ...DEFAULT_AUDIO_PROCESSING_STATE },
    beatMap: {
      beatPins: [],
    },
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
  shape: BoomwhackerGridNote['shape'],
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

  project.beatMap.beatPins = [
    0,
    0.54,
    1.07,
    1.6,
    2.12,
    2.67,
    3.2,
    3.74,
    4.29,
  ].map((timeSec, index) => ({
    id: createId('beat'),
    timeSec,
    confidence: index === 0 ? 1 : 0.78,
    isDownbeat: index === 0 || index === 4,
    annotationIds: [],
  }));

  project.grid = {
    defaultMacrobeatGrouping: 2,
    localMacrobeatGroupings: [
      { beatIndex: 4, grouping: 3 },
    ],
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
    sections: [
      {
        id: createId('section'),
        label: 'Verse',
        startBeatPinId: project.beatMap.beatPins[0]?.id ?? '',
        color: '#8bc4ff',
      },
      {
        id: createId('section'),
        label: 'Bridge',
        startBeatPinId: project.beatMap.beatPins[4]?.id ?? '',
        color: '#ffd36a',
      },
    ],
    timelineNotes: [
      {
        id: createId('annotation'),
        text: 'Local 3-based override starts here.',
        beatPinId: project.beatMap.beatPins[4]?.id,
      },
    ],
  };

  project.viewState.activeTab = 'editor';
  project.exportState.leadInDurationSec = 2.25;

  const timing = deriveTimingModel(project.beatMap.beatPins, project.grid);
  project.viewState.scrollSlotIndex = Math.min(12, timing.totalSlotCount);

  return project;
}
