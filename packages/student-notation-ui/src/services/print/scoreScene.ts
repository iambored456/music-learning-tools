import { getNoteEndColumn, type AppState, type PlacedNote, type PrintOptions } from '@mlt/types';
import { createSixteenthHexPath } from '@mlt/notation-glyphs';
import { Note, Scale } from 'tonal';
import columnMapService, { timeToCanvas } from '../columnMapService.ts';
import pixelMapService from '../pixelMapService.ts';
import TonalService from '../tonalService.ts';
import { getMacrobeatInfo, getPlacedTonicSigns } from '../../state/selectors.ts';
import { getSixteenthStampById } from '../../rhythm/sixteenthStamps.ts';
import { getSixteenthThreeStampById } from '../../rhythm/sixteenthThreeStamps.ts';
import { getTripletStampById } from '../../rhythm/tripletStamps.ts';
import { BASE_ABSTRACT_UNIT, GRID_WIDTH_RATIO, DRUM_ROW_COUNT, DEFAULT_MIN_PRINT_ROW, DEFAULT_MAX_PRINT_ROW } from '../../core/constants.ts';
import { getDrumRowHeightFromCellHeight } from '../../utils/drumGridSizing.ts';
import { getLegendTotalWidthPx } from '../../utils/legendSizing.ts';
import { getTonicLineKind, getTonicLineSections } from '../../utils/tonicLineStyling.ts';
import { renderPrintAnnotations } from './annotations.ts';
import { printColor, svgElement as el, svgLine as line, svgRect as rect, svgText as text } from './svg.ts';
import type { PrintGeometry } from './pageLayout.ts';

export interface ScoreScene extends PrintGeometry {
  music: string;
  leftLegend: string;
  rightLegend: string;
  barCount: number;
  hasPickup: boolean;
  topRow: number;
  bottomRow: number;
  continuations: { start: number; end: number; y: number; color: string }[];
}

/** Freeze drawing inputs with canonical print metrics. History and transient selection are discarded. */
export function snapshotPrintScore(source: AppState): AppState {
  return structuredClone({
    ...source,
    history: [],
    lassoSelection: { selectedItems: [], convexHull: null, isActive: false },
    isPlaying: false, isPaused: false, playbackStartMacrobeatIndex: null,
    placedNotes: source.placedNotes, tonicSignGroups: source.tonicSignGroups,
    sixteenthStampPlacements: source.sixteenthStampPlacements,
    sixteenthThreeStampPlacements: source.sixteenthThreeStampPlacements,
    tripletStampPlacements: source.tripletStampPlacements, annotations: source.annotations,
    fullRowData: source.fullRowData, pitchRange: source.pitchRange,
    macrobeatGroupings: source.macrobeatGroupings, macrobeatBoundaryStyles: source.macrobeatBoundaryStyles,
    hasAnacrusis: source.hasAnacrusis, tempoModulationMarkers: source.tempoModulationMarkers,
    degreeDisplayMode: source.degreeDisplayMode, showPitchLabels: source.showPitchLabels,
    showPitchOctaveLabels: source.showPitchOctaveLabels, accidentalMode: source.accidentalMode,
    showFrequencyLabels: source.showFrequencyLabels, showOctaveLabels: source.showOctaveLabels,
    focusColours: source.focusColours, longNoteStyle: source.longNoteStyle,
    cellHeight: BASE_ABSTRACT_UNIT, cellWidth: BASE_ABSTRACT_UNIT * GRID_WIDTH_RATIO,
    baseMicrobeatPx: BASE_ABSTRACT_UNIT * GRID_WIDTH_RATIO,
    columnWidths: [], musicalColumnWidths: []
  });
}

