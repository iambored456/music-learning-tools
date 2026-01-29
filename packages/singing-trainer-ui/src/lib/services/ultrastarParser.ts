/**
 * Ultrastar Parser Service
 *
 * Parses UltraStar karaoke .txt files into structured data for the singing trainer.
 * Handles metadata extraction, note parsing, and conversion to highway target notes.
 */

import type {
  UltrastarMetadata,
  UltrastarNote,
  UltrastarNoteType,
  UltrastarSong,
  ParseResult,
  YouTubeSyncConfig,
  UltrastarPitchFormat,
  LyricPhrase,
  LyricSyllable,
} from '../types/ultrastar.js';
import { YOUTUBE_URL_PATTERNS, ULTRASTAR_BASE_MIDI } from '../types/ultrastar.js';
import type { TargetNote } from '../stores/highwayState.svelte.js';

/**
 * BPM normalization result
 */
export interface NormalizedBpm {
  /** BPM normalized to 60-180 range */
  effectiveBpm: number;
  /** Divisor applied to beat values (e.g., 2 means beats are half as long) */
  beatDivisor: number;
  /** Original raw BPM from file */
  rawBpm: number;
}

/**
 * Normalize UltraStar BPM to musical range (60-180).
 *
 * UltraStar files often have inflated BPM values that need normalization.
 * For example, 184.60 BPM should be halved to 92.30 BPM.
 *
 * The beatDivisor tells us how to scale beat values:
 * - If BPM was halved (divisor = 2), beats take twice as long
 * - If BPM was doubled (divisor = 0.5), beats take half as long
 *
 * @param rawBpm - Raw BPM value from Ultrastar file
 * @returns Normalized BPM info with effective tempo and beat divisor
 */
export function normalizeBpm(rawBpm: number): NormalizedBpm {
  let effectiveBpm = rawBpm;
  let beatDivisor = 1;

  // Halve until in reasonable range (60-180 BPM)
  while (effectiveBpm > 180) {
    effectiveBpm /= 2;
    beatDivisor *= 2;
  }

  // Double if too slow (rare but possible)
  while (effectiveBpm < 60 && effectiveBpm > 0) {
    effectiveBpm *= 2;
    beatDivisor /= 2;
  }

  return {
    effectiveBpm,
    beatDivisor,
    rawBpm,
  };
}

/**
 * Parse an Ultrastar .txt file content into structured song data
 */
