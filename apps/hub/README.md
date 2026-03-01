# Hub App

The Hub is the primary app entry point for this monorepo.

It serves:
- `/` (launcher/home)
- `/student-notation/`
- `/amateur-music-theory/`
- `/singing-trainer/`
- `/diatonic-compass/`
- `/visual-metronome/`

All feature logic lives in `packages/*`. Hub imports package UIs and mounts them per route.

## Local Development

From repo root:

```bash
pnpm dev
```

This starts Vite at `http://localhost:5173`.

## Build

From repo root:

```bash
pnpm --filter hub run build
```

Build output is written to `apps/hub/dist`.
