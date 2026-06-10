// js/services/timbreEffects/effectsAudio/delayAudioEffect.ts
import * as Tone from 'tone';
import logger from '@utils/logger.ts';
import { getSynthEngine } from '@services/runtimeGlobals.ts';

logger.moduleLoaded('DelayAudioEffect');

const DELAY_MIN_SECONDS = 0.01;
const DELAY_MAX_SECONDS = 0.5;
const PARAMETER_RAMP_SECONDS = 0.04;
const WET_RAMP_SECONDS = 0.025;

interface DelaySettings {
  time: number;
  feedback: number;
  wet: number;
}

type DelayInstance = Tone.FeedbackDelay & {
  _crossFade?: { fade: { value: number }; dispose: () => void };
  _wetAmount?: number;
};

interface Voice {
  connect?: (destination: Tone.ToneAudioNode | AudioNode) => void;
  output?: {
    connect?: (destination: Tone.ToneAudioNode | AudioNode) => void;
  };
  isDisposed?: () => boolean;
}

class DelayAudioEffect {
  private currentSettings = new Map<string, DelaySettings>();
  private delayInstances = new Map<string, DelayInstance>();

  init(): boolean {
    logger.info('DelayAudioEffect', 'Ready for audio processing', null, 'audio');
    return true;
  }

  updateParameters(effectParams: DelaySettings, color: string): void {
    const { time, feedback, wet } = effectParams;
    this.currentSettings.set(color, { time, feedback, wet });

    logger.debug('DelayAudioEffect', `Updated parameters for ${color}`, { time, feedback, wet }, 'audio');

    let delayInstance: DelayInstance | null | undefined = this.delayInstances.get(color);

    if (delayInstance) {
      this.updateDelayInstance(delayInstance, time, feedback, wet);
    } else if (wet > 0) {
      // Create delay instance if wet > 0, even with time/feedback at 0
      // This ensures the delay node is in the audio chain during preview
      delayInstance = this.createDelayInstance(time, feedback, wet);
      if (delayInstance) {
        this.delayInstances.set(color, delayInstance);
        logger.debug('DelayAudioEffect', `Created new delay instance for ${color}`, { time, feedback, wet }, 'audio');
        getSynthEngine()?.updateSynthForColor?.(color);
      }
    }
  }

  applyToVoice(voice: Voice | null | undefined, color: string): void {
    if (!voice) {return;}

    const settings = this.currentSettings.get(color);
    if (!settings || (settings.time === 0 && settings.feedback === 0)) {return;}

    try {
      let delayInstance: DelayInstance | null | undefined = this.delayInstances.get(color);
      if (!delayInstance) {
        delayInstance = this.createDelayInstance(settings.time, settings.feedback, settings.wet);
        if (!delayInstance) {return;}
        this.delayInstances.set(color, delayInstance);
      }

      const isDisposed = typeof voice.isDisposed === 'function' && voice.isDisposed();
      if (isDisposed) {return;}

      try {
        voice.connect?.(delayInstance);
      } catch {
        voice.output?.connect?.(delayInstance);
      }

      logger.debug('DelayAudioEffect', `Applied delay to voice for ${color}`, settings, 'audio');
    } catch (error) {
      logger.warn('DelayAudioEffect', `Failed to apply delay to voice for ${color}`, error, 'audio');
    }
  }

  getCurrentSettings(color: string): DelaySettings {
    return this.currentSettings.get(color) ?? { time: 0, feedback: 0, wet: 0 };
  }

  getEffectInstance(color: string): DelayInstance | null {
    // Return the instance if it exists, regardless of current wet/time values
    // This ensures the delay node stays in the audio chain during preview
    return this.delayInstances.get(color) ?? null;
  }

  private createDelayInstance(time: number, feedback: number, wet = 30): DelayInstance | null {
    // Create instance if wet > 0, even if time/feedback are 0
    // This allows delay to be in the audio chain during preview
    if (wet === 0) {
      return null;
    }

    const delayTime = Math.max(DELAY_MIN_SECONDS, (time / 100) * DELAY_MAX_SECONDS);
    const feedbackAmount = Math.min(0.95, feedback / 100);
    const wetAmount = wet / 100;

    const delay = new Tone.FeedbackDelay({ delayTime, feedback: feedbackAmount, wet: wetAmount }) as DelayInstance;
    delay._wetAmount = wetAmount;

    logger.debug('DelayAudioEffect', 'Created delay instance', { delayTime, feedbackAmount, wetAmount }, 'audio');
    return delay;
  }

