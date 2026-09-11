// js/components/canvas/drumGrid/drumGridInteractor.ts
import * as Tone from 'tone';
import store from '@state/initStore.ts';
import GridCoordsService from '@services/gridCoordsService.ts';
import { drawDrumShape } from './drumGridRenderer.ts';
import { getColumnX as getModulatedColumnX } from '@components/canvas/PitchGrid/renderers/rendererUtils.ts';
import { isPlayableColumn } from '@services/columnMapService.ts';
import DrumPlayheadRenderer from './drumPlayheadRenderer.ts';
import { getLogicalCanvasWidth, getLogicalCanvasHeight } from '@utils/canvasDimensions.ts';
import { getDrumRowHeightFromCellHeight, getDrumShapeBoxHeightFromCellWidth } from '@utils/drumGridSizing.ts';
import { getDrumGridCellsBetween, type DrumGridCell } from './drumGridDrag.ts';
import { invokeInitAudioHandler } from '@services/runtimeGlobals.ts';
import {
  getDrumSampleSet,
  listDrumMachines,
  type DrumVoiceCategory,
  type LocalDrumSampleEntry
} from '@mlt/audio-samples';
import {
  getCurrentDrumLayerSamples,
  getDrumLayerVolume,
  getDrumPlayers,
  initDrumPlayers,
  preloadDrumSamples,
  setDrumLayerVolume,
  setDrumLayerSamples,
  triggerDrum
} from '@services/transport/drumManager.ts';
import hiHatIconUrl from '../../../../public/assets/drums/hi-hat.svg?url';
import snareIconUrl from '../../../../public/assets/drums/snare.svg?url';
import bassDrumIconUrl from '../../../../public/assets/drums/bass-drum.svg?url';
import type { CanvasSpaceColumn } from '@mlt/types';

/**
 * COORDINATE SYSTEM NOTE:
 * All column indices in this file use CANVAS-SPACE coordinates (0 = first musical beat).
 * GridCoordsService.getColumnIndex() returns canvas-space values.
 */

type DrumTrack = 'H' | 'M' | 'L';
const DRUM_TRACKS: DrumTrack[] = ['H', 'M', 'L'];
const DRUM_TRACK_LABELS: Record<DrumTrack, string> = {
  H: 'Hi Hat',
  M: 'Snare',
  L: 'Bass Drum'
};
const DRUM_TRACK_ICON_PATHS: Record<DrumTrack, string> = {
  H: hiHatIconUrl,
  M: snareIconUrl,
  L: bassDrumIconUrl
};
const CANVAS_CONTAINER_ID = 'canvas-container';
const DRUM_GRID_WRAPPER_ID = 'drum-grid-wrapper';
const ERASER_BUTTON_ID = 'eraser-tool-button';
const DRUM_CANVAS_ID = 'drum-grid';
const DRUM_HOVER_CANVAS_ID = 'drum-hover-canvas';
const DRUM_LAYER_SAMPLE_MODAL_ID = 'drum-layer-sample-modal';
const DRUM_SAMPLE_ASSIGNMENT_HINT: Record<DrumTrack, string> = {
  H: 'High (H)',
  M: 'Mid (M)',
  L: 'Low (L)'
};
const DRUM_SAMPLE_PICKER_TRACK_ORDER: DrumTrack[] = ['L', 'M', 'H'];

type DrumSamplePickerCategory = 'low' | 'mid' | 'high';

const DRUM_SAMPLE_PICKER_CATEGORY_ORDER: DrumSamplePickerCategory[] = [
  'low',
  'mid',
  'high'
];

const DRUM_TRACK_TO_SAMPLE_CATEGORY: Record<DrumTrack, DrumSamplePickerCategory> = {
  H: 'high',
  M: 'mid',
  L: 'low'
};

type DrumSampleChoice = {
  id: string;
  machineId: string;
  machineLabel: string;
  label: string;
  suggestedLayer: DrumTrack;
  url: string;
  voiceCategory?: DrumVoiceCategory;
  voiceDescription?: string;
  pickerCategory: DrumSamplePickerCategory;
};

let drumHoverCtx: CanvasRenderingContext2D | null = null;
let isRightClickActive = false;
let rightClickActionTaken = false;
let isDrumPaintActive = false;
let drumPaintActionTaken = false;
let lastDrumPaintCell: DrumGridCell | null = null;
const drumPaintVisitedCells = new Set<string>();
const DRUM_TRACK_VOLUME_TRAVEL = 120;
const DRUM_TRACK_VOLUME_HOLD_DELAY = 200;
const DRUM_TRACK_VOLUME_DRAG_THRESHOLD = 4;
const drumTrackLastNonZeroVolumes: Record<DrumTrack, number> = { H: 1, M: 1, L: 1 };
let activeDrumTrackVolumeGesture: {
  track: DrumTrack;
  button: HTMLButtonElement;
  pointerId: number;
  startLevel: number;
  startX: number;
  startY: number;
  moved: boolean;
  sliderVisible: boolean;
} | null = null;
let drumTrackVolumePopup: HTMLDivElement | null = null;
let drumTrackVolumeHoldTimer: ReturnType<typeof setTimeout> | null = null;
let drumTrackVolumeListenersInitialized = false;
let activeDrumModalTrack: DrumTrack = 'M';
let pendingDrumLayerSamples: Record<DrumTrack, string> | null = null;
let activeSamplePreviewAudio: HTMLAudioElement | null = null;
let localDrumSampleChoicesPromise: Promise<void> | null = null;
let localDrumSampleChoicesLoaded = false;

