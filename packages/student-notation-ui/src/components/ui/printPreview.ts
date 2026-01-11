// js/components/UI/printPreview.ts
import store from '@state/initStore.ts';
import PrintService from '@services/printService.ts';
import type { PrintOptions } from '../../../types/state.js';

const CANVAS_FRAME_PADDING = 16;

interface CropState {
  pageWidth: number;
  pageHeight: number;
  contentTop: number;
  contentLeft: number;
  contentHeight: number;
  contentWidth: number;
  cropTopY: number;
  cropBottomY: number;
  cropLeftX: number;
  cropRightX: number;
}

type DragHandle = 'top' | 'bottom' | 'left' | 'right' | null;

type ToggleKeys =
  | 'orientation'
  | 'colorMode'
  | 'includeButtonGrid'
  | 'includeDrums'
  | 'includeLeftLegend'
  | 'includeRightLegend';
interface ToggleValueMap {
  orientation: PrintOptions['orientation'];
  colorMode: PrintOptions['colorMode'];
  includeButtonGrid: PrintOptions['includeButtonGrid'];
  includeDrums: PrintOptions['includeDrums'];
  includeLeftLegend: PrintOptions['includeLeftLegend'];
  includeRightLegend: PrintOptions['includeRightLegend'];
}

const PAPER_SIZES_IN: Record<PrintOptions['pageSize'], { width: number; height: number }> = {
  letter: { width: 8.5, height: 11 },
  '11x14': { width: 11, height: 14 },
  '11x17': { width: 11, height: 17 }
};

class PrintPreviewController {
  overlay: HTMLElement | null = null;
  canvas: HTMLCanvasElement | null = null;
  ctx: CanvasRenderingContext2D | null = null;
  cropOverlay: HTMLCanvasElement | null = null;
  cropCtx: CanvasRenderingContext2D | null = null;
  canvasWrapper: HTMLElement | null = null;
  pageSizeSelect: HTMLSelectElement | null = null;
  orientationBtn: HTMLElement | null = null;
  colorBtn: HTMLElement | null = null;
  buttonGridBtn: HTMLElement | null = null;
  drumsBtn: HTMLElement | null = null;
  leftLegendBtn: HTMLElement | null = null;
  rightLegendBtn: HTMLElement | null = null;
  isDragging = false;
  dragHandle: DragHandle = null;
  handleSize = 20;
  handlePadding = 5;
  cropState: CropState | null = null;

  init(): void {
    this.overlay = document.getElementById('print-preview-overlay');
    this.canvas = document.getElementById('print-preview-canvas') as HTMLCanvasElement | null;
    this.ctx = this.canvas?.getContext('2d') ?? null;
    this.cropOverlay = document.getElementById('print-crop-overlay') as HTMLCanvasElement | null;
    this.cropCtx = this.cropOverlay?.getContext('2d') ?? null;
    this.canvasWrapper = (this.canvas?.parentElement as HTMLElement | null) ?? null;

    this.pageSizeSelect = document.getElementById('print-page-size') as HTMLSelectElement | null;
    this.orientationBtn = document.getElementById('print-orientation-toggle');
    this.colorBtn = document.getElementById('print-color-mode-toggle');
    this.buttonGridBtn = document.getElementById('print-button-grid-toggle');
    this.drumsBtn = document.getElementById('print-drum-grid-toggle');
    this.leftLegendBtn = document.getElementById('print-left-legend-toggle');
    this.rightLegendBtn = document.getElementById('print-right-legend-toggle');

    document.getElementById('print-close-button')?.addEventListener('click', () => this.hide());
    document.getElementById('print-confirm-button')?.addEventListener('click', () => {
      void PrintService.generateAndPrint();
      this.hide();
    });

    this.orientationBtn?.addEventListener('click', () => this.handleToggle('orientation', ['landscape', 'portrait']));
    this.colorBtn?.addEventListener('click', () => this.handleToggle('colorMode', ['color', 'bw']));
    this.buttonGridBtn?.addEventListener('click', () => this.handleToggle('includeButtonGrid', [true, false]));
    this.drumsBtn?.addEventListener('click', () => this.handleToggle('includeDrums', [true, false]));
    this.leftLegendBtn?.addEventListener('click', () => this.handleToggle('includeLeftLegend', [true, false]));
    this.rightLegendBtn?.addEventListener('click', () => this.handleToggle('includeRightLegend', [true, false]));

    this.pageSizeSelect?.addEventListener('change', () => {
      if (!this.pageSizeSelect) {return;}
      const pageSize = this.pageSizeSelect.value as PrintOptions['pageSize'];
      if (!(pageSize in PAPER_SIZES_IN)) {return;}
      store.setPrintOptions({ pageSize });
    });

    this.cropOverlay?.addEventListener('mousedown', (e) => this.onCropMouseDown(e));
    this.cropOverlay?.addEventListener('mousemove', (e) => this.onCropMouseMove(e));
    this.cropOverlay?.addEventListener('mouseup', () => this.onCropMouseUp());
    this.cropOverlay?.addEventListener('mouseleave', () => this.onCropMouseUp());

    store.on('printPreviewStateChanged', (isActive?: boolean) => {
      if (typeof isActive !== 'boolean') {return;}
      if (isActive) {
        this.show();
      } else {
        this.hide();
      }
    });
    store.on('printOptionsChanged', () => {
      void this.render();
    });
    store.on('notesChanged', () => {
      if (store.state.isPrintPreviewActive) {
        void this.render();
      }
    });

    if (this.canvasWrapper) {
      const observer = new ResizeObserver(() => {
        if (store.state.isPrintPreviewActive) {
          void this.render();
        }
      });
      observer.observe(this.canvasWrapper);
    }
  }

