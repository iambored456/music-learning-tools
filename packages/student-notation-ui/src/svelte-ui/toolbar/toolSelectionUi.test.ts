import { describe, expect, it, vi } from 'vitest';
import {
  getIntervalHighlightClass,
  getNextUnifiedPositionStep,
  getUnifiedPositionStepCount,
  getUnifiedPositionStepFromPointer,
  isActiveChordSelection,
  syncNoteBankSelection,
  selectNoteBankNote
} from './toolSelectionUi.ts';
import { CHORD_OPTIONAL_INTERVALS, CHORD_SHAPES } from '@data/chordDefinitions.ts';

describe('unified chord position control', () => {
  it('advances through each available position and wraps to Root', () => {
    expect(getNextUnifiedPositionStep(0, 4)).toBe(1);
    expect(getNextUnifiedPositionStep(3, 4)).toBe(0);
  });

  it('caps extended chords at the six positions shown by the control', () => {
    expect(getUnifiedPositionStepCount(1)).toBe(1);
    expect(getUnifiedPositionStepCount(2)).toBe(2);
    expect(getUnifiedPositionStepCount(4)).toBe(4);
    expect(getUnifiedPositionStepCount(7)).toBe(6);
  });

  it('maps the bottom of the position track to Root and the top to the fifth position', () => {
    expect(getUnifiedPositionStepFromPointer(160, 100, 60, 6, 'position')).toBe(0);
    expect(getUnifiedPositionStepFromPointer(100, 100, 60, 6, 'position')).toBe(5);
    expect(getUnifiedPositionStepFromPointer(145, 100, 60, 6, 'position')).toBe(1);
  });

  it('keeps the existing top-down mapping for interval inversion mode', () => {
    expect(getUnifiedPositionStepFromPointer(100, 100, 60, 2, 'inversion')).toBe(0);
    expect(getUnifiedPositionStepFromPointer(115, 100, 60, 2, 'inversion')).toBe(1);
  });

  it('clamps dragging across unavailable position labels', () => {
    expect(getUnifiedPositionStepFromPointer(100, 100, 60, 4, 'position')).toBe(3);
  });
});

describe('notebank sixteenth selection', () => {
  it('opens stamps but finishes with the individual-note tool even if opening restores a stamp', () => {
    let tool = 'sixteenthStamp';
    const store = { setSelectedNote: vi.fn(), setSelectedTool: vi.fn((next: string) => { tool = next; }) };
    const open = vi.fn(() => { tool = 'sixteenthStamp'; });
    selectNoteBankNote(store, 'diamond', '#44bcef', open);
    expect(store.setSelectedNote).toHaveBeenCalledWith('diamond', '#44bcef');
    expect(open).toHaveBeenCalledOnce();
    expect(tool).toBe('note');
  });
  it('keeps the toolbar closed for circles and ovals', () => {
    const store = { setSelectedNote: vi.fn(), setSelectedTool: vi.fn() };
    const open = vi.fn();
    selectNoteBankNote(store, 'circle', '#44bcef', open);
    selectNoteBankNote(store, 'oval', '#44bcef', open);
    expect(open).not.toHaveBeenCalled();
  });
});

describe('chord preset selection' , () => {
  it('recognizes only the exact active chord as a toggle-off click', () => {
    expect(isActiveChordSelection('chord', ['1P', '3M', '5P'], ['1P', '3M', '5P'])).toBe(true);
    expect(isActiveChordSelection('select', ['1P', '3M', '5P'], ['1P', '3M', '5P'])).toBe(false);
    expect(isActiveChordSelection('chord', ['1P', '3M'], ['1P', '3M', '5P'])).toBe(false);
    expect(isActiveChordSelection('chord', ['1P', '3m', '5P'], ['1P', '3M', '5P'])).toBe(false);
  });
  it('recognizes an active Unison as a toggle-off click', () => {
    expect(isActiveChordSelection('chord', ['1P'], ['1P'])).toBe(true);
  });

  it('shows optional chord tones with the weaker active style', () => {
    const active = ['1P', '3M', '5P', '7M'];
    const optional = ['5P'];
    expect(getIntervalHighlightClass(active, optional, '1P')).toBe('selected');
    expect(getIntervalHighlightClass(active, optional, '3M')).toBe('selected');
    expect(getIntervalHighlightClass(active, optional, '5P')).toBe('optional-interval');
    expect(getIntervalHighlightClass(active, optional, '7M')).toBe('selected');
    expect(getIntervalHighlightClass(active, optional, '2M')).toBeNull();
  });

  it.each([
    ['X7', ['5P']], ['x7', ['5P']], ['Xmaj7', ['5P']], ['xmaj7', ['5P']],
    ['X6', ['5P']], ['x6', ['5P']], ['X9', ['5P']], ['x9', ['5P']],
    ['X6/9', ['5P']], ['Xmaj9', ['5P']], ['Xadd9', ['5P']], ['xadd9', ['5P']],
    ['X11', ['5P']], ['x11', ['5P']], ['X13', ['5P', '9M', '11P']],
    ['Xmaj7♯11', ['5P', '9M']], ['X7♯9', ['5P']],
    ['Xmaj13', ['5P', '9M', '11P']], ['Xmaj13♯11', ['5P']],
    ['x13', ['5P', '9M']], ['X13♭9', ['5P']], ['X7♭9', ['5P']]
  ])('marks the requested intervals as optional for %s', (chord, optionalIntervals) => {
    expect(CHORD_OPTIONAL_INTERVALS[chord as string]).toEqual(optionalIntervals);
  });

  it('keeps every optional interval active in its chord preset', () => {
    Object.entries(CHORD_OPTIONAL_INTERVALS).forEach(([chord, optionalIntervals]) => {
      expect(CHORD_SHAPES[chord]).toEqual(expect.arrayContaining(optionalIntervals));
    });
  });

});

describe('note-bank active selection', () => {
  it('clears the note when Text takes over and restores it when Note returns', () => {
    const note = { classList: { add: vi.fn(), remove: vi.fn() } };
    const root = {
      querySelectorAll: () => [note],
      querySelector: vi.fn((selector: string) => selector === ".note[data-color='#81c273'][data-type='oval']" ? note : null)
    } as unknown as Document;
    const settings = { color: '#81c273', shape: 'oval' as const };
    syncNoteBankSelection('draw', settings, root);
    expect(note.classList.remove).toHaveBeenCalledWith('selected');
    expect(note.classList.add).not.toHaveBeenCalled();
    syncNoteBankSelection('note', settings, root);
    expect(note.classList.add).toHaveBeenCalledWith('selected');
  });

  it.each(['select', 'eraser', 'chord', 'tonicization', 'modulation', 'sixteenthStamp', 'sixteenthThreeStamp', 'tripletStamp'])(
    'does not highlight the remembered shape during %s', tool => {
      const query = vi.fn();
      syncNoteBankSelection(tool, { color: '#44bcef', shape: 'circle' }, {
        querySelectorAll: () => [], querySelector: query
      } as unknown as Document);
      expect(query).not.toHaveBeenCalled();
    }
  );
});
