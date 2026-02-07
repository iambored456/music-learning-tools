// (file path: src/app.ts)
import { appState, type AppState } from './state/appState.ts';
import type { BeltId, BeltOrientation, CursorColor, RingName } from './types.ts';
import { makeRenderLoop } from './core/renderLoop.ts';
import { checkCanvasSize } from './utils/canvas.ts';
import { generateDisplayLabels } from './core/logic.ts';
import { stepAnim } from './core/animation.ts';
import { DIATONIC_DEGREE_INDICES } from './core/constants.ts';
import { ActionController } from './core/ActionController.ts';
import { startTutorial } from './tutorial.ts';
import { ErrorHandler } from './utils/ErrorHandler.ts';
import { PerformanceUtils } from './utils/PerformanceUtils.ts';
import { StateTracker } from './utils/StateTracker.ts';

import Wheel from './components/Wheel.ts';
import Belts from './components/Belts.ts';
import UIControls from './components/UIControls.ts';

export default class App {
  container: HTMLElement;
  state: AppState;
  isInitialized: boolean;
  cleanupFunctions: Array<() => void>;
  performanceMonitor: (() => void) | null;
  keyboardManager: any;
  screenReaderManager: any;
  elements!: {
    canvas: HTMLCanvasElement | null;
    beltsContainer: HTMLElement | null;
  };
  wheel: Wheel | null;
  belts: Belts | null;
  uiControls: UIControls | null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.state = appState;
    this.isInitialized = false;
    this.cleanupFunctions = [];

    // Performance monitoring (only in development)
    this.performanceMonitor = null;
    
    // Accessibility managers (will be initialized if modules are available)
    this.keyboardManager = null;
    this.screenReaderManager = null;

    this.wheel = null;
    this.belts = null;
    this.uiControls = null;
    
