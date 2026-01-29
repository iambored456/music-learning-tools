/**
 * Linear Lesson Stepper
 *
 * Manages progression through a linear sequence of lesson steps.
 * Provides the foundation for multi-step lessons.
 */
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
export function createStepper(steps, context) {
    let currentIndex = -1; // -1 means not started
    let isRunning = false;
    function getCurrentStep() {
        if (currentIndex < 0 || currentIndex >= steps.length) {
            return null;
        }
        return steps[currentIndex];
    }
    function executeStep(step) {
        // Execute step-specific logic based on type
        switch (step.type) {
            case 'instruction': {
                const config = step.config;
                context.ui.showInstruction(config.message, {
                    title: config.title,
                    dismissAfterMs: config.dismissAfterMs,
                });
                break;
            }
            case 'configure': {
                const config = step.config;
                if (config.pitchRange) {
                    context.grid.setPitchRange(config.pitchRange.minMidi, config.pitchRange.maxMidi);
                }
                if (config.droneOn !== undefined) {
                    context.audio.setDroneOn(config.droneOn);
                }
                if (config.tempo !== undefined) {
                    context.audio.setTempo(config.tempo);
                }
                break;
            }
            case 'listen': {
                // Listen step: play reference tones
                // Actual implementation will depend on the lesson's needs
                break;
            }
            case 'input': {
                // Input step: await user performance
                // Start pitch detection, record results
                break;
            }
            case 'feedback': {
                const config = step.config;
                // Show feedback overlay
                context.ui.showOverlay({
                    id: `feedback-${step.id}`,
                    type: 'feedback',
                    content: config.showAccuracy ? 'Showing accuracy feedback' : 'Step complete',
                    dismissAfterMs: config.autoProceedAfterMs,
                });
                break;
            }
            case 'complete': {
                const config = step.config;
                if (config.showSummary) {
                    // Show results modal
                    context.ui.showResults({});
                }
                if (config.message) {
                    context.ui.showInstruction(config.message);
                }
                break;
            }
        }
    }
    return {
        get currentStep() {
            return getCurrentStep();
        },
        get currentIndex() {
            return currentIndex;
        },
        get totalSteps() {
            return steps.length;
        },
        get isComplete() {
            return currentIndex >= steps.length;
        },
        start() {
            if (steps.length === 0) {
                return null;
            }
            isRunning = true;
            currentIndex = 0;
            const step = getCurrentStep();
            if (step) {
                executeStep(step);
            }
            return step;
        },
        next() {
            if (!isRunning || currentIndex >= steps.length - 1) {
                currentIndex = steps.length; // Mark as complete
                isRunning = false;
                return null;
            }
            // Clean up current step if needed
            const prevStep = getCurrentStep();
            if (prevStep?.type === 'instruction') {
                context.ui.hideInstruction();
            }
            currentIndex++;
            const step = getCurrentStep();
            if (step) {
                executeStep(step);
            }
            return step;
        },
        previous() {
            if (!isRunning || currentIndex <= 0) {
                return null;
            }
            // Clean up current step
            const prevStep = getCurrentStep();
            if (prevStep?.type === 'instruction') {
                context.ui.hideInstruction();
            }
            currentIndex--;
            const step = getCurrentStep();
            if (step) {
                executeStep(step);
            }
            return step;
        },
        stop() {
            isRunning = false;
            context.ui.hideInstruction();
            context.ui.hideAllOverlays();
        },
        reset() {
            isRunning = false;
            currentIndex = -1;
            context.ui.hideInstruction();
            context.ui.hideAllOverlays();
        },
    };
}
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
export class LinearStepper {
    steps;
    context;
    _currentIndex = -1;
    _isRunning = false;
    constructor(steps, context) {
        this.steps = steps;
        this.context = context;
    }
    get currentStep() {
        if (this._currentIndex < 0 || this._currentIndex >= this.steps.length) {
            return null;
        }
        return this.steps[this._currentIndex];
    }
    get currentIndex() {
        return this._currentIndex;
    }
    get totalSteps() {
        return this.steps.length;
    }
    get isComplete() {
        return this._currentIndex >= this.steps.length;
    }
    start() {
        if (this.steps.length === 0) {
            return null;
        }
        this._isRunning = true;
        this._currentIndex = 0;
        const step = this.currentStep;
        if (step) {
            this.executeStep(step);
        }
        return step;
    }
    next() {
        if (!this._isRunning || this._currentIndex >= this.steps.length - 1) {
            this._currentIndex = this.steps.length;
            this._isRunning = false;
            return null;
        }
        const prevStep = this.currentStep;
        if (prevStep) {
            this.onStepComplete(prevStep);
        }
        this._currentIndex++;
        const step = this.currentStep;
        if (step) {
            this.executeStep(step);
        }
        return step;
    }
    previous() {
        if (!this._isRunning || this._currentIndex <= 0) {
            return null;
        }
        this._currentIndex--;
        const step = this.currentStep;
        if (step) {
            this.executeStep(step);
        }
        return step;
    }
    stop() {
        this._isRunning = false;
        this.context.ui.hideInstruction();
        this.context.ui.hideAllOverlays();
        this.onStop();
    }
    reset() {
        this._isRunning = false;
        this._currentIndex = -1;
        this.context.ui.hideInstruction();
        this.context.ui.hideAllOverlays();
    }
    /** Override to customize step execution */
    executeStep(step) {
        // Default implementation - subclasses can override
        switch (step.type) {
            case 'instruction': {
                const config = step.config;
                this.context.ui.showInstruction(config.message, { title: config.title });
                break;
            }
            case 'configure':
            case 'listen':
            case 'input':
            case 'feedback':
            case 'complete':
                // Subclasses should implement specific behavior
                break;
        }
    }
    /** Called when a step completes - override for custom behavior */
    onStepComplete(step) {
        // Clean up step-specific state
        if (step.type === 'instruction') {
            this.context.ui.hideInstruction();
        }
    }
    /** Called when the lesson is stopped - override for cleanup */
    onStop() {
        // Override in subclasses for cleanup
    }
}
