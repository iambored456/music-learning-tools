/**
 * Transport Service
 *
 * Framework-agnostic playback controller using Tone.js Transport.
 * All DOM operations are delegated to injected callbacks.
 *
 * Key design decisions:
 * - No DOM dependencies (domCache, document.*, etc.)
 * - All visual updates via callbacks
 * - State access via callbacks (no direct store import)
 * - Can run headless for testing or tutorial puppeting
 */

import * as Tone from 'tone';
import { createTimeMapCalculator, type TimeMapCalculatorInstance } from '../transport/timeMapCalculator.js';
import { createDrumManager } from '../transport/drumManager.js';
import type { DrumManagerInstance } from '../transport/types.js';
import type {
  TransportServiceInstance,
  TransportConfig,
  TransportState,
  SynthLogger,
  SchedulableNote,
  SchedulableStamp,
  SchedulableTriplet,
  StampScheduleEvent
} from './types.js';

const FLAT_SYMBOL = '\u266d';
const SHARP_SYMBOL = '\u266f';

/**
 * Binary search to find the timeMap index containing a given time.
 * Returns the index i where timeMap[i] <= time < timeMap[i+1].
 * Returns -1 if time is before the first entry or after the last.
 */
function binarySearchTimeMap(timeMap: number[], time: number): number {
  if (timeMap.length < 2) return -1;
  if (time < timeMap[0]!) return -1;
  if (time >= timeMap[timeMap.length - 1]!) return -1;

  let low = 0;
  let high = timeMap.length - 2; // Last valid index for a column

  while (low <= high) {
    const mid = (low + high) >>> 1;
    const colStart = timeMap[mid]!;
    const colEnd = timeMap[mid + 1]!;

    if (time >= colStart && time < colEnd) {
      return mid;
    } else if (time < colStart) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return -1;
}

/**
 * Create a new transport service instance
 */
export function createTransportService(config: TransportConfig): TransportServiceInstance {
  const {
    synthEngine,
    stateCallbacks,
    eventCallbacks,
    visualCallbacks,
    logger,
    audioInit,
    playbackMode = 'standard',
    highwayService
  } = config;

  // Logger helper
  const log: SynthLogger = logger ?? {
    debug: () => {},
    info: () => {},
    warn: () => {}
  };

  // Internal state
  let playheadAnimationFrame: number | null = null;
  let shouldAnimatePlayhead = false;
  let timeMapCalculator: TimeMapCalculatorInstance | null = null;
  let drumManager: DrumManagerInstance | null = null;
  let lastAppliedTempoMultiplier = 1.0;

  // Event listener cleanup
  const eventCleanups: Array<() => void> = [];

  /**
   * Get pitch from a global row index.
   */
  function getPitchFromRow(rowIndex: number, state: TransportState): string {
    const rowData = state.fullRowData[rowIndex];
    if (!rowData) {
      return 'C4';
    }
    return rowData.toneNote
      .replace(FLAT_SYMBOL, 'b')
      .replace(SHARP_SYMBOL, '#');
  }

  /**
   * Get pitch for a placed note.
   */
  function getPitchForNote(note: SchedulableNote, state: TransportState): string {
    const rowIndex = note.globalRow ?? note.row;
    const rowData = state.fullRowData[rowIndex];
    if (rowData) {
      return rowData.toneNote
        .replace(FLAT_SYMBOL, 'b')
        .replace(SHARP_SYMBOL, '#');
    }
    return 'C4';
  }

  /**
   * Schedule all notes, stamps, and triplets on Transport.
   */
  function scheduleNotes(): void {
    if (!timeMapCalculator) return;

    const state = stateCallbacks.getState();
    log.debug('TransportService', 'scheduleNotes', 'Clearing previous transport events and rescheduling all notes');

    Tone.Transport.cancel();
    drumManager?.reset();
    timeMapCalculator.calculate(state);
    visualCallbacks?.clearAdsrVisuals?.();

    const timeMap = timeMapCalculator.getTimeMap();
    const { loopEnd: configuredLoopEnd } = timeMapCalculator.getConfiguredLoopBounds();
    const anacrusisOffset = timeMapCalculator.findNonAnacrusisStart(state);

    log.debug('TransportService', `[ANACRUSIS] hasAnacrusis: ${state.hasAnacrusis}, anacrusisOffset: ${anacrusisOffset.toFixed(3)}s`);

    // Schedule placed notes
    state.placedNotes.forEach((note, noteIndex) => {
      const canvasStartIndex = note.startColumnIndex;
      const canvasEndIndex = note.endColumnIndex;
      const regularStartTime = timeMap[canvasStartIndex];

      if (regularStartTime === undefined) {
        log.warn('TransportService', `[NOTE SCHEDULE] Note ${noteIndex}: timeMap[${canvasStartIndex}] undefined, skipping`);
        return;
      }

      const scheduleTime = timeMapCalculator!.applyModulationToTime(regularStartTime, canvasStartIndex, state);

      // Calculate duration
      const regularEndTime = timeMap[canvasEndIndex + 1];
      if (regularEndTime === undefined) {
        log.warn('TransportService', `Skipping note with invalid endColumnIndex: ${note.endColumnIndex + 1}`);
        return;
      }

      const modulatedEndTime = timeMapCalculator!.applyModulationToTime(regularEndTime, canvasEndIndex + 1, state);
      const tailDuration = modulatedEndTime - scheduleTime;

      if (note.isDrum) {
        scheduleRumNote(note, scheduleTime);
      } else {
        schedulePitchedNote(note, scheduleTime, tailDuration, configuredLoopEnd, state);
      }
    });

    // Schedule stamps
    const stampPlaybackData = stateCallbacks.getStampPlaybackData?.() ?? [];
    stampPlaybackData.forEach(stampData => {
      scheduleStamp(stampData, timeMap, state);
    });

    // Schedule triplets
    const tripletPlaybackData = stateCallbacks.getTripletPlaybackData?.() ?? [];
    tripletPlaybackData.forEach(tripletData => {
      scheduleTriplet(tripletData, timeMap, state);
    });

    log.debug('TransportService', 'scheduleNotes', `Finished scheduling ${state.placedNotes.length} notes, ${stampPlaybackData.length} stamps, and ${tripletPlaybackData.length} triplets`);
  }

  /**
   * Schedule a drum note.
   */
  function scheduleRumNote(note: SchedulableNote, scheduleTime: number): void {
    const state = stateCallbacks.getState();

    Tone.Transport.schedule(time => {
      if (state.isPaused) return;

      const drumTrack = note.drumTrack;
      if (drumTrack == null) return;

      const trackKey = String(drumTrack) as 'H' | 'M' | 'L';
      drumManager?.trigger(trackKey, time);

      // Schedule visual update
      Tone.Draw.schedule(() => {
        visualCallbacks?.triggerDrumNotePop?.(note.startColumnIndex, drumTrack);
      }, time);
    }, scheduleTime);
  }

  /**
   * Schedule a pitched note.
   */
  function schedulePitchedNote(
    note: SchedulableNote,
    scheduleTime: number,
    duration: number,
    configuredLoopEnd: number,
    state: TransportState
  ): void {
    const pitch = getPitchForNote(note, state);
    const toolColor = note.color;
    const rowIndex = note.globalRow ?? note.row;
    const pitchColor = state.fullRowData[rowIndex]?.hex || '#888888';
    const noteId = note.uuid;
    const timbre = state.timbres[toolColor];

    if (!timbre) {
      log.warn('TransportService', `Timbre not found for color ${toolColor}. Skipping note ${noteId}`);
      return;
    }

    let releaseTime = scheduleTime + duration;

    // Ensure release happens BEFORE loop end to prevent feedback loop
    const RELEASE_SAFETY_MARGIN = 0.001;
    const maxReleaseTime = configuredLoopEnd - RELEASE_SAFETY_MARGIN;
    if (releaseTime >= configuredLoopEnd) {
      releaseTime = Math.max(scheduleTime + 0.001, maxReleaseTime);
    }

    // Schedule attack
    Tone.Transport.schedule(time => {
      if (stateCallbacks.getState().isPaused) return;
      synthEngine.triggerAttack(pitch, toolColor, time);

      Tone.Draw.schedule(() => {
        visualCallbacks?.triggerAdsrVisual?.(noteId, 'attack', pitchColor, timbre.adsr);
        eventCallbacks.emit('noteAttack', { noteId, color: toolColor });
      }, time);
    }, scheduleTime);

    // Schedule release
    Tone.Transport.schedule(time => {
      synthEngine.triggerRelease(pitch, toolColor, time);

      Tone.Draw.schedule(() => {
        visualCallbacks?.triggerAdsrVisual?.(noteId, 'release', pitchColor, timbre.adsr);
        eventCallbacks.emit('noteRelease', { noteId, color: toolColor });
      }, time);
    }, releaseTime);
  }

  /**
   * Schedule a stamp.
   */
  function scheduleStamp(
    stampData: SchedulableStamp,
    timeMap: number[],
    state: TransportState
  ): void {
    const canvasColumnIndex = stampData.column;
    const cellStartTime = timeMap[canvasColumnIndex];
    if (cellStartTime === undefined) return;

    const scheduleEvents = stateCallbacks.getStampScheduleEvents?.(stampData.sixteenthStampId, stampData.placement) ?? [];

    scheduleEvents.forEach(event => {
      scheduleStampEvent(event, cellStartTime, stampData.row, stampData.color, state);
    });
  }

  /**
   * Schedule a triplet.
   */
  function scheduleTriplet(
    tripletData: SchedulableTriplet,
    timeMap: number[],
    state: TransportState
  ): void {
    const canvasColumnIndex = stateCallbacks.timeToCanvas?.(tripletData.startTimeIndex, state) ?? tripletData.startTimeIndex;
    const cellStartTime = timeMap[canvasColumnIndex];
    if (cellStartTime === undefined) return;

    const scheduleEvents = stateCallbacks.getTripletScheduleEvents?.(tripletData.tripletStampId, tripletData.placement) ?? [];

    scheduleEvents.forEach(event => {
      scheduleStampEvent(event, cellStartTime, tripletData.row, tripletData.color, state);
    });
  }

  /**
   * Schedule a single stamp/triplet event.
   */
  function scheduleStampEvent(
    event: StampScheduleEvent,
    cellStartTime: number,
    baseRow: number,
    color: string,
    state: TransportState
  ): void {
    const offsetTime = Tone.Time(event.offset).toSeconds();
    const eventDuration = Tone.Time(event.duration).toSeconds();
    const triggerTime = cellStartTime + offsetTime;
    const releaseTime = triggerTime + eventDuration;

    const shapeRow = baseRow + event.rowOffset;
    const shapePitch = getPitchFromRow(shapeRow, state);

    // Schedule attack
    Tone.Transport.schedule(time => {
      if (stateCallbacks.getState().isPaused) return;
      synthEngine.triggerAttack(shapePitch, color, time);
    }, triggerTime);

    // Schedule release
    Tone.Transport.schedule(time => {
      if (stateCallbacks.getState().isPaused) return;
      synthEngine.triggerRelease(shapePitch, color, time);
    }, releaseTime);
  }

  /**
   * Animate the playhead.
   */
  function animatePlayhead(): void {
    const state = stateCallbacks.getState();
    const baseTempo = state.tempo;
    const TEMPO_MULTIPLIER_EPSILON = 0.0001;
    const MARKER_PASS_EPSILON = 0.5;

    const getMarkerX = (marker: { xPosition?: number | null } | null | undefined) => marker?.xPosition ?? 477.5;
    const initialBpm = typeof Tone.Transport?.bpm?.value === 'number'
      ? Tone.Transport.bpm.value
      : baseTempo;
    lastAppliedTempoMultiplier = baseTempo !== 0 ? initialBpm / baseTempo : 1.0;

    shouldAnimatePlayhead = true;

    function draw(): void {
      if (!shouldAnimatePlayhead || !timeMapCalculator) {
        return;
      }

      // If Transport hasn't started yet, continue looping
      if (Tone.Transport.state === 'stopped') {
        playheadAnimationFrame = requestAnimationFrame(draw);
        return;
      }

      const currentState = stateCallbacks.getState();
      const transportLoopEnd = Tone.Time(Tone.Transport.loopEnd).toSeconds();
      const isLooping = currentState.isLooping;
      const musicalEnd = timeMapCalculator.getMusicalEndTime();
      const playbackEnd = (isLooping && transportLoopEnd > 0) ? transportLoopEnd : musicalEnd;
      const currentTime = Tone.Transport.seconds;
      const currentTimeMs = currentTime * 1000;

      const reachedEnd = currentTime >= (playbackEnd - 0.001);

      // Stop only when looping is disabled
      if (!isLooping && reachedEnd) {
        log.info('TransportService', 'Playback reached end. Stopping playhead.');
        instance.stop();
        return;
      }

      if (currentState.isPaused) {
        playheadAnimationFrame = requestAnimationFrame(draw);
        return;
      }

      const timeMap = timeMapCalculator.getTimeMap();

      // Clear canvases
      visualCallbacks?.clearPlayheadCanvas?.();
      visualCallbacks?.clearDrumPlayheadCanvas?.();

      let loopAwareTime = currentTime;
      if (isLooping) {
        const loopStartSeconds = Tone.Time(Tone.Transport.loopStart).toSeconds();
        const loopEndSeconds = Tone.Time(Tone.Transport.loopEnd).toSeconds();
        const loopDuration = loopEndSeconds - loopStartSeconds;
        if (loopDuration > 0) {
          loopAwareTime = ((currentTime - loopStartSeconds) % loopDuration) + loopStartSeconds;
        }
      }

      const maxXPos = stateCallbacks.getCanvasWidth?.() ?? 1000;

      // Get tonic column spans for visual skipping
      const placedTonicSigns = stateCallbacks.getPlacedTonicSigns?.() ?? [];
      const tonicSpanColumns = stateCallbacks.getTonicSpanColumnIndices?.(placedTonicSigns) ?? new Set();

      let xPos = 0;
      let activeColumnStartX = 0;
      let activeColumnWidth = 0;
      let activeDisplayColumnIndex = -1;

      // Use binary search O(log n) instead of linear search O(n)
      const foundIndex = binarySearchTimeMap(timeMap, loopAwareTime);
      if (foundIndex >= 0) {
        const colStartTime = timeMap[foundIndex]!;
        const colEndTime = timeMap[foundIndex + 1]!;

        // Found the column containing current time
        let displayColIndex = foundIndex;
        while (tonicSpanColumns.has(displayColIndex) && displayColIndex < timeMap.length - 1) {
          displayColIndex++;
        }

        const colStartX = stateCallbacks.getColumnStartX?.(displayColIndex) ?? 0;
        const colWidth = stateCallbacks.getColumnWidth?.(displayColIndex) ?? 10;
        activeColumnStartX = colStartX;
        activeColumnWidth = colWidth;
        activeDisplayColumnIndex = displayColIndex;

        if (!tonicSpanColumns.has(foundIndex)) {
          const colDuration = colEndTime - colStartTime;
          const timeIntoCol = loopAwareTime - colStartTime;
          const ratio = colDuration > 0 ? timeIntoCol / colDuration : 0;
          xPos = colStartX + ratio * colWidth;
        } else {
          xPos = colStartX;
        }
      }

      const finalXPos = Math.min(xPos, maxXPos);

      // Apply dynamic tempo modulation
      applyTempoModulation(currentState, finalXPos, baseTempo, getMarkerX, TEMPO_MULTIPLIER_EPSILON, MARKER_PASS_EPSILON);

      // Draw playhead
      const canvasHeight = visualCallbacks?.getPlayheadCanvasHeight?.() ?? 500;
      const drumCanvasHeight = visualCallbacks?.getDrumCanvasHeight?.() ?? 100;
      const macroRect = (currentState.playheadMode === 'macrobeat' && activeDisplayColumnIndex >= 0)
        ? stateCallbacks.getMacrobeatHighlightRect?.(activeDisplayColumnIndex)
        : null;
      const highlightX = macroRect?.x ?? activeColumnStartX;
      const highlightWidth = macroRect?.width ?? activeColumnWidth;

      if (finalXPos >= 0) {
        if (currentState.playheadMode === 'macrobeat' || currentState.playheadMode === 'microbeat') {
          visualCallbacks?.drawPlayheadHighlight?.(highlightX, highlightWidth, canvasHeight, currentTimeMs);
          visualCallbacks?.drawDrumPlayheadHighlight?.(highlightX, highlightWidth, drumCanvasHeight, currentTimeMs);
        } else {
          visualCallbacks?.drawPlayheadLine?.(finalXPos, canvasHeight);
          visualCallbacks?.drawDrumPlayheadLine?.(finalXPos, drumCanvasHeight);
        }
      }

      // Update beat line highlights
      const shouldShowBeatLineHighlight = currentState.playheadMode === 'macrobeat' || currentState.playheadMode === 'microbeat';
      visualCallbacks?.updateBeatLineHighlight?.(highlightX, highlightWidth, shouldShowBeatLineHighlight);

      playheadAnimationFrame = requestAnimationFrame(draw);
    }

    draw();
  }

  /**
   * Apply tempo modulation based on marker positions.
   */
  function applyTempoModulation(
    state: TransportState,
    finalXPos: number,
    baseTempo: number,
    getMarkerX: (marker: any) => number,
    TEMPO_MULTIPLIER_EPSILON: number,
    MARKER_PASS_EPSILON: number
  ): void {
    if (!timeMapCalculator) return;

    const tempoModulationMarkers = Array.isArray(state.tempoModulationMarkers)
      ? state.tempoModulationMarkers
      : [];

    const activeMarkers = tempoModulationMarkers
      .filter(marker => marker?.active && typeof marker.ratio === 'number' && marker.ratio !== 0)
      .sort((a, b) => getMarkerX(a) - getMarkerX(b));

    if (activeMarkers.length > 0) {
      let targetMultiplier = 1.0;

      for (const marker of activeMarkers) {
        const markerX = getMarkerX(marker);
        if (finalXPos + MARKER_PASS_EPSILON >= markerX) {
          targetMultiplier *= 1 / marker.ratio;
        } else {
          break;
        }
      }

      if (!Number.isFinite(targetMultiplier) || targetMultiplier <= 0) {
        targetMultiplier = 1.0;
      }

      if (Math.abs(targetMultiplier - lastAppliedTempoMultiplier) > TEMPO_MULTIPLIER_EPSILON) {
        const newTempo = baseTempo * targetMultiplier;
        Tone.Transport.bpm.value = newTempo;
        timeMapCalculator.reapplyConfiguredLoopBounds(state.isLooping);
        lastAppliedTempoMultiplier = targetMultiplier;
        log.debug('TransportService', `Tempo multiplier updated to ${targetMultiplier.toFixed(3)} (${newTempo.toFixed(2)} BPM)`);
      }
    } else if (Math.abs(lastAppliedTempoMultiplier - 1.0) > TEMPO_MULTIPLIER_EPSILON) {
      Tone.Transport.bpm.value = baseTempo;
      timeMapCalculator.reapplyConfiguredLoopBounds(state.isLooping);
      lastAppliedTempoMultiplier = 1.0;
      log.debug('TransportService', `Tempo reset to base ${baseTempo} BPM`);
    }
  }

  const instance: TransportServiceInstance = {
    init(): void {
      const state = stateCallbacks.getState();

      // Create time map calculator
      timeMapCalculator = createTimeMapCalculator({
        getMacrobeatInfo: stateCallbacks.getMacrobeatInfo ?? (() => null),
        getPlacedTonicSigns: stateCallbacks.getPlacedTonicSigns ?? (() => []),
        getTonicSpanColumnIndices: stateCallbacks.getTonicSpanColumnIndices ?? (() => new Set()),
        logger: log
      });

      // Create drum manager
      drumManager = createDrumManager({
        samples: {
          H: '/audio/drums/hi.mp3',
          M: '/audio/drums/mid.mp3',
          L: '/audio/drums/lo.mp3'
        },
        synthEngine: {
          getMainVolumeNode: () => synthEngine.getMainVolumeNode()
        }
      });

      Tone.Transport.bpm.value = state.tempo;

      // Subscribe to events
      const rhythmHandler = () => this.handleStateChange();
      const notesHandler = () => this.handleStateChange();
      const stampsHandler = () => this.handleStateChange();
      const modulationHandler = () => {
        if (timeMapCalculator && timeMapCalculator.getTimeMap().length > 0) {
          const currentState = stateCallbacks.getState();
          timeMapCalculator.calculate(currentState);
        }
        this.handleStateChange();
      };
      const layoutHandler = (data: any) => {
        const oldWidths = data?.oldConfig?.columnWidths || [];
        const newWidths = data?.newConfig?.columnWidths || [];
        if (oldWidths.length !== newWidths.length && timeMapCalculator) {
          timeMapCalculator.calculate(stateCallbacks.getState());
        }
      };
      const tempoHandler = (newTempo: number) => {
        log.info('TransportService', `tempoChanged triggered with new value: ${newTempo} BPM`);

        if (Tone.Transport.state === 'started') {
          const currentPosition = Tone.Transport.position;
          Tone.Transport.pause();

          if (playheadAnimationFrame) {
            cancelAnimationFrame(playheadAnimationFrame);
            playheadAnimationFrame = null;
          }

          Tone.Transport.bpm.value = newTempo;
          timeMapCalculator?.reapplyConfiguredLoopBounds(stateCallbacks.getState().isLooping);
          scheduleNotes();
          Tone.Transport.start(undefined, currentPosition);

          // In standard mode, animate playhead here. In highway mode, the highway service handles visuals
          if (playbackMode === 'standard') {
            animatePlayhead();
          }
        } else {
          Tone.Transport.bpm.value = newTempo;
          timeMapCalculator?.reapplyConfiguredLoopBounds(stateCallbacks.getState().isLooping);
          timeMapCalculator?.calculate(stateCallbacks.getState());
        }
      };
      const loopingHandler = (isLooping: boolean) => {
        Tone.Transport.loop = isLooping;
        const loopStartSeconds = Tone.Time(Tone.Transport.loopStart).toSeconds();
        const loopEndSeconds = Tone.Time(Tone.Transport.loopEnd).toSeconds();

        if (isLooping && loopEndSeconds <= loopStartSeconds && timeMapCalculator) {
          Tone.Transport.loopEnd = loopStartSeconds + Math.max(timeMapCalculator.getMicrobeatDuration(stateCallbacks.getState().tempo), 0.001);
        }

        if (isLooping && timeMapCalculator) {
          timeMapCalculator.setConfiguredLoopBounds(
            Tone.Time(Tone.Transport.loopStart).toSeconds(),
            Tone.Time(Tone.Transport.loopEnd).toSeconds()
          );
        } else {
          timeMapCalculator?.clearConfiguredLoopBounds();
        }
      };

      eventCallbacks.on('rhythmStructureChanged', rhythmHandler);
      eventCallbacks.on('notesChanged', notesHandler);
      eventCallbacks.on('sixteenthStampPlacementsChanged', stampsHandler);
      eventCallbacks.on('tempoModulationMarkersChanged', modulationHandler);
      eventCallbacks.on('layoutConfigChanged', layoutHandler);
      eventCallbacks.on('tempoChanged', tempoHandler);
      eventCallbacks.on('loopingChanged', loopingHandler);

      // Store cleanup functions
      eventCleanups.push(
        () => {}, // These would be off() calls if the event system supports them
      );

      // Handle Transport stop event
      Tone.Transport.on('stop', () => {
        log.info('TransportService', "Tone.Transport 'stop' fired. Resetting playback state");
        eventCallbacks.setPlaybackState?.(false, false);
        visualCallbacks?.clearAdsrVisuals?.();
        if (playheadAnimationFrame) {
          cancelAnimationFrame(playheadAnimationFrame);
          playheadAnimationFrame = null;
        }
      });

      log.info('TransportService', 'Initialized');
    },

    handleStateChange(): void {
      const transportState = Tone.Transport.state;

      if (transportState === 'started') {
        log.debug('TransportService', 'handleStateChange: Notes or rhythm changed during playback. Rescheduling');
        const currentPosition = Tone.Transport.position;
        Tone.Transport.pause();
        scheduleNotes();
        Tone.Transport.start(undefined, currentPosition);
      } else {
        timeMapCalculator?.calculate(stateCallbacks.getState());
      }
    },

    start(): void {
      log.info('TransportService', 'Starting playback');

      const init = audioInit || (() => Tone.start());
      void init().then(() => {
        scheduleNotes();

        const state = stateCallbacks.getState();
        const currentTimeMap = timeMapCalculator?.getTimeMap() ?? [];
        const musicalDuration = timeMapCalculator?.getMusicalEndTime() ?? 0;
        const loopStart = timeMapCalculator?.findNonAnacrusisStart(state) ?? 0;

        timeMapCalculator?.setLoopBounds(loopStart, musicalDuration, state.tempo);
        Tone.Transport.bpm.value = state.tempo;

        const startTime = Tone.now() + 0.1;
        Tone.Transport.start(startTime, 0);

        // In standard mode, animate playhead here. In highway mode, the highway service handles visuals
        if (playbackMode === 'standard') {
          animatePlayhead();
        }

        eventCallbacks.emit('playbackStarted');
      });
    },

    resume(): void {
      log.info('TransportService', 'Resuming playback');

      const init = audioInit || (() => Tone.start());
      void init().then(() => {
        Tone.Transport.start();

        // In standard mode, animate playhead here. In highway mode, the highway service handles visuals
        if (playbackMode === 'standard') {
          animatePlayhead();
        }

        eventCallbacks.emit('playbackResumed');
      });
    },

    pause(): void {
      log.info('TransportService', 'Pausing playback');
      Tone.Transport.pause();

      if (playheadAnimationFrame) {
        cancelAnimationFrame(playheadAnimationFrame);
        playheadAnimationFrame = null;
      }

      eventCallbacks.emit('playbackPaused');
    },

    stop(): void {
      log.info('TransportService', 'Stopping playback and clearing visuals');

      shouldAnimatePlayhead = false;
      if (playheadAnimationFrame) {
        cancelAnimationFrame(playheadAnimationFrame);
        playheadAnimationFrame = null;
      }

      Tone.Transport.stop();
      Tone.Transport.cancel();
      drumManager?.reset();

      const state = stateCallbacks.getState();
      Tone.Transport.bpm.value = state.tempo;
      timeMapCalculator?.reapplyConfiguredLoopBounds(state.isLooping);

      synthEngine.releaseAll();

      // Clear visuals
      visualCallbacks?.clearPlayheadCanvas?.();
      visualCallbacks?.clearDrumPlayheadCanvas?.();
      visualCallbacks?.updateBeatLineHighlight?.(0, 0, false);

      eventCallbacks.emit('playbackStopped');
    },

    dispose(): void {
      this.stop();
      drumManager?.dispose();
      eventCleanups.forEach(cleanup => cleanup());
      log.debug('TransportService', 'Disposed');
    }
  };

  return instance;
}
