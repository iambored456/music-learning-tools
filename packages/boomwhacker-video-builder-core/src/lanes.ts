import {
  COLOR_PALETTE,
  findNoteDefinitionById,
} from '@mlt/boomwhacker-sketchpad-core';

import type { BoomwhackerLane } from './types.js';

const LANE_NOTE_IDS = ['1', '2', '3', '4', '5', '6', '7', 'oct'] as const;

function requireLaneDefinition(noteId: (typeof LANE_NOTE_IDS)[number]) {
  const definition = findNoteDefinitionById(noteId);
  if (!definition) {
    throw new Error(`Missing Boomwhacker note definition for lane "${noteId}"`);
  }
  return definition;
}

export const BOOMWHACKER_LANES: BoomwhackerLane[] = LANE_NOTE_IDS.map((noteId, row) => {
  const definition = requireLaneDefinition(noteId);
  const color = (COLOR_PALETTE as Record<string, string>)[definition.colorId] ?? '#ffffff';

  return {
    row,
    noteId,
    label: noteId === 'oct' ? '1' : definition.label,
    marker: row === 0 ? 'underline' : row === LANE_NOTE_IDS.length - 1 ? 'overline' : 'none',
    spokenLabel: row === 0 ? 'low 1' : row === LANE_NOTE_IDS.length - 1 ? 'high 1' : definition.label,
    pitchInterval: definition.interval,
    color,
  };
});

export function getBoomwhackerLane(row: number): BoomwhackerLane | null {
  return BOOMWHACKER_LANES.find((lane) => lane.row === row) ?? null;
}
