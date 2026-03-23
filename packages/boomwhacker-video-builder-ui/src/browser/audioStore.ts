const AUDIO_STORE_DB_NAME = 'mlt-boomwhacker-video-builder';
const AUDIO_STORE_NAME = 'project-audio';
const AUDIO_STORE_VERSION = 1;

type StoredAudioRecord = {
  token: string;
  fileName: string;
  mimeType: string;
  blob: Blob;
  savedAtIso: string;
};

function openAudioDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(AUDIO_STORE_DB_NAME, AUDIO_STORE_VERSION);

    request.onerror = () => {
      reject(request.error ?? new Error('Failed to open local audio storage.'));
    };

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(AUDIO_STORE_NAME)) {
        database.createObjectStore(AUDIO_STORE_NAME, { keyPath: 'token' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

function runAudioStoreTransaction<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore, resolve: (value: T) => void, reject: (error?: unknown) => void) => void,
): Promise<T | null> {
  return openAudioDatabase().then((database) => {
    if (!database) {
      return null;
    }

    return new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(AUDIO_STORE_NAME, mode);
      const store = transaction.objectStore(AUDIO_STORE_NAME);

      transaction.oncomplete = () => {
        database.close();
      };

      transaction.onerror = () => {
        reject(transaction.error ?? new Error('Local audio storage transaction failed.'));
      };

      transaction.onabort = () => {
        reject(transaction.error ?? new Error('Local audio storage transaction was aborted.'));
      };

      callback(store, resolve, reject);
    });
  });
}

export async function saveLocalProjectAudio(
  token: string,
  file: File,
): Promise<boolean> {
  const result = await runAudioStoreTransaction<boolean>('readwrite', (store, resolve, reject) => {
    const record: StoredAudioRecord = {
      token,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      blob: file,
      savedAtIso: new Date().toISOString(),
    };

    const request = store.put(record);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error ?? new Error('Failed to save local project audio.'));
  });

  return result ?? false;
}

export async function loadLocalProjectAudio(
  token: string,
): Promise<File | null> {
  const result = await runAudioStoreTransaction<File | null>('readonly', (store, resolve, reject) => {
    const request = store.get(token);
    request.onsuccess = () => {
      const record = request.result as StoredAudioRecord | undefined;
      if (!record?.blob) {
        resolve(null);
        return;
      }

      const blob = record.blob;
      resolve(new File([blob], record.fileName || 'audio', {
        type: record.mimeType || blob.type || 'application/octet-stream',
        lastModified: Date.now(),
      }));
    };
    request.onerror = () => reject(request.error ?? new Error('Failed to load local project audio.'));
  });

  return result ?? null;
}

export async function clearLocalProjectAudio(token: string): Promise<void> {
  await runAudioStoreTransaction<void>('readwrite', (store, resolve, reject) => {
    const request = store.delete(token);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Failed to clear local project audio.'));
  });
}
