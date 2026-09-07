/**
 * Pitch Detection Service
 *
 * Uses Pitchy.js for real-time pitch detection from microphone input.
 */

import { PitchDetector } from 'pitchy';
import { CENTS_PER_SEMITONE, midiToPitchClass } from '@mlt/pitch-utils';
import { pitchState, secondPitchState, duetState, type DetectedPitch } from '../stores/pitchState.svelte.js';
import { highwayState } from '../stores/highwayState.svelte.js';
import { referenceAudio } from './referenceAudio.js';

const CONFIG = {
  FFT_SIZE: 2048,
  DISPLAY_CLARITY_THRESHOLD: 0.35,
  SCORING_CLARITY_THRESHOLD: 0.8,
  MIN_PITCH_HZ: 60,
  MAX_PITCH_HZ: 1600,
  HIGHLIGHT_CORE_CENTS: 25,
  HIGHLIGHT_CROSSFADE_CENTS: 50,
  HIGHLIGHT_MIN_DATA_POINTS: 16,
  // With MIN=16, RAMP=5 yields a ramp across points 16,17,18,19,20.
  HIGHLIGHT_RAMP_DATA_POINTS: 5,
  MIN_VOLUME_DB: -60,
  DISPLAY_MIN_VOLUME_DB: -80,
  PREFERRED_STREAM_MIN_PEAK: 0.000001,
} as const;

const HIGHLIGHT_DEFAULT_SIZE = 1.0;
const PREFERRED_INPUT_DEVICE_STORAGE_KEY = 'singingTrainer.preferredInputDeviceId';
const RELAXED_MIC_GATES_STORAGE_KEY = 'singingTrainer.relaxedMicGatesEnabled';

export type MicrophoneInput = 1 | 2;
let preferredInputDeviceId: string | null = null;
let secondInputDeviceId: string | null = null;
let relaxedMicGatesEnabled = false;
let detectionGeneration = 0;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function easeOutCubic(value: number): number {
  const t = clamp01(value);
  return 1 - ((1 - t) * (1 - t) * (1 - t));
}

function getHighlightRampMultiplier(consecutivePoints: number): number {
  if (consecutivePoints < CONFIG.HIGHLIGHT_MIN_DATA_POINTS) return 0;
  const rampPoint = consecutivePoints - CONFIG.HIGHLIGHT_MIN_DATA_POINTS + 1;
  const rampProgress = clamp01(rampPoint / CONFIG.HIGHLIGHT_RAMP_DATA_POINTS);
  return easeOutCubic(rampProgress);
}

function loadPreferredInputDeviceId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PREFERRED_INPUT_DEVICE_STORAGE_KEY);
    if (!raw) return null;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

function loadRelaxedMicGatesEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(RELAXED_MIC_GATES_STORAGE_KEY);
    return raw === 'true';
  } catch {
    return false;
  }
}

function persistPreferredInputDeviceId(deviceId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!deviceId) {
      window.localStorage.removeItem(PREFERRED_INPUT_DEVICE_STORAGE_KEY);
    } else {
      window.localStorage.setItem(PREFERRED_INPUT_DEVICE_STORAGE_KEY, deviceId);
    }
  } catch {
    // Ignore persistence failures.
  }
}

function persistRelaxedMicGatesEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RELAXED_MIC_GATES_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // Ignore persistence failures.
  }
}

preferredInputDeviceId = loadPreferredInputDeviceId();
relaxedMicGatesEnabled = loadRelaxedMicGatesEnabled();

export interface AudioInputDeviceInfo {
  deviceId: string;
  label: string;
  groupId: string;
}

function createDetectionAudioContext(): AudioContext {
  const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) {
    throw new Error('Web Audio API is unavailable in this browser.');
  }
  return new Ctx({ latencyHint: 'interactive' });
}

function frequencyToMidi(frequency: number): number {
  return 12 * Math.log2(frequency / 440) + 69;
}

function calculateRms(waveform: Float32Array): number {
  if (waveform.length === 0) return 0;
  let sumSquares = 0;
  for (let i = 0; i < waveform.length; i++) {
    const sample = waveform[i] ?? 0;
    sumSquares += sample * sample;
  }
  return Math.sqrt(sumSquares / waveform.length);
}

