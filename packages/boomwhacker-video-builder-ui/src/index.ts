import { mount, unmount } from 'svelte';
import App from './App.svelte';

export type BoomwhackerVideoBuilderInstance = {
  destroy: () => void;
};

export function mountBoomwhackerVideoBuilder(container: HTMLElement): BoomwhackerVideoBuilderInstance {
  const instance = mount(App, { target: container });

  return {
    destroy: () => {
      unmount(instance);
    },
  };
}

export { default as App } from './App.svelte';
export { mountBoomwhackerVideoBuilder as mount };
export default mountBoomwhackerVideoBuilder;
