import SynthEngine from '@services/initAudio.ts';

export type PreviewKind = 'single' | 'chord' | 'transient';

const DEFAULT_THROTTLE_MS: Record<PreviewKind, number> = {
  single: 40,
  chord: 20,
  transient: 30
};

type PitchKey = string;
type ColorKey = string;

function toPitchKey(pitch: string | number): PitchKey {
  return String(pitch);
}

function nowMs(): number {
  return (typeof performance !== 'undefined' && typeof performance.now === 'function')
    ? performance.now()
    : Date.now();
}

const lastPreviewTimeByKind: Record<PreviewKind, number> = {
  single: 0,
  chord: 0,
  transient: 0
};

const heldPreviewPitchesByColor = new Map<ColorKey, Set<PitchKey>>();

function markHeld(color: string, pitch: string | number): void {
  const key = toPitchKey(pitch);
  const set = heldPreviewPitchesByColor.get(color) ?? new Set<PitchKey>();
  set.add(key);
  heldPreviewPitchesByColor.set(color, set);
}

function unmarkHeld(color: string, pitch: string | number): void {
  const set = heldPreviewPitchesByColor.get(color);
  if (!set) {
    return;
  }
  set.delete(toPitchKey(pitch));
  if (set.size === 0) {
    heldPreviewPitchesByColor.delete(color);
  }
}

const audioPreviewService = {
  shouldPlayPreview(kind: PreviewKind): boolean {
    const now = nowMs();
    const throttleMs = DEFAULT_THROTTLE_MS[kind];
    const lastTime = lastPreviewTimeByKind[kind];
    if (now - lastTime < throttleMs) {
      return false;
    }
    lastPreviewTimeByKind[kind] = now;
    return true;
  },

  triggerAttack(pitch: string | number, color: string, opts: { kind?: PreviewKind; bypassThrottle?: boolean } = {}): boolean {
    const kind = opts.kind ?? 'single';
    if (!opts.bypassThrottle && !this.shouldPlayPreview(kind)) {
      return false;
    }
    SynthEngine.triggerAttack(pitch, color);
    markHeld(color, pitch);
    return true;
  },

  triggerAttacks(pitches: Array<string | number>, color: string, opts: { kind?: PreviewKind; bypassThrottle?: boolean } = {}): boolean {
    const kind = opts.kind ?? 'chord';
    if (!opts.bypassThrottle && !this.shouldPlayPreview(kind)) {
      return false;
    }
    pitches.forEach(pitch => {
      SynthEngine.triggerAttack(pitch, color);
      markHeld(color, pitch);
    });
    return true;
  },

  triggerRelease(pitch: string | number, color: string): void {
    SynthEngine.triggerRelease(pitch, color);
    unmarkHeld(color, pitch);
  },

  releasePitches(pitches: Array<string | number>, color: string): void {
    pitches.forEach(pitch => {
      this.triggerRelease(pitch, color);
    });
  },

  quickReleasePitches(pitches: Array<string | number>, color: string): void {
    if (!pitches || pitches.length === 0) {
      return;
    }
    SynthEngine.quickReleasePitches(pitches, color);
    pitches.forEach(pitch => unmarkHeld(color, pitch));
  },

  playTransient(pitch: string | number, color: string, durationMs = 100): void {
    if (!this.triggerAttack(pitch, color, { kind: 'transient' })) {
      return;
    }
    setTimeout(() => this.triggerRelease(pitch, color), durationMs);
  },

  releaseAll(color?: string): void {
    if (typeof color === 'string') {
      const set = heldPreviewPitchesByColor.get(color);
      if (!set) {
        return;
      }
      Array.from(set.values()).forEach(pitchKey => {
        SynthEngine.triggerRelease(pitchKey, color);
      });
      heldPreviewPitchesByColor.delete(color);
      return;
    }

    for (const [c, set] of heldPreviewPitchesByColor.entries()) {
      Array.from(set.values()).forEach(pitchKey => {
        SynthEngine.triggerRelease(pitchKey, c);
      });
    }
    heldPreviewPitchesByColor.clear();
  }
};

export default audioPreviewService;