function calculateRmsDb(waveform: Float32Array): number {
  const rms = calculateRms(waveform);
  if (!Number.isFinite(rms) || rms <= 0) return CONFIG.MIN_VOLUME_DB;
  return Math.max(CONFIG.MIN_VOLUME_DB, 20 * Math.log10(rms));
}

function calculatePeakAbs(waveform: Float32Array): number {
  let peak = 0;
  for (let i = 0; i < waveform.length; i++) {
    const abs = Math.abs(waveform[i] ?? 0);
    if (abs > peak) {
      peak = abs;
    }
  }
  return peak;
}

function getAnalysisWindowCenterOffsetMs(sampleCount: number, sampleRate: number): number {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) return 0;
  return (sampleCount / sampleRate) * 500;
}

function stopStream(stream: MediaStream): void {
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

async function getPreferredMicStream(input: MicrophoneInput): Promise<MediaStream> {
  const deviceId = getPreferredInputDeviceId(input);
  if (input === 2 && !deviceId) throw new Error('Choose a microphone for Input 2.');
  // An explicit device must never silently fall back to the other singer's mic.
  return navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: { ideal: 1 },
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      sampleRate: { ideal: 48000 },
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
    },
    video: false,
  });
}

export async function listAudioInputDevices(): Promise<AudioInputDeviceInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((device) => device.kind === 'audioinput')
    .map((device) => ({
      deviceId: device.deviceId,
      label: device.label || 'Unnamed input device',
      groupId: device.groupId || '',
    }));
}

export function getPreferredInputDeviceId(input: MicrophoneInput = 1): string | null {
  return input === 1 ? preferredInputDeviceId : secondInputDeviceId;
}

export function getRelaxedMicGatesEnabled(): boolean {
  return relaxedMicGatesEnabled;
}

export function setPreferredInputDeviceId(deviceId: string | null, input: MicrophoneInput = 1): void {
  if (input === 2) {
    secondInputDeviceId = deviceId?.trim() || null;
    return;
  }
  preferredInputDeviceId = deviceId && deviceId.trim().length > 0 ? deviceId : null;
  persistPreferredInputDeviceId(preferredInputDeviceId);
}

export function setRelaxedMicGatesEnabled(enabled: boolean): void {
  relaxedMicGatesEnabled = Boolean(enabled);
  persistRelaxedMicGatesEnabled(relaxedMicGatesEnabled);
}

const primaryPitchState = pitchState;

