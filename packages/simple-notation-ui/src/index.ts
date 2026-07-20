import { mount, unmount } from 'svelte';
import App from './App.svelte';

export type SimpleNotationInstance = {
  destroy: () => void;
};

export function mountSimpleNotation(container: HTMLElement): SimpleNotationInstance {
  const instance = mount(App, { target: container });

  return {
    destroy: () => {
      unmount(instance);
    },
  };
}

export { default as App } from './App.svelte';
export { mountSimpleNotation as mount };
export default mountSimpleNotation;
