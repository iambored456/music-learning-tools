/**
 * Transport Service
 *
 * Framework-agnostic playback controller using Tone.js Transport.
 *
 * TODO: Extract implementation from apps/student-notation/src/services/transportService.ts
 * Key refactoring needed:
 * - Remove domCache.get() calls
 * - Pass canvas contexts as parameters to animate functions
 * - Remove document.getElementById / document.createElement calls
 * - Accept callbacks for highlight rendering instead of direct DOM manipulation
 */

import type { TransportServiceInstance, TransportConfig } from './types.js';

/**
 * Create a new transport service instance
 */
export function createTransportService(_config: TransportConfig): TransportServiceInstance {
  throw new Error(
    'TransportService not yet implemented. Needs to be extracted from ' +
    'apps/student-notation/src/services/transportService.ts'
  );
}
