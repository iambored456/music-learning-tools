/** Piano harmonic profile used by Student Notation, with a percussive envelope. */
export function createLessonPianoVoice(context: AudioContext, frequency: number, start: number, durationSeconds: number) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const harmonics = [0, 1, .7, .6, .5, .4, .32, .25, .2, .17, .14, .12, .1];
  oscillator.setPeriodicWave(context.createPeriodicWave(new Float32Array(harmonics.length), new Float32Array(harmonics)));
  oscillator.frequency.setValueAtTime(frequency, start);
  const end = start + durationSeconds;
  gain.gain.setValueAtTime(.0001, start);
  gain.gain.linearRampToValueAtTime(.16, start + .01);
  gain.gain.exponentialRampToValueAtTime(.035, Math.max(start + .01, end - .08));
  gain.gain.exponentialRampToValueAtTime(.0001, end);
  oscillator.connect(gain);
  return { oscillator, gain };
}
