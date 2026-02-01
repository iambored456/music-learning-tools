/**
 * Exercise State Store - Svelte 5 Runes
 *
 * Manages the pitch-matching exercise with reference tones and graded user input.
 * Supports integration with lesson templates and speaking pitch calibration.
 */

import type { NotePerformance } from '@mlt/student-notation-engine';
import type { TargetNote } from './highwayState.svelte.js';
import {
  type SpeakingPitchUsage,
  type ExercisePattern,
  type AnyLessonTemplate,
  getTemplate,
  STANDARD_4_PHASE_PATTERN,
} from '@mlt/lesson-templates';
import { preferencesStore } from './preferencesStore.svelte.js';

export interface ExerciseConfig {
  numLoops: number;
  minMidi: number;
  maxMidi: number;
  tempo: number;
  referenceVolume: number; // dB, -60 to 0
  speakingPitchUsage: SpeakingPitchUsage;
  leadInMs: number;
  templateId?: string;
  minAmplitudeDb?: number;
  minVoicedMs?: number;
  minCoveragePct?: number;
  bandLowMinOffsetSemis?: number;
  bandLowMaxOffsetSemis?: number;
  bandHighMinOffsetSemis?: number;
  bandHighMaxOffsetSemis?: number;
  holdBandSemitones?: number;
  minSlideSemitones?: number;
  showImmediateFeedback?: boolean;
  showScore?: boolean;
}

export type ExercisePhase = 'reference' | 'rest' | 'input';

export interface ExerciseState {
  isActive: boolean;
  isPlaying: boolean;
  config: ExerciseConfig;
  currentLoop: number;
  currentInputIndex: number;
  currentPhase: ExercisePhase;
  currentPitch: number | null;
  generatedNotes: TargetNote[];
  results: ExerciseResult[];
  restartRequested: boolean;
  pattern: ExercisePattern;
}

export interface ExerciseResult {
  loopIndex: number;
  targetPitch: number | null;
  targetLabel?: string;
  performance: NotePerformance | null;
  accuracy: number; // 0-100%
}

const DEFAULT_CONFIG: ExerciseConfig = {
  numLoops: 5,
  minMidi: 48, // Will be overridden with Y-axis range
  maxMidi: 72,
  tempo: 108,
  referenceVolume: -12, // -12 dB default
  speakingPitchUsage: 'none',
  leadInMs: 2000,
  templateId: undefined,
  minAmplitudeDb: -60,
  minVoicedMs: 400,
  minCoveragePct: 60,
  bandLowMinOffsetSemis: -8,
  bandLowMaxOffsetSemis: -3,
  bandHighMinOffsetSemis: 3,
  bandHighMaxOffsetSemis: 8,
  holdBandSemitones: 1,
  minSlideSemitones: 3,
  showImmediateFeedback: true,
  showScore: true,
};

