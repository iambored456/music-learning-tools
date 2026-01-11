<script lang="ts">
  /**
   * ModulationBridge - Headless Svelte component
   *
   * This component attaches event handlers to modulation control buttons
   * (2:3, 3:2, and clear modulation markers).
   *
   * This replaces: src/components/toolbar/initializers/modulationInitializer.ts
   */
  import { onMount, onDestroy } from 'svelte';
  import store from '@state/initStore.ts';
  import { MODULATION_RATIOS } from '@/rhythm/modulationMapping.js';
  import logger from '@utils/logger.ts';
  import type { ModulationRatio } from '../../../../types/state.js';

  // DOM element references
  let modulation23Btn: HTMLElement | null = null;
  let modulation32Btn: HTMLElement | null = null;
  let modulationClearBtn: HTMLButtonElement | null = null;

  // Reactive state
  let selectedRatio = $state<ModulationRatio | null>(null);

  // Event handlers
  function handle23Click() {
    if (selectedRatio === MODULATION_RATIOS.COMPRESSION_2_3) {
      // Deactivate
      selectedRatio = null;
      modulation23Btn?.classList.remove('active');
      store.setSelectedTool('note');
      logger.info('ModulationBridge', '2:3 modulation tool deactivated', null, 'ui');
    } else {
      // Activate 2:3
      selectedRatio = MODULATION_RATIOS.COMPRESSION_2_3;
      modulation23Btn?.classList.add('active');
      modulation32Btn?.classList.remove('active');
      store.setSelectedTool('modulation');
      store.state.selectedModulationRatio = selectedRatio;
      logger.info('ModulationBridge', '2:3 modulation tool activated', null, 'ui');
    }
  }

  function handle32Click() {
    if (selectedRatio === MODULATION_RATIOS.EXPANSION_3_2) {
      // Deactivate
      selectedRatio = null;
      modulation32Btn?.classList.remove('active');
      store.setSelectedTool('note');
      logger.info('ModulationBridge', '3:2 modulation tool deactivated', null, 'ui');
    } else {
      // Activate 3:2
      selectedRatio = MODULATION_RATIOS.EXPANSION_3_2;
      modulation32Btn?.classList.add('active');
      modulation23Btn?.classList.remove('active');
      store.setSelectedTool('modulation');
      store.state.selectedModulationRatio = selectedRatio;
      logger.info('ModulationBridge', '3:2 modulation tool activated', null, 'ui');
    }
  }

  function handleClearClick() {
    const markerCount = (store.state.modulationMarkers || []).length;

    if (markerCount === 0) {
      logger.info('ModulationBridge', 'No modulation markers to clear', null, 'ui');
      return;
    }

    store.clearModulationMarkers();
    logger.info('ModulationBridge', `Cleared ${markerCount} modulation markers`, null, 'ui');
  }

  function updateClearButton() {
    if (!modulationClearBtn) return;
    const markerCount = (store.state.modulationMarkers || []).length;

    if (markerCount === 0) {
      modulationClearBtn.disabled = true;
      modulationClearBtn.style.opacity = '0.5';
    } else {
      modulationClearBtn.disabled = false;
      modulationClearBtn.style.opacity = '1';
    }

    modulationClearBtn.textContent = markerCount > 0 ? `Clear (${markerCount})` : 'Clear';
  }

  // Store event handlers
  interface ToolChangeEvent {
    newTool?: string;
  }

  function handleToolChanged(data: unknown) {
    const toolData = data as ToolChangeEvent | string;
    const newTool = typeof toolData === 'string' ? toolData : (toolData.newTool || toolData);
    if (newTool !== 'modulation') {
      selectedRatio = null;
      modulation23Btn?.classList.remove('active');
      modulation32Btn?.classList.remove('active');
    }
  }

  function handleMarkersChanged() {
    updateClearButton();
  }

  onMount(() => {
    // Find existing DOM elements
    modulation23Btn = document.getElementById('modulation-2-3-btn');
    modulation32Btn = document.getElementById('modulation-3-2-btn');
    modulationClearBtn = document.getElementById('modulation-clear-btn') as HTMLButtonElement | null;

    if (!modulation23Btn || !modulation32Btn || !modulationClearBtn) {
      logger.warn('ModulationBridge', 'Modulation control buttons not found in DOM', null, 'ui');
      return;
    }

    // Attach event listeners
    modulation23Btn.addEventListener('click', handle23Click);
    modulation32Btn.addEventListener('click', handle32Click);
    modulationClearBtn.addEventListener('click', handleClearClick);

    // Subscribe to store events
    store.on('toolChanged', handleToolChanged);
    store.on('modulationMarkersChanged', handleMarkersChanged);

    // Initialize button states
    updateClearButton();

    logger.info('ModulationBridge', 'Modulation controls initialized', null, 'ui');
    console.log('[Svelte] ModulationBridge mounted');
  });

  onDestroy(() => {
    // Remove event listeners
    modulation23Btn?.removeEventListener('click', handle23Click);
    modulation32Btn?.removeEventListener('click', handle32Click);
    modulationClearBtn?.removeEventListener('click', handleClearClick);

    console.log('[Svelte] ModulationBridge unmounted');
  });
</script>

<!-- This is a headless component - no DOM output -->
