import {
  getCanvasPixelRatio,
  getLogicalCanvasHeight,
  getLogicalCanvasWidth
} from '@utils/canvasDimensions.ts';
import { getDrumRowHeightFromCellHeight } from '@utils/drumGridSizing.ts';
import { resizeCanvasForPixelRatio } from '@services/layout/canvasDimensions.ts';
import store from '@state/initStore.ts';

const FALLBACK_CANVAS_BACKGROUND = '#ffffff';
const GRID_BOUNDARY_COLOR = '#adb5bd';
const DRUM_TONIC_LINE_COLOR = '#c7cfd8';
const POSITION_TOLERANCE_PX = 0.5;

interface ButtonGridMutation {
  element: HTMLElement;
  originalLeft: string;
}

interface ButtonGridDividerMutation {
  element: HTMLElement;
  originalHasLeftDivider: string | null;
}

interface CanvasSizeRestoreState {
  context: CanvasRenderingContext2D;
  logicalWidth: number;
  logicalHeight: number;
  pixelRatio: number;
}

interface InlineStyleRestoreState {
  element: HTMLElement;
  property: string;
  value: string;
  priority: string;
}

function getOpaqueBackgroundColor(sourceElement: HTMLElement): string {
  let candidate: HTMLElement | null = sourceElement;
  while (candidate) {
    const backgroundColor = window.getComputedStyle(candidate).backgroundColor;
    if (backgroundColor && backgroundColor !== 'transparent' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
      return backgroundColor;
    }
    candidate = candidate.parentElement;
  }
  return FALLBACK_CANVAS_BACKGROUND;
}

function drawReflowedCanvasSnapshot(
  hoverCtx: CanvasRenderingContext2D,
  sourceCanvas: HTMLCanvasElement,
  insertionX: number,
  insertionWidth: number
): void {
  const previewWidth = getLogicalCanvasWidth(hoverCtx.canvas);
  const previewHeight = getLogicalCanvasHeight(hoverCtx.canvas);
  const sourceWidth = getLogicalCanvasWidth(sourceCanvas);
  const sourceHeight = getLogicalCanvasHeight(sourceCanvas);

  if (previewWidth <= 0 || previewHeight <= 0 || sourceWidth <= 0 || sourceHeight <= 0) {
    return;
  }

  const clampedInsertionX = Math.max(0, Math.min(previewWidth, insertionX));
  const clampedInsertionWidth = Math.max(0, insertionWidth);
  const sourceScaleX = sourceCanvas.width / sourceWidth;
  const visibleRightWidth = Math.max(0, previewWidth - clampedInsertionX - clampedInsertionWidth);

  hoverCtx.save();
  hoverCtx.globalAlpha = 1;
  hoverCtx.imageSmoothingEnabled = false;
  hoverCtx.fillStyle = getOpaqueBackgroundColor(sourceCanvas);
  hoverCtx.fillRect(0, 0, previewWidth, previewHeight);

  if (clampedInsertionX > 0) {
    hoverCtx.drawImage(
      sourceCanvas,
      0,
      0,
      clampedInsertionX * sourceScaleX,
      sourceCanvas.height,
      0,
      0,
      clampedInsertionX,
      previewHeight
    );
  }

  if (visibleRightWidth > 0) {
    hoverCtx.drawImage(
      sourceCanvas,
      clampedInsertionX * sourceScaleX,
      0,
      visibleRightWidth * sourceScaleX,
      sourceCanvas.height,
      clampedInsertionX + clampedInsertionWidth,
      0,
      visibleRightWidth,
      previewHeight
    );
  }

  hoverCtx.restore();
}

function drawVerticalBoundaries(
  ctx: CanvasRenderingContext2D,
  insertionX: number,
  insertionWidth: number,
  height: number
): void {
  ctx.save();
  ctx.strokeStyle = GRID_BOUNDARY_COLOR;
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  [insertionX, insertionX + insertionWidth].forEach(x => {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  });
  ctx.restore();
}

