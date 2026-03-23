import type { BeatPin, ProjectAudio } from '@mlt/boomwhacker-video-builder-core';

const DEFAULT_WAVEFORM_BUCKET_COUNT = 2048;
const ANALYSIS_WINDOW_SIZE = 2048;
const ANALYSIS_HOP_SIZE = 1024;
const MIN_BPM = 60;
const MAX_BPM = 180;
const FALLBACK_BPM = 120;

export interface WaveformOverview {
  peaks: number[];
  durationSec: number;
}

export interface BeatAnalysisResult {
  beatPins: BeatPin[];
  estimatedTempoBpm: number | null;
}

export interface ImportedAudioAsset {
  audio: ProjectAudio;
  audioBuffer: AudioBuffer;
  audioPreviewUrl: string;
  waveform: WaveformOverview;
  beatAnalysis: BeatAnalysisResult;
}

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  const windowWithWebkit = window as Window & { webkitAudioContext?: AudioContextCtor };
  return window.AudioContext ?? windowWithWebkit.webkitAudioContext ?? null;
}

async function decodeAudioArrayBuffer(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
  const AudioContextClass = getAudioContextCtor();
  if (!AudioContextClass) {
    throw new Error('Web Audio decoding is not available in this browser.');
  }

  const context = new AudioContextClass();
  try {
    return await context.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    await context.close().catch(() => undefined);
  }
}

function arrayBufferToBase64(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    let chunkBinary = '';
    for (let index = 0; index < chunk.length; index += 1) {
      chunkBinary += String.fromCharCode(chunk[index] ?? 0);
    }
    binary += chunkBinary;
  }

  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function createImportedAudioAsset(
  projectAudio: ProjectAudio,
  audioBuffer: AudioBuffer,
  previewBlob: Blob,
): ImportedAudioAsset {
  return {
    audio: {
      ...projectAudio,
      durationSec: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channelCount: audioBuffer.numberOfChannels,
    },
    audioBuffer,
    audioPreviewUrl: URL.createObjectURL(previewBlob),
    waveform: extractWaveformOverview(audioBuffer),
    beatAnalysis: analyzeBeatPins(audioBuffer),
  };
}

function createMonoMix(audioBuffer: AudioBuffer): Float32Array {
  const mono = new Float32Array(audioBuffer.length);
  const channelCount = Math.max(1, audioBuffer.numberOfChannels);

  for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
    const channelData = audioBuffer.getChannelData(channelIndex);
    for (let sampleIndex = 0; sampleIndex < channelData.length; sampleIndex += 1) {
      mono[sampleIndex] += (channelData[sampleIndex] ?? 0) / channelCount;
    }
  }

  return mono;
}

export function extractWaveformOverview(
  audioBuffer: AudioBuffer,
  bucketCount: number = DEFAULT_WAVEFORM_BUCKET_COUNT,
): WaveformOverview {
  const mono = createMonoMix(audioBuffer);
  const safeBucketCount = Math.max(64, Math.min(2048, Math.round(bucketCount)));
  const samplesPerBucket = Math.max(1, Math.floor(mono.length / safeBucketCount));
  const peaks: number[] = [];
  let maxPeak = 0;

  for (let bucketIndex = 0; bucketIndex < safeBucketCount; bucketIndex += 1) {
    const start = bucketIndex * samplesPerBucket;
    const end = bucketIndex === safeBucketCount - 1
      ? mono.length
      : Math.min(mono.length, start + samplesPerBucket);

    let bucketPeak = 0;
    for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
      const absValue = Math.abs(mono[sampleIndex] ?? 0);
      if (absValue > bucketPeak) {
        bucketPeak = absValue;
      }
    }

    peaks.push(bucketPeak);
    if (bucketPeak > maxPeak) {
      maxPeak = bucketPeak;
    }
  }

  const normalizer = maxPeak > 0 ? maxPeak : 1;
  return {
    peaks: peaks.map((peak) => peak / normalizer),
    durationSec: audioBuffer.duration,
  };
}

function buildEnergyEnvelope(mono: Float32Array): number[] {
  const envelope: number[] = [];
  for (let start = 0; start < mono.length; start += ANALYSIS_HOP_SIZE) {
    const end = Math.min(mono.length, start + ANALYSIS_WINDOW_SIZE);
    let sumSquares = 0;
    for (let index = start; index < end; index += 1) {
      const sample = mono[index] ?? 0;
      sumSquares += sample * sample;
    }
    envelope.push(Math.sqrt(sumSquares / Math.max(1, end - start)));
  }
  return envelope;
}

