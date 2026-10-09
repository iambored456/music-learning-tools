# Lesson Inspector

Open Amateur Music Theory through the running Hub and enter Lesson 1.1, 1.2, or 1.3.
The volume control shares one saved preference across all lessons, including
muting and returns through the portal. It adjusts both note audio and Grammy.
In 1.1.1.d, “Let's learn how this grid works.” precedes the first question and
remains in the upper bubble; Inspector jumps into questions restore that bubble.

The inspector opens with the lesson. At window widths of 2100px or more, it is
fixed to the right edge with a 1rem inset and its own scrolling. It occupies the
margin outside the centered 1220px lesson and does not resize the lesson canvas.
On narrower windows it stacks below the lesson. The inspector stays open while
starting or using the lesson, including clicks outside the panel. Click its ×
button to close it for the rest of the page visit; refresh to reopen it.

Pausing any lesson shows a translucent screen overlay with a large pause symbol
and a “Resume lesson” button. The lesson remains visible, and its content cannot
receive pointer or keyboard input while paused. The toolbar and Inspector stay
available; resuming through either control or the overlay removes the notice
and continues the existing playback state.

The piano enters in 1.2.5.a.3 with all key labels hidden. Each white-key label
appears when its key sounds during the synchronized replay. In 1.2.5.b, each
black key reveals its sharp and flat labels on its first playback. Revealed
labels remain visible until the piano leaves; restarting clears them, and
Inspector seeks restore labels from earlier playback without playing audio.

## Current coverage

Lessons 1.1 through 1.3 have expected action sequences in every staged section.
The 1.1 opening musical example and closing score also expose their score
playback as a checkpoint.
The closing musical example starts “See you next time!” alongside the score
and red cursor, even while Grammy's mounted avatar is finishing its entrance.
**1.1.1 — Lines and Spaces** uses broad teaching actions like High and Low:
grid introductions, note demonstrations, questions, retries, correct answers,
placement, and completed playback. Note sequences include their pauses and
closing holds in one Inspector action; the runtime still executes their
individual steps with the same timing.
The five notes slide in from the left at the beginning of `1.1.1.e` and
`1.1.1.f.1`. After the line-placement playback (`1.1.1.e.3`), the notes slide
off to the right in `1.1.1.e.4`. The pitchGrid stays visible through “Good job!”
and into the space-placement task.
Segment `1.1.1.g` clears the notes while Grammy says “Terrific!” and keeps the
pitchGrid visible into High and Low (`1.1.2`). Both celebrations wait for speech
and a 650 ms hold; direct seeks also keep the pitchGrid visible.
The visible identifiers show the full hierarchy: `1.1` is a Lesson, `1.1.1`
is a Section, `1.1.1.a` is a Segment, and `1.1.1.a.1` is a Sub-Segment.
Letters identify segments and the final numbers identify sub-segments within
them. The Inspector's **Restart section** button restarts the selected section.
Sub-segments correspond to actions in the implementation. Internal cue and action IDs
remain stable playback keys. Visible identifiers renumber when the displayed
segments or actions are reordered.
Click a group to expand its ordered actions. Each action describes the planned
prompt, animation, gesture, audio, wait, or learner input. The current action is
highlighted and followed near the middle of the panel automatically.
Manual scrolling suspends following and automatic group expansion, preserving
your place even after the pointer leaves the panel. Seeking to an action,
restarting, or changing sections resumes following.
Double-click a group or action to reset the scene to that boundary and play
from there; Enter on a focused action does the same. A direct jump into note
playback in detailed plans shows preceding notes. In 1.1.1, selecting a grouped
demonstration or playback action starts that complete sequence. A direct jump
into drag playback uses valid example placements. During ordinary progression,
the space-drag exercise starts with its own fresh assortment of line pitches.
Its introduction and input are combined in `1.1.1.f.1`: the learner can drag
immediately while Grammy speaks. Completed-placement playback (`1.1.1.f.2`)
starts once placement is complete. Submitting a placement interrupts unfinished
question speech. This interruptible-question policy is shared across all
current lesson question interactions, including choices and retries.
Note-placement questions also accept a drag that starts on the pitch legend or
blank space outside the grid and ends in the musical area. The release position
uses the same pitch and column snapping as a grid click. Buttons, sliders,
links, and editable controls keep their own interactions. Releases outside the
musical area, pauses, and new question checkpoints cancel the pending drag.
This behavior is supplied by `lessonOutsidePlacement` in `@mlt/lesson-kit`,
with each lesson retaining its own placement and answer validation.
The incorrect-answer actions are conditional: ordinary correct answers skip
them, while an explicit jump to one plays its retry prompt and asks the same
question again.

All staged sections support selecting a cue or action to resume playback at
that boundary. Where a selected action follows a learner answer, the scene
restores a valid example state so the action can run independently. Conditional
retry actions deliberately play their retry path. There are no publication
states; the portal lists every registered lesson.

The inspector model retains bounded diagnostic events in memory for the current
lesson canvas, but the panel displays only expected actions. Events are cleared
when returning to the portal.

