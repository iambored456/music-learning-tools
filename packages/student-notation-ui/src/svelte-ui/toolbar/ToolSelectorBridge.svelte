<script lang="ts">
  import {
    getIntervalHighlightClass,
    getNextUnifiedPositionStep,
    getUnifiedPositionStepCount,
    getUnifiedPositionStepFromPointer,
    isActiveChordSelection,
    syncNoteBankSelection,
    selectNoteBankNote
  } from './toolSelectionUi.ts';
  /**
   * ToolSelectorBridge - Headless Svelte component
   *
   * This is a large component that handles tool selection, chord/interval buttons,
   * degree display toggles, and various UI state management.
   */
  import { onMount, onDestroy } from 'svelte';
  import store from '@state/initStore.ts';
  import domCache from '@services/domCache.ts';
  import { notificationSystem } from '../ui/NotificationModal.svelte';
  import clefRangeController from '@components/clefWheels/clefRangeController.ts';
  import logger from '@utils/logger.ts';
  import { initToolSubtabState } from './toolSubtabState.ts';
  import { initDrumBeatPreviews } from '@components/rhythm/drumBeatPreview.ts';
  import {
    BASIC_CHORD_SHAPES,
    ADVANCED_CHORD_SHAPES,
    CHORD_SHAPES,
    CHORD_OPTIONAL_INTERVALS,
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

  // State
  let lastDegreeMode: Exclude<DegreeDisplayMode, 'off'> = 'diatonic';
  let previousMode: 'inversion' | 'position' = 'position';
  let cleanupToolSubtabState: (() => void) | null = null;
  let cleanupDrumBeatPreviews: (() => void) | null = null;
  let cleanupUnifiedPositionToggle: (() => void) | null = null;

  // DOM references (will be populated on mount)
  let eraserBtn: HTMLElement | null = null;
  let pitchLabelsToggle: HTMLButtonElement | null = null;
  let pitchOctaveLabelsToggle: HTMLButtonElement | null = null;
  let degreeVisibilityToggle: HTMLButtonElement | null = null;
  let degreeModeToggle: HTMLElement | null = null;
  let degreeModeScaleButton: HTMLButtonElement | null = null;
  let degreeModeModalButton: HTMLButtonElement | null = null;
  let flatBtn: HTMLElement | null = null;
  let sharpBtn: HTMLElement | null = null;
  let frequencyBtn: HTMLElement | null = null;
  let octaveToggleBtn: HTMLElement | null = null;
  let focusColoursToggle: HTMLButtonElement | null = null;
  let harmonyContainer: HTMLElement | null = null;
  let unifiedPositionToggle: HTMLElement | null = null;
  let chordsPanel: HTMLElement | null = null;
  let intervalsPanel: HTMLElement | null = null;
  let tonicModeButtons: HTMLButtonElement[] = [];

  // Helper functions
  function hasTonicShapesOnCanvas(): boolean {
    return Object.keys(store.state.tonicSignGroups).length > 0;
  }

  function requireTonicShape(): boolean {
    if (hasTonicShapesOnCanvas()) return true;
    notificationSystem.alert(
      'Please place a tonal center on the canvas before showing degrees.',
      'Tonal Center Required'
    );
    return false;
  }

  function debugFocusColours(_message: string, _data?: unknown): void {}

  function updateScaleModeToggleState(mode: DegreeDisplayMode = store.state.degreeDisplayMode): void {
    const scaleButton = degreeModeToggle?.querySelector<HTMLButtonElement>('[data-mode="diatonic"]');
    const modeButton = degreeModeToggle?.querySelector<HTMLButtonElement>('[data-mode="modal"]');

    if (!scaleButton || !modeButton) return;

    if (mode !== 'off') {
      lastDegreeMode = mode;
    }

    const effectiveMode: Exclude<DegreeDisplayMode, 'off'> = mode === 'off' ? lastDegreeMode : mode;
    const isDegreesOff = mode === 'off';
    const tonicShapesPresent = hasTonicShapesOnCanvas();
    const visuallyDisabled = isDegreesOff || !tonicShapesPresent;

    [scaleButton, modeButton].forEach(button => {
      button.disabled = false;
      button.classList.toggle('disabled', visuallyDisabled);
      button.setAttribute('aria-disabled', String(!tonicShapesPresent));
    });

    if (degreeModeToggle) {
      degreeModeToggle.classList.toggle('disabled', visuallyDisabled);
    }

    const scaleActive = tonicShapesPresent && !isDegreesOff && effectiveMode === 'diatonic';
    const modeActive = tonicShapesPresent && !isDegreesOff && effectiveMode === 'modal';
    scaleButton.classList.toggle('active', scaleActive);
    scaleButton.setAttribute('aria-pressed', String(scaleActive));
    modeButton.classList.toggle('active', modeActive);
    modeButton.setAttribute('aria-pressed', String(modeActive));
  }

  function syncDegreeVisibilityButton(mode: DegreeDisplayMode, visibilityButton: HTMLElement | null): void {
    if (!visibilityButton) return;
    const tonicShapesPresent = hasTonicShapesOnCanvas();
    const isOn = tonicShapesPresent && mode !== 'off';
    visibilityButton.classList.toggle('disabled', !tonicShapesPresent);
    visibilityButton.setAttribute('aria-disabled', String(!tonicShapesPresent));
    visibilityButton.classList.toggle('active', isOn);
    visibilityButton.setAttribute('aria-pressed', isOn ? 'true' : 'false');
  }

  function syncPitchLabelsButton(showPitchLabels: boolean, toggleButton: HTMLElement | null): void {
    if (!toggleButton) return;
    toggleButton.classList.toggle('active', showPitchLabels);
    toggleButton.setAttribute('aria-pressed', showPitchLabels ? 'true' : 'false');
  }

  function syncPitchOctaveLabelsButton(): void {
    if (!pitchOctaveLabelsToggle) return;
    const pitchLabelsVisible = store.state.showPitchLabels;
    pitchOctaveLabelsToggle.disabled = !pitchLabelsVisible;
    pitchOctaveLabelsToggle.classList.toggle('disabled', !pitchLabelsVisible);
    pitchOctaveLabelsToggle.classList.toggle('active', store.state.showPitchOctaveLabels);
    pitchOctaveLabelsToggle.setAttribute(
      'aria-pressed',
      store.state.showPitchOctaveLabels ? 'true' : 'false'
    );
  }

  function updateChordButtonSelection(): void {
    if (!chordsPanel) return;

    chordsPanel.querySelectorAll<HTMLButtonElement>('.harmony-preset-button').forEach(el => {
      el.classList.remove('selected', 'partial-match');
    });

    if (store.state.selectedTool === 'chord' && store.state.activeChordIntervals) {
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
      el.classList.remove('selected', 'optional-interval')
    );

    if (store.state.selectedTool === 'chord' && store.state.activeChordIntervals) {
      const activeIntervals = store.state.activeChordIntervals;
      const selectedChordLabel = chordsPanel
        ?.querySelector<HTMLButtonElement>('.harmony-preset-button.selected')
        ?.textContent?.trim() ?? '';
      const optionalIntervals = CHORD_OPTIONAL_INTERVALS[selectedChordLabel] ?? [];

      intervalsPanel.querySelectorAll<HTMLButtonElement>('.harmony-preset-button').forEach(button => {
        const intervalLabel = button.textContent?.trim() ?? '';
        const buttonInterval = INTERVAL_SHAPES[intervalLabel];
        const firstInterval = buttonInterval?.[0];
        if (firstInterval) {
          const highlightClass = getIntervalHighlightClass(activeIntervals, optionalIntervals, firstInterval);
          if (!highlightClass) return;
          button.classList.add(highlightClass);
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
    const palette = store.state.colorPalette[color] || { primary: color, light: color };
    const primaryColor = palette.primary;
    const lightColor = palette.light;
    const extraLightColor = lightenColor(lightColor, 60);
    container.style.setProperty('--c-accent', primaryColor);
    container.style.setProperty('--c-accent-light', extraLightColor);
    container.style.setProperty('--harmony-partial-bg', hexToRgba(extraLightColor, 0.25));
    container.style.setProperty('--harmony-partial-border', hexToRgba(primaryColor, 0.4));
    container.style.setProperty('--harmony-partial-bg-hover', hexToRgba(extraLightColor, 0.4));
    container.style.setProperty('--harmony-partial-border-hover', hexToRgba(primaryColor, 0.6));
    container.style.setProperty('--harmony-optional-bg', hexToRgba(extraLightColor, 0.25));
    container.style.setProperty('--harmony-optional-border', hexToRgba(primaryColor, 0.4));
    container.style.setProperty('--harmony-optional-bg-hover', hexToRgba(extraLightColor, 0.4));
    container.style.setProperty('--harmony-optional-border-hover', hexToRgba(primaryColor, 0.6));
  };

  // Position toggle helpers
  function getToggleMode(): 'inversion' | 'position' {
    const noteCount = store.state.activeChordIntervals?.length ?? 0;
    return noteCount === 2 ? 'inversion' : 'position';
  }

  function getMaxSteps(): number {
    const noteCount = store.state.activeChordIntervals?.length ?? 1;
    return getUnifiedPositionStepCount(noteCount);
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
      const maxPosition = getUnifiedPositionStepCount(noteCount) - 1;
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
    if (store.state.selectedTool !== 'tonicization') activeNumber = null;
    const parsedCandidate = typeof activeNumber === 'number' ? activeNumber : parseInt(String(activeNumber ?? ''), 10);
    const parsedActive = Number.isInteger(parsedCandidate) && parsedCandidate >= 1 && parsedCandidate <= 7
      ? parsedCandidate
      : null;
    const otherModes = document.querySelector<HTMLSelectElement>('#tonic-other-modes');
    if (otherModes) {
      const isOtherMode = parsedActive !== null && ![1, 6].includes(parsedActive);
      otherModes.value = isOtherMode ? String(parsedActive) : '';
      otherModes.classList.toggle('selected', isOtherMode);
    }
    tonicModeButtons.forEach(button => {
      const tonicValue = button.dataset['tonic'];
      const buttonNumber = tonicValue ? parseInt(tonicValue, 10) : NaN;
      const isActive = buttonNumber === parsedActive;
      button.classList.toggle('selected', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function selectTonicMode(parsed: number): void {
    if (![1, 2, 3, 4, 5, 6, 7].includes(parsed)) return;
    if (store.state.selectedTool === 'tonicization' && store.state.selectedToolTonicNumber === parsed) {
      store.setSelectedTool('select');
    } else {
      store.setSelectedTool('tonicization', parsed);
    }
  }

  function handleOtherTonicModeChange(event: Event): void {
    const select = event.currentTarget as HTMLSelectElement;
    selectTonicMode(Number(select.value));
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
  const syncNonFrequencyLabelUiState = (): void => {
    const frequencyModeActive = store.state.showFrequencyLabels;
    const syncButton = (button: HTMLElement | null, enabled: boolean): void => {
      if (!button) return;
      const visiblyEnabled = !frequencyModeActive && enabled;
      button.classList.toggle('active', visiblyEnabled);
      button.setAttribute('aria-pressed', visiblyEnabled ? 'true' : 'false');
    };

    syncButton(flatBtn, store.state.accidentalMode.flat);
    syncButton(sharpBtn, store.state.accidentalMode.sharp);
    syncButton(octaveToggleBtn, store.state.showOctaveLabels);
  };

  const syncFrequencyUiState = (showFrequencyLabels?: boolean): void => {
    if (showFrequencyLabels === undefined) return;
    if (frequencyBtn) {
      frequencyBtn.classList.toggle('active', showFrequencyLabels);
      frequencyBtn.setAttribute('aria-pressed', showFrequencyLabels ? 'true' : 'false');
    }
    syncNonFrequencyLabelUiState();
  };

  const syncOctaveUiState = (showOctaveLabels?: boolean): void => {
    if (showOctaveLabels === undefined) return;
    syncNonFrequencyLabelUiState();
  };

  const syncFocusColoursUiState = (focusColoursEnabled: boolean): void => {
    if (!focusColoursToggle) {return;}
    const tonicShapesPresent = hasTonicShapesOnCanvas();
    const visiblyEnabled = tonicShapesPresent && focusColoursEnabled;
    focusColoursToggle.disabled = false;
    focusColoursToggle.classList.toggle('disabled', !tonicShapesPresent);
    focusColoursToggle.setAttribute('aria-disabled', String(!tonicShapesPresent));
    focusColoursToggle.classList.toggle('active', visiblyEnabled);
    focusColoursToggle.setAttribute('aria-pressed', visiblyEnabled ? 'true' : 'false');
  };

  function handleTonicStructureChanged(): void {
    const tonicShapesPresent = hasTonicShapesOnCanvas();
    if (!tonicShapesPresent && store.state.focusColours) {
      store.toggleFocusColours();
    }
    if (!tonicShapesPresent && store.state.degreeDisplayMode !== 'off') {
      store.setDegreeDisplayMode('off');
    }
    syncDegreeVisibilityButton(store.state.degreeDisplayMode, degreeVisibilityToggle);
    updateScaleModeToggleState(store.state.degreeDisplayMode);
    syncFocusColoursUiState(store.state.focusColours);
  }

  // Store event handlers
  function handleToolChanged({ newTool }: ToolChangedPayload = {}) {
    syncNoteBankSelection(store.state.selectedTool, store.state.selectedNote);
    eraserBtn?.classList.remove('selected');
    eraserBtn?.setAttribute('aria-pressed', String(newTool === 'eraser'));
    for (const [id, active] of [
      ['select-tool-button', newTool === 'select'],
      ['marker-shortcut-button', newTool === 'draw' && store.state.selectedDrawTool === 'marker']
    ] as const) {
      const button = document.getElementById(id);
      button?.classList.toggle('selected', active);
      button?.setAttribute('aria-pressed', String(active));
    }
    updateChordButtonSelection();
    updateIntervalButtonSelection();
    if (harmonyContainer) harmonyContainer.classList.remove('active-tool');

    if (newTool === 'eraser') {
      eraserBtn?.classList.add('selected');
    } else if (newTool === 'chord') {
      harmonyContainer?.classList.add('active-tool');
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
    const { color } = newNote;

    syncNoteBankSelection(store.state.selectedTool, store.state.selectedNote);

    applyHarmonyAccentColors(harmonyContainer, color);
    const tabSidebar = document.querySelector<HTMLElement>('.tab-sidebar');
    if (tabSidebar) {
      tabSidebar.style.setProperty('--c-accent', color);
    }
  }

  function handleDegreeDisplayModeChanged(mode?: DegreeDisplayMode) {
    if (!mode) return;
    syncDegreeVisibilityButton(mode, degreeVisibilityToggle);
    updateScaleModeToggleState(mode);
  }

  function handlePitchLabelsChanged(showPitchLabels?: boolean) {
    if (typeof showPitchLabels !== 'boolean') return;
    syncPitchLabelsButton(showPitchLabels, pitchLabelsToggle);
    syncPitchOctaveLabelsButton();
  }

  function handlePitchOctaveLabelsChanged(showPitchOctaveLabels?: boolean) {
    if (typeof showPitchOctaveLabels !== 'boolean') return;
    syncPitchOctaveLabelsButton();
  }

  function handleAccidentalModeChanged(accidentalMode?: { sharp: boolean; flat: boolean }) {
    if (!accidentalMode) return;
    syncNonFrequencyLabelUiState();
  }

  function selectNonFrequencyLabelOption(isEnabled: () => boolean, toggle: () => void): void {
    if (store.state.showFrequencyLabels) {
      // Leaving Hz mode reveals the preserved Flat, Sharp, and Octaves state.
      // The option selected to leave Hz mode must be enabled as part of that restore.
      store.toggleFrequencyLabels();
      if (!isEnabled()) toggle();
      return;
    }

    toggle();
  }

  function handleFocusColoursChanged(focusColoursEnabled?: boolean): void {
    if (typeof focusColoursEnabled !== 'boolean') {return;}
    if (focusColoursEnabled && !hasTonicShapesOnCanvas()) {
      store.toggleFocusColours();
      return;
    }
    syncFocusColoursUiState(focusColoursEnabled);
    debugFocusColours('focusColoursChanged event', { focusColoursEnabled });
  }

  function handlePitchTabChanged(tabId: string): void {
    if (tabId === 'chords') {
      updateChordPositionToggleState();
    }
    if (tabId === 'draw') {
      setTimeout(() => clefRangeController.refreshWheelVisuals(), 0);
    }
  }

  onMount(() => {
    // Get cached elements
    const cachedElements = domCache.getMultiple(
      'noteBankContainer', 'eraserButton', 'pitchLabelsToggle', 'pitchOctaveLabelsToggle', 'degreeVisibilityToggle', 'degreeModeToggle',
      'flatBtn', 'sharpBtn', 'frequencyBtn', 'octaveLabelBtn', 'focusColoursToggle'
    );

    eraserBtn = cachedElements['eraserButton'];
    const cachedPitchLabelsToggle = cachedElements['pitchLabelsToggle'];
    const livePitchLabelsToggle = (cachedPitchLabelsToggle && cachedPitchLabelsToggle.isConnected)
      ? cachedPitchLabelsToggle
      : document.getElementById('pitch-labels-toggle');
    pitchLabelsToggle = livePitchLabelsToggle instanceof HTMLButtonElement
      ? livePitchLabelsToggle
      : null;

    const cachedPitchOctaveLabelsToggle = cachedElements['pitchOctaveLabelsToggle'];
    const livePitchOctaveLabelsToggle = (cachedPitchOctaveLabelsToggle && cachedPitchOctaveLabelsToggle.isConnected)
      ? cachedPitchOctaveLabelsToggle
      : document.getElementById('pitch-octave-labels-toggle');
    pitchOctaveLabelsToggle = livePitchOctaveLabelsToggle instanceof HTMLButtonElement
      ? livePitchOctaveLabelsToggle
      : null;

    const cachedDegreeVisibilityToggle = cachedElements['degreeVisibilityToggle'];
    const liveDegreeVisibilityToggle = (cachedDegreeVisibilityToggle && cachedDegreeVisibilityToggle.isConnected)
      ? cachedDegreeVisibilityToggle
      : document.getElementById('degree-visibility-toggle');
    degreeVisibilityToggle = liveDegreeVisibilityToggle instanceof HTMLButtonElement
      ? liveDegreeVisibilityToggle
      : null;

    const cachedDegreeModeToggle = cachedElements['degreeModeToggle'];
    degreeModeToggle = (cachedDegreeModeToggle && cachedDegreeModeToggle.isConnected)
      ? cachedDegreeModeToggle
      : document.getElementById('degree-mode-toggle');
    degreeModeScaleButton = degreeModeToggle?.querySelector<HTMLButtonElement>('[data-mode="diatonic"]') ?? null;
    degreeModeModalButton = degreeModeToggle?.querySelector<HTMLButtonElement>('[data-mode="modal"]') ?? null;
    flatBtn = cachedElements['flatBtn'];
    sharpBtn = cachedElements['sharpBtn'];
    frequencyBtn = cachedElements['frequencyBtn'];
    octaveToggleBtn = cachedElements['octaveLabelBtn'];
    const cachedFocusColoursToggle = cachedElements['focusColoursToggle'];
    const liveFocusColoursToggle = (cachedFocusColoursToggle && cachedFocusColoursToggle.isConnected)
      ? cachedFocusColoursToggle
      : document.getElementById('focus-colours-toggle');
    focusColoursToggle = liveFocusColoursToggle instanceof HTMLButtonElement
      ? liveFocusColoursToggle
      : null;
    debugFocusColours('Resolved focus button element', {
      cachedFound: Boolean(cachedFocusColoursToggle),
      cachedConnected: Boolean(cachedFocusColoursToggle?.isConnected),
      resolvedFound: Boolean(focusColoursToggle),
      resolvedTag: focusColoursToggle?.tagName ?? null
    });

    harmonyContainer = document.getElementById('chords-panel');
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

        selectNoteBankNote(store, noteType, color, openSixteenthStampTab);
      });
    });

    // Eraser button
    if (eraserBtn) {
      eraserBtn.addEventListener('click', () => {
        if (store.state.selectedTool === 'eraser') {
          store.setSelectedTool(store.state.previousTool && store.state.previousTool !== 'eraser' ? store.state.previousTool : 'select');
          return;
        }
        store.setSelectedTool('eraser');
      });
    }

    document.getElementById('select-tool-button')?.addEventListener('click', () => store.setSelectedTool('select'));

    // Marker shortcut
    const markerShortcutBtn = document.getElementById('marker-shortcut-button');
    if (markerShortcutBtn) {
      markerShortcutBtn.addEventListener('click', () => {
        document.querySelector<HTMLButtonElement>('[data-tab="pitch"]')?.click();
        document.querySelector<HTMLButtonElement>('button.draw-tool-button[data-draw-tool="marker"]')?.click();
      });
    }

    // Major/Minor buttons and the remaining tonic modes share the selection action.
    tonicModeButtons.forEach(button => {
      button.addEventListener('click', () => {
        selectTonicMode(Number(button.dataset['tonic']));
        button.blur();
      });
    });
    document.querySelector('#tonic-other-modes')?.addEventListener('change', handleOtherTonicModeChange);
    updateTonicModeButtons();

    // Chord panel buttons
    if (chordsPanel) {
      chordsPanel.querySelectorAll<HTMLButtonElement>('.harmony-preset-button').forEach(button => {
        button.addEventListener('click', () => {
          const label = button.textContent?.trim() ?? '';
          const intervals = CHORD_SHAPES[label];
          if (intervals && intervals.length > 0) {
            if (isActiveChordSelection(store.state.selectedTool, store.state.activeChordIntervals, intervals)) {
              store.setSelectedTool('select');
            } else {
              store.setActiveChordIntervals(intervals);
              store.setSelectedTool('chord');
            }
          }
          button.blur();
        });

        button.addEventListener('dblclick', () => {
          store.setSelectedTool('select');
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
            if (isActiveChordSelection(store.state.selectedTool, store.state.activeChordIntervals, intervalData)) {
              store.setSelectedTool('select');
              button.blur();
              return;
            }

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

    cleanupToolSubtabState = initToolSubtabState({
      onPitchTabChanged: handlePitchTabChanged
    });
    cleanupDrumBeatPreviews = initDrumBeatPreviews();

    // Unified position toggle
    if (unifiedPositionToggle) {
      const toggleTrack = unifiedPositionToggle.querySelector<HTMLElement>('.toggle-track');
      const slider = unifiedPositionToggle.querySelector<HTMLElement>('.unified-slider');
      const listenerCleanups: Array<() => void> = [];
      let activePointerId: number | null = null;
      let dragStartY = 0;
      let didDrag = false;
      let suppressNextClick = false;

      const listen = (element: HTMLElement, type: string, listener: EventListener): void => {
        element.addEventListener(type, listener);
        listenerCleanups.push(() => element.removeEventListener(type, listener));
      };

      const setStepFromPointer = (event: PointerEvent): void => {
        if (!toggleTrack) return;
        const rect = toggleTrack.getBoundingClientRect();
        setStepValue(getUnifiedPositionStepFromPointer(
          event.clientY,
          rect.top,
          rect.height,
          getMaxSteps(),
          getToggleMode()
        ));
      };

      const handleTrackClick = (): void => {
        if (suppressNextClick) {
          suppressNextClick = false;
          return;
        }
        setStepValue(getNextUnifiedPositionStep(getCurrentStep(), getMaxSteps()));
        unifiedPositionToggle?.blur();
      };

      const handleSliderPointerDown = (event: PointerEvent): void => {
        if (event.button !== 0 || !slider) return;
        activePointerId = event.pointerId;
        dragStartY = event.clientY;
        didDrag = false;
        slider.setPointerCapture(event.pointerId);
        unifiedPositionToggle?.classList.add('is-dragging');
        event.preventDefault();
      };

      const handleSliderPointerMove = (event: PointerEvent): void => {
        if (event.pointerId !== activePointerId) return;
        if (!didDrag && Math.abs(event.clientY - dragStartY) < 3) return;
        didDrag = true;
        setStepFromPointer(event);
      };

      const finishSliderDrag = (event: PointerEvent): void => {
        if (event.pointerId !== activePointerId || !slider) return;
        if (didDrag) {
          setStepFromPointer(event);
          suppressNextClick = true;
          window.setTimeout(() => { suppressNextClick = false; }, 0);
        }
        if (slider.hasPointerCapture(event.pointerId)) {
          slider.releasePointerCapture(event.pointerId);
        }
        activePointerId = null;
        unifiedPositionToggle?.classList.remove('is-dragging');
      };

      const cancelSliderDrag = (event: PointerEvent): void => {
        if (event.pointerId !== activePointerId) return;
        activePointerId = null;
        didDrag = false;
        suppressNextClick = false;
        unifiedPositionToggle?.classList.remove('is-dragging');
      };

      if (toggleTrack) listen(toggleTrack, 'click', handleTrackClick);
      if (slider) {
        listen(slider, 'pointerdown', handleSliderPointerDown as EventListener);
        listen(slider, 'pointermove', handleSliderPointerMove as EventListener);
        listen(slider, 'pointerup', finishSliderDrag as EventListener);
        listen(slider, 'pointercancel', cancelSliderDrag as EventListener);
      }

      unifiedPositionToggle.querySelectorAll<HTMLElement>('.left-labels .state-label').forEach(label => {
        const handleLabelClick = (): void => {
          if (getToggleMode() !== 'inversion') return;
          setStepValue(parseInt(label.dataset['step'] ?? '0', 10));
        };
        listen(label, 'click', handleLabelClick);
      });

      unifiedPositionToggle.querySelectorAll<HTMLElement>('.right-labels .state-label').forEach(label => {
        const handleLabelClick = (): void => {
          if (getToggleMode() !== 'position') return;
          const step = parseInt(label.dataset['step'] ?? '0', 10);
          if (step < getMaxSteps()) setStepValue(step);
        };
        listen(label, 'click', handleLabelClick);
      });

      cleanupUnifiedPositionToggle = () => {
        listenerCleanups.forEach(cleanup => cleanup());
        unifiedPositionToggle?.classList.remove('is-dragging');
      };

      store.on('chordPositionChanged', updateUnifiedToggleVisual);
      store.on('intervalsInversionChanged', updateUnifiedToggleVisual);
      updateUnifiedToggleVisual();
    }

    // Degree visibility toggle
    if (pitchLabelsToggle) {
      pitchLabelsToggle.addEventListener('click', () => {
        store.setShowPitchLabels(!store.state.showPitchLabels);
        pitchLabelsToggle?.blur();
      });
    }

    if (pitchOctaveLabelsToggle) {
      pitchOctaveLabelsToggle.addEventListener('click', () => {
        store.setShowPitchOctaveLabels(!store.state.showPitchOctaveLabels);
        pitchOctaveLabelsToggle?.blur();
      });
    }

    if (degreeVisibilityToggle) {
      degreeVisibilityToggle.addEventListener('click', () => {
        const currentMode = store.state.degreeDisplayMode;
        if (currentMode === 'off') {
          if (!requireTonicShape()) {
            degreeVisibilityToggle?.blur();
            return;
          }
          store.setDegreeDisplayMode(getPreferredDegreeMode());
        } else {
          store.setDegreeDisplayMode('off');
        }
        degreeVisibilityToggle?.blur();
      });
    }

    // Degree mode buttons
    if (degreeModeScaleButton) {
      degreeModeScaleButton.addEventListener('click', () => {
        if (!requireTonicShape()) {
          degreeModeScaleButton?.blur();
          return;
        }
        if (store.state.degreeDisplayMode !== 'diatonic') {
          store.setDegreeDisplayMode('diatonic');
        }
        degreeModeScaleButton?.blur();
      });
    }

    if (degreeModeModalButton) {
      degreeModeModalButton.addEventListener('click', () => {
        if (!requireTonicShape()) {
          degreeModeModalButton?.blur();
          return;
        }
        if (store.state.degreeDisplayMode !== 'modal') {
          store.setDegreeDisplayMode('modal');
        }
        degreeModeModalButton?.blur();
      });
    }

    // Accidental buttons
    if (flatBtn) {
      flatBtn.addEventListener('click', () => {
        selectNonFrequencyLabelOption(
          () => store.state.accidentalMode.flat,
          () => store.toggleAccidentalMode('flat')
        );
        flatBtn?.blur();
      });
    }

    if (sharpBtn) {
      sharpBtn.addEventListener('click', () => {
        selectNonFrequencyLabelOption(
          () => store.state.accidentalMode.sharp,
          () => store.toggleAccidentalMode('sharp')
        );
        sharpBtn?.blur();
      });
    }

    if (frequencyBtn) {
      frequencyBtn.addEventListener('click', () => {
        store.toggleFrequencyLabels();
        frequencyBtn?.blur();
      });
    }

    if (octaveToggleBtn) {
      octaveToggleBtn.addEventListener('click', () => {
        selectNonFrequencyLabelOption(
          () => store.state.showOctaveLabels,
          () => store.toggleOctaveLabels()
        );
        octaveToggleBtn?.blur();
      });
    }

    if (focusColoursToggle) {
      focusColoursToggle.addEventListener('pointerdown', () => {
        debugFocusColours('pointerdown received on focus button');
      });
      focusColoursToggle.addEventListener('click', () => {
        debugFocusColours('click received on focus button', {
          currentState: store.state.focusColours,
          tonicShapesPresent: hasTonicShapesOnCanvas()
        });
        if (!requireTonicShape()) {
          syncFocusColoursUiState(false);
          debugFocusColours('Blocked enable: no tonic shapes present');
          focusColoursToggle?.blur();
          return;
        }
        store.toggleFocusColours();
        debugFocusColours('store.toggleFocusColours invoked', { nextState: store.state.focusColours });
        focusColoursToggle?.blur();
      });
    } else {
      debugFocusColours('Focus button binding skipped: button not found');
    }

    // Store event subscriptions
    store.on('toolChanged', handleToolChanged);
    store.on('activeChordIntervalsChanged', handleActiveChordIntervalsChanged);
    store.on('noteChanged', handleNoteChanged);
    store.on('degreeDisplayModeChanged', handleDegreeDisplayModeChanged);
    store.on('pitchLabelsChanged', handlePitchLabelsChanged);
    store.on('pitchOctaveLabelsChanged', handlePitchOctaveLabelsChanged);
    store.on('accidentalModeChanged', handleAccidentalModeChanged);
    store.on('frequencyLabelsChanged', syncFrequencyUiState);
    store.on('octaveLabelsChanged', syncOctaveUiState);
    store.on('focusColoursChanged', handleFocusColoursChanged);
    store.on('rhythmStructureChanged', handleTonicStructureChanged);

    // Initialize UI states
    handleToolChanged({ newTool: store.state.selectedTool });
    syncFrequencyUiState(store.state.showFrequencyLabels);
    syncOctaveUiState(store.state.showOctaveLabels);

    handleTonicStructureChanged();

    if (harmonyContainer && store.state.selectedNote) {
      applyHarmonyAccentColors(harmonyContainer, store.state.selectedNote.color);
    }

    const tabSidebar = document.querySelector<HTMLElement>('.tab-sidebar');
    if (tabSidebar && store.state.selectedNote) {
      tabSidebar.style.setProperty('--c-accent', store.state.selectedNote.color);
    }

    setTimeout(() => updateChordPositionToggleState(), 50);

    const currentMode = store.state.degreeDisplayMode;
    syncPitchLabelsButton(store.state.showPitchLabels, pitchLabelsToggle);
    syncPitchOctaveLabelsButton();
    syncDegreeVisibilityButton(currentMode, degreeVisibilityToggle);
    updateScaleModeToggleState(currentMode);

    updateChordButtonSelection();
    updateIntervalButtonSelection();
    updateChordPositionToggleState();

  });

  onDestroy(() => {
    document.querySelector('#tonic-other-modes')?.removeEventListener('change', handleOtherTonicModeChange);
    cleanupToolSubtabState?.();
    cleanupToolSubtabState = null;
    cleanupDrumBeatPreviews?.();
    cleanupDrumBeatPreviews = null;
    cleanupUnifiedPositionToggle?.();
    cleanupUnifiedPositionToggle = null;
    store.off('chordPositionChanged', updateUnifiedToggleVisual);
    store.off('intervalsInversionChanged', updateUnifiedToggleVisual);
    store.off('toolChanged', handleToolChanged);
    store.off('activeChordIntervalsChanged', handleActiveChordIntervalsChanged);
    store.off('noteChanged', handleNoteChanged);
    store.off('degreeDisplayModeChanged', handleDegreeDisplayModeChanged);
    store.off('pitchLabelsChanged', handlePitchLabelsChanged);
    store.off('pitchOctaveLabelsChanged', handlePitchOctaveLabelsChanged);
    store.off('accidentalModeChanged', handleAccidentalModeChanged);
    store.off('frequencyLabelsChanged', syncFrequencyUiState);
    store.off('octaveLabelsChanged', syncOctaveUiState);
    store.off('focusColoursChanged', handleFocusColoursChanged);
    store.off('rhythmStructureChanged', handleTonicStructureChanged);
  });
</script>

<!-- This is a headless component - no DOM output -->
