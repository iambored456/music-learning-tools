// js/components/Rhythm/stampToolbars/tripletStampsToolbar.js
import { TRIPLET_STAMPS } from '@/rhythm/tripletStamps.ts';
import { createTripletPreview } from '@components/rhythm/glyphs/tripletGlyphs.ts';
import store from '@state/initStore.ts';
import logger from '@utils/logger.ts';

interface TripletStamp {
  id: number;
  span: string;
  hits: number[];
  label?: string;
}

interface TripletStampButtonColors {
  primary: string;
  light: string;
  hover: string;
}

const TripletStampsToolbar = {
  selectedTripletStampId: 1 as number,
  updateTripletStampColors: (_color: string) => {},

  init() {
    this.render();
    this.bindEvents();
    logger.info('TripletStampsToolbar', 'Triplet stamps toolbar initialized', null, 'triplets');
  },

  render() {
    const container = document.getElementById('triplet-stamps-toolbar-container');
    if (!container) {
      logger.warn('TripletStampsToolbar', 'Container not found', null, 'triplets');
      return;
    }

    container.innerHTML = '';

    // Separate eighth and quarter triplets
    const eighthTriplets = TRIPLET_STAMPS.filter(t => t.span === 'eighth');
    const quarterTriplets = TRIPLET_STAMPS.filter(t => t.span === 'quarter');
    const firstRowEighthTriplets = [...eighthTriplets].reverse();

    // Create main container
    const mainContainer = document.createElement('div');
    mainContainer.className = 'triplet-stamps-grid';
    const renderedRows = Number(eighthTriplets.length > 0) + Number(quarterTriplets.length > 0) + Number(quarterTriplets.length > 3);
    mainContainer.style.gridTemplateRows = `repeat(${Math.max(1, renderedRows)}, minmax(0, 1fr))`;

    // Create eighth triplets row
    if (eighthTriplets.length > 0) {
      const eighthRow = document.createElement('div');
      eighthRow.className = 'triplet-stamps-row triplet-stamps-eighth-row';
      eighthRow.style.gridTemplateColumns = `repeat(${firstRowEighthTriplets.length}, minmax(0, 1fr))`;

      firstRowEighthTriplets.forEach(triplet => {
        const button = this.createTripletStampButton(triplet);
        eighthRow.appendChild(button);
      });

      mainContainer.appendChild(eighthRow);
    }

    // Create quarter triplets rows (split into two rows)
    if (quarterTriplets.length > 0) {
      // First row - first 3 quarter triplets
      const quarterRow1 = document.createElement('div');
      quarterRow1.className = 'triplet-stamps-row triplet-stamps-quarter-row';
      const quarterRow1Stamps = quarterTriplets.slice(0, 3);
      quarterRow1.style.gridTemplateColumns = `repeat(${quarterRow1Stamps.length}, minmax(0, 1fr))`;

      quarterRow1Stamps.forEach(triplet => {
        const button = this.createTripletStampButton(triplet);
        button.classList.add('triplet-stamp-button-wide');
        quarterRow1.appendChild(button);
      });

      mainContainer.appendChild(quarterRow1);

      // Second row - remaining quarter triplets
      if (quarterTriplets.length > 3) {
        const quarterRow2 = document.createElement('div');
        quarterRow2.className = 'triplet-stamps-row triplet-stamps-quarter-row';
        const quarterRow2Stamps = quarterTriplets.slice(3);
        const quarterRow2OrderedStamps = quarterRow2Stamps.length > 1
          ? [quarterRow2Stamps[quarterRow2Stamps.length - 1]!, ...quarterRow2Stamps.slice(0, -1)]
          : quarterRow2Stamps;
        quarterRow2.style.gridTemplateColumns = `repeat(${quarterRow2OrderedStamps.length}, minmax(0, 1fr))`;

        quarterRow2OrderedStamps.forEach(triplet => {
          const button = this.createTripletStampButton(triplet);
          button.classList.add('triplet-stamp-button-wide');
          quarterRow2.appendChild(button);
        });

        mainContainer.appendChild(quarterRow2);
      }
    }

    container.appendChild(mainContainer);

    this.setInitialSelection(this.selectedTripletStampId);
  },

  createTripletStampButton(triplet: TripletStamp) {
    const button = document.createElement('button');
    button.className = 'triplet-stamp-button';
    button.dataset['tripletStampId'] = `${triplet.id}`;
    button.setAttribute('title', triplet.label || `Triplet ${triplet.id}`);

    // Use actual SVG renderer with appropriate sizing
    // Quarter triplets need wider SVGs to fill their wider buttons
    const isQuarterTriplet = triplet.span === 'quarter';
    const svgWidth = isQuarterTriplet ? 80 : 40;
    const svgHeight = 40;

    const svg = createTripletPreview(triplet as any, svgWidth, svgHeight);
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.maxWidth = '100%';
    svg.style.maxHeight = '100%';
    button.appendChild(svg);

    return button;
  },

  bindEvents() {
    const container = document.getElementById('triplet-stamps-toolbar-container');
    if (!container) {return;}

    container.addEventListener('click', (e) => {
      const button = (e.target as Element | null)?.closest<HTMLElement>('.triplet-stamp-button');
      if (!button) {return;}
      const tripletStampId = parseInt(button.dataset['tripletStampId'] || '', 10);
      if (!Number.isNaN(tripletStampId)) {
        this.selectTripletStamp(tripletStampId);
      }
    });

    store.on('toolChanged', ({ newTool }: { newTool?: string } = {}) => {
      if (newTool && newTool !== 'tripletStamp') {
        this.clearSelection();
      }
    });

    this.updateTripletStampColors = (color: string) => {
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

      const palette = store.state.colorPalette[color] || { primary: color, light: color } as TripletStampButtonColors;
      const lightColor = createLighterColor(palette.light, 60);
      const primaryColor = palette.primary;
      const hoverColor = createDarkerColor(primaryColor, 20);

      container.style.setProperty('--c-accent', primaryColor);
      container.style.setProperty('--c-accent-light', lightColor);
      container.style.setProperty('--c-accent-hover', hoverColor);
    };

    store.on('noteChanged', ({ newNote }: { newNote?: { color?: string } } = {}) => {
      if (newNote?.color) {
        this.updateTripletStampColors(newNote.color);
      }
    });

    const currentNote = store.state.selectedNote;
    if (currentNote?.color) {
      this.updateTripletStampColors(currentNote.color);
    }

    store.on('sixteenthStampToolSelected', () => {
      this.clearSelection();
    });

    store.on('sixteenthThreeStampToolSelected', () => {
      this.clearSelection();
    });
  },

  setInitialSelection(tripletStampId: number) {
    this.selectedTripletStampId = tripletStampId;
    const container = document.getElementById('triplet-stamps-toolbar-container');
    if (container) {
      container.querySelectorAll('.triplet-stamp-button').forEach(btn => {
        const button = btn as HTMLElement;
        button.classList.toggle('active', parseInt(button.dataset['tripletStampId'] || '', 10) === tripletStampId);
      });
    }
  },

  selectTripletStamp(tripletStampId: number) {
    this.selectedTripletStampId = tripletStampId;
    const container = document.getElementById('triplet-stamps-toolbar-container');
    if (container) {
      container.querySelectorAll('.triplet-stamp-button').forEach(btn => {
        const button = btn as HTMLElement;
        button.classList.toggle('active', parseInt(button.dataset['tripletStampId'] || '', 10) === tripletStampId);
      });
    }
    store.setSelectedTool('tripletStamp');
    store.emit('tripletStampSelected', tripletStampId);
    store.emit('tripletStampToolSelected');
  },

  clearSelection() {
    const container = document.getElementById('triplet-stamps-toolbar-container');
    if (container) {
      container.querySelectorAll('.triplet-stamp-button').forEach(btn => {
        btn.classList.remove('active');
      });
    }
  },

  getSelectedTripletStamp() {
    const triplet = TRIPLET_STAMPS.find(t => t.id === this.selectedTripletStampId);
    return triplet;
  }
};

export default TripletStampsToolbar;