## Extending a lesson

Use `@mlt/lesson-kit` for shared clocks, audio output, placement snapping, and
grid sizing, and import `@mlt/lesson-kit/styles.css` for circle notes. The
`mlt-lesson-note` class skins a circle directly; `mlt-lesson-note-target` skins
the `::before` circle inside a larger pointer target. Update the package when
changing general lesson appearance or runtime behavior so Lessons 1.1 and 1.2
inherit it together. Scene-specific cue plans, labels, and interactions stay
in this package. See `packages/lesson-kit/README.md` for the customization API.

Lesson 1.2's pitch grid fits proportionally inside its workspace without an
outer app card. The shared `mlt-lesson-grid-frame` class centers it vertically
inside the available frame. Its independently measured frame bounds the shell, so the
grid's contents cannot resize the frame. The shared helper uses one cell size
for both axes (`cellHeight / 2 === cellWidth`); leave unused frame space rather
than stretching pitch rows to fill the height. Reserve future rows with
`layoutRows` when revealing a larger range. All current Lesson 1.1 and 1.2
scenes use fitted sizing and the shared two-column round-note diameter.

The same pitchGrid stays mounted from 1.2.1 into 1.2.2. After the final
placement replay, all three notes slide off to the right. Once every note
has departed, the grid slides downward to align with the expanded grid's lower
rows. Only after that slide completes does 1.2.2 begin and reveal upward
through C5. Both motions use shared actions with pause and seek support.

In 1.2.2.a, the repeating letter sequence has no question note. The first
question in 1.2.2.b begins with “Let's test your knowledge.” in an upper bubble,
then shows the A note and question below it. The upper bubble stays for that
question and disappears before the second question.

At the end of 1.2.2.b, all three completed note pairs slide off to the right
before 1.2.3.a's A3/A4 pair slides in from the left. The A3–C5 pitchGrid stays
mounted through both sections. The continuous 1.2.1–1.2.4 grid reserves the
future C4–C6 layout height so its fitted cell size stays constant at handoffs.
The 1.2.2 reveal mask clears after expansion so outgoing notes remain visible
until they reach the screen edge.

At the start of 1.2.4.a, plain legend letters shift left over 650 ms while
their octave numbers fade in. The shared canvas legend renderer keeps the
coloured cells and existing A4 label stable. The label animation follows the
lesson clock for pause and cancellation; Inspector restoration and reduced
motion show the completed labels immediately.

In 1.2.4.a.3, an arrow slides in from the left and points to B4 while Grammy
says “Notice that the octave number changes when we move from B”. After both
speech and arrival finish, the lesson pauses for 650 ms. Grammy then says
“to C” while the arrow smoothly turns to connect the outside edges of B4 and
C5. It holds briefly, then clears when practice begins. The same B4 note slides
left into the reference position for 1.2.4.b.1 while the other example notes
clear; the question appears after B4 arrives. All waits and motion
follow pause, cancellation, reduced-motion, and Inspector restoration.

In 1.2.4.b, correct adjacent-note pairs accumulate from left to right. Each
new question occupies the next pair position while earlier results remain
visible. Incorrect choices keep the current question open and do not add a
result. Inspector restoration recreates earlier correct pairs. After the
fourth answer, all eight notes slide off to the right before the closing
Bravo; the completed expansion mask is removed so it cannot clip their exit.

The same pitchGrid remains mounted from 1.2.4 into 1.2.5. After the notes exit
and Grammy's closing Bravo, a one-second morph crops C6–C♯5 from the top,
keeps C4 at the bottom, resizes the C4–C5 grid to the compact piano layout, and
centers it in the workspace with room reserved below for the keyboard.
The letter labels remain visible while the octave numbers fade out. The morph
uses the pause-aware lesson clock and restores immediately for Inspector
seeks or reduced motion. The next section begins only after it completes.

In 1.2.1.c, Grammy identifies C on the red line, D on a line, and E on a
dashed line. Each labelled note slides from the left screen edge to a position
with one empty column between its left edge and the pitch legend. The line
notes shift two columns to the right as A enters. C, D, and E stay there while
A, B, F, and G slide into the spaces as they are announced.
Each step waits for both speech and the shared screen-slide arrival, with
pause, reduced-motion, and Inspector restoration handled by that action.
All seven notes slide off to the right at the end of segment c, before
placement practice begins; the pitchGrid stays visible.

In 1.2.1.d, the D, F, and B placement prompts allow any horizontal column.
The requested pitch's legend label has a soft glow throughout its question
and retries; it clears when the question finishes and follows the next prompt.
The invisible column grid uses two-column circle-note positions, matching
Student Notation. Hold and move a note to preview its position; release to
submit and play a fixed 430 ms pitch, matching standard lesson examples.
Correct placements retain their chosen columns and can be clicked to sound
again. Keyboard users focus a pitch row, choose a column with Left/Right
(Home/End reach the edges), then use Enter or Space to place the note.

