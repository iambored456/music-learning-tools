/**
 * Input Trail Renderer
 *
 * Renders the pitch trail - a persistent "paintbrush" of
 * detected pitch over time that scrolls with the grid.
 */

import type { SessionTimeMs } from '@mlt/rhythm-core';
import type { InputTrailConfig, InputTrailPoint, CanvasPoint } from '../types.js';
import type { ICoordinateMapper } from '../coordinate/CoordinateMapper.js';
import { DEFAULT_INPUT_TRAIL_CONFIG } from '../constants.js';

/**
 * A trail point with computed canvas coordinates.
 */
interface RenderableTrailPoint {
  x: number;
  y: number;
  clarity: number;
  color: [number, number, number];
}

export interface IInputTrailRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    trail: InputTrailPoint[],
    currentTimeMs: SessionTimeMs,
    coordinateMapper: ICoordinateMapper,
    config?: Partial<InputTrailConfig>
  ): void;
}

/**
 * Create an input trail renderer.
 */
export function createInputTrailRenderer(): IInputTrailRenderer {
  /**
   * Render the input trail.
   */
  function render(
    ctx: CanvasRenderingContext2D,
    trail: InputTrailPoint[],
    currentTimeMs: SessionTimeMs,
    coordinateMapper: ICoordinateMapper,
    config: Partial<InputTrailConfig> = {}
  ): void {
    const fullConfig: InputTrailConfig = {
      ...DEFAULT_INPUT_TRAIL_CONFIG,
      ...config,
    };

    if (trail.length === 0) {
      return;
    }

    // Filter and transform trail points
    const points = transformTrailPoints(
      trail,
      currentTimeMs,
      coordinateMapper,
      fullConfig
    );

    if (points.length === 0) {
      return;
    }

    // Draw connections first (so points are on top)
    if (fullConfig.showConnections) {
      drawConnections(ctx, points, fullConfig);
    }

    // Draw points
    drawPoints(ctx, points, fullConfig);
  }

  /**
   * Transform trail points to canvas coordinates.
   */
  function transformTrailPoints(
    trail: InputTrailPoint[],
    currentTimeMs: SessionTimeMs,
    coordinateMapper: ICoordinateMapper,
    config: InputTrailConfig
  ): RenderableTrailPoint[] {
    const points: RenderableTrailPoint[] = [];

    for (const point of trail) {
      // Skip low-clarity points
      if (point.clarity < config.clarityThreshold) {
        continue;
      }

      // Skip unvoiced points
      if (!point.isVoiced) {
        continue;
      }

      // Convert to canvas coordinates
      const canvasPoint = coordinateMapper.pitchSampleToPoint(point, currentTimeMs);
      if (!canvasPoint) {
        continue;
      }

      // Get color (default to white if not specified)
      const color = point.color ?? [255, 255, 255];

      points.push({
        x: canvasPoint.x,
        y: canvasPoint.y,
        clarity: point.clarity,
        color,
      });
    }

    return points;
  }

  /**
   * Draw connection lines between nearby points.
   */
  function drawConnections(
    ctx: CanvasRenderingContext2D,
    points: RenderableTrailPoint[],
    config: InputTrailConfig
  ): void {
    if (points.length < 2) {
      return;
    }

    ctx.strokeStyle = config.connectionColor;
    ctx.lineWidth = config.connectionLineWidth;
    ctx.beginPath();

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];

      // Calculate distance
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Only connect nearby points
      if (distance <= config.connectionThreshold) {
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
      }
    }

    ctx.stroke();
  }

  /**
   * Draw trail points.
   */
  function drawPoints(
    ctx: CanvasRenderingContext2D,
    points: RenderableTrailPoint[],
    config: InputTrailConfig
  ): void {
    for (const point of points) {
      const opacity = Math.min(point.clarity * config.maxOpacity, 1);
      const [r, g, b] = point.color;

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, config.pointRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return { render };
}
