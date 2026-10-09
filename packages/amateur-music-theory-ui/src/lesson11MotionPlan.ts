/** h.1 includes playback and the single shared exit of all seven pairs. */
export const comparisonFinishActions: Array<[string, string, string]> = [
  ['playback', 'Final playback; slide all notes off to the right', 'Sound all fourteen settled notes, then slide the entire group past the right screen edge.'],
  ['hide-grid', 'Hide the pitch grid', 'Keep the workspace dimensions while removing the grid and its background.'],
  ['center-avatar', 'Slide Grammy into the former grid center', 'Move Grammy to the center of the empty canvas before speaking.'],
  ['bravo', 'Grammy: “Bravo!”', 'Speak after the notes have exited, the grid is hidden, and Grammy has arrived.'],
  ['return-avatar', 'Slide Grammy to his next position', 'Return Grammy to the teacher position before starting 1.1.4.'],
];

export function comparisonFinishCheckpoint(actionId: string) {
  const index = comparisonFinishActions.findIndex(([id]) => id === actionId);
  return index < 0 ? null : {
    index,
    notesVisible: index === 0,
    gridHidden: index >= 2,
    avatarCentered: index >= 3,
  };
}
