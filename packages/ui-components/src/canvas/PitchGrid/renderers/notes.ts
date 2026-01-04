/**
 * Notes Renderer
 *
 * Pure rendering functions for note shapes on the pitch grid.
 * All dependencies are passed explicitly as parameters.
 */

import type { PlacedNote, TonicSign, DegreeDisplayMode, LongNoteStyle, AccidentalMode } from '@mlt/types';
import type { CoordinateUtils, PitchHistoryPoint, TargetNote, PitchTrailConfig } from '../types.js';
import { getInterpolatedPitchColor, type RGB, type PitchRowData } from '@mlt/pitch-data';

// ============================================================================
// Constants
// ============================================================================

const OVAL_NOTE_FONT_RATIO = 0.7;
const FILLED_NOTE_FONT_RATIO = 0.9;
const MIN_FONT_SIZE = 4;
const MIN_STROKE_WIDTH_THICK = 1;
const STROKE_WIDTH_RATIO = 0.15;
const TAIL_LINE_WIDTH_RATIO = 0.2;
const MIN_TAIL_LINE_WIDTH = 1;
const SHADOW_BLUR_RADIUS = 1.5;

// ============================================================================
// Types
// ============================================================================

export interface NoteRenderConfig {
  cellWidth: number;
  cellHeight: number;
  columnWidths: number[];
  degreeDisplayMode: DegreeDisplayMode;
  accidentalMode: AccidentalMode;
  longNoteStyle: LongNoteStyle;
  colorMode: 'color' | 'bw';
}

export interface NoteRenderContext {
  config: NoteRenderConfig;
  coords: CoordinateUtils;
  allNotes: PlacedNote[];
  /** Optional: Function to get scale degree label for a note */
  getScaleDegreeLabel?: (note: PlacedNote) => { label: string | null; isAccidental: boolean };
}

// ============================================================================
// Helper Functions
// ============================================================================

function hasRenderableDimensions(width: number, height: number): boolean {
  return Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0;
}

/**
 * Determines if a note has a visible tail (duration extends beyond base shape).
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
 * Get timestamp from UUID for sorting notes at same position.
 */
function getUuidTimestamp(value?: string): number {
  const timestampSegment = value?.split('-')[1];
  return Number.parseInt(timestampSegment ?? '0', 10);
}

/**
 * Calculate horizontal offset for stacked notes at same position.
 */
