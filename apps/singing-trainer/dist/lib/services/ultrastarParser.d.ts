import { UltrastarMetadata, UltrastarNote, UltrastarSong, ParseResult, YouTubeSyncConfig } from '../types/ultrastar.js';
import { TargetNote } from '../stores/highwayState.svelte.js';
/**
 * Parse an Ultrastar .txt file content into structured song data
 */
export declare function parseUltrastarFile(content: string): ParseResult;
/**
 * Extract metadata from header lines (#KEY:VALUE format)
 */
export declare function extractMetadata(lines: string[]): UltrastarMetadata;
/**
 * Parse note lines from Ultrastar format
 */
export declare function parseNoteLines(lines: string[]): {
    notes: UltrastarNote[];
    lineBreaks: number[];
    totalBeats: number;
};
/**
 * Extract YouTube video ID from URL or direct ID
 */
export declare function extractYouTubeId(urlOrId: string): string | null;
/**
 * Convert Ultrastar song to highway target notes
 *
 * Note: GAP is NOT added to note timing here. GAP represents the offset
 * from audio start to first note, and is handled separately via YouTube sync.
 * Note timing is relative to transport time 0 = first beat of song.
 */
export declare function convertToTargetNotes(song: UltrastarSong, baseMidi?: number): TargetNote[];
/**
 * Get sync configuration from Ultrastar metadata
 */
export declare function getSyncConfig(metadata: UltrastarMetadata): YouTubeSyncConfig;
/**
 * Calculate total duration of song in milliseconds
 * Duration is relative to transport time 0 = first note
 */
export declare function calculateSongDuration(song: UltrastarSong): number;
/**
 * Detect pitch range of song (for auto-adjusting viewport)
 */
export declare function detectPitchRange(song: UltrastarSong, baseMidi?: number): {
    minMidi: number;
    maxMidi: number;
};
/**
 * Group notes by phrase for results breakdown
 */
export declare function groupNotesByPhrase(notes: UltrastarNote[], lineBreaks: number[]): UltrastarNote[][];
/**
 * Get lyric preview for a phrase (first few syllables)
 */
export declare function getPhraseLyricPreview(notes: UltrastarNote[], maxLength?: number): string;
