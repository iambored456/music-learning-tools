type Point = { x: number; y: number };

/** Point at B's left edge initially, then connect the outside edges of B and C. */
export function calculateBoundaryArrow(reference: Point, target: Point, cellWidth: number, progress: number) {
  const dx = target.x - reference.x, dy = target.y - reference.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const margin = Math.min(cellWidth * 1.12, distance * 0.49);
  const mix = (from: number, to: number) => from + (to - from) * progress;
  return {
    start: { x: mix(reference.x - cellWidth * 5, reference.x + dx / distance * margin),
      y: mix(reference.y, reference.y + dy / distance * margin) },
    end: { x: mix(reference.x - margin, target.x - dx / distance * margin),
      y: mix(reference.y, target.y - dy / distance * margin) },
  };
}
