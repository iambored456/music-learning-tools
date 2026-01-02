/**
 * Modulation Mapping Module
 *
 * Framework-agnostic modulation marker and coordinate mapping utilities.
 * Handles tempo modulation (compression/expansion) for the notation grid.
 */

import type {
  ModulationMarker,
  ModulationRatio,
  CanvasSpaceColumn,
  MacrobeatGrouping
} from '@mlt/types';

/**
 * Marker with resolved column index
 */
type MarkerWithColumn = Omit<ModulationMarker, 'columnIndex'> & { columnIndex: CanvasSpaceColumn };

/**
 * Modulation segment with scale factor
 */
export interface ModulationSegment {
  startColumn: number;
  endColumn: number;
  scale: number;
  marker?: MarkerWithColumn;
}

/**
 * Coordinate mapping with modulation support
 */
export interface CoordinateMapping {
  segments: ModulationSegment[];
  microbeatToCanvasX(microbeatIndex: number): number;
  canvasXToMicrobeat(canvasX: number): number;
  getSegmentAtX(canvasX: number): ModulationSegment | null;
  getGhostGridPositions(segment: ModulationSegment, options: GhostGridOptions): number[];
  getScaleForColumn(columnIndex: number): number;
}

/**
 * Options for ghost grid rendering
 */
interface GhostGridOptions {
  columnWidths?: number[];
  cellWidth?: number;
}

/**
 * Macrobeat info for measure conversion
 */
export interface MacrobeatInfo {
  startColumn: number;
  endColumn: number;
  grouping: 2 | 3;
}

/**
 * State interface for modulation mapping
 */
export interface ModulationMappingState {
  macrobeatGroupings: MacrobeatGrouping[];
}

/**
 * Callbacks for modulation mapping
 */
export interface ModulationMappingCallbacks {
  /** Get macrobeat info by index */
  getMacrobeatInfo?: (state: ModulationMappingState, index: number) => MacrobeatInfo | null;
  /** Logger function */
  log?: (level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: unknown) => void;
}

// Modulation ratio constants
export const MODULATION_RATIOS = {
  COMPRESSION_2_3: 2 / 3,  // 0.6666666667
  EXPANSION_3_2: 3 / 2     // 1.5
} as const satisfies Record<'COMPRESSION_2_3' | 'EXPANSION_3_2', ModulationRatio>;

/**
 * Converts a measure index to a canvas-space column index
 *
 * IMPORTANT: Returns column index in CANVAS-SPACE (0 = first musical beat).
 * This aligns with the canvas architecture where legends are in separate canvases.
 *
 * @param measureIndex - Measure index (0 = start, 1+ = after measure boundaries)
 * @param state - Application state with macrobeatGroupings
 * @param callbacks - Callbacks for dependencies
 * @returns Column index in canvas-space (0-based, first beat = 0)
 */
function measureIndexToColumnIndex(
  measureIndex: number,
  state: ModulationMappingState | null | undefined,
  callbacks: ModulationMappingCallbacks
): number {
  const { getMacrobeatInfo, log = () => {} } = callbacks;

  log('debug', '[MODULATION] measureIndexToColumnIndex called', {
    measureIndex,
    hasState: !!state
  });

  if (!state || !state.macrobeatGroupings) {
    log('warn', '[MODULATION] No state or macrobeatGroupings provided for measure conversion');
    const fallbackColumn = measureIndex * 4; // Assume ~4 columns per measure
    log('debug', '[MODULATION] Using fallback calculation', fallbackColumn);
    return fallbackColumn;
  }

  if (measureIndex === 0) {
    // Start of first measure (column 0 in canvas-space)
    log('debug', '[MODULATION] Measure 0 at canvas-space column 0');
    return 0;
  }

  if (!getMacrobeatInfo) {
    log('warn', '[MODULATION] getMacrobeatInfo callback not provided');
    return measureIndex * 4;
  }

  // Measure index is 1-based (measureIndex 1 = "after macrobeat 0")
  // Convert to 0-based macrobeatIndex
  const macrobeatIndex = measureIndex - 1;
  log('debug', `[MODULATION] Converting measureIndex ${measureIndex} to macrobeatIndex: ${macrobeatIndex}`);

  const measureInfo = getMacrobeatInfo(state, macrobeatIndex);
  log('debug', '[MODULATION] getMacrobeatInfo result', measureInfo);

  if (measureInfo) {
    // getMacrobeatInfo returns CANVAS-SPACE columns (0 = first musical beat)
    // endColumn is the LAST column of the measure, so we add 1 to get the first column AFTER the measure
    const canvasColumnAfterMeasure = measureInfo.endColumn + 1;
    log('debug', `[MODULATION] Found measure info, canvas-space endColumn: ${measureInfo.endColumn}, first column after: ${canvasColumnAfterMeasure}`);
    return canvasColumnAfterMeasure;
  }

  log('warn', `[MODULATION] Could not find measure info for index: ${measureIndex}`);
  const fallbackColumn = measureIndex * 4; // Assume ~4 columns per measure
  log('debug', '[MODULATION] Using improved fallback calculation', fallbackColumn);
  return fallbackColumn;
}

