import App from './app.ts';
import { appState } from './state/appState.ts';
import { loadPreferences } from './services/PreferencesService.ts';
import type { BeltId } from './types.ts';
import template from './template.html?raw';

import '../css/main.css';
import '../css/belts.css';
import '../css/accessibility.css';
import '../css/performance.css';

export type DiatonicCompassInstance = {
  destroy: () => void;
};

const publicAssets = import.meta.glob('../public/**/*', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const publicPrefix = '../public/';

function resolvePublicAsset(path: string): string {
  const normalized = path.replace(/^\/?public\//, '');
  const key = `${publicPrefix}${normalized}`;
  return publicAssets[key] ?? path;
}

function rewritePublicAssetUrls(container: HTMLElement): void {
  const elements = container.querySelectorAll<HTMLElement>('[src], [href]');
  elements.forEach((element) => {
    const attr = element.hasAttribute('src') ? 'src' : 'href';
    const value = element.getAttribute(attr);
    if (!value || value.startsWith('http') || value.startsWith('data:') || value.startsWith('#')) {
      return;
    }
    if (!value.startsWith('public/')) {
      return;
    }
    element.setAttribute(attr, resolvePublicAsset(value));
  });
}

function applyInitialPreferences(): void {
  const savedPrefs = loadPreferences();
  if (!savedPrefs) return;

  if (typeof savedPrefs.darkMode === 'boolean') {
    appState.ui.darkMode = savedPrefs.darkMode;
    document.body.classList.toggle('dark-mode', savedPrefs.darkMode);
  }

  if (Array.isArray(savedPrefs.beltOrder)) {
    const requiredBelts: BeltId[] = ['pitch', 'degree', 'intervals', 'chromatic'];
    const beltOrder = savedPrefs.beltOrder as BeltId[];
    const hasAllBelts = requiredBelts.every(belt => beltOrder.includes(belt));

    if (hasAllBelts && beltOrder.length === requiredBelts.length) {
      appState.belts.order = beltOrder;

      const beltsContainer = document.querySelector<HTMLElement>('.belts-container');
      if (beltsContainer) {
        const beltMapping: Record<BeltId, string> = {
          pitch: '.pitch-belt',
          degree: '.degree-belt',
          intervals: '.interval-brackets-wrapper',
          chromatic: '.chromatic-belt',
        };

        beltOrder.forEach((beltId, index) => {
          const selector = beltMapping[beltId];
          const element = selector ? beltsContainer.querySelector<HTMLElement>(selector) : null;
          if (element) {
            element.style.order = String(index + 1);
          }
        });
      }
    }
  }
}

export function mountDiatonicCompass(container: HTMLElement): DiatonicCompassInstance {
  container.innerHTML = template;
  rewritePublicAssetUrls(container);
  applyInitialPreferences();

  const mainContainer = container.querySelector<HTMLElement>('.main-container');
  if (!mainContainer) {
    throw new Error('Diatonic Compass root container not found.');
  }

  const app = new App(mainContainer);
  return {
    destroy: () => {
      app.destroy();
      document.body.classList.remove('dark-mode', 'low-power-mode', 'high-contrast', 'reduced-motion');
      container.innerHTML = '';
    },
  };
}

export const mount = mountDiatonicCompass;

export default mountDiatonicCompass;
