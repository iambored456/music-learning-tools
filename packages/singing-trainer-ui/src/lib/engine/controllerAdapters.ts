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
} from '@mlt/lesson-templates';

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
      if (on && !appState.state.drone.isPlaying) {
        droneAudio.startDrone();
      } else if (!on && appState.state.drone.isPlaying) {
        droneAudio.stopDrone();
      }
    },

    setDronePitch(tonic: string, octave: number): void {
      appState.setTonic(tonic as TonicNote);
      appState.setDroneOctave(octave);
      if (appState.state.drone.isPlaying) {
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
      const notes = tones.map((t, i) => ({
        id: `ref-${i}`,
        midi: t.midi,
        startTimeMs: t.startTimeMs,
        endTimeMs: t.endTimeMs,
        lyric: '👂',
      }));
      referenceAudio.scheduleReferenceTones(notes);
    },

    stopAll(): void {
      referenceAudio.stop();
      if (appState.state.drone.isPlaying) {
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
        source: 'demo',
      });
    },

    hideResults(): void {
      resultsState.hide();
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
