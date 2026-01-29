/**
 * Linear Lesson Stepper
 *
 * Manages progression through a linear sequence of lesson steps.
 * Provides the foundation for multi-step lessons.
 */
import type { LessonStep, LessonStepper } from '../types.js';
import type { LessonContext } from './controllers.js';
/**
 * Create a stepper for managing linear lesson progression
 *
 * @param steps Array of lesson steps to execute
 * @param context Lesson context with controllers
 * @returns LessonStepper instance
 *
 * @example
 * ```typescript
 * const stepper = createStepper([
 *   { id: 'intro', type: 'instruction', config: { message: 'Listen and repeat' } },
 *   { id: 'setup', type: 'configure', config: { pitchRange: { minMidi: 48, maxMidi: 60 } } },
 *   { id: 'listen', type: 'listen', config: { durationMs: 2000 } },
 *   { id: 'feedback', type: 'feedback', config: { showAccuracy: true } },
 * ], context);
 *
 * stepper.start(); // Begin with first step
 * stepper.next();  // Advance to next step
 * ```
 */
export declare function createStepper(steps: LessonStep[], context: LessonContext): LessonStepper;
/**
 * LinearStepper class implementation for lessons that need more control
 *
 * @example
 * ```typescript
 * class MyLesson extends LinearStepper {
 *   constructor(context: LessonContext) {
 *     super([
 *       { id: 'step1', type: 'instruction', config: { message: 'Hello' } },
 *     ], context);
 *   }
 *
 *   // Override to add custom behavior
 *   onStepComplete(step: LessonStep) {
 *     console.log('Step completed:', step.id);
 *   }
 * }
 * ```
 */
export declare class LinearStepper implements LessonStepper {
    protected steps: LessonStep[];
    protected context: LessonContext;
    protected _currentIndex: number;
    protected _isRunning: boolean;
    constructor(steps: LessonStep[], context: LessonContext);
    get currentStep(): LessonStep | null;
    get currentIndex(): number;
    get totalSteps(): number;
    get isComplete(): boolean;
    start(): LessonStep | null;
    next(): LessonStep | null;
    previous(): LessonStep | null;
    stop(): void;
    reset(): void;
    /** Override to customize step execution */
    protected executeStep(step: LessonStep): void;
    /** Called when a step completes - override for custom behavior */
    protected onStepComplete(step: LessonStep): void;
    /** Called when the lesson is stopped - override for cleanup */
    protected onStop(): void;
}
//# sourceMappingURL=stepper.d.ts.map