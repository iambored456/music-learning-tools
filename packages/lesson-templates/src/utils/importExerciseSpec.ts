/**
 * Import Exercise Spec Converter
 *
 * Converts JSON exercise spec format (with globals, parts, events)
 * into OverdubExerciseTemplate for the overdub exercise system.
 */

import type {
  OverdubExerciseTemplate,
  ExerciseVoice,
  ExerciseNote,
  ExerciseTimeGrid,
  DifficultyLevel,
  LessonSettingsSchema,
} from '../types.js';

// ============================================================================
// JSON Spec Types (input format)
// ============================================================================

export interface SpecGlobals {
  tempoBpm: number;
  tonicMidi: number;
  divisionsPerQuarter: number;
  divisionsPerMeasure: number;
  totalMeasures?: number;
  timeSignature?: string;
  key?: string;
  [extra: string]: unknown;
}

export interface SpecEvent {
  t: number;
  d: number;
  midi?: number;
  rest?: boolean;
  ly?: string;
  m?: number;
  [extra: string]: unknown;
}

export interface SpecPart {
  name: string;
  id?: string;
  events: SpecEvent[];
  [extra: string]: unknown;
}

export interface ExerciseSpec {
  globals: SpecGlobals;
  parts: SpecPart[];
  specVersion?: string;
  [extra: string]: unknown;
}

/** Author-supplied metadata not present in the spec */
export interface ExerciseSpecMetadata {
  id: string;
  name: string;
  description: string;
  difficulty: DifficultyLevel;
  durationEstimate: string;
  voiceColors?: string[];
  settingsSchema?: LessonSettingsSchema;
}

// ============================================================================
// Helpers
// ============================================================================

const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

function midiToNoteName(midi: number): string {
  const pitchClass = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES_FLAT[pitchClass]}${octave}`;
}

function midiToPitchClass(midi: number): string {
  const pitchClass = ((midi % 12) + 12) % 12;
  return NOTE_NAMES_FLAT[pitchClass];
}

/** Default 6-voice color palette */
const DEFAULT_VOICE_COLORS = [
  '#e64a4a', // red
  '#4a90e2', // blue
  '#e6a820', // gold
  '#68a03f', // green
  '#9b59b6', // purple
  '#e88b4a', // orange
];

// ============================================================================
// Converter
// ============================================================================

/**
 * Convert a JSON exercise spec into an OverdubExerciseTemplate.
 *
 * Maps the spec's absolute tick positions directly to microbeatCol positions.
 * Models sixteenth-note resolution (divisionsPerQuarter=4) as:
 *   microbeatsPerMacrobeat=2 (each macrobeat = one eighth note, subdivided into 2 sixteenths)
 *
 * If `totalMeasures` is not in the spec globals, it is calculated from the
 * maximum (t + d) across all events, rounded up to full measures.
 */
export function convertSpecToExercise(
  spec: ExerciseSpec,
  metadata: ExerciseSpecMetadata,
): OverdubExerciseTemplate {
  const { globals, parts } = spec;
  const colors = metadata.voiceColors ?? DEFAULT_VOICE_COLORS;

  // Calculate totalMeasures from events if not provided
  let maxTick = 0;
  for (const part of parts) {
    for (const event of part.events) {
      const end = event.t + event.d;
      if (end > maxTick) maxTick = end;
    }
  }
  const totalMeasures = globals.totalMeasures ?? Math.ceil(maxTick / globals.divisionsPerMeasure);

  // Calculate total microbeatCount
  const microbeatCount = totalMeasures * globals.divisionsPerMeasure;

  // Model as eighth-note macrobeats with 2 microbeats each
  const microbeatsPerMacrobeat: 2 = 2;

  // macrobeatGroupings: 8 eighth-note macrobeats per measure for 4/4
  const macrobeatsPerMeasure = globals.divisionsPerMeasure / microbeatsPerMacrobeat;
  const totalMacrobeats = macrobeatsPerMeasure * totalMeasures;
  const macrobeatGroupings: (2 | 3)[] = Array(totalMacrobeats).fill(2);

  const timeGrid: ExerciseTimeGrid = {
    microbeatCount,
    microbeatsPerMacrobeat,
    macrobeatGroupings,
  };

  // Scan for min/max MIDI across all parts
  let minMidi = Infinity;
  let maxMidi = -Infinity;

  // Convert parts to voices
  const voices: ExerciseVoice[] = parts.map((part, i) => {
    const notes: ExerciseNote[] = [];

    for (const event of part.events) {
      if (event.rest) continue;
      if (typeof event.midi !== 'number') continue;

      if (event.midi < minMidi) minMidi = event.midi;
      if (event.midi > maxMidi) maxMidi = event.midi;

      notes.push({
        startMicrobeatCol: event.t,
        endMicrobeatCol: event.t + event.d - 1,
        midiPitch: event.midi,
        pitchName: midiToNoteName(event.midi),
        lyric: event.ly,
      });
    }

    return {
      voiceId: part.id ?? part.name.toLowerCase().replace(/\s+/g, '-'),
      color: colors[i % colors.length],
      name: part.name,
      notes,
    };
  });

  // Add padding to pitch range for comfortable viewport
  const pitchPadding = 3;
  if (!isFinite(minMidi)) minMidi = 60;
  if (!isFinite(maxMidi)) maxMidi = 72;

  return {
    id: metadata.id,
    name: metadata.name,
    description: metadata.description,
    type: 'overdub',
    difficulty: metadata.difficulty,
    category: 'overdub-exercises',
    speakingPitchUsage: 'none',
    durationEstimate: metadata.durationEstimate,
    settingsSchema: metadata.settingsSchema ?? {
      fields: [
        { key: 'tempo', label: 'Tempo (BPM)', type: 'integer', default: globals.tempoBpm, min: 40, max: 200, step: 1 },
      ],
    },
    config: {
      tempo: globals.tempoBpm,
      timeGrid,
      voices,
      minMidiPitch: minMidi - pitchPadding,
      maxMidiPitch: maxMidi + pitchPadding,
      tonalCenter: {
        pitchClass: midiToPitchClass(globals.tonicMidi),
      },
      countInBeats: 4,
    },
  };
}
