/**
 * Svelte UI Module
 *
 * Entry point for all Svelte components in the student-notation app.
 * This module manages mounting/unmounting and provides component exports.
 */

export { mountSvelteComponents, unmountSvelteComponents, mountComponent } from './mount.js';

// Export components for direct usage if needed
export { default as PlaybackControls } from './toolbar/PlaybackControls.svelte';
