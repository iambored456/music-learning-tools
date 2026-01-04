# Note Highway Phase 6 Implementation Guide

This document outlines the remaining work for completing the Note Highway feature. Phases 1-5 have been completed, providing the core highway engine, rendering, and basic integration. Phase 6 focuses on polish, visual effects, and advanced features.

---

## Completed (Phases 1-5)

✅ **Phase 1**: Core highway service with state management and timing
✅ **Phase 2**: Transport integration for audio coordination
✅ **Phase 3**: PitchGrid rendering with scrolling notes and judgment line
✅ **Phase 4**: Data converters and comprehensive documentation
✅ **Phase 5**: Singing Trainer migration to use engine service

**Current Status**: The highway engine is fully functional with:
- Scrolling note visualization (westward movement)
- Pitch input recording from microphone
- Performance tracking (hit/miss, accuracy metrics)
- Event system for noteHit, noteMissed, etc.
- Console logging for performance feedback

---

## Phase 6 Tasks

### 6.1 Visual Feedback System

**Goal**: Add visual effects for hit/miss feedback, accuracy indicators, and performance visualization.

#### 6.1.1 Note Hit Effects

**Location**: `packages/ui-components/src/canvas/PitchGrid/renderers/effects.ts` (NEW)

Create visual effects for successful note hits:

```typescript
export interface HitEffectConfig {
  noteId: string;
  x: number;
  y: number;
  accuracy: 'perfect' | 'good' | 'okay';
  startTime: number;
  duration: number; // ms
}

export function drawHitGlow(
  ctx: CanvasRenderingContext2D,
  config: HitEffectConfig,
  currentTime: number
): void {
  const elapsed = currentTime - config.startTime;
  if (elapsed > config.duration) return;

  const progress = elapsed / config.duration;
  const opacity = 1 - progress; // Fade out

  // Glow color based on accuracy
  const colors = {
    perfect: 'rgba(0, 255, 100, ',
    good: 'rgba(100, 200, 255, ',
    okay: 'rgba(255, 200, 0, ',
  };

  const baseColor = colors[config.accuracy];
  const radius = 20 + (progress * 30); // Expand outward

  // Outer glow
  const gradient = ctx.createRadialGradient(config.x, config.y, 0, config.x, config.y, radius);
  gradient.addColorStop(0, baseColor + (opacity * 0.6) + ')');
  gradient.addColorStop(0.5, baseColor + (opacity * 0.3) + ')');
  gradient.addColorStop(1, baseColor + '0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(config.x - radius, config.y - radius, radius * 2, radius * 2);
}

export function drawHitParticles(
  ctx: CanvasRenderingContext2D,
  config: HitEffectConfig,
  currentTime: number
): void {
  // TODO: Particle system with upward-floating circles
  // - Spawn 5-10 particles at note position
  // - Float upward with slight randomness
  // - Fade out over 500ms
}
```

**Integration**: Subscribe to `noteHit` events in highway service visual callbacks:

```typescript
// In apps/singing-trainer/src/lib/stores/highwayState.svelte.ts
visualCallbacks: {
  onNoteHit: (noteId: string, accuracy: string) => {
    // Add hit effect to effects queue
    effectsManager.addHitEffect({
      noteId,
      accuracy: accuracy as 'perfect' | 'good' | 'okay',
      // ... position from note data
    });
  },
}
```

#### 6.1.2 Note Miss Effects

**Location**: Same `effects.ts` file

```typescript
export interface MissEffectConfig {
  noteId: string;
  x: number;
  y: number;
  startTime: number;
}

export function drawMissIndicator(
  ctx: CanvasRenderingContext2D,
  config: MissEffectConfig,
  currentTime: number
): void {
  const elapsed = currentTime - config.startTime;
  const duration = 800; // ms
  if (elapsed > duration) return;

  const progress = elapsed / duration;
  const opacity = 1 - progress;

  // Red X indicator
  ctx.strokeStyle = `rgba(255, 50, 50, ${opacity})`;
  ctx.lineWidth = 3;
  const size = 15;

  ctx.beginPath();
  ctx.moveTo(config.x - size, config.y - size);
  ctx.lineTo(config.x + size, config.y + size);
  ctx.moveTo(config.x + size, config.y - size);
  ctx.lineTo(config.x - size, config.y + size);
  ctx.stroke();
}
```

