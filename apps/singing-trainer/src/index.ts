import { mount as svelteMount, unmount } from 'svelte';
import App from './App.svelte';
import './styles/global.css';

export type SingingTrainerInstance = {
  destroy: () => void;
};

export function mountSingingTrainer(container: HTMLElement): SingingTrainerInstance {
  const app = svelteMount(App, { target: container });
  return {
    destroy: () => unmount(app),
  };
}

export const mount = mountSingingTrainer;

export default mountSingingTrainer;
