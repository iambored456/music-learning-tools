import { mount, unmount } from 'svelte';
import App from './App.svelte';

export type SingingTrainerInstance = {
  destroy: () => void;
};

export function mountSingingTrainer(container: HTMLElement): SingingTrainerInstance {
  const instance = mount(App, { target: container });

  return {
    destroy: () => {
      unmount(instance);
    },
  };
}

// Re-export for convenience
export { default as App } from './App.svelte';

// Export types
export type * from './lib/types/ultrastar';
export type { AppState, VisualizationMode, TonicNote } from './lib/stores/appState.svelte';
export type { PitchState, DetectedPitch, PitchHistoryPoint, StablePitch } from './lib/stores/pitchState.svelte';
export type { HighwayState, TargetNote } from './lib/stores/highwayState.svelte';
export type { UltrastarState } from './lib/stores/ultrastarState.svelte';
export type { YouTubeState } from './lib/stores/youtubeState.svelte';
export type { ResultsState, ResultsSummary, PhraseResult } from './lib/stores/resultsState.svelte';
