<script lang="ts">
  /**
   * MobilePocketConsoleBridge - Headless Svelte component
   *
   * Mobile-only bridge that turns the top toolbar into a compact "pocket console":
   * - compact top rail with tab cycling + pinned actions
   * - bottom tab sheet (secondary toolbar)
   * - bottom tools sheet (full primary toolbar)
   */
  import { onMount } from 'svelte';

  const MOBILE_MEDIA_QUERY = '(max-width: 900px)';
  const MOBILE_CLASS = 'mobile-pocket-console';
  const TAB_OPEN_CLASS = 'mobile-pocket-tab-open';
  const TOOLS_OPEN_CLASS = 'mobile-pocket-tools-open';
  const SWIPE_DISTANCE_PX = 44;
  const SWIPE_DOMINANCE_RATIO = 1.25;

  let mediaQueryList: MediaQueryList | null = null;
  let tabChipLabel: HTMLElement | null = null;
  let tabChipButton: HTMLButtonElement | null = null;
  let moreToolsButton: HTMLButtonElement | null = null;
  let backdropElement: HTMLElement | null = null;
  let tabObserver: MutationObserver | null = null;
  let proxyObserver: MutationObserver | null = null;
  let touchStartX = 0;
  let touchStartY = 0;

  const cleanupFns: Array<() => void> = [];

  function isMobileMode(): boolean {
    return Boolean(mediaQueryList?.matches);
  }

  function getMainTabButtons(): HTMLButtonElement[] {
    return Array.from(document.querySelectorAll<HTMLButtonElement>('.tab-sidebar .tab-button[data-tab]'));
  }

  function getActiveMainTab(tabs = getMainTabButtons()): HTMLButtonElement | null {
    return tabs.find((tab) => tab.classList.contains('active')) || tabs[0] || null;
  }

  function syncToggleButtons(): void {
    const tabSheetOpen = document.body.classList.contains(TAB_OPEN_CLASS);
    const toolsSheetOpen = document.body.classList.contains(TOOLS_OPEN_CLASS);
    tabChipButton?.classList.toggle('active', tabSheetOpen);
    moreToolsButton?.classList.toggle('active', toolsSheetOpen);
    tabChipButton?.setAttribute('aria-expanded', tabSheetOpen ? 'true' : 'false');
    moreToolsButton?.setAttribute('aria-expanded', toolsSheetOpen ? 'true' : 'false');
  }

  function syncBackdrop(): void {
    if (!backdropElement) {return;}
    const isVisible = document.body.classList.contains(TAB_OPEN_CLASS)
      || document.body.classList.contains(TOOLS_OPEN_CLASS);
    backdropElement.hidden = !isVisible;
    backdropElement.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
  }

  function syncTabChipLabel(): void {
    if (!tabChipLabel) {return;}
    const activeTab = getActiveMainTab();
    const label = activeTab?.textContent?.trim() || 'Timbre';
    tabChipLabel.textContent = label;
    tabChipButton?.setAttribute('aria-label', `Open ${label} panel`);
    syncToggleButtons();
  }

  function setOpenSheet(nextSheet: 'tab' | 'tools' | null): void {
    const normalizedSheet = isMobileMode() ? nextSheet : null;
    document.body.classList.toggle(TAB_OPEN_CLASS, normalizedSheet === 'tab');
    document.body.classList.toggle(TOOLS_OPEN_CLASS, normalizedSheet === 'tools');
    syncToggleButtons();
    syncBackdrop();
  }

  function closeSheets(): void {
    setOpenSheet(null);
  }

  function toggleTabSheet(): void {
    if (!isMobileMode()) {return;}
    const isOpen = document.body.classList.contains(TAB_OPEN_CLASS);
    setOpenSheet(isOpen ? null : 'tab');
  }

  function toggleToolsSheet(): void {
    if (!isMobileMode()) {return;}
    const isOpen = document.body.classList.contains(TOOLS_OPEN_CLASS);
    setOpenSheet(isOpen ? null : 'tools');
  }

  function activateMainTab(tabButton: HTMLButtonElement | null): void {
    if (!tabButton) {return;}
    if (!tabButton.classList.contains('active')) {
      tabButton.click();
    }
    syncTabChipLabel();
  }

  function cycleMainTabs(step: number): void {
    const tabs = getMainTabButtons();
    if (tabs.length === 0) {return;}
    const activeTab = getActiveMainTab(tabs);
    const activeIndex = activeTab ? tabs.indexOf(activeTab) : 0;
    const nextIndex = (activeIndex + step + tabs.length) % tabs.length;
    activateMainTab(tabs[nextIndex] || null);
    setOpenSheet('tab');
  }

  function proxyToolbarButton(targetId: string): void {
    if (!isMobileMode()) {return;}
    const target = document.getElementById(targetId) as HTMLButtonElement | null;
    target?.click();
    syncProxyButtonState();
    syncTabChipLabel();
  }

  function syncProxyButtonState(): void {
    const undoSource = document.getElementById('undo-button') as HTMLButtonElement | null;
    const undoProxy = document.getElementById('mobile-undo-button') as HTMLButtonElement | null;
    if (undoSource && undoProxy) {
      undoProxy.disabled = undoSource.disabled;
    }

    const eraserSource = document.getElementById('eraser-tool-button') as HTMLButtonElement | null;
    const eraserProxy = document.getElementById('mobile-eraser-button') as HTMLButtonElement | null;
    if (eraserSource && eraserProxy) {
      eraserProxy.classList.toggle('selected', eraserSource.classList.contains('selected'));
    }

    const playSource = document.getElementById('play-button') as HTMLButtonElement | null;
    const playProxy = document.getElementById('mobile-play-button') as HTMLButtonElement | null;
    const sourceIcon = playSource?.querySelector<HTMLImageElement>('img');
    const proxyIcon = playProxy?.querySelector<HTMLImageElement>('img');
    if (sourceIcon && proxyIcon) {
      const src = sourceIcon.getAttribute('src');
      const alt = sourceIcon.getAttribute('alt');
      if (src) {
        proxyIcon.setAttribute('src', src);
      }
      if (alt) {
        proxyIcon.setAttribute('alt', alt);
      }
    }
  }

  function observeTabState(): void {
    tabObserver?.disconnect();
    const tabSidebar = document.querySelector('.tab-sidebar');
    if (!tabSidebar) {return;}
    tabObserver = new MutationObserver(() => {
      syncTabChipLabel();
    });
    tabObserver.observe(tabSidebar, {
      attributes: true,
      attributeFilter: ['class'],
      childList: true,
      subtree: true
    });
  }

  function observeProxyState(): void {
    proxyObserver?.disconnect();
    proxyObserver = new MutationObserver(() => {
      syncProxyButtonState();
    });

    const sourceButtons = [
      document.getElementById('undo-button'),
      document.getElementById('eraser-tool-button'),
      document.getElementById('play-button')
    ].filter(Boolean) as HTMLElement[];

    sourceButtons.forEach((sourceButton) => {
      proxyObserver?.observe(sourceButton, {
        attributes: true,
        attributeFilter: ['class', 'disabled'],
        childList: true,
        subtree: true
      });
    });
  }

  function addListener(
    target: EventTarget | null,
    eventName: string,
    handler: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void {
    if (!target) {return;}
    target.addEventListener(eventName, handler, options);
    cleanupFns.push(() => {
      target.removeEventListener(eventName, handler, options);
    });
  }

  onMount(() => {
    tabChipLabel = document.getElementById('mobile-tab-chip-label');
    tabChipButton = document.getElementById('mobile-tab-chip') as HTMLButtonElement | null;
    moreToolsButton = document.getElementById('mobile-tools-toggle') as HTMLButtonElement | null;
    backdropElement = document.getElementById('mobile-console-backdrop');

    const tabPrevButton = document.getElementById('mobile-tab-prev') as HTMLButtonElement | null;
    const tabNextButton = document.getElementById('mobile-tab-next') as HTMLButtonElement | null;
    const undoButton = document.getElementById('mobile-undo-button') as HTMLButtonElement | null;
    const eraserButton = document.getElementById('mobile-eraser-button') as HTMLButtonElement | null;
    const playButton = document.getElementById('mobile-play-button') as HTMLButtonElement | null;
    const stopButton = document.getElementById('mobile-stop-button') as HTMLButtonElement | null;
    const tabContent = document.querySelector('#toolbar-secondary .tab-content') as HTMLElement | null;

    mediaQueryList = window.matchMedia(MOBILE_MEDIA_QUERY);

    const applyMobileMode = (): void => {
      const mobileEnabled = isMobileMode();
      document.body.classList.toggle(MOBILE_CLASS, mobileEnabled);
      if (!mobileEnabled) {
        closeSheets();
      }
      syncTabChipLabel();
      syncProxyButtonState();
      syncBackdrop();
    };

    const handleMediaChange = (): void => {
      applyMobileMode();
    };

    addListener(tabPrevButton, 'click', () => {
      cycleMainTabs(-1);
    });
    addListener(tabChipButton, 'click', () => {
      toggleTabSheet();
    });
    addListener(tabNextButton, 'click', () => {
      cycleMainTabs(1);
    });
    addListener(undoButton, 'click', () => {
      proxyToolbarButton('undo-button');
    });
    addListener(eraserButton, 'click', () => {
      proxyToolbarButton('eraser-tool-button');
    });
    addListener(playButton, 'click', () => {
      proxyToolbarButton('play-button');
    });
    addListener(stopButton, 'click', () => {
      proxyToolbarButton('stop-button');
    });
    addListener(moreToolsButton, 'click', () => {
      toggleToolsSheet();
    });
    addListener(backdropElement, 'click', () => {
      closeSheets();
    });
    addListener(document, 'keydown', (event: Event) => {
      const keyEvent = event as KeyboardEvent;
      if (keyEvent.key !== 'Escape') {return;}
      closeSheets();
    });

    addListener(tabContent, 'touchstart', (event: Event) => {
      if (!document.body.classList.contains(TAB_OPEN_CLASS)) {return;}
      const touchEvent = event as TouchEvent;
      const firstTouch = touchEvent.touches[0];
      if (!firstTouch) {return;}
      touchStartX = firstTouch.clientX;
      touchStartY = firstTouch.clientY;
    }, { passive: true });

    addListener(tabContent, 'touchend', (event: Event) => {
      if (!document.body.classList.contains(TAB_OPEN_CLASS)) {return;}
      const touchEvent = event as TouchEvent;
      const firstTouch = touchEvent.changedTouches[0];
      if (!firstTouch) {return;}
      const deltaX = firstTouch.clientX - touchStartX;
      const deltaY = firstTouch.clientY - touchStartY;
      const horizontalDistance = Math.abs(deltaX);
      const verticalDistance = Math.abs(deltaY);

      if (horizontalDistance < SWIPE_DISTANCE_PX) {return;}
      if (horizontalDistance < (verticalDistance * SWIPE_DOMINANCE_RATIO)) {return;}
      cycleMainTabs(deltaX < 0 ? 1 : -1);
    });

    mediaQueryList.addEventListener('change', handleMediaChange);
    cleanupFns.push(() => {
      mediaQueryList?.removeEventListener('change', handleMediaChange);
    });

    observeTabState();
    observeProxyState();
    applyMobileMode();

    return () => {
      closeSheets();
      document.body.classList.remove(MOBILE_CLASS);
      tabObserver?.disconnect();
      proxyObserver?.disconnect();
      cleanupFns.forEach((cleanup) => cleanup());
      cleanupFns.length = 0;
    };
  });
</script>

<!-- This is a headless component - no DOM output -->
