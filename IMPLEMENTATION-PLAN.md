# Implementation Plan: UI Issues and Features

**Status: Implementation Complete (2026-01-03)**

This document outlines the investigation findings and implementation approach for 10 issues in the Student Notation app.

---

## Issue 1: Play Icon SVG Not Rendering

### Investigation Findings
- **All SVG files exist** and are correctly located at `apps/student-notation/public/assets/icons/`
- Icon references use `getIconPath()` utility in `src/utils/assetPaths.ts`
- The utility resolves paths using Vite's `import.meta.env.BASE_URL`
- Files verified in: source, dist, hub dist, and docs directories

### Root Cause Analysis
The SVG files exist and paths appear correct. The issue may be:
1. **Build-time path resolution** - BASE_URL not correctly set during builds
2. **Template vs runtime paths** - `template.html` uses relative `assets/icons/play.svg` while JS uses `getIconPath()`
3. **Icon file corruption** - The files are unusually large (181KB for play.svg)

### Implementation Steps
1. Check `template.html:121-123` - icons use relative paths without `getIconPath()`
2. Verify the SVG file content is valid (181KB is very large for a simple icon)
3. If file is corrupt/oversized, replace with a properly optimized SVG
4. Consider standardizing all icon references to use `getIconPath()` for consistency
5. Test in both dev (`pnpm dev`) and production (`pnpm build`) builds

### Files to Modify
- `apps/student-notation/src/template.html` (lines 121-123)
- `apps/student-notation/public/assets/icons/play.svg` (inspect/replace if needed)

---

## Issue 2: Modulation Marker Positioning & App-Specific Visibility

### Investigation Findings
- **Two markers drawn**: PitchGrid (`pitchGridRenderer.ts:232`) and DrumGrid (`drumGridRenderer.ts:313-314`)
- **Label positioning**: Y-offset hardcoded to `20px` from canvas top in `modulationRenderer.ts`
- **Visibility**: Controlled by `marker.active` boolean flag
- **Shared code**: `@mlt/student-notation-engine` contains types and coordinate logic
- **App code**: `apps/student-notation` contains all rendering logic

### Implementation Steps

#### A. Reposition Labels (center at grid top boundary)
1. In `modulationRenderer.ts`, calculate grid top boundary position
2. Change label Y-position from fixed `20px` to align center with grid top edge
3. Update both PitchGrid and DrumGrid label positioning consistently

#### B. Hide PitchGrid Label in Student Notation
1. Add configuration option to `RendererOptions` interface:
   ```typescript
   showPitchGridModulationLabel?: boolean;
   ```
2. Default to `true` in shared package (app-agnostic)
3. In Student Notation's `pitchGridRenderer.ts`, pass `showPitchGridModulationLabel: false`
4. In `modulationRenderer.ts`, conditionally skip label rendering based on option

### Files to Modify
- `apps/student-notation/src/components/canvas/PitchGrid/renderers/modulationRenderer.ts`
- `apps/student-notation/src/components/canvas/PitchGrid/renderers/pitchGridRenderer.ts`
- `packages/student-notation-engine/src/canvas/types.ts` (add option type)

### Documentation
Add comments explaining:
- Shared package provides rendering function with configurable label visibility
- Student Notation overrides to hide PitchGrid label (DrumGrid provides timing context)
- Other apps can use default (visible) or configure as needed

---

## Issue 3: ButtonGrid Logic - Hz Should Disable Octaves

### Investigation Findings
- **Location**: `apps/student-notation/src/components/toolbar/initializers/toolSelectorInitializer.ts`
- **Current behavior** (lines 815-829):
  - `setAccidentalButtonsLocked()` disables only `[flatBtn, sharpBtn]`
  - `syncFrequencyUiState()` calls this when Hz toggled
- **Octave button**: `#spn-octave-toggle-btn` is handled separately (lines 810-813)

