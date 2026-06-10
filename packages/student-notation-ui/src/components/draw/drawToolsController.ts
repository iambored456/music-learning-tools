// js/components/Draw/drawToolsController.js

import annotationService from '@services/annotationService.ts';
import store from '@state/initStore.ts';
import logger from '@utils/logger.ts';
import type {
  AnnotationArrowheadStyle,
  AnnotationLineStyle,
  AppState,
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
  highlighter: HTMLElement | null;
  lasso: HTMLElement | null;
}

const VALID_ARROW_LINE_STYLES = ['solid', 'dashed-big', 'dashed-small', 'dotted'] as const satisfies readonly AnnotationLineStyle[];
const VALID_ARROWHEAD_STYLES = ['filled', 'filled-arrow', 'unfilled', 'unfilled-arrow', 'circle', 'none'] as const satisfies readonly AnnotationArrowheadStyle[];

function isAnnotationLineStyle(value: string): value is AnnotationLineStyle {
  return VALID_ARROW_LINE_STYLES.includes(value as AnnotationLineStyle);
}

function isAnnotationArrowheadStyle(value: string): value is AnnotationArrowheadStyle {
  return VALID_ARROWHEAD_STYLES.includes(value as AnnotationArrowheadStyle);
}

class DrawToolsController {
  private currentTool: ToolName = null;
  private toolButtons: HTMLElement[] = [];
  private toolPanels: HTMLElement[] = [];
  private popupTriggers: HTMLElement[] = [];
  private contentBox: HTMLElement | null = null;
  private boundListeners = new WeakMap<EventTarget, Set<string>>();
  private lastSelectedNote: AppState['selectedNote'] | null = null;
  private optionsContainers: OptionsContainers = {
    arrow: null,
    text: null,
    marker: null,
    highlighter: null,
    lasso: null
  };

  private settings: ToolSettings = {
    arrow: {
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
      background: false,
      superscript: false,
      subscript: false
    },
    marker: {
      color: '#4a90e2',
      size: 6
    },
    highlighter: {
      color: '#9fc5ff',
      size: 10
    },
    lasso: {}
  };

  initialize() {
    this.toolButtons = Array.from(document.querySelectorAll<HTMLElement>('.draw-tool-button'));
    this.toolPanels = Array.from(document.querySelectorAll<HTMLElement>('.draw-tool-panel'));
    this.popupTriggers = Array.from(document.querySelectorAll<HTMLElement>('.draw-popup-trigger'));
    this.contentBox = document.querySelector<HTMLElement>('.draw-content-box');

    this.optionsContainers = {
      arrow: document.getElementById('arrow-tool-options'),
      text: document.getElementById('text-tool-options'),
      marker: document.getElementById('marker-tool-options'),
      highlighter: document.getElementById('highlighter-tool-options'),
      lasso: document.getElementById('lasso-tool-options')
    };

    if (!this.toolButtons.length || !this.optionsContainers.arrow) {
      logger.warn('DrawToolsController', 'Could not find draw tool elements', null, 'draw');
      return;
    }

    this.attachEventListeners();
    this.setupPopupTriggers();
    this.setupChordTabListeners();
    this.setupMainTabListeners();
    this.populateAllPanels();

    store.on<{ newNote?: AppState['selectedNote'] }>('noteChanged', ({ newNote } = {}) => {
      this.lastSelectedNote = newNote ?? null;
      if (this.currentTool) {
        this.deselectAllTools();
      }
    });
  }

