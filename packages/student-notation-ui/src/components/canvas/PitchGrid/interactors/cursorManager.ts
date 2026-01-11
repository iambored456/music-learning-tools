/**
 * Cursor Manager
 *
 * Handles cursor state management for stamp tool hover effects.
 * Prevents annotation service hover logic from overriding stamp cursors.
 */

let isStampGrabCursorActive = false;
let lastBodyCursor: string | null = null;
let lastHtmlCursor: string | null = null;
let lastCanvasCursor: string | null = null;
let stampCursorCanvas: HTMLElement | null = null;

export const STAMP_GRAB_CURSOR = 'grab';

/**
 * Set the stamp hover cursor on the canvas and document.
 * Prevents annotation service from overriding the cursor during stamp hover.
 *
 * @param canvasEl - The canvas element to set cursor on
 */
export function setStampHoverCursor(canvasEl: HTMLElement | null): void {
  if (isStampGrabCursorActive) {
    if (canvasEl) {
      canvasEl.style.cursor = STAMP_GRAB_CURSOR;
    }
    return;
  }

  lastBodyCursor = document.body.style.cursor || null;
  lastHtmlCursor = document.documentElement.style.cursor || null;
  lastCanvasCursor = canvasEl?.style.cursor ?? null;
  stampCursorCanvas = canvasEl ?? null;

  if (canvasEl) {
    canvasEl.style.cursor = STAMP_GRAB_CURSOR;
  }
  document.body.style.cursor = STAMP_GRAB_CURSOR;
  document.documentElement.style.cursor = STAMP_GRAB_CURSOR;
  document.body.dataset['cursorOverride'] = 'stamp';
  isStampGrabCursorActive = true;
}

/**
 * Clear the stamp hover cursor, restoring previous cursor states.
 */
export function clearStampHoverCursor(): void {
  if (!isStampGrabCursorActive) {
    return;
  }

  if (stampCursorCanvas && stampCursorCanvas.style.cursor === STAMP_GRAB_CURSOR) {
    stampCursorCanvas.style.cursor = lastCanvasCursor ?? '';
  }
  if (document.body.style.cursor === STAMP_GRAB_CURSOR) {
    document.body.style.cursor = lastBodyCursor ?? '';
  }
  if (document.documentElement.style.cursor === STAMP_GRAB_CURSOR) {
    document.documentElement.style.cursor = lastHtmlCursor ?? '';
  }
  if (document.body.dataset['cursorOverride'] === 'stamp') {
    delete document.body.dataset['cursorOverride'];
  }

  isStampGrabCursorActive = false;
  lastBodyCursor = null;
  lastHtmlCursor = null;
  lastCanvasCursor = null;
  stampCursorCanvas = null;
}

/**
 * Check if stamp grab cursor is currently active.
 */
export function isStampCursorActive(): boolean {
  return isStampGrabCursorActive;
}
