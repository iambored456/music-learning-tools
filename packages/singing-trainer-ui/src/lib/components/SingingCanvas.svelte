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
    drawUserPitchIndicator,
    drawUserPitchTrace,
  } from '@mlt/ui-components/canvas';
  import type {
    CoordinateUtils,
    CurrentPitch,
    LegendHighlightConfig,
    PitchHistoryPoint,
    PitchRowHighlightConfig,
    PitchRowHighlightEntry,
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
  import { overdubState } from '../stores/overdubState.svelte.js';
  import { overdubExerciseState } from '../stores/overdubExerciseState.svelte.js';
  import { MODE_SCALE_DEGREES, MODE_DEGREE_LABELS } from '../constants/modes.js';
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
  const isExerciseActive = $derived(exerciseState.state.isActive || exerciseState.state.isPlaying);
  const isOverdubExerciseActive = $derived(
    overdubExerciseState.state.isActive || overdubExerciseState.state.isPlaying
  );

  const overdubPhrase = $derived(overdubState.state.engine.project.phrase);
  const overdubBeatIntervalMs = $derived<number>(
    (60 / Math.max(20, overdubPhrase.tempoBpm)) * 1000 * (4 / Math.max(1, overdubPhrase.timeSignatureDenominator))
  );
  const overdubMeasureIntervalMs = $derived<number>(
    overdubBeatIntervalMs * Math.max(1, overdubPhrase.timeSignatureNumerator)
  );

  // Base exercise timing (non-overdub lessons)
  const exerciseBeatIntervalMs = $derived<number>(
    (60 / Math.max(20, exerciseState.state.config.tempo)) * 1000
  );
  const exerciseMeasureIntervalMs = $derived<number>(exerciseBeatIntervalMs * 4);

  const beatIntervalMs = $derived<number>(
    isOverdubExerciseActive ? overdubBeatIntervalMs : exerciseBeatIntervalMs
  );
  const measureIntervalMs = $derived<number>(
    isOverdubExerciseActive ? overdubMeasureIntervalMs : exerciseMeasureIntervalMs
  );
  const beatTimeOffsetMs = $derived<number>(
    isOverdubExerciseActive ? 0 : (exerciseState.state.config.leadInMs ?? 0)
  );

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

  const droneHighlightEntry = $derived<PitchRowHighlightEntry | null>((() => {
    if (!appState.state.drone.isPlaying) return null;

    const droneMidi = ((appState.state.drone.octave + 1) * 12) + getTonicPitchClass(appState.state.tonic);
    const droneRow = fullRowData.find((row) => row.midi === droneMidi);
    if (!droneRow) return null;

    return {
      midi: droneMidi,
      color: droneRow.hex,
      opacity: 0.52,
      glow: 1,
      pulse: true,
      heightScale: 0.5,
    };
  })());

  const modeRowHighlights = $derived<PitchRowHighlightEntry[]>((() => {
    const drone = appState.state.drone;
    if (!drone.modeEnabled || !drone.isPlaying) return [];

    const tonicPc = getTonicPitchClass(appState.state.tonic);
    const offsets = MODE_SCALE_DEGREES[drone.selectedMode];
    if (!offsets) return [];

    const modePitchClasses = new Set(offsets.map(offset => (tonicPc + offset) % 12));
    const droneMidi = ((drone.octave + 1) * 12) + tonicPc;
    const highlights: PitchRowHighlightEntry[] = [];

    for (const row of fullRowData) {
      if (row.isBoundary) continue;
      if (typeof row.midi !== 'number' || typeof row.pitchClass !== 'number') continue;
      if (row.midi === droneMidi) continue;
      if (!modePitchClasses.has(row.pitchClass)) continue;

      highlights.push({
        midi: row.midi,
        opacity: 0.2,
        glow: 0,
        pulse: false,
        heightScale: 0.5,
      });
    }

    return highlights;
  })());

  const combinedRowHighlight = $derived<PitchRowHighlightConfig | undefined>((() => {
    const entries: PitchRowHighlightEntry[] = [];
    if (modeRowHighlights.length > 0) entries.push(...modeRowHighlights);
    if (droneHighlightEntry) entries.push(droneHighlightEntry);
    return entries.length > 0 ? entries : undefined;
  })());

  const modeFocusedPitchClasses = $derived<Set<number> | null>((() => {
    const drone = appState.state.drone;
    if (!drone.modeEnabled || !drone.focusLegend) return null;
    const tonicPc = getTonicPitchClass(appState.state.tonic);
    const offsets = MODE_SCALE_DEGREES[drone.selectedMode];
    if (!offsets) return null;
    return new Set(offsets.map(o => (tonicPc + o) % 12));
  })());

  const modeFocusColorsEnabled = $derived(
    appState.state.drone.modeEnabled && appState.state.drone.focusLegend
  );

  const modeLabelOverrides = $derived<Map<number, string> | undefined>((() => {
    const drone = appState.state.drone;
    if (!drone.modeEnabled || !drone.showDegrees) return undefined;
    const tonicPc = getTonicPitchClass(appState.state.tonic);
    const offsets = MODE_SCALE_DEGREES[drone.selectedMode];
    const labels = MODE_DEGREE_LABELS[drone.selectedMode];
    if (!offsets || !labels) return undefined;
    const map = new Map<number, string>();
    for (let i = 0; i < offsets.length; i++) {
      map.set((tonicPc + offsets[i]) % 12, labels[i]);
    }
    return map;
  })());

  const showHorizontalGridLines = $derived(!appState.state.drone.isPlaying);

  // Build MIDI → hex color lookup from fullRowData
  const midiToHex = $derived.by<Map<number, string>>(() => {
    const map = new Map<number, string>();
    for (const row of fullRowData) {
      if (typeof row.midi === 'number') {
        map.set(row.midi, row.hex);
      }
    }
    return map;
  });

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
      color: usePitchColors && typeof n.midi === 'number' ? midiToHex.get(n.midi) : n.color,
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
    maxConnections: 0,
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

  const persistentOverdubTrails = $derived(overdubState.getRenderableTrails());
  const loopDurationMs = $derived(Math.max(1, overdubState.captureDurationMs));
  const overdubRecordingActive = $derived(
    overdubState.state.isCountInActive || overdubState.state.isRecordingActive
  );
  const forwardCursorModeEnabled = $derived(overdubState.state.forwardCursorModeEnabled);
  const hasHighwayTargets = $derived((highwayState.state.targetNotes?.length ?? 0) > 0);
  const useLoopTimeline = $derived(
    mode === 'highway'
      && forwardCursorModeEnabled
      && overdubRecordingActive
      && !isUltrastarActive
      && !isExerciseActive
      && !isOverdubExerciseActive
  );
  const showTimingGridLines = $derived<boolean>(
    mode === 'highway'
      && !useLoopTimeline
      && !ultrastarState.state.isActive
      && (highwayState.state.isPlaying || hasHighwayTargets || isOverdubExerciseActive)
  );
  const gridBeatIntervalMs = $derived.by<number>(() => {
    if (!showTimingGridLines) return 0;
    if (appState.state.beatLineMode === 'none') return 0;
    if (appState.state.beatLineMode === 'bar') return measureIntervalMs;
    return beatIntervalMs;
  });
  const gridMeasureIntervalMs = $derived.by<number | undefined>(() => {
    if (!showTimingGridLines || appState.state.beatLineMode === 'none') return undefined;
    return measureIntervalMs;
  });
  const effectiveGridMode = $derived<PitchGridMode>(useLoopTimeline ? 'singing' : mode);

  // Build singing mode config (no userPitch — passed as separate prop)
  const singingConfig = $derived<SingingModeConfig | undefined>(
    mode === 'singing' || useLoopTimeline
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
  const rawHighwayConfig = $derived<HighwayModeConfig | undefined>(
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

  const highwayConfig = $derived<HighwayModeConfig | undefined>(rawHighwayConfig);

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

    const currentTime = performance.now();
    trailCtx.clearRect(0, 0, gridWidth, containerHeight);
    if (useLoopTimeline) {
      drawPersistentOverdubTrails(trailCtx, currentTime);
      drawLoopTimelineMicTrail(trailCtx, currentTime);
      drawLoopPlaybackCursor(trailCtx, currentTime);
      return;
    }

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

    drawUserPitchTrace(
      trailCtx,
      coords,
      trailHistory,
      currentTime,
      userPitchConfig,
      fullRowData
    );
  }

  function isLoopTransportActive(): boolean {
    const overdub = overdubState.state;
    return overdub.isCountInActive
      || overdub.isRecordingActive
      || overdub.engine.mode === 'playing'
      || overdub.engine.mode === 'exporting';
  }

  function getLoopTransportProgressMs(phraseDurationMs: number, currentTime: number): number {
    const overdub = overdubState.state;
    if (overdub.isCountInActive || overdub.isRecordingActive) {
      if (typeof overdub.recordingStartPerfMs === 'number') {
        const elapsedMs = currentTime - overdub.recordingStartPerfMs;
        return Math.max(0, Math.min(elapsedMs, phraseDurationMs));
      }
      return Math.max(0, Math.min(overdub.captureProgressMs, phraseDurationMs));
    }
    if (overdub.engine.mode === 'playing' || overdub.engine.mode === 'exporting') {
      return Math.max(0, Math.min(overdub.engine.playbackTimeMs, phraseDurationMs));
    }
    return 0;
  }

  function drawLoopTimelineMicTrail(ctx: CanvasRenderingContext2D, currentTime: number): void {
    const phraseDurationMs = loopDurationMs;
    if (phraseDurationMs <= 0) return;

    const pitchHistory = pitchState.state.history;
    if (pitchHistory.length === 0) return;

    const recordingProgressMs = isLoopTransportActive()
      ? getLoopTransportProgressMs(phraseDurationMs, currentTime)
      : currentTime % phraseDurationMs;

    const loopStartMs = currentTime - recordingProgressMs;
    const loopPixelsPerSecond = Math.max(1, (gridWidth / phraseDurationMs) * 1000);
    const coords = createTimeCoordinates({
      cellWidth,
      cellHeight: viewportWindow.cellHeight,
      viewport,
      pixelsPerSecond: loopPixelsPerSecond,
      nowLineX: gridWidth,
      currentTimeMs: phraseDurationMs,
    });

    const remappedHistory: PitchHistoryPoint[] = [];
    for (const point of pitchHistory) {
      if (point.time < loopStartMs || point.time > currentTime) continue;
      const elapsedMs = point.time - loopStartMs;
      if (elapsedMs < 0 || elapsedMs > phraseDurationMs) continue;
      remappedHistory.push({
        frequency: point.frequency,
        midi: point.midi,
        clarity: point.clarity,
        time: currentTime - (phraseDurationMs - elapsedMs),
      });
    }

    if (remappedHistory.length === 0) return;

    const userPitchConfig: UserPitchRenderConfig = {
      cellHeight: viewportWindow.cellHeight,
      viewportWidth: gridWidth,
      nowLineX: gridWidth,
      pixelsPerSecond: loopPixelsPerSecond,
      timeWindowMs: phraseDurationMs,
      colorMode: 'color',
      trailConfig: {
        ...trailConfig,
        timeWindowMs: phraseDurationMs,
        pixelsPerSecond: loopPixelsPerSecond,
      },
    };

    drawUserPitchTrace(ctx, coords, remappedHistory, currentTime, userPitchConfig, fullRowData);
    drawLoopCurrentPitchIndicator(ctx, coords, userPitchConfig, phraseDurationMs, currentTime);
  }

  function drawLoopCurrentPitchIndicator(
    ctx: CanvasRenderingContext2D,
    coords: CoordinateUtils,
    config: UserPitchRenderConfig,
    phraseDurationMs: number,
    currentTime: number
  ): void {
    if (!isLoopTransportActive()) return;
    const currentPitch = pitchState.state.currentPitch;
    if (!currentPitch) return;

    const progressMs = getLoopTransportProgressMs(phraseDurationMs, currentTime);
    const x = (progressMs / phraseDurationMs) * gridWidth;
    drawUserPitchIndicator(
      ctx,
      coords,
      currentPitch.midi,
      currentPitch.clarity,
      x,
      config,
      fullRowData
    );
  }

  function drawLoopPlaybackCursor(ctx: CanvasRenderingContext2D, currentTime: number): void {
    const phraseDurationMs = loopDurationMs;
    if (phraseDurationMs <= 0 || gridWidth <= 0) return;

    const isActive = isLoopTransportActive();
    if (!isActive) return;
    const progressMs = getLoopTransportProgressMs(phraseDurationMs, currentTime);
    const x = (progressMs / phraseDurationMs) * gridWidth;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 90, 90, 0.95)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, containerHeight);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 120, 120, 0.95)';
    ctx.beginPath();
    ctx.moveTo(x - 6, 0);
    ctx.lineTo(x + 6, 0);
    ctx.lineTo(x, 9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawPersistentOverdubTrails(ctx: CanvasRenderingContext2D, currentTime: number): void {
    const trails = persistentOverdubTrails;
    if (trails.length === 0) return;

    const phraseDurationMs = Math.max(1, overdubState.captureDurationMs);
    const loopPixelsPerSecond = Math.max(1, (gridWidth / phraseDurationMs) * 1000);
    const coords = createTimeCoordinates({
      cellWidth,
      cellHeight: viewportWindow.cellHeight,
      viewport,
      pixelsPerSecond: loopPixelsPerSecond,
      nowLineX: gridWidth,
      currentTimeMs: phraseDurationMs,
    });

    const persistentTrailConfig: UserPitchRenderConfig = {
      cellHeight: viewportWindow.cellHeight,
      viewportWidth: gridWidth,
      nowLineX: gridWidth,
      pixelsPerSecond: loopPixelsPerSecond,
      timeWindowMs: phraseDurationMs,
      colorMode: 'color',
      trailConfig: {
        ...trailConfig,
        timeWindowMs: phraseDurationMs,
        pixelsPerSecond: loopPixelsPerSecond,
        circleRadius: 4.5,
        connectorLineWidth: 1.5,
        maxConnections: 2,
        maxOpacity: 0.78,
      },
    };

    for (const trail of trails) {
      if (!trail.points || trail.points.length === 0) continue;
      const remappedHistory: PitchHistoryPoint[] = [];
      for (const point of trail.points) {
        if (point.offsetMs < 0 || point.offsetMs > phraseDurationMs) continue;
        remappedHistory.push({
          frequency: point.frequency,
          midi: point.midi,
          clarity: point.clarity,
          time: currentTime - (phraseDurationMs - point.offsetMs),
        });
      }
      if (remappedHistory.length === 0) continue;

      drawUserPitchTrace(
        ctx,
        coords,
        remappedHistory,
        currentTime,
        persistentTrailConfig,
        fullRowData
      );
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

  // Keep highway state aware of actual viewport width
  $effect(() => {
    highwayState.setViewportWidth(gridWidth);
  });

  $effect(() => {
    console.debug('[SingingCanvas] Highway render state', {
      mode,
      visualizationMode: appState.state.visualizationMode,
      rawTargetNotes: highwayState.state.targetNotes.length,
      cachedTargetNotes: cachedTargetNotes.length,
      isPlaying: highwayState.state.isPlaying,
      yAxisRange: appState.state.yAxisRange,
    });
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
    mode={effectiveGridMode}
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
    userPitch={useLoopTimeline ? null : userPitch}
    legendHighlight={legendHighlight}
    rowHighlight={combinedRowHighlight}
    focusedPitchClasses={modeFocusedPitchClasses}
    focusColorsEnabled={modeFocusColorsEnabled}
    legendLabelOverrides={modeLabelOverrides}
    {showHorizontalGridLines}
    beatIntervalMs={gridBeatIntervalMs}
    measureIntervalMs={gridMeasureIntervalMs}
    {beatTimeOffsetMs}
  />
  <canvas
    bind:this={trailCanvas}
    class="pitch-trail-canvas"
  ></canvas>

  {#if mode === 'highway' && !useLoopTimeline}
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
