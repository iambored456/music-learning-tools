# Music Learning Tools Agent Guide

This is the sole authoritative coding-agent instruction file for the repository. Package documentation may describe subsystem behavior, but it does not override this file. Prefer current manifests, scripts, and source structure when descriptive documentation is stale.

## 1. Repository Purpose

Music Learning Tools is a pnpm monorepo of browser-based music education applications. The applications are static-host friendly and are composed into a multi-page Hub for GitHub Pages.

- Required runtime: Node.js 18 or newer.
- Package manager: `pnpm@10.32.1` (see the root `package.json`).
- Workspace globs: `apps/*` and `packages/*`.
- The architectural model is package-first: reusable logic and reusable UI belong in `packages/*`; applications are composition shells.

## 2. Authoritative Development Workflow

The user normally starts development manually from VS Code:

```bash
pnpm dev
```

This runs the Hub at:

```text
http://localhost:5173/
```

During ordinary coding sessions:

- Assume the user's development server is already running.
- Do not start, stop, restart, duplicate, probe, or replace the Vite server unless the user explicitly requests it.
- Do not launch another server on an alternate port for routine verification.
- Do not treat inability to access the user's existing Vite process from an agent sandbox as an application failure.
- Do not perform browser automation or visual verification unless the user explicitly requests it.
- For visual changes, tell the user exactly what to inspect in the already-running application.

The user normally performs the deployment build after a work session:

```bash
pnpm build:pages
```

Do not run `pnpm build:pages` after ordinary source changes unless explicitly requested. It is a comparatively expensive deployment command: it refreshes Hub preview screenshots, builds the Hub for GitHub Pages, and assembles the deployment output.

## 3. Architecture and Dependency Rules

### Package-first boundaries

- Put domain logic, state, audio engines, reusable Svelte UI, and utilities in `packages/*`.
- Keep non-Hub applications thin. `scripts/check-app-shells.js` requires each `apps/*` shell except `apps/hub` to contain only `src/main.ts`, keeps that entry point within a 40-line budget, and forbids local-module imports from it.
- Applications may depend on packages, never on other applications.
- Packages may depend on other packages using `workspace:*`, never on applications. Avoid dependency cycles.
- Application package names are unscoped; reusable package names use `@mlt/*`.
- The Hub imports from `@mlt/*` packages and never from another app directory.
- Run the architecture checks when changing package boundaries, app shells, manifests, imports across workspaces, or workspace structure:

```bash
node scripts/check-deps.js
node scripts/check-app-shells.js
```

### Source-first development

Workspace packages expose TypeScript/Svelte source from `src/`, so workspace consumers get live source, typechecking, and Vite HMR without a package prebuild. Hub Vite configuration excludes workspace dependencies from optimization and allows filesystem access to `packages/`.

Some packages retain `build`/`dev` TypeScript scripts that generate optional compiled output and declarations. Those scripts do not define ordinary workspace resolution; check the target package's `package.json` before deciding whether a task specifically requires generated artifacts.

## 4. Workspace Structure

### Applications

- `apps/hub` — launcher and multi-page production entry for all routed tools.
- `apps/amateur-music-theory` — thin shell for `@mlt/amateur-music-theory-ui`.
- `apps/boomwhacker-video-builder` — thin shell for `@mlt/boomwhacker-video-builder-ui`.
- `apps/diatonic-compass` — thin shell for `@mlt/diatonic-compass-ui`.
- `apps/grand-frequency-staff` — thin shell for `@mlt/grand-frequency-staff-ui`.
- `apps/simple-notation` — thin shell for `@mlt/simple-notation-ui`.
- `apps/singing-trainer` — thin shell for `@mlt/singing-trainer-ui`.
- `apps/student-notation` — thin shell for `@mlt/student-notation-ui`.
- `apps/visual-metronome` — thin shell for `@mlt/visual-metronome-ui`.

### Packages

