<script lang="ts">
  /**
   * Simple Exercise Chooser Modal
   *
   * Standalone modal for selecting non-workshop exercises.
   */

  import { exerciseChooserState } from '@mlt/singing-trainer-core/stores/exerciseChooserState.svelte.js';
  import {
    getRegistryEntriesByCategory,
    type RegistryEntry,
  } from '@mlt/lesson-templates';
  import ExerciseCard from './ExerciseCard.svelte';

  interface Props {
    onstart?: (exerciseId: string, settings: Record<string, number | boolean>) => void;
    onclose?: () => void;
  }

  let { onstart, onclose }: Props = $props();

  const isVisible = $derived(exerciseChooserState.state.isVisible);
  const selectedExerciseId = $derived(exerciseChooserState.state.selectedExerciseId);
  const localSettings = $derived(exerciseChooserState.state.localSettings);

  const exercises = $derived.by<RegistryEntry[]>(() => {
    if (!isVisible) {
      return [];
    }

    return getRegistryEntriesByCategory('exercises');
  });

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && isVisible) {
      handleClose();
    }
  }

  function handleClose() {
    exerciseChooserState.hide();
    exerciseChooserState.resetSelection();
    onclose?.();
  }

  function handleExerciseSelect(entry: RegistryEntry) {
    exerciseChooserState.selectExercise(entry.template.id, entry.template.settingsSchema);
  }

  function handleSettingChange(key: string, value: number | boolean) {
    exerciseChooserState.updateLocalSetting(key, value);
  }

  function handleStartExercise() {
    if (!selectedExerciseId) return;

    const settings = exerciseChooserState.getLocalSettings();
    exerciseChooserState.hide();
    onstart?.(selectedExerciseId, settings);

    setTimeout(() => {
      exerciseChooserState.resetSelection();
    }, 100);
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isVisible}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="modal-backdrop"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="simple-exercise-chooser-title"
    tabindex="-1"
  >
    <div class="modal-content">
      <div class="modal-header">
        <h2 id="simple-exercise-chooser-title" class="modal-title">Choose Exercise</h2>
        <button class="close-btn" onclick={handleClose} aria-label="Close">
          <span class="close-icon">&times;</span>
        </button>
      </div>

      <div class="modal-body">
        {#if exercises.length === 0}
          <div class="empty-state">
            <p>No exercises available yet.</p>
          </div>
        {:else}
          <div class="exercise-list">
            {#each exercises as entry (entry.template.id)}
              <ExerciseCard
                {entry}
                isSelected={selectedExerciseId === entry.template.id}
                {localSettings}
                onselect={() => handleExerciseSelect(entry)}
                onsettingchange={handleSettingChange}
                onstart={handleStartExercise}
              />
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(0, 0, 0, 0.75);
    z-index: 1000;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal-content {
    width: 90%;
    max-width: 520px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    background-color: var(--color-surface);
    border-radius: var(--radius-lg, 12px);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    animation: slideUp 0.3s ease;
    overflow: hidden;
  }

  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-md) var(--spacing-lg);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    flex-shrink: 0;
  }

  .modal-title {
    font-size: var(--font-size-xl);
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }

  .close-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .close-btn:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: var(--color-text);
  }

  .close-icon {
    font-size: 24px;
    line-height: 1;
  }

  .modal-body {
    flex: 1;
    padding: var(--spacing-md);
    overflow-y: auto;
  }

  .exercise-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }

  @media (max-width: 600px) {
    .modal-content {
      max-width: 100%;
      max-height: 100%;
      border-radius: 0;
    }
  }
</style>
