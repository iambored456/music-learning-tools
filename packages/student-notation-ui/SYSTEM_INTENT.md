# SYSTEM_INTENT.md

This document describes the intended behavior and architecture of Student Notation, a web-based music notation and playback application. It is written for AI assistants and serves as a contract: if the code behaves differently from this document, the document is wrong and should be updated.

---

## 1. Purpose

Student Notation is a browser-based, grid-first music sketchpad designed to make core music-theory ideas explorable without requiring Western staff notation. It enables learners and teachers to quickly place musical ideas on a labeled grid, hear the result immediately, and connect what they see to what they hear - with minimal prerequisite knowledge and minimal UI friction.

**Primary Users:**
- Students learning pitch/rhythm relationships who may not read staff notation
- Music educators demonstrating concepts live (projected screen, classroom, lessons)
- Curious hobbyists exploring alternative notations and timbres

**Non-Goals:**
- Not a full DAW (no multi-track editing, mixing, automation, plugins)
- Not an engraving tool (no staff notation, MusicXML import/export)
- Not a collaboration platform (no accounts, multi-user sessions)

---

## 2. App Overview

### What the app does
- Displays a scrollable/zoomable pitch grid canvas where **time maps to X** and **pitch maps to Y**
- Allows placing circle notes (2-microbeat span), oval notes (1-microbeat span), and diamond notes
- Supports rhythm decorators: sixteenth stamps (preset rhythmic figures) and triplet stamps (3-note figures)
- Provides tonic sign placement for key signature changes (7 rows per tonic group)
- Plays back notation using Tone.js web audio synthesis with configurable timbres (waveform harmonics, ADSR envelope, vibrato, tremolo, filter)
- Includes a separate drum grid (3 tracks: H/M/L for hi-hat, mid, low)
- Supports tempo modulation markers that stretch/compress visual and audio timing
- Persists state to localStorage; supports undo/redo

### Primary user flows
1. **Sketch loop**: Select tool -> place notes/sixteenth stamps/triplet stamps -> adjust duration/position -> play
2. **Theory loop**: Place tonic/key context -> view scale-degree labels -> iterate via listening
3. **Rhythm loop**: Set macrobeats/time feel -> adjust tempo -> add drums/sixteenth stamps/triplet stamps -> play
4. **Share loop**: Print/export a clear snapshot for worksheets or classroom use

---

## 3. Core Vocabulary

This codebase draws a 2D grid where **time maps to X** and **pitch maps to Y**. Many bugs (and fixes) depend on keeping the following concepts distinct.

### Pitch Terminology

| Term | Definition |
|------|------------|
| **Pitch gamut** | The complete set of available pitch rows (A0-C8 + visual boundary row). Implemented as `fullRowData` in `src/state/pitchData.ts` (often imported as `masterRowData`). **Never sliced.** |
| **Pitch viewport** | The currently visible window into the pitch gamut. Implemented as `pitchRange` in app state (`{ topIndex, bottomIndex }`, inclusive indices into the pitch gamut array). |
| **Pitch row index (gamut index / global row / globalRow)** | An index into the pitch gamut array (0-104). In persisted items this is stored as `globalRow`. Used for playback and persistence. |
| **Viewport row index (relative row / row)** | A row index relative to the current `pitchRange.topIndex`. Older code sometimes stored this as `row`. Legacy field; code is migrating to globalRow as source of truth. |

### Rendering & Layout Terminology

| Term | Definition |
|------|------------|
| **Pitch viewport container** | The DOM element that defines the visible pitch area height. In code this is the element with id `pitch-grid-container`. |
| **Pitch Y-axis labels (legend canvases)** | The left/right side canvases that draw pitch labels. Historically called "legend" canvases (`legend-left-canvas`, `legend-right-canvas`). |
| **Row spacing (halfUnit)** | `cellHeight / 2`. Row centers are spaced at halfUnit intervals. Row cells are `cellHeight` tall, so rows overlap and can "peek" into view at viewport edges. |
| **cellHeight** | The height of one pitch row cell in pixels (at current zoom). Base value = `BASE_ABSTRACT_UNIT * zoomLevel`. |
| **cellWidth** | The width of one microbeat column in pixels. Calculated as `cellHeight * GRID_WIDTH_RATIO`. |

### Viewport Math Conventions

| Term | Definition |
|------|------------|
| **startRank** | The first visible **gamut** row index (equivalent to `pitchRange.topIndex` after clamping). |
| **endRank** | An **exclusive** upper bound (one past the last visible gamut row). Used for iteration conversions: `endRow = endRank - 1`. |

