<script lang="ts">
  /**
   * SingingCanvas Component
   *
   * Wraps the shared PitchGrid component for singing/highway visualization modes.
   */

  import { PitchGrid, calculateViewportWindow } from '@mlt/ui-components/canvas';
  import type {
    PitchGridMode,
    PitchGridViewport,
    SingingModeConfig,
    HighwayModeConfig,
    PitchHistoryPoint as SharedPitchHistoryPoint,
    TargetNote as SharedTargetNote,
    PitchTrailConfig,
    ViewportWindow,
  } from '@mlt/ui-components/canvas';
  import { generateRowDataForMidiRange, getTonicPitchClass, type PitchRowData } from '@mlt/pitch-data';
  import { appState } from '../stores/appState.svelte.js';
  import { pitchState } from '../stores/pitchState.svelte.js';
  import { highwayState } from '../stores/highwayState.svelte.js';

  // Container element for measuring size
  let container: HTMLDivElement | undefined = $state(undefined);
  let containerWidth = $state(800);
  let containerHeight = $state(400);

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

  // Convert local pitch history to shared format
  function convertPitchHistory(): SharedPitchHistoryPoint[] {
    return pitchState.state.history.map((p) => ({
      frequency: p.frequency,
      midi: p.midi,
      time: p.time,
      clarity: p.clarity,
    }));
  }

  // Convert local target notes to shared format
  function convertTargetNotes(): SharedTargetNote[] {
    return highwayState.state.targetNotes.map((n, i) => ({
      id: `target-${i}`,
      midi: n.midi,
      startTimeMs: n.startTimeMs,
      durationMs: n.durationMs,
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
          pitchHistory: convertPitchHistory(),
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
          pitchHistory: convertPitchHistory(),
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
</script>

<div class="singing-canvas-container" bind:this={container}>
  <PitchGrid
    {mode}
    {fullRowData}
    {viewport}
    cellWidth={20}
    cellHeight={viewportWindow.cellHeight}
    colorMode="color"
    showOctaveLabels={true}
    showFrequencyLabels={false}
    {singingConfig}
    {highwayConfig}
  />
</div>

<style>
  .singing-canvas-container {
    flex: 1;
    width: 100%;
    min-height: 300px;
    background-color: var(--color-bg-light);
    /* Subtle white overlay to make grid bounds more visible */
    background-image: linear-gradient(rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.02));
    border-radius: var(--radius-md);
    overflow: hidden;
  }
</style>
