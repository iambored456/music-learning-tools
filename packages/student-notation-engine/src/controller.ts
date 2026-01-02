/**
 * Student Notation Engine - Public Controller API
 *
 * This is the main public interface for the engine. It provides a clean,
 * framework-agnostic API for UI components and tutorial systems to control
 * the notation editor.
 *
 * IMPORTANT: This controller does NOT depend on DOM IDs or any specific UI framework.
 * Canvas contexts and other DOM refs should be passed in during initialization.
 */

import type {
  AppState,
  PlacedNote,
  NoteShape,
  PitchRange,
  ADSREnvelope,
  FilterSettings,
  LassoSelection,
  DegreeDisplayMode,
  PlayheadMode,
  LongNoteStyle,
  CanvasSpaceColumn,
  ModulationRatio,
  SixteenthStampPlacement,
  TripletStampPlacement,
} from '@mlt/types';

import { createStore, type StoreInstance, type StorageAdapter } from './state/store.js';
import { createColumnMapService, visualToTime, timeToVisual, getTimeBoundaryAfterMacrobeat } from './services/columnMapService.js';
import { renderPitchGrid, renderDrumGrid } from './canvas/index.js';
import type { PitchGridRenderOptions, DrumGridRenderOptions } from './canvas/index.js';

/**
 * Configuration for engine initialization
 */
export interface EngineConfig {
  /** Canvas context for the pitch grid */
  pitchGridContext?: CanvasRenderingContext2D;
  /** Canvas context for the pitch grid playhead */
  pitchPlayheadContext?: CanvasRenderingContext2D;
  /** Canvas context for the pitch grid hover indicator */
  pitchHoverContext?: CanvasRenderingContext2D;
  /** Canvas context for the drum grid */
  drumGridContext?: CanvasRenderingContext2D;
  /** Canvas context for the drum grid playhead */
  drumPlayheadContext?: CanvasRenderingContext2D;
  /** Canvas context for the drum grid hover indicator */
  drumHoverContext?: CanvasRenderingContext2D;
  /** Initial state (optional, for restoring saved state) */
  initialState?: Partial<AppState>;
  /** Storage key for localStorage persistence */
  storageKey?: string;
  /** Storage adapter (defaults to localStorage if available) */
  storage?: StorageAdapter;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Selection item for multi-select operations
 */
export interface SelectionItem {
  type: 'note' | 'sixteenthStamp' | 'tripletStamp';
  id: string;
}

/**
 * Event callback type
 */
export type EventCallback<T = unknown> = (data: T) => void;

/**
 * The main engine controller interface
 */
export interface EngineController {
  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize the engine with configuration
   */
  init(config: EngineConfig): void;

  /**
   * Dispose of the engine and clean up resources
   */
  dispose(): void;

  /**
   * Check if engine is initialized
   */
  isInitialized(): boolean;

  // ============================================================================
  // TOOL SELECTION
  // ============================================================================

  /**
   * Set the current editing tool
   */
  setTool(tool: 'note' | 'eraser' | 'chord' | 'tonic' | 'modulation' | 'sixteenth' | 'triplet'): void;

  /**
   * Get the current tool
   */
  getTool(): string;

  /**
   * Set the note shape for the note tool
   */
  setNoteShape(shape: NoteShape): void;

  /**
   * Set the note color for the note tool
   */
  setNoteColor(color: string): void;

  // ============================================================================
  // NOTE MANIPULATION
  // ============================================================================

  /**
   * Insert a new note at the specified position
   */
  insertNote(row: number, startColumn: number, endColumn?: number): PlacedNote | null;

  /**
   * Delete a note by ID
   */
  deleteNote(noteId: string): boolean;

  /**
   * Delete all selected items
   */
  deleteSelection(): void;

  /**
   * Move a note to a new position
   */
  moveNote(noteId: string, toRow: number, toColumn: number): void;

