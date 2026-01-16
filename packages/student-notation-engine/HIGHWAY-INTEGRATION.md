# Note Highway Integration Guide

This guide shows how to integrate the Note Highway playback mode into your application.

## Overview

The Note Highway system provides a "Guitar Hero" style scrolling playback mode where:
- Notes scroll **westward** (right-to-left) toward a static **judgment line**
- Users can provide pitch input via microphone or keyboard
- The system tracks performance with detailed accuracy metrics
- Visual feedback shows hit/miss status and accuracy

---

## Installation

The Note Highway is part of `@mlt/student-notation-engine`:

```bash
pnpm add @mlt/student-notation-engine
```

---

## Basic Usage

### 1. Import the Required Modules

```typescript
import {
  createNoteHighwayService,
  convertStateToHighway,
  type NoteHighwayConfig,
  type HighwayTargetNote,
} from '@mlt/student-notation-engine';
```

### 2. Convert Your Notes to Highway Format

```typescript
// If you have Student Notation state
const targetNotes = convertStateToHighway(state, timeMap);

// Or convert individual notes
import { convertNotesToHighway } from '@mlt/student-notation-engine';

const config = {
  tempo: 120,
  cellWidth: 20,
  timeMap: timeMapCalculator.getTimeMap(),
};

const targetNotes = convertNotesToHighway(state.placedNotes, config);
```

### 3. Create the Highway Service

```typescript
const highwayService = createNoteHighwayService({
  // Scroll configuration
  judgmentLinePosition: 0.12,  // 12% from left edge
  pixelsPerSecond: 200,
  lookAheadMs: 3000,
  scrollMode: 'constant-speed',

  // Onramp configuration
  leadInBeats: 4,
  playMetronomeDuringOnramp: true,

  // Audio configuration
  playTargetNotes: true,
  playMetronome: false,

  // Input configuration
  inputSources: ['microphone'],

  // Feedback configuration
  feedbackConfig: {
    onsetToleranceMs: 100,
    releaseToleranceMs: 150,
    pitchToleranceCents: 50,
    hitThreshold: 70,
  },

  // State callbacks
  stateCallbacks: {
    getTempo: () => store.state.tempo,
    getCellWidth: () => store.state.cellWidth,
    getViewportWidth: () => canvasElement.width,
  },

  // Event callbacks
  eventCallbacks: {
    emit: (event, data) => store.emit(event, data),
    on: (event, handler) => store.on(event, handler),
  },

  // Visual callbacks (optional)
  visualCallbacks: {
    drawJudgmentLine: (x, height) => {
      // Draw your custom judgment line
    },
    onNoteHit: (noteId, accuracy) => {
      console.log(`Note ${noteId} hit with ${accuracy} accuracy!`);
    },
    onNoteMiss: (noteId) => {
      console.log(`Note ${noteId} missed!`);
    },
  },

  // Logger (optional)
  logger: {
    debug: (ctx, msg, data) => console.debug(`[${ctx}]`, msg, data),
    info: (ctx, msg, data) => console.info(`[${ctx}]`, msg, data),
    warn: (ctx, msg, data) => console.warn(`[${ctx}]`, msg, data),
    error: (ctx, msg, data) => console.error(`[${ctx}]`, msg, data),
  },
});
```

### 4. Initialize and Start Playback

```typescript
// Initialize with target notes
highwayService.init(targetNotes);

// Start playback (includes onramp)
highwayService.start();

// The service will emit events:
// - 'playbackStarted'
// - 'onrampComplete' (after lead-in beats)
// - 'noteEntered' (when note enters judgment window)
// - 'noteHit' / 'noteMissed'
// - 'playbackStopped'
```

### 5. Record User Input

```typescript
// From microphone pitch detection
function onPitchDetected(frequency: number, clarity: number) {
  const midi = frequencyToMidi(frequency);
  highwayService.recordPitchInput(midi, clarity, 'microphone');
}

// From keyboard input
function onKeyPress(midi: number) {
  highwayService.recordPitchInput(midi, 1.0, 'keyboard');
}
```

### 6. Render the Scrolling Grid

Use the PitchGrid component from `@mlt/ui-components`:

```svelte
<script lang="ts">
  import { PitchGrid } from '@mlt/ui-components/canvas';

  // Get state from highway service
  $: highwayState = highwayService.getState();
  $: scrollOffset = highwayState.scrollOffset;
  $: currentTimeMs = highwayState.currentTimeMs;
  $: onrampBeatsRemaining = /* calculate from currentTimeMs */;

  const highwayConfig = {
    // ... singing mode config
    nowLineX: viewportWidth * 0.12,
    currentTimeMs,
    scrollOffset,

    // Scrolling grid data (Student Notation style)
    scrollingGridData: {
      placedNotes: state.placedNotes,
      columnWidths: state.columnWidths,
      macrobeatGroupings: state.macrobeatGroupings,
      macrobeatBoundaryStyles: state.macrobeatBoundaryStyles,
      tonicSigns: state.placedTonicSigns,
    },

    // Onramp
    showOnrampCountdown: !highwayState.onrampComplete,
    onrampBeatsRemaining,
  };
</script>

<PitchGrid
  mode="highway"
  {fullRowData}
  {viewport}
  {cellWidth}
  {cellHeight}
  {highwayConfig}
/>
```