### Column Coordinate Terminology

| Term | Definition |
|------|------------|
| **Canvas-space column** | A column index where 0 = first musical beat. Excludes legend columns. Includes tonic columns. **All persisted data uses canvas-space.** |
| **Time-space column** | A column index where 0 = first playable microbeat. Excludes legends AND tonic columns. Used for playback scheduling. |
| **Visual-space column** | Full grid index including left legends (2 cols) + musical area + right legends (2 cols). Used for full grid rendering. |

### Time & Rhythm Terminology

| Term | Definition |
|------|------------|
| **Microbeat** | The smallest time unit. 1 microbeat = 1 column width at base zoom. BPM is applied as `microbeatBPM = tempo * 2`. |
| **Macrobeat** | A grouping of microbeats (2 or 3). Determines time signature feel. |
| **Tonic sign** | A key signature marker that occupies 2 canvas columns but 0 time columns. Shifts subsequent notes when placed. |
| **Modulation marker** | A tempo change point with a ratio (e.g., 0.5 for half-speed, 2.0 for double-speed) that compresses/expands subsequent columns visually and temporally. |

### Note & Decorator Terminology

| Term | Definition |
|------|------------|
| **Circle note** | A note shape spanning 2 canvas columns (start + 1 tail column). Can be extended by dragging tail. |
| **Oval note** | A note shape spanning 1 canvas column. Fixed duration. |
| **Diamond note** | A note shape (currently same span behavior as oval). |
| **Stamp (umbrella)** | A preset rhythmic figure placed as a single unit. This includes both sixteenth stamps and triplet stamps. |
| **Sixteenth stamp** | A preset rhythmic figure (2+ shapes) spanning 2 canvas columns. Has per-shape pitch offsets (`shapeOffsets`). |
| **Triplet stamp** | A 3-note rhythmic figure spanning a configurable cell range. |

### Why Terminology Matters

Understanding which coordinate system you're in is critical for debugging:

- **Issues in `src/state/pitchData.ts`** are usually **gamut** issues (missing rows, boundary padding rows, pitch metadata).
- **Issues in `src/services/layoutService.ts` and the PitchGrid renderers** are usually **viewport** issues (row-count math, canvas sizing, draw-range coverage).
- **Issues in `src/services/columnMapService.ts`** are usually **column space conversion** issues (visual vs canvas vs time indices).
- **Issues in `src/services/transportService.ts`** are usually **time-space** issues (timeMap indices, tonic column handling, modulation).

---

## 4. System Model

### 4.1 State Architecture

```
src/state/index.ts (Store singleton)
├── initialState (src/state/initialState/index.ts)
├── Actions (src/state/actions/*.ts)
│   ├── noteActions.ts     - Note CRUD, tonic sign management
│   ├── sixteenthStampActions.ts    - Sixteenth stamp placement/removal
│   ├── tripletStampActions.ts      - Triplet stamp placement/removal
│   ├── historyActions.ts  - Undo/redo stack
│   ├── rhythmActions.ts   - Macrobeat groupings, modulation markers
│   ├── viewActions.ts     - Tool selection, layout config, pitch range
│   ├── timbreActions.ts   - ADSR, harmonics, filter settings
│   └── harmonyActions.ts  - Chord intervals
└── Event system (store.emit / store.on)
```

The store uses a pub/sub event system for reactive updates. Key events:
- `notesChanged` - Note array modified
- `sixteenthStampPlacementsChanged` - Sixteenth stamps modified
- `tripletStampPlacementsChanged` - Triplet stamps modified
- `layoutConfigChanged` - Cell dimensions, column widths changed
- `zoomChanged` / `scrollChanged` - Viewport changes
- `tempoModulationMarkersChanged` - Tempo markers modified
- `rhythmStructureChanged` - Macrobeats or tonic signs changed
- `tempoChanged` - BPM changed
- `timbreChanged` - Synth timbre parameters changed

### 4.2 Coordinate Systems

Three coordinate spaces exist for columns:

| Space | Index 0 | Includes | Use Case |
|-------|---------|----------|----------|
| Visual | Left edge of left legend | Legends + musical + legends | Full grid rendering |
| Canvas | First musical beat | Musical columns + tonic columns | Data storage, interaction |
| Time | First playable microbeat | Musical columns only (no tonics) | Playback scheduling |

**Critical rule: All persisted data uses canvas-space.** Renderers receive canvas-space and convert to pixels using `pixelMapService`.

