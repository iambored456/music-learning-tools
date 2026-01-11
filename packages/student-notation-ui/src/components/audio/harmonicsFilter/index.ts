/**
 * Harmonics Filter Module
 *
 * Barrel export for harmonic filter functionality.
 *
 * Sub-modules:
 * - filterCalculations.ts: Pure math for filter curves and coefficient filtering
 * - harmonicBins.ts: Main UI component and state management
 */

// Filter calculation functions
export {
  type FilterSettings,
  getFilterAmplitudeAt,
  applyFilterMix,
  applyDiscreteFiltering,
  getFilteredCoefficients,
  getFilterDataForSynth
} from './filterCalculations.ts';

// Main initialization
export {
  initHarmonicBins,
  getHarmonicBinsDebugMessages
} from './harmonicBins.ts';
