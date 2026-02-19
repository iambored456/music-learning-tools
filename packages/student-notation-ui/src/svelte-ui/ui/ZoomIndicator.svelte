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
  import { ViewportInfoToast } from '@mlt/ui-components';

  let lines = $state<string[]>([]);
  let triggerKey = $state(0);

  function buildZoomDisplayText(): string {
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

    return `Zoom: ${zoomPercent}%${visibilityText}`;
  }

  function show() {
    lines = [buildZoomDisplayText()];
    triggerKey += 1;
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
    };
  });
</script>

<ViewportInfoToast {lines} {triggerKey} />
