# Student Notation printing

Printing prepares a document from score state. The preview shows complete SVG pages, and the print action sends those exact SVG strings to an isolated iframe. Editor CSS, scroll position, playback, screen zoom, and device pixel ratio do not determine page geometry.

## Pipeline

1. `src/services/print/scoreScene.ts` snapshots state and renders a vector scene at canonical notation dimensions. It uses existing column/pixel mapping and tonal-label logic with explicit state.
2. `src/services/printLayout.ts` groups whole bars into lines. A pickup stays with the first regular bar. A final partial bar and trailing tonic columns remain included.
3. `src/services/print/pageLayout.ts` applies crop, notation size, paper size, margins, and pagination in points (72 points per inch).
4. `src/services/print/printDocument.ts` creates immutable, self-contained SVG pages. Each line clips the appropriate musical span and repeats the selected legends. Sustained notes crossing a line break receive continuation marks.
5. `PrintPreviewBridge.svelte` displays those pages and regenerates them when settings or score content change. Resizing the dialog only changes the displayed image size.
6. `src/services/printService.ts` creates an isolated print document, waits for every page image to decode and document fonts to be ready, then invokes its window's print function. It keeps the document until `afterprint`, cleans up on failure, and disposes any retained frame before another print.

The former editor-canvas capture, cached rhythm-button screenshot, staging area, and editor-hiding print CSS are no longer used.

## Controls and sizing

- **Bars per line:** zero means all bars on one line. Eight regular bars with four per line produces two lines.
- **Pages:** fit to one page, or paginate complete lines. Pagination never splits a line vertically.
- **Notation size:** 25–200% of canonical size. It is a requested maximum; page width and line height can require reduction. The preview reports that reduction.
- **Paper/orientation:** Letter, 11×14, or 11×17, portrait or landscape. Content has an internal quarter-inch margin.
- **Pitch range:** “Fit score content” uses only pitched notes, including the actual note positions within rhythm stamps, with no extra pitch rows above or below. Tonics, legends, drums, annotations, stamp anchors, and unused stamp offsets do not expand the range. Annotations outside that range can be clipped. With no pitched notes, the default print range is used. “Current pitch range” explicitly uses the editor's viewport range. The full gamut is never sliced.
- **Inclusions:** rhythm labels, drums, left legend, and right legend. Rhythm labels are rendered from meter/grouping data, without editor buttons.
- **Color:** color or grayscale. Pitch/degree labels, accidental choices, octave labels, frequency labels, and focused legend colours follow score display settings.
- **Crop each line:** percentages trim each line before page layout. The preview shows the final crop. Reset restores the complete line. Crop settings are retained when the dialog reopens.

Canvas-space positions are used for persisted notes, tonic signs, and annotations. Stamps use time-space positions and are converted explicitly; tonic columns advance no time. Global row indices remain canonical. Print rendering uses the existing pixel-map service for modulation and invalidates its shared cache before and after acquiring print coordinates.

## Output quality and limits

Grid lines, noteheads, sustained notes, tonic signs, stamp shapes, drums, labels, and annotations are SVG geometry/text. They do not depend on captured screen pixels. Print typography uses Arial/sans-serif independently of the editor's web font. Text annotations use a separate canvas only to measure text, with the result rendered as vector text.

`rasterizePrintPage(page, dpi)` is available for consumers needing a bitmap. It draws vectors at the requested physical resolution (default 300 DPI, supported range 72–600); a landscape Letter page at 300 DPI is 3300×2550 pixels. Normal preview and printing use SVG directly.

Browser/printer paper, scaling, margins, and header/footer settings can override the requested page format. Match the chosen paper and orientation; use 100% scale, no additional margins, and disabled browser headers/footers when comparing. The application cannot force printer-driver settings. This is not a separate PDF-generation engine; Save as PDF uses the browser's print dialog.

The renderer includes persisted notation and annotations, not editor selection handles or playback indicators. Very long layouts are limited to 200 pages. Keep new notation features covered in both the interactive and print renderers.

## Validation

Focused tests cover bar grouping, pickups, physical page boundaries, crop, immutable prepared pages, independence from editor geometry, tonic/modulation coordinates, stamps, drum subdivisions, annotations, legend settings, sustained-note continuations, raster dimensions, and the isolated print handoff.

```powershell
pnpm --filter @mlt/student-notation-ui run typecheck
pnpm --filter @mlt/student-notation-ui exec vitest run src/services/printLayout.test.ts src/services/printService.test.ts src/services/print/printDocument.test.ts
```

Manual inspection in the already-running Hub at `/student-notation/`:

1. Print eight bars with four bars per line. Compare both preview lines with the native print dialog and Save as PDF.
2. Try a longer score with multiple pages and increased notation size. Check page count, whole lines, and the final partial line.
3. Toggle drums, rhythm labels, and both legends. Include a pickup, tonic change, modulation, stamps, and a sustained note crossing a break.
4. Change crop, paper, orientation, grayscale, and pitch range. Compare the native preview again.
5. Cancel printing, print again, and reopen the preview after a score edit.
6. Check a desktop-width dialog and a window narrower than 760px; resizing must not change the prepared page count or line breaks.

Browser automation and visual verification are deliberately left to the user's repository workflow unless separately requested.
