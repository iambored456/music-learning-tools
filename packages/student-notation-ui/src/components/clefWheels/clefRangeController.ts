import store from '@state/initStore.ts';
import { fullRowData as masterRowData } from '@state/pitchData.ts';
import pitchGridViewportService from '@services/pitchGridViewportService.ts';
import logger from '@utils/logger.ts';
import {
  computeConstrainedTopIndex,
  computeConstrainedBottomIndex,
  DEFAULT_MIN_VIEWPORT_ROWS
} from '@utils/pitchViewport.ts';

interface WheelOption {
  index: number;
  label: string;
  toneNote?: string;
  frequency?: number;
}

const OPTION_HEIGHT = 40;
const SCROLL_STEP = OPTION_HEIGHT;

class WheelPicker {
  private element: HTMLElement | null;
  private viewportEl: HTMLElement | null;
  private optionsEl: HTMLElement | null;
  private onChange: ((index: number, option: WheelOption) => void) | null;
  private onBeforeChange: ((requestedIndex: number) => number) | null;
  private options: WheelOption[];
  private optionNodes: HTMLElement[] = [];
  private selectedIndex = 0;
  private pointerActive = false;
  private pointerId: number | null = null;
  private lastPointerY = 0;
  private deltaBuffer = 0;
  private optionHeight = OPTION_HEIGHT;
  private resizeObserver: ResizeObserver | null = null;

  constructor(
    element: HTMLElement | null,
    options: WheelOption[],
    initialIndex: number,
    onChange: (index: number, option: WheelOption) => void,
    onBeforeChange?: (requestedIndex: number) => number
  ) {
    this.element = element;
    this.viewportEl = element?.querySelector('.clef-wheel-viewport') as HTMLElement | null;
    this.optionsEl = element?.querySelector('.clef-wheel-options') as HTMLElement | null;
    this.onChange = onChange;
    this.onBeforeChange = onBeforeChange || null;
    this.options = options;

    if (!element || !this.viewportEl || !this.optionsEl) {
      return;
    }

    this.renderOptions();
    this.setIndex(initialIndex, { silent: true });
    this.attachEvents();
    this.observeSize();
  }

  private renderOptions() {
    const optionsEl = this.optionsEl;
    if (!optionsEl) {return;}
    optionsEl.innerHTML = '';
    this.optionNodes = this.options.map((option, index) => {
      const optionNode = document.createElement('div');
      optionNode.className = 'clef-wheel-option';
      optionNode.dataset['index'] = index.toString();
      optionNode.textContent = option.label;
      optionsEl.appendChild(optionNode);
      return optionNode;
    });
  }

  private attachEvents() {
    if (!this.element) {return;}

    this.element.addEventListener('wheel', (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const delta = Math.sign(event.deltaY);
      if (delta !== 0) {
        this.increment(delta);
      }
    }, { passive: false });

    this.element.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.increment(-1);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.increment(1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        this.setIndex(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        this.setIndex(this.options.length - 1);
      }
    });

    this.element.addEventListener('pointerdown', (event: PointerEvent) => {
      this.pointerActive = true;
      this.pointerId = event.pointerId;
      this.lastPointerY = event.clientY;
      this.deltaBuffer = 0;
      if (typeof this.element?.setPointerCapture === 'function') {
        try {
          this.element.setPointerCapture(this.pointerId);
        } catch {
          // ignore
        }
      }
    });

    this.element.addEventListener('pointermove', (event: PointerEvent) => {
      if (!this.pointerActive || event.pointerId !== this.pointerId) {
        return;
      }

      const deltaY = event.clientY - this.lastPointerY;
      this.lastPointerY = event.clientY;
      if (deltaY === 0) {return;}

      this.deltaBuffer += deltaY;
      const step = this.optionHeight || SCROLL_STEP;
      while (Math.abs(this.deltaBuffer) >= step) {
        const direction = -Math.sign(this.deltaBuffer); // drag down = scroll up
        this.increment(direction);
        this.deltaBuffer -= Math.sign(this.deltaBuffer) * step;
      }
    });

    const endPointer = (event: PointerEvent) => {
      if (this.pointerActive && event.pointerId === this.pointerId) {
        this.pointerActive = false;
        this.pointerId = null;
        this.deltaBuffer = 0;
        if (this.element?.hasPointerCapture?.(event.pointerId)) {
          this.element.releasePointerCapture(event.pointerId);
        }
      }
    };

