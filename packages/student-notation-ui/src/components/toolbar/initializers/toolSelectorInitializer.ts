// js/components/Toolbar/initializers/toolSelectorInitializer.ts
//
// NOTE: Chord definitions have been extracted to @data/chordDefinitions.ts
// for better code organization and reusability.
//
import store from '@state/initStore.ts';
import SixteenthStampsToolbar from '@components/rhythm/stampToolbars/sixteenthStampsToolbar.ts';
import domCache from '@services/domCache.ts';
import notificationSystem from '@components/ui/notificationSystem.ts';
import clefRangeController from '@components/clefWheels/clefRangeController.ts';
import logger from '@utils/logger.ts';

// Import chord definitions from data module
import {
  BASIC_CHORD_SHAPES,
  ADVANCED_CHORD_SHAPES,
  CHORD_SHAPES,
  INTERVAL_SHAPES,
  normalizeInterval,
  type HarmonyChordShapes
} from '@data/chordDefinitions.ts';

interface ToolChangedPayload {
  newTool?: string;
}

interface NoteChangedPayload {
  newNote?: { color?: string; shape?: 'circle' | 'oval' | 'diamond' };
}

interface _DegreeModeToggleElements {
  degreeVisibilityToggle: HTMLElement | null;
  degreeModeToggle: HTMLElement | null;
  flatBtn: HTMLElement | null;
  sharpBtn: HTMLElement | null;
  frequencyBtn: HTMLElement | null;
  focusColoursToggle: HTMLInputElement | null;
}

type DegreeDisplayMode = 'off' | 'diatonic' | 'modal';

let lastDegreeMode: Exclude<DegreeDisplayMode, 'off'> = 'diatonic';

const SIXTEENTH_FULL_STAMP_ID = 15;

/**
 * Checks if there are any tonic shapes placed on the canvas
 * @returns {boolean} True if there are tonic shapes, false otherwise
 */
function hasTonicShapesOnCanvas(): boolean {
  return Object.keys(store.state.tonicSignGroups).length > 0;
}

/**
 * Updates the disabled state of the Scale/Mode toggle based on degree display mode
 */
function updateScaleModeToggleState(mode: DegreeDisplayMode = store.state.degreeDisplayMode): void {
  const degreeModeToggle = document.getElementById('degree-mode-toggle');
  const scaleButton = degreeModeToggle?.querySelector<HTMLButtonElement>('[data-mode="diatonic"]');
  const modeButton = degreeModeToggle?.querySelector<HTMLButtonElement>('[data-mode="modal"]');

  if (!scaleButton || !modeButton) {return;}

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

  const scaleActive = effectiveMode === 'diatonic';
  scaleButton.classList.toggle('active', scaleActive);
  scaleButton.setAttribute('aria-pressed', scaleActive ? 'true' : 'false');

  const modeActive = effectiveMode === 'modal';
  modeButton.classList.toggle('active', modeActive);
  modeButton.setAttribute('aria-pressed', modeActive ? 'true' : 'false');
}

function syncDegreeVisibilityButton(mode: DegreeDisplayMode, visibilityButton: HTMLElement | null): void {
  if (!visibilityButton) {return;}
  const isOn = mode !== 'off';
  visibilityButton.classList.toggle('active', isOn);
  visibilityButton.setAttribute('aria-pressed', isOn ? 'true' : 'false');
}

/**
 * Updates the visual selection of the harmony preset buttons based on the current state.
 * Full match = 'selected', partial match = 'partial-match' (lighter highlighting)
 * Always shows partial matches regardless of selected tool for educational feedback
 */
function updateChordButtonSelection(): void {
  // Get the merged chords panel (use .chords-grid to avoid selecting intervals grid)
  const chordsPanel = document.querySelector<HTMLElement>('#chords-panel .chords-grid');

  // Clear selection from all chord buttons
  if (chordsPanel) {
    chordsPanel.querySelectorAll<HTMLButtonElement>('.harmony-preset-button').forEach(el => {
      el.classList.remove('selected', 'partial-match');
    });
  }

  // Find matching buttons based on active chord intervals (regardless of selected tool)
  if (store.state.activeChordIntervals && chordsPanel) {
    const currentIntervals = store.state.activeChordIntervals;
    const currentIntervalsString = currentIntervals.toString();

    // Normalize current intervals for octave equivalence
    const normalizedCurrentIntervals = currentIntervals.map(normalizeInterval);

    // Search through all chord buttons
    const buttons = chordsPanel.querySelectorAll<HTMLButtonElement>('.harmony-preset-button');
    for (const button of buttons) {
      const label = button.textContent?.trim() ?? '';
      const buttonIntervals = CHORD_SHAPES[label];
      if (!buttonIntervals) {continue;}

      const buttonIntervalsString = buttonIntervals.toString();
      const normalizedButtonIntervals = buttonIntervals.map(normalizeInterval);

      // Check for exact match
      if (buttonIntervalsString === currentIntervalsString) {
        button.classList.add('selected');
        continue;
      }

      // Check for partial match (all current intervals are in button's chord)
      const isPartialMatch = normalizedCurrentIntervals.every(interval =>
        normalizedButtonIntervals.includes(interval)
      );

      if (isPartialMatch) {
        button.classList.add('partial-match');
      }
    }
  }
}

