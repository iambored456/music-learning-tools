/**
 * Column Mapping Service
 *
 * Framework-agnostic column mapping service that manages the canonical column map
 * for all grid rendering and interaction logic. Provides O(1) coordinate
 * conversions between visual, canvas, and time column spaces with caching.
 *
 * Coordinate Systems:
 * - Visual: Full grid including left legends (2 cols) + musical + right legends (2 cols)
 * - Canvas: Musical columns only (0 = first beat), excludes legends, includes tonics
 * - Time: Time-bearing columns only (0 = first microbeat), excludes legends and tonics
 */

import type {
  TonicSign,
  TonicSignGroups,
  MacrobeatGrouping,
  MacrobeatBoundaryStyle
} from '@mlt/types';

/**
 * Complete metadata for a single column
 */
export interface ColumnEntry {
  visualIndex: number;           // Full-space index (includes legends)
  canvasIndex: number | null;    // Canvas-space index (null for legends)
  timeIndex: number | null;      // Time-bearing index (null for non-playable)
  type: 'legend-left' | 'legend-right' | 'tonic' | 'beat';
  widthMultiplier: number;       // Column width in abstract units
  xOffsetUnmodulated: number;    // Cumulative X offset in abstract units
  macrobeatIndex: number | null; // Which macrobeat this column belongs to
  beatInMacrobeat: number | null; // Position within macrobeat (0-based)
  isMacrobeatStart: boolean;     // First beat of macrobeat
  isMacrobeatEnd: boolean;       // Last beat of macrobeat
  isPlayable: boolean;           // Can notes be placed here?
  tonicSignUuid: string | null;  // UUID if this is a tonic column
}

/**
 * Macrobeat boundary information in all coordinate spaces
 */
export interface MacrobeatBoundary {
  macrobeatIndex: number;
  visualColumn: number;          // Visual-space column at boundary
  canvasColumn: number;          // Canvas-space column at boundary
  timeColumn: number;            // Time-space column at boundary
  boundaryType: 'solid' | 'dashed' | 'anacrusis';
  isMeasureStart: boolean;       // True for solid boundaries
}

/**
 * Complete column map with all metadata and lookup tables
 */
export interface ColumnMap {
  entries: ColumnEntry[];

  // Fast bidirectional lookups (O(1))
  visualToCanvas: Map<number, number | null>;
  visualToTime: Map<number, number | null>;
  canvasToVisual: Map<number, number>;
  canvasToTime: Map<number, number | null>;
  timeToCanvas: Map<number, number>;
  timeToVisual: Map<number, number>;

  // Boundaries
  macrobeatBoundaries: MacrobeatBoundary[];

  // Totals
  totalVisualColumns: number;
  totalCanvasColumns: number;
  totalTimeColumns: number;
  totalWidthUnmodulated: number;
}

/**
 * State interface for column mapping
 */
export interface ColumnMapState {
  macrobeatGroupings: MacrobeatGrouping[];
  macrobeatBoundaryStyles: MacrobeatBoundaryStyle[];
  tonicSignGroups: TonicSignGroups;
}

/**
 * Callbacks for column mapping service
 */
export interface ColumnMapCallbacks {
  /** Get placed tonic signs from state */
  getPlacedTonicSigns?: (state: ColumnMapState) => TonicSign[];
  /** Side column width multiplier */
  sideColumnWidth?: number;
  /** Beat column width multiplier */
  beatColumnWidth?: number;
}

/**
 * Cache key for invalidation
 */
interface CacheKey {
  macrobeatGroupings: number[];
  tonicSignsHash: string;
  macrobeatBoundaryStyles: string[];
}

/**
 * Create a column mapping service instance
 */
