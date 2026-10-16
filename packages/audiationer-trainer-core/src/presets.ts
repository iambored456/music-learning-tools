import { SCALE_MODES, scaleDegrees } from './music.ts';
import { GAME_MODES, normalizeSettings, settingsError, type GameMode, type Settings } from './settings.ts';
import type { Result } from './session.ts';

export const DIFFICULTIES = [
  { name: 'Novice', seconds: 0, detail: 'No time limit', colour: '#4ed795' },
  { name: 'Adept', seconds: 5, detail: 'Answer time: 5 s', colour: '#ffc55c' },
  { name: 'Master', seconds: 2, detail: 'Answer time: 2 s', colour: '#f15c8e' },
] as const;
export const isScored = (mode: GameMode) => ['degrees', 'melody', 'chords', 'quality'].includes(mode);
export const difficultyIndex = (seconds: number) => Math.max(0, DIFFICULTIES.findIndex(d => d.seconds === seconds));
export interface Preset { id: string; name: string; patch: Partial<Settings> }
export interface PresetGroup { id: string; name: string; presets: Preset[] }

const sun = [[0, 4], [0, 4, 7], [0, 2, 4, 7], [0, 2, 4, 7, 9], [0, 2, 4, 7, 9, 11], [0, 2, 4, 5, 7, 9, 11], [0, 2, 4, 5, 6, 7, 9, 11]];
const moon = [[0, 3], [0, 3, 7], [0, 2, 3, 7], [0, 2, 3, 7, 8], [0, 2, 3, 7, 8, 10], [0, 2, 3, 5, 7, 8, 10], [0, 1, 2, 3, 5, 7, 8, 10]];
const union = [[0, 3, 4, 7], [0, 1, 2, 3, 4, 7], [0, 1, 2, 3, 4, 7, 8, 9], [0, 1, 2, 3, 4, 7, 8, 9, 10, 11], Array.from({ length: 12 }, (_, i) => i)];
const hasAdditionalLevels = (mode: GameMode) => mode === 'degrees' || mode === 'melody';
const exerciseNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

