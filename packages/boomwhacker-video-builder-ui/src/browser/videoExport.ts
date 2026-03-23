import type {
  BoomwhackerVideoBuilderProject,
  DerivedGuideLine,
  DerivedTimingModel,
  TimedBoomwhackerNote,
} from '@mlt/boomwhacker-video-builder-core';
import { MAIN_PLAYBACK_SYNTH_PROFILE } from '../../../boomwhacker-sketchpad-core/src/constants.ts';

import { getExportTotalDurationSec, renderExportFrame } from './exportRenderer.js';

const DEFAULT_EXPORT_SAMPLE_RATE = 48_000;
const SYNTH_ROOT_MIDI = 60;
const SYNTH_GAIN = 0.08;
const SYNTH_ATTACK_SEC = MAIN_PLAYBACK_SYNTH_PROFILE.envelope.attack;
const SYNTH_DECAY_SEC = MAIN_PLAYBACK_SYNTH_PROFILE.envelope.decay;
const SYNTH_SUSTAIN_LEVEL = MAIN_PLAYBACK_SYNTH_PROFILE.envelope.sustain;
const SYNTH_RELEASE_SEC = MAIN_PLAYBACK_SYNTH_PROFILE.envelope.release;
const SYNTH_OSCILLATOR_TYPE = MAIN_PLAYBACK_SYNTH_PROFILE.oscillatorType;
const SYNTH_FLOOR_GAIN = 0.0001;

export type ExportVideoContainer = {
  mimeType: string;
  saveMimeType: 'video/mp4' | 'video/webm';
  extension: '.mp4' | '.webm';
  label: string;
  description: string;
  supportsAlpha: boolean;
};

export type ExportVideoProgress = {
  frameIndex: number;
  totalFrames: number;
  frameTimeSec: number;
};

type ExportProjectVideoParams = {
  project: BoomwhackerVideoBuilderProject;
  timing: DerivedTimingModel;
  guides: DerivedGuideLine[];
  timedNotes: TimedBoomwhackerNote[];
  sourceAudioBuffer?: AudioBuffer | null;
  onProgress?: (progress: ExportVideoProgress) => void;
};

type ExportProjectVideoResult = {
  blob: Blob;
  container: ExportVideoContainer;
  warnings: string[];
};

type AudioPlaybackStream = {
  stream: MediaStream;
  start: () => Promise<void>;
  stop: () => void;
};

const RECORDER_CONTAINERS: ExportVideoContainer[] = [
  {
    mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    saveMimeType: 'video/mp4',
    extension: '.mp4',
    label: 'MP4 (H.264/AAC)',
    description: 'MP4 Video',
    supportsAlpha: false,
  },
  {
    mimeType: 'video/mp4',
    saveMimeType: 'video/mp4',
    extension: '.mp4',
    label: 'MP4',
    description: 'MP4 Video',
    supportsAlpha: false,
  },
  {
    mimeType: 'video/webm;codecs=vp9,opus',
    saveMimeType: 'video/webm',
    extension: '.webm',
    label: 'WebM (VP9/Opus)',
    description: 'WebM Video',
    supportsAlpha: true,
  },
  {
    mimeType: 'video/webm;codecs=vp8,opus',
    saveMimeType: 'video/webm',
    extension: '.webm',
    label: 'WebM (VP8/Opus)',
    description: 'WebM Video',
    supportsAlpha: false,
  },
  {
    mimeType: 'video/webm',
    saveMimeType: 'video/webm',
    extension: '.webm',
    label: 'WebM',
    description: 'WebM Video',
    supportsAlpha: false,
  },
];

function getAudioContextConstructor():
  | (new (contextOptions?: AudioContextOptions) => AudioContext)
  | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const audioWindow = window as Window & typeof globalThis & {
    webkitAudioContext?: new (contextOptions?: AudioContextOptions) => AudioContext;
  };
  return audioWindow.AudioContext ?? audioWindow.webkitAudioContext ?? null;
}

