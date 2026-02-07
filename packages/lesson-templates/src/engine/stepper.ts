/**
 * Linear Lesson Stepper
 *
 * Manages progression through a linear sequence of lesson steps.
 * Provides the foundation for multi-step lessons.
 */

import type { LessonStep, LessonStepper, InstructionStepConfig } from '../types.js';
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
export function createStepper(steps: LessonStep[], context: LessonContext): LessonStepper {
  let currentIndex = -1; // -1 means not started
  let isRunning = false;

  function getCurrentStep(): LessonStep | null {
    if (currentIndex < 0 || currentIndex >= steps.length) {
      return null;
    }
    return steps[currentIndex];
  }

  function executeStep(step: LessonStep): void {
    // Execute step-specific logic based on type
    switch (step.type) {
      case 'instruction': {
        const config = step.config as InstructionStepConfig;

        // If avatar speech is requested and available, use it
        if (config.speakWithAvatar && context.ui.speakInstruction) {
          // Show instruction text as well (for accessibility)
          context.ui.showInstruction(config.message, {
            title: config.title,
            dismissAfterMs: config.dismissAfterMs,
          });
          // Speak with avatar (fire and forget - step progression handled separately)
          void context.ui.speakInstruction(config.message, {
            expression: config.avatarExpression,
          });
        } else {
          // Fallback to text-only instruction
          context.ui.showInstruction(config.message, {
            title: config.title,
            dismissAfterMs: config.dismissAfterMs,
          });
        }
        break;
      }

      case 'configure': {
        const config = step.config as {
          pitchRange?: { minMidi: number; maxMidi: number };
          droneOn?: boolean;
          tempo?: number;
        };
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
        const config = step.config as {
          showAccuracy?: boolean;
          showPitchDeviation?: boolean;
          autoProceedAfterMs?: number;
        };
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
        const config = step.config as { message?: string; showSummary?: boolean };
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

    start(): LessonStep | null {
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

    next(): LessonStep | null {
      if (!isRunning || currentIndex >= steps.length - 1) {
        currentIndex = steps.length; // Mark as complete
        isRunning = false;
        return null;
      }

      // Clean up current step if needed
      const prevStep = getCurrentStep();
      if (prevStep?.type === 'instruction') {
        context.ui.hideInstruction();
        // Cancel any ongoing avatar speech
        context.ui.cancelSpeech?.();
      }

      currentIndex++;
      const step = getCurrentStep();

      if (step) {
        executeStep(step);
      }

      return step;
    },

    previous(): LessonStep | null {
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
      // Cancel any ongoing avatar speech
      context.ui.cancelSpeech?.();
    },

    reset() {
      isRunning = false;
      currentIndex = -1;
      context.ui.hideInstruction();
      context.ui.hideAllOverlays();
      // Cancel any ongoing avatar speech
      context.ui.cancelSpeech?.();
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
export class LinearStepper implements LessonStepper {
  protected steps: LessonStep[];
  protected context: LessonContext;
  protected _currentIndex: number = -1;
  protected _isRunning: boolean = false;

  constructor(steps: LessonStep[], context: LessonContext) {
    this.steps = steps;
    this.context = context;
  }

  get currentStep(): LessonStep | null {
    if (this._currentIndex < 0 || this._currentIndex >= this.steps.length) {
      return null;
    }
    return this.steps[this._currentIndex];
  }

  get currentIndex(): number {
    return this._currentIndex;
  }

  get totalSteps(): number {
    return this.steps.length;
  }

  get isComplete(): boolean {
    return this._currentIndex >= this.steps.length;
  }

  start(): LessonStep | null {
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

  next(): LessonStep | null {
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

  previous(): LessonStep | null {
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

  stop(): void {
    this._isRunning = false;
    this.context.ui.hideInstruction();
    this.context.ui.hideAllOverlays();
    // Cancel any ongoing avatar speech
    this.context.ui.cancelSpeech?.();
    this.onStop();
  }

  reset(): void {
    this._isRunning = false;
    this._currentIndex = -1;
    this.context.ui.hideInstruction();
    this.context.ui.hideAllOverlays();
    // Cancel any ongoing avatar speech
    this.context.ui.cancelSpeech?.();
  }

  /** Override to customize step execution */
  protected executeStep(step: LessonStep): void {
    // Default implementation - subclasses can override
    switch (step.type) {
      case 'instruction': {
        const config = step.config as InstructionStepConfig;

        // If avatar speech is requested and available, use it
        if (config.speakWithAvatar && this.context.ui.speakInstruction) {
          // Show instruction text as well (for accessibility)
          this.context.ui.showInstruction(config.message, {
            title: config.title,
            dismissAfterMs: config.dismissAfterMs,
          });
          // Speak with avatar
          void this.context.ui.speakInstruction(config.message, {
            expression: config.avatarExpression,
          });
        } else {
          // Fallback to text-only instruction
          this.context.ui.showInstruction(config.message, { title: config.title });
        }
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
  protected onStepComplete(step: LessonStep): void {
    // Clean up step-specific state
    if (step.type === 'instruction') {
      this.context.ui.hideInstruction();
      // Cancel any ongoing avatar speech
      this.context.ui.cancelSpeech?.();
    }
  }

  /** Called when the lesson is stopped - override for cleanup */
  protected onStop(): void {
    // Override in subclasses for cleanup
  }
}
