import { describe, expect, it, vi } from 'vitest';
import type { ArrowAnnotation } from '@mlt/types';
import { renderArrowAnnotation } from './annotationArrowRenderer.ts';

function render(settings: Partial<ArrowAnnotation['settings']> = {}) {
  const ctx = {
    save: vi.fn(), restore: vi.fn(), setLineDash: vi.fn(), beginPath: vi.fn(),
    moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), fill: vi.fn(),
    closePath: vi.fn(), translate: vi.fn(), rotate: vi.fn(), arc: vi.fn(), rect: vi.fn(),
    strokeStyle: '', fillStyle: '', lineCap: '', lineJoin: '', lineWidth: 0, globalAlpha: 1
  };
  renderArrowAnnotation({
    ctx: ctx as unknown as CanvasRenderingContext2D,
    annotation: {
      type: 'arrow', startCol: 0, startRow: 0, endCol: 10, endRow: 0,
      startX: 0, startY: 0, endX: 100, endY: 0,
      settings: {
        lineStyle: 'solid', strokeWeight: 4, startArrowhead: 'none',
        endArrowhead: 'filled-arrow', arrowheadSize: 12, ...settings
      }
    } as Parameters<typeof renderArrowAnnotation>[0]['annotation'],
    getStrokeWidth: weight => weight,
    getLineDash: () => []
  });
  return ctx;
}

describe('arrow appearance', () => {
  it('keeps old annotations black with straight caps and a filled arrowhead', () => {
    const ctx = render();
    expect(ctx.strokeStyle).toBe('#000000');
    expect(ctx.lineCap).toBe('butt');
    expect(ctx.lineTo).toHaveBeenNthCalledWith(1, 88, 0);
    expect(ctx.fill).toHaveBeenCalledOnce();
  });

  it('uses the chosen colour and rounded caps for the shaft and filled endpoint', () => {
    const ctx = render({ color: '#d66573', roundedEnds: true, endArrowhead: 'square' });
    expect(ctx.strokeStyle).toBe('#d66573');
    expect(ctx.fillStyle).toBe('#d66573');
    expect(ctx.lineCap).toBe('round');
    expect(ctx.rect).toHaveBeenCalledWith(-4, -4, 8, 8);
  });

  it('stops the shaft at open shape boundaries without filling their interiors', () => {
    const ctx = render({ startArrowhead: 'open-circle', endArrowhead: 'open-diamond' });
    expect(ctx.moveTo).toHaveBeenNthCalledWith(1, 4, 0);
    expect(ctx.lineTo).toHaveBeenNthCalledWith(1, 94, 0);
    expect(ctx.fill).not.toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalledTimes(3);
  });
});
