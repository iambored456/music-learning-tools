# Music Learning Tools - Migration Status

## Overview

This document tracks the progress of migrating "Student Notation" into a pnpm monorepo
with Svelte UI ownership and a reusable engine architecture.

**Last Updated:** December 2024

---

## Current Architecture

```
music-learning-tools/
├── apps/
│   ├── hub/                    # Svelte 5 launcher (ready)
│   └── student-notation/       # Main app (Svelte integration started)
│
├── packages/
│   ├── types/                  # @mlt/types - Shared TypeScript types
│   └── student-notation-engine/ # @mlt/student-notation-engine - Framework-agnostic engine
│
├── scripts/
│   └── assemble-pages.js      # Assembles apps for GitHub Pages
│
├── .github/workflows/
│   └── deploy.yml             # GitHub Pages deployment
│
├── tsconfig.base.json         # Shared TypeScript config
├── pnpm-workspace.yaml        # Workspace configuration
└── package.json               # Root scripts
```

---

## Phase Completion Status

### Phase 0: Baseline ✅
- [x] Verified student-notation builds successfully
- [x] Verified hub app builds successfully
- [x] Documented existing architecture

### Phase 1: Workspace Infrastructure ✅
- [x] Created `tsconfig.base.json` at root
- [x] Updated root `package.json` with workspace scripts
- [x] Updated app tsconfigs to extend base
- [x] Created `scripts/assemble-pages.js` for GitHub Pages

### Phase 2: Shared Packages ✅
- [x] Created `@mlt/types` package with:
  - Coordinate types (CanvasSpaceColumn, etc.)
  - Music domain types (PlacedNote, Timbre, etc.)
  - State types (AppState, Store, etc.)
  - Event types (EngineEvents)
- [x] Created `@mlt/student-notation-engine` structure with:
  - Controller API facade (EngineController interface)
  - State module placeholder
  - Audio module placeholder
  - Canvas module placeholder

### Phase 3: Svelte Integration ✅ (Complete - Toolbar Migration)
- [x] Added Svelte 5 to student-notation
- [x] Created svelte.config.js
- [x] Updated vite.config.ts with Svelte plugin
- [x] Created Svelte mount system (`src/svelte-ui/mount.ts`)
- [x] Created first Svelte component (PlaybackControls.svelte)
- [x] Integrated mount system into initUiComponents.ts
- [x] Created PlaybackControlsBridge.svelte (headless bridge component)
- [x] Added placeholder div in index.html for PlaybackControlsBridge
- [x] Disabled old playbackInitializer.ts (commented out in toolbar.ts)
- [x] Created FileActionsBridge.svelte (headless bridge component)
- [x] Added placeholder div in index.html for FileActionsBridge
- [x] Disabled old fileActionsInitializer.ts (commented out in toolbar.ts)
- [x] Created GridControlsBridge.svelte (zoom in/out, macrobeat controls)
- [x] Disabled old gridControlsInitializer.ts (commented out in toolbar.ts)
- [x] Created ModulationBridge.svelte (2:3, 3:2, clear modulation markers)
- [x] Disabled old modulationInitializer.ts (commented out in toolbar.ts)
- [x] Created SidebarBridge.svelte (sidebar toggle, volume popup, all setting toggles)
- [x] Disabled old sidebarInitializer.ts (commented out in toolbar.ts)
- [x] Created ToolSelectorBridge.svelte (notes, eraser, chords, intervals, degrees, tabs)
- [x] Disabled old toolSelectorInitializer.ts (commented out in toolbar.ts)
- [x] Created AudioControlsBridge.svelte (tempo slider, preset buttons)
- [x] Disabled old audioControlsInitializer.ts (commented out in toolbar.ts)
- [x] **ALL TOOLBAR INITIALIZERS NOW MIGRATED TO SVELTE**

