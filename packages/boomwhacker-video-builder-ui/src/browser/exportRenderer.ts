import {
  BOOMWHACKER_LANES,
  type BoomwhackerVideoBuilderProject,
  type DerivedGuideLine,
  type DerivedTimingModel,
  type TimedBoomwhackerNote,
} from '@mlt/boomwhacker-video-builder-core';
import {
  getActiveHighwayBeatSpan,
  getHighwayJudgmentAreaWidthPx,
  getHighwayNoteLayout,
  shouldHighlightDownbeatGuide,
  shouldRenderGuideAsBeat,
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
): void {
  if (marker === 'none') {
    return;
  }

  const lineY = marker === 'underline' ? y + 9 : y - 21;
  context.beginPath();
  context.moveTo(x - (width / 2), lineY);
  context.lineTo(x + (width / 2), lineY);
  context.lineWidth = 2;
  context.strokeStyle = 'rgba(237, 244, 255, 0.92)';
  context.stroke();
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
  frameTimeSec: number,
): void {
  const { leadInDurationSec, titleCard } = project.exportState;
  if (!titleCard.enabled || frameTimeSec >= leadInDurationSec) {
    return;
  }

  const songTimeSec = getExportSongTimeSec(project, frameTimeSec);
  const fadeOutDurationSec = Math.min(0.45, Math.max(0.18, leadInDurationSec * 0.2));
  const fadeAlpha = songTimeSec < -fadeOutDurationSec
    ? 1
    : clamp((-songTimeSec) / Math.max(0.001, fadeOutDurationSec), 0, 1);

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
    songTimeSec < 0
      ? `Starting in ${Math.max(0, -songTimeSec).toFixed(1)}s`
      : 'Starting',
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
): void {
  if (note.shape === 'diamond') {
    context.beginPath();
    context.moveTo(x + width * 0.14, y + height / 2);
    context.lineTo(x + width / 2, y + height * 0.04);
    context.lineTo(x + width * 0.86, y + height / 2);
    context.lineTo(x + width / 2, y + height * 0.96);
    context.closePath();
    return;
  }

  roundRectPath(context, x, y, width, height, note.shape === 'oval' ? height * 0.34 : height / 2);
}

export function getExportTotalDurationSec(
  project: BoomwhackerVideoBuilderProject,
  timing: DerivedTimingModel,
): number {
  return project.exportState.leadInDurationSec + Math.max(project.audio?.durationSec ?? 0, timing.totalDurationSec);
}

export function getExportSongTimeSec(
  project: BoomwhackerVideoBuilderProject,
  frameTimeSec: number,
): number {
  return frameTimeSec - project.exportState.leadInDurationSec;
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
  renderTitleCard(context, width, height, project, frameTimeSec);

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
  const songTimeSec = getExportSongTimeSec(project, frameTimeSec);

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
      context.restore();
    }
  }

  for (const guide of guides) {
    const guideX = judgmentX + ((guide.timeSec - songTimeSec) * pixelsPerSecond);
    if (guideX < viewportX - 4 || guideX > viewportX + viewportWidth + 4) {
      continue;
    }

    const highlightedDownbeat = shouldHighlightDownbeatGuide(guide);
    const beatGuide = shouldRenderGuideAsBeat(guide);
    if (!highlightedDownbeat && !beatGuide) {
      continue;
    }

    context.save();
    context.beginPath();
    context.moveTo(guideX, viewportY);
    context.lineTo(guideX, viewportY + viewportHeight);
    context.lineWidth = highlightedDownbeat ? 3 : 1;
    context.strokeStyle = highlightedDownbeat
      ? '#ffd36a'
      : beatGuide
        ? 'rgba(255, 255, 255, 0.26)'
        : 'rgba(121, 187, 255, 0.18)';
    context.setLineDash(beatGuide ? [9, 8] : []);
    context.stroke();
    context.restore();
  }

  for (const note of timedNotes) {
    const noteLayout = getHighwayNoteLayout({
      note,
      startX: judgmentX + ((note.startTimeSec - songTimeSec) * pixelsPerSecond),
      endX: judgmentX + ((note.endTimeSec - songTimeSec) * pixelsPerSecond),
      visualRow: getVisualLaneRow(note.row, laneCount),
      laneHeightPx: laneHeight,
    });
    const noteLeft = noteLayout.left;
    const noteWidth = noteLayout.width;
    const noteY = viewportY + noteLayout.top;
    const noteHeight = noteLayout.height;
    if (noteLeft > viewportX + viewportWidth + 10 || noteLeft + noteWidth < viewportX - 10) {
      continue;
    }

    const noteIsCrossing = note.startTimeSec <= songTimeSec && note.endTimeSec >= songTimeSec;
    drawNoteShapePath(context, note, noteLeft, noteY, noteWidth, noteHeight);
    context.save();
    context.fillStyle = note.color;
    context.fill();
    context.lineWidth = noteIsCrossing ? 3 : 1;
    context.strokeStyle = noteIsCrossing ? 'rgba(121, 187, 255, 0.9)' : 'rgba(8, 17, 27, 0.22)';
    context.stroke();
    context.restore();

    if (noteLayout.showLabel) {
      context.textAlign = 'center';
      context.fillStyle = '#08111b';
      context.font = `800 ${Math.round(noteLayout.labelFontPx)}px "Atkinson Hyperlegible Next", system-ui, sans-serif`;
      context.save();
      context.shadowColor = 'rgba(255, 255, 255, 0.2)';
      context.shadowBlur = 0;
      context.shadowOffsetX = 0;
      context.shadowOffsetY = 1;
      context.fillText(note.label, noteLeft + noteWidth / 2, noteY + noteHeight * 0.62);
      context.restore();
    }
  }

  context.fillStyle = 'rgba(159, 178, 204, 0.92)';
  context.font = '500 20px "Atkinson Hyperlegible Next", system-ui, sans-serif';
  context.textAlign = 'left';
  context.fillText(
    songTimeSec < 0
      ? `Lead-in ${Math.max(0, -songTimeSec).toFixed(1)}s`
      : `Song time ${songTimeSec.toFixed(2)}s`,
    viewportX,
    viewportY + viewportHeight + 38,
  );
}