  private updateDelayInstance(delayInstance: DelayInstance, time: number, feedback: number, wet = 15): void {
    const delayTime = Math.max(DELAY_MIN_SECONDS, (time / 100) * DELAY_MAX_SECONDS);
    const feedbackAmount = Math.min(0.95, feedback / 100);
    const wetAmount = wet / 100;

    try {
      this.rampAudioParam(delayInstance.delayTime, delayTime, PARAMETER_RAMP_SECONDS);
      this.rampAudioParam(delayInstance.feedback, feedbackAmount, PARAMETER_RAMP_SECONDS);
      if (delayInstance._crossFade) {
        this.rampAudioParam(delayInstance._crossFade.fade, wetAmount, WET_RAMP_SECONDS);
      }
      delayInstance._wetAmount = wetAmount;
      logger.debug('DelayAudioEffect', 'Updated delay instance', { delayTime, feedbackAmount, wetAmount }, 'audio');
    } catch (error) {
      logger.warn('DelayAudioEffect', 'Failed to update delay instance', error, 'audio');
    }
  }

  createDelaySettings(time: number, feedback: number, wet = 30): DelaySettings | null {
    if (time === 0 && feedback === 0) {
      return null;
    }

    const delayTime = Math.max(DELAY_MIN_SECONDS, (time / 100) * DELAY_MAX_SECONDS);
    const feedbackAmount = Math.min(0.95, feedback / 100);
    const wetAmount = wet / 100;

    return {
      time: delayTime,
      feedback: feedbackAmount,
      wet: wetAmount
    };
  }

  private rampAudioParam(param: unknown, value: number, rampSeconds: number): void {
    const target = param as {
      value?: number;
      rampTo?: (value: number, rampTime: number, startTime?: number) => void;
      cancelScheduledValues?: (time: number) => void;
      setTargetAtTime?: (value: number, startTime: number, timeConstant: number) => void;
    };

    try {
      if (typeof target.rampTo === 'function') {
        target.rampTo(value, rampSeconds);
        return;
      }

      const now = Tone.now();
      if (
        typeof target.cancelScheduledValues === 'function' &&
        typeof target.setTargetAtTime === 'function'
      ) {
        target.cancelScheduledValues(now);
        target.setTargetAtTime(value, now, rampSeconds / 3);
        return;
      }

      target.value = value;
    } catch {
      target.value = value;
    }
  }

  disableForColor(color: string): void {
    this.updateParameters({ time: 0, feedback: 0, wet: 0 }, color);
    this.disposeDelayInstance(color);
  }

  flushPlaybackTails(colors?: string[]): void {
    const targets = Array.isArray(colors) && colors.length > 0
      ? Array.from(new Set(colors))
      : Array.from(this.delayInstances.keys());

    targets.forEach(color => {
      this.rebuildDelayInstance(color);
    });
  }

  private rebuildDelayInstance(color: string): void {
    const hadDelay = this.disposeDelayInstance(color);
    const settings = this.currentSettings.get(color);

    if (settings && settings.wet > 0) {
      const delayInstance = this.createDelayInstance(settings.time, settings.feedback, settings.wet);
      if (delayInstance) {
        this.delayInstances.set(color, delayInstance);
      }
    }

    if (hadDelay || (settings?.wet ?? 0) > 0) {
      getSynthEngine()?.updateSynthForColor?.(color);
    }
  }

  private disposeDelayInstance(color: string): boolean {
    const delayInstance = this.delayInstances.get(color);
    if (!delayInstance) {
      return false;
    }

    try {
      delayInstance._crossFade?.dispose();
      delayInstance.dispose();
    } catch (error) {
      logger.warn('DelayAudioEffect', `Failed to dispose delay for ${color}`, error, 'audio');
    } finally {
      this.delayInstances.delete(color);
    }

    return true;
  }

  dispose(): void {
    Array.from(this.delayInstances.keys()).forEach(color => {
      this.disposeDelayInstance(color);
    });

    this.currentSettings.clear();
    this.delayInstances.clear();
    logger.info('DelayAudioEffect', 'Disposed', null, 'audio');
  }
}

export default DelayAudioEffect;
