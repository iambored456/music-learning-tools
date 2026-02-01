import { describe, it, expect } from 'vitest';
import { findDiatonicMajor, pcToName } from './diatonicAnalysis.js';
import { scanKeyChangesMajor } from './scanKeyChangesMajor.js';

/** Repeat each value N times (grouped: [a,a,a,b,b,b,...]) */
function repeat(values: number[], times: number): number[] {
  const out: number[] = [];
  for (const v of values) {
    for (let i = 0; i < times; i++) out.push(v);
  }
  return out;
}

/** Cycle through values N full rounds (interleaved: [a,b,c,a,b,c,...]) */
function cycle(values: number[], rounds: number): number[] {
  const out: number[] = [];
  for (let r = 0; r < rounds; r++) {
    for (const v of values) out.push(v);
  }
  return out;
}

// ── pcToName ───────────────────────────────────────────────────────────────

describe('pcToName', () => {
  it('returns sharp names', () => {
    expect(pcToName(0)).toBe('C');
    expect(pcToName(1)).toBe('C#');
    expect(pcToName(11)).toBe('B');
  });
});

// ── findDiatonicMajor ──────────────────────────────────────────────────────

describe('findDiatonicMajor', () => {
  it('returns UNCERTAIN for empty input', () => {
    const r = findDiatonicMajor([]);
    expect(r.certainty).toBe('UNCERTAIN');
    expect(r.diagnostics.totalNotes).toBe(0);
  });

  it('detects C major from all 7 scale tones → CERTAIN', () => {
    const r = findDiatonicMajor(repeat([60, 62, 64, 65, 67, 69, 71], 4));
    expect(r.certainty).toBe('CERTAIN');
    expect(r.candidates[0].tonicPc).toBe(0);
    expect(r.candidates[0].tonicName).toBe('C');
    expect(r.candidates[0].outCount).toBe(0);
    expect(r.candidates[0].chromatic).toHaveLength(0);
  });

  it('detects B major → CERTAIN', () => {
    const r = findDiatonicMajor(repeat([71, 73, 75, 76, 78, 80, 82], 4));
    expect(r.certainty).toBe('CERTAIN');
    expect(r.candidates[0].tonicPc).toBe(11);
  });

  it('detects G major → CERTAIN', () => {
    const r = findDiatonicMajor(repeat([67, 69, 71, 72, 74, 76, 78], 4));
    expect(r.certainty).toBe('CERTAIN');
    expect(r.candidates[0].tonicPc).toBe(7);
  });

  it('full chromatic → UNCERTAIN', () => {
    const r = findDiatonicMajor(repeat([60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71], 3));
    expect(r.certainty).toBe('UNCERTAIN');
    expect(r.diagnostics.uniquePitchClasses).toBe(12);
  });

  it('2 pitch classes → UNCERTAIN', () => {
    const r = findDiatonicMajor([60, 60, 67, 67]);
    expect(r.certainty).toBe('UNCERTAIN');
  });

  it('pentatonic subset → AMBIGUOUS (no chromatic, but < 6 pcs)', () => {
    const r = findDiatonicMajor(repeat([60, 62, 64, 67, 69], 4));
    expect(r.certainty).toBe('AMBIGUOUS');
    expect(r.candidates[0].outCount).toBe(0);
  });

  it('C major + Bb (♭7) → AMBIGUOUS with chromatic label', () => {
    const pitches = repeat([60, 62, 64, 65, 67, 69, 71], 4);
    pitches.push(70, 70, 70); // Bb = pc 10
    const r = findDiatonicMajor(pitches);

    expect(r.candidates[0].tonicPc).toBe(0);
    expect(r.certainty).not.toBe('CERTAIN');
    const cCandidate = r.candidates[0];
    expect(cCandidate.chromatic.length).toBeGreaterThan(0);
    const bb = cCandidate.chromatic.find((c) => c.pc === 10);
    expect(bb).toBeDefined();
    expect(bb!.degreeLabel).toBe('♭7');
    expect(bb!.note).toBe('A#');
  });

  it('many chromatic tones (≥4) → UNCERTAIN', () => {
    const pitches = repeat([60, 62, 64, 65, 67, 69, 71], 3);
    pitches.push(61, 63, 66, 70); // C#, D#, F#, Bb
    const r = findDiatonicMajor(pitches);
    expect(r.certainty).toBe('UNCERTAIN');
  });

  it('always returns 12 candidates sorted by score desc', () => {
    const r = findDiatonicMajor([60, 64, 67]);
    expect(r.candidates).toHaveLength(12);
    for (let i = 1; i < 12; i++) {
      expect(r.candidates[i - 1].score).toBeGreaterThanOrEqual(r.candidates[i].score);
    }
  });

  it('correct scale pitch classes for C', () => {
    const r = findDiatonicMajor([60]);
    const c = r.candidates.find((c) => c.tonicPc === 0)!;
    expect(c.scalePcs).toEqual([0, 2, 4, 5, 7, 9, 11]);
    expect(c.scaleNames).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
  });

  it('diagnostics report correct info', () => {
    const r = findDiatonicMajor([60, 62, 64, 65]);
    expect(r.diagnostics.totalNotes).toBe(4);
    expect(r.diagnostics.uniquePitchClasses).toBe(4);
    expect(r.diagnostics.presentPcs).toEqual([0, 2, 4, 5]);
    expect(r.diagnostics.weights.W_tritone).toBe(8);
  });

  it('detects tritone pairs', () => {
    const r = findDiatonicMajor([71, 65]);
    expect(r.diagnostics.tritonePairs).toContainEqual([5, 11]);
  });

  it('detects semitone pairs', () => {
    const r = findDiatonicMajor([64, 65]);
    expect(r.diagnostics.semitonePairs).toContainEqual([4, 5]);
  });

  it('detects B major for Africa pitch classes (♭7 mixture disambiguation)', () => {
    // Africa by Toto: PCs {1,3,4,6,8,9,10,11} = B major with A as ♭7
    const pitches = repeat([61, 63, 64, 66, 68, 69, 70, 71], 4);
    const r = findDiatonicMajor(pitches);
    expect(r.candidates[0].tonicPc).toBe(11); // B
    expect(r.candidates[0].tonicName).toBe('B');
    const aChromaticTone = r.candidates[0].chromatic.find((c) => c.pc === 9);
    expect(aChromaticTone).toBeDefined();
    expect(aChromaticTone!.degreeLabel).toBe('♭7');
  });
});

