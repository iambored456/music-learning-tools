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
  const PRESET_TAB_BRIDGE_LEFT_VAR = '--preset-tab-bridge-left';
  const PRESET_TAB_BRIDGE_WIDTH_VAR = '--preset-tab-bridge-width';
  const EFFECTS_TAB_BRIDGE_LEFT_VAR = '--effects-tab-bridge-left';
  const EFFECTS_TAB_BRIDGE_WIDTH_VAR = '--effects-tab-bridge-width';
  const PITCH_TAB_BRIDGE_LEFT_VAR = '--pitch-tab-bridge-left';
  const PITCH_TAB_BRIDGE_WIDTH_VAR = '--pitch-tab-bridge-width';
  const RHYTHM_TAB_BRIDGE_LEFT_VAR = '--rhythm-tab-bridge-left';
  const RHYTHM_TAB_BRIDGE_WIDTH_VAR = '--rhythm-tab-bridge-width';

  let presetTabBridgeSyncFrame: number | null = null;
  let presetTabBridgeResizeObserver: ResizeObserver | null = null;
  let presetTabBridgeMutationObserver: MutationObserver | null = null;
  const presetTabBridgeObservedElements = new Set<Element>();

  type SizingDiagnosticsWindow = typeof window & {
    enablePresetEffectsSizingDiagnostics?: boolean;
    logPresetEffectsSizing?: (reason?: string) => void;
    logPresetTabTypography?: (reason?: string) => void;
    logPitchTabSizing?: (reason?: string) => void;
    logRhythmTabSizing?: (reason?: string) => void;
    logAllTabSizing?: (reason?: string) => void;
    logTabBridgeComparison?: (reason?: string) => void;
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
    { label: 'presetEffectsTabs', selector: '.preset-effects-tabs' },
    { label: 'pitchTabs', selector: '.pitch-tabs' },
    { label: 'pitchTabContent', selector: '.pitch-tab-content' },
    { label: 'pitchTabPanelActive', selector: '.pitch-tab-panel.active' },
    { label: 'pitchContentBoxes', selector: '.range-content-box, .chords-content-box, .draw-content-box' },
    { label: 'rhythmTabStamps', selector: '.rhythm-tab-stamps' },
    { label: 'rhythmStampTabContent', selector: '.rhythm-stamp-tab-content' },
    { label: 'rhythmStampTabPanelActive', selector: '.rhythm-stamp-tab-panel.active' },
    { label: 'rhythmStampToolbar', selector: '.sixteenth-stamps-toolbar-container, .triplet-stamps-toolbar-container' }
  ];

  let sizingResizeObserver: ResizeObserver | null = null;
  let sizingMutationObserver: MutationObserver | null = null;
  const sizingObservedElements = new Map<Element, string>();
  let sizingScheduledFrame: number | null = null;
  let sizingScheduledReason = '';
  let sizingAutoLogEnabled = false;
  let lastSizingSignature: string | null = null;
  let lastPitchSizingSignature: string | null = null;
  let lastRhythmSizingSignature: string | null = null;

  function syncTabBridge(
    activeTabButton: HTMLElement | null,
    activeContentBox: HTMLElement | null,
    tabClassName: string,
    leftVarName: string,
    widthVarName: string,
    options?: {
      preserveSharedLeftSeam?: boolean;
      trimRightBorder?: boolean;
      extraRightBorderTrimCount?: number;
    }
  ): void {
    if (!activeTabButton || !activeContentBox) {
      return;
    }

    const buttonRect = activeTabButton.getBoundingClientRect();
    const boxRect = activeContentBox.getBoundingClientRect();
    const buttonStyles = window.getComputedStyle(activeTabButton);
    const borderLeft = Number.parseFloat(buttonStyles.borderLeftWidth) || 0;
    const borderRight = Number.parseFloat(buttonStyles.borderRightWidth) || 0;
    const activeMarginLeft = Number.parseFloat(buttonStyles.marginLeft) || 0;
    const previousTab = activeTabButton.previousElementSibling as HTMLElement | null;
    const nextTab = activeTabButton.nextElementSibling as HTMLElement | null;
    const nextTabStyles = nextTab ? window.getComputedStyle(nextTab) : null;
    const nextTabMarginLeft = Number.parseFloat(nextTabStyles?.marginLeft || '0') || 0;
    const contentStyles = window.getComputedStyle(activeContentBox);
    const contentTopLeftRadius = Number.parseFloat(contentStyles.borderTopLeftRadius) || 0;

    const hasPreviousTab =
      !!previousTab && previousTab.classList.contains(tabClassName) && !(previousTab as HTMLButtonElement).disabled;
    const hasNextTab = !!nextTab && nextTab.classList.contains(tabClassName) && !(nextTab as HTMLButtonElement).disabled;

    const overlapFromPrevious = hasPreviousTab ? Math.max(0, -activeMarginLeft) : 0;
    const overlapFromNext = hasNextTab ? Math.max(0, -nextTabMarginLeft) : 0;
    // Trim the shared seam once (max of border and overlap), not twice.
    let leftTrim = hasPreviousTab ? Math.max(borderLeft, overlapFromPrevious) : 0;
    let rightTrim = hasNextTab ? Math.max(borderRight, overlapFromNext) : 0;

    if (options?.preserveSharedLeftSeam && hasPreviousTab && overlapFromPrevious > 0) {
      leftTrim = Math.max(leftTrim - Math.min(borderLeft, overlapFromPrevious), 0);
    }

    if (options?.trimRightBorder) {
      rightTrim = Math.max(rightTrim, borderRight);
    }

    // Preserve a rounded leading outer corner by keeping the seam bridge off that corner arc.
    if (!hasPreviousTab && contentTopLeftRadius > 0) {
      leftTrim += contentTopLeftRadius;
    }

    const extraRightTrimCount = options?.extraRightBorderTrimCount ?? 0;
    if (extraRightTrimCount > 0 && borderRight > 0) {
      rightTrim += borderRight * extraRightTrimCount;
    }
    const bridgeWidth = Math.max(buttonRect.width - leftTrim - rightTrim, 0);

    if (bridgeWidth <= 0 || boxRect.width <= 0) {
      return;
    }

    const rawLeft = buttonRect.left - boxRect.left + leftTrim;
    const maxLeft = Math.max(boxRect.width - bridgeWidth, 0);
    const clampedLeft = Math.min(Math.max(rawLeft, 0), maxLeft);

    activeContentBox.style.setProperty(leftVarName, `${clampedLeft.toFixed(2)}px`);
    activeContentBox.style.setProperty(widthVarName, `${bridgeWidth.toFixed(2)}px`);
  }

  function stabilizeTabButtonWidths(selector: string): void {
    const buttonNodes = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
    for (const button of buttonNodes) {
      const measuredLabel = measurePresetTabLabelWidths(button);
      if (!measuredLabel) {
        continue;
      }

      const computed = window.getComputedStyle(button);
      const paddingLeft = Number.parseFloat(computed.paddingLeft) || 0;
      const paddingRight = Number.parseFloat(computed.paddingRight) || 0;
      const borderLeft = Number.parseFloat(computed.borderLeftWidth) || 0;
      const borderRight = Number.parseFloat(computed.borderRightWidth) || 0;
      const targetLabelWidth = Math.max(measuredLabel.regular, measuredLabel.bold);
      const targetWidth = Math.ceil(targetLabelWidth + paddingLeft + paddingRight + borderLeft + borderRight);
      const targetWidthValue = `${targetWidth}px`;

      if (button.style.minWidth !== targetWidthValue) {
        button.style.minWidth = targetWidthValue;
      }
    }
  }

  function stabilizePresetTabButtonWidths(): void {
    stabilizeTabButtonWidths('.preset-effects-tabs .preset-tab-button');
  }

  function stabilizeMainTabButtonWidths(): void {
    const buttonNodes = Array.from(document.querySelectorAll('.tab-sidebar .tab-button')) as HTMLElement[];
    if (buttonNodes.length === 0) {
      return;
    }

    let targetWidth = 0;
    for (const button of buttonNodes) {
      const measuredLabel = measurePresetTabLabelWidths(button);
      if (!measuredLabel) {
        continue;
      }

      const computed = window.getComputedStyle(button);
      const paddingLeft = Number.parseFloat(computed.paddingLeft) || 0;
      const paddingRight = Number.parseFloat(computed.paddingRight) || 0;
      const borderLeft = Number.parseFloat(computed.borderLeftWidth) || 0;
      const borderRight = Number.parseFloat(computed.borderRightWidth) || 0;
      const labelWidth = Math.max(measuredLabel.regular, measuredLabel.bold);
      const buttonTargetWidth = Math.ceil(labelWidth + paddingLeft + paddingRight + borderLeft + borderRight);
      targetWidth = Math.max(targetWidth, buttonTargetWidth);
    }

    if (targetWidth <= 0) {
      return;
    }

    const targetWidthValue = `${targetWidth}px`;
    for (const button of buttonNodes) {
      if (button.style.width !== targetWidthValue) {
        button.style.width = targetWidthValue;
      }
      if (button.style.minWidth !== targetWidthValue) {
        button.style.minWidth = targetWidthValue;
      }
      if (button.style.maxWidth !== targetWidthValue) {
        button.style.maxWidth = targetWidthValue;
      }
    }

    const tabSidebar = document.querySelector('.tab-sidebar') as HTMLElement | null;
    if (tabSidebar) {
      if (tabSidebar.style.width !== targetWidthValue) {
        tabSidebar.style.width = targetWidthValue;
      }
      if (tabSidebar.style.minWidth !== targetWidthValue) {
        tabSidebar.style.minWidth = targetWidthValue;
      }
    }
  }

  function syncPresetTabBridge(): void {
    stabilizePresetTabButtonWidths();

    const activePresetButton = document.querySelector('.preset-effects-tabs .preset-tab-button.active') as HTMLElement | null;
    const activePresetPanel = document.querySelector('.preset-tab-panel.active') as HTMLElement | null;
    const isEffectsPanel = activePresetPanel?.id === 'effects-panel';
    const activeContentBox = activePresetPanel?.querySelector(
      isEffectsPanel ? '.effects-content-box' : '.preset-content-box'
    ) as HTMLElement | null;
    const leftVarName = isEffectsPanel ? EFFECTS_TAB_BRIDGE_LEFT_VAR : PRESET_TAB_BRIDGE_LEFT_VAR;
    const widthVarName = isEffectsPanel ? EFFECTS_TAB_BRIDGE_WIDTH_VAR : PRESET_TAB_BRIDGE_WIDTH_VAR;

    syncTabBridge(
      activePresetButton,
      activeContentBox,
      'preset-tab-button',
      leftVarName,
      widthVarName,
      {
        preserveSharedLeftSeam: true,
        trimRightBorder: true,
        extraRightBorderTrimCount: 1
      }
    );
  }

  function syncPitchTabBridge(): void {
    stabilizeTabButtonWidths('.pitch-tabs .pitch-tab-button');

    const activePitchButton = document.querySelector('.pitch-tabs .pitch-tab-button.active') as HTMLElement | null;
    const activePitchPanel = document.querySelector('.pitch-tab-panel.active') as HTMLElement | null;
    const activeContentBox = activePitchPanel?.querySelector(
      '.range-content-box, .chords-content-box, .draw-content-box'
    ) as HTMLElement | null;

    syncTabBridge(
      activePitchButton,
      activeContentBox,
      'pitch-tab-button',
      PITCH_TAB_BRIDGE_LEFT_VAR,
      PITCH_TAB_BRIDGE_WIDTH_VAR,
      {
        preserveSharedLeftSeam: true,
        trimRightBorder: true,
        extraRightBorderTrimCount: 1
      }
    );
  }

  function isVisibleElement(node: HTMLElement): boolean {
    const computed = window.getComputedStyle(node);
    return computed.display !== 'none' && computed.visibility !== 'hidden';
  }

  function getActiveRhythmContentBox(activeRhythmPanel: HTMLElement | null): HTMLElement | null {
    const rhythmContentNodes = activeRhythmPanel?.querySelectorAll(
      '.sixteenth-stamps-toolbar-container, .triplet-stamps-toolbar-container'
    );
    if (!rhythmContentNodes || rhythmContentNodes.length === 0) {
      return null;
    }

    const contentCandidates = Array.from(rhythmContentNodes) as HTMLElement[];
    return contentCandidates.find(node => isVisibleElement(node)) || contentCandidates[0];
  }

  function syncRhythmStampTabBridge(): void {
    stabilizeTabButtonWidths('.rhythm-tab-stamps .rhythm-stamp-tab-button');

    const activeRhythmButton = document.querySelector('.rhythm-tab-stamps .rhythm-stamp-tab-button.active') as HTMLElement | null;
    const activeRhythmPanel = document.querySelector('.rhythm-stamp-tab-panel.active') as HTMLElement | null;
    const activeContentBox = getActiveRhythmContentBox(activeRhythmPanel);

    syncTabBridge(
      activeRhythmButton,
      activeContentBox,
      'rhythm-stamp-tab-button',
      RHYTHM_TAB_BRIDGE_LEFT_VAR,
      RHYTHM_TAB_BRIDGE_WIDTH_VAR,
      {
        preserveSharedLeftSeam: true,
        trimRightBorder: true
      }
    );
  }

  function syncAllTabBridges(): void {
    stabilizeMainTabButtonWidths();
    syncPresetTabBridge();
    syncPitchTabBridge();
    syncRhythmStampTabBridge();
  }

  function schedulePresetTabBridgeSync(): void {
    if (presetTabBridgeSyncFrame !== null) {
      return;
    }

    presetTabBridgeSyncFrame = requestAnimationFrame(() => {
      presetTabBridgeSyncFrame = null;
      syncAllTabBridges();
      maybeLogPresetEffectsSizing('bridge sync frame');
    });
  }

  function observePresetTabBridgeElements(): void {
    if (!presetTabBridgeResizeObserver) {
      return;
    }

    const selectors = [
      '.tab-sidebar',
      '.tab-sidebar .tab-button',
      '.preset-effects-tabs',
      '.preset-effects-content',
      '.preset-tab-button',
      '.preset-tab-panel',
      '.preset-content-box',
      '.effects-content-box',
      '.pitch-tabs',
      '.pitch-tab-content',
      '.pitch-tab-button',
      '.pitch-tab-panel',
      '.range-content-box',
      '.chords-content-box',
      '.draw-content-box',
      '.rhythm-tab-stamps',
      '.rhythm-stamp-tab-content',
      '.rhythm-stamp-tab-button',
      '.rhythm-stamp-tab-panel',
      '.sixteenth-stamps-toolbar-container',
      '.triplet-stamps-toolbar-container'
    ];

    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(node => {
        if (presetTabBridgeObservedElements.has(node)) {
          return;
        }
        presetTabBridgeObservedElements.add(node);
        presetTabBridgeResizeObserver?.observe(node);
        presetTabBridgeMutationObserver?.observe(node, {
          attributes: true,
          attributeFilter: ['class', 'style']
        });
      });
    });
  }

  function initPresetTabBridgeSync(): void {
    if (presetTabBridgeResizeObserver) {
      return;
    }

    presetTabBridgeResizeObserver = new ResizeObserver(() => {
      observePresetTabBridgeElements();
      schedulePresetTabBridgeSync();
    });

    presetTabBridgeMutationObserver = new MutationObserver(mutations => {
      if (mutations.length === 0) {
        return;
      }
      observePresetTabBridgeElements();
      schedulePresetTabBridgeSync();
    });

    observePresetTabBridgeElements();
    window.addEventListener('resize', schedulePresetTabBridgeSync);
    schedulePresetTabBridgeSync();
  }

  function stopPresetTabBridgeSync(): void {
    window.removeEventListener('resize', schedulePresetTabBridgeSync);

    if (presetTabBridgeResizeObserver) {
      presetTabBridgeResizeObserver.disconnect();
      presetTabBridgeResizeObserver = null;
    }
    if (presetTabBridgeMutationObserver) {
      presetTabBridgeMutationObserver.disconnect();
      presetTabBridgeMutationObserver = null;
    }
    presetTabBridgeObservedElements.clear();

    if (presetTabBridgeSyncFrame !== null) {
      cancelAnimationFrame(presetTabBridgeSyncFrame);
      presetTabBridgeSyncFrame = null;
    }
  }

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
      rectTop: Number(rect.top.toFixed(1)),
      rectBottom: Number(rect.bottom.toFixed(1)),
      rectLeft: Number(rect.left.toFixed(1)),
      rectRight: Number(rect.right.toFixed(1)),
      rectWidth: Number(rect.width.toFixed(1)),
      rectHeight: Number(rect.height.toFixed(1)),
      offsetWidth: element.offsetWidth,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      offsetHeight: element.offsetHeight,
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      computed: {
        display: computed.display,
        position: computed.position,
        zIndex: computed.zIndex,
        width: computed.width,
        height: computed.height,
        minWidth: computed.minWidth,
        maxWidth: computed.maxWidth,
        minHeight: computed.minHeight,
        maxHeight: computed.maxHeight,
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
        paddingTop: computed.paddingTop,
        paddingBottom: computed.paddingBottom,
        paddingLeft: computed.paddingLeft,
        paddingRight: computed.paddingRight,
        marginTop: computed.marginTop,
        marginBottom: computed.marginBottom,
        borderTopWidth: computed.borderTopWidth,
        borderBottomWidth: computed.borderBottomWidth,
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

  function measurePresetTabLabelWidths(button: HTMLElement): { regular: number; bold: number; delta: number } | null {
    if (!document.body) {
      return null;
    }

    const label = button.textContent?.trim() || '';
    if (!label) {
      return null;
    }

    const computed = window.getComputedStyle(button);
    const probe = document.createElement('span');
    probe.textContent = label;
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    probe.style.whiteSpace = 'nowrap';
    probe.style.fontFamily = computed.fontFamily;
    probe.style.fontSize = computed.fontSize;
    probe.style.fontStyle = computed.fontStyle;
    probe.style.fontVariant = computed.fontVariant;
    probe.style.letterSpacing = computed.letterSpacing;
    probe.style.textTransform = computed.textTransform;
    probe.style.fontWeight = '500';
    document.body.appendChild(probe);
    const regular = probe.getBoundingClientRect().width;
    probe.style.fontWeight = '600';
    const bold = probe.getBoundingClientRect().width;
    probe.remove();

    return {
      regular: Number(regular.toFixed(2)),
      bold: Number(bold.toFixed(2)),
      delta: Number((bold - regular).toFixed(2))
    };
  }

  function getPresetTabButtonMetrics() {
    const tabsContainer = document.querySelector('.preset-effects-tabs') as HTMLElement | null;
    const buttonNodes = Array.from(document.querySelectorAll('.preset-effects-tabs .preset-tab-button')) as HTMLElement[];

    const buttons = buttonNodes.map((button, index) => {
      const rect = button.getBoundingClientRect();
      const computed = window.getComputedStyle(button);
      const measuredLabel = measurePresetTabLabelWidths(button);
      const datasetTab = button.dataset?.presetTab || null;

      return {
        index,
        presetTab: datasetTab,
        label: button.textContent?.trim() || '',
        active: button.classList.contains('active'),
        disabled: button.hasAttribute('disabled'),
        rectWidth: Number(rect.width.toFixed(2)),
        offsetWidth: button.offsetWidth,
        clientWidth: button.clientWidth,
        scrollWidth: button.scrollWidth,
        fontWeight: computed.fontWeight,
        fontSize: computed.fontSize,
        letterSpacing: computed.letterSpacing,
        marginLeft: computed.marginLeft,
        borderLeftWidth: computed.borderLeftWidth,
        borderRightWidth: computed.borderRightWidth,
        paddingLeft: computed.paddingLeft,
        paddingRight: computed.paddingRight,
        transform: computed.transform,
        measuredLabel
      };
    });

    const activePanel = document.querySelector('.preset-tab-panel.active') as HTMLElement | null;
    const activeContentBox = activePanel?.querySelector('.preset-content-box, .effects-content-box') as HTMLElement | null;
    const bridgeVars = activeContentBox
      ? {
          panelId: activePanel?.id || null,
          className: activeContentBox.className,
          presetLeft: activeContentBox.style.getPropertyValue(PRESET_TAB_BRIDGE_LEFT_VAR).trim() || null,
          presetWidth: activeContentBox.style.getPropertyValue(PRESET_TAB_BRIDGE_WIDTH_VAR).trim() || null,
          effectsLeft: activeContentBox.style.getPropertyValue(EFFECTS_TAB_BRIDGE_LEFT_VAR).trim() || null,
          effectsWidth: activeContentBox.style.getPropertyValue(EFFECTS_TAB_BRIDGE_WIDTH_VAR).trim() || null
        }
      : { missing: true };

    return {
      tabsContainer: tabsContainer ? getSizingInfo(tabsContainer, '.preset-effects-tabs') : { missing: true },
      buttonCount: buttons.length,
      buttons,
      bridgeVars
    };
  }

  function logPresetTabTypography(reason: string): void {
    requestAnimationFrame(() => {
      const metrics = getPresetTabButtonMetrics();
      console.groupCollapsed(`[Sizing] Preset tab typography (${reason})`);
      console.log(metrics);
      if (metrics.buttons.length) {
        console.table(
          metrics.buttons.map(button => ({
            index: button.index,
            tab: button.presetTab,
            label: button.label,
            active: button.active,
            rectWidth: button.rectWidth,
            fontWeight: button.fontWeight,
            transform: button.transform,
            labelRegular: button.measuredLabel?.regular ?? null,
            labelBold: button.measuredLabel?.bold ?? null,
            labelDelta: button.measuredLabel?.delta ?? null
          }))
        );
      }
      console.groupEnd();
    });
  }

  function getVerticalRelationship(topNode: Element | null, bottomNode: Element | null, pair: string) {
    if (!topNode || !bottomNode) {
      return {
        pair,
        missing: true
      };
    }

    const topRect = (topNode as HTMLElement).getBoundingClientRect();
    const bottomRect = (bottomNode as HTMLElement).getBoundingClientRect();
    const rawGap = bottomRect.top - topRect.bottom;
    const overlapPx = Math.max(topRect.bottom - bottomRect.top, 0);

    return {
      pair,
      missing: false,
      topBottom: Number(topRect.bottom.toFixed(2)),
      bottomTop: Number(bottomRect.top.toFixed(2)),
      gapPx: Number(rawGap.toFixed(2)),
      overlapPx: Number(overlapPx.toFixed(2))
    };
  }

  function getPitchTabButtonMetrics() {
    const tabsContainer = document.querySelector('.pitch-tabs') as HTMLElement | null;
    const buttonNodes = Array.from(document.querySelectorAll('.pitch-tabs .pitch-tab-button')) as HTMLElement[];
    const activeButton = buttonNodes.find(node => node.classList.contains('active')) || null;
    const activePanel = document.querySelector('.pitch-tab-panel.active') as HTMLElement | null;
    const activeContentBox = activePanel?.querySelector(
      '.range-content-box, .chords-content-box, .draw-content-box, .intervals-content-box, .tonic-content-box'
    ) as HTMLElement | null;

    const buttons = buttonNodes.map((button, index) => {
      const rect = button.getBoundingClientRect();
      const computed = window.getComputedStyle(button);
      const measuredLabel = measurePresetTabLabelWidths(button);
      return {
        index,
        pitchTab: button.dataset?.pitchTab || null,
        label: button.textContent?.trim() || '',
        active: button.classList.contains('active'),
        disabled: button.hasAttribute('disabled'),
        rectWidth: Number(rect.width.toFixed(2)),
        rectHeight: Number(rect.height.toFixed(2)),
        fontWeight: computed.fontWeight,
        marginBottom: computed.marginBottom,
        borderTopWidth: computed.borderTopWidth,
        borderBottomWidth: computed.borderBottomWidth,
        transform: computed.transform,
        measuredLabel
      };
    });

    const bridgeVars = activeContentBox
      ? {
          panelId: activePanel?.id || null,
          className: activeContentBox.className,
          pitchLeft: activeContentBox.style.getPropertyValue(PITCH_TAB_BRIDGE_LEFT_VAR).trim() || null,
          pitchWidth: activeContentBox.style.getPropertyValue(PITCH_TAB_BRIDGE_WIDTH_VAR).trim() || null
        }
      : { missing: true };

    return {
      tabsContainer: tabsContainer ? getSizingInfo(tabsContainer, '.pitch-tabs') : { missing: true },
      tabContent: getSizingInfo(document.querySelector('.pitch-tab-content'), '.pitch-tab-content'),
      activePanel: activePanel ? getSizingInfo(activePanel, '.pitch-tab-panel.active') : { missing: true },
      activeContentBox: activeContentBox ? getSizingInfo(activeContentBox, '.active pitch content box') : { missing: true },
      buttonCount: buttons.length,
      buttons,
      bridgeVars,
      vertical: {
        tabsToContent: getVerticalRelationship(tabsContainer, activeContentBox, '.pitch-tabs -> active content box'),
        activeButtonToContent: getVerticalRelationship(activeButton, activeContentBox, 'active pitch button -> active content box')
      }
    };
  }

  function getRhythmTabButtonMetrics() {
    const tabsContainer = document.querySelector('.rhythm-tab-stamps') as HTMLElement | null;
    const buttonNodes = Array.from(document.querySelectorAll('.rhythm-tab-stamps .rhythm-stamp-tab-button')) as HTMLElement[];
    const activeButton = buttonNodes.find(node => node.classList.contains('active')) || null;
    const activePanel = document.querySelector('.rhythm-stamp-tab-panel.active') as HTMLElement | null;
    const activeContentBox = getActiveRhythmContentBox(activePanel);

    const buttons = buttonNodes.map((button, index) => {
      const rect = button.getBoundingClientRect();
      const computed = window.getComputedStyle(button);
      const measuredLabel = measurePresetTabLabelWidths(button);
      return {
        index,
        rhythmTab: button.dataset?.rhythmStampTab || null,
        label: button.textContent?.trim() || '',
        active: button.classList.contains('active'),
        disabled: button.hasAttribute('disabled'),
        rectWidth: Number(rect.width.toFixed(2)),
        rectHeight: Number(rect.height.toFixed(2)),
        fontWeight: computed.fontWeight,
        marginBottom: computed.marginBottom,
        borderTopWidth: computed.borderTopWidth,
        borderBottomWidth: computed.borderBottomWidth,
        transform: computed.transform,
        measuredLabel
      };
    });

    const bridgeVars = activeContentBox
      ? {
          panelId: activePanel?.id || null,
          className: activeContentBox.className,
          rhythmLeft: activeContentBox.style.getPropertyValue(RHYTHM_TAB_BRIDGE_LEFT_VAR).trim() || null,
          rhythmWidth: activeContentBox.style.getPropertyValue(RHYTHM_TAB_BRIDGE_WIDTH_VAR).trim() || null
        }
      : { missing: true };

    return {
      tabsContainer: tabsContainer ? getSizingInfo(tabsContainer, '.rhythm-tab-stamps') : { missing: true },
      tabContent: getSizingInfo(document.querySelector('.rhythm-stamp-tab-content'), '.rhythm-stamp-tab-content'),
      activePanel: activePanel ? getSizingInfo(activePanel, '.rhythm-stamp-tab-panel.active') : { missing: true },
      activeContentBox: activeContentBox
        ? getSizingInfo(activeContentBox, '.active rhythm toolbar container')
        : { missing: true },
      buttonCount: buttons.length,
      buttons,
      bridgeVars,
      vertical: {
        tabsToContent: getVerticalRelationship(tabsContainer, activeContentBox, '.rhythm-tab-stamps -> active content box'),
        activeButtonToContent: getVerticalRelationship(activeButton, activeContentBox, 'active rhythm button -> active content box')
      }
    };
  }

  function getPseudoBeforeInfo(node: Element | null) {
    if (!node) {
      return { missing: true };
    }

    const element = node as HTMLElement;
    const before = window.getComputedStyle(element, '::before');
    const content = before.content;
    const hasContent = !!content && content !== 'none' && content !== 'normal' && content !== '""';
    return {
      missing: false,
      hasContent,
      content,
      display: before.display,
      position: before.position,
      top: before.top,
      left: before.left,
      width: before.width,
      height: before.height,
      zIndex: before.zIndex,
      backgroundColor: before.backgroundColor
    };
  }

  function getBridgeVarSnapshot(node: Element | null, leftVarName: string, widthVarName: string) {
    if (!node) {
      return { missing: true };
    }
    const element = node as HTMLElement;
    const computed = window.getComputedStyle(element);
    return {
      missing: false,
      leftInline: element.style.getPropertyValue(leftVarName).trim() || null,
      widthInline: element.style.getPropertyValue(widthVarName).trim() || null,
      leftComputed: computed.getPropertyValue(leftVarName).trim() || null,
      widthComputed: computed.getPropertyValue(widthVarName).trim() || null
    };
  }

  function getTabBridgeSystemMetrics(config: {
    system: 'timbre' | 'pitch' | 'rhythm';
    mainTabId: 'timbre' | 'pitch' | 'rhythm';
    tabsSelector: string;
    activeButtonSelector: string;
    activePanelSelector: string;
    leftVarName: string;
    widthVarName: string;
    resolveBridgeVarNames?: (
      activePanel: HTMLElement | null
    ) => {
      leftVarName: string;
      widthVarName: string;
    };
    resolveContentBox: (activePanel: HTMLElement | null) => HTMLElement | null;
  }) {
    const tabsContainer = document.querySelector(config.tabsSelector) as HTMLElement | null;
    const activeButton = document.querySelector(config.activeButtonSelector) as HTMLElement | null;
    const activePanel = document.querySelector(config.activePanelSelector) as HTMLElement | null;
    const activeContentBox = config.resolveContentBox(activePanel);
    const mainTabButton = document.querySelector(`.tab-button[data-tab="${config.mainTabId}"]`) as HTMLElement | null;
    const mainTabPanel = document.getElementById(`${config.mainTabId}-panel`) as HTMLElement | null;

    const tabsComputed = tabsContainer ? window.getComputedStyle(tabsContainer) : null;
    const buttonComputed = activeButton ? window.getComputedStyle(activeButton) : null;
    const contentComputed = activeContentBox ? window.getComputedStyle(activeContentBox) : null;

    const tabsRect = tabsContainer?.getBoundingClientRect();
    const buttonRect = activeButton?.getBoundingClientRect();
    const contentRect = activeContentBox?.getBoundingClientRect();

    const tabsToContent = getVerticalRelationship(
      tabsContainer,
      activeContentBox,
      `${config.system}: tabs -> content`
    );
    const buttonToContent = getVerticalRelationship(
      activeButton,
      activeContentBox,
      `${config.system}: active button -> content`
    );
    const bridgeVarNames =
      config.resolveBridgeVarNames?.(activePanel) || {
        leftVarName: config.leftVarName,
        widthVarName: config.widthVarName
      };
    const bridgeVarsSnapshot = getBridgeVarSnapshot(
      activeContentBox,
      bridgeVarNames.leftVarName,
      bridgeVarNames.widthVarName
    );
    const beforeInfo = getPseudoBeforeInfo(activeContentBox);

    return {
      system: config.system,
      mainTab: {
        id: config.mainTabId,
        buttonActive: !!mainTabButton?.classList.contains('active'),
        panelActive: !!mainTabPanel?.classList.contains('active')
      },
      selectors: {
        tabs: config.tabsSelector,
        activeButton: config.activeButtonSelector,
        activePanel: config.activePanelSelector
      },
      tabs: tabsContainer ? getSizingInfo(tabsContainer, config.tabsSelector) : { missing: true },
      activeButton: activeButton ? getSizingInfo(activeButton, config.activeButtonSelector) : { missing: true },
      activePanel: activePanel ? getSizingInfo(activePanel, config.activePanelSelector) : { missing: true },
      activeContentBox: activeContentBox ? getSizingInfo(activeContentBox, `${config.system} content box`) : { missing: true },
      bridgeVars: bridgeVarsSnapshot,
      bridgeVarNames,
      contentBefore: beforeInfo,
      vertical: {
        tabsToContent,
        buttonToContent
      },
      summary: {
        activeSubTab:
          activeButton?.dataset?.presetTab ||
          activeButton?.dataset?.pitchTab ||
          activeButton?.dataset?.rhythmStampTab ||
          null,
        tabsRectHeight: Number((tabsRect?.height || 0).toFixed(2)),
        activeButtonRectHeight: Number((buttonRect?.height || 0).toFixed(2)),
        activeButtonMarginBottom: buttonComputed?.marginBottom || null,
        tabsMarginBottom: tabsComputed?.marginBottom || null,
        contentRectTop: Number((contentRect?.top || 0).toFixed(2)),
        tabsToContentGap: (tabsToContent as { gapPx?: number }).gapPx ?? null,
        tabsToContentOverlap: (tabsToContent as { overlapPx?: number }).overlapPx ?? null,
        buttonToContentGap: (buttonToContent as { gapPx?: number }).gapPx ?? null,
        buttonToContentOverlap: (buttonToContent as { overlapPx?: number }).overlapPx ?? null,
        bridgeLeftInline: (bridgeVarsSnapshot as { leftInline?: string | null }).leftInline ?? null,
        bridgeWidthInline: (bridgeVarsSnapshot as { widthInline?: string | null }).widthInline ?? null,
        bridgeLeftComputed: (bridgeVarsSnapshot as { leftComputed?: string | null }).leftComputed ?? null,
        bridgeWidthComputed: (bridgeVarsSnapshot as { widthComputed?: string | null }).widthComputed ?? null,
        beforeTop: (beforeInfo as { top?: string | null }).top ?? null,
        beforeLeft: (beforeInfo as { left?: string | null }).left ?? null,
        beforeWidth: (beforeInfo as { width?: string | null }).width ?? null,
        beforeDisplay: (beforeInfo as { display?: string | null }).display ?? null,
        beforeContent: (beforeInfo as { content?: string | null }).content ?? null,
        contentTopLeftRadius: contentComputed?.borderTopLeftRadius || null,
        contentTopRightRadius: contentComputed?.borderTopRightRadius || null,
        buttonTopLeftRadius: buttonComputed?.borderTopLeftRadius || null,
        buttonTopRightRadius: buttonComputed?.borderTopRightRadius || null
      }
    };
  }

  function logTabBridgeComparison(reason: string): void {
    const timbre = getTabBridgeSystemMetrics({
      system: 'timbre',
      mainTabId: 'timbre',
      tabsSelector: '.preset-effects-tabs',
      activeButtonSelector: '.preset-effects-tabs .preset-tab-button.active',
      activePanelSelector: '.preset-tab-panel.active',
      leftVarName: PRESET_TAB_BRIDGE_LEFT_VAR,
      widthVarName: PRESET_TAB_BRIDGE_WIDTH_VAR,
      resolveBridgeVarNames: activePanel =>
        activePanel?.id === 'effects-panel'
          ? {
              leftVarName: EFFECTS_TAB_BRIDGE_LEFT_VAR,
              widthVarName: EFFECTS_TAB_BRIDGE_WIDTH_VAR
            }
          : {
              leftVarName: PRESET_TAB_BRIDGE_LEFT_VAR,
              widthVarName: PRESET_TAB_BRIDGE_WIDTH_VAR
            },
      resolveContentBox: activePanel =>
        activePanel?.querySelector('.preset-content-box, .effects-content-box') as HTMLElement | null
    });

    const pitch = getTabBridgeSystemMetrics({
      system: 'pitch',
      mainTabId: 'pitch',
      tabsSelector: '.pitch-tabs',
      activeButtonSelector: '.pitch-tabs .pitch-tab-button.active',
      activePanelSelector: '.pitch-tab-panel.active',
      leftVarName: PITCH_TAB_BRIDGE_LEFT_VAR,
      widthVarName: PITCH_TAB_BRIDGE_WIDTH_VAR,
      resolveContentBox: activePanel =>
        activePanel?.querySelector(
          '.range-content-box, .chords-content-box, .draw-content-box, .intervals-content-box, .tonic-content-box'
        ) as HTMLElement | null
    });

    const rhythm = getTabBridgeSystemMetrics({
      system: 'rhythm',
      mainTabId: 'rhythm',
      tabsSelector: '.rhythm-tab-stamps',
      activeButtonSelector: '.rhythm-tab-stamps .rhythm-stamp-tab-button.active',
      activePanelSelector: '.rhythm-stamp-tab-panel.active',
      leftVarName: RHYTHM_TAB_BRIDGE_LEFT_VAR,
      widthVarName: RHYTHM_TAB_BRIDGE_WIDTH_VAR,
      resolveContentBox: activePanel => getActiveRhythmContentBox(activePanel)
    });

    const systems = [timbre, pitch, rhythm];
    console.groupCollapsed(`[Sizing] Tab bridge comparison (${reason})`);
    console.log({ reason, systems: { timbre, pitch, rhythm } });
    console.table(
      systems.map(system => ({
        system: system.system,
        mainButtonActive: system.mainTab.buttonActive,
        mainPanelActive: system.mainTab.panelActive,
        activeSubTab: system.summary.activeSubTab,
        contentTopLeftRadius: system.summary.contentTopLeftRadius,
        contentTopRightRadius: system.summary.contentTopRightRadius,
        buttonTopLeftRadius: system.summary.buttonTopLeftRadius,
        buttonTopRightRadius: system.summary.buttonTopRightRadius,
        tabsHeight: system.summary.tabsRectHeight,
        activeButtonHeight: system.summary.activeButtonRectHeight,
        tabsMarginBottom: system.summary.tabsMarginBottom,
        activeButtonMarginBottom: system.summary.activeButtonMarginBottom,
        tabsToContentGap: system.summary.tabsToContentGap,
        tabsToContentOverlap: system.summary.tabsToContentOverlap,
        buttonToContentGap: system.summary.buttonToContentGap,
        buttonToContentOverlap: system.summary.buttonToContentOverlap,
        bridgeLeftInline: system.summary.bridgeLeftInline,
        bridgeWidthInline: system.summary.bridgeWidthInline,
        bridgeLeftComputed: system.summary.bridgeLeftComputed,
        bridgeWidthComputed: system.summary.bridgeWidthComputed,
        beforeTop: system.summary.beforeTop,
        beforeLeft: system.summary.beforeLeft,
        beforeWidth: system.summary.beforeWidth,
        beforeDisplay: system.summary.beforeDisplay
      }))
    );
    console.groupEnd();
  }

  function logPitchTabSizing(reason: string): void {
    requestAnimationFrame(() => {
      const metrics = getPitchTabButtonMetrics();
      const signature = JSON.stringify({
        activePanelId: (metrics.activePanel as { id?: string }).id || null,
        bridgeVars: metrics.bridgeVars,
        vertical: metrics.vertical,
        buttons: metrics.buttons.map(button => ({
          tab: button.pitchTab,
          active: button.active,
          rectWidth: button.rectWidth,
          rectHeight: button.rectHeight,
          fontWeight: button.fontWeight
        }))
      });
      const shouldDeduplicate =
        reason.startsWith('Resize') || reason === 'auto' || reason === 'init' || reason === 'window resize';
      if (shouldDeduplicate && signature === lastPitchSizingSignature) {
        return;
      }
      lastPitchSizingSignature = signature;

      console.groupCollapsed(`[Sizing] Pitch tabs (${reason})`);
      console.log(metrics);
      if (metrics.buttons.length) {
        console.table(
          metrics.buttons.map(button => ({
            index: button.index,
            tab: button.pitchTab,
            active: button.active,
            rectWidth: button.rectWidth,
            rectHeight: button.rectHeight,
            fontWeight: button.fontWeight,
            marginBottom: button.marginBottom,
            labelDelta: button.measuredLabel?.delta ?? null
          }))
        );
      }
      console.table([metrics.vertical.tabsToContent, metrics.vertical.activeButtonToContent]);
      console.groupEnd();
    });
  }

  function logRhythmTabSizing(reason: string): void {
    requestAnimationFrame(() => {
      const metrics = getRhythmTabButtonMetrics();
      const signature = JSON.stringify({
        activePanelId: (metrics.activePanel as { id?: string }).id || null,
        bridgeVars: metrics.bridgeVars,
        vertical: metrics.vertical,
        buttons: metrics.buttons.map(button => ({
          tab: button.rhythmTab,
          active: button.active,
          rectWidth: button.rectWidth,
          rectHeight: button.rectHeight,
          fontWeight: button.fontWeight
        }))
      });
      const shouldDeduplicate =
        reason.startsWith('Resize') || reason === 'auto' || reason === 'init' || reason === 'window resize';
      if (shouldDeduplicate && signature === lastRhythmSizingSignature) {
        return;
      }
      lastRhythmSizingSignature = signature;

      console.groupCollapsed(`[Sizing] Rhythm tabs (${reason})`);
      console.log(metrics);
      if (metrics.buttons.length) {
        console.table(
          metrics.buttons.map(button => ({
            index: button.index,
            tab: button.rhythmTab,
            active: button.active,
            rectWidth: button.rectWidth,
            rectHeight: button.rectHeight,
            fontWeight: button.fontWeight,
            marginBottom: button.marginBottom,
            labelDelta: button.measuredLabel?.delta ?? null
          }))
        );
      }
      console.table([metrics.vertical.tabsToContent, metrics.vertical.activeButtonToContent]);
      console.groupEnd();
    });
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
      logPitchTabSizing(reasonToLog);
      logRhythmTabSizing(reasonToLog);
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
    lastPitchSizingSignature = null;
    lastRhythmSizingSignature = null;
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
    lastPitchSizingSignature = null;
    lastRhythmSizingSignature = null;
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
        presetTabMetrics: getPresetTabButtonMetrics(),
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
      if (payload.presetTabMetrics.buttons.length) {
        console.table(
          payload.presetTabMetrics.buttons.map(button => ({
            index: button.index,
            tab: button.presetTab,
            active: button.active,
            rectWidth: button.rectWidth,
            fontWeight: button.fontWeight,
            transform: button.transform,
            labelDelta: button.measuredLabel?.delta ?? null
          }))
        );
      }
      console.groupEnd();
    });
  }

  function maybeLogPresetEffectsSizing(reason: string): void {
    const diagnosticsWindow = window as SizingDiagnosticsWindow;
    if (!diagnosticsWindow.enablePresetEffectsSizingDiagnostics) {
      return;
    }
    logPresetEffectsSizing(reason);
    logPresetTabTypography(reason);
    logPitchTabSizing(reason);
    logRhythmTabSizing(reason);
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

    observePresetTabBridgeElements();
    schedulePresetTabBridgeSync();
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

    observePresetTabBridgeElements();
    schedulePresetTabBridgeSync();
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
    stabilizeMainTabButtonWidths();
    if (document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        stabilizeMainTabButtonWidths();
      });
    }
    mainTabButtons.forEach(button => {
      const handler = () => {
        const tabId = (button as HTMLElement).dataset['tab'];
        if (!tabId) return;

        // Switch tabs
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        stabilizeMainTabButtonWidths();

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

        observePresetTabBridgeElements();
        schedulePresetTabBridgeSync();
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

        observePresetTabBridgeElements();
        schedulePresetTabBridgeSync();
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

        observePresetTabBridgeElements();
        schedulePresetTabBridgeSync();
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
    initPresetTabBridgeSync();
    initPitchTabs();

    (window as SizingDiagnosticsWindow).logPresetEffectsSizing = (reason = 'manual') => {
      logPresetEffectsSizing(reason);
    };
    (window as SizingDiagnosticsWindow).logPresetTabTypography = (reason = 'manual') => {
      logPresetTabTypography(reason);
    };
    (window as SizingDiagnosticsWindow).logPitchTabSizing = (reason = 'manual') => {
      logPitchTabSizing(reason);
    };
    (window as SizingDiagnosticsWindow).logRhythmTabSizing = (reason = 'manual') => {
      logRhythmTabSizing(reason);
    };
    (window as SizingDiagnosticsWindow).logTabBridgeComparison = (reason = 'manual') => {
      logTabBridgeComparison(reason);
    };
    (window as SizingDiagnosticsWindow).logAllTabSizing = (reason = 'manual') => {
      logPresetEffectsSizing(reason);
      logPresetTabTypography(reason);
      logPitchTabSizing(reason);
      logRhythmTabSizing(reason);
      logTabBridgeComparison(reason);
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

    if ((window as any).__initDebug) console.log('[Svelte 5] TabManagementBridge mounted');

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
      stopPresetTabBridgeSync();

      if ((window as any).__initDebug) console.log('[Svelte 5] TabManagementBridge unmounted');
    };
  });
</script>

<!-- This is a headless component - no DOM output -->
