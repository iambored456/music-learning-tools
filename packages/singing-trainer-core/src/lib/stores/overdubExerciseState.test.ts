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
    preferences: { speakingPitchMidi: 55 as number | null, getStudentNotationNotes: () => true },
    app: { tonic: 'F' },
    highway: { isPlaying: false, currentTimeMs: 0 },
    targetNotes: vi.fn(), range: vi.fn(), fit: vi.fn(), resume: vi.fn(), degrees: vi.fn(),
    beatLines: vi.fn(), measureLines: vi.fn(), horizontalLines: vi.fn(),
    scheduleGuides: vi.fn(),
    centerGridOnSpeakingPitch: vi.fn(),
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
  setCenterGridOnSpeakingPitch: mocks.centerGridOnSpeakingPitch,
} }));
vi.mock('./highwayState.svelte.js', () => ({ highwayState: {
  state: mocks.highway, setTargetNotes: mocks.targetNotes, fitTimelineToDuration: mocks.fit,
  hardCutTo: mocks.resume, setWaitForInput: vi.fn(), stop: vi.fn(), setSquareGridEnabled: vi.fn(),
} }));
vi.mock('./overdubState.svelte.js', () => ({ overdubState: { setRenderableTrailsVisible: vi.fn() } }));
vi.mock('../services/droneAudio.js', () => ({ updateDrone: vi.fn() }));
vi.mock('../services/guideVoicePlayer.js', () => ({ guideVoicePlayer: {
  stop: vi.fn(), dispose: vi.fn(), scheduleNotes: mocks.scheduleGuides,
} }));

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
  it('aligns all Feeling This voices three semitones below Speaking Pitch while retaining the low degree 4 and tonic', async () => {
    const { FEELING_THIS, validateTemplate } = await vi.importActual<typeof import('@mlt/lesson-templates')>('@mlt/lesson-templates');
    const previousTemplate = { ...mocks.template };
    try {
      Object.assign(mocks.template, FEELING_THIS);
      expect(FEELING_THIS.speakingPitchUsage).toBe('aligned');
      expect(validateTemplate(FEELING_THIS).valid).toBe(true);
      mocks.preferences.speakingPitchMidi = 60;
      overdubExerciseState.loadExercise(FEELING_THIS.id);
      const sourcePitches = FEELING_THIS.config.voices.flatMap(voice => voice.notes.map(note => note.midiPitch)).sort((a, b) => a - b);
      const pitches = overdubExerciseState.state.allTargetNotes.map(note => note.midi!).sort((a, b) => a - b);
      expect(pitches).toEqual(sourcePitches.map(pitch => pitch + 12));
      expect(pitches[0]).toBe(57); // A3 is low degree 4 of E, three semitones below C4.
      expect(overdubExerciseState.state.guideTargetNotes.map(note => note.midi!).sort((a, b) => a - b)).toEqual(pitches);
      expect(overdubExerciseState.state.effectiveTonic).toBe('E');
      expect(mocks.app.tonic).toBe('E');
      const notes = overdubExerciseState.state.allTargetNotes;
      const lowestIndex = notes.findIndex(note => note.midi === 57);
      expect(mocks.degrees.mock.lastCall?.[0][lowestIndex]).toBe('4');
      expect(mocks.horizontalLines).toHaveBeenCalledWith(true);
      expect(mocks.centerGridOnSpeakingPitch).toHaveBeenCalledWith(false);
      expect(mocks.fit).toHaveBeenLastCalledWith(overdubExerciseState.state.durationMs, {
        paddingBeforeMs: 0, paddingAfterMs: 0,
      });
      expect(Math.min(...overdubExerciseState.state.allTargetNotes.map(note => note.startTimeMs))).toBe(0);
      expect(Math.max(...overdubExerciseState.state.allTargetNotes.map(note => note.startTimeMs + note.durationMs)))
        .toBeCloseTo(overdubExerciseState.state.durationMs);
      expect(mocks.range).toHaveBeenLastCalledWith({
        minMidi: FEELING_THIS.config.minMidiPitch + 12,
        maxMidi: FEELING_THIS.config.maxMidiPitch + 12,
      });

      // Hiding the lowest voice must not transpose the remaining arrangement.
      const lowestVoice = FEELING_THIS.config.voices.find(voice => voice.notes.some(note => note.midiPitch === 45))!;
      overdubExerciseState.setVoiceVisible(lowestVoice.voiceId, false);
      overdubExerciseState.syncSpeakingPitch();
      expect(overdubExerciseState.state.exerciseBaseTransposeSemitones).toBe(12);
      expect(overdubExerciseState.state.effectiveTonic).toBe('E');
      expect(FEELING_THIS.config.voices.flatMap(voice => voice.notes.map(note => note.midiPitch)).sort((a, b) => a - b)).toEqual(sourcePitches);
    } finally {
      Object.assign(mocks.template, previousTemplate);
    }
  });

  it('realigns a workshop and its sounding guides without pitch drift or resetting the timeline', async () => {
    const { FEELING_THIS } = await vi.importActual<typeof import('@mlt/lesson-templates')>('@mlt/lesson-templates');
    const previousTemplate = { ...mocks.template };
    try {
      Object.assign(mocks.template, FEELING_THIS);
      mocks.preferences.speakingPitchMidi = 60;
      overdubExerciseState.loadExercise(FEELING_THIS.id);
      const timing = overdubExerciseState.state.allTargetNotes.map(note => [note.startTimeMs, note.durationMs]);
      const degrees = mocks.degrees.mock.lastCall?.[0];
      overdubExerciseState.state.isPlaying = true;
      mocks.highway.isPlaying = true;
      mocks.highway.currentTimeMs = 1250;
      vi.clearAllMocks();
      mocks.preferences.speakingPitchMidi = 55;
      overdubExerciseState.syncSpeakingPitch();
      expect(Math.min(...overdubExerciseState.state.allTargetNotes.map(note => note.midi!))).toBe(52);
      expect(overdubExerciseState.state.effectiveTonic).toBe('B');
      expect(mocks.app.tonic).toBe('B');
      expect(mocks.degrees).toHaveBeenLastCalledWith(degrees);
      expect(overdubExerciseState.state.allTargetNotes.map(note => [note.startTimeMs, note.durationMs])).toEqual(timing);
      expect(mocks.resume).toHaveBeenCalledWith(1250, true);
      expect(mocks.fit).toHaveBeenCalledTimes(0);
      expect(mocks.scheduleGuides).toHaveBeenLastCalledWith(overdubExerciseState.state.guideTargetNotes, expect.any(Object));
      overdubExerciseState.syncSpeakingPitch();
      expect(mocks.targetNotes).toHaveBeenCalledTimes(1);
      mocks.preferences.speakingPitchMidi = 60;
      overdubExerciseState.syncSpeakingPitch();
      expect(Math.min(...overdubExerciseState.state.allTargetNotes.map(note => note.midi!))).toBe(57);
    } finally {
      overdubExerciseState.state.isPlaying = false;
      mocks.highway.isPlaying = false;
      Object.assign(mocks.template, previousTemplate);
    }
  });

  it('anchors both Faber voices to Speaking Pitch and updates them without changing timing', async () => {
    const { FABER_NO_1 } = await vi.importActual<typeof import('@mlt/lesson-templates')>('@mlt/lesson-templates');
    const previousTemplate = { ...mocks.template };
    try {
      Object.assign(mocks.template, FABER_NO_1);
      overdubExerciseState.loadExercise(FABER_NO_1.id);
      const sourceNotes = FABER_NO_1.config.voices.flatMap(voice => voice.notes);
      const sourcePitches = sourceNotes.map(note => note.midiPitch).sort((a, b) => a - b);
      const sessionPitches = () => overdubExerciseState.state.allTargetNotes.map(note => note.midi!).sort((a, b) => a - b);
      expect(sessionPitches()).toEqual(sourcePitches.map(pitch => pitch - 12));
      expect(overdubExerciseState.state.effectiveTonic).toBe('G');
      expect(overdubExerciseState.state.tempo).toBe(90);
      const timing = overdubExerciseState.state.allTargetNotes.map(note => [note.startTimeMs, note.durationMs]);
      const guides = () => overdubExerciseState.state.guideTargetNotes.map(note => note.midi!).sort((a, b) => a - b);
      expect(guides()).toEqual(sessionPitches());
      mocks.preferences.speakingPitchMidi = 57;
      overdubExerciseState.syncSpeakingPitch();
      expect(sessionPitches()).toEqual(sourcePitches.map(pitch => pitch - 10));
      expect(guides()).toEqual(sessionPitches());
      expect(overdubExerciseState.state.effectiveTonic).toBe('A');
      expect(overdubExerciseState.state.allTargetNotes.map(note => [note.startTimeMs, note.durationMs])).toEqual(timing);
      mocks.preferences.speakingPitchMidi = 55;
      overdubExerciseState.syncSpeakingPitch();
      expect(sessionPitches()).toEqual(sourcePitches.map(pitch => pitch - 12));
    } finally {
      Object.assign(mocks.template, previousTemplate);
    }
  });

  it('opens Bicinia with standalone practice controls while retaining the authored pitches', () => {
    mocks.template.category = 'bicinia';
    overdubExerciseState.loadExercise(mocks.template.id);
    expect(overdubExerciseState.isStandaloneExercise).toBe(true);
    expect(overdubExerciseState.state.allTargetNotes.map(note => note.midi)).toEqual([60, 65, 69]);
    expect(mocks.beatLines).toHaveBeenCalledWith(true);
    expect(mocks.measureLines).toHaveBeenCalledWith(true);
    expect(mocks.horizontalLines).toHaveBeenCalledWith(true);
    mocks.preferences.speakingPitchMidi = 50;
    overdubExerciseState.syncSpeakingPitch();
    expect(overdubExerciseState.state.allTargetNotes.map(note => note.midi)).toEqual([60, 65, 69]);
  });

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