/**
 * Creates a new modulation marker at a measure boundary
 * @param measureIndex - Index of the measure after which modulation starts
 * @param ratio - Modulation ratio (2/3 or 3/2)
 * @param xPosition - Optional X position override (for accurate placement)
 * @param columnIndex - Optional column index for stable positioning
 * @param macrobeatIndex - Optional macrobeat index for stable positioning
 * @returns ModulationMarker object
 */
export function createModulationMarker(
  measureIndex: number,
  ratio: ModulationRatio,
  xPosition: number | null = null,
  columnIndex: CanvasSpaceColumn | null = null,
  macrobeatIndex: number | null = null
): ModulationMarker {
  return {
    id: `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    measureIndex,
    ratio,
    active: true,
    xPosition, // Store the actual boundary position if provided
    columnIndex, // Store column index for stable positioning
    macrobeatIndex // Store macrobeat index for stable positioning
  };
}

/**
 * Gets display text for a modulation ratio
 * @param ratio - The modulation ratio
 * @returns Display text like "2:3" or "3:2"
 */
export function getModulationDisplayText(ratio: number): string {
  if (Math.abs(ratio - MODULATION_RATIOS.COMPRESSION_2_3) < 0.001) {
    return '2:3';
  } else if (Math.abs(ratio - MODULATION_RATIOS.EXPANSION_3_2) < 0.001) {
    return '3:2';
  }
  return `${ratio}`;
}

/**
 * Gets the color for a modulation marker based on ratio
 * @param ratio - The modulation ratio
 * @returns CSS color string
 */
export function getModulationColor(ratio: number): string {
  const DEFAULT_UI_YELLOW = '#ffc107';
  if (Math.abs(ratio - MODULATION_RATIOS.COMPRESSION_2_3) < 0.001) {
    return DEFAULT_UI_YELLOW;
  } else if (Math.abs(ratio - MODULATION_RATIOS.EXPANSION_3_2) < 0.001) {
    return DEFAULT_UI_YELLOW;
  }
  return DEFAULT_UI_YELLOW;
}

/**
 * Creates an empty coordinate mapping (no modulation)
 * @returns Empty mapping functions
 */
function createEmptyMapping(): CoordinateMapping {
  const segments: ModulationSegment[] = [{
    startColumn: 0,
    endColumn: Infinity,
    scale: 1.0
  }];

  return {
    segments,

    getScaleForColumn(_columnIndex: number): number {
      return 1.0; // No modulation
    },

    microbeatToCanvasX(): number {
      // This method is no longer used - getColumnX handles everything
      return 0;
    },

    canvasXToMicrobeat(): number {
      // This method is no longer used
      return 0;
    },

    getSegmentAtX(): ModulationSegment | null {
      return segments[0] || null;
    },

    getGhostGridPositions(): number[] {
      return []; // No ghost grid when no modulation
    }
  };
}

/**
 * Creates a coordinate mapping with modulation support
 * @param markers - Array of modulation markers
 * @param baseMicrobeatPx - Base microbeat pixel width
 * @param state - Application state
 * @param callbacks - Callbacks for dependencies
 * @returns CoordinateMapping object
 */
export function createCoordinateMapping(
  markers: ModulationMarker[],
  baseMicrobeatPx: number,
  state: ModulationMappingState | null = null,
  callbacks: ModulationMappingCallbacks = {}
): CoordinateMapping {
  const { log = () => {} } = callbacks;

  // Early return if no markers
  if (!markers || markers.length === 0) {
    return createEmptyMapping();
  }

  // Sort markers by measure index
  const sortedMarkers = [...markers.filter(m => m.active)].sort((a, b) => a.measureIndex - b.measureIndex);

  // If no active markers, return empty mapping
  if (sortedMarkers.length === 0) {
    return createEmptyMapping();
  }

  log('debug', '[MODULATION] Creating coordinate mapping for markers', sortedMarkers);

  // Convert measure-based markers to column indices using state info
  const markersWithColumn: MarkerWithColumn[] = sortedMarkers.map(marker => {
    // Always calculate from measure index for accurate positioning
    // Don't trust stored xPosition as it may be from mouse clicks or outdated
    const columnIndex = measureIndexToColumnIndex(marker.measureIndex, state, callbacks) as CanvasSpaceColumn;
    log('debug', `[MODULATION] Marker at measure ${marker.measureIndex} calculated column=${columnIndex}`);
    log('debug', '[MODULATION] Full marker data', marker);
    log('debug', '[MODULATION] Final marker position', {
      id: marker.id,
      measureIndex: marker.measureIndex,
      columnIndex
    });

    return {
      ...marker,
      columnIndex
    };
  });

  // Create segments with cumulative scaling based on column indices
  const segments: ModulationSegment[] = [];
  let cumulativeScale = 1.0;

  // Add initial segment (before first marker)
  const firstMarker = markersWithColumn[0];
  if (markersWithColumn.length === 0 || (firstMarker && firstMarker.columnIndex > 0)) {
    // Initial segment ends where the modulated segment starts
    const endColumn = firstMarker ? firstMarker.columnIndex : Infinity;
    segments.push({
      startColumn: 0,
      endColumn: endColumn,
      scale: 1.0
    });
  }

  // Process each marker to create segments
  for (let i = 0; i < markersWithColumn.length; i++) {
    const marker = markersWithColumn[i]!;
    const nextMarker = markersWithColumn[i + 1];
    const nextMarkerColumn = nextMarker ? nextMarker.columnIndex : Infinity;

    // Update cumulative scale
    cumulativeScale *= marker.ratio;

    // The marker column represents the first column AFTER the measure boundary (canvas-space)
    segments.push({
      startColumn: marker.columnIndex,  // Canvas-space
      endColumn: nextMarkerColumn,  // Canvas-space
      scale: cumulativeScale,
      marker
    });
  }

  const mapping: CoordinateMapping = {
    segments,

    /**
     * Gets the modulation scale for a given column index
     * @param columnIndex - Column index in musical space
     * @returns Scale factor (1.0 = no modulation, 0.667 = compressed, 1.5 = expanded)
     */
    getScaleForColumn(columnIndex: number): number {
      // Find which segment this column belongs to
      for (const segment of segments) {
        if (columnIndex >= segment.startColumn && columnIndex < segment.endColumn) {
          return segment.scale;
        }
      }
      // If not in any segment, return 1.0 (no modulation)
      return 1.0;
    },

    /**
     * Converts microbeat index to canvas x position
     * NOTE: This method is deprecated - getColumnX in rendererUtils now handles modulation directly
     */
    microbeatToCanvasX(_microbeatIndex: number): number {
      return 0;
    },

    /**
     * Converts canvas x position to microbeat index
     * NOTE: This method is deprecated - coordinate conversion now handled by getColumnFromX
     */
    canvasXToMicrobeat(_canvasX: number): number {
      return 0;
    },

    /**
     * Gets the segment containing a given canvas x position
     * NOTE: This method is deprecated - not used in new column-based approach
     */
    getSegmentAtX(_canvasX: number): ModulationSegment | null {
      return segments[0] || null;
    },

    /**
     * Gets all ghost grid positions for a segment
     * NOTE: This method is deprecated - ghost grid now handled differently
     */
    getGhostGridPositions(_segment: ModulationSegment, _options: GhostGridOptions): number[] {
      return [];
    }
  };

  return mapping;
}

/**
 * Converts a column's modulated trigger time to regular transport time for scheduling
 * @param columnIndex - The column index of the note
 * @param regularTimeMap - Regular time map (timeMap from transportService)
 * @returns Regular transport time in seconds
 */
export function columnToRegularTime(columnIndex: number, regularTimeMap: number[]): number {
  if (columnIndex >= 0 && columnIndex < regularTimeMap.length) {
    const regularTime = regularTimeMap[columnIndex];
    if (regularTime !== undefined) {
      return regularTime;
    }
  }

  // Fallback: return a reasonable approximation
  return columnIndex * 0.333; // Rough approximation
}

/**
 * Converts canvas x to time in seconds for audio scheduling
 * NOTE: This function is deprecated and may need to be rewritten for column-based approach
 */
export function canvasXToSeconds(
  _canvasX: number,
  _coordinateMapping: CoordinateMapping,
  _baseMicrobeatDuration: number
): number {
  return 0;
}

/**
 * Converts time in seconds to canvas x position
 * NOTE: This function is deprecated and may need to be rewritten for column-based approach
 */
export function secondsToCanvasX(
  _seconds: number,
  _coordinateMapping: CoordinateMapping,
  _baseMicrobeatDuration: number
): number {
  return 0;
}