/**
 * Updates the visual selection of interval buttons based on current active intervals.
 * Handles octave equivalence: 9th→2nd, 11th→4th, 13th→6th
 */
function updateIntervalButtonSelection(): void {
  const intervalsPanel = document.querySelector<HTMLElement>('#chords-panel .intervals-4x4-grid');
  if (!intervalsPanel) {return;}

  // Clear selection from all interval buttons
  intervalsPanel.querySelectorAll<HTMLButtonElement>('.harmony-preset-button').forEach(el => el.classList.remove('selected'));

  // If we have active chord intervals, highlight matching buttons (regardless of selected tool)
  if (store.state.activeChordIntervals) {
    const activeIntervals = store.state.activeChordIntervals;

    // Normalize active intervals to handle octave equivalence
    const normalizedActiveIntervals = activeIntervals.map(normalizeInterval);

    intervalsPanel.querySelectorAll<HTMLButtonElement>('.harmony-preset-button').forEach(button => {
      const intervalLabel = button.textContent?.trim() ?? '';
      const buttonInterval = INTERVAL_SHAPES[intervalLabel];
      // Check if this interval button matches any of the normalized active chord intervals
      const firstInterval = buttonInterval?.[0];
      if (firstInterval && normalizedActiveIntervals.includes(firstInterval)) {
        button.classList.add('selected');
      }
    });
  }
}


