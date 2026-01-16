/**
 * Time Map Calculator
 *
 * Calculates the mapping between grid columns and playback time.
 * Handles modulation adjustments and tonic column time skipping.
 */

import * as Tone from 'tone';
import store from '@state/initStore.ts';
import { getPlacedTonicSigns, getMacrobeatInfo } from '@state/selectors.ts';
import logger from '@utils/logger.ts';
import { getTonicSpanColumnIndices } from '@utils/tonicColumnUtils.ts';
import { updatePlayheadModel } from '@services/playheadModel.ts';
import type { LoopBounds } from './types.ts';

/** Internal time map state */
let timeMap: number[] = [];
let cachedMusicalEndTime = 0;

/** Configured loop boundaries */
let configuredLoopStart = 0;
let configuredLoopEnd = 0;

const LOOP_EPSILON = 1e-4;

/**
 * Get the duration of one microbeat in seconds based on current tempo.
 */
export function getMicrobeatDuration(): number {
  const tempo = store.state.tempo;
  const microbeatBPM = tempo * 2;
  return 60 / microbeatBPM;
}

/**
 * Find the time where the non-anacrusis section starts.
 * Returns 0 if no anacrusis is configured.
 */
export function findNonAnacrusisStart(): number {
  if (!store.state.hasAnacrusis) {
    logger.debug('TransportService', '[ANACRUSIS] No anacrusis, starting from time 0');
    return 0;
  }

  // Find the first solid boundary which marks the end of anacrusis
  for (let i = 0; i < store.state.macrobeatBoundaryStyles.length; i++) {
    if (store.state.macrobeatBoundaryStyles[i] === 'solid') {
      const macrobeatInfo = getMacrobeatInfo(store.state, i + 1);
      if (macrobeatInfo) {
        const startTime = timeMap[macrobeatInfo.startColumn] || 0;
        logger.debug('TransportService', `[ANACRUSIS] Found solid boundary at macrobeat ${i}, non-anacrusis starts at column ${macrobeatInfo.startColumn}, time ${startTime.toFixed(3)}s`);
        return startTime;
      }
    }
  }

  logger.debug('TransportService', '[ANACRUSIS] No solid boundary found, starting from time 0');
  return 0;
}

/**
 * Reapply configured loop bounds to Tone.Transport if they've drifted.
 */
export function reapplyConfiguredLoopBounds(): void {
  if (configuredLoopEnd > configuredLoopStart) {
    const loopStartSeconds = Tone.Time(Tone.Transport.loopStart).toSeconds();
    const loopEndSeconds = Tone.Time(Tone.Transport.loopEnd).toSeconds();
    const loopStartDiff = Math.abs(loopStartSeconds - configuredLoopStart);
    const loopEndDiff = Math.abs(loopEndSeconds - configuredLoopEnd);
    if (loopStartDiff > LOOP_EPSILON || loopEndDiff > LOOP_EPSILON) {
      Tone.Transport.loopStart = configuredLoopStart;
      Tone.Transport.loopEnd = configuredLoopEnd;
    }
    if (Tone.Transport.loop !== store.state.isLooping) {
      Tone.Transport.loop = store.state.isLooping;
    }
  }
}

/**
 * Set loop bounds for playback.
 */
export function setLoopBounds(loopStart: number, loopEnd: number): void {
  const minDuration = Math.max(getMicrobeatDuration(), 0.001);
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
  reapplyConfiguredLoopBounds();
}

/**
 * Update loop bounds based on current timeline.
 */
export function updateLoopBoundsFromTimeline(): void {
  const loopStart = findNonAnacrusisStart();
  const loopEnd = getMusicalEndTime();
  setLoopBounds(loopStart, loopEnd);
}

/**
 * Get the configured loop bounds.
 */
export function getConfiguredLoopBounds(): LoopBounds {
  return { loopStart: configuredLoopStart, loopEnd: configuredLoopEnd };
}

/**
 * Set configured loop bounds directly (used when looping changes).
 */
export function setConfiguredLoopBounds(loopStart: number, loopEnd: number): void {
  configuredLoopStart = loopStart;
  configuredLoopEnd = loopEnd;
}

/**
 * Clear configured loop bounds.
 */
export function clearConfiguredLoopBounds(): void {
  configuredLoopStart = 0;
  configuredLoopEnd = 0;
}

/**
 * Calculate the regular (non-modulated) time map.
 */
