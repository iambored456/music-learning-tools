import { mount, unmount } from 'svelte';
import App from './App.svelte';
import '@mlt/font-atkinson';
import './style.css';

export function mountAudiationerTrainer(container: HTMLElement) {
  const app = mount(App, { target: container });
  return { destroy: () => { void unmount(app); } };
}
export default mountAudiationerTrainer;
