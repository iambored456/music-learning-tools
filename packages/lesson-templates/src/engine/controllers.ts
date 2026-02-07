/**
 * Controller Interfaces
 *
 * Facades that lessons use to control grid, audio, and UI without
 * reaching into the app's internal implementation details.
 */

// ============================================================================
// Grid Controller
// ============================================================================

/** Overlay type for grid visualizations */
export interface GridOverlay {
  /** Unique identifier for this overlay */
  id: string;
  /** Type of overlay */
  type: 'target-zone' | 'highlight' | 'timing-guide' | 'ghost-note';
  /** MIDI pitch or range */
  midi?: number;
  minMidi?: number;
  maxMidi?: number;
  /** Timing (if applicable) */
  startTimeMs?: number;
  endTimeMs?: number;
  /** Visual styling */
  color?: string;
  opacity?: number;
}

/** Label mode for the pitch grid */
export type GridLabelMode = 'notes' | 'degrees' | 'none';

/** Controller interface for the pitch grid */
export interface GridController {
  /**
   * Set the visible pitch range
   * @param minMidi Lowest visible MIDI note
   * @param maxMidi Highest visible MIDI note
   */
  setPitchRange(minMidi: number, maxMidi: number): void;

  /**
   * Get the current pitch range
   */
  getRange(): { minMidi: number; maxMidi: number };

  /**
   * Set overlays on the grid (replaces existing)
   * @param overlays Array of overlay definitions
   */
  setOverlays(overlays: GridOverlay[]): void;

  /**
   * Add a single overlay
   * @param overlay Overlay to add
   */
  addOverlay(overlay: GridOverlay): void;

  /**
   * Remove an overlay by ID
   * @param id Overlay ID to remove
   */
  removeOverlay(id: string): void;

  /**
   * Clear all overlays
   */
  clearOverlays(): void;

  /**
   * Set the label display mode
   * @param mode Label mode to use
   */
  setLabelMode(mode: GridLabelMode): void;

  /**
   * Set whether pitch highlight is enabled
   * @param enabled Whether to show pitch highlight
   */
  setPitchHighlightEnabled(enabled: boolean): void;
}

// ============================================================================
// Audio Controller
// ============================================================================

/** Controller interface for audio services */
export interface AudioController {
  /**
   * Set whether the drone is playing
   * @param on Drone state
   */
  setDroneOn(on: boolean): void;

  /**
   * Set the drone pitch (tonic + octave)
   * @param tonic Tonic note name (e.g., 'C', 'F#')
   * @param octave Octave number
   */
  setDronePitch(tonic: string, octave: number): void;

  /**
   * Set drone volume
   * @param db Volume in decibels
   */
  setDroneVolume(db: number): void;

  /**
   * Set whether metronome is on (placeholder for future)
   * @param on Metronome state
   */
  setMetronomeOn(on: boolean): void;

  /**
   * Set the tempo
   * @param bpm Beats per minute
   */
  setTempo(bpm: number): void;

  /**
   * Set reference tone volume
   * @param db Volume in decibels
   */
  setReferenceVolume(db: number): void;

  /**
   * Play a single reference tone
   * @param midi MIDI note number
   * @param durationMs Duration in milliseconds
   */
  playReferenceTone(midi: number, durationMs: number): Promise<void>;

  /**
   * Schedule reference tones for playback
   * @param tones Array of tones with timing
   */
  scheduleReferenceTones(
    tones: Array<{ midi: number; startTimeMs: number; endTimeMs: number }>
  ): void;

  /**
   * Stop all playing audio
   */
  stopAll(): void;

  /**
   * Start pitch detection
   */
  startDetection(): Promise<void>;

  /**
   * Stop pitch detection
   */
  stopDetection(): void;
}

// ============================================================================
// UI Controller
// ============================================================================

/** Overlay definition for UI overlays */
export interface UiOverlay {
  /** Unique identifier */
  id: string;
  /** Overlay type */
  type: 'instruction' | 'feedback' | 'progress' | 'custom';
  /** Content to display */
  content: string;
  /** Optional title */
  title?: string;
  /** Position hint */
  position?: 'center' | 'top' | 'bottom';
  /** Auto-dismiss after ms */
  dismissAfterMs?: number;
  /** Allow user to dismiss */
  dismissible?: boolean;
}

/** Avatar expression states */
export type AvatarExpression = 'neutral' | 'encouraging' | 'feedback_bad';

/** Options for avatar speech */
export interface AvatarSpeakOptions {
  /** Expression to show during speech */
  expression?: AvatarExpression;
  /** Language code (e.g., 'en-CA') */
  lang?: string;
  /** Speech rate (0.1 to 2.0, default ~0.92) */
  rate?: number;
}

/** Controller interface for UI overlays and modals */
export interface UiController {
  /**
   * Show an instruction message
   * @param message Message to display
   * @param options Optional configuration
   */
  showInstruction(
    message: string,
    options?: { title?: string; dismissAfterMs?: number }
  ): void;

  /**
   * Hide the instruction overlay
   */
  hideInstruction(): void;

  /**
   * Show a UI overlay
   * @param overlay Overlay definition
   */
  showOverlay(overlay: UiOverlay): void;

  /**
   * Hide an overlay by ID
   * @param id Overlay ID to hide
   */
  hideOverlay(id: string): void;

  /**
   * Hide all overlays
   */
  hideAllOverlays(): void;

  /**
   * Show the results modal
   * @param summary Results summary data
   */
  showResults(summary: unknown): void;

  /**
   * Hide the results modal
   */
  hideResults(): void;

  // =========================================================================
  // Avatar Integration (optional - implementations may return no-ops)
  // =========================================================================

  /**
   * Mount the avatar to a container element
   * @param container DOM element to mount avatar in
   */
  mountAvatar?(container: HTMLElement): Promise<void>;

  /**
   * Show the avatar (enter animation)
   */
  showAvatar?(): Promise<void>;

  /**
   * Hide the avatar
   */
  hideAvatar?(): void;

  /**
   * Speak an instruction with the avatar
   * @param message Message to speak (can contain HTML)
   * @param options Optional speech configuration
   */
  speakInstruction?(message: string, options?: AvatarSpeakOptions): Promise<void>;

  /**
   * Cancel any ongoing avatar speech
   */
  cancelSpeech?(): void;

  /**
   * Set the avatar's visual feedback state
   * @param state Expression state to show
   */
  setAvatarFeedback?(state: AvatarExpression): void;

  /**
   * Dispose and clean up the avatar
   */
  disposeAvatar?(): void;
}

// ============================================================================
// Lesson Context
// ============================================================================

/** Context provided to lessons for controlling the app */
export interface LessonContext {
  /** Grid controller for pitch visualization */
  grid: GridController;
  /** Audio controller for sound and detection */
  audio: AudioController;
  /** UI controller for overlays and modals */
  ui: UiController;
  /** User's calibrated speaking pitch (null if not calibrated) */
  speakingPitchMidi: number | null;
  /** User's speaking pitch note name (null if not calibrated) */
  speakingPitchNoteName: string | null;
}
