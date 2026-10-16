import type { SongTimingState } from './types.js';

export const MAX_BEAT_BOUNDARIES = 20000;
export const MIN_BEAT_GAP_SEC = 0.01;

/** Boundaries include the final endpoint; notes retain their slot indices when these move. */
export function withBeatTimes(timing: SongTimingState, beatTimesSec: number[]): SongTimingState {
  if (beatTimesSec.length > MAX_BEAT_BOUNDARIES || beatTimesSec.length === 1
    || beatTimesSec.some((time, index) => !Number.isFinite(time) || time < 0
      || (index > 0 && time <= beatTimesSec[index - 1]))) {
    throw new Error('Beat times must be finite, nonnegative, and strictly increasing.');
  }
  const beatCount = Math.max(0, beatTimesSec.length - 1);
  return {
    ...timing,
    beatTimesSec: [...beatTimesSec],
    beatCount,
    firstBeatOffsetSec: beatTimesSec[0] ?? 0,
    tempoBpm: beatCount ? 60 / (beatTimesSec[1] - beatTimesSec[0]) : 120,
    firstDownbeatIndex: timing.firstDownbeatIndex !== null
      && Number.isInteger(timing.firstDownbeatIndex)
      && timing.firstDownbeatIndex >= 0 && timing.firstDownbeatIndex < beatCount
      ? timing.firstDownbeatIndex : null,
  };
}

/** Clamp one shared delta, so a group never stretches or crosses adjacent beats. */
export function shiftBeatTimes(times: number[], indices: number[], requestedDelta: number): number[] {
  const selected = new Set(indices.filter(index => Number.isInteger(index) && index >= 0 && index < times.length));
  if (!selected.size || !Number.isFinite(requestedDelta)) return [...times];
  let minDelta = -Infinity;
  let maxDelta = Infinity;
  for (const index of selected) {
    minDelta = Math.max(minDelta, -times[index]);
    if (index > 0 && !selected.has(index - 1)) {
      minDelta = Math.max(minDelta, times[index - 1] + Math.min(MIN_BEAT_GAP_SEC, (times[index] - times[index - 1]) / 2) - times[index]);
    }
    if (index + 1 < times.length && !selected.has(index + 1)) {
      maxDelta = Math.min(maxDelta, times[index + 1] - Math.min(MIN_BEAT_GAP_SEC, (times[index + 1] - times[index]) / 2) - times[index]);
    }
  }
  const delta = Math.max(minDelta, Math.min(maxDelta, requestedDelta));
  return times.map((time, index) => selected.has(index) ? time + delta : time);
}

/** Read SMF tempo/meter events only. Musical notes are deliberately ignored. */
export function importMidiTiming(bytes: Uint8Array, fileName: string, base: SongTimingState): SongTimingState {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let position = 0;
  let limit = bytes.length;
  function need(count: number): void {
    if (position + count > limit) throw new Error('The MIDI file is truncated.');
  }
  function byte(): number { need(1); return bytes[position++]; }
  function u16(): number { need(2); const value = view.getUint16(position); position += 2; return value; }
  function u32(): number { need(4); const value = view.getUint32(position); position += 4; return value; }
  function tag(): string { return String.fromCharCode(byte(), byte(), byte(), byte()); }
  function variable(): number {
    let value = 0;
    for (let index = 0; index < 4; index++) {
      const next = byte(); value = value * 128 + (next & 127);
      if (!(next & 128)) return value;
    }
    throw new Error('Invalid MIDI variable-length value.');
  }
  if (tag() !== 'MThd') throw new Error('Choose a standard MIDI tempo file (.mid).');
  const headerLength = u32();
  if (headerLength < 6) throw new Error('Invalid MIDI header.');
  const format = u16(); const tracks = u16(); const ppq = u16();
  if (format > 1 || !tracks || !ppq || ppq & 0x8000) {
    throw new Error('Use a format 0 or 1 MIDI file with musical tick timing.');
  }
  need(headerLength - 6); position += headerLength - 6;
  const tempos: Array<{ tick: number; microseconds: number }> = [];
  const meters: Array<{ tick: number; numerator: number; denominator: number }> = [];
  let endTick = 0;
  for (let track = 0; track < tracks; track++) {
    limit = bytes.length;
    if (tag() !== 'MTrk') throw new Error('Invalid MIDI track.');
    const length = u32(); need(length); limit = position + length;
    let tick = 0; let running = 0;
    while (position < limit) {
      tick += variable(); endTick = Math.max(endTick, tick);
      need(1);
      let status = bytes[position];
      if (status & 128) { position++; if (status < 240) running = status; }
      else { status = running; if (!status) throw new Error('Invalid MIDI running status.'); }
      if (status === 255) {
        running = 0;
        const type = byte(); const size = variable(); need(size);
        if (type === 81 && size === 3) {
          const microseconds = bytes[position] * 65536 + bytes[position + 1] * 256 + bytes[position + 2];
          if (!microseconds) throw new Error('Invalid MIDI tempo.');
          tempos.push({ tick, microseconds });
        }
        if (type === 88 && size === 4) meters.push({ tick, numerator: bytes[position], denominator: 2 ** bytes[position + 1] });
        position += size;
      } else if (status === 240 || status === 247) {
        running = 0; const size = variable(); need(size); position += size;
      } else if (status >= 128 && status < 240) {
        const count = (status >> 4) === 12 || (status >> 4) === 13 ? 1 : 2;
        for (let index = 0; index < count; index++) if (byte() > 127) throw new Error('Invalid MIDI channel event.');
      } else throw new Error('Unsupported MIDI event.');
    }
  }
  if (!tempos.length || endTick <= 0) throw new Error('This MIDI does not contain a usable tempo map.');
  tempos.sort((a, b) => a.tick - b.tick);
  meters.sort((a, b) => a.tick - b.tick);
  const meter = meters[0] ?? { numerator: 4, denominator: 4 };
  if (meter.numerator < 1 || meter.numerator > 16 || ![2, 4, 8, 16].includes(meter.denominator)) {
    throw new Error('Unsupported MIDI time signature.');
  }
  if (meters.some(event => event.numerator !== meter.numerator || event.denominator !== meter.denominator)) {
    throw new Error('This MIDI changes time signature. Please export a section with one time signature.');
  }
  // One editable beat is one denominator unit (e.g. an eighth note in 6/8).
  const ticksPerBeat = ppq * 4 / meter.denominator;
  const beatCount = Math.ceil(endTick / ticksPerBeat);
  if (beatCount + 1 > MAX_BEAT_BOUNDARIES) throw new Error('This MIDI contains too many beats.');
  let tempoIndex = 0; let previousTick = 0; let seconds = 0; let microseconds = 500000;
  const times: number[] = [];
  for (let beat = 0; beat <= beatCount; beat++) {
    const target = beat * ticksPerBeat;
    while (tempoIndex < tempos.length && tempos[tempoIndex].tick <= target) {
      const event = tempos[tempoIndex++];
      seconds += (event.tick - previousTick) / ppq * microseconds / 1e6;
      previousTick = event.tick; microseconds = event.microseconds;
    }
    times.push(seconds + (target - previousTick) / ppq * microseconds / 1e6);
  }
  return withBeatTimes({ ...base, midiFileName: fileName, firstDownbeatIndex: null,
    timeSignatureNumerator: meter.numerator, timeSignatureDenominator: meter.denominator }, times);
}