function resolveSamplePickerCategory(
  suggestedLayer: DrumTrack,
  voiceCategory?: DrumVoiceCategory
): DrumSamplePickerCategory {
  if (voiceCategory === 'sfx' || voiceCategory === 'vocal' || voiceCategory === 'clap') {
    return 'high';
  }
  if (suggestedLayer === 'L') {return 'low';}
  if (suggestedLayer === 'M') {return 'mid';}
  return 'high';
}

const remoteDefaultSamples = getDrumSampleSet();

const remoteSampleChoices: DrumSampleChoice[] = [
  {
    id: 'remote-cr78-h',
    machineId: 'cr-78-remote',
    machineLabel: 'CR-78 (Remote)',
    label: 'Hi-Hat',
    suggestedLayer: 'H',
    url: remoteDefaultSamples.H,
    voiceCategory: 'hihat',
    voiceDescription: 'Hi-Hat',
    pickerCategory: resolveSamplePickerCategory('H', 'hihat')
  },
  {
    id: 'remote-cr78-m',
    machineId: 'cr-78-remote',
    machineLabel: 'CR-78 (Remote)',
    label: 'Snare',
    suggestedLayer: 'M',
    url: remoteDefaultSamples.M,
    voiceCategory: 'snare',
    voiceDescription: 'Snare Drum',
    pickerCategory: resolveSamplePickerCategory('M', 'snare')
  },
  {
    id: 'remote-cr78-l',
    machineId: 'cr-78-remote',
    machineLabel: 'CR-78 (Remote)',
    label: 'Kick',
    suggestedLayer: 'L',
    url: remoteDefaultSamples.L,
    voiceCategory: 'kick',
    voiceDescription: 'Bass Drum',
    pickerCategory: resolveSamplePickerCategory('L', 'kick')
  }
];

const drumMachineLabelById = new Map(listDrumMachines().map((machine) => [machine.id, machine.label]));

function getMachineLabel(machineId: string, fallback: string): string {
  return drumMachineLabelById.get(machineId) ?? fallback;
}

function compareDrumSampleChoices(a: DrumSampleChoice, b: DrumSampleChoice): number {
  const machineA = getMachineLabel(a.machineId, a.machineLabel);
  const machineB = getMachineLabel(b.machineId, b.machineLabel);
  if (machineA !== machineB) {
    return machineA.localeCompare(machineB);
  }
  return a.label.localeCompare(b.label);
}

const drumSampleChoiceByUrl = new Map<string, DrumSampleChoice>();
const drumSampleChoicesByCategory = new Map<
  DrumSamplePickerCategory,
  Map<string, DrumSampleChoice[]>
>();

for (const category of DRUM_SAMPLE_PICKER_CATEGORY_ORDER) {
  drumSampleChoicesByCategory.set(category, new Map());
}

function formatSampleLabelFromUrl(sampleUrl: string): string {
  const filename = sampleUrl.split('/').pop() ?? sampleUrl;
  let decoded = filename;
  try {
    decoded = decodeURIComponent(filename);
  } catch {
    // Keep the raw filename when URL decoding fails.
  }

  const withoutExtension = decoded.replace(/\.[a-z0-9]+$/i, '');
  const normalized = withoutExtension.replace(/[_-]+/g, ' ').trim();
  return normalized || 'Custom sample';
}

function getDrumTrackSampleLabel(
  track: DrumTrack,
  assignedSamples: Record<DrumTrack, string>
): { sampleLabel: string; machineLabel: string | null } {
  const sampleUrl = assignedSamples[track];
  if (!sampleUrl) {
    return { sampleLabel: 'Custom sample', machineLabel: null };
  }

  const knownSample = drumSampleChoiceByUrl.get(sampleUrl);
  if (!knownSample) {
    return {
      sampleLabel: formatSampleLabelFromUrl(sampleUrl),
      machineLabel: null
    };
  }

  return {
    sampleLabel: knownSample.label,
    machineLabel: getMachineLabel(knownSample.machineId, knownSample.machineLabel)
  };
}

function updateDrumTrackSettingButtons(
  assignedSamples: Record<DrumTrack, string> = getCurrentDrumLayerSamples()
): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>('.drum-track-settings-button[data-track]');
  buttons.forEach((button) => {
    const track = button.dataset.track as DrumTrack | undefined;
    if (!track || !DRUM_TRACKS.includes(track)) {return;}
    button.style.gridColumn = '3';

    const sampleLabelEl = button.querySelector<HTMLElement>('[data-role="track-sample-label"]');
    const { sampleLabel, machineLabel } = getDrumTrackSampleLabel(track, assignedSamples);
    const summary = machineLabel ? `${sampleLabel} - ${machineLabel}` : sampleLabel;
    sampleLabelEl?.remove();

    let trackIconEl = button.querySelector<HTMLImageElement>('.drum-track-settings-button__icon');
    if (!trackIconEl) {
      trackIconEl = document.createElement('img');
      trackIconEl.className = 'drum-track-settings-button__icon';
      trackIconEl.alt = '';
      trackIconEl.setAttribute('aria-hidden', 'true');
      button.prepend(trackIconEl);
    }
    trackIconEl.src = DRUM_TRACK_ICON_PATHS[track];
    button.querySelector<HTMLElement>('.drum-track-settings-button__track')?.remove();

    button.title = summary;
    button.setAttribute('aria-label', `${DRUM_TRACK_LABELS[track]} sample: ${summary}. Open sample browser.`);
  });
}