  /**
   * Update a note's tail (end column)
   */
  setNoteTail(noteId: string, endColumn: number): void;

  /**
   * Clear all notes
   */
  clearAllNotes(): void;

  // ============================================================================
  // SELECTION
  // ============================================================================

  /**
   * Set the current selection
   */
  setSelection(items: SelectionItem[]): void;

  /**
   * Clear the current selection
   */
  clearSelection(): void;

  /**
   * Select all items
   */
  selectAll(): void;

  /**
   * Get current selection
   */
  getSelection(): LassoSelection;

  /**
   * Check if there's an active selection
   */
  hasSelection(): boolean;

  // ============================================================================
  // PLAYBACK
  // ============================================================================

  /**
   * Start playback from the beginning
   */
  play(): void;

  /**
   * Pause playback
   */
  pause(): void;

  /**
   * Resume paused playback
   */
  resume(): void;

  /**
   * Stop playback and reset to beginning
   */
  stop(): void;

  /**
   * Check if currently playing
   */
  isPlaying(): boolean;

  /**
   * Check if currently paused
   */
  isPaused(): boolean;

  /**
   * Set the tempo in BPM
   */
  setTempo(bpm: number): void;

  /**
   * Get the current tempo
   */
  getTempo(): number;

  /**
   * Enable or disable looping
   */
  setLooping(enabled: boolean): void;

  /**
   * Check if looping is enabled
   */
  isLooping(): boolean;

  /**
   * Set the playhead visualization mode
   */
  setPlayheadMode(mode: PlayheadMode): void;

  // ============================================================================
  // HISTORY
  // ============================================================================

  /**
   * Undo the last action
   */
  undo(): void;

  /**
   * Redo the last undone action
   */
  redo(): void;

  /**
   * Check if undo is available
   */
  canUndo(): boolean;

  /**
   * Check if redo is available
   */
  canRedo(): boolean;

  /**
   * Record current state for undo
   */
  recordState(): void;

  // ============================================================================
  // RHYTHM STRUCTURE
  // ============================================================================

  /**
   * Add a macrobeat to the end
   */
  addMacrobeat(): void;

  /**
   * Remove the last macrobeat
   */
  removeMacrobeat(): void;

  /**
   * Set the grouping for a specific macrobeat
   */
  setMacrobeatGrouping(index: number, grouping: 2 | 3): void;

  /**
   * Toggle anacrusis (pickup measure)
   */
  toggleAnacrusis(): void;

  /**
   * Add a modulation marker
   */
  addModulationMarker(measureIndex: number, ratio: ModulationRatio): string | null;

  /**
   * Remove a modulation marker
   */
  removeModulationMarker(markerId: string): void;

  // ============================================================================
  // VIEW
  // ============================================================================

  /**
   * Set the visible pitch range
   */
  setPitchRange(topIndex: number, bottomIndex: number): void;

  /**
   * Get the current pitch range
   */
  getPitchRange(): PitchRange;

  /**
   * Set degree display mode
   */
  setDegreeDisplayMode(mode: DegreeDisplayMode): void;

  /**
   * Set the long note rendering style
   */
  setLongNoteStyle(style: LongNoteStyle): void;

  // ============================================================================
  // TIMBRE
  // ============================================================================

  /**
   * Set ADSR envelope for a timbre
   */
  setTimbreADSR(color: string, adsr: Partial<ADSREnvelope>): void;

  /**
   * Set harmonic coefficients for a timbre
   */
  setTimbreHarmonics(color: string, coeffs: number[]): void;

  /**
   * Set filter settings for a timbre
   */
  setTimbreFilter(color: string, settings: Partial<FilterSettings>): void;

  // ============================================================================
  // STATE ACCESS
  // ============================================================================

  /**
   * Get a readonly snapshot of the current state
   */
  getState(): Readonly<AppState>;

  /**
   * Get all placed notes
   */
  getNotes(): readonly PlacedNote[];

