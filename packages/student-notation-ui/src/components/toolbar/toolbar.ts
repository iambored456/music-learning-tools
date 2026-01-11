// js/components/Toolbar/toolbar.js
//
// ALL TOOLBAR INITIALIZERS HAVE BEEN MIGRATED TO SVELTE BRIDGE COMPONENTS
// See: apps/student-notation/src/svelte-ui/toolbar/*Bridge.svelte
//
// DEPRECATED: Sidebar/volume controls now managed by Svelte (SidebarBridge.svelte)
// import { initSidebarAndVolume } from './initializers/sidebarInitializer.js';
// DEPRECATED: File actions now managed by Svelte (FileActionsBridge.svelte)
// import { initFileActions } from './initializers/fileActionsInitializer.js';
// DEPRECATED: Tool selectors now managed by Svelte (ToolSelectorBridge.svelte)
// import { initToolSelectors } from './initializers/toolSelectorInitializer.js';
// DEPRECATED: Playback controls now managed by Svelte (PlaybackControlsBridge.svelte)
// import { initPlaybackControls } from './initializers/playbackInitializer.js';
// DEPRECATED: Audio controls now managed by Svelte (AudioControlsBridge.svelte)
// import { initAudioControls } from './initializers/audioControlsInitializer.js';
// DEPRECATED: Grid controls now managed by Svelte (GridControlsBridge.svelte)
// import { initGridControls } from './initializers/gridControlsInitializer.js';
// DEPRECATED: Modulation controls now managed by Svelte (ModulationBridge.svelte)
// import { initModulationControls } from './initializers/modulationInitializer.js';
import logger from '@utils/logger.ts';

logger.moduleLoaded('ToolbarComponent', 'toolbar');

const Toolbar = {
  init(): void {
    // ALL TOOLBAR INITIALIZATION IS NOW HANDLED BY SVELTE BRIDGE COMPONENTS
    // The bridge components are mounted via mountSvelteComponents() in initUiComponents.ts
    // See: apps/student-notation/src/svelte-ui/mount.ts for the component registry
    //
    // Bridge components:
    // - PlaybackControlsBridge.svelte (play, pause, stop, loop, undo, redo)
    // - FileActionsBridge.svelte (save, import, print, reset)
    // - GridControlsBridge.svelte (zoom in/out, macrobeat controls)
    // - ModulationBridge.svelte (2:3, 3:2, clear markers)
    // - SidebarBridge.svelte (sidebar toggle, volume popup, all toggles)
    // - ToolSelectorBridge.svelte (notes, eraser, chords, intervals, degrees)
    // - AudioControlsBridge.svelte (tempo slider, preset buttons)

    logger.info('ToolbarComponent', 'Toolbar init called (all controls managed by Svelte)', null, 'toolbar');
  }

};

export default Toolbar;
