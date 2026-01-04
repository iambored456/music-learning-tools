<script lang="ts">
  /**
   * PitchGrid Component
   *
   * A shared pitch grid visualization component that supports multiple modes:
   * - 'notation': Full editing with interactors (Student Notation)
   * - 'playback': Read-only playback display (Student Notation)
   * - 'singing': Real-time pitch visualization (Singing Trainer - stationary)
   * - 'highway': Note highway with flowing targets (Singing Trainer - Guitar Hero)
   */

  import { onMount, onDestroy } from 'svelte';
  import type {
    PitchGridMode,
    PitchGridViewport,
    CoordinateUtils,
    LegendHighlightConfig,
    SingingModeConfig,
    HighwayModeConfig,
    PitchHistoryPoint,
    TargetNote,
  } from './types.js';
  import type {
    PitchRowData,
    PlacedNote,
    TonicSign,
    MacrobeatGrouping,
    MacrobeatBoundaryStyle,
    ModulationMarker,
    AccidentalMode,
    DegreeDisplayMode,
    LongNoteStyle,
  } from '@mlt/types';
  import {
    createColumnCoordinates,
    createTimeCoordinates,
    getVisibleRowRangeWithPadding,
    isRowVisible,
  } from './renderers/coordinateUtils.js';
  import {
    drawHorizontalLines,
    drawVerticalLines,
    drawTimeBasedVerticalLines,
    type HorizontalLinesConfig,
    type VerticalLinesConfig,
    type TimeBasedVerticalLinesConfig,
  } from './renderers/gridLines.js';
  import {
    drawSingleColumnOvalNote,
    drawTwoColumnOvalNote,
    drawTonicShape,
    drawUserPitchIndicator,
    drawUserPitchTrace,
    drawTargetNotes,
    type NoteRenderContext,
    type NoteRenderConfig,
    type UserPitchRenderConfig,
  } from './renderers/notes.js';
  import {
    drawLegendsToSeparateCanvases,
    type LegendRenderConfig,
  } from './renderers/legend.js';

  // ============================================================================
  // Props - Using interface for cleaner typing
  // ============================================================================

  interface Props {
    // Core props (all modes)
    mode: PitchGridMode;
    fullRowData: PitchRowData[];
    viewport: PitchGridViewport;
    cellWidth: number;
    cellHeight: number;
    colorMode?: 'color' | 'bw';
    degreeDisplayMode?: DegreeDisplayMode;
    accidentalMode?: AccidentalMode;
    showFrequencyLabels?: boolean;
    showOctaveLabels?: boolean;
    showRightLegend?: boolean;
    legendHighlight?: LegendHighlightConfig;

    // Notation/Playback mode props
    placedNotes?: PlacedNote[];
    placedTonicSigns?: TonicSign[];
    columnWidths?: number[];
    macrobeatGroupings?: MacrobeatGrouping[];
    macrobeatBoundaryStyles?: MacrobeatBoundaryStyle[];
    modulationMarkers?: ModulationMarker[];
    longNoteStyle?: LongNoteStyle;

    // Singing mode props
    singingConfig?: SingingModeConfig;

    // Highway mode props
    highwayConfig?: HighwayModeConfig;
    beatIntervalMs?: number;
    beatTimeOffsetMs?: number;
  }

  let {
    mode,
    fullRowData,
    viewport,
    cellWidth,
    cellHeight,
    colorMode = 'color',
    degreeDisplayMode = 'off',
    accidentalMode = { sharp: true, flat: true },
    showFrequencyLabels = false,
    showOctaveLabels = true,
    showRightLegend = true,
    legendHighlight,
    placedNotes = [],
    placedTonicSigns = [],
    columnWidths = [],
    macrobeatGroupings = [],
    macrobeatBoundaryStyles = [],
    modulationMarkers,
    longNoteStyle = 'style1',
    singingConfig,
    highwayConfig,
    beatIntervalMs = 500,
    beatTimeOffsetMs = 0,
  }: Props = $props();

  // ============================================================================
  // Canvas Refs (these are element bindings, not reactive state)
  // ============================================================================

  let mainCanvas: HTMLCanvasElement | undefined = $state(undefined);
  let legendLeftCanvas: HTMLCanvasElement | undefined = $state(undefined);
  let legendRightCanvas: HTMLCanvasElement | undefined = $state(undefined);
  let ctx: CanvasRenderingContext2D | null = $state(null);
  let leftCtx: CanvasRenderingContext2D | null = $state(null);
  let rightCtx: CanvasRenderingContext2D | null = $state(null);
  let animationFrameId: number | null = $state(null);

  // Legend column width in cell units (matches Student Notation sizing)
  const LEGEND_COLUMN_WIDTH_UNITS = 3;
  const legendColumnWidth = $derived(cellWidth * LEGEND_COLUMN_WIDTH_UNITS);
  const legendCanvasWidth = $derived(legendColumnWidth * 2);
  const showLegends = $derived(showOctaveLabels || showFrequencyLabels);
  const legendTotalWidth = $derived(showLegends ? legendCanvasWidth * (showRightLegend ? 2 : 1) : 0);
  const gridWidth = $derived(Math.max(0, viewport.containerWidth - legendTotalWidth));

  // ============================================================================
  // Derived State
  // ============================================================================

  const isNotationMode = $derived(mode === 'notation' || mode === 'playback');
  const isSingingMode = $derived(mode === 'singing');
  const isHighwayMode = $derived(mode === 'highway');

  // ============================================================================
  // Coordinate Utilities
  // ============================================================================

  function getCoordinates(): CoordinateUtils {
    if (isNotationMode) {
      return createColumnCoordinates({
        cellWidth,
        cellHeight,
        columnWidths,
        viewport,
        modulationMarkers,
      });
    } else {
      const config = isHighwayMode ? highwayConfig : singingConfig;

      return createTimeCoordinates({
        cellWidth,
        cellHeight,
        viewport,
        pixelsPerSecond: config?.pixelsPerSecond ?? 200,
        nowLineX: (config as HighwayModeConfig)?.nowLineX ?? 100,
        currentTimeMs: (config as HighwayModeConfig)?.currentTimeMs ?? 0,
      });
    }
  }

  // ============================================================================
  // Rendering
  // ============================================================================

  function render(): void {
    if (!ctx || !mainCanvas) return;

    const coords = getCoordinates();
    const { paddedStartRow, paddedEndRow } = getVisibleRowRangeWithPadding(viewport, fullRowData);

    // Clear canvas
    ctx.clearRect(0, 0, gridWidth, viewport.containerHeight);

    // Draw horizontal grid lines
    const horizontalConfig: HorizontalLinesConfig = {
      fullRowData,
      cellHeight,
      viewportHeight: viewport.containerHeight,
      viewportWidth: gridWidth,
      colorMode,
    };
    drawHorizontalLines(ctx, horizontalConfig, coords, paddedStartRow, paddedEndRow);

    // Mode-specific rendering
    if (isNotationMode) {
      renderNotationMode(ctx, coords);
    } else if (isSingingMode) {
      renderSingingMode(ctx, coords);
    } else if (isHighwayMode) {
      renderHighwayMode(ctx, coords);
    }

    // Render legends if enabled and contexts are available
    if (showLegends && (leftCtx || rightCtx)) {
      renderLegends(coords, paddedStartRow, paddedEndRow);
    }
  }

  function renderNotationMode(
    renderCtx: CanvasRenderingContext2D,
    coords: CoordinateUtils
  ): void {
    // Draw vertical lines
    const macrobeatBoundaries = calculateMacrobeatBoundaries(macrobeatGroupings);
    const verticalConfig: VerticalLinesConfig = {
      columnWidths,
      cellWidth,
      viewportHeight: viewport.containerHeight,
      macrobeatGroupings,
      macrobeatBoundaryStyles,
      placedTonicSigns,
    };
    drawVerticalLines(renderCtx, verticalConfig, coords, macrobeatBoundaries);

    // Filter visible notes
    const visibleNotes = placedNotes.filter(note => {
      if (note.isDrum || note.globalRow === undefined) return false;
      return isRowVisible(note.globalRow, viewport, cellHeight, coords);
    });

    // Filter visible tonic signs
    const visibleTonicSigns = placedTonicSigns.filter(sign => {
      if (sign.globalRow === undefined) return false;
      return isRowVisible(sign.globalRow, viewport, cellHeight, coords);
    });

    // Create render context
    const noteConfig: NoteRenderConfig = {
      cellWidth,
      cellHeight,
      columnWidths,
      degreeDisplayMode,
      accidentalMode,
      longNoteStyle,
      colorMode,
    };

    const noteContext: NoteRenderContext = {
      config: noteConfig,
      coords,
      allNotes: placedNotes,
    };

    // Draw notes
    for (const note of visibleNotes) {
      if (note.shape === 'oval') {
        drawSingleColumnOvalNote(renderCtx, noteContext, note, note.globalRow!);
      } else if (note.shape === 'circle') {
        drawTwoColumnOvalNote(renderCtx, noteContext, note, note.globalRow!);
      }
    }

    // Draw tonic signs
    for (const sign of visibleTonicSigns) {
      drawTonicShape(renderCtx, noteContext, sign);
    }
  }

  function renderSingingMode(renderCtx: CanvasRenderingContext2D, coords: CoordinateUtils): void {
    if (!singingConfig) return;

    const userPitchConfig: UserPitchRenderConfig = {
      cellHeight,
      viewportWidth: gridWidth,
      pixelsPerSecond: singingConfig.pixelsPerSecond ?? 200,
      timeWindowMs: singingConfig.timeWindowMs ?? 4000,
      colorMode,
      trailConfig: singingConfig.trailConfig,
    };

    // Draw user pitch trace
    if (singingConfig.pitchHistory && singingConfig.pitchHistory.length > 0) {
      drawUserPitchTrace(
        renderCtx,
        coords,
        singingConfig.pitchHistory,
        performance.now(),
        userPitchConfig,
        fullRowData
      );
    }

    // Draw target notes if any
    if (singingConfig.targetNotes && singingConfig.targetNotes.length > 0) {
      drawTargetNotes(
        renderCtx,
        coords,
        singingConfig.targetNotes,
        performance.now(),
        userPitchConfig,
        fullRowData
      );
    }

    // Draw current pitch indicator at right edge (for stationary mode)
    if (singingConfig.userPitch && singingConfig.userPitch.clarity > 0.5) {
      drawUserPitchIndicator(
        renderCtx,
        coords,
        singingConfig.userPitch.midi,
        singingConfig.userPitch.clarity,
        gridWidth - 20,
        userPitchConfig,
        fullRowData
      );
    }
  }

  function renderHighwayMode(renderCtx: CanvasRenderingContext2D, coords: CoordinateUtils): void {
    if (!highwayConfig) return;

    const userPitchConfig: UserPitchRenderConfig = {
      cellHeight,
      viewportWidth: viewport.containerWidth,
      nowLineX: highwayConfig.nowLineX,
      pixelsPerSecond: highwayConfig.pixelsPerSecond ?? 200,
      timeWindowMs: highwayConfig.timeWindowMs ?? 4000,
      colorMode,
      trailConfig: highwayConfig.trailConfig,
    };

    // Check if we have scrolling grid data (Student Notation mode)
    const hasScrollingGrid = highwayConfig.scrollingGridData && highwayConfig.scrollOffset !== undefined;

    if (hasScrollingGrid) {
      // Render scrolling grid mode (Student Notation style)
      renderScrollingGrid(renderCtx, coords);
    } else {
      // Render target notes mode (Singing Trainer style - original behavior)
      // Draw time-based vertical lines
      const visibleTimeRange = {
        startMs: highwayConfig.currentTimeMs - 1000,
        endMs: highwayConfig.currentTimeMs + (gridWidth / (highwayConfig.pixelsPerSecond ?? 200)) * 1000,
      };

      const verticalConfig: TimeBasedVerticalLinesConfig = {
        viewportWidth: gridWidth,
        viewportHeight: viewport.containerHeight,
        beatIntervalMs,
        visibleTimeRange,
        nowLineX: highwayConfig.nowLineX,
        beatTimeOffsetMs,
      };
      drawTimeBasedVerticalLines(renderCtx, verticalConfig, coords);

      // Draw target notes with user pitch for hit detection
      if (highwayConfig.targetNotes && highwayConfig.targetNotes.length > 0) {
        drawTargetNotes(
          renderCtx,
          coords,
          highwayConfig.targetNotes,
          highwayConfig.currentTimeMs,
          userPitchConfig,
          fullRowData,
          highwayConfig.userPitch?.midi ?? null,
          highwayConfig.userPitch?.clarity ?? 0
        );
      }
    }

    // Draw judgment line (both modes)
    drawJudgmentLine(renderCtx, highwayConfig.nowLineX, viewport.containerHeight);

    // Draw onramp countdown if active
    if (highwayConfig.showOnrampCountdown && highwayConfig.onrampBeatsRemaining !== undefined) {
      drawOnrampCountdown(renderCtx, highwayConfig.onrampBeatsRemaining);
    }

    // Draw user pitch indicator at now line
    if (highwayConfig.userPitch && highwayConfig.userPitch.clarity > 0.5) {
      drawUserPitchIndicator(
        renderCtx,
        coords,
        highwayConfig.userPitch.midi,
        highwayConfig.userPitch.clarity,
        highwayConfig.nowLineX,
        userPitchConfig,
        fullRowData
      );
    }
  }

  function renderScrollingGrid(renderCtx: CanvasRenderingContext2D, coords: CoordinateUtils): void {
    if (!highwayConfig?.scrollingGridData || highwayConfig.scrollOffset === undefined) return;

    const gridData = highwayConfig.scrollingGridData;
    const scrollOffset = highwayConfig.scrollOffset;

    // Draw scrolling vertical lines (macrobeat boundaries, bar lines)
    const macrobeatBoundaries = calculateMacrobeatBoundaries(gridData.macrobeatGroupings);
    for (let i = 0; i < macrobeatBoundaries.length; i++) {
      const columnIndex = macrobeatBoundaries[i];
      const x = (columnIndex * cellWidth) - scrollOffset;

      // Only draw if visible
      if (x >= -cellWidth && x <= gridWidth + cellWidth) {
        const boundaryStyle = gridData.macrobeatBoundaryStyles[i] || 'solid';
        const lineWidth = boundaryStyle === 'solid' ? 2 : 1;
        const dash = boundaryStyle === 'dashed' ? [5, 5] : [];

        renderCtx.strokeStyle = '#495057';
        renderCtx.lineWidth = lineWidth;
        renderCtx.setLineDash(dash);
        renderCtx.beginPath();
        renderCtx.moveTo(x, 0);
        renderCtx.lineTo(x, viewport.containerHeight);
        renderCtx.stroke();
        renderCtx.setLineDash([]);
      }
    }

    // Draw scrolling notes
    const noteConfig: NoteRenderConfig = {
      cellWidth,
      cellHeight,
      columnWidths: gridData.columnWidths,
      degreeDisplayMode,
      accidentalMode,
      longNoteStyle,
      colorMode,
    };

    for (const note of gridData.placedNotes) {
      if (note.isDrum || note.globalRow === undefined) continue;
      if (!isRowVisible(note.globalRow, viewport, cellHeight, coords)) continue;

      // Calculate scrolled X position
      const noteStartX = (note.startColumnIndex * cellWidth) - scrollOffset;
      const noteEndX = (note.endColumnIndex * cellWidth) - scrollOffset;

      // Only render if visible
      if (noteEndX >= -cellWidth && noteStartX <= gridWidth + cellWidth) {
        // Create a temporary scrolled coords utility
        const scrolledCoords = {
          ...coords,
          getColumnX: (colIndex: number) => (colIndex * cellWidth) - scrollOffset,
        };

        const noteContext: NoteRenderContext = {
          config: noteConfig,
          coords: scrolledCoords,
          allNotes: gridData.placedNotes,
        };

        if (note.shape === 'oval') {
          drawSingleColumnOvalNote(renderCtx, noteContext, note, note.globalRow);
        } else if (note.shape === 'circle') {
          drawTwoColumnOvalNote(renderCtx, noteContext, note, note.globalRow);
        }
      }
    }
  }

  function drawJudgmentLine(ctx: CanvasRenderingContext2D, x: number, height: number): void {
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  function drawOnrampCountdown(ctx: CanvasRenderingContext2D, beatsRemaining: number): void {
    // Simple countdown display at top center
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(gridWidth / 2 - 40, 10, 80, 50);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(beatsRemaining.toString(), gridWidth / 2, 35);
  }

  function renderLegends(coords: CoordinateUtils, startRow: number, endRow: number): void {
    const legendConfig: LegendRenderConfig = {
      fullRowData,
      cellWidth,
      cellHeight,
      legendColumnWidth,
      colorMode,
      showFrequencyLabels,
      showOctaveLabels,
      accidentalMode,
      focusedPitchClasses: null, // No focus filtering in basic mode
      focusColorsEnabled: false,
      highlight: legendHighlight,
    };

    const legendOptions = {
      startRow,
      endRow,
      coords,
    };

    drawLegendsToSeparateCanvases(leftCtx, rightCtx, legendConfig, legendOptions);
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  function calculateMacrobeatBoundaries(groupings: (2 | 3)[]): number[] {
    const boundaries: number[] = [];
    let column = 0;

    for (const grouping of groupings) {
      column += grouping;
      boundaries.push(column);
    }

    return boundaries;
  }

  // ============================================================================
  // Animation Loop (for singing/highway modes)
  // ============================================================================

  function startAnimationLoop(): void {
    if (animationFrameId) return;

    function loop(): void {
      render();
      animationFrameId = requestAnimationFrame(loop);
    }

    animationFrameId = requestAnimationFrame(loop);
  }

  function stopAnimationLoop(): void {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  // ============================================================================
  // Canvas Setup
  // ============================================================================

  function setupCanvas(): void {
    if (!mainCanvas) return;

    ctx = mainCanvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const dpr = window.devicePixelRatio || 1;
    mainCanvas.width = gridWidth * dpr;
    mainCanvas.height = viewport.containerHeight * dpr;
    mainCanvas.style.width = `${gridWidth}px`;
    mainCanvas.style.height = `${viewport.containerHeight}px`;
    ctx.scale(dpr, dpr);

    // Set up legend canvases if they exist
    if (legendLeftCanvas) {
      leftCtx = legendLeftCanvas.getContext('2d');
      if (leftCtx) {
        legendLeftCanvas.width = legendCanvasWidth * dpr;
        legendLeftCanvas.height = viewport.containerHeight * dpr;
        legendLeftCanvas.style.width = `${legendCanvasWidth}px`;
        legendLeftCanvas.style.height = `${viewport.containerHeight}px`;
        leftCtx.scale(dpr, dpr);
      }
    }

    if (legendRightCanvas) {
      rightCtx = legendRightCanvas.getContext('2d');
      if (rightCtx) {
        legendRightCanvas.width = legendCanvasWidth * dpr;
        legendRightCanvas.height = viewport.containerHeight * dpr;
        legendRightCanvas.style.width = `${legendCanvasWidth}px`;
        legendRightCanvas.style.height = `${viewport.containerHeight}px`;
        rightCtx.scale(dpr, dpr);
      }
    }

    // Initial render
    render();

    // Start animation loop for real-time modes
    if (isSingingMode || isHighwayMode) {
      startAnimationLoop();
    }
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  onMount(() => {
    setupCanvas();
  });

  onDestroy(() => {
    stopAnimationLoop();
  });

  // Re-render when props change (for notation mode)
  $effect(() => {
    // Track relevant props
    void mode;
    void viewport;
    void cellWidth;
    void cellHeight;
    void colorMode;
    void degreeDisplayMode;
    void placedNotes;
    void placedTonicSigns;
    void columnWidths;

    if (ctx && isNotationMode) {
      render();
    }
  });

  // Handle mode changes
  $effect(() => {
    void mode; // Track mode changes

    if (isSingingMode || isHighwayMode) {
      startAnimationLoop();
    } else {
      stopAnimationLoop();
      if (ctx) render();
    }
  });

  // Re-setup canvas when viewport dimensions change
  $effect(() => {
    void viewport.containerWidth;
    void viewport.containerHeight;

    if (ctx && mainCanvas) {
      setupCanvas();
    }
  });
</script>

<div class="pitch-grid-container">
  {#if showLegends}
    <canvas
      bind:this={legendLeftCanvas}
      class="pitch-grid-legend pitch-grid-legend--left"
    ></canvas>
  {/if}

  <canvas
    bind:this={mainCanvas}
    class="pitch-grid-canvas"
  ></canvas>

  {#if showLegends && showRightLegend}
    <canvas
      bind:this={legendRightCanvas}
      class="pitch-grid-legend pitch-grid-legend--right"
    ></canvas>
  {/if}
</div>

<style>
  .pitch-grid-container {
    display: flex;
    width: 100%;
    height: 100%;
    position: relative;
  }

  .pitch-grid-canvas {
    flex: 1;
    display: block;
  }

  .pitch-grid-legend {
    width: 60px;
    flex-shrink: 0;
  }

  .pitch-grid-legend--left {
    border-right: 1px solid #dee2e6;
  }

  .pitch-grid-legend--right {
    border-left: 1px solid #dee2e6;
  }
</style>
