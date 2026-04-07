import LayoutService from '@services/layoutService.ts';
import type { PitchRange } from '@mlt/types';

interface PitchGridViewportService {
  getViewportInfo: typeof LayoutService.getViewportInfo;
  setViewportTopIndex(topIndex: number): void;
  setViewportBottomIndex(bottomIndex: number): void;
  setPitchViewportRange(range: PitchRange, options?: { animateMs?: number; source?: string }): void;
}

const pitchGridViewportService: PitchGridViewportService = {
  getViewportInfo: () => LayoutService.getViewportInfo(),

  setViewportTopIndex(topIndex: number): void {
    LayoutService.setViewportTopIndex?.(topIndex);
  },

  setViewportBottomIndex(bottomIndex: number): void {
    LayoutService.setViewportBottomIndex?.(bottomIndex);
  },

  setPitchViewportRange(range: PitchRange, options: { animateMs?: number; source?: string } = {}): void {
    LayoutService.setPitchViewportRange?.(range, options);
  }
};

export default pitchGridViewportService;
