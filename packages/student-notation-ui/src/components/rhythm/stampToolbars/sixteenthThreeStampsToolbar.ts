// js/components/Rhythm/stampToolbars/sixteenthThreeStampsToolbar.ts
import { SIXTEENTH_THREE_STAMPS } from '@/rhythm/sixteenthThreeStamps.ts';
import { defaultSixteenthThreeStampRenderer } from '@utils/sixteenthThreeStampRenderer.ts';
import { registerSixteenthStampLayoutDebug } from '@utils/sixteenthStampLayoutDebug.ts';
import store from '@state/initStore.ts';
import logger from '@utils/logger.ts';

interface SixteenthThreeStamp { id: number; label: string; [key: string]: unknown }

interface StampButtonColors {
  primary: string;
  light: string;
  hover: string;
}

const SixteenthThreeStampsToolbar = {
  selectedSixteenthThreeStampId: 1 as number,
  updateSixteenthThreeStampColors: (_color: string) => {},

  init() {
    registerSixteenthStampLayoutDebug();
    this.render();
    this.bindEvents();
    logger.info('SixteenthThreeStampsToolbar', 'Three-sixteenth stamps toolbar initialized', null, 'stamps');
  },

  render() {
    const container = document.getElementById('sixteenth-stamps-three-toolbar-container');
    if (!container) {
      logger.warn('SixteenthThreeStampsToolbar', 'Container not found', null, 'stamps');
      return;
    }

    container.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'sixteenth-three-stamps-grid';

    const stampRows = [
      [7, 1, 2, 3],
      [4, 5, 6]
    ];
    grid.style.gridTemplateRows = `repeat(${stampRows.length}, minmax(0, 1fr))`;

    stampRows.forEach((rowStampIds, rowIndex) => {
      const row = document.createElement('div');
      row.className = `sixteenth-three-stamps-row sixteenth-three-stamps-row-${rowIndex + 1}`;
      row.style.gridTemplateColumns = `repeat(${rowStampIds.length}, minmax(0, 1fr))`;

      rowStampIds.forEach(stampId => {
        const stamp = SIXTEENTH_THREE_STAMPS.find(s => s.id === stampId) as SixteenthThreeStamp | undefined;
        if (stamp) {
          const button = this.createSixteenthThreeStampButton(stamp);
          row.appendChild(button);
        }
      });

      grid.appendChild(row);
    });

    container.appendChild(grid);
    this.setInitialSelection(this.selectedSixteenthThreeStampId);
    window.logSixteenthStampLayoutComparison?.();
  },

  createSixteenthThreeStampButton(stamp: SixteenthThreeStamp) {
    const button = document.createElement('button');
    button.className = 'sixteenth-stamp-button';
    button.dataset['sixteenthThreeStampId'] = `${stamp.id}`;
    button.setAttribute('title', `${stamp.id}: ${stamp.label}`);

    const svg = this.createSixteenthThreeStampPreview(stamp);
    button.appendChild(svg);

    return button;
  },

  createSixteenthThreeStampPreview(stamp: SixteenthThreeStamp) {
    // Three-sixteenth stamps are visually taller than wide.
    // Use a 3:4 SVG viewBox to match the toolbar button aspect ratio.
    const svg = defaultSixteenthThreeStampRenderer.renderToSVG(stamp as any, 75, 100);
    svg.setAttribute('width', '40');
    svg.setAttribute('height', '40');
    return svg;
  },

  bindEvents() {
    const container = document.getElementById('sixteenth-stamps-three-toolbar-container');
    if (!container) {return;}

    container.addEventListener('click', (e) => {
      const button = (e.target as Element | null)?.closest<HTMLElement>('.sixteenth-stamp-button');
      if (button) {
        const sixteenthThreeStampId = parseInt(button.dataset['sixteenthThreeStampId'] || '', 10);
        if (!Number.isNaN(sixteenthThreeStampId)) {
          this.selectSixteenthThreeStamp(sixteenthThreeStampId);
        }
      }
    });

    this.updateSixteenthThreeStampColors = (color: string) => {
      if (!color || !container) {return;}

      const createLighterColor = (hexColor: string, percentage = 50) => {
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        const newR = Math.min(255, Math.floor(r + (255 - r) * (percentage / 100)));
        const newG = Math.min(255, Math.floor(g + (255 - g) * (percentage / 100)));
        const newB = Math.min(255, Math.floor(b + (255 - b) * (percentage / 100)));
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
      };

      const createDarkerColor = (hexColor: string, percentage = 20) => {
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        const newR = Math.max(0, Math.floor(r * (1 - percentage / 100)));
        const newG = Math.max(0, Math.floor(g * (1 - percentage / 100)));
        const newB = Math.max(0, Math.floor(b * (1 - percentage / 100)));
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
      };

      const palette = store.state.colorPalette[color] || { primary: color, light: color } as StampButtonColors;
      const lightColor = createLighterColor(palette.light, 60);
      const primaryColor = palette.primary;
      const hoverColor = createDarkerColor(primaryColor, 20);

      container.style.setProperty('--c-accent', primaryColor);
      container.style.setProperty('--c-accent-light', lightColor);
      container.style.setProperty('--c-accent-hover', hoverColor);
    };

    store.on('noteChanged', ({ newNote }: { newNote?: { color?: string } } = {}) => {
      if (newNote?.color) {
        this.updateSixteenthThreeStampColors(newNote.color);
      }
    });

    const currentNote = store.state.selectedNote;
    if (currentNote?.color) {
      this.updateSixteenthThreeStampColors(currentNote.color);
    }

    store.on('toolChanged', ({ newTool }: { newTool?: string } = {}) => {
      if (newTool && newTool !== 'sixteenthThreeStamp') {
        this.clearSelection();
      }
    });

    store.on('sixteenthStampToolSelected', () => {
      this.clearSelection();
    });

    store.on('tripletStampToolSelected', () => {
      this.clearSelection();
    });
  },

  setInitialSelection(sixteenthThreeStampId: number) {
    this.selectedSixteenthThreeStampId = sixteenthThreeStampId;
    const container = document.getElementById('sixteenth-stamps-three-toolbar-container');
    if (container) {
      container.querySelectorAll('.sixteenth-stamp-button').forEach(btn => {
        const button = btn as HTMLElement;
        button.classList.toggle('active', parseInt(button.dataset['sixteenthThreeStampId'] || '', 10) === sixteenthThreeStampId);
      });
    }
  },

  selectSixteenthThreeStamp(sixteenthThreeStampId: number) {
    this.selectedSixteenthThreeStampId = sixteenthThreeStampId;
    const container = document.getElementById('sixteenth-stamps-three-toolbar-container');
    if (container) {
      container.querySelectorAll('.sixteenth-stamp-button').forEach(btn => {
        const button = btn as HTMLElement;
        button.classList.toggle('active', parseInt(button.dataset['sixteenthThreeStampId'] || '', 10) === sixteenthThreeStampId);
      });
    }
    store.setSelectedTool('sixteenthThreeStamp');
    store.emit('sixteenthThreeStampSelected', sixteenthThreeStampId);
    store.emit('sixteenthThreeStampToolSelected');
  },

  clearSelection() {
    const container = document.getElementById('sixteenth-stamps-three-toolbar-container');
    if (container) {
      container.querySelectorAll('.sixteenth-stamp-button').forEach(btn => {
        btn.classList.remove('active');
      });
    }
  },

  getSelectedSixteenthThreeStamp() {
    const stamp = SIXTEENTH_THREE_STAMPS.find(s => s.id === this.selectedSixteenthThreeStampId);
    return stamp;
  }
};

export default SixteenthThreeStampsToolbar;
