import template from './template.html?raw';
import './style.css';
import { initStudentNotation, teardownStudentNotation } from './core/main.ts';

export type StudentNotationInstance = {
  destroy: () => void;
};

const publicAssets = import.meta.glob('../public/**/*', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const publicPrefix = '../public/';

const shouldInitDebug = (): boolean => {
  if (typeof window === 'undefined') {return false;}
  const override = (window as Window & { __initDebug?: boolean }).__initDebug;
  if (override === true) {return true;}
  if (override === false) {return false;}
  return import.meta.env.DEV;
};

const initDebug = (message: string, data?: unknown): void => {
  if (!shouldInitDebug()) {return;}
  if (data === undefined) {
    console.log(message);
    return;
  }
  console.log(message, data);
};

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
  initDebug('[StudentNotation] mount:start', {
    hasTemplate: Boolean(template),
    templateLength: template.length,
    containerId: container.id || null,
  });

  container.innerHTML = template;
  initDebug('[StudentNotation] template injected');

  rewriteAssetUrls(container);
  initDebug('[StudentNotation] assets rewritten');

  initStudentNotation();
  initDebug('[StudentNotation] initStudentNotation:called');

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