- App-facing UI: `amateur-music-theory-ui`, `boomwhacker-video-builder-ui`, `diatonic-compass-ui`, `grand-frequency-staff-ui`, `simple-notation-ui`, `singing-trainer-ui`, `student-notation-ui`, and `visual-metronome-ui`.
- Domain and engine packages: `boomwhacker-video-builder-core`, `simple-notation-core`, `singing-trainer-core`, `student-notation-engine`, `overdub-engine`, and `tempogram-toolbox-core`.
- Shared packages: `audio-samples`, `font-atkinson`, `handoff`, `lesson-templates`, `lesson-trace`, `musicxml-import`, `notation-glyphs`, `pitch-data`, `pitch-trail`, `pitch-utils`, `pitch-viewport`, `talking-avatar`, `tanpura-drone`, `tempo-controls-ui`, `types`, and `ui-components`.

Inspect the relevant package manifest before using a command; not every workspace defines every script.

## 5. Important Package and App Relationships

### Hub composition and the common editing pitfall

The Hub owns multi-page entries for all nine tools and mounts their UI packages. A routed tool viewed through the Hub does not execute the standalone app shell's source.

For example, the Hub Singing Trainer entry imports `mountSingingTrainer` from `@mlt/singing-trainer-ui` in `apps/hub/singing-trainer/main.ts`:

- To change Singing Trainer as seen through the Hub, edit `packages/singing-trainer-ui/src/` or its supporting packages.
- `apps/singing-trainer/src/main.ts` is only the standalone mount shell. Editing it has no effect on the Hub route.

Apply the same package-first reasoning to the other routed tools.

### Simple Notation

Simple Notation spans:

- `apps/simple-notation`
- `packages/simple-notation-core`
- `packages/simple-notation-ui`

Keep behavior and reusable UI in its packages; keep the app as a mount shell.

### Student Notation and Singing Trainer handoff

`@mlt/handoff` implements a snapshot copy, not live synchronization. It uses an expiring, one-time IndexedDB slot with localStorage fallback and same-tab navigation. Singing Trainer requires each imported voice to be monophonic; touching note intervals count as overlapping, while different voices may overlap.

### PitchGrid ownership

PitchGrid separation is intentional:

- `@mlt/ui-components` owns the shared PitchGrid component, renderer primitives, types, and shared modes.
- `@mlt/student-notation-ui` owns Student Notation's specialized canvas renderers, interactors, editing tools, and annotations.
- `@mlt/singing-trainer-ui` wraps the shared PitchGrid and adds singing/highway behavior plus the pitch-trail overlay.

Do not merge these layers merely because names overlap. Move capabilities only when they are genuinely shared across consumers.

### Boomwhacker Video Builder

Audio import is browser-only and static-host compatible. The browser decodes the audio and produces waveform/preview data; users create and adjust beat maps manually. Do not introduce a backend-analysis assumption for this workflow.

## 6. Student Notation Architecture

### Engine and Svelte bridge

`@mlt/student-notation-engine` is framework-agnostic. It uses injected dependencies and an `on`/`emit`/`off` event model rather than Svelte stores or window-global state. Its principal factories are:

- `createStore()` — state, persistence hooks, events, and undo/redo.
- `createSynthEngine()` — Tone.js synthesis and audio behavior.
- `createTransportService()` — playback scheduling, timing, looping, and playhead callbacks.
- `createColumnMapService()` — conversions among coordinate spaces.

`@mlt/student-notation-ui` adapts the engine in three main integration files:

- `src/state/initStore.ts` configures storage, logging, and rhythm/column-map callbacks.
- `src/services/initAudio.ts` injects harmonic filtering, effects, runtime registration, and store subscriptions.
- `src/services/initTransport.ts` injects state, stamp scheduling, events, audio unlocking, canvas, and DOM callbacks.

The UI is still transitioning from legacy vanilla modules. Components under `packages/student-notation-ui/src/svelte-ui/`, especially `*Bridge.svelte`, mount Svelte controls into existing DOM structure. Preserve this bridge pattern unless a task explicitly includes a broader migration.

### Coordinate and state invariants

Student Notation has three different column spaces:

