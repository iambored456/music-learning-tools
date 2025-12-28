/**
 * Grid Renderer
 *
 * Renders the background grid including:
 * - Vertical beat/measure lines
 * - Horizontal pitch row lines
 */

import type { SessionTimeMs, TimedBeat } from '@mlt/rhythm-core';
import type { GridRenderConfig, HighwayViewport } from '../types.js';
import type { ICoordinateMapper } from '../coordinate/CoordinateMapper.js';
import { DEFAULT_GRID_RENDER_CONFIG } from '../constants.js';

export interface IGridRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    beats: TimedBeat[],
    currentTimeMs: SessionTimeMs,
    coordinateMapper: ICoordinateMapper,
    viewport: HighwayViewport,
    config?: Partial<GridRenderConfig>
  ): void;
}

/**
 * Create a grid renderer.
 */
export function createGridRenderer(): IGridRenderer {
  /**
   * Render the grid.
   */
  function render(
    ctx: CanvasRenderingContext2D,
    beats: TimedBeat[],
    currentTimeMs: SessionTimeMs,
    coordinateMapper: ICoordinateMapper,
    viewport: HighwayViewport,
    config: Partial<GridRenderConfig> = {}
  ): void {
    const fullConfig: GridRenderConfig = {
      ...DEFAULT_GRID_RENDER_CONFIG,
      ...config,
    };

    // Draw horizontal pitch row lines
    if (fullConfig.showPitchRows) {
      drawPitchRowLines(ctx, viewport, coordinateMapper, fullConfig);
    }

    // Draw vertical beat lines
    drawBeatLines(ctx, beats, currentTimeMs, coordinateMapper, viewport, fullConfig);
  }

  /**
   * Draw horizontal lines for each pitch row.
   */
  function drawPitchRowLines(
    ctx: CanvasRenderingContext2D,
    viewport: HighwayViewport,
    coordinateMapper: ICoordinateMapper,
    config: GridRenderConfig
  ): void {
    const { minMidi, maxMidi } = coordinateMapper.viewport.getVisibleMidiRange();
    const rowHeight = coordinateMapper.viewport.getRowHeight();

    ctx.strokeStyle = config.pitchRowColor;
    ctx.lineWidth = config.pitchRowWidth;
    ctx.beginPath();

    for (let midi = minMidi; midi <= maxMidi; midi++) {
      const y = coordinateMapper.viewport.midiToY(midi);
      // Draw line at top of row
      const lineY = y - rowHeight / 2;

      ctx.moveTo(0, lineY);
      ctx.lineTo(viewport.width, lineY);
    }

    ctx.stroke();
  }

  /**
   * Draw vertical beat lines.
   */
  function drawBeatLines(
    ctx: CanvasRenderingContext2D,
    beats: TimedBeat[],
    currentTimeMs: SessionTimeMs,
    coordinateMapper: ICoordinateMapper,
    viewport: HighwayViewport,
    config: GridRenderConfig
  ): void {
    for (const beat of beats) {
      const x = coordinateMapper.beatToX(beat, currentTimeMs);
      if (x === null) continue;

      // Determine line style based on beat type
      let color: string | null = null;
      let lineWidth = 1;

      if (beat.isMeasureStart && config.showMeasures) {
        color = config.measureColor;
        lineWidth = config.measureWidth;
      } else if (beat.isMacrobeat && config.showMacrobeats) {
        color = config.macrobeatColor;
        lineWidth = config.macrobeatWidth;
      } else if (config.showMicrobeats) {
        color = config.microbeatColor;
        lineWidth = config.microbeatWidth;
      }

      if (color !== null) {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, viewport.height);
        ctx.stroke();
      }
    }
  }

  return { render };
}
