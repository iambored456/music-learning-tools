<script lang="ts">
  /**
   * TabManagementBridge - Headless Svelte component
   *
   * This component manages all tab switching functionality:
   * - Main tabs (Timbre, Pitch, Rhythm)
   * - Preset/effects sub-tabs within Timbre tab
   * - Pitch sub-tabs (Range, Chords, Draw)
   *
   * This replaces: src/bootstrap/ui/initTabManagement.ts
   */
  import logger from '@utils/logger.ts';

  // LocalStorage keys for tab persistence
  const SELECTED_TAB_KEY = 'selectedTab';
  const SELECTED_PRESET_TAB_KEY = 'selectedPresetTab';
  const DEFAULT_TAB = 'timbre';
  const DEFAULT_PRESET_TAB = 'presets';

  // Tab persistence functions
  function saveCurrentTab(tabId: string): void {
    try {
      localStorage.setItem(SELECTED_TAB_KEY, tabId);
      logger.debug('TabManagement', `Saved tab to localStorage: ${tabId}`, undefined, 'ui');
    } catch (e) {
      logger.warn('TabManagement', 'Failed to save tab to localStorage', e, 'ui');
    }
  }

  function getSavedTab(): string {
    try {
      const savedTab = localStorage.getItem(SELECTED_TAB_KEY);
      return savedTab || DEFAULT_TAB;
    } catch (e) {
      logger.warn('TabManagement', 'Failed to read tab from localStorage', e, 'ui');
      return DEFAULT_TAB;
    }
  }

  function saveCurrentPresetTab(tabId: string): void {
    try {
      localStorage.setItem(SELECTED_PRESET_TAB_KEY, tabId);
      logger.debug('TabManagement', `Saved preset tab to localStorage: ${tabId}`, undefined, 'ui');
    } catch (e) {
      logger.warn('TabManagement', 'Failed to save preset tab to localStorage', e, 'ui');
    }
  }

  function getSavedPresetTab(): string {
    try {
      const savedTab = localStorage.getItem(SELECTED_PRESET_TAB_KEY);
      return savedTab || DEFAULT_PRESET_TAB;
    } catch (e) {
      logger.warn('TabManagement', 'Failed to read preset tab from localStorage', e, 'ui');
      return DEFAULT_PRESET_TAB;
    }
  }

  // DOM references
  let mainTabButtons: NodeListOf<Element> | null = null;
  let presetTabButtons: NodeListOf<Element> | null = null;
  let pitchTabButtons: NodeListOf<Element> | null = null;

  // Click handlers stored for cleanup
  const mainTabHandlers = new Map<Element, () => void>();
  const presetTabHandlers = new Map<Element, () => void>();
  const pitchTabHandlers = new Map<Element, () => void>();

  type SizingDiagnosticsWindow = typeof window & {
    enablePresetEffectsSizingDiagnostics?: boolean;
    logPresetEffectsSizing?: (reason?: string) => void;
    enablePresetEffectsSizingAutoLog?: () => void;
    disablePresetEffectsSizingAutoLog?: () => void;
  };

  type SizingInfo = ReturnType<typeof getSizingInfo>;

  const sizingSelectors = [
    { label: 'effectsPanelActive', selector: '#effects-panel.preset-tab-panel.active' },
    { label: 'effectsPanel', selector: '#effects-panel' },
    { label: 'effectsContentBox', selector: '#effects-panel .effects-content-box' },
    { label: 'presetsPanelActive', selector: '#presets-panel.preset-tab-panel.active' },
    { label: 'presetsPanel', selector: '#presets-panel' },
    { label: 'presetContentBox', selector: '#presets-panel .preset-content-box' },
    { label: 'presetEffectsContent', selector: '.preset-effects-content' },
    { label: 'presetEffectsControls', selector: '.preset-effects-controls' },
    { label: 'presetEffectsContainer', selector: '.preset-effects-container' },
    { label: 'presetEffectsTabs', selector: '.preset-effects-tabs' }
  ];

  let sizingResizeObserver: ResizeObserver | null = null;
  let sizingMutationObserver: MutationObserver | null = null;
  const sizingObservedElements = new Map<Element, string>();
  let sizingScheduledFrame: number | null = null;
  let sizingScheduledReason = '';
  let sizingAutoLogEnabled = false;
  let lastSizingSignature: string | null = null;

  function getSizingInfo(node: Element | null, selector: string) {
    if (!node) {
      return { selector, missing: true };
    }

    const element = node as HTMLElement;
    const rect = element.getBoundingClientRect();
    const computed = window.getComputedStyle(element);
    const parent = element.parentElement;
    const parentRect = parent?.getBoundingClientRect();
    const parentComputed = parent ? window.getComputedStyle(parent) : null;

    return {
      selector,
      tag: element.tagName.toLowerCase(),
      id: element.id || null,
      className: element.className || null,
      rectWidth: Number(rect.width.toFixed(1)),
      rectHeight: Number(rect.height.toFixed(1)),
      offsetWidth: element.offsetWidth,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      computed: {
        display: computed.display,
        position: computed.position,
        width: computed.width,
        minWidth: computed.minWidth,
        maxWidth: computed.maxWidth,
        flex: computed.flex,
        flexGrow: computed.flexGrow,
        flexShrink: computed.flexShrink,
        flexBasis: computed.flexBasis,
        alignSelf: computed.alignSelf,
        alignItems: computed.alignItems,
        justifyContent: computed.justifyContent,
        justifySelf: (computed as CSSStyleDeclaration & { justifySelf?: string }).justifySelf,
        gap: computed.gap,
        boxSizing: computed.boxSizing,
        paddingLeft: computed.paddingLeft,
        paddingRight: computed.paddingRight,
        borderLeftWidth: computed.borderLeftWidth,
        borderRightWidth: computed.borderRightWidth,
        overflowX: computed.overflowX,
        overflowY: computed.overflowY
      },
      parent: parent
        ? {
            tag: parent.tagName.toLowerCase(),
            id: parent.id || null,
            className: parent.className || null,
            rectWidth: Number((parentRect?.width || 0).toFixed(1)),
            computedWidth: parentComputed?.width,
            display: parentComputed?.display,
            flex: parentComputed?.flex
          }
        : null
    };
  }

  function getSizingInfoList(selector: string) {
    const nodes = Array.from(document.querySelectorAll(selector));
    return {
      selector,
      count: nodes.length,
      entries: nodes.map((node, index) => ({
        index,
        ...getSizingInfo(node, selector)
      }))
    };
  }

  function getWidthChain(node: Element | null, selector: string, maxDepth = 4) {
    if (!node) {
      return { selector, missing: true, chain: [] };
    }

    const chain = [];
    let current: HTMLElement | null = node as HTMLElement;
    let depth = 0;

    while (current && depth < maxDepth) {
      const rect = current.getBoundingClientRect();
      const computed = window.getComputedStyle(current);
      chain.push({
        tag: current.tagName.toLowerCase(),
        id: current.id || null,
        className: current.className || null,
        rectWidth: Number(rect.width.toFixed(1)),
        offsetWidth: current.offsetWidth,
        clientWidth: current.clientWidth,
        computed: {
          display: computed.display,
          width: computed.width,
          minWidth: computed.minWidth,
          maxWidth: computed.maxWidth,
          flex: computed.flex,
          flexGrow: computed.flexGrow,
          flexShrink: computed.flexShrink,
          flexBasis: computed.flexBasis,
          alignItems: computed.alignItems,
          justifyContent: computed.justifyContent,
          alignSelf: computed.alignSelf,
          boxSizing: computed.boxSizing,
          paddingLeft: computed.paddingLeft,
          paddingRight: computed.paddingRight,
          gap: computed.gap
        }
      });
      current = current.parentElement;
      depth += 1;
    }

    return { selector, missing: false, chain };
  }

  function buildSizingSignature(payload: {
    activePresetTab: string | null;
    activePresetPanelId: string | null;
    elements: Record<string, any>;
  }): string {
    const elementKeys = Object.keys(payload.elements).sort();
    const snapshot: Record<string, unknown> = {
      activePresetTab: payload.activePresetTab,
      activePresetPanelId: payload.activePresetPanelId
    };

    elementKeys.forEach(key => {
      const entry = payload.elements[key];
      if (!entry || entry.missing) {
        snapshot[key] = 'missing';
        return;
      }
      snapshot[key] = {
        rectWidth: entry.rectWidth,
        rectHeight: entry.rectHeight,
        offsetWidth: entry.offsetWidth,
        clientWidth: entry.clientWidth,
        scrollWidth: entry.scrollWidth
      };
    });

    return JSON.stringify(snapshot);
  }

  function buildSizingComparison(leftLabel: string, left: SizingInfo, rightLabel: string, right: SizingInfo) {
    if ((left as { missing?: boolean }).missing || (right as { missing?: boolean }).missing) {
      return {
        pair: `${leftLabel} vs ${rightLabel}`,
        missing: true
      };
    }

    const metricKeys = ['rectWidth', 'offsetWidth', 'clientWidth', 'scrollWidth'];
    const computedKeys = [
      'display',
      'position',
      'width',
      'minWidth',
      'maxWidth',
      'flex',
      'alignSelf',
      'boxSizing',
      'paddingLeft',
      'paddingRight',
      'borderLeftWidth',
      'borderRightWidth',
      'overflowX',
      'overflowY'
    ];
    const parentKeys = ['computedWidth', 'display', 'flex'];
    const differences: Array<{ property: string; [key: string]: unknown }> = [];

    metricKeys.forEach(key => {
      const leftValue = (left as Record<string, unknown>)[key];
      const rightValue = (right as Record<string, unknown>)[key];
      if (leftValue !== rightValue) {
        differences.push({ property: key, [leftLabel]: leftValue, [rightLabel]: rightValue });
      }
    });

    computedKeys.forEach(key => {
      const leftValue = (left as any).computed?.[key];
      const rightValue = (right as any).computed?.[key];
      if (leftValue !== rightValue) {
        differences.push({ property: `computed.${key}`, [leftLabel]: leftValue, [rightLabel]: rightValue });
      }
    });

    parentKeys.forEach(key => {
      const leftValue = (left as any).parent?.[key];
      const rightValue = (right as any).parent?.[key];
      if (leftValue !== rightValue) {
        differences.push({ property: `parent.${key}`, [leftLabel]: leftValue, [rightLabel]: rightValue });
      }
    });

    return {
      pair: `${leftLabel} vs ${rightLabel}`,
      missing: false,
      differences
    };
  }

  function scheduleSizingLog(reason: string): void {
    if (!sizingAutoLogEnabled) {
      return;
    }
    sizingScheduledReason = sizingScheduledReason ? `${sizingScheduledReason}; ${reason}` : reason;
    if (sizingScheduledFrame !== null) {
      return;
    }
    sizingScheduledFrame = requestAnimationFrame(() => {
      const reasonToLog = sizingScheduledReason || 'auto';
      sizingScheduledFrame = null;
      sizingScheduledReason = '';
      logPresetEffectsSizing(reasonToLog);
    });
  }

  function attachSizingObservers(): void {
    if (!sizingResizeObserver) {
      return;
    }
    sizingSelectors.forEach(entry => {
      document.querySelectorAll(entry.selector).forEach(node => {
        if (sizingObservedElements.has(node)) {
          return;
        }
        sizingObservedElements.set(node, entry.label);
        sizingResizeObserver!.observe(node);
      });
    });
  }

  function startSizingAutoLog(): void {
    if (sizingResizeObserver) {
      return;
    }
    sizingAutoLogEnabled = true;
    lastSizingSignature = null;
    sizingResizeObserver = new ResizeObserver(entries => {
      const labels = entries
        .map(entry => sizingObservedElements.get(entry.target) || (entry.target as HTMLElement).id || entry.target.tagName.toLowerCase())
        .filter(Boolean);
      if (labels.length) {
        scheduleSizingLog(`Resize: ${labels.join(', ')}`);
      }
    });

    sizingMutationObserver = new MutationObserver(() => attachSizingObservers());
    if (document.body) {
      sizingMutationObserver.observe(document.body, { childList: true, subtree: true });
    } else {
      document.addEventListener(
        'DOMContentLoaded',
        () => {
          sizingMutationObserver?.observe(document.body, { childList: true, subtree: true });
          attachSizingObservers();
          scheduleSizingLog('init');
        },
        { once: true }
      );
    }

    window.addEventListener('resize', () => scheduleSizingLog('window resize'));
    attachSizingObservers();
    scheduleSizingLog('init');
  }

  function stopSizingAutoLog(): void {
    sizingAutoLogEnabled = false;
    lastSizingSignature = null;
    if (sizingResizeObserver) {
      sizingResizeObserver.disconnect();
      sizingResizeObserver = null;
    }
    if (sizingMutationObserver) {
      sizingMutationObserver.disconnect();
      sizingMutationObserver = null;
    }
    sizingObservedElements.clear();
    if (sizingScheduledFrame !== null) {
      cancelAnimationFrame(sizingScheduledFrame);
      sizingScheduledFrame = null;
    }
    sizingScheduledReason = '';
  }

  function logPresetEffectsSizing(reason: string): void {
    requestAnimationFrame(() => {
      const activePresetButton = document.querySelector('.preset-tab-button.active') as HTMLElement | null;
      const activePresetPanel = document.querySelector('.preset-tab-panel.active') as HTMLElement | null;
      const effectsPanelActive = getSizingInfo(
        document.querySelector('#effects-panel.preset-tab-panel.active'),
        '#effects-panel.preset-tab-panel.active'
      );
      const effectsPanel = getSizingInfo(document.getElementById('effects-panel'), '#effects-panel');
      const effectsContentBox = getSizingInfo(
        document.querySelector('#effects-panel .effects-content-box'),
        '#effects-panel .effects-content-box'
      );
      const presetsPanelActive = getSizingInfo(
        document.querySelector('#presets-panel.preset-tab-panel.active'),
        '#presets-panel.preset-tab-panel.active'
      );
      const presetsPanel = getSizingInfo(document.getElementById('presets-panel'), '#presets-panel');
      const presetContentBox = getSizingInfo(
        document.querySelector('#presets-panel .preset-content-box'),
        '#presets-panel .preset-content-box'
      );
      const presetEffectsContent = getSizingInfo(
        document.querySelector('.preset-effects-content'),
        '.preset-effects-content'
      );
      const presetEffectsControls = getSizingInfo(
        document.querySelector('.preset-effects-controls'),
        '.preset-effects-controls'
      );
      const presetEffectsContainer = getSizingInfo(
        document.querySelector('.preset-effects-container'),
        '.preset-effects-container'
      );
      const presetEffectsTabs = getSizingInfo(document.querySelector('.preset-effects-tabs'), '.preset-effects-tabs');

      const payload = {
        reason,
        activePresetTab: activePresetButton?.dataset?.presetTab || null,
        activePresetPanelId: activePresetPanel?.id || null,
        elements: {
          effectsPanelActive,
          effectsPanel,
          effectsContentBox,
          presetsPanelActive,
          presetsPanel,
          presetContentBox,
          presetEffectsContent,
          presetEffectsControls,
          presetEffectsContainer,
          presetEffectsTabs
        },
        comparisons: {
          activePanelVsEffectsContent: buildSizingComparison(
            'effectsPanelActive',
            (effectsPanelActive as { missing?: boolean }).missing ? effectsPanel : effectsPanelActive,
            'effectsContentBox',
            effectsContentBox
          ),
          panelVsEffectsContent: buildSizingComparison('effectsPanel', effectsPanel, 'effectsContentBox', effectsContentBox),
          contentBoxes: buildSizingComparison('effectsContentBox', effectsContentBox, 'presetContentBox', presetContentBox),
          panels: buildSizingComparison('effectsPanel', effectsPanel, 'presetsPanel', presetsPanel),
          tabsVsEffectsContent: buildSizingComparison('presetEffectsTabs', presetEffectsTabs, 'effectsContentBox', effectsContentBox)
        },
        chains: {
          effectsPanelActive: getWidthChain(
            document.querySelector('#effects-panel.preset-tab-panel.active'),
            '#effects-panel.preset-tab-panel.active'
          ),
          effectsContentBox: getWidthChain(
            document.querySelector('#effects-panel .effects-content-box'),
            '#effects-panel .effects-content-box'
          ),
          presetEffectsContent: getWidthChain(
            document.querySelector('.preset-effects-content'),
            '.preset-effects-content'
          )
        },
        lists: {
          presetTabButtons: getSizingInfoList('.preset-effects-tabs .preset-tab-button')
        }
      };

      const signature = buildSizingSignature(payload);
      const shouldDeduplicate =
        reason.startsWith('Resize') || reason === 'auto' || reason === 'init' || reason === 'window resize';

      if (shouldDeduplicate && signature === lastSizingSignature) {
        return;
      }

      lastSizingSignature = signature;
      console.groupCollapsed(`[Sizing] Preset/Effects widths (${reason})`);
      console.log(payload);
      console.groupEnd();
    });
  }

  function maybeLogPresetEffectsSizing(reason: string): void {
    const diagnosticsWindow = window as SizingDiagnosticsWindow;
    if (!diagnosticsWindow.enablePresetEffectsSizingDiagnostics) {
      return;
    }
    logPresetEffectsSizing(reason);
  }

  /**
   * Restore the saved tab from localStorage on page load
   */
  function restoreSavedTab(): void {
    const savedTab = getSavedTab();

    // Remove active class from all tabs
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));

    // Activate the saved tab (or default)
    const targetButton = document.querySelector(`[data-tab="${savedTab}"]`);
    const targetPanel = document.getElementById(`${savedTab}-panel`);

    if (targetButton && targetPanel) {
      targetButton.classList.add('active');
      targetPanel.classList.add('active');

      // Initialize tempo slider if rhythm tab is restored on page load
      if (savedTab === 'rhythm') {
        // Use a longer delay since page is still loading
        setTimeout(() => {
          const initTempoSlider = (window as any).initTempoSliderIfNeeded;
          if (typeof initTempoSlider === 'function') {
            initTempoSlider();
          }
        }, 200);
      }
    } else {
      logger.warn('TabManagement', `Could not restore tab: ${savedTab}. Tab button or panel not found.`);
    }
  }

  /**
   * Restore the saved preset tab from localStorage on page load
   */
  function restoreSavedPresetTab(): void {
    const savedTab = getSavedPresetTab();

    // Remove active class from all preset tabs (excluding disabled waveform button)
    document.querySelectorAll('.preset-tab-button:not([disabled])').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.preset-tab-panel').forEach(panel => panel.classList.remove('active'));

    // Activate the saved tab (or default)
    const targetButton = document.querySelector(`[data-preset-tab="${savedTab}"]`);
    const targetPanel = document.getElementById(`${savedTab}-panel`);

    if (targetButton && targetPanel && !targetButton.hasAttribute('disabled')) {
      targetButton.classList.add('active');
      targetPanel.classList.add('active');

      // Handle harmonic bins visibility based on which tab is active
      const overtoneBinsContainer = document.querySelector('.harmonic-bins-container') as HTMLElement | null;
      if (overtoneBinsContainer) {
        if (savedTab === 'effects') {
          overtoneBinsContainer.style.display = 'none';
        } else {
          overtoneBinsContainer.style.display = 'flex';
        }
      }
    } else {
      logger.warn('TabManagement', `Could not restore preset tab: ${savedTab}. Tab button or panel not found.`);
    }

    maybeLogPresetEffectsSizing('restore preset tab');
  }

  /**
   * Initialize main tab switching (Timbre, Pitch, Rhythm)
   */
  function initMainTabs(): void {
    // Restore saved tab on initialization
    restoreSavedTab();

    // Set up tab click handlers
    mainTabButtons = document.querySelectorAll('.tab-button');
    mainTabButtons.forEach(button => {
      const handler = () => {
        const tabId = (button as HTMLElement).dataset['tab'];
        if (!tabId) return;

        // Switch tabs
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
        const targetPanel = document.getElementById(`${tabId}-panel`);
        if (targetPanel) {
          targetPanel.classList.add('active');
        }

        // Save the selected tab to localStorage
        saveCurrentTab(tabId);

        // Initialize tempo slider if rhythm tab is activated
        if (tabId === 'rhythm') {
          setTimeout(() => {
            const initTempoSlider = (window as any).initTempoSliderIfNeeded;
            if (typeof initTempoSlider === 'function') {
              initTempoSlider();
            }
          }, 50); // Small delay to ensure tab content is fully visible
        }
      };

      button.addEventListener('click', handler);
      mainTabHandlers.set(button, handler);
    });

    logger.info('TabManagementBridge', 'Main tabs initialized', null, 'ui');
  }

  /**
   * Initialize preset/effects sub-tabs within the Timbre tab
   */
  function initPresetTabs(): void {
    // Restore saved preset tab on initialization
    restoreSavedPresetTab();

    presetTabButtons = document.querySelectorAll('.preset-tab-button');
    presetTabButtons.forEach(button => {
      const handler = () => {
        const tabId = (button as HTMLElement).dataset['presetTab'];
        if (!tabId) return;

        // Switch preset tabs
        document.querySelectorAll('.preset-tab-button:not([disabled])').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        document.querySelectorAll('.preset-tab-panel').forEach(panel => panel.classList.remove('active'));
        const targetPanel = document.getElementById(`${tabId}-panel`);
        if (targetPanel) {
          targetPanel.classList.add('active');
        }

        // Save the selected preset tab to localStorage
        saveCurrentPresetTab(tabId);

        // Hide harmonic bins when effects tabs are selected
        const overtoneBinsContainer = document.querySelector('.harmonic-bins-container') as HTMLElement | null;
        if (overtoneBinsContainer) {
          if (tabId === 'effects') {
            overtoneBinsContainer.style.display = 'none';
          } else {
            overtoneBinsContainer.style.display = 'flex';
          }
        }

        maybeLogPresetEffectsSizing(`preset tab click: ${tabId}`);
      };

      button.addEventListener('click', handler);
      presetTabHandlers.set(button, handler);
    });

    logger.info('TabManagementBridge', 'Preset tabs initialized', null, 'ui');
  }

  /**
   * Initialize pitch sub-tabs (Range, Chords, Draw) within the Pitch tab
   */
  function initPitchTabs(): void {
    pitchTabButtons = document.querySelectorAll('.pitch-tab-button');
    pitchTabButtons.forEach(button => {
      const handler = () => {
        const tabId = (button as HTMLElement).dataset['pitchTab'];
        if (!tabId) return;

        // Switch pitch tabs
        document.querySelectorAll('.pitch-tab-button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        document.querySelectorAll('.pitch-tab-panel').forEach(panel => panel.classList.remove('active'));
        const targetPanel = document.getElementById(`${tabId}-panel`);
        if (targetPanel) {
          targetPanel.classList.add('active');
        }
      };

      button.addEventListener('click', handler);
      pitchTabHandlers.set(button, handler);
    });

    logger.info('TabManagementBridge', 'Pitch tabs initialized', null, 'ui');
  }

  // Initialize tabs using Svelte 5 $effect()
  $effect(() => {
    initMainTabs();
    initPresetTabs();
    initPitchTabs();

    (window as SizingDiagnosticsWindow).logPresetEffectsSizing = (reason = 'manual') => {
      logPresetEffectsSizing(reason);
    };
    (window as SizingDiagnosticsWindow).enablePresetEffectsSizingAutoLog = () => {
      (window as SizingDiagnosticsWindow).enablePresetEffectsSizingDiagnostics = true;
      startSizingAutoLog();
    };
    (window as SizingDiagnosticsWindow).disablePresetEffectsSizingAutoLog = () => {
      (window as SizingDiagnosticsWindow).enablePresetEffectsSizingDiagnostics = false;
      stopSizingAutoLog();
    };

    if ((window as SizingDiagnosticsWindow).enablePresetEffectsSizingDiagnostics) {
      startSizingAutoLog();
    }

    console.log('[Svelte 5] TabManagementBridge mounted');

    // Cleanup on unmount
    return () => {
      // Remove main tab handlers
      mainTabHandlers.forEach((handler, button) => {
        button.removeEventListener('click', handler);
      });
      mainTabHandlers.clear();

      // Remove preset tab handlers
      presetTabHandlers.forEach((handler, button) => {
        button.removeEventListener('click', handler);
      });
      presetTabHandlers.clear();

      // Remove pitch tab handlers
      pitchTabHandlers.forEach((handler, button) => {
        button.removeEventListener('click', handler);
      });
      pitchTabHandlers.clear();

      // Stop sizing observers
      stopSizingAutoLog();

      console.log('[Svelte 5] TabManagementBridge unmounted');
    };
  });
</script>

<!-- This is a headless component - no DOM output -->
