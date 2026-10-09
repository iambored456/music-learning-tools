export const lessonProgressKey = 'mlt:amateur-music-theory:completed-lessons';

type ProgressStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function createLessonProgress(getStorage: () => ProgressStorage | null) {
  let completed: string[] = [];
  let sessionOnly = false;

  function read(): string[] {
    try {
      const storage = sessionOnly ? null : getStorage();
      if (storage) {
        const saved: unknown = JSON.parse(storage.getItem(lessonProgressKey) ?? '[]');
        completed = Array.isArray(saved)
          ? [...new Set(saved.filter((code): code is string => typeof code === 'string'))]
          : [];
      }
    } catch {
      sessionOnly = true;
      // Keep progress for this session when browser storage is unavailable.
    }
    return [...completed];
  }

  function complete(code: string): void {
    completed = [...new Set([...read(), code])];
    try {
      getStorage()?.setItem(lessonProgressKey, JSON.stringify(completed));
    } catch {
      sessionOnly = true;
      // The in-memory copy still lets the portal show this session's progress.
    }
  }

  function clear(): void {
    completed = [];
    try {
      getStorage()?.removeItem(lessonProgressKey);
    } catch {
      sessionOnly = true;
      // Storage may be blocked; clearing the session copy is still supported.
    }
  }

  return { read, complete, clear };
}

export const lessonProgress = createLessonProgress(() =>
  typeof window === 'undefined' ? null : window.localStorage,
);
