/**
 * Note Highway Service
 *
 * Framework-agnostic service for Note Highway playback mode where grids scroll
 * westward (right-to-left) while a static judgment line remains fixed.
 */

import { createFeedbackCollector } from './feedbackCollector.js';
import type {
  NoteHighwayConfig,
  NoteHighwayServiceInstance,
  NoteHighwayState,
  HighwayTargetNote,
  InputSource,
  PitchSample,
  NotePerformance,
  FeedbackCollectorInstance,
} from './types.js';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: Partial<NoteHighwayConfig> = {
  judgmentLinePosition: 0.12,
  pixelsPerSecond: 200,
  lookAheadMs: 3000,
  scrollMode: 'constant-speed',
  leadInBeats: 4,
  playMetronomeDuringOnramp: true,
  playTargetNotes: true,
  playMetronome: false,
  inputSources: ['microphone'],
  waitForInput: false,
  feedbackConfig: {
    onsetToleranceMs: 100,
    releaseToleranceMs: 150,
    pitchToleranceCents: 50,
    hitThreshold: 70,
  },
};

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Note Highway service instance.
 */
export function createNoteHighwayService(
  config: NoteHighwayConfig
): NoteHighwayServiceInstance {
  const finalConfig: NoteHighwayConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    feedbackConfig: {
      ...DEFAULT_CONFIG.feedbackConfig!,
      ...config.feedbackConfig,
    },
  };

  const { stateCallbacks, eventCallbacks, visualCallbacks, logger } = finalConfig;

  // Internal state
  const state: NoteHighwayState = {
    isPlaying: false,
    isPaused: false,
    currentTimeMs: 0,
    scrollOffset: 0,
    onrampComplete: false,
    targetNotes: [],
    activeNotes: new Set(),
    startTime: null,
    isWaitingForInput: false,
    waitingNoteId: null,
  };

  // Feedback collector
  const feedbackCollector = createFeedbackCollector(finalConfig.feedbackConfig);

  // Animation frame ID
  let animationFrameId: number | null = null;

  // Track which notes have entered/exited judgment window
  const notesInWindow = new Set<string>();
  const waitSatisfiedCheckpoints = new Set<string>();
  let activeWaitCheckpointKey: string | null = null;
  let waitStartedAtPerf: number | null = null;

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Calculate the onramp duration in milliseconds.
   */
  function getOnrampDurationMs(): number {
    const tempo = stateCallbacks.getTempo();
    const beatDurationMs = (60 / tempo) * 1000;
    return finalConfig.leadInBeats * beatDurationMs;
  }

  /**
   * Calculate judgment line X position in pixels.
   */
  function getJudgmentLineX(): number {
    const viewportWidth = stateCallbacks.getViewportWidth();
    return viewportWidth * finalConfig.judgmentLinePosition;
  }

  /**
   * Calculate scroll offset from current time.
   */
  function calculateScrollOffset(timeMs: number): number {
    const pixelsPerMs = finalConfig.pixelsPerSecond / 1000;
    const judgmentLineX = getJudgmentLineX();

    // In constant-speed mode, scroll offset moves linearly with time
    // Offset starts negative during onramp
    const onrampDurationMs = getOnrampDurationMs();
    const adjustedTimeMs = timeMs + onrampDurationMs;

    return (adjustedTimeMs * pixelsPerMs) - judgmentLineX;
  }

  function isFiniteMidi(value: number | undefined): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function getTargetKind(note: HighwayTargetNote) {
    return note.targetKind ?? 'fixedPitch';
  }

  function isSampleVoiced(sample: PitchSample): boolean {
    if (!isFiniteMidi(sample.midi) || sample.midi <= 0) {
      return false;
    }
    if (
      typeof sample.amplitudeDb === 'number' &&
      typeof finalConfig.feedbackConfig.minAmplitudeDb === 'number'
    ) {
      return sample.amplitudeDb >= finalConfig.feedbackConfig.minAmplitudeDb;
    }
    return true;
  }

  function isSampleValidForWait(note: HighwayTargetNote, sample: PitchSample): boolean {
    const targetKind = getTargetKind(note);
    const pitchToleranceCents = finalConfig.feedbackConfig.pitchToleranceCents;

    if (!isSampleVoiced(sample)) {
      return false;
    }

    if (targetKind === 'fixedPitch') {
      if (!isFiniteMidi(note.midi)) return false;
      const centDeviation = Math.abs((sample.midi - note.midi) * 100);
      return centDeviation <= pitchToleranceCents;
    }

    if (targetKind === 'windowBand') {
      if (!isFiniteMidi(note.minMidi) || !isFiniteMidi(note.maxMidi)) return false;
      const minMidi = Math.min(note.minMidi, note.maxMidi);
      const maxMidi = Math.max(note.minMidi, note.maxMidi);
      const tolerance = finalConfig.feedbackConfig.bandToleranceSemitones ?? 0;
      return sample.midi >= minMidi - tolerance && sample.midi <= maxMidi + tolerance;
    }

    if (targetKind === 'windowAnyPitch') {
      if (isFiniteMidi(note.minMidi) && isFiniteMidi(note.maxMidi)) {
        const minMidi = Math.min(note.minMidi, note.maxMidi);
        const maxMidi = Math.max(note.minMidi, note.maxMidi);
        const tolerance = finalConfig.feedbackConfig.bandToleranceSemitones ?? 0;
        return sample.midi >= minMidi - tolerance && sample.midi <= maxMidi + tolerance;
      }
      return true;
    }

    // slideWindow: any voiced sample qualifies to release wait gate.
    return true;
  }

  function getWaitCheckpointKey(noteId: string, checkpointIndex: number): string {
    return `${noteId}::${checkpointIndex}`;
  }

  function getWaitCheckpointOffsets(note: HighwayTargetNote): number[] {
    const offsets: number[] = [];

    if (note.waitForInput) {
      offsets.push(0);
    }

    if (Array.isArray(note.extraWaitForInputOffsetsMs)) {
      for (const offset of note.extraWaitForInputOffsetsMs) {
        if (!Number.isFinite(offset)) continue;
        const roundedOffset = Math.round(offset);
        if (roundedOffset <= 0) continue;
        if (roundedOffset >= note.durationMs) continue;
        offsets.push(roundedOffset);
      }
    }

    return [...new Set(offsets)].sort((a, b) => a - b);
  }

  function getWaitCandidateNote(): {
    note: HighwayTargetNote;
    checkpointKey: string;
    checkpointTimeMs: number;
  } | null {
    if (!finalConfig.waitForInput || !state.onrampComplete) {
      return null;
    }

    const tolerance = finalConfig.feedbackConfig.onsetToleranceMs;
    for (const note of state.targetNotes) {
      const checkpointOffsets = getWaitCheckpointOffsets(note);
      if (checkpointOffsets.length === 0) {
        continue;
      }
      const noteEndMs = note.startTimeMs + note.durationMs + tolerance;

      if (state.currentTimeMs > noteEndMs) {
        continue;
      }

      for (let checkpointIndex = 0; checkpointIndex < checkpointOffsets.length; checkpointIndex++) {
        const checkpointOffsetMs = checkpointOffsets[checkpointIndex];
        const checkpointKey = getWaitCheckpointKey(note.id, checkpointIndex);
        if (waitSatisfiedCheckpoints.has(checkpointKey)) {
          continue;
        }

        const checkpointTimeMs = note.startTimeMs + checkpointOffsetMs;
        if (state.currentTimeMs < checkpointTimeMs) {
          break;
        }

        return {
          note,
          checkpointKey,
          checkpointTimeMs,
        };
      }
    }
    return null;
  }

  function beginWait(
    note: HighwayTargetNote,
    checkpointTimeMs: number,
    checkpointKey: string,
  ): void {
    if (state.isWaitingForInput) return;
    state.currentTimeMs = checkpointTimeMs;
    state.scrollOffset = calculateScrollOffset(state.currentTimeMs);
    state.isWaitingForInput = true;
    state.waitingNoteId = note.id;
    activeWaitCheckpointKey = checkpointKey;
    waitStartedAtPerf = performance.now();
    eventCallbacks.emit('waitStarted', { noteId: note.id, note, checkpointTimeMs });
    logger?.info('NoteHighway', `Wait started for note: ${note.id}`, {
      noteId: note.id,
      checkpointKey,
      checkpointTimeMs,
      targetKind: note.targetKind,
    });
  }

  function endWait(noteId: string, checkpointKey: string, note: HighwayTargetNote): void {
    if (
      !state.isWaitingForInput ||
      state.waitingNoteId !== noteId ||
      activeWaitCheckpointKey !== checkpointKey
    ) {
      return;
    }
    if (state.startTime !== null && waitStartedAtPerf !== null) {
      // Shift timeline origin so visual time does not jump after waiting.
      state.startTime += performance.now() - waitStartedAtPerf;
    }
    state.isWaitingForInput = false;
    state.waitingNoteId = null;
    activeWaitCheckpointKey = null;
    waitStartedAtPerf = null;
    waitSatisfiedCheckpoints.add(checkpointKey);
    eventCallbacks.emit('waitEnded', { noteId, note });
    logger?.info('NoteHighway', `Wait ended for note: ${noteId}`, {
      noteId,
      checkpointKey,
      targetKind: note.targetKind,
    });
  }

  /**
   * Check if a note is within the judgment window.
   */
  function isNoteInJudgmentWindow(note: HighwayTargetNote): boolean {
    const judgmentLineX = getJudgmentLineX();
    const cellWidth = stateCallbacks.getCellWidth();

    // Calculate note X positions
    const noteStartX = (note.startColumn * cellWidth) - state.scrollOffset;
    const noteEndX = (note.endColumn * cellWidth) - state.scrollOffset;

    // Judgment window: within tolerance of judgment line
    const windowToleranceMs = finalConfig.feedbackConfig.onsetToleranceMs;
    const windowTolerancePx = (windowToleranceMs / 1000) * finalConfig.pixelsPerSecond;

    return (
      noteStartX <= judgmentLineX + windowTolerancePx &&
      noteEndX >= judgmentLineX - windowTolerancePx
    );
  }

  /**
   * Update active notes based on current time.
   */
  function updateActiveNotes(): void {
    const currentActiveNotes = new Set<string>();

    for (const note of state.targetNotes) {
      const noteEndMs = note.startTimeMs + note.durationMs;

      // Note is active if current time is within its duration (with tolerance)
      const tolerance = finalConfig.feedbackConfig.onsetToleranceMs;
      if (
        state.currentTimeMs >= note.startTimeMs - tolerance &&
        state.currentTimeMs <= noteEndMs + tolerance
      ) {
        currentActiveNotes.add(note.id);

        // Start tracking if just became active
        if (!state.activeNotes.has(note.id)) {
          feedbackCollector.startNote(note.id, note);
          logger?.debug('NoteHighway', `Note ${note.id} became active`, { note });
        }
      } else if (state.activeNotes.has(note.id)) {
        // Note just became inactive - end tracking
        const performance = feedbackCollector.endNote(note.id);
        if (performance) {
          // Update note with performance data
          note.performance = performance;

          // Emit event
          const eventData = { noteId: note.id, note, performance };
          if (performance.hitStatus === 'hit') {
            eventCallbacks.emit('noteHit', eventData);
            visualCallbacks?.onNoteHit?.(note.id, performance.accuracyTier || 'okay');
            logger?.info('NoteHighway', `Note hit: ${note.id}`, performance);
          } else {
            eventCallbacks.emit('noteMissed', eventData);
            visualCallbacks?.onNoteMiss?.(note.id);
            logger?.info('NoteHighway', `Note missed: ${note.id}`, performance);
          }
        }
      }
    }

    state.activeNotes = currentActiveNotes;
  }

  /**
   * Update notes in judgment window for visual feedback.
   */
  function updateJudgmentWindow(): void {
    for (const note of state.targetNotes) {
      const inWindow = isNoteInJudgmentWindow(note);
      const wasInWindow = notesInWindow.has(note.id);

      if (inWindow && !wasInWindow) {
        notesInWindow.add(note.id);
        eventCallbacks.emit('noteEntered', { noteId: note.id, note });
      } else if (!inWindow && wasInWindow) {
        notesInWindow.delete(note.id);
        eventCallbacks.emit('noteExited', { noteId: note.id, note });
      }
    }
  }

  /**
   * Update onramp state and countdown.
   */
  function updateOnramp(): void {
    if (state.onrampComplete) return;

    if (state.currentTimeMs >= 0) {
      state.onrampComplete = true;
      eventCallbacks.emit('onrampComplete');
      visualCallbacks?.clearOnrampCountdown?.();
      logger?.info('NoteHighway', 'Onramp complete', null);
    } else {
      // Calculate beats remaining in onramp
      const tempo = stateCallbacks.getTempo();
      const beatDurationMs = (60 / tempo) * 1000;
      const msRemaining = Math.abs(state.currentTimeMs);
      const beatsRemaining = Math.ceil(msRemaining / beatDurationMs);

      visualCallbacks?.updateOnrampCountdown?.(beatsRemaining);
    }
  }

  /**
   * Animation loop for updating state.
   */
  function animate(): void {
    if (!state.isPlaying || state.isPaused || !state.startTime) {
      animationFrameId = null;
      return;
    }

    const now = performance.now();
    const onrampDurationMs = getOnrampDurationMs();

    if (!state.isWaitingForInput) {
      // Calculate current time (can be negative during onramp)
      state.currentTimeMs = (now - state.startTime) - onrampDurationMs;

      // Update scroll offset
      state.scrollOffset = calculateScrollOffset(state.currentTimeMs);
    }

    // Update onramp
    updateOnramp();

    // Update active notes
    updateActiveNotes();

    // Update judgment window
    updateJudgmentWindow();

    // Engage wait gate after note becomes active at the judgment line.
    if (!state.isWaitingForInput) {
      const waitNote = getWaitCandidateNote();
      if (waitNote) {
        beginWait(waitNote.note, waitNote.checkpointTimeMs, waitNote.checkpointKey);
      }
    }

    // Continue animation
    animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * Start the animation loop.
   */
  function startAnimation(): void {
    if (animationFrameId) return;
    animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * Stop the animation loop.
   */
  function stopAnimation(): void {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  // ============================================================================
  // Public API
  // ============================================================================

  const instance: NoteHighwayServiceInstance = {
    init(notes: HighwayTargetNote[]): void {
      state.targetNotes = notes;
      logger?.info('NoteHighway', `Initialized with ${notes.length} notes`, null);
    },

    start(): void {
      if (state.isPlaying) return;

      state.isPlaying = true;
      state.isPaused = false;
      state.currentTimeMs = -getOnrampDurationMs(); // Start in onramp
      state.scrollOffset = calculateScrollOffset(state.currentTimeMs);
      state.onrampComplete = false;
      state.activeNotes.clear();
      state.startTime = performance.now();
      state.isWaitingForInput = false;
      state.waitingNoteId = null;
      activeWaitCheckpointKey = null;
      waitStartedAtPerf = null;

      notesInWindow.clear();
      waitSatisfiedCheckpoints.clear();
      feedbackCollector.reset();

      startAnimation();
      eventCallbacks.emit('playbackStarted');
      logger?.info('NoteHighway', 'Playback started', { onrampDurationMs: getOnrampDurationMs() });
    },

    pause(): void {
      if (!state.isPlaying || state.isPaused) return;

      state.isPaused = true;
      stopAnimation();
      eventCallbacks.emit('playbackPaused');
      logger?.info('NoteHighway', 'Playback paused', { currentTimeMs: state.currentTimeMs });
    },

    resume(): void {
      if (!state.isPlaying || !state.isPaused || !state.startTime) return;

      // Adjust start time to account for paused duration
      const pausedDuration = performance.now() - (state.startTime + state.currentTimeMs + getOnrampDurationMs());
      state.startTime += pausedDuration;

      state.isPaused = false;
      startAnimation();
      eventCallbacks.emit('playbackResumed');
      logger?.info('NoteHighway', 'Playback resumed', null);
    },

    stop(): void {
      if (!state.isPlaying) return;

      state.isPlaying = false;
      state.isPaused = false;
      state.currentTimeMs = 0;
      state.scrollOffset = 0;
      state.onrampComplete = false;
      state.activeNotes.clear();
      state.startTime = null;
      state.isWaitingForInput = false;
      state.waitingNoteId = null;
      activeWaitCheckpointKey = null;
      waitStartedAtPerf = null;

      notesInWindow.clear();
      waitSatisfiedCheckpoints.clear();
      stopAnimation();
      visualCallbacks?.clearCanvas?.();
      visualCallbacks?.clearOnrampCountdown?.();
      eventCallbacks.emit('playbackStopped');

      // Check if all notes have been evaluated
      const allEvaluated = state.targetNotes.every(n => n.performance !== undefined);
      if (allEvaluated) {
        eventCallbacks.emit('performanceComplete');
      }

      logger?.info('NoteHighway', 'Playback stopped', null);
    },

    setScrollOffset(timeMs: number): void {
      state.currentTimeMs = timeMs;
      state.scrollOffset = calculateScrollOffset(timeMs);
      state.isWaitingForInput = false;
      state.waitingNoteId = null;
      activeWaitCheckpointKey = null;
      waitStartedAtPerf = null;

      if (state.isPlaying) {
        // Adjust start time to sync with new position
        const onrampDurationMs = getOnrampDurationMs();
        state.startTime = performance.now() - (timeMs + onrampDurationMs);
      }

      logger?.debug('NoteHighway', 'Scroll offset set', { timeMs, scrollOffset: state.scrollOffset });
    },

    recordPitchInput(midi: number, clarity: number, source: InputSource, amplitudeDb?: number): void {
      if (!state.isPlaying || state.isPaused) return;
      if (!finalConfig.inputSources.includes(source)) return;

      const sample: PitchSample = {
        timeMs: state.currentTimeMs,
        midi,
        clarity,
        amplitudeDb,
        source,
      };

      if (state.isWaitingForInput && state.waitingNoteId) {
        const waitingNote = state.targetNotes.find(n => n.id === state.waitingNoteId);
        if (
          waitingNote &&
          activeWaitCheckpointKey &&
          isSampleValidForWait(waitingNote, sample)
        ) {
          endWait(waitingNote.id, activeWaitCheckpointKey, waitingNote);
          feedbackCollector.recordPitchSample(sample);
          return;
        }
        return;
      }

      feedbackCollector.recordPitchSample(sample);
    },

    getState(): Readonly<NoteHighwayState> {
      return state;
    },

    getVisibleNotes(): HighwayTargetNote[] {
      const judgmentLineX = getJudgmentLineX();
      const viewportWidth = stateCallbacks.getViewportWidth();
      const cellWidth = stateCallbacks.getCellWidth();

      return state.targetNotes.filter(note => {
        const noteStartX = (note.startColumn * cellWidth) - state.scrollOffset;
        const noteEndX = (note.endColumn * cellWidth) - state.scrollOffset;

        // Note is visible if any part is on screen
        return noteEndX >= 0 && noteStartX <= viewportWidth;
      });
    },

    getPerformanceResults(): Map<string, NotePerformance> {
      return feedbackCollector.getAllPerformances();
    },

    getFeedbackCollector(): FeedbackCollectorInstance {
      return feedbackCollector;
    },

    dispose(): void {
      stopAnimation();
      feedbackCollector.dispose();
      state.targetNotes = [];
      state.activeNotes.clear();
      state.isWaitingForInput = false;
      state.waitingNoteId = null;
      activeWaitCheckpointKey = null;
      notesInWindow.clear();
      waitSatisfiedCheckpoints.clear();
      waitStartedAtPerf = null;
      logger?.info('NoteHighway', 'Service disposed', null);
    },
  };

  return instance;
}
