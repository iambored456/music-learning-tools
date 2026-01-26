/**
 * Pitch Mapping Utilities
 *
 * Functions for applying the user's calibrated speaking pitch to
 * exercise configurations based on the template's speakingPitchUsage setting.
 */

import type {
  PitchMatchingTemplate,
  PitchMatchingConfig,
  TemplateContext,
  ResolvedConfig,
  SpeakingPitchUsage,
} from '../types.js';

/** Default pitch range when no range is specified */
const DEFAULT_MIN_MIDI = 48; // C3
const DEFAULT_MAX_MIDI = 72; // C5
const DEFAULT_RANGE_SEMITONES = 12; // One octave range

/**
 * Resolve a template's configuration by applying speaking pitch mapping
 */
export function resolveConfig(
  template: PitchMatchingTemplate,
  context: TemplateContext
): ResolvedConfig {
  const { config, speakingPitchUsage, customPitchOffset } = template;
  const { speakingPitchMidi, currentViewportRange } = context;

  // Start with base config values
  let effectiveMinMidi = config.minMidi ?? DEFAULT_MIN_MIDI;
  let effectiveMaxMidi = config.maxMidi ?? DEFAULT_MAX_MIDI;
  let speakingPitchApplied = false;

  // Apply speaking pitch mapping if calibrated and usage is not 'none'
  if (speakingPitchMidi !== null && speakingPitchUsage !== 'none') {
    const mapped = applyPitchMapping(
      speakingPitchMidi,
      speakingPitchUsage,
      customPitchOffset,
      config
    );
    effectiveMinMidi = mapped.minMidi;
    effectiveMaxMidi = mapped.maxMidi;
    speakingPitchApplied = true;
  } else if (currentViewportRange) {
    // Fall back to current viewport range if available
    effectiveMinMidi = currentViewportRange.minMidi;
    effectiveMaxMidi = currentViewportRange.maxMidi;
  }

  return {
    ...config,
    effectiveMinMidi,
    effectiveMaxMidi,
    speakingPitchApplied,
  };
}

/**
 * Apply pitch mapping based on usage type
 */
function applyPitchMapping(
  speakingPitch: number,
  usage: SpeakingPitchUsage,
  customOffset: number | undefined,
  config: PitchMatchingConfig
): { minMidi: number; maxMidi: number } {
  switch (usage) {
    case 'asTonic':
      return applyAsTonic(speakingPitch, config);
    case 'asFloorNote':
      return applyAsFloorNote(speakingPitch, config);
    case 'custom':
      return applyCustomOffset(speakingPitch, customOffset ?? 0, config);
    default:
      // 'none' - use config values or defaults
      return {
        minMidi: config.minMidi ?? DEFAULT_MIN_MIDI,
        maxMidi: config.maxMidi ?? DEFAULT_MAX_MIDI,
      };
  }
}

/**
 * Apply speaking pitch as the tonic (center of range)
 *
 * The speaking pitch becomes the tonal center of the exercise.
 * Range extends equally above and below.
 */
export function applyAsTonic(
  speakingPitch: number,
  config: PitchMatchingConfig
): { minMidi: number; maxMidi: number } {
  // Calculate the desired range from config or use default
  const configRange =
    config.maxMidi !== undefined && config.minMidi !== undefined
      ? config.maxMidi - config.minMidi
      : DEFAULT_RANGE_SEMITONES;

  const halfRange = Math.floor(configRange / 2);

  // Center the range around the speaking pitch
  // Extend more above than below (singing typically goes higher)
  const minMidi = speakingPitch - Math.floor(halfRange * 0.4); // 40% below
  const maxMidi = speakingPitch + Math.ceil(halfRange * 1.6); // 60% above

  return { minMidi, maxMidi };
}

/**
 * Apply speaking pitch as the floor note (lowest note)
 *
 * The speaking pitch becomes the lowest structural note of the melody.
 * Range extends upward from this point.
 */
export function applyAsFloorNote(
  speakingPitch: number,
  config: PitchMatchingConfig
): { minMidi: number; maxMidi: number } {
  // Calculate the desired range from config or use default
  const configRange =
    config.maxMidi !== undefined && config.minMidi !== undefined
      ? config.maxMidi - config.minMidi
      : DEFAULT_RANGE_SEMITONES;

  // Speaking pitch is the floor, range extends upward
  const minMidi = speakingPitch;
  const maxMidi = speakingPitch + configRange;

  return { minMidi, maxMidi };
}

/**
 * Apply custom offset to speaking pitch
 *
 * The speaking pitch is transposed by the offset, then used as floor.
 */
export function applyCustomOffset(
  speakingPitch: number,
  offset: number,
  config: PitchMatchingConfig
): { minMidi: number; maxMidi: number } {
  const transposedPitch = speakingPitch + offset;

  // Calculate the desired range from config or use default
  const configRange =
    config.maxMidi !== undefined && config.minMidi !== undefined
      ? config.maxMidi - config.minMidi
      : DEFAULT_RANGE_SEMITONES;

  // Use transposed pitch as floor
  const minMidi = transposedPitch;
  const maxMidi = transposedPitch + configRange;

  return { minMidi, maxMidi };
}

/**
 * Apply a variation to a base config
 */
export function applyVariation(
  baseConfig: PitchMatchingConfig,
  overrides: Partial<PitchMatchingConfig>
): PitchMatchingConfig {
  return {
    ...baseConfig,
    ...overrides,
  };
}
