import store from '@state/initStore.ts';
import { getNoteEndColumn } from '@mlt/types';
import { timeToCanvas } from '@services/columnMapService.ts';
import { getColumnX, getRowY } from '../renderers/rendererUtils.ts';
import { getLogicalCanvasWidth } from '@utils/canvasDimensions.ts';
import { buildCanvasFont } from '@services/typographyService.ts';

/** Describe the objects under the existing two-column eraser brush before deletion. */
export function drawEraserPreview(
  ctx: CanvasRenderingContext2D, col: number, row: number,
  annotationNames: string[], hasModulation: boolean
): void {
  const state = store.state;
  const names = new Set(annotationNames);
  const inRows = (rank: number) => rank >= row - 1 && rank <= row + 1;
  const overlaps = (start: number, end: number) => start <= col + 1 && end >= col;
  if (state.placedNotes.some(note => !note.isDrum && inRows(note.globalRow ?? note.row) &&
    (note.startColumnIndex < col + 2 && getNoteEndColumn(note) > col))) names.add('Notes');
  if (Object.values(state.tonicSignGroups).some(group => group.some(sign => col >= sign.columnIndex && col < sign.columnIndex + 2))) names.add('Tonic');
  for (const [placements, span, label] of [
    [state.sixteenthStampPlacements, 2, 'Sixteenths'],
    [state.sixteenthThreeStampPlacements, 2, 'Sixteenths (3)']
  ] as const) {
    if (placements.some(stamp => {
      const start = timeToCanvas(stamp.startTimeIndex, state);
      return inRows(stamp.row) && overlaps(start, start + span);
    })) names.add(label);
  }
  if (state.tripletStampPlacements.some(stamp => {
    const start = timeToCanvas(stamp.startTimeIndex, state);
    return inRows(stamp.row) && overlaps(start, start + stamp.span * 2 - 1);
  })) names.add('Triplets');
  if (hasModulation) names.add('Modulation');

  const x = getColumnX(col, state);
  const y = getRowY(row, state) - state.cellHeight / 2;
  const width = getColumnX(col + 2, state) - x;
  ctx.save();
  ctx.fillStyle = 'rgba(220, 53, 69, 0.2)';
  ctx.strokeStyle = '#b42332';
  ctx.fillRect(x, y, width, state.cellHeight);
  ctx.strokeRect(x, y, width, state.cellHeight);
  const label = names.size ? `Erase: ${[...names].join(', ')}` : 'Nothing to erase';
  ctx.font = buildCanvasFont('annotation', { fontSizePx: 12 });
  const labelWidth = ctx.measureText(label).width + 10;
  const labelX = Math.max(0, Math.min(x, getLogicalCanvasWidth(ctx.canvas) - labelWidth));
  const labelY = Math.max(0, y - 24);
  ctx.fillStyle = '#fff';
  ctx.fillRect(labelX, labelY, labelWidth, 20);
  ctx.fillStyle = '#b42332';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, labelX + 5, labelY + 10);
  ctx.restore();
}
