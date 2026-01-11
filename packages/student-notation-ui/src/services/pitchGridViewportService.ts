// js/services/pitchGridViewportService.ts
//
// Transitional facade for pitch-grid viewport concerns (scroll/zoom/visible-range).
// This starts as a proxy to LayoutService so consumers can migrate off the LayoutService god-object
// before we physically move the underlying implementation.

import LayoutService from './layoutService.js';
import type { PitchRange } from '../../types/state.js';

const pitchGridViewportService = {
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
