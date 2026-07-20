import {
  BASE_ABSTRACT_UNIT,
  BASE_DRUM_ROW_HEIGHT,
  DRUM_HEIGHT_SCALE_FACTOR,
  DRUM_ROW_COUNT,
  GRID_WIDTH_RATIO
} from '@/core/constants.ts';
import { getDrumRowHeightFromCellHeight } from '@utils/drumGridSizing.ts';

export const BUTTON_GRID_ROW_COUNT = 2;

export interface NotationAssemblySizing {
  availableHeight: number;
  rowCount: number;
  cellHeight: number;
  cellWidth: number;
  zoomLevel: number;
  buttonGridHeight: number;
  pitchViewportHeight: number;
  drumRowHeight: number;
  drumCanvasHeight: number;
  assemblyHeight: number;
  bottomRemainderHeight: number;
  fitsAvailableHeight: boolean;
}

export function getPitchViewportHeightForCellHeight(cellHeight: number, rowCount: number): number {
  const normalizedRowCount = Math.max(1, Math.round(rowCount));
  return (normalizedRowCount + 1) * (Math.max(1, Math.round(cellHeight)) / 2);
}

export function getButtonGridHeightForCellHeight(cellHeight: number): number {
  const normalizedCellHeight = Math.max(1, Math.round(cellHeight));
  const buttonRowHeight = Math.max(
    BASE_DRUM_ROW_HEIGHT,
    DRUM_HEIGHT_SCALE_FACTOR * normalizedCellHeight
  );
  return BUTTON_GRID_ROW_COUNT * buttonRowHeight;
}

export function getNotationAssemblySizingForCellHeight(
  cellHeight: number,
  rowCount: number,
  availableHeight: number
): NotationAssemblySizing {
  const normalizedAvailableHeight = Number.isFinite(availableHeight)
    ? Math.max(0, availableHeight)
    : 0;
  const normalizedRowCount = Math.max(1, Math.round(rowCount));
  const normalizedCellHeight = Math.max(1, Math.round(cellHeight));
  const cellWidth = Math.max(1, Math.round(normalizedCellHeight * GRID_WIDTH_RATIO));
  const buttonGridHeight = getButtonGridHeightForCellHeight(normalizedCellHeight);
  const pitchViewportHeight = getPitchViewportHeightForCellHeight(normalizedCellHeight, normalizedRowCount);
  const drumRowHeight = getDrumRowHeightFromCellHeight(normalizedCellHeight);
  const drumCanvasHeight = DRUM_ROW_COUNT * drumRowHeight;
  const assemblyHeight = buttonGridHeight + pitchViewportHeight + drumCanvasHeight;
  const bottomRemainderHeight = normalizedAvailableHeight - assemblyHeight;

  return {
    availableHeight: normalizedAvailableHeight,
    rowCount: normalizedRowCount,
    cellHeight: normalizedCellHeight,
    cellWidth,
    zoomLevel: normalizedCellHeight / BASE_ABSTRACT_UNIT,
    buttonGridHeight,
    pitchViewportHeight,
    drumRowHeight,
    drumCanvasHeight,
    assemblyHeight,
    bottomRemainderHeight: Math.max(0, bottomRemainderHeight),
    fitsAvailableHeight: bottomRemainderHeight >= -0.0001
  };
}

export function resolveNotationAssemblySizing(params: {
  availableHeight: number;
  rowCount: number;
}): NotationAssemblySizing {
  const availableHeight = Number.isFinite(params.availableHeight)
    ? Math.max(0, params.availableHeight)
    : 0;
  const rowCount = Math.max(1, Math.round(params.rowCount));
  const pitchOnlyUpperBound = Math.ceil((availableHeight * 2) / (rowCount + 1));
  let low = 1;
  let high = Math.max(1, pitchOnlyUpperBound + 2);
  let best = 1;

  while (low <= high) {
    const candidate = Math.floor((low + high) / 2);
    const sizing = getNotationAssemblySizingForCellHeight(candidate, rowCount, availableHeight);

    if (sizing.fitsAvailableHeight) {
      best = candidate;
      low = candidate + 1;
    } else {
      high = candidate - 1;
    }
  }

  return getNotationAssemblySizingForCellHeight(best, rowCount, availableHeight);
}
