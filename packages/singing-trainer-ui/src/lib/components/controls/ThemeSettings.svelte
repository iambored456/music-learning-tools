<script lang="ts">
  import { appState } from '../../stores/appState.svelte.js';
  import type { NoteColorMode } from '../../stores/appState.svelte.js';

  function handleChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value as NoteColorMode;
    appState.setNoteColorMode(value);
  }
</script>

<div class="theme-setting">
  <span class="setting-label">Note Colors</span>
  <select class="setting-select" value={appState.state.noteColorMode} onchange={handleChange}>
    <option value="green">Default (Green)</option>
    <option value="pitchColor">Pitch Colors</option>
  </select>
</div>

<style>
  .theme-setting {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-sm);
    padding: 16px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
  }

  .setting-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .setting-select {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-sm);
    color: var(--color-text);
    background-color: var(--color-surface);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-sm);
    transition: border-color 0.2s ease;
  }

  .setting-select:hover {
    border-color: var(--color-secondary);
  }
</style>
