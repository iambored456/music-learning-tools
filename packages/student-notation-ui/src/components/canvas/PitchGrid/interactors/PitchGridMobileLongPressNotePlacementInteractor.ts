import GridCoordsService from '@services/gridCoordsService.ts';
import { getLogicalCanvasHeight, getLogicalCanvasWidth } from '@utils/canvasDimensions.ts';

type MobileTouchState = { identifier: number; colIndex: number; rowIndex: number };

type Dependencies = {
  shouldUseMobileLongPress: () => boolean;
  isPositionWithinPitchGrid: (colIndex: number, rowIndex: number) => boolean;
  getSelectedTool: () => string;
  getPitchHoverCtx: () => CanvasRenderingContext2D | null;
  clearOverlay: () => void;
  drawHoverHighlight: (colIndex: number, rowIndex: number, color: string) => void;
  getNoteHoverColor: (alpha: number) => string;
  drawGhostNote: (colIndex: number, rowIndex: number) => void;
  setGhostNotePosition: (colIndex: number, rowIndex: number) => void;
  attemptPlaceNoteAt: (colIndex: number, rowIndex: number) => boolean;
  onNotePlaced: () => void;
  onNoteNotPlaced: () => void;
};

type Options = {
  longPressDelayMs: number;
  ghostAlpha: number;
};

export class PitchGridMobileLongPressNotePlacementInteractor {
  private pitchCanvasElement: HTMLCanvasElement | null = null;
  private mobileLongPressTimer: number | null = null;
  private mobileTouchState: MobileTouchState | null = null;
  private mobileGhostActive = false;

  constructor(
    private readonly deps: Dependencies,
    private readonly options: Options
  ) {}

  setPitchCanvasElement(pitchCanvasElement: HTMLCanvasElement | null): void {
    this.pitchCanvasElement = pitchCanvasElement;
  }

  handleTouchStart(e: TouchEvent): void {
    if (!this.deps.shouldUseMobileLongPress()) {
      return;
    }

    if (this.mobileTouchState) {
      return;
    }

    const touch = e.changedTouches?.[0];
    if (!touch) {
      return;
    }

    const position = this.getTouchGridPosition(touch);
    if (!position || !this.deps.isPositionWithinPitchGrid(position.colIndex, position.rowIndex)) {
      return;
    }

    e.preventDefault();

    this.mobileTouchState = {
      identifier: touch.identifier,
      colIndex: position.colIndex,
      rowIndex: position.rowIndex
    };

    this.mobileLongPressTimer = window.setTimeout(() => {
      this.activateMobileGhostPreview();
    }, this.options.longPressDelayMs);
  }

  handleTouchMove(e: TouchEvent): void {
    if (!this.mobileTouchState) {
      return;
    }

    const touch =
      this.findTouchById(e.changedTouches, this.mobileTouchState.identifier) ||
      this.findTouchById(e.touches, this.mobileTouchState.identifier);

    if (!touch) {
      return;
    }

    const position = this.getTouchGridPosition(touch);
    if (!position) {
      this.resetMobileTouchState({ clearOverlay: this.mobileGhostActive });
      return;
    }

    if (!this.deps.isPositionWithinPitchGrid(position.colIndex, position.rowIndex)) {
      this.resetMobileTouchState({ clearOverlay: this.mobileGhostActive });
      return;
    }

    e.preventDefault();

    this.mobileTouchState.colIndex = position.colIndex;
    this.mobileTouchState.rowIndex = position.rowIndex;

    if (this.mobileGhostActive) {
      this.renderMobileGhostPreview();
    }
  }

  handleTouchEnd(e: TouchEvent): void {
    if (!this.mobileTouchState) {
      return;
    }

    const touch = this.findTouchById(e.changedTouches, this.mobileTouchState.identifier);
    if (!touch) {
      return;
    }

    e.preventDefault();

    const ghostWasActive = this.mobileGhostActive;
    const targetCol = this.mobileTouchState.colIndex;
    const targetRow = this.mobileTouchState.rowIndex;

    this.resetMobileTouchState();

    if (!ghostWasActive || this.deps.getSelectedTool() !== 'note') {
      return;
    }

    const placed = this.deps.attemptPlaceNoteAt(targetCol, targetRow);
    if (placed) {
      this.deps.onNotePlaced();
    } else {
      this.deps.onNoteNotPlaced();
    }
  }

  handleTouchCancel(): void {
    this.resetMobileTouchState({ clearOverlay: this.mobileGhostActive });
  }

  private getTouchGridPosition(touch: Touch): { colIndex: number; rowIndex: number } | null {
    if (!this.pitchCanvasElement) {
      return null;
    }

    const rect = this.pitchCanvasElement.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const scrollLeft = document.getElementById('canvas-container')?.scrollLeft ?? 0;
    const colIndex = GridCoordsService.getColumnIndex(x + scrollLeft);
    const rowIndex = GridCoordsService.getPitchRowIndex(y);

    return { colIndex, rowIndex };
  }

  private findTouchById(touchList: TouchList | null | undefined, identifier: number): Touch | null {
    if (!touchList) {
      return null;
    }
    for (let i = 0; i < touchList.length; i++) {
      const touch = touchList.item(i);
      if (touch && touch.identifier === identifier) {
        return touch;
      }
    }
    return null;
  }

  private renderMobileGhostPreview(): void {
    const pitchHoverCtx = this.deps.getPitchHoverCtx();
    if (!pitchHoverCtx || !this.mobileTouchState) {
      return;
    }

    pitchHoverCtx.clearRect(0, 0, getLogicalCanvasWidth(pitchHoverCtx.canvas), getLogicalCanvasHeight(pitchHoverCtx.canvas));
    this.deps.drawHoverHighlight(
      this.mobileTouchState.colIndex,
      this.mobileTouchState.rowIndex,
      this.deps.getNoteHoverColor(this.options.ghostAlpha)
    );
    this.deps.drawGhostNote(this.mobileTouchState.colIndex, this.mobileTouchState.rowIndex);
    this.deps.setGhostNotePosition(this.mobileTouchState.colIndex, this.mobileTouchState.rowIndex);
  }

  private activateMobileGhostPreview(): void {
    if (!this.mobileTouchState) {
      return;
    }

    if (!this.deps.isPositionWithinPitchGrid(this.mobileTouchState.colIndex, this.mobileTouchState.rowIndex)) {
      this.resetMobileTouchState({ clearOverlay: false });
      return;
    }

    this.mobileGhostActive = true;
    this.renderMobileGhostPreview();
  }

  private resetMobileTouchState({ clearOverlay = false }: { clearOverlay?: boolean } = {}): void {
    if (this.mobileLongPressTimer) {
      clearTimeout(this.mobileLongPressTimer);
      this.mobileLongPressTimer = null;
    }

    if (clearOverlay && this.mobileGhostActive) {
      this.deps.clearOverlay();
    }

    this.mobileTouchState = null;
    this.mobileGhostActive = false;
  }
}

