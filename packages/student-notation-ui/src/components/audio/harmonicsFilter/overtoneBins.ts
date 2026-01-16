/**
 * Overtone Bins
 *
 * Main UI component for overtone coefficient editing.
 * Provides slider controls for 12 overtone bins with phase buttons.
 *
 * Sub-modules:
 * - filterCalculations.ts: Pure math for filter curves
 *
 * @see index.ts for barrel exports
 */
import * as Tone from 'tone';
import store from '@state/initStore.ts';
import { HARMONIC_BINS } from '@/core/constants.ts';
import SynthEngine from '@services/initAudio.ts';
import { hexToRgba, shadeHexColor } from '@utils/colorUtils.ts';
import logger from '@utils/logger.ts';
import phaseIcon0 from '../../../../public/assets/tabicons/phaseButton_0.svg?raw';
import phaseIcon90 from '../../../../public/assets/tabicons/phaseButton_90.svg?raw';
import phaseIcon180 from '../../../../public/assets/tabicons/phaseButton_180.svg?raw';
import phaseIcon270 from '../../../../public/assets/tabicons/phaseButton_270.svg?raw';

// Import from extracted filter calculations module
import {
  type FilterSettings,
  getFilterAmplitudeAt,
  applyFilterMix,
  applyDiscreteFiltering
} from './filterCalculations.ts';

// Re-export filter functions for external consumers
export { getFilteredCoefficients, getFilterDataForSynth } from './filterCalculations.ts';

logger.moduleLoaded('OvertoneBins with Columnar Structure');

type DebugLevel = 'log' | 'info' | 'warn' | 'error';

interface OvertoneBinsDebugMessage {
  level: DebugLevel;
  args: unknown[];
  timestamp: number;
}

type PhaseState = 0 | 90 | 180 | 270;

interface BinColumnRefs {
  column: HTMLDivElement;
  label: HTMLDivElement;
  sliderTrack: HTMLDivElement;
  sliderFill: HTMLDivElement;
  phaseBtn: HTMLButtonElement;
}

const overtoneBinsDebugMessages: OvertoneBinsDebugMessage[] = [];

function recordOvertoneBinsDebug(level: DebugLevel, ...args: unknown[]) {
  overtoneBinsDebugMessages.push({ level, args, timestamp: Date.now() });
}

const phaseIconPaths: Record<PhaseState, string> = {
  0: phaseIcon0,
  90: phaseIcon90,
  180: phaseIcon180,
  270: phaseIcon270
};


const BINS = HARMONIC_BINS;
let overlayCanvas: HTMLCanvasElement | null = null;
let overlayCtx: CanvasRenderingContext2D | null = null;
let coeffs = new Float32Array(BINS).fill(0);
let currentColor: string | null = null;
let phases = new Float32Array(BINS).fill(0);
const binColumns: BinColumnRefs[] = [];
const phaseControls: Array<{ phaseBtn: HTMLButtonElement }> = [];
let isAuditioning = false;
let overtoneBinsGrid: HTMLDivElement | null = null;
const zeroUpdateTimeouts: Array<number | null> = new Array(BINS).fill(null);
let isDraggingBin = false; // Track if user is actively dragging a bin

// Store discrete filter values for each bin
const binFilterValues = new Float32Array(BINS).fill(1);

// Store filtered coefficients (separate from original coefficients)
// This is mutated as the user drags bins or tweaks the filter controls.
let _filteredCoeffs: Float32Array<ArrayBufferLike> = new Float32Array(BINS).fill(0);

