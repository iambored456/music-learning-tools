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
  import { ViewportInfoToast } from '@mlt/ui-components';
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
  import {
    generateRowDataForMidiRange,
    getPitchByMidi,
    getTonicPitchClass,
    type PitchRowData,
  } from '@mlt/pitch-data';
  import { appState } from '@mlt/singing-trainer-core/stores/appState.svelte.js';
  import { preferencesStore } from '@mlt/singing-trainer-core/stores/preferencesStore.svelte.js';
  import { pitchState } from '@mlt/singing-trainer-core/stores/pitchState.svelte.js';
  import { highwayState } from '@mlt/singing-trainer-core/stores/highwayState.svelte.js';
  import { exerciseState } from '@mlt/singing-trainer-core/stores/exerciseState.svelte.js';
  import { ultrastarState } from '@mlt/singing-trainer-core/stores/ultrastarState.svelte.js';
  import { overdubState, type RenderableTakeTrail } from '@mlt/singing-trainer-core/stores/overdubState.svelte.js';
  import { overdubExerciseState } from '@mlt/singing-trainer-core/stores/overdubExerciseState.svelte.js';
  import { MODE_SCALE_DEGREES, MODE_DEGREE_LABELS } from '@mlt/singing-trainer-core/constants/modes.js';
  import { LyricsDisplay } from './karaoke/index.js';
  import YAxisDragZones from './YAxisDragZones.svelte';
  import JudgementLineDragHandle from './JudgementLineDragHandle.svelte';

  interface Props {
    theme?: 'light' | 'dark';
  }

  let { theme = 'light' }: Props = $props();

  // Container element for measuring size
  let container: HTMLDivElement | undefined = $state(undefined);
  let containerWidth = $state(800);
  let containerHeight = $state(400);

  // Trail canvas overlay
  let trailCanvas: HTMLCanvasElement | undefined = $state(undefined);
  let trailCtx: CanvasRenderingContext2D | null = $state(null);
  let trailAnimationId: number | null = $state(null);
  const timelineTrailHistoryCache = new Map<
    string,
    {
      sourceRef: RenderableTakeTrail['points'];
      sourceLength: number;
      sourceLastOffsetMs: number;
      history: PitchHistoryPoint[];
    }
  >();
  let timelinePanDragActive = $state(false);
  let timelinePanPointerId = $state<number | null>(null);
  let timelinePanStartClientX = 0;
  let timelinePanStartViewStartMs = 0;
  let timelinePanViewDurationMs = 0;
  let highwayWaitFreezePerfMs = $state<number | null>(null);
  let viewportInfoLines = $state<string[]>([]);
  let viewportInfoTriggerKey = $state(0);
  let hasSeenTimelineViewDuration = false;
  let lastTimelineViewDurationMs = 0;
  let hasSeenYAxisRange = false;
  let lastYAxisMinMidi = 0;
  let lastYAxisMaxMidi = 0;
  let lastTimingGridDebugKey: string | null = null;

  type RgbTuple = [number, number, number];
  type TimingGridDebugWindow = Window & {
    __MLT_DEBUG_TIMING_GRID__?: boolean;
    __MLT_LOG_TIMING_GRID_SNAPSHOT__?: (() => void) | undefined;
  };
  const MODE_ROW_FADE_SCALE = 0.25;
  const SPEAKING_PITCH_FADE_SCALE = 0.5;
  const TRAIL_DIAMETER_TO_TWO_ROWS_RATIO = 0.61803;
  const JUST_INTONATION_CENTS = [
    0,
    111.73,
    203.91,
    315.64,
    386.31,
    498.04,
    590.22,
    701.96,
    813.69,
    884.36,
    1017.6,
    1088.27,
  ] as const;
  const CHROMATIC_FLAT_DEGREE_LABELS = [
    '1', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♭6', '6', '♭7', '7',
  ] as const;
  const CHROMATIC_SHARP_DEGREE_LABELS = [
    '1', '♯1', '2', '♯2', '3', '4', '♯4', '5', '♯5', '6', '♯6', '7',
  ] as const;

  const cellWidth = 20;
  const showOctaveLabels = $derived(appState.state.showOctaveLabels);
  const showFrequencyLabels = $derived(appState.state.showFrequencyLabels);
  const showLegendLabels = true;
  const showRightLegend = $derived(containerWidth >= 720);

  // Keep legend sizing in sync with PitchGrid
  const LEGEND_COLUMN_WIDTH_UNITS = 3.236;
  const legendColumnWidth = $derived(cellWidth * LEGEND_COLUMN_WIDTH_UNITS);
  const legendCanvasWidth = $derived(legendColumnWidth * 2);
  const showLegends = $derived(showLegendLabels);
  const legendTotalWidth = $derived(showLegends ? legendCanvasWidth * (showRightLegend ? 2 : 1) : 0);
  const gridWidth = $derived(Math.max(0, containerWidth - legendTotalWidth));
  const gridOffsetX = $derived(showLegends ? legendCanvasWidth : 0);

  // Generate row data for the pitch grid based on y-axis range
  // Uses the shared pitch data package which includes proper colors, frequencies, and enharmonic spellings
  const fullRowData = $derived.by<PitchRowData[]>(() => {
    const rows = generateRowDataForMidiRange(
      appState.state.yAxisRange.minMidi,
      appState.state.yAxisRange.maxMidi,
    );
    const speakingPitchMidi = preferencesStore.speakingPitchMidi;
    if (
      !appState.state.centerColorsOnSpeakingPitch
      || typeof speakingPitchMidi !== 'number'
      || !Number.isFinite(speakingPitchMidi)
    ) {
      return rows;
    }

    const colorShift = Math.round(speakingPitchMidi) - 60;
    return rows.map((row) => {
      if (typeof row.midi !== 'number') return row;
      const sourceRow = getPitchByMidi(row.midi - colorShift);
      return sourceRow ? { ...row, hex: sourceRow.hex } : row;
    });
  });

  // Calculate optimal viewport window that fills container height
  const viewportWindow = $derived<ViewportWindow>(
    calculateViewportWindow({
      containerHeight,
      fullRowData,
      preferredCellHeight: 40,
      minCellHeight: 20,
    })
  );

  function getJustCentsFromTonic(semitonesFromTonic: number): number {
    const octave = Math.floor(semitonesFromTonic / 12);
    const pitchClassOffset = ((semitonesFromTonic % 12) + 12) % 12;
    return (octave * 1200) + JUST_INTONATION_CENTS[pitchClassOffset];
  }

  const rowPositionOffsets = $derived<readonly number[] | undefined>((() => {
    if (appState.state.pitchTuningMode !== 'just') return undefined;
    const referenceMidi = Math.round(preferencesStore.speakingPitchMidi ?? 60);
    return fullRowData.map((row) => {
      if (typeof row.midi !== 'number') return 0;
      const semitonesFromTonic = row.midi - referenceMidi;
      const equalCents = semitonesFromTonic * 100;
      return (equalCents - getJustCentsFromTonic(semitonesFromTonic)) / 100;
    });
  })());

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
  const overdubExerciseTemplate = $derived(overdubExerciseState.state.template);

  const overdubPhrase = $derived(overdubState.state.engine.project.phrase);
  const overdubBeatIntervalMs = $derived<number>(
    (60 / Math.max(20, overdubExerciseState.state.tempo || overdubPhrase.tempoBpm)) * 1000
  );
  const overdubBeatsPerMeasure = $derived<number>((() => {
    const explicitBeatsPerMeasure = overdubExerciseTemplate?.config.beatsPerMeasure;
    if (typeof explicitBeatsPerMeasure === 'number' && Number.isFinite(explicitBeatsPerMeasure)) {
      return Math.max(1, Math.round(explicitBeatsPerMeasure));
    }
    return Math.max(1, overdubPhrase.timeSignatureNumerator);
  })());
  const overdubPickupBeats = $derived<number>((() => {
    const pickupBeats = overdubExerciseTemplate?.config.pickupBeats;
    if (typeof pickupBeats !== 'number' || !Number.isFinite(pickupBeats)) {
      return 0;
    }
    return Math.max(0, Math.round(pickupBeats));
  })());
  const overdubMeasureIntervalMs = $derived<number>(
    overdubBeatIntervalMs * overdubBeatsPerMeasure
  );
  const overdubMeasureTimeOffsetMs = $derived<number>(
    overdubPickupBeats * overdubBeatIntervalMs
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
  const measureTimeOffsetMs = $derived<number>(
    isOverdubExerciseActive ? overdubMeasureTimeOffsetMs : (exerciseState.state.config.leadInMs ?? 0)
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

  function getModeDegreeFadeScales(degreeIndex: number): Pick<
    PitchRowHighlightEntry,
    'fadeExtendTopScale' | 'fadeExtendBottomScale'
  > {
    switch (degreeIndex) {
      case 0:
        return { fadeExtendTopScale: MODE_ROW_FADE_SCALE };
      case 1:
        return {
          fadeExtendTopScale: MODE_ROW_FADE_SCALE,
          fadeExtendBottomScale: MODE_ROW_FADE_SCALE,
        };
      case 2:
        return { fadeExtendBottomScale: MODE_ROW_FADE_SCALE };
      case 3:
        return { fadeExtendTopScale: MODE_ROW_FADE_SCALE };
      case 4:
        return {
          fadeExtendTopScale: MODE_ROW_FADE_SCALE,
          fadeExtendBottomScale: MODE_ROW_FADE_SCALE,
        };
      case 5:
        return {
          fadeExtendTopScale: MODE_ROW_FADE_SCALE,
          fadeExtendBottomScale: MODE_ROW_FADE_SCALE,
        };
      case 6:
        return { fadeExtendBottomScale: MODE_ROW_FADE_SCALE };
      default:
        return {};
    }
  }

  // Colour Highlight is independent from audio drone playback.
  const speakingPitchHighlightEntry = $derived<PitchRowHighlightEntry | null>((() => {
    const drone = appState.state.drone;
    const speakingPitchMidi = preferencesStore.speakingPitchMidi;
    const highlightedMidi = drone.useSpeakingPitch
      && typeof speakingPitchMidi === 'number'
      && Number.isFinite(speakingPitchMidi)
        ? Math.round(speakingPitchMidi)
        : null;
    if (highlightedMidi === null) return null;

    const highlightedRow = fullRowData.find((row) => row.midi === highlightedMidi);
    if (!highlightedRow) return null;

    return {
      midi: highlightedMidi,
      color: highlightedRow.hex,
      opacity: theme === 'light' ? 1 : 0.52,
      glow: 1,
      pulse: true,
      renderBehindGridLines: true,
      heightScale: 0,
      fadeExtendTopScale: SPEAKING_PITCH_FADE_SCALE,
      fadeExtendBottomScale: SPEAKING_PITCH_FADE_SCALE,
    };
  })());

  const modeRowHighlights = $derived<PitchRowHighlightEntry[]>((() => {
    const drone = appState.state.drone;
    if (!drone.modeEnabled) return [];

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

      const intervalFromTonic = (row.pitchClass - tonicPc + 12) % 12;
      const degreeIndex = offsets.indexOf(intervalFromTonic);
      const fadeScales = degreeIndex >= 0
        ? getModeDegreeFadeScales(degreeIndex)
        : {};

      highlights.push({
        midi: row.midi,
        opacity: 0.2,
        glow: 0,
        pulse: false,
        heightScale: 0.5,
        ...fadeScales,
      });
    }

    return highlights;
  })());

  const combinedRowHighlight = $derived<PitchRowHighlightConfig | undefined>((() => {
    const entries: PitchRowHighlightEntry[] = [];
    if (modeRowHighlights.length > 0) entries.push(...modeRowHighlights);
    if (speakingPitchHighlightEntry) entries.push(speakingPitchHighlightEntry);
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
    if (!drone.showDegrees) return undefined;
    const speakingPitchMidi = preferencesStore.speakingPitchMidi;
    const tonicPc = typeof speakingPitchMidi === 'number' && Number.isFinite(speakingPitchMidi)
      ? ((Math.round(speakingPitchMidi) % 12) + 12) % 12
      : getTonicPitchClass(appState.state.tonic);
    const offsets = MODE_SCALE_DEGREES[drone.selectedMode];
    const labels = MODE_DEGREE_LABELS[drone.selectedMode];
    if (!offsets || !labels) return undefined;
    const map = new Map<number, string>();
    for (let i = 0; i < offsets.length; i++) {
      map.set((tonicPc + offsets[i]) % 12, labels[i]);
    }

    const { flat, sharp } = appState.state.accidentalMode;
    if (flat || sharp) {
      const modeOffsets = new Set(offsets);
      for (let semitonesFromTonic = 0; semitonesFromTonic < 12; semitonesFromTonic++) {
        if (modeOffsets.has(semitonesFromTonic)) continue;

        const flatLabel = CHROMATIC_FLAT_DEGREE_LABELS[semitonesFromTonic];
        const sharpLabel = CHROMATIC_SHARP_DEGREE_LABELS[semitonesFromTonic];
        const chromaticLabel = flat && sharp && flatLabel !== sharpLabel
          ? `${flatLabel}/${sharpLabel}`
          : flat
            ? flatLabel
            : sharpLabel;

        map.set((tonicPc + semitonesFromTonic) % 12, chromaticLabel);
      }
    }
    return map;
  })());

  const showHorizontalGridLines = $derived(appState.state.showHorizontalGridLines);
  const horizontalGridReferencePitchClass = $derived((() => {
    const speakingPitchMidi = preferencesStore.speakingPitchMidi;
    if (
      appState.state.centerGridOnSpeakingPitch
      && typeof speakingPitchMidi === 'number'
      && Number.isFinite(speakingPitchMidi)
    ) {
      return ((Math.round(speakingPitchMidi) % 12) + 12) % 12;
    }
    return getTonicPitchClass(appState.state.tonic);
  })());

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
    return highwayState.state.targetNotes.map((n, i) => {
      const degreeLabel = showDegrees && typeof n.midi === 'number'
        ? degrees[i]
        : undefined;
      return ({
      id: `target-${i}`,
      targetKind: n.targetKind,
      midi: n.midi,
      minMidi: n.minMidi,
      maxMidi: n.maxMidi,
      slideDirection: n.slideDirection,
      startTimeMs: n.startTimeMs,
      durationMs: n.durationMs,
      label: n.label ?? degreeLabel ?? n.lyric,
      color: usePitchColors && typeof n.midi === 'number' ? midiToHex.get(n.midi) : n.color,
      });
    });
  }

  // Cache target notes separately — only recalculates when targetNotes array or degree settings change
  // (NOT on every mic frame or currentTimeMs update)
  const cachedTargetNotes = $derived.by<SharedTargetNote[]>(() => {
    // Track only array length (changes on song load), not deep properties like .hit
    void highwayState.state.targetNotes.length;
    void appState.state.noteScaleDegrees;
    void appState.state.useDegrees;
    void appState.state.noteColorMode;
    void appState.state.centerColorsOnSpeakingPitch;
    void preferencesStore.speakingPitchMidi;
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
    // Two semitone rows span one cellHeight; the configured ratio describes diameter.
    circleRadius:
      ((viewportWindow.cellHeight * TRAIL_DIAMETER_TO_TWO_ROWS_RATIO) / 2)
      * appState.state.micTrailSizeScale,
    // Adjacent semitone rows are spaced at half cellHeight; this diameter spans two rows.
    indicatorRadius: viewportWindow.cellHeight / 2,
    proximityThreshold: 35,
    maxConnections: 0,
    connectorLineWidth: 2.5,
    connectorColor: 'rgba(0,0,0,0.4)',
    useTonicRelativeColors: appState.state.centerColorsOnSpeakingPitch,
    tonicPitchClass: appState.state.centerColorsOnSpeakingPitch
      && typeof preferencesStore.speakingPitchMidi === 'number'
      ? ((Math.round(preferencesStore.speakingPitchMidi) % 12) + 12) % 12
      : getTonicPitchClass(appState.state.tonic),
    clarityThreshold: 0.5,
    maxOpacity: 0.8,
  });

  const labelConfig = $derived({
    mode: appState.state.lyricLabelMode,
    scale: appState.state.lyricLabelScale,
    fixedPx: appState.state.lyricLabelFixedPx,
  });

  const persistentOverdubTrails = $derived(overdubState.getRenderableTrails());
  const overdubVoiceColorByLayerId = $derived.by<Map<string, RgbTuple>>(() => {
    const map = new Map<string, RgbTuple>();
    const template = overdubExerciseState.state.template;
    if (!template) return map;

    const voiceColorByName = new Map<string, RgbTuple>();
    for (const voice of template.config.voices) {
      const parsed = parseHexColorToRgb(voice.color);
      if (parsed) {
        voiceColorByName.set(voice.name, parsed);
      }
    }

    for (const layer of overdubState.state.engine.project.layers) {
      const voiceColor = voiceColorByName.get(layer.name);
      if (voiceColor) {
        map.set(layer.id, voiceColor);
      }
    }
    return map;
  });
  const liveMicTrailFixedColor = $derived.by<RgbTuple | null>(() => {
    if (appState.state.overdubMicTrailColorMode !== 'voice') return null;
    if (!overdubExerciseState.state.isActive) return null;

    const template = overdubExerciseState.state.template;
    const activeVoiceId = overdubExerciseState.state.activeVoiceId;
    if (template && activeVoiceId) {
      const activeVoice = template.config.voices.find((voice) => voice.voiceId === activeVoiceId);
      const parsedActiveVoiceColor = parseHexColorToRgb(activeVoice?.color);
      if (parsedActiveVoiceColor) {
        return parsedActiveVoiceColor;
      }
    }

    const armedLayerId = overdubState.state.engine.armedLayerId;
    if (armedLayerId) {
      return overdubVoiceColorByLayerId.get(armedLayerId) ?? null;
    }

    return null;
  });
  const liveTrailConfig = $derived<PitchTrailConfig>({
    ...trailConfig,
    fixedColorRgb: liveMicTrailFixedColor,
  });
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
  const freeplayTimelineEnabled = $derived(
    mode === 'highway'
      && !useLoopTimeline
      && !isUltrastarActive
      && !hasHighwayTargets
      && !isExerciseActive
      && !isOverdubExerciseActive
  );
  const timelineViewportEnabled = $derived(
    mode === 'highway'
      && !useLoopTimeline
      && !isUltrastarActive
      && (hasHighwayTargets || isOverdubExerciseActive || freeplayTimelineEnabled)
  );
  const timelinePanEnabled = $derived(
    timelineViewportEnabled && !freeplayTimelineEnabled
  );
  const timelineViewportProjection = $derived.by<{
    nowLineX: number;
    pixelsPerSecond: number;
    currentTimeMs: number;
    timeWindowMs: number;
  } | null>(() => {
    if (!timelineViewportEnabled || gridWidth <= 0) return null;

    const totalDurationMs = Math.max(1, Math.round(highwayState.state.timelineDurationMs));
    const viewDurationMs = clampNumber(
      Math.round(highwayState.state.timelineViewDurationMs),
      1,
      totalDurationMs,
    );
    const maxStartMs = Math.max(0, totalDurationMs - viewDurationMs);
    const viewStartMs = clampNumber(
      Math.round(highwayState.state.timelineViewStartMs),
      0,
      maxStartMs,
    );

    const width = Math.max(1, gridWidth);
    const nowLineX = clampNumber(
      Math.round(highwayState.state.nowLineX),
      16,
      Math.max(16, width - 16),
    );
    const pixelsPerSecond = Math.max(1, (width / viewDurationMs) * 1000);
    const timelineContentStartMs = clampNumber(
      Math.round(highwayState.state.timelineContentStartMs),
      0,
      totalDurationMs,
    );
    const currentTimeMs = (
      viewStartMs
      + ((nowLineX / pixelsPerSecond) * 1000)
      - timelineContentStartMs
    );

    return {
      nowLineX,
      pixelsPerSecond,
      currentTimeMs,
      timeWindowMs: viewDurationMs,
    };
  });
  const gridBeatIntervalMs = $derived.by<number>(() => {
    if (!showTimingGridLines) return 0;
    const showBeatLines = appState.state.showBeatGridLines;
    const showMeasureLines = appState.state.showMeasureGridLines;
    if (!showBeatLines && !showMeasureLines) return 0;
    if (showBeatLines) return beatIntervalMs;
    return measureIntervalMs;
  });
  const gridMeasureIntervalMs = $derived.by<number | undefined>(() => {
    if (!showTimingGridLines || !appState.state.showMeasureGridLines) return undefined;
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
          trailConfig: liveTrailConfig,
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
          nowLineX: timelineViewportProjection?.nowLineX ?? highwayState.state.nowLineX,
          pixelsPerSecond: timelineViewportProjection?.pixelsPerSecond ?? highwayState.state.pixelsPerSecond,
          currentTimeMs: highwayState.state.isPlaying
            ? highwayState.state.currentTimeMs
            : (timelineViewportProjection?.currentTimeMs ?? highwayState.state.currentTimeMs),
          timeWindowMs: timelineViewportProjection?.timeWindowMs ?? highwayState.state.timeWindowMs,
          trailConfig: liveTrailConfig,
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

  function clampNumber(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  function roundDebugValue(value: number, digits = 1): number {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
  }

  function getTimingGridDebugWindow(): TimingGridDebugWindow | null {
    if (typeof window === 'undefined') return null;
    return window as TimingGridDebugWindow;
  }

  function buildVisibleTimingLineSnapshot(
    intervalMs: number,
    offsetMs: number,
    visibleStartMs: number,
    visibleEndMs: number,
    currentTimeMs: number,
    nowLineX: number,
    pixelsPerSecond: number,
  ): Array<{ index: number; timeMs: number; x: number }> {
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) return [];

    const firstIndex = Math.floor((visibleStartMs - offsetMs) / intervalMs);
    const lastIndex = Math.ceil((visibleEndMs - offsetMs) / intervalMs);
    const lines: Array<{ index: number; timeMs: number; x: number }> = [];

    for (let index = firstIndex; index <= lastIndex; index += 1) {
      const timeMs = offsetMs + (index * intervalMs);
      const x = nowLineX + (((timeMs - currentTimeMs) / 1000) * pixelsPerSecond);
      if (x < -1 || x > gridWidth + 1) continue;
      lines.push({
        index,
        timeMs: roundDebugValue(timeMs),
        x: roundDebugValue(x),
      });
    }

    return lines;
  }

  function buildTimingGridDebugSnapshot() {
    if (mode !== 'highway' || !highwayConfig || gridWidth <= 0) return null;

    const pixelsPerSecond = Math.max(1, highwayConfig.pixelsPerSecond ?? 200);
    const nowLineX = roundDebugValue(highwayConfig.nowLineX ?? 100);
    const currentTimeMs = roundDebugValue(highwayConfig.currentTimeMs ?? 0);
    const visibleStartMs = currentTimeMs + (((0 - nowLineX) / pixelsPerSecond) * 1000);
    const visibleEndMs = currentTimeMs + (((gridWidth - nowLineX) / pixelsPerSecond) * 1000);
    const targetNotes = highwayConfig.targetNotes ?? [];

    const beatLines = buildVisibleTimingLineSnapshot(
      beatIntervalMs,
      beatTimeOffsetMs,
      visibleStartMs,
      visibleEndMs,
      currentTimeMs,
      nowLineX,
      pixelsPerSecond,
    );
    const measureLines = buildVisibleTimingLineSnapshot(
      measureIntervalMs,
      measureTimeOffsetMs,
      visibleStartMs,
      visibleEndMs,
      currentTimeMs,
      nowLineX,
      pixelsPerSecond,
    );

    const visibleNotes = targetNotes
      .map((note, index) => {
        const startX = nowLineX + (((note.startTimeMs - currentTimeMs) / 1000) * pixelsPerSecond);
        const endX = startX + ((note.durationMs / 1000) * pixelsPerSecond);
        return {
          index,
          label: note.label ?? null,
          midi: note.midi ?? null,
          startTimeMs: roundDebugValue(note.startTimeMs),
          endTimeMs: roundDebugValue(note.startTimeMs + note.durationMs),
          durationMs: roundDebugValue(note.durationMs),
          startX: roundDebugValue(startX),
          endX: roundDebugValue(endX),
          beatPhase: beatIntervalMs > 0
            ? roundDebugValue((note.startTimeMs - beatTimeOffsetMs) / beatIntervalMs, 3)
            : null,
          measurePhase: measureIntervalMs > 0
            ? roundDebugValue((note.startTimeMs - measureTimeOffsetMs) / measureIntervalMs, 3)
            : null,
        };
      })
      .filter((note) => note.endX >= 0 && note.startX <= gridWidth)
      .slice(0, 18);

    return {
      exerciseId: overdubExerciseState.state.exerciseId,
      exerciseName: overdubExerciseTemplate?.name ?? null,
      mode,
      currentTimeMs,
      nowLineX,
      gridWidth,
      pixelsPerSecond: roundDebugValue(pixelsPerSecond, 3),
      beatIntervalMs: roundDebugValue(beatIntervalMs),
      measureIntervalMs: roundDebugValue(measureIntervalMs),
      beatTimeOffsetMs: roundDebugValue(beatTimeOffsetMs),
      measureTimeOffsetMs: roundDebugValue(measureTimeOffsetMs),
      visibleTimeRange: {
        startMs: roundDebugValue(visibleStartMs),
        endMs: roundDebugValue(visibleEndMs),
      },
      beatLines,
      measureLines,
      visibleNotes,
    };
  }

  function logTimingGridSnapshot(reason: 'manual' | 'auto'): void {
    const snapshot = buildTimingGridDebugSnapshot();
    if (!snapshot) {
      console.warn('[SingingCanvas][TimingGrid]', { reason, available: false });
      return;
    }

    console.log('[SingingCanvas][TimingGrid]', {
      reason,
      ...snapshot,
    });
  }

  function parseHexColorToRgb(color: string | null | undefined): RgbTuple | null {
    if (typeof color !== 'string') return null;
    const normalized = color.trim();
    const shortHexMatch = normalized.match(/^#([0-9a-fA-F]{3})$/);
    if (shortHexMatch) {
      const hex = shortHexMatch[1];
      const r = Number.parseInt(hex[0] + hex[0], 16);
      const g = Number.parseInt(hex[1] + hex[1], 16);
      const b = Number.parseInt(hex[2] + hex[2], 16);
      return [r, g, b];
    }

    const longHexMatch = normalized.match(/^#([0-9a-fA-F]{6})$/);
    if (!longHexMatch) return null;
    const hex = longHexMatch[1];
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);
    return [r, g, b];
  }

  function getRenderableTrailFixedColor(trail: RenderableTakeTrail): RgbTuple | null {
    if (appState.state.overdubMicTrailColorMode !== 'voice') return null;
    if (!overdubExerciseState.state.isActive) return null;
    return overdubVoiceColorByLayerId.get(trail.layerId)
      ?? parseHexColorToRgb(trail.color);
  }

  function getClosestRowIndexForMidi(midi: number): number | null {
    if (!Number.isFinite(midi)) return null;
    let closestIndex: number | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < fullRowData.length; index++) {
      const rowMidi = fullRowData[index]?.midi;
      if (typeof rowMidi !== 'number' || !Number.isFinite(rowMidi)) continue;
      const distance = Math.abs(rowMidi - midi);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    }

    return closestIndex;
  }

  function getWaitgateArrowTargetY(note: SharedTargetNote, coords: CoordinateUtils): number | null {
    if (typeof note.midi === 'number' && Number.isFinite(note.midi)) {
      const rowIndex = getClosestRowIndexForMidi(note.midi);
      return rowIndex === null ? null : coords.getRowY(rowIndex);
    }

    if (typeof note.minMidi === 'number' && typeof note.maxMidi === 'number') {
      const centerMidi = (note.minMidi + note.maxMidi) / 2;
      const rowIndex = getClosestRowIndexForMidi(centerMidi);
      return rowIndex === null ? null : coords.getRowY(rowIndex);
    }

    if (typeof note.minMidi === 'number' && Number.isFinite(note.minMidi)) {
      const rowIndex = getClosestRowIndexForMidi(note.minMidi);
      return rowIndex === null ? null : coords.getRowY(rowIndex);
    }

    if (typeof note.maxMidi === 'number' && Number.isFinite(note.maxMidi)) {
      const rowIndex = getClosestRowIndexForMidi(note.maxMidi);
      return rowIndex === null ? null : coords.getRowY(rowIndex);
    }

    return containerHeight / 2;
  }

  function drawWaitgateGuideArrow(
    ctx: CanvasRenderingContext2D,
    coords: CoordinateUtils,
    config: HighwayModeConfig,
    currentTime: number,
  ): void {
    if (!highwayState.state.isWaitingForInput) return;
    const waitingNoteId = highwayState.state.waitingNoteId;
    if (!waitingNoteId) return;

    const targetNotes = config.targetNotes ?? [];
    const waitingNote = targetNotes.find((note) => note.id === waitingNoteId);
    if (!waitingNote) return;

    const targetY = getWaitgateArrowTargetY(waitingNote, coords);
    if (targetY === null || !Number.isFinite(targetY)) return;
    if (targetY < -viewportWindow.cellHeight || targetY > containerHeight + viewportWindow.cellHeight) return;

    const noteHeightPx = viewportWindow.cellHeight;
    const pixelsPerSecond = Math.max(1, config.pixelsPerSecond ?? 200);
    const noteWidthPx = Math.max(
      noteHeightPx * 0.8,
      (Math.max(0, waitingNote.durationMs) / 1000) * pixelsPerSecond,
    );
    const arrowScalePx = clampNumber(
      Math.min(noteWidthPx, noteHeightPx * 2.4),
      noteHeightPx * 0.8,
      noteHeightPx * 2.4,
    );
    const pulse = 0.78 + (((Math.sin(currentTime / 180) + 1) / 2) * 0.22);
    const lineWidth = clampNumber(arrowScalePx * 0.18, 2.5, 7.5);
    const arrowHeadLength = clampNumber(arrowScalePx * 0.9, 12, 32);
    const tipX = clampNumber(Math.round(config.nowLineX) - 2, arrowHeadLength + 8, Math.max(arrowHeadLength + 8, gridWidth - 2));
    const bodyEndX = Math.max(0, tipX - arrowHeadLength);
    const arrowHalfHeight = clampNumber(arrowScalePx * 0.36, 6, 18);
    const anchorRadius = clampNumber(arrowScalePx * 0.14, 1.8, 6);

    ctx.save();
    ctx.shadowColor = `rgba(255, 191, 71, ${0.45 * pulse})`;
    ctx.shadowBlur = clampNumber(arrowScalePx * 0.45, 8, 16);

    const lineGradient = ctx.createLinearGradient(0, 0, tipX, 0);
    lineGradient.addColorStop(0, `rgba(255, 234, 181, ${0.46 * pulse})`);
    lineGradient.addColorStop(0.72, `rgba(255, 205, 96, ${0.9 * pulse})`);
    lineGradient.addColorStop(1, `rgba(255, 163, 71, ${0.98 * pulse})`);

    ctx.strokeStyle = lineGradient;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, targetY);
    ctx.lineTo(bodyEndX, targetY);
    ctx.stroke();

    ctx.fillStyle = `rgba(255, 196, 82, ${0.96 * pulse})`;
    ctx.beginPath();
    ctx.moveTo(tipX, targetY);
    ctx.lineTo(bodyEndX, targetY - arrowHalfHeight);
    ctx.lineTo(bodyEndX, targetY + arrowHalfHeight);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = `rgba(255, 243, 214, ${0.88 * pulse})`;
    ctx.beginPath();
    ctx.arc(anchorRadius, targetY, anchorRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function normalizeWheelDelta(delta: number, deltaMode: number): number {
    if (deltaMode === WheelEvent.DOM_DELTA_LINE) return delta * 16;
    if (deltaMode === WheelEvent.DOM_DELTA_PAGE) return delta * Math.max(1, containerHeight);
    return delta;
  }

  function getPointerXInGrid(clientX: number): number | null {
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    return clientX - rect.left - gridOffsetX;
  }

  function isPointerInsideGrid(clientX: number): boolean {
    if (gridWidth <= 0) return false;
    const pointerXInGrid = getPointerXInGrid(clientX);
    if (pointerXInGrid === null) return false;
    return pointerXInGrid >= 0 && pointerXInGrid <= gridWidth;
  }

  function getYAxisRangeSemitones(): number {
    const range = appState.state.yAxisRange;
    return Math.max(0, Math.round(range.maxMidi - range.minMidi));
  }

  function getTimelineZoomPercent(): number | null {
    if (!timelineViewportEnabled) return null;
    const totalDurationMs = Math.max(1, Math.round(highwayState.state.timelineDurationMs));
    const viewDurationMs = clampNumber(
      Math.round(highwayState.state.timelineViewDurationMs),
      1,
      totalDurationMs,
    );
    return Math.max(1, Math.round((totalDurationMs / viewDurationMs) * 100));
  }

  function showViewportInfoToast(): void {
    const nextLines: string[] = [];
    const timelineZoomPercent = getTimelineZoomPercent();
    if (timelineZoomPercent !== null) {
      nextLines.push(`Timeline Zoom: ${timelineZoomPercent}%`);
    }
    nextLines.push(`Y-Axis Range: ~${getYAxisRangeSemitones()} semitones`);
    viewportInfoLines = nextLines;
    viewportInfoTriggerKey += 1;
  }

  function shiftYAxisRangeBySemitones(deltaSemitones: number): void {
    if (!Number.isFinite(deltaSemitones) || deltaSemitones === 0) return;
    const range = appState.state.yAxisRange;
    const span = Math.max(6, Math.round(range.maxMidi - range.minMidi));
    const minBound = 21;
    const maxBound = 108;
    const maxStart = Math.max(minBound, maxBound - span);
    const nextMin = clampNumber(Math.round(range.minMidi + deltaSemitones), minBound, maxStart);
    const nextMax = nextMin + span;
    if (nextMin === range.minMidi && nextMax === range.maxMidi) return;
    appState.setYAxisRange({ minMidi: nextMin, maxMidi: nextMax });
  }

  function handleGridWheel(event: WheelEvent): void {
    if (!isPointerInsideGrid(event.clientX)) return;

    const pointerXInGrid = getPointerXInGrid(event.clientX);
    const normalizedDeltaY = normalizeWheelDelta(event.deltaY, event.deltaMode);
    const normalizedDeltaX = normalizeWheelDelta(event.deltaX, event.deltaMode);

    if (
      timelineViewportEnabled
      && pointerXInGrid !== null
      && (event.ctrlKey || event.metaKey || event.altKey)
    ) {
      event.preventDefault();
      const anchorRatio = clampNumber(pointerXInGrid / Math.max(1, gridWidth), 0, 1);
      const zoomFactor = Math.exp(-normalizedDeltaY * 0.003);
      highwayState.zoomTimelineViewport(zoomFactor, anchorRatio);
      return;
    }

    const primaryScrollDelta = Math.abs(normalizedDeltaY) > 0 ? normalizedDeltaY : normalizedDeltaX;
    if (!Number.isFinite(primaryScrollDelta) || primaryScrollDelta === 0) return;

    event.preventDefault();
    const semitoneSteps = Math.max(1, Math.round(Math.abs(primaryScrollDelta) / 48));
    const deltaSemitones = primaryScrollDelta > 0 ? -semitoneSteps : semitoneSteps;
    shiftYAxisRangeBySemitones(deltaSemitones);
  }

  function handleTimelinePanPointerDown(event: PointerEvent): void {
    if (!timelinePanEnabled || event.button !== 2) return;
    if (!isPointerInsideGrid(event.clientX)) return;
    const targetElement = event.target instanceof HTMLElement ? event.target : null;
    if (targetElement?.closest('[data-judgement-drag-handle="true"]')) return;

    const target = event.currentTarget as HTMLElement | null;
    timelinePanDragActive = true;
    timelinePanPointerId = event.pointerId;
    timelinePanStartClientX = event.clientX;
    timelinePanStartViewStartMs = highwayState.state.timelineViewStartMs;
    timelinePanViewDurationMs = highwayState.state.timelineViewDurationMs;
    target?.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function handleTimelinePanPointerMove(event: PointerEvent): void {
    if (!timelinePanDragActive) return;
    if (timelinePanPointerId !== null && event.pointerId !== timelinePanPointerId) return;
    if (gridWidth <= 0) return;

    const deltaPx = event.clientX - timelinePanStartClientX;
    const deltaMs = -(deltaPx / Math.max(1, gridWidth)) * timelinePanViewDurationMs;
    highwayState.setTimelineViewStartMs(timelinePanStartViewStartMs + deltaMs);
    event.preventDefault();
  }

  function stopTimelinePan(target: EventTarget | null, pointerId?: number): void {
    if (!timelinePanDragActive) return;
    timelinePanDragActive = false;
    timelinePanPointerId = null;
    if (
      target instanceof HTMLElement
      && pointerId !== undefined
      && target.hasPointerCapture(pointerId)
    ) {
      target.releasePointerCapture(pointerId);
    }
  }

  function handleTimelinePanPointerUp(event: PointerEvent): void {
    if (timelinePanPointerId !== null && event.pointerId !== timelinePanPointerId) return;
    stopTimelinePan(event.currentTarget, event.pointerId);
  }

  function handleTimelineContextMenu(event: MouseEvent): void {
    if (!timelinePanEnabled) return;
    if (!isPointerInsideGrid(event.clientX)) return;
    event.preventDefault();
  }

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

  function getCachedTimelineTrailHistory(trail: RenderableTakeTrail): PitchHistoryPoint[] {
    const sourcePoints = trail.points;
    if (!sourcePoints || sourcePoints.length === 0) return [];

    const sourceLength = sourcePoints.length;
    const sourceLastOffsetMs = Math.round(sourcePoints[sourceLength - 1]?.offsetMs ?? -1);
    const cached = timelineTrailHistoryCache.get(trail.takeId);
    if (
      cached
      && cached.sourceRef === sourcePoints
      && cached.sourceLength === sourceLength
      && cached.sourceLastOffsetMs === sourceLastOffsetMs
    ) {
      return cached.history;
    }

    const history: PitchHistoryPoint[] = [];
    for (const point of sourcePoints) {
      if (point.offsetMs < 0) continue;
      history.push({
        frequency: point.frequency,
        midi: point.midi,
        clarity: point.clarity,
        time: point.offsetMs,
      });
    }

    timelineTrailHistoryCache.set(trail.takeId, {
      sourceRef: sourcePoints,
      sourceLength,
      sourceLastOffsetMs,
      history,
    });
    return history;
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

    // Support both stationary and highway modes
    const activeConfig = mode === 'singing' ? singingConfig : highwayConfig;
    if (!activeConfig) return;

    const trailHistory = pitchState.state.history;
    let trailHistoryForRender = trailHistory;
    let trailCurrentTime = currentTime;

    if (mode === 'highway' && highwayConfig) {
      const waitingForInput = highwayState.state.isPlaying && highwayState.state.isWaitingForInput;
      if (waitingForInput) {
        if (highwayWaitFreezePerfMs === null) {
          highwayWaitFreezePerfMs = currentTime;
        }
        trailCurrentTime = highwayWaitFreezePerfMs;

        // Clamp post-freeze samples to the freeze timestamp so new points stack at the
        // judgment line instead of scrolling while waitgate pauses highway time.
        const freezeTime = highwayWaitFreezePerfMs;
        const latestPointTime = trailHistory[trailHistory.length - 1]?.time ?? Number.NEGATIVE_INFINITY;
        if (latestPointTime > freezeTime) {
          trailHistoryForRender = trailHistory.map((point) => (
            point.time > freezeTime
              ? { ...point, time: freezeTime }
              : point
          ));
        }
      } else {
        highwayWaitFreezePerfMs = null;
      }
    } else {
      highwayWaitFreezePerfMs = null;
    }

    // Use appropriate nowLineX based on mode
    const nowLineX = mode === 'highway' && highwayConfig
      ? highwayConfig.nowLineX
      : 100;
    const pixelsPerSecond = Math.max(1, activeConfig.pixelsPerSecond ?? 200);
    const timeWindowMs = Math.max(1, activeConfig.timeWindowMs ?? trailConfig.timeWindowMs ?? 4000);

    const coords = createTimeCoordinates({
      cellWidth,
      cellHeight: viewportWindow.cellHeight,
      viewport,
      pixelsPerSecond,
      nowLineX,
      currentTimeMs: mode === 'highway' && highwayConfig ? highwayConfig.currentTimeMs : 0,
      rowPositionOffsets,
    });

    // Compute tonic pitch class dynamically for multi-tonic segments
    const currentTonicPc = appState.state.tonicSegments.length > 0
      ? getTonicPitchClass(appState.getTonicAt(
          mode === 'highway' && highwayConfig ? highwayConfig.currentTimeMs : 0
        ))
      : trailConfig.tonicPitchClass;
    const syncedTrailConfig: PitchTrailConfig = {
      ...trailConfig,
      tonicPitchClass: currentTonicPc,
      pixelsPerSecond,
      timeWindowMs,
      fixedColorRgb: liveMicTrailFixedColor,
    };

    if (mode === 'highway' && highwayConfig) {
      drawPersistentOverdubTrailsInTimeline(trailCtx, highwayConfig, syncedTrailConfig);
    }

    const userPitchConfig: UserPitchRenderConfig = {
      cellHeight: viewportWindow.cellHeight,
      viewportWidth: gridWidth,
      nowLineX,
      pixelsPerSecond,
      timeWindowMs,
      colorMode: 'color',
      trailConfig: syncedTrailConfig,
    };

    if (trailHistoryForRender.length > 0) {
      drawUserPitchTrace(
        trailCtx,
        coords,
        trailHistoryForRender,
        trailCurrentTime,
        userPitchConfig,
        fullRowData
      );
    }

    if (mode === 'highway' && highwayConfig) {
      drawWaitgateGuideArrow(trailCtx, coords, highwayConfig, currentTime);
    }
  }

  function drawPersistentOverdubTrailsInTimeline(
    ctx: CanvasRenderingContext2D,
    config: HighwayModeConfig,
    syncedTrailConfig: PitchTrailConfig
  ): void {
    const trails = persistentOverdubTrails;
    if (trails.length === 0) return;

    const timelinePixelsPerSecond = Math.max(1, config.pixelsPerSecond ?? 200);
    const timelineNowLineX = config.nowLineX;
    const timelineCurrentTimeMs = config.currentTimeMs;
    const timelineWindowMs = Math.max(1, config.timeWindowMs ?? syncedTrailConfig.timeWindowMs ?? 4000);
    const coords = createTimeCoordinates({
      cellWidth,
      cellHeight: viewportWindow.cellHeight,
      viewport,
      pixelsPerSecond: timelinePixelsPerSecond,
      nowLineX: timelineNowLineX,
      currentTimeMs: timelineCurrentTimeMs,
      rowPositionOffsets,
    });

    const persistentTrailConfig: UserPitchRenderConfig = {
      cellHeight: viewportWindow.cellHeight,
      viewportWidth: gridWidth,
      nowLineX: timelineNowLineX,
      pixelsPerSecond: timelinePixelsPerSecond,
      timeWindowMs: timelineWindowMs,
      colorMode: 'color',
      trailConfig: {
        ...syncedTrailConfig,
        pixelsPerSecond: timelinePixelsPerSecond,
        timeWindowMs: timelineWindowMs,
        includeFuturePoints: true,
        fixedColorRgb: null,
      },
    };

    for (const trail of trails) {
      if (!trail.points || trail.points.length === 0) continue;
      const timelineHistory = getCachedTimelineTrailHistory(trail);
      if (timelineHistory.length === 0) continue;
      const trailFixedColor = getRenderableTrailFixedColor(trail);
      const trailConfigWithColor: UserPitchRenderConfig = trailFixedColor
        ? {
            ...persistentTrailConfig,
            trailConfig: {
              ...persistentTrailConfig.trailConfig,
              fixedColorRgb: trailFixedColor,
            },
          }
        : persistentTrailConfig;

      drawUserPitchTrace(
        ctx,
        coords,
        timelineHistory,
        timelineCurrentTimeMs,
        trailConfigWithColor,
        fullRowData
      );
    }
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
      rowPositionOffsets,
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
        fixedColorRgb: liveMicTrailFixedColor,
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

  function drawPersistentOverdubTrails(ctx: CanvasRenderingContext2D, _currentTime: number): void {
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
      rowPositionOffsets,
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
        fixedColorRgb: null,
      },
    };

    for (const trail of trails) {
      if (!trail.points || trail.points.length === 0) continue;
      const timelineHistory = getCachedTimelineTrailHistory(trail);
      if (timelineHistory.length === 0) continue;
      const trailFixedColor = getRenderableTrailFixedColor(trail);
      const trailConfigWithColor: UserPitchRenderConfig = trailFixedColor
        ? {
            ...persistentTrailConfig,
            trailConfig: {
              ...persistentTrailConfig.trailConfig,
              fixedColorRgb: trailFixedColor,
            },
          }
        : persistentTrailConfig;

      drawUserPitchTrace(
        ctx,
        coords,
        timelineHistory,
        phraseDurationMs,
        trailConfigWithColor,
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
    const timelineDurationMs = Math.max(1, Math.round(highwayState.state.timelineDurationMs));
    const timelineViewDurationMs = clampNumber(
      Math.round(highwayState.state.timelineViewDurationMs),
      1,
      timelineDurationMs,
    );

    if (!timelineViewportEnabled) {
      hasSeenTimelineViewDuration = true;
      lastTimelineViewDurationMs = timelineViewDurationMs;
      return;
    }

    if (!hasSeenTimelineViewDuration) {
      hasSeenTimelineViewDuration = true;
      lastTimelineViewDurationMs = timelineViewDurationMs;
      return;
    }

    if (timelineViewDurationMs !== lastTimelineViewDurationMs) {
      lastTimelineViewDurationMs = timelineViewDurationMs;
      showViewportInfoToast();
      return;
    }

    lastTimelineViewDurationMs = timelineViewDurationMs;
  });

  $effect(() => {
    const minMidi = Math.round(appState.state.yAxisRange.minMidi);
    const maxMidi = Math.round(appState.state.yAxisRange.maxMidi);

    if (!hasSeenYAxisRange) {
      hasSeenYAxisRange = true;
      lastYAxisMinMidi = minMidi;
      lastYAxisMaxMidi = maxMidi;
      return;
    }

    if (minMidi !== lastYAxisMinMidi || maxMidi !== lastYAxisMaxMidi) {
      lastYAxisMinMidi = minMidi;
      lastYAxisMaxMidi = maxMidi;
      showViewportInfoToast();
      return;
    }

    lastYAxisMinMidi = minMidi;
    lastYAxisMaxMidi = maxMidi;
  });

  $effect(() => {
    const trails = persistentOverdubTrails;
    const activeTakeIds = new Set<string>();
    for (const trail of trails) {
      activeTakeIds.add(trail.takeId);
    }
    for (const takeId of timelineTrailHistoryCache.keys()) {
      if (!activeTakeIds.has(takeId)) {
        timelineTrailHistoryCache.delete(takeId);
      }
    }
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
    const debugWindow = getTimingGridDebugWindow();
    if (!debugWindow) return;

    const logSnapshot = () => {
      logTimingGridSnapshot('manual');
    };

    debugWindow.__MLT_LOG_TIMING_GRID_SNAPSHOT__ = logSnapshot;

    const intervalId = window.setInterval(() => {
      if (!debugWindow.__MLT_DEBUG_TIMING_GRID__) {
        lastTimingGridDebugKey = null;
        return;
      }

      const snapshot = buildTimingGridDebugSnapshot();
      if (!snapshot) return;

      const currentTimeBucket = Math.round(snapshot.currentTimeMs / 250);
      const key = JSON.stringify([
        snapshot.exerciseId,
        currentTimeBucket,
        snapshot.beatLines[0]?.timeMs ?? null,
        snapshot.measureLines[0]?.timeMs ?? null,
        snapshot.visibleNotes[0]?.startTimeMs ?? null,
      ]);

      if (key === lastTimingGridDebugKey) return;
      lastTimingGridDebugKey = key;
      console.log('[SingingCanvas][TimingGrid]', {
        reason: 'auto',
        ...snapshot,
      });
    }, 250);

    return () => {
      window.clearInterval(intervalId);
      if (debugWindow.__MLT_LOG_TIMING_GRID_SNAPSHOT__ === logSnapshot) {
        delete debugWindow.__MLT_LOG_TIMING_GRID_SNAPSHOT__;
      }
    };
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
    stopTimelinePan(null);
    timelineTrailHistoryCache.clear();
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="singing-canvas-container"
  class:singing-canvas-container--x-pan-active={timelinePanDragActive}
  bind:this={container}
  onwheel={handleGridWheel}
  onpointerdown={handleTimelinePanPointerDown}
  onpointermove={handleTimelinePanPointerMove}
  onpointerup={handleTimelinePanPointerUp}
  onpointercancel={handleTimelinePanPointerUp}
  oncontextmenu={handleTimelineContextMenu}
>
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
    {rowPositionOffsets}
    legendColumnWidthUnits={LEGEND_COLUMN_WIDTH_UNITS}
    colorMode="color"
    {showOctaveLabels}
    {showFrequencyLabels}
    {showLegendLabels}
    accidentalMode={appState.state.accidentalMode}
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
    extendHorizontalGridLinesBehindLegend={true}
    {horizontalGridReferencePitchClass}
    horizontalGridReferenceLineColor="rgba(255, 0, 0, 0.9)"
    judgmentLineColor="#adb5bd"
      targetNoteStyle={appState.state.noteType}
      beatIntervalMs={gridBeatIntervalMs}
      measureIntervalMs={gridMeasureIntervalMs}
      {beatTimeOffsetMs}
      {measureTimeOffsetMs}
    />
  <canvas
    bind:this={trailCanvas}
    class="pitch-trail-canvas"
  ></canvas>

  {#if mode === 'highway' && !useLoopTimeline}
    <div class="judgement-line-overlay" style:left="{gridOffsetX}px" style:width="{gridWidth}px">
      <JudgementLineDragHandle
        canvasWidth={gridWidth}
        gridHeight={containerHeight}
        nowLineX={highwayConfig?.nowLineX ?? highwayState.state.nowLineX}
      />
    </div>
  {/if}

  <!-- Karaoke lyrics display (only shown during Ultrastar playback) -->
  {#if isUltrastarActive && mode === 'highway'}
    <LyricsDisplay />
  {/if}

  <ViewportInfoToast
    lines={viewportInfoLines}
    triggerKey={viewportInfoTriggerKey}
    position="absolute"
    top="16px"
    right="16px"
    zIndex={20}
  />
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

  .singing-canvas-container--x-pan-active {
    cursor: grabbing;
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
