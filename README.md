Live link: https://iambored456.github.io/music-learning-tools/

Layout sizing docs: `packages/student-notation-ui/docs/layout-sizing.md`

## Build-time preview capture

Generate deterministic 4:3 screenshots (1200x900 at 2x scale) for Hub preview cards:

```bash
pnpm --filter hub run build
pnpm -w capture:previews
```

Useful flags:

```bash
pnpm -w capture:previews -- --only singing-trainer
pnpm -w capture:previews -- --verbose
pnpm -w capture:previews -- --list
pnpm -w capture:previews -- --theme dark
```

Output files are written to `apps/hub/public/previews/<app>.png`.

`pnpm -w build:hub` is wired to rebuild the Hub preview screenshot automatically (`--only hub`) after a Hub build.

## Simple Notation (Refactor)

Legacy source was imported into `0C. Simple Notation/`.

Refactored monorepo targets:

- `apps/simple-notation`
- `packages/simple-notation-core`
- `packages/simple-notation-ui`

Run locally:

```bash
pnpm --filter simple-notation run dev
```

### CI notes

Install Playwright Chromium before running capture:

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install --with-deps chromium
pnpm run check:architecture
pnpm --filter hub run build
pnpm -w capture:previews
```
