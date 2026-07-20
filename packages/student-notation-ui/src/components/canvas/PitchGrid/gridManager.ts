// js/components/canvas/pitchGrid/gridManager.ts
import store from '@state/initStore.ts';
import PitchGridController from './pitchGrid.ts';
import DrumGridController from '../drumGrid/drumGrid.ts';
import { initPitchGridInteraction } from './interactors/pitchGridInteractor.ts';
import { initLegendPitchRangeDragInteraction } from './interactors/legendPitchRangeDragInteractor.ts';
import { initDrumGridInteraction } from '../drumGrid/drumGridInteractor.ts';
import logger from '@utils/logger.ts';
import { TYPOGRAPHY_CHANGED_EVENT } from '@services/typographyService.ts';


/**
 * The GridManager is responsible for initializing all grid-related components
 * and exposing their core functionalities (like rendering) to the main application.
 */
const GridManager = {
  init() {
    // Initialize the event handlers for both grids.
    initPitchGridInteraction();
    initLegendPitchRangeDragInteraction();
    initDrumGridInteraction();

    // Listen for canvas resize events from layoutService
    document.addEventListener('canvasResized', () => {
      this.renderPitchGrid();
      this.renderDrumGrid();
    });

    document.addEventListener(TYPOGRAPHY_CHANGED_EVENT, () => {
      this.renderPitchGrid();
      this.renderDrumGrid();
    });

    // Listen for animation updates to trigger canvas redraws
    store.on('animationUpdate', (data: any) => {
      // Only redraw if we have vibrato animations
      if (data.type === 'vibrato' && data.activeColors && data.activeColors.length > 0) {
        this.renderPitchGrid();
      }
      // Delay ghost outlines are static per parameter change, so redraw when delay settings change.
      else if (data.type === 'delay' && data.activeColors && data.activeColors.length > 0) {
        this.renderPitchGrid();
      }
      // Handle envelope fill animations
      else if (data.type === 'envelopeFill' || data.hasEnvelopeFills) {
        this.renderPitchGrid();
      }
      // Also handle combined animations (both vibrato and tremolo)
      else if (data.type === 'combined' && data.vibratoColors && data.vibratoColors.length > 0) {
        this.renderPitchGrid();
      }
    });
    logger.debug('GridManager', 'Initialized pitch and drum grid interactions', null, 'grid');
  },

  // Expose the render methods from the controller modules.
  // These will be called from main.ts when the state changes.
  renderPitchGrid: PitchGridController.render,
  renderDrumGrid: DrumGridController.render
};

export default GridManager;