  /**
   * Get a note at a specific position
   */
  getNoteAt(row: number, column: number): PlacedNote | null;

  /**
   * Get all sixteenth stamp placements
   */
  getSixteenthStamps(): readonly SixteenthStampPlacement[];

  /**
   * Get all triplet stamp placements
   */
  getTripletStamps(): readonly TripletStampPlacement[];

  // ============================================================================
  // IMPORT/EXPORT
  // ============================================================================

  /**
   * Export the current score as CSV
   */
  exportCSV(): string;

  /**
   * Import a score from CSV
   */
  importCSV(csv: string): void;

  /**
   * Export the complete state as JSON
   */
  exportState(): string;

  /**
   * Import state from JSON
   */
  importState(json: string): void;

  // ============================================================================
  // EVENTS
  // ============================================================================

  /**
   * Subscribe to an engine event
   */
  on(event: string, callback: EventCallback): void;

  /**
   * Unsubscribe from an engine event
   */
  off(event: string, callback: EventCallback): void;

  // ============================================================================
  // RENDERING
  // ============================================================================

  /**
   * Request a re-render of all canvases
   */
  render(): void;

  /**
   * Request a re-render of the pitch grid only
   */
  renderPitchGrid(): void;

  /**
   * Request a re-render of the drum grid only
   */
  renderDrumGrid(): void;
}

/**
 * Lesson mode API for tutorials
 */
export interface LessonModeAPI {
  /**
   * Set which actions are allowed (whitelist)
   */
  setAllowedActions(actions: string[]): void;

  /**
   * Set which actions are blocked (blacklist)
   */
  setBlockedActions(actions: string[]): void;

  /**
   * Clear all action restrictions
   */
  clearActionRestrictions(): void;

  /**
   * Highlight a UI target for the user
   */
  highlightTarget(target: HighlightTarget): void;

  /**
   * Clear all highlights
   */
  clearHighlights(): void;

  /**
   * Wait for a specific action to be performed
   */
  waitForAction(action: string, timeout?: number): Promise<ActionEvent>;

  /**
   * Wait for state to match a condition
   */
  waitForState(predicate: (state: AppState) => boolean): Promise<void>;