function createInputCapture(input: MicrophoneInput, pitchState: typeof primaryPitchState) {
  // Each microphone owns its stream, analyser, detector, and cleanup lifecycle.
  let detectionContext: AudioContext | null = null;
  let mediaStream: MediaStream | null = null;
  let sourceNode: MediaStreamAudioSourceNode | null = null;
  let analyserNode: AnalyserNode | null = null;
  let pullGainNode: GainNode | null = null;
  let waveformBuffer: Float32Array | null = null;
  let detector: ReturnType<typeof PitchDetector.forFloat32Array> | null = null;
  let animationFrameId: number | null = null;
  let isRunning = false;
  let startInFlight: Promise<void> | null = null;

  let activeTrack: MediaStreamTrack | null = null;
  let trackMuteListener: (() => void) | null = null;
  let trackUnmuteListener: (() => void) | null = null;
  let trackEndedListener: (() => void) | null = null;

  let highlightConsecutiveDataPoints = 0;

  let captureGeneration = 0;

  function attachTrackListeners(track: MediaStreamTrack | null): void {
    activeTrack = track;
    if (!activeTrack) return;

    trackMuteListener = () => {
      console.warn('[PitchDetection] input track muted');
    };
    trackUnmuteListener = () => {
      // no-op
    };
    trackEndedListener = () => {
      stopDetection();
      pitchState.setError(`Input ${input} disconnected. Reconnect it and select the microphone again.`);
    };

    activeTrack.addEventListener('mute', trackMuteListener);
    activeTrack.addEventListener('unmute', trackUnmuteListener);
    activeTrack.addEventListener('ended', trackEndedListener);
  }

  function detachTrackListeners(): void {
    if (!activeTrack) return;

    if (trackMuteListener) {
      activeTrack.removeEventListener('mute', trackMuteListener);
      trackMuteListener = null;
    }

    if (trackUnmuteListener) {
      activeTrack.removeEventListener('unmute', trackUnmuteListener);
      trackUnmuteListener = null;
    }

    if (trackEndedListener) {
      activeTrack.removeEventListener('ended', trackEndedListener);
      trackEndedListener = null;
    }

    activeTrack = null;
  }

  function animationLoop(): void {
    if (!isRunning || !analyserNode || !detector || !waveformBuffer) {
      animationFrameId = null;
      return;
    }

    analyserNode.getFloatTimeDomainData(waveformBuffer as Float32Array<ArrayBuffer>);

    const amplitudeDb = calculateRmsDb(waveformBuffer);
    const peakAbs = calculatePeakAbs(waveformBuffer);
    pitchState.setInputLevelDb(amplitudeDb);
    const sampleRate = detectionContext?.sampleRate ?? 48000;
    const timestampCorrectionMs = getAnalysisWindowCenterOffsetMs(waveformBuffer.length, sampleRate);
    const sampleTime = performance.now() - timestampCorrectionMs;
    const [pitch, clarity] = detector.findPitch(waveformBuffer, sampleRate);
    const effectiveClarity = relaxedMicGatesEnabled ? 1 : clarity;

    const isPitchInRange =
      pitch !== null &&
      pitch > CONFIG.MIN_PITCH_HZ &&
      pitch < CONFIG.MAX_PITCH_HZ;

    const hasDisplayPitch =
      isPitchInRange &&
      (
        relaxedMicGatesEnabled ||
        (clarity > CONFIG.DISPLAY_CLARITY_THRESHOLD && amplitudeDb > CONFIG.DISPLAY_MIN_VOLUME_DB)
      );

    const hasScoringPitch =
      hasDisplayPitch &&
      effectiveClarity > CONFIG.SCORING_CLARITY_THRESHOLD &&
      !referenceAudio.isPlaying;

    if (hasDisplayPitch) {
      const midi = frequencyToMidi(pitch);
      const detectedPitch: DetectedPitch = {
        frequency: pitch,
        midi,
        clarity: effectiveClarity,
        pitchClass: Math.round(midi) % 12,
      };

      pitchState.setCurrentPitch(detectedPitch);
      pitchState.addHistoryPoint({
        frequency: pitch,
        midi,
        time: sampleTime,
        clarity: effectiveClarity,
      });

      if (hasScoringPitch && input === 1) {
        highwayState.recordPitchInput(
          midi,
          effectiveClarity,
          relaxedMicGatesEnabled ? undefined : amplitudeDb,
          -timestampCorrectionMs,
        );
      }
    } else {
      pitchState.setCurrentPitch(null);
      pitchState.addHistoryPoint({
        frequency: 0,
        midi: 0,
        time: sampleTime,
        clarity: 0,
      });
    }

    if (hasDisplayPitch && pitchState.state.currentPitch) {
      highlightConsecutiveDataPoints += 1;
      const highlightRampMultiplier = getHighlightRampMultiplier(highlightConsecutiveDataPoints);
      if (highlightRampMultiplier <= 0) {
        pitchState.setStablePitch({ highlights: [], size: HIGHLIGHT_DEFAULT_SIZE });
      } else {
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
            opacity: lowerOpacity * highlightRampMultiplier,
          });
        }

        if (upperOpacity > 0) {
          highlights.push({
            pitchClass: midiToPitchClass(upperMidi),
            midi: upperMidi,
            opacity: upperOpacity * highlightRampMultiplier,
          });
        }

        pitchState.setStablePitch({ highlights, size: HIGHLIGHT_DEFAULT_SIZE });
      }
    } else {
      highlightConsecutiveDataPoints = 0;
      pitchState.setStablePitch({ highlights: [], size: HIGHLIGHT_DEFAULT_SIZE });
    }

    // If the stream stays fully silent, clear current pitch state.
    if (peakAbs <= CONFIG.PREFERRED_STREAM_MIN_PEAK) {
      pitchState.setCurrentPitch(null);
    }

    animationFrameId = requestAnimationFrame(animationLoop);
  }

  async function startDetectionInternal(generation: number): Promise<void> {
    if (isRunning) {
      return;
    }

    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    const context = createDetectionAudioContext();
    detectionContext = context;
    if (context.state !== 'running') await context.resume();
    if (generation !== captureGeneration) throw new DOMException('Capture cancelled', 'AbortError');

    const stream = await getPreferredMicStream(input);
    if (generation !== captureGeneration) {
      stopStream(stream);
      throw new DOMException('Capture cancelled', 'AbortError');
    }
    mediaStream = stream;
    const track = stream.getAudioTracks()[0];
    if (!track) throw new Error(`Input ${input} has no audio track.`);
    const settings = track.getSettings();
    const other = input === 1 ? secondPitchState : primaryPitchState;
    if ((settings.deviceId && settings.deviceId === other.state.activeDeviceId)
      || (settings.groupId && settings.groupId === other.state.activeGroupId)) {
      throw new Error('Choose a different microphone for each input.');
    }
    pitchState.setActiveDevice(settings.deviceId ?? null, settings.groupId ?? null);
    attachTrackListeners(track);

    sourceNode = detectionContext.createMediaStreamSource(mediaStream);
    analyserNode = detectionContext.createAnalyser();
    analyserNode.fftSize = CONFIG.FFT_SIZE;
    analyserNode.smoothingTimeConstant = 0.05;
    pullGainNode = detectionContext.createGain();
    pullGainNode.gain.value = 0.00001;

    sourceNode.connect(analyserNode);
    analyserNode.connect(pullGainNode);
    pullGainNode.connect(detectionContext.destination);

    waveformBuffer = new Float32Array(analyserNode.fftSize) as Float32Array<ArrayBuffer>;
    detector = PitchDetector.forFloat32Array(analyserNode.fftSize);

    isRunning = true;
    animationLoop();
  }

  async function startDetection(): Promise<void> {
    if (isRunning) return;
    if (startInFlight) return startInFlight;
    const generation = captureGeneration;
    pitchState.setError(null);
    pitchState.clearHistory();
    const pending = startDetectionInternal(generation).catch((err: unknown) => {
      if (generation === captureGeneration) {
        cleanup();
        pitchState.setError(err instanceof Error ? err.message : `Could not open Input ${input}.`);
      }
      throw err;
    });
    startInFlight = pending;
    try {
      await pending;
    } finally {
      if (startInFlight === pending) startInFlight = null;
    }
  }

  function stopDetection(): void {
    captureGeneration += 1;
    startInFlight = null;
    cleanup();
  }

  function cleanup(): void {
    isRunning = false;
    pitchState.setActiveDevice(null);
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    detachTrackListeners();

    if (sourceNode) {
      try {
        sourceNode.disconnect();
      } catch {
        // Ignore disconnect cleanup errors.
      }
      sourceNode = null;
    }

    if (analyserNode) {
      try {
        analyserNode.disconnect();
      } catch {
        // Ignore disconnect cleanup errors.
      }
      analyserNode = null;
    }

    if (pullGainNode) {
      try {
        pullGainNode.disconnect();
      } catch {
        // Ignore disconnect cleanup errors.
      }
      pullGainNode = null;
    }

    waveformBuffer = null;
    detector = null;

    if (mediaStream) {
      stopStream(mediaStream);
      mediaStream = null;
    }

    if (detectionContext) {
      const contextToClose = detectionContext;
      detectionContext = null;
      void contextToClose.close().catch(() => {
        // Ignore close cleanup errors.
      });
    }

    pitchState.setStablePitch({ highlights: [], size: HIGHLIGHT_DEFAULT_SIZE });
    pitchState.setCurrentPitch(null);
    pitchState.setInputLevelDb(null);
    highlightConsecutiveDataPoints = 0;
  }

  function isDetecting(): boolean {
    return isRunning;
  }

  return { startDetection, stopDetection, isDetecting };
}