export function parseUltrastarFile(content: string): ParseResult {
  try {
    const lines = content.split(/\r?\n/).map((line) => line.trim());

    // Extract metadata from header lines
    const metadata = extractMetadata(lines);

    if (!metadata.bpm) {
      return { success: false, error: 'Missing required #BPM tag' };
    }

    // Parse note lines
    const { notes, lineBreaks, totalBeats } = parseNoteLines(lines);

    if (notes.length === 0) {
      return { success: false, error: 'No valid notes found in file' };
    }

    return {
      success: true,
      song: {
        metadata,
        notes,
        lineBreaks,
        totalBeats,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
    };
  }
}

/**
 * Extract metadata from header lines (#KEY:VALUE format)
 */
export function extractMetadata(lines: string[]): UltrastarMetadata {
  const metadata: Partial<UltrastarMetadata> = {};

  for (const line of lines) {
    if (!line.startsWith('#')) continue;

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(1, colonIndex).toUpperCase().trim();
    const value = line.slice(colonIndex + 1).trim();

    switch (key) {
      case 'TITLE':
        metadata.title = value;
        break;
      case 'ARTIST':
        metadata.artist = value;
        break;
      case 'VIDEO':
        metadata.video = value;
        break;
      case 'VIDEOGAP':
        // VIDEOGAP is in seconds (can be negative)
        metadata.videoGap = parseFloat(value.replace(',', '.')) || 0;
        break;
      case 'GAP':
        // GAP is in milliseconds (can use comma as decimal separator)
        metadata.gap = parseFloat(value.replace(',', '.')) || 0;
        break;
      case 'BPM':
        // BPM uses comma as decimal separator in some files
        metadata.bpm = parseFloat(value.replace(',', '.')) || 0;
        break;
      case 'MP3':
      case 'AUDIO':
        metadata.mp3 = value;
        break;
      case 'LANGUAGE':
        metadata.language = value;
        break;
      case 'GENRE':
        metadata.genre = value;
        break;
      case 'YEAR':
        metadata.year = parseInt(value) || undefined;
        break;
      case 'CREATOR':
        metadata.creator = value;
        break;
      case 'COVER':
        metadata.cover = value;
        break;
      case 'BACKGROUND':
        metadata.background = value;
        break;
      case 'PREVIEWSTART':
        metadata.previewStart = parseFloat(value.replace(',', '.')) || 0;
        break;
    }
  }

  return {
    title: metadata.title || 'Unknown Title',
    artist: metadata.artist || 'Unknown Artist',
    bpm: metadata.bpm || 0,
    ...metadata,
  };
}

/**
 * Parse note lines from Ultrastar format
 */
export function parseNoteLines(lines: string[]): {
  notes: UltrastarNote[];
  lineBreaks: number[];
  totalBeats: number;
} {
  const notes: UltrastarNote[] = [];
  const lineBreaks: number[] = [];
  let totalBeats = 0;

  for (const line of lines) {
    if (line.length === 0 || line.startsWith('#')) continue;

    const firstChar = line[0];

    // End of song marker
    if (firstChar === 'E') break;

    // Line break marker
    if (firstChar === '-') {
      const parts = line.slice(1).trim().split(/\s+/);
      const beat = parseInt(parts[0]) || 0;
      lineBreaks.push(beat);
      continue;
    }

    // Note types: :, *, F, R
    if ([':','*', 'F', 'R'].includes(firstChar)) {
      const note = parseNoteLine(line);
      if (note) {
        notes.push(note);
        const noteEnd = note.startBeat + note.duration;
        if (noteEnd > totalBeats) {
          totalBeats = noteEnd;
        }
      }
    }
  }

  return { notes, lineBreaks, totalBeats };
}

/**
 * Parse a single note line
 * Format: TYPE STARTBEAT DURATION PITCH LYRIC
 * Example: : 0 5 60 Hel
 */
function parseNoteLine(line: string): UltrastarNote | null {
  const match = line.match(/^([:*FR])\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)(\s*)(.*)$/);
  if (!match) return null;

  const [, typeRaw, startRaw, durationRaw, pitchRaw, lyricSeparator, lyricText] = match;
  const type = typeRaw as UltrastarNoteType;
  const startBeat = parseInt(startRaw);
  const duration = parseInt(durationRaw);
  const pitch = parseInt(pitchRaw);
  const lyric =
    lyricText.length > 0
      ? `${lyricSeparator.slice(1)}${lyricText}`
      : '';

  if (isNaN(startBeat) || isNaN(duration) || isNaN(pitch)) {
    return null;
  }

  return {
    type,
    startBeat,
    duration,
    pitch,
    lyric,
  };
}

/**
 * Extract YouTube video ID from URL or direct ID
 */
