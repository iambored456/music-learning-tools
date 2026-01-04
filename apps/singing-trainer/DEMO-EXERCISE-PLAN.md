# Demo Exercise Feature - Implementation Plan

## Overview
Add an interactive pitch-matching exercise to the Singing Trainer with visual cues, reference tones, and graded performance feedback.

---

## Exercise Structure

### Pattern (32 microbeats total per loop):
1. **Reference Tone (8 microbeats)**: Play sine wave at target pitch with 👂 emoji
2. **Rest (8 microbeats)**: Silence
3. **User Input (8 microbeats)**: User sings, system grades with 🎤 emoji
4. **Rest (8 microbeats)**: Silence

### Configuration:
- **Number of loops**: Configurable (default: 5)
- **Pitch range**: Configurable (default: use current Y-axis range)
- **Tempo**: Use global tempo or fixed (e.g., 120 BPM)
- **Random pitch selection**: New random pitch for each loop within range

---

## File Structure

### 1. New Store: `demoExerciseState.svelte.ts`
**Location**: `apps/singing-trainer/src/lib/stores/demoExerciseState.svelte.ts`

```typescript
export interface ExerciseConfig {
  numLoops: number;
  minMidi: number;
  maxMidi: number;
  tempo: number;
}

export interface ExerciseState {
  isActive: boolean;
  isPlaying: boolean;
  config: ExerciseConfig;
  currentLoop: number;
  currentPhase: 'reference' | 'rest1' | 'input' | 'rest2';
  currentPitch: number | null;
  results: ExerciseResult[];
}

export interface ExerciseResult {
  loopIndex: number;
  targetPitch: number;
  performance: NotePerformance | null;
  accuracy: number; // 0-100%
}

interface DemoExerciseStore {
  state: ExerciseState;
  configure(config: Partial<ExerciseConfig>): void;
  start(): void;
  stop(): void;
  getResults(): ExerciseResult[];
  getCurrentProgress(): { current: number; total: number };
}
```

**Key Methods**:
- `start()`: Generate exercise notes, set highway state, start playback
- `stop()`: Stop playback, clear state
- `configure()`: Update exercise parameters
- Internal: `generateExerciseNotes()` - Create highway target notes with emojis
- Internal: `handlePhaseTransition()` - Track which phase user is in
- Internal: `collectResults()` - Gather performance data from highway service

### 2. New Component: `DemoExerciseControls.svelte`
**Location**: `apps/singing-trainer/src/lib/components/controls/DemoExerciseControls.svelte`

**UI Elements**:
```svelte
<div class="demo-exercise-panel">
  <h3>Demo Exercise</h3>

  <!-- Configuration (collapsed by default) -->
  <details>
    <summary>Settings</summary>
    <div class="exercise-settings">
      <label>
        Number of loops:
        <input type="number" min="1" max="20" value={config.numLoops} />
      </label>

      <label>
        Tempo (BPM):
        <input type="number" min="60" max="180" value={config.tempo} />
      </label>

      <div class="pitch-range">
        <span>Pitch Range:</span>
        <button>Use Current Range</button>
        <button>Use Full Range</button>
      </div>
    </div>
  </details>

  <!-- Main Controls -->
  <div class="exercise-controls">
    {#if !isActive}
      <button class="start-exercise-btn" onclick={handleStart}>
        Start Demo Exercise
      </button>
    {:else}
      <button class="stop-exercise-btn" onclick={handleStop}>
        Stop Exercise
      </button>

      <div class="progress-indicator">
        Loop {currentLoop + 1} / {totalLoops}
      </div>

      <div class="phase-indicator">
        {#if phase === 'reference'}
          👂 Listen
        {:else if phase === 'input'}
          🎤 Sing
        {:else}
          Rest
        {/if}
      </div>
    {/if}
  </div>

  <!-- Results Display (after completion) -->
  {#if hasResults}
    <div class="exercise-results">
      <h4>Results</h4>
      <div class="results-summary">
        <div class="stat">
          <span class="label">Average Accuracy:</span>
          <span class="value">{averageAccuracy.toFixed(1)}%</span>
        </div>
        <div class="stat">
          <span class="label">Hits:</span>
          <span class="value">{hits}/{total}</span>
        </div>
      </div>

      <details>
        <summary>Detailed Results</summary>
        <div class="results-list">
          {#each results as result, i}
            <div class="result-item">
              <span>Loop {i + 1}: {getPitchName(result.targetPitch)}</span>
              <span class="accuracy" class:hit={result.performance?.hitStatus === 'hit'}>
                {result.accuracy.toFixed(0)}%
              </span>
            </div>
          {/each}
        </div>
      </details>
    </div>
  {/if}
</div>
```

### 3. Modified Files

#### `highwayState.svelte.ts`
Add support for lyrics/emojis on notes:
```typescript
export interface TargetNote {
  midi: number;
  startTimeMs: number;
  durationMs: number;
  hit?: boolean;
  lyric?: string; // NEW: For emoji display
}
```

#### `SingingCanvas.svelte`
No changes needed - PitchGrid should already support rendering lyrics if we use scrollingGridData mode.

#### `App.svelte`
Add DemoExerciseControls to sidebar:
```svelte
<div class="control-group">
  <DemoExerciseControls />
</div>
```

---

## Implementation Phases

### Phase 1: Core Exercise State (30-45 min)
**Files**: `demoExerciseState.svelte.ts`

