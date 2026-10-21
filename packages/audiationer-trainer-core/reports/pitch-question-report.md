# Audiation Trainer: Pitch question report

> Historical audit of the previous generator. Multi-octave Melody support now supersedes its range findings; see [the implemented Major I–III melody libraries and enumerations](major-i-iii-melody-enumerations.md).

Audited 20 October 2026. Scope: the Pitch page (Degrees and Melody), all 19 built-in Levels and 29 Challenges, plus the shared generator used by custom presets and Pocket Melody. Application behavior was not changed.

## Finding

**E4–C4–E3 cannot be generated in C at any Pitch level, even with Question Range set to 2 or 3 octaves.** Major I already includes the required pitch classes, C and E. The missing capability is changing octave register within a melody.

There is no fixed question bank. Questions are generated at runtime from each preset’s selected degrees. Every melody note receives the same tonic register; only chord progressions currently select registers independently for later items.

For example, the answer degrees 3–1–3 can play as E3–C3–E3, E4–C4–E4, or E5–C5–E5 when their respective registers are enabled. E4–C4–E3 and E3–C4–E4 are impossible.

## What Question Range actually controls

| Setting | Available tonic registers | Full C-major pitch pool across questions | Within one melody |
| --- | --- | --- | --- |
| 1 octave | 4 | C4 D4 E4 F4 G4 A4 B4 | Uses only register 4 |
| 2 octaves | 3, 4 | C3…B3 and C4…B4 | Uses only register 3 or only register 4 |
| 3 octaves | 3, 4, 5 | C3…B3, C4…B4, C5…B5 | Uses only one of those registers |

The register is selected afresh for each question. Levels preserve the selected range; advancing to a higher level does not itself increase it. The default is 1 octave. Time limits affect difficulty awards and answering time, not the generated note vocabulary or register behavior.

All selected degree offsets are between 0 and 11 semitones. Consequently no Pitch question can contain an octave leap, a larger leap, or a total melodic span of 12 semitones or more. Even adjacent notes straddling the tonic boundary, such as B3–C4 in C major, are excluded. The upper tonic C5 is also absent from a register-4 C-major melody.

Registers are relative to the tonic. In keys other than C, a melody can cross the scientific note-name C boundary while remaining within its tonic-to-tonic band; that is different from using two tonic registers.

## Inventory of all Pitch Levels

Notes below use C as tonic, including C minor for Minor levels. All levels are transposed when the key changes. “3-note sequences” counts distinct ordered degree sequences in one register, including repetitions, at the default melody length of 3. It describes possibilities, not a stored bank or equal selection probabilities. Maximum span is highest minus lowest available pitch, in semitones.

| Level | Degrees | Notes with C tonic | Notes per register | Maximum span | 3-note sequences |
| --- | --- | --- | ---: | ---: | ---: |
| Major I | 1 3 | C E | 2 | 4 | 8 |
| Major II | 1 3 5 | C E G | 3 | 7 | 27 |
| Major III | 1 2 3 5 | C D E G | 4 | 7 | 64 |
| Major IV | 1 2 3 5 6 | C D E G A | 5 | 9 | 125 |
| Major V | 1 2 3 5 6 7 | C D E G A B | 6 | 11 | 216 |
| Major VI | 1 2 3 4 5 6 7 | C D E F G A B | 7 | 11 | 343 |
| Major VII | 1 2 3 4 ♯4 5 6 7 | C D E F F♯ G A B | 8 | 11 | 512 |
| Minor I | 1 ♭3 | C E♭ | 2 | 3 | 8 |
| Minor II | 1 ♭3 5 | C E♭ G | 3 | 7 | 27 |
| Minor III | 1 2 ♭3 5 | C D E♭ G | 4 | 7 | 64 |
| Minor IV | 1 2 ♭3 5 ♭6 | C D E♭ G A♭ | 5 | 8 | 125 |
| Minor V | 1 2 ♭3 5 ♭6 ♭7 | C D E♭ G A♭ B♭ | 6 | 10 | 216 |
| Minor VI | 1 2 ♭3 4 5 ♭6 ♭7 | C D E♭ F G A♭ B♭ | 7 | 10 | 343 |
| Minor VII | 1 ♭2 2 ♭3 4 5 ♭6 ♭7 | C D♭ D E♭ F G A♭ B♭ | 8 | 10 | 512 |
| Chromatic I | 1 ♭3 3 5 | C E♭ E G | 4 | 7 | 64 |
| Chromatic II | 1 ♭2 2 ♭3 3 5 | C D♭ D E♭ E G | 6 | 7 | 216 |
| Chromatic III | 1 ♭2 2 ♭3 3 5 ♭6 6 | C D♭ D E♭ E G A♭ A | 8 | 9 | 512 |
| Chromatic IV | 1 ♭2 2 ♭3 3 5 ♭6 6 ♭7 7 | C D♭ D E♭ E G A♭ A B♭ B | 10 | 11 | 1,000 |
| Chromatic V | 1 ♭2 2 ♭3 3 4 ♯4 5 ♭6 6 ♭7 7 | C D♭ D E♭ E F F♯ G A♭ A B♭ B | 12 | 11 | 1,728 |

