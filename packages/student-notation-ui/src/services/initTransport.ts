/**
 * Transport Initialization
 *
 * Initializes the playback transport service using the @mlt/student-notation-engine
 * package's createTransportService() factory with app-specific configuration
 * including state callbacks, event handling, and visual/DOM update callbacks.
 */

import { createTransportService, type TransportServiceInstance } from '@mlt/student-notation-engine';
import store from '@state/initStore.ts';
import { getPlacedTonicSigns, getMacrobeatInfo } from '@state/selectors.ts';
import SynthEngine from './initAudio.ts';
import domCache from './domCache.ts';
import logger from '@utils/logger.ts';
import DrumPlayheadRenderer from '@components/canvas/drumGrid/drumPlayheadRenderer.js';
import { getLogicalCanvasWidth, getLogicalCanvasHeight } from '@utils/canvasDimensions.ts';
import { getTonicSpanColumnIndices } from '@utils/tonicColumnUtils.ts';
import { drawPulsingColumnHighlight } from '@utils/pulsingPlayhead.ts';
import { getSixteenthStampPlaybackData } from '@/rhythm/sixteenthStampPlacements.js';
import { getSixteenthStampScheduleEvents } from '@/rhythm/scheduleSixteenthStamps.js';
import { getTripletStampPlaybackData } from '@/rhythm/tripletStampPlacements.js';
import { getTripletStampScheduleEvents } from '@/rhythm/scheduleTripletStamps.js';
import { getColumnStartX, getColumnWidth, getCanvasWidth, getMacrobeatHighlightRectForCanvasColumn } from '@services/playheadModel.ts';
import { timeToCanvas } from '@services/columnMapService.ts';

logger.moduleLoaded('EngineTransport', 'general');

// Engine instance
let engineInstance: TransportServiceInstance | null = null;

const getPlayheadCanvas = () =>
  domCache.get<HTMLCanvasElement>('playheadCanvas') ??
  (document.getElementById('playhead-canvas') as HTMLCanvasElement | null);

const getDrumPlayheadCanvas = () =>
  domCache.get<HTMLCanvasElement>('drumPlayheadCanvas') ??
  (document.getElementById('drum-playhead-canvas') as HTMLCanvasElement | null);

const getBeatLineHighlight = () =>
  domCache.get<HTMLElement>('beatLineHighlight') ??
  document.getElementById('beat-line-highlight');

/**
 * Adapter that wraps the engine's transport service with the app's API
 */
