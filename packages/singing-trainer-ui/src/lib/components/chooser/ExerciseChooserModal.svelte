<script lang="ts">
  /**
   * Shared lesson and exercise chooser.
   *
   * Three sections share selection, settings, and keyboard navigation.
   * Matches the Results modal styling and interaction patterns.
   */

  import { chooserState } from '@mlt/singing-trainer-core/stores/chooserState.svelte.js';
  import {
    getRegistryEntriesByCategory,
    type RegistryEntry,
  } from '@mlt/lesson-templates';
  import ExerciseCard from './ExerciseCard.svelte';
  import { SOLFEGE_EXERCISES, type SolfegeExercise } from '../../solfegeExercises.js';

  const REMOVED_SINGING_TRAINER_LESSON_IDS = new Set([
    'foundations-1-merged',
    'basic-pitch-match',
    'centered-range-match',
    'anchored-pitch-matching',
    'quick-pitch-match',
    'sustained-pitch-match',
  ]);
  const REMOVED_SINGING_TRAINER_EXERCISE_IDS = new Set([
    'overdub-simple-unison',
  ]);

  interface Props {
    onstart?: (lessonId: string, settings: Record<string, number | boolean>) => void;
    onexercisestart?: (exerciseId: string, settings: Record<string, number | boolean>) => void;
    onworkshopstart?: (exerciseId: string, settings: Record<string, number | boolean>) => void;
    onsolfegestart?: (exercise: SolfegeExercise) => void;
    canStartSolfege?: boolean;
    onclose?: () => void;
  }

  interface ChooserSection {
    id: 'lessons' | 'solmization' | 'exercises';
    title: string;
    startLabel?: string;
    entries: RegistryEntry[];
  }

  let { onstart, onexercisestart, onworkshopstart, onsolfegestart, canStartSolfege = true, onclose }: Props = $props();

  // Reactive state
  const isVisible = $derived(chooserState.state.isVisible);
  const selectedLessonId = $derived(chooserState.state.selectedLessonId);
  const localSettings = $derived(chooserState.state.localSettings);

  const sections = $derived.by<ChooserSection[]>(() => {
    if (!isVisible) return [];

    const lessonEntries = [
      ...getRegistryEntriesByCategory('foundations'),
      ...getRegistryEntriesByCategory('beginning'),
    ].filter((entry) => !REMOVED_SINGING_TRAINER_LESSON_IDS.has(entry.template.id));

    return [
      {
        id: 'lessons',
        title: 'Lessons',
        startLabel: 'Start Lesson',
        entries: lessonEntries,
      },
      {
        id: 'solmization',
        title: 'Solmization',
        entries: [],
      },
      {
        id: 'exercises',
        title: 'Exercises',
        startLabel: 'Start Exercise',
        entries: [...getRegistryEntriesByCategory('exercises'), ...getRegistryEntriesByCategory('workshop')]
          .filter((entry) => !REMOVED_SINGING_TRAINER_EXERCISE_IDS.has(entry.template.id)),
      },
    ];
  });

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

  function focusDialog(node: HTMLElement) {
    const previousFocus = document.activeElement;
    node.querySelector<HTMLButtonElement>('.close-btn')?.focus();
    function trapFocus(event: KeyboardEvent) {
      if (event.key !== 'Tab') return;
      const controls = Array.from(node.querySelectorAll<HTMLElement>('button, input, select, [tabindex="0"]'))
        .filter((element) => element.tabIndex >= 0 && !element.matches(':disabled'));
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    node.addEventListener('keydown', trapFocus);
    return { destroy() {
      node.removeEventListener('keydown', trapFocus);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    } };
  }

  /**
   * Handle lesson card selection
   */
  function handleLessonSelect(entry: RegistryEntry) {
    chooserState.selectLesson(entry.template.id, entry.template.settingsSchema);
  }

  /**
   * Handle settings change
   */
  function handleSettingChange(key: string, value: number | boolean) {
    chooserState.updateLocalSetting(key, value);
  }

  /**
   * Handle start lesson
   */
  function handleStartLesson() {
    const entry = sections.flatMap((section) => section.entries)
      .find((entry) => entry.template.id === selectedLessonId);
    if (!entry) return;

    const settings = chooserState.getLocalSettings();

    // Close modal immediately
    chooserState.hide();

    // Trigger start callback
    chooserState.resetSelection();
    if (entry.template.category === 'workshop') {
      onworkshopstart?.(entry.template.id, settings);
    } else if (entry.template.category === 'exercises') {
      onexercisestart?.(entry.template.id, settings);
    } else {
      onstart?.(entry.template.id, settings);
    }
  }

  function handleSolfegeStart(exercise: SolfegeExercise) {
    if (!canStartSolfege || !onsolfegestart) return;
    handleClose();
    onsolfegestart(exercise);
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isVisible}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="modal-backdrop"
    use:focusDialog
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
        <h2 id="chooser-title" class="modal-title">Lessons &amp; Exercises</h2>
        <button class="close-btn" onclick={handleClose} aria-label="Close">
          <span class="close-icon">×</span>
        </button>
      </div>

      <!-- Lessons, solmization, and exercises in one dialog -->
      <div class="modal-body">
        {#each sections as section (section.id)}
          <section class="chooser-column" aria-labelledby={`${section.id}-heading`}>
            <h3 id={`${section.id}-heading`} class="section-title">{section.title}</h3>
            {#if section.id === 'solmization' && onsolfegestart}
              <div class="exercise-list solfege-list">
                {#each SOLFEGE_EXERCISES as exercise (exercise.id)}
                  <button class="solfege-card" disabled={!canStartSolfege} onclick={() => handleSolfegeStart(exercise)}>
                    <strong>{exercise.name}</strong>
                  </button>
                {/each}
                {#if !canStartSolfege}<p class="solfege-hint">Close the current exercise or stop playback before opening solfege.</p>{/if}
              </div>
            {:else if section.entries.length === 0}
              <div class="empty-state">
                <p>No {section.title.toLowerCase()} available yet.</p>
              </div>
            {:else}
              <div class="exercise-list">
                {#each section.entries as entry (entry.template.id)}
                  <ExerciseCard
                    {entry}
                    isSelected={selectedLessonId === entry.template.id}
                    {localSettings}
                    onselect={() => handleLessonSelect(entry)}
                    onsettingchange={handleSettingChange}
                    onstart={handleStartLesson}
                    startLabel={section.startLabel}
                    showSettings={entry.template.category !== 'workshop'}
                  />
                {/each}
              </div>
            {/if}
          </section>
        {/each}
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
    background-color: var(--color-backdrop);
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
    max-width: 1280px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    background-color: var(--color-bg-light);
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
    border-bottom: 1px solid var(--color-border);
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
    background-color: var(--color-control);
    color: var(--color-text);
  }

  .close-icon {
    font-size: 24px;
    line-height: 1;
  }

  .modal-body {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .chooser-column {
    min-width: 0;
    min-height: 0;
    padding: var(--spacing-md);
    overflow-y: auto;
  }

  .chooser-column + .chooser-column {
    border-left: 1px solid var(--color-border);
  }

  .section-title {
    margin: 0 0 var(--spacing-md);
    color: var(--color-text);
    font-size: var(--font-size-lg);
    font-weight: 700;
  }

  .exercise-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .solfege-list {
    margin-bottom: var(--spacing-sm);
  }

  .solfege-card {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    padding: var(--spacing-md);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-panel);
    color: var(--color-text);
    text-align: left;
    font-size: var(--font-size-sm);
  }

  .solfege-card:hover:not(:disabled),
  .solfege-card:focus-visible {
    border-color: var(--color-primary);
  }

  .solfege-hint {
    color: var(--color-text-muted);
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
  @media (max-width: 800px) {
    .modal-content {
      max-width: 100%;
      max-height: 100%;
      border-radius: 0;
    }

    .modal-body {
      display: block;
      overflow-y: auto;
    }

    .chooser-column {
      overflow: visible;
    }

    .chooser-column + .chooser-column {
      border-left: none;
      border-top: 1px solid var(--color-border);
    }

  }
</style>
