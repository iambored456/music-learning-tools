<script lang="ts">
  /**
   * Lesson Card Component
   *
   * Displays lesson metadata and expands to show settings when selected.
   */

  import type { RegistryEntry } from '@mlt/lesson-templates';
  import SettingsRenderer from './SettingsRenderer.svelte';

  interface Props {
    entry: RegistryEntry;
    isSelected: boolean;
    localSettings: Record<string, number | boolean>;
    onselect: () => void;
    onsettingchange: (key: string, value: number | boolean) => void;
    onstart: () => void;
    showSettings?: boolean;
    startLabel?: string;
  }

  let {
    entry,
    isSelected,
    localSettings,
    onselect,
    onsettingchange,
    onstart,
    showSettings = true,
    startLabel = 'Start Lesson',
  }: Props = $props();

  const template = $derived(entry.template);

  function handleCardClick() {
    if (!isSelected) {
      onselect();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.target !== event.currentTarget) return;
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
        {startLabel}
      </button>
    </div>
  {/if}
</div>

<style>
  .exercise-card {
    background-color: var(--color-panel);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .exercise-card:hover {
    background-color: var(--color-control);
    border-color: var(--color-border);
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

  /* Expanded content */
  .card-expanded {
    margin-top: var(--spacing-md);
    padding-top: var(--spacing-md);
    border-top: 1px solid var(--color-border);
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
