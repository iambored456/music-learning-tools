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
let currentNote: string | null = null;
let currentFineTuneCents: number | null = null;
let activeEngine: DroneEngine | null = null;

const STRING_START_OFFSETS = [0.0, 0.28, 0.58, 0.46, 0.8, 0.12] as const;
const TANPURA_BASE_STRING_GAIN = 0.15;

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
  tanpuraGain.gain.rampTo(Tone.dbToGain(volumeDb), 0.08);
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

function setTanpuraPitch(note: string): void {
  if (tanpuraVoices.length === 0) return;
  const rootMidi = Tone.Frequency(note).toMidi();
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

function getSynthFrequency(note: string): number {
  const baseFrequency = Tone.Frequency(note).toFrequency();
  const fineTuneCents = appState.state.drone.tuning.fineTuneCents;
  return baseFrequency * (2 ** (fineTuneCents / 1200));
}

function normalizeTonic(tonic: string): string {
  const enharmonicMap: Record<string, string> = {
    Db: 'C#',
    Eb: 'D#',
    Gb: 'F#',
    Ab: 'G#',
    Bb: 'A#',
  };
  return enharmonicMap[tonic] ?? tonic;
}

/**
 * Get the note name with octave from tonic and octave
 */
function getNoteName(tonic: string, octave: number): string {
  return `${normalizeTonic(tonic)}${octave}`;
}

function startSynth(note: string): void {
  const s = ensureSynth();
  s.volume.value = appState.state.drone.volume;
  if (isPlaying && currentNote) {
    s.releaseAll();
  }
  s.triggerAttack(getSynthFrequency(note));
  activeEngine = 'synth';
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
  const note = getNoteName(appState.state.tonic, appState.state.drone.octave);
  currentNote = note;
  currentFineTuneCents = appState.state.drone.tuning.fineTuneCents;
  const preferredEngine = appState.state.drone.engine;

  if (preferredEngine === 'tanpura') {
    const player = await ensureTanpuraPlayer();
    if (player) {
      setTanpuraVolume(appState.state.drone.volume);
      applyTanpuraTuning();
      setTanpuraPitch(note);
      activeEngine = 'tanpura';
      isPlaying = true;
      return;
    }
  }

  startSynth(note);
}

/**
 * Stop the drone
 */
export function stopDrone(): void {
  stopTanpuraVoices();
  if (synth && isPlaying) {
    synth.releaseAll();
  }
  currentNote = null;
  currentFineTuneCents = null;
  activeEngine = null;
  isPlaying = false;
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

  const newNote = getNoteName(appState.state.tonic, appState.state.drone.octave);
  const fineTuneCents = appState.state.drone.tuning.fineTuneCents;

  if (activeEngine === 'tanpura' && tanpuraVoices.length > 0) {
    setTanpuraVolume(appState.state.drone.volume);
    applyTanpuraTuning();
    setTanpuraPitch(newNote);
    currentNote = newNote;
    currentFineTuneCents = fineTuneCents;
    return;
  }

  if (!synth) return;
  synth.volume.value = appState.state.drone.volume;

  if (newNote !== currentNote || fineTuneCents !== currentFineTuneCents) {
    synth.releaseAll();
    synth.triggerAttack(getSynthFrequency(newNote));
    currentNote = newNote;
    currentFineTuneCents = fineTuneCents;
  }
}

/**
 * Update drone volume immediately.
 */
export function setDroneVolume(db: number): void {
  setTanpuraVolume(db);
  if (synth) synth.volume.value = db;
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
