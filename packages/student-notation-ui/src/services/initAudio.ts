/**
 * Audio Initialization
 *
 * Initializes the audio synthesis engine using the @mlt/student-notation-engine
 * package's createSynthEngine() factory with app-specific configuration
 * including harmonic filtering and effects management.
 */

import { createSynthEngine, type SynthEngineInstance } from '@mlt/student-notation-engine';
import store from '@state/initStore.ts';
import logger from '@utils/logger.ts';
import { getFilteredCoefficients } from '@components/audio/harmonicsFilter/overtoneBins.ts';

logger.moduleLoaded('EngineAudio', 'general');

// Engine instance
let engineInstance: SynthEngineInstance | null = null;

/**
 * Adapter that wraps the engine's synth engine with the app's API
 */
const SynthEngine = {
  init() {
    logger.info('EngineAudio', 'Initializing with engine createSynthEngine()', null, 'audio');

    // Create the engine instance with dependency injection
    engineInstance = createSynthEngine({
      timbres: store.state.timbres,
      masterVolume: 0, // Start at 0dB

      // Inject the harmonic filter
      harmonicFilter: {
        getFilteredCoefficients: (color: string) => {
          return getFilteredCoefficients(color);
        }
      },

      // Inject the effects manager - always provide wrapper, check at call time
      // (window.audioEffectsManager is set by initAudioComponents which runs AFTER this)
      effectsManager: {
        applySynthEffects: (synth: any, color: string, masterGain: any) => {
          window.audioEffectsManager?.applySynthEffects(synth, color, masterGain);
        },
        applyEffectsToVoice: (voice: any, color: string) => {
          window.audioEffectsManager?.applyEffectsToVoice(voice, color);
        }
      },

      // Inject the logger
      logger: {
        debug: (context: string, message: string, data?: unknown) => {
          logger.debug(context, message, data, 'audio');
        },
        info: (context: string, message: string, data?: unknown) => {
          logger.info(context, message, data, 'audio');
        },
        warn: (context: string, message: string, data?: unknown) => {
          logger.warn(context, message, data, 'audio');
        }
      }
    });

    // Initialize the engine
    engineInstance.init();

    // Set up store event subscriptions
    store.on('timbreChanged', (color?: string) => {
      if (!color) {return;}
      this.updateSynthForColor(color);
    });

    store.on('filterChanged', (color?: string) => {
      if (!color) {return;}
      this.updateSynthForColor(color);
    });

    store.on('audioEffectChanged', (data?: { effectType?: string; color?: string; effectParams?: Record<string, number> }) => {
      if (!data || !data.color || !data.effectType) return;
      const { effectType, color } = data;

      // Only handle vibrato and tremolo here (voice-level effects)
      if (effectType === 'vibrato' || effectType === 'tremolo') {
        this.updateSynthForColor(color);
      }
    });

    store.on('volumeChanged', (dB?: number) => {
      if (typeof dB !== 'number') {return;}
      this.setVolume(dB);
    });

    // Expose on window for compatibility
    window.synthEngine = this;

    logger.info('EngineAudio', 'Initialization complete', null, 'audio');
  },

  updateSynthForColor(color: string) {
    if (!engineInstance) return;

    const timbre = store.state.timbres[color];
    if (!timbre) return;

    // Initialize vibrato/tremolo if missing
    if (!timbre.vibrato) {
      timbre.vibrato = { speed: 0, span: 0 };
    }
    if (!timbre.tremelo) {
      timbre.tremelo = { speed: 0, span: 0 };
    }

    engineInstance.updateSynthForColor(color);
  },

  playNote(pitch: string | number, duration: string | number, time?: number) {
    if (!engineInstance) return;
    engineInstance.playNote(pitch, duration, time);
  },

  triggerAttack(pitch: string | number, color: string, time?: number, isDrum?: boolean) {
    if (!engineInstance) return;
    engineInstance.triggerAttack(pitch, color, time, isDrum);
  },

  triggerAttackInteractive(pitch: string | number, color: string) {
    if (!engineInstance) return;
    engineInstance.triggerAttackInteractive(pitch, color);
  },

  triggerRelease(pitch: string | number, color: string, time?: number) {
    if (!engineInstance) return;
    engineInstance.triggerRelease(pitch, color, time);
  },

  releaseAll() {
    if (!engineInstance) return;
    engineInstance.releaseAll();
  },

  quickReleasePitches(pitches: Array<string | number>, color: string) {
    if (!engineInstance) return;
    engineInstance.quickReleasePitches(pitches, color);
  },

  setSynth(color: string, synth: any) {
    if (!engineInstance) return;
    (engineInstance as { setSynth?: (color: string, synth: any) => void }).setSynth?.(color, synth);
  },

  getSynth(color: string) {
    if (!engineInstance) return null;
    return engineInstance.getSynth(color);
  },

  getAllSynths() {
    if (!engineInstance) return {};
    return engineInstance.getAllSynths();
  },

  setBpm(tempo: number) {
    if (!engineInstance) return;
    engineInstance.setBpm(tempo);
  },

  setVolume(dB: number) {
    if (!engineInstance) return;
    engineInstance.setVolume(dB);
  },

  getMasterGainNode() {
    if (!engineInstance) return null;
    return engineInstance.getMasterGainNode();
  },

  getMainVolumeNode() {
    if (!engineInstance) return null;
    return engineInstance.getMainVolumeNode();
  },

  createWaveformAnalyzer(color: string) {
    if (!engineInstance) return null;
    return engineInstance.createWaveformAnalyzer(color);
  },

  getWaveformAnalyzer(color: string) {
    if (!engineInstance) return null;
    return engineInstance.getWaveformAnalyzer(color);
  },

  getAllWaveformAnalyzers() {
    if (!engineInstance) return new Map();
    return engineInstance.getAllWaveformAnalyzers();
  },

  removeWaveformAnalyzer(color: string) {
    if (!engineInstance) return;
    engineInstance.removeWaveformAnalyzer(color);
  },

  disposeAllWaveformAnalyzers() {
    if (!engineInstance) return;
    engineInstance.disposeAllWaveformAnalyzers();
  },

  stopBackgroundMonitors() {
    if (!engineInstance) return;
    engineInstance.stopBackgroundMonitors();
  },

  teardown() {
    this.dispose();
  },

  dispose() {
    if (!engineInstance) return;
    engineInstance.dispose();
    engineInstance = null;
  }
};

export default SynthEngine;
