/**
 * Pitch Detection Service
 *
 * Uses Pitchy.js for real-time pitch detection from microphone input.
 * Ported from the original JavaScript implementation.
 */

import * as Tone from 'tone';
import { PitchDetector } from 'pitchy';
import { pitchState, type DetectedPitch } from '../stores/pitchState.svelte.js';

// Configuration
const CONFIG = {
  FFT_SIZE: 2048,
  CLARITY_THRESHOLD: 0.8,
  MIN_PITCH_HZ: 60,
  MAX_PITCH_HZ: 1600,
  STABILITY_THRESHOLD: 15,
  HIGHLIGHT_FADE_SPEED: 0.2,
  MIN_VOLUME_DB: -60,
} as const;

// Module state
let mic: Tone.UserMedia | null = null;
let analyser: Tone.Analyser | null = null;
let detector: ReturnType<typeof PitchDetector.forFloat32Array> | null = null;
let animationFrameId: number | null = null;
let isRunning = false;

// Stability tracking
let stablePitchClass = -1;
let stablePitchCounter = 0;
let targetOpacity = 0;
let targetSize = 1.0;

/**
 * Convert frequency in Hz to MIDI note number
 */
function frequencyToMidi(frequency: number): number {
  return 12 * Math.log2(frequency / 440) + 69;
}

/**
 * The main detection and animation loop
 */
function animationLoop(): void {
  if (!isRunning || !analyser || !detector) {
    animationFrameId = null;
    return;
  }

  // Get pitch from audio
  const waveform = analyser.getValue() as Float32Array;
  const [pitch, clarity] = detector.findPitch(waveform, Tone.getContext().sampleRate);

  const isValidPitch =
    pitch !== null &&
    clarity > CONFIG.CLARITY_THRESHOLD &&
    pitch > CONFIG.MIN_PITCH_HZ &&
    pitch < CONFIG.MAX_PITCH_HZ;

  // Update pitch state
  if (isValidPitch) {
    const midi = frequencyToMidi(pitch);
    const detectedPitch: DetectedPitch = {
      frequency: pitch,
      midi,
      clarity,
      pitchClass: Math.round(midi) % 12,
    };
    pitchState.setCurrentPitch(detectedPitch);
    pitchState.addHistoryPoint({
      frequency: pitch,
      midi,
      time: performance.now(),
      clarity,
    });
  } else {
    pitchState.addHistoryPoint({
      frequency: 0,
      midi: 0,
      time: performance.now(),
      clarity: 0,
    });
  }

  // Stability highlighting logic
  const currentPitchClass = isValidPitch && pitchState.state.currentPitch
    ? Math.round(pitchState.state.currentPitch.midi) % 12
    : -1;

  if (currentPitchClass === stablePitchClass && currentPitchClass !== -1) {
    stablePitchCounter++;
  } else {
    stablePitchCounter = 0;
    stablePitchClass = currentPitchClass;
  }

  targetOpacity = stablePitchCounter >= CONFIG.STABILITY_THRESHOLD ? 1 : 0;
  targetSize = stablePitchCounter >= CONFIG.STABILITY_THRESHOLD ? 1.05 : 1.0;

  const currentStable = pitchState.state.stablePitch;
  const newOpacity =
    currentStable.opacity + (targetOpacity - currentStable.opacity) * CONFIG.HIGHLIGHT_FADE_SPEED;
  const newSize =
    currentStable.size + (targetSize - currentStable.size) * CONFIG.HIGHLIGHT_FADE_SPEED;

  pitchState.setStablePitch({
    pitchClass: stablePitchClass >= 0 ? stablePitchClass : null,
    opacity: newOpacity,
    size: newSize,
  });

  // Request next frame
  animationFrameId = requestAnimationFrame(animationLoop);
}

/**
 * Start pitch detection from microphone
 */
export async function startDetection(): Promise<void> {
  if (isRunning) return;

  // Cancel any existing animation frame
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }

  // Create audio nodes
  mic = new Tone.UserMedia();
  analyser = new Tone.Analyser('waveform', CONFIG.FFT_SIZE);
  detector = PitchDetector.forFloat32Array(analyser.size);

  try {
    await Tone.start(); // Initialize audio context
    await mic.open();
    mic.connect(analyser);
    isRunning = true;
    animationLoop();
  } catch (err) {
    console.error('Microphone access denied or failed:', err);
    cleanup();
    throw err;
  }
}

/**
 * Stop pitch detection
 */
export function stopDetection(): void {
  isRunning = false;
  cleanup();
}

/**
 * Clean up audio resources
 */
function cleanup(): void {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  if (mic) {
    mic.close();
    mic = null;
  }

  analyser = null;
  detector = null;

  // Reset stability tracking
  stablePitchCounter = 0;
  stablePitchClass = -1;

  pitchState.setStablePitch({ pitchClass: null, opacity: 0, size: 1.0 });
  pitchState.setCurrentPitch(null);
}

/**
 * Check if detection is currently running
 */
export function isDetecting(): boolean {
  return isRunning;
}
