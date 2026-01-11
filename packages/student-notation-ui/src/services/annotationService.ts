// js/services/annotationService.ts
//
// NOTE: This file coordinates annotation functionality. Helper functions have been
// extracted to sub-modules in ./annotation/. See ./annotation/index.ts for barrel exports.
//
// Sub-modules:
// - ./annotation/types.ts - Type definitions
// - ./annotation/annotationGeometry.ts - Distance/intersection calculations
// - ./annotation/annotationEraser.ts - Eraser tool logic
// - ./annotation/annotationLassoSelection.ts - Lasso selection logic
// - ./annotation/annotationSelectionDrag.ts - Selection dragging
// - ./annotation/annotationArrowRenderer.ts - Arrow rendering
//
/**
 * COORDINATE SYSTEM NOTE:
 * AnnotationService uses canvas-space coordinates throughout.
 * - getColumnX() and getColumnFromX() handle conversion between pixels and canvas-space columns
 * - All column indices in annotations are canvas-space (0 = first musical beat)
 * - Annotations interact with notes, stamps, and triplets which all use canvas-space
 */
import store from '@state/initStore.ts';
import logger from '@utils/logger.ts';
import { getColumnFromX, getRowFromY, getColumnX, getRowY } from '@components/canvas/PitchGrid/renderers/rendererUtils.ts';
import pitchGridViewportService from '@services/pitchGridViewportService.ts';
import PitchGridController from '@components/canvas/PitchGrid/pitchGrid.ts';
import { isPointInPolygon, isPointNearHull } from '@utils/geometryUtils.ts';
import { distanceToLineSegment } from '@services/annotation/annotationGeometry.ts';
import { eraseAnnotationsAtPoint } from '@services/annotation/annotationEraser.ts';
import { computeConvexHullForSelectedItems, computeLassoSelection, removeFromLassoSelectionAtPoint } from '@services/annotation/annotationLassoSelection.ts';
import { applyLassoSelectionDrag } from '@services/annotation/annotationSelectionDrag.ts';
import { renderArrowAnnotation } from '@services/annotation/annotationArrowRenderer.ts';

logger.moduleLoaded('AnnotationService', 'annotation');

class AnnotationService {
  canvas!: HTMLCanvasElement;
  ctx!: CanvasRenderingContext2D;
  currentTool: string | null;
  toolSettings: any;
  tempEraserMode: boolean;
  isDrawing: boolean;
  currentPath: Array<{ x?: number; y?: number; col?: number; row?: number }>;
  startPoint: { x?: number; y?: number; col?: number; row?: number } | null;
  tempAnnotation: any;
  selectedAnnotation: any;
  hoverAnnotation: any;
  eraserCursor: { x: number; y: number } | null;
  isDragging: boolean;
  dragOffset: any;
  isResizing: boolean;
  resizeHandle: string | null;
  resizeStartBounds: any;
  isDraggingSelection: boolean;
  selectionDragStart: { col: number; row: number } | null;
  selectionDragTotal: { col: number; row: number } | null;
  lastPointerPosition: { clientX: number; clientY: number } | null;
  initialDragStartRank: number | null;

  constructor() {
    this.toolSettings = null;
    this.tempEraserMode = false;
    // Note: annotations are now stored in store.state.annotations
    this.currentTool = null;
    this.isDrawing = false;
    this.currentPath = [];
    this.startPoint = null;
    this.tempAnnotation = null;
    this.selectedAnnotation = null;
    this.hoverAnnotation = null;
    this.eraserCursor = null;
    this.isDragging = false;
    this.dragOffset = null;
    this.isResizing = false;
    this.resizeHandle = null; // 'nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'
    this.resizeStartBounds = null;

    // Lasso selection state
    this.isDraggingSelection = false;
    this.selectionDragStart = null;
    this.selectionDragTotal = null; // Track total movement to avoid accumulation errors
    this.lastPointerPosition = null;
    this.initialDragStartRank = null; // Track viewport startRank at drag start to compensate scroll
  }

  initialize() {
    // Use pitch grid canvas for event handling (annotations render on pitch grid now)
    const canvas = document.getElementById('notation-grid');
    if (!(canvas instanceof HTMLCanvasElement)) {
      logger.error('AnnotationService', 'Pitch grid canvas not found', null, 'annotation');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      logger.error('AnnotationService', 'Pitch grid context not available', null, 'annotation');
      return;
    }

    this.canvas = canvas;
    this.ctx = ctx;
    this.setupEventListeners();

    // Listen to store changes for undo/redo support
    store.on('annotationsChanged', () => {
      this.selectedAnnotation = null;
      this.render();
    });

    // Listen to scroll events to keep lasso selection in sync with grid
    store.on('scrollByUnits', (direction?: number) => {
      if (typeof direction !== 'number') {return;}
      this.handleSelectionScroll(direction);
    });

    logger.initSuccess('AnnotationService');
  }

