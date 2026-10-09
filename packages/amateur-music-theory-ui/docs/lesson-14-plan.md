# Lesson 1.4 — Building the Diatonic Scale

Implemented curriculum with the user's confirmed interaction choices.
The portal registers Lesson 1.4 and its eight playable Sections. Its
sequence and checkpoint restoration live in `src/lesson14Scale.ts`;
`PitchLesson14Section.svelte` supplies the shared-grid interactions.

## Teaching language

Use “pitches” for distance, consistent with Lesson 1.3. Introduce the scale
through C–D–E–F–G–A–B–C, including C in the next octave from 1.4.1.c. Explain that the
upper C repeats the first note rather than adding an eighth distinct note.

Specify that major 2nds and minor 2nds are the intervals **between
neighbouring notes** of the diatonic scale. Other intervals exist between
notes farther apart. The requested +2, +2, +1, +2, +2, +2, +1 sequence is
the major form of a diatonic scale; modes need not be introduced here.

## Sections and Segments

| Section | Name | Segments |
| --- | --- | --- |
| 1.4.1 | What Is a Scale? | Start with an empty grid. a: “A scale, put simply, is a group of notes.” b: “There are many scales throughout human culture.” c: Slide C4–C5 on from the left with “The Diatonic Scale is a foundation of Western music.” Retain the last two bubbles while the first floats up and disappears. |
| 1.4.2 | Seven Notes, Repeating | Keep C4 through C5 from 1.4.1. Shift the grid upward, then expose its lower rows down to C3. a: “The diatonic scale has seven unique pitches in an octave, with an eighth pitch completing the octave.” b: Show an octave bracket from C4 to the existing C5: the upper C repeats the first note. c: “It repeats the same way in every octave.” Demonstrate C3–C4 below C4–C5, with both ending Cs visible. |
| 1.4.3 | Two Interval Sizes | a: “Between neighbouring notes in the diatonic scale, there are two kinds of interval: major seconds and minor seconds.” b: Sound C4–D4 and show its distance of two pitches. c: Sound E4–F4 and show its distance of one pitch. |
| 1.4.4 | Find the Major 2nds | a: “Click on two notes that are a major second apart.” Accept the first correct pair. b: “Find the rest.” Continue until all five pairs have been found. c: Play the five found pairs before continuing. |
| 1.4.5 | Find the Minor 2nds | a: “Click on two notes that are a minor second apart.” Accept either correct pair first. b: “Find the last pair.” c: Play both found pairs before continuing. |
| 1.4.6 | The Interval Pattern | a: “The interval pattern for this diatonic scale is plus two, plus two, plus one, plus two, plus two, plus two, plus one.” Show +2, +2, +1, +2, +2, +2, +1 beneath Grammy. b: Play C4 through C5, highlighting each interval in the pattern as it sounds. |
| 1.4.7 | Build from C | a: “Let’s build a diatonic scale from C.” Clear the demonstration notes and place C4. b–h: Ask for each next note, keeping every correctly placed note visible. i: Play the completed scale, then “You did it! You built a diatonic scale!” |
| 1.4.8 | Build from F | a: Move the grid down, then expand upward to F5. Replace the completed C scale with F4 and say “Using the interval pattern, create a Diatonic Scale starting on F.” b–h: Build F–G–A–B♭–C–D–E–F using the same highlighted columns and interval pattern. i: Replay the completed scale and celebrate. |

Use Sub-Segments for setup, narration, listening, input, and conditional
retry where those actions need separate Inspector checkpoints. Sections
use numeric codes, Segments use letters, and Sub-Segments use final numbers.

The opening has narration only until the third bubble introduces the diatonic
notes; it has no example playback. Keep at most two resting speech bubbles:
the first rises above the second, then floats upward and fades out as the third
arrives. Bubble animations pause with the lesson and respect reduced motion.
Inspector seeks restore the preceding bubble without speaking skipped text.

Sections 1.4.1 and 1.4.2 share one mounted avatar and grid. Render the complete
C3–C5 canvas from the start, crop it initially to A3–C5, then shift that crop up
over 650 ms and expand its bottom over 900 ms. Preserve cell size, note identity,
and note positions relative to the grid. Pause freezes both phases; restart or
seek cancels pending motion. Entering 1.4.2 directly restores the expanded grid.