class TonicInsertionPreviewService {
  private drumHoverContext: CanvasRenderingContext2D | null = null;
  private buttonGridMutations: ButtonGridMutation[] = [];
  private buttonGridSpacer: HTMLDivElement | null = null;
  private buttonGridRightBoundaryExtension: HTMLDivElement | null = null;
  private buttonGridDividerMutation: ButtonGridDividerMutation | null = null;
  private buttonPreviewInsertionX: number | null = null;
  private buttonPreviewInsertionWidth: number | null = null;
  private canvasSizeRestoreStates = new Map<HTMLCanvasElement, CanvasSizeRestoreState>();
  private inlineStyleRestoreStates: InlineStyleRestoreState[] = [];
  private rightLegendCanvas: HTMLCanvasElement | null = null;
  private rightLegendOriginalTransform = '';
  private rightLegendPreviewWidth: number | null = null;

  renderPitchSnapshot(
    hoverCtx: CanvasRenderingContext2D,
    sourceCanvas: HTMLCanvasElement,
    insertionX: number,
    insertionWidth: number
  ): void {
    this.expandPreviewCanvas(hoverCtx, getLogicalCanvasWidth(sourceCanvas) + insertionWidth);
    drawReflowedCanvasSnapshot(hoverCtx, sourceCanvas, insertionX, insertionWidth);
  }

  renderAlignedGridPreviews(insertionX: number, insertionWidth: number): void {
    this.ensurePreviewOverflowVisible();
    this.renderRightPitchLegendPreview(insertionWidth);
    this.renderDrumGridPreview(insertionX, insertionWidth);
    this.renderButtonGridPreview(insertionX, insertionWidth);
  }

  clearAlignedGridPreviews(): void {
    if (this.drumHoverContext) {
      this.drumHoverContext.clearRect(
        0,
        0,
        getLogicalCanvasWidth(this.drumHoverContext.canvas),
        getLogicalCanvasHeight(this.drumHoverContext.canvas)
      );
      this.drumHoverContext = null;
    }
    this.restoreButtonGrid();
    this.restoreRightPitchLegend();
    this.restoreInlineStyles();
    this.restorePreviewCanvasSizes();
  }

  private renderDrumGridPreview(insertionX: number, insertionWidth: number): void {
    const drumCanvas = document.getElementById('drum-grid') as HTMLCanvasElement | null;
    const drumHoverCanvas = document.getElementById('drum-hover-canvas') as HTMLCanvasElement | null;
    const drumHoverCtx = drumHoverCanvas?.getContext('2d') ?? null;
    if (!drumCanvas || !drumHoverCtx) {
      return;
    }

    this.drumHoverContext = drumHoverCtx;
    this.expandPreviewCanvas(drumHoverCtx, getLogicalCanvasWidth(drumCanvas) + insertionWidth);
    drumHoverCtx.clearRect(
      0,
      0,
      getLogicalCanvasWidth(drumHoverCanvas),
      getLogicalCanvasHeight(drumHoverCanvas)
    );
    drawReflowedCanvasSnapshot(drumHoverCtx, drumCanvas, insertionX, insertionWidth);

    const previewHeight = getLogicalCanvasHeight(drumHoverCanvas);
    const drumRowHeight = getDrumRowHeightFromCellHeight(store.state.cellHeight);
    drumHoverCtx.save();
    drumHoverCtx.beginPath();
    drumHoverCtx.rect(insertionX, 0, insertionWidth, previewHeight);
    drumHoverCtx.clip();
    drumHoverCtx.strokeStyle = DRUM_TONIC_LINE_COLOR;
    drumHoverCtx.lineWidth = 1;
    drumHoverCtx.globalAlpha = 0.6;
    for (let row = 0; row < 3; row++) {
      const y = row * drumRowHeight;
      drumHoverCtx.beginPath();
      drumHoverCtx.moveTo(insertionX, y);
      drumHoverCtx.lineTo(insertionX + insertionWidth, y);
      drumHoverCtx.stroke();
    }
    drumHoverCtx.restore();
    drawVerticalBoundaries(drumHoverCtx, insertionX, insertionWidth, previewHeight);
  }

