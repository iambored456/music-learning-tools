<script lang="ts">
  import DifficultySettings from './DifficultySettings.svelte';
  import PitchHighlightToggle from './PitchHighlightToggle.svelte';
  import RelaxedMicGatesToggle from './RelaxedMicGatesToggle.svelte';
  import ThemeSettings from './ThemeSettings.svelte';
  import UltrastarControls from './UltrastarControls.svelte';
  import LyricLabelControls from './LyricLabelControls.svelte';
  import MicTrailSizeControl from './MicTrailSizeControl.svelte';

  type ColorTheme = 'light' | 'dark';

  interface Props {
    open: boolean;
    theme: ColorTheme;
    onClose: () => void;
    onThemeChange: (theme: ColorTheme) => void;
  }

  let { open, theme, onClose, onThemeChange }: Props = $props();

  function handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) onClose();
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && open) onClose();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="settings-backdrop"
    onclick={handleBackdropClick}
    role="dialog"
    aria-modal="true"
    aria-labelledby="settings-title"
    tabindex="-1"
  >
    <section id="settings-menu" class="settings-modal">
      <header class="settings-header">
        <h2 id="settings-title" class="settings-title">Settings</h2>
        <button class="close-btn" type="button" onclick={onClose} aria-label="Close settings">
          Close
        </button>
      </header>

      <div class="settings-stack">
        <section class="settings-section">
          <h3>Theme</h3>
          <div class="theme-toggle" role="group" aria-label="Color theme">
            <button
              class:active={theme === 'light'}
              type="button"
              onclick={() => onThemeChange('light')}
              aria-pressed={theme === 'light'}
            >
              Light
            </button>
            <button
              class:active={theme === 'dark'}
              type="button"
              onclick={() => onThemeChange('dark')}
              aria-pressed={theme === 'dark'}
            >
              Dark
            </button>
          </div>
        </section>

        <section class="settings-section">
          <h3>Lyrics</h3>
          <LyricLabelControls />
        </section>

        <section class="settings-section">
          <h3>Karaoke</h3>
          <UltrastarControls />
        </section>

        <section class="settings-section">
          <h3>Display</h3>
          <div class="section-body">
            <ThemeSettings />
            <PitchHighlightToggle />
            <MicTrailSizeControl />
          </div>
        </section>

        <section class="settings-section">
          <h3>Difficulty</h3>
          <DifficultySettings />
        </section>

        <section class="settings-section">
          <h3>Mic Testing</h3>
          <RelaxedMicGatesToggle />
        </section>
      </div>
    </section>
  </div>
{/if}

<style>
  .settings-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-lg);
    background: var(--color-backdrop);
    backdrop-filter: blur(6px);
  }

  .settings-modal {
    width: min(680px, 100%);
    max-height: min(92vh, 960px);
    overflow-y: auto;
    padding: var(--spacing-xl);
    border: 1px solid var(--color-border);
    border-radius: 24px;
    background: var(--color-bg-light);
    box-shadow: var(--shadow-lg);
    color: var(--color-text);
  }

  .settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
  }

  .settings-title {
    margin: 0;
    color: var(--color-text);
    font-size: clamp(1.5rem, 2vw, 2rem);
  }

  .close-btn {
    flex: 0 0 auto;
    padding: 0.55rem 0.9rem;
    border: 1px solid var(--color-border-strong);
    border-radius: 999px;
    background: var(--color-control);
    color: var(--color-text);
    font-size: var(--font-size-sm);
    font-weight: 600;
  }

  .close-btn:hover {
    border-color: var(--color-primary);
  }

  .settings-stack,
  .section-body {
    display: flex;
    flex-direction: column;
  }

  .settings-stack {
    gap: var(--spacing-lg);
  }

  .section-body {
    gap: var(--spacing-md);
  }

  .settings-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    width: 100%;
    min-width: 0;
    padding: var(--spacing-lg);
    border: 1px solid var(--color-border);
    border-radius: 18px;
    background: var(--color-panel-strong);
    color: var(--color-text);
  }

  .settings-section h3 {
    margin: 0;
    color: var(--color-text);
    font-size: var(--font-size-lg);
  }

  .theme-toggle {
    display: flex;
    gap: var(--spacing-sm);
  }

  .theme-toggle button {
    flex: 1;
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);
    background: var(--color-control);
    color: var(--color-text);
    font-weight: 700;
  }

  .theme-toggle button.active {
    border-color: var(--color-primary);
    background: var(--color-primary);
    color: #fff;
  }

  @media (max-width: 680px) {
    .settings-backdrop {
      padding: var(--spacing-xs);
    }

    .settings-modal {
      padding: var(--spacing-md);
      border-radius: 16px;
    }

    .settings-section {
      padding: var(--spacing-md);
    }
  }
</style>
