<script lang="ts">
  /**
   * SingingCanvas Component
   *
   * Wraps the shared PitchGrid component for singing/highway visualization modes.
   */

  import { onDestroy } from 'svelte';
  import {
    PitchGrid,
    calculateViewportWindow,
    createTimeCoordinates,
    drawUserPitchTrace,
  } from '@mlt/ui-components/canvas';
  import type {
    LegendHighlightConfig,
    PitchGridMode,
    PitchGridViewport,
    SingingModeConfig,
    HighwayModeConfig,
    TargetNote as SharedTargetNote,
    PitchTrailConfig,
    UserPitchRenderConfig,
    ViewportWindow,
  } from '@mlt/ui-components/canvas';
  import { generateRowDataForMidiRange, getTonicPitchClass, type PitchRowData } from '@mlt/pitch-data';
  import { appState } from '../stores/appState.svelte.js';
  import { pitchState } from '../stores/pitchState.svelte.js';
  import { highwayState } from '../stores/highwayState.svelte.js';
  import { demoExerciseState } from '../stores/demoExerciseState.svelte.js';

  // Container element for measuring size
  let container: HTMLDivElement | undefined = $state(undefined);
  let containerWidth = $state(800);
  let containerHeight = $state(400);

  // Trail canvas overlay
  let trailCanvas: HTMLCanvasElement | undefined = $state(undefined);
  let trailCtx: CanvasRenderingContext2D | null = $state(null);
  let trailAnimationId: number | null = $state(null);

  let lastTrailLogAt = 0;
  let trailFrameSamples = 0;
  let trailFrameTimeTotal = 0;

  const cellWidth = 20;
  const showOctaveLabels = true;
  const showFrequencyLabels = false;
  const showRightLegend = $derived(containerWidth >= 720);

  // Keep legend sizing in sync with PitchGrid
  const LEGEND_COLUMN_WIDTH_UNITS = 3;
  const legendColumnWidth = $derived(cellWidth * LEGEND_COLUMN_WIDTH_UNITS);
  const legendCanvasWidth = $derived(legendColumnWidth * 2);
  const showLegends = $derived(showOctaveLabels || showFrequencyLabels);
  const legendTotalWidth = $derived(showLegends ? legendCanvasWidth * (showRightLegend ? 2 : 1) : 0);
  const gridWidth = $derived(Math.max(0, containerWidth - legendTotalWidth));
  const gridOffsetX = $derived(showLegends ? legendCanvasWidth : 0);
  const getDebugTrailFlag = (): boolean => {
    try {
      const win = globalThis as typeof globalThis & { __ST_DEBUG_TRAIL?: boolean };
      return Boolean(win.__ST_DEBUG_TRAIL);
    } catch {
      return false;
    }
  };

  // Generate row data for the pitch grid based on y-axis range
  // Uses the shared pitch data package which includes proper colors, frequencies, and enharmonic spellings
  const fullRowData = $derived<PitchRowData[]>(
    generateRowDataForMidiRange(appState.state.yAxisRange.minMidi, appState.state.yAxisRange.maxMidi)
  );

  // Calculate optimal viewport window that fills container height
  const viewportWindow = $derived<ViewportWindow>(
    calculateViewportWindow({
      containerHeight,
      fullRowData,
      preferredCellHeight: 40,
      minCellHeight: 20,
    })
  );

  // Derive the PitchGrid mode from app state
  const mode = $derived<PitchGridMode>(
    appState.state.visualizationMode === 'highway' ? 'highway' : 'singing'
  );

  // Calculate beat interval based on exercise tempo
  // 1 beat = 2 microbeats, beatIntervalMs = 60000 / tempo
  const beatIntervalMs = $derived<number>(
    (60 / demoExerciseState.state.config.tempo) * 1000 // ms per beat (quarter note)
  );

  // Lead-in time offset for beat line alignment (matches demoExerciseState)
  const beatTimeOffsetMs = 2000;

  const legendHighlight = $derived<LegendHighlightConfig | undefined>((() => {
    if (!appState.state.pitchHighlightEnabled) {
      return undefined;
    }

    const stable = pitchState.state.stablePitch;
    if (stable.pitchClass === null || stable.opacity <= 0.01) {
      return undefined;
    }

    return {
      pitchClass: stable.pitchClass,
      opacity: stable.opacity,
      color: '#ffff00',
    };
  })());

  // Convert local target notes to shared format
  function convertTargetNotes(): SharedTargetNote[] {
    return highwayState.state.targetNotes.map((n, i) => ({
      id: `target-${i}`,
      midi: n.midi,
      startTimeMs: n.startTimeMs,
      durationMs: n.durationMs,
      label: n.lyric, // Pass emoji as label
    }));
  }

  // Get pitch trail configuration with tonic-relative colors
  const trailConfig = $derived<PitchTrailConfig>({
    timeWindowMs: 4000,
    pixelsPerSecond: 200,
    circleRadius: 9.5,
    proximityThreshold: 35,
    maxConnections: 3,
    connectorLineWidth: 2.5,
    connectorColor: 'rgba(0,0,0,0.4)',
    useTonicRelativeColors: true,
    tonicPitchClass: getTonicPitchClass(appState.state.tonic),
    clarityThreshold: 0.5,
    maxOpacity: 0.9,
  });

  // Build singing mode config
  const singingConfig = $derived<SingingModeConfig | undefined>(
    mode === 'singing'
      ? {
          userPitch: pitchState.state.currentPitch
            ? {
                frequency: pitchState.state.currentPitch.frequency,
                midi: pitchState.state.currentPitch.midi,
                clarity: pitchState.state.currentPitch.clarity,
                pitchClass: pitchState.state.currentPitch.pitchClass,
              }
            : null,
          pitchHistory: [],
          targetNotes: [],
          pixelsPerSecond: 200,
          timeWindowMs: 4000,
          trailConfig,
        }
      : undefined
  );

  // Build highway mode config
  const highwayConfig = $derived<HighwayModeConfig | undefined>(
    mode === 'highway'
      ? {
          userPitch: pitchState.state.currentPitch
            ? {
                frequency: pitchState.state.currentPitch.frequency,
                midi: pitchState.state.currentPitch.midi,
                clarity: pitchState.state.currentPitch.clarity,
                pitchClass: pitchState.state.currentPitch.pitchClass,
              }
            : null,
          pitchHistory: [],
          targetNotes: convertTargetNotes(),
          nowLineX: highwayState.state.nowLineX,
          pixelsPerSecond: highwayState.state.pixelsPerSecond,
          currentTimeMs: highwayState.state.currentTimeMs,
          timeWindowMs: highwayState.state.timeWindowMs,
          trailConfig,
        }
      : undefined
  );

  // Viewport configuration using calculated window
  const viewport = $derived<PitchGridViewport>({
    startRow: viewportWindow.startRow,
    endRow: viewportWindow.endRow,
    zoomLevel: 1.0,
    containerWidth,
    containerHeight,
  });

  function setupTrailCanvas(): void {
    if (!trailCanvas) return;

    const dpr = window.devicePixelRatio || 1;
    trailCanvas.width = gridWidth * dpr;
    trailCanvas.height = containerHeight * dpr;
    trailCanvas.style.width = `${gridWidth}px`;
    trailCanvas.style.height = `${containerHeight}px`;
    trailCanvas.style.left = `${gridOffsetX}px`;

    const ctx = trailCanvas.getContext('2d');
    if (!ctx) {
      trailCtx = null;
      return;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    trailCtx = ctx;
  }

  function renderTrail(): void {
    if (!trailCtx || gridWidth <= 0) return;

    trailCtx.clearRect(0, 0, gridWidth, containerHeight);

    const trailHistory = pitchState.state.history;
    if (trailHistory.length === 0) return;

    // Support both stationary and highway modes
    const activeConfig = mode === 'singing' ? singingConfig : highwayConfig;
    if (!activeConfig) return;

    const debugTrail = getDebugTrailFlag();
    const frameStart = debugTrail ? performance.now() : 0;

    // Use appropriate nowLineX based on mode
    const nowLineX = mode === 'highway' && highwayConfig
      ? highwayConfig.nowLineX
      : 100;

    const coords = createTimeCoordinates({
      cellWidth,
      cellHeight: viewportWindow.cellHeight,
      viewport,
      pixelsPerSecond: activeConfig.pixelsPerSecond ?? 200,
      nowLineX,
      currentTimeMs: mode === 'highway' && highwayConfig ? highwayConfig.currentTimeMs : 0,
    });

    const userPitchConfig: UserPitchRenderConfig = {
      cellHeight: viewportWindow.cellHeight,
      viewportWidth: gridWidth,
      nowLineX,
      pixelsPerSecond: activeConfig.pixelsPerSecond ?? 200,
      timeWindowMs: activeConfig.timeWindowMs ?? 4000,
      colorMode: 'color',
      trailConfig,
    };

    const currentTime = performance.now();

    drawUserPitchTrace(
      trailCtx,
      coords,
      trailHistory,
      currentTime,
      userPitchConfig,
      fullRowData
    );

    if (debugTrail) {
      const now = performance.now();
      trailFrameSamples += 1;
      trailFrameTimeTotal += (now - frameStart);
      if (now - lastTrailLogAt >= 1000) {
        const avgMs = trailFrameSamples > 0 ? (trailFrameTimeTotal / trailFrameSamples) : 0;
        console.log(
          `[SingingTrail] points=${trailHistory.length} avgMs=${avgMs.toFixed(2)} gridWidth=${gridWidth}`
        );
        lastTrailLogAt = now;
        trailFrameSamples = 0;
        trailFrameTimeTotal = 0;
      }
    }
  }

  function startTrailLoop(): void {
    if (trailAnimationId) return;

    const loop = () => {
      renderTrail();
      trailAnimationId = requestAnimationFrame(loop);
    };

    trailAnimationId = requestAnimationFrame(loop);
  }

  function stopTrailLoop(): void {
    if (trailAnimationId) {
      cancelAnimationFrame(trailAnimationId);
      trailAnimationId = null;
    }
    if (trailCtx && gridWidth > 0) {
      trailCtx.clearRect(0, 0, gridWidth, containerHeight);
    }
  }

  // Handle container resize
  $effect(() => {
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerWidth = entry.contentRect.width;
        containerHeight = entry.contentRect.height;
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  });

  $effect(() => {
    void gridWidth;
    void containerHeight;
    void gridOffsetX;
    void trailCanvas;
    setupTrailCanvas();
  });

  $effect(() => {
    void mode;
    void trailCtx;
    // Run trail loop for both stationary and highway modes
    if (mode === 'singing' || mode === 'highway') {
      startTrailLoop();
    } else {
      stopTrailLoop();
    }
  });

  onDestroy(() => {
    stopTrailLoop();
  });
</script>

<div class="singing-canvas-container" bind:this={container}>
  <PitchGrid
    {mode}
    {fullRowData}
    {viewport}
    cellWidth={cellWidth}
    cellHeight={viewportWindow.cellHeight}
    colorMode="color"
    {showOctaveLabels}
    {showFrequencyLabels}
    {showRightLegend}
    {singingConfig}
    {highwayConfig}
    legendHighlight={legendHighlight}
    {beatIntervalMs}
    {beatTimeOffsetMs}
  />
  <canvas
    bind:this={trailCanvas}
    class="pitch-trail-canvas"
  ></canvas>
</div>

<style>
  .singing-canvas-container {
    flex: 1;
    width: 100%;
    min-height: 300px;
    position: relative;
    background-color: var(--color-bg-light);
    /* Subtle white overlay to make grid bounds more visible */
    background-image: linear-gradient(rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.02));
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .pitch-trail-canvas {
    position: absolute;
    top: 0;
    pointer-events: none;
    z-index: 2;
  }
</style>
