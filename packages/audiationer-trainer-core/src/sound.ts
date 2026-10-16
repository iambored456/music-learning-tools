export const SOUND_PRESETS = [
  { id: 'synth', name: 'Synth', wave: 'triangle' },
  { id: 'soft', name: 'Soft', wave: 'sine' },
  { id: 'bright', name: 'Bright', wave: 'sawtooth' },
  { id: 'hollow', name: 'Hollow', wave: 'square' },
] as const;
export type SoundPreset = typeof SOUND_PRESETS[number]['id'];
