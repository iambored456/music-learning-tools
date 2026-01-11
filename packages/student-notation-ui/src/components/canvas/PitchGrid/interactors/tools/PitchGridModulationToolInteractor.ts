import store from '@state/initStore.ts';
import { MODULATION_RATIOS } from '@/rhythm/modulationMapping.js';
import { getModulationMarkerCursor, hitTestModulationMarker } from '../../renderers/modulationRenderer.js';
import logger from '@utils/logger.ts';
import type { ModulationMarker } from '../../../../../../types/state.js';

interface MeasureBoundary {
  measureIndex: number;
  xPosition: number;
  macrobeatIndex: number;
}

export class PitchGridModulationToolInteractor {
  private isDragging = false;
  private draggedModulationMarker: ModulationMarker | null = null;
  private lastModulationHoverResult: ReturnType<typeof hitTestModulationMarker> | null = null;

  handleMouseDown(actualX: number, canvasY: number): boolean {
    for (const marker of store.state.modulationMarkers || []) {
      const xCanvas = marker.xCanvas ?? marker.xPosition ?? 0;
      const hitResult = hitTestModulationMarker(actualX, canvasY, { ...marker, xCanvas });
      if (!hitResult) {
        continue;
      }

      if (hitResult.type === 'label') {
        const newRatio = marker.ratio === MODULATION_RATIOS.COMPRESSION_2_3
          ? MODULATION_RATIOS.EXPANSION_3_2
          : MODULATION_RATIOS.COMPRESSION_2_3;
        store.setModulationRatio(marker.id, newRatio);
        return true;
      }

      if (hitResult.type === 'barline' && hitResult.canDrag) {
        this.isDragging = true;
        this.draggedModulationMarker = marker;
        document.body.style.cursor = getModulationMarkerCursor(hitResult);
        return true;
      }
    }

    return false;
  }

  handlePlacementClick(actualX: number, findNearestMeasureBoundary: (clickX: number) => MeasureBoundary | null): boolean {
    if (store.state.selectedTool !== 'modulation') {
      return false;
    }

    const selectedRatio = store.state.selectedModulationRatio;
    if (typeof selectedRatio !== 'number') {
      logger.warn('PitchGridModulationToolInteractor', 'No modulation ratio selected before placement', null, 'grid');
      return true;
    }

    const measureBoundary = findNearestMeasureBoundary(actualX);
    if (!measureBoundary) {
      logger.warn('PitchGridModulationToolInteractor', 'Modulation placement must be near a measure boundary', { clickX: actualX }, 'grid');
      return true;
    }

    logger.debug('PitchGridModulationToolInteractor', 'Placing modulation marker at boundary', {
      measureIndex: measureBoundary.measureIndex,
      ratio: selectedRatio,
      clickX: actualX,
      boundaryX: measureBoundary.xPosition
    }, 'grid');

    const markerId = store.addModulationMarker(
      measureBoundary.measureIndex,
      selectedRatio,
      measureBoundary.xPosition,
      null,
      measureBoundary.macrobeatIndex
    );

    logger.debug('PitchGridModulationToolInteractor', 'Modulation marker placed', {
      markerId,
      measureIndex: measureBoundary.measureIndex,
      ratio: selectedRatio
    }, 'grid');

    return true;
  }

  handleMouseMove(actualX: number): boolean {
    if (!this.isDragging || !this.draggedModulationMarker) {
      return false;
    }

    const baseMicrobeatPx = store.state.baseMicrobeatPx || store.state.cellWidth || 40;
    const snappedX = Math.round(actualX / baseMicrobeatPx) * baseMicrobeatPx;
    store.moveModulationMarker(this.draggedModulationMarker.id, snappedX);
    return true;
  }

  getHoveredMarker(actualX: number, canvasY: number): ReturnType<typeof hitTestModulationMarker> | null {
    for (const marker of store.state.modulationMarkers || []) {
      const xCanvas = marker.xCanvas ?? marker.xPosition ?? 0;
      const hitResult = hitTestModulationMarker(actualX, canvasY, { ...marker, xCanvas });
      if (hitResult) {
        return hitResult;
      }
    }
    return null;
  }

  updateCursor(canvasEl: HTMLElement, hoveredMarker: ReturnType<typeof hitTestModulationMarker> | null): void {
    if (hoveredMarker) {
      canvasEl.style.cursor = getModulationMarkerCursor(hoveredMarker);
      this.lastModulationHoverResult = hoveredMarker;
      return;
    }

    if (!this.lastModulationHoverResult) {
      return;
    }

    canvasEl.style.cursor = 'default';
    this.lastModulationHoverResult = null;
  }

  handleMouseUp(): boolean {
    if (!this.isDragging) {
      return false;
    }

    this.isDragging = false;
    this.draggedModulationMarker = null;
    return true;
  }
}
