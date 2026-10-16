import { SOUND_PRESETS, midiFrequency, wait, type FreeplayAudio, type SoundPreset, type TrainerAudio } from '@mlt/audiationer-trainer-core';
import { TanpuraDrone } from '@mlt/tanpura-drone';

/** Web Audio notes and the shared tanpura sample, loaded only after an audio gesture. */
export class BrowserTrainerAudio implements TrainerAudio, FreeplayAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private voices = new Set<OscillatorNode>();
  private tanpura: TanpuraDrone | null = null;
  private droneOutput: GainNode | null = null;
  private speech: SpeechSynthesisUtterance | null = null;
  private wave: OscillatorType = 'triangle';

  constructor(private independentDroneVolume = false) {}

  async unlock() {
    if (!this.context || this.context.state === 'closed') {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.65;
      this.master.connect(this.context.destination);
      this.droneOutput = this.context.createGain();
      this.droneOutput.connect(this.independentDroneVolume ? this.context.destination : this.master);
      this.tanpura = new TanpuraDrone(this.context, this.droneOutput);
    }
    const tanpura = this.tanpura;
    if (this.context.state !== 'running') await this.context.resume();
    await tanpura?.prepare();
  }
  volume(value: number) { if (this.master) this.master.gain.value = value; }
  separateDroneVolume(enabled: boolean) {
    this.independentDroneVolume = enabled;
    if (this.droneOutput && this.context && this.master) {
      this.droneOutput.disconnect();
      this.droneOutput.connect(enabled ? this.context.destination : this.master);
    }
  }
  preset(value: SoundPreset) {
    this.wave = SOUND_PRESETS.find(preset => preset.id === value)!.wave;
    for (const voice of this.voices) voice.type = this.wave;
  }
  sustain(midi: number): () => void {
    const ctx = this.context;
    if (!ctx || !this.master) throw new Error('Select a degree to enable audio.');
    const oscillator = ctx.createOscillator(), gain = ctx.createGain();
    oscillator.type = this.wave; oscillator.frequency.value = midiFrequency(midi);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 0.02);
    oscillator.connect(gain); gain.connect(this.master);
    this.voices.add(oscillator);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); this.voices.delete(oscillator); };
    oscillator.start();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
      try { oscillator.stop(ctx.currentTime + 0.1); } catch { /* Already stopped. */ }
    };
  }
  async notes(midis: number[], seconds: number, signal: AbortSignal) {
    signal.throwIfAborted();
    const ctx = this.context;
    if (!ctx || !this.master) throw new Error('Press Start to enable audio.');
    const nodes = midis.map(midi => {
      const oscillator = ctx.createOscillator(), gain = ctx.createGain();
      oscillator.type = this.wave;
      oscillator.frequency.value = midiFrequency(midi);
      const now = ctx.currentTime, peak = 0.22 / Math.sqrt(midis.length);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(peak, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.001, peak * 0.55), now + Math.max(0.03, seconds - 0.07));
      gain.gain.linearRampToValueAtTime(0, now + seconds);
      oscillator.connect(gain); gain.connect(this.master!);
      this.voices.add(oscillator);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); this.voices.delete(oscillator); };
      oscillator.start(now); oscillator.stop(now + seconds + 0.02);
      return oscillator;
    });
    const cancel = () => { for (const node of nodes) { try { node.stop(); } catch { /* Already ended. */ } } };
    signal.addEventListener('abort', cancel, { once: true });
    try { await wait(seconds * 1000, signal); }
    finally { signal.removeEventListener('abort', cancel); }
  }
  drone(midi: number | null, volume: number) {
    this.tanpura?.set(midi, volume);
  }
  async speak(text: string, signal: AbortSignal, volume = 0.8) {
    signal.throwIfAborted();
    if (volume <= 0) return;
    if (!('speechSynthesis' in window)) throw new Error('Spoken answers need browser speech synthesis. Turn off “Play answer after question” or choose another browser.');
    await new Promise<void>((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      this.speech = utterance; utterance.lang = 'en-US'; utterance.rate = 0.85;
      utterance.volume = Math.max(0, Math.min(1, volume));
      const clean = () => {
        clearTimeout(timeout); signal.removeEventListener('abort', cancel);
        utterance.onend = null; utterance.onerror = null;
        if (this.speech === utterance) this.speech = null;
      };
      const cancel = () => { clean(); window.speechSynthesis.cancel(); reject(new DOMException('Cancelled', 'AbortError')); };
      const timeout = setTimeout(() => { clean(); window.speechSynthesis.cancel(); reject(new Error('Speech did not respond. Turn off spoken answers or choose another browser.')); }, 12000);
      utterance.onend = () => { clean(); resolve(); };
      utterance.onerror = () => { clean(); reject(new Error('Speech could not play. Turn off spoken answers or choose another browser.')); };
      signal.addEventListener('abort', cancel, { once: true });
      window.speechSynthesis.speak(utterance);
    });
  }
  stop() {
    for (const voice of this.voices) { try { voice.stop(); } catch { /* Already ended. */ } }
    this.voices.clear(); this.drone(null, 0);
    if (this.speech && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    this.speech = null;
  }
  dispose() {
    this.stop(); this.tanpura?.dispose(); this.tanpura = null;
    this.droneOutput?.disconnect(); this.droneOutput = null;
    void this.context?.close(); this.context = null; this.master = null;
  }
}
