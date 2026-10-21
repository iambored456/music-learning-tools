// js/components/Canvas/PitchGrid/renderers/notes.ts
import { getColumnX, getRowY, getCurrentCoordinateMapping } from './rendererUtils.ts';
import TonalService from '@services/tonalService.ts';
import store from '@state/initStore.ts';
import {
  createNotationNoteGeometry, createEllipseNoteGeometry, drawNoteGlyph,
  getNoteTailYOffset, hasVisibleNoteTail as hasVisibleTail, getNoteLabelCategory,
  getNoteLabelFontSize, type NoteGeometry,
} from '@mlt/ui-components/canvas/primitives';
import { diamondPath } from '@components/rhythm/glyphs/sixteenthGlyphs.ts';
import { getNoteEndColumn } from '@mlt/types';
import columnMapService from '@services/columnMapService.ts';
import { getAnimationEffectsManager as getRuntimeAnimationEffectsManager } from '@services/runtimeGlobals.ts';
import { buildCanvasFont, getSemanticTextColor } from '@services/typographyService.ts';
import { resolvePitchLabelTextLayout } from './pitchLabelTextRendering.ts';
import type { AppState, CanvasSpaceColumn, ModulationMarker, PlacedNote, TonicSign } from '@mlt/types';
import {
  MIN_FONT_SIZE,
  MIN_STROKE_WIDTH_THICK,
  STROKE_WIDTH_RATIO,
  TAIL_LINE_WIDTH_RATIO,
  MIN_TAIL_LINE_WIDTH,
  SHADOW_BLUR_RADIUS
} from '@/core/constants.ts';

const DEGREE_SEPARATOR = '/';
const PITCH_LABEL_MAX_WIDTH_RATIO = 0.82;
const PITCH_LABEL_MAX_HEIGHT_RATIO = 0.78;

export type PitchRendererOptions = Partial<AppState> & {
  columnWidths: number[];
  cellWidth: number;
  cellHeight: number;
  tempoModulationMarkers?: ModulationMarker[];
  baseMicrobeatPx?: number;
};

interface ScaleDegreeResult {
  label: string | null;
  isAccidental: boolean;
}

interface AnimationEffectsManager {
  shouldAnimateNote(note: PlacedNote): boolean;
  getVibratoYOffset(color?: string): number;
  shouldFillNote(note: PlacedNote): boolean;
  getFillLevel(note: PlacedNote): number;
  hasReverbEffect?: (color: string) => boolean;
  getReverbEffect?: (color: string) => { opacity: number; blur: number; spread: number };
  hasDelayEffect(color: string): boolean;
  getDelayEffects(color: string): Array<{ delay: number; opacity: number; scale: number; active: boolean }>;
}

const getAnimationEffectsManager = (): AnimationEffectsManager | undefined => {
  return getRuntimeAnimationEffectsManager() as AnimationEffectsManager | undefined;
};

const getPlacedNotes = (): PlacedNote[] => store.state.placedNotes;

let _invalidDimensionWarningShown = false;

function calculateVibratoYOffset(note: PlacedNote, options: PitchRendererOptions): number {
  const { cellHeight } = options;
  const animationManager = getAnimationEffectsManager();

  if (!animationManager?.shouldAnimateNote?.(note)) {
    return 0;
  }

  const vibratoOffset = animationManager.getVibratoYOffset?.(note.color) ?? 0;
  return vibratoOffset * cellHeight;
}

function applyReverbGlow(
  ctx: CanvasRenderingContext2D,
  note: PlacedNote,
  options: PitchRendererOptions
): { shouldApply: boolean; blur: number; spread: number } {
  const animationManager = getAnimationEffectsManager();
  const hasReverbEffect = animationManager?.hasReverbEffect;
  const shouldCheckReverb =
    typeof hasReverbEffect === 'function'
      ? hasReverbEffect(note.color)
      : Boolean(hasReverbEffect);

  if (!shouldCheckReverb) {
    return { shouldApply: false, blur: 0, spread: 0 };
  }

  const { cellWidth } = options;
  const getReverbEffect = animationManager?.getReverbEffect;
  const reverbEffect = typeof getReverbEffect === 'function' ? getReverbEffect(note.color) : undefined;
  if (!reverbEffect) {
    return { shouldApply: false, blur: 0, spread: 0 };
  }

  // Scale blur and spread based on cell width
  const blur = reverbEffect.blur * (cellWidth / 2);
  const spread = reverbEffect.spread * (cellWidth / 3);

  return { shouldApply: blur > 0 || spread > 0, blur, spread };
}

