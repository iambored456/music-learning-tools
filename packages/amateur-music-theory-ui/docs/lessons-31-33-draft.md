# Lessons 3.1–3.3 — Ascending intervals draft

First implementation, 2026-10-04, based on the curriculum draft and the user's
confirmed cumulative-table requirement. The landing page now opens all three
Harmony lessons, with 7, 7, and 9 playable Sections respectively.

Use the demonstration, practice, feedback, and replay structure of 1.3.3–1.3.9.
The new lessons replace descending practice with tasks that ask learners to compare,
change, recognize, or reproduce an ascending interval. The three lessons
should have different organizing ideas:

| Lesson | Main idea | Distinctive activity |
| --- | --- | --- |
| 3.1 — Intervals: Part Two (3rds) | One interval family has two sizes. | Change a minor 3rd into a major 3rd, then reproduce a 3rd from another starting pitch. |
| 3.2 — Intervals: Part Three (4ths, Tritones, and 5ths) | Three neighbouring distances can be compared against one another. | Place the tritone between a perfect 4th and perfect 5th; find and correct mismatched examples. |
| 3.3 — Intervals: Part Four (6ths, 7ths, and Octaves) | Wide intervals can be understood using the octave as a reference. | Build a wide interval using the gap remaining to the octave. |

## Common teaching and interaction rules

- Continue using **pitches** for distance in learner-facing language. Count
  movements between adjacent chromatic pitches, starting at zero on the
  reference. Do not describe a distance of three as three notes in total.
- Introduce a name with a visible example, sound it, reveal its chart entry,
  then offer a short guided placement block. Use two or three questions per
  ordinary block, followed by a different kind of task.
- Every target is above its reference. Successive demonstration and answer
  playback runs lower note first, higher note second, regardless of placement
  column. This is a change for these lessons from 1.3's column-order
  playback. Same-column pairs may also sound together. A correction can move
  the upper note up or down while the resulting interval remains ascending.
- Any musical column remains valid for interval placement. Show successive
  demonstrations left to right. Placement position is not an extra test.
- Keep immediate pointer/keyboard answers, interruptible question narration,
  pause/resume, shared note appearance, and seekable Inspector actions.
- Start with “Correct!” / “Try again.” After a repeated error, offer a short
  distance hint such as “That interval is one pitch too wide.” Keep the
  reference fixed and let the learner try again without restarting the block.
- Maintain exact pitch colours. Use brackets or outlines to identify pairs,
  without recolouring notes to signal correctness.
- Keep the same cumulative chart introduced in Lesson 1.3 visible during
  ordinary practice, retaining every previously introduced row. Do not automatically
  highlight the answer row during a question that asks the learner to name an
  interval. Show the relevant row after submission instead.

