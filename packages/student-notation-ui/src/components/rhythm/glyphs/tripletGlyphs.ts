// js/ui/glyphs/tripletGlyphs.js

interface TripletStamp {
  label: string;
  span: 'eighth' | 'quarter';
  hits: number[];
}

interface NoteheadParams {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  stroke?: string;
  strokeWidth?: number;
}

let svgGradientCounter = 0;

/**
 * Creates a single triplet notehead SVG element centered at (cx, cy).
 * Quarter triplet noteheads are 2x wider than eighth triplet noteheads
 * to represent their 2-cell (quarter note) span.
 */
export function createTripletNotehead({
  cx,
  cy,
  rx,
  ry,
  stroke = 'currentColor',
  strokeWidth = 3
}: NoteheadParams) {
  const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
  ellipse.setAttribute('cx', `${cx}`);
  ellipse.setAttribute('cy', `${cy}`);
  ellipse.setAttribute('rx', `${rx}`);
  ellipse.setAttribute('ry', `${ry}`);
  ellipse.setAttribute('fill', 'none');
  ellipse.setAttribute('stroke', stroke);
  ellipse.setAttribute('stroke-width', `${strokeWidth}`);
  ellipse.setAttribute('stroke-linecap', 'round');

  return ellipse;
}

function createTripletPlaybackFill({
  cx,
  cy,
  rx,
  ry,
  gradientId
}: NoteheadParams & { gradientId: string }) {
  const fillEllipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
  fillEllipse.setAttribute('cx', `${cx}`);
  fillEllipse.setAttribute('cy', `${cy}`);
  fillEllipse.setAttribute('rx', `${rx}`);
  fillEllipse.setAttribute('ry', `${ry}`);
  fillEllipse.setAttribute('fill', `url(#${gradientId})`);
  fillEllipse.setAttribute('data-segment', 'playback-fill');
  return fillEllipse;
}

/**
 * Creates a complete triplet preview SVG for a given stamp
 */
export function createTripletPreview(stamp: TripletStamp, width = 48, height = 48) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

  const isWide = stamp.span === 'quarter';

  // ViewBox matches button aspect ratio
  const viewBoxWidth = isWide ? 200 : 100;
  const viewBoxHeight = 100;
  svg.setAttribute('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`);
  svg.setAttribute('width', `${width}`);
  svg.setAttribute('height', `${height}`);
  svg.setAttribute('aria-label', stamp.label);

  const centerY = 50;  // Middle of viewBox

  // Ellipse dimensions (in viewBox units)
  // Quarter triplets use 2x wider ellipses to match their 2-cell span
  const ellipseRx = isWide ? 32 : 16;  // Horizontal radius: 2x for quarter triplets
  const ellipseRy = 40;  // Vertical radius: same for both

  // Position noteheads at 1/6, 3/6, 5/6 of the viewBox width
  const centers = isWide
    ? [33.33, 100, 166.67]  // Spread across viewBox width 200
    : [16.67, 50, 83.33];    // Spread across viewBox width 100

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const fillEllipses: SVGElement[] = [];
  const gradientPrefix = `triplet-playback-fill-${svgGradientCounter++}`;

  stamp.hits.forEach(hit => {
    const cx = centers[hit];
    if (cx === undefined) {
      return;
    }

    const gradientId = `${gradientPrefix}-${hit}`;
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
    gradient.setAttribute('id', gradientId);
    gradient.setAttribute('gradientUnits', 'userSpaceOnUse');
    gradient.setAttribute('cx', String(cx));
    gradient.setAttribute('cy', String(centerY));
    gradient.setAttribute('r', String(Math.max(ellipseRx, ellipseRy)));

    const innerStop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    innerStop.setAttribute('offset', '0%');
    innerStop.setAttribute('stop-color', 'currentColor');
    innerStop.setAttribute('stop-opacity', String(0x1F / 255));

    const outerStop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    outerStop.setAttribute('offset', '100%');
    outerStop.setAttribute('stop-color', 'currentColor');
    outerStop.setAttribute('stop-opacity', String(0xBF / 255));

    gradient.appendChild(innerStop);
    gradient.appendChild(outerStop);
    defs.appendChild(gradient);

    fillEllipses.push(createTripletPlaybackFill({
      cx,
      cy: centerY,
      rx: ellipseRx,
      ry: ellipseRy,
      gradientId
    }));
  });

  if (fillEllipses.length > 0) {
    svg.appendChild(defs);
    fillEllipses.forEach(fillEllipse => svg.appendChild(fillEllipse));
  }

  stamp.hits.forEach(hit => {
    const cx = centers[hit];
    if (cx === undefined) {
      return;
    }
    const notehead = createTripletNotehead({
      cx,
      cy: centerY,
      rx: ellipseRx,
      ry: ellipseRy,
      stroke: 'currentColor',
      strokeWidth: 3
    });
    svg.appendChild(notehead);
  });

  return svg;
}
