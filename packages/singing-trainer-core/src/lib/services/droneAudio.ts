/**
 * Drone Audio Service
 *
 * Uses a PureTones-derived tanpura sample for drone playback, with a synth fallback.
 */

import * as Tone from 'tone';
import {
  TANPURA_SAMPLE_URL,
  getTanpuraFilterFrequencyFromTuning,
  getTanpuraFilterQFromTuning,
  getTanpuraPlaybackRateForTuning,
  getTanpuraStringSemitoneOffset,
  getTanpuraTremoloDepthFromTuning,
  getTanpuraTremoloFrequencyFromTuning,
  type DroneEngine,
  type TanpuraStringBehavior,
} from '@mlt/tanpura-drone';
import { appState } from '../stores/appState.svelte.js';
import { preferencesStore } from '../stores/preferencesStore.svelte.js';

// Module state
let synth: Tone.PolySynth | null = null;
type TanpuraStringVoice = {
  player: Tone.Player;
  gain: Tone.Gain;
};

let tanpuraVoices: TanpuraStringVoice[] = [];
let tanpuraMixer: Tone.Gain | null = null;
let tanpuraFilter: Tone.Filter | null = null;
let tanpuraTremolo: Tone.Tremolo | null = null;
let tanpuraGain: Tone.Gain | null = null;
let isPlaying = false;
let currentRootMidi: number | null = null;
let currentFineTuneCents: number | null = null;
let activeEngine: DroneEngine | null = null;

const STRING_START_OFFSETS = [0.0, 0.28, 0.58, 0.46, 0.8, 0.12] as const;
const TANPURA_BASE_STRING_GAIN = 0.22;
const TANPURA_BASE_VOLUME_BOOST_DB = 9;
const SYNTH_VOLUME_SCALE_DB = 20 * Math.log10(0.5);

/**
 * Initialize synth fallback when the tanpura sample cannot be loaded.
 */
function ensureSynth(): Tone.PolySynth {
  if (!synth) {
    synth = new Tone.PolySynth({
      maxPolyphony: Infinity,
      voice: Tone.Synth,
      options: {
        oscillator: { type: 'sawtooth' },
        envelope: {
          attack: 0.3,
          decay: 0.1,
          sustain: 0.8,
          release: 0.5,
        },
      },
    }).toDestination();
  }
  return synth;
}

async function ensureTanpuraPlayer(): Promise<Tone.Player | null> {
  if (tanpuraVoices.length > 0) return tanpuraVoices[0]?.player ?? null;

  try {
    const mixer = new Tone.Gain(1);
    const filter = new Tone.Filter({
      type: 'lowpass',
      frequency: 2600,
      Q: 0.9,
      rolloff: -24,
    });
    const tremolo = new Tone.Tremolo({
      frequency: 3.4,
      depth: 0.12,
      spread: 80,
    }).start();
    const gain = new Tone.Gain(0.5).toDestination();
    mixer.chain(filter, tremolo, gain);

    const voices = Array.from({ length: 6 }, () => {
      const player = new Tone.Player({
        url: TANPURA_SAMPLE_URL,
        loop: true,
        autostart: false,
        fadeIn: 0.08,
        fadeOut: 0.16,
      });
      const voiceGain = new Tone.Gain(0);
      player.connect(voiceGain);
      voiceGain.connect(mixer);
      return { player, gain: voiceGain };
    });

    tanpuraVoices = voices;
    tanpuraMixer = mixer;
    tanpuraFilter = filter;
    tanpuraTremolo = tremolo;
    tanpuraGain = gain;
    await Tone.loaded();
    applyTanpuraTuning();
    return tanpuraVoices[0]?.player ?? null;
  } catch (error) {
    console.warn('[DroneAudio] Failed to initialize tanpura sample, using synth fallback', error);
    disposeTanpuraEngine();
    return null;
  }
}

