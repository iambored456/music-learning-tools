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
  video?: string; // YouTube URL or video ID
  videoGap?: number; // Offset in seconds for video sync
  gap?: number; // Offset in milliseconds for note timing
  bpm: number; // Beats per minute (Ultrastar uses quarter-beat resolution)
  mp3?: string; // Audio filename (not used for YouTube mode)
  language?: string;
  genre?: string;
  year?: number;
  creator?: string;
  cover?: string;
  background?: string;
  previewStart?: number; // Preview start time in seconds
}

/** Note types from Ultrastar format */
export type UltrastarNoteType =
  | ':' // Regular note
  | '*' // Golden/bonus note (worth double points)
  | 'F' // Freestyle note (no pitch judgment)
  | 'R' // Rap note (rhythm only, no pitch)
  | '-'; // Line/phrase break

/** Parsed note from Ultrastar file */
export interface UltrastarNote {
  type: UltrastarNoteType;
  startBeat: number; // Beat number from song start
  duration: number; // Duration in beats
  pitch: number; // Relative pitch (0 = C4 in standard Ultrastar)
  lyric: string; // Syllable text
}

/** Complete parsed Ultrastar song */
export interface UltrastarSong {
  metadata: UltrastarMetadata;
  notes: UltrastarNote[];
  lineBreaks: number[]; // Beat positions of phrase breaks
  totalBeats: number; // Total length in beats
}

/** YouTube player state */
export interface YouTubePlayerState {
  isApiLoaded: boolean;
  isReady: boolean;
  isPlaying: boolean;
  currentTime: number; // seconds
  duration: number; // seconds
  error?: string;
}

/** Sync configuration for YouTube-highway alignment */
export interface YouTubeSyncConfig {
  gapMs: number; // GAP from Ultrastar (ms)
  videoGapSec: number; // VIDEOGAP from Ultrastar (sec)
  manualOffsetSec: number; // User-adjustable offset
}

/** Parser result with success/error info */
export type ParseResult =
  | { success: true; song: UltrastarSong }
  | { success: false; error: string };

/** YouTube ID extraction patterns */
export const YOUTUBE_URL_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
] as const;

/** Default sync configuration */
export const DEFAULT_SYNC_CONFIG: YouTubeSyncConfig = {
  gapMs: 0,
  videoGapSec: 0,
  manualOffsetSec: 0,
};

/** Standard Ultrastar base MIDI (0 = C4 = MIDI 60) */
export const ULTRASTAR_BASE_MIDI = 60;

/**
 * Pitch format for Ultrastar files.
 * - 'relative': Pitch values are offsets from C4 (MIDI 60) - standard Ultrastar format
 * - 'absolute': Pitch values are direct MIDI note numbers - common in community files
 * - 'auto': Automatically detect format based on pitch value distribution
 */
export type UltrastarPitchFormat = 'relative' | 'absolute' | 'auto';

/**
 * A single syllable within a lyric phrase.
 */
export interface LyricSyllable {
  /** The syllable text (may include leading space for word boundaries) */
  text: string;
  /** Start time in milliseconds from exercise start */
  startTimeMs: number;
  /** End time in milliseconds from exercise start */
  endTimeMs: number;
  /** MIDI note number for this syllable */
  midi: number;
  /** Whether this is a golden note (worth double points) */
  isGolden: boolean;
  /** Whether this is a rap note (rhythm only, no pitch judgment) */
  isRap: boolean;
}

/**
 * A phrase (line) of lyrics for karaoke display.
 * Phrases are delimited by line break markers (`-`) in Ultrastar files.
 */
export interface LyricPhrase {
  /** Index of this phrase (0-based) */
  index: number;
  /** Beat number where this phrase starts */
  startBeat: number;
  /** Beat number where this phrase ends */
  endBeat: number;
  /** Start time in milliseconds from exercise start */
  startTimeMs: number;
  /** End time in milliseconds from exercise start */
  endTimeMs: number;
  /** Individual syllables in this phrase */
  syllables: LyricSyllable[];
  /** Full phrase text (all syllables joined) */
  fullText: string;
}