  show(): void {
    if (!store.state.isPrintPreviewActive) {
      store.setPrintPreviewActive(true);
    }
    this.overlay?.classList.remove('hidden');

    const isVisible = (el: HTMLElement | null): boolean => {
      if (!el) {return false;}
      return getComputedStyle(el).display !== 'none';
    };

    const rawPageSize = (store.state.printOptions as Partial<PrintOptions>).pageSize;
    const pageSize: PrintOptions['pageSize'] = (rawPageSize && rawPageSize in PAPER_SIZES_IN)
      ? rawPageSize
      : 'letter';

    const includeButtonGrid = isVisible(document.getElementById('button-grid'));
    const includeDrums = isVisible(document.getElementById('drum-grid-wrapper'));
    const includeLeftLegend = isVisible(document.getElementById('legend-left-canvas'));
    const includeRightLegend = isVisible(document.getElementById('legend-right-canvas'));

    store.setPrintOptions({
      pageSize,
      cropTop: 0,
      cropBottom: 1,
      cropLeft: 0,
      cropRight: 1,
      includeButtonGrid,
      includeDrums,
      includeLeftLegend,
      includeRightLegend
    });

    if (includeButtonGrid) {
      void PrintService.prefetchButtonGridSnapshot(includeLeftLegend, includeRightLegend);
    }
    void this.render();
  }

  hide(): void {
    if (store.state.isPrintPreviewActive) {
      store.setPrintPreviewActive(false);
    }
    this.overlay?.classList.add('hidden');
  }

  handleToggle<K extends ToggleKeys>(optionKey: K, values: [ToggleValueMap[K], ToggleValueMap[K]]): void {
    const currentVal = store.state.printOptions[optionKey];
    const nextVal = currentVal === values[0] ? values[1] : values[0];
    store.setPrintOptions({ [optionKey]: nextVal } as Partial<PrintOptions>);
  }

