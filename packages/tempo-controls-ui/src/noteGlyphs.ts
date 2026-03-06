/**
 * Inline SVG glyph strings for note duration icons.
 *
 * These are simple currentColor-based shapes so the shared tempo controls
 * component can render them without depending on app-specific assets.
 */

export const QUARTER_NOTE_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 24" fill="currentColor" aria-hidden="true" focusable="false">` +
  `<ellipse cx="4.5" cy="19.5" rx="4.2" ry="2.8" transform="rotate(-15 4.5 19.5)"/>` +
  `<rect x="8.2" y="2" width="1.1" height="17.5"/>` +
  `</svg>`;

export const EIGHTH_NOTE_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 24" fill="currentColor" aria-hidden="true" focusable="false">` +
  `<ellipse cx="4.5" cy="19.5" rx="4.2" ry="2.8" transform="rotate(-15 4.5 19.5)"/>` +
  `<rect x="8.2" y="2" width="1.1" height="17.5"/>` +
  `<path d="M9.3 2 C13.5 3.5 14 8.5 11 12 C10.2 10 9.3 7.5 9.3 5 Z"/>` +
  `</svg>`;

export const DOTTED_QUARTER_NOTE_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 24" fill="currentColor" aria-hidden="true" focusable="false">` +
  `<ellipse cx="4.5" cy="19.5" rx="4.2" ry="2.8" transform="rotate(-15 4.5 19.5)"/>` +
  `<rect x="8.2" y="2" width="1.1" height="17.5"/>` +
  `<circle cx="12.2" cy="18.5" r="1.8"/>` +
  `</svg>`;
