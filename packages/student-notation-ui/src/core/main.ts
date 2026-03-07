// js/main.ts

/**
 * DEBUGGING WITH LOGGER:
 *
 * By default, all logging is OFF except errors. To enable logging for debugging:
 *
 * In browser console:
 * - logger.enable('category') - Enable specific categories
 * - logger.enableAll() - Enable all logging
 * - logger.setLevel('DEBUG') - Enable all debug logs
 *
 * Categories: general, state, canvas, audio, ui, layout, harmony,
 *            performance, initialization, transport, grid, toolbar, zoom,
 *            scroll, keyboard, mouse, adsr, filter, waveform, debug
 *
 * Examples:
 * - logger.enable('state') - See state changes
 * - logger.enable('audio', 'transport') - See audio/transport logs
 * - logger.enable('ui', 'grid') - See UI interactions and grid events
 */
import * as Tone from 'tone';
import { configureAudioContext } from '@mlt/student-notation-engine';
import store, { fullRowData, registerColumnMapCallbacks } from '@state/initStore.ts';
import LayoutService from '@services/layoutService.ts';
import PitchGridController from '@components/canvas/PitchGrid/pitchGrid.ts';
import SynthEngine from '@services/initAudio.ts';
import TransportService from '@services/initTransport.ts';
import pitchGridViewportService from '@services/pitchGridViewportService.ts';
import { initDeviceProfileService } from '@services/deviceProfileService.ts';
import domCache from '@services/domCache.ts';
import logger from '@utils/logger.ts';
import { PRESETS } from '@services/presetData.ts';
import loadingManager from './loadingManager.ts';
import { enableStateMutationDetection, snapshotState, checkForMutations } from '@utils/stateMutationGuard.ts';
// NOTE: effectsController.js handles UI dials and lives in @components/audio/Effects/
// All effects logic has been moved to @services/timbreEffects/ architecture

import rhythmPlaybackService from '@services/rhythmPlaybackService.ts';
import columnMapService, { registerStoreHooks as registerColumnMapHooks } from '@services/columnMapService.ts';
import { registerStoreHooks as registerPixelMapHooks } from '@services/pixelMapService.ts';



// Zoom System Components


// Modulation Testing (keep for advanced debugging)
import ModulationTest from '@/rhythm/modulationTest.js';
import { initAudioComponents } from '@/bootstrap/audio/initAudioComponents.ts';
import { initCanvasServices } from '@/bootstrap/canvas/initCanvasServices.ts';
import { initDrawSystem } from '@/bootstrap/draw/initDrawSystem.ts';
import { initInputAndDiagnostics } from '@/bootstrap/input/initInputAndDiagnostics.ts';
import toolbar from '@components/toolbar/toolbar.ts';
import { mountSvelteComponents, unmountSvelteComponents } from '@/svelte-ui/index.ts';
import rhythmUI from '@components/canvas/macrobeatTools/rhythmUI.js';
import sixteenthStampsToolbar from '@components/rhythm/stampToolbars/sixteenthStampsToolbar.js';
import tripletStampsToolbar from '@components/rhythm/stampToolbars/tripletStampsToolbar.js';
import sixteenthThreeStampsToolbar from '@components/rhythm/stampToolbars/sixteenthThreeStampsToolbar.js';

interface ComponentReadiness {
  domCache: boolean;
  layoutService: boolean;
  canvasContextService: boolean;
  synthEngine: boolean;
  transportService: boolean;
  scrollSync: boolean;
  uiComponents: boolean;
  audioComponents: boolean;
  rhythmPlaybackService?: boolean;
  initialized: boolean;
}

declare global {
  interface Window {
    initAudio?: () => Promise<void>;
    initStartTime?: number;
    ModulationTest?: typeof ModulationTest;
    TONE_DEBUG_CLASS?: string;
  }
}

const disableToneClassDebugLogging = (): void => {
  if (typeof window === 'undefined') {return;}
  // Tone logs class-level debug traces when TONE_DEBUG_CLASS matches a Tone class name.
  // Clearing this prevents noisy triggerAttack/triggerRelease console output.
  window.TONE_DEBUG_CLASS = undefined;
};

disableToneClassDebugLogging();

