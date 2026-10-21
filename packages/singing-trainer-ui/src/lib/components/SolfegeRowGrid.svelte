<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import {
    PitchGrid,
    createColumnCoordinates,
    drawUserPitchIndicator,
    drawUserPitchTrace,
    type LegendHighlightConfig,
    type PitchRowHighlightConfig,
    type UserPitchRenderConfig,
  } from '@mlt/ui-components/canvas';
  import { createNotationNoteGeometry, getNoteBounds } from '@mlt/ui-components/canvas/primitives';
  import { generateRowDataForMidiRange, getPitchByMidi } from '@mlt/pitch-data';
  import type { SolfegeLine } from '@mlt/singing-trainer-core/constants/ladukhin.js';
  import type { SolfegeTrailPoint } from '@mlt/singing-trainer-core/services/solfegeTrail.js';
  import { createSolfegeNotation, SOLFEGE_COLUMNS_PER_BEAT, SOLFEGE_SOURCE_TONIC, solfegeMidi, solfegeRowOffsets, type SolfegeTuningMode } from '@mlt/singing-trainer-core/services/solfegeNotation.js';
  import { getSolfegePlaybackMidi } from '@mlt/singing-trainer-core/services/solfegePlayback.js';
  import { NoteAuditionDrag, findAuditionNote, type AuditionNote } from '@mlt/singing-trainer-core/services/noteAudition.js';
  import { NoteAuditionPlayer } from '@mlt/singing-trainer-core/services/noteAuditionPlayer.js';

  import { createVoicePracticeNotation, type PracticeVoice } from '@mlt/singing-trainer-core/services/faberPractice.js';
  import { appState } from '@mlt/singing-trainer-core/stores/appState.svelte.js';
  import { SINGING_GRID, singingLegendWidth, singingPitchSizes, singingJudgmentLineWidth } from './pitchGridAppearance.js';
  import { createNoteFillFeedback } from './noteFillFeedback.svelte.js';

  let { line, scoreVoices = [], referenceVoiceIds = [], visibleVoiceIds, speakingMidi, tempo = 80, tuning = 'just', shortcutHighlightMidis = [], trail = [], cursorBeat = null, active = false, auditionEnabled = true, referencePlaying = false, referenceSounding = false, recordingComplete = false, listening = false, livePitch = null, countdown = null }: {
    line: SolfegeLine;
    scoreVoices?: PracticeVoice[];
    referenceVoiceIds?: readonly string[];
    visibleVoiceIds?: readonly string[];
    speakingMidi: number;
    tempo?: number;
    tuning?: SolfegeTuningMode;
    shortcutHighlightMidis?: readonly number[];
    trail?: SolfegeTrailPoint[];
    cursorBeat?: number | null;
    active?: boolean;
    auditionEnabled?: boolean;
    referencePlaying?: boolean;
    referenceSounding?: boolean;
    recordingComplete?: boolean;
    listening?: boolean;
    livePitch?: { midi: number; clarity: number } | null;
    countdown?: number | null;
  } = $props();
  let availableWidth = $state(0);
  let gridViewport: HTMLDivElement | undefined = $state();
  let overlay: HTMLCanvasElement | undefined = $state();
  let notationElement: HTMLDivElement | undefined = $state();
  let auditionPointerId: number | null = null;
  let auditionHover = $state(false);
  let auditionNoteId = $state<string | null>(null);
  const noteFill = createNoteFillFeedback();
  const auditionDrag = new NoteAuditionDrag();
  const auditionPlayer = new NoteAuditionPlayer();
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
  const visibleScoreVoices = $derived(scoreVoices.filter(voice => visibleVoiceIds === undefined || visibleVoiceIds.includes(voice.id)));
  const notation = $derived.by(() => {
    if (!scoreVoices.length) return createSolfegeNotation(line, speakingMidi, fullRowData);
    if (visibleScoreVoices.length) return createVoicePracticeNotation(visibleScoreVoices, speakingMidi, fullRowData);
    // Keep the timeline and legends available when practicing with both parts hidden.
    return { ...createSolfegeNotation(line, speakingMidi, fullRowData), placedNotes: [] };
  });
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
  const radius = $derived(Math.max(6, ...(scoreVoices.length ? scoreVoices.flatMap(voice => voice.line.notes) : line.notes).map(note => note.midi === null ? 0 : Math.abs(note.midi - SOLFEGE_SOURCE_TONIC) + 1)));
  // End at the exercise floor without adding a lower pitch row.
  const height = $derived((radius + 2) * cellHeight / 2);
  const musicWidth = $derived(notation.columnWidths.length * cellWidth);
  const overlayWidth = $derived(musicWidth + overlayPadding * 2);
  const width = $derived(legendWidth * (showRightLegend ? 2 : 1) + musicWidth);
  const viewport = $derived({ startRow: centerRow - radius, endRow: centerRow, zoomLevel: 1, containerWidth: width, containerHeight: height });
  const coords = $derived(createColumnCoordinates({ cellWidth, cellHeight, columnWidths: notation.columnWidths, viewport, contentInsetX: overlayPadding }));
  const auditionNotes = $derived.by<AuditionNote[]>(() => {
    const hitCoords = createColumnCoordinates({ cellWidth, cellHeight, columnWidths: notation.columnWidths, viewport, rowPositionOffsets });
    const parts = scoreVoices.length ? visibleScoreVoices.map(voice => ({ id: voice.id, line: voice.line })) : [{ id: 'solfege', line }];
    return parts.flatMap(part => part.line.notes.flatMap((note, index) => {
      if (note.midi === null) return [];
      const id = `ladukhin-${part.line.number}-${index}`;
      const placed = notation.placedNotes.find(entry => entry.uuid === id);
      if (!placed) return [];
      const x = hitCoords.getColumnX(placed.startColumnIndex);
      const geometry = createNotationNoteGeometry(placed, {
        x: legendWidth + x, y: hitCoords.getRowY(placed.globalRow ?? placed.row),
        columnWidth: placed.shape === 'circle'
          ? hitCoords.getColumnX(placed.startColumnIndex + 1) - x
          : (notation.columnWidths[placed.startColumnIndex] ?? 1) * cellWidth,
        cellHeight, endCapX: legendWidth + hitCoords.getColumnX(placed.endColumnIndex), longNoteStyle: 'style2',
      });
      return geometry ? [{ id, voiceId: part.id, midi: solfegeMidi(note.midi, speakingMidi, tuning),
        geometry, ...getNoteBounds(geometry) }] : [];
    }));
  });

  function endAudition(): void {
    const pointerId = auditionPointerId;
    auditionPointerId = null;
    auditionNoteId = null;
    auditionDrag.end();
    if (pointerId !== null && notationElement?.hasPointerCapture(pointerId)) notationElement.releasePointerCapture(pointerId);
  }

  function stopAudition(): void { endAudition(); auditionPlayer.stop(); auditionHover = false; }

  function auditionPoint(event: PointerEvent) {
    const rect = notationElement!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function startAudition(event: PointerEvent): void {
    if (!auditionEnabled || active || event.button !== 0 || auditionPointerId !== null) return;
    const note = auditionDrag.start(auditionNotes, auditionPoint(event));
    if (!note) return;
    event.preventDefault();
    auditionPointerId = event.pointerId;
    notationElement?.setPointerCapture(event.pointerId);
    auditionPlayer.stop();
    void auditionPlayer.play([note.midi], () => { auditionNoteId = note.id; }).catch(() => stopAudition());
  }

  function moveAudition(event: PointerEvent): void {
    if (!auditionEnabled || active) { auditionHover = false; return; }
    if (auditionPointerId === null) {
      auditionHover = !!findAuditionNote(auditionNotes, auditionPoint(event));
      return;
    }
    if (event.pointerId !== auditionPointerId) return;
    const rect = gridViewport!.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.left + gridViewport!.clientWidth
      && event.clientY >= rect.top && event.clientY <= rect.top + height;
    const notes = auditionDrag.move(inside ? auditionNotes : [], auditionPoint(event));
    void auditionPlayer.play(notes.map(note => note.midi), index => { auditionNoteId = notes[index]!.id; }).catch(() => stopAudition());
  }

  function finishAudition(event: PointerEvent): void {
    if (event.pointerId !== auditionPointerId) return;
    endAudition();
    if (event.type === 'pointercancel') auditionPlayer.stop();
    else auditionPlayer.release();
  }

  $effect(() => {
    void auditionEnabled; void active; void speakingMidi; void tuning; void visibleVoiceIds;
    untrack(stopAudition);
  });
  $effect(() => {
    const ids = auditionNoteId ? [auditionNoteId] : [];
    if (referenceSounding && cursorBeat !== null && cursorBeat >= 0) {
      const beat = cursorBeat;
      const parts = scoreVoices.length ? visibleScoreVoices.filter(voice => referenceVoiceIds.includes(voice.id)).map(voice => voice.line) : [line];
      for (const part of parts) part.notes.forEach((note, index) => {
        if (note.midi !== null && note.beat <= beat && beat < note.beat + note.durationBeats) ids.push(`ladukhin-${part.number}-${index}`);
      });
    }
    noteFill.setActiveNotes(ids);
  });
  onDestroy(() => { stopAudition(); noteFill.clear(); });
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
    // Begin following at one quarter of the visible width to leave more score ahead.
    viewportElement.scrollLeft = Math.max(
      0,
      Math.min(maxScrollLeft, cursorX - viewportWidth * 0.25),
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
      const referencePitches = referencePlaying
        ? (scoreVoices.length ? visibleScoreVoices.filter(voice => referenceVoiceIds.includes(voice.id)).map(voice => voice.line) : [line])
          .flatMap(part => {
            const midi = getSolfegePlaybackMidi(part, currentBeat, speakingMidi, tempo, tuning);
            return midi === null ? [] : [{ midi, clarity: 1 }];
          })
        : [];
      const firstPitch = line.notes.find(note => note.midi !== null)?.midi;
      const restingMidi = firstPitch != null ? solfegeMidi(firstPitch, speakingMidi, tuning) : speakingMidi;
      // Preserve detection confidence so the shared indicator applies the same
      // clarity gate and opacity as the main trainer. Silence must not snap the
      // live circle back to a score note or an older recorded sample.
      const indicator = recordingComplete || currentBeat >= line.durationBeats ? null
        : listening ? livePitch
        : { midi: latest && Math.abs(latest.beat - currentBeat) < 0.25 ? latest.midi : restingMidi, clarity: 1 };
      const indicators = referencePlaying
        ? referencePitches
        : indicator ? [indicator] : [];
      for (const pitch of indicators) {
        if (Number.isFinite(pitch.midi) && Number.isFinite(pitch.clarity)) {
          drawUserPitchIndicator(ctx, coords, pitch.midi, pitch.clarity, cursorX, config, fullRowData);
        }
      }
    }
  });
