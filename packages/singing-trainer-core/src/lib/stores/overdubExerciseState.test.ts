import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OverdubExerciseTemplate } from '@mlt/lesson-templates';

const mocks = vi.hoisted(() => {
  // Exercise store commands in Node; this does not test Svelte effect scheduling.
  vi.stubGlobal('$state', (value: unknown) => value);
  const template: OverdubExerciseTemplate = {
    id: 'exercise-amazing-grace', name: 'Melody', description: '', type: 'overdub',
    category: 'exercises', difficulty: 1, speakingPitchUsage: 'none', durationEstimate: '',
    settingsSchema: { fields: [] },
    config: {
      tempo: 90, minMidiPitch: 57, maxMidiPitch: 75, tonalCenter: { pitchClass: 'F' },
      timeGrid: { microbeatCount: 16, microbeatsPerMacrobeat: 2, macrobeatGroupings: [2, 2, 2, 2, 2, 2, 2, 2] },
      voices: [{ voiceId: 'melody', name: 'Melody', color: '#123456', notes: [
        { midiPitch: 60, pitchName: 'C4', startMicrobeatCol: 0, endMicrobeatCol: 3, lyric: 'A' },
        { midiPitch: 65, pitchName: 'F4', startMicrobeatCol: 4, endMicrobeatCol: 11, lyric: 'ma' },
        { midiPitch: 69, pitchName: 'A4', startMicrobeatCol: 12, endMicrobeatCol: 15, lyric: 'zing' },
      ] }],
    },
  };
  return {
    template,
    preferences: { speakingPitchMidi: 55 as number | null },
    app: { tonic: 'F' },
    highway: { isPlaying: false, currentTimeMs: 0 },
    targetNotes: vi.fn(), range: vi.fn(), fit: vi.fn(), resume: vi.fn(), degrees: vi.fn(),
    beatLines: vi.fn(), measureLines: vi.fn(), horizontalLines: vi.fn(),
  };
});

vi.mock('@mlt/lesson-templates', () => ({ getTemplate: () => mocks.template }));
vi.mock('./preferencesStore.svelte.js', () => ({ preferencesStore: mocks.preferences }));
vi.mock('./appState.svelte.js', () => ({ appState: {
  state: mocks.app,
  setTonic: (tonic: string) => { mocks.app.tonic = tonic; },
  setNoteScaleDegrees: mocks.degrees, setYAxisRange: mocks.range,
  setUseDegrees: vi.fn(), setVisualizationMode: vi.fn(), setOverdubMicTrailColorMode: vi.fn(),
  setShowBeatGridLines: mocks.beatLines, setShowMeasureGridLines: mocks.measureLines,
  setShowHorizontalGridLines: mocks.horizontalLines,
} }));
vi.mock('./highwayState.svelte.js', () => ({ highwayState: {
  state: mocks.highway, setTargetNotes: mocks.targetNotes, fitTimelineToDuration: mocks.fit,
  hardCutTo: mocks.resume, setWaitForInput: vi.fn(), stop: vi.fn(),
} }));
vi.mock('./overdubState.svelte.js', () => ({ overdubState: { setRenderableTrailsVisible: vi.fn() } }));
vi.mock('../services/droneAudio.js', () => ({ updateDrone: vi.fn() }));
vi.mock('../services/guideVoicePlayer.js', () => ({ guideVoicePlayer: { stop: vi.fn(), dispose: vi.fn() } }));

import { overdubExerciseState } from './overdubExerciseState.svelte.js';

beforeEach(() => {
  overdubExerciseState.reset();
  mocks.template.category = 'exercises';
  mocks.preferences.speakingPitchMidi = 55;
  mocks.highway.isPlaying = false;
  mocks.highway.currentTimeMs = 0;
  vi.clearAllMocks();
});

afterAll(() => vi.unstubAllGlobals());

describe('Speaking Pitch exercise anchoring', () => {
  it('anchors the lowest note and guide notes while preserving melody intervals and enabling every grid layer', () => {
    overdubExerciseState.loadExercise(mocks.template.id);
    expect(overdubExerciseState.state.allTargetNotes.map(note => note.midi)).toEqual([55, 60, 64]);
    expect(overdubExerciseState.state.guideTargetNotes.map(note => note.midi)).toEqual([55, 60, 64]);
    expect(overdubExerciseState.state.effectiveTonic).toBe('C');
    expect(mocks.beatLines).toHaveBeenCalledWith(true);
    expect(mocks.measureLines).toHaveBeenCalledWith(true);
    expect(mocks.horizontalLines).toHaveBeenCalledWith(true);
  });

  it('updates from the original pitches without cumulative drift, preserving timing and playback position', () => {
    overdubExerciseState.loadExercise(mocks.template.id, { waitForInput: true });
    const timing = overdubExerciseState.state.allTargetNotes.map(note => [note.startTimeMs, note.durationMs]);
    const degrees = mocks.degrees.mock.lastCall?.[0];
    overdubExerciseState.state.isPlaying = true;
    mocks.highway.isPlaying = true;
    mocks.highway.currentTimeMs = 1250;
    vi.clearAllMocks();

    mocks.preferences.speakingPitchMidi = 57;
    overdubExerciseState.syncSpeakingPitch();
    expect(overdubExerciseState.state.allTargetNotes.map(note => note.midi)).toEqual([57, 62, 66]);
    expect(overdubExerciseState.state.allTargetNotes.map(note => [note.startTimeMs, note.durationMs])).toEqual(timing);
    expect(overdubExerciseState.state.waitForInputEnabled).toBe(true);
    expect(mocks.degrees).toHaveBeenLastCalledWith(degrees);
    expect(mocks.resume).toHaveBeenCalledWith(1250, true);
    expect(mocks.fit).toHaveBeenCalledTimes(0);

    overdubExerciseState.syncSpeakingPitch();
    expect(mocks.targetNotes).toHaveBeenCalledTimes(1);
    mocks.preferences.speakingPitchMidi = 55;
    overdubExerciseState.syncSpeakingPitch();
    expect(overdubExerciseState.state.allTargetNotes.map(note => note.midi)).toEqual([55, 60, 64]);
  });

  it('uses C4 when Speaking Pitch is unset and leaves recording templates at their authored pitch', () => {
    mocks.preferences.speakingPitchMidi = null;
    overdubExerciseState.loadExercise(mocks.template.id);
    expect(overdubExerciseState.state.allTargetNotes.map(note => note.midi)).toEqual([60, 65, 69]);

    mocks.template.category = 'workshop';
    overdubExerciseState.loadExercise(mocks.template.id);
    mocks.preferences.speakingPitchMidi = 50;
    overdubExerciseState.syncSpeakingPitch();
    expect(overdubExerciseState.state.allTargetNotes.map(note => note.midi)).toEqual([60, 65, 69]);
  });
});
