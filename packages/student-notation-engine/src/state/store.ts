/**
 * State Store Factory
 *
 * Event-emitter based state store for the notation engine.
 * This provides a clean, framework-agnostic state management system
 * that can be used both as a singleton (for backward compatibility)
 * and as factory-created instances (for the engine package).
 *
 * Key features:
 * - Event-based reactivity (on/emit/off pattern)
 * - Action methods bound to state
 * - Optional localStorage persistence
 * - Undo/redo history
 * - No DOM dependencies (storage adapter is injectable)
 */

import type { AppState, Store, TimbreState, HistoryEntry } from '@mlt/types';
import { fullRowData } from './pitchData.js';
import { getInitialState } from './initialState.js';

// Event callback type
export type EventCallback<T = unknown> = (data: T) => void;

// Unsubscribe function
export type Unsubscribe = () => void;

/**
 * Storage adapter interface for persistence
 * This allows injecting localStorage, sessionStorage, or a mock for testing
 */
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Configuration for store creation
 */
export interface StoreConfig {
  /** Storage key for persistence */
  storageKey?: string;
  /** Storage adapter (defaults to no persistence) */
  storage?: StorageAdapter;
  /** Initial state override */
  initialState?: Partial<AppState>;
  /** Callback when state should be reloaded (replaces window.location.reload) */
  onClearState?: () => void;
}

/**
 * Extended store instance with lifecycle methods
 */
export interface StoreInstance extends Store {
  /** Whether this is a cold start (no persisted state) */
  isColdStart: boolean;
  /** Dispose of the store and clean up */
  dispose(): void;
  /** Unsubscribe from an event */
  off(eventName: string, callback: EventCallback): void;
  /** Save state to storage (if configured) */
  saveState(): void;
}

// Helper to safely restore timbres, ensuring coeffs/phases are Float32Array
function restoreTimbres(timbresSnapshot: Record<string, TimbreState>): Record<string, TimbreState> {
  const newTimbres = JSON.parse(JSON.stringify(timbresSnapshot));
  for (const color in newTimbres) {
    const timbre = newTimbres[color];
    if (timbre.coeffs && typeof timbre.coeffs === 'object' && !Array.isArray(timbre.coeffs)) {
      timbre.coeffs = new Float32Array(Object.values(timbre.coeffs));
    } else if (Array.isArray(timbre.coeffs)) {
      timbre.coeffs = new Float32Array(timbre.coeffs);
    }
    if (timbre.phases && typeof timbre.phases === 'object' && !Array.isArray(timbre.phases)) {
      timbre.phases = new Float32Array(Object.values(timbre.phases));
    } else if (Array.isArray(timbre.phases)) {
      timbre.phases = new Float32Array(timbre.phases);
    }
  }
  return newTimbres;
}

/**
 * Load state from storage
 */
function loadStateFromStorage(storage: StorageAdapter | undefined, storageKey: string): Partial<AppState> | undefined {
  if (!storage) return undefined;

  try {
    const serializedState = storage.getItem(storageKey);
    if (serializedState === null) {
      return undefined;
    }
    const parsedState = JSON.parse(serializedState);

    // Convert Float32Arrays back from storage
    if (parsedState.timbres) {
      for (const color in parsedState.timbres) {
        const timbre = parsedState.timbres[color];
        if (timbre.coeffs && typeof timbre.coeffs === 'object') {
          const values = Array.isArray(timbre.coeffs) ? timbre.coeffs : Object.values(timbre.coeffs);
          timbre.coeffs = new Float32Array(values as number[]);
        }
        if (timbre.phases && typeof timbre.phases === 'object') {
          const values = Array.isArray(timbre.phases) ? timbre.phases : Object.values(timbre.phases);
          timbre.phases = new Float32Array(values as number[]);
        }
      }
    }

    // Validate pitch range
    if (parsedState.pitchRange) {
      const totalRows = fullRowData.length;
      const maxIndex = Math.max(0, totalRows - 1);
      const topIndex = Math.max(0, Math.min(maxIndex, parsedState.pitchRange.topIndex ?? 0));
      const bottomIndex = Math.max(topIndex, Math.min(maxIndex, parsedState.pitchRange.bottomIndex ?? maxIndex));
      parsedState.pitchRange = { topIndex, bottomIndex };
    }

    // Validate playhead mode
    if ('playheadMode' in parsedState) {
      const mode = parsedState.playheadMode;
      if (mode !== 'cursor' && mode !== 'microbeat' && mode !== 'macrobeat') {
        delete parsedState.playheadMode;
      }
    }

    // Ensure fullRowData is always complete
    parsedState.fullRowData = [...fullRowData];

    return parsedState;
  } catch {
    return undefined;
  }
}