const shouldInitDebug = (): boolean => {
  if (typeof window === 'undefined') {return false;}
  const override = (window as Window & { __initDebug?: boolean }).__initDebug;
  return override === true;
};

const initT0 = performance.now();
const initDebug = (message: string, data?: unknown): void => {
  if (!shouldInitDebug()) {return;}
  const elapsed = `+${(performance.now() - initT0).toFixed(0)}ms`;
  if (data === undefined) {
    console.log(`[Init] ${elapsed} ${message}`);
    return;
  }
  console.log(`[Init] ${elapsed} ${message}`, data);
};


let isInitialized = false;
let cleanupFns: Array<() => void> = [];
let audioInitialized = false;
let audioInitPromise: Promise<void> | null = null;
let userInteractionReceived = false;

const STARTUP_PRESET_BY_COLOR: Record<string, string> = {
  '#4a90e2': 'sine',
  '#2d2d2d': 'triangle',
  '#d66573': 'square',
  '#68a03f': 'sawtooth'
};

function applyStartupVoicePresets(): void {
  if (typeof store.applyPreset !== 'function') {
    return;
  }

  const applied: Record<string, string> = {};
  const voiceColors = Object.keys(store.state.timbres ?? {});
  voiceColors.forEach((color) => {
    const presetName = STARTUP_PRESET_BY_COLOR[color] ?? 'sine';
    const preset = (PRESETS as Record<string, unknown>)[presetName];
    if (!preset) {
      return;
    }
    store.applyPreset(color, preset as any);
    applied[color] = presetName;
  });

  logger.info('Main.js', 'Startup voice presets activated', {
    voiceCount: voiceColors.length,
    mapping: applied
  });
}

function setupAudioHandlers(): void {
  audioInitialized = false;
  audioInitPromise = null;
  userInteractionReceived = false;

  window.initAudio = async (): Promise<void> => {
    if (audioInitialized) {return;}
    if (audioInitPromise) {return audioInitPromise;} // Return existing promise to prevent multiple attempts

    audioInitPromise = (async () => {
      try {
        // Only start if the context is not already running
        if (Tone.context.state !== 'running') {
          await Tone.start();
          logger.info('Main.js', 'AudioContext started successfully');
        }
        audioInitialized = true;
      } catch (e) {
        logger.error('Main.js', 'Could not start AudioContext', e);
        audioInitPromise = null; // Reset promise on failure so it can be retried
        throw e;
      }
    })();

    return audioInitPromise;
  };

  const initAudioOnInteraction = (): void => {
    if (!userInteractionReceived) {
      userInteractionReceived = true;
      window.initAudio?.().catch(e => logger.warn('Main.js', 'Failed to initialize audio after user interaction', e, 'initialization'));
      // Remove listeners after first interaction
      document.removeEventListener('click', initAudioOnInteraction, true);
      document.removeEventListener('keydown', initAudioOnInteraction, true);
      document.removeEventListener('touchstart', initAudioOnInteraction, true);
    }
  };

  const handleBeforeUnload = () => {
    if (typeof SynthEngine.teardown === 'function') {
      SynthEngine.teardown();
    }
  };

  document.addEventListener('click', initAudioOnInteraction, true);
  document.addEventListener('keydown', initAudioOnInteraction, true);
  document.addEventListener('touchstart', initAudioOnInteraction, true);
  window.addEventListener('beforeunload', handleBeforeUnload);

  cleanupFns.push(() => document.removeEventListener('click', initAudioOnInteraction, true));
  cleanupFns.push(() => document.removeEventListener('keydown', initAudioOnInteraction, true));
  cleanupFns.push(() => document.removeEventListener('touchstart', initAudioOnInteraction, true));
  cleanupFns.push(() => window.removeEventListener('beforeunload', handleBeforeUnload));
  cleanupFns.push(() => {
    delete window.initAudio;
  });
}

// ? Component readiness tracking for initialization order safeguards
const componentReadiness: ComponentReadiness = {
  domCache: false,
  layoutService: false,
  canvasContextService: false,
  synthEngine: false,
  transportService: false,
  scrollSync: false,
  uiComponents: false,
  audioComponents: false,
  rhythmPlaybackService: false,
  initialized: false
};

