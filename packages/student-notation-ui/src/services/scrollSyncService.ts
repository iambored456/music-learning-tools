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

  /** Follow the transport's CSS-pixel position without changing canvas geometry. */
  followPlayhead(x: number, canvas: HTMLCanvasElement): void {
    const wrapper = this.gridsWrapper;
    if (!this.isInitialized || !wrapper || !Number.isFinite(x) || wrapper.clientWidth <= 0) {return;}

    const maxScroll = Math.max(0, wrapper.scrollWidth - wrapper.clientWidth);
    if (maxScroll === 0) {
      this.syncScrollTo(0);
      return;
    }

    // Playhead coordinates exclude legends. Recover the canvas origin in the
    // shared scroll area so legends, borders, and layout changes stay aligned.
    const canvasOrigin = canvas.getBoundingClientRect().left
      - wrapper.getBoundingClientRect().left - wrapper.clientLeft + wrapper.scrollLeft;
    const anchorX = wrapper.clientWidth * 0.25;
    const target = Math.max(0, Math.min(maxScroll, canvasOrigin + x - anchorX));

    // The transport calls this each animation frame; native immediate scrolling
    // keeps the playhead fixed without a second easing animation trailing audio.
    if (Math.abs(wrapper.scrollLeft - target) > 0.01) {
      this.syncScrollTo(target);
    }
  }
}

// Create singleton instance
const scrollSyncService = new ScrollSyncService();

export default scrollSyncService;
