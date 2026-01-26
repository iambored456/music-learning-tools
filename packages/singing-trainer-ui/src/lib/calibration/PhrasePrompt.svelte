<script lang="ts">
  /**
   * PhrasePrompt Component
   *
   * Displays the phrase to be spoken during calibration.
   */

  interface Props {
    phrase: string;
    isActive?: boolean;
  }

  let { phrase, isActive = false }: Props = $props();
</script>

<div class="phrase-prompt" class:active={isActive}>
  <p class="phrase-text">"{phrase}"</p>
</div>

<style>
  .phrase-prompt {
    padding: var(--spacing-lg, 1.5rem);
    background: var(--color-surface, rgba(255, 255, 255, 0.05));
    border-radius: var(--radius-lg, 12px);
    text-align: center;
    transition: all 0.3s ease;
  }

  .phrase-prompt.active {
    background: var(--color-primary-alpha, rgba(99, 141, 211, 0.15));
    border: 2px solid var(--color-primary, #638dd3);
  }

  .phrase-text {
    font-size: var(--font-size-xl, 1.5rem);
    font-weight: 500;
    color: var(--color-text, #fff);
    margin: 0;
    line-height: 1.4;
    font-style: italic;
  }
</style>