// ── scanKeyChangesMajor ────────────────────────────────────────────────────

describe('scanKeyChangesMajor', () => {
  it('empty input → no windows or segments', () => {
    const r = scanKeyChangesMajor([]);
    expect(r.windows).toHaveLength(0);
    expect(r.segments).toHaveLength(0);
  });

  it('single key → 1 segment', () => {
    const pitches = repeat([60, 62, 64, 65, 67, 69, 71], 20);
    const r = scanKeyChangesMajor(pitches);
    expect(r.segments.length).toBe(1);
    expect(r.segments[0].tonicPc).toBe(0);
  });

  it('two distant keys → 2 segments', () => {
    // C major and F# major — maximally distant keys
    // Use cycle (interleaved) for realistic note distribution within windows
    const cMajor = cycle([60, 62, 64, 65, 67, 69, 71], 30); // 210 notes
    const fSharpMajor = cycle([66, 68, 70, 71, 73, 75, 77], 30); // 210 notes
    const pitches = [...cMajor, ...fSharpMajor];

    const r = scanKeyChangesMajor(pitches, {
      windowSizeNotes: 32,
      hopSizeNotes: 8,
      stableWindowsRequired: 3,
    });

    expect(r.segments.length).toBe(2);
    expect(r.segments[0].tonicPc).toBe(0); // C
    expect(r.segments[1].tonicPc).toBe(6); // F#
  });

  it('short song (< window size) → 1 window, 1 segment', () => {
    const pitches = repeat([60, 62, 64, 65, 67, 69, 71], 2);
    const r = scanKeyChangesMajor(pitches, { windowSizeNotes: 64 });
    expect(r.windows.length).toBe(1);
    expect(r.segments.length).toBe(1);
  });

  it('windows have correct structure', () => {
    const pitches = repeat([60, 62, 64, 65, 67, 69, 71], 20);
    const r = scanKeyChangesMajor(pitches, { windowSizeNotes: 32, hopSizeNotes: 16 });

    for (const w of r.windows) {
      expect(w.windowEnd).toBeGreaterThanOrEqual(w.windowStart);
      expect(w.center).toBeGreaterThanOrEqual(w.windowStart);
      expect(w.center).toBeLessThanOrEqual(w.windowEnd);
      expect(w.margin).toBe(w.bestScore - w.secondScore);
    }
  });

  it('segments have summary stats', () => {
    const pitches = repeat([60, 62, 64, 65, 67, 69, 71], 20);
    const r = scanKeyChangesMajor(pitches);

    for (const seg of r.segments) {
      expect(seg.summary.certain + seg.summary.ambiguous + seg.summary.uncertain).toBeGreaterThan(0);
      expect(seg.summary.avgOutRatio).toBeGreaterThanOrEqual(0);
      expect(seg.summary.avgMargin).toBeGreaterThanOrEqual(0);
    }
  });
});
