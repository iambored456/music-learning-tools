# Note Highway API Reference

Complete API documentation for the Note Highway module.

---

## Core Services

### `createNoteHighwayService(config: NoteHighwayConfig): NoteHighwayServiceInstance`

Creates a Note Highway service instance.

**Parameters:**
- `config.judgmentLinePosition` (number, default: 0.12) - Position as fraction of viewport width (0-1)
- `config.pixelsPerSecond` (number, default: 200) - Scroll speed
- `config.lookAheadMs` (number, default: 3000) - Time window ahead of judgment line
- `config.scrollMode` ('constant-speed' | 'constant-density', default: 'constant-speed')
- `config.leadInBeats` (number, default: 4) - Onramp beats before content
- `config.playMetronomeDuringOnramp` (boolean, default: true)
- `config.playTargetNotes` (boolean, default: true)
- `config.playMetronome` (boolean, default: false)
- `config.inputSources` (InputSource[], default: ['microphone'])
- `config.feedbackConfig` (FeedbackCollectorConfig) - Feedback thresholds
- `config.stateCallbacks` (HighwayStateCallbacks) - Required state access
- `config.eventCallbacks` (HighwayEventCallbacks) - Required event system
- `config.visualCallbacks` (HighwayVisualCallbacks, optional) - Visual updates
- `config.logger` (HighwayLogger, optional) - Logging

**Returns:** `NoteHighwayServiceInstance`

**Methods:**
- `init(notes: HighwayTargetNote[]): void` - Initialize with target notes
- `start(): void` - Start playback from beginning (includes onramp)
- `pause(): void` - Pause playback
- `resume(): void` - Resume paused playback
- `stop(): void` - Stop and reset
- `setScrollOffset(timeMs: number): void` - Seek to time position
- `recordPitchInput(midi: number, clarity: number, source: InputSource): void` - Record user input
- `getState(): Readonly<NoteHighwayState>` - Get current state
- `getVisibleNotes(): HighwayTargetNote[]` - Get notes in viewport
- `getPerformanceResults(): Map<string, NotePerformance>` - Get all performance data
- `getFeedbackCollector(): FeedbackCollectorInstance` - Get feedback collector
- `dispose(): void` - Cleanup resources

---

### `createFeedbackCollector(config?: Partial<FeedbackCollectorConfig>): FeedbackCollectorInstance`

Creates a feedback collector for performance analysis.

**Parameters:**
- `config.onsetToleranceMs` (number, default: 100) - Max onset timing deviation
- `config.releaseToleranceMs` (number, default: 150) - Max release timing deviation
- `config.pitchToleranceCents` (number, default: 50) - Max pitch deviation
- `config.hitThreshold` (number, default: 70) - Min % coverage for hit
- `config.accuracyTiers` (object, optional) - Thresholds for perfect/good/okay

**Returns:** `FeedbackCollectorInstance`

**Methods:**
- `startNote(noteId: string, note: HighwayTargetNote): void` - Begin tracking note
- `recordPitchSample(sample: PitchSample): void` - Record pitch input
- `endNote(noteId: string): NotePerformance | null` - Finish and analyze
- `getCurrentPerformance(noteId: string): Partial<NotePerformance> | null` - Get partial data
- `getAllPerformances(): Map<string, NotePerformance>` - Get all results
- `reset(): void` - Clear all data
- `dispose(): void` - Cleanup

---

## Data Converters

### `convertStateToHighway(state: StudentNotationState, timeMap?: number[]): HighwayTargetNote[]`

Convert Student Notation state to Highway target notes (convenience function).

**Parameters:**
- `state.placedNotes` - Array of placed notes
- `state.tempo` - Tempo in BPM
- `state.cellWidth` - Cell width in pixels
- `state.columnWidths` (optional) - Column width multipliers
- `timeMap` (optional) - Pre-calculated time map

**Returns:** Array of HighwayTargetNote

---

### `convertNotesToHighway(notes: PlacedNote[], config: ConverterConfig): HighwayTargetNote[]`

Convert PlacedNotes to HighwayTargetNotes (detailed control).

**Parameters:**
- `notes` - Array of placed notes
- `config.tempo` - Tempo in BPM
- `config.cellWidth` - Cell width in pixels
- `config.timeMap` (optional) - Time map for accurate timing
- `config.microbeatDurationSec` (optional) - Manual microbeat duration

**Returns:** Array of HighwayTargetNote

---

### `convertNoteToHighway(note: PlacedNote, config: ConverterConfig): HighwayTargetNote`

Convert a single note.

---

### `createSimpleTimeMap(columnWidths: number[], microbeatDurationSec: number): number[]`

Create a basic time map from column widths.

---

### `calculateMicrobeatDuration(tempo: number): number`

Calculate microbeat (eighth note) duration in seconds.

---

## Types

### `HighwayTargetNote`

```typescript
interface HighwayTargetNote {
  id: string;
  midi: number;
  startTimeMs: number;
  durationMs: number;
  startColumn: number;
  endColumn: number;
  color: string;
  shape: 'oval' | 'circle' | 'diamond';
  globalRow: number;
  performance?: NotePerformance;
}
```

