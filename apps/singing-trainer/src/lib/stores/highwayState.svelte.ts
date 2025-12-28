/**
 * Highway State Store - Svelte 5 Runes
 *
 * State for the "Guitar Hero" note highway visualization mode.
 */

export interface TargetNote {
  midi: number;
  startTimeMs: number;
  durationMs: number;
  hit?: boolean;
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
  let animationFrameId: number | null = null;

  function updateTime() {
    if (state.isPlaying && state.startTime !== null) {
      state.currentTimeMs = performance.now() - state.startTime;
      animationFrameId = requestAnimationFrame(updateTime);
    }
  }

  return {
    get state() {
      return state;
    },

    start() {
      state.isPlaying = true;
      state.startTime = performance.now();
      state.currentTimeMs = 0;
      animationFrameId = requestAnimationFrame(updateTime);
    },

    stop() {
      state.isPlaying = false;
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    },

    pause() {
      state.isPlaying = false;
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    },

    resume() {
      if (state.startTime !== null) {
        // Adjust start time to account for paused duration
        const pausedDuration = performance.now() - (state.startTime + state.currentTimeMs);
        state.startTime += pausedDuration;
        state.isPlaying = true;
        animationFrameId = requestAnimationFrame(updateTime);
      }
    },

    setTargetNotes(notes: TargetNote[]) {
      state.targetNotes = notes;
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

    reset() {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      state = { ...DEFAULT_STATE };
    },
  };
}

export const highwayState = createHighwayState();
