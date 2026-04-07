import {
  getSavedRhythmStampTab,
  getSavedSixteenthSub,
  saveSelectedRhythmStampTab,
  saveSelectedSixteenthSub
} from '@utils/tabPersistence.ts';
import { addPitchTabChangeListener, getActivePitchTab } from '@/svelte-ui/tabs/pitchTabState.ts';

interface ToolSubtabStateOptions {
  onPitchTabChanged?: (tabId: string) => void;
}

function activateRhythmStampTab(tabId: string): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>('.rhythm-stamp-tab-button');
  const panels = document.querySelectorAll<HTMLElement>('.rhythm-stamp-tab-panel');
  const targetButton = document.querySelector<HTMLButtonElement>(`[data-rhythm-stamp-tab="${tabId}"]`);

  if (!targetButton) {
    return;
  }

  buttons.forEach(button => button.classList.remove('active'));
  panels.forEach(panel => panel.classList.remove('active'));

  targetButton.classList.add('active');
  document.getElementById(`${tabId}-stamps-panel`)?.classList.add('active');
}

function applySixteenthSubSelection(targetSub: string): void {
  const normalizedSub = targetSub === 'three' ? 'three' : 'four';
  const buttons = document.querySelectorAll<HTMLElement>('.sixteenth-sub-btn');
  const fourContainer = document.getElementById('sixteenth-stamps-four-toolbar-container');
  const threeContainer = document.getElementById('sixteenth-stamps-three-toolbar-container');

  buttons.forEach(button => {
    button.classList.toggle('active', button.dataset['sixteenthSub'] === normalizedSub);
  });

  if (fourContainer) {
    fourContainer.style.display = normalizedSub === 'four' ? '' : 'none';
  }
  if (threeContainer) {
    threeContainer.style.display = normalizedSub === 'three' ? '' : 'none';
  }
}

export function initToolSubtabState(options: ToolSubtabStateOptions = {}): () => void {
  const cleanupFns: Array<() => void> = [];

  if (options.onPitchTabChanged) {
    cleanupFns.push(addPitchTabChangeListener(options.onPitchTabChanged));
    const activePitchTab = getActivePitchTab();
    if (activePitchTab) {
      options.onPitchTabChanged(activePitchTab);
    }
  }

  const rhythmButtons = document.querySelectorAll<HTMLButtonElement>('.rhythm-stamp-tab-button');
  rhythmButtons.forEach(button => {
    const handler = () => {
      const targetTab = button.dataset['rhythmStampTab'];
      if (!targetTab) {
        return;
      }

      activateRhythmStampTab(targetTab);
      saveSelectedRhythmStampTab(targetTab);
    };

    button.addEventListener('click', handler);
    cleanupFns.push(() => button.removeEventListener('click', handler));
  });
  activateRhythmStampTab(getSavedRhythmStampTab());

  const sixteenthSubButtons = document.querySelectorAll<HTMLElement>('.sixteenth-sub-btn');
  sixteenthSubButtons.forEach(button => {
    const handler = () => {
      const targetSub = button.dataset['sixteenthSub'];
      if (!targetSub) {
        return;
      }

      applySixteenthSubSelection(targetSub);
      saveSelectedSixteenthSub(targetSub);
    };

    button.addEventListener('click', handler);
    cleanupFns.push(() => button.removeEventListener('click', handler));
  });
  applySixteenthSubSelection(getSavedSixteenthSub());

  return () => {
    cleanupFns.forEach(cleanup => cleanup());
  };
}
