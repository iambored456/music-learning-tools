import {
  BOOMWHACKER_LANES,
  getMinimumSlotSpanForShape,
  type BoomwhackerVideoBuilderProject,
  type DerivedGuideLine,
  type DerivedTimingModel,
  type TimedBoomwhackerNote,
} from '@mlt/boomwhacker-video-builder-core';
import {
  getActiveHighwayBeatSpan,
  getHighwayJudgmentAreaWidthPx,
  getHighwayNoteLayout,
} from '../highwayLayout.js';

const backgroundImageCache = new Map<string, Promise<HTMLImageElement>>();

const JUDGMENT_LINE_RATIO = 0.22;
const SECONDS_VISIBLE_AHEAD = 3.2;

type ExportFrameRenderParams = {
  canvas: HTMLCanvasElement;
  project: BoomwhackerVideoBuilderProject;
  timing: DerivedTimingModel;
  guides: DerivedGuideLine[];
  timedNotes: TimedBoomwhackerNote[];
  frameTimeSec: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getVisualLaneRow(row: number, laneCount: number): number {
  return (laneCount - 1) - row;
}

function roundRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function loadBackgroundImage(dataUrl: string): Promise<HTMLImageElement> {
  const existingPromise = backgroundImageCache.get(dataUrl);
  if (existingPromise) {
    return existingPromise;
  }

  const imagePromise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load export background image.'));
    image.src = dataUrl;
  });

  backgroundImageCache.set(dataUrl, imagePromise);
  return imagePromise;
}

function drawLaneMarker(
  context: CanvasRenderingContext2D,
  marker: 'underline' | 'overline' | 'none',
  x: number,
  y: number,
  width: number,
  thickness = 2,
): void {
  if (marker === 'none') {
    return;
  }

  const lineY = marker === 'underline' ? y + 9 : y - 21;
  context.save();
  context.beginPath();
  context.moveTo(x - (width / 2), lineY);
  context.lineTo(x + (width / 2), lineY);
  context.lineCap = 'round';
  context.lineWidth = thickness;
  context.strokeStyle = '#ffffff';
  context.stroke();
  context.restore();
}

function drawNoteLabelMarker(
  context: CanvasRenderingContext2D,
  marker: 'underline' | 'overline' | 'none',
  x: number,
  baselineY: number,
  fontSizePx: number,
): void {
  if (marker === 'none') {
    return;
  }

  const width = Math.max(8, fontSizePx * 0.72);
  const thickness = Math.max(1.5, fontSizePx * 0.075);
  const lineY = marker === 'underline'
    ? baselineY + (fontSizePx * 0.16)
    : baselineY - (fontSizePx * 0.86);
  context.save();
  context.beginPath();
  context.moveTo(x - (width / 2), lineY);
  context.lineTo(x + (width / 2), lineY);
  context.lineCap = 'round';
  context.lineWidth = thickness;
  context.strokeStyle = '#ffffff';
  context.stroke();
  context.restore();
}

function drawBackgroundCard(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  fillStyle: string | CanvasGradient,
  strokeStyle: string,
): void {
  roundRectPath(context, x, y, width, height, 18);
  context.fillStyle = fillStyle;
  context.fill();
  context.lineWidth = 1;
  context.strokeStyle = strokeStyle;
  context.stroke();
}

function drawPlaybackHighlightCell(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  if (width <= 0 || height <= 0) {
    return;
  }

  context.save();
  roundRectPath(context, x, y, width, height, 6);
  context.fillStyle = 'rgba(255, 249, 225, 0.46)';
  context.fill();

  const inset = 1;
  const innerWidth = Math.max(0, width - inset * 2);
  const innerHeight = Math.max(0, height - inset * 2);
  if (innerWidth > 0 && innerHeight > 0) {
    context.globalAlpha = 0.82;
    roundRectPath(context, x + inset, y + inset, innerWidth, innerHeight, 6);
    context.fillStyle = 'rgba(255, 214, 83, 0.48)';
    context.fill();
  }
  context.restore();
}

