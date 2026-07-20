# Student Notation Layout Sizing

This document describes how grid sizing currently works in `packages/student-notation-ui`.

## Goals

- Keep pitch cells square.
- Keep drum cells square and matched to pitch time-cell width.
- Maximize pitch viewport usage without scrollbar-feedback jitter.
- Show horizontal scrollbar only when content truly exceeds available width.

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
2. Measure effective height basis:
   - `liveContainerHeight = #pitch-grid-container.clientHeight`
   - `horizontalScrollbarBlockSize = #grids-wrapper.offsetHeight - #grids-wrapper.clientHeight`
   - `containerHeight = liveContainerHeight + horizontalScrollbarBlockSize`
3. Compute zoom from span + container height:
   - `calculateZoomToFitRowCount(containerHeight, rowCount)` with `paddingRows: 0`
4. Compute cell size:
   - `rawCellHeight = BASE_ABSTRACT_UNIT * zoom`
   - quantize with hysteresis
   - enforce minimum coverage (`getMinimumCellHeightForViewportCoverage`)
   - `cellWidth = round(cellHeight * GRID_WIDTH_RATIO)`
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

- **Single-width-per-pass**: avoids intra-pass width oscillation.
- **Final-pass queue**: if settled container height implies different cell dimensions, schedule bounded follow-up recalc(s) instead of mutating mid-pass.
- **Deferred resize coalescing**: stale deferred callbacks are skipped.
- **Post-frame pitch height sync**: catches flex/scrollbar settling that happens after a pass.
- **Pitch container `ResizeObserver`**: catches later container-height changes and resyncs pitch + legend canvas heights.

These are the main reasons the previous bottom white strip and width jitter improved.

## Pitch vs Drum vs Button Grid

- Pitch grid: square cells enforced by coupled X/Y scaling.
- Drum grid: row height forced to `round(passCellWidth)`, so drum cells stay square and track pitch width.
- Button grid: height is intentionally stabilized across zoom animation frames (`lockedButtonGridHeight`) to reduce UI jumpiness. Width still aligns to current pass widths.

## Scrollbar Behavior

- Horizontal scroll is only on `#grids-wrapper`.
- Scrollbar appears when `totalCanvasWidthPx > gridsWrapperWidth`.
- Custom styling is in `style/layout/gridsLayout.css` (currently thicker horizontal bar).

## Diagnostic Logging Status

High-volume layout diagnostics were used during debugging and are now disabled by default via:

- `ENABLE_LAYOUT_DIAGNOSTICS = false` in `src/services/layoutService.ts`

If deep sizing diagnostics are needed again, toggle that flag temporarily.
