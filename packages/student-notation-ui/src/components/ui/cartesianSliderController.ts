// js/components/ui/cartesianSliderController.ts

import CartesianSlider from './CartesianSlider.ts';
import store from '@state/initStore.ts';
import effectsController from '@components/audio/effects/effectsController.ts';
import logger from '@utils/logger.ts';

interface EffectConfig {
  containerId: string;
  xParam: string;
  yParam: string;
  xRange: { min: number; max: number; step: number };
  yRange: { min: number; max: number; step: number };
  backgroundOpacity: number;
}

type SliderMap = Record<string, CartesianSlider>;

interface ResizeObserverState { currentWidth: number; currentHeight: number }

logger.moduleLoaded('CartesianSliderController');

class CartesianSliderController {
  private sliders: SliderMap = {};
  private resizeObservers: ResizeObserver[] = [];
  private effectConfigs: Record<string, EffectConfig>;
  private isDragging: Record<string, boolean> = {};

  constructor() {
    this.effectConfigs = {
      delay: {
        containerId: 'delay-position',
        xParam: 'time',
        yParam: 'feedback',
        xRange: { min: 0, max: 100, step: 1 },
        yRange: { min: 0, max: 95, step: 1 },
        backgroundOpacity: 0.2
      },
      vibrato: {
        containerId: 'vibrato-position',
        xParam: 'speed',
        yParam: 'span',
        xRange: { min: 0, max: 100, step: 1 },
        yRange: { min: 0, max: 100, step: 1 },
        backgroundOpacity: 0.5
      },
      tremolo: {
        containerId: 'tremolo-position',
        xParam: 'speed',
        yParam: 'span',
        xRange: { min: 0, max: 100, step: 1 },
        yRange: { min: 0, max: 100, step: 1 },
        backgroundOpacity: 0.5
      }
    };

    logger.info('CartesianSliderController', 'Initialized', null, 'ui');
  }

  init() {
    logger.initStart('Cartesian Slider Controller');

    Object.entries(this.effectConfigs).forEach(([effectType, config]) => {
      this.createSliderComponent(effectType, config);
    });

    this.initializeColorTracking();

    logger.initSuccess('Cartesian Slider Controller');
    return true;
  }

  private createSliderComponent(effectType: string, config: EffectConfig) {
    const container = document.getElementById(config.containerId);
    if (!container) {
      logger.warn('CartesianSliderController', `Container not found for ${effectType}`, { containerId: config.containerId }, 'ui');
      return;
    }

    try {
      // DEBUG: Detailed width debugging
      if (effectType === 'delay') {
        setTimeout(() => {
          console.group('[Effects Width Debug]');

          const positionContainer = document.querySelector('.position-controls-container') as HTMLElement;
          const effectsBox = document.querySelector('.effects-content-box') as HTMLElement;
          const effectsPanel = document.getElementById('effects-panel') as HTMLElement;
          const effectsContent = document.querySelector('.preset-effects-content') as HTMLElement;
          const effectsControls = document.querySelector('.preset-effects-controls') as HTMLElement;

          const logWidth = (name: string, el: HTMLElement | null) => {
            if (!el) {
              console.log(`${name}: NOT FOUND`);
              return;
            }
            const computed = getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            console.log(`${name}:`, {
              actualWidth: rect.width,
              computedWidth: computed.width,
              flex: `${computed.flexGrow} ${computed.flexShrink} ${computed.flexBasis}`,
              minWidth: computed.minWidth,
              maxWidth: computed.maxWidth
            });
          };

          logWidth('position-controls-container', positionContainer);
          logWidth('effects-content-box', effectsBox);
          logWidth('effects-panel', effectsPanel);
          logWidth('preset-effects-content', effectsContent);
          logWidth('preset-effects-controls', effectsControls);

          console.groupEnd();
        }, 100);
      }

      const [width, height] = this.getSliderComponentSize(container);
      const slider = new CartesianSlider(container, {
        size: [width, height],
        mode: 'relative', // flip Y so 0 is bottom and 100 is top
        x: config.xRange.min,
        minX: config.xRange.min,
        maxX: config.xRange.max,
        stepX: config.xRange.step,
        y: config.yRange.min,
        minY: config.yRange.min,
        maxY: config.yRange.max,
        stepY: config.yRange.step
      });

      this.sliders[effectType] = slider;
      this.observeSliderResize(container, slider, width, height);

      slider.on('change', ({ x, y }) => {
        this.onSliderChange(effectType, config.xParam, x, config.yParam, y);
      });

      // Track pointer interactions for previews/animations
      const handlePointerDown = () => {
        this.isDragging[effectType] = true;
        this.onSliderInteractionStart(effectType);
        effectsController.startHoldPreview(effectType);
      };
      const handlePointerUp = () => {
        if (this.isDragging[effectType]) {
          this.isDragging[effectType] = false;
          this.onSliderInteractionEnd(effectType);
          effectsController.stopHoldPreview(effectType);
        }
      };

      container.addEventListener('pointerdown', handlePointerDown);
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(evt => {
        container.addEventListener(evt, handlePointerUp);
      });

      this.loadInitialValues(effectType, config, slider);
      logger.debug('CartesianSliderController', `Created slider component for ${effectType}`, null, 'ui');
    } catch (error) {
      logger.error('CartesianSliderController', `Failed to create slider component for ${effectType}`, error, 'ui');
    }
  }

