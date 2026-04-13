import type { ComplexMatrix, PLPResult } from "../types.js";
import { hann } from "../dsp/windows.js";
import { nearestIndex } from "../utils/math.js";
import { magnitudeMatrix } from "../utils/matrix.js";

export interface PLPOptions {
  featureRate?: number;
  tempoWindow?: number;
  stepsize?: number;
  useTempocurve?: boolean;
  tempocurve?: ArrayLike<number>;
  PLPrange?: [number, number];
}

export function computePLP(
  tempogram: ComplexMatrix,
  times: ArrayLike<number>,
  bpm: ArrayLike<number>,
  options: PLPOptions = {},
): PLPResult {
  const featureRate = options.featureRate ?? 100;
  const tempoWindow = options.tempoWindow ?? 6;
  const stepsize = options.stepsize ?? Math.ceil(featureRate / 5);
  const useTempocurve = options.useTempocurve ?? false;
  const tempocurve = options.tempocurve;
  const plpRange = options.PLPrange ?? [bpm[0] ?? 0, bpm[bpm.length - 1] ?? 0];

  const tempogramAbs = magnitudeMatrix(tempogram);
  const rangeStart = nearestIndex(bpm, plpRange[0]);
  const rangeEnd = nearestIndex(bpm, plpRange[1]);
  const searchStart = Math.min(rangeStart, rangeEnd);
  const searchEnd = Math.max(rangeStart, rangeEnd);

  const localMax = new Int32Array(times.length);
  const dominantTempoCurve = new Float64Array(times.length);
  if (!useTempocurve) {
    for (let frame = 0; frame < times.length; frame += 1) {
      let bestIndex = searchStart;
      let bestValue = Number.NEGATIVE_INFINITY;
      for (let row = searchStart; row <= searchEnd; row += 1) {
        const value = tempogramAbs[row]?.[frame] ?? Number.NEGATIVE_INFINITY;
        if (value > bestValue) {
          bestValue = value;
          bestIndex = row;
        }
      }
      localMax[frame] = bestIndex;
      dominantTempoCurve[frame] = bpm[bestIndex] ?? 0;
    }
  } else {
    for (let frame = 0; frame < times.length; frame += 1) {
      const index = nearestIndex(bpm, tempocurve?.[frame] ?? 0);
      localMax[frame] = index;
      dominantTempoCurve[frame] = bpm[index] ?? 0;
    }
  }

  let winLen = Math.round(tempoWindow * featureRate);
  winLen = Math.max(3, winLen + (winLen % 2) - 1);
  const sampleTimes = Float64Array.from(times, (value) => value * featureRate);
  const plpCurve = new Float64Array(times.length * stepsize);

  const window = hann(winLen);
  let windowSum = 0;
  for (let index = 0; index < window.length; index += 1) {
    windowSum += window[index]!;
  }
  for (let index = 0; index < window.length; index += 1) {
    window[index] = window[index]! / (windowSum / winLen);
    window[index] = window[index]! / (winLen / stepsize);
  }

  for (let frame = 0; frame < times.length; frame += 1) {
    let t0 = Math.ceil(sampleTimes[frame]! - winLen / 2);
    let t1 = Math.floor(sampleTimes[frame]! + winLen / 2);
    const tempoIndex = localMax[frame]!;
    const phase = Math.atan2(tempogram.imag[tempoIndex]![frame]!, tempogram.real[tempoIndex]![frame]!);
    const periodLength = (featureRate * 60) / (bpm[tempoIndex] ?? 1);
    let cosine = new Float64Array(winLen);
    for (let index = 0; index < winLen; index += 1) {
      cosine[index] = window[index]! * Math.cos(((index / periodLength) * 2 * Math.PI) + phase);
    }

    if (t0 < 1) {
      cosine = cosine.slice(-t0 + 1);
      t0 = 1;
    }

    if (t1 > plpCurve.length) {
      cosine = cosine.slice(0, cosine.length + plpCurve.length - t1);
      t1 = plpCurve.length;
    }

    const targetStart = t0 - 1;
    for (let index = 0; index < cosine.length; index += 1) {
      const targetIndex = targetStart + index;
      plpCurve[targetIndex] = plpCurve[targetIndex]! + cosine[index]!;
    }
  }

  for (let index = 0; index < plpCurve.length; index += 1) {
    if (plpCurve[index]! < 0) {
      plpCurve[index] = 0;
    }
  }

  return {
    plpCurve,
    featureRate,
    dominantTempoCurve,
  };
}
