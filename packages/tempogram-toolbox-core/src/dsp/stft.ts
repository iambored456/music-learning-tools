import type { ComplexMatrix, RealMatrix, SpectrogramResult } from "../types.js";
import { assert, matlabRound } from "../utils/math.js";
import { createComplexMatrix, createRealMatrix } from "../utils/matrix.js";
import { fft } from "./fft.js";
import { hann } from "./windows.js";

export interface StftOptions {
  StftWindow?: ArrayLike<number>;
  stepsize?: number;
  nFFT?: number;
  returnMagSpec?: boolean;
  coefficientRange?: [number, number];
  fs?: number;
}

export function computeSpectrogramViaSTFT(
  audio: ArrayLike<number>,
  options: StftOptions = {},
): SpectrogramResult {
  assert(audio.length > 0, "audio signal must be non-empty");

  const stftWindow = Float64Array.from(options.StftWindow ?? hann(4096));
  const windowLength = stftWindow.length;
  const stepsize = options.stepsize ?? matlabRound(windowLength / 2);
  const fftLength = Math.max(options.nFFT ?? windowLength, windowLength);
  const returnMagSpec = options.returnMagSpec ?? false;
  const coefficientRange =
    options.coefficientRange ??
    ([1, Math.floor(Math.max(fftLength, windowLength) / 2) + 1] as [number, number]);
  const fs = options.fs ?? 22050;

  assert(stepsize > 0, "stepsize must be positive");
  assert(coefficientRange[0] >= 1, "coefficientRange must use MATLAB-style 1-based indices");
  assert(coefficientRange[1] >= coefficientRange[0], "coefficientRange must be ascending");

  const featureRate = fs / stepsize;
  const wavSize = audio.length;
  const firstWindowOffset = Math.floor(windowLength / 2);
  const numFrames = Math.ceil(wavSize / stepsize);
  const numCoeffs = coefficientRange[1] - coefficientRange[0] + 1;
  const zeroPadding = Math.max(0, fftLength - windowLength);

  const spectrogram: RealMatrix | ComplexMatrix = returnMagSpec
    ? createRealMatrix(numCoeffs, numFrames)
    : createComplexMatrix(numCoeffs, numFrames);

  let frameStartIndex1Based = 1 - firstWindowOffset;
  for (let frameIndex = 0; frameIndex < numFrames; frameIndex += 1) {
    const frame = new Float64Array(windowLength + zeroPadding);
    for (let sampleIndex = 0; sampleIndex < windowLength; sampleIndex += 1) {
      const sourceIndex1Based = frameStartIndex1Based + sampleIndex;
      const sourceValue =
        sourceIndex1Based >= 1 && sourceIndex1Based <= wavSize
          ? (audio[sourceIndex1Based - 1] ?? 0)
          : 0;
      frame[sampleIndex] = sourceValue * stftWindow[sampleIndex]!;
    }

    const spectrum = fft(frame);
    for (let coeffIndex = 0; coeffIndex < numCoeffs; coeffIndex += 1) {
      const fftIndex = coefficientRange[0] - 1 + coeffIndex;
      if (returnMagSpec) {
        (spectrogram as RealMatrix)[coeffIndex]![frameIndex] = Math.hypot(
          spectrum.real[fftIndex] ?? 0,
          spectrum.imag[fftIndex] ?? 0,
        );
      } else {
        (spectrogram as ComplexMatrix).real[coeffIndex]![frameIndex] = spectrum.real[fftIndex] ?? 0;
        (spectrogram as ComplexMatrix).imag[coeffIndex]![frameIndex] = spectrum.imag[fftIndex] ?? 0;
      }
    }

    frameStartIndex1Based += stepsize;
  }

  const halfCount = Math.floor(Math.max(fftLength, windowLength) / 2);
  const fullFrequencies = new Float64Array(halfCount + 1);
  const frequencyDenominator = Math.max(1, halfCount);
  for (let index = 0; index <= halfCount; index += 1) {
    fullFrequencies[index] = (index / frequencyDenominator) * (fs / 2);
  }

  const frequencies = fullFrequencies.slice(coefficientRange[0] - 1, coefficientRange[1]);
  const times = new Float64Array(numFrames);
  for (let frameIndex = 0; frameIndex < numFrames; frameIndex += 1) {
    times[frameIndex] = (frameIndex * stepsize) / fs;
  }

  return {
    spectrogram,
    featureRate,
    frequencies,
    times,
  };
}