Conversion service: `src/services/columnMapService.ts` provides O(1) bidirectional lookups with `ColumnEntry` objects:
```typescript
interface ColumnEntry {
  visualIndex: number;      // Full grid position
  canvasIndex: number | null;  // Musical area position (null for legends)
  timeIndex: number | null;    // Playable time position (null for legends/tonics)
  type: 'legend' | 'beat' | 'tonic';
  macrobeatIndex: number | null;
}
```

### 4.3 Data Flow

```
User Interaction (pitchGridInteractor.ts)
    ↓
Store Action (store.addNote, store.addSixteenthStampPlacement, store.addTripletStampPlacement, etc.)
    ↓
State Mutation + store.emit('notesChanged')
    ↓
Renderer Response (pitchGridRenderer.ts redraws)
    ↓
Transport Response (transportService.ts reschedules if playing)
```

### 4.4 Canvas Layers

```
pitch-grid-container (DOM element - viewport sizing)
├── legend-left-canvas   (pitch labels, 2 columns wide)
├── notation-grid        (main musical canvas - notes, sixteenth stamps, triplet stamps, grid lines)
├── playhead-canvas      (playhead line overlay)
├── hover-canvas         (drag preview, lasso selection overlay)
└── legend-right-canvas  (pitch labels, 2 columns wide)

drum-grid-wrapper (DOM element)
├── drum-left-cell       (empty spacer matching legend width)
├── drum-grid            (drum note canvas)
├── drum-playhead-canvas
├── drum-hover-canvas
└── drum-right-cell      (empty spacer)
```

### 4.5 Key Data Structures

**PlacedNote** (`types/state.d.ts`):
```typescript
interface PlacedNote {
  uuid: string;
  row: number;                    // Viewport-relative (legacy)
  globalRow?: number;             // Gamut index (source of truth)
  startColumnIndex: CanvasSpaceColumn;  // Canvas-space
  endColumnIndex: CanvasSpaceColumn;    // Canvas-space
  shape: 'circle' | 'oval' | 'diamond';
  color: string;                  // Tool color, maps to timbre
  isDrum?: boolean;
  drumTrack?: number | string | null;
}
```

**SixteenthStampPlacement** (`types/state.d.ts`):
```typescript
interface SixteenthStampPlacement {
  id: string;
  sixteenthStampId: number;       // References sixteenth stamp definition
  startColumn: CanvasSpaceColumn;
  endColumn: CanvasSpaceColumn;
  row: number;
  globalRow?: number;
  color: string;
  shapeOffsets?: Record<string, number>;  // Per-shape pitch offsets
}
```

**TripletStampPlacement** (`types/state.d.ts`):
```typescript
interface TripletStampPlacement {
  id: string;
  tripletStampId: number;         // References triplet stamp definition
  startCellIndex: number;
  span: number;
  row: number;
  globalRow?: number;
  color: string;
  shapeOffsets?: Record<string, number>;
}
```

**TonicSign** (`types/state.d.ts`):
```typescript
interface TonicSign {
  columnIndex: CanvasSpaceColumn;
  row: number;
  globalRow?: number;
  tonicNumber: number;            // 1-7 for diatonic modes
  preMacrobeatIndex: number;      // Which macrobeat boundary this precedes
  uuid?: string;
}
```

---

## 5. Invariants

These conditions MUST remain true. Violations indicate bugs.

### Position Invariants
1. **globalRow is source of truth**: `note.globalRow` is the canonical pitch position. `note.row` should equal `note.globalRow` after any mutation.
2. **Column indices are canvas-space**: `PlacedNote.startColumnIndex`, `PlacedNote.endColumnIndex`, `SixteenthStampPlacement.startColumn`, `TonicSign.columnIndex` are all canvas-space (0 = first beat).
3. **Tonic signs occupy 2 columns, 0 time**: A tonic sign at canvas column X means columns X and X+1 exist visually but do not advance `timeMap`.
4. **Circle notes span 2 columns**: `endColumnIndex = startColumnIndex + 1` for circle notes.
5. **Oval notes span 1 column**: `endColumnIndex = startColumnIndex` for oval notes.

### Render Invariants
6. **Row Y = (globalRow - startRank) * halfUnit**: Row centers are positioned at halfUnit intervals from viewport top. Row 0's center is at Y=0.
7. **getVisibleRowRange().endRow is inclusive**: Unlike endRank (exclusive), endRow is inclusive for iteration (`<= endRow`).
8. **Pixel coordinates come from pixelMapService**: All column-to-pixel and pixel-to-column conversions should go through `pixelMapService` for modulation consistency.
9. **Legend width is constant**: Left/right legends are always `SIDE_COLUMN_WIDTH * 2 * cellWidth` pixels wide (not in columnWidths array).