const TransportService = {
  init() {
    logger.info('EngineTransport', 'Initializing with engine createTransportService()', null, 'transport');

    // Create the engine instance with dependency injection
    engineInstance = createTransportService({
      synthEngine: SynthEngine as any,

      // State callbacks - how to access app state
      stateCallbacks: {
        getState: () => ({
          tempo: store.state.tempo,
          columnWidths: store.state.columnWidths,
          hasAnacrusis: store.state.hasAnacrusis,
          macrobeatBoundaryStyles: store.state.macrobeatBoundaryStyles,
          modulationMarkers: store.state.modulationMarkers,
          isLooping: store.state.isLooping,
          isPaused: store.state.isPaused,
          cellWidth: store.state.cellWidth,
          placedNotes: store.state.placedNotes as any,
          timbres: store.state.timbres as any,
          fullRowData: store.state.fullRowData,
          playheadMode: store.state.playheadMode as any
        }),
        getStampPlaybackData: () => getSixteenthStampPlaybackData().map((stamp) => ({
          sixteenthStampId: String(stamp.sixteenthStampId),
          column: stamp.column,
          row: stamp.row,
          color: stamp.color,
          placement: stamp.placement
        })),
        getStampScheduleEvents: (stampId, placement) => {
          const resolvedStampId = typeof stampId === 'string' ? Number(stampId) : stampId;
          if (!Number.isFinite(resolvedStampId)) {
            return [];
          }
          return getSixteenthStampScheduleEvents(resolvedStampId, placement ?? null);
        },
        getTripletPlaybackData: () => getTripletStampPlaybackData().map((triplet) => ({
          tripletStampId: String(triplet.tripletStampId),
          startTimeIndex: triplet.startTimeIndex,
          row: triplet.row,
          color: triplet.color,
          placement: triplet.placement
        })),
        getTripletScheduleEvents: (tripletId, placement) => {
          const resolvedTripletId = typeof tripletId === 'string' ? Number(tripletId) : tripletId;
          if (!Number.isFinite(resolvedTripletId)) {
            return [];
          }
          return getTripletStampScheduleEvents(resolvedTripletId, placement ?? null);
        },
        timeToCanvas: (timeIndex, state) => timeToCanvas(timeIndex, state as any),
        getPlacedTonicSigns: () => getPlacedTonicSigns(store.state),
        getTonicSpanColumnIndices: (tonicSigns) =>
          getTonicSpanColumnIndices(tonicSigns as Parameters<typeof getTonicSpanColumnIndices>[0]),
        getMacrobeatInfo: (index) => getMacrobeatInfo(store.state, index),
        getColumnStartX: (columnIndex) => getColumnStartX(columnIndex),
        getColumnWidth: (columnIndex) => getColumnWidth(columnIndex),
        getCanvasWidth: () => getCanvasWidth(),
        getMacrobeatHighlightRect: (columnIndex) => getMacrobeatHighlightRectForCanvasColumn(columnIndex)
      },

      // Event callbacks - how to emit events and subscribe
      eventCallbacks: {
        on: (event, handler) => store.on(event as any, handler),
        emit: (event, data) => store.emit(event as any, data),
        setPlaybackState: (isPlaying, isPaused) => store.setPlaybackState(isPlaying, isPaused)
      },

      // Visual callbacks - all DOM updates go here
      visualCallbacks: {
        clearPlayheadCanvas: () => {
          const playheadCanvas = getPlayheadCanvas();
          if (!playheadCanvas) return;
          const ctx = playheadCanvas.getContext('2d');
          if (!ctx) return;
          const width = getLogicalCanvasWidth(playheadCanvas);
          const height = getLogicalCanvasHeight(playheadCanvas);
          ctx.clearRect(0, 0, width, height);
        },
        clearDrumPlayheadCanvas: () => {
          const drumPlayheadCanvas = getDrumPlayheadCanvas();
          if (!drumPlayheadCanvas) return;
          const ctx = drumPlayheadCanvas.getContext('2d');
          if (!ctx) return;
          const width = getLogicalCanvasWidth(drumPlayheadCanvas);
          const height = getLogicalCanvasHeight(drumPlayheadCanvas);
          ctx.clearRect(0, 0, width, height);
        },
        drawPlayheadLine: (x, canvasHeight) => {
          const playheadCanvas = getPlayheadCanvas();
          if (!playheadCanvas) return;
          const ctx = playheadCanvas.getContext('2d');
          if (!ctx) return;
          ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvasHeight);
          ctx.stroke();
        },
        drawPlayheadHighlight: (x, width, canvasHeight, timestamp) => {
          const playheadCanvas = getPlayheadCanvas();
          if (!playheadCanvas) return;
          const ctx = playheadCanvas.getContext('2d');
          if (!ctx) return;
          drawPulsingColumnHighlight(ctx, x, 0, width, canvasHeight, timestamp);
        },
        drawDrumPlayheadLine: (x, canvasHeight) => {
          const drumPlayheadCanvas = getDrumPlayheadCanvas();
          if (!drumPlayheadCanvas) return;
          DrumPlayheadRenderer.drawPlayheadLine(x);
        },
        drawDrumPlayheadHighlight: (x, width, canvasHeight, timestamp) => {
          const drumPlayheadCanvas = getDrumPlayheadCanvas();
          if (!drumPlayheadCanvas) return;
          DrumPlayheadRenderer.drawColumnHighlight(x, width, timestamp);
        },
        updateBeatLineHighlight: (x, width, visible) => {
          // Update beat line highlight (button row highlighting)
          const beatLineHighlight = getBeatLineHighlight();
          if (!beatLineHighlight) {return;}
          if (visible) {
            beatLineHighlight.style.left = `${x}px`;
            beatLineHighlight.style.width = `${width}px`;
            beatLineHighlight.style.display = 'block';
          } else {
            beatLineHighlight.style.display = 'none';
          }
        },
        triggerDrumNotePop: (columnIndex, drumTrack) => {
          DrumPlayheadRenderer.triggerNotePop(columnIndex, drumTrack);
        },
        triggerAdsrVisual: (noteId, phase, color, adsr) => {
          // Trigger ADSR visualization
          if (window.adsrComponent) {
            window.adsrComponent.triggerPlayheadVisual(noteId, phase, color, adsr);
          }
        },
        clearAdsrVisuals: () => {
          if (window.adsrComponent) {
            window.adsrComponent.clearAllPlayheadVisuals();
          }
        },
        getPlayheadCanvasWidth: () => {
          const canvas = getPlayheadCanvas();
          return canvas ? getLogicalCanvasWidth(canvas) : 0;
        },
        getPlayheadCanvasHeight: () => {
          const canvas = getPlayheadCanvas();
          return canvas ? getLogicalCanvasHeight(canvas) : 0;
        },
        getDrumCanvasHeight: () => {
          const canvas = getDrumPlayheadCanvas();
          return canvas ? getLogicalCanvasHeight(canvas) : 0;
        }
      },

      // Logger
      logger: {
        debug: (context, message, data) => {
          logger.debug(context, message, data, 'transport');
        },
        info: (context, message, data) => {
          logger.info(context, message, data, 'transport');
        },
        warn: (context, message, data) => {
          logger.warn(context, message, data, 'transport');
        }
      }
    });

    // Initialize the engine
    engineInstance.init();

    logger.info('EngineTransport', 'Initialization complete', null, 'transport');
  },

  handleStateChange() {
    if (!engineInstance) return;
    engineInstance.handleStateChange();
  },

  start() {
    if (!engineInstance) return;
    engineInstance.start();
  },

  resume() {
    if (!engineInstance) return;
    engineInstance.resume();
  },

  pause() {
    if (!engineInstance) return;
    engineInstance.pause();
  },

  stop() {
    if (!engineInstance) return;
    engineInstance.stop();
  },

  dispose() {
    if (!engineInstance) return;
    engineInstance.dispose();
    engineInstance = null;
  }
};

export default TransportService;
