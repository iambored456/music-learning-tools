<script lang="ts">
  /**
   * Lesson Card Component
   *
   * Displays lesson metadata and expands to show settings when selected.
   */

  import type { AnyLessonTemplate, RegistryEntry } from '@mlt/lesson-templates';
  import SettingsRenderer from './SettingsRenderer.svelte';

  interface Props {
    entry: RegistryEntry;
    isSelected: boolean;
    localSettings: Record<string, number | boolean>;
    onselect: () => void;
    onsettingchange: (key: string, value: number | boolean) => void;
    onstart: () => void;
    showSettings?: boolean;
  }

  let {
    entry,
    isSelected,
    localSettings,
    onselect,
    onsettingchange,
    onstart,
    showSettings = true,
  }: Props = $props();

  const template = $derived(entry.template);

  function handleCardClick() {
    if (!isSelected) {
      onselect();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (isSelected) {
        onstart();
      } else {
        onselect();
      }
    }
  }

  function handleStartClick(event: MouseEvent) {
    event.stopPropagation();
    onstart();
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  class="exercise-card"
  class:selected={isSelected}
  onclick={handleCardClick}
  onkeydown={handleKeydown}
  tabindex="0"
  role="button"
  aria-expanded={isSelected}
>
  <!-- Always visible header -->
  <div class="card-header">
    <h4 class="card-title">{template.name}</h4>
    <p class="card-description">{template.description}</p>

    <div class="card-metadata">
      <span class="metadata-item" class:uses-pitch={entry.requiresSpeakingPitch}>
        <span class="metadata-icon">🎙️</span>
        Speaking Pitch: {entry.requiresSpeakingPitch ? 'Yes' : 'No'}
      </span>
      <span class="metadata-item">
        <span class="metadata-icon">📊</span>
        {entry.difficultyLabel}
      </span>
      <span class="metadata-item">
        <span class="metadata-icon">⏱️</span>
        {template.durationEstimate}
      </span>
    </div>
  </div>

  <!-- Expanded content when selected -->
  {#if isSelected}
    <div class="card-expanded">
      {#if showSettings}
        <div class="settings-section">
          <h5 class="settings-title">Settings</h5>
          <SettingsRenderer
            schema={template.settingsSchema}
            values={localSettings}
            onchange={onsettingchange}
          />
        </div>
      {/if}

      <button class="start-btn" onclick={handleStartClick}>
        Start Lesson
      </button>
    </div>
  {/if}
</div>

<style>
  .exercise-card {
    background-color: var(--color-surface);
    border: 2px solid transparent;
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .exercise-card:hover {
    background-color: rgba(255, 255, 255, 0.03);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .exercise-card:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .exercise-card.selected {
    background-color: rgba(var(--color-primary-rgb, 74, 123, 200), 0.1);
    border-color: var(--color-primary);
  }

  .card-header {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .card-title {
    font-size: var(--font-size-md);
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
  }

  .card-description {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    margin: 0;
    line-height: 1.4;
  }

  .card-metadata {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-sm);
    margin-top: var(--spacing-xs);
  }

  .metadata-item {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    background-color: rgba(255, 255, 255, 0.05);
    padding: 2px var(--spacing-xs);
    border-radius: var(--radius-sm);
  }

  .metadata-item.uses-pitch {
    background-color: rgba(var(--color-primary-rgb, 74, 123, 200), 0.2);
    color: var(--color-primary);
  }

  .metadata-icon {
    font-size: var(--font-size-xs);
  }

  /* Expanded content */
  .card-expanded {
    margin-top: var(--spacing-md);
    padding-top: var(--spacing-md);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .settings-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .settings-title {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0;
  }

  .start-btn {
    padding: var(--spacing-md);
    font-size: var(--font-size-md);
    font-weight: 600;
    background-color: var(--color-primary);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .start-btn:hover {
    background-color: var(--color-primary-dark, #4a7bc8);
  }

  .start-btn:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
</style>