### Audio Invariants
10. **fullRowData is never sliced**: Pitch lookups always use the complete gamut. Playback uses `note.globalRow ?? note.row` to find pitch in `fullRowData`.
11. **timeMap indices match canvas-space**: `timeMap[canvasColumn]` gives the time in seconds for that column's start.
12. **Tonic columns have zero time duration**: `currentTime += 0` when processing tonic columns in `calculateRegularTimeMap`.
13. **Notes before anacrusisOffset are skipped**: If `hasAnacrusis`, notes scheduled before the first solid macrobeat boundary are not played in looping mode.

### State Invariants
14. **recordState() creates a deep snapshot**: History entries are independent copies; mutations to current state don't affect history.
15. **pitchRange indices are clamped**: `topIndex >= 0`, `bottomIndex <= fullRowData.length - 1`, `topIndex <= bottomIndex`.
16. **UUID uniqueness**: Each `PlacedNote`, `SixteenthStampPlacement`, `TripletStampPlacement`, `TonicSign` has a unique `uuid` or `id`.
17. **columnWidths array is canvas-space**: After Phase 8 migration, `state.columnWidths` contains only musical columns (no legends).

---

## 6. Module Responsibilities

### Core Services

| Module | Responsibility |
|--------|----------------|
| `layoutService.ts` | **Legacy coordinator** for layout + pitch viewport concerns. Being decomposed; prefer using narrow services (see `pitchGridViewportService.ts`, `pixelMapService.ts`, `columnMapService.ts`) where available. |
| `pitchGridViewportService.ts` | **Pitch-grid viewport API** (read/write): `getViewportInfo()`, `setPitchViewportRange()`, `setViewportTopIndex()`, `setViewportBottomIndex()`. Transitional facade currently delegating to `layoutService.ts` while consumers migrate. |
| `columnMapService.ts` | O(1) bidirectional column index lookups across visual/canvas/time coordinate spaces |
| `pixelMapService.ts` | Column-to-pixel and pixel-to-column conversion with modulation support and caching |
| `transportService.ts` | Playback scheduling via Tone.js Transport, timeMap calculation, playhead animation, loop bounds |
| `synthEngine.ts` | PolySynth management per timbre color, effects routing, and analyzer taps. Gain/clipping responsibilities are being moved into `src/services/audio/*`. |
| `audioPreviewService.ts` | Centralized note-preview behavior (attack/release/throttling) for interactive tools; delegates audio to `synthEngine.ts`. |
| `services/audio/FilteredVoice.ts` | Custom Tone.js voice implementation (filter blend + vibrato/tremolo routing) used by `synthEngine.ts`. |
| `services/audio/GainManager.ts` | Polyphony-aware master gain scaling loop (`noteOn`/`noteOff`, smoothing). Canonical gain staging implementation. |
| `services/audio/ClippingMonitor.ts` | Periodic clipping detection wrapper around `Tone.Meter` with cooldown + callback. |
| `globalService.ts` | Cross-module state sharing (ADSR component reference, etc.) |

### Renderers (`src/components/canvas/PitchGrid/renderers/`)

| Module | Responsibility |
|--------|----------------|
| `pitchGridRenderer.ts` | Orchestrates all pitch grid drawing, manages render order |
| `notes.ts` | Draws placed notes (circles, ovals, diamonds) with fills/strokes and shape-specific styling |
| `gridLines.ts` | Draws horizontal pitch lines and vertical beat lines (solid/dashed by column parity) |
| `legend.ts` | Draws pitch labels on left/right canvases with column (A/B) alignment |
| `rendererUtils.ts` | Shared utilities: getColumnX, getRowY, getVisibleRowRange, coordinate caching |

### Interactors

