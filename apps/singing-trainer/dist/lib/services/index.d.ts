/**
 * Service exports
 */
export { startDetection, stopDetection, isDetecting, } from './pitchDetection.js';
export { startDrone, stopDrone, updateDrone, toggleDrone, isDronePlaying, dispose as disposeDrone, } from './droneAudio.js';
export { parseUltrastarFile, extractYouTubeId, convertToTargetNotes, getSyncConfig, calculateSongDuration, detectPitchRange, } from './ultrastarParser.js';
export { loadYouTubeAPI, createYouTubePlayer, isYouTubeAPILoaded, getYouTubeErrorMessage, } from './youtubePlayer.js';
export { createTransportSync, type TransportSyncInstance, } from './transportSync.js';
