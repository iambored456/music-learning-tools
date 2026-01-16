/**
 * Rhythm Actions Module
 *
 * Framework-agnostic rhythm and time signature manipulation actions.
 * All coordinate transformations use injectable columnMapService callbacks.
 */

import { createModulationMarker, MODULATION_RATIOS } from '../../rhythm/modulationMapping.js';
import type {
  AnacrusisCache,
  CanvasSpaceColumn,
  MacrobeatBoundaryStyle,
  MacrobeatGrouping,
  ModulationMarker,
  ModulationRatio,
  PlacedNote,
  SixteenthStampPlacement,
  TripletStampPlacement,
  Store,
  TonicSign,
  TonicSignGroups
} from '@mlt/types';
import type { ColumnMap } from '../../services/columnMapService.js';

/**
 * Callbacks for rhythm actions to access external services
 */
export interface RhythmActionCallbacks {
  /** Get column map for coordinate conversions */
  getColumnMap?: (state: any) => ColumnMap;
  /** Convert visual column to time index */
  visualToTimeIndex?: (state: any, visualIndex: number, groupings: MacrobeatGrouping[]) => number | null;
  /** Convert time index to visual column */
  timeIndexToVisualColumn?: (state: any, timeIndex: number, groupings: MacrobeatGrouping[]) => number | null;
  /** Get time boundary after a macrobeat */
  getTimeBoundaryAfterMacrobeat?: (state: any, index: number, groupings: MacrobeatGrouping[]) => number;
  /** Logger function */
  log?: (level: 'debug' | 'info' | 'warn' | 'error', context: string, message: string, data?: unknown, category?: string) => void;
}

// Anacrusis constants
export const ANACRUSIS_ON_GROUPINGS: MacrobeatGrouping[] = new Array<MacrobeatGrouping>(19).fill(2);
export const ANACRUSIS_ON_STYLES: MacrobeatBoundaryStyle[] = [
  'anacrusis', 'anacrusis', 'solid', 'dashed', 'dashed', 'dashed', 'solid',
  'dashed', 'dashed', 'dashed', 'solid', 'dashed', 'dashed', 'dashed', 'solid',
  'dashed', 'dashed', 'dashed', 'solid'
];
export const ANACRUSIS_OFF_GROUPINGS: MacrobeatGrouping[] = new Array<MacrobeatGrouping>(16).fill(2);
export const ANACRUSIS_OFF_STYLES: MacrobeatBoundaryStyle[] = [
  'dashed', 'dashed', 'dashed', 'solid',
  'dashed', 'dashed', 'dashed', 'solid',
  'dashed', 'dashed', 'dashed', 'solid',
  'dashed', 'dashed', 'dashed' // Last measure completed by isLastBeat logic
];

type GroupingArray = MacrobeatGrouping[];
type BoundaryStyleArray = MacrobeatBoundaryStyle[];

/**
 * Helper to recompute tonic sign column indices after rhythm structure changes
 */
function recomputeTonicColumns(
  state: { tonicSignGroups?: TonicSignGroups },
  getColumnMap: (state: any) => ColumnMap
): void {
  const map = getColumnMap(state);
  const tonicStartByUuid = new Map<string, number>();

  map.entries.forEach(entry => {
    if (entry.type === 'tonic' && entry.tonicSignUuid && typeof entry.canvasIndex === 'number') {
      tonicStartByUuid.set(entry.tonicSignUuid, entry.canvasIndex);
    }
  });

  Object.entries(state.tonicSignGroups || {}).forEach(([uuid, group]) => {
    const start = tonicStartByUuid.get(uuid);
    if (start === undefined) { return; }
    group.forEach((sign: TonicSign) => {
      sign.columnIndex = start as CanvasSpaceColumn;
    });
  });
}

/**
 * Creates rhythm action methods with dependency injection
 */
// Default empty column map for fallback
const EMPTY_COLUMN_MAP: ColumnMap = {
  entries: [],
  visualToCanvas: new Map(),
  visualToTime: new Map(),
  canvasToVisual: new Map(),
  canvasToTime: new Map(),
  timeToCanvas: new Map(),
  timeToVisual: new Map(),
  macrobeatBoundaries: [],
  totalVisualColumns: 0,
  totalCanvasColumns: 0,
  totalTimeColumns: 0,
  totalWidthUnmodulated: 0
};

