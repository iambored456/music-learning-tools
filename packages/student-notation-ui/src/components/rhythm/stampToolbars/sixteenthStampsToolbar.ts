// js/components/Rhythm/stampToolbars/sixteenthStampsToolbar.js
import { SIXTEENTH_STAMPS } from '@/rhythm/sixteenthStamps.ts';
import { defaultSixteenthStampRenderer } from '@utils/sixteenthStampRenderer.ts';
import store from '@state/initStore.ts';
import logger from '@utils/logger.ts';

interface SixteenthStamp { id: number; label: string; [key: string]: unknown }

interface SixteenthStampButtonColors {
  primary: string;
  light: string;
  hover: string;
}

const SixteenthStampsToolbar = {
  selectedSixteenthStampId: 1 as number,
  updateSixteenthStampColors: (_color: string) => {},

  init() {
    this.render();
    this.bindEvents();
    logger.info('SixteenthStampsToolbar', 'Sixteenth stamps toolbar initialized', null, 'stamps');
  },

  render() {
    const container = document.getElementById('sixteenth-stamps-toolbar-container');
    if (!container) {
      logger.warn('SixteenthStampsToolbar', 'Container not found', null, 'stamps');
      return;
    }

    container.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'sixteenth-stamps-grid';

    const stampRows = [
      [1, 2, 3, 4],
      [5, 8, 14, 6, 9, 7],
      [10, 13, 12, 11, 15]
    ];

    stampRows.forEach((rowStampIds, rowIndex) => {
      const row = document.createElement('div');
      row.className = `sixteenth-stamps-row sixteenth-stamps-row-${rowIndex + 1}`;

      rowStampIds.forEach(stampId => {
        const stamp = SIXTEENTH_STAMPS.find(s => s.id === stampId) as SixteenthStamp | undefined;
        if (stamp) {
          const button = this.createSixteenthStampButton(stamp);
          row.appendChild(button);
        }
      });

      grid.appendChild(row);
    });

    container.appendChild(grid);
    this.setInitialSelection(this.selectedSixteenthStampId);
  },

  createSixteenthStampButton(stamp: SixteenthStamp) {
    const button = document.createElement('button');
    button.className = 'sixteenth-stamp-button';
    button.dataset['sixteenthStampId'] = `${stamp.id}`;
    button.setAttribute('title', `${stamp.id}: ${stamp.label}`);

    const svg = this.createSixteenthStampPreview(stamp);
    button.appendChild(svg);

    return button;
  },

  createSixteenthStampPreview(stamp: SixteenthStamp) {
    const svg = defaultSixteenthStampRenderer.renderToSVG(stamp as any, 100, 100);
    svg.setAttribute('width', '40');
    svg.setAttribute('height', '40');
    return svg;
  },

  bindEvents() {
    const container = document.getElementById('sixteenth-stamps-toolbar-container');
    if (!container) {return;}

    container.addEventListener('click', (e) => {
      const button = (e.target as Element | null)?.closest<HTMLElement>('.sixteenth-stamp-button');
      if (button) {
        const sixteenthStampId = parseInt(button.dataset['sixteenthStampId'] || '', 10);
        if (!Number.isNaN(sixteenthStampId)) {
          this.selectSixteenthStamp(sixteenthStampId);
        }
      }
    });

    this.updateSixteenthStampColors = (color: string) => {
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

      const palette = store.state.colorPalette[color] || { primary: color, light: color } as SixteenthStampButtonColors;
      const lightColor = createLighterColor(palette.light, 60);
      const primaryColor = palette.primary;
      const hoverColor = createDarkerColor(primaryColor, 20);

      container.style.setProperty('--c-accent', primaryColor);
      container.style.setProperty('--c-accent-light', lightColor);
      container.style.setProperty('--c-accent-hover', hoverColor);
    };

    store.on('noteChanged', ({ newNote }: { newNote?: { color?: string } } = {}) => {
      if (newNote?.color) {
        this.updateSixteenthStampColors(newNote.color);
      }
    });

    const currentNote = store.state.selectedNote;
    if (currentNote?.color) {
      this.updateSixteenthStampColors(currentNote.color);
    }

    store.on('toolChanged', ({ newTool }: { newTool?: string } = {}) => {
      if (newTool && newTool !== 'sixteenthStamp') {
        this.clearSelection();
      }
    });

    store.on('tripletStampToolSelected', () => {
      this.clearSelection();
    });
  },

  setInitialSelection(sixteenthStampId: number) {
    this.selectedSixteenthStampId = sixteenthStampId;
    const container = document.getElementById('sixteenth-stamps-toolbar-container');
    if (container) {
      container.querySelectorAll('.sixteenth-stamp-button').forEach(btn => {
        const button = btn as HTMLElement;
        button.classList.toggle('active', parseInt(button.dataset['sixteenthStampId'] || '', 10) === sixteenthStampId);
      });
    }
  },

  selectSixteenthStamp(sixteenthStampId: number) {
    this.selectedSixteenthStampId = sixteenthStampId;
    const container = document.getElementById('sixteenth-stamps-toolbar-container');
    if (container) {
      container.querySelectorAll('.sixteenth-stamp-button').forEach(btn => {
        const button = btn as HTMLElement;
        button.classList.toggle('active', parseInt(button.dataset['sixteenthStampId'] || '', 10) === sixteenthStampId);
      });
    }
    store.setSelectedTool('sixteenthStamp');
    store.emit('sixteenthStampSelected', sixteenthStampId);
    store.emit('sixteenthStampToolSelected');
  },

  clearSelection() {
    const container = document.getElementById('sixteenth-stamps-toolbar-container');
    if (container) {
      container.querySelectorAll('.sixteenth-stamp-button').forEach(btn => {
        btn.classList.remove('active');
      });
    }
  },

  getSelectedSixteenthStamp() {
    const stamp = SIXTEENTH_STAMPS.find(s => s.id === this.selectedSixteenthStampId);
    return stamp;
  }
};

export default SixteenthStampsToolbar;
