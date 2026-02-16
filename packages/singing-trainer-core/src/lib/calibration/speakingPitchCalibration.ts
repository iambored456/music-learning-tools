/**
 * Speaking Pitch Calibration Algorithm
 *
 * Estimates the user's "lowest stable cluster" speaking pitch from
 * collected pitch samples across multiple spoken phrases.
 *
 * The algorithm:
 * 1. Filters samples by clarity threshold
 * 2. Builds a histogram with semitone bins
 * 3. Identifies the lower region of the distribution (bottom 40%)
 * 4. Finds peaks (local maxima) in the histogram
 * 5. Selects the lowest peak that meets density requirements
 * 6. Expands the cluster to include adjacent bins
 * 7. Calculates the weighted centroid of the cluster
 * 8. Validates the result is within plausible bounds
 */

import type {
  PitchSample,
  PitchHistogramBin,
  ClusterAnalysisResult,
  CalibrationConfig,
  CalibrationError,
} from './types.js';
import { DEFAULT_CALIBRATION_CONFIG } from './types.js';

/**
 * Convert MIDI to frequency in Hz
 */
function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Analyze recordings to estimate speaking pitch
 */
export function analyzeRecordingsForSpeakingPitch(
  allSamples: PitchSample[],
  config: CalibrationConfig = DEFAULT_CALIBRATION_CONFIG
): ClusterAnalysisResult {
  // Step 1: Filter by clarity threshold
  const voicedSamples = allSamples.filter((s) => s.clarity >= config.clarityThreshold);

  if (voicedSamples.length < config.minVoicedSamples) {
    return {
      success: false,
      error: {
        code: 'TOO_FEW_VOICED_SAMPLES',
        message: `Only ${voicedSamples.length} voiced samples detected. Need at least ${config.minVoicedSamples}.`,
        details: { voicedCount: voicedSamples.length, required: config.minVoicedSamples },
      },
    };
  }

  // Step 2: Build histogram
  const histogram = buildPitchHistogram(voicedSamples, config.binSizeSemitones);

  // Step 3: Find the pitch range of the distribution
  const sortedMidis = voicedSamples.map((s) => s.midi).sort((a, b) => a - b);
  const percentile10 = sortedMidis[Math.floor(sortedMidis.length * 0.1)];
  const percentile90 = sortedMidis[Math.floor(sortedMidis.length * 0.9)];
  const distributionRange = percentile90 - percentile10;

  // Step 4: Define "lower region" (bottom portion of distribution)
  const lowerRegionCutoff = percentile10 + distributionRange * config.lowerRegionPercent;

  // Step 5: Find peaks (local maxima) in histogram
  const peaks = findHistogramPeaks(histogram, config.minPeakDensity);

  // Step 6: Filter to peaks in lower region
  const lowerPeaks = peaks.filter((p) => p.midiCenter <= lowerRegionCutoff);

  if (lowerPeaks.length === 0) {
    // Fallback: if no peaks in lower region, use the lowest peak overall
    if (peaks.length > 0) {
      const lowestOverall = peaks.reduce((lowest, current) =>
        current.midiCenter < lowest.midiCenter ? current : lowest
      );
      lowerPeaks.push(lowestOverall);
    } else {
      return {
        success: false,
        error: {
          code: 'NO_STABLE_CLUSTER',
          message: 'Could not find a stable pitch cluster in the recordings.',
          details: { totalPeaks: peaks.length, lowerRegionCutoff },
        },
      };
    }
  }

  // Step 7: Select the lowest peak that meets density threshold
  const lowestStablePeak = lowerPeaks.reduce((lowest, current) =>
    current.midiCenter < lowest.midiCenter ? current : lowest
  );

  // Step 8: Expand cluster around peak (adjacent bins above threshold)
  const cluster = expandCluster(histogram, lowestStablePeak, config.clusterExpansionThreshold);

  // Step 9: Calculate weighted average of cluster
  const estimatedMidi = calculateClusterCentroid(cluster);
  const roundedMidi = Math.round(estimatedMidi);
  const estimatedHz = midiToFrequency(estimatedMidi);

  // Step 10: Validate bounds
  if (roundedMidi < config.minSpeakingMidi || roundedMidi > config.maxSpeakingMidi) {
    return {
      success: false,
      error: {
        code: 'PITCH_OUT_OF_BOUNDS',
        message: `Detected pitch is outside typical speaking range.`,
        details: {
          estimatedMidi: roundedMidi,
          minBound: config.minSpeakingMidi,
          maxBound: config.maxSpeakingMidi,
        },
      },
    };
  }

  // Step 11: Calculate confidence score
  const confidenceScore = calculateConfidence(cluster, voicedSamples.length, distributionRange);

  return {
    success: true,
    estimatedMidi: roundedMidi,
    estimatedHz,
    confidenceScore,
    histogram,
    clusterBins: cluster,
  };
}

