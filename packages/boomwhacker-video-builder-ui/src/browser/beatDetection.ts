import type { BeatPin } from '@mlt/boomwhacker-video-builder-core';
import {
  detectBeatsFromPcm,
  type BeatDetectionProgress,
  type BeatDetectionResult,
} from '@mlt/tempogram-toolbox-core';
import { createMonoMix } from './audio.js';

export interface DetectBeatPinsFromAudioBufferOptions {
  onProgress?: (progress: BeatDetectionProgress) => void;
  analysisSampleRate?: number;
}

export interface DetectBeatPinsFromAudioBufferResult {
  beatPins: BeatPin[];
  analysis: BeatDetectionResult;
}

export async function detectBeatPinsFromAudioBuffer(
  audioBuffer: AudioBuffer,
  options: DetectBeatPinsFromAudioBufferOptions = {},
): Promise<DetectBeatPinsFromAudioBufferResult> {
  const requestedAnalysisSampleRate = Math.min(
    audioBuffer.sampleRate,
    Math.max(1, Math.round(options.analysisSampleRate ?? 22050)),
  );

  console.info('[BVB Beat Detect] Preparing audio for analysis.', {
    durationSec: audioBuffer.duration,
    sourceSampleRate: audioBuffer.sampleRate,
    analysisSampleRate: requestedAnalysisSampleRate,
    channelCount: audioBuffer.numberOfChannels,
    sampleCount: audioBuffer.length,
  });

  const preparedAudio = await prepareAnalysisAudio(audioBuffer, requestedAnalysisSampleRate);
  console.info('[BVB Beat Detect] Analysis audio ready.', {
    sampleCount: preparedAudio.samples.length,
    sampleRate: preparedAudio.sampleRate,
    resampled: preparedAudio.resampled,
  });
  const analysis = await detectBeatsFromPcm(preparedAudio.samples, preparedAudio.sampleRate, {
    onProgress: options.onProgress,
  });
  console.info('[BVB Beat Detect] Beat analysis complete.', {
    detectedBeatCount: analysis.beats.length,
    estimatedTempoBpm: analysis.estimatedTempoBpm,
    noveltyLength: analysis.noveltyCurve.length,
    plpLength: analysis.plpCurve.length,
  });

  const beatPins = analysis.beats.map((beat, index) => ({
      id: createDetectedBeatPinId(index),
      timeSec: Number(beat.timeSec.toFixed(4)),
      confidence: Number(beat.confidence.toFixed(4)),
      annotationIds: [],
    }));

  console.info('[BVB Beat Detect] Beat pins prepared.', {
    beatPinCount: beatPins.length,
    firstBeatSec: beatPins[0]?.timeSec ?? null,
    lastBeatSec: beatPins[beatPins.length - 1]?.timeSec ?? null,
  });

  return {
    beatPins,
    analysis,
  };
}

function createDetectedBeatPinId(index: number): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `beat-auto-${crypto.randomUUID()}`;
  }
  return `beat-auto-${Date.now()}-${index}`;
}

type PreparedAnalysisAudio = {
  samples: Float32Array;
  sampleRate: number;
  resampled: boolean;
};

type OfflineAudioContextCtor = typeof OfflineAudioContext;

function getOfflineAudioContextCtor(): OfflineAudioContextCtor | null {
  const windowWithWebkit = window as Window & {
    webkitOfflineAudioContext?: OfflineAudioContextCtor;
  };
  return window.OfflineAudioContext ?? windowWithWebkit.webkitOfflineAudioContext ?? null;
}

async function prepareAnalysisAudio(
  audioBuffer: AudioBuffer,
  targetSampleRate: number,
): Promise<PreparedAnalysisAudio> {
  const mono = createMonoMix(audioBuffer);
  if (targetSampleRate >= audioBuffer.sampleRate) {
    console.info('[BVB Beat Detect] Skipping resample.', {
      sampleRate: audioBuffer.sampleRate,
    });
    return {
      samples: mono,
      sampleRate: audioBuffer.sampleRate,
      resampled: false,
    };
  }

  const OfflineAudioContextClass = getOfflineAudioContextCtor();
  if (!OfflineAudioContextClass) {
    console.warn('[BVB Beat Detect] OfflineAudioContext unavailable. Falling back to original sample rate.', {
      sourceSampleRate: audioBuffer.sampleRate,
      requestedSampleRate: targetSampleRate,
    });
    return {
      samples: mono,
      sampleRate: audioBuffer.sampleRate,
      resampled: false,
    };
  }

  console.info('[BVB Beat Detect] Resampling audio for analysis.', {
    sourceSampleRate: audioBuffer.sampleRate,
    targetSampleRate,
    sourceSampleCount: mono.length,
  });

  try {
    const frameCount = Math.max(1, Math.ceil(audioBuffer.duration * targetSampleRate));
    const offlineContext = new OfflineAudioContextClass(1, frameCount, targetSampleRate);
    const sourceBuffer = offlineContext.createBuffer(1, mono.length, audioBuffer.sampleRate);
    const monoBuffer = new Float32Array(mono.length);
    monoBuffer.set(mono);
    sourceBuffer.copyToChannel(monoBuffer, 0);

    const sourceNode = offlineContext.createBufferSource();
    sourceNode.buffer = sourceBuffer;
    sourceNode.connect(offlineContext.destination);
    sourceNode.start();

    const renderedBuffer = await offlineContext.startRendering();
    const renderedMono = Float32Array.from(renderedBuffer.getChannelData(0));
    console.info('[BVB Beat Detect] Resample complete.', {
      renderedSampleRate: renderedBuffer.sampleRate,
      renderedSampleCount: renderedMono.length,
    });
    return {
      samples: renderedMono,
      sampleRate: renderedBuffer.sampleRate,
      resampled: true,
    };
  } catch (error) {
    console.warn('[BVB Beat Detect] Resample failed. Falling back to original sample rate.', error);
    return {
      samples: mono,
      sampleRate: audioBuffer.sampleRate,
      resampled: false,
    };
  }
}
