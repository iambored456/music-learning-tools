<script lang="ts">
  let { label, options, selected, active = true, disabled = false, onselect }: {
    label: string;
    options: readonly [string, string];
    selected: string;
    active?: boolean;
    disabled?: boolean;
    onselect: (value: string) => void;
  } = $props();
</script>

<div class="segmented-toggle" class:inactive={!active} data-second={selected === options[1]} role="group" aria-label={label}>
  {#each options as option}
    <button type="button" class:active={active && selected === option} {disabled}
      aria-pressed={active && selected === option} onclick={() => onselect(option)}>{option}</button>
  {/each}
</div>

<style>
  .segmented-toggle {
    position: relative;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-self: center;
    width: min(100%, 230px);
    padding: 2px;
    border: 1px solid var(--color-border-strong);
    border-radius: 999px;
    background: var(--color-control);
    isolation: isolate;
  }

  .segmented-toggle::before {
    position: absolute;
    z-index: 0;
    top: 2px;
    bottom: 2px;
    left: 2px;
    width: calc((100% - 4px) / 2);
    border-radius: 999px;
    background: var(--color-secondary);
    box-shadow: 0 1px 4px color-mix(in srgb, var(--color-secondary) 35%, transparent);
    content: '';
    transition: transform 0.18s ease, opacity 0.18s ease;
  }

  .segmented-toggle[data-second='true']::before {
    transform: translateX(100%);
  }

  .segmented-toggle button {
    position: relative;
    z-index: 1;
    min-height: 28px;
    padding: 3px 10px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    font-weight: 700;
    transition: color 0.18s ease;
  }

  .segmented-toggle button:hover:not(.active) {
    color: var(--color-text);
  }

  .segmented-toggle button.active {
    color: var(--color-on-accent);
  }

  .segmented-toggle button:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 1px;
  }

  .segmented-toggle.inactive::before { opacity: 0; }
  .segmented-toggle button:disabled { cursor: wait; opacity: 0.6; }
  @media (prefers-reduced-motion: reduce) {
    .segmented-toggle::before, .segmented-toggle button { transition: none; }
  }
</style>
