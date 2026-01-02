/**
 * Rhythm Module
 *
 * Framework-agnostic rhythm and modulation utilities.
 */

export {
  createModulationMarker,
  createCoordinateMapping,
  getModulationDisplayText,
  getModulationColor,
  columnToRegularTime,
  canvasXToSeconds,
  secondsToCanvasX,
  MODULATION_RATIOS,
  type ModulationSegment,
  type CoordinateMapping,
  type MacrobeatInfo,
  type ModulationMappingState,
  type ModulationMappingCallbacks
} from './modulationMapping.js';
