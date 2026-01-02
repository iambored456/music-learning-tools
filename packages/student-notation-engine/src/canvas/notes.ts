/**
 * Note Renderer
 *
 * Framework-agnostic note rendering functions for the pitch grid.
 * All dependencies are injected via callbacks - no store or service imports.
 */

import type { PlacedNote, ModulationMarker, DegreeDisplayMode, LongNoteStyle, AccidentalMode } from '@mlt/types';
import type { CoordinateUtils, CoordinateOptions } from './coordinateUtils.js';

// Constants
const SHARP_SYMBOL = '\u266F';
const FLAT_SYMBOL = '\u266D';
const DEGREE_SEPARATOR = '/';

const OVAL_NOTE_FONT_RATIO = 0.35;
const FILLED_NOTE_FONT_RATIO = 0.5;
const MIN_FONT_SIZE = 6;
const MIN_STROKE_WIDTH_THICK = 1;
const STROKE_WIDTH_RATIO = 0.08;
const TAIL_LINE_WIDTH_RATIO = 0.04;
const MIN_TAIL_LINE_WIDTH = 1;
const SHADOW_BLUR_RADIUS = 4;

/**
 * Animation effects manager interface
 */
export interface AnimationEffectsManager {
  shouldAnimateNote(note: PlacedNote): boolean;
  getVibratoYOffset(color?: string): number;
  shouldFillNote(note: PlacedNote): boolean;
  getFillLevel(note: PlacedNote): number;
  hasReverbEffect?: (color: string) => boolean;
  getReverbEffect?: (color: string) => { opacity: number; blur: number; spread: number };
  hasDelayEffect(color: string): boolean;
  getDelayEffects(color: string): Array<{ delay: number; opacity: number; scale: number; active: boolean }>;
}

/**
 * Scale degree result
 */
interface ScaleDegreeResult {
  label: string | null;
  isAccidental: boolean;
}

/**
 * Degree font result
 */
interface DegreeFontResult {
  multiplier: number;
  category: 'natural' | 'single-accidental' | 'both-accidentals';
}

/**
 * Options for note rendering
 */
export interface NoteRenderOptions extends CoordinateOptions {
  /** All placed notes (for stacking calculations) */
  placedNotes: PlacedNote[];
  /** Degree display mode */
  degreeDisplayMode: DegreeDisplayMode;
  /** Long note rendering style */
  longNoteStyle: LongNoteStyle;
  /** Accidental display mode */
  accidentalMode: AccidentalMode;
}

/**
 * Callbacks for note rendering
 */
export interface NoteRenderCallbacks {
  /** Coordinate utilities */
  coords: CoordinateUtils;
  /** Get scale degree for a note */
  getDegreeForNote?: (note: PlacedNote) => string | null;
  /** Check if degree has accidental */
  hasAccidental?: (degree: string) => boolean;
  /** Get enharmonic degree */
  getEnharmonicDegree?: (degree: string) => string | null;
  /** Get animation effects manager */
  getAnimationEffectsManager?: () => AnimationEffectsManager | undefined;
}

/**
 * Create note renderer with injected callbacks
 */