function drawFilterOverlay() {
  if (!currentColor) {
    return;
  }
  // Re-find canvas elements if they're missing (can happen after DOM updates during voice switching)
  if (!overlayCanvas || !overlayCtx || !overtoneBinsGrid) {
    overlayCanvas = document.getElementById('filter-overlay-canvas') as HTMLCanvasElement | null;
    overtoneBinsGrid = document.querySelector<HTMLDivElement>('.overtone-bins-grid');
    if (overlayCanvas) {
      overlayCtx = overlayCanvas.getContext('2d');
    }
  }

  if (!overlayCanvas || !overlayCtx || !overtoneBinsGrid) {

    return;
  }

  const { width, height } = overlayCanvas;

  overlayCtx.clearRect(0, 0, width, height);

  const usableHeight = height;
  const maxBarHeight = usableHeight * 0.95;
  const barBaseY = height;

  const filterSettings = store.state.timbres[currentColor]?.filter as FilterSettings | undefined;

  // Fix: Default enabled to true if undefined (handles legacy state or missing property)
  const isFilterEnabled = filterSettings && (filterSettings.enabled !== false);

  if (filterSettings && isFilterEnabled) {
    const mixAmount = filterSettings.mix || 0;


    // If mix is 0, don't draw overlay and reset filter values to no filtering
    if (mixAmount === 0) {
      binFilterValues.fill(1);
      return;
    }

    // Calculate discrete filter values for each of the 12 bins
    const binAmplitudes = [];
    for (let i = 0; i < BINS; i++) {
      const norm_pos = (i + 0.5) / BINS; // Center of each bin
      const rawFilterAmp = getFilterAmplitudeAt(norm_pos, filterSettings);
      binFilterValues[i] = applyFilterMix(rawFilterAmp, mixAmount);
      binAmplitudes.push({
        bin: i + 1,
        rawFilterAmp: rawFilterAmp.toFixed(3),
        afterMix: (binFilterValues[i] ?? 0).toFixed(3)
      });
    }


    // Draw continuous curve showing the RAW filter shape (not mixed)
    overlayCtx.beginPath();
    const step = 2;
    for (let x = 0; x <= width; x += step) {
      const norm_pos = x / width;
      const rawFilterAmp = getFilterAmplitudeAt(norm_pos, filterSettings);
      const y = barBaseY - rawFilterAmp * maxBarHeight;
      if (x === 0) {
        overlayCtx.moveTo(x, y);
      } else {
        overlayCtx.lineTo(x, y);
      }
    }

    // Use mix for transparency - higher mix = more visible overlay
    const mixNorm = mixAmount / 100;
    const strokeAlpha = 0.4 + (mixNorm * 0.6); // Range from 0.4 to 1.0

    overlayCtx.strokeStyle = hexToRgba(shadeHexColor(currentColor, -0.3), strokeAlpha);
    overlayCtx.lineWidth = 2.5;
    overlayCtx.stroke();

    // Draw white transparency overlay above the filter curve
    const whiteOpacity = mixAmount / 100; // 0% mix = 0 opacity, 100% mix = 1.0 opacity

    if (whiteOpacity > 0) {
      // Create the white overlay shape above the filter curve
      overlayCtx.beginPath();

      // Start from top-left corner
      overlayCtx.moveTo(0, 0);

      // Draw along the top edge to top-right
      overlayCtx.lineTo(width, 0);

      // Draw down the right edge to the filter curve
      const rightFilterAmp = getFilterAmplitudeAt(1.0, filterSettings); // Right edge
      const rightY = barBaseY - rightFilterAmp * maxBarHeight;
      overlayCtx.lineTo(width, rightY);

      // Draw the filter curve from right to left
      for (let x = width; x >= 0; x -= 2) {
        const norm_pos = x / width;
        const rawFilterAmp = getFilterAmplitudeAt(norm_pos, filterSettings);
        const y = barBaseY - rawFilterAmp * maxBarHeight;
        overlayCtx.lineTo(x, y);
      }

      // Close the path back to top-left
      overlayCtx.closePath();

      // Fill the area above the filter curve with white transparency
      overlayCtx.fillStyle = `rgba(255, 255, 255, ${whiteOpacity})`;
      overlayCtx.fill();
    }

  } else {
    // Reset filter values when filter is disabled
    binFilterValues.fill(1);
  }
}

