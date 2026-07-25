// js/components/DynamicWaveform/dynamicWaveformVisualizer.ts
import store from '@state/initStore.ts';
import { hexToRgba } from '@utils/colorUtils.ts';
import logger from '@utils/logger.ts';
import {
  getAnimationEffectsManager,
  getSynthEngine as getRuntimeSynthEngine
} from '@services/runtimeGlobals.ts';

interface WaveformAnalyser {
  getValue(): Float32Array;
}

interface SynthEngineWithAnalyser {
  createWaveformAnalyzer?: (color: string) => WaveformAnalyser | null;
  removeWaveformAnalyzer?: (color: string) => void;
}

interface VibratoAnimation { amplitude: number; phase: number }
interface VibratoEffect {
  animations: Map<string, VibratoAnimation>;
  shouldBeRunning: () => boolean;
}

interface AnimationEffectsManagerLike {
  getTremoloAmplitudeMultiplier: (color: string) => number;
  vibratoCanvasEffect?: VibratoEffect;
}

const getSynthEngine = (): SynthEngineWithAnalyser | null =>
  (getRuntimeSynthEngine() as SynthEngineWithAnalyser | null) ?? null;

const getAnimationManager = (): AnimationEffectsManagerLike | null =>
  (getAnimationEffectsManager() as AnimationEffectsManagerLike | undefined) ?? null;

logger.moduleLoaded('DynamicWaveformVisualizer');

const WAVEFORM_PHASE_CYCLES_PER_SECOND = 1;
const MAX_ANIMATION_DELTA_SECONDS = 0.1;