function setTanpuraVolume(volumeDb: number): void {
  if (!tanpuraGain) return;
  const effectiveVolumeDb = Math.min(volumeDb + TANPURA_BASE_VOLUME_BOOST_DB, 0);
  tanpuraGain.gain.rampTo(Tone.dbToGain(effectiveVolumeDb), 0.08);
}

function getSynthVolumeDb(volumeDb: number): number {
  return volumeDb + SYNTH_VOLUME_SCALE_DB;
}

function applyTanpuraTuning(): void {
  const tuning = appState.state.drone.tuning;
  if (tanpuraFilter) {
    tanpuraFilter.frequency.rampTo(getTanpuraFilterFrequencyFromTuning(tuning), 0.08);
    tanpuraFilter.Q.rampTo(getTanpuraFilterQFromTuning(tuning), 0.08);
  }
  if (tanpuraTremolo) {
    tanpuraTremolo.depth.rampTo(getTanpuraTremoloDepthFromTuning(tuning), 0.08);
    tanpuraTremolo.frequency.rampTo(getTanpuraTremoloFrequencyFromTuning(tuning), 0.08);
  }
}

function getMergedStringTuning(stringBehavior: TanpuraStringBehavior): {
  fineTuneCents: number;
  variance: number;
} {
  return {
    fineTuneCents:
      appState.state.drone.tuning.fineTuneCents
      + stringBehavior.fineTuneCents
      + (stringBehavior.ultraFineTuneCents / 100),
    variance: Math.max(
      0,
      Math.min(100, (appState.state.drone.tuning.variance + stringBehavior.variance) / 2)
    ),
  };
}

function setTanpuraPitch(rootMidi: number): void {
  if (tanpuraVoices.length === 0) return;
  const stringSettings = appState.state.drone.strings;
  const now = Tone.now();

  tanpuraVoices.forEach((voice, index) => {
    const stringBehavior = stringSettings[index];
    if (!stringBehavior || !stringBehavior.enabled) {
      voice.gain.gain.rampTo(0, 0.08);
      if (voice.player.state === 'started') {
        voice.player.stop();
      }
      return;
    }

    const merged = getMergedStringTuning(stringBehavior);
    const semitoneOffset = getTanpuraStringSemitoneOffset(stringBehavior.noteIndex);
    const playbackRate = getTanpuraPlaybackRateForTuning(
      rootMidi + semitoneOffset,
      {
        ...appState.state.drone.tuning,
        fineTuneCents: merged.fineTuneCents,
        variance: merged.variance,
      },
      (now * 0.18) + (index * 0.11)
    );

    voice.player.playbackRate = playbackRate;
    const targetGain = TANPURA_BASE_STRING_GAIN * Tone.dbToGain(stringBehavior.gainDb);
    voice.gain.gain.rampTo(targetGain, 0.08);

    if (voice.player.state !== 'started') {
      voice.player.start(`+${STRING_START_OFFSETS[index] ?? (index * 0.12)}`);
    }
  });
}

function getSynthFrequency(rootMidi: number): number {
  const baseFrequency = 440 * (2 ** ((rootMidi - 69) / 12));
  const fineTuneCents = appState.state.drone.tuning.fineTuneCents;
  return baseFrequency * (2 ** (fineTuneCents / 1200));
}

function getDroneRootMidi(): number {
  const speakingPitchMidi = preferencesStore.speakingPitchMidi;
  return typeof speakingPitchMidi === 'number' && Number.isFinite(speakingPitchMidi)
    ? speakingPitchMidi
    : 60;
}

function startSynth(rootMidi: number): void {
  const s = ensureSynth();
  s.volume.value = getSynthVolumeDb(appState.state.drone.volume);
  if (isPlaying && currentRootMidi !== null) {
    s.releaseAll();
  }
  s.triggerAttack(getSynthFrequency(rootMidi));
  activeEngine = 'synth';
  currentRootMidi = rootMidi;
  currentFineTuneCents = appState.state.drone.tuning.fineTuneCents;
  isPlaying = true;
}