function updateSliderVisuals() {
  if (!currentColor) {
    return;
  }
  const color = currentColor;
  binColumns.forEach((column, i) => {
    const fill = column.sliderTrack.querySelector<HTMLDivElement>('.slider-fill');
    const label = column.sliderTrack.querySelector<HTMLDivElement>('.harmonic-label-internal');
    if (!fill || !label) {
      return;
    }

    const val = coeffs[i] ?? 0; // No threshold snapping - use raw value

    fill.style.height = `${val * 100}%`;

    if (val > 0) {
      // Standard single-color rendering
      const fillColor = shadeHexColor(color, -0.1);
      fill.style.backgroundColor = hexToRgba(fillColor, 1);
    } else {
      fill.style.backgroundColor = 'transparent';
    }

    // Always clean up any canvas overlays
    const existingCanvas = fill.querySelector('canvas');
    if (existingCanvas) {
      existingCanvas.remove();
    }

    // Update label color based on bin level
    if (val > 0.1) {
      // High bin level - white text for contrast against colored fill
      label.style.color = 'rgba(255, 255, 255, 0.35)';
      label.style.textShadow = '0 0 2px rgba(0,0,0,0.3)';
    } else {
      // Low/zero bin level - dark text for visibility on light background
      label.style.color = 'rgba(51, 51, 51, 0.5)';
      label.style.textShadow = '0 0 1px rgba(255,255,255,0.3)';
    }
  });
  drawFilterOverlay();
}

function handleBinPointerEvent(e: PointerEvent, binIndex: number | null = null) {
  if (!currentColor || !overtoneBinsGrid) {
    return;
  }

  const target = e.target instanceof Element ? e.target : null;

  recordOvertoneBinsDebug('log', '[BINS DRAG] handleBinPointerEvent called', { clientX: e.clientX, clientY: e.clientY });
  logger.debug('OvertoneBins', 'handleBinPointerEvent called', { target: target?.className }, 'filter');

  // CRITICAL: Block phase button events completely
  if (target?.classList.contains('phase-button') ||
        target?.closest('.phase-button') ||
        target?.tagName === 'path' ||  // SVG elements in phase buttons
        target?.tagName === 'svg') {   // SVG containers
    recordOvertoneBinsDebug('log', '[BINS DRAG] Blocked - phase button element');
    logger.debug('OvertoneBins', 'Blocking phase button interaction in handleBinPointerEvent', null, 'filter');
    return;
  }

  // If no binIndex provided, determine from pointer position
  if (binIndex === null) {
    const gridRect = overtoneBinsGrid.getBoundingClientRect();
    const x = e.clientX - gridRect.left;
    const binWidth = gridRect.width / BINS;
    const calculated = Math.floor(x / binWidth);
    binIndex = Math.max(0, Math.min(BINS - 1, calculated));
    recordOvertoneBinsDebug('log', '[BINS DRAG] Calculated binIndex:', binIndex, 'from x:', x, 'binWidth:', binWidth);
  }

  logger.debug('OvertoneBins', 'handleBinPointerEvent - binIndex', { binIndex }, 'filter');

  if (binIndex === null) {
    return;
  }

  const timbre = store.state.timbres[currentColor];
  if (!timbre) {
    return;
  }

  const column = binColumns[binIndex];
  if (!column) {
    return;
  }

  const sliderTrack = column.sliderTrack;
  const rect = sliderTrack.getBoundingClientRect();
  const y = e.clientY - rect.top;
  const trackHeight = rect.height;

  // Direct mapping - no snap zone logic
  const v = (trackHeight - y) / trackHeight;
  const clampedValue = Math.max(0, Math.min(1, v));
  recordOvertoneBinsDebug('log', '[BINS DRAG] Setting bin', binIndex + 1, 'value:', clampedValue.toFixed(3));

  if (clampedValue === 0) {
    // Don't stop audio playback when setting individual harmonics to zero
    // The playback should continue so user can hear the effect of removing this harmonic

    // Immediately update store with zero value
    logger.debug('OvertoneBins', 'Setting coefficient to zero immediately for bin', { binIndex }, 'filter');
    const newCoeffs = new Float32Array(timbre.coeffs);
    newCoeffs[binIndex] = 0;
    coeffs[binIndex] = 0; // Keep local array in sync
    store.setHarmonicCoefficients(currentColor, newCoeffs);

    // Clear any pending timeout for this bin
    const timeoutId = zeroUpdateTimeouts[binIndex];
    if (typeof timeoutId === 'number') {
      clearTimeout(timeoutId);
      zeroUpdateTimeouts[binIndex] = null;
    }

    // Start audio if not already playing (user is interacting)
    if (!isAuditioning) {
      SynthEngine.triggerAttack('C4', currentColor);
      store.emit('spacebarPlayback', { color: currentColor, isPlaying: true });
      isAuditioning = true;
    }

    // Update filtered coefficients when harmonic bins change (including zero)
    const filterSettings = store.state.timbres[currentColor]?.filter as FilterSettings | undefined;
    if (filterSettings && (filterSettings.enabled !== false) && (filterSettings.mix || 0) > 0) {
      _filteredCoeffs = applyDiscreteFiltering(newCoeffs, filterSettings);
    } else {
      // No filtering - use original coefficients
      _filteredCoeffs = new Float32Array(newCoeffs);
    }

    // Update static waveform in real-time during dragging (including zero)
    if (window.waveformVisualizer?.generateWaveform) {
      window.waveformVisualizer.generateWaveform();
    }

    // DEBUG: Log zero coefficient updates
    logger.debug('OvertoneBins', `Set coefficient H${binIndex + 1} to 0 for color ${currentColor}`, null, 'filter');
  } else {
    const timeoutId = zeroUpdateTimeouts[binIndex];
    if (typeof timeoutId === 'number') {
      clearTimeout(timeoutId);
      zeroUpdateTimeouts[binIndex] = null;
    }

    if (!isAuditioning) {
      SynthEngine.triggerAttack('C4', currentColor);
      store.emit('spacebarPlayback', { color: currentColor, isPlaying: true });
      isAuditioning = true;
    }

    logger.debug('OvertoneBins', 'BEFORE creating newCoeffs - store coeffs', { coeffs: timbre.coeffs }, 'filter');
    const newCoeffs = new Float32Array(timbre.coeffs);
    logger.debug('OvertoneBins', 'AFTER copying to newCoeffs', { newCoeffs }, 'filter');
    newCoeffs[binIndex] = clampedValue;
    coeffs[binIndex] = clampedValue; // Keep local array in sync
    logger.debug('OvertoneBins', `AFTER setting newCoeffs[${binIndex}] = ${clampedValue}`, { newCoeffs }, 'filter');

    // Update the timbre directly (amplitude normalization removed)
    store.setHarmonicCoefficients(currentColor, newCoeffs);

    // Update filtered coefficients when harmonic bins change
    const filterSettings = store.state.timbres[currentColor]?.filter as FilterSettings | undefined;
    if (filterSettings && (filterSettings.enabled !== false) && (filterSettings.mix || 0) > 0) {
      _filteredCoeffs = applyDiscreteFiltering(newCoeffs, filterSettings);
    } else {
      // No filtering - use original coefficients
      _filteredCoeffs = new Float32Array(newCoeffs);
    }

    // Update static waveform in real-time during dragging
    if (window.waveformVisualizer?.generateWaveform) {
      window.waveformVisualizer.generateWaveform();
    }

    // DEBUG: Log coefficient updates
    logger.debug('OvertoneBins', `Updated coefficient H${binIndex + 1} to ${clampedValue} for color ${currentColor}`, null, 'filter');
    logger.debug('OvertoneBins', 'All coefficients', { newCoeffs }, 'filter');
  }

  updateSliderVisuals();
}

// ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ State synchronization validation helper
function validateStateSync(
  localCoeffs: Float32Array,
  localPhases: Float32Array,
  storeTimbre: { coeffs: Float32Array; phases?: Float32Array },
  _tag?: string
) {
  const storeCoeffs = storeTimbre.coeffs;
  const storePhases = storeTimbre.phases || new Float32Array(storeCoeffs.length).fill(0);

  let coeffsMatch = true;
  let phasesMatch = true;

  if (localCoeffs.length !== storeCoeffs.length) {
    coeffsMatch = false;
  } else {
    for (let i = 0; i < localCoeffs.length; i++) {
      const localVal = localCoeffs[i] ?? 0;
      const storeVal = storeCoeffs[i] ?? 0;
      if (Math.abs(localVal - storeVal) > 0.001) {
        coeffsMatch = false;
        break;
      }
    }
  }

  if (localPhases.length !== storePhases.length) {
    phasesMatch = false;
  } else {
    for (let i = 0; i < localPhases.length; i++) {
      const localVal = localPhases[i] ?? 0;
      const storeVal = storePhases[i] ?? 0;
      if (Math.abs(localVal - storeVal) > 0.001) {
        phasesMatch = false;
        break;
      }
    }
  }

  const isSync = coeffsMatch && phasesMatch;


  return isSync;
}

