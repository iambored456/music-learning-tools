var at = Object.defineProperty;
var rt = (t, e, i) => e in t ? at(t, e, { enumerable: !0, configurable: !0, writable: !0, value: i }) : t[e] = i;
var V = (t, e, i) => rt(t, typeof e != "symbol" ? e + "" : e, i);
import * as w from "tone";
const z = [
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
z.forEach((t, e) => {
  fe.set(t.toneNote, e), t.midi !== void 0 && lt.set(t.midi, e);
});
function gn(t) {
  const e = fe.get(t);
  return e !== void 0 ? z[e] : void 0;
}
function Sn(t) {
  return z[t];
}
function _e(t) {
  return fe.get(t) ?? -1;
}
function ct(t, e) {
  const i = _e(t), g = _e(e);
  return i === -1 || g === -1 ? null : {
    topIndex: Math.min(i, g),
    bottomIndex: Math.max(i, g)
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
  return t.forEach((i) => {
    const g = new Float32Array(32);
    g[0] = 1;
    const n = new Float32Array(32);
    e[i] = {
      name: "Sine",
      adsr: { ...dt },
      coeffs: g,
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
  const t = new Array(16).fill(2), e = t.slice(0, -1).map((i, g) => (g + 1) % 4 === 0 ? "solid" : "dashed");
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
    bottomIndex: Math.max(0, z.length - 1)
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
    fullRowData: [...z],
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
function ce(t, e) {
  if (typeof t.row != "number") return;
  const i = e.length > 0 ? e.length - 1 : -1;
  if (i < 0) return;
  const g = typeof t.globalRow == "number" ? t.globalRow : t.row, n = Math.max(0, Math.min(i, Math.round(g)));
  t.globalRow = n, t.row = n;
}
function de() {
  return `uuid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function yt(t = {}) {
  const {
    getMacrobeatInfo: e,
    getDegreeForNote: i,
    hasAccidental: g,
    log: n = () => {
    }
  } = t;
  return {
    /**
     * Adds a note to the state.
     * IMPORTANT: This function no longer records history. The calling function is responsible for that.
     */
    addNote(d) {
      const s = this.state.placedNotes.find(
        (p) => !p.isDrum && p.row === d.row && p.startColumnIndex === d.startColumnIndex && p.color === d.color
      );
      if (s) {
        if (this.state.degreeDisplayMode !== "off" && i && g) {
          const p = i(s, this.state);
          if (p && g(p))
            return s.enharmonicPreference = !s.enharmonicPreference, n("debug", "[ENHARMONIC] Toggled enharmonic preference for note", {
              noteUuid: s.uuid,
              currentDegree: p,
              enharmonicPreference: s.enharmonicPreference
            }), this.emit("notesChanged"), s;
        }
        return null;
      }
      const h = { ...d, uuid: de() };
      return Ve(h), ce(h, this.state.fullRowData), this.state.placedNotes.push(h), this.emit("notesChanged"), h;
    },
    updateNoteTail(d, s) {
      let h = s;
      d.shape === "circle" && (h = Math.max(d.startColumnIndex + 1, s)), d.endColumnIndex = h, this.emit("notesChanged");
    },
    updateMultipleNoteTails(d, s) {
      d.forEach((h) => {
        let p = s;
        h.shape === "circle" && (p = Math.max(h.startColumnIndex + 1, s)), h.endColumnIndex = p;
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
    updateNoteRow(d, s) {
      d.row = s, d.globalRow = s, this.emit("notesChanged");
    },
    updateMultipleNoteRows(d, s) {
      d.forEach((h, p) => {
        const a = s[p];
        a !== void 0 && (h.row = a, ce(h, this.state.fullRowData));
      }), this.emit("notesChanged");
    },
    updateNotePosition(d, s) {
      d.startColumnIndex = s, d.endColumnIndex = d.shape === "circle" ? s + 1 : s, this.emit("notesChanged");
    },
    updateMultipleNotePositions(d, s) {
      d.forEach((h) => {
        h.startColumnIndex = s, h.endColumnIndex = h.shape === "circle" ? s + 1 : s;
      }), this.emit("notesChanged");
    },
    removeNote(d) {
      const s = this.state.placedNotes.indexOf(d);
      s > -1 && (this.state.placedNotes.splice(s, 1), this.emit("notesChanged"));
    },
    removeMultipleNotes(d) {
      const s = new Set(d);
      this.state.placedNotes = this.state.placedNotes.filter((h) => !s.has(h)), this.emit("notesChanged");
    },
    eraseInPitchArea(d, s, h = 1, p = !0) {
      const a = d + h - 1, f = s - 1, l = s + 1;
      let r = !1;
      const S = this.state.placedNotes.length;
      return this.state.placedNotes = this.state.placedNotes.filter((o) => {
        if (o.isDrum) return !0;
        if (o.shape === "circle") {
          const u = o.startColumnIndex + 1, v = typeof o.endColumnIndex == "number" ? Math.max(u, o.endColumnIndex) : u, I = o.startColumnIndex <= a && v >= d, c = o.row >= f && o.row <= l;
          if (I && c)
            return !1;
        } else if (o.row >= f && o.row <= l && o.startColumnIndex <= a && o.endColumnIndex >= d)
          return !1;
        return !0;
      }), this.state.placedNotes.length < S && (r = !0), r && (this.emit("notesChanged"), p && this.recordState()), r;
    },
    addTonicSignGroup(d) {
      n("debug", "Starting addTonicSignGroup", { tonicSignGroup: d });
      const s = d[0];
      if (!s) return;
      const { preMacrobeatIndex: h } = s;
      if (n("debug", "preMacrobeatIndex", { preMacrobeatIndex: h }), Object.entries(this.state.tonicSignGroups).find(
        ([, S]) => S.some((o) => o.preMacrobeatIndex === h)
      )) {
        n("debug", "Existing tonic already present for measure, skipping", { preMacrobeatIndex: h });
        return;
      }
      if (!e) {
        n("error", "getMacrobeatInfo callback not provided");
        return;
      }
      const a = e(this.state, h + 1).startColumn;
      n("debug", "Boundary column (canvas-space) for shifting notes", { boundaryColumn: a });
      const f = this.state.placedNotes.filter((S) => S.startColumnIndex >= a);
      n("debug", "Notes that will be shifted", {
        noteRanges: f.map((S) => `${S.startColumnIndex}-${S.endColumnIndex}`)
      }), this.state.placedNotes.forEach((S) => {
        if (S.startColumnIndex >= a) {
          const o = S.startColumnIndex, u = S.endColumnIndex;
          S.startColumnIndex = S.startColumnIndex + 2, S.endColumnIndex = S.endColumnIndex + 2, n("debug", `Shifted note from ${o}-${u} to ${S.startColumnIndex}-${S.endColumnIndex}`);
        }
      });
      const l = de(), r = d.map((S) => ({
        ...S,
        uuid: l,
        globalRow: typeof S.globalRow == "number" ? S.globalRow : S.row
      }));
      this.state.tonicSignGroups[l] = r, n("debug", "Added tonic group", { uuid: l, columns: r.map((S) => S.columnIndex) }), n("debug", "Emitting events: notesChanged, rhythmStructureChanged"), this.emit("notesChanged"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    /**
     * Erases tonic sign at the specified column index (canvas-space)
     */
    eraseTonicSignAt(d, s = !0) {
      const h = Object.entries(this.state.tonicSignGroups).find(
        ([, S]) => S.some((o) => o.columnIndex === d)
      );
      if (!h)
        return !1;
      if (!e)
        return n("error", "getMacrobeatInfo callback not provided"), !1;
      const [p, a] = h, f = a[0];
      if (!f) return !1;
      const l = f.preMacrobeatIndex, r = e(this.state, l + 1).startColumn;
      return delete this.state.tonicSignGroups[p], this.state.placedNotes.forEach((S) => {
        S.startColumnIndex >= r && (S.startColumnIndex = S.startColumnIndex - 2, S.endColumnIndex = S.endColumnIndex - 2);
      }), this.emit("notesChanged"), this.emit("rhythmStructureChanged"), s && this.recordState(), !0;
    },
    clearAllNotes() {
      this.state.placedNotes = [], this.state.tonicSignGroups = {}, this.emit("notesChanged"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    loadNotes(d) {
      const s = (d || []).map((h) => {
        const p = {
          ...h,
          uuid: (h == null ? void 0 : h.uuid) ?? de()
        };
        return Ve(p), ce(p, this.state.fullRowData), p;
      });
      this.state.placedNotes = s, this.emit("notesChanged"), this.recordState();
    }
  };
}
function Ct() {
  return `sixteenth-stamp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function Tt(t = {}) {
  const {
    getPlacedTonicSigns: e,
    isWithinTonicSpan: i,
    log: g = () => {
    }
  } = t;
  return {
    /**
     * Adds a stamp placement to the state
     * @param startColumn Canvas-space column index (0 = first musical beat)
     * @returns The placement if successful, null if blocked by tonic column
     */
    addSixteenthStampPlacement(n, d, s, h = "#4a90e2") {
      const p = d + 2;
      if (e && i) {
        const r = e(this.state);
        (i(d, r) || i(d + 1, r)) && g("debug", "Cannot place sixteenth stamp - overlaps tonic column", {
          sixteenthStampId: n,
          startColumn: d,
          row: s
        });
      }
      const a = this.state.sixteenthStampPlacements.find(
        (r) => r.row === s && r.startColumn < p && r.endColumn > d
      );
      a && this.removeSixteenthStampPlacement(a.id);
      const f = s, l = {
        id: Ct(),
        sixteenthStampId: n,
        startColumn: d,
        endColumn: p,
        row: s,
        globalRow: f,
        color: h,
        timestamp: Date.now(),
        shapeOffsets: {}
      };
      return this.state.sixteenthStampPlacements.push(l), this.emit("sixteenthStampPlacementsChanged"), g("debug", `Added sixteenth stamp ${n} at canvas-space ${d}-${p},${s}`, {
        sixteenthStampId: n,
        startColumn: d,
        endColumn: p,
        row: s,
        placementId: l.id
      }), l;
    },
    /**
     * Removes a stamp placement by ID
     */
    removeSixteenthStampPlacement(n) {
      const d = this.state.sixteenthStampPlacements.findIndex((h) => h.id === n);
      if (d === -1) return !1;
      const s = this.state.sixteenthStampPlacements.splice(d, 1)[0];
      return s ? (this.emit("sixteenthStampPlacementsChanged"), g("debug", `Removed sixteenth stamp ${s.sixteenthStampId} at ${s.startColumn}-${s.endColumn},${s.row}`, {
        placementId: n,
        sixteenthStampId: s.sixteenthStampId,
        startColumn: s.startColumn,
        endColumn: s.endColumn,
        row: s.row
      }), !0) : !1;
    },
    /**
     * Removes stamps that intersect with an eraser area
     * @param eraseStartCol Canvas-space column index
     * @param eraseEndCol Canvas-space column index
     */
    eraseSixteenthStampsInArea(n, d, s, h) {
      const p = [];
      for (const f of this.state.sixteenthStampPlacements) {
        const l = f.startColumn <= d && f.endColumn >= n, r = f.row >= s && f.row <= h;
        l && r && p.push(f.id);
      }
      let a = !1;
      return p.forEach((f) => {
        this.removeSixteenthStampPlacement(f) && (a = !0);
      }), a;
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
    getSixteenthStampAt(n, d) {
      return this.state.sixteenthStampPlacements.find(
        (s) => s.row === d && n >= s.startColumn && n < s.endColumn
      ) || null;
    },
    /**
     * Clears all stamp placements
     */
    clearAllSixteenthStamps() {
      const n = this.state.sixteenthStampPlacements.length > 0;
      this.state.sixteenthStampPlacements = [], n && (this.emit("sixteenthStampPlacementsChanged"), g("info", "Cleared all sixteenth stamp placements"));
    },
    /**
     * Gets stamp placements for playback scheduling
     */
    getSixteenthStampPlaybackData() {
      return this.state.sixteenthStampPlacements.map((n) => {
        const d = this.state.fullRowData[n.row];
        return {
          sixteenthStampId: n.sixteenthStampId,
          column: n.startColumn,
          startColumn: n.startColumn,
          endColumn: n.endColumn,
          row: n.row,
          pitch: (d == null ? void 0 : d.toneNote) || "",
          color: n.color,
          placement: n
          // Include full placement object with shapeOffsets
        };
      }).filter((n) => n.pitch);
    },
    /**
     * Updates the pitch offset for an individual shape within a stamp
     */
    updateSixteenthStampShapeOffset(n, d, s) {
      const h = this.state.sixteenthStampPlacements.find((p) => p.id === n);
      if (!h) {
        g("warn", "[SIXTEENTH STAMP SHAPE OFFSET] Placement not found", { placementId: n });
        return;
      }
      h.shapeOffsets || (h.shapeOffsets = {}), g("debug", "[SIXTEENTH STAMP SHAPE OFFSET] Updating shape offset", {
        placementId: n,
        shapeKey: d,
        oldOffset: h.shapeOffsets[d] || 0,
        newOffset: s,
        baseRow: h.row,
        targetRow: h.row + s
      }), h.shapeOffsets[d] = s, this.emit("sixteenthStampPlacementsChanged");
    },
    /**
     * Gets the effective row for a specific shape within a stamp
     */
    getSixteenthStampShapeRow(n, d) {
      var h;
      const s = ((h = n.shapeOffsets) == null ? void 0 : h[d]) || 0;
      return n.row + s;
    }
  };
}
function Nt() {
  return `triplet-stamp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function At(t = {}) {
  const {
    canvasToTime: e,
    timeToCanvas: i,
    getColumnMap: g,
    log: n = () => {
    }
  } = t;
  return {
    /**
     * Adds a triplet placement to the state
     * @param placement - The triplet placement object
     * @returns The placed triplet or null if invalid
     */
    addTripletStampPlacement(d) {
      this.state.tripletStampPlacements || (this.state.tripletStampPlacements = []);
      const s = d.startTimeIndex + d.span * 2, h = this.state.tripletStampPlacements.find((a) => a.row !== d.row ? !1 : !(a.startTimeIndex + a.span * 2 <= d.startTimeIndex || s <= a.startTimeIndex));
      if (h && this.removeTripletStampPlacement(h.id), this.state.sixteenthStampPlacements && e && g) {
        const a = g(this.state);
        this.state.sixteenthStampPlacements.filter((l) => {
          if (l.row !== d.row) return !1;
          const r = e(l.startColumn, a);
          return r === null ? !0 : !(r + 2 <= d.startTimeIndex || r >= s);
        }).forEach((l) => {
          this.removeSixteenthStampPlacement && this.removeSixteenthStampPlacement(l.id);
        });
      }
      const p = {
        id: Nt(),
        ...d,
        shapeOffsets: d.shapeOffsets || {}
      };
      return this.state.tripletStampPlacements.push(p), this.emit("tripletStampPlacementsChanged"), this.emit("rhythmStructureChanged"), n("debug", `Added triplet stamp ${d.tripletStampId} at time ${d.startTimeIndex}, row ${d.row}`, {
        tripletStampId: d.tripletStampId,
        startTimeIndex: d.startTimeIndex,
        span: d.span,
        row: d.row,
        placementId: p.id
      }), p;
    },
    /**
     * Removes a triplet placement by ID
     * @param placementId - The placement ID to remove
     * @returns True if a triplet was removed
     */
    removeTripletStampPlacement(d) {
      if (!this.state.tripletStampPlacements) return !1;
      const s = this.state.tripletStampPlacements.findIndex((p) => p.id === d);
      if (s === -1) return !1;
      const h = this.state.tripletStampPlacements.splice(s, 1)[0];
      return h ? (this.emit("tripletStampPlacementsChanged"), n("debug", `Removed triplet stamp ${h.tripletStampId} at time ${h.startTimeIndex}, row ${h.row}`, {
        placementId: d,
        tripletStampId: h.tripletStampId,
        startTimeIndex: h.startTimeIndex,
        span: h.span,
        row: h.row
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
    eraseTripletStampsInArea(d, s, h, p) {
      if (!this.state.tripletStampPlacements || !i || !g) return !1;
      const a = g(this.state), f = [];
      for (const r of this.state.tripletStampPlacements)
        if (r.row >= h && r.row <= p) {
          const S = r.span * 2, o = i(r.startTimeIndex, a);
          o + S - 1 < d || o > s || f.push(r.id);
        }
      let l = !1;
      return f.forEach((r) => {
        this.removeTripletStampPlacement(r) && (l = !0);
      }), l;
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
    getTripletStampAt(d, s) {
      return this.state.tripletStampPlacements && this.state.tripletStampPlacements.find(
        (h) => h.row === s && d >= h.startTimeIndex && d < h.startTimeIndex + h.span * 2
      ) || null;
    },
    /**
     * Clears all triplet placements
     */
    clearAllTripletStamps() {
      if (!this.state.tripletStampPlacements) return;
      const d = this.state.tripletStampPlacements.length > 0;
      this.state.tripletStampPlacements = [], d && (this.emit("tripletStampPlacementsChanged"), n("info", "Cleared all triplet stamp placements"));
    },
    /**
     * Gets triplet placements for playback scheduling
     * @returns Array of playback data for triplets
     */
    getTripletStampPlaybackData() {
      return this.state.tripletStampPlacements ? this.state.tripletStampPlacements.map((d) => {
        const s = this.state.fullRowData[d.row];
        return {
          startTimeIndex: d.startTimeIndex,
          tripletStampId: d.tripletStampId,
          row: d.row,
          pitch: (s == null ? void 0 : s.toneNote) ?? "",
          color: d.color,
          span: d.span,
          placement: d
          // Include full placement object with shapeOffsets
        };
      }).filter((d) => d.pitch) : [];
    },
    /**
     * Updates the pitch offset for an individual shape within a triplet group
     * @param placementId - The triplet placement ID
     * @param shapeKey - The shape identifier (e.g., "triplet_0", "triplet_1", "triplet_2")
     * @param rowOffset - The pitch offset in rows (can be negative)
     */
    updateTripletStampShapeOffset(d, s, h) {
      var a;
      const p = (a = this.state.tripletStampPlacements) == null ? void 0 : a.find((f) => f.id === d);
      if (!p) {
        n("warn", "[TRIPLET STAMP SHAPE OFFSET] Placement not found", { placementId: d });
        return;
      }
      p.shapeOffsets || (p.shapeOffsets = {}), n("debug", "[TRIPLET STAMP SHAPE OFFSET] Updating shape offset", {
        placementId: d,
        shapeKey: s,
        oldOffset: p.shapeOffsets[s] || 0,
        newOffset: h,
        baseRow: p.row,
        targetRow: p.row + h
      }), p.shapeOffsets[s] = h, this.emit("tripletStampPlacementsChanged");
    },
    /**
     * Gets the effective row for a specific shape within a triplet group
     * @param placement - The triplet placement object
     * @param shapeKey - The shape identifier
     * @returns The effective row index
     */
    getTripletStampShapeRow(d, s) {
      var p;
      const h = ((p = d.shapeOffsets) == null ? void 0 : p[s]) || 0;
      return d.row + h;
    }
  };
}
const K = {
  COMPRESSION_2_3: 2 / 3,
  // 0.6666666667
  EXPANSION_3_2: 3 / 2
  // 1.5
};
function bt(t, e, i) {
  const { getMacrobeatInfo: g, log: n = () => {
  } } = i;
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
  if (!g)
    return n("warn", "[MODULATION] getMacrobeatInfo callback not provided"), t * 4;
  const d = t - 1;
  n("debug", `[MODULATION] Converting measureIndex ${t} to macrobeatIndex: ${d}`);
  const s = g(e, d);
  if (n("debug", "[MODULATION] getMacrobeatInfo result", s), s) {
    const p = s.endColumn + 1;
    return n("debug", `[MODULATION] Found measure info, canvas-space endColumn: ${s.endColumn}, first column after: ${p}`), p;
  }
  n("warn", `[MODULATION] Could not find measure info for index: ${t}`);
  const h = t * 4;
  return n("debug", "[MODULATION] Using improved fallback calculation", h), h;
}
function Mt(t, e, i = null, g = null, n = null) {
  return {
    id: `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    measureIndex: t,
    ratio: e,
    active: !0,
    xPosition: i,
    // Store the actual boundary position if provided
    columnIndex: g,
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
function $e() {
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
function Tn(t, e, i = null, g = {}) {
  const { log: n = () => {
  } } = g;
  if (!t || t.length === 0)
    return $e();
  const d = [...t.filter((l) => l.active)].sort((l, r) => l.measureIndex - r.measureIndex);
  if (d.length === 0)
    return $e();
  n("debug", "[MODULATION] Creating coordinate mapping for markers", d);
  const s = d.map((l) => {
    const r = bt(l.measureIndex, i, g);
    return n("debug", `[MODULATION] Marker at measure ${l.measureIndex} calculated column=${r}`), n("debug", "[MODULATION] Full marker data", l), n("debug", "[MODULATION] Final marker position", {
      id: l.id,
      measureIndex: l.measureIndex,
      columnIndex: r
    }), {
      ...l,
      columnIndex: r
    };
  }), h = [];
  let p = 1;
  const a = s[0];
  if (s.length === 0 || a && a.columnIndex > 0) {
    const l = a ? a.columnIndex : 1 / 0;
    h.push({
      startColumn: 0,
      endColumn: l,
      scale: 1
    });
  }
  for (let l = 0; l < s.length; l++) {
    const r = s[l], S = s[l + 1], o = S ? S.columnIndex : 1 / 0;
    p *= r.ratio, h.push({
      startColumn: r.columnIndex,
      // Canvas-space
      endColumn: o,
      // Canvas-space
      scale: p,
      marker: r
    });
  }
  return {
    segments: h,
    /**
     * Gets the modulation scale for a given column index
     * @param columnIndex - Column index in musical space
     * @returns Scale factor (1.0 = no modulation, 0.667 = compressed, 1.5 = expanded)
     */
    getScaleForColumn(l) {
      for (const r of h)
        if (l >= r.startColumn && l < r.endColumn)
          return r.scale;
      return 1;
    },
    /**
     * Converts microbeat index to canvas x position
     * NOTE: This method is deprecated - getColumnX in rendererUtils now handles modulation directly
     */
    microbeatToCanvasX(l) {
      return 0;
    },
    /**
     * Converts canvas x position to microbeat index
     * NOTE: This method is deprecated - coordinate conversion now handled by getColumnFromX
     */
    canvasXToMicrobeat(l) {
      return 0;
    },
    /**
     * Gets the segment containing a given canvas x position
     * NOTE: This method is deprecated - not used in new column-based approach
     */
    getSegmentAtX(l) {
      return h[0] || null;
    },
    /**
     * Gets all ghost grid positions for a segment
     * NOTE: This method is deprecated - ghost grid now handled differently
     */
    getGhostGridPositions(l, r) {
      return [];
    }
  };
}
function Nn(t, e) {
  if (t >= 0 && t < e.length) {
    const i = e[t];
    if (i !== void 0)
      return i;
  }
  return t * 0.333;
}
function An(t, e, i) {
  return 0;
}
function bn(t, e, i) {
  return 0;
}
const We = new Array(19).fill(2), vt = [
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
  const i = e(t), g = /* @__PURE__ */ new Map();
  i.entries.forEach((n) => {
    n.type === "tonic" && n.tonicSignUuid && typeof n.canvasIndex == "number" && g.set(n.tonicSignUuid, n.canvasIndex);
  }), Object.entries(t.tonicSignGroups || {}).forEach(([n, d]) => {
    const s = g.get(n);
    s !== void 0 && d.forEach((h) => {
      h.columnIndex = s;
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
    visualToTimeIndex: i = () => null,
    timeIndexToVisualColumn: g = () => null,
    getTimeBoundaryAfterMacrobeat: n = () => 0,
    log: d = () => {
    }
  } = t;
  return {
    setAnacrusis(s) {
      var o, u, v;
      if (this.state.hasAnacrusis === s)
        return;
      const h = [...this.state.macrobeatGroupings], p = [...this.state.macrobeatBoundaryStyles], a = h.reduce((I, c) => I + c, 0);
      let f, l;
      if (s) {
        const I = this._anacrusisCache, c = We.length - qe.length, N = We.slice(0, c), A = vt.slice(0, c), C = (o = I == null ? void 0 : I.groupings) != null && o.length ? [...I.groupings] : [...N], m = (u = I == null ? void 0 : I.boundaryStyles) != null && u.length ? [...I.boundaryStyles] : [...A];
        if (f = [...C, ...h], l = [...m, ...p], !((v = I == null ? void 0 : I.boundaryStyles) != null && v.length))
          for (let y = 0; y < m.length; y++)
            l[y] = y < m.length - 1 ? "anacrusis" : "solid";
        this._anacrusisCache = null, d("debug", "rhythmActions", "Enabled anacrusis", {
          insertedCount: C.length,
          insertedColumns: C.reduce((y, b) => y + b, 0)
        }, "state");
      } else {
        const I = p.findIndex((C) => C === "solid");
        let c = 0;
        if (I !== -1)
          c = I + 1;
        else
          for (; c < p.length && p[c] === "anacrusis"; )
            c++;
        c = Math.min(c, h.length);
        const N = h.slice(0, c), A = p.slice(0, c);
        c > 0 ? this._anacrusisCache = {
          groupings: N,
          boundaryStyles: A
        } : this._anacrusisCache = null, f = h.slice(c), l = p.slice(c).map((C) => C === "anacrusis" ? "dashed" : C), f.length === 0 && (f = [...qe], l = [...wt]), d("debug", "rhythmActions", "Disabled anacrusis", {
          removalCount: c,
          removedColumns: N.reduce((C, m) => C + m, 0)
        }, "state");
      }
      const S = f.reduce((I, c) => I + c, 0) - a;
      if (this.state.hasAnacrusis = s, this.state.macrobeatGroupings = [...f], this.state.macrobeatBoundaryStyles = [...l], He(this.state, e), S !== 0) {
        const I = [];
        this.state.placedNotes.forEach((m) => {
          const y = i(this.state, m.startColumnIndex, h), b = i(this.state, m.endColumnIndex, h);
          if (y === null || b === null)
            return;
          const x = y + S, O = b + S;
          if (x < 0) {
            I.push(m);
            return;
          }
          const T = g(this.state, x, f), M = g(this.state, O, f);
          if (T === null || M === null) {
            I.push(m);
            return;
          }
          m.startColumnIndex = T, m.endColumnIndex = M;
        }), I.forEach((m) => {
          const y = this.state.placedNotes.indexOf(m);
          y > -1 && this.state.placedNotes.splice(y, 1);
        });
        const c = [];
        this.state.sixteenthStampPlacements.forEach((m) => {
          const y = i(this.state, m.startColumn, h), b = i(this.state, m.endColumn, h);
          if (y === null || b === null)
            return;
          const x = y + S, O = b + S;
          if (x < 0) {
            c.push(m);
            return;
          }
          const T = g(this.state, x, f), M = g(this.state, O, f);
          if (T === null || M === null) {
            c.push(m);
            return;
          }
          m.startColumn = T, m.endColumn = M;
        }), c.forEach((m) => {
          const y = this.state.sixteenthStampPlacements.indexOf(m);
          y > -1 && this.state.sixteenthStampPlacements.splice(y, 1);
        });
        const N = [];
        this.state.tripletStampPlacements && (this.state.tripletStampPlacements.forEach((m) => {
          const y = m.startTimeIndex + S;
          y < 0 ? N.push(m) : m.startTimeIndex = y;
        }), N.forEach((m) => {
          const y = this.state.tripletStampPlacements.indexOf(m);
          y > -1 && this.state.tripletStampPlacements.splice(y, 1);
        }));
        const A = [], C = s ? f.length - h.length : -(h.length - f.length);
        this.state.tempoModulationMarkers.forEach((m) => {
          const y = m.measureIndex + C;
          if (y < 0) {
            A.push(m);
            return;
          }
          m.measureIndex = y, m.columnIndex = null, m.xPosition = null, m.macrobeatIndex = null;
        }), A.forEach((m) => {
          const y = this.state.tempoModulationMarkers.indexOf(m);
          y > -1 && this.state.tempoModulationMarkers.splice(y, 1);
        });
      }
      this.emit("anacrusisChanged", s), this.emit("notesChanged"), this.emit("sixteenthStampPlacementsChanged"), this.emit("tripletStampPlacementsChanged"), this.emit("tempoModulationMarkersChanged"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    toggleMacrobeatGrouping(s) {
      if (s === void 0 || s < 0 || s >= this.state.macrobeatGroupings.length) {
        d("error", "rhythmActions", `Invalid index for toggleMacrobeatGrouping: ${s}`, null, "state");
        return;
      }
      const h = [...this.state.macrobeatGroupings], p = h[s], a = p === 2 ? 3 : 2, f = a - p, l = [...h];
      l[s] = a;
      const r = n(this.state, s, h), S = [];
      this.state.placedNotes.forEach((o) => {
        const u = i(this.state, o.startColumnIndex, h), v = i(this.state, o.endColumnIndex, h);
        if (!(u === null || v === null) && u >= r) {
          const I = u + f, c = v + f, N = g(this.state, I, l), A = g(this.state, c, l);
          N !== null && A !== null ? (o.startColumnIndex = N, o.endColumnIndex = A) : S.push(o);
        }
      }), S.length && S.forEach((o) => {
        const u = this.state.placedNotes.indexOf(o);
        u > -1 && this.state.placedNotes.splice(u, 1);
      }), this.state.macrobeatGroupings = l, He(this.state, e), this.emit("notesChanged"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    cycleMacrobeatBoundaryStyle(s) {
      if (s === void 0 || s < 0 || s >= this.state.macrobeatBoundaryStyles.length) {
        d("error", "rhythmActions", `Invalid index for cycleMacrobeatBoundaryStyle: ${s}`, null, "state");
        return;
      }
      const h = this._isBoundaryInAnacrusis(s);
      let p;
      h ? p = ["dashed", "solid", "anacrusis"] : p = ["dashed", "solid"];
      const a = this.state.macrobeatBoundaryStyles[s] ?? "dashed", f = p.indexOf(a), l = f === -1 ? 0 : (f + 1) % p.length, r = p[l] ?? "dashed";
      this.state.macrobeatBoundaryStyles[s] = r, this.emit("rhythmStructureChanged"), this.recordState();
    },
    _isBoundaryInAnacrusis(s) {
      if (!this.state.hasAnacrusis)
        return !1;
      for (let h = 0; h <= s; h++)
        if (this.state.macrobeatBoundaryStyles[h] === "solid")
          return h === s;
      return !0;
    },
    increaseMacrobeatCount() {
      this.state.macrobeatGroupings.push(2), this.state.macrobeatBoundaryStyles.push("dashed"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    decreaseMacrobeatCount() {
      if (this.state.macrobeatGroupings.length > 1) {
        const s = this.state.macrobeatGroupings.length - 1, h = n(
          this.state,
          s - 1,
          this.state.macrobeatGroupings
        ), p = [];
        this.state.placedNotes.forEach((l) => {
          const r = i(this.state, l.startColumnIndex, this.state.macrobeatGroupings);
          r !== null && r >= h && p.push(l);
        }), p.forEach((l) => {
          const r = this.state.placedNotes.indexOf(l);
          r > -1 && this.state.placedNotes.splice(r, 1);
        });
        const a = [];
        this.state.sixteenthStampPlacements.forEach((l) => {
          const r = i(this.state, l.startColumn, this.state.macrobeatGroupings);
          r !== null && r >= h && a.push(l);
        }), a.forEach((l) => {
          const r = this.state.sixteenthStampPlacements.indexOf(l);
          r > -1 && this.state.sixteenthStampPlacements.splice(r, 1);
        });
        const f = [];
        this.state.tripletStampPlacements && (this.state.tripletStampPlacements.forEach((l) => {
          l.startTimeIndex >= h && f.push(l);
        }), f.forEach((l) => {
          const r = this.state.tripletStampPlacements.indexOf(l);
          r > -1 && this.state.tripletStampPlacements.splice(r, 1);
        })), this.state.macrobeatGroupings.pop(), this.state.macrobeatBoundaryStyles.pop(), p.length > 0 && this.emit("notesChanged"), a.length > 0 && this.emit("sixteenthStampPlacementsChanged"), f.length > 0 && this.emit("tripletStampPlacementsChanged"), this.emit("rhythmStructureChanged"), this.recordState();
      }
    },
    updateTimeSignature(s, h) {
      if (!Array.isArray(h) || h.length === 0) {
        d("error", "rhythmActions", "Invalid groupings provided to updateTimeSignature", null, "state");
        return;
      }
      let p = 0, a = 0, f = 0;
      for (let N = 0; N < this.state.macrobeatGroupings.length; N++) {
        if (f === s) {
          p = N;
          break;
        }
        const A = N === this.state.macrobeatGroupings.length - 1;
        (this.state.macrobeatBoundaryStyles[N] === "solid" || A) && f++;
      }
      f = 0;
      for (let N = 0; N < this.state.macrobeatGroupings.length; N++)
        if (f === s) {
          const A = N === this.state.macrobeatGroupings.length - 1;
          if (this.state.macrobeatBoundaryStyles[N] === "solid" || A) {
            a = N;
            break;
          }
        } else if (f < s) {
          const A = N === this.state.macrobeatGroupings.length - 1;
          (this.state.macrobeatBoundaryStyles[N] === "solid" || A) && f++;
        }
      const l = a - p + 1, r = h.length, S = this.state.macrobeatGroupings.slice(p, a + 1).reduce((N, A) => N + A, 0), u = h.reduce((N, A) => N + A, 0) - S, v = n(this.state, a, this.state.macrobeatGroupings);
      if (u !== 0) {
        const N = (() => {
          const C = [...this.state.macrobeatGroupings];
          return C.splice(p, l, ...h), C;
        })(), A = [];
        this.state.placedNotes.forEach((C) => {
          const m = i(this.state, C.startColumnIndex, this.state.macrobeatGroupings), y = i(this.state, C.endColumnIndex, this.state.macrobeatGroupings);
          if (!(m === null || y === null) && m >= v) {
            const b = m + u, x = y + u, O = g(this.state, b, N), T = g(this.state, x, N);
            O !== null && T !== null ? (C.startColumnIndex = O, C.endColumnIndex = T) : A.push(C);
          }
        }), A.length && A.forEach((C) => {
          const m = this.state.placedNotes.indexOf(C);
          m > -1 && this.state.placedNotes.splice(m, 1);
        });
      }
      const I = [...h], c = new Array(Math.max(r - 1, 0)).fill("dashed");
      if (a < this.state.macrobeatBoundaryStyles.length) {
        const N = this.state.macrobeatBoundaryStyles[a] ?? "dashed";
        c.push(N);
      }
      this.state.macrobeatGroupings.splice(p, l, ...I), this.state.macrobeatBoundaryStyles.splice(p, l - 1, ...c), this.emit("notesChanged"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    addModulationMarker(s, h, p = null, a = null, f = null) {
      if (!Object.values(K).includes(h))
        return d("error", "rhythmActions", `Invalid modulation ratio: ${h}`, null, "state"), null;
      const l = this.state.tempoModulationMarkers.findIndex((S) => S.measureIndex === s || f !== null && S.macrobeatIndex === f || a !== null && S.columnIndex === a);
      if (l !== -1) {
        const S = this.state.tempoModulationMarkers[l];
        return d("info", "rhythmActions", `Replacing existing modulation marker ${S.id} at measure ${s} (old ratio: ${S.ratio}, new ratio: ${h})`, null, "state"), S.ratio = h, S.xPosition = p, a !== null && (S.columnIndex = a), f !== null && (S.macrobeatIndex = f), this.emit("tempoModulationMarkersChanged"), this.recordState(), S.id;
      }
      const r = Mt(s, h, p, a, f);
      return this.state.tempoModulationMarkers.push(r), this.state.tempoModulationMarkers.sort((S, o) => S.measureIndex - o.measureIndex), this.emit("tempoModulationMarkersChanged"), this.recordState(), d("info", "rhythmActions", `Added modulation marker ${r.id} at measure ${s} with ratio=${h}, columnIndex=${a}`, null, "state"), r.id;
    },
    removeModulationMarker(s) {
      const h = this.state.tempoModulationMarkers.findIndex((p) => p.id === s);
      if (h === -1) {
        d("warn", "rhythmActions", `Modulation marker not found: ${s}`, null, "state");
        return;
      }
      this.state.tempoModulationMarkers.splice(h, 1), this.emit("tempoModulationMarkersChanged"), this.recordState(), d("info", "rhythmActions", `Removed modulation marker ${s}`, null, "state");
    },
    setModulationRatio(s, h) {
      if (!Object.values(K).includes(h)) {
        d("error", "rhythmActions", `Invalid modulation ratio: ${h}`, null, "state");
        return;
      }
      const p = this.state.tempoModulationMarkers.find((a) => a.id === s);
      if (!p) {
        d("warn", "rhythmActions", `Modulation marker not found: ${s}`, null, "state");
        return;
      }
      p.ratio = h, this.emit("tempoModulationMarkersChanged"), this.recordState(), d("info", "rhythmActions", `Updated modulation marker ${s} ratio to ${h}`, null, "state");
    },
    moveModulationMarker(s, h) {
      const p = this.state.tempoModulationMarkers.find((a) => a.id === s);
      if (!p) {
        d("warn", "rhythmActions", `Modulation marker not found: ${s}`, null, "state");
        return;
      }
      p.measureIndex = h, this.state.tempoModulationMarkers.sort((a, f) => a.measureIndex - f.measureIndex), this.emit("tempoModulationMarkersChanged"), this.recordState(), d("info", "rhythmActions", `Moved modulation marker ${s} to measure ${h}`, null, "state");
    },
    toggleModulationMarker(s) {
      const h = this.state.tempoModulationMarkers.find((p) => p.id === s);
      if (!h) {
        d("warn", "rhythmActions", `Modulation marker not found: ${s}`, null, "state");
        return;
      }
      h.active = !h.active, this.emit("tempoModulationMarkersChanged"), this.recordState(), d("info", "rhythmActions", `Toggled modulation marker ${s} active state to ${h.active}`, null, "state");
    },
    clearModulationMarkers() {
      const s = this.state.tempoModulationMarkers.length;
      this.state.tempoModulationMarkers = [], this.emit("tempoModulationMarkersChanged"), this.recordState(), d("info", "rhythmActions", `Cleared ${s} modulation markers`, null, "state");
    }
  };
}
function Ue(t) {
  const e = JSON.parse(JSON.stringify(t));
  for (const i in e) {
    const g = e[i];
    g.coeffs && typeof g.coeffs == "object" && !Array.isArray(g.coeffs) ? g.coeffs = new Float32Array(Object.values(g.coeffs)) : Array.isArray(g.coeffs) && (g.coeffs = new Float32Array(g.coeffs)), g.phases && typeof g.phases == "object" && !Array.isArray(g.phases) ? g.phases = new Float32Array(Object.values(g.phases)) : Array.isArray(g.phases) && (g.phases = new Float32Array(g.phases));
  }
  return e;
}
const Pt = /* @__PURE__ */ new Set(["dashed", "solid", "anacrusis"]);
function Et(t) {
  return Array.isArray(t) && t.length > 0 && t.every((e) => e === 2 || e === 3);
}
function Ot(t, e) {
  return Array.isArray(t) && t.length === Math.max(e - 1, 0) && t.every((i) => Pt.has(i));
}
function Dt(t, e) {
  if (t)
    try {
      const i = t.getItem(e);
      if (i === null)
        return;
      const g = JSON.parse(i), n = g.macrobeatGroupings;
      if (!Et(n)) {
        t.removeItem(e);
        return;
      }
      if (!Ot(g.macrobeatBoundaryStyles, n.length)) {
        t.removeItem(e);
        return;
      }
      if (delete g.timbres, g.pitchRange) {
        const d = z.length, s = Math.max(0, d - 1), h = Math.max(0, Math.min(s, g.pitchRange.topIndex ?? 0)), p = Math.max(h, Math.min(s, g.pitchRange.bottomIndex ?? s));
        g.pitchRange = { topIndex: h, bottomIndex: p };
      }
      if ("playheadMode" in g) {
        const d = g.playheadMode;
        d !== "cursor" && d !== "microbeat" && d !== "macrobeat" && delete g.playheadMode;
      }
      return g.fullRowData = [...z], g;
    } catch {
      return;
    }
}
function Ft(t, e, i) {
  if (e)
    try {
      const g = JSON.parse(JSON.stringify({
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
      })), n = JSON.stringify(g);
      e.setItem(i, n);
    } catch {
    }
}
function Bt(t = {}) {
  const {
    storageKey: e = "studentNotationState",
    storage: i,
    initialState: g,
    onClearState: n,
    noteActionCallbacks: d = {},
    sixteenthStampActionCallbacks: s = {},
    tripletStampActionCallbacks: h = {},
    rhythmActionCallbacks: p = {}
  } = t, a = {}, f = Dt(i, e), l = !f, o = {
    state: {
      ...St(),
      ...f,
      ...g
    },
    isColdStart: l,
    on(u, v) {
      a[u] || (a[u] = []), a[u].push(v);
    },
    off(u, v) {
      if (a[u]) {
        const I = a[u].indexOf(v);
        I > -1 && a[u].splice(I, 1);
      }
    },
    emit(u, v) {
      a[u] && a[u].forEach((I) => {
        try {
          I(v);
        } catch (c) {
          console.error(`Error in listener for event "${u}"`, c);
        }
      });
    },
    dispose() {
      for (const u in a)
        delete a[u];
    },
    saveState() {
      Ft(o.state, i, e);
    },
    // ========== HISTORY ACTIONS ==========
    recordState() {
      o.state.history = o.state.history.slice(0, o.state.historyIndex + 1);
      const u = JSON.parse(JSON.stringify(o.state.timbres)), v = {
        notes: JSON.parse(JSON.stringify(o.state.placedNotes)),
        tonicSignGroups: JSON.parse(JSON.stringify(o.state.tonicSignGroups)),
        placedChords: JSON.parse(JSON.stringify(o.state.placedChords)),
        sixteenthStampPlacements: JSON.parse(JSON.stringify(o.state.sixteenthStampPlacements)),
        tripletStampPlacements: JSON.parse(JSON.stringify(o.state.tripletStampPlacements || [])),
        timbres: u,
        annotations: o.state.annotations ? JSON.parse(JSON.stringify(o.state.annotations)) : [],
        lassoSelection: JSON.parse(JSON.stringify(o.state.lassoSelection))
      };
      o.state.history.push(v), o.state.historyIndex++, o.emit("historyChanged"), o.saveState();
    },
    undo() {
      var u;
      if (o.state.historyIndex > 0) {
        o.state.historyIndex--;
        const v = o.state.history[o.state.historyIndex];
        if (!v) return;
        o.state.placedNotes = JSON.parse(JSON.stringify(v.notes)), o.state.tonicSignGroups = JSON.parse(JSON.stringify(v.tonicSignGroups)), o.state.sixteenthStampPlacements = JSON.parse(JSON.stringify(v.sixteenthStampPlacements || [])), o.state.tripletStampPlacements = JSON.parse(JSON.stringify(v.tripletStampPlacements || [])), o.state.timbres = Ue(v.timbres), o.state.annotations = v.annotations ? JSON.parse(JSON.stringify(v.annotations)) : [], o.emit("notesChanged"), o.emit("sixteenthStampPlacementsChanged"), o.emit("tripletStampPlacementsChanged"), o.emit("rhythmStructureChanged"), (u = o.state.selectedNote) != null && u.color && o.emit("timbreChanged", o.state.selectedNote.color), o.emit("annotationsChanged"), o.emit("historyChanged");
      }
    },
    redo() {
      var u;
      if (o.state.historyIndex < o.state.history.length - 1) {
        o.state.historyIndex++;
        const v = o.state.history[o.state.historyIndex];
        if (!v) return;
        o.state.placedNotes = JSON.parse(JSON.stringify(v.notes)), o.state.tonicSignGroups = JSON.parse(JSON.stringify(v.tonicSignGroups)), o.state.sixteenthStampPlacements = JSON.parse(JSON.stringify(v.sixteenthStampPlacements || [])), o.state.tripletStampPlacements = JSON.parse(JSON.stringify(v.tripletStampPlacements || [])), o.state.timbres = Ue(v.timbres), o.state.annotations = v.annotations ? JSON.parse(JSON.stringify(v.annotations)) : [], o.emit("notesChanged"), o.emit("sixteenthStampPlacementsChanged"), o.emit("tripletStampPlacementsChanged"), o.emit("rhythmStructureChanged"), (u = o.state.selectedNote) != null && u.color && o.emit("timbreChanged", o.state.selectedNote.color), o.emit("annotationsChanged"), o.emit("historyChanged");
      }
    },
    clearSavedState() {
      i && (i.removeItem(e), i.removeItem("effectDialValues")), n && n();
    },
    // ========== VIEW ACTIONS ==========
    setPlaybackState(u, v) {
      o.state.isPlaying = u, o.state.isPaused = v, o.emit("playbackStateChanged", { isPlaying: u, isPaused: v });
    },
    setLooping(u) {
      o.state.isLooping = u, o.emit("loopingChanged", u);
    },
    setTempo(u) {
      o.state.tempo = u, o.emit("tempoChanged", u);
    },
    setPlayheadMode(u) {
      o.state.playheadMode = u, o.emit("playheadModeChanged", u);
    },
    setSelectedTool(u, v) {
      const I = o.state.selectedTool;
      if (o.state.previousTool = I, o.state.selectedTool = u, v !== void 0) {
        const c = typeof v == "string" ? parseInt(v, 10) : v;
        isNaN(c) || (o.state.selectedToolTonicNumber = c);
      }
      o.emit("toolChanged", { newTool: u, oldTool: I });
    },
    setSelectedNote(u, v) {
      const I = { ...o.state.selectedNote };
      o.state.selectedNote = { shape: u, color: v }, o.emit("noteChanged", { newNote: o.state.selectedNote, oldNote: I });
    },
    setPitchRange(u) {
      o.state.pitchRange = { ...o.state.pitchRange, ...u }, o.emit("pitchRangeChanged", o.state.pitchRange);
    },
    setDegreeDisplayMode(u) {
      o.state.degreeDisplayMode = u, o.emit("degreeDisplayModeChanged", u);
    },
    setLongNoteStyle(u) {
      o.state.longNoteStyle = u, o.emit("longNoteStyleChanged", u);
    },
    toggleAccidentalMode(u) {
      o.state.accidentalMode[u] = !o.state.accidentalMode[u], o.emit("accidentalModeChanged", o.state.accidentalMode);
    },
    toggleFrequencyLabels() {
      o.state.showFrequencyLabels = !o.state.showFrequencyLabels, o.emit("frequencyLabelsChanged", o.state.showFrequencyLabels);
    },
    toggleOctaveLabels() {
      o.state.showOctaveLabels = !o.state.showOctaveLabels, o.emit("octaveLabelsChanged", o.state.showOctaveLabels);
    },
    toggleFocusColours() {
      o.state.focusColours = !o.state.focusColours, o.emit("focusColoursChanged", o.state.focusColours);
    },
    toggleWaveformExtendedView() {
      o.state.waveformExtendedView = !o.state.waveformExtendedView, o.emit("waveformExtendedViewChanged", o.state.waveformExtendedView);
    },
    setLayoutConfig(u) {
      u.cellWidth !== void 0 && (o.state.cellWidth = u.cellWidth), u.cellHeight !== void 0 && (o.state.cellHeight = u.cellHeight), u.columnWidths !== void 0 && (o.state.columnWidths = u.columnWidths), o.emit("layoutConfigChanged", u);
    },
    setDeviceProfile(u) {
      o.state.deviceProfile = { ...o.state.deviceProfile, ...u }, o.emit("deviceProfileChanged", o.state.deviceProfile);
    },
    setPrintPreviewActive(u) {
      o.state.isPrintPreviewActive = u, o.emit("printPreviewStateChanged", u);
    },
    setPrintOptions(u) {
      o.state.printOptions = { ...o.state.printOptions, ...u }, o.emit("printOptionsChanged", o.state.printOptions);
    },
    setAdsrTimeAxisScale(u) {
      o.state.adsrTimeAxisScale = u, o.emit("adsrTimeAxisScaleChanged", u);
    },
    setAdsrComponentWidth() {
    },
    shiftGridUp() {
    },
    shiftGridDown() {
    },
    setGridPosition() {
    },
    setKeySignature(u) {
      o.state.keySignature = u, o.emit("keySignatureChanged", u);
    },
    // ========== HARMONY ACTIONS ==========
    setActiveChordIntervals(u) {
      o.state.activeChordIntervals = u, o.emit("activeChordIntervalsChanged", u);
    },
    setIntervalsInversion(u) {
      o.state.isIntervalsInverted = u, o.emit("intervalsInversionChanged", u);
    },
    setChordPosition(u) {
      o.state.chordPositionState = u, o.emit("chordPositionChanged", u);
    },
    // ========== TIMBRE ACTIONS ==========
    setADSR(u, v) {
      o.state.timbres[u] && (o.state.timbres[u].adsr = { ...o.state.timbres[u].adsr, ...v }, o.emit("timbreChanged", u));
    },
    setHarmonicCoefficients(u, v) {
      o.state.timbres[u] && (o.state.timbres[u].coeffs = v, o.emit("timbreChanged", u));
    },
    setHarmonicPhases(u, v) {
      o.state.timbres[u] && (o.state.timbres[u].phases = v, o.emit("timbreChanged", u));
    },
    setFilterSettings(u, v) {
      o.state.timbres[u] && (o.state.timbres[u].filter = { ...o.state.timbres[u].filter, ...v }, o.emit("timbreChanged", u));
    },
    applyPreset(u, v) {
      o.state.timbres[u] && (Object.assign(o.state.timbres[u], v), o.emit("timbreChanged", u));
    },
    // ========== NOTE ACTIONS ==========
    // Extracted from note actions module
    ...yt(d),
    // ========== SIXTEENTH STAMP ACTIONS ==========
    // Extracted from sixteenth stamp actions module
    ...Tt(s),
    // ========== TRIPLET STAMP ACTIONS ==========
    // Extracted from triplet stamp actions module
    ...At(h),
    // ========== RHYTHM ACTIONS ==========
    // Extracted from rhythm actions module
    ...xt(p)
  };
  return i && (o.on("tempoChanged", () => o.saveState()), o.on("degreeDisplayModeChanged", () => o.saveState()), o.on("longNoteStyleChanged", () => o.saveState()), o.on("playheadModeChanged", () => o.saveState())), l && i && o.saveState(), o;
}
function Rt(t = {}) {
  const {
    getPlacedTonicSigns: e = () => [],
    sideColumnWidth: i = 0.25,
    beatColumnWidth: g = 1
  } = t;
  let n = null, d = null;
  function s(l) {
    const S = e(l).map((o) => `${o.columnIndex}:${o.preMacrobeatIndex}:${o.uuid || ""}`).sort().join("|");
    return {
      macrobeatGroupings: [...l.macrobeatGroupings],
      tonicSignsHash: S,
      macrobeatBoundaryStyles: [...l.macrobeatBoundaryStyles]
    };
  }
  function h(l) {
    return d ? d.tonicSignsHash === l.tonicSignsHash && JSON.stringify(d.macrobeatGroupings) === JSON.stringify(l.macrobeatGroupings) && JSON.stringify(d.macrobeatBoundaryStyles) === JSON.stringify(l.macrobeatBoundaryStyles) : !1;
  }
  function p(l) {
    const { macrobeatGroupings: r, macrobeatBoundaryStyles: S } = l, u = [...e(l)].sort((P, B) => P.preMacrobeatIndex - B.preMacrobeatIndex), v = [], I = [];
    let c = 0, N = 0, A = 0, C = 0, m = 0;
    const y = (P) => {
      var B;
      for (; m < u.length; ) {
        const L = u[m];
        if (!L || L.preMacrobeatIndex !== P) break;
        const R = L.uuid || "";
        for (let F = 0; F < 2; F++)
          v.push({
            visualIndex: c,
            canvasIndex: N,
            timeIndex: null,
            type: "tonic",
            widthMultiplier: g,
            xOffsetUnmodulated: C,
            macrobeatIndex: null,
            beatInMacrobeat: null,
            isMacrobeatStart: !1,
            isMacrobeatEnd: !1,
            isPlayable: !1,
            tonicSignUuid: F === 0 ? R : null
            // Only first column stores UUID
          }), c++, N++, C += g;
        const D = R;
        do
          m++;
        while (m < u.length && (((B = u[m]) == null ? void 0 : B.uuid) || "") === D);
      }
    };
    for (let P = 0; P < 2; P++)
      v.push({
        visualIndex: c,
        canvasIndex: null,
        timeIndex: null,
        type: "legend-left",
        widthMultiplier: i,
        xOffsetUnmodulated: C,
        macrobeatIndex: null,
        beatInMacrobeat: null,
        isMacrobeatStart: !1,
        isMacrobeatEnd: !1,
        isPlayable: !1,
        tonicSignUuid: null
      }), c++, C += i;
    y(-1), r.forEach((P, B) => {
      for (let R = 0; R < P; R++)
        v.push({
          visualIndex: c,
          canvasIndex: N,
          timeIndex: A,
          type: "beat",
          widthMultiplier: g,
          xOffsetUnmodulated: C,
          macrobeatIndex: B,
          beatInMacrobeat: R,
          isMacrobeatStart: R === 0,
          isMacrobeatEnd: R === P - 1,
          isPlayable: !0,
          tonicSignUuid: null
        }), c++, N++, A++, C += g;
      const L = S[B] || "dashed";
      I.push({
        macrobeatIndex: B,
        visualColumn: c - 1,
        canvasColumn: N - 1,
        timeColumn: A - 1,
        boundaryType: L,
        isMeasureStart: L === "solid"
      }), y(B);
    });
    for (let P = 0; P < 2; P++)
      v.push({
        visualIndex: c,
        canvasIndex: null,
        timeIndex: null,
        type: "legend-right",
        widthMultiplier: i,
        xOffsetUnmodulated: C,
        macrobeatIndex: null,
        beatInMacrobeat: null,
        isMacrobeatStart: !1,
        isMacrobeatEnd: !1,
        isPlayable: !1,
        tonicSignUuid: null
      }), c++, C += i;
    const b = /* @__PURE__ */ new Map(), x = /* @__PURE__ */ new Map(), O = /* @__PURE__ */ new Map(), T = /* @__PURE__ */ new Map(), M = /* @__PURE__ */ new Map(), E = /* @__PURE__ */ new Map();
    return v.forEach((P) => {
      b.set(P.visualIndex, P.canvasIndex), x.set(P.visualIndex, P.timeIndex), P.canvasIndex !== null && (O.set(P.canvasIndex, P.visualIndex), T.set(P.canvasIndex, P.timeIndex)), P.timeIndex !== null && (P.canvasIndex !== null && M.set(P.timeIndex, P.canvasIndex), E.set(P.timeIndex, P.visualIndex));
    }), {
      entries: v,
      visualToCanvas: b,
      visualToTime: x,
      canvasToVisual: O,
      canvasToTime: T,
      timeToCanvas: M,
      timeToVisual: E,
      macrobeatBoundaries: I,
      totalVisualColumns: c,
      totalCanvasColumns: N,
      totalTimeColumns: A,
      totalWidthUnmodulated: C
    };
  }
  function a(l) {
    const r = s(l);
    return n && h(r) || (n = p(l), d = r), n;
  }
  function f() {
    n = null, d = null;
  }
  return {
    getColumnMap: a,
    invalidate: f,
    buildColumnMap: p
  };
}
function Mn(t, e) {
  return e.visualToCanvas.get(t) ?? null;
}
function Gt(t, e) {
  return e.visualToTime.get(t) ?? null;
}
function vn(t, e) {
  const i = e.canvasToVisual.get(t);
  return i !== void 0 ? i : t + 2;
}
function wn(t, e) {
  return e.canvasToTime.get(t) ?? null;
}
function In(t, e) {
  const i = e.timeToCanvas.get(t);
  return i !== void 0 ? i : t;
}
function Lt(t, e) {
  const i = e.timeToVisual.get(t);
  return i !== void 0 ? i : t + 2;
}
function _t(t, e) {
  if (t == null) return 0;
  let i = 0;
  for (let g = 0; g <= t && g < e.length; g++) {
    const n = e[g];
    typeof n == "number" && (i += n);
  }
  return i;
}
function xn(t, e) {
  return e.entries[t] || null;
}
function Ke(t, e) {
  const i = e.canvasToVisual.get(t);
  return i !== void 0 && e.entries[i] || null;
}
function Pn(t, e) {
  const i = Ke(t, e);
  return (i == null ? void 0 : i.isPlayable) ?? !1;
}
function En(t, e) {
  const i = Ke(t, e);
  return (i == null ? void 0 : i.type) ?? null;
}
function On(t, e) {
  return e.macrobeatBoundaries.find((i) => i.macrobeatIndex === t) || null;
}
function Dn(t) {
  const e = [];
  for (const i of t.entries)
    i.canvasIndex !== null && (e[i.canvasIndex] = i.widthMultiplier);
  return e;
}
function Fn(t) {
  let e = 0;
  for (const i of t.entries)
    i.canvasIndex !== null && (e += i.widthMultiplier);
  return e;
}
function Bn() {
  let t = !1, e = null, i = null, g = null, n = null, d = !1;
  const s = (a, f, l, r, S) => {
    if (!d && a === "debug") return;
    const o = `[engine:${f}]`;
    console[a](o, l, r || "");
  }, h = (a, f, l) => {
    s(a, "controller", f, l);
  };
  return {
    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    init(a) {
      if (t) {
        s("warn", "controller", "Engine already initialized");
        return;
      }
      d = a.debug || !1, s("info", "controller", "Initializing engine"), g = a.pitchGridContext || null, n = a.drumGridContext || null, i = Rt({
        getPlacedTonicSigns: (l) => {
          if (!e) return [];
          const r = [];
          for (const S of Object.values(l.tonicSignGroups || {}))
            r.push(...S);
          return r;
        }
      });
      let f = a.storage;
      !f && typeof window < "u" && window.localStorage && (f = window.localStorage), e = Bt({
        storageKey: a.storageKey || "studentNotationState",
        storage: f,
        initialState: a.initialState,
        noteActionCallbacks: {
          log: h
        },
        rhythmActionCallbacks: {
          getColumnMap: (l) => i.getColumnMap(l),
          visualToTimeIndex: (l, r, S) => Gt(r, i.getColumnMap(l)),
          timeIndexToVisualColumn: (l, r, S) => Lt(r, i.getColumnMap(l)),
          getTimeBoundaryAfterMacrobeat: (l, r, S) => _t(r, S),
          log: h
        },
        sixteenthStampActionCallbacks: {
          log: h
        },
        tripletStampActionCallbacks: {
          canvasToTime: (l, r) => r.canvasToTime.get(l) ?? null,
          timeToCanvas: (l, r) => r.timeToCanvas.get(l) ?? 0,
          getColumnMap: (l) => i.getColumnMap(l),
          log: h
        }
      }), e.on("rhythmStructureChanged", () => {
        i == null || i.invalidate();
      }), e.on("notesChanged", () => {
        this.renderPitchGrid();
      }), e.on("sixteenthStampPlacementsChanged", () => {
        this.renderDrumGrid();
      }), e.on("tripletStampPlacementsChanged", () => {
        this.renderDrumGrid();
      }), t = !0, s("info", "controller", "Engine initialized successfully"), (g || n) && this.render();
    },
    dispose() {
      t && (s("info", "controller", "Disposing engine"), e && (e.dispose(), e = null), i = null, g = null, n = null, t = !1);
    },
    isInitialized() {
      return t;
    },
    // ============================================================================
    // TOOL SELECTION
    // ============================================================================
    setTool(a) {
      e && e.setSelectedTool(a);
    },
    getTool() {
      return (e == null ? void 0 : e.state.selectedTool) || "note";
    },
    setNoteShape(a) {
      if (!e) return;
      const f = e.state.selectedNote.color;
      e.setSelectedNote(a, f);
    },
    setNoteColor(a) {
      if (!e) return;
      const f = e.state.selectedNote.shape;
      e.setSelectedNote(f, a);
    },
    // ============================================================================
    // NOTE MANIPULATION
    // ============================================================================
    insertNote(a, f, l) {
      if (!e) return null;
      const r = {
        row: a,
        startColumnIndex: f,
        endColumnIndex: l ?? f,
        shape: e.state.selectedNote.shape,
        color: e.state.selectedNote.color
      };
      return e.addNote(r);
    },
    deleteNote(a) {
      if (!e) return !1;
      const f = e.state.placedNotes.find((l) => l.uuid === a);
      return f ? (e.removeNote(f), !0) : !1;
    },
    deleteSelection() {
      if (!e) return;
      const a = e.state.lassoSelection;
      if (!a.isActive || a.selectedItems.length === 0) return;
      const f = a.selectedItems.filter((l) => l.type === "note").map((l) => e.state.placedNotes.find((r) => r.uuid === l.id)).filter((l) => l !== void 0);
      f.length > 0 && e.removeMultipleNotes(f), this.clearSelection();
    },
    moveNote(a, f, l) {
      if (!e) return;
      const r = e.state.placedNotes.find((S) => S.uuid === a);
      r && (e.updateNoteRow(r, f), e.updateNotePosition(r, l));
    },
    setNoteTail(a, f) {
      if (!e) return;
      const l = e.state.placedNotes.find((r) => r.uuid === a);
      l && e.updateNoteTail(l, f);
    },
    clearAllNotes() {
      e && e.clearAllNotes();
    },
    // ============================================================================
    // SELECTION
    // ============================================================================
    setSelection(a) {
      if (!e) return;
      const f = a.map((l) => {
        if (l.type === "note") {
          const r = e.state.placedNotes.find((S) => S.uuid === l.id);
          return r ? { type: "note", id: l.id, data: r } : null;
        } else if (l.type === "sixteenthStamp") {
          const r = e.state.sixteenthStampPlacements.find((S) => S.id === l.id);
          return r ? { type: "sixteenthStamp", id: l.id, data: r } : null;
        } else if (l.type === "tripletStamp") {
          const r = e.state.tripletStampPlacements.find((S) => S.id === l.id);
          return r ? { type: "tripletStamp", id: l.id, data: r } : null;
        }
        return null;
      }).filter((l) => l !== null);
      e.state.lassoSelection = {
        isActive: f.length > 0,
        selectedItems: f,
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
      const a = e.state.placedNotes.map((f) => ({
        type: "note",
        id: f.uuid,
        data: f
      }));
      e.state.lassoSelection = {
        isActive: a.length > 0,
        selectedItems: a,
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
      e && (e.setPlaybackState(!0, !1), s("info", "playback", "Play started"));
    },
    pause() {
      e && (e.setPlaybackState(!0, !0), s("info", "playback", "Paused"));
    },
    resume() {
      e && (e.setPlaybackState(!0, !1), s("info", "playback", "Resumed"));
    },
    stop() {
      e && (e.setPlaybackState(!1, !1), s("info", "playback", "Stopped"));
    },
    isPlaying() {
      return (e == null ? void 0 : e.state.isPlaying) || !1;
    },
    isPaused() {
      return (e == null ? void 0 : e.state.isPaused) || !1;
    },
    setTempo(a) {
      e && e.setTempo(a);
    },
    getTempo() {
      return (e == null ? void 0 : e.state.tempo) || 120;
    },
    setLooping(a) {
      e && e.setLooping(a);
    },
    isLooping() {
      return (e == null ? void 0 : e.state.isLooping) || !1;
    },
    setPlayheadMode(a) {
      e && e.setPlayheadMode(a);
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
    setMacrobeatGrouping(a, f) {
      if (!e) return;
      e.state.macrobeatGroupings[a] !== f && e.toggleMacrobeatGrouping(a);
    },
    toggleAnacrusis() {
      e && e.setAnacrusis(!e.state.hasAnacrusis);
    },
    addModulationMarker(a, f) {
      return e ? e.addModulationMarker(a, f) : null;
    },
    removeModulationMarker(a) {
      e && e.removeModulationMarker(a);
    },
    // ============================================================================
    // VIEW
    // ============================================================================
    setPitchRange(a, f) {
      e && e.setPitchRange({ topIndex: a, bottomIndex: f });
    },
    getPitchRange() {
      return (e == null ? void 0 : e.state.pitchRange) || { topIndex: 0, bottomIndex: 87 };
    },
    setDegreeDisplayMode(a) {
      e && e.setDegreeDisplayMode(a);
    },
    setLongNoteStyle(a) {
      e && e.setLongNoteStyle(a);
    },
    // ============================================================================
    // TIMBRE
    // ============================================================================
    setTimbreADSR(a, f) {
      e && e.setADSR(a, f);
    },
    setTimbreHarmonics(a, f) {
      e && e.setHarmonicCoefficients(a, new Float32Array(f));
    },
    setTimbreFilter(a, f) {
      e && e.setFilterSettings(a, f);
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
    getNoteAt(a, f) {
      return e && e.state.placedNotes.find(
        (l) => l.row === a && l.startColumnIndex <= f && l.endColumnIndex >= f
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
      const a = "uuid,row,startColumn,endColumn,color,shape", f = e.state.placedNotes.map(
        (l) => `${l.uuid},${l.row},${l.startColumnIndex},${l.endColumnIndex},${l.color},${l.shape}`
      );
      return [a, ...f].join(`
`);
    },
    importCSV(a) {
      if (!e) return;
      const f = a.split(`
`).filter((S) => S.trim());
      if (f.length === 0) return;
      const r = f.slice(1).map((S) => {
        const [o, u, v, I, c, N] = S.split(",");
        return {
          uuid: o,
          row: parseInt(u || "0", 10),
          startColumnIndex: parseInt(v || "0", 10),
          endColumnIndex: parseInt(I || "0", 10),
          color: c || "blue",
          shape: N || "circle"
        };
      });
      e.loadNotes(r);
    },
    exportState() {
      return e ? JSON.stringify(e.state, null, 2) : "{}";
    },
    importState(a) {
      if (e)
        try {
          const f = JSON.parse(a);
          Object.assign(e.state, f), e.emit("stateImported", f), this.render();
        } catch (f) {
          s("error", "import", "Failed to import state", f);
        }
    },
    // ============================================================================
    // EVENTS
    // ============================================================================
    on(a, f) {
      e && e.on(a, f);
    },
    off(a, f) {
      e && e.off(a, f);
    },
    // ============================================================================
    // RENDERING
    // ============================================================================
    render() {
      this.renderPitchGrid(), this.renderDrumGrid();
    },
    renderPitchGrid() {
      !g || !e || !i || s("debug", "controller", "renderPitchGrid called - canvas rendering not yet wired");
    },
    renderDrumGrid() {
      !n || !e || !i || s("debug", "controller", "renderDrumGrid called - canvas rendering not yet wired");
    }
  };
}
function Rn(t) {
  throw new Error("Not yet implemented - will be in @mlt/tutorial-runtime package");
}
let ne = null;
function Gn(t) {
  ne = t;
}
class Vt extends w.Synth {
  constructor(i) {
    super(i);
    // Audio effect nodes
    V(this, "presetGain");
    V(this, "vibratoLFO");
    V(this, "vibratoDepth");
    V(this, "vibratoGain");
    V(this, "tremoloLFO");
    V(this, "tremoloDepth");
    V(this, "tremoloGain");
    // Filter nodes
    V(this, "hpFilter");
    V(this, "lpFilterForBP");
    V(this, "lpFilterSolo");
    // Output nodes
    V(this, "hpOutput");
    V(this, "bpOutput");
    V(this, "lpOutput");
    // Crossfade nodes
    V(this, "hp_bp_fade");
    V(this, "main_fade");
    V(this, "wetDryFade");
    this.presetGain = new w.Gain(i.gain || 1), this.vibratoLFO = new w.LFO(0, 0), this.vibratoDepth = new w.Scale(-1, 1), this.vibratoGain = new w.Gain(0), this.vibratoLFO.connect(this.vibratoDepth), this.vibratoDepth.connect(this.vibratoGain), this.vibratoGain.connect(this.oscillator.frequency), this.tremoloLFO = new w.LFO(0, 0), this.tremoloDepth = new w.Scale(0, 1), this.tremoloGain = new w.Gain(1), this.tremoloLFO.connect(this.tremoloDepth), this.tremoloDepth.connect(this.tremoloGain.gain), this.hpFilter = new w.Filter({ type: "highpass" }), this.lpFilterForBP = new w.Filter({ type: "lowpass" }), this.lpFilterSolo = new w.Filter({ type: "lowpass" }), this.hpOutput = new w.Gain(), this.bpOutput = new w.Gain(), this.lpOutput = new w.Gain(), this.hp_bp_fade = new w.CrossFade(0), this.main_fade = new w.CrossFade(0), this.wetDryFade = new w.CrossFade(0), this.oscillator.connect(this.presetGain), this.presetGain.connect(this.wetDryFade.a), this.presetGain.connect(this.hpFilter), this.hpFilter.connect(this.hpOutput), this.hpFilter.connect(this.lpFilterForBP), this.lpFilterForBP.connect(this.bpOutput), this.presetGain.connect(this.lpFilterSolo), this.lpFilterSolo.connect(this.lpOutput), this.hpOutput.connect(this.hp_bp_fade.a), this.bpOutput.connect(this.hp_bp_fade.b), this.lpOutput.connect(this.main_fade.b), this.hp_bp_fade.connect(this.main_fade.a), this.main_fade.connect(this.wetDryFade.b), this.wetDryFade.connect(this.tremoloGain), this.tremoloGain.connect(this.envelope), i.filter && this._setFilter(i.filter), i.vibrato ? this._setVibrato(i.vibrato) : this._setVibrato({ speed: 0, span: 0 }), i.tremelo ? this._setTremolo(i.tremelo) : this._setTremolo({ speed: 0, span: 0 });
  }
  _setPresetGain(i) {
    this.presetGain && (this.presetGain.gain.value = i);
  }
  _setVibrato(i, g = w.now()) {
    var S, o;
    if (!this.vibratoLFO || !this.vibratoGain) return;
    const n = i.speed / 100 * 16, s = (((o = (S = w.getContext()) == null ? void 0 : S.rawContext) == null ? void 0 : o.state) ?? w.context.state) === "running";
    if (i.speed === 0 || i.span === 0) {
      s && this.vibratoLFO.state === "started" && this.vibratoLFO.stop(g), this.vibratoLFO.frequency.value = 0, this.vibratoGain.gain.value = 0;
      return;
    }
    s && this.vibratoLFO.state !== "started" && this.vibratoLFO.start(g), this.vibratoLFO.frequency.value = n;
    const p = i.span / 100 * 50, a = p / 1200, r = 440 * (Math.pow(2, a) - 1);
    this.vibratoGain.gain.value = r, ne == null || ne.debug("FilteredVoice", "Vibrato gain set", { hzDeviation: r, centsAmplitude: p }, "audio");
  }
  _setTremolo(i, g = w.now()) {
    var f, l;
    if (!this.tremoloLFO || !this.tremoloGain) return;
    const n = i.speed / 100 * 16, s = (((l = (f = w.getContext()) == null ? void 0 : f.rawContext) == null ? void 0 : l.state) ?? w.context.state) === "running";
    if (i.speed === 0 || i.span === 0) {
      s && this.tremoloLFO.state === "started" && this.tremoloLFO.stop(g), this.tremoloLFO.frequency.value = 0, this.tremoloGain.gain.cancelScheduledValues(g), this.tremoloGain.gain.value = 1;
      return;
    }
    s && this.tremoloLFO.state !== "started" && this.tremoloLFO.start(g), this.tremoloLFO.frequency.value = n;
    const h = i.span / 100, p = Math.max(0, 1 - h), a = 1;
    this.tremoloDepth.min = p, this.tremoloDepth.max = a;
  }
  _setFilter(i) {
    this.wetDryFade.fade.value = i.enabled ? 1 : 0;
    const g = w.Midi(i.cutoff + 35).toFrequency(), n = i.resonance / 100 * 12 + 0.1;
    this.hpFilter.set({ frequency: g, Q: n }), this.lpFilterForBP.set({ frequency: g, Q: n }), this.lpFilterSolo.set({ frequency: g, Q: n });
    const d = i.blend;
    d <= 1 ? (this.main_fade.fade.value = 0, this.hp_bp_fade.fade.value = d) : (this.main_fade.fade.value = d - 1, this.hp_bp_fade.fade.value = 1);
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
class $t {
  constructor(e, i = {}) {
    V(this, "masterGain");
    V(this, "options");
    V(this, "perVoiceBaselineGain");
    V(this, "activeVoiceCount", 0);
    V(this, "smoothedVoiceCount");
    V(this, "gainUpdateLoopId", null);
    this.masterGain = e, this.options = { ...Qe, ...i }, this.perVoiceBaselineGain = Ze(this.options.polyphonyReference), this.smoothedVoiceCount = this.options.polyphonyReference;
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
    const { polyphonyReference: e, smoothingTauMs: i, masterGainRampMs: g, gainUpdateIntervalMs: n } = this.options, d = w.now();
    if (this.activeVoiceCount === 0) {
      this.smoothedVoiceCount = 0.01 * e + (1 - 0.01) * this.smoothedVoiceCount;
      return;
    }
    const s = n / 1e3, h = 1 - Math.exp(-s / (i / 1e3)), p = Math.max(1, this.activeVoiceCount);
    this.smoothedVoiceCount = h * p + (1 - h) * this.smoothedVoiceCount;
    const a = Math.sqrt(e / this.smoothedVoiceCount), f = this.perVoiceBaselineGain * a;
    this.masterGain.gain.rampTo(f, g / 1e3, d);
  }
}
const Wt = {
  clippingWarningThresholdDb: -3,
  clippingMonitorIntervalMs: 500,
  clippingWarningCooldownMs: 2e3
};
class qt {
  constructor(e, i = {}) {
    V(this, "meter");
    V(this, "options");
    V(this, "clippingMonitorId", null);
    V(this, "lastClippingWarningAt", 0);
    this.meter = e, this.options = { ...Wt, ...i };
  }
  start() {
    this.stop(), this.lastClippingWarningAt = 0, this.clippingMonitorId = setInterval(() => {
      var n, d;
      const e = this.meter.getValue(), i = Array.isArray(e) ? e[0] : e;
      if (i === void 0 || i <= this.options.clippingWarningThresholdDb)
        return;
      const g = Date.now();
      g - this.lastClippingWarningAt < this.options.clippingWarningCooldownMs || (this.lastClippingWarningAt = g, (d = (n = this.options).onWarning) == null || d.call(n, i));
    }, this.options.clippingMonitorIntervalMs);
  }
  stop() {
    this.clippingMonitorId !== null && (clearInterval(this.clippingMonitorId), this.clippingMonitorId = null);
  }
}
function Ln(t) {
  const {
    timbres: e,
    masterVolume: i = 0,
    effectsManager: g,
    harmonicFilter: n,
    logger: d,
    audioInit: s,
    getDrumVolume: h
  } = t, p = {};
  let a = null, f = null, l = null, r = null, S = null, o = {}, u = null, v = null;
  const I = { ...e }, c = d ?? {
    debug: () => {
    },
    info: () => {
    },
    warn: () => {
    }
  };
  function N(m) {
    if (n)
      return n.getFilteredCoefficients(m);
    const y = I[m];
    return y != null && y.coeffs ? y.coeffs : new Float32Array([0, 1]);
  }
  function A(m) {
    const y = m.reduce((b, x) => b + Math.abs(x), 0);
    return y > 1 ? Array.from(m).map((b) => b / y) : Array.from(m);
  }
  const C = {
    init() {
      this.stopBackgroundMonitors(), a = new w.Gain(Ze()), u = new $t(a), u.start(), f = new w.Volume(i), l = new w.Compressor({
        threshold: -12,
        ratio: 3,
        attack: 0.01,
        release: 0.1,
        knee: 6
      }), r = new w.Limiter(-3), S = new w.Meter(), a.connect(f), f.connect(l), l.connect(r), r.toDestination(), r.connect(S), S && (v = new qt(S, {
        onWarning: (m) => {
          c.warn("SynthEngine", "Limiter input approaching clipping threshold", { level: m }, "audio");
        }
      }), v.start());
      for (const m in I) {
        const y = I[m];
        if (!y) continue;
        y.vibrato || (y.vibrato = { speed: 0, span: 0 }), y.tremelo || (y.tremelo = { speed: 0, span: 0 });
        const b = N(m), x = A(b), O = y.gain || 1, T = new w.PolySynth({
          voice: Vt,
          options: {
            oscillator: { type: "custom", partials: x },
            envelope: y.adsr,
            filter: y.filter,
            vibrato: y.vibrato,
            tremelo: y.tremelo,
            gain: O
          }
        }).connect(a);
        g && a && g.applySynthEffects(T, m, a);
        const M = T.triggerAttack.bind(T);
        T.triggerAttack = function(...E) {
          const P = M(...E), L = (E[1] ?? w.now()) + 5e-3;
          return w.Draw.schedule(() => {
            const R = this._activeVoices;
            g ? R && R.size > 0 ? R.forEach((D) => {
              D.effectsApplied || (g.applyEffectsToVoice(D, m), D.effectsApplied = !0);
            }) : this._voices && Array.isArray(this._voices) && this._voices.forEach((D) => {
              D && !D.effectsApplied && (g.applyEffectsToVoice(D, m), D.effectsApplied = !0);
            }) : R && R.size > 0 ? R.forEach((D) => {
              D._setVibrato && D.vibratoApplied !== !0 && (D._setVibrato(this._currentVibrato), D.vibratoApplied = !0), D._setTremolo && D.tremoloApplied !== !0 && (D._setTremolo(this._currentTremolo), D.tremoloApplied = !0);
            }) : this._voices && Array.isArray(this._voices) && this._voices.forEach((D) => {
              D != null && D._setVibrato && D.vibratoApplied !== !0 && (D._setVibrato(this._currentVibrato), D.vibratoApplied = !0), D != null && D._setTremolo && D.tremoloApplied !== !0 && (D._setTremolo(this._currentTremolo), D.tremoloApplied = !0);
            });
          }, L), P;
        }, T._currentVibrato = y.vibrato, T._currentTremolo = y.tremelo, T._currentFilter = y.filter, p[m] = T, c.debug("SynthEngine", `Created filtered synth for color: ${m}`, null, "audio");
      }
      c.info("SynthEngine", "Initialized with multi-timbral support", null, "audio");
    },
    updateSynthForColor(m) {
      const y = I[m], b = p[m];
      if (!b || !y) return;
      y.vibrato || (y.vibrato = { speed: 0, span: 0 }), y.tremelo || (y.tremelo = { speed: 0, span: 0 }), c.debug("SynthEngine", `Updating timbre for color ${m}`, null, "audio");
      const x = N(m), O = A(x);
      b.set({
        oscillator: { partials: O },
        envelope: y.adsr
      }), g && a && g.applySynthEffects(b, m, a), b._currentVibrato = y.vibrato, b._currentTremolo = y.tremelo, b._currentFilter = y.filter;
      const T = b._activeVoices;
      T && T.size > 0 ? T.forEach((M) => {
        if (M._setFilter && M._setFilter(y.filter), M._setVibrato && (M._setVibrato(y.vibrato), M.vibratoApplied = !0), M._setTremolo && (M._setTremolo(y.tremelo), M.tremoloApplied = !0), M._setPresetGain) {
          const E = y.gain || 1;
          M._setPresetGain(E);
        }
      }) : b._voices && Array.isArray(b._voices) && b._voices.forEach((M) => {
        if (M != null && M._setVibrato && (M._setVibrato(y.vibrato), M.vibratoApplied = !0), M != null && M._setTremolo && (M._setTremolo(y.tremelo), M.tremoloApplied = !0), M != null && M._setFilter && M._setFilter(y.filter), M != null && M._setPresetGain) {
          const E = y.gain || 1;
          M._setPresetGain(E);
        }
      });
    },
    setBpm(m) {
      var y;
      try {
        (y = w == null ? void 0 : w.Transport) != null && y.bpm && (w.Transport.bpm.value = m, c.debug("SynthEngine", `Tone.Transport BPM updated to ${m}`, null, "audio"));
      } catch (b) {
        c.warn("SynthEngine", "Unable to update BPM on Tone.Transport", { tempo: m, error: b }, "audio");
      }
    },
    setVolume(m) {
      f && (f.volume.value = m);
    },
    async playNote(m, y, b = w.now()) {
      await (s || (() => w.start()))();
      const O = Object.keys(p);
      if (O.length === 0) return;
      const [T] = O;
      if (!T) return;
      const M = p[T];
      M && M.triggerAttackRelease(m, y, b);
    },
    /**
     * Trigger note attack. Used by Transport scheduling with explicit time parameter.
     * For interactive (user-initiated) triggers, use triggerAttackInteractive instead.
     */
    triggerAttack(m, y, b = w.now(), x = !1) {
      const O = p[y];
      if (O)
        if (u == null || u.noteOn(1), x && h) {
          const T = h(), M = O.volume.value, E = M + 20 * Math.log10(T);
          O.volume.value = E, O.triggerAttack(m, b), w.Draw.schedule(() => {
            O != null && O.volume && (O.volume.value = M);
          }, b + 0.1);
        } else
          O.triggerAttack(m, b);
    },
    /**
     * Trigger note attack for interactive (user-initiated) events.
     * Adds a small scheduling offset (20ms) to help the audio thread process
     * the event without pops or clicks.
     *
     * Use this for mouse clicks, keyboard presses, or other immediate UI triggers.
     */
    triggerAttackInteractive(m, y) {
      C.triggerAttack(m, y, w.now() + 0.02);
    },
    quickReleasePitches(m, y) {
      var O, T, M;
      const b = p[y];
      if (!b || !m || m.length === 0) return;
      let x;
      try {
        const E = typeof b.get == "function" ? b.get() : null, P = (O = E == null ? void 0 : E.envelope) == null ? void 0 : O.release;
        x = typeof P == "number" ? P : void 0, b.set({ envelope: { release: 0.01 } }), m.forEach((L) => {
          b.triggerRelease(L, w.now());
        });
        const B = ((T = b._activeVoices) == null ? void 0 : T.size) ?? ((M = b._voices) == null ? void 0 : M.length) ?? (u == null ? void 0 : u.getActiveVoiceCount()) ?? 0;
        u == null || u.clampActiveVoiceCountToAtMost(B);
      } catch (E) {
        c.warn("SynthEngine", "quickReleasePitches failed", { err: E, color: y, pitches: m }, "audio");
      } finally {
        if (x !== void 0)
          try {
            b.set({ envelope: { release: x } });
          } catch {
          }
      }
    },
    triggerRelease(m, y, b = w.now()) {
      var T, M;
      const x = p[y];
      if (!x) return;
      x.triggerRelease(m, b), u == null || u.noteOff(1);
      const O = ((T = x._activeVoices) == null ? void 0 : T.size) ?? ((M = x._voices) == null ? void 0 : M.length) ?? (u == null ? void 0 : u.getActiveVoiceCount()) ?? 0;
      u == null || u.clampActiveVoiceCountToAtMost(O);
    },
    releaseAll() {
      var m;
      for (const y in p)
        (m = p[y]) == null || m.releaseAll();
      u == null || u.resetActiveVoiceCount();
    },
    // === Waveform Visualization ===
    createWaveformAnalyzer(m) {
      const y = p[m];
      return y ? (o[m] || (o[m] = new w.Analyser("waveform", 1024), y.connect(o[m]), c.debug("SynthEngine", `Created waveform analyzer for color: ${m}`, null, "waveform")), o[m]) : (c.warn("SynthEngine", `No synth found for color: ${m}`, null, "audio"), null);
    },
    getWaveformAnalyzer(m) {
      return o[m] || null;
    },
    getAllWaveformAnalyzers() {
      const m = /* @__PURE__ */ new Map();
      for (const y in o)
        o[y] && m.set(y, o[y]);
      return m;
    },
    removeWaveformAnalyzer(m) {
      o[m] && (o[m].dispose(), delete o[m], c.debug("SynthEngine", `Removed waveform analyzer for color: ${m}`, null, "waveform"));
    },
    disposeAllWaveformAnalyzers() {
      for (const m in o)
        o[m] && o[m].dispose();
      o = {}, c.debug("SynthEngine", "Disposed all waveform analyzers", null, "waveform");
    },
    // === Node Access ===
    getSynth(m) {
      return p[m] || null;
    },
    getAllSynths() {
      return { ...p };
    },
    getMainVolumeNode() {
      return f || null;
    },
    getMasterGainNode() {
      return a || null;
    },
    // === Cleanup ===
    stopBackgroundMonitors() {
      v == null || v.stop(), u == null || u.stop();
    },
    dispose() {
      var m;
      this.stopBackgroundMonitors(), this.disposeAllWaveformAnalyzers();
      for (const y in p)
        (m = p[y]) == null || m.dispose();
      a == null || a.dispose(), f == null || f.dispose(), l == null || l.dispose(), r == null || r.dispose(), S == null || S.dispose(), c.debug("SynthEngine", "Disposed SynthEngine", null, "audio");
    }
  };
  return C;
}
const Xe = 1e-4;
function Ht(t) {
  const {
    getMacrobeatInfo: e,
    getPlacedTonicSigns: i,
    getTonicSpanColumnIndices: g,
    updatePlayheadModel: n,
    logger: d
  } = t;
  let s = [], h = 0, p = 0, a = 0;
  const f = d ?? {
    debug: () => {
    }
  };
  function l(o) {
    return 60 / (o * 2);
  }
  function r(o, u, v) {
    let I = 0;
    f.debug("TimeMapCalculator", "[TIMEMAP] Building timeMap", {
      columnCount: u.length,
      tonicSignCount: v.length,
      microbeatDuration: o
    });
    const c = u.length, N = g(v);
    for (let A = 0; A < c; A++) {
      s[A] = I;
      const C = N.has(A);
      if (C ? f.debug("TimeMapCalculator", `[TIMEMAP] Column ${A} is tonic, not advancing time`) : I += (u[A] || 0) * o, A < 5) {
        const m = s[A];
        m !== void 0 && f.debug("TimeMapCalculator", `[TIMEMAP] timeMap[${A}] = ${m.toFixed(3)}s (isTonic: ${C})`);
      }
    }
    c > 0 && (s[c] = I), f.debug("TimeMapCalculator", `[TIMEMAP] Complete. Total columns: ${c}, Final time: ${I.toFixed(3)}s`);
  }
  function S(o) {
    var N;
    const u = s.length > 0 ? s[s.length - 1] ?? 0 : 0;
    if (!Number.isFinite(u) || u === 0) {
      h = 0;
      return;
    }
    const v = ((N = o.tempoModulationMarkers) == null ? void 0 : N.filter((A) => A.active)) || [];
    if (v.length === 0) {
      h = u;
      return;
    }
    const I = [...v].sort((A, C) => A.measureIndex - C.measureIndex);
    let c = u;
    for (const A of I) {
      const C = e(A.measureIndex);
      if (C) {
        const m = C.endColumn - 1, y = s[m] ?? u, b = u - y, x = b * A.ratio;
        c = c - b + x;
      }
    }
    h = c;
  }
  return {
    getMicrobeatDuration: l,
    calculate(o) {
      var N, A;
      f.debug("TimeMapCalculator", "calculate", { tempo: `${o.tempo} BPM` }), s = [];
      const u = l(o.tempo), { columnWidths: v } = o, I = i();
      r(u, v, I), (A = f.timing) == null || A.call(f, "TimeMapCalculator", "calculate", { totalDuration: `${(N = s[s.length - 1]) == null ? void 0 : N.toFixed(2)}s` }), S(o);
      const c = h;
      n == null || n({
        timeMap: s,
        musicalEndTime: c,
        columnWidths: o.columnWidths,
        cellWidth: o.cellWidth
      });
    },
    getTimeMap() {
      return s;
    },
    getMusicalEndTime() {
      return h;
    },
    findNonAnacrusisStart(o) {
      if (!o.hasAnacrusis)
        return f.debug("TimeMapCalculator", "[ANACRUSIS] No anacrusis, starting from time 0"), 0;
      for (let u = 0; u < o.macrobeatBoundaryStyles.length; u++)
        if (o.macrobeatBoundaryStyles[u] === "solid") {
          const v = e(u + 1);
          if (v) {
            const I = s[v.startColumn] || 0;
            return f.debug("TimeMapCalculator", `[ANACRUSIS] Found solid boundary at macrobeat ${u}, non-anacrusis starts at column ${v.startColumn}, time ${I.toFixed(3)}s`), I;
          }
        }
      return f.debug("TimeMapCalculator", "[ANACRUSIS] No solid boundary found, starting from time 0"), 0;
    },
    applyModulationToTime(o, u, v) {
      var A;
      const I = ((A = v.tempoModulationMarkers) == null ? void 0 : A.filter((C) => C.active)) || [];
      if (I.length === 0)
        return o;
      const c = [...I].sort((C, m) => C.measureIndex - m.measureIndex);
      let N = o;
      u < 5 && f.debug("TimeMapCalculator", `[MODULATION] Column ${u}: baseTime ${o.toFixed(3)}s, ${c.length} active markers`);
      for (const C of c) {
        const m = e(C.measureIndex);
        if (m) {
          const y = m.endColumn;
          if (u > y) {
            const b = s[y] !== void 0 ? s[y] : 0, x = o - b, O = x * C.ratio;
            N = N - x + O, u < 5 && f.debug("TimeMapCalculator", `[MODULATION] Column ${u}: Applied marker at measure ${C.measureIndex} (col ${y}), ratio ${C.ratio}, adjustedTime ${N.toFixed(3)}s`);
          }
        }
      }
      return N;
    },
    setLoopBounds(o, u, v) {
      const I = l(v), c = Math.max(I, 1e-3), N = Number.isFinite(o) ? o : 0;
      let A = Number.isFinite(u) ? u : N + c;
      A <= N && (A = N + c), p = N, a = A, w != null && w.Transport && (w.Transport.loopStart = N, w.Transport.loopEnd = A);
    },
    getConfiguredLoopBounds() {
      return { loopStart: p, loopEnd: a };
    },
    setConfiguredLoopBounds(o, u) {
      p = o, a = u;
    },
    clearConfiguredLoopBounds() {
      p = 0, a = 0;
    },
    reapplyConfiguredLoopBounds(o) {
      if (a > p) {
        const u = w.Time(w.Transport.loopStart).toSeconds(), v = w.Time(w.Transport.loopEnd).toSeconds(), I = Math.abs(u - p), c = Math.abs(v - a);
        (I > Xe || c > Xe) && (w.Transport.loopStart = p, w.Transport.loopEnd = a), w.Transport.loop !== o && (w.Transport.loop = o);
      }
    },
    updateLoopBoundsFromTimeline(o) {
      const u = this.findNonAnacrusisStart(o), v = h;
      this.setLoopBounds(u, v, o.tempo);
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
    synthEngine: i,
    initialVolume: g = 0
  } = t;
  let n = null, d = null;
  const s = /* @__PURE__ */ new Map();
  function h(a, f) {
    let l = Number.isFinite(f) ? f : w.now();
    const r = s.get(a) ?? -1 / 0;
    return l > r || (l = r + Xt), s.set(a, l), l;
  }
  if (d = new w.Volume(g), n = new w.Players(e).connect(d), i) {
    const a = (p = i.getMainVolumeNode) == null ? void 0 : p.call(i);
    a ? d.connect(a) : d.toDestination();
  } else
    d.toDestination();
  return {
    getPlayers() {
      return n;
    },
    getVolumeNode() {
      return d;
    },
    trigger(a, f) {
      var r;
      if (!n) return;
      const l = h(a, f);
      (r = n.player(a)) == null || r.start(l);
    },
    reset() {
      s.clear();
    },
    dispose() {
      n == null || n.dispose(), d == null || d.dispose(), n = null, d = null, s.clear();
    }
  };
}
const Je = "♭", ze = "♯";
function zt(t, e) {
  if (t.length < 2 || e < t[0] || e >= t[t.length - 1]) return -1;
  let i = 0, g = t.length - 2;
  for (; i <= g; ) {
    const n = i + g >>> 1, d = t[n], s = t[n + 1];
    if (e >= d && e < s)
      return n;
    e < d ? g = n - 1 : i = n + 1;
  }
  return -1;
}
function _n(t) {
  const {
    synthEngine: e,
    stateCallbacks: i,
    eventCallbacks: g,
    visualCallbacks: n,
    logger: d,
    audioInit: s,
    playbackMode: h = "standard",
    highwayService: p
  } = t, a = d ?? {
    debug: () => {
    },
    info: () => {
    },
    warn: () => {
    }
  };
  let f = null, l = !1, r = null, S = null, o = 1;
  const u = [];
  function v(T, M) {
    const E = M.fullRowData[T];
    return E ? E.toneNote.replace(Je, "b").replace(ze, "#") : "C4";
  }
  function I(T, M) {
    const E = T.globalRow ?? T.row, P = M.fullRowData[E];
    return P ? P.toneNote.replace(Je, "b").replace(ze, "#") : "C4";
  }
  function c() {
    var R, D, F;
    if (!r) return;
    const T = i.getState();
    a.debug("TransportService", "scheduleNotes", "Clearing previous transport events and rescheduling all notes"), w.Transport.cancel(), S == null || S.reset(), r.calculate(T), (R = n == null ? void 0 : n.clearAdsrVisuals) == null || R.call(n);
    const M = r.getTimeMap(), { loopEnd: E } = r.getConfiguredLoopBounds(), P = r.findNonAnacrusisStart(T);
    a.debug("TransportService", `[ANACRUSIS] hasAnacrusis: ${T.hasAnacrusis}, anacrusisOffset: ${P.toFixed(3)}s`), T.placedNotes.forEach((G, _) => {
      const $ = G.startColumnIndex, W = G.endColumnIndex, H = M[$];
      if (H === void 0) {
        a.warn("TransportService", `[NOTE SCHEDULE] Note ${_}: timeMap[${$}] undefined, skipping`);
        return;
      }
      const q = r.applyModulationToTime(H, $, T), U = M[W + 1];
      if (U === void 0) {
        a.warn("TransportService", `Skipping note with invalid endColumnIndex: ${G.endColumnIndex + 1}`);
        return;
      }
      const j = r.applyModulationToTime(U, W + 1, T) - q;
      G.isDrum ? N(G, q) : A(G, q, j, E, T);
    });
    const B = ((D = i.getStampPlaybackData) == null ? void 0 : D.call(i)) ?? [];
    B.forEach((G) => {
      C(G, M, T);
    });
    const L = ((F = i.getTripletPlaybackData) == null ? void 0 : F.call(i)) ?? [];
    L.forEach((G) => {
      m(G, M, T);
    }), a.debug("TransportService", "scheduleNotes", `Finished scheduling ${T.placedNotes.length} notes, ${B.length} stamps, and ${L.length} triplets`);
  }
  function N(T, M) {
    const E = i.getState();
    w.Transport.schedule((P) => {
      if (E.isPaused) return;
      const B = T.drumTrack;
      if (B == null) return;
      const L = String(B);
      S == null || S.trigger(L, P), w.Draw.schedule(() => {
        var R;
        (R = n == null ? void 0 : n.triggerDrumNotePop) == null || R.call(n, T.startColumnIndex, B);
      }, P);
    }, M);
  }
  function A(T, M, E, P, B) {
    var q;
    const L = I(T, B), R = T.color, D = T.globalRow ?? T.row, F = ((q = B.fullRowData[D]) == null ? void 0 : q.hex) || "#888888", G = T.uuid, _ = B.timbres[R];
    if (!_) {
      a.warn("TransportService", `Timbre not found for color ${R}. Skipping note ${G}`);
      return;
    }
    let $ = M + E;
    const H = P - 1e-3;
    $ >= P && ($ = Math.max(M + 1e-3, H)), w.Transport.schedule((U) => {
      i.getState().isPaused || (e.triggerAttack(L, R, U), w.Draw.schedule(() => {
        var J;
        (J = n == null ? void 0 : n.triggerAdsrVisual) == null || J.call(n, G, "attack", F, _.adsr), g.emit("noteAttack", { noteId: G, color: R });
      }, U));
    }, M), w.Transport.schedule((U) => {
      e.triggerRelease(L, R, U), w.Draw.schedule(() => {
        var J;
        (J = n == null ? void 0 : n.triggerAdsrVisual) == null || J.call(n, G, "release", F, _.adsr), g.emit("noteRelease", { noteId: G, color: R });
      }, U);
    }, $);
  }
  function C(T, M, E) {
    var R;
    const P = T.column, B = M[P];
    if (B === void 0) return;
    (((R = i.getStampScheduleEvents) == null ? void 0 : R.call(i, T.sixteenthStampId, T.placement)) ?? []).forEach((D) => {
      y(D, B, T.row, T.color, E);
    });
  }
  function m(T, M, E) {
    var R, D;
    const P = ((R = i.timeToCanvas) == null ? void 0 : R.call(i, T.startTimeIndex, E)) ?? T.startTimeIndex, B = M[P];
    if (B === void 0) return;
    (((D = i.getTripletScheduleEvents) == null ? void 0 : D.call(i, T.tripletStampId, T.placement)) ?? []).forEach((F) => {
      y(F, B, T.row, T.color, E);
    });
  }
  function y(T, M, E, P, B) {
    const L = w.Time(T.offset).toSeconds(), R = w.Time(T.duration).toSeconds(), D = M + L, F = D + R, G = E + T.rowOffset, _ = v(G, B);
    w.Transport.schedule(($) => {
      i.getState().isPaused || e.triggerAttack(_, P, $);
    }, D), w.Transport.schedule(($) => {
      i.getState().isPaused || e.triggerRelease(_, P, $);
    }, F);
  }
  function b() {
    var D, F;
    const M = i.getState().tempo, E = 1e-4, P = 0.5, B = (G) => (G == null ? void 0 : G.xPosition) ?? 477.5, L = typeof ((F = (D = w.Transport) == null ? void 0 : D.bpm) == null ? void 0 : F.value) == "number" ? w.Transport.bpm.value : M;
    o = M !== 0 ? L / M : 1, l = !0;
    function R() {
      var Te, Ne, Ae, be, Me, ve, we, Ie, xe, Pe, Ee, Oe, De, Fe, Be;
      if (!l || !r)
        return;
      if (w.Transport.state === "stopped") {
        f = requestAnimationFrame(R);
        return;
      }
      const G = i.getState(), _ = w.Time(w.Transport.loopEnd).toSeconds(), $ = G.isLooping, W = r.getMusicalEndTime(), H = $ && _ > 0 ? _ : W, q = w.Transport.seconds, U = q * 1e3, J = q >= H - 1e-3;
      if (!$ && J) {
        a.info("TransportService", "Playback reached end. Stopping playhead."), O.stop();
        return;
      }
      if (G.isPaused) {
        f = requestAnimationFrame(R);
        return;
      }
      const j = r.getTimeMap();
      (Te = n == null ? void 0 : n.clearPlayheadCanvas) == null || Te.call(n), (Ne = n == null ? void 0 : n.clearDrumPlayheadCanvas) == null || Ne.call(n);
      let oe = q;
      if ($) {
        const Y = w.Time(w.Transport.loopStart).toSeconds(), X = w.Time(w.Transport.loopEnd).toSeconds() - Y;
        X > 0 && (oe = (q - Y) % X + Y);
      }
      const tt = ((Ae = i.getCanvasWidth) == null ? void 0 : Ae.call(i)) ?? 1e3, nt = ((be = i.getPlacedTonicSigns) == null ? void 0 : be.call(i)) ?? [], pe = ((Me = i.getTonicSpanColumnIndices) == null ? void 0 : Me.call(i, nt)) ?? /* @__PURE__ */ new Set();
      let se = 0, ge = 0, Se = 0, ie = -1;
      const Q = zt(j, oe);
      if (Q >= 0) {
        const Y = j[Q], Re = j[Q + 1];
        let X = Q;
        for (; pe.has(X) && X < j.length - 1; )
          X++;
        const le = ((ve = i.getColumnStartX) == null ? void 0 : ve.call(i, X)) ?? 0, Ge = ((we = i.getColumnWidth) == null ? void 0 : we.call(i, X)) ?? 10;
        if (ge = le, Se = Ge, ie = X, pe.has(Q))
          se = le;
        else {
          const Le = Re - Y, st = oe - Y, it = Le > 0 ? st / Le : 0;
          se = le + it * Ge;
        }
      }
      const ee = Math.min(se, tt);
      x(G, ee, M, B, E, P);
      const ye = ((Ie = n == null ? void 0 : n.getPlayheadCanvasHeight) == null ? void 0 : Ie.call(n)) ?? 500, Ce = ((xe = n == null ? void 0 : n.getDrumCanvasHeight) == null ? void 0 : xe.call(n)) ?? 100, k = G.playheadMode === "macrobeat" && ie >= 0 ? (Pe = i.getMacrobeatHighlightRect) == null ? void 0 : Pe.call(i, ie) : null, ae = (k == null ? void 0 : k.x) ?? ge, re = (k == null ? void 0 : k.width) ?? Se;
      ee >= 0 && (G.playheadMode === "macrobeat" || G.playheadMode === "microbeat" ? ((Ee = n == null ? void 0 : n.drawPlayheadHighlight) == null || Ee.call(n, ae, re, ye, U), (Oe = n == null ? void 0 : n.drawDrumPlayheadHighlight) == null || Oe.call(n, ae, re, Ce, U)) : ((De = n == null ? void 0 : n.drawPlayheadLine) == null || De.call(n, ee, ye), (Fe = n == null ? void 0 : n.drawDrumPlayheadLine) == null || Fe.call(n, ee, Ce)));
      const ot = G.playheadMode === "macrobeat" || G.playheadMode === "microbeat";
      (Be = n == null ? void 0 : n.updateBeatLineHighlight) == null || Be.call(n, ae, re, ot), f = requestAnimationFrame(R);
    }
    R();
  }
  function x(T, M, E, P, B, L) {
    if (!r) return;
    const D = (Array.isArray(T.tempoModulationMarkers) ? T.tempoModulationMarkers : []).filter((F) => (F == null ? void 0 : F.active) && typeof F.ratio == "number" && F.ratio !== 0).sort((F, G) => P(F) - P(G));
    if (D.length > 0) {
      let F = 1;
      for (const G of D) {
        const _ = P(G);
        if (M + L >= _)
          F *= 1 / G.ratio;
        else
          break;
      }
      if ((!Number.isFinite(F) || F <= 0) && (F = 1), Math.abs(F - o) > B) {
        const G = E * F;
        w.Transport.bpm.value = G, r.reapplyConfiguredLoopBounds(T.isLooping), o = F, a.debug("TransportService", `Tempo multiplier updated to ${F.toFixed(3)} (${G.toFixed(2)} BPM)`);
      }
    } else Math.abs(o - 1) > B && (w.Transport.bpm.value = E, r.reapplyConfiguredLoopBounds(T.isLooping), o = 1, a.debug("TransportService", `Tempo reset to base ${E} BPM`));
  }
  const O = {
    init() {
      const T = i.getState();
      r = Ht({
        getMacrobeatInfo: i.getMacrobeatInfo ?? (() => null),
        getPlacedTonicSigns: i.getPlacedTonicSigns ?? (() => []),
        getTonicSpanColumnIndices: i.getTonicSpanColumnIndices ?? (() => /* @__PURE__ */ new Set()),
        logger: a
      }), S = Jt({
        samples: {
          H: "/audio/drums/hi.mp3",
          M: "/audio/drums/mid.mp3",
          L: "/audio/drums/lo.mp3"
        },
        synthEngine: {
          getMainVolumeNode: () => e.getMainVolumeNode()
        }
      }), w.Transport.bpm.value = T.tempo;
      const M = () => this.handleStateChange(), E = () => this.handleStateChange(), P = () => this.handleStateChange(), B = () => {
        if (r && r.getTimeMap().length > 0) {
          const F = i.getState();
          r.calculate(F);
        }
        this.handleStateChange();
      }, L = (F) => {
        var $, W;
        const G = (($ = F == null ? void 0 : F.oldConfig) == null ? void 0 : $.columnWidths) || [], _ = ((W = F == null ? void 0 : F.newConfig) == null ? void 0 : W.columnWidths) || [];
        G.length !== _.length && r && r.calculate(i.getState());
      }, R = (F) => {
        if (a.info("TransportService", `tempoChanged triggered with new value: ${F} BPM`), w.Transport.state === "started") {
          const G = w.Transport.position;
          w.Transport.pause(), f && (cancelAnimationFrame(f), f = null), w.Transport.bpm.value = F, r == null || r.reapplyConfiguredLoopBounds(i.getState().isLooping), c(), w.Transport.start(void 0, G), h === "standard" && b();
        } else
          w.Transport.bpm.value = F, r == null || r.reapplyConfiguredLoopBounds(i.getState().isLooping), r == null || r.calculate(i.getState());
      }, D = (F) => {
        w.Transport.loop = F;
        const G = w.Time(w.Transport.loopStart).toSeconds(), _ = w.Time(w.Transport.loopEnd).toSeconds();
        F && _ <= G && r && (w.Transport.loopEnd = G + Math.max(r.getMicrobeatDuration(i.getState().tempo), 1e-3)), F && r ? r.setConfiguredLoopBounds(
          w.Time(w.Transport.loopStart).toSeconds(),
          w.Time(w.Transport.loopEnd).toSeconds()
        ) : r == null || r.clearConfiguredLoopBounds();
      };
      g.on("rhythmStructureChanged", M), g.on("notesChanged", E), g.on("sixteenthStampPlacementsChanged", P), g.on("tempoModulationMarkersChanged", B), g.on("layoutConfigChanged", L), g.on("tempoChanged", R), g.on("loopingChanged", D), u.push(
        () => {
        }
        // These would be off() calls if the event system supports them
      ), w.Transport.on("stop", () => {
        var F, G;
        a.info("TransportService", "Tone.Transport 'stop' fired. Resetting playback state"), (F = g.setPlaybackState) == null || F.call(g, !1, !1), (G = n == null ? void 0 : n.clearAdsrVisuals) == null || G.call(n), f && (cancelAnimationFrame(f), f = null);
      }), a.info("TransportService", "Initialized");
    },
    handleStateChange() {
      if (w.Transport.state === "started") {
        a.debug("TransportService", "handleStateChange: Notes or rhythm changed during playback. Rescheduling");
        const M = w.Transport.position;
        w.Transport.pause(), c(), w.Transport.start(void 0, M);
      } else
        r == null || r.calculate(i.getState());
    },
    start() {
      a.info("TransportService", "Starting playback"), (s || (() => w.start()))().then(() => {
        c();
        const M = i.getState();
        r == null || r.getTimeMap();
        const E = (r == null ? void 0 : r.getMusicalEndTime()) ?? 0, P = (r == null ? void 0 : r.findNonAnacrusisStart(M)) ?? 0;
        r == null || r.setLoopBounds(P, E, M.tempo), w.Transport.bpm.value = M.tempo;
        const B = w.now() + 0.1;
        w.Transport.start(B, 0), h === "standard" && b(), g.emit("playbackStarted");
      });
    },
    resume() {
      a.info("TransportService", "Resuming playback"), (s || (() => w.start()))().then(() => {
        w.Transport.start(), h === "standard" && b(), g.emit("playbackResumed");
      });
    },
    pause() {
      a.info("TransportService", "Pausing playback"), w.Transport.pause(), f && (cancelAnimationFrame(f), f = null), g.emit("playbackPaused");
    },
    stop() {
      var M, E, P;
      a.info("TransportService", "Stopping playback and clearing visuals"), l = !1, f && (cancelAnimationFrame(f), f = null), w.Transport.stop(), w.Transport.cancel(), S == null || S.reset();
      const T = i.getState();
      w.Transport.bpm.value = T.tempo, r == null || r.reapplyConfiguredLoopBounds(T.isLooping), e.releaseAll(), (M = n == null ? void 0 : n.clearPlayheadCanvas) == null || M.call(n), (E = n == null ? void 0 : n.clearDrumPlayheadCanvas) == null || E.call(n), (P = n == null ? void 0 : n.updateBeatLineHighlight) == null || P.call(n, 0, 0, !1), g.emit("playbackStopped");
    },
    dispose() {
      this.stop(), S == null || S.dispose(), u.forEach((T) => T()), a.debug("TransportService", "Disposed");
    }
  };
  return O;
}
const jt = {
  latencyHint: "playback",
  lookAhead: 0.1
};
function Vn(t = {}) {
  const { latencyHint: e, lookAhead: i } = { ...jt, ...t };
  let g = !1;
  if (w.context.state === "suspended")
    try {
      w.setContext(new w.Context({
        latencyHint: e
      })), g = !0;
    } catch (n) {
      console.warn("Failed to create new AudioContext, using default:", n);
    }
  return i !== void 0 && (w.context.lookAhead = i), g;
}
function $n() {
  const t = w.context.rawContext, e = t && "baseLatency" in t ? t.baseLatency : void 0;
  return {
    state: w.context.state,
    sampleRate: w.context.sampleRate,
    baseLatency: e,
    lookAhead: w.context.lookAhead
  };
}
function kt(t) {
  let e = null, i = null;
  function g() {
    const r = typeof performance < "u" ? performance.now() : Date.now();
    return (!e || !i || r - i > 1) && (e = t.getViewportInfo(), i = r), e;
  }
  function n() {
    e = null, i = null;
  }
  function d(r, S) {
    if (t.columnToPixelX)
      return t.columnToPixelX(r, S);
    const { columnWidths: o, cellWidth: u } = S;
    let v = 0;
    for (let I = 0; I < r && I < o.length; I++)
      v += (o[I] ?? 1) * u;
    return v;
  }
  function s(r, S) {
    const o = g(), u = r - o.startRank, v = S.cellHeight / 2;
    return (u + 1) * v;
  }
  function h(r, S) {
    if (t.pixelXToColumn)
      return t.pixelXToColumn(r, S);
    const { columnWidths: o, cellWidth: u } = S;
    let v = 0;
    for (let I = 0; I < o.length; I++) {
      const c = (o[I] ?? 1) * u;
      if (r < v + c)
        return I;
      v += c;
    }
    return o.length - 1;
  }
  function p(r, S) {
    const o = g(), u = S.cellHeight / 2;
    return r / u - 1 + o.startRank;
  }
  function a() {
    const r = g(), { startRank: S, endRank: o } = r, u = Math.max(S, o - 1);
    return { startRow: S, endRow: u };
  }
  function f(r) {
    let S = (r || "").replace(/\d/g, "").trim();
    return S = S.replace(/b/g, "b-").replace(/#/g, "b_"), S;
  }
  function l(r) {
    switch (r) {
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
    getColumnX: d,
    getRowY: s,
    getColumnFromX: h,
    getRowFromY: p,
    getVisibleRowRange: a,
    getPitchClass: f,
    getLineStyleFromPitchClass: l,
    invalidateViewportCache: n,
    getCachedViewportInfo: g
  };
}
const ue = "♯", he = "♭", te = "/", Yt = 0.35, Kt = 0.5, Qt = 6, Zt = 1, en = 0.08, tn = 0.04, nn = 1, Z = 4;
function on(t) {
  const { coords: e } = t;
  function i(c) {
    const N = c == null ? void 0 : c.split("-")[1];
    return Number.parseInt(N ?? "0", 10);
  }
  function g(c) {
    if (!c || typeof c.startColumnIndex != "number" || typeof c.endColumnIndex != "number")
      return !1;
    const N = c.shape === "circle" ? c.startColumnIndex + 1 : c.startColumnIndex;
    return c.endColumnIndex > N;
  }
  function n(c, N) {
    return Number.isFinite(c) && c > 0 && Number.isFinite(N) && N > 0;
  }
  function d(c, N, A) {
    const { cellWidth: C } = A, m = C * 0.25, y = c.uuid;
    if (!y) return 0;
    const b = N.filter(
      (T) => !T.isDrum && T.row === c.row && T.startColumnIndex === c.startColumnIndex && T.uuid && T.uuid !== y
    );
    if (b.length === 0) return 0;
    const x = [c, ...b];
    return x.sort((T, M) => i(T.uuid) - i(M.uuid)), x.findIndex((T) => T.uuid === y) * m;
  }
  function s(c, N) {
    var y, b, x;
    const { cellHeight: A } = N, C = (y = t.getAnimationEffectsManager) == null ? void 0 : y.call(t);
    return (b = C == null ? void 0 : C.shouldAnimateNote) != null && b.call(C, c) ? (((x = C.getVibratoYOffset) == null ? void 0 : x.call(C, c.color)) ?? 0) * A : 0;
  }
  function h(c, N, A) {
    const { cellHeight: C } = A, m = C / 2 * 0.12, y = c.uuid;
    if (!y) return 0;
    const b = N.filter(
      (T) => !T.isDrum && T.row === c.row && T.startColumnIndex === c.startColumnIndex && T.uuid && T.uuid !== y && g(T)
    );
    if (b.length === 0) return 0;
    const x = [c, ...b];
    return x.sort((T, M) => i(T.uuid) - i(M.uuid)), x.findIndex((T) => T.uuid === y) * m;
  }
  function p(c, N) {
    var E, P, B;
    const A = (E = t.getDegreeForNote) == null ? void 0 : E.call(t, c);
    if (!A) return { label: null, isAccidental: !1 };
    if (!(((P = t.hasAccidental) == null ? void 0 : P.call(t, A)) ?? !1)) return { label: A, isAccidental: !1 };
    const m = N.accidentalMode || {}, y = m.sharp ?? !0, b = m.flat ?? !0;
    if (!y && !b) return { label: null, isAccidental: !0 };
    let x = A.includes(ue) ? A : null, O = A.includes(he) ? A : null;
    const T = (B = t.getEnharmonicDegree) == null ? void 0 : B.call(t, A);
    T && (T.includes(ue) && !x && (x = T), T.includes(he) && !O && (O = T));
    let M = null;
    if (y && b) {
      const L = [];
      x && L.push(x), O && (!x || O !== x) && L.push(O), M = L.join(te), M || (M = A);
    } else y ? M = x || A : b && (M = O || A);
    return { label: M, isAccidental: !0 };
  }
  function a(c) {
    if (!c) return { multiplier: 1, category: "natural" };
    const N = c.includes(he), A = c.includes(ue), C = c.includes(te);
    return !N && !A ? { multiplier: 1, category: "natural" } : C ? { multiplier: 0.75, category: "both-accidentals" } : { multiplier: 0.88, category: "single-accidental" };
  }
  function f(c, N, A, C, m, y) {
    const { label: b } = p(N, A);
    if (!b) return;
    const { multiplier: x, category: O } = a(b);
    let T;
    if (N.shape === "circle") {
      const M = y * 2 * Kt;
      switch (O) {
        case "natural":
          T = M;
          break;
        case "single-accidental":
          T = M * 0.8;
          break;
        case "both-accidentals":
          T = M * 0.4;
          break;
        default:
          T = M * x;
      }
    } else {
      const M = y * 2 * Yt;
      switch (O) {
        case "natural":
          T = M * 1.5;
          break;
        case "single-accidental":
          T = M * 1.2;
          break;
        case "both-accidentals":
          T = M;
          break;
        default:
          T = M * x;
      }
    }
    if (!(T < Qt))
      if (c.fillStyle = "#212529", c.font = `bold ${T}px 'Atkinson Hyperlegible', sans-serif`, c.textAlign = "center", c.textBaseline = "middle", N.shape === "oval" && O === "both-accidentals" && b.includes(te)) {
        const M = b.split(te), E = T * 1.1, P = E * (M.length - 1), B = m - P / 2;
        M.forEach((L, R) => {
          const D = B + R * E, F = T * 0.08;
          c.fillText(L.trim(), C, D + F);
        });
      } else {
        const M = T * 0.08;
        c.fillText(b, C, m + M);
      }
  }
  function l(c, N, A) {
    var M, E;
    const C = (M = t.getAnimationEffectsManager) == null ? void 0 : M.call(t), m = C == null ? void 0 : C.hasReverbEffect;
    if (!(typeof m == "function" ? m(N.color) : !!m)) return { shouldApply: !1, blur: 0, spread: 0 };
    const { cellWidth: b } = A, x = (E = C == null ? void 0 : C.getReverbEffect) == null ? void 0 : E.call(C, N.color);
    if (!x) return { shouldApply: !1, blur: 0, spread: 0 };
    const O = x.blur * (b / 2), T = x.spread * (b / 3);
    return { shouldApply: O > 0 || T > 0, blur: O, spread: T };
  }
  function r(c, N, A, C, m, y, b) {
    var M, E, P;
    const x = (M = t.getAnimationEffectsManager) == null ? void 0 : M.call(t);
    if (!((E = x == null ? void 0 : x.hasDelayEffect) != null && E.call(x, N.color))) return;
    const { cellWidth: O } = A, T = (P = x.getDelayEffects) == null ? void 0 : P.call(x, N.color);
    !T || T.length === 0 || T.forEach((B) => {
      const L = B.delay / 500 * O * 2, R = C + L, D = y * B.scale, F = b * B.scale;
      c.save(), c.globalAlpha = B.opacity * 0.6, c.beginPath(), c.ellipse(R, m, D, F, 0, 0, 2 * Math.PI), c.strokeStyle = N.color, c.lineWidth = Math.max(0.5, D * 0.1), c.setLineDash([2, 2]), c.stroke(), c.restore();
    });
  }
  function S(c, N, A, C, m, y) {
    var M, E, P;
    const b = (M = t.getAnimationEffectsManager) == null ? void 0 : M.call(t);
    if (!((E = b == null ? void 0 : b.shouldFillNote) != null && E.call(b, N))) return;
    const x = ((P = b.getFillLevel) == null ? void 0 : P.call(b, N)) ?? 0;
    if (x <= 0) return;
    c.save();
    const O = 1 - x, T = c.createRadialGradient(A, C, 0, A, C, Math.max(m, y));
    T.addColorStop(0, "transparent"), T.addColorStop(Math.max(0, O - 0.05), "transparent"), T.addColorStop(O, `${N.color}1F`), T.addColorStop(1, `${N.color}BF`), c.beginPath(), c.ellipse(A, C, m, y, 0, 0, 2 * Math.PI), c.clip(), c.fillStyle = T, c.fillRect(A - m - 10, C - y - 10, (m + 10) * 2, (y + 10) * 2), c.restore();
  }
  function o(c, N, A, C, m, y) {
    var B, L, R;
    const b = (B = t.getAnimationEffectsManager) == null ? void 0 : B.call(t);
    if (!((L = b == null ? void 0 : b.shouldFillNote) != null && L.call(b, N))) return;
    const x = ((R = b.getFillLevel) == null ? void 0 : R.call(b, N)) ?? 0;
    if (x <= 0) return;
    c.save(), c.beginPath(), c.arc(A, m, y, Math.PI / 2, -Math.PI / 2, !1), c.lineTo(C, m - y), c.arc(C, m, y, -Math.PI / 2, Math.PI / 2, !1), c.lineTo(A, m + y), c.closePath(), c.clip();
    const O = (A + C) / 2, T = C - A, M = Math.max(T / 2 + y, y), E = 1 - x, P = c.createRadialGradient(O, m, 0, O, m, M);
    P.addColorStop(0, "transparent"), P.addColorStop(Math.max(0, E - 0.05), "transparent"), P.addColorStop(E, `${N.color}1F`), P.addColorStop(1, `${N.color}BF`), c.fillStyle = P, c.fillRect(A - y - 10, m - y - 10, T + (y + 10) * 2, (y + 10) * 2), c.restore();
  }
  function u(c, N, A, C, m, y, b, x) {
    if (o(c, N, C, m, y, b), c.save(), c.beginPath(), c.arc(C, y, b, Math.PI / 2, -Math.PI / 2, !1), c.lineTo(m, y - b), c.arc(m, y, b, -Math.PI / 2, Math.PI / 2, !1), c.lineTo(C, y + b), c.closePath(), c.strokeStyle = N.color, c.lineWidth = x, c.shadowColor = N.color, c.shadowBlur = Z, c.stroke(), c.shadowBlur = 0, c.shadowColor = "transparent", c.restore(), A.degreeDisplayMode !== "off") {
      const O = (C + m) / 2;
      f(c, N, A, O, y, b);
    }
  }
  function v(c, N, A, C) {
    const { cellWidth: m, cellHeight: y, tempoModulationMarkers: b, placedNotes: x } = N, O = e.getRowY(C, N), T = s(A, N), M = O + T, E = e.getColumnX(A.startColumnIndex, N);
    let P;
    if (b && b.length > 0 ? P = e.getColumnX(A.startColumnIndex + 1, N) - E : P = m, !n(P, y)) return;
    const B = d(A, x, N), L = E + P + B, R = Math.max(Zt, P * en), D = y / 2 - R / 2, F = g(A), G = N.longNoteStyle || "style1";
    if (F && G === "style2") {
      const W = L, H = e.getColumnX(A.endColumnIndex, N);
      if (!n(H - W, D)) return;
      u(c, A, N, W, H, M, D, R);
      return;
    }
    if (F) {
      const W = e.getColumnX(A.endColumnIndex + 1, N), H = h(A, x, N), q = M + H;
      c.beginPath(), c.moveTo(L, q), c.lineTo(W, q), c.strokeStyle = A.color, c.lineWidth = Math.max(nn, P * tn), c.stroke();
    }
    const _ = P - R / 2;
    if (!n(_, D)) return;
    r(c, A, N, L, M, _, D), c.save(), S(c, A, L, M, _, D);
    const $ = l(c, A, N);
    $.shouldApply && (c.shadowColor = A.color, c.shadowBlur = Z + $.blur, c.shadowOffsetX = $.spread), c.beginPath(), c.ellipse(L, M, _, D, 0, 0, 2 * Math.PI), c.strokeStyle = A.color, c.lineWidth = R, $.shouldApply || (c.shadowColor = A.color, c.shadowBlur = Z), c.stroke(), c.shadowBlur = 0, c.shadowColor = "transparent", c.shadowOffsetX = 0, c.restore(), N.degreeDisplayMode !== "off" && f(c, A, N, L, M, _);
  }
  function I(c, N, A, C) {
    const { columnWidths: m, cellWidth: y, cellHeight: b, tempoModulationMarkers: x, placedNotes: O } = N, T = e.getRowY(C, N), M = s(A, N), E = T + M, P = e.getColumnX(A.startColumnIndex, N);
    let B;
    if (x && x.length > 0 ? B = e.getColumnX(A.startColumnIndex + 1, N) - P : B = (m[A.startColumnIndex] ?? 1) * y, !n(B, b)) return;
    const L = d(A, O, N), R = Math.max(0.5, B * 0.15), D = P + B / 2 + L, F = B / 2 - R / 2, G = b / 2 - R / 2;
    if (!n(F, G)) return;
    r(c, A, N, D, E, F, G), c.save(), S(c, A, D, E, F, G);
    const _ = l(c, A, N);
    _.shouldApply && (c.shadowColor = A.color, c.shadowBlur = Z + _.blur, c.shadowOffsetX = _.spread), c.beginPath(), c.ellipse(D, E, F, G, 0, 0, 2 * Math.PI), c.strokeStyle = A.color, c.lineWidth = R, _.shouldApply || (c.shadowColor = A.color, c.shadowBlur = Z), c.stroke(), c.shadowBlur = 0, c.shadowColor = "transparent", c.shadowOffsetX = 0, c.restore(), N.degreeDisplayMode !== "off" && f(c, A, N, D, E, F);
  }
  return {
    drawTwoColumnOvalNote: v,
    drawSingleColumnOvalNote: I,
    hasVisibleTail: g
  };
}
function sn(t) {
  const { coords: e } = t;
  function i(n, d) {
    const { fullRowData: s, canvasWidth: h, cellHeight: p } = d, { startRow: a, endRow: f } = e.getVisibleRowRange();
    for (let l = a; l <= f; l++) {
      const r = s[l];
      if (!r) continue;
      const S = e.getRowY(l, d), o = e.getPitchClass(r.toneNote), u = e.getLineStyleFromPitchClass(o);
      if (n.beginPath(), n.moveTo(0, S), n.lineTo(h, S), n.strokeStyle = u.color, n.lineWidth = u.lineWidth, n.setLineDash(u.dash), n.stroke(), n.setLineDash([]), o === "G") {
        const v = p / 2;
        n.fillStyle = "#f8f9fa", n.fillRect(0, S - v, h, v);
      }
    }
  }
  function g(n, d) {
    var v, I, c, N;
    const {
      columnWidths: s,
      macrobeatBoundaryStyles: h,
      hasAnacrusis: p,
      canvasHeight: a
    } = d, f = ((v = t.getPlacedTonicSigns) == null ? void 0 : v.call(t)) ?? [], l = ((I = t.getTonicSpanColumnIndices) == null ? void 0 : I.call(t, f)) ?? /* @__PURE__ */ new Set(), r = ((c = t.getAnacrusisColors) == null ? void 0 : c.call(t)) ?? {
      background: "rgba(173, 181, 189, 0.15)",
      border: "rgba(173, 181, 189, 0.3)"
    };
    let S = p, o = 0, u = 0;
    for (let A = 0; A <= s.length; A++) {
      const C = e.getColumnX(A, d), m = (N = t.getMacrobeatInfo) == null ? void 0 : N.call(t, u);
      if (m && m.startColumn === A) {
        const b = h[u] ?? "solid";
        S && b === "solid" && (n.fillStyle = r.background, n.fillRect(o, 0, C - o, a), S = !1), n.beginPath(), n.moveTo(C, 0), n.lineTo(C, a), b === "anacrusis" ? (n.strokeStyle = r.border, n.setLineDash([5, 5]), n.lineWidth = 1) : b === "dashed" ? (n.strokeStyle = "#adb5bd", n.setLineDash([5, 5]), n.lineWidth = 1) : (n.strokeStyle = "#adb5bd", n.setLineDash([]), n.lineWidth = 2), n.stroke(), n.setLineDash([]), u++;
      } else A > 0 && !l.has(A - 1) && (n.beginPath(), n.moveTo(C, 0), n.lineTo(C, a), n.strokeStyle = "#dee2e6", n.lineWidth = 1, n.stroke());
      if (l.has(A)) {
        const b = (s[A] ?? 1) * d.cellWidth;
        n.fillStyle = "rgba(255, 193, 7, 0.1)", n.fillRect(C, 0, b, a);
      }
    }
  }
  return {
    drawHorizontalLines: i,
    drawVerticalLines: g
  };
}
function Wn(t, e, i) {
  const g = t.canvas.width, n = t.canvas.height;
  t.clearRect(0, 0, g, n);
  const d = kt({
    getViewportInfo: i.getViewportInfo,
    columnToPixelX: i.columnToPixelX ? (S, o) => i.columnToPixelX(S, e) : void 0,
    pixelXToColumn: i.pixelXToColumn ? (S, o) => i.pixelXToColumn(S, e) : void 0
  }), s = sn({
    coords: d,
    getMacrobeatInfo: i.getMacrobeatInfo,
    getPlacedTonicSigns: () => e.placedTonicSigns,
    getTonicSpanColumnIndices: i.getTonicSpanColumnIndices,
    getAnacrusisColors: i.getAnacrusisColors
  }), h = on({
    coords: d,
    getDegreeForNote: i.getDegreeForNote,
    hasAccidental: i.hasAccidental,
    getEnharmonicDegree: i.getEnharmonicDegree,
    getAnimationEffectsManager: i.getAnimationEffectsManager
  }), p = {
    ...e,
    canvasWidth: g,
    canvasHeight: n
  }, a = {
    ...e,
    placedNotes: e.placedNotes
  };
  s.drawHorizontalLines(t, p), s.drawVerticalLines(t, p);
  const { startRow: f, endRow: l } = d.getVisibleRowRange(), r = e.placedNotes.filter((S) => {
    if (S.isDrum) return !1;
    const o = S.globalRow ?? S.row;
    return o >= f && o <= l;
  });
  for (const S of r) {
    const o = S.globalRow ?? S.row;
    S.shape === "circle" ? h.drawTwoColumnOvalNote(t, a, S, o) : h.drawSingleColumnOvalNote(t, a, S, o);
  }
  for (const S of e.placedTonicSigns) {
    const o = S.globalRow ?? S.row;
    o >= f && o <= l && an(t, e, S, d);
  }
}
function an(t, e, i, g) {
  const { cellWidth: n, cellHeight: d } = e, s = g.getRowY(i.globalRow ?? i.row, e), h = g.getColumnX(i.columnIndex, e), p = n * 2, a = h + p / 2, f = Math.min(p, d) / 2 * 0.9;
  if (f < 2 || (t.beginPath(), t.arc(a, s, f, 0, 2 * Math.PI), t.strokeStyle = "#212529", t.lineWidth = Math.max(0.5, n * 0.05), t.stroke(), i.tonicNumber == null)) return;
  const l = i.tonicNumber.toString(), r = f * 1.5;
  r < 6 || (t.fillStyle = "#212529", t.font = `bold ${r}px 'Atkinson Hyperlegible', sans-serif`, t.textAlign = "center", t.textBaseline = "middle", t.fillText(l, a, s));
}
const rn = ["H", "M", "L"];
function ln(t) {
  if (t.length === 0) return [];
  const e = [...t].sort((g, n) => g.start - n.start), i = [];
  for (const g of e) {
    if (i.length === 0) {
      i.push({ ...g });
      continue;
    }
    const n = i[i.length - 1];
    g.start <= n.end ? n.end = Math.max(n.end, g.end) : i.push({ ...g });
  }
  return i;
}
function cn(t, e, i) {
  const g = /* @__PURE__ */ new Set([t, e]);
  i.forEach((s) => {
    const h = Math.max(t, Math.min(e, s.start)), p = Math.max(t, Math.min(e, s.end));
    p > h && (g.add(h), g.add(p));
  });
  const n = Array.from(g).sort((s, h) => s - h), d = [];
  for (let s = 0; s < n.length - 1; s++) {
    const h = n[s], p = n[s + 1], a = (h + p) / 2, f = i.some((l) => a >= l.start && a < l.end);
    p > h && d.push({ from: h, to: p, light: f });
  }
  return d;
}
function je(t, e) {
  return e.some(
    (i) => t === i.columnIndex || t === i.columnIndex + 1
  );
}
function dn(t, e) {
  return !e.some((i) => t === i.columnIndex + 1);
}
function ke(t, e, i, g, n, d, s = 1) {
  const h = i + n / 2, p = g + d / 2, a = Math.min(n, d) * 0.4 * s;
  if (t.beginPath(), e === 0)
    t.moveTo(h, p - a), t.lineTo(h - a, p + a), t.lineTo(h + a, p + a), t.closePath();
  else if (e === 1)
    t.moveTo(h, p - a), t.lineTo(h + a, p), t.lineTo(h, p + a), t.lineTo(h - a, p), t.closePath();
  else {
    for (let l = 0; l < 5; l++) {
      const r = 2 * Math.PI / 5 * l - Math.PI / 2, S = h + a * Math.cos(r), o = p + a * Math.sin(r);
      l === 0 ? t.moveTo(S, o) : t.lineTo(S, o);
    }
    t.closePath();
  }
  t.fill();
}
function un(t) {
  const { coords: e } = t, i = {
    stroke: "#c7cfd8"
  };
  function g(p, a) {
    const f = [];
    return a !== null && a > 0 && f.push({
      start: e.getColumnX(0, p),
      end: e.getColumnX(a, p)
    }), p.placedTonicSigns.forEach((l) => {
      const r = e.getColumnX(l.columnIndex, p), S = e.getColumnX(l.columnIndex + 2, p);
      f.push({ start: r, end: S });
    }), ln(f);
  }
  function n(p) {
    if (!p.hasAnacrusis || !t.getMacrobeatInfo) return null;
    const a = p.macrobeatBoundaryStyles.findIndex(
      (l) => l === "solid"
    );
    if (a < 0) return null;
    const f = t.getMacrobeatInfo(a);
    return f ? f.endColumn + 1 : null;
  }
  function d(p, a, f) {
    var A, C;
    const {
      columnWidths: l,
      musicalColumnWidths: r,
      macrobeatGroupings: S,
      macrobeatBoundaryStyles: o,
      placedTonicSigns: u
    } = a, I = (r && r.length > 0 ? r : l).length, c = [];
    for (let m = 0; m < S.length; m++) {
      const y = (A = t.getMacrobeatInfo) == null ? void 0 : A.call(t, m);
      y && c.push(y.endColumn + 1);
    }
    const N = ((C = t.getAnacrusisColors) == null ? void 0 : C.call(t)) ?? i;
    for (let m = 0; m <= I; m++) {
      const y = m === 0 || m === I, b = je(m, u), x = u.some((P) => m === P.columnIndex + 2), O = c.includes(m);
      if (!dn(m, u)) continue;
      let M = null;
      if (y || b || x)
        M = { lineWidth: 2, strokeStyle: "#adb5bd", dash: [] };
      else if (O) {
        const P = c.indexOf(m), B = o[P];
        B === "anacrusis" ? M = { lineWidth: 1, strokeStyle: N.stroke, dash: [4, 4] } : M = {
          lineWidth: 1,
          strokeStyle: "#adb5bd",
          dash: B === "solid" ? [] : [5, 5]
        };
      }
      if (!M) continue;
      const E = e.getColumnX(m, a);
      p.beginPath(), p.moveTo(E, 0), p.lineTo(E, f), p.lineWidth = M.lineWidth, p.strokeStyle = M.strokeStyle, p.setLineDash(M.dash), p.stroke();
    }
    p.setLineDash([]);
  }
  function s(p, a, f, l) {
    var v;
    const r = n(a), S = g(a, r), o = cn(0, l, S), u = ((v = t.getAnacrusisColors) == null ? void 0 : v.call(t)) ?? i;
    for (let I = 0; I < 4; I++) {
      const c = I * f;
      o.forEach((N) => {
        N.to <= N.from || (p.beginPath(), p.moveTo(N.from, c), p.lineTo(N.to, c), p.strokeStyle = N.light ? u.stroke : "#ced4da", p.lineWidth = 1, p.globalAlpha = N.light ? 0.6 : 1, p.stroke(), p.globalAlpha = 1);
      });
    }
  }
  function h(p, a, f) {
    var I;
    const { placedNotes: l, columnWidths: r, cellWidth: S, placedTonicSigns: o, tempoModulationMarkers: u } = a, v = r.length + 4;
    for (let c = 0; c < v; c++) {
      if (je(c, o)) continue;
      const N = e.getColumnX(c, a);
      let A;
      u && u.length > 0 ? A = e.getColumnX(c + 1, a) - N : A = (r[c] ?? 0) * S;
      for (let C = 0; C < 3; C++) {
        const m = C * f, y = rn[C], b = l.find(
          (x) => x.isDrum && (typeof x.drumTrack == "number" ? String(x.drumTrack) : x.drumTrack) === y && x.startColumnIndex === c
        );
        if (b) {
          p.fillStyle = b.color;
          const x = ((I = t.getAnimationScale) == null ? void 0 : I.call(t, c, y)) ?? 1;
          ke(p, C, N, m, A, f, x);
        } else
          p.fillStyle = "#ced4da", p.beginPath(), p.arc(N + A / 2, m + f / 2, 2, 0, Math.PI * 2), p.fill();
      }
    }
  }
  return {
    drawVerticalLines: d,
    drawHorizontalLines: s,
    drawDrumNotes: h,
    drawDrumShape: ke,
    buildLightRanges: g,
    getAnacrusisEndColumn: n
  };
}
function qn(t, e, i) {
  var a;
  const g = t.canvas.width, n = t.canvas.height;
  t.clearRect(0, 0, g, n);
  const d = e.baseDrumRowHeight ?? 30, s = e.drumHeightScaleFactor ?? 1.5, h = Math.max(d, s * e.cellHeight), p = un(i);
  p.drawHorizontalLines(t, e, h, g), p.drawVerticalLines(t, e, n), p.drawDrumNotes(t, e, h), i.renderModulationMarkers && ((a = e.tempoModulationMarkers) != null && a.length) && i.renderModulationMarkers(t, e);
}
const me = {
  onsetToleranceMs: 100,
  releaseToleranceMs: 150,
  pitchToleranceCents: 50,
  hitThreshold: 70,
  // 70% of note duration with correct pitch
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
  }, i = /* @__PURE__ */ new Map(), g = /* @__PURE__ */ new Map();
  function n(l, r) {
    return (l - r) * 100;
  }
  function d(l, r) {
    return Math.abs(n(l.midi, r)) <= e.pitchToleranceCents;
  }
  function s(l, r) {
    return l.length === 0 ? 0 : l.reduce((o, u) => o + Math.abs(n(u.midi, r)), 0) / l.length;
  }
  function h(l, r, S, o) {
    if (l.length === 0) return 0;
    const u = l.filter((I) => d(I, r));
    if (u.length === 0) return 0;
    let v = 0;
    for (let I = 0; I < u.length; I++) {
      const c = u[I];
      if (!c)
        continue;
      const N = u[I + 1];
      if (N)
        v += N.timeMs - c.timeMs;
      else {
        const A = S + o, C = Math.min(50, A - c.timeMs);
        v += C;
      }
    }
    return v / o * 100;
  }
  function p(l, r, S) {
    const o = e.accuracyTiers;
    if (!o) return "okay";
    const u = Math.abs(l);
    return u <= o.perfect.onsetMs && r <= o.perfect.pitchCents && S >= o.perfect.coverage ? "perfect" : u <= o.good.onsetMs && r <= o.good.pitchCents && S >= o.good.coverage ? "good" : u <= o.okay.onsetMs && r <= o.okay.pitchCents && S >= o.okay.coverage ? "okay" : "miss";
  }
  function a(l) {
    const { note: r, samples: S, onsetSample: o, releaseSample: u } = l;
    let v = 0;
    o ? v = o.timeMs - r.startTimeMs : v = e.onsetToleranceMs * 2;
    let I = 0;
    const c = r.startTimeMs + r.durationMs;
    u ? I = u.timeMs - c : I = e.releaseToleranceMs * 2;
    const N = s(S, r.midi), A = h(
      S,
      r.midi,
      r.startTimeMs,
      r.durationMs
    ), C = Math.abs(v) <= e.onsetToleranceMs, m = Math.abs(I) <= e.releaseToleranceMs, y = A >= e.hitThreshold, b = C && m && y ? "hit" : "miss", x = p(
      v,
      N,
      A
    );
    return {
      hitStatus: b,
      onsetAccuracyMs: v,
      releaseAccuracyMs: I,
      pitchAccuracyCents: N,
      pitchCoverage: A,
      pitchSamples: [...S],
      accuracyTier: x
    };
  }
  return {
    startNote(l, r) {
      i.set(l, {
        note: r,
        samples: [],
        onsetSample: null,
        releaseSample: null,
        startedAt: performance.now()
      });
    },
    recordPitchSample(l) {
      for (const [r, S] of i) {
        const { note: o } = S, u = o.startTimeMs + o.durationMs, v = e.onsetToleranceMs, I = e.releaseToleranceMs;
        l.timeMs >= o.startTimeMs - v && l.timeMs <= u + I && (S.samples.push(l), !S.onsetSample && l.timeMs >= o.startTimeMs - v && l.timeMs <= o.startTimeMs + v && d(l, o.midi) && (S.onsetSample = l), l.timeMs >= u - I && l.timeMs <= u + I && (S.releaseSample = l));
      }
    },
    endNote(l) {
      const r = i.get(l);
      if (!r) return null;
      const S = a(r);
      return g.set(l, S), i.delete(l), S;
    },
    getCurrentPerformance(l) {
      const r = i.get(l);
      if (!r) return null;
      const { note: S, samples: o, onsetSample: u } = r;
      let v = 0;
      u && (v = u.timeMs - S.startTimeMs);
      const I = s(o, S.midi), c = h(
        o,
        S.midi,
        S.startTimeMs,
        S.durationMs
      );
      return {
        onsetAccuracyMs: v,
        pitchAccuracyCents: I,
        pitchCoverage: c,
        pitchSamples: [...o]
      };
    },
    getAllPerformances() {
      return new Map(g);
    },
    reset() {
      i.clear(), g.clear();
    },
    dispose() {
      i.clear(), g.clear();
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
  }, { stateCallbacks: i, eventCallbacks: g, visualCallbacks: n, logger: d } = e, s = {
    isPlaying: !1,
    isPaused: !1,
    currentTimeMs: 0,
    scrollOffset: 0,
    onrampComplete: !1,
    targetNotes: [],
    activeNotes: /* @__PURE__ */ new Set(),
    startTime: null
  }, h = hn(e.feedbackConfig);
  let p = null;
  const a = /* @__PURE__ */ new Set();
  function f() {
    const m = 60 / i.getTempo() * 1e3;
    return e.leadInBeats * m;
  }
  function l() {
    return i.getViewportWidth() * e.judgmentLinePosition;
  }
  function r(C) {
    const m = e.pixelsPerSecond / 1e3, y = l(), b = f();
    return (C + b) * m - y;
  }
  function S(C) {
    const m = l(), y = i.getCellWidth(), b = C.startColumn * y - s.scrollOffset, x = C.endColumn * y - s.scrollOffset, T = e.feedbackConfig.onsetToleranceMs / 1e3 * e.pixelsPerSecond;
    return b <= m + T && x >= m - T;
  }
  function o() {
    var m, y;
    const C = /* @__PURE__ */ new Set();
    for (const b of s.targetNotes) {
      const x = b.startTimeMs + b.durationMs, O = e.feedbackConfig.onsetToleranceMs;
      if (s.currentTimeMs >= b.startTimeMs - O && s.currentTimeMs <= x + O)
        C.add(b.id), s.activeNotes.has(b.id) || (h.startNote(b.id, b), d == null || d.debug("NoteHighway", `Note ${b.id} became active`, { note: b }));
      else if (s.activeNotes.has(b.id)) {
        const T = h.endNote(b.id);
        if (T) {
          b.performance = T;
          const M = { noteId: b.id, note: b, performance: T };
          T.hitStatus === "hit" ? (g.emit("noteHit", M), (m = n == null ? void 0 : n.onNoteHit) == null || m.call(n, b.id, T.accuracyTier || "okay"), d == null || d.info("NoteHighway", `Note hit: ${b.id}`, T)) : (g.emit("noteMissed", M), (y = n == null ? void 0 : n.onNoteMiss) == null || y.call(n, b.id), d == null || d.info("NoteHighway", `Note missed: ${b.id}`, T));
        }
      }
    }
    s.activeNotes = C;
  }
  function u() {
    for (const C of s.targetNotes) {
      const m = S(C), y = a.has(C.id);
      m && !y ? (a.add(C.id), g.emit("noteEntered", { noteId: C.id, note: C })) : !m && y && (a.delete(C.id), g.emit("noteExited", { noteId: C.id, note: C }));
    }
  }
  function v() {
    var C, m;
    if (!s.onrampComplete)
      if (s.currentTimeMs >= 0)
        s.onrampComplete = !0, g.emit("onrampComplete"), (C = n == null ? void 0 : n.clearOnrampCountdown) == null || C.call(n), d == null || d.info("NoteHighway", "Onramp complete", null);
      else {
        const b = 60 / i.getTempo() * 1e3, x = Math.abs(s.currentTimeMs), O = Math.ceil(x / b);
        (m = n == null ? void 0 : n.updateOnrampCountdown) == null || m.call(n, O);
      }
  }
  function I() {
    if (!s.isPlaying || s.isPaused || !s.startTime) {
      p = null;
      return;
    }
    const C = performance.now(), m = f();
    s.currentTimeMs = C - s.startTime - m, s.scrollOffset = r(s.currentTimeMs), v(), o(), u(), p = requestAnimationFrame(I);
  }
  function c() {
    p || (p = requestAnimationFrame(I));
  }
  function N() {
    p && (cancelAnimationFrame(p), p = null);
  }
  return {
    init(C) {
      s.targetNotes = C, d == null || d.info("NoteHighway", `Initialized with ${C.length} notes`, null);
    },
    start() {
      s.isPlaying || (s.isPlaying = !0, s.isPaused = !1, s.currentTimeMs = -f(), s.scrollOffset = r(s.currentTimeMs), s.onrampComplete = !1, s.activeNotes.clear(), s.startTime = performance.now(), a.clear(), h.reset(), c(), g.emit("playbackStarted"), d == null || d.info("NoteHighway", "Playback started", { onrampDurationMs: f() }));
    },
    pause() {
      !s.isPlaying || s.isPaused || (s.isPaused = !0, N(), g.emit("playbackPaused"), d == null || d.info("NoteHighway", "Playback paused", { currentTimeMs: s.currentTimeMs }));
    },
    resume() {
      if (!s.isPlaying || !s.isPaused || !s.startTime) return;
      const C = performance.now() - (s.startTime + s.currentTimeMs + f());
      s.startTime += C, s.isPaused = !1, c(), g.emit("playbackResumed"), d == null || d.info("NoteHighway", "Playback resumed", null);
    },
    stop() {
      var m, y;
      if (!s.isPlaying) return;
      s.isPlaying = !1, s.isPaused = !1, s.currentTimeMs = 0, s.scrollOffset = 0, s.onrampComplete = !1, s.activeNotes.clear(), s.startTime = null, a.clear(), N(), (m = n == null ? void 0 : n.clearCanvas) == null || m.call(n), (y = n == null ? void 0 : n.clearOnrampCountdown) == null || y.call(n), g.emit("playbackStopped"), s.targetNotes.every((b) => b.performance !== void 0) && g.emit("performanceComplete"), d == null || d.info("NoteHighway", "Playback stopped", null);
    },
    setScrollOffset(C) {
      if (s.currentTimeMs = C, s.scrollOffset = r(C), s.isPlaying) {
        const m = f();
        s.startTime = performance.now() - (C + m);
      }
      d == null || d.debug("NoteHighway", "Scroll offset set", { timeMs: C, scrollOffset: s.scrollOffset });
    },
    recordPitchInput(C, m, y) {
      if (!s.isPlaying || s.isPaused || !e.inputSources.includes(y)) return;
      const b = {
        timeMs: s.currentTimeMs,
        midi: C,
        clarity: m,
        source: y
      };
      h.recordPitchSample(b);
    },
    getState() {
      return s;
    },
    getVisibleNotes() {
      l();
      const C = i.getViewportWidth(), m = i.getCellWidth();
      return s.targetNotes.filter((y) => {
        const b = y.startColumn * m - s.scrollOffset;
        return y.endColumn * m - s.scrollOffset >= 0 && b <= C;
      });
    },
    getPerformanceResults() {
      return h.getAllPerformances();
    },
    getFeedbackCollector() {
      return h;
    },
    dispose() {
      N(), h.dispose(), s.targetNotes = [], s.activeNotes.clear(), a.clear(), d == null || d.info("NoteHighway", "Service disposed", null);
    }
  };
}
function et(t) {
  return 60 / t / 2;
}
function mn(t, e) {
  const { timeMap: i, tempo: g, cellWidth: n } = e;
  let d, s;
  if (i && i.length > 0) {
    const a = i[t.startColumnIndex] ?? 0, f = i[t.endColumnIndex] ?? a;
    d = a * 1e3, s = f * 1e3;
  } else {
    const a = e.microbeatDurationSec ?? et(g);
    d = t.startColumnIndex * a * 1e3, s = t.endColumnIndex * a * 1e3;
  }
  const h = s - d, p = t.globalRow !== void 0 ? 108 - t.globalRow : 60;
  return {
    id: t.uuid ?? `note-${t.startColumnIndex}-${t.row}`,
    midi: p,
    startTimeMs: d,
    durationMs: h,
    startColumn: t.startColumnIndex,
    endColumn: t.endColumnIndex,
    color: t.color,
    shape: t.shape,
    globalRow: t.globalRow ?? t.row
  };
}
function fn(t, e) {
  return t.filter((g) => !g.isDrum).map((g) => mn(g, e));
}
function Un(t, e) {
  const i = [0];
  let g = 0;
  for (let n = 0; n < t.length; n++) {
    const d = t[n] ?? 1;
    g += d * e, i.push(g);
  }
  return i;
}
function Xn(t, e) {
  const i = et(t.tempo), g = {
    tempo: t.tempo,
    cellWidth: t.cellWidth,
    timeMap: e,
    microbeatDurationSec: i
  };
  return fn(t.placedNotes, g);
}
const Jn = "0.1.0";
export {
  qt as ClippingMonitor,
  jt as DEFAULT_CONTEXT_OPTIONS,
  Ut as DEFAULT_DRUM_SAMPLES,
  Vt as FilteredVoice,
  $t as GainManager,
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
  Mt as createModulationMarker,
  Hn as createNoteHighwayService,
  Un as createSimpleTimeMap,
  Bt as createStore,
  Ln as createSynthEngine,
  Ht as createTimeMapCalculator,
  _n as createTransportService,
  z as fullRowData,
  Dn as getCanvasColumnWidths,
  xn as getColumnEntry,
  Ke as getColumnEntryByCanvas,
  En as getColumnType,
  $n as getContextInfo,
  St as getInitialState,
  On as getMacrobeatBoundary,
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
  Wn as renderPitchGrid,
  ct as resolvePitchRange,
  bn as secondsToCanvasX,
  Gn as setVoiceLogger,
  In as timeToCanvas,
  Lt as timeToVisual,
  Mn as visualToCanvas,
  Gt as visualToTime
};
//# sourceMappingURL=index.js.map
