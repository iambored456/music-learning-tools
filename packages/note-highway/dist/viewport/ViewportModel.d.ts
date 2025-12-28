/**
 * Viewport Model
 *
 * Handles the mapping between MIDI pitch values and Y coordinates.
 * The viewport defines which pitch range is visible and how pitches
 * are positioned vertically.
 */
import type { TimedNote } from '@mlt/rhythm-core';
import type { HighwayViewport } from '../types.js';
export interface IViewportModel {
    updateConfig(config: Partial<HighwayViewport>): void;
    getConfig(): HighwayViewport;
    setMidiRange(minMidi: number, maxMidi: number): void;
    calculateMidiRangeFromNotes(notes: TimedNote[], marginSemitones?: number): void;
    getVisibleMidiRange(): {
        minMidi: number;
        maxMidi: number;
    };
    midiToY(midi: number): number;
    yToMidi(y: number): number;
    getRowHeight(): number;
    getRowCount(): number;
}
/**
 * Create a viewport model instance.
 */
export declare function createViewportModel(config?: Partial<HighwayViewport>): IViewportModel;
//# sourceMappingURL=ViewportModel.d.ts.map