#### 6.1.3 Note Emboldening

**Location**: `packages/ui-components/src/canvas/PitchGrid/renderers/notes.ts`

Modify note rendering to emphasize notes based on hit status:

```typescript
// In drawScrollingNotes():
for (const note of notes) {
  // ... existing position calculations

  // Check if note was hit
  const performance = note.performance;
  let lineWidth = 2;
  let shadowBlur = 0;

  if (performance?.hitStatus === 'hit') {
    lineWidth = 4; // Thicker stroke
    shadowBlur = 8; // Glow effect

    // Set shadow color based on accuracy
    const accuracyColors = {
      perfect: 'rgba(0, 255, 100, 0.8)',
      good: 'rgba(100, 200, 255, 0.6)',
      okay: 'rgba(255, 200, 0, 0.5)',
    };
    ctx.shadowColor = accuracyColors[performance.accuracyTier || 'okay'];
    ctx.shadowBlur = shadowBlur;
  }

  ctx.lineWidth = lineWidth;
  // ... draw note
  ctx.shadowBlur = 0; // Reset
}
```

---

### 6.2 Real-Time Accuracy Display

**Goal**: Show live accuracy metrics during playback.

#### 6.2.1 Accuracy Panel Component

**Location**: `apps/singing-trainer/src/lib/components/feedback/AccuracyPanel.svelte` (NEW)

```svelte
<script lang="ts">
  import { highwayState } from '../../stores/highwayState.svelte.js';

  // Calculate live statistics
  const stats = $derived(() => {
    const performances = highwayState.getPerformanceResults();
    let hits = 0;
    let misses = 0;
    let perfect = 0;
    let good = 0;
    let okay = 0;

    for (const [_, perf] of performances) {
      if (perf.hitStatus === 'hit') {
        hits++;
        if (perf.accuracyTier === 'perfect') perfect++;
        else if (perf.accuracyTier === 'good') good++;
        else okay++;
      } else {
        misses++;
      }
    }

    const total = hits + misses;
    const accuracy = total > 0 ? (hits / total) * 100 : 0;

    return { hits, misses, perfect, good, okay, total, accuracy };
  });
</script>

<div class="accuracy-panel">
  <h3>Performance</h3>
  <div class="stat-row">
    <span class="stat-label">Accuracy:</span>
    <span class="stat-value">{stats().accuracy.toFixed(1)}%</span>
  </div>
  <div class="stat-row">
    <span class="stat-label">Hits:</span>
    <span class="stat-value hit">{stats().hits}</span>
  </div>
  <div class="stat-row">
    <span class="stat-label">Misses:</span>
    <span class="stat-value miss">{stats().misses}</span>
  </div>
  <div class="tier-breakdown">
    <div class="tier perfect">Perfect: {stats().perfect}</div>
    <div class="tier good">Good: {stats().good}</div>
    <div class="tier okay">Okay: {stats().okay}</div>
  </div>
</div>

<style>
  /* TODO: Add styling */
</style>
```

**Integration**: Add to `App.svelte` sidebar when in highway mode.

#### 6.2.2 Accuracy Meter

**Location**: `apps/singing-trainer/src/lib/components/feedback/AccuracyMeter.svelte` (NEW)

Visual gauge showing real-time accuracy percentage (0-100%):

```svelte
<script lang="ts">
  export let accuracy: number; // 0-100

  const fillColor = $derived(() => {
    if (accuracy >= 90) return '#00ff64'; // Perfect
    if (accuracy >= 75) return '#64c8ff'; // Good
    if (accuracy >= 60) return '#ffc800'; // Okay
    return '#ff3232'; // Poor
  });
</script>

<div class="accuracy-meter">
  <div class="meter-fill" style="width: {accuracy}%; background-color: {fillColor()}"></div>
  <span class="meter-text">{accuracy.toFixed(0)}%</span>
</div>
```