- Visual space includes left/right legends.
- Canvas space begins at the musical area, includes tonic columns, and is used for persisted note/stamp/tonic positions.
- Time space excludes legends and zero-duration tonic columns and is used for playback scheduling.

When working in this subsystem:

- Never mix coordinate spaces implicitly. Use `columnMapService` for space conversion and `pixelMapService` for column/pixel conversion.
- Treat `globalRow` as the canonical gamut index. New persisted pitch positions must keep `row` and `globalRow` aligned.
- Never slice `fullRowData`; use `pitchRange` to select the viewport.
- Tonic signs occupy two canvas columns but advance zero time.
- Go through store actions rather than mutating state arrays directly. Emit the relevant event after mutations and call `store.recordState()` for undoable user actions.
- Use `pitchGridViewportService` for viewport access and mutation where its API covers the need.
- Use cell/layout constants instead of hardcoded pixel geometry.
- Keep initialization idempotent; do not add duplicate event listeners.
- Do not autoplay audio. Audio-context startup must remain behind a user gesture through the existing initialization path.
- During playback, leave playhead position to the existing Tone.Transport and playhead-animation path.
- Prefer narrow services, coordinators, and tool interactors over adding more responsibility to `layoutService.ts` or `pitchGridInteractor.ts`.

Before changing viewport sizing, canvas dimensions, grid scroll behavior, or pitch/drum alignment, read `packages/student-notation-ui/docs/layout-sizing.md` and preserve its single-width-per-pass and settled-height safeguards.

## 7. Svelte, TypeScript, Audio, and Domain Conventions

### Svelte and TypeScript

- New Svelte code uses Svelte 5 runes such as `$state`, `$derived`, and `$effect`. Do not introduce Svelte 4 stores for new state.
- The framework-agnostic Student Notation engine is the deliberate exception: keep its event-emitter model independent of Svelte.
- Package TypeScript configs extend `tsconfig.base.json`: ES2022, ES modules, bundler resolution, strict mode, and no emit for checking. The Hub uses its own referenced Svelte app/node configs.
- Preserve existing module specifier conventions in the package being edited. Do not change import/export surfaces casually because workspace source resolution and production bundling both depend on them.

### Audio and domain concepts

- Tone.js provides Web Audio synthesis and transport; Pitchy provides pitch detection; Tonal provides music-theory utilities.
- Browser audio contexts require a user gesture. Any microphone or audio change must preserve permission and unlock flows.
- Student Notation has four color-coded voices with per-voice timbre, harmonic/overtone coefficients, filters, ADSR, delay/tremolo, and vibrato.
- The pitch grid maps time to X and pitch to Y. Its line/space design uses half-row spacing between adjacent pitches.
- Rhythm uses microbeats grouped into duple or triple macrobeats. Stamps encode reusable rhythmic figures.
- Tonic signs establish tonal center/mode without consuming playback time; tempo-modulation markers alter visual and temporal spacing.

## 8. Validation Policy

Use validation proportional to the change:

- Use the narrowest relevant command for the files changed.
- For a localized TypeScript or Svelte change, prefer the affected package's typecheck, for example `pnpm --filter @mlt/student-notation-ui run typecheck`.
- For the Hub itself, its validation script is `pnpm --filter hub run check`.
- Run lint or focused tests only when relevant to the changed code and only where the target package defines them.
- Do not run broad monorepo checks automatically for every small edit. Root `pnpm typecheck`, `pnpm lint`, and `pnpm test` are recursive conveniences, not routine requirements.
- Run both architecture checks when package boundaries, imports, app shells, or workspace structure change:

```bash
node scripts/check-deps.js
node scripts/check-app-shells.js
```

Run a production build only when:

- build or Vite configuration changes;
- package manifests, dependencies, exports, or workspace boundaries change;
- static asset handling or deployment behavior changes;
- typechecking cannot adequately validate the change; or
- the user explicitly requests a build.