  setupEventListeners() {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));
    // Keep dragged lasso selections aligned when the user scrolls during a drag
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this), { passive: true });
    this.canvas.addEventListener('contextmenu', (event: MouseEvent) => event.preventDefault()); // Prevent context menu
    // Also listen to scroll + wheel on likely containers so dragging stays aligned when scrolling
    this.registerScrollSyncTarget(document.getElementById('pitch-grid-wrapper'));
    this.registerScrollSyncTarget(document.getElementById('canvas-container'));
    // Fallback: global scroll (e.g., if wrapper not found)
    window.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
    window.addEventListener('wheel', this.handleWheel.bind(this), { passive: true });

    // Add keyboard listener for delete/backspace
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  handleKeyDown(e: KeyboardEvent) {
    // Only handle delete/backspace if an annotation is selected
    if (!this.selectedAnnotation) {return;}

    // Check if we're in a text input (don't delete annotation if typing)
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      const isEditable = activeElement.isContentEditable;
      const tagName = activeElement.tagName.toLowerCase();
      if (['input', 'textarea'].includes(tagName) || isEditable) {
        return;
      }
    }

    // Delete or Backspace key
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault(); // Prevent browser back navigation on Backspace
      this.deleteSelectedAnnotation();
    }
  }

  deleteSelectedAnnotation() {
    if (!this.selectedAnnotation) {return;}

    // Find and remove the selected annotation
    const index = store.state.annotations.indexOf(this.selectedAnnotation);
    if (index > -1) {
      store.state.annotations.splice(index, 1);
      this.selectedAnnotation = null;
      store.recordState();
      this.render();
      logger.log('AnnotationService', 'Deleted annotation', 'annotation');
    }
  }

  resize() {
    const notationGrid = document.getElementById('notation-grid');
    if (!(notationGrid instanceof HTMLCanvasElement)) {
      return;
    }

    this.canvas.width = notationGrid.width;
    this.canvas.height = notationGrid.height;
    this.render();
  }

  /**
     * Helper to get render options for coordinate conversion
     */
  getRenderOptions() {
    return {
      columnWidths: store.state.columnWidths,
      cellWidth: store.state.cellWidth,
      cellHeight: store.state.cellHeight,
      modulationMarkers: store.state.modulationMarkers,
      baseMicrobeatPx: store.state.cellWidth
    };
  }

  /**
     * Convert canvas pixel coordinates to grid coordinates
     */
  canvasToGrid(canvasX: number, canvasY: number) {
    const options = this.getRenderOptions();
    return {
      col: getColumnFromX(canvasX, options),
      row: getRowFromY(canvasY, options)
    };
  }

  /**
   * Convert canvas pixel coordinates to grid coordinates using a fresh viewport
   * lookup (avoids cached startRank that can lag during scroll).
   */
  canvasToGridFresh(canvasX: number, canvasY: number) {
    const options = this.getRenderOptions();
    const viewportInfo = pitchGridViewportService.getViewportInfo();
    const halfUnit = options.cellHeight / 2;
    return {
      col: getColumnFromX(canvasX, options),
      row: (canvasY / halfUnit) + viewportInfo.startRank - 1
    };
  }

  /**
     * Convert grid coordinates to canvas pixel coordinates
     */
  gridToCanvas(col: number, row: number) {
    const options = this.getRenderOptions();
    return {
      x: getColumnX(col, options),
      y: getRowY(row, options)
    };
  }

  setTool(toolName: string | null, settings: any) {
    this.currentTool = toolName;
    this.toolSettings = settings;

    // Update cursor based on tool
    if (this.canvas) {
      switch (toolName) {
        case 'arrow':
        case 'text':
          this.canvas.style.cursor = 'crosshair';
          break;
        case 'marker':
        case 'highlighter':
          this.canvas.style.cursor = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\'><circle cx=\'8\' cy=\'8\' r=\'4\' fill=\'rgba(0,0,0,0.5)\'/></svg>") 8 8, crosshair';
          break;
        case 'lasso':
          this.canvas.style.cursor = 'crosshair';
          break;
        default:
          this.canvas.style.cursor = 'default';
      }
    }
  }

  handleMouseDown(e: MouseEvent) {
    if (!this.currentTool || !this.toolSettings) {return;}

    const rect = this.canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    this.lastPointerPosition = { clientX: e.clientX, clientY: e.clientY };

    // Convert canvas pixels to grid coordinates
    const gridCoords = this.canvasToGridFresh(canvasX, canvasY);

    // Right-click behavior depends on current tool
    if (e.button === 2) {
      // If lasso tool is active and there's a selection, remove clicked item from selection
      if (this.currentTool === 'lasso' && store.state.lassoSelection?.isActive) {
        this.removeFromLassoSelection(canvasX, canvasY);
        return;
      }

      // Otherwise, activate temporary eraser mode
      this.tempEraserMode = true;
      this.isDrawing = true;
      this.eraseAtPoint(canvasX, canvasY);
      this.showEraserCursor(canvasX, canvasY);
      return;
    }

    // Check for resize handle on selected text annotation
    if (this.selectedAnnotation?.type === 'text') {
      const handle = this.getResizeHandleAt(canvasX, canvasY, this.selectedAnnotation);
      if (handle) {
        this.isResizing = true;
        this.resizeHandle = handle;
        this.resizeStartBounds = {
          col: this.selectedAnnotation.col,
          row: this.selectedAnnotation.row,
          widthCols: this.selectedAnnotation.widthCols,
          heightRows: this.selectedAnnotation.heightRows,
          mouseCol: gridCoords.col,
          mouseRow: gridCoords.row
        };
        return;
      }
    }

    // Check if clicking on lasso selection to drag it
    if (store.state.lassoSelection?.isActive && store.state.lassoSelection.convexHull) {
      const isNearHull = isPointNearHull({ x: canvasX, y: canvasY }, store.state.lassoSelection.convexHull, 10);
      const isInsideHull = isPointInPolygon({ x: canvasX, y: canvasY }, store.state.lassoSelection.convexHull);

      if (isNearHull || isInsideHull) {
        this.isDraggingSelection = true;
        // Store original mouse position in grid units (accounts for later scrolling)
        this.selectionDragStart = {
          col: gridCoords.col,
          row: gridCoords.row
        };
        // Track total movement applied
        this.selectionDragTotal = {
          col: 0,
          row: 0
        };
        this.lastPointerPosition = { clientX: e.clientX, clientY: e.clientY };
        // Store initial viewport position for scroll compensation
        this.initialDragStartRank = pitchGridViewportService.getViewportInfo().startRank;
        return;
      }
    }

    // Check for selection - single click selects text/arrow annotations
    const clicked = this.getAnnotationAt(canvasX, canvasY);
    if (clicked && (clicked.type === 'arrow' || clicked.type === 'text')) {
      // If clicking on already selected annotation
      if (this.selectedAnnotation === clicked) {
        // Special behavior for text tool: double-click (or already selected) text box opens for editing
        // First click selects, allows dragging. User can double-click to edit.
        this.isDragging = true;
        if (clicked.type === 'arrow') {
          this.dragOffset = {
            startCol: gridCoords.col - clicked.startCol,
            startRow: gridCoords.row - clicked.startRow,
            endCol: gridCoords.col - clicked.endCol,
            endRow: gridCoords.row - clicked.endRow
          };
        } else if (clicked.type === 'text') {
          this.dragOffset = {
            col: gridCoords.col - clicked.col,
            row: gridCoords.row - clicked.row
          };
        }
        return;
      }

      // Otherwise, select the annotation (or open for editing if text tool on unselected text box)
      if (this.currentTool === 'text' && clicked.type === 'text') {
        // Text tool clicking on unselected text box: open for editing immediately
        this.editTextAnnotation(clicked);
        return;
      }

      // For other tools or arrows, just select
      this.selectedAnnotation = clicked;
      this.loadAnnotationSettings(clicked);
      this.render();
      return;
    } else {
      this.selectedAnnotation = null;
    }

    this.isDrawing = true;
    this.startPoint = gridCoords;
    this.currentPath = [gridCoords];

    switch (this.currentTool) {
      case 'arrow':
        this.tempAnnotation = {
          type: 'arrow',
          startCol: gridCoords.col,
          startRow: gridCoords.row,
          endCol: gridCoords.col,
          endRow: gridCoords.row,
          settings: { ...this.toolSettings.arrow }
        };
        break;
      case 'text':
        // Create temporary text box annotation for drag preview
        this.tempAnnotation = {
          type: 'text',
          startCol: gridCoords.col,
          startRow: gridCoords.row,
          endCol: gridCoords.col,
          endRow: gridCoords.row
        };
        break;
      case 'marker':
      case 'highlighter':
        this.tempAnnotation = {
          type: this.currentTool,
          path: [gridCoords],
          settings: { ...this.toolSettings[this.currentTool] }
        };
        break;
      case 'lasso':
        this.tempAnnotation = {
          type: 'lasso',
          path: [{ x: canvasX, y: canvasY }]
        };
        break;
    }
  }

  handleMouseMove(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    this.lastPointerPosition = { clientX: e.clientX, clientY: e.clientY };

    // Convert to grid coordinates
    const gridCoords = this.canvasToGridFresh(canvasX, canvasY);

    // Handle eraser mode
    if (this.tempEraserMode) {
      this.eraseAtPoint(canvasX, canvasY);
      this.showEraserCursor(canvasX, canvasY);
      return;
    }

    // Handle resizing text annotation
    if (this.isResizing && this.selectedAnnotation?.type === 'text') {
      if (!this.resizeHandle || !this.resizeStartBounds) {
        return;
      }
      const dCol = gridCoords.col - this.resizeStartBounds.mouseCol;
      const dRow = gridCoords.row - this.resizeStartBounds.mouseRow;

      let newCol = this.resizeStartBounds.col;
      let newRow = this.resizeStartBounds.row;
      let newWidthCols = this.resizeStartBounds.widthCols;
      let newHeightRows = this.resizeStartBounds.heightRows;

      // Apply resize based on handle position
      if (this.resizeHandle.includes('n')) {
        newRow = this.resizeStartBounds.row + dRow;
        newHeightRows = this.resizeStartBounds.heightRows - dRow;
      }
      if (this.resizeHandle.includes('s')) {
        newHeightRows = this.resizeStartBounds.heightRows + dRow;
      }
      if (this.resizeHandle.includes('w')) {
        newCol = this.resizeStartBounds.col + dCol;
        newWidthCols = this.resizeStartBounds.widthCols - dCol;
      }
      if (this.resizeHandle.includes('e')) {
        newWidthCols = this.resizeStartBounds.widthCols + dCol;
      }

      // Enforce minimum dimensions (in grid units)
      const minWidthCols = 2;
      const minHeightRows = 1;
      if (newWidthCols < minWidthCols) {
        if (this.resizeHandle.includes('w')) {
          newCol = this.resizeStartBounds.col + this.resizeStartBounds.widthCols - minWidthCols;
        }
        newWidthCols = minWidthCols;
      }
      if (newHeightRows < minHeightRows) {
        if (this.resizeHandle.includes('n')) {
          newRow = this.resizeStartBounds.row + this.resizeStartBounds.heightRows - minHeightRows;
        }
        newHeightRows = minHeightRows;
      }

      this.selectedAnnotation.col = newCol;
      this.selectedAnnotation.row = newRow;
      this.selectedAnnotation.widthCols = newWidthCols;
      this.selectedAnnotation.heightRows = newHeightRows;

      this.render();
      return;
    }

    // Handle dragging lasso selection
    if (this.isDraggingSelection && this.selectionDragStart && this.selectionDragTotal) {
      this.applySelectionDrag(canvasX, canvasY);
      return;
    }

    // Handle dragging selected annotation
    if (this.isDragging && this.selectedAnnotation) {
      if (this.selectedAnnotation.type === 'arrow') {
        this.selectedAnnotation.startCol = gridCoords.col - this.dragOffset.startCol;
        this.selectedAnnotation.startRow = gridCoords.row - this.dragOffset.startRow;
        this.selectedAnnotation.endCol = gridCoords.col - this.dragOffset.endCol;
        this.selectedAnnotation.endRow = gridCoords.row - this.dragOffset.endRow;
      } else if (this.selectedAnnotation.type === 'text') {
        this.selectedAnnotation.col = gridCoords.col - this.dragOffset.col;
        this.selectedAnnotation.row = gridCoords.row - this.dragOffset.row;
      }
      this.render();
      return;
    }

    // Handle hover detection when not drawing
    if (!this.isDrawing) {
      this.updateHover(canvasX, canvasY);
      return;
    }

    if (!this.tempAnnotation) {return;}

    switch (this.currentTool) {
      case 'arrow':
        this.tempAnnotation.endCol = gridCoords.col;
        this.tempAnnotation.endRow = gridCoords.row;
        this.render();
        break;
      case 'text':
        this.tempAnnotation.endCol = gridCoords.col;
        this.tempAnnotation.endRow = gridCoords.row;
        this.render();
        break;
      case 'marker':
      case 'highlighter':
        // Interpolate points for smooth continuous path
        if (this.tempAnnotation.path.length > 0) {
          const lastPoint = this.tempAnnotation.path[this.tempAnnotation.path.length - 1];
          const interpolated = this.interpolatePoints(lastPoint, gridCoords);
          this.tempAnnotation.path.push(...interpolated);
        } else {
          this.tempAnnotation.path.push(gridCoords);
        }
        this.render();
        break;
      case 'lasso':
        this.tempAnnotation.path.push({ x: canvasX, y: canvasY }); // Lasso still uses pixels for now
        this.render();
        break;
    }
  }

  handleMouseUp(e: MouseEvent) {
    // Stop resizing
    if (this.isResizing) {
      this.isResizing = false;
      this.resizeHandle = null;
      this.resizeStartBounds = null;
      store.recordState();
      return;
    }

    // Stop dragging lasso selection
    if (this.isDraggingSelection) {
      this.isDraggingSelection = false;
      this.selectionDragStart = null;
      this.selectionDragTotal = null;
      this.lastPointerPosition = null;
      this.initialDragStartRank = null;
      store.recordState();
      return;
    }

    // Stop dragging
    if (this.isDragging) {
      this.isDragging = false;
      this.dragOffset = null;
      store.recordState();
      return;
    }

    if (!this.isDrawing) {return;}

    this.isDrawing = false;

    // Exit temporary eraser mode
    if (this.tempEraserMode) {
      this.tempEraserMode = false;
      this.render(); // Clear the eraser cursor
      return;
    }

    if (this.tempAnnotation) {
      // Handle text tool - open text input after drag or click
      if (this.currentTool === 'text') {
        const { startCol, startRow, endCol, endRow } = this.tempAnnotation;
        const widthCols = Math.abs(endCol - startCol);
        const heightRows = Math.abs(endRow - startRow);
        const col = Math.min(startCol, endCol);
        const row = Math.min(startRow, endRow);

        // If user dragged (minimum size), use dragged dimensions
        if (widthCols > 0.5 && heightRows > 0.2) {
          this.createTextAnnotation(col, row, widthCols, heightRows);
        } else {
          // If user just clicked without dragging, create a medium-sized default text box
          const defaultWidthCols = 8;  // Medium width (8 columns)
          const defaultHeightRows = 2; // Medium height (2 rows)
          this.createTextAnnotation(startCol, startRow, defaultWidthCols, defaultHeightRows);
        }
        this.tempAnnotation = null;
        this.render();
        return;
      }

      // Add completed annotation to list
      if (this.currentTool === 'lasso') {
        // Process lasso selection
        this.handleLassoSelection(e.shiftKey);
      } else {
        store.state.annotations.push(this.tempAnnotation);
        // Auto-select arrows after placement
        if (this.currentTool === 'arrow') {
          this.selectedAnnotation = this.tempAnnotation;
        }
        store.recordState();
      }
      this.tempAnnotation = null;
      this.render();
    }
  }

  handleWheel(e: WheelEvent) {
    // Update drag position when the user scrolls during a lasso drag (no mousemove events fired)
    if (!this.isDraggingSelection || !this.selectionDragStart || !this.selectionDragTotal) {return;}
    // Persist the last known pointer position (wheel events may have clientX/Y as 0 in some browsers)
    if (e.clientX !== 0 || e.clientY !== 0) {
      this.lastPointerPosition = { clientX: e.clientX, clientY: e.clientY };
    }

    requestAnimationFrame(() => this.applySelectionDragFromLastPointer());
  }

  handleScroll() {
    // Keep drag in sync when the viewport scrolls (e.g., via wheel on wrapper)
    if (!this.isDraggingSelection || !this.selectionDragStart || !this.selectionDragTotal) {return;}
    requestAnimationFrame(() => this.applySelectionDragFromLastPointer());
  }

  applySelectionDragFromLastPointer() {
    if (!this.canvas || !this.lastPointerPosition) {return;}
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = this.lastPointerPosition.clientX - rect.left;
    const canvasY = this.lastPointerPosition.clientY - rect.top;
    this.applySelectionDrag(canvasX, canvasY);
  }

  registerScrollSyncTarget(target: HTMLElement | null) {
    if (!target) {return;}
    target.addEventListener('wheel', this.handleWheel.bind(this), { passive: true });
    target.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
  }

	  applySelectionDrag(canvasX: number, canvasY: number) {
	    if (!this.isDraggingSelection || !this.selectionDragStart || !this.selectionDragTotal) {return;}
	    const options = this.getRenderOptions();

	    // Get current viewport info to detect scroll changes
	    const viewportInfo = pitchGridViewportService.getViewportInfo();
	    const currentStartRank = viewportInfo.startRank;

	    // Convert current pointer to grid space
	    const currentGrid = this.canvasToGridFresh(canvasX, canvasY);
	    const { moved, nextSelectionDragTotal } = applyLassoSelectionDrag({
	      selection: store.state.lassoSelection,
	      selectionDragStart: this.selectionDragStart,
	      selectionDragTotal: this.selectionDragTotal,
	      currentPointerGrid: currentGrid,
	      initialDragStartRank: this.initialDragStartRank,
	      currentStartRank,
	      renderOptions: options
	    });

	    if (!moved) {
	      return;
	    }

	    this.selectionDragTotal.col = nextSelectionDragTotal.col;
	    this.selectionDragTotal.row = nextSelectionDragTotal.row;
	    this.render();
	  }

  /**
   * Handle grid scroll events to keep lasso selection visuals in sync.
   *
   * NOTE: We do NOT modify the actual note/stamp/triplet row positions here.
   * getRowY() already accounts for viewport scroll by subtracting startRank,
   * so the visual positions update automatically. Modifying item.data.row
   * would corrupt the actual note positions and break playback.
   *
   * We only need to recalculate the convex hull for the selection highlight.
   */
	  handleSelectionScroll(_rowDelta: number) {
    // Only process if there's an active selection and we're not actively dragging
    if (!store.state.lassoSelection?.isActive || this.isDraggingSelection) {
      return;
    }

	    const options = this.getRenderOptions();
	    store.state.lassoSelection.convexHull = computeConvexHullForSelectedItems({
	      selectedItems: store.state.lassoSelection.selectedItems,
	      renderOptions: options
	    });

	    this.render();
	  }

  handleMouseLeave(e: MouseEvent) {
    if (this.isDrawing) {
      this.handleMouseUp(e);
    }
  }

  handleDoubleClick(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if double-clicking on a text annotation
    const clicked = this.getAnnotationAt(x, y);
    if (clicked?.type === 'text') {
      this.editTextAnnotation(clicked);
    }
  }

  editTextAnnotation(annotation: any) {
    // Open text editor for existing annotation
    const { col, row, widthCols, heightRows, text, settings } = annotation;

    // Temporarily remove from annotations array
    const index = store.state.annotations.indexOf(annotation);
    if (index > -1) {
      store.state.annotations.splice(index, 1);
      this.selectedAnnotation = null;
      this.render();
    }

    // Create editable text input with existing text
    this.createTextAnnotation(col, row, widthCols, heightRows, text, settings);
  }

  createTextAnnotation(
    col: number,
    row: number,
    widthCols: number,
    heightRows: number,
    existingText: string | null = null,
    existingSettings: any = null
  ) {
    this.isDrawing = false;

    // Convert grid coordinates to canvas pixels for positioning the text input
    const gridPos = this.gridToCanvas(col, row);
    const gridEnd = this.gridToCanvas(col + widthCols, row + heightRows);
    const x = gridPos.x;
    const y = gridPos.y;
    const width = gridEnd.x - x;
    const height = gridEnd.y - y;

    // Get the actual font family from CSS variable (same as canvas)
    const computedStyle = window.getComputedStyle(document.documentElement);
    const mainFont = computedStyle.getPropertyValue('--main-font').trim() || '"Atkinson Hyperlegible", Arial, sans-serif';

    // Use existing settings if editing, otherwise use current tool settings
    const settings = existingSettings || this.toolSettings.text;

    // Create text input overlay
    const input = document.createElement('div');
    input.contentEditable = 'true';
    input.className = 'annotation-text-input';
    input.textContent = existingText || 'Type here...';
    const fontSize = settings.size;
    const lineHeight = fontSize * 1.2;

    input.style.width = `${width}px`;
    input.style.height = `${height}px`;
    input.style.padding = settings.background ? '4px 8px' : '4px';
    input.style.border = '2px dashed rgba(74, 144, 226, 0.5)';
    input.style.backgroundColor = settings.background ? '#ffffff' : 'transparent';
    input.style.color = settings.color;
    input.style.fontSize = `${fontSize}px`;
    input.style.lineHeight = `${lineHeight}px`;
    input.style.fontWeight = settings.bold ? 'bold' : 'normal';
    input.style.fontStyle = settings.italic ? 'italic' : 'normal';
    input.style.textDecoration = settings.underline ? 'underline' : 'none';

    // Apply superscript/subscript styling
    if (settings.superscript) {
      input.style.fontSize = `${fontSize * 0.6}px`;
      input.style.verticalAlign = 'super';
    } else if (settings.subscript) {
      input.style.fontSize = `${fontSize * 0.6}px`;
      input.style.verticalAlign = 'sub';
    }

    input.style.outline = 'none';
    input.style.zIndex = '10000';
    input.style.position = 'fixed';
    input.style.cursor = 'text';
    input.style.pointerEvents = 'auto';
    input.style.fontFamily = mainFont;
    input.style.whiteSpace = 'pre-wrap';
    input.style.wordWrap = 'break-word';
    input.style.overflow = 'hidden';
    input.style.boxSizing = 'border-box';

    const canvasRect = this.canvas.getBoundingClientRect();
    input.style.left = `${canvasRect.left + x}px`;
    input.style.top = `${canvasRect.top + y}px`;

    document.body.appendChild(input);
    input.focus();

    // Select all placeholder text on focus
    const range = document.createRange();
    range.selectNodeContents(input);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }

    let finished = false;
    const finishText = () => {
      if (finished) {return;}
      finished = true;

      const text = input.textContent.trim();
      // Don't save if empty or just placeholder
      if (text && text !== 'Type here...') {
        const annotation = {
          type: 'text',
          col,
          row,
          widthCols,
          heightRows,
          text,
          settings: { ...settings }
        };
        store.state.annotations.push(annotation);
        this.selectedAnnotation = store.state.annotations[store.state.annotations.length - 1];
        store.recordState();
        this.render();
      }
      if (document.body.contains(input)) {
        document.body.removeChild(input);
      }
    };

    // Clear placeholder on first input
    let placeholderCleared = false;
    input.addEventListener('input', () => {
      if (!placeholderCleared && input.textContent === 'Type here...') {
        input.textContent = '';
        placeholderCleared = true;
      }
    });

    // Delay blur listener to prevent immediate firing
    setTimeout(() => {
      input.addEventListener('blur', finishText);
    }, 100);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        finishText();
      }
      if (e.key === 'Escape') {
        finished = true;
        if (document.body.contains(input)) {
          document.body.removeChild(input);
        }
      }
    });
  }

	  handleLassoSelection(isAdditive = false) {
	    if (!this.tempAnnotation?.path) {return;}

	    const options = this.getRenderOptions();
	    store.state.lassoSelection = computeLassoSelection({
	      lassoPath: this.tempAnnotation.path as Array<{ x: number; y: number }>,
	      state: store.state,
	      renderOptions: options,
	      isAdditive,
	      existingSelectedItems: store.state.lassoSelection?.selectedItems
	    });

	    // Record state for undo/redo
	    store.recordState();

	    logger.log('AnnotationService', `Lasso selection completed: ${store.state.lassoSelection.selectedItems.length} items selected`, 'annotation');
	    this.render();
	  }

	  updateLassoConvexHull() {
    // Only update if there's an active lasso selection
    if (!store.state.lassoSelection?.isActive || !store.state.lassoSelection.selectedItems?.length) {
      return;
    }

	    const options = this.getRenderOptions();
	    store.state.lassoSelection.convexHull = computeConvexHullForSelectedItems({
	      selectedItems: store.state.lassoSelection.selectedItems,
	      renderOptions: options
	    });
	  }

	  removeFromLassoSelection(canvasX: number, canvasY: number) {
    if (!store.state.lassoSelection?.isActive) {return;}

	    const options = this.getRenderOptions();
	    const result = removeFromLassoSelectionAtPoint({
	      canvasX,
	      canvasY,
	      state: store.state,
	      renderOptions: options,
	      selection: store.state.lassoSelection
	    });
	    if (!result?.changed) {
	      return;
	    }

	    store.state.lassoSelection = result.nextSelection;
	    store.recordState();
	    this.render();
	    logger.log('AnnotationService', `Removed item from lasso selection. ${result.nextSelection.selectedItems.length} items remain.`, 'annotation');
	  }

  drawTempAnnotation() {
    if (!this.tempAnnotation) {return;}

    switch (this.tempAnnotation.type) {
      case 'arrow':
        this.drawArrow(this.tempAnnotation, true);
        break;
      case 'text':
        this.drawTextBoxPreview(this.tempAnnotation);
        break;
      case 'marker':
        this.drawPath(this.tempAnnotation, false);
        break;
      case 'highlighter':
        this.drawPath(this.tempAnnotation, true);
        break;
      case 'lasso':
        this.drawLassoPath(this.tempAnnotation);
        break;
    }
  }

  drawTextBoxPreview(annotation: any) {
    const { startX, startY, endX, endY } = annotation;
    const ctx = this.ctx;

    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);

    ctx.save();
    ctx.strokeStyle = 'rgba(74, 144, 226, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x, y, width, height);

    // Draw background preview if enabled
    if (this.toolSettings.text.background) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillRect(x, y, width, height);
    }

    ctx.restore();
  }

  render() {
    // Trigger pitch grid re-render (annotations are now rendered as part of the pitch grid)
    PitchGridController.render();
  }

	  drawArrow(annotation: any, isTemp = false, isSelected = false, isHovered = false) {
	    renderArrowAnnotation({
	      ctx: this.ctx,
	      annotation,
	      isTemp,
	      isSelected,
	      isHovered,
	      getStrokeWidth: this.getStrokeWidth.bind(this),
	      getLineDash: this.getLineDash.bind(this)
	    });
	  }

  wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    // Split by explicit newlines first
    const paragraphs = text.split('\n');
    const wrappedLines: string[] = [];

    paragraphs.forEach((paragraph: string) => {
      if (!paragraph.trim()) {
        // Empty line
        wrappedLines.push('');
        return;
      }

      const words = paragraph.split(' ');
      let currentLine = '';

      words.forEach((word: string, _index: number) => {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && currentLine) {
          // Line is too long, push current line and start new one
          wrappedLines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });

      // Push the last line of this paragraph
      if (currentLine) {
        wrappedLines.push(currentLine);
      }
    });

    return wrappedLines;
  }

  drawText(annotation: any, isSelected = false, isHovered = false) {
    const { x, y, text, settings } = annotation;
    const ctx = this.ctx;

    ctx.save();

    // Get the actual font family from CSS variable
    const computedStyle = window.getComputedStyle(document.documentElement);
    const mainFont = computedStyle.getPropertyValue('--main-font').trim() || '"Atkinson Hyperlegible", Arial, sans-serif';

    const fontSizeValue = this.getSizeValue(settings.size);
    ctx.font = `${settings.italic ? 'italic ' : ''}${settings.bold ? 'bold ' : ''}${fontSizeValue} ${mainFont}`;
    ctx.textBaseline = 'top';


    const lineHeight = parseInt(fontSizeValue) * 1.2;

    // Use stored dimensions from the text box
    const maxWidth = annotation.width || 0;
    const totalHeight = annotation.height || 0;

    // Wrap text to fit within the box width
    const padding = settings.background ? 16 : 8; // Match input padding
    const availableWidth = maxWidth - padding;
    const lines = this.wrapText(ctx, text, availableWidth);


    // Draw background if enabled
    if (settings.background) {
      ctx.fillStyle = '#ffffff';
      const padding = 8;
      ctx.fillRect(x - padding/2, y - padding/2, maxWidth + padding, totalHeight + padding/2);
    }

    // Show hover highlight
    if (isHovered && !isSelected) {
      ctx.fillStyle = 'rgba(74, 144, 226, 0.1)';
      const padding = settings.background ? 8 : 2;
      ctx.fillRect(x - padding/2, y - padding/2, maxWidth + padding, totalHeight + padding/2);
    }

    // Show selection highlight
    if (isSelected) {
      ctx.fillStyle = 'rgba(74, 144, 226, 0.2)';
      const padding = settings.background ? 8 : 2;
      ctx.fillRect(x - padding/2, y - padding/2, maxWidth + padding, totalHeight + padding/2);
    }

    // Draw text with superscript support
    ctx.fillStyle = settings.color;
    const fontSize = parseInt(fontSizeValue);

    lines.forEach((line: string, i: number) => {
      const lineY = y + i * lineHeight;
      this.drawTextWithSuperscripts(ctx, line, x, lineY, fontSize, settings, mainFont);
    });

    // Draw resize handles if selected
    if (isSelected) {
      this.drawResizeHandles(x, y, maxWidth, totalHeight);
    }

    ctx.restore();
  }

  drawTextWithSuperscripts(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    fontSize: number,
    settings: any,
    fontFamily: string
  ) {
    // If entire text is superscript or subscript from toolbar settings, render accordingly
    if (settings.superscript || settings.subscript) {
      ctx.save();
      const smallerSize = fontSize * 0.6;
      const offset = settings.superscript ? -fontSize * 0.4 : fontSize * 0.3;
      ctx.font = `${settings.italic ? 'italic ' : ''}${settings.bold ? 'bold ' : ''}${smallerSize}px ${fontFamily}`;
      ctx.fillText(text, x, y + offset);

      if (settings.underline) {
        const metrics = ctx.measureText(text);
        ctx.beginPath();
        ctx.strokeStyle = settings.color;
        ctx.lineWidth = 1;
        ctx.moveTo(x, y + offset + smallerSize * 1.2 - 2);
        ctx.lineTo(x + metrics.width, y + offset + smallerSize * 1.2 - 2);
        ctx.stroke();
      }

      ctx.restore();
      return;
    }

    // Parse text for:
    // 1. <sup>text</sup> - explicit superscript markers
    // 2. <sub>text</sub> - explicit subscript markers
    // 3. ^text - shorthand superscript until space

    let currentX = x;
    const segments = this.parseFormattedText(text);

    const drawSegment = (segmentText: string, format: 'normal' | 'superscript' | 'subscript') => {
      const text = segmentText;
      if (!text) {return;}

      ctx.save();

      if (format === 'superscript') {
        // Superscript: smaller font, raised position
        const superSize = fontSize * 0.6;
        const superOffset = -fontSize * 0.4;
        ctx.font = `${settings.italic ? 'italic ' : ''}${settings.bold ? 'bold ' : ''}${superSize}px ${fontFamily}`;
        ctx.fillText(text, currentX, y + superOffset);
        currentX += ctx.measureText(text).width;
      } else if (format === 'subscript') {
        // Subscript: smaller font, lowered position
        const subSize = fontSize * 0.6;
        const subOffset = fontSize * 0.3;
        ctx.font = `${settings.italic ? 'italic ' : ''}${settings.bold ? 'bold ' : ''}${subSize}px ${fontFamily}`;
        ctx.fillText(text, currentX, y + subOffset);
        currentX += ctx.measureText(text).width;
      } else {
        // Normal text
        ctx.font = `${settings.italic ? 'italic ' : ''}${settings.bold ? 'bold ' : ''}${fontSize}px ${fontFamily}`;
        ctx.fillText(text, currentX, y);

        // Draw underline if enabled
        if (settings.underline) {
          const metrics = ctx.measureText(text);
          ctx.beginPath();
          ctx.strokeStyle = settings.color;
          ctx.lineWidth = 1;
          ctx.moveTo(currentX, y + fontSize * 1.2 - 2);
          ctx.lineTo(currentX + metrics.width, y + fontSize * 1.2 - 2);
          ctx.stroke();
        }

        currentX += ctx.measureText(text).width;
      }

      ctx.restore();
    };

    segments.forEach(segment => {
      drawSegment(segment.text, segment.format);
    });
  }

  parseFormattedText(text: string): Array<{ text: string; format: 'normal' | 'superscript' | 'subscript' }> {
    // Parse text into segments with formats: 'normal', 'superscript', or 'subscript'
    const segments: Array<{ text: string; format: 'normal' | 'superscript' | 'subscript' }> = [];
    let i = 0;
    let currentSegment = '';
    let inCaretSuperscript = false;

    while (i < text.length) {
      // Check for <sup> tag
      if (text.substr(i, 5) === '<sup>') {
        // Save current segment as normal
        if (currentSegment) {
          segments.push({ text: currentSegment, format: 'normal' });
          currentSegment = '';
        }
        // Find closing </sup>
        const closeIndex = text.indexOf('</sup>', i);
        if (closeIndex !== -1) {
          const supText = text.substring(i + 5, closeIndex);
          segments.push({ text: supText, format: 'superscript' });
          i = closeIndex + 6;
          continue;
        }
      }

      // Check for <sub> tag
      if (text.substr(i, 5) === '<sub>') {
        // Save current segment as normal
        if (currentSegment) {
          segments.push({ text: currentSegment, format: 'normal' });
          currentSegment = '';
        }
        // Find closing </sub>
        const closeIndex = text.indexOf('</sub>', i);
        if (closeIndex !== -1) {
          const subText = text.substring(i + 5, closeIndex);
          segments.push({ text: subText, format: 'subscript' });
          i = closeIndex + 6;
          continue;
        }
      }

      // Check for ^ character (shorthand superscript)
      if (text[i] === '^' && !inCaretSuperscript) {
        // Save current segment as normal
        if (currentSegment) {
          segments.push({ text: currentSegment, format: 'normal' });
          currentSegment = '';
        }
        inCaretSuperscript = true;
        i++;
        continue;
      }

      // Space ends caret superscript
      if (inCaretSuperscript && text[i] === ' ') {
        // Save accumulated superscript
        if (currentSegment) {
          segments.push({ text: currentSegment, format: 'superscript' });
          currentSegment = '';
        }
        inCaretSuperscript = false;
        segments.push({ text: ' ', format: 'normal' });
        i++;
        continue;
      }

      currentSegment += text[i];
      i++;
    }

    // Save any remaining segment
    if (currentSegment) {
      segments.push({
        text: currentSegment,
        format: inCaretSuperscript ? 'superscript' : 'normal'
      });
    }

    return segments;
  }

  drawResizeHandles(x: number, y: number, width: number, height: number) {
    const ctx = this.ctx;
    const handleSize = 8;
    const handles = [
      { pos: 'nw', x: x, y: y },
      { pos: 'n', x: x + width / 2, y: y },
      { pos: 'ne', x: x + width, y: y },
      { pos: 'e', x: x + width, y: y + height / 2 },
      { pos: 'se', x: x + width, y: y + height },
      { pos: 's', x: x + width / 2, y: y + height },
      { pos: 'sw', x: x, y: y + height },
      { pos: 'w', x: x, y: y + height / 2 }
    ];

    ctx.save();
    handles.forEach(handle => {
      ctx.fillStyle = '#4a90e2';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
    });
    ctx.restore();
  }

  drawPath(annotation: any, isHighlighter: boolean) {
    const { path, settings } = annotation;
    const ctx = this.ctx;

    if (path.length < 2) {return;}

    ctx.save();

    if (isHighlighter) {
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = settings.color;
    } else {
      ctx.strokeStyle = settings.color;
    }

    ctx.lineWidth = this.getStrokeWidth(settings.size);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);

    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }

    ctx.stroke();
    ctx.restore();
  }

  drawLassoPath(annotation: any) {
    const { path } = annotation;
    const ctx = this.ctx;

    if (path.length < 2) {return;}

    ctx.save();
    ctx.strokeStyle = 'rgba(0, 100, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);

    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }

    // Close the path back to start
    ctx.lineTo(path[0].x, path[0].y);
    ctx.stroke();
    ctx.restore();
  }

  getStrokeWidth(size: unknown): number {
    // Handle numeric sizes
    if (typeof size === 'number') {
      return size;
    }
    // Handle legacy string sizes
    switch (size) {
      case 'small': return 2;
      case 'medium': return 4;
      case 'large': return 6;
      default: return 2;
    }
  }

  getLineDash(style: unknown): number[] {
    switch (style) {
      case 'solid': return [];
      case 'dashed-big': return [10, 5];
      case 'dashed-small': return [5, 3];
      case 'dotted': return [2, 3];
      default: return [];
    }
  }

  getSizeValue(size: unknown): string {
    // Handle numeric sizes (for text tool)
    if (typeof size === 'number') {
      return `${size}px`;
    }
    // Handle string sizes (for marker/highlighter)
    switch (size) {
      case 'small': return '14px';
      case 'medium': return '18px';
      case 'large': return '24px';
      default: return '16px';
    }
  }

  updateHover(x: number, y: number) {
    const previousHover = this.hoverAnnotation;
    // When stamp hover is active, let pitch grid own the cursor to avoid flicker.
    const cursorOverrideActive = typeof document !== 'undefined' && document.body?.dataset?.['cursorOverride'] === 'stamp';

    // Check for resize handle on selected text annotation first
    if (this.selectedAnnotation?.type === 'text') {
      const handle = this.getResizeHandleAt(x, y, this.selectedAnnotation);
      if (handle) {
        // Set cursor based on resize direction
        const cursors: Record<string, string> = {
          'nw': 'nwse-resize',
          'n': 'ns-resize',
          'ne': 'nesw-resize',
          'e': 'ew-resize',
          'se': 'nwse-resize',
          's': 'ns-resize',
          'sw': 'nesw-resize',
          'w': 'ew-resize'
        };
        this.canvas.style.cursor = cursors[handle] ?? 'default';
        return;
      }
    }

    // Check if hovering over lasso selection convex hull
    if (store.state.lassoSelection?.isActive && store.state.lassoSelection.convexHull) {
      const isNearHull = isPointNearHull({ x, y }, store.state.lassoSelection.convexHull, 10);
      const isInsideHull = isPointInPolygon({ x, y }, store.state.lassoSelection.convexHull);

      if (isNearHull || isInsideHull) {
        this.canvas.style.cursor = 'move';
        return;
      }
    }

    const annotation = this.getAnnotationAt(x, y);

    // Update cursor based on hover
    if (annotation && (annotation.type === 'arrow' || annotation.type === 'text')) {
      if (!cursorOverrideActive) {
        // Special cursor for text tool hovering over text box
        if (this.currentTool === 'text' && annotation.type === 'text') {
          // If hovering over selected text box: show move cursor (can drag)
          // If hovering over unselected text box: show pointer cursor (click to edit)
          if (this.selectedAnnotation === annotation) {
            this.canvas.style.cursor = 'move';
          } else {
            this.canvas.style.cursor = 'pointer';
          }
        } else {
          this.canvas.style.cursor = 'move';
        }
      }
      this.hoverAnnotation = annotation;
    } else {
      // Restore default cursor for current tool unless an override is active
      if (!cursorOverrideActive) {
        if (this.currentTool) {
          this.setTool(this.currentTool, this.toolSettings);
        } else if (previousHover) {
          this.canvas.style.cursor = 'default';
        }
      }
      this.hoverAnnotation = null;
    }

    // Re-render if hover state changed
    if (previousHover !== this.hoverAnnotation) {
      this.render();
    }
  }

  getResizeHandleAt(x: number, y: number, annotation: any): string | null {
    if (annotation?.type !== 'text') {return null;}

    const handleSize = 8;
    const hitRadius = handleSize / 2 + 2; // Slightly larger hit area

    // Text annotations use grid coordinates (col, row, widthCols, heightRows)
    // Convert to canvas pixels for hit testing
    const options = this.getRenderOptions();
    const ax = getColumnX(annotation.col, options);
    const ay = getRowY(annotation.row, options);
    const endX = getColumnX(annotation.col + annotation.widthCols, options);
    const endY = getRowY(annotation.row + annotation.heightRows, options);
    const textWidth = endX - ax;
    const textHeight = endY - ay;

    const handles = [
      { pos: 'nw', x: ax, y: ay },
      { pos: 'n', x: ax + textWidth / 2, y: ay },
      { pos: 'ne', x: ax + textWidth, y: ay },
      { pos: 'e', x: ax + textWidth, y: ay + textHeight / 2 },
      { pos: 'se', x: ax + textWidth, y: ay + textHeight },
      { pos: 's', x: ax + textWidth / 2, y: ay + textHeight },
      { pos: 'sw', x: ax, y: ay + textHeight },
      { pos: 'w', x: ax, y: ay + textHeight / 2 }
    ];

    for (const handle of handles) {
      const dist = Math.sqrt(Math.pow(x - handle.x, 2) + Math.pow(y - handle.y, 2));
      if (dist <= hitRadius) {
        return handle.pos;
      }
    }

    return null;
  }

	  getAnnotationAt(x: number, y: number): any | null {
    const hitRadius = 10;

    // Check in reverse order (top to bottom)
    for (let i = store.state.annotations.length - 1; i >= 0; i--) {
      const annotation = store.state.annotations[i];

	      if (annotation.type === 'arrow') {
	        const dist = distanceToLineSegment(x, y,
	          annotation.startX, annotation.startY,
	          annotation.endX, annotation.endY);
	        if (dist < hitRadius) {
	          return annotation;
	        }
      } else if (annotation.type === 'text') {
        // Text annotations use grid coordinates (col, row, widthCols, heightRows)
        // Convert to canvas pixels for hit testing
        const options = this.getRenderOptions();
        const ax = getColumnX(annotation.col, options);
        const ay = getRowY(annotation.row, options);
        const endX = getColumnX(annotation.col + annotation.widthCols, options);
        const endY = getRowY(annotation.row + annotation.heightRows, options);
        const textWidth = endX - ax;
        const textHeight = endY - ay;

        if (x >= ax && x <= ax + textWidth &&
                    y >= ay && y <= ay + textHeight) {
          return annotation;
        }
      }
    }

    return null;
  }

  showEraserCursor(x: number, y: number) {
    // Clear and redraw with eraser cursor
    this.render();

    // Get microbeat size from state (2 microbeats = cellWidth)
    const microbeatSize = store.state.cellWidth || 40;
    const size = microbeatSize * 2;

    // Draw transparent red square cursor (no border)
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(220, 53, 69, 0.3)'; // Transparent red
    this.ctx.fillRect(x - size/2, y - size/2, size, size);
    this.ctx.restore();
  }

  loadAnnotationSettings(annotation: any) {
    // Load settings from selected annotation into the toolbar
    if (annotation.type === 'arrow' && window.drawToolsController) {
      const settings = annotation.settings;
      window.drawToolsController.settings.arrow = { ...settings };
      // Re-render the arrow toolbar to reflect loaded settings
      window.drawToolsController.renderArrowOptions();
    } else if (annotation.type === 'text' && window.drawToolsController) {
      const settings = annotation.settings;
      window.drawToolsController.settings.text = { ...settings };
      // Re-render the text toolbar to reflect loaded settings
      window.drawToolsController.renderTextOptions();
    }
  }

  applyCurrentSettingsToSelected() {
    // Apply current toolbar settings to selected annotation
    if (!this.selectedAnnotation) {return;}

    if (this.selectedAnnotation.type === 'arrow' && this.toolSettings.arrow) {
      this.selectedAnnotation.settings = { ...this.toolSettings.arrow };
      this.render();
    } else if (this.selectedAnnotation.type === 'text' && this.toolSettings.text) {
      this.selectedAnnotation.settings = { ...this.toolSettings.text };
      this.render();
    }
  }

  clearAnnotations() {
    store.state.annotations = [];
    this.render();
  }

	  eraseAtPoint(x: number, y: number) {
	    const { nextAnnotations, changed } = eraseAnnotationsAtPoint({
	      x,
	      y,
	      annotations: store.state.annotations,
	      getRenderOptions: () => this.getRenderOptions()
	    });

	    store.state.annotations = nextAnnotations;
	    if (changed) {
	      this.render();
	    }
	    return changed;
	  }

  interpolatePoints(point1: { col: number; row: number }, point2: { col: number; row: number }) {
    // Interpolate points between two grid coordinates for smooth path
    const points: Array<{ col: number; row: number }> = [];
    const colDiff = point2.col - point1.col;
    const rowDiff = point2.row - point1.row;
    const distance = Math.sqrt(colDiff * colDiff + rowDiff * rowDiff);

    // Add points every 0.1 grid units for smooth path
    const steps = Math.max(1, Math.floor(distance / 0.1));

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      points.push({
        col: point1.col + t * colDiff,
        row: point1.row + t * rowDiff
      });
    }

    return points;
  }

	  deleteAnnotationAt(x: number, y: number) {
	    this.eraseAtPoint(x, y);
	  }

  getAnnotations() {
    return store.state.annotations;
  }

  loadAnnotations(annotations: any) {
    store.state.annotations = annotations || [];
    this.render();
  }

  applyInlineFormatting(type: 'superscript' | 'subscript') {
    // Get the active text input if one exists
    const activeInput = document.querySelector('.annotation-text-input');
    if (!activeInput) {return;}

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) {return;}

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();

    if (!selectedText) {return;}

    // Create the marker-wrapped text
    let wrappedText;
    if (type === 'superscript') {
      wrappedText = `<sup>${selectedText}</sup>`;
    } else if (type === 'subscript') {
      wrappedText = `<sub>${selectedText}</sub>`;
    } else {
      return;
    }

    // Replace the selected text with the wrapped version
    range.deleteContents();
    const textNode = document.createTextNode(wrappedText);
    range.insertNode(textNode);

    // Move cursor after the inserted text
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);

    // Keep focus on the input
    if (activeInput instanceof HTMLElement) {
      activeInput.focus();
    }
  }
}

const annotationService = new AnnotationService();
export default annotationService;
