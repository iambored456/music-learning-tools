/**
 * Audio Initialization
 *
 * Initializes the audio synthesis engine using the @mlt/student-notation-engine
 * package's createSynthEngine() factory with app-specific configuration
 * including harmonic filtering and effects management.
 */

import { createSynthEngine, type SynthEngineInstance } from '@mlt/student-notation-engine';
import * as Tone from 'tone';
import store from '@state/initStore.ts';
import logger from '@utils/logger.ts';
import { getFilteredCoefficients } from '@components/audio/harmonicsFilter/overtoneBins.ts';
import {
  getAudioEffectsManager,
  getWaveformVisualizer,
  registerSynthEngine
} from '@services/runtimeGlobals.ts';

logger.moduleLoaded('EngineAudio', 'general');

// Engine instance
let engineInstance: SynthEngineInstance | null = null;

const ANALYSER_PREROLL_SECONDS = 0.02;
const WAVEFORM_RELEASE_PADDING_MS = 80;
const QUICK_RELEASE_VISUAL_TAIL_MS = 90;

const activeWaveformVoicesByColor = new Map<string, number>();
const waveformStopTimersByColor = new Map<string, ReturnType<typeof setTimeout>>();

function getAudioTimeDelayMs(time?: number, offsetSeconds = 0): number {
  if (typeof time !== 'number' || !Number.isFinite(time)) {
    return 0;
  }
  return Math.max(0, (time - Tone.now() + offsetSeconds) * 1000);
}

function getReleaseTailMs(color: string): number {
  const releaseSeconds = store.state.timbres[color]?.adsr?.release;
  return Math.max(0, (typeof releaseSeconds === 'number' ? releaseSeconds : 0.3) * 1000);
}

function clearWaveformStopTimer(color: string): void {
  const timerId = waveformStopTimersByColor.get(color);
  if (!timerId) {
    return;
  }
  clearTimeout(timerId);
  waveformStopTimersByColor.delete(color);
}

function getTotalActiveWaveformVoices(): number {
  let total = 0;
  activeWaveformVoicesByColor.forEach(count => {
    total += count;
  });
  return total;
}

function startWaveformForColor(color: string, time?: number): void {
  if (store.state.isPlaying && !store.state.isPaused) {
    return;
  }

  const delayMs = getAudioTimeDelayMs(time, -ANALYSER_PREROLL_SECONDS);
  setTimeout(() => {
    clearWaveformStopTimer(color);
    activeWaveformVoicesByColor.set(color, (activeWaveformVoicesByColor.get(color) ?? 0) + 1);

    const waveformVisualizer = getWaveformVisualizer();
    if (!waveformVisualizer) {
      return;
    }

    waveformVisualizer.currentColor = color;
    waveformVisualizer.generateWaveform();
    waveformVisualizer.startSingleNoteVisualization(color);
  }, delayMs);
}

function scheduleWaveformStopIfQuiet(color: string, tailMs: number): void {
  clearWaveformStopTimer(color);
  waveformStopTimersByColor.set(color, setTimeout(() => {
    waveformStopTimersByColor.delete(color);
    if (getTotalActiveWaveformVoices() > 0 || (store.state.isPlaying && !store.state.isPaused)) {
      return;
    }
    getWaveformVisualizer()?.stopLiveVisualization();
  }, tailMs + WAVEFORM_RELEASE_PADDING_MS));
}

function releaseWaveformForColor(color: string, time?: number, tailMs = getReleaseTailMs(color)): void {
  if (store.state.isPlaying && !store.state.isPaused) {
    return;
  }

  const delayMs = getAudioTimeDelayMs(time);
  setTimeout(() => {
    const nextCount = Math.max(0, (activeWaveformVoicesByColor.get(color) ?? 0) - 1);
    if (nextCount === 0) {
      activeWaveformVoicesByColor.delete(color);
      scheduleWaveformStopIfQuiet(color, tailMs);
      return;
    }
    activeWaveformVoicesByColor.set(color, nextCount);
  }, delayMs);
}

function releaseAllWaveformVisuals(tailMs?: number): void {
  const colors = Array.from(activeWaveformVoicesByColor.keys());
  activeWaveformVoicesByColor.clear();
  colors.forEach(color => scheduleWaveformStopIfQuiet(color, tailMs ?? getReleaseTailMs(color)));
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
    if (!engineInstance) return;
    engineInstance.playNote(pitch, duration, time, color);
  },

  triggerAttack(pitch: string | number, color: string, time?: number, isDrum?: boolean) {
    if (!engineInstance) return;
    if (!isDrum) {
      startWaveformForColor(color, time);
    }
    engineInstance.triggerAttack(pitch, color, time, isDrum);
  },

  triggerAttackInteractive(pitch: string | number, color: string) {
    if (!engineInstance) return;
    startWaveformForColor(color, Tone.now() + 0.02);
    engineInstance.triggerAttackInteractive(pitch, color);
  },

  triggerRelease(pitch: string | number, color: string, time?: number) {
    if (!engineInstance) return;
    engineInstance.triggerRelease(pitch, color, time);
    releaseWaveformForColor(color, time);
  },

  releaseAll() {
    if (!engineInstance) return;
    engineInstance.releaseAll();
    releaseAllWaveformVisuals();
  },

  flushPlaybackTails(colors?: string[]) {
    if (!engineInstance) return;
    engineInstance.flushPlaybackTails?.(colors);
  },

  hardStopAllSound() {
    if (!engineInstance) return;
    if (typeof engineInstance.hardStopAllSound === 'function') {
      engineInstance.hardStopAllSound();
      releaseAllWaveformVisuals(QUICK_RELEASE_VISUAL_TAIL_MS);
      return;
    }
    engineInstance.releaseAll();
    engineInstance.flushPlaybackTails?.();
    releaseAllWaveformVisuals();
  },

  quickReleasePitches(pitches: Array<string | number>, color: string) {
    if (!engineInstance) return;
    engineInstance.quickReleasePitches(pitches, color);
    pitches.forEach(() => releaseWaveformForColor(color, undefined, QUICK_RELEASE_VISUAL_TAIL_MS));
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