1. Create store with state management
2. Implement `generateExerciseNotes()`:
   ```typescript
   function generateExerciseNotes(config: ExerciseConfig): TargetNote[] {
     const notes: TargetNote[] = [];
     const microbeatDurationMs = (60 / config.tempo) * 1000 / 2; // eighth note

     for (let loop = 0; loop < config.numLoops; loop++) {
       const pitch = randomPitch(config.minMidi, config.maxMidi);
       const startTime = loop * 32 * microbeatDurationMs;

       // Reference note (0-8 microbeats)
       notes.push({
         midi: pitch,
         startTimeMs: startTime,
         durationMs: 8 * microbeatDurationMs,
         lyric: '👂', // Listen emoji
       });

       // User input note (16-24 microbeats)
       notes.push({
         midi: pitch,
         startTimeMs: startTime + (16 * microbeatDurationMs),
         durationMs: 8 * microbeatDurationMs,
         lyric: '🎤', // Microphone emoji
       });
     }

     return notes;
   }
   ```

3. Implement phase tracking
4. Results collection

### Phase 2: Audio Playback Integration (20-30 min)
**Integration with**: Tone.js synth

1. Create reference tone player:
   ```typescript
   function playReferenceTone(midi: number, durationMs: number) {
     const synth = new Tone.Synth({
       oscillator: { type: 'sine' }
     }).toDestination();

     const frequency = Tone.Frequency(midi, 'midi').toFrequency();
     synth.triggerAttackRelease(frequency, durationMs / 1000);
   }
   ```

2. Schedule reference tones during exercise
3. Mute during user input phases

### Phase 3: UI Controls (30-40 min)
**Files**: `DemoExerciseControls.svelte`

1. Create component layout
2. Wire up configuration inputs
3. Connect start/stop buttons to store
4. Add progress indicators
5. Style component (match existing sidebar style)

### Phase 4: Highway Integration (20-30 min)
**Files**: `highwayState.svelte.ts`, `SingingCanvas.svelte`

1. Ensure emojis render on notes:
   - Check if PitchGrid supports lyrics in highway mode
   - If not, add overlay rendering for emojis
2. Position emojis appropriately on notes
3. Test scrolling with emojis

### Phase 5: Results & Feedback (20-30 min)
**Files**: `DemoExerciseControls.svelte`

1. Collect performance data from highway service
2. Calculate accuracy metrics
3. Display results after exercise completion
4. Add visual feedback during exercise (phase indicators)

### Phase 6: Testing & Polish (15-20 min)
1. Test full exercise flow
2. Verify emoji rendering
3. Check audio timing accuracy
4. Test edge cases (stopping mid-exercise, etc.)
5. Add loading states if needed

---

## Technical Considerations

### Emoji Rendering
**Option A**: Use PitchGrid's existing lyrics support (if highway mode supports it)
**Option B**: Create overlay canvas layer for emoji rendering
**Recommendation**: Check PitchGrid first, fall back to overlay if needed

### Audio Timing
- Use Tone.Transport for precise scheduling
- Schedule all reference tones at exercise start
- Cancel scheduled events on stop

### Performance Tracking
- Highway service already tracks performance
- Need to map exercise phases to note IDs
- Filter results to only include user input phases

### State Synchronization
- Exercise state drives highway state
- Highway state is read-only during exercise
- Reset highway state when exercise stops

---

## UI Mockup (Text)

```
┌─────────────────────────────┐
│ Demo Exercise               │
│ ▼ Settings                  │
│   Number of loops: [5]      │
│   Tempo (BPM): [120]        │
│   Pitch Range: [Use Current]│
│                             │
│ [Start Demo Exercise]       │
└─────────────────────────────┘

// During Exercise:
┌─────────────────────────────┐
│ Demo Exercise               │
│                             │
│ [Stop Exercise]             │
│                             │
│ Loop 2 / 5                  │
│                             │
│ 🎤 Sing                      │
└─────────────────────────────┘

// After Exercise:
┌─────────────────────────────┐
│ Demo Exercise               │
│ ▶ Settings                  │
│                             │
│ [Start Demo Exercise]       │
│                             │
│ Results                     │
│ Average Accuracy: 87.2%     │
│ Hits: 4/5                   │
│                             │
│ ▼ Detailed Results          │
│ Loop 1: E4    92%  ✓        │
│ Loop 2: G4    85%  ✓        │
│ Loop 3: C5    71%  ✗        │
│ Loop 4: A4    95%  ✓        │
│ Loop 5: F4    93%  ✓        │
└─────────────────────────────┘
```

---

## Estimated Time
- **Phase 1**: 30-45 min
- **Phase 2**: 20-30 min
- **Phase 3**: 30-40 min
- **Phase 4**: 20-30 min
- **Phase 5**: 20-30 min
- **Phase 6**: 15-20 min
- **Total**: ~2.5-3 hours

---

## Dependencies
- `@mlt/student-notation-engine` (highway service)
- `tone` (audio synthesis)
- Existing pitch detection service
- Existing highway state

---

## Future Enhancements (Post-MVP)
- Adjustable difficulty (stricter grading)
- Different exercise patterns (intervals, scales, etc.)
- Save/load exercise results history
- Export results to file
- Visual accuracy meter during singing
- Real-time pitch deviation feedback
- Customizable emoji/labels

---

## Questions to Resolve Before Implementation
1. Should the exercise automatically switch to highway mode, or work in both modes?
   - **Recommendation**: Force highway mode during exercise for best experience

2. Should reference tone volume be configurable?
   - **Recommendation**: Yes, add volume slider in settings

3. What happens if user stops exercise mid-loop?
   - **Recommendation**: Save partial results, allow resume or restart

4. Should exercise results persist across sessions?
   - **Recommendation**: Not for MVP, add later if needed

5. Should we support lyrics rendering in the engine, or just in singing-trainer?
   - **Recommendation**: Add to singing-trainer first, migrate to engine later if needed
