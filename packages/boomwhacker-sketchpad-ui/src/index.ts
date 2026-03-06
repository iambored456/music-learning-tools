import { mount, unmount } from 'svelte';
import App from './App.svelte';

export type BoomwhackerSketchpadInstance = {
  destroy: () => void;
};

export function mountBoomwhackerSketchpad(container: HTMLElement): BoomwhackerSketchpadInstance {
  const instance = mount(App, { target: container });

  return {
    destroy: () => {
      unmount(instance);
    },
  };
}

export { default as App } from './App.svelte';
export { mountBoomwhackerSketchpad as mount };
export default mountBoomwhackerSketchpad;