/**
 * Save state to storage
 */
function saveStateToStorage(state: AppState, storage: StorageAdapter | undefined, storageKey: string): void {
  if (!storage) return;

  try {
    const stateToPersist = JSON.parse(JSON.stringify({
      placedNotes: state.placedNotes,
      placedChords: state.placedChords,
      tonicSignGroups: state.tonicSignGroups,
      sixteenthStampPlacements: state.sixteenthStampPlacements,
      tripletStampPlacements: state.tripletStampPlacements,
      timbres: state.timbres,
      macrobeatGroupings: state.macrobeatGroupings,
      macrobeatBoundaryStyles: state.macrobeatBoundaryStyles,
      hasAnacrusis: state.hasAnacrusis,
      baseMicrobeatPx: state.baseMicrobeatPx,
      modulationMarkers: state.modulationMarkers,
      tempo: state.tempo,
      activeChordIntervals: state.activeChordIntervals,
      selectedNote: state.selectedNote,
      annotations: state.annotations,
      pitchRange: state.pitchRange,
      degreeDisplayMode: state.degreeDisplayMode,
      showOctaveLabels: state.showOctaveLabels,
      longNoteStyle: state.longNoteStyle,
      playheadMode: state.playheadMode
    }));

    // Convert Float32Arrays to regular arrays for storage
    if (state.timbres) {
      for (const color in state.timbres) {
        const timbre = state.timbres[color];
        const persistTimbre = stateToPersist.timbres?.[color];
        if (timbre?.coeffs && persistTimbre) {
          persistTimbre.coeffs = Array.from(timbre.coeffs);
        }
        if (timbre?.phases && persistTimbre) {
          persistTimbre.phases = Array.from(timbre.phases);
        }
      }
    }

    const serializedState = JSON.stringify(stateToPersist);
    storage.setItem(storageKey, serializedState);
  } catch {
    // Silently fail on storage errors
  }
}

/**
 * Create a new store instance
 */