export function createRhythmActions(callbacks: RhythmActionCallbacks = {}) {
  const {
    getColumnMap = () => EMPTY_COLUMN_MAP,
    visualToTimeIndex = () => null,
    timeIndexToVisualColumn = () => null,
    getTimeBoundaryAfterMacrobeat = () => 0,
    log = () => {}
  } = callbacks;

  return {
    setAnacrusis(this: Store, enabled: boolean): void {
      if (this.state.hasAnacrusis === enabled) { return; }

      const oldGroupings: GroupingArray = [...this.state.macrobeatGroupings];
      const oldBoundaryStyles: BoundaryStyleArray = [...this.state.macrobeatBoundaryStyles];
      const oldTotalBeats = oldGroupings.reduce((sum, val) => sum + val, 0);

      let newGroupings: GroupingArray;
      let newBoundaryStyles: BoundaryStyleArray;

      if (!enabled) {
        const firstSolidIndex = oldBoundaryStyles.findIndex(style => style === 'solid');
        let removalCount = 0;

        if (firstSolidIndex !== -1) {
          removalCount = firstSolidIndex + 1;
        } else {
          while (
            removalCount < oldBoundaryStyles.length &&
            oldBoundaryStyles[removalCount] === 'anacrusis'
          ) {
            removalCount++;
          }
        }

        removalCount = Math.min(removalCount, oldGroupings.length);

        const removedGroupings = oldGroupings.slice(0, removalCount);
        const removedStyles = oldBoundaryStyles.slice(0, removalCount);

        if (removalCount > 0) {
          this._anacrusisCache = {
            groupings: removedGroupings,
            boundaryStyles: removedStyles
          };
        } else {
          this._anacrusisCache = null;
        }

        newGroupings = oldGroupings.slice(removalCount);
        newBoundaryStyles = oldBoundaryStyles
          .slice(removalCount)
          .map(style => (style === 'anacrusis' ? 'dashed' : style));

        if (newGroupings.length === 0) {
          newGroupings = [...ANACRUSIS_OFF_GROUPINGS];
          newBoundaryStyles = [...ANACRUSIS_OFF_STYLES];
        }

        log('debug', 'rhythmActions', 'Disabled anacrusis', {
          removalCount,
          removedColumns: removedGroupings.reduce((sum, val) => sum + val, 0)
        }, 'state');
      } else {
        const cache: AnacrusisCache | null | undefined = this._anacrusisCache;
        const anacrusisLength = ANACRUSIS_ON_GROUPINGS.length - ANACRUSIS_OFF_GROUPINGS.length;
        const defaultGroupings = ANACRUSIS_ON_GROUPINGS.slice(0, anacrusisLength);
        const defaultStyles = ANACRUSIS_ON_STYLES.slice(0, anacrusisLength);

        const groupingsToInsert = cache?.groupings?.length
          ? [...cache.groupings]
          : [...defaultGroupings];
        const stylesToInsert = cache?.boundaryStyles?.length
          ? [...cache.boundaryStyles]
          : [...defaultStyles];

        newGroupings = [...groupingsToInsert, ...oldGroupings];
        newBoundaryStyles = [...stylesToInsert, ...oldBoundaryStyles];

        if (!cache?.boundaryStyles?.length) {
          for (let i = 0; i < stylesToInsert.length; i++) {
            newBoundaryStyles[i] = i < stylesToInsert.length - 1 ? 'anacrusis' : 'solid';
          }
        }

        this._anacrusisCache = null;

        log('debug', 'rhythmActions', 'Enabled anacrusis', {
          insertedCount: groupingsToInsert.length,
          insertedColumns: groupingsToInsert.reduce((sum, val) => sum + val, 0)
        }, 'state');
      }

      const newTotalBeats = newGroupings.reduce((sum, val) => sum + val, 0);
      const timeShift = newTotalBeats - oldTotalBeats;

      this.state.hasAnacrusis = enabled;
      this.state.macrobeatGroupings = [...newGroupings];
      this.state.macrobeatBoundaryStyles = [...newBoundaryStyles];
      recomputeTonicColumns(this.state, getColumnMap);

      if (timeShift !== 0) {
        const notesToRemove: PlacedNote[] = [];

        this.state.placedNotes.forEach(note => {
          const startTime = visualToTimeIndex(this.state, note.startColumnIndex, oldGroupings);
          const endTime = visualToTimeIndex(this.state, note.endColumnIndex, oldGroupings);

          if (startTime === null || endTime === null) {
            return;
          }

          const newStartTime = startTime + timeShift;
          const newEndTime = endTime + timeShift;

          if (newStartTime < 0) {
            notesToRemove.push(note);
            return;
          }

          const newStartColumn = timeIndexToVisualColumn(this.state, newStartTime, newGroupings);
          const newEndColumn = timeIndexToVisualColumn(this.state, newEndTime, newGroupings);

          if (newStartColumn === null || newEndColumn === null) {
            notesToRemove.push(note);
            return;
          }

          note.startColumnIndex = newStartColumn as CanvasSpaceColumn;
          note.endColumnIndex = newEndColumn as CanvasSpaceColumn;
        });

        notesToRemove.forEach(noteToRemove => {
          const index = this.state.placedNotes.indexOf(noteToRemove);
          if (index > -1) {
            this.state.placedNotes.splice(index, 1);
          }
        });

        const stampsToRemove: SixteenthStampPlacement[] = [];

        this.state.sixteenthStampPlacements.forEach(stamp => {
          const startTime = visualToTimeIndex(this.state, stamp.startColumn, oldGroupings);
          const endTime = visualToTimeIndex(this.state, stamp.endColumn, oldGroupings);

          if (startTime === null || endTime === null) {
            return;
          }

          const newStartTime = startTime + timeShift;
          const newEndTime = endTime + timeShift;

          if (newStartTime < 0) {
            stampsToRemove.push(stamp);
            return;
          }

          const newStartColumn = timeIndexToVisualColumn(this.state, newStartTime, newGroupings);
          const newEndColumn = timeIndexToVisualColumn(this.state, newEndTime, newGroupings);

          if (newStartColumn === null || newEndColumn === null) {
            stampsToRemove.push(stamp);
            return;
          }

          stamp.startColumn = newStartColumn as CanvasSpaceColumn;
          stamp.endColumn = newEndColumn as CanvasSpaceColumn;
        });

        stampsToRemove.forEach(stampToRemove => {
          const index = this.state.sixteenthStampPlacements.indexOf(stampToRemove);
          if (index > -1) {
            this.state.sixteenthStampPlacements.splice(index, 1);
          }
        });

        const tripletsToRemove: TripletStampPlacement[] = [];

        if (this.state.tripletStampPlacements) {
          this.state.tripletStampPlacements.forEach(triplet => {
            const newStartTime = triplet.startTimeIndex + timeShift;
            if (newStartTime < 0) {
              tripletsToRemove.push(triplet);
            } else {
              triplet.startTimeIndex = newStartTime;
            }
          });

          tripletsToRemove.forEach(tripletToRemove => {
            const index = this.state.tripletStampPlacements.indexOf(tripletToRemove);
            if (index > -1) {
              this.state.tripletStampPlacements.splice(index, 1);
            }
          });
        }

        // Update modulation markers to reflect the new grid layout
        const markersToRemove: ModulationMarker[] = [];
        const anacrusisShift = enabled
          ? (newGroupings.length - oldGroupings.length)
          : -(oldGroupings.length - newGroupings.length);

        this.state.tempoModulationMarkers.forEach(marker => {
          const newMeasureIndex = marker.measureIndex + anacrusisShift;

          if (newMeasureIndex < 0) {
            markersToRemove.push(marker);
            return;
          }

          marker.measureIndex = newMeasureIndex;
          marker.columnIndex = null;
          marker.xPosition = null;
          marker.macrobeatIndex = null;
        });

        markersToRemove.forEach(markerToRemove => {
          const index = this.state.tempoModulationMarkers.indexOf(markerToRemove);
          if (index > -1) {
            this.state.tempoModulationMarkers.splice(index, 1);
          }
        });
      }

      this.emit('anacrusisChanged', enabled);
      this.emit('notesChanged');
      this.emit('sixteenthStampPlacementsChanged');
      this.emit('tripletStampPlacementsChanged');
      this.emit('tempoModulationMarkersChanged');
      this.emit('rhythmStructureChanged');
      this.recordState();
    },

    toggleMacrobeatGrouping(this: Store, index: number): void {
      if (index === undefined || index < 0 || index >= this.state.macrobeatGroupings.length) {
        log('error', 'rhythmActions', `Invalid index for toggleMacrobeatGrouping: ${index}`, null, 'state');
        return;
      }

      const oldGroupings = [...this.state.macrobeatGroupings];
      const currentValue = oldGroupings[index]!;
      const newValue = currentValue === 2 ? 3 : 2;
      const delta = newValue - currentValue;

      const newGroupings = [...oldGroupings];
      newGroupings[index] = newValue;

      const boundaryTime = getTimeBoundaryAfterMacrobeat(this.state, index, oldGroupings);

      const notesToRemove: PlacedNote[] = [];

      this.state.placedNotes.forEach(note => {
        const startTime = visualToTimeIndex(this.state, note.startColumnIndex, oldGroupings);
        const endTime = visualToTimeIndex(this.state, note.endColumnIndex, oldGroupings);

        if (startTime === null || endTime === null) {
          return;
        }

        if (startTime >= boundaryTime) {
          const newStartTime = startTime + delta;
          const newEndTime = endTime + delta;
          const newStartCol = timeIndexToVisualColumn(this.state, newStartTime, newGroupings);
          const newEndCol = timeIndexToVisualColumn(this.state, newEndTime, newGroupings);
          if (newStartCol !== null && newEndCol !== null) {
            note.startColumnIndex = newStartCol as CanvasSpaceColumn;
            note.endColumnIndex = newEndCol as CanvasSpaceColumn;
          } else {
            notesToRemove.push(note);
          }
        }
      });

      if (notesToRemove.length) {
        notesToRemove.forEach(n => {
          const idx = this.state.placedNotes.indexOf(n);
          if (idx > -1) { this.state.placedNotes.splice(idx, 1); }
        });
      }

      this.state.macrobeatGroupings = newGroupings;
      recomputeTonicColumns(this.state, getColumnMap);

      this.emit('notesChanged');
      this.emit('rhythmStructureChanged');

      this.recordState();
    },

    cycleMacrobeatBoundaryStyle(this: Store, index: number): void {
      if (index === undefined || index < 0 || index >= this.state.macrobeatBoundaryStyles.length) {
        log('error', 'rhythmActions', `Invalid index for cycleMacrobeatBoundaryStyle: ${index}`, null, 'state');
        return;
      }

      const isInAnacrusis = this._isBoundaryInAnacrusis(index);

      let styles: BoundaryStyleArray;
      if (isInAnacrusis) {
        styles = ['dashed', 'solid', 'anacrusis'];
      } else {
        styles = ['dashed', 'solid'];
      }

      const currentStyle = this.state.macrobeatBoundaryStyles[index] ?? 'dashed';
      const currentIndex = styles.indexOf(currentStyle);

      const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % styles.length;
      const nextStyle = styles[nextIndex] ?? 'dashed';
      this.state.macrobeatBoundaryStyles[index] = nextStyle;

      this.emit('rhythmStructureChanged');
      this.recordState();
    },

    _isBoundaryInAnacrusis(this: Store, boundaryIndex: number): boolean {
      if (!this.state.hasAnacrusis) { return false; }

      for (let i = 0; i <= boundaryIndex; i++) {
        if (this.state.macrobeatBoundaryStyles[i] === 'solid') {
          return i === boundaryIndex;
        }
      }
      return true;
    },

    increaseMacrobeatCount(this: Store): void {
      this.state.macrobeatGroupings.push(2);
      this.state.macrobeatBoundaryStyles.push('dashed');
      this.emit('rhythmStructureChanged');
      this.recordState();
    },

    decreaseMacrobeatCount(this: Store): void {
      if (this.state.macrobeatGroupings.length > 1) {
        const lastMacrobeatIndex = this.state.macrobeatGroupings.length - 1;
        const boundaryTime = getTimeBoundaryAfterMacrobeat(
          this.state,
          lastMacrobeatIndex - 1,
          this.state.macrobeatGroupings
        );

        const notesToRemove: PlacedNote[] = [];
        this.state.placedNotes.forEach(note => {
          const startTime = visualToTimeIndex(this.state, note.startColumnIndex, this.state.macrobeatGroupings);
          if (startTime !== null && startTime >= boundaryTime) {
            notesToRemove.push(note);
          }
        });

        notesToRemove.forEach(note => {
          const idx = this.state.placedNotes.indexOf(note);
          if (idx > -1) {
            this.state.placedNotes.splice(idx, 1);
          }
        });

        const stampsToRemove: SixteenthStampPlacement[] = [];
        this.state.sixteenthStampPlacements.forEach(stamp => {
          const startTime = visualToTimeIndex(this.state, stamp.startColumn, this.state.macrobeatGroupings);
          if (startTime !== null && startTime >= boundaryTime) {
            stampsToRemove.push(stamp);
          }
        });

        stampsToRemove.forEach(stamp => {
          const idx = this.state.sixteenthStampPlacements.indexOf(stamp);
          if (idx > -1) {
            this.state.sixteenthStampPlacements.splice(idx, 1);
          }
        });

        const tripletsToRemove: TripletStampPlacement[] = [];
        if (this.state.tripletStampPlacements) {
          this.state.tripletStampPlacements.forEach(triplet => {
            if (triplet.startTimeIndex >= boundaryTime) {
              tripletsToRemove.push(triplet);
            }
          });

          tripletsToRemove.forEach(triplet => {
            const idx = this.state.tripletStampPlacements.indexOf(triplet);
            if (idx > -1) {
              this.state.tripletStampPlacements.splice(idx, 1);
            }
          });
        }

        this.state.macrobeatGroupings.pop();
        this.state.macrobeatBoundaryStyles.pop();

        if (notesToRemove.length > 0) {
          this.emit('notesChanged');
        }
        if (stampsToRemove.length > 0) {
          this.emit('sixteenthStampPlacementsChanged');
        }
        if (tripletsToRemove.length > 0) {
          this.emit('tripletStampPlacementsChanged');
        }
        this.emit('rhythmStructureChanged');
        this.recordState();
      }
    },

    updateTimeSignature(this: Store, measureIndex: number, newGroupings: GroupingArray): void {
      if (!Array.isArray(newGroupings) || newGroupings.length === 0) {
        log('error', 'rhythmActions', 'Invalid groupings provided to updateTimeSignature', null, 'state');
        return;
      }

      let measureStartIndex = 0;
      let measureEndIndex = 0;
      let currentMeasure = 0;

      for (let i = 0; i < this.state.macrobeatGroupings.length; i++) {
        if (currentMeasure === measureIndex) {
          measureStartIndex = i;
          break;
        }

        const isLastBeat = (i === this.state.macrobeatGroupings.length - 1);
        const boundaryStyle = this.state.macrobeatBoundaryStyles[i];
        const isSolidBoundary = (boundaryStyle === 'solid');

        if (isSolidBoundary || isLastBeat) {
          currentMeasure++;
        }
      }

      currentMeasure = 0;
      for (let i = 0; i < this.state.macrobeatGroupings.length; i++) {
        if (currentMeasure === measureIndex) {
          const isLastBeat = (i === this.state.macrobeatGroupings.length - 1);
          const boundaryStyle = this.state.macrobeatBoundaryStyles[i];
          const isSolidBoundary = (boundaryStyle === 'solid');

          if (isSolidBoundary || isLastBeat) {
            measureEndIndex = i;
            break;
          }
        } else if (currentMeasure < measureIndex) {
          const isLastBeat = (i === this.state.macrobeatGroupings.length - 1);
          const boundaryStyle = this.state.macrobeatBoundaryStyles[i];
          const isSolidBoundary = (boundaryStyle === 'solid');

          if (isSolidBoundary || isLastBeat) {
            currentMeasure++;
          }
        }
      }

      const oldLength = measureEndIndex - measureStartIndex + 1;
      const newLength = newGroupings.length;
      const oldTimeSpan = this.state.macrobeatGroupings.slice(measureStartIndex, measureEndIndex + 1)
        .reduce((sum, val) => sum + val, 0);
      const newTimeSpan = newGroupings.reduce((sum, val) => sum + val, 0);
      const timeShift = newTimeSpan - oldTimeSpan;

      const boundaryTime = getTimeBoundaryAfterMacrobeat(this.state, measureEndIndex, this.state.macrobeatGroupings);

      if (timeShift !== 0) {
        const nextMacrobeatGroupings = (() => {
          const tmp: GroupingArray = [...this.state.macrobeatGroupings];
          tmp.splice(measureStartIndex, oldLength, ...newGroupings);
          return tmp;
        })();

        const notesToRemove: PlacedNote[] = [];

        this.state.placedNotes.forEach(note => {
          const startTime = visualToTimeIndex(this.state, note.startColumnIndex, this.state.macrobeatGroupings);
          const endTime = visualToTimeIndex(this.state, note.endColumnIndex, this.state.macrobeatGroupings);

          if (startTime === null || endTime === null) {
            return;
          }

          if (startTime >= boundaryTime) {
            const newStartTime = startTime + timeShift;
            const newEndTime = endTime + timeShift;
            const newStartCol = timeIndexToVisualColumn(this.state, newStartTime, nextMacrobeatGroupings);
            const newEndCol = timeIndexToVisualColumn(this.state, newEndTime, nextMacrobeatGroupings);

            if (newStartCol !== null && newEndCol !== null) {
              note.startColumnIndex = newStartCol as CanvasSpaceColumn;
              note.endColumnIndex = newEndCol as CanvasSpaceColumn;
            } else {
              notesToRemove.push(note);
            }
          }
        });

        if (notesToRemove.length) {
          notesToRemove.forEach(n => {
            const idx = this.state.placedNotes.indexOf(n);
            if (idx > -1) { this.state.placedNotes.splice(idx, 1); }
          });
        }
      }

      const newGroupingsCopy = [...newGroupings];
      const newStylesArray = new Array<MacrobeatBoundaryStyle>(Math.max(newLength - 1, 0)).fill('dashed');

      if (measureEndIndex < this.state.macrobeatBoundaryStyles.length) {
        const originalFinalStyle = this.state.macrobeatBoundaryStyles[measureEndIndex] ?? 'dashed';
        newStylesArray.push(originalFinalStyle);
      }

      this.state.macrobeatGroupings.splice(measureStartIndex, oldLength, ...newGroupingsCopy);
      this.state.macrobeatBoundaryStyles.splice(measureStartIndex, oldLength - 1, ...newStylesArray);

      this.emit('notesChanged');
      this.emit('rhythmStructureChanged');
      this.recordState();
    },

    addModulationMarker(
      this: Store,
      measureIndex: number,
      ratio: ModulationRatio,
      xPosition: number | null = null,
      columnIndex: CanvasSpaceColumn | null = null,
      macrobeatIndex: number | null = null
    ): string | null {
      if (!Object.values(MODULATION_RATIOS).includes(ratio)) {
        log('error', 'rhythmActions', `Invalid modulation ratio: ${ratio}`, null, 'state');
        return null;
      }

      const existingMarkerIndex = this.state.tempoModulationMarkers.findIndex((marker: ModulationMarker) => {
        if (marker.measureIndex === measureIndex) {
          return true;
        }

        if (macrobeatIndex !== null && marker.macrobeatIndex === macrobeatIndex) {
          return true;
        }

        if (columnIndex !== null && marker.columnIndex === columnIndex) {
          return true;
        }

        return false;
      });

      if (existingMarkerIndex !== -1) {
        const existingMarker = this.state.tempoModulationMarkers[existingMarkerIndex]!;
        log('info', 'rhythmActions', `Replacing existing modulation marker ${existingMarker.id} at measure ${measureIndex} (old ratio: ${existingMarker.ratio}, new ratio: ${ratio})`, null, 'state');

        existingMarker.ratio = ratio;
        existingMarker.xPosition = xPosition;
        if (columnIndex !== null) { existingMarker.columnIndex = columnIndex; }
        if (macrobeatIndex !== null) { existingMarker.macrobeatIndex = macrobeatIndex; }

        this.emit('tempoModulationMarkersChanged');
        this.recordState();

        return existingMarker.id;
      }

      const marker = createModulationMarker(measureIndex, ratio, xPosition, columnIndex, macrobeatIndex);
      this.state.tempoModulationMarkers.push(marker);

      this.state.tempoModulationMarkers.sort((a, b) => a.measureIndex - b.measureIndex);

      this.emit('tempoModulationMarkersChanged');
      this.recordState();

      log('info', 'rhythmActions', `Added modulation marker ${marker.id} at measure ${measureIndex} with ratio=${ratio}, columnIndex=${columnIndex}`, null, 'state');
      return marker.id;
    },

    removeModulationMarker(this: Store, markerId: string): void {
      const index = this.state.tempoModulationMarkers.findIndex(m => m.id === markerId);
      if (index === -1) {
        log('warn', 'rhythmActions', `Modulation marker not found: ${markerId}`, null, 'state');
        return;
      }

      this.state.tempoModulationMarkers.splice(index, 1);
      this.emit('tempoModulationMarkersChanged');
      this.recordState();

      log('info', 'rhythmActions', `Removed modulation marker ${markerId}`, null, 'state');
    },

    setModulationRatio(this: Store, markerId: string, ratio: ModulationRatio): void {
      if (!Object.values(MODULATION_RATIOS).includes(ratio)) {
        log('error', 'rhythmActions', `Invalid modulation ratio: ${ratio}`, null, 'state');
        return;
      }

      const marker = this.state.tempoModulationMarkers.find(m => m.id === markerId);
      if (!marker) {
        log('warn', 'rhythmActions', `Modulation marker not found: ${markerId}`, null, 'state');
        return;
      }

      marker.ratio = ratio;
      this.emit('tempoModulationMarkersChanged');
      this.recordState();

      log('info', 'rhythmActions', `Updated modulation marker ${markerId} ratio to ${ratio}`, null, 'state');
    },

    moveModulationMarker(this: Store, markerId: string, measureIndex: number): void {
      const marker = this.state.tempoModulationMarkers.find(m => m.id === markerId);
      if (!marker) {
        log('warn', 'rhythmActions', `Modulation marker not found: ${markerId}`, null, 'state');
        return;
      }

      marker.measureIndex = measureIndex;

      this.state.tempoModulationMarkers.sort((a, b) => a.measureIndex - b.measureIndex);

      this.emit('tempoModulationMarkersChanged');
      this.recordState();

      log('info', 'rhythmActions', `Moved modulation marker ${markerId} to measure ${measureIndex}`, null, 'state');
    },

    toggleModulationMarker(this: Store, markerId: string): void {
      const marker = this.state.tempoModulationMarkers.find(m => m.id === markerId);
      if (!marker) {
        log('warn', 'rhythmActions', `Modulation marker not found: ${markerId}`, null, 'state');
        return;
      }

      marker.active = !marker.active;
      this.emit('tempoModulationMarkersChanged');
      this.recordState();

      log('info', 'rhythmActions', `Toggled modulation marker ${markerId} active state to ${marker.active}`, null, 'state');
    },

    clearModulationMarkers(this: Store): void {
      const removedCount = this.state.tempoModulationMarkers.length;
      this.state.tempoModulationMarkers = [];
      this.emit('tempoModulationMarkersChanged');
      this.recordState();

      log('info', 'rhythmActions', `Cleared ${removedCount} modulation markers`, null, 'state');
    }
  };
}
