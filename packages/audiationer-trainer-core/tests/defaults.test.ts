import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAME_MODES, TrainerSession, applyPreset, migrateFreeplaySettingsDefaults, migrateSettingsDefaults, normalizeFreeplaySettings, normalizeSettings, pathPresets, wheelView, type TrainerAudio } from '../src/index.ts';

test('every mode defaults to Minimal Chromatic and full drone volume across all settings namespaces', () => {
  for (const mode of GAME_MODES) {
    const settings = normalizeSettings({ mode: mode.id });
    assert.equal(wheelView(settings), 'minimal-chromatic', mode.id);
    assert.equal(settings.droneVolume, 1);
    assert.equal(settings.degreeOptions.droneVolume, 1);
    assert.equal(settings.pocket.droneVolume, 1);
    for (const preset of pathPresets(mode.id)) {
      const level = applyPreset(settings, preset);
      assert.equal(wheelView(level), 'minimal-chromatic');
      assert.equal(level.droneVolume, 1);
    }
    assert.deepEqual(normalizeSettings(JSON.parse(JSON.stringify(settings))), settings);
  }
  const freeplay = normalizeFreeplaySettings({});
  assert.equal(freeplay.order, 'chromatic');
  assert.equal(freeplay.droneVolume, 1);
  assert.deepEqual(normalizeFreeplaySettings(JSON.parse(JSON.stringify(freeplay))), freeplay);
});

test('the full zero-to-one drone range survives normalization and persistence', () => {
  for (const volume of [0, 0.15, 0.5, 0.8, 1]) {
    const settings = normalizeSettings({ droneVolume: volume, degreeOptions: { droneVolume: volume }, pocket: { droneVolume: volume } });
    const restored = normalizeSettings(JSON.parse(JSON.stringify(settings)));
    assert.equal(restored.droneVolume, volume);
    assert.equal(restored.degreeOptions.droneVolume, volume);
    assert.equal(restored.pocket.droneVolume, volume);
  }
  assert.equal(normalizeSettings({ droneVolume: 2 }).droneVolume, 1);
  assert.equal(normalizeSettings({ droneVolume: NaN }).droneVolume, 1);
});

test('old default views and drone levels upgrade once in existing saved settings', () => {
  for (const wheelStyle of ['compass', 'minimal']) {
    const upgraded = migrateSettingsDefaults({ reviewSkip: 'correct', wheelStyle, order: 'fifths', droneVolume: 0.15, degreeOptions: { droneVolume: 0.8 }, pocket: { droneVolume: 0.8 } });
    assert.equal(wheelView(upgraded), 'minimal-chromatic');
    assert.equal(upgraded.droneVolume, 1);
    assert.equal(upgraded.degreeOptions.droneVolume, 1);
    assert.equal(upgraded.pocket.droneVolume, 1);
    assert.deepEqual(migrateSettingsDefaults(JSON.parse(JSON.stringify(upgraded))), upgraded);
  }
  const freeplay = migrateFreeplaySettingsDefaults({ order: 'fifths', droneVolume: 0.8, tonic: 7 });
  assert.equal(freeplay.order, 'chromatic');
  assert.equal(freeplay.droneVolume, 1);
  assert.equal(freeplay.tonic, 7);
  assert.deepEqual(migrateFreeplaySettingsDefaults(JSON.parse(JSON.stringify(freeplay))), freeplay);
});

test('custom views and volumes remain available and are not reset on later visits', () => {
  const custom = migrateSettingsDefaults({ reviewSkip: 'none', order: 'chromatic', wheelStyle: 'compass', droneVolume: 0.35, degreeOptions: { droneVolume: 0 }, pocket: { droneVolume: 0.7 } });
  assert.equal(wheelView(custom), 'chromatic');
  assert.equal(custom.droneVolume, 0.35);
  assert.equal(custom.degreeOptions.droneVolume, 0);
  assert.equal(custom.pocket.droneVolume, 0.7);
  const chosen = normalizeSettings({ order: 'fifths', wheelStyle: 'compass', droneVolume: 0.15, degreeOptions: { droneVolume: 0.8 }, pocket: { droneVolume: 0.8 } });
  assert.deepEqual(migrateSettingsDefaults(JSON.parse(JSON.stringify(chosen))), chosen);
  const freeplay = normalizeFreeplaySettings({ order: 'fifths', droneVolume: 0.8 });
  assert.deepEqual(migrateFreeplaySettingsDefaults(JSON.parse(JSON.stringify(freeplay))), freeplay);
});

test('scored modes pass the full default drone level to the audio engine', async () => {
  for (const mode of ['degrees', 'melody', 'chords'] as const) {
    const drones: number[] = [];
    const audio: TrainerAudio = {
      async unlock() {}, async notes() {}, volume() {}, async speak() {}, stop() {},
      drone(_midi, volume) { drones.push(volume); },
    };
    const session = new TrainerSession(audio, () => {}, () => 0, async () => {});
    await session.start(normalizeSettings({ mode, cadence: false }));
    assert.equal(drones.at(-1), 1, mode);
    session.destroy();
  }
});
