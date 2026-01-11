// js/components/Toolbar/initializers/sidebarInitializer.ts
import store from '@state/initStore.ts';
import LayoutService from '@services/layoutService.ts';

function initAnacrusisToggle(): void {
  const anacrusisOnBtn = document.getElementById('anacrusis-on-btn');
  const anacrusisOffBtn = document.getElementById('anacrusis-off-btn');

  if (!anacrusisOnBtn || !anacrusisOffBtn) {return;}

  anacrusisOnBtn.addEventListener('click', () => store.setAnacrusis(true));
  anacrusisOffBtn.addEventListener('click', () => store.setAnacrusis(false));

  store.on('anacrusisChanged', (data: unknown) => {
    const isEnabled = data as boolean;
    anacrusisOnBtn.classList.toggle('active', isEnabled);
    anacrusisOffBtn.classList.toggle('active', !isEnabled);
  });

  // Set initial state
  anacrusisOnBtn.classList.toggle('active', store.state.hasAnacrusis);
  anacrusisOffBtn.classList.toggle('active', !store.state.hasAnacrusis);
}

function initLongNoteStyleToggle(): void {
  const style1Btn = document.getElementById('long-note-style1-btn');
  const style2Btn = document.getElementById('long-note-style2-btn');

  if (!style1Btn || !style2Btn) {return;}

  style1Btn.addEventListener('click', () => store.setLongNoteStyle('style1'));
  style2Btn.addEventListener('click', () => store.setLongNoteStyle('style2'));

  store.on('longNoteStyleChanged', (style: unknown) => {
    const currentStyle = style as 'style1' | 'style2';
    style1Btn.classList.toggle('active', currentStyle === 'style1');
    style2Btn.classList.toggle('active', currentStyle === 'style2');
  });

  // Set initial state
  const currentStyle = store.state.longNoteStyle || 'style1';
  style1Btn.classList.toggle('active', currentStyle === 'style1');
  style2Btn.classList.toggle('active', currentStyle === 'style2');
}

function initPlayheadModeToggle(): void {
  const cursorBtn = document.getElementById('playhead-mode-cursor-btn');
  const microbeatBtn = document.getElementById('playhead-mode-microbeat-btn');
  const macrobeatBtn = document.getElementById('playhead-mode-macrobeat-btn');

  if (!cursorBtn || !microbeatBtn || !macrobeatBtn) {return;}

  cursorBtn.addEventListener('click', () => store.setPlayheadMode('cursor'));
  microbeatBtn.addEventListener('click', () => store.setPlayheadMode('microbeat'));
  macrobeatBtn.addEventListener('click', () => store.setPlayheadMode('macrobeat'));

  store.on('playheadModeChanged', (mode: unknown) => {
    const currentMode = (mode === 'macrobeat') ? 'macrobeat' : (mode === 'microbeat') ? 'microbeat' : 'cursor';
    cursorBtn.classList.toggle('active', currentMode === 'cursor');
    microbeatBtn.classList.toggle('active', currentMode === 'microbeat');
    macrobeatBtn.classList.toggle('active', currentMode === 'macrobeat');
  });

  const currentMode = store.state.playheadMode || 'cursor';
  cursorBtn.classList.toggle('active', currentMode === 'cursor');
  microbeatBtn.classList.toggle('active', currentMode === 'microbeat');
  macrobeatBtn.classList.toggle('active', currentMode === 'macrobeat');
}

