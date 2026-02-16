/**
 * Overdub State Store - Svelte 5 Runes
 *
 * Orchestrates the headless overdub engine, PCM capture, monitoring playback,
 * project persistence, and persistent take trail visibility on PitchGrid.
 */

import {
  DEFAULT_ENGINE_CONFIG,
  computePhraseDurationMs,
  createLayer,
  createOverdubEngine,
  type OverdubEngineState,
  type OverdubLayer,
  type OverdubPitchTrailPoint,
  type OverdubProject,
  type OverdubTake,
  type PhraseSettings,
} from '@mlt/overdub-engine';
import type { OverdubExerciseTemplate } from '@mlt/lesson-templates';
import { pitchState } from './pitchState.svelte.js';
import { OverdubPcmRecorder, resampleFloat32 } from '../services/overdubPcmRecorder.js';
import {
  loadOverdubSnapshot,
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
  isPendingTakePreviewActive: boolean;
  captureProgressMs: number;
  recordingStartPerfMs: number | null;
  pendingTakeId: string | null;
  warning: string | null;
  hiddenLayerTrailId: string | null;
  renderableTrailsVisible: boolean;
  forwardCursorModeEnabled: boolean;
}

interface RecordingScheduleInfo {
  startDelayMs: number;
  startAtPerfMs: number;
  phraseDurationMs: number;
  countInMs: number;
}

interface TimelineAlignedTrailCacheEntry {
  sourceRef: OverdubPitchTrailPoint[];
  sourceLength: number;
  sourceLastOffsetMs: number;
  sourceLastMidi: number;
  startOffsetMs: number;
  aligned: OverdubPitchTrailPoint[];
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
const DEFAULT_LAYER_GAIN = 1.1;
const RECORD_CAPTURE_LEAD_IN_MS = 500;
const RECORD_CAPTURE_LEAD_OUT_MS = 500;
const RECORD_CAPTURE_MIN_START_DELAY_SEC = 0.08;
const MAX_TAKE_START_OFFSET_MS = 4_000;
const TAKE_PITCH_TRAIL_TARGET_FPS = 90;

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

function clampFinite(value: number | null | undefined, fallback: number, min: number, max: number): number {
  const safeValue = Number.isFinite(value) ? (value as number) : fallback;
  return clamp(safeValue, min, max);
}

function getTakeStartOffsetMs(take: Pick<OverdubTake, 'startOffsetMs'>): number {
  return Math.round(clampFinite(take.startOffsetMs, 0, 0, MAX_TAKE_START_OFFSET_MS));
}

function getTakeTailAfterPhraseMs(
  take: Pick<OverdubTake, 'startOffsetMs'>,
  audio: PersistedTakeAudio,
  phraseDurationMs: number,
): number {
  const startOffsetMs = getTakeStartOffsetMs(take);
  const relativeEndMs = Math.max(0, Math.round(audio.durationMs) - startOffsetMs);
  return Math.max(0, relativeEndMs - Math.max(0, Math.round(phraseDurationMs)));
}

function estimateAudioPeak(samples: Float32Array): number {
  if (!samples || samples.length === 0) return 0;
  const targetSamples = 4096;
  const step = Math.max(1, Math.floor(samples.length / targetSamples));
  let peak = 0;
  for (let i = 0; i < samples.length; i += step) {
    const value = Math.abs(samples[i] ?? 0);
    if (value > peak) {
      peak = value;
    }
  }
  return peak;
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
    isPendingTakePreviewActive: false,
    captureProgressMs: 0,
    recordingStartPerfMs: null,
    pendingTakeId: null,
    warning: null,
    hiddenLayerTrailId: null,
    renderableTrailsVisible: true,
    forwardCursorModeEnabled: false,
  };
}

