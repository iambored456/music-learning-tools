import type { DrawToolsControllerRuntime } from '@components/draw/drawToolsController.ts';

interface EffectsControllerLike {
  init?: () => void;
}

type StudentNotationRuntimeWindow = Window & {
  initStartTime?: number;
  initTempoSliderIfNeeded?: () => void;
  drumVolumeNode?: Window['drumVolumeNode'];
  effectsController?: EffectsControllerLike;
  drawToolsController?: DrawToolsControllerRuntime;
};

function getRuntimeWindow(): StudentNotationRuntimeWindow | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window as StudentNotationRuntimeWindow;
}

export function setInitAudioHandler(handler: (() => Promise<void>) | undefined): void {
  const runtimeWindow = getRuntimeWindow();
  if (!runtimeWindow) {
    return;
  }
  runtimeWindow.initAudio = handler;
}

export function clearInitAudioHandler(): void {
  const runtimeWindow = getRuntimeWindow();
  if (!runtimeWindow) {
    return;
  }
  delete runtimeWindow.initAudio;
}

export function invokeInitAudioHandler(): Promise<void> | undefined {
  return getRuntimeWindow()?.initAudio?.();
}

export function setInitStartTime(startTime: number): void {
  const runtimeWindow = getRuntimeWindow();
  if (!runtimeWindow) {
    return;
  }
  runtimeWindow.initStartTime = startTime;
}

export function invokeTempoSliderInitializer(): void {
  getRuntimeWindow()?.initTempoSliderIfNeeded?.();
}

export function registerSynthEngine(engine: Window['synthEngine']): void {
  const runtimeWindow = getRuntimeWindow();
  if (!runtimeWindow) {
    return;
  }
  runtimeWindow.synthEngine = engine;
}

export function getSynthEngine(): Window['synthEngine'] {
  return getRuntimeWindow()?.synthEngine;
}

export function registerDrumGridRenderer(renderer: NonNullable<Window['drumGridRenderer']>): void {
  const runtimeWindow = getRuntimeWindow();
  if (!runtimeWindow) {
    return;
  }
  runtimeWindow.drumGridRenderer = renderer;
}

export function getDrumGridRenderer(): Window['drumGridRenderer'] | undefined {
  return getRuntimeWindow()?.drumGridRenderer;
}

export function registerDrumVolumeNode(node: StudentNotationRuntimeWindow['drumVolumeNode']): void {
  const runtimeWindow = getRuntimeWindow();
  if (!runtimeWindow) {
    return;
  }
  runtimeWindow.drumVolumeNode = node;
}

export function getDrumVolumeNode(): StudentNotationRuntimeWindow['drumVolumeNode'] {
  return getRuntimeWindow()?.drumVolumeNode;
}

export function registerWaveformVisualizer(
  visualizer: NonNullable<StudentNotationRuntimeWindow['waveformVisualizer']>
): void {
  const runtimeWindow = getRuntimeWindow();
  if (!runtimeWindow) {
    return;
  }
  runtimeWindow.waveformVisualizer = visualizer;
}

export function getWaveformVisualizer(): StudentNotationRuntimeWindow['waveformVisualizer'] {
  return getRuntimeWindow()?.waveformVisualizer;
}

export function registerEffectsRuntimeServices(params: {
  effectsCoordinator?: StudentNotationRuntimeWindow['effectsCoordinator'];
  animationEffectsManager?: StudentNotationRuntimeWindow['animationEffectsManager'];
  audioEffectsManager?: StudentNotationRuntimeWindow['audioEffectsManager'];
  effectsController?: EffectsControllerLike;
}): void {
  const runtimeWindow = getRuntimeWindow();
  if (!runtimeWindow) {
    return;
  }

  if (params.effectsCoordinator) {
    runtimeWindow.effectsCoordinator = params.effectsCoordinator;
  }
  if (params.animationEffectsManager) {
    runtimeWindow.animationEffectsManager = params.animationEffectsManager;
  }
  if (params.audioEffectsManager) {
    runtimeWindow.audioEffectsManager = params.audioEffectsManager;
  }
  if (params.effectsController) {
    runtimeWindow.effectsController = params.effectsController;
  }
}

export function getEffectsCoordinator(): StudentNotationRuntimeWindow['effectsCoordinator'] {
  return getRuntimeWindow()?.effectsCoordinator;
}

export function getAnimationEffectsManager(): StudentNotationRuntimeWindow['animationEffectsManager'] {
  return getRuntimeWindow()?.animationEffectsManager;
}

export function getAudioEffectsManager(): StudentNotationRuntimeWindow['audioEffectsManager'] {
  return getRuntimeWindow()?.audioEffectsManager;
}

export function registerDrawToolsController(controller: DrawToolsControllerRuntime): void {
  const runtimeWindow = getRuntimeWindow();
  if (!runtimeWindow) {
    return;
  }
  runtimeWindow.drawToolsController = controller;
}

export function getDrawToolsController(): StudentNotationRuntimeWindow['drawToolsController'] {
  return getRuntimeWindow()?.drawToolsController;
}
