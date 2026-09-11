/**
 * Drum Manager Adapter
 *
 * Reuses one logical drum manager across:
 * - transport playback
 * - drum-grid live preview
 * - startup preload
 *
 * Supports runtime sample remapping for H/M/L layers.
 */

import type * as Tone from 'tone';
import { getDrumSampleSet } from '@mlt/audio-samples';
import {
  createDrumManager,
  type DrumManagerInstance
} from '@mlt/student-notation-engine';
import SynthEngine from '@services/initAudio.ts';
import { registerDrumVolumeNode } from '@services/runtimeGlobals.ts';

type DrumTrack = 'H' | 'M' | 'L';

const DEFAULT_DRUM_LAYER_SAMPLES = getDrumSampleSet() as Record<DrumTrack, string>;

let activeDrumManager: DrumManagerInstance | null = null;
let activeDrumLayerSamples: Record<DrumTrack, string> = { ...DEFAULT_DRUM_LAYER_SAMPLES };
const activeDrumLayerVolumes: Record<DrumTrack, number> = { H: 1, M: 1, L: 1 };

function applyDrumLayerVolumes(manager: DrumManagerInstance): void {
  (['H', 'M', 'L'] as const).forEach(trackId => {
    manager.setTrackVolume(trackId, activeDrumLayerVolumes[trackId]);
  });
}

function createEngineDrumManager(
  samples: Record<DrumTrack, string>,
  initialVolume = 0
): DrumManagerInstance {
  return createDrumManager({
    samples,
    initialVolume,
    synthEngine: {
      getMainVolumeNode: () => SynthEngine.getMainVolumeNode()
    }
  });
}

function syncWindowDrumVolumeNode(manager: DrumManagerInstance): void {
  const volumeNode = manager.getVolumeNode();
  if (volumeNode) {
    registerDrumVolumeNode(volumeNode);
  }
}

function ensureActiveDrumManager(): DrumManagerInstance {
  if (!activeDrumManager) {
    activeDrumManager = createEngineDrumManager(activeDrumLayerSamples);
    applyDrumLayerVolumes(activeDrumManager);
  }

  syncWindowDrumVolumeNode(activeDrumManager);
  return activeDrumManager;
}

const sharedDrumManagerProxy: DrumManagerInstance = {
  getPlayers(): Tone.Players | null {
    return ensureActiveDrumManager().getPlayers();
  },

  getVolumeNode(): Tone.Volume | null {
    return ensureActiveDrumManager().getVolumeNode();
  },

  setTrackVolume(trackId: DrumTrack, volume: number): void {
    setDrumLayerVolume(trackId, volume);
  },

  getTrackVolume(trackId: DrumTrack): number {
    return activeDrumLayerVolumes[trackId];
  },

  trigger(trackId: DrumTrack, time: number): void {
    ensureActiveDrumManager().trigger(trackId, time);
  },

  reset(): void {
    ensureActiveDrumManager().reset();
  },

  dispose(): void {
    activeDrumManager?.dispose();
    activeDrumManager = null;
  },

  isLoaded(): boolean {
    return ensureActiveDrumManager().isLoaded();
  },

  async waitForLoad(): Promise<void> {
    await ensureActiveDrumManager().waitForLoad();
  }
};

export function getSharedDrumManager(): DrumManagerInstance {
  ensureActiveDrumManager();
  return sharedDrumManagerProxy;
}

export function getCurrentDrumLayerSamples(): Record<DrumTrack, string> {
  return { ...activeDrumLayerSamples };
}

export function getDrumLayerVolume(trackId: DrumTrack): number {
  return activeDrumLayerVolumes[trackId];
}

export function setDrumLayerVolume(trackId: DrumTrack, volume: number): void {
  if (!Number.isFinite(volume)) return;
  const next = Math.max(0, Math.min(1, volume));
  activeDrumLayerVolumes[trackId] = next;
  activeDrumManager?.setTrackVolume(trackId, next);
}

export async function setDrumLayerSamples(
  nextSamples: Partial<Record<DrumTrack, string>>
): Promise<void> {
  const mergedSamples: Record<DrumTrack, string> = {
    ...activeDrumLayerSamples,
    ...nextSamples
  };

  const hasChanges = (['H', 'M', 'L'] as const).some(
    (trackId) => mergedSamples[trackId] !== activeDrumLayerSamples[trackId]
  );

  if (!hasChanges) {
    return;
  }

  const previousManager = activeDrumManager;
  const previousVolumeDb = previousManager?.getVolumeNode()?.volume?.value;
  const initialVolume = Number.isFinite(previousVolumeDb ?? NaN)
    ? (previousVolumeDb as number)
    : 0;

  const nextManager = createEngineDrumManager(mergedSamples, initialVolume);
  applyDrumLayerVolumes(nextManager);

  try {
    await nextManager.waitForLoad();
  } catch (error) {
    nextManager.dispose();
    throw error;
  }

  activeDrumManager = nextManager;
  activeDrumLayerSamples = mergedSamples;
  syncWindowDrumVolumeNode(nextManager);

  previousManager?.dispose();
}

export async function preloadDrumSamples(): Promise<void> {
  try {
    await ensureActiveDrumManager().waitForLoad();
  } catch (error) {
    // Speculative preloads are fire-and-forget. Transport still receives the
    // original rejection if playback actually needs these samples.
    console.warn('Unable to preload drum samples', error);
  }
}

export function getDrumPlayers(): Tone.Players | null {
  return ensureActiveDrumManager().getPlayers();
}

export function initDrumPlayers(): Tone.Players {
  const players = ensureActiveDrumManager().getPlayers();
  if (!players) {
    throw new Error('Drum players unavailable after manager initialization');
  }
  return players;
}

export function triggerDrum(trackId: DrumTrack, time: number): void {
  ensureActiveDrumManager().trigger(trackId, time);
}

export function resetDrumStartTimes(): void {
  ensureActiveDrumManager().reset();
}
