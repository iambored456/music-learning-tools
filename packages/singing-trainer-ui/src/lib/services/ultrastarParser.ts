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
} from '../types/ultrastar.js';
import { YOUTUBE_URL_PATTERNS, ULTRASTAR_BASE_MIDI } from '../types/ultrastar.js';
import type { TargetNote } from '../stores/highwayState.svelte.js';

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
  const type = line[0] as UltrastarNoteType;
  const rest = line.slice(1).trim();

  // Split by whitespace, but keep lyric text together
  const parts = rest.split(/\s+/);
  if (parts.length < 3) return null;

  const startBeat = parseInt(parts[0]);
  const duration = parseInt(parts[1]);
  const pitch = parseInt(parts[2]);
  const lyric = parts.slice(3).join(' ') || '';

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
 * Note: GAP is NOT added to note timing here. GAP represents the offset
 * from audio start to first note, and is handled separately via YouTube sync.
 * Note timing is relative to transport time 0 = first beat of song.
 */
export function convertToTargetNotes(
  song: UltrastarSong,
  baseMidi: number = ULTRASTAR_BASE_MIDI
): TargetNote[] {
  const { metadata, notes, lineBreaks } = song;
  const { bpm } = metadata;

  // Calculate milliseconds per beat
  // Ultrastar BPM is actually quarter-beat resolution (beats are 1/4 notes)
  // So we multiply by 4 to get real ms per beat unit
  const msPerBeat = (60 / bpm) * 1000 * 4;

  // Group notes by phrase (between line breaks)
  let phraseIndex = 0;
  const sortedBreaks = [...lineBreaks].sort((a, b) => a - b);

  // Find the first note's beat to use as reference (transport 0 = first note)
  const firstNoteBeat = notes.length > 0 ? Math.min(...notes.map(n => n.startBeat)) : 0;

  return notes
    .filter((note) => note.type !== 'F') // Skip freestyle notes (no pitch judgment)
    .map((note) => {
      // Calculate timing relative to first note (so first note starts at ~0)
      const startTimeMs = (note.startBeat - firstNoteBeat) * msPerBeat;
      const durationMs = note.duration * msPerBeat;

      // Convert relative pitch to MIDI
      const midi = baseMidi + note.pitch;

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
 * Duration is relative to transport time 0 = first note
 */
export function calculateSongDuration(song: UltrastarSong): number {
  const { metadata, notes, totalBeats } = song;
  const { bpm } = metadata;

  // Ultrastar BPM is quarter-beat resolution
  const msPerBeat = (60 / bpm) * 1000 * 4;

  // Find first note beat to calculate relative duration
  const firstNoteBeat = notes.length > 0 ? Math.min(...notes.map(n => n.startBeat)) : 0;
  const relativeTotalBeats = totalBeats - firstNoteBeat;

  // Add some buffer after the last note
  return relativeTotalBeats * msPerBeat + 2000;
}

/**
 * Detect pitch range of song (for auto-adjusting viewport)
 */
export function detectPitchRange(
  song: UltrastarSong,
  baseMidi: number = ULTRASTAR_BASE_MIDI
): { minMidi: number; maxMidi: number } {
  const midiNotes = song.notes
    .filter((note) => note.type !== 'F' && note.type !== '-')
    .map((note) => baseMidi + note.pitch);

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
