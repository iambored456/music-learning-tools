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

export { default as App } from './App.svelte';
export * from './lib/calibration/index.js';
export { default as SpeakingPitchPanel } from './lib/components/controls/SpeakingPitchPanel.svelte';
export { ExerciseChooserModal } from './lib/components/chooser/index.js';
