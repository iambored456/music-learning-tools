import { arrowEndpoints, arrowEndpointIcon } from './arrowIcons.ts';
// js/components/Draw/drawToolsController.js

import annotationService from '@services/annotationService.ts';
import store from '@state/initStore.ts';
import logger from '@utils/logger.ts';
import type {
  AnnotationArrowheadStyle,
  AnnotationLineStyle,
  ArrowAnnotationSettings,
  PathAnnotationSettings,
  TextAnnotationSettings
} from '@mlt/types';

export type ToolName = 'arrow' | 'text' | 'marker' | 'highlighter' | 'lasso' | null;
export type DrawableToolName = Exclude<ToolName, null>;
type TextBooleanSettingKey = 'bold' | 'italic' | 'underline' | 'background' | 'superscript' | 'subscript';

export interface ToolSettings {
  arrow: ArrowAnnotationSettings;
  text: TextAnnotationSettings;
  marker: PathAnnotationSettings;
  highlighter: PathAnnotationSettings;
  lasso: Record<string, never>;
}

export interface DrawToolsControllerRuntime {
  initialize(): void;
  getSettings(): ToolSettings;
  selectTool(toolName: DrawableToolName): void;
  applyArrowSettings(settings: Partial<ToolSettings['arrow']>): void;
  applyTextSettings(settings: Partial<ToolSettings['text']>): void;
  renderArrowOptions(): void;
  renderTextOptions(): void;
}

interface OptionsContainers {
  arrow: HTMLElement | null;
  text: HTMLElement | null;
  marker: HTMLElement | null;
  lasso: HTMLElement | null;
}

const VALID_ARROW_LINE_STYLES = ['solid', 'dashed-big', 'dashed-small', 'dotted'] as const satisfies readonly AnnotationLineStyle[];
const VALID_ARROWHEAD_STYLES = ['filled', 'filled-arrow', 'unfilled', 'unfilled-arrow', 'circle', 'none', 'open-arrow', 'open-circle', 'open-square', 'open-diamond', 'bar', 'square', 'diamond'] as const satisfies readonly AnnotationArrowheadStyle[];

function isAnnotationLineStyle(value: string): value is AnnotationLineStyle {
  return VALID_ARROW_LINE_STYLES.includes(value as AnnotationLineStyle);
}

function isAnnotationArrowheadStyle(value: string): value is AnnotationArrowheadStyle {
  return VALID_ARROWHEAD_STYLES.includes(value as AnnotationArrowheadStyle);
}

class DrawToolsController {
  private get currentTool(): ToolName {
    return store.state.selectedTool === 'draw' ? store.state.selectedDrawTool ?? 'arrow' : null;
  }
  private initialized = false;
  private toolButtons: HTMLElement[] = [];
  private toolPanels: HTMLElement[] = [];
  private popupTriggers: HTMLElement[] = [];
  private contentBox: HTMLElement | null = null;
  private markerHasSelectedColour = false;
  private lastCircleNoteColor = store.state.selectedNote.color;
  private boundListeners = new WeakMap<EventTarget, Set<string>>();
  private optionsContainers: OptionsContainers = {
    arrow: null,
    text: null,
    marker: null,
    lasso: null
  };

  private settings: ToolSettings = {
    arrow: {
      color: '#000000',
      roundedEnds: false,
      lineStyle: 'solid',
      strokeWeight: 4,
      startArrowhead: 'none',
      endArrowhead: 'filled-arrow',
      arrowheadSize: 12
    },
    text: {
      color: '#000000',
      size: 16,
      bold: false,
      italic: false,
      underline: false,
      background: true,
      superscript: false,
      subscript: false
    },
    marker: {
      color: '#44bcef',
      size: 6,
      transparency: 0
    },
    highlighter: {
      color: '#9fc5ff',
      size: 10
    },
    lasso: {}
  };

