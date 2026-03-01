import { mount, unmount } from 'svelte';
import App from './App.svelte';

export interface GrandFrequencyStaffInstance {
  destroy: () => void;
}

export function mountGrandFrequencyStaff(container: HTMLElement): GrandFrequencyStaffInstance {
  const instance = mount(App, { target: container });
  return {
    destroy: () => unmount(instance),
  };
}

export default mountGrandFrequencyStaff;
