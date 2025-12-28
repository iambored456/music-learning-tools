/**
 * Pitch Detection Service
 *
 * Uses Pitchy.js for real-time pitch detection from microphone input.
 * Ported from the original JavaScript implementation.
 */
/**
 * Start pitch detection from microphone
 */
export declare function startDetection(): Promise<void>;
/**
 * Stop pitch detection
 */
export declare function stopDetection(): void;
/**
 * Check if detection is currently running
 */
export declare function isDetecting(): boolean;
