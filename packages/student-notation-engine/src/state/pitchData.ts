/**
 * Pitch Data Re-exports
 *
 * Re-exports pitch data from the shared @mlt/pitch-data package
 * for backwards compatibility with existing engine consumers.
 */
export {
  fullRowData,
  getPitchByToneNote,
  getPitchByIndex,
  getPitchIndex,
  resolvePitchRange,
  type PitchRowData,
} from '@mlt/pitch-data';
