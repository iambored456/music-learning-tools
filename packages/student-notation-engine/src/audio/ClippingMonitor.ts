/**
 * Clipping Monitor
 *
 * Monitors audio levels and warns when approaching clipping thresholds.
 * Framework-agnostic - callbacks handle the warning notifications.
 */
import type * as Tone from 'tone';

export interface ClippingMonitorOptions {
  clippingWarningThresholdDb?: number;
  clippingMonitorIntervalMs?: number;
  clippingWarningCooldownMs?: number;
  onWarning?: (levelDb: number) => void;
}

export const DEFAULT_CLIPPING_MONITOR_OPTIONS: Required<Omit<ClippingMonitorOptions, 'onWarning'>> = {
  clippingWarningThresholdDb: -3.0,
  clippingMonitorIntervalMs: 500,
  clippingWarningCooldownMs: 2000
};

export class ClippingMonitor {
  private readonly meter: Tone.Meter;
  private readonly options: Required<Omit<ClippingMonitorOptions, 'onWarning'>> & { onWarning?: (levelDb: number) => void };
  private clippingMonitorId: ReturnType<typeof setInterval> | null = null;
  private lastClippingWarningAt = 0;

  constructor(meter: Tone.Meter, options: ClippingMonitorOptions = {}) {
    this.meter = meter;
    this.options = { ...DEFAULT_CLIPPING_MONITOR_OPTIONS, ...options };
  }

  start(): void {
    this.stop();
    this.lastClippingWarningAt = 0;

    this.clippingMonitorId = setInterval(() => {
      const level = this.meter.getValue();
      const levelValue = Array.isArray(level) ? level[0] : level;
      if (levelValue === undefined) {
        return;
      }
      if (levelValue <= this.options.clippingWarningThresholdDb) {
        return;
      }

      const now = Date.now();
      if (now - this.lastClippingWarningAt < this.options.clippingWarningCooldownMs) {
        return;
      }

      this.lastClippingWarningAt = now;
      this.options.onWarning?.(levelValue);
    }, this.options.clippingMonitorIntervalMs);
  }

  stop(): void {
    if (this.clippingMonitorId === null) {
      return;
    }
    clearInterval(this.clippingMonitorId);
    this.clippingMonitorId = null;
  }
}