function createOverdubState() {
  let state = $state<OverdubUiState>(createStateSnapshot());

  let capturedTrailPoints: OverdubPitchTrailPoint[] = [];
  let capturedTrailLastIndex = 0;
  let capturedTrailStartPerfMs = 0;
  let capturedTrailStopPerfMs = 0;
  const timelineAlignedTrailCache = new Map<string, TimelineAlignedTrailCacheEntry>();

  function pruneTimelineAlignedTrailCache(machineState: OverdubEngineState): void {
    if (timelineAlignedTrailCache.size === 0) return;
    const activeTakeIds = getProjectTakeIdSet(machineState.project);
    const pendingTakeId = machineState.pendingTake?.id;
    if (pendingTakeId) {
      activeTakeIds.add(pendingTakeId);
    }

    for (const takeId of timelineAlignedTrailCache.keys()) {
      if (!activeTakeIds.has(takeId)) {
        timelineAlignedTrailCache.delete(takeId);
      }
    }
  }

  function syncFromMachine(): void {
    const machineState = cloneEngineState();
    state.engine = machineState;
    state.pendingTakeId = machineState.pendingTake?.id ?? null;
    pruneTimelineAlignedTrailCache(machineState);
    if (!machineState.error) return;
    state.warning = machineState.error;
  }

  function dispatch(event: Parameters<typeof machine.dispatch>[0]): void {
    const machineState = machine.dispatch(event);
    if (event.type === 'SET_PLAYBACK_TIME') {
      // Hot path: avoid deep cloning the full engine tree on every frame.
      state.engine.playbackTimeMs = machineState.playbackTimeMs;
      state.engine.lastEventAt = machineState.lastEventAt;
      state.engine.error = machineState.error;
      return;
    }
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

  function getMaxActiveTakeStartOffsetMs(): number {
    let maxStartOffsetMs = 0;
    for (const layer of state.engine.project.layers) {
      if (!layer.activeTakeId) continue;
      const take = layer.takes.find((entry) => entry.id === layer.activeTakeId);
      if (!take) continue;
      const audio = takeAudioById.get(take.id);
      if (!audio) continue;
      const startOffsetMs = getTakeStartOffsetMs(take);
      if (startOffsetMs > maxStartOffsetMs) {
        maxStartOffsetMs = startOffsetMs;
      }
    }
    return maxStartOffsetMs;
  }

  function getMaxActiveTakeTailAfterPhraseMs(phraseDurationMs: number): number {
    let maxTailMs = 0;
    for (const layer of state.engine.project.layers) {
      if (!layer.activeTakeId) continue;
      const take = layer.takes.find((entry) => entry.id === layer.activeTakeId);
      if (!take) continue;
      const audio = takeAudioById.get(take.id);
      if (!audio) continue;
      const tailMs = getTakeTailAfterPhraseMs(take, audio, phraseDurationMs);
      if (tailMs > maxTailMs) {
        maxTailMs = tailMs;
      }
    }
    return maxTailMs;
  }

  function getProjectTakeIds(project = state.engine.project): string[] {
    const ids: string[] = [];
    for (const layer of project.layers) {
      for (const take of layer.takes) {
        ids.push(take.id);
      }
    }
    return ids;
  }

  function getProjectTakeIdSet(project = state.engine.project): Set<string> {
    return new Set(getProjectTakeIds(project));
  }

  function stripTakesMissingAudio(
    project: OverdubProject,
    audioByTakeId: Map<string, PersistedTakeAudio>
  ): { project: OverdubProject; removedTakeIds: string[] } {
    let nextProject: OverdubProject;
    try {
      if (typeof structuredClone === 'function') {
        nextProject = structuredClone(project);
      } else {
        nextProject = JSON.parse(JSON.stringify(project)) as OverdubProject;
      }
    } catch {
      nextProject = JSON.parse(JSON.stringify(project)) as OverdubProject;
    }

    const removedTakeIds: string[] = [];

    for (const layer of nextProject.layers) {
      const kept: OverdubTake[] = [];
      for (const take of layer.takes) {
        if (audioByTakeId.has(take.id)) {
          kept.push(take);
        } else {
          removedTakeIds.push(take.id);
        }
      }
      layer.takes = kept;
      if (layer.activeTakeId && !kept.some((take) => take.id === layer.activeTakeId)) {
        layer.activeTakeId = kept[kept.length - 1]?.id ?? null;
      }
    }

    return { project: nextProject, removedTakeIds };
  }

  function getMissingAudioTakeIds(project = state.engine.project): string[] {
    return getProjectTakeIds(project).filter((takeId) => !takeAudioById.has(takeId));
  }

  function hasTakeAudio(takeId: string): boolean {
    return takeAudioById.has(takeId);
  }

  async function hydrateMissingTakeAudioFromPersistence(): Promise<{ hydrated: number; missingAfterHydration: string[] }> {
    const missingBefore = getMissingAudioTakeIds();
    if (missingBefore.length === 0) {
      return { hydrated: 0, missingAfterHydration: [] };
    }

    const snapshot = await loadOverdubSnapshot(state.engine.project.id);
    if (!snapshot) {
      console.warn('[OverdubState] hydrateMissingTakeAudioFromPersistence: no snapshot for current project.', {
        projectId: state.engine.project.id,
        missingBefore,
      });
      return { hydrated: 0, missingAfterHydration: missingBefore };
    }

    let hydrated = 0;
    for (const takeId of missingBefore) {
      const audio = snapshot.audioByTakeId.get(takeId);
      if (!audio) continue;
      takeAudioById.set(takeId, audio);
      hydrated += 1;
    }

    const missingAfterHydration = getMissingAudioTakeIds();
    return { hydrated, missingAfterHydration };
  }

  function pruneTakeAudioToProject(): void {
    const activeTakeIds = getActiveTakeIds();
    for (const takeId of takeAudioById.keys()) {
      if (!activeTakeIds.has(takeId)) {
        takeAudioById.delete(takeId);
      }
    }
  }

  function normalizeProjectMixState(project: OverdubProject): OverdubProject {
    let normalized: OverdubProject;
    try {
      if (typeof structuredClone === 'function') {
        normalized = structuredClone(project);
      } else {
        normalized = JSON.parse(JSON.stringify(project)) as OverdubProject;
      }
    } catch {
      normalized = JSON.parse(JSON.stringify(project)) as OverdubProject;
    }

    for (const layer of normalized.layers) {
      layer.gain = clampFinite(layer.gain, DEFAULT_LAYER_GAIN, 0, 2);
      layer.pan = clampFinite(layer.pan, 0, -1, 1);
      layer.muted = !!layer.muted;
      layer.solo = !!layer.solo;

      for (const take of layer.takes) {
        take.gain = clampFinite(take.gain, 1, 0, 2);
        take.pan = clampFinite(take.pan, 0, -1, 1);
      }

      if (layer.activeTakeId && !layer.takes.some((take) => take.id === layer.activeTakeId)) {
        layer.activeTakeId = layer.takes[layer.takes.length - 1]?.id ?? null;
      }
    }

    return normalized;
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

  function getTimelineAlignedPitchTrail(
    take: Pick<OverdubTake, 'id' | 'pitchTrail' | 'startOffsetMs'>
  ): OverdubPitchTrailPoint[] {
    if (!take.pitchTrail || take.pitchTrail.length === 0) return [];

    const sourceTrail = take.pitchTrail;
    const sourceLength = sourceTrail.length;
    const lastPoint = sourceTrail[sourceLength - 1];
    const sourceLastOffsetMs = Number.isFinite(lastPoint?.offsetMs)
      ? Math.round(lastPoint?.offsetMs ?? -1)
      : -1;
    const sourceLastMidi = Number.isFinite(lastPoint?.midi)
      ? (lastPoint?.midi ?? -1)
      : -1;

    // Pitch trail is captured against phrase-start timeline.
    // If the take offset is adjusted, shift pitch points by the same delta so
    // trail visualization remains synchronized with the take's audio placement.
    const startOffsetMs = getTakeStartOffsetMs(take);
    const cached = timelineAlignedTrailCache.get(take.id);
    if (
      cached
      && cached.sourceRef === sourceTrail
      && cached.sourceLength === sourceLength
      && cached.sourceLastOffsetMs === sourceLastOffsetMs
      && cached.sourceLastMidi === sourceLastMidi
      && cached.startOffsetMs === startOffsetMs
    ) {
      return cached.aligned;
    }

    const timelineShiftMs = RECORD_CAPTURE_LEAD_IN_MS - startOffsetMs;

    const deduped: OverdubPitchTrailPoint[] = [];
    for (const point of sourceTrail) {
      if (!Number.isFinite(point.offsetMs)) continue;
      const shiftedPoint: OverdubPitchTrailPoint = {
        offsetMs: Math.max(0, Math.round(point.offsetMs + timelineShiftMs)),
        midi: point.midi,
        clarity: clamp(point.clarity, 0, 1),
        frequency: point.frequency > 0 ? point.frequency : 0,
      };

      const last = deduped[deduped.length - 1];
      if (!last || last.offsetMs !== shiftedPoint.offsetMs) {
        deduped.push(shiftedPoint);
        continue;
      }
      // For identical timeline offsets, keep the higher-clarity sample.
      if (shiftedPoint.clarity > last.clarity) {
        deduped[deduped.length - 1] = shiftedPoint;
      }
    }

    timelineAlignedTrailCache.set(take.id, {
      sourceRef: sourceTrail,
      sourceLength,
      sourceLastOffsetMs,
      sourceLastMidi,
      startOffsetMs,
      aligned: deduped,
    });

    return deduped;
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
    if (!state.engine.project.clickEnabled) return;
    const phrase = state.engine.project.phrase;

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
    phraseDurationMs: number,
    options?: {
      respectMonitoringMode?: boolean;
      excludedLayerIds?: Iterable<string>;
    }
  ): void {
    const layers = state.engine.project.layers;
    const monitoringMode = state.engine.project.monitoringMode;
    const respectMonitoringMode = options?.respectMonitoringMode ?? true;
    const excludedLayerIds = new Set(options?.excludedLayerIds ?? []);
    if (respectMonitoringMode && monitoringMode === 'none') return;

    const anySolo = layers.some((layer) => layer.solo);
    const playableSoloLayers = layers.filter((layer) => {
      if (!layer.solo || layer.muted || !layer.activeTakeId) return false;
      const take = layer.takes.find((entry) => entry.id === layer.activeTakeId);
      if (!take) return false;
      const audio = takeAudioById.get(take.id);
      return !!audio;
    });
    const enforceSolo = anySolo && playableSoloLayers.length > 0;
    if (anySolo && !enforceSolo) {
      console.warn('[OverdubState] Solo gating ignored because no solo layer has playable audio.', {
        layerCount: layers.length,
        soloLayerCount: layers.filter((layer) => layer.solo).length,
      });
    }

    const phraseDurationSec = phraseDurationMs / 1000;
    const plannedLayers: Array<{
      layerId: string;
      layerName: string;
      activeTakeId: string | null;
      muted: boolean;
      solo: boolean;
      skippedReason: string | null;
      audioSamples: number;
      peak: number;
      gain: number;
      pan: number;
      startOffsetMs?: number;
    }> = [];
    let scheduledSourceCount = 0;

    for (const layer of layers) {
      if (excludedLayerIds.has(layer.id)) {
        plannedLayers.push({
          layerId: layer.id,
          layerName: layer.name,
          activeTakeId: layer.activeTakeId,
          muted: layer.muted,
          solo: layer.solo,
          skippedReason: 'excluded',
          audioSamples: 0,
          peak: 0,
          gain: layer.gain,
          pan: layer.pan,
        });
        continue;
      }

      if (!layer.activeTakeId) {
        plannedLayers.push({
          layerId: layer.id,
          layerName: layer.name,
          activeTakeId: null,
          muted: layer.muted,
          solo: layer.solo,
          skippedReason: 'no-active-take',
          audioSamples: 0,
          peak: 0,
          gain: layer.gain,
          pan: layer.pan,
        });
        continue;
      }

      if (layer.muted) {
        plannedLayers.push({
          layerId: layer.id,
          layerName: layer.name,
          activeTakeId: layer.activeTakeId,
          muted: true,
          solo: layer.solo,
          skippedReason: 'muted',
          audioSamples: 0,
          peak: 0,
          gain: layer.gain,
          pan: layer.pan,
        });
        continue;
      }

      if (enforceSolo && !layer.solo) {
        plannedLayers.push({
          layerId: layer.id,
          layerName: layer.name,
          activeTakeId: layer.activeTakeId,
          muted: layer.muted,
          solo: layer.solo,
          skippedReason: 'solo-gated',
          audioSamples: 0,
          peak: 0,
          gain: layer.gain,
          pan: layer.pan,
        });
        continue;
      }

      const take = layer.takes.find((entry) => entry.id === layer.activeTakeId);
      if (!take) {
        plannedLayers.push({
          layerId: layer.id,
          layerName: layer.name,
          activeTakeId: layer.activeTakeId,
          muted: layer.muted,
          solo: layer.solo,
          skippedReason: 'active-take-missing',
          audioSamples: 0,
          peak: 0,
          gain: layer.gain,
          pan: layer.pan,
        });
        continue;
      }

      const audio = takeAudioById.get(take.id);
      if (!audio) {
        plannedLayers.push({
          layerId: layer.id,
          layerName: layer.name,
          activeTakeId: layer.activeTakeId,
          muted: layer.muted,
          solo: layer.solo,
          skippedReason: 'audio-missing',
          audioSamples: 0,
          peak: 0,
          gain: layer.gain,
          pan: layer.pan,
        });
        continue;
      }

      const source = context.createBufferSource();
      source.buffer = createAudioBufferFromTake(context, audio);

      const gain = context.createGain();
      const layerGain = clampFinite(layer.gain, 1, 0, 2);
      const takeGain = clampFinite(take.gain, 1, 0, 2);
      gain.gain.value = clamp(layerGain * takeGain, 0, 2);

      const panner = context.createStereoPanner();
      const layerPan = clampFinite(layer.pan, 0, -1, 1);
      const takePan = clampFinite(take.pan, 0, -1, 1);
      panner.pan.value = clamp(layerPan + takePan, -1, 1);

      source.connect(gain);
      gain.connect(panner);
      panner.connect(context.destination);

      const startOffsetMs = getTakeStartOffsetMs(take);
      const startOffsetSec = startOffsetMs / 1000;
      const takeBufferDurationSec = source.buffer.duration;
      const playbackDurationSec = Math.max(
        phraseDurationSec,
        Math.min(
          takeBufferDurationSec,
          phraseDurationSec + startOffsetSec + (RECORD_CAPTURE_LEAD_OUT_MS / 1000),
        ),
      );
      const startWithOffset = Math.max(context.currentTime + 0.01, startSec - startOffsetSec);
      source.start(startWithOffset);
      source.stop(startWithOffset + playbackDurationSec);

      activePlaybackNodes.push(source);
      activePlaybackAuxNodes.push(gain, panner);
      scheduledSourceCount += 1;
      plannedLayers.push({
        layerId: layer.id,
        layerName: layer.name,
        activeTakeId: layer.activeTakeId,
        muted: layer.muted,
        solo: layer.solo,
        skippedReason: null,
        audioSamples: audio.samples.length,
        peak: Number(estimateAudioPeak(audio.samples).toFixed(5)),
        gain: Number(layerGain.toFixed(3)),
        pan: Number(layerPan.toFixed(3)),
        startOffsetMs,
      });
    }

    if (scheduledSourceCount === 0) {
      console.warn('[OverdubState] scheduleLayerPlayback: no sources scheduled', {
        monitoringMode,
        respectMonitoringMode,
        enforceSolo,
        anySolo,
        phraseDurationMs,
        plannedLayers,
      });
    }
  }

  function schedulePendingTakePlayback(
    context: AudioContext,
    startSec: number,
    phraseDurationMs: number
  ): void {
    const pendingTake = state.engine.pendingTake;
    if (!pendingTake || !pendingTakeAudio) {
      console.warn('[OverdubState] schedulePendingTakePlayback skipped: missing pending take audio.', {
        hasPendingTake: !!pendingTake,
        hasPendingTakeAudio: !!pendingTakeAudio,
      });
      return;
    }

    const source = context.createBufferSource();
    source.buffer = createAudioBufferFromTake(context, pendingTakeAudio);

    const gain = context.createGain();
    const parentLayer = getLayerById(pendingTake.layerId);
    const layerGain = clampFinite(parentLayer?.gain, 1, 0, 2);
    const takeGain = clampFinite(pendingTake.gain, 1, 0, 2);
    gain.gain.value = clamp(layerGain * takeGain, 0, 2);

    const panner = context.createStereoPanner();
    const layerPan = clampFinite(parentLayer?.pan, 0, -1, 1);
    const takePan = clampFinite(pendingTake.pan, 0, -1, 1);
    panner.pan.value = clamp(layerPan + takePan, -1, 1);

    source.connect(gain);
    gain.connect(panner);
    panner.connect(context.destination);

    const phraseDurationSec = phraseDurationMs / 1000;
    const startOffsetMs = getTakeStartOffsetMs(pendingTake);
    const startOffsetSec = startOffsetMs / 1000;
    const takeBufferDurationSec = source.buffer.duration;
    const playbackDurationSec = Math.max(
      phraseDurationSec,
      Math.min(
        takeBufferDurationSec,
        phraseDurationSec + startOffsetSec + (RECORD_CAPTURE_LEAD_OUT_MS / 1000),
      ),
    );
    const startWithOffset = Math.max(context.currentTime + 0.01, startSec - startOffsetSec);
    source.start(startWithOffset);
    source.stop(startWithOffset + playbackDurationSec);

    activePlaybackNodes.push(source);
    activePlaybackAuxNodes.push(gain, panner);
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
        const normalizedProject = normalizeProjectMixState(snapshot.project);
        const { project: playableProject } = stripTakesMissingAudio(
          normalizedProject,
          snapshot.audioByTakeId
        );
        machine.dispatch({ type: 'NEW_PROJECT', project: playableProject });
        takeAudioById.clear();
        const playableTakeIds = getProjectTakeIdSet(playableProject);
        for (const [takeId, audio] of snapshot.audioByTakeId) {
          if (!playableTakeIds.has(takeId)) continue;
          takeAudioById.set(takeId, audio);
        }
      } else {
        machine.reset(DEFAULT_ENGINE_CONFIG);
        const baseLayerId = machine.getState().project.layers[0]?.id;
        if (baseLayerId) {
          machine.dispatch({ type: 'SET_LAYER_GAIN', layerId: baseLayerId, gain: DEFAULT_LAYER_GAIN });
        }
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
    await stopCompositePlayback();
    dispatch({ type: 'NEW_PROJECT' });
    const baseLayerId = state.engine.project.layers[0]?.id;
    if (baseLayerId) {
      dispatch({ type: 'SET_LAYER_GAIN', layerId: baseLayerId, gain: DEFAULT_LAYER_GAIN });
    }
    takeAudioById.clear();
    pendingTakeAudio = null;
    state.hiddenLayerTrailId = null;
    state.forwardCursorModeEnabled = false;
    state.isPendingTakePreviewActive = false;
    clearWarningIfNoError();
    await persistCurrentProject();
  }

  function inferTimeSignatureNumerator(totalBeats: number): number {
    const preferred = [4, 3, 6, 2, 5, 7, 8, 9, 10, 11, 12];
    for (const candidate of preferred) {
      if (totalBeats % candidate === 0) return candidate;
    }
    return clamp(totalBeats, 1, 12);
  }

  function buildPhraseFromExercise(template: OverdubExerciseTemplate): PhraseSettings {
    const existing = state.engine.project.phrase;
    const tempoBpm = clamp(Math.round(template.config.tempo), 20, 320);
    const countInBeats = clamp(Math.round(template.config.countInBeats ?? 4), 0, 32);

    // In this time grid model, one macrobeat is an eighth-note unit.
    // A quarter-note beat contains 2 macrobeats.
    const macrobeatsPerBeat = 2;
    const microbeatsPerMacrobeat = template.config.timeGrid.microbeatsPerMacrobeat;
    const totalMacrobeats = template.config.timeGrid.microbeatCount / microbeatsPerMacrobeat;
    const totalBeats = Math.max(
      1,
      Math.round(totalMacrobeats / macrobeatsPerBeat)
    );
    const timeSignatureNumerator = inferTimeSignatureNumerator(totalBeats);
    const measures = Math.max(1, Math.ceil(totalBeats / timeSignatureNumerator));

    return {
      ...existing,
      tempoBpm,
      timeSignatureNumerator,
      timeSignatureDenominator: 4,
      measures,
      countInBeats,
    };
  }

  async function loadExerciseScaffold(template: OverdubExerciseTemplate): Promise<void> {
    const voices = template.config.voices;
    if (!voices || voices.length === 0) {
      state.warning = 'Selected exercise has no voices to scaffold into the overdub builder.';
      return;
    }

    await stopCompositePlayback();
    const defaultLayerGain = clamp(DEFAULT_LAYER_GAIN, 0.5, 2);
    const layers = voices.map((voice, index) => {
      const layer = createLayer(index, voice.name);
      layer.gain = defaultLayerGain;
      return layer;
    });
    const phrase = buildPhraseFromExercise(template);

    dispatch({
      type: 'NEW_PROJECT',
      project: {
        title: `${template.name} Takes`,
        phrase,
        layers,
      },
    });

    const firstLayerId = state.engine.project.layers[0]?.id;
    if (firstLayerId) {
      dispatch({ type: 'ARM', layerId: firstLayerId });
    }

    takeAudioById.clear();
    pendingTakeAudio = null;
    state.hiddenLayerTrailId = null;
    state.forwardCursorModeEnabled = false;
    state.isPendingTakePreviewActive = false;
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
    const createdLayerId = state.engine.project.layers[state.engine.project.layers.length - 1]?.id;
    if (createdLayerId) {
      dispatch({ type: 'SET_LAYER_GAIN', layerId: createdLayerId, gain: DEFAULT_LAYER_GAIN });
    }
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

  async function startRecordingCycle(options?: {
    onScheduled?: (info: RecordingScheduleInfo) => void;
  }): Promise<void> {
    if (state.isBusy || state.isRecordingActive || state.isCountInActive) return;
    await stopCompositePlayback();

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
      const captureLeadInMs = RECORD_CAPTURE_LEAD_IN_MS;
      const captureLeadOutMs = RECORD_CAPTURE_LEAD_OUT_MS;
      const captureDurationMs = phraseDurationMs + captureLeadInMs + captureLeadOutMs;
      const captureLeadInSec = captureLeadInMs / 1000;
      const countInSec = countInMs / 1000;
      const recordStartSec = context.currentTime + Math.max(
        RECORD_CAPTURE_MIN_START_DELAY_SEC + captureLeadInSec,
        countInSec,
      );
      const captureStartSec = recordStartSec - captureLeadInSec;
      const countInStartSec = recordStartSec - countInSec;
      const recordStartDelayMs = Math.max(0, Math.round((recordStartSec - context.currentTime) * 1000));
      const recordStartPerfMs = performance.now() + (recordStartSec - context.currentTime) * 1000;
      const recordStopPerfMs = recordStartPerfMs + phraseDurationMs;
      state.recordingStartPerfMs = recordStartPerfMs;
      try {
        options?.onScheduled?.({
          startDelayMs: recordStartDelayMs,
          startAtPerfMs: recordStartPerfMs,
          phraseDurationMs,
          countInMs,
        });
      } catch (error) {
        console.error('[OverdubState] startRecordingCycle onScheduled callback failed', error);
      }

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
      }, recordStartDelayMs);

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
        startAtContextTimeSec: captureStartSec,
        durationMs: captureDurationMs,
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

      const decimatedTrail = decimateTrail(capturedTrailPoints, TAKE_PITCH_TRAIL_TARGET_FPS);
      const pendingTake: OverdubTake = {
        id: takeId,
        layerId,
        createdAt: new Date().toISOString(),
        durationMs: normalizedDurationMs,
        startOffsetMs: captureLeadInMs,
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
    state.isPendingTakePreviewActive = false;
    dispatch({ type: 'CANCEL_REC' });
    clearWarningIfNoError();
  }

  async function keepPendingTake(): Promise<void> {
    const pendingTake = state.engine.pendingTake;
    if (!pendingTake || !pendingTakeAudio) return;
    await stopCompositePlayback();

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
    void stopCompositePlayback();
    pendingTakeAudio = null;
    dispatch({ type: 'REDO_TAKE' });
  }

  async function previewPendingTake(): Promise<void> {
    if (state.isBusy || state.isRecordingActive || state.isCountInActive) return;

    const pendingTake = state.engine.pendingTake;
    if (!pendingTake || !pendingTakeAudio) {
      state.warning = 'No pending take available to preview.';
      return;
    }

    try {
      const context = await ensurePlaybackContext();
      const phraseDurationMs = computePhraseDurationMs(state.engine.project.phrase);
      const pendingTakeStartOffsetMs = getTakeStartOffsetMs(pendingTake);
      const pendingTakeTailAfterPhraseMs = getTakeTailAfterPhraseMs(
        pendingTake,
        pendingTakeAudio,
        phraseDurationMs,
      );
      const startDelayMs = Math.max(50, pendingTakeStartOffsetMs + 40);
      const startSec = context.currentTime + (startDelayMs / 1000);

      stopPlaybackTimers();
      stopPlaybackNodes();
      state.isPendingTakePreviewActive = true;

      scheduleLayerPlayback(context, startSec, phraseDurationMs, {
        respectMonitoringMode: false,
        excludedLayerIds: [pendingTake.layerId],
      });
      schedulePendingTakePlayback(context, startSec, phraseDurationMs);

      playbackStopTimeoutId = setTimeout(() => {
        void stopCompositePlayback();
      }, phraseDurationMs + pendingTakeTailAfterPhraseMs + startDelayMs + 150);
    } catch (error) {
      stopPlaybackTimers();
      stopPlaybackNodes();
      state.isPendingTakePreviewActive = false;
      state.warning = error instanceof Error ? error.message : 'Failed to preview pending take.';
    }
  }

  async function playComposite(): Promise<{ startDelayMs: number; startAtPerfMs: number }> {
    if (state.engine.mode === 'playing') {
      return { startDelayMs: 0, startAtPerfMs: performance.now() };
    }

    const missingBefore = getMissingAudioTakeIds();
    if (missingBefore.length > 0) {
      console.warn('[OverdubState] playComposite detected missing take audio before scheduling; attempting hydration.', {
        projectId: state.engine.project.id,
        missingTakeCount: missingBefore.length,
        missingTakeIds: missingBefore.slice(0, 10),
      });
      try {
        await hydrateMissingTakeAudioFromPersistence();
      } catch (error) {
        console.error('[OverdubState] playComposite hydration attempt failed', error);
      }
    }

    const context = await ensurePlaybackContext();
    const phrase = state.engine.project.phrase;
    const phraseDurationMs = computePhraseDurationMs(phrase);
    const countInMs = getCountInDurationMs(phrase);
    const maxStartOffsetMs = getMaxActiveTakeStartOffsetMs();
    const maxTailAfterPhraseMs = getMaxActiveTakeTailAfterPhraseMs(phraseDurationMs);

    stopPlaybackNodes();
    stopPlaybackTimers();
    state.isPendingTakePreviewActive = false;

    dispatch({ type: 'START_PLAYBACK' });

    const startDelaySec = Math.max(
      0.06,
      countInMs / 1000,
      (maxStartOffsetMs + 20) / 1000,
    );
    const startDelayMs = Math.round(startDelaySec * 1000);
    const startSec = context.currentTime + startDelaySec;
    const countInStartSec = startSec - (countInMs / 1000);
    const startAtPerfMs = performance.now() + ((startSec - context.currentTime) * 1000);
    scheduleLayerPlayback(context, startSec, phraseDurationMs, { respectMonitoringMode: false });
    if (state.engine.project.clickEnabled) {
      scheduleMetronome(context, countInStartSec, phraseDurationMs);
    }
    startPlaybackClock(context, startSec, phraseDurationMs);

    playbackStopTimeoutId = setTimeout(() => {
      void stopCompositePlayback();
    }, phraseDurationMs + maxTailAfterPhraseMs + startDelayMs + 220);

    return { startDelayMs, startAtPerfMs };
  }

  async function stopCompositePlayback(): Promise<void> {
    stopPlaybackTimers();
    stopPlaybackNodes();
    state.isPendingTakePreviewActive = false;
    if (state.engine.mode === 'playing' || state.engine.mode === 'exporting') {
      dispatch({ type: 'STOP_PLAYBACK' });
    }
  }

  function getRenderableTrails(): RenderableTakeTrail[] {
    if (!state.renderableTrailsVisible) {
      return [];
    }

    const result: RenderableTakeTrail[] = [];
    const layers = state.engine.project.layers;

    for (let index = 0; index < layers.length; index++) {
      const layer = layers[index];
      if (!layer.activeTakeId) continue;
      if (layer.muted) continue;
      if (state.hiddenLayerTrailId && layer.id === state.hiddenLayerTrailId) continue;

      const take = layer.takes.find((entry) => entry.id === layer.activeTakeId);
      if (!take || take.pitchTrail.length === 0) continue;

      result.push({
        layerId: layer.id,
        layerName: layer.name,
        takeId: take.id,
        color: getLayerColor(index),
        points: getTimelineAlignedPitchTrail(take),
      });
    }

    if (state.engine.pendingTake && state.engine.pendingTake.pitchTrail.length > 0) {
      const layerIndex = layers.findIndex((layer) => layer.id === state.engine.pendingTake?.layerId);
      result.push({
        layerId: state.engine.pendingTake.layerId,
        layerName: 'Pending Take',
        takeId: state.engine.pendingTake.id,
        color: getLayerColor(layerIndex >= 0 ? layerIndex : 0),
        points: getTimelineAlignedPitchTrail(state.engine.pendingTake),
      });
    }

    return result;
  }

  function setRenderableTrailsVisible(visible: boolean): void {
    state.renderableTrailsVisible = !!visible;
  }

  async function dispose(): Promise<void> {
    stopPlaybackTimers();
    stopPlaybackNodes();
    stopRecordTimers();
    stopTrailCapture();
    state.recordingStartPerfMs = null;
    state.isPendingTakePreviewActive = false;
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
    loadExerciseScaffold,
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
    setRenderableTrailsVisible,
    setForwardCursorModeEnabled,
    startRecordingCycle,
    stopAndRedoCurrentTake,
    keepPendingTake,
    redoPendingTake,
    hasTakeAudio,
    previewPendingTake,
    playComposite,
    stopCompositePlayback,
    getRenderableTrails,
    dispose,
  };
}

export const overdubState = createOverdubState();
