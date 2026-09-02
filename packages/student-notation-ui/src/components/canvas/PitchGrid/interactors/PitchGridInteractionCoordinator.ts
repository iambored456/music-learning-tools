import store from '@state/initStore.ts';
import type { CanvasSpaceColumn, PlacedNote } from '@mlt/types';
import type { PitchGridNoteToolInteractor } from './tools/PitchGridNoteToolInteractor.ts';
import type { PitchGridChordToolInteractor } from './tools/PitchGridChordToolInteractor.ts';
import type { PitchGridEraserToolInteractor } from './tools/PitchGridEraserToolInteractor.ts';
import type { PitchGridSixteenthStampToolInteractor } from './tools/PitchGridSixteenthStampToolInteractor.ts';
import type { PitchGridTripletStampToolInteractor } from './tools/PitchGridTripletStampToolInteractor.ts';
import type { PitchGridSixteenthThreeStampToolInteractor } from './tools/PitchGridSixteenthThreeStampToolInteractor.ts';
import type { PitchGridModulationToolInteractor } from './tools/PitchGridModulationToolInteractor.ts';
import type { PitchGridTonicizationToolInteractor } from './tools/PitchGridTonicizationToolInteractor.ts';
import { buildCanvasFont } from '@services/typographyService.ts';

interface MeasureBoundary {
  measureIndex: number;
  xPosition: number;
  macrobeatIndex: number;
}

export interface PitchGridInteractionState {
  isDragging: boolean;
  isEraserDragActive: boolean;
  activeNote: PlacedNote | null;
  activeChordNotes: PlacedNote[];
  activePreviewPitches: string[];
  lastDragRow: number | null;
}

export class PitchGridInteractionCoordinator {
  constructor(
    private readonly deps: {
      noteToolInteractor: PitchGridNoteToolInteractor;
      chordToolInteractor: PitchGridChordToolInteractor;
      eraserToolInteractor: PitchGridEraserToolInteractor;
      stampToolInteractor: PitchGridSixteenthStampToolInteractor;
      tripletToolInteractor: PitchGridTripletStampToolInteractor;
      sixteenthThreeStampToolInteractor: PitchGridSixteenthThreeStampToolInteractor;
      modulationToolInteractor: PitchGridModulationToolInteractor;
      tonicizationToolInteractor: PitchGridTonicizationToolInteractor;
      placementFillNoteIds: Set<string>;
      getPitchForRow: (rowIndex: number) => string | null;
      getTimeAlignedCanvasColumn: (canvasCol: number) => number | null;
      getChordPitchesForRootPitch: (rootPitch: string) => string[];
      findNearestMeasureBoundary: (clickX: number) => MeasureBoundary | null;
    }
  ) {}

  handleToolMouseDown(params: {
    toolType: string;
    colIndex: number;
    rowIndex: number;
    actualX: number;
    canvasY: number;
    state: PitchGridInteractionState;
  }): { handled: boolean; state: PitchGridInteractionState } {
    const { toolType, colIndex, rowIndex, actualX, canvasY } = params;
    const state = params.state;

    if (toolType === 'chord') {
      const result = this.deps.chordToolInteractor.handleMouseDown(
        colIndex,
        rowIndex,
        { activeChordNotes: state.activeChordNotes, lastDragRow: state.lastDragRow, activePreviewPitches: state.activePreviewPitches },
        this.deps.placementFillNoteIds,
        {
          getPitchForRow: this.deps.getPitchForRow,
          getChordPitchesForRootPitch: this.deps.getChordPitchesForRootPitch
        }
      );

      return {
        handled: result.handled,
        state: {
          ...state,
          isDragging: result.shouldStartDragging ? true : state.isDragging,
          activeChordNotes: result.state.activeChordNotes,
          lastDragRow: result.state.lastDragRow,
          activePreviewPitches: result.state.activePreviewPitches
        }
      };
    }

    if (toolType === 'tonicization') {
      this.deps.tonicizationToolInteractor.handleMouseDown();
      return { handled: true, state };
    }

    if (toolType === 'eraser') {
      const result = this.deps.eraserToolInteractor.handleMouseDown(colIndex, rowIndex);
      return {
        handled: result.handled,
        state: {
          ...state,
          isEraserDragActive: result.handled ? result.shouldStartDrag : state.isEraserDragActive
        }
      };
    }

    if (toolType === 'sixteenthStamp') {
      const result = this.deps.stampToolInteractor.handleMouseDown({
        colIndex,
        rowIndex,
        actualX,
        canvasY,
        getPitchForRow: this.deps.getPitchForRow,
        getTimeAlignedCanvasColumn: this.deps.getTimeAlignedCanvasColumn
      });

      return {
        handled: result.handled,
        state: {
          ...state,
          activePreviewPitches: result.activePreviewPitches ?? state.activePreviewPitches
        }
      };
    }

    if (toolType === 'tripletStamp') {
      const result = this.deps.tripletToolInteractor.handleMouseDown({
        colIndex,
        rowIndex,
        actualX,
        canvasY,
        getPitchForRow: this.deps.getPitchForRow
      });

      return {
        handled: result.handled,
        state: {
          ...state,
          activePreviewPitches: result.activePreviewPitches ?? state.activePreviewPitches
        }
      };
    }

    if (toolType === 'sixteenthThreeStamp') {
      const result = this.deps.sixteenthThreeStampToolInteractor.handleMouseDown({
        colIndex,
        rowIndex,
        actualX,
        canvasY,
        getPitchForRow: this.deps.getPitchForRow
      });

      return {
        handled: result.handled,
        state: {
          ...state,
          activePreviewPitches: result.activePreviewPitches ?? state.activePreviewPitches
        }
      };
    }

    if (toolType === 'modulation') {
      this.deps.modulationToolInteractor.handlePlacementClick(actualX, this.deps.findNearestMeasureBoundary);
      return { handled: true, state };
    }

    if (toolType === 'note') {
      const result = this.deps.noteToolInteractor.attemptPlaceNoteAt(
        colIndex,
        rowIndex,
        { activeNote: state.activeNote, lastDragRow: state.lastDragRow, activePreviewPitches: state.activePreviewPitches },
        this.deps.placementFillNoteIds,
        { getPitchForRow: this.deps.getPitchForRow }
      );

      return {
        handled: true,
        state: {
          ...state,
          isDragging: result.placed && result.shouldStartDragging ? true : state.isDragging,
          activeNote: result.state.activeNote,
          lastDragRow: result.state.lastDragRow,
          activePreviewPitches: result.state.activePreviewPitches
        }
      };
    }

    return { handled: false, state };
  }

