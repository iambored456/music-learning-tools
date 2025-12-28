/**
 * Coordinate Mapper
 *
 * Combines ViewportModel and ScrollModel to provide complete
 * coordinate mapping between time/pitch space and canvas space.
 */

import type { SessionTimeMs, TimedNote, TimedBeat, PitchSample } from '@mlt/rhythm-core';
import type { CanvasRect, CanvasPoint, RenderableNote, InputTrailPoint } from '../types.js';
import { createViewportModel, type IViewportModel } from '../viewport/ViewportModel.js';
import { createScrollModel, type IScrollModel } from '../viewport/ScrollModel.js';

export interface ICoordinateMapper {
  // Access to underlying models
  readonly viewport: IViewportModel;
  readonly scroll: IScrollModel;

  // Note mapping
  noteToRect(
    note: TimedNote,
    currentTimeMs: SessionTimeMs,
    noteHeight: number
  ): CanvasRect | null;

  // Batch note mapping
  notesToRenderables(
    notes: TimedNote[],
    currentTimeMs: SessionTimeMs,
    noteHeight: number,
    activeNoteIds: Set<string>,
    passedNoteIds: Set<string>,
    judgments: Map<string, number>
  ): RenderableNote[];

  // Beat mapping
  beatToX(beat: TimedBeat, currentTimeMs: SessionTimeMs): number | null;

  // Input mapping
  pitchSampleToPoint(
    sample: PitchSample | InputTrailPoint,
    currentTimeMs: SessionTimeMs
  ): CanvasPoint | null;

  // Judgment line
  getJudgmentLineX(): number;

  // Configuration
  setViewportSize(width: number, height: number): void;
  setJudgmentLineFraction(fraction: number): void;
}

export interface CoordinateMapperConfig {
  viewportWidth: number;
  viewportHeight: number;
  minMidi: number;
  maxMidi: number;
  judgmentLineFraction: number;
  msVisibleAhead: number;
  msVisibleBehind: number;
}

/**
 * Create a coordinate mapper instance.
 */
export function createCoordinateMapper(config: Partial<CoordinateMapperConfig> = {}): ICoordinateMapper {
  const fullConfig: CoordinateMapperConfig = {
    viewportWidth: 800,
    viewportHeight: 400,
    minMidi: 48,
    maxMidi: 72,
    judgmentLineFraction: 0.25,
    msVisibleAhead: 4000,
    msVisibleBehind: 1000,
    ...config,
  };

  let {
    viewportWidth,
    viewportHeight,
    minMidi,
    maxMidi,
    judgmentLineFraction,
    msVisibleAhead,
    msVisibleBehind,
  } = fullConfig;

  // Create sub-models
  const viewport = createViewportModel({
    width: viewportWidth,
    height: viewportHeight,
    minMidi,
    maxMidi,
  });

  const scroll = createScrollModel(
    {
      msVisibleAhead,
      msVisibleBehind,
      pixelsPerMs: calculatePixelsPerMs(),
    },
    viewportWidth
  );

  /**
   * Calculate pixels per millisecond.
   */
  function calculatePixelsPerMs(): number {
    // The area ahead of judgment line shows msVisibleAhead
    const aheadWidth = viewportWidth * (1 - judgmentLineFraction);
    return aheadWidth / msVisibleAhead;
  }

  /**
   * Recalculate scroll config when dimensions change.
   */
  function recalculateScroll(): void {
    scroll.updateConfig({
      pixelsPerMs: calculatePixelsPerMs(),
    });
  }

  /**
   * Get the judgment line X position.
   */
  function getJudgmentLineX(): number {
    return viewportWidth * judgmentLineFraction;
  }

  /**
   * Convert a note to a canvas rectangle.
   * Returns null if the note is not visible.
   */
  function noteToRect(
    note: TimedNote,
    currentTimeMs: SessionTimeMs,
    noteHeight: number
  ): CanvasRect | null {
    // Check if note is visible
    if (!scroll.isTimeVisible(note.startTimeMs, currentTimeMs) &&
        !scroll.isTimeVisible(note.endTimeMs, currentTimeMs)) {
      // Neither start nor end is visible, but note might span across viewport
      const range = scroll.getVisibleTimeRange(currentTimeMs);
      if (note.endTimeMs < range.startMs || note.startTimeMs > range.endMs) {
        return null;
      }
    }

    // Calculate X positions
    const xStart = scroll.timeToX(note.startTimeMs, currentTimeMs);
    const xEnd = scroll.timeToX(note.endTimeMs, currentTimeMs);
    const width = xEnd - xStart;

    // Calculate Y position
    const y = viewport.midiToY(note.midiPitch);

    return {
      x: xStart,
      y: y - noteHeight / 2,
      width: Math.max(width, 1), // Minimum 1px width
      height: noteHeight,
    };
  }

  /**
   * Convert notes to renderable objects.
   */
  function notesToRenderables(
    notes: TimedNote[],
    currentTimeMs: SessionTimeMs,
    noteHeight: number,
    activeNoteIds: Set<string>,
    passedNoteIds: Set<string>,
    judgments: Map<string, number>
  ): RenderableNote[] {
    const renderables: RenderableNote[] = [];

    for (const note of notes) {
      const rect = noteToRect(note, currentTimeMs, noteHeight);
      if (!rect) continue;

      const isActive = activeNoteIds.has(note.id);
      const isPassed = passedNoteIds.has(note.id);
      const accuracy = judgments.get(note.id);

      renderables.push({
        note,
        x: rect.x,
        y: rect.y + noteHeight / 2, // Center Y
        width: rect.width,
        height: rect.height,
        isActive,
        isPassed,
        accuracy,
      });
    }

    return renderables;
  }

  /**
   * Convert a beat to an X coordinate.
   * Returns null if not visible.
   */
  function beatToX(beat: TimedBeat, currentTimeMs: SessionTimeMs): number | null {
    if (!scroll.isTimeVisible(beat.timeMs, currentTimeMs)) {
      return null;
    }

    return scroll.timeToX(beat.timeMs, currentTimeMs);
  }

  /**
   * Convert a pitch sample or trail point to a canvas point.
   * Returns null if not visible.
   */
  function pitchSampleToPoint(
    sample: PitchSample | InputTrailPoint,
    currentTimeMs: SessionTimeMs
  ): CanvasPoint | null {
    if (!scroll.isTimeVisible(sample.timeMs, currentTimeMs)) {
      return null;
    }

    const x = scroll.timeToX(sample.timeMs, currentTimeMs);
    const y = viewport.midiToY(sample.midiPitch);

    return { x, y };
  }

  /**
   * Set viewport dimensions.
   */
  function setViewportSize(width: number, height: number): void {
    viewportWidth = width;
    viewportHeight = height;
    viewport.updateConfig({ width, height });
    recalculateScroll();
  }

  /**
   * Set judgment line position.
   */
  function setJudgmentLineFraction(fraction: number): void {
    judgmentLineFraction = Math.max(0.1, Math.min(0.9, fraction));
    recalculateScroll();
  }

  return {
    viewport,
    scroll,
    noteToRect,
    notesToRenderables,
    beatToX,
    pitchSampleToPoint,
    getJudgmentLineX,
    setViewportSize,
    setJudgmentLineFraction,
  };
}
