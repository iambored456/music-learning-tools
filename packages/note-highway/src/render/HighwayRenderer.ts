/**
 * Highway Renderer
 *
 * Main orchestrator for the note highway visualization.
 * Coordinates all sub-renderers in the correct order.
 *
 * Render order:
 * 1. Background
 * 2. Grid lines
 * 3. Tonic indicators
 * 4. Target notes
 * 5. Input trail
 * 6. Input cursor
 * 7. Judgment line (on top)
 */

import type { HighwayConfig, HighwayRenderState, HighwayViewport } from '../types.js';
import { DEFAULT_HIGHWAY_CONFIG } from '../constants.js';
import {
  createCoordinateMapper,
  type ICoordinateMapper,
  type CoordinateMapperConfig,
} from '../coordinate/CoordinateMapper.js';
import { createGridRenderer, type IGridRenderer } from './GridRenderer.js';
import { createNoteRenderer, type INoteRenderer } from './NoteRenderer.js';
import { createJudgmentLineRenderer, type IJudgmentLineRenderer } from './JudgmentLineRenderer.js';
import { createInputCursorRenderer, type IInputCursorRenderer } from './InputCursorRenderer.js';
import { createInputTrailRenderer, type IInputTrailRenderer } from './InputTrailRenderer.js';

export interface IHighwayRenderer {
  // Configuration
  updateConfig(config: Partial<HighwayConfig>): void;
  getConfig(): HighwayConfig;

  // Rendering
  render(ctx: CanvasRenderingContext2D, state: HighwayRenderState): void;

  // Coordinate access
  readonly coordinateMapper: ICoordinateMapper;

  // Sub-renderers (for testing/customization)
  readonly gridRenderer: IGridRenderer;
  readonly noteRenderer: INoteRenderer;
  readonly judgmentLineRenderer: IJudgmentLineRenderer;
  readonly inputCursorRenderer: IInputCursorRenderer;
  readonly inputTrailRenderer: IInputTrailRenderer;
}

/**
 * Create a highway renderer instance.
 */
