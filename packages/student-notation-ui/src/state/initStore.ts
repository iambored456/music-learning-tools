/**
 * Store Initialization
 *
 * Initializes the application store using the @mlt/student-notation-engine
 * package's createStore() factory with app-specific configuration.
 */

import {
  createStore,
  fullRowData,
  type StoreInstance,
  type StorageAdapter,
  type ColumnMap
} from '@mlt/student-notation-engine';

import type { AppState, MacrobeatGrouping } from '@app-types/state.js';
import logger from '@utils/logger.ts';

logger.moduleLoaded('EngineStore', 'general');

/**
 * Creates an empty column map for use as a fallback before columnMapService is registered.
 */
function createEmptyColumnMap(): ColumnMap {
  return {
    entries: [],
    visualToCanvas: new Map(),
    visualToTime: new Map(),
    canvasToVisual: new Map(),
    canvasToTime: new Map(),
    timeToCanvas: new Map(),
    timeToVisual: new Map(),
    macrobeatBoundaries: [],
    totalVisualColumns: 0,
    totalCanvasColumns: 0,
    totalTimeColumns: 0,
    totalWidthUnmodulated: 0
  };
}

const STORAGE_KEY = 'studentNotationState';

// Create localStorage adapter
const localStorageAdapter: StorageAdapter = {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => localStorage.setItem(key, value),
  removeItem: (key: string) => localStorage.removeItem(key)
};

// Log wrapper for engine callbacks
const logWrapper = (
  level: 'debug' | 'info' | 'warn' | 'error',
  context: string,
  message: string,
  data?: unknown,
  category?: string
) => {
  const logCategory = category || 'general';
  switch (level) {
    case 'debug':
      logger.debug(context, message, data, logCategory);
      break;
    case 'info':
      logger.info(context, message, data, logCategory);
      break;
    case 'warn':
      logger.warn(context, message, data, logCategory);
      break;
    case 'error':
      logger.error(context, message, data, logCategory);
      break;
  }
};

// Placeholder callbacks - these will be wired up after services are initialized
// The column map service will be registered later via registerColumnMapCallbacks()
let columnMapServiceCallbacks: {
  getColumnMap?: (state: AppState) => ColumnMap;
  visualToTimeIndex?: (state: AppState, visualIndex: number, groupings: MacrobeatGrouping[]) => number | null;
  timeIndexToVisualColumn?: (state: AppState, timeIndex: number, groupings: MacrobeatGrouping[]) => number | null;
  getTimeBoundaryAfterMacrobeat?: (state: AppState, index: number, groupings: MacrobeatGrouping[]) => number;
} = {};

/**
 * Register column map service callbacks after the service is initialized.
 * This allows the store to be created before the column map service.
 */
export function registerColumnMapCallbacks(callbacks: typeof columnMapServiceCallbacks): void {
  columnMapServiceCallbacks = callbacks;
  logger.info('EngineStore', 'Column map callbacks registered');
}

// Create the store with engine's factory
const store: StoreInstance = createStore({
  storageKey: STORAGE_KEY,
  storage: localStorageAdapter,
  onClearState: () => {
    // App-specific behavior: reload the page when state is cleared
    localStorage.removeItem('effectDialValues');
    window.location.reload();
  },
  noteActionCallbacks: {
    getMacrobeatInfo: (state, index) => {
      // This will be provided by column map service
      // For now, return a basic calculation
      const groupings = state.macrobeatGroupings || [];
      let startColumn = 0;
      for (let i = 0; i < index && i < groupings.length; i++) {
        startColumn += groupings[i] || 2;
      }
      const endColumn = startColumn + (groupings[index] || 2) - 1;
      return { startColumn, endColumn };
    },
    log: (level, message, data) => logWrapper(level, 'noteActions', message, data)
  },
  rhythmActionCallbacks: {
    getColumnMap: (state) => {
      if (columnMapServiceCallbacks.getColumnMap) {
        return columnMapServiceCallbacks.getColumnMap(state);
      }
      // Return empty column map if service not yet registered
      return createEmptyColumnMap();
    },
    visualToTimeIndex: (state, visualIndex, groupings) => {
      if (columnMapServiceCallbacks.visualToTimeIndex) {
        return columnMapServiceCallbacks.visualToTimeIndex(state, visualIndex, groupings);
      }
      // Fallback: assume 1:1 mapping (will be replaced when service registers)
      return visualIndex;
    },
    timeIndexToVisualColumn: (state, timeIndex, groupings) => {
      if (columnMapServiceCallbacks.timeIndexToVisualColumn) {
        return columnMapServiceCallbacks.timeIndexToVisualColumn(state, timeIndex, groupings);
      }
      // Fallback: assume 1:1 mapping
      return timeIndex;
    },
    getTimeBoundaryAfterMacrobeat: (state, index, groupings) => {
      if (columnMapServiceCallbacks.getTimeBoundaryAfterMacrobeat) {
        return columnMapServiceCallbacks.getTimeBoundaryAfterMacrobeat(state, index, groupings);
      }
      // Fallback calculation
      let boundary = 0;
      for (let i = 0; i <= index && i < groupings.length; i++) {
        boundary += groupings[i] || 2;
      }
      return boundary;
    },
    log: logWrapper
  },
  sixteenthStampActionCallbacks: {
    log: (level, message, data) => logWrapper(level, 'sixteenthStampActions', message, data)
  },
  tripletStampActionCallbacks: {
    canvasToTime: (canvasIndex, map) => {
      return map.canvasToTime.get(canvasIndex) ?? null;
    },
    timeToCanvas: (timeIndex, map) => {
      return map.timeToCanvas.get(timeIndex) ?? timeIndex;
    },
    getColumnMap: (state) => {
      if (columnMapServiceCallbacks.getColumnMap) {
        return columnMapServiceCallbacks.getColumnMap(state);
      }
      return createEmptyColumnMap();
    },
    log: (level, message, data) => logWrapper(level, 'tripletStampActions', message, data)
  }
});

// Re-export fullRowData for backward compatibility
export { fullRowData };

// Export the store as default for backward compatibility
export default store;