async function renderBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  project: BoomwhackerVideoBuilderProject,
): Promise<void> {
  context.clearRect(0, 0, width, height);

  if (!project.exportState.transparentBackground) {
    const { background } = project.exportState;
    if (background.type === 'solid') {
      context.fillStyle = background.color;
      context.fillRect(0, 0, width, height);
    } else if (background.type === 'gradient') {
      const gradient = context.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, background.topColor);
      gradient.addColorStop(1, background.bottomColor);
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
    } else if (background.imageDataUrl) {
      context.fillStyle = '#08111b';
      context.fillRect(0, 0, width, height);

      const image = await loadBackgroundImage(background.imageDataUrl);
      const fit = background.fit;
      const imageRatio = image.width / Math.max(1, image.height);
      const viewportRatio = width / Math.max(1, height);
      const shouldConstrainByWidth = fit === 'cover'
        ? imageRatio < viewportRatio
        : imageRatio > viewportRatio;
      const drawWidth = shouldConstrainByWidth ? width : height * imageRatio;
      const drawHeight = shouldConstrainByWidth ? width / Math.max(0.001, imageRatio) : height;
      const drawX = (width - drawWidth) / 2;
      const drawY = (height - drawHeight) / 2;

      context.save();
      context.globalAlpha = clamp(background.opacity, 0, 1);
      context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
      context.restore();
    }
  }

  const glowGradient = context.createRadialGradient(width * 0.16, height * 0.08, 0, width * 0.16, height * 0.08, width * 0.6);
  glowGradient.addColorStop(0, 'rgba(121, 187, 255, 0.18)');
  glowGradient.addColorStop(1, 'rgba(121, 187, 255, 0)');
  context.fillStyle = glowGradient;
  context.fillRect(0, 0, width, height);

  context.fillStyle = 'rgba(4, 8, 14, 0.28)';
  context.fillRect(0, 0, width, height);
}

function renderTitleCard(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  project: BoomwhackerVideoBuilderProject,
  timing: DerivedTimingModel,
  frameTimeSec: number,
): void {
  const { titleCard } = project.exportState;
  const songTimeSec = getExportSongTimeSec(project, timing, frameTimeSec);
  const countInStartTimeSec = timing.countInStartTimeSec;
  const firstBeatTimeSec = project.songTiming.firstBeatOffsetSec;
  if (!titleCard.enabled || songTimeSec < countInStartTimeSec || songTimeSec >= firstBeatTimeSec) {
    return;
  }

  const fadeOutDurationSec = Math.min(0.45, Math.max(0.18, timing.countInDurationSec * 0.2));
  const timeUntilFirstBeatSec = firstBeatTimeSec - songTimeSec;
  const fadeAlpha = timeUntilFirstBeatSec > fadeOutDurationSec
    ? 1
    : clamp(timeUntilFirstBeatSec / Math.max(0.001, fadeOutDurationSec), 0, 1);

  const cardWidth = Math.min(width * 0.72, 940);
  const cardHeight = Math.min(height * 0.22, 250);
  const cardX = (width - cardWidth) / 2;
  const cardY = height * 0.12;

  context.save();
  context.globalAlpha = fadeAlpha;
  const cardGradient = context.createLinearGradient(cardX, cardY, cardX + cardWidth, cardY + cardHeight);
  cardGradient.addColorStop(0, 'rgba(14, 22, 35, 0.86)');
  cardGradient.addColorStop(1, 'rgba(8, 14, 24, 0.76)');
  drawBackgroundCard(
    context,
    cardX,
    cardY,
    cardWidth,
    cardHeight,
    cardGradient,
    'rgba(149, 181, 226, 0.24)',
  );

  context.textAlign = 'center';
  context.fillStyle = '#edf4ff';
  context.font = `700 ${Math.round(cardHeight * 0.26)}px "Atkinson Hyperlegible Next", system-ui, sans-serif`;
  context.fillText(titleCard.title || project.metadata.title, width / 2, cardY + cardHeight * 0.45);

  const subtitle = titleCard.subtitle?.trim();
  if (subtitle) {
    context.fillStyle = 'rgba(223, 236, 255, 0.8)';
    context.font = `500 ${Math.round(cardHeight * 0.12)}px "Atkinson Hyperlegible Next", system-ui, sans-serif`;
    context.fillText(subtitle, width / 2, cardY + cardHeight * 0.68);
  }

  context.fillStyle = 'rgba(121, 187, 255, 0.9)';
  context.font = `600 ${Math.round(cardHeight * 0.14)}px "Atkinson Hyperlegible Next", system-ui, sans-serif`;
  context.fillText(
    `Starting in ${Math.max(0, timeUntilFirstBeatSec).toFixed(1)}s`,
    width / 2,
    cardY + cardHeight * 0.88,
  );
  context.restore();
}

