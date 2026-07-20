const GRAIN_SIZE_SEC = 0.08;
const CHUNK_SAMPLE_COUNT = 16_384;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function readInterpolatedSample(channelData: Float32Array, position: number): number {
  if (channelData.length === 0) {
    return 0;
  }

  const clampedPosition = clamp(position, 0, channelData.length - 1);
  const index = Math.floor(clampedPosition);
  const nextIndex = Math.min(channelData.length - 1, index + 1);
  const fraction = clampedPosition - index;
  return channelData[index] + ((channelData[nextIndex] - channelData[index]) * fraction);
}

function hannWindow(phase: number, grainSize: number): number {
  return 0.5 - (0.5 * Math.cos((2 * Math.PI * phase) / Math.max(1, grainSize)));
}

function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

async function renderShiftedChannel(
  sourceChannel: Float32Array,
  targetChannel: Float32Array,
  pitchRatio: number,
  sampleRate: number,
): Promise<void> {
  const grainSize = Math.max(512, Math.round(sampleRate * GRAIN_SIZE_SEC));
  const halfGrain = Math.max(1, Math.floor(grainSize / 2));
  const pitchDelta = pitchRatio - 1;

  for (let chunkStart = 0; chunkStart < targetChannel.length; chunkStart += CHUNK_SAMPLE_COUNT) {
    const chunkEnd = Math.min(targetChannel.length, chunkStart + CHUNK_SAMPLE_COUNT);

    for (let outputIndex = chunkStart; outputIndex < chunkEnd; outputIndex += 1) {
      const phaseA = outputIndex % grainSize;
      const phaseB = (phaseA + halfGrain) % grainSize;
      const windowA = hannWindow(phaseA, grainSize);
      const windowB = hannWindow(phaseB, grainSize);
      const readPositionA = outputIndex + (phaseA * pitchDelta);
      const readPositionB = outputIndex + (phaseB * pitchDelta);
      const sampleA = readInterpolatedSample(sourceChannel, readPositionA);
      const sampleB = readInterpolatedSample(sourceChannel, readPositionB);
      const windowTotal = Math.max(0.0001, windowA + windowB);
      targetChannel[outputIndex] = ((sampleA * windowA) + (sampleB * windowB)) / windowTotal;
    }

    await yieldToMainThread();
  }
}

export async function renderTransposedAudioBuffer(
  sourceAudioBuffer: AudioBuffer,
  transposeSemitones: number,
): Promise<AudioBuffer> {
  const normalizedTransposeSemitones = Math.round(transposeSemitones);
  if (normalizedTransposeSemitones === 0) {
    return sourceAudioBuffer;
  }

  const pitchRatio = 2 ** (normalizedTransposeSemitones / 12);
  const renderedBuffer = new AudioBuffer({
    length: sourceAudioBuffer.length,
    numberOfChannels: sourceAudioBuffer.numberOfChannels,
    sampleRate: sourceAudioBuffer.sampleRate,
  });

  for (let channelIndex = 0; channelIndex < sourceAudioBuffer.numberOfChannels; channelIndex += 1) {
    await renderShiftedChannel(
      sourceAudioBuffer.getChannelData(channelIndex),
      renderedBuffer.getChannelData(channelIndex),
      pitchRatio,
      sourceAudioBuffer.sampleRate,
    );
  }

  return renderedBuffer;
}
