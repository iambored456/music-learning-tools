/**
 * Controller Adapters
 *
 * Bridges between the lesson-templates controller interfaces and
 * the singing-trainer-ui stores/services. These adapters allow
 * lessons to control the app without knowing implementation details.
 */

import type {
  GridController,
  GridOverlay,
  GridLabelMode,
  AudioController,
  UiController,
  UiOverlay,
  LessonContext,
  AvatarSpeakOptions,
  AvatarExpression,
} from '@mlt/lesson-templates';

import {
  createTalkingAvatarController,
  defaultAvatarAssets,
  type TalkingAvatarController,
} from '@mlt/talking-avatar';

import { appState, type TonicNote } from '../stores/appState.svelte.js';
import { resultsState } from '../stores/resultsState.svelte.js';
import { preferencesStore } from '../stores/preferencesStore.svelte.js';
import * as droneAudio from '../services/droneAudio.js';
import { referenceAudio } from '../services/referenceAudio.js';
import * as pitchDetection from '../services/pitchDetection.js';

// ============================================================================
// Grid Controller Adapter
// ============================================================================

// Store overlays separately (the grid doesn't natively support overlays yet)
let currentOverlays: GridOverlay[] = [];

/**
 * Create a GridController adapter that controls the pitch grid
 * through appState.
 */
export function createGridControllerAdapter(): GridController {
  return {
    setPitchRange(minMidi: number, maxMidi: number): void {
      appState.setYAxisRange({ minMidi, maxMidi });
    },

    getRange(): { minMidi: number; maxMidi: number } {
      return { ...appState.state.yAxisRange };
    },

    setOverlays(overlays: GridOverlay[]): void {
      currentOverlays = [...overlays];
      // TODO: Wire to actual grid overlay system when implemented
      console.log('[GridController] setOverlays:', overlays.length);
    },

    addOverlay(overlay: GridOverlay): void {
      currentOverlays.push(overlay);
      // TODO: Wire to actual grid overlay system when implemented
      console.log('[GridController] addOverlay:', overlay.id);
    },

    removeOverlay(id: string): void {
      currentOverlays = currentOverlays.filter((o) => o.id !== id);
      // TODO: Wire to actual grid overlay system when implemented
      console.log('[GridController] removeOverlay:', id);
    },

    clearOverlays(): void {
      currentOverlays = [];
      // TODO: Wire to actual grid overlay system when implemented
      console.log('[GridController] clearOverlays');
    },

    setLabelMode(mode: GridLabelMode): void {
      // Map to existing appState properties
      switch (mode) {
        case 'notes':
          appState.setUseDegrees(false);
          break;
        case 'degrees':
          appState.setUseDegrees(true);
          break;
        case 'none':
          // No direct equivalent yet
          break;
      }
    },

    setPitchHighlightEnabled(enabled: boolean): void {
      appState.setPitchHighlightEnabled(enabled);
    },
  };
}

// ============================================================================
// Audio Controller Adapter
// ============================================================================

let currentTempo = 108;

/**
 * Create an AudioController adapter that controls audio services.
 */
export function createAudioControllerAdapter(): AudioController {
  return {
    setDroneOn(on: boolean): void {
      const dronePlaying = droneAudio.isDronePlaying();
      if (on && !dronePlaying) {
        void droneAudio.startDrone();
      } else if (!on && dronePlaying) {
        droneAudio.stopDrone();
      }
    },

    setDronePitch(tonic: string, octave: number): void {
      appState.setTonic(tonic as TonicNote);
      appState.setDroneOctave(octave);
      if (droneAudio.isDronePlaying()) {
        droneAudio.updateDrone();
      }
    },

    setDroneVolume(db: number): void {
      appState.setDroneVolume(db);
      droneAudio.setDroneVolume(db);
    },

    setMetronomeOn(on: boolean): void {
      // Metronome not yet implemented
      console.log('[AudioController] setMetronomeOn:', on);
    },

    setTempo(bpm: number): void {
      currentTempo = bpm;
      // Tempo is passed to exercises, not stored globally
      console.log('[AudioController] setTempo:', bpm);
    },

    setReferenceVolume(db: number): void {
      referenceAudio.setVolume(db);
    },

    async playReferenceTone(midi: number, durationMs: number): Promise<void> {
      await referenceAudio.init();
      referenceAudio.playTone(midi, durationMs);
    },

    scheduleReferenceTones(
      tones: Array<{ midi: number; startTimeMs: number; endTimeMs: number }>
    ): void {
      // Convert to the format expected by referenceAudio
      const notes = tones.map((t) => ({
        midi: t.midi,
        startTimeMs: t.startTimeMs,
        durationMs: Math.max(0, t.endTimeMs - t.startTimeMs),
      }));
      referenceAudio.scheduleReferenceTones(notes);
    },
    stopAll(): void {
      referenceAudio.stop();
      if (droneAudio.isDronePlaying()) {
        droneAudio.stopDrone();
      }
    },

    async startDetection(): Promise<void> {
      await pitchDetection.startDetection();
      appState.setDetecting(true);
    },

    stopDetection(): void {
      pitchDetection.stopDetection();
      appState.setDetecting(false);
    },
  };
}

