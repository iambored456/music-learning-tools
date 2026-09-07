# Singing Trainer consolidation audit

Source review: September 5, 2026. Screen budgets below are proposed design targets, not browser measurements. Effort bands describe relative implementation and validation scope, not time commitments.

## Implemented in this pass

- One launcher and one popup with Lessons and Exercises lists visible side by side; on small screens they stack in one scrollable view.
- Exercises includes Amazing Grace, Simple Unison, Feeling This, and Ladukhin Solfege 1-2, 1-3, and 1-4 (lines 1?12, 51?62, and 101?112 respectively). No separate Workshop entry.
- Existing recording behavior remains available for Simple Unison and Feeling This. Internal `workshop` categories still identify that behavior; relabeling those categories alone would select the wrong toolbar.
- Both bottom toolbars and their nested controls use the app's theme surfaces and readable text. Light mode is light; the existing dark-theme setting still works.
- Standalone exercise toolbars omit key/transpose and grid visibility controls. Notes follow Speaking Pitch, and beat, measure and horizontal grid lines stay visible.
- Shared cards use the correct Start Lesson / Start Exercise label. Keyboard events inside settings no longer trigger the card's start handler.

## Components and screen budget

| Component / controls | Current cost or overlap | Proposed consolidation and budget | Effort |
| --- | --- | --- | --- |
| Chooser / category navigation | Previously three popup implementations; the lesson popup also had a category sidebar | Implemented one popup with two simultaneously visible columns. Keep one selected card expanded. Six lesson cards and six exercise cards do not yet warrant search or another navigation tier. | Small; implemented |
| ExerciseCard / SettingsRenderer | Title, description, three metadata chips, settings, action; recording items suppress settings | Aim for one sentence, duration and difficulty, and one primary action. Show speaking-pitch information only when needed. Expose at most two common settings, with additional settings behind an expander. Keep the shared schema renderer. | Small |
| ExerciseControls | Chooser entry, lesson execution, avatar narration, guide navigation, progress and results all live together in a roughly 1,400-line component | Extract lesson guidance and results presentation separately. Keep guided lesson execution separate from recording execution. One active-session summary in the sidebar. | Large; lifecycle and cancellation need focused checks |
| ExerciseBuilderToolbar / OverdubBuilderToolbar | Almost identical drag, sizing, scrolling and shell CSS; initial heights are 190 / 220 px and maximums are 62% / 72% of viewport height | One configurable toolbar shell. Target a 64–80 px primary action row with optional content below; retain resizing for expanded recording work. Fix resizing/accessibility in that shared shell. | Medium |
| ExerciseBottomControls: playback and waitgate | Start/Stop, close, separate On/Off buttons | Keep playback and close visible. Replace two waitgate buttons with one switch labeled “Wait for my pitch.” | Small |
| ExerciseBottomControls: key and labels | Manual key controls removed; notes follow Speaking Pitch on load and changes | Implemented automatic anchoring of the lowest note to Speaking Pitch. Keep conditional Lyrics/Degrees. | Small; implemented |
| Grid and appearance controls | Standalone exercises now keep beat, measure and horizontal lines on; recording still exposes None/Beat/Bar plus trail color | Grid toggles removed from the standalone exercise toolbar. Any future Display popover should contain only optional appearance settings. Recording controls remain a separate follow-up. | Small; exercise grid policy implemented |
| Drone controls | Drone, Drone Mode, Mode View, Octave and Volume removed from the standalone exercise toolbar | Implemented removal of the toolbar controls and their handlers. The sidebar remains the entry point for available drone settings. | Small; implemented |
| OverdubControls: timing | Three count-in choices, two click-track choices, waitgate pair | One timing group/popover with count-in selector and two switches. Keep the count-in progress visible while recording. | Small to medium |
| OverdubControls: transport | Record/Redo/Stop & Redo, Play/Listen Back, Keep Take change with recording state | Keep three primary actions with explicit state-dependent labels. Do not combine Keep and Redo: they affect whether the recording is retained. | Medium; recording state transitions need checks |
| OverdubControls: voices and takes | Six controls per voice: voice selector, three take slots, show/hide, mix. Six voices mean 36 controls before global settings | Compact voice list with one selected voice; show takes and mixing in the selected voice's detail area. Budget one row per voice plus one detail panel. Clearly label that Hide also mutes the guide. | Medium to large |
| OverdubControls: mix popup | Four sliders per voice: synth gain/pan and take gain/pan | Keep these advanced controls behind Mix. Offer Synth and Recording groups within the selected voice detail panel. Avoid duplicating gain/pan state. | Medium |
| OverdubControls: timeline | Zoom minus/plus, slider, Full button, scroll slider and percentage | Keep zoom plus Fit together; show horizontal navigation when zoomed. Budget one compact row. Preserve the dedicated recording timeline state. | Medium |
| Legacy chooser components and stores | SimpleExerciseChooserModal, OverdubExerciseChooserModal and their stores still exist but are no longer mounted/launched by this app | Remove or deprecate in a separate cleanup after checking exports and external consumers. Keep the recording state store, which still owns playback behavior. | Small to medium |
| SolfegeRows launch | Three named Ladukhin exercise cards now replace the standalone sidebar launcher and in-workspace group buttons | Implemented range-specific entries: 1-2 ? lines 1?12, 1-3 ? 51?62, 1-4 ? 101?112. Preserve the active-session guard and per-row playback, singing, tempo and transpose controls. | Small; implemented |