function calculateColorOffset(
  note: PlacedNote,
  allNotes: PlacedNote[],
  cellWidth: number
): number {
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
 * Calculate Y offset for stacked note tails.
 */
function calculateTailYOffset(
  note: PlacedNote,
  allNotes: PlacedNote[],
  cellHeight: number
): number {
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

// ============================================================================
// Scale Degree Text
// ============================================================================

interface DegreeFontResult {
  multiplier: number;
  category: 'natural' | 'single-accidental' | 'both-accidentals';
}

function getDegreeFontMultiplier(label: string | null): DegreeFontResult {
  if (!label) return { multiplier: 1.0, category: 'natural' };

  const hasFlat = label.includes('\u266D');
  const hasSharp = label.includes('\u266F');
  const hasBothAccidentals = label.includes('/');

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
  noteLabel: string,
  shape: 'oval' | 'circle',
  centerX: number,
  centerY: number,
  noteWidth: number
): void {
  const { multiplier: contentMultiplier, category } = getDegreeFontMultiplier(noteLabel);
  let baseFontSize: number;

  if (shape === 'circle') {
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

  if (baseFontSize < MIN_FONT_SIZE) return;

  ctx.fillStyle = '#212529';
  ctx.font = `bold ${baseFontSize}px 'Atkinson Hyperlegible', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (shape === 'oval' && category === 'both-accidentals' && noteLabel.includes('/')) {
    const parts = noteLabel.split('/');
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

// ============================================================================
// Stadium Shape (for long notes - style 2)
// ============================================================================

function drawStadiumShape(
  ctx: CanvasRenderingContext2D,
  note: PlacedNote,
  leftCenterX: number,
  rightCenterX: number,
  centerY: number,
  ry: number,
  strokeWidth: number
): void {
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
}

// ============================================================================
// Main Rendering Functions
// ============================================================================

/**
 * Draw a single-column oval note.
 */
export function drawSingleColumnOvalNote(
  ctx: CanvasRenderingContext2D,
  context: NoteRenderContext,
  note: PlacedNote,
  rowIndex: number
): void {
  const { config, coords, allNotes, getScaleDegreeLabel } = context;
  const { cellWidth, cellHeight, columnWidths, degreeDisplayMode } = config;

  const y = coords.getRowY(rowIndex);
  const x = coords.getColumnX(note.startColumnIndex);

  // Calculate cell width for this column
  const widthMultiplier = columnWidths[note.startColumnIndex] ?? 1;
  const currentCellWidth = widthMultiplier * cellWidth;

  if (!hasRenderableDimensions(currentCellWidth, cellHeight)) return;

  const xOffset = calculateColorOffset(note, allNotes, cellWidth);
  const dynamicStrokeWidth = Math.max(0.5, currentCellWidth * 0.15);
  const cx = x + currentCellWidth / 2 + xOffset;
  const rx = (currentCellWidth / 2) - (dynamicStrokeWidth / 2);
  const ry = (cellHeight / 2) - (dynamicStrokeWidth / 2);

  if (!hasRenderableDimensions(rx, ry)) return;

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, y, rx, ry, 0, 0, 2 * Math.PI);
  ctx.strokeStyle = note.color;
  ctx.lineWidth = dynamicStrokeWidth;
  ctx.shadowColor = note.color;
  ctx.shadowBlur = SHADOW_BLUR_RADIUS;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.restore();

  // Draw scale degree text
  if (degreeDisplayMode !== 'off' && getScaleDegreeLabel) {
    const { label } = getScaleDegreeLabel(note);
    if (label) {
      drawScaleDegreeText(ctx, label, 'oval', cx, y, rx);
    }
  }
}

/**
 * Draw a two-column (circle) note, optionally with a tail or stadium shape.
 */
export function drawTwoColumnOvalNote(
  ctx: CanvasRenderingContext2D,
  context: NoteRenderContext,
  note: PlacedNote,
  rowIndex: number
): void {
  const { config, coords, allNotes, getScaleDegreeLabel } = context;
  const { cellWidth, cellHeight, degreeDisplayMode, longNoteStyle } = config;

  const y = coords.getRowY(rowIndex);
  const xStart = coords.getColumnX(note.startColumnIndex);
  const xNext = coords.getColumnX(note.startColumnIndex + 1);
  const actualCellWidth = xNext - xStart;

  if (!hasRenderableDimensions(actualCellWidth, cellHeight)) return;

  const xOffset = calculateColorOffset(note, allNotes, cellWidth);
  const centerX = xStart + actualCellWidth + xOffset;
  const dynamicStrokeWidth = Math.max(MIN_STROKE_WIDTH_THICK, actualCellWidth * STROKE_WIDTH_RATIO);
  const ry = (cellHeight / 2) - (dynamicStrokeWidth / 2);

  const hasTail = hasVisibleTail(note);

  // Style 2: Stadium shape
  if (hasTail && longNoteStyle === 'style2') {
    const leftCenterX = centerX;
    const rightCenterX = coords.getColumnX(note.endColumnIndex);

    if (hasRenderableDimensions(rightCenterX - leftCenterX, ry)) {
      drawStadiumShape(ctx, note, leftCenterX, rightCenterX, y, ry, dynamicStrokeWidth);

      // Draw scale degree in center of stadium
      if (degreeDisplayMode !== 'off' && getScaleDegreeLabel) {
        const { label } = getScaleDegreeLabel(note);
        if (label) {
          const stadiumCenterX = (leftCenterX + rightCenterX) / 2;
          drawScaleDegreeText(ctx, label, 'circle', stadiumCenterX, y, ry);
        }
      }
    }
    return;
  }

  // Style 1: Tail line + circle
  if (hasTail) {
    const originalEndX = coords.getColumnX(note.endColumnIndex + 1);
    const tailYOffset = calculateTailYOffset(note, allNotes, cellHeight);
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

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(centerX, y, rx, ry, 0, 0, 2 * Math.PI);
  ctx.strokeStyle = note.color;
  ctx.lineWidth = dynamicStrokeWidth;
  ctx.shadowColor = note.color;
  ctx.shadowBlur = SHADOW_BLUR_RADIUS;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.restore();

  if (degreeDisplayMode !== 'off' && getScaleDegreeLabel) {
    const { label } = getScaleDegreeLabel(note);
    if (label) {
      drawScaleDegreeText(ctx, label, 'circle', centerX, y, rx);
    }
  }
}

/**
 * Draw a tonic sign (Roman numeral circle).
 */
export function drawTonicShape(
  ctx: CanvasRenderingContext2D,
  context: NoteRenderContext,
  tonicSign: TonicSign
): void {
  const { config, coords } = context;
  const { cellWidth, cellHeight } = config;

  const y = coords.getRowY(tonicSign.globalRow ?? tonicSign.row);
  const x = coords.getColumnX(tonicSign.columnIndex);
  const xNext = coords.getColumnX(tonicSign.columnIndex + 1);
  const actualCellWidth = xNext - x;

  const width = actualCellWidth * 2;
  const centerX = x + width / 2;
  const radius = (Math.min(width, cellHeight) / 2) * 0.9;

  if (radius < 2) return;

  ctx.beginPath();
  ctx.arc(centerX, y, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = '#212529';
  ctx.lineWidth = Math.max(0.5, actualCellWidth * 0.05);
  ctx.stroke();

  if (tonicSign.tonicNumber == null) return;

  const numberText = tonicSign.tonicNumber.toString();
  const fontSize = radius * 1.5;
  if (fontSize < 6) return;

  ctx.fillStyle = '#212529';
  ctx.font = `bold ${fontSize}px 'Atkinson Hyperlegible', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(numberText, centerX, y);
}

// ============================================================================
// Singing Mode: User Pitch Rendering
// ============================================================================

export interface UserPitchRenderConfig {
  cellHeight: number;
  viewportWidth: number;
  nowLineX?: number;
  pixelsPerSecond: number;
  timeWindowMs: number;
  colorMode: 'color' | 'bw';
  /** Pitch trail visual configuration */
  trailConfig?: PitchTrailConfig;
}

// ============================================================================
// Pitch Trail Default Configuration
// ============================================================================

const DEFAULT_TRAIL_CONFIG: Required<PitchTrailConfig> = {
  timeWindowMs: 4000,
  pixelsPerSecond: 200,
  circleRadius: 9.5,
  proximityThreshold: 35,
  maxConnections: 3,
  connectorLineWidth: 2.5,
  connectorColor: 'rgba(0,0,0,0.4)',
  useTonicRelativeColors: true,
  tonicPitchClass: 0,
  clarityThreshold: 0.5,
  maxOpacity: 0.9,
};

/**
 * Merge user trail config with defaults.
 */
function getTrailConfig(config?: PitchTrailConfig): Required<PitchTrailConfig> {
  return { ...DEFAULT_TRAIL_CONFIG, ...config };
}

// PitchHistoryPoint is imported from types.js

/**
 * Draw the user's current pitch indicator at the "now line" (highway mode).
 * Uses interpolated pitch-class colors for visual consistency with the trail.
 */
export function drawUserPitchIndicator(
  ctx: CanvasRenderingContext2D,
  coords: CoordinateUtils,
  midi: number,
  clarity: number,
  nowLineX: number,
  config: UserPitchRenderConfig,
  fullRowData: PitchRowData[]
): void {
  const trail = getTrailConfig(config.trailConfig);
  if (clarity < trail.clarityThreshold || midi <= 0) return;

  const { cellHeight, colorMode } = config;

  // Use continuous Y positioning for sub-semitone accuracy
  const y = getMidiY(coords, midi, cellHeight, fullRowData);
  const radius = (cellHeight / 2) * 0.8;

  // Get interpolated color based on fractional MIDI value
  const color: RGB =
    colorMode === 'bw'
      ? [128, 128, 128]
      : getInterpolatedPitchColor(midi, trail.tonicPitchClass);

  ctx.save();

  // Draw glow
  ctx.beginPath();
  ctx.arc(nowLineX, y, radius + 4, 0, 2 * Math.PI);
  ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${clarity * 0.3})`;
  ctx.fill();

  // Draw solid indicator
  ctx.beginPath();
  ctx.arc(nowLineX, y, radius, 0, 2 * Math.PI);
  ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${clarity})`;
  ctx.fill();

  ctx.restore();
}

/**
 * Internal type for computed trail points.
 */
interface TrailPoint {
  x: number;
  y: number;
  clarity: number;
  color: RGB;
}

/**
 * Compute the Y position for a MIDI value using continuous positioning.
 * This allows for sub-semitone accuracy in the visualization.
 */
function getMidiY(
  coords: CoordinateUtils,
  midi: number,
  cellHeight: number,
  fullRowData: PitchRowData[]
): number {
  if (fullRowData.length === 0 || !fullRowData[0]) return 0;

  const midiFloor = Math.floor(midi);
  const fraction = midi - midiFloor;

  // Use actual MIDI range from fullRowData
  const firstRow = fullRowData[0];
  const maxMidi = firstRow.midi ?? 108; // Highest pitch in range (default to C8)
  const rowIndex = maxMidi - midiFloor;

  // Handle out-of-range MIDI values
  if (rowIndex < 0 || rowIndex >= fullRowData.length) {
    return rowIndex < 0 ? 0 : coords.getRowY(fullRowData.length - 1);
  }

  const baseY = coords.getRowY(rowIndex);

  // Offset by the fraction (negative because higher MIDI = lower row index = higher on screen)
  // Each semitone step moves by half a cell (row spacing)
  const rowStep = cellHeight / 2;
  return baseY - fraction * rowStep;
}

/**
 * Draw the user's pitch history as a trace (stationary/singing mode).
 *
 * Enhanced version with:
 * - Interpolated pitch-class colors
 * - Proximity-based connector lines
 * - Clarity-based opacity
 * - Configurable visual parameters
 */
export function drawUserPitchTrace(
  ctx: CanvasRenderingContext2D,
  coords: CoordinateUtils,
  history: PitchHistoryPoint[],
  currentTime: number,
  config: UserPitchRenderConfig,
  fullRowData: PitchRowData[]
): void {
  const { viewportWidth, cellHeight, colorMode } = config;
  const trail = getTrailConfig(config.trailConfig);

  // Use trail config values, with fallbacks to top-level config
  const timeWindowMs = trail.timeWindowMs;
  const pixelsPerSecond = trail.pixelsPerSecond;

  // Use nowLineX as origin if provided (highway mode), otherwise use right edge (stationary mode)
  const trailOriginX = config.nowLineX ?? viewportWidth;

  // Filter to visible time window and transform to screen coordinates
  const notePoints: TrailPoint[] = history
    .filter(p => p.midi > 0 && p.clarity >= trail.clarityThreshold)
    .map(point => {
      const age = currentTime - point.time;
      // Skip points outside time window
      if (age >= timeWindowMs || age < 0) return null;

      // Trail extends leftward from origin point (nowLineX for highway, right edge for stationary)
      const x = trailOriginX - (age / 1000) * pixelsPerSecond;

      // Use continuous Y positioning for sub-semitone accuracy
      const y = getMidiY(coords, point.midi, cellHeight, fullRowData);

      // Get interpolated color based on fractional MIDI value
      const color: RGB =
        colorMode === 'bw'
          ? [128, 128, 128]
          : getInterpolatedPitchColor(point.midi, trail.tonicPitchClass);

      return {
        x,
        y,
        clarity: point.clarity,
        color,
      };
    })
    .filter((p): p is TrailPoint => p !== null && p.x >= 0);

  if (notePoints.length === 0) return;

  ctx.save();

  // Phase 1: Draw connector lines between proximate points
  ctx.strokeStyle = trail.connectorColor;
  ctx.lineWidth = trail.connectorLineWidth;
  ctx.beginPath();

  for (let i = 0; i < notePoints.length; i++) {
    let connections = 0;
    for (let j = i + 1; j < notePoints.length && connections < trail.maxConnections; j++) {
      const dx = notePoints[i].x - notePoints[j].x;
      const dy = notePoints[i].y - notePoints[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= trail.proximityThreshold) {
        ctx.moveTo(notePoints[i].x, notePoints[i].y);
        ctx.lineTo(notePoints[j].x, notePoints[j].y);
        connections++;
      }
    }
  }
  ctx.stroke();

  // Phase 2: Draw colored circles at each point
  for (const pt of notePoints) {
    const opacity = Math.min(pt.clarity * trail.maxOpacity, 1);
    ctx.fillStyle = `rgba(${pt.color[0]}, ${pt.color[1]}, ${pt.color[2]}, ${opacity})`;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, trail.circleRadius, 0, 2 * Math.PI);
    ctx.fill();
  }

  ctx.restore();
}

// ============================================================================
// Target Notes (for exercises)
// ============================================================================

// TargetNote is imported from types.js

/**
 * Draw target notes on the highway (Guitar Hero style).
 */
export function drawTargetNotes(
  ctx: CanvasRenderingContext2D,
  coords: CoordinateUtils,
  targetNotes: TargetNote[],
  currentTimeMs: number,
  config: UserPitchRenderConfig,
  fullRowData?: PitchRowData[],
  userMidi?: number | null,
  userClarity?: number
): void {
  const { cellHeight, nowLineX = 100, pixelsPerSecond } = config;
  const pitchToleranceSemitones = 0.5; // Half semitone tolerance for hit detection

  for (const note of targetNotes) {
    // Calculate X position based on time
    const startX = (nowLineX ?? 100) + ((note.startTimeMs - currentTimeMs) / 1000) * pixelsPerSecond;
    const endX = startX + (note.durationMs / 1000) * pixelsPerSecond;

    // Skip if completely off-screen
    if (endX < 0 || startX > config.viewportWidth) continue;

    // Find row index from fullRowData if provided, otherwise use default calculation
    let rowIndex: number;
    if (fullRowData) {
      rowIndex = fullRowData.findIndex(row => row.midi === note.midi);
      if (rowIndex === -1) {
        // Note MIDI is outside the current viewport range, skip it
        continue;
      }
    } else {
      // Fallback to default calculation (assumes fullRowData starts at C8)
      rowIndex = Math.round(108 - note.midi);
    }

    const y = coords.getRowY(rowIndex);
    const ry = (cellHeight / 2) - 2;
    const color = note.color ?? '#4CAF50';

    // Check if this note is currently being hit (at judgment line and pitch matches)
    const isAtJudgmentLine = startX <= nowLineX && endX >= nowLineX;
    const pitchMatches = userMidi !== null &&
                         userMidi !== undefined &&
                         (userClarity ?? 0) > 0.5 &&
                         Math.abs(userMidi - note.midi) <= pitchToleranceSemitones;
    const isBeingHit = isAtJudgmentLine && pitchMatches;

    // Draw stadium shape
    ctx.save();
    ctx.beginPath();
    ctx.arc(startX, y, ry, Math.PI / 2, -Math.PI / 2, false);
    ctx.lineTo(endX, y - ry);
    ctx.arc(endX, y, ry, -Math.PI / 2, Math.PI / 2, false);
    ctx.lineTo(startX, y + ry);
    ctx.closePath();

    if (isBeingHit) {
      // Enhanced glow effect when hitting the note
      ctx.strokeStyle = '#FFD700'; // Gold color for hit
      ctx.lineWidth = 5;
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 20;
      ctx.stroke();

      // Add inner fill for extra visibility
      ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
      ctx.fill();

      // Draw particle burst effect
      drawHitParticles(ctx, nowLineX, y, ry);
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.restore();

    // Draw label if provided (at left edge of note)
    if (note.label) {
      const labelX = startX + ry + 4; // Position inside the left cap
      ctx.fillStyle = isBeingHit ? '#FFD700' : '#212529'; // Gold when hit
      ctx.font = `bold ${Math.max(16, ry * 1.2)}px 'Atkinson Hyperlegible', sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(note.label, labelX, y);
    }
  }
}

/**
 * Draw particle burst effect for hit notes
 */
function drawHitParticles(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number
): void {
  const particleCount = 8;
  const particleSize = 3;
  const burstRadius = radius * 1.5;

  ctx.save();
  ctx.fillStyle = '#FFD700';
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 6;

  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2;
    const px = x + Math.cos(angle) * burstRadius;
    const py = y + Math.sin(angle) * burstRadius;

    ctx.beginPath();
    ctx.arc(px, py, particleSize, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
