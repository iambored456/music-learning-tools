<script lang="ts">
  import { appState } from '@mlt/singing-trainer-core/stores/appState.svelte.js';
  import type { NoteColorMode } from '@mlt/singing-trainer-core/stores/appState.svelte.js';

  function handleNoteColorChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value as NoteColorMode;
    appState.setNoteColorMode(value);
  }

  function handleJudgementCircleSizeInput(e: Event) {
    const value = Number((e.target as HTMLInputElement).value);
    appState.setJudgementLineCircleRadiusPx(value);
  }

  function handleMicTrailCircleSizeInput(e: Event) {
    const value = Number((e.target as HTMLInputElement).value);
    appState.setMicTrailCircleRadiusPx(value);
  }
</script>

<div class="theme-settings">
  <div class="theme-setting">
    <span class="setting-label">Note Colors</span>
    <select class="setting-select" value={appState.state.noteColorMode} onchange={handleNoteColorChange}>
      <option value="green">Default (Green)</option>
      <option value="pitchColor">Pitch Colors</option>
    </select>
  </div>

  <div class="theme-setting theme-setting--slider">
    <div class="setting-head">
      <label class="setting-label" for="judgement-circle-size">Judgement Line Circle</label>
      <span class="setting-value">{appState.state.judgementLineCircleRadiusPx.toFixed(1)}px</span>
    </div>
    <input
      id="judgement-circle-size"
      class="setting-slider"
      type="range"
      min="4"
      max="36"
      step="0.5"
      value={appState.state.judgementLineCircleRadiusPx}
      oninput={handleJudgementCircleSizeInput}
    />
  </div>

  <div class="theme-setting theme-setting--slider">
    <div class="setting-head">
      <label class="setting-label" for="mic-trail-circle-size">Mic Trail Circle</label>
      <span class="setting-value">{appState.state.micTrailCircleRadiusPx.toFixed(1)}px</span>
    </div>
    <input
      id="mic-trail-circle-size"
      class="setting-slider"
      type="range"
      min="2"
      max="24"
      step="0.5"
      value={appState.state.micTrailCircleRadiusPx}
      oninput={handleMicTrailCircleSizeInput}
    />
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
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
  }

  .theme-setting--slider {
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    gap: var(--spacing-xs);
  }

  .setting-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-sm);
  }

  .setting-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .setting-value {
    font-size: var(--font-size-xs);
    font-variant-numeric: tabular-nums;
    color: var(--color-text);
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

  .setting-slider {
    width: 100%;
    accent-color: var(--color-primary);
  }
</style>