  updateControls(): void {
    const buttons = [this.orientationBtn, this.colorBtn, this.buttonGridBtn, this.drumsBtn, this.leftLegendBtn, this.rightLegendBtn];
    if (buttons.some(btn => btn === null)) {return;}

    const rawPageSize = (store.state.printOptions as Partial<PrintOptions>).pageSize;
    const pageSize: PrintOptions['pageSize'] = (rawPageSize && rawPageSize in PAPER_SIZES_IN)
      ? rawPageSize
      : 'letter';
    const {
      orientation,
      colorMode,
      includeButtonGrid,
      includeDrums,
      includeLeftLegend,
      includeRightLegend
    } = store.state.printOptions;

    if (this.pageSizeSelect) {
      this.pageSizeSelect.value = pageSize;
    }

    if (this.orientationBtn) {
      this.orientationBtn.textContent = orientation.charAt(0).toUpperCase() + orientation.slice(1);
    }
    if (this.colorBtn) {
      this.colorBtn.textContent = colorMode === 'color' ? 'Color' : 'B&W';
      this.colorBtn.classList.toggle('active', colorMode === 'color');
    }
    if (this.buttonGridBtn) {
      this.buttonGridBtn.textContent = includeButtonGrid ? 'Include' : 'Exclude';
      this.buttonGridBtn.classList.toggle('active', includeButtonGrid);
    }
    if (this.drumsBtn) {
      this.drumsBtn.textContent = includeDrums ? 'Include' : 'Exclude';
      this.drumsBtn.classList.toggle('active', includeDrums);
    }
    if (this.leftLegendBtn) {
      this.leftLegendBtn.textContent = includeLeftLegend ? 'Include' : 'Exclude';
      this.leftLegendBtn.classList.toggle('active', includeLeftLegend);
    }
    if (this.rightLegendBtn) {
      this.rightLegendBtn.textContent = includeRightLegend ? 'Include' : 'Exclude';
      this.rightLegendBtn.classList.toggle('active', includeRightLegend);
    }
  }

  async render(): Promise<void> {
    if (!store.state.isPrintPreviewActive) {return;}
    if (!this.canvas || !this.ctx) {return;}

    this.updateControls();

    const wrapperWidth = this.canvasWrapper?.clientWidth ?? 0;
    const wrapperHeight = this.canvasWrapper?.clientHeight ?? 0;
    if (wrapperWidth === 0 || wrapperHeight === 0) {return;}

    const { orientation } = store.state.printOptions;
    const rawPageSize = (store.state.printOptions as Partial<PrintOptions>).pageSize;
    const pageSize: PrintOptions['pageSize'] = (rawPageSize && rawPageSize in PAPER_SIZES_IN)
      ? rawPageSize
      : 'letter';
    const basePaper = PAPER_SIZES_IN[pageSize];
    const paperWidthInches = (orientation === 'landscape' ? basePaper.height : basePaper.width);
    const paperHeightInches = (orientation === 'landscape' ? basePaper.width : basePaper.height);
    const marginInches = 0.25;

    const pageAspectRatio = paperWidthInches / paperHeightInches;
    const framePadding = CANVAS_FRAME_PADDING * 2;

    let pageDisplayWidth = Math.max(wrapperWidth - framePadding, 100);
    let pageDisplayHeight = Math.max(wrapperHeight - framePadding, 100);

    if (pageDisplayWidth / pageDisplayHeight > pageAspectRatio) {
      pageDisplayWidth = pageDisplayHeight * pageAspectRatio;
    } else {
      pageDisplayHeight = pageDisplayWidth / pageAspectRatio;
    }

    const marginDisplaySize = (marginInches / paperWidthInches) * pageDisplayWidth;
    const printableDisplayWidth = pageDisplayWidth - (2 * marginDisplaySize);
    const printableDisplayHeight = pageDisplayHeight - (2 * marginDisplaySize);

    const previewPrintOptions: PrintOptions = {
      ...store.state.printOptions,
      cropTop: 0,
      cropBottom: 1,
      cropLeft: 0,
      cropRight: 1
    };

    const scoreCanvas = await PrintService.generateScoreCanvas(previewPrintOptions, {
      width: printableDisplayWidth,
      height: printableDisplayHeight
    });

    if (!scoreCanvas) {return;}

    this.canvas.width = pageDisplayWidth;
    this.canvas.height = pageDisplayHeight;

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(0, 0, pageDisplayWidth, pageDisplayHeight);

    this.ctx.strokeStyle = '#E0E0E0';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(marginDisplaySize, marginDisplaySize, printableDisplayWidth, printableDisplayHeight);

    const scoreX = marginDisplaySize + Math.max(0, (printableDisplayWidth - scoreCanvas.width) / 2);
    const scoreY = marginDisplaySize + Math.max(0, (printableDisplayHeight - scoreCanvas.height) / 2);
    this.ctx.drawImage(scoreCanvas, scoreX, scoreY);
    this.drawCornerMarks(marginDisplaySize, printableDisplayWidth, printableDisplayHeight);
    this.renderCropOverlay(pageDisplayWidth, pageDisplayHeight, {
      contentTop: scoreY,
      contentLeft: scoreX,
      contentWidth: scoreCanvas.width,
      contentHeight: scoreCanvas.height
    });
  }