function resolvePitchRange(state: AppState, options: PrintOptions): [number, number] {
  const occupied: number[] = [];
  for (const note of state.placedNotes) if (!note.isDrum) occupied.push(note.globalRow ?? note.row);
  // Only actual stamp notes contribute: an anchor or an unused shape offset is not a pitch.
  function includeStampNotes(stamp: { row: number; globalRow?: number; shapeOffsets?: Record<string, number> }, keys: string[]): void {
    const row = stamp.globalRow ?? stamp.row;
    for (const key of keys) occupied.push(row + (stamp.shapeOffsets?.[key] ?? 0));
  }
  for (const stamp of state.sixteenthStampPlacements) {
    const pattern = getSixteenthStampById(stamp.sixteenthStampId);
    includeStampNotes(stamp, [
      ...(pattern?.diamonds ?? []).map(slot => `diamond_${slot}`),
      ...(pattern?.ovals ?? []).map(slot => `oval_${slot}`)
    ]);
  }
  for (const stamp of state.sixteenthThreeStampPlacements) {
    const pattern = getSixteenthThreeStampById(stamp.sixteenthThreeStampId);
    includeStampNotes(stamp, [
      ...(pattern?.diamonds ?? []).map(slot => `diamond_${slot}`),
      ...(pattern?.ovals ?? []).map(slot => `oval_${slot}`)
    ]);
  }
  for (const stamp of state.tripletStampPlacements) {
    const pattern = getTripletStampById(stamp.tripletStampId);
    includeStampNotes(stamp, (pattern?.hits ?? []).map(slot => `triplet_${slot}`));
  }
  // Tonics, legends, drums and annotations must not enlarge the fitted pitch range.
  const valid = occupied.filter(Number.isFinite);
  let top = valid.length ? Math.floor(Math.min(...valid)) : DEFAULT_MIN_PRINT_ROW;
  let bottom = valid.length ? Math.ceil(Math.max(...valid)) : DEFAULT_MAX_PRINT_ROW;
  if (options.pitchRangeMode === 'viewport') ({ topIndex: top, bottomIndex: bottom } = state.pitchRange);
  top = options.topRow ?? top;
  bottom = options.bottomRow ?? bottom;
  const last = Math.max(0, state.fullRowData.length - 1);
  top = Math.max(0, Math.min(last, Math.floor(top)));
  bottom = Math.max(top, Math.min(last, Math.ceil(bottom)));
  return [top, bottom];
}

