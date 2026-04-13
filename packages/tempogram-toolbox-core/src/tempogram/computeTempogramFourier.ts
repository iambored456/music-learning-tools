import type { TempogramFourierResult } from "../types.js";
import { hann } from "../dsp/windows.js";
import { assert, range, sumArray } from "../utils/math.js";
import { multiplyComplexMatrixInPlace } from "../utils/matrix.js";
import { computeFourierCoefficients, computeFourierCoefficientsAsync } from "./fourierCoefficients.js";

export interface TempogramFourierOptions {
  featureRate?: number;
  tempoWindow?: number;
  BPM?: ArrayLike<number>;
  stepsize?: number;
  asyncChunkSize?: number;
  onProgress?: (progress: number) => void;
}

export function computeTempogramFourier(
  noveltyCurve: ArrayLike<number>,
  options: TempogramFourierOptions = {},
): TempogramFourierResult {
  const prepared = prepareTempogramInputs(noveltyCurve, options);
  const { coefficients, times } = computeFourierCoefficients(
    prepared.paddedNovelty,
    prepared.windowTempogram,
    prepared.winLen - prepared.stepsize,
    prepared.frequenciesHz,
    prepared.featureRate,
  );

  const scalar = prepared.winLen / (Math.sqrt(prepared.winLen) * sumArray(prepared.windowTempogram));
  multiplyComplexMatrixInPlace(coefficients, scalar);

  return {
    tempogram: coefficients,
    times: shiftTimesToZero(times),
    bpm: prepared.bpm,
  };
}

export async function computeTempogramFourierAsync(
  noveltyCurve: ArrayLike<number>,
  options: TempogramFourierOptions = {},
): Promise<TempogramFourierResult> {
  const prepared = prepareTempogramInputs(noveltyCurve, options);
  const { coefficients, times } = await computeFourierCoefficientsAsync(
    prepared.paddedNovelty,
    prepared.windowTempogram,
    prepared.winLen - prepared.stepsize,
    prepared.frequenciesHz,
    prepared.featureRate,
    {
      chunkSize: options.asyncChunkSize,
      onProgress: options.onProgress,
    },
  );

  const scalar = prepared.winLen / (Math.sqrt(prepared.winLen) * sumArray(prepared.windowTempogram));
  multiplyComplexMatrixInPlace(coefficients, scalar);

  return {
    tempogram: coefficients,
    times: shiftTimesToZero(times),
    bpm: prepared.bpm,
  };
}

function prepareTempogramInputs(noveltyCurve: ArrayLike<number>, options: TempogramFourierOptions) {
  const featureRate = options.featureRate ?? 1;
  const tempoWindow = options.tempoWindow ?? 6;
  const bpm = Float64Array.from(options.BPM ?? range(30, 600, 1));
  const stepsize = options.stepsize ?? Math.ceil(featureRate / 5);

  assert(featureRate > 0, "featureRate must be positive");
  assert(tempoWindow > 0, "tempoWindow must be positive");
  assert(stepsize > 0, "stepsize must be positive");
  assert(bpm.length > 0, "BPM axis must be non-empty");

  let winLen = Math.round(tempoWindow * featureRate);
  winLen = Math.max(3, winLen + (winLen % 2) - 1);
  const windowTempogram = hann(winLen);
  const zeroPad = Math.round(winLen / 2);
  const paddedNovelty = new Float64Array(noveltyCurve.length + zeroPad * 2);
  for (let index = 0; index < noveltyCurve.length; index += 1) {
    paddedNovelty[zeroPad + index] = noveltyCurve[index] ?? 0;
  }

  return {
    featureRate,
    bpm,
    stepsize,
    winLen,
    windowTempogram,
    paddedNovelty,
    frequenciesHz: Float64Array.from(bpm, (value) => value / 60),
  };
}

function shiftTimesToZero(times: Float64Array): Float64Array {
  const shiftedTimes = new Float64Array(times.length);
  const timeOffset = times.length > 0 ? times[0]! : 0;
  for (let index = 0; index < times.length; index += 1) {
    shiftedTimes[index] = times[index]! - timeOffset;
  }
  return shiftedTimes;
}
