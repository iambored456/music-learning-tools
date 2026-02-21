// js/components/canvas/drumGrid/drumGridInteractor.ts
import * as Tone from 'tone';
import store from '@state/initStore.ts';
import GridCoordsService from '@services/gridCoordsService.ts';
import { drawDrumShape, type VolumeIconState } from './drumGridRenderer.ts';
import { getColumnX as getModulatedColumnX } from '@components/canvas/PitchGrid/renderers/rendererUtils.ts';
import { isPlayableColumn } from '@services/columnMapService.ts';
import DrumPlayheadRenderer from './drumPlayheadRenderer.js';
import { getLogicalCanvasWidth, getLogicalCanvasHeight } from '@utils/canvasDimensions.ts';
import { getDrumPlayers, initDrumPlayers, triggerDrum } from '@services/transport/drumManager.ts';

/**
 * COORDINATE SYSTEM NOTE:
 * All column indices in this file use CANVAS-SPACE coordinates (0 = first musical beat).
 * GridCoordsService.getColumnIndex() returns canvas-space values.
 */

type DrumTrack = 'H' | 'M' | 'L';
const DRUM_TRACKS: DrumTrack[] = ['H', 'M', 'L'];
const CANVAS_CONTAINER_ID = 'canvas-container';
const DRUM_GRID_WRAPPER_ID = 'drum-grid-wrapper';
const ERASER_BUTTON_ID = 'eraser-tool-button';
const DRUM_CANVAS_ID = 'drum-grid';
const DRUM_HOVER_CANVAS_ID = 'drum-hover-canvas';

let drumHoverCtx: CanvasRenderingContext2D | null = null;
let isRightClickActive = false;
let rightClickActionTaken = false;
let drumVolume = 1.0;
let volumeSlider: HTMLInputElement | null = null;
const volumeIconState: VolumeIconState = 'normal';
let lastDrumPlaybackTime = 0;
const DRUM_PLAYBACK_THROTTLE_MS = 500;

const ensureDrumPlayersReady = (): boolean => {
  if (getDrumPlayers()) {return true;}
  initDrumPlayers();
  return Boolean(getDrumPlayers());
};

const triggerDrumHit = (drumTrack: DrumTrack, timeOffsetSeconds = 0): void => {
  const play = () => {
    if (!ensureDrumPlayersReady()) {return;}
    triggerDrum(drumTrack, Tone.now() + timeOffsetSeconds);
  };
  const initPromise = (window as any).initAudio?.();
  if (initPromise && typeof (initPromise as Promise<void>).then === 'function') {
    void (initPromise as Promise<void>).then(play).catch(() => {});
    return;
  }
  play();
};

const getColumnX = (index: number): number => {
  // CANVAS-SPACE FIX: Always use rendererUtils.getColumnX() with proper options
  // Ensure musicalColumnWidths is available for both modulated and unmodulated paths
  // Check for non-empty array (empty array is truthy but useless)
  const musicalColumnWidths = (store.state.musicalColumnWidths && store.state.musicalColumnWidths.length > 0)
    ? store.state.musicalColumnWidths
    : store.state.columnWidths;
  const options = {
    tempoModulationMarkers: store.state.tempoModulationMarkers || [],
    columnWidths: store.state.columnWidths,
    musicalColumnWidths,
    cellWidth: store.state.cellWidth,
    cellHeight: store.state.cellHeight,
    baseMicrobeatPx: (store.state as Partial<{ baseMicrobeatPx: number }>).baseMicrobeatPx ||
      store.state.cellWidth ||
      40
  };
  return getModulatedColumnX(index, options);
};

const getModulatedCellWidth = (colIndex: number): number => {
  const hasModulation = store.state.tempoModulationMarkers && store.state.tempoModulationMarkers.length > 0;
  if (hasModulation) {
    const currentX = getColumnX(colIndex);
    const nextX = getColumnX(colIndex + 1);
    return nextX - currentX;
  }
  // CANVAS-SPACE FIX: colIndex is canvas-space, so use musicalColumnWidths (not columnWidths)
  // Check for non-empty array (empty array is truthy but useless)
  const musicalColumnWidths = (store.state.musicalColumnWidths && store.state.musicalColumnWidths.length > 0)
    ? store.state.musicalColumnWidths
    : store.state.columnWidths;
  const widthMultiplier = musicalColumnWidths[colIndex] ?? 1;
  return widthMultiplier * store.state.cellWidth;
};

