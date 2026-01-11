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
};

// Track mounted components for cleanup
const mountedComponents: Array<{ target: Element; component: ReturnType<typeof mount> }> = [];

/**
 * Mount all Svelte components found in the DOM
 */
export function mountSvelteComponents(): void {
  const placeholders = document.querySelectorAll('[data-svelte-component]');

  placeholders.forEach((placeholder) => {
    const componentName = placeholder.getAttribute('data-svelte-component');
    if (!componentName) return;

    const Component = componentRegistry[componentName];
    if (!Component) {
      console.warn(`[Svelte] Unknown component: ${componentName}`);
      return;
    }

    try {
      // Clear placeholder content
      placeholder.innerHTML = '';

      // Mount the Svelte component
      const component = mount(Component, {
        target: placeholder as Element,
      });

      mountedComponents.push({ target: placeholder, component });
      console.log(`[Svelte] Mounted: ${componentName}`);
    } catch (error) {
      console.error(`[Svelte] Failed to mount ${componentName}:`, error);
    }
  });
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

  const targetElement = typeof target === 'string'
    ? document.querySelector(target)
    : target;

  if (!targetElement) {
    console.error(`[Svelte] Target not found: ${target}`);
    return null;
  }

  const component = mount(Component, {
    target: targetElement,
  });

  mountedComponents.push({ target: targetElement, component });
  return component;
}
