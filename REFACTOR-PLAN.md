# Refactor Plan: Package-First Monorepo

**STATUS: ✅ COMPLETED**

This document outlines a phased approach to achieve a fully package-first architecture where apps are thin shells and the hub consumes only packages.

## Completion Summary

All phases have been completed successfully:
- ✅ Phase 0: Audit & Inventory
- ✅ Phase 1: Dev Workflow (Package-First)
- ✅ Phase 2: Extract App Logic to Packages
- ✅ Phase 3: Convert Apps to Thin Shells
- ✅ Phase 4: Remove App-to-App Dependencies
- ✅ Phase 5: Hardening

The monorepo now follows a strict package-first architecture where:
- Apps are thin shells with no library exports
- Hub imports only from `@mlt/*-ui` packages
- All reusable logic lives in packages
- Dependency validation enforced via `scripts/check-deps.js`

## Current Architecture Analysis

### Current State

```
apps/hub
├── depends on: @mlt/singing-trainer (app)     ← ANTI-PATTERN
├── depends on: @mlt/student-notation (app)    ← ANTI-PATTERN
├── depends on: @mlt/diatonic-compass (app)    ← ANTI-PATTERN
└── depends on: @mlt/pitch-utils (package)     ← CORRECT

apps/singing-trainer
├── exports: ./dist/index.js (built artifact)  ← ANTI-PATTERN
├── name: @mlt/singing-trainer                 ← Apps shouldn't use @mlt/
└── depends on: packages/* (correct)

apps/student-notation
├── exports: ./dist/index.js (built artifact)  ← ANTI-PATTERN
├── name: @mlt/student-notation                ← Apps shouldn't use @mlt/
└── depends on: packages/* (correct)
```

### Problems Identified

1. **Hub imports apps as libraries** - `@mlt/singing-trainer`, `@mlt/student-notation`, `@mlt/diatonic-compass` are listed as hub dependencies
2. **Apps export from `dist/`** - Apps build library bundles instead of being endpoints
3. **Apps use `@mlt/` namespace** - This namespace should be reserved for packages
4. **App logic not extracted** - Reusable components/services live in apps, not packages

### What's Already Good

1. **Packages export from source** - `@mlt/ui-components`, `@mlt/student-notation-engine` export `./src/index.ts`
2. **Existing package infrastructure** - 10 packages already exist with proper structure
3. **Hub has multi-page setup** - Vite config has entry points for each route

---

## Target Architecture

```
apps/hub
├── depends on: @mlt/ui-components
├── depends on: @mlt/student-notation-engine
├── depends on: @mlt/singing-trainer-core (NEW package)
├── depends on: @mlt/diatonic-compass-core (NEW package)
└── thin shells for each route

apps/student-notation
└── standalone endpoint consuming packages (no library exports)

apps/singing-trainer
└── standalone endpoint consuming packages (no library exports)
```

---

## Phase 0: Audit & Inventory

### Tasks

1. **Catalog app exports**
   - List every symbol exported from each app's `src/index.ts`
   - Categorize: UI component, service, type, utility
   - Identify which are consumed by hub vs internal-only

2. **Catalog app-specific logic**
   - For each app, list logic that could potentially be shared
   - Note what's truly app-specific (routing, config) vs reusable

3. **Map current hub imports**
   - List every import statement in hub referencing `@mlt/singing-trainer`, etc.
   - Document what hub actually uses from each app

4. **Validate package source exports**
   - Confirm all packages export from `./src/`, not `./dist/`
   - Identify any packages still using dist exports

### Definition of Done
- Spreadsheet/document listing all app exports with categorization
- Clear list of what hub imports from each app
- Identified candidate logic for extraction

### Risks & Mitigations
- **Risk**: Undocumented dependencies between apps
- **Mitigation**: Run `pnpm why @mlt/singing-trainer` etc. to trace dependency graph

---

## Phase 1: Make Dev Workflow Package-First

### Tasks

1. **Verify package source exports (Pattern A)**
   ```json
   // packages/*/package.json should have:
   {
     "exports": {
       ".": {
         "types": "./src/index.ts",
         "import": "./src/index.ts"
       }
     }
   }
   ```

