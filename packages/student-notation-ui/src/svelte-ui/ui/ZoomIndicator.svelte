<script lang="ts">
  /**
   * ZoomIndicator - Svelte 5 component for zoom feedback
   *
   * This replaces: src/components/ui/zoomIndicator.ts
   *
   * Shows a temporary indicator when zooming in/out with zoom percentage
   * and visible semitone range.
   */
  import store from '@state/initStore.ts';
  import pitchGridViewportService from '@services/pitchGridViewportService.ts';

  // Reactive state using Svelte 5 runes
  let isVisible = $state(false);
  let zoomText = $state('Zoom: 100%');
  let hideTimeout: ReturnType<typeof setTimeout> | null = null;

  function updateZoomDisplay() {
    let zoomPercent = 100;
    let visibilityText = '';

    const viewportInfo = pitchGridViewportService.getViewportInfo();
    if (viewportInfo) {
      zoomPercent = Math.round((viewportInfo.zoomLevel ?? 1) * 100);

      if ((viewportInfo as any).canSeeFullRange) {
        visibilityText = ' (Full Range)';
      } else {
        const startRank = viewportInfo.startRank ?? (viewportInfo as any).startRow ?? 0;
        const endRank = viewportInfo.endRank ?? (viewportInfo as any).endRow ?? startRank;
        // `endRank` is an exclusive upper bound, so the visible row count is `endRank - startRank`.
        const visibleSemitones = Math.max(0, Math.floor(endRank - startRank));
        visibilityText = ` (~${visibleSemitones} semitones)`;
      }
    }

    zoomText = `Zoom: ${zoomPercent}%${visibilityText}`;
  }

  function show() {
    updateZoomDisplay();
    isVisible = true;

    // Auto-hide after 2 seconds
    if (hideTimeout !== null) {
      clearTimeout(hideTimeout);
    }
    hideTimeout = setTimeout(() => {
      isVisible = false;
      hideTimeout = null;
    }, 2000);
  }

  // Subscribe to zoom events using $effect
  $effect(() => {
    const handleZoom = () => show();

    store.on('zoomIn', handleZoom);
    store.on('zoomOut', handleZoom);

    // Cleanup on unmount
    return () => {
      store.off('zoomIn', handleZoom);
      store.off('zoomOut', handleZoom);

      if (hideTimeout !== null) {
        clearTimeout(hideTimeout);
      }
    };
  });
</script>

{#if isVisible}
  <div class="zoom-indicator">
    {zoomText}
  </div>
{/if}

<style>
  .zoom-indicator {
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-family: monospace;
    font-size: 12px;
    z-index: 1000;
    pointer-events: none;
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>
