import { getCanvasColumnWidths as newGetCanvasColumnWidths } from './columnMapService.ts';
import type { AppState } from '@app-types/state.js';

export interface TonicSign {
  columnIndex: number;
  preMacrobeatIndex: number;
  uuid?: string;
}

/**
 * @deprecated Use columnMapService.getCanvasColumnWidths() instead
 *
 * Calculates column widths dynamically based on tonic signs placement and macrobeat groupings.
 * Returns canvas-space column widths (musical columns only, no legends).
 * Legend widths are constants (SIDE_COLUMN_WIDTH) and accessed separately.
 *
 * This function now delegates to columnMapService for consistency.
 */
export function calculateColumnWidths(state: AppState): number[] {
  // Delegate to new centralized service
  return newGetCanvasColumnWidths(state);
}

/**
 * Calculates total canvas width from column widths.
 * Note: columnWidths is now canvas-space only (no legends).
 * To get full grid width including legends, add: 2 * SIDE_COLUMN_WIDTH * 2 * cellWidth
 */
export function getCanvasWidth(columnWidths: number[], cellWidth: number): number {
  return (columnWidths.reduce((sum, w) => sum + w, 0)) * cellWidth;
}