---

### 6.3 Enhanced Onramp Countdown

**Goal**: Improve onramp visual with animated countdown and metronome pulse.

#### 6.3.1 Animated Countdown

**Location**: `packages/ui-components/src/canvas/PitchGrid/renderers/onramp.ts` (EXISTS, enhance)

Current implementation shows basic text. Enhance with:

```typescript
export function drawOnrampCountdown(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  beatsRemaining: number,
  config: {
    fontSize?: number;
    pulseAmount?: number;
    showMetronomePulse?: boolean;
    currentBeatFraction?: number; // 0-1 within current beat
  }
): void {
  const fontSize = config.fontSize || 72;
  const pulseAmount = config.pulseAmount || 0.2;

  // Pulse effect based on beat fraction
  const beatFraction = config.currentBeatFraction || 0;
  const pulseFactor = 1 + (pulseAmount * (1 - beatFraction));

  const displayNumber = Math.ceil(beatsRemaining);

  // Draw countdown number with pulse
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(pulseFactor, pulseFactor);

  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Glow effect
  ctx.shadowColor = 'rgba(100, 200, 255, 0.8)';
  ctx.shadowBlur = 20;

  // Draw text
  ctx.fillStyle = '#ffffff';
  ctx.fillText(displayNumber.toString(), 0, 0);

  ctx.restore();

  // Optional metronome pulse circle
  if (config.showMetronomePulse) {
    const pulseRadius = 40 * (1 - beatFraction);
    const pulseOpacity = 0.6 * (1 - beatFraction);

    ctx.strokeStyle = `rgba(100, 200, 255, ${pulseOpacity})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 80 + pulseRadius, 0, Math.PI * 2);
    ctx.stroke();
  }
}
```

**Integration**: Highway service needs to provide `currentBeatFraction`:

```typescript
// In noteHighwayService.ts, add to state:
interface NoteHighwayState {
  // ... existing
  currentBeatFraction: number; // 0-1 within current beat
}

// Update in animation loop:
function updateOnramp(): void {
  if (state.onrampComplete) return;

  const onrampDurationMs = getOnrampDurationMs();
  const beatsRemaining = /* calculate from currentTimeMs */;

  // Calculate beat fraction for pulse animation
  const tempo = finalConfig.stateCallbacks.getTempo();
  const beatDurationMs = (60 / tempo) * 1000;
  state.currentBeatFraction = (Math.abs(state.currentTimeMs) % beatDurationMs) / beatDurationMs;

  // ... rest of logic
}
```

---

### 6.4 Score Screen

**Goal**: Show comprehensive performance summary after playback completes.

#### 6.4.1 Score Screen Component

**Location**: `apps/singing-trainer/src/lib/components/feedback/ScoreScreen.svelte` (NEW)

```svelte
<script lang="ts">
  import type { NotePerformance } from '@mlt/student-notation-engine';

  export let performances: Map<string, NotePerformance>;
  export let onClose: () => void;

  // Calculate statistics
  const stats = $derived(() => {
    let hits = 0;
    let misses = 0;
    let totalOnsetError = 0;
    let totalPitchError = 0;
    let totalCoverage = 0;

    const tiers = { perfect: 0, good: 0, okay: 0 };

    for (const [_, perf] of performances) {
      if (perf.hitStatus === 'hit') {
        hits++;
        totalOnsetError += Math.abs(perf.onsetAccuracyMs);
        totalPitchError += Math.abs(perf.pitchAccuracyCents);
        totalCoverage += perf.pitchCoverage;

        if (perf.accuracyTier === 'perfect') tiers.perfect++;
        else if (perf.accuracyTier === 'good') tiers.good++;
        else tiers.okay++;
      } else {
        misses++;
      }
    }

    const total = hits + misses;
    const accuracy = total > 0 ? (hits / total) * 100 : 0;
    const avgOnsetError = hits > 0 ? totalOnsetError / hits : 0;
    const avgPitchError = hits > 0 ? totalPitchError / hits : 0;
    const avgCoverage = hits > 0 ? totalCoverage / hits : 0;

    // Letter grade
    let grade = 'F';
    if (accuracy >= 95 && tiers.perfect / hits > 0.7) grade = 'S';
    else if (accuracy >= 90) grade = 'A';
    else if (accuracy >= 80) grade = 'B';
    else if (accuracy >= 70) grade = 'C';
    else if (accuracy >= 60) grade = 'D';

    return {
      hits,
      misses,
      total,
      accuracy,
      avgOnsetError,
      avgPitchError,
      avgCoverage,
      tiers,
      grade,
    };
  });
