import test from 'node:test';
import assert from 'node:assert/strict';
import type { PlacedNote } from '@mlt/types';
import {
  createNotationNoteGeometry, createTargetNoteGeometry, getNoteBounds,
  getNoteSegmentEntry, drawNoteGlyph, getNoteTailYOffset, getNoteLabelCategory,
  getNoteLabelFontSize, resolveNoteLabelLayout, createNotationTargetGeometry,
} from '../src/canvas/notePrimitives';
import { drawSingleColumnOvalNote, drawTwoColumnOvalNote, type NoteRenderContext } from '../src/canvas/PitchGrid/renderers/notes';

const note = (overrides: Partial<PlacedNote> = {}): PlacedNote => ({
  uuid: 'note-100-a', shape: 'circle', row: 4, globalRow: 4,
  startColumnIndex: 0, endColumnIndex: 1, color: '#123456', ...overrides,
} as PlacedNote);
const options = { x: 100, y: 40, columnWidth: 20, cellHeight: 40, endCapX: 180, longNoteStyle: 'style2' as const };

test('notation targets keep quarter notes circular at 1:1 and share notation glyph proportions and hit bounds', () => {
  const quarter = createNotationTargetGeometry(100, 140, 40, 40)!;
  assert.deepEqual(quarter, createNotationNoteGeometry(note(), { ...options, endCapX: 120 }));
  assert.equal(quarter.radiusX, quarter.radiusY);
  const eighth = createNotationTargetGeometry(100, 120, 40, 40)!;
  assert.deepEqual(eighth, createNotationNoteGeometry(note({ shape: 'oval', endColumnIndex: 0 }), options));
  const half = createNotationTargetGeometry(100, 180, 40, 40)!;
  assert.deepEqual(half, createNotationNoteGeometry(note({ endColumnIndex: 3 }), { ...options, endCapX: 160 }));
  assert.equal(half.kind, 'stadium');
  assert.equal(getNoteSegmentEntry(quarter, { x: 100, y: 20 }), null);
  assert.equal(getNoteSegmentEntry(quarter, { x: 120, y: 40 }), 0);
});

function recordingContext() {
  const shapes: unknown[][] = [], stops: unknown[][] = [], strokes: unknown[][] = [];
  let clips = 0;
  const ctx = {
    strokeStyle: '', lineWidth: 0, shadowBlur: 0, shadowOffsetX: 0,
    save() {}, restore() {}, beginPath() {}, closePath() {},
    ellipse(...args: unknown[]) { shapes.push(['ellipse', ...args]); },
    arc(...args: unknown[]) { shapes.push(['arc', ...args]); },
    lineTo(...args: unknown[]) { shapes.push(['lineTo', ...args]); },
    moveTo(...args: unknown[]) { shapes.push(['moveTo', ...args]); },
    clip() { clips++; }, fillRect() {},
    createRadialGradient() { return { addColorStop(...args: unknown[]) { stops.push(args); } }; },
    stroke(path?: Path2D) { strokes.push([ctx.strokeStyle, ctx.lineWidth, ctx.shadowBlur, path]); },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, shapes, stops, strokes, clips: () => clips };
}

test('overlapping voices retain the same head position, regardless of UUID/voice order', () => {
  const first = createNotationNoteGeometry(note(), options)!;
  const second = createNotationNoteGeometry(note({ uuid: 'note-200-b', color: '#abcdef' }), options)!;
  assert.deepEqual(first, second);
  assert.deepEqual(getNoteBounds(first), { left: 101.5, right: 138.5, top: 21.5, bottom: 58.5 });
  const long = createNotationNoteGeometry(note({ endColumnIndex: 4 }), options)!;
  assert.equal(long.kind, 'stadium');
  assert.equal(long.centerX - long.radiusX + long.radiusY, first.centerX, 'starting cap remains aligned');
});

test('both shared note adapters draw the geometry used for hit detection', () => {
  const context = {
    config: { cellWidth: 20, cellHeight: 40, columnWidths: [1, 1, 1, 1, 1], degreeDisplayMode: 'off', longNoteStyle: 'style2' },
    coords: { getColumnX: (column: number) => 100 + column * 20, getRowY: () => 40 },
    allNotes: [],
  } as unknown as NoteRenderContext;
  const oval = recordingContext();
  drawSingleColumnOvalNote(oval.ctx, context, note({ shape: 'oval', endColumnIndex: 0 }), 4);
  assert.deepEqual(oval.shapes[0]?.slice(0, 5), ['ellipse', 110, 40, 8.5, 18.5]);
  const circle = recordingContext();
  drawTwoColumnOvalNote(circle.ctx, context, note(), 4);
  assert.deepEqual(circle.shapes[0]?.slice(0, 5), ['ellipse', 120, 40, 18.5, 18.5]);
  const long = recordingContext();
  drawTwoColumnOvalNote(long.ctx, context, note({ endColumnIndex: 4 }), 4);
  assert.deepEqual(long.shapes[0]?.slice(0, 4), ['arc', 120, 40, 18.5]);
  assert.deepEqual(long.shapes[2]?.slice(0, 4), ['arc', 180, 40, 18.5]);
});