### Phase 4: Tab & Modal Migration ✅ (Complete)
- [x] Created TabManagementBridge.svelte (main tabs, preset tabs, pitch tabs)
- [x] Disabled old initTabManagement.ts (commented out in initUiComponents.ts)
- [x] Created PrintPreviewBridge.svelte (print preview modal with crop handles)
- [x] Disabled old printPreview.ts (commented out in initUiComponents.ts)
- [x] **ALL TAB AND MODAL INITIALIZERS NOW MIGRATED TO SVELTE**
- [ ] Reduce index.html size (optional future work)

### Phase 5: Engine Extraction 🔄 (In Progress)

#### State Module ✅
- [x] Created `createStore()` factory in engine package
- [x] Extracted pitch data to engine (`fullRowData`, `getPitchByToneNote`, etc.)
- [x] Extracted initial state factory (`getInitialState()`)
- [x] Implemented core store actions (history, view, timbre, harmony)
- [x] Created `StorageAdapter` interface for injectable persistence (no DOM dependency)
- [x] Added `dispose()` and `off()` methods for cleanup

#### Audio Module ✅
- [x] Extracted `GainManager` class (polyphony-aware gain scaling)
- [x] Extracted `ClippingMonitor` class (audio level monitoring)
- [x] Extracted `FilteredVoice` class (custom Tone.js voice with vibrato/tremolo/filter)
- [x] Created `createSynthEngine()` factory with dependency injection:
  - No window globals
  - Injectable effects manager
  - Injectable harmonic filter
  - Injectable logger
  - Optional audio init callback
  - Optional drum volume callback
- [x] Updated types with `EffectsManager`, `HarmonicFilter`, `SynthLogger` interfaces

#### Transport Module ✅
- [x] Created `createTimeMapCalculator()` factory with dependency injection:
  - No store dependencies (state passed as parameters)
  - Injectable callbacks for macrobeat info and tonic signs
  - Injectable playhead model updater
  - Injectable logger
- [x] Extracted `createDrumManager()` factory:
  - No window globals
  - Accepts synth engine for audio routing
  - Safe drum trigger timing

#### Remaining Work
- [ ] Extract transport service (remove domCache, schedule notes)
- [ ] Extract canvas renderers
- [ ] Create working engine controller
- [ ] Migrate app to use engine store

### Phase 6: Tutorial App ⏳ (Pending)
- [ ] Create `apps/amateur-music-theory`
- [ ] Create `@mlt/tutorial-runtime` package
- [ ] Implement lesson mode API
- [ ] Create demo lesson

---

## Current Workspace Commands

```bash
# Development
pnpm dev              # Run all apps in parallel
pnpm dev:hub          # Run hub only
pnpm dev:sn           # Run student-notation only

# Build
pnpm build            # Build all apps
pnpm build:pages      # Build and assemble for GitHub Pages

# Quality
pnpm typecheck        # Run TypeScript checks
pnpm lint             # Run linters
pnpm test             # Run tests
```

---

## Next Steps

### Immediate (Phase 5 - Engine Extraction)

1. **Extract state store to engine package**
   - Move store logic from `apps/student-notation/src/state/` to `packages/student-notation-engine/`
   - Remove window globals dependency
   - Create clean API for tutorial puppeting

2. **Extract synth engine**
   - Move Tone.js wrapper to engine package
   - Create framework-agnostic audio API
   - Remove domCache dependencies

3. **Extract transport service**
   - Isolate playback control from DOM
   - Create clean start/stop/seek API

4. **Extract canvas renderers**
   - Move pitch grid, button grid, drum grid renderers
   - Create controller facade for external use

### Medium-term (Phase 6 - Tutorial App)

1. Create `apps/amateur-music-theory` app
2. Create `@mlt/tutorial-runtime` package
3. Implement lesson mode API
4. Create demo lesson

### Optional Improvements

1. Reduce index.html size by moving more HTML to Svelte components
2. Code-split large bundle using dynamic imports
3. Add comprehensive test coverage for Svelte components

---

## Key Files for Reference