2. **Configure Vite optimizeDeps.exclude**
   ```typescript
   // apps/hub/vite.config.ts
   export default defineConfig({
     optimizeDeps: {
       exclude: [
         '@mlt/ui-components',
         '@mlt/student-notation-engine',
         '@mlt/pitch-utils',
         // ... all workspace packages
       ],
     },
   });
   ```

3. **Configure Vite server.fs.allow**
   ```typescript
   server: {
     fs: {
       allow: [
         fileURLToPath(new URL('../../packages', import.meta.url)),
         fileURLToPath(new URL('../../node_modules', import.meta.url)),
       ],
     },
   },
   ```

4. **Test HMR with package changes**
   - Edit a package component
   - Verify change appears in hub without rebuild

### Definition of Done
- `pnpm dev` starts without pre-building packages
- Package edits trigger HMR in hub
- No "cannot resolve" errors for package imports

### Risks & Mitigations
- **Risk**: Some packages may have circular dependencies
- **Mitigation**: Run `madge --circular` to detect cycles before proceeding

---

## Phase 2: Extract App Logic into Packages

### Priority Order

1. **singing-trainer** (simplest, most isolated)
2. **diatonic-compass** (standalone, minimal deps)
3. **student-notation** (complex, already has engine package)

### For Each App

#### Step 2.1: Create core package
```bash
mkdir packages/singing-trainer-core
# OR extend existing package if appropriate
```

```json
// packages/singing-trainer-core/package.json
{
  "name": "@mlt/singing-trainer-core",
  "exports": {
    ".": { "import": "./src/index.ts" }
  }
}
```

#### Step 2.2: Move reusable code
- Move components that hub imports to the package
- Move services/utilities that could be shared
- Keep app-specific routing/config in the app

#### Step 2.3: Update app imports
```typescript
// apps/singing-trainer/src/App.svelte
// BEFORE:
import { Highway } from './components/Highway.svelte';
// AFTER:
import { Highway } from '@mlt/singing-trainer-core';
```

#### Step 2.4: Update hub imports
```typescript
// apps/hub/src/routes/singing-trainer/+page.svelte
// BEFORE:
import { SingingTrainer } from '@mlt/singing-trainer';
// AFTER:
import { SingingTrainer } from '@mlt/singing-trainer-core';
```

### Concrete Extraction Candidates

Based on current structure:

| Source App | Extract To | Contents |
|------------|------------|----------|
| singing-trainer | `@mlt/singing-trainer-core` or extend `@mlt/note-highway` | Highway component, pitch detection setup |
| student-notation | Already has `@mlt/student-notation-engine` | Continue moving UI components |
| diatonic-compass | `@mlt/diatonic-compass-core` | Canvas renderer, compass logic |

### Definition of Done
- New package(s) created with extracted logic
- Apps import from packages, not local paths
- Hub imports from packages, not apps
- All tests pass

### Risks & Mitigations
- **Risk**: Breaking changes during extraction
- **Mitigation**: Keep old exports as re-exports temporarily, deprecation warnings

---

## Phase 3: Convert Apps into Thin Shells

### Tasks

1. **Strip app exports**
   - Remove `exports` field from app package.json
   - Remove `@mlt/` prefix from app names
   ```json
   // BEFORE:
   { "name": "@mlt/singing-trainer", "exports": {...} }
   // AFTER:
   { "name": "singing-trainer", "private": true }
   ```

2. **Remove library build config**
   ```typescript
   // apps/singing-trainer/vite.config.ts
   // REMOVE this:
   build: {
     lib: { entry: resolve(__dirname, 'src/index.ts'), ... }
   }
   ```

3. **Simplify app structure**
   - App should only contain:
     - `index.html` - Entry point
     - `src/main.ts` - Mount logic
     - `src/App.svelte` - Root component (thin)
     - Minimal routing/config

4. **Verify standalone app still works**
   ```bash
   cd apps/singing-trainer
   pnpm dev  # Should work as standalone endpoint
   ```

### Definition of Done
- Apps no longer have library exports
- Apps have minimal code (routing/config only)
- Each app still runs standalone for development

### Risks & Mitigations
- **Risk**: Breaking external consumers (if any)
- **Mitigation**: Apps are private, so no external consumers expected

---

## Phase 4: Remove App-to-App Dependencies

### Tasks

