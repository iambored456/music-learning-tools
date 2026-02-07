/**
 * Difficulty State Store - Svelte 5 Runes
 *
 * Manages scoring difficulty presets and custom parameter overrides.
 * Persists selected preset to localStorage.
 */

import type { FeedbackCollectorConfig } from '@mlt/student-notation-engine';
import { highwayState } from './highwayState.svelte.js';

export type DifficultyPreset = 'easy' | 'medium' | 'hard' | 'custom';

export interface DifficultyConfig extends FeedbackCollectorConfig {
  preset: DifficultyPreset;
}

const PRESETS: Record<Exclude<DifficultyPreset, 'custom'>, FeedbackCollectorConfig> = {
  easy: {
    pitchToleranceCents: 75,
    onsetToleranceMs: 200,
    releaseToleranceMs: 250,
    hitThreshold: 50,
    minCoveragePct: 40,
    minVoicedMs: 250,
    minAmplitudeDb: -65,
    bandToleranceSemitones: 1,
    minSlideSemitones: 2,
  },
  medium: {
    pitchToleranceCents: 50,
    onsetToleranceMs: 100,
    releaseToleranceMs: 150,
    hitThreshold: 70,
    minCoveragePct: 60,
    minVoicedMs: 400,
    minAmplitudeDb: -60,
    bandToleranceSemitones: 0,
    minSlideSemitones: 3,
  },
  hard: {
    pitchToleranceCents: 25,
    onsetToleranceMs: 50,
    releaseToleranceMs: 75,
    hitThreshold: 85,
    minCoveragePct: 80,
    minVoicedMs: 400,
    minAmplitudeDb: -50,
    bandToleranceSemitones: 0,
    minSlideSemitones: 4,
  },
};

const STORAGE_KEY = 'singing-trainer-difficulty';

function loadFromStorage(): DifficultyConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function saveToStorage(config: DifficultyConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch { /* ignore */ }
}

function createDifficultyState() {
  const saved = loadFromStorage();
  const initial: DifficultyConfig = saved ?? { preset: 'medium', ...PRESETS.medium };

  let config = $state<DifficultyConfig>(initial);

  // Apply to highway on init
  applyToHighway(initial);

  function applyToHighway(c: DifficultyConfig) {
    const { preset: _, ...feedbackConfig } = c;
    highwayState.setFeedbackConfig(feedbackConfig);
  }

  function setPreset(preset: Exclude<DifficultyPreset, 'custom'>) {
    config = { preset, ...PRESETS[preset] };
    applyToHighway(config);
    saveToStorage(config);
  }

  function setParam<K extends keyof FeedbackCollectorConfig>(key: K, value: FeedbackCollectorConfig[K]) {
    config = { ...config, preset: 'custom', [key]: value };
    applyToHighway(config);
    saveToStorage(config);
  }

  return {
    get config() { return config; },
    get presets() { return PRESETS; },
    setPreset,
    setParam,
  };
}

export const difficultyState = createDifficultyState();
