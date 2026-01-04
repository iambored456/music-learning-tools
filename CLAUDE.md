# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