</script>

<div class="score-screen-overlay">
  <div class="score-screen">
    <h2>Performance Results</h2>

    <div class="grade-display">
      <span class="grade">{stats().grade}</span>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{stats().accuracy.toFixed(1)}%</div>
        <div class="stat-label">Accuracy</div>
      </div>

      <div class="stat-card">
        <div class="stat-value">{stats().hits}/{stats().total}</div>
        <div class="stat-label">Notes Hit</div>
      </div>

      <div class="stat-card">
        <div class="stat-value">{stats().avgOnsetError.toFixed(0)}ms</div>
        <div class="stat-label">Avg Timing Error</div>
      </div>

      <div class="stat-card">
        <div class="stat-value">{stats().avgPitchError.toFixed(0)}¢</div>
        <div class="stat-label">Avg Pitch Error</div>
      </div>

      <div class="stat-card">
        <div class="stat-value">{stats().avgCoverage.toFixed(0)}%</div>
        <div class="stat-label">Avg Coverage</div>
      </div>
    </div>

    <div class="tier-breakdown">
      <h3>Accuracy Breakdown</h3>
      <div class="tier-bar perfect" style="width: {(stats().tiers.perfect / stats().hits) * 100}%">
        Perfect: {stats().tiers.perfect}
      </div>
      <div class="tier-bar good" style="width: {(stats().tiers.good / stats().hits) * 100}%">
        Good: {stats().tiers.good}
      </div>
      <div class="tier-bar okay" style="width: {(stats().tiers.okay / stats().hits) * 100}%">
        Okay: {stats().tiers.okay}
      </div>
    </div>

    <button class="close-btn" onclick={onClose}>Close</button>
  </div>
</div>

<style>
  .score-screen-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .score-screen {
    background-color: var(--color-bg-light);
    border-radius: var(--radius-lg);
    padding: var(--spacing-xl);
    max-width: 600px;
    width: 90%;
  }

  .grade-display {
    text-align: center;
    margin: var(--spacing-lg) 0;
  }

  .grade {
    font-size: 120px;
    font-weight: bold;
    color: var(--color-primary);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: var(--spacing-md);
    margin: var(--spacing-lg) 0;
  }

  .stat-card {
    background-color: var(--color-bg);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    text-align: center;
  }

  .stat-value {
    font-size: var(--font-size-xl);
    font-weight: bold;
    color: var(--color-text);
  }

  .stat-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    margin-top: var(--spacing-xs);
  }

  .tier-breakdown {
    margin: var(--spacing-lg) 0;
  }

  .tier-bar {
    padding: var(--spacing-sm);
    margin: var(--spacing-xs) 0;
    border-radius: var(--radius-sm);
    color: white;
    font-weight: 600;
  }

  .tier-bar.perfect {
    background-color: #00ff64;
  }

  .tier-bar.good {
    background-color: #64c8ff;
  }

  .tier-bar.okay {
    background-color: #ffc800;
  }

  .close-btn {
    width: 100%;
    padding: var(--spacing-md);
    border: none;
    border-radius: var(--radius-md);
    background-color: var(--color-primary);
    color: white;
    font-size: var(--font-size-md);
    font-weight: 600;
    cursor: pointer;
  }
