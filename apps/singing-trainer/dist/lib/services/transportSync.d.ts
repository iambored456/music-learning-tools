import { YouTubeSyncConfig } from '../types/ultrastar.js';
export interface TransportSyncOptions {
    /** Sync configuration from Ultrastar metadata */
    syncConfig: YouTubeSyncConfig;
    /** Interval for checking drift (ms) */
    driftCheckIntervalMs?: number;
    /** Maximum allowed drift before correction (ms) */
    maxDriftMs?: number;
}
export interface DriftCheckResult {
    /** Drift amount in milliseconds */
    driftMs: number;
    /** Whether drift exceeds threshold and needs correction */
    needsCorrection: boolean;
    /** Suggested corrected transport time (ms) */
    correctedTransportTimeMs?: number;
}
/**
 * Create a transport sync coordinator
 */
export declare function createTransportSync(options: TransportSyncOptions): {
    getYouTubeOffset: () => number;
    getTotalOffset: () => number;
    getManualOffset: () => number;
    getSyncLoopConfig: () => {
        intervalMs: number;
        maxDriftMs: number;
    };
    transportToYouTube: (transportTimeMs: number) => number;
    youTubeToTransport: (youtubeTimeSec: number) => number;
    checkDrift: (transportTimeMs: number, youtubeTimeSec: number) => DriftCheckResult;
    updateConfig: (partial: Partial<YouTubeSyncConfig>) => void;
    adjustManualOffset: (deltaSec: number) => void;
    resetManualOffset: () => void;
    formatOffset: () => string;
    getConfig: () => {
        gapMs: number;
        videoGapSec: number;
        manualOffsetSec: number;
    };
};
/** Type for the transport sync instance */
export type TransportSyncInstance = ReturnType<typeof createTransportSync>;
