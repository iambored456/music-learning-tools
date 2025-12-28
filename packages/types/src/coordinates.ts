/**
 * Coordinate Type System for Music Learning Tools
 *
 * This module defines branded types to prevent mixing different coordinate spaces.
 *
 * COORDINATE SPACES:
 * - CANVAS-SPACE: Musical columns only (0-based, 0 = first musical beat)
 * - FULL-SPACE: All columns including the left/right side label columns
 *               (DEPRECATED - being phased out)
 */

/**
 * Canvas-space column index (0 = first musical beat)
 * This is the primary coordinate system used throughout the application.
 */
export type CanvasSpaceColumn = number & { readonly __brand: 'CanvasSpace' };

/**
 * Full-space column index (includes left/right side label columns / "legends")
 * DEPRECATED: This type exists only for migration purposes and will be removed.
 */
export type FullSpaceColumn = number & { readonly __brand: 'FullSpace' };

/**
 * Type guard to check if a value is a valid canvas-space column
 */
export function isCanvasSpaceColumn(value: unknown): value is CanvasSpaceColumn {
  return typeof value === 'number' && value >= 0 && Number.isInteger(value);
}

/**
 * Type guard to check if a value is a valid full-space column
 * DEPRECATED: For migration purposes only
 */
export function isFullSpaceColumn(value: unknown): value is FullSpaceColumn {
  return typeof value === 'number' && value >= 0 && Number.isInteger(value);
}

/**
 * Creates a canvas-space column with runtime validation (development only)
 */
export function createCanvasSpaceColumn(value: number): CanvasSpaceColumn {
  // Validation only runs in development builds (Vite replaces with false in prod)
  if (__DEV__) {
    if (!Number.isInteger(value)) {
      throw new Error(`Canvas-space column must be an integer, got: ${value}`);
    }
    if (value < 0) {
      throw new Error(`Canvas-space column must be >= 0, got: ${value}`);
    }
  }
  return value as CanvasSpaceColumn;
}

/**
 * Creates a full-space column with runtime validation
 * DEPRECATED: For migration purposes only
 */
export function createFullSpaceColumn(value: number): FullSpaceColumn {
  if (__DEV__) {
    if (!Number.isInteger(value)) {
      throw new Error(`Full-space column must be an integer, got: ${value}`);
    }
    if (value < 0) {
      throw new Error(`Full-space column must be >= 0, got: ${value}`);
    }
  }
  return value as FullSpaceColumn;
}

/**
 * Unwraps a branded column type to a plain number
 * Use sparingly - prefer keeping type safety
 */
export function unwrapColumn(column: CanvasSpaceColumn | FullSpaceColumn): number {
  return column as number;
}

// Global declaration for __DEV__ flag (set by bundler)
declare const __DEV__: boolean;
