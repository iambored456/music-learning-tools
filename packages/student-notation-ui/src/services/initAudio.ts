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
import {
  getAudioEffectsManager,
  registerSynthEngine
} from '@services/runtimeGlobals.ts';

logger.moduleLoaded('EngineAudio', 'general');

// Engine instance
let engineInstance: SynthEngineInstance | null = null;

function isPlaybackFrozen(): boolean {
  return store.state.isPlaying && store.state.isPaused;
}

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
      // Runtime registration happens in initAudioComponents which runs after this service boots.
      effectsManager: {
        applySynthEffects: (synth: any, color: string, masterGain: any) => {
          getAudioEffectsManager()?.applySynthEffects?.(synth, color, masterGain);
        },
        applyEffectsToVoice: (voice: any, color: string) => {
          getAudioEffectsManager()?.applyEffectsToVoice?.(voice, color);
        },
        flushPlaybackTails: (colors?: string[]) => {
          getAudioEffectsManager()?.flushPlaybackTails?.(colors);
        }
      },

      getPreviewColor: () => {
        return store.state.selectedNote?.color ?? null;
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

    store.on('audioEffectChanged', (data?: { effectType?: string; color?: string; effectParams?: Record<string, number> }) => {
      if (!data || !data.color || !data.effectType) return;
      const { effectType, color } = data;

      // Only handle vibrato and tremolo here (voice-level effects)
      if (effectType === 'vibrato' || effectType === 'tremolo') {
        engineInstance?.updateModulationForColor(color);
      }
    });

    store.on('volumeChanged', (dB?: number) => {
      if (typeof dB !== 'number') {return;}
      this.setVolume(dB);
    });

    registerSynthEngine(this);

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

  updateModulationForColor(color: string) {
    if (!engineInstance) return;

    const timbre = store.state.timbres[color];
    if (!timbre) return;

    if (!timbre.vibrato) {
      timbre.vibrato = { speed: 0, span: 0 };
    }
    if (!timbre.tremelo) {
      timbre.tremelo = { speed: 0, span: 0 };
    }

    engineInstance.updateModulationForColor(color);
  },

  playNote(pitch: string | number, duration: string | number, time?: number, color?: string) {
    if (!engineInstance || isPlaybackFrozen()) return;
    engineInstance.playNote(pitch, duration, time, color);
  },

  triggerAttack(pitch: string | number, color: string, time?: number, isDrum?: boolean) {
    if (!engineInstance || isPlaybackFrozen()) return;

    if (time === undefined && !isDrum) {
      engineInstance.triggerAttackInteractive(pitch, color);
      return;
    }
    engineInstance.triggerAttack(pitch, color, time, isDrum);
  },

  triggerAttackInteractive(pitch: string | number, color: string) {
    if (!engineInstance || isPlaybackFrozen()) return;
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

  flushPlaybackTails(colors?: string[]) {
    if (!engineInstance) return;
    engineInstance.flushPlaybackTails?.(colors);
  },

  hardStopAllSound(options?: { skipFade?: boolean }) {
    if (!engineInstance) return;
    if (typeof engineInstance.hardStopAllSound === 'function') {
      engineInstance.hardStopAllSound(options);
      return;
    }
    engineInstance.releaseAll();
    engineInstance.flushPlaybackTails?.();
  },

  resetForPlayback() {
    if (!engineInstance) return;
    engineInstance.resetForPlayback?.();
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