// Color helper functions for creating lighter/darker variants
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
  if (normalizedHex.length !== 6) {return hex;}
  const r = parseInt(normalizedHex.slice(0, 2), 16);
  const g = parseInt(normalizedHex.slice(2, 4), 16);
  const b = parseInt(normalizedHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const applyHarmonyAccentColors = (container: HTMLElement | null, color: string): void => {
  if (!container) {return;}
  const lightColor = lightenColor(color, 50);
  const extraLightColor = lightenColor(lightColor, 60);
  container.style.setProperty('--c-accent', color);
  container.style.setProperty('--c-accent-light', extraLightColor);
  container.style.setProperty('--harmony-partial-bg', hexToRgba(extraLightColor, 0.25));
  container.style.setProperty('--harmony-partial-border', hexToRgba(color, 0.4));
  container.style.setProperty('--harmony-partial-bg-hover', hexToRgba(extraLightColor, 0.4));
  container.style.setProperty('--harmony-partial-border-hover', hexToRgba(color, 0.6));
};

export function initToolSelectors() {
  const cachedElements = domCache.getMultiple(
    'noteBankContainer',
    'eraserButton',
    'degreeVisibilityToggle',
    'degreeModeToggle',
    'flatBtn',
    'sharpBtn',
    'frequencyBtn',
    'octaveLabelBtn',
    'focusColoursToggle'
  );

  const eraserBtn = cachedElements['eraserButton'];
  const degreeVisibilityToggle = cachedElements['degreeVisibilityToggle'] ?? null;
  const degreeModeToggle = cachedElements['degreeModeToggle'];
  const degreeModeScaleButton = degreeModeToggle?.querySelector<HTMLButtonElement>('[data-mode="diatonic"]') ?? null;
  const degreeModeModalButton = degreeModeToggle?.querySelector<HTMLButtonElement>('[data-mode="modal"]') ?? null;
  const flatBtn = cachedElements['flatBtn'];
  const sharpBtn = cachedElements['sharpBtn'];
  const frequencyBtn = cachedElements['frequencyBtn'];
  const octaveToggleBtn = cachedElements['octaveLabelBtn'];
  const focusColoursToggle = cachedElements['focusColoursToggle'] as HTMLInputElement | null;

  const getPreferredDegreeMode = (): Exclude<DegreeDisplayMode, 'off'> => {
    if (degreeModeModalButton?.classList.contains('active')) {
      return 'modal';
    }
    if (degreeModeScaleButton?.classList.contains('active')) {
      return 'diatonic';
    }
    return lastDegreeMode;
  };

  // Get harmony container directly since it uses a class, not an ID
  const harmonyContainer = document.querySelector<HTMLElement>('.pitch-tabs-container');

  // Get unified position toggle element (combined inversion + position)
  const unifiedPositionToggle = document.getElementById('unified-position-toggle');

  // Initialize clef range controls when the elements are available
  clefRangeController.init();

  const openSixteenthStampTab = (): void => {
    const rhythmTabButton = document.querySelector<HTMLButtonElement>('[data-tab="rhythm"]');
    if (rhythmTabButton && !rhythmTabButton.classList.contains('active')) {
      rhythmTabButton.click();
    }

    const sixteenthTabButton = document.querySelector<HTMLButtonElement>('[data-rhythm-stamp-tab="sixteenth"]');
    if (sixteenthTabButton && !sixteenthTabButton.classList.contains('active')) {
      sixteenthTabButton.click();
    }
  };

  // --- Tool Click Listeners ---
  // Support both old (.note-pair wrapper) and new (flat 5x5 grid) structures
  const allNotes = document.querySelectorAll<HTMLElement>('.note');
  allNotes.forEach(note => {
    note.addEventListener('click', () => {
      const noteType = note.dataset['type'] as 'circle' | 'oval' | 'diamond' | undefined;
      // Try direct data-color first (new flat structure), then fall back to parent .note-pair (old structure)
      const color = note.dataset['color'] || note.closest<HTMLElement>('.note-pair')?.dataset['color'];
      if (!noteType || !color) {return;}

      if (noteType === 'diamond') {
        store.setSelectedNote('diamond', color);

        const activeStampButton = document.querySelector<HTMLButtonElement>('.sixteenth-stamp-button.active');
        const activeStampId = activeStampButton
          ? parseInt(activeStampButton.dataset['sixteenthStampId'] ?? '', 10)
          : NaN;
        const isDifferentStampActive = store.state.selectedTool === 'sixteenthStamp'
          && activeStampButton
          && !Number.isNaN(activeStampId)
          && activeStampId !== SIXTEENTH_FULL_STAMP_ID;

        if (isDifferentStampActive) {return;}

        openSixteenthStampTab();
        SixteenthStampsToolbar.selectSixteenthStamp(SIXTEENTH_FULL_STAMP_ID);
        return;
      }

      store.setSelectedNote(noteType, color);
      store.setSelectedTool('note');
    });
  });

  if (eraserBtn) {
    eraserBtn.addEventListener('click', () => {
      if (store.state.selectedTool === 'eraser') {
        const fallbackTool = store.state.previousTool || 'note';
        store.setSelectedTool(fallbackTool);
        return;
      }
      store.setSelectedTool('eraser');
    });
  }

  // --- Lasso Shortcut Button Handler ---
  const lassoShortcutBtn = document.getElementById('lasso-shortcut-button');
  if (lassoShortcutBtn) {
    lassoShortcutBtn.addEventListener('click', () => {
      // Switch to Pitch main tab
      const pitchTabBtn = document.querySelector<HTMLButtonElement>('[data-tab="pitch"]');
      if (pitchTabBtn && !pitchTabBtn.classList.contains('active')) {
        pitchTabBtn.click();
      }
      // Switch to Draw sub-tab within Pitch
      const drawSubTabBtn = document.querySelector<HTMLButtonElement>('[data-pitch-tab="draw"]');
      if (drawSubTabBtn && !drawSubTabBtn.classList.contains('active')) {
        drawSubTabBtn.click();
      }
      // Select the lasso tool (use button.draw-tool-button to avoid matching the panel)
      const lassoToolBtn = document.querySelector<HTMLButtonElement>('button.draw-tool-button[data-draw-tool="lasso"]');
      if (lassoToolBtn) {
        lassoToolBtn.click();
      }
    });
  }

  // --- Marker Shortcut Button Handler ---
  const markerShortcutBtn = document.getElementById('marker-shortcut-button');
  if (markerShortcutBtn) {
    markerShortcutBtn.addEventListener('click', () => {
      // Switch to Pitch main tab
      const pitchTabBtn = document.querySelector<HTMLButtonElement>('[data-tab="pitch"]');
      if (pitchTabBtn && !pitchTabBtn.classList.contains('active')) {
        pitchTabBtn.click();
      }
      // Switch to Draw sub-tab within Pitch
      const drawSubTabBtn = document.querySelector<HTMLButtonElement>('[data-pitch-tab="draw"]');
      if (drawSubTabBtn && !drawSubTabBtn.classList.contains('active')) {
        drawSubTabBtn.click();
      }
      // Select the marker tool (use button.draw-tool-button to avoid matching the panel)
      const markerToolBtn = document.querySelector<HTMLButtonElement>('button.draw-tool-button[data-draw-tool="marker"]');
      if (markerToolBtn) {
        markerToolBtn.click();
      }
    });
  }

  // Get tonic mode buttons from the new grid structure
  const tonicModeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.tonic-mode-button'));

  const updateTonicModeButtons = (activeNumber: string | number | null | undefined = store.state.selectedToolTonicNumber) => {
    if (!tonicModeButtons.length) {return;}
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
  };

  if (tonicModeButtons.length) {
    tonicModeButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tonicNumber = button.getAttribute('data-tonic');
        if (!tonicNumber) {return;}
        const parsed = parseInt(tonicNumber, 10);
        store.setSelectedTool('tonicization', parsed);
        updateTonicModeButtons(parsed);
      });
    });
    updateTonicModeButtons();
  }

  // Attach chord shape handlers to buttons in the merged chords panel
  // NOTE: Use specific selector to avoid selecting interval grid
  const chordsPanel = document.querySelector<HTMLElement>('#chords-panel .chords-grid');

  // Helper function to add chord button event listeners
  function addChordButtonListeners(panel: Element | null, chordShapes: HarmonyChordShapes, panelName: string): void {
    if (!panel) {return;}

    panel.querySelectorAll<HTMLButtonElement>('.harmony-preset-button').forEach(button => {
      button.addEventListener('click', () => {
        const label = button.textContent?.trim() ?? '';
        const intervals = chordShapes[label];
        if (intervals && intervals.length > 0) {
          store.setActiveChordIntervals(intervals);
          store.setSelectedTool('chord');
          // No need for setTimeout - state event handler will update toggle
        } else {
          logger.error('ToolSelector', `Failed to retrieve valid intervals for ${panelName} chord: "${label}"`, null, 'toolbar');
        }
        button.blur(); // Remove focus to prevent lingering highlight
      });

      // Add double-click functionality to disable chord shapes
      button.addEventListener('dblclick', () => {
        // Only handle double-click if this button is currently selected
        if (button.classList.contains('selected')) {
          // Return to note tool to use the most recent shape note
          store.setSelectedTool('note');
        }
        button.blur(); // Remove focus to prevent lingering highlight
      });
    });
  }

  // Add event listeners to the merged chords panel
  addChordButtonListeners(chordsPanel, CHORD_SHAPES, 'chords');

  // Add chord tab switching logic
  const pitchTabButtons = document.querySelectorAll<HTMLButtonElement>('.pitch-tab-button');
  const pitchTabPanels = document.querySelectorAll<HTMLElement>('.pitch-tab-panel');

  if (pitchTabButtons.length > 0) {
    pitchTabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = button.dataset['pitchTab'];
        if (!targetTab) {return;}
        const ensuredTargetTab = targetTab;

        // Update active tab button
        pitchTabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Update active tab panel
        pitchTabPanels.forEach(panel => panel.classList.remove('active'));
        const targetPanel = document.getElementById(`${ensuredTargetTab}-panel`);
        if (targetPanel) {
          targetPanel.classList.add('active');
        }

        // Save the selected pitch sub-tab to localStorage
        localStorage.setItem('selectedPitchTab', ensuredTargetTab);

        // Update toggle state when switching to chords tab
        if (targetTab === 'chords') {
          updateChordPositionToggleState();
        }

        // Refresh clef wheel visuals when switching to range tab
        if (targetTab === 'range') {
          // Use setTimeout to ensure the tab is visible before updating visuals
          setTimeout(() => {
            clefRangeController.refreshWheelVisuals();
          }, 0);
        }
      });
    });

    // Restore saved pitch sub-tab on page load
    const savedPitchTab = localStorage.getItem('selectedPitchTab') || 'chords';
    const pitchTabButton = document.querySelector<HTMLButtonElement>(`[data-pitch-tab="${savedPitchTab}"]`);
    const pitchTabPanel = document.getElementById(`${savedPitchTab}-panel`);
    if (pitchTabButton && pitchTabPanel) {
      pitchTabButtons.forEach(btn => btn.classList.remove('active'));
      pitchTabPanels.forEach(panel => panel.classList.remove('active'));
      pitchTabButton.classList.add('active');
      pitchTabPanel.classList.add('active');
    }
  }

  // Add rhythm tab switching logic
  const rhythmTabButtons = document.querySelectorAll<HTMLButtonElement>('.rhythm-stamp-tab-button');
  const rhythmTabPanels = document.querySelectorAll<HTMLElement>('.rhythm-stamp-tab-panel');

  if (rhythmTabButtons.length > 0) {
    rhythmTabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = button.dataset['rhythmStampTab'];
        if (!targetTab) {return;}
        const ensuredTargetTab = targetTab;

        // Update active tab button
        rhythmTabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Update active tab panel
        rhythmTabPanels.forEach(panel => panel.classList.remove('active'));
        const targetPanel = document.getElementById(`${ensuredTargetTab}-stamps-panel`);
        if (targetPanel) {
          targetPanel.classList.add('active');
        }

        // Save the selected rhythm sub-tab to localStorage
        localStorage.setItem('selectedRhythmStampTab', ensuredTargetTab);
      });
    });

    // Restore saved rhythm sub-tab on page load
    const savedRhythmTab = localStorage.getItem('selectedRhythmStampTab') || localStorage.getItem('selectedRhythmTab');
    const normalizedRhythmTab = savedRhythmTab === 'stamps'
      ? 'sixteenth'
      : savedRhythmTab === 'triplets'
        ? 'triplet'
        : (savedRhythmTab || 'sixteenth');
    const rhythmTabButton = document.querySelector<HTMLButtonElement>(`[data-rhythm-stamp-tab="${normalizedRhythmTab}"]`);
    const rhythmTabPanel = document.getElementById(`${normalizedRhythmTab}-stamps-panel`);
    if (rhythmTabButton && rhythmTabPanel) {
      rhythmTabButtons.forEach(btn => btn.classList.remove('active'));
      rhythmTabPanels.forEach(panel => panel.classList.remove('active'));
      rhythmTabButton.classList.add('active');
      rhythmTabPanel.classList.add('active');
    }
  }

  // --- Unified Position Toggle Handler (Combined Inversion + Position) ---
  // Determine toggle mode based on note count
  function getToggleMode(): 'inversion' | 'position' {
    const noteCount = store.state.activeChordIntervals?.length ?? 0;
    return noteCount === 2 ? 'inversion' : 'position';
  }

  // Get max valid steps for current mode
  function getMaxSteps(): number {
    const noteCount = store.state.activeChordIntervals?.length ?? 1;
    if (noteCount === 2) {return 2;} // Inversion mode: ASC/DESC
    return Math.max(1, noteCount); // Position mode: ROOT through (N-1)th
  }

  // Get current step based on mode and state
  function getCurrentStep(): number {
    const mode = getToggleMode();
    if (mode === 'inversion') {
      return store.state.isIntervalsInverted ? 1 : 0; // 0=ASC, 1=DESC
    }
    return store.state.chordPositionState;
  }

  // Set step value in state based on mode
  function setStepValue(step: number): void {
    const mode = getToggleMode();
    if (mode === 'inversion') {
      store.setIntervalsInversion(step === 1);
    } else {
      store.setChordPosition(step);
    }
  }

  // Update toggle visual state
  function updateUnifiedToggleVisual(): void {
    if (!unifiedPositionToggle) {return;}

    const mode = getToggleMode();
    const currentStep = getCurrentStep();
    const noteCount = store.state.activeChordIntervals?.length ?? 1;

    // Update mode classes
    unifiedPositionToggle.classList.toggle('inversion-mode', mode === 'inversion');
    unifiedPositionToggle.classList.toggle('position-mode', mode === 'position');

    // Update slider position (remove all state classes, add current)
    unifiedPositionToggle.classList.remove('state-1', 'state-2', 'state-3', 'state-4', 'state-5');
    if (currentStep >= 1 && currentStep <= 5) {
      unifiedPositionToggle.classList.add(`state-${currentStep}`);
    }

    // Update disabled state classes for position mode
    for (let i = 1; i <= 5; i++) {
      unifiedPositionToggle.classList.remove(`disabled-state-${i}`);
    }

    if (mode === 'position') {
      // Disable positions beyond what the chord supports
      // disabled-state-N means positions N and above are disabled
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

  // Handle mode transitions when noteCount changes
  let previousMode = getToggleMode();

  function handleModeTransition(): void {
    const newMode = getToggleMode();
    const noteCount = store.state.activeChordIntervals?.length ?? 1;

    if (previousMode !== newMode) {
      if (newMode === 'inversion') {
        // Position -> Inversion: ROOT maps to ASC, others map to DESC
        const wasRoot = store.state.chordPositionState === 0;
        store.setIntervalsInversion(!wasRoot);
      } else {
        // Inversion -> Position: Default to ROOT
        store.setChordPosition(0);
      }
      previousMode = newMode;
    } else if (newMode === 'position') {
      // Still in position mode, but noteCount may have changed
      // Clamp position to valid range
      const maxPosition = Math.max(0, noteCount - 1);
      if (store.state.chordPositionState > maxPosition) {
        store.setChordPosition(0);
      }
    }

    updateUnifiedToggleVisual();
  }

  if (unifiedPositionToggle) {
    // Click on track cycles through steps
    const toggleTrack = unifiedPositionToggle.querySelector<HTMLElement>('.toggle-track');
    if (toggleTrack) {
      toggleTrack.addEventListener('click', () => {
        const currentStep = getCurrentStep();
        const maxSteps = getMaxSteps();
        const nextStep = (currentStep + 1) % maxSteps;
        setStepValue(nextStep);
        unifiedPositionToggle.blur();
      });
    }

    // Add click handlers for labels (direct jump)
    const leftLabels = unifiedPositionToggle.querySelectorAll<HTMLElement>('.left-labels .state-label');
    const rightLabels = unifiedPositionToggle.querySelectorAll<HTMLElement>('.right-labels .state-label');

    leftLabels.forEach(label => {
      label.addEventListener('click', () => {
        const mode = getToggleMode();
        if (mode !== 'inversion') {return;} // Only active in inversion mode

        const step = parseInt(label.dataset['step'] ?? '0', 10);
        setStepValue(step);
      });
    });

    rightLabels.forEach(label => {
      label.addEventListener('click', () => {
        const mode = getToggleMode();
        if (mode !== 'position') {return;} // Only active in position mode

        const step = parseInt(label.dataset['step'] ?? '0', 10);
        const maxSteps = getMaxSteps();
        if (step < maxSteps) {
          setStepValue(step);
        }
      });
    });

    // Listen for state changes to update visual
    store.on('chordPositionChanged', () => {
      updateUnifiedToggleVisual();
    });

    store.on('intervalsInversionChanged', () => {
      updateUnifiedToggleVisual();
    });

    // Initialize visual state
    updateUnifiedToggleVisual();
  }

  // Function to update toggle state when chord intervals change
  function updateChordPositionToggleState(): void {
    handleModeTransition();
  }

  // Add interval button handlers for the intervals grid in chords panel
  const intervalsPanel = document.querySelector<HTMLElement>('#chords-panel .intervals-4x4-grid');
  if (intervalsPanel) {
    intervalsPanel.querySelectorAll<HTMLButtonElement>('.harmony-preset-button').forEach(button => {
      button.addEventListener('click', () => {
        const intervalLabel = button.textContent?.trim() ?? '';
        const intervalData = INTERVAL_SHAPES[intervalLabel];

        if (intervalData && intervalData.length > 0) {
          const clickedInterval = intervalData[0];
          if (!clickedInterval) {return;}

          // Get current active intervals (or start fresh)
          let currentIntervals = store.state.selectedTool === 'chord' && store.state.activeChordIntervals
            ? [...store.state.activeChordIntervals]  // Clone the array
            : ['1P'];  // Start with root only

          // Toggle logic: Add or remove the interval
          if (currentIntervals.includes(clickedInterval)) {
            // Remove interval (but always keep root)
            if (clickedInterval !== '1P') {
              currentIntervals = currentIntervals.filter(i => i !== clickedInterval);
            }
          } else {
            // Add interval
            currentIntervals.push(clickedInterval);
          }

          // Ensure root is always present
          if (!currentIntervals.includes('1P')) {
            currentIntervals.unshift('1P');
          }

          // Sort intervals by their position in chromatic scale for consistent ordering
          const intervalOrder = ['1P', '2m', '2M', '2A', '3m', '3M', '4P', '4A', '5d', '5P', '5A', '6m', '6M', '6A', '7m', '7M', '9M', '11P', '11A', '13M'];
          currentIntervals.sort((a, b) => {
            const indexA = intervalOrder.indexOf(a);
            const indexB = intervalOrder.indexOf(b);
            return indexA - indexB;
          });

          // Update state with new interval set
          store.setActiveChordIntervals(currentIntervals);
          store.setSelectedTool('chord');

          logger.debug('ToolSelector', `Interval ${intervalLabel} toggled`, currentIntervals, 'toolbar');
        } else {
          logger.error('ToolSelector', `Failed to retrieve valid interval for symbol: "${intervalLabel}"`, null, 'toolbar');
          logger.error('ToolSelector', 'Available interval shapes', Object.keys(INTERVAL_SHAPES), 'toolbar');
        }
        button.blur(); // Remove focus to prevent lingering highlight
      });

      // Add double-click functionality to clear all intervals (reset to root only)
      button.addEventListener('dblclick', () => {
        // Reset to just root
        store.setActiveChordIntervals(['1P']);
        store.setSelectedTool('chord');
        button.blur();
      });
    });
  }

  // Degree Visibility Toggle (Show/Hide)
  if (degreeVisibilityToggle) {
    degreeVisibilityToggle.addEventListener('click', () => {
      const currentMode = store.state.degreeDisplayMode;
      const isCurrentlyOff = currentMode === 'off';

      if (isCurrentlyOff) {
        // Check if there are tonic shapes on canvas before turning on
        if (!hasTonicShapesOnCanvas()) {
          notificationSystem.alert(
            'Please place a tonal center on the canvas before showing degrees.',
            'Tonal Center Required'
          );
          return;
        }

        // If degrees are off, turn them on with the preferred mode (defaults to last used)
        const preferredMode = getPreferredDegreeMode();
        store.setDegreeDisplayMode(preferredMode);
      } else {
        // If degrees are on, turn them off
        store.setDegreeDisplayMode('off');
      }
      degreeVisibilityToggle.blur();
    });
  }

  // Degree Mode Toggle buttons (Scale/Mode) - only one active at a time
  const setDegreeMode = (targetMode: Exclude<DegreeDisplayMode, 'off'>): void => {
    if (store.state.degreeDisplayMode === 'off') {return;}
    if (store.state.degreeDisplayMode === targetMode) {return;}
    store.setDegreeDisplayMode(targetMode);
  };

  if (degreeModeScaleButton) {
    degreeModeScaleButton.addEventListener('click', () => {
      setDegreeMode('diatonic');
      degreeModeScaleButton.blur();
    });
  }

  if (degreeModeModalButton) {
    degreeModeModalButton.addEventListener('click', () => {
      setDegreeMode('modal');
      degreeModeModalButton.blur();
    });
  }
  if (flatBtn) {flatBtn.addEventListener('click', () => {
    // Toggling flat/sharp automatically turns off Hz mode
    if (store.state.showFrequencyLabels) {
      store.toggleFrequencyLabels();
    }
    store.toggleAccidentalMode('flat');
    flatBtn.blur(); // Remove focus to prevent lingering blue highlight
  });}
  if (sharpBtn) {sharpBtn.addEventListener('click', () => {
    // Toggling flat/sharp automatically turns off Hz mode
    if (store.state.showFrequencyLabels) {
      store.toggleFrequencyLabels();
    }
    store.toggleAccidentalMode('sharp');
    sharpBtn.blur(); // Remove focus to prevent lingering blue highlight
  });}
  if (frequencyBtn) {frequencyBtn.addEventListener('click', () => {
    // Hz button toggles independently, doesn't affect flat/sharp states
    store.toggleFrequencyLabels();
    frequencyBtn.blur(); // Remove focus to prevent lingering blue highlight
  });}
  if (octaveToggleBtn) {octaveToggleBtn.addEventListener('click', () => {
    // Toggling octaves automatically turns off Hz mode (consistent with flat/sharp)
    if (store.state.showFrequencyLabels) {
      store.toggleFrequencyLabels();
    }
    store.toggleOctaveLabels();
    octaveToggleBtn.blur();
  });}

  const setAccidentalButtonsLocked = (locked: boolean): void => {
    // Hz mode disables Flat, Sharp, and Octaves buttons (all pitch label options)
    [flatBtn, sharpBtn, octaveToggleBtn].forEach(btn => {
      if (!btn) {return;}
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
    if (!octaveToggleBtn) {return;}
    octaveToggleBtn.classList.toggle('active', showOctaveLabels);
    octaveToggleBtn.setAttribute('aria-pressed', showOctaveLabels ? 'true' : 'false');
  };
  if (focusColoursToggle) {focusColoursToggle.addEventListener('change', () => {
    // If turning on Focus Colours, check for tonic shapes
    if (!store.state.focusColours && !hasTonicShapesOnCanvas()) {
      notificationSystem.alert(
        'Please place a tonal center on the canvas before enabling focus colours.',
        'Tonal Center Required'
      );
      // Reset the checkbox since we're not proceeding
      focusColoursToggle.checked = false;
      return;
    }
    store.toggleFocusColours();
  });}

  // --- UI State Change Listeners (Visual Feedback) ---
  store.on('toolChanged', ({ newTool }: ToolChangedPayload = {}) => {
    // Handle tool-specific UI (but NOT data-driven visual state)
    eraserBtn?.classList.remove('selected');
    if (harmonyContainer) {harmonyContainer.classList.remove('active-tool');}

    if (newTool === 'eraser') {
      eraserBtn?.classList.add('selected');
    } else if (newTool === 'tonicization') {
      // Tonic buttons remain highlighted via updateTonicModeButtons
    } else if (newTool === 'chord') {
      harmonyContainer?.classList.add('active-tool');
      // Interval/chord visual state is handled by data listeners, not tool listeners
      // This ensures visual feedback persists regardless of active tool
    } else if (newTool === 'note') {
      // Re-select the current note when switching to note tool
      const currentNote = store.state.selectedNote;
      if (currentNote) {
        const targetPair = document.querySelector(`.note-pair[data-color='${currentNote.color}']`);
        targetPair?.classList.add('selected');
        targetPair?.querySelector(`.note[data-type='${currentNote.shape}']`)?.classList.add('selected');
      }
    }

    updateTonicModeButtons();
  });

  store.on('activeChordIntervalsChanged', () => {
    // Always update visual feedback when chord intervals change
    // This provides continuous educational feedback regardless of active tool
    updateChordButtonSelection();
    updateIntervalButtonSelection();
    updateChordPositionToggleState(); // Update position toggle based on new chord
  });

  store.on('noteChanged', ({ newNote }: NoteChangedPayload = {}) => {
    if (!newNote?.color || !newNote.shape) {return;}
    const { color, shape } = newNote;
    // Clear all selections (supports both old .note-pair wrapper and new flat structure)
    document.querySelectorAll('.note, .note-pair').forEach(el => el.classList.remove('selected'));

    // Try new flat structure first (direct data-color on notes)
    const targetNote = document.querySelector<HTMLElement>(`.note[data-color='${color}'][data-type='${shape}']`);
    if (targetNote) {
      targetNote.classList.add('selected');
    } else {
      // Fall back to old structure with .note-pair wrapper
      const targetPair = document.querySelector<HTMLElement>(`.note-pair[data-color='${color}']`);
      targetPair?.classList.add('selected');
      targetPair?.querySelector<HTMLElement>(`.note[data-type='${shape}']`)?.classList.add('selected');
    }

    // Set accent color and lighter variant for chord button styling
    applyHarmonyAccentColors(harmonyContainer, color);
    const tabSidebar = document.querySelector<HTMLElement>('.tab-sidebar');
    if (tabSidebar) {
      tabSidebar.style.setProperty('--c-accent', color);
    }
  });

  store.on('degreeDisplayModeChanged', (mode?: DegreeDisplayMode) => {
    if (!mode) {return;}
    syncDegreeVisibilityButton(mode, degreeVisibilityToggle);
    updateScaleModeToggleState(mode);
  });

  store.on('accidentalModeChanged', (accidentalMode?: { sharp: boolean; flat: boolean }) => {
    if (!accidentalMode) {return;}
    const { sharp, flat } = accidentalMode;
    sharpBtn?.classList.toggle('active', sharp);
    flatBtn?.classList.toggle('active', flat);
  });

  store.on('frequencyLabelsChanged', (showFrequencyLabels?: boolean) => {
    if (typeof showFrequencyLabels !== 'boolean') {return;}
    syncFrequencyUiState(showFrequencyLabels);
  });
  store.on('octaveLabelsChanged', (showOctaveLabels?: boolean) => {
    if (typeof showOctaveLabels !== 'boolean') {return;}
    syncOctaveUiState(showOctaveLabels);
  });
  syncFrequencyUiState(store.state.showFrequencyLabels);
  syncOctaveUiState(store.state.showOctaveLabels);

  // Initialize accent colors on startup
  if (harmonyContainer && store.state.selectedNote) {
    const color = store.state.selectedNote.color;
    applyHarmonyAccentColors(harmonyContainer, color);
  }
  const tabSidebar = document.querySelector<HTMLElement>('.tab-sidebar');
  if (tabSidebar && store.state.selectedNote) {
    tabSidebar.style.setProperty('--c-accent', store.state.selectedNote.color);
  }

  // Initialize toggle state on startup
  setTimeout(() => updateChordPositionToggleState(), 50);

  // Initialize degree display toggle states from saved state
  const currentMode = store.state.degreeDisplayMode;
  syncDegreeVisibilityButton(currentMode, degreeVisibilityToggle);
  updateScaleModeToggleState(currentMode);

  // Initialize interval and chord button selection on startup
  // This ensures the U button is highlighted with initial state of ["1P"]
  // Run regardless of selected tool so intervals show initial state
  updateChordButtonSelection();
  updateIntervalButtonSelection();
  updateChordPositionToggleState();
}

function initToolbar() {}

export { initToolbar };
export default { initToolbar };
