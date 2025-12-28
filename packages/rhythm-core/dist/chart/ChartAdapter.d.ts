/**
 * Chart Adapter
 *
 * Converts a SingingTrainerSnapshot (pitchGrid representation) into
 * time-based events that can be used by the rhythm system.
 *
 * Key responsibilities:
 * - Convert microbeat columns to milliseconds
 * - Skip tonic columns (they don't consume time)
 * - Extract beat and measure markers
 * - Identify short notes (16ths, triplets) for looser tolerance
 */
import type { SingingTrainerSnapshot } from '@mlt/handoff';
import type { SessionTimeMs, TimedNote, TimedBeat, ChartAdapterConfig, ChartData } from '../types.js';
export interface IChartAdapter {
    loadSnapshot(snapshot: SingingTrainerSnapshot): ChartData;
    microbeatToMs(microbeatIndex: number): SessionTimeMs;
    msToMicrobeatIndex(timeMs: SessionTimeMs): number;
    getChartData(): ChartData | null;
    getNotesInRange(startMs: SessionTimeMs, endMs: SessionTimeMs): TimedNote[];
    getBeatsInRange(startMs: SessionTimeMs, endMs: SessionTimeMs): TimedBeat[];
    getVoiceIds(): string[];
    getNotesForVoice(voiceId: string): TimedNote[];
    setTempo(tempo: number): void;
    getTempo(): number;
}
/**
 * Create a chart adapter instance.
 */
export declare function createChartAdapter(config?: Partial<ChartAdapterConfig>): IChartAdapter;
//# sourceMappingURL=ChartAdapter.d.ts.map