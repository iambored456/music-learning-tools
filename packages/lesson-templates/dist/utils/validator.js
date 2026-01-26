/**
 * Template Validator
 *
 * Validation utilities for lesson templates to ensure they are well-formed.
 */
/**
 * Validate a lesson template
 */
export function validateTemplate(template) {
    const errors = [];
    const warnings = [];
    // Check required fields
    if (!template.id || template.id.trim() === '') {
        errors.push('Template must have a non-empty id');
    }
    if (!template.name || template.name.trim() === '') {
        errors.push('Template must have a non-empty name');
    }
    if (!template.description) {
        warnings.push('Template should have a description');
    }
    if (![1, 2, 3].includes(template.difficulty)) {
        errors.push('Difficulty must be 1, 2, or 3');
    }
    const validUsages = ['none', 'asTonic', 'asFloorNote', 'custom'];
    if (!validUsages.includes(template.speakingPitchUsage)) {
        errors.push(`Invalid speakingPitchUsage: ${template.speakingPitchUsage}`);
    }
    if (template.speakingPitchUsage === 'custom' && template.customPitchOffset === undefined) {
        warnings.push('Template uses custom speaking pitch but no offset specified');
    }
    // Type-specific validation
    if (template.type === 'pitch-matching') {
        const pitchMatchingErrors = validatePitchMatchingTemplate(template);
        errors.push(...pitchMatchingErrors);
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}
/**
 * Validate pitch matching template specific fields
 */
function validatePitchMatchingTemplate(template) {
    const errors = [];
    // Validate config
    if (!template.config) {
        errors.push('PitchMatchingTemplate must have a config');
        return errors;
    }
    if (typeof template.config.numLoops !== 'number' || template.config.numLoops < 1) {
        errors.push('numLoops must be a positive number');
    }
    if (typeof template.config.tempo !== 'number' || template.config.tempo < 30 || template.config.tempo > 300) {
        errors.push('tempo must be between 30 and 300 BPM');
    }
    if (typeof template.config.referenceVolume !== 'number' || template.config.referenceVolume < -60 || template.config.referenceVolume > 0) {
        errors.push('referenceVolume must be between -60 and 0 dB');
    }
    // Validate MIDI range if specified
    if (template.config.minMidi !== undefined && template.config.maxMidi !== undefined) {
        if (template.config.minMidi >= template.config.maxMidi) {
            errors.push('minMidi must be less than maxMidi');
        }
        if (template.config.minMidi < 0 || template.config.maxMidi > 127) {
            errors.push('MIDI values must be between 0 and 127');
        }
    }
    // Validate pattern
    if (!template.pattern) {
        errors.push('PitchMatchingTemplate must have a pattern');
    }
    else {
        const patternErrors = validatePattern(template.pattern);
        errors.push(...patternErrors);
    }
    // Validate variations if present
    if (template.variations) {
        for (const variation of template.variations) {
            if (!variation.id || variation.id.trim() === '') {
                errors.push(`Variation must have a non-empty id`);
            }
            if (!variation.name || variation.name.trim() === '') {
                errors.push(`Variation ${variation.id} must have a name`);
            }
            if (![1, 2, 3].includes(variation.difficulty)) {
                errors.push(`Variation ${variation.id} has invalid difficulty`);
            }
        }
    }
    return errors;
}
/**
 * Validate an exercise pattern
 */
function validatePattern(pattern) {
    const errors = [];
    if (!pattern.id || pattern.id.trim() === '') {
        errors.push('Pattern must have a non-empty id');
    }
    if (!pattern.name || pattern.name.trim() === '') {
        errors.push('Pattern must have a non-empty name');
    }
    if (typeof pattern.leadInMs !== 'number' || pattern.leadInMs < 0) {
        errors.push('leadInMs must be a non-negative number');
    }
    if (!Array.isArray(pattern.phases) || pattern.phases.length === 0) {
        errors.push('Pattern must have at least one phase');
        return errors;
    }
    // Validate each phase
    let hasReference = false;
    let hasInput = false;
    for (let i = 0; i < pattern.phases.length; i++) {
        const phase = pattern.phases[i];
        const phaseErrors = validatePhase(phase, i);
        errors.push(...phaseErrors);
        if (phase.type === 'reference')
            hasReference = true;
        if (phase.type === 'input')
            hasInput = true;
    }
    // A pitch matching pattern should have both reference and input phases
    if (!hasReference) {
        errors.push('Pattern should have at least one reference phase');
    }
    if (!hasInput) {
        errors.push('Pattern should have at least one input phase');
    }
    return errors;
}
/**
 * Validate a single phase
 */
function validatePhase(phase, index) {
    const errors = [];
    const prefix = `Phase ${index}`;
    const validTypes = ['reference', 'rest', 'input'];
    if (!validTypes.includes(phase.type)) {
        errors.push(`${prefix} has invalid type: ${phase.type}`);
    }
    if (typeof phase.durationMicrobeats !== 'number' || phase.durationMicrobeats < 1) {
        errors.push(`${prefix} durationMicrobeats must be a positive number`);
    }
    return errors;
}
/**
 * Calculate total loop duration in microbeats
 */
export function calculateLoopDurationMicrobeats(pattern) {
    return pattern.phases.reduce((sum, phase) => sum + phase.durationMicrobeats, 0);
}
/**
 * Calculate total loop duration in milliseconds at a given tempo
 */
export function calculateLoopDurationMs(pattern, tempo) {
    const microbeatsPerLoop = calculateLoopDurationMicrobeats(pattern);
    const microbeatDurationMs = (60 / tempo) * 1000 / 2; // 2 microbeats per beat
    return microbeatsPerLoop * microbeatDurationMs;
}
