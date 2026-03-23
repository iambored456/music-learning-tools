<script lang="ts">
  import DifficultySettings from './DifficultySettings.svelte';
  import LyricLabelControls from './LyricLabelControls.svelte';
  import PitchHighlightToggle from './PitchHighlightToggle.svelte';
  import RelaxedMicGatesToggle from './RelaxedMicGatesToggle.svelte';
  import ThemeSettings from './ThemeSettings.svelte';
  import UltrastarControls from './UltrastarControls.svelte';

  interface Props {
    open: boolean;
    onClose: () => void;
  }

  let { open, onClose }: Props = $props();

  function handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && open) {
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="construction-backdrop"
    onclick={handleBackdropClick}
    role="dialog"
    aria-modal="true"
    aria-labelledby="construction-zone-title"
    tabindex="-1"
  >
    <section id="construction-zone" class="construction-modal">
      <header class="construction-header">
        <div class="construction-copy">
          <p class="construction-eyebrow">Construction</p>
          <h2 id="construction-zone-title" class="construction-title">Construction Zone</h2>
          <p class="construction-description">
            Experimental controls live here while the main singing-trainer sidebar is being simplified.
          </p>
        </div>
        <button class="close-btn" type="button" onclick={onClose} aria-label="Close construction zone">
          Close
        </button>
      </header>

      <div class="construction-grid">
        <section class="construction-section construction-section--wide">
          <div class="section-copy">
            <h3>UltraStar Karaoke</h3>
            <p>Song loading, video sync, and lyric display controls.</p>
          </div>
          <div class="section-body">
            <UltrastarControls />
            <LyricLabelControls showModeToggle={true} />
          </div>
        </section>

        <section class="construction-section">
          <div class="section-copy">
            <h3>Theme Settings</h3>
            <p>Note style, colour treatment, trail size, and pitch highlight controls.</p>
          </div>
          <div class="section-body">
            <ThemeSettings />
            <PitchHighlightToggle />
          </div>
        </section>

        <section class="construction-section">
          <div class="section-copy">
            <h3>Difficulty</h3>
            <p>Scoring strictness, timing windows, and note validation thresholds.</p>
          </div>
          <DifficultySettings />
        </section>

        <section class="construction-section">
          <div class="section-copy">
            <h3>Mic Testing</h3>
            <p>Temporary validation bypasses for user-testing sessions.</p>
          </div>
          <RelaxedMicGatesToggle />
        </section>
      </div>
    </section>
  </div>
{/if}

<style>
  .construction-backdrop {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-lg);
    background: rgba(2, 6, 15, 0.78);
    backdrop-filter: blur(6px);
    z-index: 1100;
  }

  .construction-modal {
    width: min(1040px, 100%);
    max-height: min(90vh, 920px);
    overflow: auto;
    background:
      linear-gradient(180deg, rgba(12, 21, 42, 0.98), rgba(8, 15, 30, 0.98));
    border: 1px solid rgba(118, 170, 255, 0.18);
    border-radius: 24px;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.45);
    padding: var(--spacing-xl);
  }

  .construction-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
  }

  .construction-copy {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .construction-eyebrow {
    margin: 0;
    font-size: var(--font-size-xs);
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #f1b74a;
  }

  .construction-title {
    margin: 0;
    font-size: clamp(1.5rem, 2vw, 2rem);
    color: var(--color-text);
  }

  .construction-description {
    margin: 0;
    max-width: 48rem;
    color: var(--color-text-muted);
    line-height: 1.5;
  }

  .close-btn {
    flex: 0 0 auto;
    padding: 0.65rem 1rem;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.06);
    color: var(--color-text);
    font-size: var(--font-size-sm);
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.24);
  }

  .construction-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.65fr) minmax(280px, 1fr);
    gap: var(--spacing-lg);
  }

  .construction-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    min-width: 0;
    padding: var(--spacing-lg);
    border-radius: 20px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.04));
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .construction-section--wide {
    grid-column: 1 / -1;
  }

  .section-copy {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .section-copy h3 {
    margin: 0;
    font-size: var(--font-size-lg);
    color: var(--color-text);
  }

  .section-copy p {
    margin: 0;
    color: var(--color-text-muted);
    line-height: 1.45;
  }

  .section-body {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  @media (max-width: 860px) {
    .construction-backdrop {
      padding: var(--spacing-sm);
    }

    .construction-modal {
      padding: var(--spacing-lg);
      border-radius: 18px;
    }

    .construction-header {
      flex-direction: column;
    }

    .close-btn {
      align-self: flex-start;
    }

    .construction-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .construction-section--wide {
      grid-column: auto;
    }
  }
</style>
