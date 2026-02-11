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
import { guideVoicePlayer } from '../services/guideVoicePlayer.js';
import { highwayState, type TargetNote } from './highwayState.svelte.js';
import { appState } from './appState.svelte.js';
import { overdubState } from './overdubState.svelte.js';

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
};

const DEFAULT_SYNTH_GAIN = 1;
const DEFAULT_SYNTH_PAN = 0;

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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
    if (playbackAutoStopTimeoutId === null) return;
    window.clearTimeout(playbackAutoStopTimeoutId);
    playbackAutoStopTimeoutId = null;
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
    console.debug('[OverdubExercise] Playback stopped', { exerciseId: state.exerciseId });
  }

  /**
   * Rebuild target notes based on current activeVoiceId.
   * Active voice notes get role='input', all others get role='reference'.
   */
  function rebuildNotes() {
    if (!state.template) return;
    const config = state.template.config;
    const visibleVoiceIds = new Set(state.visibleVoiceIds);
    const visibleVoices = config.voices.filter((voice) => visibleVoiceIds.has(voice.voiceId));

    // All visible notes with roles assigned based on activeVoiceId
    state.allTargetNotes = convertExerciseVoicesToTargetNotes(
      visibleVoices, config.timeGrid, state.tempo, state.activeVoiceId,
    );

    const enabledGuideVoiceIds = new Set(state.guideEnabledVoiceIds);
    const guideVoices = config.voices.filter((voice) => enabledGuideVoiceIds.has(voice.voiceId));
    state.guideTargetNotes = convertExerciseVoicesToTargetNotes(
      guideVoices, config.timeGrid, state.tempo,
    );
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
      const tempo = (settings?.tempo as number) ?? config.tempo;
      const durationMs = calculateExerciseDurationMs(config.timeGrid, tempo);

      state.exerciseId = exerciseId;
      state.template = overdubTemplate;
      state.tempo = tempo;
      state.durationMs = durationMs;
      state.activeVoiceId = null;
      state.guideEnabledVoiceIds = config.voices.map((voice) => voice.voiceId);
      state.visibleVoiceIds = config.voices.map((voice) => voice.voiceId);
      state.synthMixByVoiceId = createDefaultSynthMixByVoiceId(config.voices.map((voice) => voice.voiceId));
      state.isActive = true;

      rebuildNotes();
      appState.setYAxisRange({
        minMidi: config.minMidiPitch,
        maxMidi: config.maxMidiPitch,
      });
      appState.setVisualizationMode('highway');
      highwayState.setTargetNotes(state.allTargetNotes);
      highwayState.fitTimelineToDuration(durationMs);

      console.debug('[OverdubExercise] Loaded exercise', {
        exerciseId,
        tempo,
        durationMs,
        voiceCount: config.voices.length,
        allNotes: state.allTargetNotes.length,
        guideNotes: state.guideTargetNotes.length,
        synthVoices: Object.keys(state.synthMixByVoiceId).length,
        yAxisRange: { minMidi: config.minMidiPitch, maxMidi: config.maxMidiPitch },
      });
    },

    /**
     * Set the active voice to practice. Pass null for listen-only mode.
     */
    setActiveVoice(voiceId: string | null) {
      state.activeVoiceId = voiceId;
      rebuildNotes();
      highwayState.setTargetNotes(state.allTargetNotes);

      console.debug('[OverdubExercise] Active voice changed', {
        exerciseId: state.exerciseId,
        activeVoiceId: state.activeVoiceId,
        allNotes: state.allTargetNotes.length,
        guideNotes: state.guideTargetNotes.length,
      });

      // If currently playing, restart guide audio for the new voice selection.
      rescheduleGuidePlaybackIfPlaying();
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

      console.debug('[OverdubExercise] Voice synth gain changed', {
        exerciseId: state.exerciseId,
        voiceId,
        gain: Number(nextGain.toFixed(3)),
      });

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

      console.debug('[OverdubExercise] Voice synth pan changed', {
        exerciseId: state.exerciseId,
        voiceId,
        pan: Number(nextPan.toFixed(3)),
      });

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

      console.debug('[OverdubExercise] Guide voice toggle changed', {
        exerciseId: state.exerciseId,
        voiceId,
        enabled,
        enabledGuideVoiceCount: state.guideEnabledVoiceIds.length,
        guideNotes: state.guideTargetNotes.length,
      });

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
      highwayState.setTargetNotes(state.allTargetNotes);

      console.debug('[OverdubExercise] Voice visibility changed', {
        exerciseId: state.exerciseId,
        voiceId,
        visible,
        visibleVoiceCount: state.visibleVoiceIds.length,
        allNotes: state.allTargetNotes.length,
      });
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
        console.debug('[OverdubExercise] start() ignored (already playing or in flight)', {
          isPlaying: state.isPlaying,
          startInFlight,
        });
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
      const noteGridTempoBpm = Math.max(20, Math.round(state.tempo));
      const tailBeatsAfterLastNote = 4;
      const guidePreScheduleMs = 60;
      const targetDownbeatPerfMs = (
        typeof options?.startAtPerfMs === 'number' && Number.isFinite(options.startAtPerfMs)
      )
        ? options.startAtPerfMs
        : performance.now() + startDelayMs;
      playbackDownbeatPerfMs = targetDownbeatPerfMs;

      try {
        // Set viewport pitch range from exercise config
        if (state.template) {
          const config = state.template.config;
          appState.setYAxisRange({
            minMidi: config.minMidiPitch,
            maxMidi: config.maxMidiPitch,
          });
        }

        // Switch to highway visualization
        appState.setVisualizationMode('highway');

        // Set highway target notes (all voices with per-voice colors)
        highwayState.setTargetNotes(state.allTargetNotes);
        highwayState.setTempoBpm(tempoBpm);
        highwayState.setLeadInBeats(leadInBeats);

        state.isPlaying = true;
        const scheduledExerciseId = state.exerciseId;
        highwayState.start();
        highwayState.setCurrentTime(performance.now() - targetDownbeatPerfMs);
        await guideVoicePlayer.init();

        const beginPlayback = () => {
          playbackStartTimeoutId = null;
          if (!state.isPlaying || state.exerciseId !== scheduledExerciseId) return;

          guideVoicePlayer.scheduleNotes(state.guideTargetNotes, {
            startAtPerfMs: targetDownbeatPerfMs,
            preScheduleMs: guidePreScheduleMs,
            voiceMixById: getGuideVoiceMixById(),
          });
          const maxVisibleNoteEndMs = state.allTargetNotes.reduce(
            (latest, note) => Math.max(latest, note.startTimeMs + note.durationMs),
            0,
          );
          const maxGuideNoteEndMs = state.guideTargetNotes.reduce(
            (latest, note) => Math.max(latest, note.startTimeMs + note.durationMs),
            0,
          );
          const beatDurationMs = 60_000 / tempoBpm;
          const autoStopOffsetMs = Math.max(
            maxVisibleNoteEndMs,
            maxGuideNoteEndMs,
          ) + (tailBeatsAfterLastNote * beatDurationMs);
          const autoStopAtPerfMs = targetDownbeatPerfMs + autoStopOffsetMs;
          const autoStopDelayMs = Math.max(0, Math.round(autoStopAtPerfMs - performance.now()));
          clearPendingAutoStop();
          playbackAutoStopTimeoutId = window.setTimeout(() => {
            playbackAutoStopTimeoutId = null;
            if (!state.isPlaying || state.exerciseId !== scheduledExerciseId) return;
            stopPlaybackSession();
          }, autoStopDelayMs);

          console.log('[Timing] OverdubExercise.playbackStarted', {
            exerciseId: state.exerciseId,
            allNotes: state.allTargetNotes.length,
            guideNotes: state.guideTargetNotes.length,
            activeVoiceId: state.activeVoiceId,
            startDelayMs,
            targetDownbeatPerfMs: Math.round(targetDownbeatPerfMs),
            downbeatSkewMs: Math.round(performance.now() - targetDownbeatPerfMs),
            exerciseDurationMs: Math.round(state.durationMs),
            maxVisibleNoteEndMs: Math.round(maxVisibleNoteEndMs),
            maxGuideNoteEndMs: Math.round(maxGuideNoteEndMs),
            beatDurationMs: Math.round(beatDurationMs),
            autoStopTailBeats: tailBeatsAfterLastNote,
            autoStopDelayMs,
            guidePreScheduleMs,
            leadInBeats,
            noteGridTempoBpm,
            highwayTempoBpm: tempoBpm,
          });
        };

        const remainingStartDelayMs = Math.max(0, Math.round(targetDownbeatPerfMs - performance.now()));
        const guideScheduleDelayMs = Math.max(0, remainingStartDelayMs - guidePreScheduleMs);
        if (remainingStartDelayMs > 0) {
          clearPendingPlaybackStart();
          playbackStartTimeoutId = window.setTimeout(beginPlayback, guideScheduleDelayMs);
          console.log('[Timing] OverdubExercise.playbackArmed', {
            exerciseId: state.exerciseId,
            startDelayMs: remainingStartDelayMs,
            guideScheduleDelayMs,
            targetDownbeatPerfMs: Math.round(targetDownbeatPerfMs),
            leadInBeats,
            activeVoiceId: state.activeVoiceId,
            noteGridTempoBpm,
            highwayTempoBpm: tempoBpm,
          });
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
      startInFlight = false;
      console.debug('[OverdubExercise] Session reset', { exerciseId: state.exerciseId });
      state = { ...DEFAULT_STATE };
    },
  };
}

export const overdubExerciseState = createOverdubExerciseState();
