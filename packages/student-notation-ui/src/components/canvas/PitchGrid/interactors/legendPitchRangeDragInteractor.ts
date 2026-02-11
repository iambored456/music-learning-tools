import store from '@state/initStore.ts';
import pitchGridViewportService from '@services/pitchGridViewportService.ts';

type LegendSide = 'left' | 'right';
type LegendHandle = 'top' | 'bottom';

interface ActiveLegendZone {
  side: LegendSide;
  handle: LegendHandle;
  rect: DOMRect;
}

const WRAPPER_ID = 'pitch-canvas-wrapper';
const LEFT_LEGEND_CANVAS_ID = 'legend-left-canvas';
const RIGHT_LEGEND_CANVAS_ID = 'legend-right-canvas';

const HOVER_MESSAGES: Record<LegendHandle, string> = {
  top: 'Drag to set top pitch',
  bottom: 'Drag to set bottom pitch'
};

function getCurrentRange(): { topIndex: number; bottomIndex: number } {
  const totalRows = store.state.fullRowData.length;
  const maxIndex = Math.max(0, totalRows - 1);
  const current = store.state.pitchRange ?? { topIndex: 0, bottomIndex: maxIndex };
  const topIndex = Math.max(0, Math.min(maxIndex, current.topIndex ?? 0));
  const bottomIndex = Math.max(topIndex, Math.min(maxIndex, current.bottomIndex ?? maxIndex));
  return { topIndex, bottomIndex };
}

function getRowStepPixels(): number {
  const viewportInfo = pitchGridViewportService.getViewportInfo();
  if (Number.isFinite(viewportInfo.halfUnit) && viewportInfo.halfUnit > 0) {
    return viewportInfo.halfUnit;
  }

  const fallbackCellHeight = Number.isFinite(store.state.cellHeight) && store.state.cellHeight > 0
    ? store.state.cellHeight
    : 20;
  return fallbackCellHeight / 2;
}

function getPitchLabelAtRow(rowIndex: number): string {
  const row = store.state.fullRowData[rowIndex];
  if (!row) {
    return '';
  }
  return row.toneNote || row.pitch;
}

function isLegendInteractive(canvas: HTMLCanvasElement | null): canvas is HTMLCanvasElement {
  if (!canvas) {
    return false;
  }

  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return false;
  }

  const style = window.getComputedStyle(canvas);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

function resolveLegendZone(
  clientX: number,
  clientY: number,
  leftLegendCanvas: HTMLCanvasElement | null,
  rightLegendCanvas: HTMLCanvasElement | null
): ActiveLegendZone | null {
  const candidates: Array<{ side: LegendSide; canvas: HTMLCanvasElement | null }> = [
    { side: 'left', canvas: leftLegendCanvas },
    { side: 'right', canvas: rightLegendCanvas }
  ];

  for (const candidate of candidates) {
    if (!isLegendInteractive(candidate.canvas)) {
      continue;
    }

    const rect = candidate.canvas.getBoundingClientRect();
    const insideX = clientX >= rect.left && clientX <= rect.right;
    const insideY = clientY >= rect.top && clientY <= rect.bottom;
    if (!insideX || !insideY) {
      continue;
    }

    const halfHeight = rect.height / 2;
    const handle: LegendHandle = (clientY - rect.top) <= halfHeight ? 'top' : 'bottom';
    return {
      side: candidate.side,
      handle,
      rect
    };
  }

  return null;
}

function createTooltipElement(wrapper: HTMLElement): HTMLDivElement {
  const element = document.createElement('div');
  element.className = 'legend-drag-tooltip';
  wrapper.appendChild(element);
  return element;
}