The exercise toolbar now has three field groups: playback, waitgate, and conditional labels. They share one row and wrap on narrow screens. Recording controls collapse below 900 px, and voice/control regions stack below 1200 px.

## Content audit

| Material | Current structure | Suggested abridgment |
| --- | --- | --- |
| Amazing Grace | One melody voice, lyrics, tempo and waitgate settings; full melody | Keep the full melody and offer short phrase practice. Preserve pickup and 3-beat measure timing when slicing phrases. Follow Speaking Pitch automatically and retain the wait-for-pitch control. |
| Simple Unison | Two voices with the same eight-note phrase: Guide and Your Part | Present as a beginner recording exercise. Select Your Part by default, with Guide as an accompaniment toggle. Retain both internal voices for playback/recording. Its tempo schema is currently hidden by the recording chooser behavior. |
| Feeling This | Six voices with melody, countermelody and harmonies | Start with one selected part and a simple backing toggle. Offer all six voice rows in an expanded arrangement view. Avoid deleting voices or rewriting the arrangement merely to simplify the menu. |
| Foundations lesson | Foundations 1.1–1.4 is already combined into one guided lesson | Retain the sequence; consider a shorter repeat-practice entry after completion, with narration shortened for repeat visits. |
| Basic / Quick / Sustained / Centered / Anchored pitch lessons | Five distinct pitch-practice entries with related mechanics | Consider one Pitch Practice entry with clear presets, while retaining instructional sequence and per-preset defaults. Discuss this before removing named lessons. |

Duration labels are authored strings, not derived previews. Amazing Grace?s ~32s label matches its configured timeline at 90 BPM before count-in. Simple Unison and Feeling This still need their estimates checked against the engine's timing convention and count-in. Do that before choosing excerpt lengths or promising session times.

## Suggested order for discussion

1. The standalone exercise toolbar now contains playback, waitgate and conditional labels. Manual key, grid and drone controls have been removed. Further simplification can focus on the waitgate switch and shared toolbar shell.
2. Apply the same shared shell to recording exercises, with the voice list and a selected-voice detail panel.
3. Add short practice variants and revisit lesson presets only after agreeing which learning steps can be shortened.

The first step has the smallest behavioral surface and addresses the most obvious duplication. The second step needs explicit checks of Record → Listen → Keep/Redo, voice changes, take selection, and closing/resetting a session.

## Verification

Use the existing Hub at `/singing-trainer/`. At desktop width, around 900 px, and around 600 px, inspect both chooser sections, card settings, and scroll access. Start Amazing Grace, then close it and load each recording exercise. Check light toolbar surfaces, active controls, Speaking Pitch changes, voice mix popups, resizing and scrolling. Check keyboard navigation through both lists, settings input, Escape and focus return. Check the existing dark-theme option as well.

This pass uses source review and package typechecking. Browser, microphone, playback and recording behavior have not been exercised by automation.
