import { describe, expect, it } from 'vitest';
import { createHexDiamondBase, renderSixteenthStampRowSVG } from './sharedDiamondStampSvg.ts';

const countSegments = (markup: string, kind: 'outline' | 'divider'): number => {
  const pattern = new RegExp(`data-segment="${kind}"`, 'g');
  return (markup.match(pattern) ?? []).length;
};

const renderRow = (slots: 3 | 4, selected: boolean[]): string => {
  const slotWidth = 24;
  const base = createHexDiamondBase(slotWidth, 96, 50);
  return renderSixteenthStampRowSVG({
    slots,
    selected,
    base,
    offset: i => ({ x: 2 + (i * slotWidth), y: 0 }),
    strokeWidth: 4
  });
};

describe('renderSixteenthStampRowSVG', () => {
  it('renders one outline and two dividers for 3-slot [1,1,1]', () => {
    const markup = renderRow(3, [true, true, true]);
    expect(countSegments(markup, 'outline')).toBe(1);
    expect(countSegments(markup, 'divider')).toBe(2);
  });

  it('renders two outlines and zero dividers for 3-slot [1,0,1]', () => {
    const markup = renderRow(3, [true, false, true]);
    expect(countSegments(markup, 'outline')).toBe(2);
    expect(countSegments(markup, 'divider')).toBe(0);
  });

  it('renders one outline and one divider for 3-slot [0,1,1]', () => {
    const markup = renderRow(3, [false, true, true]);
    expect(countSegments(markup, 'outline')).toBe(1);
    expect(countSegments(markup, 'divider')).toBe(1);
  });

  it('renders one outline and three dividers for 4-slot [1,1,1,1]', () => {
    const markup = renderRow(4, [true, true, true, true]);
    expect(countSegments(markup, 'outline')).toBe(1);
    expect(countSegments(markup, 'divider')).toBe(3);
  });

  it('renders two outlines and one divider for 4-slot [1,1,0,1]', () => {
    const markup = renderRow(4, [true, true, false, true]);
    expect(countSegments(markup, 'outline')).toBe(2);
    expect(countSegments(markup, 'divider')).toBe(1);
  });

  it('renders one outline and one divider for 4-slot [0,1,1,0]', () => {
    const markup = renderRow(4, [false, true, true, false]);
    expect(countSegments(markup, 'outline')).toBe(1);
    expect(countSegments(markup, 'divider')).toBe(1);
  });
});
