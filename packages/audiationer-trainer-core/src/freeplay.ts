import { midiNote } from './music.ts';
import type { WheelOrder } from '@mlt/compass-core';
import { wait } from './session.ts';
import { SOUND_PRESETS, type SoundPreset } from './sound.ts';
import { normalizeLessonTiming, type LessonTiming } from './timing.ts';
export { SOUND_PRESETS, type SoundPreset } from './sound.ts';

export const FREEPLAY_DEGREES = Array.from({ length: 12 }, (_, i) => i);
const DEFAULTS_VERSION = 1;
export interface FreeplaySettings {
  timing: LessonTiming;
  defaultsVersion: number;
  tonic: number;
  randomTonic: boolean;
  order: WheelOrder;
  octave: number;
  soundPreset: SoundPreset;
  droneVolume: number;
  melodyVolume: number;
}
export function normalizeFreeplaySettings(input: unknown): FreeplaySettings {
  const s = (input && typeof input === 'object' ? input : {}) as Partial<FreeplaySettings>;
  const number = (value: unknown, min: number, max: number, fallback: number) =>
    typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
  return {
    timing: normalizeLessonTiming(s.timing),
    defaultsVersion: DEFAULTS_VERSION,
    tonic: Math.round(number(s.tonic, 0, 11, 0)), octave: Math.round(number(s.octave, 3, 6, 4)),
    randomTonic: typeof s.randomTonic === 'boolean' ? s.randomTonic : true,
    order: s.order === 'fifths' ? 'fifths' : 'chromatic',
    soundPreset: SOUND_PRESETS.some(p => p.id === s.soundPreset) ? s.soundPreset! : 'synth',
    droneVolume: number(s.droneVolume, 0, 1, 1), melodyVolume: number(s.melodyVolume, 0, 1, 0.9),
  };
}
export function migrateFreeplaySettingsDefaults(input: unknown): FreeplaySettings {
  const settings = normalizeFreeplaySettings(input);
  if (input && typeof input === 'object' && (input as Partial<FreeplaySettings>).defaultsVersion !== DEFAULTS_VERSION) {
    if (settings.order === 'fifths') settings.order = 'chromatic';
    if (settings.droneVolume === 0.8) settings.droneVolume = 1;
  }
  return settings;
}
export interface FreeplayAudio {
  unlock(): Promise<void>;
  volume(value: number): void;
  preset(value: SoundPreset): void;
  sustain(midi: number): () => void;
  notes(midis: number[], seconds: number, signal: AbortSignal): Promise<void>;
  drone(midi: number | null, volume: number): void;
  stop(): void;
}
export interface FreeplayState {
  sounding: number[];
  sustained: number[];
  cycling: boolean;
  awake: boolean;
  error: string | null;
}
export interface FreeplayGesture { move(degree: number, octave?: number): void; finish(sustain: boolean): void; cancel(): void }
interface Voice {
  degree: number;
  intent: 'held' | 'tap' | 'sustained';
  release?: () => void;
  cancelTimer?: () => void;
}

/** Free Play has no answer pool or levels. Audio starts only through an explicit action. */
export class FreeplaySession {
  private settings: FreeplaySettings;
  private voices = new Set<Voice>();
  private cycleController: AbortController | null = null;
  private cycleDegree: number | null = null;
  private awake = false;
  private error: string | null = null;
  private revision = 0;

  constructor(
    private audio: FreeplayAudio,
    settings: FreeplaySettings,
    private changed: (state: FreeplayState) => void,
    private pause: (ms: number, signal: AbortSignal) => Promise<void> = wait,
    private schedule: (callback: () => void, ms: number) => () => void = (callback, ms) => {
      const timer = setTimeout(callback, ms); return () => clearTimeout(timer);
    },
  ) { this.settings = normalizeFreeplaySettings(settings); }

