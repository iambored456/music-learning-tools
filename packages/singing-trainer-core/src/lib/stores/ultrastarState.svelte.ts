/**
 * Ultrastar State Store - Svelte 5 Runes
 *
 * Manages the state for loaded Ultrastar karaoke files,
 * including parsed song data, sync configuration, and playback state.
 */

import type {
  UltrastarSong,
  YouTubeSyncConfig,
  UltrastarPitchFormat,
  LyricPhrase,
} from '../types/ultrastar.js';
import { DEFAULT_SYNC_CONFIG, ULTRASTAR_BASE_MIDI } from '../types/ultrastar.js';
import {
  parseUltrastarFile,
  extractYouTubeId,
  convertToTargetNotes,
  getSyncConfig,
  calculateSongDuration,
  detectPitchRange,
  detectPitchFormat,
  buildLyricPhrases,
  normalizeBpm,
  type NormalizedBpm,
} from '../services/ultrastarParser.js';
import type { TargetNote } from './highwayState.svelte.js';

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
  detectedRange: { minMidi: number; maxMidi: number };
  error: string | null;
  /** Detected pitch format from file analysis */
  detectedPitchFormat: 'relative' | 'absolute';
  /** User override for pitch format (null = use auto-detected) */
  pitchFormatOverride: 'relative' | 'absolute' | null;
  /** Lyric phrases for karaoke display */
  lyricPhrases: LyricPhrase[];
  /** Current phrase index being sung (-1 if none) */
  currentPhraseIndex: number;
  /** BPM normalization info (raw BPM, effective BPM, beat divisor) */
  bpmInfo: NormalizedBpm | null;
}

const DEFAULT_STATE: UltrastarState = {
  isActive: false,
  isLoading: false,
  isPlaying: false,
  song: null,
  targetNotes: [],
  youtubeId: null,
  syncConfig: { ...DEFAULT_SYNC_CONFIG },
  baseMidi: ULTRASTAR_BASE_MIDI,
  totalDurationMs: 0,
  detectedRange: { minMidi: 48, maxMidi: 72 },
  error: null,
  detectedPitchFormat: 'relative',
  pitchFormatOverride: null,
  lyricPhrases: [],
  currentPhraseIndex: -1,
  bpmInfo: null,
};

