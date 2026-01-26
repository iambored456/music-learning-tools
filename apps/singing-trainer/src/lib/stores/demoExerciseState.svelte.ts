/**
 * Demo Exercise State Store - Svelte 5 Runes
 *
 * Manages the pitch-matching demo exercise with reference tones and graded user input.
 */

import type { NotePerformance } from '@mlt/student-notation-engine';
import type { TargetNote } from './highwayState.svelte.js';

export interface ExerciseConfig {
  numLoops: number;
  minMidi: number;
  maxMidi: number;
  tempo: number;
  referenceVolume: number; // dB, -60 to 0
}

export type ExercisePhase = 'reference' | 'rest1' | 'input' | 'rest2';

export interface ExerciseState {
  isActive: boolean;
  isPlaying: boolean;
  config: ExerciseConfig;
  currentLoop: number;
  currentPhase: ExercisePhase;
  currentPitch: number | null;
  generatedNotes: TargetNote[];
  results: ExerciseResult[];
}

export interface ExerciseResult {
  loopIndex: number;
  targetPitch: number;
  performance: NotePerformance | null;
  accuracy: number; // 0-100%
}

const DEFAULT_CONFIG: ExerciseConfig = {
  numLoops: 5,
  minMidi: 48, // Will be overridden with Y-axis range
  maxMidi: 72,
  tempo: 108,
  referenceVolume: -12, // -12 dB default
};

const DEFAULT_STATE: ExerciseState = {
  isActive: false,
  isPlaying: false,
  config: { ...DEFAULT_CONFIG },
  currentLoop: 0,
  currentPhase: 'reference',
  currentPitch: null,
  generatedNotes: [],
  results: [],
};

/**
 * Generate a random MIDI pitch within range
 */
function randomPitch(minMidi: number, maxMidi: number): number {
  return Math.floor(Math.random() * (maxMidi - minMidi + 1)) + minMidi;
}

/**
 * Calculate microbeat duration in milliseconds
 */
function getMicrobeatDurationMs(tempo: number): number {
  // Microbeat = eighth note = (60 / tempo) / 2 seconds
  return (60 / tempo) * 1000 / 2;
}

