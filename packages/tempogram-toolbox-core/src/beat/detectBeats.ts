import type { BeatDetectionProgress, BeatDetectionResult, DetectedBeat } from "../types.js";
import { computeNoveltyCurve, type NoveltyOptions } from "../novelty/computeNoveltyCurve.js";
import {
  computeTempogramFourierAsync,
  type TempogramFourierOptions,
} from "../tempogram/computeTempogramFourier.js";
import { computePLP, type PLPOptions } from "../plp/computePLP.js";
import { assert, clamp, maxArray, meanArray, median, range, standardDeviation } from "../utils/math.js";

export interface BeatDetectionOptions {
  novelty?: NoveltyOptions;
  tempogram?: Omit<TempogramFourierOptions, "featureRate" | "BPM" | "onProgress">;
  plp?: Omit<PLPOptions, "featureRate">;
  bpmMin?: number;
  bpmMax?: number;
  bpmStep?: number;
  peakThresholdRatio?: number;
  onProgress?: (progress: BeatDetectionProgress) => void;
}

type PeakCandidate = DetectedBeat & {
  sampleIndex: number;
  pulseStrength: number;
  noveltyStrength: number;
  strength: number;
  localTempoBpm: number;
  localPeriodSec: number;
};

interface BeatTrackHypothesis {
  hypothesisBpm: number;
  beats: DetectedBeat[];
  objective: number;
  tempoPrior: number;
  meanStrength: number;
  meanContinuity: number;
  coverage: number;
}