function drawDelayGhostNotes(
  ctx: CanvasRenderingContext2D,
  note: PlacedNote,
  options: PitchRendererOptions,
  centerX: number,
  centerY: number,
  rx: number,
  ry: number
): void {
  const animationManager = getAnimationEffectsManager();
  if (!animationManager?.hasDelayEffect?.(note.color)) {
    return;
  }

  const { cellWidth } = options;
  const tempo = options.tempo || 90;
  const delayEffects = animationManager.getDelayEffects?.(note.color);
  if (!delayEffects || delayEffects.length === 0) {
    return;
  }

  // Convert delay ms to pixels using the grid's time mapping:
  // 1 microbeat (eighth note) = (60 / tempo) / 2 seconds = one cellWidth
  // So pixelsPerMs = cellWidth / (microbeatDurationSeconds * 1000)
  const microbeatMs = ((60 / tempo) / 2) * 1000;
  const pxPerMs = cellWidth / microbeatMs;

  // Draw ghost notes to the right of the original note
  delayEffects.forEach((echo, index) => {
    const offsetX = echo.delay * pxPerMs;
    const echoX = centerX + offsetX;

    // Scale down slightly for each echo
    const echoRx = rx * echo.scale;
    const echoRy = ry * echo.scale;

    ctx.save();
    ctx.globalAlpha = echo.opacity;

    // Draw ghost note outline
    ctx.beginPath();
    const geometry = createEllipseNoteGeometry(echoX, centerY, echoRx, echoRy, 0);
    if (!geometry) { ctx.restore(); return; }
    ctx.strokeStyle = note.color;
    ctx.lineWidth = Math.max(0.5, echoRx * 0.1);
    ctx.setLineDash([2, 2]); // Dashed line for ghost effect
    if (note.shape === 'diamond') ctx.stroke(new Path2D(diamondPath(echoX, centerY, echoRx * 2, echoRy * 2)));
    else { ctx.ellipse(echoX, centerY, echoRx, echoRy, 0, 0, 2 * Math.PI); ctx.stroke(); }

    ctx.restore();
  });
}

/** Audio effects remain an adapter around the shared glyph renderer. */
function getFillLevel(note: PlacedNote): number {
  const manager = getAnimationEffectsManager();
  return manager?.shouldFillNote?.(note) ? manager.getFillLevel(note) : 0;
}

function drawAnimatedNote(ctx: CanvasRenderingContext2D, note: PlacedNote, options: PitchRendererOptions, geometry: NoteGeometry, path?: Path2D): void {
  drawDelayGhostNotes(ctx, note, options, geometry.centerX, geometry.centerY, geometry.radiusX, geometry.radiusY);
  const glow = applyReverbGlow(ctx, note, options);
  drawNoteGlyph(ctx, geometry, {
    color: note.color, fillLevel: getFillLevel(note), path,
    shadowBlur: SHADOW_BLUR_RADIUS + (glow.shouldApply ? glow.blur : 0),
    shadowOffsetX: glow.shouldApply ? glow.spread : 0,
  });
}

function getScaleDegreeLabel(note: PlacedNote, options: PitchRendererOptions): ScaleDegreeResult {
  return TonalService.getDegreeLabelForNote(note, options as AppState);
}

export function drawScaleDegreeText(
  ctx: CanvasRenderingContext2D,
  note: PlacedNote,
  options: PitchRendererOptions,
  centerX: number,
  centerY: number,
  noteWidth: number,
  _noteHeight?: number
): void {
  const { label: noteLabel } = getScaleDegreeLabel(note, options);
  if (!noteLabel) {return;
  }

  const category = getNoteLabelCategory(noteLabel);
  const baseFontSize = getNoteLabelFontSize(note.shape, noteWidth, category);

  const fontSize = baseFontSize;
  if (fontSize < MIN_FONT_SIZE) {return;
  }

  ctx.fillStyle = getSemanticTextColor('notation');
  ctx.font = buildCanvasFont('notation-label', { fontSizePx: fontSize });
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if ((note.shape === 'oval' || note.shape === 'diamond') && category === 'both-accidentals' && noteLabel.includes(DEGREE_SEPARATOR)) {
    const parts = noteLabel.split(DEGREE_SEPARATOR);
    const lineHeight = fontSize * 1.1;
    const totalHeight = lineHeight * (parts.length - 1);
    const startY = centerY - (totalHeight / 2);

    parts.forEach((part, index) => {
      const y = startY + (index * lineHeight);
      const opticalOffset = fontSize * 0.08;
      ctx.fillText(part.trim(), centerX, y + opticalOffset);
    });
  } else {
    const opticalOffset = fontSize * 0.08;
    ctx.fillText(noteLabel, centerX, centerY + opticalOffset);
  }
}

