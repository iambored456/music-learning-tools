<script lang="ts">
  /**
   * Category Navigation Component
   *
   * Vertical list of category buttons for filtering lessons.
   */

  import type { LessonCategory } from '@mlt/lesson-templates';

  interface CategoryInfo {
    id: LessonCategory;
    label: string;
    icon: string;
  }

  interface Props {
    selectedCategory: LessonCategory;
    onselect: (category: LessonCategory) => void;
  }

  let { selectedCategory, onselect }: Props = $props();

  const categories: CategoryInfo[] = [
    { id: 'foundations', label: 'Foundations', icon: '🎯' },
    { id: 'beginning', label: 'Beginning Lessons', icon: '🎵' },
  ];

  function handleClick(category: LessonCategory) {
    onselect(category);
  }
</script>

<nav aria-label="Lesson categories">
  <div class="category-nav" role="tablist" aria-orientation="vertical">
    {#each categories as cat}
      <button
        class="category-btn"
        class:selected={selectedCategory === cat.id}
        onclick={() => handleClick(cat.id)}
        role="tab"
        aria-selected={selectedCategory === cat.id}
        tabindex={selectedCategory === cat.id ? 0 : -1}
      >
        <span class="category-icon">{cat.icon}</span>
        <span class="category-label">{cat.label}</span>
      </button>
    {/each}
  </div>
</nav>

<style>
  .category-nav {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    min-width: 140px;
  }

  .category-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    background-color: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    font-weight: 500;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .category-btn:hover {
    background-color: rgba(255, 255, 255, 0.05);
    color: var(--color-text);
  }

  .category-btn.selected {
    background-color: var(--color-primary);
    color: white;
  }

  .category-btn.selected:hover {
    background-color: var(--color-primary-dark, #4a7bc8);
  }

  .category-icon {
    font-size: var(--font-size-md);
    flex-shrink: 0;
  }

  .category-label {
    white-space: nowrap;
  }
</style>