function calculateRegularTimeMap(
  microbeatDuration: number,
  columnWidths: number[],
  placedTonicSigns: ReturnType<typeof getPlacedTonicSigns>
): void {
  let currentTime = 0;

  logger.debug('TransportService', '[TIMEMAP] Building timeMap', {
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
      logger.debug('TransportService', `[TIMEMAP] Column ${i} is tonic, not advancing time`);
    }

    if (i < 5) {
      const entry = timeMap[i];
      if (entry !== undefined) {
        logger.debug('TransportService', `[TIMEMAP] timeMap[${i}] = ${entry.toFixed(3)}s (isTonic: ${isTonicColumn})`);
      }
    }
  }

  if (totalColumns > 0) {
    timeMap[totalColumns] = currentTime;
  }

  logger.debug('TransportService', `[TIMEMAP] Complete. Total columns: ${totalColumns}, Final time: ${currentTime.toFixed(3)}s`);
}

/**
 * Calculate and cache the modulation-adjusted musical end time.
 */
export function calculateMusicalEndTime(): void {
  const baseEndTime = timeMap.length > 0 ? (timeMap[timeMap.length - 1] ?? 0) : 0;

  if (!Number.isFinite(baseEndTime) || baseEndTime === 0) {
    cachedMusicalEndTime = 0;
    return;
  }

  const tempoModulationMarkers = store.state.tempoModulationMarkers?.filter(m => m.active) || [];

  if (tempoModulationMarkers.length === 0) {
    cachedMusicalEndTime = baseEndTime;
    return;
  }

  const sortedMarkers = [...tempoModulationMarkers].sort((a, b) => a.measureIndex - b.measureIndex);
  let adjustedEndTime = baseEndTime;

  for (const marker of sortedMarkers) {
    const macrobeatInfo = getMacrobeatInfo(store.state, marker.measureIndex);

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

/**
 * Get the cached musical end time.
 */
export function getMusicalEndTime(): number {
  return cachedMusicalEndTime;
}

/**
 * Get the current time map array.
 */
export function getTimeMap(): number[] {
  return timeMap;
}

/**
 * Apply modulation to a time value based on active modulation markers.
 */
export function applyModulationToTime(baseTime: number, columnIndex: number): number {
  const tempoModulationMarkers = store.state.tempoModulationMarkers?.filter(m => m.active) || [];

  if (tempoModulationMarkers.length === 0) {
    return baseTime;
  }

  const sortedMarkers = [...tempoModulationMarkers].sort((a, b) => a.measureIndex - b.measureIndex);
  let adjustedTime = baseTime;

  if (columnIndex < 5) {
    logger.debug('TransportService', `[MODULATION] Column ${columnIndex}: baseTime ${baseTime.toFixed(3)}s, ${sortedMarkers.length} active markers`);
  }

  for (const marker of sortedMarkers) {
    const macrobeatInfo = getMacrobeatInfo(store.state, marker.measureIndex);

    if (macrobeatInfo) {
      const modulationStartColumn = macrobeatInfo.endColumn;

      if (columnIndex > modulationStartColumn) {
        const modulationStartTime = timeMap[modulationStartColumn] !== undefined ? timeMap[modulationStartColumn] : 0;
        const deltaTime = baseTime - modulationStartTime;
        const modulatedDelta = deltaTime * marker.ratio;
        adjustedTime = adjustedTime - deltaTime + modulatedDelta;

        if (columnIndex < 5) {
          logger.debug('TransportService', `[MODULATION] Column ${columnIndex}: Applied marker at measure ${marker.measureIndex} (col ${modulationStartColumn}), ratio ${marker.ratio}, adjustedTime ${adjustedTime.toFixed(3)}s`);
        }
      }
    }
  }

  return adjustedTime;
}

/**
 * Main function to calculate the time map.
 * Called when rhythm structure, notes, or tempo changes.
 */
export function calculateTimeMap(): void {
  logger.debug('transportService', 'calculateTimeMap', { tempo: `${store.state.tempo} BPM` });
  timeMap = [];

  const microbeatDuration = getMicrobeatDuration();
  const { columnWidths } = store.state;
  const placedTonicSigns = getPlacedTonicSigns(store.state);
  const musicalColumnWidths = columnWidths;

  calculateRegularTimeMap(microbeatDuration, musicalColumnWidths, placedTonicSigns);

  logger.timing('transportService', 'calculateTimeMap', { totalDuration: `${timeMap[timeMap.length - 1]?.toFixed(2)}s` });

  calculateMusicalEndTime();
  const musicalEnd = getMusicalEndTime();

  updatePlayheadModel({
    timeMap,
    musicalEndTime: musicalEnd,
    columnWidths: store.state.columnWidths,
    cellWidth: store.state.cellWidth
  });

  if (typeof window !== 'undefined') {
    window.__transportTimeMap = [...timeMap];
    window.__transportMusicalEnd = musicalEnd.toString();
  }
}