const getDrumRowHeight = (): number =>
  Math.max(1, Math.round(store.state.cellWidth));

const clearHover = (): void => {
  if (drumHoverCtx) {
    drumHoverCtx.clearRect(
      0,
      0,
      getLogicalCanvasWidth(drumHoverCtx.canvas),
      getLogicalCanvasHeight(drumHoverCtx.canvas)
    );
  }
};

function drawHoverHighlight(colIndex: number, rowIndex: number, color: string): void {
  if (!drumHoverCtx) {return;}
  const x = getColumnX(colIndex);
  const y = rowIndex * getDrumRowHeight();
  const cellWidth = getModulatedCellWidth(colIndex);
  drumHoverCtx.fillStyle = color;
  drumHoverCtx.fillRect(x, y, cellWidth, getDrumRowHeight());
}

function drawGhostNote(colIndex: number, rowIndex: number): void {
  if (!drumHoverCtx) {return;}
  const x = getColumnX(colIndex);
  const y = rowIndex * getDrumRowHeight();
  const cellWidth = getModulatedCellWidth(colIndex);
  const drumTrack = DRUM_TRACKS[rowIndex as 0 | 1 | 2];
  if (!drumTrack) {return;}
  const animationScale = DrumPlayheadRenderer.getAnimationScale(colIndex, drumTrack);

  const selectedColor = (store.state.selectedTool as { color?: string } | undefined)?.color ?? '#212529';
  drumHoverCtx.globalAlpha = 0.4;
  drumHoverCtx.fillStyle = selectedColor;
  drawDrumShape(drumHoverCtx, rowIndex, x, y, cellWidth, getDrumRowHeight(), animationScale);
  drumHoverCtx.globalAlpha = 1.0;
}

const getScrollLeft = (): number => {
  const container = document.getElementById(CANVAS_CONTAINER_ID);
  return container?.scrollLeft ?? 0;
};

function handleMouseMove(event: MouseEvent): void {
  const target = event.currentTarget as HTMLElement | null;
  if (!target) {return;}

  const rect = target.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  // CANVAS-SPACE FIX: Volume icon is in the legend area (.drum-grid-left-cell),
  // not on the musical canvas. Canvas x=0 is the first musical beat.
  // Remove volume icon checks from canvas mouse handlers.

  const colIndex = GridCoordsService.getColumnIndex(x + getScrollLeft());
  const rowIndex = GridCoordsService.getDrumRowIndex(y);

  // CANVAS-SPACE FIX: Use canvas-space boundary checks (0 = first musical beat)
  // Canvas-space columns already exclude legends; use musicalColumnWidths if populated
  const maxColumn = (store.state.musicalColumnWidths && store.state.musicalColumnWidths.length > 0)
    ? store.state.musicalColumnWidths.length
    : store.state.columnWidths.length;
  if (
    !drumHoverCtx ||
    colIndex < 0 ||
    colIndex >= maxColumn ||
    rowIndex < 0 ||
    rowIndex > 2
  ) {
    handleMouseLeave();
    return;
  }

  clearHover();
  const drumTrack = DRUM_TRACKS[rowIndex as 0 | 1 | 2];
  if (!drumTrack) {return;}

  if (isRightClickActive) {
    if ((store as any).eraseDrumNoteAt?.(colIndex, drumTrack, false)) {
      rightClickActionTaken = true;
    }
    drawHoverHighlight(colIndex, rowIndex, 'rgba(220, 53, 69, 0.3)');
  } else {
    drawHoverHighlight(colIndex, rowIndex, 'rgba(74, 144, 226, 0.2)');
    drawGhostNote(colIndex, rowIndex);
  }
}

function handleMouseLeave(): void {
  clearHover();
  // Volume icon state is handled by the legend button element, not the canvas
}

