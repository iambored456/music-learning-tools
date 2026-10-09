import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { parse } from 'svelte/compiler';
import { createLessonAudioOutput, lessonNoteAppearance } from '@mlt/lesson-kit';

test('lesson notes require grid scale and preserve action styles when their position changes', () => {
  const directory = new URL('../src/', import.meta.url);
  let notes = 0;
  for (const file of readdirSync(directory).filter(file => file.endsWith('.svelte'))) {
    const source = readFileSync(new URL(file, directory), 'utf8');
    function visit(node: any): void {
      if (!node || typeof node !== 'object') return;
      const action = node.attributes?.find((attribute: any) =>
        attribute.type === 'UseDirective' && attribute.name === 'lessonNoteAppearance');
      const noteClass = node.attributes?.find((attribute: any) =>
        attribute.type === 'Attribute' && attribute.name === 'class'
        && /\bmlt-lesson-note(?:-target|-svg)?(?=[\s"'`]|$)/.test(source.slice(attribute.start, attribute.end)));
      if (noteClass) assert.ok(action, `${file}: render standard lesson notes through the shared appearance action`);
      if (action) {
        notes++;
        const location = `${file}:${source.slice(0, node.start).split('\n').length}`;
        assert.ok(action.expression.properties.some((property: any) => property.key.name === 'cellWidth'),
          `${location}: supply the grid scale to the shared appearance action`);
        assert.ok(!node.attributes.some((attribute: any) => attribute.type === 'Attribute' && attribute.name === 'style'),
          `${location}: use style directives; whole style strings erase shared stroke, label and fill values`);
      }
      for (const value of Object.values(node)) {
        if (Array.isArray(value)) value.forEach(visit);
        else visit(value);
      }
    }
    visit(parse(source, { modern: true }));
  }
  assert.ok(notes > 0, 'the guard must inspect actual lesson notes');
  const skin = readFileSync(new URL('../../lesson-kit/src/styles.css', import.meta.url), 'utf8');
  assert.doesNotMatch(skin, /var\(--mlt-lesson-(?:note-stroke-width|note-label-size|fill-level)\s*,/,
    'appearance values must come from the shared action, without alternate CSS defaults');
});

test('Svelte position and color updates retain the standard stroke, label and envelope values', async () => {
  // Exercise the installed Svelte style runtime without starting a browser.
  const require = createRequire(import.meta.url);
  const runtime = resolve(dirname(require.resolve('svelte/package.json')), 'src/internal/client/dom/elements/style.js');
  const { set_style } = await import(pathToFileURL(runtime).href);
  const keys = ['SVGSVGElement', 'ResizeObserver', 'MutationObserver', 'getComputedStyle', 'document'] as const;
  const originals = keys.map(key => Object.getOwnPropertyDescriptor(globalThis, key));
  const properties = new Map<string, string>();
  let replacements = 0;
  const node = {
    classList: { contains: () => false },
    style: {
      set cssText(value: string) { replacements++; properties.clear(); },
      setProperty: (name: string, value: string) => properties.set(name, value),
      removeProperty: (name: string) => properties.delete(name),
    },
    setAttribute() {}, removeAttribute() { properties.clear(); },
    querySelector: () => null, isConnected: false,
  };
  const mocks = {
    SVGSVGElement: class {},
    ResizeObserver: class { observe() {} disconnect() {} },
    MutationObserver: class { observe() {} disconnect() {} },
    getComputedStyle: () => ({ width: 'auto', height: 'auto' }),
    document: { fonts: { ready: Promise.resolve() } },
  };
  let action: ReturnType<typeof lessonNoteAppearance> | undefined;
  try {
    keys.forEach(key => Object.defineProperty(globalThis, key, { configurable: true, value: mocks[key] }));
    let previous = set_style(node, '', undefined, { top: '10%', left: '40%', color: '#ff0000' });
    const audioOutput = createLessonAudioOutput();
    action = lessonNoteAppearance(node as unknown as HTMLElement, { audioOutput, cellWidth: 30, frequency: 440 });
    assert.equal(properties.get('--mlt-lesson-note-stroke-width'), '4.5px', 'grid scale applies before measurement');
    const expected = new Map(properties);
    for (const top of ['20%', '30%', '40%']) {
      // Match the action-update-before-position-update order of compiled notes.
      action.update({ audioOutput, cellWidth: 30, frequency: 660 });
      previous = set_style(node, '', previous, { top, left: '60%', color: '#00ff00' });
      for (const name of ['--mlt-lesson-note-stroke-width', '--mlt-lesson-note-label-size', '--mlt-lesson-fill-level']) {
        assert.equal(properties.get(name), expected.get(name), `${name} survives movement`);
      }
    }
    assert.equal(replacements, 1, 'movement must never replace the full style attribute');
  } finally {
    action?.destroy();
    keys.forEach((key, index) => {
      if (originals[index]) Object.defineProperty(globalThis, key, originals[index]!);
      else Reflect.deleteProperty(globalThis, key);
    });
  }
});
