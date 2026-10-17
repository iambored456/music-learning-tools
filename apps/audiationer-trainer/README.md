# Audiationer Trainer

A browser-native functional ear trainer inspired by [MyPitch](https://github.com/SaverinOnRails/MyPitch).
This is a new TypeScript/Web Audio implementation for Music Learning Tools, not an embedded .NET build.
No upstream C# code, soundfonts, speech recordings, or binary assets are bundled.

## Modes

| MyPitch | Audiationer Trainer |
| --- | --- |
| Freeplay | Freeplay |
| Interactive | Degrees |
| Melody | Melody |
| Diatonics | Chords |
| — | Chord Progressions |
| Pocketmode | Pocket mode |
| ChordQuality | Chord Quality |
| Cycle | Cycle |

Includes selected degrees/qualities, all seven diatonic modes, tonic and octave controls,
random tonic/octave, a context cadence, tonic drone, optional resolutions,
repeat, melody answer undo, configurable session length, results by answer, and JSON result export.
Settings, custom presets, and earned difficulty gems are saved locally. Detailed results last until the next session or screen change; they can be exported as JSON.
Chords identifies one diatonic triad by Roman numeral. Chord Progressions plays a random
sequence from the same level's chord pool and asks for its Roman numerals in order. It
defaults to three chords, with a separate progression-length setting from two to eight.
Both chord exercises use only roots belonging to the selected diatonic scale. Melody can
include selected chromatic degrees. Chord Quality identifies triad/seventh quality.

## Screens and presets

The landing page's Pitch button opens Degrees & Melody, and its Chords button opens
Chords & Chord Progressions.
Each pair shares level cards with separate exercise buttons and progress gems. The top
difficulty selector applies to either exercise. Preset pages have Levels / Challenges /
Custom tabs, and scored modes have three difficulty levels:
Novice (untimed), Adept (5 seconds), and Master (2 seconds). The answer clock starts after
playback and covers the entire melody or chord-progression answer. A complete ordered
sequence counts as one question. Replaying a question restarts that clock. Timeouts count
as incorrect answers and follow the selected answer-review policy.
Compass exploration and sequence replay during review play over the continuous tonic
drone. Moving to the next question keeps the drone running; ending or leaving a session
stops it.
Major Degrees and Melody establish each new tonic with 1–3–5–4–2–7–1 in eighth notes
at the tonicization BPM, with the leading tone below the final tonic. The final note
of every tonicization phrase lasts twice as long. Tonicization defaults to 60 BPM. Other
exercises and scales retain the 1–4–5–1 context phrase.
Choosing any Degrees or Melody level, including a custom level, enables random question
registers across octaves 3, 4, and 5. Each melody uses one register throughout; question
replays and answer review retain that question's selected octave.

## Timing timeline

Every mode's settings contain a vertical timing timeline. Drag a segment's lower handle
to adjust its duration, or enter a numeric value. Tonicization has its own BPM; other
durations and gaps use seconds. Question sounds share a duration and inter-sound gap.
Keyboard arrows adjust a focused handle; Shift makes larger changes, and Home/End select
its limits. Event order stays fixed.

Correct/incorrect answer and key-change views show the relevant conditional stages.
The difficulty answer limit is displayed without changing its scoring rules. Manual
answer/review waits remain open-ended. Auto-continue starts after feedback audio finishes,
then uses its configured delay; a separate gap precedes the next question. Pocket has
repeat, thinking, spoken-answer and replay gaps. Free Play has tap-duration and Cycle
note/gap views. Held and sustained notes still last until the user releases or stops them.

Play preview auditions one sample cycle without recording answers or gems. It uses the
full difficulty answer limit and 1.5 seconds for manual waits, and stops when settings
change or the settings panel closes. Each mode remembers its own timing and review
choices; custom presets include their timing profiles. Existing note-spacing, Pocket
wait and auto-continue saves supply the initial values until a mode is edited.
Reset timing restores that mode's initial timing values.

The Major Levels introduce degrees gradually; modal challenges cover all seven
diatonic modes. Chord Quality has its own triad and seventh-chord collections. Chords and
Chord Progressions omit the chromatic Major VII level because their roots must belong to
a single diatonic scale. Existing Chords saves and gems remain attached to single-chord
questions; Chord Progressions earns separate gems. Pocket Mode also supports both exercises.
Custom presets can be created, edited, and deleted. The selected difficulty on the Presets screen applies to built-in and custom presets alike. Changing a saved preset's settings
clears its earned gems; renaming it preserves them. Custom presets remain freely accessible.
A completed scored session with at least 80% accuracy earns its difficulty rank, and easier
sessions do not erase a higher rank. Listening modes do not award accuracy gems.

Each built-in Levels and Challenges list starts with its first card available. Earn a gem
at any difficulty in the preceding card to unlock the next one. Degrees/Melody and
Chords/Chord Progressions share card access while retaining separate earned gems. Completed
cards from older saves remain playable. Locked cards are grayed out, show their prerequisite,
and cannot be selected or reached through Next Level until unlocked. Lists progress
independently: Major, Minor, Chromatic, Modes, Other Scales, Tricky, and the other challenge
lists each have their own starting card.

Scored-mode settings include Unlock all levels and Reset Level Lock. The override covers
all built-in levels and challenges across all game modes and persists across reloads;
resetting restores gem-based locks without removing any earned gems. Lock preferences
are stored separately from custom presets and progress. Listening modes have no locks.

Scored sessions finish on one results page with the score, earned gem, continuation
actions, and an answer breakdown that starts expanded. The breakdown has one table row
per question, in played order, with its key, tonic octave, correct answer, submitted
answer, result, and response time. Each result captures its own key and octave, so later
key changes and review exploration leave the original question context intact.
Home and settings remain in the header. On the results page, Home returns to the current
mode's level selection. Play again uses the current settings; Change difficulty expands the same
difficulty card used on level selection and applies to the next game. Settings and
difficulty changes leave the completed score and earned gem unchanged. Next Level
advances in the same exercise through the displayed level and challenge order,
or through the saved custom levels. At the end of a collection (or after unsaved custom
practice), it returns to level selection. Finish game also returns to level selection.

The practice screen retains the original **Fifths** and **Chromatic** wheel visualizations.
**Minimal** is a third, sparse circle-of-fifths view with degree dots and labels. All three
use the shared Compass pitch mapping and colours. Existing users keep their wheel arrangement.
The centre play control starts or replays practice. In Free Play it starts the tonic drone
or stops all sounding notes and the drone. Free Play also has octave steps and a Random key button.

Free Play supports dragging between notes with mouse, pen, or touch in either wheel view.
The held note follows the pointer around the ring; releasing a drag sustains its final note.
Clicking a sustained degree stops it. Crossing the top seam clockwise raises the octave,
and crossing back lowers it, within the existing 3–6 range. In Chromatic view this is the
7 → 1 / 1 → 7 transition. The octave indicator and saved setting follow the gesture.
Leaving the note ring interrupts octave tracking, so a drag through the centre or outside
the wheel cannot carry an accidental octave change on re-entry. Dragging preserves other
sustained notes; octave changes transpose active notes without stopping the drone.

The preset mode pill centers its title between the trainer Home button and settings gear.
Paired pages provide settings for each exercise. Degrees/chords to practice, Scale, and All
remain inside a dropdown. Opening practice settings stops current playback. Dark mode is
the default.
Routes use local URL fragments, so browser Back works on a static-hosted Hub.

## Shared Compass functionality

`@mlt/compass-core` owns the original Diatonic Compass pitch names, mode intervals,
degree colours, contrast helper, and wheel sector geometry. The existing Compass consumes
these through compatibility exports and a Canvas adapter. The trainer uses the same data
and geometry through an accessible SVG adapter, with fifths or chromatic ordering.
The Compass's coupled ring dragging and global application state stay in its own UI package.

`@mlt/audiationer-trainer-core` owns music and session logic with injectable audio, clocks,
and random generation. `@mlt/audiationer-trainer-ui` owns the Svelte 5 UI and Web Audio backend.
The standalone app and Hub route are thin mount shells.

## Deliberate browser differences

- Uses local triangle-wave synthesis and a sine drone rather than MyPitch's FluidSynth soundfonts.
- Pocket mode uses browser speech synthesis; the available voice and background playback depend on the browser.
- Melody generation favours nearby selected notes; it is not a byte-for-byte port of the original generator.
- Provides raw accuracy, response time, and confusion summaries rather than the original familiarity formula.
- Does not include the upstream disabled Folk mode or desktop installer features.

## Development and validation

Use the normal running Hub at `/audiationer-trainer/`. Do not start a second development server.

```sh
pnpm --filter @mlt/audiationer-trainer-core test
pnpm --filter @mlt/audiationer-trainer-core typecheck
pnpm --filter @mlt/audiationer-trainer-ui typecheck
pnpm --filter @mlt/compass-core typecheck
node scripts/check-deps.js
node scripts/check-app-shells.js
```

Manual checks in the running Hub, at desktop and phone widths (about 390px):
landing mode choices; Presets mode selector and Path/Challenges/Custom tabs; difficulty gems;
create/edit/delete a custom preset and reload; browser Back; theme toggle and reload;
all three wheel views (the first two should retain the original two-ring design);
both paired pages and their separate gems; start/stop/restart during playback; wrong answers and replay;
melody/progression undo and lengths; mode/degree selections; wheel keyboard interaction; drone volume;
Pocket mode speech; narrow screens; and Diatonic Compass rotation/colours after extraction.