  private drawCornerMarks(marginDisplaySize: number, printableDisplayWidth: number, printableDisplayHeight: number): void {
    if (!this.ctx) {return;}
    this.ctx.strokeStyle = '#CCCCCC';
    this.ctx.lineWidth = 1;
    const markLength = 10;
    const rightX = marginDisplaySize + printableDisplayWidth;
    const bottomY = marginDisplaySize + printableDisplayHeight;

    this.ctx.beginPath();
    this.ctx.moveTo(marginDisplaySize, marginDisplaySize - markLength);
    this.ctx.lineTo(marginDisplaySize, marginDisplaySize + markLength);
    this.ctx.moveTo(marginDisplaySize - markLength, marginDisplaySize);
    this.ctx.lineTo(marginDisplaySize + markLength, marginDisplaySize);

    this.ctx.moveTo(rightX, marginDisplaySize - markLength);
    this.ctx.lineTo(rightX, marginDisplaySize + markLength);
    this.ctx.moveTo(rightX - markLength, marginDisplaySize);
    this.ctx.lineTo(rightX + markLength, marginDisplaySize);

    this.ctx.moveTo(marginDisplaySize, bottomY - markLength);
    this.ctx.lineTo(marginDisplaySize, bottomY + markLength);
    this.ctx.moveTo(marginDisplaySize - markLength, bottomY);
    this.ctx.lineTo(marginDisplaySize + markLength, bottomY);

    this.ctx.moveTo(rightX, bottomY - markLength);
    this.ctx.lineTo(rightX, bottomY + markLength);
    this.ctx.moveTo(rightX - markLength, bottomY);
    this.ctx.lineTo(rightX + markLength, bottomY);
    this.ctx.stroke();
  }

  private renderCropOverlay(
    pageWidth: number,
    pageHeight: number,
    contentRect: { contentTop: number; contentLeft: number; contentWidth: number; contentHeight: number }
  ): void {
    const canvasRect = this.canvas?.getBoundingClientRect();
    const wrapperRect = this.canvasWrapper?.getBoundingClientRect();

    if (!canvasRect || !wrapperRect || !this.cropOverlay || !this.cropCtx) {return;}

    this.cropOverlay.width = pageWidth;
    this.cropOverlay.height = pageHeight;
    this.cropOverlay.style.left = `${canvasRect.left - wrapperRect.left}px`;
    this.cropOverlay.style.top = `${canvasRect.top - wrapperRect.top}px`;
    this.cropOverlay.style.width = `${pageWidth}px`;
    this.cropOverlay.style.height = `${pageHeight}px`;

    const { cropTop, cropBottom, cropLeft, cropRight } = store.state.printOptions;

    const { contentTop, contentLeft, contentHeight, contentWidth } = contentRect;

    const cropTopY = contentTop + (cropTop * contentHeight);
    const cropBottomY = contentTop + (cropBottom * contentHeight);
    const cropLeftX = contentLeft + (cropLeft * contentWidth);
    const cropRightX = contentLeft + (cropRight * contentWidth);
    const contentBottom = contentTop + contentHeight;
    const contentRight = contentLeft + contentWidth;

    this.cropCtx.clearRect(0, 0, pageWidth, pageHeight);
    this.cropCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';

    if (cropTop > 0) {
      this.cropCtx.fillRect(contentLeft, contentTop, contentWidth, cropTopY - contentTop);
    }

    if (cropBottom < 1) {
      this.cropCtx.fillRect(contentLeft, cropBottomY, contentWidth, contentBottom - cropBottomY);
    }

    if (cropLeft > 0) {
      this.cropCtx.fillRect(contentLeft, cropTopY, cropLeftX - contentLeft, cropBottomY - cropTopY);
    }

    if (cropRight < 1) {
      this.cropCtx.fillRect(cropRightX, cropTopY, contentRight - cropRightX, cropBottomY - cropTopY);
    }

    this.drawVerticalHandle(cropTopY, contentLeft, contentRight, 'top');
    this.drawVerticalHandle(cropBottomY, contentLeft, contentRight, 'bottom');
    this.drawHorizontalHandle(cropLeftX, contentTop, contentBottom, 'left');
    this.drawHorizontalHandle(cropRightX, contentTop, contentBottom, 'right');

    this.cropState = {
      pageWidth,
      pageHeight,
      contentTop,
      contentLeft,
      contentHeight,
      contentWidth,
      cropTopY,
      cropBottomY,
      cropLeftX,
      cropRightX
    };
  }

