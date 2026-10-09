export const lessonVolumeKey = 'mlt:amateur-music-theory:volume';
const defaultVolume = 72;
type VolumeStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** One preference for every lesson, with an in-memory fallback for blocked storage. */
export function createLessonVolume(getStorage: () => VolumeStorage | null) {
  let volume = defaultVolume;
  let sessionOnly = false;
  return {
    read(): number {
      try {
        const saved = sessionOnly ? null : getStorage()?.getItem(lessonVolumeKey);
        if (saved != null && saved.trim() !== '') {
          const value = Number(saved);
          if (Number.isFinite(value)) volume = Math.max(0, Math.min(100, value));
        }
      } catch { sessionOnly = true; }
      return volume;
    },
    set(value: number): void {
      if (!Number.isFinite(value)) return;
      volume = Math.max(0, Math.min(100, value));
      try { if (!sessionOnly) getStorage()?.setItem(lessonVolumeKey, String(volume)); }
      catch { sessionOnly = true; }
    },
  };
}

export const lessonVolume = createLessonVolume(() => typeof window === 'undefined' ? null : window.localStorage);
