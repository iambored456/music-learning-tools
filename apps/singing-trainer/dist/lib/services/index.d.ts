/**
 * Service exports
 */
export { startDetection, stopDetection, isDetecting, } from './pitchDetection.js';
export { startDrone, stopDrone, updateDrone, toggleDrone, isDronePlaying, dispose as disposeDrone, } from './droneAudio.js';
