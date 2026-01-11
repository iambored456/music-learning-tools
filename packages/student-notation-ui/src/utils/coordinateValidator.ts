/**
 * Coordinate Validation Test File
 *
 * This file provides runtime validation functions to ensure all coordinates
 * in the application state are using canvas-space consistently.
 *
 * Usage in browser console:
 *   import('./js/utils/coordinateValidator.js').then(m => m.runAllValidations(store.state))
 *
 * Or use the debug tool:
 *   window.__COORD_DEBUG__.validate()
 */

import type { AppState, PlacedNote, SixteenthStampPlacement, TripletStampPlacement, TonicSign, ModulationMarker } from '@app-types/state.js';

interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

interface ValidationReport {
  overall: boolean;
  notes: ValidationResult;
  stamps: ValidationResult;
  triplets: ValidationResult;
  tonicSigns: ValidationResult;
  modulationMarkers: ValidationResult;
  columnWidths: ValidationResult;
}

/**
 * Validate that all placed notes use canvas-space coordinates
 */
export function validateNotes(state: AppState): ValidationResult {
  const result: ValidationResult = {
    passed: true,
    errors: [],
    warnings: []
  };

  const notes = state.placedNotes || [];
  const maxColumn = (state.columnWidths || []).length;

  notes.forEach((note: PlacedNote, index: number) => {
    // Check that columns are non-negative (canvas-space should never be negative)
    if (note.startColumnIndex < 0) {
      result.errors.push(`Note ${index} (${note.uuid}): startColumnIndex is negative (${note.startColumnIndex})`);
      result.passed = false;
    }

    if (note.endColumnIndex < 0) {
      result.errors.push(`Note ${index} (${note.uuid}): endColumnIndex is negative (${note.endColumnIndex})`);
      result.passed = false;
    }

    // Check that start <= end
    if (note.startColumnIndex > note.endColumnIndex) {
      result.errors.push(`Note ${index} (${note.uuid}): startColumnIndex (${note.startColumnIndex}) > endColumnIndex (${note.endColumnIndex})`);
      result.passed = false;
    }

    // Warn if columns exceed grid bounds
    if (note.startColumnIndex >= maxColumn && maxColumn > 0) {
      result.warnings.push(`Note ${index} (${note.uuid}): startColumnIndex (${note.startColumnIndex}) >= columnWidths.length (${maxColumn})`);
    }

    if (note.endColumnIndex >= maxColumn && maxColumn > 0) {
      result.warnings.push(`Note ${index} (${note.uuid}): endColumnIndex (${note.endColumnIndex}) >= columnWidths.length (${maxColumn})`);
    }

    // Check that drum notes have valid drum track indices
    if (note.isDrum && (typeof note.drumTrack !== 'number' || note.drumTrack < 0)) {
      result.errors.push(`Note ${index} (${note.uuid}): isDrum=true but drumTrack is invalid (${note.drumTrack})`);
      result.passed = false;
    }
  });

  return result;
}

/**
 * Validate that all stamp placements use canvas-space coordinates
 */
export function validateStamps(state: AppState): ValidationResult {
  const result: ValidationResult = {
    passed: true,
    errors: [],
    warnings: []
  };

  const stamps = state.sixteenthStampPlacements || [];
  const maxColumn = (state.columnWidths || []).length;

  stamps.forEach((stamp: SixteenthStampPlacement, index: number) => {
    // Check that columns are non-negative
    if (stamp.startColumn < 0) {
      result.errors.push(`Stamp ${index} (${stamp.id}): startColumn is negative (${stamp.startColumn})`);
      result.passed = false;
    }

    if (stamp.endColumn < 0) {
      result.errors.push(`Stamp ${index} (${stamp.id}): endColumn is negative (${stamp.endColumn})`);
      result.passed = false;
    }

    // Check that start <= end
    if (stamp.startColumn > stamp.endColumn) {
      result.errors.push(`Stamp ${index} (${stamp.id}): startColumn (${stamp.startColumn}) > endColumn (${stamp.endColumn})`);
      result.passed = false;
    }

    // Warn if columns exceed grid bounds
    if (stamp.startColumn >= maxColumn && maxColumn > 0) {
      result.warnings.push(`Stamp ${index} (${stamp.id}): startColumn (${stamp.startColumn}) >= columnWidths.length (${maxColumn})`);
    }

    if (stamp.endColumn >= maxColumn && maxColumn > 0) {
      result.warnings.push(`Stamp ${index} (${stamp.id}): endColumn (${stamp.endColumn}) >= columnWidths.length (${maxColumn})`);
    }
  });

  return result;
}