function handleMouseDown(event: MouseEvent): void {
  event.preventDefault();
  const target = event.currentTarget as HTMLElement | null;
  if (!target) {return;}

  const rect = target.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  // CANVAS-SPACE FIX: Volume icon is in the legend area (.drum-grid-left-cell),
  // not on the musical canvas. Canvas x=0 is the first musical beat.
  // Volume icon clicks are handled by the legend button element, not here.

  const colIndex = GridCoordsService.getColumnIndex(x + getScrollLeft());
  // CANVAS-SPACE FIX: Use canvas-space boundary checks (0 = first musical beat)
  const maxColumn = (store.state.musicalColumnWidths && store.state.musicalColumnWidths.length > 0)
    ? store.state.musicalColumnWidths.length
    : store.state.columnWidths.length;
  if (colIndex < 0 || colIndex >= maxColumn) {return;}

  // Check if column is playable (not a tonic column)
  if (!isPlayableColumn(colIndex, store.state)) {return;}

  const drumRow = GridCoordsService.getDrumRowIndex(y);
  if (drumRow < 0 || drumRow > 2) {return;}

  const drumTrack = DRUM_TRACKS[drumRow as 0 | 1 | 2];
  if (!drumTrack) {return;}

  if (event.button === 2) {
    isRightClickActive = true;
    rightClickActionTaken = false;
    document.getElementById(ERASER_BUTTON_ID)?.classList.add('erasing-active');

    if ((store as any).eraseDrumNoteAt?.(colIndex, drumTrack, false)) {
      rightClickActionTaken = true;
    }
    clearHover();
    drawHoverHighlight(colIndex, drumRow, 'rgba(220, 53, 69, 0.3)');
    return;
  }

  if (event.button === 0) {
    const color = (store.state.selectedTool as { color?: string } | undefined)?.color ?? '#000000';
    const drumHit = {
      isDrum: true,
      drumTrack,
      startColumnIndex: colIndex,
      endColumnIndex: colIndex,
      color,
      shape: drumTrack === 'H' ? 'triangle' : drumTrack === 'M' ? 'square' : 'pentagon'
    };
    (store as any).toggleDrumNote?.(drumHit);

    DrumPlayheadRenderer.triggerNotePop(colIndex, drumTrack);
    triggerDrumHit(drumTrack);
  }
}

function handleGlobalMouseUp(): void {
  if (isRightClickActive) {
    if (rightClickActionTaken) {
      store.recordState?.();
    }
    isRightClickActive = false;
    rightClickActionTaken = false;
    document.getElementById(ERASER_BUTTON_ID)?.classList.remove('erasing-active');
  }

  // Volume icon state is handled by the legend button element, not the canvas

  handleMouseLeave();
}

