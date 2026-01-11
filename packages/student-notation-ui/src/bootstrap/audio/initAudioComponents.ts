// js/bootstrap/audio/initAudioComponents.js
import logger from '@utils/logger.ts';
import { initAdsrComponent } from '@components/audio/adsr/adsrComponent.ts';
import { initHarmonicBins } from '@components/audio/harmonicsFilter/harmonicBins.ts';
import { initFilterControls } from '@components/audio/harmonicsFilter/filterControls.ts';
import { initWaveformVisualizer } from '@components/staticWaveform/waveformVisualizer.ts';
import animationEffectsManager from '@services/timbreEffects/effectsAnimation/animationEffectsManager.ts';
import audioEffectsManager from '@services/timbreEffects/effectsAudio/audioEffectsManager.ts';
import effectsCoordinator from '@services/timbreEffects/effectsCoordinator.ts';
import effectsController from '@components/audio/effects/effectsController.ts';
import cartesianSliderController from '@components/ui/cartesianSliderController.ts';

export function initAudioComponents(): void {
  initAdsrComponent();
  initHarmonicBins();
  initFilterControls();

  logger.initStart('Waveform Visualizer');
  if (initWaveformVisualizer()) {
    logger.initSuccess('Waveform Visualizer');
  } else {
    logger.initFailed('Waveform Visualizer');
  }

  // Initialize effects architecture
  logger.initStart('Effects Managers');
  animationEffectsManager.init();
  audioEffectsManager.init();

  effectsCoordinator.init();

  effectsController.init();
  cartesianSliderController.init();

  const globalWindow = window as typeof window & {
    effectsCoordinator?: typeof effectsCoordinator;
    animationEffectsManager?: typeof animationEffectsManager;
    audioEffectsManager?: typeof audioEffectsManager;
    effectsController?: typeof effectsController;
    cartesianSliderController?: typeof cartesianSliderController;
  };

  globalWindow.effectsCoordinator = effectsCoordinator;
  globalWindow.animationEffectsManager = animationEffectsManager;
  globalWindow.audioEffectsManager = audioEffectsManager;
  globalWindow.effectsController = effectsController;
  globalWindow.cartesianSliderController = cartesianSliderController;
  logger.initSuccess('Effects Managers');
}