  initialize() {
    if (this.initialized) return;
    this.toolButtons = Array.from(document.querySelectorAll<HTMLElement>('.draw-tool-button'));
    this.toolPanels = Array.from(document.querySelectorAll<HTMLElement>('.draw-tool-panel'));
    this.popupTriggers = Array.from(document.querySelectorAll<HTMLElement>('.draw-popup-trigger'));
    this.contentBox = document.querySelector<HTMLElement>('.draw-content-box');

    this.optionsContainers = {
      arrow: document.getElementById('arrow-tool-options'),
      text: document.getElementById('text-tool-options'),
      marker: document.getElementById('marker-tool-options'),
      lasso: document.getElementById('lasso-tool-options')
    };

    if (!this.toolButtons.length || !this.optionsContainers.arrow) {
      logger.warn('DrawToolsController', 'Could not find draw tool elements', null, 'draw');
      return;
    }

    this.attachEventListeners();
    this.setupPopupTriggers();
    this.populateAllPanels();

    this.initialized = true;
    store.on('toolChanged', () => this.syncToolSelection());
    store.on('noteChanged', () => {
      if (store.state.selectedNote.shape === 'circle') {
        this.lastCircleNoteColor = store.state.selectedNote.color;
      }
    });
    this.syncToolSelection();
  }

