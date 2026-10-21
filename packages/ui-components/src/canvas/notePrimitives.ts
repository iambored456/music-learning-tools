import type { PlacedNote } from '@mlt/types';

/** Shared drawing rules. Callers supply coordinates, typography and audio envelopes. */
export const NOTE_APPEARANCE = {
  ovalFontRatio: 0.7, circleFontRatio: 0.9, minFontSize: 4,
  minCircleStroke: 1.5, circleStrokeRatio: 0.15,
  minOvalStroke: 0.5, ovalStrokeRatio: 0.15,
  minTailStroke: 1, tailStrokeRatio: 0.2, shadowBlur: 1.5,
} as const;

export interface NotePoint { x: number; y: number }
export interface NoteGeometry {
  kind: 'ellipse' | 'stadium';
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
  strokeWidth: number;
}

export function hasVisibleNoteTail(note: Pick<PlacedNote, 'shape' | 'startColumnIndex' | 'endColumnIndex'>): boolean {
  return note.endColumnIndex > note.startColumnIndex + (note.shape === 'circle' ? 1 : 0);
}

export function createEllipseNoteGeometry(centerX: number, centerY: number, radiusX: number, radiusY: number, strokeWidth: number): NoteGeometry | null {
  if (![centerX, centerY, radiusX, radiusY, strokeWidth].every(Number.isFinite) || radiusX <= 0 || radiusY <= 0 || strokeWidth < 0) return null;
  return { kind: 'ellipse', centerX, centerY, radiusX, radiusY, strokeWidth };
}

export function createStadiumNoteGeometry(leftCenterX: number, rightCenterX: number, centerY: number, radiusY: number, strokeWidth: number): NoteGeometry | null {
  if (rightCenterX < leftCenterX) return null;
  const geometry = createEllipseNoteGeometry((leftCenterX + rightCenterX) / 2, centerY, (rightCenterX - leftCenterX) / 2 + radiusY, radiusY, strokeWidth);
  return geometry && { ...geometry, kind: 'stadium' };
}

/** Resolve canvas/time coordinates in the adapter before passing pixel geometry here. */
export function createNotationNoteGeometry(
  note: Pick<PlacedNote, 'shape' | 'startColumnIndex' | 'endColumnIndex'>,
  options: { x: number; y: number; columnWidth: number; cellHeight: number; endCapX: number; longNoteStyle: 'style1' | 'style2' },
): NoteGeometry | null {
  const { x, y, columnWidth, cellHeight, endCapX, longNoteStyle } = options;
  if (!Number.isFinite(columnWidth) || columnWidth <= 0) return null;
  const circle = note.shape === 'circle';
  const strokeWidth = circle ? Math.max(NOTE_APPEARANCE.minCircleStroke, columnWidth * NOTE_APPEARANCE.circleStrokeRatio)
    : Math.max(NOTE_APPEARANCE.minOvalStroke, columnWidth * NOTE_APPEARANCE.ovalStrokeRatio);
  const centerX = x + columnWidth * (circle ? 1 : 0.5);
  const radiusY = (cellHeight - strokeWidth) / 2;
  if (circle && hasVisibleNoteTail(note) && longNoteStyle === 'style2') {
    if (endCapX <= centerX) return null;
    return createStadiumNoteGeometry(centerX, endCapX, y, radiusY, strokeWidth);
  }
  return createEllipseNoteGeometry(centerX, y, columnWidth * (circle ? 1 : 0.5) - strokeWidth / 2, radiusY, strokeWidth);
}

export function createTargetNoteGeometry(startX: number, endX: number, centerY: number, radiusY: number, strokeWidth = 3): NoteGeometry | null {
  const width = endX - startX;
  if (width <= 0) return null;
  return width >= radiusY * 2
    ? createStadiumNoteGeometry(startX + radiusY, endX - radiusY, centerY, radiusY, strokeWidth)
    : createEllipseNoteGeometry((startX + endX) / 2, centerY, width / 2, radiusY, strokeWidth);
}

export function getNoteBounds(note: NoteGeometry) {
  return { left: note.centerX - note.radiusX, right: note.centerX + note.radiusX,
    top: note.centerY - note.radiusY, bottom: note.centerY + note.radiusY };
}

