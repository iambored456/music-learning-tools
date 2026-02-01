/**
 * Key-Change Section Scanner (Major-only)
 *
 * Sliding-window analysis over sequential MIDI pitches to detect
 * stable key segments and key-change boundaries using hysteresis.
 */

import { findDiatonicMajor, type DiatonicCertainty, pcToName } from './diatonicAnalysis.js';

// ── Types ──────────────────────────────────────────────────────────────────

export interface KeyWindow {
  windowStart: number;
  windowEnd: number;
  center: number;
  bestTonicPc: number;
  bestTonicName: string;
  certainty: DiatonicCertainty;
  outRatio: number;
  bestScore: number;
  secondScore: number;
  margin: number;
}

export interface KeySegment {
  start: number;
  end: number;
  tonicPc: number;
  tonicName: string;
  summary: {
    certain: number;
    ambiguous: number;
    uncertain: number;
    avgOutRatio: number;
    avgMargin: number;
  };
  mixture: Array<{ degreeLabel: string; count: number }>;
}

export interface ScanOptions {
  windowSizeNotes: number;
  hopSizeNotes: number;
  stableWindowsRequired: number;
  maxOutRatioForStable: number;
  minMarginForStable: number;
}

const DEFAULTS: ScanOptions = {
  windowSizeNotes: 64,
  hopSizeNotes: 16,
  stableWindowsRequired: 3,
  maxOutRatioForStable: 0.30,
  minMarginForStable: 6,
};

// ── Core ───────────────────────────────────────────────────────────────────

export function scanKeyChangesMajor(
  midiPitches: number[],
  opts?: Partial<ScanOptions>,
): { windows: KeyWindow[]; segments: KeySegment[] } {
  const o = { ...DEFAULTS, ...opts };

  if (midiPitches.length === 0) {
    return { windows: [], segments: [] };
  }

  // 1. Generate windows
  const windows: KeyWindow[] = [];

  for (let i = 0; i + o.windowSizeNotes <= midiPitches.length; i += o.hopSizeNotes) {
    const slice = midiPitches.slice(i, i + o.windowSizeNotes);
    const result = findDiatonicMajor(slice);
    const best = result.candidates[0];
    const second = result.candidates[1];

    windows.push({
      windowStart: i,
      windowEnd: i + o.windowSizeNotes - 1,
      center: Math.floor(i + o.windowSizeNotes / 2),
      bestTonicPc: best.tonicPc,
      bestTonicName: best.tonicName,
      certainty: result.certainty,
      outRatio: best.outRatio,
      bestScore: best.score,
      secondScore: second.score,
      margin: best.score - second.score,
    });
  }

  // Handle case where song is shorter than window size
  if (windows.length === 0 && midiPitches.length > 0) {
    const result = findDiatonicMajor(midiPitches);
    const best = result.candidates[0];
    const second = result.candidates[1];
    windows.push({
      windowStart: 0,
      windowEnd: midiPitches.length - 1,
      center: Math.floor(midiPitches.length / 2),
      bestTonicPc: best.tonicPc,
      bestTonicName: best.tonicName,
      certainty: result.certainty,
      outRatio: best.outRatio,
      bestScore: best.score,
      secondScore: second.score,
      margin: best.score - second.score,
    });
  }

  // 2. Change-point detection with hysteresis
  const segments = detectSegments(windows, midiPitches, o);

  return { windows, segments };
}

// ── Segmentation ───────────────────────────────────────────────────────────

function detectSegments(
  windows: KeyWindow[],
  midiPitches: number[],
  o: ScanOptions,
): KeySegment[] {
  if (windows.length === 0) return [];

  // Find first valid window to initialize
  let currentTonicPc = windows[0].bestTonicPc;
  let segStartIdx = 0;

  let pendingTonicPc = -1;
  let pendingCount = 0;
  let pendingStartIdx = 0;

  const rawSegments: Array<{ startWindowIdx: number; endWindowIdx: number; tonicPc: number }> = [];

  for (let wi = 0; wi < windows.length; wi++) {
    const w = windows[wi];
    const isValid =
      w.certainty !== 'UNCERTAIN' &&
      w.outRatio <= o.maxOutRatioForStable &&
      w.margin >= o.minMarginForStable;

    if (!isValid) {
      // Invalid window — don't switch, reset pending
      pendingCount = 0;
      pendingTonicPc = -1;
      continue;
    }

    if (w.bestTonicPc === currentTonicPc) {
      // Same key — reset pending
      pendingCount = 0;
      pendingTonicPc = -1;
    } else {
      // Different key
      if (pendingTonicPc !== w.bestTonicPc) {
        pendingTonicPc = w.bestTonicPc;
        pendingCount = 1;
        pendingStartIdx = wi;
      } else {
        pendingCount++;
      }

      if (pendingCount >= o.stableWindowsRequired) {
        // Finalize current segment
        rawSegments.push({
          startWindowIdx: segStartIdx,
          endWindowIdx: pendingStartIdx - 1,
          tonicPc: currentTonicPc,
        });
        // Start new segment
        currentTonicPc = pendingTonicPc;
        segStartIdx = pendingStartIdx;
        pendingCount = 0;
        pendingTonicPc = -1;
      }
    }
  }

  // Finalize last segment
  rawSegments.push({
    startWindowIdx: segStartIdx,
    endWindowIdx: windows.length - 1,
    tonicPc: currentTonicPc,
  });

  // 3. Build KeySegment output
  return rawSegments.map((seg) => {
    const segWindows = windows.slice(seg.startWindowIdx, seg.endWindowIdx + 1);
    const start = segWindows.length > 0 ? segWindows[0].windowStart : 0;
    const end = segWindows.length > 0 ? segWindows[segWindows.length - 1].windowEnd : midiPitches.length - 1;

    let certain = 0;
    let ambiguous = 0;
    let uncertain = 0;
    let totalOutRatio = 0;
    let totalMargin = 0;

    for (const w of segWindows) {
      if (w.certainty === 'CERTAIN') certain++;
      else if (w.certainty === 'AMBIGUOUS') ambiguous++;
      else uncertain++;
      totalOutRatio += w.outRatio;
      totalMargin += w.margin;
    }

    const count = segWindows.length || 1;

    // Compute mixture for the segment's tonic over the segment's note range
    const segPitches = midiPitches.slice(start, Math.min(end + 1, midiPitches.length));
    const segResult = findDiatonicMajor(segPitches);
    const segCandidate = segResult.candidates.find((c) => c.tonicPc === seg.tonicPc);
    const mixtureMap = new Map<string, number>();
    if (segCandidate) {
      for (const ch of segCandidate.chromatic) {
        mixtureMap.set(ch.degreeLabel, (mixtureMap.get(ch.degreeLabel) ?? 0) + 1);
      }
    }

    return {
      start,
      end,
      tonicPc: seg.tonicPc,
      tonicName: pcToName(seg.tonicPc),
      summary: {
        certain,
        ambiguous,
        uncertain,
        avgOutRatio: totalOutRatio / count,
        avgMargin: totalMargin / count,
      },
      mixture: [...mixtureMap.entries()].map(([degreeLabel, count]) => ({ degreeLabel, count })),
    };
  });
}