  handleToolMouseMoveBeforeBoundsCheck(params: {
    actualX: number;
    rowIndex: number;
    canvasEl: HTMLElement | null;
    state: PitchGridInteractionState;
  }): { handled: boolean; state: PitchGridInteractionState } {
    const { actualX, rowIndex, canvasEl, state } = params;

    if (this.deps.modulationToolInteractor.handleMouseMove(actualX)) {
      return { handled: true, state };
    }

    if (this.deps.stampToolInteractor.handleMouseMove({ rowIndex, canvasEl, getPitchForRow: this.deps.getPitchForRow })) {
      return { handled: true, state };
    }

    if (this.deps.tripletToolInteractor.handleMouseMove({ rowIndex, canvasEl, getPitchForRow: this.deps.getPitchForRow })) {
      return { handled: true, state };
    }

    if (this.deps.sixteenthThreeStampToolInteractor.handleMouseMove({ rowIndex, canvasEl, getPitchForRow: this.deps.getPitchForRow })) {
      return { handled: true, state };
    }

    return { handled: false, state };
  }

  handleNoteOrChordDragMouseMove(params: {
    colIndex: number;
    rowIndex: number;
    state: PitchGridInteractionState;
  }): { handled: boolean; state: PitchGridInteractionState } {
    const { colIndex, rowIndex } = params;
    const state = params.state;

    if (!state.isDragging || (!state.activeNote && state.activeChordNotes.length === 0)) {
      return { handled: false, state };
    }

    if (state.activeNote) {
      const nextState = this.deps.noteToolInteractor.handleActiveNoteDrag(
        colIndex,
        rowIndex,
        { activeNote: state.activeNote, lastDragRow: state.lastDragRow, activePreviewPitches: state.activePreviewPitches },
        { getPitchForRow: this.deps.getPitchForRow }
      );

      return {
        handled: true,
        state: {
          ...state,
          activeNote: nextState.activeNote,
          lastDragRow: nextState.lastDragRow,
          activePreviewPitches: nextState.activePreviewPitches
        }
      };
    }

    const nextChordState = this.deps.chordToolInteractor.handleActiveChordDrag(
      colIndex,
      rowIndex,
      { activeChordNotes: state.activeChordNotes, lastDragRow: state.lastDragRow, activePreviewPitches: state.activePreviewPitches },
      { getPitchForRow: this.deps.getPitchForRow }
    );

    return {
      handled: true,
      state: {
        ...state,
        activeChordNotes: nextChordState.activeChordNotes,
        lastDragRow: nextChordState.lastDragRow,
        activePreviewPitches: nextChordState.activePreviewPitches
      }
    };
  }

