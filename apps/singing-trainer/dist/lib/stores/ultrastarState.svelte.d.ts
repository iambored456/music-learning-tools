import { UltrastarSong, YouTubeSyncConfig } from '../types/ultrastar.js';
import { TargetNote } from './highwayState.svelte.js';
export interface UltrastarState {
    isActive: boolean;
    isLoading: boolean;
    isPlaying: boolean;
    song: UltrastarSong | null;
    targetNotes: TargetNote[];
    youtubeId: string | null;
    syncConfig: YouTubeSyncConfig;
    baseMidi: number;
    totalDurationMs: number;
    detectedRange: {
        minMidi: number;
        maxMidi: number;
    };
    error: string | null;
}
export declare const ultrastarState: {
    readonly state: UltrastarState;
    /** Load and parse an Ultrastar .txt file */
    loadFile(file: File): Promise<boolean>;
    /** Get the computed YouTube offset in seconds */
    readonly youtubeOffset: number;
    /** Adjust the manual sync offset */
    adjustOffset(deltaSec: number): void;
    /** Set the manual sync offset directly */
    setManualOffset(offsetSec: number): void;
    /** Reset manual offset to zero */
    resetOffset(): void;
    /** Set the base MIDI note for pitch conversion */
    setBaseMidi(midi: number): void;
    /** Set playing state */
    setPlaying(playing: boolean): void;
    /** Register completion callback */
    onComplete(callback: () => void): void;
    /** Trigger completion (called when song ends) */
    triggerComplete(): void;
    /** Check if current time has exceeded song duration */
    checkCompletion(currentTimeMs: number): boolean;
    /** Get song title */
    readonly title: string;
    /** Get song artist */
    readonly artist: string;
    /** Check if YouTube video is available */
    readonly hasVideo: boolean;
    /** Reset state and clear loaded song */
    reset(): void;
    /** Unload song but preserve settings */
    unload(): void;
};
