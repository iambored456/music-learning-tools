# @mlt/lesson-kit

Source-first lesson building primitives, independent of Svelte, lesson content,
and the Student Notation engine. Import runtime helpers from `@mlt/lesson-kit`
and the opt-in note skin from `@mlt/lesson-kit/styles.css`.

## Shared pacing and completion

Use `lessonPacing` from `src/pacing.ts` for the named pacing defaults. The
reference interaction is **1.2.1.c**: sound each placed answer, then replay all
completed notes as a reward before the segment advances. Its placement note
lasts 430 ms; reward notes have a 130 ms gap **between** them, and the final
note is followed by the shared 320 ms exercise-completion pause.

`completeLessonExercise({ replay, wait, isCurrent })` waits for reward playback
and that pause, returning whether it is still safe to advance. Lock input
before calling it, pass the existing pause-aware wait and sequence-validity
check, and advance only on `true`. A note-placement task supplies `replay`;
tasks without musical answers can omit it. Replay resolves at the end of the
last note, without adding a trailing inter-note gap. In 1.2.1.c the replay
follows the learner's left-to-right note positions and retains the notes.

Other named phases are the hold after correct placement feedback (780 ms),
the pause between placement questions (300 ms), retry feedback (420 ms), and
the hold after a spoken celebration (650 ms). These are separate phases, not
interchangeable delays. Existing 1.2 placement questions use these defaults;
1.1.1 quiz/drag reward holds share `afterExerciseMs`, and its success screens
share `afterCelebrationMs`. Other legacy scene timings are not yet migrated.

Keep lesson-specific teaching exceptions explicit and documented. For example,
the longer 1.1.1.b/c demonstration pauses remain 2000 ms. Do not replace an
animation delay with a feedback setting merely because the numbers match.

Use the `lessonScreenSlide` DOM action for entrances from the screen's left
edge and exits past its right edge. Pass `direction: 'enter-left'` or
`'exit-right'`, `paused`, and an optional `replayKey` for replaying a mounted
element. Pass `direction: null` or destroy the action to cancel its motion.
It shares a 650 ms ease-out duration (`lessonScreenSlideMs`), measures the
resting element against the viewport, and respects reduced motion. It animates
individual `translate`, preserving note centering transforms and the shared
note appearance. Apply it to a wrapper to move a group together. Lesson 1.3's
chart and 1.1.1.d's question notes use this same action.

Pass `direction: 'to-offset'` with `offset: { x, y }` to move an avatar to
a measured position and back with the same pacing. Updates start from the
currently displayed translation; `instant: true` restores a seek checkpoint.
Reduced motion restores avatar positions immediately. The opt-in
`mlt-lesson-avatar-anchor` and `mlt-lesson-avatar-centered` classes keep a
teacher at a consistent resting position across scenes on wide screens,
preserving the teacher row on narrow layouts. Position note choices outside
that anchor's flow so their arrival does not move the teacher.

## Authoring direction

Question input is available while the question is read. Use
`createLessonQuestion(cancelSpeech, onAwaitingAnswer?)` for this policy: `start(speak, unlock)`
unlocks synchronously, and call `submit()` after validating an input event but
before evaluating its answer. Both correct and incorrect submissions interrupt
question narration. If speech waits for playback/audio readiness, check the
`isOpen` callback supplied to `speak` before starting it. Await the response,
not narration, before processing feedback. Demonstrations and success/retry
feedback retain their own sequencing; this policy applies to answering prompts.

The optional `onAwaitingAnswer` callback is `false` during narration and after
submission, and becomes `true` once the current question finishes speaking.
AMT connects it to Grammy's thinking resting expression. Call `wait()` when
reopening an already-narrated question after retry feedback, and `submit()`
when replaying, resetting or disposing a scene so stale speech cannot restore
the waiting expression. Multi-note tasks call `wait()` after a partial answer
if further learner input is still needed.

All current AMT question families use this policy: line/space choices and
dragging, high/low placement, higher/lower comparisons, pitch matching, and
Lesson 1.2 choices/placement. A multi-note placement submission interrupts the
prompt but still requires all requested notes before completion.

The curriculum hierarchy is lesson → section → segment → subsegment (for
example 1.2 → 1.2.1 → 1.2.1.c → 1.2.1.c.1). Section definitions own content,
answers and teaching order. Reusable interactions and their lifecycle belong
in shared lesson resources. Extend those resources when adding interaction
types; avoid recreating rendering, audio, pacing or cancellation inside each
new section. This is an incremental migration, not a claim that existing
scenes already follow that structure throughout.

Add `mlt-lesson-grid-frame` to the independently measured frame around a fitted
grid. It centers the grid vertically without changing its dimensions or cell
proportions. Horizontal alignment defaults to the start. Override
`--mlt-lesson-grid-align` (for example `flex-start`) or
`--mlt-lesson-grid-justify` (for example `center`) for other lesson layouts.
Every Amateur Music Theory grid in lessons 1.1 and 1.2 uses fitted sizing and
vertical centering, keeping time columns and pitch-row spacing at the same
scale instead of stretching to the available frame height.

Spread `lessonGridAppearance` onto PitchGrid for the shared lesson line style:
Student Notation's red 3.33px C lines, 1px dashed E lines, grey G bands and
ordinary pitch lines. In singing-mode lesson grids it also enables two-column
beat boundaries, dashed between solid eight-column boundaries. The score
example disables those regular guides and retains its own authored beat
positions with matching grey line styling. Other PitchGrid consumers keep
their existing defaults unless they opt in. Legend lines receive the same
style when extending horizontal lines beneath the legend is enabled.