</style>
```

**Integration**: Show when `performanceComplete` event is emitted:

```typescript
// In App.svelte or SingingCanvas.svelte
let showScoreScreen = $state(false);
let scorePerformances = $state<Map<string, NotePerformance>>(new Map());

// In highway event handler:
if (event === 'performanceComplete') {
  scorePerformances = highwayState.getPerformanceResults();
  showScoreScreen = true;
}
```

---

### 6.5 Ultrastar TXT Parser

**Goal**: Support importing songs from Ultrastar TXT format.

#### 6.5.1 Parser Module

**Location**: `packages/handoff/src/ultrastarParser.ts` (NEW)

```typescript
/**
 * Ultrastar TXT Parser
 *
 * Parses Ultrastar TXT karaoke files into HighwayTargetNote format.
 *
 * Format reference: https://github.com/UltraStar-Deluxe/USDX/wiki/Song-File-Format
 */

export interface UltrastarNote {
  type: 'regular' | 'golden' | 'freestyle';
  startBeat: number;
  durationBeats: number;
  pitch: number; // MIDI-style
  text: string;
}

export interface UltrastarMetadata {
  title?: string;
  artist?: string;
  bpm: number;
  gap?: number; // ms offset
  video?: string;
  cover?: string;
  background?: string;
}

export interface UltrastarSong {
  metadata: UltrastarMetadata;
  notes: UltrastarNote[];
}

export function parseUltrastarTxt(content: string): UltrastarSong {
  const lines = content.split('\n');
  const metadata: Partial<UltrastarMetadata> = {};
  const notes: UltrastarNote[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Metadata
    if (trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.slice(1).split(':');
      const value = valueParts.join(':').trim();

      switch (key.toUpperCase()) {
        case 'TITLE':
          metadata.title = value;
          break;
        case 'ARTIST':
          metadata.artist = value;
          break;
        case 'BPM':
          metadata.bpm = parseFloat(value.replace(',', '.'));
          break;
        case 'GAP':
          metadata.gap = parseFloat(value);
          break;
        case 'VIDEO':
          metadata.video = value;
          break;
        case 'COVER':
          metadata.cover = value;
          break;
        case 'BACKGROUND':
          metadata.background = value;
          break;
      }
    }

    // Note line
    else if (trimmed.match(/^[:\*F]/)) {
      const parts = trimmed.split(' ');
      const type = parts[0];
      const startBeat = parseInt(parts[1]);
      const durationBeats = parseInt(parts[2]);
      const pitch = parseInt(parts[3]);
      const text = parts.slice(4).join(' ');

      notes.push({
        type: type === ':' ? 'regular' : type === '*' ? 'golden' : 'freestyle',
        startBeat,
        durationBeats,
        pitch,
        text,
      });
    }

    // End marker
    else if (trimmed === 'E') {
      break;
    }
  }

  return {
    metadata: {
      bpm: metadata.bpm || 120,
      ...metadata,
    },
    notes,
  };
}

/**
 * Convert Ultrastar notes to Highway target notes
 */
export function ultrastarToHighway(
  song: UltrastarSong,
  config: {
    gap?: number; // Additional timing offset in ms
  } = {}
): HighwayTargetNote[] {
  const bpm = song.metadata.bpm;
  const beatDurationMs = (60 / bpm) * 1000;
  const gap = config.gap || song.metadata.gap || 0;

  return song.notes
    .filter(note => note.type !== 'freestyle') // Skip freestyle notes
    .map((note, index) => ({
      id: `ultrastar-${index}`,
      midi: note.pitch,
      startTimeMs: (note.startBeat * beatDurationMs) + gap,
      durationMs: note.durationBeats * beatDurationMs,
      startColumn: note.startBeat,
      endColumn: note.startBeat + note.durationBeats,
      color: note.type === 'golden' ? '#FFD700' : '#3b82f6',
      shape: 'oval' as const,
      globalRow: note.pitch - 60, // Adjust to Student Notation row system
    }));
}
```

#### 6.5.2 File Import UI

**Location**: `apps/singing-trainer/src/lib/components/controls/FileImport.svelte` (NEW)

```svelte
<script lang="ts">
  import { parseUltrastarTxt, ultrastarToHighway } from '@mlt/handoff';
  import { highwayState } from '../../stores/highwayState.svelte.js';

  let fileInput: HTMLInputElement;

  async function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const song = parseUltrastarTxt(content);
      const targetNotes = ultrastarToHighway(song);

      // Convert to local format and set
      const localNotes = targetNotes.map(n => ({
        midi: n.midi,
        startTimeMs: n.startTimeMs,
        durationMs: n.durationMs,
      }));

      highwayState.setTargetNotes(localNotes);

      console.log(`Loaded ${localNotes.length} notes from ${song.metadata.title || file.name}`);
    } catch (err) {
      console.error('Failed to parse Ultrastar file:', err);
      alert('Failed to load file. Please ensure it is a valid Ultrastar TXT file.');
    }
  }
