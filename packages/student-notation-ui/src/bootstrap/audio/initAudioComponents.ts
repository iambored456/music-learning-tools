// js/bootstrap/audio/initAudioComponents.js
import logger from '@utils/logger.ts';
import { initOvertoneBins } from '@components/audio/harmonicsFilter/overtoneBins.ts';
import { mountComponent } from '@/svelte-ui/index.ts';
// DEPRECATED: initFilterControls now managed by FilterControlsBridge.svelte
// import { initFilterControls } from '@components/audio/harmonicsFilter/filterControls.ts';
import { initWaveformVisualizer } from '@components/staticWaveform/waveformVisualizer.ts';
import animationEffectsManager from '@services/timbreEffects/effectsAnimation/animationEffectsManager.ts';
import audioEffectsManager from '@services/timbreEffects/effectsAudio/audioEffectsManager.ts';
import effectsCoordinator from '@services/timbreEffects/effectsCoordinator.ts';
import effectsController from '@components/audio/effects/effectsController.ts';

export interface AudioComponentProgress {
  onStep(status: string): void;
}

export function initAudioComponents(progress?: AudioComponentProgress): void {
  progress?.onStep('Mounting envelope editor...');
  mountComponent('adsr-envelope', '#adsr-envelope');

  progress?.onStep('Initializing harmonic bins...');
  initOvertoneBins();

  // Mount after overtone bins create the vertical blend controls.
  progress?.onStep('Mounting filter controls...');
  mountComponent('filter-controls-bridge', document.body);
  // DEPRECATED: Filter controls now managed by FilterControlsBridge.svelte (Phase 3 modernization)
  // initFilterControls();

  progress?.onStep('Setting up waveform display...');
  logger.initStart('Waveform Visualizer');
  if (initWaveformVisualizer()) {
    logger.initSuccess('Waveform Visualizer');
  } else {
    logger.initFailed('Waveform Visualizer');
  }

  // Initialize effects architecture
  progress?.onStep('Initializing effects system...');
  logger.initStart('Effects Managers');
  animationEffectsManager.init();
  audioEffectsManager.init();

  progress?.onStep('Wiring effects controls...');
  effectsCoordinator.init();

  effectsController.init();

  const globalWindow = window as typeof window & {
    effectsCoordinator?: typeof effectsCoordinator;
    animationEffectsManager?: typeof animationEffectsManager;
    audioEffectsManager?: typeof audioEffectsManager;
    effectsController?: typeof effectsController;
  };

  globalWindow.effectsCoordinator = effectsCoordinator;
  globalWindow.animationEffectsManager = animationEffectsManager;
  globalWindow.audioEffectsManager = audioEffectsManager;
  globalWindow.effectsController = effectsController;
  logger.initSuccess('Effects Managers');
}
