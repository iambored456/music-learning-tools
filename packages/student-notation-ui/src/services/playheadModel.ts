/**
 * Centralized playhead geometry/time data so pitch and drum playheads stay aligned.
 *
 * IMPORTANT: Playhead canvases are sized to the musical area only (legends excluded).
 * Column indices here are CANVAS-SPACE (0 = first musical beat/column).
 */

import store from '@state/initStore.ts';
import pixelMapService from '@services/pixelMapService.ts';
import columnMapService from '@services/columnMapService.ts';
import type { AppState } from '@app-types/state.js';

let cachedTimeMap: number[] = [];
let cachedMusicalEndTime = 0;

let cachedColumnMapRef: ReturnType<typeof columnMapService.getColumnMap> | null = null;
let cachedMacrobeatBeatSpans: Array<{ start: number; end: number }> = [];

function ensureMacrobeatBeatSpans(): void {
  const state = store.state as AppState;
  const columnMap = columnMapService.getColumnMap(state);
  if (cachedColumnMapRef === columnMap) {return;}
  cachedColumnMapRef = columnMap;
  cachedMacrobeatBeatSpans = [];

  for (const entry of columnMap.entries) {
    if (entry.type !== 'beat' || entry.canvasIndex === null || entry.macrobeatIndex === null) {
      continue;
    }
    const mb = entry.macrobeatIndex;
    const existing = cachedMacrobeatBeatSpans[mb];
    if (!existing) {
      cachedMacrobeatBeatSpans[mb] = { start: entry.canvasIndex, end: entry.canvasIndex };
      continue;
    }
    existing.start = Math.min(existing.start, entry.canvasIndex);
    existing.end = Math.max(existing.end, entry.canvasIndex);
  }
}

function getPixelOptions(): { cellWidth: number; modulationMarkers?: AppState['modulationMarkers']; baseMicrobeatPx?: number } {
  return {
    cellWidth: store.state.cellWidth,
    modulationMarkers: store.state.modulationMarkers,
    baseMicrobeatPx: store.state.baseMicrobeatPx
  };
}

export function updatePlayheadModel({
  timeMap = [],
  musicalEndTime = 0,
  // columnWidths/cellWidth kept for backward compatibility; geometry is derived from store + pixelMapService.
  columnWidths: _columnWidths = [],
  cellWidth: _cellWidth = 0
}: {
  timeMap?: number[];
  musicalEndTime?: number;
  columnWidths?: number[];
  cellWidth?: number;
} = {}): void {
  cachedTimeMap = Array.isArray(timeMap) ? [...timeMap] : [];
  cachedMusicalEndTime = Number(musicalEndTime) || 0;
}

export function getTimeMapReference(): number[] {
  return cachedTimeMap;
}

export function getCachedMusicalEndTime(): number {
  return cachedMusicalEndTime;
}

export function getColumnStartX(index: number): number {
  const options = getPixelOptions();
  const canvasIndex = Math.max(0, Math.floor(index));
  const pos = pixelMapService.getColumnPixelPosition(canvasIndex, options, store.state as AppState);
  return pos?.xStart ?? 0;
}

export function getColumnWidth(index: number): number {
  const options = getPixelOptions();
  const canvasIndex = Math.max(0, Math.floor(index));
  const pos = pixelMapService.getColumnPixelPosition(canvasIndex, options, store.state as AppState);
  return pos?.width ?? 0;
}

export function getRightLegendStartIndex(): number {
  // End-of-grid index in CANVAS-SPACE.
  return Array.isArray(store.state.columnWidths) ? store.state.columnWidths.length : 0;
}

export function getCanvasWidth(): number {
  const options = getPixelOptions();
  const endIndex = getRightLegendStartIndex();
  const pos = pixelMapService.getColumnPixelPosition(endIndex, options, store.state as AppState);
  return pos?.xStart ?? 0;
}

export function getLeftLegendWidth(): number {
  // Playhead canvases exclude the legends, so this is always 0 in playhead-space.
  return 0;
}

export function getMacrobeatHighlightRectForCanvasColumn(canvasColumn: number): { x: number; width: number } | null {
  const state = store.state as AppState;
  ensureMacrobeatBeatSpans();

  const columnMap = columnMapService.getColumnMap(state);
  const visualIndex = columnMap.canvasToVisual.get(Math.floor(canvasColumn));
  if (visualIndex === undefined) {
    return null;
  }
  const entry = columnMap.entries[visualIndex];
  const macrobeatIndex = entry?.macrobeatIndex;
  if (macrobeatIndex === null || macrobeatIndex === undefined) {
    return null;
  }

  const span = cachedMacrobeatBeatSpans[macrobeatIndex];
  if (!span) {
    return null;
  }

  const x = getColumnStartX(span.start);
  const endX = getColumnStartX(span.end + 1);
  return { x, width: Math.max(0, endX - x) };
}
