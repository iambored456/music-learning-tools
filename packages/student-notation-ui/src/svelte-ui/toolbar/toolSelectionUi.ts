import type { AppState, Store, NoteShape } from '@mlt/types';
import { normalizeInterval } from '@data/chordDefinitions.ts';

export type IntervalHighlightClass = 'selected' | 'optional-interval' | null;
export type UnifiedPositionMode = 'inversion' | 'position';

export const UNIFIED_POSITION_SLOT_COUNT = 6;

export function getUnifiedPositionStepCount(noteCount: number): number {
  if (noteCount === 2) return 2;
  return Math.min(UNIFIED_POSITION_SLOT_COUNT, Math.max(1, noteCount));
}

export function getNextUnifiedPositionStep(currentStep: number, stepCount: number): number {
  const safeStepCount = Math.max(1, stepCount);
  return (currentStep + 1) % safeStepCount;
}

/** Map the pointer to the fixed six-slot track, with Root at the bottom in position mode. */
export function getUnifiedPositionStepFromPointer(
  clientY: number,
  trackTop: number,
  trackHeight: number,
  stepCount: number,
  mode: UnifiedPositionMode
): number {
  const safeHeight = Math.max(1, trackHeight);
  const relativeY = Math.min(1, Math.max(0, (clientY - trackTop) / safeHeight));
  const visualSlot = Math.min(
    UNIFIED_POSITION_SLOT_COUNT - 1,
    Math.floor(relativeY * UNIFIED_POSITION_SLOT_COUNT)
  );
  const rawStep = mode === 'position'
    ? UNIFIED_POSITION_SLOT_COUNT - 1 - visualSlot
    : visualSlot;
  return Math.min(Math.max(1, stepCount) - 1, rawStep);
}

/** Distinguish essential and optional active chord tones without disabling either. */
export function getIntervalHighlightClass(
  activeIntervals: readonly string[],
  optionalIntervals: readonly string[],
  candidateInterval: string
): IntervalHighlightClass {
  const normalizedCandidate = normalizeInterval(candidateInterval);
  const isActive = activeIntervals.some(interval => normalizeInterval(interval) === normalizedCandidate);
  if (!isActive) return null;
  const isOptional = optionalIntervals.some(interval => normalizeInterval(interval) === normalizedCandidate);
  return isOptional ? 'optional-interval' : 'selected';
}

/** Only a notebank click selects individual sixteenths; opening stamps is UI-only. */
export function selectNoteBankNote(
  store: Pick<Store, 'setSelectedNote' | 'setSelectedTool'>,
  shape: NoteShape, color: string, openSixteenthStampTab: () => void
): void {
  store.setSelectedNote(shape, color);
  if (shape === 'diamond') openSixteenthStampTab();
  // Tab switching can restore a remembered stamp. Finish in single-note mode.
  store.setSelectedTool('note');
}

export function isActiveChordSelection(
  tool: string,
  currentIntervals: readonly string[] | null | undefined,
  candidateIntervals: readonly string[]
): boolean {
  return tool === 'chord'
    && currentIntervals?.length === candidateIntervals.length
    && currentIntervals.every((interval, index) => interval === candidateIntervals[index]);
}

/** The remembered voice/shape must not look like an active note-placement tool. */
export function syncNoteBankSelection(tool: string, note: AppState['selectedNote'], root: Document = document): void {
  root.querySelectorAll('.note, .note-pair').forEach(element => element.classList.remove('selected'));
  if (tool !== 'note' || !note) return;
  const target = root.querySelector(`.note[data-color='${note.color}'][data-type='${note.shape}']`);
  if (target) {
    target.classList.add('selected');
    return;
  }
  const pair = root.querySelector(`.note-pair[data-color='${note.color}']`);
  pair?.classList.add('selected');
  pair?.querySelector(`.note[data-type='${note.shape}']`)?.classList.add('selected');
}
