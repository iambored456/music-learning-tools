/**
 * Filter Calculations
 *
 * Pure mathematical functions for filter amplitude calculations.
 * These functions compute the filter curve shape and apply filtering
 * to harmonic coefficients.
 */

import store from '@state/initStore.ts';
import { HARMONIC_BINS } from '@/core/constants.ts';

const BINS = HARMONIC_BINS;

/** Filter settings configuration */
export interface FilterSettings {
  enabled?: boolean;
  blend: number;
  cutoff: number;
  resonance?: number;
  mix?: number;
}

/**
 * Calculate the filter amplitude at a normalized position.
 *
 * @param norm_pos - Normalized position (0-1) across the frequency bins
 * @param filterSettings - Current filter settings
 * @returns Filter amplitude (0-1)
 */
export function getFilterAmplitudeAt(norm_pos: number, filterSettings: FilterSettings): number {
  const { blend, cutoff, resonance } = filterSettings;
  // Map cutoff (1-31) to normalized position across the 12 bins
  const norm_cutoff = (cutoff - 1) / (31 - 1);

  // Use linear distance instead of ratio for consistent curve width
  const steepness = 20; // Higher value creates sharper bandpass falloff
  const lp_distance = norm_pos - norm_cutoff;  // Distance right of cutoff
  const hp_distance = norm_cutoff - norm_pos;  // Distance left of cutoff

  // Apply steepness to distances (now maintains consistent curve shape)
  let lp = 1 / (1 + Math.pow(Math.max(0, lp_distance * steepness), 2));
  let hp = 1 / (1 + Math.pow(Math.max(0, hp_distance * steepness), 2));

  // Clamp near-zero values to exactly zero for cleaner filter tails
  const ZERO_THRESHOLD = 0.01;
  if (lp < ZERO_THRESHOLD) { lp = 0; }
  if (hp < ZERO_THRESHOLD) { hp = 0; }

  // Bandpass: product of LP and HP, normalized to 0-1 range
  const bp = lp * hp;

  let shape;
  if (blend <= 1.0) {
    // Blend from highpass (0) to bandpass (1)
    shape = hp * (1 - blend) + bp * blend;
  } else {
    // Blend from bandpass (1) to lowpass (2)
    shape = bp * (2 - blend) + lp * (blend - 1);
  }

  const res_q = 1.0 - (resonance || 0) / 105;
  const peak_width = Math.max(0.01, 0.2 * res_q * res_q);
  const peak = Math.exp(-Math.pow((norm_pos - norm_cutoff) / peak_width, 2));
  const res_gain = ((resonance || 0) / 100) * 0.6;

  // Add resonance peak but ensure total stays within 0-1 bounds
  const result = shape + peak * res_gain;

  // Final clamping with zero threshold
  const finalResult = Math.max(0, Math.min(1.0, result));
  return finalResult < ZERO_THRESHOLD ? 0 : finalResult;
}

/**
 * Apply filter mix to an amplitude value.
 *
 * @param filterAmp - Raw filter amplitude (0-1)
 * @param mixAmount - Mix amount (0-100)
 * @returns Mixed amplitude
 */
export function applyFilterMix(filterAmp: number, mixAmount: number): number {
  // Apply mix: when mix = 0, no filtering (amp = 1), when mix = 100, full filtering
  const mixNorm = mixAmount / 100;
  return 1 - mixNorm + (mixNorm * filterAmp);
}

/**
 * Apply discrete filtering to harmonic coefficients.
 *
 * @param originalCoeffs - Original harmonic coefficients
 * @param filterSettings - Current filter settings
 * @returns Filtered coefficients
 */
export function applyDiscreteFiltering(
  originalCoeffs: Float32Array,
  filterSettings: FilterSettings
): Float32Array {
  const mixAmount = filterSettings.mix || 0;

  if (mixAmount === 0) {
    // No filtering - return original coefficients
    return new Float32Array(originalCoeffs);
  }

  const filtered = new Float32Array(originalCoeffs.length);
  const mixNormalized = mixAmount / 100; // 0-1 range

  for (let i = 0; i < originalCoeffs.length; i++) {
    const harmonicAmplitude = originalCoeffs[i] ?? 0; // Y position of harmonic (0-1)

    // Get discrete filter curve value at this bin's center
    const binCenterFreq = (i + 0.5) / BINS; // Normalized frequency (0-1)
    const filterCurveLevel = getFilterAmplitudeAt(binCenterFreq, filterSettings); // 0-1

    // Apply filtering logic
    if (filterCurveLevel < harmonicAmplitude) {
      // Filter curve is below harmonic - apply attenuation
      const distance = harmonicAmplitude - filterCurveLevel;
      const reduction = distance * mixNormalized;

      // When Mix = 100%, harmonic is reduced to exactly the filter curve level
      filtered[i] = harmonicAmplitude - reduction;
    } else {
      // Filter curve is above or equal to harmonic - no attenuation needed
      filtered[i] = harmonicAmplitude;
    }

    // Ensure we don't go below zero
    const safe = filtered[i] ?? 0;
    filtered[i] = Math.max(0, safe);
  }

  return filtered;
}

/**
 * Get filtered coefficients for a given timbre color.
 * Used by waveform visualization.
 *
 * @param color - Timbre color key
 * @returns Filtered coefficients array
 */
export function getFilteredCoefficients(color: string): Float32Array {
  const timbre = store.state.timbres[color];
  if (!timbre) {
    return new Float32Array(BINS);
  }

  const filterSettings = timbre.filter;
  if (filterSettings && (filterSettings.enabled !== false) && (filterSettings.mix || 0) > 0) {
    // Return filtered coefficients
    return applyDiscreteFiltering(timbre.coeffs, filterSettings);
  } else {
    // No filtering - return original coefficients
    return new Float32Array(timbre.coeffs);
  }
}

/**
 * Get filter data for synth engine integration.
 *
 * @param color - Timbre color key
 * @returns Filter data object with enabled state, coefficients, and settings
 */
export function getFilterDataForSynth(color: string): {
  enabled: boolean;
  coefficients: Float32Array;
  settings: FilterSettings | null;
} {
  const timbre = store.state.timbres[color];
  if (!timbre?.filter?.enabled) {
    return {
      enabled: false,
      coefficients: new Float32Array(timbre?.coeffs || new Float32Array(BINS)),
      settings: null
    };
  }

  const filterSettings = timbre.filter;
  const mixAmount = filterSettings.mix || 0;

  // If mix is 0, return original coefficients (no filtering)
  if (mixAmount === 0) {
    return {
      enabled: false,
      coefficients: new Float32Array(timbre.coeffs),
      settings: filterSettings
    };
  }

  // Apply discrete filtering to the coefficients
  const filteredCoefficients = applyDiscreteFiltering(timbre.coeffs, filterSettings);

  return {
    enabled: true,
    coefficients: filteredCoefficients,
    settings: {
      blend: filterSettings.blend,
      cutoff: filterSettings.cutoff,
      mix: mixAmount,
      resonance: filterSettings.resonance || 0
    }
  };
}
