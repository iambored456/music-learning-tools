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

const TripletStampsToolbar = {
  selectedTripletStampId: 1 as number,

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

    // Create main container
    const mainContainer = document.createElement('div');
    mainContainer.className = 'triplet-stamps-grid';

    // Create eighth triplets row
    if (eighthTriplets.length > 0) {
      const eighthRow = document.createElement('div');
      eighthRow.className = 'triplet-stamps-row triplet-stamps-eighth-row';

      eighthTriplets.forEach(triplet => {
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

      quarterTriplets.slice(0, 3).forEach(triplet => {
        const button = this.createTripletStampButton(triplet);
        button.classList.add('triplet-stamp-button-wide');
        quarterRow1.appendChild(button);
      });

      mainContainer.appendChild(quarterRow1);

      // Second row - remaining quarter triplets
      if (quarterTriplets.length > 3) {
        const quarterRow2 = document.createElement('div');
        quarterRow2.className = 'triplet-stamps-row triplet-stamps-quarter-row';

        quarterTriplets.slice(3).forEach(triplet => {
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

    store.on('sixteenthStampToolSelected', () => {
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
