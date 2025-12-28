/**
 * Time Map Calculator
 *
 * Calculates the mapping between grid columns and playback time.
 * Handles modulation adjustments and tonic column time skipping.
 *
 * Framework-agnostic - accepts state and callbacks as parameters.
 */

import * as Tone from 'tone';
import type {
  LoopBounds,
  TimeMapConfig,
  TimeMapState,
  MacrobeatInfo,
  PlacedTonicSign,
  TransportLogger,
  GetMacrobeatInfoCallback,
  GetPlacedTonicSignsCallback,
  UpdatePlayheadModelCallback
} from './types.js';

const LOOP_EPSILON = 1e-4;

/**
 * Configuration for time map calculator instance
 */
export interface TimeMapCalculatorConfig {
  /** Function to get macrobeat info by index */
  getMacrobeatInfo: GetMacrobeatInfoCallback;
  /** Function to get placed tonic signs */
  getPlacedTonicSigns: GetPlacedTonicSignsCallback;
  /** Function to get tonic span column indices from placed tonic signs */
  getTonicSpanColumnIndices: (tonicSigns: PlacedTonicSign[]) => Set<number>;
  /** Optional callback to update playhead model */
  updatePlayheadModel?: UpdatePlayheadModelCallback;
  /** Optional logger */
  logger?: TransportLogger;
}

/**
 * Time map calculator instance
 */
export interface TimeMapCalculatorInstance {
  /** Get the duration of one microbeat in seconds */
  getMicrobeatDuration(tempo: number): number;
  /** Calculate the time map from state */
  calculate(state: TimeMapState): void;
  /** Get the current time map */
  getTimeMap(): number[];
  /** Get the cached musical end time */
  getMusicalEndTime(): number;
  /** Find the time where non-anacrusis section starts */
  findNonAnacrusisStart(state: TimeMapState): number;
  /** Apply modulation to a time value */
  applyModulationToTime(baseTime: number, columnIndex: number, state: TimeMapState): number;
  /** Set loop bounds on Tone.Transport */
  setLoopBounds(loopStart: number, loopEnd: number, tempo: number): void;
  /** Get configured loop bounds */
  getConfiguredLoopBounds(): LoopBounds;
  /** Set configured loop bounds directly */
  setConfiguredLoopBounds(loopStart: number, loopEnd: number): void;
  /** Clear configured loop bounds */
  clearConfiguredLoopBounds(): void;
  /** Reapply configured loop bounds if they've drifted */
  reapplyConfiguredLoopBounds(isLooping: boolean): void;
  /** Update loop bounds from current timeline */
  updateLoopBoundsFromTimeline(state: TimeMapState): void;
}

/**
 * Create a time map calculator instance.
 */