  private renderRightPitchLegendPreview(insertionWidth: number): void {
    if (
      this.rightLegendCanvas?.isConnected
      && this.rightLegendPreviewWidth !== null
      && Math.abs(this.rightLegendPreviewWidth - insertionWidth) <= POSITION_TOLERANCE_PX
    ) {
      return;
    }

    this.restoreRightPitchLegend();
    const rightLegendCanvas = document.getElementById('legend-right-canvas') as HTMLCanvasElement | null;
    if (!rightLegendCanvas || insertionWidth <= 0) {
      return;
    }

    this.rightLegendCanvas = rightLegendCanvas;
    this.rightLegendOriginalTransform = rightLegendCanvas.style.transform;
    this.rightLegendPreviewWidth = insertionWidth;
    const existingTransform = this.rightLegendOriginalTransform.trim();
    rightLegendCanvas.style.transform = existingTransform
      ? `${existingTransform} translateX(${insertionWidth}px)`
      : `translateX(${insertionWidth}px)`;
  }

  private renderButtonGridPreview(insertionX: number, insertionWidth: number): void {
    if (
      this.buttonPreviewInsertionX !== null
      && Math.abs(this.buttonPreviewInsertionX - insertionX) <= POSITION_TOLERANCE_PX
      && this.buttonPreviewInsertionWidth !== null
      && Math.abs(this.buttonPreviewInsertionWidth - insertionWidth) <= POSITION_TOLERANCE_PX
      && this.buttonGridSpacer?.isConnected
    ) {
      return;
    }

    this.restoreButtonGrid();
    this.freezeButtonGridResponsiveSizing();
    this.expandButtonGridGeometry(insertionWidth);

    const buttonLayer = document.getElementById('beat-line-button-layer');
    const pitchCanvas = document.getElementById('notation-grid');
    if (!buttonLayer || !pitchCanvas || insertionWidth <= 0) {
      return;
    }

    const buttonLayerRect = buttonLayer.getBoundingClientRect();
    const pitchCanvasRect = pitchCanvas.getBoundingClientRect();
    const musicalOffsetX = pitchCanvasRect.left - buttonLayerRect.left;
    const insertionLeft = musicalOffsetX + insertionX;
    const previewElements = buttonLayer.querySelectorAll<HTMLElement>(
      '[data-rhythm-ui-element], .time-signature-label'
    );
    const shiftedGroupings: Array<{ element: HTMLElement; left: number }> = [];

    previewElements.forEach(element => {
      const currentLeft = Number.parseFloat(element.style.left);
      if (!Number.isFinite(currentLeft)) {
        return;
      }

      const isBoundaryAtInsertion = element.classList.contains('buttonGrid-ui-button--boundary')
        && Math.abs(currentLeft - insertionLeft) <= POSITION_TOLERANCE_PX;
      if (currentLeft < insertionLeft - POSITION_TOLERANCE_PX || isBoundaryAtInsertion) {
        return;
      }

      this.buttonGridMutations.push({ element, originalLeft: element.style.left });
      element.style.left = `${currentLeft + insertionWidth}px`;
      if (element.classList.contains('grouping-segment')) {
        shiftedGroupings.push({ element, left: currentLeft });
      }
    });

    shiftedGroupings.sort((a, b) => a.left - b.left);
    const firstShiftedGrouping = shiftedGroupings[0]?.element ?? null;
    if (firstShiftedGrouping) {
      this.buttonGridDividerMutation = {
        element: firstShiftedGrouping,
        originalHasLeftDivider: firstShiftedGrouping.getAttribute('data-has-left-divider')
      };
      firstShiftedGrouping.setAttribute('data-has-left-divider', 'true');

      const boundaryRow = buttonLayer.querySelector<HTMLElement>('#boundary-buttons-row');
      if (boundaryRow) {
        const rightBoundaryExtension = document.createElement('div');
        rightBoundaryExtension.className = 'buttonGrid-boundary-row-extension';
        rightBoundaryExtension.dataset['rhythmUiElement'] = 'tonic-right-boundary-preview';
        rightBoundaryExtension.dataset['style'] = firstShiftedGrouping.dataset['prevBoundaryStyle'] || 'solid';
        rightBoundaryExtension.style.left = `${insertionLeft + insertionWidth}px`;
        rightBoundaryExtension.setAttribute('aria-hidden', 'true');
        boundaryRow.appendChild(rightBoundaryExtension);
        this.buttonGridRightBoundaryExtension = rightBoundaryExtension;
      }
    }

    const spacer = document.createElement('div');
    spacer.setAttribute('aria-hidden', 'true');
    spacer.style.position = 'absolute';
    spacer.style.left = `${insertionLeft}px`;
    spacer.style.top = '0';
    spacer.style.bottom = '0';
    spacer.style.width = `${insertionWidth}px`;
    spacer.style.boxSizing = 'border-box';
    spacer.style.backgroundColor = getOpaqueBackgroundColor(buttonLayer);
    spacer.style.pointerEvents = 'none';
    spacer.style.zIndex = '0';
    buttonLayer.appendChild(spacer);

    this.buttonGridSpacer = spacer;
    this.buttonPreviewInsertionX = insertionX;
    this.buttonPreviewInsertionWidth = insertionWidth;
  }

