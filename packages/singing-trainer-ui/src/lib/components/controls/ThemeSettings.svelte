<script lang="ts">
  import { appState } from '@mlt/singing-trainer-core/stores/appState.svelte.js';
  import type { NoteColorMode, NoteType } from '@mlt/singing-trainer-core/stores/appState.svelte.js';

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
