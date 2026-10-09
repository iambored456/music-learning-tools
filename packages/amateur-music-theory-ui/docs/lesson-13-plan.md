# Lesson 1.3 — Intervals Part One (2nds)

Implemented curriculum, incorporating the user's teaching choices. Use only
“pitches” for distance. Answers may occupy any musical column. Mixed practice
includes unison and accepts either direction for seconds.

## Sections

| Section | Name | Teaching and interaction |
| --- | --- | --- |
| 1.3.1 | What Is an Interval? | “The distance between two pitches is called an interval.” Keep the successive C4/E4 pair on the left while adding a simultaneous pair on the right. Replay all four notes in grid order before “Let's learn the names of the smallest intervals.” |
| 1.3.2 | Unison | “Two pitches that are the same are in unison.” Hear G4 with G4 successively and together. Highlight distance 0. |
| 1.3.3 | Minor 2nds | “If a note moves one pitch away, we call it a minor second.” Keep both notes in the same column: first E4/F4, then move F4 down to D♯4 while E4 stays fixed. Sound both pairs together. Introduce distance 1. |
| 1.3.4 | Minor 2nds Above | Place a note above E4, B4, then C4 to create a minor 2nd. |
| 1.3.5 | Minor 2nds Below | Place a note below F4, C5, then D♭4 to create a minor 2nd. |
| 1.3.6 | Major 2nds | “If a note moves two pitches away, we call it a major second.” Demonstrate C4 → D4 and D4 → C4. Introduce distance 2. |
| 1.3.7 | Major 2nds Above | Place a note above C4, E4, then G4 to create a major 2nd. |
| 1.3.8 | Major 2nds Below | Place a note below D4, F♯4, then A4 to create a major 2nd. |
| 1.3.9 | Create an Interval | Grammy opens with “Let's practice!” Then six questions: unison from G4, minor 2nd from C4, major 2nd from E4, unison from F♯4, minor 2nd from F4, major 2nd from G4. Seconds accept either direction. |

## Segments and Sub-Segments

Concept Sections separate their teaching examples into lettered Segments.
In 1.3.1, Segment a introduces the definition, b demonstrates pitches at
different times, c demonstrates pitches at the same time, and d continues.
In a.2, a bracket to the left of C4 and E4 spans their pitch centers, showing
the distance with the same styling as the octave bracket. Each arm extends
to its note's column: the longer upper arm points to E4 and the shorter
lower arm points to C4, keeping the same gap from each note. It clears in b.
Both pairs remain visible through c and d. In c.2, Grammy says only “Or they
can be at the same time.” Segment c has three Sub-Segments; the earlier c.4
explanation has been removed. In d.1, both pairs play in one pass before
Grammy says “Let's learn the names of the smallest intervals.”
Sub-Segments expose the example setup, explanation, sound, note movement,
and chart reveal where applicable.
In 1.3.3.c, both notes slide off the screen to the right using the shared
screen-slide animation. Wait for both to leave before continuing to the next
Section without closing narration. Pause freezes the exit; seeking or
restarting cancels it. Reduced-motion preferences skip the animation.

Each directional practice Section has three question Segments a–c, then a
completion Segment d. Mixed practice opens with “Let's practice!” in a.1,
followed by six questions b–g and completion h.
At the first question of 1.3.4, an upper bubble says “Now you try.” above the
placement prompt. Grammy speaks that introduction before “Place a note above
E4 to create a minor second interval.” Input is available immediately. The
upper bubble stays through retries of that question, then clears for the next
question. Inspector seeks restore both bubbles without repeating the
introduction during retry or correct feedback.
Within each question:

1. Sound the reference and ask the learner to place a note.
2. If incorrect, sound the attempted pair, say “Try again,” and reopen the question.
3. If correct, sound the pair and say “Correct!” before continuing.

Retry is conditional. Questions accept input during narration. Submitting
interrupts unfinished question speech. Grammy rests in his thinking pose
once the current question narration finishes, until an answer is submitted.
The completion Segment replays the answered pairs before advancing.
At the end of 1.3.4.d, after replay and “Good job!”, the remaining notes slide
off the screen to the right before advancing, using the same pause-aware exit
as 1.3.3.c.

## Pitch Grid and Input

