# PitchGrid rendering ownership

`@mlt/ui-components/canvas/primitives` is the pure drawing entry point. It has no Svelte runtime, store, transport, or DOM initialization. Both active notation renderers consume it:

- `ui-components/src/canvas/PitchGrid/renderers/notes.ts` adapts shared PitchGrid coordinates and callbacks.
- `student-notation-ui/src/components/canvas/PitchGrid/renderers/notes.ts` adapts Student Notation's canvas columns, tonal labels, typography, vibrato, delay, and reverb.

The primitives own ellipse/capsule geometry, outline appearance, radial envelope fill, overlapping tail offsets, label sizing, text fitting, and shape intersection. Callers resolve coordinates first: Student Notation's canvas/time/visual spaces and Singing Trainer's tuning/projection remain distinct. Overlapping heads retain their musical position; only style-1 tails stack vertically. Student Notation's sixteenth-note hex path remains in `@mlt/notation-glyphs` and passes through the same fill/outline renderer as a custom path.

Singing Trainer uses these geometry factories for both score and highway audition hit detection. Rounded caps and fast pointer crossings therefore follow the visible shapes. Playback, microphone trails, transport, and editing behavior remain in their respective adapters.

When changing common note appearance, change these primitives and validate both adapters. An application adapter should add only behavior specific to that application. Sharing a monorepo does not automatically share independently implemented renderers.

The former `student-notation-engine/canvas` renderer and standalone `pitch-trail` package had no repository consumers and have been retired. The active singing trail renderer stays in `ui-components`; `pitch-viewport` remains the shared viewport implementation. Student Notation's editing renderer and the reusable Svelte PitchGrid remain separate composition layers.

Focused regression checks:

```sh
pnpm exec tsx --test packages/ui-components/tests/notePrimitives.test.ts
pnpm --filter @mlt/student-notation-ui exec vitest run src/components/canvas/PitchGrid/renderers/notes.test.ts src/components/canvas/PitchGrid/renderers/pitchLabelTextRendering.test.ts
pnpm --filter @mlt/singing-trainer-core test -- src/lib/services/noteAudition.test.ts
```
