# Shared lesson resources audit

Date: 2026-10-01. Scope: current source for Amateur Music Theory (AMT), lesson-kit, lesson-templates, and Student Notation's note rendering. This is a source audit, not a browser appearance check. No lesson behaviour was changed for this report.

## Assessment

The shared lesson package is small and focused. The problem is incomplete extraction and optional adoption: large lesson components still own presentation and runtime decisions that can override the shared defaults. Earlier styling changes unified a skin and some helpers; they did not establish one note implementation shared with Student Notation.

Future lessons currently have to assemble too much infrastructure themselves. Adding more helpers alone will not guarantee consistency. Reusable components and task contracts should make the consistent behaviour the default.

## How much is shared?

Counts include blank lines and comments in production `.ts`, `.svelte`, and `.css` files under `src`; exclude tests, JSON, assets, documentation, and generated output. Line counts describe source footprint, not the percentage of functionality reused.

| Area | Files | Lines | Actual role |
| --- | ---: | ---: | --- |
| `@mlt/lesson-kit` | 7 | 344 | Small runtime/layout helpers and opt-in note skin |
| `@mlt/lesson-templates` | 20 | 4,664 | Separate exercise definitions, registry, step engine, presets and import utilities; used by Singing Trainer and lesson-trace, not AMT |
| AMT UI source | 26 | 10,109 | Curriculum, scene rendering, local runtime, application UI and shared-within-AMT components |
| Four main AMT scene components (subset above) | 4 | 7,030 | Lines/Spaces: 1,217; High/Low: 2,736; Match Pitch: 1,127; Lesson 1.2: 1,950 |

The scene total includes legitimate lesson content. It is not all duplication. However, it also contains oscillator setup, timers, note markup, geometry and interaction handling that a lesson author should not need to reproduce.

### Inside lesson-kit

| File | Lines | What it centralizes |
| --- | ---: | --- |
| `audio.ts` | 87 | Output volume, tracked envelope metadata and visual fill notifications |
| `clock.ts` | 59 | Pausable, cancellable waits |
| `gridLayout.ts` | 25 | Fitted grid dimensions and cell proportions |
| `placement.ts` | 11 | Placement snapping |
| `noteAppearance.ts` | 92 | DOM/SVG action for stroke, label sizing and playback fill |
| `styles.css` | 65 | Note skin, grid centering, focus and reduced-motion rules |
| `index.ts` | 5 | Six public function exports and the clock scheduler type |

There are no reusable Svelte lesson components or complete task templates in this package. It has no runtime package dependencies. AMT is its only production workspace consumer at present, so it is shared across AMT scenes but not yet proven across multiple applications.

### Adoption within AMT

| Capability | 1.1.1 | High/Low component* | 1.1.4 | Lesson 1.2 |
| --- | --- | --- | --- | --- |
| Shared grid sizing/centering | Yes | Yes | Yes | Yes |
| Shared note skin/action | Yes | Yes | Yes | Yes |
| Shared audio output/fill tracking | Yes | Yes | Yes | Yes |
| Shared pause/cancel clock | Yes | No | No | Yes |
| Shared placement helper | No | No | No | Yes |

*The High/Low component also renders the musical introduction/ending and pitch comparisons. A missing helper does not always imply a defect; tasks differ. It does mean those behaviours are not governed by a common implementation.

Other genuine reuse comes from `@mlt/ui-components` for the PitchGrid background, `@mlt/pitch-data` for pitch rows/frequencies/colors, and `@mlt/talking-avatar` for Grammy assets and speech/avatar infrastructure. AMT also shares its workspace, avatar dock, progress UI, inspector and narration adapter locally. Those local components are reusable within AMT but are not exported lesson-building blocks.

## Why 1.1.2 still differs