### Implementation Steps
1. Modify `setAccidentalButtonsLocked()` to include `octaveLabelBtn`:
   ```typescript
   const setAccidentalButtonsLocked = (locked: boolean): void => {
     [flatBtn, sharpBtn, octaveLabelBtn].forEach(btn => {
       if (!btn) return;
       btn.classList.toggle('accidental-btn--disabled', locked);
       btn.setAttribute('aria-disabled', locked ? 'true' : 'false');
     });
   };
   ```
2. Ensure clicking Octave button also deactivates Hz mode (mirror Flat/Sharp behavior)
3. Update visual styling to match disabled state appearance

### Files to Modify
- `apps/student-notation/src/components/toolbar/initializers/toolSelectorInitializer.ts` (lines 815-829)

---

## Issue 4: Tonal Center Infrastructure

### Investigation Findings
- **Student Notation**: Has `getKeyContextForColumn()` returning `{ keyTonic, keyMode }` from tonic signs
- **Singing Trainer**: Stores `tonic: TonicNote` in `appState.svelte.ts`, drone in `droneAudio.ts`
- **Amateur Singing Trainer**: Stores `tonic` in `store.js`, drone in `AudioService.js`
- **Handoff package**: Does NOT carry tonal center - only pitch range and tempo
- **Gap**: No mechanism to share tonal center between apps

### Architecture Design

#### Canonical Term: "Tonal Center"
- Represents: pitch class + optional octave (e.g., "C", "C4", or frequency)
- Avoid: "key" (implies mode), "pitch center" (ambiguous)

#### State Location
```
@mlt/handoff package (new fields):
  - SingingTrainerSnapshot.tonalCenter?: {
      pitchClass: string;  // "C", "C#", "Db", etc.
      octave?: number;     // Optional octave for drone
      frequency?: number;  // Optional Hz value
    }
```

#### Data Flow
```
Student Notation                    Singing Trainer
┌─────────────────┐                ┌─────────────────┐
│ Tonic Signs UI  │                │ Tonic Selector  │
│     ↓           │                │     ↓           │
│ getKeyContext() │ ──handoff───→  │ appState.tonic  │
│                 │                │     ↓           │
└─────────────────┘                │ droneAudio.ts   │
                                   └─────────────────┘
```

### Implementation Steps
1. **Add to handoff types** (`packages/handoff/src/types.ts`):
   - Add `tonalCenter` field to `SingingTrainerSnapshot`

2. **Expose from Student Notation**:
   - Create selector `getCurrentTonalCenter()` using existing `getKeyContextForColumn()`
   - Include in handoff snapshot when sending to Singing Trainer

3. **Consume in Singing Trainer**:
   - Check handoff state for `tonalCenter` on load
   - If present, update `appState.state.tonic` and optionally start drone

4. **UI for selection** (optional enhancement):
   - Student Notation already has tonic sign placement
   - Consider adding quick-select dropdown in toolbar

### Files to Modify
- `packages/handoff/src/types.ts`
- `apps/student-notation/src/state/selectors.ts`
- `apps/singing-trainer/src/lib/stores/handoffState.svelte.ts`
- `apps/singing-trainer/src/lib/services/droneAudio.ts`

---

## Issue 5: Effects Cartesian Boxes - Unification & Sizing

### Investigation Findings
- **All three effects already use unified `CartesianSlider` class** - no legacy delay box
- **Current sizing**: Uses `clamp()` with CSS variables, ResizeObserver for dynamic updates
- **Height source**: `--position-available-height` calculated from toolbar height minus tabs
- **Issue**: Boxes may not be properly fitting parent height

### Implementation Steps
1. **Verify sizing calculation** in `cartesianSlider.css`:
   ```css
   --position-available-height: calc(var(--toolbar-block-size) - var(--preset-tab-rail-height, 28px) - 10px);
   ```
2. **Ensure parent container** (`.position-controls-container`) has `height: 100%`
3. **Remove any fixed heights** that override flex/responsive sizing
4. **Test ResizeObserver** functionality for edge cases

