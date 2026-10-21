<script lang="ts">
  import { appState } from '@mlt/singing-trainer-core/stores/appState.svelte.js';
  import type { NoteColorMode, NoteType } from '@mlt/singing-trainer-core/stores/appState.svelte.js';
  import { preferencesStore } from '@mlt/singing-trainer-core/stores/preferencesStore.svelte.js';
  import { overdubExerciseState } from '@mlt/singing-trainer-core/stores/overdubExerciseState.svelte.js';
  import { highwayState } from '@mlt/singing-trainer-core/stores/highwayState.svelte.js';

  const exerciseId = $derived(overdubExerciseState.state.isActive ? overdubExerciseState.state.exerciseId : null);
  const studentNotationNotes = $derived(preferencesStore.getStudentNotationNotes(exerciseId,
    exerciseId && overdubExerciseState.state.template?.config.preferredNotationStyle === 'student-notation' ? true : undefined));

  function handleNotationChange(enabled: boolean) {
    if (exerciseId) {
      preferencesStore.setExerciseNotationNotes(exerciseId, enabled);
      highwayState.setSquareGridEnabled(enabled);
    } else preferencesStore.setStudentNotationNotes(enabled);
  }

  function handleNoteTypeChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value as NoteType;
    appState.setNoteType(value);
  }

  function handleNoteColorChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value as NoteColorMode;
    appState.setNoteColorMode(value);
  }

</script>

<div class="theme-settings">
  <label class="theme-setting notation-toggle">
    <span class="setting-label">Student Notation notes<br /><small>Exercise lyrics and labels inside outlined notes</small></span>
    <input type="checkbox" role="switch"
      checked={studentNotationNotes}
      onchange={(event) => handleNotationChange(event.currentTarget.checked)} />
  </label>
  <div class="theme-setting">
    <span class="setting-label">Note Type</span>
    <select class="setting-select" value={appState.state.noteType} onchange={handleNoteTypeChange}>
      <option value="stadium">Stadium</option>
      <option value="gradient">Gradient</option>
    </select>
  </div>

  <div class="theme-setting">
    <span class="setting-label">Note Colors</span>
    <select class="setting-select" value={appState.state.noteColorMode} onchange={handleNoteColorChange}>
      <option value="green">Default (Green)</option>
      <option value="pitchColor">Pitch Colours</option>
    </select>
  </div>

</div>

<style>
  .theme-settings {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .theme-setting {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-sm);
    padding: 16px;
    background: var(--color-panel);
    border: 1px solid var(--color-border);
    border-radius: 12px;
  }

  .setting-label {
    font-size: var(--font-size-sm);
    color: var(--color-text);
  }

  .notation-toggle { cursor: pointer; }
  .notation-toggle small { display: inline-block; margin-top: 4px; color: var(--color-text-muted); }
  .notation-toggle input {
    appearance: none;
    position: relative;
    flex-shrink: 0;
    width: 36px;
    height: 20px;
    margin: 0;
    border: 1px solid var(--color-border-strong);
    border-radius: 999px;
    background: var(--color-control);
    cursor: pointer;
  }
  .notation-toggle input::before {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--color-text-muted);
  }
  .notation-toggle input:checked { background: var(--color-primary); }
  .notation-toggle input:checked::before { transform: translateX(16px); background: white; }
  .notation-toggle input:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 3px; }

  .setting-select {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-sm);
    color: var(--color-text);
    background-color: var(--color-control);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-sm);
    transition: border-color 0.2s ease;
  }

  .setting-select:hover {
    border-color: var(--color-secondary);
  }

</style>
