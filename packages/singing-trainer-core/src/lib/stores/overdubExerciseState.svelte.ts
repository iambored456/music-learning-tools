/**
 * Overdub Exercise State - Svelte 5 Runes
 *
 * Coordinates the overdub exercise lifecycle:
 * - Load exercise template → convert voices to target notes
 * - Display on highway with per-voice colors
 * - Play guide voice audio via Tone.js
 * - User selects which voice to practice (active voice)
 * - Optionally bridge into overdub recording system
 */

import {
  getTemplate,
  type OverdubExerciseTemplate,
} from '@mlt/lesson-templates';
import { convertExerciseVoicesToTargetNotes, calculateExerciseDurationMs } from '../services/exerciseVoiceConverter.js';
import { midiToScaleDegreeLabel } from '../services/diatonicAnalysis.js';
import { guideVoicePlayer } from '../services/guideVoicePlayer.js';
import { highwayState, type TargetNote } from './highwayState.svelte.js';
import { appState, type TonicNote } from './appState.svelte.js';
import { overdubState } from './overdubState.svelte.js';
import { preferencesStore } from './preferencesStore.svelte.js';

export interface VoiceInfo {
  voiceId: string;
  name: string;
  color: string;
}

export interface VoiceSynthMix {
  gain: number;
  pan: number;
}

export interface OverdubExerciseSessionState {
  isActive: boolean;
  exerciseId: string | null;
  template: OverdubExerciseTemplate | null;
  /** Currently selected voice to practice (null = listen-only) */
  activeVoiceId: string | null;
  /** Per-voice synth guide enablement */
  guideEnabledVoiceIds: string[];
  /** Per-voice visual enablement on highway/pitch grid */
  visibleVoiceIds: string[];
  /** All target notes for highway display (roles set by activeVoiceId) */
  allTargetNotes: TargetNote[];
  /** Guide voice notes only (non-active voices, for audio playback) */
  guideTargetNotes: TargetNote[];
  /** Per-voice synth gain/pan for guide playback */
  synthMixByVoiceId: Record<string, VoiceSynthMix>;
  isPlaying: boolean;
  /** Effective tempo (may be overridden by settings) */
  tempo: number;
  /** Total exercise duration in ms */
  durationMs: number;
  /** Current wait-gate mode for active input notes */
  waitForInputEnabled: boolean;
  /** Base semitone transposition (e.g., speaking-pitch anchoring) */
  exerciseBaseTransposeSemitones: number;
  /** Manual key shift in semitones (clamped to [-6, +6] for exercises) */
  exerciseManualShiftSemitones: number;
  /** Effective tonic after transposition */
  effectiveTonic: TonicNote | null;
}

const DEFAULT_STATE: OverdubExerciseSessionState = {
  isActive: false,
  exerciseId: null,
  template: null,
  activeVoiceId: null,
  guideEnabledVoiceIds: [],
  visibleVoiceIds: [],
  allTargetNotes: [],
  guideTargetNotes: [],
  synthMixByVoiceId: {},
  isPlaying: false,
  tempo: 80,
  durationMs: 0,
  waitForInputEnabled: false,
  exerciseBaseTransposeSemitones: 0,
  exerciseManualShiftSemitones: 0,
  effectiveTonic: null,
};