1. **Update hub dependencies**
   ```json
   // apps/hub/package.json
   // REMOVE:
   "@mlt/singing-trainer": "workspace:*",
   "@mlt/student-notation": "workspace:*",
   "@mlt/diatonic-compass": "workspace:*",

   // KEEP/ADD:
   "@mlt/singing-trainer-core": "workspace:*",
   "@mlt/ui-components": "workspace:*",
   // etc.
   ```

2. **Update hub imports**
   - Replace all `import ... from '@mlt/singing-trainer'`
   - With `import ... from '@mlt/singing-trainer-core'`

3. **Rename app packages**
   - Remove `@mlt/` prefix from app names
   - Apps become: `hub`, `singing-trainer`, `student-notation`

4. **Update pnpm-workspace.yaml if needed**
   - Should already include `apps/*` and `packages/*`
   - No changes expected

5. **Run full build & test**
   ```bash
   pnpm clean
   pnpm install
   pnpm typecheck
   pnpm build
   pnpm test
   ```

### Definition of Done
- Hub's package.json has no app dependencies
- All apps have simple names (no `@mlt/` prefix)
- `pnpm build:pages` succeeds
- Deployed site works correctly

### Risks & Mitigations
- **Risk**: Build script assumes app names
- **Mitigation**: Audit `scripts/build-pages.js` and `scripts/assemble-pages.js`

---

## Phase 5: Hardening

### Tasks

1. **Add lint rule for dependency direction**
   ```javascript
   // eslint.config.js or similar
   // Forbid apps from importing other apps
   // Could use eslint-plugin-import or custom rule
   ```

2. **Add CI check for package structure**
   ```yaml
   # .github/workflows/ci.yml
   - name: Check no app-to-app deps
     run: node scripts/check-deps.js
   ```

3. **Document in CONTRIBUTING.md**
   - Package-first principles
   - How to add new packages
   - How to create new apps

4. **Add architecture tests**
   ```typescript
   // scripts/check-deps.js
   // Verify: hub dependencies don't include apps
   // Verify: no package imports from apps
   ```

5. **Update CLAUDE.md and ARCHITECTURE.md**
   - Mark refactor as complete
   - Update any outdated references

### Definition of Done
- CI fails if dependency rules violated
- Documentation complete
- Team understands new structure

### Risks & Mitigations
- **Risk**: Future devs don't understand rules
- **Mitigation**: Clear docs + automated enforcement

---

## Package Boundary Strategy

### Domain Logic vs UI vs App-Specific

```
┌─────────────────────────────────────────────────────────┐
│                 App-Specific Glue                       │
│  - Route config, environment config, app layout        │
│  - Lives in: apps/*/                                    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    UI Components                        │
│  - Svelte components, canvas renderers                  │
│  - Lives in: @mlt/ui-components, @mlt/*-core           │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Domain Logic                          │
│  - Audio engines, state management, algorithms          │
│  - Lives in: @mlt/student-notation-engine, etc.        │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    Foundation                           │
│  - Types, utilities, data                               │
│  - Lives in: @mlt/types, @mlt/pitch-utils, etc.        │
└─────────────────────────────────────────────────────────┘
```

### Where Adapters Live

Framework adapters (e.g., Svelte bindings for engine) should live in:
- **UI component packages** if they're reusable
- **App-specific** if they're one-off glue

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Package | `@mlt/kebab-case` | `@mlt/pitch-utils` |
| App | `kebab-case` (no @mlt) | `singing-trainer` |
| Export paths | Subpath exports for modularity | `@mlt/engine/audio` |

### Export Conventions

```typescript
// Main export: ./src/index.ts
export { MainComponent } from './components/Main.svelte';
export { useMainHook } from './hooks/useMain.ts';
export type { MainProps } from './types.ts';

// Subpath exports (optional): ./src/audio/index.ts
// Access via: import { ... } from '@mlt/engine/audio';
```

---

## Summary

| Phase | Effort | Risk | Value |
|-------|--------|------|-------|
| 0: Audit | Low | Low | Foundation for planning |
| 1: Dev Workflow | Low | Low | Better DX immediately |
| 2: Extract Logic | High | Medium | Core architectural fix |
| 3: Thin Apps | Medium | Low | Clean app structure |
| 4: Remove App Deps | Medium | Medium | Correct dependency graph |
| 5: Hardening | Low | Low | Prevents regression |

**Recommended approach**: Complete phases sequentially. Phase 2 is the bulk of the work and can be done incrementally per-app.