const inputs = {
  1: createInputCapture(1, pitchState),
  2: createInputCapture(2, secondPitchState),
};

export async function startDetection(): Promise<void> {
  const generation = detectionGeneration;
  await inputs[1].startDetection();
  if (generation !== detectionGeneration) throw new DOMException('Capture cancelled', 'AbortError');
  if (duetState.enabled && secondInputDeviceId) {
    // A missing second mic must leave the first microphone usable.
    await inputs[2].startDetection().catch(() => {});
  }
  if (generation !== detectionGeneration) throw new DOMException('Capture cancelled', 'AbortError');
}

export function stopDetection(): void {
  detectionGeneration += 1;
  inputs[1].stopDetection();
  inputs[2].stopDetection();
  secondPitchState.clearHistory();
}

export async function restartInputDetection(input: MicrophoneInput): Promise<void> {
  inputs[input].stopDetection();
  (input === 1 ? pitchState : secondPitchState).clearHistory();
  if (input === 2 && (!duetState.enabled || !secondInputDeviceId)) return;
  await inputs[input].startDetection();
}

export function setDuetEnabled(enabled: boolean): void {
  duetState.enabled = enabled;
  if (!enabled) {
    inputs[2].stopDetection();
    secondInputDeviceId = null;
    secondPitchState.reset();
  }
}

