<script lang="ts" module>
  import { setContext, getContext } from 'svelte';
  import type { StoreInstance } from '@mlt/student-notation-engine';

  const STORE_CONTEXT_KEY = Symbol('store-context');

  export interface StoreContext {
    store: StoreInstance;
  }

  export function getStoreContext(): StoreContext {
    const context = getContext<StoreContext>(STORE_CONTEXT_KEY);
    if (!context) {
      throw new Error('StoreContext not found. Wrap your component tree with <StoreContext>');
    }
    return context;
  }
</script>

<script lang="ts">
  /**
   * StoreContext - Reactive store wrapper for Svelte components
   *
   * This replaces the imperative subscriptions in:
   * - src/bootstrap/state/initStateSubscriptions.ts
   *
   * Provides reactive access to store state and automatic subscription cleanup.
   * Child components can access the store via getStoreContext().
   */
  import store from '@state/initStore.ts';
  import LayoutService from '@services/layoutService.ts';
  import rhythmPlaybackService from '@services/rhythmPlaybackService.ts';
  import SynthEngine from '@services/initAudio.ts';
  import PitchGridController from '@components/canvas/PitchGrid/pitchGrid.ts';
  import DrumGridController from '@components/canvas/drumGrid/drumGrid.js';
  import logger from '@utils/logger.ts';

  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  // Set up context for child components
  setContext<StoreContext>(STORE_CONTEXT_KEY, { store });

  // Render function for grid updates
  function renderAll() {
    try {
      PitchGridController.render();
      DrumGridController.render?.();
      logger.debug('StoreContext', 'renderAll invoked', null, 'grid');
    } catch (err) {
      logger.error('StoreContext', 'renderAll failed', err, 'grid');
    }
  }

  // Subscribe to store events
  $effect(() => {
    // Tempo changes
    const handleTempoChanged = () => {
      SynthEngine.setBpm(store.state.tempo);
    };

    // Layout changes
    const handleLayoutChanged = () => {
      LayoutService.reflow();
    };

    // Rhythm playback updates
    const handleRhythmPatternChanged = () => {
      if (rhythmPlaybackService.refresh) {
        rhythmPlaybackService.refresh();
      }
    };

    // Layout config changes
    const handleLayoutConfigChanged = () => {
      PitchGridController.renderMacrobeatTools();
    };

    // Rhythm structure changes
    const handleRhythmStructureChanged = () => {
      // Recalculate layout to update column widths based on new macrobeat structure
      LayoutService.reflow();
    };

    // Modulation marker changes
    const handleModulationMarkersChanged = () => {
      // Reflow to recalculate canvas dimensions with modulation adjustments
      LayoutService.reflow();
      // Render to display the visual changes
      renderAll();
    };

    // Register event handlers
    store.on('tempoChanged', handleTempoChanged);
    store.on('layoutChanged', handleLayoutChanged);
    store.on('rhythmPatternChanged', handleRhythmPatternChanged);
    store.on('notesChanged', renderAll);
    store.on('sixteenthStampPlacementsChanged', renderAll);
    store.on('tripletStampPlacementsChanged', renderAll);
    store.on('accidentalModeChanged', renderAll);
    store.on('frequencyLabelsChanged', renderAll);
    store.on('focusColoursChanged', renderAll);
    store.on('octaveLabelsChanged', renderAll);
    store.on('degreeDisplayModeChanged', renderAll);
    store.on('longNoteStyleChanged', renderAll);
    store.on('layoutConfigChanged', handleLayoutConfigChanged);
    store.on('rhythmStructureChanged', handleRhythmStructureChanged);
    store.on('tempoModulationMarkersChanged', handleModulationMarkersChanged);

    logger.initSuccess('StoreContext');

    // Cleanup on unmount
    return () => {
      store.off('tempoChanged', handleTempoChanged);
      store.off('layoutChanged', handleLayoutChanged);
      store.off('rhythmPatternChanged', handleRhythmPatternChanged);
      store.off('notesChanged', renderAll);
      store.off('sixteenthStampPlacementsChanged', renderAll);
      store.off('tripletStampPlacementsChanged', renderAll);
      store.off('accidentalModeChanged', renderAll);
      store.off('frequencyLabelsChanged', renderAll);
      store.off('focusColoursChanged', renderAll);
      store.off('octaveLabelsChanged', renderAll);
      store.off('degreeDisplayModeChanged', renderAll);
      store.off('longNoteStyleChanged', renderAll);
      store.off('layoutConfigChanged', handleLayoutConfigChanged);
      store.off('rhythmStructureChanged', handleRhythmStructureChanged);
      store.off('tempoModulationMarkersChanged', handleModulationMarkersChanged);
    };
  });
</script>

{#if children}
  {@render children()}
{/if}