// ============================================================================
// UI Controller Adapter
// ============================================================================

// Track active instruction overlay
let activeInstruction: { message: string; title?: string } | null = null;
let instructionTimeoutId: ReturnType<typeof setTimeout> | null = null;

// Track active overlays
const activeOverlays = new Map<string, UiOverlay>();

// Avatar instance (lazily created when mounted)
let avatar: TalkingAvatarController | null = null;

function getSafeSpeakOptions(options?: AvatarSpeakOptions): { lang?: string; rate?: number } {
  const speakOptions: { lang?: string; rate?: number } = {};
  if (typeof options?.lang === 'string' && options.lang.trim().length > 0) {
    speakOptions.lang = options.lang;
  }
  if (typeof options?.rate === 'number' && Number.isFinite(options.rate)) {
    speakOptions.rate = options.rate;
  }
  return speakOptions;
}

/**
 * Create a UiController adapter that controls UI overlays and modals.
 */
export function createUiControllerAdapter(): UiController {
  return {
    showInstruction(
      message: string,
      options?: { title?: string; dismissAfterMs?: number }
    ): void {
      activeInstruction = { message, title: options?.title };
      console.log('[UiController] showInstruction:', message);

      // Auto-dismiss if specified
      if (options?.dismissAfterMs) {
        if (instructionTimeoutId) {
          clearTimeout(instructionTimeoutId);
        }
        instructionTimeoutId = setTimeout(() => {
          this.hideInstruction();
        }, options.dismissAfterMs);
      }
    },

    hideInstruction(): void {
      activeInstruction = null;
      if (instructionTimeoutId) {
        clearTimeout(instructionTimeoutId);
        instructionTimeoutId = null;
      }
      console.log('[UiController] hideInstruction');
    },

    showOverlay(overlay: UiOverlay): void {
      activeOverlays.set(overlay.id, overlay);
      console.log('[UiController] showOverlay:', overlay.id);

      // Auto-dismiss if specified
      if (overlay.dismissAfterMs) {
        setTimeout(() => {
          this.hideOverlay(overlay.id);
        }, overlay.dismissAfterMs);
      }
    },

    hideOverlay(id: string): void {
      activeOverlays.delete(id);
      console.log('[UiController] hideOverlay:', id);
    },

    hideAllOverlays(): void {
      activeOverlays.clear();
      console.log('[UiController] hideAllOverlays');
    },

    showResults(summary: unknown): void {
      // Cast to ResultsSummary and show
      resultsState.show(summary as any, {
        title: 'Exercise Results',
        source: 'exercise',
      });
    },

    hideResults(): void {
      resultsState.hide();
    },

    // =========================================================================
    // Avatar Methods
    // =========================================================================

    async mountAvatar(container: HTMLElement): Promise<void> {
      if (avatar) {
        console.log('[UiController] Avatar already mounted');
        return;
      }

      avatar = createTalkingAvatarController({
        assets: defaultAvatarAssets,
        mount: container,
      });
      console.log('[UiController] Avatar mounted');
    },

    async showAvatar(): Promise<void> {
      if (!avatar) {
        console.warn('[UiController] Cannot show avatar - not mounted');
        return;
      }
      await avatar.enter();
      console.log('[UiController] Avatar shown');
    },

    hideAvatar(): void {
      if (avatar) {
        avatar.setVisible(false);
        console.log('[UiController] Avatar hidden');
      }
    },

    async speakInstruction(message: string, options?: AvatarSpeakOptions): Promise<void> {
      const controller = avatar;
      if (!controller) {
        console.warn('[UiController] Cannot speak - avatar not mounted');
        return;
      }

      // Set expression before speaking
      if (options?.expression === 'feedback_bad') {
        controller.setFeedbackBad(true);
      } else {
        controller.setFeedbackBad(false);
      }

      try {
        await controller.speak(message, getSafeSpeakOptions(options));
      } catch (error) {
        console.warn('[UiController] Avatar speakInstruction failed:', error);
      } finally {
        try {
          controller.setFeedbackBad(false);
        } catch {
          // Avatar may be disposed during async speech; ignore cleanup errors.
        }
      }
    },

    cancelSpeech(): void {
      if (avatar) {
        avatar.cancel();
        console.log('[UiController] Avatar speech cancelled');
      }
    },

    setAvatarFeedback(state: AvatarExpression): void {
      if (!avatar) return;
      avatar.setFeedbackBad(state === 'feedback_bad');
    },

    disposeAvatar(): void {
      if (avatar) {
        avatar.cancel();
        avatar.dispose();
        avatar = null;
        console.log('[UiController] Avatar disposed');
      }
    },
  };
}

