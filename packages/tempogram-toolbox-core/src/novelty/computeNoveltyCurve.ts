import type { NoveltyResult, RealMatrix } from "../types.js";
import { correlateSame1D, replicatePad1D } from "../dsp/filtering.js";
import { resampleSignal } from "../dsp/resample.js";
import { computeSpectrogramViaSTFT } from "../dsp/stft.js";
import { hann } from "../dsp/windows.js";
import { assert, matlabRound, sumArray } from "../utils/math.js";
import { maxValueInRealMatrix, meanRowsByColumn, sumRowsByColumn } from "../utils/matrix.js";

export interface NoveltyOptions {
  logCompression?: boolean;
  compressionC?: number;
  win_len?: number;
  winLen?: number;
  stepsize?: number;
  resampleFeatureRate?: number;
}

export function computeNoveltyCurve(
  audio: ArrayLike<number>,
  sampleRate: number,
  options: NoveltyOptions = {},
): NoveltyResult {
  assert(sampleRate > 0, "sampleRate must be positive");
  assert(audio.length > 0, "audio signal must be non-empty");

  const winLen = matlabRound(options.win_len ?? options.winLen ?? (1024 * sampleRate) / 22050);
  const stepsize = matlabRound(options.stepsize ?? (512 * sampleRate) / 22050);
  const compressionC = options.compressionC ?? 1000;
  const logCompression = options.logCompression ?? true;
  const requestedResampleFeatureRate = options.resampleFeatureRate ?? 200;

  const stftWindow = hann(winLen);
  const spectrogramResult = computeSpectrogramViaSTFT(audio, {
    StftWindow: stftWindow,
    stepsize,
    returnMagSpec: true,
    fs: sampleRate,
  });

  const specData = spectrogramResult.spectrogram as RealMatrix;
  const featureRateBeforeResample = spectrogramResult.featureRate;

  const maxSpecValue = maxValueInRealMatrix(specData);
  const thresholdLinear = Math.pow(10, -74 / 20);
  for (const row of specData) {
    for (let col = 0; col < row.length; col += 1) {
      const normalized = maxSpecValue > 0 ? row[col]! / maxSpecValue : 0;
      row[col] = Math.max(normalized, thresholdLinear);
    }
  }

  const bands = [
    [0, 500],
    [500, 1250],
    [1250, 3125],
    [3125, 7812.5],
    [7812.5, Math.floor(sampleRate / 2)],
  ] as const;

  const bandNoveltyCurves: RealMatrix = [];
  for (const band of bands) {
    const binBounds1Based = band.map((frequency) =>
      Math.min(
        matlabRound(winLen / 2) + 1,
        Math.max(1, matlabRound(frequency / (sampleRate / winLen))),
      ),
    ) as [number, number];
    const startRow = binBounds1Based[0] - 1;
    const endRowExclusive = binBounds1Based[1];
    const bandData: RealMatrix = [];
    for (let row = startRow; row < endRowExclusive; row += 1) {
      const sourceRow = specData[row];
      if (!sourceRow) {
        continue;
      }
      const targetRow = Float64Array.from(sourceRow);
      if (logCompression && compressionC > 0) {
        const divisor = Math.log(1 + compressionC);
        for (let col = 0; col < targetRow.length; col += 1) {
          targetRow[col] = Math.log(1 + targetRow[col]! * compressionC) / divisor;
        }
      }
      bandData.push(targetRow);
    }

    const diffLenSeconds = 0.3;
    let diffLength = Math.max(Math.ceil((diffLenSeconds * sampleRate) / stepsize), 5);
    diffLength = 2 * matlabRound(diffLength / 2) + 1;
    const diffWindow = hann(diffLength);
    const diffFilter = new Float64Array(diffLength);
    const diffCenter = Math.floor(diffLength / 2);
    for (let index = 0; index < diffLength; index += 1) {
      const sign = index < diffCenter ? -1 : index > diffCenter ? 1 : 0;
      diffFilter[index] = diffWindow[index]! * sign;
    }

    const bandDiff: RealMatrix = [];
    const diffPad = Math.floor(diffLength / 2);
    for (const row of bandData) {
      const padded = replicatePad1D(row, diffPad);
      const filtered = correlateSame1D(padded, diffFilter);
      const cropped = filtered.slice(Math.max(0, diffPad - 1), Math.max(0, diffPad - 1) + row.length);
      for (let col = 0; col < cropped.length; col += 1) {
        if (cropped[col]! < 0) {
          cropped[col] = 0;
        }
      }
      bandDiff.push(cropped);
    }

    const normLenSeconds = 5;
    const normLength = Math.max(Math.ceil((normLenSeconds * sampleRate) / stepsize), 3);
    const normFilter = hann(normLength);
    const normFilterSum = sumArray(normFilter);
    const normalizedFilter = Float64Array.from(normFilter, (value) => value / normFilterSum);
    const bandSum = sumRowsByColumn(bandData);
    const normCurve = correlateSame1D(bandSum, normalizedFilter);

    const cumulativeTail = new Float64Array(normLength);
    let runningSum = 0;
    for (let index = 0; index < normLength; index += 1) {
      runningSum += normFilter[index]!;
      cumulativeTail[index] = (normFilterSum - runningSum) / normFilterSum;
    }

    const halfNorm = Math.floor(normLength / 2);
    for (let index = 0; index < halfNorm && index < normCurve.length; index += 1) {
      const leftDivisor = cumulativeTail[halfNorm - 1 - index]!;
      if (leftDivisor !== 0) {
        normCurve[index] = normCurve[index]! / leftDivisor;
      }
      const rightIndex = normCurve.length - halfNorm + index;
      if (rightIndex >= 0 && rightIndex < normCurve.length) {
        const rightDivisor = cumulativeTail[index]!;
        if (rightDivisor !== 0) {
          normCurve[rightIndex] = normCurve[rightIndex]! / rightDivisor;
        }
      }
    }

    for (const row of bandDiff) {
      for (let col = 0; col < row.length; col += 1) {
        const divisor = normCurve[col]!;
        row[col] = divisor !== 0 ? row[col]! / divisor : 0;
      }
    }

    bandNoveltyCurves.push(sumRowsByColumn(bandDiff));
  }

  let noveltyCurve = meanRowsByColumn(bandNoveltyCurves);
  let featureRate = featureRateBeforeResample;
  if (
    requestedResampleFeatureRate > 0
    && Math.abs(requestedResampleFeatureRate - featureRateBeforeResample) > 1e-12
  ) {
    const p = Math.round((1000 * requestedResampleFeatureRate) / featureRateBeforeResample);
    featureRate = (featureRateBeforeResample * p) / 1000;
    noveltyCurve = resampleSignal(noveltyCurve, featureRateBeforeResample, featureRate, {
      filterHalfLength: 24,
    });
  }

  noveltyCurve = noveltySmoothedSubtraction(noveltyCurve, sampleRate, stepsize);
  return {
    noveltyCurve,
    featureRate,
    bandNoveltyCurves,
  };
}

function noveltySmoothedSubtraction(
  noveltyCurve: Float64Array,
  sampleRate: number,
  stepsize: number,
): Float64Array {
  const smoothLenSeconds = 1.5;
  const smoothLength = Math.max(Math.ceil((smoothLenSeconds * sampleRate) / stepsize), 3);
  const smoothFilter = hann(smoothLength);
  const filterSum = sumArray(smoothFilter);
  const localAverage = correlateSame1D(
    noveltyCurve,
    Float64Array.from(smoothFilter, (value) => value / filterSum),
  );

  const noveltySubtracted = new Float64Array(noveltyCurve.length);
  for (let index = 0; index < noveltyCurve.length; index += 1) {
    const value = noveltyCurve[index]! - localAverage[index]!;
    noveltySubtracted[index] = value > 0 ? value : 0;
  }
  return noveltySubtracted;
}
