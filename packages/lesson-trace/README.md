# Lesson Trace Simulator

## Summary
`@mlt/lesson-trace` adds an offline deterministic lesson simulator for Singing Trainer templates. It generates structured execution traces (`.trace.json`), human-readable play-by-play transcripts (`.transcript.md`), and component inventory / lesson usage reports to surface reusable UI primitives across Singing Trainer and Diatonic Compass.

## Why Simulation (Not Real Runtime)
Singing Trainer lesson execution is currently orchestrated through UI/store flows and depends on browser APIs (DOM/WebAudio/microphone). This package runs a deterministic template-level simulation instead of executing the browser app directly. The result is stable, diffable trace output suitable for CI, debugging, and documentation.

Traces represent intended lesson logic under deterministic scenarios; they are not recordings of real mic/WebAudio behavior.

## Commands
```bash
pnpm lesson:trace --lesson quick-pitch-match --variant warm-up --scenario pass-on-first-try
pnpm lesson:trace --all --scenario deterministic-baseline
pnpm lesson:trace --all --scenario deterministic-baseline --with-report
pnpm lesson:report
pnpm lesson:report --scope monorepo
```

## Artifacts
- Traces: `lesson-traces/<YYYY-MM-DD>/*.trace.json`
- Transcripts: `lesson-traces/<YYYY-MM-DD>/*.transcript.md`
- Reports: `lesson-reports/component-inventory.{json,md}`
- Reports: `lesson-reports/lesson-usage-graph.{json,md}`

## Current Coverage
- Includes lesson lifecycle and timeline events: phase transitions, avatar prompts, highway show/hide, reference tone/drone events, wait-for-input transitions, note judgments, and evaluations.
- Overdub traces currently model timeline/voice events only (no pitch scoring).
- Pixel-level render instrumentation is out of scope for v1.

## Validation
- `pnpm --filter @mlt/lesson-trace run typecheck`
- `pnpm lesson:trace --lesson quick-pitch-match --variant warm-up --scenario pass-on-first-try`
- `pnpm lesson:trace --all --scenario deterministic-baseline`
- `pnpm lesson:report`

## Next Step (Optional)
Add a Playwright-backed runtime trace mode so traces can be emitted from actual browser execution (DOM/WebAudio), complementing deterministic simulation traces.

## Implementation Map
- `packages/lesson-trace/src/cli.ts`: command parsing, run modes, output writing
- `packages/lesson-trace/src/runLessonHeadless.ts`: deterministic lesson simulation engine
- `packages/lesson-trace/src/sim/fakeClock.ts`: deterministic clock/timer advancement
- `packages/lesson-trace/src/sim/fakeInput.ts`: scenario-driven input interface
- `packages/lesson-trace/src/sim/scenarios.ts`: built-in deterministic scenarios
- `packages/lesson-trace/src/trace/types.ts`: trace event/document schema
- `packages/lesson-trace/src/trace/recorder.ts`: trace recorder
- `packages/lesson-trace/src/trace/formatMarkdown.ts`: transcript generation
- `packages/lesson-trace/src/report/componentInventory.ts`: component inventory scan + markdown/json output
- `packages/lesson-trace/src/report/lessonUsageGraph.ts`: lesson-to-component usage mapping
