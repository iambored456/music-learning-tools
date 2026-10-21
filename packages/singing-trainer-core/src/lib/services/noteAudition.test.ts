import { describe, expect, it } from 'vitest';
import { NoteAuditionDrag, findAuditionNote, type AuditionNote } from './noteAudition.js';
import { createTargetNoteGeometry, getNoteBounds } from '@mlt/ui-components/canvas/primitives';

const notes: AuditionNote[] = [
  { id: 'a', voiceId: 'one', midi: 60, left: 0, right: 20, top: 0, bottom: 20 },
  { id: 'b', voiceId: 'one', midi: 64, left: 40, right: 60, top: 0, bottom: 20 },
  { id: 'c', voiceId: 'one', midi: 67, left: 80, right: 100, top: 0, bottom: 20 },
  { id: 'd', voiceId: 'two', midi: 72, left: 0, right: 100, top: 40, bottom: 60 },
];

describe('click and drag note audition', () => {
  it('follows rounded note geometry and clips hidden portions of a note', () => {
    const geometry = createTargetNoteGeometry(0, 100, 10, 10)!;
    const rounded = { ...notes[0]!, ...getNoteBounds(geometry), geometry };
    expect(findAuditionNote([rounded], { x: 0.1, y: 0.1 })).toBeUndefined();
    expect(findAuditionNote([rounded], { x: 2, y: 10 })?.id).toBe('a');
    const clipped = { ...rounded, left: 30 };
    expect(findAuditionNote([clipped], { x: 20, y: 10 })).toBeUndefined();
    expect(findAuditionNote([clipped], { x: 30, y: 10 })?.id).toBe('a');
  });

  it('catches fast crossings through rounded caps while retaining the starting voice', () => {
    const rounded = notes.map(note => {
      const geometry = createTargetNoteGeometry(note.left, note.right, (note.top + note.bottom) / 2, 10)!;
      return { ...note, geometry };
    });
    const drag = new NoteAuditionDrag();
    drag.start(rounded, { x: 10, y: 10 });
    expect(drag.move(rounded, { x: 90, y: 10 }).map(note => note.id)).toEqual(['b', 'c']);
    expect(drag.move(rounded, { x: 90, y: 50 })).toEqual([]);
  });

  it('starts only on a note and locks the drag to its voice', () => {
    const drag = new NoteAuditionDrag();
    expect(drag.start(notes, { x: 10, y: 10 })?.midi).toBe(60);
    expect(drag.move(notes, { x: 10, y: 50 })).toEqual([]);
    expect(drag.move(notes, { x: 90, y: 50 })).toEqual([]);
    drag.end();
    expect(drag.start(notes, { x: 10, y: 50 })?.voiceId).toBe('two');
    expect(drag.move(notes, { x: 90, y: 10 })).toEqual([]);
  });

  it('catches every crossed note in order, including fast drags and reverse movement', () => {
    const drag = new NoteAuditionDrag();
    drag.start(notes, { x: 10, y: 10 });
    expect(drag.move(notes, { x: 90, y: 10 }).map(note => note.id)).toEqual(['b', 'c']);
    expect(drag.move(notes, { x: 10, y: 10 }).map(note => note.id)).toEqual(['b', 'a']);
  });

  it('does not retrigger while staying on a note, but allows leaving and reentering it', () => {
    const drag = new NoteAuditionDrag();
    drag.start(notes, { x: 10, y: 10 });
    expect(drag.move(notes, { x: 15, y: 10 })).toEqual([]);
    expect(drag.move(notes, { x: 30, y: 10 })).toEqual([]);
    expect(drag.move(notes, { x: 10, y: 10 }).map(note => note.id)).toEqual(['a']);
    drag.end();
    expect(drag.move(notes, { x: 90, y: 10 })).toEqual([]);
  });

  it('ignores blank starts and excluded voices', () => {
    const drag = new NoteAuditionDrag();
    expect(drag.start(notes, { x: 30, y: 10 })).toBeUndefined();
    expect(drag.move(notes, { x: 50, y: 10 })).toEqual([]);
    expect(drag.start(notes.filter(note => note.voiceId === 'one'), { x: 10, y: 50 })).toBeUndefined();
  });

  it('chooses the closest pitch and the topmost painted voice at exact unisons', () => {
    const drag = new NoteAuditionDrag();
    const overlap = { ...notes[0]!, id: 'overlap', voiceId: 'two', top: 10, bottom: 30 };
    expect(drag.start([...notes, overlap], { x: 10, y: 12 })?.id).toBe('a');
    expect(drag.start([...notes, { ...overlap, top: 0, bottom: 20 }], { x: 10, y: 10 })?.id).toBe('overlap');
  });
});