| Module | Responsibility |
|--------|----------------|
| `pitchGridInteractor.ts` | High-level pitch-grid event binding + shared interaction state. Delegates tool behavior to `PitchGridInteractionCoordinator.ts` and tool-specific interactors under `interactors/tools/`. |
| `PitchGridInteractionCoordinator.ts` | Routes pointer events/hover to the appropriate tool interactor and coordinates shared drag state. This exists to shrink the pitch-grid "god object" without breaking behavior. |
| `interactors/tools/PitchGridNoteToolInteractor.ts` | Note placement + drag behavior (including preview audio via `audioPreviewService.ts`). |
| `interactors/tools/PitchGridChordToolInteractor.ts` | Chord placement + drag behavior (including preview audio via `audioPreviewService.ts`). |
| `interactors/tools/PitchGridEraserToolInteractor.ts` | Eraser behavior for pitch/sixteenth-stamp/triplet-stamp regions. |
| `interactors/tools/PitchGridSixteenthStampToolInteractor.ts` | Sixteenth stamp placement + per-shape drag and rhythm preview playback. |
| `interactors/tools/PitchGridTripletStampToolInteractor.ts` | Triplet stamp placement + per-shape drag and rhythm preview playback. |
| `interactors/tools/PitchGridModulationToolInteractor.ts` | Modulation marker placement/drag/hover and cursor handling. |
| `interactors/tools/PitchGridTonicizationToolInteractor.ts` | Tonicization hover preview + placement across octaves. |
| `drumGridInteractor.ts` | Mouse/touch handling for drum grid note placement and removal |

### State Actions (`src/state/actions/`)

| Module | Responsibility |
|--------|----------------|
| `noteActions.ts` | Note CRUD, tonic sign groups, updateNoteTail, updateNoteRow, updateNotePosition, eraseInPitchArea |
| `sixteenthStampActions.ts` | addSixteenthStampPlacement, removeSixteenthStampPlacement, eraseSixteenthStampsInArea, collision detection, shape offset updates |
| `tripletStampActions.ts` | Triplet stamp placement and management, analogous to sixteenthStampActions |
| `historyActions.ts` | recordState (push snapshot), undo, redo, history stack management |
| `rhythmActions.ts` | Macrobeat groupings, boundary styles (solid/dashed/anacrusis), modulation markers |
| `viewActions.ts` | setSelectedTool, setLayoutConfig, setPitchRange, tempo, print options |
| `timbreActions.ts` | setADSR, setHarmonicCoefficients, setHarmonicPhases, setFilterSettings |

---

## 7. Core Interaction Flows

### 7.1 Note Placement (Circle Note)

```
1. User clicks on pitch grid (mousedown)
2. pitchGridInteractor.handleMouseDown():
   - Converts clientX/Y to canvas coordinates via getBoundingClientRect
   - Calculates column via pixelMapService.pixelXToColumn(canvasX)
   - Calculates row via rendererUtils.getRowFromY(canvasY)
   - Calls store.addNote({ shape: 'circle', startColumnIndex, endColumnIndex: start+1,
                           row, globalRow: row, color })
3. noteActions.addNote():
   - Validates note doesn't overlap existing notes (circle overlap: ±1 column at same row)
   - Assigns UUID via crypto.randomUUID() or fallback
   - Pushes to state.placedNotes
   - Emits 'notesChanged'
4. pitchGridRenderer responds to event, redraws
5. If user drags (mousemove), handleMouseMove() calls store.updateNoteTail(note, newEndColumn)
6. On mouseup, store.recordState() creates history snapshot for undo
```

### 7.2 Playback Start

```
1. User clicks play button
2. TransportService.start():
   - Awaits window.initAudio() (or Tone.start()) for audio context unlock
   - Calls scheduleNotes()
3. scheduleNotes():
   - Calls Tone.Transport.cancel() to clear previous events
   - Calls calculateTimeMap() to build canvas-column → time (seconds) mapping
   - Iterates state.placedNotes:
     - Gets startTime = timeMap[note.startColumnIndex]
     - Applies modulation: applyModulationToTime(startTime, columnIndex)
     - Schedules Tone.Transport.schedule(attackCallback, scheduleTime)
     - Schedules Tone.Transport.schedule(releaseCallback, releaseTime)
   - Similarly schedules sixteenth stamps (getSixteenthStampPlaybackData) and triplet stamps (getTripletStampPlaybackData)
4. Sets loop bounds: setLoopBounds(anacrusisOffset, musicalEndTime)
5. Tone.Transport.start(undefined, 0) begins playback
6. animatePlayhead() starts requestAnimationFrame loop:
   - Reads Tone.Transport.seconds
   - Finds current column by iterating timeMap
   - Calculates X position via getColumnStartX(column)
   - Draws red playhead line
   - Adjusts Tone.Transport.bpm.value when crossing modulation markers
```

### 7.3 Tonic Sign Placement