  private restoreButtonGrid(): void {
    this.buttonGridMutations.forEach(({ element, originalLeft }) => {
      element.style.left = originalLeft;
    });
    this.buttonGridMutations = [];
    if (this.buttonGridDividerMutation) {
      const { element, originalHasLeftDivider } = this.buttonGridDividerMutation;
      if (originalHasLeftDivider === null) {
        element.removeAttribute('data-has-left-divider');
      } else {
        element.setAttribute('data-has-left-divider', originalHasLeftDivider);
      }
    }
    this.buttonGridDividerMutation = null;
    this.buttonGridRightBoundaryExtension?.remove();
    this.buttonGridRightBoundaryExtension = null;
    this.buttonGridSpacer?.remove();
    this.buttonGridSpacer = null;
    this.buttonPreviewInsertionX = null;
    this.buttonPreviewInsertionWidth = null;
  }

  private expandPreviewCanvas(context: CanvasRenderingContext2D, targetLogicalWidth: number): void {
    const canvas = context.canvas;
    if (!this.canvasSizeRestoreStates.has(canvas)) {
      this.canvasSizeRestoreStates.set(canvas, {
        context,
        logicalWidth: getLogicalCanvasWidth(canvas),
        logicalHeight: getLogicalCanvasHeight(canvas),
        pixelRatio: getCanvasPixelRatio(canvas)
      });
    }

    const restoreState = this.canvasSizeRestoreStates.get(canvas)!;
    resizeCanvasForPixelRatio(
      canvas,
      targetLogicalWidth,
      restoreState.logicalHeight,
      restoreState.pixelRatio,
      context
    );
  }

  private ensurePreviewOverflowVisible(): void {
    const targets: Array<{ element: HTMLElement | null; property: string }> = [
      { element: document.getElementById('pitch-grid-wrapper'), property: 'overflow' },
      { element: document.getElementById('pitch-grid-container'), property: 'overflow' },
      { element: document.querySelector<HTMLElement>('.drum-grid-middle-cell'), property: 'overflow' },
      { element: document.getElementById('drum-canvas-wrapper'), property: 'overflow' }
    ];

    targets.forEach(({ element, property }) => {
      if (!element) {
        return;
      }
      this.setTemporaryInlineStyle(element, property, 'visible');
    });
  }