Do not start or probe a development server as validation. Do not perform browser automation or visual verification unless explicitly requested. For visual changes, report the relevant Hub route and the concrete states, controls, and responsive sizes the user should inspect in the already-running app.

## 9. Build and Deployment Commands

- `pnpm build` / `pnpm build:all` recursively runs every available workspace build. This is broad and is not a routine validation command.
- `pnpm --filter hub run build` creates the Hub multi-page bundle in `apps/hub/dist`.
- `pnpm build:hub` builds the Hub and then refreshes only `apps/hub/public/previews/hub.png` through Playwright.
- `pnpm build:pages` runs `scripts/build-pages.js`: unless preview capture is skipped explicitly, it builds the Hub once for capture, refreshes all Hub preview images, rebuilds with the Pages base URL, and assembles the site into `docs/`.
- `BASE_URL` controls the deployment base. The root `homepage` is the fallback outside GitHub Actions.
- The Pages workflow runs architecture checks, uses `SKIP_PREVIEW_CAPTURE=true`, builds Pages output, and uploads `docs/`.

The Hub build owns all deployed application routes. Do not copy standalone app `dist/` directories into Pages output or invent a second deployment path.

## 10. Generated Files and Preview Capture

- Treat workspace `dist/` directories, root `dist/`, and `docs/` as generated output.
- Do not inspect or report changes under `dist/` unless a requested build actually generated them and they are relevant to the task.
- Do not use Git commands merely to determine whether an unnecessary build touched `dist/`.
- Do not clean, delete, or regenerate generated output unless explicitly requested.
- Hub preview images live at `apps/hub/public/previews/<app>.png` and are intentionally deterministic deployment assets.
- Preview capture uses Playwright Chromium and starts temporary static servers internally. It is browser automation: do not run `capture:previews`, `build:hub`, or the preview-refreshing portion of `build:pages` unless explicitly requested.
- If preview capture is explicitly requested, ensure Playwright Chromium is installed before running it; do not install browsers or system dependencies without the required permission.

## 11. Git and Worktree Discipline

- Use Git to review the scope of changes, not to recheck after every command.
- Inspect the targeted diff after editing and perform one final scoped status or diff check.
- Avoid repeated equivalent `git diff`, `git status`, and `git diff --stat` commands.
- Do not modify, revert, stage, commit, or investigate unrelated worktree changes.
- Do not use Git merely to check whether a routine build touched generated output when no build was required.
- If Git reports repository ownership or `safe.directory` problems, report the environment issue rather than repeatedly retrying commands with different path or `safe.directory` overrides.
- Do not modify the user's global Git configuration without explicit permission.

## 12. Known Development Pitfalls

- A Hub route imports a UI package, not the matching standalone app source. Edit the package implementation for routed behavior.
- Package build scripts may generate `dist/`, but ordinary workspace imports must continue to resolve package source from `src/`.
- In Student Notation, row/gamut/viewport indices and visual/canvas/time columns are distinct. Identify the coordinate space before doing arithmetic.
- Student Notation layout is sensitive to flex reflow and scrollbar feedback. Read the layout-sizing document before changing its sizing pass.
- Pages paths depend on the configured base URL. Test asset and route changes through an appropriate production build only when the validation policy calls for it.
- Preview-related build commands can rewrite tracked PNGs and generated deployment output; they are not harmless typechecks.
- Boomwhacker Video Builder audio analysis is intentionally local to the browser; beat mapping remains manual.

## 13. Agent Operating Rules

- Confirm the target workspace and read its `package.json` before changing behavior or choosing validation.
- Prefer current source, manifests, and scripts over stale prose. Update descriptive docs when a task makes them inaccurate.
- Keep changes within the requested scope and preserve unrelated user work.
- Do not modify dependency manifests or the lockfile unless dependency changes are required by the task.
- Do not start servers, run deployment builds, capture previews, automate a browser, or clean generated output without explicit authorization.
- After editing, review the targeted files once, run only proportional non-visual validation, and report what was run.
- When visual verification is left to the user, give a short inspection checklist for the already-running Hub rather than attempting to replace their development workflow.
