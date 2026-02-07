<script lang="ts">
  /**
   * SingingCanvas Component
   *
   * Wraps the shared PitchGrid component for singing/highway visualization modes.
   */

  import { onDestroy, untrack } from 'svelte';
  import {
    PitchGrid,
    calculateViewportWindow,
    createTimeCoordinates,
    drawUserPitchTrace,
  } from '@mlt/ui-components/canvas';
  import type {
    CurrentPitch,
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
  import { exerciseState } from '../stores/exerciseState.svelte.js';
  import { ultrastarState } from '../stores/ultrastarState.svelte.js';
  import { LyricsDisplay } from './karaoke/index.js';
  import YAxisDragZones from './YAxisDragZones.svelte';
  import JudgementLineDragHandle from './JudgementLineDragHandle.svelte';

  // Container element for measuring size
  let container: HTMLDivElement | undefined = $state(undefined);
  let containerWidth = $state(800);
  let containerHeight = $state(400);

  // Trail canvas overlay
  let trailCanvas: HTMLCanvasElement | undefined = $state(undefined);
  let trailCtx: CanvasRenderingContext2D | null = $state(null);
  let trailAnimationId: number | null = $state(null);

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

  // Check if ultrastar mode is active (for lyrics display)
  const isUltrastarActive = $derived(ultrastarState.state.isActive && ultrastarState.state.isPlaying);

  // Calculate beat interval based on exercise tempo
  // 1 beat = 2 microbeats, beatIntervalMs = 60000 / tempo
  const beatIntervalMs = $derived<number>(
    (60 / exerciseState.state.config.tempo) * 1000 // ms per beat (quarter note)
  );
  const gridBeatIntervalMs = $derived<number>(
    ultrastarState.state.isActive ? 0 : beatIntervalMs
  );

  // Lead-in time offset for beat line alignment (matches exerciseState)
  const beatTimeOffsetMs = $derived(exerciseState.state.config.leadInMs ?? 0);

  const legendHighlight = $derived<LegendHighlightConfig | undefined>((() => {
    if (!appState.state.pitchHighlightEnabled) {
      return undefined;
    }

    const stable = pitchState.state.stablePitch;
    if (stable.highlights.length === 0) {
      return undefined;
    }

    return stable.highlights.map((highlight) => ({
      pitchClass: highlight.pitchClass,
      midi: highlight.midi,
      opacity: highlight.opacity,
      color: '#ffff00',
    }));
  })());

  // Build MIDI → hex color lookup from fullRowData
  const midiToHex = $derived<Map<number, string>>(
    new Map(fullRowData.map((row) => [row.midi, row.hex]))
  );

  // Convert local target notes to shared format
  function convertTargetNotes(): SharedTargetNote[] {
    const degrees = appState.state.noteScaleDegrees;
    const showDegrees = appState.state.useDegrees && degrees.length > 0;
    const usePitchColors = appState.state.noteColorMode === 'pitchColor';
    return highwayState.state.targetNotes.map((n, i) => ({
      id: `target-${i}`,
      targetKind: n.targetKind,
      midi: n.midi,
      minMidi: n.minMidi,
      maxMidi: n.maxMidi,
      slideDirection: n.slideDirection,
      startTimeMs: n.startTimeMs,
      durationMs: n.durationMs,
      label: n.label ?? ((showDegrees && typeof n.midi === 'number') ? degrees[i] : n.lyric),
      color: usePitchColors && typeof n.midi === 'number' ? midiToHex.get(n.midi) : undefined,
    }));
  }

  // Cache target notes separately — only recalculates when targetNotes array or degree settings change
  // (NOT on every mic frame or currentTimeMs update)
  const cachedTargetNotes = $derived.by<SharedTargetNote[]>(() => {
    // Track only array length (changes on song load), not deep properties like .hit
    void highwayState.state.targetNotes.length;
    void appState.state.noteScaleDegrees;
    void appState.state.useDegrees;
    void appState.state.noteColorMode;
    return untrack(() => convertTargetNotes());
  });

  // Separate userPitch derived — lightweight, doesn't trigger expensive config recalc
  const userPitch = $derived<CurrentPitch | null>(
    pitchState.state.currentPitch
      ? {
          frequency: pitchState.state.currentPitch.frequency,
          midi: pitchState.state.currentPitch.midi,
          clarity: pitchState.state.currentPitch.clarity,
          pitchClass: pitchState.state.currentPitch.pitchClass,
        }
      : null
  );

  // Get pitch trail configuration with tonic-relative colors
  const trailConfig = $derived<PitchTrailConfig>({
    timeWindowMs: Infinity,
    pixelsPerSecond: 200,
    circleRadius: 9.5,
    proximityThreshold: 35,
    maxConnections: 3,
    connectorLineWidth: 2.5,
    connectorColor: 'rgba(0,0,0,0.4)',
    useTonicRelativeColors: false,
    tonicPitchClass: getTonicPitchClass(appState.state.tonic),
    clarityThreshold: 0.5,
    maxOpacity: 0.9,
  });

  const labelConfig = $derived({
    mode: appState.state.lyricLabelMode,
    scale: appState.state.lyricLabelScale,
    fixedPx: appState.state.lyricLabelFixedPx,
  });

  // Build singing mode config (no userPitch — passed as separate prop)
  const singingConfig = $derived<SingingModeConfig | undefined>(
    mode === 'singing'
      ? {
          pitchHistory: [],
          targetNotes: [],
          pixelsPerSecond: 200,
          timeWindowMs: Infinity,
          trailConfig,
          labelConfig,
        }
      : undefined
  );

  // Build highway mode config (no userPitch, no convertTargetNotes — both moved out)
  const highwayConfig = $derived<HighwayModeConfig | undefined>(
    mode === 'highway'
      ? {
          pitchHistory: [],
          targetNotes: cachedTargetNotes,
          nowLineX: highwayState.state.nowLineX,
          pixelsPerSecond: highwayState.state.pixelsPerSecond,
          currentTimeMs: highwayState.state.currentTimeMs,
          timeWindowMs: highwayState.state.timeWindowMs,
          trailConfig,
          labelConfig,
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

    // Compute tonic pitch class dynamically for multi-tonic segments
    const currentTonicPc = appState.state.tonicSegments.length > 0
      ? getTonicPitchClass(appState.getTonicAt(
          mode === 'highway' && highwayConfig ? highwayConfig.currentTimeMs : 0
        ))
      : trailConfig.tonicPitchClass;

    const userPitchConfig: UserPitchRenderConfig = {
      cellHeight: viewportWindow.cellHeight,
      viewportWidth: gridWidth,
      nowLineX,
      pixelsPerSecond: activeConfig.pixelsPerSecond ?? 200,
      timeWindowMs: activeConfig.timeWindowMs ?? 4000,
      colorMode: 'color',
      trailConfig: currentTonicPc !== trailConfig.tonicPitchClass
        ? { ...trailConfig, tonicPitchClass: currentTonicPc }
        : trailConfig,
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

  // Keep highway state aware of actual viewport width
  $effect(() => {
    highwayState.setViewportWidth(gridWidth);
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
  {#if showLegends}
    <div class="legend-overlay legend-overlay--left" style:width="{legendCanvasWidth}px" style:height="{containerHeight}px">
      <YAxisDragZones gridHeight={containerHeight} cellHeight={viewportWindow.cellHeight} />
    </div>
  {/if}

  {#if showLegends && showRightLegend}
    <div class="legend-overlay legend-overlay--right" style:width="{legendCanvasWidth}px" style:height="{containerHeight}px">
      <YAxisDragZones gridHeight={containerHeight} cellHeight={viewportWindow.cellHeight} />
    </div>
  {/if}

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
    {userPitch}
    legendHighlight={legendHighlight}
    beatIntervalMs={gridBeatIntervalMs}
    {beatTimeOffsetMs}
  />
  <canvas
    bind:this={trailCanvas}
    class="pitch-trail-canvas"
  ></canvas>

  {#if mode === 'highway'}
    <div class="judgement-line-overlay" style:left="{gridOffsetX}px" style:width="{gridWidth}px">
      <JudgementLineDragHandle canvasWidth={gridWidth} gridHeight={containerHeight} />
    </div>
  {/if}

  <!-- Karaoke lyrics display (only shown during Ultrastar playback) -->
  {#if isUltrastarActive && mode === 'highway'}
    <LyricsDisplay />
  {/if}
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

  .legend-overlay {
    position: absolute;
    top: 0;
    z-index: 5;
  }

  .legend-overlay--left {
    left: 0;
  }

  .legend-overlay--right {
    right: 0;
  }

  .judgement-line-overlay {
    position: absolute;
    top: 0;
    height: 100%;
    z-index: 12;
    pointer-events: none;
  }

  .judgement-line-overlay > :global(*) {
    pointer-events: auto;
  }

  .pitch-trail-canvas {
    position: absolute;
    top: 0;
    pointer-events: none;
    z-index: 2;
  }
</style>