export function isDetecting(): boolean {
  return inputs[1].isDetecting() || inputs[2].isDetecting();
}

/** Pitch sample for calibration */
export interface CalibrationPitchSample {
  midi: number;
  frequency: number;
  clarity: number;
  timestamp: number;
}

export async function collectPitchSamples(
  durationMs: number,
  onProgress?: (
    elapsedMs: number,
    currentPitch: CalibrationPitchSample | null,
    inputLevelDb: number,
  ) => void,
  signal?: AbortSignal,
): Promise<CalibrationPitchSample[]> {
  const samples: CalibrationPitchSample[] = [];

  const calibrationContext = createDetectionAudioContext();
  if (calibrationContext.state !== 'running') {
    await calibrationContext.resume();
  }

  const calibrationStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  const calibrationSource = calibrationContext.createMediaStreamSource(calibrationStream);
  const calibrationAnalyser = calibrationContext.createAnalyser();
  calibrationAnalyser.fftSize = CONFIG.FFT_SIZE;
  calibrationAnalyser.smoothingTimeConstant = 0.05;
  const calibrationPullGain = calibrationContext.createGain();
  calibrationPullGain.gain.value = 0.00001;

  calibrationSource.connect(calibrationAnalyser);
  calibrationAnalyser.connect(calibrationPullGain);
  calibrationPullGain.connect(calibrationContext.destination);

  const calibrationWaveform = new Float32Array(calibrationAnalyser.fftSize) as Float32Array<ArrayBuffer>;
  const calibrationDetector = PitchDetector.forFloat32Array(calibrationAnalyser.fftSize);

  const startTime = performance.now();

  return new Promise((resolve) => {
    let frameId: number | null = null;
    let finished = false;

    function finish(): void {
      if (finished) return;
      finished = true;
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
      signal?.removeEventListener('abort', finish);

      try {
        calibrationSource.disconnect();
        calibrationAnalyser.disconnect();
        calibrationPullGain.disconnect();
      } catch {
        // Ignore disconnect cleanup errors.
      }

      stopStream(calibrationStream);
      void calibrationContext.close().catch(() => {
        // Ignore close cleanup errors.
      });

      resolve(samples);
    }

    signal?.addEventListener('abort', finish, { once: true });
    if (signal?.aborted) {
      finish();
      return;
    }

    function collectFrame(): void {
      if (finished) return;
      const elapsed = performance.now() - startTime;

      if (elapsed >= durationMs) {
        finish();
        return;
      }

      calibrationAnalyser.getFloatTimeDomainData(calibrationWaveform as Float32Array<ArrayBuffer>);
      const inputLevelDb = calculateRmsDb(calibrationWaveform);
      const sampleTime = performance.now() - getAnalysisWindowCenterOffsetMs(
        calibrationWaveform.length,
        calibrationContext.sampleRate,
      );
      const [pitch, clarity] = calibrationDetector.findPitch(
        calibrationWaveform,
        calibrationContext.sampleRate
      );
      const effectiveClarity = relaxedMicGatesEnabled ? 1 : clarity;

      const isValidPitch =
        pitch !== null &&
        effectiveClarity > CONFIG.SCORING_CLARITY_THRESHOLD &&
        pitch > CONFIG.MIN_PITCH_HZ &&
        pitch < CONFIG.MAX_PITCH_HZ;

      let currentSample: CalibrationPitchSample | null = null;

      if (isValidPitch) {
        const midi = frequencyToMidi(pitch);
        currentSample = {
          midi,
          frequency: pitch,
          clarity: effectiveClarity,
          timestamp: sampleTime,
        };
        samples.push(currentSample);
      }

      onProgress?.(elapsed, currentSample, inputLevelDb);
      if (!finished) {
        frameId = requestAnimationFrame(collectFrame);
      }
    }

    frameId = requestAnimationFrame(collectFrame);
  });
}
