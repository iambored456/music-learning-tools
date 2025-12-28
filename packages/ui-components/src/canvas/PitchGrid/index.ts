/**
 * PitchGrid Module
 *
 * Shared pitch grid visualization component for Music Learning Tools.
 * Supports multiple modes: notation editing, playback, singing practice, and note highway.
 */

// Export types
export * from './types.js';

// Export renderers (pure functions)
export * from './renderers/index.js';

// Export viewport windowing utilities
export * from './viewportWindowing.js';

// Export component
export { default as PitchGrid } from './PitchGrid.svelte';
