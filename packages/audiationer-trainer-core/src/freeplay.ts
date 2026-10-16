import { midiNote } from './music.ts';
import type { WheelOrder } from '@mlt/compass-core';
import { wait } from './session.ts';
import { SOUND_PRESETS, type SoundPreset } from './sound.ts';
export { SOUND_PRESETS, type SoundPreset } from './sound.ts';

export const FREEPLAY_DEGREES = Array.from({ length: 12 }, (_, i) => i);
const DEFAULTS_VERSION = 1;
export interface FreeplaySettings {
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
export interface FreeplayGesture { finish(sustain: boolean): void; cancel(): void }
interface Voice {
  intent: 'held' | 'tap' | 'sustained';
  release?: () => void;
  cancelTimer?: () => void;
}

/** Free Play has no answer pool or levels. Audio starts only through an explicit action. */
export class FreeplaySession {
  private settings: FreeplaySettings;
  private voices = new Map<number, Voice>();
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
      sounding: [...this.voices].filter(([, voice]) => voice.release).map(([degree]) => degree).concat(this.cycleDegree === null ? [] : [this.cycleDegree]),
      sustained: [...this.voices].filter(([, voice]) => voice.release && voice.intent === 'sustained').map(([degree]) => degree),
      cycling: this.cycleController !== null, awake: this.awake, error: this.error,
    };
  }
  private emit() { this.changed(this.snapshot()); }
  private applyAudio() {
    this.audio.preset(this.settings.soundPreset);
    this.audio.volume(this.settings.melodyVolume);
    this.audio.drone(this.settings.droneVolume ? midiNote(this.settings.tonic, 3, 0) : null, this.settings.droneVolume);
  }
  private release(degree: number, voice: Voice) {
    if (this.voices.get(degree) !== voice) return;
    voice.cancelTimer?.(); voice.release?.(); this.voices.delete(degree); this.emit();
  }
  private finishTap(degree: number, voice: Voice) {
    voice.cancelTimer = this.schedule(() => this.release(degree, voice), 250);
  }
  private fail(error: unknown, revision: number) {
    if (revision !== this.revision) return;
    this.stopAll();
    this.error = error instanceof Error ? error.message : 'Audio could not start. Please try again.';
    this.emit();
  }
  press(degree: number): FreeplayGesture {
    const noop = { finish: () => {}, cancel: () => {} };
    if (!FREEPLAY_DEGREES.includes(degree)) return noop;
    if (this.cycleController) this.stopAll();
    const previous = this.voices.get(degree);
    if (previous) {
      this.release(degree, previous);
      if (previous.intent === 'sustained') return noop;
    }
    const voice: Voice = { intent: 'held' };
    this.voices.set(degree, voice); this.error = null;
    const revision = this.revision;
    void this.audio.unlock().then(() => {
      if (revision !== this.revision || this.voices.get(degree) !== voice) return;
      this.awake = true; this.applyAudio();
      voice.release = this.audio.sustain(midiNote(this.settings.tonic, this.settings.octave, degree));
      if (voice.intent === 'tap') this.finishTap(degree, voice);
      this.emit();
    }).catch(error => { if (this.voices.get(degree) === voice) this.fail(error, revision); });
    return {
      finish: sustain => {
        if (this.voices.get(degree) !== voice || voice.intent !== 'held') return;
        voice.intent = sustain ? 'sustained' : 'tap';
        if (!sustain && voice.release) this.finishTap(degree, voice);
        this.emit();
      },
      cancel: () => this.release(degree, voice),
    };
  }
  configure(input: FreeplaySettings) {
    const next = normalizeFreeplaySettings(input);
    const pitchChanged = next.tonic !== this.settings.tonic || next.octave !== this.settings.octave;
    if (!pitchChanged) { this.settings = next; if (this.awake) this.applyAudio(); return; }
    const sustained = [...this.voices].filter(([, voice]) => voice.intent === 'sustained').map(([degree]) => degree);
    const cycling = this.cycleController !== null, awake = this.awake;
    this.stopAll(); this.settings = next;
    if (cycling) void this.toggleCycle();
    else {
      if (awake) { this.awake = true; this.applyAudio(); }
      for (const degree of sustained) this.press(degree).finish(true);
      this.emit();
    }
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
          await this.audio.notes([midiNote(this.settings.tonic, this.settings.octave, degree)], 0.64, signal);
          signal.throwIfAborted(); this.cycleDegree = null; this.emit();
          await this.pause(160, signal);
        }
      }
    } catch (error) { if (!signal.aborted) this.fail(error, revision); }
  }
  stopAll() {
    this.revision++;
    this.cycleController?.abort(); this.cycleController = null; this.cycleDegree = null;
    for (const voice of this.voices.values()) { voice.cancelTimer?.(); voice.release?.(); }
    this.voices.clear(); this.audio.stop(); this.awake = false; this.emit();
  }
  destroy() { this.stopAll(); }
}
