# @mlt/student-notation-engine

Framework-agnostic engine for Student Notation. Provides state management, audio playback, and transport control without any DOM dependencies.

## Package Status

**Current Size:** 53.09 KB (gzipped: 13.03 KB)

### ✅ Completed Modules

#### State Module (4 files)
- **store.ts** - Event-driven store with history management
  - `createStore()` factory with injectable `StorageAdapter`
  - Event emitter pattern (`on`, `off`, `emit`)
  - Undo/redo support
  - Core actions: history, view, timbre, harmony
- **initialState.ts** - Factory for default state values
- **pitchData.ts** - Complete 88-key piano pitch data (A0-C8)
- **index.ts** - Module exports

#### Audio Module (7 files)
- **synthEngine.ts** - Polyphonic synth engine factory
  - `createSynthEngine()` with dependency injection
  - No window globals
  - Injectable: effects manager, harmonic filter, logger
  - Waveform visualization support
- **GainManager.ts** - Polyphony-aware gain scaling
  - Exponential moving average smoothing
  - Prevents volume pumping
- **ClippingMonitor.ts** - Audio level monitoring
  - Configurable thresholds
  - Warning callbacks
- **FilteredVoice.ts** - Custom Tone.js voice
  - Multi-mode filter (HP/BP/LP crossfade)
  - Vibrato (frequency modulation)
  - Tremolo (amplitude modulation)
- **types.ts** - Audio interfaces
- **transportService.ts** - Placeholder for transport service
- **index.ts** - Module exports

#### Transport Module (4 files)
- **timeMapCalculator.ts** - Time mapping calculator
  - `createTimeMapCalculator()` with dependency injection
  - Modulation support
  - Tonic column time skipping
  - Loop bounds management
- **drumManager.ts** - Drum playback manager
  - `createDrumManager()` factory
  - Safe trigger timing
  - Audio chain integration
- **types.ts** - Transport interfaces
- **index.ts** - Module exports

### ⏳ Placeholder Modules

#### Canvas Module (3 files)
- **pitchGridRenderer.ts** - Pitch grid rendering (not implemented)
- **drumGridRenderer.ts** - Drum grid rendering (not implemented)
- **index.ts** - Module exports

#### Controller Module (1 file)
- **controller.ts** - Engine controller facade (not implemented)

## Architecture

### Dependency Injection Pattern

All modules use factory functions with injectable dependencies:

```typescript
// State
const store = createStore({
  storage: myStorageAdapter,
  onClearState: () => console.log('State cleared')
});

// Audio
const synthEngine = createSynthEngine({
  timbres: initialTimbres,
  effectsManager: myEffectsManager,
  harmonicFilter: myHarmonicFilter,
  logger: myLogger
});

// Transport
const timeMapCalculator = createTimeMapCalculator({
  getMacrobeatInfo: (index) => /* ... */,
  getPlacedTonicSigns: () => /* ... */,
  getTonicSpanColumnIndices: (signs) => /* ... */,
  logger: myLogger
});

const drumManager = createDrumManager({
  samples: customDrumSamples,
  synthEngine: synthEngine
});
```

### No DOM Dependencies

- No `window` or `document` references
- No `localStorage` direct access (uses `StorageAdapter`)
- All DOM-specific callbacks are injectable
- Works in Node.js for testing

### Event-Driven Architecture

```typescript
store.on('notesChanged', (notes) => {
  console.log('Notes updated:', notes);
});

store.addNote(/* ... */);
```

## Usage Example

```typescript
import {
  createStore,
  getInitialState,
  createSynthEngine,
  createTimeMapCalculator,
  createDrumManager
} from '@mlt/student-notation-engine';

// 1. Create store
const store = createStore({
  initialState: getInitialState(),
  storage: {
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
    removeItem: (key) => localStorage.removeItem(key)
  }
});

// 2. Create synth engine
const synthEngine = createSynthEngine({
  timbres: store.state.timbres,
  logger: console
});

synthEngine.init();

// 3. Create drum manager
const drumManager = createDrumManager({
  synthEngine
});

// 4. Create time map calculator
const timeMapCalculator = createTimeMapCalculator({
  getMacrobeatInfo: (index) => getMacrobeatInfo(store.state, index),
  getPlacedTonicSigns: () => getPlacedTonicSigns(store.state),
  getTonicSpanColumnIndices: (signs) => getTonicSpanColumnIndices(signs),
  logger: console
});

// 5. Use the engine
store.on('notesChanged', () => {
  timeMapCalculator.calculate(store.state);
});

synthEngine.triggerAttack('C4', 'blue');
setTimeout(() => synthEngine.triggerRelease('C4', 'blue'), 1000);
```

## Exports

### State Module
- `createStore()` - Store factory
- `getInitialState()` - Initial state factory
- `fullRowData` - Complete pitch data
- `getPitchByToneNote()`, `getPitchByIndex()`, etc.

### Audio Module
- `createSynthEngine()` - Synth engine factory
- `GainManager` - Polyphony-aware gain control
- `ClippingMonitor` - Audio level monitoring
- `FilteredVoice` - Custom voice class
- `setVoiceLogger()` - Set logger for voice debug output

### Transport Module
- `createTimeMapCalculator()` - Time map factory
- `createDrumManager()` - Drum manager factory
- `DEFAULT_DRUM_SAMPLES` - Default drum sample URLs

### Types
All TypeScript interfaces exported from each module.

## Next Steps

1. **Extract Transport Service** - Remove domCache, implement note scheduling
2. **Extract Canvas Renderers** - Pure rendering functions for pitch/drum grids
3. **Implement Engine Controller** - Unified facade over all modules
4. **Migrate App** - Update app to use engine factories

## License

See repository root for license information.