Sections 1.4.3–1.4.7 show C4–C5. Hide octave numbers from their legend and
note labels; keep canonical pitches for placement, colour, and audio.
Sections 1.4.7 and 1.4.8 share one mounted avatar and grid. Keep a fixed
C4–F5 canvas cropped to C4–C5 during the C exercise. On entering 1.4.8,
move that crop down over 650 ms, then reveal the five rows above C5 over
900 ms. Keep cell size and the lower edge fixed during expansion. Preserve
the C notes through the motion, then show the starting F. Pause freezes both
phases; restart and seeks cancel pending motion. Seeks beyond the expansion
restore C4–F5 immediately. Reduced motion shows the final range immediately.
The F exercise also uses unnumbered legend and note labels.

## Pair-finding exercises

For the one-octave C4–C5 display:

- Major 2nds: C4–D4, D4–E4, F4–G4, G4–A4, A4–B4.
- Minor 2nds: E4–F4, B4–C5.

Allow either note to be selected first. The second selected note completes
the attempted pair. Sound that pair and give “Correct!” or “Try again.”
In 1.4.4, each clicked note also sounds immediately. Commit correct pairs
and clear their selection immediately so the learner can select the next pair
during the preceding pair's playback. Queue correct-pair playback in answer
order and preserve any new selection while prior feedback finishes. Open
“Find the rest” immediately after the first pair, with its narration following
the prior feedback. Wait for all queued correct feedback before the final
replay; pause and checkpoint changes retain their existing cancellation rules.
Duplicate correct pairs do not count again. Permit a found note to belong
to another pair; for example, D4 belongs to both C4–D4 and D4–E4.

Keep a visible connection/bracket for each confirmed
pair, with its distance (+2 or +1). Double the numeric bracket label font size
in both dimensions while retaining the octave label size. This marks intervals rather than
recolouring their notes. Keep confirmed intervals visible when moving
from the major-2nd search to the minor-2nd search, then assemble the complete
pattern in 1.4.6.

## Building prompts

| Segment | Prompt | Answer |
| --- | --- | --- |
| 1.4.7.b | “Place a note a major second above C4.” | D4 |
| 1.4.7.c | “Place a note a major second above D4.” | E4 |
| 1.4.7.d | “Place a note a minor second above E4.” | F4 |
| 1.4.7.e | “Place a note a major second above F4.” | G4 |
| 1.4.7.f | “Place a note a major second above G4.” | A4 |
| 1.4.7.g | “Place a note a major second above A4.” | B4 |
| 1.4.7.h | “Place a note a minor second above B4.” | C5 |
| 1.4.8.b | “Place a note a major second above F.” | G4 |
| 1.4.8.c | “Place a note a major second above G.” | A4 |
| 1.4.8.d | “Place a note a minor second above A.” | B♭4 |
| 1.4.8.e | “Place a note a major second above B♭.” | C5 |
| 1.4.8.f | “Place a note a major second above C.” | D5 |
| 1.4.8.g | “Place a note a major second above D.” | E5 |
| 1.4.8.h | “Place a note a minor second above E.” | F5 |

Highlight the current distance in the pattern. Keep all earlier answers
visible; a retry affects only the latest attempted note. Identify the final
C or F as the first note repeated one octave higher. Replay the complete scale
before Grammy’s final celebration.

Require the next musical column for each answer. Highlight that column
without revealing the target pitch, and show a short instruction to build
from left to right. Both pitch and column determine correctness here;
a correct pitch in another column receives a retry. Keep earlier accepted
notes fixed and advance the target column only after a correct answer.
Fit the grid so the eight note positions have room for the standardized
note diameter. Preserve pointer and keyboard input and immediate answers.

The introduction shows A3–C5. The repetition demonstration shows C3–C4
alongside C4–C5. Sections 1.4.3–1.4.7 use C4–C5, and 1.4.8 extends to C4–F5.
On Inspector jumps, completed earlier questions are reconstructed as
accepted notes and marked pairs. Jumps into retry/correct branches first
restore their question, then demonstrate that feedback branch.

## Existing lesson conventions to carry forward

- Start immediately using the existing lesson/audio activation flow.
- Keep Grammy vertically centred, with the pattern beneath him.
- Use shared note appearance and each exact pitch’s colour from pitch data.
- Hide accidental text in the PitchGrid legend throughout 1.4 while keeping
  the accidental rows and their coloured cells.
- Accept answers during question narration; an answer interrupts the prompt.
- Grammy rests in his thinking pose after asking, until the learner answers.
- Use the shared pitch grid, octave/distance brackets, audio, and Inspector.
- Retain pause/resume and restore visible notes and found pairs when seeking.

## Confirmed interaction choices

1. Pair-finding uses one octave, C4–C5, including the upper C. The repetition
   demonstration in 1.4.2 is separate.
2. Every confirmed pair remains marked.
3. Scale building requires the next column, forming an ascending scale
   from left to right.