---

### `NotePerformance`

```typescript
interface NotePerformance {
  hitStatus: 'hit' | 'miss';
  onsetAccuracyMs: number;      // Negative = early, positive = late
  releaseAccuracyMs: number;
  pitchAccuracyCents: number;   // Average deviation
  pitchCoverage: number;        // Percentage (0-100)
  pitchSamples: PitchSample[];
  accuracyTier?: string;        // 'perfect' | 'good' | 'okay' | 'miss'
}
```

---

### `NoteHighwayState`

```typescript
interface NoteHighwayState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTimeMs: number;        // Can be negative during onramp
  scrollOffset: number;         // Pixels from start
  onrampComplete: boolean;
  targetNotes: HighwayTargetNote[];
  activeNotes: Set<string>;     // Note IDs currently active
  startTime: number | null;
}
```

---

### `PitchSample`

```typescript
interface PitchSample {
  timeMs: number;
  midi: number;
  clarity: number;              // 0-1 confidence
  source: 'microphone' | 'keyboard';
}
```

---

## Events

The highway service emits these events through `eventCallbacks.emit()`:

- **`playbackStarted`** - Playback has started (includes onramp)
- **`playbackPaused`** - Playback paused
- **`playbackResumed`** - Playback resumed
- **`playbackStopped`** - Playback stopped
- **`onrampComplete`** - Lead-in finished, content starts
- **`noteEntered`** - Note entered judgment window
  - Data: `{ noteId, note }`
- **`noteExited`** - Note exited judgment window
  - Data: `{ noteId, note }`
- **`noteHit`** - Note was successfully hit
  - Data: `{ noteId, note, performance }`
- **`noteMissed`** - Note was missed
  - Data: `{ noteId, note, performance }`
- **`performanceComplete`** - All notes evaluated

---

## Callbacks

### `HighwayStateCallbacks`

Required callbacks for state access:

```typescript
interface HighwayStateCallbacks {
  getTempo(): number;
  getCellWidth(): number;
  getViewportWidth(): number;
  getTimeMap?(): number[];
  getColumnWidth?(columnIndex: number): number;
}
```

---

### `HighwayEventCallbacks`

Required callbacks for events:

```typescript
interface HighwayEventCallbacks {
  emit(event: string, data?: unknown): void;
  on?(event: string, handler: (data?: unknown) => void): void;
}
```

---

### `HighwayVisualCallbacks`

Optional callbacks for visual updates:

```typescript
interface HighwayVisualCallbacks {
  clearCanvas?(): void;
  drawJudgmentLine?(x: number, height: number): void;
  onNoteHit?(noteId: string, accuracy: string): void;
  onNoteMiss?(noteId: string): void;
  updateOnrampCountdown?(beatsRemaining: number): void;
  clearOnrampCountdown?(): void;
}
```

---

## PitchGrid Props

For scrolling grid mode in `@mlt/ui-components`:

### `ScrollingGridData`

```typescript
interface ScrollingGridData {
  placedNotes: PlacedNote[];
  columnWidths: number[];
  macrobeatGroupings: MacrobeatGrouping[];
  macrobeatBoundaryStyles: MacrobeatBoundaryStyle[];
  modulationMarkers?: ModulationMarker[];
  drumNotes?: PlacedNote[];
  tonicSigns?: TonicSign[];
}
```

### `HighwayModeConfig`

```typescript
interface HighwayModeConfig extends SingingModeConfig {
  nowLineX: number;
  currentTimeMs: number;
  scrollOffset?: number;
  scrollingGridData?: ScrollingGridData;
  showOnrampCountdown?: boolean;
  onrampBeatsRemaining?: number;
}
```

---

## Transport Integration

### `TransportConfig` (extended)

```typescript
interface TransportConfig {
  // ... existing fields
  playbackMode?: 'standard' | 'highway';
  highwayService?: NoteHighwayServiceInstance;
}
```

When `playbackMode === 'highway'`:
- Transport skips playhead animation
- Highway service handles visual updates
- Both services share Tone.Transport time reference

---

## Constants

### Default Configuration

```typescript
const DEFAULT_CONFIG = {
  judgmentLinePosition: 0.12,
  pixelsPerSecond: 200,
  lookAheadMs: 3000,
  scrollMode: 'constant-speed',
  leadInBeats: 4,
  playMetronomeDuringOnramp: true,
  playTargetNotes: true,
  playMetronome: false,
  inputSources: ['microphone'],
  feedbackConfig: {
    onsetToleranceMs: 100,
    releaseToleranceMs: 150,
    pitchToleranceCents: 50,
    hitThreshold: 70,
  },
};
```

---

## See Also

- [Integration Guide](./HIGHWAY-INTEGRATION.md) - Complete integration examples
- [CLAUDE.md](../../CLAUDE.md) - Build commands and architecture
- [Implementation Plan](../../IMPLEMENTATION-PLAN.md) - Design decisions
