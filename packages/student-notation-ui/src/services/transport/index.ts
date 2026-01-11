/**
 * Transport Service Module
 *
 * Barrel export for transport and playback functionality.
 *
 * Sub-modules:
 * - types.ts: Type definitions for transport
 * - timeMapCalculator.ts: Time map calculation and modulation
 * - drumManager.ts: Drum player initialization and scheduling
 *
 * Main service (transportService.ts) coordinates these modules
 * and provides the public API.
 */

// Types
export * from './types.ts';

// Time map calculation
export {
  getMicrobeatDuration,
  findNonAnacrusisStart,
  reapplyConfiguredLoopBounds,
  setLoopBounds,
  updateLoopBoundsFromTimeline,
  getConfiguredLoopBounds,
  setConfiguredLoopBounds,
  clearConfiguredLoopBounds,
  calculateMusicalEndTime,
  getMusicalEndTime,
  getTimeMap,
  applyModulationToTime,
  calculateTimeMap
} from './timeMapCalculator.ts';

// Drum management
export {
  resetDrumStartTimes,
  getSafeDrumStartTime,
  getDrumPlayers,
  initDrumPlayers,
  triggerDrum
} from './drumManager.ts';

// Main service (default export)
import TransportService from '../initTransport.ts';
export default TransportService;