  private attachEventListeners() {
    this.toolPanels.forEach(panel => {
      panel.setAttribute('aria-hidden', panel.classList.contains('active') ? 'false' : 'true');
    });
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

  private setupMainTabListeners() {
    const mainTabButtons = document.querySelectorAll('.tab-button');
    mainTabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = (button as HTMLElement).dataset['tab'];
        if (targetTab !== 'pitch' && this.currentTool) {
          this.deselectAllTools();
          this.restoreLastSelectedNote();
        }
      });
    });
  }

  private setupChordTabListeners() {
    const pitchTabButtons = document.querySelectorAll('.pitch-tab-button');
    pitchTabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = (button as HTMLElement).dataset['pitchTab'];
        if (targetTab === 'draw') {
          if (!this.currentTool) {
            this.selectTool('arrow');
          }
          return;
        }
        if (targetTab !== 'draw' && this.currentTool) {
          this.deselectAllTools();
          this.restoreLastSelectedNote();
        }
      });
    });
  }

  private restoreLastSelectedNote() {
    if (this.lastSelectedNote) {
      store.setSelectedNote(this.lastSelectedNote.shape, this.lastSelectedNote.color);
      store.setSelectedTool('note');
    } else if (store.state.selectedNote) {
      store.setSelectedNote(store.state.selectedNote.shape, store.state.selectedNote.color);
      store.setSelectedTool('note');
    }
  }

  private deselectAllTools() {
    this.closePopups();
    this.toolButtons.forEach(btn => {
      btn.classList.remove('active');
      btn.setAttribute('aria-pressed', 'false');
    });
    this.toolPanels.forEach(panel => {
      panel.classList.remove('active');
      panel.setAttribute('aria-hidden', 'true');
    });
    this.currentTool = null;
    this.contentBox?.removeAttribute('data-active-draw-tool');
    annotationService.setTool(null, null);
    if (store.state.selectedTool === 'draw') {
      store.setSelectedTool('note');
    }
  }

  selectTool(toolName: DrawableToolName): void {
    this.closePopups();
    this.toolButtons.forEach(btn => {
      btn.classList.remove('active');
      btn.setAttribute('aria-pressed', 'false');
    });
    this.toolPanels.forEach(panel => {
      panel.classList.remove('active');
      panel.setAttribute('aria-hidden', 'true');
    });

    const selectedButton = Array.from(this.toolButtons).find(
      btn => (btn).dataset['drawTool'] === toolName
    );
    if (selectedButton) {
      selectedButton.classList.add('active');
      selectedButton.setAttribute('aria-pressed', 'true');
    }

    const selectedPanel = Array.from(this.toolPanels).find(
      panel => panel.dataset['drawTool'] === toolName
    );
    if (selectedPanel) {
      selectedPanel.classList.add('active');
      selectedPanel.setAttribute('aria-hidden', 'false');
    }

    this.currentTool = toolName;
    this.contentBox?.setAttribute('data-active-draw-tool', toolName);
    annotationService.setTool(toolName, this.settings);
    store.setSelectedTool('draw');
    // Reset selected note safely for drawing mode
    store.state.selectedNote = { shape: 'circle', color: store.state.selectedNote?.color || '#4a90e2' };
  }

  getSettings(): ToolSettings {
    return this.settings;
  }

  applyArrowSettings(settings: Partial<ToolSettings['arrow']>): void {
    this.settings.arrow = {
      ...this.settings.arrow,
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
    this.populateHighlighterOptions();
  }

  private populateArrowOptions() {
    const container = this.optionsContainers.arrow;
    if (!container) {return;}
    const startHeadTrigger = container.querySelector<HTMLButtonElement>('#arrow-start-head-trigger');
    const endHeadTrigger = container.querySelector<HTMLButtonElement>('#arrow-end-head-trigger');

    const getArrowheadIcon = (side: 'start' | 'end', type: AnnotationArrowheadStyle): string => {
      if (type !== 'filled-arrow') {
        return `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="4" y1="12" x2="20" y2="12"/>
          </svg>
        `;
      }
      if (side === 'start') {
        return `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9,5 3,12 9,19"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
          </svg>
        `;
      }
      return `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15,5 21,12 15,19"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
        </svg>
      `;
    };

    const renderHeadIcon = (trigger: HTMLButtonElement | null, side: 'start' | 'end', type: AnnotationArrowheadStyle) => {
      if (!trigger) {return;}
      trigger.innerHTML = getArrowheadIcon(side, type);
    };
    const strokeInput = container.querySelector<HTMLInputElement>('#arrow-stroke-weight');
    if (strokeInput) {
      strokeInput.value = `${this.settings.arrow.strokeWeight}`;
      this.bindOnce(strokeInput, 'input', () => {
        this.settings.arrow.strokeWeight = parseInt(strokeInput.value, 10);
        this.syncActiveAnnotationTool('arrow');
      });
    }

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
        lineStyleButtons.forEach(btn => btn.classList.toggle('active', btn.dataset['lineStyle'] === style));
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
        startButtons.forEach(btn => btn.classList.toggle('active', btn.dataset['arrowStart'] === val));
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
        endButtons.forEach(btn => btn.classList.toggle('active', btn.dataset['arrowEnd'] === val));
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
          startButtons.forEach(btn => btn.classList.toggle('active', btn.dataset['arrowStart'] === val));
          renderHeadIcon(startHeadTrigger, 'start', val);
        }
        if (endButtons.length) {
          const val = this.settings.arrow.endArrowhead;
          endButtons.forEach(btn => btn.classList.toggle('active', btn.dataset['arrowEnd'] === val));
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
      sizeInput.value = `${this.settings.text.size}`;
      this.bindOnce(sizeInput, 'input', () => {
        this.settings.text.size = parseInt(sizeInput.value, 10);
        this.syncActiveAnnotationTool('text');
      });
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
        }
      });

      styleButtons.forEach(btn => {
        this.bindOnce(btn, 'click', () => {
          const style = btn.dataset['textStyle'] as TextBooleanSettingKey | undefined;
          if (!style || !booleanStyles.includes(style)) {return;}
          toggleStyle(style);
          btn.classList.toggle('active', Boolean(this.settings.text[style]));
        });
      });
    }
  }

  private populateMarkerOptions() {
    const container = this.optionsContainers.marker;
    if (!container) {return;}
    const sizeInput = container.querySelector<HTMLInputElement>('#marker-size-input');
    if (sizeInput) {
      sizeInput.value = `${this.settings.marker.size}`;
      this.bindOnce(sizeInput, 'input', () => {
        this.settings.marker.size = parseInt(sizeInput.value, 10);
        this.syncActiveAnnotationTool('marker');
      });
    }

    const colorButtons = Array.from(container.querySelectorAll<HTMLButtonElement>('.draw-color-button'));
    if (colorButtons.length) {
      // Set initial selection
      const setActiveColor = (color: string) => {
        colorButtons.forEach(btn => {
          const btnColor = btn.dataset['color'] || '';
          btn.classList.toggle('active', btnColor.toLowerCase() === color.toLowerCase());
        });
      };
      setActiveColor(this.settings.marker.color);

      colorButtons.forEach(button => {
        this.bindOnce(button, 'click', () => {
          const color = button.dataset['color'];
          if (!color) {return;}
          this.settings.marker.color = color;
          setActiveColor(color);
          this.syncActiveAnnotationTool('marker');
        });
      });
    }
  }

  private populateHighlighterOptions() {
    const container = this.optionsContainers.highlighter;
    if (!container) {return;}
    const sizeInput = container.querySelector<HTMLInputElement>('#highlighter-size-input');
    if (sizeInput) {
      sizeInput.value = `${this.settings.highlighter.size}`;
      this.bindOnce(sizeInput, 'input', () => {
        this.settings.highlighter.size = parseInt(sizeInput.value, 10);
        this.syncActiveAnnotationTool('highlighter');
      });
    }

    const colorButtons = Array.from(container.querySelectorAll<HTMLButtonElement>('.draw-color-button'));
    if (colorButtons.length) {
      const setActiveColor = (color: string) => {
        colorButtons.forEach(btn => {
          const btnColor = btn.dataset['color'] || '';
          btn.classList.toggle('active', btnColor.toLowerCase() === color.toLowerCase());
        });
      };
      setActiveColor(this.settings.highlighter.color);

      colorButtons.forEach(button => {
        this.bindOnce(button, 'click', () => {
          const color = button.dataset['color'];
          if (!color) {return;}
          this.settings.highlighter.color = color;
          setActiveColor(color);
          this.syncActiveAnnotationTool('highlighter');
        });
      });
    }
  }
}

const drawToolsController = new DrawToolsController();
export default drawToolsController;
