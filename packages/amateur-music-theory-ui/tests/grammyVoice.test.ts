import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Test the actual selector without loading the controller's Vite-only SVG assets.
const source = await readFile(new URL('../src/grammyVoice.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const moduleSource = outputText.replace('@mlt/talking-avatar', new URL('../../talking-avatar/src/voices.ts', import.meta.url).href);
const { createGrammyVoiceSelection, isGrammyVoice } = await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`);
const voice = (name: string, lang = 'en-CA') => ({ name, lang, voiceURI: name, localService: true, default: false }) as SpeechSynthesisVoice;

test('Grammy prefers a male English voice over an exact-locale female voice', () => {
  const selection = createGrammyVoiceSelection();
  const david = voice('Microsoft David - English (United States)', 'en-US');
  assert.equal(selection.select([voice('Microsoft Linda'), david]), david);
  assert.equal(isGrammyVoice(voice('Google UK English Female', 'en-GB')), false);
  assert.equal(isGrammyVoice(voice('Google UK English Male', 'en-GB')), true);
  assert.equal(isGrammyVoice(voice('Microsoft Mark', 'de-DE')), false);
});

test('Grammy keeps the selected voice across reordered or expanded lists', () => {
  const selection = createGrammyVoiceSelection();
  const richard = voice('Microsoft Richard');
  const david = voice('Microsoft David', 'en-US');
  assert.equal(selection.select([voice('Microsoft Linda'), richard, david]), richard);
  assert.equal(selection.select([david, richard, voice('Microsoft Linda')]), richard);
  assert.equal(selection.isReady([voice('Microsoft Linda')]), false);
});

test('a temporary fallback does not pin a female voice when male voices arrive later', () => {
  const selection = createGrammyVoiceSelection();
  const linda = voice('Microsoft Linda');
  const richard = voice('Microsoft Richard');
  assert.equal(selection.isReady([linda]), false);
  assert.equal(selection.select([linda]), linda);
  assert.equal(selection.select([linda, richard]), richard);
  assert.equal(selection.select([]), undefined);
});
