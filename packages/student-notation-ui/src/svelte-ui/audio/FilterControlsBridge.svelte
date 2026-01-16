<script lang="ts">
  /**
   * FilterControlsBridge - Svelte 5 component for harmonics filter controls
   *
   * This replaces the imperative code in:
   * - src/components/audio/harmonicsFilter/filterControls.ts
   *
   * Converts module-level state to $state and uses $effect for subscriptions.
   */
  import store from '@state/initStore.ts';
  import logger from '@utils/logger.ts';

  interface FilterSettings {
    enabled?: boolean;
    blend?: number;
    cutoff?: number;
    resonance?: number;
    type?: string;
    mix?: number;
  }

  const CUTOFF_MIN = 1;
  const CUTOFF_MAX = 31;
  const BLEND_MIN = 0;
  const BLEND_MAX = 2;

  // Reactive state using Svelte 5 runes
  let isDraggingCutoff = false;
  let isDraggingBlend = false;
  let isDraggingVerticalBlend = false;
  let currentColor: string | null = store.state.selectedNote?.color || '#4a90e2';

  // DOM element references
  let blendThumb: HTMLElement | null = null;
  let blendTrack: HTMLElement | null = null;
  let cutoffThumb: HTMLElement | null = null;
  let cutoffTrack: HTMLElement | null = null;
  let container: HTMLElement | null = null;
  let verticalBlendSlider: HTMLElement | null = null;
  let verticalBlendTrack: HTMLElement | null = null;

  function getFilterState(): FilterSettings | null {
    if (!currentColor) return null;
    const timbre = store.state.timbres[currentColor];
    if (!timbre) return null;
    if (!timbre.filter) {
      timbre.filter = { enabled: true, blend: 1.0, cutoff: 16, resonance: 0, type: 'lowpass', mix: 0 };
    } else if (timbre.filter.enabled === undefined) {
      timbre.filter.enabled = true;
    }
    return timbre.filter;
  }

  function updateFromStore() {
    const filter = getFilterState();
    if (!filter) return;

    const { cutoff = 16, blend = 0, mix = 0 } = filter;

    if (blendThumb && blendTrack) {
      const blendPercent = (BLEND_MAX - blend) / (BLEND_MAX - BLEND_MIN);
      blendThumb.style.left = `${blendPercent * 100}%`;
      blendTrack.style.setProperty('--progress', `${blendPercent * 100}%`);
    }

    if (verticalBlendSlider && verticalBlendTrack) {
      const mixPercent = (mix || 0) / 100;
      verticalBlendSlider.style.bottom = `${mixPercent * 100}%`;
      verticalBlendTrack.style.setProperty('--blend-progress', `${mixPercent * 100}%`);
    }

    if (cutoffThumb && cutoffTrack) {
      const cutoffPercent = (cutoff - CUTOFF_MIN) / (CUTOFF_MAX - CUTOFF_MIN);
      cutoffThumb.style.left = `${cutoffPercent * 100}%`;
      cutoffThumb.style.top = '50%';
      cutoffThumb.style.transform = 'translate(-50%, -50%)';
      cutoffTrack.style.setProperty('--progress', `${cutoffPercent * 100}%`);
    }

    if (container && currentColor) {
      container.style.setProperty('--c-accent', currentColor);
    }
  }

  function handleCutoffDrag(e: PointerEvent) {
    if (!isDraggingCutoff || !currentColor || !cutoffTrack) return;
    const rect = cutoffTrack.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = rect.width;
    let percent = x / w;
    percent = Math.max(0, Math.min(1, percent));
    const value = percent * (CUTOFF_MAX - CUTOFF_MIN) + CUTOFF_MIN;
    store.setFilterSettings(currentColor, { cutoff: value });
  }

  function handleBlendDrag(e: PointerEvent) {
    if (!isDraggingBlend || !currentColor || !blendTrack) return;
    const rect = blendTrack.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = rect.width;
    let percent = x / w;
    percent = Math.max(0, Math.min(1, percent));
    const value = BLEND_MAX - percent * (BLEND_MAX - BLEND_MIN);
    store.setFilterSettings(currentColor, { blend: value });
  }

  function handleVerticalBlendDrag(e: PointerEvent) {
    if (!isDraggingVerticalBlend || !currentColor || !verticalBlendTrack) return;
    const rect = verticalBlendTrack.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const h = rect.height;
    let percent = 1 - y / h;
    percent = Math.max(0, Math.min(1, percent));
    const value = percent * 100;
    store.setFilterSettings(currentColor, { mix: value });
  }

  // Initialize DOM elements and event handlers using $effect
  $effect(() => {
    container = document.querySelector('.filter-container');
    blendThumb = document.getElementById('thumb-b');
    blendTrack = document.getElementById('blend-slider-container');
    cutoffThumb = document.getElementById('thumb-c');
    cutoffTrack = document.getElementById('cutoff-slider-container');
    verticalBlendTrack = document.getElementById('vertical-blend-track');
    verticalBlendSlider = document.getElementById('vertical-blend-thumb');

    if (!container || !blendThumb || !cutoffThumb || !verticalBlendSlider || !verticalBlendTrack) {
      logger.error(
        'FilterControlsBridge',
        'Missing required elements',
        { container, blendThumb, cutoffThumb, verticalBlendSlider, verticalBlendTrack },
        'filter'
      );
      return;
    }

    // Blend thumb event handlers
    const handleBlendPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      isDraggingBlend = true;
      document.body.style.cursor = 'ew-resize';

      const onMove = (ev: PointerEvent) => handleBlendDrag(ev);
      const onUp = () => {
        isDraggingBlend = false;
        document.body.style.cursor = 'default';
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        store.recordState();
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    };

    // Cutoff thumb event handlers
    const handleCutoffPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      isDraggingCutoff = true;
      document.body.style.cursor = 'ew-resize';

      const onMove = (ev: PointerEvent) => handleCutoffDrag(ev);
      const onUp = () => {
        isDraggingCutoff = false;
        document.body.style.cursor = 'default';
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        store.recordState();
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    };

    // Vertical blend thumb event handlers
    const handleVerticalBlendPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      isDraggingVerticalBlend = true;
      document.body.style.cursor = 'ns-resize';

      const onMove = (ev: PointerEvent) => handleVerticalBlendDrag(ev);
      const onUp = () => {
        isDraggingVerticalBlend = false;
        document.body.style.cursor = 'default';
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        store.recordState();
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    };

    // Attach event listeners
    blendThumb.addEventListener('pointerdown', handleBlendPointerDown);
    cutoffThumb.addEventListener('pointerdown', handleCutoffPointerDown);
    verticalBlendSlider.addEventListener('pointerdown', handleVerticalBlendPointerDown);

    // Subscribe to store events
    const handleNoteChanged = ({ newNote }: { newNote?: { color?: string } } = {}) => {
      if (newNote?.color && newNote.color !== currentColor) {
        currentColor = newNote.color;
        updateFromStore();
      }
    };

    const handleTimbreChanged = (color?: string) => {
      if (color && color === currentColor) {
        updateFromStore();
      }
    };

    store.on('noteChanged', handleNoteChanged);
    store.on('timbreChanged', handleTimbreChanged);

    // Initial update
    updateFromStore();

    logger.info('FilterControlsBridge', 'Filter controls initialized', null, 'filter');

    // Cleanup on unmount
    return () => {
      blendThumb?.removeEventListener('pointerdown', handleBlendPointerDown);
      cutoffThumb?.removeEventListener('pointerdown', handleCutoffPointerDown);
      verticalBlendSlider?.removeEventListener('pointerdown', handleVerticalBlendPointerDown);

      store.off('noteChanged', handleNoteChanged);
      store.off('timbreChanged', handleTimbreChanged);
    };
  });
</script>

<!-- This is a headless component - no DOM output -->
