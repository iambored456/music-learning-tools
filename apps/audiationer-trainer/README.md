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
| Pocketmode | Pocket mode |
| ChordQuality | Chord Quality |
| Cycle | Cycle |

Includes selected degrees/qualities, all seven diatonic modes, tonic and octave controls,
random tonic/octave, a 1–4–5–1 context cadence, tonic drone, optional resolutions,
repeat, melody answer undo, configurable session length, results by answer, and JSON result export.
Settings, custom presets, and earned difficulty gems are saved locally. Detailed results last until the next session or screen change; they can be exported as JSON.
Chords identifies diatonic triads by Roman numeral. Chord Quality identifies triad/seventh quality.
Melody and Chords use only selected degrees belonging to the chosen mode.

## Screens and presets

The landing page offers all seven modes. Each mode has a preset screen with a mode selector,
The Path / Challenges / Custom tabs, and scored modes have three difficulty levels:
Novice (untimed), Adept (5 seconds), and Master (2 seconds). The answer clock starts after
playback and covers the entire melody answer. Replaying a question restarts that clock.
Timeouts count as incorrect answers and replay the target before advancing.

The Sun path introduces degrees gradually; modal challenges cover all seven diatonic modes.
Chord Quality has its own triad and seventh-chord collections. Melody and Chords omit the
chromatic Sun 7 preset because their answer pools must belong to a single diatonic scale.
Custom presets can be created, edited, and deleted. The selected difficulty on the Presets screen applies to built-in and custom presets alike. Changing a saved preset's settings
clears its earned gems; renaming it preserves them. All presets are available without locks.
A completed scored session with at least 80% accuracy earns its difficulty rank, and easier
sessions do not erase a higher rank. Listening modes do not award accuracy gems.

The practice screen retains the original **Fifths** and **Chromatic** wheel visualizations.
**Minimal** is a third, sparse circle-of-fifths view with degree dots and labels. All three
use the shared Compass pitch mapping and colours. Existing users keep their wheel arrangement.
The centre play control starts or replays practice; in Freeplay it plays the cadence after
starting. Freeplay also has octave steps and a Random key button.

The monorepo Home and gear icons remain together. The gear opens appearance settings;
the sliders button opens the practice settings dialog. Degrees to practice, Scale, and All
remain inside a dropdown. Applying practice settings prepares a fresh session; opening
that editor stops current playback. Dark mode is the default, with saved light mode respected.
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
all seven modes; start/stop/restart during playback; wrong answers and replay;
melody undo; mode/degree selections; wheel keyboard interaction; drone volume;
Pocket mode speech; narrow screens; and Diatonic Compass rotation/colours after extraction.
