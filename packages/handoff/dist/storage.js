/**
 * @mlt/handoff - Storage
 *
 * Implements the "handoff slot" mechanism using IndexedDB with localStorage fallback.
 * The slot is a one-time transfer: write once, read once, then clear.
 *
 * DESIGN NOTES:
 * - IndexedDB is preferred for larger payloads and better structured data.
 * - localStorage fallback for browsers with IndexedDB issues.
 * - Handoff slot is keyed by a unique handoff ID.
 * - Slot auto-expires after 5 minutes to prevent stale data.
 */
// ============================================================================
// Constants
// ============================================================================
const DB_NAME = 'mlt-handoff';
const DB_VERSION = 1;
const STORE_NAME = 'handoff-slots';
const STORAGE_KEY = 'mlt-handoff-slot';
const SLOT_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
// ============================================================================
// IndexedDB Utilities
// ============================================================================
/**
 * Open the IndexedDB database.
 */
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => {
            reject(new Error('Failed to open IndexedDB'));
        };
        request.onsuccess = () => {
            resolve(request.result);
        };
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'handoffId' });
            }
        };
    });
}
/**
 * Check if IndexedDB is available and working.
 */
async function isIndexedDBAvailable() {
    if (typeof indexedDB === 'undefined') {
        return false;
    }
    try {
        const db = await openDatabase();
        db.close();
        return true;
    }
    catch {
        return false;
    }
}
// ============================================================================
// Generate Unique ID
// ============================================================================
/**
 * Generate a unique handoff ID.
 */
export function generateHandoffId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `handoff-${timestamp}-${random}`;
}
// ============================================================================
// Write to Handoff Slot
// ============================================================================
/**
 * Write a snapshot to the handoff slot using IndexedDB.
 */
async function writeToIndexedDB(data) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        // Clear any existing slots first
        const clearRequest = store.clear();
        clearRequest.onsuccess = () => {
            const addRequest = store.add(data);
            addRequest.onsuccess = () => {
                resolve();
            };
            addRequest.onerror = () => {
                reject(new Error('Failed to write to IndexedDB'));
            };
        };
        clearRequest.onerror = () => {
            reject(new Error('Failed to clear IndexedDB'));
        };
        transaction.oncomplete = () => {
            db.close();
        };
    });
}
/**
 * Write a snapshot to the handoff slot using localStorage fallback.
 */
function writeToLocalStorage(data) {
    try {
        const serialized = JSON.stringify(data);
        localStorage.setItem(STORAGE_KEY, serialized);
    }
    catch (error) {
        throw new Error(`Failed to write to localStorage: ${error}`);
    }
}
/**
 * Write a snapshot to the handoff slot.
 * Uses IndexedDB with localStorage fallback.
 *
 * @param snapshot The snapshot to store
 * @returns The handoff ID for reference
 */
export async function writeHandoffSlot(snapshot) {
    const handoffId = generateHandoffId();
    const data = {
        snapshot,
        writtenAt: Date.now(),
        handoffId,
    };
    const useIndexedDB = await isIndexedDBAvailable();
    if (useIndexedDB) {
        try {
            await writeToIndexedDB(data);
            return handoffId;
        }
        catch {
            // Fall back to localStorage
            writeToLocalStorage(data);
            return handoffId;
        }
    }
    else {
        writeToLocalStorage(data);
        return handoffId;
    }
}
// ============================================================================
// Read from Handoff Slot
// ============================================================================
/**
 * Read from IndexedDB handoff slot.
 */
async function readFromIndexedDB() {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => {
            const results = request.result;
            if (results.length > 0) {
                // Return the most recent one
                resolve(results[results.length - 1]);
            }
            else {
                resolve(null);
            }
        };
        request.onerror = () => {
            reject(new Error('Failed to read from IndexedDB'));
        };
        transaction.oncomplete = () => {
            db.close();
        };
    });
}
/**
 * Read from localStorage handoff slot.
 */
function readFromLocalStorage() {
    try {
        const serialized = localStorage.getItem(STORAGE_KEY);
        if (!serialized) {
            return null;
        }
        return JSON.parse(serialized);
    }
    catch {
        return null;
    }
}
/**
 * Read the snapshot from the handoff slot.
 * Does NOT clear the slot (use clearHandoffSlot separately).
 *
 * @returns The snapshot or null if no slot exists or expired
 */
export async function readHandoffSlot() {
    const useIndexedDB = await isIndexedDBAvailable();
    let data = null;
    if (useIndexedDB) {
        try {
            data = await readFromIndexedDB();
        }
        catch {
            // Fall back to localStorage
            data = readFromLocalStorage();
        }
    }
    else {
        data = readFromLocalStorage();
    }
    if (!data) {
        return null;
    }
    // Check expiry
    const age = Date.now() - data.writtenAt;
    if (age > SLOT_EXPIRY_MS) {
        // Slot expired, clear it
        await clearHandoffSlot();
        return null;
    }
    return data.snapshot;
}
/**
 * Read the full handoff slot data including metadata.
 *
 * @returns The full slot data or null
 */
export async function readHandoffSlotData() {
    const useIndexedDB = await isIndexedDBAvailable();
    let data = null;
    if (useIndexedDB) {
        try {
            data = await readFromIndexedDB();
        }
        catch {
            data = readFromLocalStorage();
        }
    }
    else {
        data = readFromLocalStorage();
    }
    if (!data) {
        return null;
    }
    // Check expiry
    const age = Date.now() - data.writtenAt;
    if (age > SLOT_EXPIRY_MS) {
        await clearHandoffSlot();
        return null;
    }
    return data;
}
// ============================================================================
// Clear Handoff Slot
// ============================================================================
/**
 * Clear IndexedDB handoff slot.
 */
async function clearIndexedDB() {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();
        request.onsuccess = () => {
            resolve();
        };
        request.onerror = () => {
            reject(new Error('Failed to clear IndexedDB'));
        };
        transaction.oncomplete = () => {
            db.close();
        };
    });
}
/**
 * Clear localStorage handoff slot.
 */
function clearLocalStorage() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    }
    catch {
        // Ignore errors
    }
}
/**
 * Clear the handoff slot.
 * Should be called after successfully reading and importing the snapshot.
 */
export async function clearHandoffSlot() {
    const useIndexedDB = await isIndexedDBAvailable();
    // Clear both to be safe
    clearLocalStorage();
    if (useIndexedDB) {
        try {
            await clearIndexedDB();
        }
        catch {
            // Already cleared localStorage, ignore IndexedDB errors
        }
    }
}
// ============================================================================
// Convenience: Read and Clear
// ============================================================================
/**
 * Read the snapshot from the handoff slot and immediately clear it.
 * This is the typical pattern for the receiving app.
 *
 * @returns The snapshot or null if no slot exists
 */
export async function consumeHandoffSlot() {
    const snapshot = await readHandoffSlot();
    if (snapshot) {
        await clearHandoffSlot();
    }
    return snapshot;
}