export async function detectBeatsFromPcm(
  monoSamples: ArrayLike<number>,
  sampleRate: number,
  options: BeatDetectionOptions = {},
): Promise<BeatDetectionResult> {
  assert(sampleRate > 0, "sampleRate must be positive");
  assert(monoSamples.length > 0, "audio signal must be non-empty");

  console.info("[BVB Beat Detect] Starting PCM beat analysis.", {
    sampleRate,
    sampleCount: monoSamples.length,
  });

  const reportProgress = (stage: BeatDetectionProgress["stage"], progress: number): void => {
    options.onProgress?.({
      stage,
      progress: clamp(progress, 0, 1),
    });
  };

  reportProgress("novelty", 0);
  const novelty = computeNoveltyCurve(monoSamples, sampleRate, {
    resampleFeatureRate: 100,
    ...options.novelty,
  });
  reportProgress("novelty", 1);
  console.info("[BVB Beat Detect] Novelty curve computed.", {
    featureRate: novelty.featureRate,
    noveltyLength: novelty.noveltyCurve.length,
  });

  const bpmMin = options.bpmMin ?? 40;
  const bpmMax = options.bpmMax ?? 240;
  const bpmStep = options.bpmStep ?? 2;
  const bpmAxis = range(bpmMin, bpmMax, bpmStep);

  const tempogramOptions: TempogramFourierOptions = {
    featureRate: novelty.featureRate,
    tempoWindow: options.tempogram?.tempoWindow ?? 6,
    BPM: bpmAxis,
    stepsize: options.tempogram?.stepsize ?? Math.ceil(novelty.featureRate / 5),
    asyncChunkSize: options.tempogram?.asyncChunkSize ?? 4,
    onProgress: (progress) => reportProgress("tempogram", progress),
  };
  const fourier = await computeTempogramFourierAsync(novelty.noveltyCurve, tempogramOptions);
  reportProgress("tempogram", 1);
  console.info("[BVB Beat Detect] Fourier tempogram computed.", {
    bpmBinCount: fourier.bpm.length,
    frameCount: fourier.times.length,
    tempoWindowSec: tempogramOptions.tempoWindow,
    stepSizeFrames: tempogramOptions.stepsize,
  });

  reportProgress("plp", 0);
  const plp = computePLP(fourier.tempogram, fourier.times, fourier.bpm, {
    featureRate: novelty.featureRate,
    tempoWindow: options.plp?.tempoWindow ?? tempogramOptions.tempoWindow,
    stepsize: options.plp?.stepsize ?? tempogramOptions.stepsize,
    useTempocurve: options.plp?.useTempocurve,
    tempocurve: options.plp?.tempocurve,
    PLPrange: options.plp?.PLPrange,
  });
  reportProgress("plp", 1);
  console.info("[BVB Beat Detect] PLP curve computed.", {
    featureRate: plp.featureRate,
    plpLength: plp.plpCurve.length,
    dominantTempoSamples: plp.dominantTempoCurve.length,
  });

  reportProgress("peaks", 0);
  const maxPlpValue = Math.max(0, maxArray(plp.plpCurve));
  const meanPlpValue = meanArray(plp.plpCurve);
  const stdPlpValue = standardDeviation(plp.plpCurve);
  const maxNoveltyValue = Math.max(0, maxArray(novelty.noveltyCurve));
  const peakThresholdRatio = options.peakThresholdRatio ?? 0.22;
  const smoothedTempoCurve = smoothTempoCurve(plp.dominantTempoCurve, 4);
  const dominantTempoValues = Array.from(smoothedTempoCurve).filter((value) => Number.isFinite(value) && value > 0);
  const medianTempo = dominantTempoValues.length > 0 ? median(dominantTempoValues) : null;
  const fallbackTempoBpm = medianTempo && medianTempo > 0 ? medianTempo : 120;
  const fallbackPeriodSec = 60 / fallbackTempoBpm;

  let candidates = extractPeakCandidates(
    plp.plpCurve,
    novelty.noveltyCurve,
    plp.featureRate,
    maxPlpValue,
    maxNoveltyValue,
    Math.max(maxPlpValue * peakThresholdRatio, meanPlpValue + stdPlpValue * 0.35),
    tempogramOptions.stepsize ?? 1,
    smoothedTempoCurve,
    fallbackPeriodSec,
  );
  if (candidates.length < 2 && maxPlpValue > 0) {
    candidates = extractPeakCandidates(
      plp.plpCurve,
      novelty.noveltyCurve,
      plp.featureRate,
      maxPlpValue,
      maxNoveltyValue,
      Math.max(maxPlpValue * 0.12, meanPlpValue),
      tempogramOptions.stepsize ?? 1,
      smoothedTempoCurve,
      fallbackPeriodSec,
    );
  }

  const hypotheses = buildTempoHypotheses(fallbackTempoBpm, bpmMin, bpmMax);
  const tracks = hypotheses.map((hypothesisBpm) =>
    trackBeatCandidates(candidates, hypothesisBpm, fallbackTempoBpm, monoSamples.length / sampleRate),
  );
  const bestTrack = chooseBestTrack(tracks);
  const beats = bestTrack?.beats ?? [];
  const estimatedTempoBpm = estimateTempoFromBeats(beats, medianTempo);
  reportProgress("peaks", 1);
  console.info("[BVB Beat Detect] Peak picking complete.", {
    candidateCount: candidates.length,
    beatCount: beats.length,
    hypotheses: tracks.map((track) => ({
      hypothesisBpm: track.hypothesisBpm,
      beatCount: track.beats.length,
      objective: Number(track.objective.toFixed(4)),
      tempoPrior: Number(track.tempoPrior.toFixed(4)),
      meanStrength: Number(track.meanStrength.toFixed(4)),
      meanContinuity: Number(track.meanContinuity.toFixed(4)),
      coverage: Number(track.coverage.toFixed(4)),
    })),
    selectedHypothesisBpm: bestTrack?.hypothesisBpm ?? null,
    estimatedTempoBpm,
  });

  return {
    beats,
    noveltyCurve: novelty.noveltyCurve,
    noveltyFeatureRate: novelty.featureRate,
    plpCurve: plp.plpCurve,
    plpFeatureRate: plp.featureRate,
    dominantTempoCurve: plp.dominantTempoCurve,
    estimatedTempoBpm,
  };
}

function extractPeakCandidates(
  plpCurve: ArrayLike<number>,
  noveltyCurve: ArrayLike<number>,
  featureRate: number,
  maxPlpValue: number,
  maxNoveltyValue: number,
  threshold: number,
  tempoStepSize: number,
  dominantTempoCurve: ArrayLike<number>,
  fallbackPeriodSec: number,
): PeakCandidate[] {
  const candidates: PeakCandidate[] = [];
  for (let index = 1; index < plpCurve.length - 1; index += 1) {
    const left = plpCurve[index - 1] ?? 0;
    const current = plpCurve[index] ?? 0;
    const right = plpCurve[index + 1] ?? 0;
    if (current < threshold) {
      continue;
    }
    if (current >= left && current > right) {
      const pulseStrength = maxPlpValue > 0 ? clamp(current / maxPlpValue, 0, 1) : 0;
      const noveltyStrength = maxNoveltyValue > 0
        ? clamp((noveltyCurve[index] ?? 0) / maxNoveltyValue, 0, 1)
        : 0;
      const frameIndex = Math.max(
        0,
        Math.min(
          dominantTempoCurve.length - 1,
          Math.round(index / Math.max(1, tempoStepSize)),
        ),
      );
      const localTempoBpm = dominantTempoCurve[frameIndex] && dominantTempoCurve[frameIndex]! > 0
        ? dominantTempoCurve[frameIndex]!
        : 60 / fallbackPeriodSec;
      candidates.push({
        sampleIndex: index,
        timeSec: index / featureRate,
        confidence: pulseStrength,
        pulseStrength,
        noveltyStrength,
        strength: pulseStrength * 0.8 + noveltyStrength * 0.2,
        localTempoBpm,
        localPeriodSec: localTempoBpm > 0 ? 60 / localTempoBpm : fallbackPeriodSec,
      });
    }
  }
  return candidates;
}

