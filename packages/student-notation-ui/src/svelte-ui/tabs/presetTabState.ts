import {
  getSavedPresetTab,
  saveCurrentPresetTab
} from '@utils/tabPersistence.ts';

interface PresetTabStateOptions {
  afterActivate?: (tabId: string) => void;
  onMissingTab?: (tabId: string) => void;
}

function syncOvertoneBinsVisibility(tabId: string): void {
  const overtoneBinsContainer = document.querySelector('.harmonic-bins-container') as HTMLElement | null;
  if (!overtoneBinsContainer) {
    return;
  }
  overtoneBinsContainer.style.display = tabId === 'effects' ? 'none' : 'flex';
}

function activatePresetTab(tabId: string): string | null {
  const targetButton = document.querySelector<HTMLElement>(`[data-preset-tab="${tabId}"]`);
  const targetPanel = document.getElementById(`${tabId}-panel`);
  if (!targetButton || targetButton.hasAttribute('disabled') || !targetPanel) {
    return null;
  }

  document.querySelectorAll('.preset-tab-button:not([disabled])').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.preset-tab-panel').forEach(panel => panel.classList.remove('active'));

  targetButton.classList.add('active');
  targetPanel.classList.add('active');
  syncOvertoneBinsVisibility(tabId);

  return targetButton.dataset['presetTab'] ?? tabId;
}

export function restoreSavedPresetTabSelection(options: PresetTabStateOptions = {}): void {
  const savedTab = getSavedPresetTab();
  const activeTab = activatePresetTab(savedTab);
  if (!activeTab) {
    options.onMissingTab?.(savedTab);
    return;
  }
  options.afterActivate?.(activeTab);
}

export function bindPresetTabButtons(
  buttons: NodeListOf<Element>,
  handlers: Map<Element, () => void>,
  options: PresetTabStateOptions = {}
): void {
  buttons.forEach(button => {
    const handler = () => {
      const tabId = (button as HTMLElement).dataset['presetTab'];
      if (!tabId) {
        return;
      }

      const activeTab = activatePresetTab(tabId);
      if (!activeTab) {
        options.onMissingTab?.(tabId);
        return;
      }

      saveCurrentPresetTab(activeTab);
      options.afterActivate?.(activeTab);
    };

    button.addEventListener('click', handler);
    handlers.set(button, handler);
  });
}