/**
 * Validate that all triplet placements use correct time-based indexing
 * Note: Triplets use time indices where 1 index = 1 microbeat (time-space column)
 */
export function validateTriplets(state: AppState): ValidationResult {
  const result: ValidationResult = {
    passed: true,
    errors: [],
    warnings: []
  };

  const triplets = state.tripletStampPlacements || [];
  const totalTimeColumns = (state.macrobeatGroupings || []).reduce((sum, val) => sum + val, 0);

  triplets.forEach((triplet: TripletStampPlacement, index: number) => {
    // Check that cell index is non-negative
    if (triplet.startTimeIndex < 0) {
      result.errors.push(`Triplet ${index} (${triplet.id}): startTimeIndex is negative (${triplet.startTimeIndex})`);
      result.passed = false;
    }

    // Check that span is positive
    if (triplet.span <= 0) {
      result.errors.push(`Triplet ${index} (${triplet.id}): span is non-positive (${triplet.span})`);
      result.passed = false;
    }

    // Warn if cell index exceeds grid bounds
    if (triplet.startTimeIndex >= totalTimeColumns && totalTimeColumns > 0) {
      result.warnings.push(`Triplet ${index} (${triplet.id}): startTimeIndex (${triplet.startTimeIndex}) >= totalTimeColumns (${totalTimeColumns})`);
    }

    // Calculate end cell and check bounds
    const endTime = triplet.startTimeIndex + (triplet.span * 2);
    if (endTime > totalTimeColumns && totalTimeColumns > 0) {
      result.warnings.push(`Triplet ${index} (${triplet.id}): endTimeIndex (${endTime}) > totalTimeColumns (${totalTimeColumns})`);
    }
  });

  return result;
}

/**
 * Validate that all tonic signs use canvas-space coordinates
 */
export function validateTonicSigns(state: AppState): ValidationResult {
  const result: ValidationResult = {
    passed: true,
    errors: [],
    warnings: []
  };

  const tonicSignGroups = state.tonicSignGroups || {};
  const maxColumn = (state.columnWidths || []).length;

  Object.entries(tonicSignGroups).forEach(([groupKey, signs]) => {
    if (!Array.isArray(signs)) {
      result.errors.push(`Tonic sign group "${groupKey}" is not an array`);
      result.passed = false;
      return;
    }

    signs.forEach((sign: TonicSign, index: number) => {
      // Check that column is non-negative
      if (sign.columnIndex < 0) {
        result.errors.push(`Tonic sign ${groupKey}[${index}]: columnIndex is negative (${sign.columnIndex})`);
        result.passed = false;
      }

      // Warn if column exceeds grid bounds
      // Tonic signs occupy 2 columns, so check columnIndex + 1
      if (sign.columnIndex + 1 >= maxColumn && maxColumn > 0) {
        result.warnings.push(`Tonic sign ${groupKey}[${index}]: columnIndex + 1 (${sign.columnIndex + 1}) >= columnWidths.length (${maxColumn})`);
      }

      // Check that tonicNumber is valid (1-7 for diatonic scale degrees)
      if (sign.tonicNumber !== undefined && (sign.tonicNumber < 1 || sign.tonicNumber > 7)) {
        result.errors.push(`Tonic sign ${groupKey}[${index}]: tonicNumber is out of range (${sign.tonicNumber}), expected 1-7`);
        result.passed = false;
      }

      // Check that preMacrobeatIndex is non-negative
      if (sign.preMacrobeatIndex < 0) {
        result.errors.push(`Tonic sign ${groupKey}[${index}]: preMacrobeatIndex is negative (${sign.preMacrobeatIndex})`);
        result.passed = false;
      }
    });
  });

  return result;
}