### 7. Control Playback

```typescript
// Pause
highwayService.pause();

// Resume
highwayService.resume();

// Stop
highwayService.stop();

// Seek to specific time
highwayService.setScrollOffset(5000); // 5 seconds

// Get performance results
const performances = highwayService.getPerformanceResults();
for (const [noteId, perf] of performances) {
  console.log(`Note ${noteId}:`, {
    hitStatus: perf.hitStatus,
    onsetAccuracy: perf.onsetAccuracyMs,
    pitchAccuracy: perf.pitchAccuracyCents,
    coverage: perf.pitchCoverage,
  });
}
```

---

## Integration with Transport Service

To coordinate audio playback with highway visuals:

```typescript
import { createTransportService } from '@mlt/student-notation-engine';

// Create highway service first
const highwayService = createNoteHighwayService(/* config */);

// Create transport with highway mode
const transportService = createTransportService({
  synthEngine,
  stateCallbacks,
  eventCallbacks,
  visualCallbacks,

  // Highway mode configuration
  playbackMode: 'highway',
  highwayService,
});

// When you start playback:
transportService.start();  // Handles audio scheduling
highwayService.start();     // Handles visual scrolling

// The transport will skip playhead animation in highway mode
// The highway service handles all visual updates
```

---

## Event Handling

Subscribe to highway events:

```typescript
eventCallbacks.on('noteEntered', ({ noteId, note }) => {
  console.log('Note entered judgment window:', note);
});

eventCallbacks.on('noteHit', ({ noteId, note, performance }) => {
  console.log('Hit!', {
    accuracy: performance.accuracyTier,
    onsetMs: performance.onsetAccuracyMs,
  });

  // Trigger visual effects
  showParticleEffect(note);
  playHitSound();
});

eventCallbacks.on('noteMissed', ({ noteId, note, performance }) => {
  console.log('Missed', performance);
});

eventCallbacks.on('onrampComplete', () => {
  console.log('Onramp finished, playback starting!');
});

eventCallbacks.on('performanceComplete', () => {
  const results = highwayService.getPerformanceResults();
  showScoreScreen(results);
});
```

---

## Advanced: Custom Feedback Collector

Create a custom feedback collector with different thresholds:

```typescript
import { createFeedbackCollector } from '@mlt/student-notation-engine';

const customCollector = createFeedbackCollector({
  onsetToleranceMs: 50,     // Stricter timing
  pitchToleranceCents: 25,  // Stricter pitch
  hitThreshold: 85,         // Need 85% coverage

  accuracyTiers: {
    perfect: { onsetMs: 20, pitchCents: 5, coverage: 95 },
    good: { onsetMs: 50, pitchCents: 15, coverage: 90 },
    okay: { onsetMs: 100, pitchCents: 30, coverage: 80 },
  },
});

// Use it in your highway service config
const highwayService = createNoteHighwayService({
  // ... other config
  feedbackConfig: customCollector,
});
```

---

## Scrolling Grid Data Format

When using Student Notation scrolling mode, provide data in this format:

```typescript
const scrollingGridData = {
  placedNotes: [
    {
      uuid: 'note-1',
      startColumnIndex: 0,
      endColumnIndex: 2,
      globalRow: 35,  // MIDI 73 (C#5)
      shape: 'oval',
      color: '#FF0000',
      isDrum: false,
    },
    // ... more notes
  ],

  columnWidths: [1, 1, 1, 2, 1, 1], // Width multipliers

  macrobeatGroupings: [2, 3, 2],    // 2-beat, 3-beat patterns

  macrobeatBoundaryStyles: [
    'solid',
    'dashed',
    'solid',
  ],

  tempoModulationMarkers: [
    {
      measureIndex: 4,
      ratio: 0.5,  // Half speed
      active: true,
    },
  ],
};
```

---

## Troubleshooting

### Notes not scrolling
- Check that `scrollOffset` is updating in the highway state
- Verify `highwayService.start()` was called
- Ensure the animation loop is running (check browser dev tools performance)

### Hit detection not working
- Verify input is being recorded: `highwayService.recordPitchInput()`
- Check tolerance settings in `feedbackConfig`
- Ensure notes have correct `startTimeMs` and `durationMs`

### Audio out of sync with visuals
- Make sure transport and highway use the same time reference
- Check that tempo changes are reflected in both services
- Verify `timeMap` is correct

---

## Next Steps

- See `CLAUDE.md` for build commands
- Check `packages/student-notation-engine/src/highway/` for source code
- Look at `packages/ui-components/src/canvas/PitchGrid/` for rendering
- Review the implementation plan in the Git history

For questions or issues, check the GitHub repository.
