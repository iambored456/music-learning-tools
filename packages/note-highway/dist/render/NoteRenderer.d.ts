/**
 * Note Renderer
 *
 * Renders target notes as stadium (pill) shapes or rectangles.
 * Supports:
 * - Multiple note states (active, passed, upcoming)
 * - Accuracy-based coloring for passed notes
 * - Stadium (pill) or rectangle shapes
 */
import type { RenderableNote, NoteRenderConfig } from '../types.js';
export interface INoteRenderer {
    render(ctx: CanvasRenderingContext2D, notes: RenderableNote[], config?: Partial<NoteRenderConfig>): void;
}
/**
 * Create a note renderer.
 */
export declare function createNoteRenderer(): INoteRenderer;
//# sourceMappingURL=NoteRenderer.d.ts.map