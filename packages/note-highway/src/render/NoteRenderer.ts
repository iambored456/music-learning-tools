/**
 * Note Renderer
 *
 * Renders target notes as stadium (pill) shapes or rectangles.
 * Supports:
 * - Multiple note states (active, passed, upcoming)
 * - Accuracy-based coloring for passed notes
 * - Stadium (pill) or rectangle shapes
 */

import type { RenderableNote, NoteRenderConfig } from '../types.js';
import { DEFAULT_NOTE_RENDER_CONFIG } from '../constants.js';

export interface INoteRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    notes: RenderableNote[],
    config?: Partial<NoteRenderConfig>
  ): void;
}

/**
 * Create a note renderer.
 */
export function createNoteRenderer(): INoteRenderer {
  /**
   * Render all notes.
   */
  function render(
    ctx: CanvasRenderingContext2D,
    notes: RenderableNote[],
    config: Partial<NoteRenderConfig> = {}
  ): void {
    const fullConfig: NoteRenderConfig = {
      ...DEFAULT_NOTE_RENDER_CONFIG,
      ...config,
    };

    // Sort notes: passed first, then upcoming, active on top
    const sortedNotes = [...notes].sort((a, b) => {
      if (a.isActive && !b.isActive) return 1;
      if (!a.isActive && b.isActive) return -1;
      if (a.isPassed && !b.isPassed) return -1;
      if (!a.isPassed && b.isPassed) return 1;
      return 0;
    });

    for (const note of sortedNotes) {
      drawNote(ctx, note, fullConfig);
    }
  }

  /**
   * Draw a single note.
   */
  function drawNote(
    ctx: CanvasRenderingContext2D,
    note: RenderableNote,
    config: NoteRenderConfig
  ): void {
    const { x, y, width, height, isActive, isPassed, accuracy } = note;
    const color = note.note.color;

    // Determine opacity
    let opacity: number;
    if (isActive) {
      opacity = config.activeNoteOpacity;
    } else if (isPassed) {
      opacity = config.passedNoteOpacity;
    } else {
      opacity = config.upcomingNoteOpacity;
    }

    // For passed notes, adjust color based on accuracy
    let fillColor = color;
    if (isPassed && accuracy !== undefined) {
      fillColor = getAccuracyColor(color, accuracy);
    }

    // Apply opacity
    ctx.globalAlpha = opacity;

    // Draw the note shape
    if (config.glyphStyle === 'stadium') {
      drawStadium(ctx, x, y - height / 2, width, height, config.stadiumRadius, fillColor, config);
    } else if (config.glyphStyle === 'rectangle') {
      drawRectangle(ctx, x, y - height / 2, width, height, fillColor, config);
    } else {
      // oval
      drawOval(ctx, x, y - height / 2, width, height, fillColor, config);
    }

    // Reset opacity
    ctx.globalAlpha = 1;
  }

  /**
   * Draw a stadium (pill) shape.
   */
  function drawStadium(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    color: string,
    config: NoteRenderConfig
  ): void {
    // Clamp radius to half the height
    const r = Math.min(radius, height / 2, width / 2);

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.arcTo(x + width, y, x + width, y + r, r);
    ctx.lineTo(x + width, y + height - r);
    ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
    ctx.lineTo(x + r, y + height);
    ctx.arcTo(x, y + height, x, y + height - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.fill();

    if (config.borderWidth > 0) {
      ctx.strokeStyle = config.borderColor;
      ctx.lineWidth = config.borderWidth;
      ctx.stroke();
    }
  }

  /**
   * Draw a rectangle.
   */
  function drawRectangle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    config: NoteRenderConfig
  ): void {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);

    if (config.borderWidth > 0) {
      ctx.strokeStyle = config.borderColor;
      ctx.lineWidth = config.borderWidth;
      ctx.strokeRect(x, y, width, height);
    }
  }

  /**
   * Draw an oval/ellipse.
   */
  function drawOval(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    config: NoteRenderConfig
  ): void {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const radiusX = width / 2;
    const radiusY = height / 2;

    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.fill();

    if (config.borderWidth > 0) {
      ctx.strokeStyle = config.borderColor;
      ctx.lineWidth = config.borderWidth;
      ctx.stroke();
    }
  }

  /**
   * Adjust color based on accuracy.
   * High accuracy keeps original color, low accuracy shifts toward red.
   */
  function getAccuracyColor(baseColor: string, accuracy: number): string {
    // Parse the hex color
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Blend toward gray/red based on accuracy
    // 1.0 = full color, 0.0 = desaturated/reddish
    const desaturateFactor = 1 - accuracy;

    // Calculate grayscale
    const gray = (r + g + b) / 3;

    // Blend toward gray
    const newR = Math.round(r + (gray - r) * desaturateFactor * 0.5);
    const newG = Math.round(g + (gray - g) * desaturateFactor * 0.7);
    const newB = Math.round(b + (gray - b) * desaturateFactor * 0.7);

    return `rgb(${newR}, ${newG}, ${newB})`;
  }

  return { render };
}
