/**
 * Drum Manager
 *
 * Handles drum player initialization and safe scheduling.
 * Framework-agnostic - accepts synth engine as dependency for audio routing.
 */

import * as Tone from 'tone';
import type {
  DrumConfig,
  DrumManagerInstance,
  DrumTrackId
} from './types.js';

/** Default drum sample URLs */
export const DEFAULT_DRUM_SAMPLES: Record<DrumTrackId, string> = {
  H: 'https://tonejs.github.io/audio/drum-samples/CR78/hihat.mp3',
  M: 'https://tonejs.github.io/audio/drum-samples/CR78/snare.mp3',
  L: 'https://tonejs.github.io/audio/drum-samples/CR78/kick.mp3'
};

/** Minimum time between drum triggers */
const DRUM_START_EPSILON = 1e-4;

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

  drumPlayers = new Tone.Players(samples).connect(drumVolumeNode);

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

    trigger(trackId: DrumTrackId, time: number): void {
      if (!drumPlayers) return;

      const safeTime = getSafeDrumStartTime(trackId, time);
      drumPlayers.player(trackId)?.start(safeTime);
    },

    reset(): void {
      lastDrumStartTimes.clear();
    },

    dispose(): void {
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
      if (drumPlayers) {
        await drumPlayers.loaded;
      }
    }
  };
}
