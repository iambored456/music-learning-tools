export function buildSixteenthStampShapeNoteId(placementId: string, shapeKey: string): string {
  return `sixteenth-stamp:${placementId}:${shapeKey}`;
}

export function buildTripletStampShapeNoteId(placementId: string, shapeKey: string): string {
  return `triplet-stamp:${placementId}:${shapeKey}`;
}
