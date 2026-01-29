/**
 * Lesson Engine Module
 *
 * Core engine for managing lesson lifecycle: load, start, stop, dispose.
 * Provides the runtime environment for executing lesson templates.
 */
import type { AnyLessonTemplate, LessonStep, LessonStepper } from '../types.js';
import type { LessonContext } from './controllers.js';
export type { GridController, GridOverlay, GridLabelMode, AudioController, UiController, UiOverlay, LessonContext, } from './controllers.js';
export { createStepper, LinearStepper } from './stepper.js';
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
export type LessonEngineEvent = {
    type: 'loaded';
    lessonId: string;
} | {
    type: 'started';
    lessonId: string;
} | {
    type: 'stopped';
    lessonId: string;
} | {
    type: 'disposed';
} | {
    type: 'step-changed';
    step: LessonStep | null;
} | {
    type: 'completed';
    lessonId: string;
};
/** Event listener type */
export type LessonEngineListener = (event: LessonEngineEvent) => void;
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
export declare function createLessonEngine(): LessonEngine;
/**
 * Get or create the global lesson engine instance
 */
export declare function getLessonEngine(): LessonEngine;
/**
 * Reset the global engine (mainly for testing)
 */
export declare function resetGlobalEngine(): void;
//# sourceMappingURL=index.d.ts.map