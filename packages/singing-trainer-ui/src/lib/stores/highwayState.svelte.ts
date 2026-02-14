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
  timelineDurationMs: number;
  timelineViewStartMs: number;
  timelineViewDurationMs: number;
  timelineContentDurationMs: number;
  timelineContentStartMs: number;
  timelinePaddingBeforeMs: number;
  timelinePaddingAfterMs: number;
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
  timelineDurationMs: 4000,
  timelineViewStartMs: 0,
  timelineViewDurationMs: 4000,
  timelineContentDurationMs: 4000,
  timelineContentStartMs: 0,
  timelinePaddingBeforeMs: 0,
  timelinePaddingAfterMs: 0,
};

function createHighwayState() {
  const MIN_TIMELINE_DURATION_MS = 250;
  const MIN_TIMELINE_VIEW_MS = 250;
  const MAX_TIMELINE_ZOOM_RATIO = 15;
  const MAX_TIMELINE_DURATION_MS = 60 * 60 * 1000;

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

  function normalizeTimelineDurationMs(durationMs: number): number {
    if (!Number.isFinite(durationMs)) {
      return DEFAULT_STATE.timelineDurationMs;
    }
    return clamp(
      Math.round(durationMs),
      MIN_TIMELINE_DURATION_MS,
      MAX_TIMELINE_DURATION_MS,
    );
  }

  function normalizePaddingMs(paddingMs: number | null | undefined): number {
    if (!Number.isFinite(paddingMs)) return 0;
    return Math.max(0, Math.round(paddingMs as number));
  }

  function getMinimumTimelineViewDurationMs(durationMs: number): number {
    const zoomCapFloorMs = Math.ceil(Math.max(1, durationMs) / MAX_TIMELINE_ZOOM_RATIO);
    return Math.max(MIN_TIMELINE_VIEW_MS, zoomCapFloorMs);
  }

  function getTimelineContentDurationFromNotes(notes: TargetNote[]): number {
    let maxEndMs = 0;
    for (const note of notes) {
      const startMs = Number.isFinite(note.startTimeMs) ? note.startTimeMs : 0;
      const durationMs = Number.isFinite(note.durationMs) ? note.durationMs : 0;
      const noteEndMs = Math.max(0, Math.round(startMs + durationMs));
      if (noteEndMs > maxEndMs) {
        maxEndMs = noteEndMs;
      }
    }
    return normalizeTimelineDurationMs(Math.max(DEFAULT_STATE.timelineContentDurationMs, maxEndMs));
  }

  function isTimelineAtFullView(epsilonMs = 1): boolean {
    return state.timelineViewStartMs <= epsilonMs
      && Math.abs(state.timelineViewDurationMs - state.timelineDurationMs) <= epsilonMs;
  }

  function setTimelineViewport(startMs: number, viewDurationMs: number): void {
    const durationMs = Math.max(MIN_TIMELINE_DURATION_MS, state.timelineDurationMs);
    const minViewDurationMs = getMinimumTimelineViewDurationMs(durationMs);
    const clampedViewDurationMs = clamp(
      Math.round(viewDurationMs),
      minViewDurationMs,
      durationMs,
    );
    const maxStartMs = Math.max(0, durationMs - clampedViewDurationMs);
    const clampedStartMs = clamp(Math.round(startMs), 0, maxStartMs);
    state.timelineViewDurationMs = clampedViewDurationMs;
    state.timelineViewStartMs = clampedStartMs;
  }

  function setTimelineDuration(
    contentDurationMs: number,
    options?: { resetView?: boolean; paddingBeforeMs?: number; paddingAfterMs?: number },
  ): void {
    const wasFullView = isTimelineAtFullView();
    const normalizedContentDurationMs = normalizeTimelineDurationMs(contentDurationMs);
    const paddingBeforeMs = options?.paddingBeforeMs !== undefined
      ? normalizePaddingMs(options.paddingBeforeMs)
      : state.timelinePaddingBeforeMs;
    const paddingAfterMs = options?.paddingAfterMs !== undefined
      ? normalizePaddingMs(options.paddingAfterMs)
      : state.timelinePaddingAfterMs;

    const requestedTotalDurationMs = normalizedContentDurationMs + paddingBeforeMs + paddingAfterMs;
    const normalizedTotalDurationMs = normalizeTimelineDurationMs(requestedTotalDurationMs);
    const availablePaddingBudgetMs = Math.max(0, normalizedTotalDurationMs - normalizedContentDurationMs);
    const clampedPaddingBeforeMs = Math.min(paddingBeforeMs, availablePaddingBudgetMs);
    const clampedPaddingAfterMs = Math.max(0, availablePaddingBudgetMs - clampedPaddingBeforeMs);

    state.timelineContentDurationMs = normalizedContentDurationMs;
    state.timelineContentStartMs = clampedPaddingBeforeMs;
    state.timelinePaddingBeforeMs = clampedPaddingBeforeMs;
    state.timelinePaddingAfterMs = clampedPaddingAfterMs;
    state.timelineDurationMs = normalizedTotalDurationMs;

    if (options?.resetView || wasFullView) {
      setTimelineViewport(0, normalizedTotalDurationMs);
      return;
    }

    setTimelineViewport(state.timelineViewStartMs, state.timelineViewDurationMs);
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

    setTargetNotes(
      notes: TargetNote[],
      options?: { preserveTimelinePadding?: boolean; contentDurationMs?: number },
    ) {
      state.targetNotes = notes;
      const inferredTimelineContentDurationMs = (
        Number.isFinite(options?.contentDurationMs) && (options?.contentDurationMs as number) > 0
      )
        ? normalizeTimelineDurationMs(options?.contentDurationMs as number)
        : getTimelineContentDurationFromNotes(notes);
      if (options?.preserveTimelinePadding) {
        setTimelineDuration(inferredTimelineContentDurationMs);
      } else {
        setTimelineDuration(inferredTimelineContentDurationMs, {
          paddingBeforeMs: 0,
          paddingAfterMs: 0,
        });
      }

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

    fitTimelineToDuration(
      durationMs: number,
      options?: { paddingBeforeMs?: number; paddingAfterMs?: number },
    ) {
      if (!Number.isFinite(durationMs) || durationMs <= 0) return;
      const normalizedContentDurationMs = normalizeTimelineDurationMs(durationMs);
      const paddingBeforeMs = normalizePaddingMs(options?.paddingBeforeMs);
      const paddingAfterMs = normalizePaddingMs(options?.paddingAfterMs);
      setTimelineDuration(normalizedContentDurationMs, {
        resetView: true,
        paddingBeforeMs,
        paddingAfterMs,
      });
      pendingTimelineFitDurationMs = state.timelineDurationMs;
      applyTimelineFit(state.timelineDurationMs);
    },

    resetTimelineViewport() {
      setTimelineViewport(0, state.timelineDurationMs);
    },

    setTimelineViewStartMs(startMs: number) {
      setTimelineViewport(startMs, state.timelineViewDurationMs);
    },

    setTimelineViewDurationMs(viewDurationMs: number, anchorRatio: number = 0.5) {
      const anchor = clamp(anchorRatio, 0, 1);
      const minViewDurationMs = getMinimumTimelineViewDurationMs(state.timelineDurationMs);
      const currentViewDurationMs = Math.max(minViewDurationMs, state.timelineViewDurationMs);
      const anchorTimeMs = state.timelineViewStartMs + (currentViewDurationMs * anchor);
      const clampedViewDurationMs = clamp(
        Math.round(viewDurationMs),
        minViewDurationMs,
        state.timelineDurationMs,
      );
      const nextStartMs = anchorTimeMs - (clampedViewDurationMs * anchor);
      setTimelineViewport(nextStartMs, clampedViewDurationMs);
    },

    zoomTimelineViewport(zoomFactor: number, anchorRatio: number = 0.5) {
      if (!Number.isFinite(zoomFactor) || zoomFactor <= 0) return;
      const minViewDurationMs = getMinimumTimelineViewDurationMs(state.timelineDurationMs);
      const currentViewDurationMs = Math.max(minViewDurationMs, state.timelineViewDurationMs);
      const nextViewDurationMs = currentViewDurationMs / zoomFactor;
      const anchor = clamp(anchorRatio, 0, 1);
      const anchorTimeMs = state.timelineViewStartMs + (currentViewDurationMs * anchor);
      const clampedViewDurationMs = clamp(
        Math.round(nextViewDurationMs),
        minViewDurationMs,
        state.timelineDurationMs,
      );
      const nextStartMs = anchorTimeMs - (clampedViewDurationMs * anchor);
      setTimelineViewport(nextStartMs, clampedViewDurationMs);
    },

    panTimelineViewportMs(deltaMs: number) {
      if (!Number.isFinite(deltaMs) || deltaMs === 0) return;
      const nextStartMs = state.timelineViewStartMs + deltaMs;
      setTimelineViewport(nextStartMs, state.timelineViewDurationMs);
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
