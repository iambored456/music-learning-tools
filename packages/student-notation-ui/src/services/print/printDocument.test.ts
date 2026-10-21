import { afterEach, describe, expect, it, vi } from 'vitest';
import { getInitialState } from '@mlt/student-notation-engine';
import type { AppState, CanvasSpaceColumn, PrintOptions } from '@mlt/types';
import { preparePrintDocument, rasterizePrintPage } from './printDocument.ts';
import { snapshotPrintScore, buildScoreScene } from './scoreScene.ts';
import { layoutPrintPages, PRINT_MARGIN } from './pageLayout.ts';
import { BASE_ABSTRACT_UNIT, GRID_WIDTH_RATIO } from '../../core/constants.ts';
import { svgLine, svgRect } from './svg.ts';

function score(bars = 8): AppState {
  const state = getInitialState();
  state.macrobeatGroupings = Array(bars * 4).fill(2);
  state.macrobeatBoundaryStyles = state.macrobeatGroupings.map((_, index) => index % 4 === 3 ? 'solid' : 'dashed');
  const row = state.fullRowData.findIndex(row => row.toneNote === 'C4');
  state.placedNotes = [{ uuid: 'note', row, globalRow: row, startColumnIndex: 0 as CanvasSpaceColumn,
    endColumnIndex: 1 as CanvasSpaceColumn, shape: 'circle', color: '#4a90e2' }];
  return state;
}
const settings = (state: AppState): PrintOptions => ({ ...state.printOptions, barsPerLine: 4 });