class DynamicWaveformVisualizer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private currentColor: string | null = null;

  private isPlaybackActive = false;
  private isVisualizationPaused = false;
  private liveAnalysers = new Map<string, WaveformAnalyser>();
  private liveWaveforms = new Map<string, Float32Array>();
  private playbackAnimationId: number | null = null;
  private isInitialized = false;
  private storeCleanups: Array<() => void> = [];

  private animationSpeed = 100;
  private lastAnimationTimestamp: number | null = null;
  private waveformPhaseByColor = new Map<string, number>();

  onWaveformUpdate?: () => void;

  initialize(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): boolean {
    if (this.isInitialized) {
      this.canvas = canvas;
      this.ctx = ctx;
      return true;
    }

    this.canvas = canvas;
    this.ctx = ctx;
    this.currentColor = store.state.selectedNote?.color || '#4a90e2';
    this.setupEventListeners();
    this.isInitialized = true;
    logger.info('DynamicWaveformVisualizer', 'Initialized with canvas context', null, 'waveform');
    return true;
  }

  private setupEventListeners(): void {
    const handleNoteChanged = ({ newNote }: { newNote?: { color?: string } } = {}) => {
      if (newNote?.color && newNote.color !== this.currentColor) {
        this.currentColor = newNote.color;
      }
    };

    const handlePlaybackStateChanged = ({ isPlaying = false, isPaused = false }: { isPlaying?: boolean; isPaused?: boolean } = {}) => {
      if (isPlaying && isPaused) {
        this.pauseLiveVisualization();
      } else if (!isPlaying) {
        this.stopLiveVisualization();
      }
    };

    const handlePlaybackStarted = () => this.startLiveVisualization();
    const handlePlaybackResumed = () => this.startLiveVisualization();
    const handlePlaybackPaused = () => this.pauseLiveVisualization();
    const handlePlaybackStopped = () => this.stopLiveVisualization();

    const handleTremoloAmplitudeUpdate = ({ activeColors }: { activeColors?: string[] } = {}) => {
      if (this.isPlaybackActive && activeColors?.some(color => this.liveWaveforms.has(color))) {
        logger.debug('DynamicWaveformVisualizer', 'Tremolo update received for active colors', activeColors, 'waveform');
      }
    };

    store.on('noteChanged', handleNoteChanged);
    store.on('playbackStateChanged', handlePlaybackStateChanged);
    store.on('playbackStarted', handlePlaybackStarted);
    store.on('playbackResumed', handlePlaybackResumed);
    store.on('playbackPaused', handlePlaybackPaused);
    store.on('playbackStopped', handlePlaybackStopped);
    store.on('tremoloAmplitudeUpdate', handleTremoloAmplitudeUpdate);

    this.storeCleanups.push(
      () => store.off('noteChanged', handleNoteChanged),
      () => store.off('playbackStateChanged', handlePlaybackStateChanged),
      () => store.off('playbackStarted', handlePlaybackStarted),
      () => store.off('playbackResumed', handlePlaybackResumed),
      () => store.off('playbackPaused', handlePlaybackPaused),
      () => store.off('playbackStopped', handlePlaybackStopped),
      () => store.off('tremoloAmplitudeUpdate', handleTremoloAmplitudeUpdate)
    );

    logger.info('DynamicWaveformVisualizer', 'Event subscriptions established', null, 'waveform');
  }

  setAnimationSpeed(percentage: number): void {
    if (!Number.isFinite(percentage)) {return;}
    this.animationSpeed = Math.max(5, Math.min(100, percentage));
  }

  startLiveVisualization(): void {
    if (this.isPlaybackActive) {
      this.resumeLiveVisualization();
      return;
    }
    this.isPlaybackActive = true;
    this.isVisualizationPaused = false;
    this.lastAnimationTimestamp = null;
    this.setupLiveAnalysers();
    this.updateContainerState(true);
    this.animateLiveWaveforms();
    logger.debug('DynamicWaveformVisualizer', 'Started live visualization', null, 'waveform');
  }

  pauseLiveVisualization(): void {
    if (!this.isPlaybackActive || this.isVisualizationPaused) {return;}

    this.isVisualizationPaused = true;
    this.lastAnimationTimestamp = null;
    if (this.playbackAnimationId !== null) {
      cancelAnimationFrame(this.playbackAnimationId);
      this.playbackAnimationId = null;
    }
    this.updateContainerState(true);
    logger.debug('DynamicWaveformVisualizer', 'Paused live visualization on current frame', null, 'waveform');
  }

  private resumeLiveVisualization(): void {
    if (!this.isVisualizationPaused) {return;}

    this.isVisualizationPaused = false;
    this.lastAnimationTimestamp = null;
    this.updateContainerState(true);
    this.animateLiveWaveforms();
    logger.debug('DynamicWaveformVisualizer', 'Resumed live visualization', null, 'waveform');
  }

  startSingleNoteVisualization(color: string): void {
    this.setupSingleAnalyser(color);

    if (this.isPlaybackActive) {
      this.updateContainerState(true);
      return;
    }

    this.isPlaybackActive = true;
    this.lastAnimationTimestamp = null;
    this.updateContainerState(true);
    this.animateLiveWaveforms();
    logger.debug('DynamicWaveformVisualizer', `Started single note visualization for ${color}`, null, 'waveform');
  }

  stopLiveVisualization(): void {
    this.isPlaybackActive = false;
    this.isVisualizationPaused = false;
    const synthEngine = getSynthEngine();
    this.liveAnalysers.forEach((_, color) => {
      synthEngine?.removeWaveformAnalyzer?.(color);
    });
    this.liveAnalysers.clear();
    this.liveWaveforms.clear();
    this.waveformPhaseByColor.clear();
    this.lastAnimationTimestamp = null;
    if (this.playbackAnimationId !== null) {
      cancelAnimationFrame(this.playbackAnimationId);
      this.playbackAnimationId = null;
    }
    this.updateContainerState(false);
    this.onWaveformUpdate?.();
    logger.debug('DynamicWaveformVisualizer', 'Stopped live visualization', null, 'waveform');
  }

  private updateContainerState(isLive: boolean): void {
    const wrapper = this.canvas?.parentElement;
    if (!wrapper) {return;}
    wrapper.classList.toggle('live-mode', isLive);
    wrapper.classList.toggle('pulsing', isLive && store.state.isPlaying && !store.state.isPaused);
  }

  private setupLiveAnalysers(): void {
    const synthEngine = getSynthEngine();
    if (!synthEngine) {
      logger.warn('DynamicWaveformVisualizer', 'SynthEngine not available for live analysis', null, 'waveform');
      return;
    }
    const activeColors = this.getActivePlayingColors();
    activeColors.forEach(color => {
      const analyser = synthEngine.createWaveformAnalyzer?.(color);
      if (analyser) {
        this.liveAnalysers.set(color, analyser);
        this.liveWaveforms.set(color, new Float32Array(1024));
        this.waveformPhaseByColor.set(color, this.waveformPhaseByColor.get(color) ?? 0);
        logger.debug('DynamicWaveformVisualizer', `Created analyser for ${color}`, null, 'waveform');
      }
    });
  }

  private setupSingleAnalyser(color: string): void {
    if (this.liveAnalysers.has(color)) {
      return;
    }

    const synthEngine = getSynthEngine();
    if (!synthEngine) {return;}
    const analyser = synthEngine.createWaveformAnalyzer?.(color);
    if (analyser) {
      this.liveAnalysers.set(color, analyser);
      this.liveWaveforms.set(color, new Float32Array(1024));
      this.waveformPhaseByColor.set(color, this.waveformPhaseByColor.get(color) ?? 0);
      logger.debug('DynamicWaveformVisualizer', `Created single analyser for ${color}`, null, 'waveform');
    }
  }

  private getActivePlayingColors(): string[] {
    const playingColors = new Set<string>();
    const placedNotes = store.state.placedNotes;
    if (store.state.isPlaying) {
      placedNotes.forEach(note => {
        if (!note.isDrum && note.color) {
          playingColors.add(note.color);
        }
      });
    }
    if (playingColors.size === 0 && this.currentColor) {
      playingColors.add(this.currentColor);
    }
    const result = Array.from(playingColors);
    logger.debug('DynamicWaveformVisualizer', 'Active playing colors detected', result, 'waveform');
    return result;
  }

  private animateLiveWaveforms(timestamp = performance.now()): void {
    if (!this.isPlaybackActive || this.isVisualizationPaused) {return;}

    const deltaSeconds = this.lastAnimationTimestamp === null
      ? 0
      : Math.min((timestamp - this.lastAnimationTimestamp) / 1000, MAX_ANIMATION_DELTA_SECONDS);
    this.lastAnimationTimestamp = timestamp;

    this.liveAnalysers.forEach((analyser, color) => {
      const newWaveformArray = analyser.getValue();
      this.liveWaveforms.set(color, newWaveformArray);
      this.advanceWaveformPhase(color, deltaSeconds);
    });

    this.onWaveformUpdate?.();
    this.playbackAnimationId = requestAnimationFrame((nextTimestamp) => this.animateLiveWaveforms(nextTimestamp));
  }

  private advanceWaveformPhase(color: string, deltaSeconds: number): void {
    if (deltaSeconds <= 0) {return;}
    const currentPhase = this.waveformPhaseByColor.get(color) ?? 0;
    const speedScale = this.animationSpeed / 100;
    const nextPhase = (currentPhase + deltaSeconds * WAVEFORM_PHASE_CYCLES_PER_SECOND * speedScale) % 1;
    this.waveformPhaseByColor.set(color, nextPhase);
  }

  private sampleWaveformAt(waveform: Float32Array, sampleIndex: number): number {
    const length = waveform.length;
    if (length === 0) {return 0;}

    const wrappedIndex = ((sampleIndex % length) + length) % length;
    const lowerIndex = Math.floor(wrappedIndex);
    const upperIndex = (lowerIndex + 1) % length;
    const fraction = wrappedIndex - lowerIndex;
    const lowerValue = waveform[lowerIndex] ?? 0;
    const upperValue = waveform[upperIndex] ?? lowerValue;
    return lowerValue + (upperValue - lowerValue) * fraction;
  }

  private getTriggeredSampleOffset(waveform: Float32Array): number {
    let maxAmplitude = 0;
    for (let i = 0; i < waveform.length; i++) {
      maxAmplitude = Math.max(maxAmplitude, Math.abs(waveform[i] ?? 0));
    }

    if (maxAmplitude < 0.01) {
      return 0;
    }

    const minimumSlope = maxAmplitude * 0.05;
    for (let i = 1; i < waveform.length; i++) {
      const previous = waveform[i - 1] ?? 0;
      const current = waveform[i] ?? 0;
      if (previous <= 0 && current > 0 && current - previous >= minimumSlope) {
        return i;
      }
    }

    return 0;
  }

  drawLiveWaveforms(width: number, centerY: number, baseAmplitude: number): void {
    const ctx = this.ctx;
    if (!ctx) {return;}
    const colors = Array.from(this.liveWaveforms.keys());
    if (colors.length === 1) {
      const color = colors[0];
      if (!color) {return;}
      const waveform = this.liveWaveforms.get(color);
      this.drawSingleLiveWaveform(waveform, color, width, centerY, baseAmplitude);
    } else if (colors.length > 1) {
      colors.forEach(color => {
        if (!color) {return;}
        const waveform = this.liveWaveforms.get(color);
        this.drawLayeredLiveWaveform(waveform, color, width, centerY, baseAmplitude, colors.length);
      });
    }
  }

  private drawSingleLiveWaveform(
    waveform: Float32Array | undefined,
    color: string,
    width: number,
    centerY: number,
    baseAmplitude: number
  ): void {
    const ctx = this.ctx;
    if (!ctx || !waveform || waveform.length === 0) {return;}

    const animationManager = getAnimationManager();
    let amplitude = baseAmplitude;
    if (animationManager) {
      const multiplier = animationManager.getTremoloAmplitudeMultiplier(color);
      amplitude *= multiplier;
    }

    let vibratoStretch = 0;
    const vibratoEffect = animationManager?.vibratoCanvasEffect;
    const vibratoAnimation = vibratoEffect?.animations.get(color);
    if (vibratoEffect && vibratoAnimation && vibratoEffect.shouldBeRunning()) {
      const sineValue = Math.sin(vibratoAnimation.phase);
      vibratoStretch = sineValue * vibratoAnimation.amplitude * 0.4;
    }

    let maxAmp = 0;
    for (let i = 0; i < waveform.length; i++) {
      const sampleValue = waveform[i] ?? 0;
      maxAmp = Math.max(maxAmp, Math.abs(sampleValue));
    }
    const normalizationFactor = maxAmp > 1 ? 1 / maxAmp : 1;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    const baseSpread = waveform.length / width;
    const stretchedSpread = baseSpread * (1 + vibratoStretch);
    const triggerOffsetSamples = this.getTriggeredSampleOffset(waveform);
    const phaseOffsetSamples = (this.waveformPhaseByColor.get(color) ?? 0) * waveform.length;

    for (let x = 0; x < width; x++) {
      const shiftAmount = vibratoStretch * width * 0.3;
      const shiftedX = x + shiftAmount;
      const sampleIndex = triggerOffsetSamples + shiftedX * stretchedSpread + phaseOffsetSamples;
      const sample = this.sampleWaveformAt(waveform, sampleIndex) * normalizationFactor;
      const y = centerY - (sample * amplitude);

      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();

    logger.debug('DynamicWaveformVisualizer', `Drew single live waveform for ${color} with tremolo and vibrato stretch`,
      { amplitudeRatio: amplitude / baseAmplitude, vibratoStretch }, 'waveform');
  }

  private drawLayeredLiveWaveform(
    waveform: Float32Array | undefined,
    color: string,
    width: number,
    centerY: number,
    baseAmplitude: number,
    totalLayers: number
  ): void {
    const ctx = this.ctx;
    if (!ctx || !waveform || waveform.length === 0) {return;}

    const animationManager = getAnimationManager();
    let amplitude = baseAmplitude;
    if (animationManager) {
      amplitude *= animationManager.getTremoloAmplitudeMultiplier(color);
    }

    let vibratoStretch = 0;
    const vibratoEffect = animationManager?.vibratoCanvasEffect;
    const vibratoAnimation = vibratoEffect?.animations.get(color);
    if (vibratoEffect && vibratoAnimation && vibratoEffect.shouldBeRunning()) {
      const sineValue = Math.sin(vibratoAnimation.phase);
      vibratoStretch = sineValue * vibratoAnimation.amplitude * 0.4;
    }

    let maxAmp = 0;
    for (let i = 0; i < waveform.length; i++) {
      const sampleValue = waveform[i] ?? 0;
      maxAmp = Math.max(maxAmp, Math.abs(sampleValue));
    }
    const normalizationFactor = maxAmp > 1 ? 1 / maxAmp : 1;

    const alpha = Math.max(0.4, 1.0 / totalLayers);
    ctx.strokeStyle = hexToRgba(color, alpha * 2);
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    const baseSpread = waveform.length / width;
    const stretchedSpread = baseSpread * (1 + vibratoStretch);
    const triggerOffsetSamples = this.getTriggeredSampleOffset(waveform);
    const phaseOffsetSamples = (this.waveformPhaseByColor.get(color) ?? 0) * waveform.length;

    for (let x = 0; x < width; x++) {
      const shiftAmount = vibratoStretch * width * 0.3;
      const shiftedX = x + shiftAmount;
      const sampleIndex = triggerOffsetSamples + shiftedX * stretchedSpread + phaseOffsetSamples;
      const sample = this.sampleWaveformAt(waveform, sampleIndex) * normalizationFactor;
      const y = centerY - (sample * amplitude * 0.7);

      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
  }

  isLiveMode(): boolean {
    return this.isPlaybackActive;
  }

  getLiveColors(): string[] {
    return Array.from(this.liveWaveforms.keys());
  }

  dispose(): void {
    this.stopLiveVisualization();
    this.storeCleanups.forEach(cleanup => cleanup());
    this.storeCleanups = [];
    this.canvas = null;
    this.ctx = null;
    this.currentColor = null;
    this.isInitialized = false;
    logger.info('DynamicWaveformVisualizer', 'Disposed', null, 'waveform');
  }
}

export default DynamicWaveformVisualizer;