export function drawPitchClassText(
  ctx: CanvasRenderingContext2D,
  note: PlacedNote,
  options: PitchRendererOptions,
  centerX: number,
  centerY: number,
  noteWidth: number,
  noteHeight?: number
): void {
  const noteLabel = TonalService.getPitchLabelForNote(note, options as AppState);
  if (!noteLabel) {
    return;
  }

  const category = getNoteLabelCategory(noteLabel, 'pitch');
  const preferredFontSize = getNoteLabelFontSize(note.shape, noteWidth, category, 'pitch');
  const usesStackedEnharmonics = (note.shape === 'oval' || note.shape === 'diamond')
    && category === 'both-accidentals'
    && noteLabel.includes(DEGREE_SEPARATOR);
  const labelLines = usesStackedEnharmonics
    ? noteLabel.split(DEGREE_SEPARATOR).map(part => part.trim())
    : [noteLabel];
  const lineHeightRatio = usesStackedEnharmonics ? 1.05 : 1;
  const fittedLayout = options.showPitchOctaveLabels
    ? resolvePitchLabelTextLayout(ctx, labelLines, {
        preferredFontSize,
        maxWidth: noteWidth * 2 * PITCH_LABEL_MAX_WIDTH_RATIO,
        maxHeight: (noteHeight ?? noteWidth) * 2 * PITCH_LABEL_MAX_HEIGHT_RATIO,
        lineHeightRatio
      })
    : {
        fontSize: preferredFontSize,
        font: buildCanvasFont('notation-label', { fontSizePx: preferredFontSize })
      };
  const { fontSize } = fittedLayout;
  if (fontSize < MIN_FONT_SIZE) {
    return;
  }

  ctx.fillStyle = getSemanticTextColor('notation');
  ctx.font = fittedLayout.font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (usesStackedEnharmonics) {
    const lineHeight = fontSize * 1.05;
    const totalHeight = lineHeight * (labelLines.length - 1);
    const startY = centerY - (totalHeight / 2);

    labelLines.forEach((part, index) => {
      const y = startY + (index * lineHeight);
      const opticalOffset = fontSize * 0.08;
      ctx.fillText(part.trim(), centerX, y + opticalOffset);
    });
  } else {
    const opticalOffset = fontSize * 0.08;
    ctx.fillText(noteLabel, centerX, centerY + opticalOffset);
  }
}

export function drawNoteLabelText(
  ctx: CanvasRenderingContext2D,
  note: PlacedNote,
  options: PitchRendererOptions,
  centerX: number,
  centerY: number,
  noteWidth: number,
  noteHeight?: number
): void {
  if (options.showPitchLabels) {
    drawPitchClassText(ctx, note, options, centerX, centerY, noteWidth, noteHeight);
    return;
  }

  if (options.degreeDisplayMode !== 'off') {
    drawScaleDegreeText(ctx, note, options, centerX, centerY, noteWidth, noteHeight);
  }
}

function hasRenderableDimensions(width: number, height: number): boolean {
  return Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0;
}

/**
 * Renders a two-column oval note (also called "circle" notes in the codebase).
 *
 * Circle notes occupy 2 columns for their baseline shape (startColumnIndex and startColumnIndex + 1).
 * This function handles both short notes (just the circle) and long notes with extended duration:
 * - Style 1: Circle with a tail line extending to the right
 * - Style 2: Stadium/capsule shape that spans the entire duration
 *
 * The note's full duration spans from startColumnIndex to endColumnIndex (inclusive).
 */
