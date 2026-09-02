// js/utils/tabPersistence.ts
import logger from '@utils/logger.ts';

// LocalStorage keys for tab persistence
const SELECTED_TAB_KEY = 'selectedTab';
const SELECTED_PRESET_TAB_KEY = 'selectedPresetTab';
const SELECTED_PITCH_TAB_KEY = 'selectedPitchTab';
const SELECTED_RHYTHM_STAMP_TAB_KEY = 'selectedRhythmStampTab';
const SELECTED_RHYTHM_TAB_KEY = 'selectedRhythmTab';
const SELECTED_SIXTEENTH_SUB_KEY = 'selectedSixteenthSub';
const DEFAULT_TAB = 'timbre';
const DEFAULT_PRESET_TAB = 'presets';
const DEFAULT_PITCH_TAB = 'draw';
const DEFAULT_RHYTHM_STAMP_TAB = 'sixteenth';
const DEFAULT_SIXTEENTH_SUB = 'four';

function saveSelection(key: string, value: string, label: string): void {
  try {
    localStorage.setItem(key, value);
    logger.debug('TabPersistence', `Saved ${label} to localStorage: ${value}`, undefined, 'ui');
  } catch (e) {
    logger.warn('TabPersistence', `Failed to save ${label} to localStorage`, e, 'ui');
  }
}

function readSelection(key: string, fallback: string, label: string): string {
  try {
    const savedValue = localStorage.getItem(key);
    return savedValue || fallback;
  } catch (e) {
    logger.warn('TabPersistence', `Failed to read ${label} from localStorage`, e, 'ui');
    return fallback;
  }
}

/**
 * Save the current main tab selection to localStorage
 */
export function saveCurrentTab(tabId: string): void {
  saveSelection(SELECTED_TAB_KEY, tabId, 'tab');
}

/**
 * Get the saved main tab from localStorage, or return the default
 */
export function getSavedTab(): string {
  return readSelection(SELECTED_TAB_KEY, DEFAULT_TAB, 'tab');
}

/**
 * Save the current preset tab selection to localStorage
 */
export function saveCurrentPresetTab(tabId: string): void {
  saveSelection(SELECTED_PRESET_TAB_KEY, tabId, 'preset tab');
}

/**
 * Get the saved preset tab from localStorage, or return the default
 */
export function getSavedPresetTab(): string {
  return readSelection(SELECTED_PRESET_TAB_KEY, DEFAULT_PRESET_TAB, 'preset tab');
}

export function saveSelectedPitchTab(tabId: string): void {
  saveSelection(SELECTED_PITCH_TAB_KEY, tabId, 'pitch tab');
}

export function getSavedPitchTab(): string {
  const saved = readSelection(SELECTED_PITCH_TAB_KEY, DEFAULT_PITCH_TAB, 'pitch tab');
  return saved === 'draw' ? saved : DEFAULT_PITCH_TAB;
}

export function saveSelectedRhythmStampTab(tabId: string): void {
  saveSelection(SELECTED_RHYTHM_STAMP_TAB_KEY, tabId, 'rhythm stamp tab');
}

export function getSavedRhythmStampTab(): string {
  const savedValue = readSelection(SELECTED_RHYTHM_STAMP_TAB_KEY, '', 'rhythm stamp tab');
  const fallbackValue = savedValue || readSelection(SELECTED_RHYTHM_TAB_KEY, DEFAULT_RHYTHM_STAMP_TAB, 'rhythm tab');

  switch (fallbackValue) {
    case 'stamps':
      return 'sixteenth';
    case 'triplets':
      return 'triplet';
    case 'controls':
    case 'measures':
    case 'general':
      return 'sixteenth';
    default:
      return fallbackValue || DEFAULT_RHYTHM_STAMP_TAB;
  }
}

export function saveSelectedSixteenthSub(tabId: string): void {
  saveSelection(SELECTED_SIXTEENTH_SUB_KEY, tabId, 'sixteenth subdivision');
}

export function getSavedSixteenthSub(): string {
  const savedValue = readSelection(SELECTED_SIXTEENTH_SUB_KEY, DEFAULT_SIXTEENTH_SUB, 'sixteenth subdivision');
  return savedValue === 'three' ? 'three' : DEFAULT_SIXTEENTH_SUB;
}
