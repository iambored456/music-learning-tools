type TimeoutTask = {
  id: number;
  runAtMs: number;
  callback: () => void;
};

/**
 * Deterministic replacement for timer-driven runtime behavior.
 * Time only moves when `advance()` is called.
 */
export class FakeClock {
  private currentMs = 0;
  private nextTimerId = 1;
  private tasks: TimeoutTask[] = [];

  get nowMs(): number {
    return this.currentMs;
  }

  setTimeout(callback: () => void, delayMs: number): number {
    const id = this.nextTimerId++;
    const runAtMs = this.currentMs + Math.max(0, Math.round(delayMs));
    this.tasks.push({ id, runAtMs, callback });
    this.tasks.sort((a, b) => a.runAtMs - b.runAtMs || a.id - b.id);
    return id;
  }

  clearTimeout(id: number): void {
    this.tasks = this.tasks.filter((task) => task.id !== id);
  }

  /**
   * Advance deterministic time and execute all due scheduled callbacks.
   */
  advance(deltaMs: number): void {
    const safeDelta = Math.max(0, Math.round(deltaMs));
    const targetMs = this.currentMs + safeDelta;

    while (this.tasks.length > 0) {
      const next = this.tasks[0];
      if (!next || next.runAtMs > targetMs) {
        break;
      }
      this.tasks.shift();
      this.currentMs = next.runAtMs;
      next.callback();
    }

    this.currentMs = targetMs;
  }
}
