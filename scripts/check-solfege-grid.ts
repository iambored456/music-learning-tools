import assert from 'node:assert/strict';
import { createColumnCoordinates } from '../packages/ui-components/src/canvas/PitchGrid/renderers/coordinateUtils.js';
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
console.log('Solfege grid origins, column mapping, legend geometry, and pitch sizing passed.');