/** Dedicated vector renderer. No canvas capture, DOM measurement, theme, or live store access. */
export function buildScoreScene(state: AppState, options: PrintOptions): ScoreScene {
  const cell = BASE_ABSTRACT_UNIT;
  const half = cell / 2;
  const [topRow, bottomRow] = resolvePitchRange(state, options);
  const header = options.includeButtonGrid ? cell * 1.8 : 0;
  const pitchHeight = (bottomRow - topRow + 2) * half;
  const drumRowHeight = getDrumRowHeightFromCellHeight(cell);
  const drumTop = header + pitchHeight;
  const height = drumTop + (options.includeDrums ? DRUM_ROW_COUNT * drumRowHeight : 0);
  const legendWidth = getLegendTotalWidthPx(state.cellWidth, cell);
  const map = columnMapService.getColumnMap(state);
  // The shared pixel service's screen cache does not include all score inputs.
  pixelMapService.invalidate();
  const pixelOptions = { cellWidth: state.cellWidth, baseMicrobeatPx: state.cellWidth, tempoModulationMarkers: state.tempoModulationMarkers };
  const positions = Array.from({ length: map.totalCanvasColumns + 1 }, (_, column) => pixelMapService.columnToPixelX(column, pixelOptions, state));
  // Do not leave canonical print coordinates in the live editor's shared cache.
  pixelMapService.invalidate();
  const width = positions.at(-1) || state.cellWidth;
  const x = (column: number): number => {
    const clamped = Math.max(0, Math.min(map.totalCanvasColumns, column));
    const index = Math.floor(clamped);
    const start = positions[index] ?? width;
    return start + (clamped - index) * ((positions[index + 1] ?? start) - start);
  };
  const y = (globalRow: number): number => header + (globalRow - topRow + 1) * half;
  const timeX = (time: number, end = false): number => {
    // At an integer end boundary, stop before any following zero-time tonic columns.
    if (end && Number.isInteger(time) && time > 0) return x(timeToCanvas(time - 1, state) + 1);
    return x(timeToCanvas(time, state));
  };
  const color = (value: string | undefined): string => printColor(value, options.colorMode === 'bw');
  const music: string[] = [rect(0, 0, width, height, '#ffffff')];
  const leftLegend: string[] = [rect(0, 0, legendWidth, height, '#ffffff')];
  const rightLegend: string[] = [...leftLegend];
  const focusPitches = new Set<number | undefined>();
  if (state.focusColours) {
    const modes = ['major', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'minor', 'locrian'];
    for (const sign of getPlacedTonicSigns(state)) {
      const tonic = state.fullRowData[sign.globalRow ?? sign.row]?.toneNote.replace(/-?\d+$/, '');
      const mode = modes[sign.tonicNumber - 1];
      if (tonic && mode) for (const pitch of Scale.get(`${tonic} ${mode}`).notes) focusPitches.add(Note.chroma(pitch));
    }
    focusPitches.delete(undefined);
  }
  const continuations: ScoreScene['continuations'] = [];
  const beats = state.macrobeatGroupings.map((_, index) => ({ index, ...getMacrobeatInfo(state, index) }));
  const allMeasureEnds: number[] = [];
  let measureStart = 0;
  let measureNumber = state.hasAnacrusis ? 0 : 1;
  let microbeats = 0;
  let containsTriple = false;
  for (const beat of beats) {
    microbeats += beat.grouping;
    containsTriple ||= beat.grouping === 3;
    const end = x(beat.endColumn + 1);
    if (options.includeButtonGrid) {
      music.push(text((x(beat.startColumn) + end) / 2, cell * 1.25, beat.grouping, cell * 0.48));
    }
    if (state.macrobeatBoundaryStyles[beat.index] === 'solid' || beat.index === beats.length - 1) {
      allMeasureEnds.push(end);
      if (options.includeButtonGrid) {
        music.push(text((measureStart + end) / 2, cell * 0.4,
          `${measureNumber === 0 ? 'Pickup' : measureNumber} · ${containsTriple ? `${microbeats}/8` : `${microbeats / 2}/4`}`, cell * 0.36));
      }
      measureNumber++;
      measureStart = end;
      microbeats = 0;
      containsTriple = false;
    }
  }
  // A pickup belongs with the first regular bar, rather than consuming a bars-per-line slot.
  const hasPickup = state.hasAnacrusis && allMeasureEnds.length > 1;
  const measureEnds = hasPickup ? allMeasureEnds.slice(1) : allMeasureEnds;
  const lineSections = getTonicLineSections(state, map);

  for (let rowIndex = topRow; rowIndex <= bottomRow; rowIndex++) {
    const row = state.fullRowData[rowIndex];
    if (!row || row.isBoundary) continue;
    const center = y(rowIndex);
    for (const section of lineSections) {
      const kind = getTonicLineKind(row.toneNote, section.referencePitchClass);
      const start = x(section.startColumn);
      const end = x(section.endColumn);
      if (kind === 'fill') music.push(rect(start, center - half, end - start, cell, '#dee2e6'));
      else if (kind !== 'hidden') {
        music.push(line(start, center, end, center, color(kind === 'tonic' ? '#e04747' : '#adb5bd'), kind === 'tonic' ? 2.4 : 0.7, kind === 'dashed' ? '4 4' : ''));
      }
    }
    const focused = !focusPitches.size || focusPitches.has(Note.chroma(row.toneNote));
    const hiddenAccidental = row.isAccidental && !state.accidentalMode.sharp && !state.accidentalMode.flat && !state.showFrequencyLabels;
    if (!focused || hiddenAccidental) continue;
    // Mirror the column order, but keep text readable: left B/A, right A/B.
    const columnWidth = legendWidth / 2;
    let label = row.isAccidental
      ? (state.accidentalMode.sharp && state.accidentalMode.flat ? row.pitch : state.accidentalMode.flat ? row.flatName : row.sharpName)
      : row.pitch;
    if (!state.showOctaveLabels) label = label.replace(/-?\d+/g, '');
    if (state.showFrequencyLabels) label = String(row.frequency);
    for (const [legend, firstColumn] of [[leftLegend, 'B'], [rightLegend, 'A']] as const) {
      const lx = row.column === firstColumn ? 0 : columnWidth;
      legend.push(rect(lx, center - half, columnWidth, cell, color(row.hex), { stroke: '#ffffff', 'stroke-width': 0.5 }));
      legend.push(text(lx + columnWidth / 2, center, label.replace(/#/g, '♯'), Math.min(cell * 0.42, columnWidth / Math.max(1, label.length) * 1.55), '#ffffff', { stroke: '#333333', 'stroke-width': 0.4, 'paint-order': 'stroke' }));
    }
  }

  const tonicColumns = new Set(map.entries.filter(entry => entry.type === 'tonic').map(entry => entry.canvasIndex));
  for (const entry of map.entries) {
    if (entry.canvasIndex === null) continue;
    const col = entry.canvasIndex;
    if (entry.type === 'tonic') {
      music.push(rect(x(col), header, x(col + 1) - x(col), height - header, '#ffffff', { opacity: 0.65 }));
      continue;
    }
    if (entry.isMacrobeatEnd) {
      const style = state.macrobeatBoundaryStyles[entry.macrobeatIndex!];
      music.push(line(x(col + 1), header, x(col + 1), height, '#adb5bd', style === 'solid' ? 1.3 : 0.7, style === 'solid' ? '' : '4 4'));
    }
  }
  music.push(line(0, header, 0, height), line(width, header, width, height));

  const labelFor = (note: PlacedNote): string | null => state.showPitchLabels
    ? TonalService.getPitchLabelForNote(note, state)
    : state.degreeDisplayMode !== 'off' ? TonalService.getDegreeLabelForNote(note, state).label : null;
  function notehead(start: number, end: number, row: number, shape: PlacedNote['shape'], shade: string, note?: PlacedNote): void {
    const w = end - start;
    if (!(w > 0) || row < topRow - 1 || row > bottomRow + 1) return;
    const cx = (start + end) / 2;
    const cy = y(row);
    const stroke = Math.min(2.2, w * 0.15);
    const rx = Math.max(0.5, w / 2 - stroke / 2);
    const ry = cell / 2 - stroke / 2;
    music.push(shape === 'diamond'
      ? el('path', { d: createSixteenthHexPath(cx, cy, rx * 2, ry * 2), fill: 'none', stroke: shade, 'stroke-width': stroke })
      : el('ellipse', { cx, cy, rx, ry, fill: 'none', stroke: shade, 'stroke-width': stroke }));
    const label = note ? labelFor(note) : null;
    if (label) music.push(text(cx, cy, label, Math.min(cell * 0.45, w * 1.1 / label.length), shade));
  }

  for (const note of state.placedNotes) {
    if (note.isDrum) continue;
    const row = note.globalRow ?? note.row;
    const start = x(note.startColumnIndex);
    const end = x(getNoteEndColumn(note));
    const headDuration = note.shape === 'circle' ? 2 : note.shape === 'diamond' ? 0.5 : 1;
    const headEnd = x(Math.min(getNoteEndColumn(note), note.startColumnIndex + headDuration));
    const shade = color(note.color);
    if (end > headEnd + 0.001) {
      continuations.push({ start, end, y: y(row), color: shade });
      if (state.longNoteStyle === 'style2' && note.shape === 'circle') {
        music.push(rect(start + 1, y(row) - half + 1, end - start - 2, cell - 2, 'none', { rx: half - 1, stroke: shade, 'stroke-width': 2 }));
        const label = labelFor(note);
        if (label) music.push(text((start + headEnd) / 2, y(row), label, cell * 0.4, shade));
        continue;
      }
      music.push(line((start + headEnd) / 2, y(row), end, y(row), shade, 2.5));
    }
    notehead(start, headEnd, row, note.shape, shade, note);
  }

  function stampHead(placement: { id: string; row: number; globalRow?: number; color: string; shapeOffsets?: Record<string, number> }, key: string, startTime: number, duration: number, shape: PlacedNote['shape']): void {
    const row = (placement.globalRow ?? placement.row) + (placement.shapeOffsets?.[key] ?? 0);
    const column = timeToCanvas(startTime, state);
    const note = { uuid: placement.id, row, globalRow: row, shape, color: placement.color,
      startColumnIndex: column, endColumnIndex: column } as PlacedNote;
    notehead(timeX(startTime), timeX(startTime + duration, true), row, shape, color(placement.color), note);
  }
  for (const stamp of state.sixteenthStampPlacements) {
    const pattern = getSixteenthStampById(stamp.sixteenthStampId);
    for (const slot of pattern?.diamonds ?? []) stampHead(stamp, `diamond_${slot}`, stamp.startTimeIndex + slot / 2, 0.5, 'diamond');
    for (const slot of pattern?.ovals ?? []) stampHead(stamp, `oval_${slot}`, stamp.startTimeIndex + slot / 2, 1, 'oval');
  }
  for (const stamp of state.sixteenthThreeStampPlacements) {
    const pattern = getSixteenthThreeStampById(stamp.sixteenthThreeStampId);
    for (const slot of pattern?.diamonds ?? []) stampHead(stamp, `diamond_${slot}`, stamp.startTimeIndex + slot / 2, 0.5, 'diamond');
    for (const slot of pattern?.ovals ?? []) stampHead(stamp, `oval_${slot}`, stamp.startTimeIndex + slot / 2, 1, 'oval');
  }
  for (const stamp of state.tripletStampPlacements) {
    const pattern = getTripletStampById(stamp.tripletStampId);
    const span = stamp.span > 0 ? stamp.span * 2 : pattern?.span === 'quarter' ? 4 : 2;
    for (const slot of pattern?.hits ?? []) stampHead(stamp, `triplet_${slot}`, stamp.startTimeIndex + slot * span / 3, span / 3, 'oval');
    music.push(text((timeX(stamp.startTimeIndex) + timeX(stamp.startTimeIndex + span, true)) / 2,
      y(stamp.globalRow ?? stamp.row) - half * 1.2, '3', cell * 0.3, color(stamp.color)));
  }
  for (const sign of getPlacedTonicSigns(state)) {
    const column = map.entries.find(entry => entry.type === 'tonic' && sign.uuid && entry.tonicSignUuid === sign.uuid)?.canvasIndex ?? sign.columnIndex;
    const cx = (x(column) + x(column + 2)) / 2;
    const cy = y(sign.globalRow ?? sign.row);
    music.push(el('circle', { cx, cy, r: Math.min(cell, x(column + 2) - x(column)) * 0.45, fill: '#ffffff', stroke: '#444444', 'stroke-width': 1.5 }), text(cx, cy, sign.tonicNumber, cell * 0.6));
  }
  for (const marker of state.tempoModulationMarkers.filter(marker => marker.active)) {
    const column = marker.measureIndex === 0 ? 0 : (getMacrobeatInfo(state, marker.measureIndex - 1).endColumn + 1);
    const mx = x(column);
    music.push(line(mx, header, mx, height, '#444444', 1.6, '2 3'));
    if (header) music.push(text(mx, header - cell * 0.15, Math.abs(marker.ratio - 2 / 3) < 0.001 ? '2:3' : Math.abs(marker.ratio - 1.5) < 0.001 ? '3:2' : marker.ratio.toFixed(2), cell * 0.28));
  }

  if (options.includeDrums) {
    for (let track = 0; track < DRUM_ROW_COUNT; track++) {
      music.push(line(0, drumTop + track * drumRowHeight, width, drumTop + track * drumRowHeight));
      const drumLabel = text(legendWidth / 2, drumTop + (track + 0.5) * drumRowHeight, ['High', 'Middle', 'Low'][track], cell * 0.33);
      leftLegend.push(drumLabel);
      rightLegend.push(drumLabel);
      for (let column = 0; column < map.totalCanvasColumns; column++) {
        if (tonicColumns.has(column)) continue;
        const hit = state.placedNotes.find(note => note.isDrum && String(note.drumTrack) === ['H', 'M', 'L'][track] && note.startColumnIndex === column);
        const cy = drumTop + (track + 0.5) * drumRowHeight;
        const start = x(column), w = x(column + 1) - start;
        if (!hit) { music.push(el('circle', { cx: start + w / 2, cy, r: 1, fill: '#ced4da' })); continue; }
        const centers = hit.drumSubdivision === 'double' ? [0.25, 0.75] : hit.drumSubdivision === 'secondOnly' ? [0.75] : [0.5];
        for (const fraction of centers) {
          const cx = start + w * fraction;
          const radius = Math.min(drumRowHeight, w / (hit.drumSubdivision && hit.drumSubdivision !== 'single' ? 2 : 1)) * 0.4;
          const sides = track === 0 ? 3 : track === 1 ? 4 : 5;
          const points = Array.from({ length: sides }, (_, i) => `${cx + radius * Math.cos(i * Math.PI * 2 / sides - Math.PI / 2)},${cy + radius * Math.sin(i * Math.PI * 2 / sides - Math.PI / 2)}`).join(' ');
          music.push(el('polygon', { points, fill: color(hit.color) }));
        }
      }
    }
  }
  music.push(renderPrintAnnotations(state.annotations, x, y, color, cell));
  return { width, height, legendWidth, gap: cell, measureEnds, barCount: measureEnds.length,
    hasPickup, music: music.join(''), leftLegend: leftLegend.join(''), rightLegend: rightLegend.join(''), topRow, bottomRow, continuations };
}
