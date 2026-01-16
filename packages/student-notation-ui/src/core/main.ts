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
import PrintService from '@services/printService.ts';
import SynthEngine from '@services/initAudio.ts';
import TransportService from '@services/initTransport.ts';
import pitchGridViewportService from '@services/pitchGridViewportService.ts';
import { initDeviceProfileService } from '@services/deviceProfileService.ts';
import domCache from '@services/domCache.ts';
import logger from '@utils/logger.ts';
import loadingManager from './loadingManager.ts';
import { enableStateMutationDetection, snapshotState, checkForMutations } from '@utils/stateMutationGuard.ts';
// NOTE: effectsController.js handles UI dials and lives in @components/audio/Effects/
// All effects logic has been moved to @services/timbreEffects/ architecture

import rhythmPlaybackService from '@services/rhythmPlaybackService.ts';
import columnMapService, { registerStoreHooks as registerColumnMapHooks } from '@services/columnMapService.ts';
import { registerStoreHooks as registerPixelMapHooks } from '@services/pixelMapService.ts';
import { preloadDrumSamples } from '@services/transport/drumManager.ts';



// Zoom System Components


// Modulation Testing (keep for advanced debugging)
import ModulationTest from '@/rhythm/modulationTest.js';
import { initUiComponents } from '@/bootstrap/ui/initUiComponents.ts';
import { initAudioComponents } from '@/bootstrap/audio/initAudioComponents.ts';
import initRhythmUi from '@/bootstrap/rhythm/initRhythmUi.ts';
import { initCanvasServices } from '@/bootstrap/canvas/initCanvasServices.ts';
import { initDrawSystem } from '@/bootstrap/draw/initDrawSystem.ts';
import { initInputAndDiagnostics } from '@/bootstrap/input/initInputAndDiagnostics.ts';
// DEPRECATED: initStateSubscriptions now managed by StoreContext.svelte (Phase 3 modernization)
// import { initStateSubscriptions } from '@/bootstrap/state/initStateSubscriptions.ts';
import { unmountSvelteComponents } from '@/svelte-ui/index.ts';

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
  }
}

const shouldInitDebug = (): boolean => {
  if (typeof window === 'undefined') {return false;}
  const override = (window as Window & { __initDebug?: boolean }).__initDebug;
  if (override === true) {return true;}
  if (override === false) {return false;}
  return import.meta.env.DEV;
};

const initDebug = (message: string, data?: unknown): void => {
  if (!shouldInitDebug()) {return;}
  if (data === undefined) {
    console.log(`[Init] ${message}`);
    return;
  }
  console.log(`[Init] ${message}`, data);
};


