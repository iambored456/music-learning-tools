<script lang="ts">
  /**
   * AudioControlsBridge - Headless Svelte component
   *
   * This component manages tempo slider, DraggableNumber tempo inputs,
   * preset buttons, and tempo visualization.
   *
   * This replaces: src/components/toolbar/initializers/audioControlsInitializer.ts
   */
  import { onMount, onDestroy } from 'svelte';
  import store from '@state/initStore.ts';
  import DraggableNumber from '@components/ui/draggableNumber.ts';
  import tempoVisualizer from '@components/toolbar/tempoVisualizer.js';
  import logger from '@utils/logger.ts';
  import { PRESETS } from '@services/presetData.ts';

  // DOM references
  let tempoSlider: HTMLInputElement | null = null;
  let eighthNoteInput: InstanceType<typeof DraggableNumber> | null = null;
  let quarterNoteInput: InstanceType<typeof DraggableNumber> | null = null;
  let dottedQuarterInput: InstanceType<typeof DraggableNumber> | null = null;
  let presetContainer: HTMLElement | null = null;

  // State
  let isSliderPressed = $state(false);

  // Color helpers
  const darkenColor = (hex: string, percent = 20): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const darkenedR = Math.max(0, Math.floor(r * (1 - percent / 100)));
    const darkenedG = Math.max(0, Math.floor(g * (1 - percent / 100)));
    const darkenedB = Math.max(0, Math.floor(b * (1 - percent / 100)));
    return `#${darkenedR.toString(16).padStart(2, '0')}${darkenedG.toString(16).padStart(2, '0')}${darkenedB.toString(16).padStart(2, '0')}`;
  };

  const lightenColor = (hex: string, percent = 50): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const lightenedR = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
    const lightenedG = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
    const lightenedB = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));
    return `#${lightenedR.toString(16).padStart(2, '0')}${lightenedG.toString(16).padStart(2, '0')}${lightenedB.toString(16).padStart(2, '0')}`;
  };

  // Update tempo displays
  function updateTempoDisplays(baseBPM: number): void {
    const quarterBPM = Math.round(baseBPM);

    // Update slider if it exists
    const currentSlider = tempoSlider || document.getElementById('tempo-slider') as HTMLInputElement | null;
    if (currentSlider && parseInt(currentSlider.value, 10) !== quarterBPM) {
      currentSlider.value = `${quarterBPM}`;
    }

    const eighthBPM = quarterBPM * 2;
    const dottedQuarterBPM = Math.round(quarterBPM / 1.5);

    if (eighthNoteInput && eighthNoteInput.value !== eighthBPM) {
      eighthNoteInput.passiveUpdate(eighthBPM);
    }
    if (quarterNoteInput && quarterNoteInput.value !== quarterBPM) {
      quarterNoteInput.passiveUpdate(quarterBPM);
    }
    if (dottedQuarterInput && dottedQuarterInput.value !== dottedQuarterBPM) {
      dottedQuarterInput.passiveUpdate(dottedQuarterBPM);
    }

    if (store.state.tempo !== quarterBPM) {
      store.setTempo(quarterBPM);
      tempoVisualizer.updateTempo();
    }
  }

  // Create tempo marks on slider
  function createTempoMarks(slider: HTMLInputElement | null): void {
    if (!slider) return;
    const container = slider.closest('.tempo-slider-container');
    if (!container || container.querySelector('.tempo-slider-marks')) return;

    const marks = [60, 90, 120, 160, 200];
    const marksLayer = document.createElement('div');
    marksLayer.className = 'tempo-slider-marks';
    container.appendChild(marksLayer);

    const min = Number(slider.min) || 0;
    const max = Number(slider.max) || 1;
    const range = Math.max(max - min, 1);

    const markElements: { el: HTMLSpanElement; bpm: number }[] = [];

    const positionMarks = (): void => {
      const sliderRect = slider.getBoundingClientRect();
      const sliderHeight = sliderRect.height || slider.clientHeight;
      const sliderStyles = getComputedStyle(slider);
      const thumbSize = parseFloat(sliderStyles.getPropertyValue('--slider-thumb-size')) || 0;
      const thumbBorder = parseFloat(sliderStyles.getPropertyValue('--slider-thumb-border')) || 0;
      const thumbTotal = thumbSize + (thumbBorder * 2);

      const travelHeight = Math.max(sliderHeight - thumbTotal, 1);
      const origin = thumbTotal / 2;

      markElements.forEach(({ el, bpm }) => {
        if (bpm < min || bpm > max) {
          el.style.display = 'none';
          return;
        }
        el.style.display = '';
        const progress = (bpm - min) / range;
        const posPx = origin + (travelHeight * progress);
        el.style.bottom = `${posPx}px`;
      });
    };

    marks.forEach((bpm) => {
      const mark = document.createElement('span');
      mark.className = 'tempo-slider-mark';
      mark.setAttribute('aria-hidden', 'true');
      marksLayer.appendChild(mark);
      markElements.push({ el: mark, bpm });
    });

    positionMarks();

    const resizeObserver = new ResizeObserver(positionMarks);
    resizeObserver.observe(slider);
  }

  // Update preset selection
  function updatePresetSelection(color: string | null | undefined): void {
    if (!color || !presetContainer) return;

    const timbre = store.state.timbres[color];
    const palette = store.state.colorPalette[color] || { primary: color, light: color };
    const lightColor = palette.light;
    const primaryColor = palette.primary;

    document.querySelectorAll('.preset-button').forEach(btn => {
      const buttonEl = btn as HTMLElement;
      const presetId = buttonEl.id.replace('preset-', '');
      const isSelected = timbre?.activePresetName === presetId;
      buttonEl.classList.toggle('selected', isSelected);
    });

    const extraLightColor = lightenColor(lightColor, 60);
    presetContainer.style.setProperty('--c-accent', primaryColor);
    presetContainer.style.setProperty('--c-accent-light', extraLightColor);
    presetContainer.style.setProperty('--c-accent-hover', darkenColor(primaryColor, 20));
  }

  // Event handlers
  function handleSliderMouseDown(): void {
    isSliderPressed = true;
    tempoVisualizer.start();
  }

  function handleSliderTouchStart(): void {
    isSliderPressed = true;
    tempoVisualizer.start();
  }

  function handleSliderInput(e: Event): void {
    const target = e.target as HTMLInputElement | null;
    const tempo = target ? parseInt(target.value, 10) : NaN;
    updateTempoDisplays(tempo);
  }

  function handleSliderMouseUp(): void {
    tempoSlider?.blur();
  }

  function handleDocumentMouseUp(): void {
    if (isSliderPressed) {
      isSliderPressed = false;
      tempoVisualizer.stop();
    }
  }

  function handleDocumentTouchEnd(): void {
    if (isSliderPressed) {
      isSliderPressed = false;
      tempoVisualizer.stop();
    }
  }

  function handleDocumentTouchCancel(): void {
    if (isSliderPressed) {
      isSliderPressed = false;
      tempoVisualizer.stop();
    }
  }

  // Store event handlers
  function handleNoteChanged(data?: { newNote?: { color?: string } }): void {
    if (data?.newNote?.color) {
      updatePresetSelection(data.newNote.color);
    } else {
      document.querySelectorAll('.preset-button').forEach(btn => btn.classList.remove('selected'));
      if (presetContainer) {
        presetContainer.style.setProperty('--c-accent', '#4A90E2');
        presetContainer.style.setProperty('--c-accent-hover', '#357ABD');
      }
    }
  }

  function handleTimbreChanged(color?: string): void {
    if (!color) return;
    if (color === store.state.selectedNote?.color) {
      updatePresetSelection(color);
    }
  }

  function handleTempoChanged(newTempo?: number): void {
    if (newTempo === undefined) return;
    updateTempoDisplays(newTempo);
  }

  onMount(() => {
    tempoSlider = document.getElementById('tempo-slider') as HTMLInputElement | null;
    presetContainer = document.querySelector<HTMLElement>('.preset-effects-container');

    // Initialize DraggableNumber components
    const tempoInputConfig = {
      size: [45, 24] as [number, number],
      step: 1,
      decimalPlaces: 0,
      useAppStyling: true
    };

    eighthNoteInput = new DraggableNumber('#eighth-note-tempo', {
      ...tempoInputConfig,
      value: 180,
      min: 60,
      max: 480
    });

    quarterNoteInput = new DraggableNumber('#quarter-note-tempo', {
      ...tempoInputConfig,
      value: 90,
      min: 30,
      max: 240
    });

    dottedQuarterInput = new DraggableNumber('#dotted-quarter-tempo', {
      ...tempoInputConfig,
      value: 60,
      min: 20,
      max: 160
    });

    // Set up draggable number input handlers
    eighthNoteInput.on('change', (val: number) => {
      if (!isNaN(val) && val > 0) updateTempoDisplays(val / 2);
    });
    quarterNoteInput.on('change', (val: number) => {
      if (!isNaN(val) && val > 0) updateTempoDisplays(val);
    });
    dottedQuarterInput.on('change', (val: number) => {
      if (!isNaN(val) && val > 0) updateTempoDisplays(val * 1.5);
    });

    // Initialize tempo displays
    updateTempoDisplays(store.state.tempo);

    // Set up tempo slider
    if (tempoSlider) {
      createTempoMarks(tempoSlider);

      tempoSlider.addEventListener('mousedown', handleSliderMouseDown);
      tempoSlider.addEventListener('touchstart', handleSliderTouchStart);
      tempoSlider.addEventListener('input', handleSliderInput);
      tempoSlider.addEventListener('mouseup', handleSliderMouseUp);

      updateTempoDisplays(store.state.tempo);
    } else {
      logger.warn('AudioControlsBridge', 'Tempo slider not found - will initialize when rhythm tab is opened', null, 'toolbar');
    }

    // Global event listeners
    document.addEventListener('mouseup', handleDocumentMouseUp);
    document.addEventListener('touchend', handleDocumentTouchEnd);
    document.addEventListener('touchcancel', handleDocumentTouchCancel);

    // Preset button handlers
    document.querySelectorAll('.preset-button').forEach(btn => {
      const button = btn as HTMLElement;
      const presetId = button.id.replace('preset-', '');
      const preset = (PRESETS as Record<string, any>)[presetId];
      if (preset) {
        button.addEventListener('click', () => {
          const currentColor = store.state.selectedNote?.color;
          if (currentColor) {
            store.applyPreset(currentColor, preset);
            setTimeout(() => updatePresetSelection(currentColor), 10);
          }
          button.blur();
        });
      }
    });

    // Store subscriptions
    store.on('noteChanged', handleNoteChanged);
    store.on('timbreChanged', handleTimbreChanged);
    store.on('tempoChanged', handleTempoChanged);

    // Initialize preset selection
    const initialColor = store.state.selectedNote?.color;
    if (initialColor) {
      updatePresetSelection(initialColor);
    }

    console.log('[Svelte] AudioControlsBridge mounted');
  });

  onDestroy(() => {
    // Remove event listeners
    tempoSlider?.removeEventListener('mousedown', handleSliderMouseDown);
    tempoSlider?.removeEventListener('touchstart', handleSliderTouchStart);
    tempoSlider?.removeEventListener('input', handleSliderInput);
    tempoSlider?.removeEventListener('mouseup', handleSliderMouseUp);

    document.removeEventListener('mouseup', handleDocumentMouseUp);
    document.removeEventListener('touchend', handleDocumentTouchEnd);
    document.removeEventListener('touchcancel', handleDocumentTouchCancel);

    console.log('[Svelte] AudioControlsBridge unmounted');
  });
</script>

<!-- This is a headless component - no DOM output -->
