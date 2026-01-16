/**
 * Svelte UI Module
 *
 * Entry point for all Svelte components in the student-notation app.
 * This module manages mounting/unmounting and provides component exports.
 */

export { mountSvelteComponents, unmountSvelteComponents, mountComponent } from './mount.js';

// Export components for direct usage if needed
export { default as PlaybackControls } from './toolbar/PlaybackControls.svelte';

// Phase 3: Modernized Svelte 5 components
export { default as StoreContext, getStoreContext } from './context/StoreContext.svelte';
export { default as FilterControlsBridge } from './audio/FilterControlsBridge.svelte';
export { default as ADSREnvelope } from './audio/ADSREnvelope.svelte';
export { default as NotificationModal, notificationSystem } from './ui/NotificationModal.svelte';
export { default as ZoomIndicator } from './ui/ZoomIndicator.svelte';
export { default as DraggableNumber } from './ui/DraggableNumber.svelte';
export { default as CartesianSlider } from './ui/CartesianSlider.svelte';