function renderHeader(
  context: CanvasRenderingContext2D,
  width: number,
  frameTimeSec: number,
  project: BoomwhackerVideoBuilderProject,
  totalDurationSec: number,
): void {
  context.textAlign = 'left';
  context.fillStyle = '#edf4ff';
  context.font = '700 46px "Atkinson Hyperlegible Next", system-ui, sans-serif';
  context.fillText(project.metadata.title, 72, 78);

  context.fillStyle = 'rgba(159, 178, 204, 0.94)';
  context.font = '500 22px "Atkinson Hyperlegible Next", system-ui, sans-serif';
  context.fillText('Boomwhacker Video Builder export preview', 72, 112);

  context.textAlign = 'right';
  context.fillStyle = 'rgba(237, 244, 255, 0.92)';
  context.font = '600 24px "Atkinson Hyperlegible Next", system-ui, sans-serif';
  context.fillText(`${frameTimeSec.toFixed(2)}s / ${totalDurationSec.toFixed(2)}s`, width - 72, 78);
  context.fillStyle = 'rgba(159, 178, 204, 0.92)';
  context.font = '500 18px "Atkinson Hyperlegible Next", system-ui, sans-serif';
  context.fillText(`${project.exportState.width}x${project.exportState.height} @ ${project.exportState.fps} fps`, width - 72, 108);
}

function drawNoteShapePath(
  context: CanvasRenderingContext2D,
  note: TimedBoomwhackerNote,
  x: number,
  y: number,
  width: number,
  height: number,
  isSustained: boolean,
): void {
  if (note.shape === 'diamond') {
    context.beginPath();
    context.moveTo(x + width / 2, y + height * 0.02);
    context.lineTo(x, y + height * 0.145);
    context.lineTo(x, y + height * 0.855);
    context.lineTo(x + width / 2, y + height * 0.98);
    context.lineTo(x + width, y + height * 0.855);
    context.lineTo(x + width, y + height * 0.145);
    context.closePath();
    return;
  }

  if (note.shape === 'circle') {
    if (isSustained) {
      roundRectPath(context, x, y, width, height, height / 2);
      return;
    }
    context.beginPath();
    context.ellipse(x + width / 2, y + height / 2, width * 0.47, height * 0.47, 0, 0, Math.PI * 2);
    context.closePath();
    return;
  }

  if (note.shape === 'oval') {
    context.beginPath();
    context.ellipse(x + width / 2, y + height / 2, width * 0.47, height * (77 / 160), 0, 0, Math.PI * 2);
    context.closePath();
    return;
  }

  roundRectPath(context, x, y, width, height, height / 2);
}

function isSustainedCircleNote(note: TimedBoomwhackerNote, timing: DerivedTimingModel): boolean {
  if (note.shape !== 'circle') {
    return false;
  }

  const minimumEndSlotIndex = note.startSlotIndex + getMinimumSlotSpanForShape(note.shape, timing, note.startSlotIndex) - 1;
  return note.endSlotIndex > minimumEndSlotIndex;
}

function getNoteShapeStrokeWidth(note: TimedBoomwhackerNote, width: number, height: number): number {
  if (note.shape === 'diamond') {
    return Math.max(1, width * (4 / 25));
  }

  if (note.shape === 'circle' || note.shape === 'oval') {
    return Math.max(1, Math.min(width, height) * 0.06);
  }

  return Math.max(1, height * (6 / 80));
}

export function getExportStartTimeSec(
  _project: BoomwhackerVideoBuilderProject,
  timing: DerivedTimingModel,
): number {
  return Math.min(0, timing.countInStartTimeSec);
}

export function getExportTotalDurationSec(
  project: BoomwhackerVideoBuilderProject,
  timing: DerivedTimingModel,
): number {
  const exportStartTimeSec = getExportStartTimeSec(project, timing);
  const exportEndTimeSec = Math.max(project.audio?.durationSec ?? 0, timing.totalDurationSec);
  return Math.max(0.001, exportEndTimeSec - exportStartTimeSec);
}

export function getExportSongTimeSec(
  project: BoomwhackerVideoBuilderProject,
  timing: DerivedTimingModel,
  frameTimeSec: number,
): number {
  return getExportStartTimeSec(project, timing) + frameTimeSec;
}

