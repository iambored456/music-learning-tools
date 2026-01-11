/**
 * Ultrastar File Format Types
 *
 * Type definitions for parsing and working with UltraStar karaoke .txt files.
 * Supports YouTube video embedding and sync with the note highway.
 */
/** Ultrastar metadata parsed from header lines (#KEY:VALUE) */
export interface UltrastarMetadata {
    title: string;
    artist: string;
    video?: string;
    videoGap?: number;
    gap?: number;
    bpm: number;
    mp3?: string;
    language?: string;
    genre?: string;
    year?: number;
    creator?: string;
    cover?: string;
    background?: string;
    previewStart?: number;
}
/** Note types from Ultrastar format */
export type UltrastarNoteType = ':' | '*' | 'F' | 'R' | '-';
/** Parsed note from Ultrastar file */
export interface UltrastarNote {
    type: UltrastarNoteType;
    startBeat: number;
    duration: number;
    pitch: number;
    lyric: string;
}
/** Complete parsed Ultrastar song */
export interface UltrastarSong {
    metadata: UltrastarMetadata;
    notes: UltrastarNote[];
    lineBreaks: number[];
    totalBeats: number;
}
/** YouTube player state */
export interface YouTubePlayerState {
    isApiLoaded: boolean;
    isReady: boolean;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    error?: string;
}
/** Sync configuration for YouTube-highway alignment */
export interface YouTubeSyncConfig {
    gapMs: number;
    videoGapSec: number;
    manualOffsetSec: number;
}
/** Parser result with success/error info */
export type ParseResult = {
    success: true;
    song: UltrastarSong;
} | {
    success: false;
    error: string;
};
/** YouTube ID extraction patterns */
export declare const YOUTUBE_URL_PATTERNS: readonly [RegExp, RegExp];
/** Default sync configuration */
export declare const DEFAULT_SYNC_CONFIG: YouTubeSyncConfig;
/** Standard Ultrastar base MIDI (0 = C4 = MIDI 60) */
export declare const ULTRASTAR_BASE_MIDI = 60;