/**
 * Validate that modulation markers use canvas-space coordinates
 */
export function validateModulationMarkers(state: AppState): ValidationResult {
  const result: ValidationResult = {
    passed: true,
    errors: [],
    warnings: []
  };

  const markers = state.modulationMarkers || [];
  const maxColumn = (state.columnWidths || []).length;

  markers.forEach((marker: ModulationMarker, index: number) => {
    // Check that columnIndex, if set, is non-negative
    if (marker.columnIndex !== null && marker.columnIndex !== undefined && marker.columnIndex < 0) {
      result.errors.push(`Modulation marker ${index} (${marker.id}): columnIndex is negative (${marker.columnIndex})`);
      result.passed = false;
    }

    // Warn if columnIndex exceeds grid bounds
    if (marker.columnIndex !== null && marker.columnIndex !== undefined && marker.columnIndex >= maxColumn && maxColumn > 0) {
      result.warnings.push(`Modulation marker ${index} (${marker.id}): columnIndex (${marker.columnIndex}) >= columnWidths.length (${maxColumn})`);
    }

    // Check that measureIndex is non-negative
    if (marker.measureIndex < 0) {
      result.errors.push(`Modulation marker ${index} (${marker.id}): measureIndex is negative (${marker.measureIndex})`);
      result.passed = false;
    }

    // Check that ratio is positive
    if (marker.ratio <= 0) {
      result.errors.push(`Modulation marker ${index} (${marker.id}): ratio is non-positive (${marker.ratio})`);
      result.passed = false;
    }
  });

  return result;
}

/**
 * Validate columnWidths array structure
 */
export function validateColumnWidths(state: AppState): ValidationResult {
  const result: ValidationResult = {
    passed: true,
    errors: [],
    warnings: []
  };

  const columnWidths = state.columnWidths || [];
  const musicalColumnWidths = state.musicalColumnWidths || [];

  // Check that columnWidths exists and is an array
  if (!Array.isArray(columnWidths)) {
    result.errors.push('columnWidths is not an array');
    result.passed = false;
    return result;
  }

  // Check that all widths are positive numbers
  columnWidths.forEach((width: number, index: number) => {
    if (typeof width !== 'number' || width <= 0) {
      result.errors.push(`columnWidths[${index}] is not a positive number (${width})`);
      result.passed = false;
    }
  });

  // Warn if musicalColumnWidths still exists (should be deprecated)
  if (musicalColumnWidths.length > 0) {
    result.warnings.push(`musicalColumnWidths still exists with ${musicalColumnWidths.length} entries (should be deprecated in Phase 8)`);
  }

  // Warn if columnWidths is empty
  if (columnWidths.length === 0) {
    result.warnings.push('columnWidths is empty - grid may not be initialized');
  }

  return result;
}

/**
 * Run all validation checks and return a comprehensive report
 */
export function runAllValidations(state: AppState): ValidationReport {
  const report: ValidationReport = {
    overall: true,
    notes: validateNotes(state),
    stamps: validateStamps(state),
    triplets: validateTriplets(state),
    tonicSigns: validateTonicSigns(state),
    modulationMarkers: validateModulationMarkers(state),
    columnWidths: validateColumnWidths(state)
  };

  // Update overall status
  report.overall = Object.values(report)
    .filter((val): val is ValidationResult => typeof val === 'object' && 'passed' in val)
    .every(result => result.passed);

  return report;
}

/**
 * Print a formatted validation report to console
 */
export function printValidationReport(report: ValidationReport): void {
  void report;
}

/**
 * Convenience function to run validation and print report
 */
export function validateAndReport(state: AppState): boolean {
  const report = runAllValidations(state);
  return report.overall;
}

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).__coordinateValidator = {
    runAllValidations,
    validateAndReport,
    printValidationReport,
    validateNotes,
    validateStamps,
    validateTriplets,
    validateTonicSigns,
    validateModulationMarkers,
    validateColumnWidths
  };
}



