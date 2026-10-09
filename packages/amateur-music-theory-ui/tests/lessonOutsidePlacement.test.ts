import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { parse } from 'svelte/compiler';
import { fullRowData } from '@mlt/pitch-data';
import { snapLessonPlacement } from '@mlt/lesson-kit';

const files = ['PitchLesson112HighLow', 'PitchLesson12Section', 'PitchLesson13Section', 'PitchLesson14Section'];
const sources = new Map(await Promise.all(files.map(async name => [name,
  await readFile(new URL(`../src/${name}.svelte`, import.meta.url), 'utf8')] as const)));

function functions(component: string, names: string[], environment: Record<string, unknown>) {
  const source = sources.get(component)!;
  const script = ts.createSourceFile('scene.ts', source.split('<script lang="ts">')[1].split('</script>')[0], ts.ScriptTarget.Latest, true);
  const declarations = names.map(name => {
    const declaration = script.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
    assert.ok(declaration, `Missing ${name}`);
    return declaration.getText(script);
  }).join('\n');
  const javascript = ts.transpileModule(declarations, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return runInNewContext(`${javascript}\n({ ${names.join(', ')} })`, environment);
}

function environment() {
  const captured = new Set<number>();
  return {
    pointerId: null, preview: null, answerLocked: false, isPlaying: true,
    currentQuestion: { kind: 'place' }, columns: 28, rowCount: 25, snapLessonPlacement, fullRowData,
    firstRow: fullRowData.findIndex(row => row.midi === 81),
    placementLayer: {
      getBoundingClientRect: () => ({ left: 100, top: 100, right: 380, bottom: 360, width: 280, height: 260 }),
      setPointerCapture: (id: number) => captured.add(id),
      hasPointerCapture: (id: number) => captured.has(id),
      releasePointerCapture: (id: number) => captured.delete(id),
    },
  };
}
const release = { pointerId: 7, clientX: 280, clientY: 310, button: 0, preventDefault() {} };

test('outside releases use the actual release pitch and column in Lessons 1.3 and 1.4', () => {
  for (const component of ['PitchLesson13Section', 'PitchLesson14Section']) {
    const answers: Array<[number, number]> = [];
    const env = { ...environment(),
      submit: (midi: number, left: number) => answers.push([midi, left]),
      submitPlacement: (midi: number, column: number) => answers.push([midi, column]),
    };
    const api = functions(component, ['updatePointer', 'finishPointer', 'cancelPointer'], env);
    // An unrelated hover preview must not override the release coordinates.
    env.preview = { midi: 70, leftPercent: 20, column: 3 } as any;
    api.finishPointer(release, true);
    assert.deepEqual(answers, [[61, component === 'PitchLesson13Section' ? 18 / 28 * 100 : 18]]);
    assert.equal(env.preview, null);
    assert.equal(env.pointerId, null);
    api.finishPointer({ ...release, clientX: 50 }, true);
    assert.equal(answers.length, 1);
  }
});

test('Lesson 1.2 outside releases preserve fixed columns and snap free-column answers normally', () => {
  for (const freeColumnPlacement of [false, true]) {
    const answers: Array<[string, number]> = [];
    const env = { ...environment(), interaction: 'placement', freeColumnPlacement,
      placementPointerId: null, placementPreviewTone: null, placementLeftPercent: 48,
      layoutGridColumnCount: 28, displayRowCount: 25,
      displayRows: fullRowData.filter(row => row.midi >= 57 && row.midi <= 81),
      handleRowChoice: (tone: string) => answers.push([tone, env.placementLeftPercent]),
    };
    const api = functions('PitchLesson12Section', ['updatePlacementPointer', 'finishPlacementPointer', 'cancelPlacementGesture'], env);
    api.finishPlacementPointer(release, true);
    assert.deepEqual(answers, [['Db4', freeColumnPlacement ? 18 / 28 * 100 : 48]]);
    assert.equal(env.placementPreviewTone, null);
    assert.equal(env.placementPointerId, null);
    env.answerLocked = true;
    api.finishPlacementPointer(release, true);
    assert.equal(answers.length, 1);
  }
});

test('Lesson 1.1 outside releases reuse the high/low answer path and respect input locks', async () => {
  const answers: string[] = [];
  const env = { interactionEnabled: true, isPlaying: true, dragging: false,
    currentTask: { target: 'lower' }, noteY: 50, notePlacedOnGrid: false, activeRegion: null,
    fieldEl: { getBoundingClientRect: () => ({ left: 100, top: 100, right: 380, bottom: 360, width: 280, height: 260 }) },
    getRowIndexForPercent: (percent: number) => Math.round(percent / 10),
    rowCenter: (index: number) => index * 10,
    handleSuccessfulDrop: async () => { answers.push('correct'); },
    handleIncorrectDrop: async () => { answers.push('retry'); },
  };
  const api = functions('PitchLesson112HighLow', ['placeNoteFromOutside', 'getFieldPoint', 'getFieldHalfFromY'], env);
  await api.placeNoteFromOutside(release);
  assert.equal(env.noteY, 80);
  assert.equal(env.notePlacedOnGrid, true);
  assert.deepEqual(answers, ['correct']);
  await api.placeNoteFromOutside({ ...release, clientY: 150 });
  assert.deepEqual(answers, ['correct', 'retry']);
  env.interactionEnabled = false;
  await api.placeNoteFromOutside(release);
  assert.equal(answers.length, 2);
});

test('local presses still require their matching pointer and never submit twice', () => {
  for (const component of ['PitchLesson13Section', 'PitchLesson14Section']) {
    let answers = 0;
    const env = { ...environment(), submit: () => { answers++; }, submitPlacement: () => { answers++; } };
    const api = functions(component, ['updatePointer', 'beginPointer', 'finishPointer', 'cancelPointer'], env);
    api.finishPointer(release);
    assert.equal(answers, 0);
    api.beginPointer(release);
    assert.equal(env.placementLayer.hasPointerCapture(7), true);
    api.finishPointer({ ...release, pointerId: 8 }, true);
    assert.equal(env.placementLayer.hasPointerCapture(7), true);
    assert.equal(answers, 0);
    api.finishPointer({ ...release, pointerId: 8 });
    assert.equal(answers, 0);
    api.finishPointer(release);
    api.finishPointer(release);
    assert.equal(answers, 1);
    assert.equal(env.placementLayer.hasPointerCapture(7), false);
  }
});

test('every placement scene wires the shared outside gesture; captured releases stay on the capturing parent', () => {
  for (const component of files) {
    const source = sources.get(component)!;
    let layer: any;
    function visit(node: any): void {
      if (!node || typeof node !== 'object') return;
      if (node.attributes?.some((attribute: any) => attribute.type === 'UseDirective'
        && attribute.name === 'lessonOutsidePlacement')) layer = node;
      for (const value of Object.values(node)) {
        if (Array.isArray(value)) value.forEach(visit);
        else visit(value);
      }
    }
    visit(parse(source, { modern: true }));
    assert.ok(layer, `${component} must support outside placement`);
    if (component === 'PitchLesson13Section' || component === 'PitchLesson14Section') {
      for (const event of ['onpointermove', 'onpointerup', 'onpointercancel', 'onlostpointercapture']) {
        assert.ok(layer.attributes.some((attribute: any) => attribute.name === event), `Capturing parent must handle ${event}`);
      }
    }
  }
});
