import { createSixteenthHexBase } from '@mlt/notation-glyphs';

export type Point = { x: number; y: number };
export type Diamond = { T: Point; R: Point; B: Point; L: Point };

type Edge = { start: Point; end: Point };
type Polygon = Point[];

const PRECISION = 6;

const roundCoord = (value: number): number => Number(value.toFixed(PRECISION));
const formatCoord = (value: number): string => Number(value.toFixed(4)).toString();
const edgeLength = (edge: Edge): number => {
  const dx = edge.end.x - edge.start.x;
  const dy = edge.end.y - edge.start.y;
  return Math.sqrt((dx * dx) + (dy * dy));
};

const pointKey = (point: Point): string => `${roundCoord(point.x)},${roundCoord(point.y)}`;
const edgeKey = (a: Point, b: Point): string => {
  const first = pointKey(a);
  const second = pointKey(b);
  return first < second ? `${first}|${second}` : `${second}|${first}`;
};

const toPolygon = (base: Diamond | Point[]): Point[] =>
  Array.isArray(base) ? base : [base.T, base.R, base.B, base.L];

const polygonEdges = (points: Polygon): Edge[] => {
  if (points.length < 2) {
    return [];
  }

  const edges: Edge[] = [];
  for (let i = 0; i < points.length; i++) {
    edges.push({
      start: points[i] as Point,
      end: points[(i + 1) % points.length] as Point
    });
  }
  return edges;
};

const translatePolygon = (base: Polygon, offset: Point): Polygon =>
  base.map(point => ({
    x: point.x + offset.x,
    y: point.y + offset.y
  }));

const orderBoundaryCycle = (edges: Edge[]): Point[] => {
  if (edges.length === 0) {
    return [];
  }

  const pointByKey = new Map<string, Point>();
  const neighborsByKey = new Map<string, string[]>();

  const addNeighbor = (fromKey: string, toKey: string) => {
    const neighbors = neighborsByKey.get(fromKey) ?? [];
    if (!neighbors.includes(toKey)) {
      neighbors.push(toKey);
      neighborsByKey.set(fromKey, neighbors);
    }
  };

  edges.forEach(edge => {
    const startKey = pointKey(edge.start);
    const endKey = pointKey(edge.end);
    if (!pointByKey.has(startKey)) {
      pointByKey.set(startKey, edge.start);
    }
    if (!pointByKey.has(endKey)) {
      pointByKey.set(endKey, edge.end);
    }
    addNeighbor(startKey, endKey);
    addNeighbor(endKey, startKey);
  });

  const keys = Array.from(pointByKey.keys());
  if (keys.length === 0) {
    return [];
  }

  const startKey = keys.sort((left, right) => {
    const leftPoint = pointByKey.get(left) as Point;
    const rightPoint = pointByKey.get(right) as Point;
    if (leftPoint.x !== rightPoint.x) {
      return leftPoint.x - rightPoint.x;
    }
    return leftPoint.y - rightPoint.y;
  })[0] as string;

  const orderedKeys: string[] = [startKey];
  let previousKey: string | null = null;
  let currentKey = startKey;
  const maxSteps = edges.length + 1;

  for (let step = 0; step < maxSteps; step++) {
    const neighbors = neighborsByKey.get(currentKey) ?? [];
    const nextKey = neighbors.find(key => key !== previousKey);
    if (!nextKey || nextKey === startKey) {
      break;
    }
    orderedKeys.push(nextKey);
    previousKey = currentKey;
    currentKey = nextKey;
  }

  return orderedKeys.map(key => pointByKey.get(key) as Point);
};

export function findRuns(selected: boolean[]): Array<{ a: number; b: number }> {
  const runs: Array<{ a: number; b: number }> = [];
  let i = 0;

  while (i < selected.length) {
    if (!selected[i]) {
      i++;
      continue;
    }

    const start = i;
    while (i + 1 < selected.length && selected[i + 1]) {
      i++;
    }
    runs.push({ a: start, b: i });
    i++;
  }

  return runs;
}

export function buildOuterCycleByEdgeStitching(diamonds: Polygon[]): Point[] {
  const edgeCounts = new Map<string, { count: number; edge: Edge }>();

  diamonds.forEach(diamond => {
    polygonEdges(diamond).forEach(edge => {
      const key = edgeKey(edge.start, edge.end);
      const existing = edgeCounts.get(key);
      if (existing) {
        existing.count += 1;
        return;
      }
      edgeCounts.set(key, { count: 1, edge });
    });
  });

  const outerEdges = Array.from(edgeCounts.values())
    .filter(entry => entry.count === 1)
    .map(entry => entry.edge);

  return orderBoundaryCycle(outerEdges);
}