Every row has **zero possible melodies using more than one tonic register**, at every Question Range setting. Major VII adds ♯4 to the full major scale; Minor VII adds ♭2 to the full natural minor scale. They are intentionally broader pitch vocabularies than strict major or natural minor.

## Inventory of Pitch Challenges

These all have the same register restriction. The “Chords” challenge category on the Pitch page selects chord-tone vocabularies for single-note Degrees or sequential Melody questions; it does not switch Pitch to simultaneous chord questions.

### Modes

| Challenge | Degrees | Notes with C tonic | Notes per register | Maximum span | 3-note sequences |
| --- | --- | --- | ---: | ---: | ---: |
| Major | 1 2 3 4 5 6 7 | C D E F G A B | 7 | 11 | 343 |
| Minor | 1 2 ♭3 4 5 ♭6 ♭7 | C D E♭ F G A♭ B♭ | 7 | 10 | 343 |
| ② Dorian | 1 2 ♭3 4 5 6 ♭7 | C D E♭ F G A B♭ | 7 | 10 | 343 |
| ③ Phrygian | 1 ♭2 ♭3 4 5 ♭6 ♭7 | C D♭ E♭ F G A♭ B♭ | 7 | 10 | 343 |
| ④ Lydian | 1 2 3 ♯4 5 6 7 | C D E F♯ G A B | 7 | 11 | 343 |
| ⑤ Mixolydian | 1 2 3 4 5 6 ♭7 | C D E F G A B♭ | 7 | 10 | 343 |
| ⑦ Locrian | 1 ♭2 ♭3 4 ♭5 ♭6 ♭7 | C D♭ E♭ F G♭ A♭ B♭ | 7 | 10 | 343 |

### Other Scales

| Challenge | Degrees | Notes with C tonic | Notes per register | Maximum span | 3-note sequences |
| --- | --- | --- | ---: | ---: | ---: |
| Pentatonic | 1 2 3 5 6 | C D E G A | 5 | 9 | 125 |
| Minor Pentatonic | 1 ♭3 4 5 ♭7 | C E♭ F G B♭ | 5 | 10 | 125 |
| Melodic Minor | 1 2 ♭3 4 5 6 7 | C D E♭ F G A B | 7 | 11 | 343 |
| Harmonic Minor | 1 2 ♭3 4 5 ♭6 7 | C D E♭ F G A♭ B | 7 | 11 | 343 |
| Whole-Tone Scale | 1 2 3 ♯4 ♭6 ♭7 | C D E F♯ A♭ B♭ | 6 | 10 | 216 |
| Half-Whole Scale | 1 ♭2 ♭3 3 ♯4 5 6 ♭7 | C D♭ E♭ E F♯ G A B♭ | 8 | 10 | 512 |
| Chromatic | 1 ♭2 2 ♭3 3 4 ♯4 5 ♭6 6 ♭7 7 | C D♭ D E♭ E F F♯ G A♭ A B♭ B | 12 | 11 | 1,728 |

### Tricky

| Challenge | Degrees | Notes with C tonic | Notes per register | Maximum span | 3-note sequences |
| --- | --- | --- | ---: | ---: | ---: |
| Clean | 1 2 4 5 | C D F G | 4 | 7 | 64 |
| Threes and Sixes | ♭3 3 ♭6 6 | E♭ E A♭ A | 4 | 6 | 64 |
| Twos and Sevens | ♭2 2 ♭7 7 | D♭ D B♭ B | 4 | 10 | 64 |
| The Dark Side | ♭2 ♭3 ♯4 ♭6 ♭7 | D♭ E♭ F♯ A♭ B♭ | 5 | 9 | 125 |

### Oddball

| Challenge | Degrees | Notes with C tonic | Notes per register | Maximum span | 3-note sequences |
| --- | --- | --- | ---: | ---: | ---: |
| Bad Dream | ♭2 4 ♯4 6 | D♭ F F♯ A | 4 | 8 | 64 |
| Dimwit | 2 4 ♭6 7 | D F A♭ B | 4 | 9 | 64 |
| Cluster | 4 ♯4 5 ♭6 6 | F F♯ G A♭ A | 5 | 4 | 125 |

### Chords

| Challenge | Degrees | Notes with C tonic | Notes per register | Maximum span | 3-note sequences |
| --- | --- | --- | ---: | ---: | ---: |
| Major | 1 3 5 | C E G | 3 | 7 | 27 |
| Minor | 1 ♭3 5 | C E♭ G | 3 | 7 | 27 |
| maj6 | 1 3 5 6 | C E G A | 4 | 9 | 64 |
| m6 | 1 ♭3 5 6 | C E♭ G A | 4 | 9 | 64 |
| maj7 | 1 3 5 7 | C E G B | 4 | 11 | 64 |
| m7 | 1 ♭3 5 ♭7 | C E♭ G B♭ | 4 | 10 | 64 |
| 7 | 1 3 5 ♭7 | C E G B♭ | 4 | 10 | 64 |
| m(maj7) | 1 ♭3 5 7 | C E♭ G B | 4 | 11 | 64 |

