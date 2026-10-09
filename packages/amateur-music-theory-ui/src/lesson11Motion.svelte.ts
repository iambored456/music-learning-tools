type PlacedPitchNote = { id: string; rowIndex: number; leftPercent: number; color: string };

/** Motion state shared by the legacy high/low and comparison scene branches. */
export class Lesson11Motion {
  key = $state(0);
  introEntering = $state<string[]>([]);
  introExiting = $state(false);
  placementEntering = $state(false);
  placementExiting = $state(false);
  placementVisible = $state(false);
  placedNotes = $state<PlacedPitchNote[]>([]);
  comparisonEntering = $state(false);
  comparisonExiting = $state(false);
  gridHidden = $state(false);
  avatarOffset = $state({ x: 0, y: 0 });
  avatarInstant = $state(true);

  cancel(): void {
    this.key += 1;
    this.introEntering = [];
    this.introExiting = false;
    this.placementEntering = false;
    this.placementExiting = false;
    this.comparisonEntering = false;
    this.comparisonExiting = false;
    this.gridHidden = false;
    this.avatarInstant = true;
    this.avatarOffset = { x: 0, y: 0 };
  }
}
