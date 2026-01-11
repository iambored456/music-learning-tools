/**
 * Resize Handler
 *
 * Manages debounced resize events and observers for layout recalculation.
 */

import { RESIZE_DEBOUNCE_DELAY } from '@/core/constants.ts';
import logger from '@utils/logger.ts';

/** Callback type for resize events */
export type ResizeCallback = () => void;

/** Internal state for resize handling */
let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
let resizeObserver: ResizeObserver | null = null;

/**
 * Debounced resize handler.
 * Delays calling the callback until resize events stop for RESIZE_DEBOUNCE_DELAY ms.
 *
 * @param callback - Function to call after debounce period
 */
export function handleResize(callback: ResizeCallback): void {
  if (resizeTimeout) {
    clearTimeout(resizeTimeout);
  }

  resizeTimeout = setTimeout(() => {
    callback();
    resizeTimeout = null;
  }, RESIZE_DEBOUNCE_DELAY);
}

/**
 * Set up a ResizeObserver on the grids wrapper element.
 *
 * @param callback - Function to call on resize
 * @returns Cleanup function to disconnect the observer
 */
export function setupResizeObserver(callback: ResizeCallback): () => void {
  const gridsWrapper = document.getElementById('grids-wrapper');

  if (!gridsWrapper) {
    logger.warn('ResizeHandler', 'grids-wrapper not found, cannot set up ResizeObserver', null, 'layout');
    return () => {};
  }

  // Clean up any existing observer
  if (resizeObserver) {
    resizeObserver.disconnect();
  }

  resizeObserver = new ResizeObserver(() => {
    handleResize(callback);
  });

  resizeObserver.observe(gridsWrapper);

  // Return cleanup function
  return () => {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
  };
}

/**
 * Set up window resize event listener.
 *
 * @param callback - Function to call on resize
 * @returns Cleanup function to remove the listener
 */
export function setupWindowResizeListener(callback: ResizeCallback): () => void {
  const handler = () => handleResize(callback);
  window.addEventListener('resize', handler);

  return () => {
    window.removeEventListener('resize', handler);
  };
}

/**
 * Cancel any pending resize timeout.
 */
export function cancelPendingResize(): void {
  if (resizeTimeout) {
    clearTimeout(resizeTimeout);
    resizeTimeout = null;
  }
}

/**
 * Force an immediate resize callback without debouncing.
 *
 * @param callback - Function to call immediately
 */
export function forceResize(callback: ResizeCallback): void {
  cancelPendingResize();
  callback();
}
