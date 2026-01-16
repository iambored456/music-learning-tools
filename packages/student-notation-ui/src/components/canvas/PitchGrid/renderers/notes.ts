// js/components/Canvas/PitchGrid/renderers/notes.ts
import { getColumnX, getRowY, getCurrentCoordinateMapping } from './rendererUtils.ts';
import TonalService from '@services/tonalService.ts';
import store from '@state/initStore.ts';
import columnMapService from '@services/columnMapService.ts';
import type { AppState, CanvasSpaceColumn, ModulationMarker, PlacedNote, TonicSign } from '@app-types/state.js';
import {
  OVAL_NOTE_FONT_RATIO,
  FILLED_NOTE_FONT_RATIO,
  MIN_FONT_SIZE,
  MIN_STROKE_WIDTH_THICK,
  STROKE_WIDTH_RATIO,
  TAIL_LINE_WIDTH_RATIO,
  MIN_TAIL_LINE_WIDTH,
  SHADOW_BLUR_RADIUS
} from '../../../../core/constants.js';

const SHARP_SYMBOL = '\u266F';
const FLAT_SYMBOL = '\u266D';
const DEGREE_SEPARATOR = '/';

type PitchRendererOptions = Partial<AppState> & {
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

interface DegreeFontResult {
  multiplier: number;
  category: 'natural' | 'single-accidental' | 'both-accidentals';
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
  const effectsWindow = window as Window & { animationEffectsManager?: AnimationEffectsManager };
  return effectsWindow.animationEffectsManager;
};

const getPlacedNotes = (): PlacedNote[] => store.state.placedNotes;

let _invalidDimensionWarningShown = false;

const getUuidTimestamp = (value?: string): number => {
  const timestampSegment = value?.split('-')[1];
  return Number.parseInt(timestampSegment ?? '0', 10);
};

/**
 * Determines if a note has a visible tail (duration extends beyond the base note shape).
 *
 * Note duration model:
 * - A note occupies columns from startColumnIndex to endColumnIndex (inclusive)
 * - Circle notes have a 2-column baseline: startColumnIndex and startColumnIndex + 1
 * - Oval notes have a 1-column baseline: startColumnIndex only
 * - A tail is visible when endColumnIndex extends beyond the baseline
 *
 * @returns true if the note's duration extends beyond its baseline shape
 */
function hasVisibleTail(note: PlacedNote): boolean {
  if (!note || typeof note.startColumnIndex !== 'number' || typeof note.endColumnIndex !== 'number') {
    return false;
  }
  const baselineEnd = note.shape === 'circle'
    ? note.startColumnIndex + 1
    : note.startColumnIndex;
  return note.endColumnIndex > baselineEnd;
}

function calculateColorOffset(note: PlacedNote, allNotes: PlacedNote[], options: PitchRendererOptions): number {
  const { cellWidth } = options;
  const offsetAmount = cellWidth * 0.25;

  const noteUuid = note.uuid;
  if (!noteUuid) {
    return 0;
  }

  const notesAtSamePosition = allNotes.filter(otherNote =>
    !otherNote.isDrum &&
    otherNote.row === note.row &&
    otherNote.startColumnIndex === note.startColumnIndex &&
    otherNote.uuid &&
    otherNote.uuid !== noteUuid
  );

  if (notesAtSamePosition.length === 0) {
    return 0;
  }

  const allNotesAtPosition = [note, ...notesAtSamePosition];
  allNotesAtPosition.sort((a, b) => getUuidTimestamp(a.uuid) - getUuidTimestamp(b.uuid));

  const currentNoteIndex = allNotesAtPosition.findIndex(n => n.uuid === noteUuid);
  return currentNoteIndex * offsetAmount;
}

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
  const delayEffects = animationManager.getDelayEffects?.(note.color);
  if (!delayEffects || delayEffects.length === 0) {
    return;
  }

  // Draw ghost notes to the right of the original note
  delayEffects.forEach((echo, index) => {
    // Calculate X offset based on delay time (delay is in ms, map to pixels)
    // 500ms max delay = ~2 cell widths offset
    const offsetX = (echo.delay / 500) * cellWidth * 2;
    const echoX = centerX + offsetX;

    // Scale down slightly for each echo
    const echoRx = rx * echo.scale;
    const echoRy = ry * echo.scale;

    ctx.save();
    ctx.globalAlpha = echo.opacity * 0.6; // Additional opacity reduction for ghosts

    // Draw ghost note outline
    ctx.beginPath();
    ctx.ellipse(echoX, centerY, echoRx, echoRy, 0, 0, 2 * Math.PI);
    ctx.strokeStyle = note.color;
    ctx.lineWidth = Math.max(0.5, echoRx * 0.1);
    ctx.setLineDash([2, 2]); // Dashed line for ghost effect
    ctx.stroke();

    ctx.restore();
  });
}

