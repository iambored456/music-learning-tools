/**
 * Ultrastar State Store - Svelte 5 Runes
 *
 * Manages the state for loaded Ultrastar karaoke files,
 * including parsed song data, sync configuration, and playback state.
 */

import type {
  UltrastarSong,
  YouTubeSyncConfig,
} from '../types/ultrastar.js';
import { DEFAULT_SYNC_CONFIG, ULTRASTAR_BASE_MIDI } from '../types/ultrastar.js';
import {
  parseUltrastarFile,
  extractYouTubeId,
  convertToTargetNotes,
  getSyncConfig,
  calculateSongDuration,
  detectPitchRange,
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

        // Convert notes to target format
        const targetNotes = convertToTargetNotes(song, state.baseMidi);

        // Calculate duration and detect pitch range
        const totalDurationMs = calculateSongDuration(song);
        const detectedRange = detectPitchRange(song, state.baseMidi);

        // Update state
        state.song = song;
        state.youtubeId = youtubeId;
        state.syncConfig = syncConfig;
        state.targetNotes = targetNotes;
        state.totalDurationMs = totalDurationMs;
        state.detectedRange = detectedRange;
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
        state.targetNotes = convertToTargetNotes(state.song, midi);
        state.detectedRange = detectPitchRange(state.song, midi);
      }
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
      state.youtubeId = null;
      state.totalDurationMs = 0;
      state.error = null;
    },
  };
}

export const ultrastarState = createUltrastarState();