export async function initLocalDrumSampleChoices(): Promise<void> {
  if (localDrumSampleChoicesLoaded) {
    updateDrumTrackSettingButtons();
    return;
  }

  localDrumSampleChoicesPromise ??= (async () => {
    try {
      const mod = await import('@mlt/audio-samples/local-samples');
      const localChoices: DrumSampleChoice[] = mod.LOCAL_DRUM_SAMPLE_ENTRIES.map(
        (entry: LocalDrumSampleEntry) => {
          const isRolandTr909BtSound = entry.machineId === 'roland-tr-909'
            && /^Roland TR-909 BT/i.test(entry.label);
          return {
            id: entry.id,
            machineId: entry.machineId,
            machineLabel: entry.machineLabel,
            label: entry.label,
            suggestedLayer: entry.suggestedLayer as DrumTrack,
            url: entry.url,
            voiceCategory: entry.voiceMetadata?.category,
            voiceDescription: entry.voiceMetadata?.description,
            pickerCategory: isRolandTr909BtSound
              ? 'low'
              : resolveSamplePickerCategory(
                entry.suggestedLayer as DrumTrack,
                entry.voiceMetadata?.category
              )
          };
        }
      );
      const allChoices = [...remoteSampleChoices, ...localChoices].sort(compareDrumSampleChoices);
      for (const choice of allChoices) {
        if (!drumSampleChoiceByUrl.has(choice.url)) {
          drumSampleChoiceByUrl.set(choice.url, choice);
        }
        const categoryGroup = drumSampleChoicesByCategory.get(choice.pickerCategory);
        if (!categoryGroup) { continue; }
        const machineLabel = getMachineLabel(choice.machineId, choice.machineLabel);
        const existing = categoryGroup.get(machineLabel);
        if (existing) {
          existing.push(choice);
        } else {
          categoryGroup.set(machineLabel, [choice]);
        }
      }
      localDrumSampleChoicesLoaded = true;
      updateDrumTrackSettingButtons();
    } catch (error) {
      localDrumSampleChoicesPromise = null;
      console.error('[drumGridInteractor] Failed to load local drum samples', error);
    }
  })();

  await localDrumSampleChoicesPromise;
}

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
  const initPromise = invokeInitAudioHandler();
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
  getDrumRowHeightFromCellHeight(store.state.cellHeight);

const getDrumShapeBoxHeight = (): number =>
  getDrumShapeBoxHeightFromCellWidth(store.state.cellWidth);

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
  const rowHeight = getDrumRowHeight();
  const y = rowIndex * rowHeight;
  const cellWidth = getModulatedCellWidth(colIndex);
  drumHoverCtx.fillStyle = color;
  drumHoverCtx.fillRect(x, y, cellWidth, rowHeight);
}

function drawGhostNote(colIndex: number, rowIndex: number): void {
  if (!drumHoverCtx) {return;}
  const x = getColumnX(colIndex);
  const rowHeight = getDrumRowHeight();
  const shapeBoxHeight = getDrumShapeBoxHeight();
  const y = rowIndex * rowHeight + (rowHeight - shapeBoxHeight) / 2;
  const cellWidth = getModulatedCellWidth(colIndex);
  const drumTrack = DRUM_TRACKS[rowIndex as 0 | 1 | 2];
  if (!drumTrack) {return;}
  const animationScale = DrumPlayheadRenderer.getAnimationScale(colIndex, drumTrack);

  const selectedColor = (store.state.selectedTool as { color?: string } | undefined)?.color ?? '#212529';
  drumHoverCtx.globalAlpha = 0.4;
  drumHoverCtx.fillStyle = selectedColor;
  drawDrumShape(drumHoverCtx, rowIndex, x, y, cellWidth, shapeBoxHeight, animationScale);
  drumHoverCtx.globalAlpha = 1.0;
}

const getScrollLeft = (): number => {
  const container = document.getElementById(CANVAS_CONTAINER_ID);
  return container?.scrollLeft ?? 0;
};

function getDrumColumnCount(): number {
  return (store.state.musicalColumnWidths && store.state.musicalColumnWidths.length > 0)
    ? store.state.musicalColumnWidths.length
    : store.state.columnWidths.length;
}