export function createNoteRenderer(callbacks: NoteRenderCallbacks) {
  const { coords } = callbacks;

  // Get UUID timestamp for sorting
  function getUuidTimestamp(value?: string): number {
    const timestampSegment = value?.split('-')[1];
    return Number.parseInt(timestampSegment ?? '0', 10);
  }

  /**
   * Check if note has visible tail (duration extends beyond base shape)
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

  /**
   * Check if dimensions are renderable
   */
  function hasRenderableDimensions(width: number, height: number): boolean {
    return Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0;
  }

  /**
   * Calculate horizontal offset for stacked notes at same position
   */
  function calculateColorOffset(note: PlacedNote, allNotes: PlacedNote[], options: NoteRenderOptions): number {
    const { cellWidth } = options;
    const offsetAmount = cellWidth * 0.25;

    const noteUuid = note.uuid;
    if (!noteUuid) return 0;

    const notesAtSamePosition = allNotes.filter(otherNote =>
      !otherNote.isDrum &&
      otherNote.row === note.row &&
      otherNote.startColumnIndex === note.startColumnIndex &&
      otherNote.uuid &&
      otherNote.uuid !== noteUuid
    );

    if (notesAtSamePosition.length === 0) return 0;

    const allNotesAtPosition = [note, ...notesAtSamePosition];
    allNotesAtPosition.sort((a, b) => getUuidTimestamp(a.uuid) - getUuidTimestamp(b.uuid));

    const currentNoteIndex = allNotesAtPosition.findIndex(n => n.uuid === noteUuid);
    return currentNoteIndex * offsetAmount;
  }

  /**
   * Calculate vibrato Y offset
   */
  function calculateVibratoYOffset(note: PlacedNote, options: NoteRenderOptions): number {
    const { cellHeight } = options;
    const animationManager = callbacks.getAnimationEffectsManager?.();

    if (!animationManager?.shouldAnimateNote?.(note)) return 0;

    const vibratoOffset = animationManager.getVibratoYOffset?.(note.color) ?? 0;
    return vibratoOffset * cellHeight;
  }

  /**
   * Calculate tail Y offset for stacked long notes
   */
  function calculateTailYOffset(note: PlacedNote, allNotes: PlacedNote[], options: NoteRenderOptions): number {
    const { cellHeight } = options;
    const tailOffsetAmount = (cellHeight / 2) * 0.12;

    const noteUuid = note.uuid;
    if (!noteUuid) return 0;

    const notesWithTailsAtSamePosition = allNotes.filter(otherNote =>
      !otherNote.isDrum &&
      otherNote.row === note.row &&
      otherNote.startColumnIndex === note.startColumnIndex &&
      otherNote.uuid &&
      otherNote.uuid !== noteUuid &&
      hasVisibleTail(otherNote)
    );

    if (notesWithTailsAtSamePosition.length === 0) return 0;

    const allNotesWithTailsAtPosition = [note, ...notesWithTailsAtSamePosition];
    allNotesWithTailsAtPosition.sort((a, b) => getUuidTimestamp(a.uuid) - getUuidTimestamp(b.uuid));

    const currentNoteIndex = allNotesWithTailsAtPosition.findIndex(n => n.uuid === noteUuid);
    return currentNoteIndex * tailOffsetAmount;
  }

  /**
   * Get scale degree label for a note
   */
  function getScaleDegreeLabel(note: PlacedNote, options: NoteRenderOptions): ScaleDegreeResult {
    const degreeStr = callbacks.getDegreeForNote?.(note);
    if (!degreeStr) return { label: null, isAccidental: false };

    const isAccidental = callbacks.hasAccidental?.(degreeStr) ?? false;
    if (!isAccidental) return { label: degreeStr, isAccidental: false };

    const accidentalMode = options.accidentalMode || {};
    const sharpEnabled = accidentalMode.sharp ?? true;
    const flatEnabled = accidentalMode.flat ?? true;

    if (!sharpEnabled && !flatEnabled) return { label: null, isAccidental: true };

    let sharpLabel = degreeStr.includes(SHARP_SYMBOL) ? degreeStr : null;
    let flatLabel = degreeStr.includes(FLAT_SYMBOL) ? degreeStr : null;
    const enharmonic = callbacks.getEnharmonicDegree?.(degreeStr);

    if (enharmonic) {
      if (enharmonic.includes(SHARP_SYMBOL) && !sharpLabel) sharpLabel = enharmonic;
      if (enharmonic.includes(FLAT_SYMBOL) && !flatLabel) flatLabel = enharmonic;
    }

    let label: string | null = null;
    if (sharpEnabled && flatEnabled) {
      const parts: string[] = [];
      if (sharpLabel) parts.push(sharpLabel);
      if (flatLabel && (!sharpLabel || flatLabel !== sharpLabel)) parts.push(flatLabel);
      label = parts.join(DEGREE_SEPARATOR);
      if (!label) label = degreeStr;
    } else if (sharpEnabled) {
      label = sharpLabel || degreeStr;
    } else if (flatEnabled) {
      label = flatLabel || degreeStr;
    }

    return { label, isAccidental: true };
  }

  /**
   * Get font multiplier based on degree label content
   */
  function getDegreeFontMultiplier(label: string | null): DegreeFontResult {
    if (!label) return { multiplier: 1.0, category: 'natural' };

    const hasFlat = label.includes(FLAT_SYMBOL);
    const hasSharp = label.includes(SHARP_SYMBOL);
    const hasBothAccidentals = label.includes(DEGREE_SEPARATOR);

    if (!hasFlat && !hasSharp) return { multiplier: 1.0, category: 'natural' };
    if (hasBothAccidentals) return { multiplier: 0.75, category: 'both-accidentals' };
    return { multiplier: 0.88, category: 'single-accidental' };
  }

  /**
   * Draw scale degree text inside a note
   */
  function drawScaleDegreeText(
    ctx: CanvasRenderingContext2D,
    note: PlacedNote,
    options: NoteRenderOptions,
    centerX: number,
    centerY: number,
    noteWidth: number
  ): void {
    const { label: noteLabel } = getScaleDegreeLabel(note, options);
    if (!noteLabel) return;

    const { multiplier: contentMultiplier, category } = getDegreeFontMultiplier(noteLabel);
    let baseFontSize: number;

    if (note.shape === 'circle') {
      const circleBaseSize = noteWidth * 2 * FILLED_NOTE_FONT_RATIO;
      switch (category) {
        case 'natural': baseFontSize = circleBaseSize; break;
        case 'single-accidental': baseFontSize = circleBaseSize * 0.8; break;
        case 'both-accidentals': baseFontSize = circleBaseSize * 0.4; break;
        default: baseFontSize = circleBaseSize * contentMultiplier;
      }
    } else {
      const ovalBaseSize = noteWidth * 2 * OVAL_NOTE_FONT_RATIO;
      switch (category) {
        case 'natural': baseFontSize = ovalBaseSize * 1.5; break;
        case 'single-accidental': baseFontSize = ovalBaseSize * 1.2; break;
        case 'both-accidentals': baseFontSize = ovalBaseSize; break;
        default: baseFontSize = ovalBaseSize * contentMultiplier;
      }
    }

    if (baseFontSize < MIN_FONT_SIZE) return;

    ctx.fillStyle = '#212529';
    ctx.font = `bold ${baseFontSize}px 'Atkinson Hyperlegible', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (note.shape === 'oval' && category === 'both-accidentals' && noteLabel.includes(DEGREE_SEPARATOR)) {
      const parts = noteLabel.split(DEGREE_SEPARATOR);
      const lineHeight = baseFontSize * 1.1;
      const totalHeight = lineHeight * (parts.length - 1);
      const startY = centerY - (totalHeight / 2);

      parts.forEach((part, index) => {
        const y = startY + (index * lineHeight);
        const opticalOffset = baseFontSize * 0.08;
        ctx.fillText(part.trim(), centerX, y + opticalOffset);
      });
    } else {
      const opticalOffset = baseFontSize * 0.08;
      ctx.fillText(noteLabel, centerX, centerY + opticalOffset);
    }
  }

  /**
   * Apply reverb glow effect
   */
  function applyReverbGlow(
    ctx: CanvasRenderingContext2D,
    note: PlacedNote,
    options: NoteRenderOptions
  ): { shouldApply: boolean; blur: number; spread: number } {
    const animationManager = callbacks.getAnimationEffectsManager?.();
    const hasReverbEffect = animationManager?.hasReverbEffect;
    const shouldCheckReverb = typeof hasReverbEffect === 'function'
      ? hasReverbEffect(note.color)
      : Boolean(hasReverbEffect);

    if (!shouldCheckReverb) return { shouldApply: false, blur: 0, spread: 0 };

    const { cellWidth } = options;
    const reverbEffect = animationManager?.getReverbEffect?.(note.color);
    if (!reverbEffect) return { shouldApply: false, blur: 0, spread: 0 };

    const blur = reverbEffect.blur * (cellWidth / 2);
    const spread = reverbEffect.spread * (cellWidth / 3);

    return { shouldApply: blur > 0 || spread > 0, blur, spread };
  }

  /**
   * Draw delay ghost notes
   */
  function drawDelayGhostNotes(
    ctx: CanvasRenderingContext2D,
    note: PlacedNote,
    options: NoteRenderOptions,
    centerX: number,
    centerY: number,
    rx: number,
    ry: number
  ): void {
    const animationManager = callbacks.getAnimationEffectsManager?.();
    if (!animationManager?.hasDelayEffect?.(note.color)) return;

    const { cellWidth } = options;
    const delayEffects = animationManager.getDelayEffects?.(note.color);
    if (!delayEffects || delayEffects.length === 0) return;

    delayEffects.forEach((echo) => {
      const offsetX = (echo.delay / 500) * cellWidth * 2;
      const echoX = centerX + offsetX;
      const echoRx = rx * echo.scale;
      const echoRy = ry * echo.scale;

      ctx.save();
      ctx.globalAlpha = echo.opacity * 0.6;

      ctx.beginPath();
      ctx.ellipse(echoX, centerY, echoRx, echoRy, 0, 0, 2 * Math.PI);
      ctx.strokeStyle = note.color;
      ctx.lineWidth = Math.max(0.5, echoRx * 0.1);
      ctx.setLineDash([2, 2]);
      ctx.stroke();

      ctx.restore();
    });
  }

  /**
   * Draw envelope fill effect
   */
  function drawEnvelopeFill(
    ctx: CanvasRenderingContext2D,
    note: PlacedNote,
    centerX: number,
    centerY: number,
    rx: number,
    ry: number
  ): void {
    const animationManager = callbacks.getAnimationEffectsManager?.();
    if (!animationManager?.shouldFillNote?.(note)) return;

    const fillLevel = animationManager.getFillLevel?.(note) ?? 0;
    if (fillLevel <= 0) return;

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

  /**
   * Draw envelope fill for stadium shape
   */
  function drawEnvelopeFillStadium(
    ctx: CanvasRenderingContext2D,
    note: PlacedNote,
    leftCenterX: number,
    rightCenterX: number,
    centerY: number,
    ry: number
  ): void {
    const animationManager = callbacks.getAnimationEffectsManager?.();
    if (!animationManager?.shouldFillNote?.(note)) return;

    const fillLevel = animationManager.getFillLevel?.(note) ?? 0;
    if (fillLevel <= 0) return;

    ctx.save();

    // Create the stadium clip path
    ctx.beginPath();
    ctx.arc(leftCenterX, centerY, ry, Math.PI / 2, -Math.PI / 2, false);
    ctx.lineTo(rightCenterX, centerY - ry);
    ctx.arc(rightCenterX, centerY, ry, -Math.PI / 2, Math.PI / 2, false);
    ctx.lineTo(leftCenterX, centerY + ry);
    ctx.closePath();
    ctx.clip();

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
   * Draw stadium shape for long notes (style 2)
   */
  function drawStadiumShape(
    ctx: CanvasRenderingContext2D,
    note: PlacedNote,
    options: NoteRenderOptions,
    leftCenterX: number,
    rightCenterX: number,
    centerY: number,
    ry: number,
    strokeWidth: number
  ): void {
    drawEnvelopeFillStadium(ctx, note, leftCenterX, rightCenterX, centerY, ry);

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

    if (options.degreeDisplayMode !== 'off') {
      const stadiumCenterX = (leftCenterX + rightCenterX) / 2;
      drawScaleDegreeText(ctx, note, options, stadiumCenterX, centerY, ry);
    }
  }

  /**
   * Draw a two-column oval note (circle notes)
   */
  function drawTwoColumnOvalNote(
    ctx: CanvasRenderingContext2D,
    options: NoteRenderOptions,
    note: PlacedNote,
    rowIndex: number
  ): void {
    const { cellWidth, cellHeight, modulationMarkers, placedNotes } = options;
    const baseY = coords.getRowY(rowIndex, options);
    const vibratoYOffset = calculateVibratoYOffset(note, options);
    const y = baseY + vibratoYOffset;
    const xStart = coords.getColumnX(note.startColumnIndex, options);

    let actualCellWidth: number;
    if (modulationMarkers && modulationMarkers.length > 0) {
      const nextX = coords.getColumnX(note.startColumnIndex + 1, options);
      actualCellWidth = nextX - xStart;
    } else {
      actualCellWidth = cellWidth;
    }

    if (!hasRenderableDimensions(actualCellWidth, cellHeight)) return;

    const xOffset = calculateColorOffset(note, placedNotes, options);
    const centerX = xStart + actualCellWidth + xOffset;
    const dynamicStrokeWidth = Math.max(MIN_STROKE_WIDTH_THICK, actualCellWidth * STROKE_WIDTH_RATIO);
    const ry = (cellHeight / 2) - (dynamicStrokeWidth / 2);

    const hasTail = hasVisibleTail(note);
    const longNoteStyle = options.longNoteStyle || 'style1';

    if (hasTail && longNoteStyle === 'style2') {
      const leftCenterX = centerX;
      const rightCenterX = coords.getColumnX(note.endColumnIndex, options);

      if (!hasRenderableDimensions(rightCenterX - leftCenterX, ry)) return;

      drawStadiumShape(ctx, note, options, leftCenterX, rightCenterX, y, ry, dynamicStrokeWidth);
      return;
    }

    // Style 1: Tail line + circle
    if (hasTail) {
      const originalEndX = coords.getColumnX(note.endColumnIndex + 1, options);
      const tailYOffset = calculateTailYOffset(note, placedNotes, options);
      const tailY = y + tailYOffset;

      ctx.beginPath();
      ctx.moveTo(centerX, tailY);
      ctx.lineTo(originalEndX, tailY);
      ctx.strokeStyle = note.color;
      ctx.lineWidth = Math.max(MIN_TAIL_LINE_WIDTH, actualCellWidth * TAIL_LINE_WIDTH_RATIO);
      ctx.stroke();
    }

    const rx = actualCellWidth - (dynamicStrokeWidth / 2);

    if (!hasRenderableDimensions(rx, ry)) return;

    drawDelayGhostNotes(ctx, note, options, centerX, y, rx, ry);

    ctx.save();
    drawEnvelopeFill(ctx, note, centerX, y, rx, ry);

    const reverbGlow = applyReverbGlow(ctx, note, options);
    if (reverbGlow.shouldApply) {
      ctx.shadowColor = note.color;
      ctx.shadowBlur = SHADOW_BLUR_RADIUS + reverbGlow.blur;
      ctx.shadowOffsetX = reverbGlow.spread;
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

  /**
   * Draw a single-column oval note
   */
  function drawSingleColumnOvalNote(
    ctx: CanvasRenderingContext2D,
    options: NoteRenderOptions,
    note: PlacedNote,
    rowIndex: number
  ): void {
    const { columnWidths, cellWidth, cellHeight, modulationMarkers, placedNotes } = options;
    const baseY = coords.getRowY(rowIndex, options);
    const vibratoYOffset = calculateVibratoYOffset(note, options);
    const y = baseY + vibratoYOffset;
    const x = coords.getColumnX(note.startColumnIndex, options);

    let currentCellWidth: number;
    if (modulationMarkers && modulationMarkers.length > 0) {
      const nextX = coords.getColumnX(note.startColumnIndex + 1, options);
      currentCellWidth = nextX - x;
    } else {
      currentCellWidth = (columnWidths[note.startColumnIndex] ?? 1) * cellWidth;
    }

    if (!hasRenderableDimensions(currentCellWidth, cellHeight)) return;

    const xOffset = calculateColorOffset(note, placedNotes, options);
    const dynamicStrokeWidth = Math.max(0.5, currentCellWidth * 0.15);
    const cx = x + currentCellWidth / 2 + xOffset;
    const rx = (currentCellWidth / 2) - (dynamicStrokeWidth / 2);
    const ry = (cellHeight / 2) - (dynamicStrokeWidth / 2);

    if (!hasRenderableDimensions(rx, ry)) return;

    drawDelayGhostNotes(ctx, note, options, cx, y, rx, ry);

    ctx.save();
    drawEnvelopeFill(ctx, note, cx, y, rx, ry);

    const reverbGlow = applyReverbGlow(ctx, note, options);
    if (reverbGlow.shouldApply) {
      ctx.shadowColor = note.color;
      ctx.shadowBlur = SHADOW_BLUR_RADIUS + reverbGlow.blur;
      ctx.shadowOffsetX = reverbGlow.spread;
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

  return {
    drawTwoColumnOvalNote,
    drawSingleColumnOvalNote,
    hasVisibleTail
  };
}

export type NoteRenderer = ReturnType<typeof createNoteRenderer>;
