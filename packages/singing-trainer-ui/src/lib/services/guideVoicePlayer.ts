/**
 * Guide Voice Player
 *
 * Plays guide voice notes as synthesized tones during overdub exercises.
 * Uses Tone.js PolySynth with setTimeout scheduling to align with highway scroll.
 */

import * as Tone from 'tone';
import type { TargetNote } from '../stores/highwayState.svelte.js';

const MIN_VOICE_POLYPHONY = 6;
const MAX_POLYPHONY = 64;
const POLYPHONY_HEADROOM = 8;
const DEFAULT_VOLUME_DB = -8;
const MAX_NOTE_LATENESS_MS = 180;
const MIN_VELOCITY = 0.2;
const MAX_VELOCITY = 0.9;
const SYNTH_RELEASE_SEC = 0.06;
const RELEASE_OVERLAP_TAIL_MS = Math.round((SYNTH_RELEASE_SEC * 1000) + 20);
const DEFAULT_PRE_SCHEDULE_MS = 60;
const DEFAULT_VOICE_KEY = '__default__';

export interface GuideVoiceMix {
  gain: number;
  pan: number;
}

type GuideVoiceMixById = Record<string, GuideVoiceMix | undefined>;

interface VoiceSignalChain {
  synth: Tone.PolySynth;
  pan: Tone.Panner;
  gain: Tone.Gain;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function estimatePeakPolyphony(notes: TargetNote[], overlapTailMs = 0): number {
  const events: Array<{ t: number; delta: -1 | 1 }> = [];

  for (const note of notes) {
    if (typeof note.midi !== 'number') continue;
    const start = Math.max(0, note.startTimeMs);
    const end = Math.max(start + 1, start + note.durationMs + overlapTailMs);
    events.push({ t: start, delta: 1 });
    events.push({ t: end, delta: -1 });
  }

  events.sort((a, b) => a.t - b.t || a.delta - b.delta);

  let current = 0;
  let peak = 0;
  for (const event of events) {
    current += event.delta;
    if (current > peak) {
      peak = current;
    }
  }

  return peak;
}

class GuideVoicePlayer {
  private volume: Tone.Volume | null = null;
  private limiter: Tone.Limiter | null = null;
  private voiceChains = new Map<string, VoiceSignalChain>();
  private scheduledTimeouts: number[] = [];
  private scheduleGeneration = 0;
  private baseVolumeDb = DEFAULT_VOLUME_DB;
  private _isPlaying = false;

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  async init(): Promise<void> {
    await Tone.start();

    if (this.volume && this.limiter) {
      return;
    }

    if (!this.limiter) {
      this.limiter = new Tone.Limiter(-1).toDestination();
    }

    if (!this.volume) {
      this.volume = new Tone.Volume(this.baseVolumeDb).connect(this.limiter);
    }
  }

  setVolume(dB: number): void {
    this.baseVolumeDb = dB;
    if (this.volume) {
      this.volume.volume.value = dB;
    }
  }

  private applyNormalization(peakPolyphony: number): void {
    if (!this.volume) return;
    // Power-summing compensation: lower level as simultaneous voices increase.
    const gainCompensationDb = -10 * Math.log10(Math.max(1, peakPolyphony));
    const normalizedDb = clamp(this.baseVolumeDb + gainCompensationDb, -36, this.baseVolumeDb);
    this.volume.volume.value = normalizedDb;
  }

  private getNoteVelocity(peakPolyphony: number): number {
    return clamp(1 / Math.sqrt(Math.max(1, peakPolyphony)), MIN_VELOCITY, MAX_VELOCITY);
  }

