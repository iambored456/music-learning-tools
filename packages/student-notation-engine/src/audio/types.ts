/**
 * Audio Module Types
 */

import type * as Tone from 'tone';
import type { TimbresMap, TimbreState } from '@mlt/types';

/**
 * Effects manager interface for synth-level effects (reverb, delay).
 * The app provides this to the engine for effect routing.
 */
export interface EffectsManager {
  /** Apply synth-level effects (e.g., reverb, delay) */
  applySynthEffects(synth: unknown, color: string, masterGain: Tone.Gain): void;
  /** Apply effects to a specific voice */
  applyEffectsToVoice(voice: unknown, color: string): void;
}

/**
 * Harmonic filter interface for getting filtered coefficients.
 * The app provides this to handle frequency-dependent filtering.
 */
export interface HarmonicFilter {
  /** Get filtered coefficients for a color */
  getFilteredCoefficients(color: string): Float32Array;
}

/**
 * Logger interface for synth engine.
 */
export interface SynthLogger {
  debug(category: string, message: string, data?: unknown, context?: string): void;
  info(category: string, message: string, data?: unknown, context?: string): void;
  warn(category: string, message: string, data?: unknown, context?: string): void;
}

/**
 * Callback for audio initialization (user gesture).
 */
export type AudioInitCallback = () => Promise<void>;

/**
 * Callback for getting drum volume.
 */
export type GetDrumVolumeCallback = () => number;

/**
 * Synth Engine Instance
 */
export interface SynthEngineInstance {
  /** Initialize the synth engine */
  init(): void;

  /** Play a note */
  playNote(pitch: string | number, duration: number | string, time?: number): Promise<void>;

  /** Trigger attack for a note (used by Transport scheduling) */
  triggerAttack(pitch: string | number, color: string, time?: number, isDrum?: boolean): void;

  /**
   * Trigger attack for interactive (user-initiated) events.
   * Adds a small scheduling offset to help avoid audio pops.
   */
  triggerAttackInteractive(pitch: string | number, color: string): void;

  /** Quick release for specific pitches (used during note dragging) */
  quickReleasePitches(pitches: Array<string | number>, color: string): void;

  /** Trigger release for a note */
  triggerRelease(pitch: string | number, color: string, time?: number): void;

  /** Release all voices */
  releaseAll(): void;

  /** Update synth for a specific timbre color */
  updateSynthForColor(color: string): void;

  /** Set the BPM */
  setBpm(tempo: number): void;

  /** Set the master volume in dB */
  setVolume(dB: number): void;

  /** Get the master gain node for external connections */
  getMasterGainNode(): Tone.Gain | null;

  /** Get the main volume node */
  getMainVolumeNode(): Tone.Volume | null;

  /** Get a synth by color */
  getSynth(color: string): unknown | null;

  /** Get all synths */
  getAllSynths(): Record<string, unknown>;

  /** Create waveform analyzer for visualization */
  createWaveformAnalyzer(color: string): Tone.Analyser | null;

  /** Get waveform analyzer for a color */
  getWaveformAnalyzer(color: string): Tone.Analyser | null;

  /** Get all waveform analyzers */
  getAllWaveformAnalyzers(): Map<string, Tone.Analyser>;

  /** Remove waveform analyzer */
  removeWaveformAnalyzer(color: string): void;

  /** Dispose all waveform analyzers */
  disposeAllWaveformAnalyzers(): void;

  /** Stop background monitors */
  stopBackgroundMonitors(): void;

  /** Clean up resources */
  dispose(): void;
}

/**
 * Transport Service Instance
 */
export interface TransportServiceInstance {
  /** Initialize the transport */
  init(): void;

  /** Start playback from the beginning */
  start(): void;

  /** Resume paused playback */
  resume(): void;

  /** Pause playback */
  pause(): void;

  /** Stop playback and reset */
  stop(): void;

  /** Handle state changes (notes or rhythm changed) */
  handleStateChange(): void;

  /** Clean up resources */
  dispose(): void;
}

/**
 * Configuration for synth engine
 */
export interface SynthEngineConfig {
  /** Initial timbres */
  timbres: TimbresMap;
  /** Master volume in dB */
  masterVolume?: number;
  /** Optional effects manager */
  effectsManager?: EffectsManager;
  /** Optional harmonic filter */
  harmonicFilter?: HarmonicFilter;
  /** Optional logger */
  logger?: SynthLogger;
  /** Optional audio init callback (for user gesture compliance) */
  audioInit?: AudioInitCallback;
  /** Optional drum volume callback */
  getDrumVolume?: GetDrumVolumeCallback;
  /** Callback when timbre is updated */
  onTimbreUpdated?: (color: string) => void;
}

/**
 * Configuration for transport service
 */
export interface TransportConfig {
  /** Store instance for state access */
  store: unknown;
  /** Synth engine instance */
  synthEngine: SynthEngineInstance;
  /** Pitch grid playhead canvas context (optional) */
  pitchPlayheadContext?: CanvasRenderingContext2D;
  /** Drum grid playhead canvas context (optional) */
  drumPlayheadContext?: CanvasRenderingContext2D;
}

/**
 * Extended timbre state for internal synth use
 */
export interface InternalTimbreState extends TimbreState {
  vibrato?: { speed: number; span: number };
  tremelo?: { speed: number; span: number };
  filter?: {
    enabled: boolean;
    cutoff: number;
    resonance: number;
    blend: number;
  };
  gain?: number;
}