function movingAverage(values: number[], radius: number): number[] {
  if (values.length === 0) {
    return [];
  }

  const averages: number[] = [];
  for (let index = 0; index < values.length; index += 1) {
    let sum = 0;
    let count = 0;
    for (let offset = -radius; offset <= radius; offset += 1) {
      const value = values[index + offset];
      if (value === undefined) {
        continue;
      }
      sum += value;
      count += 1;
    }
    averages.push(count > 0 ? sum / count : values[index] ?? 0);
  }
  return averages;
}

function findPeakIndices(values: number[], threshold: number): number[] {
  const indices: number[] = [];
  for (let index = 1; index < values.length - 1; index += 1) {
    const value = values[index] ?? 0;
    if (
      value >= threshold
      && value >= (values[index - 1] ?? Number.NEGATIVE_INFINITY)
      && value > (values[index + 1] ?? Number.NEGATIVE_INFINITY)
    ) {
      indices.push(index);
    }
  }
  return indices;
}

function getAutocorrelationLag(novelty: number[], frameRate: number): number {
  const minLag = Math.max(1, Math.round((60 / MAX_BPM) * frameRate));
  const maxLag = Math.max(minLag + 1, Math.round((60 / MIN_BPM) * frameRate));
  const preferredLag = Math.round((60 / FALLBACK_BPM) * frameRate);

  let bestLag = preferredLag;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let score = 0;
    for (let index = 0; index < novelty.length - lag; index += 1) {
      score += (novelty[index] ?? 0) * (novelty[index + lag] ?? 0);
    }

    const tempoBpm = (60 * frameRate) / lag;
    const tempoWeight = tempoBpm >= 80 && tempoBpm <= 140 ? 1.12 : 1;
    const weightedScore = score * tempoWeight;
    if (weightedScore > bestScore) {
      bestScore = weightedScore;
      bestLag = lag;
    }
  }

  return bestLag;
}

function snapFrameIndex(targetIndex: number, peakIndices: number[], novelty: number[], toleranceFrames: number): number {
  let bestIndex = Math.max(0, Math.round(targetIndex));
  let bestDistance = toleranceFrames + 1;
  let bestScore = novelty[bestIndex] ?? 0;

  for (const peakIndex of peakIndices) {
    const distance = Math.abs(peakIndex - targetIndex);
    if (distance > toleranceFrames) {
      continue;
    }

    const score = novelty[peakIndex] ?? 0;
    if (distance < bestDistance || (distance === bestDistance && score > bestScore)) {
      bestIndex = peakIndex;
      bestDistance = distance;
      bestScore = score;
    }
  }

  return bestIndex;
}

function buildBeatFrameIndices(novelty: number[], peakIndices: number[], lag: number): number[] {
  if (peakIndices.length === 0) {
    return [];
  }

  const toleranceFrames = Math.max(1, Math.round(lag * 0.22));
  const candidateStarts = peakIndices.slice(0, Math.min(peakIndices.length, 64));
  let bestPhaseIndex = candidateStarts[0] ?? 0;
  let bestPhaseScore = Number.NEGATIVE_INFINITY;

  for (const candidateStart of candidateStarts) {
    let score = 0;
    for (let target = candidateStart; target < novelty.length; target += lag) {
      const snapped = snapFrameIndex(target, peakIndices, novelty, toleranceFrames);
      score += novelty[snapped] ?? 0;
    }
    for (let target = candidateStart - lag; target >= 0; target -= lag) {
      const snapped = snapFrameIndex(target, peakIndices, novelty, toleranceFrames);
      score += novelty[snapped] ?? 0;
    }

    if (score > bestPhaseScore) {
      bestPhaseScore = score;
      bestPhaseIndex = candidateStart;
    }
  }

  let firstTarget = bestPhaseIndex;
  while (firstTarget - lag > 0) {
    firstTarget -= lag;
  }

  const beatFrameIndices: number[] = [];
  const minimumSpacing = Math.max(1, Math.round(lag * 0.45));
  for (let target = firstTarget; target < novelty.length; target += lag) {
    const snapped = snapFrameIndex(target, peakIndices, novelty, toleranceFrames);
    const previousIndex = beatFrameIndices[beatFrameIndices.length - 1];
    if (previousIndex === undefined || snapped - previousIndex >= minimumSpacing) {
      beatFrameIndices.push(snapped);
    }
  }

  return beatFrameIndices;
}

