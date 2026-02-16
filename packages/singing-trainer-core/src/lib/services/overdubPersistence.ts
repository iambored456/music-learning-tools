import type { OverdubProject } from '@mlt/overdub-engine';

export interface PersistedTakeAudio {
  takeId: string;
  sampleRate: number;
  channelCount: number;
  durationMs: number;
  samples: Float32Array;
}

export interface PersistedProjectSnapshot {
  project: OverdubProject;
  audioByTakeId: Map<string, PersistedTakeAudio>;
}

interface ProjectRecord {
  id: string;
  savedAt: string;
  project: OverdubProject;
}

interface AudioRecord {
  id: string;
  sampleRate: number;
  channelCount: number;
  durationMs: number;
  pcm: ArrayBuffer;
}

const DB_NAME = 'mlt-overdub-db';
const DB_VERSION = 1;
const PROJECT_STORE = 'projects';
const AUDIO_STORE = 'audio';

let dbPromise: Promise<IDBDatabase> | null = null;

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
      if (!db.objectStoreNames.contains(PROJECT_STORE)) {
        db.createObjectStore(PROJECT_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(AUDIO_STORE)) {
        db.createObjectStore(AUDIO_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });

  return dbPromise;
}

function getAllTakeIds(project: OverdubProject): Set<string> {
  const ids = new Set<string>();
  for (const layer of project.layers) {
    for (const take of layer.takes) {
      ids.add(take.id);
    }
  }
  return ids;
}

function cloneProjectForStorage(project: OverdubProject): OverdubProject {
  try {
    return structuredClone(project);
  } catch {
    // Fallback for non-cloneable proxies (for example Svelte reactive proxies).
    return JSON.parse(JSON.stringify(project)) as OverdubProject;
  }
}

function serializeAudio(audio: PersistedTakeAudio): AudioRecord {
  const { samples } = audio;
  const copy = samples.slice();
  return {
    id: audio.takeId,
    sampleRate: audio.sampleRate,
    channelCount: audio.channelCount,
    durationMs: audio.durationMs,
    pcm: copy.buffer,
  };
}

function deserializeAudio(record: AudioRecord): PersistedTakeAudio {
  return {
    takeId: record.id,
    sampleRate: record.sampleRate,
    channelCount: record.channelCount,
    durationMs: record.durationMs,
    samples: new Float32Array(record.pcm),
  };
}

export async function saveOverdubSnapshot(snapshot: PersistedProjectSnapshot): Promise<void> {
  const db = await openDb();
  const project = cloneProjectForStorage(snapshot.project);
  const activeTakeIds = getAllTakeIds(project);

  const writeTx = db.transaction([PROJECT_STORE, AUDIO_STORE], 'readwrite');
  const projectStore = writeTx.objectStore(PROJECT_STORE);
  const audioStore = writeTx.objectStore(AUDIO_STORE);

  const projectRecord: ProjectRecord = {
    id: project.id,
    savedAt: new Date().toISOString(),
    project,
  };
  projectStore.put(projectRecord);

  for (const takeId of activeTakeIds) {
    const audio = snapshot.audioByTakeId.get(takeId);
    if (!audio) continue;
    audioStore.put(serializeAudio(audio));
  }

  await transactionDone(writeTx);

  // Prune audio blobs no longer referenced by this project.
  const pruneTx = db.transaction(AUDIO_STORE, 'readwrite');
  const pruneStore = pruneTx.objectStore(AUDIO_STORE);
  const allAudioKeys = await requestToPromise(pruneStore.getAllKeys());
  for (const key of allAudioKeys) {
    if (typeof key !== 'string') continue;
    if (!activeTakeIds.has(key)) {
      pruneStore.delete(key);
    }
  }
  await transactionDone(pruneTx);
}

export async function loadOverdubSnapshot(projectId: string): Promise<PersistedProjectSnapshot | null> {
  const db = await openDb();

  const projectTx = db.transaction(PROJECT_STORE, 'readonly');
  const projectStore = projectTx.objectStore(PROJECT_STORE);
  const projectRecord = await requestToPromise(projectStore.get(projectId) as IDBRequest<ProjectRecord | undefined>);
  await transactionDone(projectTx);

  if (!projectRecord?.project) return null;

  const takeIds = getAllTakeIds(projectRecord.project);
  const audioByTakeId = new Map<string, PersistedTakeAudio>();
  const audioTx = db.transaction(AUDIO_STORE, 'readonly');
  const audioStore = audioTx.objectStore(AUDIO_STORE);

  for (const takeId of takeIds) {
    const audioRecord = await requestToPromise(audioStore.get(takeId) as IDBRequest<AudioRecord | undefined>);
    if (!audioRecord) continue;
    audioByTakeId.set(takeId, deserializeAudio(audioRecord));
  }
  await transactionDone(audioTx);

  return {
    project: projectRecord.project,
    audioByTakeId,
  };
}

export async function loadLatestOverdubSnapshot(): Promise<PersistedProjectSnapshot | null> {
  const db = await openDb();
  const tx = db.transaction(PROJECT_STORE, 'readonly');
  const store = tx.objectStore(PROJECT_STORE);
  const records = await requestToPromise(store.getAll() as IDBRequest<ProjectRecord[]>);
  await transactionDone(tx);

  if (!records || records.length === 0) return null;
  records.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
  const latest = records[0];
  return loadOverdubSnapshot(latest.id);
}