test('rounded hit areas reject empty corners and catch fast drags in either direction', () => {
  for (const width of [12, 80]) {
    const shape = createTargetNoteGeometry(10, 10 + width, 30, 10)!;
    assert.equal(getNoteSegmentEntry(shape, { x: 10.1, y: 20.1 }), null);
    assert.equal(getNoteSegmentEntry(shape, { x: 10 + width / 2, y: 30 }), 0);
    assert.ok(Math.abs(getNoteSegmentEntry(shape, { x: 0, y: 30 }, { x: 100, y: 30 })! - 0.1) < 1e-10);
    assert.ok(Math.abs(getNoteSegmentEntry(shape, { x: 100, y: 30 }, { x: 0, y: 30 })! - (90 - width) / 100) < 1e-10);
    assert.equal(getNoteSegmentEntry(shape, { x: 0, y: 50 }, { x: 100, y: 50 }), null);
  }
});

test('invalid or collapsed dimensions cannot reach canvas drawing', () => {
  for (const columnWidth of [0, -5, NaN, Infinity]) {
    assert.equal(createNotationNoteGeometry(note(), { ...options, columnWidth }), null);
  }
  assert.equal(createNotationNoteGeometry(note(), { ...options, cellHeight: 1 }), null);
  assert.equal(createTargetNoteGeometry(20, 10, 30, 10), null);
});

test('radial fill clips to the glyph and preserves Student Notation envelope colors', () => {
  const { ctx, stops, strokes, clips } = recordingContext();
  const geometry = createNotationNoteGeometry(note(), options)!;
  drawNoteGlyph(ctx, geometry, { color: '#123456', fillLevel: 0.5, shadowBlur: 8 });
  assert.equal(clips(), 1);
  assert.deepEqual(stops, [[0, 'transparent'], [0.45, 'transparent'], [0.5, `rgba(18, 52, 86, ${31 / 255})`], [1, `rgba(18, 52, 86, ${191 / 255})`]]);
  assert.deepEqual(strokes[0]?.slice(0, 3), ['#123456', 3, 8]);
  for (const fillLevel of [0, -1, NaN]) drawNoteGlyph(ctx, geometry, { color: '#123456', fillLevel });
  assert.equal(clips(), 1, 'silent notes draw only outlines');
});

test('specialized glyph paths share fill and outline without changing their shape', () => {
  const { ctx, strokes, clips } = recordingContext();
  const path = {} as Path2D;
  drawNoteGlyph(ctx, createNotationNoteGeometry(note(), options)!, { color: '#123456', fillLevel: 1, path });
  assert.equal(clips(), 1);
  assert.equal(strokes[0]?.[3], path);
});

test('only long tails stack, using canonical pitch row and placement order', () => {
  const a = note({ uuid: 'note-100-a', endColumnIndex: 4 });
  const b = note({ uuid: 'note-200-b', row: 9, endColumnIndex: 4 });
  const short = note({ uuid: 'note-50-c' });
  assert.equal(getNoteTailYOffset(a, [b, short, a], 40), 0);
  assert.equal(getNoteTailYOffset(b, [b, short, a], 40), 2.4);
  assert.equal(getNoteTailYOffset(short, [b, short, a], 40), 0);
});

test('degree/pitch sizing and text fitting share rules while accepting caller fonts', () => {
  assert.equal(getNoteLabelCategory('♯1/♭2'), 'both-accidentals');
  assert.equal(getNoteLabelCategory('C#4/Db4', 'pitch'), 'both-accidentals');
  assert.ok(getNoteLabelFontSize('oval', 10, 'both-accidentals') < getNoteLabelFontSize('oval', 10, 'natural'));
  const ctx = { font: 'original', measureText: (text: string) => ({ width: text.length * 12 }) as TextMetrics };
  const fitted = resolveNoteLabelLayout(ctx, ['C#4', 'Db4'], {
    preferredFontSize: 20, maxWidth: 18, maxHeight: 20, lineHeightRatio: 1, font: size => `${size}px test`,
  });
  assert.equal(fitted.fontSize, 10);
  assert.equal(ctx.font, 'original');
});