const DEFAULT_STATE: ExerciseState = {
  isActive: false,
  isPlaying: false,
  config: { ...DEFAULT_CONFIG },
  currentLoop: 0,
  currentInputIndex: 0,
  currentPhase: 'reference',
  currentPitch: null,
  generatedNotes: [],
  results: [],
  restartRequested: false,
  pattern: STANDARD_4_PHASE_PATTERN,
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

/**
 * Apply speaking pitch mapping to get effective MIDI range
 */
function applyPitchMapping(config: ExerciseConfig): { minMidi: number; maxMidi: number } {
  const speakingPitch = preferencesStore.speakingPitchMidi;
  const resolvedMinMidi = Number.isFinite(config.minMidi) ? config.minMidi : 48;
  const resolvedMaxMidi = Number.isFinite(config.maxMidi) ? config.maxMidi : 72;
  const configRange = resolvedMaxMidi - resolvedMinMidi;

  // If no speaking pitch or usage is 'none', use config values
  if (speakingPitch === null || config.speakingPitchUsage === 'none') {
    return { minMidi: resolvedMinMidi, maxMidi: resolvedMaxMidi };
  }

  switch (config.speakingPitchUsage) {
    case 'asTonic': {
      // Center range around speaking pitch
      const halfRange = Math.floor(configRange / 2);
      return {
        minMidi: speakingPitch - Math.floor(halfRange * 0.4), // 40% below
        maxMidi: speakingPitch + Math.ceil(halfRange * 1.6), // 60% above
      };
    }
    case 'asFloorNote': {
      // Speaking pitch is the lowest note
      return {
        minMidi: speakingPitch,
        maxMidi: speakingPitch + configRange,
      };
    }
    case 'custom': {
      // For now, treat same as asFloorNote (could add offset param)
      return {
        minMidi: speakingPitch,
        maxMidi: speakingPitch + configRange,
      };
    }
    default:
      return { minMidi: resolvedMinMidi, maxMidi: resolvedMaxMidi };
  }
}

function createExerciseState() {
  let state = $state<ExerciseState>({ ...DEFAULT_STATE });

  function getActiveTemplate(config: ExerciseConfig): AnyLessonTemplate | null {
    if (!config.templateId) return null;
    return getTemplate(config.templateId) ?? null;
  }

  function getActivePattern(config: ExerciseConfig): ExercisePattern {
    const template = getActiveTemplate(config);
    return template?.pattern ?? STANDARD_4_PHASE_PATTERN;
  }

  function getLeadInMs(config: ExerciseConfig): number {
    const pattern = getActivePattern(config);
    return Math.max(0, pattern.leadInMs ?? 0);
  }

  function getLoopDurationMicrobeats(pattern: ExercisePattern): number {
    return pattern.phases.reduce((sum, phase) => sum + phase.durationMicrobeats, 0);
  }

  function getAnchorPitch(config: ExerciseConfig, minMidi: number, maxMidi: number): number {
    const speakingPitch = preferencesStore.speakingPitchMidi;
    if (typeof speakingPitch === 'number' && Number.isFinite(speakingPitch)) {
      return speakingPitch;
    }
    return Math.round((minMidi + maxMidi) / 2);
  }

  function getLessonMode(templateId?: string):
    | 'fixedPitch'
    | 'windowAnyPitch'
    | 'windowBand'
    | 'slideWindow'
    | 'holdSteady' {
    switch (templateId) {
      case 'foundations-1-1-vocal-on-off':
        return 'windowAnyPitch';
      case 'foundations-1-2-high-low-contrast':
        return 'windowBand';
      case 'foundations-1-3-pitch-slide':
        return 'slideWindow';
      case 'foundations-1-4-hold-steady':
        return 'holdSteady';
      default:
        return 'fixedPitch';
    }
  }

  function getBandOffsets(config: ExerciseConfig): {
    lowMin: number;
    lowMax: number;
    highMin: number;
    highMax: number;
  } {
    return {
      lowMin: config.bandLowMinOffsetSemis ?? -8,
      lowMax: config.bandLowMaxOffsetSemis ?? -3,
      highMin: config.bandHighMinOffsetSemis ?? 3,
      highMax: config.bandHighMaxOffsetSemis ?? 8,
    };
  }

  /**
   * Generate exercise notes with emojis
   */
  function generateExerciseNotes(config: ExerciseConfig): TargetNote[] {
    const notes: TargetNote[] = [];
    const microbeatDurationMs = getMicrobeatDurationMs(config.tempo);
    const pattern = getActivePattern(config);
    const loopDurationMicrobeats = getLoopDurationMicrobeats(pattern);

    // Apply speaking pitch mapping
    const { minMidi, maxMidi } = applyPitchMapping(config);
    const anchorPitch = getAnchorPitch(config, minMidi, maxMidi);
    const lessonMode = getLessonMode(config.templateId);
    const bandOffsets = getBandOffsets(config);
    const holdBandSemitones = config.holdBandSemitones ?? 1;

    // Add lead-in so notes don't start immediately
    const leadInMs = getLeadInMs(config);
    const loopDurationMs = loopDurationMicrobeats * microbeatDurationMs;

    for (let loop = 0; loop < config.numLoops; loop++) {
      const pitch = randomPitch(minMidi, maxMidi);
      const loopStartTime = leadInMs + (loop * loopDurationMs);
      let cursorMs = loopStartTime;
      let bandIndex = 0;
      let slideIndex = 0;

      for (const phase of pattern.phases) {
        const durationMs = phase.durationMicrobeats * microbeatDurationMs;

        if (phase.type === 'rest') {
          cursorMs += durationMs;
          continue;
        }

        const role = phase.type === 'reference' ? 'reference' : 'input';
        const note: TargetNote = {
          startTimeMs: cursorMs,
          durationMs,
          role,
          lyric: phase.emoji,
          label: phase.emoji ? undefined : phase.label,
        };

        if (lessonMode === 'fixedPitch') {
          note.midi = pitch;
          note.targetKind = 'fixedPitch';
        } else if (lessonMode === 'windowAnyPitch') {
          if (role === 'reference') {
            note.midi = anchorPitch;
            note.targetKind = 'fixedPitch';
          } else {
            note.targetKind = 'windowAnyPitch';
          }
        } else if (lessonMode === 'windowBand') {
          const isLowBand = bandIndex % 2 === 0;
          const minOffset = isLowBand ? bandOffsets.lowMin : bandOffsets.highMin;
          const maxOffset = isLowBand ? bandOffsets.lowMax : bandOffsets.highMax;
          const bandMin = anchorPitch + Math.min(minOffset, maxOffset);
          const bandMax = anchorPitch + Math.max(minOffset, maxOffset);
          const bandCenter = (bandMin + bandMax) / 2;

          if (role === 'reference') {
            note.midi = bandCenter;
            note.targetKind = 'fixedPitch';
          } else {
            note.targetKind = 'windowBand';
            note.minMidi = bandMin;
            note.maxMidi = bandMax;
            note.label = isLowBand ? 'LOW' : 'HIGH';
            bandIndex += 1;
          }
        } else if (lessonMode === 'slideWindow') {
          if (role === 'reference') {
            note.midi = anchorPitch;
            note.targetKind = 'fixedPitch';
          } else {
            note.targetKind = 'slideWindow';
            note.slideDirection = slideIndex % 2 === 0 ? 'up' : 'down';
            note.label = slideIndex % 2 === 0 ? 'SLIDE UP' : 'SLIDE DOWN';
            slideIndex += 1;
          }
        } else if (lessonMode === 'holdSteady') {
          if (role === 'reference') {
            note.midi = anchorPitch;
            note.targetKind = 'fixedPitch';
          } else {
            note.targetKind = 'windowBand';
            note.minMidi = anchorPitch - holdBandSemitones;
            note.maxMidi = anchorPitch + holdBandSemitones;
            note.label = 'HOLD STEADY';
          }
        }

        notes.push(note);
        cursorMs += durationMs;
      }
    }

    return notes;
  }

  /**
   * Determine which phase we're in based on current time
   */
  function getPhaseFromTime(
    currentTimeMs: number,
    tempo: number,
    pattern: ExercisePattern,
    leadInMs: number
  ): { loop: number; phase: ExercisePhase } {
    const microbeatDurationMs = getMicrobeatDurationMs(tempo);
    const loopDurationMicrobeats = getLoopDurationMicrobeats(pattern);
    const loopDurationMs = loopDurationMicrobeats * microbeatDurationMs;

    // Subtract lead-in time
    const adjustedTimeMs = currentTimeMs - leadInMs;

    // During lead-in, show as rest
    if (adjustedTimeMs < 0) {
      return { loop: 0, phase: 'rest' };
    }

    const currentLoop = Math.floor(adjustedTimeMs / loopDurationMs);
    const timeInLoop = adjustedTimeMs % loopDurationMs;

    let elapsedMs = 0;
    for (const phase of pattern.phases) {
      const phaseDurationMs = phase.durationMicrobeats * microbeatDurationMs;
      if (timeInLoop < elapsedMs + phaseDurationMs) {
        return { loop: currentLoop, phase: phase.type };
      }
      elapsedMs += phaseDurationMs;
    }

    const fallbackPhase = pattern.phases[pattern.phases.length - 1]?.type ?? 'rest';
    return { loop: currentLoop, phase: fallbackPhase };
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
     * Start the exercise
     */
    start() {
      // Generate notes
      const notes = generateExerciseNotes(state.config);
      const pattern = getActivePattern(state.config);
      const leadInMs = getLeadInMs(state.config);

      state.generatedNotes = notes;
      state.pattern = pattern;
      state.config.leadInMs = leadInMs;
      state.isActive = true;
      state.isPlaying = false; // Will be set to true when playback starts
      state.currentLoop = 0;
      state.currentInputIndex = 0;
      state.currentPhase = pattern.phases[0]?.type ?? 'rest';
      state.currentPitch = notes.length > 0 ? (notes[0].midi ?? null) : null;
      state.results = [];
    },

    /**
     * Stop the exercise
     */
    stop() {
      state.isActive = false;
      state.isPlaying = false;
      state.currentLoop = 0;
      state.currentInputIndex = 0;
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
      const { loop, phase } = getPhaseFromTime(
        currentTimeMs,
        state.config.tempo,
        state.pattern,
        state.config.leadInMs
      );
      state.currentLoop = loop;
      state.currentPhase = phase;

      const inputNotes = state.generatedNotes.filter(
        note => note.role === 'input'
      );
      let completedInputs = 0;
      for (const note of inputNotes) {
        if (currentTimeMs >= note.startTimeMs + note.durationMs) {
          completedInputs += 1;
        } else {
          break;
        }
      }
      state.currentInputIndex = completedInputs;
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
      const inputNotes = state.generatedNotes.filter(
        note => note.role === 'input'
      );
      const total = inputNotes.length;
      if (total === 0) {
        return { current: 0, total: 0 };
      }
      return {
        current: Math.min(state.currentInputIndex + 1, total),
        total,
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
     * Reset to default state
     */
    reset() {
      state = { ...DEFAULT_STATE, config: { ...state.config } };
    },

    /**
     * Request a restart (called from App.svelte retry handler)
     */
    requestRestart() {
      state.restartRequested = true;
    },

    /**
     * Consume the restart request (called by ExerciseControls after starting)
     */
    consumeRestartRequest() {
      state.restartRequested = false;
    },

    /**
     * Set speaking pitch usage mode
     */
    setSpeakingPitchUsage(usage: SpeakingPitchUsage) {
      state.config.speakingPitchUsage = usage;
    },

    /**
     * Get speaking pitch usage mode
     */
    getSpeakingPitchUsage(): SpeakingPitchUsage {
      return state.config.speakingPitchUsage;
    },

    /**
     * Check if speaking pitch is available
     */
    isSpeakingPitchAvailable(): boolean {
      return preferencesStore.isCalibrated;
    },

    /**
     * Get the effective pitch range after applying speaking pitch mapping
     */
    getEffectivePitchRange(): { minMidi: number; maxMidi: number } {
      return applyPitchMapping(state.config);
    },
  };
}

export const exerciseState = createExerciseState();
