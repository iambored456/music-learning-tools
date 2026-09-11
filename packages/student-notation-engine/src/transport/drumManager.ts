/**
 * Drum Manager
 *
 * Handles drum player initialization and safe scheduling.
 * Framework-agnostic - accepts synth engine as dependency for audio routing.
 */

import * as Tone from 'tone';
import { getDrumSampleSet } from '@mlt/audio-samples';
import type {
  DrumConfig,
  DrumManagerInstance,
  DrumTrackId
} from './types.js';

/** Default drum sample URLs */
export const DEFAULT_DRUM_SAMPLES: Record<DrumTrackId, string> =
  getDrumSampleSet() as Record<DrumTrackId, string>;

let drumPreloadPromise: Promise<void> | null = null;
let drumsPreloaded = false;

/** Minimum time between drum triggers */
const DRUM_START_EPSILON = 1e-4;

function createLoadingPlayers(samples: Record<DrumTrackId, string>) {
  let resolveLoad!: () => void;
  let rejectLoad!: (error: Error) => void;
  const loaded = new Promise<void>((resolve, reject) => {
    resolveLoad = resolve;
    rejectLoad = reject;
  });
  // Players may begin loading before anyone calls waitForLoad(). Keep a
  // rejection handled while preserving it for every current/future waiter.
  void loaded.catch(() => {});
  const players = new Tone.Players({
    urls: samples,
    onload: resolveLoad,
    onerror: rejectLoad
  });
  if (players.loaded) resolveLoad();
  return { players, loaded, cancelLoad: () => rejectLoad(new Error('Drum players disposed before loading completed')) };
}

/**
 * Preload drum sample URLs into the browser cache for subsequent players.
 * Safe to call repeatedly; concurrent calls share the same promise.
 */
export function preloadDrumSamples(
  samples: Record<DrumTrackId, string> = DEFAULT_DRUM_SAMPLES
): Promise<void> {
  if (drumsPreloaded) {
    return Promise.resolve();
  }

  if (drumPreloadPromise) {
    return drumPreloadPromise;
  }

  const { players: preloadPlayers, loaded } = createLoadingPlayers(samples);
  drumPreloadPromise = (async () => {
    try {
      await loaded;
      drumsPreloaded = true;
    } finally {
      preloadPlayers.dispose();
    }
  })().catch((error) => {
    drumPreloadPromise = null;
    throw error;
  });

  return drumPreloadPromise;
}

/**
 * Create a drum manager instance.
 */
export function createDrumManager(config: DrumConfig = {}): DrumManagerInstance {
  const {
    samples = DEFAULT_DRUM_SAMPLES,
    synthEngine,
    initialVolume = 0
  } = config;

  // Internal state
  let drumPlayers: Tone.Players | null = null;
  let drumVolumeNode: Tone.Volume | null = null;
  const lastDrumStartTimes = new Map<string, number>();
  const trackVolumes: Record<DrumTrackId, number> = { H: 1, M: 1, L: 1 };

  /**
   * Get a safe drum start time that prevents overlapping triggers.
   */
  function getSafeDrumStartTime(trackId: string, requestedTime: number): number {
    let safeTime = Number.isFinite(requestedTime) ? requestedTime : Tone.now();
    const lastTime = lastDrumStartTimes.get(trackId) ?? -Infinity;

    if (!(safeTime > lastTime)) {
      safeTime = lastTime + DRUM_START_EPSILON;
    }

    lastDrumStartTimes.set(trackId, safeTime);
    return safeTime;
  }

  // Initialize drum players
  drumVolumeNode = new Tone.Volume(initialVolume);

  const loading = createLoadingPlayers(samples);
  drumPlayers = loading.players.connect(drumVolumeNode);

  // Connect to synth engine's main volume if available, otherwise to destination
  if (synthEngine) {
    const synthEngineDestination = synthEngine.getMainVolumeNode?.();
    if (synthEngineDestination) {
      drumVolumeNode.connect(synthEngineDestination);
    } else {
      drumVolumeNode.toDestination();
    }
  } else {
    drumVolumeNode.toDestination();
  }

  return {
    getPlayers(): Tone.Players | null {
      return drumPlayers;
    },

    getVolumeNode(): Tone.Volume | null {
      return drumVolumeNode;
    },

    setTrackVolume(trackId: DrumTrackId, volume: number): void {
      if (!Number.isFinite(volume)) return;
      const next = Math.max(0, Math.min(1, volume));
      trackVolumes[trackId] = next;
      const player = drumPlayers?.player(trackId);
      if (player) player.volume.value = Tone.gainToDb(next);
    },

    getTrackVolume(trackId: DrumTrackId): number {
      return trackVolumes[trackId];
    },

    trigger(trackId: DrumTrackId, time: number): void {
      if (!drumPlayers) return;

      const safeTime = getSafeDrumStartTime(trackId, time);
      drumPlayers.player(trackId)?.start(safeTime);
    },

    reset(): void {
      drumPlayers?.stopAll();
      lastDrumStartTimes.clear();
    },

    dispose(): void {
      loading.cancelLoad();
      drumPlayers?.dispose();
      drumVolumeNode?.dispose();
      drumPlayers = null;
      drumVolumeNode = null;
      lastDrumStartTimes.clear();
    },

    isLoaded(): boolean {
      return drumPlayers?.loaded ?? false;
    },

    async waitForLoad(): Promise<void> {
      await loading.loaded;
    }
  };
}