function smoothTempoCurve(values: ArrayLike<number>, radius: number): Float64Array {
  const smoothed = new Float64Array(values.length);
  for (let index = 0; index < values.length; index += 1) {
    const window: number[] = [];
    const start = Math.max(0, index - radius);
    const end = Math.min(values.length - 1, index + radius);
    for (let cursor = start; cursor <= end; cursor += 1) {
      const value = values[cursor] ?? 0;
      if (Number.isFinite(value) && value > 0) {
        window.push(value);
      }
    }
    smoothed[index] = window.length > 0 ? median(window) : 0;
  }
  return smoothed;
}

function buildTempoHypotheses(medianTempoBpm: number, bpmMin: number, bpmMax: number): number[] {
  const centerTempo = clamp(medianTempoBpm, bpmMin, bpmMax);
  const hypotheses = [
    centerTempo * 0.5,
    centerTempo,
    centerTempo * 2,
  ]
    .filter((value) => Number.isFinite(value) && value >= bpmMin && value <= bpmMax)
    .map((value) => Number(value.toFixed(6)));

  if (hypotheses.length === 0) {
    return [clamp(120, bpmMin, bpmMax)];
  }

  return Array.from(new Set(hypotheses)).sort((left, right) => left - right);
}

function trackBeatCandidates(
  candidates: PeakCandidate[],
  hypothesisBpm: number,
  referenceTempoBpm: number,
  durationSec: number,
): BeatTrackHypothesis {
  if (candidates.length === 0 || hypothesisBpm <= 0 || referenceTempoBpm <= 0) {
    return {
      hypothesisBpm,
      beats: [],
      objective: Number.NEGATIVE_INFINITY,
      tempoPrior: 0,
      meanStrength: 0,
      meanContinuity: 0,
      coverage: 0,
    };
  }

  const tempoScale = referenceTempoBpm / hypothesisBpm;
  const candidateCount = candidates.length;
  const scores = new Float64Array(candidateCount);
  const strengthSums = new Float64Array(candidateCount);
  const previous = new Int32Array(candidateCount).fill(-1);
  const pathLength = new Int32Array(candidateCount).fill(1);
  const pathStart = new Int32Array(candidateCount);
  const continuitySums = new Float64Array(candidateCount);

  for (let index = 0; index < candidateCount; index += 1) {
    pathStart[index] = index;
    scores[index] = candidates[index]!.strength;
    strengthSums[index] = candidates[index]!.strength;
  }

  for (let currentIndex = 0; currentIndex < candidateCount; currentIndex += 1) {
    const currentCandidate = candidates[currentIndex]!;
    for (let previousIndex = currentIndex - 1; previousIndex >= 0; previousIndex -= 1) {
      const previousCandidate = candidates[previousIndex]!;
      const intervalSec = currentCandidate.timeSec - previousCandidate.timeSec;
      if (intervalSec <= 0) {
        continue;
      }

      const targetPeriodSec = Math.max(
        0.2,
        ((currentCandidate.localPeriodSec + previousCandidate.localPeriodSec) * 0.5) * tempoScale,
      );
      const intervalRatio = intervalSec / targetPeriodSec;
      if (intervalRatio < 0.5 || intervalRatio > 2.5) {
        continue;
      }

      const continuity = Math.exp(-0.5 * Math.pow(Math.log2(intervalRatio) / 0.175, 2));
      const transitionScore = continuity * 1.5;
      const candidateScore = currentCandidate.strength;
      const score = scores[previousIndex]! + candidateScore + transitionScore;
      if (score > scores[currentIndex]!) {
        scores[currentIndex] = score;
        strengthSums[currentIndex] = strengthSums[previousIndex]! + currentCandidate.strength;
        previous[currentIndex] = previousIndex;
        pathLength[currentIndex] = pathLength[previousIndex]! + 1;
        pathStart[currentIndex] = pathStart[previousIndex]!;
        continuitySums[currentIndex] = continuitySums[previousIndex]! + continuity;
      }
    }
  }

  let bestEndIndex = -1;
  let bestObjective = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < candidateCount; index += 1) {
    const count = pathLength[index]!;
    if (count < 8) {
      continue;
    }
    const startIndex = pathStart[index]!;
    const spanSec = candidates[index]!.timeSec - candidates[startIndex]!.timeSec;
    const coverage = durationSec > 0 ? clamp(spanSec / durationSec, 0, 1) : 0;
    const meanStrength = strengthSums[index]! / count;
    const meanContinuity = continuitySums[index]! / Math.max(1, count - 1);
    const objective = meanStrength + meanContinuity * 0.9 + coverage * 0.6;
    if (objective > bestObjective) {
      bestObjective = objective;
      bestEndIndex = index;
    }
  }

  if (bestEndIndex < 0) {
    return {
      hypothesisBpm,
      beats: [],
      objective: Number.NEGATIVE_INFINITY,
      tempoPrior: 0,
      meanStrength: 0,
      meanContinuity: 0,
      coverage: 0,
    };
  }

  const selectedCandidates: PeakCandidate[] = [];
  let cursor = bestEndIndex;
  while (cursor >= 0) {
    selectedCandidates.push(candidates[cursor]!);
    cursor = previous[cursor] ?? -1;
  }
  selectedCandidates.reverse();

  const firstTimeSec = selectedCandidates[0]?.timeSec ?? 0;
  const lastTimeSec = selectedCandidates[selectedCandidates.length - 1]?.timeSec ?? firstTimeSec;
  const coverage = durationSec > 0 ? clamp((lastTimeSec - firstTimeSec) / durationSec, 0, 1) : 0;
  const meanStrength = selectedCandidates.reduce((sum, candidate) => sum + candidate.strength, 0) / selectedCandidates.length;

  let continuitySum = 0;
  for (let index = 1; index < selectedCandidates.length; index += 1) {
    const previousCandidate = selectedCandidates[index - 1]!;
    const currentCandidate = selectedCandidates[index]!;
    const targetPeriodSec = Math.max(
      0.2,
      ((currentCandidate.localPeriodSec + previousCandidate.localPeriodSec) * 0.5) * tempoScale,
    );
    const intervalRatio = (currentCandidate.timeSec - previousCandidate.timeSec) / targetPeriodSec;
    continuitySum += Math.exp(-0.5 * Math.pow(Math.log2(intervalRatio) / 0.175, 2));
  }
  const meanContinuity = continuitySum / Math.max(1, selectedCandidates.length - 1);
  const tempoPrior = computeTempoPrior(hypothesisBpm);

  return {
    hypothesisBpm,
    beats: selectedCandidates.map(({ timeSec, strength }) => ({
      timeSec,
      confidence: clamp(strength, 0, 1),
    })),
    objective: bestObjective + tempoPrior,
    tempoPrior,
    meanStrength,
    meanContinuity,
    coverage,
  };
}

