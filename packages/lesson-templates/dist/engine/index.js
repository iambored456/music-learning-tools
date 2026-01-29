/**
 * Lesson Engine Module
 *
 * Core engine for managing lesson lifecycle: load, start, stop, dispose.
 * Provides the runtime environment for executing lesson templates.
 */
import { getTemplateOrThrow } from '../registry.js';
import { createStepper } from './stepper.js';
// Re-export stepper
export { createStepper, LinearStepper } from './stepper.js';
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
export function createLessonEngine() {
    // Internal state
    const state = {
        isActive: false,
        currentLessonId: null,
        currentTemplate: null,
        currentStep: null,
        stepper: null,
        settings: {},
    };
    // Event listeners
    const listeners = new Set();
    // Cleanup functions for current lesson
    let cleanupFns = [];
    // Current context reference
    let currentContext = null;
    // Emit event to all listeners
    function emit(event) {
        for (const listener of listeners) {
            try {
                listener(event);
            }
            catch (error) {
                console.error('[LessonEngine] Error in event listener:', error);
            }
        }
    }
    // Register a cleanup function
    function addCleanup(fn) {
        cleanupFns.push(fn);
    }
    // Run all cleanup functions
    function runCleanup() {
        for (const fn of cleanupFns) {
            try {
                fn();
            }
            catch (error) {
                console.error('[LessonEngine] Error in cleanup:', error);
            }
        }
        cleanupFns = [];
    }
    return {
        get state() {
            return state;
        },
        load(lessonId) {
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
        start(settings, context) {
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
            emit({ type: 'started', lessonId: state.currentLessonId });
        },
        stop() {
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
        dispose() {
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
        nextStep() {
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
        previousStep() {
            if (!state.stepper) {
                return null;
            }
            const step = state.stepper.previous();
            state.currentStep = step;
            emit({ type: 'step-changed', step });
            return step;
        },
        subscribe(listener) {
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
let globalEngine = null;
/**
 * Get or create the global lesson engine instance
 */
export function getLessonEngine() {
    if (!globalEngine) {
        globalEngine = createLessonEngine();
    }
    return globalEngine;
}
/**
 * Reset the global engine (mainly for testing)
 */
export function resetGlobalEngine() {
    if (globalEngine) {
        globalEngine.dispose();
        globalEngine = null;
    }
}
