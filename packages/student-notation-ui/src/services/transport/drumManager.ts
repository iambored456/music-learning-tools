/**
 * Drum Manager
 *
 * Handles drum player initialization, preloading, and safe scheduling.
 */

import * as Tone from 'tone';

/** Default drum sample URLs */
const DRUM_SAMPLE_URLS = {
  H: 'https://tonejs.github.io/audio/drum-samples/CR78/hihat.mp3',
  M: 'https://tonejs.github.io/audio/drum-samples/CR78/snare.mp3',
  L: 'https://tonejs.github.io/audio/drum-samples/CR78/kick.mp3'
} as const;

/** Drum players instance */
let drumPlayers: Tone.Players | null = null;

/** Preloaded drum players (from preloadDrumSamples) */
let preloadedDrumPlayers: Tone.Players | null = null;

/** Track last drum start times to prevent overlapping triggers */
const lastDrumStartTimes = new Map<string, number>();

/** Minimum time between drum triggers */
const DRUM_START_EPSILON = 1e-4;

/** Whether drum samples have been preloaded */
let drumsPreloaded = false;

/**
 * Reset drum start time tracking.
 * Called when transport stops or restarts.
 */
export function resetDrumStartTimes(): void {
  lastDrumStartTimes.clear();
}

/**
 * Get a safe drum start time that prevents overlapping triggers.
 * Ensures each drum hit is scheduled slightly after the previous one.
 */
export function getSafeDrumStartTime(trackId: string, requestedTime: number): number {
  let safeTime = Number.isFinite(requestedTime) ? requestedTime : Tone.now();
  const lastTime = lastDrumStartTimes.get(trackId) ?? -Infinity;

  if (!(safeTime > lastTime)) {
    safeTime = lastTime + DRUM_START_EPSILON;
  }

  lastDrumStartTimes.set(trackId, safeTime);
  return safeTime;
}

/**
 * Get the drum players instance.
 */
export function getDrumPlayers(): Tone.Players | null {
  return drumPlayers;
}

/**
 * Check if drum samples have been preloaded.
 */
export function areDrumsPreloaded(): boolean {
  return drumsPreloaded;
}

/**
 * Preload drum samples during app initialization.
 * This loads the audio buffers without connecting to the audio graph,
 * so they're ready for instant playback when needed.
 *
 * Call this during app loading phase, before initDrumPlayers.
 *
 * @returns Promise that resolves when samples are loaded
 */
export async function preloadDrumSamples(): Promise<void> {
  if (drumsPreloaded) {
    return; // Already preloaded
  }

  // Create players without connecting to destination yet
  preloadedDrumPlayers = new Tone.Players(DRUM_SAMPLE_URLS);

  try {
    // Wait for all buffers to be loaded
    // Tone.Players creates ToneAudioBuffers which have a loaded promise
    await (preloadedDrumPlayers as any).loaded;
    drumsPreloaded = true;
  } catch (error: unknown) {
    // Log but don't fail the app - drums will load on-demand instead
    console.warn('Drum sample preloading failed, will load on-demand:', error);
    preloadedDrumPlayers?.dispose();
    preloadedDrumPlayers = null;
    // Don't rethrow - we want to continue app loading even if drums fail
  }
}

/**
 * Initialize drum players and connect to audio chain.
 * Uses preloaded samples if available, otherwise loads on-demand.
 */
export function initDrumPlayers(): Tone.Players {
  // Create drum volume control node
  const drumVolumeNode = new Tone.Volume(0); // 0dB = 100% volume

  // Use preloaded players if available, otherwise create new ones
  if (preloadedDrumPlayers && drumsPreloaded) {
    drumPlayers = preloadedDrumPlayers;
    drumPlayers.connect(drumVolumeNode);
    preloadedDrumPlayers = null; // Clear reference, drumPlayers now owns it
  } else {
    // Fallback: load on-demand
    drumPlayers = new Tone.Players(DRUM_SAMPLE_URLS).connect(drumVolumeNode);
  }

  // Connect drums to the same main audio chain as synths
  if (window.synthEngine) {
    const synthEngineDestination = window.synthEngine.getMainVolumeNode?.();
    if (synthEngineDestination) {
      drumVolumeNode.connect(synthEngineDestination);
    } else {
      drumVolumeNode.toDestination();
    }
  } else {
    drumVolumeNode.toDestination();
  }

  // Store reference to drum volume node for external access
  window.drumVolumeNode = drumVolumeNode;

  return drumPlayers;
}

/**
 * Trigger a drum hit on the specified track.
 */
export function triggerDrum(trackId: string, time: number): void {
  if (!drumPlayers) return;

  const safeTime = getSafeDrumStartTime(trackId, time);
  drumPlayers.player(trackId)?.start(safeTime);
}
