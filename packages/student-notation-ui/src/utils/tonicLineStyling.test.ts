import { describe, expect, it } from 'vitest';
import { getInitialState } from '@mlt/student-notation-engine';
import type { AppState, CanvasSpaceColumn } from '@mlt/types';
import columnMapService from '../services/columnMapService.ts';
import { getTonicLineKind, getTonicLineSections } from './tonicLineStyling.ts';

function addTonic(state: AppState, uuid: string, pitches: string[], preMacrobeatIndex: number, tonicNumber = 1): void {
  state.tonicSignGroups[uuid] = pitches.map(pitch => {
    const row = state.fullRowData.findIndex(row => row.toneNote === pitch);
    expect(row).toBeGreaterThanOrEqual(0);
    return { uuid, row, globalRow: row, columnIndex: 999 as CanvasSpaceColumn, preMacrobeatIndex, tonicNumber };
  });
}

describe('tonic-relative horizontal line styling', () => {
  it('keeps the original C pattern when no tonic is placed', () => {
    const state = getInitialState();
    const map = columnMapService.getColumnMap(state);
    expect(getTonicLineSections(state, map)).toEqual([
      { startColumn: 0, endColumn: map.totalCanvasColumns, referencePitchClass: 0 }
    ]);
    expect(['C4', 'Db4', 'D4', 'Eb4', 'E4', 'F4', 'Gb4', 'G4', 'Ab4', 'A4', 'Bb4', 'B4']
      .map(pitch => getTonicLineKind(pitch, 0)))
      .toEqual(['tonic', 'hidden', 'solid', 'hidden', 'dashed', 'hidden', 'solid', 'fill', 'solid', 'hidden', 'solid', 'hidden']);
  });

  it('uses mapped canvas columns, sorts changes, and collapses octave replicas', () => {
    const state = getInitialState();
    state.macrobeatGroupings = Array(12).fill(2);
    addTonic(state, 'later', ['Bb3', 'Bb4'], 7, 4);
    addTonic(state, 'earlier', ['D3', 'D4'], 3, 6);
    const map = columnMapService.getColumnMap(state);
    expect(getTonicLineSections(state, map)).toEqual([
      { startColumn: 0, endColumn: 8, referencePitchClass: 0 },
      { startColumn: 8, endColumn: 18, referencePitchClass: 2 },
      { startColumn: 18, endColumn: 28, referencePitchClass: 10 }
    ]);
  });

  it('anchors every mode to the tonic and transposes all line and space styles, including accidentals', () => {
    const state = getInitialState();
    for (let mode = 1; mode <= 7; mode++) {
      addTonic(state, 'start', ['Gb4'], -1, mode);
      const sections = getTonicLineSections(state, columnMapService.getColumnMap(state));
      expect(sections[0]?.referencePitchClass).toBe(6);
      expect(['Gb3', 'F#4', 'G4', 'G#4', 'Bb4', 'C#5', 'D5'].map(pitch => getTonicLineKind(pitch, 6)))
        .toEqual(['tonic', 'tonic', 'hidden', 'solid', 'dashed', 'fill', 'solid']);
    }
  });

  it('recomputes sections after a tonic is moved, removed, or restored', () => {
    const state = getInitialState();
    state.macrobeatGroupings = Array(12).fill(2);
    addTonic(state, 'tonic', ['A4'], -1, 6);
    const sections = () => getTonicLineSections(state, columnMapService.getColumnMap(state));
    expect(sections()[0]?.referencePitchClass).toBe(9);
    state.tonicSignGroups.tonic![0]!.preMacrobeatIndex = 3;
    expect(sections().map(section => section.referencePitchClass)).toEqual([0, 9]);
    const saved = state.tonicSignGroups;
    state.tonicSignGroups = {};
    expect(sections().map(section => section.referencePitchClass)).toEqual([0]);
    state.tonicSignGroups = saved;
    expect(sections().map(section => section.referencePitchClass)).toEqual([0, 9]);
  });
});