Show the complete chromatic A3–A5 viewport, with every intervening pitch
visible. One neighboring pitch is a distance of one; two are a distance of
two. Keep the canonical full pitch data intact and select the visible range
through the shared PitchGrid viewport.
Hide vertical column lines throughout Lesson 1.3; snapping still uses the
same underlying column positions.
Interval demonstrations animate from each note's previous rendered position,
including the small horizontal separation used for coincident notes. Both
notes settle smoothly as a unison opens into a second; pause freezes movement.
All notes and placement previews use the exact pitch colour from the shared
pitch data, matching the grid. Playback and incorrect attempts retain that
colour; Grammy still gives spoken correctness feedback.

Correct second answers use adjacent letter spellings, including octave
boundaries: E4 → F4, B4 → C5, C4 → D♭4, C5 → B4, E4 → F♯4, and F♯4 → E4.
Unison requires the same exact pitch, including octave.

Any musical column is valid, including the reference column and columns
before or after it. Pairs sound together when columns match; otherwise they
sound in column order. Horizontal position does not affect correctness.
Pointer movement previews a standard circle; release places it. Arrow keys
choose pitch and column, Home/End reach the edges, and Enter/Space place.
Escape cancels the preview.

Question input opens in the same update that displays the first reference
note, without waiting for playback or narration. The placement overlay owns
pointer capture and its move/release/cancel handlers, so a captured release
submits immediately. This applies to new questions and retries, while the
reference sounds and Grammy speaks. Placing an answer interrupts both the
reference tone and unfinished narration; feedback then plays the created
interval. A pending audio-context startup cannot play the old reference after
submission. Retry feedback reopens the same question immediately.

The lesson uses shared note appearance, snapping, fitted grid layout, audio
output, question handling, clocks, pacing, and completion from `@mlt/lesson-kit`.
The lesson starts as soon as Grammy is ready, without a separate start button.
Audio initializes lazily through the same path as the other lessons. If the
browser requires activation after direct URL navigation, ordinary pointer or
keyboard input resumes a suspended audio context. The same context remains
available when advancing or restarting Sections, and closes on leaving the lesson.

## Progressive Chart Beneath Grammy

Grammy's stage is anchored at the screen's vertical midpoint. Narration is
positioned above it and the chart below it; neither contributes to the
stage's height or shifts Grammy when its content changes. Narrow screens
retain separate teacher and grid columns, with a smaller avatar and chart.

The native UI table follows the supplied reference. **Distance** and
**Interval Name** are the headers. The interval-name area contains a merged
**2nd** category beside the specific **minor 2nd** / **major 2nd** names.
Unison spans the interval-name area.

- Hide the complete chart throughout 1.3.1 and the first three actions of
  1.3.2.a. At **1.3.2.a.4**, slide the chart in from the screen's left edge,
  showing the headers and the 0 / unison row. The entrance lasts 650 ms.
- In 1.3.3, insert 1 / 2nd / minor 2nd immediately beneath the headers,
  sliding it into view and pushing unison downward.
- In 1.3.6, insert 2 / major 2nd above minor 2nd. The 2nd category spans both rows.
- Keep introduced rows visible throughout subsequent practice.
- Final order: 2 / major 2nd, 1 / minor 2nd, 0 / unison.

This is the start of one cumulative interval table. Lessons 3.1–3.3 retain
these rows and add their newly introduced intervals until all thirteen rows
from unison through octave are present. The interval-name layout keeps merged
major/minor family labels and the supplied descending distance order. See
`lessons-31-33-draft.md` for the cumulative-table specification and curriculum.

The chart remains below Grammy at wide and narrow sizes. Its absolute
position keeps its entrance and row reveals independent of avatar and grid
sizing. Pause suspends the entrance, row, and note-movement animations.
Reduced-motion preferences disable those animations.

## Inspector and Validation

Every Segment and Sub-Segment is seekable. Seeking cancels old speech,
voices, waits, and pointer interactions. Checkpoints reconstruct examples,
chart visibility, chart rows, and prior sample answers without playing skipped content.
Seeking to 1.3.2.a.4 repeats its entrance; seeking beyond it restores the
visible chart without replaying the entrance. Seeking backward before its
introduction hides it again.
Selecting retry or correct actions reconstructs the relevant question and
executes that branch. Restart section retains the unlocked audio context.

Non-visual tests cover curriculum registration, terminology, same-column and
different-column examples, direction and distance checks, mixed practice,
accidentals and octaves, chart markup at each stage, and seek restoration.
The shared note-style regression also checks these scenes. Browser speech
and animation should be inspected in the user's already-running Hub at
`/amateur-music-theory/#/lesson/1.3`, at desktop and narrow phone widths.