### Files to Modify
- `apps/student-notation/style/components/secondaryToolbarTools/cartesianSlider.css`
- `apps/student-notation/src/components/ui/cartesianSliderController.ts` (if resize logic needs fixes)

---

## Issue 6: ClefWheel Highlight Box Height Bug

### Investigation Findings
- **Highlight box**: `.clef-wheel-overlay::before` with fixed `height: 30px`
- **Option height**: Fixed `40px` (OPTION_HEIGHT constant)
- **Issue**: 30px highlight may intrude on adjacent 40px cells due to centering

### Implementation Steps
1. **Change to relative height** based on option height:
   ```css
   .clef-wheel-overlay::before {
     height: calc(var(--clef-option-height, 40px) * 0.75);  /* 75% of cell */
   }
   ```
2. **Add CSS variable** for option height to allow coordination
3. **Ensure transform centering** accounts for new relative height
4. **Test at different viewport sizes** to verify containment

### Files to Modify
- `apps/student-notation/style/components/secondaryToolbarTools/clefControls.css` (lines 141-153)
- `apps/student-notation/src/components/clefWheels/clefRangeController.ts` (add CSS variable)

---

## Issue 7: Rhythm Tab - Sixteenths & Triplets Background

### Investigation Findings
- **Sixteenth/Triplet containers**: `.sixteenth-stamps-toolbar-container`, `.triplet-stamps-toolbar-container`
- **Adjacent controls with backgrounds**: `.tempo-content-box`, `.rhythm-controls-content-box`
- **Missing**: Background panel styling on stamp containers

### Implementation Steps
1. **Apply content-box styling** to stamp containers:
   ```css
   .sixteenth-stamps-toolbar-container,
   .triplet-stamps-toolbar-container {
     background-color: var(--c-surface);
     border: 1px solid var(--c-border);
     border-radius: var(--border-radius-md);
     box-shadow: var(--box-shadow-sm);
   }
   ```
2. **Adjust padding** to match adjacent panels
3. **Verify visual alignment** with neighboring controls

### Files to Modify
- `apps/student-notation/style/layout/rhythmToolbarLayout.css` (lines 240-280)

---

## Issue 8: Tempo Boxes & Rhythm Modulation Buttons Height

### Investigation Findings
- **Tempo boxes**: 3 inputs with fixed 45x24px size (DraggableNumber config)
- **Container**: Uses flex column with `100%` height
- **Modulation buttons**: Inline-flex column with stretch alignment
- **Issue**: Fixed input sizes don't scale with parent

### Implementation Steps
1. **For tempo boxes**:
   - Change container to distribute height equally: `flex: 1 1 0` per row
   - Consider making DraggableNumber height responsive or use `height: 100%`

2. **For modulation buttons**:
   - Ensure `.modulation-controls` has `height: 100%`
   - Make buttons use `flex: 1` to fill available space

3. **Add `min-height: 0`** to flex containers to prevent overflow

### Files to Modify
- `apps/student-notation/style/components/secondaryToolbarTools/tempoSliders.css`
- `apps/student-notation/style/layout/rhythmToolbarLayout.css`
- `apps/student-notation/src/svelte-ui/toolbar/AudioControlsBridge.svelte` (if DraggableNumber needs height prop)

---

## Issue 9: Pitch Tab - Unified Position Section Width

### Investigation Findings
- **Section**: `.unified-position-section` uses `flex: 1 1 0` (grows to fill)
- **Grid**: 3 columns `auto auto auto` (labels-toggle-labels)
- **Toggle track**: Fixed `width: 20px`
- **Issue**: `flex: 1 1 0` causes unnecessary growth

### Implementation Steps
1. **Change flex behavior** to shrink-to-content:
   ```css
   .unified-position-section {
     flex: 0 0 auto;  /* Don't grow, use natural width */
   }
   ```
2. **Verify grid auto-sizing** still works correctly
3. **Ensure adjacent sections** (intervals, chords) expand to fill space instead

### Files to Modify
- `apps/student-notation/style/components/buttons/pitch/pitchTabButtons.css` (lines 596-604)

