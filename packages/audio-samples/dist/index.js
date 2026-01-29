/**
 * Shared audio sample registry for Music Learning Tools.
 * Keep this package data-only so apps can use any audio engine.
 */
export const DRUM_TRACK_IDS = ['H', 'M', 'L'];
export const DRUM_SAMPLE_SETS = {
    cr78: {
        label: 'CR-78',
        tracks: {
            H: 'https://tonejs.github.io/audio/drum-samples/CR78/hihat.mp3',
            M: 'https://tonejs.github.io/audio/drum-samples/CR78/snare.mp3',
            L: 'https://tonejs.github.io/audio/drum-samples/CR78/kick.mp3'
        }
    }
};
export const DEFAULT_DRUM_SAMPLE_SET = 'cr78';
export function getDrumSampleSet(name = DEFAULT_DRUM_SAMPLE_SET) {
    return DRUM_SAMPLE_SETS[name].tracks;
}
