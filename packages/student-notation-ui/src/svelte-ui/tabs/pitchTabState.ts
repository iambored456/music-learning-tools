import {
  getSavedPitchTab,
  saveSelectedPitchTab
} from '@utils/tabPersistence.ts';

const PITCH_TAB_CHANGED_EVENT = 'student-notation:pitch-tab-changed';

interface PitchTabChangedDetail {
  tabId: string;
}

function activatePitchTab(tabId: string): string | null {
  const buttons = document.querySelectorAll<HTMLElement>('.pitch-tab-button');
  const panels = document.querySelectorAll<HTMLElement>('.pitch-tab-panel');
  const targetButton = document.querySelector<HTMLElement>(`[data-pitch-tab="${tabId}"]`);

  if (!targetButton) {
    return null;
  }

  buttons.forEach(button => button.classList.remove('active'));
  panels.forEach(panel => panel.classList.remove('active'));

  targetButton.classList.add('active');
  document.getElementById(`${tabId}-panel`)?.classList.add('active');

  return targetButton.dataset['pitchTab'] ?? tabId;
}

function dispatchPitchTabChanged(tabId: string): void {
  window.dispatchEvent(new CustomEvent<PitchTabChangedDetail>(PITCH_TAB_CHANGED_EVENT, {
    detail: { tabId }
  }));
}

export function getActivePitchTab(): string | null {
  return document.querySelector<HTMLElement>('.pitch-tab-button.active')?.dataset['pitchTab'] ?? null;
}

export function restoreSavedPitchTabSelection(): string | null {
  const activeTab = activatePitchTab(getSavedPitchTab());
  if (activeTab) {
    dispatchPitchTabChanged(activeTab);
  }
  return activeTab;
}

export function bindPitchTabButtons(
  buttons: NodeListOf<Element>,
  handlers: Map<Element, () => void>,
  afterActivate?: (tabId: string) => void
): void {
  buttons.forEach(button => {
    const handler = () => {
      const tabId = (button as HTMLElement).dataset['pitchTab'];
      if (!tabId) {
        return;
      }

      const activeTab = activatePitchTab(tabId);
      if (!activeTab) {
        return;
      }

      saveSelectedPitchTab(activeTab);
      dispatchPitchTabChanged(activeTab);
      afterActivate?.(activeTab);
    };

    button.addEventListener('click', handler);
    handlers.set(button, handler);
  });
}

export function addPitchTabChangeListener(listener: (tabId: string) => void): () => void {
  const handler = (event: Event): void => {
    const detail = (event as CustomEvent<PitchTabChangedDetail>).detail;
    if (!detail?.tabId) {
      return;
    }
    listener(detail.tabId);
  };

  window.addEventListener(PITCH_TAB_CHANGED_EVENT, handler as EventListener);
  return () => {
    window.removeEventListener(PITCH_TAB_CHANGED_EVENT, handler as EventListener);
  };
}