  private drawVerticalHandle(y: number, contentLeft: number, contentRight: number, handle: Exclude<DragHandle, 'left' | 'right' | null>): void {
    if (!this.cropCtx) {return;}
    const handleWidth = 60;
    const contentWidth = contentRight - contentLeft;
    const handleX = contentLeft + (contentWidth - handleWidth) / 2;
    const handleY = handle === 'top'
      ? y - this.handleSize - 4
      : y + 4;

    this.cropCtx.fillStyle = '#4a90e2';
    this.cropCtx.fillRect(contentLeft, y - 1, contentWidth, 2);
    this.cropCtx.fillRect(handleX, handleY, handleWidth, this.handleSize);

    this.cropCtx.strokeStyle = '#FFFFFF';
    this.cropCtx.lineWidth = 2;
    this.cropCtx.strokeRect(handleX, handleY, handleWidth, this.handleSize);

    this.cropCtx.strokeStyle = '#FFFFFF';
    this.cropCtx.lineWidth = 1;
    const gripCount = 3;
    const gripSpacing = 6;
    const gripLength = 30;
    const gripStartX = contentLeft + (contentWidth - gripLength) / 2;

    for (let i = 0; i < gripCount; i++) {
      const gripY = handleY + (this.handleSize / 2) + (i - 1) * gripSpacing;
      this.cropCtx.beginPath();
      this.cropCtx.moveTo(gripStartX, gripY);
      this.cropCtx.lineTo(gripStartX + gripLength, gripY);
      this.cropCtx.stroke();
    }
  }

  private drawHorizontalHandle(x: number, contentTop: number, contentBottom: number, handle: Exclude<DragHandle, 'top' | 'bottom' | null>): void {
    if (!this.cropCtx) {return;}
    const handleHeight = 60;
    const contentHeight = contentBottom - contentTop;
    const handleY = contentTop + (contentHeight - handleHeight) / 2;
    const handleX = handle === 'left'
      ? x - this.handleSize - 4
      : x + 4;

    this.cropCtx.fillStyle = '#4a90e2';
    this.cropCtx.fillRect(x - 1, contentTop, 2, contentHeight);
    this.cropCtx.fillRect(handleX, handleY, this.handleSize, handleHeight);

    this.cropCtx.strokeStyle = '#FFFFFF';
    this.cropCtx.lineWidth = 2;
    this.cropCtx.strokeRect(handleX, handleY, this.handleSize, handleHeight);

    this.cropCtx.strokeStyle = '#FFFFFF';
    this.cropCtx.lineWidth = 1;
    const gripCount = 3;
    const gripSpacing = 6;
    const gripLength = 30;
    const gripStartY = contentTop + (contentHeight - gripLength) / 2;

    for (let i = 0; i < gripCount; i++) {
      const gripX = handleX + (this.handleSize / 2) + (i - 1) * gripSpacing;
      this.cropCtx.beginPath();
      this.cropCtx.moveTo(gripX, gripStartY);
      this.cropCtx.lineTo(gripX, gripStartY + gripLength);
      this.cropCtx.stroke();
    }
  }

