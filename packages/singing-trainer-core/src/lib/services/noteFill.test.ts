import { describe, expect, it } from 'vitest';
import { NoteFillAnimator } from './noteFill.js';

describe('sounding note fill', () => {
  it('follows the reference synth attack, decay and sustained level', () => {
    const fill = new NoteFillAnimator();
    fill.setActiveNotes(['note'], 0);
    expect(fill.levels(5).get('note')).toBe(0.5);
    expect(fill.levels(10).get('note')).toBe(1);
    expect(fill.levels(35).get('note')).toBe(0.875);
    expect(fill.levels(10_000).get('note')).toBe(0.75);
    expect(fill.isAnimating(10_000)).toBe(false);
  });

  it('does not restart an attack when the playback clock updates the same active note', () => {
    const fill = new NoteFillAnimator();
    expect(fill.setActiveNotes(['note'], 0)).toBe(true);
    expect(fill.setActiveNotes(['note'], 20)).toBe(false);
    expect(fill.levels(35).get('note')).toBe(0.875);
  });

  it('releases a previous note while attacking the next, without disturbing another voice', () => {
    const fill = new NoteFillAnimator();
    fill.setActiveNotes(['voice-1-a', 'voice-2'], 0);
    fill.setActiveNotes(['voice-1-b', 'voice-2'], 100);
    const levels = fill.levels(115);
    expect(levels.get('voice-1-a')).toBe(0.375);
    expect(levels.get('voice-1-b')).toBe(0.975);
    expect(levels.get('voice-2')).toBe(0.75);
    expect(fill.levels(130).has('voice-1-a')).toBe(false);
  });

  it('cleans up released fills and resets all state when a grid closes', () => {
    const fill = new NoteFillAnimator();
    fill.setActiveNotes(['note'], 0);
    fill.setActiveNotes([], 100);
    expect(fill.isAnimating(110)).toBe(true);
    expect(fill.levels(130).size).toBe(0);
    expect(fill.isAnimating(130)).toBe(false);
    fill.setActiveNotes(['other'], 200);
    fill.clear();
    expect(fill.levels(205).size).toBe(0);
  });
});