export function createColumnMapService(callbacks: ColumnMapCallbacks = {}) {
  const {
    getPlacedTonicSigns = () => [],
    sideColumnWidth = 0.25,
    beatColumnWidth = 1.0
  } = callbacks;

  let cachedMap: ColumnMap | null = null;
  let cacheKey: CacheKey | null = null;

  /**
   * Builds cache key from relevant state
   */
  function buildCacheKey(state: ColumnMapState): CacheKey {
    const tonicSigns = getPlacedTonicSigns(state);
    const tonicSignsHash = tonicSigns
      .map(ts => `${ts.columnIndex}:${ts.preMacrobeatIndex}:${ts.uuid || ''}`)
      .sort()
      .join('|');

    return {
      macrobeatGroupings: [...state.macrobeatGroupings],
      tonicSignsHash,
      macrobeatBoundaryStyles: [...state.macrobeatBoundaryStyles]
    };
  }

  /**
   * Checks if cached map is still valid
   */
  function isCacheValid(newKey: CacheKey): boolean {
    if (!cacheKey) return false;

    return (
      cacheKey.tonicSignsHash === newKey.tonicSignsHash &&
      JSON.stringify(cacheKey.macrobeatGroupings) === JSON.stringify(newKey.macrobeatGroupings) &&
      JSON.stringify(cacheKey.macrobeatBoundaryStyles) === JSON.stringify(newKey.macrobeatBoundaryStyles)
    );
  }

  /**
   * Builds the complete column map from state
   */
  function buildColumnMap(state: ColumnMapState): ColumnMap {
    const { macrobeatGroupings, macrobeatBoundaryStyles } = state;
    const tonicSigns = getPlacedTonicSigns(state);
    const sortedTonics = [...tonicSigns].sort((a, b) => a.preMacrobeatIndex - b.preMacrobeatIndex);

    const entries: ColumnEntry[] = [];
    const macrobeatBoundaries: MacrobeatBoundary[] = [];

    let visualIndex = 0;
    let canvasIndex = 0;
    let timeIndex = 0;
    let xOffset = 0;
    let tonicCursor = 0;

    /**
     * Helper to add tonic columns for a specific macrobeat position
     */
    const addTonicColumns = (preMacrobeatIndex: number): void => {
      while (tonicCursor < sortedTonics.length) {
        const tonic = sortedTonics[tonicCursor];
        if (!tonic) break;
        if (tonic.preMacrobeatIndex !== preMacrobeatIndex) break;

        const uuid = tonic.uuid || '';

        // Each tonic sign occupies 2 canvas columns (zero time)
        for (let i = 0; i < 2; i++) {
          entries.push({
            visualIndex,
            canvasIndex,
            timeIndex: null,
            type: 'tonic',
            widthMultiplier: beatColumnWidth,
            xOffsetUnmodulated: xOffset,
            macrobeatIndex: null,
            beatInMacrobeat: null,
            isMacrobeatStart: false,
            isMacrobeatEnd: false,
            isPlayable: false,
            tonicSignUuid: i === 0 ? uuid : null  // Only first column stores UUID
          });

          visualIndex++;
          canvasIndex++;
          xOffset += beatColumnWidth;
        }

        // Advance past all instances with same UUID
        const currentUuid = uuid;
        do {
          tonicCursor++;
        } while (
          tonicCursor < sortedTonics.length &&
          ((sortedTonics[tonicCursor]?.uuid || '') === currentUuid)
        );
      }
    };

    // Left legends (2 columns)
    for (let i = 0; i < 2; i++) {
      entries.push({
        visualIndex,
        canvasIndex: null,
        timeIndex: null,
        type: 'legend-left',
        widthMultiplier: sideColumnWidth,
        xOffsetUnmodulated: xOffset,
        macrobeatIndex: null,
        beatInMacrobeat: null,
        isMacrobeatStart: false,
        isMacrobeatEnd: false,
        isPlayable: false,
        tonicSignUuid: null
      });
      visualIndex++;
      xOffset += sideColumnWidth;
    }

    // Tonics before first macrobeat (preMacrobeatIndex = -1)
    addTonicColumns(-1);

    // Process each macrobeat
    macrobeatGroupings.forEach((grouping, mbIndex) => {
      // Add beat columns
      for (let beatIdx = 0; beatIdx < grouping; beatIdx++) {
        entries.push({
          visualIndex,
          canvasIndex,
          timeIndex,
          type: 'beat',
          widthMultiplier: beatColumnWidth,
          xOffsetUnmodulated: xOffset,
          macrobeatIndex: mbIndex,
          beatInMacrobeat: beatIdx,
          isMacrobeatStart: beatIdx === 0,
          isMacrobeatEnd: beatIdx === grouping - 1,
          isPlayable: true,
          tonicSignUuid: null
        });

        visualIndex++;
        canvasIndex++;
        timeIndex++;
        xOffset += beatColumnWidth;
      }

      // Record macrobeat boundary (at end of macrobeat)
      const boundaryStyle = macrobeatBoundaryStyles[mbIndex] || 'dashed';
      macrobeatBoundaries.push({
        macrobeatIndex: mbIndex,
        visualColumn: visualIndex - 1,
        canvasColumn: canvasIndex - 1,
        timeColumn: timeIndex - 1,
        boundaryType: boundaryStyle as 'solid' | 'dashed' | 'anacrusis',
        isMeasureStart: boundaryStyle === 'solid'
      });

      // Add tonics after this macrobeat
      addTonicColumns(mbIndex);
    });

    // Right legends (2 columns)
    for (let i = 0; i < 2; i++) {
      entries.push({
        visualIndex,
        canvasIndex: null,
        timeIndex: null,
        type: 'legend-right',
        widthMultiplier: sideColumnWidth,
        xOffsetUnmodulated: xOffset,
        macrobeatIndex: null,
        beatInMacrobeat: null,
        isMacrobeatStart: false,
        isMacrobeatEnd: false,
        isPlayable: false,
        tonicSignUuid: null
      });
      visualIndex++;
      xOffset += sideColumnWidth;
    }

    // Build lookup maps for O(1) conversions
    const visualToCanvas = new Map<number, number | null>();
    const visualToTime = new Map<number, number | null>();
    const canvasToVisual = new Map<number, number>();
    const canvasToTime = new Map<number, number | null>();
    const timeToCanvas = new Map<number, number>();
    const timeToVisual = new Map<number, number>();

    entries.forEach(entry => {
      visualToCanvas.set(entry.visualIndex, entry.canvasIndex);
      visualToTime.set(entry.visualIndex, entry.timeIndex);

      if (entry.canvasIndex !== null) {
        canvasToVisual.set(entry.canvasIndex, entry.visualIndex);
        canvasToTime.set(entry.canvasIndex, entry.timeIndex);
      }

      if (entry.timeIndex !== null) {
        if (entry.canvasIndex !== null) {
          timeToCanvas.set(entry.timeIndex, entry.canvasIndex);
        }
        timeToVisual.set(entry.timeIndex, entry.visualIndex);
      }
    });

    return {
      entries,
      visualToCanvas,
      visualToTime,
      canvasToVisual,
      canvasToTime,
      timeToCanvas,
      timeToVisual,
      macrobeatBoundaries,
      totalVisualColumns: visualIndex,
      totalCanvasColumns: canvasIndex,
      totalTimeColumns: timeIndex,
      totalWidthUnmodulated: xOffset
    };
  }

  /**
   * Gets the column map, returning cached version if valid
   */
  function getColumnMap(state: ColumnMapState): ColumnMap {
    const currentKey = buildCacheKey(state);

    if (cachedMap && isCacheValid(currentKey)) {
      return cachedMap;
    }

    cachedMap = buildColumnMap(state);
    cacheKey = currentKey;
    return cachedMap;
  }

  /**
   * Invalidates the cache (call when state changes)
   */
  function invalidate(): void {
    cachedMap = null;
    cacheKey = null;
  }

  return {
    getColumnMap,
    invalidate,
    buildColumnMap
  };
}

