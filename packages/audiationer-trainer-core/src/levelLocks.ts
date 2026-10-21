import { challengePresetGroups, isScored, pathPresetGroups, progressKey, type Preset, type Progress } from './presets.ts';
import type { GameMode } from './settings.ts';

export const PAIRED_LEVEL_MODES = {
  pitch: ['degrees', 'melody'],
  chords: ['chords', 'chord-progressions'],
} as const;

export interface LevelLocks { unlockAll: boolean }
export interface LevelAccess { unlocked: boolean; prerequisite: Preset | null }

export function normalizeLevelLocks(input: unknown): LevelLocks {
  return { unlockAll: !!input && typeof input === 'object' && (input as Partial<LevelLocks>).unlockAll === true };
}

/** Every exercise advances independently within each built-in list. */
export function levelAccess(mode: GameMode, presetId: string | null, progress: Progress, locks?: LevelLocks): LevelAccess {
  const open = { unlocked: true, prerequisite: null };
  if (!isScored(mode) || !presetId || locks?.unlockAll) return open;
  const group = [...pathPresetGroups(mode), ...challengePresetGroups(mode)].find(group => group.presets.some(preset => preset.id === presetId));
  if (!group) return open; // Custom/unsaved exercises are outside the built-in progression.
  const index = group.presets.findIndex(preset => preset.id === presetId);
  if (index === 0) return open;
  const earned = (id: string) => (progress[progressKey(mode, id)] ?? 0) > 0;
  const prerequisite = group.presets[index - 1];
  // Existing completed cards stay available, including saves made before locks existed.
  return earned(presetId) || earned(prerequisite.id) ? open : { unlocked: false, prerequisite };
}