function createVolumeSlider(): void {
  const drumWrapper = document.getElementById(DRUM_GRID_WRAPPER_ID);
  const leftCell = drumWrapper?.querySelector('.drum-grid-left-cell') as HTMLElement | null;

  if (!drumWrapper || !leftCell) {return;}

  // Build left-cell content (volume button + gear icons + row labels) if missing
  let leftContent = leftCell.querySelector('.drum-left-content') as HTMLElement | null;
  if (!leftContent) {
    leftContent = document.createElement('div');
    leftContent.className = 'drum-left-content';
    const leftContentEl = leftContent;

    // Column 1: Volume button spanning all 3 rows
    const volumeButton = document.createElement('button');
    volumeButton.className = 'drum-volume-button';
    volumeButton.type = 'button';
    volumeButton.setAttribute('aria-label', 'Drum volume');
    const volumeIconSpan = document.createElement('span');
    volumeIconSpan.className = 'drum-volume-icon';
    volumeIconSpan.setAttribute('aria-hidden', 'true');

    // Reuse the already-resolved main volume icon URL to avoid relative-path breakage.
    const mainVolumeImg = document.querySelector<HTMLImageElement>('#volume-icon-button img');
    const volumeIconSrc = mainVolumeImg?.currentSrc || mainVolumeImg?.src || 'assets/icons/volume.svg';

    const volumeIconImg = document.createElement('img');
    volumeIconImg.src = volumeIconSrc;
    volumeIconImg.alt = '';

    volumeIconSpan.appendChild(volumeIconImg);
    volumeButton.appendChild(volumeIconSpan);
    volumeButton.style.gridRow = '1 / span 3';
    volumeButton.style.gridColumn = '1';
    leftContentEl.appendChild(volumeButton);

    // Column 2: Gear icon buttons (one per row) with popup menus
    const gearSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09A1.65 1.65 0 0 0 19.4 15z"/></svg>`;

    (['H', 'M', 'L'] as const).forEach((track, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'drum-gear-wrapper';
      wrapper.style.gridColumn = '2';
      wrapper.style.gridRow = `${index + 1}`;

      const gearBtn = document.createElement('button');
      gearBtn.className = 'drum-gear-button';
      gearBtn.type = 'button';
      gearBtn.setAttribute('aria-label', `${track} drum settings`);
      gearBtn.innerHTML = gearSvg;

      const popup = document.createElement('div');
      popup.className = 'drum-gear-popup';
      popup.dataset.drumTrack = track;

      gearBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        const isVisible = popup.classList.contains('visible');
        // Close all gear popups first
        leftContentEl.querySelectorAll('.drum-gear-popup').forEach(p => p.classList.remove('visible'));
        if (!isVisible) {
          popup.classList.add('visible');
        }
      });

      wrapper.appendChild(gearBtn);
      wrapper.appendChild(popup);
      leftContentEl.appendChild(wrapper);
    });

    // Column 3: H/M/L labels
    ['H', 'M', 'L'].forEach((label, index) => {
      const item = document.createElement('span');
      item.className = 'drum-track-label';
      item.textContent = label;
      item.style.gridColumn = '3';
      item.style.gridRow = `${index + 1}`;
      leftContentEl.appendChild(item);
    });

    leftCell.appendChild(leftContentEl);
  }

  // Volume button ↔ inline slider swap
  const volumeButton = leftCell.querySelector('.drum-volume-button') as HTMLElement | null;

  let sliderWrap: HTMLElement | null = null;

  const showSlider = () => {
    if (!volumeButton) {return;}

    sliderWrap = document.createElement('div');
    sliderWrap.className = 'drum-volume-slider-wrap';
    sliderWrap.style.gridRow = '1 / span 3';
    sliderWrap.style.gridColumn = '1';

    volumeSlider = document.createElement('input');
    volumeSlider.type = 'range';
    volumeSlider.min = '0';
    volumeSlider.max = '100';
    volumeSlider.value = String(Math.round(drumVolume * 100));
    volumeSlider.className = 'drum-volume-slider-inline';

    volumeSlider.addEventListener('input', (event) => {
      const target = event.currentTarget as HTMLInputElement;
      drumVolume = Number(target.value) / 100;

      const drumVolumeNode = (window as any).drumVolumeNode;
      if (drumVolumeNode?.volume) {
        const volumeDb = drumVolume === 0 ? -60 : 20 * Math.log10(drumVolume);
        drumVolumeNode.volume.value = volumeDb;

        const now = Date.now();
        if (now - lastDrumPlaybackTime >= DRUM_PLAYBACK_THROTTLE_MS) {
          triggerDrumHit('M', 0.1);
          lastDrumPlaybackTime = now;
        }
      }
    });

    sliderWrap.appendChild(volumeSlider);
    volumeButton.replaceWith(sliderWrap);

    // Size the slider track to match the wrapper's actual height
    requestAnimationFrame(() => {
      if (sliderWrap && volumeSlider) {
        volumeSlider.style.width = `${sliderWrap.offsetHeight}px`;
      }
    });
  };

  const hideSlider = () => {
    if (!sliderWrap || !volumeButton) {return;}
    sliderWrap.replaceWith(volumeButton);
    volumeSlider = null;
    sliderWrap = null;
  };

  if (volumeButton) {
    volumeButton.addEventListener('click', (event) => {
      event.stopPropagation();
      showSlider();
    });
  }

  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    // Collapse slider back to button on outside click
    if (sliderWrap && !target?.closest('.drum-volume-slider-wrap')) {
      hideSlider();
    }
    // Close gear popups on outside click
    const clickedGearButton = target?.closest('.drum-gear-button');
    const clickedGearPopup = target?.closest('.drum-gear-popup');
    if (!clickedGearButton && !clickedGearPopup) {
      leftCell?.querySelectorAll('.drum-gear-popup').forEach(p => p.classList.remove('visible'));
    }
  });
}

export function getDrumVolume(): number {
  return drumVolume;
}

export function getVolumeIconState(): VolumeIconState {
  return volumeIconState;
}

(window as any).getDrumVolume = getDrumVolume;

export function initDrumGridInteraction(): void {
  const drumCanvas = document.getElementById(DRUM_CANVAS_ID) as HTMLCanvasElement | null;
  const hoverCanvas = document.getElementById(DRUM_HOVER_CANVAS_ID) as HTMLCanvasElement | null;

  if (!drumCanvas || !hoverCanvas) {
    return;
  }

  drumHoverCtx = hoverCanvas.getContext('2d');

  drumCanvas.addEventListener('mousedown', handleMouseDown);
  drumCanvas.addEventListener('mousemove', handleMouseMove);
  drumCanvas.addEventListener('mouseleave', handleMouseLeave);
  drumCanvas.addEventListener('contextmenu', event => event.preventDefault());

  window.addEventListener('mouseup', handleGlobalMouseUp);

  createVolumeSlider();
}