export function extractYouTubeId(urlOrId: string): string | null {
  if (!urlOrId) return null;

  const trimmed = urlOrId.trim();

  for (const pattern of YOUTUBE_URL_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Convert Ultrastar song to highway target notes
 *
 * GAP is added to note timing so the highway shows blank scrolling
 * for the lead-in silence before the first note appears.
 *
 * @param song - Parsed Ultrastar song
 * @param baseMidi - Base MIDI note for relative pitch format (default: 60)
 * @param pitchFormat - Pitch format: 'absolute' (MIDI directly), 'relative' (offset from baseMidi), or 'auto' (detect)
 */
export function convertToTargetNotes(
  song: UltrastarSong,
  baseMidi: number = ULTRASTAR_BASE_MIDI,
  pitchFormat: UltrastarPitchFormat = 'auto'
): TargetNote[] {
  const { metadata, notes, lineBreaks } = song;
  const { bpm, gap } = metadata;

  // GAP is in milliseconds - the lead-in silence before first note
  const gapMs = gap ?? 0;

  // Determine actual pitch format
  const format = pitchFormat === 'auto' ? detectPitchFormat(notes) : pitchFormat;

  // Normalize BPM to musical range (60-180)
  const { effectiveBpm, beatDivisor } = normalizeBpm(bpm);

  // Calculate milliseconds per beat using normalized BPM
  const msPerBeat = (60 / effectiveBpm) * 1000 / 4;

  // Group notes by phrase (between line breaks)
  let phraseIndex = 0;
  const sortedBreaks = [...lineBreaks].sort((a, b) => a - b);

  return notes
    .filter((note) => note.type !== 'F') // Skip freestyle notes (no pitch judgment)
    .map((note) => {
      // Apply beatDivisor to convert file beats to actual musical beats
      const effectiveStartBeat = note.startBeat / beatDivisor;
      const effectiveDuration = note.duration / beatDivisor;

      // Calculate timing: beat time + GAP offset
      const startTimeMs = effectiveStartBeat * msPerBeat + gapMs;
      const durationMs = effectiveDuration * msPerBeat;

      // Convert pitch to MIDI based on detected format
      const midi = format === 'absolute' ? note.pitch : baseMidi + note.pitch;

      // Determine phrase index
      while (
        phraseIndex < sortedBreaks.length &&
        note.startBeat >= sortedBreaks[phraseIndex]
      ) {
        phraseIndex++;
      }

      // Build target note
      const targetNote: TargetNote & {
        phraseIndex?: number;
        isGolden?: boolean;
        isRap?: boolean;
      } = {
        midi,
        startTimeMs,
        durationMs,
        lyric: note.lyric.trim() || undefined,
      };

      // Add optional metadata
      if (note.type === '*') {
        targetNote.isGolden = true;
      }
      if (note.type === 'R') {
        targetNote.isRap = true;
      }

      return targetNote;
    });
}

/**
 * Get sync configuration from Ultrastar metadata
 */
export function getSyncConfig(metadata: UltrastarMetadata): YouTubeSyncConfig {
  return {
    gapMs: metadata.gap || 0,
    videoGapSec: metadata.videoGap || 0,
    manualOffsetSec: 0,
  };
}

/**
 * Calculate total duration of song in milliseconds
 * Includes GAP lead-in time so duration starts from time 0
 */
export function calculateSongDuration(song: UltrastarSong): number {
  const { metadata, totalBeats } = song;
  const { bpm, gap } = metadata;

  // GAP is in milliseconds - the lead-in silence before first note
  const gapMs = gap ?? 0;

  // Normalize BPM to musical range (60-180)
  const { effectiveBpm, beatDivisor } = normalizeBpm(bpm);

  // Calculate milliseconds per beat using normalized BPM
  const msPerBeat = (60 / effectiveBpm) * 1000 / 4;

  // Apply beatDivisor to get effective musical beats
  const effectiveTotalBeats = totalBeats / beatDivisor;

  // Total duration = GAP + beat duration + buffer
  return gapMs + effectiveTotalBeats * msPerBeat + 2000;
}

/**
 * Detect pitch range of song (for auto-adjusting viewport)
 *
 * @param song - Parsed Ultrastar song
 * @param baseMidi - Base MIDI note for relative pitch format (default: 60)
 * @param pitchFormat - Pitch format: 'absolute', 'relative', or 'auto' (detect)
 */
export function detectPitchRange(
  song: UltrastarSong,
  baseMidi: number = ULTRASTAR_BASE_MIDI,
  pitchFormat: UltrastarPitchFormat = 'auto'
): { minMidi: number; maxMidi: number } {
  // Determine actual pitch format
  const format = pitchFormat === 'auto' ? detectPitchFormat(song.notes) : pitchFormat;

  const midiNotes = song.notes
    .filter((note) => note.type !== 'F' && note.type !== '-')
    .map((note) => (format === 'absolute' ? note.pitch : baseMidi + note.pitch));

  if (midiNotes.length === 0) {
    return { minMidi: 48, maxMidi: 72 };
  }

  const minMidi = Math.min(...midiNotes);
  const maxMidi = Math.max(...midiNotes);

  // Add some padding
  return {
    minMidi: Math.max(24, minMidi - 3),
    maxMidi: Math.min(108, maxMidi + 3),
  };
}

/**
 * Group notes by phrase for results breakdown
 */
export function groupNotesByPhrase(
  notes: UltrastarNote[],
  lineBreaks: number[]
): UltrastarNote[][] {
  const phrases: UltrastarNote[][] = [];
  const sortedBreaks = [0, ...lineBreaks].sort((a, b) => a - b);

  for (let i = 0; i < sortedBreaks.length; i++) {
    const start = sortedBreaks[i];
    const end = sortedBreaks[i + 1] ?? Infinity;

    const phraseNotes = notes.filter(
      (note) => note.startBeat >= start && note.startBeat < end
    );

    if (phraseNotes.length > 0) {
      phrases.push(phraseNotes);
    }
  }

  return phrases;
}

/**
 * Get lyric preview for a phrase (first few syllables)
 */
export function getPhraseLyricPreview(notes: UltrastarNote[], maxLength = 30): string {
  const lyrics = notes
    .map((n) => n.lyric)
    .join('')
    .trim();

  if (lyrics.length <= maxLength) {
    return lyrics;
  }

  return lyrics.slice(0, maxLength - 3) + '...';
}

/**
 * Detect whether the Ultrastar file uses absolute MIDI pitch values
 * or relative offsets from C4 (MIDI 60).
 *
 * Standard Ultrastar format uses relative pitches where 0 = C4 (MIDI 60).
 * However, some community files use absolute MIDI note numbers directly.
 *
 * Detection heuristics:
 * - If pitch values are in typical singing range (30-90) and all positive → absolute
 * - If pitch values include negatives or cluster around 0 → relative
 *
 * @returns 'relative' or 'absolute' (never 'auto')
 */
export function detectPitchFormat(notes: UltrastarNote[]): 'relative' | 'absolute' {
  // Filter to actual pitch notes (not freestyle or line breaks)
  const pitchValues = notes
    .filter((n) => n.type !== 'F' && n.type !== '-')
    .map((n) => n.pitch);

  if (pitchValues.length === 0) return 'relative';

  const minPitch = Math.min(...pitchValues);
  const maxPitch = Math.max(...pitchValues);

  // If any pitch is negative, it must be relative format
  if (minPitch < 0) {
    return 'relative';
  }

  // Check if values look like absolute MIDI (typical singing range 30-90)
  // rather than relative offsets from C4 (which would give range like -24 to +24)
  const looksAbsolute = minPitch >= 30 && maxPitch <= 96;

  // Check if values look like they could be relative
  // Relative values typically range from about -36 (C2) to +36 (C7) from C4
  const looksRelative = minPitch >= -36 && maxPitch <= 36;

  // If values are all in the 30-90 range (typical singing), assume absolute
  // This is a common case for community-created files
  if (looksAbsolute && minPitch > 24) {
    return 'absolute';
  }

  // If values are small and centered around 0, assume relative
  if (looksRelative && maxPitch < 36) {
    return 'relative';
  }

  // Default to relative (standard Ultrastar format)
  return 'relative';
}

/**
 * Build lyric phrases from parsed Ultrastar song data.
 * Phrases are delimited by line break markers (`-`) in the file.
 *
 * @param song - Parsed Ultrastar song
 * @param baseMidi - Base MIDI note for relative pitch format (default: 60)
 * @param pitchFormat - Pitch format to use ('absolute', 'relative', or 'auto')
 * @returns Array of lyric phrases with timing and syllable data
 */
export function buildLyricPhrases(
  song: UltrastarSong,
  baseMidi: number = ULTRASTAR_BASE_MIDI,
  pitchFormat: UltrastarPitchFormat = 'auto'
): LyricPhrase[] {
  const { metadata, notes, lineBreaks } = song;
  const { bpm, gap } = metadata;

  // GAP is in milliseconds - the lead-in silence before first note
  const gapMs = gap ?? 0;

  // Determine actual pitch format
  const format = pitchFormat === 'auto' ? detectPitchFormat(notes) : pitchFormat;

  // Normalize BPM to musical range (60-180)
  const { effectiveBpm, beatDivisor } = normalizeBpm(bpm);

  // Calculate milliseconds per beat using normalized BPM
  const msPerBeat = (60 / effectiveBpm) * 1000 / 4;

  // Sort line breaks and add 0 at the start to capture first phrase
  const sortedBreaks = [0, ...lineBreaks].sort((a, b) => a - b);
  const phrases: LyricPhrase[] = [];

  for (let i = 0; i < sortedBreaks.length; i++) {
    const startBeat = sortedBreaks[i];
    const endBeat = sortedBreaks[i + 1] ?? Infinity;

    // Get all notes in this phrase (excluding freestyle notes)
    const phraseNotes = notes.filter(
      (n) => n.startBeat >= startBeat && n.startBeat < endBeat && n.type !== 'F'
    );

    if (phraseNotes.length === 0) continue;

    // Build syllables for this phrase with normalized timing
    const syllables: LyricSyllable[] = phraseNotes.map((note) => {
      // Apply beatDivisor to convert file beats to actual musical beats
      const effectiveStartBeat = note.startBeat / beatDivisor;
      const effectiveEndBeat = (note.startBeat + note.duration) / beatDivisor;

      return {
        text: note.lyric,
        startTimeMs: effectiveStartBeat * msPerBeat + gapMs,
        endTimeMs: effectiveEndBeat * msPerBeat + gapMs,
        midi: format === 'absolute' ? note.pitch : baseMidi + note.pitch,
        isGolden: note.type === '*',
        isRap: note.type === 'R',
      };
    });

    // Calculate phrase timing
    const phraseStartTimeMs = syllables[0].startTimeMs;
    const phraseEndTimeMs = syllables[syllables.length - 1].endTimeMs;

    // Build full phrase text by joining syllables
    const fullText = syllables.map((s) => s.text).join('').trim();

    phrases.push({
      index: phrases.length,
      startBeat,
      endBeat,
      startTimeMs: phraseStartTimeMs,
      endTimeMs: phraseEndTimeMs,
      syllables,
      fullText,
    });
  }

  return phrases;
}
