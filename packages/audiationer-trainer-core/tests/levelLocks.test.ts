import { test } from 'node:test';
import assert from 'node:assert/strict';
import { challengePresetGroups, levelAccess, nextPreset, normalizeLevelLocks, normalizeProgress, normalizeSettings,
  pathPresetGroups, recordProgress, type Progress, type Result } from '../src/index.ts';

const modes = ['degrees', 'melody', 'chords', 'chord-progressions', 'quality'] as const;

test('each level and challenge list starts with only its first card available', () => {
  for (const mode of modes) {
    for (const group of [...pathPresetGroups(mode), ...challengePresetGroups(mode)]) {
      group.presets.forEach((preset, index) => {
        const access = levelAccess(mode, preset.id, {});
        assert.equal(access.unlocked, index === 0, `${mode}/${preset.id}`);
        assert.equal(access.prerequisite?.id ?? null, group.presets[index - 1]?.id ?? null);
      });
    }
  }
});

test('a qualifying gem unlocks only that exercise at any difficulty, independently of its paired exercise', () => {
  for (const [single, sequence] of [['degrees', 'melody'], ['chords', 'chord-progressions']] as const) {
    for (const mode of [single, sequence]) {
      for (const answerSeconds of [0, 5, 2]) {
        const settings = normalizeSettings({ mode, rounds: 5, answerSeconds });
        const results: Result[] = Array.from({ length: 5 }, (_, index) => ({ expected: '1', received: '1', tonic: 0, octave: 4, correct: index < 4, seconds: 1 }));
        const progress = recordProgress({}, settings, 'sun-1', results);
        for (const member of [single, sequence]) {
          assert.equal(levelAccess(member, 'sun-2', progress).unlocked, member === mode);
          assert.equal(levelAccess(member, 'sun-3', progress).unlocked, false);
          assert.equal(progress[`${member}:sun-2`], undefined);
        }
        assert.equal(levelAccess(single === 'degrees' ? 'chords' : 'degrees', 'sun-2', progress).unlocked, false);
      }
    }
  }
});

test('challenge gems advance their own lists and do not open unrelated lists', () => {
  const progress: Progress = { 'melody:mode-1': 1, 'chord-progressions:mode-1': 2, 'quality:all-qualities': 3 };
  assert.equal(levelAccess('degrees', 'mode-6', progress).unlocked, false);
  assert.equal(levelAccess('melody', 'mode-6', progress).unlocked, true);
  assert.equal(levelAccess('melody', 'mode-2', progress).unlocked, false);
  assert.equal(levelAccess('degrees', 'minor-pentatonic', progress).unlocked, false);
  assert.equal(levelAccess('degrees', 'sun-2', progress).unlocked, false);
  assert.equal(levelAccess('chords', 'mode-2', progress).unlocked, false);
  assert.equal(levelAccess('chord-progressions', 'mode-2', progress).unlocked, true);
  assert.equal(levelAccess('quality', 'major-family', progress).unlocked, true);
  assert.equal(levelAccess('quality', 'minor-family', progress).unlocked, false);
});

test('Unlock all levels persists separately; Reset Level Lock restores earned progression without removing gems', () => {
  const progress = normalizeProgress({ 'degrees:sun-1': 1, 'quality:triads-1': 2 });
  const before = structuredClone(progress);
  const unlocked = normalizeLevelLocks(JSON.parse(JSON.stringify({ unlockAll: true })));
  for (const mode of modes) {
    for (const group of [...pathPresetGroups(mode), ...challengePresetGroups(mode)]) {
      for (const preset of group.presets) assert.equal(levelAccess(mode, preset.id, progress, unlocked).unlocked, true);
    }
  }
  const reset = normalizeLevelLocks({ unlockAll: false });
  assert.equal(levelAccess('degrees', 'sun-2', progress, reset).unlocked, true);
  assert.equal(levelAccess('melody', 'sun-2', progress, reset).unlocked, false);
  assert.equal(levelAccess('melody', 'sun-3', progress, reset).unlocked, false);
  assert.equal(levelAccess('quality', 'triads-2', progress, reset).unlocked, true);
  assert.equal(levelAccess('degrees', 'minor-pentatonic', progress, reset).unlocked, false);
  assert.deepEqual(progress, before);
  for (const invalid of [null, {}, [], true, { unlockAll: 'true' }, { unlockAll: 1 }]) assert.deepEqual(normalizeLevelLocks(invalid), reset);
});

test('previously completed cards and their immediate successors remain accessible in older saves', () => {
  const progress = normalizeProgress({ 'melody:sun-4': 3 });
  assert.equal(levelAccess('degrees', 'sun-3', progress).unlocked, false);
  assert.equal(levelAccess('degrees', 'sun-4', progress).unlocked, false);
  assert.equal(levelAccess('degrees', 'sun-5', progress).unlocked, false);
  assert.equal(levelAccess('melody', 'sun-4', progress).unlocked, true);
  assert.equal(levelAccess('melody', 'sun-5', progress).unlocked, true);
  assert.equal(levelAccess('degrees', 'sun-6', progress).unlocked, false);
});

test('Next Level access uses earned gems, so incomplete or unsuccessful sessions cannot unlock it', () => {
  const settings = normalizeSettings({ mode: 'degrees', rounds: 5 });
  const results: Result[] = Array.from({ length: 5 }, (_, index) => ({ expected: '1', received: '1', tonic: 0, octave: 4, correct: index < 3, seconds: 1 }));
  const next = nextPreset('degrees', 'sun-1')!;
  assert.equal(levelAccess('degrees', next.id, recordProgress({}, settings, 'sun-1', results)).unlocked, false);
  assert.equal(levelAccess('degrees', next.id, recordProgress({}, settings, 'sun-1', results.slice(0, 3))).unlocked, false);
  results[3].correct = true;
  assert.equal(levelAccess('degrees', next.id, recordProgress({}, settings, 'sun-1', results)).unlocked, true);
});

test('custom practice and listening modes stay accessible and cannot open built-in cards with custom gems', () => {
  const progress: Progress = { 'degrees:custom-my-level': 3, 'chords:sun-1': 1 };
  assert.equal(levelAccess('degrees', 'custom-my-level', progress).unlocked, true);
  assert.equal(levelAccess('degrees', null, progress).unlocked, true);
  assert.equal(levelAccess('degrees', 'sun-2', progress).unlocked, false);
  assert.equal(levelAccess('pocket', 'sun-7', {}).unlocked, true);
  assert.equal(levelAccess('freeplay', 'sun-7', {}).unlocked, true);
});
