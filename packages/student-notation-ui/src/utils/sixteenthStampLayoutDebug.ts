interface LayoutSnapshot {
  section: 'four' | 'three';
  element: string;
  selector: string;
  found: boolean;
  display: string;
  width: number;
  height: number;
  gap: string;
  rowGap: string;
  columnGap: string;
  padding: string;
  margin: string;
  gridTemplateColumns: string;
  aspectRatio: string;
}

type Section = 'four' | 'three';

declare global {
  interface Window {
    __sixteenthStampLayoutDebugRegistered?: boolean;
    __SN_DEBUG_SIXTEENTH_LAYOUT?: boolean;
    logSixteenthStampLayoutComparison?: () => void;
  }
}

const round = (value: number): number => Number(value.toFixed(2));
const FOUR_CONTAINER_ID = 'sixteenth-stamps-four-toolbar-container';
const THREE_CONTAINER_ID = 'sixteenth-stamps-three-toolbar-container';

function isSixteenthStampLayoutDebugEnabled(): boolean {
  try {
    if (Boolean(window.__SN_DEBUG_SIXTEENTH_LAYOUT)) {
      return true;
    }
  } catch {
    // ignore
  }

  try {
    if (new URLSearchParams(window.location.search).get('debugSixteenthLayout') === '1') {
      return true;
    }
  } catch {
    // ignore
  }

  try {
    return localStorage.getItem('sn:debugSixteenthLayout') === '1';
  } catch {
    return false;
  }
}

const withSectionVisible = <T>(section: Section, callback: () => T): T => {
  const fourContainer = document.getElementById(FOUR_CONTAINER_ID) as HTMLElement | null;
  const threeContainer = document.getElementById(THREE_CONTAINER_ID) as HTMLElement | null;
  if (!fourContainer || !threeContainer) {
    return callback();
  }

  const previousFourDisplay = fourContainer.style.display;
  const previousThreeDisplay = threeContainer.style.display;
  const previousFourVisibility = fourContainer.style.visibility;
  const previousThreeVisibility = threeContainer.style.visibility;

  try {
    // Avoid visual flicker while toggling panel visibility for measurement.
    fourContainer.style.visibility = 'hidden';
    threeContainer.style.visibility = 'hidden';
    if (section === 'four') {
      fourContainer.style.display = '';
      threeContainer.style.display = 'none';
    } else {
      threeContainer.style.display = '';
      fourContainer.style.display = 'none';
    }
    return callback();
  } finally {
    fourContainer.style.display = previousFourDisplay;
    threeContainer.style.display = previousThreeDisplay;
    fourContainer.style.visibility = previousFourVisibility;
    threeContainer.style.visibility = previousThreeVisibility;
  }
};

const readSnapshot = (
  section: 'four' | 'three',
  element: string,
  selector: string,
  target: HTMLElement | null
): LayoutSnapshot => {
  if (!target) {
    return {
      section,
      element,
      selector,
      found: false,
      display: 'missing',
      width: 0,
      height: 0,
      gap: '',
      rowGap: '',
      columnGap: '',
      padding: '',
      margin: '',
      gridTemplateColumns: '',
      aspectRatio: ''
    };
  }

  const computed = window.getComputedStyle(target);
  const rect = target.getBoundingClientRect();

  return {
    section,
    element,
    selector,
    found: true,
    display: computed.display,
    width: round(rect.width),
    height: round(rect.height),
    gap: computed.gap,
    rowGap: computed.rowGap,
    columnGap: computed.columnGap,
    padding: computed.padding,
    margin: computed.margin,
    gridTemplateColumns: computed.gridTemplateColumns,
    aspectRatio: computed.aspectRatio
  };
};

const collectSnapshots = (
  section: Section,
  containerId: string,
  gridSelector: string,
  rowSelector: string
): LayoutSnapshot[] => {
  const container = document.getElementById(containerId);
  const grid = container?.querySelector<HTMLElement>(gridSelector) ?? null;
  const row = container?.querySelector<HTMLElement>(rowSelector) ?? null;
  const button = row?.querySelector<HTMLElement>('.sixteenth-stamp-button') ?? null;
  const svg = button?.querySelector<HTMLElement>('svg') ?? null;

  return [
    readSnapshot(section, 'container', `#${containerId}`, container),
    readSnapshot(section, 'grid', gridSelector, grid),
    readSnapshot(section, 'row-1', rowSelector, row),
    readSnapshot(section, 'button', '.sixteenth-stamp-button', button),
    readSnapshot(section, 'svg', '.sixteenth-stamp-button svg', svg)
  ];
};

const logSummary = (snapshots: LayoutSnapshot[]): void => {
  const findRow = (section: Section, element: string) =>
    snapshots.find(row => row.section === section && row.element === element) ?? null;

  const fourButton = findRow('four', 'button');
  const threeButton = findRow('three', 'button');
  const fourRow = findRow('four', 'row-1');
  const threeRow = findRow('three', 'row-1');

  if (!fourButton || !threeButton || !fourRow || !threeRow) {
    return;
  }

  console.log('[sixteenth-layout] deltas', {
    rowWidthDelta: round(fourRow.width - threeRow.width),
    rowHeightDelta: round(fourRow.height - threeRow.height),
    buttonWidthDelta: round(fourButton.width - threeButton.width),
    buttonHeightDelta: round(fourButton.height - threeButton.height),
    buttonWidthRatio: threeButton.width > 0 ? round(fourButton.width / threeButton.width) : null,
    buttonHeightRatio: threeButton.height > 0 ? round(fourButton.height / threeButton.height) : null
  });
};

export function registerSixteenthStampLayoutDebug(): void {
  if (
    typeof window === 'undefined'
    || window.__sixteenthStampLayoutDebugRegistered
    || !isSixteenthStampLayoutDebugEnabled()
  ) {
    return;
  }

  window.__sixteenthStampLayoutDebugRegistered = true;
  window.logSixteenthStampLayoutComparison = () => {
    const snapshots = [
      ...withSectionVisible('four', () => collectSnapshots(
        'four',
        FOUR_CONTAINER_ID,
        '.sixteenth-four-stamp-grid',
        '.sixteenth-stamps-row-1'
      )),
      ...withSectionVisible('three', () => collectSnapshots(
        'three',
        THREE_CONTAINER_ID,
        '.sixteenth-three-stamps-grid',
        '.sixteenth-three-stamps-row-1'
      )),
    ];

    console.groupCollapsed('[sixteenth-layout] four vs three');
    console.table(snapshots);
    logSummary(snapshots);
    console.groupEnd();
  };
}
