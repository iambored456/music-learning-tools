<script lang="ts">
  /**
   * SidebarBridge - Headless Svelte component
   *
   * This component manages sidebar, volume popup, and various toggle controls.
   */
  import { onMount, onDestroy } from 'svelte';
  import { initLocalDrumSampleChoices } from '@components/canvas/drumGrid/drumGridInteractor.ts';
  import store from '@state/initStore.ts';
  import LayoutService from '@services/layoutService.ts';
  import { preloadDrumSamples } from '@services/transport/drumManager.ts';
  import { notificationSystem } from '../ui/NotificationModal.svelte';
  import {
    convertToSnapshot,
    validateForExport,
    writeHandoffSlot,
    navigateToSingingTrainer,
    type StudentNotationState,
  } from '@mlt/handoff';

  // DOM element references
  let settingsBtn: HTMLElement | null = null;
  let sidebar: HTMLElement | null = null;
  let sidebarOverlay: HTMLElement | null = null;
  let volumeIconBtn: HTMLElement | null = null;
  let volumePopup: HTMLElement | null = null;
  let verticalVolumeSlider: HTMLInputElement | null = null;

  // Anacrusis toggle
  let anacrusisOnBtn: HTMLElement | null = null;
  let anacrusisOffBtn: HTMLElement | null = null;

  // Grid visibility toggles
  let drumGridToggleBtn: HTMLElement | null = null;
  let drumGridWrapper: HTMLElement | null = null;
  let buttonGridToggleBtn: HTMLElement | null = null;
  let buttonGridWrapper: HTMLElement | null = null;
  let leftLegendToggleBtn: HTMLElement | null = null;
  let leftLegendCanvas: HTMLElement | null = null;
  let rightLegendToggleBtn: HTMLElement | null = null;
  let rightLegendCanvas: HTMLElement | null = null;
  let pitchGridContainer: HTMLElement | null = null;

  // Handoff button
  let takeToSingingTrainerBtn: HTMLElement | null = null;

  // State tracking
  let isDrumGridVisible = true;
  let isButtonGridVisible = true;
  let isLeftLegendVisible = true;
  let isRightLegendVisible = true;

  const VOLUME_STORAGE_KEY = 'app.volumeSliderValue';

  // Volume helper functions
  function clampVolume(value: number): number {
    return Math.min(100, Math.max(0, value));
  }

  function getStoredVolume(): number {
    try {
      const saved = window.localStorage.getItem(VOLUME_STORAGE_KEY);
      if (saved !== null) {
        const parsed = Number(saved);
        if (!Number.isNaN(parsed)) {
          return clampVolume(parsed);
        }
      }
    } catch {
      // Ignore localStorage access issues
    }
    return 70;
  }

  function storeVolume(value: number): void {
    try {
      window.localStorage.setItem(VOLUME_STORAGE_KEY, String(clampVolume(value)));
    } catch {
      // Ignore localStorage write issues
    }
  }

  // Event handlers
  function toggleSidebar() {
    document.body.classList.toggle('sidebar-open');
  }

  function handleVolumeIconClick(e: Event) {
    e.stopPropagation();
    if (!volumePopup || !volumeIconBtn) return;
    const isVisible = volumePopup.classList.toggle('visible');
    volumeIconBtn.classList.toggle('active', isVisible);
  }

  function handleVolumeChange(this: HTMLInputElement) {
    const value = parseInt(this.value, 10);
    const dB = (value === 0) ? -Infinity : (value / 100) * 37.5 - 50;
    volumeIconBtn?.querySelector('img')?.classList.toggle('volume-icon-muted', value === 0);
    store.emit('volumeChanged', dB);
    storeVolume(value);
  }

  function handleDocumentClickForVolume(e: Event) {
    if (!volumePopup || !volumeIconBtn) return;
    if (!volumePopup.contains(e.target as Node) && e.target !== volumeIconBtn) {
      volumePopup.classList.remove('visible');
      volumeIconBtn.classList.remove('active');
    }
  }

  // Anacrusis handlers
  function handleAnacrusisOn() { store.setAnacrusis(true); }
  function handleAnacrusisOff() { store.setAnacrusis(false); }

  function handleAnacrusisChanged(data: unknown) {
    const isEnabled = data as boolean;
    anacrusisOnBtn?.classList.toggle('active', isEnabled);
    anacrusisOffBtn?.classList.toggle('active', !isEnabled);
  }

  // Grid visibility handlers
  function syncVisibilityButton(
    button: HTMLElement | null,
    isVisible: boolean,
    hideLabel: string,
    showLabel: string
  ): void {
    if (!button) return;
    const label = button.querySelector<HTMLElement>('.sidebar-button-text') ?? button;
    label.textContent = isVisible ? hideLabel : showLabel;
    button.classList.toggle('active', !isVisible);
    button.setAttribute('aria-pressed', String(!isVisible));
  }

  function syncLegendTransparency(): void {
    pitchGridContainer?.classList.toggle(
      'has-hidden-legend',
      !isLeftLegendVisible || !isRightLegendVisible
    );
  }

  function handleDrumGridToggle() {
    isDrumGridVisible = !isDrumGridVisible;
    if (drumGridWrapper) {
      drumGridWrapper.style.display = isDrumGridVisible ? 'flex' : 'none';
    }
    if (isDrumGridVisible) {
      void preloadDrumSamples();
      void initLocalDrumSampleChoices();
    }
    syncVisibilityButton(drumGridToggleBtn, isDrumGridVisible, 'Hide Drum Grid', 'Show Drum Grid');
    setTimeout(() => LayoutService.recalculateLayout(), 10);
  }

  function handleButtonGridToggle() {
    isButtonGridVisible = !isButtonGridVisible;
    if (buttonGridWrapper) {
      buttonGridWrapper.style.display = isButtonGridVisible ? 'flex' : 'none';
    }
    syncVisibilityButton(buttonGridToggleBtn, isButtonGridVisible, 'Hide Button Grid', 'Show Button Grid');
    setTimeout(() => LayoutService.recalculateLayout(), 10);
  }

  function handleLeftLegendToggle() {
    isLeftLegendVisible = !isLeftLegendVisible;
    if (leftLegendCanvas) {
      leftLegendCanvas.style.display = isLeftLegendVisible ? 'block' : 'none';
    }
    syncVisibilityButton(leftLegendToggleBtn, isLeftLegendVisible, 'Hide Left Legend', 'Show Left Legend');
    syncLegendTransparency();
    setTimeout(() => LayoutService.recalculateLayout(), 10);
  }

  function handleRightLegendToggle() {
    isRightLegendVisible = !isRightLegendVisible;
    if (rightLegendCanvas) {
      rightLegendCanvas.style.display = isRightLegendVisible ? 'block' : 'none';
    }
    syncVisibilityButton(rightLegendToggleBtn, isRightLegendVisible, 'Hide Right Legend', 'Show Right Legend');
    syncLegendTransparency();
    setTimeout(() => LayoutService.recalculateLayout(), 10);
  }

  // Handoff handlers
  function showHandoffNotification(title: string, message: string, details: string[] = []): void {
    notificationSystem.show({
      title,
      message,
      details,
      buttons: [{ text: 'OK', primary: true }],
    });
  }

  function hasPitchNotes(): boolean {
    return store.state.placedNotes.some(note => !note.isDrum);
  }

  async function handleTakeToSingingTrainer(): Promise<void> {
    // Check if there are any notes to export
    if (!hasPitchNotes()) {
      showHandoffNotification(
        'Cannot Export',
        'No notes to export. Add some pitch notes to the grid before exporting to Singing Trainer.'
      );
      return;
    }

    // Build the state object for conversion
    const state: StudentNotationState = {
      placedNotes: store.state.placedNotes,
      macrobeatGroupings: store.state.macrobeatGroupings,
      macrobeatBoundaryStyles: store.state.macrobeatBoundaryStyles,
      fullRowData: store.state.fullRowData,
      pitchRange: store.state.pitchRange,
      tempo: store.state.tempo,
      annotations: store.state.annotations,
    };

    // Convert to snapshot
    const snapshot = convertToSnapshot(state);

    // Validate for Singing Trainer requirements
    const validation = validateForExport(snapshot);

    if (!validation.isValid) {
      // Format conflicts for display
      const conflictMessages: string[] = [];
      for (const conflict of validation.details.conflicts) {
        const colRange = conflict.conflictColumns.length === 1
          ? `column ${conflict.conflictColumns[0]}`
          : `columns ${conflict.conflictColumns[0]}-${conflict.conflictColumns[conflict.conflictColumns.length - 1]}`;

        conflictMessages.push(`Voice "${conflict.color}": Overlap at ${colRange}`);
      }

      showHandoffNotification(
        'Cannot Export to Singing Trainer',
        validation.summary,
        conflictMessages
      );
      return;
    }

    // Validation passed - write to handoff slot
    try {
      const handoffId = await writeHandoffSlot(snapshot);

      // Navigate to Singing Trainer
      navigateToSingingTrainer(handoffId);
    } catch (error) {
      console.error('[Svelte] Failed to write handoff slot', error);
      showHandoffNotification(
        'Export Failed',
        'An error occurred while preparing the handoff. Please try again.'
      );
    }
  }

  onMount(() => {
    // Sidebar and volume
    settingsBtn = document.getElementById('settings-button');
    sidebar = document.getElementById('sidebar');
    sidebarOverlay = document.getElementById('sidebar-overlay');
    volumeIconBtn = document.getElementById('volume-icon-button');
    volumePopup = document.getElementById('volume-popup');
    verticalVolumeSlider = document.getElementById('vertical-volume-slider') as HTMLInputElement | null;

    // Anacrusis toggle
    anacrusisOnBtn = document.getElementById('anacrusis-on-btn');
    anacrusisOffBtn = document.getElementById('anacrusis-off-btn');

    // Grid visibility toggles
    drumGridToggleBtn = document.getElementById('hide-drumgrid-toggle');
    drumGridWrapper = document.getElementById('drum-grid-wrapper');
    buttonGridToggleBtn = document.getElementById('hide-buttongrid-toggle');
    buttonGridWrapper = document.getElementById('button-grid');
    leftLegendToggleBtn = document.getElementById('hide-leftlegend-toggle');
    leftLegendCanvas = document.getElementById('legend-left-canvas');
    rightLegendToggleBtn = document.getElementById('hide-rightlegend-toggle');
    rightLegendCanvas = document.getElementById('legend-right-canvas');
    pitchGridContainer = document.getElementById('pitch-grid-container');

    // Handoff button
    takeToSingingTrainerBtn = document.getElementById('take-to-singing-trainer-button');

    // Sidebar event listeners
    if (settingsBtn && sidebar && sidebarOverlay) {
      settingsBtn.addEventListener('click', toggleSidebar);
      sidebarOverlay.addEventListener('click', toggleSidebar);
    }

    // Volume popup event listeners
    if (volumeIconBtn && volumePopup && verticalVolumeSlider) {
      const initialVolume = getStoredVolume();
      verticalVolumeSlider.value = String(initialVolume);
      volumeIconBtn.addEventListener('click', handleVolumeIconClick);
      verticalVolumeSlider.addEventListener('input', handleVolumeChange);
      document.addEventListener('click', handleDocumentClickForVolume);
      verticalVolumeSlider.dispatchEvent(new Event('input'));
    }

    // Anacrusis event listeners
    if (anacrusisOnBtn && anacrusisOffBtn) {
      anacrusisOnBtn.addEventListener('click', handleAnacrusisOn);
      anacrusisOffBtn.addEventListener('click', handleAnacrusisOff);
      store.on('anacrusisChanged', handleAnacrusisChanged);
      // Set initial state
      anacrusisOnBtn.classList.toggle('active', store.state.hasAnacrusis);
      anacrusisOffBtn.classList.toggle('active', !store.state.hasAnacrusis);
    }

    // Grid visibility event listeners
    if (drumGridToggleBtn && drumGridWrapper) {
      drumGridToggleBtn.addEventListener('click', handleDrumGridToggle);
    }
    if (buttonGridToggleBtn && buttonGridWrapper) {
      buttonGridToggleBtn.addEventListener('click', handleButtonGridToggle);
    }
    if (leftLegendToggleBtn && leftLegendCanvas) {
      leftLegendToggleBtn.addEventListener('click', handleLeftLegendToggle);
    }
    if (rightLegendToggleBtn && rightLegendCanvas) {
      rightLegendToggleBtn.addEventListener('click', handleRightLegendToggle);
    }

    syncVisibilityButton(drumGridToggleBtn, isDrumGridVisible, 'Hide Drum Grid', 'Show Drum Grid');
    syncVisibilityButton(buttonGridToggleBtn, isButtonGridVisible, 'Hide Button Grid', 'Show Button Grid');
    syncVisibilityButton(leftLegendToggleBtn, isLeftLegendVisible, 'Hide Left Legend', 'Show Left Legend');
    syncVisibilityButton(rightLegendToggleBtn, isRightLegendVisible, 'Hide Right Legend', 'Show Right Legend');
    syncLegendTransparency();

    // Handoff button event listener
    if (takeToSingingTrainerBtn) {
      takeToSingingTrainerBtn.addEventListener('click', () => {
        void handleTakeToSingingTrainer();
      });
    }

  });

  onDestroy(() => {
    // Remove event listeners
    settingsBtn?.removeEventListener('click', toggleSidebar);
    sidebarOverlay?.removeEventListener('click', toggleSidebar);
    volumeIconBtn?.removeEventListener('click', handleVolumeIconClick);
    verticalVolumeSlider?.removeEventListener('input', handleVolumeChange);
    document.removeEventListener('click', handleDocumentClickForVolume);

    anacrusisOnBtn?.removeEventListener('click', handleAnacrusisOn);
    anacrusisOffBtn?.removeEventListener('click', handleAnacrusisOff);

    drumGridToggleBtn?.removeEventListener('click', handleDrumGridToggle);
    buttonGridToggleBtn?.removeEventListener('click', handleButtonGridToggle);
    leftLegendToggleBtn?.removeEventListener('click', handleLeftLegendToggle);
    rightLegendToggleBtn?.removeEventListener('click', handleRightLegendToggle);

  });
</script>

<!-- This is a headless component - no DOM output -->
