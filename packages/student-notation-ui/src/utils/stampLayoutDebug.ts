type StampLayoutDebugWindow = Window & {
  __SN_DEBUG_STAMP_LAYOUT?: boolean;
  __SN_STAMP_LAYOUT_LOGS?: Array<Record<string, unknown>>;
};

type ElementMetrics = {
  id: string;
  clientWidth: number;
  clientHeight: number;
  offsetWidth: number;
  offsetHeight: number;
  scrollWidth: number;
  scrollHeight: number;
  rectWidth: number;
  rectHeight: number;
  styleWidth: string;
  styleHeight: string;
} | null;

type CanvasMetrics = (ElementMetrics & {
  logicalWidth: number | null;
  logicalHeight: number | null;
  pixelRatio: number | null;
  bufferWidth: number;
  bufferHeight: number;
}) | null;

const TRACKED_DIMENSION_PATHS = [
  'elements.toolbar.clientHeight',
  'elements.toolbarPrimary.clientHeight',
  'elements.toolbarSecondary.clientHeight',
  'elements.buttonGrid.clientHeight',
  'elements.canvasContainer.clientHeight',
  'elements.gridsWrapper.clientHeight',
  'elements.pitchGridWrapper.clientHeight',
  'elements.pitchGridContainer.clientHeight',
  'elements.undoButton.clientWidth',
  'elements.undoButton.clientHeight',
  'elements.redoButton.clientWidth',
  'elements.redoButton.clientHeight',
  'canvases.notationGrid.clientHeight',
  'canvases.notationGrid.logicalHeight',
  'canvases.notationGrid.bufferHeight'
] as const;

let previousSnapshot: Record<string, unknown> | null = null;

function parseDatasetNumber(value: string | undefined): number | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getElementMetrics(id: string): ElementMetrics {
  const element = document.getElementById(id);
  if (!element) {
    return null;
  }
  const rect = element.getBoundingClientRect();
  return {
    id,
    clientWidth: element.clientWidth,
    clientHeight: element.clientHeight,
    offsetWidth: element.offsetWidth,
    offsetHeight: element.offsetHeight,
    scrollWidth: element.scrollWidth,
    scrollHeight: element.scrollHeight,
    rectWidth: Math.round(rect.width * 100) / 100,
    rectHeight: Math.round(rect.height * 100) / 100,
    styleWidth: element instanceof HTMLElement ? element.style.width : '',
    styleHeight: element instanceof HTMLElement ? element.style.height : ''
  };
}

function getCanvasMetrics(id: string): CanvasMetrics {
  const element = document.getElementById(id) as HTMLCanvasElement | null;
  if (!element) {
    return null;
  }
  const base = getElementMetrics(id);
  if (!base) {
    return null;
  }
  return {
    ...base,
    logicalWidth: parseDatasetNumber(element.dataset['logicalWidth']),
    logicalHeight: parseDatasetNumber(element.dataset['logicalHeight']),
    pixelRatio: parseDatasetNumber(element.dataset['pixelRatio']),
    bufferWidth: element.width,
    bufferHeight: element.height
  };
}

export function isStampLayoutDebugEnabled(): boolean {
  try {
    if (Boolean((window as StampLayoutDebugWindow).__SN_DEBUG_STAMP_LAYOUT)) {
      return true;
    }
  } catch {
    // ignore
  }

  try {
    const byQuery = new URLSearchParams(window.location.search).get('debugStampLayout') === '1';
    if (byQuery) {
      return true;
    }
  } catch {
    // ignore
  }

  try {
    return localStorage.getItem('sn:debugStampLayout') === '1';
  } catch {
    return false;
  }
}

export function getStampLayoutSnapshot(): Record<string, unknown> {
  return {
    viewport: {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio ?? 1
    },
    elements: {
      appContainer: getElementMetrics('app-container'),
      toolbar: getElementMetrics('toolbar'),
      toolbarPrimary: getElementMetrics('toolbar-primary'),
      toolbarSecondary: getElementMetrics('toolbar-secondary'),
      undoButton: getElementMetrics('undo-button'),
      redoButton: getElementMetrics('redo-button'),
      buttonGrid: getElementMetrics('button-grid'),
      canvasContainer: getElementMetrics('canvas-container'),
      gridsWrapper: getElementMetrics('grids-wrapper'),
      pitchGridWrapper: getElementMetrics('pitch-grid-wrapper'),
      pitchGridContainer: getElementMetrics('pitch-grid-container'),
      drumGridWrapper: getElementMetrics('drum-grid-wrapper')
    },
    canvases: {
      notationGrid: getCanvasMetrics('notation-grid'),
      playheadCanvas: getCanvasMetrics('playhead-canvas'),
      hoverCanvas: getCanvasMetrics('hover-canvas'),
      legendLeftCanvas: getCanvasMetrics('legend-left-canvas'),
      legendRightCanvas: getCanvasMetrics('legend-right-canvas')
    }
  };
}

function getPathValue(source: Record<string, unknown>, path: string): number | string | null {
  const parts = path.split('.');
  let current: unknown = source;
  for (const part of parts) {
    if (current === null || typeof current !== 'object') {
      return null;
    }
    current = (current as Record<string, unknown>)[part];
  }
  if (typeof current === 'number' || typeof current === 'string' || current === null) {
    return current;
  }
  return null;
}

function buildSnapshotDelta(
  previous: Record<string, unknown> | null,
  current: Record<string, unknown>
): Array<{ path: string; previous: number | string | null; current: number | string | null; delta?: number }> {
  if (!previous) {
    return [];
  }

  const changes: Array<{ path: string; previous: number | string | null; current: number | string | null; delta?: number }> = [];
  TRACKED_DIMENSION_PATHS.forEach((path) => {
    const previousValue = getPathValue(previous, path);
    const currentValue = getPathValue(current, path);
    if (previousValue === currentValue) {
      return;
    }
    if (typeof previousValue === 'number' && typeof currentValue === 'number') {
      changes.push({
        path,
        previous: previousValue,
        current: currentValue,
        delta: Math.round((currentValue - previousValue) * 100) / 100
      });
      return;
    }
    changes.push({
      path,
      previous: previousValue,
      current: currentValue
    });
  });
  return changes;
}

export function logStampLayout(
  stage: string,
  data: Record<string, unknown> = {},
  options: { includeSnapshot?: boolean } = {}
): void {
  if (!isStampLayoutDebugEnabled()) {
    return;
  }

  try {
    const includeSnapshot = options.includeSnapshot !== false;
    const snapshot = includeSnapshot ? getStampLayoutSnapshot() : null;
    const delta = includeSnapshot && snapshot
      ? buildSnapshotDelta(previousSnapshot, snapshot)
      : [];
    const payload = {
      stage,
      at: new Date().toISOString(),
      ...data,
      ...(includeSnapshot ? { dimensionDelta: delta, snapshot } : {})
    };
    console.log(`[SN:stamp-layout] ${stage}`, payload);
    const debugWindow = window as StampLayoutDebugWindow;
    const logBuffer = Array.isArray(debugWindow.__SN_STAMP_LAYOUT_LOGS)
      ? debugWindow.__SN_STAMP_LAYOUT_LOGS
      : [];
    logBuffer.push(payload);
    if (logBuffer.length > 200) {
      logBuffer.shift();
    }
    debugWindow.__SN_STAMP_LAYOUT_LOGS = logBuffer;
    if (includeSnapshot && snapshot) {
      previousSnapshot = snapshot;
    }
  } catch (error) {
    console.warn('[SN:stamp-layout] logging failed', error);
  }
}
