import { describe, expect, it } from 'vitest';
import {
  createStore,
  type CanvasSpaceColumn,
} from '@mlt/student-notation-engine';
import {
  applyImportedStudentNotationData,
  parseImportedStudentNotationData,
  serializeStudentNotationScoreFile,
} from './studentNotationScoreFile.ts';

describe('studentNotationScoreFile', () => {
  it('round-trips score snapshots with tempo, rhythm, tonic/modulation state, and timbres', () => {
    const store = createStore();

    store.state.placedNotes = [
      {
        uuid: 'note-1',
        row: 12,
        globalRow: 12,
        startColumnIndex: 0 as CanvasSpaceColumn,
        endColumnIndex: 3 as CanvasSpaceColumn,
        shape: 'oval',
        color: '#4a90e2',
      },
    ];
    store.state.tempo = 132;
    store.state.showPitchLabels = true;
    store.state.showPitchOctaveLabels = true;
    store.state.macrobeatGroupings = [3, 2, 3];
    store.state.macrobeatBoundaryStyles = ['solid', 'dashed'];
    store.state.hasAnacrusis = true;
    store.state.tonicSignGroups = {
      tonicA: [
        {
          uuid: 'tonicA',
          columnIndex: 5 as CanvasSpaceColumn,
          row: 9,
          globalRow: 9,
          tonicNumber: 4,
          preMacrobeatIndex: 1,
        },
      ],
    };
    store.state.tempoModulationMarkers = [
      {
        id: 'mod-1',
        measureIndex: 2,
        ratio: 1.5,
        active: true,
        xPosition: 320,
        columnIndex: 8 as CanvasSpaceColumn,
        macrobeatIndex: 2,
      },
    ];
    store.state.timbres['#4a90e2'].adsr.attack = 0.42;
    store.state.timbres['#4a90e2'].coeffs = new Float32Array([1, 0.5, 0.25]);
    store.state.timbres['#4a90e2'].phases = new Float32Array([0, Math.PI / 2, Math.PI]);
    store.state.timbres['#4a90e2'].activePresetName = 'custom-blue';

    const serialized = serializeStudentNotationScoreFile(store.state);
    const parsed = parseImportedStudentNotationData(serialized);

    expect(parsed.format).toBe('snapshot');
    if (parsed.format !== 'snapshot') {
      throw new Error('Expected snapshot import');
    }

    expect(parsed.data.tempo).toBe(132);
    expect(parsed.data.showPitchLabels).toBe(true);
    expect(parsed.data.showPitchOctaveLabels).toBe(true);
    expect(parsed.data.macrobeatGroupings).toEqual([3, 2, 3]);
    expect(parsed.data.macrobeatBoundaryStyles).toEqual(['solid', 'dashed']);
    expect(parsed.data.hasAnacrusis).toBe(true);
    expect(parsed.data.tonicSignGroups.tonicA?.[0]?.tonicNumber).toBe(4);
    expect(parsed.data.tempoModulationMarkers[0]?.ratio).toBe(1.5);
    expect(parsed.data.timbres['#4a90e2']?.coeffs).toBeInstanceOf(Float32Array);
    expect(Array.from(parsed.data.timbres['#4a90e2']?.coeffs ?? [])).toEqual([1, 0.5, 0.25]);
    expect(parsed.data.timbres['#4a90e2']?.activePresetName).toBe('custom-blue');

    const targetStore = createStore();
    applyImportedStudentNotationData(targetStore, parsed);

    expect(targetStore.state.tempo).toBe(132);
    expect(targetStore.state.showPitchLabels).toBe(true);
    expect(targetStore.state.showPitchOctaveLabels).toBe(true);
    expect(targetStore.state.macrobeatGroupings).toEqual([3, 2, 3]);
    expect(targetStore.state.macrobeatBoundaryStyles).toEqual(['solid', 'dashed']);
    expect(targetStore.state.tonicSignGroups.tonicA?.[0]?.columnIndex).toBe(5);
    expect(targetStore.state.tempoModulationMarkers[0]?.columnIndex).toBe(8);
    expect(targetStore.state.timbres['#4a90e2']?.coeffs).toBeInstanceOf(Float32Array);
    const restoredPhases = Array.from(targetStore.state.timbres['#4a90e2']?.phases ?? []);
    expect(restoredPhases).toHaveLength(3);
    expect(restoredPhases[0]).toBeCloseTo(0, 6);
    expect(restoredPhases[1]).toBeCloseTo(Math.PI / 2, 6);
    expect(restoredPhases[2]).toBeCloseTo(Math.PI, 6);
    expect(targetStore.state.historyIndex).toBe(1);
  });

  it('rejects non-JSON imports', () => {
    expect(() => parseImportedStudentNotationData('12,0,1,#4a90e2,circle,,false,\n'))
      .toThrow('Student Notation imports now require a JSON score file.');
  });

  it('migrates legacy sixteenth stamps from canvas columns to time indices', () => {
    const legacyScore = {
      type: 'student-notation-score',
      version: 2,
      exportedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
      data: {
        macrobeatGroupings: [2, 2, 2],
        macrobeatBoundaryStyles: ['dashed', 'solid'],
        tonicSignGroups: {
          tonicA: [
            {
              uuid: 'tonicA',
              columnIndex: 5,
              row: 9,
              globalRow: 9,
              tonicNumber: 4,
              preMacrobeatIndex: 1,
            },
            {
              uuid: 'tonicA',
              columnIndex: 5,
              row: 10,
              globalRow: 10,
              tonicNumber: 4,
              preMacrobeatIndex: 1,
            },
          ],
        },
        sixteenthStampPlacements: [
          {
            id: 'legacy-sixteenth',
            sixteenthStampId: 7,
            startColumn: 10,
            endColumn: 12,
            row: 12,
            globalRow: 12,
            color: '#4a90e2',
            timestamp: 1,
            shapeOffsets: {},
          },
        ],
      },
    };

    const parsed = parseImportedStudentNotationData(JSON.stringify(legacyScore));
    const migratedStamp = parsed.data.sixteenthStampPlacements[0]!;

    expect(migratedStamp.startTimeIndex).toBe(8);
    expect('startColumn' in migratedStamp).toBe(false);
    expect('endColumn' in migratedStamp).toBe(false);
  });
});
