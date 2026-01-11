import template from './template.html?raw';
import './style.css';
import { initStudentNotation, teardownStudentNotation } from './core/main.ts';

export type StudentNotationInstance = {
  destroy: () => void;
};

const publicAssets = import.meta.glob('../public/**/*', { eager: true, as: 'url' }) as Record<string, string>;
const publicPrefix = '../public/';

function resolvePublicAsset(path: string): string {
  const normalized = path.replace(/^\/+/, '');
  const key = `${publicPrefix}${normalized}`;
  return publicAssets[key] ?? path;
}

function rewriteAssetUrls(container: HTMLElement): void {
  const elements = container.querySelectorAll<HTMLElement>('[src], [href]');
  elements.forEach((element) => {
    const attr = element.hasAttribute('src') ? 'src' : 'href';
    const value = element.getAttribute(attr);
    if (!value || value.startsWith('http') || value.startsWith('data:') || value.startsWith('#')) {
      return;
    }

    if (!value.startsWith('assets/') && !value.startsWith('fonts/') && !value.startsWith('favicon')) {
      return;
    }

    element.setAttribute(attr, resolvePublicAsset(value));
  });
}

export function mountStudentNotation(container: HTMLElement): StudentNotationInstance {
  container.innerHTML = template;
  rewriteAssetUrls(container);
  initStudentNotation();

  return {
    destroy: () => {
      teardownStudentNotation();
      container.innerHTML = '';
    },
  };
}

export const mount = mountStudentNotation;

export default mountStudentNotation;

// Re-export utilities and types that may be useful
export * from './state/selectors';
export * from './data';
