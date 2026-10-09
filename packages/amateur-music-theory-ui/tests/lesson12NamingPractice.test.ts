import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { fullRowData } from '@mlt/pitch-data';
import { calculateLessonGridLayout } from '@mlt/lesson-kit';
import { pianoLessonRange } from '../src/lesson12PianoRange';
import { lesson12LegendColumns } from '../src/lesson12Grid';
import { getLesson12SeekTarget, lesson12Cues } from '../src/lesson12Cues';

const source = await readFile(new URL('../src/PitchLesson12Section.svelte', import.meta.url), 'utf8');
const script = ts.createSourceFile('scene.ts', source.split('<script lang="ts">')[1].split('</script>')[0], ts.ScriptTarget.Latest, true);
function initializer(name: string): ts.Expression {
  const expression = script.statements.filter(ts.isVariableStatement)
    .flatMap(statement => [...statement.declarationList.declarations])
    .find(declaration => declaration.name.getText(script) === name)?.initializer;
  assert.ok(expression, `Missing ${name}`); return expression;
}
function derived(name: string): string {
  const expression = initializer(name);
  assert.ok(ts.isCallExpression(expression)); return expression.arguments[0].getText(script);
}
function declaration(name: string): string {
  const node = script.statements.find(item => ts.isFunctionDeclaration(item) && item.name?.text === name);
  assert.ok(node, `Missing ${name}`); return node.getText(script);
}
function evaluate(code: string, environment: Record<string, unknown>) {
  return runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, environment);
}

test('1.2.6 keeps exactly the 1.2.5 grid dimensions and range at wide, narrow, and height-limited sizes', () => {
  const code = `${declaration('selectPitchRows')}
    const rowsByGridKind = ${initializer('rowsByGridKind').getText(script)};
    const rows = rowsByGridKind[section.id === 'accidentals' ? 'chromatic-c' : 'practice'];
    const displayRowCount = rows.length;
    const layoutRowCount = displayRowCount;
    const compactGrid = ${derived('compactGrid')};
    const layoutGridColumnCount = ${derived('layoutGridColumnCount')};
    const layout = ${derived('gridLayout')};
    ({ layout, rows });`;
  for (const [frameWidth, frameHeight, pianoSpaceHeight] of [[340, 500, 92], [900, 700, 140], [1440, 240, 140]]) {
    const environment = {
      frameWidth, frameHeight, pianoSpaceHeight, compactGridWidth: Math.min(frameWidth, 576),
      pianoLessonRange, pitchRows: fullRowData, pianoMorphLayout: null, calculateLessonGridLayout,
      gridColumnCount: 28, legendWidthUnits: lesson12LegendColumns, fallbackCellSize: 18,
    };
    const previous = evaluate(code, { ...environment, section: { id: 'accidentals' } });
    const practice = evaluate(code, { ...environment, section: { id: 'naming-practice' } });
    assert.deepEqual({ ...practice.layout }, { ...previous.layout });
    assert.deepEqual(Array.from(practice.rows, (row: any) => row.midi),
      Array.from(previous.rows, (row: any) => row.midi));
    assert.equal(practice.rows[0].toneNote, 'C5');
    assert.equal(practice.rows.at(-1).toneNote, 'C4');
    assert.equal(practice.rows.length, 13);
  }
});

test('every naming question is in C4–C5 with unnumbered written, spoken, and revealed labels and seekable retries', async () => {
  const names = ['combinedPracticeQuestions', 'flatPracticeQuestions', 'sharpPracticeQuestions'];
  const questions: Array<{ toneNote: string; prompt: string; spokenPrompt: string; revealLabel: string }> = [];
  const environment = {
    gridKind: '', letterLegendOnly: true, accidentalMode: {},
    mark() {}, say: async () => {}, isCurrentSequence: () => true,
    askPlacement: async (question: typeof questions[number]) => { questions.push(question); },
    finishSection: async () => {}, inspector: { status() {} },
  };
  await evaluate(`${names.map(name => `const ${name} = ${initializer(name).getText(script)};`).join('\n')}
    ${declaration('runPractice')}
    runPractice(1);`, environment);
  assert.equal(questions.length, 9);
  for (const question of questions) {
    const row = fullRowData.find(row => row.toneNote === question.toneNote)!;
    assert.ok(row.midi! >= 60 && row.midi! <= 72);
    assert.doesNotMatch([question.prompt, question.spokenPrompt, question.revealLabel].join(' '), /\d/);
  }
  for (const cue of lesson12Cues['naming-practice']) {
    for (const action of cue.actions ?? []) {
      assert.doesNotMatch(action.title, /[A-G][♭♯]?\d/);
      assert.ok(getLesson12SeekTarget(lesson12Cues['naming-practice'], cue.id, action.id));
    }
  }
});