    try {
      this._initializeApp();

    } catch (error) {
      ErrorHandler.handle(error, 'App', () => {
        console.error('Failed to initialize app');
      });
    }
  }

  _initializeApp() {
    
    // Find required elements
    this.elements = {
      canvas: this.container.querySelector<HTMLCanvasElement>('#chromaWheel'),
      beltsContainer: this.container.querySelector<HTMLElement>('.belts-container'),
    };

    const { canvas, beltsContainer } = this.elements;

    // Validate required elements
    if (!canvas) {
      throw new Error('Canvas element not found');
    }
    if (!beltsContainer) {
      throw new Error('Belts container not found');
    }

    // Set up control callbacks with basic accessibility
    const controlCallbacks = {
      onToggleFlat: ErrorHandler.wrap(() => {
        ActionController.toggleAccidental('flat');
        this._announceChange(`Flat names ${this.state.display.flat ? 'enabled' : 'disabled'}`);
      }, 'UI'),
      onToggleSharp: ErrorHandler.wrap(() => {
        ActionController.toggleAccidental('sharp');
        this._announceChange(`Sharp names ${this.state.display.sharp ? 'enabled' : 'disabled'}`);
      }, 'UI'),
      onToggleDarkMode: ErrorHandler.wrap((forceDark?: boolean) => {
        if (typeof forceDark === 'boolean') {
          // Handle explicit dark mode setting from toggle switches
          if (this.state.ui.darkMode !== forceDark) {
            ActionController.toggleDarkMode();
          }
        } else {
          // Handle regular toggle
          ActionController.toggleDarkMode();
        }
        this._announceChange(`${this.state.ui.darkMode ? 'Dark' : 'Light'} mode enabled`);
      }, 'UI'),
      onTogglePlayback: ErrorHandler.wrap(() => {
        ActionController.togglePlayback();
        this._announceChange(this.state.playback.isPlaying ? 'Scale playing' : 'Playback stopped');
      }, 'UI'),
      onToggleSidebar: ErrorHandler.wrap((state?: boolean) => {
        ActionController.toggleSidebar(state);
        this._announceChange(`Settings ${this.state.ui.sidebarOpen ? 'opened' : 'closed'}`);
      }, 'UI'),
      onToggleOrientation: ErrorHandler.wrap((forceOrientation?: BeltOrientation) => {
        let newOrientation: BeltOrientation;
        if (typeof forceOrientation === 'string') {
          // Handle explicit orientation setting from toggle switches
          newOrientation = forceOrientation;
        } else {
          // Handle regular toggle
          newOrientation = this.state.belts.orientation === 'horizontal' ? 'vertical' : 'horizontal';
        }
        
        if (this.state.belts.orientation !== newOrientation) {
          ActionController.setOrientation(newOrientation);
          this._announceChange(`Layout changed to ${newOrientation}`);
        }
      }, 'UI'),
      onStartTutorial: ErrorHandler.wrap(() => {
        this._announceChange('Tutorial started');
        startTutorial();
      }, 'Tutorial'),
      onShowKeyboardHelp: ErrorHandler.wrap(() => {
        this._showKeyboardHelp();
      }, 'UI'),
      onOrderChange: ErrorHandler.wrap((layoutOrder: AppState['belts']['layoutOrder'], beltOrder?: BeltId[]) => {
        this._applyComponentOrder(layoutOrder, beltOrder);
      }, 'UI'),
      onSetCursorColor: ErrorHandler.wrap((color: CursorColor, hasFill: boolean) => {
        ActionController.setCursorColor(color, hasFill);
        this._announceChange(`Cursor color changed to ${color}${hasFill ? ' with fill' : ''}`);
      }, 'UI'),
    };

    // Initialize components with error handling
    try {
      this.wheel = new Wheel(canvas, this.state, this.onInteractionEnd.bind(this));
    } catch (error) {
      ErrorHandler.handle(error, 'Wheel', () => {
        console.error('Wheel component failed to initialize');
      });
    }

    try {
      this.belts = new Belts(beltsContainer, this.state, this.onInteractionEnd.bind(this));
    } catch (error) {
      ErrorHandler.handle(error, 'Belts', () => {
        console.error('Belts component failed to initialize');
      });
    }

    try {
      this.uiControls = new UIControls(this.container, this.state, controlCallbacks);
    } catch (error) {
      ErrorHandler.handle(error, 'UIControls', () => {
        console.error('UI Controls failed to initialize');
      });
    }
    
    // Initialize accessibility features if available
    this._initializeAccessibility();
    
    // Set up responsive logic with performance optimization
    this._setupResponsiveLogic();

    // Start render loop with error handling
    try {
      makeRenderLoop(ErrorHandler.wrap(this.redraw.bind(this), 'RenderLoop'));
    } catch (error) {
      ErrorHandler.handle(error, 'RenderLoop', () => {
        console.error('Render loop failed to start');
      });
    }

    // Set up performance monitoring (now runs on all devices to detect low-end hardware)
    this._setupPerformanceMonitoring();

    // Monitor for accessibility preferences changes
    this._setupAccessibilityMonitoring();

    // Force an initial render to ensure everything draws properly
    StateTracker.markDirty(this.state);

    this.isInitialized = true;
  }


  /**
   * Initialize accessibility features gradually
   */
  _initializeAccessibility() {
    try {
      // Try to load accessibility modules dynamically
      this._loadAccessibilityModules().then(() => {
        // Accessibility features loaded
      }).catch(() => {
        this._setupBasicAccessibility();
      });
      
    } catch (error) {
      ErrorHandler.handle(error, 'Accessibility', () => {
        console.warn('Some accessibility features may not be available');
        this._setupBasicAccessibility();
      });
    }
  }

  /**
   * Dynamically load accessibility modules
   */
  async _loadAccessibilityModules() {
    try {
      // Try to import accessibility modules
      const { KeyboardManager } = await import('./accessibility/KeyboardManager.ts');
      const { ScreenReaderManager } = await import('./accessibility/ScreenReaderManager.ts');
      
      KeyboardManager.init();
      ScreenReaderManager.init();
      
      this.keyboardManager = KeyboardManager;
      this.screenReaderManager = ScreenReaderManager;
      
      return true;
    } catch (error) {
      throw new Error('Accessibility modules not available');
    }
  }

  /**
   * Set up basic accessibility without external modules
   */
  _setupBasicAccessibility() {
    // Basic keyboard navigation
    this._setupBasicKeyboard();
    
    // Basic ARIA enhancements
    this._setupBasicARIA();
    
    // Basic announcements
    this._setupBasicAnnouncements();
  }

  /**
   * Set up basic keyboard navigation
   */
  _setupBasicKeyboard() {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with text input or system shortcuts
      if (this._isTextInputActive()) return;
      
      // Don't interfere with browser navigation shortcuts
      if (e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      const target = e.target as HTMLElement | null;
      
      switch (e.key) {
        case 'ArrowLeft':
          // Only handle if focused on interactive music elements
          if (target?.id === 'chromaWheel' || target?.closest('.belt')) {
            e.preventDefault();
            this._rotateRing('pitchClass', -1);
            this._announceChange('Pitch ring rotated left');
          }
          break;
        case 'ArrowRight':
          // Only handle if focused on interactive music elements
          if (target?.id === 'chromaWheel' || target?.closest('.belt')) {
            e.preventDefault();
            this._rotateRing('pitchClass', 1);
            this._announceChange('Pitch ring rotated right');
          }
          break;
        case 'ArrowUp':
          // Handle up/down for belt navigation in vertical layout or general wheel navigation
          if (target?.id === 'chromaWheel' || target?.closest('.belt')) {
            e.preventDefault();
            this._rotateRing('pitchClass', 1);
            this._announceChange('Pitch ring rotated up');
          }
          break;
        case 'ArrowDown':
          // Handle up/down for belt navigation in vertical layout or general wheel navigation  
          if (target?.id === 'chromaWheel' || target?.closest('.belt')) {
            e.preventDefault();
            this._rotateRing('pitchClass', -1);
            this._announceChange('Pitch ring rotated down');
          }
          break;
        case ' ':
        case 'Enter':
          // Play scale globally (unless interacting with buttons/inputs)
          if (!target?.closest('button') && !target?.closest('input') && !target?.closest('select')) {
            e.preventDefault();
            ActionController.togglePlayback();
          }
          break;
        case 'Escape':
          // Escape should work globally but not prevent other uses
          ActionController.toggleSidebar();
          this._announceChange(this.state.ui.sidebarOpen ? 'Settings opened' : 'Settings closed');
          break;
        case 'f':
        case 'F':
          // Only handle if not in a text field and not a system shortcut
          e.preventDefault();
          ActionController.toggleAccidental('flat');
          this._announceChange(`Flat names ${this.state.display.flat ? 'enabled' : 'disabled'}`);
          break;
        case 's':
        case 'S':
          // Only handle if not a system shortcut (Ctrl+S is save)
          e.preventDefault();
          ActionController.toggleAccidental('sharp');
          this._announceChange(`Sharp names ${this.state.display.sharp ? 'enabled' : 'disabled'}`);
          break;
        case 'v':
        case 'V':
          e.preventDefault();
          const newOrientation = this.state.belts.orientation === 'horizontal' ? 'vertical' : 'horizontal';
          ActionController.setOrientation(newOrientation);
          this._announceChange(`Layout changed to ${newOrientation}`);
          break;
        // Don't handle Tab, Shift+Tab, or other navigation keys - let browser handle them
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    this.cleanupFunctions.push(() => {
      document.removeEventListener('keydown', handleKeyDown);
    });
  }

  /**
   * Rotate a ring by steps
   */
  _rotateRing(ringName: RingName, steps: number) {
    const stepAngle = steps * (Math.PI * 2 / 12);
    const currentAngle = this.state.rings[ringName];
    const newAngle = (currentAngle + stepAngle) % (Math.PI * 2);
    ActionController.setRingAngle(ringName, newAngle);
  }

  /**
   * Check if text input is active
   */
  _isTextInputActive() {
    const activeElement = document.activeElement as HTMLElement | null;
    const textInputs = ['INPUT', 'TEXTAREA', 'SELECT'];
    return textInputs.includes(activeElement?.tagName || '') || 
           activeElement?.contentEditable === 'true';
  }

  /**
   * Apply component order changes to the actual layout
   */
  _applyComponentOrder(layoutOrder: AppState['belts']['layoutOrder'], beltOrder?: BeltId[]) {
    const currentOrientation = this.state.belts.orientation;
    const order = layoutOrder[currentOrientation];

    let container = this.container.querySelector<HTMLElement>('.main-container');
    if (!container) {
      container = document.querySelector<HTMLElement>('.main-container');
    }
    if (!container) return;

    // With display:contents on wrappers, all 6 items participate in the parent flex layout.
    // No DOM flattening needed — just set CSS order.
    const compassResultContainer = container.querySelector<HTMLElement>('.compass-result-container');
    const components: Record<string, HTMLElement | null> = {
      compass: container.querySelector<HTMLElement>('.wheel-container'),
      result: container.querySelector<HTMLElement>('#result-container'),
      pitch: container.querySelector<HTMLElement>('.pitch-belt'),
      degree: container.querySelector<HTMLElement>('.degree-belt'),
      intervals: container.querySelector<HTMLElement>('.interval-brackets-wrapper'),
      chromatic: container.querySelector<HTMLElement>('.chromatic-belt'),
    };

    if (currentOrientation === 'horizontal') {
      // Horizontal: all 6 items are flat flex children (wrappers use display:contents)
      // Clear any grid-template-areas from vertical mode
      container.style.removeProperty('grid-template-areas');

      order.forEach((componentId: string, index: number) => {
        const element = components[componentId];
        if (element) {
          element.style.setProperty('order', String(index + 1), 'important');
        }
      });
    } else {
      // Vertical: 5 columns — compass-result-container + 4 belt columns
      // order = ['compass', 'pitch', 'degree', 'intervals', 'chromatic']
      // Clear horizontal order styles first
      Object.values(components).forEach(el => {
        if (el) el.style.removeProperty('order');
      });

      // Set compass-result-container order from compass position
      if (compassResultContainer) {
        const compassIdx = order.indexOf('compass');
        compassResultContainer.style.setProperty('order', String(compassIdx + 1), 'important');
      }

      // Order individual belts
      ['pitch', 'degree', 'intervals', 'chromatic'].forEach(id => {
        const el = components[id];
        const idx = order.indexOf(id);
        if (el && idx >= 0) {
          el.style.setProperty('order', String(idx + 1), 'important');
        }
      });

      // Position result above or below compass within the wrapper
      const resultEl = components.result;
      const compassEl = components.compass;
      if (resultEl && compassEl) {
        const above = this.state.belts.resultAboveCompass;
        resultEl.style.setProperty('order', above ? '1' : '10');
        compassEl.style.setProperty('order', above ? '10' : '1');
      }
    }

    // Apply belt order within belts container
    if (beltOrder) {
      this._applyBeltOrder(beltOrder);
    }
  }

  _setBeltsOpacity(opacity: string) {
    const beltsContainer = this.elements.beltsContainer;
    if (!beltsContainer) return;
    beltsContainer.querySelectorAll<HTMLElement>('.belt, .interval-brackets-wrapper').forEach(el => {
      el.style.opacity = opacity;
    });
  }

  /**
   * Apply belt order within the belts container
   */
  _applyBeltOrder(beltOrder: BeltId[]) {
    const beltsContainer = this.elements.beltsContainer;
    if (!beltsContainer) return;

    const belts: Record<string, HTMLElement | null> = {
      pitch: beltsContainer.querySelector<HTMLElement>('.pitch-belt'),
      degree: beltsContainer.querySelector<HTMLElement>('.degree-belt'),
      intervals: beltsContainer.querySelector<HTMLElement>('.interval-brackets-wrapper'),
      chromatic: beltsContainer.querySelector<HTMLElement>('.chromatic-belt')
    };

    // Apply CSS order property to belts
    beltOrder.forEach((beltId: BeltId, index: number) => {
      const element = belts[beltId];
      if (element) {
        element.style.setProperty('order', String(index + 1), 'important');

      }
    });
  }

  /**
   * Set up basic ARIA attributes
   */
  _setupBasicARIA() {
    // Main container
    this.container.setAttribute('role', 'main');
    this.container.setAttribute('aria-label', 'Diatonic Compass Music Theory Tool');
    
    // Canvas
    if (this.elements.canvas) {
      this.elements.canvas.setAttribute('tabindex', '0');
      this.elements.canvas.setAttribute('role', 'application');
      this.elements.canvas.setAttribute('aria-label', 'Interactive Diatonic Compass - use arrow keys to explore');
    }
    
    // Result container
    const resultContainer = document.querySelector<HTMLElement>('#result-container');
    if (resultContainer) {
      resultContainer.setAttribute('tabindex', '0');
      resultContainer.setAttribute('aria-label', 'Current musical key and mode - click to play');
    }
  }

  /**
   * Set up basic announcement system
   */
  _setupBasicAnnouncements() {
    // Create basic live region
    const liveRegion = document.createElement('div');
    liveRegion.id = 'basic-announcements';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'false');
    liveRegion.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    document.body.appendChild(liveRegion);
    
    this.cleanupFunctions.push(() => {
      if (liveRegion.parentNode) {
        liveRegion.parentNode.removeChild(liveRegion);
      }
    });
  }

  /**
   * Basic announcement function
   */
  _announceChange(message: string) {
    const liveRegion = document.getElementById('basic-announcements');
    if (liveRegion) {
      liveRegion.textContent = '';
      setTimeout(() => {
        liveRegion.textContent = message;
      }, 100);
    }
    
    // Also try screen reader manager if available
    if (this.screenReaderManager) {
      this.screenReaderManager.queueAnnouncement(message);
    }
  }

  /**
   * Show basic keyboard help
   */
  _showKeyboardHelp() {
    const helpText = `
Keyboard Shortcuts:
- Tab: Navigate between controls
- Arrow keys: Rotate pitch ring (when focused on wheel/belts)
- Ctrl + arrows: Large steps (when focused on wheel/belts)
- Space/Enter: Play scale (when focused on wheel/result)
- F: Toggle flat note names
- S: Toggle sharp note names  
- V: Toggle vertical/horizontal layout
- H: Show this help
- Escape: Open/close settings

Focus the wheel or belts first, then use arrow keys to rotate rings.
    `.trim();
    
    alert(helpText); // Basic fallback - could be enhanced with modal
  }

  /**
   * Set up accessibility preference monitoring
   */
  _setupAccessibilityMonitoring() {
    // Monitor for reduced motion preference changes
    const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e: MediaQueryList | MediaQueryListEvent) => {
      document.body.classList.toggle('reduced-motion', e.matches);
    };
    
    motionMediaQuery.addListener(handleMotionChange);
    handleMotionChange(motionMediaQuery); // Initial check
    
    this.cleanupFunctions.push(() => {
      motionMediaQuery.removeListener(handleMotionChange);
    });

    // Monitor for high contrast preference
    const contrastMediaQuery = window.matchMedia('(prefers-contrast: high)');
    const handleContrastChange = (e: MediaQueryList | MediaQueryListEvent) => {
      document.body.classList.toggle('high-contrast', e.matches);
    };
    
    contrastMediaQuery.addListener(handleContrastChange);
    handleContrastChange(contrastMediaQuery);
    
    this.cleanupFunctions.push(() => {
      contrastMediaQuery.removeListener(handleContrastChange);
    });
  }
  
  onInteractionEnd() {
    // Announce state change after interaction completes
    setTimeout(() => {
      const resultElement = document.querySelector<HTMLElement>('#result-text');
      if (resultElement) {
        this._announceChange(`Current key: ${resultElement.textContent}`);
      }
    }, 100);
  }

  _setupResponsiveLogic() {
    // Track if we're currently resizing to hide belts during resize
    let isResizing = false;

    // Handler called immediately on resize start - hides belts
    const onResizeStart = () => {
      if (!isResizing) {
        isResizing = true;
        // Hide belts during resize to prevent misalignment
        this._setBeltsOpacity('0');
      }
    };

    // Create debounced resize handler - called after resize ends
    const debouncedHandleResize = PerformanceUtils.debounce(() => {
      try {
        const isWide = window.innerWidth > window.innerHeight;
        const newOrientation = isWide ? 'vertical' : 'horizontal';

        if (this.state.belts.orientation !== newOrientation) {
          ActionController.setOrientation(newOrientation);
          this._announceChange(`Layout changed to ${newOrientation}`);
        }

        // Force belts to reinitialize with new dimensions
        this.state.belts.init = false;

        // Mark dirty to ensure redraw after resize
        StateTracker.markDirty(this.state);

        // Show belts again after a short delay to allow recalculation
        requestAnimationFrame(() => {
          this._setBeltsOpacity('1');
          isResizing = false;
        });
      } catch (error) {
        ErrorHandler.handle(error, 'Resize', () => {
          console.warn('Resize handling failed');
        });
        // Ensure belts are shown even on error
        this._setBeltsOpacity('1');
        isResizing = false;
      }
    }, 250); // 250ms debounce - increased for better performance on low-end devices

    // Add resize listener - call both handlers
    const handleResize = () => {
      onResizeStart();
      debouncedHandleResize();
    };
    window.addEventListener('resize', handleResize);
    
    // Store cleanup function
    this.cleanupFunctions.push(() => {
      window.removeEventListener('resize', handleResize);
      debouncedHandleResize.cancel(); // Cancel any pending calls
    });

    // Handle initial resize
    try {
      const isWide = window.innerWidth > window.innerHeight;
      const initialOrientation = isWide ? 'vertical' : 'horizontal';
      ActionController.setOrientation(initialOrientation);
    } catch (error) {
      ErrorHandler.handle(error, 'Resize');
    }
  }

  _setupPerformanceMonitoring() {
    let lowFPSCount = 0;
    const FPS_CHECK_THRESHOLD = 3; // Number of low FPS readings before enabling low-power mode

    // FPS monitoring for all devices (not just development)
    this.performanceMonitor = PerformanceUtils.createFPSMonitor((fps) => {
      // Detect consistently low FPS
      if (fps < 30) {
        lowFPSCount++;
        console.warn(`Low FPS detected: ${fps} (count: ${lowFPSCount})`);

        // Enable low-power mode after consistent low FPS
        if (lowFPSCount >= FPS_CHECK_THRESHOLD && !this.state.performance.isLowPowerMode) {
          this.state.performance.isLowPowerMode = true;
          document.body.classList.add('low-power-mode');
          this._announceChange('Performance mode adjusted for this device');
        }
      } else if (fps >= 50) {
        // Reset counter if FPS improves
        lowFPSCount = Math.max(0, lowFPSCount - 1);

        // Disable low-power mode if FPS is consistently good
        if (lowFPSCount === 0 && this.state.performance.isLowPowerMode) {
          this.state.performance.isLowPowerMode = false;
          document.body.classList.remove('low-power-mode');
        }
      }
    }, 120); // Check every 2 seconds

    // Memory monitoring if available
    if (PerformanceUtils.getMemoryInfo()) {
      const memoryCheck = setInterval(() => {
        const memory = PerformanceUtils.getMemoryInfo();
        if (memory && memory.used > 100) { // 100MB threshold
          console.warn(`High memory usage: ${memory.used}MB`);
        }
      }, 30000); // Check every 30 seconds

      this.cleanupFunctions.push(() => clearInterval(memoryCheck));
    }

    // Store cleanup for performance monitor
    this.cleanupFunctions.push(() => {
      if (this.performanceMonitor) {
        this.performanceMonitor();
        this.performanceMonitor = null;
      }
    });
  }

  redraw(time: number) {
    try {
      // Step animations first (always runs, may update state)
      const wasAnimating = stepAnim(time);

      // Check and update canvas size with error handling
      const canvasResized = checkCanvasSize(this.elements.canvas, this.state.dimensions);

      // If canvas was resized, mark dirty so we redraw
      if (canvasResized) {
        StateTracker.markDirty(this.state);
      }

      // PERFORMANCE: Skip rendering if state hasn't changed and not in low power mode
      if (!this.state.performance.isLowPowerMode && !StateTracker.needsRedraw(this.state)) {
        return;
      }

      // Skip render if no valid canvas size
      if (!this.state.dimensions.size) {
        return;
      }

      // PERFORMANCE: Adaptive frame skipping on low-end devices
      if (this.state.performance.isLowPowerMode && wasAnimating) {
        this.state.performance.frameSkipCounter++;
        // Skip every other frame during animations on low-power devices
        if (this.state.performance.frameSkipCounter % 2 === 1) {
          return;
        }
      }

      // Generate display labels (this will be memoized in logic.js)
      const labels = generateDisplayLabels(this.state);
      const { rings, playback } = this.state;
      const highlightPattern = DIATONIC_DEGREE_INDICES;

      // Update components with error boundaries
      if (this.wheel) {
        try {
          this.wheel.update(rings, labels, playback);
        } catch (error) {
          ErrorHandler.handle(error, 'Wheel', () => {
            console.warn('Wheel update failed - skipping frame');
          });
        }
      }

      if (this.belts) {
        try {
          this.belts.update(labels, highlightPattern);
        } catch (error) {
          ErrorHandler.handle(error, 'Belts', () => {
            console.warn('Belts update failed - skipping frame');
          });
        }
      }

      if (this.uiControls) {
        try {
          this.uiControls.update();
        } catch (error) {
          ErrorHandler.handle(error, 'UIControls', () => {
            console.warn('UI Controls update failed - skipping frame');
          });
        }
      }

      // Mark state as clean after successful render
      StateTracker.markClean(this.state);

    } catch (error) {
      ErrorHandler.handle(error, 'RenderLoop', () => {
        console.error('Critical render error - app may be unstable');
      });
    }
  }

  /**
   * Clean up resources and event listeners
   */
  destroy() {
    try {
      // Clean up accessibility features
      if (this.keyboardManager) {
        // KeyboardManager cleanup would go here if it had a cleanup method
      }
      if (this.screenReaderManager) {
        this.screenReaderManager.cleanup();
      }

      // Run all cleanup functions
      this.cleanupFunctions.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.warn('Cleanup function failed:', error);
        }
      });
      this.cleanupFunctions = [];

      // Clean up components if they have destroy methods
      if (this.wheel && typeof this.wheel.destroy === 'function') {
        this.wheel.destroy();
      }
      if (this.belts && typeof this.belts.destroy === 'function') {
        this.belts.destroy();
      }
      if (this.uiControls && typeof this.uiControls.destroy === 'function') {
        this.uiControls.destroy();
      }

      // Stop performance monitoring
      if (this.performanceMonitor) {
        this.performanceMonitor();
        this.performanceMonitor = null;
      }

      this.isInitialized = false;

    } catch (error) {
      ErrorHandler.handle(error, 'App', () => {
        console.error('App cleanup failed');
      });
    }
  }

  /**
   * Check if running in development mode
   */
  _isDevelopment() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.protocol === 'file:';
  }

  /**
   * Get app status for debugging
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      components: {
        wheel: !!this.wheel,
        belts: !!this.belts,
        uiControls: !!this.uiControls
      },
      accessibility: {
        keyboardEnabled: this.keyboardManager?.isEnabled,
        screenReaderEnabled: this.screenReaderManager?.isEnabled
      },
      dimensions: this.state.dimensions,
      errors: ErrorHandler.getErrorLog()
    };
  }
}

