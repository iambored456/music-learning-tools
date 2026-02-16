/**
 * Diatonic Scale (Major) Analysis — v2
 *
 * Pure, deterministic function that infers the most likely major-scale tonic
 * from a set of MIDI pitches using frequency counts (no duration weighting).
 * Includes chromatic mixture labeling (♭7, ♭3, etc.).
 */

import { midiToPitchClass } from '@mlt/pitch-utils';

// ── Types ──────────────────────────────────────────────────────────────────

export type DiatonicCertainty = 'CERTAIN' | 'AMBIGUOUS' | 'UNCERTAIN';

export interface ChromaticTone {
  pc: number;
  note: string;
  degreeLabel: string;
}

export interface Candidate {
  tonicPc: number;
  tonicName: string;
  scalePcs: number[];
  scaleNames: string[];
  score: number;

  inCount: number;
  outCount: number;
  outRatio: number;

  tritoneVotes: number;
  semitoneVotes: number;
  triadScore: number;
  fitScore: number;
  mixtureBonus: number;

  chromatic: ChromaticTone[];
}

export interface DiatonicMajorResult {
  certainty: DiatonicCertainty;
  candidates: Candidate[];
  rationale: string[];
  diagnostics: {
    totalNotes: number;
    uniquePitchClasses: number;
    presentPcs: number[];
    presentNotes: string[];
    tritonePairs: Array<[number, number]>;
    semitonePairs: Array<[number, number]>;
    weights: { W_tritone: number; W_semitone: number; W_triad: number; W_fit: number; W_mixture: number; mu: number };
  };
}

// ── Constants ──────────────────────────────────────────────────────────────

const PC_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Major scale intervals from tonic (semitones) */
const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];

/** Scoring weights */
const W_TRITONE = 8;
const W_SEMITONE = 6;
const W_TRIAD = 2;
const W_FIT = 1;
const W_MIXTURE = 2;
const FIT_MU = 1.0;

/** How common each chromatic alteration is in major-key tonal music */
const MIXTURE_COMMONALITY: Record<number, number> = {
  10: 3, // ♭7 — mixolydian mixture, very common
  3: 2, // ♭3 — minor mixture, common
  8: 1, // ♭6 — less common
  1: 0, // ♭2 — phrygian, uncommon in major context
  6: 0, // ♯4 — lydian, uncommon as chromatic in major
};

/** Chromatic degree labels relative to major (keyed by semitone diff from tonic) */
const CHROMATIC_DEGREE_LABELS: Record<number, string> = {
  1: '♭2',
  3: '♭3',
  6: '♯4',
  8: '♭6',
  10: '♭7',
};

/** All 12 scale degree labels (diatonic + chromatic) indexed by semitone interval from tonic */
const DEGREE_LABELS: readonly string[] = [
  '1', '♭2', '2', '♭3', '3', '4', '♯4', '5', '♭6', '6', '♭7', '7',
];

/**
 * Convert a MIDI pitch to a scale degree label relative to a tonic pitch class.
 * E.g. midiToScaleDegreeLabel(64, 0) → '3' (E relative to C)
 */
export function midiToScaleDegreeLabel(midi: number, tonicPc: number): string {
  const interval = ((midi % 12) - tonicPc + 12) % 12;
  return DEGREE_LABELS[interval];
}

// ── Helpers ────────────────────────────────────────────────────────────────

export function pcToName(pc: number): string {
  return PC_NAMES[((pc % 12) + 12) % 12];
}

function mod12(n: number): number {
  return ((n % 12) + 12) % 12;
}

function majSet(tonic: number): Set<number> {
  return new Set(MAJOR_INTERVALS.map((i) => mod12(tonic + i)));
}

function majScalePcs(tonic: number): number[] {
  return MAJOR_INTERVALS.map((i) => mod12(tonic + i));
}

function labelChromatic(tonic: number, presentPcs: Set<number>, C: number[]): ChromaticTone[] {
  const scale = majSet(tonic);
  const result: ChromaticTone[] = [];
  for (const pc of presentPcs) {
    if (scale.has(pc)) continue;
    if (C[pc] === 0) continue;
    const diff = mod12(pc - tonic);
    const label = CHROMATIC_DEGREE_LABELS[diff] ?? `chromatic(${diff})`;
    result.push({ pc, note: pcToName(pc), degreeLabel: label });
  }
  return result;
}