export function createTimeMapCalculator(config: TimeMapCalculatorConfig): TimeMapCalculatorInstance {
  const {
    getMacrobeatInfo,
    getPlacedTonicSigns,
    getTonicSpanColumnIndices,
    updatePlayheadModel,
    logger
  } = config;

  // Internal state
  let timeMap: number[] = [];
  let cachedMusicalEndTime = 0;
  let configuredLoopStart = 0;
  let configuredLoopEnd = 0;

  // Logger helper
  const log: TransportLogger = logger ?? {
    debug: () => {}
  };

  /**
   * Get the duration of one microbeat in seconds based on tempo.
   */
  function getMicrobeatDuration(tempo: number): number {
    const microbeatBPM = tempo * 2;
    return 60 / microbeatBPM;
  }

  /**
   * Calculate the regular (non-modulated) time map.
   */
  function calculateRegularTimeMap(
    microbeatDuration: number,
    columnWidths: number[],
    placedTonicSigns: PlacedTonicSign[]
  ): void {
    let currentTime = 0;

    log.debug('TimeMapCalculator', '[TIMEMAP] Building timeMap', {
      columnCount: columnWidths.length,
      tonicSignCount: placedTonicSigns.length,
      microbeatDuration
    });

    const totalColumns = columnWidths.length;
    const tonicSpanColumns = getTonicSpanColumnIndices(placedTonicSigns);

    for (let i = 0; i < totalColumns; i++) {
      timeMap[i] = currentTime;

      const isTonicColumn = tonicSpanColumns.has(i);
      if (!isTonicColumn) {
        currentTime += (columnWidths[i] || 0) * microbeatDuration;
      } else {
        log.debug('TimeMapCalculator', `[TIMEMAP] Column ${i} is tonic, not advancing time`);
      }

      if (i < 5) {
        const entry = timeMap[i];
        if (entry !== undefined) {
          log.debug('TimeMapCalculator', `[TIMEMAP] timeMap[${i}] = ${entry.toFixed(3)}s (isTonic: ${isTonicColumn})`);
        }
      }
    }

    if (totalColumns > 0) {
      timeMap[totalColumns] = currentTime;
    }

    log.debug('TimeMapCalculator', `[TIMEMAP] Complete. Total columns: ${totalColumns}, Final time: ${currentTime.toFixed(3)}s`);
  }

  /**
   * Calculate and cache the modulation-adjusted musical end time.
   */
  function calculateMusicalEndTime(state: TimeMapState): void {
    const baseEndTime = timeMap.length > 0 ? (timeMap[timeMap.length - 1] ?? 0) : 0;

    if (!Number.isFinite(baseEndTime) || baseEndTime === 0) {
      cachedMusicalEndTime = 0;
      return;
    }

    const modulationMarkers = state.modulationMarkers?.filter(m => m.active) || [];

    if (modulationMarkers.length === 0) {
      cachedMusicalEndTime = baseEndTime;
      return;
    }

    const sortedMarkers = [...modulationMarkers].sort((a, b) => a.measureIndex - b.measureIndex);
    let adjustedEndTime = baseEndTime;

    for (const marker of sortedMarkers) {
      const macrobeatInfo = getMacrobeatInfo(marker.measureIndex);

      if (macrobeatInfo) {
        const modulationStartColumn = macrobeatInfo.endColumn - 1;
        const modulationStartTime = timeMap[modulationStartColumn] ?? baseEndTime;
        const remainingBaseTime = baseEndTime - modulationStartTime;
        const stretchedTime = remainingBaseTime * marker.ratio;
        adjustedEndTime = adjustedEndTime - remainingBaseTime + stretchedTime;
      }
    }

    cachedMusicalEndTime = adjustedEndTime;
  }

  return {
    getMicrobeatDuration,

    calculate(state: TimeMapState): void {
      log.debug('TimeMapCalculator', 'calculate', { tempo: `${state.tempo} BPM` });
      timeMap = [];

      const microbeatDuration = getMicrobeatDuration(state.tempo);
      const { columnWidths } = state;
      const placedTonicSigns = getPlacedTonicSigns();

      calculateRegularTimeMap(microbeatDuration, columnWidths, placedTonicSigns);

      log.timing?.('TimeMapCalculator', 'calculate', { totalDuration: `${timeMap[timeMap.length - 1]?.toFixed(2)}s` });

      calculateMusicalEndTime(state);
      const musicalEnd = cachedMusicalEndTime;

      updatePlayheadModel?.({
        timeMap,
        musicalEndTime: musicalEnd,
        columnWidths: state.columnWidths,
        cellWidth: state.cellWidth
      });
    },

    getTimeMap(): number[] {
      return timeMap;
    },

    getMusicalEndTime(): number {
      return cachedMusicalEndTime;
    },

    findNonAnacrusisStart(state: TimeMapState): number {
      if (!state.hasAnacrusis) {
        log.debug('TimeMapCalculator', '[ANACRUSIS] No anacrusis, starting from time 0');
        return 0;
      }

      // Find the first solid boundary which marks the end of anacrusis
      for (let i = 0; i < state.macrobeatBoundaryStyles.length; i++) {
        if (state.macrobeatBoundaryStyles[i] === 'solid') {
          const macrobeatInfo = getMacrobeatInfo(i + 1);
          if (macrobeatInfo) {
            const startTime = timeMap[macrobeatInfo.startColumn] || 0;
            log.debug('TimeMapCalculator', `[ANACRUSIS] Found solid boundary at macrobeat ${i}, non-anacrusis starts at column ${macrobeatInfo.startColumn}, time ${startTime.toFixed(3)}s`);
            return startTime;
          }
        }
      }

      log.debug('TimeMapCalculator', '[ANACRUSIS] No solid boundary found, starting from time 0');
      return 0;
    },

    applyModulationToTime(baseTime: number, columnIndex: number, state: TimeMapState): number {
      const modulationMarkers = state.modulationMarkers?.filter(m => m.active) || [];

      if (modulationMarkers.length === 0) {
        return baseTime;
      }

      const sortedMarkers = [...modulationMarkers].sort((a, b) => a.measureIndex - b.measureIndex);
      let adjustedTime = baseTime;

      if (columnIndex < 5) {
        log.debug('TimeMapCalculator', `[MODULATION] Column ${columnIndex}: baseTime ${baseTime.toFixed(3)}s, ${sortedMarkers.length} active markers`);
      }

      for (const marker of sortedMarkers) {
        const macrobeatInfo = getMacrobeatInfo(marker.measureIndex);

        if (macrobeatInfo) {
          const modulationStartColumn = macrobeatInfo.endColumn;

          if (columnIndex > modulationStartColumn) {
            const modulationStartTime = timeMap[modulationStartColumn] !== undefined ? timeMap[modulationStartColumn] : 0;
            const deltaTime = baseTime - modulationStartTime;
            const modulatedDelta = deltaTime * marker.ratio;
            adjustedTime = adjustedTime - deltaTime + modulatedDelta;

            if (columnIndex < 5) {
              log.debug('TimeMapCalculator', `[MODULATION] Column ${columnIndex}: Applied marker at measure ${marker.measureIndex} (col ${modulationStartColumn}), ratio ${marker.ratio}, adjustedTime ${adjustedTime.toFixed(3)}s`);
            }
          }
        }
      }

      return adjustedTime;
    },

    setLoopBounds(loopStart: number, loopEnd: number, tempo: number): void {
      const microbeatDuration = getMicrobeatDuration(tempo);
      const minDuration = Math.max(microbeatDuration, 0.001);
      const safeStart = Number.isFinite(loopStart) ? loopStart : 0;
      let safeEnd = Number.isFinite(loopEnd) ? loopEnd : safeStart + minDuration;
      if (safeEnd <= safeStart) {
        safeEnd = safeStart + minDuration;
      }
      configuredLoopStart = safeStart;
      configuredLoopEnd = safeEnd;

      if (Tone?.Transport) {
        Tone.Transport.loopStart = safeStart;
        Tone.Transport.loopEnd = safeEnd;
      }
    },

    getConfiguredLoopBounds(): LoopBounds {
      return { loopStart: configuredLoopStart, loopEnd: configuredLoopEnd };
    },

    setConfiguredLoopBounds(loopStart: number, loopEnd: number): void {
      configuredLoopStart = loopStart;
      configuredLoopEnd = loopEnd;
    },

    clearConfiguredLoopBounds(): void {
      configuredLoopStart = 0;
      configuredLoopEnd = 0;
    },

    reapplyConfiguredLoopBounds(isLooping: boolean): void {
      if (configuredLoopEnd > configuredLoopStart) {
        const loopStartSeconds = Tone.Time(Tone.Transport.loopStart).toSeconds();
        const loopEndSeconds = Tone.Time(Tone.Transport.loopEnd).toSeconds();
        const loopStartDiff = Math.abs(loopStartSeconds - configuredLoopStart);
        const loopEndDiff = Math.abs(loopEndSeconds - configuredLoopEnd);
        if (loopStartDiff > LOOP_EPSILON || loopEndDiff > LOOP_EPSILON) {
          Tone.Transport.loopStart = configuredLoopStart;
          Tone.Transport.loopEnd = configuredLoopEnd;
        }
        if (Tone.Transport.loop !== isLooping) {
          Tone.Transport.loop = isLooping;
        }
      }
    },

    updateLoopBoundsFromTimeline(state: TimeMapState): void {
      const loopStart = this.findNonAnacrusisStart(state);
      const loopEnd = cachedMusicalEndTime;
      this.setLoopBounds(loopStart, loopEnd, state.tempo);
    }
  };
}