  /**
   * Intercept and optionally block actions
   */
  onAction(action: string, handler: ActionHandler): () => void;
}

/**
 * Target for visual highlighting
 */
export type HighlightTarget =
  | { type: 'tool'; id: string }
  | { type: 'button'; id: string }
  | { type: 'cell'; row: number; column: number }
  | { type: 'note'; noteId: string }
  | { type: 'region'; x: number; y: number; width: number; height: number };

/**
 * Action event for interception
 */
export interface ActionEvent {
  action: string;
  args: unknown[];
  timestamp: number;
}

/**
 * Action handler that can block actions
 */
export type ActionHandler = (event: ActionEvent) => boolean | void | Promise<boolean | void>;

/**
 * Create a new engine controller instance
 */
export function createEngineController(): EngineController {
  let initialized = false;
  let store: StoreInstance | null = null;
  let columnMapService: ReturnType<typeof createColumnMapService> | null = null;

  // Canvas contexts
  let pitchGridContext: CanvasRenderingContext2D | null = null;
  let drumGridContext: CanvasRenderingContext2D | null = null;

  // Debug flag
  let debugMode = false;

  // Logger function
  const log = (level: 'debug' | 'info' | 'warn' | 'error', context: string, message: string, data?: unknown, category?: string) => {
    if (!debugMode && level === 'debug') return;
    const prefix = `[${category || 'engine'}:${context}]`;
    console[level](prefix, message, data || '');
  };

  // Wrapper for callback-compatible log (level, message, data) format
  const callbackLog = (level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: unknown) => {
    log(level, 'controller', message, data);
  };

  const controller: EngineController = {
    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    init(config: EngineConfig): void {
      if (initialized) {
        log('warn', 'controller', 'Engine already initialized');
        return;
      }

      debugMode = config.debug || false;
      log('info', 'controller', 'Initializing engine');

      // Store canvas contexts
      pitchGridContext = config.pitchGridContext || null;
      drumGridContext = config.drumGridContext || null;

      // Create column map service
      columnMapService = createColumnMapService({
        getPlacedTonicSigns: (state) => {
          if (!store) return [];
          const signs = [];
          for (const group of Object.values(state.tonicSignGroups || {})) {
            signs.push(...group);
          }
          return signs;
        }
      });

      // Get storage adapter (use localStorage if available and no custom adapter provided)
      let storage: StorageAdapter | undefined = config.storage;
      if (!storage && typeof window !== 'undefined' && window.localStorage) {
        storage = window.localStorage;
      }

      // Create store with all callbacks
      store = createStore({
        storageKey: config.storageKey || 'studentNotationState',
        storage,
        initialState: config.initialState,
        noteActionCallbacks: {
          log: callbackLog
        },
        rhythmActionCallbacks: {
          getColumnMap: (state) => columnMapService!.getColumnMap(state),
          visualToTimeIndex: (state, visualIndex, groupings) =>
            visualToTime(visualIndex, columnMapService!.getColumnMap(state)),
          timeIndexToVisualColumn: (state, timeIndex, groupings) =>
            timeToVisual(timeIndex, columnMapService!.getColumnMap(state)),
          getTimeBoundaryAfterMacrobeat: (state, index, groupings) =>
            getTimeBoundaryAfterMacrobeat(index, groupings),
          log: callbackLog
        },
        sixteenthStampActionCallbacks: {
          log: callbackLog
        },
        tripletStampActionCallbacks: {
          canvasToTime: (canvasIndex, map) => {
            return map.canvasToTime.get(canvasIndex) ?? null;
          },
          timeToCanvas: (timeIndex, map) => {
            return map.timeToCanvas.get(timeIndex) ?? 0;
          },
          getColumnMap: (state) => columnMapService!.getColumnMap(state),
          log: callbackLog
        }
      });

      // Subscribe to state changes to invalidate column map cache
      store.on('rhythmStructureChanged', () => {
        columnMapService?.invalidate();
      });

      store.on('notesChanged', () => {
        this.renderPitchGrid();
      });

      store.on('sixteenthStampPlacementsChanged', () => {
        this.renderDrumGrid();
      });

      store.on('tripletStampPlacementsChanged', () => {
        this.renderDrumGrid();
      });

      initialized = true;
      log('info', 'controller', 'Engine initialized successfully');

      // Initial render if canvases provided
      if (pitchGridContext || drumGridContext) {
        this.render();
      }
    },

    dispose(): void {
      if (!initialized) return;

      log('info', 'controller', 'Disposing engine');

      if (store) {
        store.dispose();
        store = null;
      }

      columnMapService = null;
      pitchGridContext = null;
      drumGridContext = null;
      initialized = false;
    },

    isInitialized(): boolean {
      return initialized;
    },

    // ============================================================================
    // TOOL SELECTION
    // ============================================================================

    setTool(tool: string): void {
      if (!store) return;
      store.setSelectedTool(tool);
    },

    getTool(): string {
      return store?.state.selectedTool || 'note';
    },

    setNoteShape(shape: NoteShape): void {
      if (!store) return;
      const currentColor = store.state.selectedNote.color;
      store.setSelectedNote(shape, currentColor);
    },

    setNoteColor(color: string): void {
      if (!store) return;
      const currentShape = store.state.selectedNote.shape as NoteShape;
      store.setSelectedNote(currentShape, color);
    },

    // ============================================================================
    // NOTE MANIPULATION
    // ============================================================================

    insertNote(row: number, startColumn: number, endColumn?: number): PlacedNote | null {
      if (!store) return null;

      const note: Partial<PlacedNote> = {
        row,
        startColumnIndex: startColumn as CanvasSpaceColumn,
        endColumnIndex: (endColumn ?? startColumn) as CanvasSpaceColumn,
        shape: store.state.selectedNote.shape as NoteShape,
        color: store.state.selectedNote.color
      };

      return store.addNote(note);
    },

    deleteNote(noteId: string): boolean {
      if (!store) return false;

      const note = store.state.placedNotes.find(n => n.uuid === noteId);
      if (!note) return false;

      store.removeNote(note);
      return true;
    },

    deleteSelection(): void {
      if (!store) return;

      const selection = store.state.lassoSelection;
      if (!selection.isActive || selection.selectedItems.length === 0) return;

      const notesToDelete = selection.selectedItems
        .filter(item => item.type === 'note')
        .map(item => store!.state.placedNotes.find(n => n.uuid === item.id))
        .filter(n => n !== undefined) as PlacedNote[];

      if (notesToDelete.length > 0) {
        store.removeMultipleNotes(notesToDelete);
      }

      // Clear selection after delete
      this.clearSelection();
    },

    moveNote(noteId: string, toRow: number, toColumn: number): void {
      if (!store) return;

      const note = store.state.placedNotes.find(n => n.uuid === noteId);
      if (!note) return;

      store.updateNoteRow(note, toRow);
      store.updateNotePosition(note, toColumn as CanvasSpaceColumn);
    },

    setNoteTail(noteId: string, endColumn: number): void {
      if (!store) return;

      const note = store.state.placedNotes.find(n => n.uuid === noteId);
      if (!note) return;

      store.updateNoteTail(note, endColumn as CanvasSpaceColumn);
    },

    clearAllNotes(): void {
      if (!store) return;
      store.clearAllNotes();
    },

    // ============================================================================
    // SELECTION
    // ============================================================================

    setSelection(items: SelectionItem[]): void {
      if (!store) return;

      // Convert to LassoSelection format - need to include full data
      const selectedItems: LassoSelection['selectedItems'] = items
        .map(item => {
          if (item.type === 'note') {
            const note = store!.state.placedNotes.find(n => n.uuid === item.id);
            if (!note) return null;
            return { type: 'note' as const, id: item.id, data: note };
          } else if (item.type === 'sixteenthStamp') {
            const stamp = store!.state.sixteenthStampPlacements.find(s => s.id === item.id);
            if (!stamp) return null;
            return { type: 'sixteenthStamp' as const, id: item.id, data: stamp };
          } else if (item.type === 'tripletStamp') {
            const stamp = store!.state.tripletStampPlacements.find(s => s.id === item.id);
            if (!stamp) return null;
            return { type: 'tripletStamp' as const, id: item.id, data: stamp };
          }
          return null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      store.state.lassoSelection = {
        isActive: selectedItems.length > 0,
        selectedItems,
        convexHull: [] // Would need to calculate from note positions
      };

      store.emit('selectionChanged', store.state.lassoSelection);
    },

    clearSelection(): void {
      if (!store) return;

      store.state.lassoSelection = {
        isActive: false,
        selectedItems: [],
        convexHull: []
      };

      store.emit('selectionChanged', store.state.lassoSelection);
    },

    selectAll(): void {
      if (!store) return;

      const items: LassoSelection['selectedItems'] = store.state.placedNotes.map(note => ({
        type: 'note' as const,
        id: note.uuid,
        data: note
      }));

      store.state.lassoSelection = {
        isActive: items.length > 0,
        selectedItems: items,
        convexHull: []
      };

      store.emit('selectionChanged', store.state.lassoSelection);
    },

    getSelection(): LassoSelection {
      return store?.state.lassoSelection || { isActive: false, selectedItems: [], convexHull: [] };
    },

    hasSelection(): boolean {
      return store?.state.lassoSelection.isActive && store.state.lassoSelection.selectedItems.length > 0 || false;
    },

    // ============================================================================
    // PLAYBACK
    // ============================================================================

    play(): void {
      if (!store) return;
      store.setPlaybackState(true, false);
      log('info', 'playback', 'Play started');
    },

    pause(): void {
      if (!store) return;
      store.setPlaybackState(true, true);
      log('info', 'playback', 'Paused');
    },

    resume(): void {
      if (!store) return;
      store.setPlaybackState(true, false);
      log('info', 'playback', 'Resumed');
    },

    stop(): void {
      if (!store) return;
      store.setPlaybackState(false, false);
      log('info', 'playback', 'Stopped');
    },

    isPlaying(): boolean {
      return store?.state.isPlaying || false;
    },

    isPaused(): boolean {
      return store?.state.isPaused || false;
    },

    setTempo(bpm: number): void {
      if (!store) return;
      store.setTempo(bpm);
    },

    getTempo(): number {
      return store?.state.tempo || 120;
    },

    setLooping(enabled: boolean): void {
      if (!store) return;
      store.setLooping(enabled);
    },

    isLooping(): boolean {
      return store?.state.isLooping || false;
    },

    setPlayheadMode(mode: PlayheadMode): void {
      if (!store) return;
      store.setPlayheadMode(mode);
    },

    // ============================================================================
    // HISTORY
    // ============================================================================

    undo(): void {
      if (!store) return;
      store.undo();
    },

    redo(): void {
      if (!store) return;
      store.redo();
    },

    canUndo(): boolean {
      return (store?.state.historyIndex || 0) > 0;
    },

    canRedo(): boolean {
      return (store?.state.historyIndex || 0) < (store?.state.history.length || 0) - 1;
    },

    recordState(): void {
      if (!store) return;
      store.recordState();
    },

    // ============================================================================
    // RHYTHM STRUCTURE
    // ============================================================================

    addMacrobeat(): void {
      if (!store) return;
      store.increaseMacrobeatCount();
    },

    removeMacrobeat(): void {
      if (!store) return;
      store.decreaseMacrobeatCount();
    },

    setMacrobeatGrouping(index: number, grouping: 2 | 3): void {
      if (!store) return;

      const current = store.state.macrobeatGroupings[index];
      if (current !== grouping) {
        store.toggleMacrobeatGrouping(index);
      }
    },

    toggleAnacrusis(): void {
      if (!store) return;
      store.setAnacrusis(!store.state.hasAnacrusis);
    },

    addModulationMarker(measureIndex: number, ratio: ModulationRatio): string | null {
      if (!store) return null;
      return store.addModulationMarker(measureIndex, ratio);
    },

    removeModulationMarker(markerId: string): void {
      if (!store) return;
      store.removeModulationMarker(markerId);
    },

    // ============================================================================
    // VIEW
    // ============================================================================

    setPitchRange(topIndex: number, bottomIndex: number): void {
      if (!store) return;
      store.setPitchRange({ topIndex, bottomIndex });
    },

    getPitchRange(): PitchRange {
      return store?.state.pitchRange || { topIndex: 0, bottomIndex: 87 };
    },

    setDegreeDisplayMode(mode: DegreeDisplayMode): void {
      if (!store) return;
      store.setDegreeDisplayMode(mode);
    },

    setLongNoteStyle(style: LongNoteStyle): void {
      if (!store) return;
      store.setLongNoteStyle(style);
    },

    // ============================================================================
    // TIMBRE
    // ============================================================================

    setTimbreADSR(color: string, adsr: Partial<ADSREnvelope>): void {
      if (!store) return;
      store.setADSR(color, adsr);
    },

    setTimbreHarmonics(color: string, coeffs: number[]): void {
      if (!store) return;
      store.setHarmonicCoefficients(color, new Float32Array(coeffs));
    },

    setTimbreFilter(color: string, settings: Partial<FilterSettings>): void {
      if (!store) return;
      store.setFilterSettings(color, settings);
    },

    // ============================================================================
    // STATE ACCESS
    // ============================================================================

    getState(): Readonly<AppState> {
      if (!store) {
        throw new Error('Engine not initialized');
      }
      return store.state;
    },

    getNotes(): readonly PlacedNote[] {
      return store?.state.placedNotes || [];
    },

    getNoteAt(row: number, column: number): PlacedNote | null {
      if (!store) return null;

      return store.state.placedNotes.find(
        note => note.row === row &&
                note.startColumnIndex <= column &&
                note.endColumnIndex >= column
      ) || null;
    },

    getSixteenthStamps(): readonly SixteenthStampPlacement[] {
      return store?.state.sixteenthStampPlacements || [];
    },

    getTripletStamps(): readonly TripletStampPlacement[] {
      return store?.state.tripletStampPlacements || [];
    },

    // ============================================================================
    // IMPORT/EXPORT
    // ============================================================================

    exportCSV(): string {
      if (!store) return '';

      const header = 'uuid,row,startColumn,endColumn,color,shape';
      const rows = store.state.placedNotes.map(n =>
        `${n.uuid},${n.row},${n.startColumnIndex},${n.endColumnIndex},${n.color},${n.shape}`
      );
      return [header, ...rows].join('\n');
    },

    importCSV(csv: string): void {
      if (!store) return;

      const lines = csv.split('\n').filter(line => line.trim());
      if (lines.length === 0) return;

      // Skip header
      const dataLines = lines.slice(1);

      const notes: Partial<PlacedNote>[] = dataLines.map(line => {
        const [uuid, row, startColumn, endColumn, color, shape] = line.split(',');
        return {
          uuid,
          row: parseInt(row || '0', 10),
          startColumnIndex: parseInt(startColumn || '0', 10) as CanvasSpaceColumn,
          endColumnIndex: parseInt(endColumn || '0', 10) as CanvasSpaceColumn,
          color: color || 'blue',
          shape: (shape || 'circle') as NoteShape
        };
      });

      store.loadNotes(notes);
    },

    exportState(): string {
      if (!store) return '{}';
      return JSON.stringify(store.state, null, 2);
    },

    importState(json: string): void {
      if (!store) return;

      try {
        const state = JSON.parse(json);
        Object.assign(store.state, state);
        store.emit('stateImported', state);
        this.render();
      } catch (error) {
        log('error', 'import', 'Failed to import state', error);
      }
    },

    // ============================================================================
    // EVENTS
    // ============================================================================

    on(event: string, callback: EventCallback): void {
      if (!store) return;
      store.on(event, callback);
    },

    off(event: string, callback: EventCallback): void {
      if (!store) return;
      store.off(event, callback);
    },

    // ============================================================================
    // RENDERING
    // ============================================================================

    render(): void {
      this.renderPitchGrid();
      this.renderDrumGrid();
    },

    renderPitchGrid(): void {
      if (!pitchGridContext || !store || !columnMapService) return;
      // TODO: Canvas rendering requires more complex setup with viewport info and coordinate utilities
      // For now, this is a placeholder - apps should use the app's existing renderers
      log('debug', 'controller', 'renderPitchGrid called - canvas rendering not yet wired');
    },

    renderDrumGrid(): void {
      if (!drumGridContext || !store || !columnMapService) return;
      // TODO: Canvas rendering requires more complex setup with coordinate utilities
      // For now, this is a placeholder - apps should use the app's existing renderers
      log('debug', 'controller', 'renderDrumGrid called - canvas rendering not yet wired');
    }
  };

  return controller;
}

/**
 * Create a lesson mode API wrapper around an engine controller
 */
export function createLessonMode(_engine: EngineController): LessonModeAPI {
  // This will be implemented in Phase 6 - Tutorial App
  throw new Error('Not yet implemented - will be in @mlt/tutorial-runtime package');
}
