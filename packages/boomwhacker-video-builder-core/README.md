# Boomwhacker timing

New projects require an audio file and a MIDI tempo map. MIDI note events are ignored;
the user places the Boomwhacker arrangement manually in the UI package.
Preview and video export use the original uploaded audio, with optional
Boomwhacker synthesis mixed in.
The editor's Metronome toggle adds diagnostic clicks at the current beat-map
timestamps, with accents only on user-designated downbeats. It defaults off and
has a separate volume control. While enabled, decoded source audio and clicks
share one Web Audio clock; click scheduling uses a short lookahead independent of
animation frames. Pausing and seeking cancel pending clicks. The metronome is a
preview setting and does not add diagnostic clicks to exported videos.

`importMidiTiming` reads standard MIDI format 0/1 files with PPQ timing, integrates
tempo changes, and creates editable beat boundaries. One beat is a time-signature
denominator unit (a quarter in 4/4, an eighth in 6/8). The last boundary completes
the last beat containing the MIDI endpoint. Subdivisions interpolate within each
editable beat interval. Files with changing time signatures, SMPTE timing, or no
tempo map are rejected with an explanation.

`beatTimesSec` includes a final endpoint. `withBeatTimes` recalculates the cached
beat count, first-beat offset, and initial beat rate. The initial interval also
sets the count-in rate; it is not used to time subsequent musical beats.
The four-beat count-in and one-beat silent lead-in are independent opt-in
settings in Project Setup's Playback settings. Both default to off, including
when loading projects that predate these explicit switches. Preview and export
use the same derived lead-in duration without shifting the musical beat map.

Notes persist as grid slot indices. Moving boundaries adjusts note times without
changing their musical positions. `shiftBeatTimes` applies one clamped delta to
the selection, preserving group spacing and preventing boundary crossings.

No downbeats are inferred on import. After the user sets `firstDownbeatIndex`,
measure guides begin there and repeat every `timeSignatureNumerator` beats.
Earlier beats remain unnumbered. Preview and video export use the same derived
timing and guide data. Grid subdivision uses the project's stored setting.
The highway uses one gold hit line for the current song time. Note symbols are
centered within their occupied grid spans; this visual centering does not change
their scheduled audio onset, beat timestamps, or metronome clicks. Editor and
export share the same time-position and note-layout functions. Pausing or seeking
shows the hit line at the selected playback time.
Toolbar playback keeps the editor layout, highway zoom, and waveform height.
Both timelines follow the same song clock. The highway scrolls with its gold line
24% from the left of the playback viewport, keeping upcoming notes visible. The
red waveform cursor advances across its view and the waveform scrolls when the
cursor approaches the edge.

Schema 6 has no legacy project migration. On the first load of the updated UI,
the app removes older app-specific autosaves and resets its old IndexedDB audio
store. Downloaded project files are not deleted; older schemas cannot be loaded.

Run focused tests from the repository root:

```sh
node packages/boomwhacker-video-builder-core/tests/run-tests.mjs
node packages/boomwhacker-video-builder-ui/tests/run-tests.mjs
```

Optionally set `BVB_TEST_MIDI` to the provided EETV Dr. Rubato MIDI path to also run
the sample regression. The runner uses the existing tsx/esbuild installation to
bundle workspace sources into a temporary file, then runs Node's test runner.
