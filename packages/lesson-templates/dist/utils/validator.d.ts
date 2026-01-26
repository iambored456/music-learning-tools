/**
 * Template Validator
 *
 * Validation utilities for lesson templates to ensure they are well-formed.
 */
import type { LessonTemplate, ExercisePattern } from '../types.js';
/** Validation result */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}
/**
 * Validate a lesson template
 */
export declare function validateTemplate(template: LessonTemplate): ValidationResult;
/**
 * Calculate total loop duration in microbeats
 */
export declare function calculateLoopDurationMicrobeats(pattern: ExercisePattern): number;
/**
 * Calculate total loop duration in milliseconds at a given tempo
 */
export declare function calculateLoopDurationMs(pattern: ExercisePattern, tempo: number): number;
//# sourceMappingURL=validator.d.ts.map