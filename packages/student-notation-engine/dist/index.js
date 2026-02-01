var at = Object.defineProperty;
var rt = (t, e, s) => e in t ? at(t, e, { enumerable: !0, configurable: !0, writable: !0, value: s }) : t[e] = s;
var $ = (t, e, s) => rt(t, typeof e != "symbol" ? e + "" : e, s);
import * as v from "tone";
const j = [
  // === AUDIBLE PITCH RANGE (C8 to A0) ===
  { pitch: "C8", flatName: "C8", sharpName: "C8", toneNote: "C8", frequency: 4186.01, column: "A", hex: "#fcfcfc", isAccidental: !1, midi: 108, pitchClass: 0, octave: 8 },
  { pitch: "B7", flatName: "B7", sharpName: "B7", toneNote: "B7", frequency: 3951.07, column: "B", hex: "#fcf7fc", isAccidental: !1, midi: 107, pitchClass: 11, octave: 7 },
  { pitch: "B♭/A♯7", flatName: "B♭7", sharpName: "A♯7", toneNote: "Bb7", frequency: 3729.31, column: "A", hex: "#f7f5fd", isAccidental: !0, midi: 106, pitchClass: 10, octave: 7 },
  { pitch: "A7", flatName: "A7", sharpName: "A7", toneNote: "A7", frequency: 3520, column: "B", hex: "#f0f4ff", isAccidental: !1, midi: 105, pitchClass: 9, octave: 7 },
  { pitch: "A♭/G♯7", flatName: "A♭7", sharpName: "G♯7", toneNote: "Ab7", frequency: 3322.44, column: "A", hex: "#e6f3fd", isAccidental: !0, midi: 104, pitchClass: 8, octave: 7 },
  { pitch: "G7", flatName: "G7", sharpName: "G7", toneNote: "G7", frequency: 3135.96, column: "B", hex: "#def3f7", isAccidental: !1, midi: 103, pitchClass: 7, octave: 7 },
  { pitch: "G♭/F♯7", flatName: "G♭7", sharpName: "F♯7", toneNote: "Gb7", frequency: 2959.96, column: "A", hex: "#daf2ec", isAccidental: !0, midi: 102, pitchClass: 6, octave: 7 },
  { pitch: "F7", flatName: "F7", sharpName: "F7", toneNote: "F7", frequency: 2793.83, column: "B", hex: "#dcefdf", isAccidental: !1, midi: 101, pitchClass: 5, octave: 7 },
  { pitch: "E7", flatName: "E7", sharpName: "E7", toneNote: "E7", frequency: 2637.02, column: "A", hex: "#e3ebd1", isAccidental: !1, midi: 100, pitchClass: 4, octave: 7 },
  { pitch: "E♭/D♯7", flatName: "E♭7", sharpName: "D♯7", toneNote: "Eb7", frequency: 2489.02, column: "B", hex: "#eee4c8", isAccidental: !0, midi: 99, pitchClass: 3, octave: 7 },
  { pitch: "D7", flatName: "D7", sharpName: "D7", toneNote: "D7", frequency: 2349.32, column: "A", hex: "#f8dcc6", isAccidental: !1, midi: 98, pitchClass: 2, octave: 7 },
  { pitch: "D♭/C♯7", flatName: "D♭7", sharpName: "C♯7", toneNote: "Db7", frequency: 2217.46, column: "B", hex: "#fcd4cd", isAccidental: !0, midi: 97, pitchClass: 1, octave: 7 },
  { pitch: "C7", flatName: "C7", sharpName: "C7", toneNote: "C7", frequency: 2093, column: "A", hex: "#facfdb", isAccidental: !1, midi: 96, pitchClass: 0, octave: 7 },
  { pitch: "B6", flatName: "B6", sharpName: "B6", toneNote: "B6", frequency: 1975.53, column: "B", hex: "#efcdeb", isAccidental: !1, midi: 95, pitchClass: 11, octave: 6 },
  { pitch: "B♭/A♯6", flatName: "B♭6", sharpName: "A♯6", toneNote: "Bb6", frequency: 1864.66, column: "A", hex: "#ddcff9", isAccidental: !0, midi: 94, pitchClass: 10, octave: 6 },
  { pitch: "A6", flatName: "A6", sharpName: "A6", toneNote: "A6", frequency: 1760, column: "B", hex: "#c4d3ff", isAccidental: !1, midi: 93, pitchClass: 9, octave: 6 },
  { pitch: "A♭/G♯6", flatName: "A♭6", sharpName: "G♯6", toneNote: "Ab6", frequency: 1661.22, column: "A", hex: "#abd9fa", isAccidental: !0, midi: 92, pitchClass: 8, octave: 6 },
  { pitch: "G6", flatName: "G6", sharpName: "G6", toneNote: "G6", frequency: 1567.94, column: "B", hex: "#98dde9", isAccidental: !1, midi: 91, pitchClass: 7, octave: 6 },
  { pitch: "G♭/F♯6", flatName: "G♭6", sharpName: "F♯6", toneNote: "Gb6", frequency: 1479.98, column: "A", hex: "#96ddcf", isAccidental: !0, midi: 90, pitchClass: 6, octave: 6 },
  { pitch: "F6", flatName: "F6", sharpName: "F6", toneNote: "F6", frequency: 1396.91, column: "B", hex: "#a6d9b0", isAccidental: !1, midi: 89, pitchClass: 5, octave: 6 },
  { pitch: "E6", flatName: "E6", sharpName: "E6", toneNote: "E6", frequency: 1318.51, column: "A", hex: "#c0d093", isAccidental: !1, midi: 88, pitchClass: 4, octave: 6 },
  { pitch: "E♭/D♯6", flatName: "E♭6", sharpName: "D♯6", toneNote: "Eb6", frequency: 1244.51, column: "B", hex: "#dbc383", isAccidental: !0, midi: 87, pitchClass: 3, octave: 6 },
  { pitch: "D6", flatName: "D6", sharpName: "D6", toneNote: "D6", frequency: 1174.66, column: "A", hex: "#efb586", isAccidental: !1, midi: 86, pitchClass: 2, octave: 6 },
  { pitch: "D♭/C♯6", flatName: "D♭6", sharpName: "C♯6", toneNote: "Db6", frequency: 1108.73, column: "B", hex: "#f8a99c", isAccidental: !0, midi: 85, pitchClass: 1, octave: 6 },
  { pitch: "C6", flatName: "C6", sharpName: "C6", toneNote: "C6", frequency: 1046.5, column: "A", hex: "#f3a2bb", isAccidental: !1, midi: 84, pitchClass: 0, octave: 6 },
  { pitch: "B5", flatName: "B5", sharpName: "B5", toneNote: "B5", frequency: 987.77, column: "B", hex: "#e1a3db", isAccidental: !1, midi: 83, pitchClass: 11, octave: 5 },
  { pitch: "B♭/A♯5", flatName: "B♭5", sharpName: "A♯5", toneNote: "Bb5", frequency: 932.33, column: "A", hex: "#c3a9f4", isAccidental: !0, midi: 82, pitchClass: 10, octave: 5 },
  { pitch: "A5", flatName: "A5", sharpName: "A5", toneNote: "A5", frequency: 880, column: "B", hex: "#9ab2ff", isAccidental: !1, midi: 81, pitchClass: 9, octave: 5 },
  { pitch: "A♭/G♯5", flatName: "A♭5", sharpName: "G♯5", toneNote: "Ab5", frequency: 830.61, column: "A", hex: "#67bdf7", isAccidental: !0, midi: 80, pitchClass: 8, octave: 5 },
  { pitch: "G5", flatName: "G5", sharpName: "G5", toneNote: "G5", frequency: 783.99, column: "B", hex: "#30c6dc", isAccidental: !1, midi: 79, pitchClass: 7, octave: 5 },
  { pitch: "G♭/F♯5", flatName: "G♭5", sharpName: "F♯5", toneNote: "Gb5", frequency: 739.99, column: "A", hex: "#32c8b2", isAccidental: !0, midi: 78, pitchClass: 6, octave: 5 },
  { pitch: "F5", flatName: "F5", sharpName: "F5", toneNote: "F5", frequency: 698.46, column: "B", hex: "#6dc281", isAccidental: !1, midi: 77, pitchClass: 5, octave: 5 },
  { pitch: "E5", flatName: "E5", sharpName: "E5", toneNote: "E5", frequency: 659.25, column: "A", hex: "#a0b556", isAccidental: !1, midi: 76, pitchClass: 4, octave: 5 },
  { pitch: "E♭/D♯5", flatName: "E♭5", sharpName: "D♯5", toneNote: "Eb5", frequency: 622.25, column: "B", hex: "#c5a33f", isAccidental: !0, midi: 75, pitchClass: 3, octave: 5 },
  { pitch: "D5", flatName: "D5", sharpName: "D5", toneNote: "D5", frequency: 587.33, column: "A", hex: "#dc9150", isAccidental: !1, midi: 74, pitchClass: 2, octave: 5 },
  { pitch: "D♭/C♯5", flatName: "D♭5", sharpName: "C♯5", toneNote: "Db5", frequency: 554.37, column: "B", hex: "#e38475", isAccidental: !0, midi: 73, pitchClass: 1, octave: 5 },
  { pitch: "C5", flatName: "C5", sharpName: "C5", toneNote: "C5", frequency: 523.25, column: "A", hex: "#dc7f9d", isAccidental: !1, midi: 72, pitchClass: 0, octave: 5 },
  { pitch: "B4", flatName: "B4", sharpName: "B4", toneNote: "B4", frequency: 493.88, column: "B", hex: "#c781c0", isAccidental: !1, midi: 71, pitchClass: 11, octave: 4 },
  { pitch: "B♭/A♯4", flatName: "B♭4", sharpName: "A♯4", toneNote: "Bb4", frequency: 466.16, column: "A", hex: "#a68ad8", isAccidental: !0, midi: 70, pitchClass: 10, octave: 4 },
  { pitch: "A4", flatName: "A4", sharpName: "A4", toneNote: "A4", frequency: 440, column: "B", hex: "#7d94e0", isAccidental: !1, midi: 69, pitchClass: 9, octave: 4 },
  { pitch: "A♭/G♯4", flatName: "A♭4", sharpName: "G♯4", toneNote: "Ab4", frequency: 415.3, column: "A", hex: "#4c9fd5", isAccidental: !0, midi: 68, pitchClass: 8, octave: 4 },
  { pitch: "G4", flatName: "G4", sharpName: "G4", toneNote: "G4", frequency: 392, column: "B", hex: "#0fa6ba", isAccidental: !1, midi: 67, pitchClass: 7, octave: 4 },
  { pitch: "G♭/F♯4", flatName: "G♭4", sharpName: "F♯4", toneNote: "Gb4", frequency: 369.99, column: "A", hex: "#24a794", isAccidental: !0, midi: 66, pitchClass: 6, octave: 4 },
  { pitch: "F4", flatName: "F4", sharpName: "F4", toneNote: "F4", frequency: 349.23, column: "B", hex: "#5aa26a", isAccidental: !1, midi: 65, pitchClass: 5, octave: 4 },
  { pitch: "E4", flatName: "E4", sharpName: "E4", toneNote: "E4", frequency: 329.63, column: "A", hex: "#849646", isAccidental: !1, midi: 64, pitchClass: 4, octave: 4 },
  { pitch: "E♭/D♯4", flatName: "E♭4", sharpName: "D♯4", toneNote: "Eb4", frequency: 311.13, column: "B", hex: "#a38733", isAccidental: !0, midi: 63, pitchClass: 3, octave: 4 },
  { pitch: "D4", flatName: "D4", sharpName: "D4", toneNote: "D4", frequency: 293.66, column: "A", hex: "#b67740", isAccidental: !1, midi: 62, pitchClass: 2, octave: 4 },
  { pitch: "D♭/C♯4", flatName: "D♭4", sharpName: "C♯4", toneNote: "Db4", frequency: 277.18, column: "B", hex: "#bc6c5f", isAccidental: !0, midi: 61, pitchClass: 1, octave: 4 },
  { pitch: "C4", flatName: "C4", sharpName: "C4", toneNote: "C4", frequency: 261.63, column: "A", hex: "#b56880", isAccidental: !1, midi: 60, pitchClass: 0, octave: 4 },
  { pitch: "B3", flatName: "B3", sharpName: "B3", toneNote: "B3", frequency: 246.94, column: "B", hex: "#a3699e", isAccidental: !1, midi: 59, pitchClass: 11, octave: 3 },
  { pitch: "B♭/A♯3", flatName: "B♭3", sharpName: "A♯3", toneNote: "Bb3", frequency: 233.08, column: "A", hex: "#8870b1", isAccidental: !0, midi: 58, pitchClass: 10, octave: 3 },
  { pitch: "A3", flatName: "A3", sharpName: "A3", toneNote: "A3", frequency: 220, column: "B", hex: "#6578b7", isAccidental: !1, midi: 57, pitchClass: 9, octave: 3 },
  { pitch: "A♭/G♯3", flatName: "A♭3", sharpName: "G♯3", toneNote: "Ab3", frequency: 207.65, column: "A", hex: "#3c81ad", isAccidental: !0, midi: 56, pitchClass: 8, octave: 3 },
  { pitch: "G3", flatName: "G3", sharpName: "G3", toneNote: "G3", frequency: 196, column: "B", hex: "#0e8696", isAccidental: !1, midi: 55, pitchClass: 7, octave: 3 },
  { pitch: "G♭/F♯3", flatName: "G♭3", sharpName: "F♯3", toneNote: "Gb3", frequency: 185, column: "A", hex: "#1b8777", isAccidental: !0, midi: 54, pitchClass: 6, octave: 3 },
  { pitch: "F3", flatName: "F3", sharpName: "F3", toneNote: "F3", frequency: 174.61, column: "B", hex: "#478255", isAccidental: !1, midi: 53, pitchClass: 5, octave: 3 },
  { pitch: "E3", flatName: "E3", sharpName: "E3", toneNote: "E3", frequency: 164.81, column: "A", hex: "#697836", isAccidental: !1, midi: 52, pitchClass: 4, octave: 3 },
  { pitch: "E♭/D♯3", flatName: "E♭3", sharpName: "D♯3", toneNote: "Eb3", frequency: 155.56, column: "B", hex: "#836b27", isAccidental: !0, midi: 51, pitchClass: 3, octave: 3 },
  { pitch: "D3", flatName: "D3", sharpName: "D3", toneNote: "D3", frequency: 146.83, column: "A", hex: "#925e32", isAccidental: !1, midi: 50, pitchClass: 2, octave: 3 },
  { pitch: "D♭/C♯3", flatName: "D♭3", sharpName: "C♯3", toneNote: "Db3", frequency: 138.59, column: "B", hex: "#96554b", isAccidental: !0, midi: 49, pitchClass: 1, octave: 3 },
  { pitch: "C3", flatName: "C3", sharpName: "C3", toneNote: "C3", frequency: 130.81, column: "A", hex: "#905165", isAccidental: !1, midi: 48, pitchClass: 0, octave: 3 },
  { pitch: "B2", flatName: "B2", sharpName: "B2", toneNote: "B2", frequency: 123.47, column: "B", hex: "#80527c", isAccidental: !1, midi: 47, pitchClass: 11, octave: 2 },
  { pitch: "B♭/A♯2", flatName: "B♭2", sharpName: "A♯2", toneNote: "Bb2", frequency: 116.54, column: "A", hex: "#6a578c", isAccidental: !0, midi: 46, pitchClass: 10, octave: 2 },
  { pitch: "A2", flatName: "A2", sharpName: "A2", toneNote: "A2", frequency: 110, column: "B", hex: "#4e5e90", isAccidental: !1, midi: 45, pitchClass: 9, octave: 2 },
  { pitch: "A♭/G♯2", flatName: "A♭2", sharpName: "G♯2", toneNote: "Ab2", frequency: 103.83, column: "A", hex: "#2d6488", isAccidental: !0, midi: 44, pitchClass: 8, octave: 2 },
  { pitch: "G2", flatName: "G2", sharpName: "G2", toneNote: "G2", frequency: 98, column: "B", hex: "#096875", isAccidental: !1, midi: 43, pitchClass: 7, octave: 2 },
  { pitch: "G♭/F♯2", flatName: "G♭2", sharpName: "F♯2", toneNote: "Gb2", frequency: 92.5, column: "A", hex: "#13685b", isAccidental: !0, midi: 42, pitchClass: 6, octave: 2 },
  { pitch: "F2", flatName: "F2", sharpName: "F2", toneNote: "F2", frequency: 87.31, column: "B", hex: "#356440", isAccidental: !1, midi: 41, pitchClass: 5, octave: 2 },
  { pitch: "E2", flatName: "E2", sharpName: "E2", toneNote: "E2", frequency: 82.41, column: "A", hex: "#505c28", isAccidental: !1, midi: 40, pitchClass: 4, octave: 2 },
  { pitch: "E♭/D♯2", flatName: "E♭2", sharpName: "D♯2", toneNote: "Eb2", frequency: 77.78, column: "B", hex: "#63511c", isAccidental: !0, midi: 39, pitchClass: 3, octave: 2 },
  { pitch: "D2", flatName: "D2", sharpName: "D2", toneNote: "D2", frequency: 73.42, column: "A", hex: "#6e4724", isAccidental: !1, midi: 38, pitchClass: 2, octave: 2 },
  { pitch: "D♭/C♯2", flatName: "D♭2", sharpName: "C♯2", toneNote: "Db2", frequency: 69.3, column: "B", hex: "#713f37", isAccidental: !0, midi: 37, pitchClass: 1, octave: 2 },
  { pitch: "C2", flatName: "C2", sharpName: "C2", toneNote: "C2", frequency: 65.41, column: "A", hex: "#6c3c4b", isAccidental: !1, midi: 36, pitchClass: 0, octave: 2 },
  { pitch: "B1", flatName: "B1", sharpName: "B1", toneNote: "B1", frequency: 61.74, column: "B", hex: "#603c5d", isAccidental: !1, midi: 35, pitchClass: 11, octave: 1 },
  { pitch: "B♭/A♯1", flatName: "B♭1", sharpName: "A♯1", toneNote: "Bb1", frequency: 58.27, column: "A", hex: "#4e4068", isAccidental: !0, midi: 34, pitchClass: 10, octave: 1 },
  { pitch: "A1", flatName: "A1", sharpName: "A1", toneNote: "A1", frequency: 55, column: "B", hex: "#38446b", isAccidental: !1, midi: 33, pitchClass: 9, octave: 1 },
  { pitch: "A♭/G♯1", flatName: "A♭1", sharpName: "G♯1", toneNote: "Ab1", frequency: 51.91, column: "A", hex: "#1f4964", isAccidental: !0, midi: 32, pitchClass: 8, octave: 1 },
  { pitch: "G1", flatName: "G1", sharpName: "G1", toneNote: "G1", frequency: 49, column: "B", hex: "#044b55", isAccidental: !1, midi: 31, pitchClass: 7, octave: 1 },
  { pitch: "G♭/F♯1", flatName: "G♭1", sharpName: "F♯1", toneNote: "Gb1", frequency: 46.25, column: "A", hex: "#0c4b41", isAccidental: !0, midi: 30, pitchClass: 6, octave: 1 },
  { pitch: "F1", flatName: "F1", sharpName: "F1", toneNote: "F1", frequency: 43.65, column: "B", hex: "#24472c", isAccidental: !1, midi: 29, pitchClass: 5, octave: 1 },
  { pitch: "E1", flatName: "E1", sharpName: "E1", toneNote: "E1", frequency: 41.2, column: "A", hex: "#38401a", isAccidental: !1, midi: 28, pitchClass: 4, octave: 1 },
  { pitch: "E♭/D♯1", flatName: "E♭1", sharpName: "D♯1", toneNote: "Eb1", frequency: 38.89, column: "B", hex: "#463811", isAccidental: !0, midi: 27, pitchClass: 3, octave: 1 },
  { pitch: "D1", flatName: "D1", sharpName: "D1", toneNote: "D1", frequency: 36.71, column: "A", hex: "#4d3017", isAccidental: !1, midi: 26, pitchClass: 2, octave: 1 },
  { pitch: "D♭/C♯1", flatName: "D♭1", sharpName: "C♯1", toneNote: "Db1", frequency: 34.65, column: "B", hex: "#4f2a24", isAccidental: !0, midi: 25, pitchClass: 1, octave: 1 },
  { pitch: "C1", flatName: "C1", sharpName: "C1", toneNote: "C1", frequency: 32.7, column: "A", hex: "#4a2733", isAccidental: !1, midi: 24, pitchClass: 0, octave: 1 },
  { pitch: "B0", flatName: "B0", sharpName: "B0", toneNote: "B0", frequency: 30.87, column: "B", hex: "#41273f", isAccidental: !1, midi: 23, pitchClass: 11, octave: 0 },
  { pitch: "B♭/A♯0", flatName: "B♭0", sharpName: "A♯0", toneNote: "Bb0", frequency: 29.14, column: "A", hex: "#342a46", isAccidental: !0, midi: 22, pitchClass: 10, octave: 0 },
  { pitch: "A0", flatName: "A0", sharpName: "A0", toneNote: "A0", frequency: 27.5, column: "B", hex: "#242c48", isAccidental: !1, midi: 21, pitchClass: 9, octave: 0 }
], fe = /* @__PURE__ */ new Map(), lt = /* @__PURE__ */ new Map();
j.forEach((t, e) => {
  fe.set(t.toneNote, e), t.midi !== void 0 && lt.set(t.midi, e);
});
function gn(t) {
  const e = fe.get(t);
  return e !== void 0 ? j[e] : void 0;
}
function Sn(t) {
  return j[t];
}
function _e(t) {
  return fe.get(t) ?? -1;
}
function ct(t, e) {
  const s = _e(t), C = _e(e);
  return s === -1 || C === -1 ? null : {
    topIndex: Math.min(s, C),
    bottomIndex: Math.max(s, C)
  };
}
const dt = {
  attack: 0.1,
  decay: 0.2,
  sustain: 0.8,
  release: 0.3
}, ut = {
  enabled: !1,
  blend: 0.5,
  cutoff: 0.5,
  resonance: 0,
  type: "lowpass",
  mix: 1
}, ht = {
  speed: 5,
  span: 0
}, mt = {
  speed: 5,
  span: 0
};
function ft() {
  const t = [
    "#4a90e2",
    // Blue
    "#e24a4a",
    // Red
    "#4ae24a",
    // Green
    "#e2e24a",
    // Yellow
    "#e24ae2",
    // Magenta
    "#4ae2e2",
    // Cyan
    "#e2a04a",
    // Orange
    "#a04ae2"
    // Purple
  ], e = {};
  return t.forEach((s) => {
    const C = new Float32Array(32);
    C[0] = 1;
    const n = new Float32Array(32);
    e[s] = {
      name: "Sine",
      adsr: { ...dt },
      coeffs: C,
      phases: n,
      filter: { ...ut },
      activePresetName: "sine",
      gain: 1,
      vibrato: { ...ht },
      tremelo: { ...mt }
    };
  }), e;
}
function pt() {
  const t = new Array(16).fill(2), e = t.slice(0, -1).map((s, C) => (C + 1) % 4 === 0 ? "solid" : "dashed");
  return {
    macrobeatGroupings: t,
    macrobeatBoundaryStyles: e,
    hasAnacrusis: !1,
    baseMicrobeatPx: 40,
    tempoModulationMarkers: []
  };
}
function gt() {
  const t = ct("G5", "C4");
  return t || {
    topIndex: 0,
    bottomIndex: Math.max(0, j.length - 1)
  };
}
function St() {
  const t = ft();
  return {
    // --- Data & History ---
    placedNotes: [],
    placedChords: [],
    tonicSignGroups: {},
    sixteenthStampPlacements: [],
    tripletStampPlacements: [],
    annotations: [],
    lassoSelection: {
      selectedItems: [],
      convexHull: null,
      isActive: !1
    },
    history: [{
      notes: [],
      tonicSignGroups: {},
      timbres: JSON.parse(JSON.stringify(t)),
      placedChords: [],
      sixteenthStampPlacements: [],
      tripletStampPlacements: [],
      annotations: [],
      lassoSelection: { selectedItems: [], convexHull: null, isActive: !1 }
    }],
    historyIndex: 0,
    fullRowData: [...j],
    pitchRange: gt(),
    // --- Rhythm ---
    ...pt(),
    selectedModulationRatio: null,
    // --- Timbres & Colors ---
    timbres: t,
    colorPalette: {
      "#4a90e2": { primary: "#4a90e2", light: "#a8c8f0" },
      "#e24a4a": { primary: "#e24a4a", light: "#f0a8a8" },
      "#4ae24a": { primary: "#4ae24a", light: "#a8f0a8" },
      "#e2e24a": { primary: "#e2e24a", light: "#f0f0a8" },
      "#e24ae2": { primary: "#e24ae2", light: "#f0a8f0" },
      "#4ae2e2": { primary: "#4ae2e2", light: "#a8f0f0" },
      "#e2a04a": { primary: "#e2a04a", light: "#f0d0a8" },
      "#a04ae2": { primary: "#a04ae2", light: "#d0a8f0" }
    },
    // --- UI & View State ---
    selectedTool: "note",
    previousTool: "note",
    selectedToolTonicNumber: 1,
    selectedNote: { shape: "circle", color: "#4a90e2" },
    deviceProfile: {
      isMobile: !1,
      isTouch: !1,
      isCoarsePointer: !1,
      orientation: "landscape",
      width: 0,
      height: 0
    },
    activeChordId: null,
    activeChordIntervals: ["1P"],
    // Start with just root (U) selected
    isIntervalsInverted: !1,
    chordPositionState: 0,
    // 0 = Root, 1 = 1st Inversion, 2 = 2nd Inversion
    gridPosition: 0,
    viewportRows: 0,
    logicRows: 0,
    cellWidth: 0,
    cellHeight: 0,
    columnWidths: [],
    musicalColumnWidths: [],
    degreeDisplayMode: "off",
    accidentalMode: { sharp: !0, flat: !0 },
    showFrequencyLabels: !1,
    showOctaveLabels: !0,
    focusColours: !1,
    // --- Playback ---
    isPlaying: !1,
    isPaused: !1,
    isLooping: !1,
    tempo: 90,
    playheadMode: "cursor",
    // --- Waveform ---
    waveformExtendedView: !1,
    // --- ADSR ---
    adsrTimeAxisScale: 1,
    // --- Print ---
    isPrintPreviewActive: !1,
    printOptions: {
      pageSize: "letter",
      includeButtonGrid: !0,
      includeDrums: !0,
      includeLeftLegend: !0,
      includeRightLegend: !0,
      orientation: "landscape",
      colorMode: "color",
      cropTop: 0,
      cropBottom: 1,
      cropLeft: 0,
      cropRight: 1
    },
    // --- Long Notes Style ---
    longNoteStyle: "style1"
  };
}
function Ve(t) {
  if (!(!t || t.isDrum) && t.shape === "circle" && typeof t.startColumnIndex == "number") {
    const e = t.startColumnIndex + 1;
    (typeof t.endColumnIndex != "number" || t.endColumnIndex < e) && (t.endColumnIndex = e);
  }
}
function de(t, e) {
  if (typeof t.row != "number") return;
  const s = e.length > 0 ? e.length - 1 : -1;
  if (s < 0) return;
  const C = typeof t.globalRow == "number" ? t.globalRow : t.row, n = Math.max(0, Math.min(s, Math.round(C)));
  t.globalRow = n, t.row = n;
}
function te() {
  return `uuid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function yt(t = {}) {
  const {
    getMacrobeatInfo: e,
    getDegreeForNote: s,
    hasAccidental: C,
    log: n = () => {
    }
  } = t;
  return {
    /**
     * Adds a note to the state.
     * IMPORTANT: This function no longer records history. The calling function is responsible for that.
     */
    addNote(l) {
      const o = this.state.placedNotes.find(
        (p) => !p.isDrum && p.row === l.row && p.startColumnIndex === l.startColumnIndex && p.color === l.color
      );
      if (o) {
        if (this.state.degreeDisplayMode !== "off" && s && C) {
          const p = s(o, this.state);
          if (p && C(p))
            return o.enharmonicPreference = !o.enharmonicPreference, n("debug", "[ENHARMONIC] Toggled enharmonic preference for note", {
              noteUuid: o.uuid,
              currentDegree: p,
              enharmonicPreference: o.enharmonicPreference
            }), this.emit("notesChanged"), o;
        }
        return null;
      }
      const d = { ...l, uuid: te() };
      return Ve(d), de(d, this.state.fullRowData), this.state.placedNotes.push(d), this.emit("notesChanged"), d;
    },
    updateNoteTail(l, o) {
      let d = o;
      l.shape === "circle" && (d = Math.max(l.startColumnIndex + 1, o)), l.endColumnIndex = d, this.emit("notesChanged");
    },
    updateMultipleNoteTails(l, o) {
      l.forEach((d) => {
        let p = o;
        d.shape === "circle" && (p = Math.max(d.startColumnIndex + 1, o)), d.endColumnIndex = p;
      }), this.emit("notesChanged");
    },
    /**
     * Updates a note's row position during drag operations.
     *
     * IMPORTANT: This function sets both `row` and `globalRow` directly.
     * We intentionally skip calling updateGlobalRow() because it would
     * use the OLD globalRow value as a candidate, then overwrite our
     * newly-set row back to the old value. This was the root cause of
     * a bug where notes wouldn't visually move during drag.
     *
     * The relationship between row and globalRow:
     * - `row`: The current visual row position (used for rendering)
     * - `globalRow`: The row in global pitch data coordinates (survives view changes)
     * During interactive drag, these should always be kept in sync.
     */
    updateNoteRow(l, o) {
      l.row = o, l.globalRow = o, this.emit("notesChanged");
    },
    updateMultipleNoteRows(l, o) {
      l.forEach((d, p) => {
        const r = o[p];
        r !== void 0 && (d.row = r, de(d, this.state.fullRowData));
      }), this.emit("notesChanged");
    },
    updateNotePosition(l, o) {
      l.startColumnIndex = o, l.endColumnIndex = l.shape === "circle" ? o + 1 : o, this.emit("notesChanged");
    },
    updateMultipleNotePositions(l, o) {
      l.forEach((d) => {
        d.startColumnIndex = o, d.endColumnIndex = d.shape === "circle" ? o + 1 : o;
      }), this.emit("notesChanged");
    },
    removeNote(l) {
      const o = this.state.placedNotes.indexOf(l);
      o > -1 && (this.state.placedNotes.splice(o, 1), this.emit("notesChanged"));
    },
    removeMultipleNotes(l) {
      const o = new Set(l);
      this.state.placedNotes = this.state.placedNotes.filter((d) => !o.has(d)), this.emit("notesChanged");
    },
    eraseInPitchArea(l, o, d = 1, p = !0) {
      const r = l + d - 1, m = o - 1, f = o + 1;
      let u = !1;
      const T = this.state.placedNotes.length;
      return this.state.placedNotes = this.state.placedNotes.filter((i) => {
        if (i.isDrum) return !0;
        if (i.shape === "circle") {
          const g = i.startColumnIndex + 1, I = typeof i.endColumnIndex == "number" ? Math.max(g, i.endColumnIndex) : g, P = i.startColumnIndex <= r && I >= l, c = i.row >= m && i.row <= f;
          if (P && c)
            return !1;
        } else if (i.row >= m && i.row <= f && i.startColumnIndex <= r && i.endColumnIndex >= l)
          return !1;
        return !0;
      }), this.state.placedNotes.length < T && (u = !0), u && (this.emit("notesChanged"), p && this.recordState()), u;
    },
    eraseDrumNoteAt(l, o, d = !0) {
      const p = String(o), r = this.state.placedNotes.length;
      this.state.placedNotes = this.state.placedNotes.filter(
        (f) => !(f.isDrum && String(f.drumTrack) === p && f.startColumnIndex === l)
      );
      const m = this.state.placedNotes.length < r;
      return m && (this.emit("notesChanged"), d && this.recordState()), m;
    },
    toggleDrumNote(l) {
      const o = String(l.drumTrack), d = this.state.placedNotes.findIndex(
        (p) => p.isDrum && String(p.drumTrack) === o && p.startColumnIndex === l.startColumnIndex
      );
      if (d >= 0)
        this.state.placedNotes.splice(d, 1);
      else {
        const p = {
          ...l,
          uuid: te(),
          isDrum: !0,
          endColumnIndex: l.endColumnIndex ?? l.startColumnIndex
        };
        this.state.placedNotes.push(p);
      }
      this.emit("notesChanged"), this.recordState();
    },
    addTonicSignGroup(l) {
      n("debug", "Starting addTonicSignGroup", { tonicSignGroup: l });
      const o = l[0];
      if (!o) return;
      const { preMacrobeatIndex: d } = o;
      if (n("debug", "preMacrobeatIndex", { preMacrobeatIndex: d }), Object.entries(this.state.tonicSignGroups).find(
        ([, T]) => T.some((i) => i.preMacrobeatIndex === d)
      )) {
        n("debug", "Existing tonic already present for measure, skipping", { preMacrobeatIndex: d });
        return;
      }
      if (!e) {
        n("error", "getMacrobeatInfo callback not provided");
        return;
      }
      const r = e(this.state, d + 1).startColumn;
      n("debug", "Boundary column (canvas-space) for shifting notes", { boundaryColumn: r });
      const m = this.state.placedNotes.filter((T) => T.startColumnIndex >= r);
      n("debug", "Notes that will be shifted", {
        noteRanges: m.map((T) => `${T.startColumnIndex}-${T.endColumnIndex}`)
      }), this.state.placedNotes.forEach((T) => {
        if (T.startColumnIndex >= r) {
          const i = T.startColumnIndex, g = T.endColumnIndex;
          T.startColumnIndex = T.startColumnIndex + 2, T.endColumnIndex = T.endColumnIndex + 2, n("debug", `Shifted note from ${i}-${g} to ${T.startColumnIndex}-${T.endColumnIndex}`);
        }
      });
      const f = te(), u = l.map((T) => ({
        ...T,
        uuid: f,
        globalRow: typeof T.globalRow == "number" ? T.globalRow : T.row
      }));
      this.state.tonicSignGroups[f] = u, n("debug", "Added tonic group", { uuid: f, columns: u.map((T) => T.columnIndex) }), n("debug", "Emitting events: notesChanged, rhythmStructureChanged"), this.emit("notesChanged"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    /**
     * Erases tonic sign at the specified column index (canvas-space)
     */
    eraseTonicSignAt(l, o = !0) {
      const d = Object.entries(this.state.tonicSignGroups).find(
        ([, T]) => T.some((i) => i.columnIndex === l)
      );
      if (!d)
        return !1;
      if (!e)
        return n("error", "getMacrobeatInfo callback not provided"), !1;
      const [p, r] = d, m = r[0];
      if (!m) return !1;
      const f = m.preMacrobeatIndex, u = e(this.state, f + 1).startColumn;
      return delete this.state.tonicSignGroups[p], this.state.placedNotes.forEach((T) => {
        T.startColumnIndex >= u && (T.startColumnIndex = T.startColumnIndex - 2, T.endColumnIndex = T.endColumnIndex - 2);
      }), this.emit("notesChanged"), this.emit("rhythmStructureChanged"), o && this.recordState(), !0;
    },
    clearAllNotes() {
      this.state.placedNotes = [], this.state.tonicSignGroups = {}, this.emit("notesChanged"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    loadNotes(l) {
      const o = (l || []).map((d) => {
        const p = {
          ...d,
          uuid: (d == null ? void 0 : d.uuid) ?? te()
        };
        return Ve(p), de(p, this.state.fullRowData), p;
      });
      this.state.placedNotes = o, this.emit("notesChanged"), this.recordState();
    }
  };
}
function Ct() {
  return `sixteenth-stamp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function Tt(t = {}) {
  const {
    getPlacedTonicSigns: e,
    isWithinTonicSpan: s,
    log: C = () => {
    }
  } = t;
  return {
    /**
     * Adds a stamp placement to the state
     * @param startColumn Canvas-space column index (0 = first musical beat)
     * @returns The placement if successful, null if blocked by tonic column
     */
    addSixteenthStampPlacement(n, l, o, d = "#4a90e2") {
      const p = l + 2;
      if (e && s) {
        const u = e(this.state);
        (s(l, u) || s(l + 1, u)) && C("debug", "Cannot place sixteenth stamp - overlaps tonic column", {
          sixteenthStampId: n,
          startColumn: l,
          row: o
        });
      }
      const r = this.state.sixteenthStampPlacements.find(
        (u) => u.row === o && u.startColumn < p && u.endColumn > l
      );
      r && this.removeSixteenthStampPlacement(r.id);
      const m = o, f = {
        id: Ct(),
        sixteenthStampId: n,
        startColumn: l,
        endColumn: p,
        row: o,
        globalRow: m,
        color: d,
        timestamp: Date.now(),
        shapeOffsets: {}
      };
      return this.state.sixteenthStampPlacements.push(f), this.emit("sixteenthStampPlacementsChanged"), C("debug", `Added sixteenth stamp ${n} at canvas-space ${l}-${p},${o}`, {
        sixteenthStampId: n,
        startColumn: l,
        endColumn: p,
        row: o,
        placementId: f.id
      }), f;
    },
    /**
     * Removes a stamp placement by ID
     */
    removeSixteenthStampPlacement(n) {
      const l = this.state.sixteenthStampPlacements.findIndex((d) => d.id === n);
      if (l === -1) return !1;
      const o = this.state.sixteenthStampPlacements.splice(l, 1)[0];
      return o ? (this.emit("sixteenthStampPlacementsChanged"), C("debug", `Removed sixteenth stamp ${o.sixteenthStampId} at ${o.startColumn}-${o.endColumn},${o.row}`, {
        placementId: n,
        sixteenthStampId: o.sixteenthStampId,
        startColumn: o.startColumn,
        endColumn: o.endColumn,
        row: o.row
      }), !0) : !1;
    },
    /**
     * Removes stamps that intersect with an eraser area
     * @param eraseStartCol Canvas-space column index
     * @param eraseEndCol Canvas-space column index
     */
    eraseSixteenthStampsInArea(n, l, o, d) {
      const p = [];
      for (const m of this.state.sixteenthStampPlacements) {
        const f = m.startColumn <= l && m.endColumn >= n, u = m.row >= o && m.row <= d;
        f && u && p.push(m.id);
      }
      let r = !1;
      return p.forEach((m) => {
        this.removeSixteenthStampPlacement(m) && (r = !0);
      }), r;
    },
    /**
     * Gets all stamp placements
     */
    getAllSixteenthStampPlacements() {
      return [...this.state.sixteenthStampPlacements];
    },
    /**
     * Gets stamp placement at specific position
     * @param column Canvas-space column index (0 = first musical beat)
     */
    getSixteenthStampAt(n, l) {
      return this.state.sixteenthStampPlacements.find(
        (o) => o.row === l && n >= o.startColumn && n < o.endColumn
      ) || null;
    },
    /**
     * Clears all stamp placements
     */
    clearAllSixteenthStamps() {
      const n = this.state.sixteenthStampPlacements.length > 0;
      this.state.sixteenthStampPlacements = [], n && (this.emit("sixteenthStampPlacementsChanged"), C("info", "Cleared all sixteenth stamp placements"));
    },
    /**
     * Gets stamp placements for playback scheduling
     */
    getSixteenthStampPlaybackData() {
      return this.state.sixteenthStampPlacements.map((n) => {
        const l = this.state.fullRowData[n.row];
        return {
          sixteenthStampId: n.sixteenthStampId,
          column: n.startColumn,
          startColumn: n.startColumn,
          endColumn: n.endColumn,
          row: n.row,
          pitch: (l == null ? void 0 : l.toneNote) || "",
          color: n.color,
          placement: n
          // Include full placement object with shapeOffsets
        };
      }).filter((n) => n.pitch);
    },
    /**
     * Updates the pitch offset for an individual shape within a stamp
     */
    updateSixteenthStampShapeOffset(n, l, o) {
      const d = this.state.sixteenthStampPlacements.find((p) => p.id === n);
      if (!d) {
        C("warn", "[SIXTEENTH STAMP SHAPE OFFSET] Placement not found", { placementId: n });
        return;
      }
      d.shapeOffsets || (d.shapeOffsets = {}), C("debug", "[SIXTEENTH STAMP SHAPE OFFSET] Updating shape offset", {
        placementId: n,
        shapeKey: l,
        oldOffset: d.shapeOffsets[l] || 0,
        newOffset: o,
        baseRow: d.row,
        targetRow: d.row + o
      }), d.shapeOffsets[l] = o, this.emit("sixteenthStampPlacementsChanged");
    },
    /**
     * Gets the effective row for a specific shape within a stamp
     */
    getSixteenthStampShapeRow(n, l) {
      var d;
      const o = ((d = n.shapeOffsets) == null ? void 0 : d[l]) || 0;
      return n.row + o;
    }
  };
}
function Nt() {
  return `triplet-stamp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function At(t = {}) {
  const {
    canvasToTime: e,
    timeToCanvas: s,
    getColumnMap: C,
    log: n = () => {
    }
  } = t;
  return {
    /**
     * Adds a triplet placement to the state
     * @param placement - The triplet placement object
     * @returns The placed triplet or null if invalid
     */
    addTripletStampPlacement(l) {
      this.state.tripletStampPlacements || (this.state.tripletStampPlacements = []);
      const o = l.startTimeIndex + l.span * 2, d = this.state.tripletStampPlacements.find((r) => r.row !== l.row ? !1 : !(r.startTimeIndex + r.span * 2 <= l.startTimeIndex || o <= r.startTimeIndex));
      if (d && this.removeTripletStampPlacement(d.id), this.state.sixteenthStampPlacements && e && C) {
        const r = C(this.state);
        this.state.sixteenthStampPlacements.filter((f) => {
          if (f.row !== l.row) return !1;
          const u = e(f.startColumn, r);
          return u === null ? !0 : !(u + 2 <= l.startTimeIndex || u >= o);
        }).forEach((f) => {
          this.removeSixteenthStampPlacement && this.removeSixteenthStampPlacement(f.id);
        });
      }
      const p = {
        id: Nt(),
        ...l,
        shapeOffsets: l.shapeOffsets || {}
      };
      return this.state.tripletStampPlacements.push(p), this.emit("tripletStampPlacementsChanged"), this.emit("rhythmStructureChanged"), n("debug", `Added triplet stamp ${l.tripletStampId} at time ${l.startTimeIndex}, row ${l.row}`, {
        tripletStampId: l.tripletStampId,
        startTimeIndex: l.startTimeIndex,
        span: l.span,
        row: l.row,
        placementId: p.id
      }), p;
    },
    /**
     * Removes a triplet placement by ID
     * @param placementId - The placement ID to remove
     * @returns True if a triplet was removed
     */
    removeTripletStampPlacement(l) {
      if (!this.state.tripletStampPlacements) return !1;
      const o = this.state.tripletStampPlacements.findIndex((p) => p.id === l);
      if (o === -1) return !1;
      const d = this.state.tripletStampPlacements.splice(o, 1)[0];
      return d ? (this.emit("tripletStampPlacementsChanged"), n("debug", `Removed triplet stamp ${d.tripletStampId} at time ${d.startTimeIndex}, row ${d.row}`, {
        placementId: l,
        tripletStampId: d.tripletStampId,
        startTimeIndex: d.startTimeIndex,
        span: d.span,
        row: d.row
      }), !0) : !1;
    },
    /**
     * Removes triplets that intersect with an eraser area
     * @param eraseStartCol - Start column of eraser (canvas-space microbeat column)
     * @param eraseEndCol - End column of eraser (canvas-space microbeat column)
     * @param eraseStartRow - Start row of eraser
     * @param eraseEndRow - End row of eraser
     * @returns True if any triplets were removed
     */
    eraseTripletStampsInArea(l, o, d, p) {
      if (!this.state.tripletStampPlacements || !s || !C) return !1;
      const r = C(this.state), m = [];
      for (const u of this.state.tripletStampPlacements)
        if (u.row >= d && u.row <= p) {
          const T = u.span * 2, i = s(u.startTimeIndex, r);
          i + T - 1 < l || i > o || m.push(u.id);
        }
      let f = !1;
      return m.forEach((u) => {
        this.removeTripletStampPlacement(u) && (f = !0);
      }), f;
    },
    /**
     * Gets all triplet placements
     * @returns Array of all placed triplets
     */
    getAllTripletStampPlacements() {
      return [...this.state.tripletStampPlacements || []];
    },
    /**
     * Gets triplet placement at specific position
     * @param timeIndex - Grid time index (microbeat)
     * @param row - Grid row index
     * @returns The triplet at this position or null
     */
    getTripletStampAt(l, o) {
      return this.state.tripletStampPlacements && this.state.tripletStampPlacements.find(
        (d) => d.row === o && l >= d.startTimeIndex && l < d.startTimeIndex + d.span * 2
      ) || null;
    },
    /**
     * Clears all triplet placements
     */
    clearAllTripletStamps() {
      if (!this.state.tripletStampPlacements) return;
      const l = this.state.tripletStampPlacements.length > 0;
      this.state.tripletStampPlacements = [], l && (this.emit("tripletStampPlacementsChanged"), n("info", "Cleared all triplet stamp placements"));
    },
    /**
     * Gets triplet placements for playback scheduling
     * @returns Array of playback data for triplets
     */
    getTripletStampPlaybackData() {
      return this.state.tripletStampPlacements ? this.state.tripletStampPlacements.map((l) => {
        const o = this.state.fullRowData[l.row];
        return {
          startTimeIndex: l.startTimeIndex,
          tripletStampId: l.tripletStampId,
          row: l.row,
          pitch: (o == null ? void 0 : o.toneNote) ?? "",
          color: l.color,
          span: l.span,
          placement: l
          // Include full placement object with shapeOffsets
        };
      }).filter((l) => l.pitch) : [];
    },
    /**
     * Updates the pitch offset for an individual shape within a triplet group
     * @param placementId - The triplet placement ID
     * @param shapeKey - The shape identifier (e.g., "triplet_0", "triplet_1", "triplet_2")
     * @param rowOffset - The pitch offset in rows (can be negative)
     */
    updateTripletStampShapeOffset(l, o, d) {
      var r;
      const p = (r = this.state.tripletStampPlacements) == null ? void 0 : r.find((m) => m.id === l);
      if (!p) {
        n("warn", "[TRIPLET STAMP SHAPE OFFSET] Placement not found", { placementId: l });
        return;
      }
      p.shapeOffsets || (p.shapeOffsets = {}), n("debug", "[TRIPLET STAMP SHAPE OFFSET] Updating shape offset", {
        placementId: l,
        shapeKey: o,
        oldOffset: p.shapeOffsets[o] || 0,
        newOffset: d,
        baseRow: p.row,
        targetRow: p.row + d
      }), p.shapeOffsets[o] = d, this.emit("tripletStampPlacementsChanged");
    },
    /**
     * Gets the effective row for a specific shape within a triplet group
     * @param placement - The triplet placement object
     * @param shapeKey - The shape identifier
     * @returns The effective row index
     */
    getTripletStampShapeRow(l, o) {
      var p;
      const d = ((p = l.shapeOffsets) == null ? void 0 : p[o]) || 0;
      return l.row + d;
    }
  };
}
const K = {
  COMPRESSION_2_3: 2 / 3,
  // 0.6666666667
  EXPANSION_3_2: 3 / 2
  // 1.5
};
function Mt(t, e, s) {
  const { getMacrobeatInfo: C, log: n = () => {
  } } = s;
  if (n("debug", "[MODULATION] measureIndexToColumnIndex called", {
    measureIndex: t,
    hasState: !!e
  }), !e || !e.macrobeatGroupings) {
    n("warn", "[MODULATION] No state or macrobeatGroupings provided for measure conversion");
    const p = t * 4;
    return n("debug", "[MODULATION] Using fallback calculation", p), p;
  }
  if (t === 0)
    return n("debug", "[MODULATION] Measure 0 at canvas-space column 0"), 0;
  if (!C)
    return n("warn", "[MODULATION] getMacrobeatInfo callback not provided"), t * 4;
  const l = t - 1;
  n("debug", `[MODULATION] Converting measureIndex ${t} to macrobeatIndex: ${l}`);
  const o = C(e, l);
  if (n("debug", "[MODULATION] getMacrobeatInfo result", o), o) {
    const p = o.endColumn + 1;
    return n("debug", `[MODULATION] Found measure info, canvas-space endColumn: ${o.endColumn}, first column after: ${p}`), p;
  }
  n("warn", `[MODULATION] Could not find measure info for index: ${t}`);
  const d = t * 4;
  return n("debug", "[MODULATION] Using improved fallback calculation", d), d;
}
function bt(t, e, s = null, C = null, n = null) {
  return {
    id: `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    measureIndex: t,
    ratio: e,
    active: !0,
    xPosition: s,
    // Store the actual boundary position if provided
    columnIndex: C,
    // Store column index for stable positioning
    macrobeatIndex: n
    // Store macrobeat index for stable positioning
  };
}
function yn(t) {
  return Math.abs(t - K.COMPRESSION_2_3) < 1e-3 ? "2:3" : Math.abs(t - K.EXPANSION_3_2) < 1e-3 ? "3:2" : `${t}`;
}
function Cn(t) {
  const e = "#ffc107";
  return Math.abs(t - K.COMPRESSION_2_3) < 1e-3 || Math.abs(t - K.EXPANSION_3_2) < 1e-3, e;
}
function We() {
  const t = [{
    startColumn: 0,
    endColumn: 1 / 0,
    scale: 1
  }];
  return {
    segments: t,
    getScaleForColumn(e) {
      return 1;
    },
    microbeatToCanvasX() {
      return 0;
    },
    canvasXToMicrobeat() {
      return 0;
    },
    getSegmentAtX() {
      return t[0] || null;
    },
    getGhostGridPositions() {
      return [];
    }
  };
}
function Tn(t, e, s = null, C = {}) {
  const { log: n = () => {
  } } = C;
  if (!t || t.length === 0)
    return We();
  const l = [...t.filter((f) => f.active)].sort((f, u) => f.measureIndex - u.measureIndex);
  if (l.length === 0)
    return We();
  n("debug", "[MODULATION] Creating coordinate mapping for markers", l);
  const o = l.map((f) => {
    const u = Mt(f.measureIndex, s, C);
    return n("debug", `[MODULATION] Marker at measure ${f.measureIndex} calculated column=${u}`), n("debug", "[MODULATION] Full marker data", f), n("debug", "[MODULATION] Final marker position", {
      id: f.id,
      measureIndex: f.measureIndex,
      columnIndex: u
    }), {
      ...f,
      columnIndex: u
    };
  }), d = [];
  let p = 1;
  const r = o[0];
  if (o.length === 0 || r && r.columnIndex > 0) {
    const f = r ? r.columnIndex : 1 / 0;
    d.push({
      startColumn: 0,
      endColumn: f,
      scale: 1
    });
  }
  for (let f = 0; f < o.length; f++) {
    const u = o[f], T = o[f + 1], i = T ? T.columnIndex : 1 / 0;
    p *= u.ratio, d.push({
      startColumn: u.columnIndex,
      // Canvas-space
      endColumn: i,
      // Canvas-space
      scale: p,
      marker: u
    });
  }
  return {
    segments: d,
    /**
     * Gets the modulation scale for a given column index
     * @param columnIndex - Column index in musical space
     * @returns Scale factor (1.0 = no modulation, 0.667 = compressed, 1.5 = expanded)
     */
    getScaleForColumn(f) {
      for (const u of d)
        if (f >= u.startColumn && f < u.endColumn)
          return u.scale;
      return 1;
    },
    /**
     * Converts microbeat index to canvas x position
     * NOTE: This method is deprecated - getColumnX in rendererUtils now handles modulation directly
     */
    microbeatToCanvasX(f) {
      return 0;
    },
    /**
     * Converts canvas x position to microbeat index
     * NOTE: This method is deprecated - coordinate conversion now handled by getColumnFromX
     */
    canvasXToMicrobeat(f) {
      return 0;
    },
    /**
     * Gets the segment containing a given canvas x position
     * NOTE: This method is deprecated - not used in new column-based approach
     */
    getSegmentAtX(f) {
      return d[0] || null;
    },
    /**
     * Gets all ghost grid positions for a segment
     * NOTE: This method is deprecated - ghost grid now handled differently
     */
    getGhostGridPositions(f, u) {
      return [];
    }
  };
}
function Nn(t, e) {
  if (t >= 0 && t < e.length) {
    const s = e[t];
    if (s !== void 0)
      return s;
  }
  return t * 0.333;
}
function An(t, e, s) {
  return 0;
}
function Mn(t, e, s) {
  return 0;
}
const $e = new Array(19).fill(2), vt = [
  "anacrusis",
  "anacrusis",
  "solid",
  "dashed",
  "dashed",
  "dashed",
  "solid",
  "dashed",
  "dashed",
  "dashed",
  "solid",
  "dashed",
  "dashed",
  "dashed",
  "solid",
  "dashed",
  "dashed",
  "dashed",
  "solid"
], qe = new Array(16).fill(2), wt = [
  "dashed",
  "dashed",
  "dashed",
  "solid",
  "dashed",
  "dashed",
  "dashed",
  "solid",
  "dashed",
  "dashed",
  "dashed",
  "solid",
  "dashed",
  "dashed",
  "dashed"
  // Last measure completed by isLastBeat logic
];
function He(t, e) {
  const s = e(t), C = /* @__PURE__ */ new Map();
  s.entries.forEach((n) => {
    n.type === "tonic" && n.tonicSignUuid && typeof n.canvasIndex == "number" && C.set(n.tonicSignUuid, n.canvasIndex);
  }), Object.entries(t.tonicSignGroups || {}).forEach(([n, l]) => {
    const o = C.get(n);
    o !== void 0 && l.forEach((d) => {
      d.columnIndex = o;
    });
  });
}
const It = {
  entries: [],
  visualToCanvas: /* @__PURE__ */ new Map(),
  visualToTime: /* @__PURE__ */ new Map(),
  canvasToVisual: /* @__PURE__ */ new Map(),
  canvasToTime: /* @__PURE__ */ new Map(),
  timeToCanvas: /* @__PURE__ */ new Map(),
  timeToVisual: /* @__PURE__ */ new Map(),
  macrobeatBoundaries: [],
  totalVisualColumns: 0,
  totalCanvasColumns: 0,
  totalTimeColumns: 0,
  totalWidthUnmodulated: 0
};
function xt(t = {}) {
  const {
    getColumnMap: e = () => It,
    visualToTimeIndex: s = () => null,
    timeIndexToVisualColumn: C = () => null,
    getTimeBoundaryAfterMacrobeat: n = () => 0,
    log: l = () => {
    }
  } = t;
  return {
    setAnacrusis(o) {
      var i, g, I;
      if (this.state.hasAnacrusis === o)
        return;
      const d = [...this.state.macrobeatGroupings], p = [...this.state.macrobeatBoundaryStyles], r = d.reduce((P, c) => P + c, 0);
      let m, f;
      if (o) {
        const P = this._anacrusisCache, c = $e.length - qe.length, b = $e.slice(0, c), y = vt.slice(0, c), S = (i = P == null ? void 0 : P.groupings) != null && i.length ? [...P.groupings] : [...b], a = (g = P == null ? void 0 : P.boundaryStyles) != null && g.length ? [...P.boundaryStyles] : [...y];
        if (m = [...S, ...d], f = [...a, ...p], !((I = P == null ? void 0 : P.boundaryStyles) != null && I.length))
          for (let h = 0; h < a.length; h++)
            f[h] = h < a.length - 1 ? "anacrusis" : "solid";
        this._anacrusisCache = null, l("debug", "rhythmActions", "Enabled anacrusis", {
          insertedCount: S.length,
          insertedColumns: S.reduce((h, A) => h + A, 0)
        }, "state");
      } else {
        const P = p.findIndex((S) => S === "solid");
        let c = 0;
        if (P !== -1)
          c = P + 1;
        else
          for (; c < p.length && p[c] === "anacrusis"; )
            c++;
        c = Math.min(c, d.length);
        const b = d.slice(0, c), y = p.slice(0, c);
        c > 0 ? this._anacrusisCache = {
          groupings: b,
          boundaryStyles: y
        } : this._anacrusisCache = null, m = d.slice(c), f = p.slice(c).map((S) => S === "anacrusis" ? "dashed" : S), m.length === 0 && (m = [...qe], f = [...wt]), l("debug", "rhythmActions", "Disabled anacrusis", {
          removalCount: c,
          removedColumns: b.reduce((S, a) => S + a, 0)
        }, "state");
      }
      const T = m.reduce((P, c) => P + c, 0) - r;
      if (this.state.hasAnacrusis = o, this.state.macrobeatGroupings = [...m], this.state.macrobeatBoundaryStyles = [...f], He(this.state, e), T !== 0) {
        const P = [];
        this.state.placedNotes.forEach((a) => {
          const h = s(this.state, a.startColumnIndex, d), A = s(this.state, a.endColumnIndex, d);
          if (h === null || A === null)
            return;
          const w = h + T, E = A + T;
          if (w < 0) {
            P.push(a);
            return;
          }
          const N = C(this.state, w, m), M = C(this.state, E, m);
          if (N === null || M === null) {
            P.push(a);
            return;
          }
          a.startColumnIndex = N, a.endColumnIndex = M;
        }), P.forEach((a) => {
          const h = this.state.placedNotes.indexOf(a);
          h > -1 && this.state.placedNotes.splice(h, 1);
        });
        const c = [];
        this.state.sixteenthStampPlacements.forEach((a) => {
          const h = s(this.state, a.startColumn, d), A = s(this.state, a.endColumn, d);
          if (h === null || A === null)
            return;
          const w = h + T, E = A + T;
          if (w < 0) {
            c.push(a);
            return;
          }
          const N = C(this.state, w, m), M = C(this.state, E, m);
          if (N === null || M === null) {
            c.push(a);
            return;
          }
          a.startColumn = N, a.endColumn = M;
        }), c.forEach((a) => {
          const h = this.state.sixteenthStampPlacements.indexOf(a);
          h > -1 && this.state.sixteenthStampPlacements.splice(h, 1);
        });
        const b = [];
        this.state.tripletStampPlacements && (this.state.tripletStampPlacements.forEach((a) => {
          const h = a.startTimeIndex + T;
          h < 0 ? b.push(a) : a.startTimeIndex = h;
        }), b.forEach((a) => {
          const h = this.state.tripletStampPlacements.indexOf(a);
          h > -1 && this.state.tripletStampPlacements.splice(h, 1);
        }));
        const y = [], S = o ? m.length - d.length : -(d.length - m.length);
        this.state.tempoModulationMarkers.forEach((a) => {
          const h = a.measureIndex + S;
          if (h < 0) {
            y.push(a);
            return;
          }
          a.measureIndex = h, a.columnIndex = null, a.xPosition = null, a.macrobeatIndex = null;
        }), y.forEach((a) => {
          const h = this.state.tempoModulationMarkers.indexOf(a);
          h > -1 && this.state.tempoModulationMarkers.splice(h, 1);
        });
      }
      this.emit("anacrusisChanged", o), this.emit("notesChanged"), this.emit("sixteenthStampPlacementsChanged"), this.emit("tripletStampPlacementsChanged"), this.emit("tempoModulationMarkersChanged"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    toggleMacrobeatGrouping(o) {
      if (o === void 0 || o < 0 || o >= this.state.macrobeatGroupings.length) {
        l("error", "rhythmActions", `Invalid index for toggleMacrobeatGrouping: ${o}`, null, "state");
        return;
      }
      const d = [...this.state.macrobeatGroupings], p = d[o], r = p === 2 ? 3 : 2, m = r - p, f = [...d];
      f[o] = r;
      const u = n(this.state, o, d), T = [];
      this.state.placedNotes.forEach((i) => {
        const g = s(this.state, i.startColumnIndex, d), I = s(this.state, i.endColumnIndex, d);
        if (!(g === null || I === null) && g >= u) {
          const P = g + m, c = I + m, b = C(this.state, P, f), y = C(this.state, c, f);
          b !== null && y !== null ? (i.startColumnIndex = b, i.endColumnIndex = y) : T.push(i);
        }
      }), T.length && T.forEach((i) => {
        const g = this.state.placedNotes.indexOf(i);
        g > -1 && this.state.placedNotes.splice(g, 1);
      }), this.state.macrobeatGroupings = f, He(this.state, e), this.emit("notesChanged"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    cycleMacrobeatBoundaryStyle(o) {
      if (o === void 0 || o < 0 || o >= this.state.macrobeatBoundaryStyles.length) {
        l("error", "rhythmActions", `Invalid index for cycleMacrobeatBoundaryStyle: ${o}`, null, "state");
        return;
      }
      const d = this._isBoundaryInAnacrusis(o);
      let p;
      d ? p = ["dashed", "solid", "anacrusis"] : p = ["dashed", "solid"];
      const r = this.state.macrobeatBoundaryStyles[o] ?? "dashed", m = p.indexOf(r), f = m === -1 ? 0 : (m + 1) % p.length, u = p[f] ?? "dashed";
      this.state.macrobeatBoundaryStyles[o] = u, this.emit("rhythmStructureChanged"), this.recordState();
    },
    _isBoundaryInAnacrusis(o) {
      if (!this.state.hasAnacrusis)
        return !1;
      for (let d = 0; d <= o; d++)
        if (this.state.macrobeatBoundaryStyles[d] === "solid")
          return d === o;
      return !0;
    },
    increaseMacrobeatCount() {
      this.state.macrobeatGroupings.push(2), this.state.macrobeatBoundaryStyles.push("dashed"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    decreaseMacrobeatCount() {
      if (this.state.macrobeatGroupings.length > 1) {
        const o = this.state.macrobeatGroupings.length - 1, d = n(
          this.state,
          o - 1,
          this.state.macrobeatGroupings
        ), p = [];
        this.state.placedNotes.forEach((f) => {
          const u = s(this.state, f.startColumnIndex, this.state.macrobeatGroupings);
          u !== null && u >= d && p.push(f);
        }), p.forEach((f) => {
          const u = this.state.placedNotes.indexOf(f);
          u > -1 && this.state.placedNotes.splice(u, 1);
        });
        const r = [];
        this.state.sixteenthStampPlacements.forEach((f) => {
          const u = s(this.state, f.startColumn, this.state.macrobeatGroupings);
          u !== null && u >= d && r.push(f);
        }), r.forEach((f) => {
          const u = this.state.sixteenthStampPlacements.indexOf(f);
          u > -1 && this.state.sixteenthStampPlacements.splice(u, 1);
        });
        const m = [];
        this.state.tripletStampPlacements && (this.state.tripletStampPlacements.forEach((f) => {
          f.startTimeIndex >= d && m.push(f);
        }), m.forEach((f) => {
          const u = this.state.tripletStampPlacements.indexOf(f);
          u > -1 && this.state.tripletStampPlacements.splice(u, 1);
        })), this.state.macrobeatGroupings.pop(), this.state.macrobeatBoundaryStyles.pop(), p.length > 0 && this.emit("notesChanged"), r.length > 0 && this.emit("sixteenthStampPlacementsChanged"), m.length > 0 && this.emit("tripletStampPlacementsChanged"), this.emit("rhythmStructureChanged"), this.recordState();
      }
    },
    updateTimeSignature(o, d) {
      if (!Array.isArray(d) || d.length === 0) {
        l("error", "rhythmActions", "Invalid groupings provided to updateTimeSignature", null, "state");
        return;
      }
      let p = 0, r = 0, m = 0;
      for (let b = 0; b < this.state.macrobeatGroupings.length; b++) {
        if (m === o) {
          p = b;
          break;
        }
        const y = b === this.state.macrobeatGroupings.length - 1;
        (this.state.macrobeatBoundaryStyles[b] === "solid" || y) && m++;
      }
      m = 0;
      for (let b = 0; b < this.state.macrobeatGroupings.length; b++)
        if (m === o) {
          const y = b === this.state.macrobeatGroupings.length - 1;
          if (this.state.macrobeatBoundaryStyles[b] === "solid" || y) {
            r = b;
            break;
          }
        } else if (m < o) {
          const y = b === this.state.macrobeatGroupings.length - 1;
          (this.state.macrobeatBoundaryStyles[b] === "solid" || y) && m++;
        }
      const f = r - p + 1, u = d.length, T = this.state.macrobeatGroupings.slice(p, r + 1).reduce((b, y) => b + y, 0), g = d.reduce((b, y) => b + y, 0) - T, I = n(this.state, r, this.state.macrobeatGroupings);
      if (g !== 0) {
        const b = (() => {
          const S = [...this.state.macrobeatGroupings];
          return S.splice(p, f, ...d), S;
        })(), y = [];
        this.state.placedNotes.forEach((S) => {
          const a = s(this.state, S.startColumnIndex, this.state.macrobeatGroupings), h = s(this.state, S.endColumnIndex, this.state.macrobeatGroupings);
          if (!(a === null || h === null) && a >= I) {
            const A = a + g, w = h + g, E = C(this.state, A, b), N = C(this.state, w, b);
            E !== null && N !== null ? (S.startColumnIndex = E, S.endColumnIndex = N) : y.push(S);
          }
        }), y.length && y.forEach((S) => {
          const a = this.state.placedNotes.indexOf(S);
          a > -1 && this.state.placedNotes.splice(a, 1);
        });
      }
      const P = [...d], c = new Array(Math.max(u - 1, 0)).fill("dashed");
      if (r < this.state.macrobeatBoundaryStyles.length) {
        const b = this.state.macrobeatBoundaryStyles[r] ?? "dashed";
        c.push(b);
      }
      this.state.macrobeatGroupings.splice(p, f, ...P), this.state.macrobeatBoundaryStyles.splice(p, f - 1, ...c), this.emit("notesChanged"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    addModulationMarker(o, d, p = null, r = null, m = null) {
      if (!Object.values(K).includes(d))
        return l("error", "rhythmActions", `Invalid modulation ratio: ${d}`, null, "state"), null;
      const f = this.state.tempoModulationMarkers.findIndex((T) => T.measureIndex === o || m !== null && T.macrobeatIndex === m || r !== null && T.columnIndex === r);
      if (f !== -1) {
        const T = this.state.tempoModulationMarkers[f];
        return l("info", "rhythmActions", `Replacing existing modulation marker ${T.id} at measure ${o} (old ratio: ${T.ratio}, new ratio: ${d})`, null, "state"), T.ratio = d, T.xPosition = p, r !== null && (T.columnIndex = r), m !== null && (T.macrobeatIndex = m), this.emit("tempoModulationMarkersChanged"), this.recordState(), T.id;
      }
      const u = bt(o, d, p, r, m);
      return this.state.tempoModulationMarkers.push(u), this.state.tempoModulationMarkers.sort((T, i) => T.measureIndex - i.measureIndex), this.emit("tempoModulationMarkersChanged"), this.recordState(), l("info", "rhythmActions", `Added modulation marker ${u.id} at measure ${o} with ratio=${d}, columnIndex=${r}`, null, "state"), u.id;
    },
    removeModulationMarker(o) {
      const d = this.state.tempoModulationMarkers.findIndex((p) => p.id === o);
      if (d === -1) {
        l("warn", "rhythmActions", `Modulation marker not found: ${o}`, null, "state");
        return;
      }
      this.state.tempoModulationMarkers.splice(d, 1), this.emit("tempoModulationMarkersChanged"), this.recordState(), l("info", "rhythmActions", `Removed modulation marker ${o}`, null, "state");
    },
    setModulationRatio(o, d) {
      if (!Object.values(K).includes(d)) {
        l("error", "rhythmActions", `Invalid modulation ratio: ${d}`, null, "state");
        return;
      }
      const p = this.state.tempoModulationMarkers.find((r) => r.id === o);
      if (!p) {
        l("warn", "rhythmActions", `Modulation marker not found: ${o}`, null, "state");
        return;
      }
      p.ratio = d, this.emit("tempoModulationMarkersChanged"), this.recordState(), l("info", "rhythmActions", `Updated modulation marker ${o} ratio to ${d}`, null, "state");
    },
    moveModulationMarker(o, d) {
      const p = this.state.tempoModulationMarkers.find((r) => r.id === o);
      if (!p) {
        l("warn", "rhythmActions", `Modulation marker not found: ${o}`, null, "state");
        return;
      }
      p.measureIndex = d, this.state.tempoModulationMarkers.sort((r, m) => r.measureIndex - m.measureIndex), this.emit("tempoModulationMarkersChanged"), this.recordState(), l("info", "rhythmActions", `Moved modulation marker ${o} to measure ${d}`, null, "state");
    },
    toggleModulationMarker(o) {
      const d = this.state.tempoModulationMarkers.find((p) => p.id === o);
      if (!d) {
        l("warn", "rhythmActions", `Modulation marker not found: ${o}`, null, "state");
        return;
      }
      d.active = !d.active, this.emit("tempoModulationMarkersChanged"), this.recordState(), l("info", "rhythmActions", `Toggled modulation marker ${o} active state to ${d.active}`, null, "state");
    },
    clearModulationMarkers() {
      const o = this.state.tempoModulationMarkers.length;
      this.state.tempoModulationMarkers = [], this.emit("tempoModulationMarkersChanged"), this.recordState(), l("info", "rhythmActions", `Cleared ${o} modulation markers`, null, "state");
    }
  };
}
function Ue(t) {
  const e = JSON.parse(JSON.stringify(t));
  for (const s in e) {
    const C = e[s];
    C.coeffs && typeof C.coeffs == "object" && !Array.isArray(C.coeffs) ? C.coeffs = new Float32Array(Object.values(C.coeffs)) : Array.isArray(C.coeffs) && (C.coeffs = new Float32Array(C.coeffs)), C.phases && typeof C.phases == "object" && !Array.isArray(C.phases) ? C.phases = new Float32Array(Object.values(C.phases)) : Array.isArray(C.phases) && (C.phases = new Float32Array(C.phases));
  }
  return e;
}
const Pt = /* @__PURE__ */ new Set(["dashed", "solid", "anacrusis"]);
function Et(t) {
  return Array.isArray(t) && t.length > 0 && t.every((e) => e === 2 || e === 3);
}
function Dt(t, e) {
  return Array.isArray(t) && t.length === Math.max(e - 1, 0) && t.every((s) => Pt.has(s));
}
function Ot(t, e) {
  if (t)
    try {
      const s = t.getItem(e);
      if (s === null)
        return;
      const C = JSON.parse(s), n = C.macrobeatGroupings;
      if (!Et(n)) {
        t.removeItem(e);
        return;
      }
      if (!Dt(C.macrobeatBoundaryStyles, n.length)) {
        t.removeItem(e);
        return;
      }
      if (delete C.timbres, C.pitchRange) {
        const l = j.length, o = Math.max(0, l - 1), d = Math.max(0, Math.min(o, C.pitchRange.topIndex ?? 0)), p = Math.max(d, Math.min(o, C.pitchRange.bottomIndex ?? o));
        C.pitchRange = { topIndex: d, bottomIndex: p };
      }
      if ("playheadMode" in C) {
        const l = C.playheadMode;
        l !== "cursor" && l !== "microbeat" && l !== "macrobeat" && delete C.playheadMode;
      }
      return C.fullRowData = [...j], C;
    } catch {
      return;
    }
}
function Ft(t, e, s) {
  if (e)
    try {
      const C = JSON.parse(JSON.stringify({
        placedNotes: t.placedNotes,
        placedChords: t.placedChords,
        tonicSignGroups: t.tonicSignGroups,
        sixteenthStampPlacements: t.sixteenthStampPlacements,
        tripletStampPlacements: t.tripletStampPlacements,
        // timbres: state.timbres, // Removed - always use default Sine preset
        macrobeatGroupings: t.macrobeatGroupings,
        macrobeatBoundaryStyles: t.macrobeatBoundaryStyles,
        hasAnacrusis: t.hasAnacrusis,
        baseMicrobeatPx: t.baseMicrobeatPx,
        tempoModulationMarkers: t.tempoModulationMarkers,
        tempo: t.tempo,
        activeChordIntervals: t.activeChordIntervals,
        selectedNote: t.selectedNote,
        annotations: t.annotations,
        pitchRange: t.pitchRange,
        degreeDisplayMode: t.degreeDisplayMode,
        showOctaveLabels: t.showOctaveLabels,
        longNoteStyle: t.longNoteStyle,
        playheadMode: t.playheadMode
      })), n = JSON.stringify(C);
      e.setItem(s, n);
    } catch {
    }
}
function Bt(t = {}) {
  const {
    storageKey: e = "studentNotationState",
    storage: s,
    initialState: C,
    onClearState: n,
    noteActionCallbacks: l = {},
    sixteenthStampActionCallbacks: o = {},
    tripletStampActionCallbacks: d = {},
    rhythmActionCallbacks: p = {}
  } = t, r = {}, m = Ot(s, e), f = !m, i = {
    state: {
      ...St(),
      ...m,
      ...C
    },
    isColdStart: f,
    on(g, I) {
      r[g] || (r[g] = []), r[g].push(I);
    },
    off(g, I) {
      if (r[g]) {
        const P = r[g].indexOf(I);
        P > -1 && r[g].splice(P, 1);
      }
    },
    emit(g, I) {
      r[g] && r[g].forEach((P) => {
        try {
          P(I);
        } catch (c) {
          console.error(`Error in listener for event "${g}"`, c);
        }
      });
    },
    dispose() {
      for (const g in r)
        delete r[g];
    },
    saveState() {
      Ft(i.state, s, e);
    },
    // ========== HISTORY ACTIONS ==========
    recordState() {
      i.state.history = i.state.history.slice(0, i.state.historyIndex + 1);
      const g = JSON.parse(JSON.stringify(i.state.timbres)), I = {
        notes: JSON.parse(JSON.stringify(i.state.placedNotes)),
        tonicSignGroups: JSON.parse(JSON.stringify(i.state.tonicSignGroups)),
        placedChords: JSON.parse(JSON.stringify(i.state.placedChords)),
        sixteenthStampPlacements: JSON.parse(JSON.stringify(i.state.sixteenthStampPlacements)),
        tripletStampPlacements: JSON.parse(JSON.stringify(i.state.tripletStampPlacements || [])),
        timbres: g,
        annotations: i.state.annotations ? JSON.parse(JSON.stringify(i.state.annotations)) : [],
        lassoSelection: JSON.parse(JSON.stringify(i.state.lassoSelection))
      };
      i.state.history.push(I), i.state.historyIndex++, i.emit("historyChanged"), i.saveState();
    },
    undo() {
      var g;
      if (i.state.historyIndex > 0) {
        i.state.historyIndex--;
        const I = i.state.history[i.state.historyIndex];
        if (!I) return;
        i.state.placedNotes = JSON.parse(JSON.stringify(I.notes)), i.state.tonicSignGroups = JSON.parse(JSON.stringify(I.tonicSignGroups)), i.state.sixteenthStampPlacements = JSON.parse(JSON.stringify(I.sixteenthStampPlacements || [])), i.state.tripletStampPlacements = JSON.parse(JSON.stringify(I.tripletStampPlacements || [])), i.state.timbres = Ue(I.timbres), i.state.annotations = I.annotations ? JSON.parse(JSON.stringify(I.annotations)) : [], i.emit("notesChanged"), i.emit("sixteenthStampPlacementsChanged"), i.emit("tripletStampPlacementsChanged"), i.emit("rhythmStructureChanged"), (g = i.state.selectedNote) != null && g.color && i.emit("timbreChanged", i.state.selectedNote.color), i.emit("annotationsChanged"), i.emit("historyChanged");
      }
    },
    redo() {
      var g;
      if (i.state.historyIndex < i.state.history.length - 1) {
        i.state.historyIndex++;
        const I = i.state.history[i.state.historyIndex];
        if (!I) return;
        i.state.placedNotes = JSON.parse(JSON.stringify(I.notes)), i.state.tonicSignGroups = JSON.parse(JSON.stringify(I.tonicSignGroups)), i.state.sixteenthStampPlacements = JSON.parse(JSON.stringify(I.sixteenthStampPlacements || [])), i.state.tripletStampPlacements = JSON.parse(JSON.stringify(I.tripletStampPlacements || [])), i.state.timbres = Ue(I.timbres), i.state.annotations = I.annotations ? JSON.parse(JSON.stringify(I.annotations)) : [], i.emit("notesChanged"), i.emit("sixteenthStampPlacementsChanged"), i.emit("tripletStampPlacementsChanged"), i.emit("rhythmStructureChanged"), (g = i.state.selectedNote) != null && g.color && i.emit("timbreChanged", i.state.selectedNote.color), i.emit("annotationsChanged"), i.emit("historyChanged");
      }
    },
    clearSavedState() {
      s && (s.removeItem(e), s.removeItem("effectDialValues")), n && n();
    },
    // ========== VIEW ACTIONS ==========
    setPlaybackState(g, I) {
      i.state.isPlaying = g, i.state.isPaused = I, i.emit("playbackStateChanged", { isPlaying: g, isPaused: I });
    },
    setLooping(g) {
      i.state.isLooping = g, i.emit("loopingChanged", g);
    },
    setTempo(g) {
      i.state.tempo = g, i.emit("tempoChanged", g);
    },
    setPlayheadMode(g) {
      i.state.playheadMode = g, i.emit("playheadModeChanged", g);
    },
    setSelectedTool(g, I) {
      const P = i.state.selectedTool;
      if (i.state.previousTool = P, i.state.selectedTool = g, I !== void 0) {
        const c = typeof I == "string" ? parseInt(I, 10) : I;
        isNaN(c) || (i.state.selectedToolTonicNumber = c);
      }
      i.emit("toolChanged", { newTool: g, oldTool: P });
    },
    setSelectedNote(g, I) {
      const P = { ...i.state.selectedNote };
      i.state.selectedNote = { shape: g, color: I }, i.emit("noteChanged", { newNote: i.state.selectedNote, oldNote: P });
    },
    setPitchRange(g) {
      i.state.pitchRange = { ...i.state.pitchRange, ...g }, i.emit("pitchRangeChanged", i.state.pitchRange);
    },
    setDegreeDisplayMode(g) {
      i.state.degreeDisplayMode = g, i.emit("degreeDisplayModeChanged", g);
    },
    setLongNoteStyle(g) {
      i.state.longNoteStyle = g, i.emit("longNoteStyleChanged", g);
    },
    toggleAccidentalMode(g) {
      i.state.accidentalMode[g] = !i.state.accidentalMode[g], i.emit("accidentalModeChanged", i.state.accidentalMode);
    },
    toggleFrequencyLabels() {
      i.state.showFrequencyLabels = !i.state.showFrequencyLabels, i.emit("frequencyLabelsChanged", i.state.showFrequencyLabels);
    },
    toggleOctaveLabels() {
      i.state.showOctaveLabels = !i.state.showOctaveLabels, i.emit("octaveLabelsChanged", i.state.showOctaveLabels);
    },
    toggleFocusColours() {
      i.state.focusColours = !i.state.focusColours, i.emit("focusColoursChanged", i.state.focusColours);
    },
    toggleWaveformExtendedView() {
      i.state.waveformExtendedView = !i.state.waveformExtendedView, i.emit("waveformExtendedViewChanged", i.state.waveformExtendedView);
    },
    setLayoutConfig(g) {
      g.cellWidth !== void 0 && (i.state.cellWidth = g.cellWidth), g.cellHeight !== void 0 && (i.state.cellHeight = g.cellHeight), g.columnWidths !== void 0 && (i.state.columnWidths = g.columnWidths), i.emit("layoutConfigChanged", g);
    },
    setDeviceProfile(g) {
      i.state.deviceProfile = { ...i.state.deviceProfile, ...g }, i.emit("deviceProfileChanged", i.state.deviceProfile);
    },
    setPrintPreviewActive(g) {
      i.state.isPrintPreviewActive = g, i.emit("printPreviewStateChanged", g);
    },
    setPrintOptions(g) {
      i.state.printOptions = { ...i.state.printOptions, ...g }, i.emit("printOptionsChanged", i.state.printOptions);
    },
    setAdsrTimeAxisScale(g) {
      i.state.adsrTimeAxisScale = g, i.emit("adsrTimeAxisScaleChanged", g);
    },
    setAdsrComponentWidth() {
    },
    shiftGridUp() {
    },
    shiftGridDown() {
    },
    setGridPosition() {
    },
    setKeySignature(g) {
      i.state.keySignature = g, i.emit("keySignatureChanged", g);
    },
    // ========== HARMONY ACTIONS ==========
    setActiveChordIntervals(g) {
      i.state.activeChordIntervals = g, i.emit("activeChordIntervalsChanged", g);
    },
    setIntervalsInversion(g) {
      i.state.isIntervalsInverted = g, i.emit("intervalsInversionChanged", g);
    },
    setChordPosition(g) {
      i.state.chordPositionState = g, i.emit("chordPositionChanged", g);
    },
    // ========== TIMBRE ACTIONS ==========
    setADSR(g, I) {
      i.state.timbres[g] && (i.state.timbres[g].adsr = { ...i.state.timbres[g].adsr, ...I }, i.emit("timbreChanged", g));
    },
    setHarmonicCoefficients(g, I) {
      i.state.timbres[g] && (i.state.timbres[g].coeffs = I, i.emit("timbreChanged", g));
    },
    setHarmonicPhases(g, I) {
      i.state.timbres[g] && (i.state.timbres[g].phases = I, i.emit("timbreChanged", g));
    },
    setFilterSettings(g, I) {
      i.state.timbres[g] && (i.state.timbres[g].filter = { ...i.state.timbres[g].filter, ...I }, i.emit("timbreChanged", g));
    },
    applyPreset(g, I) {
      i.state.timbres[g] && (Object.assign(i.state.timbres[g], I), i.emit("timbreChanged", g));
    },
    // ========== NOTE ACTIONS ==========
    // Extracted from note actions module
    ...yt(l),
    // ========== SIXTEENTH STAMP ACTIONS ==========
    // Extracted from sixteenth stamp actions module
    ...Tt(o),
    // ========== TRIPLET STAMP ACTIONS ==========
    // Extracted from triplet stamp actions module
    ...At(d),
    // ========== RHYTHM ACTIONS ==========
    // Extracted from rhythm actions module
    ...xt(p)
  };
  return s && (i.on("tempoChanged", () => i.saveState()), i.on("degreeDisplayModeChanged", () => i.saveState()), i.on("longNoteStyleChanged", () => i.saveState()), i.on("playheadModeChanged", () => i.saveState())), f && s && i.saveState(), i;
}
function Rt(t = {}) {
  const {
    getPlacedTonicSigns: e = () => [],
    sideColumnWidth: s = 0.25,
    beatColumnWidth: C = 1
  } = t;
  let n = null, l = null;
  function o(f) {
    const T = e(f).map((i) => `${i.columnIndex}:${i.preMacrobeatIndex}:${i.uuid || ""}`).sort().join("|");
    return {
      macrobeatGroupings: [...f.macrobeatGroupings],
      tonicSignsHash: T,
      macrobeatBoundaryStyles: [...f.macrobeatBoundaryStyles]
    };
  }
  function d(f) {
    return l ? l.tonicSignsHash === f.tonicSignsHash && JSON.stringify(l.macrobeatGroupings) === JSON.stringify(f.macrobeatGroupings) && JSON.stringify(l.macrobeatBoundaryStyles) === JSON.stringify(f.macrobeatBoundaryStyles) : !1;
  }
  function p(f) {
    const { macrobeatGroupings: u, macrobeatBoundaryStyles: T } = f, g = [...e(f)].sort((x, R) => x.preMacrobeatIndex - R.preMacrobeatIndex), I = [], P = [];
    let c = 0, b = 0, y = 0, S = 0, a = 0;
    const h = (x) => {
      var R;
      for (; a < g.length; ) {
        const L = g[a];
        if (!L || L.preMacrobeatIndex !== x) break;
        const F = L.uuid || "";
        for (let B = 0; B < 2; B++)
          I.push({
            visualIndex: c,
            canvasIndex: b,
            timeIndex: null,
            type: "tonic",
            widthMultiplier: C,
            xOffsetUnmodulated: S,
            macrobeatIndex: null,
            beatInMacrobeat: null,
            isMacrobeatStart: !1,
            isMacrobeatEnd: !1,
            isPlayable: !1,
            tonicSignUuid: B === 0 ? F : null
            // Only first column stores UUID
          }), c++, b++, S += C;
        const O = F;
        do
          a++;
        while (a < g.length && (((R = g[a]) == null ? void 0 : R.uuid) || "") === O);
      }
    };
    for (let x = 0; x < 2; x++)
      I.push({
        visualIndex: c,
        canvasIndex: null,
        timeIndex: null,
        type: "legend-left",
        widthMultiplier: s,
        xOffsetUnmodulated: S,
        macrobeatIndex: null,
        beatInMacrobeat: null,
        isMacrobeatStart: !1,
        isMacrobeatEnd: !1,
        isPlayable: !1,
        tonicSignUuid: null
      }), c++, S += s;
    h(-1), u.forEach((x, R) => {
      for (let F = 0; F < x; F++)
        I.push({
          visualIndex: c,
          canvasIndex: b,
          timeIndex: y,
          type: "beat",
          widthMultiplier: C,
          xOffsetUnmodulated: S,
          macrobeatIndex: R,
          beatInMacrobeat: F,
          isMacrobeatStart: F === 0,
          isMacrobeatEnd: F === x - 1,
          isPlayable: !0,
          tonicSignUuid: null
        }), c++, b++, y++, S += C;
      const L = T[R] || "dashed";
      P.push({
        macrobeatIndex: R,
        visualColumn: c - 1,
        canvasColumn: b - 1,
        timeColumn: y - 1,
        boundaryType: L,
        isMeasureStart: L === "solid"
      }), h(R);
    });
    for (let x = 0; x < 2; x++)
      I.push({
        visualIndex: c,
        canvasIndex: null,
        timeIndex: null,
        type: "legend-right",
        widthMultiplier: s,
        xOffsetUnmodulated: S,
        macrobeatIndex: null,
        beatInMacrobeat: null,
        isMacrobeatStart: !1,
        isMacrobeatEnd: !1,
        isPlayable: !1,
        tonicSignUuid: null
      }), c++, S += s;
    const A = /* @__PURE__ */ new Map(), w = /* @__PURE__ */ new Map(), E = /* @__PURE__ */ new Map(), N = /* @__PURE__ */ new Map(), M = /* @__PURE__ */ new Map(), D = /* @__PURE__ */ new Map();
    return I.forEach((x) => {
      A.set(x.visualIndex, x.canvasIndex), w.set(x.visualIndex, x.timeIndex), x.canvasIndex !== null && (E.set(x.canvasIndex, x.visualIndex), N.set(x.canvasIndex, x.timeIndex)), x.timeIndex !== null && (x.canvasIndex !== null && M.set(x.timeIndex, x.canvasIndex), D.set(x.timeIndex, x.visualIndex));
    }), {
      entries: I,
      visualToCanvas: A,
      visualToTime: w,
      canvasToVisual: E,
      canvasToTime: N,
      timeToCanvas: M,
      timeToVisual: D,
      macrobeatBoundaries: P,
      totalVisualColumns: c,
      totalCanvasColumns: b,
      totalTimeColumns: y,
      totalWidthUnmodulated: S
    };
  }
  function r(f) {
    const u = o(f);
    return n && d(u) || (n = p(f), l = u), n;
  }
  function m() {
    n = null, l = null;
  }
  return {
    getColumnMap: r,
    invalidate: m,
    buildColumnMap: p
  };
}
function bn(t, e) {
  return e.visualToCanvas.get(t) ?? null;
}
function Gt(t, e) {
  return e.visualToTime.get(t) ?? null;
}
function vn(t, e) {
  const s = e.canvasToVisual.get(t);
  return s !== void 0 ? s : t + 2;
}
function wn(t, e) {
  return e.canvasToTime.get(t) ?? null;
}
function In(t, e) {
  const s = e.timeToCanvas.get(t);
  return s !== void 0 ? s : t;
}
function Lt(t, e) {
  const s = e.timeToVisual.get(t);
  return s !== void 0 ? s : t + 2;
}
function _t(t, e) {
  if (t == null) return 0;
  let s = 0;
  for (let C = 0; C <= t && C < e.length; C++) {
    const n = e[C];
    typeof n == "number" && (s += n);
  }
  return s;
}
function xn(t, e) {
  return e.entries[t] || null;
}
function Ke(t, e) {
  const s = e.canvasToVisual.get(t);
  return s !== void 0 && e.entries[s] || null;
}
function Pn(t, e) {
  const s = Ke(t, e);
  return (s == null ? void 0 : s.isPlayable) ?? !1;
}
function En(t, e) {
  const s = Ke(t, e);
  return (s == null ? void 0 : s.type) ?? null;
}
function Dn(t, e) {
  return e.macrobeatBoundaries.find((s) => s.macrobeatIndex === t) || null;
}
function On(t) {
  const e = [];
  for (const s of t.entries)
    s.canvasIndex !== null && (e[s.canvasIndex] = s.widthMultiplier);
  return e;
}
function Fn(t) {
  let e = 0;
  for (const s of t.entries)
    s.canvasIndex !== null && (e += s.widthMultiplier);
  return e;
}
function Bn() {
  let t = !1, e = null, s = null, C = null, n = null, l = !1;
  const o = (r, m, f, u, T) => {
    if (!l && r === "debug") return;
    const i = `[engine:${m}]`;
    console[r](i, f, u || "");
  }, d = (r, m, f) => {
    o(r, "controller", m, f);
  };
  return {
    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    init(r) {
      if (t) {
        o("warn", "controller", "Engine already initialized");
        return;
      }
      l = r.debug || !1, o("info", "controller", "Initializing engine"), C = r.pitchGridContext || null, n = r.drumGridContext || null, s = Rt({
        getPlacedTonicSigns: (f) => {
          if (!e) return [];
          const u = [];
          for (const T of Object.values(f.tonicSignGroups || {}))
            u.push(...T);
          return u;
        }
      });
      let m = r.storage;
      !m && typeof window < "u" && window.localStorage && (m = window.localStorage), e = Bt({
        storageKey: r.storageKey || "studentNotationState",
        storage: m,
        initialState: r.initialState,
        noteActionCallbacks: {
          log: d
        },
        rhythmActionCallbacks: {
          getColumnMap: (f) => s.getColumnMap(f),
          visualToTimeIndex: (f, u, T) => Gt(u, s.getColumnMap(f)),
          timeIndexToVisualColumn: (f, u, T) => Lt(u, s.getColumnMap(f)),
          getTimeBoundaryAfterMacrobeat: (f, u, T) => _t(u, T),
          log: d
        },
        sixteenthStampActionCallbacks: {
          log: d
        },
        tripletStampActionCallbacks: {
          canvasToTime: (f, u) => u.canvasToTime.get(f) ?? null,
          timeToCanvas: (f, u) => u.timeToCanvas.get(f) ?? 0,
          getColumnMap: (f) => s.getColumnMap(f),
          log: d
        }
      }), e.on("rhythmStructureChanged", () => {
        s == null || s.invalidate();
      }), e.on("notesChanged", () => {
        this.renderPitchGrid();
      }), e.on("sixteenthStampPlacementsChanged", () => {
        this.renderDrumGrid();
      }), e.on("tripletStampPlacementsChanged", () => {
        this.renderDrumGrid();
      }), t = !0, o("info", "controller", "Engine initialized successfully"), (C || n) && this.render();
    },
    dispose() {
      t && (o("info", "controller", "Disposing engine"), e && (e.dispose(), e = null), s = null, C = null, n = null, t = !1);
    },
    isInitialized() {
      return t;
    },
    // ============================================================================
    // TOOL SELECTION
    // ============================================================================
    setTool(r) {
      e && e.setSelectedTool(r);
    },
    getTool() {
      return (e == null ? void 0 : e.state.selectedTool) || "note";
    },
    setNoteShape(r) {
      if (!e) return;
      const m = e.state.selectedNote.color;
      e.setSelectedNote(r, m);
    },
    setNoteColor(r) {
      if (!e) return;
      const m = e.state.selectedNote.shape;
      e.setSelectedNote(m, r);
    },
    // ============================================================================
    // NOTE MANIPULATION
    // ============================================================================
    insertNote(r, m, f) {
      if (!e) return null;
      const u = {
        row: r,
        startColumnIndex: m,
        endColumnIndex: f ?? m,
        shape: e.state.selectedNote.shape,
        color: e.state.selectedNote.color
      };
      return e.addNote(u);
    },
    deleteNote(r) {
      if (!e) return !1;
      const m = e.state.placedNotes.find((f) => f.uuid === r);
      return m ? (e.removeNote(m), !0) : !1;
    },
    deleteSelection() {
      if (!e) return;
      const r = e.state.lassoSelection;
      if (!r.isActive || r.selectedItems.length === 0) return;
      const m = r.selectedItems.filter((f) => f.type === "note").map((f) => e.state.placedNotes.find((u) => u.uuid === f.id)).filter((f) => f !== void 0);
      m.length > 0 && e.removeMultipleNotes(m), this.clearSelection();
    },
    moveNote(r, m, f) {
      if (!e) return;
      const u = e.state.placedNotes.find((T) => T.uuid === r);
      u && (e.updateNoteRow(u, m), e.updateNotePosition(u, f));
    },
    setNoteTail(r, m) {
      if (!e) return;
      const f = e.state.placedNotes.find((u) => u.uuid === r);
      f && e.updateNoteTail(f, m);
    },
    clearAllNotes() {
      e && e.clearAllNotes();
    },
    // ============================================================================
    // SELECTION
    // ============================================================================
    setSelection(r) {
      if (!e) return;
      const m = r.map((f) => {
        if (f.type === "note") {
          const u = e.state.placedNotes.find((T) => T.uuid === f.id);
          return u ? { type: "note", id: f.id, data: u } : null;
        } else if (f.type === "sixteenthStamp") {
          const u = e.state.sixteenthStampPlacements.find((T) => T.id === f.id);
          return u ? { type: "sixteenthStamp", id: f.id, data: u } : null;
        } else if (f.type === "tripletStamp") {
          const u = e.state.tripletStampPlacements.find((T) => T.id === f.id);
          return u ? { type: "tripletStamp", id: f.id, data: u } : null;
        }
        return null;
      }).filter((f) => f !== null);
      e.state.lassoSelection = {
        isActive: m.length > 0,
        selectedItems: m,
        convexHull: []
        // Would need to calculate from note positions
      }, e.emit("selectionChanged", e.state.lassoSelection);
    },
    clearSelection() {
      e && (e.state.lassoSelection = {
        isActive: !1,
        selectedItems: [],
        convexHull: []
      }, e.emit("selectionChanged", e.state.lassoSelection));
    },
    selectAll() {
      if (!e) return;
      const r = e.state.placedNotes.map((m) => ({
        type: "note",
        id: m.uuid,
        data: m
      }));
      e.state.lassoSelection = {
        isActive: r.length > 0,
        selectedItems: r,
        convexHull: []
      }, e.emit("selectionChanged", e.state.lassoSelection);
    },
    getSelection() {
      return (e == null ? void 0 : e.state.lassoSelection) || { isActive: !1, selectedItems: [], convexHull: [] };
    },
    hasSelection() {
      return (e == null ? void 0 : e.state.lassoSelection.isActive) && e.state.lassoSelection.selectedItems.length > 0 || !1;
    },
    // ============================================================================
    // PLAYBACK
    // ============================================================================
    play() {
      e && (e.setPlaybackState(!0, !1), o("info", "playback", "Play started"));
    },
    pause() {
      e && (e.setPlaybackState(!0, !0), o("info", "playback", "Paused"));
    },
    resume() {
      e && (e.setPlaybackState(!0, !1), o("info", "playback", "Resumed"));
    },
    stop() {
      e && (e.setPlaybackState(!1, !1), o("info", "playback", "Stopped"));
    },
    isPlaying() {
      return (e == null ? void 0 : e.state.isPlaying) || !1;
    },
    isPaused() {
      return (e == null ? void 0 : e.state.isPaused) || !1;
    },
    setTempo(r) {
      e && e.setTempo(r);
    },
    getTempo() {
      return (e == null ? void 0 : e.state.tempo) || 120;
    },
    setLooping(r) {
      e && e.setLooping(r);
    },
    isLooping() {
      return (e == null ? void 0 : e.state.isLooping) || !1;
    },
    setPlayheadMode(r) {
      e && e.setPlayheadMode(r);
    },
    // ============================================================================
    // HISTORY
    // ============================================================================
    undo() {
      e && e.undo();
    },
    redo() {
      e && e.redo();
    },
    canUndo() {
      return ((e == null ? void 0 : e.state.historyIndex) || 0) > 0;
    },
    canRedo() {
      return ((e == null ? void 0 : e.state.historyIndex) || 0) < ((e == null ? void 0 : e.state.history.length) || 0) - 1;
    },
    recordState() {
      e && e.recordState();
    },
    // ============================================================================
    // RHYTHM STRUCTURE
    // ============================================================================
    addMacrobeat() {
      e && e.increaseMacrobeatCount();
    },
    removeMacrobeat() {
      e && e.decreaseMacrobeatCount();
    },
    setMacrobeatGrouping(r, m) {
      if (!e) return;
      e.state.macrobeatGroupings[r] !== m && e.toggleMacrobeatGrouping(r);
    },
    toggleAnacrusis() {
      e && e.setAnacrusis(!e.state.hasAnacrusis);
    },
    addModulationMarker(r, m) {
      return e ? e.addModulationMarker(r, m) : null;
    },
    removeModulationMarker(r) {
      e && e.removeModulationMarker(r);
    },
    // ============================================================================
    // VIEW
    // ============================================================================
    setPitchRange(r, m) {
      e && e.setPitchRange({ topIndex: r, bottomIndex: m });
    },
    getPitchRange() {
      return (e == null ? void 0 : e.state.pitchRange) || { topIndex: 0, bottomIndex: 87 };
    },
    setDegreeDisplayMode(r) {
      e && e.setDegreeDisplayMode(r);
    },
    setLongNoteStyle(r) {
      e && e.setLongNoteStyle(r);
    },
    // ============================================================================
    // TIMBRE
    // ============================================================================
    setTimbreADSR(r, m) {
      e && e.setADSR(r, m);
    },
    setTimbreHarmonics(r, m) {
      e && e.setHarmonicCoefficients(r, new Float32Array(m));
    },
    setTimbreFilter(r, m) {
      e && e.setFilterSettings(r, m);
    },
    // ============================================================================
    // STATE ACCESS
    // ============================================================================
    getState() {
      if (!e)
        throw new Error("Engine not initialized");
      return e.state;
    },
    getNotes() {
      return (e == null ? void 0 : e.state.placedNotes) || [];
    },
    getNoteAt(r, m) {
      return e && e.state.placedNotes.find(
        (f) => f.row === r && f.startColumnIndex <= m && f.endColumnIndex >= m
      ) || null;
    },
    getSixteenthStamps() {
      return (e == null ? void 0 : e.state.sixteenthStampPlacements) || [];
    },
    getTripletStamps() {
      return (e == null ? void 0 : e.state.tripletStampPlacements) || [];
    },
    // ============================================================================
    // IMPORT/EXPORT
    // ============================================================================
    exportCSV() {
      if (!e) return "";
      const r = "uuid,row,startColumn,endColumn,color,shape", m = e.state.placedNotes.map(
        (f) => `${f.uuid},${f.row},${f.startColumnIndex},${f.endColumnIndex},${f.color},${f.shape}`
      );
      return [r, ...m].join(`
`);
    },
    importCSV(r) {
      if (!e) return;
      const m = r.split(`
`).filter((T) => T.trim());
      if (m.length === 0) return;
      const u = m.slice(1).map((T) => {
        const [i, g, I, P, c, b] = T.split(",");
        return {
          uuid: i,
          row: parseInt(g || "0", 10),
          startColumnIndex: parseInt(I || "0", 10),
          endColumnIndex: parseInt(P || "0", 10),
          color: c || "blue",
          shape: b || "circle"
        };
      });
      e.loadNotes(u);
    },
    exportState() {
      return e ? JSON.stringify(e.state, null, 2) : "{}";
    },
    importState(r) {
      if (e)
        try {
          const m = JSON.parse(r);
          Object.assign(e.state, m), e.emit("stateImported", m), this.render();
        } catch (m) {
          o("error", "import", "Failed to import state", m);
        }
    },
    // ============================================================================
    // EVENTS
    // ============================================================================
    on(r, m) {
      e && e.on(r, m);
    },
    off(r, m) {
      e && e.off(r, m);
    },
    // ============================================================================
    // RENDERING
    // ============================================================================
    render() {
      this.renderPitchGrid(), this.renderDrumGrid();
    },
    renderPitchGrid() {
      !C || !e || !s || o("debug", "controller", "renderPitchGrid called - canvas rendering not yet wired");
    },
    renderDrumGrid() {
      !n || !e || !s || o("debug", "controller", "renderDrumGrid called - canvas rendering not yet wired");
    }
  };
}
function Rn(t) {
  throw new Error("Not yet implemented - will be in @mlt/tutorial-runtime package");
}
let oe = null;
function Gn(t) {
  oe = t;
}
class Vt extends v.Synth {
  constructor(s) {
    super(s);
    // Audio effect nodes
    $(this, "presetGain");
    $(this, "vibratoLFO");
    $(this, "vibratoDepth");
    $(this, "vibratoGain");
    $(this, "tremoloLFO");
    $(this, "tremoloDepth");
    $(this, "tremoloGain");
    // Filter nodes
    $(this, "hpFilter");
    $(this, "lpFilterForBP");
    $(this, "lpFilterSolo");
    // Output nodes
    $(this, "hpOutput");
    $(this, "bpOutput");
    $(this, "lpOutput");
    // Crossfade nodes
    $(this, "hp_bp_fade");
    $(this, "main_fade");
    $(this, "wetDryFade");
    this.presetGain = new v.Gain(s.gain || 1), this.vibratoLFO = new v.LFO(0, 0), this.vibratoDepth = new v.Scale(-1, 1), this.vibratoGain = new v.Gain(0), this.vibratoLFO.connect(this.vibratoDepth), this.vibratoDepth.connect(this.vibratoGain), this.vibratoGain.connect(this.oscillator.frequency), this.tremoloLFO = new v.LFO(0, 0), this.tremoloDepth = new v.Scale(0, 1), this.tremoloGain = new v.Gain(1), this.tremoloLFO.connect(this.tremoloDepth), this.tremoloDepth.connect(this.tremoloGain.gain), this.hpFilter = new v.Filter({ type: "highpass" }), this.lpFilterForBP = new v.Filter({ type: "lowpass" }), this.lpFilterSolo = new v.Filter({ type: "lowpass" }), this.hpOutput = new v.Gain(), this.bpOutput = new v.Gain(), this.lpOutput = new v.Gain(), this.hp_bp_fade = new v.CrossFade(0), this.main_fade = new v.CrossFade(0), this.wetDryFade = new v.CrossFade(0), this.oscillator.connect(this.presetGain), this.presetGain.connect(this.wetDryFade.a), this.presetGain.connect(this.hpFilter), this.hpFilter.connect(this.hpOutput), this.hpFilter.connect(this.lpFilterForBP), this.lpFilterForBP.connect(this.bpOutput), this.presetGain.connect(this.lpFilterSolo), this.lpFilterSolo.connect(this.lpOutput), this.hpOutput.connect(this.hp_bp_fade.a), this.bpOutput.connect(this.hp_bp_fade.b), this.lpOutput.connect(this.main_fade.b), this.hp_bp_fade.connect(this.main_fade.a), this.main_fade.connect(this.wetDryFade.b), this.wetDryFade.connect(this.tremoloGain), this.tremoloGain.connect(this.envelope), s.filter && this._setFilter(s.filter), s.vibrato ? this._setVibrato(s.vibrato) : this._setVibrato({ speed: 0, span: 0 }), s.tremelo ? this._setTremolo(s.tremelo) : this._setTremolo({ speed: 0, span: 0 });
  }
  _setPresetGain(s) {
    this.presetGain && (this.presetGain.gain.value = s);
  }
  _setVibrato(s, C = v.now()) {
    var T, i;
    if (!this.vibratoLFO || !this.vibratoGain) return;
    const n = s.speed / 100 * 16, o = (((i = (T = v.getContext()) == null ? void 0 : T.rawContext) == null ? void 0 : i.state) ?? v.context.state) === "running";
    if (s.speed === 0 || s.span === 0) {
      o && this.vibratoLFO.state === "started" && this.vibratoLFO.stop(C), this.vibratoLFO.frequency.value = 0, this.vibratoGain.gain.value = 0;
      return;
    }
    o && this.vibratoLFO.state !== "started" && this.vibratoLFO.start(C), this.vibratoLFO.frequency.value = n;
    const p = s.span / 100 * 50, r = p / 1200, u = 440 * (Math.pow(2, r) - 1);
    this.vibratoGain.gain.value = u, oe == null || oe.debug("FilteredVoice", "Vibrato gain set", { hzDeviation: u, centsAmplitude: p }, "audio");
  }
  _setTremolo(s, C = v.now()) {
    var m, f;
    if (!this.tremoloLFO || !this.tremoloGain) return;
    const n = s.speed / 100 * 16, o = (((f = (m = v.getContext()) == null ? void 0 : m.rawContext) == null ? void 0 : f.state) ?? v.context.state) === "running";
    if (s.speed === 0 || s.span === 0) {
      o && this.tremoloLFO.state === "started" && this.tremoloLFO.stop(C), this.tremoloLFO.frequency.value = 0, this.tremoloGain.gain.cancelScheduledValues(C), this.tremoloGain.gain.value = 1;
      return;
    }
    o && this.tremoloLFO.state !== "started" && this.tremoloLFO.start(C), this.tremoloLFO.frequency.value = n;
    const d = s.span / 100, p = Math.max(0, 1 - d), r = 1;
    this.tremoloDepth.min = p, this.tremoloDepth.max = r;
  }
  _setFilter(s) {
    this.wetDryFade.fade.value = s.enabled ? 1 : 0;
    const C = v.Midi(s.cutoff + 35).toFrequency(), n = s.resonance / 100 * 12 + 0.1;
    this.hpFilter.set({ frequency: C, Q: n }), this.lpFilterForBP.set({ frequency: C, Q: n }), this.lpFilterSolo.set({ frequency: C, Q: n });
    const l = s.blend;
    l <= 1 ? (this.main_fade.fade.value = 0, this.hp_bp_fade.fade.value = l) : (this.main_fade.fade.value = l - 1, this.hp_bp_fade.fade.value = 1);
  }
}
const Qe = {
  polyphonyReference: 32,
  smoothingTauMs: 200,
  masterGainRampMs: 50,
  gainUpdateIntervalMs: 16
};
function Ze(t = Qe.polyphonyReference) {
  return 1 / Math.sqrt(t);
}
class Wt {
  constructor(e, s = {}) {
    $(this, "masterGain");
    $(this, "options");
    $(this, "perVoiceBaselineGain");
    $(this, "activeVoiceCount", 0);
    $(this, "smoothedVoiceCount");
    $(this, "gainUpdateLoopId", null);
    this.masterGain = e, this.options = { ...Qe, ...s }, this.perVoiceBaselineGain = Ze(this.options.polyphonyReference), this.smoothedVoiceCount = this.options.polyphonyReference;
  }
  start() {
    this.stop(), this.gainUpdateLoopId = setInterval(() => this.updateMasterGain(), this.options.gainUpdateIntervalMs);
  }
  stop() {
    this.gainUpdateLoopId !== null && (clearInterval(this.gainUpdateLoopId), this.gainUpdateLoopId = null);
  }
  noteOn(e = 1) {
    e <= 0 || (this.activeVoiceCount += e);
  }
  noteOff(e = 1) {
    e <= 0 || (this.activeVoiceCount = Math.max(0, this.activeVoiceCount - e));
  }
  clampActiveVoiceCountToAtMost(e) {
    Number.isFinite(e) && (this.activeVoiceCount = Math.max(0, Math.min(this.activeVoiceCount, Math.floor(e))));
  }
  resetActiveVoiceCount() {
    this.activeVoiceCount = 0;
  }
  getActiveVoiceCount() {
    return this.activeVoiceCount;
  }
  updateMasterGain() {
    const { polyphonyReference: e, smoothingTauMs: s, masterGainRampMs: C, gainUpdateIntervalMs: n } = this.options, l = v.now();
    if (this.activeVoiceCount === 0) {
      this.smoothedVoiceCount = 0.01 * e + (1 - 0.01) * this.smoothedVoiceCount;
      return;
    }
    const o = n / 1e3, d = 1 - Math.exp(-o / (s / 1e3)), p = Math.max(1, this.activeVoiceCount);
    this.smoothedVoiceCount = d * p + (1 - d) * this.smoothedVoiceCount;
    const r = Math.sqrt(e / this.smoothedVoiceCount), m = this.perVoiceBaselineGain * r;
    this.masterGain.gain.rampTo(m, C / 1e3, l);
  }
}
const $t = {
  clippingWarningThresholdDb: -3,
  clippingMonitorIntervalMs: 500,
  clippingWarningCooldownMs: 2e3
};
class qt {
  constructor(e, s = {}) {
    $(this, "meter");
    $(this, "options");
    $(this, "clippingMonitorId", null);
    $(this, "lastClippingWarningAt", 0);
    this.meter = e, this.options = { ...$t, ...s };
  }
  start() {
    this.stop(), this.lastClippingWarningAt = 0, this.clippingMonitorId = setInterval(() => {
      var n, l;
      const e = this.meter.getValue(), s = Array.isArray(e) ? e[0] : e;
      if (s === void 0 || s <= this.options.clippingWarningThresholdDb)
        return;
      const C = Date.now();
      C - this.lastClippingWarningAt < this.options.clippingWarningCooldownMs || (this.lastClippingWarningAt = C, (l = (n = this.options).onWarning) == null || l.call(n, s));
    }, this.options.clippingMonitorIntervalMs);
  }
  stop() {
    this.clippingMonitorId !== null && (clearInterval(this.clippingMonitorId), this.clippingMonitorId = null);
  }
}
function Ln(t) {
  const {
    timbres: e,
    masterVolume: s = 0,
    effectsManager: C,
    harmonicFilter: n,
    logger: l,
    audioInit: o,
    getDrumVolume: d
  } = t, p = {};
  let r = null, m = null, f = null, u = null, T = null, i = {}, g = null, I = null;
  const P = { ...e }, c = l ?? {
    debug: () => {
    },
    info: () => {
    },
    warn: () => {
    }
  };
  function b(a) {
    if (n)
      return n.getFilteredCoefficients(a);
    const h = P[a];
    return h != null && h.coeffs ? h.coeffs : new Float32Array([0, 1]);
  }
  function y(a) {
    const h = a.reduce((A, w) => A + Math.abs(w), 0);
    return h > 1 ? Array.from(a).map((A) => A / h) : Array.from(a);
  }
  const S = {
    init() {
      this.stopBackgroundMonitors(), r = new v.Gain(Ze()), g = new Wt(r), g.start(), m = new v.Volume(s), f = new v.Compressor({
        threshold: -12,
        ratio: 3,
        attack: 0.01,
        release: 0.1,
        knee: 6
      }), u = new v.Limiter(-3), T = new v.Meter(), r.connect(m), m.connect(f), f.connect(u), u.toDestination(), u.connect(T), T && (I = new qt(T, {
        onWarning: (a) => {
          c.warn("SynthEngine", "Limiter input approaching clipping threshold", { level: a }, "audio");
        }
      }), I.start());
      for (const a in P) {
        const h = P[a];
        if (!h) continue;
        h.vibrato || (h.vibrato = { speed: 0, span: 0 }), h.tremelo || (h.tremelo = { speed: 0, span: 0 });
        const A = b(a), w = y(A), E = h.gain || 1, N = new v.PolySynth({
          voice: Vt,
          options: {
            oscillator: { type: "custom", partials: w },
            envelope: h.adsr,
            filter: h.filter,
            vibrato: h.vibrato,
            tremelo: h.tremelo,
            gain: E
          }
        }).connect(r);
        C && r && C.applySynthEffects(N, a, r);
        const M = N.triggerAttack.bind(N);
        N.triggerAttack = function(...D) {
          const x = M(...D), L = (D[1] ?? v.now()) + 5e-3;
          return v.Draw.schedule(() => {
            const F = this._activeVoices;
            C ? F && F.size > 0 ? F.forEach((O) => {
              O.effectsApplied || (C.applyEffectsToVoice(O, a), O.effectsApplied = !0);
            }) : this._voices && Array.isArray(this._voices) && this._voices.forEach((O) => {
              O && !O.effectsApplied && (C.applyEffectsToVoice(O, a), O.effectsApplied = !0);
            }) : F && F.size > 0 ? F.forEach((O) => {
              O._setVibrato && O.vibratoApplied !== !0 && (O._setVibrato(this._currentVibrato), O.vibratoApplied = !0), O._setTremolo && O.tremoloApplied !== !0 && (O._setTremolo(this._currentTremolo), O.tremoloApplied = !0);
            }) : this._voices && Array.isArray(this._voices) && this._voices.forEach((O) => {
              O != null && O._setVibrato && O.vibratoApplied !== !0 && (O._setVibrato(this._currentVibrato), O.vibratoApplied = !0), O != null && O._setTremolo && O.tremoloApplied !== !0 && (O._setTremolo(this._currentTremolo), O.tremoloApplied = !0);
            });
          }, L), x;
        }, N._currentVibrato = h.vibrato, N._currentTremolo = h.tremelo, N._currentFilter = h.filter, p[a] = N, c.debug("SynthEngine", `Created filtered synth for color: ${a}`, null, "audio");
      }
      c.info("SynthEngine", "Initialized with multi-timbral support", null, "audio");
    },
    updateSynthForColor(a) {
      const h = P[a], A = p[a];
      if (!A || !h) return;
      h.vibrato || (h.vibrato = { speed: 0, span: 0 }), h.tremelo || (h.tremelo = { speed: 0, span: 0 }), c.debug("SynthEngine", `Updating timbre for color ${a}`, null, "audio");
      const w = b(a), E = y(w);
      A.set({
        oscillator: { partials: E },
        envelope: h.adsr
      }), C && r && C.applySynthEffects(A, a, r), A._currentVibrato = h.vibrato, A._currentTremolo = h.tremelo, A._currentFilter = h.filter;
      const N = A._activeVoices;
      N && N.size > 0 ? N.forEach((M) => {
        if (M._setFilter && M._setFilter(h.filter), M._setVibrato && (M._setVibrato(h.vibrato), M.vibratoApplied = !0), M._setTremolo && (M._setTremolo(h.tremelo), M.tremoloApplied = !0), M._setPresetGain) {
          const D = h.gain || 1;
          M._setPresetGain(D);
        }
      }) : A._voices && Array.isArray(A._voices) && A._voices.forEach((M) => {
        if (M != null && M._setVibrato && (M._setVibrato(h.vibrato), M.vibratoApplied = !0), M != null && M._setTremolo && (M._setTremolo(h.tremelo), M.tremoloApplied = !0), M != null && M._setFilter && M._setFilter(h.filter), M != null && M._setPresetGain) {
          const D = h.gain || 1;
          M._setPresetGain(D);
        }
      });
    },
    setBpm(a) {
      var h;
      try {
        (h = v == null ? void 0 : v.Transport) != null && h.bpm && (v.Transport.bpm.value = a, c.debug("SynthEngine", `Tone.Transport BPM updated to ${a}`, null, "audio"));
      } catch (A) {
        c.warn("SynthEngine", "Unable to update BPM on Tone.Transport", { tempo: a, error: A }, "audio");
      }
    },
    setVolume(a) {
      m && (m.volume.value = a);
    },
    async playNote(a, h, A = v.now()) {
      await (o || (() => v.start()))();
      const E = Object.keys(p);
      if (E.length === 0) return;
      const [N] = E;
      if (!N) return;
      const M = p[N];
      M && M.triggerAttackRelease(a, h, A);
    },
    /**
     * Trigger note attack. Used by Transport scheduling with explicit time parameter.
     * For interactive (user-initiated) triggers, use triggerAttackInteractive instead.
     */
    triggerAttack(a, h, A = v.now(), w = !1) {
      const E = p[h];
      if (E)
        if (g == null || g.noteOn(1), w && d) {
          const N = d(), M = E.volume.value, D = M + 20 * Math.log10(N);
          E.volume.value = D, E.triggerAttack(a, A), v.Draw.schedule(() => {
            E != null && E.volume && (E.volume.value = M);
          }, A + 0.1);
        } else
          E.triggerAttack(a, A);
    },
    /**
     * Trigger note attack for interactive (user-initiated) events.
     * Adds a small scheduling offset (20ms) to help the audio thread process
     * the event without pops or clicks.
     *
     * Use this for mouse clicks, keyboard presses, or other immediate UI triggers.
     */
    triggerAttackInteractive(a, h) {
      S.triggerAttack(a, h, v.now() + 0.02);
    },
    quickReleasePitches(a, h) {
      var E, N, M;
      const A = p[h];
      if (!A || !a || a.length === 0) return;
      let w;
      try {
        const D = typeof A.get == "function" ? A.get() : null, x = (E = D == null ? void 0 : D.envelope) == null ? void 0 : E.release;
        w = typeof x == "number" ? x : void 0, A.set({ envelope: { release: 0.01 } }), a.forEach((L) => {
          A.triggerRelease(L, v.now());
        });
        const R = ((N = A._activeVoices) == null ? void 0 : N.size) ?? ((M = A._voices) == null ? void 0 : M.length) ?? (g == null ? void 0 : g.getActiveVoiceCount()) ?? 0;
        g == null || g.clampActiveVoiceCountToAtMost(R);
      } catch (D) {
        c.warn("SynthEngine", "quickReleasePitches failed", { err: D, color: h, pitches: a }, "audio");
      } finally {
        if (w !== void 0)
          try {
            A.set({ envelope: { release: w } });
          } catch {
          }
      }
    },
    triggerRelease(a, h, A = v.now()) {
      var N, M;
      const w = p[h];
      if (!w) return;
      w.triggerRelease(a, A), g == null || g.noteOff(1);
      const E = ((N = w._activeVoices) == null ? void 0 : N.size) ?? ((M = w._voices) == null ? void 0 : M.length) ?? (g == null ? void 0 : g.getActiveVoiceCount()) ?? 0;
      g == null || g.clampActiveVoiceCountToAtMost(E);
    },
    releaseAll() {
      var a;
      for (const h in p)
        (a = p[h]) == null || a.releaseAll();
      g == null || g.resetActiveVoiceCount();
    },
    // === Waveform Visualization ===
    createWaveformAnalyzer(a) {
      const h = p[a];
      return h ? (i[a] || (i[a] = new v.Analyser("waveform", 1024), h.connect(i[a]), c.debug("SynthEngine", `Created waveform analyzer for color: ${a}`, null, "waveform")), i[a]) : (c.warn("SynthEngine", `No synth found for color: ${a}`, null, "audio"), null);
    },
    getWaveformAnalyzer(a) {
      return i[a] || null;
    },
    getAllWaveformAnalyzers() {
      const a = /* @__PURE__ */ new Map();
      for (const h in i)
        i[h] && a.set(h, i[h]);
      return a;
    },
    removeWaveformAnalyzer(a) {
      i[a] && (i[a].dispose(), delete i[a], c.debug("SynthEngine", `Removed waveform analyzer for color: ${a}`, null, "waveform"));
    },
    disposeAllWaveformAnalyzers() {
      for (const a in i)
        i[a] && i[a].dispose();
      i = {}, c.debug("SynthEngine", "Disposed all waveform analyzers", null, "waveform");
    },
    // === Node Access ===
    getSynth(a) {
      return p[a] || null;
    },
    getAllSynths() {
      return { ...p };
    },
    getMainVolumeNode() {
      return m || null;
    },
    getMasterGainNode() {
      return r || null;
    },
    // === Cleanup ===
    stopBackgroundMonitors() {
      I == null || I.stop(), g == null || g.stop();
    },
    dispose() {
      var a;
      this.stopBackgroundMonitors(), this.disposeAllWaveformAnalyzers();
      for (const h in p)
        (a = p[h]) == null || a.dispose();
      r == null || r.dispose(), m == null || m.dispose(), f == null || f.dispose(), u == null || u.dispose(), T == null || T.dispose(), c.debug("SynthEngine", "Disposed SynthEngine", null, "audio");
    }
  };
  return S;
}
const Xe = 1e-4;
function Ht(t) {
  const {
    getMacrobeatInfo: e,
    getPlacedTonicSigns: s,
    getTonicSpanColumnIndices: C,
    updatePlayheadModel: n,
    logger: l
  } = t;
  let o = [], d = 0, p = 0, r = 0;
  const m = l ?? {
    debug: () => {
    }
  };
  function f(i) {
    return 60 / (i * 2);
  }
  function u(i, g, I) {
    let P = 0;
    m.debug("TimeMapCalculator", "[TIMEMAP] Building timeMap", {
      columnCount: g.length,
      tonicSignCount: I.length,
      microbeatDuration: i
    });
    const c = g.length, b = C(I);
    for (let y = 0; y < c; y++) {
      o[y] = P;
      const S = b.has(y);
      if (S ? m.debug("TimeMapCalculator", `[TIMEMAP] Column ${y} is tonic, not advancing time`) : P += (g[y] || 0) * i, y < 5) {
        const a = o[y];
        a !== void 0 && m.debug("TimeMapCalculator", `[TIMEMAP] timeMap[${y}] = ${a.toFixed(3)}s (isTonic: ${S})`);
      }
    }
    c > 0 && (o[c] = P), m.debug("TimeMapCalculator", `[TIMEMAP] Complete. Total columns: ${c}, Final time: ${P.toFixed(3)}s`);
  }
  function T(i) {
    var b;
    const g = o.length > 0 ? o[o.length - 1] ?? 0 : 0;
    if (!Number.isFinite(g) || g === 0) {
      d = 0;
      return;
    }
    const I = ((b = i.tempoModulationMarkers) == null ? void 0 : b.filter((y) => y.active)) || [];
    if (I.length === 0) {
      d = g;
      return;
    }
    const P = [...I].sort((y, S) => y.measureIndex - S.measureIndex);
    let c = g;
    for (const y of P) {
      const S = e(y.measureIndex);
      if (S) {
        const a = S.endColumn - 1, h = o[a] ?? g, A = g - h, w = A * y.ratio;
        c = c - A + w;
      }
    }
    d = c;
  }
  return {
    getMicrobeatDuration: f,
    calculate(i) {
      var b, y;
      m.debug("TimeMapCalculator", "calculate", { tempo: `${i.tempo} BPM` }), o = [];
      const g = f(i.tempo), { columnWidths: I } = i, P = s();
      u(g, I, P), (y = m.timing) == null || y.call(m, "TimeMapCalculator", "calculate", { totalDuration: `${(b = o[o.length - 1]) == null ? void 0 : b.toFixed(2)}s` }), T(i);
      const c = d;
      n == null || n({
        timeMap: o,
        musicalEndTime: c,
        columnWidths: i.columnWidths,
        cellWidth: i.cellWidth
      });
    },
    getTimeMap() {
      return o;
    },
    getMusicalEndTime() {
      return d;
    },
    findNonAnacrusisStart(i) {
      if (!i.hasAnacrusis)
        return m.debug("TimeMapCalculator", "[ANACRUSIS] No anacrusis, starting from time 0"), 0;
      for (let g = 0; g < i.macrobeatBoundaryStyles.length; g++)
        if (i.macrobeatBoundaryStyles[g] === "solid") {
          const I = e(g + 1);
          if (I) {
            const P = o[I.startColumn] || 0;
            return m.debug("TimeMapCalculator", `[ANACRUSIS] Found solid boundary at macrobeat ${g}, non-anacrusis starts at column ${I.startColumn}, time ${P.toFixed(3)}s`), P;
          }
        }
      return m.debug("TimeMapCalculator", "[ANACRUSIS] No solid boundary found, starting from time 0"), 0;
    },
    applyModulationToTime(i, g, I) {
      var y;
      const P = ((y = I.tempoModulationMarkers) == null ? void 0 : y.filter((S) => S.active)) || [];
      if (P.length === 0)
        return i;
      const c = [...P].sort((S, a) => S.measureIndex - a.measureIndex);
      let b = i;
      g < 5 && m.debug("TimeMapCalculator", `[MODULATION] Column ${g}: baseTime ${i.toFixed(3)}s, ${c.length} active markers`);
      for (const S of c) {
        const a = e(S.measureIndex);
        if (a) {
          const h = a.endColumn;
          if (g > h) {
            const A = o[h] !== void 0 ? o[h] : 0, w = i - A, E = w * S.ratio;
            b = b - w + E, g < 5 && m.debug("TimeMapCalculator", `[MODULATION] Column ${g}: Applied marker at measure ${S.measureIndex} (col ${h}), ratio ${S.ratio}, adjustedTime ${b.toFixed(3)}s`);
          }
        }
      }
      return b;
    },
    setLoopBounds(i, g, I) {
      const P = f(I), c = Math.max(P, 1e-3), b = Number.isFinite(i) ? i : 0;
      let y = Number.isFinite(g) ? g : b + c;
      y <= b && (y = b + c), p = b, r = y, v != null && v.Transport && (v.Transport.loopStart = b, v.Transport.loopEnd = y);
    },
    getConfiguredLoopBounds() {
      return { loopStart: p, loopEnd: r };
    },
    setConfiguredLoopBounds(i, g) {
      p = i, r = g;
    },
    clearConfiguredLoopBounds() {
      p = 0, r = 0;
    },
    reapplyConfiguredLoopBounds(i) {
      if (r > p) {
        const g = v.Time(v.Transport.loopStart).toSeconds(), I = v.Time(v.Transport.loopEnd).toSeconds(), P = Math.abs(g - p), c = Math.abs(I - r);
        (P > Xe || c > Xe) && (v.Transport.loopStart = p, v.Transport.loopEnd = r), v.Transport.loop !== i && (v.Transport.loop = i);
      }
    },
    updateLoopBoundsFromTimeline(i) {
      const g = this.findNonAnacrusisStart(i), I = d;
      this.setLoopBounds(g, I, i.tempo);
    }
  };
}
const Ut = {
  H: "https://tonejs.github.io/audio/drum-samples/CR78/hihat.mp3",
  M: "https://tonejs.github.io/audio/drum-samples/CR78/snare.mp3",
  L: "https://tonejs.github.io/audio/drum-samples/CR78/kick.mp3"
}, Xt = 1e-4;
function Jt(t = {}) {
  var p;
  const {
    samples: e = Ut,
    synthEngine: s,
    initialVolume: C = 0
  } = t;
  let n = null, l = null;
  const o = /* @__PURE__ */ new Map();
  function d(r, m) {
    let f = Number.isFinite(m) ? m : v.now();
    const u = o.get(r) ?? -1 / 0;
    return f > u || (f = u + Xt), o.set(r, f), f;
  }
  if (l = new v.Volume(C), n = new v.Players(e).connect(l), s) {
    const r = (p = s.getMainVolumeNode) == null ? void 0 : p.call(s);
    r ? l.connect(r) : l.toDestination();
  } else
    l.toDestination();
  return {
    getPlayers() {
      return n;
    },
    getVolumeNode() {
      return l;
    },
    trigger(r, m) {
      var u;
      if (!n) return;
      const f = d(r, m);
      (u = n.player(r)) == null || u.start(f);
    },
    reset() {
      o.clear();
    },
    dispose() {
      n == null || n.dispose(), l == null || l.dispose(), n = null, l = null, o.clear();
    },
    isLoaded() {
      return (n == null ? void 0 : n.loaded) ?? !1;
    },
    async waitForLoad() {
      n && await n.loaded;
    }
  };
}
const Je = "♭", ze = "♯";
function zt(t, e) {
  if (t.length < 2 || e < t[0] || e >= t[t.length - 1]) return -1;
  let s = 0, C = t.length - 2;
  for (; s <= C; ) {
    const n = s + C >>> 1, l = t[n], o = t[n + 1];
    if (e >= l && e < o)
      return n;
    e < l ? C = n - 1 : s = n + 1;
  }
  return -1;
}
function _n(t) {
  const {
    synthEngine: e,
    stateCallbacks: s,
    eventCallbacks: C,
    visualCallbacks: n,
    logger: l,
    audioInit: o,
    playbackMode: d = "standard",
    highwayService: p
  } = t, r = l ?? {
    debug: () => {
    },
    info: () => {
    },
    warn: () => {
    }
  };
  let m = null, f = !1, u = null, T = null, i = 1;
  const g = [];
  function I(N, M) {
    const D = M.fullRowData[N];
    return D ? D.toneNote.replace(Je, "b").replace(ze, "#") : "C4";
  }
  function P(N, M) {
    const D = N.globalRow ?? N.row, x = M.fullRowData[D];
    return x ? x.toneNote.replace(Je, "b").replace(ze, "#") : "C4";
  }
  function c() {
    var F, O, B;
    if (!u) return;
    const N = s.getState();
    r.debug("TransportService", "scheduleNotes", "Clearing previous transport events and rescheduling all notes"), v.Transport.cancel(), T == null || T.reset(), u.calculate(N), (F = n == null ? void 0 : n.clearAdsrVisuals) == null || F.call(n);
    const M = u.getTimeMap(), { loopEnd: D } = u.getConfiguredLoopBounds(), x = u.findNonAnacrusisStart(N);
    r.debug("TransportService", `[ANACRUSIS] hasAnacrusis: ${N.hasAnacrusis}, anacrusisOffset: ${x.toFixed(3)}s`), N.placedNotes.forEach((G, _) => {
      const V = G.startColumnIndex, W = G.endColumnIndex, U = M[V];
      if (U === void 0) {
        r.warn("TransportService", `[NOTE SCHEDULE] Note ${_}: timeMap[${V}] undefined, skipping`);
        return;
      }
      const q = u.applyModulationToTime(U, V, N), H = M[W + 1];
      if (H === void 0) {
        r.warn("TransportService", `Skipping note with invalid endColumnIndex: ${G.endColumnIndex + 1}`);
        return;
      }
      const z = u.applyModulationToTime(H, W + 1, N) - q;
      G.isDrum ? b(G, q) : y(G, q, z, D, N);
    });
    const R = ((O = s.getStampPlaybackData) == null ? void 0 : O.call(s)) ?? [];
    R.forEach((G) => {
      S(G, M, N);
    });
    const L = ((B = s.getTripletPlaybackData) == null ? void 0 : B.call(s)) ?? [];
    L.forEach((G) => {
      a(G, M, N);
    }), r.debug("TransportService", "scheduleNotes", `Finished scheduling ${N.placedNotes.length} notes, ${R.length} stamps, and ${L.length} triplets`);
  }
  function b(N, M) {
    const D = s.getState();
    v.Transport.schedule((x) => {
      if (D.isPaused) return;
      const R = N.drumTrack;
      if (R == null) return;
      const L = String(R);
      T == null || T.trigger(L, x), v.Draw.schedule(() => {
        var F;
        (F = n == null ? void 0 : n.triggerDrumNotePop) == null || F.call(n, N.startColumnIndex, R);
      }, x);
    }, M);
  }
  function y(N, M, D, x, R) {
    var q;
    const L = P(N, R), F = N.color, O = N.globalRow ?? N.row, B = ((q = R.fullRowData[O]) == null ? void 0 : q.hex) || "#888888", G = N.uuid, _ = R.timbres[F];
    if (!_) {
      r.warn("TransportService", `Timbre not found for color ${F}. Skipping note ${G}`);
      return;
    }
    let V = M + D;
    const U = x - 1e-3;
    V >= x && (V = Math.max(M + 1e-3, U)), v.Transport.schedule((H) => {
      s.getState().isPaused || (e.triggerAttack(L, F, H), v.Draw.schedule(() => {
        var X;
        (X = n == null ? void 0 : n.triggerAdsrVisual) == null || X.call(n, G, "attack", B, _.adsr), C.emit("noteAttack", { noteId: G, color: F });
      }, H));
    }, M), v.Transport.schedule((H) => {
      e.triggerRelease(L, F, H), v.Draw.schedule(() => {
        var X;
        (X = n == null ? void 0 : n.triggerAdsrVisual) == null || X.call(n, G, "release", B, _.adsr), C.emit("noteRelease", { noteId: G, color: F });
      }, H);
    }, V);
  }
  function S(N, M, D) {
    var F;
    const x = N.column, R = M[x];
    if (R === void 0) return;
    (((F = s.getStampScheduleEvents) == null ? void 0 : F.call(s, N.sixteenthStampId, N.placement)) ?? []).forEach((O) => {
      h(O, R, N.row, N.color, D);
    });
  }
  function a(N, M, D) {
    var F, O;
    const x = ((F = s.timeToCanvas) == null ? void 0 : F.call(s, N.startTimeIndex, D)) ?? N.startTimeIndex, R = M[x];
    if (R === void 0) return;
    (((O = s.getTripletScheduleEvents) == null ? void 0 : O.call(s, N.tripletStampId, N.placement)) ?? []).forEach((B) => {
      h(B, R, N.row, N.color, D);
    });
  }
  function h(N, M, D, x, R) {
    const L = v.Time(N.offset).toSeconds(), F = v.Time(N.duration).toSeconds(), O = M + L, B = O + F, G = D + N.rowOffset, _ = I(G, R);
    v.Transport.schedule((V) => {
      s.getState().isPaused || e.triggerAttack(_, x, V);
    }, O), v.Transport.schedule((V) => {
      s.getState().isPaused || e.triggerRelease(_, x, V);
    }, B);
  }
  function A() {
    var O, B;
    const M = s.getState().tempo, D = 1e-4, x = 0.5, R = (G) => (G == null ? void 0 : G.xPosition) ?? 477.5, L = typeof ((B = (O = v.Transport) == null ? void 0 : O.bpm) == null ? void 0 : B.value) == "number" ? v.Transport.bpm.value : M;
    i = M !== 0 ? L / M : 1, f = !0;
    function F() {
      var Te, Ne, Ae, Me, be, ve, we, Ie, xe, Pe, Ee, De, Oe, Fe, Be;
      if (!f || !u)
        return;
      if (v.Transport.state === "stopped") {
        m = requestAnimationFrame(F);
        return;
      }
      const G = s.getState(), _ = v.Time(v.Transport.loopEnd).toSeconds(), V = G.isLooping, W = u.getMusicalEndTime(), U = V && _ > 0 ? _ : W, q = v.Transport.seconds, H = q * 1e3, X = q >= U - 1e-3;
      if (!V && X) {
        r.info("TransportService", "Playback reached end. Stopping playhead."), E.stop();
        return;
      }
      if (G.isPaused) {
        m = requestAnimationFrame(F);
        return;
      }
      const z = u.getTimeMap();
      (Te = n == null ? void 0 : n.clearPlayheadCanvas) == null || Te.call(n), (Ne = n == null ? void 0 : n.clearDrumPlayheadCanvas) == null || Ne.call(n);
      let ie = q;
      if (V) {
        const Y = v.Time(v.Transport.loopStart).toSeconds(), J = v.Time(v.Transport.loopEnd).toSeconds() - Y;
        J > 0 && (ie = (q - Y) % J + Y);
      }
      const tt = ((Ae = s.getCanvasWidth) == null ? void 0 : Ae.call(s)) ?? 1e3, nt = ((Me = s.getPlacedTonicSigns) == null ? void 0 : Me.call(s)) ?? [], pe = ((be = s.getTonicSpanColumnIndices) == null ? void 0 : be.call(s, nt)) ?? /* @__PURE__ */ new Set();
      let se = 0, ge = 0, Se = 0, ae = -1;
      const Q = zt(z, ie);
      if (Q >= 0) {
        const Y = z[Q], Re = z[Q + 1];
        let J = Q;
        for (; pe.has(J) && J < z.length - 1; )
          J++;
        const ce = ((ve = s.getColumnStartX) == null ? void 0 : ve.call(s, J)) ?? 0, Ge = ((we = s.getColumnWidth) == null ? void 0 : we.call(s, J)) ?? 10;
        if (ge = ce, Se = Ge, ae = J, pe.has(Q))
          se = ce;
        else {
          const Le = Re - Y, it = ie - Y, st = Le > 0 ? it / Le : 0;
          se = ce + st * Ge;
        }
      }
      const ee = Math.min(se, tt);
      w(G, ee, M, R, D, x);
      const ye = ((Ie = n == null ? void 0 : n.getPlayheadCanvasHeight) == null ? void 0 : Ie.call(n)) ?? 500, Ce = ((xe = n == null ? void 0 : n.getDrumCanvasHeight) == null ? void 0 : xe.call(n)) ?? 100, k = G.playheadMode === "macrobeat" && ae >= 0 ? (Pe = s.getMacrobeatHighlightRect) == null ? void 0 : Pe.call(s, ae) : null, re = (k == null ? void 0 : k.x) ?? ge, le = (k == null ? void 0 : k.width) ?? Se;
      ee >= 0 && (G.playheadMode === "macrobeat" || G.playheadMode === "microbeat" ? ((Ee = n == null ? void 0 : n.drawPlayheadHighlight) == null || Ee.call(n, re, le, ye, H), (De = n == null ? void 0 : n.drawDrumPlayheadHighlight) == null || De.call(n, re, le, Ce, H)) : ((Oe = n == null ? void 0 : n.drawPlayheadLine) == null || Oe.call(n, ee, ye), (Fe = n == null ? void 0 : n.drawDrumPlayheadLine) == null || Fe.call(n, ee, Ce)));
      const ot = G.playheadMode === "macrobeat" || G.playheadMode === "microbeat";
      (Be = n == null ? void 0 : n.updateBeatLineHighlight) == null || Be.call(n, re, le, ot), m = requestAnimationFrame(F);
    }
    F();
  }
  function w(N, M, D, x, R, L) {
    if (!u) return;
    const O = (Array.isArray(N.tempoModulationMarkers) ? N.tempoModulationMarkers : []).filter((B) => (B == null ? void 0 : B.active) && typeof B.ratio == "number" && B.ratio !== 0).sort((B, G) => x(B) - x(G));
    if (O.length > 0) {
      let B = 1;
      for (const G of O) {
        const _ = x(G);
        if (M + L >= _)
          B *= 1 / G.ratio;
        else
          break;
      }
      if ((!Number.isFinite(B) || B <= 0) && (B = 1), Math.abs(B - i) > R) {
        const G = D * B;
        v.Transport.bpm.value = G, u.reapplyConfiguredLoopBounds(N.isLooping), i = B, r.debug("TransportService", `Tempo multiplier updated to ${B.toFixed(3)} (${G.toFixed(2)} BPM)`);
      }
    } else Math.abs(i - 1) > R && (v.Transport.bpm.value = D, u.reapplyConfiguredLoopBounds(N.isLooping), i = 1, r.debug("TransportService", `Tempo reset to base ${D} BPM`));
  }
  const E = {
    init() {
      const N = s.getState();
      u = Ht({
        getMacrobeatInfo: s.getMacrobeatInfo ?? (() => null),
        getPlacedTonicSigns: s.getPlacedTonicSigns ?? (() => []),
        getTonicSpanColumnIndices: s.getTonicSpanColumnIndices ?? (() => /* @__PURE__ */ new Set()),
        logger: r
      }), T = Jt({
        samples: {
          H: "https://tonejs.github.io/audio/drum-samples/CR78/hihat.mp3",
          M: "https://tonejs.github.io/audio/drum-samples/CR78/snare.mp3",
          L: "https://tonejs.github.io/audio/drum-samples/CR78/kick.mp3"
        },
        synthEngine: {
          getMainVolumeNode: () => e.getMainVolumeNode()
        }
      }), v.Transport.bpm.value = N.tempo;
      const M = () => this.handleStateChange(), D = () => this.handleStateChange(), x = () => this.handleStateChange(), R = () => {
        if (u && u.getTimeMap().length > 0) {
          const B = s.getState();
          u.calculate(B);
        }
        this.handleStateChange();
      }, L = (B) => {
        var V, W;
        const G = ((V = B == null ? void 0 : B.oldConfig) == null ? void 0 : V.columnWidths) || [], _ = ((W = B == null ? void 0 : B.newConfig) == null ? void 0 : W.columnWidths) || [];
        G.length !== _.length && u && u.calculate(s.getState());
      }, F = (B) => {
        if (r.info("TransportService", `tempoChanged triggered with new value: ${B} BPM`), v.Transport.state === "started") {
          const G = v.Transport.position;
          v.Transport.pause(), m && (cancelAnimationFrame(m), m = null), v.Transport.bpm.value = B, u == null || u.reapplyConfiguredLoopBounds(s.getState().isLooping), c(), v.Transport.start(void 0, G), d === "standard" && A();
        } else
          v.Transport.bpm.value = B, u == null || u.reapplyConfiguredLoopBounds(s.getState().isLooping), u == null || u.calculate(s.getState());
      }, O = (B) => {
        v.Transport.loop = B;
        const G = v.Time(v.Transport.loopStart).toSeconds(), _ = v.Time(v.Transport.loopEnd).toSeconds();
        B && _ <= G && u && (v.Transport.loopEnd = G + Math.max(u.getMicrobeatDuration(s.getState().tempo), 1e-3)), B && u ? u.setConfiguredLoopBounds(
          v.Time(v.Transport.loopStart).toSeconds(),
          v.Time(v.Transport.loopEnd).toSeconds()
        ) : u == null || u.clearConfiguredLoopBounds();
      };
      C.on("rhythmStructureChanged", M), C.on("notesChanged", D), C.on("sixteenthStampPlacementsChanged", x), C.on("tempoModulationMarkersChanged", R), C.on("layoutConfigChanged", L), C.on("tempoChanged", F), C.on("loopingChanged", O), g.push(
        () => {
        }
        // These would be off() calls if the event system supports them
      ), v.Transport.on("stop", () => {
        var B, G;
        r.info("TransportService", "Tone.Transport 'stop' fired. Resetting playback state"), (B = C.setPlaybackState) == null || B.call(C, !1, !1), (G = n == null ? void 0 : n.clearAdsrVisuals) == null || G.call(n), m && (cancelAnimationFrame(m), m = null);
      }), r.info("TransportService", "Initialized");
    },
    handleStateChange() {
      if (v.Transport.state === "started") {
        r.debug("TransportService", "handleStateChange: Notes or rhythm changed during playback. Rescheduling");
        const M = v.Transport.position;
        v.Transport.pause(), c(), v.Transport.start(void 0, M);
      } else
        u == null || u.calculate(s.getState());
    },
    start() {
      r.info("TransportService", "Starting playback"), (o || (() => v.start()))().then(async () => {
        v.context.state !== "running" && await v.context.resume(), T && await T.waitForLoad();
        const M = s.getState();
        u == null || u.calculate(M);
        const D = (u == null ? void 0 : u.getMusicalEndTime()) ?? 0, x = (u == null ? void 0 : u.findNonAnacrusisStart(M)) ?? 0;
        u == null || u.setLoopBounds(x, D, M.tempo), v.Transport.bpm.value = M.tempo, c();
        const R = v.now() + 0.1;
        v.Transport.start(R, 0), d === "standard" && A(), C.emit("playbackStarted");
      });
    },
    resume() {
      r.info("TransportService", "Resuming playback"), (o || (() => v.start()))().then(async () => {
        v.context.state !== "running" && await v.context.resume(), v.Transport.start(), d === "standard" && A(), C.emit("playbackResumed");
      });
    },
    pause() {
      r.info("TransportService", "Pausing playback"), v.Transport.pause(), m && (cancelAnimationFrame(m), m = null), C.emit("playbackPaused");
    },
    stop() {
      var M, D, x;
      r.info("TransportService", "Stopping playback and clearing visuals"), f = !1, m && (cancelAnimationFrame(m), m = null), v.Transport.stop(), v.Transport.cancel(), T == null || T.reset();
      const N = s.getState();
      v.Transport.bpm.value = N.tempo, u == null || u.reapplyConfiguredLoopBounds(N.isLooping), e.releaseAll(), (M = n == null ? void 0 : n.clearPlayheadCanvas) == null || M.call(n), (D = n == null ? void 0 : n.clearDrumPlayheadCanvas) == null || D.call(n), (x = n == null ? void 0 : n.updateBeatLineHighlight) == null || x.call(n, 0, 0, !1), C.emit("playbackStopped");
    },
    dispose() {
      this.stop(), T == null || T.dispose(), g.forEach((N) => N()), r.debug("TransportService", "Disposed");
    }
  };
  return E;
}
const jt = {
  latencyHint: "playback",
  lookAhead: 0.1
};
function Vn(t = {}) {
  const { latencyHint: e, lookAhead: s } = { ...jt, ...t };
  let C = !1;
  if (v.context.state === "suspended")
    try {
      v.setContext(new v.Context({
        latencyHint: e
      })), C = !0;
    } catch (n) {
      console.warn("Failed to create new AudioContext, using default:", n);
    }
  return s !== void 0 && (v.context.lookAhead = s), C;
}
function Wn() {
  const t = v.context.rawContext, e = t && "baseLatency" in t ? t.baseLatency : void 0;
  return {
    state: v.context.state,
    sampleRate: v.context.sampleRate,
    baseLatency: e,
    lookAhead: v.context.lookAhead
  };
}
function kt(t) {
  let e = null, s = null;
  function C() {
    const u = typeof performance < "u" ? performance.now() : Date.now();
    return (!e || !s || u - s > 1) && (e = t.getViewportInfo(), s = u), e;
  }
  function n() {
    e = null, s = null;
  }
  function l(u, T) {
    if (t.columnToPixelX)
      return t.columnToPixelX(u, T);
    const { columnWidths: i, cellWidth: g } = T;
    let I = 0;
    for (let P = 0; P < u && P < i.length; P++)
      I += (i[P] ?? 1) * g;
    return I;
  }
  function o(u, T) {
    const i = C(), g = u - i.startRank, I = T.cellHeight / 2;
    return (g + 1) * I;
  }
  function d(u, T) {
    if (t.pixelXToColumn)
      return t.pixelXToColumn(u, T);
    const { columnWidths: i, cellWidth: g } = T;
    let I = 0;
    for (let P = 0; P < i.length; P++) {
      const c = (i[P] ?? 1) * g;
      if (u < I + c)
        return P;
      I += c;
    }
    return i.length - 1;
  }
  function p(u, T) {
    const i = C(), g = T.cellHeight / 2;
    return u / g - 1 + i.startRank;
  }
  function r() {
    const u = C(), { startRank: T, endRank: i } = u, g = Math.max(T, i - 1);
    return { startRow: T, endRow: g };
  }
  function m(u) {
    let T = (u || "").replace(/\d/g, "").trim();
    return T = T.replace(/b/g, "b-").replace(/#/g, "b_"), T;
  }
  function f(u) {
    switch (u) {
      case "C":
        return { lineWidth: 3.33, dash: [], color: "#adb5bd" };
      case "E":
        return { lineWidth: 1, dash: [5, 5], color: "#adb5bd" };
      case "G":
        return { lineWidth: 1, dash: [], color: "#dee2e6" };
      case "B":
      case "A":
      case "F":
      case "Eb/Db":
      case "Db/C#":
        return { lineWidth: 1, dash: [], color: "#ced4da" };
      default:
        return { lineWidth: 1, dash: [], color: "#ced4da" };
    }
  }
  return {
    getColumnX: l,
    getRowY: o,
    getColumnFromX: d,
    getRowFromY: p,
    getVisibleRowRange: r,
    getPitchClass: m,
    getLineStyleFromPitchClass: f,
    invalidateViewportCache: n,
    getCachedViewportInfo: C
  };
}
const ue = "♯", he = "♭", ne = "/", Yt = 0.35, Kt = 0.5, Qt = 6, Zt = 1, en = 0.08, tn = 0.04, nn = 1, Z = 4;
function on(t) {
  const { coords: e } = t;
  function s(c) {
    const b = c == null ? void 0 : c.split("-")[1];
    return Number.parseInt(b ?? "0", 10);
  }
  function C(c) {
    if (!c || typeof c.startColumnIndex != "number" || typeof c.endColumnIndex != "number")
      return !1;
    const b = c.shape === "circle" ? c.startColumnIndex + 1 : c.startColumnIndex;
    return c.endColumnIndex > b;
  }
  function n(c, b) {
    return Number.isFinite(c) && c > 0 && Number.isFinite(b) && b > 0;
  }
  function l(c, b, y) {
    const { cellWidth: S } = y, a = S * 0.25, h = c.uuid;
    if (!h) return 0;
    const A = b.filter(
      (N) => !N.isDrum && N.row === c.row && N.startColumnIndex === c.startColumnIndex && N.uuid && N.uuid !== h
    );
    if (A.length === 0) return 0;
    const w = [c, ...A];
    return w.sort((N, M) => s(N.uuid) - s(M.uuid)), w.findIndex((N) => N.uuid === h) * a;
  }
  function o(c, b) {
    var h, A, w;
    const { cellHeight: y } = b, S = (h = t.getAnimationEffectsManager) == null ? void 0 : h.call(t);
    return (A = S == null ? void 0 : S.shouldAnimateNote) != null && A.call(S, c) ? (((w = S.getVibratoYOffset) == null ? void 0 : w.call(S, c.color)) ?? 0) * y : 0;
  }
  function d(c, b, y) {
    const { cellHeight: S } = y, a = S / 2 * 0.12, h = c.uuid;
    if (!h) return 0;
    const A = b.filter(
      (N) => !N.isDrum && N.row === c.row && N.startColumnIndex === c.startColumnIndex && N.uuid && N.uuid !== h && C(N)
    );
    if (A.length === 0) return 0;
    const w = [c, ...A];
    return w.sort((N, M) => s(N.uuid) - s(M.uuid)), w.findIndex((N) => N.uuid === h) * a;
  }
  function p(c, b) {
    var D, x, R;
    const y = (D = t.getDegreeForNote) == null ? void 0 : D.call(t, c);
    if (!y) return { label: null, isAccidental: !1 };
    if (!(((x = t.hasAccidental) == null ? void 0 : x.call(t, y)) ?? !1)) return { label: y, isAccidental: !1 };
    const a = b.accidentalMode || {}, h = a.sharp ?? !0, A = a.flat ?? !0;
    if (!h && !A) return { label: null, isAccidental: !0 };
    let w = y.includes(ue) ? y : null, E = y.includes(he) ? y : null;
    const N = (R = t.getEnharmonicDegree) == null ? void 0 : R.call(t, y);
    N && (N.includes(ue) && !w && (w = N), N.includes(he) && !E && (E = N));
    let M = null;
    if (h && A) {
      const L = [];
      w && L.push(w), E && (!w || E !== w) && L.push(E), M = L.join(ne), M || (M = y);
    } else h ? M = w || y : A && (M = E || y);
    return { label: M, isAccidental: !0 };
  }
  function r(c) {
    if (!c) return { multiplier: 1, category: "natural" };
    const b = c.includes(he), y = c.includes(ue), S = c.includes(ne);
    return !b && !y ? { multiplier: 1, category: "natural" } : S ? { multiplier: 0.75, category: "both-accidentals" } : { multiplier: 0.88, category: "single-accidental" };
  }
  function m(c, b, y, S, a, h) {
    const { label: A } = p(b, y);
    if (!A) return;
    const { multiplier: w, category: E } = r(A);
    let N;
    if (b.shape === "circle") {
      const M = h * 2 * Kt;
      switch (E) {
        case "natural":
          N = M;
          break;
        case "single-accidental":
          N = M * 0.8;
          break;
        case "both-accidentals":
          N = M * 0.4;
          break;
        default:
          N = M * w;
      }
    } else {
      const M = h * 2 * Yt;
      switch (E) {
        case "natural":
          N = M * 1.5;
          break;
        case "single-accidental":
          N = M * 1.2;
          break;
        case "both-accidentals":
          N = M;
          break;
        default:
          N = M * w;
      }
    }
    if (!(N < Qt))
      if (c.fillStyle = "#212529", c.font = `bold ${N}px 'Atkinson Hyperlegible', sans-serif`, c.textAlign = "center", c.textBaseline = "middle", b.shape === "oval" && E === "both-accidentals" && A.includes(ne)) {
        const M = A.split(ne), D = N * 1.1, x = D * (M.length - 1), R = a - x / 2;
        M.forEach((L, F) => {
          const O = R + F * D, B = N * 0.08;
          c.fillText(L.trim(), S, O + B);
        });
      } else {
        const M = N * 0.08;
        c.fillText(A, S, a + M);
      }
  }
  function f(c, b, y) {
    var M, D;
    const S = (M = t.getAnimationEffectsManager) == null ? void 0 : M.call(t), a = S == null ? void 0 : S.hasReverbEffect;
    if (!(typeof a == "function" ? a(b.color) : !!a)) return { shouldApply: !1, blur: 0, spread: 0 };
    const { cellWidth: A } = y, w = (D = S == null ? void 0 : S.getReverbEffect) == null ? void 0 : D.call(S, b.color);
    if (!w) return { shouldApply: !1, blur: 0, spread: 0 };
    const E = w.blur * (A / 2), N = w.spread * (A / 3);
    return { shouldApply: E > 0 || N > 0, blur: E, spread: N };
  }
  function u(c, b, y, S, a, h, A) {
    var M, D, x;
    const w = (M = t.getAnimationEffectsManager) == null ? void 0 : M.call(t);
    if (!((D = w == null ? void 0 : w.hasDelayEffect) != null && D.call(w, b.color))) return;
    const { cellWidth: E } = y, N = (x = w.getDelayEffects) == null ? void 0 : x.call(w, b.color);
    !N || N.length === 0 || N.forEach((R) => {
      const L = R.delay / 500 * E * 2, F = S + L, O = h * R.scale, B = A * R.scale;
      c.save(), c.globalAlpha = R.opacity * 0.6, c.beginPath(), c.ellipse(F, a, O, B, 0, 0, 2 * Math.PI), c.strokeStyle = b.color, c.lineWidth = Math.max(0.5, O * 0.1), c.setLineDash([2, 2]), c.stroke(), c.restore();
    });
  }
  function T(c, b, y, S, a, h) {
    var M, D, x;
    const A = (M = t.getAnimationEffectsManager) == null ? void 0 : M.call(t);
    if (!((D = A == null ? void 0 : A.shouldFillNote) != null && D.call(A, b))) return;
    const w = ((x = A.getFillLevel) == null ? void 0 : x.call(A, b)) ?? 0;
    if (w <= 0) return;
    c.save();
    const E = 1 - w, N = c.createRadialGradient(y, S, 0, y, S, Math.max(a, h));
    N.addColorStop(0, "transparent"), N.addColorStop(Math.max(0, E - 0.05), "transparent"), N.addColorStop(E, `${b.color}1F`), N.addColorStop(1, `${b.color}BF`), c.beginPath(), c.ellipse(y, S, a, h, 0, 0, 2 * Math.PI), c.clip(), c.fillStyle = N, c.fillRect(y - a - 10, S - h - 10, (a + 10) * 2, (h + 10) * 2), c.restore();
  }
  function i(c, b, y, S, a, h) {
    var R, L, F;
    const A = (R = t.getAnimationEffectsManager) == null ? void 0 : R.call(t);
    if (!((L = A == null ? void 0 : A.shouldFillNote) != null && L.call(A, b))) return;
    const w = ((F = A.getFillLevel) == null ? void 0 : F.call(A, b)) ?? 0;
    if (w <= 0) return;
    c.save(), c.beginPath(), c.arc(y, a, h, Math.PI / 2, -Math.PI / 2, !1), c.lineTo(S, a - h), c.arc(S, a, h, -Math.PI / 2, Math.PI / 2, !1), c.lineTo(y, a + h), c.closePath(), c.clip();
    const E = (y + S) / 2, N = S - y, M = Math.max(N / 2 + h, h), D = 1 - w, x = c.createRadialGradient(E, a, 0, E, a, M);
    x.addColorStop(0, "transparent"), x.addColorStop(Math.max(0, D - 0.05), "transparent"), x.addColorStop(D, `${b.color}1F`), x.addColorStop(1, `${b.color}BF`), c.fillStyle = x, c.fillRect(y - h - 10, a - h - 10, N + (h + 10) * 2, (h + 10) * 2), c.restore();
  }
  function g(c, b, y, S, a, h, A, w) {
    if (i(c, b, S, a, h, A), c.save(), c.beginPath(), c.arc(S, h, A, Math.PI / 2, -Math.PI / 2, !1), c.lineTo(a, h - A), c.arc(a, h, A, -Math.PI / 2, Math.PI / 2, !1), c.lineTo(S, h + A), c.closePath(), c.strokeStyle = b.color, c.lineWidth = w, c.shadowColor = b.color, c.shadowBlur = Z, c.stroke(), c.shadowBlur = 0, c.shadowColor = "transparent", c.restore(), y.degreeDisplayMode !== "off") {
      const E = (S + a) / 2;
      m(c, b, y, E, h, A);
    }
  }
  function I(c, b, y, S) {
    const { cellWidth: a, cellHeight: h, tempoModulationMarkers: A, placedNotes: w } = b, E = e.getRowY(S, b), N = o(y, b), M = E + N, D = e.getColumnX(y.startColumnIndex, b);
    let x;
    if (A && A.length > 0 ? x = e.getColumnX(y.startColumnIndex + 1, b) - D : x = a, !n(x, h)) return;
    const R = l(y, w, b), L = D + x + R, F = Math.max(Zt, x * en), O = h / 2 - F / 2, B = C(y), G = b.longNoteStyle || "style1";
    if (B && G === "style2") {
      const W = L, U = e.getColumnX(y.endColumnIndex, b);
      if (!n(U - W, O)) return;
      g(c, y, b, W, U, M, O, F);
      return;
    }
    if (B) {
      const W = e.getColumnX(y.endColumnIndex + 1, b), U = d(y, w, b), q = M + U;
      c.beginPath(), c.moveTo(L, q), c.lineTo(W, q), c.strokeStyle = y.color, c.lineWidth = Math.max(nn, x * tn), c.stroke();
    }
    const _ = x - F / 2;
    if (!n(_, O)) return;
    u(c, y, b, L, M, _, O), c.save(), T(c, y, L, M, _, O);
    const V = f(c, y, b);
    V.shouldApply && (c.shadowColor = y.color, c.shadowBlur = Z + V.blur, c.shadowOffsetX = V.spread), c.beginPath(), c.ellipse(L, M, _, O, 0, 0, 2 * Math.PI), c.strokeStyle = y.color, c.lineWidth = F, V.shouldApply || (c.shadowColor = y.color, c.shadowBlur = Z), c.stroke(), c.shadowBlur = 0, c.shadowColor = "transparent", c.shadowOffsetX = 0, c.restore(), b.degreeDisplayMode !== "off" && m(c, y, b, L, M, _);
  }
  function P(c, b, y, S) {
    const { columnWidths: a, cellWidth: h, cellHeight: A, tempoModulationMarkers: w, placedNotes: E } = b, N = e.getRowY(S, b), M = o(y, b), D = N + M, x = e.getColumnX(y.startColumnIndex, b);
    let R;
    if (w && w.length > 0 ? R = e.getColumnX(y.startColumnIndex + 1, b) - x : R = (a[y.startColumnIndex] ?? 1) * h, !n(R, A)) return;
    const L = l(y, E, b), F = Math.max(0.5, R * 0.15), O = x + R / 2 + L, B = R / 2 - F / 2, G = A / 2 - F / 2;
    if (!n(B, G)) return;
    u(c, y, b, O, D, B, G), c.save(), T(c, y, O, D, B, G);
    const _ = f(c, y, b);
    _.shouldApply && (c.shadowColor = y.color, c.shadowBlur = Z + _.blur, c.shadowOffsetX = _.spread), c.beginPath(), c.ellipse(O, D, B, G, 0, 0, 2 * Math.PI), c.strokeStyle = y.color, c.lineWidth = F, _.shouldApply || (c.shadowColor = y.color, c.shadowBlur = Z), c.stroke(), c.shadowBlur = 0, c.shadowColor = "transparent", c.shadowOffsetX = 0, c.restore(), b.degreeDisplayMode !== "off" && m(c, y, b, O, D, B);
  }
  return {
    drawTwoColumnOvalNote: I,
    drawSingleColumnOvalNote: P,
    hasVisibleTail: C
  };
}
function sn(t) {
  const { coords: e } = t;
  function s(n, l) {
    const { fullRowData: o, canvasWidth: d, cellHeight: p } = l, { startRow: r, endRow: m } = e.getVisibleRowRange();
    for (let f = r; f <= m; f++) {
      const u = o[f];
      if (!u) continue;
      const T = e.getRowY(f, l), i = e.getPitchClass(u.toneNote), g = e.getLineStyleFromPitchClass(i);
      if (n.beginPath(), n.moveTo(0, T), n.lineTo(d, T), n.strokeStyle = g.color, n.lineWidth = g.lineWidth, n.setLineDash(g.dash), n.stroke(), n.setLineDash([]), i === "G") {
        const I = p / 2;
        n.fillStyle = "#f8f9fa", n.fillRect(0, T - I, d, I);
      }
    }
  }
  function C(n, l) {
    var I, P, c, b;
    const {
      columnWidths: o,
      macrobeatBoundaryStyles: d,
      hasAnacrusis: p,
      canvasHeight: r
    } = l, m = ((I = t.getPlacedTonicSigns) == null ? void 0 : I.call(t)) ?? [], f = ((P = t.getTonicSpanColumnIndices) == null ? void 0 : P.call(t, m)) ?? /* @__PURE__ */ new Set(), u = ((c = t.getAnacrusisColors) == null ? void 0 : c.call(t)) ?? {
      background: "rgba(173, 181, 189, 0.15)",
      border: "rgba(173, 181, 189, 0.3)"
    };
    let T = p, i = 0, g = 0;
    for (let y = 0; y <= o.length; y++) {
      const S = e.getColumnX(y, l), a = (b = t.getMacrobeatInfo) == null ? void 0 : b.call(t, g);
      if (a && a.startColumn === y) {
        const A = d[g] ?? "solid";
        T && A === "solid" && (n.fillStyle = u.background, n.fillRect(i, 0, S - i, r), T = !1), n.beginPath(), n.moveTo(S, 0), n.lineTo(S, r), A === "anacrusis" ? (n.strokeStyle = u.border, n.setLineDash([5, 5]), n.lineWidth = 1) : A === "dashed" ? (n.strokeStyle = "#adb5bd", n.setLineDash([5, 5]), n.lineWidth = 1) : (n.strokeStyle = "#adb5bd", n.setLineDash([]), n.lineWidth = 2), n.stroke(), n.setLineDash([]), g++;
      } else y > 0 && !f.has(y - 1) && (n.beginPath(), n.moveTo(S, 0), n.lineTo(S, r), n.strokeStyle = "#dee2e6", n.lineWidth = 1, n.stroke());
      if (f.has(y)) {
        const A = (o[y] ?? 1) * l.cellWidth;
        n.fillStyle = "rgba(255, 193, 7, 0.1)", n.fillRect(S, 0, A, r);
      }
    }
  }
  return {
    drawHorizontalLines: s,
    drawVerticalLines: C
  };
}
function $n(t, e, s) {
  const C = t.canvas.width, n = t.canvas.height;
  t.clearRect(0, 0, C, n);
  const l = kt({
    getViewportInfo: s.getViewportInfo,
    columnToPixelX: s.columnToPixelX ? (T, i) => s.columnToPixelX(T, e) : void 0,
    pixelXToColumn: s.pixelXToColumn ? (T, i) => s.pixelXToColumn(T, e) : void 0
  }), o = sn({
    coords: l,
    getMacrobeatInfo: s.getMacrobeatInfo,
    getPlacedTonicSigns: () => e.placedTonicSigns,
    getTonicSpanColumnIndices: s.getTonicSpanColumnIndices,
    getAnacrusisColors: s.getAnacrusisColors
  }), d = on({
    coords: l,
    getDegreeForNote: s.getDegreeForNote,
    hasAccidental: s.hasAccidental,
    getEnharmonicDegree: s.getEnharmonicDegree,
    getAnimationEffectsManager: s.getAnimationEffectsManager
  }), p = {
    ...e,
    canvasWidth: C,
    canvasHeight: n
  }, r = {
    ...e,
    placedNotes: e.placedNotes
  };
  o.drawHorizontalLines(t, p), o.drawVerticalLines(t, p);
  const { startRow: m, endRow: f } = l.getVisibleRowRange(), u = e.placedNotes.filter((T) => {
    if (T.isDrum) return !1;
    const i = T.globalRow ?? T.row;
    return i >= m && i <= f;
  });
  for (const T of u) {
    const i = T.globalRow ?? T.row;
    T.shape === "circle" ? d.drawTwoColumnOvalNote(t, r, T, i) : d.drawSingleColumnOvalNote(t, r, T, i);
  }
  for (const T of e.placedTonicSigns) {
    const i = T.globalRow ?? T.row;
    i >= m && i <= f && an(t, e, T, l);
  }
}
function an(t, e, s, C) {
  const { cellWidth: n, cellHeight: l } = e, o = C.getRowY(s.globalRow ?? s.row, e), d = C.getColumnX(s.columnIndex, e), p = n * 2, r = d + p / 2, m = Math.min(p, l) / 2 * 0.9;
  if (m < 2 || (t.beginPath(), t.arc(r, o, m, 0, 2 * Math.PI), t.strokeStyle = "#212529", t.lineWidth = Math.max(0.5, n * 0.05), t.stroke(), s.tonicNumber == null)) return;
  const f = s.tonicNumber.toString(), u = m * 1.5;
  u < 6 || (t.fillStyle = "#212529", t.font = `bold ${u}px 'Atkinson Hyperlegible', sans-serif`, t.textAlign = "center", t.textBaseline = "middle", t.fillText(f, r, o));
}
const rn = ["H", "M", "L"];
function ln(t) {
  if (t.length === 0) return [];
  const e = [...t].sort((C, n) => C.start - n.start), s = [];
  for (const C of e) {
    if (s.length === 0) {
      s.push({ ...C });
      continue;
    }
    const n = s[s.length - 1];
    C.start <= n.end ? n.end = Math.max(n.end, C.end) : s.push({ ...C });
  }
  return s;
}
function cn(t, e, s) {
  const C = /* @__PURE__ */ new Set([t, e]);
  s.forEach((o) => {
    const d = Math.max(t, Math.min(e, o.start)), p = Math.max(t, Math.min(e, o.end));
    p > d && (C.add(d), C.add(p));
  });
  const n = Array.from(C).sort((o, d) => o - d), l = [];
  for (let o = 0; o < n.length - 1; o++) {
    const d = n[o], p = n[o + 1], r = (d + p) / 2, m = s.some((f) => r >= f.start && r < f.end);
    p > d && l.push({ from: d, to: p, light: m });
  }
  return l;
}
function je(t, e) {
  return e.some(
    (s) => t === s.columnIndex || t === s.columnIndex + 1
  );
}
function dn(t, e) {
  return !e.some((s) => t === s.columnIndex + 1);
}
function ke(t, e, s, C, n, l, o = 1) {
  const d = s + n / 2, p = C + l / 2, r = Math.min(n, l) * 0.4 * o;
  if (t.beginPath(), e === 0)
    t.moveTo(d, p - r), t.lineTo(d - r, p + r), t.lineTo(d + r, p + r), t.closePath();
  else if (e === 1)
    t.moveTo(d, p - r), t.lineTo(d + r, p), t.lineTo(d, p + r), t.lineTo(d - r, p), t.closePath();
  else {
    for (let f = 0; f < 5; f++) {
      const u = 2 * Math.PI / 5 * f - Math.PI / 2, T = d + r * Math.cos(u), i = p + r * Math.sin(u);
      f === 0 ? t.moveTo(T, i) : t.lineTo(T, i);
    }
    t.closePath();
  }
  t.fill();
}
function un(t) {
  const { coords: e } = t, s = {
    stroke: "#c7cfd8"
  };
  function C(p, r) {
    const m = [];
    return r !== null && r > 0 && m.push({
      start: e.getColumnX(0, p),
      end: e.getColumnX(r, p)
    }), p.placedTonicSigns.forEach((f) => {
      const u = e.getColumnX(f.columnIndex, p), T = e.getColumnX(f.columnIndex + 2, p);
      m.push({ start: u, end: T });
    }), ln(m);
  }
  function n(p) {
    if (!p.hasAnacrusis || !t.getMacrobeatInfo) return null;
    const r = p.macrobeatBoundaryStyles.findIndex(
      (f) => f === "solid"
    );
    if (r < 0) return null;
    const m = t.getMacrobeatInfo(r);
    return m ? m.endColumn + 1 : null;
  }
  function l(p, r, m) {
    var y, S;
    const {
      columnWidths: f,
      musicalColumnWidths: u,
      macrobeatGroupings: T,
      macrobeatBoundaryStyles: i,
      placedTonicSigns: g
    } = r, P = (u && u.length > 0 ? u : f).length, c = [];
    for (let a = 0; a < T.length; a++) {
      const h = (y = t.getMacrobeatInfo) == null ? void 0 : y.call(t, a);
      h && c.push(h.endColumn + 1);
    }
    const b = ((S = t.getAnacrusisColors) == null ? void 0 : S.call(t)) ?? s;
    for (let a = 0; a <= P; a++) {
      const h = a === 0 || a === P, A = je(a, g), w = g.some((x) => a === x.columnIndex + 2), E = c.includes(a);
      if (!dn(a, g)) continue;
      let M = null;
      if (h || A || w)
        M = { lineWidth: 2, strokeStyle: "#adb5bd", dash: [] };
      else if (E) {
        const x = c.indexOf(a), R = i[x];
        R === "anacrusis" ? M = { lineWidth: 1, strokeStyle: b.stroke, dash: [4, 4] } : M = {
          lineWidth: 1,
          strokeStyle: "#adb5bd",
          dash: R === "solid" ? [] : [5, 5]
        };
      }
      if (!M) continue;
      const D = e.getColumnX(a, r);
      p.beginPath(), p.moveTo(D, 0), p.lineTo(D, m), p.lineWidth = M.lineWidth, p.strokeStyle = M.strokeStyle, p.setLineDash(M.dash), p.stroke();
    }
    p.setLineDash([]);
  }
  function o(p, r, m, f) {
    var I;
    const u = n(r), T = C(r, u), i = cn(0, f, T), g = ((I = t.getAnacrusisColors) == null ? void 0 : I.call(t)) ?? s;
    for (let P = 0; P < 4; P++) {
      const c = P * m;
      i.forEach((b) => {
        b.to <= b.from || (p.beginPath(), p.moveTo(b.from, c), p.lineTo(b.to, c), p.strokeStyle = b.light ? g.stroke : "#ced4da", p.lineWidth = 1, p.globalAlpha = b.light ? 0.6 : 1, p.stroke(), p.globalAlpha = 1);
      });
    }
  }
  function d(p, r, m) {
    var P;
    const { placedNotes: f, columnWidths: u, cellWidth: T, placedTonicSigns: i, tempoModulationMarkers: g } = r, I = u.length + 4;
    for (let c = 0; c < I; c++) {
      if (je(c, i)) continue;
      const b = e.getColumnX(c, r);
      let y;
      g && g.length > 0 ? y = e.getColumnX(c + 1, r) - b : y = (u[c] ?? 0) * T;
      for (let S = 0; S < 3; S++) {
        const a = S * m, h = rn[S], A = f.find(
          (w) => w.isDrum && (typeof w.drumTrack == "number" ? String(w.drumTrack) : w.drumTrack) === h && w.startColumnIndex === c
        );
        if (A) {
          p.fillStyle = A.color;
          const w = ((P = t.getAnimationScale) == null ? void 0 : P.call(t, c, h)) ?? 1;
          ke(p, S, b, a, y, m, w);
        } else
          p.fillStyle = "#ced4da", p.beginPath(), p.arc(b + y / 2, a + m / 2, 2, 0, Math.PI * 2), p.fill();
      }
    }
  }
  return {
    drawVerticalLines: l,
    drawHorizontalLines: o,
    drawDrumNotes: d,
    drawDrumShape: ke,
    buildLightRanges: C,
    getAnacrusisEndColumn: n
  };
}
function qn(t, e, s) {
  var r;
  const C = t.canvas.width, n = t.canvas.height;
  t.clearRect(0, 0, C, n);
  const l = e.baseDrumRowHeight ?? 30, o = e.drumHeightScaleFactor ?? 1.5, d = Math.max(l, o * e.cellHeight), p = un(s);
  p.drawHorizontalLines(t, e, d, C), p.drawVerticalLines(t, e, n), p.drawDrumNotes(t, e, d), s.renderModulationMarkers && ((r = e.tempoModulationMarkers) != null && r.length) && s.renderModulationMarkers(t, e);
}
const me = {
  onsetToleranceMs: 100,
  releaseToleranceMs: 150,
  pitchToleranceCents: 50,
  hitThreshold: 70,
  // 70% of note duration with correct pitch
  minAmplitudeDb: -60,
  minVoicedMs: 400,
  minCoveragePct: 60,
  bandToleranceSemitones: 0,
  minSlideSemitones: 3,
  accuracyTiers: {
    perfect: { onsetMs: 30, pitchCents: 10, coverage: 95 },
    good: { onsetMs: 75, pitchCents: 25, coverage: 85 },
    okay: { onsetMs: 150, pitchCents: 50, coverage: 70 }
  }
};
function hn(t = {}) {
  const e = {
    ...me,
    ...t,
    accuracyTiers: t.accuracyTiers ? {
      ...me.accuracyTiers,
      ...t.accuracyTiers
    } : me.accuracyTiers
  }, s = /* @__PURE__ */ new Map(), C = /* @__PURE__ */ new Map();
  function n(y, S) {
    return (y - S) * 100;
  }
  function l(y) {
    return y.targetKind ?? "fixedPitch";
  }
  function o(y) {
    return typeof y == "number" && Number.isFinite(y);
  }
  function d(y) {
    return !o(y.midi) || y.midi <= 0 ? !1 : typeof y.amplitudeDb == "number" && typeof e.minAmplitudeDb == "number" ? y.amplitudeDb >= e.minAmplitudeDb : !0;
  }
  function p(y, S) {
    return o(S) ? Math.abs(n(y.midi, S)) <= e.pitchToleranceCents : !1;
  }
  function r(y) {
    return !o(y.minMidi) || !o(y.maxMidi) ? null : {
      minMidi: Math.min(y.minMidi, y.maxMidi),
      maxMidi: Math.max(y.minMidi, y.maxMidi)
    };
  }
  function m(y, S) {
    if (!d(y)) return !1;
    const a = r(S);
    if (!a) return !1;
    const h = e.bandToleranceSemitones ?? 0;
    return y.midi >= a.minMidi - h && y.midi <= a.maxMidi + h;
  }
  function f(y, S) {
    const a = l(S);
    return a === "fixedPitch" ? p(y, S.midi ?? 0) : a === "windowBand" ? m(y, S) : d(y);
  }
  function u(y, S) {
    return !o(S) || y.length === 0 ? 0 : y.reduce((h, A) => h + Math.abs(n(A.midi, S)), 0) / y.length;
  }
  function T(y, S, a, h) {
    if (y.length === 0)
      return { coveragePct: 0, coveredMs: 0 };
    const A = y.filter(S);
    if (A.length === 0)
      return { coveragePct: 0, coveredMs: 0 };
    let w = 0;
    for (let E = 0; E < A.length; E++) {
      const N = A[E];
      if (!N) continue;
      const M = A[E + 1];
      if (M)
        w += M.timeMs - N.timeMs;
      else {
        const D = a + h, x = Math.min(50, D - N.timeMs);
        w += x;
      }
    }
    return {
      coveragePct: w / h * 100,
      coveredMs: w
    };
  }
  function i(y, S, a, h) {
    return T(
      y,
      (A) => p(A, S),
      a,
      h
    ).coveragePct;
  }
  function g(y) {
    if (y.length === 0) return 0;
    const S = [...y].sort((h, A) => h - A), a = Math.floor(S.length / 2);
    return S.length % 2 === 0 ? (S[a - 1] + S[a]) / 2 : S[a] ?? 0;
  }
  function I(y) {
    if (y.length < 2) return 0;
    const S = Math.max(1, Math.floor(y.length * 0.2)), a = y.slice(0, S).map((E) => E.midi), h = y.slice(Math.max(0, y.length - S)).map((E) => E.midi), A = g(a);
    return g(h) - A;
  }
  function P(y, S, a) {
    const h = e.accuracyTiers;
    if (!h) return "okay";
    const A = Math.abs(y);
    return A <= h.perfect.onsetMs && S <= h.perfect.pitchCents && a >= h.perfect.coverage ? "perfect" : A <= h.good.onsetMs && S <= h.good.pitchCents && a >= h.good.coverage ? "good" : A <= h.okay.onsetMs && S <= h.okay.pitchCents && a >= h.okay.coverage ? "okay" : "miss";
  }
  function c(y) {
    const { note: S, samples: a, onsetSample: h, releaseSample: A } = y, w = l(S);
    let E = 0;
    h ? E = h.timeMs - S.startTimeMs : E = e.onsetToleranceMs * 2;
    let N = 0;
    const M = S.startTimeMs + S.durationMs;
    A ? N = A.timeMs - M : N = e.releaseToleranceMs * 2;
    const D = e.minCoveragePct ?? e.hitThreshold, x = e.minVoicedMs ?? 0;
    let R = 0, L = 0, F, O, B, G, _ = "miss";
    if (w === "fixedPitch") {
      const W = S.midi ?? 0;
      R = u(a, W), L = i(
        a,
        W,
        S.startTimeMs,
        S.durationMs
      );
      const U = Math.abs(E) <= e.onsetToleranceMs, q = Math.abs(N) <= e.releaseToleranceMs, H = L >= e.hitThreshold;
      _ = U && q && H ? "hit" : "miss";
    } else if (w === "windowAnyPitch") {
      const W = T(
        a,
        d,
        S.startTimeMs,
        S.durationMs
      );
      F = W.coveragePct, O = W.coveredMs, L = W.coveragePct, _ = F >= D && O >= x ? "hit" : "miss";
    } else if (w === "windowBand") {
      const W = T(
        a,
        (H) => m(H, S),
        S.startTimeMs,
        S.durationMs
      );
      B = W.coveragePct, L = W.coveragePct, O = W.coveredMs, F = T(
        a,
        d,
        S.startTimeMs,
        S.durationMs
      ).coveragePct;
      const q = r(S);
      if (q) {
        const H = (q.minMidi + q.maxMidi) / 2, X = a.filter((z) => m(z, S));
        R = u(X, H);
      }
      _ = B >= D && (O ?? 0) >= x ? "hit" : "miss";
    } else if (w === "slideWindow") {
      const W = a.filter(d), U = T(
        a,
        d,
        S.startTimeMs,
        S.durationMs
      );
      F = U.coveragePct, O = U.coveredMs, L = U.coveragePct, G = I(W);
      const q = e.minSlideSemitones ?? 0;
      let H = !0;
      S.slideDirection === "up" ? H = G >= q : S.slideDirection === "down" ? H = G <= -q : H = Math.abs(G) >= q, _ = F >= D && (O ?? 0) >= x && H ? "hit" : "miss";
    }
    const V = P(
      E,
      R,
      L
    );
    return {
      hitStatus: _,
      onsetAccuracyMs: E,
      releaseAccuracyMs: N,
      pitchAccuracyCents: R,
      pitchCoverage: L,
      voicedCoverage: F,
      voicedMs: O,
      bandCoverage: B,
      slideSemitoneSpan: G,
      slideDirection: S.slideDirection,
      pitchSamples: [...a],
      accuracyTier: V
    };
  }
  return {
    startNote(y, S) {
      s.set(y, {
        note: S,
        samples: [],
        onsetSample: null,
        releaseSample: null,
        startedAt: performance.now()
      });
    },
    recordPitchSample(y) {
      for (const [S, a] of s) {
        const { note: h } = a, A = h.startTimeMs + h.durationMs, w = e.onsetToleranceMs, E = e.releaseToleranceMs;
        if (y.timeMs >= h.startTimeMs - w && y.timeMs <= A + E) {
          a.samples.push(y);
          const N = f(y, h);
          !a.onsetSample && y.timeMs >= h.startTimeMs - w && y.timeMs <= h.startTimeMs + w && N && (a.onsetSample = y), y.timeMs >= A - E && y.timeMs <= A + E && N && (a.releaseSample = y);
        }
      }
    },
    endNote(y) {
      const S = s.get(y);
      if (!S) return null;
      const a = c(S);
      return C.set(y, a), s.delete(y), a;
    },
    getCurrentPerformance(y) {
      const S = s.get(y);
      if (!S) return null;
      const { note: a, samples: h, onsetSample: A } = S, w = l(a);
      let E = 0;
      A && (E = A.timeMs - a.startTimeMs);
      let N = 0, M = 0, D, x, R, L;
      if (w === "fixedPitch") {
        const F = a.midi ?? 0;
        N = u(h, F), M = i(
          h,
          F,
          a.startTimeMs,
          a.durationMs
        );
      } else if (w === "windowAnyPitch") {
        const F = T(
          h,
          d,
          a.startTimeMs,
          a.durationMs
        );
        D = F.coveragePct, x = F.coveredMs, M = F.coveragePct;
      } else if (w === "windowBand") {
        const F = T(
          h,
          (G) => m(G, a),
          a.startTimeMs,
          a.durationMs
        );
        R = F.coveragePct, M = F.coveragePct, x = F.coveredMs, D = T(
          h,
          d,
          a.startTimeMs,
          a.durationMs
        ).coveragePct;
        const B = r(a);
        if (B) {
          const G = (B.minMidi + B.maxMidi) / 2, _ = h.filter((V) => m(V, a));
          N = u(_, G);
        }
      } else if (w === "slideWindow") {
        const F = h.filter(d), O = T(
          h,
          d,
          a.startTimeMs,
          a.durationMs
        );
        D = O.coveragePct, x = O.coveredMs, M = O.coveragePct, L = I(F);
      }
      return {
        onsetAccuracyMs: E,
        pitchAccuracyCents: N,
        pitchCoverage: M,
        voicedCoverage: D,
        voicedMs: x,
        bandCoverage: R,
        slideSemitoneSpan: L,
        slideDirection: a.slideDirection,
        pitchSamples: [...h]
      };
    },
    getAllPerformances() {
      return new Map(C);
    },
    reset() {
      s.clear(), C.clear();
    },
    dispose() {
      s.clear(), C.clear();
    }
  };
}
const Ye = {
  judgmentLinePosition: 0.12,
  pixelsPerSecond: 200,
  lookAheadMs: 3e3,
  scrollMode: "constant-speed",
  leadInBeats: 4,
  playMetronomeDuringOnramp: !0,
  playTargetNotes: !0,
  playMetronome: !1,
  inputSources: ["microphone"],
  feedbackConfig: {
    onsetToleranceMs: 100,
    releaseToleranceMs: 150,
    pitchToleranceCents: 50,
    hitThreshold: 70
  }
};
function Hn(t) {
  const e = {
    ...Ye,
    ...t,
    feedbackConfig: {
      ...Ye.feedbackConfig,
      ...t.feedbackConfig
    }
  }, { stateCallbacks: s, eventCallbacks: C, visualCallbacks: n, logger: l } = e, o = {
    isPlaying: !1,
    isPaused: !1,
    currentTimeMs: 0,
    scrollOffset: 0,
    onrampComplete: !1,
    targetNotes: [],
    activeNotes: /* @__PURE__ */ new Set(),
    startTime: null
  }, d = hn(e.feedbackConfig);
  let p = null;
  const r = /* @__PURE__ */ new Set();
  function m() {
    const a = 60 / s.getTempo() * 1e3;
    return e.leadInBeats * a;
  }
  function f() {
    return s.getViewportWidth() * e.judgmentLinePosition;
  }
  function u(S) {
    const a = e.pixelsPerSecond / 1e3, h = f(), A = m();
    return (S + A) * a - h;
  }
  function T(S) {
    const a = f(), h = s.getCellWidth(), A = S.startColumn * h - o.scrollOffset, w = S.endColumn * h - o.scrollOffset, N = e.feedbackConfig.onsetToleranceMs / 1e3 * e.pixelsPerSecond;
    return A <= a + N && w >= a - N;
  }
  function i() {
    var a, h;
    const S = /* @__PURE__ */ new Set();
    for (const A of o.targetNotes) {
      const w = A.startTimeMs + A.durationMs, E = e.feedbackConfig.onsetToleranceMs;
      if (o.currentTimeMs >= A.startTimeMs - E && o.currentTimeMs <= w + E)
        S.add(A.id), o.activeNotes.has(A.id) || (d.startNote(A.id, A), l == null || l.debug("NoteHighway", `Note ${A.id} became active`, { note: A }));
      else if (o.activeNotes.has(A.id)) {
        const N = d.endNote(A.id);
        if (N) {
          A.performance = N;
          const M = { noteId: A.id, note: A, performance: N };
          N.hitStatus === "hit" ? (C.emit("noteHit", M), (a = n == null ? void 0 : n.onNoteHit) == null || a.call(n, A.id, N.accuracyTier || "okay"), l == null || l.info("NoteHighway", `Note hit: ${A.id}`, N)) : (C.emit("noteMissed", M), (h = n == null ? void 0 : n.onNoteMiss) == null || h.call(n, A.id), l == null || l.info("NoteHighway", `Note missed: ${A.id}`, N));
        }
      }
    }
    o.activeNotes = S;
  }
  function g() {
    for (const S of o.targetNotes) {
      const a = T(S), h = r.has(S.id);
      a && !h ? (r.add(S.id), C.emit("noteEntered", { noteId: S.id, note: S })) : !a && h && (r.delete(S.id), C.emit("noteExited", { noteId: S.id, note: S }));
    }
  }
  function I() {
    var S, a;
    if (!o.onrampComplete)
      if (o.currentTimeMs >= 0)
        o.onrampComplete = !0, C.emit("onrampComplete"), (S = n == null ? void 0 : n.clearOnrampCountdown) == null || S.call(n), l == null || l.info("NoteHighway", "Onramp complete", null);
      else {
        const A = 60 / s.getTempo() * 1e3, w = Math.abs(o.currentTimeMs), E = Math.ceil(w / A);
        (a = n == null ? void 0 : n.updateOnrampCountdown) == null || a.call(n, E);
      }
  }
  function P() {
    if (!o.isPlaying || o.isPaused || !o.startTime) {
      p = null;
      return;
    }
    const S = performance.now(), a = m();
    o.currentTimeMs = S - o.startTime - a, o.scrollOffset = u(o.currentTimeMs), I(), i(), g(), p = requestAnimationFrame(P);
  }
  function c() {
    p || (p = requestAnimationFrame(P));
  }
  function b() {
    p && (cancelAnimationFrame(p), p = null);
  }
  return {
    init(S) {
      o.targetNotes = S, l == null || l.info("NoteHighway", `Initialized with ${S.length} notes`, null);
    },
    start() {
      o.isPlaying || (o.isPlaying = !0, o.isPaused = !1, o.currentTimeMs = -m(), o.scrollOffset = u(o.currentTimeMs), o.onrampComplete = !1, o.activeNotes.clear(), o.startTime = performance.now(), r.clear(), d.reset(), c(), C.emit("playbackStarted"), l == null || l.info("NoteHighway", "Playback started", { onrampDurationMs: m() }));
    },
    pause() {
      !o.isPlaying || o.isPaused || (o.isPaused = !0, b(), C.emit("playbackPaused"), l == null || l.info("NoteHighway", "Playback paused", { currentTimeMs: o.currentTimeMs }));
    },
    resume() {
      if (!o.isPlaying || !o.isPaused || !o.startTime) return;
      const S = performance.now() - (o.startTime + o.currentTimeMs + m());
      o.startTime += S, o.isPaused = !1, c(), C.emit("playbackResumed"), l == null || l.info("NoteHighway", "Playback resumed", null);
    },
    stop() {
      var a, h;
      if (!o.isPlaying) return;
      o.isPlaying = !1, o.isPaused = !1, o.currentTimeMs = 0, o.scrollOffset = 0, o.onrampComplete = !1, o.activeNotes.clear(), o.startTime = null, r.clear(), b(), (a = n == null ? void 0 : n.clearCanvas) == null || a.call(n), (h = n == null ? void 0 : n.clearOnrampCountdown) == null || h.call(n), C.emit("playbackStopped"), o.targetNotes.every((A) => A.performance !== void 0) && C.emit("performanceComplete"), l == null || l.info("NoteHighway", "Playback stopped", null);
    },
    setScrollOffset(S) {
      if (o.currentTimeMs = S, o.scrollOffset = u(S), o.isPlaying) {
        const a = m();
        o.startTime = performance.now() - (S + a);
      }
      l == null || l.debug("NoteHighway", "Scroll offset set", { timeMs: S, scrollOffset: o.scrollOffset });
    },
    recordPitchInput(S, a, h, A) {
      if (!o.isPlaying || o.isPaused || !e.inputSources.includes(h)) return;
      const w = {
        timeMs: o.currentTimeMs,
        midi: S,
        clarity: a,
        amplitudeDb: A,
        source: h
      };
      d.recordPitchSample(w);
    },
    getState() {
      return o;
    },
    getVisibleNotes() {
      f();
      const S = s.getViewportWidth(), a = s.getCellWidth();
      return o.targetNotes.filter((h) => {
        const A = h.startColumn * a - o.scrollOffset;
        return h.endColumn * a - o.scrollOffset >= 0 && A <= S;
      });
    },
    getPerformanceResults() {
      return d.getAllPerformances();
    },
    getFeedbackCollector() {
      return d;
    },
    dispose() {
      b(), d.dispose(), o.targetNotes = [], o.activeNotes.clear(), r.clear(), l == null || l.info("NoteHighway", "Service disposed", null);
    }
  };
}
function et(t) {
  return 60 / t / 2;
}
function mn(t, e) {
  const { timeMap: s, tempo: C, cellWidth: n } = e;
  let l, o;
  if (s && s.length > 0) {
    const r = s[t.startColumnIndex] ?? 0, m = s[t.endColumnIndex] ?? r;
    l = r * 1e3, o = m * 1e3;
  } else {
    const r = e.microbeatDurationSec ?? et(C);
    l = t.startColumnIndex * r * 1e3, o = t.endColumnIndex * r * 1e3;
  }
  const d = o - l, p = t.globalRow !== void 0 ? 108 - t.globalRow : 60;
  return {
    id: t.uuid ?? `note-${t.startColumnIndex}-${t.row}`,
    midi: p,
    startTimeMs: l,
    durationMs: d,
    startColumn: t.startColumnIndex,
    endColumn: t.endColumnIndex,
    color: t.color,
    shape: t.shape,
    globalRow: t.globalRow ?? t.row
  };
}
function fn(t, e) {
  return t.filter((C) => !C.isDrum).map((C) => mn(C, e));
}
function Un(t, e) {
  const s = [0];
  let C = 0;
  for (let n = 0; n < t.length; n++) {
    const l = t[n] ?? 1;
    C += l * e, s.push(C);
  }
  return s;
}
function Xn(t, e) {
  const s = et(t.tempo), C = {
    tempo: t.tempo,
    cellWidth: t.cellWidth,
    timeMap: e,
    microbeatDurationSec: s
  };
  return fn(t.placedNotes, C);
}
const Jn = "0.1.0";
export {
  qt as ClippingMonitor,
  jt as DEFAULT_CONTEXT_OPTIONS,
  Ut as DEFAULT_DRUM_SAMPLES,
  Vt as FilteredVoice,
  Wt as GainManager,
  K as MODULATION_RATIOS,
  Jn as VERSION,
  et as calculateMicrobeatDuration,
  wn as canvasToTime,
  vn as canvasToVisual,
  An as canvasXToSeconds,
  Nn as columnToRegularTime,
  Vn as configureAudioContext,
  mn as convertNoteToHighway,
  fn as convertNotesToHighway,
  Xn as convertStateToHighway,
  Rt as createColumnMapService,
  Tn as createCoordinateMapping,
  Jt as createDrumManager,
  Bn as createEngineController,
  hn as createFeedbackCollector,
  Rn as createLessonMode,
  bt as createModulationMarker,
  Hn as createNoteHighwayService,
  Un as createSimpleTimeMap,
  Bt as createStore,
  Ln as createSynthEngine,
  Ht as createTimeMapCalculator,
  _n as createTransportService,
  j as fullRowData,
  On as getCanvasColumnWidths,
  xn as getColumnEntry,
  Ke as getColumnEntryByCanvas,
  En as getColumnType,
  Wn as getContextInfo,
  St as getInitialState,
  Dn as getMacrobeatBoundary,
  Cn as getModulationColor,
  yn as getModulationDisplayText,
  Ze as getPerVoiceBaselineGain,
  Sn as getPitchByIndex,
  gn as getPitchByToneNote,
  _e as getPitchIndex,
  _t as getTimeBoundaryAfterMacrobeat,
  Fn as getTotalCanvasWidth,
  Pn as isPlayableColumn,
  qn as renderDrumGrid,
  $n as renderPitchGrid,
  ct as resolvePitchRange,
  Mn as secondsToCanvasX,
  Gn as setVoiceLogger,
  In as timeToCanvas,
  Lt as timeToVisual,
  bn as visualToCanvas,
  Gt as visualToTime
};
//# sourceMappingURL=index.js.map
