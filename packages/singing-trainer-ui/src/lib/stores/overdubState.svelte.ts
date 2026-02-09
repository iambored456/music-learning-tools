/**
 * Overdub State Store - Svelte 5 Runes
 *
 * Orchestrates the headless overdub engine, PCM capture, monitoring playback,
 * project persistence, and persistent take trail visibility on PitchGrid.
 */

import {
  DEFAULT_ENGINE_CONFIG,
  computePhraseDurationMs,
  createOverdubEngine,
  type OverdubEngineState,
  type OverdubLayer,
  type OverdubPitchTrailPoint,
  type OverdubTake,
  type PhraseSettings,
} from '@mlt/overdub-engine';
import { pitchState } from './pitchState.svelte.js';
import { OverdubPcmRecorder, resampleFloat32 } from '../services/overdubPcmRecorder.js';
import {
  loadLatestOverdubSnapshot,
  saveOverdubSnapshot,
  type PersistedTakeAudio,
} from '../services/overdubPersistence.js';

export interface RenderableTakeTrail {
  layerId: string;
  layerName: string;
  takeId: string;
  color: string;
  points: OverdubPitchTrailPoint[];
}

export interface OverdubUiState {
  engine: OverdubEngineState;
  initialized: boolean;
  isBusy: boolean;
  isCountInActive: boolean;
  isRecordingActive: boolean;
  captureProgressMs: number;
  recordingStartPerfMs: number | null;
  pendingTakeId: string | null;
  warning: string | null;
  hiddenLayerTrailId: string | null;
  forwardCursorModeEnabled: boolean;
}

const machine = createOverdubEngine(DEFAULT_ENGINE_CONFIG);
const recorder = new OverdubPcmRecorder();

const takeAudioById = new Map<string, PersistedTakeAudio>();
let pendingTakeAudio: PersistedTakeAudio | null = null;

const LAYER_COLORS = [
  '#45d0ff',
  '#66f08a',
  '#ffb166',
  '#ff74bb',
  '#fff068',
  '#a58dff',
  '#83f0d2',
  '#ff8a7b',
];

let recordingProgressIntervalId: ReturnType<typeof setInterval> | null = null;
let recordingStartTimeoutId: ReturnType<typeof setTimeout> | null = null;
let recordingTrailFrameId: number | null = null;
let playbackFrameId: number | null = null;
let playbackStopTimeoutId: ReturnType<typeof setTimeout> | null = null;
let activePlaybackNodes: AudioScheduledSourceNode[] = [];
let activePlaybackAuxNodes: AudioNode[] = [];
let playbackContext: AudioContext | null = null;
let recordingAbortRequested = false;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function cloneEngineState(): OverdubEngineState {
  const current = machine.getState();
  if (typeof structuredClone === 'function') {
    return structuredClone(current);
  }
  return JSON.parse(JSON.stringify(current)) as OverdubEngineState;
}

function createStateSnapshot(): OverdubUiState {
  return {
    engine: cloneEngineState(),
    initialized: false,
    isBusy: false,
    isCountInActive: false,
    isRecordingActive: false,
    captureProgressMs: 0,
    recordingStartPerfMs: null,
    pendingTakeId: null,
    warning: null,
    hiddenLayerTrailId: null,
    forwardCursorModeEnabled: false,
  };
}

