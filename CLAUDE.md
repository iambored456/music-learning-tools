# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architectural Thesis

**This monorepo is package-first:** all domain logic lives in shared packages (`packages/*`), while apps (including the hub) are thin shells that compose those packages into end-user experiences. No app depends on another app, and all development is done live against package source.

Key principles:
- **Packages contain logic** - Audio engines, state management, UI components, utilities
- **Apps are composition shells** - Routing, configuration, app-specific glue only
- **Hub consumes packages** - The hub imports from `@mlt/*` packages, never from other apps
- **Source-first development** - Packages export from `src/` for HMR during development

## Build & Development Commands

```bash
# Development - runs hub at http://localhost:5173 (serves all apps)
pnpm dev

# Build all packages and apps
pnpm build

# Build for GitHub Pages deployment
pnpm build:pages

# Type checking across monorepo
pnpm typecheck

# Linting (configured in student-notation)
pnpm lint

# Run tests
pnpm test

# Clean build artifacts
pnpm clean
```

## Architecture Overview

This is a **pnpm monorepo** for music education web applications. The workspace uses `pnpm@10.26.2` with Node >=18.

### Workspace Structure

- `apps/*` - Standalone applications (Svelte 5 + Vite)
- `packages/*` - Shared libraries with `@mlt/` namespace

### Apps

| App | Description |
|-----|-------------|
| `hub` | Main entry point - aggregates all tools into single interface |
| `student-notation` | Grid-based music notation for accessible music theory |
| `singing-trainer` | Real-time pitch detection with note highway visualization |
| `diatonic-compass` | Interactive diatonic relationship visualizer |

### Key Packages

| Package | Purpose |
|---------|---------|
| `@mlt/types` | Shared TypeScript types (coordinates, music domain, state) |
| `@mlt/student-notation-engine` | Framework-agnostic engine with state, audio, transport modules |
| `@mlt/pitch-data` | 88-key piano pitch data (frequencies, colors, enharmonic spellings) |
| `@mlt/pitch-utils` | Hz/MIDI/cents conversion utilities |
| `@mlt/pitch-viewport` | Canvas coordinate transformations for pitch visualization |
| `@mlt/ui-components` | Shared Svelte 5 components (PitchGrid, pitch wheels) |

### Audio Stack

- **Tone.js** - Web Audio synthesis
- **Pitchy** - Pitch detection
- **Tonal** - Music theory utilities

## Architecture Patterns

### Svelte 5 Runes
Components use modern Svelte 5 runes (`$state`, `$derived`, `$effect`) for reactivity. Not Svelte 4 stores.

### Framework-Agnostic Engine
The `student-notation-engine` package uses event emitters (not Svelte stores) for cross-framework compatibility. State is passed via dependency injection, not window globals.

### Svelte Bridge Pattern
In `student-notation`, legacy vanilla JS is integrated via "bridge" components (`*Bridge.svelte`) that mount Svelte UI into existing DOM placeholders. See `apps/student-notation/src/svelte-ui/` for examples.

### Package Dependencies
Apps depend on workspace packages using `workspace:*` protocol. Changes to packages require rebuilding dependent apps.

## Student Notation Architecture

The `student-notation` app uses the `@mlt/student-notation-engine` package for all core functionality:

### Engine Integration

The app initializes the engine through three main files in `apps/student-notation/src`:

- **`state/initStore.ts`** - Initializes store with `createStore()` factory
  - Configures localStorage persistence
  - Wires column map callbacks for rhythm actions
  - Provides app-specific logging

- **`services/initAudio.ts`** - Initializes synth engine with `createSynthEngine()` factory
  - Injects harmonic filter callbacks
  - Injects effects manager (vibrato, tremolo, filter)
  - Sets up store event subscriptions

- **`services/initTransport.ts`** - Initializes transport with `createTransportService()` factory
  - Wires 30+ callbacks for state access, events, and DOM updates
  - Handles playback, looping, and tempo modulation
  - Manages playhead animation

### Engine Package Structure