function createUltrastarState() {
  let state = $state<UltrastarState>({ ...DEFAULT_STATE });

  // Completion callback
  let onCompleteCallback: (() => void) | null = null;

  return {
    get state() {
      return state;
    },

    /** Load and parse an Ultrastar .txt file */
    async loadFile(file: File): Promise<boolean> {
      state.isLoading = true;
      state.error = null;

      try {
        const content = await file.text();
        const result = parseUltrastarFile(content);

        if (!result.success) {
          state.error = result.error;
          state.isLoading = false;
          return false;
        }

        const song = result.song;

        // Extract YouTube ID if video is specified
        const youtubeId = song.metadata.video
          ? extractYouTubeId(song.metadata.video)
          : null;

        // Get sync configuration from metadata
        const syncConfig = getSyncConfig(song.metadata);

        // Normalize BPM for display/debugging
        const bpmInfo = normalizeBpm(song.metadata.bpm);

        // Detect pitch format from file content
        const detectedFormat = detectPitchFormat(song.notes);
        state.detectedPitchFormat = detectedFormat;
        state.pitchFormatOverride = null; // Reset override on new file

        // Get effective pitch format (override or detected)
        const effectiveFormat = state.pitchFormatOverride ?? detectedFormat;

        // Convert notes to target format using detected/override format
        const targetNotes = convertToTargetNotes(song, state.baseMidi, effectiveFormat);

        // Build lyric phrases for karaoke display
        const lyricPhrases = buildLyricPhrases(song, state.baseMidi, effectiveFormat);

        // Calculate duration and detect pitch range
        const totalDurationMs = calculateSongDuration(song);
        const detectedRange = detectPitchRange(song, state.baseMidi, effectiveFormat);

        // Update state
        state.song = song;
        state.youtubeId = youtubeId;
        state.syncConfig = syncConfig;
        state.targetNotes = targetNotes;
        state.lyricPhrases = lyricPhrases;
        state.currentPhraseIndex = -1;
        state.totalDurationMs = totalDurationMs;
        state.detectedRange = detectedRange;
        state.bpmInfo = bpmInfo;
        state.isActive = true;
        state.isLoading = false;

        return true;
      } catch (error) {
        state.error = error instanceof Error ? error.message : 'Failed to load file';
        state.isLoading = false;
        return false;
      }
    },

    /** Get the computed YouTube offset in seconds */
    get youtubeOffset(): number {
      const { gapMs, videoGapSec, manualOffsetSec } = state.syncConfig;
      return gapMs / 1000 + videoGapSec + manualOffsetSec;
    },

    /** Adjust the manual sync offset */
    adjustOffset(deltaSec: number) {
      state.syncConfig = {
        ...state.syncConfig,
        manualOffsetSec: state.syncConfig.manualOffsetSec + deltaSec,
      };
    },

    /** Set the manual sync offset directly */
    setManualOffset(offsetSec: number) {
      state.syncConfig = {
        ...state.syncConfig,
        manualOffsetSec: offsetSec,
      };
    },

    /** Reset manual offset to zero */
    resetOffset() {
      state.syncConfig = {
        ...state.syncConfig,
        manualOffsetSec: 0,
      };
    },

    /** Set the base MIDI note for pitch conversion */
    setBaseMidi(midi: number) {
      state.baseMidi = midi;

      // Reconvert notes if song is loaded
      if (state.song) {
        const effectiveFormat = state.pitchFormatOverride ?? state.detectedPitchFormat;
        state.targetNotes = convertToTargetNotes(state.song, midi, effectiveFormat);
        state.lyricPhrases = buildLyricPhrases(state.song, midi, effectiveFormat);
        state.detectedRange = detectPitchRange(state.song, midi, effectiveFormat);
      }
    },

    /** Set pitch format override (null = use auto-detected) */
    setPitchFormat(format: 'relative' | 'absolute' | null) {
      state.pitchFormatOverride = format;

      // Reconvert notes with new format if song is loaded
      if (state.song) {
        const effectiveFormat = format ?? state.detectedPitchFormat;
        state.targetNotes = convertToTargetNotes(state.song, state.baseMidi, effectiveFormat);
        state.lyricPhrases = buildLyricPhrases(state.song, state.baseMidi, effectiveFormat);
        state.detectedRange = detectPitchRange(state.song, state.baseMidi, effectiveFormat);
      }
    },

    /** Get the effective pitch format (override or detected) */
    get effectivePitchFormat(): 'relative' | 'absolute' {
      return state.pitchFormatOverride ?? state.detectedPitchFormat;
    },

    /** Update current phrase index based on playback time */
    updateCurrentPhrase(currentTimeMs: number) {
      // Find the phrase that contains the current time
      const newIndex = state.lyricPhrases.findIndex(
        (p) => currentTimeMs >= p.startTimeMs && currentTimeMs < p.endTimeMs
      );

      // Only update if changed (includes -1 when no phrase matches)
      if (newIndex !== state.currentPhraseIndex) {
        state.currentPhraseIndex = newIndex;
      }
    },

    /** Get the current phrase being sung */
    get currentPhrase(): LyricPhrase | null {
      if (state.currentPhraseIndex < 0 || state.currentPhraseIndex >= state.lyricPhrases.length) {
        return null;
      }
      return state.lyricPhrases[state.currentPhraseIndex];
    },

    /** Get the next phrase (for preview) */
    get nextPhrase(): LyricPhrase | null {
      const nextIndex = state.currentPhraseIndex + 1;
      if (nextIndex < 0 || nextIndex >= state.lyricPhrases.length) {
        return null;
      }
      return state.lyricPhrases[nextIndex];
    },

    /** Set playing state */
    setPlaying(playing: boolean) {
      state.isPlaying = playing;
    },

    /** Register completion callback */
    onComplete(callback: () => void) {
      onCompleteCallback = callback;
    },

    /** Trigger completion (called when song ends) */
    triggerComplete() {
      state.isPlaying = false;
      if (onCompleteCallback) {
        onCompleteCallback();
      }
    },

    /** Check if current time has exceeded song duration */
    checkCompletion(currentTimeMs: number): boolean {
      if (!state.isPlaying || !state.isActive) return false;

      // Add a small buffer before triggering completion
      if (currentTimeMs >= state.totalDurationMs - 500) {
        this.triggerComplete();
        return true;
      }

      return false;
    },

    /** Get song title */
    get title(): string {
      return state.song?.metadata.title || '';
    },

    /** Get song artist */
    get artist(): string {
      return state.song?.metadata.artist || '';
    },

    /** Check if YouTube video is available */
    get hasVideo(): boolean {
      return state.youtubeId !== null;
    },

    /** Manually set or clear the YouTube video ID */
    setYoutubeId(id: string | null) {
      state.youtubeId = id;
    },

    /** Reset state and clear loaded song */
    reset() {
      state = { ...DEFAULT_STATE };
      onCompleteCallback = null;
    },

    /** Unload song but preserve settings */
    unload() {
      state.isActive = false;
      state.isPlaying = false;
      state.song = null;
      state.targetNotes = [];
      state.lyricPhrases = [];
      state.currentPhraseIndex = -1;
      state.youtubeId = null;
      state.totalDurationMs = 0;
      state.error = null;
      state.detectedPitchFormat = 'relative';
      state.pitchFormatOverride = null;
      state.bpmInfo = null;
    },
  };
}

export const ultrastarState = createUltrastarState();
