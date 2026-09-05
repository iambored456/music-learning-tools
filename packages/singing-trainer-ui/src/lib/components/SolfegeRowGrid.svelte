<script lang="ts">
  import { PitchGrid, createColumnCoordinates, drawUserPitchIndicator, drawUserPitchTrace, type UserPitchRenderConfig } from '@mlt/ui-components/canvas';
  import { generateRowDataForMidiRange, getPitchByMidi } from '@mlt/pitch-data';
  import type { SolfegeLine } from '@mlt/singing-trainer-core/constants/ladukhin.js';
  import type { SolfegeTrailPoint } from '@mlt/singing-trainer-core/services/solfegeTrail.js';
  import { createSolfegeNotation, SOLFEGE_COLUMNS_PER_BEAT, SOLFEGE_SOURCE_TONIC, solfegeJustMidi } from '@mlt/singing-trainer-core/services/solfegeNotation.js';

  import { appState } from '@mlt/singing-trainer-core/stores/appState.svelte.js';
  import { SINGING_GRID, singingLegendWidth, singingPitchSizes, singingJudgmentLineWidth } from './pitchGridAppearance.js';

  let { line, speakingMidi, trail = [], cursorBeat = null, referencePlaying = false }: {
    line: SolfegeLine;
    speakingMidi: number;
    trail?: SolfegeTrailPoint[];
    cursorBeat?: number | null;
    referencePlaying?: boolean;
  } = $props();
  let availableWidth = $state(0);
  let overlay: HTMLCanvasElement | undefined = $state();
  const cellWidth = SINGING_GRID.cellWidth;
  const cellHeight = SINGING_GRID.preferredCellHeight;
  const legendWidth = singingLegendWidth();
  const showRightLegend = $derived(availableWidth >= SINGING_GRID.rightLegendBreakpoint);
  const pitchSizes = $derived(singingPitchSizes(cellHeight, appState.state.micTrailSizeScale));
  // Leave enough musical space for the full judgement circle and its glow.
  const contentInsetX = cellHeight / 2 + 4;
  const fullRowData = $derived(generateRowDataForMidiRange(0, 127).map(row => ({
    ...row, hex: getPitchByMidi(row.midi! - speakingMidi + SOLFEGE_SOURCE_TONIC)?.hex ?? row.hex,
  })));
  const notation = $derived(createSolfegeNotation(line, speakingMidi, fullRowData));
  const centerRow = $derived(fullRowData.findIndex(row => row.midi === speakingMidi));
  const legendLabelOverrides = $derived(new Map([0, 2, 4, 5, 7, 9, 11].map((offset, index) => [((speakingMidi + offset) % 12 + 12) % 12, String(index + 1)])));
  const rowPositionOffsets = $derived(fullRowData.map(row => row.midi! - solfegeJustMidi(row.midi! - speakingMidi + SOLFEGE_SOURCE_TONIC, speakingMidi)));
  const radius = $derived(Math.max(6, ...line.notes.map(note => note.midi === null ? 0 : Math.abs(note.midi - SOLFEGE_SOURCE_TONIC) + 1)));
  const height = $derived((radius + 3) * cellHeight / 2);
  const musicWidth = $derived(contentInsetX * 2 + notation.columnWidths.length * cellWidth);
  const width = $derived(legendWidth * (showRightLegend ? 2 : 1) + musicWidth);
  const viewport = $derived({ startRow: centerRow - radius, endRow: centerRow + 1, zoomLevel: 1, containerWidth: width, containerHeight: height });
  const coords = $derived(createColumnCoordinates({ cellWidth, cellHeight, columnWidths: notation.columnWidths, viewport, contentInsetX }));
  // Column coordinates are local to the musical canvas. Add the legend only when
  // positioning an element in the outer frame; beat zero never includes legends.

  $effect(() => {
    if (!overlay) return;
    const dpr = window.devicePixelRatio || 1;
    overlay.width = Math.round(musicWidth * dpr);
    overlay.height = Math.round(height * dpr);
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const currentBeat = Math.max(0, cursorBeat ?? line.durationBeats);
    // Use continuous, untuned MIDI coordinates for measured pitches. The grid's
    // tuning offsets place its reference rows at those same physical frequencies.
    const config: UserPitchRenderConfig = {
      cellHeight, viewportWidth: musicWidth, nowLineX: contentInsetX + currentBeat * SOLFEGE_COLUMNS_PER_BEAT * cellWidth,
      pixelsPerSecond: SOLFEGE_COLUMNS_PER_BEAT * cellWidth, timeWindowMs: Infinity,
      colorMode: 'color',
      trailConfig: { ...pitchSizes, timeWindowMs: Infinity, includeFuturePoints: true, maxConnections: 0,
        useTonicRelativeColors: true, tonicPitchClass: ((speakingMidi % 12) + 12) % 12,
        clarityThreshold: 0.5, maxOpacity: 0.8 },
    };
    // Unconnected points preserve silence gaps, using the trainer's renderer.
    drawUserPitchTrace(ctx, coords, trail.map(point => ({
      time: point.beat * 1000, midi: point.midi, clarity: 1, frequency: 440 * 2 ** ((point.midi - 69) / 12),
    })), currentBeat * 1000, config, fullRowData);
    if (cursorBeat !== null && cursorBeat >= 0) {
      const cursorX = config.nowLineX!;
      ctx.strokeStyle = SINGING_GRID.judgmentLineColor;
      ctx.lineWidth = singingJudgmentLineWidth(cellHeight);
      ctx.beginPath(); ctx.moveTo(cursorX, 0); ctx.lineTo(cursorX, height); ctx.stroke();
      const latest = trail[trail.length - 1];
      const target = referencePlaying ? line.notes.find(note => note.beat <= cursorBeat && note.beat + note.durationBeats > cursorBeat) : null;
      const midi = target?.midi != null ? solfegeJustMidi(target.midi, speakingMidi)
        : latest && Math.abs(latest.beat - cursorBeat) < 0.25 ? latest.midi : null;
      if (midi !== null) drawUserPitchIndicator(ctx, coords, midi, 1, cursorX, config, fullRowData);
    }
  });
</script>

<div class="grid-viewport" bind:clientWidth={availableWidth}>
<div class="notation-grid" style:width="{width}px" style:height="{height}px">
  <PitchGrid mode="playback" {fullRowData} {viewport} {cellWidth} {cellHeight}
    {...notation} {contentInsetX} {rowPositionOffsets} {legendLabelOverrides} accidentalMode={{ sharp: false, flat: false }}
    degreeDisplayMode="diatonic" longNoteStyle="style2" showOctaveLabels={false}
    legendColumnWidthUnits={SINGING_GRID.legendColumnWidthUnits} {showRightLegend} showFrequencyLabels={false}
    showHorizontalGridLines={true} extendHorizontalGridLinesBehindLegend={true}
    horizontalGridReferencePitchClass={((speakingMidi % 12) + 12) % 12}
    horizontalGridReferenceLineColor={SINGING_GRID.referenceLineColor}
  />
  <canvas bind:this={overlay} class="pitch-overlay" style:left="{legendWidth}px" style:width="{musicWidth}px" style:height="{height}px"
    aria-label={`Pitch trail and playback cursor for exercise ${line.number}`}></canvas>
</div>
</div>

<style>
  .grid-viewport { width: 100%; min-width: 0; overflow-x: auto; }
  .notation-grid { position: relative; background: #fff; }
  .pitch-overlay { position: absolute; top: 0; pointer-events: none; }
</style>