function cycleDrumCellOnce(column: number, row: number): boolean {
  const drumTrack = DRUM_TRACKS[row as 0 | 1 | 2];
  if (!drumTrack || column < 0 || column >= getDrumColumnCount()) return false;
  if (!isPlayableColumn(column, store.state)) return false;

  const visitKey = `${drumTrack}:${column}`;
  if (drumPaintVisitedCells.has(visitKey)) return false;
  drumPaintVisitedCells.add(visitKey);

  const changed = store.toggleDrumNote({
    isDrum: true,
    drumTrack,
    startColumnIndex: column as CanvasSpaceColumn,
    endColumnIndex: column as CanvasSpaceColumn,
    color: '#000000',
    shape: 'circle'
  }, false);

  if (changed) {
    drumPaintActionTaken = true;
    DrumPlayheadRenderer.triggerNotePop(column, drumTrack);
    triggerDrumHit(drumTrack);
  }
  return changed;
}

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
  const maxColumn = getDrumColumnCount();
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

  if (isDrumPaintActive) {
    const currentCell = { column: colIndex, row: rowIndex };
    const previousCell = lastDrumPaintCell ?? currentCell;
    getDrumGridCellsBetween(previousCell, currentCell).forEach(cell => {
      cycleDrumCellOnce(cell.column, cell.row);
    });
    lastDrumPaintCell = currentCell;
    drawHoverHighlight(colIndex, rowIndex, 'rgba(74, 144, 226, 0.2)');
    drawGhostNote(colIndex, rowIndex);
  } else if (isRightClickActive) {
    if ((store as any).eraseDrumNoteAt?.(colIndex, drumTrack, false)) {
      rightClickActionTaken = true;
    }
    drawHoverHighlight(colIndex, rowIndex, 'rgba(220, 53, 69, 0.3)');
  } else if (store.state.selectedTool === 'eraser') {
    drawHoverHighlight(colIndex, rowIndex, 'rgba(220, 53, 69, 0.3)');
  } else if (store.state.selectedTool === 'note') {
    drawHoverHighlight(colIndex, rowIndex, 'rgba(74, 144, 226, 0.2)');
    drawGhostNote(colIndex, rowIndex);
  }
}

