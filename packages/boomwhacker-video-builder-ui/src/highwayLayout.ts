import type {
  DerivedBeatSpan,
  DerivedTimingModel,
  DerivedGuideLine,
  TimedBoomwhackerNote,
} from '@mlt/boomwhacker-video-builder-core';

const NOTE_VERTICAL_INSET_PX = 6;
const NOTE_MIN_WIDTH_PX = 4;
const NOTE_HORIZONTAL_INSET_RATIO = 0.12;
const NOTE_HORIZONTAL_INSET_MIN_PX = 1;
const NOTE_HORIZONTAL_INSET_MAX_PX = 4;
const NOTE_LABEL_MIN_WIDTH_PX = 22;
const NOTE_LABEL_MIN_HEIGHT_PX = 24;
const NOTE_LABEL_MIN_FONT_PX = 9;
const NOTE_LABEL_MAX_FONT_PX = 18;

export type HighwayNoteLayout = {
  left: number;
  width: number;
  top: number;
  height: number;
  labelFontPx: number;
  showLabel: boolean;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getHorizontalInset(spanWidthPx: number): number {
  const cappedIdealInset = clamp(
    spanWidthPx * NOTE_HORIZONTAL_INSET_RATIO,
    NOTE_HORIZONTAL_INSET_MIN_PX,
    NOTE_HORIZONTAL_INSET_MAX_PX,
  );
  const maxAllowedInset = Math.max(0, (spanWidthPx - NOTE_MIN_WIDTH_PX) / 2);
  return Math.min(cappedIdealInset, maxAllowedInset);
}

export function getVisibleHighwayGuides(guides: DerivedGuideLine[]): DerivedGuideLine[] {
  return guides.filter((guide) => guide.kind !== 'subdivision');
}

export function getActiveHighwayBeatSpan(
  timing: DerivedTimingModel,
  currentTimeSec: number,
): DerivedBeatSpan | null {
  for (const span of timing.beatSpans) {
    if (currentTimeSec < span.endTimeSec) {
      return span;
    }
  }

  return null;
}

export function getHighwayJudgmentAreaWidthPx(
  beatSpan: Pick<DerivedBeatSpan, 'durationSec'>,
  pixelsPerSecond: number,
): number {
  return Math.max(2, Math.max(0, beatSpan.durationSec) * Math.max(0, pixelsPerSecond));
}

export function shouldHighlightDownbeatGuide(guide: DerivedGuideLine): boolean {
  return guide.kind === 'downbeat' && guide.beatIndex > 0;
}

export function shouldRenderGuideAsBeat(guide: DerivedGuideLine): boolean {
  return guide.kind === 'beat' || (guide.kind === 'downbeat' && guide.beatIndex === 0);
}

export function getHighwayNoteLayout(options: {
  note: Pick<TimedBoomwhackerNote, 'shape'>;
  startX: number;
  endX: number;
  visualRow: number;
  laneHeightPx: number;
}): HighwayNoteLayout {
  const spanWidthPx = Math.max(1, options.endX - options.startX);
  const horizontalInsetPx = getHorizontalInset(spanWidthPx);
  const width = Math.max(NOTE_MIN_WIDTH_PX, spanWidthPx - (horizontalInsetPx * 2));
  const left = options.startX + ((spanWidthPx - width) / 2);
  const height = Math.max(24, options.laneHeightPx - (NOTE_VERTICAL_INSET_PX * 2));
  const top = (options.visualRow * options.laneHeightPx) + NOTE_VERTICAL_INSET_PX;
  const fontWidthFactor = options.note.shape === 'diamond' ? 0.58 : 0.52;
  const labelFontPx = clamp(
    Math.min(width * fontWidthFactor, height * 0.46),
    NOTE_LABEL_MIN_FONT_PX,
    NOTE_LABEL_MAX_FONT_PX,
  );

  return {
    left,
    width,
    top,
    height,
    labelFontPx,
    showLabel: width >= NOTE_LABEL_MIN_WIDTH_PX && height >= NOTE_LABEL_MIN_HEIGHT_PX,
  };
}
