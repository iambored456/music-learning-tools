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
    CurrentPitch,
    LegendHighlightConfig,
    PitchRowHighlightConfig,
    PitchRowHighlightEntry,
    SingingModeConfig,
    HighwayModeConfig,
    PitchHistoryPoint,
    TargetNote,
    TargetNoteStyle,
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
    rowPositionOffsets?: readonly number[];
    legendColumnWidthUnits?: number;
    colorMode?: 'color' | 'bw';
    degreeDisplayMode?: DegreeDisplayMode;
    accidentalMode?: AccidentalMode;
    showFrequencyLabels?: boolean;
    showOctaveLabels?: boolean;
    showLegendLabels?: boolean;
    showAccidentalLabels?: boolean;
    showRightLegend?: boolean;
    legendHighlight?: LegendHighlightConfig;
    rowHighlight?: PitchRowHighlightConfig;
    showHorizontalGridLines?: boolean;
    extendHorizontalGridLinesBehindLegend?: boolean;
    horizontalGridReferencePitchClass?: number | null;
    horizontalGridReferenceLineColor?: string;
    horizontalGridDefaultLineColor?: string;
    horizontalGridDefaultLineWidth?: number;
    horizontalGridDashedLineWidth?: number;
    judgmentLineColor?: string;
    judgmentLineWidth?: number;
    focusedPitchClasses?: Set<number> | null;
    focusColorsEnabled?: boolean;
    legendLabelOverrides?: Map<number, string>;
    legendMidiLabelOverrides?: Map<number, string>;
    targetNoteStyle?: TargetNoteStyle;

    // Notation/Playback mode props
    placedNotes?: PlacedNote[];
    placedTonicSigns?: TonicSign[];
    columnWidths?: number[];
    macrobeatGroupings?: MacrobeatGrouping[];
    macrobeatBoundaryStyles?: MacrobeatBoundaryStyle[];
    tempoModulationMarkers?: ModulationMarker[];
    longNoteStyle?: LongNoteStyle;

    // Singing mode props
    singingConfig?: SingingModeConfig;

    // Highway mode props
    highwayConfig?: HighwayModeConfig;
    /** User pitch from mic — separate prop to avoid expensive config recalculation */
    userPitch?: CurrentPitch | null;
    beatIntervalMs?: number;
    measureIntervalMs?: number;
    beatTimeOffsetMs?: number;
    measureTimeOffsetMs?: number;
  }

  let {
    mode,
    fullRowData,
    viewport,
    cellWidth,
    cellHeight,
    rowPositionOffsets,
    legendColumnWidthUnits = 3,
    colorMode = 'color',
    degreeDisplayMode = 'off',
    accidentalMode = { sharp: true, flat: true },
    showFrequencyLabels = false,
    showOctaveLabels = true,
    showLegendLabels = true,
    showAccidentalLabels = true,
    showRightLegend = true,
    legendHighlight,
    rowHighlight,
    showHorizontalGridLines = true,
    extendHorizontalGridLinesBehindLegend = false,
    horizontalGridReferencePitchClass = null,
    horizontalGridReferenceLineColor = '#adb5bd',
    horizontalGridDefaultLineColor = '#ced4da',
    horizontalGridDefaultLineWidth,
    horizontalGridDashedLineWidth,
    judgmentLineColor = 'rgba(255, 0, 0, 0.9)',
    judgmentLineWidth,
    focusedPitchClasses = null,
    focusColorsEnabled = false,
    legendLabelOverrides,
    legendMidiLabelOverrides,
    targetNoteStyle = 'stadium',
    placedNotes = [],
    placedTonicSigns = [],
    columnWidths = [],
    macrobeatGroupings = [],
    macrobeatBoundaryStyles = [],
    tempoModulationMarkers,
    longNoteStyle = 'style1',
    singingConfig,
    highwayConfig,
    userPitch,
    beatIntervalMs = 500,
    measureIntervalMs = beatIntervalMs * 4,
    beatTimeOffsetMs = 0,
    measureTimeOffsetMs = beatTimeOffsetMs,
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

  // Each legend contains two equal-width label columns.
  const legendColumnWidth = $derived(cellWidth * legendColumnWidthUnits);
  const legendCanvasWidth = $derived(legendColumnWidth * 2);
  const showLegends = $derived(showLegendLabels);
  const legendTotalWidth = $derived(showLegends ? legendCanvasWidth * (showRightLegend ? 2 : 1) : 0);
  const gridWidth = $derived(Math.max(0, viewport.containerWidth - legendTotalWidth));

  // ============================================================================
  // Derived State
  // ============================================================================

  const isNotationMode = $derived(mode === 'notation' || mode === 'playback');
  const isSingingMode = $derived(mode === 'singing');
  const isHighwayMode = $derived(mode === 'highway');
  const midiToRowIndex = $derived.by<Map<number, number>>(() => {
    const map = new Map<number, number>();
    for (let rowIndex = 0; rowIndex < fullRowData.length; rowIndex++) {
      const midi = fullRowData[rowIndex]?.midi;
      if (typeof midi === 'number') {
        map.set(midi, rowIndex);
      }
    }
    return map;
  });

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
        tempoModulationMarkers,
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
        rowPositionOffsets,
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

    drawRowHighlights(ctx, coords, paddedStartRow, paddedEndRow, true);
    if (showHorizontalGridLines) {
      // Draw horizontal grid lines
      const horizontalConfig: HorizontalLinesConfig = {
        fullRowData,
        cellHeight,
        viewportHeight: viewport.containerHeight,
        viewportWidth: gridWidth,
        colorMode,
        horizontalGridReferencePitchClass,
        horizontalGridReferenceLineColor,
        horizontalGridDefaultLineColor,
        horizontalGridDefaultLineWidth,
        horizontalGridDashedLineWidth,
      };
      drawHorizontalLines(ctx, horizontalConfig, coords, paddedStartRow, paddedEndRow);
    }
    drawRowHighlights(ctx, coords, paddedStartRow, paddedEndRow, false);

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

  function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  function toRgba(color: string, alpha: number): string {
    const normalizedAlpha = clamp(alpha, 0, 1);
    const shortHex = color.match(/^#([0-9a-fA-F]{3})$/);
    if (shortHex) {
      const [r, g, b] = shortHex[1].split('').map((char) => Number.parseInt(char + char, 16));
      return `rgba(${r}, ${g}, ${b}, ${normalizedAlpha})`;
    }

    const longHex = color.match(/^#([0-9a-fA-F]{6})$/);
    if (longHex) {
      const hexValue = longHex[1];
      const r = Number.parseInt(hexValue.slice(0, 2), 16);
      const g = Number.parseInt(hexValue.slice(2, 4), 16);
      const b = Number.parseInt(hexValue.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${normalizedAlpha})`;
    }

    const rgbMatch = color.match(/^rgba?\(([^)]+)\)$/);
    if (rgbMatch) {
      const parts = rgbMatch[1].split(',').map((value) => Number.parseFloat(value.trim()));
      const r = clamp(parts[0] ?? 255, 0, 255);
      const g = clamp(parts[1] ?? 255, 0, 255);
      const b = clamp(parts[2] ?? 255, 0, 255);
      return `rgba(${r}, ${g}, ${b}, ${normalizedAlpha})`;
    }

    return `rgba(255, 255, 255, ${normalizedAlpha})`;
  }

  function normalizeRowHighlights(
    highlights: PitchRowHighlightConfig | undefined
  ): PitchRowHighlightEntry[] {
    if (!highlights) return [];
    return Array.isArray(highlights) ? highlights : [highlights];
  }

  function resolveHighlightRowIndex(highlight: PitchRowHighlightEntry): number | null {
    if (typeof highlight.rowIndex === 'number' && Number.isFinite(highlight.rowIndex)) {
      return Math.round(highlight.rowIndex);
    }

    if (typeof highlight.midi === 'number' && Number.isFinite(highlight.midi)) {
      return midiToRowIndex.get(Math.round(highlight.midi)) ?? null;
    }

    return null;
  }

  function drawRowHighlights(
    renderCtx: CanvasRenderingContext2D,
    coords: CoordinateUtils,
    startRow: number,
    endRow: number,
    renderBehindGridLines: boolean
  ): void {
    const highlights = normalizeRowHighlights(rowHighlight);
    if (highlights.length === 0 || gridWidth <= 0) return;

    const now = performance.now();
    const shimmerWidth = Math.max(60, Math.min(220, gridWidth * 0.2));

    renderCtx.save();
    for (const highlight of highlights) {
      if (Boolean(highlight.renderBehindGridLines) !== renderBehindGridLines) continue;
      const rowIndex = resolveHighlightRowIndex(highlight);
      if (rowIndex === null || rowIndex < startRow || rowIndex > endRow) continue;

      const row = fullRowData[rowIndex];
      if (!row || row.isBoundary) continue;

      const y = coords.getRowY(rowIndex);
      if (y < -cellHeight || y > viewport.containerHeight + cellHeight) continue;

      const color = highlight.color ?? row.hex;
      const pulse = highlight.pulse ? (Math.sin(now / 260) + 1) / 2 : 0;
      const baseOpacity = clamp(highlight.opacity ?? 0.23, 0.05, 1);
      const glowStrength = clamp(highlight.glow ?? 0.9, 0, 1);
      const rowOpacity = clamp(baseOpacity + pulse * 0.05, 0, 1);
      const glowOpacity = clamp((0.14 + pulse * 0.08) * glowStrength, 0, 1);
      const scale = clamp(highlight.heightScale ?? 1, 0.1, 1);
      const fadeExtendTop = Math.max(0, highlight.fadeExtendTopScale ?? 0) * cellHeight;
      const fadeExtendBottom = Math.max(0, highlight.fadeExtendBottomScale ?? 0) * cellHeight;
      const halfHeight = (cellHeight / 2) * scale;
      const fillHeight = halfHeight * 2;
      const fillTop = y - halfHeight;
      const fillBottom = y + halfHeight;

      const glowTop = y - cellHeight * scale;
      const glowHeight = cellHeight * 2 * scale;
      const glowGradient = renderCtx.createLinearGradient(0, glowTop, 0, glowTop + glowHeight);
      glowGradient.addColorStop(0, toRgba(color, 0));
      glowGradient.addColorStop(0.3, toRgba(color, glowOpacity * 0.45));
      glowGradient.addColorStop(0.5, toRgba(color, glowOpacity));
      glowGradient.addColorStop(0.7, toRgba(color, glowOpacity * 0.45));
      glowGradient.addColorStop(1, toRgba(color, 0));
      renderCtx.fillStyle = glowGradient;
      renderCtx.fillRect(0, glowTop, gridWidth, glowHeight);

      renderCtx.fillStyle = toRgba(color, rowOpacity);
      renderCtx.fillRect(0, fillTop, gridWidth, fillHeight);

      if (fadeExtendTop > 0) {
        const topFadeGradient = renderCtx.createLinearGradient(0, fillTop - fadeExtendTop, 0, fillTop);
        topFadeGradient.addColorStop(0, toRgba(color, 0));
        topFadeGradient.addColorStop(1, toRgba(color, rowOpacity));
        renderCtx.fillStyle = topFadeGradient;
        renderCtx.fillRect(0, fillTop - fadeExtendTop, gridWidth, fadeExtendTop);
      }

      if (fadeExtendBottom > 0) {
        const bottomFadeGradient = renderCtx.createLinearGradient(0, fillBottom, 0, fillBottom + fadeExtendBottom);
        bottomFadeGradient.addColorStop(0, toRgba(color, rowOpacity));
        bottomFadeGradient.addColorStop(1, toRgba(color, 0));
        renderCtx.fillStyle = bottomFadeGradient;
        renderCtx.fillRect(0, fillBottom, gridWidth, fadeExtendBottom);
      }

      const shimmerX = ((now * 0.18) % (gridWidth + shimmerWidth * 2)) - shimmerWidth;
      const shimmerGradient = renderCtx.createLinearGradient(
        shimmerX - shimmerWidth,
        0,
        shimmerX + shimmerWidth,
        0
      );
      shimmerGradient.addColorStop(0, toRgba('#ffffff', 0));
      shimmerGradient.addColorStop(0.5, toRgba('#ffffff', 0.16 + pulse * 0.04));
      shimmerGradient.addColorStop(1, toRgba('#ffffff', 0));
      renderCtx.fillStyle = shimmerGradient;
      renderCtx.fillRect(0, fillTop, gridWidth, fillHeight);

    }
    renderCtx.restore();
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
      labelConfig: singingConfig.labelConfig,
      targetNoteStyle,
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
    // Use separate userPitch prop (falls back to config for backwards compat)
    const singingUserPitch = userPitch ?? singingConfig.userPitch;
    if (singingUserPitch && singingUserPitch.clarity > 0.5) {
      drawUserPitchIndicator(
        renderCtx,
        coords,
        singingUserPitch.midi,
        singingUserPitch.clarity,
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
      labelConfig: highwayConfig.labelConfig,
      targetNoteStyle,
    };

    // Check if we have scrolling grid data (Student Notation mode)
    const hasScrollingGrid = highwayConfig.scrollingGridData && highwayConfig.scrollOffset !== undefined;

    if (hasScrollingGrid) {
      // Render scrolling grid mode (Student Notation style)
      renderScrollingGrid(renderCtx, coords);
    } else {
      // Render target notes mode (Singing Trainer style - original behavior)
      const shouldDrawBeatLines = Number.isFinite(beatIntervalMs) && beatIntervalMs > 0;
      if (shouldDrawBeatLines) {
        // Draw time-based vertical lines
        const leftVisibleTimeMs = coords.getTimeFromX?.(0)
          ?? (highwayConfig.currentTimeMs - 1000);
        const rightVisibleTimeMs = coords.getTimeFromX?.(gridWidth)
          ?? (highwayConfig.currentTimeMs + (gridWidth / (highwayConfig.pixelsPerSecond ?? 200)) * 1000);
        const visibleTimeRange = {
          startMs: Math.min(leftVisibleTimeMs, rightVisibleTimeMs),
          endMs: Math.max(leftVisibleTimeMs, rightVisibleTimeMs),
        };

        const verticalConfig: TimeBasedVerticalLinesConfig = {
          viewportWidth: gridWidth,
          viewportHeight: viewport.containerHeight,
          beatIntervalMs,
          measureIntervalMs,
          visibleTimeRange,
          beatTimeOffsetMs,
          measureTimeOffsetMs,
        };
        drawTimeBasedVerticalLines(renderCtx, verticalConfig, coords);
      }

      // Draw target notes with user pitch for hit detection
      // Use separate userPitch prop (falls back to config for backwards compat)
      const hwUserPitch = userPitch ?? highwayConfig.userPitch;
      if (highwayConfig.targetNotes && highwayConfig.targetNotes.length > 0) {
        drawTargetNotes(
          renderCtx,
          coords,
          highwayConfig.targetNotes,
          highwayConfig.currentTimeMs,
          userPitchConfig,
          fullRowData,
          hwUserPitch?.midi ?? null,
          hwUserPitch?.clarity ?? 0
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
    const hwUserPitchForIndicator = userPitch ?? highwayConfig.userPitch;
    if (hwUserPitchForIndicator && hwUserPitchForIndicator.clarity > 0.5) {
      drawUserPitchIndicator(
        renderCtx,
        coords,
        hwUserPitchForIndicator.midi,
        hwUserPitchForIndicator.clarity,
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
    const baseLineWidth = 3;
    const rowScaledLineWidth = (cellHeight / 40) * baseLineWidth;
    const lineWidth =
      typeof judgmentLineWidth === 'number' && Number.isFinite(judgmentLineWidth)
        ? judgmentLineWidth
        : clamp(rowScaledLineWidth, 1.25, 7);
    ctx.strokeStyle = judgmentLineColor;
    ctx.lineWidth = lineWidth;
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
      showLegendLabels,
      showAccidentalLabels,
      accidentalMode,
      focusedPitchClasses: focusedPitchClasses ?? null,
      focusColorsEnabled,
      highlight: legendHighlight,
      labelOverrides: legendLabelOverrides,
      midiLabelOverrides: legendMidiLabelOverrides,
      extendHorizontalGridLinesBehindLegend,
      horizontalGridReferencePitchClass,
      horizontalGridReferenceLineColor,
      horizontalGridDefaultLineColor,
      horizontalGridDefaultLineWidth,
      horizontalGridDashedLineWidth,
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
    void rowPositionOffsets;
    void colorMode;
    void degreeDisplayMode;
    void placedNotes;
    void placedTonicSigns;
    void columnWidths;
    void rowHighlight;
    void showHorizontalGridLines;
    void extendHorizontalGridLinesBehindLegend;
    void horizontalGridReferencePitchClass;
    void horizontalGridReferenceLineColor;
    void horizontalGridDefaultLineColor;
    void horizontalGridDefaultLineWidth;
    void horizontalGridDashedLineWidth;
    void judgmentLineColor;
    void judgmentLineWidth;
    void showLegendLabels;
    void showAccidentalLabels;
    void legendLabelOverrides;
    void legendMidiLabelOverrides;

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

</style>
