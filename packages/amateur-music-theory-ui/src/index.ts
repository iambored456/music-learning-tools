import { mount, unmount } from 'svelte';
import App from './App.svelte';

export type AmateurMusicTheoryInstance = {
  destroy: () => void;
};

export function mountAmateurMusicTheory(container: HTMLElement): AmateurMusicTheoryInstance {
  const instance = mount(App, { target: container });

  return {
    destroy: () => {
      unmount(instance);
    },
  };
}

export { default as App } from './App.svelte';
export default mountAmateurMusicTheory;