function isMediaRecorderSupported(container: ExportVideoContainer): boolean {
  if (typeof MediaRecorder === 'undefined') {
    return false;
  }

  if (typeof MediaRecorder.isTypeSupported !== 'function') {
    return container.mimeType === 'video/webm';
  }

  return MediaRecorder.isTypeSupported(container.mimeType);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function waitUntil(targetMs: number): Promise<void> {
  let remainingMs = targetMs - performance.now();
  while (remainingMs > 4) {
    await wait(Math.min(remainingMs, 16));
    remainingMs = targetMs - performance.now();
  }
}

function midiToFrequency(midi: number): number {
  return 440 * (2 ** ((midi - 69) / 12));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getPreferredContainerOrder(preferAlpha: boolean): ExportVideoContainer[] {
  if (!preferAlpha) {
    return RECORDER_CONTAINERS;
  }

  return [
    ...RECORDER_CONTAINERS.filter((container) => container.supportsAlpha),
    ...RECORDER_CONTAINERS.filter((container) => !container.supportsAlpha),
  ];
}

function createOfflineAudioContext(
  durationSec: number,
  sampleRate: number,
): OfflineAudioContext {
  const frameCount = Math.max(1, Math.ceil(durationSec * sampleRate));
  return new OfflineAudioContext(2, frameCount, sampleRate);
}

function scheduleSourceAudio(
  context: OfflineAudioContext,
  project: BoomwhackerVideoBuilderProject,
  sourceAudioBuffer: AudioBuffer,
): void {
  const sourceNode = context.createBufferSource();
  const gainNode = context.createGain();
  sourceNode.buffer = sourceAudioBuffer;
  gainNode.gain.value = project.exportState.includeSynthPlayback ? 0.88 : 1;
  sourceNode.connect(gainNode);
  gainNode.connect(context.destination);
  sourceNode.start(project.exportState.leadInDurationSec);
}

function scheduleSynthNotes(
  context: OfflineAudioContext,
  project: BoomwhackerVideoBuilderProject,
  timedNotes: TimedBoomwhackerNote[],
  durationSec: number,
): void {
  if (!project.exportState.includeSynthPlayback || timedNotes.length === 0) {
    return;
  }

  const synthMasterGainNode = context.createGain();
  synthMasterGainNode.gain.value = 0.24;
  synthMasterGainNode.connect(context.destination);

  for (const note of timedNotes) {
    const noteStartSec = project.exportState.leadInDurationSec + note.startTimeSec;
    const sustainEndSec = clamp(
      project.exportState.leadInDurationSec + note.endTimeSec,
      noteStartSec + 0.04,
      Math.max(noteStartSec + 0.04, durationSec - 0.01),
    );
    const releaseEndSec = Math.min(durationSec, sustainEndSec + SYNTH_RELEASE_SEC);
    const attackEndSec = Math.min(sustainEndSec, noteStartSec + SYNTH_ATTACK_SEC);
    const decayEndSec = Math.min(sustainEndSec, attackEndSec + SYNTH_DECAY_SEC);
    const sustainGain = Math.max(SYNTH_FLOOR_GAIN, SYNTH_GAIN * SYNTH_SUSTAIN_LEVEL);
    if (noteStartSec >= durationSec || releaseEndSec <= noteStartSec) {
      continue;
    }

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = SYNTH_OSCILLATOR_TYPE;
    oscillator.frequency.setValueAtTime(
      midiToFrequency(SYNTH_ROOT_MIDI + note.pitchInterval),
      noteStartSec,
    );

    gainNode.gain.setValueAtTime(SYNTH_FLOOR_GAIN, noteStartSec);
    gainNode.gain.exponentialRampToValueAtTime(SYNTH_GAIN, attackEndSec);
    if (decayEndSec > attackEndSec) {
      gainNode.gain.exponentialRampToValueAtTime(sustainGain, decayEndSec);
    }
    gainNode.gain.setValueAtTime(sustainGain, sustainEndSec);
    gainNode.gain.exponentialRampToValueAtTime(SYNTH_FLOOR_GAIN, releaseEndSec);

    oscillator.connect(gainNode);
    gainNode.connect(synthMasterGainNode);
    oscillator.start(noteStartSec);
    oscillator.stop(Math.min(durationSec, releaseEndSec + 0.01));
  }
}

async function renderExportAudioBuffer(
  project: BoomwhackerVideoBuilderProject,
  timing: DerivedTimingModel,
  timedNotes: TimedBoomwhackerNote[],
  sourceAudioBuffer: AudioBuffer | null | undefined,
): Promise<AudioBuffer | null> {
  const shouldIncludeSource = Boolean(sourceAudioBuffer);
  const shouldIncludeSynth = project.exportState.includeSynthPlayback && timedNotes.length > 0;
  if (!shouldIncludeSource && !shouldIncludeSynth) {
    return null;
  }

  const sampleRate = sourceAudioBuffer?.sampleRate ?? DEFAULT_EXPORT_SAMPLE_RATE;
  const durationSec = getExportTotalDurationSec(project, timing);
  const context = createOfflineAudioContext(durationSec, sampleRate);

  if (sourceAudioBuffer) {
    scheduleSourceAudio(context, project, sourceAudioBuffer);
  }
  if (shouldIncludeSynth) {
    scheduleSynthNotes(context, project, timedNotes, durationSec);
  }

  return context.startRendering();
}

async function createRealtimeAudioPlaybackStream(audioBuffer: AudioBuffer): Promise<AudioPlaybackStream | null> {
  const AudioContextConstructor = getAudioContextConstructor();
  if (!AudioContextConstructor) {
    return null;
  }

  const audioContext = new AudioContextConstructor({
    sampleRate: audioBuffer.sampleRate,
  });
  const destination = audioContext.createMediaStreamDestination();
  const sourceNode = audioContext.createBufferSource();
  sourceNode.buffer = audioBuffer;
  sourceNode.connect(destination);

  let started = false;
  let stopped = false;

  return {
    stream: destination.stream,
    start: async () => {
      if (started || stopped) {
        return;
      }
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      sourceNode.start(0);
      started = true;
    },
    stop: () => {
      if (stopped) {
        return;
      }
      stopped = true;
      try {
        sourceNode.stop();
      } catch {
        // Ignore stop races after the source has already ended.
      }
      destination.stream.getTracks().forEach((track) => track.stop());
      void audioContext.close();
    },
  };
}

function getVideoBitrate(width: number, height: number, fps: number): number {
  const megapixels = (width * height) / 1_000_000;
  return Math.max(4_000_000, Math.round(megapixels * fps * 220_000));
}

function createRecorderForStream(
  stream: MediaStream,
  preferAlpha: boolean,
  width: number,
  height: number,
  fps: number,
): {
  recorder: MediaRecorder;
  container: ExportVideoContainer;
} {
  const supportedContainers = getSupportedExportContainers(preferAlpha);
  let lastError: unknown = null;

  for (const container of supportedContainers) {
    try {
      return {
        recorder: new MediaRecorder(stream, {
          mimeType: container.mimeType,
          videoBitsPerSecond: getVideoBitrate(width, height, fps),
        }),
        container,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('No supported browser recorder format could be initialized for this export.');
}

export function getSupportedExportContainers(preferAlpha = false): ExportVideoContainer[] {
  return getPreferredContainerOrder(preferAlpha).filter((container) => isMediaRecorderSupported(container));
}

export function getPreferredExportContainer(preferAlpha = false): ExportVideoContainer | null {
  return getSupportedExportContainers(preferAlpha)[0] ?? null;
}

export async function exportProjectVideo(
  params: ExportProjectVideoParams,
): Promise<ExportProjectVideoResult> {
  const {
    project,
    timing,
    guides,
    timedNotes,
    sourceAudioBuffer,
    onProgress,
  } = params;

  if (typeof document === 'undefined') {
    throw new Error('Video export is only available in a browser environment.');
  }

  if (!getPreferredExportContainer(project.exportState.transparentBackground)) {
    throw new Error('No supported browser video recorder format is available.');
  }

  const totalDurationSec = getExportTotalDurationSec(project, timing);
  const totalFrames = Math.max(1, Math.ceil(totalDurationSec * Math.max(1, project.exportState.fps)));
  const canvas = document.createElement('canvas');

  const canvasWithCapture = canvas as HTMLCanvasElement & {
    captureStream?: (frameRate?: number) => MediaStream;
  };
  if (typeof canvasWithCapture.captureStream !== 'function') {
    throw new Error('This browser does not support canvas stream capture for video export.');
  }

  await renderExportFrame({
    canvas,
    project,
    timing,
    guides,
    timedNotes,
    frameTimeSec: 0,
  });

  const canvasStream = canvasWithCapture.captureStream(Math.max(1, project.exportState.fps));
  const videoTrack = canvasStream.getVideoTracks()[0] as MediaStreamTrack & {
    requestFrame?: () => void;
  };
  if (!videoTrack) {
    throw new Error('Canvas capture did not produce a video track.');
  }

  const renderedAudioBuffer = await renderExportAudioBuffer(
    project,
    timing,
    timedNotes,
    sourceAudioBuffer,
  );
  const audioPlayback = renderedAudioBuffer
    ? await createRealtimeAudioPlaybackStream(renderedAudioBuffer)
    : null;
  const exportAudioUnavailable = Boolean(renderedAudioBuffer) && !audioPlayback;

  const stream = new MediaStream([
    videoTrack,
    ...(audioPlayback?.stream.getAudioTracks() ?? []),
  ]);
  const {
    recorder,
    container,
  } = createRecorderForStream(
    stream,
    project.exportState.transparentBackground,
    project.exportState.width,
    project.exportState.height,
    project.exportState.fps,
  );

  const chunks: Blob[] = [];
  const stopped = new Promise<void>((resolve, reject) => {
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    });
    recorder.addEventListener('stop', () => resolve(), { once: true });
    recorder.addEventListener('error', (event) => {
      const error = (event as Event & { error?: DOMException }).error;
      reject(error ?? new Error('The browser recorder failed during export.'));
    }, { once: true });
  });

  try {
    recorder.start();

    videoTrack.requestFrame?.();
    onProgress?.({
      frameIndex: 1,
      totalFrames,
      frameTimeSec: 0,
    });
    await audioPlayback?.start();
    const startMs = performance.now();

    for (let frameIndex = 1; frameIndex < totalFrames; frameIndex += 1) {
      const frameTimeSec = Math.min(totalDurationSec, frameIndex / project.exportState.fps);
      await waitUntil(startMs + ((frameIndex / project.exportState.fps) * 1000));
      await renderExportFrame({
        canvas,
        project,
        timing,
        guides,
        timedNotes,
        frameTimeSec,
      });
      videoTrack.requestFrame?.();
      onProgress?.({
        frameIndex: frameIndex + 1,
        totalFrames,
        frameTimeSec,
      });
    }

    await wait(Math.max(80, Math.round(1000 / Math.max(1, project.exportState.fps))));
    recorder.stop();
    await stopped;
  } finally {
    if (recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        // Ignore recorder stop races during cleanup.
      }
    }
    stream.getTracks().forEach((track) => track.stop());
    audioPlayback?.stop();
  }

  const warnings: string[] = [];
  if (container.extension !== '.mp4') {
    warnings.push('This browser does not expose MP4 recording, so the export was packaged as WebM.');
  }
  if (project.exportState.transparentBackground && !container.supportsAlpha) {
    warnings.push('Transparent background is enabled, but the chosen browser format does not guarantee alpha preservation.');
  }
  if (exportAudioUnavailable) {
    warnings.push('The browser recorder could not attach an audio stream, so the export was packaged without audio.');
  }
  if (chunks.length === 0) {
    throw new Error('The browser recorder completed without producing video data.');
  }

  return {
    blob: new Blob(chunks, {
      type: container.saveMimeType,
    }),
    container,
    warnings,
  };
}
