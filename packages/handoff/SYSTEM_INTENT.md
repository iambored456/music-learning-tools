# Handoff System Intent

## Overview

This package implements a **snapshot-based copy handoff** between Student Notation and Singing Trainer apps. It is NOT a live sync mechanism - data is copied at handoff time, and modifications in either app are independent until explicitly handed back.

## Architecture Decisions

### 1. One-Time Handoff Slot
- Uses IndexedDB as primary storage with localStorage fallback
- Slot auto-expires after 5 minutes to prevent stale data
- Slot is consumed (cleared) after successful read
- Keyed by unique handoff ID with timestamp

### 2. Same-Tab Navigation
- Navigation occurs in the same browser tab via `window.location.href`
- Query parameters (`?from=student-notation&handoff=<id>`) indicate handoff source
- URL params are cleared after processing to keep URLs clean

### 3. Schema Versioning
- Current version: 1
- Version checked on import; incompatible versions rejected with clear error
- Designed for forward compatibility with additive changes

### 4. Monophonic Validation
- Singing Trainer requires monophonic input per voice
- Overlap rule: `end == start` IS considered an overlap (no touching notes)
- Multiple voices can overlap with each other (cross-voice polyphony allowed)
- Validation errors show specific voice/column conflicts

### 5. Transposition
- Applied after import in Singing Trainer
- Stored as semitone offset
- Applied to all voices equally when "Bring Back" is used

## Data Flow

### Student Notation → Singing Trainer
1. User clicks "Take to Singing Trainer" button
2. Notes filtered to exclude drums
3. Notes grouped by color (voice)
4. Validation runs for monophonic requirements
5. On pass: snapshot written to handoff slot, navigation triggered
6. On fail: popup shows conflicts, navigation blocked

### Singing Trainer → Student Notation
1. On mount, check for handoff via URL params and slot
2. Import snapshot into handoff state
3. Suggest pitch range based on imported data
4. User can transpose and practice
5. "Bring Back" writes modified snapshot and navigates back

## Key Types

```typescript
interface SingingTrainerSnapshot {
  schemaVersion: 1;
  createdAt: number;
  sourceApp: 'student-notation' | 'singing-trainer';
  timeGrid: TimeGridStructure;
  voices: SnapshotVoice[];
  tempo?: number;
  minMidiPitch?: number;
  maxMidiPitch?: number;
  clefPitchRange?: { minMidi: number; maxMidi: number };
  preferredPitchRangeSource?: 'notes' | 'clef';
  visualOverlays?: VisualOverlay[];
}
```

## Future Considerations

1. **Pitch Accuracy Gate**: Architecture supports it but not implemented in v1
2. **Scene System**: Singing Trainer scaffolded for GridScene/HighwayScene/LessonScene
3. **Visual Overlays**: Included in schema but marked as `coordinateSystem: 'pixel'` warning
4. **Accompaniment Playback**: Voices stored separately to support future playback features