function stopTanpuraVoices(): void {
  tanpuraVoices.forEach((voice) => {
    voice.gain.gain.rampTo(0, 0.05);
    if (voice.player.state === 'started') {
      voice.player.stop();
    }
  });
}

function disposeTanpuraEngine(): void {
  stopTanpuraVoices();
  tanpuraVoices.forEach((voice) => {
    voice.player.dispose();
    voice.gain.dispose();
  });
  tanpuraVoices = [];

  if (tanpuraMixer) {
    tanpuraMixer.dispose();
    tanpuraMixer = null;
  }
  if (tanpuraFilter) {
    tanpuraFilter.dispose();
    tanpuraFilter = null;
  }
  if (tanpuraTremolo) {
    tanpuraTremolo.dispose();
    tanpuraTremolo = null;
  }
  if (tanpuraGain) {
    tanpuraGain.dispose();
    tanpuraGain = null;
  }
}

/**
 * Start playing the drone
 */
export async function startDrone(): Promise<void> {
  // Ensure audio context is started (required for browsers)
  await Tone.start();
  const rootMidi = getDroneRootMidi();
  currentRootMidi = rootMidi;
  currentFineTuneCents = appState.state.drone.tuning.fineTuneCents;
  const preferredEngine = appState.state.drone.engine;

  if (preferredEngine === 'tanpura') {
    const player = await ensureTanpuraPlayer();
    if (player) {
      setTanpuraVolume(appState.state.drone.volume);
      applyTanpuraTuning();
      setTanpuraPitch(rootMidi);
      activeEngine = 'tanpura';
      isPlaying = true;
      appState.setDronePlaying(true);
      return;
    }
  }

  startSynth(rootMidi);
  appState.setDronePlaying(true);
}

/**
 * Stop the drone
 */
export function stopDrone(): void {
  stopTanpuraVoices();
  if (synth && isPlaying) {
    synth.releaseAll();
  }
  currentRootMidi = null;
  currentFineTuneCents = null;
  activeEngine = null;
  isPlaying = false;
  appState.setDronePlaying(false);
}

/**
 * Update drone parameters (tonic, octave, volume)
 */
export function updateDrone(): void {
  if (!isPlaying) return;

  const selectedEngine = appState.state.drone.engine;
  if (activeEngine !== selectedEngine) {
    stopDrone();
    void startDrone();
    return;
  }

  const newRootMidi = getDroneRootMidi();
  const fineTuneCents = appState.state.drone.tuning.fineTuneCents;

  if (activeEngine === 'tanpura' && tanpuraVoices.length > 0) {
    setTanpuraVolume(appState.state.drone.volume);
    applyTanpuraTuning();
    setTanpuraPitch(newRootMidi);
    currentRootMidi = newRootMidi;
    currentFineTuneCents = fineTuneCents;
    return;
  }

  if (!synth) return;
  synth.volume.value = getSynthVolumeDb(appState.state.drone.volume);

  if (newRootMidi !== currentRootMidi || fineTuneCents !== currentFineTuneCents) {
    synth.releaseAll();
    synth.triggerAttack(getSynthFrequency(newRootMidi));
    currentRootMidi = newRootMidi;
    currentFineTuneCents = fineTuneCents;
  }
}

/**
 * Update drone volume immediately.
 */
export function setDroneVolume(db: number): void {
  setTanpuraVolume(db);
  if (synth) synth.volume.value = getSynthVolumeDb(db);
}

/**
 * Toggle drone on/off
 */
export async function toggleDrone(): Promise<void> {
  if (isPlaying) {
    stopDrone();
  } else {
    await startDrone();
  }
}

/**
 * Check if drone is playing
 */
export function isDronePlaying(): boolean {
  return isPlaying;
}

/**
 * Clean up resources
 */
export function dispose(): void {
  stopDrone();
  if (synth) {
    synth.dispose();
    synth = null;
  }
  disposeTanpuraEngine();
}