  private getSliderComponentSize(container: HTMLElement): [number, number] {
    const fallback = 120;
    const rect = container.getBoundingClientRect();
    let width = rect?.width || container.clientWidth || container.offsetWidth || fallback;
    let height = rect?.height || container.clientHeight || container.offsetHeight || width;
    if (!width || width < 10) {width = fallback;}
    if (!height || height < 10) {height = width;}
    return [Math.round(width), Math.round(height)];
  }

  private observeSliderResize(container: HTMLElement, slider: CartesianSlider, initialWidth: number, initialHeight: number) {
    if (typeof ResizeObserver === 'undefined') {return;}

    const observerState: ResizeObserverState = {
      currentWidth: Math.round(initialWidth) || 0,
      currentHeight: Math.round(initialHeight) || 0
    };
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const nextWidth = Math.round(width);
        const nextHeight = Math.round(height || width);
        if (!nextWidth || !nextHeight) {continue;}
        if (nextWidth === observerState.currentWidth && nextHeight === observerState.currentHeight) {continue;}
        observerState.currentWidth = nextWidth;
        observerState.currentHeight = nextHeight;
        slider.resize(nextWidth, nextHeight);
      }
    });

    observer.observe(container);
    this.resizeObservers.push(observer);
  }

  private onSliderChange(effectType: string, xParam: string, xValue: number, yParam: string, yValue: number) {
    // Call instance method directly to preserve `this` binding inside effectsController
    effectsController.updateEffect(effectType, { [xParam]: xValue, [yParam]: yValue });
  }

  private onSliderInteractionStart(effectType: string) {
    const color = effectsController.getActiveColor();
    logger.debug('CartesianSliderController', `Interaction start for ${effectType}`, null, 'ui');
    store.emit('effectDialInteractionStart', { effectType, color });
  }

  private onSliderInteractionEnd(effectType: string) {
    const color = effectsController.getActiveColor();
    logger.debug('CartesianSliderController', `Interaction end for ${effectType}`, null, 'ui');
    store.emit('effectDialInteractionEnd', { effectType, color });
  }

  private loadInitialValues(effectType: string, config: EffectConfig, slider: CartesianSlider) {
    // Preserve `this` binding; effectsController reads its own selected color
    const state = effectsController.getEffectState(effectType) || {};
    const rawX = (state as Record<string, unknown>)[config.xParam];
    const rawY = (state as Record<string, unknown>)[config.yParam];
    const xVal = typeof rawX === 'number' ? rawX : config.xRange.min;
    const yVal = typeof rawY === 'number' ? rawY : config.yRange.min;
    slider.x = xVal;
    slider.y = yVal;
  }

  private initializeColorTracking() {
    store.on('noteChanged', ({ newNote }: { newNote?: { color?: string } } = {}) => {
      if (newNote?.color) {
        this.applyColorPalette(newNote.color);
      }
    });
    if (store.state.selectedNote?.color) {
      this.applyColorPalette(store.state.selectedNote.color);
    }
  }

  private applyColorPalette(color: string) {
    const palette = store.state.colorPalette[color] || { primary: color, light: color };
    // Derive an extra-light tint if none provided
    const lighten = (hex: string, amount: number) => {
      const clamp = (v: number) => Math.max(0, Math.min(255, v));
      const n = hex.replace('#', '');
      const r = clamp(parseInt(n.slice(0, 2), 16) + amount);
      const g = clamp(parseInt(n.slice(2, 4), 16) + amount);
      const b = clamp(parseInt(n.slice(4, 6), 16) + amount);
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    };
    const basePrimary = palette.primary;
    const lightest = palette.light || lighten(basePrimary, 80);

    const hexToRgba = (hex: string, alpha: number) => {
      const n = hex.replace('#', '');
      const r = parseInt(n.slice(0, 2), 16);
      const g = parseInt(n.slice(2, 4), 16);
      const b = parseInt(n.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    Object.entries(this.sliders).forEach(([effectType, slider]) => {
      const config = this.effectConfigs[effectType];
      const opacity = config?.backgroundOpacity ?? 0.5;

      slider.setColors({
        accent: palette.primary,
        fill: hexToRgba(lightest, opacity),
        stroke: '#c3c9d0',
        grid: '#d7dce4',
        text: '#3c4048'
      });
    });
  }
}

const cartesianSliderController = new CartesianSliderController();
export default cartesianSliderController;
