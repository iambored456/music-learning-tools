// js/components/canvas/drumGrid/drumGridInteractor.ts
import * as Tone from 'tone';
import store from '@state/initStore.ts';
import GridCoordsService from '@services/gridCoordsService.ts';
import { drawDrumShape, type VolumeIconState } from './drumGridRenderer.ts';
import { getColumnX as getModulatedColumnX } from '@components/canvas/PitchGrid/renderers/rendererUtils.ts';
import { isPlayableColumn } from '@services/columnMapService.ts';
import DrumPlayheadRenderer from './drumPlayheadRenderer.ts';
import { getLogicalCanvasWidth, getLogicalCanvasHeight } from '@utils/canvasDimensions.ts';
import { getDrumRowHeightFromCellHeight, getDrumShapeBoxHeightFromCellWidth } from '@utils/drumGridSizing.ts';
import {
  getDrumVolumeNode,
  invokeInitAudioHandler
} from '@services/runtimeGlobals.ts';
import {
  getDrumSampleSet,
  listDrumMachines,
  type DrumVoiceCategory,
  type LocalDrumSampleEntry
} from '@mlt/audio-samples';
import {
  getCurrentDrumLayerSamples,
  getDrumPlayers,
  initDrumPlayers,
  preloadDrumSamples,
  setDrumLayerSamples,
  triggerDrum
} from '@services/transport/drumManager.ts';
import hiHatIconUrl from '../../../../public/assets/drums/hi-hat.svg?url';
import snareIconUrl from '../../../../public/assets/drums/snare.svg?url';
import bassDrumIconUrl from '../../../../public/assets/drums/bass-drum.svg?url';

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

type DrumSamplePickerCategory = 'low' | 'mid' | 'high' | 'sfx';

const DRUM_SAMPLE_PICKER_CATEGORY_ORDER: DrumSamplePickerCategory[] = [
  'low',
  'mid',
  'high',
  'sfx'
];

const DRUM_SAMPLE_PICKER_CATEGORY_CONFIG: Record<
  DrumSamplePickerCategory,
  { label: string; description: string }
> = {
  low: {
    label: 'Low',
    description: 'Kick and low-end percussion voices'
  },
  mid: {
    label: 'Mid',
    description: 'Snare and body percussion voices'
  },
  high: {
    label: 'High',
    description: 'Hi-hats and bright percussion voices'
  },
  sfx: {
    label: 'Sound Effects',
    description: 'Claps, vocals, and special effects'
  }
};

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
let drumVolume = 1.0;
let volumeSlider: HTMLInputElement | null = null;
const volumeIconState: VolumeIconState = 'normal';
let lastDrumPlaybackTime = 0;
const DRUM_PLAYBACK_THROTTLE_MS = 500;
let drumVolumeControlInitCount = 0;
let drumVolumeButtonClickCount = 0;
let drumVolumeDocumentClickCount = 0;
let drumVolumeSliderInputCount = 0;
let activeDrumModalTrack: DrumTrack = 'M';
let activeDrumSampleCategory: DrumSamplePickerCategory = DRUM_TRACK_TO_SAMPLE_CATEGORY.M;
let pendingDrumLayerSamples: Record<DrumTrack, string> | null = null;
let activeSamplePreviewAudio: HTMLAudioElement | null = null;
let localDrumSampleChoicesPromise: Promise<void> | null = null;
let localDrumSampleChoicesLoaded = false;

function logDrumVolumeDebug(_message: string, _payload?: Record<string, unknown>): void {}

function describeEventTarget(target: EventTarget | null): Record<string, unknown> {
  if (!(target instanceof Element)) {
    return { isElement: false };
  }

  return {
    isElement: true,
    tagName: target.tagName,
    id: target.id || null,
    className: target.getAttribute('class'),
    ariaLabel: target.getAttribute('aria-label'),
    insideVolumeButton: Boolean(target.closest('.drum-volume-button')),
    insideVolumeSliderWrap: Boolean(target.closest('.drum-volume-slider-wrap'))
  };
}