export type ColumnMapService = ReturnType<typeof createColumnMapService>;

/**
 * Coordinate conversion helper functions
 * These can be used standalone or as part of rhythm action callbacks
 */

export function visualToCanvas(visualIndex: number, map: ColumnMap): number | null {
  return map.visualToCanvas.get(visualIndex) ?? null;
}

export function visualToTime(visualIndex: number, map: ColumnMap): number | null {
  return map.visualToTime.get(visualIndex) ?? null;
}

export function canvasToVisual(canvasIndex: number, map: ColumnMap): number {
  const result = map.canvasToVisual.get(canvasIndex);
  return result !== undefined ? result : canvasIndex + 2; // +2 fallback for left legends
}

export function canvasToTime(canvasIndex: number, map: ColumnMap): number | null {
  return map.canvasToTime.get(canvasIndex) ?? null;
}

export function timeToCanvas(timeIndex: number, map: ColumnMap): number {
  const result = map.timeToCanvas.get(timeIndex);
  return result !== undefined ? result : timeIndex;
}

export function timeToVisual(timeIndex: number, map: ColumnMap): number {
  const result = map.timeToVisual.get(timeIndex);
  return result !== undefined ? result : timeIndex + 2; // +2 fallback for left legends
}

/**
 * Gets the cumulative time boundary after a macrobeat
 */
export function getTimeBoundaryAfterMacrobeat(
  macrobeatIndex: number,
  macrobeatGroupings: number[]
): number {
  if (macrobeatIndex === undefined || macrobeatIndex === null) return 0;
  let time = 0;
  for (let i = 0; i <= macrobeatIndex && i < macrobeatGroupings.length; i++) {
    const grouping = macrobeatGroupings[i];
    if (typeof grouping === 'number') {
      time += grouping;
    }
  }
  return time;
}

/**
 * Column metadata queries
 */

export function getColumnEntry(visualIndex: number, map: ColumnMap): ColumnEntry | null {
  return map.entries[visualIndex] || null;
}

export function getColumnEntryByCanvas(canvasIndex: number, map: ColumnMap): ColumnEntry | null {
  const visualIndex = map.canvasToVisual.get(canvasIndex);
  return visualIndex !== undefined ? (map.entries[visualIndex] || null) : null;
}

export function isPlayableColumn(canvasIndex: number, map: ColumnMap): boolean {
  const entry = getColumnEntryByCanvas(canvasIndex, map);
  return entry?.isPlayable ?? false;
}

export function getColumnType(canvasIndex: number, map: ColumnMap): ColumnEntry['type'] | null {
  const entry = getColumnEntryByCanvas(canvasIndex, map);
  return entry?.type ?? null;
}

/**
 * Macrobeat boundary queries
 */

export function getMacrobeatBoundary(macrobeatIndex: number, map: ColumnMap): MacrobeatBoundary | null {
  return map.macrobeatBoundaries.find(b => b.macrobeatIndex === macrobeatIndex) || null;
}

/**
 * Column width helpers
 */

export function getCanvasColumnWidths(map: ColumnMap): number[] {
  const widths: number[] = [];

  for (const entry of map.entries) {
    if (entry.canvasIndex !== null) {
      widths[entry.canvasIndex] = entry.widthMultiplier;
    }
  }

  return widths;
}

export function getTotalCanvasWidth(map: ColumnMap): number {
  let total = 0;

  for (const entry of map.entries) {
    if (entry.canvasIndex !== null) {
      total += entry.widthMultiplier;
    }
  }

  return total;
}
