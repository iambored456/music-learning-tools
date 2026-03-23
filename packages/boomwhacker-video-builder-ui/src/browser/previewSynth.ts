import { MAIN_PLAYBACK_SYNTH_PROFILE } from '../../../boomwhacker-sketchpad-core/src/constants.ts';

const DEFAULT_ROOT_MIDI = 60;
const DEFAULT_NOTE_GAIN = 0.08;
const ATTACK_SEC = MAIN_PLAYBACK_SYNTH_PROFILE.envelope.attack;
const DECAY_SEC = MAIN_PLAYBACK_SYNTH_PROFILE.envelope.decay;
const SUSTAIN_LEVEL = MAIN_PLAYBACK_SYNTH_PROFILE.envelope.sustain;
const RELEASE_SEC = MAIN_PLAYBACK_SYNTH_PROFILE.envelope.release;
const OSCILLATOR_TYPE = MAIN_PLAYBACK_SYNTH_PROFILE.oscillatorType;
const ENVELOPE_FLOOR_GAIN = 0.0001;

type ActiveVoice = {
  oscillator: OscillatorNode;
  gainNode: GainNode;
};

function midiToFrequency(midi: number): number {
  return 440 * (2 ** ((midi - 69) / 12));
}

function getAudioContextConstructor():
  | (new () => AudioContext)
  | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const audioWindow = window as Window & typeof globalThis & {
    webkitAudioContext?: new () => AudioContext;
  };
  return audioWindow.AudioContext ?? audioWindow.webkitAudioContext ?? null;
}

export class TrianglePreviewSynth {
  private audioContext: AudioContext | null = null;

  private masterGainNode: GainNode | null = null;

  private activeVoices = new Map<string, ActiveVoice>();

  async ensureReady(): Promise<boolean> {
    const AudioContextConstructor = getAudioContextConstructor();
    if (!AudioContextConstructor) {
      return false;
    }

    if (!this.audioContext) {
      this.audioContext = new AudioContextConstructor();
      this.masterGainNode = this.audioContext.createGain();
      this.masterGainNode.gain.value = 0.24;
      this.masterGainNode.connect(this.audioContext.destination);
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    return this.audioContext.state === 'running';
  }

  stopAll(): void {
    for (const noteId of this.activeVoices.keys()) {
      this.stopVoice(noteId);
    }
  }

  async playNote(
    noteId: string,
    pitchInterval: number,
    durationSec: number,
    options?: {
      gain?: number;
      rootMidi?: number;
    },
  ): Promise<boolean> {
    const isReady = await this.ensureReady();
    if (!isReady || !this.audioContext || !this.masterGainNode) {
      return false;
    }

    this.stopVoice(noteId);

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const now = this.audioContext.currentTime;
    const sustainDurationSec = Math.max(0.06, durationSec);
    const totalDurationSec = sustainDurationSec + RELEASE_SEC + 0.02;
    const peakGain = options?.gain ?? DEFAULT_NOTE_GAIN;
    const sustainGain = Math.max(ENVELOPE_FLOOR_GAIN, peakGain * SUSTAIN_LEVEL);
    const rootMidi = options?.rootMidi ?? DEFAULT_ROOT_MIDI;
    const attackEndSec = now + ATTACK_SEC;
    const decayEndSec = Math.min(now + sustainDurationSec, attackEndSec + DECAY_SEC);
    const sustainEndSec = now + sustainDurationSec;

    oscillator.type = OSCILLATOR_TYPE;
    oscillator.frequency.setValueAtTime(midiToFrequency(rootMidi + pitchInterval), now);

    gainNode.gain.setValueAtTime(ENVELOPE_FLOOR_GAIN, now);
    gainNode.gain.exponentialRampToValueAtTime(peakGain, attackEndSec);
    if (decayEndSec > attackEndSec) {
      gainNode.gain.exponentialRampToValueAtTime(sustainGain, decayEndSec);
    }
    gainNode.gain.setValueAtTime(sustainGain, sustainEndSec);
    gainNode.gain.exponentialRampToValueAtTime(ENVELOPE_FLOOR_GAIN, sustainEndSec + RELEASE_SEC);

    oscillator.connect(gainNode);
    gainNode.connect(this.masterGainNode);

    this.activeVoices.set(noteId, {
      oscillator,
      gainNode,
    });

    oscillator.onended = () => {
      this.activeVoices.delete(noteId);
      oscillator.disconnect();
      gainNode.disconnect();
    };

    oscillator.start(now);
    oscillator.stop(now + totalDurationSec);

    return true;
  }

  dispose(): void {
    this.stopAll();
    this.masterGainNode?.disconnect();
    void this.audioContext?.close();
    this.masterGainNode = null;
    this.audioContext = null;
  }

  private stopVoice(noteId: string): void {
    const voice = this.activeVoices.get(noteId);
    if (!voice || !this.audioContext) {
      return;
    }

    const stopTime = this.audioContext.currentTime + 0.01;
    voice.gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
    voice.gainNode.gain.setValueAtTime(Math.max(ENVELOPE_FLOOR_GAIN, voice.gainNode.gain.value), this.audioContext.currentTime);
    voice.gainNode.gain.exponentialRampToValueAtTime(ENVELOPE_FLOOR_GAIN, stopTime);
    voice.oscillator.stop(stopTime + 0.02);
    this.activeVoices.delete(noteId);
  }
}
