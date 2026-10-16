import type {
  DerivedGuideLine,
  TimedBoomwhackerNote,
} from '@mlt/boomwhacker-video-builder-core';

const NOTE_MIN_WIDTH_PX = 4;
const NOTE_MIN_SHAPE_SIZE_PX = 12;
const NOTE_MIN_LANE_INNER_HEIGHT_PX = 2;
const NOTE_LABEL_MIN_FONT_PX = 7;
const NOTE_LABEL_MIN_HEIGHT_PX = 18;
const NOTE_LABEL_MIN_WIDTH_BY_SHAPE: Record<TimedBoomwhackerNote['shape'], number> = {
  circle: 14,
  oval: 10,
  diamond: 6,
};
const NOTE_LABEL_HEIGHT_SCALE_BY_SHAPE: Record<TimedBoomwhackerNote['shape'], number> = {
  circle: 0.5,
  oval: 0.46,
  diamond: 0.24,
};

export type HighwayNoteLayout = {
  left: number;
  width: number;
  top: number;
  height: number;
  labelFontPx: number;
  showLabel: boolean;
};

function getLabelFontPx(
  shape: TimedBoomwhackerNote['shape'],
  width: number,
  height: number,
): number {
  const heightScaledFontPx = height * NOTE_LABEL_HEIGHT_SCALE_BY_SHAPE[shape];
  const widthAllowancePx = shape === 'diamond'
    ? Math.max(NOTE_LABEL_MIN_FONT_PX, width * 1.15)
    : heightScaledFontPx;

  return Math.max(NOTE_LABEL_MIN_FONT_PX, Math.min(heightScaledFontPx, widthAllowancePx));
}

export function getVisibleHighwayGuides(guides: DerivedGuideLine[]): DerivedGuideLine[] {
  return guides.filter((guide) => guide.kind !== 'subdivision');
}

export function getHighwayTimeX(
  timeSec: number,
  referenceTimeSec: number,
  referenceX: number,
  pixelsPerSecond: number,
): number {
  return referenceX + ((timeSec - referenceTimeSec) * pixelsPerSecond);
}

export function shouldRenderGuideAsBeat(guide: DerivedGuideLine): boolean {
  return guide.kind === 'beat' || guide.kind === 'measure' || guide.kind === 'count-in';
}

export function getHighwayNoteLayout(options: {
  note: Pick<TimedBoomwhackerNote, 'shape'>;
  startX: number;
  endX: number;
  visualRow: number;
  laneHeightPx: number;
  isSustained?: boolean;
}): HighwayNoteLayout {
  const spanWidthPx = Math.max(1, options.endX - options.startX);
  const laneInnerHeight = Math.max(NOTE_MIN_LANE_INNER_HEIGHT_PX, options.laneHeightPx);
  const minShapeSize = Math.min(NOTE_MIN_SHAPE_SIZE_PX, laneInnerHeight);
  const durationWidth = Math.max(NOTE_MIN_WIDTH_PX, spanWidthPx);
  const height = Math.max(minShapeSize, laneInnerHeight);
  const width = options.note.shape === 'circle'
    ? options.isSustained
      ? durationWidth
      : height
    : durationWidth;
  // Center symbols within their occupied grid span; audio still starts at startX's time.
  const left = options.startX + ((spanWidthPx - width) / 2);
  const top = (options.visualRow * options.laneHeightPx) + ((options.laneHeightPx - height) / 2);
  const labelFontPx = getLabelFontPx(options.note.shape, width, height);

  return {
    left,
    width,
    top,
    height,
    labelFontPx,
    showLabel: width >= NOTE_LABEL_MIN_WIDTH_BY_SHAPE[options.note.shape] && height >= NOTE_LABEL_MIN_HEIGHT_PX,
  };
}
