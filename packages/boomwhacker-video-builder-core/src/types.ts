import type { NoteShape } from '@mlt/types';

export const BOOMWHACKER_VIDEO_BUILDER_SCHEMA_VERSION = 5 as const;
export type BoomwhackerSchemaVersion = typeof BOOMWHACKER_VIDEO_BUILDER_SCHEMA_VERSION;
export type MacrobeatGrouping = 2 | 3;
export type AudioStorageStrategy = 'embedded' | 'file-handle' | 'external-file';
export type BoomwhackerNoteShape = NoteShape;

export interface ProjectMetadata {
  id: string;
  title: string;
  createdAtIso: string;
  updatedAtIso: string;
  schemaVersion: BoomwhackerSchemaVersion;
  appVersion: string;
}

export interface ProjectAudio {
  originalFileName: string;
  mimeType: string;
  durationSec: number;
  sampleRate?: number;
  channelCount?: number;
  storageStrategy: AudioStorageStrategy;
  embeddedBase64?: string | null;
  externalFileToken?: string | null;
}

export interface SongTimingState {
  tempoBpm: number;
  firstBeatOffsetSec: number;
  beatCount: number;
  countInBeats: number;
  timeSignatureNumerator: number;
  timeSignatureDenominator: number;
}

export interface AudioProcessingState {
  transposeSemitones: number;
}

export interface GridSubdivisionState {
  defaultMacrobeatGrouping: MacrobeatGrouping;
}

export interface BoomwhackerGridNote {
  id: string;
  row: number;
  startSlotIndex: number;
  endSlotIndex: number;
  shape: BoomwhackerNoteShape;
  color: string;
  noteId: string;
  pitchInterval: number;
  lyric?: string;
  tonicNumber?: number | null;
}

export interface SectionMarker {
  id: string;
  label: string;
  startSlotIndex: number;
  color?: string;
}

export interface TimelineAnnotation {
  id: string;
  text: string;
  slotIndex?: number;
}

export interface ProjectNotesState {
  placedNotes: BoomwhackerGridNote[];
}

export interface AnnotationState {
  sections: SectionMarker[];
  timelineNotes: TimelineAnnotation[];
}

export interface ViewState {
  zoom: number;
  waveformHeight: number;
  laneHeight: number;
  activeTab: 'editor' | 'export';
  scrollSlotIndex: number;
  selectedBeatIndex: number;
  playbackStartBeatIndex: number | null;
  showNoteOutlines: boolean;
  showMeasureLabels: boolean;
}

export interface PlaybackState {
  includeSynthPlayback: boolean;
  playAudio: boolean;
  playGrid: boolean;
  audioVolume: number;
  synthVolume: number;
  playbackOffsetSec: number;
  previewOriginalAudio: boolean;
}

export type BackgroundConfig =
  | {
      type: 'solid';
      color: string;
    }
  | {
      type: 'gradient';
      topColor: string;
      bottomColor: string;
    }
  | {
      type: 'image';
      imageDataUrl?: string | null;
      fit: 'cover' | 'contain';
      opacity: number;
    };

export interface TitleCardOptions {
  enabled: boolean;
  title: string;
  subtitle?: string;
}

export interface ExportState {
  width: number;
  height: number;
  fps: number;
  leadInDurationSec: number;
  titleCard: TitleCardOptions;
  background: BackgroundConfig;
  includeSynthPlayback: boolean;
  transparentBackground: boolean;
}

export interface BoomwhackerVideoBuilderProject {
  metadata: ProjectMetadata;
  audio: ProjectAudio | null;
  audioProcessing: AudioProcessingState;
  songTiming: SongTimingState;
  grid: GridSubdivisionState;
  notes: ProjectNotesState;
  annotations: AnnotationState;
  viewState: ViewState;
  previewState: PlaybackState;
  exportState: ExportState;
}

export interface BoomwhackerLane {
  row: number;
  noteId: string;
  label: string;
  marker: 'underline' | 'overline' | 'none';
  spokenLabel: string;
  pitchInterval: number;
  color: string;
}

export interface DerivedBeatSpan {
  beatIndex: number;
  beatId: string;
  nextBeatId: string;
  startTimeSec: number;
  endTimeSec: number;
  durationSec: number;
  grouping: MacrobeatGrouping;
  slotCount: number;
  startSlotIndex: number;
  endSlotIndex: number;
}

export interface DerivedSlotBoundary {
  slotIndex: number;
  timeSec: number;
  beatIndex: number | null;
  fractionOfBeat: number;
  isBeatStart: boolean;
  isSubdivisionStart: boolean;
}

export interface DerivedTimingModel {
  beatSpans: DerivedBeatSpan[];
  slotBoundaries: DerivedSlotBoundary[];
  totalSlotCount: number;
  totalDurationSec: number;
  secondsPerBeat: number;
  countInBeats: number;
  countInLeadInBeats: number;
  countInDurationSec: number;
  countInStartTimeSec: number;
  timeSignatureNumerator: number;
  timeSignatureDenominator: number;
}

export interface DerivedGuideLine {
  id: string;
  timeSec: number;
  beatIndex: number;
  slotIndex: number;
  kind: 'measure' | 'beat' | 'subdivision' | 'count-in';
  emphasis: 'solid' | 'dashed' | 'light';
  measureIndex?: number;
  label?: string;
}

export interface TimedBoomwhackerNote {
  id: string;
  row: number;
  noteId: string;
  label: string;
  marker: 'underline' | 'overline' | 'none';
  pitchInterval: number;
  startSlotIndex: number;
  endSlotIndex: number;
  startTimeSec: number;
  endTimeSec: number;
  durationSec: number;
  color: string;
  shape: BoomwhackerNoteShape;
  lyric?: string;
}
