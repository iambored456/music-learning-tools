<script lang="ts">
  /**
   * ToolSelectorBridge - Headless Svelte component
   *
   * This is a large component that handles tool selection, chord/interval buttons,
   * degree display toggles, and various UI state management.
   *
   * This replaces: src/components/toolbar/initializers/toolSelectorInitializer.ts
   */
  import { onMount, onDestroy } from 'svelte';
  import store from '@state/initStore.ts';
  import SixteenthStampsToolbar from '@components/rhythm/stampToolbars/sixteenthStampsToolbar.ts';
  import domCache from '@services/domCache.ts';
  import notificationSystem from '@components/ui/notificationSystem.ts';
  import clefRangeController from '@components/clefWheels/clefRangeController.ts';
  import logger from '@utils/logger.ts';
  import {
    BASIC_CHORD_SHAPES,
    ADVANCED_CHORD_SHAPES,
    CHORD_SHAPES,
    INTERVAL_SHAPES,
    normalizeInterval
  } from '@data/chordDefinitions.ts';

  // Types
  type DegreeDisplayMode = 'off' | 'diatonic' | 'modal';

  interface ToolChangedPayload {
    newTool?: string;
  }

  interface NoteChangedPayload {
    newNote?: { color?: string; shape?: 'circle' | 'oval' | 'diamond' };
  }

  // Constants
  const SIXTEENTH_FULL_STAMP_ID = 15;

  // State
  let lastDegreeMode: Exclude<DegreeDisplayMode, 'off'> = $state('diatonic');
  let previousMode = $state<'inversion' | 'position'>('position');

  // DOM references (will be populated on mount)
  let eraserBtn: HTMLElement | null = null;
  let degreeVisibilityToggle: HTMLElement | null = null;
  let degreeModeToggle: HTMLElement | null = null;
  let degreeModeScaleButton: HTMLButtonElement | null = null;
  let degreeModeModalButton: HTMLButtonElement | null = null;
  let flatBtn: HTMLElement | null = null;
  let sharpBtn: HTMLElement | null = null;
  let frequencyBtn: HTMLElement | null = null;
  let octaveToggleBtn: HTMLElement | null = null;
  let focusColoursToggle: HTMLInputElement | null = null;
  let harmonyContainer: HTMLElement | null = null;
  let unifiedPositionToggle: HTMLElement | null = null;
  let chordsPanel: HTMLElement | null = null;
  let intervalsPanel: HTMLElement | null = null;
  let tonicModeButtons: HTMLButtonElement[] = [];

  // Helper functions
  function hasTonicShapesOnCanvas(): boolean {
    return Object.keys(store.state.tonicSignGroups).length > 0;
  }

  function updateScaleModeToggleState(mode: DegreeDisplayMode = store.state.degreeDisplayMode): void {
    const scaleButton = degreeModeToggle?.querySelector<HTMLButtonElement>('[data-mode="diatonic"]');
    const modeButton = degreeModeToggle?.querySelector<HTMLButtonElement>('[data-mode="modal"]');

    if (!scaleButton || !modeButton) return;

    if (mode !== 'off') {
      lastDegreeMode = mode;
    }

    const effectiveMode: Exclude<DegreeDisplayMode, 'off'> = mode === 'off' ? lastDegreeMode : mode;
    const isDegreesOff = mode === 'off';

    [scaleButton, modeButton].forEach(button => {
      button.disabled = isDegreesOff;
      button.classList.toggle('disabled', isDegreesOff);
    });

    if (degreeModeToggle) {
      degreeModeToggle.classList.toggle('disabled', isDegreesOff);
    }

    scaleButton.classList.toggle('active', effectiveMode === 'diatonic');
    scaleButton.setAttribute('aria-pressed', effectiveMode === 'diatonic' ? 'true' : 'false');
    modeButton.classList.toggle('active', effectiveMode === 'modal');
    modeButton.setAttribute('aria-pressed', effectiveMode === 'modal' ? 'true' : 'false');
  }

  function syncDegreeVisibilityButton(mode: DegreeDisplayMode, visibilityButton: HTMLElement | null): void {
    if (!visibilityButton) return;
    const isOn = mode !== 'off';
    visibilityButton.classList.toggle('active', isOn);
    visibilityButton.setAttribute('aria-pressed', isOn ? 'true' : 'false');
  }

  function updateChordButtonSelection(): void {
    if (!chordsPanel) return;

    chordsPanel.querySelectorAll<HTMLButtonElement>('.harmony-preset-button').forEach(el => {
      el.classList.remove('selected', 'partial-match');
    });

    if (store.state.activeChordIntervals) {
      const currentIntervals = store.state.activeChordIntervals;
      const currentIntervalsString = currentIntervals.toString();
      const normalizedCurrentIntervals = currentIntervals.map(normalizeInterval);

      const buttons = chordsPanel.querySelectorAll<HTMLButtonElement>('.harmony-preset-button');
      for (const button of buttons) {
        const label = button.textContent?.trim() ?? '';
        const buttonIntervals = CHORD_SHAPES[label];
        if (!buttonIntervals) continue;

        const buttonIntervalsString = buttonIntervals.toString();
        const normalizedButtonIntervals = buttonIntervals.map(normalizeInterval);

        if (buttonIntervalsString === currentIntervalsString) {
          button.classList.add('selected');
          continue;
        }

        const isPartialMatch = normalizedCurrentIntervals.every(interval =>
          normalizedButtonIntervals.includes(interval)
        );

        if (isPartialMatch) {
          button.classList.add('partial-match');
        }
      }
    }
  }

  function updateIntervalButtonSelection(): void {
    if (!intervalsPanel) return;

    intervalsPanel.querySelectorAll<HTMLButtonElement>('.harmony-preset-button').forEach(el =>
      el.classList.remove('selected')
    );

    if (store.state.activeChordIntervals) {
      const activeIntervals = store.state.activeChordIntervals;
      const normalizedActiveIntervals = activeIntervals.map(normalizeInterval);

      intervalsPanel.querySelectorAll<HTMLButtonElement>('.harmony-preset-button').forEach(button => {
        const intervalLabel = button.textContent?.trim() ?? '';
        const buttonInterval = INTERVAL_SHAPES[intervalLabel];
        const firstInterval = buttonInterval?.[0];
        if (firstInterval && normalizedActiveIntervals.includes(firstInterval)) {
          button.classList.add('selected');
        }
      });
    }
  }

  // Color helpers
  const lightenColor = (hex: string, percent = 50): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const lightenedR = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
    const lightenedG = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
    const lightenedB = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));
    return `#${lightenedR.toString(16).padStart(2, '0')}${lightenedG.toString(16).padStart(2, '0')}${lightenedB.toString(16).padStart(2, '0')}`;
  };

  const hexToRgba = (hex: string, alpha = 1): string => {
    const normalizedHex = hex.startsWith('#') ? hex.slice(1) : hex;
    if (normalizedHex.length !== 6) return hex;
    const r = parseInt(normalizedHex.slice(0, 2), 16);
    const g = parseInt(normalizedHex.slice(2, 4), 16);
    const b = parseInt(normalizedHex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const applyHarmonyAccentColors = (container: HTMLElement | null, color: string): void => {
    if (!container) return;
    const lightColor = lightenColor(color, 50);
    const extraLightColor = lightenColor(lightColor, 60);
    container.style.setProperty('--c-accent', color);
    container.style.setProperty('--c-accent-light', extraLightColor);
    container.style.setProperty('--harmony-partial-bg', hexToRgba(extraLightColor, 0.25));
    container.style.setProperty('--harmony-partial-border', hexToRgba(color, 0.4));
    container.style.setProperty('--harmony-partial-bg-hover', hexToRgba(extraLightColor, 0.4));
    container.style.setProperty('--harmony-partial-border-hover', hexToRgba(color, 0.6));
  };

  // Position toggle helpers
  function getToggleMode(): 'inversion' | 'position' {
    const noteCount = store.state.activeChordIntervals?.length ?? 0;
    return noteCount === 2 ? 'inversion' : 'position';
  }

  function getMaxSteps(): number {
    const noteCount = store.state.activeChordIntervals?.length ?? 1;
    if (noteCount === 2) return 2;
    return Math.max(1, noteCount);
  }

  function getCurrentStep(): number {
    const mode = getToggleMode();
    if (mode === 'inversion') {
      return store.state.isIntervalsInverted ? 1 : 0;
    }
    return store.state.chordPositionState;
  }

  function setStepValue(step: number): void {
    const mode = getToggleMode();
    if (mode === 'inversion') {
      store.setIntervalsInversion(step === 1);
    } else {
      store.setChordPosition(step);
    }
  }

  function updateUnifiedToggleVisual(): void {
    if (!unifiedPositionToggle) return;

    const mode = getToggleMode();
    const currentStep = getCurrentStep();
    const noteCount = store.state.activeChordIntervals?.length ?? 1;

    unifiedPositionToggle.classList.toggle('inversion-mode', mode === 'inversion');
    unifiedPositionToggle.classList.toggle('position-mode', mode === 'position');

    unifiedPositionToggle.classList.remove('state-1', 'state-2', 'state-3', 'state-4', 'state-5');
    if (currentStep >= 1 && currentStep <= 5) {
      unifiedPositionToggle.classList.add(`state-${currentStep}`);
    }

    for (let i = 1; i <= 5; i++) {
      unifiedPositionToggle.classList.remove(`disabled-state-${i}`);
    }

    if (mode === 'position') {
      if (noteCount <= 1) {
        unifiedPositionToggle.classList.add('disabled-state-1');
      } else if (noteCount === 2) {
        unifiedPositionToggle.classList.add('disabled-state-2');
      } else if (noteCount === 3) {
        unifiedPositionToggle.classList.add('disabled-state-3');
      } else if (noteCount === 4) {
        unifiedPositionToggle.classList.add('disabled-state-4');
      } else if (noteCount === 5) {
        unifiedPositionToggle.classList.add('disabled-state-5');
      }
    }
  }

  function handleModeTransition(): void {
    const newMode = getToggleMode();
    const noteCount = store.state.activeChordIntervals?.length ?? 1;

    if (previousMode !== newMode) {
      if (newMode === 'inversion') {
        const wasRoot = store.state.chordPositionState === 0;
        store.setIntervalsInversion(!wasRoot);
      } else {
        store.setChordPosition(0);
      }
      previousMode = newMode;
    } else if (newMode === 'position') {
      const maxPosition = Math.max(0, noteCount - 1);
      if (store.state.chordPositionState > maxPosition) {
        store.setChordPosition(0);
      }
    }

    updateUnifiedToggleVisual();
  }

  function updateChordPositionToggleState(): void {
    handleModeTransition();
  }

  function updateTonicModeButtons(activeNumber: string | number | null | undefined = store.state.selectedToolTonicNumber) {
    if (!tonicModeButtons.length) return;
    const fallbackNumber = tonicModeButtons[0] ? parseInt(tonicModeButtons[0].dataset['tonic'] ?? '1', 10) : 1;
    const parsedCandidate = typeof activeNumber === 'number' ? activeNumber : parseInt(String(activeNumber ?? ''), 10);
    const parsedActive = Number.isNaN(parsedCandidate) ? fallbackNumber : parsedCandidate;
    tonicModeButtons.forEach(button => {
      const tonicValue = button.dataset['tonic'];
      const buttonNumber = tonicValue ? parseInt(tonicValue, 10) : NaN;
      const isActive = buttonNumber === parsedActive;
      button.classList.toggle('selected', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function getPreferredDegreeMode(): Exclude<DegreeDisplayMode, 'off'> {
    if (degreeModeModalButton?.classList.contains('active')) return 'modal';
    if (degreeModeScaleButton?.classList.contains('active')) return 'diatonic';
    return lastDegreeMode;
  }

  function openSixteenthStampTab(): void {
    const rhythmTabButton = document.querySelector<HTMLButtonElement>('[data-tab="rhythm"]');
    if (rhythmTabButton && !rhythmTabButton.classList.contains('active')) {
      rhythmTabButton.click();
    }
    const sixteenthTabButton = document.querySelector<HTMLButtonElement>('[data-rhythm-stamp-tab="sixteenth"]');
    if (sixteenthTabButton && !sixteenthTabButton.classList.contains('active')) {
      sixteenthTabButton.click();
    }
  }

  // UI sync functions
  const setAccidentalButtonsLocked = (locked: boolean): void => {
    // Hz mode disables Flat, Sharp, and Octaves buttons (all pitch label options)
    [flatBtn, sharpBtn, octaveToggleBtn].forEach((btn) => {
      if (!btn) return;
      btn.classList.toggle('accidental-btn--disabled', locked);
      btn.setAttribute('aria-disabled', locked ? 'true' : 'false');
    });
  };

  const syncFrequencyUiState = (showFrequencyLabels: boolean): void => {
    if (frequencyBtn) {
      frequencyBtn.classList.toggle('active', showFrequencyLabels);
      frequencyBtn.setAttribute('aria-pressed', showFrequencyLabels ? 'true' : 'false');
    }
    setAccidentalButtonsLocked(showFrequencyLabels);
  };

  const syncOctaveUiState = (showOctaveLabels: boolean): void => {
    if (!octaveToggleBtn) return;
    octaveToggleBtn.classList.toggle('active', showOctaveLabels);
    octaveToggleBtn.setAttribute('aria-pressed', showOctaveLabels ? 'true' : 'false');
  };

  // Store event handlers
  function handleToolChanged({ newTool }: ToolChangedPayload = {}) {
    eraserBtn?.classList.remove('selected');
    if (harmonyContainer) harmonyContainer.classList.remove('active-tool');

    if (newTool === 'eraser') {
      eraserBtn?.classList.add('selected');
    } else if (newTool === 'chord') {
      harmonyContainer?.classList.add('active-tool');
    } else if (newTool === 'note') {
      const currentNote = store.state.selectedNote;
      if (currentNote) {
        const targetPair = document.querySelector(`.note-pair[data-color='${currentNote.color}']`);
        targetPair?.classList.add('selected');
        targetPair?.querySelector(`.note[data-type='${currentNote.shape}']`)?.classList.add('selected');
      }
    }

    updateTonicModeButtons();
  }

  function handleActiveChordIntervalsChanged() {
    updateChordButtonSelection();
    updateIntervalButtonSelection();
    updateChordPositionToggleState();
  }

  function handleNoteChanged({ newNote }: NoteChangedPayload = {}) {
    if (!newNote?.color || !newNote.shape) return;
    const { color, shape } = newNote;

    document.querySelectorAll('.note, .note-pair').forEach(el => el.classList.remove('selected'));

    const targetNote = document.querySelector<HTMLElement>(`.note[data-color='${color}'][data-type='${shape}']`);
    if (targetNote) {
      targetNote.classList.add('selected');
    } else {
      const targetPair = document.querySelector<HTMLElement>(`.note-pair[data-color='${color}']`);
      targetPair?.classList.add('selected');
      targetPair?.querySelector<HTMLElement>(`.note[data-type='${shape}']`)?.classList.add('selected');
    }

    applyHarmonyAccentColors(harmonyContainer, color);
    const tabSidebar = document.querySelector<HTMLElement>('.tab-sidebar');
    if (tabSidebar) {
      tabSidebar.style.setProperty('--c-accent', color);
    }
  }

  function handleDegreeDisplayModeChanged(mode: DegreeDisplayMode) {
    syncDegreeVisibilityButton(mode, degreeVisibilityToggle);
    updateScaleModeToggleState(mode);
  }

  function handleAccidentalModeChanged(accidentalMode: { sharp: boolean; flat: boolean }) {
    sharpBtn?.classList.toggle('active', accidentalMode.sharp);
    flatBtn?.classList.toggle('active', accidentalMode.flat);
  }

  onMount(() => {
    // Get cached elements
    const cachedElements = domCache.getMultiple(
      'noteBankContainer', 'eraserButton', 'degreeVisibilityToggle', 'degreeModeToggle',
      'flatBtn', 'sharpBtn', 'frequencyBtn', 'octaveLabelBtn', 'focusColoursToggle'
    );

    eraserBtn = cachedElements['eraserButton'];
    degreeVisibilityToggle = cachedElements['degreeVisibilityToggle'] ?? null;
    degreeModeToggle = cachedElements['degreeModeToggle'];
    degreeModeScaleButton = degreeModeToggle?.querySelector<HTMLButtonElement>('[data-mode="diatonic"]') ?? null;
    degreeModeModalButton = degreeModeToggle?.querySelector<HTMLButtonElement>('[data-mode="modal"]') ?? null;
    flatBtn = cachedElements['flatBtn'];
    sharpBtn = cachedElements['sharpBtn'];
    frequencyBtn = cachedElements['frequencyBtn'];
    octaveToggleBtn = cachedElements['octaveLabelBtn'];
    focusColoursToggle = cachedElements['focusColoursToggle'] as HTMLInputElement | null;

    harmonyContainer = document.querySelector<HTMLElement>('.pitch-tabs-container');
    unifiedPositionToggle = document.getElementById('unified-position-toggle');
    chordsPanel = document.querySelector<HTMLElement>('#chords-panel .chords-grid');
    intervalsPanel = document.querySelector<HTMLElement>('#chords-panel .intervals-4x4-grid');
    tonicModeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.tonic-mode-button'));

    // Initialize clef range controls
    clefRangeController.init();

    // --- Note Click Listeners ---
    const allNotes = document.querySelectorAll<HTMLElement>('.note');
    allNotes.forEach(note => {
      note.addEventListener('click', () => {
        const noteType = note.dataset['type'] as 'circle' | 'oval' | 'diamond' | undefined;
        const color = note.dataset['color'] || note.closest<HTMLElement>('.note-pair')?.dataset['color'];
        if (!noteType || !color) return;

        if (noteType === 'diamond') {
          store.setSelectedNote('diamond', color);
          const activeStampButton = document.querySelector<HTMLButtonElement>('.sixteenth-stamp-button.active');
          const activeStampId = activeStampButton ? parseInt(activeStampButton.dataset['sixteenthStampId'] ?? '', 10) : NaN;
          const isDifferentStampActive = store.state.selectedTool === 'sixteenthStamp'
            && activeStampButton && !Number.isNaN(activeStampId) && activeStampId !== SIXTEENTH_FULL_STAMP_ID;

          if (isDifferentStampActive) return;

          openSixteenthStampTab();
          SixteenthStampsToolbar.selectSixteenthStamp(SIXTEENTH_FULL_STAMP_ID);
          return;
        }

        store.setSelectedNote(noteType, color);
        store.setSelectedTool('note');
      });
    });

    // Eraser button
    if (eraserBtn) {
      eraserBtn.addEventListener('click', () => {
        if (store.state.selectedTool === 'eraser') {
          store.setSelectedTool(store.state.previousTool || 'note');
          return;
        }
        store.setSelectedTool('eraser');
      });
    }

    // Lasso shortcut
    const lassoShortcutBtn = document.getElementById('lasso-shortcut-button');
    if (lassoShortcutBtn) {
      lassoShortcutBtn.addEventListener('click', () => {
        document.querySelector<HTMLButtonElement>('[data-tab="pitch"]')?.click();
        document.querySelector<HTMLButtonElement>('[data-pitch-tab="draw"]')?.click();
        document.querySelector<HTMLButtonElement>('button.draw-tool-button[data-draw-tool="lasso"]')?.click();
      });
    }

    // Marker shortcut
    const markerShortcutBtn = document.getElementById('marker-shortcut-button');
    if (markerShortcutBtn) {
      markerShortcutBtn.addEventListener('click', () => {
        document.querySelector<HTMLButtonElement>('[data-tab="pitch"]')?.click();
        document.querySelector<HTMLButtonElement>('[data-pitch-tab="draw"]')?.click();
        document.querySelector<HTMLButtonElement>('button.draw-tool-button[data-draw-tool="marker"]')?.click();
      });
    }

    // Tonic mode buttons
    if (tonicModeButtons.length) {
      tonicModeButtons.forEach(button => {
        button.addEventListener('click', () => {
          const tonicNumber = button.getAttribute('data-tonic');
          if (!tonicNumber) return;
          const parsed = parseInt(tonicNumber, 10);
          store.setSelectedTool('tonicization', parsed);
          updateTonicModeButtons(parsed);
        });
      });
      updateTonicModeButtons();
    }

    // Chord panel buttons
    if (chordsPanel) {
      chordsPanel.querySelectorAll<HTMLButtonElement>('.harmony-preset-button').forEach(button => {
        button.addEventListener('click', () => {
          const label = button.textContent?.trim() ?? '';
          const intervals = CHORD_SHAPES[label];
          if (intervals && intervals.length > 0) {
            store.setActiveChordIntervals(intervals);
            store.setSelectedTool('chord');
          }
          button.blur();
        });

        button.addEventListener('dblclick', () => {
          if (button.classList.contains('selected')) {
            store.setSelectedTool('note');
          }
          button.blur();
        });
      });
    }

    // Interval panel buttons
    if (intervalsPanel) {
      intervalsPanel.querySelectorAll<HTMLButtonElement>('.harmony-preset-button').forEach(button => {
        button.addEventListener('click', () => {
          const intervalLabel = button.textContent?.trim() ?? '';
          const intervalData = INTERVAL_SHAPES[intervalLabel];

          if (intervalData && intervalData.length > 0) {
            const clickedInterval = intervalData[0];
            if (!clickedInterval) return;

            let currentIntervals = store.state.selectedTool === 'chord' && store.state.activeChordIntervals
              ? [...store.state.activeChordIntervals]
              : ['1P'];

            if (currentIntervals.includes(clickedInterval)) {
              if (clickedInterval !== '1P') {
                currentIntervals = currentIntervals.filter(i => i !== clickedInterval);
              }
            } else {
              currentIntervals.push(clickedInterval);
            }

            if (!currentIntervals.includes('1P')) {
              currentIntervals.unshift('1P');
            }

            const intervalOrder = ['1P', '2m', '2M', '2A', '3m', '3M', '4P', '4A', '5d', '5P', '5A', '6m', '6M', '6A', '7m', '7M', '9M', '11P', '11A', '13M'];
            currentIntervals.sort((a, b) => intervalOrder.indexOf(a) - intervalOrder.indexOf(b));

            store.setActiveChordIntervals(currentIntervals);
            store.setSelectedTool('chord');
          }
          button.blur();
        });

        button.addEventListener('dblclick', () => {
          store.setActiveChordIntervals(['1P']);
          store.setSelectedTool('chord');
          button.blur();
        });
      });
    }

    // Pitch tab switching
    const pitchTabButtons = document.querySelectorAll<HTMLButtonElement>('.pitch-tab-button');
    const pitchTabPanels = document.querySelectorAll<HTMLElement>('.pitch-tab-panel');

    pitchTabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = button.dataset['pitchTab'];
        if (!targetTab) return;

        pitchTabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        pitchTabPanels.forEach(panel => panel.classList.remove('active'));
        document.getElementById(`${targetTab}-panel`)?.classList.add('active');

        localStorage.setItem('selectedPitchTab', targetTab);

        if (targetTab === 'chords') updateChordPositionToggleState();
        if (targetTab === 'range') setTimeout(() => clefRangeController.refreshWheelVisuals(), 0);
      });
    });

    // Restore saved pitch tab
    const savedPitchTab = localStorage.getItem('selectedPitchTab') || 'chords';
    const savedPitchTabButton = document.querySelector<HTMLButtonElement>(`[data-pitch-tab="${savedPitchTab}"]`);
    if (savedPitchTabButton) {
      pitchTabButtons.forEach(btn => btn.classList.remove('active'));
      pitchTabPanels.forEach(panel => panel.classList.remove('active'));
      savedPitchTabButton.classList.add('active');
      document.getElementById(`${savedPitchTab}-panel`)?.classList.add('active');
    }

    // Rhythm tab switching
    const rhythmTabButtons = document.querySelectorAll<HTMLButtonElement>('.rhythm-stamp-tab-button');
    const rhythmTabPanels = document.querySelectorAll<HTMLElement>('.rhythm-stamp-tab-panel');

    rhythmTabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = button.dataset['rhythmStampTab'];
        if (!targetTab) return;

        rhythmTabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        rhythmTabPanels.forEach(panel => panel.classList.remove('active'));
        document.getElementById(`${targetTab}-stamps-panel`)?.classList.add('active');

        localStorage.setItem('selectedRhythmStampTab', targetTab);
      });
    });

    // Restore saved rhythm tab
    const savedRhythmTab = localStorage.getItem('selectedRhythmStampTab') || localStorage.getItem('selectedRhythmTab');
    const normalizedRhythmTab = savedRhythmTab === 'stamps' ? 'sixteenth' : savedRhythmTab === 'triplets' ? 'triplet' : (savedRhythmTab || 'sixteenth');
    const savedRhythmTabButton = document.querySelector<HTMLButtonElement>(`[data-rhythm-stamp-tab="${normalizedRhythmTab}"]`);
    if (savedRhythmTabButton) {
      rhythmTabButtons.forEach(btn => btn.classList.remove('active'));
      rhythmTabPanels.forEach(panel => panel.classList.remove('active'));
      savedRhythmTabButton.classList.add('active');
      document.getElementById(`${normalizedRhythmTab}-stamps-panel`)?.classList.add('active');
    }

    // Unified position toggle
    if (unifiedPositionToggle) {
      const toggleTrack = unifiedPositionToggle.querySelector<HTMLElement>('.toggle-track');
      toggleTrack?.addEventListener('click', () => {
        const currentStep = getCurrentStep();
        const maxSteps = getMaxSteps();
        setStepValue((currentStep + 1) % maxSteps);
        unifiedPositionToggle.blur();
      });

      unifiedPositionToggle.querySelectorAll<HTMLElement>('.left-labels .state-label').forEach(label => {
        label.addEventListener('click', () => {
          if (getToggleMode() !== 'inversion') return;
          setStepValue(parseInt(label.dataset['step'] ?? '0', 10));
        });
      });

      unifiedPositionToggle.querySelectorAll<HTMLElement>('.right-labels .state-label').forEach(label => {
        label.addEventListener('click', () => {
          if (getToggleMode() !== 'position') return;
          const step = parseInt(label.dataset['step'] ?? '0', 10);
          if (step < getMaxSteps()) setStepValue(step);
        });
      });

      store.on('chordPositionChanged', updateUnifiedToggleVisual);
      store.on('intervalsInversionChanged', updateUnifiedToggleVisual);
      updateUnifiedToggleVisual();
    }

    // Degree visibility toggle
    if (degreeVisibilityToggle) {
      degreeVisibilityToggle.addEventListener('click', () => {
        const currentMode = store.state.degreeDisplayMode;
        if (currentMode === 'off') {
          if (!hasTonicShapesOnCanvas()) {
            notificationSystem.alert('Please place a tonal center on the canvas before showing degrees.', 'Tonal Center Required');
            return;
          }
          store.setDegreeDisplayMode(getPreferredDegreeMode());
        } else {
          store.setDegreeDisplayMode('off');
        }
        degreeVisibilityToggle.blur();
      });
    }

    // Degree mode buttons
    if (degreeModeScaleButton) {
      degreeModeScaleButton.addEventListener('click', () => {
        if (store.state.degreeDisplayMode !== 'off' && store.state.degreeDisplayMode !== 'diatonic') {
          store.setDegreeDisplayMode('diatonic');
        }
        degreeModeScaleButton.blur();
      });
    }

    if (degreeModeModalButton) {
      degreeModeModalButton.addEventListener('click', () => {
        if (store.state.degreeDisplayMode !== 'off' && store.state.degreeDisplayMode !== 'modal') {
          store.setDegreeDisplayMode('modal');
        }
        degreeModeModalButton.blur();
      });
    }

    // Accidental buttons
    if (flatBtn) {
      flatBtn.addEventListener('click', () => {
        if (store.state.showFrequencyLabels) store.toggleFrequencyLabels();
        store.toggleAccidentalMode('flat');
        flatBtn.blur();
      });
    }

    if (sharpBtn) {
      sharpBtn.addEventListener('click', () => {
        if (store.state.showFrequencyLabels) store.toggleFrequencyLabels();
        store.toggleAccidentalMode('sharp');
        sharpBtn.blur();
      });
    }

    if (frequencyBtn) {
      frequencyBtn.addEventListener('click', () => {
        store.toggleFrequencyLabels();
        frequencyBtn.blur();
      });
    }

    if (octaveToggleBtn) {
      octaveToggleBtn.addEventListener('click', () => {
        // Toggling octaves automatically turns off Hz mode (consistent with flat/sharp)
        if (store.state.showFrequencyLabels) {
          store.toggleFrequencyLabels();
        }
        store.toggleOctaveLabels();
        octaveToggleBtn.blur();
      });
    }

    if (focusColoursToggle) {
      focusColoursToggle.addEventListener('change', () => {
        if (!store.state.focusColours && !hasTonicShapesOnCanvas()) {
          notificationSystem.alert('Please place a tonal center on the canvas before enabling focus colours.', 'Tonal Center Required');
          focusColoursToggle.checked = false;
          return;
        }
        store.toggleFocusColours();
      });
    }

    // Store event subscriptions
    store.on('toolChanged', handleToolChanged);
    store.on('activeChordIntervalsChanged', handleActiveChordIntervalsChanged);
    store.on('noteChanged', handleNoteChanged);
    store.on('degreeDisplayModeChanged', handleDegreeDisplayModeChanged);
    store.on('accidentalModeChanged', handleAccidentalModeChanged);
    store.on('frequencyLabelsChanged', syncFrequencyUiState);
    store.on('octaveLabelsChanged', syncOctaveUiState);

    // Initialize UI states
    syncFrequencyUiState(store.state.showFrequencyLabels);
    syncOctaveUiState(store.state.showOctaveLabels);

    if (harmonyContainer && store.state.selectedNote) {
      applyHarmonyAccentColors(harmonyContainer, store.state.selectedNote.color);
    }

    const tabSidebar = document.querySelector<HTMLElement>('.tab-sidebar');
    if (tabSidebar && store.state.selectedNote) {
      tabSidebar.style.setProperty('--c-accent', store.state.selectedNote.color);
    }

    setTimeout(() => updateChordPositionToggleState(), 50);

    const currentMode = store.state.degreeDisplayMode;
    syncDegreeVisibilityButton(currentMode, degreeVisibilityToggle);
    updateScaleModeToggleState(currentMode);

    updateChordButtonSelection();
    updateIntervalButtonSelection();
    updateChordPositionToggleState();

    console.log('[Svelte] ToolSelectorBridge mounted');
  });

  onDestroy(() => {
    console.log('[Svelte] ToolSelectorBridge unmounted');
  });
</script>

<!-- This is a headless component - no DOM output -->