In 1.2.3.a, the two A notes slide in from the left before playback. The first
comparison prompt is “Click on the higher pitch”. A correct naming answer
reveals both note letters immediately; wrong answers retain the hidden labels.
Each pair exits to the right after its naming question, before the next pair
enters. Inspector retries retain their existing Sub-Segment numbers.

Section 1.2.3 ends without “Bravo!”. Its original A pair exits, then the
grid trims its bottom edge from A3 to C4 and slides down. The 1.2.3 and 1.2.4
sections share a mounted scene and reserve the final C4–C6 geometry, so the
prepared C4–C5 rows continue in the same position across the section boundary.
Section 1.2.4 reveals upward only to C6. Grid masks and note slides wait for
their actual animation completion, support pause and reduced motion, and
discard canceled callbacks when seeking or restarting.

`src/linesSpacesCues.ts` contains the detailed execution plan and the condensed
`linesSpacesInspectorCues` display plan. `getLinesSpacesInspectorActionId` maps
each execution step to its visible teaching action, whose ID is also a valid
execution checkpoint. Its stable cue and action IDs, prompts,
speech settings, and timing values are consumed by the inspector and by
`PitchLesson111LinesSpaces.svelte`. Keep each expected action aligned with an
execution boundary and update both its detail and execution when behavior
changes.

In 1.1.1.d, each question note slides in from the screen's left edge while
earlier answered notes remain visible. Retry and correct checkpoints restore
that question's accumulated notes. **1.1.1.d.16** retains the five-note playback
and closing hold. **1.1.1.d.17** slides all five notes together off the right
screen edge before segment e begins. Both the note slides and Lesson 1.3's
chart entrance use the pause-aware `lessonScreenSlide` action in lesson-kit.

The e and f placement groups also exit to the right after their completed
playback, before success narration. In 1.1.2.a.2 and a.3, the low and high
examples enter from the left; all six remain visible until a.4's shared exit.
The b.1 and c.1 learner notes enter with their prompts. The low placement
remains on the grid during the high question; c.5 exits both placements.

Each 1.1.3 question pair enters beneath Grammy and flies to the grid after
the correct answer. All seven pairs remain there through g. At **h.1** the
fourteen notes play back and exit together once. Subsequent actions hide the
grid, move Grammy into the former grid center, say “Bravo!”, and return him
to the teacher position before 1.1.4 starts. The grid's layout remains
reserved while hidden. Seeking to a celebration action restores the empty
canvas and appropriate avatar position without replaying earlier sounds.
The automatic transition to 1.1.4 suppresses a second avatar entrance.

`src/lesson12Cues.ts` defines Lesson 1.2's expected actions. Its section
runner uses action markers and fast-forward state restoration when seeking to
a later action. The High and Low and Match the Pitch scenes define their plans
beside their existing task and question data.

`src/lesson13Intervals.ts` defines Lesson 1.3's execution steps and Inspector
actions together. Its checkpoints restore note examples, progressively
introduced chart rows, and prior sample answers. Retry and correct actions
restore their question and run the requested branch. The chart stays beneath
Grammy and accepts pause and reduced-motion settings. See
`lesson-13-plan.md` for the curriculum and placement rules.

To instrument another section:

1. Define a typed cue plan with stable cue and action IDs. Describe the expected
   prompt, visual action, gesture, audio, input, completion rule, and timing.
2. Read the plan's prompt and timing values from the scene's execution code.
   Make an action checkpoint restore the scene state required at that boundary.
3. Get the inspector from `lessonInspectorKey` in Svelte context. Register the
   plan and an action-aware checkpoint handler after mounting/readiness, and
   dispose that registration when the scene is destroyed.
4. At each execution boundary, call `enter` for a cue and `action` for its
   current action. Cancel old audio, speech, waits, and interactions on seek.
5. Use `createLessonClock` for cancellable, concurrent, pause-aware waits. Check
   the sequence token after asynchronous work before changing scene state.
6. Connect note envelopes through `createLessonAudioOutput` and update its volume
   with the scene's volume prop. Its master gain handles live volume and mute.

The clock is shared by 1.1.1 and Lesson 1.2. Other 1.1 scenes still use
their existing sequence schedulers. Keep these helpers inside this UI package
until another application needs them.

## Non-visual validation

```sh
pnpm --filter @mlt/amateur-music-theory-ui run typecheck
pnpm exec tsx --test packages/amateur-music-theory-ui/tests/lessonRuntime.test.ts
```

The tests cover pause-aware timing, cancellation, live muting, 1.1.1 action
checkpoints, 1.2 plan and retry mapping, inspector registration, and the three-lesson
curriculum. They do not validate browser speech synthesis or rendered animation.

In the already-running Hub, inspect a prompt, retry, and completion action in
1.1.2 through 1.1.4 and each 1.2 section. Check that the highlighted action
follows normal playback, that double-clicking a later action starts there, and
that × dismissal lasts until refresh. Compare the right-hand panel on a wide
window with its stacked narrow layout.
