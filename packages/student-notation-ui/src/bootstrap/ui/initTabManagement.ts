// js/bootstrap/ui/initTabManagement.ts
import logger from '@utils/logger.ts';
import { saveCurrentTab, getSavedTab, saveCurrentPresetTab, getSavedPresetTab } from '@utils/tabPersistence.ts';

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
 * Initialize main tab switching (Timbre, Pitch, Rhythm)
 */
export function initMainTabs(): void {
  // Restore saved tab on initialization
  restoreSavedTab();

  // Set up tab click handlers
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
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
    });
  });

  logger.initSuccess('MainTabs');
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
    const harmonicBinsContainer = document.querySelector('.harmonic-bins-container') as HTMLElement | null;
    if (harmonicBinsContainer) {
      if (savedTab === 'effects') {
        harmonicBinsContainer.style.display = 'none';
      } else {
        harmonicBinsContainer.style.display = 'flex';
      }
    }
  } else {
    logger.warn('TabManagement', `Could not restore preset tab: ${savedTab}. Tab button or panel not found.`);
  }
}

/**
 * Initialize preset/effects sub-tabs within the Timbre tab
 */
export function initPresetTabs(): void {
  // Restore saved preset tab on initialization
  restoreSavedPresetTab();

  document.querySelectorAll('.preset-tab-button').forEach(button => {
    button.addEventListener('click', () => {
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
      const harmonicBinsContainer = document.querySelector('.harmonic-bins-container') as HTMLElement | null;
      if (harmonicBinsContainer) {
        if (tabId === 'effects') {
          harmonicBinsContainer.style.display = 'none';
        } else {
          harmonicBinsContainer.style.display = 'flex';
        }
      }
    });
  });

  logger.initSuccess('PresetTabs');
}

/**
 * Initialize pitch sub-tabs (Range, Chords, Draw) within the Pitch tab
 */
export function initPitchTabs(): void {
  document.querySelectorAll('.pitch-tab-button').forEach(button => {
    button.addEventListener('click', () => {
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
    });
  });

  logger.initSuccess('PitchTabs');
}