```
1. User selects tonic tool (tonic-1 through tonic-7)
2. Clicks before a macrobeat boundary on the grid
3. pitchGridInteractor.attemptPlaceTonicSign():
   - Determines preMacrobeatIndex from click position (which macrobeat this precedes)
   - Calculates columnIndex for the tonic sign (canvas-space)
   - Creates tonic sign group with 7 TonicSign objects (one per diatonic degree row)
   - Calls store.addTonicSignGroup(tonicSignGroup)
4. noteActions.addTonicSignGroup():
   - Shifts existing notes' column indices by +2 for all columns >= insertion point
   - Adds tonic signs to state.tonicSignGroups[groupKey]
   - Recalculates columnWidths via layoutService
   - Emits 'rhythmStructureChanged' and 'notesChanged'
5. layoutService.recalculateLayout() updates canvas widths
6. All renderers redraw with new column positions
7. columnMapService invalidates cache
```

### 7.4 Zoom and Scroll

```
Zoom:
1. User ctrl+wheel or clicks zoom button
2. layoutService.zoomIn() or zoomOut():
   - Multiplies currentZoomLevel by ZOOM_IN_FACTOR (1.25) or ZOOM_OUT_FACTOR (0.8)
   - Clamps to [MIN_ZOOM_LEVEL, MAX_ZOOM_LEVEL] (0.25 - 8.0)
   - Calls recalcAndApplyLayout():
     - Recalculates cellHeight = BASE_ABSTRACT_UNIT * zoomLevel
     - Recalculates cellWidth = cellHeight * GRID_WIDTH_RATIO
     - Updates canvas sizes via resizeCanvasForPixelRatio
     - Updates pitchRange based on new visible row count
   - Emits 'zoomChanged'

Scroll:
1. User wheel (without ctrl) on pitch grid
2. layoutService.scrollByUnits(direction):
   - Calculates new topIndex = current.topIndex + direction
   - Clamps to valid range
   - Calls store.setPitchRange({ topIndex: newTop, bottomIndex: newBottom })
   - Emits 'scrollChanged' and 'scrollByUnits'
3. Renderers respond, redraw with new viewport
```

---

## 8. Performance and Determinism Constraints

### Performance Requirements
- **60fps rendering**: Canvas redraw must complete within 16ms. Use cached viewport info, avoid DOM queries in render loops.
- **Immediate audio feedback**: Note preview on hover/drag should have < 50ms latency.
- **Smooth scrolling**: Pitch viewport scrolling should feel native; use `scrollByUnits()` for discrete row steps.

### Caching Strategy
- `rendererUtils.getCachedViewportInfo()`: 1ms TTL cache invalidated on scroll/zoom/pitchRangeChanged
- `columnMapService`: Full invalidation on rhythmStructureChanged (tonic signs, macrobeatGroupings)
- `pixelMapService`: Hash-based cache with modulation marker awareness
- `synthEngine`: Per-timbre synth instances retained across parameter changes

### Determinism Requirements
- **Identical playback**: Same state must produce identical audio. Modulation math is deterministic.
- **Consistent coordinates**: `pixelXToColumn(columnToPixelX(col)) === col` (within floating-point tolerance)
- **Deterministic UUIDs**: UUID generation uses crypto.randomUUID() for uniqueness, not tied to time for reproducibility in tests.

### Gain Staging (Audio)
- Canonical implementation is `src/services/audio/GainManager.ts` (not ad-hoc logic in `synthEngine.ts`).
- Defaults: `polyphonyReference = 32`, `perVoiceBaselineGain = 1/sqrt(32)`, exponential smoothing, `masterGainRampMs = 50`, update interval ~60Hz.
- `synthEngine.ts` signals polyphony changes via `gainManager.noteOn()` / `gainManager.noteOff()`.
- Bus compressor (threshold: -12dB, ratio: 3) + limiter (ceiling: -3dB) act as final safety net; clipping detection is centralized in `src/services/audio/ClippingMonitor.ts`.

---

## 9. Debugging Protocol

### When investigating pitch/row bugs:
1. Check if using `globalRow` vs `row` - they should be equal post-mutation
2. Verify `pitchRange.topIndex` and `pitchRange.bottomIndex` are within [0, fullRowData.length-1]
3. Confirm `fullRowData.length` is 105 (A0-C8 + boundary row)
4. Check `pitchGridViewportService.getViewportInfo()` values: startRank, endRank, containerHeight
5. Enable viewport debug: `localStorage.setItem('sn:debugViewport', '1')` or `window.__SN_DEBUG_VIEWPORT = true`

### When investigating column/X-position bugs:
1. Determine which coordinate space is expected (visual, canvas, time)
2. Inspect `columnMapService.getColumnMap(state)` entries
3. Verify `state.columnWidths` array length matches expected musical column count
4. Check for tonic signs via `getPlacedTonicSigns(state)` that may have shifted columns
5. For modulation issues, check `state.tempoModulationMarkers` array and each marker's `ratio` and `measureIndex`

