# Student Notation Layout Sizing

This document describes how grid sizing currently works in `packages/student-notation-ui`.

## Goals

- Keep pitch cells square.
- Keep drum cells square and matched to pitch time-cell width.
- Maximize pitch viewport usage without scrollbar-feedback jitter.
- Show the horizontal scrollbar when content at the full-height cell size exceeds available width.

## Layout Hierarchy

Primary containers:

- `#app-container` (full app flex column)
- `#toolbar` (fixed block size via CSS variables)
- `#canvas-container` / `#canvas-content` (remaining space)
- `#grids-wrapper` (horizontal scroll container for button + pitch + drum grids)
- `#pitch-grid-wrapper` -> `#pitch-grid-container` (pitch viewport container)
- `#drum-grid-wrapper` (drum row section)

Horizontal scrollbar lives on `#grids-wrapper`.

## Core Sizing Pass (`layoutService.recalcAndApplyLayout`)

Each layout pass does this in order:

1. Read current pitch span from `store.state.pitchRange`.
2. Recover the full assembly height before the native horizontal scrollbar consumes space:
   - `horizontalScrollbarBlockSize = #grids-wrapper.offsetHeight - #grids-wrapper.clientHeight`
   - `fullHeight = #grids-wrapper.clientHeight + horizontalScrollbarBlockSize` (the wrapper has no borders).
3. Resolve the largest integer cell size fitting that full height, reserving space only for visible button and drum grids. Calculate its total width, including tempo modulation and rounded legends.
4. Decide horizontal overflow from that full-height width versus `#grids-wrapper.clientWidth`. Apply `overflow-x: scroll` or `hidden`, then measure `clientHeight` again and resolve the final assembly size using the actual scrollbar budget. This keeps the overflow decision independent of the cell shrink it causes.
   - `cellWidth = round(cellHeight * GRID_WIDTH_RATIO)`
   - `pitchViewportHeight = (rowCount + 1) * cellHeight / 2`
5. Freeze `passCellWidth` for that pass (single width basis per pass).
6. Compute widths:
   - musical width from columns (+ modulation mapping if active)
   - legend widths from `SIDE_COLUMN_WIDTH * 2 * passCellWidth` (left and right)
   - total width = left legend + musical + right legend
7. Apply total width to wrappers (`button`, `pitch`, `drum`).
8. Resize pitch canvases and legend canvases to measured pitch container height.
9. Size drum grid from `passCellWidth`:
   - `drumRowHeight = round(passCellHeight * 0.618)` (61.8% of a pitch row)
   - `drumHeight = DRUM_ROW_COUNT * drumRowHeight`
10. Re-check pitch container height after drum sizing and resync pitch/legend canvas heights if it changed.
11. Run deferred and frame-end safety resyncs (see below).

## Jitter / Drift Protection

The system now uses multiple safeguards:

- **Stable overflow decision**: use the full-height candidate width to decide scrollbar visibility before freezing the final cell size. Do not switch back to automatic overflow after sizing.
- **Single-width-per-pass**: avoids intra-pass width oscillation.
- **Final-pass queue**: if settled container height implies different cell dimensions, schedule bounded follow-up recalc(s) instead of mutating mid-pass.
- **Deferred resize coalescing**: stale deferred callbacks are skipped.
- **Post-frame pitch height sync**: catches flex/scrollbar settling that happens after a pass.
- **Pitch container `ResizeObserver`**: catches later container-height changes and resyncs pitch + legend canvas heights.

These are the main reasons the previous bottom white strip and width jitter improved.

## Pitch vs Drum vs Button Grid

- Pitch grid: square cells enforced by coupled X/Y scaling.
- Hidden button and drum grids are omitted from the assembly height budget, so the pitch grid expands into their freed space.
- Drum grid: row height is `round(passCellHeight * 0.618)`; its time columns track pitch width.
- Button grid: height is intentionally stabilized across zoom animation frames (`lockedButtonGridHeight`) to reduce UI jumpiness. Width still aligns to current pass widths.

## Scrollbar Behavior

- Horizontal scroll is only on `#grids-wrapper`.
- Scrollbar visibility is decided from the total canvas width at the cell size that fits without a scrollbar.
- Once needed, the scrollbar remains reserved even if the resulting smaller cells fit horizontally. Automatic overflow at this boundary would alternate forever between the larger and smaller sizes.
- Column removal, viewport resizing, pitch-range changes, and grid visibility changes recompute that same decision, allowing the scrollbar to disappear and its height to be reclaimed.
- Native scrollbar thickness is measured after applying overflow; overlay scrollbars consume no height.
- Custom styling is in `style/layout/gridsLayout.css` (currently thicker horizontal bar).

## Diagnostic Logging Status

High-volume layout diagnostics were used during debugging and are now disabled by default via:

- `ENABLE_LAYOUT_DIAGNOSTICS = false` in `src/services/layoutService.ts`

If deep sizing diagnostics are needed again, toggle that flag temporarily.