function createFallbackBeatPins(durationSec: number, frameRate: number): BeatAnalysisResult {
  const beatIntervalSec = 60 / FALLBACK_BPM;
  const beatPins: BeatPin[] = [];
  let beatIndex = 0;

  for (let timeSec = 0; timeSec <= durationSec; timeSec += beatIntervalSec) {
    beatPins.push({
      id: `beat-${beatIndex + 1}`,
      timeSec: Number(timeSec.toFixed(4)),
      confidence: frameRate > 0 ? 0.25 : undefined,
      isDownbeat: beatIndex === 0,
      annotationIds: [],
    });
    beatIndex += 1;
  }

  return {
    beatPins,
    estimatedTempoBpm: FALLBACK_BPM,
  };
}

export function analyzeBeatPins(audioBuffer: AudioBuffer): BeatAnalysisResult {
  const mono = createMonoMix(audioBuffer);
  const envelope = buildEnergyEnvelope(mono);
  const smoothedEnvelope = movingAverage(envelope, 8);
  const novelty = envelope.map((value, index) => Math.max(0, value - (smoothedEnvelope[index] ?? 0)));
  const averageNovelty = novelty.reduce((sum, value) => sum + value, 0) / Math.max(1, novelty.length);
  const variance = novelty.reduce((sum, value) => sum + ((value - averageNovelty) ** 2), 0) / Math.max(1, novelty.length);
  const threshold = averageNovelty + Math.sqrt(variance) * 0.6;
  const peakIndices = findPeakIndices(novelty, threshold);
  const frameRate = audioBuffer.sampleRate / ANALYSIS_HOP_SIZE;

  if (peakIndices.length < 2 || frameRate <= 0) {
    return createFallbackBeatPins(audioBuffer.duration, frameRate);
  }

  const lag = getAutocorrelationLag(novelty, frameRate);
  const beatFrameIndices = buildBeatFrameIndices(novelty, peakIndices, lag);
  if (beatFrameIndices.length < 2) {
    return createFallbackBeatPins(audioBuffer.duration, frameRate);
  }

  const maxNovelty = novelty.reduce((max, value) => Math.max(max, value), 0) || 1;
  const beatPins = beatFrameIndices.map((frameIndex, index) => ({
    id: `beat-${index + 1}`,
    timeSec: Number(((frameIndex * ANALYSIS_HOP_SIZE) / audioBuffer.sampleRate).toFixed(4)),
    confidence: Number(((novelty[frameIndex] ?? 0) / maxNovelty).toFixed(3)),
    isDownbeat: index === 0,
    annotationIds: [],
  }));

  return {
    beatPins,
    estimatedTempoBpm: Number((((60 * frameRate) / lag)).toFixed(2)),
  };
}

export async function importAudioFile(file: File): Promise<ImportedAudioAsset> {
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await decodeAudioArrayBuffer(arrayBuffer);
  const base64 = arrayBufferToBase64(arrayBuffer);

  return createImportedAudioAsset(
    {
      originalFileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      durationSec: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channelCount: audioBuffer.numberOfChannels,
      storageStrategy: 'embedded',
      embeddedBase64: base64,
      externalFileToken: null,
    },
    audioBuffer,
    file,
  );
}

export async function hydrateProjectAudioFromBlob(
  projectAudio: ProjectAudio,
  blob: Blob,
): Promise<ImportedAudioAsset> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await decodeAudioArrayBuffer(arrayBuffer);

  return createImportedAudioAsset(
    {
      ...projectAudio,
      durationSec: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channelCount: audioBuffer.numberOfChannels,
    },
    audioBuffer,
    blob,
  );
}

export async function hydrateProjectAudio(projectAudio: ProjectAudio): Promise<ImportedAudioAsset | null> {
  if (!projectAudio.embeddedBase64) {
    return null;
  }

  const arrayBuffer = base64ToArrayBuffer(projectAudio.embeddedBase64);
  const audioBuffer = await decodeAudioArrayBuffer(arrayBuffer);
  const blob = new Blob([arrayBuffer], { type: projectAudio.mimeType || 'application/octet-stream' });

  return createImportedAudioAsset(projectAudio, audioBuffer, blob);
}
