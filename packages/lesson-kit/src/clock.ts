/** A cancellable, pause-aware clock. Independent waits may run concurrently. */
export type ClockScheduler = {
  now: () => number;
  schedule: (callback: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clear: (handle: ReturnType<typeof setTimeout>) => void;
};

export function createLessonClock(scheduler: ClockScheduler = {
  now: () => performance.now(),
  schedule: (callback, ms) => setTimeout(callback, ms),
  clear: (handle) => clearTimeout(handle),
}) {
  type Pending = {
    remaining: number;
    started: number;
    timer: ReturnType<typeof setTimeout> | null;
    resolve: (completed: boolean) => void;
  };
  const pending = new Set<Pending>();
  let paused = false;

  function arm(wait: Pending): void {
    wait.started = scheduler.now();
    wait.timer = scheduler.schedule(() => {
      pending.delete(wait);
      wait.resolve(true);
    }, wait.remaining);
  }

  return {
    wait(ms: number): Promise<boolean> {
      return new Promise((resolve) => {
        const wait: Pending = { remaining: Math.max(0, ms), started: 0, timer: null, resolve };
        pending.add(wait);
        if (!paused) arm(wait);
      });
    },
    setPaused(value: boolean): void {
      if (paused === value) return;
      paused = value;
      for (const wait of pending) {
        if (paused && wait.timer !== null) {
          scheduler.clear(wait.timer);
          wait.timer = null;
          wait.remaining = Math.max(0, wait.remaining - (scheduler.now() - wait.started));
        } else if (!paused) {
          arm(wait);
        }
      }
    },
    cancel(): void {
      for (const wait of pending) {
        if (wait.timer !== null) scheduler.clear(wait.timer);
        wait.resolve(false);
      }
      pending.clear();
    },
  };
}
