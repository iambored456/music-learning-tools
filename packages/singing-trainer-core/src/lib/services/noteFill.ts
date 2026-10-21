interface Fill { start: number; release?: number; releaseLevel?: number }

/** Matches the triangle reference synth's attack, decay, sustain and release. */
function heldLevel(elapsed: number): number {
  if (elapsed < 10) return Math.max(0, elapsed / 10);
  if (elapsed < 60) return 1 - (elapsed - 10) / 50 * 0.25;
  return 0.75;
}

export class NoteFillAnimator {
  private fills = new Map<string, Fill>();

  setActiveNotes(ids: readonly string[], now: number): boolean {
    const active = new Set(ids);
    let changed = false;
    for (const [id, fill] of this.fills) {
      if (!active.has(id) && fill.release === undefined) {
        fill.releaseLevel = heldLevel(now - fill.start);
        fill.release = now;
        changed = true;
      }
    }
    for (const id of active) {
      const fill = this.fills.get(id);
      if (!fill || fill.release !== undefined) {
        this.fills.set(id, { start: now });
        changed = true;
      }
    }
    return changed;
  }

  levels(now: number): Map<string, number> {
    const result = new Map<string, number>();
    for (const [id, fill] of this.fills) {
      const level = fill.release === undefined ? heldLevel(now - fill.start)
        : (fill.releaseLevel ?? 0) * Math.max(0, 1 - (now - fill.release) / 30);
      if (fill.release !== undefined && level <= 0) this.fills.delete(id);
      else result.set(id, level);
    }
    return result;
  }

  isAnimating(now: number): boolean {
    return [...this.fills.values()].some(fill => fill.release !== undefined || now - fill.start < 60);
  }

  clear(): void { this.fills.clear(); }
}
