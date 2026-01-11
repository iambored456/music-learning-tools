import store from '@state/initStore.ts';
import { removeSixteenthStampsInEraserArea } from '@/rhythm/sixteenthStampPlacements.js';
import { eraseTripletStampGroups } from '@/rhythm/tripletStampPlacements.js';
import type { CanvasSpaceColumn } from '../../../../../../types/state.js';

export class PitchGridEraserToolInteractor {
  handleMouseDown(colIndex: number, rowIndex: number): { handled: boolean; shouldStartDrag: boolean } {
    if (store.state.selectedTool !== 'eraser') {
      return { handled: false, shouldStartDrag: false };
    }

    store.eraseInPitchArea(colIndex as CanvasSpaceColumn, rowIndex, 2, false);

    const eraseEndCol = colIndex + 2 - 1;
    const eraseStartRow = rowIndex - 1;
    const eraseEndRow = rowIndex + 1;

    removeSixteenthStampsInEraserArea(colIndex, eraseEndCol, eraseStartRow, eraseEndRow);
    eraseTripletStampGroups(colIndex, eraseEndCol, eraseStartRow, eraseEndRow);

    return { handled: true, shouldStartDrag: true };
  }

  handleMouseMove(colIndex: number, rowIndex: number, isEraserDragActive: boolean): boolean {
    if (!isEraserDragActive) {
      return false;
    }

    store.eraseInPitchArea(colIndex as CanvasSpaceColumn, rowIndex, 2, false);

    const eraseEndCol = (colIndex + 2 - 1) as CanvasSpaceColumn;
    const eraseStartRow = rowIndex - 1;
    const eraseEndRow = rowIndex + 1;
    store.eraseSixteenthStampsInArea(colIndex as CanvasSpaceColumn, eraseEndCol, eraseStartRow, eraseEndRow);
    store.eraseTripletStampsInArea(colIndex as CanvasSpaceColumn, eraseEndCol, eraseStartRow, eraseEndRow);

    return true;
  }
}