export function drawTwoColumnOvalNote(
  ctx: CanvasRenderingContext2D,
  options: PitchRendererOptions,
  note: PlacedNote,
  rowIndex: number
): void {
  const { cellWidth, cellHeight, tempoModulationMarkers } = options;
  const baseY = getRowY(rowIndex, options);
  const vibratoYOffset = calculateVibratoYOffset(note, options);
  const y = baseY + vibratoYOffset;
  const xStart = getColumnX(note.startColumnIndex, options);

  let actualCellWidth: number;
  if (tempoModulationMarkers && tempoModulationMarkers.length > 0) {
    const nextX = getColumnX(note.startColumnIndex + 1, options);
    actualCellWidth = nextX - xStart;
  } else {
    actualCellWidth = cellWidth;
  }

  if (!hasRenderableDimensions(actualCellWidth, cellHeight)) {
    _invalidDimensionWarningShown = true;
    return;
  }

  const centerX = xStart + actualCellWidth;
  const longNoteStyle = store.state.longNoteStyle || 'style2';
  const geometry = createNotationNoteGeometry(note, {
    x: xStart, y, columnWidth: actualCellWidth, cellHeight,
    endCapX: getColumnX(note.endColumnIndex, options), longNoteStyle,
  });
  if (!geometry) return;
  if (geometry.kind === 'stadium') {
    // Preserve the long-note label at its starting cap and its existing effects behavior.
    drawNoteGlyph(ctx, geometry, { color: note.color, fillLevel: getFillLevel(note) });
    if (options.showPitchLabels || options.degreeDisplayMode !== 'off') {
      drawNoteLabelText(ctx, note, options, centerX, y, geometry.radiusY, geometry.radiusY);
    }
    return;
  }
  if (hasVisibleTail(note)) {
    const tailY = y + getNoteTailYOffset(note, getPlacedNotes(), cellHeight);
    ctx.beginPath();
    ctx.moveTo(centerX, tailY);
    ctx.lineTo(getColumnX(getNoteEndColumn(note), options), tailY);
    ctx.strokeStyle = note.color;
    ctx.lineWidth = Math.max(MIN_TAIL_LINE_WIDTH, actualCellWidth * TAIL_LINE_WIDTH_RATIO);
    ctx.stroke();
  }
  const { radiusX: rx, radiusY: ry } = geometry;
  drawAnimatedNote(ctx, note, options, geometry);

  if (options.showPitchLabels || options.degreeDisplayMode !== 'off') {
    drawNoteLabelText(ctx, note, options, centerX, y, rx, ry);
  }
}

export function drawSingleColumnOvalNote(
  ctx: CanvasRenderingContext2D,
  options: PitchRendererOptions,
  note: PlacedNote,
  rowIndex: number
): void {
  const { columnWidths, cellWidth, cellHeight, tempoModulationMarkers } = options;
  const baseY = getRowY(rowIndex, options);
  const vibratoYOffset = calculateVibratoYOffset(note, options);
  const y = baseY + vibratoYOffset;
  const x = getColumnX(note.startColumnIndex, options);

  let currentCellWidth: number;
  if (tempoModulationMarkers && tempoModulationMarkers.length > 0) {
    const nextX = getColumnX(note.startColumnIndex + 1, options);
    currentCellWidth = nextX - x;
  } else {
    // Notes use canvas-space indices, so they need canvas-space column width multipliers.
    // `musicalColumnWidths` is the persisted state name and may be present as an empty array (truthy);
    // only use it when populated, otherwise fall back to `columnWidths` to avoid 0-width (invisible) notes.
    const canvasColumnWidthMultipliers = (options.musicalColumnWidths && options.musicalColumnWidths.length > 0)
      ? options.musicalColumnWidths
      : columnWidths;
    currentCellWidth = (canvasColumnWidthMultipliers[note.startColumnIndex] ?? 0) * cellWidth;
  }

  if (!hasRenderableDimensions(currentCellWidth, cellHeight)) {
    _invalidDimensionWarningShown = true;
    return;
  }

  const geometry = createNotationNoteGeometry(note, {
    x, y, columnWidth: currentCellWidth, cellHeight,
    endCapX: getColumnX(note.endColumnIndex, options), longNoteStyle: store.state.longNoteStyle || 'style2',
  });
  if (!geometry) return;
  const { centerX: cx, radiusX: rx, radiusY: ry } = geometry;
  drawAnimatedNote(ctx, note, options, geometry);

  if (options.showPitchLabels || options.degreeDisplayMode !== 'off') {
    drawNoteLabelText(ctx, note, options, cx, y, rx, ry);
  }
}

