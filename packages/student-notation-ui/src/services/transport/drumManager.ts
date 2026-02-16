/**
 * Drum Manager Adapter
 *
 * Reuses a single engine drum manager instance for:
 * - transport playback
 * - drum-grid live preview
 * - startup preload
 */

import type * as Tone from 'tone';
import {
  createDrumManager,
  preloadDrumSamples as preloadEngineDrumSamples,
  type DrumManagerInstance
} from '@mlt/student-notation-engine';
import SynthEngine from '@services/initAudio.ts';

type DrumTrack = 'H' | 'M' | 'L';

let sharedDrumManager: DrumManagerInstance | null = null;

function syncWindowDrumVolumeNode(manager: DrumManagerInstance): void {
  const volumeNode = manager.getVolumeNode();
  if (volumeNode) {
    (window as any).drumVolumeNode = volumeNode;
  }
}

export function getSharedDrumManager(): DrumManagerInstance {
  if (!sharedDrumManager) {
    sharedDrumManager = createDrumManager({
      synthEngine: {
        getMainVolumeNode: () => SynthEngine.getMainVolumeNode()
      }
    });
  }

  syncWindowDrumVolumeNode(sharedDrumManager);
  return sharedDrumManager;
}

export async function preloadDrumSamples(): Promise<void> {
  await preloadEngineDrumSamples();
}

export function getDrumPlayers(): Tone.Players | null {
  return sharedDrumManager?.getPlayers() ?? null;
}

export function initDrumPlayers(): Tone.Players {
  const manager = getSharedDrumManager();
  const players = manager.getPlayers();
  if (!players) {
    throw new Error('Drum players unavailable after manager initialization');
  }
  return players;
}

export function triggerDrum(trackId: DrumTrack, time: number): void {
  getSharedDrumManager().trigger(trackId, time);
}

export function resetDrumStartTimes(): void {
  sharedDrumManager?.reset();
}