const DEFAULT_SYNTH_GAIN = 1;
const DEFAULT_SYNTH_PAN = 0;
const TONIC_TO_PC: Record<TonicNote, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};
const PC_TO_TONIC_SHARP: TonicNote[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const MIN_EXERCISE_KEY_SHIFT = -6;
const MAX_EXERCISE_KEY_SHIFT = 6;
const DEFAULT_EXERCISE_RANGE_PADDING_SEMITONES = 2;
const AMAZING_GRACE_EXERCISE_ID = 'exercise-amazing-grace';
const AMAZING_GRACE_RANGE_PADDING_SEMITONES = 1;
const AMAZING_GRACE_START_ZOOM_RATIO = 3.5;

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseTonicNote(value: string | undefined): TonicNote | null {
  if (!value) return null;
  return Object.prototype.hasOwnProperty.call(TONIC_TO_PC, value)
    ? (value as TonicNote)
    : null;
}

function wrapPitchClass(value: number): number {
  return ((value % 12) + 12) % 12;
}

function createDefaultSynthMixByVoiceId(voiceIds: string[]): Record<string, VoiceSynthMix> {
  return Object.fromEntries(
    voiceIds.map((voiceId) => ([
      voiceId,
      { gain: DEFAULT_SYNTH_GAIN, pan: DEFAULT_SYNTH_PAN },
    ])),
  );
}

function createOverdubExerciseState() {
  let state = $state<OverdubExerciseSessionState>({ ...DEFAULT_STATE });
  let startInFlight = false;
  let playbackStartTimeoutId: number | null = null;
  let playbackAutoStopTimeoutId: number | null = null;
  let playbackDownbeatPerfMs: number | null = null;

  function clearPendingPlaybackStart() {
    if (playbackStartTimeoutId === null) return;
    window.clearTimeout(playbackStartTimeoutId);
    playbackStartTimeoutId = null;
  }

  function clearPendingAutoStop() {
    if (playbackAutoStopTimeoutId !== null) {
      window.clearTimeout(playbackAutoStopTimeoutId);
    }
    playbackAutoStopTimeoutId = null;
  }

  function setHighwayTargetNotes() {
    highwayState.setTargetNotes(state.allTargetNotes, {
      preserveTimelinePadding: true,
      contentDurationMs: state.durationMs,
    });
  }

  function isWorkshopTemplate(): boolean {
    return state.template?.category === 'workshop';
  }

  function isStandaloneExerciseTemplate(): boolean {
    return state.template?.category === 'exercises';
  }

  function getTotalTransposeSemitones(): number {
    return state.exerciseBaseTransposeSemitones + state.exerciseManualShiftSemitones;
  }

  function getLowestMidiInTemplate(template: OverdubExerciseTemplate): number | null {
    let lowest = Infinity;
    for (const voice of template.config.voices) {
      for (const note of voice.notes) {
        if (note.midiPitch < lowest) {
          lowest = note.midiPitch;
        }
      }
    }
    return Number.isFinite(lowest) ? lowest : null;
  }

  function computeBaseTransposeSemitones(template: OverdubExerciseTemplate): number {
    if (template.category !== 'exercises') {
      return 0;
    }
    const lowestMidi = getLowestMidiInTemplate(template);
    const speakingPitchMidi = preferencesStore.speakingPitchMidi;
    if (lowestMidi === null || typeof speakingPitchMidi !== 'number' || !Number.isFinite(speakingPitchMidi)) {
      return 0;
    }
    return Math.round(speakingPitchMidi) - lowestMidi;
  }

  function getCurrentPitchRange(): { minMidi: number; maxMidi: number } | null {
    if (!state.template) return null;

    if (isStandaloneExerciseTemplate()) {
      const rangePaddingSemitones = state.exerciseId === AMAZING_GRACE_EXERCISE_ID
        ? AMAZING_GRACE_RANGE_PADDING_SEMITONES
        : DEFAULT_EXERCISE_RANGE_PADDING_SEMITONES;
      const midiValues = state.allTargetNotes
        .map((note) => note.midi)
        .filter((midi): midi is number => typeof midi === 'number' && Number.isFinite(midi));

      if (midiValues.length > 0) {
        const lowestMidi = Math.min(...midiValues);
        const highestMidi = Math.max(...midiValues);
        const paddedMin = clampNumber(lowestMidi - rangePaddingSemitones, 0, 127);
        const paddedMax = clampNumber(highestMidi + rangePaddingSemitones, 0, 127);
        return {
          minMidi: Math.min(paddedMin, paddedMax),
          maxMidi: Math.max(paddedMin, paddedMax),
        };
      }
    }

    const config = state.template.config;
    const transposeSemitones = getTotalTransposeSemitones();
    const minMidi = clampNumber(config.minMidiPitch + transposeSemitones, 0, 127);
    const maxMidi = clampNumber(config.maxMidiPitch + transposeSemitones, 0, 127);
    return {
      minMidi: Math.min(minMidi, maxMidi),
      maxMidi: Math.max(minMidi, maxMidi),
    };
  }

  function restoreExerciseRangeView() {
    const range = getCurrentPitchRange();
    if (range) {
      appState.setYAxisRange(range);
    }
    const beatDurationMs = 60_000 / Math.max(20, state.tempo);
    const boundaryPaddingMs = Math.max(0, Math.round(beatDurationMs * 4));
    highwayState.fitTimelineToDuration(state.durationMs, {
      paddingBeforeMs: boundaryPaddingMs,
      paddingAfterMs: boundaryPaddingMs,
    });
  }

  function applyPreferredStartZoomIfNeeded() {
    if (state.exerciseId !== AMAZING_GRACE_EXERCISE_ID) return;
    const timelineDurationMs = Math.max(1, Math.round(highwayState.state.timelineDurationMs));
    const preferredViewDurationMs = Math.max(
      1,
      Math.round(timelineDurationMs / AMAZING_GRACE_START_ZOOM_RATIO),
    );
    // Keep the first note aligned at playback start by anchoring zoom to timeline start.
    highwayState.setTimelineViewDurationMs(preferredViewDurationMs, 0);
    highwayState.setTimelineViewStartMs(0);
  }

  function syncScaleDegreeLabels() {
    const tonic = parseTonicNote(state.template?.config.tonalCenter?.pitchClass);
    if (!tonic) {
      state.effectiveTonic = null;
      appState.setNoteScaleDegrees([]);
      return;
    }
    const transposedTonicPc = wrapPitchClass(TONIC_TO_PC[tonic] + getTotalTransposeSemitones());
    const effectiveTonic = PC_TO_TONIC_SHARP[transposedTonicPc] ?? 'C';
    state.effectiveTonic = effectiveTonic;
    appState.setTonic(effectiveTonic);
    const tonicPc = TONIC_TO_PC[effectiveTonic];
    const degreeLabels = state.allTargetNotes.map((note) => {
      if (typeof note.midi !== 'number') return '';
      return midiToScaleDegreeLabel(note.midi, tonicPc);
    });
    appState.setNoteScaleDegrees(degreeLabels);
  }

  function stopPlaybackSession() {
    startInFlight = false;
    clearPendingPlaybackStart();
    clearPendingAutoStop();
    playbackDownbeatPerfMs = null;
    guideVoicePlayer.stop();
    highwayState.stop();
    if (overdubState.mode === 'playing' || overdubState.mode === 'exporting') {
      void overdubState.stopCompositePlayback();
    }
    state.isPlaying = false;
    restoreExerciseRangeView();
  }

  /**
   * Rebuild target notes based on current activeVoiceId.
   * Active voice notes get role='input', all others get role='reference'.
   */
  function rebuildNotes() {
    if (!state.template) return;
    const config = state.template.config;
    const transposeSemitones = getTotalTransposeSemitones();
    const missingLyricPlaceholder = isStandaloneExerciseTemplate() ? '~' : undefined;
    const visibleVoiceIds = new Set(state.visibleVoiceIds);
    const visibleVoices = config.voices.filter((voice) => visibleVoiceIds.has(voice.voiceId));

    // All visible notes with roles assigned based on activeVoiceId
    state.allTargetNotes = convertExerciseVoicesToTargetNotes(
      visibleVoices,
      config.timeGrid,
      state.tempo,
      state.activeVoiceId,
      {
        waitForInput: state.waitForInputEnabled,
        transposeSemitones,
        missingLyricPlaceholder,
      },
    );

    const enabledGuideVoiceIds = new Set(state.guideEnabledVoiceIds);
    const guideVoices = config.voices.filter((voice) => enabledGuideVoiceIds.has(voice.voiceId));
    state.guideTargetNotes = convertExerciseVoicesToTargetNotes(
      guideVoices,
      config.timeGrid,
      state.tempo,
      null,
      {
        waitForInput: false,
        transposeSemitones,
        missingLyricPlaceholder,
      },
    );
    syncScaleDegreeLabels();
  }

  function hasVoice(voiceId: string): boolean {
    if (!state.template) return false;
    return state.template.config.voices.some((voice) => voice.voiceId === voiceId);
  }

  function getVoiceSynthMix(voiceId: string): VoiceSynthMix {
    const mix = state.synthMixByVoiceId[voiceId];
    const gain = Number.isFinite(mix?.gain) ? Number(mix?.gain) : DEFAULT_SYNTH_GAIN;
    const pan = Number.isFinite(mix?.pan) ? Number(mix?.pan) : DEFAULT_SYNTH_PAN;
    return {
      gain: clampNumber(gain, 0, 2),
      pan: clampNumber(pan, -1, 1),
    };
  }

  function getGuideVoiceMixById(): Record<string, VoiceSynthMix> {
    if (!state.template) return {};
    return Object.fromEntries(
      state.template.config.voices.map((voice) => ([voice.voiceId, getVoiceSynthMix(voice.voiceId)])),
    );
  }

  function rescheduleGuidePlaybackIfPlaying() {
    if (!isWorkshopTemplate()) return;
    if (!state.isPlaying) return;
    guideVoicePlayer.stop();
    if (playbackStartTimeoutId === null) {
      const scheduleOptions = playbackDownbeatPerfMs !== null
        ? {
          startAtPerfMs: playbackDownbeatPerfMs,
          preScheduleMs: 0,
          voiceMixById: getGuideVoiceMixById(),
        }
        : {
          voiceMixById: getGuideVoiceMixById(),
        };
      guideVoicePlayer.scheduleNotes(state.guideTargetNotes, scheduleOptions);
    }
  }

  return {
    get state() {
      return state;
    },

    /**
     * Get list of all voices in the current exercise.
     */
    getVoiceList(): VoiceInfo[] {
      if (!state.template) return [];
      return state.template.config.voices.map(v => ({
        voiceId: v.voiceId,
        name: v.name,
        color: v.color,
      }));
    },

    /**
     * Load an exercise template and convert its voices to target notes.
     */
    loadExercise(exerciseId: string, settings?: Record<string, number | boolean>) {
      const template = getTemplate(exerciseId);
      if (!template || template.type !== 'overdub') {
        console.warn(`[OverdubExercise] Template not found or wrong type: ${exerciseId}`);
        return;
      }

      if (state.isPlaying || startInFlight) {
        clearPendingPlaybackStart();
        clearPendingAutoStop();
        guideVoicePlayer.stop();
        highwayState.stop();
        state.isPlaying = false;
        startInFlight = false;
      }

      const overdubTemplate = template as OverdubExerciseTemplate;
      const config = overdubTemplate.config;

      // Apply tempo override from settings if provided
      const tempoSetting = settings?.tempo;
      const tempo = typeof tempoSetting === 'number' ? tempoSetting : config.tempo;
      const waitSetting = settings?.waitForInput;
      const waitForInput = typeof waitSetting === 'boolean'
        ? waitSetting
        : (config.waitForInput ?? false);
      const durationMs = calculateExerciseDurationMs(config.timeGrid, tempo);
      const baseTransposeSemitones = computeBaseTransposeSemitones(overdubTemplate);

      state.exerciseId = exerciseId;
      state.template = overdubTemplate;
      state.tempo = tempo;
      state.durationMs = durationMs;
      state.waitForInputEnabled = waitForInput;
      state.exerciseBaseTransposeSemitones = baseTransposeSemitones;
      state.exerciseManualShiftSemitones = 0;
      state.effectiveTonic = null;
      state.activeVoiceId = config.voices.length === 1
        ? (config.voices[0]?.voiceId ?? null)
        : null;
      state.guideEnabledVoiceIds = config.voices.map((voice) => voice.voiceId);
      state.visibleVoiceIds = config.voices.map((voice) => voice.voiceId);
      state.synthMixByVoiceId = createDefaultSynthMixByVoiceId(config.voices.map((voice) => voice.voiceId));
      state.isActive = true;
      appState.setUseDegrees(false);

      rebuildNotes();
      appState.setVisualizationMode('highway');
      if (isWorkshopTemplate()) {
        appState.setOverdubMicTrailColorMode('voice');
        overdubState.setRenderableTrailsVisible(true);
      } else {
        overdubState.setRenderableTrailsVisible(false);
      }
      highwayState.setWaitForInput(state.waitForInputEnabled);
      setHighwayTargetNotes();
      restoreExerciseRangeView();

    },

    /**
     * Set the active voice to practice. Pass null for listen-only mode.
     */
    setActiveVoice(voiceId: string | null) {
      state.activeVoiceId = voiceId;
      rebuildNotes();
      setHighwayTargetNotes();

      // If currently playing, restart guide audio for the new voice selection.
      rescheduleGuidePlaybackIfPlaying();
    },

    setWaitForInputEnabled(enabled: boolean) {
      const nextEnabled = !!enabled;
      if (state.waitForInputEnabled === nextEnabled && !state.isPlaying) {
        return;
      }

      const wasPlaying = state.isPlaying && highwayState.state.isPlaying;
      const resumeTimeMs = highwayState.state.currentTimeMs;

      state.waitForInputEnabled = nextEnabled;
      rebuildNotes();
      highwayState.setWaitForInput(nextEnabled);
      setHighwayTargetNotes();

      if (wasPlaying) {
        highwayState.hardCutTo(resumeTimeMs, true);
      }
    },

    getExerciseKeyShiftSemitones(): number {
      return state.exerciseManualShiftSemitones;
    },

    getExerciseLockedTonic(): TonicNote | null {
      if (!isStandaloneExerciseTemplate()) return null;
      return state.effectiveTonic;
    },

    shiftExerciseKey(deltaSemitones: number) {
      if (!isStandaloneExerciseTemplate()) return;
      if (!Number.isFinite(deltaSemitones) || deltaSemitones === 0) return;
      const nextShift = clampNumber(
        state.exerciseManualShiftSemitones + Math.round(deltaSemitones),
        MIN_EXERCISE_KEY_SHIFT,
        MAX_EXERCISE_KEY_SHIFT,
      );
      if (nextShift === state.exerciseManualShiftSemitones) return;

      const wasPlaying = state.isPlaying && highwayState.state.isPlaying;
      const resumeTimeMs = highwayState.state.currentTimeMs;
      state.exerciseManualShiftSemitones = nextShift;
      rebuildNotes();
      setHighwayTargetNotes();
      restoreExerciseRangeView();

      if (wasPlaying) {
        highwayState.hardCutTo(resumeTimeMs, true);
      }
    },

    isGuideVoiceEnabled(voiceId: string): boolean {
      return state.guideEnabledVoiceIds.includes(voiceId);
    },

    isVoiceVisible(voiceId: string): boolean {
      return state.visibleVoiceIds.includes(voiceId);
    },

    getSynthGain(voiceId: string): number {
      return getVoiceSynthMix(voiceId).gain;
    },

    getSynthPan(voiceId: string): number {
      return getVoiceSynthMix(voiceId).pan;
    },

    setSynthGain(voiceId: string, gain: number) {
      if (!state.template || !hasVoice(voiceId)) return;
      const nextGain = clampNumber(Number.isFinite(gain) ? gain : DEFAULT_SYNTH_GAIN, 0, 2);
      const current = getVoiceSynthMix(voiceId);
      state.synthMixByVoiceId = {
        ...state.synthMixByVoiceId,
        [voiceId]: { ...current, gain: nextGain },
      };

      rescheduleGuidePlaybackIfPlaying();
    },

    setSynthPan(voiceId: string, pan: number) {
      if (!state.template || !hasVoice(voiceId)) return;
      const nextPan = clampNumber(Number.isFinite(pan) ? pan : DEFAULT_SYNTH_PAN, -1, 1);
      const current = getVoiceSynthMix(voiceId);
      state.synthMixByVoiceId = {
        ...state.synthMixByVoiceId,
        [voiceId]: { ...current, pan: nextPan },
      };

      rescheduleGuidePlaybackIfPlaying();
    },

    setGuideVoiceEnabled(voiceId: string, enabled: boolean) {
      if (!state.template) return;

      const current = new Set(state.guideEnabledVoiceIds);
      if (enabled) {
        current.add(voiceId);
      } else {
        current.delete(voiceId);
      }
      state.guideEnabledVoiceIds = Array.from(current);
      rebuildNotes();

      rescheduleGuidePlaybackIfPlaying();
    },

    setVoiceVisible(voiceId: string, visible: boolean) {
      if (!state.template) return;

      const current = new Set(state.visibleVoiceIds);
      if (visible) {
        current.add(voiceId);
      } else {
        current.delete(voiceId);
      }
      state.visibleVoiceIds = Array.from(current);
      rebuildNotes();
      setHighwayTargetNotes();

    },

    /**
     * Start the exercise: set highway notes, play guide audio, begin scrolling.
     */
    async start(options?: {
      startDelayMs?: number;
      startAtPerfMs?: number;
      leadInBeats?: number;
      tempoBpm?: number;
    }) {
      if (state.isPlaying || startInFlight) {
        return;
      }

      if (!state.isActive || state.allTargetNotes.length === 0) {
        console.warn('[OverdubExercise] No exercise loaded');
        return;
      }

      startInFlight = true;
      const startDelayMs = Math.max(0, Math.round(options?.startDelayMs ?? 0));
      const leadInBeats = Math.max(0, Math.round(options?.leadInBeats ?? 0));
      const tempoBpm = Math.max(20, Math.round(options?.tempoBpm ?? state.tempo));
      const tailBeatsAfterLastNote = 4;
      const guidePreScheduleMs = 60;
      const shouldPlayGuideSynth = isWorkshopTemplate();
      const targetDownbeatPerfMs = (
        typeof options?.startAtPerfMs === 'number' && Number.isFinite(options.startAtPerfMs)
      )
        ? options.startAtPerfMs
        : performance.now() + startDelayMs;
      playbackDownbeatPerfMs = targetDownbeatPerfMs;

      try {
        // Switch to highway visualization
        appState.setVisualizationMode('highway');

        // Set highway target notes (all voices with per-voice colors)
        highwayState.setWaitForInput(state.waitForInputEnabled);
        setHighwayTargetNotes();
        restoreExerciseRangeView();
        applyPreferredStartZoomIfNeeded();
        highwayState.setTempoBpm(tempoBpm);
        highwayState.setLeadInBeats(leadInBeats);

        state.isPlaying = true;
        const scheduledExerciseId = state.exerciseId;
        highwayState.start();
        highwayState.setCurrentTime(performance.now() - targetDownbeatPerfMs);
        if (shouldPlayGuideSynth) {
          await guideVoicePlayer.init();
        }

        const beginPlayback = () => {
          playbackStartTimeoutId = null;
          if (!state.isPlaying || state.exerciseId !== scheduledExerciseId) return;

          if (shouldPlayGuideSynth) {
            guideVoicePlayer.scheduleNotes(state.guideTargetNotes, {
              startAtPerfMs: targetDownbeatPerfMs,
              preScheduleMs: guidePreScheduleMs,
              voiceMixById: getGuideVoiceMixById(),
            });
          }
          const maxVisibleNoteEndMs = state.allTargetNotes.reduce(
            (latest, note) => Math.max(latest, note.startTimeMs + note.durationMs),
            0,
          );
          const maxGuideNoteEndMs = shouldPlayGuideSynth
            ? state.guideTargetNotes.reduce(
              (latest, note) => Math.max(latest, note.startTimeMs + note.durationMs),
              0,
            )
            : 0;
          const beatDurationMs = 60_000 / tempoBpm;
          const autoStopOffsetMs = Math.max(
            maxVisibleNoteEndMs,
            maxGuideNoteEndMs,
          ) + (tailBeatsAfterLastNote * beatDurationMs);

          const scheduleAutoStopCheck = (delayMs: number) => {
            clearPendingAutoStop();
            playbackAutoStopTimeoutId = window.setTimeout(() => {
              playbackAutoStopTimeoutId = null;
              if (!state.isPlaying || state.exerciseId !== scheduledExerciseId) return;
              const timelineTimeMs = Math.max(0, highwayState.state.currentTimeMs);
              const timelineRemainingMs = autoStopOffsetMs - timelineTimeMs;
              if (timelineRemainingMs <= 0 && !highwayState.state.isWaitingForInput) {
                stopPlaybackSession();
                return;
              }

              // Keep checking against timeline progress so wait-gate pauses do not trigger early stop.
              const nextDelayMs = clampNumber(
                Number.isFinite(timelineRemainingMs)
                  ? Math.round(timelineRemainingMs)
                  : 500,
                150,
                1200,
              );
              scheduleAutoStopCheck(nextDelayMs);
            }, Math.max(0, Math.round(delayMs)));
          };

          const initialTimelineTimeMs = Math.max(0, highwayState.state.currentTimeMs);
          const initialDelayMs = clampNumber(
            Math.round(autoStopOffsetMs - initialTimelineTimeMs),
            150,
            1200,
          );
          clearPendingAutoStop();
          scheduleAutoStopCheck(initialDelayMs);
        };

        const remainingStartDelayMs = Math.max(0, Math.round(targetDownbeatPerfMs - performance.now()));
        const guideScheduleDelayMs = Math.max(0, remainingStartDelayMs - guidePreScheduleMs);
        if (remainingStartDelayMs > 0) {
          clearPendingPlaybackStart();
          playbackStartTimeoutId = window.setTimeout(beginPlayback, guideScheduleDelayMs);
        } else {
          beginPlayback();
        }
      } catch (error) {
        console.error('[OverdubExercise] Failed to start exercise', error);
        clearPendingPlaybackStart();
        clearPendingAutoStop();
        guideVoicePlayer.stop();
        highwayState.stop();
        state.isPlaying = false;
      } finally {
        startInFlight = false;
      }
    },

    /**
     * Stop the exercise: stop audio, stop highway.
     */
    stop() {
      stopPlaybackSession();
    },

    /**
     * Fully reset exercise state.
     */
    reset() {
      stopPlaybackSession();
      guideVoicePlayer.dispose();
      highwayState.setTargetNotes([]);
      overdubState.setRenderableTrailsVisible(false);
      appState.setNoteScaleDegrees([]);
      startInFlight = false;
      state = { ...DEFAULT_STATE };
    },
  };
}

export const overdubExerciseState = createOverdubExerciseState();
