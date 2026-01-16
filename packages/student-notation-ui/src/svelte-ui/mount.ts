/**
 * Svelte Component Mounting
 *
 * This module provides a way to mount Svelte components into existing DOM containers.
 * It enables gradual migration by allowing Svelte components to coexist with
 * the existing vanilla JS code.
 *
 * Usage:
 * 1. Add a placeholder div in index.html with a data-svelte-component attribute
 * 2. Call mountSvelteComponents() after DOM is ready
 * 3. The component will replace the placeholder content
 */

import { mount, unmount } from 'svelte';
import PlaybackControls from './toolbar/PlaybackControls.svelte';
import PlaybackControlsBridge from './toolbar/PlaybackControlsBridge.svelte';
import FileActionsBridge from './toolbar/FileActionsBridge.svelte';
import GridControlsBridge from './toolbar/GridControlsBridge.svelte';
import ModulationBridge from './toolbar/ModulationBridge.svelte';
import SidebarBridge from './toolbar/SidebarBridge.svelte';
import ToolSelectorBridge from './toolbar/ToolSelectorBridge.svelte';
import AudioControlsBridge from './toolbar/AudioControlsBridge.svelte';
import TabManagementBridge from './tabs/TabManagementBridge.svelte';
import PrintPreviewBridge from './modals/PrintPreviewBridge.svelte';
// Phase 3: Modernized Svelte 5 components
import StoreContext from './context/StoreContext.svelte';
import FilterControlsBridge from './audio/FilterControlsBridge.svelte';
import ADSREnvelope from './audio/ADSREnvelope.svelte';
import EffectsCartesianSlider from './audio/EffectsCartesianSlider.svelte';
import NotificationModal from './ui/NotificationModal.svelte';
import ZoomIndicator from './ui/ZoomIndicator.svelte';

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
    console.log(`[SvelteMount] ${message}`);
    return;
  }
  console.log(`[SvelteMount] ${message}`, data);
};

let filterConfigInitialized = false;

const initFilterListFromQuery = (): void => {
  if (filterConfigInitialized) {return;}
  filterConfigInitialized = true;

  if (typeof window === 'undefined') {return;}

  try {
    const win = window as Window & {
      __svelteSkipComponents?: string[];
      __svelteAllowComponents?: string[];
    };
    const params = new URLSearchParams(window.location.search);
    const rawAllow = params.get('allowSvelte') ?? params.get('onlySvelte');
    const rawSkip = params.get('skipSvelte');
    const skipAll = params.get('skipSvelteAll') === '1';

    if (!Array.isArray(win.__svelteAllowComponents) || win.__svelteAllowComponents.length === 0) {
      if (rawAllow === '*' || rawAllow === 'all') {
        win.__svelteAllowComponents = ['*'];
      } else if (rawAllow) {
        const parsed = rawAllow
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean);
        if (parsed.length > 0) {
          win.__svelteAllowComponents = parsed;
        }
      }
    }

    if (!Array.isArray(win.__svelteSkipComponents) || win.__svelteSkipComponents.length === 0) {
      if (skipAll || rawSkip === '*' || rawSkip === 'all') {
        win.__svelteSkipComponents = ['*'];
      } else if (rawSkip) {
        const parsed = rawSkip
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean);
        if (parsed.length > 0) {
          win.__svelteSkipComponents = parsed;
        }
      }
    }

    if (shouldInitDebug()) {
      if (win.__svelteAllowComponents) {
        console.warn('[SvelteMount] allow list', win.__svelteAllowComponents);
      }
      if (win.__svelteSkipComponents) {
        console.warn('[SvelteMount] skip list', win.__svelteSkipComponents);
      }
    }
  } catch (error) {
    console.error('[SvelteMount] filter list parse failed', error);
  }
};

const shouldSkipComponent = (componentName: string): boolean => {
  if (typeof window === 'undefined') {return false;}
  initFilterListFromQuery();
  const allowList = (window as Window & { __svelteAllowComponents?: string[] }).__svelteAllowComponents;
  if (Array.isArray(allowList) && allowList.length > 0) {
    return !(allowList.includes('*') || allowList.includes(componentName));
  }
  const skipList = (window as Window & { __svelteSkipComponents?: string[] }).__svelteSkipComponents;
  if (!Array.isArray(skipList) || skipList.length === 0) {
    return false;
  }
  return skipList.includes('*') || skipList.includes(componentName);
};

