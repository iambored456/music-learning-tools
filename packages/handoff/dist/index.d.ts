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
export type { SingingTrainerSnapshot, SnapshotNote, SnapshotVoice, TimeGridStructure, VisualOverlay, SnapshotPitchRange, PitchRangeSource, OverlapConflict, ValidationResult, HandoffSlotData, HandoffDirection, } from './types.js';
export { SNAPSHOT_SCHEMA_VERSION } from './types.js';
export { writeHandoffSlot, readHandoffSlot, readHandoffSlotData, consumeHandoffSlot, clearHandoffSlot, generateHandoffId, } from './storage.js';
export { validateSnapshot, validateForExport, validateVoiceMonophonic, notesOverlap, getOverlapColumns, formatConflictMessage, } from './validation.js';
export { convertToSnapshot, convertFromSnapshot, calculateMicrobeatCount, calculateMicrobeatsPerMacrobeat, getMidiFromRow, getClefPitchRange, getPitchNameFromRow, } from './converter.js';
export type { StudentNotationNote, StudentNotationState, PitchRowData, SnapshotConversionOptions, } from './converter.js';
export { navigateToApp, navigateToSingingTrainer, navigateToStudentNotation, getAppRoute, checkForHandoff, clearHandoffParams, } from './navigation.js';
//# sourceMappingURL=index.d.ts.map