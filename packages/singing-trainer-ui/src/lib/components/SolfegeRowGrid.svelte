<script lang="ts">
  import {
    PitchGrid,
    createColumnCoordinates,
    drawUserPitchIndicator,
    drawUserPitchTrace,
    type LegendHighlightConfig,
    type PitchRowHighlightConfig,
    type UserPitchRenderConfig,
  } from '@mlt/ui-components/canvas';
  import { generateRowDataForMidiRange, getPitchByMidi } from '@mlt/pitch-data';
  import type { SolfegeLine } from '@mlt/singing-trainer-core/constants/ladukhin.js';
  import type { SolfegeTrailPoint } from '@mlt/singing-trainer-core/services/solfegeTrail.js';
  import { createSolfegeNotation, SOLFEGE_COLUMNS_PER_BEAT, SOLFEGE_SOURCE_TONIC, solfegeMidi, solfegeRowOffsets, type SolfegeTuningMode } from '@mlt/singing-trainer-core/services/solfegeNotation.js';

  import { appState } from '@mlt/singing-trainer-core/stores/appState.svelte.js';
  import { SINGING_GRID, singingLegendWidth, singingPitchSizes, singingJudgmentLineWidth } from './pitchGridAppearance.js';

  let { line, speakingMidi, tuning = 'just', shortcutHighlightMidis = [], trail = [], cursorBeat = null, active = false, referencePlaying = false, recordingComplete = false, listening = false, livePitch = null, countdown = null }: {
    line: SolfegeLine;
    speakingMidi: number;
    tuning?: SolfegeTuningMode;
    shortcutHighlightMidis?: readonly number[];
    trail?: SolfegeTrailPoint[];
    cursorBeat?: number | null;
    active?: boolean;
    referencePlaying?: boolean;
    recordingComplete?: boolean;
    listening?: boolean;
    livePitch?: { midi: number; clarity: number } | null;
    countdown?: number | null;
  } = $props();
  let availableWidth = $state(0);
  let gridViewport: HTMLDivElement | undefined = $state();
  let overlay: HTMLCanvasElement | undefined = $state();
  const minScale = 0.5;
  const maxScale = 3;
  let scale = $state(1);
  let drag = $state<{ pointerId: number; startY: number; startHeight: number; startScale: number } | null>(null);
  const cellWidth = $derived(SINGING_GRID.cellWidth * scale);
  const pixelsPerBeat = $derived(SOLFEGE_COLUMNS_PER_BEAT * cellWidth);
  const cellHeight = $derived(SINGING_GRID.preferredCellHeight * scale);
  const legendWidth = $derived(singingLegendWidth() * scale);
  const showRightLegend = $derived(availableWidth >= SINGING_GRID.rightLegendBreakpoint);
  const pitchSizes = $derived(singingPitchSizes(cellHeight, appState.state.micTrailSizeScale));
  // Pad only the overlay so the circle can cross the legend/barline boundary.
  // The score itself must begin and end directly against the legends.
  const overlayPadding = $derived((SINGING_GRID.preferredCellHeight / 2 + 4) * scale);
  const fullRowData = $derived(generateRowDataForMidiRange(0, 127).map(row => ({
    ...row, hex: getPitchByMidi(row.midi! - speakingMidi + SOLFEGE_SOURCE_TONIC)?.hex ?? row.hex,
  })));
  const notation = $derived(createSolfegeNotation(line, speakingMidi, fullRowData));
  const centerRow = $derived(fullRowData.findIndex(row => row.midi === speakingMidi));
  const legendLabelOverrides = $derived(new Map([0, 2, 4, 5, 7, 9, 11].map((offset, index) => [((speakingMidi + offset) % 12 + 12) % 12, String(index + 1)])));
  const rowPositionOffsets = $derived(solfegeRowOffsets(fullRowData, speakingMidi, tuning));
  const shortcutRowHighlight = $derived<PitchRowHighlightConfig | undefined>(
    shortcutHighlightMidis.length > 0
      ? shortcutHighlightMidis.map((midi) => ({
          midi,
          color: fullRowData.find((row) => row.midi === midi)?.hex,
          opacity: 0.78,
          glow: 1,
          pulse: false,
          renderBehindGridLines: true,
          heightScale: 0,
          fadeExtendTopScale: 0.5,
          fadeExtendBottomScale: 0.5,
        }))
      : undefined
  );
  const shortcutLegendHighlight = $derived<LegendHighlightConfig | undefined>(
    shortcutHighlightMidis.length > 0
      ? shortcutHighlightMidis.map((midi) => ({
          midi,
          pitchClass: ((midi % 12) + 12) % 12,
          opacity: 0.78,
          color: fullRowData.find((row) => row.midi === midi)?.hex,
        }))
      : undefined
  );
  const radius = $derived(Math.max(6, ...line.notes.map(note => note.midi === null ? 0 : Math.abs(note.midi - SOLFEGE_SOURCE_TONIC) + 1)));
  const height = $derived((radius + 3) * cellHeight / 2);
  const musicWidth = $derived(notation.columnWidths.length * cellWidth);
  const overlayWidth = $derived(musicWidth + overlayPadding * 2);
  const width = $derived(legendWidth * (showRightLegend ? 2 : 1) + musicWidth);
  const viewport = $derived({ startRow: centerRow - radius, endRow: centerRow + 1, zoomLevel: 1, containerWidth: width, containerHeight: height });
  const coords = $derived(createColumnCoordinates({ cellWidth, cellHeight, columnWidths: notation.columnWidths, viewport, contentInsetX: overlayPadding }));
  // Overlay beat zero is at its padding; the overlay starts that much before
  // the music canvas, keeping score, cursor, and trail on the same barlines.

  $effect(() => {
    const viewportElement = gridViewport;
    const activeBeat = cursorBeat;
    if (!viewportElement || !active || activeBeat === null) return;
    const viewportWidth = viewportElement.clientWidth;
    if (viewportElement.scrollWidth <= viewportWidth + 1) return;

    const cursorX = legendWidth + Math.max(0, activeBeat) * pixelsPerBeat;
    const maxScrollLeft = Math.max(0, viewportElement.scrollWidth - viewportWidth);
    viewportElement.scrollLeft = Math.max(
      0,
      Math.min(maxScrollLeft, cursorX - viewportWidth * 0.65),
    );
  });

  function resize(nextScale: number): void {
    scale = Math.max(minScale, Math.min(maxScale, nextScale));
  }

  function startResize(event: PointerEvent & { currentTarget: HTMLDivElement }): void {
    if (event.button !== 0 || drag) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    drag = { pointerId: event.pointerId, startY: event.clientY, startHeight: height, startScale: scale };
  }

  function moveResize(event: PointerEvent): void {
    if (!drag || event.pointerId !== drag.pointerId) return;
    resize(drag.startScale * (drag.startHeight + event.clientY - drag.startY) / drag.startHeight);
  }

  function finishResize(event: PointerEvent & { currentTarget: HTMLDivElement }): void {
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function resizeWithKeyboard(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') resize(scale + 0.05);
    else if (event.key === 'ArrowUp') resize(scale - 0.05);
    else if (event.key === 'Home') resize(1);
    else return;
    event.preventDefault();
  }

  $effect(() => {
    if (!overlay) return;
    const dpr = window.devicePixelRatio || 1;
    overlay.width = Math.round(overlayWidth * dpr);
    overlay.height = Math.round(height * dpr);
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const currentBeat = Math.max(0, cursorBeat ?? line.durationBeats);
    // Use continuous, untuned MIDI coordinates for measured pitches. The grid's
    // tuning offsets place its reference rows at those same physical frequencies.
    const config: UserPitchRenderConfig = {
      cellHeight, viewportWidth: overlayWidth, nowLineX: overlayPadding + currentBeat * pixelsPerBeat,
      pixelsPerSecond: pixelsPerBeat, timeWindowMs: Infinity,
      colorMode: 'color',
      // Trail timestamps use one synthetic second per beat. Matching the cursor's
      // scale fixes each point at overlayPadding + point.beat * pixelsPerBeat.
      trailConfig: { ...pitchSizes, pixelsPerSecond: pixelsPerBeat, timeWindowMs: Infinity, includeFuturePoints: true, maxConnections: 0,
        useTonicRelativeColors: true, tonicPitchClass: ((speakingMidi % 12) + 12) % 12,
        clarityThreshold: 0.5, maxOpacity: appState.state.micTrailOpacity,
        connectedRibbon: appState.state.connectedMicTrailEnabled },
    };
    // Unconnected points preserve silence gaps, using the trainer's renderer.
    drawUserPitchTrace(ctx, coords, trail.map(point => ({
      time: point.beat * 1000, midi: point.midi, clarity: 1,
      frequency: 440 * 2 ** ((point.midi - 69) / 12), move: point.move,
    })), currentBeat * 1000, config, fullRowData);
    if (cursorBeat !== null) {
      const cursorX = config.nowLineX!;
      ctx.strokeStyle = SINGING_GRID.judgmentLineColor;
      ctx.lineWidth = singingJudgmentLineWidth(cellHeight);
      ctx.beginPath(); ctx.moveTo(cursorX, 0); ctx.lineTo(cursorX, height); ctx.stroke();
      const latest = trail[trail.length - 1];
      const target = referencePlaying ? line.notes.find(note => note.beat <= currentBeat && note.beat + note.durationBeats > currentBeat) : null;
      const firstPitch = line.notes.find(note => note.midi !== null)?.midi;
      const restingMidi = firstPitch != null ? solfegeMidi(firstPitch, speakingMidi, tuning) : speakingMidi;
      // Preserve detection confidence so the shared indicator applies the same
      // clarity gate and opacity as the main trainer. Silence must not snap the
      // live circle back to a score note or an older recorded sample.
      const indicator = referencePlaying
        ? target?.midi != null ? { midi: solfegeMidi(target.midi, speakingMidi, tuning), clarity: 1 } : null
        : recordingComplete || currentBeat >= line.durationBeats ? null
        : listening ? livePitch
        : { midi: latest && Math.abs(latest.beat - currentBeat) < 0.25 ? latest.midi : restingMidi, clarity: 1 };
      if (indicator && Number.isFinite(indicator.midi) && Number.isFinite(indicator.clarity)) {
        drawUserPitchIndicator(ctx, coords, indicator.midi, indicator.clarity, cursorX, config, fullRowData);
      }
    }
  });
</script>

<div class="grid-viewport" bind:this={gridViewport} bind:clientWidth={availableWidth}>
<div class="notation-grid" style:width="{width}px" style:height="{height}px">
  <PitchGrid mode="playback" {fullRowData} {viewport} {cellWidth} {cellHeight}
    {...notation} {rowPositionOffsets} {legendLabelOverrides} accidentalMode={{ sharp: false, flat: false }}
    rowHighlight={shortcutRowHighlight} legendHighlight={shortcutLegendHighlight}
    degreeDisplayMode="diatonic" longNoteStyle="style2" showOctaveLabels={false}
    legendColumnWidthUnits={SINGING_GRID.legendColumnWidthUnits} {showRightLegend} showFrequencyLabels={false}
    showHorizontalGridLines={true} extendHorizontalGridLinesBehindLegend={true}
    horizontalGridReferencePitchClass={((speakingMidi % 12) + 12) % 12}
    horizontalGridReferenceLineColor={SINGING_GRID.referenceLineColor}
  />
  <canvas bind:this={overlay} class="pitch-overlay" style:left="{legendWidth - overlayPadding}px" style:width="{overlayWidth}px" style:height="{height}px"
    aria-label={`Pitch trail and playback cursor for exercise ${line.number}`}></canvas>
  {#if countdown !== null}
    <span class="countdown" style:left="{legendWidth}px" style:top="{4 * scale}px"
      style:transform="translateX(-50%) scale({scale})" role="status" aria-label={`Count in: ${countdown}`}>{countdown}</span>
  {/if}
</div>
</div>
<div class="resize-handle" class:dragging={drag !== null} role="slider" tabindex="0"
  aria-label={`Resize exercise ${line.number}`} aria-orientation="vertical"
  aria-valuemin={minScale * 100} aria-valuemax={maxScale * 100} aria-valuenow={Math.round(scale * 100)}
  aria-valuetext={`${Math.round(scale * 100)} percent size`}
  title="Drag to resize. Up/Down arrows adjust size; Home or double-click resets."
  onpointerdown={startResize} onpointermove={moveResize} onpointerup={finishResize}
  onpointercancel={finishResize} onlostpointercapture={() => { drag = null; }}
  onkeydown={resizeWithKeyboard} ondblclick={() => resize(1)}
></div>

<style>
  .grid-viewport { width: 100%; min-width: 0; overflow-x: auto; }
  .notation-grid { position: relative; background: #fff; }
  .pitch-overlay { position: absolute; top: 0; pointer-events: none; }
  .countdown { position: absolute; transform-origin: top center; pointer-events: none; border-radius: 50%; width: 36px; height: 36px; display: grid; place-items: center; background: var(--color-bg-light); color: var(--color-text); border: 2px solid var(--color-primary); font-size: 24px; font-weight: 700; }
  .resize-handle { position: relative; height: 12px; margin: 4px -8px -10px; cursor: ns-resize; touch-action: none; user-select: none; border-radius: 0 0 8px 8px; }
  .resize-handle::after { content: ''; position: absolute; width: 40px; height: 3px; border-radius: 2px; background: var(--color-border-strong); left: 50%; top: 5px; transform: translateX(-50%); }
  .resize-handle:hover, .resize-handle.dragging, .resize-handle:focus-visible { background: var(--color-bg-light); outline: 2px solid var(--color-primary); outline-offset: -2px; }
</style>
