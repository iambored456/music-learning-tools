/**
 * Pitch Grid Interactors
 *
 * Barrel export for all pitch grid interaction functionality.
 *
 * Module structure:
 * - pitchGridInteractor.ts: Main coordinator and event handlers
 * - PitchGridInteractionCoordinator.ts: Tool routing and state coordination
 * - PitchGridRightClickEraserInteractor.ts: Right-click erase functionality
 * - PitchGridMobileLongPressNotePlacementInteractor.ts: Touch/mobile support
 *
 * Tool-specific interactors (in tools/ subfolder):
 * - PitchGridNoteToolInteractor.ts: Note placement and dragging
 * - PitchGridChordToolInteractor.ts: Chord placement
 * - PitchGridEraserToolInteractor.ts: Eraser tool
 * - PitchGridSixteenthStampToolInteractor.ts: Sixteenth stamp placement
 * - PitchGridTripletStampToolInteractor.ts: Triplet stamp placement
 * - PitchGridModulationToolInteractor.ts: Modulation marker placement
 * - PitchGridTonicizationToolInteractor.ts: Tonicization tool
 */

// Main initialization
export { initPitchGridInteraction } from './pitchGridInteractor.ts';

// Cursor management
export {
  setStampHoverCursor,
  clearStampHoverCursor,
  isStampCursorActive,
  STAMP_GRAB_CURSOR
} from './cursorManager.ts';

// Coordination
export { PitchGridInteractionCoordinator } from './PitchGridInteractionCoordinator.ts';

// Specialized interactors
export { PitchGridRightClickEraserInteractor } from './PitchGridRightClickEraserInteractor.ts';
export { PitchGridMobileLongPressNotePlacementInteractor } from './PitchGridMobileLongPressNotePlacementInteractor.ts';

// Tool interactors
export { PitchGridNoteToolInteractor } from './tools/PitchGridNoteToolInteractor.ts';
export { PitchGridChordToolInteractor } from './tools/PitchGridChordToolInteractor.ts';
export { PitchGridEraserToolInteractor } from './tools/PitchGridEraserToolInteractor.ts';
export { PitchGridSixteenthStampToolInteractor } from './tools/PitchGridSixteenthStampToolInteractor.ts';
export { PitchGridTripletStampToolInteractor } from './tools/PitchGridTripletStampToolInteractor.ts';
export { PitchGridModulationToolInteractor } from './tools/PitchGridModulationToolInteractor.ts';
export { PitchGridTonicizationToolInteractor } from './tools/PitchGridTonicizationToolInteractor.ts';
