/**
 * @mlt/overdub-engine
 *
 * Headless overdub project model and state machine.
 */
export { DEFAULT_ENGINE_CONFIG, DEFAULT_PHRASE_SETTINGS, computePhraseDurationMs, createLayer, createProject, getActiveTakeIds, hasCommittedTakes, } from './constants.js';
export { createOverdubEngine } from './stateMachine.js';
