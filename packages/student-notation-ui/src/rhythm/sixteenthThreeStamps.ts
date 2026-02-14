// js/rhythm/sixteenthThreeStamps.ts
// Slots 0..2 correspond to 3 evenly-spaced positions within ONE 2-microbeat cell
// Positions at 1/6, 3/6, 5/6 of the cell (triplet spacing)

export interface SixteenthThreeStamp {
  id: number;
  diamonds: number[];
  ovals: number[];
  label?: string;
}

export const SIXTEENTH_THREE_STAMPS: SixteenthThreeStamp[] = [
  { id: 1, diamonds: [0],       ovals: [], label: '1st' },
  { id: 2, diamonds: [1],       ovals: [], label: '2nd' },
  { id: 3, diamonds: [2],       ovals: [], label: '3rd' },
  { id: 4, diamonds: [0, 1],    ovals: [], label: '1-2' },
  { id: 5, diamonds: [0, 2],    ovals: [], label: '1-3' },
  { id: 6, diamonds: [1, 2],    ovals: [], label: '2-3' },
  { id: 7, diamonds: [0, 1, 2], ovals: [], label: '1-2-3' }
];

export function getSixteenthThreeStampById(id: number): SixteenthThreeStamp | undefined {
  return SIXTEENTH_THREE_STAMPS.find(stamp => stamp.id === id);
}