function handleMouseLeave(): void {
  clearHover();
  if (isDrumPaintActive) lastDrumPaintCell = null;
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
  const maxColumn = getDrumColumnCount();
  if (colIndex < 0 || colIndex >= maxColumn) {return;}

  // Check if column is playable (not a tonic column)
  if (!isPlayableColumn(colIndex, store.state)) {return;}

  const drumRow = GridCoordsService.getDrumRowIndex(y);
  if (drumRow < 0 || drumRow > 2) {return;}

  const drumTrack = DRUM_TRACKS[drumRow as 0 | 1 | 2];
  if (!drumTrack) {return;}

  if (event.button === 2 || (event.button === 0 && store.state.selectedTool === 'eraser')) {
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

  if (event.button === 0 && store.state.selectedTool === 'note') {
    isDrumPaintActive = true;
    drumPaintActionTaken = false;
    drumPaintVisitedCells.clear();
    lastDrumPaintCell = { column: colIndex, row: drumRow };
    cycleDrumCellOnce(colIndex, drumRow);
  }
}

function handleGlobalMouseUp(): void {
  if (isDrumPaintActive) {
    if (drumPaintActionTaken) store.recordState();
    isDrumPaintActive = false;
    drumPaintActionTaken = false;
    lastDrumPaintCell = null;
    drumPaintVisitedCells.clear();
  }

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

function isDrumLayerSampleModalOpen(): boolean {
  const modal = document.getElementById(DRUM_LAYER_SAMPLE_MODAL_ID);
  return Boolean(modal && !modal.hasAttribute('hidden'));
}

function closeDrumLayerSampleModal(): void {
  const modal = document.getElementById(DRUM_LAYER_SAMPLE_MODAL_ID) as HTMLElement | null;
  if (!modal) {return;}

  if (activeSamplePreviewAudio) {
    activeSamplePreviewAudio.pause();
    activeSamplePreviewAudio.currentTime = 0;
    activeSamplePreviewAudio = null;
  }

  pendingDrumLayerSamples = null;
  modal.setAttribute('hidden', '');
  document.body.classList.remove('drum-layer-modal-open');
}

function playDrumSamplePreview(choice: DrumSampleChoice): void {
  const play = () => {
    if (activeSamplePreviewAudio) {
      activeSamplePreviewAudio.pause();
      activeSamplePreviewAudio.currentTime = 0;
      activeSamplePreviewAudio = null;
    }

    const previewAudio = new Audio(choice.url);
    previewAudio.preload = 'auto';
    previewAudio.volume = 0.9;
    previewAudio.addEventListener('ended', () => {
      if (activeSamplePreviewAudio === previewAudio) {
        activeSamplePreviewAudio = null;
      }
    });
    activeSamplePreviewAudio = previewAudio;
    void previewAudio.play().catch(() => {});
  };

  const initPromise = invokeInitAudioHandler();
  if (initPromise && typeof (initPromise as Promise<void>).then === 'function') {
    void (initPromise as Promise<void>).then(play).catch(() => {});
    return;
  }

  play();
}

function setDrumLayerSampleModalStatus(modal: HTMLElement, message = ''): void {
  const statusEl = modal.querySelector('[data-role="status"]') as HTMLParagraphElement | null;
  if (statusEl) {
    statusEl.textContent = message;
  }
}

function updateModalTrackAssignments(modal: HTMLElement): void {
  if (!pendingDrumLayerSamples) {return;}

  for (const track of DRUM_TRACKS) {
    const assignmentEl = modal.querySelector<HTMLElement>(
      `[data-role="track-assignment"][data-track="${track}"]`
    );
    if (!assignmentEl) {continue;}

    const { sampleLabel, machineLabel } = getDrumTrackSampleLabel(track, pendingDrumLayerSamples);
    assignmentEl.textContent = machineLabel ? `${sampleLabel} - ${machineLabel}` : sampleLabel;
  }
}

function updateModalAssignButtons(modal: HTMLElement): void {
  if (!pendingDrumLayerSamples) {return;}
  const selectedSamples = pendingDrumLayerSamples;

  const buttons = modal.querySelectorAll<HTMLButtonElement>('button[data-role="assign-sample"]');
  buttons.forEach((button) => {
    const track = button.dataset.track as DrumTrack | undefined;
    const sampleUrl = button.dataset.url;
    if (!track || !sampleUrl) {return;}

    const isActive = selectedSamples[track] === sampleUrl;
    button.classList.toggle('is-active', isActive);
    button.closest('.drum-layer-sample-modal__sample-card')?.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function createTrackAssignmentCard(track: DrumTrack): HTMLElement {
  const assignmentCard = document.createElement('div');
  assignmentCard.className = 'drum-layer-sample-modal__assignment-card';
  assignmentCard.dataset.track = track;

  const assignmentHeader = document.createElement('div');
  assignmentHeader.className = 'drum-layer-sample-modal__assignment-header';

  const assignmentTrack = document.createElement('h4');
  assignmentTrack.className = 'drum-layer-sample-modal__assignment-track';
  assignmentTrack.textContent = DRUM_SAMPLE_ASSIGNMENT_HINT[track];

  const previewTrackButton = document.createElement('button');
  previewTrackButton.type = 'button';
  previewTrackButton.className = 'drum-layer-sample-modal__track-preview-button';
  previewTrackButton.dataset.role = 'preview-track';
  previewTrackButton.dataset.track = track;
  previewTrackButton.textContent = 'Play';

  assignmentHeader.appendChild(assignmentTrack);
  assignmentHeader.appendChild(previewTrackButton);

  const assignmentValue = document.createElement('p');
  assignmentValue.className = 'drum-layer-sample-modal__assignment-value';
  assignmentValue.dataset.role = 'track-assignment';
  assignmentValue.dataset.track = track;

  assignmentCard.appendChild(assignmentHeader);
  assignmentCard.appendChild(assignmentValue);
  return assignmentCard;
}

function renderSampleChoices(modal: HTMLElement): void {
  const sampleColumns = modal.querySelector<HTMLElement>('[data-role="sample-columns"]');
  if (!sampleColumns) {return;}

  sampleColumns.innerHTML = '';

  DRUM_SAMPLE_PICKER_TRACK_ORDER.forEach((track) => {
    const category = DRUM_TRACK_TO_SAMPLE_CATEGORY[track];
    const groups = drumSampleChoicesByCategory.get(category)
      ?? new Map<string, DrumSampleChoice[]>();
    const column = document.createElement('section');
    column.className = 'drum-layer-sample-modal__sample-column';
    column.dataset.track = track;
    column.appendChild(createTrackAssignmentCard(track));

    const sampleList = document.createElement('div');
    sampleList.className = 'drum-layer-sample-modal__sample-list';

    if (!groups.size) {
      const emptyState = document.createElement('p');
      emptyState.className = 'drum-layer-sample-modal__empty';
      emptyState.textContent = 'No samples in this range.';
      sampleList.appendChild(emptyState);
    }

    groups.forEach((choices, machineLabel) => {
      const machineGroup = document.createElement('section');
      machineGroup.className = 'drum-layer-sample-modal__machine-group';
      machineGroup.setAttribute('aria-label', machineLabel);

      const cards = document.createElement('div');
      cards.className = 'drum-layer-sample-modal__cards';

      choices.forEach((choice) => {
        const card = document.createElement('article');
        card.className = 'drum-layer-sample-modal__sample-card';

        const selectButton = document.createElement('button');
        selectButton.type = 'button';
        selectButton.className = 'drum-layer-sample-modal__sample-name';
        selectButton.dataset.role = 'assign-sample';
        selectButton.dataset.track = track;
        selectButton.dataset.url = choice.url;
        selectButton.setAttribute('aria-pressed', 'false');
        selectButton.title = `Choose ${choice.label} for ${DRUM_SAMPLE_ASSIGNMENT_HINT[track]}`;
        selectButton.textContent = choice.label;

        const previewButton = document.createElement('button');
        previewButton.type = 'button';
        previewButton.className = 'drum-layer-sample-modal__preview-button';
        previewButton.dataset.role = 'preview-sample';
        previewButton.dataset.url = choice.url;
        previewButton.setAttribute('aria-label', `Play ${choice.label}`);
        previewButton.textContent = 'Play';

        card.appendChild(selectButton);
        card.appendChild(previewButton);
        cards.appendChild(card);
      });

      machineGroup.appendChild(cards);
      sampleList.appendChild(machineGroup);
    });

    column.appendChild(sampleList);
    sampleColumns.appendChild(column);
  });

  updateModalTrackAssignments(modal);
  updateModalAssignButtons(modal);
}

function ensureDrumLayerSampleModal(): HTMLElement {
  let modal = document.getElementById(DRUM_LAYER_SAMPLE_MODAL_ID) as HTMLElement | null;
  if (modal) {
    return modal;
  }

  modal = document.createElement('div');
  modal.id = DRUM_LAYER_SAMPLE_MODAL_ID;
  modal.className = 'drum-layer-sample-modal';
  modal.setAttribute('hidden', '');

  const dialog = document.createElement('div');
  dialog.className = 'drum-layer-sample-modal__dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'drum-layer-sample-title');

  const header = document.createElement('div');
  header.className = 'drum-layer-sample-modal__header';

  const title = document.createElement('h3');
  title.id = 'drum-layer-sample-title';
  title.className = 'drum-layer-sample-modal__title';
  title.textContent = 'Choose Drum Sounds';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'drum-layer-sample-modal__close';
  closeButton.setAttribute('aria-label', 'Close drum sample modal');
  closeButton.textContent = 'X';
  closeButton.addEventListener('click', () => {
    closeDrumLayerSampleModal();
  });

  header.appendChild(title);
  header.appendChild(closeButton);

  const sampleColumns = document.createElement('div');
  sampleColumns.className = 'drum-layer-sample-modal__sample-columns';
  sampleColumns.dataset.role = 'sample-columns';

  const status = document.createElement('p');
  status.className = 'drum-layer-sample-modal__status';
  status.dataset.role = 'status';
  status.setAttribute('aria-live', 'polite');

  const actions = document.createElement('div');
  actions.className = 'drum-layer-sample-modal__actions';

  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.className = 'drum-layer-sample-modal__button drum-layer-sample-modal__button--secondary';
  cancelButton.textContent = 'Cancel';
  cancelButton.addEventListener('click', () => {
    closeDrumLayerSampleModal();
  });

  const applyButton = document.createElement('button');
  applyButton.type = 'button';
  applyButton.className = 'drum-layer-sample-modal__button drum-layer-sample-modal__button--primary';
  applyButton.textContent = 'Apply';
  applyButton.addEventListener('click', async () => {
    if (!pendingDrumLayerSamples) {
      return;
    }

    const selectedSamples: Record<DrumTrack, string> = { ...pendingDrumLayerSamples };

    applyButton.disabled = true;
    cancelButton.disabled = true;
    setDrumLayerSampleModalStatus(modal, 'Loading samples...');

    try {
      await setDrumLayerSamples(selectedSamples);
      updateDrumTrackSettingButtons(selectedSamples);
      setDrumLayerSampleModalStatus(modal, 'Samples updated.');
      triggerDrumHit(activeDrumModalTrack, 0.05);
      closeDrumLayerSampleModal();
    } catch (error) {
      setDrumLayerSampleModalStatus(modal, 'Failed to load one or more samples.');
      console.error('[DrumGridInteractor] Failed to update drum layer samples', error);
    } finally {
      applyButton.disabled = false;
      cancelButton.disabled = false;
    }
  });

  actions.appendChild(cancelButton);
  actions.appendChild(applyButton);

  dialog.appendChild(header);
  dialog.appendChild(sampleColumns);
  dialog.appendChild(status);
  dialog.appendChild(actions);
  modal.appendChild(dialog);

  sampleColumns.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest<HTMLButtonElement>('button[data-role="preview-track"]');
    const track = button?.dataset.track as DrumTrack | undefined;
    if (track) {
      triggerDrumHit(track, 0.05);
      return;
    }

    const sampleButton = target?.closest<HTMLButtonElement>('button[data-role]');
    if (!sampleButton) {return;}

    const sampleUrl = sampleButton.dataset.url;
    if (!sampleUrl) {return;}
    const choice = drumSampleChoiceByUrl.get(sampleUrl);
    if (!choice) {return;}

    if (sampleButton.dataset.role === 'preview-sample') {
      playDrumSamplePreview(choice);
      setDrumLayerSampleModalStatus(modal, `Previewing ${choice.label}.`);
      return;
    }

    if (sampleButton.dataset.role !== 'assign-sample' || !pendingDrumLayerSamples) {
      return;
    }

    const sampleTrack = sampleButton.dataset.track as DrumTrack | undefined;
    if (!sampleTrack) {return;}

    pendingDrumLayerSamples[sampleTrack] = sampleUrl;
    updateModalTrackAssignments(modal);
    updateModalAssignButtons(modal);
    playDrumSamplePreview(choice);
    setDrumLayerSampleModalStatus(
      modal,
      `${DRUM_SAMPLE_ASSIGNMENT_HINT[sampleTrack]} set to ${choice.label}.`
    );
  });

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeDrumLayerSampleModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isDrumLayerSampleModalOpen()) {
      closeDrumLayerSampleModal();
    }
  });

  document.body.appendChild(modal);
  return modal;
}

