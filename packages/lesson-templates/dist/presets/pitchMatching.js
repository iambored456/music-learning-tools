/**
 * Pitch Matching Presets
 *
 * Pre-defined templates for pitch matching exercises.
 * The "Basic Pitch Matching" template corresponds to the existing Demo Exercise.
 */
/**
 * Standard 4-phase pattern used by the Demo Exercise
 *
 * Structure per loop (32 microbeats total):
 * - Reference (8 microbeats): System plays the target pitch
 * - Rest (8 microbeats): Silence
 * - Input (8 microbeats): User sings the pitch
 * - Rest (8 microbeats): Silence
 */
export const STANDARD_4_PHASE_PATTERN = {
    id: 'standard-4-phase',
    name: 'Standard 4-Phase',
    leadInMs: 2000,
    phases: [
        { type: 'reference', durationMicrobeats: 8, emoji: '👂', label: 'Listen' },
        { type: 'rest', durationMicrobeats: 8 },
        { type: 'input', durationMicrobeats: 8, emoji: '🎤', label: 'Sing' },
        { type: 'rest', durationMicrobeats: 8 },
    ],
};
/**
 * Quick response pattern - shorter rest between reference and input
 */
export const QUICK_RESPONSE_PATTERN = {
    id: 'quick-response',
    name: 'Quick Response',
    leadInMs: 1500,
    phases: [
        { type: 'reference', durationMicrobeats: 8, emoji: '👂', label: 'Listen' },
        { type: 'rest', durationMicrobeats: 4 },
        { type: 'input', durationMicrobeats: 8, emoji: '🎤', label: 'Sing' },
        { type: 'rest', durationMicrobeats: 4 },
    ],
};
/**
 * Extended hold pattern - longer singing duration
 */
export const EXTENDED_HOLD_PATTERN = {
    id: 'extended-hold',
    name: 'Extended Hold',
    leadInMs: 2000,
    phases: [
        { type: 'reference', durationMicrobeats: 12, emoji: '👂', label: 'Listen' },
        { type: 'rest', durationMicrobeats: 8 },
        { type: 'input', durationMicrobeats: 16, emoji: '🎤', label: 'Hold' },
        { type: 'rest', durationMicrobeats: 8 },
    ],
};
/**
 * Basic Pitch Matching Template
 *
 * This is the standard template corresponding to the existing Demo Exercise.
 * Uses the user's speaking pitch as the floor note by default.
 */
export const BASIC_PITCH_MATCHING = {
    id: 'basic-pitch-match',
    name: 'Basic Pitch Matching',
    description: 'Match single pitches. Listen to the reference tone, then sing it back.',
    type: 'pitch-matching',
    difficulty: 1,
    speakingPitchUsage: 'asFloorNote',
    config: {
        numLoops: 5,
        tempo: 108,
        referenceVolume: -12,
    },
    pattern: STANDARD_4_PHASE_PATTERN,
    variations: [
        {
            id: 'beginner-slow',
            name: 'Beginner (Slow)',
            difficulty: 1,
            configOverrides: { numLoops: 3, tempo: 80, referenceVolume: 0 },
        },
        {
            id: 'intermediate',
            name: 'Intermediate',
            difficulty: 2,
            configOverrides: { numLoops: 7, tempo: 120 },
        },
        {
            id: 'advanced-fast',
            name: 'Advanced (Fast)',
            difficulty: 3,
            configOverrides: { numLoops: 10, tempo: 140, referenceVolume: -20 },
        },
    ],
};
/**
 * Quick Response Exercise
 *
 * Faster tempo with shorter rest periods for developing quick pitch recognition.
 */
export const QUICK_PITCH_MATCHING = {
    id: 'quick-pitch-match',
    name: 'Quick Pitch Response',
    description: 'Develop fast pitch recognition. Shorter rest between listen and sing.',
    type: 'pitch-matching',
    difficulty: 2,
    speakingPitchUsage: 'asFloorNote',
    config: {
        numLoops: 8,
        tempo: 120,
        referenceVolume: -12,
    },
    pattern: QUICK_RESPONSE_PATTERN,
    variations: [
        {
            id: 'quick-beginner',
            name: 'Warm-up',
            difficulty: 1,
            configOverrides: { numLoops: 4, tempo: 100 },
        },
        {
            id: 'quick-advanced',
            name: 'Challenge',
            difficulty: 3,
            configOverrides: { numLoops: 12, tempo: 144 },
        },
    ],
};
/**
 * Sustained Pitch Exercise
 *
 * Focus on holding pitches steady for longer durations.
 */
export const SUSTAINED_PITCH_MATCHING = {
    id: 'sustained-pitch-match',
    name: 'Sustained Pitch',
    description: 'Practice holding pitches steady. Extended singing duration for each note.',
    type: 'pitch-matching',
    difficulty: 2,
    speakingPitchUsage: 'asTonic',
    config: {
        numLoops: 4,
        tempo: 80,
        referenceVolume: -8,
    },
    pattern: EXTENDED_HOLD_PATTERN,
    variations: [
        {
            id: 'sustained-intro',
            name: 'Introduction',
            difficulty: 1,
            configOverrides: { numLoops: 2, tempo: 72 },
        },
        {
            id: 'sustained-challenge',
            name: 'Endurance',
            difficulty: 3,
            configOverrides: { numLoops: 6, tempo: 60, referenceVolume: -15 },
        },
    ],
};
/**
 * Centered Range Exercise
 *
 * Uses speaking pitch as the tonic/center for exploring the comfortable range.
 */
export const CENTERED_RANGE_MATCHING = {
    id: 'centered-range-match',
    name: 'Centered Range',
    description: 'Explore your comfortable range. Pitches centered around your speaking pitch.',
    type: 'pitch-matching',
    difficulty: 1,
    speakingPitchUsage: 'asTonic',
    config: {
        numLoops: 6,
        tempo: 100,
        referenceVolume: -10,
    },
    pattern: STANDARD_4_PHASE_PATTERN,
};
/**
 * All pitch matching presets
 */
export const PITCH_MATCHING_PRESETS = [
    BASIC_PITCH_MATCHING,
    QUICK_PITCH_MATCHING,
    SUSTAINED_PITCH_MATCHING,
    CENTERED_RANGE_MATCHING,
];
