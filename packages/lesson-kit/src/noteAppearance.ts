import type { LessonAudioOutput } from './audio';

export type LessonNoteShape = 'circle' | 'oval' | 'diamond' | 'capsule';

/** Student Notation's note proportions, expressed for DOM/SVG lesson overlays. */
export function calculateLessonNoteAppearance(width: number, height: number, shape: LessonNoteShape, cellWidth: number) {
  if (!Number.isFinite(cellWidth) || cellWidth <= 0) throw new RangeError('Lesson notes require a positive, finite cellWidth.');
  const stroke = shape === 'oval' ? Math.max(0.5, cellWidth * 0.15) : Math.max(1.5, cellWidth * 0.15);
  return { stroke, labelSize: Math.max(4, Math.min(width - stroke, height - stroke) * (shape === 'oval' ? 0.7 : 0.9)) };
}

/** Fit a label to a standard note, also usable by companion teaching visuals. */
export function calculateLessonNoteLabelSize(width: number, height: number, shape: LessonNoteShape, cellWidth: number, textWidth = 0): number {
  const { stroke, labelSize } = calculateLessonNoteAppearance(width, height, shape, cellWidth);
  const widthScale = textWidth > 0 ? (width - stroke) * 0.82 / textWidth : 1;
  const heightScale = (height - stroke) * 0.78 / labelSize;
  return labelSize * Math.max(0, Math.min(1, widthScale, heightScale));
}

export interface LessonNoteAppearanceOptions {
  audioOutput: LessonAudioOutput;
  /** null follows any voice (e.g. an avatar demonstrating an arbitrary pitch). */
  frequency?: number | null;
  /** Score glyphs use event identity so repeated pitches do not all fill. */
  noteId?: string;
  active?: boolean;
  /** Hold the standard fill for a teaching explanation without sustaining audio. */
  highlighted?: boolean;
  shape?: LessonNoteShape;
  /** Required grid scale; glyph width and hit-target size never determine stroke. */
  cellWidth: number;
}

let gradientId = 0;

/** Svelte action: size-dependent strokes/labels and audio-clock-driven envelope fill. */
export function lessonNoteAppearance(node: HTMLElement | SVGElement, initial: LessonNoteAppearanceOptions) {
  let options = initial;
  let stopListening: () => void;
  const svg = node instanceof SVGSVGElement ? node : null;
  let stops: SVGStopElement[] = [];
  let defs: SVGDefsElement | null = null;
  if (svg) {
    const ns = 'http://www.w3.org/2000/svg';
    defs = document.createElementNS(ns, 'defs');
    const gradient = document.createElementNS(ns, 'radialGradient');
    gradient.id = `mlt-note-envelope-${++gradientId}`;
    stops = [0, 1, 2, 3].map(() => document.createElementNS(ns, 'stop'));
    stops.forEach(stop => { stop.setAttribute('stop-color', 'currentColor'); gradient.append(stop); });
    defs.append(gradient);
    svg.prepend(defs);
    svg.querySelectorAll('path, polygon').forEach(path => {
      path.setAttribute('fill', `url(#${gradient.id})`);
      path.setAttribute('vector-effect', 'non-scaling-stroke');
    });
  }
  function paint() {
    const audioLevel = options.active === false ? 0 : options.audioOutput.getFillLevel(options.frequency, options.noteId);
    const level = options.highlighted ? 1 : audioLevel;
    node.style.setProperty('--mlt-lesson-fill-level', String(level));
    node.setAttribute('data-mlt-sounding', String(audioLevel > 0));
    node.setAttribute('data-mlt-highlighted', String(Boolean(options.highlighted)));
    if (svg) {
      const inner = 1 - level;
      [0, Math.max(0, inner - 0.05), inner, 1].forEach((offset, index) => {
        stops[index].setAttribute('offset', String(offset));
        stops[index].setAttribute('stop-opacity', String(level > 0 ? [0, 0, 31 / 255, 191 / 255][index] : 0));
      });
    }
  }
  function measure() {
    // Hit targets can stay fixed while their pseudo-element glyph changes size.
    // Apply the supplied grid scale even before that glyph is measurable.
    const shape = options.shape ?? 'circle';
    const appearance = calculateLessonNoteAppearance(0, 0, shape, options.cellWidth);
    node.style.setProperty('--mlt-lesson-note-stroke-width', `${appearance.stroke}px`);
    node.style.setProperty('--mlt-lesson-note-label-size', `${appearance.labelSize}px`);
    paint();
    const target = node.classList.contains('mlt-lesson-note-target');
    const computed = getComputedStyle(node, target ? '::before' : null);
    const width = parseFloat(computed.width);
    const height = parseFloat(computed.height);
    if (!(width > 0 && height > 0)) return;
    let labelSize = calculateLessonNoteAppearance(width, height, shape, options.cellWidth).labelSize;
    const label = node.querySelector<HTMLElement>('.mlt-lesson-note-label');
    if (label) {
      const labelStyle = getComputedStyle(label);
      const context = document.createElement('canvas').getContext('2d');
      if (context) {
        context.font = `${labelStyle.fontWeight} ${labelSize}px ${labelStyle.fontFamily}`;
        const textWidth = context.measureText(label.textContent ?? '').width;
        // Student Notation's octave-label fitting: constrain both dimensions.
        labelSize = calculateLessonNoteLabelSize(width, height, shape, options.cellWidth, textWidth);
      }
    }
    node.style.setProperty('--mlt-lesson-note-label-size', `${labelSize}px`);
  }
  function listen() { stopListening = options.audioOutput.subscribe(paint); }
  const observer = new ResizeObserver(measure);
  observer.observe(node);
  // Labels may change after the action mounts (A → A3), without resizing the note.
  const labelObserver = new MutationObserver(measure);
  labelObserver.observe(node, { childList: true, characterData: true, subtree: true });
  listen();
  measure();
  void document.fonts.ready.then(() => { if (node.isConnected) measure(); });
  return {
    update(next: LessonNoteAppearanceOptions) {
      stopListening(); options = next; listen(); measure();
    },
    destroy() { observer.disconnect(); labelObserver.disconnect(); stopListening(); defs?.remove(); },
  };
}