    this.element.addEventListener('pointerup', endPointer);
    this.element.addEventListener('pointercancel', endPointer);
    this.element.addEventListener('pointerleave', endPointer);
  }

  private observeSize() {
    if (!this.element) {return;}

    if (typeof ResizeObserver === 'function') {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === this.element && entry.contentRect.height > 0) {
            this.updateVisuals();
          }
        }
      });
      this.resizeObserver.observe(this.element);
    } else {
      window.addEventListener('resize', () => this.updateVisuals());
    }
  }

  getIndex() {
    return this.selectedIndex;
  }

  increment(step: number) {
    if (step === 0 || !this.options || this.options.length === 0) {
      return;
    }
    this.setIndex(this.selectedIndex + step);
  }

  setIndex(index: number, { silent = false }: { silent?: boolean } = {}) {
    if (!this.optionsEl) {return;}

    // Allow controller to pre-validate/constrain the requested index
    let targetIndex = index;
    if (!silent && typeof this.onBeforeChange === 'function') {
      targetIndex = this.onBeforeChange(index);
    }

    const clampedIndex = Math.max(0, Math.min(this.options.length - 1, targetIndex));
    if (clampedIndex === this.selectedIndex) {
      this.updateVisuals();
      return;
    }

    this.selectedIndex = clampedIndex;
    this.updateVisuals();

    if (!silent && typeof this.onChange === 'function') {
      const option = this.options[clampedIndex];
      if (option) {
        this.onChange(clampedIndex, option);
      }
    }
  }

  updateVisuals() {
    if (!this.optionsEl || !this.viewportEl) {return;}

    const viewportHeight = this.viewportEl.clientHeight || 0;
    const selectedNode = this.optionNodes?.[this.selectedIndex];
    const fallbackNode = this.optionNodes?.[0];
    const optionHeight =
      selectedNode?.offsetHeight ||
      fallbackNode?.offsetHeight ||
      OPTION_HEIGHT;

    this.optionHeight = optionHeight || OPTION_HEIGHT;

    this.optionNodes?.forEach((node, index) => {
      const distance = Math.abs(index - this.selectedIndex);
      node.dataset['distance'] = String(Math.min(distance, 3));
    });

    if (viewportHeight === 0 || optionHeight === 0) {
      return;
    }

    const padding = Math.max(0, (viewportHeight - optionHeight) / 2);
    this.optionsEl.style.paddingTop = `${padding}px`;
    this.optionsEl.style.paddingBottom = `${padding}px`;

    const centerOffset = selectedNode
      ? selectedNode.offsetTop + optionHeight / 2
      : (padding + optionHeight / 2);
    const offset = (viewportHeight / 2) - centerOffset;
    this.optionsEl.style.transform = `translateY(${offset}px)`;
  }
}

class ClefViewportController {
  private initialized = false;
  private topPicker: WheelPicker | null = null;
  private bottomPicker: WheelPicker | null = null;
  private topWheel: HTMLElement | null = null;
  private bottomWheel: HTMLElement | null = null;
  private rangeLabel: HTMLElement | null = null;
  private rangeCount: HTMLElement | null = null;
  private fullRangeButton: HTMLElement | null = null;
  private trebleButton: HTMLElement | null = null;
  private altoButton: HTMLElement | null = null;
  private bassButton: HTMLElement | null = null;
  private presetContainer: HTMLElement | null = null;
  private presetButtons: HTMLElement[] = [];
  private activePresetId: string | null = null;
  private masterOptions: WheelOption[] = [];
  private presetRanges: Record<string, { topIndex: number; bottomIndex: number } | null> = {};

