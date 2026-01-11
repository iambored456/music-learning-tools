import * as Tone from 'tone';

export interface GainManagerOptions {
  polyphonyReference?: number;
  smoothingTauMs?: number;
  masterGainRampMs?: number;
  gainUpdateIntervalMs?: number;
}

export const DEFAULT_GAIN_MANAGER_OPTIONS: Required<GainManagerOptions> = {
  polyphonyReference: 32,
  smoothingTauMs: 200,
  masterGainRampMs: 50,
  gainUpdateIntervalMs: 16
};

export function getPerVoiceBaselineGain(polyphonyReference = DEFAULT_GAIN_MANAGER_OPTIONS.polyphonyReference): number {
  return 1.0 / Math.sqrt(polyphonyReference);
}

export class GainManager {
  private readonly masterGain: Tone.Gain;
  private readonly options: Required<GainManagerOptions>;
  private readonly perVoiceBaselineGain: number;

  private activeVoiceCount = 0;
  private smoothedVoiceCount: number;
  private gainUpdateLoopId: ReturnType<typeof setInterval> | null = null;

  constructor(masterGain: Tone.Gain, options: GainManagerOptions = {}) {
    this.masterGain = masterGain;
    this.options = { ...DEFAULT_GAIN_MANAGER_OPTIONS, ...options };
    this.perVoiceBaselineGain = getPerVoiceBaselineGain(this.options.polyphonyReference);
    this.smoothedVoiceCount = this.options.polyphonyReference;
  }

  start(): void {
    this.stop();
    this.gainUpdateLoopId = setInterval(() => this.updateMasterGain(), this.options.gainUpdateIntervalMs);
  }

  stop(): void {
    if (this.gainUpdateLoopId === null) {
      return;
    }
    clearInterval(this.gainUpdateLoopId);
    this.gainUpdateLoopId = null;
  }

  noteOn(voiceCount = 1): void {
    if (voiceCount <= 0) {
      return;
    }
    this.activeVoiceCount += voiceCount;
  }

  noteOff(voiceCount = 1): void {
    if (voiceCount <= 0) {
      return;
    }
    this.activeVoiceCount = Math.max(0, this.activeVoiceCount - voiceCount);
  }

  clampActiveVoiceCountToAtMost(maxVoiceCount: number): void {
    if (!Number.isFinite(maxVoiceCount)) {
      return;
    }
    this.activeVoiceCount = Math.max(0, Math.min(this.activeVoiceCount, Math.floor(maxVoiceCount)));
  }

  resetActiveVoiceCount(): void {
    this.activeVoiceCount = 0;
  }

  getActiveVoiceCount(): number {
    return this.activeVoiceCount;
  }

  private updateMasterGain(): void {
    const { polyphonyReference, smoothingTauMs, masterGainRampMs, gainUpdateIntervalMs } = this.options;

    const now = Tone.now();

    if (this.activeVoiceCount === 0) {
      const alpha = 0.01;
      this.smoothedVoiceCount = alpha * polyphonyReference + (1 - alpha) * this.smoothedVoiceCount;
      return;
    }

    const deltaT = gainUpdateIntervalMs / 1000;
    const alpha = 1 - Math.exp(-deltaT / (smoothingTauMs / 1000));

    const currentVoices = Math.max(1, this.activeVoiceCount);
    this.smoothedVoiceCount = alpha * currentVoices + (1 - alpha) * this.smoothedVoiceCount;

    const scaleFactor = Math.sqrt(polyphonyReference / this.smoothedVoiceCount);
    const targetGain = this.perVoiceBaselineGain * scaleFactor;

    this.masterGain.gain.rampTo(targetGain, masterGainRampMs / 1000, now);
  }
}