const TREBLE_CLEF_PRESET_TONES = {
  // Matches the Treble preset in `src/components/clefWheels/clefRangeController.ts`.
  top: 'G5',
  // This is a Tone.js/SPN note name (matches `PitchRowData.toneNote` in `src/state/pitchData.ts`).
  // Note: This preset intentionally does not include the visual-only boundary rows at the ends of the full gamut.
  bottom: 'C4'
};

interface TonePreset { top: string | null; bottom: string | null }

function resolveRangeFromToneNotes(preset: TonePreset | null | undefined) {
  if (!preset?.top || !preset?.bottom) {
    return null;
  }

  const topIndex = fullRowData.findIndex(row => row.toneNote === preset.top);
  const bottomIndex = fullRowData.findIndex(row => row.toneNote === preset.bottom);

  if (topIndex === -1 || bottomIndex === -1) {
    logger.warn('Main.js', 'Failed to resolve preset range from tone notes', preset);
    return null;
  }

  return {
    topIndex: Math.min(topIndex, bottomIndex),
    bottomIndex: Math.max(topIndex, bottomIndex)
  };
}

function getTrebleClefPresetRange() {
  return resolveRangeFromToneNotes(TREBLE_CLEF_PRESET_TONES);
}

function isFullGamutRange(range: { topIndex?: number; bottomIndex?: number } | null | undefined): boolean {
  if (!range) {
    return true;
  }
  const maxIndex = Math.max(0, fullRowData.length - 1);
  const topIndex = typeof range.topIndex === 'number' ? range.topIndex : 0;
  const bottomIndex = typeof range.bottomIndex === 'number' ? range.bottomIndex : maxIndex;
  return topIndex <= 0 && bottomIndex >= maxIndex;
}

function markComponentReady(componentName: keyof ComponentReadiness) {
  componentReadiness[componentName] = true;
  // Component ready
}