describe('prepared score pages', () => {
  it('prints each tonic-relative pattern from its mapped column through the next tonic', () => {
    const state = score(4);
    const sign = (uuid: string, pitch: string, preMacrobeatIndex: number, tonicNumber: number) => {
      const row = state.fullRowData.findIndex(row => row.toneNote === pitch);
      return { uuid, row, globalRow: row, columnIndex: 999 as CanvasSpaceColumn, preMacrobeatIndex, tonicNumber };
    };
    state.tonicSignGroups = { d: [sign('d', 'D4', 3, 6)], bb: [sign('bb', 'Bb4', 7, 4)] };
    state.pitchRange = {
      topIndex: state.fullRowData.findIndex(row => row.toneNote === 'C5'),
      bottomIndex: state.fullRowData.findIndex(row => row.toneNote === 'C4')
    };
    const scene = buildScoreScene(snapshotPrintScore(state), {
      ...settings(state), pitchRangeMode: 'viewport', includeButtonGrid: false, includeDrums: false
    });
    const cell = BASE_ABSTRACT_UNIT;
    const x = (column: number) => column * cell * GRID_WIDTH_RATIO;
    const y = (pitch: string) => (state.fullRowData.findIndex(row => row.toneNote === pitch) - scene.topRow + 1) * cell / 2;
    expect(scene.music).toContain(svgLine(0, y('C5'), x(8), y('C5'), '#e04747', 2.4));
    expect(scene.music).toContain(svgLine(x(8), y('D4'), x(18), y('D4'), '#e04747', 2.4));
    expect(scene.music).toContain(svgLine(x(18), y('Bb4'), scene.width, y('Bb4'), '#e04747', 2.4));
    expect(scene.music).not.toContain(svgLine(x(8), y('C5'), x(18), y('C5'), '#e04747', 2.4));
    expect(scene.music).toContain(svgLine(x(8), y('Gb4'), x(18), y('Gb4'), '#adb5bd', 0.7, '4 4'));
    expect(scene.music).toContain(svgRect(x(8), y('A4') - cell / 2, x(18) - x(8), cell, '#dee2e6'));
  });

  it('arranges eight bars as two lines of four on one physical page', () => {
    const state = score();
    const document = preparePrintDocument(state, settings(state));
    expect([document.barCount, document.lineCount, document.pages.length]).toEqual([8, 2, 1]);
    expect([document.pages[0]!.width, document.pages[0]!.height]).toEqual([792, 612]);
    expect(document.pages[0]!.svg).toContain('<ellipse');
    expect(document.pages[0]!.svg).not.toContain('<image');
  });

  it('is independent of screen zoom, scrolling, playback and pitch viewport by default', () => {
    const state = score();
    const before = preparePrintDocument(state, settings(state));
    state.cellWidth = 240;
    state.cellHeight = 480;
    state.baseMicrobeatPx = 999;
    state.pitchRange = { topIndex: 0, bottomIndex: 12 };
    state.gridPosition = 999;
    state.isPlaying = true;
    state.playbackStartMacrobeatIndex = 3;
    expect(preparePrintDocument(state, settings(state))).toEqual(before);
  });

  it('keeps prepared pages immutable when the score is later edited', () => {
    const state = score();
    const prepared = preparePrintDocument(state, settings(state));
    const original = prepared.pages[0]!.svg;
    state.placedNotes[0]!.color = '#ff0000';
    expect(prepared.pages[0]!.svg).toBe(original);
    expect(preparePrintDocument(state, settings(state)).pages[0]!.svg).not.toBe(original);
    expect(Object.isFrozen(prepared.pages)).toBe(true);
  });

  it('can explicitly print the selected pitch range without slicing the gamut', () => {
    const state = score();
    const originalRows = state.fullRowData;
    state.pitchRange = { topIndex: 10, bottomIndex: 20 };
    const prepared = preparePrintDocument(state, { ...settings(state), pitchRangeMode: 'viewport' });
    expect([prepared.topRow, prepared.bottomRow]).toEqual([10, 20]);
    expect(state.fullRowData).toBe(originalRows);
  });

  it('groups a pickup with the first regular bar', () => {
    const state = score();
    state.hasAnacrusis = true;
    state.macrobeatGroupings.unshift(2);
    state.macrobeatBoundaryStyles.unshift('solid');
    const prepared = preparePrintDocument(state, settings(state));
    expect([prepared.barCount, prepared.lineCount, prepared.hasPickup]).toEqual([8, 2, true]);
  });

  it('keeps tonic columns with the following bar and applies modulation to mapped widths', () => {
    const state = score();
    const row = state.placedNotes[0]!.row;
    state.tonicSignGroups = { tonic: [{ uuid: 'tonic', row, globalRow: row, columnIndex: 32 as CanvasSpaceColumn, preMacrobeatIndex: 15, tonicNumber: 1 }] };
    state.tempoModulationMarkers = [{ id: 'mod', measureIndex: 16, ratio: 1.5, active: true, columnIndex: null, macrobeatIndex: null, xPosition: null }];
    const scene = buildScoreScene(snapshotPrintScore(state), settings(state));
    expect(scene.measureEnds[3]).toBe(480);
    expect(scene.width).toBe(480 + 34 * 15 * 1.5);
    expect(scene.music).toContain('<circle');
  });

  it('prints stamps, drum subdivisions, notes and all persisted annotation categories', () => {
    const state = score();
    const row = state.placedNotes[0]!.row;
    state.sixteenthStampPlacements = [{ id: 'six', sixteenthStampId: 15, startTimeIndex: 2, row, globalRow: row, color: '#112233', timestamp: 0, shapeOffsets: { diamond_0: -3 } }];
    state.sixteenthThreeStampPlacements = [{ id: 'three', sixteenthThreeStampId: 7, startTimeIndex: 4, row, color: '#223344', timestamp: 0 }];
    state.tripletStampPlacements = [{ id: 'triplet', tripletStampId: 7, startTimeIndex: 6, span: 1, row, color: '#334455', timestamp: 0 }];
    state.placedNotes.push({ ...state.placedNotes[0]!, uuid: 'drum', isDrum: true, drumTrack: 'M', drumSubdivision: 'double', color: '#445566' });
    state.annotations = [
      { type: 'arrow', startCol: 0, startRow: row - 1, endCol: 4, endRow: row - 1, settings: { lineStyle: 'dashed-big', strokeWeight: 2, startArrowhead: 'open-circle', endArrowhead: 'filled-arrow', arrowheadSize: 8 } },
      { type: 'text', col: 2, row: row + 1, widthCols: 5, heightRows: 2, text: 'Hello', settings: { color: '#123456', size: 12, bold: true, italic: true, underline: true, background: true, superscript: false, subscript: false } },
      { type: 'marker', path: [{ col: 1, row }, { col: 2, row: row + 1 }], settings: { color: '#234567', size: 3 } },
      { type: 'highlighter', path: [{ col: 3, row }, { col: 4, row }], settings: { color: '#345678', size: 5, transparency: 70 } }
    ];
    const prepared = preparePrintDocument(state, settings(state));
    const svg = prepared.pages[0]!.svg;
    for (const color of ['#112233', '#223344', '#334455', '#445566', '#123456', '#234567', '#345678']) expect(svg).toContain(color);
    expect(svg.match(/<polygon/g)).toHaveLength(2);
    expect(prepared.topRow).toBe(row - 3);
    expect(svg).toContain('font-style="italic"');
  });

  it('marks sustained notes crossing line breaks without creating a second attack', () => {
    const state = score();
    state.placedNotes[0]!.endColumnIndex = 40 as CanvasSpaceColumn;
    const prepared = preparePrintDocument(state, settings(state));
    expect(prepared.pages[0]!.svg).toContain('l 3 3 l -3 3');
  });

  it('does not expand pitch range to include octave-replicated tonic signs', () => {
    const state = score();
    const before = preparePrintDocument(state, settings(state));
    state.tonicSignGroups = { tonic: [0, 12, 24, 36, 48, 60, 72, 84].map(row => ({ uuid: 't', row, globalRow: row, columnIndex: 0 as CanvasSpaceColumn, preMacrobeatIndex: -1, tonicNumber: 1 })) };
    const after = preparePrintDocument(state, settings(state));
    expect([after.topRow, after.bottomRow]).toEqual([before.topRow, before.bottomRow]);
  });

  it('fits only pitched notes even with annotations and drum rows far outside them', () => {
    const state = score();
    const row = state.placedNotes[0]!.row;
    const before = buildScoreScene(snapshotPrintScore(state), settings(state));
    state.placedNotes.push({ ...state.placedNotes[0]!, uuid: 'drum', row: 0, globalRow: 0, isDrum: true, drumTrack: 'H' });
    state.annotations = [
      { type: 'arrow', startCol: 0, startRow: 0, endCol: 2, endRow: 80, settings: { lineStyle: 'solid', strokeWeight: 2, startArrowhead: 'none', endArrowhead: 'filled-arrow', arrowheadSize: 8 } },
      { type: 'text', col: 0, row: 0, widthCols: 5, heightRows: 80, text: 'Outside notes', settings: { color: '#123456', size: 12, bold: false, italic: false, underline: false, background: false, superscript: false, subscript: false } },
      { type: 'marker', path: [{ col: 1, row: 0 }, { col: 2, row: 80 }], settings: { color: '#234567', size: 3 } },
      { type: 'highlighter', path: [{ col: 3, row: 0 }, { col: 4, row: 80 }], settings: { color: '#345678', size: 5, transparency: 70 } }
    ];
    const after = buildScoreScene(snapshotPrintScore(state), settings(state));
    expect([after.topRow, after.bottomRow]).toEqual([row, row]);
    expect(after.height).toBe(before.height);
  });

  it.each(['sixteenth', 'sixteenthThree', 'triplet'] as const)('fits the actual %s stamp notes, excluding anchors and unused offsets', kind => {
    const state = score();
    state.placedNotes = [];
    const stamp = { id: 'stamp', row: 0, globalRow: 20, startTimeIndex: 0, color: '#123456', timestamp: 0,
      shapeOffsets: { diamond_0: 20, diamond_3: -20, triplet_0: 20, triplet_2: -20 } };
    if (kind === 'sixteenth') state.sixteenthStampPlacements = [{ ...stamp, sixteenthStampId: 1 }];
    else if (kind === 'sixteenthThree') state.sixteenthThreeStampPlacements = [{ ...stamp, sixteenthThreeStampId: 1 }];
    else state.tripletStampPlacements = [{ ...stamp, tripletStampId: 1, span: 1 }];
    const prepared = preparePrintDocument(state, settings(state));
    expect([prepared.topRow, prepared.bottomRow]).toEqual([40, 40]);
  });

  it('retains the empty-score fallback when only non-note content is present', () => {
    const state = score();
    state.placedNotes = [];
    const before = preparePrintDocument(state, settings(state));
    state.tonicSignGroups = { tonic: [{ uuid: 't', row: 0, globalRow: 0, columnIndex: 0 as CanvasSpaceColumn, preMacrobeatIndex: -1, tonicNumber: 1 }] };
    state.annotations = [{ type: 'marker', path: [{ col: 0, row: 0 }, { col: 1, row: 80 }], settings: { color: '#123456', size: 3 } }];
    const after = preparePrintDocument(state, settings(state));
    expect([after.topRow, after.bottomRow]).toEqual([before.topRow, before.bottomRow]);
  });

  it('mirrors legend columns while preserving readable pitch and frequency labels', () => {
    const state = score();
    const row = state.placedNotes[0]!.row;
    const options = { ...settings(state), topRow: row, bottomRow: row, includeDrums: false };
    const scene = buildScoreScene(snapshotPrintScore(state), options);
    const leftTextX = Number(scene.leftLegend.match(/<text x="([^"]+)"/)![1]);
    const rightTextX = Number(scene.rightLegend.match(/<text x="([^"]+)"/)![1]);
    expect(Math.abs(leftTextX - rightTextX)).toBeCloseTo(scene.legendWidth / 2);
    expect(scene.leftLegend).toContain('>C4</text>');
    expect(scene.rightLegend).toContain('>C4</text>');
    state.showFrequencyLabels = true;
    const frequencies = buildScoreScene(snapshotPrintScore(state), options);
    expect(frequencies.leftLegend).toContain(`>${state.fullRowData[row]!.frequency}</text>`);
    expect(frequencies.leftLegend).not.toContain('>C4</text>');
  });

  it('respects hidden accidentals and focus colours without removing grid lines', () => {
    const state = score();
    const row = state.fullRowData.findIndex(row => row.toneNote === 'Db4');
    expect(row).toBeGreaterThanOrEqual(0);
    const options = { ...settings(state), topRow: row, bottomRow: row, includeDrums: false };
    state.accidentalMode = { sharp: true, flat: false };
    expect(buildScoreScene(snapshotPrintScore(state), options).leftLegend).toContain('<text');
    state.accidentalMode = { sharp: false, flat: false };
    expect(buildScoreScene(snapshotPrintScore(state), options).leftLegend).not.toContain('<text');
    state.showFrequencyLabels = true;
    expect(buildScoreScene(snapshotPrintScore(state), options).leftLegend).toContain('<text');
    state.focusColours = true;
    const tonicRow = state.placedNotes[0]!.row;
    state.tonicSignGroups = { tonic: [{ uuid: 't', row: tonicRow, globalRow: tonicRow, columnIndex: 0 as CanvasSpaceColumn, preMacrobeatIndex: -1, tonicNumber: 1 }] };
    const focused = buildScoreScene(snapshotPrintScore(state), options);
    expect(focused.leftLegend).not.toContain('<text');
    expect(focused.music).toContain('<line');
  });

  it('escapes annotation text without allowing embedded SVG markup', () => {
    const state = score();
    state.annotations = [{ type: 'text', col: 0, row: state.placedNotes[0]!.row, widthCols: 8, heightRows: 2,
      text: '<script>&', settings: { color: '#123456', size: 12, bold: false, italic: false, underline: false, background: false, superscript: false, subscript: false } }];
    const svg = preparePrintDocument(state, settings(state)).pages[0]!.svg;
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;');
    expect(svg).toContain('&gt;');
    expect(svg).toContain('&amp;');
  });
});

