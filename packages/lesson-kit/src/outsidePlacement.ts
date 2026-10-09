export type LessonOutsidePlacementOptions = {
  enabled: boolean;
  /** Cancel a pending drag when its question or checkpoint changes. */
  questionKey?: unknown;
  /** For overlays that also cover a left legend; coordinates stay in client space. */
  leftInset?: number;
  onMove?: (event: PointerEvent) => void;
  onDrop: (event: PointerEvent) => void;
  onCancel?: () => void;
};

const controls = 'button, input, select, textarea, a, label, summary, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="slider"], [role="textbox"], [role="combobox"]';

/** Let a drag from blank space or the legend finish as a normal grid placement.
 * Local presses remain owned by the lesson's existing pointer/keyboard handlers.
 */
export function lessonOutsidePlacement(node: HTMLElement, initial: LessonOutsidePlacementOptions) {
  const document = node.ownerDocument;
  let options = initial;
  let pointerId: number | null = null;
  let previewVisible = false;

  function inside(event: PointerEvent): boolean {
    const bounds = node.getBoundingClientRect();
    return bounds.width > 0 && bounds.height > 0
      && event.clientX >= bounds.left + (options.leftInset ?? 0) && event.clientX <= bounds.right
      && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
  }

  function cancel(): void {
    const active = pointerId !== null;
    pointerId = null;
    previewVisible = false;
    if (active) options.onCancel?.();
  }

  function down(event: PointerEvent): void {
    if (!options.enabled || pointerId !== null || event.button !== 0 || event.isPrimary === false || inside(event)) return;
    // composedPath also handles controls whose visible children are SVG or in a shadow root.
    if (event.composedPath().some(target => typeof (target as Element).matches === 'function'
      && (target as Element).matches(controls))) return;
    pointerId = event.pointerId;
  }

  function move(event: PointerEvent): void {
    if (event.pointerId !== pointerId || !options.enabled) return;
    if (event.pointerType === 'mouse' && (event.buttons & 1) === 0) {
      cancel();
      return;
    }
    if (inside(event)) {
      event.preventDefault();
      previewVisible = true;
      options.onMove?.(event);
    } else if (previewVisible) {
      previewVisible = false;
      options.onCancel?.();
    }
  }

  function up(event: PointerEvent): void {
    if (event.pointerId !== pointerId) return;
    const drop = options.enabled && inside(event);
    pointerId = null;
    previewVisible = false;
    if (drop) {
      event.preventDefault();
      options.onDrop(event);
    } else options.onCancel?.();
  }

  function cancelled(event: PointerEvent): void {
    if (event.pointerId === pointerId) cancel();
  }

  document.addEventListener('pointerdown', down, true);
  document.addEventListener('pointermove', move, { capture: true, passive: false });
  document.addEventListener('pointerup', up, true);
  document.addEventListener('pointercancel', cancelled, true);
  document.defaultView?.addEventListener('blur', cancel);

  return {
    update(next: LessonOutsidePlacementOptions): void {
      if (!next.enabled || next.questionKey !== options.questionKey) cancel();
      options = next;
    },
    destroy(): void {
      cancel();
      document.removeEventListener('pointerdown', down, true);
      document.removeEventListener('pointermove', move, true);
      document.removeEventListener('pointerup', up, true);
      document.removeEventListener('pointercancel', cancelled, true);
      document.defaultView?.removeEventListener('blur', cancel);
    },
  };
}