function drawEnvelopeFill(
  ctx: CanvasRenderingContext2D,
  note: PlacedNote,
  centerX: number,
  centerY: number,
  rx: number,
  ry: number
): void {
  const animationManager = getAnimationEffectsManager();
  if (!animationManager?.shouldFillNote?.(note)) {
    return;
  }

  const fillLevel = animationManager.getFillLevel?.(note) ?? 0;
  if (fillLevel <= 0) {return;}

  ctx.save();

  const innerRatio = 1 - fillLevel;
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(rx, ry));
  gradient.addColorStop(0, 'transparent');
  gradient.addColorStop(Math.max(0, innerRatio - 0.05), 'transparent');
  gradient.addColorStop(innerRatio, `${note.color}1F`);
  gradient.addColorStop(1, `${note.color}BF`);

  ctx.beginPath();
  ctx.ellipse(centerX, centerY, rx, ry, 0, 0, 2 * Math.PI);
  ctx.clip();
  ctx.fillStyle = gradient;
  ctx.fillRect(centerX - rx - 10, centerY - ry - 10, (rx + 10) * 2, (ry + 10) * 2);

  ctx.restore();
}

function drawEnvelopeFillStadium(
  ctx: CanvasRenderingContext2D,
  note: PlacedNote,
  leftCenterX: number,
  rightCenterX: number,
  centerY: number,
  ry: number
): void {
  const animationManager = getAnimationEffectsManager();
  if (!animationManager?.shouldFillNote?.(note)) {
    return;
  }

  const fillLevel = animationManager.getFillLevel?.(note) ?? 0;
  if (fillLevel <= 0) {return;}

  ctx.save();

  // Create the stadium clip path
  ctx.beginPath();
  ctx.arc(leftCenterX, centerY, ry, Math.PI / 2, -Math.PI / 2, false);
  ctx.lineTo(rightCenterX, centerY - ry);
  ctx.arc(rightCenterX, centerY, ry, -Math.PI / 2, Math.PI / 2, false);
  ctx.lineTo(leftCenterX, centerY + ry);
  ctx.closePath();
  ctx.clip();

  // Use a radial gradient centered in the middle of the stadium
  const stadiumCenterX = (leftCenterX + rightCenterX) / 2;
  const stadiumWidth = rightCenterX - leftCenterX;
  const gradientRadius = Math.max(stadiumWidth / 2 + ry, ry);

  const innerRatio = 1 - fillLevel;
  const gradient = ctx.createRadialGradient(stadiumCenterX, centerY, 0, stadiumCenterX, centerY, gradientRadius);
  gradient.addColorStop(0, 'transparent');
  gradient.addColorStop(Math.max(0, innerRatio - 0.05), 'transparent');
  gradient.addColorStop(innerRatio, `${note.color}1F`);
  gradient.addColorStop(1, `${note.color}BF`);

  ctx.fillStyle = gradient;
  ctx.fillRect(leftCenterX - ry - 10, centerY - ry - 10, stadiumWidth + (ry + 10) * 2, (ry + 10) * 2);

  ctx.restore();
}

/**
 * Draws a stadium/capsule shape for long notes (style 2).
 *
 * A stadium is a rounded rectangle - essentially two semicircles connected by parallel lines.
 * This creates a smooth, continuous shape that visually represents the note's full duration.
 *
 * @param leftCenterX - X position of the left semicircle center (note start position)
 * @param rightCenterX - X position of the right semicircle center (note end position)
 * @param centerY - Y position (vertical center of the stadium)
 * @param ry - Radius of the semicircles (half the note height)
 * @param strokeWidth - Width of the stadium outline
 */