export function initLegendPitchRangeDragInteraction(): void {
  const wrapper = document.getElementById(WRAPPER_ID) as HTMLElement | null;
  const leftLegendCanvas = document.getElementById(LEFT_LEGEND_CANVAS_ID) as HTMLCanvasElement | null;
  const rightLegendCanvas = document.getElementById(RIGHT_LEGEND_CANVAS_ID) as HTMLCanvasElement | null;

  if (!wrapper || (!leftLegendCanvas && !rightLegendCanvas)) {
    return;
  }

  if (wrapper.dataset['legendPitchDragInit'] === '1') {
    return;
  }
  wrapper.dataset['legendPitchDragInit'] = '1';

  const tooltipElement = createTooltipElement(wrapper);

  let hoveredZone: ActiveLegendZone | null = null;
  let draggingZone: ActiveLegendZone | null = null;
  let activePointerId: number | null = null;
  let dragStartClientY = 0;
  let dragStartIndex = 0;

  const hideTooltip = (): void => {
    tooltipElement.classList.remove('legend-drag-tooltip--visible');
    tooltipElement.textContent = '';
  };

  const updateVisualFeedback = (
    zone: ActiveLegendZone | null,
    opts: { message: string }
  ): void => {
    if (!zone) {
      hideTooltip();
      return;
    }

    const wrapperRect = wrapper.getBoundingClientRect();
    const zoneTop = zone.handle === 'top' ? zone.rect.top : (zone.rect.top + (zone.rect.height / 2));
    const zoneHeight = zone.rect.height / 2;
    const left = zone.rect.left - wrapperRect.left;
    const top = zoneTop - wrapperRect.top;

    const tooltipX = left + (zone.rect.width / 2);
    const tooltipY = zone.handle === 'top'
      ? (top + zoneHeight - 8)
      : (top + 8);

    tooltipElement.textContent = opts.message;
    tooltipElement.style.left = `${tooltipX}px`;
    tooltipElement.style.top = `${tooltipY}px`;
    tooltipElement.classList.add('legend-drag-tooltip--visible');
  };

  const clearHoverState = (): void => {
    hoveredZone = null;
    wrapper.style.cursor = '';
    hideTooltip();
  };

  const applyDragStep = (clientY: number): void => {
    if (!draggingZone) {
      return;
    }

    // Inverted drag behavior: moving up now increases row index, moving down decreases it.
    const deltaRows = Math.round((dragStartClientY - clientY) / getRowStepPixels());
    const candidateIndex = dragStartIndex + deltaRows;

    if (draggingZone.handle === 'top') {
      pitchGridViewportService.setViewportTopIndex(candidateIndex);
    } else {
      pitchGridViewportService.setViewportBottomIndex(candidateIndex);
    }

    const currentRange = getCurrentRange();
    const currentIndex = draggingZone.handle === 'top'
      ? currentRange.topIndex
      : currentRange.bottomIndex;

    updateVisualFeedback(draggingZone, {
      message: getPitchLabelAtRow(currentIndex)
    });
  };

  const handlePointerDown = (event: PointerEvent): void => {
    const zone = resolveLegendZone(event.clientX, event.clientY, leftLegendCanvas, rightLegendCanvas);
    if (!zone) {
      return;
    }

    const currentRange = getCurrentRange();
    draggingZone = zone;
    hoveredZone = zone;
    activePointerId = event.pointerId;
    dragStartClientY = event.clientY;
    dragStartIndex = zone.handle === 'top' ? currentRange.topIndex : currentRange.bottomIndex;

    try {
      wrapper.setPointerCapture(event.pointerId);
    } catch {
      // Ignore if pointer capture is unavailable in the current environment.
    }

    wrapper.style.cursor = 'grabbing';
    updateVisualFeedback(zone, {
      message: getPitchLabelAtRow(dragStartIndex)
    });
    event.preventDefault();
  };

  const handlePointerMove = (event: PointerEvent): void => {
    if (draggingZone) {
      applyDragStep(event.clientY);
      event.preventDefault();
      return;
    }

    const zone = resolveLegendZone(event.clientX, event.clientY, leftLegendCanvas, rightLegendCanvas);
    hoveredZone = zone;

    if (!zone) {
      clearHoverState();
      return;
    }

    wrapper.style.cursor = 'grab';
    updateVisualFeedback(zone, {
      message: HOVER_MESSAGES[zone.handle]
    });
  };

  const endDrag = (): void => {
    if (activePointerId !== null) {
      try {
        if (wrapper.hasPointerCapture(activePointerId)) {
          wrapper.releasePointerCapture(activePointerId);
        }
      } catch {
        // Ignore if pointer capture has already been released.
      }
    }
    draggingZone = null;
    activePointerId = null;

    if (hoveredZone) {
      wrapper.style.cursor = 'grab';
      updateVisualFeedback(hoveredZone, {
        message: HOVER_MESSAGES[hoveredZone.handle]
      });
    } else {
      clearHoverState();
    }
  };

  const handlePointerUp = (event: PointerEvent): void => {
    if (activePointerId !== null && event.pointerId !== activePointerId) {
      return;
    }
    hoveredZone = resolveLegendZone(event.clientX, event.clientY, leftLegendCanvas, rightLegendCanvas);
    endDrag();
  };

  const handlePointerCancel = (event: PointerEvent): void => {
    if (activePointerId !== null && event.pointerId !== activePointerId) {
      return;
    }
    hoveredZone = null;
    endDrag();
  };

  const handlePointerLeave = (): void => {
    if (draggingZone) {
      return;
    }
    clearHoverState();
  };

  wrapper.addEventListener('pointerdown', handlePointerDown);
  wrapper.addEventListener('pointermove', handlePointerMove);
  wrapper.addEventListener('pointerup', handlePointerUp);
  wrapper.addEventListener('pointercancel', handlePointerCancel);
  wrapper.addEventListener('pointerleave', handlePointerLeave);
}
