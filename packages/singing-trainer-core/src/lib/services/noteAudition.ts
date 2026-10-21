import { getNoteSegmentEntry, type NoteGeometry } from '@mlt/ui-components/canvas/primitives';

export interface AuditionPoint { x: number; y: number }

export interface AuditionNote {
  id: string;
  voiceId: string;
  midi: number;
  geometry?: NoteGeometry;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Segment intersection catches notes skipped between pointer events; geometry refines visible bounds. */
function entryTime(note: AuditionNote, from: AuditionPoint, to: AuditionPoint): number | null {
  let enter = 0;
  let exit = 1;
  const axes: [number, number, number, number][] = [
    [from.x, to.x - from.x, note.left, note.right],
    [from.y, to.y - from.y, note.top, note.bottom],
  ];
  for (const [start, delta, low, high] of axes) {
    if (delta === 0) {
      if (start < low || start > high) return null;
      continue;
    }
    const a = (low - start) / delta;
    const b = (high - start) / delta;
    enter = Math.max(enter, Math.min(a, b));
    exit = Math.min(exit, Math.max(a, b));
    if (enter > exit) return null;
  }
  if (!note.geometry) return enter;
  // Clip to the visible bounds first so hidden caps/legend areas cannot be auditioned.
  const at = (time: number) => ({ x: from.x + (to.x - from.x) * time, y: from.y + (to.y - from.y) * time });
  const shapeEntry = getNoteSegmentEntry(note.geometry, at(enter), at(exit));
  return shapeEntry === null ? null : enter + (exit - enter) * shapeEntry;
}

export function findAuditionNote(notes: readonly AuditionNote[], point: AuditionPoint): AuditionNote | undefined {
  // Closest pitch wins where note bounds overlap; ties follow canvas paint order.
  return [...notes].reverse().filter(note => entryTime(note, point, point) !== null)
    .sort((a, b) => Math.abs(point.y - (a.top + a.bottom) / 2) - Math.abs(point.y - (b.top + b.bottom) / 2))[0];
}

export class NoteAuditionDrag {
  private voiceId: string | null = null;
  private previous: AuditionPoint | null = null;
  private lastNoteId: string | null = null;

  start(notes: readonly AuditionNote[], point: AuditionPoint): AuditionNote | undefined {
    this.end();
    const note = findAuditionNote(notes, point);
    if (!note) return;
    this.voiceId = note.voiceId;
    this.previous = point;
    this.lastNoteId = note.id;
    return note;
  }

  move(notes: readonly AuditionNote[], point: AuditionPoint): AuditionNote[] {
    if (this.voiceId === null || !this.previous) return [];
    const voiceNotes = notes.filter(note => note.voiceId === this.voiceId);
    const crossings = voiceNotes.flatMap(note => {
      const time = entryTime(note, this.previous!, point);
      return time === null ? [] : [{ note, time }];
    }).sort((a, b) => a.time - b.time);
    const result: AuditionNote[] = [];
    for (const { note } of crossings) {
      if (note.id === this.lastNoteId) continue;
      result.push(note);
      this.lastNoteId = note.id;
    }
    if (!findAuditionNote(voiceNotes, point)) this.lastNoteId = null;
    this.previous = point;
    return result;
  }

  end(): void {
    this.voiceId = null;
    this.previous = null;
    this.lastNoteId = null;
  }
}