/** Time-based adapter: a quarter-note circle spans one cell height at 1:1. */
export function createNotationTargetGeometry(startX: number, endX: number, centerY: number, cellHeight: number): NoteGeometry | null {
  const width = endX - startX;
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(cellHeight) || cellHeight <= 0) return null;
  const circle = width >= cellHeight - 0.001;
  const columnWidth = circle ? cellHeight / 2 : width;
  const strokeWidth = circle
    ? Math.max(NOTE_APPEARANCE.minCircleStroke, columnWidth * NOTE_APPEARANCE.circleStrokeRatio)
    : Math.max(NOTE_APPEARANCE.minOvalStroke, columnWidth * NOTE_APPEARANCE.ovalStrokeRatio);
  const radiusY = (cellHeight - strokeWidth) / 2;
  return circle && width > cellHeight + 0.001
    ? createStadiumNoteGeometry(startX + columnWidth, endX - columnWidth, centerY, radiusY, strokeWidth)
    : createEllipseNoteGeometry((startX + endX) / 2, centerY, (width - strokeWidth) / 2, radiusY, strokeWidth);
}

type NotePath = Pick<Path2D, 'ellipse' | 'arc' | 'lineTo' | 'moveTo' | 'closePath'>;

export function traceNoteShape(path: NotePath, note: NoteGeometry): void {
  const { centerX: x, centerY: y, radiusX: rx, radiusY: ry } = note;
  if (note.kind === 'stadium') {
    const left = x - rx + ry, right = x + rx - ry;
    path.arc(left, y, ry, Math.PI / 2, -Math.PI / 2, false);
    path.lineTo(right, y - ry);
    path.arc(right, y, ry, -Math.PI / 2, Math.PI / 2, false);
    path.lineTo(left, y + ry);
    path.closePath();
  } else path.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

export function createNotePath(note: NoteGeometry): Path2D {
  const path = new Path2D();
  traceNoteShape(path, note);
  return path;
}

export function noteColorWithAlpha(color: string, alpha: number): string {
  const opacity = Math.max(0, Math.min(1, alpha));
  const short = color.match(/^#([\da-f]{3})$/i);
  const hex = short ? short[1]!.split('').map(char => char + char).join('') : color.match(/^#([\da-f]{6})$/i)?.[1];
  if (hex) return `rgba(${parseInt(hex.slice(0, 2), 16)}, ${parseInt(hex.slice(2, 4), 16)}, ${parseInt(hex.slice(4, 6), 16)}, ${opacity})`;
  const rgb = color.match(/^rgba?\(([^)]+)\)$/)?.[1]?.split(',').slice(0, 3).map(value => Math.max(0, Math.min(255, parseFloat(value))));
  return rgb?.length === 3 ? `rgba(${rgb.join(', ')}, ${opacity})` : `rgba(255, 255, 255, ${opacity})`;
}

/** Student Notation radial envelope fill, shared without a store or audio dependency. */
export function drawNoteEnvelopeFill(ctx: CanvasRenderingContext2D, note: NoteGeometry, color: string, level: number, path?: Path2D): void {
  if (!Number.isFinite(level) || level <= 0) return;
  const innerRatio = 1 - Math.min(1, level);
  const { centerX: x, centerY: y, radiusX: rx, radiusY: ry } = note;
  ctx.save();
  if (path) ctx.clip(path);
  else { ctx.beginPath(); traceNoteShape(ctx, note); ctx.clip(); }
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
  gradient.addColorStop(0, 'transparent');
  gradient.addColorStop(Math.max(0, innerRatio - 0.05), 'transparent');
  gradient.addColorStop(innerRatio, noteColorWithAlpha(color, 31 / 255));
  gradient.addColorStop(1, noteColorWithAlpha(color, 191 / 255));
  ctx.fillStyle = gradient;
  ctx.fillRect(x - rx - 10, y - ry - 10, (rx + 10) * 2, (ry + 10) * 2);
  ctx.restore();
}

export function drawNoteGlyph(ctx: CanvasRenderingContext2D, note: NoteGeometry, options: {
  color: string; fillLevel?: number; shadowBlur?: number; shadowOffsetX?: number; path?: Path2D;
}): void {
  drawNoteEnvelopeFill(ctx, note, options.color, options.fillLevel ?? 0, options.path);
  ctx.save();
  ctx.beginPath();
  traceNoteShape(ctx, note);
  ctx.strokeStyle = options.color;
  ctx.lineWidth = note.strokeWidth;
  ctx.shadowColor = options.color;
  ctx.shadowBlur = options.shadowBlur ?? NOTE_APPEARANCE.shadowBlur;
  ctx.shadowOffsetX = options.shadowOffsetX ?? 0;
  if (options.path) ctx.stroke(options.path); else ctx.stroke();
  ctx.restore();
}

/** Keep overlapping heads aligned; only style-1 tails receive a stacking offset. */
export function getNoteTailYOffset(note: PlacedNote, notes: readonly PlacedNote[], cellHeight: number): number {
  if (!note.uuid || !hasVisibleNoteTail(note)) return 0;
  const group = notes.filter(other => !other.isDrum && (other.globalRow ?? other.row) === (note.globalRow ?? note.row)
    && other.startColumnIndex === note.startColumnIndex && other.uuid && hasVisibleNoteTail(other));
  const timestamp = (id: string) => Number.parseInt(id.split('-')[1] ?? '0', 10) || 0;
  group.sort((a, b) => timestamp(a.uuid) - timestamp(b.uuid));
  return Math.max(0, group.findIndex(other => other.uuid === note.uuid)) * cellHeight / 2 * 0.12;
}

export type NoteLabelCategory = 'natural' | 'single-accidental' | 'both-accidentals';

export function getNoteLabelCategory(label: string | null, kind: 'degree' | 'pitch' = 'degree'): NoteLabelCategory {
  if (!label) return 'natural';
  const accidental = kind === 'pitch' ? /[#b]/.test(label) : /[\u266f\u266d]/.test(label);
  if (kind === 'pitch' && label.includes('/')) return 'both-accidentals';
  return accidental ? (label.includes('/') ? 'both-accidentals' : 'single-accidental') : 'natural';
}

export function getNoteLabelFontSize(shape: PlacedNote['shape'], radius: number, category: NoteLabelCategory, kind: 'degree' | 'pitch' = 'degree'): number {
  const index = category === 'natural' ? 0 : category === 'single-accidental' ? 1 : 2;
  const ratios = kind === 'pitch'
    ? { circle: [0.95, 0.72, 0.36], diamond: [1, 0.78, 0.66], oval: [1.35, 1.05, 0.95] }
    : { circle: [1, 0.8, 0.4], diamond: [1.05, 0.84, 0.64], oval: [1.5, 1.2, 1] };
  const family = shape === 'circle' ? 'circle' : shape === 'diamond' ? 'diamond' : 'oval';
  return radius * 2 * (family === 'oval' ? NOTE_APPEARANCE.ovalFontRatio : NOTE_APPEARANCE.circleFontRatio) * ratios[family][index]!;
}

export function resolveNoteLabelLayout(ctx: Pick<CanvasRenderingContext2D, 'font' | 'measureText'>, lines: readonly string[], options: {
  preferredFontSize: number; maxWidth: number; maxHeight: number; lineHeightRatio: number; font: (size: number) => string;
}) {
  const previous = ctx.font;
  ctx.font = options.font(options.preferredFontSize);
  const width = lines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0);
  ctx.font = previous;
  const height = options.preferredFontSize * (1 + options.lineHeightRatio * Math.max(0, lines.length - 1));
  const fontSize = options.preferredFontSize * Math.min(1, width > 0 ? options.maxWidth / width : 1, height > 0 ? options.maxHeight / height : 1);
  return { fontSize, font: options.font(fontSize) };
}

function ellipseEntry(from: NotePoint, to: NotePoint, x: number, y: number, rx: number, ry: number): number | null {
  const px = (from.x - x) / rx, py = (from.y - y) / ry;
  const dx = (to.x - from.x) / rx, dy = (to.y - from.y) / ry;
  const a = dx * dx + dy * dy, b = 2 * (px * dx + py * dy), c = px * px + py * py - 1;
  if (c <= 0) return 0;
  if (a === 0 || b * b - 4 * a * c < 0) return null;
  const time = (-b - Math.sqrt(b * b - 4 * a * c)) / (2 * a);
  return time >= 0 && time <= 1 ? time : null;
}

function rectangleEntry(from: NotePoint, to: NotePoint, left: number, right: number, top: number, bottom: number): number | null {
  let enter = 0, exit = 1;
  const axes: [number, number, number, number][] = [[from.x, to.x - from.x, left, right], [from.y, to.y - from.y, top, bottom]];
  for (const [start, delta, low, high] of axes) {
    if (delta === 0) { if (start < low || start > high) return null; continue; }
    const a = (low - start) / delta, b = (high - start) / delta;
    enter = Math.max(enter, Math.min(a, b)); exit = Math.min(exit, Math.max(a, b));
    if (enter > exit) return null;
  }
  return enter;
}

/** Exact hit geometry, including fast drags across rounded caps. */
export function getNoteSegmentEntry(note: NoteGeometry, from: NotePoint, to = from): number | null {
  const { centerX: x, centerY: y, radiusX: rx, radiusY: ry } = note;
  if (note.kind === 'ellipse') return ellipseEntry(from, to, x, y, rx, ry);
  const left = x - rx + ry, right = x + rx - ry;
  const times = [rectangleEntry(from, to, left, right, y - ry, y + ry), ellipseEntry(from, to, left, y, ry, ry), ellipseEntry(from, to, right, y, ry, ry)]
    .filter((time): time is number => time !== null);
  return times.length ? Math.min(...times) : null;
}
