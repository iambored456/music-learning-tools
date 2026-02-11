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
  type TargetKind,
  type SlideDirection,
  type FeedbackCollectorConfig,
} from '@mlt/student-notation-engine';

export interface TargetNote {
  targetKind?: TargetKind;
  midi?: number;
  minMidi?: number;
  maxMidi?: number;
  voiceId?: string;
  startTimeMs: number;
  durationMs: number;
  hit?: boolean;
  lyric?: string; // For emoji/text display on notes
  label?: string;
  slideDirection?: SlideDirection;
  role?: 'reference' | 'input';
  segmentId?: string;
  segmentName?: string;
  waitForInput?: boolean;
  color?: string;
}

export interface HighwayState {
  isPlaying: boolean;
  startTime: number | null;
  currentTimeMs: number;
  targetNotes: TargetNote[];
  nowLineX: number;
  pixelsPerSecond: number;
  timeWindowMs: number;
  tempoBpm: number;
  leadInBeats: number;
  feedbackConfig: FeedbackCollectorConfig;
  waitForInput: boolean;
  isWaitingForInput: boolean;
  waitingNoteId: string | null;
}

const DEFAULT_STATE: HighwayState = {
  isPlaying: false,
  startTime: null,
  currentTimeMs: 0,
  targetNotes: [],
  nowLineX: 100, // Position of the "now" line from left edge
  pixelsPerSecond: 200,
  timeWindowMs: 4000,
  tempoBpm: 120,
  leadInBeats: 0,
  feedbackConfig: {
    onsetToleranceMs: 100,
    releaseToleranceMs: 150,
    pitchToleranceCents: 50,
    hitThreshold: 70,
    minAmplitudeDb: -60,
    minVoicedMs: 400,
    minCoveragePct: 60,
    bandToleranceSemitones: 0,
    minSlideSemitones: 3,
  },
  waitForInput: false,
  isWaitingForInput: false,
  waitingNoteId: null,
};

