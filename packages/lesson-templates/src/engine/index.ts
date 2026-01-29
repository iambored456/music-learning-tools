/**
 * Lesson Engine Module
 *
 * Core engine for managing lesson lifecycle: load, start, stop, dispose.
 * Provides the runtime environment for executing lesson templates.
 */

import type { AnyLessonTemplate, LessonStep, LessonStepper } from '../types.js';
import type { LessonContext } from './controllers.js';
import { getTemplateOrThrow } from '../registry.js';
import { createStepper } from './stepper.js';

// Re-export controller types and interfaces
export type {
  GridController,
  GridOverlay,
  GridLabelMode,
  AudioController,
  UiController,
  UiOverlay,
  LessonContext,
} from './controllers.js';

// Re-export stepper
export { createStepper, LinearStepper } from './stepper.js';

// ============================================================================
// Engine State
// ============================================================================

/** Engine state interface */
export interface LessonEngineState {
  /** Whether a lesson is currently active */
  isActive: boolean;
  /** ID of the currently loaded lesson */
  currentLessonId: string | null;
  /** Current template instance */
  currentTemplate: AnyLessonTemplate | null;
  /** Current step (if using step-based flow) */
  currentStep: LessonStep | null;
  /** Current stepper instance */
  stepper: LessonStepper | null;
  /** Runtime settings for the current lesson */
  settings: Record<string, number | boolean>;
}

/** Events emitted by the lesson engine */
export type LessonEngineEvent =
  | { type: 'loaded'; lessonId: string }
  | { type: 'started'; lessonId: string }
  | { type: 'stopped'; lessonId: string }
  | { type: 'disposed' }
  | { type: 'step-changed'; step: LessonStep | null }
  | { type: 'completed'; lessonId: string };

/** Event listener type */
export type LessonEngineListener = (event: LessonEngineEvent) => void;

// ============================================================================
// Lesson Engine Interface
// ============================================================================

/** Lesson Engine interface */
export interface LessonEngine {
  /** Current engine state */
  readonly state: LessonEngineState;

  /**
   * Load a lesson template by ID
   * @param lessonId Template ID to load
   * @throws Error if template not found
   */
  load(lessonId: string): void;

  /**
   * Start the loaded lesson with settings
   * @param settings Runtime settings from chooser
   * @param context Lesson context with controllers
   */
  start(settings: Record<string, number | boolean>, context: LessonContext): void;

  /**
   * Stop the current lesson
   */
  stop(): void;

  /**
   * Dispose the engine and clean up all resources
   */
  dispose(): void;

  /**
   * Advance to the next step (if using step-based flow)
   */
  nextStep(): LessonStep | null;

  /**
   * Go back to the previous step
   */
  previousStep(): LessonStep | null;

  /**
   * Add an event listener
   * @param listener Callback function
   * @returns Unsubscribe function
   */
  subscribe(listener: LessonEngineListener): () => void;
}

// ============================================================================
// Engine Factory
// ============================================================================

/**
 * Create a new LessonEngine instance
 *
 * @example
 * ```typescript
 * const engine = createLessonEngine();
 *
 * engine.subscribe((event) => {
 *   console.log('Engine event:', event.type);
 * });
 *
 * engine.load('basic-pitch-matching');
 * engine.start(settings, context);
 *
 * // Later...
 * engine.stop();
 * engine.dispose();
 * ```
 */
export function createLessonEngine(): LessonEngine {
  // Internal state
  const state: LessonEngineState = {
    isActive: false,
    currentLessonId: null,
    currentTemplate: null,
    currentStep: null,
    stepper: null,
    settings: {},
  };

  // Event listeners
  const listeners = new Set<LessonEngineListener>();

  // Cleanup functions for current lesson
  let cleanupFns: Array<() => void> = [];

  // Current context reference
  let currentContext: LessonContext | null = null;

  // Emit event to all listeners
  function emit(event: LessonEngineEvent): void {
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('[LessonEngine] Error in event listener:', error);
      }
    }
  }

  // Register a cleanup function
  function addCleanup(fn: () => void): void {
    cleanupFns.push(fn);
  }

  // Run all cleanup functions
  function runCleanup(): void {
    for (const fn of cleanupFns) {
      try {
        fn();
      } catch (error) {
        console.error('[LessonEngine] Error in cleanup:', error);
      }
    }
    cleanupFns = [];
  }

  return {
    get state() {
      return state;
    },

    load(lessonId: string): void {
      // Clean up any existing lesson
      if (state.isActive) {
        this.stop();
      }

      // Get template from registry
      const template = getTemplateOrThrow(lessonId);

      // Update state
      state.currentLessonId = lessonId;
      state.currentTemplate = template;
      state.currentStep = null;
      state.stepper = null;
      state.settings = {};

      emit({ type: 'loaded', lessonId });
    },

    start(settings: Record<string, number | boolean>, context: LessonContext): void {
      if (!state.currentTemplate) {
        throw new Error('No lesson loaded. Call load() first.');
      }

      // Store context and settings
      currentContext = context;
      state.settings = { ...settings };
      state.isActive = true;

      const template = state.currentTemplate;

      // If template has steps, create a stepper
      if (template.steps && template.steps.length > 0) {
        state.stepper = createStepper(template.steps, context);
        const firstStep = state.stepper.start();
        state.currentStep = firstStep;
        emit({ type: 'step-changed', step: firstStep });
      }

      emit({ type: 'started', lessonId: state.currentLessonId! });
    },

    stop(): void {
      if (!state.isActive) {
        return;
      }

      const lessonId = state.currentLessonId;

      // Stop stepper if active
      if (state.stepper) {
        state.stepper.stop();
      }

      // Run cleanup
      runCleanup();

      // Reset state
      state.isActive = false;
      state.currentStep = null;
      state.stepper = null;
      state.settings = {};
      currentContext = null;

      if (lessonId) {
        emit({ type: 'stopped', lessonId });
      }
    },

    dispose(): void {
      // Stop if active
      if (state.isActive) {
        this.stop();
      }

      // Clear all state
      state.currentLessonId = null;
      state.currentTemplate = null;
      state.currentStep = null;
      state.stepper = null;
      state.settings = {};

      // Clear listeners
      listeners.clear();

      emit({ type: 'disposed' });
    },

    nextStep(): LessonStep | null {
      if (!state.stepper) {
        return null;
      }

      const step = state.stepper.next();
      state.currentStep = step;
      emit({ type: 'step-changed', step });

      // Check if lesson is complete
      if (state.stepper.isComplete && state.currentLessonId) {
        emit({ type: 'completed', lessonId: state.currentLessonId });
      }

      return step;
    },

    previousStep(): LessonStep | null {
      if (!state.stepper) {
        return null;
      }

      const step = state.stepper.previous();
      state.currentStep = step;
      emit({ type: 'step-changed', step });

      return step;
    },

    subscribe(listener: LessonEngineListener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

// ============================================================================
// Singleton Instance (Optional)
// ============================================================================

/** Global lesson engine instance (optional usage pattern) */
let globalEngine: LessonEngine | null = null;

/**
 * Get or create the global lesson engine instance
 */
export function getLessonEngine(): LessonEngine {
  if (!globalEngine) {
    globalEngine = createLessonEngine();
  }
  return globalEngine;
}

/**
 * Reset the global engine (mainly for testing)
 */
export function resetGlobalEngine(): void {
  if (globalEngine) {
    globalEngine.dispose();
    globalEngine = null;
  }
}
