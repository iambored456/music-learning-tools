// js/services/timbreEffects/effectsAnimation/delayADSREffect.ts
import BaseAnimationEffect from './baseAnimationEffect.ts';
import logger from '@utils/logger.ts';

logger.moduleLoaded('DelayADSREffect');

interface DelayEffectParams {
  time: number;
  feedback: number;
}

interface DelayAnimationState {
  delayTime: number;
  feedback: number;
  echoCount: number;
  lastTrigger: number;
  echoPhases: unknown[];
  lastUpdate: number;
}

/**
 * Delay ADSR Effect (PLACEHOLDER)
 * Handles delay visual animations (echo/repeat visual feedback)
 * TODO: Implement actual delay visualization - currently placeholder
 * Extends BaseAnimationEffect to eliminate code duplication
 */
class DelayADSREffect extends BaseAnimationEffect<DelayAnimationState, DelayEffectParams> {
  constructor() {
    super('Delay');

    logger.info('DelayADSREffect', 'Initialized for delay visualization (PLACEHOLDER)', null, 'animation');
  }

  /**
     * Initialize the delay ADSR effect
     */
  init(): boolean {
    this.initBase(); // Initialize shared functionality

    logger.info('DelayADSREffect', 'Ready for delay animation (PLACEHOLDER)', null, 'animation');
    return true;
  }

  /**
     * Update delay animation parameters
     */
  updateAnimationParameters(color: string, effectParams: DelayEffectParams): void {
    const { time, feedback } = effectParams;

    if (time === 0 && feedback === 0) {
      // Disable delay for this color
      this.animations.delete(color);
      logger.debug('DelayADSREffect', `Disabled delay animation for ${color}`, null, 'animation');
    } else {
      // TODO: Create/update delay animation parameters
      // This could involve:
      // - Multiple echo instances with timing
      // - Feedback creating cascading echoes
      // - Visual ghost notes appearing at delay intervals

      const delayTimeMs = (time / 100) * 500; // 0-100% to 0-500ms
      const feedbackAmount = Math.min(feedback / 100, 0.95); // 0-100% to 0-0.95 (matches Tone.js cap)

      // Calculate true audible echo count: how many echoes until amplitude drops below threshold
      // Each echo decays by feedback^n, so we solve feedback^n < threshold for n
      const AUDIBILITY_THRESHOLD = 0.01; // -40dB
      let echoCount = 0;
      if (feedbackAmount > 0) {
        echoCount = Math.ceil(Math.log(AUDIBILITY_THRESHOLD) / Math.log(feedbackAmount));
      }

      const animationData: DelayAnimationState = {
        delayTime: delayTimeMs,
        feedback: feedbackAmount,
        echoCount,
        lastTrigger: 0,
        echoPhases: [], // Track multiple echo instances
        lastUpdate: performance.now()
      };

      this.animations.set(color, animationData);

      logger.debug('DelayADSREffect', `Updated delay animation for ${color} (PLACEHOLDER)`, {
        delayTime: delayTimeMs,
        feedback: feedbackAmount
      }, 'animation');
    }
  }

  /**
     * Update delay animation phases
     */
  updateAnimationPhases(currentTime: number): void {
    this.animations.forEach((animation) => {
      // TODO: Implement delay animation phase updates
      // This could involve:
      // - Tracking multiple echo phases
      // - Cascading feedback echoes
      // - Timing-based echo spawning

      animation.lastUpdate = currentTime;

      // TODO: Update echo phases array based on timing
      // animation.echoPhases.forEach((echo, index) => {
      //     echo.phase += deltaTime;
      //     if (echo.phase > animation.delayTime) {
      //         // Echo should trigger
      //     }
      // });
    });
  }

  /**
     * Get the current delay visual effects for a note
     * TODO: Implement actual delay visualization
     */
  getDelayEffects(color: string): Array<{ delay: number; opacity: number; scale: number; active: boolean }> {
    const animation = this.animations.get(color);
    if (!animation) {
      return [];
    }

    const effects: Array<{ delay: number; opacity: number; scale: number; active: boolean }> = [];
    for (let i = 0; i < animation.echoCount; i++) {
      const echoIndex = i + 1;
      effects.push({
        delay: animation.delayTime * echoIndex,
        opacity: Math.sqrt(Math.pow(animation.feedback, echoIndex)), // Perceptual opacity: sqrt of amplitude decay
        scale: Math.max(0.7, 1 - i * 0.02), // Gentle scale reduction, floor at 0.7
        active: false // TODO: Track if this echo should be visible
      });
    }

    return effects;
  }

  /**
     * Trigger a delay sequence for a note
     * TODO: Implement delay trigger logic
     */
  triggerDelay(color: string, currentTime: number): void {
    const animation = this.animations.get(color);
    if (!animation) {return;}

    // TODO: Start delay echo sequence
    animation.lastTrigger = currentTime;
    logger.debug('DelayADSREffect', `Triggered delay for ${color} (PLACEHOLDER)`, null, 'animation');
  }

  /**
     * Override shouldBeRunning - delay should animate during and after sound production
     */
  override shouldBeRunning(): boolean {
    const hasAnimations = this.animations.size > 0;
    if (!hasAnimations) {return false;}

    // TODO: Delay should run during AND after sound production (echo effect)
    // Similar to reverb but with discrete echoes instead of continuous tail
    const hasRelevantDisplays = (
      this.isPlaybackActive ||                    // During transport playback
            this.hasActiveInteraction ||                // During note interactions
            (this.ghostNoteAnimation !== null)          // Ghost note (with possible echoes)
    );

    return hasRelevantDisplays;
  }

  /**
     * Check if we should animate notes of a given color (delay)
     */
  override shouldAnimateColor(color: string): boolean {
    const animation = this.animations.get(color);
    if (!animation) {return false;}

    // Delay should animate when time > 0 OR feedback > 0
    return animation.delayTime > 0 || animation.feedback > 0;
  }

  /**
     * Cleanup
     */
  dispose(): void {
    this.disposeBase();
    logger.info('DelayADSREffect', 'Disposed', null, 'animation');
  }
}

export default DelayADSREffect;
