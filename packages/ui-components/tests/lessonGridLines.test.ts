import assert from 'node:assert/strict';
import test from 'node:test';
import { fullRowData } from '@mlt/pitch-data';
import { drawHorizontalLines, drawVerticalLines } from '../src/canvas/PitchGrid/renderers/gridLines';
import { drawLegend, type LegendRenderConfig } from '../src/canvas/PitchGrid/renderers/legend';
import type { CoordinateUtils } from '../src/canvas/PitchGrid/types';

test('Student Notation grid preset uses fixed C/E strokes and G shading without changing default C color', () => {
  const strokes: Array<{ color: unknown; width: number; dash: number[] }> = [];
  const fills: unknown[] = [];
  let dash: number[] = [];
  const context = {
    strokeStyle: '', fillStyle: '', lineWidth: 0,
    beginPath() {}, moveTo() {}, lineTo() {}, save() {}, restore() {},
    setLineDash(value: number[]) { dash = value; },
    stroke() { strokes.push({ color: this.strokeStyle, width: this.lineWidth, dash }); },
    fillRect() { fills.push(this.fillStyle); },
  };
  const config = { fullRowData, cellHeight: 40, viewportHeight: 200, viewportWidth: 200, colorMode: 'color' as const };
  const coords = { getRowY: () => 100 } as unknown as CoordinateUtils;
  for (const tone of ['C4', 'E4', 'G4']) {
    const index = fullRowData.findIndex(row => row.toneNote === tone);
    assert.ok(index >= 0);
    drawHorizontalLines(context as unknown as CanvasRenderingContext2D,
      { ...config, horizontalGridStyle: 'student-notation' }, coords, index, index);
  }
  assert.deepEqual(strokes, [
    { color: 'rgba(255, 0, 0, 0.9)', width: 3.33, dash: [] },
    { color: '#adb5bd', width: 1, dash: [5, 5] },
  ]);
  assert.deepEqual(fills, ['#dee2e6']);
  const c = fullRowData.findIndex(row => row.toneNote === 'C4');
  drawHorizontalLines(context as unknown as CanvasRenderingContext2D, config, coords, c, c);
  assert.equal(strokes.at(-1)?.color, '#adb5bd');
});


test('vertical beat dashes use the same 1px grey 5/5 pattern as horizontal E lines', () => {
  const strokes: Array<{ color: string; width: number; dash: number[] }> = [];
  let dash: number[] = [];
  const context = {
    strokeStyle: '', lineWidth: 0,
    beginPath() {}, moveTo() {}, lineTo() {},
    setLineDash(value: number[]) { dash = value; },
    stroke() { strokes.push({ color: this.strokeStyle, width: this.lineWidth, dash }); },
  };
  drawVerticalLines(context as unknown as CanvasRenderingContext2D, {
    columnWidths: [1, 1, 1, 1], cellWidth: 20, viewportHeight: 200,
    macrobeatGroupings: [], macrobeatBoundaryStyles: ['dashed'], placedTonicSigns: [],
  }, { getColumnX: (column: number) => column * 20 } as CoordinateUtils, [2]);
  assert.deepEqual(strokes, [
    { color: '#adb5bd', width: 2, dash: [] },
    { color: '#adb5bd', width: 1, dash: [5, 5] },
    { color: '#adb5bd', width: 2, dash: [] },
  ]);
});

test('legend glow targets one MIDI label and restores crisp text without changing default overlays', () => {
  const texts: Array<{ label: string; blur: number; alpha: number }> = [];
  const backgrounds: Array<{ color: string; alpha: number }> = [];
  const saved: Array<{ shadowBlur: number; shadowColor: string; globalAlpha: number }> = [];
  const context = {
    canvas: { height: 140, getContext: () => null },
    fillStyle: '', shadowBlur: 0, shadowColor: '', globalAlpha: 1,
    save() { saved.push({ shadowBlur: this.shadowBlur, shadowColor: this.shadowColor, globalAlpha: this.globalAlpha }); },
    restore() { Object.assign(this, saved.pop()); },
    fillRect() { backgrounds.push({ color: this.fillStyle, alpha: this.globalAlpha }); },
    strokeText() {},
    fillText(label: string) { texts.push({ label, blur: this.shadowBlur, alpha: this.globalAlpha }); },
  };
  const config: LegendRenderConfig = {
    fullRowData: fullRowData.filter(row => ['F4', 'F5'].includes(row.toneNote)),
    cellWidth: 20, cellHeight: 40, legendColumnWidth: 60, colorMode: 'color',
    showFrequencyLabels: false, showOctaveLabels: true, showLegendLabels: true,
    showAccidentalLabels: true, accidentalMode: { sharp: false, flat: false },
    focusedPitchClasses: null, focusColorsEnabled: false,
    highlight: { pitchClass: null, midi: 65, opacity: 0.8, color: '#fff4b8', style: 'glow' },
  };
  const options = { startRow: 0, endRow: 1, coords: { getRowY: (row: number) => 25 + row * 40 } as CoordinateUtils };
  drawLegend(context as unknown as CanvasRenderingContext2D, config, options, ['B', 'A']);
  assert.deepEqual(texts, [
    { label: 'F5', blur: 0, alpha: 1 },
    { label: 'F4', blur: 12, alpha: 0.8 },
    { label: 'F4', blur: 0, alpha: 1 },
  ]);
  assert.equal(backgrounds.length, 2, 'glow does not tint the legend cells');
  texts.length = 0; backgrounds.length = 0;
  drawLegend(context as unknown as CanvasRenderingContext2D,
    { ...config, highlight: { pitchClass: 5, opacity: 0.3, color: '#ffff00' } }, options, ['B', 'A']);
  assert.equal(texts.length, 2);
  assert.ok(texts.every(text => text.blur === 0 && text.alpha === 1));
  assert.equal(backgrounds.filter(fill => fill.color === '#ffff00' && fill.alpha === 0.3).length, 2);
  texts.length = 0;
  drawLegend(context as unknown as CanvasRenderingContext2D,
    { ...config, showLegendLabels: false }, options, ['B', 'A']);
  assert.equal(texts.length, 0, 'hidden labels never glow');
  texts.length = 0; backgrounds.length = 0;
  drawLegend(context as unknown as CanvasRenderingContext2D,
    { ...config, hiddenMidi: new Set([65]) }, options, ['B', 'A']);
  assert.deepEqual(texts, [{ label: 'F5', blur: 0, alpha: 1 }], 'an animated replacement owns the entire F4 cell');
  assert.equal(backgrounds.length, 1, 'the hidden canvas cell paints neither its colour nor text');
  texts.length = 0; backgrounds.length = 0;
  drawLegend(context as unknown as CanvasRenderingContext2D,
    { ...config, hiddenMidi: new Set() }, options, ['B', 'A']);
  assert.equal(backgrounds.length, 2, 'clearing replacements restores both canvas cells');
});