  private attachEventListeners() {
    this.toolButtons.forEach(button => {
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => {
        const tool = (button).dataset['drawTool'] as DrawableToolName | undefined;
        if (!tool) {return;}
        this.selectTool(tool);
      });
    });
  }

  private bindOnce(target: EventTarget | null, eventName: string, listener: EventListener): void {
    if (!target) {return;}
    const targetListeners = this.boundListeners.get(target) ?? new Set<string>();
    if (targetListeners.has(eventName)) {return;}
    target.addEventListener(eventName, listener);
    targetListeners.add(eventName);
    this.boundListeners.set(target, targetListeners);
  }

  private syncActiveAnnotationTool(toolName: DrawableToolName): void {
    if (this.currentTool === toolName) {
      annotationService.setTool(toolName, this.settings);
    }
  }

  private closePopups(): void {
    this.popupTriggers.forEach(trigger => {
      trigger.classList.remove('is-open');
      const button = trigger.querySelector<HTMLButtonElement>(':scope > .draw-toolbar-button');
      button?.setAttribute('aria-expanded', 'false');
    });
  }

  private setupPopupTriggers(): void {
    this.popupTriggers.forEach(trigger => {
      const button = trigger.querySelector<HTMLButtonElement>(':scope > .draw-toolbar-button');
      if (!button) {return;}

      button.setAttribute('aria-haspopup', 'true');
      button.setAttribute('aria-expanded', 'false');

      this.bindOnce(button, 'click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const shouldOpen = !trigger.classList.contains('is-open');
        this.closePopups();
        if (shouldOpen) {
          trigger.classList.add('is-open');
          button.setAttribute('aria-expanded', 'true');
        }
      });

      this.bindOnce(trigger, 'click', (event) => {
        event.stopPropagation();
      });
    });

    this.bindOnce(document, 'click', () => {
      this.closePopups();
    });

    this.bindOnce(document, 'keydown', (event) => {
      if ((event as KeyboardEvent).key === 'Escape') {
        this.closePopups();
      }
    });
  }

  selectTool(toolName: DrawableToolName): void {
    if (this.currentTool === toolName) {
      store.setSelectedNote('circle', this.lastCircleNoteColor);
      store.setSelectedTool('note');
      return;
    }

    if (toolName === 'marker' && !this.markerHasSelectedColour) {
      this.settings.marker.color = store.state.selectedNote.color;
      this.markerHasSelectedColour = true;
      this.populateMarkerOptions();
    }
    store.setSelectedTool('draw', undefined, toolName);
  }

  private syncToolSelection(): void {
    this.closePopups();
    const toolName = this.currentTool;
    this.toolButtons.forEach(button => {
      const active = button.dataset['drawTool'] === toolName;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    this.toolPanels.forEach(panel => {
      const active = panel.dataset['drawTool'] === toolName;
      panel.classList.toggle('active', active);
    });
    if (toolName) this.contentBox?.setAttribute('data-active-draw-tool', toolName);
    else this.contentBox?.removeAttribute('data-active-draw-tool');
    annotationService.setTool(store.state.selectedTool === 'select' ? 'select' : toolName, this.settings);
  }

  getSettings(): ToolSettings {
    return this.settings;
  }

  applyArrowSettings(settings: Partial<ToolSettings['arrow']>): void {
    this.settings.arrow = {
      ...this.settings.arrow,
      color: '#000000',
      roundedEnds: false,
      ...settings
    };
    this.renderArrowOptions();
    this.syncActiveAnnotationTool('arrow');
  }

  applyTextSettings(settings: Partial<ToolSettings['text']>): void {
    this.settings.text = {
      ...this.settings.text,
      ...settings
    };
    this.renderTextOptions();
    this.syncActiveAnnotationTool('text');
  }

  renderArrowOptions(): void {
    this.populateArrowOptions();
  }

  renderTextOptions(): void {
    this.populateTextOptions();
  }

  private populateAllPanels() {
    this.populateArrowOptions();
    this.populateTextOptions();
    this.populateMarkerOptions();
  }

  private populateArrowOptions() {
    const container = this.optionsContainers.arrow;
    if (!container) {return;}
    const startHeadTrigger = container.querySelector<HTMLButtonElement>('#arrow-start-head-trigger');
    const endHeadTrigger = container.querySelector<HTMLButtonElement>('#arrow-end-head-trigger');

    container.querySelectorAll<HTMLElement>('[data-endpoint-side]').forEach(grid => {
      if (grid.childElementCount) {return;}
      const side = grid.dataset['endpointSide'] === 'start' ? 'start' : 'end';
      grid.innerHTML = arrowEndpoints.map(({ value, label }) =>
        `<button type="button" class="draw-option-button" data-arrow-${side}="${value}" title="${label}" aria-label="${label}">${arrowEndpointIcon(side, value)}</button>`
      ).join('');
    });
    const renderHeadIcon = (trigger: HTMLButtonElement | null, side: 'start' | 'end', type: AnnotationArrowheadStyle) => {
      if (trigger) {trigger.innerHTML = arrowEndpointIcon(side, type);}
    };
    const colourTrigger = container.querySelector<HTMLButtonElement>('#arrow-color-trigger');
    const colourButtons = Array.from(container.querySelectorAll<HTMLButtonElement>('.draw-color-button'));
    const renderColour = () => {
      const colour = this.settings.arrow.color ?? '#000000';
      if (colourTrigger) {colourTrigger.style.color = colour;}
      colourButtons.forEach(button => {
        const selected = button.dataset['color'] === colour;
        button.classList.toggle('active', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
    };
    renderColour();
    colourButtons.forEach(button => this.bindOnce(button, 'click', () => {
      this.settings.arrow.color = button.dataset['color'] ?? '#000000';
      renderColour();
      this.syncActiveAnnotationTool('arrow');
    }));
    const roundedInput = container.querySelector<HTMLInputElement>('#arrow-rounded-ends');
    if (roundedInput) {
      roundedInput.checked = this.settings.arrow.roundedEnds ?? false;
      this.bindOnce(roundedInput, 'change', () => {
        this.settings.arrow.roundedEnds = roundedInput.checked;
        this.syncActiveAnnotationTool('arrow');
      });
    }
    const strokeInput = container.querySelector<HTMLInputElement>('#arrow-stroke-weight');
    const strokeNumber = container.querySelector<HTMLInputElement>('#arrow-stroke-weight-number');
    const updateStroke = (input: HTMLInputElement) => {
      if (!input.value || !Number.isFinite(input.valueAsNumber)) {return;}
      this.settings.arrow.strokeWeight = Math.max(1, Math.min(20, Math.round(input.valueAsNumber)));
      if (strokeInput) {strokeInput.value = String(this.settings.arrow.strokeWeight);}
      if (strokeNumber) {strokeNumber.value = String(this.settings.arrow.strokeWeight);}
      this.syncActiveAnnotationTool('arrow');
    };
    [strokeInput, strokeNumber].forEach(input => {
      if (!input) {return;}
      input.value = String(this.settings.arrow.strokeWeight);
      this.bindOnce(input, 'input', () => updateStroke(input));
      this.bindOnce(input, 'change', () => {
        input.value = String(this.settings.arrow.strokeWeight);
      });
    });

    const headSizeInput = container.querySelector<HTMLInputElement>('#arrow-head-size');
    if (headSizeInput) {
      headSizeInput.value = `${this.settings.arrow.arrowheadSize}`;
      this.bindOnce(headSizeInput, 'input', () => {
        this.settings.arrow.arrowheadSize = parseInt(headSizeInput.value, 10);
        this.syncActiveAnnotationTool('arrow');
      });
    }

    const lineStyleButtons = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-line-style]'));
    if (lineStyleButtons.length) {
      const setActive = (style: AnnotationLineStyle) => {
        lineStyleButtons.forEach(btn => {
          const selected = btn.dataset['lineStyle'] === style;
          btn.classList.toggle('active', selected);
          btn.setAttribute('aria-pressed', String(selected));
        });
      };
      setActive(this.settings.arrow.lineStyle);
      lineStyleButtons.forEach(btn => {
        this.bindOnce(btn, 'click', () => {
          const rawStyle = btn.dataset['lineStyle'];
          const style = rawStyle === 'dashed' ? 'dashed-big' : rawStyle;
          if (!style || !isAnnotationLineStyle(style)) {return;}
          this.settings.arrow.lineStyle = style;
          setActive(style);
          this.syncActiveAnnotationTool('arrow');
        });
      });
    }

    const startButtons = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-arrow-start]'));
    if (startButtons.length) {
      const setActiveStart = (val: AnnotationArrowheadStyle) => {
        startButtons.forEach(btn => { const selected = btn.dataset['arrowStart'] === val; btn.classList.toggle('active', selected); btn.setAttribute('aria-pressed', String(selected)); });
        renderHeadIcon(startHeadTrigger, 'start', val);
      };
      setActiveStart(this.settings.arrow.startArrowhead);
      startButtons.forEach(btn => {
        this.bindOnce(btn, 'click', () => {
          const val = btn.dataset['arrowStart'];
          if (!val || !isAnnotationArrowheadStyle(val)) {return;}
          this.settings.arrow.startArrowhead = val;
          setActiveStart(val);
          this.syncActiveAnnotationTool('arrow');
        });
      });
    }

    const endButtons = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-arrow-end]'));
    if (endButtons.length) {
      const setActiveEnd = (val: AnnotationArrowheadStyle) => {
        endButtons.forEach(btn => { const selected = btn.dataset['arrowEnd'] === val; btn.classList.toggle('active', selected); btn.setAttribute('aria-pressed', String(selected)); });
        renderHeadIcon(endHeadTrigger, 'end', val);
      };
      setActiveEnd(this.settings.arrow.endArrowhead);
      endButtons.forEach(btn => {
        this.bindOnce(btn, 'click', () => {
          const val = btn.dataset['arrowEnd'];
          if (!val || !isAnnotationArrowheadStyle(val)) {return;}
          this.settings.arrow.endArrowhead = val;
          setActiveEnd(val);
          this.syncActiveAnnotationTool('arrow');
        });
      });
    }

    const swapButton = container.querySelector<HTMLButtonElement>('#arrow-swap-heads');
    if (swapButton) {
      this.bindOnce(swapButton, 'click', () => {
        const prevStart = this.settings.arrow.startArrowhead;
        this.settings.arrow.startArrowhead = this.settings.arrow.endArrowhead;
        this.settings.arrow.endArrowhead = prevStart;
        if (startButtons.length) {
          const val = this.settings.arrow.startArrowhead;
          startButtons.forEach(btn => { const selected = btn.dataset['arrowStart'] === val; btn.classList.toggle('active', selected); btn.setAttribute('aria-pressed', String(selected)); });
          renderHeadIcon(startHeadTrigger, 'start', val);
        }
        if (endButtons.length) {
          const val = this.settings.arrow.endArrowhead;
          endButtons.forEach(btn => { const selected = btn.dataset['arrowEnd'] === val; btn.classList.toggle('active', selected); btn.setAttribute('aria-pressed', String(selected)); });
          renderHeadIcon(endHeadTrigger, 'end', val);
        }
        this.syncActiveAnnotationTool('arrow');
      });
    }
  }

  private populateTextOptions() {
    const container = this.optionsContainers.text;
    if (!container) {return;}
    const sizeInput = container.querySelector<HTMLInputElement>('#text-size-input');
    if (sizeInput) {
      const updateSize = (value: number) => {
        if (!Number.isFinite(value)) {return;}
        this.settings.text.size = Math.max(8, Math.min(72, Math.round(value)));
        sizeInput.value = String(this.settings.text.size);
        this.syncActiveAnnotationTool('text');
      };
      sizeInput.value = String(this.settings.text.size);
      this.bindOnce(sizeInput, 'input', () => {
        if (sizeInput.value) {updateSize(sizeInput.valueAsNumber);}
      });
      this.bindOnce(sizeInput, 'change', () => { sizeInput.value = String(this.settings.text.size); });
      this.bindOnce(container.querySelector('#text-size-decrease'), 'click', () => updateSize(this.settings.text.size - 1));
      this.bindOnce(container.querySelector('#text-size-increase'), 'click', () => updateSize(this.settings.text.size + 1));
    }

    const colorButtons = Array.from(container.querySelectorAll<HTMLButtonElement>('.draw-color-button'));
    if (colorButtons.length) {
      const setActiveColor = (color: string) => {
        colorButtons.forEach(btn => {
          const btnColor = btn.dataset['color'] || '';
          btn.classList.toggle('active', btnColor.toLowerCase() === color.toLowerCase());
        });
      };
      setActiveColor(this.settings.text.color);
      colorButtons.forEach(button => {
        this.bindOnce(button, 'click', () => {
          const color = button.dataset['color'];
          if (!color) {return;}
          this.settings.text.color = color;
          setActiveColor(color);
          this.syncActiveAnnotationTool('text');
        });
      });
    }

    const styleButtons = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-text-style]'));
    if (styleButtons.length) {
      const booleanStyles: TextBooleanSettingKey[] = [
        'bold',
        'italic',
        'underline',
        'background',
        'superscript',
        'subscript'
      ];

      const toggleStyle = (style: TextBooleanSettingKey) => {
        this.settings.text[style] = !this.settings.text[style];
        this.syncActiveAnnotationTool('text');
      };

      // Set initial active state
      styleButtons.forEach(btn => {
        const style = btn.dataset['textStyle'] as TextBooleanSettingKey | undefined;
        if (style && booleanStyles.includes(style)) {
          btn.classList.toggle('active', Boolean(this.settings.text[style]));
          btn.setAttribute('aria-pressed', String(Boolean(this.settings.text[style])));
        }
      });

      styleButtons.forEach(btn => {
        this.bindOnce(btn, 'click', () => {
          const style = btn.dataset['textStyle'] as TextBooleanSettingKey | undefined;
          if (!style || !booleanStyles.includes(style)) {return;}
          toggleStyle(style);
          btn.classList.toggle('active', Boolean(this.settings.text[style]));
          btn.setAttribute('aria-pressed', String(Boolean(this.settings.text[style])));
        });
      });
    }
  }

  private populateMarkerOptions() {
    const container = this.optionsContainers.marker;
    if (!container) {return;}
    const bindSlider = (key: 'size' | 'transparency', min: number, max: number) => {
      const slider = container.querySelector<HTMLInputElement>(`#marker-${key}-input`);
      const number = container.querySelector<HTMLInputElement>(`#marker-${key}-number`);
      const refresh = () => {
        const value = this.settings.marker[key] ?? 0;
        [slider, number].forEach(input => { if (input) {input.value = String(value);} });
        if (key === 'transparency') {slider?.setAttribute('aria-valuetext', `${value}% transparent`);}
      };
      refresh();
      [slider, number].forEach(input => {
        if (!input) {return;}
        this.bindOnce(input, 'input', () => {
          if (!input.value || !Number.isFinite(input.valueAsNumber)) {return;}
          this.settings.marker[key] = Math.max(min, Math.min(max, Math.round(input.valueAsNumber)));
          refresh();
          this.syncActiveAnnotationTool('marker');
        });
        this.bindOnce(input, 'change', refresh);
      });
    };
    bindSlider('size', 2, 30);
    bindSlider('transparency', 0, 95);

    const colorButtons = Array.from(container.querySelectorAll<HTMLButtonElement>('.draw-color-button'));
    if (colorButtons.length) {
      // Set initial selection
      const setActiveColor = (color: string) => {
        const trigger = container.querySelector<HTMLButtonElement>('#marker-color-trigger');
        if (trigger) {trigger.style.color = color;}
        colorButtons.forEach(btn => {
          const btnColor = btn.dataset['color'] || '';
          const selected = btnColor.toLowerCase() === color.toLowerCase();
          btn.classList.toggle('active', selected);
          btn.setAttribute('aria-pressed', String(selected));
        });
      };
      setActiveColor(this.settings.marker.color);

      colorButtons.forEach(button => {
        this.bindOnce(button, 'click', () => {
          const color = button.dataset['color'];
          if (!color) {return;}
          this.settings.marker.color = color;
          this.markerHasSelectedColour = true;
          setActiveColor(color);
          this.syncActiveAnnotationTool('marker');
        });
      });
    }
  }


}

const drawToolsController = new DrawToolsController();
export default drawToolsController;