let isInitialized = false;
let cleanupFns: Array<() => void> = [];
let audioInitialized = false;
let audioInitPromise: Promise<void> | null = null;
let userInteractionReceived = false;

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
  const loadingPhases = [
    'dom-cache',
    'drum-samples',
    'state-setup',
    'canvas-services',
    'layout-ready',
    'synth-engine',
    'rhythm-playback',
    'transport-service',
    'input-handlers',
    'store-hooks',
    'ui-components',
    'audio-components',
    'state-subscriptions',
    'initial-render',
    'finalize'
  ];

  try {
    loadingManager.init();
    loadingPhases.forEach(phase => loadingManager.registerTask(phase));
    initDebug('startup rhythm defaults', {
      macrobeatGroupings: store.state.macrobeatGroupings,
      macrobeatBoundaryStyles: store.state.macrobeatBoundaryStyles
    });
    const defaultColor = store.state.selectedNote?.color ?? '#4a90e2';
    const defaultTimbre = store.state.timbres?.[defaultColor];
    initDebug('startup adsr defaults', {
      color: defaultColor,
      adsr: defaultTimbre?.adsr ?? null,
      preset: defaultTimbre?.activePresetName ?? null
    });
    await loadingManager.nextFrame();
    initDeviceProfileService();

    // Configure audio context for optimal playback performance
    // This must be called before any Tone.js audio nodes are created
    configureAudioContext({ latencyHint: 'playback', lookAhead: 0.1 });
    logger.info('Main.js', 'AudioContext configured with latencyHint: playback');

    // ? Enable state mutation detection in development mode
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Enabling state mutation detection
      enableStateMutationDetection();
    }

    // Initialize DOM cache first
    // Phase 1: Initializing DOM cache
    loadingManager.updateStatus('Initializing interface...');
    domCache.init();
    markComponentReady('domCache');
    loadingManager.completeTask('dom-cache');
    await loadingManager.nextFrame();

    // Phase 1.5: Preload drum samples (non-blocking network request)
    // This starts loading in the background while other init continues
    loadingManager.updateStatus('Loading audio samples...');
    await preloadDrumSamples();
    loadingManager.completeTask('drum-samples');
    logger.info('Main.js', 'Drum samples preloaded');
    await loadingManager.nextFrame();

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

    // Initialize core data and services
    // Phase 2: Initializing core services
    loadingManager.updateStatus('Preparing core systems...');

    // ? Take initial state snapshot before any mutations
    snapshotState(store.state);

    // TEMPORARY: This is the one allowed direct state mutation during initialization
    const initialPitchRange = store.state.pitchRange || {
      topIndex: 0,
      bottomIndex: fullRowData.length - 1
    };
    const clampedTop =
        Math.max(0, Math.min(fullRowData.length - 1, initialPitchRange.topIndex ?? 0));
    const clampedBottom =
        Math.max(clampedTop, Math.min(fullRowData.length - 1, initialPitchRange.bottomIndex ?? (fullRowData.length - 1)));
    /**
     * INITIALIZATION: FIT-TO-RANGE ZOOM
     * ==================================
     * Set pitchRange and fullRowData, then after layout is ready,
     * apply zoom to fit all rows in the pitchRange within the container.
     */
    store.state.pitchRange = { topIndex: clampedTop, bottomIndex: clampedBottom };
    // Note: fullRowData should contain the complete pitch gamut (88 rows), not a slice
    // pitchRange defines which portion is visible/rendered
    store.state.fullRowData = [...fullRowData];  // Full gamut, not sliced
    // Allowed initialization mutation: fullRowData assignment
    loadingManager.completeTask('state-setup');
    await loadingManager.nextFrame();

    // Phase 2a-b: Initializing layout + canvas services
    loadingManager.updateStatus('Sizing canvas...');
    initCanvasServices();
    markComponentReady('layoutService');
    markComponentReady('canvasContextService');
    loadingManager.completeTask('canvas-services');
    await loadingManager.nextFrame();
    loadingManager.updateStatus('Calculating layout...');
    await LayoutService.waitForInitialLayout();
    loadingManager.completeTask('layout-ready');
    await loadingManager.nextFrame();

    // Phase 2c: Initializing SynthEngine
    loadingManager.updateStatus('Initializing synth engine...');
    SynthEngine.init();
    markComponentReady('synthEngine');
    loadingManager.completeTask('synth-engine');
    await loadingManager.nextFrame();

    // Phase 2c-1: Initializing RhythmPlaybackService
    // Don't await - this may need user interaction for audio context
    loadingManager.updateStatus('Preparing rhythm playback...');
    rhythmPlaybackService.initialize().catch(err => {
      logger.warn('Main.js', 'RhythmPlaybackService initialization deferred (needs user interaction)', err, 'initialization');
    });
    markComponentReady('rhythmPlaybackService');
    loadingManager.completeTask('rhythm-playback');
    await loadingManager.nextFrame();

    // Phase 2d: Initializing TransportService
    loadingManager.updateStatus('Configuring transport...');
    TransportService.init();
    markComponentReady('transportService');
    loadingManager.completeTask('transport-service');
    await loadingManager.nextFrame();

    // Phase 2e: Initializing input handlers
    loadingManager.updateStatus('Registering input handlers...');
    initInputAndDiagnostics();
    loadingManager.completeTask('input-handlers');
    await loadingManager.nextFrame();

    // Phase 2f: Register column map service hooks
    loadingManager.updateStatus('Syncing state services...');
    registerColumnMapHooks(store);
    registerPixelMapHooks(store);

    // Wire columnMapService callbacks to engineStore for action callbacks
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
    loadingManager.completeTask('store-hooks');
    await loadingManager.nextFrame();

    // Phase 3: Initializing UI components
    loadingManager.updateStatus('Loading interface components...');
    initDebug('Loading interface components...');
    initDebug('initUiComponents:start');
    initUiComponents();
    initDebug('initUiComponents:done');
    markComponentReady('uiComponents');
    initDebug('uiComponents marked ready');
    loadingManager.completeTask('ui-components');
    initDebug('ui-components task complete');
    await loadingManager.nextFrame();
    initDebug('ui-components nextFrame resolved');

    // Wait for UI components before audio components
    initDebug('waitForComponent:uiComponents');
    await waitForComponent('uiComponents');
    initDebug('waitForComponent:uiComponents resolved');
    // Phase 4: Initializing audio components
    loadingManager.updateStatus('Preparing audio components...');
    initAudioComponents();
    markComponentReady('audioComponents');
    loadingManager.completeTask('audio-components');
    await loadingManager.nextFrame();

    // ? Check for unauthorized state mutations after audio components
    checkForMutations(store.state, 'audio-components-initialization');

    // Rhythm UI interactions
    initRhythmUi();

    initDrawSystem();

    // Wait for all components before setting up event subscriptions
    await waitForComponent('audioComponents');
    // Phase 5: Setting up event subscriptions
    logger.section('SETTING UP STATE SUBSCRIPTIONS');

    loadingManager.updateStatus('Binding state subscriptions...');
    // NOTE: State subscriptions are now managed by StoreContext.svelte (Phase 3 modernization)
    // The renderAll function is no longer returned from initStateSubscriptions
    // Instead, we'll use a local implementation for the initial render
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
    // DEPRECATED: initStateSubscriptions() - now managed by StoreContext.svelte
    // const { renderAll } = initStateSubscriptions();
    loadingManager.completeTask('state-subscriptions');
    await loadingManager.nextFrame();

    logger.section('PERFORMING INITIAL RENDER');

    store.setSelectedTool('note');
    store.setSelectedNote('circle', '#4a90e2');

    // Perform initial render explicitly to ensure canvas is drawn even on page refresh
    // This is necessary because LayoutService.init() uses requestAnimationFrame which may
    // fire before event listeners are set up, causing the initial layoutConfigChanged
    // event to be missed.
    loadingManager.updateStatus('Rendering workspace...');
    renderAll();
    PitchGridController.renderMacrobeatTools();
    loadingManager.completeTask('initial-render');
    void PrintService.prefetchButtonGridSnapshot();
    await loadingManager.nextFrame();

    markComponentReady('initialized');
    // Initialization sequence completed successfully

    logger.section('INITIALIZATION COMPLETE');
    loadingManager.updateStatus('Finalizing...');
    loadingManager.completeTask('finalize');
    await loadingManager.nextFrame();

    if (store.isColdStart) {
      const treblePresetRange = getTrebleClefPresetRange();
      if (!treblePresetRange) {
        logger.warn('Main.js', 'Treble Clef preset range could not be resolved during cold start');
      } else {
        pitchGridViewportService.setPitchViewportRange(treblePresetRange, { animateMs: 0, source: 'coldStart:treble' });
      }
    }

    await loadingManager.complete();

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
  if (isInitialized) {
    return;
  }

  isInitialized = true;
  resetComponentReadiness();
  setupAudioHandlers();
  domCache.refresh();
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
