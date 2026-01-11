/**
 * Highway State Store - Svelte 5 Runes
 *
 * State for the "Guitar Hero" note highway visualization mode.
 * Now uses the @mlt/student-notation-engine highway service.
 */

import {
  createNoteHighwayService,
  type NoteHighwayServiceInstance,
  type HighwayTargetNote,
  type NotePerformance,
} from '@mlt/student-notation-engine';

export interface TargetNote {
  midi: number;
  startTimeMs: number;
  durationMs: number;
  hit?: boolean;
  lyric?: string; // For emoji/text display on notes
}

export interface HighwayState {
  isPlaying: boolean;
  startTime: number | null;
  currentTimeMs: number;
  targetNotes: TargetNote[];
  nowLineX: number;
  pixelsPerSecond: number;
  timeWindowMs: number;
}

const DEFAULT_STATE: HighwayState = {
  isPlaying: false,
  startTime: null,
  currentTimeMs: 0,
  targetNotes: [],
  nowLineX: 100, // Position of the "now" line from left edge
  pixelsPerSecond: 200,
  timeWindowMs: 4000,
};

function createHighwayState() {
  let state = $state<HighwayState>({ ...DEFAULT_STATE });
  let engineService: NoteHighwayServiceInstance | null = null;
  let animationFrameId: number | null = null;
  let performanceCompleteCallback: ((results: Map<string, NotePerformance>) => void) | null = null;

  // Convert local TargetNote to engine HighwayTargetNote
  function convertToEngineFormat(notes: TargetNote[]): HighwayTargetNote[] {
    return notes.map((note, index) => ({
      id: `target-${index}`,
      midi: note.midi,
      startTimeMs: note.startTimeMs,
      durationMs: note.durationMs,
      startColumn: 0, // Not used in target notes mode
      endColumn: 0,   // Not used in target notes mode
      color: '#3b82f6',
      shape: 'oval' as const,
      globalRow: 0,
    }));
  }

  // Sync engine state to local state
  function syncEngineState() {
    if (!engineService) return;

    const engineState = engineService.getState();
    state.isPlaying = engineState.isPlaying && !engineState.isPaused;
    state.currentTimeMs = engineState.currentTimeMs;

    // Update hit status from engine performance
    const performances = engineService.getPerformanceResults();
    state.targetNotes = state.targetNotes.map((note, index) => {
      const noteId = `target-${index}`;
      const perf = performances.get(noteId);
      return {
        ...note,
        hit: perf?.hitStatus === 'hit',
      };
    });
  }

  // Animation loop to sync state
  function animate() {
    if (state.isPlaying && engineService) {
      syncEngineState();
      animationFrameId = requestAnimationFrame(animate);
    } else {
      animationFrameId = null;
    }
  }

  function initializeEngine() {
    if (engineService) {
      engineService.dispose();
    }

    // Create engine service with minimal config
    engineService = createNoteHighwayService({
      judgmentLinePosition: state.nowLineX / 800, // Assume 800px viewport
      pixelsPerSecond: state.pixelsPerSecond,
      lookAheadMs: state.timeWindowMs,
      scrollMode: 'constant-speed',
      leadInBeats: 0, // No onramp for singing trainer
      playMetronomeDuringOnramp: false,
      playTargetNotes: false,
      playMetronome: false,
      inputSources: ['microphone'],
      feedbackConfig: {
        onsetToleranceMs: 100,
        releaseToleranceMs: 150,
        pitchToleranceCents: 50,
        hitThreshold: 70,
      },
      stateCallbacks: {
        getTempo: () => 120,
        getCellWidth: () => 20,
        getViewportWidth: () => 800,
      },
      eventCallbacks: {
        emit: (event, data) => {
          // Log highway events for debugging
          console.debug('[Highway]', event, data);

          // Handle specific events with visual feedback (placeholder for Phase 6)
          if (event === 'noteHit') {
            const hitData = data as { noteId: string; note: any; performance: any };
            console.log(
              `[Highway] Note HIT: ${hitData.noteId}, accuracy: ${hitData.performance.accuracyTier || 'unknown'}`
            );
            // TODO Phase 6: Trigger visual effects (glow, particles, emboldening)
          } else if (event === 'noteMissed') {
            const missData = data as { noteId: string; note: any; performance: any };
            console.log(`[Highway] Note MISSED: ${missData.noteId}`);
            // TODO Phase 6: Trigger visual effects (fade, shake, miss indicator)
          } else if (event === 'onrampComplete') {
            console.log('[Highway] Onramp complete, playback starting!');
          } else if (event === 'performanceComplete') {
            console.log('[Highway] Performance complete!');
            // Trigger callback with results
            if (performanceCompleteCallback && engineService) {
              performanceCompleteCallback(engineService.getPerformanceResults());
            }
          }
        },
      },
    });

    // Initialize with target notes
    const engineNotes = convertToEngineFormat(state.targetNotes);
    engineService.init(engineNotes);
  }

  return {
    get state() {
      return state;
    },

    get engineService() {
      return engineService;
    },

    start() {
      if (!engineService && state.targetNotes.length > 0) {
        initializeEngine();
      }

      if (engineService) {
        engineService.start();
        state.isPlaying = true;
        state.startTime = performance.now();
        state.currentTimeMs = 0;
        animate();
      }
    },

    stop() {
      if (engineService) {
        engineService.stop();
      }
      state.isPlaying = false;
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    },

    pause() {
      if (engineService) {
        engineService.pause();
      }
      state.isPlaying = false;
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    },

    resume() {
      if (engineService) {
        engineService.resume();
        state.isPlaying = true;
        animate();
      }
    },

    setTargetNotes(notes: TargetNote[]) {
      state.targetNotes = notes;

      // Reinitialize engine if it exists
      if (engineService) {
        const engineNotes = convertToEngineFormat(notes);
        engineService.init(engineNotes);
      }
    },

    markNoteHit(noteIndex: number) {
      if (noteIndex >= 0 && noteIndex < state.targetNotes.length) {
        state.targetNotes = state.targetNotes.map((note, i) =>
          i === noteIndex ? { ...note, hit: true } : note
        );
      }
    },

    setNowLineX(x: number) {
      state.nowLineX = x;
    },

    setPixelsPerSecond(pps: number) {
      state.pixelsPerSecond = pps;
    },

    setTimeWindowMs(ms: number) {
      state.timeWindowMs = ms;
    },

    recordPitchInput(midi: number, clarity: number) {
      if (engineService && state.isPlaying) {
        engineService.recordPitchInput(midi, clarity, 'microphone');
      }
    },

    getPerformanceResults(): Map<string, NotePerformance> {
      return engineService?.getPerformanceResults() ?? new Map();
    },

    /**
     * Set current time externally (for YouTube sync)
     */
    setCurrentTime(timeMs: number) {
      state.currentTimeMs = timeMs;
      if (engineService) {
        engineService.setScrollOffset(timeMs);
      }
    },

    /**
     * Register callback for performance complete event
     */
    onPerformanceComplete(callback: (results: Map<string, NotePerformance>) => void): () => void {
      performanceCompleteCallback = callback;
      return () => {
        performanceCompleteCallback = null;
      };
    },

    reset() {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      if (engineService) {
        engineService.dispose();
        engineService = null;
      }
      state = { ...DEFAULT_STATE };
    },
  };
}

export const highwayState = createHighwayState();
