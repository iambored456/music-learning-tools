import store from '@state/initStore.ts';
import { drawDrumShape } from '@components/canvas/drumGrid/drumGridRenderer.ts';
import { getColumnX } from '@components/canvas/PitchGrid/renderers/rendererUtils.ts';
import { getLogicalCanvasHeight, getLogicalCanvasWidth } from '@utils/canvasDimensions.ts';
import { getDrumRowHeightFromCellHeight, getDrumShapeBoxHeightFromCellWidth } from '@utils/drumGridSizing.ts';
import { isWithinTonicSpan } from '@utils/tonicColumnUtils.ts';
import { getPlacedTonicSigns } from '@state/selectors.ts';

type DrumBeatPattern = Array<[row: number, step: number]>;

const PATTERNS: Record<string, DrumBeatPattern> = {
  rock: [[0, 0], [0, 2], [0, 4], [0, 6], [1, 2], [1, 6], [2, 0], [2, 4]],
  'four-floor': [[0, 0], [0, 2], [0, 4], [0, 6], [1, 2], [1, 6], [2, 0], [2, 2], [2, 4], [2, 6]],
  syncopated: [[0, 0], [0, 1], [0, 3], [0, 5], [0, 7], [1, 2], [1, 6], [2, 0], [2, 3], [2, 5]]
};

function clearPreview(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, getLogicalCanvasWidth(ctx.canvas), getLogicalCanvasHeight(ctx.canvas));
}

function renderPreview(ctx: CanvasRenderingContext2D, pattern: DrumBeatPattern): void {
  clearPreview(ctx);
  const state = store.state;
  const tonicSigns = getPlacedTonicSigns(state);
  const columns = state.columnWidths
    .map((width, index) => ({ width, index }))
    .filter(({ width, index }) => width > 0 && !isWithinTonicSpan(index, tonicSigns))
    .slice(0, 8);
  const options = {
    ...state,
    musicalColumnWidths: state.columnWidths,
    baseMicrobeatPx: state.cellWidth
  };
  const rowHeight = getDrumRowHeightFromCellHeight(state.cellHeight);
  const shapeHeight = getDrumShapeBoxHeightFromCellWidth(state.cellWidth);
  const color = state.selectedNote?.color ?? '#4a90e2';

  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = color;
  for (const [row, step] of pattern) {
    const column = columns[step];
    if (!column) continue;
    const x = getColumnX(column.index, options);
    const nextX = getColumnX(column.index + 1, options);
    const y = row * rowHeight + (rowHeight - shapeHeight) / 2;
    drawDrumShape(ctx, row, x, y, Math.max(1, nextX - x), shapeHeight);
  }
  ctx.restore();
}

export function initDrumBeatPreviews(): () => void {
  const canvas = document.getElementById('drum-hover-canvas') as HTMLCanvasElement | null;
  const ctx = canvas?.getContext('2d') ?? null;
  if (!ctx) return () => {};

  const cleanups: Array<() => void> = [];
  document.querySelectorAll<HTMLButtonElement>('.drum-beat-preview-button').forEach(button => {
    const pattern = PATTERNS[button.dataset['drumBeatPattern'] ?? ''];
    if (!pattern) return;
    const show = (): void => renderPreview(ctx, pattern);
    const clear = (): void => clearPreview(ctx);
    button.addEventListener('pointerenter', show);
    button.addEventListener('focus', show);
    button.addEventListener('pointerleave', clear);
    button.addEventListener('blur', clear);
    cleanups.push(() => {
      button.removeEventListener('pointerenter', show);
      button.removeEventListener('focus', show);
      button.removeEventListener('pointerleave', clear);
      button.removeEventListener('blur', clear);
    });
  });

  return () => {
    cleanups.forEach(cleanup => cleanup());
    clearPreview(ctx);
  };
}
