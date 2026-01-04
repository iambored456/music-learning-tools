/**
 * Note Highway Module
 *
 * Exports for the Note Highway playback system.
 */

export { createNoteHighwayService } from './noteHighwayService.js';
export { createFeedbackCollector } from './feedbackCollector.js';

export {
  convertNoteToHighway,
  convertNotesToHighway,
  convertStateToHighway,
  createSimpleTimeMap,
  calculateMicrobeatDuration,
  type PlacedNote,
  type ConverterConfig,
  type StudentNotationState,
} from './converter.js';

export type {
  // Configuration
  NoteHighwayConfig,
  FeedbackCollectorConfig,
  ScrollMode,
  InputSource,

  // State
  NoteHighwayState,
  HighwayTargetNote,
  NotePerformance,
  PitchSample,

  // Callbacks
  HighwayStateCallbacks,
  HighwayEventCallbacks,
  HighwayVisualCallbacks,
  HighwayLogger,

  // Instances
  NoteHighwayServiceInstance,
  FeedbackCollectorInstance,

  // Events
  NoteHighwayEvent,
  NoteEventData,
} from './types.js';