function drawStadiumShape(
  ctx: CanvasRenderingContext2D,
  note: PlacedNote,
  options: PitchRendererOptions,
  leftCenterX: number,
  rightCenterX: number,
  centerY: number,
  ry: number,
  strokeWidth: number
): void {
  // Draw envelope fill first (behind the stroke)
  drawEnvelopeFillStadium(ctx, note, leftCenterX, rightCenterX, centerY, ry);

  // Draw the stadium stroke path
  // Path construction creates a closed shape:
  // 1. Left semicircle (bottom → top)
  // 2. Top straight edge (left → right)
  // 3. Right semicircle (top → bottom)
  // 4. Bottom straight edge (right → left, implicit via closePath)
  ctx.save();
  ctx.beginPath();
  ctx.arc(leftCenterX, centerY, ry, Math.PI / 2, -Math.PI / 2, false);
  ctx.lineTo(rightCenterX, centerY - ry);
  ctx.arc(rightCenterX, centerY, ry, -Math.PI / 2, Math.PI / 2, false);
  ctx.lineTo(leftCenterX, centerY + ry);
  ctx.closePath();

  ctx.strokeStyle = note.color;
  ctx.lineWidth = strokeWidth;
  ctx.shadowColor = note.color;
  ctx.shadowBlur = SHADOW_BLUR_RADIUS;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.restore();

  // Draw scale degree text in the center of the stadium
  if (options.degreeDisplayMode !== 'off') {
    const stadiumCenterX = (leftCenterX + rightCenterX) / 2;
    drawScaleDegreeText(ctx, note, options, stadiumCenterX, centerY, ry);
  }
}

function calculateTailYOffset(note: PlacedNote, allNotes: PlacedNote[], options: PitchRendererOptions): number {
  const { cellHeight } = options;
  const tailOffsetAmount = (cellHeight / 2) * 0.12;

  const noteUuid = note.uuid;
  if (!noteUuid) {
    return 0;
  }

  const notesWithTailsAtSamePosition = allNotes.filter(otherNote =>
    !otherNote.isDrum &&
    otherNote.row === note.row &&
    otherNote.startColumnIndex === note.startColumnIndex &&
    otherNote.uuid &&
    otherNote.uuid !== noteUuid &&
    hasVisibleTail(otherNote)
  );

  if (notesWithTailsAtSamePosition.length === 0) {
    return 0;
  }

  const allNotesWithTailsAtPosition = [note, ...notesWithTailsAtSamePosition];
  allNotesWithTailsAtPosition.sort((a, b) => getUuidTimestamp(a.uuid) - getUuidTimestamp(b.uuid));

  const currentNoteIndex = allNotesWithTailsAtPosition.findIndex(n => n.uuid === noteUuid);
  return currentNoteIndex * tailOffsetAmount;
}

function getScaleDegreeLabel(note: PlacedNote, options: PitchRendererOptions): ScaleDegreeResult {
  const degreeStr = TonalService.getDegreeForNote(note, options as AppState);
  if (!degreeStr) {
    return { label: null, isAccidental: false };
  }

  const isAccidental = TonalService.hasAccidental(degreeStr);
  if (!isAccidental) {
    return { label: degreeStr, isAccidental: false };
  }

  const accidentalMode = store.state.accidentalMode || {};
  const sharpEnabled = accidentalMode.sharp ?? true;
  const flatEnabled = accidentalMode.flat ?? true;

  if (!sharpEnabled && !flatEnabled) {
    return { label: null, isAccidental: true };
  }

  let sharpLabel = degreeStr.includes(SHARP_SYMBOL) ? degreeStr : null;
  let flatLabel = degreeStr.includes(FLAT_SYMBOL) ? degreeStr : null;
  const enharmonic = TonalService.getEnharmonicDegree(degreeStr);

  if (enharmonic) {
    if (enharmonic.includes(SHARP_SYMBOL) && !sharpLabel) {
      sharpLabel = enharmonic;
    }
    if (enharmonic.includes(FLAT_SYMBOL) && !flatLabel) {
      flatLabel = enharmonic;
    }
  }

  let label: string | null = null;
  if (sharpEnabled && flatEnabled) {
    const parts: string[] = [];
    if (sharpLabel) {
      parts.push(sharpLabel);
    }
    if (flatLabel && (!sharpLabel || flatLabel !== sharpLabel)) {
      parts.push(flatLabel);
    }
    label = parts.join(DEGREE_SEPARATOR);
    if (!label) {
      label = degreeStr;
    }
  } else if (sharpEnabled) {
    label = sharpLabel || degreeStr;
  } else if (flatEnabled) {
    label = flatLabel || degreeStr;
  }

  return { label, isAccidental: true };
}