export function createStore(config: StoreConfig = {}): StoreInstance {
  const {
    storageKey = 'studentNotationState',
    storage,
    initialState: configInitialState,
    onClearState
  } = config;

  // Event subscribers
  const subscribers: Record<string, EventCallback[]> = {};

  // Load persisted state
  const persistedState = loadStateFromStorage(storage, storageKey);
  const isColdStart = !persistedState;

  // Merge initial state
  const baseInitialState = getInitialState();
  const mergedState: AppState = {
    ...baseInitialState,
    ...persistedState,
    ...configInitialState
  } as AppState;

  // Create the store object with state and event methods
  const store: StoreInstance = {
    state: mergedState,
    isColdStart,

    on(eventName: string, callback: EventCallback): void {
      if (!subscribers[eventName]) {
        subscribers[eventName] = [];
      }
      subscribers[eventName].push(callback);
    },

    off(eventName: string, callback: EventCallback): void {
      if (subscribers[eventName]) {
        const index = subscribers[eventName].indexOf(callback);
        if (index > -1) {
          subscribers[eventName].splice(index, 1);
        }
      }
    },

    emit(eventName: string, data?: unknown): void {
      if (subscribers[eventName]) {
        subscribers[eventName].forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            console.error(`Error in listener for event "${eventName}"`, error);
          }
        });
      }
    },

    dispose(): void {
      // Clear all subscribers
      for (const key in subscribers) {
        delete subscribers[key];
      }
    },

    saveState(): void {
      saveStateToStorage(store.state, storage, storageKey);
    },

    // ========== HISTORY ACTIONS ==========
    recordState(): void {
      store.state.history = store.state.history.slice(0, store.state.historyIndex + 1);

      const timbresForHistory = JSON.parse(JSON.stringify(store.state.timbres));

      const newSnapshot: HistoryEntry = {
        notes: JSON.parse(JSON.stringify(store.state.placedNotes)),
        tonicSignGroups: JSON.parse(JSON.stringify(store.state.tonicSignGroups)),
        placedChords: JSON.parse(JSON.stringify(store.state.placedChords)),
        sixteenthStampPlacements: JSON.parse(JSON.stringify(store.state.sixteenthStampPlacements)),
        tripletStampPlacements: JSON.parse(JSON.stringify(store.state.tripletStampPlacements || [])),
        timbres: timbresForHistory,
        annotations: store.state.annotations ? JSON.parse(JSON.stringify(store.state.annotations)) : [],
        lassoSelection: JSON.parse(JSON.stringify(store.state.lassoSelection))
      };
      store.state.history.push(newSnapshot);
      store.state.historyIndex++;
      store.emit('historyChanged');
      store.saveState();
    },

    undo(): void {
      if (store.state.historyIndex > 0) {
        store.state.historyIndex--;
        const snapshot = store.state.history[store.state.historyIndex];
        if (!snapshot) return;
        store.state.placedNotes = JSON.parse(JSON.stringify(snapshot.notes));
        store.state.tonicSignGroups = JSON.parse(JSON.stringify(snapshot.tonicSignGroups));
        store.state.sixteenthStampPlacements = JSON.parse(JSON.stringify(snapshot.sixteenthStampPlacements || []));
        store.state.tripletStampPlacements = JSON.parse(JSON.stringify(snapshot.tripletStampPlacements || []));
        store.state.timbres = restoreTimbres(snapshot.timbres);
        store.state.annotations = snapshot.annotations ? JSON.parse(JSON.stringify(snapshot.annotations)) : [];
        store.emit('notesChanged');
        store.emit('sixteenthStampPlacementsChanged');
        store.emit('tripletStampPlacementsChanged');
        store.emit('rhythmStructureChanged');
        if (store.state.selectedNote?.color) {
          store.emit('timbreChanged', store.state.selectedNote.color);
        }
        store.emit('annotationsChanged');
        store.emit('historyChanged');
      }
    },

    redo(): void {
      if (store.state.historyIndex < store.state.history.length - 1) {
        store.state.historyIndex++;
        const snapshot = store.state.history[store.state.historyIndex];
        if (!snapshot) return;
        store.state.placedNotes = JSON.parse(JSON.stringify(snapshot.notes));
        store.state.tonicSignGroups = JSON.parse(JSON.stringify(snapshot.tonicSignGroups));
        store.state.sixteenthStampPlacements = JSON.parse(JSON.stringify(snapshot.sixteenthStampPlacements || []));
        store.state.tripletStampPlacements = JSON.parse(JSON.stringify(snapshot.tripletStampPlacements || []));
        store.state.timbres = restoreTimbres(snapshot.timbres);
        store.state.annotations = snapshot.annotations ? JSON.parse(JSON.stringify(snapshot.annotations)) : [];
        store.emit('notesChanged');
        store.emit('sixteenthStampPlacementsChanged');
        store.emit('tripletStampPlacementsChanged');
        store.emit('rhythmStructureChanged');
        if (store.state.selectedNote?.color) {
          store.emit('timbreChanged', store.state.selectedNote.color);
        }
        store.emit('annotationsChanged');
        store.emit('historyChanged');
      }
    },

    clearSavedState(): void {
      if (storage) {
        storage.removeItem(storageKey);
        storage.removeItem('effectDialValues');
      }
      if (onClearState) {
        onClearState();
      }
    },

    // ========== VIEW ACTIONS ==========
    setPlaybackState(isPlaying: boolean, isPaused: boolean): void {
      store.state.isPlaying = isPlaying;
      store.state.isPaused = isPaused;
      store.emit('playbackStateChanged', { isPlaying, isPaused });
    },

    setLooping(isLooping: boolean): void {
      store.state.isLooping = isLooping;
      store.emit('loopingChanged', isLooping);
    },

    setTempo(tempo: number): void {
      store.state.tempo = tempo;
      store.emit('tempoChanged', tempo);
    },

    setPlayheadMode(mode: 'cursor' | 'microbeat' | 'macrobeat'): void {
      store.state.playheadMode = mode;
      store.emit('playheadModeChanged', mode);
    },

    setSelectedTool(tool: string): void {
      const oldTool = store.state.selectedTool;
      store.state.previousTool = oldTool;
      store.state.selectedTool = tool;
      store.emit('toolChanged', { newTool: tool, oldTool });
    },

    setSelectedNote(note: { shape?: string; color?: string }): void {
      const oldNote = { ...store.state.selectedNote };
      store.state.selectedNote = { ...store.state.selectedNote, ...note };
      store.emit('noteChanged', { newNote: store.state.selectedNote, oldNote });
    },

    setPitchRange(topIndex: number, bottomIndex: number): void {
      store.state.pitchRange = { topIndex, bottomIndex };
      store.emit('pitchRangeChanged', { topIndex, bottomIndex });
    },

    setDegreeDisplayMode(mode: 'off' | 'diatonic' | 'modal'): void {
      store.state.degreeDisplayMode = mode;
      store.emit('degreeDisplayModeChanged', mode);
    },

    setLongNoteStyle(style: 'style1' | 'style2'): void {
      store.state.longNoteStyle = style;
      store.emit('longNoteStyleChanged', style);
    },

    toggleAccidentalMode(type: 'sharp' | 'flat'): void {
      store.state.accidentalMode[type] = !store.state.accidentalMode[type];
      store.emit('accidentalModeChanged', store.state.accidentalMode);
    },

    toggleFrequencyLabels(): void {
      store.state.showFrequencyLabels = !store.state.showFrequencyLabels;
      store.emit('frequencyLabelsChanged', store.state.showFrequencyLabels);
    },

    toggleOctaveLabels(): void {
      store.state.showOctaveLabels = !store.state.showOctaveLabels;
      store.emit('octaveLabelsChanged', store.state.showOctaveLabels);
    },

    toggleFocusColours(): void {
      store.state.focusColours = !store.state.focusColours;
      store.emit('focusColoursChanged', store.state.focusColours);
    },

    toggleWaveformExtendedView(): void {
      store.state.waveformExtendedView = !store.state.waveformExtendedView;
      store.emit('waveformExtendedViewChanged', store.state.waveformExtendedView);
    },

    setLayoutConfig(config: Partial<AppState>): void {
      Object.assign(store.state, config);
      store.emit('layoutConfigChanged', config);
    },

    setDeviceProfile(profile: AppState['deviceProfile']): void {
      store.state.deviceProfile = profile;
      store.emit('deviceProfileChanged', profile);
    },

    setPrintPreviewActive(isActive: boolean): void {
      store.state.isPrintPreviewActive = isActive;
      store.emit('printPreviewStateChanged', isActive);
    },

    setPrintOptions(options: Partial<AppState['printOptions']>): void {
      store.state.printOptions = { ...store.state.printOptions, ...options };
      store.emit('printOptionsChanged', store.state.printOptions);
    },

    setAdsrTimeAxisScale(scale: number): void {
      store.state.adsrTimeAxisScale = scale;
      store.emit('adsrTimeAxisScaleChanged', scale);
    },

    setAdsrComponentWidth(): void {
      // Placeholder - implementation depends on app-specific logic
    },

    shiftGridUp(): void {
      // Placeholder - implementation depends on app-specific logic
    },

    shiftGridDown(): void {
      // Placeholder - implementation depends on app-specific logic
    },

    setGridPosition(): void {
      // Placeholder - implementation depends on app-specific logic
    },

    setKeySignature(key?: string): void {
      store.state.keySignature = key;
      store.emit('keySignatureChanged', key);
    },

    // ========== HARMONY ACTIONS ==========
    setActiveChordIntervals(intervals: string[]): void {
      store.state.activeChordIntervals = intervals;
      store.emit('activeChordIntervalsChanged', intervals);
    },

    setIntervalsInversion(isInverted: boolean): void {
      store.state.isIntervalsInverted = isInverted;
      store.emit('intervalsInversionChanged', isInverted);
    },

    setChordPosition(position: number): void {
      store.state.chordPositionState = position;
      store.emit('chordPositionChanged', position);
    },

    // ========== TIMBRE ACTIONS ==========
    setADSR(color: string, adsr: Partial<AppState['timbres'][string]['adsr']>): void {
      if (store.state.timbres[color]) {
        store.state.timbres[color].adsr = { ...store.state.timbres[color].adsr, ...adsr };
        store.emit('timbreChanged', color);
      }
    },

    setHarmonicCoefficients(color: string, coeffs: Float32Array): void {
      if (store.state.timbres[color]) {
        store.state.timbres[color].coeffs = coeffs;
        store.emit('timbreChanged', color);
      }
    },

    setHarmonicPhases(color: string, phases: Float32Array): void {
      if (store.state.timbres[color]) {
        store.state.timbres[color].phases = phases;
        store.emit('timbreChanged', color);
      }
    },

    setFilterSettings(color: string, settings: Partial<AppState['timbres'][string]['filter']>): void {
      if (store.state.timbres[color]) {
        store.state.timbres[color].filter = { ...store.state.timbres[color].filter, ...settings };
        store.emit('timbreChanged', color);
      }
    },

    applyPreset(color: string, preset: Partial<AppState['timbres'][string]>): void {
      if (store.state.timbres[color]) {
        Object.assign(store.state.timbres[color], preset);
        store.emit('timbreChanged', color);
      }
    },

    // ========== PLACEHOLDER ACTIONS ==========
    // These will be implemented when the full action modules are extracted
    addNote: () => null,
    updateNoteTail: () => {},
    updateMultipleNoteTails: () => {},
    updateNoteRow: () => {},
    updateMultipleNoteRows: () => {},
    updateNotePosition: () => {},
    updateMultipleNotePositions: () => {},
    removeNote: () => {},
    removeMultipleNotes: () => {},
    clearAllNotes: () => {},
    loadNotes: () => {},
    eraseInPitchArea: () => false,
    eraseTonicSignAt: () => false,
    addTonicSignGroup: () => {},
    increaseMacrobeatCount: () => {},
    decreaseMacrobeatCount: () => {},
    updateTimeSignature: () => {},
    setAnacrusis: () => {},
    addModulationMarker: () => null,
    removeModulationMarker: () => {},
    moveModulationMarker: () => {},
    setModulationRatio: () => {},
    toggleModulationMarker: () => {},
    clearModulationMarkers: () => {},
    toggleMacrobeatGrouping: () => {},
    cycleMacrobeatBoundaryStyle: () => {},
    addSixteenthStampPlacement: () => ({}) as ReturnType<Store['addSixteenthStampPlacement']>,
    removeSixteenthStampPlacement: () => false,
    eraseSixteenthStampsInArea: () => false,
    getAllSixteenthStampPlacements: () => [],
    getSixteenthStampAt: () => null,
    clearAllSixteenthStamps: () => {},
    getSixteenthStampPlaybackData: () => [],
    updateSixteenthStampShapeOffset: () => {},
    getSixteenthStampShapeRow: () => 0,
    addTripletStampPlacement: () => ({}) as ReturnType<Store['addTripletStampPlacement']>,
    removeTripletStampPlacement: () => false,
    eraseTripletStampsInArea: () => false,
    getAllTripletStampPlacements: () => [],
    getTripletStampAt: () => null,
    clearAllTripletStamps: () => {},
    getTripletStampPlaybackData: () => [],
    updateTripletStampShapeOffset: () => {},
    getTripletStampShapeRow: () => 0,

    // Internal helper
    _isBoundaryInAnacrusis: () => false
  };

  // Set up automatic persistence on key events
  if (storage) {
    store.on('tempoChanged', () => store.saveState());
    store.on('degreeDisplayModeChanged', () => store.saveState());
    store.on('longNoteStyleChanged', () => store.saveState());
    store.on('playheadModeChanged', () => store.saveState());
  }

  // Save initial state if cold start
  if (isColdStart && storage) {
    store.saveState();
  }

  return store;
}
