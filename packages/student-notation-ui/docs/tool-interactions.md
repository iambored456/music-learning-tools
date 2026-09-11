# Tool interactions

The engine store owns the active tool (`selectedTool`). Drawing subtypes are remembered in `selectedDrawTool`; they are active only when the main tool is `draw`. Tool settings, voice colour, note shape, tonic mode, modulation ratio, and stamp patterns survive deactivation.

Use `setSelectedTool` for activation. Its `toolChanging` event finishes outgoing score gestures before replacement; `toolChanged` synchronizes controls and the annotation service. Draw controls must not maintain another active-tool choice or activate tools as a side effect of tab navigation.

- Exactly one tool family is highlighted. Chord intervals and note shapes remain remembered without looking active when another tool is selected.
- The pointer button activates Select; Escape also activates Select outside text inputs. Select can pick notes/stamps and select or move arrow/text annotations. Drag on blank PitchGrid space to select a group with a lasso. It never places notes or drum hits.
- Toolbar Eraser uses left-click/drag. Right-click/drag temporarily erases without replacing the current tool. Both erase notes, stamps, tonic signs, annotations, and modulation under the pointer in PitchGrid. DrumGrid erases drum hits. The toolbar Eraser previews the affected object types in PitchGrid. Overlapping objects within the brush can all be removed.
- Each eraser gesture is one Undo step; empty gestures add none. Release, loss of window focus, or selecting another tool finishes the gesture. Explicit tool selection always wins.
- Switching away from a drawing tool clears its unfinished drawing preview and selection. An open text edit is committed on a tool switch; Escape in the editor cancels and restores existing text.

Focused regression tests can be run from this package with:

```sh
pnpm exec vitest run src/state/toolSelection.test.ts src/components/draw/drawToolTransitions.test.ts src/components/canvas/PitchGrid/interactors/PitchGridRightClickEraserInteractor.test.ts src/svelte-ui/toolbar/toolSelectionUi.test.ts
```