async function openDrumLayerSampleModal(trackToFocus: DrumTrack): Promise<void> {
  void preloadDrumSamples();
  await initLocalDrumSampleChoices();
  activeDrumModalTrack = trackToFocus;
  pendingDrumLayerSamples = getCurrentDrumLayerSamples();

  const modal = ensureDrumLayerSampleModal();
  renderSampleChoices(modal);
  setDrumLayerSampleModalStatus(modal, '');

  modal.removeAttribute('hidden');
  document.body.classList.add('drum-layer-modal-open');

  const activeTrackButton = modal.querySelector<HTMLButtonElement>(
    `button[data-role="preview-track"][data-track="${trackToFocus}"]`
  );
  activeTrackButton?.focus();
}

function syncDrumTrackVolumeButton(track: DrumTrack): void {
  const button = document.querySelector<HTMLButtonElement>(`.drum-track-volume-button[data-track="${track}"]`);
  if (!button) return;
  const level = getDrumLayerVolume(track);
  const percent = Math.round(level * 100);
  button.setAttribute('aria-valuenow', String(percent));
  button.setAttribute('aria-valuetext', `${percent} percent`);
  button.title = `${DRUM_TRACK_LABELS[track]} volume: ${percent}% — hold and drag horizontally`;
  button.querySelector('img')?.classList.toggle('volume-icon-muted', level === 0);
}

