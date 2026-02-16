# Lesson Component Inventory

- Generated: 2026-02-16T03:18:06.054Z
- Scope: focused
- Source files scanned: 122
- Components discovered: 43
- Reusable candidates: 2

## Top Reusable Candidates

| Component | Category | Importers | Notes | Path |
|---|---|---:|---|---|
| ActionController | controls | 3 | Imported broadly and likely reusable with light decoupling. | `packages/diatonic-compass-ui/src/core/ActionController.ts` |
| ExerciseCard | controls | 3 | Imported broadly and likely reusable with light decoupling. | `packages/singing-trainer-ui/src/lib/components/chooser/ExerciseCard.svelte` |

## Full Inventory

### ActionController

- Path: `packages/diatonic-compass-ui/src/core/ActionController.ts`
- Category: controls
- Importers: 3
- Reusable: yes
- Reusability Notes: Imported broadly and likely reusable with light decoupling.
- Props (best-effort): none detected
- Direct importers: `packages/diatonic-compass-ui/src/accessibility/KeyboardManager.ts`, `packages/diatonic-compass-ui/src/app.ts`, `packages/diatonic-compass-ui/src/tutorial.ts`

### ExerciseCard

- Path: `packages/singing-trainer-ui/src/lib/components/chooser/ExerciseCard.svelte`
- Category: controls
- Importers: 3
- Reusable: yes
- Reusability Notes: Imported broadly and likely reusable with light decoupling.
- Props (best-effort): entry, isSelected, localSettings, onselect, onsettingchange, onstart, showSettings
- Direct importers: `packages/singing-trainer-ui/src/lib/components/chooser/ExerciseChooserModal.svelte`, `packages/singing-trainer-ui/src/lib/components/chooser/OverdubExerciseChooserModal.svelte`, `packages/singing-trainer-ui/src/lib/components/chooser/index.ts`

### CalibrationRecordStep

- Path: `packages/singing-trainer-ui/src/lib/calibration/CalibrationRecordStep.svelte`
- Category: unknown
- Importers: 2
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): onBack, onComplete, phrase, phraseIndex
- Direct importers: `packages/singing-trainer-ui/src/lib/calibration/CalibrationWizard.svelte`, `packages/singing-trainer-ui/src/lib/calibration/index.ts`

### CalibrationResultStep

- Path: `packages/singing-trainer-ui/src/lib/calibration/CalibrationResultStep.svelte`
- Category: feedback
- Importers: 2
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): onRetry, onSave
- Direct importers: `packages/singing-trainer-ui/src/lib/calibration/CalibrationWizard.svelte`, `packages/singing-trainer-ui/src/lib/calibration/index.ts`

### CategoryNav

- Path: `packages/singing-trainer-ui/src/lib/components/chooser/CategoryNav.svelte`
- Category: controls
- Importers: 2
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): onselect, selectedCategory
- Direct importers: `packages/singing-trainer-ui/src/lib/components/chooser/ExerciseChooserModal.svelte`, `packages/singing-trainer-ui/src/lib/components/chooser/index.ts`

### OverdubControls

- Path: `packages/singing-trainer-ui/src/lib/components/controls/OverdubControls.svelte`
- Category: controls
- Importers: 2
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): compact
- Direct importers: `packages/singing-trainer-ui/src/lib/components/controls/OverdubBuilderToolbar.svelte`, `packages/singing-trainer-ui/src/lib/components/controls/index.ts`

### PhrasePrompt

- Path: `packages/singing-trainer-ui/src/lib/calibration/PhrasePrompt.svelte`
- Category: unknown
- Importers: 2
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): isActive, phrase
- Direct importers: `packages/singing-trainer-ui/src/lib/calibration/CalibrationRecordStep.svelte`, `packages/singing-trainer-ui/src/lib/calibration/index.ts`

### SettingsRenderer

- Path: `packages/singing-trainer-ui/src/lib/components/chooser/SettingsRenderer.svelte`
- Category: controls
- Importers: 2
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): disabled, onchange, schema, values
- Direct importers: `packages/singing-trainer-ui/src/lib/components/chooser/ExerciseCard.svelte`, `packages/singing-trainer-ui/src/lib/components/chooser/index.ts`

### SpeakingPitchPanel

- Path: `packages/singing-trainer-ui/src/lib/components/controls/SpeakingPitchPanel.svelte`
- Category: controls
- Importers: 2
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): onCalibrate
- Direct importers: `packages/singing-trainer-ui/src/index.ts`, `packages/singing-trainer-ui/src/lib/components/controls/index.ts`

### SyncControls