function notePreset(id: string, name: string, degrees: number[], scale: Settings['scale'] = '1'): Preset {
  return { id, name, patch: { scale, degrees: [...degrees] } };
}
export function pathPresetGroups(mode: GameMode): PresetGroup[] {
  if (mode === 'quality') return [{ id: 'chord-path', name: 'Chord Quality Progression', presets: [
    { id: 'triads-1', name: 'Major & minor', patch: { qualities: [0, 1] } },
    { id: 'triads-2', name: 'Add diminished', patch: { qualities: [0, 1, 2] } },
    { id: 'triads-3', name: 'All triads', patch: { qualities: [0, 1, 2, 3] } },
    { id: 'sevenths', name: 'Seventh chords', patch: { qualities: [4, 5, 6] } },
  ] }];
  // Diatonic Chords must remain inside the selected seven-note scale.
  const groups: PresetGroup[] = [{ id: 'sun', name: 'Major Progression', presets: sun.slice(0, mode === 'chords' ? 6 : 7).map((degrees, i) =>
    notePreset(`sun-${i + 1}`, `Major ${exerciseNumerals[i]}`, degrees)) }];
  if (hasAdditionalLevels(mode)) groups.push(
    { id: 'moon', name: 'Minor Progression', presets: moon.map((degrees, i) => notePreset(`moon-${i + 1}`, `Minor ${exerciseNumerals[i]}`, degrees, '6')) },
    { id: 'union', name: 'Chromatic Progression', presets: union.map((degrees, i) => notePreset(`union-${i + 1}`, `Chromatic ${exerciseNumerals[i]}`, degrees)) },
  );
  return groups;
}
export function pathPresets(mode: GameMode): Preset[] {
  return pathPresetGroups(mode).flatMap(group => group.presets);
}
export function challengePresetGroups(mode: GameMode): PresetGroup[] {
  if (mode === 'quality') return [{ id: 'chord-families', name: 'Chord families', presets: [
    { id: 'all-qualities', name: 'All chord qualities', patch: { qualities: [0, 1, 2, 3, 4, 5, 6] } },
    { id: 'major-family', name: 'The major family', patch: { qualities: [0, 4, 5] } },
    { id: 'minor-family', name: 'The minor family', patch: { qualities: [1, 2, 6] } },
  ] }];
  const modeOrder: Settings['scale'][] = hasAdditionalLevels(mode) ? ['1', '6', '2', '3', '4', '5', '7'] : SCALE_MODES.map(scale => scale.id);
  const modes = modeOrder.map(id => {
    const name = hasAdditionalLevels(mode) && id === '1' ? 'Ionian (major)' : hasAdditionalLevels(mode) && id === '6' ? 'Aeolian (minor)' : SCALE_MODES.find(scale => scale.id === id)!.name;
    return notePreset(`mode-${id}`, name, scaleDegrees(id), id);
  });
  if (!hasAdditionalLevels(mode)) return [{ id: 'modes', name: 'Modes', presets: modes }];
  return [
    { id: 'modes', name: 'Modes', presets: [
      ...modes,
      notePreset('pentatonic', 'Pentatonic', [0, 2, 4, 7, 9]),
      notePreset('minor-pentatonic', 'Minor Pentatonic', [0, 3, 5, 7, 10], '6'),
      notePreset('melodic-minor', 'Melodic Minor', [0, 2, 3, 5, 7, 9, 11], '6'),
      notePreset('harmonic-minor', 'Harmonic Minor', [0, 2, 3, 5, 7, 8, 11], '6'),
      notePreset('whole-tone', 'Whole-Tone Scale', [0, 2, 4, 6, 8, 10]),
      notePreset('half-whole', 'Half-Whole Scale', [0, 1, 3, 4, 6, 7, 9, 10]),
      notePreset('chromatic', 'Chromatic', Array.from({ length: 12 }, (_, i) => i)),
    ] },
    { id: 'challenge', name: 'Challenge', presets: [
      notePreset('clean', 'Clean', [0, 2, 5, 7]),
      notePreset('threes-and-sixes', 'Threes and Sixes', [3, 4, 8, 9]),
      notePreset('twos-and-sevens', 'Twos and Sevens', [1, 2, 10, 11]),
      notePreset('dark-side', 'The Dark Side', [1, 3, 6, 8, 10]),
    ] },
    { id: 'oddball', name: 'Oddball', presets: [
      notePreset('bad-dream', 'Bad Dream', [1, 5, 6, 9]),
      notePreset('dimwit', 'Dimwit', [2, 5, 8, 11]),
      notePreset('cluster', 'Cluster', [5, 6, 7, 8, 9]),
    ] },
    { id: 'chords', name: 'Chords', presets: [
      notePreset('chord-major', 'Major', [0, 4, 7]),
      notePreset('chord-minor', 'Minor', [0, 3, 7], '6'),
      notePreset('chord-maj6', 'maj6', [0, 4, 7, 9]),
      notePreset('chord-m6', 'm6', [0, 3, 7, 9], '6'),
      notePreset('chord-maj7', 'maj7', [0, 4, 7, 11]),
      notePreset('chord-m7', 'm7', [0, 3, 7, 10], '6'),
      notePreset('chord-7', '7', [0, 4, 7, 10], '5'),
      notePreset('chord-minor-maj7', 'm(maj7)', [0, 3, 7, 11], '6'),
    ] },
  ];
}
export function challengePresets(mode: GameMode): Preset[] {
  return challengePresetGroups(mode).flatMap(group => group.presets);
}
export function applyPreset(settings: Settings, preset: Preset): Settings {
  return normalizeSettings({ ...settings, ...preset.patch, mode: settings.mode });
}
export interface CustomPreset { id: string; name: string; settings: Settings }
export function normalizeCustomPresets(input: unknown): CustomPreset[] {
  if (!Array.isArray(input)) return [];
  const ids = new Set<string>();
  return input.slice(0, 100).flatMap(value => {
    if (!value || typeof value !== 'object' || typeof value.id !== 'string' || !/^custom-[\w-]+$/.test(value.id) || ids.has(value.id)) return [];
    if (typeof value.name !== 'string' || !value.name.trim() || !GAME_MODES.some(m => m.id === value.settings?.mode)) return [];
    const settings = normalizeSettings(value.settings);
    if (settingsError(settings)) return [];
    ids.add(value.id);
    return [{ id: value.id, name: value.name.trim().slice(0, 50), settings }];
  });
}
export type Progress = Record<string, number>;
export const progressKey = (mode: GameMode, presetId: string) => `${mode}:${presetId}`;
export function normalizeProgress(input: unknown): Progress {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const builtInKeys = new Set(GAME_MODES.filter(mode => isScored(mode.id)).flatMap(mode =>
    [...pathPresets(mode.id), ...challengePresets(mode.id)].map(preset => progressKey(mode.id, preset.id))));
  return Object.fromEntries(Object.entries(input).filter(([key, value]) =>
    (builtInKeys.has(key) || /^(degrees|melody|chords|quality):custom-[\w-]+$/.test(key))
    && Number.isInteger(value) && value >= 1 && value <= 3));
}
/** A full session at 80% accuracy earns the selected difficulty; easier runs never erase progress. */
export function recordProgress(progress: Progress, settings: Settings, presetId: string | null, results: Result[]): Progress {
  if (!presetId || !isScored(settings.mode) || results.length !== settings.rounds || results.filter(r => r.correct).length / results.length < 0.8) return progress;
  const key = progressKey(settings.mode, presetId);
  return { ...progress, [key]: Math.max(progress[key] ?? 0, difficultyIndex(settings.answerSeconds) + 1) };
}