  private onCropMouseDown(event: MouseEvent): void {
    if (!this.cropState || !this.cropOverlay) {return;}
    const rect = this.cropOverlay.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const withinX = x >= this.cropState.contentLeft && x <= this.cropState.contentLeft + this.cropState.contentWidth;
    const withinY = y >= this.cropState.contentTop && y <= this.cropState.contentTop + this.cropState.contentHeight;

    const nearTop = withinX && Math.abs(y - this.cropState.cropTopY) < this.handleSize + this.handlePadding;
    const nearBottom = withinX && Math.abs(y - this.cropState.cropBottomY) < this.handleSize + this.handlePadding;
    const nearLeft = withinY && Math.abs(x - this.cropState.cropLeftX) < this.handleSize + this.handlePadding;
    const nearRight = withinY && Math.abs(x - this.cropState.cropRightX) < this.handleSize + this.handlePadding;

    if (nearTop) {
      this.isDragging = true;
      this.dragHandle = 'top';
      this.cropOverlay.style.cursor = 'ns-resize';
    } else if (nearBottom) {
      this.isDragging = true;
      this.dragHandle = 'bottom';
      this.cropOverlay.style.cursor = 'ns-resize';
    } else if (nearLeft) {
      this.isDragging = true;
      this.dragHandle = 'left';
      this.cropOverlay.style.cursor = 'ew-resize';
    } else if (nearRight) {
      this.isDragging = true;
      this.dragHandle = 'right';
      this.cropOverlay.style.cursor = 'ew-resize';
    }
  }

  private onCropMouseMove(event: MouseEvent): void {
    if (!this.cropState || !this.cropOverlay) {return;}
    const rect = this.cropOverlay.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (this.isDragging && this.dragHandle) {
      this.handleCropDrag(x, y);
      return;
    }

    const withinX = x >= this.cropState.contentLeft && x <= this.cropState.contentLeft + this.cropState.contentWidth;
    const withinY = y >= this.cropState.contentTop && y <= this.cropState.contentTop + this.cropState.contentHeight;

    const isNearTop = withinX && Math.abs(y - this.cropState.cropTopY) < this.handleSize + this.handlePadding;
    const isNearBottom = withinX && Math.abs(y - this.cropState.cropBottomY) < this.handleSize + this.handlePadding;
    const isNearLeft = withinY && Math.abs(x - this.cropState.cropLeftX) < this.handleSize + this.handlePadding;
    const isNearRight = withinY && Math.abs(x - this.cropState.cropRightX) < this.handleSize + this.handlePadding;

    if (isNearTop || isNearBottom) {
      this.cropOverlay.style.cursor = 'ns-resize';
    } else if (isNearLeft || isNearRight) {
      this.cropOverlay.style.cursor = 'ew-resize';
    } else {
      this.cropOverlay.style.cursor = 'default';
    }
  }

  private handleCropDrag(x: number, y: number): void {
    if (!this.cropState) {return;}
    const { contentTop, contentLeft, contentHeight, contentWidth } = this.cropState;
    const minRange = 0.05;

    if (this.dragHandle === 'top') {
      const normalized = Math.max(0, Math.min(1, (y - contentTop) / contentHeight));
      const currentBottom = store.state.printOptions.cropBottom;
      if (normalized < currentBottom - minRange) {
        store.setPrintOptions({ cropTop: normalized });
      }
    } else if (this.dragHandle === 'bottom') {
      const normalized = Math.max(0, Math.min(1, (y - contentTop) / contentHeight));
      const currentTop = store.state.printOptions.cropTop;
      if (normalized > currentTop + minRange) {
        store.setPrintOptions({ cropBottom: normalized });
      }
    } else if (this.dragHandle === 'left') {
      const normalized = Math.max(0, Math.min(1, (x - contentLeft) / contentWidth));
      const currentRight = store.state.printOptions.cropRight;
      if (normalized < currentRight - minRange) {
        store.setPrintOptions({ cropLeft: normalized });
      }
    } else if (this.dragHandle === 'right') {
      const normalized = Math.max(0, Math.min(1, (x - contentLeft) / contentWidth));
      const currentLeft = store.state.printOptions.cropLeft;
      if (normalized > currentLeft + minRange) {
        store.setPrintOptions({ cropRight: normalized });
      }
    }
  }

  private onCropMouseUp(): void {
    this.isDragging = false;
    this.dragHandle = null;
    if (this.cropOverlay) {
      this.cropOverlay.style.cursor = 'default';
    }
  }
}

const PrintPreview = new PrintPreviewController();
export default PrintPreview;