  handleToolHoverVisuals(params: {
    toolType: string;
    actualX: number;
    canvasY: number;
    pitchHoverCtx: CanvasRenderingContext2D | null;
    canvasEl: HTMLElement | null;
    selectedModulationRatio: number | null | undefined;
    findNearestMeasureBoundary: (clickX: number) => MeasureBoundary | null;
    drawModulationPreview: (ctx: CanvasRenderingContext2D, x: number, ratio: number) => void;
  }): void {
    const { toolType, actualX, canvasY, pitchHoverCtx, canvasEl } = params;

    if (toolType === 'sixteenthStamp') {
      this.deps.stampToolInteractor.updateHoverCursor({ actualX, canvasY, canvasEl });
    } else if (toolType === 'tripletStamp') {
      this.deps.tripletToolInteractor.updateHoverCursor({ actualX, canvasY, canvasEl });
    } else if (toolType === 'sixteenthThreeStamp') {
      this.deps.sixteenthThreeStampToolInteractor.updateHoverCursor({ actualX, canvasY, canvasEl });
    }

    const hoveredMarker = this.deps.modulationToolInteractor.getHoveredMarker(actualX, canvasY);

    if (toolType === 'modulation' && !hoveredMarker && pitchHoverCtx) {
      const nearestBoundary = params.findNearestMeasureBoundary(actualX);
      const ratio = params.selectedModulationRatio;
      if (nearestBoundary && typeof ratio === 'number') {
        params.drawModulationPreview(pitchHoverCtx, nearestBoundary.xPosition, ratio);
      }
    }

    if (canvasEl) {
      this.deps.modulationToolInteractor.updateCursor(canvasEl, hoveredMarker);
    }
  }

  handleToolMouseUp(): boolean {
    if (this.deps.stampToolInteractor.handleMouseUp()) {
      return true;
    }

    if (this.deps.tripletToolInteractor.handleMouseUp()) {
      return true;
    }

    if (this.deps.sixteenthThreeStampToolInteractor.handleMouseUp()) {
      return true;
    }

    if (this.deps.modulationToolInteractor.handleMouseUp()) {
      return true;
    }

    return false;
  }

  handleChordToolHover(params: {
    colIndex: number;
    rowIndex: number;
    pitchHoverCtx: CanvasRenderingContext2D;
    zoomLevel: number;
    cursorX: number;
    cursorY: number;
    drawSingleColumnOvalNote: (ctx: CanvasRenderingContext2D, options: any, note: any, rowIndex: number) => void;
    drawTwoColumnOvalNote: (ctx: CanvasRenderingContext2D, options: any, note: any, rowIndex: number) => void;
  }): boolean {
    if (store.state.selectedTool !== 'chord') {
      return false;
    }

    const rootPitch = this.deps.getPitchForRow(params.rowIndex);
    if (!rootPitch) {
      return true;
    }

    const chordPitches = this.deps.getChordPitchesForRootPitch(rootPitch);
    const selectedNote = store.state.selectedNote;
    if (!selectedNote) {
      return true;
    }

    const { color } = selectedNote;
    const shape = 'circle' as const;
    params.pitchHoverCtx.globalAlpha = 0.4;

    chordPitches.forEach(noteName => {
      const noteRowIndex = store.state.fullRowData.findIndex(r => r.toneNote === noteName);
      if (noteRowIndex <= -1) {
        return;
      }

      const defaultEndColumn = (params.colIndex + 1) as CanvasSpaceColumn;
      const ghostNote = {
        row: noteRowIndex,
        startColumnIndex: params.colIndex as CanvasSpaceColumn,
        endColumnIndex: defaultEndColumn,
        color,
        shape,
        isDrum: false
      } as const;

      const fullOptions = { ...store.state, zoomLevel: params.zoomLevel };
      params.drawTwoColumnOvalNote(params.pitchHoverCtx, fullOptions, ghostNote as any, noteRowIndex);
    });

    params.pitchHoverCtx.globalAlpha = 1.0;
    const chordName = document.querySelector<HTMLElement>('#chords-panel .harmony-preset-button.selected')?.title
      ?? 'Chord';
    const rootName = rootPitch.replace(/-?\d+$/, '');
    const label = `${rootName} ${chordName}`;
    const ctx = params.pitchHoverCtx;
    ctx.save();
    ctx.font = buildCanvasFont('caption');
    ctx.textBaseline = 'middle';
    const paddingX = 6;
    const labelHeight = 20;
    const labelWidth = ctx.measureText(label).width + paddingX * 2;
    const x = Math.min(params.cursorX + 8, Math.max(0, ctx.canvas.width - labelWidth - 4));
    const y = Math.max(labelHeight / 2 + 4, params.cursorY - 12);
    ctx.fillStyle = 'rgba(33, 37, 41, 0.78)';
    ctx.beginPath();
    ctx.roundRect(x, y - labelHeight / 2, labelWidth, labelHeight, 5);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, x + paddingX, y);
    ctx.restore();
    return true;
  }
}

