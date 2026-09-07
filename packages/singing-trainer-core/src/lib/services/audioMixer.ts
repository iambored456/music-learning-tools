import * as Tone from 'tone';

export const AUDIO_MASTER_CHANNELS = ['tanpura', 'droneSynth', 'synth', 'countIn', 'bassDrum'] as const;
export const AUDIO_MASTER_MAX_PERCENT = 300;
export type AudioMasterChannel = typeof AUDIO_MASTER_CHANNELS[number];
export type AudioMasterLevels = Record<AudioMasterChannel, number>;

// The approved balance is baked into each channel. Slider percentages now
// adjust that baseline, so 100% reproduces the chosen mix without compounding it.
const BASELINE_GAIN: AudioMasterLevels = { tanpura: 1.9, droneSynth: 0.56, synth: 1.3, countIn: 0.25, bassDrum: 4.95 };
// Normalize the newly approved sawtooth (80%) and bass drum (165%) adjustments.
const STORAGE_KEY = 'singingTrainer.audioMasterLevels.v4';
const PREVIOUS_STORAGE_KEY = 'singingTrainer.audioMasterLevels.v3';
const DEFAULT_LEVELS: AudioMasterLevels = { tanpura: 100, droneSynth: 100, synth: 100, countIn: 100, bassDrum: 100 };

function loadLevels(): AudioMasterLevels {
  const result = { ...DEFAULT_LEVELS };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const migrating = stored === null;
    const saved: unknown = JSON.parse(stored ?? localStorage.getItem(PREVIOUS_STORAGE_KEY) ?? 'null');
    if (saved && typeof saved === 'object') {
      for (const channel of AUDIO_MASTER_CHANNELS) {
        // Preserve other saved levels; these two sliders start at their new 100%.
        if (migrating && (channel === 'droneSynth' || channel === 'bassDrum')) continue;
        const value = (saved as Record<string, unknown>)[channel];
        if (typeof value === 'number' && Number.isFinite(value)) {
          result[channel] = Math.max(0, Math.min(AUDIO_MASTER_MAX_PERCENT, Math.round(value)));
        }
      }
    }
  } catch { /* Use defaults when storage is unavailable or invalid. */ }
  return result;
}

let levels = loadLevels();
// Shared outputs live for the trainer session. Sources retain ownership of their
// own nodes; creating or changing settings never starts an audio context.
const outputs = new Map<AudioMasterChannel, Tone.Gain>();

export function getAudioMasterLevels(): AudioMasterLevels {
  return { ...levels };
}

/** Call only from an audio source's existing user-initiated initialization. */
export function getAudioMasterOutput(channel: AudioMasterChannel): Tone.Gain {
  let output = outputs.get(channel);
  if (!output) {
    output = new Tone.Gain(BASELINE_GAIN[channel] * levels[channel] / 100).toDestination();
    outputs.set(channel, output);
  }
  return output;
}

/** Returns whether the new setting was also saved for the next visit. */
export function setAudioMasterLevel(channel: AudioMasterChannel, percent: number): boolean {
  if (!Number.isFinite(percent)) return false;
  const value = Math.max(0, Math.min(AUDIO_MASTER_MAX_PERCENT, Math.round(percent)));
  levels = { ...levels, [channel]: value };
  outputs.get(channel)?.gain.rampTo(BASELINE_GAIN[channel] * value / 100, 0.05);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(levels));
    return true;
  } catch { return false; }
}
