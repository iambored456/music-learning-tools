import createSignalsmithStretch from 'signalsmith-stretch';

const EXTRA_RENDER_TAIL_SEC = 1;
const WAV_BITS_PER_SAMPLE = 16;
const WAV_HEADER_BYTES = 44;

function clampSample(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

function createTrimmedAudioBuffer(source: AudioBuffer, targetFrameCount: number): AudioBuffer {
  const frameCount = Math.max(1, targetFrameCount);
  const trimmedBuffer = new AudioBuffer({
    length: frameCount,
    numberOfChannels: source.numberOfChannels,
    sampleRate: source.sampleRate,
  });

  for (let channelIndex = 0; channelIndex < source.numberOfChannels; channelIndex += 1) {
    const channelData = new Float32Array(frameCount);
    const sourceChannel = source.getChannelData(channelIndex);
    channelData.set(sourceChannel.subarray(0, frameCount));
    trimmedBuffer.copyToChannel(channelData, channelIndex);
  }

  return trimmedBuffer;
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index));
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

  if (typeof OfflineAudioContext === 'undefined') {
    throw new Error('OfflineAudioContext is unavailable in this browser.');
  }

  const channelCount = Math.max(1, sourceAudioBuffer.numberOfChannels);
  const renderFrameCount = sourceAudioBuffer.length + Math.ceil(sourceAudioBuffer.sampleRate * EXTRA_RENDER_TAIL_SEC);
  const renderContext = new OfflineAudioContext(channelCount, renderFrameCount, sourceAudioBuffer.sampleRate);

  const stretchNode = await createSignalsmithStretch(renderContext, {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [channelCount],
  });
  stretchNode.connect(renderContext.destination);

  const transferredBuffers = Array.from({ length: channelCount }, (_, channelIndex) => (
    new Float32Array(sourceAudioBuffer.getChannelData(channelIndex))
  ));

  await stretchNode.addBuffers(
    transferredBuffers,
    transferredBuffers.map((channelData) => channelData.buffer),
  );
  await stretchNode.start({
    active: true,
    input: 0,
    output: 0,
    rate: 1,
    semitones: normalizedTransposeSemitones,
  });
  await stretchNode.stop(sourceAudioBuffer.duration);

  const renderedBuffer = await renderContext.startRendering();
  return createTrimmedAudioBuffer(renderedBuffer, sourceAudioBuffer.length);
}

export function audioBufferToWavBlob(audioBuffer: AudioBuffer): Blob {
  const channelCount = Math.max(1, audioBuffer.numberOfChannels);
  const bytesPerSample = WAV_BITS_PER_SAMPLE / 8;
  const blockAlign = channelCount * bytesPerSample;
  const byteRate = audioBuffer.sampleRate * blockAlign;
  const dataByteLength = audioBuffer.length * blockAlign;
  const wavBuffer = new ArrayBuffer(WAV_HEADER_BYTES + dataByteLength);
  const view = new DataView(wavBuffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, audioBuffer.sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, WAV_BITS_PER_SAMPLE, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataByteLength, true);

  let writeOffset = WAV_HEADER_BYTES;
  for (let frameIndex = 0; frameIndex < audioBuffer.length; frameIndex += 1) {
    for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
      const sample = clampSample(audioBuffer.getChannelData(channelIndex)[frameIndex] ?? 0);
      const intSample = sample < 0
        ? Math.round(sample * 0x8000)
        : Math.round(sample * 0x7fff);
      view.setInt16(writeOffset, intSample, true);
      writeOffset += bytesPerSample;
    }
  }

  return new Blob([wavBuffer], { type: 'audio/wav' });
}