// Registry of Svelte components that can be mounted
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const componentRegistry: Record<string, any> = {
  // Toolbar bridges
  'playback-controls': PlaybackControls,
  'playback-controls-bridge': PlaybackControlsBridge,
  'file-actions-bridge': FileActionsBridge,
  'grid-controls-bridge': GridControlsBridge,
  'modulation-bridge': ModulationBridge,
  'sidebar-bridge': SidebarBridge,
  'tool-selector-bridge': ToolSelectorBridge,
  'audio-controls-bridge': AudioControlsBridge,
  // Tab management bridge
  'tab-management-bridge': TabManagementBridge,
  // Modal bridges
  'print-preview-bridge': PrintPreviewBridge,
  // Phase 3: Modernized Svelte 5 components
  'store-context': StoreContext,
  'adsr-envelope': ADSREnvelope,
  'effects-cartesian-slider': EffectsCartesianSlider,
  'filter-controls-bridge': FilterControlsBridge,
  'notification-modal': NotificationModal,
  'zoom-indicator': ZoomIndicator,
};

// Track mounted components for cleanup
const mountedComponents: Array<{ target: Element; component: ReturnType<typeof mount> }> = [];

/**
 * Mount all Svelte components found in the DOM
 */
export function mountSvelteComponents(): void {
  initFilterListFromQuery();
  const placeholders = document.querySelectorAll('[data-svelte-component]');
  initDebug('placeholders found', placeholders.length);

  placeholders.forEach((placeholder) => {
    const componentName = placeholder.getAttribute('data-svelte-component');
    if (!componentName) return;

    const Component = componentRegistry[componentName];
    if (!Component) {
      console.warn(`[Svelte] Unknown component: ${componentName}`);
      return;
    }

    try {
      if (shouldSkipComponent(componentName)) {
        initDebug('mount:skip', componentName);
        if (shouldInitDebug()) {
          console.warn(`[Svelte] Skipped: ${componentName}`);
        }
        return;
      }
      initDebug('mount:start', componentName);
      // Clear placeholder content
      placeholder.innerHTML = '';

      // Mount the Svelte component
      const component = mount(Component, {
        target: placeholder as Element,
      });

      mountedComponents.push({ target: placeholder, component });
      if (shouldInitDebug()) {
        console.log(`[Svelte] Mounted: ${componentName}`);
      }
      initDebug('mount:done', componentName);
    } catch (error) {
      console.error(`[Svelte] Failed to mount ${componentName}:`, error);
      initDebug('mount:failed', componentName);
    }
  });

  initDebug('mountSvelteComponents:complete');
}

/**
 * Unmount all Svelte components (for cleanup)
 */
export function unmountSvelteComponents(): void {
  mountedComponents.forEach(({ component }) => {
    try {
      unmount(component);
    } catch (error) {
      console.error('[Svelte] Failed to unmount component:', error);
    }
  });
  mountedComponents.length = 0;
}

/**
 * Mount a specific Svelte component to a target element
 */
export function mountComponent(
  componentName: string,
  target: Element | string
): ReturnType<typeof mount> | null {
  const Component = componentRegistry[componentName];
  if (!Component) {
    console.error(`[Svelte] Unknown component: ${componentName}`);
    return null;
  }

  if (shouldSkipComponent(componentName)) {
    initDebug('mount:skip', componentName);
    if (shouldInitDebug()) {
      console.warn(`[Svelte] Skipped: ${componentName}`);
    }
    return null;
  }

  const targetElement = typeof target === 'string'
    ? document.querySelector(target)
    : target;

  if (!targetElement) {
    console.error(`[Svelte] Target not found: ${target}`);
    return null;
  }

  initDebug('mount:start', componentName);
  const component = mount(Component, {
    target: targetElement,
  });

  mountedComponents.push({ target: targetElement, component });
  initDebug('mount:done', componentName);
  return component;
}
