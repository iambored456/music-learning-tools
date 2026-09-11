import { afterEach, describe, expect, it, vi } from 'vitest';
import * as Tone from 'tone';
import { createTransportService } from '@mlt/student-notation-engine/audio';
import type { TransportConfig, TransportState } from '@mlt/student-notation-engine/audio';

vi.mock('tone', () => ({
  Transport: { bpm: { value: 120 }, state: 'started', position: 0, cancel: vi.fn(), pause: vi.fn(), start: vi.fn(),
    schedule: vi.fn(), on: vi.fn(), off: vi.fn() },
  Draw: { schedule: vi.fn() }
}));
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

describe('individual sixteenth transport scheduling', () => {
  it('uses zero-time tonic columns and tempo modulation for fractional endpoints', () => {
    vi.useFakeTimers();
    const state = {
      tempo: 120, columnWidths: [1, 1, 1, 1, 1, 1], cellWidth: 40,
      fullRowData: [{ toneNote: 'C4', hex: '#fff' }], macrobeatGroupings: [2, 2],
      macrobeatBoundaryStyles: ['solid'], tempoModulationMarkers: [{ id: 'm', measureIndex: 0, active: true, ratio: 2 }],
      timbres: { blue: { adsr: {} } }, placedNotes: [{ uuid: 'note', row: 0, shape: 'diamond', color: 'blue',
        startColumnIndex: 4.5, endColumnIndex: 4.5, durationMicrobeats: 0.5 }]
    } as unknown as TransportState;
    const config = { synthEngine: {}, stateCallbacks: { getState: () => state,
      getPlacedTonicSigns: () => [{ columnIndex: 2 }], getTonicSpanColumnIndices: () => new Set([2, 3]),
      getMacrobeatInfo: () => ({ startColumn: 0, endColumn: 2 }) },
      eventCallbacks: { on: vi.fn(), emit: vi.fn() }, drumManager: { reset: vi.fn() } } as unknown as TransportConfig;
    const service = createTransportService(config);
    service.init();
    service.handleStateChange();
    vi.runOnlyPendingTimers();
    const times: number[] = vi.mocked(Tone.Transport.schedule).mock.calls.map((call: unknown[]) => Number(call[1]));
    expect(times).toEqual([0.75, 1]);
  });

  it.each([60, 120, 180])('schedules half-column attacks and releases at %s BPM', tempo => {
    vi.useFakeTimers();
    const state = {
      tempo, columnWidths: [1, 1, 1, 1], cellWidth: 40, fullRowData: [{ toneNote: 'C4', hex: '#fff' }],
      macrobeatGroupings: [2, 2], macrobeatBoundaryStyles: ['solid'], tempoModulationMarkers: [],
      timbres: { blue: { adsr: {} } },
      placedNotes: [0, 0.5, 1, 1.5, 3.5].map(start => ({ uuid: `note-${start}`, row: 0, shape: 'diamond', color: 'blue',
        startColumnIndex: start, endColumnIndex: start, durationMicrobeats: 0.5 })),
    } as unknown as TransportState;
    const config = { synthEngine: {}, stateCallbacks: { getState: () => state }, eventCallbacks: { on: vi.fn(), emit: vi.fn() },
      drumManager: { reset: vi.fn() } } as unknown as TransportConfig;
    const service = createTransportService(config);
    service.init();
    service.handleStateChange();
    vi.runOnlyPendingTimers();
    const times: number[] = vi.mocked(Tone.Transport.schedule).mock.calls.map((call: unknown[]) => Number(call[1]));
    const microbeat = 30 / tempo;
    const expected = [0, 0.5, 0.5, 1, 1, 1.5, 1.5, 2, 3.5, 4].map(column => column * microbeat);
    expect(times).toHaveLength(expected.length);
    times.forEach((time, i) => expect(time).toBeCloseTo(expected[i]!));
  });
});