// ── Core ───────────────────────────────────────────────────────────────────

export function findDiatonicMajor(midiPitches: number[]): DiatonicMajorResult {
  if (midiPitches.length === 0) {
    return emptyResult();
  }

  // 1. Build pitch-class histogram
  const C = new Array<number>(12).fill(0);
  for (const p of midiPitches) {
    C[midiToPitchClass(p)]++;
  }
  const totalNotes = midiPitches.length;
  const present: number[] = [];
  for (let i = 0; i < 12; i++) {
    if (C[i] > 0) present.push(i);
  }
  const presentSet = new Set(present);
  const uniquePitchClasses = present.length;

  // 2. Detect tritone pairs and semitone pairs
  const tritonePairs: Array<[number, number]> = [];
  const semitonePairs: Array<[number, number]> = [];

  for (const a of present) {
    const tritonePartner = mod12(a + 6);
    if (tritonePartner > a && presentSet.has(tritonePartner)) {
      tritonePairs.push([a, tritonePartner]);
    }
    const semitonePartner = mod12(a + 1);
    if (presentSet.has(semitonePartner)) {
      semitonePairs.push([a, semitonePartner]);
    }
  }

  // 3. Build semitone vote array (global — semitone voting is unaffected)
  const semitoneVotesArr = new Array<number>(12).fill(0);

  for (const [x] of semitonePairs) {
    // Semitone {x, x+1} implies t = x or t = x-4
    semitoneVotesArr[x]++;
    semitoneVotesArr[mod12(x - 4)]++;
  }

  // 4. Score each candidate tonic
  const candidates: Candidate[] = [];

  for (let t = 0; t < 12; t++) {
    const scale = majSet(t);

    // Per-candidate tritone votes: only count if both notes are in-scale for this candidate
    let tritoneVotes = 0;
    for (const [a] of tritonePairs) {
      const b = mod12(a + 6);
      if (scale.has(a) && scale.has(b)) {
        tritoneVotes++;
      }
    }

    const semitoneVotes = semitoneVotesArr[t];
    const triadScore = C[t] + C[mod12(t + 4)] + C[mod12(t + 7)];

    let inCount = 0;
    let outCount = 0;
    for (let pc = 0; pc < 12; pc++) {
      if (scale.has(pc)) inCount += C[pc];
      else outCount += C[pc];
    }
    const fitScore = inCount - FIT_MU * outCount;

    const scalePcs = majScalePcs(t);
    const chromatic = labelChromatic(t, presentSet, C);

    // Mixture commonality bonus: prefer candidates whose chromatic tones are musically expected
    let mixtureBonus = 0;
    for (const ch of chromatic) {
      const diff = mod12(ch.pc - t);
      mixtureBonus += MIXTURE_COMMONALITY[diff] ?? 0;
    }

    const score =
      W_TRITONE * tritoneVotes +
      W_SEMITONE * semitoneVotes +
      W_TRIAD * triadScore +
      W_FIT * fitScore +
      W_MIXTURE * mixtureBonus;

    candidates.push({
      tonicPc: t,
      tonicName: pcToName(t),
      score,
      inCount,
      outCount,
      outRatio: totalNotes > 0 ? outCount / totalNotes : 0,
      tritoneVotes,
      semitoneVotes,
      triadScore,
      fitScore,
      mixtureBonus,
      scalePcs,
      scaleNames: scalePcs.map(pcToName),
      chromatic,
    });
  }

  candidates.sort((a, b) => b.score - a.score || a.chromatic.length - b.chromatic.length);

  // 5. Classify certainty
  const best = candidates[0];
  const second = candidates[1];
  const rationale: string[] = [];
  const certainty = classify(best, second, uniquePitchClasses, totalNotes, rationale);

  // Add chromatic rationale
  if (best.chromatic.length > 0 && certainty !== 'UNCERTAIN') {
    for (const ch of best.chromatic) {
      rationale.push(`Chromatic note ${ch.note} is labeled ${ch.degreeLabel} relative to ${best.tonicName} major.`);
    }
  }

  return {
    certainty,
    candidates,
    rationale,
    diagnostics: {
      totalNotes,
      uniquePitchClasses,
      presentPcs: present,
      presentNotes: present.map(pcToName),
      tritonePairs,
      semitonePairs,
      weights: { W_tritone: W_TRITONE, W_semitone: W_SEMITONE, W_triad: W_TRIAD, W_fit: W_FIT, W_mixture: W_MIXTURE, mu: FIT_MU },
    },
  };
}

