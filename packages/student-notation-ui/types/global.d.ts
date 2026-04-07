import type { AnimatableNote } from '@mlt/types';
import type { DrawToolsControllerRuntime } from '@components/draw/drawToolsController.ts';

/* Global ambient declarations for browser-only helpers exposed on window */

interface EffectParams {
  time?: number;
  feedback?: number;
  decay?: number;
  roomSize?: number;
}

interface EffectsCoordinatorRuntime {
  getEffectParameters(colorKey: string, effectType: string): EffectParams;
}

interface StaticWaveformVisualizer {
  currentColor: string | null;
  calculatedAmplitude?: number;
  initialize(): boolean;
  generateWaveform(): void;
  startPhaseTransition?(fromPhases: Float32Array, toPhases: Float32Array, changedBinIndex?: number): void;
  startSingleNoteVisualization(color: string): void;
  stopLiveVisualization(): void;
  startLiveVisualization(): void;
  getNormalizedAmplitude(): number;
  dispose(): void;
}

interface AnimationEffectsManagerRuntime {
  updateAnimationState(): void;
  shouldTremoloBeRunning(): boolean;
  shouldVibratoBeRunning(): boolean;
  shouldEnvelopeFillBeRunning(): boolean;
  shouldAnimateNote(note: AnimatableNote): boolean;
  getVibratoYOffset(color?: string): number;
  getTremoloAmplitudeMultiplier(color: string): number;
  getADSRTremoloAmplitudeMultiplier(color: string): number;
  getFillLevel(note: AnimatableNote): number;
  shouldFillNote(note: AnimatableNote): boolean;
  triggerTremoloAmplitudeUpdate(): void;
  getAllActiveColors(): string[];
  dispose(): void;
}

interface SynthEngineRuntime {
  updateSynthForColor?: (color: string) => void;
  createWaveformAnalyzer?: (color: string) => unknown;
  getWaveformAnalyzer?: (color: string) => unknown;
  removeWaveformAnalyzer?: (color: string) => void;
}

interface AudioEffectsManagerRuntime {
  init?: () => boolean;
  applySynthEffects?: typeof import('@services/timbreEffects/effectsAudio/audioEffectsManager.ts').default.applySynthEffects;
  applyEffectsToVoice?: typeof import('@services/timbreEffects/effectsAudio/audioEffectsManager.ts').default.applyEffectsToVoice;
  flushPlaybackTails?: typeof import('@services/timbreEffects/effectsAudio/audioEffectsManager.ts').default.flushPlaybackTails;
  dispose?: typeof import('@services/timbreEffects/effectsAudio/audioEffectsManager.ts').default.dispose;
}

interface ModulationMappingRuntime {
  canvasXToMicrobeat: (x: number) => number;
  microbeatToCanvasX: (microbeat: number) => number;
}

interface DrumVolumeNodeRuntime {
  volume?: {
    value: number;
  };
}

declare global {
  interface Window {
    initAudio?: () => Promise<void>;
    scheduleCell?: (...args: unknown[]) => void;
    drumGridRenderer?: DrumGridRenderer;
    waveformVisualizer?: StaticWaveformVisualizer;
    effectsCoordinator?: EffectsCoordinatorRuntime;
    animationEffectsManager?: AnimationEffectsManagerRuntime;
    synthEngine?: SynthEngineRuntime;
    audioEffectsManager?: AudioEffectsManagerRuntime;
    adsrComponent?: {
      triggerPlayheadVisual: (noteId: string, phase: 'attack' | 'release', color: string, adsr: unknown) => void;
      clearAllPlayheadVisuals: () => void;
    };
    getModulationMapping?: () => ModulationMappingRuntime;
    drawToolsController?: DrawToolsControllerRuntime;
    drumVolumeNode?: DrumVolumeNodeRuntime;
    __transportTimeMap?: unknown[];
    __transportMusicalEnd?: string;
    Tone?: {
      now?: () => number;
      [key: string]: unknown;
    };
  }
  interface DrumGridRenderer {
    animationFrameId: number | null;
    render(): void;
    startAnimationLoop(): void;
    stopAnimationLoop(): void;
  }
}

export {};