  init() {
    if (this.initialized) {return;}

    this.topWheel = document.getElementById('clef-top-wheel');
    this.bottomWheel = document.getElementById('clef-bottom-wheel');
    this.rangeLabel = document.getElementById('clef-range-label');
    this.rangeCount = document.getElementById('clef-range-count');
    this.fullRangeButton = document.getElementById('clef-full-range-button');
    this.trebleButton = document.getElementById('clef-treble-button');
    this.altoButton = document.getElementById('clef-alto-button');
    this.bassButton = document.getElementById('clef-bass-button');
    this.presetContainer = document.querySelector('.clef-preset-buttons');
    this.presetButtons = Array.from(document.querySelectorAll('.clef-preset-button'));

    if (!this.topWheel || !this.bottomWheel) {
      logger.warn('ClefViewportController', 'Clef tab elements not found; skipping initialization', null, 'ui');
      return;
    }

    this.masterOptions = masterRowData.map((row, index) => ({
      index,
      label: row.pitch,
      toneNote: row.toneNote,
      frequency: row.frequency
    }));

    const initialViewport = this.getViewportRange();

    this.topPicker = new WheelPicker(
      this.topWheel,
      this.masterOptions,
      initialViewport.topIndex,
      (index) => this.handleTopSelection(index),
      (requestedIndex) => this.constrainTopIndex(requestedIndex)
    );

    this.bottomPicker = new WheelPicker(
      this.bottomWheel,
      this.masterOptions,
      initialViewport.bottomIndex,
      (index) => this.handleBottomSelection(index),
      (requestedIndex) => this.constrainBottomIndex(requestedIndex)
    );

    this.computePresetRanges();

    if (this.fullRangeButton) {
      this.fullRangeButton.addEventListener('click', () => this.applyPresetView('full'));
    }
    if (this.trebleButton) {
      this.trebleButton.addEventListener('click', () => this.applyPresetView('treble'));
    }
    if (this.altoButton) {
      this.altoButton.addEventListener('click', () => this.applyPresetView('alto'));
    }
    if (this.bassButton) {
      this.bassButton.addEventListener('click', () => this.applyPresetView('bass'));
    }

    store.on('pitchRangeChanged', () => {
      this.syncFromViewport();
    });
    store.on('zoomChanged', () => {
      this.syncFromViewport();
    });

    this.calculateAndSetWheelHeight();
    window.addEventListener('resize', () => this.calculateAndSetWheelHeight());

    this.syncFromViewport();
    this.initialized = true;
    logger.moduleLoaded('ClefViewportController', 'ui');
  }

  refreshWheelVisuals() {
    this.topPicker?.updateVisuals();
    this.bottomPicker?.updateVisuals();
  }

  private getViewportRange(): { topIndex: number; bottomIndex: number } {
    const maxIndex = Math.max(0, this.masterOptions.length - 1);
    const info = pitchGridViewportService.getViewportInfo();
    const startRank = info?.startRank ?? store.state.pitchRange?.topIndex ?? 0;
    const endRank = info?.endRank ?? (startRank + 1);
    const topIndex = Math.max(0, Math.min(maxIndex, startRank));
    const bottomIndex = Math.max(topIndex, Math.min(maxIndex, endRank - 1));
    return { topIndex, bottomIndex };
  }

  private syncFromViewport() {
    if (!this.topPicker || !this.bottomPicker) {return;}
    const { topIndex, bottomIndex } = this.getViewportRange();
    this.topPicker.setIndex(topIndex, { silent: true });
    this.bottomPicker.setIndex(bottomIndex, { silent: true });
    this.updateSummary(topIndex, bottomIndex);
    this.updatePresetHighlight(topIndex, bottomIndex);
  }

  private constrainTopIndex = (requestedTopIndex: number): number => {
    if (!this.bottomPicker) {return requestedTopIndex;}
    const currentBottomIndex = this.bottomPicker.getIndex();
    const totalRanks = this.masterOptions.length;
    return computeConstrainedTopIndex(
      currentBottomIndex,
      requestedTopIndex,
      totalRanks,
      DEFAULT_MIN_VIEWPORT_ROWS
    );
  };

  private constrainBottomIndex = (requestedBottomIndex: number): number => {
    if (!this.topPicker) {return requestedBottomIndex;}
    const currentTopIndex = this.topPicker.getIndex();
    const totalRanks = this.masterOptions.length;
    return computeConstrainedBottomIndex(
      currentTopIndex,
      requestedBottomIndex,
      totalRanks,
      DEFAULT_MIN_VIEWPORT_ROWS
    );
  };

  private handleTopSelection(newTopIndex: number) {
    logger.debug('ClefViewportController', 'handleTopSelection called', { newTopIndex }, 'ui');
    pitchGridViewportService.setViewportTopIndex(newTopIndex);
  }

  private handleBottomSelection(newBottomIndex: number) {
    logger.debug('ClefViewportController', 'handleBottomSelection called', { newBottomIndex }, 'ui');
    pitchGridViewportService.setViewportBottomIndex(newBottomIndex);
  }

  private updateSummary(topIndex: number, bottomIndex: number) {
    const topRow = this.masterOptions[topIndex];
    const bottomRow = this.masterOptions[bottomIndex];
    const count = (bottomIndex - topIndex) + 1;

    if (this.rangeLabel && topRow && bottomRow) {
      this.rangeLabel.textContent = `${topRow.label} – ${bottomRow.label}`;
    }
    if (this.rangeCount) {
      this.rangeCount.textContent = `${count} ${count === 1 ? 'pitch' : 'pitches'}`;
    }
  }

