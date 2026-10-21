import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlacedNote } from '@mlt/types';
import { drawSingleColumnOvalNote, drawTwoColumnOvalNote, drawIndividualSixteenthNote, type PitchRendererOptions } from './notes.ts';

const runtime = vi.hoisted(() => ({
  state: { longNoteStyle: 'style2', placedNotes: [] as PlacedNote[] },
  effects: {
    shouldAnimateNote: () => true, getVibratoYOffset: () => 0.1,
    shouldFillNote: () => true, getFillLevel: () => 0.5,
    hasReverbEffect: () => true, getReverbEffect: () => ({ opacity: 1, blur: 0.2, spread: 0.3 }),
    hasDelayEffect: () => false,
  },
}));
vi.mock('./rendererUtils.ts', () => ({
  getColumnX: (column: number, options: PitchRendererOptions) => column * (options.tempoModulationMarkers?.length ? 30 : 20),
  getRowY: () => 40, getCurrentCoordinateMapping: () => null,
}));
vi.mock('@state/initStore.ts', () => ({ default: { state: runtime.state } }));
vi.mock('@services/tonalService.ts', () => ({ default: { getDegreeLabelForNote: () => ({ label: null }) } }));
vi.mock('@services/columnMapService.ts', () => ({ default: {} }));
vi.mock('@services/runtimeGlobals.ts', () => ({ getAnimationEffectsManager: () => runtime.effects }));

const options: PitchRendererOptions = { columnWidths: [1, 1, 1, 1, 1], cellWidth: 20, cellHeight: 40, degreeDisplayMode: 'off' };
const note = { uuid: 'note-100-a', row: 4, globalRow: 4, startColumnIndex: 0, endColumnIndex: 1, shape: 'circle', color: '#123456' } as PlacedNote;

function canvas() {
  return {
    save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), closePath: vi.fn(),
    ellipse: vi.fn(), arc: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
    clip: vi.fn(), fillRect: vi.fn(), stroke: vi.fn(),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    shadowBlur: 0, shadowOffsetX: 0,
  };
}

describe('Student Notation drawing adapter', () => {
  beforeEach(() => { runtime.state.longNoteStyle = 'style2'; runtime.state.placedNotes = []; });

  it('keeps aligned heads and vibrato/reverb/fill while sharing the glyph renderer', () => {
    const first = canvas(), second = canvas();
    drawTwoColumnOvalNote(first as unknown as CanvasRenderingContext2D, options, note, 4);
    drawTwoColumnOvalNote(second as unknown as CanvasRenderingContext2D, options, { ...note, uuid: 'note-200-b' }, 4);
    expect(first.ellipse.mock.calls).toEqual(second.ellipse.mock.calls);
    expect(first.ellipse).toHaveBeenCalledWith(20, 44, 18.5, 18.5, 0, 0, 2 * Math.PI);
    expect(first.createRadialGradient).toHaveBeenCalledWith(20, 44, 0, 20, 44, 18.5);
    expect(first.shadowBlur).toBe(3.5);
    expect(first.shadowOffsetX).toBe(2);
  });

  it('preserves fallback from empty musical widths and modulation-aware column widths', () => {
    const normal = canvas(), modulated = canvas();
    const oval = { ...note, shape: 'oval', endColumnIndex: 0 } as PlacedNote;
    drawSingleColumnOvalNote(normal as unknown as CanvasRenderingContext2D, { ...options, musicalColumnWidths: [] }, oval, 4);
    expect(normal.ellipse).toHaveBeenCalledWith(10, 44, 8.5, 18.5, 0, 0, 2 * Math.PI);
    drawSingleColumnOvalNote(modulated as unknown as CanvasRenderingContext2D, {
      ...options, tempoModulationMarkers: [{}] as NonNullable<PitchRendererOptions['tempoModulationMarkers']>,
    }, oval, 4);
    expect(modulated.ellipse).toHaveBeenCalledWith(15, 44, 12.75, 17.75, 0, 0, 2 * Math.PI);
  });

  it('draws long-note caps in their existing canvas positions', () => {
    const ctx = canvas();
    drawTwoColumnOvalNote(ctx as unknown as CanvasRenderingContext2D, options, { ...note, endColumnIndex: 4 } as PlacedNote, 4);
    expect(ctx.arc).toHaveBeenCalledWith(20, 44, 18.5, Math.PI / 2, -Math.PI / 2, false);
    expect(ctx.arc).toHaveBeenCalledWith(80, 44, 18.5, -Math.PI / 2, Math.PI / 2, false);
  });

  it('preserves the specialized six-point glyph for both fill clipping and outline', () => {
    class TestPath { constructor(public data: string) {} }
    vi.stubGlobal('Path2D', TestPath);
    try {
      const ctx = canvas();
      drawIndividualSixteenthNote(ctx as unknown as CanvasRenderingContext2D, options, { ...note, shape: 'diamond' }, 4);
      const path = ctx.stroke.mock.calls[0]?.[0] as unknown as TestPath;
      expect(path.data.match(/L /g)).toHaveLength(5);
      expect(ctx.clip).toHaveBeenCalledWith(path);
    } finally { vi.unstubAllGlobals(); }
  });
});