function createHighwayState() {
  let state = $state<HighwayState>({ ...DEFAULT_STATE });
  let engineService: NoteHighwayServiceInstance | null = null;
  let animationFrameId: number | null = null;
  let performanceCompleteCallback: ((results: Map<string, NotePerformance>) => void) | null = null;
  let viewportWidth = 800;
  let pendingTimelineFitDurationMs: number | null = null;
  let noteHitCount = 0;
  let noteMissCount = 0;

  function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  function applyTimelineFit(durationMs: number): void {
    if (!Number.isFinite(durationMs) || durationMs <= 0) return;
    if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) return;

    const width = Math.max(1, viewportWidth);
    const leftPaddingPx = clamp(width * 0.08, 40, 120);
    const rightPaddingPx = clamp(width * 0.04, 20, 96);
    const nowLineMax = Math.max(40, width - rightPaddingPx - 80);
    const nowLineX = clamp(leftPaddingPx, 40, nowLineMax);
    const usableWidthPx = Math.max(100, width - nowLineX - rightPaddingPx);
    const fittedPixelsPerSecond = clamp((usableWidthPx / durationMs) * 1000, 20, 520);
    const lookAheadMs = Math.round(((width - nowLineX) / fittedPixelsPerSecond) * 1000);

    state.nowLineX = nowLineX;
    state.pixelsPerSecond = fittedPixelsPerSecond;
    state.timeWindowMs = Math.max(1000, Math.max(Math.round(durationMs), lookAheadMs));
  }

  // Convert local TargetNote to engine HighwayTargetNote
  function convertToEngineFormat(notes: TargetNote[]): HighwayTargetNote[] {
    return notes.map((note, index) => ({
      id: `target-${index}`,
      targetKind: note.targetKind,
      midi: note.midi,
      minMidi: note.minMidi,
      maxMidi: note.maxMidi,
      label: note.label,
      slideDirection: note.slideDirection,
      waitForInput: note.waitForInput,
      startTimeMs: note.startTimeMs,
      durationMs: note.durationMs,
      startColumn: 0, // Not used in target notes mode
      endColumn: 0,   // Not used in target notes mode
      color: note.color ?? '#3b82f6',
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
    state.isWaitingForInput = engineState.isWaitingForInput;
    state.waitingNoteId = engineState.waitingNoteId;

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

  function initializeEngine(): NoteHighwayServiceInstance | null {
    if (engineService) {
      engineService.dispose();
    }

    // Create engine service with minimal config
    engineService = createNoteHighwayService({
      judgmentLinePosition: state.nowLineX / viewportWidth,
      pixelsPerSecond: state.pixelsPerSecond,
      lookAheadMs: state.timeWindowMs,
      scrollMode: 'constant-speed',
      leadInBeats: state.leadInBeats,
      playMetronomeDuringOnramp: false,
      playTargetNotes: false,
      playMetronome: false,
      inputSources: ['microphone'],
      waitForInput: state.waitForInput,
      feedbackConfig: state.feedbackConfig,
      stateCallbacks: {
        getTempo: () => state.tempoBpm,
        getCellWidth: () => 20,
        getViewportWidth: () => viewportWidth,
      },
      eventCallbacks: {
        emit: (event, data) => {
          if (event === 'playbackStarted') {
            noteHitCount = 0;
            noteMissCount = 0;
            return;
          }

          if (event === 'noteHit') {
            noteHitCount += 1;
          } else if (event === 'noteMissed') {
            noteMissCount += 1;
          } else if (event === 'onrampComplete') {
            console.debug('[Highway] Onramp complete');
          } else if (event === 'performanceComplete') {
            console.debug('[Highway] Performance complete', {
              noteHitCount,
              noteMissCount,
              totalEvaluated: noteHitCount + noteMissCount,
            });
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
    return engineService;
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
      state.isWaitingForInput = false;
      state.waitingNoteId = null;
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
      state.isWaitingForInput = false;
      state.waitingNoteId = null;
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
      pendingTimelineFitDurationMs = null;
    },

    setViewportWidth(width: number) {
      viewportWidth = width;
      if (pendingTimelineFitDurationMs !== null && Number.isFinite(width) && width > 0) {
        applyTimelineFit(pendingTimelineFitDurationMs);
        pendingTimelineFitDurationMs = null;
      }
    },

    setPixelsPerSecond(pps: number) {
      state.pixelsPerSecond = pps;
      pendingTimelineFitDurationMs = null;
    },

    setTimeWindowMs(ms: number) {
      state.timeWindowMs = ms;
      pendingTimelineFitDurationMs = null;
    },

    fitTimelineToDuration(durationMs: number) {
      if (!Number.isFinite(durationMs) || durationMs <= 0) return;
      const normalizedDurationMs = Math.max(250, Math.round(durationMs));
      pendingTimelineFitDurationMs = normalizedDurationMs;
      applyTimelineFit(normalizedDurationMs);
    },

    setTempoBpm(tempoBpm: number) {
      state.tempoBpm = clamp(Math.round(tempoBpm), 20, 320);
      if (engineService && !state.isPlaying) {
        const engineNotes = convertToEngineFormat(state.targetNotes);
        initializeEngine();
        if (engineService) {
          engineService.init(engineNotes);
        }
      }
    },

    setLeadInBeats(leadInBeats: number) {
      state.leadInBeats = clamp(Math.round(leadInBeats), 0, 64);
      if (engineService && !state.isPlaying) {
        const engineNotes = convertToEngineFormat(state.targetNotes);
        initializeEngine();
        if (engineService) {
          engineService.init(engineNotes);
        }
      }
    },

    setFeedbackConfig(config: Partial<FeedbackCollectorConfig>) {
      state.feedbackConfig = { ...state.feedbackConfig, ...config };

      if (engineService && !state.isPlaying) {
        const engineNotes = convertToEngineFormat(state.targetNotes);
        initializeEngine();
        if (engineService) {
          engineService.init(engineNotes);
        }
      }
    },

    setWaitForInput(waitForInput: boolean) {
      state.waitForInput = waitForInput;
      if (engineService && !state.isPlaying) {
        const engineNotes = convertToEngineFormat(state.targetNotes);
        initializeEngine();
        if (engineService) {
          engineService.init(engineNotes);
        }
      }
    },

    recordPitchInput(midi: number, clarity: number, amplitudeDb?: number) {
      if (engineService && state.isPlaying) {
        engineService.recordPitchInput(midi, clarity, 'microphone', amplitudeDb);
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
     * Hard-cut playback to a timeline position.
     * Rebuilds the engine so wait-gates and note evaluation restart cleanly.
     */
    hardCutTo(timeMs: number, resumePlayback: boolean = true) {
      const targetTimeMs = Math.max(0, timeMs);

      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

      if (engineService) {
        engineService.dispose();
        engineService = null;
      }

      state.targetNotes = state.targetNotes.map((note) => ({
        ...note,
        hit: false,
      }));
      state.currentTimeMs = targetTimeMs;
      state.isPlaying = false;
      state.isWaitingForInput = false;
      state.waitingNoteId = null;

      if (state.targetNotes.length === 0) {
        return;
      }

      const service = initializeEngine();
      if (!service) {
        return;
      }

      service.start();
      service.setScrollOffset(targetTimeMs);
      syncEngineState();

      if (resumePlayback) {
        state.isPlaying = true;
        animate();
      } else {
        service.pause();
        state.isPlaying = false;
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
      pendingTimelineFitDurationMs = null;
      state = { ...DEFAULT_STATE };
    },
  };
}

export const highwayState = createHighwayState();
