/**
 * Drone Audio Service
 *
 * Provides a sustained drone tone using Tone.js for pitch reference.
 */
/**
 * Start playing the drone
 */
export declare function startDrone(): Promise<void>;
/**
 * Stop the drone
 */
export declare function stopDrone(): void;
/**
 * Update drone parameters (tonic, octave, volume)
 */
export declare function updateDrone(): void;
/**
 * Toggle drone on/off
 */
export declare function toggleDrone(): Promise<void>;
/**
 * Check if drone is playing
 */
export declare function isDronePlaying(): boolean;
/**
 * Clean up resources
 */
export declare function dispose(): void;
