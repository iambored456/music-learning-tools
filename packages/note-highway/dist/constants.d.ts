/**
 * @mlt/note-highway - Default Configuration Constants
 */
import type { HighwayViewport, ScrollConfig, JudgmentLineConfig, InputCursorConfig, InputTrailConfig, NoteRenderConfig, GridRenderConfig, TonicIndicatorConfig, HighwayConfig } from './types.js';
export declare const DEFAULT_VIEWPORT: HighwayViewport;
export declare const DEFAULT_SCROLL_CONFIG: ScrollConfig;
export declare const DEFAULT_JUDGMENT_LINE_CONFIG: JudgmentLineConfig;
export declare const DEFAULT_INPUT_CURSOR_CONFIG: InputCursorConfig;
export declare const DEFAULT_INPUT_TRAIL_CONFIG: InputTrailConfig;
export declare const DEFAULT_NOTE_RENDER_CONFIG: NoteRenderConfig;
export declare const DEFAULT_GRID_RENDER_CONFIG: GridRenderConfig;
export declare const DEFAULT_TONIC_INDICATOR_CONFIG: TonicIndicatorConfig;
export declare const DEFAULT_HIGHWAY_CONFIG: HighwayConfig;
/**
 * Calculate scroll config values from measures and tempo.
 *
 * @param measuresAhead - Number of measures visible ahead
 * @param measureDurationMs - Duration of one measure in ms
 * @param viewportWidth - Viewport width in pixels
 * @param judgmentLineFraction - Where the judgment line is (0-1)
 * @param msVisibleBehind - Milliseconds visible behind judgment line
 */
export declare function calculateScrollConfig(measuresAhead: number, measureDurationMs: number, viewportWidth: number, judgmentLineFraction: number, msVisibleBehind: number): ScrollConfig;
/**
 * Calculate viewport MIDI range from notes.
 *
 * @param notes - Array of notes
 * @param margin - Semitones to add above/below
 * @returns Min and max MIDI values
 */
export declare function calculateMidiRange(notes: Array<{
    midiPitch: number;
}>, margin?: number): {
    minMidi: number;
    maxMidi: number;
};
//# sourceMappingURL=constants.d.ts.map