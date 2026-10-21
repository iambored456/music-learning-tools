export const NOTE_HIT_BURST_DURATION_SEC = 0.5;

export type NoteHitBounds = { left: number; top: number; width: number; height: number };
type Point = { x: number; y: number };
export type NoteFragment = {
  id: number;
  points: Point[];
  center: Point;
  rotation: number;
  speed: number;
};

export function isNoteHitBurstActive(startTimeSec: number, currentTimeSec: number): boolean {
  const ageSec = currentTimeSec - startTimeSec;
  return ageSec >= 0 && ageSec < NOTE_HIT_BURST_DURATION_SEC;
}

/** The entire original note span and pitch row contain its broken pieces. */
export function getNoteHitBounds(startX: number, endX: number, rowTop: number, laneHeight: number): NoteHitBounds {
  return { left: startX, top: rowTop, width: Math.max(0, endX - startX), height: Math.max(0, laneHeight) };
}

/** Shared vertices tile the glyph exactly, so shards start as the intact artwork. */
export function createNoteFragments(noteId: string): NoteFragment[] {
  let seed = 1;
  for (let index = 0; index < noteId.length; index += 1) {
    seed = (Math.imul(seed, 31) + noteId.charCodeAt(index)) | 0;
  }
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    return (seed >>> 0) / 0x100000000;
  };
  const vertices: Point[][] = Array.from({ length: 4 }, (_, row) =>
    Array.from({ length: 4 }, (_, column) => ({
      x: column / 3 + (column === 0 || column === 3 ? 0 : (random() - 0.5) * 0.16),
      y: row / 3 + (row === 0 || row === 3 ? 0 : (random() - 0.5) * 0.16),
    })),
  );
  const fragments: NoteFragment[] = [];
  const add = (points: Point[]) => {
    fragments.push({
      id: fragments.length,
      points,
      center: { x: points.reduce((sum, point) => sum + point.x, 0) / 3, y: points.reduce((sum, point) => sum + point.y, 0) / 3 },
      rotation: (random() - 0.5) * 140,
      speed: 0.75 + random() * 0.5,
    });
  };
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      const a = vertices[row][column];
      const b = vertices[row][column + 1];
      const c = vertices[row + 1][column + 1];
      const d = vertices[row + 1][column];
      if ((row + column) % 2 === 0) {
        add([a, b, c]);
        add([a, c, d]);
      } else {
        add([a, b, d]);
        add([b, c, d]);
      }
    }
  }
  return fragments;
}

export function getNoteFragmentTransform(fragment: NoteFragment, ageSec: number, size: number, reducedMotion = false) {
  const progress = Math.min(1, Math.max(0, ageSec / NOTE_HIT_BURST_DURATION_SEC));
  const travel = reducedMotion ? 0 : 1 - (1 - progress) ** 3;
  const angle = Math.atan2(fragment.center.y - 0.5, fragment.center.x - 0.5);
  return {
    x: Math.cos(angle) * size * 0.38 * fragment.speed * travel,
    y: Math.sin(angle) * size * 0.3 * fragment.speed * travel + (reducedMotion ? 0 : size * 0.12 * progress ** 2),
    rotation: fragment.rotation * travel,
    scale: 1 - travel * 0.6,
    opacity: reducedMotion ? 1 - progress : Math.min(1, (1 - progress) / 0.55),
  };
}

/** Paint clipped copies of the real export glyph, using the same geometry as the live SVG pieces. */
export function drawNoteHitBurst(context: CanvasRenderingContext2D, options: {
  noteId: string;
  ageSec: number;
  bounds: NoteHitBounds;
  layout: NoteHitBounds;
  drawGlyph: () => void;
}): void {
  const { noteId, ageSec, bounds, layout, drawGlyph } = options;
  if (!isNoteHitBurstActive(0, ageSec) || bounds.width <= 0 || bounds.height <= 0) {
    return;
  }
  context.save();
  context.beginPath();
  context.rect(bounds.left, bounds.top, bounds.width, bounds.height);
  context.clip();
  for (const fragment of createNoteFragments(noteId)) {
    const frame = getNoteFragmentTransform(fragment, ageSec, Math.min(layout.width, layout.height));
    const centerX = layout.left + fragment.center.x * layout.width;
    const centerY = layout.top + fragment.center.y * layout.height;
    context.save();
    context.globalAlpha *= frame.opacity;
    context.translate(centerX + frame.x, centerY + frame.y);
    context.rotate(frame.rotation * Math.PI / 180);
    context.scale(frame.scale, frame.scale);
    context.translate(-centerX, -centerY);
    context.beginPath();
    fragment.points.forEach((point, index) => {
      const x = layout.left + point.x * layout.width;
      const y = layout.top + point.y * layout.height;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.closePath();
    context.clip();
    drawGlyph();
    context.restore();
  }
  context.restore();
}
