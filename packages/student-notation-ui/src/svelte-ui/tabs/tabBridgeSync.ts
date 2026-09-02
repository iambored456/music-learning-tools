const PRESET_TAB_BRIDGE_LEFT_VAR = '--preset-tab-bridge-left';
const PRESET_TAB_BRIDGE_WIDTH_VAR = '--preset-tab-bridge-width';
const EFFECTS_TAB_BRIDGE_LEFT_VAR = '--effects-tab-bridge-left';
const EFFECTS_TAB_BRIDGE_WIDTH_VAR = '--effects-tab-bridge-width';
const PITCH_TAB_BRIDGE_LEFT_VAR = '--pitch-tab-bridge-left';
const PITCH_TAB_BRIDGE_WIDTH_VAR = '--pitch-tab-bridge-width';
const RHYTHM_TAB_BRIDGE_LEFT_VAR = '--rhythm-tab-bridge-left';
const RHYTHM_TAB_BRIDGE_WIDTH_VAR = '--rhythm-tab-bridge-width';

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
  let leftTrim = hasPreviousTab ? Math.max(borderLeft, overlapFromPrevious) : 0;
  let rightTrim = hasNextTab ? Math.max(borderRight, overlapFromNext) : 0;

  if (options?.preserveSharedLeftSeam && hasPreviousTab && overlapFromPrevious > 0) {
    leftTrim = Math.max(leftTrim - Math.min(borderLeft, overlapFromPrevious), 0);
  }

  if (options?.trimRightBorder) {
    rightTrim = Math.max(rightTrim, borderRight);
  }

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

function measureTabLabelWidth(button: HTMLElement): number | null {
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
  probe.style.fontWeight = computed.fontWeight;
  document.body.appendChild(probe);
  const width = probe.getBoundingClientRect().width;
  probe.remove();
  return Number(width.toFixed(2));
}

function stabilizeTabButtonWidths(selector: string): void {
  const buttonNodes = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
  for (const button of buttonNodes) {
    const measuredLabelWidth = measureTabLabelWidth(button);
    if (!measuredLabelWidth) {
      continue;
    }

    const computed = window.getComputedStyle(button);
    const paddingLeft = Number.parseFloat(computed.paddingLeft) || 0;
    const paddingRight = Number.parseFloat(computed.paddingRight) || 0;
    const borderLeft = Number.parseFloat(computed.borderLeftWidth) || 0;
    const borderRight = Number.parseFloat(computed.borderRightWidth) || 0;
    const targetWidth = Math.ceil(measuredLabelWidth + paddingLeft + paddingRight + borderLeft + borderRight);
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
    const measuredLabelWidth = measureTabLabelWidth(button);
    if (!measuredLabelWidth) {
      continue;
    }

    const computed = window.getComputedStyle(button);
    const paddingLeft = Number.parseFloat(computed.paddingLeft) || 0;
    const paddingRight = Number.parseFloat(computed.paddingRight) || 0;
    const borderLeft = Number.parseFloat(computed.borderLeftWidth) || 0;
    const borderRight = Number.parseFloat(computed.borderRightWidth) || 0;
    const buttonTargetWidth = Math.ceil(measuredLabelWidth + paddingLeft + paddingRight + borderLeft + borderRight);
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

function isVisibleElement(node: HTMLElement): boolean {
  const computed = window.getComputedStyle(node);
  return computed.display !== 'none' && computed.visibility !== 'hidden';
}

function getActiveRhythmContentBox(activeRhythmPanel: HTMLElement | null): HTMLElement | null {
  const rhythmContentNodes = activeRhythmPanel?.querySelectorAll(
    '.sixteenth-stamps-toolbar-container, .triplet-stamps-toolbar-container, .drum-beats-toolbar, .rhythm-controls-content-box'
  );
  if (!rhythmContentNodes || rhythmContentNodes.length === 0) {
    return null;
  }

  const contentCandidates = Array.from(rhythmContentNodes) as HTMLElement[];
  return contentCandidates.find(node => isVisibleElement(node)) || contentCandidates[0] || null;
}

export interface TabBridgeSyncController {
  init(): void;
  observeElements(): void;
  scheduleSync(): void;
  stabilizeMainTabButtonWidths(): void;
  stop(): void;
}

export function createTabBridgeSyncController(): TabBridgeSyncController {
  let syncFrame: number | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let mutationObserver: MutationObserver | null = null;
  const observedElements = new Set<Element>();

  const syncPresetTabBridge = (): void => {
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
  };

  const syncPitchTabBridge = (): void => {
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
  };

  const syncRhythmStampTabBridge = (): void => {
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
  };

  const syncAll = (): void => {
    stabilizeMainTabButtonWidths();
    syncPresetTabBridge();
    syncPitchTabBridge();
    syncRhythmStampTabBridge();
  };

  const scheduleSync = (): void => {
    if (syncFrame !== null) {
      return;
    }

    syncFrame = requestAnimationFrame(() => {
      syncFrame = null;
      syncAll();
    });
  };

  const observeElements = (): void => {
    if (!resizeObserver || !mutationObserver) {
      return;
    }
    const activeResizeObserver = resizeObserver;
    const activeMutationObserver = mutationObserver;

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
      '.triplet-stamps-toolbar-container',
      '.drum-beats-toolbar'
    ];

    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(node => {
        if (observedElements.has(node)) {
          return;
        }
        observedElements.add(node);
        activeResizeObserver.observe(node);
        activeMutationObserver.observe(node, {
          attributes: true,
          attributeFilter: ['class', 'style']
        });
      });
    });
  };

  const handleWindowResize = (): void => {
    scheduleSync();
  };

  return {
    init(): void {
      if (resizeObserver) {
        return;
      }

      resizeObserver = new ResizeObserver(() => {
        observeElements();
        scheduleSync();
      });

      mutationObserver = new MutationObserver(mutations => {
        if (mutations.length === 0) {
          return;
        }
        observeElements();
        scheduleSync();
      });

      observeElements();
      window.addEventListener('resize', handleWindowResize);
      scheduleSync();
    },
    observeElements,
    scheduleSync,
    stabilizeMainTabButtonWidths,
    stop(): void {
      window.removeEventListener('resize', handleWindowResize);

      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
      if (mutationObserver) {
        mutationObserver.disconnect();
        mutationObserver = null;
      }
      observedElements.clear();

      if (syncFrame !== null) {
        cancelAnimationFrame(syncFrame);
        syncFrame = null;
      }
    }
  };
}
