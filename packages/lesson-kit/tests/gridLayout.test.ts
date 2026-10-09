import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateLessonGridLayout } from '../src/index';

test('revealing more pitches changes row spacing without resizing the outer grid', () => {
  const options = { width: 800, height: 600, columns: 28, legendColumns: 6, layoutRows: 16, sizing: 'stretch' as const };
  const initial = calculateLessonGridLayout({ ...options, rows: 11 });
  const expanded = calculateLessonGridLayout({ ...options, rows: 13 });
  assert.equal(initial.width, expanded.width);
  assert.equal(initial.height, expanded.height);
  assert.equal(initial.cellWidth, expanded.cellWidth);
  assert.equal(initial.cellHeight * 12 / 2, initial.height);
  assert.equal(expanded.cellHeight * 14 / 2, expanded.height);
});

test('unmeasured grids provide finite sizes, then fill narrow and wide frames', () => {
  const initial = calculateLessonGridLayout({ width: 0, height: 0, columns: 20, rows: 11, sizing: 'stretch' });
  assert.ok(initial.width > 0 && initial.height > 0);
  for (const width of [320, 1200]) {
    const layout = calculateLessonGridLayout({ width, height: 500, columns: 20, rows: 11, sizing: 'stretch' });
    assert.equal(layout.width, width);
    assert.equal(layout.height, 500);
    assert.ok(Number.isFinite(layout.cellHeight) && layout.cellWidth > 0);
  }
});

test('default fitting preserves square row spacing and stays inside either limiting dimension', () => {
  for (const [width, height] of [[320, 600], [1200, 250], [800, 600]]) {
    // Short letter exercises, octave comparisons, and full-gamut lessons must
    // preserve the same geometry even when opposite axes limit the available space.
    for (const [columns, rows, legendColumns] of [[28, 11, 6], [16, 25, 0], [32, 25, 0], [22, 37, 0], [22, 88, 0]]) {
      const layout = calculateLessonGridLayout({ width, height, columns, legendColumns, rows });
      assert.equal(layout.cellHeight / 2, layout.cellWidth);
      assert.equal(layout.noteDiameter, layout.cellHeight, 'round notes keep the grid scale across pitch ranges');
      assert.equal(layout.noteDiameter / layout.cellWidth, 2, 'round notes span two time columns');
      assert.ok(Math.abs(layout.width / (columns + legendColumns) - layout.height / (rows + 1)) < 0.000001);
      assert.ok(layout.width <= width + 0.000001 && layout.height <= height + 0.000001);
    }
  }
});

test('reserving an expanding pitch range keeps one scale as rows are revealed', () => {
  const options = { width: 800, height: 250, columns: 28, legendColumns: 6, layoutRows: 16 };
  const initial = calculateLessonGridLayout({ ...options, rows: 11 });
  const expanded = calculateLessonGridLayout({ ...options, rows: 16 });
  assert.equal(initial.width, expanded.width);
  assert.equal(initial.cellWidth, expanded.cellWidth);
  assert.equal(initial.cellHeight, expanded.cellHeight);
  assert.ok(initial.height < expanded.height && expanded.height <= options.height);
});
