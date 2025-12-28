/**
 * Drone Audio Service
 *
 * Provides a sustained drone tone using Tone.js for pitch reference.
 */

import * as Tone from 'tone';
import { appState } from '../stores/appState.svelte.js';

// Module state
let synth: Tone.PolySynth | null = null;
let isPlaying = false;
let currentNote: string | null = null;

// Note name mapping
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Initialize the drone synth
 */
function ensureSynth(): Tone.PolySynth {
  if (!synth) {
    synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: {
        attack: 0.3,
        decay: 0.1,
        sustain: 0.8,
        release: 0.5,
      },
    }).toDestination();
    const oscillatorType = synth.get().oscillator?.type ?? 'unknown';
    console.log('[DroneAudio] Initialized drone synth', { oscillatorType });
  }
  return synth;
}

/**
 * Get the note name with octave from tonic and octave
 */
function getNoteName(tonic: string, octave: number): string {
  // Normalize tonic (handle flats)
  const normalizedTonic = tonic.replace('b', '#').replace('Db', 'C#').replace('Eb', 'D#')
    .replace('Gb', 'F#').replace('Ab', 'G#').replace('Bb', 'A#');
  return `${normalizedTonic}${octave}`;
}

/**
 * Start playing the drone
 */
export async function startDrone(): Promise<void> {
  // Ensure audio context is started (required for browsers)
  await Tone.start();

  const s = ensureSynth();
  const note = getNoteName(appState.state.tonic, appState.state.drone.octave);

  // Set volume (convert from dB scale used in app to Tone.js scale)
  s.volume.value = appState.state.drone.volume;
  console.log('[DroneAudio] Starting drone', {
    note,
    volume: s.volume.value,
  });

  // Release any current note before starting new one
  if (currentNote) {
    s.releaseAll();
  }

  currentNote = note;
  s.triggerAttack(note);
  isPlaying = true;
}

/**
 * Stop the drone
 */
export function stopDrone(): void {
  if (synth && isPlaying) {
    synth.releaseAll();
    currentNote = null;
    isPlaying = false;
  }
}

/**
 * Update drone parameters (tonic, octave, volume)
 */
export function updateDrone(): void {
  if (!isPlaying || !synth) return;

  const newNote = getNoteName(appState.state.tonic, appState.state.drone.octave);
  synth.volume.value = appState.state.drone.volume;
  console.log('[DroneAudio] Updating drone', {
    note: newNote,
    volume: synth.volume.value,
  });

  if (newNote !== currentNote) {
    synth.releaseAll();
    synth.triggerAttack(newNote);
    currentNote = newNote;
  }
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
}