export function sharedBoundary(left: Polygon, right: Polygon): [Point, Point] | null {
  const leftEdgesByKey = new Map<string, Edge>();
  polygonEdges(left).forEach(edge => {
    leftEdgesByKey.set(edgeKey(edge.start, edge.end), edge);
  });

  const shared = polygonEdges(right)
    .map(edge => leftEdgesByKey.get(edgeKey(edge.start, edge.end)))
    .filter((edge): edge is Edge => Boolean(edge));

  if (shared.length === 0) {
    return null;
  }

  const longestShared = shared.reduce((best, candidate) =>
    edgeLength(candidate) > edgeLength(best) ? candidate : best
  );

  if (longestShared.start.y <= longestShared.end.y) {
    return [longestShared.start, longestShared.end];
  }
  return [longestShared.end, longestShared.start];
}

export function outlineAndDividersForRun(diamonds: Polygon[]): {
  outline: Point[];
  dividers: Array<[Point, Point]>;
} {
  const dividers: Array<[Point, Point]> = [];
  for (let i = 0; i < diamonds.length - 1; i++) {
    const divider = sharedBoundary(diamonds[i] as Polygon, diamonds[i + 1] as Polygon);
    if (divider) {
      dividers.push(divider);
    }
  }

  return {
    outline: buildOuterCycleByEdgeStitching(diamonds),
    dividers
  };
}

export function svgPathFromPoints(points: Point[]): string {
  if (points.length === 0) {
    return '';
  }

  const head = `M ${formatCoord(points[0]!.x)} ${formatCoord(points[0]!.y)}`;
  const rest = points
    .slice(1)
    .map(point => `L ${formatCoord(point.x)} ${formatCoord(point.y)}`)
    .join(' ');
  return `${head} ${rest} Z`;
}

export function svgLinePath(a: Point, b: Point): string {
  return `M ${formatCoord(a.x)} ${formatCoord(a.y)} L ${formatCoord(b.x)} ${formatCoord(b.y)}`;
}

export interface RenderSixteenthStampRowSVGOptions {
  slots: 3 | 4;
  selected: boolean[];
  base: Diamond | Point[];
  offset: (i: number) => Point;
  strokeWidth: number;
  stroke?: string;
  strokeLinecap?: 'butt' | 'round' | 'square';
  strokeLinejoin?: 'arcs' | 'bevel' | 'miter' | 'miter-clip' | 'round';
}

export function renderSixteenthStampRowSVG(options: RenderSixteenthStampRowSVGOptions): string {
  const {
    slots,
    selected,
    base,
    offset,
    strokeWidth,
    stroke = 'currentColor',
    strokeLinecap = 'round',
    strokeLinejoin = 'round'
  } = options;

  if (selected.length !== slots) {
    throw new Error(`Expected ${slots} selection flags, got ${selected.length}`);
  }

  const basePolygon = toPolygon(base);
  const runs = findRuns(selected);

  return runs.map(run => {
    const diamonds: Polygon[] = [];
    for (let i = run.a; i <= run.b; i++) {
      diamonds.push(translatePolygon(basePolygon, offset(i)));
    }

    const { outline, dividers } = outlineAndDividersForRun(diamonds);
    const outlineMarkup = outline.length >= 3
      ? `<path data-segment="outline" d="${svgPathFromPoints(outline)}" fill="none" stroke="${stroke}" stroke-width="${formatCoord(strokeWidth)}" stroke-linecap="${strokeLinecap}" stroke-linejoin="${strokeLinejoin}" />`
      : '';
    const dividerMarkup = dividers
      .map(([start, end]) =>
        `<path data-segment="divider" d="${svgLinePath(start, end)}" fill="none" stroke="${stroke}" stroke-width="${formatCoord(strokeWidth)}" stroke-linecap="${strokeLinecap}" stroke-linejoin="${strokeLinejoin}" />`
      )
      .join('');

    return `${outlineMarkup}${dividerMarkup}`;
  }).join('');
}

export function createHexDiamondBase(width: number, totalHeight: number, centerY: number): Point[] {
  return createSixteenthHexBase(width, totalHeight, centerY);
}