### When investigating playback/timing bugs:
1. Check `window.__transportTimeMap` for the canvas-column → time mapping
2. Check `window.__transportMusicalEnd` for the calculated end time
3. Verify modulation markers' measureIndex, ratio, and active flags
4. Check `state.hasAnacrusis` and `state.macrobeatBoundaryStyles` for loop start position
5. Verify note's `startColumnIndex` is within `[0, timeMap.length-1]`

### When investigating audio bugs:
1. Check `store.state.timbres[color]` for current timbre settings (adsr, coeffs, filter)
2. Verify synth exists: `window.synthEngine?.getSynth(color)`
3. Prefer checking `gainManager` behavior (polyphony-aware scaling). If needed, instrument `GainManager.getActiveVoiceCount()` where it is created in `synthEngine.ts`.
4. Look for "Limiter input approaching clipping" warnings in console
5. Verify `Tone.context.state === 'running'` (audio context unlocked)

---

## 10. Active Uncertainties (Open Decisions)

### Architectural Questions
1. **Shape offset editing UI**: Sixteenth/triplet stamp `shapeOffsets` are stored and played back, but the UI for editing individual shape pitches is minimal. Intent unclear.
2. **Chord position state**: `chordPositionState` (0/1/2) represents inversions. The chord tool interaction is partially implemented.
3. **Print crop behavior**: `printOptions.cropTop/cropBottom/cropLeft/cropRight` are normalized 0-1 values. Exact interaction with pitch row boundaries needs documentation.

### Migration Notes
- `row` field is being unified with `globalRow`. All new code should treat `globalRow` as authoritative.
- `musicalColumnWidths` is deprecated; `columnWidths` (canvas-space) is the canonical array.
- Legend columns are fixed width (`SIDE_COLUMN_WIDTH * 2 * cellWidth`), not in `columnWidths` array.

### Known Quirks
- Modulation marker tempo changes are applied dynamically during playhead animation, not pre-calculated. This may cause slight timing drift on very long pieces.
- The "boundary row" (index 0 in fullRowData) is a visual-only padding row (`isBoundary: true`) to allow C8's top half-cell to render.

### Viewport Height Race Condition (RESOLVED)
**Problem**: `recalcAndApplyLayout()` reads container height twice - once early (line 645, ~314px) and once after DOM width changes settle (line 1427, ~321px). Setting container widths triggers browser reflow, changing the container height mid-function. This caused:
- Zoom calculated with pre-reflow height (314px) → fractional cellHeight (29.904px)
- Canvases sized with post-reflow height (321px)
- Result: ~22px coverage gap at bottom, fractional pixel positioning

**Solution**: After DOM width changes complete and container settles to final height, recalculate zoom with the settled height and round cell dimensions to integers:
```typescript
// Line 1427+ in layoutService.ts
const pitchContainerHeight = pitchGridContainer?.clientHeight || 0;

// Recalculate zoom with FINAL container height
if (pitchContainerHeight > 0) {
  const recalculatedZoom = calculateZoomToFitRowCount(pitchContainerHeight, finalRowCount);
  const finalCellHeight = Math.round(baseCellHeight * recalculatedZoom);
  const finalCellWidth = Math.round(baseCellWidth * recalculatedZoom);
  store.setLayoutConfig({ cellHeight: finalCellHeight, cellWidth: finalCellWidth });
}
```

**Why it works**: Uses the final, settled container height for zoom calculation, ensuring cell dimensions match canvas dimensions. Rounding to integers prevents fractional pixel positioning issues.

---

## 10.1 Refactoring Status (v1.0 Track)

This section is descriptive (not prescriptive): it documents the *current* refactoring direction and the modules already extracted.

