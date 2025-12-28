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
import type { SingingTrainerSnapshot, HandoffSlotData } from './types.js';
/**
 * Generate a unique handoff ID.
 */
export declare function generateHandoffId(): string;
/**
 * Write a snapshot to the handoff slot.
 * Uses IndexedDB with localStorage fallback.
 *
 * @param snapshot The snapshot to store
 * @returns The handoff ID for reference
 */
export declare function writeHandoffSlot(snapshot: SingingTrainerSnapshot): Promise<string>;
/**
 * Read the snapshot from the handoff slot.
 * Does NOT clear the slot (use clearHandoffSlot separately).
 *
 * @returns The snapshot or null if no slot exists or expired
 */
export declare function readHandoffSlot(): Promise<SingingTrainerSnapshot | null>;
/**
 * Read the full handoff slot data including metadata.
 *
 * @returns The full slot data or null
 */
export declare function readHandoffSlotData(): Promise<HandoffSlotData | null>;
/**
 * Clear the handoff slot.
 * Should be called after successfully reading and importing the snapshot.
 */
export declare function clearHandoffSlot(): Promise<void>;
/**
 * Read the snapshot from the handoff slot and immediately clear it.
 * This is the typical pattern for the receiving app.
 *
 * @returns The snapshot or null if no slot exists
 */
export declare function consumeHandoffSlot(): Promise<SingingTrainerSnapshot | null>;
//# sourceMappingURL=storage.d.ts.map