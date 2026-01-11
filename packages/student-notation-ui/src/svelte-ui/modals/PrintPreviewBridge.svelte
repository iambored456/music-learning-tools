<script lang="ts">
  /**
   * PrintPreviewBridge - Headless Svelte component
   *
   * This component manages the print preview modal:
   * - Show/hide overlay
   * - Page size, orientation, color mode controls
   * - Include/exclude toggles for button grid, drums, legends
   * - Crop handles for adjusting print area
   * - Canvas rendering for preview
   *
   * This replaces: src/components/ui/printPreview.ts
   */
  import { onMount, onDestroy } from 'svelte';
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

  // DOM references
  let overlay: HTMLElement | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let cropOverlay: HTMLCanvasElement | null = null;
  let cropCtx: CanvasRenderingContext2D | null = null;
  let canvasWrapper: HTMLElement | null = null;
  let pageSizeSelect: HTMLSelectElement | null = null;
  let orientationBtn: HTMLElement | null = null;
  let colorBtn: HTMLElement | null = null;
  let buttonGridBtn: HTMLElement | null = null;
  let drumsBtn: HTMLElement | null = null;
  let leftLegendBtn: HTMLElement | null = null;
  let rightLegendBtn: HTMLElement | null = null;

  // State
  let isDragging = $state(false);
  let dragHandle = $state<DragHandle>(null);
  const handleSize = 20;
  const handlePadding = 5;
  let cropState: CropState | null = null;
  let resizeObserver: ResizeObserver | null = null;

  function show(): void {
    if (!store.state.isPrintPreviewActive) {
      store.setPrintPreviewActive(true);
    }
    overlay?.classList.remove('hidden');

    const isVisible = (el: HTMLElement | null): boolean => {
      if (!el) return false;
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
    void render();
  }

  function hide(): void {
    if (store.state.isPrintPreviewActive) {
      store.setPrintPreviewActive(false);
    }
    overlay?.classList.add('hidden');
  }

  function handleToggle<K extends ToggleKeys>(optionKey: K, values: [ToggleValueMap[K], ToggleValueMap[K]]): void {
    const currentVal = store.state.printOptions[optionKey];
    const nextVal = currentVal === values[0] ? values[1] : values[0];
    store.setPrintOptions({ [optionKey]: nextVal } as Partial<PrintOptions>);
  }

  function updateControls(): void {
    const buttons = [orientationBtn, colorBtn, buttonGridBtn, drumsBtn, leftLegendBtn, rightLegendBtn];
    if (buttons.some(btn => btn === null)) return;

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

    if (pageSizeSelect) {
      pageSizeSelect.value = pageSize;
    }

    if (orientationBtn) {
      orientationBtn.textContent = orientation.charAt(0).toUpperCase() + orientation.slice(1);
    }
    if (colorBtn) {
      colorBtn.textContent = colorMode === 'color' ? 'Color' : 'B&W';
      colorBtn.classList.toggle('active', colorMode === 'color');
    }
    if (buttonGridBtn) {
      buttonGridBtn.textContent = includeButtonGrid ? 'Include' : 'Exclude';
      buttonGridBtn.classList.toggle('active', includeButtonGrid);
    }
    if (drumsBtn) {
      drumsBtn.textContent = includeDrums ? 'Include' : 'Exclude';
      drumsBtn.classList.toggle('active', includeDrums);
    }
    if (leftLegendBtn) {
      leftLegendBtn.textContent = includeLeftLegend ? 'Include' : 'Exclude';
      leftLegendBtn.classList.toggle('active', includeLeftLegend);
    }
    if (rightLegendBtn) {
      rightLegendBtn.textContent = includeRightLegend ? 'Include' : 'Exclude';
      rightLegendBtn.classList.toggle('active', includeRightLegend);
    }
  }

  async function render(): Promise<void> {
    if (!store.state.isPrintPreviewActive) return;
    if (!canvas || !ctx) return;

    updateControls();

    const wrapperWidth = canvasWrapper?.clientWidth ?? 0;
    const wrapperHeight = canvasWrapper?.clientHeight ?? 0;
    if (wrapperWidth === 0 || wrapperHeight === 0) return;

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

    if (!scoreCanvas) return;

    canvas.width = pageDisplayWidth;
    canvas.height = pageDisplayHeight;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, pageDisplayWidth, pageDisplayHeight);

    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 1;
    ctx.strokeRect(marginDisplaySize, marginDisplaySize, printableDisplayWidth, printableDisplayHeight);

    const scoreX = marginDisplaySize + Math.max(0, (printableDisplayWidth - scoreCanvas.width) / 2);
    const scoreY = marginDisplaySize + Math.max(0, (printableDisplayHeight - scoreCanvas.height) / 2);
    ctx.drawImage(scoreCanvas, scoreX, scoreY);
    drawCornerMarks(marginDisplaySize, printableDisplayWidth, printableDisplayHeight);
    renderCropOverlay(pageDisplayWidth, pageDisplayHeight, {
      contentTop: scoreY,
      contentLeft: scoreX,
      contentWidth: scoreCanvas.width,
      contentHeight: scoreCanvas.height
    });
  }

  function drawCornerMarks(marginDisplaySize: number, printableDisplayWidth: number, printableDisplayHeight: number): void {
    if (!ctx) return;
    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 1;
    const markLength = 10;
    const rightX = marginDisplaySize + printableDisplayWidth;
    const bottomY = marginDisplaySize + printableDisplayHeight;

    ctx.beginPath();
    ctx.moveTo(marginDisplaySize, marginDisplaySize - markLength);
    ctx.lineTo(marginDisplaySize, marginDisplaySize + markLength);
    ctx.moveTo(marginDisplaySize - markLength, marginDisplaySize);
    ctx.lineTo(marginDisplaySize + markLength, marginDisplaySize);

    ctx.moveTo(rightX, marginDisplaySize - markLength);
    ctx.lineTo(rightX, marginDisplaySize + markLength);
    ctx.moveTo(rightX - markLength, marginDisplaySize);
    ctx.lineTo(rightX + markLength, marginDisplaySize);

    ctx.moveTo(marginDisplaySize, bottomY - markLength);
    ctx.lineTo(marginDisplaySize, bottomY + markLength);
    ctx.moveTo(marginDisplaySize - markLength, bottomY);
    ctx.lineTo(marginDisplaySize + markLength, bottomY);

    ctx.moveTo(rightX, bottomY - markLength);
    ctx.lineTo(rightX, bottomY + markLength);
    ctx.moveTo(rightX - markLength, bottomY);
    ctx.lineTo(rightX + markLength, bottomY);
    ctx.stroke();
  }

  function renderCropOverlay(
    pageWidth: number,
    pageHeight: number,
    contentRect: { contentTop: number; contentLeft: number; contentWidth: number; contentHeight: number }
  ): void {
    const canvasRect = canvas?.getBoundingClientRect();
    const wrapperRect = canvasWrapper?.getBoundingClientRect();

    if (!canvasRect || !wrapperRect || !cropOverlay || !cropCtx) return;

    cropOverlay.width = pageWidth;
    cropOverlay.height = pageHeight;
    cropOverlay.style.left = `${canvasRect.left - wrapperRect.left}px`;
    cropOverlay.style.top = `${canvasRect.top - wrapperRect.top}px`;
    cropOverlay.style.width = `${pageWidth}px`;
    cropOverlay.style.height = `${pageHeight}px`;

    const { cropTop, cropBottom, cropLeft, cropRight } = store.state.printOptions;

    const { contentTop, contentLeft, contentHeight, contentWidth } = contentRect;

    const cropTopY = contentTop + (cropTop * contentHeight);
    const cropBottomY = contentTop + (cropBottom * contentHeight);
    const cropLeftX = contentLeft + (cropLeft * contentWidth);
    const cropRightX = contentLeft + (cropRight * contentWidth);
    const contentBottom = contentTop + contentHeight;
    const contentRight = contentLeft + contentWidth;

    cropCtx.clearRect(0, 0, pageWidth, pageHeight);
    cropCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';

    if (cropTop > 0) {
      cropCtx.fillRect(contentLeft, contentTop, contentWidth, cropTopY - contentTop);
    }

    if (cropBottom < 1) {
      cropCtx.fillRect(contentLeft, cropBottomY, contentWidth, contentBottom - cropBottomY);
    }

    if (cropLeft > 0) {
      cropCtx.fillRect(contentLeft, cropTopY, cropLeftX - contentLeft, cropBottomY - cropTopY);
    }

    if (cropRight < 1) {
      cropCtx.fillRect(cropRightX, cropTopY, contentRight - cropRightX, cropBottomY - cropTopY);
    }

    drawVerticalHandle(cropTopY, contentLeft, contentRight, 'top');
    drawVerticalHandle(cropBottomY, contentLeft, contentRight, 'bottom');
    drawHorizontalHandle(cropLeftX, contentTop, contentBottom, 'left');
    drawHorizontalHandle(cropRightX, contentTop, contentBottom, 'right');

    cropState = {
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

  function drawVerticalHandle(y: number, contentLeft: number, contentRight: number, handle: Exclude<DragHandle, 'left' | 'right' | null>): void {
    if (!cropCtx) return;
    const handleWidth = 60;
    const contentWidth = contentRight - contentLeft;
    const handleX = contentLeft + (contentWidth - handleWidth) / 2;
    const handleY = handle === 'top'
      ? y - handleSize - 4
      : y + 4;

    cropCtx.fillStyle = '#4a90e2';
    cropCtx.fillRect(contentLeft, y - 1, contentWidth, 2);
    cropCtx.fillRect(handleX, handleY, handleWidth, handleSize);

    cropCtx.strokeStyle = '#FFFFFF';
    cropCtx.lineWidth = 2;
    cropCtx.strokeRect(handleX, handleY, handleWidth, handleSize);

    cropCtx.strokeStyle = '#FFFFFF';
    cropCtx.lineWidth = 1;
    const gripCount = 3;
    const gripSpacing = 6;
    const gripLength = 30;
    const gripStartX = contentLeft + (contentWidth - gripLength) / 2;

    for (let i = 0; i < gripCount; i++) {
      const gripY = handleY + (handleSize / 2) + (i - 1) * gripSpacing;
      cropCtx.beginPath();
      cropCtx.moveTo(gripStartX, gripY);
      cropCtx.lineTo(gripStartX + gripLength, gripY);
      cropCtx.stroke();
    }
  }

  function drawHorizontalHandle(x: number, contentTop: number, contentBottom: number, handle: Exclude<DragHandle, 'top' | 'bottom' | null>): void {
    if (!cropCtx) return;
    const handleHeight = 60;
    const contentHeight = contentBottom - contentTop;
    const handleY = contentTop + (contentHeight - handleHeight) / 2;
    const handleX = handle === 'left'
      ? x - handleSize - 4
      : x + 4;

    cropCtx.fillStyle = '#4a90e2';
    cropCtx.fillRect(x - 1, contentTop, 2, contentHeight);
    cropCtx.fillRect(handleX, handleY, handleSize, handleHeight);

    cropCtx.strokeStyle = '#FFFFFF';
    cropCtx.lineWidth = 2;
    cropCtx.strokeRect(handleX, handleY, handleSize, handleHeight);

    cropCtx.strokeStyle = '#FFFFFF';
    cropCtx.lineWidth = 1;
    const gripCount = 3;
    const gripSpacing = 6;
    const gripLength = 30;
    const gripStartY = contentTop + (contentHeight - gripLength) / 2;

    for (let i = 0; i < gripCount; i++) {
      const gripX = handleX + (handleSize / 2) + (i - 1) * gripSpacing;
      cropCtx.beginPath();
      cropCtx.moveTo(gripX, gripStartY);
      cropCtx.lineTo(gripX, gripStartY + gripLength);
      cropCtx.stroke();
    }
  }

  function onCropMouseDown(event: MouseEvent): void {
    if (!cropState || !cropOverlay) return;
    const rect = cropOverlay.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const withinX = x >= cropState.contentLeft && x <= cropState.contentLeft + cropState.contentWidth;
    const withinY = y >= cropState.contentTop && y <= cropState.contentTop + cropState.contentHeight;

    const nearTop = withinX && Math.abs(y - cropState.cropTopY) < handleSize + handlePadding;
    const nearBottom = withinX && Math.abs(y - cropState.cropBottomY) < handleSize + handlePadding;
    const nearLeft = withinY && Math.abs(x - cropState.cropLeftX) < handleSize + handlePadding;
    const nearRight = withinY && Math.abs(x - cropState.cropRightX) < handleSize + handlePadding;

    if (nearTop) {
      isDragging = true;
      dragHandle = 'top';
      cropOverlay.style.cursor = 'ns-resize';
    } else if (nearBottom) {
      isDragging = true;
      dragHandle = 'bottom';
      cropOverlay.style.cursor = 'ns-resize';
    } else if (nearLeft) {
      isDragging = true;
      dragHandle = 'left';
      cropOverlay.style.cursor = 'ew-resize';
    } else if (nearRight) {
      isDragging = true;
      dragHandle = 'right';
      cropOverlay.style.cursor = 'ew-resize';
    }
  }

  function onCropMouseMove(event: MouseEvent): void {
    if (!cropState || !cropOverlay) return;
    const rect = cropOverlay.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (isDragging && dragHandle) {
      handleCropDrag(x, y);
      return;
    }

    const withinX = x >= cropState.contentLeft && x <= cropState.contentLeft + cropState.contentWidth;
    const withinY = y >= cropState.contentTop && y <= cropState.contentTop + cropState.contentHeight;

    const isNearTop = withinX && Math.abs(y - cropState.cropTopY) < handleSize + handlePadding;
    const isNearBottom = withinX && Math.abs(y - cropState.cropBottomY) < handleSize + handlePadding;
    const isNearLeft = withinY && Math.abs(x - cropState.cropLeftX) < handleSize + handlePadding;
    const isNearRight = withinY && Math.abs(x - cropState.cropRightX) < handleSize + handlePadding;

    if (isNearTop || isNearBottom) {
      cropOverlay.style.cursor = 'ns-resize';
    } else if (isNearLeft || isNearRight) {
      cropOverlay.style.cursor = 'ew-resize';
    } else {
      cropOverlay.style.cursor = 'default';
    }
  }

  function handleCropDrag(x: number, y: number): void {
    if (!cropState) return;
    const { contentTop, contentLeft, contentHeight, contentWidth } = cropState;
    const minRange = 0.05;

    if (dragHandle === 'top') {
      const normalized = Math.max(0, Math.min(1, (y - contentTop) / contentHeight));
      const currentBottom = store.state.printOptions.cropBottom;
      if (normalized < currentBottom - minRange) {
        store.setPrintOptions({ cropTop: normalized });
      }
    } else if (dragHandle === 'bottom') {
      const normalized = Math.max(0, Math.min(1, (y - contentTop) / contentHeight));
      const currentTop = store.state.printOptions.cropTop;
      if (normalized > currentTop + minRange) {
        store.setPrintOptions({ cropBottom: normalized });
      }
    } else if (dragHandle === 'left') {
      const normalized = Math.max(0, Math.min(1, (x - contentLeft) / contentWidth));
      const currentRight = store.state.printOptions.cropRight;
      if (normalized < currentRight - minRange) {
        store.setPrintOptions({ cropLeft: normalized });
      }
    } else if (dragHandle === 'right') {
      const normalized = Math.max(0, Math.min(1, (x - contentLeft) / contentWidth));
      const currentLeft = store.state.printOptions.cropLeft;
      if (normalized > currentLeft + minRange) {
        store.setPrintOptions({ cropRight: normalized });
      }
    }
  }

  function onCropMouseUp(): void {
    isDragging = false;
    dragHandle = null;
    if (cropOverlay) {
      cropOverlay.style.cursor = 'default';
    }
  }

  // Event handlers for buttons
  function handleCloseClick(): void {
    hide();
  }

  function handleConfirmClick(): void {
    void PrintService.generateAndPrint();
    hide();
  }

  function handleOrientationClick(): void {
    handleToggle('orientation', ['landscape', 'portrait']);
  }

  function handleColorClick(): void {
    handleToggle('colorMode', ['color', 'bw']);
  }

  function handleButtonGridClick(): void {
    handleToggle('includeButtonGrid', [true, false]);
  }

  function handleDrumsClick(): void {
    handleToggle('includeDrums', [true, false]);
  }

  function handleLeftLegendClick(): void {
    handleToggle('includeLeftLegend', [true, false]);
  }

  function handleRightLegendClick(): void {
    handleToggle('includeRightLegend', [true, false]);
  }

  function handlePageSizeChange(): void {
    if (!pageSizeSelect) return;
    const pageSize = pageSizeSelect.value as PrintOptions['pageSize'];
    if (!(pageSize in PAPER_SIZES_IN)) return;
    store.setPrintOptions({ pageSize });
  }

  // Store event handlers
  function handlePrintPreviewStateChanged(isActive: boolean): void {
    if (isActive) {
      show();
    } else {
      hide();
    }
  }

  function handlePrintOptionsChanged(): void {
    void render();
  }

  function handleNotesChanged(): void {
    if (store.state.isPrintPreviewActive) {
      void render();
    }
  }

  onMount(() => {
    overlay = document.getElementById('print-preview-overlay');
    canvas = document.getElementById('print-preview-canvas') as HTMLCanvasElement | null;
    ctx = canvas?.getContext('2d') ?? null;
    cropOverlay = document.getElementById('print-crop-overlay') as HTMLCanvasElement | null;
    cropCtx = cropOverlay?.getContext('2d') ?? null;
    canvasWrapper = (canvas?.parentElement as HTMLElement | null) ?? null;

    pageSizeSelect = document.getElementById('print-page-size') as HTMLSelectElement | null;
    orientationBtn = document.getElementById('print-orientation-toggle');
    colorBtn = document.getElementById('print-color-mode-toggle');
    buttonGridBtn = document.getElementById('print-button-grid-toggle');
    drumsBtn = document.getElementById('print-drum-grid-toggle');
    leftLegendBtn = document.getElementById('print-left-legend-toggle');
    rightLegendBtn = document.getElementById('print-right-legend-toggle');

    // Button event listeners
    document.getElementById('print-close-button')?.addEventListener('click', handleCloseClick);
    document.getElementById('print-confirm-button')?.addEventListener('click', handleConfirmClick);

    orientationBtn?.addEventListener('click', handleOrientationClick);
    colorBtn?.addEventListener('click', handleColorClick);
    buttonGridBtn?.addEventListener('click', handleButtonGridClick);
    drumsBtn?.addEventListener('click', handleDrumsClick);
    leftLegendBtn?.addEventListener('click', handleLeftLegendClick);
    rightLegendBtn?.addEventListener('click', handleRightLegendClick);

    pageSizeSelect?.addEventListener('change', handlePageSizeChange);

    // Crop overlay event listeners
    cropOverlay?.addEventListener('mousedown', onCropMouseDown);
    cropOverlay?.addEventListener('mousemove', onCropMouseMove);
    cropOverlay?.addEventListener('mouseup', onCropMouseUp);
    cropOverlay?.addEventListener('mouseleave', onCropMouseUp);

    // Store subscriptions
    store.on('printPreviewStateChanged', handlePrintPreviewStateChanged);
    store.on('printOptionsChanged', handlePrintOptionsChanged);
    store.on('notesChanged', handleNotesChanged);

    // Resize observer
    if (canvasWrapper) {
      resizeObserver = new ResizeObserver(() => {
        if (store.state.isPrintPreviewActive) {
          void render();
        }
      });
      resizeObserver.observe(canvasWrapper);
    }

    console.log('[Svelte] PrintPreviewBridge mounted');
  });

  onDestroy(() => {
    // Remove button event listeners
    document.getElementById('print-close-button')?.removeEventListener('click', handleCloseClick);
    document.getElementById('print-confirm-button')?.removeEventListener('click', handleConfirmClick);

    orientationBtn?.removeEventListener('click', handleOrientationClick);
    colorBtn?.removeEventListener('click', handleColorClick);
    buttonGridBtn?.removeEventListener('click', handleButtonGridClick);
    drumsBtn?.removeEventListener('click', handleDrumsClick);
    leftLegendBtn?.removeEventListener('click', handleLeftLegendClick);
    rightLegendBtn?.removeEventListener('click', handleRightLegendClick);

    pageSizeSelect?.removeEventListener('change', handlePageSizeChange);

    // Remove crop overlay event listeners
    cropOverlay?.removeEventListener('mousedown', onCropMouseDown);
    cropOverlay?.removeEventListener('mousemove', onCropMouseMove);
    cropOverlay?.removeEventListener('mouseup', onCropMouseUp);
    cropOverlay?.removeEventListener('mouseleave', onCropMouseUp);

    // Disconnect resize observer
    resizeObserver?.disconnect();

    console.log('[Svelte] PrintPreviewBridge unmounted');
  });
</script>

<!-- This is a headless component - no DOM output -->