### Completed / In Use
- Tool-specific pitch-grid interactors under `src/components/canvas/PitchGrid/interactors/tools/` (note/chord/eraser/sixteenth-stamp/triplet-stamp/modulation/tonicization).
- `src/components/canvas/PitchGrid/interactors/PitchGridInteractionCoordinator.ts` routes a growing portion of pointer logic (mouse down/move/up + hover).
- `src/components/canvas/PitchGrid/interactors/PitchGridRightClickEraserInteractor.ts` encapsulates the right-click drag erase gesture (temporary tool switch to eraser + state recording + cleanup).
- `src/components/canvas/PitchGrid/interactors/PitchGridMobileLongPressNotePlacementInteractor.ts` encapsulates the mobile long-press ghost-preview + note placement gesture.
- `PitchGridNoteToolInteractor.handleExistingNoteMouseDown()` encapsulates “click existing note to preview/play” behavior (including sixteenth/triplet stamp playback vs single-note preview).
- `src/utils/chordPitchesFromIntervals.ts` is the canonical chord-pitch derivation function used for chord tool placement and hover previews.
- AnnotationService decomposition started: `src/services/annotation/annotationEraser.ts` and `src/services/annotation/annotationGeometry.ts` extracted (eraser hit-testing + segment distance).
- Lasso selection decomposition started: `src/services/annotation/annotationLassoSelection.ts` extracts lasso selection hit-testing + convex hull computation.
- Lasso selection drag decomposition started: `src/services/annotation/annotationSelectionDrag.ts` extracts pointer/viewport compensation math + applying deltas to selected items.
- Arrow rendering decomposition started: `src/services/annotation/annotationArrowRenderer.ts` renders arrow annotations (including selection/hover highlight and arrowheads).
- `src/services/audioPreviewService.ts` centralizes throttled preview audio (attack/release/quick-release) during interactions.
- SynthEngine decomposition started: `src/services/audio/FilteredVoice.ts`, `src/services/audio/GainManager.ts`, `src/services/audio/ClippingMonitor.ts` exist and are used by `src/services/synthEngine.ts`.
- Viewport facade started: `src/services/pitchGridViewportService.ts` is the preferred access point for pitch viewport state and mutations (currently delegates to `layoutService.ts`).

### In Progress / Next Steps
- Move the underlying pitch-viewport implementation out of `src/services/layoutService.ts` into a dedicated viewport service (the facade exists; the internals will follow).
- Continue shrinking `pitchGridInteractor.ts` by moving remaining tool branches into coordinator/tool interactors (especially lasso selection + mobile gesture paths).
- Finish removing legacy audio/gain/clipping logic still present in `src/services/synthEngine.ts` once all behavior is covered by extracted modules.

### Tests (Current)
- Unit tests are run by Vitest via `npm run test:run`.
- Current test files include `src/utils/pitchViewport.test.ts`, `src/state/actions/noteActions.test.ts`, and `src/components/canvas/PitchGrid/renderers/rendererUtils.test.ts`.

## 11. AI Change Contract

### When modifying this codebase, AI assistants MUST:

1. **Preserve coordinate system boundaries**: Never mix canvas-space and time-space column indices without explicit conversion via columnMapService or pixelMapService.
2. **Use globalRow for persistence**: New code storing pitch positions must set both `row` and `globalRow` to the same gamut index.
3. **Go through services**: Use `pixelMapService` for X-coordinate conversion, `columnMapService` for column space conversion, `pitchGridViewportService.getViewportInfo()` for pitch-viewport mapping.
4. **Emit appropriate events**: After state mutations, emit the corresponding event (`notesChanged`, `layoutConfigChanged`, `rhythmStructureChanged`, etc.).
5. **Maintain invariants**: Verify changes don't violate Section 5 invariants before considering work complete.
6. **Record state for undoable actions**: User-initiated changes should call `store.recordState()` after the mutation.
7. **Respect audio context rules**: Never auto-play audio without user gesture. Use `window.initAudio()` pattern.
8. **Prefer narrow modules over god objects**: New code should avoid adding dependencies to `layoutService.ts` and `pitchGridInteractor.ts`; extend/consume `pitchGridViewportService.ts`, tool interactors, and coordinators instead.

### When modifying this codebase, AI assistants MUST NOT:

1. **Slice fullRowData**: The pitch gamut must remain complete. Use `pitchRange` to define the viewport, not data subsetting.
2. **Bypass the store**: Direct `state.placedNotes.push()` without going through store actions will break reactivity and persistence.
3. **Hardcode pixel values**: Use `cellWidth`, `cellHeight`, `halfUnit` for calculations. Use constants from `src/core/constants.ts`.
4. **Assume column index space**: Always verify which coordinate space (visual/canvas/time) a column index is in before performing arithmetic.
5. **Modify playhead during playback**: Let `animatePlayhead()` and Tone.Transport manage playhead position.
6. **Add duplicate event listeners**: Initialization must be idempotent. Check for existing listeners before adding.

### Before submitting changes:

1. Verify the app builds without type errors (`npm run typecheck`)
2. Verify linting passes (`npm run lint`)
3. Test note placement (circle and oval) and tail dragging
4. Test playback start/stop and verify audio plays
5. Test zoom in/out and vertical scroll
6. Verify undo/redo works for the change
7. Check console for errors during normal operation
8. If modifying coordinates: verify notes render at correct positions AND play back at correct times
