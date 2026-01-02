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
| `amateur-singing-trainer` | Simplified pitch visualizer for tonic + drone practice |
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

## Current Migration (Phase 5)

The codebase is actively extracting `student-notation`'s vanilla JS into the framework-agnostic engine:

- **State module**: Complete (`createStore()` factory)
- **Audio module**: Complete (`createSynthEngine()`, `GainManager`, `FilteredVoice`)
- **Transport module**: Complete (`createTimeMapCalculator()`, `createDrumManager()`)
- **Transport service**: Complete (`createTransportService()` - no DOM dependencies)
- **Engine controller**: Skeleton complete (blocked by type drift and canvas renderers)
- **Canvas rendering**: Not started

See `MIGRATION-STATUS.md` for detailed phase tracking.

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
