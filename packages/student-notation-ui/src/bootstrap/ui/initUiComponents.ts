// js/bootstrap/ui/initUiComponents.ts
//
// ALL UI INITIALIZATION HAS BEEN MIGRATED TO SVELTE BRIDGE COMPONENTS
// See: apps/student-notation/src/svelte-ui/ for the component registry
//
// DEPRECATED: Toolbar init now managed by Svelte bridge components
import toolbar from '@components/toolbar/toolbar.ts';
// DEPRECATED: Print preview now managed by Svelte (PrintPreviewBridge.svelte)
// import printPreview from '@components/ui/printPreview.ts';
// DEPRECATED: Tab management now managed by Svelte (TabManagementBridge.svelte)
// import { initMainTabs, initPresetTabs, initPitchTabs } from './initTabManagement.ts';
import { mountSvelteComponents } from '@/svelte-ui/index.ts';
import logger from '@utils/logger.ts';

export function initUiComponents(): void {
  // toolbar.init() is still called but all its functionality has been migrated to Svelte bridge components
  // The init() method now just logs that Svelte manages everything
  toolbar.init();

  // DEPRECATED: Tab management now handled by TabManagementBridge.svelte
  // initMainTabs();
  // initPresetTabs();
  // initPitchTabs();

  // DEPRECATED: Print preview now handled by PrintPreviewBridge.svelte
  // printPreview.init();

  // Mount Svelte components into their placeholder elements
  // Components are identified by data-svelte-component attributes in the HTML
  // This now handles all UI initialization:
  // - Toolbar controls (playback, file actions, grid, modulation, sidebar, tool selector, audio)
  // - Tab management (main tabs, preset tabs, pitch tabs)
  // - Modals (print preview)
  mountSvelteComponents();

  logger.initSuccess('UiComponents');
}