| Purpose | Location |
|---------|----------|
| Svelte mount system | `apps/student-notation/src/svelte-ui/mount.ts` |
| **Toolbar Bridges** | |
| PlaybackControlsBridge | `apps/student-notation/src/svelte-ui/toolbar/PlaybackControlsBridge.svelte` |
| FileActionsBridge | `apps/student-notation/src/svelte-ui/toolbar/FileActionsBridge.svelte` |
| GridControlsBridge | `apps/student-notation/src/svelte-ui/toolbar/GridControlsBridge.svelte` |
| ModulationBridge | `apps/student-notation/src/svelte-ui/toolbar/ModulationBridge.svelte` |
| SidebarBridge | `apps/student-notation/src/svelte-ui/toolbar/SidebarBridge.svelte` |
| ToolSelectorBridge | `apps/student-notation/src/svelte-ui/toolbar/ToolSelectorBridge.svelte` |
| AudioControlsBridge | `apps/student-notation/src/svelte-ui/toolbar/AudioControlsBridge.svelte` |
| **Tab & Modal Bridges** | |
| TabManagementBridge | `apps/student-notation/src/svelte-ui/tabs/TabManagementBridge.svelte` |
| PrintPreviewBridge | `apps/student-notation/src/svelte-ui/modals/PrintPreviewBridge.svelte` |
| **Engine Package** | |
| Engine entry point | `packages/student-notation-engine/src/index.ts` |
| Engine controller API | `packages/student-notation-engine/src/controller.ts` |
| Store factory | `packages/student-notation-engine/src/state/store.ts` |
| Initial state | `packages/student-notation-engine/src/state/initialState.ts` |
| Pitch data | `packages/student-notation-engine/src/state/pitchData.ts` |
| **Audio Module** | |
| Synth engine factory | `packages/student-notation-engine/src/audio/synthEngine.ts` |
| GainManager | `packages/student-notation-engine/src/audio/GainManager.ts` |
| ClippingMonitor | `packages/student-notation-engine/src/audio/ClippingMonitor.ts` |
| FilteredVoice | `packages/student-notation-engine/src/audio/FilteredVoice.ts` |
| Audio types | `packages/student-notation-engine/src/audio/types.ts` |
| **Transport Module** | |
| Time map calculator | `packages/student-notation-engine/src/transport/timeMapCalculator.ts` |
| Drum manager | `packages/student-notation-engine/src/transport/drumManager.ts` |
| Transport types | `packages/student-notation-engine/src/transport/types.ts` |
| **Core Files** | |
| Shared types | `packages/types/src/index.ts` |
| UI init (fully deprecated) | `apps/student-notation/src/bootstrap/ui/initUiComponents.ts` |
| Toolbar init (fully deprecated) | `apps/student-notation/src/components/toolbar/toolbar.ts` |

---

## Architecture Decisions

### Why Svelte 5 Runes?
- Cleaner reactivity model than Svelte 4
- Better TypeScript support
- Easier to reason about state
- Future-proof for Svelte ecosystem

### Why Keep Store Event Emitter?
- Already works well
- Clean interface for engine consumers
- Easy to subscribe from any framework
- No need to introduce Svelte stores in engine

### Why Framework-Agnostic Engine?
- Enables tutorial app to puppet without DOM
- Enables future React/Vue consumers
- Cleaner separation of concerns
- Easier testing

---

## Migration Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Duplicate event listeners | Comment out old initializers, test thoroughly |
| Performance regression | Profile before/after, use Chrome DevTools |
| Bundle size increase | Svelte compiles to vanilla JS, minimal overhead |
| State sync issues | Single source of truth in engine store |

---

## Testing Checklist (Per Component Migration)

- [ ] Component renders correctly
- [ ] All buttons respond to clicks
- [ ] State syncs with store
- [ ] No console errors
- [ ] No duplicate event handlers
- [ ] Audio still works
- [ ] Canvas still renders
- [ ] Undo/redo works
- [ ] Export/import works