  private computePresetRanges() {
    // IMPORTANT (gamut vs viewport terminology):
    // Clef "presets" represent a target pitch *viewport* into the full pitch *gamut*.
    //
    // Resolve preset endpoints using `toneNote` (Tone.js/SPN) instead of the display label.
    // Display labels include special music glyphs and may vary with notation settings, which makes them brittle.
    const resolvePresetFromToneNotes = (topToneNote: string, bottomToneNote: string) => {
      const topIndex = this.findToneNoteIndex(topToneNote);
      const bottomIndex = this.findToneNoteIndex(bottomToneNote);
      if (topIndex === -1 || bottomIndex === -1) {return null;}
      return { topIndex: Math.min(topIndex, bottomIndex), bottomIndex: Math.max(topIndex, bottomIndex) };
    };

    this.presetRanges = {
      full: { topIndex: 0, bottomIndex: Math.max(0, this.masterOptions.length - 1) },
      treble: resolvePresetFromToneNotes('G5', 'C4'),
      alto: resolvePresetFromToneNotes('A4', 'D3'),
      bass: resolvePresetFromToneNotes('C4', 'E2'),
      voice1: resolvePresetFromToneNotes('A5', 'A3'),  // Voice I
      voice2: resolvePresetFromToneNotes('C5', 'C3'),  // Voice II
      voice3: resolvePresetFromToneNotes('E4', 'E2')   // Voice III
    };
  }

  private updatePresetHighlight(topIndex: number, bottomIndex: number) {
    let matchedId: string | null = null;
    Object.entries(this.presetRanges).forEach(([id, range]) => {
      if (range && range.topIndex === topIndex && range.bottomIndex === bottomIndex) {
        matchedId = id;
      }
    });
    this.activePresetId = matchedId;

    if (!this.presetButtons?.length) {return;}
    this.presetButtons.forEach(btn => {
      const sanitizedId = (btn.dataset?.['preset'])
        ? (btn.dataset['preset'] ?? '')
        : (btn.id || '')
          .replace(/^clef-/, '')
          .replace(/-button$/, '')
          .replace(/-range$/, '')
          .replace(/-/g, '');
      const isActive = this.activePresetId && sanitizedId === this.activePresetId;
      btn.classList.toggle('active', Boolean(isActive));
    });

    if (this.presetContainer) {
      this.presetContainer.classList.toggle('locked', false);
    }
  }

  private applyPresetView(preset: string) {
    const range = this.presetRanges[preset];
    if (!range) {
      logger.warn('ClefViewportController', 'Preset range could not be resolved', { preset }, 'ui');
      return;
    }

    // Animate preset changes so the viewport doesn't snap instantly (especially noticeable for "Full Range").
    const durationMs = preset === 'full' ? 420 : 280;
    pitchGridViewportService.setPitchViewportRange(range, { animateMs: durationMs, source: `preset:${preset}` });
  }

  private findNoteIndex(noteLabel: string) {
    return this.masterOptions.findIndex(opt => opt.label === noteLabel);
  }

  private findToneNoteIndex(toneNote: string) {
    return this.masterOptions.findIndex(opt => opt.toneNote === toneNote);
  }

  private calculateAndSetWheelHeight() {
    const wheelsSection = document.querySelector('.range-panel-section.wheels-section') as HTMLElement | null;
    const sectionTitle = wheelsSection?.querySelector('.panel-section-title') as HTMLElement | null;

    if (!wheelsSection || !this.topWheel || !this.bottomWheel) {
      return;
    }

    const sectionHeight = wheelsSection.clientHeight;
    const titleHeight = sectionTitle?.offsetHeight || 0;
    const gap = 15;
    const calculatedHeight = sectionHeight - titleHeight - gap;
    const wheelHeight = Math.max(120, Math.min(calculatedHeight, 300));

    this.topWheel.style.setProperty('--clef-wheel-height', `${wheelHeight}px`);
    this.bottomWheel.style.setProperty('--clef-wheel-height', `${wheelHeight}px`);

    setTimeout(() => {
      this.topPicker?.updateVisuals();
      this.bottomPicker?.updateVisuals();
    }, 0);
  }
}

const controller = new ClefViewportController();
export default controller;
