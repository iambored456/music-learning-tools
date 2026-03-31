export const SKETCHPAD_LIBRARY_ENTRY_SCHEMA_VERSION = 1 as const;

export interface SketchpadLibraryEntry<TDocument = unknown> {
  schemaVersion: typeof SKETCHPAD_LIBRARY_ENTRY_SCHEMA_VERSION;
  id: string;
  name: string;
  savedAt: string;
  document: TDocument;
}

const DB_NAME = 'mlt-boomwhacker-sketchpad-library';
const DB_VERSION = 1;
const STORE_NAME = 'saved-sketches';
const LOCAL_STORAGE_KEY = 'boomwhacker-sketchpad-ui:library:v1';

let dbPromise: Promise<IDBDatabase> | null = null;

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function hasLocalStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

function createEntryId(): string {
  return `sketch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
  });
}

async function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open sketch library database'));
  });

  return dbPromise;
}

function normalizeEntry(record: unknown): SketchpadLibraryEntry<unknown> | null {
  if (!record || typeof record !== 'object') return null;
  const source = record as Record<string, unknown>;
  if (typeof source.id !== 'string' || typeof source.name !== 'string' || typeof source.savedAt !== 'string') {
    return null;
  }

  return {
    schemaVersion: SKETCHPAD_LIBRARY_ENTRY_SCHEMA_VERSION,
    id: source.id,
    name: source.name,
    savedAt: source.savedAt,
    document: source.document,
  };
}

function sortEntries<TDocument>(entries: Array<SketchpadLibraryEntry<TDocument>>): Array<SketchpadLibraryEntry<TDocument>> {
  return [...entries].sort((left, right) => {
    if (left.savedAt === right.savedAt) {
      return left.name.localeCompare(right.name);
    }
    return left.savedAt < right.savedAt ? 1 : -1;
  });
}

function readLocalStorageEntries(): Array<SketchpadLibraryEntry<unknown>> {
  if (!hasLocalStorage()) return [];

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => normalizeEntry(entry))
      .filter((entry): entry is SketchpadLibraryEntry<unknown> => entry !== null);
  } catch (error) {
    console.warn('Boomwhacker Sketchpad library localStorage read failed.', error);
    return [];
  }
}

function writeLocalStorageEntries(entries: Array<SketchpadLibraryEntry<unknown>>): void {
  if (!hasLocalStorage()) {
    throw new Error('localStorage is unavailable for sketch library fallback.');
  }
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(entries));
}

async function readIndexedDbEntries(): Promise<Array<SketchpadLibraryEntry<unknown>>> {
  if (!hasIndexedDb()) return [];

  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const records = await requestToPromise(store.getAll() as IDBRequest<unknown[]>);
    await transactionDone(tx);
    return records
      .map((entry) => normalizeEntry(entry))
      .filter((entry): entry is SketchpadLibraryEntry<unknown> => entry !== null);
  } catch (error) {
    console.warn('Boomwhacker Sketchpad library IndexedDB read failed.', error);
    return [];
  }
}

async function writeIndexedDbEntry(entry: SketchpadLibraryEntry<unknown>): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(entry);
  await transactionDone(tx);
}

async function removeIndexedDbEntry(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(id);
  await transactionDone(tx);
}

export async function listSketchpadLibraryEntries<TDocument = unknown>(): Promise<Array<SketchpadLibraryEntry<TDocument>>> {
  const [indexedDbEntries, localEntries] = await Promise.all([
    readIndexedDbEntries(),
    Promise.resolve(readLocalStorageEntries()),
  ]);

  const merged = new Map<string, SketchpadLibraryEntry<unknown>>();
  for (const entry of localEntries) {
    merged.set(entry.id, entry);
  }
  for (const entry of indexedDbEntries) {
    merged.set(entry.id, entry);
  }

  return sortEntries(Array.from(merged.values())) as Array<SketchpadLibraryEntry<TDocument>>;
}

export async function saveSketchpadLibraryEntry<TDocument = unknown>(input: {
  name: string;
  document: TDocument;
}): Promise<SketchpadLibraryEntry<TDocument>> {
  const name = input.name.trim();
  if (!name) {
    throw new Error('Please enter a file name before saving.');
  }

  const entry: SketchpadLibraryEntry<TDocument> = {
    schemaVersion: SKETCHPAD_LIBRARY_ENTRY_SCHEMA_VERSION,
    id: createEntryId(),
    name,
    savedAt: new Date().toISOString(),
    document: input.document,
  };

  let savedToIndexedDb = false;
  if (hasIndexedDb()) {
    try {
      await writeIndexedDbEntry(entry as SketchpadLibraryEntry<unknown>);
      savedToIndexedDb = true;
    } catch (error) {
      console.warn('Boomwhacker Sketchpad library IndexedDB save failed.', error);
    }
  }

  if (!savedToIndexedDb) {
    const localEntries = readLocalStorageEntries();
    localEntries.push(entry as SketchpadLibraryEntry<unknown>);
    writeLocalStorageEntries(sortEntries(localEntries));
  }

  return entry;
}

export async function deleteSketchpadLibraryEntry(id: string): Promise<void> {
  let removed = false;
  let indexedDbFailure: unknown = null;
  let localStorageFailure: unknown = null;

  if (hasIndexedDb()) {
    try {
      await removeIndexedDbEntry(id);
      removed = true;
    } catch (error) {
      indexedDbFailure = error;
      console.warn('Boomwhacker Sketchpad library IndexedDB delete failed.', error);
    }
  }

  if (hasLocalStorage()) {
    try {
      const localEntries = readLocalStorageEntries();
      const nextEntries = localEntries.filter((entry) => entry.id !== id);
      if (nextEntries.length !== localEntries.length) {
        writeLocalStorageEntries(nextEntries);
        removed = true;
      }
    } catch (error) {
      localStorageFailure = error;
      console.warn('Boomwhacker Sketchpad library localStorage delete failed.', error);
    }
  }

  if (!removed) {
    throw (
      (indexedDbFailure as Error | null)
      ?? (localStorageFailure as Error | null)
      ?? new Error('Sketch library storage is unavailable.')
    );
  }
}