function initGridVisibilityToggles(): void {
  const drumGridToggleBtn = document.getElementById('hide-drumgrid-toggle');
  const drumGridWrapper = document.getElementById('drum-grid-wrapper');

  const buttonGridToggleBtn = document.getElementById('hide-buttongrid-toggle');
  const buttonGridWrapper = document.getElementById('button-grid');

  const leftLegendToggleBtn = document.getElementById('hide-leftlegend-toggle');
  const leftLegendCanvas = document.getElementById('legend-left-canvas');

  const rightLegendToggleBtn = document.getElementById('hide-rightlegend-toggle');
  const rightLegendCanvas = document.getElementById('legend-right-canvas');

  // State tracking for grid visibility
  let isDrumGridVisible = true;
  let isButtonGridVisible = true;
  let isLeftLegendVisible = true;
  let isRightLegendVisible = true;

  // Drum Grid Toggle
  if (drumGridToggleBtn && drumGridWrapper) {
    drumGridToggleBtn.addEventListener('click', () => {
      isDrumGridVisible = !isDrumGridVisible;
      (drumGridWrapper).style.display = isDrumGridVisible ? 'flex' : 'none';
      const textElement = drumGridToggleBtn.querySelector('.sidebar-button-text');
      if (textElement) {
        textElement.textContent = isDrumGridVisible ? 'Hide Drum Grid' : 'Show Drum Grid';
      }

      // Recalculate layout to make other containers expand
      setTimeout(() => LayoutService.recalculateLayout(), 10);
    });
  }

  // Button Grid Toggle
  if (buttonGridToggleBtn && buttonGridWrapper) {
    buttonGridToggleBtn.addEventListener('click', () => {
      isButtonGridVisible = !isButtonGridVisible;
      buttonGridWrapper.style.display = isButtonGridVisible ? 'flex' : 'none';

      const textElement = buttonGridToggleBtn.querySelector('.sidebar-button-text');
      if (textElement) {
        textElement.textContent = isButtonGridVisible ? 'Hide Button Grid' : 'Show Button Grid';
      }

      setTimeout(() => LayoutService.recalculateLayout(), 10);
    });
  }

  // Legend Toggles (hide/show label canvases)
  if (leftLegendToggleBtn && leftLegendCanvas) {
    leftLegendToggleBtn.addEventListener('click', () => {
      isLeftLegendVisible = !isLeftLegendVisible;
      leftLegendCanvas.style.display = isLeftLegendVisible ? 'block' : 'none';
      leftLegendToggleBtn.textContent = isLeftLegendVisible ? 'Hide Left Legend' : 'Show Left Legend';
      setTimeout(() => LayoutService.recalculateLayout(), 10);
    });
  }

  if (rightLegendToggleBtn && rightLegendCanvas) {
    rightLegendToggleBtn.addEventListener('click', () => {
      isRightLegendVisible = !isRightLegendVisible;
      rightLegendCanvas.style.display = isRightLegendVisible ? 'block' : 'none';
      rightLegendToggleBtn.textContent = isRightLegendVisible ? 'Hide Right Legend' : 'Show Right Legend';
      setTimeout(() => LayoutService.recalculateLayout(), 10);
    });
  }
}

export function initSidebarAndVolume(): void {
  const settingsBtn = document.getElementById('settings-button');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');

  const volumeIconBtn = document.getElementById('volume-icon-button');
  const volumePopup = document.getElementById('volume-popup');
  const verticalVolumeSlider = document.getElementById('vertical-volume-slider') as HTMLInputElement | null;

  // Sidebar Logic
  const toggleSidebar = (): void => {document.body.classList.toggle('sidebar-open');};
  if (settingsBtn && sidebar && sidebarOverlay) {
    settingsBtn.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', toggleSidebar);
  }

  // Volume Popup Logic
  if (volumeIconBtn && volumePopup && verticalVolumeSlider) {
    const VOLUME_STORAGE_KEY = 'app.volumeSliderValue';
    const clampVolume = (value: number): number => Math.min(100, Math.max(0, value));
    const getStoredVolume = (): number => {
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
    };
    const storeVolume = (value: number): void => {
      try {
        window.localStorage.setItem(VOLUME_STORAGE_KEY, String(clampVolume(value)));
      } catch {
        // Ignore localStorage write issues
      }
    };

    const initialVolume = getStoredVolume();
    verticalVolumeSlider.value = String(initialVolume);
    volumeIconBtn.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      const isVisible = volumePopup.classList.toggle('visible');
      // Update the button's active state based on popup visibility
      volumeIconBtn.classList.toggle('active', isVisible);
    });

    verticalVolumeSlider.addEventListener('input', function(this: HTMLInputElement) {
      const value = parseInt(this.value, 10);
      // Redesigned range: 0 → -∞ dB (mute), 100 → -12.5 dB (safe maximum)
      // This prevents clipping while preserving headroom for dynamic gain staging
      const dB = (value === 0) ? -Infinity : (value / 100) * 37.5 - 50;
      store.emit('volumeChanged', dB);
      storeVolume(value);
    });

    document.addEventListener('click', (e: Event) => {
      if (!volumePopup.contains(e.target as Node) && e.target !== volumeIconBtn) {
        volumePopup.classList.remove('visible');
        // Remove active state when popup is closed
        volumeIconBtn.classList.remove('active');
      }
    });

    verticalVolumeSlider.dispatchEvent(new Event('input'));
  }

  // Initialize the anacrusis toggle from the "Rhythm" tab
  initAnacrusisToggle();

  // Initialize grid visibility toggles
  initGridVisibilityToggles();

  // Initialize long note style toggle
  initLongNoteStyleToggle();

  // Initialize playhead mode toggle
  initPlayheadModeToggle();
}
