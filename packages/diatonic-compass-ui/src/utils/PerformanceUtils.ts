// (file path: src/utils/PerformanceUtils.ts)

/**
 * Performance optimization utilities for Diatonic Compass
 * Provides debouncing, throttling, memoization, and performance monitoring
 */
type DebouncedFunction<T extends (...args: any[]) => void> = ((...args: Parameters<T>) => void) & {
  cancel: () => void;
};

type MemoizedFunction<T extends (...args: any[]) => any> = ((...args: Parameters<T>) => ReturnType<T>) & {
  clearCache: () => void;
  getCacheSize: () => number;
  getCacheStats: () => {
    size: number;
    maxSize: number;
    keys: string[];
  };
};

export class PerformanceUtils {
  
  /**
   * Debounce function execution - waits for delay after last call
   * Perfect for resize handlers and user input
   * @param {Function} func - Function to debounce
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Debounced function
   */
  static debounce<T extends (...args: any[]) => void>(func: T, delay: number): DebouncedFunction<T> {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    const debounced = (...args: Parameters<T>) => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
    
    // Add cancel method for cleanup
    debounced.cancel = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      timeoutId = null;
    };
    
    return debounced as DebouncedFunction<T>;
  }

  /**
   * Throttle function execution - limits calls to once per interval
   * Perfect for scroll handlers and animation callbacks
   * @param {Function} func - Function to throttle
   * @param {number} limit - Minimum interval between calls in milliseconds
   * @returns {Function} Throttled function
   */
  static throttle<T extends (...args: any[]) => void>(func: T, limit: number): (...args: Parameters<T>) => void {
    let inThrottle = false;
    let lastFunc: ReturnType<typeof setTimeout> | null = null;
    let lastRan = 0;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func.apply(this, args);
        lastRan = Date.now();
        inThrottle = true;
      } else {
        if (lastFunc !== null) {
          clearTimeout(lastFunc);
        }
        lastFunc = setTimeout(() => {
          if ((Date.now() - lastRan) >= limit) {
            func.apply(this, args);
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan));
      }
    };
  }

  /**
   * Memoize function results with customizable cache
   * Perfect for expensive calculations like label generation
   * @param {Function} fn - Function to memoize
   * @param {Function} keyGenerator - Custom key generation function
   * @param {number} maxCacheSize - Maximum cache entries
   * @returns {Function} Memoized function
   */
  static memoize<T extends (...args: any[]) => any>(
    fn: T,
    keyGenerator: (args: Parameters<T>) => string = JSON.stringify,
    maxCacheSize = 100
  ): MemoizedFunction<T> {
    const cache = new Map<string, ReturnType<T>>();
    
    const memoized = (...args: Parameters<T>) => {
      const key = keyGenerator(args as Parameters<T>);
      
      if (cache.has(key)) {
        return cache.get(key);
      }
      
      const result = fn(...args);
      
      // Manage cache size to prevent memory leaks
      if (cache.size >= maxCacheSize) {
        // Remove oldest entry (FIFO)
        const firstKey = cache.keys().next().value;
        if (firstKey !== undefined) {
          cache.delete(firstKey);
        }
      }
      
      cache.set(key, result);
      return result;
    };
    
    // Add cache management methods
    memoized.clearCache = () => cache.clear();
    memoized.getCacheSize = () => cache.size;
    memoized.getCacheStats = () => ({
      size: cache.size,
      maxSize: maxCacheSize,
      keys: Array.from(cache.keys())
    });
    
    return memoized as MemoizedFunction<T>;
  }

  /**
   * Create a simple performance monitor for measuring execution time
   * @param {string} label - Label for the measurement
   * @returns {Function} Function to end measurement
   */
  static startMeasure(label: string): () => number {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
      return duration;
    };
  }

  /**
   * Wrap a function with performance monitoring
   * @param {Function} fn - Function to monitor
   * @param {string} label - Label for measurements
   * @returns {Function} Wrapped function with monitoring
   */
  static monitor<T extends (...args: any[]) => any>(fn: T, label: string): (...args: Parameters<T>) => ReturnType<T> {
    return (...args) => {
      const endMeasure = this.startMeasure(label);
      try {
        const result = fn(...args);
        endMeasure();
        return result;
      } catch (error) {
        endMeasure();
        throw error;
      }
    };
  }

  /**
   * Optimize animation frame callbacks with requestIdleCallback when available
   * Falls back to requestAnimationFrame if idle callback isn't supported
   * @param {Function} callback - Callback function
   * @param {Object} options - Options for idle callback
   * @returns {number} Request ID for cancellation
   */
  static requestOptimizedFrame(callback: IdleRequestCallback, options: IdleRequestOptions = {}): number {
    if (typeof window.requestIdleCallback === 'function') {
      return window.requestIdleCallback(callback, {
        timeout: 16, // ~60fps fallback
        ...options
      });
    } else {
      return requestAnimationFrame(() => {
        callback({
          didTimeout: false,
          timeRemaining: () => 0
        });
      });
    }
  }

  /**
   * Cancel optimized frame request
   * @param {number} id - Request ID to cancel
   */
  static cancelOptimizedFrame(id: number): void {
    if (typeof window.cancelIdleCallback === 'function') {
      window.cancelIdleCallback(id);
    } else {
      cancelAnimationFrame(id);
    }
  }

  /**
   * Batch DOM updates to minimize reflows
   * @param {Function} updateFunction - Function containing DOM updates
   * @returns {Promise} Promise that resolves when updates are complete
   */
  static batchDOMUpdates(updateFunction: () => void): Promise<void> {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        updateFunction();
        resolve();
      });
    });
  }

  /**
   * Create a frame rate monitor
   * @param {Function} callback - Called with current FPS
   * @param {number} updateInterval - How often to update FPS (in frames)
   * @returns {Function} Function to stop monitoring
   */
  static createFPSMonitor(callback: (fps: number) => void, updateInterval = 60): () => void {
    let frames = 0;
    let lastTime = performance.now();
    let animationId: number | null = null;
    
    const measure = (currentTime: number) => {
      frames++;
      
      if (frames % updateInterval === 0) {
        const fps = Math.round(updateInterval * 1000 / (currentTime - lastTime));
        callback(fps);
        lastTime = currentTime;
      }
      
      animationId = requestAnimationFrame(measure);
    };
    
    animationId = requestAnimationFrame(measure);
    
    // Return stop function
    return () => {
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    };
  }

  /**
   * Check if reduced motion is preferred by user
   * @returns {boolean} True if reduced motion is preferred
   */
  static prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Get viewport dimensions efficiently
   * @returns {Object} Viewport width and height
   */
  static getViewportSize() {
    return {
      width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
      height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
    };
  }

  /**
   * Check if element is in viewport (for virtual scrolling)
   * @param {Element} element - Element to check
   * @param {number} threshold - Threshold for intersection (0-1)
   * @returns {boolean} True if element is visible
   */
  static isElementVisible(element: Element, threshold = 0): boolean {
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    
    return (
      rect.bottom >= threshold * viewportHeight &&
      rect.top <= (1 - threshold) * viewportHeight &&
      rect.right >= threshold * viewportWidth &&
      rect.left <= (1 - threshold) * viewportWidth
    );
  }

  /**
   * Simple memory usage monitor (when available)
   * @returns {Object|null} Memory info or null if not available
   */
  static getMemoryInfo() {
    if (performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(performance.memory.totalJSHeapSize / 1048576), // MB
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) // MB
      };
    }
    return null;
  }
}