- Path: `packages/singing-trainer-ui/src/lib/components/controls/SyncControls.svelte`
- Category: controls
- Importers: 2
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): none detected
- Direct importers: `packages/singing-trainer-ui/src/lib/components/controls/UltrastarControls.svelte`, `packages/singing-trainer-ui/src/lib/components/controls/index.ts`

### YouTubePlayer

- Path: `packages/singing-trainer-ui/src/lib/components/youtube/YouTubePlayer.svelte`
- Category: unknown
- Importers: 2
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): none detected
- Direct importers: `packages/singing-trainer-ui/src/lib/components/controls/UltrastarControls.svelte`, `packages/singing-trainer-ui/src/lib/components/youtube/index.ts`

### App

- Path: `packages/singing-trainer-ui/src/App.svelte`
- Category: unknown
- Importers: 1
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): none detected
- Direct importers: `packages/singing-trainer-ui/src/index.ts`

### CalibrationWizard

- Path: `packages/singing-trainer-ui/src/lib/calibration/CalibrationWizard.svelte`
- Category: unknown
- Importers: 1
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): onCancel, onComplete
- Direct importers: `packages/singing-trainer-ui/src/lib/calibration/index.ts`

### canvas

- Path: `packages/diatonic-compass-ui/src/utils/canvas.ts`
- Category: visualization
- Importers: 1
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): none detected
- Direct importers: `packages/diatonic-compass-ui/src/app.ts`

### DiatonicScaleModal

- Path: `packages/singing-trainer-ui/src/lib/components/analysis/DiatonicScaleModal.svelte`
- Category: analysis
- Importers: 1
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): onAcceptAll, onApply, onClose, result, segments
- Direct importers: `packages/singing-trainer-ui/src/lib/components/controls/UltrastarControls.svelte`

### DifficultySettings

- Path: `packages/singing-trainer-ui/src/lib/components/controls/DifficultySettings.svelte`
- Category: controls
- Importers: 1
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): none detected
- Direct importers: `packages/singing-trainer-ui/src/lib/components/controls/index.ts`

### DroneControls

- Path: `packages/singing-trainer-ui/src/lib/components/controls/DroneControls.svelte`
- Category: controls
- Importers: 1
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): none detected
- Direct importers: `packages/singing-trainer-ui/src/lib/components/controls/index.ts`

### ExerciseChooserModal

- Path: `packages/singing-trainer-ui/src/lib/components/chooser/ExerciseChooserModal.svelte`
- Category: controls
- Importers: 1
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): onclose, onstart
- Direct importers: `packages/singing-trainer-ui/src/lib/components/chooser/index.ts`

### ExerciseControls

- Path: `packages/singing-trainer-ui/src/lib/components/controls/ExerciseControls.svelte`
- Category: controls
- Importers: 1
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): none detected
- Direct importers: `packages/singing-trainer-ui/src/lib/components/controls/index.ts`

### InputDecibelMeter

- Path: `packages/singing-trainer-ui/src/lib/components/controls/InputDecibelMeter.svelte`
- Category: controls
- Importers: 1
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): none detected
- Direct importers: `packages/singing-trainer-ui/src/lib/components/controls/index.ts`

### JudgementLineDragHandle

- Path: `packages/singing-trainer-ui/src/lib/components/JudgementLineDragHandle.svelte`
- Category: unknown
- Importers: 1
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): canvasWidth, gridHeight, nowLineX
- Direct importers: `packages/singing-trainer-ui/src/lib/components/SingingCanvas.svelte`

### LyricLabelControls

- Path: `packages/singing-trainer-ui/src/lib/components/controls/LyricLabelControls.svelte`
- Category: controls
- Importers: 1
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): none detected
- Direct importers: `packages/singing-trainer-ui/src/lib/components/controls/index.ts`

### LyricsDisplay

- Path: `packages/singing-trainer-ui/src/lib/components/karaoke/LyricsDisplay.svelte`
- Category: unknown
- Importers: 1
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): none detected
- Direct importers: `packages/singing-trainer-ui/src/lib/components/karaoke/index.ts`

### MicInputSelector

- Path: `packages/singing-trainer-ui/src/lib/components/controls/MicInputSelector.svelte`
- Category: controls
- Importers: 1
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): none detected
- Direct importers: `packages/singing-trainer-ui/src/lib/components/controls/index.ts`

### ModeToggle

- Path: `packages/singing-trainer-ui/src/lib/components/controls/ModeToggle.svelte`
- Category: controls
- Importers: 1
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): none detected
- Direct importers: `packages/singing-trainer-ui/src/lib/components/controls/index.ts`