function setDrumTrackVolumeAndSync(track: DrumTrack, level: number): void {
  const next = Math.max(0, Math.min(1, Math.round(level * 100) / 100));
  setDrumLayerVolume(track, next);
  if (next > 0) drumTrackLastNonZeroVolumes[track] = next;
  syncDrumTrackVolumeButton(track);

  if (activeDrumTrackVolumeGesture?.track === track && drumTrackVolumePopup) {
    const percent = Math.round(next * 100);
    const label = drumTrackVolumePopup.querySelector<HTMLElement>('.level-label');
    const fill = drumTrackVolumePopup.querySelector<HTMLElement>('.fill');
    const thumb = drumTrackVolumePopup.querySelector<HTMLElement>('.thumb');
    if (label) label.textContent = `${percent}%`;
    if (fill) fill.style.width = `${percent}%`;
    if (thumb) thumb.style.left = `${percent}%`;
  }
}

function ensureDrumTrackVolumePopup(): HTMLDivElement {
  if (drumTrackVolumePopup?.isConnected) return drumTrackVolumePopup;
  const popup = document.createElement('div');
  popup.className = 'drum-track-volume-popup';
  popup.popover = 'manual';
  popup.setAttribute('aria-hidden', 'true');
  popup.innerHTML = `
    <span class="level-label">100%</span>
    <div class="track"><div class="fill"></div><div class="thumb"></div></div>
  `;
  document.body.appendChild(popup);
  drumTrackVolumePopup = popup;
  return popup;
}

function showDrumTrackVolumePopup(): void {
  if (!activeDrumTrackVolumeGesture || activeDrumTrackVolumeGesture.sliderVisible) return;
  activeDrumTrackVolumeGesture.sliderVisible = true;
  ensureDrumTrackVolumePopup().showPopover();
}

function finishDrumTrackVolumeGesture(cancel = false): void {
  const gesture = activeDrumTrackVolumeGesture;
  if (!gesture) return;
  if (drumTrackVolumeHoldTimer !== null) {
    clearTimeout(drumTrackVolumeHoldTimer);
    drumTrackVolumeHoldTimer = null;
  }

  if (cancel) {
    setDrumTrackVolumeAndSync(gesture.track, gesture.startLevel);
  } else if (!gesture.moved && !gesture.sliderVisible) {
    const current = getDrumLayerVolume(gesture.track);
    const restored = drumTrackLastNonZeroVolumes[gesture.track] || 1;
    setDrumTrackVolumeAndSync(gesture.track, current > 0 ? 0 : restored);
  }

  activeDrumTrackVolumeGesture = null;
  if (gesture.sliderVisible) drumTrackVolumePopup?.hidePopover();
  if (gesture.button.hasPointerCapture(gesture.pointerId)) {
    gesture.button.releasePointerCapture(gesture.pointerId);
  }
}

function handleDrumTrackVolumePointerMove(event: PointerEvent): void {
  const gesture = activeDrumTrackVolumeGesture;
  if (!gesture || gesture.pointerId !== event.pointerId) return;
  event.preventDefault();
  if (!gesture.moved) {
    gesture.moved = Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) >= DRUM_TRACK_VOLUME_DRAG_THRESHOLD;
    if (!gesture.moved) return;
    showDrumTrackVolumePopup();
  }
  setDrumTrackVolumeAndSync(
    gesture.track,
    gesture.startLevel + (event.clientX - gesture.startX) / DRUM_TRACK_VOLUME_TRAVEL
  );
}

function handleDrumTrackVolumePointerEnd(event: PointerEvent): void {
  if (activeDrumTrackVolumeGesture?.pointerId !== event.pointerId) return;
  finishDrumTrackVolumeGesture(event.type === 'pointercancel');
}

function startDrumTrackVolumeGesture(event: PointerEvent, track: DrumTrack): void {
  if (event.button !== 0 || activeDrumTrackVolumeGesture) return;
  event.preventDefault();
  const button = event.currentTarget as HTMLButtonElement;
  const startLevel = getDrumLayerVolume(track);
  button.focus({ preventScroll: true });
  button.setPointerCapture(event.pointerId);
  activeDrumTrackVolumeGesture = {
    track,
    button,
    pointerId: event.pointerId,
    startLevel,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
    sliderVisible: false
  };

  const popup = ensureDrumTrackVolumePopup();
  popup.style.left = `${Math.max(4, Math.min(
    window.innerWidth - DRUM_TRACK_VOLUME_TRAVEL - 44,
    event.clientX - startLevel * DRUM_TRACK_VOLUME_TRAVEL - 20
  ))}px`;
  popup.style.top = `${Math.max(4, Math.min(window.innerHeight - 51, event.clientY - 22))}px`;
  popup.style.color = 'var(--c-text)';
  setDrumTrackVolumeAndSync(track, startLevel);
  drumTrackVolumeHoldTimer = setTimeout(showDrumTrackVolumePopup, DRUM_TRACK_VOLUME_HOLD_DELAY);
}

