import { mount, unmount } from 'svelte';
import TypographySpecimen from './TypographySpecimen.svelte';

export function mountTypographySpecimen(target: HTMLElement): () => void {
  const specimen = mount(TypographySpecimen, { target });

  return () => {
    void unmount(specimen);
  };
}
