import {
  getSavedTab,
  saveCurrentTab
} from '@utils/tabPersistence.ts';

interface MainTabStateOptions {
  initializeTempoSlider: (delayMs: number) => void;
  stabilizeMainTabButtonWidths?: () => void;
  afterActivate?: () => void;
  onMissingTab?: (tabId: string) => void;
}

function activateMainTab(tabId: string, options: Pick<MainTabStateOptions, 'stabilizeMainTabButtonWidths'>): string | null {
  const targetButton = document.querySelector<HTMLElement>(`[data-tab="${tabId}"]`);
  const targetPanel = document.getElementById(`${tabId}-panel`);
  if (!targetButton || !targetPanel) {
    return null;
  }

  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));

  targetButton.classList.add('active');
  targetPanel.classList.add('active');
  options.stabilizeMainTabButtonWidths?.();

  return targetButton.dataset['tab'] ?? tabId;
}

export function restoreSavedMainTabSelection(options: MainTabStateOptions): void {
  const savedTab = getSavedTab();
  const activeTab = activateMainTab(savedTab, options);

  if (!activeTab) {
    options.onMissingTab?.(savedTab);
    return;
  }

  if (activeTab === 'rhythm') {
    options.initializeTempoSlider(200);
  }

  options.afterActivate?.();
}

export function bindMainTabButtons(
  buttons: NodeListOf<Element>,
  handlers: Map<Element, () => void>,
  options: MainTabStateOptions
): void {
  buttons.forEach(button => {
    const handler = () => {
      const tabId = (button as HTMLElement).dataset['tab'];
      if (!tabId) {
        return;
      }

      const activeTab = activateMainTab(tabId, options);
      if (!activeTab) {
        options.onMissingTab?.(tabId);
        return;
      }

      saveCurrentTab(activeTab);
      if (activeTab === 'rhythm') {
        options.initializeTempoSlider(50);
      }
      options.afterActivate?.();
    };

    button.addEventListener('click', handler);
    handlers.set(button, handler);
  });
}
