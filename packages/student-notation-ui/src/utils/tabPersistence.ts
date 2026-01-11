// js/utils/tabPersistence.ts
import logger from '@utils/logger.ts';

// LocalStorage keys for tab persistence
const SELECTED_TAB_KEY = 'selectedTab';
const SELECTED_PRESET_TAB_KEY = 'selectedPresetTab';
const DEFAULT_TAB = 'timbre';
const DEFAULT_PRESET_TAB = 'presets';

/**
 * Save the current main tab selection to localStorage
 */
export function saveCurrentTab(tabId: string): void {
  try {
    localStorage.setItem(SELECTED_TAB_KEY, tabId);
    logger.debug('TabPersistence', `Saved tab to localStorage: ${tabId}`, undefined, 'ui');
  } catch (e) {
    logger.warn('TabPersistence', 'Failed to save tab to localStorage', e, 'ui');
  }
}

/**
 * Get the saved main tab from localStorage, or return the default
 */
export function getSavedTab(): string {
  try {
    const savedTab = localStorage.getItem(SELECTED_TAB_KEY);
    return savedTab || DEFAULT_TAB;
  } catch (e) {
    logger.warn('TabPersistence', 'Failed to read tab from localStorage', e, 'ui');
    return DEFAULT_TAB;
  }
}

/**
 * Save the current preset tab selection to localStorage
 */
export function saveCurrentPresetTab(tabId: string): void {
  try {
    localStorage.setItem(SELECTED_PRESET_TAB_KEY, tabId);
    logger.debug('TabPersistence', `Saved preset tab to localStorage: ${tabId}`, undefined, 'ui');
  } catch (e) {
    logger.warn('TabPersistence', 'Failed to save preset tab to localStorage', e, 'ui');
  }
}

/**
 * Get the saved preset tab from localStorage, or return the default
 */
export function getSavedPresetTab(): string {
  try {
    const savedTab = localStorage.getItem(SELECTED_PRESET_TAB_KEY);
    return savedTab || DEFAULT_PRESET_TAB;
  } catch (e) {
    logger.warn('TabPersistence', 'Failed to read preset tab from localStorage', e, 'ui');
    return DEFAULT_PRESET_TAB;
  }
}
