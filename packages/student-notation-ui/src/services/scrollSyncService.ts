import logger from '@utils/logger.ts';

/**
 * Service to handle programmatic horizontal scroll operations on the unified grids wrapper.
 */
class ScrollSyncService {
  private gridsWrapper: HTMLElement | null = null;
  private pitchGridWrapper: HTMLElement | null = null;
  private drumGridWrapper: HTMLElement | null = null;
  private isInitialized = false;

  init(): void {
    this.gridsWrapper = document.getElementById('grids-wrapper');
    this.pitchGridWrapper = document.getElementById('pitch-grid-wrapper');
    this.drumGridWrapper = document.getElementById('drum-grid-wrapper');

    if (!this.gridsWrapper || !this.pitchGridWrapper || !this.drumGridWrapper) {
      logger.error('ScrollSyncService', 'Required elements not found for scroll sync', null, 'scroll');
      return;
    }

    this.isInitialized = true;
    logger.info('ScrollSyncService', 'Initialized with native grids-wrapper horizontal scrollbar', null, 'scroll');
  }

  // Manual sync method for programmatic scrolling
  syncScrollTo(scrollLeft: number): void {
    if (!this.isInitialized || !this.gridsWrapper) {return;}
    this.gridsWrapper.scrollLeft = scrollLeft;
  }
}

// Create singleton instance
const scrollSyncService = new ScrollSyncService();

export default scrollSyncService;