</script>

<div class="file-import">
  <label for="ultrastar-file" class="import-label">
    Import Ultrastar TXT
  </label>
  <input
    id="ultrastar-file"
    type="file"
    accept=".txt"
    bind:this={fileInput}
    on:change={handleFileSelect}
  />
</div>
```

---

### 6.6 Configuration Presets

**Goal**: Provide preset configurations for different difficulty levels.

#### 6.6.1 Preset System

**Location**: `packages/student-notation-engine/src/highway/presets.ts` (NEW)

```typescript
import type { FeedbackCollectorConfig } from './types.js';

export interface DifficultyPreset {
  name: string;
  description: string;
  feedbackConfig: Partial<FeedbackCollectorConfig>;
  pixelsPerSecond: number;
}

export const DIFFICULTY_PRESETS: Record<string, DifficultyPreset> = {
  beginner: {
    name: 'Beginner',
    description: 'Generous timing and pitch windows',
    feedbackConfig: {
      onsetToleranceMs: 200,
      releaseToleranceMs: 250,
      pitchToleranceCents: 75,
      hitThreshold: 60,
    },
    pixelsPerSecond: 150, // Slower scroll
  },

  intermediate: {
    name: 'Intermediate',
    description: 'Balanced difficulty',
    feedbackConfig: {
      onsetToleranceMs: 100,
      releaseToleranceMs: 150,
      pitchToleranceCents: 50,
      hitThreshold: 70,
    },
    pixelsPerSecond: 200,
  },

  advanced: {
    name: 'Advanced',
    description: 'Strict timing and pitch requirements',
    feedbackConfig: {
      onsetToleranceMs: 50,
      releaseToleranceMs: 75,
      pitchToleranceCents: 25,
      hitThreshold: 85,
    },
    pixelsPerSecond: 250, // Faster scroll
  },

  expert: {
    name: 'Expert',
    description: 'Professional-level precision',
    feedbackConfig: {
      onsetToleranceMs: 25,
      releaseToleranceMs: 50,
      pitchToleranceCents: 15,
      hitThreshold: 95,
    },
    pixelsPerSecond: 300,
  },
};

export function applyPreset(preset: DifficultyPreset): Partial<NoteHighwayConfig> {
  return {
    pixelsPerSecond: preset.pixelsPerSecond,
    feedbackConfig: preset.feedbackConfig,
  };
}
```

#### 6.6.2 Difficulty Selector UI

**Location**: `apps/singing-trainer/src/lib/components/controls/DifficultySelector.svelte` (NEW)

```svelte
<script lang="ts">
  import { DIFFICULTY_PRESETS, applyPreset } from '@mlt/student-notation-engine';

  let selectedDifficulty = $state('intermediate');

  function handleChange() {
    const preset = DIFFICULTY_PRESETS[selectedDifficulty];
    if (!preset) return;

    // Apply to highway state
    const config = applyPreset(preset);
    // TODO: Update highway service config
    console.log('Applied difficulty preset:', preset.name);
  }
</script>

