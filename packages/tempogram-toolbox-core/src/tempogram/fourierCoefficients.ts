import type { ComplexMatrix } from "../types.js";
import { TAU, assert, yieldToMainThread } from "../utils/math.js";
import { createComplexMatrix } from "../utils/matrix.js";

export interface FourierCoefficientsResult {
  coefficients: ComplexMatrix;
  frequencies: Float64Array;
  times: Float64Array;
}

export interface FourierCoefficientsAsyncOptions {
  chunkSize?: number;
  onProgress?: (progress: number) => void;
}

export function computeFourierCoefficients(
  signal: ArrayLike<number>,
  window: ArrayLike<number>,
  noverlap: number,
  frequenciesHz: ArrayLike<number>,
  sampleRate: number,
): FourierCoefficientsResult {
  assert(sampleRate > 0, "sampleRate must be positive");
  const winLen = window.length;
  const hopsize = winLen - noverlap;
  assert(hopsize > 0, "noverlap must be smaller than the window length");

  const winNum = Math.floor((signal.length - noverlap) / hopsize);
  const coefficients = createComplexMatrix(frequenciesHz.length, winNum);
  const times = new Float64Array(winNum);
  const phaseTimes = new Float64Array(winLen);
  for (let sampleIndex = 0; sampleIndex < winLen; sampleIndex += 1) {
    phaseTimes[sampleIndex] = (sampleIndex / sampleRate) * TAU;
  }
  for (let frameIndex = 0; frameIndex < winNum; frameIndex += 1) {
    times[frameIndex] = (frameIndex * hopsize + winLen * 0.5) / sampleRate;
  }

  for (let frequencyIndex = 0; frequencyIndex < frequenciesHz.length; frequencyIndex += 1) {
    const frequency = frequenciesHz[frequencyIndex] ?? 0;
    const cosine = new Float64Array(winLen);
    const sine = new Float64Array(winLen);
    for (let sampleIndex = 0; sampleIndex < winLen; sampleIndex += 1) {
      const phase = frequency * phaseTimes[sampleIndex]!;
      cosine[sampleIndex] = Math.cos(phase);
      sine[sampleIndex] = Math.sin(phase);
    }

    for (let frameIndex = 0; frameIndex < winNum; frameIndex += 1) {
      const start = frameIndex * hopsize;
      let realValue = 0;
      let imagValue = 0;
      for (let sampleIndex = 0; sampleIndex < winLen; sampleIndex += 1) {
        const value = (signal[start + sampleIndex] ?? 0) * (window[sampleIndex] ?? 0);
        realValue += value * cosine[sampleIndex]!;
        imagValue -= value * sine[sampleIndex]!;
      }
      coefficients.real[frequencyIndex]![frameIndex] = realValue;
      coefficients.imag[frequencyIndex]![frameIndex] = imagValue;
    }
  }

  return {
    coefficients,
    frequencies: Float64Array.from(frequenciesHz),
    times,
  };
}

export async function computeFourierCoefficientsAsync(
  signal: ArrayLike<number>,
  window: ArrayLike<number>,
  noverlap: number,
  frequenciesHz: ArrayLike<number>,
  sampleRate: number,
  options: FourierCoefficientsAsyncOptions = {},
): Promise<FourierCoefficientsResult> {
  assert(sampleRate > 0, "sampleRate must be positive");
  const winLen = window.length;
  const hopsize = winLen - noverlap;
  assert(hopsize > 0, "noverlap must be smaller than the window length");

  const winNum = Math.floor((signal.length - noverlap) / hopsize);
  const coefficients = createComplexMatrix(frequenciesHz.length, winNum);
  const times = new Float64Array(winNum);
  const phaseTimes = new Float64Array(winLen);
  const chunkSize = Math.max(1, Math.round(options.chunkSize ?? 4));

  for (let sampleIndex = 0; sampleIndex < winLen; sampleIndex += 1) {
    phaseTimes[sampleIndex] = (sampleIndex / sampleRate) * TAU;
  }
  for (let frameIndex = 0; frameIndex < winNum; frameIndex += 1) {
    times[frameIndex] = (frameIndex * hopsize + winLen * 0.5) / sampleRate;
  }

  for (let frequencyIndex = 0; frequencyIndex < frequenciesHz.length; frequencyIndex += 1) {
    const frequency = frequenciesHz[frequencyIndex] ?? 0;
    const cosine = new Float64Array(winLen);
    const sine = new Float64Array(winLen);
    for (let sampleIndex = 0; sampleIndex < winLen; sampleIndex += 1) {
      const phase = frequency * phaseTimes[sampleIndex]!;
      cosine[sampleIndex] = Math.cos(phase);
      sine[sampleIndex] = Math.sin(phase);
    }

    for (let frameIndex = 0; frameIndex < winNum; frameIndex += 1) {
      const start = frameIndex * hopsize;
      let realValue = 0;
      let imagValue = 0;
      for (let sampleIndex = 0; sampleIndex < winLen; sampleIndex += 1) {
        const value = (signal[start + sampleIndex] ?? 0) * (window[sampleIndex] ?? 0);
        realValue += value * cosine[sampleIndex]!;
        imagValue -= value * sine[sampleIndex]!;
      }
      coefficients.real[frequencyIndex]![frameIndex] = realValue;
      coefficients.imag[frequencyIndex]![frameIndex] = imagValue;
    }

    options.onProgress?.((frequencyIndex + 1) / Math.max(1, frequenciesHz.length));
    if ((frequencyIndex + 1) % chunkSize === 0 && frequencyIndex + 1 < frequenciesHz.length) {
      await yieldToMainThread();
    }
  }

  return {
    coefficients,
    frequencies: Float64Array.from(frequenciesHz),
    times,
  };
}