1. **Its note size is explicitly doubled.** `PitchLesson112HighLow.svelte:593` uses `pitchGridCellHeight * (isMusicalScorePhase || startsWithComparison ? 1 : 2)`. The ordinary High/Low phases therefore have twice the diameter used in the other modes. The appearance action infers column width from the glyph width when none is supplied, so this also increases the calculated stroke above its minimum. A separate hit-target size already exists; easier clicking does not require changing visible note proportions.
2. **The appearance implementation is separate from Student Notation.** `lesson-kit/src/noteAppearance.ts` repeats values such as the 0.15 stroke ratio, 1.5/0.5 minimum strokes and 0.9/0.7 label ratios found in `student-notation-ui/src/core/constants.ts`. A later change in Student Notation will not automatically reach lessons.
3. **Shared skin does not own geometry.** Lessons still produce their own DOM circles, pseudo-elements, SVG diamonds, capsules and positioning. In the same High/Low component, comparison options use a fixed 3.25rem size and flight/settled notes use a 1.45rem minimum. These are separate presentation policies despite using the same CSS classes.
4. **Color and labels remain consumer decisions.** High/Low commonly supplies pitch-row colors; Student Notation uses note/voice colors. The lesson action fits plain label text, while Student Notation's canvas renderer handles notation-specific label layouts. Those choices need explicit teaching variants rather than accidental local differences.
5. **Typography loading differs.** AMT imports Atkinson through Google Fonts; Student Notation declares the shared `@mlt/font-atkinson` package. Matching family names alone does not establish one font-loading path.

Student Notation's renderer is `student-notation-ui/src/components/canvas/PitchGrid/renderers/notes.ts`. It uses canvas geometry, semantic typography and its animation manager. The lesson skin approximates its dry envelope fill and glow in DOM/SVG. It does not share that renderer or the synth's effects integration. Reverb/delay/vibrato visuals should remain conditional on actual audio effects.

## Remaining sources of drift

- All four scenes still create oscillators locally. The shared audio helper does not schedule the actual voice envelope; scenes schedule audio and provide separate envelope metadata for the visual fill. These two descriptions can diverge.
- High/Low and Match Pitch retain their own wait/pause/cancel timer implementations.
- Note appearance is opt-in through classes and an action. No component ensures that geometry, labels, hit targets and playback identity are supplied consistently.
- Narration, input enablement, success screens and transitions remain scene-specific orchestration. The recent “interact while Grammy introduces the task” behaviour is not yet a general task contract.
- Documentation has drifted: `docs/lesson-inspector.md` still describes 1.1.1 using stretch sizing, while current source uses fitted sizing.
- Existing helper tests support individual calculations, but do not establish end-to-end visual equivalence with Student Notation.

## Recommended building blocks and migration order

1. **Shared notation appearance specification.** Extract genuinely common stroke, geometry, label and fill policies into the shared UI layer. Have both Student Notation's canvas renderer and lesson DOM/SVG rendering consume them. Preserve Student Notation's specialized editing and effects adapters. First migrate 1.1.2 and remove its incidental size overrides; keep generous hit targets separate from glyph dimensions.
2. **LessonNote and LessonPitchGrid components.** Own measurement, fitted sizing, coordinate conversion, glyph proportions, note identity and hit areas. Expose deliberate options such as pitch versus voice color and labelled versus unlabelled notes. A lesson should supply notes and interaction callbacks, not recreate their HTML/CSS.
3. **One lesson audio voice and lifecycle.** Generate audible envelopes and highlight timing from the same scheduled event. Adopt the existing shared clock across scenes, with predictable pause, cancellation, replay and cleanup. Preserve user-gesture audio startup.
4. **Reusable narrated task patterns.** Introduce a small set: demonstration, pitch choice, pitch drag and success transition. Make whether input is enabled during narration explicit. Keep words, pitches, answers and teaching order in AMT lesson definitions.
5. **Clarify package responsibilities.** Keep lesson-kit focused on lesson runtime/components and AMT focused on curriculum/composition. Evaluate the existing lesson-templates step/controller interfaces before creating a second generic runner, but do not force AMT into Singing Trainer's calibrated-pitch exercise model. Document the distinction prominently.

Use one representative migration first: 1.1.2 should demonstrate normal note sizing, playback, dragging, narration, pause/replay and success transitions through these blocks. Then migrate the other scenes and remove superseded local infrastructure. This is safer than moving entire scene files into a shared package or rewriting every lesson simultaneously.

The completion criterion is practical: a new lesson can specify its content and task types without implementing oscillators, note markup, grid sizing, or pause/cancel timers. Its notes inherit Student Notation's common appearance rules automatically.

## Validation and user inspection

This report was checked against source imports, manifests, implementations and source counts. No application code changed; no typecheck, build, server operation or browser automation was needed.

In the already-running Hub's Amateur Music Theory route, compare 1.1.2 notes against 1.1.1 at the same window size, then compare outline/interior/labels with Student Notation. Check idle and sounding states, plus a narrower window. This will help prioritize visual acceptance criteria for the proposed migration; it is not claimed as completed visual verification.