// ── Classification ─────────────────────────────────────────────────────────

function classify(
  best: Candidate,
  second: Candidate,
  uniquePitchClasses: number,
  totalNotes: number,
  rationale: string[],
): DiatonicCertainty {
  if (totalNotes === 0) {
    rationale.push('No notes to analyze.');
    return 'UNCERTAIN';
  }

  const margin = best.score - second.score;
  const marginThreshold = Math.max(6, 0.15 * best.score);
  const outRatio = best.outRatio;

  // UNCERTAIN triggers (check first)
  if (uniquePitchClasses <= 3) {
    rationale.push(`Only ${uniquePitchClasses} distinct pitch classes — too few to infer a tonic.`);
    return 'UNCERTAIN';
  }
  if (outRatio > 0.25) {
    rationale.push(
      `${(outRatio * 100).toFixed(0)}% of notes fall outside the best-fit major scale — too chromatic.`,
    );
    return 'UNCERTAIN';
  }
  if (best.chromatic.length >= 4) {
    rationale.push(
      `${best.chromatic.length} chromatic pitch classes present — too many for a stable major inference.`,
    );
    return 'UNCERTAIN';
  }

  // CERTAIN: strict — no chromatic, good margin, enough pitch classes
  if (
    uniquePitchClasses >= 6 &&
    outRatio <= 0.10 &&
    best.chromatic.length === 0 &&
    margin >= marginThreshold
  ) {
    const hasStructural =
      best.tritoneVotes > 0 || best.semitoneVotes > 0 || best.outCount <= 1;
    if (hasStructural) {
      rationale.push(
        `Strong match for ${best.tonicName} Major: ${uniquePitchClasses} pitch classes, ` +
          `0% out-of-scale, score margin ${margin.toFixed(1)}.`,
      );
      return 'CERTAIN';
    }
  }

  // AMBIGUOUS (everything else that passed UNCERTAIN checks)
  rationale.push('Multiple plausible tonics — choose what sounds like home.');
  rationale.push(
    `Top candidate: ${best.tonicName} Major (score ${best.score.toFixed(1)}), ` +
      `runner-up: ${second.tonicName} Major (score ${second.score.toFixed(1)}).`,
  );
  return 'AMBIGUOUS';
}

// ── Empty result ───────────────────────────────────────────────────────────

function emptyResult(): DiatonicMajorResult {
  const candidates: Candidate[] = [];
  for (let t = 0; t < 12; t++) {
    const scalePcs = majScalePcs(t);
    candidates.push({
      tonicPc: t,
      tonicName: pcToName(t),
      score: 0,
      inCount: 0,
      outCount: 0,
      outRatio: 0,
      tritoneVotes: 0,
      semitoneVotes: 0,
      triadScore: 0,
      fitScore: 0,
      mixtureBonus: 0,
      scalePcs,
      scaleNames: scalePcs.map(pcToName),
      chromatic: [],
    });
  }
  return {
    certainty: 'UNCERTAIN',
    candidates,
    rationale: ['No notes to analyze.'],
    diagnostics: {
      totalNotes: 0,
      uniquePitchClasses: 0,
      presentPcs: [],
      presentNotes: [],
      tritonePairs: [],
      semitonePairs: [],
      weights: { W_tritone: W_TRITONE, W_semitone: W_SEMITONE, W_triad: W_TRIAD, W_fit: W_FIT, W_mixture: W_MIXTURE, mu: FIT_MU },
    },
  };
}
