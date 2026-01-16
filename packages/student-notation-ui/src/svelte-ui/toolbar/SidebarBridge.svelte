<script lang="ts">
  /**
   * SidebarBridge - Headless Svelte component
   *
   * This component manages sidebar, volume popup, and various toggle controls.
   *
   * This replaces: src/components/toolbar/initializers/sidebarInitializer.ts
   */
  import { onMount, onDestroy } from 'svelte';
  import store from '@state/initStore.ts';
  import LayoutService from '@services/layoutService.ts';
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

  // Long note style toggle
  let longNoteStyle1Btn: HTMLElement | null = null;
  let longNoteStyle2Btn: HTMLElement | null = null;

  // Playhead mode toggle
  let playheadCursorBtn: HTMLElement | null = null;
  let playheadMicrobeatBtn: HTMLElement | null = null;
  let playheadMacrobeatBtn: HTMLElement | null = null;

  // Grid visibility toggles
  let drumGridToggleBtn: HTMLElement | null = null;
  let drumGridWrapper: HTMLElement | null = null;
  let buttonGridToggleBtn: HTMLElement | null = null;
  let buttonGridWrapper: HTMLElement | null = null;
  let leftLegendToggleBtn: HTMLElement | null = null;
  let leftLegendCanvas: HTMLElement | null = null;
  let rightLegendToggleBtn: HTMLElement | null = null;
  let rightLegendCanvas: HTMLElement | null = null;

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

  // Long note style handlers
  function handleLongNoteStyle1() { store.setLongNoteStyle('style1'); }
  function handleLongNoteStyle2() { store.setLongNoteStyle('style2'); }

  function handleLongNoteStyleChanged(style: unknown) {
    const currentStyle = style as 'style1' | 'style2';
    longNoteStyle1Btn?.classList.toggle('active', currentStyle === 'style1');
    longNoteStyle2Btn?.classList.toggle('active', currentStyle === 'style2');
  }

  // Playhead mode handlers
  function handlePlayheadCursor() { store.setPlayheadMode('cursor'); }
  function handlePlayheadMicrobeat() { store.setPlayheadMode('microbeat'); }
  function handlePlayheadMacrobeat() { store.setPlayheadMode('macrobeat'); }

  function handlePlayheadModeChanged(mode: unknown) {
    const currentMode = (mode === 'macrobeat') ? 'macrobeat' : (mode === 'microbeat') ? 'microbeat' : 'cursor';
    playheadCursorBtn?.classList.toggle('active', currentMode === 'cursor');
    playheadMicrobeatBtn?.classList.toggle('active', currentMode === 'microbeat');
    playheadMacrobeatBtn?.classList.toggle('active', currentMode === 'macrobeat');
  }

  // Grid visibility handlers
  function handleDrumGridToggle() {
    isDrumGridVisible = !isDrumGridVisible;
    if (drumGridWrapper) {
      drumGridWrapper.style.display = isDrumGridVisible ? 'flex' : 'none';
    }
    const textElement = drumGridToggleBtn?.querySelector('.sidebar-button-text');
    if (textElement) {
      textElement.textContent = isDrumGridVisible ? 'Hide Drum Grid' : 'Show Drum Grid';
    }
    setTimeout(() => LayoutService.recalculateLayout(), 10);
  }

  function handleButtonGridToggle() {
    isButtonGridVisible = !isButtonGridVisible;
    if (buttonGridWrapper) {
      buttonGridWrapper.style.display = isButtonGridVisible ? 'flex' : 'none';
    }
    const textElement = buttonGridToggleBtn?.querySelector('.sidebar-button-text');
    if (textElement) {
      textElement.textContent = isButtonGridVisible ? 'Hide Button Grid' : 'Show Button Grid';
    }
    setTimeout(() => LayoutService.recalculateLayout(), 10);
  }

  function handleLeftLegendToggle() {
    isLeftLegendVisible = !isLeftLegendVisible;
    if (leftLegendCanvas) {
      leftLegendCanvas.style.display = isLeftLegendVisible ? 'block' : 'none';
    }
    if (leftLegendToggleBtn) {
      leftLegendToggleBtn.textContent = isLeftLegendVisible ? 'Hide Left Legend' : 'Show Left Legend';
    }
    setTimeout(() => LayoutService.recalculateLayout(), 10);
  }

  function handleRightLegendToggle() {
    isRightLegendVisible = !isRightLegendVisible;
    if (rightLegendCanvas) {
      rightLegendCanvas.style.display = isRightLegendVisible ? 'block' : 'none';
    }
    if (rightLegendToggleBtn) {
      rightLegendToggleBtn.textContent = isRightLegendVisible ? 'Hide Right Legend' : 'Show Right Legend';
    }
    setTimeout(() => LayoutService.recalculateLayout(), 10);
  }

  // Handoff handlers
  function showHandoffNotification(title: string, message: string, details: string[] = []): void {
    const overlay = document.getElementById('notification-overlay');
    const messageEl = overlay?.querySelector('.notification-message');
    const titleEl = overlay?.querySelector('.notification-title');

    if (!overlay || !messageEl) {
      // Fallback to alert
      alert(`${title}\n\n${message}${details.length > 0 ? '\n\n' + details.join('\n') : ''}`);
      return;
    }

    if (titleEl) {
      titleEl.textContent = title;
    }

    const formattedDetails = details.length > 0
      ? `<ul style="text-align: left; margin-top: 8px; padding-left: 20px;">${details.map(d => `<li style="margin-bottom: 4px;">${d.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</li>`).join('')}</ul>`
      : '';

    messageEl.innerHTML = `<p>${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>${formattedDetails}`;
    overlay.classList.add('visible');

    const closeBtn = overlay.querySelector('.notification-close');
    const okBtn = overlay.querySelector('.notification-button');

    const closeHandler = (): void => {
      overlay.classList.remove('visible');
      closeBtn?.removeEventListener('click', closeHandler);
      okBtn?.removeEventListener('click', closeHandler);
    };

    closeBtn?.addEventListener('click', closeHandler);
    okBtn?.addEventListener('click', closeHandler);
  }

  function hasPitchNotes(): boolean {
    return store.state.placedNotes.some(note => !note.isDrum);
  }

  async function handleTakeToSingingTrainer(): Promise<void> {
    console.log('[Svelte] Take to Singing Trainer clicked');

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
      console.warn('[Svelte] Handoff validation failed', validation.details);

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
      console.log('[Svelte] Handoff slot written', handoffId);

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

    // Long note style toggle
    longNoteStyle1Btn = document.getElementById('long-note-style1-btn');
    longNoteStyle2Btn = document.getElementById('long-note-style2-btn');

    // Playhead mode toggle
    playheadCursorBtn = document.getElementById('playhead-mode-cursor-btn');
    playheadMicrobeatBtn = document.getElementById('playhead-mode-microbeat-btn');
    playheadMacrobeatBtn = document.getElementById('playhead-mode-macrobeat-btn');

    // Grid visibility toggles
    drumGridToggleBtn = document.getElementById('hide-drumgrid-toggle');
    drumGridWrapper = document.getElementById('drum-grid-wrapper');
    buttonGridToggleBtn = document.getElementById('hide-buttongrid-toggle');
    buttonGridWrapper = document.getElementById('button-grid');
    leftLegendToggleBtn = document.getElementById('hide-leftlegend-toggle');
    leftLegendCanvas = document.getElementById('legend-left-canvas');
    rightLegendToggleBtn = document.getElementById('hide-rightlegend-toggle');
    rightLegendCanvas = document.getElementById('legend-right-canvas');

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

    // Long note style event listeners
    if (longNoteStyle1Btn && longNoteStyle2Btn) {
      longNoteStyle1Btn.addEventListener('click', handleLongNoteStyle1);
      longNoteStyle2Btn.addEventListener('click', handleLongNoteStyle2);
      store.on('longNoteStyleChanged', handleLongNoteStyleChanged);
      // Set initial state
      const currentStyle = store.state.longNoteStyle || 'style1';
      longNoteStyle1Btn.classList.toggle('active', currentStyle === 'style1');
      longNoteStyle2Btn.classList.toggle('active', currentStyle === 'style2');
    }

    // Playhead mode event listeners
    if (playheadCursorBtn && playheadMicrobeatBtn && playheadMacrobeatBtn) {
      playheadCursorBtn.addEventListener('click', handlePlayheadCursor);
      playheadMicrobeatBtn.addEventListener('click', handlePlayheadMicrobeat);
      playheadMacrobeatBtn.addEventListener('click', handlePlayheadMacrobeat);
      store.on('playheadModeChanged', handlePlayheadModeChanged);
      // Set initial state
      const currentMode = store.state.playheadMode || 'cursor';
      playheadCursorBtn.classList.toggle('active', currentMode === 'cursor');
      playheadMicrobeatBtn.classList.toggle('active', currentMode === 'microbeat');
      playheadMacrobeatBtn.classList.toggle('active', currentMode === 'macrobeat');
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

    // Handoff button event listener
    if (takeToSingingTrainerBtn) {
      takeToSingingTrainerBtn.addEventListener('click', () => {
        void handleTakeToSingingTrainer();
      });
    }

    console.log('[Svelte] SidebarBridge mounted');
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

    longNoteStyle1Btn?.removeEventListener('click', handleLongNoteStyle1);
    longNoteStyle2Btn?.removeEventListener('click', handleLongNoteStyle2);

    playheadCursorBtn?.removeEventListener('click', handlePlayheadCursor);
    playheadMicrobeatBtn?.removeEventListener('click', handlePlayheadMicrobeat);
    playheadMacrobeatBtn?.removeEventListener('click', handlePlayheadMacrobeat);

    drumGridToggleBtn?.removeEventListener('click', handleDrumGridToggle);
    buttonGridToggleBtn?.removeEventListener('click', handleButtonGridToggle);
    leftLegendToggleBtn?.removeEventListener('click', handleLeftLegendToggle);
    rightLegendToggleBtn?.removeEventListener('click', handleRightLegendToggle);

    console.log('[Svelte] SidebarBridge unmounted');
  });
</script>

<!-- This is a headless component - no DOM output -->
