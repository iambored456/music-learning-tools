<script lang="ts">
  /**
   * TabManagementBridge - Headless Svelte component
   *
   * This component manages all tab switching functionality:
   * - Main tabs (Timbre, Pitch, Rhythm)
   * - Preset/effects sub-tabs within Timbre tab
   * - Pitch sub-tabs (Range, Chords, Draw)
   */
  import logger from '@utils/logger.ts';
  import { invokeTempoSliderInitializer } from '@services/runtimeGlobals.ts';
  import {
    bindPitchTabButtons,
    restoreSavedPitchTabSelection
  } from './pitchTabState.ts';
  import {
    bindMainTabButtons,
    restoreSavedMainTabSelection
  } from './mainTabState.ts';
  import {
    bindPresetTabButtons,
    restoreSavedPresetTabSelection
  } from './presetTabState.ts';
  import { createTabBridgeSyncController } from './tabBridgeSync.ts';

  let mainTabButtons: NodeListOf<Element> | null = null;
  let presetTabButtons: NodeListOf<Element> | null = null;
  let pitchTabButtons: NodeListOf<Element> | null = null;

  const mainTabHandlers = new Map<Element, () => void>();
  const presetTabHandlers = new Map<Element, () => void>();
  const pitchTabHandlers = new Map<Element, () => void>();
  const tabBridgeSync = createTabBridgeSyncController();

  function normalizeToolbarStructure(): void {
    const tabContent = document.querySelector<HTMLElement>('.tab-content');
    const chordsPanel = document.getElementById('chords-panel');
    if (tabContent && chordsPanel) {
      chordsPanel.classList.remove('pitch-tab-panel');
      chordsPanel.classList.add('tab-panel');
      const rhythmPanel = document.getElementById('rhythm-panel');
      tabContent.insertBefore(chordsPanel, rhythmPanel);
    }

    document.querySelector<HTMLElement>('.pitch-tab-content')?.classList.add('pitch-combined-content');

    const generalPanel = document.getElementById('general-stamps-panel');
    const tempoPanel = document.querySelector<HTMLElement>('.rhythm-tempo-container');
    const rhythmPanel = document.getElementById('rhythm-panel');
    const stampTabs = rhythmPanel?.querySelector<HTMLElement>('.rhythm-stamp-tabs-container');
    if (generalPanel && rhythmPanel && stampTabs) {
      generalPanel.classList.remove('rhythm-stamp-tab-panel', 'active');
      generalPanel.classList.add('rhythm-general-panel');
      rhythmPanel.insertBefore(generalPanel, stampTabs);
      if (tempoPanel && tempoPanel.parentElement !== generalPanel) {
        generalPanel.appendChild(tempoPanel);
      }
    }
  }

  function initMainTabs(): void {
    const syncAfterActivate = (): void => {
      tabBridgeSync.observeElements();
      tabBridgeSync.scheduleSync();
    };
    const initializeTempoSlider = (delayMs: number): void => {
      setTimeout(() => {
        invokeTempoSliderInitializer();
      }, delayMs);
    };
    const stabilizeMainTabs = (): void => {
      tabBridgeSync.stabilizeMainTabButtonWidths();
    };

    restoreSavedMainTabSelection({
      initializeTempoSlider,
      stabilizeMainTabButtonWidths: stabilizeMainTabs,
      afterActivate: syncAfterActivate,
      onMissingTab: (tabId) => {
        logger.warn('TabManagement', `Could not restore tab: ${tabId}. Tab button or panel not found.`);
      }
    });

    mainTabButtons = document.querySelectorAll('.tab-button');
    stabilizeMainTabs();
    if (document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        stabilizeMainTabs();
      });
    }
    bindMainTabButtons(mainTabButtons, mainTabHandlers, {
      initializeTempoSlider,
      stabilizeMainTabButtonWidths: stabilizeMainTabs,
      afterActivate: syncAfterActivate,
      onMissingTab: (tabId) => {
        logger.warn('TabManagement', `Could not restore tab: ${tabId}. Tab button or panel not found.`);
      }
    });

    logger.info('TabManagementBridge', 'Main tabs initialized', null, 'ui');
  }

  function initPresetTabs(): void {
    const syncAfterActivate = (): void => {
      tabBridgeSync.observeElements();
      tabBridgeSync.scheduleSync();
    };

    restoreSavedPresetTabSelection({
      afterActivate: syncAfterActivate,
      onMissingTab: (tabId) => {
        logger.warn('TabManagement', `Could not restore preset tab: ${tabId}. Tab button or panel not found.`);
      }
    });

    presetTabButtons = document.querySelectorAll('.preset-tab-button');
    bindPresetTabButtons(presetTabButtons, presetTabHandlers, {
      afterActivate: syncAfterActivate,
      onMissingTab: (tabId) => {
        logger.warn('TabManagement', `Could not restore preset tab: ${tabId}. Tab button or panel not found.`);
      }
    });

    logger.info('TabManagementBridge', 'Preset tabs initialized', null, 'ui');
  }

  function initPitchTabs(): void {
    pitchTabButtons = document.querySelectorAll('.pitch-tab-button');
    restoreSavedPitchTabSelection();
    tabBridgeSync.observeElements();
    tabBridgeSync.scheduleSync();
    bindPitchTabButtons(pitchTabButtons, pitchTabHandlers, () => {
      tabBridgeSync.observeElements();
      tabBridgeSync.scheduleSync();
    });

    logger.info('TabManagementBridge', 'Pitch tabs initialized', null, 'ui');
  }

  $effect(() => {
    normalizeToolbarStructure();
    initMainTabs();
    initPresetTabs();
    tabBridgeSync.init();
    initPitchTabs();

    return () => {
      mainTabHandlers.forEach((handler, button) => {
        button.removeEventListener('click', handler);
      });
      mainTabHandlers.clear();

      presetTabHandlers.forEach((handler, button) => {
        button.removeEventListener('click', handler);
      });
      presetTabHandlers.clear();

      pitchTabHandlers.forEach((handler, button) => {
        button.removeEventListener('click', handler);
      });
      pitchTabHandlers.clear();

      tabBridgeSync.stop();
    };
  });
</script>

<!-- This is a headless component - no DOM output -->
