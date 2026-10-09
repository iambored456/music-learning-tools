/** The union canvas stays fixed; move its cropped shell before exposing C3–A3. */
export function scaleOpeningGridGeometry(cellWidth: number, shift: number, expansion: number) {
  const progress = Math.max(0, Math.min(1, expansion));
  const initialHeight = 17 * cellWidth; // A3–C5, plus the shared grid's outer row.
  const addedHeight = 9 * cellWidth; // Extend nine pitches below A3 to C3.
  return {
    height: initialHeight + addedHeight * progress,
    y: -addedHeight / 2 * (Math.max(0, Math.min(1, shift)) - progress),
  };
}

/** Keep existing pitches anchored after moving down; expose five pitches above C5. */
export function scaleUpperGridGeometry(cellWidth: number, shift: number, expansion: number) {
  const progress = Math.max(0, Math.min(1, expansion));
  const addedHeight = 5 * cellWidth;
  return {
    height: (14 + 5 * progress) * cellWidth,
    y: addedHeight / 2 * (Math.max(0, Math.min(1, shift)) - progress),
    fieldY: addedHeight * (progress - 1),
  };
}