  snapshot(): FreeplayState {
    return {
      sounding: [...new Set([...this.voices].filter(voice => voice.release).map(voice => voice.degree).concat(this.cycleDegree === null ? [] : [this.cycleDegree]))],
      sustained: [...new Set([...this.voices].filter(voice => voice.release && voice.intent === 'sustained').map(voice => voice.degree))],
      cycling: this.cycleController !== null, awake: this.awake, error: this.error,
    };
  }
  private emit() { this.changed(this.snapshot()); }
  private applyAudio() {
    this.audio.preset(this.settings.soundPreset);
    this.audio.volume(this.settings.melodyVolume);
    this.audio.drone(this.settings.droneVolume ? midiNote(this.settings.tonic, 3, 0) : null, this.settings.droneVolume);
  }
  private release(voice: Voice) {
    if (!this.voices.has(voice)) return;
    voice.cancelTimer?.(); voice.release?.(); this.voices.delete(voice); this.emit();
  }
  private soundVoice(voice: Voice) {
    voice.release?.();
    voice.release = this.audio.sustain(midiNote(this.settings.tonic, this.settings.octave, voice.degree));
  }
  private finishTap(voice: Voice) {
    voice.cancelTimer = this.schedule(() => this.release(voice), this.settings.timing.tapSeconds * 1000);
  }
  private fail(error: unknown, revision: number) {
    if (revision !== this.revision) return;
    this.stopAll();
    this.error = error instanceof Error ? error.message : 'Audio could not start. Please try again.';
    this.emit();
  }
  press(degree: number): FreeplayGesture {
    const noop = { move: () => {}, finish: () => {}, cancel: () => {} };
    if (!FREEPLAY_DEGREES.includes(degree)) return noop;
    if (this.cycleController) this.stopAll();
    const previous = [...this.voices].find(voice => voice.degree === degree && voice.intent === 'sustained')
      ?? [...this.voices].find(voice => voice.degree === degree);
    if (previous) {
      this.release(previous);
    }
    const voice: Voice = { degree, intent: 'held' };
    let active = false, finished = false;
    const revision = this.revision;
    const activate = () => {
      active = true; this.voices.add(voice); this.error = null;
      void this.audio.unlock().then(() => {
        if (revision !== this.revision || !this.voices.has(voice)) return;
        this.awake = true; this.applyAudio(); this.soundVoice(voice);
        if (voice.intent === 'tap') this.finishTap(voice);
        this.emit();
      }).catch(error => { if (this.voices.has(voice)) this.fail(error, revision); });
    };
    // Clicking a latched degree turns it off; moving away can still begin a new drag.
    if (previous?.intent !== 'sustained') activate();
    return {
      move: (nextDegree, octave = this.settings.octave) => {
        if (finished || revision !== this.revision || !FREEPLAY_DEGREES.includes(nextDegree) || (active && !this.voices.has(voice))) return;
        const next = normalizeFreeplaySettings({ ...this.settings, octave });
        const octaveChanged = next.octave !== this.settings.octave;
        if (nextDegree === voice.degree && !octaveChanged) return;
        voice.degree = nextDegree;
        if (octaveChanged) {
          this.settings = next;
          if (this.awake) this.applyAudio();
          for (const other of this.voices) if (other !== voice && other.release) this.soundVoice(other);
        }
        if (!active) activate();
        else if (voice.release) this.soundVoice(voice);
        this.emit();
      },
      finish: sustain => {
        if (finished) return;
        finished = true;
        if (!this.voices.has(voice) || voice.intent !== 'held') return;
        if (sustain && [...this.voices].some(other => other !== voice && other.degree === voice.degree && other.intent === 'sustained')) {
          this.release(voice); return;
        }
        voice.intent = sustain ? 'sustained' : 'tap';
        if (!sustain && voice.release) this.finishTap(voice);
        this.emit();
      },
      cancel: () => { finished = true; this.release(voice); },
    };
  }
  configure(input: FreeplaySettings) {
    const next = normalizeFreeplaySettings(input);
    const pitchChanged = next.tonic !== this.settings.tonic || next.octave !== this.settings.octave;
    if (!pitchChanged) { this.settings = next; if (this.awake) this.applyAudio(); return; }
    if (this.cycleController) { this.stopAll(); this.settings = next; void this.toggleCycle(); return; }
    this.settings = next;
    if (this.awake) this.applyAudio();
    for (const voice of this.voices) if (voice.release) this.soundVoice(voice);
    this.emit();
  }
  async playDrone() {
    const revision = this.revision;
    this.error = null;
    try {
      await this.audio.unlock();
      if (revision !== this.revision) return;
      this.awake = true; this.applyAudio(); this.emit();
    } catch (error) { this.fail(error, revision); }
  }
  async toggleCycle() {
    if (this.cycleController) { this.stopAll(); return; }
    this.stopAll(); this.error = null;
    const controller = new AbortController(), signal = controller.signal, revision = this.revision;
    this.cycleController = controller; this.emit();
    try {
      await this.audio.unlock(); signal.throwIfAborted();
      this.awake = true; this.applyAudio();
      while (!signal.aborted) {
        for (const degree of FREEPLAY_DEGREES) {
          signal.throwIfAborted(); this.cycleDegree = degree; this.emit();
          await this.audio.notes([midiNote(this.settings.tonic, this.settings.octave, degree)], this.settings.timing.noteSeconds, signal);
          signal.throwIfAborted(); this.cycleDegree = null; this.emit();
          await this.pause(this.settings.timing.noteGapSeconds * 1000, signal);
        }
      }
    } catch (error) { if (!signal.aborted) this.fail(error, revision); }
  }
  stopAll() {
    this.revision++;
    this.cycleController?.abort(); this.cycleController = null; this.cycleDegree = null;
    for (const voice of this.voices) { voice.cancelTimer?.(); voice.release?.(); }
    this.voices.clear(); this.audio.stop(); this.awake = false; this.emit();
  }
  destroy() { this.stopAll(); }
}
