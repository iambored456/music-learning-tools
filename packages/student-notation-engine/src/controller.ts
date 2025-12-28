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
} from '@mlt/types';

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
  // This will be implemented when we extract the actual state/audio/canvas modules
  throw new Error('Not yet implemented - engine modules need to be extracted first');
}

/**
 * Create a lesson mode API wrapper around an engine controller
 */
export function createLessonMode(engine: EngineController): LessonModeAPI {
  // This will be implemented in the tutorial-runtime package
  throw new Error('Not yet implemented - will be in @mlt/tutorial-runtime package');
}