For an upward range reveal, render the final row range and legend in a fixed
shell first. Apply `mlt-lesson-grid-reveal` to that shell and set
`--mlt-lesson-grid-reveal-top` to the hidden row count times `cellWidth`.
Reducing that inset to zero reveals the higher rows without resizing the
canvas or moving existing pitches. The default transition is 1200 ms and
respects reduced motion. Lesson 1.2.2 uses this to reveal through C5.

- `createLessonClock`: concurrent cancellable waits; pauses preserve remaining time.
- `createLessonAudioOutput`: one live volume gain after individual note envelopes.
  Connect only after the consumer's existing user-gesture audio unlock. This helper
  does not create or resume audio contexts.
  Pass frequency and audio-clock envelope times as the optional fourth `connect`
argument to drive note fills. Score events also pass `noteIds` so repeated
pitches remain independent. Call `forget` when disposing a voice, `retune`
  when changing a held pitch, and `release` when shortening a held envelope.
- `snapLessonPlacement`: converts musical-area pointer coordinates to pitch rows
  and two-column circle positions. Exclude legend pixels before calling it.
- `calculateLessonGridLayout`: sizes from an externally measured frame rather than
  its contents. `layoutRows` reserves space for an expanding pitch range; vertical
  spacing uses the same scale as horizontal cells by default (`sizing: 'fit'`).
  Pitch rows are half a cell apart, so `cellHeight / 2 === cellWidth`. The shell
  fits inside the frame rather than stretching to fill it. Explicit
  `sizing: 'stretch'` fills the frame and allows independent vertical scaling
  for lessons that deliberately use that layout. Consumers retain their own
  responsive limits and must use the returned cell dimensions together.

Add `mlt-lesson-note` to a visible circle, or `mlt-lesson-note-target` to a larger
hit target whose note is drawn by `::before`. Use the `lessonNoteAppearance`
action with `{ audioOutput, cellWidth, frequency, noteId?, active?, shape? }`.
`cellWidth` is required and must be the positive grid scale. The action initializes
stroke, label size and fill before measurement; CSS has no alternate defaults for
these values. It measures the note for label fitting, scales its real stroke
with the supplied grid (15% of a column, as in Student
Notation), and subscribes to audio-clock envelopes. Notes are hollow at rest;
radial fills follow attack, sustain, and exponential release. The dry playback
style has a subtle 1.5px colored glow, without playback pulsing or enlargement.
Score glyphs pass `noteId` to follow their own event rather than all voices at
their pitch. Demonstrations can use `active` to select the relevant note among
several visible copies of the same pitch.
No reverb, delay, or vibrato visuals are added to dry lesson audio.

Round and oval notes use an ellipse; extended notes use
`mlt-lesson-note--capsule`. SVG diamonds use `mlt-lesson-note-svg` and the same
action, with non-scaling strokes and envelope gradients. Duration capsules keep
their originating column scale so extending a note does not thicken its outline.

Use individual Svelte `style:` directives for position, size and color on every
element with this action. A whole `style={...}` string replaces the element's
inline CSS and erases the action's stroke, label and fill properties. For example:

```svelte
<span class="mlt-lesson-note"
  use:lessonNoteAppearance={{ audioOutput, cellWidth, frequency }}
  style:top={`${topPercent}%`}
  style:left={`${leftPercent}%`}
  style:width={`${cellWidth * 2}px`}
  style:height={`${cellWidth * 2}px`}
  style:color={color}
></span>
```

The lesson UI's `tests/lessonNoteStyles.test.ts` guards all scene components
against missing grid scale and whole-style replacement, and exercises Svelte's
style runtime to verify appearance survives movement. Run it with
`pnpm exec tsx --test packages/amateur-music-theory-ui/tests/lessonNoteStyles.test.ts`.

Put `mlt-lesson-note-label` on a child label. Labels use Student Notation's
Atkinson font and bold weight, measured to fit the note. Consumers still decide
which pitch or teaching text to show; unlabelled exercises stay unlabelled.
Consumers own positioning, pitch/voice color, hit targets, drag events, and
answer-feedback states. Keyboard focus and reduced-motion handling are shared.

Round grid notes use `calculateLessonGridLayout(...).noteDiameter`, including
source, comparison, flying and settled notes. Do not multiply that diameter or
apply minimum glyph sizes or hover/drag scaling in a section. Keep larger hit
areas separate with `mlt-lesson-note-target` and a centered `::before` glyph;
pass the grid's `cellWidth` to the appearance action so it remeasures even when
the hit area stays fixed during resizing. Shared hover/focus outlines provide
interaction feedback without changing the note's proportions.

Use `mlt-lesson-note--preview` for a tentative placement and
`mlt-lesson-note--incorrect` for the incorrect-answer outline. These explicit
teaching states share their styling; they do not replace audio envelope fill.
Score ovals, diamonds and duration capsules retain their musical geometry.

Amateur Music Theory's 1.1 and 1.2 scenes use these primitives. Their narration,
waveforms, answer validation, and cue plans remain in the UI package. This package
is distinct from `@mlt/lesson-templates`, which owns exercise definitions/import.

The skin covers round notes in Lines and Spaces, High and Low demonstrations
and dragging, pitch-comparison options and flights, Match the Pitch, every
Lesson 1.2 subsection, and the round/oval notes in the musical introduction and
ending, including diamond rhythm glyphs and sustained capsules. Preview and
answer-feedback states remain distinct from playback fill.