function getDegreeFontMultiplier(label: string | null): DegreeFontResult {
  if (!label) {return { multiplier: 1.0, category: 'natural' };
  }

  const hasFlat = label.includes(FLAT_SYMBOL);
  const hasSharp = label.includes(SHARP_SYMBOL);
  const hasBothAccidentals = label.includes(DEGREE_SEPARATOR);

  if (!hasFlat && !hasSharp) {
    return { multiplier: 1.0, category: 'natural' };
  }
  if (hasBothAccidentals) {
    return { multiplier: 0.75, category: 'both-accidentals' };
  }
  return { multiplier: 0.88, category: 'single-accidental' };
}

function drawScaleDegreeText(
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

  const { multiplier: contentMultiplier, category } = getDegreeFontMultiplier(noteLabel);
  let baseFontSize: number;

  if (note.shape === 'circle') {
    const circleBaseSize = noteWidth * 2 * FILLED_NOTE_FONT_RATIO;
    switch (category) {
      case 'natural':
        baseFontSize = circleBaseSize;
        break;
      case 'single-accidental':
        baseFontSize = circleBaseSize * 0.8;
        break;
      case 'both-accidentals':
        baseFontSize = circleBaseSize * 0.4;
        break;
      default:
        baseFontSize = circleBaseSize * contentMultiplier;
    }
  } else {
    const ovalBaseSize = noteWidth * 2 * OVAL_NOTE_FONT_RATIO;
    switch (category) {
      case 'natural':
        baseFontSize = ovalBaseSize * 1.5;
        break;
      case 'single-accidental':
        baseFontSize = ovalBaseSize * 1.2;
        break;
      case 'both-accidentals':
        baseFontSize = ovalBaseSize;
        break;
      default:
        baseFontSize = ovalBaseSize * contentMultiplier;
    }
  }

  const fontSize = baseFontSize;
  if (fontSize < MIN_FONT_SIZE) {return;
  }

  ctx.fillStyle = '#212529';
  ctx.font = `bold ${fontSize}px 'Atkinson Hyperlegible', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (note.shape === 'oval' && category === 'both-accidentals' && noteLabel.includes(DEGREE_SEPARATOR)) {
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

  const xOffset = calculateColorOffset(note, getPlacedNotes(), options);
  const centerX = xStart + actualCellWidth + xOffset;
  const dynamicStrokeWidth = Math.max(MIN_STROKE_WIDTH_THICK, actualCellWidth * STROKE_WIDTH_RATIO);
  const ry = (cellHeight / 2) - (dynamicStrokeWidth / 2);

  // Long note rendering: Two styles available for notes with extended duration
  const hasTail = hasVisibleTail(note);
  const longNoteStyle = store.state.longNoteStyle || 'style1';

  if (hasTail && longNoteStyle === 'style2') {
    // Style 2: Stadium/capsule shape - a continuous rounded rectangle from start to end
    //
    // Stadium shape construction:
    // - Left semicircle centered at the note's starting circle position (centerX)
    // - Right semicircle centered at the beginning of endColumnIndex column
    // - This ensures the rightmost edge of the semicircle aligns with the note's
    //   last duration column, making the shape end exactly at endColumnIndex
    // - Horizontal lines connect the top and bottom of both semicircles
    //
    const leftCenterX = centerX;
    const rightCenterX = getColumnX(note.endColumnIndex, options);

    if (!hasRenderableDimensions(rightCenterX - leftCenterX, ry)) {
      return;
    }

    drawStadiumShape(ctx, note, options, leftCenterX, rightCenterX, y, ry, dynamicStrokeWidth);
    return;
  }

  // Style 1 (default): Tail line + circle
  // - Draws a horizontal line from the circle center to endColumnIndex + 1
  // - Then draws the circular note head on top
  if (hasTail) {
    const originalEndX = getColumnX(note.endColumnIndex + 1, options);
    const tailYOffset = calculateTailYOffset(note, getPlacedNotes(), options);
    const tailY = y + tailYOffset;

    ctx.beginPath();
    ctx.moveTo(centerX, tailY);
    ctx.lineTo(originalEndX, tailY);
    ctx.strokeStyle = note.color;
    ctx.lineWidth = Math.max(MIN_TAIL_LINE_WIDTH, actualCellWidth * TAIL_LINE_WIDTH_RATIO);
    ctx.stroke();
  }

  const rx = actualCellWidth - (dynamicStrokeWidth / 2);

  if (!hasRenderableDimensions(rx, ry)) {
    return;
  }

  // Draw delay ghost notes first (behind the main note)
  drawDelayGhostNotes(ctx, note, options, centerX, y, rx, ry);

  ctx.save();
  drawEnvelopeFill(ctx, note, centerX, y, rx, ry);

  // Apply reverb glow effect
  const reverbGlow = applyReverbGlow(ctx, note, options);
  if (reverbGlow.shouldApply) {
    ctx.shadowColor = note.color;
    ctx.shadowBlur = SHADOW_BLUR_RADIUS + reverbGlow.blur;
    ctx.shadowOffsetX = reverbGlow.spread; // Rightward glow
  }

  ctx.beginPath();
  ctx.ellipse(centerX, y, rx, ry, 0, 0, 2 * Math.PI);
  ctx.strokeStyle = note.color;
  ctx.lineWidth = dynamicStrokeWidth;
  if (!reverbGlow.shouldApply) {
    ctx.shadowColor = note.color;
    ctx.shadowBlur = SHADOW_BLUR_RADIUS;
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.shadowOffsetX = 0;
  ctx.restore();

  if (options.degreeDisplayMode !== 'off') {
    drawScaleDegreeText(ctx, note, options, centerX, y, rx);
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
    // `musicalColumnWidths` is legacy naming and may be present as an empty array (truthy);
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

  const xOffset = calculateColorOffset(note, getPlacedNotes(), options);
  const dynamicStrokeWidth = Math.max(0.5, currentCellWidth * 0.15);
  const cx = x + currentCellWidth / 2 + xOffset;
  const rx = (currentCellWidth / 2) - (dynamicStrokeWidth / 2);
  const ry = (cellHeight / 2) - (dynamicStrokeWidth / 2);

  if (!hasRenderableDimensions(rx, ry)) {
    return;
  }

  // Draw delay ghost notes first (behind the main note)
  drawDelayGhostNotes(ctx, note, options, cx, y, rx, ry);

  ctx.save();
  drawEnvelopeFill(ctx, note, cx, y, rx, ry);

  // Apply reverb glow effect
  const reverbGlow = applyReverbGlow(ctx, note, options);
  if (reverbGlow.shouldApply) {
    ctx.shadowColor = note.color;
    ctx.shadowBlur = SHADOW_BLUR_RADIUS + reverbGlow.blur;
    ctx.shadowOffsetX = reverbGlow.spread; // Rightward glow
  }

  ctx.beginPath();
  ctx.ellipse(cx, y, rx, ry, 0, 0, 2 * Math.PI);
  ctx.strokeStyle = note.color;
  ctx.lineWidth = dynamicStrokeWidth;
  if (!reverbGlow.shouldApply) {
    ctx.shadowColor = note.color;
    ctx.shadowBlur = SHADOW_BLUR_RADIUS;
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.shadowOffsetX = 0;
  ctx.restore();

  if (options.degreeDisplayMode !== 'off') {
    drawScaleDegreeText(ctx, note, options, cx, y, rx);
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
  ctx.strokeStyle = '#212529';
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

  ctx.fillStyle = '#212529';
  ctx.font = `bold ${fontSize}px 'Atkinson Hyperlegible', sans-serif`;
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
  const noteEndX = getColumnX(note.endColumnIndex + 1, options);
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