Author reference: the distances are 3/4 for minor/major 3rds, 5/6/7 for perfect
4th/tritone/perfect 5th, 8/9 for minor/major 6ths, 10/11 for minor/major 7ths,
and 12 for an octave. These are chromatic distances (semitones internally).
See [Music Theory for the 21st-Century Classroom, interval distances](https://musictheory.pugetsound.edu/mt21c/HowToIdentifyIntervals.html).

Use **perfect 4th**, **perfect 5th**, and **octave** in the lessons. Introduce
“perfect octave” alongside “octave” once. Major/minor names apply to the
3rds, 6ths, and 7ths here. A tritone may be spelled as an augmented 4th or
diminished 5th; teach the shared name now and defer those spelling categories.
See [interval qualities](https://musictheory.pugetsound.edu/mt21c/IntervalsIntroduction.html)
and [tritone terminology](https://musictheory.pugetsound.edu/mt21c/HowToIdentifyIntervals.html).

## Confirmed: one continuously growing interval table

The user confirmed that the table introduced in Lesson 1.3 continues building
through the later interval lessons until it contains the complete reference
shown in the supplied image. Each lesson starts with the rows taught before
it and adds new rows as their intervals are introduced. Earlier rows remain
visible in the same table; do not reset it or move them into a separate,
collapsed reference.

| By the end of | Newly added entries | Total interval rows |
| --- | --- | --- |
| 1.3 | Unison, minor 2nd, major 2nd | 3 |
| 3.1 | Minor 3rd, major 3rd | 5 |
| 3.2 | 4th, tritone, 5th | 8 |
| 3.3 | Minor 6th, major 6th, minor 7th, major 7th, octave | 13 |

Follow the supplied image's interval-name layout: an **Interval Name** header,
merged family labels for 2nd, 3rd, 6th, and 7th beside their major/minor rows,
and full-width name rows for unison, 4th, tritone, 5th, and octave. Preserve
the pale yellow table and family cells, pale green major rows, and pale peach
minor rows. Keep Lesson 1.3's existing Distance column aligned with the entries.
The chart uses the short labels “4th” and “5th”; teaching prompts may still
call them “perfect fourth” and “perfect fifth.”

The completed order, from top to bottom, is: octave; major 7th; minor 7th;
major 6th; minor 6th; 5th; tritone; 4th; major 3rd; minor 3rd; major 2nd;
minor 2nd; unison. Insert each newly taught entry into its distance order,
using the existing row-reveal motion, without revealing untaught entries.
Under the proposed lesson sequence, the tritone fills between the already
visible 4th and 5th, and 6ths/7ths fill below the already visible octave.

Keep the growing table beneath Grammy and accommodate its complete height
without moving the avatar or obscuring the pitch grid. Direct lesson entry
and Inspector seeks reconstruct all entries taught before that point,
including those from earlier lessons; this does not depend on having visited
each earlier lesson in the current session.

## 3.1 — Intervals: Part Two (3rds)

Learning target: create and distinguish ascending minor and major 3rds,
including when their starting pitches differ.

| Section | Name | Draft sequence |
| --- | --- | --- |
| 3.1.1 | Minor 3rds | Briefly recall C4–D4 as a major 2nd. Move the upper note to E♭4, sound C4–E♭4, and reveal distance 3 / minor 3rd. Show E4–G4 as a second example. |
| 3.1.2 | Minor 3rds Above | Three placements: above E4 → G4; C4 → E♭4; A4 → C5. Include natural pitches, an accidental, and an octave boundary. |
| 3.1.3 | Major 3rds | Keep C4 fixed and compare E♭4 with E4. “A major third is one pitch wider than a minor third.” Reveal distance 4. Replay both pairs separately, then introduce the minor/major label buttons with one guided choice. |
| 3.1.4 | Major 3rds Above | Three placements: above C4 → E4; D4 → F♯4; F4 → A4. |
| 3.1.5 | Change the Third | Two transformations: C4–E♭4 becomes a major 3rd by replacing E♭4 with E4; D4–F♯4 becomes a minor 3rd by replacing F♯4 with F4. Keep the lower note fixed. |
| 3.1.6 | Same Distance, New Starting Pitch | Show C4–E♭4 and ask for the same distance above D4 → F4. Then show F4–A4 and ask for the same distance above G4 → B4. Keep each model visible. |
| 3.1.7 | Thirds in Practice | Six questions mixing placement, recognition, and correction. Finish by replaying answered examples as separate pairs. |

Sample questions for the final block:

| Task | Prompt and setup | Answer |
| --- | --- | --- |
| Build | “Place a note above B3 to create a minor third.” | D4 |
| Name | Show A3–C♯4. “Is this a minor third or a major third?” | Major 3rd |
| Correct | Show F4–A♭4. “This should be a major third. Replace the upper note.” | A4 |
| Match | Model E4–G4. “Make the same distance above C4.” | E♭4 |
| Compare | Show C4–E4 and C♯4–E4. “Which pair makes the smaller third?” | C♯4–E4 |
| Build | “Place a note above E4 to create a major third.” | G♯4 |

The comparison with the same upper note matters: choosing whichever answer
note looks higher will not solve it. The learner has to compare distances.
Keep the two pairs clearly separated and individually replayable.

Proposed closing line: “You can build both kinds of third, even when they
start on different pitches.”

## 3.2 — Intervals: Part Three (4ths, Tritones, and 5ths)

Learning target: distinguish distances 5, 6, and 7, and use the relationship
between them to check an answer.

Teach the perfect 4th and perfect 5th before the tritone. This deliberately
gives the middle distance two familiar reference points. The landing-page
title can retain its requested order.

| Section | Name | Draft sequence |
| --- | --- | --- |
| 3.2.1 | Perfect 4ths | Demonstrate C4–F4 and E4–A4. Reveal distance 5 / perfect 4th. Briefly explain that this interval uses the word “perfect.” |
| 3.2.2 | Perfect 4ths Above | Two placements: C4 → F4; B3 → E4. Replay the pairs. |
| 3.2.3 | Perfect 5ths | Keep C4 fixed and compare F4 with G4. Reveal distance 7 / perfect 5th. Show D4–A4 as a second example. |
| 3.2.4 | Perfect 5ths Above | Two placements: D4 → A4; B♭3 → F4. |
| 3.2.5 | The Tritone Between Them | Show the upper notes of C4–F4 and C4–G4. Add F♯4 between F4 and G4, pairing it with C4. Reveal distance 6 / tritone. Then build above F4 → B4 and B3 → F4. |
| 3.2.6 | Check the Interval | Three short choices: select the requested interval, find a mismatched label, then correct one upper note. |
| 3.2.7 | Fourths, Tritones, and Fifths in Practice | Six questions, two for each new distance, with a mixture of construction and diagnosis. |

Sample questions for 3.2.6:

1. Show C4–F4, C4–F♯4, and C4–G4 as separately labelled choices A/B/C.
   “Which pair makes a tritone?” Answer: C4–F♯4. Vary the choice order so
   the correct answer is not always the centre button.
2. Show C4–G4, D4–A4, and E4–B♭4, each labelled “perfect fifth.”
   “Which pair does not match its label?” Answer: E4–B♭4. Replay it and
   identify its distance of six.
3. Keep E4–B♭4. “Replace the upper note to make a perfect fifth.” Answer:
   B4. Replay before and after as separate ascending pairs.

Suggested final block: build a perfect 4th above D4 → G4; name F4–B4 as a
tritone; build a perfect 5th above E4 → B4; correct C4–F♯4 to a perfect 4th
with F4; match the tritone C4–F♯4 above D4 → G♯4; choose the perfect 5th
from A3–D4, A3–D♯4, and A3–E4.

Proposed closing line: “Fourths, tritones, and fifths are three neighbouring
distances: five, six, and seven pitches.”

## 3.3 — Intervals: Part Four (6ths, 7ths, and Octaves)

Learning target: create ascending 6ths, 7ths, and octaves, and check a wide
interval using its distance from an octave.

Begin with the octave, already encountered in Lessons 1.2 and 1.4. Establish
its distance of twelve, then use it as a visible reference for the new wide
intervals. This lesson contains five new chart entries, so split the teaching
into short sections and keep ordinary placement blocks brief.

| Section | Name | Draft sequence |
| --- | --- | --- |
| 3.3.1 | The Octave | Show and sound C4–C5. Recall the same letter in the next octave, reveal distance 12, and introduce “perfect octave.” |
| 3.3.2 | Octaves Above | Two placements: A3 → A4; E4 → E5. Explicitly distinguish the higher octave from unison. |
| 3.3.3 | Two Sizes of Sixth | Demonstrate C4–A♭4 at distance 8 and C4–A4 at distance 9. Sound each pair separately. After each introduction, a guided placement with a C4–C5 octave bracket checks the remaining gap: major 3rd for the minor 6th, minor 3rd for the major 6th. |
| 3.3.4 | Sixths Above | Three placements: minor 6th above C4 → A♭4; major 6th above F4 → D5; minor 6th above E4 → C5. |
| 3.3.5 | Two Sizes of Seventh | Demonstrate C4–B♭4 at distance 10 and C4–B4 at distance 11. After each introduction, a guided placement checks the remaining gap to C5: a major 2nd and a minor 2nd respectively. |
| 3.3.6 | Sevenths Above | Three placements: minor 7th above D4 → C5; major 7th above C4 → B4; major 7th above E4 → D♯5. |
| 3.3.7 | Leave Room for the Octave | Give the lower reference and its octave marker, then ask for an intermediate pitch using the remaining gap. Two questions below. |
| 3.3.8 | Same Wide Interval, New Starting Pitch | Show C4–A4 and reproduce its major 6th above B♭3 → G4. Then show C4–B♭4 and reproduce its minor 7th above A3 → G4. |
| 3.3.9 | Wide Intervals in Practice | Six questions covering all five new distances, with one earlier interval as a review question. |

Sample questions for 3.3.7:

| Setup | Prompt | Answer and feedback |
| --- | --- | --- |
| C4 reference; C5 octave marker | “Place a note above C4 that leaves a minor second to C5.” | B4; “You made a major seventh above C4.” |
| C4 reference; C5 octave marker | “Place a note above C4 that leaves a major third to C5.” | A♭4; “You made a minor sixth above C4.” |

Use two bracket segments: reference to answer, then answer to octave. Play
both segments upward. Explicitly identify the interval being named from the
original reference to the answer. The shorter remaining gap is a checking
strategy; formal interval inversion does not need to be introduced here.

Suggested final block:

| Task | Prompt and setup | Answer |
| --- | --- | --- |
| Build | Minor 6th above D4 | B♭4 |
| Name | C4–A4 | Major 6th |
| Correct | C4–B4 should be a minor 7th; replace the upper note | B♭4 |
| Build | Major 7th above F4 | E5 |
| Build | Octave above D4 | D5 |
| Review | Model C4–G4; reproduce the same distance above E4 | B4, perfect 5th |

Proposed closing line: “You can build wide intervals and use the octave to
check their distances.”

## How the questions avoid repetition

| Question form | What the learner has to work out | Interaction |
| --- | --- | --- |
| Build | Interval name → distance → upper pitch | Existing note placement |
| Name or choose | Visible pair → distance or comparison → interval name | Select a label or pair with pointer/keyboard |
| Change or correct | Current interval → requested interval → replacement pitch | Keep the lower note and replace the upper note using placement |
| Match from a new start | Model distance → new upper pitch | Model remains visible beside the placement area |
| Leave a gap to the octave | Given small gap → position inside an octave → wide interval | Existing placement plus octave and distance brackets |

Give each lesson its distinctive activity before the mixed block. A final
block should use a familiar order of actions with varied musical questions,
not introduce another new control scheme.

Choose references deliberately: mix naturals and accidentals, cross octave
boundaries, and sometimes share an upper pitch between two examples. Start
comparisons on the same lower pitch, then vary it once the relationship is
understood. Keep a fixed authored question order for the first draft; vary
choice positions without making Inspector replay nondeterministic.

Avoid defining major as happy, minor as sad, or a tritone as inherently wrong.
Optional listening extensions can ask which of two ascending examples has
the larger distance, or which reproduces a model from another starting pitch.
Provide replay and a reveal-grid option. These are extensions, not required
listening-only gates in the initial draft.

## Implementation notes

`src/harmonyIntervals.ts` owns the authored curriculum and the exact chart
entries present at each Section's start. Lessons 3.1–3.3 use the existing
`PitchLesson13Scene` / `PitchLesson13Section` player and shared lesson-kit
controls. Lesson 1.3 retains its directional questions and column-order
playback.

Model questions keep the model visible; correction questions keep their
reference fixed; octave questions retain the octave marker and show the two
distance brackets after placement. Named-choice and pair-choice questions
support keyboard buttons and separate replay controls. Recognition questions
do not pre-highlight their answer in the chart.

The full table stays below the fixed avatar. It uses compact rows after eight
entries and an independently scrollable, keyboard-focusable reference region
when the available screen height cannot contain it. All earlier entries stay
in that same table.

Focused non-visual tests live in `tests/harmonyIntervals.test.ts` and cover
registration, answer spelling and pitch bounds, ascending-only placement and
playback, chart reveal order, question context restoration, choice retries,
replay, and Inspector feedback branches. Browser appearance and audio are
left for inspection in the already-running Hub at
`/amateur-music-theory/#/lesson/3.1`, `#/lesson/3.2`, and `#/lesson/3.3`.

- Reuse the lesson-kit grid, notes, brackets, speech, question lifecycle,
  pacing, and completion. Two basic answer mechanisms are sufficient:
  placing/replacing a note and selecting a named choice or displayed pair.
- Extend the interval model with explicit interval identity, chromatic
  distance, and authored answer spelling. The current answer helper always
  chooses an adjacent letter and cannot be reused unchanged for larger
  intervals. Check pitch distance for placement; do not make learners choose
  an enharmonic spelling through a control they do not have.
- Store taught chart entries explicitly rather than as a highest distance.
  Lesson 3.2 introduces 7 before 6; Lesson 3.3 introduces 12 before 8–11.
  Retain all earlier entries in the same visible table beneath Grammy,
  following the confirmed cumulative-table specification above. Account for
  the full thirteen-row height in the layout.
- Use the existing A3–A5 chromatic viewport for this draft. All supplied
  references, answers, and octave markers fit. Keep enough room above the
  reference for the largest target; do not shrink note sizes unnecessarily.
- Keep model notes, fixed reference notes, candidate pairs, and octave markers
  distinct in state. Checkpoints must restore the model and any earlier
  accepted answers as well as the active prompt.
- For successive playback, implement the stated lower-to-higher rule for
  these lessons. Replay separate pairs with a pause between them; transitions
  between reference pitches are not additional interval questions.
- Validate distance/spelling, ascending-only correctness, chart reveals,
  retries, and checkpoint restoration with focused non-visual tests and
  package typechecking when changing the interval player or curriculum.

The cumulative table is a confirmed requirement; the sequences and activity
mix above now form the first playable draft. Musical distance
and quality references establish the terminology, not evidence that this
particular lesson order has been tested with learners.
