import type { AnnotationArrowheadStyle } from '@mlt/types';

export const arrowEndpoints: Array<{ value: AnnotationArrowheadStyle; label: string }> = [
  { value: 'none', label: 'No head' },
  { value: 'open-arrow', label: 'Open arrow' },
  { value: 'open-circle', label: 'Open circle' },
  { value: 'open-square', label: 'Open square' },
  { value: 'open-diamond', label: 'Open diamond' },
  { value: 'bar', label: 'Bar' },
  { value: 'filled-arrow', label: 'Filled arrow' },
  { value: 'circle', label: 'Filled circle' },
  { value: 'square', label: 'Filled square' },
  { value: 'diamond', label: 'Filled diamond' }
];

export function arrowEndpointIcon(side: 'start' | 'end', type: AnnotationArrowheadStyle): string {
  const filled = ['filled', 'filled-arrow', 'circle', 'square', 'diamond'].includes(type);
  let shape = '';
  let shaftStart = 5;
  switch (type) {
    case 'none':
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M5.6 18.4 18.4 5.6"/></svg>';
    case 'bar': shape = '<path d="M5 8v8"/>'; break;
    case 'open-arrow': shape = '<path d="m10 7-5 5 5 5"/>'; break;
    case 'filled':
    case 'filled-arrow':
    case 'unfilled':
    case 'unfilled-arrow': shape = '<path d="m4 12 9-5v10Z"/>'; shaftStart = 13; break;
    case 'circle':
    case 'open-circle': shape = '<circle cx="7" cy="12" r="3"/>'; shaftStart = 10; break;
    case 'square':
    case 'open-square': shape = '<rect x="4" y="9" width="6" height="6"/>'; shaftStart = 10; break;
    case 'diamond':
    case 'open-diamond': shape = '<path d="m3 12 4-4 4 4-4 4Z"/>'; shaftStart = 11; break;
  }
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><g${side === 'end' ? ' transform="translate(24 0) scale(-1 1)"' : ''}><path d="M${shaftStart} 12H21"/><g fill="${filled ? 'currentColor' : 'none'}">${shape}</g></g></svg>`;
}
