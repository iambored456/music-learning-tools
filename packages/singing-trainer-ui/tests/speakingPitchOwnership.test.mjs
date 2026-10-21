import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(new URL('../package.json', import.meta.url));
const { compile } = require('svelte/compiler');
const client = await import(pathToFileURL(require.resolve('svelte/internal/client')).href);
const { flushSync } = await import(pathToFileURL(require.resolve('svelte')).href);

// Compile the real component scripts and run their Svelte effects without mounting a DOM.
// This catches sidebar effects overwriting the exercise after its store commands have run.
async function loadPanel(name) {
  const source = readFileSync(new URL(`../src/lib/components/controls/${name}.svelte`, import.meta.url), 'utf8')
    .match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];
  let code = compile(`<script lang="ts">${source}</script>`, { filename: `${name}.svelte`, generate: 'client' }).js.code;
  code = code.replace(/import\s+\*\s+as\s+\$\s+from\s+'svelte\/internal\/client';/,
    `import * as $ from '${pathToFileURL(require.resolve('svelte/internal/client')).href}';`);
  code = code.replace(/import 'svelte\/internal\/disclose-version';/, '');
  code = code.replace(/import\s+\{([\s\S]*?)\}\s+from\s+'[^']+';/g,
    (_match, names) => `const {${names}} = globalThis.__speakingPitchOwnershipMocks;`);
  code = code.replace(/import\s+(\w+)\s+from\s+'[^']+';/g,
    (_match, name) => `const ${name} = globalThis.__speakingPitchOwnershipMocks.${name};`);
  return (await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)).default;
}

test('sidebar effects preserve an active arrangement tonic and range, then restore speaking-pitch defaults in freeplay', async () => {
  const state = client.proxy({
    tonic: 'C#', yAxisRange: { minMidi: 39, maxMidi: 71 },
    centerGridOnSpeakingPitch: false, centerColorsOnSpeakingPitch: false,
    drone: { useSpeakingPitch: true, octave: 2 },
  });
  const calibration = client.proxy({ midi: 45 }); // A2
  const exercise = client.proxy({ isActive: true });
  const appState = { state, setDroneModeEnabled() {} };
  for (const [method, field] of Object.entries({
    setYAxisRange: 'yAxisRange', setCenterGridOnSpeakingPitch: 'centerGridOnSpeakingPitch',
    setCenterColorsOnSpeakingPitch: 'centerColorsOnSpeakingPitch', setAccidentalMode: 'accidentalMode', setTonic: 'tonic',
  })) appState[method] = value => { state[field] = value; };
  appState.setDroneOctave = value => { state.drone.octave = value; };
  globalThis.__speakingPitchOwnershipMocks = {
    appState, preferencesStore: { get speakingPitchMidi() { return calibration.midi; } },
    overdubExerciseState: { state: exercise }, updateDrone() {}, getPitchByMidi() {},
    untrack: client.untrack, onMount() {}, SegmentedToggle() {}, SpeakingPitchPanel() {},
  };
  let cleanup;
  try {
    const PitchPanel = await loadPanel('SpeakingPitchPanel');
    const UserSettings = await loadPanel('UserSettingsControls');
    cleanup = client.effect_root(() => { PitchPanel(null, {}); UserSettings(null, {}); });
    flushSync();
    assert.equal(state.tonic, 'C#', 'A2 speaking pitch must not replace the arrangement tonic');
    assert.deepEqual({ ...state.yAxisRange }, { minMidi: 39, maxMidi: 71 });
    assert.equal(state.centerGridOnSpeakingPitch, false);
    assert.equal(state.centerColorsOnSpeakingPitch, false);

    // Model the exercise store realigning to Bb2, before the sidebar effects flush.
    calibration.midi = 46;
    state.tonic = 'D';
    state.yAxisRange = { minMidi: 40, maxMidi: 72 };
    flushSync();
    assert.equal(state.tonic, 'D');
    assert.deepEqual({ ...state.yAxisRange }, { minMidi: 40, maxMidi: 72 });
    assert.equal(state.centerGridOnSpeakingPitch, false);

    exercise.isActive = false;
    flushSync();
    assert.equal(state.tonic, 'A#');
    assert.deepEqual({ ...state.yAxisRange }, { minMidi: 40, maxMidi: 66 });
    assert.equal(state.centerGridOnSpeakingPitch, true);
    assert.equal(state.centerColorsOnSpeakingPitch, true);
  } finally {
    cleanup?.();
    delete globalThis.__speakingPitchOwnershipMocks;
  }
});
