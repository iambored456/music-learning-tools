/**
 * State Management Module
 *
 * Event-emitter based state store for the notation engine.
 * This provides a clean, framework-agnostic state management system
 * that can be used both as a singleton (for backward compatibility)
 * and as factory-created instances (for the engine package).
 */

// Store factory and types
export {
  createStore,
  type StoreConfig,
  type StoreInstance,
  type StorageAdapter,
  type EventCallback,
  type Unsubscribe
} from './store.js';

// Initial state factory
export { getInitialState } from './initialState.js';

// Pitch data
export {
  fullRowData,
  getPitchByToneNote,
  getPitchByIndex,
  getPitchIndex,
  resolvePitchRange
} from './pitchData.js';

// Action modules
export {
  createNoteActions,
  type NoteActionCallbacks,
  type MacrobeatInfo,
  ensureCircleNoteSpan,
  createSixteenthStampActions,
  type SixteenthStampActionCallbacks,
  createTripletStampActions,
  type TripletStampActionCallbacks,
  createRhythmActions,
  type RhythmActionCallbacks,
  ANACRUSIS_ON_GROUPINGS,
  ANACRUSIS_ON_STYLES,
  ANACRUSIS_OFF_GROUPINGS,
  ANACRUSIS_OFF_STYLES
} from './actions/index.js';