export async function renderExportFrame(params: ExportFrameRenderParams): Promise<void> {
  const {
    canvas,
    project,
    timing,
    guides,
    timedNotes,
    frameTimeSec,
  } = params;
  const { width, height } = project.exportState;

  if (canvas.width !== width) {
    canvas.width = width;
  }
  if (canvas.height !== height) {
    canvas.height = height;
  }

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('2D canvas context is unavailable for export rendering.');
  }

  await renderBackground(context, width, height, project);

  const totalDurationSec = getExportTotalDurationSec(project, timing);
  renderHeader(context, width, frameTimeSec, project, totalDurationSec);
  renderTitleCard(context, width, height, project, timing, frameTimeSec);

  const laneCount = BOOMWHACKER_LANES.length;
  const highwayTop = Math.round(height * 0.22);
  const laneHeight = Math.max(52, Math.floor((height * 0.64) / laneCount));
  const labelColumnWidth = Math.round(width * 0.11);
  const viewportX = 72 + labelColumnWidth + 22;
  const viewportY = highwayTop;
  const viewportWidth = width - viewportX - 72;
  const viewportHeight = laneHeight * laneCount;
  const judgmentX = viewportX + (viewportWidth * JUDGMENT_LINE_RATIO);
  const pixelsPerSecond = (viewportWidth * (1 - JUDGMENT_LINE_RATIO)) / SECONDS_VISIBLE_AHEAD;
  const songTimeSec = getExportSongTimeSec(project, timing, frameTimeSec);

  const stageGradient = context.createLinearGradient(viewportX, viewportY, viewportX, viewportY + viewportHeight);
  stageGradient.addColorStop(0, 'rgba(8, 17, 28, 0.82)');
  stageGradient.addColorStop(1, 'rgba(10, 17, 28, 0.95)');
  drawBackgroundCard(
    context,
    viewportX,
    viewportY,
    viewportWidth,
    viewportHeight,
    stageGradient,
    'rgba(149, 181, 226, 0.22)',
  );

  for (const lane of BOOMWHACKER_LANES) {
    const visualRow = getVisualLaneRow(lane.row, laneCount);
    const laneY = viewportY + visualRow * laneHeight;
    drawBackgroundCard(
      context,
      72,
      laneY,
      labelColumnWidth,
      laneHeight - 6,
      'rgba(12, 18, 26, 0.88)',
      'rgba(121, 187, 255, 0.16)',
    );

    const labelX = 72 + (labelColumnWidth / 2);
    const labelY = laneY + (laneHeight * 0.58);
    context.textAlign = 'center';
    context.fillStyle = '#edf4ff';
    context.font = `700 ${Math.round(laneHeight * 0.34)}px "Atkinson Hyperlegible Next", system-ui, sans-serif`;
    context.save();
    context.shadowColor = 'rgba(0, 0, 0, 0.24)';
    context.shadowBlur = 10;
    context.fillText(lane.label, labelX, labelY);
    context.restore();
    drawLaneMarker(context, lane.marker, labelX, labelY, 22);

    context.fillStyle = visualRow % 2 === 0 ? 'rgba(121, 187, 255, 0.08)' : 'rgba(255, 255, 255, 0.035)';
    context.fillRect(viewportX, laneY, viewportWidth, laneHeight);
    context.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(viewportX, laneY);
    context.lineTo(viewportX + viewportWidth, laneY);
    context.stroke();
  }

  const activeJudgmentBeatSpan = getActiveHighwayBeatSpan(timing, songTimeSec);
  if (activeJudgmentBeatSpan) {
    const areaWidth = getHighwayJudgmentAreaWidthPx(activeJudgmentBeatSpan, pixelsPerSecond);
    const clippedLeft = Math.max(viewportX, Math.min(judgmentX, viewportX + viewportWidth));
    const clippedRight = Math.max(viewportX, Math.min(judgmentX + areaWidth, viewportX + viewportWidth));

    if (clippedRight > clippedLeft) {
      const judgmentAreaGradient = context.createLinearGradient(clippedLeft, viewportY, clippedRight, viewportY);
      judgmentAreaGradient.addColorStop(0, 'rgba(121, 187, 255, 0.08)');
      judgmentAreaGradient.addColorStop(0.5, 'rgba(121, 187, 255, 0.18)');
      judgmentAreaGradient.addColorStop(1, 'rgba(121, 187, 255, 0.08)');
      context.save();
      context.fillStyle = judgmentAreaGradient;
      context.fillRect(clippedLeft, viewportY, clippedRight - clippedLeft, viewportHeight);
      context.fillStyle = 'rgba(215, 238, 255, 0.08)';
      context.fillRect(clippedLeft, viewportY, clippedRight - clippedLeft, viewportHeight);
      context.strokeStyle = 'rgba(215, 238, 255, 0.76)';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(clippedLeft, viewportY);
      context.lineTo(clippedLeft, viewportY + viewportHeight);
      context.moveTo(clippedRight, viewportY);
      context.lineTo(clippedRight, viewportY + viewportHeight);
      context.stroke();
      context.restore();
    }
  }

  for (const guide of guides) {
    const guideX = judgmentX + ((guide.timeSec - songTimeSec) * pixelsPerSecond);
    if (guideX < viewportX - 4 || guideX > viewportX + viewportWidth + 4) {
      continue;
    }

    context.save();
    context.beginPath();
    context.moveTo(guideX, viewportY);
    context.lineTo(guideX, viewportY + viewportHeight);
    context.lineWidth = guide.kind === 'measure' ? 3 : 1;
    context.strokeStyle = guide.kind === 'measure'
      ? 'rgba(255, 255, 255, 0.62)'
      : guide.kind === 'count-in'
        ? 'rgba(121, 187, 255, 0.54)'
        : guide.kind === 'subdivision'
          ? 'rgba(121, 187, 255, 0.18)'
          : 'rgba(255, 255, 255, 0.3)';
    if (guide.kind !== 'measure') {
      context.setLineDash(guide.kind === 'subdivision' ? [4, 9] : [9, 8]);
    }
    context.stroke();

    if ((guide.kind === 'count-in' || guide.kind === 'measure') && guide.label) {
      context.textAlign = 'center';
      context.fillStyle = guide.kind === 'measure' ? 'rgba(237, 244, 255, 0.82)' : 'rgba(121, 187, 255, 0.92)';
      context.font = '700 18px "Atkinson Hyperlegible Next", system-ui, sans-serif';
      context.fillText(guide.kind === 'measure' ? `M${guide.label}` : guide.label, guideX, viewportY - 12);
    }
    context.restore();
  }

  for (const note of timedNotes) {
    const visualRow = getVisualLaneRow(note.row, laneCount);
    const noteStartX = judgmentX + ((note.startTimeSec - songTimeSec) * pixelsPerSecond);
    const noteEndX = judgmentX + ((note.endTimeSec - songTimeSec) * pixelsPerSecond);
    const noteIsSustainedCircle = isSustainedCircleNote(note, timing);
    const noteLayout = getHighwayNoteLayout({
      note,
      startX: noteStartX,
      endX: noteEndX,
      visualRow,
      laneHeightPx: laneHeight,
      isSustained: noteIsSustainedCircle,
    });
    const noteLeft = noteLayout.left;
    const noteWidth = noteLayout.width;
    const noteY = viewportY + noteLayout.top;
    const noteHeight = noteLayout.height;
    if (noteLeft > viewportX + viewportWidth + 10 || noteLeft + noteWidth < viewportX - 10) {
      continue;
    }

    const noteIsCrossing = note.startTimeSec <= songTimeSec && note.endTimeSec >= songTimeSec;
    drawNoteShapePath(context, note, noteLeft, noteY, noteWidth, noteHeight, noteIsSustainedCircle);
    context.save();
    context.fillStyle = note.color;
    context.fill();
    const noteStrokeWidth = getNoteShapeStrokeWidth(note, noteWidth, noteHeight);
    context.lineWidth = noteIsCrossing ? Math.max(3, noteStrokeWidth) : noteStrokeWidth;
    context.strokeStyle = noteIsCrossing ? 'rgba(121, 187, 255, 0.9)' : 'rgba(8, 17, 27, 0.22)';
    context.stroke();
    context.restore();

    if (noteLayout.showLabel) {
      const noteLabelX = noteLeft + noteWidth / 2;
      const noteLabelY = noteY + noteHeight * 0.62;
      const noteLabelFontPx = Math.round(noteLayout.labelFontPx);
      context.textAlign = 'center';
      context.fillStyle = '#ffffff';
      context.font = `800 ${noteLabelFontPx}px "Atkinson Hyperlegible Next", system-ui, sans-serif`;
      context.save();
      context.lineJoin = 'round';
      context.strokeStyle = '#000000';
      context.lineWidth = 2.5;
      context.strokeText(note.label, noteLabelX, noteLabelY);
      context.fillText(note.label, noteLabelX, noteLabelY);
      context.restore();
      drawNoteLabelMarker(context, note.marker, noteLabelX, noteLabelY, noteLabelFontPx);
    }

    if (noteIsCrossing) {
      drawPlaybackHighlightCell(
        context,
        noteStartX,
        viewportY + (visualRow * laneHeight),
        Math.max(1, noteEndX - noteStartX),
        laneHeight,
      );
    }
  }

  context.fillStyle = 'rgba(159, 178, 204, 0.92)';
  context.font = '500 20px "Atkinson Hyperlegible Next", system-ui, sans-serif';
  context.textAlign = 'left';
  context.fillText(
    songTimeSec < project.songTiming.firstBeatOffsetSec
      ? `Count-in ${Math.max(0, project.songTiming.firstBeatOffsetSec - songTimeSec).toFixed(1)}s`
      : `Song time ${songTimeSec.toFixed(2)}s`,
    viewportX,
    viewportY + viewportHeight + 38,
  );
}
