/**
 * @mlt/handoff
 *
 * Cross-app handoff protocol for Music Learning Tools.
 *
 * This package provides utilities for transferring data between Student Notation
 * and Singing Trainer using a snapshot-based copy approach.
 *
 * Main exports:
 * - Types: SingingTrainerSnapshot, ValidationResult, etc.
 * - Storage: writeHandoffSlot, readHandoffSlot, consumeHandoffSlot, clearHandoffSlot
 * - Validation: validateSnapshot, validateForExport
 * - Conversion: convertToSnapshot, convertFromSnapshot
 * - Navigation: navigateToSingingTrainer, navigateToStudentNotation
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // Schema
  SingingTrainerSnapshot,
  SnapshotNote,
  SnapshotVoice,
  TimeGridStructure,
  VisualOverlay,
  SnapshotPitchRange,
  PitchRangeSource,
  // Validation
  OverlapConflict,
  ValidationResult,
  // Storage
  HandoffSlotData,
  HandoffDirection,
} from './types.js';

export { SNAPSHOT_SCHEMA_VERSION } from './types.js';

// ============================================================================
// Storage
// ============================================================================

export {
  writeHandoffSlot,
  readHandoffSlot,
  readHandoffSlotData,
  consumeHandoffSlot,
  clearHandoffSlot,
  generateHandoffId,
} from './storage.js';

// ============================================================================
// Validation
// ============================================================================

export {
  validateSnapshot,
  validateForExport,
  validateVoiceMonophonic,
  notesOverlap,
  getOverlapColumns,
  formatConflictMessage,
} from './validation.js';

// ============================================================================
// Conversion
// ============================================================================

export {
  convertToSnapshot,
  convertFromSnapshot,
  calculateMicrobeatCount,
  calculateMicrobeatsPerMacrobeat,
  getMidiFromRow,
  getClefPitchRange,
  getPitchNameFromRow,
} from './converter.js';

export type {
  StudentNotationNote,
  StudentNotationState,
  PitchRowData,
  SnapshotConversionOptions,
} from './converter.js';

// ============================================================================
// Navigation
// ============================================================================

export {
  navigateToApp,
  navigateToSingingTrainer,
  navigateToStudentNotation,
  getAppRoute,
  checkForHandoff,
  clearHandoffParams,
} from './navigation.js';