export function drawIndividualSixteenthNote(
  ctx: CanvasRenderingContext2D, options: PitchRendererOptions, note: PlacedNote, rowIndex: number
): void {
  const x = getColumnX(note.startColumnIndex, options);
  const width = getColumnX(note.startColumnIndex + 0.5, options) - x;
  const lineWidth = Math.max(MIN_STROKE_WIDTH_THICK, width * STROKE_WIDTH_RATIO);
  const rx = (width - lineWidth) / 2;
  const ry = (options.cellHeight - lineWidth) / 2;
  if (!hasRenderableDimensions(rx, ry)) return;
  const cx = x + width / 2;
  const cy = getRowY(rowIndex, options) + calculateVibratoYOffset(note, options);
  const geometry = createEllipseNoteGeometry(cx, cy, rx, ry, lineWidth);
  if (!geometry) return;
  drawAnimatedNote(ctx, note, options, geometry, new Path2D(diamondPath(cx, cy, rx * 2, ry * 2)));

  if (options.showPitchLabels || options.degreeDisplayMode !== 'off') {
    drawNoteLabelText(ctx, note, options, cx, cy, rx, ry);
  }
}

export function drawTonicShape(
  ctx: CanvasRenderingContext2D,
  options: PitchRendererOptions,
  tonicSign: TonicSign
): void {
  const { cellWidth, cellHeight, tempoModulationMarkers } = options;
  // Use globalRow for Y position calculation since getRowY expects a global row index
  const y = getRowY(tonicSign.globalRow ?? tonicSign.row, options);

  // Resolve tonic column from column map (source of truth) to avoid drift if groupings change
  let canvasSpaceColumn = tonicSign.columnIndex;
  if (tonicSign.uuid) {
    const map = columnMapService.getColumnMap(store.state as AppState);
    const entry = map.entries.find(e =>
      e.type === 'tonic' &&
      e.tonicSignUuid === tonicSign.uuid &&
      typeof e.canvasIndex === 'number'
    );
    if (entry && typeof entry.canvasIndex === 'number') {
      canvasSpaceColumn = entry.canvasIndex as CanvasSpaceColumn;
    }
  }
  const x = getColumnX(canvasSpaceColumn, options);

  let actualCellWidth: number;
  if (tempoModulationMarkers && tempoModulationMarkers.length > 0) {
    // Tonic spans 2 columns: use canvas-space for both
    const nextX = getColumnX(canvasSpaceColumn + 1, options);
    actualCellWidth = nextX - x;
  } else {
    actualCellWidth = cellWidth;
  }

  const width = actualCellWidth * 2;
  const centerX = x + width / 2;
  const radius = (Math.min(width, cellHeight) / 2) * 0.9;

  if (radius < 2) {
    return;
  }

  ctx.beginPath();
  ctx.arc(centerX, y, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = getSemanticTextColor('notation');
  ctx.lineWidth = Math.max(0.5, actualCellWidth * 0.05);
  ctx.stroke();

  if (tonicSign.tonicNumber == null) {
    return;
  }
  const numberText = tonicSign.tonicNumber.toString();
  const fontSize = radius * 1.5;
  if (fontSize < 6) {
    return;
  }

  ctx.fillStyle = getSemanticTextColor('notation');
  ctx.font = buildCanvasFont('notation-label', { fontSizePx: fontSize });
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(numberText, centerX, y);
}

interface NoteMarkerAnalysis {
  crossesMarkers: boolean;
  segments: ReturnType<typeof getCurrentCoordinateMapping>['segments'];
  noteStartX: number;
  noteEndX: number;
}

export function analyzeNoteCrossesMarkers(note: PlacedNote, options: PitchRendererOptions): NoteMarkerAnalysis {
  const noteStartX = getColumnX(note.startColumnIndex, options);
  const noteEndX = getColumnX(getNoteEndColumn(note), options);
  const { tempoModulationMarkers } = options;

  if (!tempoModulationMarkers || tempoModulationMarkers.length === 0) {
    return { crossesMarkers: false, segments: [], noteStartX, noteEndX };
  }

  const mapping = getCurrentCoordinateMapping(options);

  const affectedSegments = mapping.segments.filter(segment => {
    const segmentStartX = getColumnX(segment.startColumn, options);
    const segmentEndX = getColumnX(segment.endColumn, options);
    return !(noteEndX <= segmentStartX || noteStartX >= segmentEndX);
  });

  const crossesMarkers = affectedSegments.length > 1;

  return {
    crossesMarkers,
    segments: affectedSegments,
    noteStartX,
    noteEndX
  };
}