/**
 * Build a histogram of pitch samples with the specified bin size
 */
function buildPitchHistogram(samples: PitchSample[], binSize: number): PitchHistogramBin[] {
  const bins = new Map<number, number>();

  for (const sample of samples) {
    // Round to nearest bin center
    const binCenter = Math.round(sample.midi / binSize) * binSize;
    bins.set(binCenter, (bins.get(binCenter) || 0) + 1);
  }

  const totalSamples = samples.length;
  return Array.from(bins.entries())
    .map(([midiCenter, count]) => ({
      midiCenter,
      count,
      density: count / totalSamples,
    }))
    .sort((a, b) => a.midiCenter - b.midiCenter);
}

/**
 * Find peaks (local maxima) in the histogram that meet minimum density
 */
function findHistogramPeaks(histogram: PitchHistogramBin[], minDensity: number): PitchHistogramBin[] {
  return histogram.filter((bin, i, arr) => {
    if (bin.density < minDensity) return false;

    const prevDensity = i > 0 ? arr[i - 1].density : 0;
    const nextDensity = i < arr.length - 1 ? arr[i + 1].density : 0;

    // Local maximum: higher than or equal to neighbors
    return bin.density >= prevDensity && bin.density >= nextDensity;
  });
}

/**
 * Expand a cluster around a peak by including adjacent bins above threshold
 */
function expandCluster(
  histogram: PitchHistogramBin[],
  peak: PitchHistogramBin,
  threshold: number
): PitchHistogramBin[] {
  const cluster: PitchHistogramBin[] = [peak];
  const peakIndex = histogram.findIndex((b) => b.midiCenter === peak.midiCenter);

  if (peakIndex === -1) return cluster;

  // Expand downward
  for (let i = peakIndex - 1; i >= 0; i--) {
    if (histogram[i].density >= threshold) {
      cluster.unshift(histogram[i]);
    } else {
      break;
    }
  }

  // Expand upward
  for (let i = peakIndex + 1; i < histogram.length; i++) {
    if (histogram[i].density >= threshold) {
      cluster.push(histogram[i]);
    } else {
      break;
    }
  }

  return cluster;
}

/**
 * Calculate the weighted centroid of a cluster
 */
function calculateClusterCentroid(cluster: PitchHistogramBin[]): number {
  const totalWeight = cluster.reduce((sum, bin) => sum + bin.count, 0);
  if (totalWeight === 0) return cluster[0]?.midiCenter ?? 0;

  const weightedSum = cluster.reduce((sum, bin) => sum + bin.midiCenter * bin.count, 0);
  return weightedSum / totalWeight;
}

/**
 * Calculate a confidence score for the analysis result
 *
 * Factors:
 * 1. Cluster contains significant portion of samples
 * 2. Distribution is not too wide (speaker was consistent)
 * 3. Cluster is tight (not spread across many semitones)
 */
function calculateConfidence(
  cluster: PitchHistogramBin[],
  totalSamples: number,
  distributionRange: number
): number {
  // Factor 1: Cluster sample ratio
  const clusterSamples = cluster.reduce((sum, bin) => sum + bin.count, 0);
  const clusterRatio = Math.min(1, clusterSamples / totalSamples);

  // Factor 2: Distribution width (12 semitones = octave = low confidence)
  const rangeScore = Math.max(0, 1 - distributionRange / 12);

  // Factor 3: Cluster tightness (3 semitones span = low confidence)
  const clusterSpan =
    cluster.length > 1
      ? cluster[cluster.length - 1].midiCenter - cluster[0].midiCenter
      : 0;
  const clusterTightness = Math.max(0, 1 - clusterSpan / 3);

  // Weighted combination
  return clusterRatio * 0.4 + rangeScore * 0.3 + clusterTightness * 0.3;
}

/**
 * Utility: Convert MIDI to note name (e.g., 60 -> "C4")
 */
export function midiToNoteName(midi: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = Math.round(midi) % 12;
  return `${noteNames[noteIndex]}${octave}`;
}

/**
 * Apply manual adjustment to a MIDI value
 */
export function applyAdjustment(baseMidi: number, semitones: number): number {
  return baseMidi + semitones;
}
