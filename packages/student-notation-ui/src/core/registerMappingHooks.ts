import type { StoreInstance } from '@mlt/student-notation-engine';
import { registerColumnMapCallbacks } from '@state/initStore.ts';
import columnMapService, { registerStoreHooks as registerColumnMapHooks } from '@services/columnMapService.ts';
import { registerStoreHooks as registerPixelMapHooks } from '@services/pixelMapService.ts';

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
}

export function registerPixelMapBridge(store: StoreInstance): void {
  registerPixelMapHooks(store);
}
