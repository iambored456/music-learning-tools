/**
 * Shared audio sample registry for Music Learning Tools.
 * Keep this package data-only so apps can use any audio engine.
 */

export const DRUM_TRACK_IDS = ['H', 'M', 'L'] as const;
export type DrumTrackId = typeof DRUM_TRACK_IDS[number];

export type DrumSampleSet = {
  label: string;
  tracks: Record<DrumTrackId, string>;
};

export const DRUM_SAMPLE_SETS = {
  cr78: {
    label: 'CR-78',
    tracks: {
      H: 'https://tonejs.github.io/audio/drum-samples/CR78/hihat.mp3',
      M: 'https://tonejs.github.io/audio/drum-samples/CR78/snare.mp3',
      L: 'https://tonejs.github.io/audio/drum-samples/CR78/kick.mp3'
    }
  }
} as const satisfies Record<string, DrumSampleSet>;

export type DrumSampleSetName = keyof typeof DRUM_SAMPLE_SETS;

export const DEFAULT_DRUM_SAMPLE_SET: DrumSampleSetName = 'cr78';

export function getDrumSampleSet(
  name: DrumSampleSetName = DEFAULT_DRUM_SAMPLE_SET
): Record<DrumTrackId, string> {
  return DRUM_SAMPLE_SETS[name].tracks;
}
