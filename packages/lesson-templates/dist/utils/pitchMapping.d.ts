/**
 * Pitch Mapping Utilities
 *
 * Functions for applying the user's calibrated speaking pitch to
 * exercise configurations based on the template's speakingPitchUsage setting.
 */
import type { PitchMatchingTemplate, PitchMatchingConfig, TemplateContext, ResolvedConfig } from '../types.js';
/**
 * Resolve a template's configuration by applying speaking pitch mapping
 */
export declare function resolveConfig(template: PitchMatchingTemplate, context: TemplateContext): ResolvedConfig;
/**
 * Apply speaking pitch as the tonic (center of range)
 *
 * The speaking pitch becomes the tonal center of the exercise.
 * Range extends equally above and below.
 */
export declare function applyAsTonic(speakingPitch: number, config: PitchMatchingConfig): {
    minMidi: number;
    maxMidi: number;
};
/**
 * Apply speaking pitch as the floor note (lowest note)
 *
 * The speaking pitch becomes the lowest structural note of the melody.
 * Range extends upward from this point.
 */
export declare function applyAsFloorNote(speakingPitch: number, config: PitchMatchingConfig): {
    minMidi: number;
    maxMidi: number;
};
/**
 * Apply custom offset to speaking pitch
 *
 * The speaking pitch is transposed by the offset, then used as floor.
 */
export declare function applyCustomOffset(speakingPitch: number, offset: number, config: PitchMatchingConfig): {
    minMidi: number;
    maxMidi: number;
};
/**
 * Apply a variation to a base config
 */
export declare function applyVariation(baseConfig: PitchMatchingConfig, overrides: Partial<PitchMatchingConfig>): PitchMatchingConfig;
//# sourceMappingURL=pitchMapping.d.ts.map