---

## Issue 10: Draw UI - Fit-to-Height Logic

### Investigation Findings
- **Current sizing**: Uses `clamp()` with `dvh` units for responsive scaling
- **Icons**: `clamp(1.4rem, 2.8dvh, 2rem)` for tool buttons
- **Grid**: 5 auto-width columns with `height: 100%`
- **Issue**: Elements may not fully utilize available height

### Implementation Steps
1. **Ensure parent chain** has `height: 100%` and `min-height: 0`:
   - `.draw-content-box`
   - `.draw-layout-grid`
   - `.draw-tool-panel`

2. **Make tool options fill height**:
   ```css
   .draw-tool-options {
     flex: 1;
     min-height: 0;
   }
   ```

3. **Adjust icon sizing** to be more responsive:
   ```css
   .draw-tool-button {
     height: clamp(1.4rem, 4dvh, 2.5rem);  /* Larger max */
   }
   ```

### Files to Modify
- `apps/student-notation/style/components/secondaryToolbarTools/drawTools.css`

---

## Implementation Priority

| Priority | Issue | Complexity | Impact |
|----------|-------|------------|--------|
| 1 | Issue 1: Play Icon | Low | High - visible bug |
| 2 | Issue 3: Hz Octaves | Low | Medium - UX consistency |
| 3 | Issue 6: ClefWheel | Low | Medium - visual bug |
| 4 | Issue 7: Rhythm Background | Low | Low - visual polish |
| 5 | Issue 2: Modulation Labels | Medium | Medium - UX + architecture |
| 6 | Issue 9: Position Width | Low | Low - visual polish |
| 7 | Issue 10: Draw UI Height | Medium | Low - visual polish |
| 8 | Issue 8: Tempo Heights | Medium | Low - visual polish |
| 9 | Issue 5: Effects Sizing | Medium | Low - visual polish |
| 10 | Issue 4: Tonal Center | High | High - new feature |

---

## Notes for Implementation

1. **Prefer relative sizing** (`clamp()`, `%`, `dvh/dvw`) over fixed pixels
2. **Keep Student-Notation logic out of shared packages** - use configuration/options
3. **Test in both dev and production builds** - path resolution differs
4. **Document architecture boundaries** where app-specific overrides exist
5. **Flag cross-app impacts** before implementing (especially Issue 4)

---

## Implementation Summary

### Completed Changes

| Issue | Status | Files Modified |
|-------|--------|----------------|
| 1. Play Icon | Root cause found | SVG files were 185KB (should be ~200 bytes). User to replace. |
| 2. Modulation Labels | Implemented | `modulationRenderer.ts`, `pitchGridRenderer.ts`, `pitchGrid.ts` |
| 3. Hz Disables Octaves | Implemented | `ToolSelectorBridge.svelte`, `leftButtonGridControls.css` (CSS specificity fix) |
| 4. Tonal Center | Infrastructure added | `packages/handoff/src/types.ts`, `converter.ts`, `selectors.ts` |
| 5. Effects Sizing | Implemented | `cartesianSlider.css` (position-component) |
| 6. ClefWheel Height | Implemented | `clefControls.css` (added CSS variable) |
| 7. Rhythm Backgrounds | Implemented | `rhythmToolbarLayout.css` (lines 240, 305) |
| 8. Tempo Heights | Implemented | `tempoSliders.css`, `rhythmToolbarLayout.css` |
| 9. Position Width | Implemented | `pitchTabButtons.css` (line 596) |
| 10. Draw UI Height | Implemented | `drawTools.css` (lines 30, 110) |

### Remaining Work (Issue 4 - Tonal Center)

The infrastructure is in place, but integration requires:
1. **Student Notation**: Pass `tonalCenter` from `getCurrentTonalCenter()` to `convertToSnapshot()`
2. **Singing Trainer**: Consume `snapshot.tonalCenter` and update `appState.tonic` on load
3. **Singing Trainer**: Optionally auto-start drone with the provided tonal center
