/**
 * Pitch Detection Service
 *
 * Uses Pitchy.js for real-time pitch detection from microphone input.
 * Ported from the original JavaScript implementation.
 */

import * as Tone from 'tone';
import { PitchDetector } from 'pitchy';
import { CENTS_PER_SEMITONE, midiToPitchClass } from '@mlt/pitch-utils';
import { pitchState, type DetectedPitch } from '../stores/pitchState.svelte.js';
import { highwayState } from '../stores/highwayState.svelte.js';
import { referenceAudio } from './referenceAudio.js';

// Configuration
const CONFIG = {
  FFT_SIZE: 2048,
  CLARITY_THRESHOLD: 0.8,
  MIN_PITCH_HZ: 60,
  MAX_PITCH_HZ: 1600,
  HIGHLIGHT_CORE_CENTS: 25,
  HIGHLIGHT_CROSSFADE_CENTS: 50,
  MIN_VOLUME_DB: -60,
} as const;

// Module state
let mic: Tone.UserMedia | null = null;
let analyser: Tone.Analyser | null = null;
let detector: ReturnType<typeof PitchDetector.forFloat32Array> | null = null;
let animationFrameId: number | null = null;
let isRunning = false;

const HIGHLIGHT_DEFAULT_SIZE = 1.0;

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

  // Skip pitch detection while reference tone is playing (avoid mic picking up speakers)
  if (referenceAudio.isPlaying) {
    // Still add a silent history point to keep the trail continuous
    pitchState.addHistoryPoint({
      frequency: 0,
      midi: 0,
      time: performance.now(),
      clarity: 0,
    });
    animationFrameId = requestAnimationFrame(animationLoop);
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

    // Record pitch input for highway performance tracking
    highwayState.recordPitchInput(midi, clarity);
  } else {
    pitchState.addHistoryPoint({
      frequency: 0,
      midi: 0,
      time: performance.now(),
      clarity: 0,
    });
  }

  // Highlight opacity distributed between the nearest adjacent pitch centers
  if (isValidPitch && pitchState.state.currentPitch) {
    const midi = pitchState.state.currentPitch.midi;
    const lowerMidi = Math.floor(midi);
    const upperMidi = lowerMidi + 1;
    const centsFromLower = (midi - lowerMidi) * CENTS_PER_SEMITONE;
    const crossfadeStart = CONFIG.HIGHLIGHT_CORE_CENTS;
    const crossfadeEnd = CENTS_PER_SEMITONE - CONFIG.HIGHLIGHT_CORE_CENTS;

    let lowerOpacity = 0;
    let upperOpacity = 0;

    if (centsFromLower <= crossfadeStart) {
      lowerOpacity = 1;
    } else if (centsFromLower >= crossfadeEnd) {
      upperOpacity = 1;
    } else {
      const t = (centsFromLower - crossfadeStart) / CONFIG.HIGHLIGHT_CROSSFADE_CENTS;
      lowerOpacity = 1 - t;
      upperOpacity = t;
    }

    const highlights = [];
    if (lowerOpacity > 0) {
      highlights.push({
        pitchClass: midiToPitchClass(lowerMidi),
        midi: lowerMidi,
        opacity: lowerOpacity,
      });
    }

    if (upperOpacity > 0) {
      highlights.push({
        pitchClass: midiToPitchClass(upperMidi),
        midi: upperMidi,
        opacity: upperOpacity,
      });
    }

    pitchState.setStablePitch({
      highlights,
      size: HIGHLIGHT_DEFAULT_SIZE,
    });
  } else {
    pitchState.setStablePitch({ highlights: [], size: HIGHLIGHT_DEFAULT_SIZE });
  }

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

  pitchState.setStablePitch({ highlights: [], size: HIGHLIGHT_DEFAULT_SIZE });
  pitchState.setCurrentPitch(null);
}

/**
 * Check if detection is currently running
 */
export function isDetecting(): boolean {
  return isRunning;
}

/** Pitch sample for calibration */
export interface CalibrationPitchSample {
  midi: number;
  frequency: number;
  clarity: number;
  timestamp: number;
}

/**
 * Collect pitch samples for a specified duration.
 * Used for speaking pitch calibration.
 *
 * @param durationMs - How long to collect samples
 * @param onProgress - Optional callback with elapsed time
 * @returns Array of collected pitch samples
 */
export async function collectPitchSamples(
  durationMs: number,
  onProgress?: (elapsedMs: number, currentPitch: CalibrationPitchSample | null) => void
): Promise<CalibrationPitchSample[]> {
  const samples: CalibrationPitchSample[] = [];

  // Set up dedicated mic and analyser for calibration
  const calibrationMic = new Tone.UserMedia();
  const calibrationAnalyser = new Tone.Analyser('waveform', CONFIG.FFT_SIZE);
  const calibrationDetector = PitchDetector.forFloat32Array(calibrationAnalyser.size);

  try {
    await Tone.start();
    await calibrationMic.open();
    calibrationMic.connect(calibrationAnalyser);
  } catch (err) {
    console.error('[collectPitchSamples] Microphone access failed:', err);
    throw err;
  }

  const startTime = performance.now();

  return new Promise((resolve) => {
    let frameId: number | null = null;

    function collectFrame(): void {
      const elapsed = performance.now() - startTime;

      if (elapsed >= durationMs) {
        // Done collecting
        if (frameId !== null) {
          cancelAnimationFrame(frameId);
        }
        calibrationMic.close();
        resolve(samples);
        return;
      }

      // Get pitch from audio
      const waveform = calibrationAnalyser.getValue() as Float32Array;
      const [pitch, clarity] = calibrationDetector.findPitch(
        waveform,
        Tone.getContext().sampleRate
      );

      const isValidPitch =
        pitch !== null &&
        clarity > CONFIG.CLARITY_THRESHOLD &&
        pitch > CONFIG.MIN_PITCH_HZ &&
        pitch < CONFIG.MAX_PITCH_HZ;

      let currentSample: CalibrationPitchSample | null = null;

      if (isValidPitch) {
        const midi = frequencyToMidi(pitch);
        currentSample = {
          midi,
          frequency: pitch,
          clarity,
          timestamp: performance.now(),
        };
        samples.push(currentSample);
      }

      // Report progress
      onProgress?.(elapsed, currentSample);

      // Continue collecting
      frameId = requestAnimationFrame(collectFrame);
    }

    // Start collection
    frameId = requestAnimationFrame(collectFrame);
  });
}
