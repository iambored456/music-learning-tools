<script lang="ts">
  export interface ViewportInfoToastProps {
    lines?: string[];
    triggerKey?: number;
    hideAfterMs?: number;
    position?: 'fixed' | 'absolute';
    top?: string;
    right?: string;
    zIndex?: number;
  }

  let {
    lines = [],
    triggerKey = 0,
    hideAfterMs = 2000,
    position = 'fixed',
    top = '20px',
    right = '20px',
    zIndex = 1000,
  }: ViewportInfoToastProps = $props();

  let isVisible = $state(false);
  let hideTimeout: ReturnType<typeof setTimeout> | null = null;
  let hasMounted = false;

  function clearHideTimeout(): void {
    if (hideTimeout === null) return;
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }

  function show(): void {
    if (lines.length === 0) return;
    isVisible = true;
    clearHideTimeout();
    hideTimeout = setTimeout(() => {
      isVisible = false;
      hideTimeout = null;
    }, Math.max(250, Math.round(hideAfterMs)));
  }

  $effect(() => {
    void triggerKey;
    if (!hasMounted) {
      hasMounted = true;
      return;
    }
    show();
  });

  $effect(() => {
    return () => {
      clearHideTimeout();
    };
  });
</script>

{#if isVisible && lines.length > 0}
  <div
    class="viewport-info-toast"
    style:position={position}
    style:top={top}
    style:right={right}
    style:z-index={zIndex}
  >
    {#each lines as line (line)}
      <div class="viewport-info-toast__line">{line}</div>
    {/each}
  </div>
{/if}

<style>
  .viewport-info-toast {
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: rgba(0, 0, 0, 0.8);
    color: var(--text-color-inverse, #fff);
    padding: 8px 12px;
    border-radius: 6px;
    font-family: var(--typography-diagnostic-font-family, monospace);
    font-size: var(--typography-diagnostic-font-size, 12px);
    font-weight: var(--typography-diagnostic-font-weight, 400);
    line-height: var(--typography-diagnostic-line-height, 1.4);
    letter-spacing: var(--typography-diagnostic-letter-spacing, 0);
    pointer-events: none;
    animation: viewport-info-toast-fade-in 0.2s ease-out;
  }

  .viewport-info-toast__line {
    white-space: nowrap;
  }

  @keyframes viewport-info-toast-fade-in {
    from {
      opacity: 0;
      transform: translateY(-2px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
