# Architecture

This document describes the intended architecture of the music-learning-tools monorepo. It defines dependency rules, package/app responsibilities, and development patterns. If the code structure differs from this document, the code should be refactored to match.

## Core Principle: Package-First

All domain logic lives in shared packages (`packages/*`). Apps are thin composition shells. The hub is a showroom that imports packages directly—never other apps.

## Dependency Rules

```
┌─────────────────────────────────────────────────────────┐
│                        apps/hub                          │
│         (imports packages, renders routes)              │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    packages/@mlt/*                       │
│    ui-components, student-notation-engine, etc.         │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              packages/@mlt/* (foundation)                │
│         types, pitch-data, pitch-utils, etc.            │
└─────────────────────────────────────────────────────────┘
```

### Allowed Dependencies

| From | May Import |
|------|------------|
| `apps/*` | `packages/*` only |
| `packages/*` | Other `packages/*` (no cycles) |
| `apps/hub` | `packages/*` only (never other apps) |

### Forbidden Dependencies

- **App → App**: No app may depend on another app
- **Package → App**: Packages never import from apps
- **Hub → App**: Hub never imports from apps as libraries

## Package vs App Responsibilities

### Packages (`packages/*`)

Packages contain **all reusable logic**:
- Domain models and types (`@mlt/types`)
- Audio engines and synthesis (`@mlt/student-notation-engine`)
- Pitch/music utilities (`@mlt/pitch-utils`, `@mlt/pitch-data`)
- Shared UI components (`@mlt/ui-components`)
- Framework-agnostic services

Package exports should point to **source files** for development:
```json
{
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "import": "./src/index.ts"
    }
  }
}
```

### Apps (`apps/*`)

Apps are **thin shells** that compose packages:
- Route configuration
- App-specific layouts
- Environment-specific configuration
- Entry points that mount package components

Apps should contain **minimal logic**—if code could be reused, extract it to a package.

### Hub (`apps/hub`)

The hub is a special app that serves as:
- Development showroom for all tools
- Deployment entry point for GitHub Pages
- Navigation shell connecting all apps

The hub imports **only from packages**, never from other apps.

## Development Workflow

Development happens against **package source**, not built artifacts:

1. **Packages export from `src/`** - Enables HMR and type-checking
2. **Vite resolves workspace imports** - `@mlt/foo` resolves to `packages/foo/src/`
3. **No pre-build required** - Start `pnpm dev` immediately
4. **Changes reflect instantly** - Edit package → see change in hub

### Vite Configuration

Apps should configure Vite to:
- Exclude workspace packages from `optimizeDeps`
- Allow filesystem access to package directories
- Resolve `workspace:*` dependencies to source

## What NOT to Do

1. **Don't export apps as libraries** - Apps are endpoints, not importable modules
2. **Don't put reusable logic in apps** - Extract to packages
3. **Don't import app→app** - Use shared packages instead
4. **Don't import from `dist/`** - Import from source for development
5. **Don't give apps the `@mlt/` namespace** - Reserve for packages

## Package Boundaries

### By Domain

| Domain | Package | Contents |
|--------|---------|----------|
| Types | `@mlt/types` | Shared TypeScript types |
| Pitch | `@mlt/pitch-data`, `@mlt/pitch-utils` | Pitch data, conversions |
| Audio | `@mlt/student-notation-engine` | Synthesis, transport, state |
| UI | `@mlt/ui-components` | Shared Svelte components |
| Canvas | `@mlt/pitch-viewport` | Coordinate transformations |

### Naming Conventions

- Package names: `@mlt/kebab-case`
- Export files: `src/index.ts` (main), `src/foo/index.ts` (subpaths)
- Types: Co-located or in `@mlt/types` if truly shared

## Validation

Run the dependency checker to ensure architectural rules are followed:

```bash
node scripts/check-deps.js
```

This script validates:
1. Hub doesn't depend on apps
2. Apps don't depend on other apps
3. Apps use simple names (no `@mlt/` prefix)
4. Packages don't depend on apps
5. Apps don't have library exports

## Related Documentation

- `CLAUDE.md` - AI assistant guidance for this codebase
- `REFACTOR-PLAN.md` - Detailed refactor execution plan (completed)
- `apps/student-notation/SYSTEM_INTENT.md` - Detailed app-specific behavior contract