function createDemoExerciseState() {
  let state = $state<ExerciseState>({ ...DEFAULT_STATE });

  /**
   * Generate exercise notes with emojis
   */
  function generateExerciseNotes(config: ExerciseConfig): TargetNote[] {
    const notes: TargetNote[] = [];
    const microbeatDurationMs = getMicrobeatDurationMs(config.tempo);

    // Add 2-second lead-in so notes don't start immediately
    const leadInMs = 2000;

    for (let loop = 0; loop < config.numLoops; loop++) {
      const pitch = randomPitch(config.minMidi, config.maxMidi);
      const loopStartTime = leadInMs + (loop * 32 * microbeatDurationMs);

      // Reference note (0-8 microbeats) with 👂 emoji
      notes.push({
        midi: pitch,
        startTimeMs: loopStartTime,
        durationMs: 8 * microbeatDurationMs,
        lyric: '👂',
      });

      // Rest 1 (8-16 microbeats) - no note

      // User input note (16-24 microbeats) with 🎤 emoji
      notes.push({
        midi: pitch,
        startTimeMs: loopStartTime + (16 * microbeatDurationMs),
        durationMs: 8 * microbeatDurationMs,
        lyric: '🎤',
      });

      // Rest 2 (24-32 microbeats) - no note
    }

    return notes;
  }

  /**
   * Determine which phase we're in based on current time
   */
  function getPhaseFromTime(currentTimeMs: number, tempo: number): { loop: number; phase: ExercisePhase } {
    const microbeatDurationMs = getMicrobeatDurationMs(tempo);
    const loopDurationMs = 32 * microbeatDurationMs;
    const leadInMs = 2000;

    // Subtract lead-in time
    const adjustedTimeMs = currentTimeMs - leadInMs;

    // During lead-in, show as rest
    if (adjustedTimeMs < 0) {
      return { loop: 0, phase: 'rest2' };
    }

    const currentLoop = Math.floor(adjustedTimeMs / loopDurationMs);
    const timeInLoop = adjustedTimeMs % loopDurationMs;
    const microbeatInLoop = Math.floor(timeInLoop / microbeatDurationMs);

    let phase: ExercisePhase;
    if (microbeatInLoop < 8) {
      phase = 'reference';
    } else if (microbeatInLoop < 16) {
      phase = 'rest1';
    } else if (microbeatInLoop < 24) {
      phase = 'input';
    } else {
      phase = 'rest2';
    }

    return { loop: currentLoop, phase };
  }

  return {
    get state() {
      return state;
    },

    /**
     * Update exercise configuration
     */
    configure(newConfig: Partial<ExerciseConfig>) {
      state.config = { ...state.config, ...newConfig };
    },

    /**
     * Set pitch range from current Y-axis range
     */
    setPitchRange(minMidi: number, maxMidi: number) {
      state.config.minMidi = minMidi;
      state.config.maxMidi = maxMidi;
    },

    /**
     * Start the demo exercise
     */
    start() {
      // Generate notes
      const notes = generateExerciseNotes(state.config);

      state.generatedNotes = notes;
      state.isActive = true;
      state.isPlaying = false; // Will be set to true when playback starts
      state.currentLoop = 0;
      state.currentPhase = 'reference';
      state.currentPitch = notes.length > 0 ? notes[0].midi : null;
      state.results = [];
    },

    /**
     * Stop the exercise
     */
    stop() {
      state.isActive = false;
      state.isPlaying = false;
      state.currentLoop = 0;
      state.currentPhase = 'reference';
      state.currentPitch = null;
    },

    /**
     * Mark exercise as playing (called when highway starts)
     */
    setPlaying(playing: boolean) {
      state.isPlaying = playing;
    },

    /**
     * Update current phase based on time
     */
    updatePhase(currentTimeMs: number) {
      const { loop, phase } = getPhaseFromTime(currentTimeMs, state.config.tempo);
      state.currentLoop = loop;
      state.currentPhase = phase;

      // Update current pitch
      const noteIndex = loop * 2; // 2 notes per loop (reference + input)
      if (noteIndex < state.generatedNotes.length) {
        state.currentPitch = state.generatedNotes[noteIndex].midi;
      }
    },

    /**
     * Add a performance result for a completed loop
     */
    addResult(result: ExerciseResult) {
      state.results.push(result);
    },

    /**
     * Check if we already have a result for a specific loop
     */
    hasResultForLoop(loopIndex: number): boolean {
      return state.results.some(r => r.loopIndex === loopIndex);
    },

    /**
     * Get all results
     */
    getResults(): ExerciseResult[] {
      return state.results;
    },

    /**
     * Get current progress
     */
    getCurrentProgress(): { current: number; total: number } {
      return {
        current: state.currentLoop + 1,
        total: state.config.numLoops,
      };
    },

    /**
     * Get generated notes for highway
     */
    getGeneratedNotes(): TargetNote[] {
      return state.generatedNotes;
    },

    /**
     * Calculate average accuracy from results
     */
    getAverageAccuracy(): number {
      if (state.results.length === 0) return 0;
      const total = state.results.reduce((sum, r) => sum + r.accuracy, 0);
      return total / state.results.length;
    },

    /**
     * Count hits
     */
    getHitCount(): number {
      return state.results.filter(r => r.performance?.hitStatus === 'hit').length;
    },

    /**
     * Check if all loops have been completed
     */
    isComplete(): boolean {
      return state.results.length >= state.config.numLoops && state.config.numLoops > 0;
    },

    /**
     * Get total exercise duration in milliseconds
     */
    getTotalDurationMs(): number {
      const microbeatDurationMs = getMicrobeatDurationMs(state.config.tempo);
      const leadInMs = 2000;
      const loopDurationMs = 32 * microbeatDurationMs;
      return leadInMs + (state.config.numLoops * loopDurationMs);
    },

    /**
     * Reset to default state
     */
    reset() {
      state = { ...DEFAULT_STATE, config: { ...state.config } };
    },
  };
}

export const demoExerciseState = createDemoExerciseState();
