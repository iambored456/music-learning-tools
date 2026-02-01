/**
 * Pitch State Store - Svelte 5 Runes
 *
 * Real-time pitch detection state including current pitch and history.
 */

export interface DetectedPitch {
  frequency: number;
  midi: number;
  clarity: number;
  pitchClass: number;
}

export interface PitchHistoryPoint {
  frequency: number;
  midi: number;
  time: number;
  clarity: number;
}

export interface StablePitchHighlight {
  pitchClass: number;
  midi: number;
  opacity: number;
}

export interface StablePitch {
  highlights: StablePitchHighlight[];
  size: number;
}

export interface PitchState {
  currentPitch: DetectedPitch | null;
  history: PitchHistoryPoint[];
  stablePitch: StablePitch;
}

const MAX_HISTORY_LENGTH = 200; // Cap history to bound trail render cost

const DEFAULT_STATE: PitchState = {
  currentPitch: null,
  history: [],
  stablePitch: { highlights: [], size: 1.0 },
};

function createPitchState() {
  let state = $state<PitchState>({ ...DEFAULT_STATE });

  // Circular buffer internals — avoids Array.shift() O(n) reindexing on every frame
  let ringBuffer: PitchHistoryPoint[] = [];
  let writeIndex = 0;
  let bufferFull = false;

  /** Rebuild the ordered history array from the ring buffer */
  function flushRingToHistory() {
    if (!bufferFull) {
      state.history = ringBuffer.slice(0, writeIndex);
    } else {
      // Oldest entries start at writeIndex, wrap around
      state.history = ringBuffer.slice(writeIndex).concat(ringBuffer.slice(0, writeIndex));
    }
  }

  // Throttle: only update the reactive history array every N writes
  let writesSinceFlush = 0;
  const FLUSH_INTERVAL = 3; // flush every 3 frames (~20Hz reactivity at 60fps detection)

  return {
    get state() {
      return state;
    },

    setCurrentPitch(pitch: DetectedPitch | null) {
      state.currentPitch = pitch;
    },

    addHistoryPoint(point: PitchHistoryPoint) {
      if (ringBuffer.length < MAX_HISTORY_LENGTH) {
        ringBuffer.push(point);
        writeIndex = ringBuffer.length;
        if (writeIndex >= MAX_HISTORY_LENGTH) {
          bufferFull = true;
          writeIndex = 0;
        }
      } else {
        ringBuffer[writeIndex] = point;
        writeIndex = (writeIndex + 1) % MAX_HISTORY_LENGTH;
        bufferFull = true;
      }

      writesSinceFlush++;
      if (writesSinceFlush >= FLUSH_INTERVAL) {
        writesSinceFlush = 0;
        flushRingToHistory();
      }
    },

    setStablePitch(stable: StablePitch) {
      state.stablePitch = stable;
    },

    clearHistory() {
      ringBuffer = [];
      writeIndex = 0;
      bufferFull = false;
      writesSinceFlush = 0;
      state.history = [];
    },

    reset() {
      ringBuffer = [];
      writeIndex = 0;
      bufferFull = false;
      writesSinceFlush = 0;
      state = { ...DEFAULT_STATE };
    },
  };
}

export const pitchState = createPitchState();
