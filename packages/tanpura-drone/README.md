# @mlt/tanpura-drone

Tanpura drone assets, preset utilities, and Web Audio playback for Music Learning Tools.

`TanpuraDrone` provides Audiation Trainer with the sample, six-string preset, filtering,
and modulation used by Singing Trainer. Pass an existing, user-unlocked `AudioContext`
and an output node, await `prepare()`, then call `set(rootMidi, volume)` to play or retune.
`set(null, 0)` stops playback; `dispose()` also discards the decoded sample. Loading
and constructing the engine never starts playback. Volume is linear from 0 to 1.

## Source provenance

- Extracted from `https://github.com/aravind-sadharani/puretones-music-room`
- Verified at commit `b08fa67a947a057a254af6b5aaa5922c58d7dedd`
- Includes:
  - `static/Samples/01-Tanpura-Sample.mp3`
  - default drone `.prt` snapshot structure (`src/data/default.prt`)
  - parser model adapted from `src/utils/dspsettingsinterpreter.js`
  - modular global + per-string tuning-behavior mapping for UI controls and audio shaping

## License note

As of February 19, 2026, the upstream repository did not contain a `LICENSE` file.
Treat these extracted assets as "permission required for redistribution" until explicit upstream licensing is confirmed.
