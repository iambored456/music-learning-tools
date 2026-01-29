/**
 * Shared audio sample registry for Music Learning Tools.
 * Keep this package data-only so apps can use any audio engine.
 */
export declare const DRUM_TRACK_IDS: readonly ["H", "M", "L"];
export type DrumTrackId = typeof DRUM_TRACK_IDS[number];
export type DrumSampleSet = {
    label: string;
    tracks: Record<DrumTrackId, string>;
};
export declare const DRUM_SAMPLE_SETS: {
    readonly cr78: {
        readonly label: "CR-78";
        readonly tracks: {
            readonly H: "https://tonejs.github.io/audio/drum-samples/CR78/hihat.mp3";
            readonly M: "https://tonejs.github.io/audio/drum-samples/CR78/snare.mp3";
            readonly L: "https://tonejs.github.io/audio/drum-samples/CR78/kick.mp3";
        };
    };
};
export type DrumSampleSetName = keyof typeof DRUM_SAMPLE_SETS;
export declare const DEFAULT_DRUM_SAMPLE_SET: DrumSampleSetName;
export declare function getDrumSampleSet(name?: DrumSampleSetName): Record<DrumTrackId, string>;
//# sourceMappingURL=index.d.ts.map