function waitForComponent(componentName: keyof ComponentReadiness, timeout = 5000) {
  return new Promise<void>((resolve, reject) => {
    if (componentReadiness[componentName]) {
      resolve();
      return;
    }

    const startTime = Date.now();
    const checkReady = () => {
      if (componentReadiness[componentName]) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Component ${componentName} not ready within ${timeout}ms`));
      } else {
        setTimeout(checkReady, 50);
      }
    };
    checkReady();
  });
}

function resetComponentReadiness(): void {
  (Object.keys(componentReadiness) as Array<keyof ComponentReadiness>).forEach((key) => {
    componentReadiness[key] = false;
  });
}

async function startStudentNotation(): Promise<void> {
  window.initStartTime = Date.now();
  logger.info('Main.js', 'Initialization triggered');
  logger.section('STARTING INITIALIZATION');
  // Starting initialization sequence
  // Weighted loading tasks — heavier phases get higher weight so the progress
  // bar advances in proportion to actual work done.
  const loadingPhases: Array<[name: string, weight: number]> = [
    // Pre-JS loading phase — immediately completed to claim credit for Stage 1 animation
    ['loading-scripts',       8],  // 8/50 ≈ 16%, always ahead of Stage 1 asymptote (~14%)
    // Setup
    ['detect-device',         1],
    ['configure-audio-ctx',   1],
    ['dom-cache',             1],
    // Core state
    ['voice-presets',         1],
    ['pitch-range',           1],
    // Canvas & layout
    ['canvas-contexts',       1],
    ['grid-manager',          1],
    ['layout-ready',          2],  // frame-wait
    // Audio engine
    ['audio-chain',           2],
    ['synth-voices',          2],
    ['audio-events',          1],
    // Playback
    ['rhythm-playback',       1],
    ['transport-service',     1],
    // Input & state wiring
    ['input-handlers',        1],
    ['column-map-hooks',      1],
    ['pixel-map-hooks',       1],
    // UI mounting
    ['mount-toolbar',         1],
    ['mount-svelte',          2],
    // Audio components (heaviest)
    ['mount-envelope',        2],
    ['harmonic-bins',         2],
    ['mount-filters',         2],
    ['waveform-display',      1],
    ['effects-system',        3],
    ['effects-controls',      2],
    // State subscriptions & rhythm
    ['rhythm-tools',          1],
    ['stamp-toolbars',        1],
    ['draw-tools',            1],
    // Render & finalize
    ['initial-render',        2],
    ['finalize',              1],
  ];

  try {
    initDebug('loadingManager.init()');
    // Stop Stage 1 progress animation (inline script from index.html) before taking over
    if (typeof (window as Window & { __clearStage1Progress?: () => void }).__clearStage1Progress === 'function') {
      (window as Window & { __clearStage1Progress?: () => void }).__clearStage1Progress!();
      delete (window as Window & { __clearStage1Progress?: () => void }).__clearStage1Progress;
    }
    loadingManager.init();
    loadingManager.updateStatus('Loading application...');
    loadingPhases.forEach(([name, weight]) => loadingManager.registerTask(name, weight));
    initDebug(`registered ${loadingPhases.length} loading phases (total weight ${loadingPhases.reduce((s, [, w]) => s + w, 0)})`);
    // Immediately claim credit for the pre-JS loading phase so the bar advances past Stage 1
    loadingManager.completeTask('loading-scripts');
    initDebug('startup rhythm defaults', {
      macrobeatGroupings: store.state.macrobeatGroupings,
      macrobeatBoundaryStyles: store.state.macrobeatBoundaryStyles
    });
    const startupColor = store.state.selectedNote?.color ?? null;
    const startupTimbre = startupColor ? store.state.timbres?.[startupColor] : null;
    initDebug('startup adsr defaults', {
      color: startupColor,
      adsr: startupTimbre?.adsr ?? null,
      preset: startupTimbre?.activePresetName ?? null
    });
    // Yield so the browser paints the progress advance before synchronous work begins
    await loadingManager.nextFrame();

    // ── Setup ──────────────────────────────────────────────
    initDebug('phase:detect-device START');
    loadingManager.updateStatus('Detecting device...');
    await loadingManager.nextFrame();
    initDeviceProfileService();
    loadingManager.completeTask('detect-device');
    initDebug('phase:detect-device DONE');

    initDebug('phase:configure-audio-ctx START');
    loadingManager.updateStatus('Configuring audio context...');
    await loadingManager.nextFrame();
    configureAudioContext({ latencyHint: 'playback', lookAhead: 0.1 });
    logger.info('Main.js', 'AudioContext configured with latencyHint: playback');
    loadingManager.completeTask('configure-audio-ctx');
    initDebug('phase:configure-audio-ctx DONE');

    // Enable state mutation detection in development mode
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      enableStateMutationDetection();
    }

    initDebug('phase:dom-cache START');
    loadingManager.updateStatus('Caching DOM elements...');
    await loadingManager.nextFrame();
    domCache.init();
    markComponentReady('domCache');
    loadingManager.completeTask('dom-cache');
    initDebug('phase:dom-cache DONE');
    await loadingManager.nextFrame();

    // Network fetch — can block

    // Setup user gesture handlers for audio initialization
    const setupAudioGesture = () => {
      const appContainer = domCache.get('appContainer') || document.getElementById('app-container');
      if (appContainer) {
        const events: ('click' | 'keydown' | 'touchstart')[] = ['click', 'keydown', 'touchstart'];
        const handleGesture = () => {
          void window.initAudio?.();
        };
        events.forEach(eventType => {
          appContainer.addEventListener(eventType, handleGesture, { once: true });
        });
      }
    };
    setupAudioGesture();

    // ── Core state ─────────────────────────────────────────
    initDebug('phase:voice-presets START');
    loadingManager.updateStatus('Activating voice presets...');
    await loadingManager.nextFrame();
    applyStartupVoicePresets();
    snapshotState(store.state);
    loadingManager.completeTask('voice-presets');
    initDebug('phase:voice-presets DONE');

    initDebug('phase:pitch-range START');
    loadingManager.updateStatus('Resolving pitch range...');
    await loadingManager.nextFrame();
    const treblePresetRange = getTrebleClefPresetRange();
    const fullGamutFallback = {
      topIndex: 0,
      bottomIndex: fullRowData.length - 1
    };
    const preferredPitchRange = isFullGamutRange(store.state.pitchRange)
      ? (treblePresetRange ?? store.state.pitchRange ?? fullGamutFallback)
      : (store.state.pitchRange ?? fullGamutFallback);
    const initialPitchRange = preferredPitchRange;
    const clampedTop =
        Math.max(0, Math.min(fullRowData.length - 1, initialPitchRange.topIndex ?? 0));
    const clampedBottom =
        Math.max(clampedTop, Math.min(fullRowData.length - 1, initialPitchRange.bottomIndex ?? (fullRowData.length - 1)));
    store.state.pitchRange = { topIndex: clampedTop, bottomIndex: clampedBottom };
    store.state.fullRowData = [...fullRowData];
    loadingManager.completeTask('pitch-range');
    initDebug('phase:pitch-range DONE');
    await loadingManager.nextFrame();

    // ── Canvas & layout ────────────────────────────────────
    initDebug('phase:canvas-contexts START');
    loadingManager.updateStatus('Resolving canvas contexts...');
    await loadingManager.nextFrame();
    initCanvasServices();
    markComponentReady('layoutService');
    markComponentReady('canvasContextService');
    loadingManager.completeTask('canvas-contexts');
    initDebug('phase:canvas-contexts DONE');

    initDebug('phase:grid-manager START');
    loadingManager.updateStatus('Initializing grid manager...');
    await loadingManager.nextFrame();
    loadingManager.completeTask('grid-manager');
    initDebug('phase:grid-manager DONE');
    await loadingManager.nextFrame();

    initDebug('phase:layout-ready START (awaiting LayoutService.waitForInitialLayout)');
    loadingManager.updateStatus('Calculating layout dimensions...');
    await LayoutService.waitForInitialLayout();
    loadingManager.completeTask('layout-ready');
    initDebug('phase:layout-ready DONE');
    await loadingManager.nextFrame();

    // ── Audio engine ───────────────────────────────────────
    initDebug('phase:audio-chain START');
    loadingManager.updateStatus('Building audio signal chain...');
    await loadingManager.nextFrame();
    SynthEngine.init();
    markComponentReady('synthEngine');
    loadingManager.completeTask('audio-chain');
    initDebug('phase:audio-chain DONE');

    initDebug('phase:synth-voices START');
    loadingManager.updateStatus('Initializing synth voices...');
    await loadingManager.nextFrame();
    loadingManager.completeTask('synth-voices');
    initDebug('phase:synth-voices DONE');

    initDebug('phase:audio-events START');
    loadingManager.updateStatus('Wiring audio event handlers...');
    await loadingManager.nextFrame();
    loadingManager.completeTask('audio-events');
    initDebug('phase:audio-events DONE');
    await loadingManager.nextFrame();

    // ── Playback ───────────────────────────────────────────
    initDebug('phase:rhythm-playback START');
    loadingManager.updateStatus('Preparing rhythm playback...');
    await loadingManager.nextFrame();
    rhythmPlaybackService.initialize().catch(err => {
      logger.warn('Main.js', 'RhythmPlaybackService initialization deferred (needs user interaction)', err, 'initialization');
    });
    markComponentReady('rhythmPlaybackService');
    loadingManager.completeTask('rhythm-playback');
    initDebug('phase:rhythm-playback DONE');

    initDebug('phase:transport-service START');
    loadingManager.updateStatus('Configuring transport scheduler...');
    await loadingManager.nextFrame();
    TransportService.init();
    markComponentReady('transportService');
    loadingManager.completeTask('transport-service');
    initDebug('phase:transport-service DONE');
    await loadingManager.nextFrame();

    // ── Input & state wiring ───────────────────────────────
    initDebug('phase:input-handlers START');
    loadingManager.updateStatus('Registering keyboard handlers...');
    await loadingManager.nextFrame();
    initInputAndDiagnostics();
    loadingManager.completeTask('input-handlers');
    initDebug('phase:input-handlers DONE');

    initDebug('phase:column-map-hooks START');
    loadingManager.updateStatus('Syncing column map service...');
    await loadingManager.nextFrame();
    registerColumnMapHooks(store);
    registerColumnMapCallbacks({
      getColumnMap: (state) => columnMapService.getColumnMap(state),
      visualToTimeIndex: (state, visualIndex) => {
        const map = columnMapService.getColumnMap(state);
        return map.visualToTime.get(visualIndex) ?? null;
      },
      timeIndexToVisualColumn: (state, timeIndex) => {
        const map = columnMapService.getColumnMap(state);
        return map.timeToVisual.get(timeIndex) ?? null;
      },
      getTimeBoundaryAfterMacrobeat: (state, index) => {
        const map = columnMapService.getColumnMap(state);
        const boundary = map.macrobeatBoundaries.find(b => b.macrobeatIndex === index);
        return boundary ? boundary.timeColumn + 1 : 0;
      }
    });
    loadingManager.completeTask('column-map-hooks');
    initDebug('phase:column-map-hooks DONE');

    initDebug('phase:pixel-map-hooks START');
    loadingManager.updateStatus('Syncing pixel map service...');
    await loadingManager.nextFrame();
    registerPixelMapHooks(store);
    loadingManager.completeTask('pixel-map-hooks');
    initDebug('phase:pixel-map-hooks DONE');
    await loadingManager.nextFrame();

    // ── UI mounting ────────────────────────────────────────
    initDebug('phase:mount-toolbar START');
    loadingManager.updateStatus('Preparing toolbar...');
    await loadingManager.nextFrame();
    toolbar.init();
    loadingManager.completeTask('mount-toolbar');
    initDebug('phase:mount-toolbar DONE');

    initDebug('phase:mount-svelte START');
    loadingManager.updateStatus('Mounting interface components...');
    await loadingManager.nextFrame();
    mountSvelteComponents();
    markComponentReady('uiComponents');
    loadingManager.completeTask('mount-svelte');
    initDebug('phase:mount-svelte DONE');
    await loadingManager.nextFrame();

    // ── Audio components (heaviest section) ────────────────
    await waitForComponent('uiComponents');

    initDebug('phase:audio-components START');
    loadingManager.updateStatus('Mounting envelope editor...');
    await loadingManager.nextFrame();
    initAudioComponents({
      onStep: (status) => {
        loadingManager.updateStatus(status);
      }
    });
    loadingManager.completeTask('mount-envelope');
    initDebug('phase:mount-envelope DONE');
    await loadingManager.nextFrame();

    loadingManager.completeTask('harmonic-bins');
    initDebug('phase:harmonic-bins DONE');
    await loadingManager.nextFrame();

    loadingManager.completeTask('mount-filters');
    initDebug('phase:mount-filters DONE');
    await loadingManager.nextFrame();

    loadingManager.completeTask('waveform-display');
    initDebug('phase:waveform-display DONE');
    await loadingManager.nextFrame();

    loadingManager.completeTask('effects-system');
    initDebug('phase:effects-system DONE');
    await loadingManager.nextFrame();

    markComponentReady('audioComponents');
    loadingManager.completeTask('effects-controls');
    initDebug('phase:effects-controls DONE');
    await loadingManager.nextFrame();

    // Check for unauthorized state mutations after audio components
    checkForMutations(store.state, 'audio-components-initialization');

    // ── State subscriptions & rhythm ───────────────────────
    initDebug('phase:rhythm-tools START');
    loadingManager.updateStatus('Initializing rhythm tools...');
    rhythmUI.init();
    void (rhythmPlaybackService.initialize?.() ?? rhythmPlaybackService.init?.());
    loadingManager.completeTask('rhythm-tools');
    initDebug('phase:rhythm-tools DONE');

    initDebug('phase:stamp-toolbars START');
    loadingManager.updateStatus('Loading stamp toolbars...');
    sixteenthStampsToolbar.init();
    sixteenthThreeStampsToolbar.init();
    tripletStampsToolbar.init();
    loadingManager.completeTask('stamp-toolbars');
    initDebug('phase:stamp-toolbars DONE');

    initDebug('phase:draw-tools START');
    loadingManager.updateStatus('Initializing draw tools...');
    initDrawSystem();
    await waitForComponent('audioComponents');
    const renderAll = () => {
      try {
        PitchGridController.render();
        const DrumGridController = (window as any).DrumGridController;
        if (DrumGridController?.render) {
          DrumGridController.render();
        }
        logger.debug('Main', 'renderAll invoked', null, 'grid');
      } catch (err) {
        logger.error('Main', 'renderAll failed', err, 'grid');
      }
    };
    loadingManager.completeTask('draw-tools');
    initDebug('phase:draw-tools DONE');
    await loadingManager.nextFrame();

    // ── Render & finalize ──────────────────────────────────
    initDebug('phase:initial-render START');
    loadingManager.updateStatus('Rendering workspace...');
    store.setSelectedTool('note');
    store.setSelectedNote('circle', '#4a90e2');
    renderAll();
    PitchGridController.renderMacrobeatTools();
    loadingManager.completeTask('initial-render');
    initDebug('phase:initial-render DONE');
    await loadingManager.nextFrame();

    initDebug('phase:finalize START');
    markComponentReady('initialized');
    loadingManager.updateStatus('Ready!');
    loadingManager.completeTask('finalize');
    initDebug('phase:finalize DONE');
    await loadingManager.nextFrame();

    if (store.isColdStart) {
      const treblePresetRange = getTrebleClefPresetRange();
      if (!treblePresetRange) {
        logger.warn('Main.js', 'Treble Clef preset range could not be resolved during cold start');
      } else {
        const currentRange = store.state.pitchRange;
        const alreadyTreble = currentRange
          && currentRange.topIndex === treblePresetRange.topIndex
          && currentRange.bottomIndex === treblePresetRange.bottomIndex;
        if (!alreadyTreble) {
          pitchGridViewportService.setPitchViewportRange(treblePresetRange, { animateMs: 0, source: 'coldStart:treble' });
        }
      }
    }

    initDebug('all phases complete — removing loading screen');
    await loadingManager.complete();
    initDebug('loading screen removed — app ready');
    // Kick off local drum sample loading AFTER the loading screen is gone.
    // Calling this earlier (at module-eval time) triggers a Vite dev-server full-reload.

    // Initialize modulation testing (keep for advanced debugging)
    window.ModulationTest = ModulationTest;

    // Log viewport info after initialization (currently disabled)
    // setTimeout(() => {
    //   if (pitchGridViewportService.getViewportInfo) {
    //     // TODO: Log viewport info
    //   }
    // }, 1000);

  } catch (error) {
    logger.error('Main.js', 'Initialization failed', error, 'initialization');
    logger.error('Main.js', 'Component readiness snapshot at failure', { ...componentReadiness }, 'initialization');
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    loadingManager.showError(normalizedError);

    // Show user-friendly error message
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #ff4444; color: white; padding: 20px; border-radius: 8px;
            z-index: 10000; font-family: monospace; max-width: 80vw;
        `;
    errorDiv.innerHTML = `
            <h3>Initialization Error</h3>
            <p>The application failed to initialize properly.</p>
            <details>
                <summary>Technical Details</summary>
                <pre>${normalizedError.message}</pre>
                <pre>Stack: ${normalizedError.stack}</pre>
            </details>
            <button onclick="location.reload()">Reload Page</button>
        `;
    document.body.appendChild(errorDiv);
  }
}

export function initStudentNotation(): void {
  initDebug('initStudentNotation called');
  if (isInitialized) {
    initDebug('already initialized — skipping');
    return;
  }

  isInitialized = true;
  resetComponentReadiness();
  setupAudioHandlers();
  domCache.refresh();
  initDebug('firing startStudentNotation (async)');
  void startStudentNotation();
}

export function teardownStudentNotation(): void {
  cleanupFns.forEach(cleanup => cleanup());
  cleanupFns = [];

  try {
    unmountSvelteComponents();
  } catch (error) {
    logger.warn('Main.js', 'Failed to unmount Svelte components', error, 'cleanup');
  }

  if (typeof SynthEngine.teardown === 'function') {
    SynthEngine.teardown();
  }

  if (typeof rhythmPlaybackService.dispose === 'function') {
    rhythmPlaybackService.dispose();
  }

  const cleanupClasses = ['is-mobile', 'is-touch', 'orientation-portrait', 'orientation-landscape'];
  [document.documentElement, document.body].forEach((target) => {
    cleanupClasses.forEach((className) => target?.classList.remove(className));
  });

  resetComponentReadiness();
  isInitialized = false;
}