function updateForNewColor(color: string) {
  if (!color) {return;}
  currentColor = color;
  const timbre = store.state.timbres[color];
  if (timbre) {
    // Fix: Ensure filter state is properly initialized with enabled property
    if (!timbre.filter) {
      timbre.filter = { enabled: true, blend: 1.0, cutoff: 16, resonance: 0, type: 'lowpass', mix: 0 };
    } else if (timbre.filter.enabled === undefined) {
      timbre.filter.enabled = true;
    }
    logger.debug('OvertoneBins', 'updateForNewColor - timbre.coeffs', { coeffs: timbre.coeffs }, 'filter');
    logger.debug('OvertoneBins', 'updateForNewColor - timbre.phases', { phases: timbre.phases }, 'filter');

    // Direct copy without zero threshold manipulation
    coeffs = new Float32Array(timbre.coeffs);

    // Fix the phase array creation
    if (timbre.phases) {
      phases = new Float32Array(timbre.phases);
    } else {
      phases = new Float32Array(coeffs.length).fill(0);
    }

    // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Validate synchronization after update
    validateStateSync(coeffs, phases, timbre, 'updateForNewColor');


    logger.debug('OvertoneBins', 'updateForNewColor - final coeffs', { coeffs }, 'filter');
    logger.debug('OvertoneBins', 'updateForNewColor - final phases', { phases }, 'filter');

    phaseControls.forEach(({ phaseBtn }, i) => {
      if (!phaseBtn) {return;}
      const phase = phases[i] || 0;
      let p = phase % (2 * Math.PI);
      if (p < 0) {p += 2 * Math.PI;}

      const tolerance = 0.1;
      let phaseState: PhaseState = 0;
      if (Math.abs(p - Math.PI/2) < tolerance) {phaseState = 90;}
      else if (Math.abs(p - Math.PI) < tolerance) {phaseState = 180;}
      else if (Math.abs(p - 3*Math.PI/2) < tolerance) {phaseState = 270;}

      phaseBtn.innerHTML = phaseIconPaths[phaseState];
    });

    updateSliderVisuals();
  }
}

