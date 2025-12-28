/**
 * Pitch Trail Renderer
 *
 * Core rendering class for pitch trail visualization.
 * Draws real-time pitch data as colored, connected points on a canvas.
 */

import type {
  PitchPoint,
  RenderablePoint,
  PitchTrailConfig,
  RequiredPitchTrailConfig,
  PitchTrailViewport,
} from './types.js';
import { DEFAULT_CONFIG } from './constants.js';
import { transformPointsToRenderSpace } from './coordinateMappers.js';
import { findConnections } from './proximityGraph.js';

/**
 * Pitch trail renderer for real-time pitch visualization.
 *
 * @example
 * ```typescript
 * const renderer = new PitchTrailRenderer({ timeWindow: 4000 });
 *
 * function animate() {
 *   renderer.render(ctx, pitchHistory, {
 *     width: canvas.width,
 *     height: canvas.height,
 *     midiRange: { minMidi: 48, maxMidi: 72 },
 *     currentTime: performance.now()
 *   });
 *   requestAnimationFrame(animate);
 * }
 * ```
 */
export class PitchTrailRenderer {
  private config: RequiredPitchTrailConfig;

  /**
   * Create a new pitch trail renderer.
   *
   * @param config - Configuration options (defaults will be used for unspecified options)
   */
  constructor(config: PitchTrailConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get the current configuration.
   */
  getConfig(): RequiredPitchTrailConfig {
    return { ...this.config };
  }

  /**
   * Update configuration at runtime.
   * Useful for changing tonic or other settings without recreating the renderer.
   *
   * @param partialConfig - Partial configuration to merge
   */
  updateConfig(partialConfig: Partial<PitchTrailConfig>): void {
    this.config = { ...this.config, ...partialConfig };
  }

  /**
   * Render pitch trail to the provided canvas context.
   * Call this on each animation frame.
   *
   * @param ctx - Canvas 2D rendering context
   * @param history - Array of pitch points from the detector
   * @param viewport - Viewport configuration for coordinate mapping
   */
  render(
    ctx: CanvasRenderingContext2D,
    history: PitchPoint[],
    viewport: PitchTrailViewport
  ): void {
    // Clear canvas
    ctx.clearRect(0, 0, viewport.width, viewport.height);

    if (history.length < 1) return;

    // Transform raw pitch points to renderable coordinates
    const points = transformPointsToRenderSpace(history, viewport, this.config);

    if (points.length < 1) return;

    // Draw connector lines first (so circles are on top)
    this.drawConnections(ctx, points);

    // Draw colored circles
    this.drawPoints(ctx, points);
  }

  /**
   * Transform points without rendering.
   * Useful for testing or custom rendering scenarios.
   *
   * @param history - Array of pitch points from the detector
   * @param viewport - Viewport configuration for coordinate mapping
   * @returns Array of renderable points
   */
  transformPoints(
    history: PitchPoint[],
    viewport: PitchTrailViewport
  ): RenderablePoint[] {
    return transformPointsToRenderSpace(history, viewport, this.config);
  }

  /**
   * Draw connection lines between nearby points.
   */
  private drawConnections(
    ctx: CanvasRenderingContext2D,
    points: RenderablePoint[]
  ): void {
    const connections = findConnections(
      points,
      this.config.proximityThreshold,
      this.config.maxConnections
    );

    ctx.strokeStyle = this.config.lineColor;
    ctx.lineWidth = this.config.lineWidth;
    ctx.beginPath();

    for (const [i, j] of connections) {
      ctx.moveTo(points[i].x, points[i].y);
      ctx.lineTo(points[j].x, points[j].y);
    }

    ctx.stroke();
  }

  /**
   * Draw colored circles for each point.
   */
  private drawPoints(
    ctx: CanvasRenderingContext2D,
    points: RenderablePoint[]
  ): void {
    for (const pt of points) {
      const opacity = Math.min(pt.clarity * this.config.maxOpacity, 1);
      ctx.fillStyle = `rgba(${pt.color[0]}, ${pt.color[1]}, ${pt.color[2]}, ${opacity})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, this.config.pointRadius, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
}