export function createHighwayRenderer(config: Partial<HighwayConfig> = {}): IHighwayRenderer {
  // Merge with defaults
  const fullConfig: HighwayConfig = mergeConfig(DEFAULT_HIGHWAY_CONFIG, config);

  // Create coordinate mapper
  const coordinateMapper = createCoordinateMapper({
    viewportWidth: fullConfig.viewport.width,
    viewportHeight: fullConfig.viewport.height,
    minMidi: fullConfig.viewport.minMidi,
    maxMidi: fullConfig.viewport.maxMidi,
    judgmentLineFraction: fullConfig.judgmentLine.xPositionFraction,
    msVisibleAhead: fullConfig.scroll.msVisibleAhead,
    msVisibleBehind: fullConfig.scroll.msVisibleBehind,
  });

  // Create sub-renderers
  const gridRenderer = createGridRenderer();
  const noteRenderer = createNoteRenderer();
  const judgmentLineRenderer = createJudgmentLineRenderer();
  const inputCursorRenderer = createInputCursorRenderer();
  const inputTrailRenderer = createInputTrailRenderer();

  /**
   * Deep merge configuration.
   */
  function mergeConfig(base: HighwayConfig, override: Partial<HighwayConfig>): HighwayConfig {
    return {
      viewport: { ...base.viewport, ...override.viewport },
      scroll: { ...base.scroll, ...override.scroll },
      judgmentLine: { ...base.judgmentLine, ...override.judgmentLine },
      inputCursor: { ...base.inputCursor, ...override.inputCursor },
      inputTrail: { ...base.inputTrail, ...override.inputTrail },
      noteRender: { ...base.noteRender, ...override.noteRender },
      gridRender: { ...base.gridRender, ...override.gridRender },
      tonicIndicator: { ...base.tonicIndicator, ...override.tonicIndicator },
      tonicPitchClass: override.tonicPitchClass ?? base.tonicPitchClass,
      backgroundColor: override.backgroundColor ?? base.backgroundColor,
    };
  }

  /**
   * Update configuration.
   */
  function updateConfig(newConfig: Partial<HighwayConfig>): void {
    Object.assign(fullConfig, mergeConfig(fullConfig, newConfig));

    // Update coordinate mapper if viewport changed
    if (newConfig.viewport) {
      coordinateMapper.setViewportSize(
        fullConfig.viewport.width,
        fullConfig.viewport.height
      );
      coordinateMapper.viewport.setMidiRange(
        fullConfig.viewport.minMidi,
        fullConfig.viewport.maxMidi
      );
    }

    if (newConfig.judgmentLine?.xPositionFraction !== undefined) {
      coordinateMapper.setJudgmentLineFraction(newConfig.judgmentLine.xPositionFraction);
    }

    if (newConfig.scroll) {
      coordinateMapper.scroll.updateConfig(newConfig.scroll);
    }
  }

  /**
   * Get current configuration.
   */
  function getConfig(): HighwayConfig {
    return { ...fullConfig };
  }

  /**
   * Main render function.
   */
  function render(ctx: CanvasRenderingContext2D, state: HighwayRenderState): void {
    const { viewport } = fullConfig;

    // 1. Clear and draw background
    ctx.fillStyle = fullConfig.backgroundColor;
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    // 2. Draw grid
    gridRenderer.render(
      ctx,
      state.beats,
      state.currentTimeMs,
      coordinateMapper,
      viewport,
      fullConfig.gridRender
    );

    // 3. Draw tonic indicators (pitch-center highlights)
    if (fullConfig.tonicIndicator.enabled) {
      drawTonicIndicators(ctx, viewport);
    }

    // 4. Draw target notes
    const renderableNotes = coordinateMapper.notesToRenderables(
      state.notes,
      state.currentTimeMs,
      fullConfig.noteRender.noteHeight,
      state.activeNoteIds,
      state.passedNoteIds,
      state.judgments
    );
    noteRenderer.render(ctx, renderableNotes, fullConfig.noteRender);

    // 5. Draw input trail
    inputTrailRenderer.render(
      ctx,
      state.inputTrail,
      state.currentTimeMs,
      coordinateMapper,
      fullConfig.inputTrail
    );

    // 6. Draw input cursor
    inputCursorRenderer.render(
      ctx,
      state.inputCursor,
      coordinateMapper.getJudgmentLineX(),
      coordinateMapper,
      fullConfig.inputCursor
    );

    // 7. Draw judgment line (on top)
    judgmentLineRenderer.render(
      ctx,
      coordinateMapper.getJudgmentLineX(),
      viewport,
      state.inputCursor.isInTolerance,
      state.inputCursor.isVoiced,
      fullConfig.judgmentLine
    );

    // 8. Draw gate overlay if active
    if (state.isGated) {
      drawGateOverlay(ctx, viewport);
    }
  }

  /**
   * Draw tonic pitch class row highlights.
   */
  function drawTonicIndicators(
    ctx: CanvasRenderingContext2D,
    viewport: HighwayViewport
  ): void {
    const { minMidi, maxMidi } = coordinateMapper.viewport.getVisibleMidiRange();
    const rowHeight = coordinateMapper.viewport.getRowHeight();
    const tonicPitchClass = fullConfig.tonicPitchClass;

    ctx.fillStyle = fullConfig.tonicIndicator.highlightColor;
    ctx.globalAlpha = fullConfig.tonicIndicator.highlightOpacity;

    for (let midi = minMidi; midi <= maxMidi; midi++) {
      // Check if this pitch class matches the tonic
      const pitchClass = midi % 12;
      if (pitchClass === tonicPitchClass) {
        const y = coordinateMapper.viewport.midiToY(midi);
        ctx.fillRect(0, y - rowHeight / 2, viewport.width, rowHeight);
      }
    }

    ctx.globalAlpha = 1;
  }

  /**
   * Draw overlay when gate is active (lesson mode paused).
   */
  function drawGateOverlay(
    ctx: CanvasRenderingContext2D,
    viewport: HighwayViewport
  ): void {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    // Paused indicator
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Match the pitch to continue', viewport.width / 2, viewport.height / 2);
  }

  return {
    updateConfig,
    getConfig,
    render,
    coordinateMapper,
    gridRenderer,
    noteRenderer,
    judgmentLineRenderer,
    inputCursorRenderer,
    inputTrailRenderer,
  };
}