  private getOrCreateVoiceChain(voiceId: string): VoiceSignalChain | null {
    if (!this.volume) return null;

    const existing = this.voiceChains.get(voiceId);
    if (existing) return existing;

    const pan = new Tone.Panner(0);
    const gain = new Tone.Gain(1);
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.004,
        decay: 0.08,
        sustain: 0.75,
        release: SYNTH_RELEASE_SEC,
      },
    });

    synth.maxPolyphony = MIN_VOICE_POLYPHONY;
    synth.connect(pan);
    pan.connect(gain);
    gain.connect(this.volume);

    const chain: VoiceSignalChain = { synth, pan, gain };
    this.voiceChains.set(voiceId, chain);
    return chain;
  }

  private getVoiceMix(voiceId: string, voiceMixById?: GuideVoiceMixById): GuideVoiceMix {
    const mix = voiceMixById?.[voiceId];
    const gain = Number.isFinite(mix?.gain) ? Number(mix?.gain) : 1;
    const pan = Number.isFinite(mix?.pan) ? Number(mix?.pan) : 0;
    return {
      gain: clamp(gain, 0, 2),
      pan: clamp(pan, -1, 1),
    };
  }

  private applyVoiceMix(voiceId: string, voiceMixById?: GuideVoiceMixById): void {
    const chain = this.getOrCreateVoiceChain(voiceId);
    if (!chain) return;
    const mix = this.getVoiceMix(voiceId, voiceMixById);
    chain.gain.gain.value = mix.gain;
    chain.pan.pan.value = mix.pan;
  }

  /**
   * Schedule guide voice notes for playback.
   * Notes are played relative to `startAtPerfMs` when provided.
   */
  scheduleNotes(
    notes: TargetNote[],
    options?: {
      startAtPerfMs?: number;
      preScheduleMs?: number;
      voiceMixById?: GuideVoiceMixById;
    },
  ): void {
    if (!this.volume) {
      console.warn('[GuideVoicePlayer] Voice output chain not initialized');
      return;
    }

    this.clearScheduled();
    for (const chain of this.voiceChains.values()) {
      chain.synth.releaseAll();
    }
    if (notes.length === 0) {
      this._isPlaying = false;
      return;
    }

    const notesByVoice = new Map<string, TargetNote[]>();
    for (const note of notes) {
      const voiceKey = note.voiceId ?? DEFAULT_VOICE_KEY;
      const existing = notesByVoice.get(voiceKey);
      if (existing) {
        existing.push(note);
      } else {
        notesByVoice.set(voiceKey, [note]);
      }
    }

    const scheduleIssuedPerfMs = performance.now();
    const referenceStartPerfMs = (
      typeof options?.startAtPerfMs === 'number' && Number.isFinite(options.startAtPerfMs)
    )
      ? options.startAtPerfMs
      : scheduleIssuedPerfMs;
    const preScheduleMs = clamp(
      Math.round(options?.preScheduleMs ?? DEFAULT_PRE_SCHEDULE_MS),
      0,
      200,
    );
    const scheduleId = ++this.scheduleGeneration;
    const peakPolyphonyWithRelease = estimatePeakPolyphony(notes, RELEASE_OVERLAP_TAIL_MS);
    for (const [voiceId, voiceNotes] of notesByVoice) {
      const chain = this.getOrCreateVoiceChain(voiceId);
      if (!chain) continue;
      const peakWithRelease = estimatePeakPolyphony(voiceNotes, RELEASE_OVERLAP_TAIL_MS);
      const maxPolyphony = clamp(
        peakWithRelease + POLYPHONY_HEADROOM,
        MIN_VOICE_POLYPHONY,
        MAX_POLYPHONY,
      );
      chain.synth.maxPolyphony = maxPolyphony;
      this.applyVoiceMix(voiceId, options?.voiceMixById);
    }
    this.applyNormalization(peakPolyphonyWithRelease);
    const velocity = this.getNoteVelocity(peakPolyphonyWithRelease);
    this._isPlaying = true;
    const estimatedActiveVoicesByVoiceId = new Map<string, number>();

    for (const note of notes) {
      if (typeof note.midi !== 'number') continue;

      const voiceId = note.voiceId ?? DEFAULT_VOICE_KEY;
      const chain = this.getOrCreateVoiceChain(voiceId);
      if (!chain) continue;

      const frequency = Tone.Frequency(note.midi, 'midi').toFrequency();
      const startOffsetMs = Math.max(0, note.startTimeMs);
      const intendedAttackPerfMs = referenceStartPerfMs + startOffsetMs;
      const scheduleFirePerfMs = intendedAttackPerfMs - preScheduleMs;
      const timeoutDelayMs = Math.max(0, Math.round(scheduleFirePerfMs - performance.now()));

      const timeoutId = window.setTimeout(() => {
        if (!chain.synth) return;
        if (scheduleId !== this.scheduleGeneration) return;

        const nowPerfMs = performance.now();
        const latenessMs = nowPerfMs - intendedAttackPerfMs;
        if (latenessMs > MAX_NOTE_LATENESS_MS) {
          return;
        }

        const effectiveDurationMs = Math.max(30, note.durationMs - Math.max(0, latenessMs));
        const activeVoicesForVoice = estimatedActiveVoicesByVoiceId.get(voiceId) ?? 0;
        if (activeVoicesForVoice >= chain.synth.maxPolyphony) {
          return;
        }
        const nextActiveVoicesForVoice = activeVoicesForVoice + 1;
        estimatedActiveVoicesByVoiceId.set(voiceId, nextActiveVoicesForVoice);
        const lifetimeMs = effectiveDurationMs + RELEASE_OVERLAP_TAIL_MS;
        const releaseEstimateTimeout = window.setTimeout(() => {
          if (scheduleId !== this.scheduleGeneration) return;
          const current = estimatedActiveVoicesByVoiceId.get(voiceId) ?? 0;
          estimatedActiveVoicesByVoiceId.set(voiceId, Math.max(0, current - 1));
        }, lifetimeMs);
        this.scheduledTimeouts.push(releaseEstimateTimeout);
        const audioDelayMs = Math.max(0, intendedAttackPerfMs - performance.now());
        // Use immediate() to avoid adding Tone's default lookAhead twice.
        const attackTimeSec = Tone.immediate() + (audioDelayMs / 1000);
        chain.synth.triggerAttackRelease(frequency, effectiveDurationMs / 1000, attackTimeSec, velocity);
      }, timeoutDelayMs);

      this.scheduledTimeouts.push(timeoutId);
    }

    // Schedule end of playback
    const lastNote = notes.reduce(
      (latest, n) => (n.startTimeMs + n.durationMs > latest ? n.startTimeMs + n.durationMs : latest),
      0,
    );
    if (lastNote > 0) {
      const endAtPerfMs = referenceStartPerfMs + lastNote;
      const endDelayMs = Math.max(0, Math.round(endAtPerfMs - performance.now()));
      const endTimeoutId = window.setTimeout(() => {
        this._isPlaying = false;
      }, endDelayMs);
      this.scheduledTimeouts.push(endTimeoutId);
    }
  }

  clearScheduled(): void {
    this.scheduleGeneration += 1;
    for (const id of this.scheduledTimeouts) {
      window.clearTimeout(id);
    }
    this.scheduledTimeouts = [];
    this._isPlaying = false;
  }

  stop(): void {
    this.clearScheduled();
    for (const chain of this.voiceChains.values()) {
      chain.synth.releaseAll();
    }
  }

  dispose(): void {
    this.stop();
    for (const chain of this.voiceChains.values()) {
      chain.synth.dispose();
      chain.pan.dispose();
      chain.gain.dispose();
    }
    this.voiceChains.clear();
    if (this.volume) {
      this.volume.dispose();
      this.volume = null;
    }
    if (this.limiter) {
      this.limiter.dispose();
      this.limiter = null;
    }
  }
}

export const guideVoicePlayer = new GuideVoicePlayer();