// ============================================================================
// Lesson Context Factory
// ============================================================================

/**
 * Create a complete LessonContext for use by the lesson engine.
 */
export function createLessonContext(): LessonContext {
  return {
    grid: createGridControllerAdapter(),
    audio: createAudioControllerAdapter(),
    ui: createUiControllerAdapter(),
    speakingPitchMidi: preferencesStore.speakingPitchMidi,
    speakingPitchNoteName: preferencesStore.speakingPitchNoteName,
  };
}

// ============================================================================
// Getters for current state (for debugging/testing)
// ============================================================================

export function getCurrentOverlays(): GridOverlay[] {
  return [...currentOverlays];
}

export function getCurrentInstruction(): { message: string; title?: string } | null {
  return activeInstruction;
}

export function getActiveOverlays(): UiOverlay[] {
  return Array.from(activeOverlays.values());
}

// ============================================================================
// Avatar Lifecycle Helpers
// ============================================================================

/**
 * Mount and show the lesson avatar.
 * Call this when a lesson starts.
 *
 * @param containerId - The DOM element ID to mount the avatar into (default: 'lesson-avatar-mount')
 */
export async function mountAndShowLessonAvatar(
  containerId: string = 'lesson-avatar-mount'
): Promise<void> {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`[Avatar] Container #${containerId} not found`);
    return;
  }

  // Create avatar if not already created
  if (!avatar) {
    avatar = createTalkingAvatarController({
      assets: defaultAvatarAssets,
      mount: container,
    });
    console.log('[Avatar] Created and mounted');
  }

  // Show with enter animation
  await avatar.enter();
  console.log('[Avatar] Shown');
}

/**
 * Dispose the lesson avatar.
 * Call this when a lesson stops.
 */
export function disposeLessonAvatar(): void {
  if (avatar) {
    avatar.cancel();
    avatar.dispose();
    avatar = null;
    console.log('[Avatar] Disposed');
  }
}

/**
 * Speak through the mounted lesson avatar, if available.
 */
export async function speakWithLessonAvatar(
  message: string,
  options?: AvatarSpeakOptions
): Promise<void> {
  const controller = avatar;
  if (!controller) return;

  if (options?.expression === 'feedback_bad') {
    controller.setFeedbackBad(true);
  } else {
    controller.setFeedbackBad(false);
  }

  try {
    await controller.speak(message, getSafeSpeakOptions(options));
  } catch (error) {
    console.warn('[Avatar] speak failed:', error);
  } finally {
    try {
      controller.setFeedbackBad(false);
    } catch {
      // Avatar may be disposed during async speech; ignore cleanup errors.
    }
  }
}

/**
 * Cancel current lesson-avatar speech, if any.
 */
export function cancelLessonAvatarSpeech(): void {
  avatar?.cancel();
}

/**
 * Get the current avatar instance (for direct access if needed).
 */
export function getLessonAvatar(): TalkingAvatarController | null {
  return avatar;
}