Pitch spellings here identify pitch classes. The existing UI labels degree 6 as ♯4 except in Locrian, where it uses ♭5. In scales such as Whole-Tone, alternate enharmonic spellings may be more conventional.

## Coverage and selection bias

- Degrees questions choose one selected degree uniformly. A single-note question cannot itself cross registers; the gap concerns Melody questions.
- Melody starts with a uniformly selected degree. At each later note, if there are different selected degrees within 4 semitones of the previous degree, the generator chooses that nearby subset 70% of the time. Otherwise it chooses the full selected degree set. The remaining 30% also chooses the full set.
- All ordered degree sequences remain possible because the full-set branch includes every selected degree. Repeated notes are allowed, but receive less weight when nearby alternatives exist. There are no fixed motifs, guaranteed coverage, or duplicate-question prevention in this path.
- Example: in Major I, C and E are each other’s only nearby alternative. A change of note has probability 85% and a repeated note 15%. C–E–C and E–C–E together account for 72.25% of generated three-note degree sequences under ideal uniform randomness.
- The ordinary Melody length is configurable from 2 to 8, default 3. Pocket Melody uses the same register restriction, with a separately configured length of 1 to 5 and default 1.
- Scored sessions default to 10 questions, with a new random key every 5 questions. A session is a sample of the generator, not an exhaustive traversal of its possibilities.

For n selected degrees, length L, and r available registers, the current generator can produce **r × n^L** distinct pitched sequences in a fixed key. If every note could independently use any enabled register, the unrestricted pool would contain **(r × n)^L** sequences. This comparison measures structural availability, not a recommended distribution or a probability of receiving a particular question.

| Example, length 3 | Current sequences | All per-note register combinations | Excluded mixed-register sequences |
| --- | ---: | ---: | ---: |
| Major I, 2 registers | 16 | 64 | 48 |
| Full major (Major VI), 2 registers | 686 | 2,744 | 2,058 |
| Full major (Major VI), 3 registers | 1,029 | 9,261 | 8,232 |

For any three-note vocabulary, the current system provides 25% of all per-note register combinations at 2 registers and about 11.1% at 3 registers. The remaining 75% or 88.9% are mixed-register sequences. Counts must not be summed across presets because many vocabularies overlap.

## Implications for a future change

To include the example, 2- and 3-octave Melody generation would need to choose from actual pitches across the enabled registers and apply its nearby-note preference to actual semitone distances. This would allow boundary steps, register changes, and octave-displaced repetitions of the same degree. A 1-octave setting could retain its current range.

Answers currently identify degrees only: E4–C4–E3 would still be answered 3–1–3. Per-note registers would need to survive repeats, correct-answer replay, comparison playback, and result capture. The engine already has a per-item register array for chord progressions, but Melody fills it with the same register, and only chord-progression results currently store that array. Existing tests explicitly assert that Melody stays within one register, so they would need to be updated to reflect the new intended behavior.

## Evidence and validation

- [Preset definitions](../src/presets.ts): `sun`, `moon`, `union`, `pathPresetGroups`, `challengePresetGroups`, and `applyPreset` define the inventory and preserve range selection.
- [Generator](../src/music.ts): `melody` selects only degree offsets and implements the 70% nearby-note preference; `midiNote` converts tonic, register, and degree to MIDI.
- [Settings](../src/settings.ts): `questionOctaves`, `DEFAULT_SETTINGS`, `normalizeSettings`, and `questionLength` define ranges, defaults, and lengths.
- [Session](../src/session.ts): `createQuestion`, `prepareQuestion`, `prepare`, `playQuestion`, and `finishAnswer` establish register selection, playback, and scoring.
- [Octave tests](../tests/octaves.test.ts): the test named “questions choose all three registers while repeats, melody notes and review stay in the chosen octave” explicitly checks the existing behavior.
- [Pitch page mapping](../../audiationer-trainer-ui/src/modePairs.ts) and [range controls](../../audiationer-trainer-ui/src/DifficultyCard.svelte) connect these rules to the displayed Pitch page.

Validation performed:

1. Imported the live TypeScript preset definitions with `pnpm exec tsx --input-type=module` to enumerate all 19 Levels and 29 Challenges and calculate the tables.
2. Ran `pnpm exec tsx --test packages/audiationer-trainer-core/tests/octaves.test.ts`: all 3 tests passed.
3. Ran a deterministic `TrainerSession` audio-mock reproduction for Question Range 1, 2, and 3, selecting C major, degrees C/E, and the degree pattern E–C–E. All three produced MIDI 64–60–64 (E4–C4–E4), confirming that the wider settings do not independently select the last note’s register.

No development server, browser automation, preview capture, or build was run. Git status was unavailable because Git reported dubious repository ownership; no Git configuration was changed.
