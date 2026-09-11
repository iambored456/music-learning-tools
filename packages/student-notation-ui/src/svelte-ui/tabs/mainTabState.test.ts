import { describe, expect, it } from 'vitest';
import { shouldRestoreNoteBank } from './mainTabState.ts';

describe('main tab tool restoration', () => {
  it.each(['timbre', 'chords', 'rhythm'])(
    'restores the remembered note-bank tool when leaving Pitch for %s',
    nextTab => {
      expect(shouldRestoreNoteBank('pitch', nextTab)).toBe(true);
    }
  );

  it('does not restore the note tool when Pitch remains selected', () => {
    expect(shouldRestoreNoteBank('pitch', 'pitch')).toBe(false);
  });

  it.each([null, 'timbre', 'chords', 'rhythm'])(
    'does not alter tools for a transition beginning on %s',
    previousTab => expect(shouldRestoreNoteBank(previousTab, 'pitch')).toBe(false)
  );
});