export function initOvertoneBins() {
  const filterContainer = document.querySelector<HTMLDivElement>('.filter-container');
  const filterBinsWrapper = filterContainer?.querySelector<HTMLDivElement>('.filter-bins-wrapper');
  const filterVerticalBlendWrapper = filterContainer?.querySelector<HTMLDivElement>('.filter-vertical-blend-wrapper');

  if (!filterContainer || !filterBinsWrapper || !filterVerticalBlendWrapper) {
    logger.error('OvertoneBins', 'Missing required elements - aborting init', null, 'audio');
    return;
  }

  // Create the main grid container
  overtoneBinsGrid = document.createElement('div');
  overtoneBinsGrid.className = 'overtone-bins-grid';

  // Create 12 columns, each containing bin control and phase button
  for (let i = 0; i < BINS; i++) {
    const column = document.createElement('div');
    column.className = 'slider-column';

    // Bin control track
    const sliderTrack = document.createElement('div');
    sliderTrack.className = 'slider-track';

    // Add bin fill
    const sliderFill = document.createElement('div');
    sliderFill.className = 'slider-fill';
    sliderTrack.appendChild(sliderFill);

    // Label inside the bin at the bottom
    const label = document.createElement('div');
    label.className = 'harmonic-label-internal';
    label.textContent = `${i + 1}`;
    sliderTrack.appendChild(label);

    column.appendChild(sliderTrack);

    // Phase button
    const phaseBtn = document.createElement('button');
    phaseBtn.className = 'phase-button';
    phaseBtn.innerHTML = phaseIconPaths[0];
    phaseBtn.dataset['binIndex'] = String(i); // Store bin index for snap-to-zero

    // Snap-to-zero when dragging onto phase button
    phaseBtn.addEventListener('pointerenter', () => {
      if (isDraggingBin) {
        recordOvertoneBinsDebug('log', '[SNAP-TO-ZERO] ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ Drag entered phase button for bin', i + 1);

        // Apply smooth ramp to zero to avoid pops/clicks
        const rampTime = 0.015; // 15ms ramp to avoid audio artifacts
        const now = Tone.now();

        // Get the oscillator for this harmonic
        const synths = (SynthEngine as unknown as { synths?: Record<string, any> }).synths;
        const color = currentColor;
        if (color && synths?.[color]?.activeNotes?.C4) {
          const activeNote = synths[color].activeNotes.C4;
          if (activeNote.oscillators?.[i]) {
            const osc = activeNote.oscillators[i];
            // Smoothly ramp volume to zero
            osc.volume.linearRampTo(-Infinity, rampTime, now);
            recordOvertoneBinsDebug('log', '[SNAP-TO-ZERO] Applied smooth ramp for bin', i + 1);
          }
        }

        // Update coefficients after ramp completes
        setTimeout(() => {
          const color = currentColor;
          const timbre = color ? store.state.timbres[color] : undefined;
          if (!color || !timbre) {
            return;
          }

          const newCoeffs = new Float32Array(timbre.coeffs);
          newCoeffs[i] = 0;
          coeffs[i] = 0;
          store.setHarmonicCoefficients(color, newCoeffs);

          // Update filtered coefficients
          const filterSettings = store.state.timbres[color]?.filter as FilterSettings | undefined;
          if (filterSettings && (filterSettings.enabled !== false) && (filterSettings.mix || 0) > 0) {
            _filteredCoeffs = applyDiscreteFiltering(newCoeffs, filterSettings);
          } else {
            _filteredCoeffs = new Float32Array(newCoeffs);
          }

          updateSliderVisuals();
          recordOvertoneBinsDebug('log', '[SNAP-TO-ZERO] ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ Bin', i + 1, 'snapped to ZERO via phase button drag');
        }, rampTime * 1000);
      }
    });

    phaseBtn.addEventListener('click', (e: MouseEvent) => {
      // Only handle click if not dragging (prevent phase change during drag-to-zero)
      if (isDraggingBin) {
        recordOvertoneBinsDebug('log', '[SNAP-TO-ZERO] Click blocked during drag');
        e.preventDefault();
        return;
      }

      const color = currentColor;
      if (!color) {
        return;
      }

      logger.debug('OvertoneBins', 'Phase button click handler started', null, 'filter');
      logger.debug('OvertoneBins', 'Current coeffs before phase change', { coeffs }, 'filter');

      // Prevent event bubbling to avoid triggering grid's pointer handler
      e.preventDefault();

      // Store old phases for transition animation
      const oldPhases = new Float32Array(phases);

      const newPhases = new Float32Array(phases);
      const currentPhase = newPhases[i] || 0;
      let p = currentPhase % (2 * Math.PI);
      if (p < 0) {p += 2 * Math.PI;}

      const tolerance = 0.1;
      let nextPhase = 0;
      if (Math.abs(p) < tolerance) {nextPhase = Math.PI / 2;}
      else if (Math.abs(p - Math.PI/2) < tolerance) {nextPhase = Math.PI;}
      else if (Math.abs(p - Math.PI) < tolerance) {nextPhase = 3 * Math.PI / 2;}
      else {nextPhase = 0;}

      newPhases[i] = nextPhase;
      phases = newPhases;

      // Start transition animation before updating store
      if (window.waveformVisualizer?.startPhaseTransition) {
        window.waveformVisualizer.startPhaseTransition(oldPhases, newPhases, i);
      }

      // Update store (but don't trigger immediate waveform regeneration due to transition guard)
      store.setHarmonicPhases(color, newPhases);

      const degrees: PhaseState = nextPhase === 0 ? 0 :
        Math.abs(nextPhase - Math.PI / 2) < tolerance ? 90 :
          Math.abs(nextPhase - Math.PI) < tolerance ? 180 : 270;
      phaseBtn.innerHTML = phaseIconPaths[degrees];

      logger.debug('OvertoneBins', `Phase button clicked for H${i + 1}, new phase: ${degrees}Ãƒâ€šÃ‚Â°`, null, 'filter');
    });

    column.appendChild(phaseBtn);
    overtoneBinsGrid.appendChild(column);

    // Store references
    binColumns.push({
      column,
      label,
      sliderTrack,
      sliderFill,
      phaseBtn
    });
    phaseControls.push({ phaseBtn });

  }

  // Add cross-bin drag functionality to the entire grid
  overtoneBinsGrid.addEventListener('pointerdown', (e: PointerEvent) => {
    const target = e.target instanceof Element ? e.target : null;
    recordOvertoneBinsDebug('log', '[BINS DRAG] Pointerdown event fired', { target, className: target?.className });

    // Check if the click came from a phase button
    if (target?.classList.contains('phase-button') || target?.closest('.phase-button')) {
      recordOvertoneBinsDebug('log', '[BINS DRAG] Blocked - phase button clicked');
      logger.debug('OvertoneBins', 'Pointerdown blocked - phase button clicked', null, 'filter');
      return; // Don't handle phase button clicks as bin interactions
    }

    recordOvertoneBinsDebug('log', '[BINS DRAG] Starting drag interaction');
    logger.debug('OvertoneBins', 'Pointerdown - handling bin interaction', null, 'filter');
    e.preventDefault();

    isDraggingBin = true; // Enable snap-to-zero via phase button pointerenter
    recordOvertoneBinsDebug('log', '[SNAP-TO-ZERO] Drag started - isDraggingBin = true');

    if (!currentColor) {
      return;
    }
    const color = currentColor;

    SynthEngine.triggerAttack('C4', color);
    store.emit('spacebarPlayback', { color, isPlaying: true });
    isAuditioning = true;

    handleBinPointerEvent(e);

    const onMove = (ev: PointerEvent) => handleBinPointerEvent(ev);
    const stopDrag = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', stopDrag);
      isDraggingBin = false; // Disable snap-to-zero
      recordOvertoneBinsDebug('log', '[SNAP-TO-ZERO] Drag ended - isDraggingBin = false');
      const waveformAvailable = !!window.waveformVisualizer?.generateWaveform;
      recordOvertoneBinsDebug('log', '[OvertoneBins] stopDrag invoked', {
        waveformAvailable,
        hasChanges: typeof handleBinPointerEvent === 'function'
      });

      store.recordState();

      SynthEngine.triggerRelease('C4', color);
      store.emit('spacebarPlayback', { color, isPlaying: false });
      isAuditioning = false;

      if (waveformAvailable) {
        setTimeout(() => {
          recordOvertoneBinsDebug('log', '[OvertoneBins] Generating static waveform after drag');
          window.waveformVisualizer?.generateWaveform?.();
        }, 0);
      } else {
        logger.warn('OvertoneBins', 'Static waveform visualizer not ready when drag ended', null, 'audio');
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', stopDrag);
  });

  // Create filter overlay canvas
  overlayCanvas = document.createElement('canvas');
  overlayCanvas.id = 'filter-overlay-canvas';
  overlayCanvas.className = 'filter-overlay-canvas';
  overlayCanvas.style.pointerEvents = 'none';
  overlayCtx = overlayCanvas.getContext('2d');
  overtoneBinsGrid.appendChild(overlayCanvas);

  // Create vertical blend (M) slider
  const verticalBlendWrapper = document.createElement('div');
  verticalBlendWrapper.className = 'vertical-blend-wrapper';

  const verticalBlendTrack = document.createElement('div');
  verticalBlendTrack.id = 'vertical-blend-track';

  const verticalBlendThumb = document.createElement('div');
  verticalBlendThumb.id = 'vertical-blend-thumb';
  verticalBlendThumb.textContent = 'M';

  verticalBlendTrack.appendChild(verticalBlendThumb);
  verticalBlendWrapper.appendChild(verticalBlendTrack);

  // Add grid and vertical slider to their respective wrappers
  filterBinsWrapper.appendChild(overtoneBinsGrid);
  filterVerticalBlendWrapper.appendChild(verticalBlendWrapper);

  // Size the overlay canvas
  const sizeOverlayCanvas = () => {
    if (!overlayCanvas) {
      return;
    }
    const rect = overlayCanvas.getBoundingClientRect(); // Use canvas rect, not grid rect
    if (overlayCanvas.width !== rect.width || overlayCanvas.height !== rect.height) {
      overlayCanvas.width = rect.width;
      overlayCanvas.height = rect.height;
      drawFilterOverlay();
    }
  };

  // Initialize with current color
  currentColor = store.state.selectedNote?.color || '#4a90e2';

  updateForNewColor(currentColor);

  // Set up event listeners
  store.on('timbreChanged', (color?: string) => {
    if (color && color === currentColor) {
      logger.debug('OvertoneBins', 'timbreChanged event - checking what changed', null, 'filter');
      const timbre = store.state.timbres[color];
      if (!timbre) {
        return;
      }
      const newCoeffs = timbre.coeffs;
      const newPhases = timbre.phases;

      // Check if coefficients actually changed (not just phases)
      let coeffsChanged = false;
      logger.debug('OvertoneBins', 'Comparing coefficients...', null, 'filter');
      logger.debug('OvertoneBins', 'Local coeffs', { coeffs }, 'filter');
      logger.debug('OvertoneBins', 'Store coeffs', { newCoeffs }, 'filter');

      if (coeffs.length !== newCoeffs.length) {
        logger.debug('OvertoneBins', 'Array length mismatch - coeffsChanged = true', null, 'filter');
        coeffsChanged = true;
      } else {
        for (let i = 0; i < newCoeffs.length; i++) {
          const localVal = coeffs[i] ?? 0;
          const storeVal = newCoeffs[i] ?? 0;
          const diff = Math.abs(localVal - storeVal);
          if (diff > 0.001) {
            logger.debug('OvertoneBins', `Coefficient ${i} changed: ${localVal} -> ${storeVal} (diff: ${diff})`, null, 'filter');
            coeffsChanged = true;
            break;
          }
        }
      }

      // ALWAYS sync local coeffs with store to prevent drift (no threshold manipulation)
      logger.debug('OvertoneBins', 'Force syncing local coeffs with store', null, 'filter');

      // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Validate state before sync
      validateStateSync(coeffs, phases, timbre, 'timbreChanged-before');

      coeffs = new Float32Array(newCoeffs);

      // Always update phases (they change more frequently)
      if (newPhases) {
        phases = new Float32Array(newPhases);
      } else {
        phases = new Float32Array(coeffs.length).fill(0);
      }

      // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Validate state after sync
      validateStateSync(coeffs, phases, timbre, 'timbreChanged-after');


      if (coeffsChanged) {
        logger.debug('OvertoneBins', 'Coefficients changed - updating visuals', null, 'filter');
        updateSliderVisuals();
      } else {
        logger.debug('OvertoneBins', 'No coefficient changes detected - but local coeffs synced', null, 'filter');
        // Still need to redraw overlay in case filter settings changed
        drawFilterOverlay();
      }

      // Update phase button visuals
      phaseControls.forEach(({ phaseBtn }, i) => {
        if (!phaseBtn) {return;}
        const phase = phases[i] || 0;
        let p = phase % (2 * Math.PI);
        if (p < 0) {p += 2 * Math.PI;}

        const tolerance = 0.1;
        let phaseState: PhaseState = 0;
        if (Math.abs(p - Math.PI/2) < tolerance) {phaseState = 90;}
        else if (Math.abs(p - Math.PI) < tolerance) {phaseState = 180;}
        else if (Math.abs(p - 3*Math.PI/2) < tolerance) {phaseState = 270;}

        phaseBtn.innerHTML = phaseIconPaths[phaseState];
      });
    }
  });

  store.on<{ newNote?: { color?: string } }>('noteChanged', ({ newNote } = {}) => {
    if (newNote?.color && newNote.color !== currentColor) {
      updateForNewColor(newNote.color);
    }
  });

  // Listen for filter changes to update bin visuals and apply filtering
  store.on('filterChanged', (color?: string) => {
    const current = currentColor;
    if (current && color === current) {
      // Update visuals
      updateSliderVisuals();

      // Apply discrete filtering to coefficients and send to synth
      const timbre = store.state.timbres[current];
      const filterSettings = timbre?.filter;
      if (!timbre) {
        return;
      }

      if (filterSettings && (filterSettings.enabled !== false) && (filterSettings.mix || 0) > 0) {
        _filteredCoeffs = applyDiscreteFiltering(timbre.coeffs, filterSettings);
      } else {
        // No filtering - use original coefficients
        _filteredCoeffs = new Float32Array(timbre.coeffs);
      }
    }
  });

  // Observe resize for overlay canvas
  new ResizeObserver(sizeOverlayCanvas).observe(overtoneBinsGrid);
  sizeOverlayCanvas();

  logger.info('OvertoneBins', 'Initialized with columnar div structure and perfect alignment', null, 'filter');
}

export function getOvertoneBinsDebugMessages() {
  return overtoneBinsDebugMessages.slice();
}