function chooseBestTrack(tracks: BeatTrackHypothesis[]): BeatTrackHypothesis | null {
  let bestTrack: BeatTrackHypothesis | null = null;
  for (const track of tracks) {
    if (!bestTrack || track.objective > bestTrack.objective) {
      bestTrack = track;
    }
  }
  return bestTrack;
}

function computeTempoPrior(hypothesisBpm: number): number {
  if (!Number.isFinite(hypothesisBpm) || hypothesisBpm <= 0) {
    return 0;
  }

  const centerLogBpm = Math.log2(110);
  const sigmaOctaves = 0.55;
  const delta = (Math.log2(hypothesisBpm) - centerLogBpm) / sigmaOctaves;
  return Math.exp(-0.5 * delta * delta) * 0.22;
}

function estimateTempoFromBeats(beats: DetectedBeat[], fallbackTempo: number | null): number | null {
  if (beats.length < 2) {
    return fallbackTempo;
  }

  const intervals: number[] = [];
  for (let index = 1; index < beats.length; index += 1) {
    const interval = beats[index]!.timeSec - beats[index - 1]!.timeSec;
    if (interval > 0.05) {
      intervals.push(interval);
    }
  }
  if (intervals.length === 0) {
    return fallbackTempo;
  }

  const medianInterval = median(intervals);
  if (medianInterval <= 0) {
    return fallbackTempo;
  }
  return 60 / medianInterval;
}
