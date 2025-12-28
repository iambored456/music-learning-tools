/**
 * Judgment Line Renderer
 *
 * Renders the static vertical judgment line.
 * Optionally shows a glow effect indicating pitch accuracy.
 */

import type { JudgmentLineConfig, HighwayViewport } from '../types.js';
import { DEFAULT_JUDGMENT_LINE_CONFIG } from '../constants.js';

export interface IJudgmentLineRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    x: number,
    viewport: HighwayViewport,
    isInTolerance: boolean,
    isVoiced: boolean,
    config?: Partial<JudgmentLineConfig>
  ): void;
}

/**
 * Create a judgment line renderer.
 */
export function createJudgmentLineRenderer(): IJudgmentLineRenderer {
  /**
   * Render the judgment line.
   */
  function render(
    ctx: CanvasRenderingContext2D,
    x: number,
    viewport: HighwayViewport,
    isInTolerance: boolean,
    isVoiced: boolean,
    config: Partial<JudgmentLineConfig> = {}
  ): void {
    const fullConfig: JudgmentLineConfig = {
      ...DEFAULT_JUDGMENT_LINE_CONFIG,
      ...config,
    };

    // Draw glow effect if enabled and voiced
    if (fullConfig.showGlow && isVoiced) {
      drawGlow(ctx, x, viewport.height, isInTolerance, fullConfig);
    }

    // Draw the main line
    ctx.strokeStyle = fullConfig.color;
    ctx.lineWidth = fullConfig.lineWidth;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, viewport.height);
    ctx.stroke();
  }

  /**
   * Draw the glow effect behind the line.
   */
  function drawGlow(
    ctx: CanvasRenderingContext2D,
    x: number,
    height: number,
    isInTolerance: boolean,
    config: JudgmentLineConfig
  ): void {
    const color = isInTolerance ? config.glowColorSuccess : config.glowColorFailure;
    const radius = config.glowRadius;

    // Create gradient for glow
    const gradient = ctx.createLinearGradient(x - radius, 0, x + radius, 0);

    // Parse color and create semi-transparent versions
    const baseColor = color;
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.3, `${baseColor}33`); // 20% opacity
    gradient.addColorStop(0.5, `${baseColor}66`); // 40% opacity
    gradient.addColorStop(0.7, `${baseColor}33`); // 20% opacity
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, 0, radius * 2, height);
  }

  return { render };
}
