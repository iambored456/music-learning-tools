import template from './template.html?raw';
import './style.css';
import { initStudentNotation, teardownStudentNotation } from './core/main.ts';

export type StudentNotationInstance = {
  destroy: () => void;
};

const publicAssets = import.meta.glob('../public/**/*', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const publicPrefix = '../public/';
const THEME_STORAGE_KEY = 'app.themeMode';

function resolvePublicAsset(path: string): string {
  const [pathWithNoHash, hashFragment = ''] = path.split('#', 2);
  const [pathWithNoQuery, queryString = ''] = pathWithNoHash.split('?', 2);

  // Tolerate malformed tonic icon paths that may include a space before the number.
  const tonicPathSanitized = pathWithNoQuery.replace(
    /assets\/tabicons\/tonicShape\s+([1-7])\.svg$/i,
    'assets/tabicons/tonicShape_$1.svg'
  );

  const normalized = tonicPathSanitized.replace(/^\/+/, '');
  const key = `${publicPrefix}${normalized}`;
  const resolved = publicAssets[key];
  if (!resolved) {return path;}

  const querySuffix = queryString ? `?${queryString}` : '';
  const hashSuffix = hashFragment ? `#${hashFragment}` : '';
  return `${resolved}${querySuffix}${hashSuffix}`;
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

function ensureMountContainerLayout(container: HTMLElement): void {
  // Some host pages do not provide explicit root sizing. Enforce a full-size
  // flex mount container so notation can expand to the available viewport.
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.display = 'flex';
  container.style.flex = '1 1 auto';
  container.style.minWidth = '0';
  container.style.minHeight = '0';
}

function applyStoredThemeModeClass(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') {return;}
  let isDarkMode = false;
  try {
    isDarkMode = window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
  } catch {
    // Ignore localStorage access issues
  }
  document.body.classList.toggle('dark-mode', isDarkMode);
}

export function mountStudentNotation(container: HTMLElement): StudentNotationInstance {
  applyStoredThemeModeClass();
  ensureMountContainerLayout(container);
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
