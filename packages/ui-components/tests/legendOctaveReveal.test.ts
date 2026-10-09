import assert from 'node:assert/strict';
import test from 'node:test';
import { fullRowData } from '@mlt/pitch-data';
import { drawLegend, type LegendRenderConfig } from '../src/canvas/PitchGrid/renderers/legend';
import type { CoordinateUtils } from '../src/canvas/PitchGrid/types';

function render(progress?: number, overrides: Partial<LegendRenderConfig> = {}) {
  const text: Array<{ method: string; label: string; x: number; alpha: number }> = [];
  const backgrounds: Array<{ color: string; alpha: number }> = [];
  const alphaStack: number[] = [];
  const context = {
    canvas: { height: 80, getContext: () => null }, fillStyle: '', globalAlpha: 1,
    save() { alphaStack.push(this.globalAlpha); },
    restore() { this.globalAlpha = alphaStack.pop()!; },
    measureText(label: string) { return { width: [...label].reduce((width, char) => width + (/\d/.test(char) ? 8 : 10), 0) }; },
    fillRect() { backgrounds.push({ color: this.fillStyle, alpha: this.globalAlpha }); },
    strokeText(label: string, x: number) { text.push({ method: 'stroke', label, x, alpha: this.globalAlpha }); },
    fillText(label: string, x: number) { text.push({ method: 'fill', label, x, alpha: this.globalAlpha }); },
  };
  const config: LegendRenderConfig = {
    fullRowData: fullRowData.filter(row => row.toneNote === 'C4'),
    cellWidth: 20, cellHeight: 40, legendColumnWidth: 60, colorMode: 'color',
    showFrequencyLabels: false, showOctaveLabels: true, showLegendLabels: true,
    showAccidentalLabels: true, accidentalMode: { sharp: false, flat: false },
    focusedPitchClasses: null, focusColorsEnabled: false, octaveLabelProgress: progress,
    ...overrides,
  };
  drawLegend(context as unknown as CanvasRenderingContext2D, config,
    { startRow: 0, endRow: 0, coords: { getRowY: () => 40 } as CoordinateUtils }, ['A']);
  return { text, backgrounds, alpha: context.globalAlpha };
}

test('the letter stays opaque and shifts left while both octave outline and fill fade in', () => {
  const start = render(0), middle = render(0.5), almostDone = render(0.999), end = render(1);
  for (const method of ['stroke', 'fill']) {
    assert.deepEqual(start.text.filter(item => item.method === method), [
      { method, label: 'C', x: 30, alpha: 1 }, { method, label: '4', x: 35, alpha: 0 },
    ]);
    assert.deepEqual(middle.text.filter(item => item.method === method), [
      { method, label: 'C', x: 28, alpha: 1 }, { method, label: '4', x: 35, alpha: 0.5 },
    ]);
    assert.ok(Math.abs(almostDone.text.find(item => item.method === method && item.label === 'C')!.x - 26) < 0.01);
    assert.deepEqual(end.text.filter(item => item.method === method), [{ method, label: 'C4', x: 30, alpha: 1 }]);
  }
  for (const snapshot of [start, middle, almostDone, end]) {
    assert.deepEqual(snapshot.backgrounds, end.backgrounds, 'cell colour never fades or changes');
    assert.equal(snapshot.alpha, 1, 'number opacity cannot leak into later cells');
  }
});

test('default labels, explicit overrides, frequencies, and hidden octaves keep their established rendering', () => {
  assert.deepEqual(render().text, render(1).text);
  for (const overrides of [
    { midiLabelOverrides: new Map([[60, 'C4']]) },
    { labelOverrides: new Map([[0, 'Do']]) },
    { showFrequencyLabels: true }, { showOctaveLabels: false },
  ]) assert.deepEqual(render(0, overrides).text, render(1, overrides).text);
});