describe('physical raster output', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('draws Letter landscape vectors directly into a 300 DPI image', async () => {
    const drawImage = vi.fn();
    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage }) };
    vi.stubGlobal('document', { createElement: () => canvas });
    vi.stubGlobal('Image', class { src = ''; decode = () => Promise.resolve(); });
    const result = await rasterizePrintPage({ width: 792, height: 612, svg: '<svg />' });
    expect([result.width, result.height]).toEqual([3300, 2550]);
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 3300, 2550);
    await expect(rasterizePrintPage({ width: 792, height: 612, svg: '' }, 0)).rejects.toThrow('DPI');
  });
});

describe('physical pagination', () => {
  const geometry = { width: 1600, height: 250, legendWidth: 40, measureEnds: Array.from({ length: 16 }, (_, i) => (i + 1) * 100), gap: 30 };
  it('keeps every line inside the margins and preserves order across pages', () => {
    const state = score(16);
    const layout = layoutPrintPages(geometry, { ...settings(state), barsPerLine: 2, pagination: 'paginate' });
    expect(layout.pages.length).toBeGreaterThan(1);
    expect(layout.pages.flatMap(page => page.lines).map(line => line.startX)).toEqual([0, 200, 400, 600, 800, 1000, 1200, 1400]);
    for (const page of layout.pages) for (const line of page.lines) {
      expect(line.x).toBeGreaterThanOrEqual(PRINT_MARGIN - 0.001);
      expect(line.y).toBeGreaterThanOrEqual(PRINT_MARGIN - 0.001);
      expect(line.x + line.cropWidth * line.scale).toBeLessThanOrEqual(page.width - PRINT_MARGIN + 0.001);
      expect(line.y + line.cropHeight * line.scale).toBeLessThanOrEqual(page.height - PRINT_MARGIN + 0.001);
    }
  });
  it('fits one page with an explicit reduction notice and applies crop before layout', () => {
    const state = score(16);
    const layout = layoutPrintPages(geometry, { ...settings(state), cropTop: 0.1, cropBottom: 0.9, cropLeft: 0.1, cropRight: 0.9 });
    expect(layout.pages).toHaveLength(1);
    expect(layout.warnings).toHaveLength(1);
    expect(layout.pages[0]!.lines[0]!.cropHeight).toBe(200);
    expect(layout.pages[0]!.lines[0]!.cropWidth).toBe(384);
  });
});