  private expandButtonGridGeometry(insertionWidth: number): void {
    const buttonGrid = document.getElementById('button-grid');
    const middleCell = buttonGrid?.querySelector<HTMLElement>('.button-grid-middle-cell') ?? null;
    if (!buttonGrid || !middleCell || insertionWidth <= 0) {
      return;
    }

    const middleWidth = this.getOriginalPixelWidth(middleCell);
    const totalWidth = this.getOriginalPixelWidth(buttonGrid);
    const expandedMiddleWidth = middleWidth + insertionWidth;
    const expandedTotalWidth = totalWidth + insertionWidth;

    this.setTemporaryInlineStyle(middleCell, 'width', `${expandedMiddleWidth}px`);
    this.setTemporaryInlineStyle(middleCell, 'min-width', `${expandedMiddleWidth}px`);
    this.setTemporaryInlineStyle(middleCell, 'max-width', `${expandedMiddleWidth}px`);
    this.setTemporaryInlineStyle(middleCell, 'flex', `0 0 ${expandedMiddleWidth}px`);

    this.setTemporaryInlineStyle(buttonGrid, 'width', `${expandedTotalWidth}px`);
    this.setTemporaryInlineStyle(buttonGrid, 'min-width', `${expandedTotalWidth}px`);
    this.setTemporaryInlineStyle(buttonGrid, 'max-width', `${expandedTotalWidth}px`);
  }

  private freezeButtonGridResponsiveSizing(): void {
    const buttonLayer = document.getElementById('beat-line-button-layer');
    if (!buttonLayer) {
      return;
    }

    const boundaryRow = buttonLayer.querySelector<HTMLElement>('#boundary-buttons-row');
    const boundaryRowHeight = boundaryRow?.getBoundingClientRect().height ?? 0;
    if (boundaryRowHeight > 0) {
      this.setTemporaryInlineStyle(buttonLayer, '--boundary-row-height', `${boundaryRowHeight}px`);
    }

    buttonLayer.querySelectorAll<HTMLElement>('.grouping-segment, .time-signature-label').forEach(element => {
      const fontSize = window.getComputedStyle(element).fontSize;
      if (fontSize) {
        this.setTemporaryInlineStyle(element, 'font-size', fontSize);
      }
    });

    buttonLayer.querySelectorAll<HTMLElement>('.buttonGrid-ui-button--boundary').forEach(element => {
      const buttonSize = element.getBoundingClientRect().width;
      if (buttonSize > 0) {
        this.setTemporaryInlineStyle(element, '--buttonGrid-ui-button-size', `${buttonSize}px`);
      }
    });
  }

  private getOriginalPixelWidth(element: HTMLElement): number {
    const widthRestoreState = this.inlineStyleRestoreStates.find(state =>
      state.element === element && state.property === 'width'
    );
    const inlineWidth = widthRestoreState?.value || element.style.getPropertyValue('width');
    const parsedWidth = Number.parseFloat(inlineWidth);
    return Number.isFinite(parsedWidth) ? parsedWidth : element.getBoundingClientRect().width;
  }

  private setTemporaryInlineStyle(element: HTMLElement, property: string, value: string): void {
    const alreadyTracked = this.inlineStyleRestoreStates.some(state =>
      state.element === element && state.property === property
    );
    if (!alreadyTracked) {
      this.inlineStyleRestoreStates.push({
        element,
        property,
        value: element.style.getPropertyValue(property),
        priority: element.style.getPropertyPriority(property)
      });
    }
    element.style.setProperty(property, value);
  }

  private restoreRightPitchLegend(): void {
    if (this.rightLegendCanvas) {
      this.rightLegendCanvas.style.transform = this.rightLegendOriginalTransform;
    }
    this.rightLegendCanvas = null;
    this.rightLegendOriginalTransform = '';
    this.rightLegendPreviewWidth = null;
  }

  private restoreInlineStyles(): void {
    this.inlineStyleRestoreStates.forEach(({ element, property, value, priority }) => {
      if (value) {
        element.style.setProperty(property, value, priority);
      } else {
        element.style.removeProperty(property);
      }
    });
    this.inlineStyleRestoreStates = [];
  }

  private restorePreviewCanvasSizes(): void {
    this.canvasSizeRestoreStates.forEach((restoreState, canvas) => {
      resizeCanvasForPixelRatio(
        canvas,
        restoreState.logicalWidth,
        restoreState.logicalHeight,
        restoreState.pixelRatio,
        restoreState.context
      );
    });
    this.canvasSizeRestoreStates.clear();
  }
}

export default new TonicInsertionPreviewService();
