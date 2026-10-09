import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { compile } from 'svelte/compiler';
import { render } from 'svelte/server';
import type { Component } from 'svelte';

const source = await readFile(new URL('../src/PianoKeyboard.svelte', import.meta.url), 'utf8');
const compiled = compile(source, { filename: 'PianoKeyboard.svelte', generate: 'server' }).js.code;
const resolved = compiled.replace(/(["'])(svelte(?:\/[^"']+)?|@mlt\/pitch-data)\1/g,
  (_match, _quote, name) => JSON.stringify(import.meta.resolve(name)));
const { default: Keyboard } = await import(`data:text/javascript;base64,${Buffer.from(resolved).toString('base64')}`) as {
  default: Component<{ minMidi?: number; maxMidi?: number; activeMidi?: number | null; showLabels?: boolean; showOctaveLabels?: boolean }>;
};

test('A3–C5 renders ten labelled white keys and six labelled black keys', () => {
  const html = render(Keyboard, { props: { minMidi: 57, maxMidi: 72, showLabels: true } }).body;
  assert.equal((html.match(/class="white key/g) ?? []).length, 10);
  assert.equal((html.match(/class="black key/g) ?? []).length, 6);
  assert.deepEqual([...html.matchAll(/data-midi="(\d+)"/g)].map(match => Number(match[1])).sort((a, b) => a - b), Array.from({ length: 16 }, (_, index) => 57 + index));
  for (const label of ['A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'A♯3', 'B♭3', 'C♯4', 'D♭4', 'G♯4', 'A♭4']) assert.ok(html.includes(`>${label}<`), label);
  assert.match(html, /from A3 to C5, with labelled keys/);
});

test('playback highlights exactly the active natural or accidental MIDI key', () => {
  for (const activeMidi of [57, 58, 68, 72, null]) {
    const html = render(Keyboard, { props: { minMidi: 57, maxMidi: 72, activeMidi, showLabels: true, showOctaveLabels: false } }).body;
    assert.doesNotMatch(html, />[^<]*[A-G][♯♭]?\d+[^<]*</);
    for (const label of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'A♯', 'B♭', 'C♯', 'D♭', 'G♯', 'A♭']) assert.ok(html.includes(`>${label}<`), label);
    const active = [...html.matchAll(/<div\b[^>]*class="[^"]*\bactive\b[^"]*"[^>]*data-midi="(\d+)"/g)].map(match => Number(match[1]));
    assert.deepEqual(active, activeMidi === null ? [] : [activeMidi]);
  }
});

test('existing consumers keep the unlabelled keyboard by default', () => {
  const html = render(Keyboard).body;
  assert.doesNotMatch(html, /class="key-label/);
  assert.match(html, /from A3 to A4/);
});