function resolveSamplePickerCategory(
  suggestedLayer: DrumTrack,
  voiceCategory?: DrumVoiceCategory
): DrumSamplePickerCategory {
  if (voiceCategory === 'sfx' || voiceCategory === 'vocal' || voiceCategory === 'clap') {
    return 'sfx';
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
        (entry: LocalDrumSampleEntry) => ({
          id: entry.id,
          machineId: entry.machineId,
          machineLabel: entry.machineLabel,
          label: entry.label,
          suggestedLayer: entry.suggestedLayer as DrumTrack,
          url: entry.url,
          voiceCategory: entry.voiceMetadata?.category,
          voiceDescription: entry.voiceMetadata?.description,
          pickerCategory: resolveSamplePickerCategory(
            entry.suggestedLayer as DrumTrack,
            entry.voiceMetadata?.category
          )
        })
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

function updateModalCategoryTabs(modal: HTMLElement): void {
  const tabs = modal.querySelectorAll<HTMLButtonElement>('button[data-role="category-tab"]');
  tabs.forEach((tab) => {
    const category = tab.dataset.category as DrumSamplePickerCategory | undefined;
    const isActive = category === activeDrumSampleCategory;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function updateModalTrackAssignments(modal: HTMLElement): void {
  if (!pendingDrumLayerSamples) {return;}

  for (const track of DRUM_TRACKS) {
    const assignmentEl = modal.querySelector<HTMLElement>(
      `[data-role="track-assignment"][data-track="${track}"]`
    );
    if (!assignmentEl) {continue;}

    const assignedUrl = pendingDrumLayerSamples[track];
    const assignedChoice = drumSampleChoiceByUrl.get(assignedUrl);
    if (!assignedChoice) {
      assignmentEl.textContent = 'Current custom sample';
      continue;
    }

    const machine = getMachineLabel(assignedChoice.machineId, assignedChoice.machineLabel);
    assignmentEl.textContent = `${assignedChoice.label} - ${machine}`;
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
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function getSampleCountForCategory(category: DrumSamplePickerCategory): number {
  const groups = drumSampleChoicesByCategory.get(category);
  if (!groups) {return 0;}
  let count = 0;
  groups.forEach((group) => {
    count += group.length;
  });
  return count;
}

function renderSampleChoicesForCategory(modal: HTMLElement): void {
  const titleEl = modal.querySelector<HTMLElement>('[data-role="category-title"]');
  const hintEl = modal.querySelector<HTMLElement>('[data-role="category-hint"]');
  const sampleList = modal.querySelector<HTMLElement>('[data-role="sample-list"]');
  if (!titleEl || !hintEl || !sampleList) {return;}

  const categoryConfig = DRUM_SAMPLE_PICKER_CATEGORY_CONFIG[activeDrumSampleCategory];
  const groups = drumSampleChoicesByCategory.get(activeDrumSampleCategory)
    ?? new Map<string, DrumSampleChoice[]>();
  const sampleCount = getSampleCountForCategory(activeDrumSampleCategory);

  titleEl.textContent = `${categoryConfig.label} Voices`;
  hintEl.textContent = `${categoryConfig.description} (${sampleCount} samples)`;

  sampleList.innerHTML = '';

  if (!groups.size) {
    const emptyState = document.createElement('p');
    emptyState.className = 'drum-layer-sample-modal__empty';
    emptyState.textContent = 'No samples in this category.';
    sampleList.appendChild(emptyState);
    return;
  }

  groups.forEach((choices, machineLabel) => {
    const machineGroup = document.createElement('section');
    machineGroup.className = 'drum-layer-sample-modal__machine-group';

    const machineTitle = document.createElement('h4');
    machineTitle.className = 'drum-layer-sample-modal__machine-title';
    machineTitle.textContent = machineLabel;
    machineGroup.appendChild(machineTitle);

    const cards = document.createElement('div');
    cards.className = 'drum-layer-sample-modal__cards';

    choices.forEach((choice) => {
      const card = document.createElement('article');
      card.className = 'drum-layer-sample-modal__sample-card';

      const name = document.createElement('h5');
      name.className = 'drum-layer-sample-modal__sample-name';
      name.textContent = choice.label;
      card.appendChild(name);

      const details = document.createElement('p');
      details.className = 'drum-layer-sample-modal__sample-details';
      const voiceDescription = choice.voiceDescription
        ? ` - ${choice.voiceDescription}`
        : '';
      details.textContent = `Suggested: ${DRUM_SAMPLE_ASSIGNMENT_HINT[choice.suggestedLayer]}${voiceDescription}`;
      card.appendChild(details);

      const controls = document.createElement('div');
      controls.className = 'drum-layer-sample-modal__sample-controls';

      const previewButton = document.createElement('button');
      previewButton.type = 'button';
      previewButton.className = 'drum-layer-sample-modal__preview-button';
      previewButton.dataset.role = 'preview-sample';
      previewButton.dataset.url = choice.url;
      previewButton.textContent = 'Play';
      controls.appendChild(previewButton);

      const assignButtons = document.createElement('div');
      assignButtons.className = 'drum-layer-sample-modal__assign-buttons';

      DRUM_TRACKS.forEach((track) => {
        const assignButton = document.createElement('button');
        assignButton.type = 'button';
        assignButton.className = 'drum-layer-sample-modal__assign-button';
        assignButton.dataset.role = 'assign-sample';
        assignButton.dataset.track = track;
        assignButton.dataset.url = choice.url;
        assignButton.textContent = track;
        assignButton.title = `Assign to ${DRUM_SAMPLE_ASSIGNMENT_HINT[track]}`;
        assignButtons.appendChild(assignButton);
      });

      controls.appendChild(assignButtons);
      card.appendChild(controls);
      cards.appendChild(card);
    });

    machineGroup.appendChild(cards);
    sampleList.appendChild(machineGroup);
  });

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
  title.textContent = 'Drum Layer Samples';

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

  const subtitle = document.createElement('p');
  subtitle.className = 'drum-layer-sample-modal__subtitle';
  subtitle.textContent = 'Browse grouped voices, preview sounds, and assign samples to H/M/L layers.';

  const layout = document.createElement('div');
  layout.className = 'drum-layer-sample-modal__layout';

  const categorySidebar = document.createElement('aside');
  categorySidebar.className = 'drum-layer-sample-modal__categories';
  categorySidebar.setAttribute('aria-label', 'Sample categories');

  DRUM_SAMPLE_PICKER_CATEGORY_ORDER.forEach((category) => {
    const categoryButton = document.createElement('button');
    categoryButton.type = 'button';
    categoryButton.className = 'drum-layer-sample-modal__category-button';
    categoryButton.dataset.role = 'category-tab';
    categoryButton.dataset.category = category;
    categoryButton.setAttribute('aria-pressed', 'false');

    const categoryLabel = document.createElement('span');
    categoryLabel.textContent = DRUM_SAMPLE_PICKER_CATEGORY_CONFIG[category].label;

    const categoryCount = document.createElement('span');
    categoryCount.className = 'drum-layer-sample-modal__category-count';
    categoryCount.textContent = String(getSampleCountForCategory(category));

    categoryButton.appendChild(categoryLabel);
    categoryButton.appendChild(categoryCount);
    categorySidebar.appendChild(categoryButton);
  });

  const content = document.createElement('section');
  content.className = 'drum-layer-sample-modal__content';

  const assignments = document.createElement('div');
  assignments.className = 'drum-layer-sample-modal__assignments';

  DRUM_TRACKS.forEach((track) => {
    const assignmentCard = document.createElement('div');
    assignmentCard.className = 'drum-layer-sample-modal__assignment-card';

    const assignmentHeader = document.createElement('div');
    assignmentHeader.className = 'drum-layer-sample-modal__assignment-header';

    const assignmentTrack = document.createElement('h4');
    assignmentTrack.className = 'drum-layer-sample-modal__assignment-track';
    assignmentTrack.textContent = DRUM_TRACK_LABELS[track];

    const previewTrackButton = document.createElement('button');
    previewTrackButton.type = 'button';
    previewTrackButton.className = 'drum-layer-sample-modal__track-preview-button';
    previewTrackButton.dataset.role = 'preview-track';
    previewTrackButton.dataset.track = track;
    previewTrackButton.textContent = 'Test';

    assignmentHeader.appendChild(assignmentTrack);
    assignmentHeader.appendChild(previewTrackButton);

    const assignmentValue = document.createElement('p');
    assignmentValue.className = 'drum-layer-sample-modal__assignment-value';
    assignmentValue.dataset.role = 'track-assignment';
    assignmentValue.dataset.track = track;
    assignmentCard.appendChild(assignmentHeader);
    assignmentCard.appendChild(assignmentValue);
    assignments.appendChild(assignmentCard);
  });

  const browserHeader = document.createElement('div');
  browserHeader.className = 'drum-layer-sample-modal__browser-header';

  const browserTitle = document.createElement('h4');
  browserTitle.className = 'drum-layer-sample-modal__browser-title';
  browserTitle.dataset.role = 'category-title';

  const browserHint = document.createElement('p');
  browserHint.className = 'drum-layer-sample-modal__browser-hint';
  browserHint.dataset.role = 'category-hint';

  browserHeader.appendChild(browserTitle);
  browserHeader.appendChild(browserHint);

  const sampleList = document.createElement('div');
  sampleList.className = 'drum-layer-sample-modal__sample-list';
  sampleList.dataset.role = 'sample-list';

  content.appendChild(assignments);
  content.appendChild(browserHeader);
  content.appendChild(sampleList);

  layout.appendChild(categorySidebar);
  layout.appendChild(content);

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
  dialog.appendChild(subtitle);
  dialog.appendChild(layout);
  dialog.appendChild(status);
  dialog.appendChild(actions);
  modal.appendChild(dialog);

  categorySidebar.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest<HTMLButtonElement>('button[data-role="category-tab"]');
    if (!button) {return;}
    const category = button.dataset.category as DrumSamplePickerCategory | undefined;
    if (!category || category === activeDrumSampleCategory) {return;}

    activeDrumSampleCategory = category;
    updateModalCategoryTabs(modal);
    renderSampleChoicesForCategory(modal);
    setDrumLayerSampleModalStatus(
      modal,
      `Viewing ${DRUM_SAMPLE_PICKER_CATEGORY_CONFIG[category].label} voices.`
    );
  });

  assignments.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest<HTMLButtonElement>('button[data-role="preview-track"]');
    const track = button?.dataset.track as DrumTrack | undefined;
    if (!track) {return;}
    triggerDrumHit(track, 0.05);
  });

  sampleList.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest<HTMLButtonElement>('button[data-role]');
    if (!button) {return;}

    const sampleUrl = button.dataset.url;
    if (!sampleUrl) {return;}
    const choice = drumSampleChoiceByUrl.get(sampleUrl);
    if (!choice) {return;}

    if (button.dataset.role === 'preview-sample') {
      playDrumSamplePreview(choice);
      setDrumLayerSampleModalStatus(modal, `Previewing ${choice.label}.`);
      return;
    }

    if (button.dataset.role !== 'assign-sample' || !pendingDrumLayerSamples) {
      return;
    }

    const track = button.dataset.track as DrumTrack | undefined;
    if (!track) {return;}

    pendingDrumLayerSamples[track] = sampleUrl;
    updateModalTrackAssignments(modal);
    updateModalAssignButtons(modal);
    playDrumSamplePreview(choice);
    setDrumLayerSampleModalStatus(modal, `${DRUM_TRACK_LABELS[track]} set to ${choice.label}.`);
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
  activeDrumSampleCategory = DRUM_TRACK_TO_SAMPLE_CATEGORY[trackToFocus];
  pendingDrumLayerSamples = getCurrentDrumLayerSamples();

  const modal = ensureDrumLayerSampleModal();
  updateModalCategoryTabs(modal);
  updateModalTrackAssignments(modal);
  renderSampleChoicesForCategory(modal);
  setDrumLayerSampleModalStatus(modal, '');

  modal.removeAttribute('hidden');
  document.body.classList.add('drum-layer-modal-open');

  const activeCategoryButton = modal.querySelector<HTMLButtonElement>(
    `button[data-role="category-tab"][data-category="${activeDrumSampleCategory}"]`
  );
  activeCategoryButton?.focus();
}

function createVolumeSlider(): void {
  drumVolumeControlInitCount += 1;
  const initCall = drumVolumeControlInitCount;
  const drumWrapper = document.getElementById(DRUM_GRID_WRAPPER_ID);
  const leftCell = drumWrapper?.querySelector('.drum-grid-left-cell') as HTMLElement | null;

  logDrumVolumeDebug('createVolumeSlider called', {
    initCall,
    hasDrumWrapper: Boolean(drumWrapper),
    hasLeftCell: Boolean(leftCell)
  });

  if (!drumWrapper || !leftCell) {
    logDrumVolumeDebug('createVolumeSlider exited early - required elements missing', { initCall });
    return;
  }

  // Build left-cell content (volume button + per-row sample buttons) if missing
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
    });

    leftCell.appendChild(leftContentEl);
    updateDrumTrackSettingButtons();
    logDrumVolumeDebug('created drum-left-content with volume and track buttons', { initCall });
  }

  // Volume button <-> inline slider swap
  const volumeButton = leftCell.querySelector('.drum-volume-button') as HTMLElement | null;
  updateDrumTrackSettingButtons();
  logDrumVolumeDebug('resolved drum volume button', {
    initCall,
    hasVolumeButton: Boolean(volumeButton)
  });

  let sliderWrap: HTMLElement | null = null;

  const showSlider = () => {
    logDrumVolumeDebug('showSlider requested', {
      initCall,
      hasVolumeButton: Boolean(volumeButton),
      sliderAlreadyPresent: Boolean(sliderWrap),
      currentDrumVolume: drumVolume
    });
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
      const previousDrumVolume = drumVolume;
      drumVolume = Number(target.value) / 100;

      const drumVolumeNode = getDrumVolumeNode();
      const volumeDb = drumVolume === 0 ? -60 : 20 * Math.log10(drumVolume);
      drumVolumeSliderInputCount += 1;
      if (drumVolumeNode?.volume) {
        drumVolumeNode.volume.value = volumeDb;

        const now = Date.now();
        if (now - lastDrumPlaybackTime >= DRUM_PLAYBACK_THROTTLE_MS) {
          triggerDrumHit('M', 0.1);
          lastDrumPlaybackTime = now;
        }
      }

      logDrumVolumeDebug('slider input', {
        initCall,
        inputCount: drumVolumeSliderInputCount,
        sliderValue: target.value,
        previousDrumVolume,
        nextDrumVolume: drumVolume,
        volumeDb,
        hasDrumVolumeNode: Boolean(drumVolumeNode?.volume),
        appliedDrumVolumeDb: drumVolumeNode?.volume?.value ?? null
      });
    });

    sliderWrap.appendChild(volumeSlider);
    volumeButton.replaceWith(sliderWrap);
    logDrumVolumeDebug('replaced volume button with inline slider', {
      initCall,
      sliderValue: volumeSlider.value
    });

    // Size the slider track to match the wrapper's actual height.
    // Retry for a few frames because layout can settle after the click task.
    const applySliderWidthFromHeight = (attempt: number) => {
      if (!sliderWrap || !volumeSlider) {
        return;
      }

      const wrapperOffsetHeight = sliderWrap.offsetHeight;
      const wrapperOffsetWidth = sliderWrap.offsetWidth;
      const leftCellOffsetHeight = leftCell.offsetHeight;
      const fallbackHeight = Math.max(wrapperOffsetHeight, leftCellOffsetHeight);

      if (fallbackHeight > 0) {
        volumeSlider.style.width = `${fallbackHeight}px`;
        if (wrapperOffsetWidth > 0) {
          volumeSlider.style.height = `${wrapperOffsetWidth}px`;
        }
        logDrumVolumeDebug('applied slider width from measured height', {
          initCall,
          attempt,
          wrapperOffsetHeight,
          wrapperOffsetWidth,
          leftCellOffsetHeight,
          sliderWidth: volumeSlider.style.width,
          sliderHeight: volumeSlider.style.height
        });
        return;
      }

      if (attempt < 3) {
        logDrumVolumeDebug('slider width measurement was zero, retrying', {
          initCall,
          attempt,
          wrapperOffsetHeight,
          wrapperOffsetWidth,
          leftCellOffsetHeight
        });
        requestAnimationFrame(() => applySliderWidthFromHeight(attempt + 1));
        return;
      }

      logDrumVolumeDebug('slider width measurement remained zero after retries', {
        initCall,
        attempt,
        wrapperOffsetHeight,
        wrapperOffsetWidth,
        leftCellOffsetHeight
      });
    };

    requestAnimationFrame(() => applySliderWidthFromHeight(1));
  };

  const hideSlider = () => {
    if (!sliderWrap || !volumeButton) {
      logDrumVolumeDebug('hideSlider skipped', {
        initCall,
        hasSliderWrap: Boolean(sliderWrap),
        hasVolumeButton: Boolean(volumeButton)
      });
      return;
    }
    sliderWrap.replaceWith(volumeButton);
    volumeSlider = null;
    sliderWrap = null;
    logDrumVolumeDebug('restored volume button and cleared slider', { initCall });
  };

  if (volumeButton) {
    volumeButton.addEventListener('click', (event) => {
      drumVolumeButtonClickCount += 1;
      logDrumVolumeDebug('volume icon button clicked', {
        initCall,
        clickCount: drumVolumeButtonClickCount,
        sliderVisibleBeforeClick: Boolean(sliderWrap),
        currentTarget: describeEventTarget(event.currentTarget),
        target: describeEventTarget(event.target)
      });
      event.stopPropagation();
      showSlider();
    });
    logDrumVolumeDebug('bound click listener to drum volume button', { initCall });
  }

  document.addEventListener('click', (event) => {
    drumVolumeDocumentClickCount += 1;
    const target = event.target as HTMLElement | null;
    if (sliderWrap) {
      logDrumVolumeDebug('document click while slider is visible', {
        initCall,
        documentClickCount: drumVolumeDocumentClickCount,
        target: describeEventTarget(event.target),
        clickedInsideSliderWrap: Boolean(target?.closest('.drum-volume-slider-wrap'))
      });
    }
    // Collapse slider back to button on outside click
    if (sliderWrap && !target?.closest('.drum-volume-slider-wrap')) {
      hideSlider();
    }
  });
  logDrumVolumeDebug('bound document click listener for slider dismissal', { initCall });
}

function getDrumVolume(): number {
  return drumVolume;
}

export function getVolumeIconState(): VolumeIconState {
  return volumeIconState;
}

export function initDrumGridInteraction(): void {
  const drumCanvas = document.getElementById(DRUM_CANVAS_ID) as HTMLCanvasElement | null;
  const hoverCanvas = document.getElementById(DRUM_HOVER_CANVAS_ID) as HTMLCanvasElement | null;

  logDrumVolumeDebug('initDrumGridInteraction invoked', {
    hasDrumCanvas: Boolean(drumCanvas),
    hasHoverCanvas: Boolean(hoverCanvas)
  });

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
