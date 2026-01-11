// js/state/actions/viewActions.ts
import { fullRowData as masterRowData } from '../pitchData.js';
import logger from '@utils/logger.ts';
import type { Store, PrintOptions } from '../../../types/state.js';

interface PitchRange {
  topIndex: number;
  bottomIndex: number;
}

export const viewActions = {
  // Tools
  toggleAccidentalMode(this: Store, type: 'flat' | 'sharp'): void {
    if (!Object.prototype.hasOwnProperty.call(this.state.accidentalMode || {}, type)) {return;}

    const snapshot = { ...this.state.accidentalMode };
    const currentValue = snapshot[type];
    const otherType = type === 'flat' ? 'sharp' : 'flat';
    const otherValue = snapshot[otherType];

    logger.debug('ViewActions', `toggleAccidentalMode(${type})`, {
      previousState: snapshot,
      requestedType: type,
      requestedValue: !currentValue,
      pairedType: otherType,
      pairedValue: otherValue
    }, 'state');

    if (currentValue && !otherValue) {
      this.state.accidentalMode[otherType] = true;
      this.state.accidentalMode[type] = false;
      logger.warn('ViewActions', `Prevented both accidentals from being disabled (enabling ${otherType})`, {
        enforcedType: otherType,
        toggledType: type
      }, 'state');
    } else {
      this.state.accidentalMode[type] = !currentValue;
    }

    logger.debug('ViewActions', `toggleAccidentalMode(${type}) result`, {
      newState: { ...this.state.accidentalMode }
    }, 'state');
    this.emit('accidentalModeChanged', this.state.accidentalMode);
    this.emit('layoutConfigChanged');
  },

  toggleFrequencyLabels(this: Store): void {
    const previous = this.state.showFrequencyLabels;
    this.state.showFrequencyLabels = !this.state.showFrequencyLabels;

    logger.debug('ViewActions', 'toggleFrequencyLabels', {
      previous,
      next: this.state.showFrequencyLabels,
      accidentalMode: { ...this.state.accidentalMode }
    }, 'state');

    this.emit('frequencyLabelsChanged', this.state.showFrequencyLabels);
    this.emit('layoutConfigChanged');
  },

  toggleOctaveLabels(this: Store): void {
    const previous = this.state.showOctaveLabels;
    this.state.showOctaveLabels = !previous;

    logger.debug('ViewActions', 'toggleOctaveLabels', {
      previous,
      next: this.state.showOctaveLabels
    }, 'state');

    this.emit('octaveLabelsChanged', this.state.showOctaveLabels);
    this.emit('layoutConfigChanged');
  },

  toggleFocusColours(this: Store): void {
    this.state.focusColours = !this.state.focusColours;
    const focusColoursEnabled = this.state.focusColours;
    this.emit('focusColoursChanged', focusColoursEnabled);

    this.emit('layoutConfigChanged');
  },

  setDegreeDisplayMode(this: Store, mode: 'off' | 'diatonic' | 'modal'): void {
    const oldMode = this.state.degreeDisplayMode;
    this.state.degreeDisplayMode = this.state.degreeDisplayMode === mode ? 'off' : mode;
    const newMode = this.state.degreeDisplayMode;
    logger.debug('ViewActions', 'setDegreeDisplayMode', { oldMode, newMode }, 'state');

    this.emit('layoutConfigChanged');
    this.emit('degreeDisplayModeChanged', newMode);
  },

  // REVISED: This now sets the tool type and optional tonic number
  setSelectedTool(this: Store, type: string, tonicNumber?: string | number): void {
    const stateChanged = this.state.selectedTool !== type ||
                           (type === 'tonicization' && this.state.selectedToolTonicNumber !== tonicNumber);

    if (stateChanged) {
      const oldTool = this.state.selectedTool;
      this.state.previousTool = oldTool;
      this.state.selectedTool = type;

      if (type === 'tonicization' && tonicNumber) {
        this.state.selectedToolTonicNumber = parseInt(String(tonicNumber), 10);
      }

      this.emit('toolChanged', { newTool: type, oldTool });
    }
  },

  // NEW: Action to set the active note properties
  setSelectedNote(this: Store, shape: 'circle' | 'oval' | 'diamond', color: string): void {
    const oldNote = { ...this.state.selectedNote };
    this.state.selectedNote = { shape, color };
    this.emit('noteChanged', { newNote: this.state.selectedNote, oldNote });
  },

  setKeySignature(this: Store, newKey: string): void {
    if (this.state.keySignature !== newKey) {
      this.state.keySignature = newKey;
      this.emit('keySignatureChanged', newKey);
    }
  },

  // Playback
  setTempo(this: Store, newTempo: number): void { this.state.tempo = newTempo; this.emit('tempoChanged', newTempo); },
  setLooping(this: Store, isLooping: boolean): void { this.state.isLooping = isLooping; this.emit('loopingChanged', isLooping); },
  setPlaybackState(this: Store, isPlaying: boolean, isPaused = false): void { this.state.isPlaying = isPlaying; this.state.isPaused = isPaused; this.emit('playbackStateChanged', { isPlaying, isPaused }); },
  setPlayheadMode(this: Store, mode: 'cursor' | 'microbeat' | 'macrobeat'): void {
    if (mode !== 'cursor' && mode !== 'microbeat' && mode !== 'macrobeat') {return;}
    if (this.state.playheadMode === mode) {return;}
    this.state.playheadMode = mode;
    this.emit('playheadModeChanged', mode);
  },

  // Waveform
  toggleWaveformExtendedView(this: Store): void {
    this.state.waveformExtendedView = !this.state.waveformExtendedView;
    this.emit('waveformExtendedViewChanged', this.state.waveformExtendedView);
  },

  // ADSR
  setAdsrTimeAxisScale(this: Store, scale: number): void {
    const clampedScale = Math.max(0.1, Math.min(5.0, scale)); // Clamp between 0.1x and 5.0x
    this.state.adsrTimeAxisScale = clampedScale;
    this.emit('adsrTimeAxisScaleChanged', clampedScale);
  },

  // Layout & Viewport
  setLayoutConfig(this: Store, config: { cellWidth?: number; cellHeight?: number; columnWidths?: number[] }): void {
    const oldConfig = {
      cellWidth: this.state.cellWidth,
      cellHeight: this.state.cellHeight,
      columnWidths: [...(this.state.columnWidths || [])]
    };

    let hasChanges = false;

    if (config.cellWidth !== undefined && this.state.cellWidth !== config.cellWidth) {
      this.state.cellWidth = config.cellWidth;
      hasChanges = true;
    }

    if (config.cellHeight !== undefined && this.state.cellHeight !== config.cellHeight) {
      this.state.cellHeight = config.cellHeight;
      hasChanges = true;
    }

    if (config.columnWidths !== undefined) {
      const oldWidths = JSON.stringify(this.state.columnWidths || []);
      const newWidths = JSON.stringify(config.columnWidths);
      if (oldWidths !== newWidths) {
        this.state.columnWidths = [...config.columnWidths];
        // columnWidths is now canvas-space only (no legends), no separate musicalColumnWidths needed
        hasChanges = true;
      }
    }

    if (hasChanges) {
      this.emit('layoutConfigChanged', {
        oldConfig,
        newConfig: {
          cellWidth: this.state.cellWidth,
          cellHeight: this.state.cellHeight,
          columnWidths: [...(this.state.columnWidths || [])]
        }
      });
    }
    // else: No history to push
  },

  setGridPosition(this: Store, newPosition: number): void {
    const maxPosition = this.state.fullRowData.length - (this.state.viewportRows * 2);
    const clampedPosition = Math.max(0, Math.min(newPosition, maxPosition));
    if (this.state.gridPosition !== clampedPosition) {
      this.state.gridPosition = clampedPosition;
      this.emit('layoutConfigChanged');
    }
  },
  shiftGridUp(this: Store): void { viewActions.setGridPosition.call(this, this.state.gridPosition - 1); },
  shiftGridDown(this: Store): void { viewActions.setGridPosition.call(this, this.state.gridPosition + 1); },

  // Print
  setPrintOptions(this: Store, newOptions: Partial<PrintOptions>): void {
    this.state.printOptions = { ...this.state.printOptions, ...newOptions };
    this.emit('printOptionsChanged', this.state.printOptions);
  },

  setPrintPreviewActive(this: Store, isActive: boolean): void {
    this.state.isPrintPreviewActive = isActive;
    this.emit('printPreviewStateChanged', isActive);
  },

  /**
     * Sets the active pitch viewport for the grid (no trimming/parking behavior).
     * @param range - The desired viewport { topIndex, bottomIndex } in masterRowData indices.
     */
  setPitchRange(this: Store, range: Partial<PitchRange>): void {
    const totalRows = masterRowData.length;
    if (!range || totalRows === 0) {
      return;
    }

    const oldRange = this.state.pitchRange || { topIndex: 0, bottomIndex: totalRows - 1 };
    const maxIndex = Math.max(0, totalRows - 1);

    const requestedTop = range.topIndex ?? oldRange.topIndex;
    const requestedBottom = range.bottomIndex ?? oldRange.bottomIndex;

    const newTopIndex = Math.max(0, Math.min(maxIndex, requestedTop));
    const newBottomIndex = Math.max(newTopIndex, Math.min(maxIndex, requestedBottom));

    if (oldRange.topIndex === newTopIndex && oldRange.bottomIndex === newBottomIndex) {
      return;
    }

    this.state.pitchRange = { topIndex: newTopIndex, bottomIndex: newBottomIndex };
    this.emit('pitchRangeChanged', { topIndex: newTopIndex, bottomIndex: newBottomIndex });
    this.emit('layoutConfigChanged');
  },

  setDeviceProfile(this: Store, profile: {
    isMobile?: boolean;
    isTouch?: boolean;
    isCoarsePointer?: boolean;
    orientation?: 'landscape' | 'portrait';
    width?: number;
    height?: number;
  } = {}): void {
    const previous = this.state.deviceProfile || {};
    const nextProfile = {
      isMobile: profile.isMobile ?? previous.isMobile ?? false,
      isTouch: profile.isTouch ?? previous.isTouch ?? false,
      isCoarsePointer: profile.isCoarsePointer ?? previous.isCoarsePointer ?? false,
      orientation: (profile.orientation ?? previous.orientation ?? 'landscape'),
      width: profile.width ?? previous.width ?? 0,
      height: profile.height ?? previous.height ?? 0
    };

    const hasChanged = (Object.keys(nextProfile) as (keyof typeof nextProfile)[]).some(
      key => nextProfile[key] !== previous[key]
    );

    this.state.deviceProfile = nextProfile;

    if (hasChanged) {
      this.emit('deviceProfileChanged', nextProfile);
    }
  },

  // Long Notes Style
  setLongNoteStyle(this: Store, style: 'style1' | 'style2'): void {
    if (this.state.longNoteStyle === style) {return;}
    this.state.longNoteStyle = style;
    this.emit('longNoteStyleChanged', style);
  }
};