</script>

<svelte:window onblur={stopAudition} />

<div class="grid-viewport" bind:this={gridViewport} bind:clientWidth={availableWidth}>
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="notation-grid" class:audition-hover={auditionHover} bind:this={notationElement} style:width="{width}px" style:height="{height}px"
  onpointerdown={startAudition} onpointermove={moveAudition} onpointerup={finishAudition}
  onpointerleave={() => { auditionHover = false; }}
  onpointercancel={finishAudition} onlostpointercapture={finishAudition}>
  <PitchGrid mode="playback" {fullRowData} {viewport} {cellWidth} {cellHeight}
    noteFillLevels={noteFill.levels}
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
  .grid-viewport::-webkit-scrollbar { height: 18px; }
  .grid-viewport::-webkit-scrollbar-track { background: #f1f4f8; border-radius: 999px; }
  .grid-viewport::-webkit-scrollbar-thumb { background: #c5ceda; border: 3px solid #f1f4f8; border-radius: 999px; }
  .grid-viewport::-webkit-scrollbar-thumb:hover { background: #b5c0ce; }
  @supports not selector(::-webkit-scrollbar) {
    .grid-viewport { scrollbar-color: #c5ceda #f1f4f8; }
  }
  .notation-grid { position: relative; background: #fff; }
  .notation-grid.audition-hover { cursor: pointer; }
  .pitch-overlay { position: absolute; top: 0; pointer-events: none; }
  .countdown { position: absolute; transform-origin: top center; pointer-events: none; border-radius: 50%; width: 36px; height: 36px; display: grid; place-items: center; background: var(--color-bg-light); color: var(--color-text); border: 2px solid var(--color-primary); font-size: 24px; font-weight: 700; }
  .resize-handle { position: relative; height: 12px; margin: 4px -8px -10px; cursor: ns-resize; touch-action: none; user-select: none; border-radius: 0 0 8px 8px; }
  .resize-handle::after { content: ''; position: absolute; width: 40px; height: 3px; border-radius: 2px; background: var(--color-border-strong); left: 50%; top: 5px; transform: translateX(-50%); }
  .resize-handle:hover, .resize-handle.dragging, .resize-handle:focus-visible { background: var(--color-bg-light); outline: 2px solid var(--color-primary); outline-offset: -2px; }
</style>
