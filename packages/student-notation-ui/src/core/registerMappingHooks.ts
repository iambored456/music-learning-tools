import type { StoreInstance } from '@mlt/student-notation-engine';
import { registerColumnMapCallbacks } from '@state/initStore.ts';
import columnMapService, { registerStoreHooks as registerColumnMapHooks } from '@services/columnMapService.ts';
import { registerStoreHooks as registerPixelMapHooks } from '@services/pixelMapService.ts';
import type { AppState, CanvasSpaceColumn, TonicSign } from '@mlt/types';

function syncTonicColumnsFromColumnMap(store: StoreInstance): void {
  const state = store.state as AppState;
  const map = columnMapService.getColumnMap(state);
  const tonicStartByUuid = new Map<string, number>();

  map.entries.forEach(entry => {
    if (entry.type === 'tonic' && entry.tonicSignUuid && typeof entry.canvasIndex === 'number') {
      tonicStartByUuid.set(entry.tonicSignUuid, entry.canvasIndex);
    }
  });

  let changed = false;
  Object.entries(state.tonicSignGroups || {}).forEach(([uuid, group]) => {
    const signUuid = group?.[0]?.uuid;
    const start = (signUuid ? tonicStartByUuid.get(signUuid) : undefined) ?? tonicStartByUuid.get(uuid);
    if (start === undefined) {
      return;
    }

    group.forEach((sign: TonicSign) => {
      if (sign.columnIndex !== start) {
        sign.columnIndex = start as CanvasSpaceColumn;
        changed = true;
      }
    });
  });

  if (changed) {
    columnMapService.invalidate();
  }
}

export function registerColumnMapBridge(store: StoreInstance): void {
  registerColumnMapHooks(store);
  registerColumnMapCallbacks({
    getColumnMap: (state) => columnMapService.getColumnMap(state),
    visualToTimeIndex: (state, visualIndex) => {
      const map = columnMapService.getColumnMap(state);
      return map.visualToTime.get(visualIndex) ?? null;
    },
    timeIndexToVisualColumn: (state, timeIndex) => {
      const map = columnMapService.getColumnMap(state);
      return map.timeToVisual.get(timeIndex) ?? null;
    },
    getTimeBoundaryAfterMacrobeat: (state, index) => {
      const map = columnMapService.getColumnMap(state);
      const boundary = map.macrobeatBoundaries.find(entry => entry.macrobeatIndex === index);
      return boundary ? boundary.timeColumn + 1 : 0;
    }
  });
  syncTonicColumnsFromColumnMap(store);
  store.on('rhythmStructureChanged', () => {
    syncTonicColumnsFromColumnMap(store);
  });
}

export function registerPixelMapBridge(store: StoreInstance): void {
  registerPixelMapHooks(store);
}