function createOverdubState() {
  let state = $state<OverdubUiState>(createStateSnapshot());

  let capturedTrailPoints: OverdubPitchTrailPoint[] = [];
  let capturedTrailLastIndex = 0;
  let capturedTrailStartPerfMs = 0;
  let capturedTrailStopPerfMs = 0;

  function syncFromMachine(): void {
    const machineState = cloneEngineState();
    state.engine = machineState;
    state.pendingTakeId = machineState.pendingTake?.id ?? null;
    if (!machineState.error) return;
    state.warning = machineState.error;
  }

  function dispatch(event: Parameters<typeof machine.dispatch>[0]): void {
    machine.dispatch(event);
    syncFromMachine();
  }

  function getBeatDurationMs(phrase: PhraseSettings): number {
    return (60_000 / phrase.tempoBpm) * (4 / phrase.timeSignatureDenominator);
  }

  function getCountInDurationMs(phrase: PhraseSettings): number {
    return Math.round(phrase.countInBeats * getBeatDurationMs(phrase));
  }

  function generateTakeId(): string {
    return `take-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function getLayerColor(layerIndex: number): string {
    return LAYER_COLORS[layerIndex % LAYER_COLORS.length] ?? '#66ccff';
  }

  function getDefaultLayerId(): string | null {
    const layers = state.engine.project.layers;
    if (layers.length === 0) return null;
    return layers[layers.length - 1]?.id ?? null;
  }

  function getLayerById(layerId: string | null): OverdubLayer | null {
    if (!layerId) return null;
    return state.engine.project.layers.find((layer) => layer.id === layerId) ?? null;
  }

  function getActiveTakeIds(): Set<string> {
    const ids = new Set<string>();
    for (const layer of state.engine.project.layers) {
      for (const take of layer.takes) {
        ids.add(take.id);
      }
    }
    return ids;
  }

  function pruneTakeAudioToProject(): void {
    const activeTakeIds = getActiveTakeIds();
    for (const takeId of takeAudioById.keys()) {
      if (!activeTakeIds.has(takeId)) {
        takeAudioById.delete(takeId);
      }
    }
  }

  async function persistCurrentProject(): Promise<void> {
    const snapshotAudio = new Map<string, PersistedTakeAudio>();
    const activeTakeIds = getActiveTakeIds();
    for (const takeId of activeTakeIds) {
      const audio = takeAudioById.get(takeId);
      if (!audio) continue;
      snapshotAudio.set(takeId, audio);
    }
    await saveOverdubSnapshot({
      project: state.engine.project,
      audioByTakeId: snapshotAudio,
    });
  }

  async function ensurePlaybackContext(): Promise<AudioContext> {
    if (!playbackContext) {
      playbackContext = new AudioContext({ latencyHint: 'interactive' });
    }
    if (playbackContext.state !== 'running') {
      await playbackContext.resume();
    }
    return playbackContext;
  }

  function stopPlaybackNodes(): void {
    for (const node of activePlaybackNodes) {
      try {
        node.stop();
      } catch {
        // Node may already be stopped.
      }
      try {
        node.disconnect();
      } catch {
        // Ignore cleanup failures.
      }
    }
    for (const node of activePlaybackAuxNodes) {
      try {
        node.disconnect();
      } catch {
        // Ignore cleanup failures.
      }
    }

    activePlaybackNodes = [];
    activePlaybackAuxNodes = [];
  }

  function stopPlaybackTimers(): void {
    if (playbackFrameId !== null) {
      cancelAnimationFrame(playbackFrameId);
      playbackFrameId = null;
    }
    if (playbackStopTimeoutId !== null) {
      clearTimeout(playbackStopTimeoutId);
      playbackStopTimeoutId = null;
    }
  }

  function stopRecordTimers(): void {
    if (recordingStartTimeoutId !== null) {
      clearTimeout(recordingStartTimeoutId);
      recordingStartTimeoutId = null;
    }
    if (recordingProgressIntervalId !== null) {
      clearInterval(recordingProgressIntervalId);
      recordingProgressIntervalId = null;
    }
  }

  function stopTrailCapture(): void {
    if (recordingTrailFrameId !== null) {
      cancelAnimationFrame(recordingTrailFrameId);
      recordingTrailFrameId = null;
    }
  }

  function startTrailCapture(startPerfMs: number, stopPerfMs: number): void {
    capturedTrailPoints = [];
    capturedTrailStartPerfMs = startPerfMs;
    capturedTrailStopPerfMs = stopPerfMs;
    capturedTrailLastIndex = pitchState.state.history.length;
    stopTrailCapture();

    const loop = () => {
      const history = pitchState.state.history;
      for (let index = capturedTrailLastIndex; index < history.length; index++) {
        const point = history[index];
        if (!point) continue;
        if (point.time < capturedTrailStartPerfMs) continue;
        if (point.time > capturedTrailStopPerfMs) break;

        capturedTrailPoints.push({
          offsetMs: Math.max(0, Math.round(point.time - capturedTrailStartPerfMs)),
          midi: point.midi,
          clarity: point.clarity,
          frequency: point.frequency,
        });
      }
      capturedTrailLastIndex = history.length;

      if (performance.now() <= capturedTrailStopPerfMs + 50) {
        recordingTrailFrameId = requestAnimationFrame(loop);
      } else {
        stopTrailCapture();
      }
    };

    recordingTrailFrameId = requestAnimationFrame(loop);
  }

  function decimateTrail(points: OverdubPitchTrailPoint[], targetFps = 45): OverdubPitchTrailPoint[] {
    if (points.length <= 2) return points;
    const minStepMs = 1000 / targetFps;
    const result: OverdubPitchTrailPoint[] = [];
    let nextMs = 0;

    for (const point of points) {
      if (point.offsetMs < nextMs && result.length > 0) continue;
      result.push(point);
      nextMs = point.offsetMs + minStepMs;
    }
    const last = points[points.length - 1];
    if (last && result[result.length - 1]?.offsetMs !== last.offsetMs) {
      result.push(last);
    }
    return result;
  }

  function createAudioBufferFromTake(
    context: AudioContext,
    audio: PersistedTakeAudio
  ): AudioBuffer {
    const samples = audio.sampleRate === context.sampleRate
      ? audio.samples
      : resampleFloat32(audio.samples, audio.sampleRate, context.sampleRate);
    const buffer = context.createBuffer(1, samples.length, context.sampleRate);
    buffer.getChannelData(0).set(samples);
    return buffer;
  }

  function scheduleMetronome(
    context: AudioContext,
    countInStartSec: number,
    phraseDurationMs: number
  ): void {
    const phrase = state.engine.project.phrase;
    if (!state.engine.project.clickEnabled) return;
    const monitoringMode = state.engine.project.monitoringMode;
    if (monitoringMode === 'none' && !state.isRecordingActive && !state.isCountInActive) {
      return;
    }

    const beatDurationSec = getBeatDurationMs(phrase) / 1000;
    const phraseBeats = phrase.measures * phrase.timeSignatureNumerator * (4 / phrase.timeSignatureDenominator);
    const totalBeats = phrase.countInBeats + phraseBeats;

    for (let beat = 0; beat < totalBeats; beat++) {
      const clickTime = countInStartSec + (beat * beatDurationSec);
      const osc = context.createOscillator();
      const gain = context.createGain();
      const isDownBeat = beat % phrase.timeSignatureNumerator === 0;
      osc.frequency.value = isDownBeat ? 1_350 : 920;

      gain.gain.setValueAtTime(0.0001, clickTime);
      gain.gain.exponentialRampToValueAtTime(0.14, clickTime + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, clickTime + 0.05);

      osc.connect(gain);
      gain.connect(context.destination);
      osc.start(clickTime);
      osc.stop(clickTime + 0.06);

      activePlaybackNodes.push(osc);
      activePlaybackAuxNodes.push(gain);
    }
  }

  function scheduleLayerPlayback(
    context: AudioContext,
    startSec: number,
    phraseDurationMs: number
  ): void {
    const layers = state.engine.project.layers;
    const monitoringMode = state.engine.project.monitoringMode;
    if (monitoringMode === 'none') return;

    const anySolo = layers.some((layer) => layer.solo);
    const phraseDurationSec = phraseDurationMs / 1000;

    for (const layer of layers) {
      if (!layer.activeTakeId) continue;
      if (layer.muted) continue;
      if (anySolo && !layer.solo) continue;

      const take = layer.takes.find((entry) => entry.id === layer.activeTakeId);
      if (!take) continue;
      const audio = takeAudioById.get(take.id);
      if (!audio) continue;

      const source = context.createBufferSource();
      source.buffer = createAudioBufferFromTake(context, audio);

      const gain = context.createGain();
      gain.gain.value = clamp(layer.gain * take.gain, 0, 2);

      const panner = context.createStereoPanner();
      panner.pan.value = clamp(layer.pan + take.pan, -1, 1);

      source.connect(gain);
      gain.connect(panner);
      panner.connect(context.destination);

      const startWithOffset = Math.max(context.currentTime + 0.01, startSec - (take.startOffsetMs / 1000));
      source.start(startWithOffset);
      source.stop(startWithOffset + phraseDurationSec);

      activePlaybackNodes.push(source);
      activePlaybackAuxNodes.push(gain, panner);
    }
  }

  function startPlaybackClock(context: AudioContext, startSec: number, phraseDurationMs: number): void {
    const loop = () => {
      const elapsedMs = Math.max(0, Math.round((context.currentTime - startSec) * 1000));
      dispatch({ type: 'SET_PLAYBACK_TIME', timeMs: Math.min(elapsedMs, phraseDurationMs) });
      if (state.engine.mode === 'playing' && elapsedMs < phraseDurationMs + 20) {
        playbackFrameId = requestAnimationFrame(loop);
      }
    };
    playbackFrameId = requestAnimationFrame(loop);
  }

  async function updateMonitoringWarning(): Promise<void> {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasBluetoothDevice = devices.some((device) => {
        const label = device.label.toLowerCase();
        return label.includes('bluetooth') || label.includes('airpods') || label.includes('buds');
      });
      state.warning = hasBluetoothDevice
        ? 'Bluetooth audio device detected. Expect monitoring delay; wired headphones are recommended.'
        : state.engine.error;
    } catch {
      // Device labels may not be accessible; keep existing warning.
    }
  }

  function clearWarningIfNoError(): void {
    if (state.engine.error) {
      state.warning = state.engine.error;
      return;
    }
    if (state.warning?.includes('Bluetooth')) {
      return;
    }
    state.warning = null;
  }

  async function initialize(): Promise<void> {
    if (state.initialized) return;
    state.isBusy = true;
    try {
      const snapshot = await loadLatestOverdubSnapshot();
      if (snapshot) {
        machine.dispatch({ type: 'NEW_PROJECT', project: snapshot.project });
        takeAudioById.clear();
        for (const [takeId, audio] of snapshot.audioByTakeId) {
          takeAudioById.set(takeId, audio);
        }
      } else {
        machine.reset(DEFAULT_ENGINE_CONFIG);
      }
      syncFromMachine();
      pruneTakeAudioToProject();
      clearWarningIfNoError();
      state.initialized = true;
    } catch (error) {
      state.warning = error instanceof Error ? error.message : 'Failed to initialize overdub project.';
    } finally {
      state.isBusy = false;
    }
  }

  async function createNewProject(): Promise<void> {
    dispatch({ type: 'NEW_PROJECT' });
    takeAudioById.clear();
    pendingTakeAudio = null;
    state.hiddenLayerTrailId = null;
    state.forwardCursorModeEnabled = false;
    clearWarningIfNoError();
    await persistCurrentProject();
  }

  function setPhraseSettings(phrase: Partial<PhraseSettings>): void {
    dispatch({ type: 'SET_PHRASE_SETTINGS', phrase });
    void persistCurrentProject();
  }

  function setMonitoringMode(mode: OverdubEngineState['project']['monitoringMode']): void {
    dispatch({ type: 'SET_MONITORING_MODE', monitoringMode: mode });
    void persistCurrentProject();
  }

  function setClickEnabled(clickEnabled: boolean): void {
    dispatch({ type: 'SET_CLICK_ENABLED', clickEnabled });
    void persistCurrentProject();
  }

  function addLayer(name?: string): void {
    dispatch({ type: 'ADD_LAYER', name });
    void persistCurrentProject();
  }

  function removeLayer(layerId: string): void {
    dispatch({ type: 'REMOVE_LAYER', layerId });
    pruneTakeAudioToProject();
    void persistCurrentProject();
  }

  function armLayer(layerId?: string): void {
    dispatch({ type: 'ARM', layerId });
  }

  function setLayerMuted(layerId: string, muted: boolean): void {
    dispatch({ type: 'SET_LAYER_MUTED', layerId, muted });
    void persistCurrentProject();
  }

  function setLayerSolo(layerId: string, solo: boolean): void {
    dispatch({ type: 'SET_LAYER_SOLO', layerId, solo });
    void persistCurrentProject();
  }

  function setLayerGain(layerId: string, gain: number): void {
    dispatch({ type: 'SET_LAYER_GAIN', layerId, gain });
    void persistCurrentProject();
  }

  function setLayerPan(layerId: string, pan: number): void {
    dispatch({ type: 'SET_LAYER_PAN', layerId, pan });
    void persistCurrentProject();
  }

  function setActiveTake(layerId: string, takeId: string): void {
    dispatch({ type: 'SET_ACTIVE_TAKE', layerId, takeId });
    void persistCurrentProject();
  }

  function setForwardCursorModeEnabled(enabled: boolean): void {
    state.forwardCursorModeEnabled = enabled;
  }

  async function startRecordingCycle(): Promise<void> {
    if (state.isBusy || state.isRecordingActive || state.isCountInActive) return;

    const layerId = state.engine.armedLayerId ?? getDefaultLayerId();
    if (!layerId) {
      state.warning = 'No layer available to record.';
      return;
    }

    const layer = getLayerById(layerId);
    if (!layer) {
      state.warning = 'Armed layer was not found.';
      return;
    }

    state.isBusy = true;
    recordingAbortRequested = false;
    clearWarningIfNoError();
    pendingTakeAudio = null;

    try {
      const assertNotAborted = (): void => {
        if (!recordingAbortRequested) return;
        throw new Error('Capture cancelled');
      };

      dispatch({ type: 'ARM', layerId });
      dispatch({ type: 'START_COUNTIN' });
      state.forwardCursorModeEnabled = true;
      state.isCountInActive = true;
      state.isRecordingActive = false;
      state.captureProgressMs = 0;
      state.hiddenLayerTrailId = layerId;

      const context = await recorder.ensureReady();
      assertNotAborted();
      playbackContext = context;
      const phraseDurationMs = computePhraseDurationMs(state.engine.project.phrase);
      const countInMs = getCountInDurationMs(state.engine.project.phrase);
      const countInSec = countInMs / 1000;
      const recordStartSec = context.currentTime + Math.max(0.08, countInSec);
      const countInStartSec = recordStartSec - countInSec;
      const recordStartPerfMs = performance.now() + (recordStartSec - context.currentTime) * 1000;
      const recordStopPerfMs = recordStartPerfMs + phraseDurationMs;
      state.recordingStartPerfMs = recordStartPerfMs;

      // Monitoring playback + click during count-in and recording.
      scheduleLayerPlayback(context, recordStartSec, phraseDurationMs);
      scheduleMetronome(context, countInStartSec, phraseDurationMs);

      startTrailCapture(recordStartPerfMs, recordStopPerfMs);
      await updateMonitoringWarning();
      assertNotAborted();

      recordingStartTimeoutId = setTimeout(() => {
        if (recordingAbortRequested) return;
        dispatch({ type: 'START_REC' });
        state.isCountInActive = false;
        state.isRecordingActive = true;
      }, Math.max(0, Math.round((recordStartSec - context.currentTime) * 1000)));

      recordingProgressIntervalId = setInterval(() => {
        if (!state.isRecordingActive && !state.isCountInActive) return;
        const now = performance.now();
        if (now < recordStartPerfMs) {
          state.captureProgressMs = 0;
          return;
        }
        state.captureProgressMs = Math.min(
          phraseDurationMs,
          Math.max(0, Math.round(now - recordStartPerfMs))
        );
      }, 50);

      assertNotAborted();
      const capture = await recorder.recordWindow({
        startAtContextTimeSec: recordStartSec,
        durationMs: phraseDurationMs,
      });

      stopRecordTimers();
      stopTrailCapture();
      state.isCountInActive = false;
      state.isRecordingActive = false;
      state.captureProgressMs = phraseDurationMs;
      state.recordingStartPerfMs = null;
      state.forwardCursorModeEnabled = false;

      const takeId = generateTakeId();
      const targetSampleRate = state.engine.project.phrase.sampleRate;
      const normalizedSamples = capture.sampleRate === targetSampleRate
        ? capture.samples
        : resampleFloat32(capture.samples, capture.sampleRate, targetSampleRate);
      const normalizedDurationMs = Math.round((normalizedSamples.length / targetSampleRate) * 1000);

      const decimatedTrail = decimateTrail(capturedTrailPoints);
      const pendingTake: OverdubTake = {
        id: takeId,
        layerId,
        createdAt: new Date().toISOString(),
        durationMs: normalizedDurationMs,
        startOffsetMs: 0,
        sampleRate: targetSampleRate,
        channelCount: 1,
        audioBlobId: takeId,
        gain: 1,
        pan: 0,
        pitchTrail: decimatedTrail,
      };

      pendingTakeAudio = {
        takeId,
        sampleRate: targetSampleRate,
        channelCount: 1,
        durationMs: normalizedDurationMs,
        samples: normalizedSamples,
      };

      dispatch({ type: 'STOP_REC_HARD', take: pendingTake });
      clearWarningIfNoError();
      stopPlaybackNodes();
    } catch (error) {
      stopRecordTimers();
      stopTrailCapture();
      stopPlaybackNodes();
      state.isCountInActive = false;
      state.isRecordingActive = false;
      state.recordingStartPerfMs = null;
      state.forwardCursorModeEnabled = false;
      if (recordingAbortRequested) {
        recordingAbortRequested = false;
        clearWarningIfNoError();
      } else {
        dispatch({
          type: 'SET_ERROR',
          error: error instanceof Error ? error.message : 'Recording failed.',
        });
        state.warning = state.engine.error;
      }
    } finally {
      stopRecordTimers();
      state.recordingStartPerfMs = null;
      state.forwardCursorModeEnabled = false;
      state.isBusy = false;
    }
  }

  async function stopAndRedoCurrentTake(): Promise<void> {
    if (!state.isCountInActive && !state.isRecordingActive) return;
    recordingAbortRequested = true;

    stopRecordTimers();
    stopTrailCapture();
    stopPlaybackNodes();
    recorder.cancelCapture();

    pendingTakeAudio = null;
    state.isCountInActive = false;
    state.isRecordingActive = false;
    state.captureProgressMs = 0;
    state.recordingStartPerfMs = null;
    state.hiddenLayerTrailId = null;
    state.forwardCursorModeEnabled = false;
    dispatch({ type: 'CANCEL_REC' });
    clearWarningIfNoError();
  }

  async function keepPendingTake(): Promise<void> {
    const pendingTake = state.engine.pendingTake;
    if (!pendingTake || !pendingTakeAudio) return;

    state.isBusy = true;
    try {
      takeAudioById.set(pendingTake.id, pendingTakeAudio);
      pendingTakeAudio = null;
      dispatch({ type: 'KEEP_TAKE' });
      state.hiddenLayerTrailId = null;
      pruneTakeAudioToProject();
      await persistCurrentProject();
    } catch (error) {
      state.warning = error instanceof Error ? error.message : 'Failed to keep take.';
    } finally {
      state.isBusy = false;
    }
  }

  function redoPendingTake(): void {
    pendingTakeAudio = null;
    dispatch({ type: 'REDO_TAKE' });
  }

  async function undoLastLayer(): Promise<void> {
    dispatch({ type: 'UNDO_LAYER' });
    pruneTakeAudioToProject();
    await persistCurrentProject();
  }

  async function playComposite(): Promise<void> {
    if (state.engine.mode === 'playing') return;
    const context = await ensurePlaybackContext();
    const phraseDurationMs = computePhraseDurationMs(state.engine.project.phrase);

    stopPlaybackNodes();
    stopPlaybackTimers();

    dispatch({ type: 'START_PLAYBACK' });

    const startSec = context.currentTime + 0.06;
    scheduleLayerPlayback(context, startSec, phraseDurationMs);
    if (state.engine.project.clickEnabled) {
      scheduleMetronome(context, startSec, phraseDurationMs);
    }
    startPlaybackClock(context, startSec, phraseDurationMs);

    playbackStopTimeoutId = setTimeout(() => {
      void stopCompositePlayback();
    }, phraseDurationMs + 200);
  }

  async function stopCompositePlayback(): Promise<void> {
    stopPlaybackTimers();
    stopPlaybackNodes();
    if (state.engine.mode === 'playing' || state.engine.mode === 'exporting') {
      dispatch({ type: 'STOP_PLAYBACK' });
    }
  }

  function getRenderableTrails(): RenderableTakeTrail[] {
    const result: RenderableTakeTrail[] = [];
    const layers = state.engine.project.layers;

    for (let index = 0; index < layers.length; index++) {
      const layer = layers[index];
      if (!layer.activeTakeId) continue;
      if (state.hiddenLayerTrailId && layer.id === state.hiddenLayerTrailId) continue;

      const take = layer.takes.find((entry) => entry.id === layer.activeTakeId);
      if (!take || take.pitchTrail.length === 0) continue;

      result.push({
        layerId: layer.id,
        layerName: layer.name,
        takeId: take.id,
        color: getLayerColor(index),
        points: take.pitchTrail,
      });
    }

    if (state.engine.pendingTake && state.engine.pendingTake.pitchTrail.length > 0) {
      const layerIndex = layers.findIndex((layer) => layer.id === state.engine.pendingTake?.layerId);
      result.push({
        layerId: state.engine.pendingTake.layerId,
        layerName: 'Pending Take',
        takeId: state.engine.pendingTake.id,
        color: getLayerColor(layerIndex >= 0 ? layerIndex : 0),
        points: state.engine.pendingTake.pitchTrail,
      });
    }

    return result;
  }

  async function dispose(): Promise<void> {
    stopPlaybackTimers();
    stopPlaybackNodes();
    stopRecordTimers();
    stopTrailCapture();
    state.recordingStartPerfMs = null;
    await recorder.dispose();
    if (playbackContext) {
      await playbackContext.close();
      playbackContext = null;
    }
  }

  function getCaptureDurationMs(): number {
    return computePhraseDurationMs(state.engine.project.phrase);
  }

  function getCaptureProgressRatio(): number {
    const duration = getCaptureDurationMs();
    if (duration <= 0) return 0;
    return clamp(state.captureProgressMs / duration, 0, 1);
  }

  return {
    get state() {
      return state;
    },

    get project() {
      return state.engine.project;
    },

    get mode() {
      return state.engine.mode;
    },

    get captureDurationMs() {
      return getCaptureDurationMs();
    },

    get captureProgressRatio() {
      return getCaptureProgressRatio();
    },

    initialize,
    createNewProject,
    setPhraseSettings,
    setMonitoringMode,
    setClickEnabled,
    addLayer,
    removeLayer,
    armLayer,
    setLayerMuted,
    setLayerSolo,
    setLayerGain,
    setLayerPan,
    setActiveTake,
    setForwardCursorModeEnabled,
    startRecordingCycle,
    stopAndRedoCurrentTake,
    keepPendingTake,
    redoPendingTake,
    undoLastLayer,
    playComposite,
    stopCompositePlayback,
    getRenderableTrails,
    dispose,
  };
}

export const overdubState = createOverdubState();