function handleDrumTrackVolumeKeyDown(event: KeyboardEvent, track: DrumTrack): void {
  if (event.key === 'Escape' && activeDrumTrackVolumeGesture?.track === track) {
    event.preventDefault();
    finishDrumTrackVolumeGesture(true);
    return;
  }
  const current = getDrumLayerVolume(track);
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    setDrumTrackVolumeAndSync(track, current > 0 ? 0 : drumTrackLastNonZeroVolumes[track]);
    return;
  }
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) return;
  event.preventDefault();
  event.stopPropagation();
  const step = event.key.startsWith('Page') ? 0.1 : 0.01;
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1
    : current + (['ArrowUp', 'ArrowRight', 'PageUp'].includes(event.key) ? step : -step);
  setDrumTrackVolumeAndSync(track, next);
}

function createDrumTrackVolumeButton(track: DrumTrack, volumeIconSrc: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = 'drum-track-volume-button';
  button.type = 'button';
  button.dataset.track = track;
  button.setAttribute('role', 'slider');
  button.setAttribute('aria-label', `${DRUM_TRACK_LABELS[track]} volume`);
  button.setAttribute('aria-valuemin', '0');
  button.setAttribute('aria-valuemax', '100');
  button.setAttribute('aria-orientation', 'horizontal');
  button.style.gridColumn = '5';

  const icon = document.createElement('img');
  icon.src = volumeIconSrc;
  icon.alt = '';
  icon.setAttribute('aria-hidden', 'true');
  button.appendChild(icon);
  button.addEventListener('pointerdown', event => startDrumTrackVolumeGesture(event, track));
  button.addEventListener('lostpointercapture', event => {
    if (activeDrumTrackVolumeGesture?.pointerId === event.pointerId) finishDrumTrackVolumeGesture();
  });
  button.addEventListener('keydown', event => handleDrumTrackVolumeKeyDown(event, track));
  return button;
}

function initDrumTrackVolumeListeners(): void {
  if (drumTrackVolumeListenersInitialized) return;
  drumTrackVolumeListenersInitialized = true;
  window.addEventListener('pointermove', handleDrumTrackVolumePointerMove);
  window.addEventListener('pointerup', handleDrumTrackVolumePointerEnd);
  window.addEventListener('pointercancel', handleDrumTrackVolumePointerEnd);
  window.addEventListener('blur', () => finishDrumTrackVolumeGesture(true));
}

function createDrumTrackControls(): void {
  const drumWrapper = document.getElementById(DRUM_GRID_WRAPPER_ID);
  const leftCell = drumWrapper?.querySelector('.drum-grid-left-cell') as HTMLElement | null;

  if (!drumWrapper || !leftCell) {
    return;
  }

  // Build per-row sample and volume controls if missing.
  let leftContent = leftCell.querySelector('.drum-left-content') as HTMLElement | null;
  if (!leftContent) {
    leftContent = document.createElement('div');
    leftContent.className = 'drum-left-content';
    const leftContentEl = leftContent;

    // Reuse the already-resolved main volume icon URL to avoid relative-path breakage.
    const mainVolumeImg = document.querySelector<HTMLImageElement>('#volume-icon-button img');
    const volumeIconSrc = mainVolumeImg?.currentSrc || mainVolumeImg?.src || 'assets/icons/volume.svg';

    // Column 3: Centered row buttons; columns 2 and 4 share the remaining space.
    DRUM_TRACKS.forEach((track, index) => {
      const trackButton = document.createElement('button');
      trackButton.className = 'drum-track-settings-button';
      trackButton.type = 'button';
      trackButton.dataset.track = track;
      trackButton.style.gridColumn = '3';
      trackButton.style.gridRow = `${index + 1}`;

      const trackIcon = document.createElement('img');
      trackIcon.className = 'drum-track-settings-button__icon';
      trackIcon.src = DRUM_TRACK_ICON_PATHS[track];
      trackIcon.alt = '';
      trackIcon.setAttribute('aria-hidden', 'true');

      trackButton.appendChild(trackIcon);

      trackButton.addEventListener('click', (event) => {
        event.stopPropagation();
        void openDrumLayerSampleModal(track);
      });

      leftContentEl.appendChild(trackButton);

      const trackVolumeButton = createDrumTrackVolumeButton(track, volumeIconSrc);
      trackVolumeButton.style.gridRow = `${index + 1}`;
      leftContentEl.appendChild(trackVolumeButton);
    });

    leftCell.appendChild(leftContentEl);
    DRUM_TRACKS.forEach(syncDrumTrackVolumeButton);
    updateDrumTrackSettingButtons();
  }

  updateDrumTrackSettingButtons();
  initDrumTrackVolumeListeners();
}

export function initDrumGridInteraction(): void {
  const drumCanvas = document.getElementById(DRUM_CANVAS_ID) as HTMLCanvasElement | null;
  const hoverCanvas = document.getElementById(DRUM_HOVER_CANVAS_ID) as HTMLCanvasElement | null;

  if (!drumCanvas || !hoverCanvas) {
    return;
  }

  drumHoverCtx = hoverCanvas.getContext('2d');

  store.off('toolChanging', handleGlobalMouseUp);
  store.on('toolChanging', handleGlobalMouseUp);
  drumCanvas.addEventListener('mousedown', handleMouseDown);
  drumCanvas.addEventListener('mousemove', handleMouseMove);
  drumCanvas.addEventListener('mouseleave', handleMouseLeave);
  drumCanvas.addEventListener('contextmenu', event => event.preventDefault());

  window.addEventListener('mouseup', handleGlobalMouseUp);
  window.addEventListener('blur', handleGlobalMouseUp);

  createDrumTrackControls();
}