The engine (`@mlt/student-notation-engine`) provides:
- **State**: `createStore()` - Event-driven state management with undo/redo
- **Audio**: `createSynthEngine()` - Polyphonic synthesis with Tone.js
- **Transport**: `createTransportService()` - Playback scheduling and timing
- **Services**: `createColumnMapService()` - Coordinate transformations
- **Canvas**: Rendering utilities (currently app uses custom renderers)
- **Controller**: `createEngineController()` - Unified API (available for future use)

## Domain Concepts

- **Harmonic (Overtone) Bins** - 12 overtone bins with 8 preset timbres; bins control per-voice harmonic coefficients.
- **Filter System** - Graphic EQ overlay that filters overtone bins with blend, cutoff, and mix controls.
- **Color/Voice System** - Four voices (blue, black, red, green) with simultaneous playback and per-voice timbre.
- **PitchGrid Design** - "On a line / on a space" halves the visual distance between adjacent pitches.
- **Rhythm System** - Macrobeats (2-based duple, 3-based triple) subdivided into microbeats.
- **Stamps** - Sixteenth and triplet permutation patterns for quick rhythmic placement.
- **Tonic Signs** - Zero time-space markers for tonal center and mode (1-7).
- **Tempo Modulation Markers** - Visual space expansion and shrinking for rhythmic modulation.
- **ADSR + Effects** - Per-voice ADSR plus delay and tremolo (time shaping) and vibrato (pitch/waveform shaping).

## App Relationships

- **Student Notation** - Four-voice composition tool using the shared engine and UI packages.
- **Singing Trainer** - Real-time pitch detection with a note highway; imports Student Notation handoffs.
- **Diatonic Compass** - Standalone mode and pitch-center visualizer.
- **Handoff** - Student Notation exports to Singing Trainer and can import UltraStar format.

## Architectural Decisions

### Dependency Rules

| From | May Import |
|------|------------|
| `apps/*` | `packages/*` only |
| `packages/*` | Other `packages/*` (no cycles) |
| `apps/hub` | `packages/*` only (never other apps) |

### Package vs App Responsibilities

- **Packages** hold reusable domain logic (audio, state, UI components, utilities).
- **Apps** are thin composition shells (routing, layout, app-specific glue).
- **Hub** is a showroom shell that imports packages only.

### Development Workflow

- Packages export from `src/` for HMR and type checking.
- Workspace imports resolve to package sources (no pre-build required).
- Vite configs allow filesystem access to package directories and avoid optimizing workspace deps.

### Hub Development Pitfall (Singing Trainer)

**Common mistake**: When running `pnpm dev`, the hub is served at localhost:5173. The hub loads singing-trainer from the **package** (`@mlt/singing-trainer-ui`), NOT from the standalone app (`apps/singing-trainer/`).

| What you want to change | Edit this file |
|------------------------|----------------|
| Singing Trainer UI when accessed via hub | `packages/singing-trainer-ui/src/App.svelte` |
| Standalone singing-trainer app | `apps/singing-trainer/src/App.svelte` |

The hub entry point is at `apps/hub/singing-trainer/main.ts`:
```typescript
import { mountSingingTrainer } from '@mlt/singing-trainer-ui';
```

Changes to `apps/singing-trainer/src/` have **no effect** when viewing through the hub.

### Validation

Run `node scripts/check-deps.js` to validate dependency rules and app/package boundaries.

### PitchGrid Separation (Intentional)

- `@mlt/ui-components` provides the shared PitchGrid renderer and shared modes.
- `packages/student-notation-ui` owns app-specific PitchGrid interactors and tools.
- `packages/singing-trainer-ui` wraps the shared renderer and adds its pitch trail overlay.
- No merge needed unless renderer capabilities move across app boundaries.

## TypeScript Configuration

All packages extend `tsconfig.base.json`:
- Target: ES2022
- Strict mode enabled
- Bundler module resolution
- No emit (type checking only)

## GitHub Pages Deployment

The hub builds all apps into a single deployment. Build uses:
- `scripts/build-pages.js` - Orchestrates multi-app build
- `scripts/assemble-pages.js` - Assembles apps for deployment
- Dynamic base URL from `BASE_URL` env var or package.json homepage