### OverdubBuilderToolbar

- Path: `packages/singing-trainer-ui/src/lib/components/controls/OverdubBuilderToolbar.svelte`
- Category: controls
- Importers: 1
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): visible
- Direct importers: `packages/singing-trainer-ui/src/lib/components/controls/index.ts`

### OverdubExerciseChooserModal

- Path: `packages/singing-trainer-ui/src/lib/components/chooser/OverdubExerciseChooserModal.svelte`
- Category: controls
- Importers: 1
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): onclose, onstart
- Direct importers: `packages/singing-trainer-ui/src/lib/components/chooser/index.ts`

### PitchHighlightToggle

- Path: `packages/singing-trainer-ui/src/lib/components/controls/PitchHighlightToggle.svelte`
- Category: highlight
- Importers: 1
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): none detected
- Direct importers: `packages/singing-trainer-ui/src/lib/components/controls/index.ts`

### PitchReadout

- Path: `packages/singing-trainer-ui/src/lib/components/feedback/PitchReadout.svelte`
- Category: feedback
- Importers: 1
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): none detected
- Direct importers: `packages/singing-trainer-ui/src/lib/components/feedback/index.ts`

### RangeControl

- Path: `packages/singing-trainer-ui/src/lib/components/controls/RangeControl.svelte`
- Category: controls
- Importers: 1
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): none detected
- Direct importers: `packages/singing-trainer-ui/src/lib/components/controls/index.ts`

### ResultsModal

- Path: `packages/singing-trainer-ui/src/lib/components/feedback/ResultsModal.svelte`
- Category: feedback
- Importers: 1
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): onClose, onRetry
- Direct importers: `packages/singing-trainer-ui/src/lib/components/feedback/index.ts`

### SingingCanvas

- Path: `packages/singing-trainer-ui/src/lib/components/SingingCanvas.svelte`
- Category: visualization
- Importers: 1
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): none detected
- Direct importers: `packages/singing-trainer-ui/src/lib/components/index.ts`

### StartButton

- Path: `packages/singing-trainer-ui/src/lib/components/controls/StartButton.svelte`
- Category: controls
- Importers: 1
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): none detected
- Direct importers: `packages/singing-trainer-ui/src/lib/components/controls/index.ts`

### ThemeSettings

- Path: `packages/singing-trainer-ui/src/lib/components/controls/ThemeSettings.svelte`
- Category: controls
- Importers: 1
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): none detected
- Direct importers: `packages/singing-trainer-ui/src/lib/components/controls/index.ts`

### TonicSelector

- Path: `packages/singing-trainer-ui/src/lib/components/controls/TonicSelector.svelte`
- Category: controls
- Importers: 1
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): none detected
- Direct importers: `packages/singing-trainer-ui/src/lib/components/controls/index.ts`

### UIControls

- Path: `packages/diatonic-compass-ui/src/components/UIControls.ts`
- Category: controls
- Importers: 1
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): none detected
- Direct importers: `packages/diatonic-compass-ui/src/app.ts`

### UltrastarControls

- Path: `packages/singing-trainer-ui/src/lib/components/controls/UltrastarControls.svelte`
- Category: controls
- Importers: 1
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): none detected
- Direct importers: `packages/singing-trainer-ui/src/lib/components/controls/index.ts`

### YAxisDragZones

- Path: `packages/singing-trainer-ui/src/lib/components/YAxisDragZones.svelte`
- Category: unknown
- Importers: 1
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): cellHeight, gridHeight
- Direct importers: `packages/singing-trainer-ui/src/lib/components/SingingCanvas.svelte`

### chooserState.svelte

- Path: `packages/singing-trainer-core/src/lib/stores/chooserState.svelte.ts`
- Category: controls
- Importers: 0
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): none detected

### controllerAdapters

- Path: `packages/singing-trainer-core/src/lib/engine/controllerAdapters.ts`
- Category: controls
- Importers: 0
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): none detected

### highwayState.svelte

- Path: `packages/singing-trainer-core/src/lib/stores/highwayState.svelte.ts`
- Category: highway
- Importers: 0
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): none detected

### overdubExerciseChooserState.svelte

- Path: `packages/singing-trainer-core/src/lib/stores/overdubExerciseChooserState.svelte.ts`
- Category: controls
- Importers: 0
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): none detected

### pitchRangeController

- Path: `packages/singing-trainer-core/src/lib/pitch-range/pitchRangeController.ts`
- Category: controls
- Importers: 0
- Reusable: no
- Reusability Notes: Local usage only.
- Props (best-effort): none detected
