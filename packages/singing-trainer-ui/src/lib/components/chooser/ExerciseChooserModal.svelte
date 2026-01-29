<script lang="ts">
  /**
   * Exercise Chooser Modal Component
   *
   * True modal for browsing and selecting exercises.
   * Matches the Results modal styling and interaction patterns.
   */

  import { chooserState } from '../../stores/chooserState.svelte.js';
  import {
    getRegistryEntriesByCategory,
    type RegistryEntry,
    type LessonCategory,
  } from '@mlt/lesson-templates';
  import CategoryNav from './CategoryNav.svelte';
  import ExerciseCard from './ExerciseCard.svelte';

  interface Props {
    onstart?: (exerciseId: string, settings: Record<string, number | boolean>) => void;
    onclose?: () => void;
  }

  let { onstart, onclose }: Props = $props();

  // Reactive state
  const isVisible = $derived(chooserState.state.isVisible);
  const selectedCategory = $derived(chooserState.state.selectedCategory);
  const selectedExerciseId = $derived(chooserState.state.selectedExerciseId);
  const localSettings = $derived(chooserState.state.localSettings);

  // Get exercises for selected category
  const categoryExercises = $derived(getRegistryEntriesByCategory(selectedCategory));

  /**
   * Handle backdrop click
   */
  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  /**
   * Handle escape key
   */
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && isVisible) {
      handleClose();
    }
  }

  /**
   * Handle close button or backdrop
   */
  function handleClose() {
    chooserState.hide();
    chooserState.resetSelection();
    onclose?.();
  }

  /**
   * Handle category selection
   */
  function handleCategorySelect(category: LessonCategory) {
    chooserState.selectCategory(category);
  }

  /**
   * Handle exercise card selection
   */
  function handleExerciseSelect(entry: RegistryEntry) {
    chooserState.selectExercise(entry.template.id, entry.template.settingsSchema);
  }

  /**
   * Handle settings change
   */
  function handleSettingChange(key: string, value: number | boolean) {
    chooserState.updateLocalSetting(key, value);
  }

  /**
   * Handle start exercise
   */
  function handleStartExercise() {
    if (!selectedExerciseId) return;

    const settings = chooserState.getLocalSettings();

    // Close modal immediately
    chooserState.hide();

    // Trigger start callback
    onstart?.(selectedExerciseId, settings);

    // Reset selection after a delay
    setTimeout(() => {
      chooserState.resetSelection();
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
    aria-labelledby="chooser-title"
    tabindex="-1"
  >
    <div class="modal-content">
      <!-- Header -->
      <div class="modal-header">
        <h2 id="chooser-title" class="modal-title">Choose Exercise</h2>
        <button class="close-btn" onclick={handleClose} aria-label="Close">
          <span class="close-icon">×</span>
        </button>
      </div>

      <!-- Two-column layout -->
      <div class="modal-body">
        <!-- Left: Category navigation -->
        <aside class="categories-column">
          <CategoryNav
            {selectedCategory}
            onselect={handleCategorySelect}
          />
        </aside>

        <!-- Right: Exercise cards -->
        <main class="exercises-column">
          {#if categoryExercises.length === 0}
            <div class="empty-state">
              <p>No exercises in this category yet.</p>
            </div>
          {:else}
            <div class="exercise-list">
              {#each categoryExercises as entry (entry.template.id)}
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
        </main>
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
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .modal-content {
    width: 90%;
    max-width: 700px;
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
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
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
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .categories-column {
    padding: var(--spacing-md);
    border-right: 1px solid rgba(255, 255, 255, 0.1);
    flex-shrink: 0;
  }

  .exercises-column {
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

  /* Responsive adjustments */
  @media (max-width: 600px) {
    .modal-content {
      max-width: 100%;
      max-height: 100%;
      border-radius: 0;
    }

    .modal-body {
      flex-direction: column;
    }

    .categories-column {
      border-right: none;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    :global(.category-nav) {
      flex-direction: row;
      flex-wrap: wrap;
    }
  }
</style>
