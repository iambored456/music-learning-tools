import assert from 'node:assert/strict';
import { createColumnCoordinates, createTimeCoordinates } from '../packages/ui-components/src/canvas/PitchGrid/renderers/coordinateUtils.js';
import { drawLegend } from '../packages/ui-components/src/canvas/PitchGrid/renderers/legend.js';
import { drawHorizontalLines } from '../packages/ui-components/src/canvas/PitchGrid/renderers/gridLines.js';
import { generateRowDataForMidiRange } from '../packages/pitch-data/src/index.js';
import { solfegeJustMidi } from '../packages/singing-trainer-core/src/lib/services/solfegeNotation.js';
import { SINGING_GRID, singingLegendWidth, singingPitchSizes } from '../packages/singing-trainer-ui/src/lib/components/pitchGridAppearance.js';

const viewport = { startRow: 0, endRow: 12, zoomLevel: 1, containerWidth: 800, containerHeight: 280 };
// The inset must move the score origin without changing durations or inverse mapping.
for (const inset of [0, 24]) {
  const coords = createColumnCoordinates({ cellWidth: 20, cellHeight: 40, columnWidths: [1, 1, 2, 1], viewport, contentInsetX: inset });
  assert.equal(coords.getColumnX(0), inset);
  assert.equal(coords.getColumnX(4), inset + 100);
  for (let column = 0; column < 4; column++) {
    assert.equal(coords.getColumnFromX(coords.getColumnX(column) + 0.5), column);
  }
  assert.equal(coords.getColumnFromX(inset - 1), 0);
  // Changing the outer frame (for example adding a right legend) cannot move beat zero.
  const wider = createColumnCoordinates({ cellWidth: 20, cellHeight: 40, columnWidths: [1, 1, 2, 1], viewport: { ...viewport, containerWidth: 1200 }, contentInsetX: inset });
  assert.equal(wider.getColumnX(0), coords.getColumnX(0));
}
assert.equal(singingLegendWidth(), SINGING_GRID.cellWidth * SINGING_GRID.legendColumnWidthUnits * 2);
assert.equal(singingPitchSizes(40, 1).indicatorRadius, 20);
assert.equal(singingPitchSizes(20, 2).circleRadius, singingPitchSizes(40, 1).circleRadius);
// Exercise the actual legend renderer without a browser. Each cell edge must
// coincide with the adjacent pitch centre, including when accidentals are hidden.
const rows = generateRowDataForMidiRange(45, 69);
for (const just of [false, true]) {
  for (const dpr of [1, 2]) {
    for (const columns of [['B', 'A'], ['A', 'B']] as const) {
      const coords = createTimeCoordinates({
        cellWidth: 20, cellHeight: 40, viewport, pixelsPerSecond: 40,
        rowPositionOffsets: just ? rows.map(row => row.midi! - solfegeJustMidi(row.midi!, 60)) : undefined,
      });
      const rectangles: { color: string; top: number; bottom: number }[] = [];
      const context = {
        fillStyle: '',
        canvas: { getContext: () => context },
        getTransform: () => ({ a: dpr }),
        fillRect(_x: number, top: number, _width: number, height: number) {
          rectangles.push({ color: this.fillStyle, top, bottom: top + height });
        },
        strokeText() {}, fillText() {},
      };
      drawLegend(context as unknown as CanvasRenderingContext2D, {
        fullRowData: rows, cellWidth: 20, cellHeight: 40, legendColumnWidth: 64.72,
        colorMode: 'color', showFrequencyLabels: false, showOctaveLabels: true,
        showLegendLabels: true, showAccidentalLabels: true,
        accidentalMode: { sharp: false, flat: false },
        focusedPitchClasses: null, focusColorsEnabled: false,
      }, { startRow: 0, endRow: rows.length - 1, coords }, columns);
      const snap = (y: number) => Math.round(y * dpr) / dpr;
      for (const midi of [48, 52, 53, 55, 57, 59, 60, 64, 65]) {
        const index = rows.findIndex(row => row.midi === midi);
        const cell = rectangles.find(rect => rect.color === rows[index]!.hex)!;
        assert.ok(cell, `Missing legend cell for MIDI ${midi}`);
        assert.equal(cell.top, snap(coords.getRowY(index - 1)));
        // Renderer intentionally overlaps one device pixel to avoid hairline gaps.
        assert.ok(Math.abs(cell.bottom - (snap(coords.getRowY(index + 1)) + 1 / dpr)) < 1e-9);
      }
    }
  }
}
for (const tonic of [48, 50]) {
  for (const just of [false, true]) {
    const rowIndex = rows.findIndex(row => row.midi === tonic + 7);
    const coords = createTimeCoordinates({
      cellWidth: 20, cellHeight: 40, viewport, pixelsPerSecond: 40,
      rowPositionOffsets: just ? rows.map(row => row.midi! - solfegeJustMidi(row.midi! - tonic + 60, tonic)) : undefined,
    });
    const fills: number[][] = [];
    const ctx = {
      save() {}, restore() {},
      fillRect(...args: number[]) { fills.push(args); },
    } as unknown as CanvasRenderingContext2D;
    drawHorizontalLines(ctx, {
      fullRowData: rows, cellHeight: 40, viewportHeight: 1000, viewportWidth: 800,
      colorMode: 'color', horizontalGridReferencePitchClass: tonic % 12,
    }, coords, rowIndex, rowIndex);
    assert.equal(fills.length, 1);
    assert.equal(fills[0]![1], coords.getRowY(rowIndex - 1));
    assert.equal(fills[0]![3], coords.getRowY(rowIndex + 1) - coords.getRowY(rowIndex - 1));
  }
}
console.log('Grid origins, pitch sizing, equal/just legend edges, and transposed G-band edges passed.');
