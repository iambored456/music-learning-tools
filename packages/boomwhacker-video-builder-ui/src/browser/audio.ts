import type { ProjectAudio } from '@mlt/boomwhacker-video-builder-core';
import { audioBufferToWavBlob } from './audioTransform.js';

const DEFAULT_WAVEFORM_BUCKET_COUNT = 2048;

export interface WaveformOverview {
  peaks: number[];
  durationSec: number;
}

export interface ImportedAudioAsset {
  audio: ProjectAudio;
  audioBuffer: AudioBuffer;
  audioPreviewUrl: string;
  waveform: WaveformOverview;
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

function canBrowserPlayAudioBlob(blob: Blob): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  const mimeType = blob.type.trim();
  if (!mimeType) {
    return false;
  }

  return document.createElement('audio').canPlayType(mimeType) !== '';
}

function getPreviewPlaybackBlob(audioBuffer: AudioBuffer, sourceBlob: Blob): Blob {
  if (canBrowserPlayAudioBlob(sourceBlob)) {
    return sourceBlob;
  }

  // Some uploads decode successfully in Web Audio but fail or stay silent in
  // HTMLAudioElement when the Blob MIME type is empty or too generic.
  return audioBufferToWavBlob(audioBuffer);
}

function createImportedAudioAsset(
  projectAudio: ProjectAudio,
  audioBuffer: AudioBuffer,
  previewBlob: Blob,
): ImportedAudioAsset {
  const previewPlaybackBlob = getPreviewPlaybackBlob(audioBuffer, previewBlob);
  return {
    audio: {
      ...projectAudio,
      durationSec: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channelCount: audioBuffer.numberOfChannels,
    },
    audioBuffer,
    audioPreviewUrl: URL.createObjectURL(previewPlaybackBlob),
    waveform: extractWaveformOverview(audioBuffer),
  };
}

export function createMonoMix(audioBuffer: AudioBuffer): Float32Array {
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