<div class="difficulty-selector">
  <label for="difficulty">Difficulty</label>
  <select id="difficulty" bind:value={selectedDifficulty} on:change={handleChange}>
    {#each Object.entries(DIFFICULTY_PRESETS) as [key, preset]}
      <option value={key}>{preset.name}</option>
    {/each}
  </select>
  <p class="description">{DIFFICULTY_PRESETS[selectedDifficulty].description}</p>
</div>
```

---

## Testing Checklist

Before considering Phase 6 complete, verify:

- [ ] Hit effects render correctly with proper timing
- [ ] Miss indicators appear when notes are missed
- [ ] Hit notes show emboldening/glow
- [ ] Accuracy panel updates in real-time
- [ ] Score screen displays correct statistics
- [ ] Onramp countdown pulses with metronome
- [ ] Ultrastar TXT files load correctly
- [ ] Different difficulty presets work as expected
- [ ] Performance is smooth (60 FPS) with effects enabled
- [ ] Effects cleanup properly when playback stops

---

## Performance Considerations

### Effects Manager

Create a centralized effects manager to handle all visual effects efficiently:

**Location**: `apps/singing-trainer/src/lib/services/effectsManager.ts` (NEW)

```typescript
export interface Effect {
  id: string;
  type: 'hit' | 'miss' | 'particle';
  startTime: number;
  duration: number;
  data: any;
}

export class EffectsManager {
  private effects: Effect[] = [];
  private nextId = 0;

  addEffect(type: Effect['type'], data: any, duration: number): string {
    const id = `effect-${this.nextId++}`;
    this.effects.push({
      id,
      type,
      startTime: performance.now(),
      duration,
      data,
    });
    return id;
  }

  update(currentTime: number): void {
    // Remove expired effects
    this.effects = this.effects.filter(
      effect => currentTime - effect.startTime < effect.duration
    );
  }

  getActiveEffects(): Effect[] {
    return this.effects;
  }

  clear(): void {
    this.effects = [];
  }
}
```

### Canvas Layer Separation

Consider rendering effects on a separate canvas layer for better performance:

```svelte
<!-- In SingingCanvas.svelte -->
<canvas bind:this={gridCanvas} class="grid-canvas"></canvas>
<canvas bind:this={effectsCanvas} class="effects-canvas"></canvas>
<canvas bind:this={trailCanvas} class="trail-canvas"></canvas>
```

This allows effects to be cleared and redrawn without redrawing the entire grid.

---

## Future Enhancements (Beyond Phase 6)

- **Multiplayer Mode**: Compete with other users in real-time
- **Leaderboards**: Track high scores and upload to server
- **Custom Themes**: User-configurable color schemes
- **Replay System**: Record and replay performances
- **Practice Mode**: Loop difficult sections
- **Audio Export**: Save vocal recordings
- **MIDI Input**: Support MIDI keyboards as input source
- **Mobile Support**: Touch controls for mobile devices

---

## Dependencies

Phase 6 introduces no new external dependencies. All features can be implemented using:
- Existing Svelte 5 components
- Canvas 2D API
- Performance API for timing
- File API for Ultrastar import

---

## Estimated Effort

| Task | Complexity | Estimated Time |
|------|------------|----------------|
| 6.1 Visual Feedback | Medium | 4-6 hours |
| 6.2 Accuracy Display | Low | 2-3 hours |
| 6.3 Enhanced Onramp | Low | 1-2 hours |
| 6.4 Score Screen | Medium | 3-4 hours |
| 6.5 Ultrastar Parser | Medium | 4-5 hours |
| 6.6 Presets | Low | 1-2 hours |
| Testing & Polish | - | 3-4 hours |
| **Total** | | **18-26 hours** |

---

## References

- [HIGHWAY-API.md](./HIGHWAY-API.md) - Complete API reference
- [HIGHWAY-INTEGRATION.md](./HIGHWAY-INTEGRATION.md) - Integration guide
- [Ultrastar Format](https://github.com/UltraStar-Deluxe/USDX/wiki/Song-File-Format)
- [CLAUDE.md](../../CLAUDE.md) - Build commands

---

**Note**: All TODO comments in the codebase marked with "Phase 6" reference this document.
