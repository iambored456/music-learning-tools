var lt = Object.defineProperty;
var ct = (n, e, o) => e in n ? lt(n, e, { enumerable: !0, configurable: !0, writable: !0, value: o }) : n[e] = o;
var X = (n, e, o) => ct(n, typeof e != "symbol" ? e + "" : e, o);
import * as x from "tone";
const Q = [
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
], ge = /* @__PURE__ */ new Map(), dt = /* @__PURE__ */ new Map();
Q.forEach((n, e) => {
  ge.set(n.toneNote, e), n.midi !== void 0 && dt.set(n.midi, e);
});
function yn(n) {
  const e = ge.get(n);
  return e !== void 0 ? Q[e] : void 0;
}
function Cn(n) {
  return Q[n];
}
function We(n) {
  return ge.get(n) ?? -1;
}
function ut(n, e) {
  const o = We(n), g = We(e);
  return o === -1 || g === -1 ? null : {
    topIndex: Math.min(o, g),
    bottomIndex: Math.max(o, g)
  };
}
const mt = {
  attack: 0.1,
  decay: 0.2,
  sustain: 0.8,
  release: 0.3
}, ht = {
  enabled: !0,
  blend: 1,
  cutoff: 16,
  resonance: 0,
  type: "lowpass",
  mix: 0
}, ft = {
  speed: 0,
  span: 0
}, pt = {
  speed: 0,
  span: 0
};
function gt() {
  const n = [
    "#4a90e2",
    // Blue
    "#2d2d2d",
    // Black
    "#d66573",
    // Red
    "#68a03f"
    // Green
  ], e = {};
  return n.forEach((o) => {
    const g = new Float32Array(32);
    g[0] = 1;
    const i = new Float32Array(32);
    e[o] = {
      name: "Sine",
      adsr: { ...mt },
      coeffs: g,
      phases: i,
      filter: { ...ht },
      activePresetName: "sine",
      gain: 1,
      vibrato: { ...ft },
      tremelo: { ...pt }
    };
  }), e;
}
function St() {
  const n = new Array(16).fill(2), e = n.slice(0, -1).map((o, g) => (g + 1) % 4 === 0 ? "solid" : "dashed");
  return {
    macrobeatGroupings: n,
    macrobeatBoundaryStyles: e,
    hasAnacrusis: !1,
    baseMicrobeatPx: 40,
    tempoModulationMarkers: []
  };
}
function yt() {
  const n = ut("G5", "C4");
  return n || {
    topIndex: 0,
    bottomIndex: Math.max(0, Q.length - 1)
  };
}
function Ct() {
  const n = gt();
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
      timbres: JSON.parse(JSON.stringify(n)),
      placedChords: [],
      sixteenthStampPlacements: [],
      tripletStampPlacements: [],
      annotations: [],
      lassoSelection: { selectedItems: [], convexHull: null, isActive: !1 }
    }],
    historyIndex: 0,
    fullRowData: [...Q],
    pitchRange: yt(),
    // --- Rhythm ---
    ...St(),
    selectedModulationRatio: null,
    // --- Timbres & Colors ---
    timbres: n,
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
function Ve(n) {
  if (!(!n || n.isDrum) && n.shape === "circle" && typeof n.startColumnIndex == "number") {
    const e = n.startColumnIndex + 1;
    (typeof n.endColumnIndex != "number" || n.endColumnIndex < e) && (n.endColumnIndex = e);
  }
}
function me(n, e) {
  if (typeof n.row != "number") return;
  const o = e.length > 0 ? e.length - 1 : -1;
  if (o < 0) return;
  const g = typeof n.globalRow == "number" ? n.globalRow : n.row, i = Math.max(0, Math.min(o, Math.round(g)));
  n.globalRow = i, n.row = i;
}
function se() {
  return `uuid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function Tt(n = {}) {
  const {
    getMacrobeatInfo: e,
    getDegreeForNote: o,
    hasAccidental: g,
    log: i = () => {
    }
  } = n;
  return {
    /**
     * Adds a note to the state.
     * IMPORTANT: This function no longer records history. The calling function is responsible for that.
     */
    addNote(a) {
      const t = this.state.placedNotes.find(
        (m) => !m.isDrum && m.row === a.row && m.startColumnIndex === a.startColumnIndex && m.color === a.color
      );
      if (t) {
        if (this.state.degreeDisplayMode !== "off" && o && g) {
          const m = o(t, this.state);
          if (m && g(m))
            return t.enharmonicPreference = !t.enharmonicPreference, i("debug", "[ENHARMONIC] Toggled enharmonic preference for note", {
              noteUuid: t.uuid,
              currentDegree: m,
              enharmonicPreference: t.enharmonicPreference
            }), this.emit("notesChanged"), t;
        }
        return null;
      }
      const d = { ...a, uuid: se() };
      return Ve(d), me(d, this.state.fullRowData), this.state.placedNotes.push(d), this.emit("notesChanged"), d;
    },
    updateNoteTail(a, t) {
      let d = t;
      a.shape === "circle" && (d = Math.max(a.startColumnIndex + 1, t)), a.endColumnIndex = d, this.emit("notesChanged");
    },
    updateMultipleNoteTails(a, t) {
      a.forEach((d) => {
        let m = t;
        d.shape === "circle" && (m = Math.max(d.startColumnIndex + 1, t)), d.endColumnIndex = m;
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
    updateNoteRow(a, t) {
      a.row = t, a.globalRow = t, this.emit("notesChanged");
    },
    updateMultipleNoteRows(a, t) {
      a.forEach((d, m) => {
        const r = t[m];
        r !== void 0 && (d.row = r, me(d, this.state.fullRowData));
      }), this.emit("notesChanged");
    },
    updateNotePosition(a, t) {
      a.startColumnIndex = t, a.endColumnIndex = a.shape === "circle" ? t + 1 : t, this.emit("notesChanged");
    },
    updateMultipleNotePositions(a, t) {
      a.forEach((d) => {
        d.startColumnIndex = t, d.endColumnIndex = d.shape === "circle" ? t + 1 : t;
      }), this.emit("notesChanged");
    },
    removeNote(a) {
      const t = this.state.placedNotes.indexOf(a);
      t > -1 && (this.state.placedNotes.splice(t, 1), this.emit("notesChanged"));
    },
    removeMultipleNotes(a) {
      const t = new Set(a);
      this.state.placedNotes = this.state.placedNotes.filter((d) => !t.has(d)), this.emit("notesChanged");
    },
    eraseInPitchArea(a, t, d = 1, m = !0) {
      const r = a + d - 1, h = t - 1, c = t + 1;
      let l = !1;
      const N = this.state.placedNotes.length;
      return this.state.placedNotes = this.state.placedNotes.filter((s) => {
        if (s.isDrum) return !0;
        if (s.shape === "circle") {
          const C = s.startColumnIndex + 1, w = typeof s.endColumnIndex == "number" ? Math.max(C, s.endColumnIndex) : C, O = s.startColumnIndex <= r && w >= a, u = s.row >= h && s.row <= c;
          if (O && u)
            return !1;
        } else if (s.row >= h && s.row <= c && s.startColumnIndex <= r && s.endColumnIndex >= a)
          return !1;
        return !0;
      }), this.state.placedNotes.length < N && (l = !0), l && (this.emit("notesChanged"), m && this.recordState()), l;
    },
    eraseDrumNoteAt(a, t, d = !0) {
      const m = String(t), r = this.state.placedNotes.length;
      this.state.placedNotes = this.state.placedNotes.filter(
        (c) => !(c.isDrum && String(c.drumTrack) === m && c.startColumnIndex === a)
      );
      const h = this.state.placedNotes.length < r;
      return h && (this.emit("notesChanged"), d && this.recordState()), h;
    },
    toggleDrumNote(a) {
      const t = String(a.drumTrack), d = this.state.placedNotes.findIndex(
        (m) => m.isDrum && String(m.drumTrack) === t && m.startColumnIndex === a.startColumnIndex
      );
      if (d >= 0)
        this.state.placedNotes.splice(d, 1);
      else {
        const m = {
          ...a,
          uuid: se(),
          isDrum: !0,
          endColumnIndex: a.endColumnIndex ?? a.startColumnIndex
        };
        this.state.placedNotes.push(m);
      }
      this.emit("notesChanged"), this.recordState();
    },
    addTonicSignGroup(a) {
      i("debug", "Starting addTonicSignGroup", { tonicSignGroup: a });
      const t = a[0];
      if (!t) return;
      const { preMacrobeatIndex: d } = t;
      if (i("debug", "preMacrobeatIndex", { preMacrobeatIndex: d }), Object.entries(this.state.tonicSignGroups).find(
        ([, N]) => N.some((s) => s.preMacrobeatIndex === d)
      )) {
        i("debug", "Existing tonic already present for measure, skipping", { preMacrobeatIndex: d });
        return;
      }
      if (!e) {
        i("error", "getMacrobeatInfo callback not provided");
        return;
      }
      const r = e(this.state, d + 1).startColumn;
      i("debug", "Boundary column (canvas-space) for shifting notes", { boundaryColumn: r });
      const h = this.state.placedNotes.filter((N) => N.startColumnIndex >= r);
      i("debug", "Notes that will be shifted", {
        noteRanges: h.map((N) => `${N.startColumnIndex}-${N.endColumnIndex}`)
      }), this.state.placedNotes.forEach((N) => {
        if (N.startColumnIndex >= r) {
          const s = N.startColumnIndex, C = N.endColumnIndex;
          N.startColumnIndex = N.startColumnIndex + 2, N.endColumnIndex = N.endColumnIndex + 2, i("debug", `Shifted note from ${s}-${C} to ${N.startColumnIndex}-${N.endColumnIndex}`);
        }
      });
      const c = se(), l = a.map((N) => ({
        ...N,
        uuid: c,
        globalRow: typeof N.globalRow == "number" ? N.globalRow : N.row
      }));
      this.state.tonicSignGroups[c] = l, i("debug", "Added tonic group", { uuid: c, columns: l.map((N) => N.columnIndex) }), i("debug", "Emitting events: notesChanged, rhythmStructureChanged"), this.emit("notesChanged"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    /**
     * Erases tonic sign at the specified column index (canvas-space)
     */
    eraseTonicSignAt(a, t = !0) {
      const d = Object.entries(this.state.tonicSignGroups).find(
        ([, N]) => N.some((s) => s.columnIndex === a)
      );
      if (!d)
        return !1;
      if (!e)
        return i("error", "getMacrobeatInfo callback not provided"), !1;
      const [m, r] = d, h = r[0];
      if (!h) return !1;
      const c = h.preMacrobeatIndex, l = e(this.state, c + 1).startColumn;
      return delete this.state.tonicSignGroups[m], this.state.placedNotes.forEach((N) => {
        N.startColumnIndex >= l && (N.startColumnIndex = N.startColumnIndex - 2, N.endColumnIndex = N.endColumnIndex - 2);
      }), this.emit("notesChanged"), this.emit("rhythmStructureChanged"), t && this.recordState(), !0;
    },
    clearAllNotes() {
      this.state.placedNotes = [], this.state.tonicSignGroups = {}, this.emit("notesChanged"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    loadNotes(a) {
      const t = (a || []).map((d) => {
        const m = {
          ...d,
          uuid: (d == null ? void 0 : d.uuid) ?? se()
        };
        return Ve(m), me(m, this.state.fullRowData), m;
      });
      this.state.placedNotes = t, this.emit("notesChanged"), this.recordState();
    }
  };
}
function Nt() {
  return `sixteenth-stamp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function Mt(n = {}) {
  const {
    getPlacedTonicSigns: e,
    isWithinTonicSpan: o,
    log: g = () => {
    }
  } = n;
  return {
    /**
     * Adds a stamp placement to the state
     * @param startColumn Canvas-space column index (0 = first musical beat)
     * @returns The placement if successful, null if blocked by tonic column
     */
    addSixteenthStampPlacement(i, a, t, d = "#4a90e2") {
      const m = a + 2;
      if (e && o) {
        const l = e(this.state);
        (o(a, l) || o(a + 1, l)) && g("debug", "Cannot place sixteenth stamp - overlaps tonic column", {
          sixteenthStampId: i,
          startColumn: a,
          row: t
        });
      }
      const r = this.state.sixteenthStampPlacements.find(
        (l) => l.row === t && l.startColumn < m && l.endColumn > a
      );
      r && this.removeSixteenthStampPlacement(r.id);
      const h = t, c = {
        id: Nt(),
        sixteenthStampId: i,
        startColumn: a,
        endColumn: m,
        row: t,
        globalRow: h,
        color: d,
        timestamp: Date.now(),
        shapeOffsets: {}
      };
      return this.state.sixteenthStampPlacements.push(c), this.emit("sixteenthStampPlacementsChanged"), g("debug", `Added sixteenth stamp ${i} at canvas-space ${a}-${m},${t}`, {
        sixteenthStampId: i,
        startColumn: a,
        endColumn: m,
        row: t,
        placementId: c.id
      }), c;
    },
    /**
     * Removes a stamp placement by ID
     */
    removeSixteenthStampPlacement(i) {
      const a = this.state.sixteenthStampPlacements.findIndex((d) => d.id === i);
      if (a === -1) return !1;
      const t = this.state.sixteenthStampPlacements.splice(a, 1)[0];
      return t ? (this.emit("sixteenthStampPlacementsChanged"), g("debug", `Removed sixteenth stamp ${t.sixteenthStampId} at ${t.startColumn}-${t.endColumn},${t.row}`, {
        placementId: i,
        sixteenthStampId: t.sixteenthStampId,
        startColumn: t.startColumn,
        endColumn: t.endColumn,
        row: t.row
      }), !0) : !1;
    },
    /**
     * Removes stamps that intersect with an eraser area
     * @param eraseStartCol Canvas-space column index
     * @param eraseEndCol Canvas-space column index
     */
    eraseSixteenthStampsInArea(i, a, t, d) {
      const m = [];
      for (const h of this.state.sixteenthStampPlacements) {
        const c = h.startColumn <= a && h.endColumn >= i, l = h.row >= t && h.row <= d;
        c && l && m.push(h.id);
      }
      let r = !1;
      return m.forEach((h) => {
        this.removeSixteenthStampPlacement(h) && (r = !0);
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
    getSixteenthStampAt(i, a) {
      return this.state.sixteenthStampPlacements.find(
        (t) => t.row === a && i >= t.startColumn && i < t.endColumn
      ) || null;
    },
    /**
     * Clears all stamp placements
     */
    clearAllSixteenthStamps() {
      const i = this.state.sixteenthStampPlacements.length > 0;
      this.state.sixteenthStampPlacements = [], i && (this.emit("sixteenthStampPlacementsChanged"), g("info", "Cleared all sixteenth stamp placements"));
    },
    /**
     * Gets stamp placements for playback scheduling
     */
    getSixteenthStampPlaybackData() {
      return this.state.sixteenthStampPlacements.map((i) => {
        const a = this.state.fullRowData[i.row];
        return {
          sixteenthStampId: i.sixteenthStampId,
          column: i.startColumn,
          startColumn: i.startColumn,
          endColumn: i.endColumn,
          row: i.row,
          pitch: (a == null ? void 0 : a.toneNote) || "",
          color: i.color,
          placement: i
          // Include full placement object with shapeOffsets
        };
      }).filter((i) => i.pitch);
    },
    /**
     * Updates the pitch offset for an individual shape within a stamp
     */
    updateSixteenthStampShapeOffset(i, a, t) {
      const d = this.state.sixteenthStampPlacements.find((m) => m.id === i);
      if (!d) {
        g("warn", "[SIXTEENTH STAMP SHAPE OFFSET] Placement not found", { placementId: i });
        return;
      }
      d.shapeOffsets || (d.shapeOffsets = {}), g("debug", "[SIXTEENTH STAMP SHAPE OFFSET] Updating shape offset", {
        placementId: i,
        shapeKey: a,
        oldOffset: d.shapeOffsets[a] || 0,
        newOffset: t,
        baseRow: d.row,
        targetRow: d.row + t
      }), d.shapeOffsets[a] = t, this.emit("sixteenthStampPlacementsChanged");
    },
    /**
     * Gets the effective row for a specific shape within a stamp
     */
    getSixteenthStampShapeRow(i, a) {
      var d;
      const t = ((d = i.shapeOffsets) == null ? void 0 : d[a]) || 0;
      return i.row + t;
    }
  };
}
function At() {
  return `triplet-stamp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function vt(n = {}) {
  const {
    canvasToTime: e,
    timeToCanvas: o,
    getColumnMap: g,
    log: i = () => {
    }
  } = n;
  return {
    /**
     * Adds a triplet placement to the state
     * @param placement - The triplet placement object
     * @returns The placed triplet or null if invalid
     */
    addTripletStampPlacement(a) {
      this.state.tripletStampPlacements || (this.state.tripletStampPlacements = []);
      const t = a.startTimeIndex + a.span * 2, d = this.state.tripletStampPlacements.find((r) => r.row !== a.row ? !1 : !(r.startTimeIndex + r.span * 2 <= a.startTimeIndex || t <= r.startTimeIndex));
      if (d && this.removeTripletStampPlacement(d.id), this.state.sixteenthStampPlacements && e && g) {
        const r = g(this.state);
        this.state.sixteenthStampPlacements.filter((c) => {
          if (c.row !== a.row) return !1;
          const l = e(c.startColumn, r);
          return l === null ? !0 : !(l + 2 <= a.startTimeIndex || l >= t);
        }).forEach((c) => {
          this.removeSixteenthStampPlacement && this.removeSixteenthStampPlacement(c.id);
        });
      }
      const m = {
        id: At(),
        ...a,
        shapeOffsets: a.shapeOffsets || {}
      };
      return this.state.tripletStampPlacements.push(m), this.emit("tripletStampPlacementsChanged"), this.emit("rhythmStructureChanged"), i("debug", `Added triplet stamp ${a.tripletStampId} at time ${a.startTimeIndex}, row ${a.row}`, {
        tripletStampId: a.tripletStampId,
        startTimeIndex: a.startTimeIndex,
        span: a.span,
        row: a.row,
        placementId: m.id
      }), m;
    },
    /**
     * Removes a triplet placement by ID
     * @param placementId - The placement ID to remove
     * @returns True if a triplet was removed
     */
    removeTripletStampPlacement(a) {
      if (!this.state.tripletStampPlacements) return !1;
      const t = this.state.tripletStampPlacements.findIndex((m) => m.id === a);
      if (t === -1) return !1;
      const d = this.state.tripletStampPlacements.splice(t, 1)[0];
      return d ? (this.emit("tripletStampPlacementsChanged"), i("debug", `Removed triplet stamp ${d.tripletStampId} at time ${d.startTimeIndex}, row ${d.row}`, {
        placementId: a,
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
    eraseTripletStampsInArea(a, t, d, m) {
      if (!this.state.tripletStampPlacements || !o || !g) return !1;
      const r = g(this.state), h = [];
      for (const l of this.state.tripletStampPlacements)
        if (l.row >= d && l.row <= m) {
          const N = l.span * 2, s = o(l.startTimeIndex, r);
          s + N - 1 < a || s > t || h.push(l.id);
        }
      let c = !1;
      return h.forEach((l) => {
        this.removeTripletStampPlacement(l) && (c = !0);
      }), c;
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
    getTripletStampAt(a, t) {
      return this.state.tripletStampPlacements && this.state.tripletStampPlacements.find(
        (d) => d.row === t && a >= d.startTimeIndex && a < d.startTimeIndex + d.span * 2
      ) || null;
    },
    /**
     * Clears all triplet placements
     */
    clearAllTripletStamps() {
      if (!this.state.tripletStampPlacements) return;
      const a = this.state.tripletStampPlacements.length > 0;
      this.state.tripletStampPlacements = [], a && (this.emit("tripletStampPlacementsChanged"), i("info", "Cleared all triplet stamp placements"));
    },
    /**
     * Gets triplet placements for playback scheduling
     * @returns Array of playback data for triplets
     */
    getTripletStampPlaybackData() {
      return this.state.tripletStampPlacements ? this.state.tripletStampPlacements.map((a) => {
        const t = this.state.fullRowData[a.row];
        return {
          startTimeIndex: a.startTimeIndex,
          tripletStampId: a.tripletStampId,
          row: a.row,
          pitch: (t == null ? void 0 : t.toneNote) ?? "",
          color: a.color,
          span: a.span,
          placement: a
          // Include full placement object with shapeOffsets
        };
      }).filter((a) => a.pitch) : [];
    },
    /**
     * Updates the pitch offset for an individual shape within a triplet group
     * @param placementId - The triplet placement ID
     * @param shapeKey - The shape identifier (e.g., "triplet_0", "triplet_1", "triplet_2")
     * @param rowOffset - The pitch offset in rows (can be negative)
     */
    updateTripletStampShapeOffset(a, t, d) {
      var r;
      const m = (r = this.state.tripletStampPlacements) == null ? void 0 : r.find((h) => h.id === a);
      if (!m) {
        i("warn", "[TRIPLET STAMP SHAPE OFFSET] Placement not found", { placementId: a });
        return;
      }
      m.shapeOffsets || (m.shapeOffsets = {}), i("debug", "[TRIPLET STAMP SHAPE OFFSET] Updating shape offset", {
        placementId: a,
        shapeKey: t,
        oldOffset: m.shapeOffsets[t] || 0,
        newOffset: d,
        baseRow: m.row,
        targetRow: m.row + d
      }), m.shapeOffsets[t] = d, this.emit("tripletStampPlacementsChanged");
    },
    /**
     * Gets the effective row for a specific shape within a triplet group
     * @param placement - The triplet placement object
     * @param shapeKey - The shape identifier
     * @returns The effective row index
     */
    getTripletStampShapeRow(a, t) {
      var m;
      const d = ((m = a.shapeOffsets) == null ? void 0 : m[t]) || 0;
      return a.row + d;
    }
  };
}
const te = {
  COMPRESSION_2_3: 2 / 3,
  // 0.6666666667
  EXPANSION_3_2: 3 / 2
  // 1.5
};
function bt(n, e, o) {
  const { getMacrobeatInfo: g, log: i = () => {
  } } = o;
  if (i("debug", "[MODULATION] measureIndexToColumnIndex called", {
    measureIndex: n,
    hasState: !!e
  }), !e || !e.macrobeatGroupings) {
    i("warn", "[MODULATION] No state or macrobeatGroupings provided for measure conversion");
    const m = n * 4;
    return i("debug", "[MODULATION] Using fallback calculation", m), m;
  }
  if (n === 0)
    return i("debug", "[MODULATION] Measure 0 at canvas-space column 0"), 0;
  if (!g)
    return i("warn", "[MODULATION] getMacrobeatInfo callback not provided"), n * 4;
  const a = n - 1;
  i("debug", `[MODULATION] Converting measureIndex ${n} to macrobeatIndex: ${a}`);
  const t = g(e, a);
  if (i("debug", "[MODULATION] getMacrobeatInfo result", t), t) {
    const m = t.endColumn + 1;
    return i("debug", `[MODULATION] Found measure info, canvas-space endColumn: ${t.endColumn}, first column after: ${m}`), m;
  }
  i("warn", `[MODULATION] Could not find measure info for index: ${n}`);
  const d = n * 4;
  return i("debug", "[MODULATION] Using improved fallback calculation", d), d;
}
function wt(n, e, o = null, g = null, i = null) {
  return {
    id: `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    measureIndex: n,
    ratio: e,
    active: !0,
    xPosition: o,
    // Store the actual boundary position if provided
    columnIndex: g,
    // Store column index for stable positioning
    macrobeatIndex: i
    // Store macrobeat index for stable positioning
  };
}
function Tn(n) {
  return Math.abs(n - te.COMPRESSION_2_3) < 1e-3 ? "2:3" : Math.abs(n - te.EXPANSION_3_2) < 1e-3 ? "3:2" : `${n}`;
}
function Nn(n) {
  const e = "#ffc107";
  return Math.abs(n - te.COMPRESSION_2_3) < 1e-3 || Math.abs(n - te.EXPANSION_3_2) < 1e-3, e;
}
function qe() {
  const n = [{
    startColumn: 0,
    endColumn: 1 / 0,
    scale: 1
  }];
  return {
    segments: n,
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
      return n[0] || null;
    },
    getGhostGridPositions() {
      return [];
    }
  };
}
function Mn(n, e, o = null, g = {}) {
  const { log: i = () => {
  } } = g;
  if (!n || n.length === 0)
    return qe();
  const a = [...n.filter((c) => c.active)].sort((c, l) => c.measureIndex - l.measureIndex);
  if (a.length === 0)
    return qe();
  i("debug", "[MODULATION] Creating coordinate mapping for markers", a);
  const t = a.map((c) => {
    const l = bt(c.measureIndex, o, g);
    return i("debug", `[MODULATION] Marker at measure ${c.measureIndex} calculated column=${l}`), i("debug", "[MODULATION] Full marker data", c), i("debug", "[MODULATION] Final marker position", {
      id: c.id,
      measureIndex: c.measureIndex,
      columnIndex: l
    }), {
      ...c,
      columnIndex: l
    };
  }), d = [];
  let m = 1;
  const r = t[0];
  if (t.length === 0 || r && r.columnIndex > 0) {
    const c = r ? r.columnIndex : 1 / 0;
    d.push({
      startColumn: 0,
      endColumn: c,
      scale: 1
    });
  }
  for (let c = 0; c < t.length; c++) {
    const l = t[c], N = t[c + 1], s = N ? N.columnIndex : 1 / 0;
    m *= l.ratio, d.push({
      startColumn: l.columnIndex,
      // Canvas-space
      endColumn: s,
      // Canvas-space
      scale: m,
      marker: l
    });
  }
  return {
    segments: d,
    /**
     * Gets the modulation scale for a given column index
     * @param columnIndex - Column index in musical space
     * @returns Scale factor (1.0 = no modulation, 0.667 = compressed, 1.5 = expanded)
     */
    getScaleForColumn(c) {
      for (const l of d)
        if (c >= l.startColumn && c < l.endColumn)
          return l.scale;
      return 1;
    },
    /**
     * Converts microbeat index to canvas x position
     * NOTE: This method is deprecated - getColumnX in rendererUtils now handles modulation directly
     */
    microbeatToCanvasX(c) {
      return 0;
    },
    /**
     * Converts canvas x position to microbeat index
     * NOTE: This method is deprecated - coordinate conversion now handled by getColumnFromX
     */
    canvasXToMicrobeat(c) {
      return 0;
    },
    /**
     * Gets the segment containing a given canvas x position
     * NOTE: This method is deprecated - not used in new column-based approach
     */
    getSegmentAtX(c) {
      return d[0] || null;
    },
    /**
     * Gets all ghost grid positions for a segment
     * NOTE: This method is deprecated - ghost grid now handled differently
     */
    getGhostGridPositions(c, l) {
      return [];
    }
  };
}
function An(n, e) {
  if (n >= 0 && n < e.length) {
    const o = e[n];
    if (o !== void 0)
      return o;
  }
  return n * 0.333;
}
function vn(n, e, o) {
  return 0;
}
function bn(n, e, o) {
  return 0;
}
const He = new Array(19).fill(2), It = [
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
], Ue = new Array(16).fill(2), xt = [
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
function Xe(n, e) {
  const o = e(n), g = /* @__PURE__ */ new Map();
  o.entries.forEach((i) => {
    i.type === "tonic" && i.tonicSignUuid && typeof i.canvasIndex == "number" && g.set(i.tonicSignUuid, i.canvasIndex);
  }), Object.entries(n.tonicSignGroups || {}).forEach(([i, a]) => {
    const t = g.get(i);
    t !== void 0 && a.forEach((d) => {
      d.columnIndex = t;
    });
  });
}
const Pt = {
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
function Et(n = {}) {
  const {
    getColumnMap: e = () => Pt,
    visualToTimeIndex: o = () => null,
    timeIndexToVisualColumn: g = () => null,
    getTimeBoundaryAfterMacrobeat: i = () => 0,
    log: a = () => {
    }
  } = n;
  return {
    setAnacrusis(t) {
      var s, C, w;
      if (this.state.hasAnacrusis === t)
        return;
      const d = [...this.state.macrobeatGroupings], m = [...this.state.macrobeatBoundaryStyles], r = d.reduce((O, u) => O + u, 0);
      let h, c;
      if (t) {
        const O = this._anacrusisCache, u = He.length - Ue.length, A = He.slice(0, u), v = It.slice(0, u), p = (s = O == null ? void 0 : O.groupings) != null && s.length ? [...O.groupings] : [...A], f = (C = O == null ? void 0 : O.boundaryStyles) != null && C.length ? [...O.boundaryStyles] : [...v];
        if (h = [...p, ...d], c = [...f, ...m], !((w = O == null ? void 0 : O.boundaryStyles) != null && w.length))
          for (let M = 0; M < f.length; M++)
            c[M] = M < f.length - 1 ? "anacrusis" : "solid";
        this._anacrusisCache = null, a("debug", "rhythmActions", "Enabled anacrusis", {
          insertedCount: p.length,
          insertedColumns: p.reduce((M, b) => M + b, 0)
        }, "state");
      } else {
        const O = m.findIndex((p) => p === "solid");
        let u = 0;
        if (O !== -1)
          u = O + 1;
        else
          for (; u < m.length && m[u] === "anacrusis"; )
            u++;
        u = Math.min(u, d.length);
        const A = d.slice(0, u), v = m.slice(0, u);
        u > 0 ? this._anacrusisCache = {
          groupings: A,
          boundaryStyles: v
        } : this._anacrusisCache = null, h = d.slice(u), c = m.slice(u).map((p) => p === "anacrusis" ? "dashed" : p), h.length === 0 && (h = [...Ue], c = [...xt]), a("debug", "rhythmActions", "Disabled anacrusis", {
          removalCount: u,
          removedColumns: A.reduce((p, f) => p + f, 0)
        }, "state");
      }
      const N = h.reduce((O, u) => O + u, 0) - r;
      if (this.state.hasAnacrusis = t, this.state.macrobeatGroupings = [...h], this.state.macrobeatBoundaryStyles = [...c], Xe(this.state, e), N !== 0) {
        const O = [];
        this.state.placedNotes.forEach((f) => {
          const M = o(this.state, f.startColumnIndex, d), b = o(this.state, f.endColumnIndex, d);
          if (M === null || b === null)
            return;
          const F = M + N, $ = b + N;
          if (F < 0) {
            O.push(f);
            return;
          }
          const G = g(this.state, F, h), B = g(this.state, $, h);
          if (G === null || B === null) {
            O.push(f);
            return;
          }
          f.startColumnIndex = G, f.endColumnIndex = B;
        }), O.forEach((f) => {
          const M = this.state.placedNotes.indexOf(f);
          M > -1 && this.state.placedNotes.splice(M, 1);
        });
        const u = [];
        this.state.sixteenthStampPlacements.forEach((f) => {
          const M = o(this.state, f.startColumn, d), b = o(this.state, f.endColumn, d);
          if (M === null || b === null)
            return;
          const F = M + N, $ = b + N;
          if (F < 0) {
            u.push(f);
            return;
          }
          const G = g(this.state, F, h), B = g(this.state, $, h);
          if (G === null || B === null) {
            u.push(f);
            return;
          }
          f.startColumn = G, f.endColumn = B;
        }), u.forEach((f) => {
          const M = this.state.sixteenthStampPlacements.indexOf(f);
          M > -1 && this.state.sixteenthStampPlacements.splice(M, 1);
        });
        const A = [];
        this.state.tripletStampPlacements && (this.state.tripletStampPlacements.forEach((f) => {
          const M = f.startTimeIndex + N;
          M < 0 ? A.push(f) : f.startTimeIndex = M;
        }), A.forEach((f) => {
          const M = this.state.tripletStampPlacements.indexOf(f);
          M > -1 && this.state.tripletStampPlacements.splice(M, 1);
        }));
        const v = [], p = t ? h.length - d.length : -(d.length - h.length);
        this.state.tempoModulationMarkers.forEach((f) => {
          const M = f.measureIndex + p;
          if (M < 0) {
            v.push(f);
            return;
          }
          f.measureIndex = M, f.columnIndex = null, f.xPosition = null, f.macrobeatIndex = null;
        }), v.forEach((f) => {
          const M = this.state.tempoModulationMarkers.indexOf(f);
          M > -1 && this.state.tempoModulationMarkers.splice(M, 1);
        });
      }
      this.emit("anacrusisChanged", t), this.emit("notesChanged"), this.emit("sixteenthStampPlacementsChanged"), this.emit("tripletStampPlacementsChanged"), this.emit("tempoModulationMarkersChanged"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    toggleMacrobeatGrouping(t) {
      if (t === void 0 || t < 0 || t >= this.state.macrobeatGroupings.length) {
        a("error", "rhythmActions", `Invalid index for toggleMacrobeatGrouping: ${t}`, null, "state");
        return;
      }
      const d = [...this.state.macrobeatGroupings], m = d[t], r = m === 2 ? 3 : 2, h = r - m, c = [...d];
      c[t] = r;
      const l = i(this.state, t, d), N = [];
      this.state.placedNotes.forEach((s) => {
        const C = o(this.state, s.startColumnIndex, d), w = o(this.state, s.endColumnIndex, d);
        if (!(C === null || w === null) && C >= l) {
          const O = C + h, u = w + h, A = g(this.state, O, c), v = g(this.state, u, c);
          A !== null && v !== null ? (s.startColumnIndex = A, s.endColumnIndex = v) : N.push(s);
        }
      }), N.length && N.forEach((s) => {
        const C = this.state.placedNotes.indexOf(s);
        C > -1 && this.state.placedNotes.splice(C, 1);
      }), this.state.macrobeatGroupings = c, Xe(this.state, e), this.emit("notesChanged"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    cycleMacrobeatBoundaryStyle(t) {
      if (t === void 0 || t < 0 || t >= this.state.macrobeatBoundaryStyles.length) {
        a("error", "rhythmActions", `Invalid index for cycleMacrobeatBoundaryStyle: ${t}`, null, "state");
        return;
      }
      const d = this._isBoundaryInAnacrusis(t);
      let m;
      d ? m = ["dashed", "solid", "anacrusis"] : m = ["dashed", "solid"];
      const r = this.state.macrobeatBoundaryStyles[t] ?? "dashed", h = m.indexOf(r), c = h === -1 ? 0 : (h + 1) % m.length, l = m[c] ?? "dashed";
      this.state.macrobeatBoundaryStyles[t] = l, this.emit("rhythmStructureChanged"), this.recordState();
    },
    _isBoundaryInAnacrusis(t) {
      if (!this.state.hasAnacrusis)
        return !1;
      for (let d = 0; d <= t; d++)
        if (this.state.macrobeatBoundaryStyles[d] === "solid")
          return d === t;
      return !0;
    },
    increaseMacrobeatCount() {
      this.state.macrobeatGroupings.push(2), this.state.macrobeatBoundaryStyles.push("dashed"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    decreaseMacrobeatCount() {
      if (this.state.macrobeatGroupings.length > 1) {
        const t = this.state.macrobeatGroupings.length - 1, d = i(
          this.state,
          t - 1,
          this.state.macrobeatGroupings
        ), m = [];
        this.state.placedNotes.forEach((c) => {
          const l = o(this.state, c.startColumnIndex, this.state.macrobeatGroupings);
          l !== null && l >= d && m.push(c);
        }), m.forEach((c) => {
          const l = this.state.placedNotes.indexOf(c);
          l > -1 && this.state.placedNotes.splice(l, 1);
        });
        const r = [];
        this.state.sixteenthStampPlacements.forEach((c) => {
          const l = o(this.state, c.startColumn, this.state.macrobeatGroupings);
          l !== null && l >= d && r.push(c);
        }), r.forEach((c) => {
          const l = this.state.sixteenthStampPlacements.indexOf(c);
          l > -1 && this.state.sixteenthStampPlacements.splice(l, 1);
        });
        const h = [];
        this.state.tripletStampPlacements && (this.state.tripletStampPlacements.forEach((c) => {
          c.startTimeIndex >= d && h.push(c);
        }), h.forEach((c) => {
          const l = this.state.tripletStampPlacements.indexOf(c);
          l > -1 && this.state.tripletStampPlacements.splice(l, 1);
        })), this.state.macrobeatGroupings.pop(), this.state.macrobeatBoundaryStyles.pop(), m.length > 0 && this.emit("notesChanged"), r.length > 0 && this.emit("sixteenthStampPlacementsChanged"), h.length > 0 && this.emit("tripletStampPlacementsChanged"), this.emit("rhythmStructureChanged"), this.recordState();
      }
    },
    updateTimeSignature(t, d) {
      if (!Array.isArray(d) || d.length === 0) {
        a("error", "rhythmActions", "Invalid groupings provided to updateTimeSignature", null, "state");
        return;
      }
      let m = 0, r = 0, h = 0;
      for (let A = 0; A < this.state.macrobeatGroupings.length; A++) {
        if (h === t) {
          m = A;
          break;
        }
        const v = A === this.state.macrobeatGroupings.length - 1;
        (this.state.macrobeatBoundaryStyles[A] === "solid" || v) && h++;
      }
      h = 0;
      for (let A = 0; A < this.state.macrobeatGroupings.length; A++)
        if (h === t) {
          const v = A === this.state.macrobeatGroupings.length - 1;
          if (this.state.macrobeatBoundaryStyles[A] === "solid" || v) {
            r = A;
            break;
          }
        } else if (h < t) {
          const v = A === this.state.macrobeatGroupings.length - 1;
          (this.state.macrobeatBoundaryStyles[A] === "solid" || v) && h++;
        }
      const c = r - m + 1, l = d.length, N = this.state.macrobeatGroupings.slice(m, r + 1).reduce((A, v) => A + v, 0), C = d.reduce((A, v) => A + v, 0) - N, w = i(this.state, r, this.state.macrobeatGroupings);
      if (C !== 0) {
        const A = (() => {
          const p = [...this.state.macrobeatGroupings];
          return p.splice(m, c, ...d), p;
        })(), v = [];
        this.state.placedNotes.forEach((p) => {
          const f = o(this.state, p.startColumnIndex, this.state.macrobeatGroupings), M = o(this.state, p.endColumnIndex, this.state.macrobeatGroupings);
          if (!(f === null || M === null) && f >= w) {
            const b = f + C, F = M + C, $ = g(this.state, b, A), G = g(this.state, F, A);
            $ !== null && G !== null ? (p.startColumnIndex = $, p.endColumnIndex = G) : v.push(p);
          }
        }), v.length && v.forEach((p) => {
          const f = this.state.placedNotes.indexOf(p);
          f > -1 && this.state.placedNotes.splice(f, 1);
        });
      }
      const O = [...d], u = new Array(Math.max(l - 1, 0)).fill("dashed");
      if (r < this.state.macrobeatBoundaryStyles.length) {
        const A = this.state.macrobeatBoundaryStyles[r] ?? "dashed";
        u.push(A);
      }
      this.state.macrobeatGroupings.splice(m, c, ...O), this.state.macrobeatBoundaryStyles.splice(m, c - 1, ...u), this.emit("notesChanged"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    addModulationMarker(t, d, m = null, r = null, h = null) {
      if (!Object.values(te).includes(d))
        return a("error", "rhythmActions", `Invalid modulation ratio: ${d}`, null, "state"), null;
      const c = this.state.tempoModulationMarkers.findIndex((N) => N.measureIndex === t || h !== null && N.macrobeatIndex === h || r !== null && N.columnIndex === r);
      if (c !== -1) {
        const N = this.state.tempoModulationMarkers[c];
        return a("info", "rhythmActions", `Replacing existing modulation marker ${N.id} at measure ${t} (old ratio: ${N.ratio}, new ratio: ${d})`, null, "state"), N.ratio = d, N.xPosition = m, r !== null && (N.columnIndex = r), h !== null && (N.macrobeatIndex = h), this.emit("tempoModulationMarkersChanged"), this.recordState(), N.id;
      }
      const l = wt(t, d, m, r, h);
      return this.state.tempoModulationMarkers.push(l), this.state.tempoModulationMarkers.sort((N, s) => N.measureIndex - s.measureIndex), this.emit("tempoModulationMarkersChanged"), this.recordState(), a("info", "rhythmActions", `Added modulation marker ${l.id} at measure ${t} with ratio=${d}, columnIndex=${r}`, null, "state"), l.id;
    },
    removeModulationMarker(t) {
      const d = this.state.tempoModulationMarkers.findIndex((m) => m.id === t);
      if (d === -1) {
        a("warn", "rhythmActions", `Modulation marker not found: ${t}`, null, "state");
        return;
      }
      this.state.tempoModulationMarkers.splice(d, 1), this.emit("tempoModulationMarkersChanged"), this.recordState(), a("info", "rhythmActions", `Removed modulation marker ${t}`, null, "state");
    },
    setModulationRatio(t, d) {
      if (!Object.values(te).includes(d)) {
        a("error", "rhythmActions", `Invalid modulation ratio: ${d}`, null, "state");
        return;
      }
      const m = this.state.tempoModulationMarkers.find((r) => r.id === t);
      if (!m) {
        a("warn", "rhythmActions", `Modulation marker not found: ${t}`, null, "state");
        return;
      }
      m.ratio = d, this.emit("tempoModulationMarkersChanged"), this.recordState(), a("info", "rhythmActions", `Updated modulation marker ${t} ratio to ${d}`, null, "state");
    },
    moveModulationMarker(t, d) {
      const m = this.state.tempoModulationMarkers.find((r) => r.id === t);
      if (!m) {
        a("warn", "rhythmActions", `Modulation marker not found: ${t}`, null, "state");
        return;
      }
      m.measureIndex = d, this.state.tempoModulationMarkers.sort((r, h) => r.measureIndex - h.measureIndex), this.emit("tempoModulationMarkersChanged"), this.recordState(), a("info", "rhythmActions", `Moved modulation marker ${t} to measure ${d}`, null, "state");
    },
    toggleModulationMarker(t) {
      const d = this.state.tempoModulationMarkers.find((m) => m.id === t);
      if (!d) {
        a("warn", "rhythmActions", `Modulation marker not found: ${t}`, null, "state");
        return;
      }
      d.active = !d.active, this.emit("tempoModulationMarkersChanged"), this.recordState(), a("info", "rhythmActions", `Toggled modulation marker ${t} active state to ${d.active}`, null, "state");
    },
    clearModulationMarkers() {
      const t = this.state.tempoModulationMarkers.length;
      this.state.tempoModulationMarkers = [], this.emit("tempoModulationMarkersChanged"), this.recordState(), a("info", "rhythmActions", `Cleared ${t} modulation markers`, null, "state");
    }
  };
}
function Je(n) {
  const e = JSON.parse(JSON.stringify(n));
  for (const o in e) {
    const g = e[o];
    g.coeffs && typeof g.coeffs == "object" && !Array.isArray(g.coeffs) ? g.coeffs = new Float32Array(Object.values(g.coeffs)) : Array.isArray(g.coeffs) && (g.coeffs = new Float32Array(g.coeffs)), g.phases && typeof g.phases == "object" && !Array.isArray(g.phases) ? g.phases = new Float32Array(Object.values(g.phases)) : Array.isArray(g.phases) && (g.phases = new Float32Array(g.phases));
  }
  return e;
}
const Dt = /* @__PURE__ */ new Set(["dashed", "solid", "anacrusis"]);
function Ot(n) {
  return Array.isArray(n) && n.length > 0 && n.every((e) => e === 2 || e === 3);
}
function Ft(n, e) {
  return Array.isArray(n) && n.length === Math.max(e - 1, 0) && n.every((o) => Dt.has(o));
}
function Rt(n, e) {
  if (n)
    try {
      const o = n.getItem(e);
      if (o === null)
        return;
      const g = JSON.parse(o), i = g.macrobeatGroupings;
      if (!Ot(i)) {
        n.removeItem(e);
        return;
      }
      if (!Ft(g.macrobeatBoundaryStyles, i.length)) {
        n.removeItem(e);
        return;
      }
      if (delete g.timbres, g.pitchRange) {
        const a = Q.length, t = Math.max(0, a - 1), d = Math.max(0, Math.min(t, g.pitchRange.topIndex ?? 0)), m = Math.max(d, Math.min(t, g.pitchRange.bottomIndex ?? t));
        g.pitchRange = { topIndex: d, bottomIndex: m };
      }
      if ("playheadMode" in g) {
        const a = g.playheadMode;
        a !== "cursor" && a !== "microbeat" && a !== "macrobeat" && delete g.playheadMode;
      }
      return g.fullRowData = [...Q], g;
    } catch {
      return;
    }
}
function Bt(n, e, o) {
  if (e)
    try {
      const g = JSON.parse(JSON.stringify({
        placedNotes: n.placedNotes,
        placedChords: n.placedChords,
        tonicSignGroups: n.tonicSignGroups,
        sixteenthStampPlacements: n.sixteenthStampPlacements,
        tripletStampPlacements: n.tripletStampPlacements,
        // timbres: state.timbres, // Removed - always use default Sine preset
        macrobeatGroupings: n.macrobeatGroupings,
        macrobeatBoundaryStyles: n.macrobeatBoundaryStyles,
        hasAnacrusis: n.hasAnacrusis,
        baseMicrobeatPx: n.baseMicrobeatPx,
        tempoModulationMarkers: n.tempoModulationMarkers,
        tempo: n.tempo,
        activeChordIntervals: n.activeChordIntervals,
        selectedNote: n.selectedNote,
        annotations: n.annotations,
        pitchRange: n.pitchRange,
        degreeDisplayMode: n.degreeDisplayMode,
        showOctaveLabels: n.showOctaveLabels,
        longNoteStyle: n.longNoteStyle,
        playheadMode: n.playheadMode
      })), i = JSON.stringify(g);
      e.setItem(o, i);
    } catch {
    }
}
function Gt(n = {}) {
  const {
    storageKey: e = "studentNotationState",
    storage: o,
    initialState: g,
    onClearState: i,
    noteActionCallbacks: a = {},
    sixteenthStampActionCallbacks: t = {},
    tripletStampActionCallbacks: d = {},
    rhythmActionCallbacks: m = {}
  } = n, r = {}, h = Rt(o, e), c = !h, s = {
    state: {
      ...Ct(),
      ...h,
      ...g
    },
    isColdStart: c,
    on(C, w) {
      r[C] || (r[C] = []), r[C].push(w);
    },
    off(C, w) {
      if (r[C]) {
        const O = r[C].indexOf(w);
        O > -1 && r[C].splice(O, 1);
      }
    },
    emit(C, w) {
      r[C] && r[C].forEach((O) => {
        try {
          O(w);
        } catch (u) {
          console.error(`Error in listener for event "${C}"`, u);
        }
      });
    },
    dispose() {
      for (const C in r)
        delete r[C];
    },
    saveState() {
      Bt(s.state, o, e);
    },
    // ========== HISTORY ACTIONS ==========
    recordState() {
      s.state.history = s.state.history.slice(0, s.state.historyIndex + 1);
      const C = JSON.parse(JSON.stringify(s.state.timbres)), w = {
        notes: JSON.parse(JSON.stringify(s.state.placedNotes)),
        tonicSignGroups: JSON.parse(JSON.stringify(s.state.tonicSignGroups)),
        placedChords: JSON.parse(JSON.stringify(s.state.placedChords)),
        sixteenthStampPlacements: JSON.parse(JSON.stringify(s.state.sixteenthStampPlacements)),
        tripletStampPlacements: JSON.parse(JSON.stringify(s.state.tripletStampPlacements || [])),
        timbres: C,
        annotations: s.state.annotations ? JSON.parse(JSON.stringify(s.state.annotations)) : [],
        lassoSelection: JSON.parse(JSON.stringify(s.state.lassoSelection))
      };
      s.state.history.push(w), s.state.historyIndex++, s.emit("historyChanged"), s.saveState();
    },
    undo() {
      var C;
      if (s.state.historyIndex > 0) {
        s.state.historyIndex--;
        const w = s.state.history[s.state.historyIndex];
        if (!w) return;
        s.state.placedNotes = JSON.parse(JSON.stringify(w.notes)), s.state.tonicSignGroups = JSON.parse(JSON.stringify(w.tonicSignGroups)), s.state.sixteenthStampPlacements = JSON.parse(JSON.stringify(w.sixteenthStampPlacements || [])), s.state.tripletStampPlacements = JSON.parse(JSON.stringify(w.tripletStampPlacements || [])), s.state.timbres = Je(w.timbres), s.state.annotations = w.annotations ? JSON.parse(JSON.stringify(w.annotations)) : [], s.emit("notesChanged"), s.emit("sixteenthStampPlacementsChanged"), s.emit("tripletStampPlacementsChanged"), s.emit("rhythmStructureChanged"), (C = s.state.selectedNote) != null && C.color && s.emit("timbreChanged", s.state.selectedNote.color), s.emit("annotationsChanged"), s.emit("historyChanged");
      }
    },
    redo() {
      var C;
      if (s.state.historyIndex < s.state.history.length - 1) {
        s.state.historyIndex++;
        const w = s.state.history[s.state.historyIndex];
        if (!w) return;
        s.state.placedNotes = JSON.parse(JSON.stringify(w.notes)), s.state.tonicSignGroups = JSON.parse(JSON.stringify(w.tonicSignGroups)), s.state.sixteenthStampPlacements = JSON.parse(JSON.stringify(w.sixteenthStampPlacements || [])), s.state.tripletStampPlacements = JSON.parse(JSON.stringify(w.tripletStampPlacements || [])), s.state.timbres = Je(w.timbres), s.state.annotations = w.annotations ? JSON.parse(JSON.stringify(w.annotations)) : [], s.emit("notesChanged"), s.emit("sixteenthStampPlacementsChanged"), s.emit("tripletStampPlacementsChanged"), s.emit("rhythmStructureChanged"), (C = s.state.selectedNote) != null && C.color && s.emit("timbreChanged", s.state.selectedNote.color), s.emit("annotationsChanged"), s.emit("historyChanged");
      }
    },
    clearSavedState() {
      o && (o.removeItem(e), o.removeItem("effectDialValues")), i && i();
    },
    // ========== VIEW ACTIONS ==========
    setPlaybackState(C, w) {
      s.state.isPlaying = C, s.state.isPaused = w, s.emit("playbackStateChanged", { isPlaying: C, isPaused: w });
    },
    setLooping(C) {
      s.state.isLooping = C, s.emit("loopingChanged", C);
    },
    setTempo(C) {
      s.state.tempo = C, s.emit("tempoChanged", C);
    },
    setPlayheadMode(C) {
      s.state.playheadMode = C, s.emit("playheadModeChanged", C);
    },
    setSelectedTool(C, w) {
      const O = s.state.selectedTool;
      if (s.state.previousTool = O, s.state.selectedTool = C, w !== void 0) {
        const u = typeof w == "string" ? parseInt(w, 10) : w;
        isNaN(u) || (s.state.selectedToolTonicNumber = u);
      }
      s.emit("toolChanged", { newTool: C, oldTool: O });
    },
    setSelectedNote(C, w) {
      const O = { ...s.state.selectedNote };
      s.state.selectedNote = { shape: C, color: w }, s.emit("noteChanged", { newNote: s.state.selectedNote, oldNote: O });
    },
    setPitchRange(C) {
      s.state.pitchRange = { ...s.state.pitchRange, ...C }, s.emit("pitchRangeChanged", s.state.pitchRange);
    },
    setDegreeDisplayMode(C) {
      s.state.degreeDisplayMode = C, s.emit("degreeDisplayModeChanged", C);
    },
    setLongNoteStyle(C) {
      s.state.longNoteStyle = C, s.emit("longNoteStyleChanged", C);
    },
    toggleAccidentalMode(C) {
      s.state.accidentalMode[C] = !s.state.accidentalMode[C], s.emit("accidentalModeChanged", s.state.accidentalMode);
    },
    toggleFrequencyLabels() {
      s.state.showFrequencyLabels = !s.state.showFrequencyLabels, s.emit("frequencyLabelsChanged", s.state.showFrequencyLabels);
    },
    toggleOctaveLabels() {
      s.state.showOctaveLabels = !s.state.showOctaveLabels, s.emit("octaveLabelsChanged", s.state.showOctaveLabels);
    },
    toggleFocusColours() {
      s.state.focusColours = !s.state.focusColours, s.emit("focusColoursChanged", s.state.focusColours);
    },
    toggleWaveformExtendedView() {
      s.state.waveformExtendedView = !s.state.waveformExtendedView, s.emit("waveformExtendedViewChanged", s.state.waveformExtendedView);
    },
    setLayoutConfig(C) {
      C.cellWidth !== void 0 && (s.state.cellWidth = C.cellWidth), C.cellHeight !== void 0 && (s.state.cellHeight = C.cellHeight), C.columnWidths !== void 0 && (s.state.columnWidths = C.columnWidths), s.emit("layoutConfigChanged", C);
    },
    setDeviceProfile(C) {
      s.state.deviceProfile = { ...s.state.deviceProfile, ...C }, s.emit("deviceProfileChanged", s.state.deviceProfile);
    },
    setPrintPreviewActive(C) {
      s.state.isPrintPreviewActive = C, s.emit("printPreviewStateChanged", C);
    },
    setPrintOptions(C) {
      s.state.printOptions = { ...s.state.printOptions, ...C }, s.emit("printOptionsChanged", s.state.printOptions);
    },
    setAdsrTimeAxisScale(C) {
      s.state.adsrTimeAxisScale = C, s.emit("adsrTimeAxisScaleChanged", C);
    },
    setAdsrComponentWidth() {
    },
    shiftGridUp() {
    },
    shiftGridDown() {
    },
    setGridPosition() {
    },
    setKeySignature(C) {
      s.state.keySignature = C, s.emit("keySignatureChanged", C);
    },
    // ========== HARMONY ACTIONS ==========
    setActiveChordIntervals(C) {
      s.state.activeChordIntervals = C, s.emit("activeChordIntervalsChanged", C);
    },
    setIntervalsInversion(C) {
      s.state.isIntervalsInverted = C, s.emit("intervalsInversionChanged", C);
    },
    setChordPosition(C) {
      s.state.chordPositionState = C, s.emit("chordPositionChanged", C);
    },
    // ========== TIMBRE ACTIONS ==========
    setADSR(C, w) {
      s.state.timbres[C] && (s.state.timbres[C].adsr = { ...s.state.timbres[C].adsr, ...w }, s.emit("timbreChanged", C));
    },
    setHarmonicCoefficients(C, w) {
      s.state.timbres[C] && (s.state.timbres[C].coeffs = w, s.emit("timbreChanged", C));
    },
    setHarmonicPhases(C, w) {
      s.state.timbres[C] && (s.state.timbres[C].phases = w, s.emit("timbreChanged", C));
    },
    setFilterSettings(C, w) {
      s.state.timbres[C] && (s.state.timbres[C].filter = { ...s.state.timbres[C].filter, ...w }, s.emit("timbreChanged", C));
    },
    applyPreset(C, w) {
      s.state.timbres[C] && (Object.assign(s.state.timbres[C], w), s.emit("timbreChanged", C));
    },
    // ========== NOTE ACTIONS ==========
    // Extracted from note actions module
    ...Tt(a),
    // ========== SIXTEENTH STAMP ACTIONS ==========
    // Extracted from sixteenth stamp actions module
    ...Mt(t),
    // ========== TRIPLET STAMP ACTIONS ==========
    // Extracted from triplet stamp actions module
    ...vt(d),
    // ========== RHYTHM ACTIONS ==========
    // Extracted from rhythm actions module
    ...Et(m)
  };
  return o && (s.on("tempoChanged", () => s.saveState()), s.on("degreeDisplayModeChanged", () => s.saveState()), s.on("longNoteStyleChanged", () => s.saveState()), s.on("playheadModeChanged", () => s.saveState())), c && o && s.saveState(), s;
}
function Lt(n = {}) {
  const {
    getPlacedTonicSigns: e = () => [],
    sideColumnWidth: o = 0.25,
    beatColumnWidth: g = 1
  } = n;
  let i = null, a = null;
  function t(c) {
    const N = e(c).map((s) => `${s.columnIndex}:${s.preMacrobeatIndex}:${s.uuid || ""}`).sort().join("|");
    return {
      macrobeatGroupings: [...c.macrobeatGroupings],
      tonicSignsHash: N,
      macrobeatBoundaryStyles: [...c.macrobeatBoundaryStyles]
    };
  }
  function d(c) {
    return a ? a.tonicSignsHash === c.tonicSignsHash && JSON.stringify(a.macrobeatGroupings) === JSON.stringify(c.macrobeatGroupings) && JSON.stringify(a.macrobeatBoundaryStyles) === JSON.stringify(c.macrobeatBoundaryStyles) : !1;
  }
  function m(c) {
    const { macrobeatGroupings: l, macrobeatBoundaryStyles: N } = c, C = [...e(c)].sort((y, P) => y.preMacrobeatIndex - P.preMacrobeatIndex), w = [], O = [];
    let u = 0, A = 0, v = 0, p = 0, f = 0;
    const M = (y) => {
      var P;
      for (; f < C.length; ) {
        const S = C[f];
        if (!S || S.preMacrobeatIndex !== y) break;
        const T = S.uuid || "";
        for (let D = 0; D < 2; D++)
          w.push({
            visualIndex: u,
            canvasIndex: A,
            timeIndex: null,
            type: "tonic",
            widthMultiplier: g,
            xOffsetUnmodulated: p,
            macrobeatIndex: null,
            beatInMacrobeat: null,
            isMacrobeatStart: !1,
            isMacrobeatEnd: !1,
            isPlayable: !1,
            tonicSignUuid: D === 0 ? T : null
            // Only first column stores UUID
          }), u++, A++, p += g;
        const I = T;
        do
          f++;
        while (f < C.length && (((P = C[f]) == null ? void 0 : P.uuid) || "") === I);
      }
    };
    for (let y = 0; y < 2; y++)
      w.push({
        visualIndex: u,
        canvasIndex: null,
        timeIndex: null,
        type: "legend-left",
        widthMultiplier: o,
        xOffsetUnmodulated: p,
        macrobeatIndex: null,
        beatInMacrobeat: null,
        isMacrobeatStart: !1,
        isMacrobeatEnd: !1,
        isPlayable: !1,
        tonicSignUuid: null
      }), u++, p += o;
    M(-1), l.forEach((y, P) => {
      for (let T = 0; T < y; T++)
        w.push({
          visualIndex: u,
          canvasIndex: A,
          timeIndex: v,
          type: "beat",
          widthMultiplier: g,
          xOffsetUnmodulated: p,
          macrobeatIndex: P,
          beatInMacrobeat: T,
          isMacrobeatStart: T === 0,
          isMacrobeatEnd: T === y - 1,
          isPlayable: !0,
          tonicSignUuid: null
        }), u++, A++, v++, p += g;
      const S = N[P] || "dashed";
      O.push({
        macrobeatIndex: P,
        visualColumn: u - 1,
        canvasColumn: A - 1,
        timeColumn: v - 1,
        boundaryType: S,
        isMeasureStart: S === "solid"
      }), M(P);
    });
    for (let y = 0; y < 2; y++)
      w.push({
        visualIndex: u,
        canvasIndex: null,
        timeIndex: null,
        type: "legend-right",
        widthMultiplier: o,
        xOffsetUnmodulated: p,
        macrobeatIndex: null,
        beatInMacrobeat: null,
        isMacrobeatStart: !1,
        isMacrobeatEnd: !1,
        isPlayable: !1,
        tonicSignUuid: null
      }), u++, p += o;
    const b = /* @__PURE__ */ new Map(), F = /* @__PURE__ */ new Map(), $ = /* @__PURE__ */ new Map(), G = /* @__PURE__ */ new Map(), B = /* @__PURE__ */ new Map(), R = /* @__PURE__ */ new Map();
    return w.forEach((y) => {
      b.set(y.visualIndex, y.canvasIndex), F.set(y.visualIndex, y.timeIndex), y.canvasIndex !== null && ($.set(y.canvasIndex, y.visualIndex), G.set(y.canvasIndex, y.timeIndex)), y.timeIndex !== null && (y.canvasIndex !== null && B.set(y.timeIndex, y.canvasIndex), R.set(y.timeIndex, y.visualIndex));
    }), {
      entries: w,
      visualToCanvas: b,
      visualToTime: F,
      canvasToVisual: $,
      canvasToTime: G,
      timeToCanvas: B,
      timeToVisual: R,
      macrobeatBoundaries: O,
      totalVisualColumns: u,
      totalCanvasColumns: A,
      totalTimeColumns: v,
      totalWidthUnmodulated: p
    };
  }
  function r(c) {
    const l = t(c);
    return i && d(l) || (i = m(c), a = l), i;
  }
  function h() {
    i = null, a = null;
  }
  return {
    getColumnMap: r,
    invalidate: h,
    buildColumnMap: m
  };
}
function wn(n, e) {
  return e.visualToCanvas.get(n) ?? null;
}
function _t(n, e) {
  return e.visualToTime.get(n) ?? null;
}
function In(n, e) {
  const o = e.canvasToVisual.get(n);
  return o !== void 0 ? o : n + 2;
}
function xn(n, e) {
  return e.canvasToTime.get(n) ?? null;
}
function Pn(n, e) {
  const o = e.timeToCanvas.get(n);
  return o !== void 0 ? o : n;
}
function $t(n, e) {
  const o = e.timeToVisual.get(n);
  return o !== void 0 ? o : n + 2;
}
function Wt(n, e) {
  if (n == null) return 0;
  let o = 0;
  for (let g = 0; g <= n && g < e.length; g++) {
    const i = e[g];
    typeof i == "number" && (o += i);
  }
  return o;
}
function En(n, e) {
  return e.entries[n] || null;
}
function Ze(n, e) {
  const o = e.canvasToVisual.get(n);
  return o !== void 0 && e.entries[o] || null;
}
function Dn(n, e) {
  const o = Ze(n, e);
  return (o == null ? void 0 : o.isPlayable) ?? !1;
}
function On(n, e) {
  const o = Ze(n, e);
  return (o == null ? void 0 : o.type) ?? null;
}
function Fn(n, e) {
  return e.macrobeatBoundaries.find((o) => o.macrobeatIndex === n) || null;
}
function Rn(n) {
  const e = [];
  for (const o of n.entries)
    o.canvasIndex !== null && (e[o.canvasIndex] = o.widthMultiplier);
  return e;
}
function Bn(n) {
  let e = 0;
  for (const o of n.entries)
    o.canvasIndex !== null && (e += o.widthMultiplier);
  return e;
}
function Gn() {
  let n = !1, e = null, o = null, g = null, i = null, a = !1;
  const t = (r, h, c, l, N) => {
    if (!a && r === "debug") return;
    const s = `[engine:${h}]`;
    console[r](s, c, l || "");
  }, d = (r, h, c) => {
    t(r, "controller", h, c);
  };
  return {
    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    init(r) {
      if (n) {
        t("warn", "controller", "Engine already initialized");
        return;
      }
      a = r.debug || !1, t("info", "controller", "Initializing engine"), g = r.pitchGridContext || null, i = r.drumGridContext || null, o = Lt({
        getPlacedTonicSigns: (c) => {
          if (!e) return [];
          const l = [];
          for (const N of Object.values(c.tonicSignGroups || {}))
            l.push(...N);
          return l;
        }
      });
      let h = r.storage;
      !h && typeof window < "u" && window.localStorage && (h = window.localStorage), e = Gt({
        storageKey: r.storageKey || "studentNotationState",
        storage: h,
        initialState: r.initialState,
        noteActionCallbacks: {
          log: d
        },
        rhythmActionCallbacks: {
          getColumnMap: (c) => o.getColumnMap(c),
          visualToTimeIndex: (c, l, N) => _t(l, o.getColumnMap(c)),
          timeIndexToVisualColumn: (c, l, N) => $t(l, o.getColumnMap(c)),
          getTimeBoundaryAfterMacrobeat: (c, l, N) => Wt(l, N),
          log: d
        },
        sixteenthStampActionCallbacks: {
          log: d
        },
        tripletStampActionCallbacks: {
          canvasToTime: (c, l) => l.canvasToTime.get(c) ?? null,
          timeToCanvas: (c, l) => l.timeToCanvas.get(c) ?? 0,
          getColumnMap: (c) => o.getColumnMap(c),
          log: d
        }
      }), e.on("rhythmStructureChanged", () => {
        o == null || o.invalidate();
      }), e.on("notesChanged", () => {
        this.renderPitchGrid();
      }), e.on("sixteenthStampPlacementsChanged", () => {
        this.renderDrumGrid();
      }), e.on("tripletStampPlacementsChanged", () => {
        this.renderDrumGrid();
      }), n = !0, t("info", "controller", "Engine initialized successfully"), (g || i) && this.render();
    },
    dispose() {
      n && (t("info", "controller", "Disposing engine"), e && (e.dispose(), e = null), o = null, g = null, i = null, n = !1);
    },
    isInitialized() {
      return n;
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
      const h = e.state.selectedNote.color;
      e.setSelectedNote(r, h);
    },
    setNoteColor(r) {
      if (!e) return;
      const h = e.state.selectedNote.shape;
      e.setSelectedNote(h, r);
    },
    // ============================================================================
    // NOTE MANIPULATION
    // ============================================================================
    insertNote(r, h, c) {
      if (!e) return null;
      const l = {
        row: r,
        startColumnIndex: h,
        endColumnIndex: c ?? h,
        shape: e.state.selectedNote.shape,
        color: e.state.selectedNote.color
      };
      return e.addNote(l);
    },
    deleteNote(r) {
      if (!e) return !1;
      const h = e.state.placedNotes.find((c) => c.uuid === r);
      return h ? (e.removeNote(h), !0) : !1;
    },
    deleteSelection() {
      if (!e) return;
      const r = e.state.lassoSelection;
      if (!r.isActive || r.selectedItems.length === 0) return;
      const h = r.selectedItems.filter((c) => c.type === "note").map((c) => e.state.placedNotes.find((l) => l.uuid === c.id)).filter((c) => c !== void 0);
      h.length > 0 && e.removeMultipleNotes(h), this.clearSelection();
    },
    moveNote(r, h, c) {
      if (!e) return;
      const l = e.state.placedNotes.find((N) => N.uuid === r);
      l && (e.updateNoteRow(l, h), e.updateNotePosition(l, c));
    },
    setNoteTail(r, h) {
      if (!e) return;
      const c = e.state.placedNotes.find((l) => l.uuid === r);
      c && e.updateNoteTail(c, h);
    },
    clearAllNotes() {
      e && e.clearAllNotes();
    },
    // ============================================================================
    // SELECTION
    // ============================================================================
    setSelection(r) {
      if (!e) return;
      const h = r.map((c) => {
        if (c.type === "note") {
          const l = e.state.placedNotes.find((N) => N.uuid === c.id);
          return l ? { type: "note", id: c.id, data: l } : null;
        } else if (c.type === "sixteenthStamp") {
          const l = e.state.sixteenthStampPlacements.find((N) => N.id === c.id);
          return l ? { type: "sixteenthStamp", id: c.id, data: l } : null;
        } else if (c.type === "tripletStamp") {
          const l = e.state.tripletStampPlacements.find((N) => N.id === c.id);
          return l ? { type: "tripletStamp", id: c.id, data: l } : null;
        }
        return null;
      }).filter((c) => c !== null);
      e.state.lassoSelection = {
        isActive: h.length > 0,
        selectedItems: h,
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
      const r = e.state.placedNotes.map((h) => ({
        type: "note",
        id: h.uuid,
        data: h
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
      e && (e.setPlaybackState(!0, !1), t("info", "playback", "Play started"));
    },
    pause() {
      e && (e.setPlaybackState(!0, !0), t("info", "playback", "Paused"));
    },
    resume() {
      e && (e.setPlaybackState(!0, !1), t("info", "playback", "Resumed"));
    },
    stop() {
      e && (e.setPlaybackState(!1, !1), t("info", "playback", "Stopped"));
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
    setMacrobeatGrouping(r, h) {
      if (!e) return;
      e.state.macrobeatGroupings[r] !== h && e.toggleMacrobeatGrouping(r);
    },
    toggleAnacrusis() {
      e && e.setAnacrusis(!e.state.hasAnacrusis);
    },
    addModulationMarker(r, h) {
      return e ? e.addModulationMarker(r, h) : null;
    },
    removeModulationMarker(r) {
      e && e.removeModulationMarker(r);
    },
    // ============================================================================
    // VIEW
    // ============================================================================
    setPitchRange(r, h) {
      e && e.setPitchRange({ topIndex: r, bottomIndex: h });
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
    setTimbreADSR(r, h) {
      e && e.setADSR(r, h);
    },
    setTimbreHarmonics(r, h) {
      e && e.setHarmonicCoefficients(r, new Float32Array(h));
    },
    setTimbreFilter(r, h) {
      e && e.setFilterSettings(r, h);
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
    getNoteAt(r, h) {
      return e && e.state.placedNotes.find(
        (c) => c.row === r && c.startColumnIndex <= h && c.endColumnIndex >= h
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
      const r = "uuid,row,startColumn,endColumn,color,shape", h = e.state.placedNotes.map(
        (c) => `${c.uuid},${c.row},${c.startColumnIndex},${c.endColumnIndex},${c.color},${c.shape}`
      );
      return [r, ...h].join(`
`);
    },
    importCSV(r) {
      if (!e) return;
      const h = r.split(`
`).filter((N) => N.trim());
      if (h.length === 0) return;
      const l = h.slice(1).map((N) => {
        const [s, C, w, O, u, A] = N.split(",");
        return {
          uuid: s,
          row: parseInt(C || "0", 10),
          startColumnIndex: parseInt(w || "0", 10),
          endColumnIndex: parseInt(O || "0", 10),
          color: u || "blue",
          shape: A || "circle"
        };
      });
      e.loadNotes(l);
    },
    exportState() {
      return e ? JSON.stringify(e.state, null, 2) : "{}";
    },
    importState(r) {
      if (e)
        try {
          const h = JSON.parse(r);
          Object.assign(e.state, h), e.emit("stateImported", h), this.render();
        } catch (h) {
          t("error", "import", "Failed to import state", h);
        }
    },
    // ============================================================================
    // EVENTS
    // ============================================================================
    on(r, h) {
      e && e.on(r, h);
    },
    off(r, h) {
      e && e.off(r, h);
    },
    // ============================================================================
    // RENDERING
    // ============================================================================
    render() {
      this.renderPitchGrid(), this.renderDrumGrid();
    },
    renderPitchGrid() {
      !g || !e || !o || t("debug", "controller", "renderPitchGrid called - canvas rendering not yet wired");
    },
    renderDrumGrid() {
      !i || !e || !o || t("debug", "controller", "renderDrumGrid called - canvas rendering not yet wired");
    }
  };
}
function Ln(n) {
  throw new Error("Not yet implemented - will be in @mlt/tutorial-runtime package");
}
let Y = null;
function _n(n) {
  Y = n;
}
class Vt extends x.Synth {
  constructor(o) {
    var i;
    super(o);
    // Core signal path nodes
    X(this, "presetGain");
    X(this, "tremoloGain");
    // Filter nodes
    X(this, "hpFilter");
    X(this, "lpFilterForBP");
    X(this, "lpFilterSolo");
    // Crossfade nodes
    X(this, "hp_bp_fade");
    X(this, "main_fade");
    X(this, "wetDryFade");
    // [PERF:LAZY-FILTER] Track whether the filter wet chain is connected to the audio graph
    X(this, "_filterChainConnected", !1);
    this.presetGain = new x.Gain(o.gain || 1), this.tremoloGain = new x.Gain(1), this.hpFilter = new x.Filter({ type: "highpass" }), this.lpFilterForBP = new x.Filter({ type: "lowpass" }), this.lpFilterSolo = new x.Filter({ type: "lowpass" }), this.hp_bp_fade = new x.CrossFade(0), this.main_fade = new x.CrossFade(0), this.wetDryFade = new x.CrossFade(0), this.oscillator.connect(this.presetGain), this.presetGain.connect(this.wetDryFade.a), this.hpFilter.connect(this.hp_bp_fade.a), this.hpFilter.connect(this.lpFilterForBP), this.lpFilterForBP.connect(this.hp_bp_fade.b), this.lpFilterSolo.connect(this.main_fade.b), this.hp_bp_fade.connect(this.main_fade.a), (((i = o.filter) == null ? void 0 : i.enabled) ?? !1) && this._connectFilterWetChain(), this.wetDryFade.connect(this.tremoloGain), this.tremoloGain.connect(this.envelope), o.filter && this._setFilter(o.filter);
  }
  _setPresetGain(o) {
    this.presetGain && (this.presetGain.gain.value = o);
  }
  // [PERF:SHARED-LFO] No-op — vibrato is now handled by shared per-color LFOs.
  // Kept for backwards compatibility with callers in synthEngine.ts and effectsManager.
  _setVibrato(o, g = x.now()) {
  }
  // [PERF:SHARED-LFO] No-op — tremolo is now handled by shared per-color LFOs.
  // Kept for backwards compatibility with callers in synthEngine.ts and effectsManager.
  _setTremolo(o, g = x.now()) {
  }
  /**
   * Reset tremoloGain to pass-through (gain=1.0).
   * Called by synthEngine when shared tremolo LFO is disconnected.
   */
  _resetTremoloGain(o = x.now()) {
    this.tremoloGain && (this.tremoloGain.gain.cancelScheduledValues(o), this.tremoloGain.gain.value = 1);
  }
  _setFilter(o) {
    if (o.enabled && !this._filterChainConnected ? this._connectFilterWetChain() : !o.enabled && this._filterChainConnected && this._disconnectFilterWetChain(), this.wetDryFade.fade.value = o.enabled ? 1 : 0, o.enabled) {
      const g = x.Midi(o.cutoff + 35).toFrequency(), i = o.resonance / 100 * 12 + 0.1;
      this.hpFilter.set({ frequency: g, Q: i }), this.lpFilterForBP.set({ frequency: g, Q: i }), this.lpFilterSolo.set({ frequency: g, Q: i });
      const a = o.blend;
      a <= 1 ? (this.main_fade.fade.value = 0, this.hp_bp_fade.fade.value = a) : (this.main_fade.fade.value = a - 1, this.hp_bp_fade.fade.value = 1);
    }
  }
  // [PERF:LAZY-FILTER] Connect the filter wet chain entrance/exit to the audio graph.
  // The internal filter wiring (hpFilter↔hp_bp_fade, etc.) stays permanently connected.
  // Only the "entrance" (presetGain → filters) and "exit" (main_fade → wetDryFade.b)
  // are toggled, which orphans/re-adopts the entire subgraph.
  _connectFilterWetChain() {
    this._filterChainConnected || (this.presetGain.connect(this.hpFilter), this.presetGain.connect(this.lpFilterSolo), this.main_fade.connect(this.wetDryFade.b), this._filterChainConnected = !0, Y == null || Y.debug("FilteredVoice", "Filter wet chain connected", null, "audio"));
  }
  // [PERF:LAZY-FILTER] Disconnect the filter wet chain. The 8 orphaned nodes
  // (3 filters + 2 crossfades + internal wiring) won't be processed by the
  // audio thread since they have no path to the AudioContext destination.
  _disconnectFilterWetChain() {
    this._filterChainConnected && (this.presetGain.disconnect(this.hpFilter), this.presetGain.disconnect(this.lpFilterSolo), this.main_fade.disconnect(this.wetDryFade.b), this._filterChainConnected = !1, Y == null || Y.debug("FilteredVoice", "Filter wet chain disconnected", null, "audio"));
  }
}
const et = {
  polyphonyReference: 32,
  smoothingTauMs: 200,
  masterGainRampMs: 50,
  gainUpdateIntervalMs: 16
};
function tt(n = et.polyphonyReference) {
  return 1 / Math.sqrt(n);
}
class qt {
  constructor(e, o = {}, g) {
    X(this, "masterGain");
    X(this, "options");
    X(this, "perVoiceBaselineGain");
    X(this, "voiceCountFn");
    X(this, "activeVoiceCount", 0);
    X(this, "smoothedVoiceCount");
    X(this, "gainUpdateLoopId", null);
    this.masterGain = e, this.options = { ...et, ...o }, this.perVoiceBaselineGain = tt(this.options.polyphonyReference), this.smoothedVoiceCount = this.options.polyphonyReference, this.voiceCountFn = g ?? null;
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
    this.voiceCountFn && (this.activeVoiceCount = this.voiceCountFn());
    const { polyphonyReference: e, smoothingTauMs: o, masterGainRampMs: g, gainUpdateIntervalMs: i } = this.options, a = x.now();
    if (this.activeVoiceCount === 0) {
      this.smoothedVoiceCount = 0.01 * e + (1 - 0.01) * this.smoothedVoiceCount;
      return;
    }
    const t = i / 1e3, d = 1 - Math.exp(-t / (o / 1e3)), m = Math.max(1, this.activeVoiceCount);
    this.smoothedVoiceCount = d * m + (1 - d) * this.smoothedVoiceCount;
    const r = Math.sqrt(e / this.smoothedVoiceCount), h = this.perVoiceBaselineGain * r;
    this.masterGain.gain.rampTo(h, g / 1e3, a);
  }
}
const Ht = {
  clippingWarningThresholdDb: -3,
  clippingMonitorIntervalMs: 500,
  clippingWarningCooldownMs: 2e3
};
class Ut {
  constructor(e, o = {}) {
    X(this, "meter");
    X(this, "options");
    X(this, "clippingMonitorId", null);
    X(this, "lastClippingWarningAt", 0);
    this.meter = e, this.options = { ...Ht, ...o };
  }
  start() {
    this.stop(), this.lastClippingWarningAt = 0, this.clippingMonitorId = setInterval(() => {
      var i, a;
      const e = this.meter.getValue(), o = Array.isArray(e) ? e[0] : e;
      if (o === void 0 || o <= this.options.clippingWarningThresholdDb)
        return;
      const g = Date.now();
      g - this.lastClippingWarningAt < this.options.clippingWarningCooldownMs || (this.lastClippingWarningAt = g, (a = (i = this.options).onWarning) == null || a.call(i, o));
    }, this.options.clippingMonitorIntervalMs);
  }
  stop() {
    this.clippingMonitorId !== null && (clearInterval(this.clippingMonitorId), this.clippingMonitorId = null);
  }
}
function $n(n) {
  const {
    timbres: e,
    masterVolume: o = 0,
    effectsManager: g,
    harmonicFilter: i,
    logger: a,
    audioInit: t,
    getDrumVolume: d
  } = n, m = {}, r = {};
  let h = null, c = null, l = null, N = null, s = null, C = {}, w = null, O = null;
  const u = { ...e };
  let A = null;
  const v = () => typeof window < "u" && window.__audioDiag === !0, p = {}, f = {};
  function M() {
    var T;
    let S = 0;
    for (const I in m)
      S += ((T = m[I]) == null ? void 0 : T.activeVoices) ?? 0;
    return S;
  }
  function b(S) {
    const T = [], I = /* @__PURE__ */ new Set(), D = S == null ? void 0 : S._activeVoices;
    D && D.forEach((E) => {
      const L = (E == null ? void 0 : E.voice) ?? E;
      L && !I.has(L) && (I.add(L), T.push(L));
    });
    const _ = S == null ? void 0 : S._voices;
    return _ && _.forEach((E) => {
      E && !I.has(E) && (I.add(E), T.push(E));
    }), T;
  }
  function F(S, T) {
    if (T.speed > 0 && T.span > 0) {
      const D = T.speed / 100 * 16, _ = T.span / 100 * 50;
      if (p[S]) {
        const E = p[S];
        E.frequency.value = D, E.min = -_, E.max = _;
      } else {
        const E = new x.LFO({ frequency: D, min: -_, max: _, type: "sine" });
        E.start(), p[S] = E;
        const L = m[S];
        L && b(L).forEach((W) => {
          try {
            E.connect(W.oscillator.detune);
          } catch {
          }
        }), B.debug("SynthEngine", `[PERF:SHARED-LFO] Created shared vibrato LFO for ${S}`, { freqHz: D, depthCents: _ }, "audio");
      }
    } else
      p[S] && (p[S].stop(), p[S].dispose(), p[S] = null, B.debug("SynthEngine", `[PERF:SHARED-LFO] Disposed shared vibrato LFO for ${S}`, null, "audio"));
  }
  function $(S, T) {
    if (T.speed > 0 && T.span > 0) {
      const D = T.speed / 100 * 16, _ = T.span / 100;
      if (f[S]) {
        const E = f[S];
        E.frequency.value = D, E.min = -_, E.max = 0;
      } else {
        const E = new x.LFO({ frequency: D, min: -_, max: 0, type: "sine" });
        E.start(), f[S] = E;
        const L = m[S];
        L && b(L).forEach((W) => {
          try {
            E.connect(W.tremoloGain.gain.input);
          } catch {
          }
        }), B.debug("SynthEngine", `[PERF:SHARED-LFO] Created shared tremolo LFO for ${S}`, { freqHz: D, depth: _ }, "audio");
      }
    } else if (f[S]) {
      f[S].stop(), f[S].dispose(), f[S] = null;
      const D = m[S];
      D && b(D).forEach((_) => {
        var E;
        try {
          (E = _._resetTremoloGain) == null || E.call(_);
        } catch {
        }
      }), B.debug("SynthEngine", `[PERF:SHARED-LFO] Disposed shared tremolo LFO for ${S}`, null, "audio");
    }
  }
  function G(S, T) {
    try {
      const I = p[T];
      I && I.connect(S.oscillator.detune);
      const D = f[T];
      D && D.connect(S.tremoloGain.gain.input);
    } catch (I) {
      B.warn("SynthEngine", `[PERF:SHARED-LFO] Failed to connect shared LFOs to voice for ${T}`, I, "audio");
    }
  }
  const B = a ?? {
    debug: () => {
    },
    info: () => {
    },
    warn: () => {
    }
  };
  function R(S) {
    if (i)
      return i.getFilteredCoefficients(S);
    const T = u[S];
    return T != null && T.coeffs ? T.coeffs : new Float32Array([0, 1]);
  }
  function y(S) {
    const T = S.reduce((I, D) => I + Math.abs(D), 0);
    return T > 1 ? Array.from(S).map((I) => I / T) : Array.from(S);
  }
  const P = {
    init() {
      var S;
      this.stopBackgroundMonitors(), h = new x.Gain(tt()), w = new qt(h, {}, M), w.start(), c = new x.Volume(o), l = new x.Compressor({
        threshold: -12,
        ratio: 3,
        attack: 0.01,
        release: 0.1,
        knee: 6
      }), N = new x.Limiter(-3), s = new x.Meter(), h.connect(c), c.connect(l), l.connect(N), N.toDestination(), N.connect(s), s && (O = new Ut(s, {
        onWarning: (T) => {
          B.warn("SynthEngine", "Limiter input approaching clipping threshold", { level: T }, "audio");
        }
      }), O.start());
      for (const T in u) {
        const I = u[T];
        if (!I) continue;
        I.vibrato || (I.vibrato = { speed: 0, span: 0 }), I.tremelo || (I.tremelo = { speed: 0, span: 0 });
        const D = R(T), _ = y(D), E = I.gain || 1, L = new x.PolySynth({
          voice: Vt,
          options: {
            oscillator: { type: "custom", partials: _ },
            envelope: I.adsr,
            filter: I.filter,
            vibrato: I.vibrato,
            tremelo: I.tremelo,
            gain: E
          }
        }).connect(h);
        g && h && g.applySynthEffects(L, T, h), r[T] = /* @__PURE__ */ new WeakSet();
        const W = L.triggerAttack.bind(L);
        L.triggerAttack = function(...V) {
          const H = W(...V), q = (V[1] ?? x.now()) + 5e-3, U = r[T];
          return x.Draw.schedule(() => {
            const j = this._activeVoices, K = (z) => {
              !z || U.has(z) || (G(z, T), g && g.applyEffectsToVoice(z, T), U.add(z));
            };
            j && j.length > 0 ? j.forEach((z) => K((z == null ? void 0 : z.voice) ?? z)) : this._voices && Array.isArray(this._voices) && this._voices.forEach((z) => K(z));
          }, q), H;
        }, L._currentVibrato = I.vibrato, L._currentTremolo = I.tremelo, L._currentFilter = I.filter, m[T] = L, F(T, I.vibrato), $(T, I.tremelo), B.debug("SynthEngine", `Created filtered synth for color: ${T}`, null, "audio");
      }
      try {
        const T = x.context.rawContext;
        (S = T == null ? void 0 : T.addEventListener) == null || S.call(T, "statechange", () => {
          console.warn("[AudioDiag] AudioContext state →", T.state);
        });
      } catch {
      }
      A && (clearInterval(A), A = null), A = setInterval(() => {
        var V, H, J;
        if (!v()) return;
        let T = 0;
        const I = [];
        for (const q in m) {
          const U = ((V = m[q]) == null ? void 0 : V.activeVoices) ?? 0;
          T += U, I.push(`${q.slice(1, 4)}:${U}`);
        }
        const D = (w == null ? void 0 : w.getActiveVoiceCount()) ?? -1, _ = ((H = h == null ? void 0 : h.gain.value) == null ? void 0 : H.toFixed(4)) ?? "?", E = ((J = x.context) == null ? void 0 : J.state) ?? "?";
        let L = "?";
        try {
          const q = s == null ? void 0 : s.getValue(), U = Array.isArray(q) ? q[0] : q;
          U !== void 0 && (L = U.toFixed(1));
        } catch {
        }
        const W = D - T;
        console.log(
          `[AudioDiag] HEALTH | voices: GM=${D} actual=${T} (${I.join(" ")}) | gain: ${_} | ctx: ${E} | meter: ${L}dB` + (Math.abs(W) > 5 ? ` | ⚠ DRIFT=${W}` : "")
        );
      }, 2e3), B.info("SynthEngine", "Initialized with multi-timbral support", null, "audio");
    },
    updateSynthForColor(S) {
      const T = u[S], I = m[S];
      if (!I || !T) return;
      T.vibrato || (T.vibrato = { speed: 0, span: 0 }), T.tremelo || (T.tremelo = { speed: 0, span: 0 }), B.debug("SynthEngine", `Updating timbre for color ${S}`, null, "audio");
      const D = R(S), _ = y(D);
      I.set({
        oscillator: { partials: _ },
        envelope: T.adsr
      }), g && h && g.applySynthEffects(I, S, h), F(S, T.vibrato), $(S, T.tremelo), b(I).forEach((L) => {
        if (L != null && L._setFilter && L._setFilter(T.filter), L != null && L._setPresetGain) {
          const W = T.gain || 1;
          L._setPresetGain(W);
        }
      });
    },
    setBpm(S) {
      var T;
      try {
        (T = x == null ? void 0 : x.Transport) != null && T.bpm && (x.Transport.bpm.value = S, B.debug("SynthEngine", `Tone.Transport BPM updated to ${S}`, null, "audio"));
      } catch (I) {
        B.warn("SynthEngine", "Unable to update BPM on Tone.Transport", { tempo: S, error: I }, "audio");
      }
    },
    setVolume(S) {
      c && (c.volume.value = S);
    },
    async playNote(S, T, I = x.now()) {
      await (t || (() => x.start()))();
      const _ = Object.keys(m);
      if (_.length === 0) return;
      const [E] = _;
      if (!E) return;
      const L = m[E];
      L && L.triggerAttackRelease(S, T, I);
    },
    /**
     * Trigger note attack. Used by Transport scheduling with explicit time parameter.
     * For interactive (user-initiated) triggers, use triggerAttackInteractive instead.
     */
    triggerAttack(S, T, I = x.now(), D = !1) {
      var E;
      const _ = m[T];
      if (_) {
        if (v()) {
          const L = (w == null ? void 0 : w.getActiveVoiceCount()) ?? -1, W = M();
          console.log(`[AudioDiag] ATTACK | color=${T} pitch=${S} | GM=${L} actual=${W} | ctx=${(E = x.context) == null ? void 0 : E.state}`);
        }
        if (D && d) {
          const L = d(), W = _.volume.value, V = W + 20 * Math.log10(L);
          _.volume.value = V, _.triggerAttack(S, I), x.Draw.schedule(() => {
            _ != null && _.volume && (_.volume.value = W);
          }, I + 0.1);
        } else
          _.triggerAttack(S, I);
      }
    },
    /**
     * Trigger note attack for interactive (user-initiated) events.
     * Adds a small scheduling offset (20ms) to help the audio thread process
     * the event without pops or clicks.
     *
     * Use this for mouse clicks, keyboard presses, or other immediate UI triggers.
     */
    triggerAttackInteractive(S, T) {
      x.context.state !== "running" && x.context.resume(), P.triggerAttack(S, T, x.now() + 0.02);
    },
    quickReleasePitches(S, T) {
      var _;
      const I = m[T];
      if (!I || !S || S.length === 0) return;
      let D;
      try {
        const E = typeof I.get == "function" ? I.get() : null, L = (_ = E == null ? void 0 : E.envelope) == null ? void 0 : _.release;
        D = typeof L == "number" ? L : void 0, I.set({ envelope: { release: 0.01 } }), S.forEach((W) => {
          I.triggerRelease(W, x.now());
        });
      } catch (E) {
        B.warn("SynthEngine", "quickReleasePitches failed", { err: E, color: T, pitches: S }, "audio");
      } finally {
        if (D !== void 0)
          try {
            I.set({ envelope: { release: D } });
          } catch {
          }
      }
    },
    triggerRelease(S, T, I = x.now()) {
      const D = m[T];
      if (D && (D.triggerRelease(S, I), v())) {
        const _ = (w == null ? void 0 : w.getActiveVoiceCount()) ?? -1, E = M(), L = _ - E;
        console.log(`[AudioDiag] RELEASE | color=${T} pitch=${S} | GM=${_} actual=${E}` + (Math.abs(L) > 5 ? ` | ⚠ DRIFT=${L}` : ""));
      }
    },
    releaseAll() {
      var S;
      for (const T in m)
        (S = m[T]) == null || S.releaseAll();
      w == null || w.resetActiveVoiceCount();
    },
    // === Waveform Visualization ===
    createWaveformAnalyzer(S) {
      const T = m[S];
      return T ? (C[S] || (C[S] = new x.Analyser("waveform", 1024), T.connect(C[S]), B.debug("SynthEngine", `Created waveform analyzer for color: ${S}`, null, "waveform")), C[S]) : (B.warn("SynthEngine", `No synth found for color: ${S}`, null, "audio"), null);
    },
    getWaveformAnalyzer(S) {
      return C[S] || null;
    },
    getAllWaveformAnalyzers() {
      const S = /* @__PURE__ */ new Map();
      for (const T in C)
        C[T] && S.set(T, C[T]);
      return S;
    },
    removeWaveformAnalyzer(S) {
      C[S] && (C[S].dispose(), delete C[S], B.debug("SynthEngine", `Removed waveform analyzer for color: ${S}`, null, "waveform"));
    },
    disposeAllWaveformAnalyzers() {
      for (const S in C)
        C[S] && C[S].dispose();
      C = {}, B.debug("SynthEngine", "Disposed all waveform analyzers", null, "waveform");
    },
    // === Node Access ===
    getSynth(S) {
      return m[S] || null;
    },
    getAllSynths() {
      return { ...m };
    },
    getMainVolumeNode() {
      return c || null;
    },
    getMasterGainNode() {
      return h || null;
    },
    // === Cleanup ===
    stopBackgroundMonitors() {
      O == null || O.stop(), w == null || w.stop(), A && (clearInterval(A), A = null);
    },
    dispose() {
      var S, T, I;
      this.stopBackgroundMonitors(), this.disposeAllWaveformAnalyzers();
      for (const D in p)
        (S = p[D]) == null || S.dispose(), p[D] = null;
      for (const D in f)
        (T = f[D]) == null || T.dispose(), f[D] = null;
      for (const D in m)
        (I = m[D]) == null || I.dispose();
      h == null || h.dispose(), c == null || c.dispose(), l == null || l.dispose(), N == null || N.dispose(), s == null || s.dispose(), B.debug("SynthEngine", "Disposed SynthEngine", null, "audio");
    }
  };
  return P;
}
const ze = 1e-4;
function Xt(n) {
  const {
    getMacrobeatInfo: e,
    getPlacedTonicSigns: o,
    getTonicSpanColumnIndices: g,
    updatePlayheadModel: i,
    logger: a
  } = n;
  let t = [], d = 0, m = 0, r = 0, h = null, c = null;
  const l = a ?? {
    debug: () => {
    }
  };
  function N(w) {
    return 60 / (w * 2);
  }
  function s(w, O, u) {
    let A = 0;
    l.debug("TimeMapCalculator", "[TIMEMAP] Building timeMap", {
      columnCount: O.length,
      tonicSignCount: u.length,
      microbeatDuration: w
    });
    const v = O.length, p = g(u);
    for (let f = 0; f < v; f++) {
      t[f] = A;
      const M = p.has(f);
      if (M ? l.debug("TimeMapCalculator", `[TIMEMAP] Column ${f} is tonic, not advancing time`) : A += (O[f] || 0) * w, f < 5) {
        const b = t[f];
        b !== void 0 && l.debug("TimeMapCalculator", `[TIMEMAP] timeMap[${f}] = ${b.toFixed(3)}s (isTonic: ${M})`);
      }
    }
    v > 0 && (t[v] = A), l.debug("TimeMapCalculator", `[TIMEMAP] Complete. Total columns: ${v}, Final time: ${A.toFixed(3)}s`);
  }
  function C(w) {
    const O = t.length > 0 ? t[t.length - 1] ?? 0 : 0;
    if (!Number.isFinite(O) || O === 0) {
      d = 0;
      return;
    }
    if (!h || h.length === 0) {
      d = O;
      return;
    }
    let u = O;
    for (const A of h) {
      const v = (c == null ? void 0 : c.get(A.measureIndex)) ?? null;
      if (v) {
        const p = v.endColumn - 1, f = t[p] ?? O, M = O - f, b = M * A.ratio;
        u = u - M + b;
      }
    }
    d = u;
  }
  return {
    getMicrobeatDuration: N,
    calculate(w) {
      var f, M, b;
      l.debug("TimeMapCalculator", "calculate", { tempo: `${w.tempo} BPM` }), t = [];
      const O = N(w.tempo), { columnWidths: u } = w, A = o();
      s(O, u, A), (M = l.timing) == null || M.call(l, "TimeMapCalculator", "calculate", { totalDuration: `${(f = t[t.length - 1]) == null ? void 0 : f.toFixed(2)}s` });
      const v = ((b = w.tempoModulationMarkers) == null ? void 0 : b.filter((F) => F.active)) || [];
      if (v.length > 0) {
        h = [...v].sort((F, $) => F.measureIndex - $.measureIndex), c = /* @__PURE__ */ new Map();
        for (const F of h)
          c.set(F.measureIndex, e(F.measureIndex));
      } else
        h = null, c = null;
      C();
      const p = d;
      i == null || i({
        timeMap: t,
        musicalEndTime: p,
        columnWidths: w.columnWidths,
        cellWidth: w.cellWidth
      });
    },
    getTimeMap() {
      return t;
    },
    getMusicalEndTime() {
      return d;
    },
    findNonAnacrusisStart(w) {
      if (!w.hasAnacrusis)
        return l.debug("TimeMapCalculator", "[ANACRUSIS] No anacrusis, starting from time 0"), 0;
      for (let O = 0; O < w.macrobeatBoundaryStyles.length; O++)
        if (w.macrobeatBoundaryStyles[O] === "solid") {
          const u = e(O + 1);
          if (u) {
            const A = t[u.startColumn] || 0;
            return l.debug("TimeMapCalculator", `[ANACRUSIS] Found solid boundary at macrobeat ${O}, non-anacrusis starts at column ${u.startColumn}, time ${A.toFixed(3)}s`), A;
          }
        }
      return l.debug("TimeMapCalculator", "[ANACRUSIS] No solid boundary found, starting from time 0"), 0;
    },
    applyModulationToTime(w, O, u) {
      if (!h || h.length === 0)
        return w;
      let A = w;
      O < 5 && l.debug("TimeMapCalculator", `[MODULATION] Column ${O}: baseTime ${w.toFixed(3)}s, ${h.length} active markers`);
      for (const v of h) {
        const p = (c == null ? void 0 : c.get(v.measureIndex)) ?? null;
        if (p) {
          const f = p.endColumn;
          if (O > f) {
            const M = t[f] !== void 0 ? t[f] : 0, b = w - M, F = b * v.ratio;
            A = A - b + F, O < 5 && l.debug("TimeMapCalculator", `[MODULATION] Column ${O}: Applied marker at measure ${v.measureIndex} (col ${f}), ratio ${v.ratio}, adjustedTime ${A.toFixed(3)}s`);
          }
        }
      }
      return A;
    },
    setLoopBounds(w, O, u) {
      const A = N(u), v = Math.max(A, 1e-3), p = Number.isFinite(w) ? w : 0;
      let f = Number.isFinite(O) ? O : p + v;
      f <= p && (f = p + v), m = p, r = f, x != null && x.Transport && (x.Transport.loopStart = p, x.Transport.loopEnd = f);
    },
    getConfiguredLoopBounds() {
      return { loopStart: m, loopEnd: r };
    },
    setConfiguredLoopBounds(w, O) {
      m = w, r = O;
    },
    clearConfiguredLoopBounds() {
      m = 0, r = 0;
    },
    reapplyConfiguredLoopBounds(w) {
      if (r > m) {
        const O = x.Time(x.Transport.loopStart).toSeconds(), u = x.Time(x.Transport.loopEnd).toSeconds(), A = Math.abs(O - m), v = Math.abs(u - r);
        (A > ze || v > ze) && (x.Transport.loopStart = m, x.Transport.loopEnd = r), x.Transport.loop !== w && (x.Transport.loop = w);
      }
    },
    updateLoopBoundsFromTimeline(w) {
      const O = this.findNonAnacrusisStart(w), u = d;
      this.setLoopBounds(O, u, w.tempo);
    }
  };
}
const Jt = {
  H: "https://tonejs.github.io/audio/drum-samples/CR78/hihat.mp3",
  M: "https://tonejs.github.io/audio/drum-samples/CR78/snare.mp3",
  L: "https://tonejs.github.io/audio/drum-samples/CR78/kick.mp3"
}, zt = 1e-4;
function jt(n = {}) {
  var m;
  const {
    samples: e = Jt,
    synthEngine: o,
    initialVolume: g = 0
  } = n;
  let i = null, a = null;
  const t = /* @__PURE__ */ new Map();
  function d(r, h) {
    let c = Number.isFinite(h) ? h : x.now();
    const l = t.get(r) ?? -1 / 0;
    return c > l || (c = l + zt), t.set(r, c), c;
  }
  if (a = new x.Volume(g), i = new x.Players(e).connect(a), o) {
    const r = (m = o.getMainVolumeNode) == null ? void 0 : m.call(o);
    r ? a.connect(r) : a.toDestination();
  } else
    a.toDestination();
  return {
    getPlayers() {
      return i;
    },
    getVolumeNode() {
      return a;
    },
    trigger(r, h) {
      var l;
      if (!i) return;
      const c = d(r, h);
      (l = i.player(r)) == null || l.start(c);
    },
    reset() {
      t.clear();
    },
    dispose() {
      i == null || i.dispose(), a == null || a.dispose(), i = null, a = null, t.clear();
    },
    isLoaded() {
      return (i == null ? void 0 : i.loaded) ?? !1;
    },
    async waitForLoad() {
      i && await i.loaded;
    }
  };
}
const je = "♭", ke = "♯";
function kt(n, e) {
  if (n.length < 2 || e < n[0] || e >= n[n.length - 1]) return -1;
  let o = 0, g = n.length - 2;
  for (; o <= g; ) {
    const i = o + g >>> 1, a = n[i], t = n[i + 1];
    if (e >= a && e < t)
      return i;
    e < a ? g = i - 1 : o = i + 1;
  }
  return -1;
}
function Wn(n) {
  const {
    synthEngine: e,
    stateCallbacks: o,
    eventCallbacks: g,
    visualCallbacks: i,
    logger: a,
    audioInit: t,
    playbackMode: d = "standard",
    highwayService: m
  } = n, r = a ?? {
    debug: () => {
    },
    info: () => {
    },
    warn: () => {
    }
  };
  let h = null, c = !1, l = null, N = null, s = 1, C = null;
  const w = 50, O = [];
  function u(R, y) {
    const P = y.fullRowData[R];
    return P ? P.toneNote.replace(je, "b").replace(ke, "#") : "C4";
  }
  function A(R, y) {
    const P = R.globalRow ?? R.row, S = y.fullRowData[P];
    return S ? S.toneNote.replace(je, "b").replace(ke, "#") : "C4";
  }
  function v() {
    var D, _, E, L;
    if (!l) return;
    const R = o.getState();
    r.debug("TransportService", "scheduleNotes", "Clearing previous transport events and rescheduling all notes"), x.Transport.cancel(), N == null || N.reset(), l.calculate(R), (D = i == null ? void 0 : i.clearAdsrVisuals) == null || D.call(i);
    const y = l.getTimeMap(), { loopEnd: P } = l.getConfiguredLoopBounds(), S = l.findNonAnacrusisStart(R);
    r.debug("TransportService", `[ANACRUSIS] hasAnacrusis: ${R.hasAnacrusis}, anacrusisOffset: ${S.toFixed(3)}s`), R.placedNotes.forEach((W, V) => {
      const H = W.startColumnIndex, J = W.endColumnIndex, q = y[H];
      if (q === void 0) {
        r.warn("TransportService", `[NOTE SCHEDULE] Note ${V}: timeMap[${H}] undefined, skipping`);
        return;
      }
      const U = l.applyModulationToTime(q, H, R), j = y[J + 1];
      if (j === void 0) {
        r.warn("TransportService", `Skipping note with invalid endColumnIndex: ${W.endColumnIndex + 1}`);
        return;
      }
      const z = l.applyModulationToTime(j, J + 1, R) - U;
      W.isDrum ? p(W, U) : f(W, U, z, P, R);
    });
    const T = ((_ = o.getStampPlaybackData) == null ? void 0 : _.call(o)) ?? [];
    T.forEach((W) => {
      M(W, y, R);
    });
    const I = ((E = o.getTripletPlaybackData) == null ? void 0 : E.call(o)) ?? [];
    I.forEach((W) => {
      b(W, y, R);
    }), r.debug("TransportService", "scheduleNotes", `Finished scheduling ${R.placedNotes.length} notes, ${T.length} stamps, and ${I.length} triplets`), typeof window < "u" && window.__audioDiag && console.log(`[AudioDiag] SCHEDULE | notes=${R.placedNotes.length} stamps=${T.length} triplets=${I.length} | ctx=${(L = x.context) == null ? void 0 : L.state} | transport=${x.Transport.state}`);
  }
  function p(R, y) {
    const P = o.getState();
    x.Transport.schedule((S) => {
      if (P.isPaused) return;
      const T = R.drumTrack;
      if (T == null) return;
      const I = String(T);
      N == null || N.trigger(I, S), x.Draw.schedule(() => {
        var D;
        (D = i == null ? void 0 : i.triggerDrumNotePop) == null || D.call(i, R.startColumnIndex, T);
      }, S);
    }, y);
  }
  function f(R, y, P, S, T) {
    var q;
    const I = A(R, T), D = R.color, _ = R.globalRow ?? R.row, E = ((q = T.fullRowData[_]) == null ? void 0 : q.hex) || "#888888", L = R.uuid, W = T.timbres[D];
    if (!W) {
      r.warn("TransportService", `Timbre not found for color ${D}. Skipping note ${L}`);
      return;
    }
    let V = y + P;
    const J = S - 1e-3;
    V >= S && (V = Math.max(y + 1e-3, J)), x.Transport.schedule((U) => {
      o.getState().isPaused || (e.triggerAttack(I, D, U), x.Draw.schedule(() => {
        var j;
        (j = i == null ? void 0 : i.triggerAdsrVisual) == null || j.call(i, L, "attack", E, W.adsr), g.emit("noteAttack", { noteId: L, color: D });
      }, U));
    }, y), x.Transport.schedule((U) => {
      e.triggerRelease(I, D, U), x.Draw.schedule(() => {
        var j;
        (j = i == null ? void 0 : i.triggerAdsrVisual) == null || j.call(i, L, "release", E, W.adsr), g.emit("noteRelease", { noteId: L, color: D });
      }, U);
    }, V);
  }
  function M(R, y, P) {
    var D;
    const S = R.column, T = y[S];
    if (T === void 0) return;
    (((D = o.getStampScheduleEvents) == null ? void 0 : D.call(o, R.sixteenthStampId, R.placement)) ?? []).forEach((_) => {
      F(_, T, R.row, R.color, P);
    });
  }
  function b(R, y, P) {
    var D, _;
    const S = ((D = o.timeToCanvas) == null ? void 0 : D.call(o, R.startTimeIndex, P)) ?? R.startTimeIndex, T = y[S];
    if (T === void 0) return;
    (((_ = o.getTripletScheduleEvents) == null ? void 0 : _.call(o, R.tripletStampId, R.placement)) ?? []).forEach((E) => {
      F(E, T, R.row, R.color, P);
    });
  }
  function F(R, y, P, S, T) {
    const I = x.Time(R.offset).toSeconds(), D = x.Time(R.duration).toSeconds(), _ = y + I, E = _ + D, L = P + R.rowOffset, W = u(L, T);
    x.Transport.schedule((V) => {
      o.getState().isPaused || e.triggerAttack(W, S, V);
    }, _), x.Transport.schedule((V) => {
      o.getState().isPaused || e.triggerRelease(W, S, V);
    }, E);
  }
  function $() {
    var _, E;
    const y = o.getState().tempo, P = 1e-4, S = 0.5, T = (L) => (L == null ? void 0 : L.xPosition) ?? 477.5, I = typeof ((E = (_ = x.Transport) == null ? void 0 : _.bpm) == null ? void 0 : E.value) == "number" ? x.Transport.bpm.value : y;
    s = y !== 0 ? I / y : 1, c = !0;
    function D() {
      var Me, Ae, ve, be, we, Ie, xe, Pe, Ee, De, Oe, Fe, Re, Be, Ge;
      if (!c || !l)
        return;
      if (x.Transport.state === "stopped") {
        h = requestAnimationFrame(D);
        return;
      }
      const L = o.getState(), W = x.Time(x.Transport.loopEnd).toSeconds(), V = L.isLooping, H = l.getMusicalEndTime(), J = V && W > 0 ? W : H, q = x.Transport.seconds, U = q * 1e3, j = q >= J - 1e-3;
      if (!V && j) {
        r.info("TransportService", "Playback reached end. Stopping playhead."), B.stop();
        return;
      }
      if (L.isPaused) {
        h = requestAnimationFrame(D);
        return;
      }
      const K = l.getTimeMap();
      (Me = i == null ? void 0 : i.clearPlayheadCanvas) == null || Me.call(i), (Ae = i == null ? void 0 : i.clearDrumPlayheadCanvas) == null || Ae.call(i);
      let z = q;
      if (V) {
        const ee = x.Time(x.Transport.loopStart).toSeconds(), k = x.Time(x.Transport.loopEnd).toSeconds() - ee;
        k > 0 && (z = (q - ee) % k + ee);
      }
      const it = ((ve = o.getCanvasWidth) == null ? void 0 : ve.call(o)) ?? 1e3, ot = ((be = o.getPlacedTonicSigns) == null ? void 0 : be.call(o)) ?? [], Se = ((we = o.getTonicSpanColumnIndices) == null ? void 0 : we.call(o, ot)) ?? /* @__PURE__ */ new Set();
      let re = 0, ye = 0, Ce = 0, le = -1;
      const ne = kt(K, z);
      if (ne >= 0) {
        const ee = K[ne], Le = K[ne + 1];
        let k = ne;
        for (; Se.has(k) && k < K.length - 1; )
          k++;
        const ue = ((Ie = o.getColumnStartX) == null ? void 0 : Ie.call(o, k)) ?? 0, _e = ((xe = o.getColumnWidth) == null ? void 0 : xe.call(o, k)) ?? 10;
        if (ye = ue, Ce = _e, le = k, Se.has(ne))
          re = ue;
        else {
          const $e = Le - ee, at = z - ee, rt = $e > 0 ? at / $e : 0;
          re = ue + rt * _e;
        }
      }
      const oe = Math.min(re, it);
      G(L, oe, y, T, P, S);
      const Te = ((Pe = i == null ? void 0 : i.getPlayheadCanvasHeight) == null ? void 0 : Pe.call(i)) ?? 500, Ne = ((Ee = i == null ? void 0 : i.getDrumCanvasHeight) == null ? void 0 : Ee.call(i)) ?? 100, Z = L.playheadMode === "macrobeat" && le >= 0 ? (De = o.getMacrobeatHighlightRect) == null ? void 0 : De.call(o, le) : null, ce = (Z == null ? void 0 : Z.x) ?? ye, de = (Z == null ? void 0 : Z.width) ?? Ce;
      oe >= 0 && (L.playheadMode === "macrobeat" || L.playheadMode === "microbeat" ? ((Oe = i == null ? void 0 : i.drawPlayheadHighlight) == null || Oe.call(i, ce, de, Te, U), (Fe = i == null ? void 0 : i.drawDrumPlayheadHighlight) == null || Fe.call(i, ce, de, Ne, U)) : ((Re = i == null ? void 0 : i.drawPlayheadLine) == null || Re.call(i, oe, Te), (Be = i == null ? void 0 : i.drawDrumPlayheadLine) == null || Be.call(i, oe, Ne)));
      const st = L.playheadMode === "macrobeat" || L.playheadMode === "microbeat";
      (Ge = i == null ? void 0 : i.updateBeatLineHighlight) == null || Ge.call(i, ce, de, st), h = requestAnimationFrame(D);
    }
    D();
  }
  function G(R, y, P, S, T, I) {
    if (!l) return;
    const _ = (Array.isArray(R.tempoModulationMarkers) ? R.tempoModulationMarkers : []).filter((E) => (E == null ? void 0 : E.active) && typeof E.ratio == "number" && E.ratio !== 0).sort((E, L) => S(E) - S(L));
    if (_.length > 0) {
      let E = 1;
      for (const L of _) {
        const W = S(L);
        if (y + I >= W)
          E *= 1 / L.ratio;
        else
          break;
      }
      if ((!Number.isFinite(E) || E <= 0) && (E = 1), Math.abs(E - s) > T) {
        const L = P * E;
        x.Transport.bpm.value = L, l.reapplyConfiguredLoopBounds(R.isLooping), s = E, r.debug("TransportService", `Tempo multiplier updated to ${E.toFixed(3)} (${L.toFixed(2)} BPM)`);
      }
    } else Math.abs(s - 1) > T && (x.Transport.bpm.value = P, l.reapplyConfiguredLoopBounds(R.isLooping), s = 1, r.debug("TransportService", `Tempo reset to base ${P} BPM`));
  }
  const B = {
    init() {
      const R = o.getState();
      l = Xt({
        getMacrobeatInfo: o.getMacrobeatInfo ?? (() => null),
        getPlacedTonicSigns: o.getPlacedTonicSigns ?? (() => []),
        getTonicSpanColumnIndices: o.getTonicSpanColumnIndices ?? (() => /* @__PURE__ */ new Set()),
        logger: r
      }), N = jt({
        samples: {
          H: "https://tonejs.github.io/audio/drum-samples/CR78/hihat.mp3",
          M: "https://tonejs.github.io/audio/drum-samples/CR78/snare.mp3",
          L: "https://tonejs.github.io/audio/drum-samples/CR78/kick.mp3"
        },
        synthEngine: {
          getMainVolumeNode: () => e.getMainVolumeNode()
        }
      }), x.Transport.bpm.value = R.tempo;
      const y = () => this.handleStateChange(), P = () => this.handleStateChange(), S = () => this.handleStateChange(), T = () => {
        if (l && l.getTimeMap().length > 0) {
          const E = o.getState();
          l.calculate(E);
        }
        this.handleStateChange();
      }, I = (E) => {
        var V, H;
        const L = ((V = E == null ? void 0 : E.oldConfig) == null ? void 0 : V.columnWidths) || [], W = ((H = E == null ? void 0 : E.newConfig) == null ? void 0 : H.columnWidths) || [];
        L.length !== W.length && l && l.calculate(o.getState());
      }, D = (E) => {
        if (r.info("TransportService", `tempoChanged triggered with new value: ${E} BPM`), x.Transport.state === "started") {
          const L = x.Transport.position;
          x.Transport.pause(), h && (cancelAnimationFrame(h), h = null), x.Transport.bpm.value = E, l == null || l.reapplyConfiguredLoopBounds(o.getState().isLooping), v(), x.Transport.start(void 0, L), d === "standard" && $();
        } else
          x.Transport.bpm.value = E, l == null || l.reapplyConfiguredLoopBounds(o.getState().isLooping), l == null || l.calculate(o.getState());
      }, _ = (E) => {
        x.Transport.loop = E;
        const L = x.Time(x.Transport.loopStart).toSeconds(), W = x.Time(x.Transport.loopEnd).toSeconds();
        E && W <= L && l && (x.Transport.loopEnd = L + Math.max(l.getMicrobeatDuration(o.getState().tempo), 1e-3)), E && l ? l.setConfiguredLoopBounds(
          x.Time(x.Transport.loopStart).toSeconds(),
          x.Time(x.Transport.loopEnd).toSeconds()
        ) : l == null || l.clearConfiguredLoopBounds();
      };
      g.on("rhythmStructureChanged", y), g.on("notesChanged", P), g.on("sixteenthStampPlacementsChanged", S), g.on("tempoModulationMarkersChanged", T), g.on("layoutConfigChanged", I), g.on("tempoChanged", D), g.on("loopingChanged", _), O.push(
        () => {
        }
        // These would be off() calls if the event system supports them
      ), x.Transport.on("stop", () => {
        var E, L;
        r.info("TransportService", "Tone.Transport 'stop' fired. Resetting playback state"), (E = g.setPlaybackState) == null || E.call(g, !1, !1), (L = i == null ? void 0 : i.clearAdsrVisuals) == null || L.call(i), h && (cancelAnimationFrame(h), h = null);
      }), r.info("TransportService", "Initialized");
    },
    handleStateChange() {
      x.Transport.state === "started" ? (C !== null && clearTimeout(C), C = setTimeout(() => {
        C = null, r.debug("TransportService", "handleStateChange: Rescheduling after debounce");
        const y = x.Transport.position;
        x.Transport.pause(), v(), x.Transport.start(void 0, y);
      }, w)) : l == null || l.calculate(o.getState());
    },
    start() {
      r.info("TransportService", "Starting playback"), (t || (() => x.start()))().then(async () => {
        x.context.state !== "running" && await x.context.resume(), N && await N.waitForLoad();
        const y = o.getState();
        l == null || l.calculate(y);
        const P = (l == null ? void 0 : l.getMusicalEndTime()) ?? 0, S = (l == null ? void 0 : l.findNonAnacrusisStart(y)) ?? 0;
        l == null || l.setLoopBounds(S, P, y.tempo), x.Transport.bpm.value = y.tempo, v();
        const T = x.now() + 0.1;
        x.Transport.start(T, 0), d === "standard" && $(), g.emit("playbackStarted");
      });
    },
    resume() {
      r.info("TransportService", "Resuming playback"), (t || (() => x.start()))().then(async () => {
        x.context.state !== "running" && await x.context.resume(), x.Transport.start(), d === "standard" && $(), g.emit("playbackResumed");
      });
    },
    pause() {
      r.info("TransportService", "Pausing playback"), x.Transport.pause(), h && (cancelAnimationFrame(h), h = null), g.emit("playbackPaused");
    },
    stop() {
      var y, P, S;
      r.info("TransportService", "Stopping playback and clearing visuals"), C !== null && (clearTimeout(C), C = null), c = !1, h && (cancelAnimationFrame(h), h = null), x.Transport.stop(), x.Transport.cancel(), N == null || N.reset();
      const R = o.getState();
      x.Transport.bpm.value = R.tempo, l == null || l.reapplyConfiguredLoopBounds(R.isLooping), e.releaseAll(), (y = i == null ? void 0 : i.clearPlayheadCanvas) == null || y.call(i), (P = i == null ? void 0 : i.clearDrumPlayheadCanvas) == null || P.call(i), (S = i == null ? void 0 : i.updateBeatLineHighlight) == null || S.call(i, 0, 0, !1), g.emit("playbackStopped");
    },
    dispose() {
      this.stop(), N == null || N.dispose(), O.forEach((R) => R()), r.debug("TransportService", "Disposed");
    }
  };
  return B;
}
const Kt = {
  latencyHint: "playback",
  lookAhead: 0.1
};
function Vn(n = {}) {
  const { latencyHint: e, lookAhead: o } = { ...Kt, ...n };
  let g = !1;
  if (x.context.state === "suspended")
    try {
      x.setContext(new x.Context({
        latencyHint: e
      })), g = !0;
    } catch (i) {
      console.warn("Failed to create new AudioContext, using default:", i);
    }
  return o !== void 0 && (x.context.lookAhead = o), g;
}
function qn() {
  const n = x.context.rawContext, e = n && "baseLatency" in n ? n.baseLatency : void 0;
  return {
    state: x.context.state,
    sampleRate: x.context.sampleRate,
    baseLatency: e,
    lookAhead: x.context.lookAhead
  };
}
function Yt(n) {
  let e = null, o = null;
  function g() {
    const l = typeof performance < "u" ? performance.now() : Date.now();
    return (!e || !o || l - o > 1) && (e = n.getViewportInfo(), o = l), e;
  }
  function i() {
    e = null, o = null;
  }
  function a(l, N) {
    if (n.columnToPixelX)
      return n.columnToPixelX(l, N);
    const { columnWidths: s, cellWidth: C } = N;
    let w = 0;
    for (let O = 0; O < l && O < s.length; O++)
      w += (s[O] ?? 1) * C;
    return w;
  }
  function t(l, N) {
    const s = g(), C = l - s.startRank, w = N.cellHeight / 2;
    return (C + 1) * w;
  }
  function d(l, N) {
    if (n.pixelXToColumn)
      return n.pixelXToColumn(l, N);
    const { columnWidths: s, cellWidth: C } = N;
    let w = 0;
    for (let O = 0; O < s.length; O++) {
      const u = (s[O] ?? 1) * C;
      if (l < w + u)
        return O;
      w += u;
    }
    return s.length - 1;
  }
  function m(l, N) {
    const s = g(), C = N.cellHeight / 2;
    return l / C - 1 + s.startRank;
  }
  function r() {
    const l = g(), { startRank: N, endRank: s } = l, C = Math.max(N, s - 1);
    return { startRow: N, endRow: C };
  }
  function h(l) {
    let N = (l || "").replace(/\d/g, "").trim();
    return N = N.replace(/b/g, "b-").replace(/#/g, "b_"), N;
  }
  function c(l) {
    switch (l) {
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
    getColumnX: a,
    getRowY: t,
    getColumnFromX: d,
    getRowFromY: m,
    getVisibleRowRange: r,
    getPitchClass: h,
    getLineStyleFromPitchClass: c,
    invalidateViewportCache: i,
    getCachedViewportInfo: g
  };
}
const he = "♯", fe = "♭", ae = "/", Qt = 0.35, Zt = 0.5, en = 6, tn = 1, nn = 0.08, on = 0.04, sn = 1, ie = 4;
function an(n) {
  const { coords: e } = n;
  function o(u) {
    const A = u == null ? void 0 : u.split("-")[1];
    return Number.parseInt(A ?? "0", 10);
  }
  function g(u) {
    if (!u || typeof u.startColumnIndex != "number" || typeof u.endColumnIndex != "number")
      return !1;
    const A = u.shape === "circle" ? u.startColumnIndex + 1 : u.startColumnIndex;
    return u.endColumnIndex > A;
  }
  function i(u, A) {
    return Number.isFinite(u) && u > 0 && Number.isFinite(A) && A > 0;
  }
  function a(u, A, v) {
    const { cellWidth: p } = v, f = p * 0.25, M = u.uuid;
    if (!M) return 0;
    const b = A.filter(
      (G) => !G.isDrum && G.row === u.row && G.startColumnIndex === u.startColumnIndex && G.uuid && G.uuid !== M
    );
    if (b.length === 0) return 0;
    const F = [u, ...b];
    return F.sort((G, B) => o(G.uuid) - o(B.uuid)), F.findIndex((G) => G.uuid === M) * f;
  }
  function t(u, A) {
    var M, b, F;
    const { cellHeight: v } = A, p = (M = n.getAnimationEffectsManager) == null ? void 0 : M.call(n);
    return (b = p == null ? void 0 : p.shouldAnimateNote) != null && b.call(p, u) ? (((F = p.getVibratoYOffset) == null ? void 0 : F.call(p, u.color)) ?? 0) * v : 0;
  }
  function d(u, A, v) {
    const { cellHeight: p } = v, f = p / 2 * 0.12, M = u.uuid;
    if (!M) return 0;
    const b = A.filter(
      (G) => !G.isDrum && G.row === u.row && G.startColumnIndex === u.startColumnIndex && G.uuid && G.uuid !== M && g(G)
    );
    if (b.length === 0) return 0;
    const F = [u, ...b];
    return F.sort((G, B) => o(G.uuid) - o(B.uuid)), F.findIndex((G) => G.uuid === M) * f;
  }
  function m(u, A) {
    var R, y, P;
    const v = (R = n.getDegreeForNote) == null ? void 0 : R.call(n, u);
    if (!v) return { label: null, isAccidental: !1 };
    if (!(((y = n.hasAccidental) == null ? void 0 : y.call(n, v)) ?? !1)) return { label: v, isAccidental: !1 };
    const f = A.accidentalMode || {}, M = f.sharp ?? !0, b = f.flat ?? !0;
    if (!M && !b) return { label: null, isAccidental: !0 };
    let F = v.includes(he) ? v : null, $ = v.includes(fe) ? v : null;
    const G = (P = n.getEnharmonicDegree) == null ? void 0 : P.call(n, v);
    G && (G.includes(he) && !F && (F = G), G.includes(fe) && !$ && ($ = G));
    let B = null;
    if (M && b) {
      const S = [];
      F && S.push(F), $ && (!F || $ !== F) && S.push($), B = S.join(ae), B || (B = v);
    } else M ? B = F || v : b && (B = $ || v);
    return { label: B, isAccidental: !0 };
  }
  function r(u) {
    if (!u) return { multiplier: 1, category: "natural" };
    const A = u.includes(fe), v = u.includes(he), p = u.includes(ae);
    return !A && !v ? { multiplier: 1, category: "natural" } : p ? { multiplier: 0.75, category: "both-accidentals" } : { multiplier: 0.88, category: "single-accidental" };
  }
  function h(u, A, v, p, f, M) {
    const { label: b } = m(A, v);
    if (!b) return;
    const { multiplier: F, category: $ } = r(b);
    let G;
    if (A.shape === "circle") {
      const B = M * 2 * Zt;
      switch ($) {
        case "natural":
          G = B;
          break;
        case "single-accidental":
          G = B * 0.8;
          break;
        case "both-accidentals":
          G = B * 0.4;
          break;
        default:
          G = B * F;
      }
    } else {
      const B = M * 2 * Qt;
      switch ($) {
        case "natural":
          G = B * 1.5;
          break;
        case "single-accidental":
          G = B * 1.2;
          break;
        case "both-accidentals":
          G = B;
          break;
        default:
          G = B * F;
      }
    }
    if (!(G < en))
      if (u.fillStyle = "#212529", u.font = `bold ${G}px 'Atkinson Hyperlegible', sans-serif`, u.textAlign = "center", u.textBaseline = "middle", A.shape === "oval" && $ === "both-accidentals" && b.includes(ae)) {
        const B = b.split(ae), R = G * 1.1, y = R * (B.length - 1), P = f - y / 2;
        B.forEach((S, T) => {
          const I = P + T * R, D = G * 0.08;
          u.fillText(S.trim(), p, I + D);
        });
      } else {
        const B = G * 0.08;
        u.fillText(b, p, f + B);
      }
  }
  function c(u, A, v) {
    var B, R;
    const p = (B = n.getAnimationEffectsManager) == null ? void 0 : B.call(n), f = p == null ? void 0 : p.hasReverbEffect;
    if (!(typeof f == "function" ? f(A.color) : !!f)) return { shouldApply: !1, blur: 0, spread: 0 };
    const { cellWidth: b } = v, F = (R = p == null ? void 0 : p.getReverbEffect) == null ? void 0 : R.call(p, A.color);
    if (!F) return { shouldApply: !1, blur: 0, spread: 0 };
    const $ = F.blur * (b / 2), G = F.spread * (b / 3);
    return { shouldApply: $ > 0 || G > 0, blur: $, spread: G };
  }
  function l(u, A, v, p, f, M, b) {
    var B, R, y;
    const F = (B = n.getAnimationEffectsManager) == null ? void 0 : B.call(n);
    if (!((R = F == null ? void 0 : F.hasDelayEffect) != null && R.call(F, A.color))) return;
    const { cellWidth: $ } = v, G = (y = F.getDelayEffects) == null ? void 0 : y.call(F, A.color);
    !G || G.length === 0 || G.forEach((P) => {
      const S = P.delay / 500 * $ * 2, T = p + S, I = M * P.scale, D = b * P.scale;
      u.save(), u.globalAlpha = P.opacity * 0.6, u.beginPath(), u.ellipse(T, f, I, D, 0, 0, 2 * Math.PI), u.strokeStyle = A.color, u.lineWidth = Math.max(0.5, I * 0.1), u.setLineDash([2, 2]), u.stroke(), u.restore();
    });
  }
  function N(u, A, v, p, f, M) {
    var B, R, y;
    const b = (B = n.getAnimationEffectsManager) == null ? void 0 : B.call(n);
    if (!((R = b == null ? void 0 : b.shouldFillNote) != null && R.call(b, A))) return;
    const F = ((y = b.getFillLevel) == null ? void 0 : y.call(b, A)) ?? 0;
    if (F <= 0) return;
    u.save();
    const $ = 1 - F, G = u.createRadialGradient(v, p, 0, v, p, Math.max(f, M));
    G.addColorStop(0, "transparent"), G.addColorStop(Math.max(0, $ - 0.05), "transparent"), G.addColorStop($, `${A.color}1F`), G.addColorStop(1, `${A.color}BF`), u.beginPath(), u.ellipse(v, p, f, M, 0, 0, 2 * Math.PI), u.clip(), u.fillStyle = G, u.fillRect(v - f - 10, p - M - 10, (f + 10) * 2, (M + 10) * 2), u.restore();
  }
  function s(u, A, v, p, f, M) {
    var P, S, T;
    const b = (P = n.getAnimationEffectsManager) == null ? void 0 : P.call(n);
    if (!((S = b == null ? void 0 : b.shouldFillNote) != null && S.call(b, A))) return;
    const F = ((T = b.getFillLevel) == null ? void 0 : T.call(b, A)) ?? 0;
    if (F <= 0) return;
    u.save(), u.beginPath(), u.arc(v, f, M, Math.PI / 2, -Math.PI / 2, !1), u.lineTo(p, f - M), u.arc(p, f, M, -Math.PI / 2, Math.PI / 2, !1), u.lineTo(v, f + M), u.closePath(), u.clip();
    const $ = (v + p) / 2, G = p - v, B = Math.max(G / 2 + M, M), R = 1 - F, y = u.createRadialGradient($, f, 0, $, f, B);
    y.addColorStop(0, "transparent"), y.addColorStop(Math.max(0, R - 0.05), "transparent"), y.addColorStop(R, `${A.color}1F`), y.addColorStop(1, `${A.color}BF`), u.fillStyle = y, u.fillRect(v - M - 10, f - M - 10, G + (M + 10) * 2, (M + 10) * 2), u.restore();
  }
  function C(u, A, v, p, f, M, b, F) {
    if (s(u, A, p, f, M, b), u.save(), u.beginPath(), u.arc(p, M, b, Math.PI / 2, -Math.PI / 2, !1), u.lineTo(f, M - b), u.arc(f, M, b, -Math.PI / 2, Math.PI / 2, !1), u.lineTo(p, M + b), u.closePath(), u.strokeStyle = A.color, u.lineWidth = F, u.shadowColor = A.color, u.shadowBlur = ie, u.stroke(), u.shadowBlur = 0, u.shadowColor = "transparent", u.restore(), v.degreeDisplayMode !== "off") {
      const $ = (p + f) / 2;
      h(u, A, v, $, M, b);
    }
  }
  function w(u, A, v, p) {
    const { cellWidth: f, cellHeight: M, tempoModulationMarkers: b, placedNotes: F } = A, $ = e.getRowY(p, A), G = t(v, A), B = $ + G, R = e.getColumnX(v.startColumnIndex, A);
    let y;
    if (b && b.length > 0 ? y = e.getColumnX(v.startColumnIndex + 1, A) - R : y = f, !i(y, M)) return;
    const P = a(v, F, A), S = R + y + P, T = Math.max(tn, y * nn), I = M / 2 - T / 2, D = g(v), _ = A.longNoteStyle || "style1";
    if (D && _ === "style2") {
      const W = S, V = e.getColumnX(v.endColumnIndex, A);
      if (!i(V - W, I)) return;
      C(u, v, A, W, V, B, I, T);
      return;
    }
    if (D) {
      const W = e.getColumnX(v.endColumnIndex + 1, A), V = d(v, F, A), H = B + V;
      u.beginPath(), u.moveTo(S, H), u.lineTo(W, H), u.strokeStyle = v.color, u.lineWidth = Math.max(sn, y * on), u.stroke();
    }
    const E = y - T / 2;
    if (!i(E, I)) return;
    l(u, v, A, S, B, E, I), u.save(), N(u, v, S, B, E, I);
    const L = c(u, v, A);
    L.shouldApply && (u.shadowColor = v.color, u.shadowBlur = ie + L.blur, u.shadowOffsetX = L.spread), u.beginPath(), u.ellipse(S, B, E, I, 0, 0, 2 * Math.PI), u.strokeStyle = v.color, u.lineWidth = T, L.shouldApply || (u.shadowColor = v.color, u.shadowBlur = ie), u.stroke(), u.shadowBlur = 0, u.shadowColor = "transparent", u.shadowOffsetX = 0, u.restore(), A.degreeDisplayMode !== "off" && h(u, v, A, S, B, E);
  }
  function O(u, A, v, p) {
    const { columnWidths: f, cellWidth: M, cellHeight: b, tempoModulationMarkers: F, placedNotes: $ } = A, G = e.getRowY(p, A), B = t(v, A), R = G + B, y = e.getColumnX(v.startColumnIndex, A);
    let P;
    if (F && F.length > 0 ? P = e.getColumnX(v.startColumnIndex + 1, A) - y : P = (f[v.startColumnIndex] ?? 1) * M, !i(P, b)) return;
    const S = a(v, $, A), T = Math.max(0.5, P * 0.15), I = y + P / 2 + S, D = P / 2 - T / 2, _ = b / 2 - T / 2;
    if (!i(D, _)) return;
    l(u, v, A, I, R, D, _), u.save(), N(u, v, I, R, D, _);
    const E = c(u, v, A);
    E.shouldApply && (u.shadowColor = v.color, u.shadowBlur = ie + E.blur, u.shadowOffsetX = E.spread), u.beginPath(), u.ellipse(I, R, D, _, 0, 0, 2 * Math.PI), u.strokeStyle = v.color, u.lineWidth = T, E.shouldApply || (u.shadowColor = v.color, u.shadowBlur = ie), u.stroke(), u.shadowBlur = 0, u.shadowColor = "transparent", u.shadowOffsetX = 0, u.restore(), A.degreeDisplayMode !== "off" && h(u, v, A, I, R, D);
  }
  return {
    drawTwoColumnOvalNote: w,
    drawSingleColumnOvalNote: O,
    hasVisibleTail: g
  };
}
function rn(n) {
  const { coords: e } = n;
  function o(i, a) {
    const { fullRowData: t, canvasWidth: d, cellHeight: m } = a, { startRow: r, endRow: h } = e.getVisibleRowRange();
    for (let c = r; c <= h; c++) {
      const l = t[c];
      if (!l) continue;
      const N = e.getRowY(c, a), s = e.getPitchClass(l.toneNote), C = e.getLineStyleFromPitchClass(s);
      if (i.beginPath(), i.moveTo(0, N), i.lineTo(d, N), i.strokeStyle = C.color, i.lineWidth = C.lineWidth, i.setLineDash(C.dash), i.stroke(), i.setLineDash([]), s === "G") {
        const w = m / 2;
        i.fillStyle = "#f8f9fa", i.fillRect(0, N - w, d, w);
      }
    }
  }
  function g(i, a) {
    var w, O, u, A;
    const {
      columnWidths: t,
      macrobeatBoundaryStyles: d,
      hasAnacrusis: m,
      canvasHeight: r
    } = a, h = ((w = n.getPlacedTonicSigns) == null ? void 0 : w.call(n)) ?? [], c = ((O = n.getTonicSpanColumnIndices) == null ? void 0 : O.call(n, h)) ?? /* @__PURE__ */ new Set(), l = ((u = n.getAnacrusisColors) == null ? void 0 : u.call(n)) ?? {
      background: "rgba(173, 181, 189, 0.15)",
      border: "rgba(173, 181, 189, 0.3)"
    };
    let N = m, s = 0, C = 0;
    for (let v = 0; v <= t.length; v++) {
      const p = e.getColumnX(v, a), f = (A = n.getMacrobeatInfo) == null ? void 0 : A.call(n, C);
      if (f && f.startColumn === v) {
        const b = d[C] ?? "solid";
        N && b === "solid" && (i.fillStyle = l.background, i.fillRect(s, 0, p - s, r), N = !1), i.beginPath(), i.moveTo(p, 0), i.lineTo(p, r), b === "anacrusis" ? (i.strokeStyle = l.border, i.setLineDash([5, 5]), i.lineWidth = 1) : b === "dashed" ? (i.strokeStyle = "#adb5bd", i.setLineDash([5, 5]), i.lineWidth = 1) : (i.strokeStyle = "#adb5bd", i.setLineDash([]), i.lineWidth = 2), i.stroke(), i.setLineDash([]), C++;
      } else v > 0 && !c.has(v - 1) && (i.beginPath(), i.moveTo(p, 0), i.lineTo(p, r), i.strokeStyle = "#dee2e6", i.lineWidth = 1, i.stroke());
      if (c.has(v)) {
        const b = (t[v] ?? 1) * a.cellWidth;
        i.fillStyle = "rgba(255, 193, 7, 0.1)", i.fillRect(p, 0, b, r);
      }
    }
  }
  return {
    drawHorizontalLines: o,
    drawVerticalLines: g
  };
}
function Hn(n, e, o) {
  const g = n.canvas.width, i = n.canvas.height;
  n.clearRect(0, 0, g, i);
  const a = Yt({
    getViewportInfo: o.getViewportInfo,
    columnToPixelX: o.columnToPixelX ? (N, s) => o.columnToPixelX(N, e) : void 0,
    pixelXToColumn: o.pixelXToColumn ? (N, s) => o.pixelXToColumn(N, e) : void 0
  }), t = rn({
    coords: a,
    getMacrobeatInfo: o.getMacrobeatInfo,
    getPlacedTonicSigns: () => e.placedTonicSigns,
    getTonicSpanColumnIndices: o.getTonicSpanColumnIndices,
    getAnacrusisColors: o.getAnacrusisColors
  }), d = an({
    coords: a,
    getDegreeForNote: o.getDegreeForNote,
    hasAccidental: o.hasAccidental,
    getEnharmonicDegree: o.getEnharmonicDegree,
    getAnimationEffectsManager: o.getAnimationEffectsManager
  }), m = {
    ...e,
    canvasWidth: g,
    canvasHeight: i
  }, r = {
    ...e,
    placedNotes: e.placedNotes
  };
  t.drawHorizontalLines(n, m), t.drawVerticalLines(n, m);
  const { startRow: h, endRow: c } = a.getVisibleRowRange(), l = e.placedNotes.filter((N) => {
    if (N.isDrum) return !1;
    const s = N.globalRow ?? N.row;
    return s >= h && s <= c;
  });
  for (const N of l) {
    const s = N.globalRow ?? N.row;
    N.shape === "circle" ? d.drawTwoColumnOvalNote(n, r, N, s) : d.drawSingleColumnOvalNote(n, r, N, s);
  }
  for (const N of e.placedTonicSigns) {
    const s = N.globalRow ?? N.row;
    s >= h && s <= c && ln(n, e, N, a);
  }
}
function ln(n, e, o, g) {
  const { cellWidth: i, cellHeight: a } = e, t = g.getRowY(o.globalRow ?? o.row, e), d = g.getColumnX(o.columnIndex, e), m = i * 2, r = d + m / 2, h = Math.min(m, a) / 2 * 0.9;
  if (h < 2 || (n.beginPath(), n.arc(r, t, h, 0, 2 * Math.PI), n.strokeStyle = "#212529", n.lineWidth = Math.max(0.5, i * 0.05), n.stroke(), o.tonicNumber == null)) return;
  const c = o.tonicNumber.toString(), l = h * 1.5;
  l < 6 || (n.fillStyle = "#212529", n.font = `bold ${l}px 'Atkinson Hyperlegible', sans-serif`, n.textAlign = "center", n.textBaseline = "middle", n.fillText(c, r, t));
}
const cn = ["H", "M", "L"];
function dn(n) {
  if (n.length === 0) return [];
  const e = [...n].sort((g, i) => g.start - i.start), o = [];
  for (const g of e) {
    if (o.length === 0) {
      o.push({ ...g });
      continue;
    }
    const i = o[o.length - 1];
    g.start <= i.end ? i.end = Math.max(i.end, g.end) : o.push({ ...g });
  }
  return o;
}
function un(n, e, o) {
  const g = /* @__PURE__ */ new Set([n, e]);
  o.forEach((t) => {
    const d = Math.max(n, Math.min(e, t.start)), m = Math.max(n, Math.min(e, t.end));
    m > d && (g.add(d), g.add(m));
  });
  const i = Array.from(g).sort((t, d) => t - d), a = [];
  for (let t = 0; t < i.length - 1; t++) {
    const d = i[t], m = i[t + 1], r = (d + m) / 2, h = o.some((c) => r >= c.start && r < c.end);
    m > d && a.push({ from: d, to: m, light: h });
  }
  return a;
}
function Ke(n, e) {
  return e.some(
    (o) => n === o.columnIndex || n === o.columnIndex + 1
  );
}
function mn(n, e) {
  return !e.some((o) => n === o.columnIndex + 1);
}
function Ye(n, e, o, g, i, a, t = 1) {
  const d = o + i / 2, m = g + a / 2, r = Math.min(i, a) * 0.4 * t;
  if (n.beginPath(), e === 0)
    n.moveTo(d, m - r), n.lineTo(d - r, m + r), n.lineTo(d + r, m + r), n.closePath();
  else if (e === 1)
    n.moveTo(d, m - r), n.lineTo(d + r, m), n.lineTo(d, m + r), n.lineTo(d - r, m), n.closePath();
  else {
    for (let c = 0; c < 5; c++) {
      const l = 2 * Math.PI / 5 * c - Math.PI / 2, N = d + r * Math.cos(l), s = m + r * Math.sin(l);
      c === 0 ? n.moveTo(N, s) : n.lineTo(N, s);
    }
    n.closePath();
  }
  n.fill();
}
function hn(n) {
  const { coords: e } = n, o = {
    stroke: "#c7cfd8"
  };
  function g(m, r) {
    const h = [];
    return r !== null && r > 0 && h.push({
      start: e.getColumnX(0, m),
      end: e.getColumnX(r, m)
    }), m.placedTonicSigns.forEach((c) => {
      const l = e.getColumnX(c.columnIndex, m), N = e.getColumnX(c.columnIndex + 2, m);
      h.push({ start: l, end: N });
    }), dn(h);
  }
  function i(m) {
    if (!m.hasAnacrusis || !n.getMacrobeatInfo) return null;
    const r = m.macrobeatBoundaryStyles.findIndex(
      (c) => c === "solid"
    );
    if (r < 0) return null;
    const h = n.getMacrobeatInfo(r);
    return h ? h.endColumn + 1 : null;
  }
  function a(m, r, h) {
    var v, p;
    const {
      columnWidths: c,
      musicalColumnWidths: l,
      macrobeatGroupings: N,
      macrobeatBoundaryStyles: s,
      placedTonicSigns: C
    } = r, O = (l && l.length > 0 ? l : c).length, u = [];
    for (let f = 0; f < N.length; f++) {
      const M = (v = n.getMacrobeatInfo) == null ? void 0 : v.call(n, f);
      M && u.push(M.endColumn + 1);
    }
    const A = ((p = n.getAnacrusisColors) == null ? void 0 : p.call(n)) ?? o;
    for (let f = 0; f <= O; f++) {
      const M = f === 0 || f === O, b = Ke(f, C), F = C.some((y) => f === y.columnIndex + 2), $ = u.includes(f);
      if (!mn(f, C)) continue;
      let B = null;
      if (M || b || F)
        B = { lineWidth: 2, strokeStyle: "#adb5bd", dash: [] };
      else if ($) {
        const y = u.indexOf(f), P = s[y];
        P === "anacrusis" ? B = { lineWidth: 1, strokeStyle: A.stroke, dash: [4, 4] } : B = {
          lineWidth: 1,
          strokeStyle: "#adb5bd",
          dash: P === "solid" ? [] : [5, 5]
        };
      }
      if (!B) continue;
      const R = e.getColumnX(f, r);
      m.beginPath(), m.moveTo(R, 0), m.lineTo(R, h), m.lineWidth = B.lineWidth, m.strokeStyle = B.strokeStyle, m.setLineDash(B.dash), m.stroke();
    }
    m.setLineDash([]);
  }
  function t(m, r, h, c) {
    var w;
    const l = i(r), N = g(r, l), s = un(0, c, N), C = ((w = n.getAnacrusisColors) == null ? void 0 : w.call(n)) ?? o;
    for (let O = 0; O < 4; O++) {
      const u = O * h;
      s.forEach((A) => {
        A.to <= A.from || (m.beginPath(), m.moveTo(A.from, u), m.lineTo(A.to, u), m.strokeStyle = A.light ? C.stroke : "#ced4da", m.lineWidth = 1, m.globalAlpha = A.light ? 0.6 : 1, m.stroke(), m.globalAlpha = 1);
      });
    }
  }
  function d(m, r, h) {
    var O;
    const { placedNotes: c, columnWidths: l, cellWidth: N, placedTonicSigns: s, tempoModulationMarkers: C } = r, w = l.length + 4;
    for (let u = 0; u < w; u++) {
      if (Ke(u, s)) continue;
      const A = e.getColumnX(u, r);
      let v;
      C && C.length > 0 ? v = e.getColumnX(u + 1, r) - A : v = (l[u] ?? 0) * N;
      for (let p = 0; p < 3; p++) {
        const f = p * h, M = cn[p], b = c.find(
          (F) => F.isDrum && (typeof F.drumTrack == "number" ? String(F.drumTrack) : F.drumTrack) === M && F.startColumnIndex === u
        );
        if (b) {
          m.fillStyle = b.color;
          const F = ((O = n.getAnimationScale) == null ? void 0 : O.call(n, u, M)) ?? 1;
          Ye(m, p, A, f, v, h, F);
        } else
          m.fillStyle = "#ced4da", m.beginPath(), m.arc(A + v / 2, f + h / 2, 2, 0, Math.PI * 2), m.fill();
      }
    }
  }
  return {
    drawVerticalLines: a,
    drawHorizontalLines: t,
    drawDrumNotes: d,
    drawDrumShape: Ye,
    buildLightRanges: g,
    getAnacrusisEndColumn: i
  };
}
function Un(n, e, o) {
  var r;
  const g = n.canvas.width, i = n.canvas.height;
  n.clearRect(0, 0, g, i);
  const a = e.baseDrumRowHeight ?? 30, t = e.drumHeightScaleFactor ?? 1.5, d = Math.max(a, t * e.cellHeight), m = hn(o);
  m.drawHorizontalLines(n, e, d, g), m.drawVerticalLines(n, e, i), m.drawDrumNotes(n, e, d), o.renderModulationMarkers && ((r = e.tempoModulationMarkers) != null && r.length) && o.renderModulationMarkers(n, e);
}
const pe = {
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
function fn(n = {}) {
  const e = {
    ...pe,
    ...n,
    accuracyTiers: n.accuracyTiers ? {
      ...pe.accuracyTiers,
      ...n.accuracyTiers
    } : pe.accuracyTiers
  }, o = /* @__PURE__ */ new Map(), g = /* @__PURE__ */ new Map();
  function i(p, f) {
    return (p - f) * 100;
  }
  function a(p) {
    return p.targetKind ?? "fixedPitch";
  }
  function t(p) {
    return typeof p == "number" && Number.isFinite(p);
  }
  function d(p) {
    return !t(p.midi) || p.midi <= 0 ? !1 : typeof p.amplitudeDb == "number" && typeof e.minAmplitudeDb == "number" ? p.amplitudeDb >= e.minAmplitudeDb : !0;
  }
  function m(p, f) {
    return t(f) ? Math.abs(i(p.midi, f)) <= e.pitchToleranceCents : !1;
  }
  function r(p) {
    return !t(p.minMidi) || !t(p.maxMidi) ? null : {
      minMidi: Math.min(p.minMidi, p.maxMidi),
      maxMidi: Math.max(p.minMidi, p.maxMidi)
    };
  }
  function h(p, f) {
    if (!d(p)) return !1;
    const M = r(f);
    if (!M) return !1;
    const b = e.bandToleranceSemitones ?? 0;
    return p.midi >= M.minMidi - b && p.midi <= M.maxMidi + b;
  }
  function c(p, f) {
    if (!d(p)) return !1;
    const M = r(f);
    if (!M) return !0;
    const b = e.bandToleranceSemitones ?? 0;
    return p.midi >= M.minMidi - b && p.midi <= M.maxMidi + b;
  }
  function l(p, f) {
    const M = a(f);
    return M === "fixedPitch" ? m(p, f.midi ?? 0) : M === "windowBand" ? h(p, f) : M === "windowAnyPitch" ? c(p, f) : d(p);
  }
  function N(p, f) {
    return !t(f) || p.length === 0 ? 0 : p.reduce((b, F) => b + Math.abs(i(F.midi, f)), 0) / p.length;
  }
  function s(p, f, M, b) {
    if (p.length === 0)
      return { coveragePct: 0, coveredMs: 0 };
    const F = p.filter(f);
    if (F.length === 0)
      return { coveragePct: 0, coveredMs: 0 };
    let $ = 0;
    for (let G = 0; G < F.length; G++) {
      const B = F[G];
      if (!B) continue;
      const R = F[G + 1];
      if (R)
        $ += R.timeMs - B.timeMs;
      else {
        const y = M + b, P = Math.min(50, y - B.timeMs);
        $ += P;
      }
    }
    return {
      coveragePct: $ / b * 100,
      coveredMs: $
    };
  }
  function C(p, f, M, b) {
    return s(
      p,
      (F) => m(F, f),
      M,
      b
    ).coveragePct;
  }
  function w(p) {
    if (p.length === 0) return 0;
    const f = [...p].sort((b, F) => b - F), M = Math.floor(f.length / 2);
    return f.length % 2 === 0 ? (f[M - 1] + f[M]) / 2 : f[M] ?? 0;
  }
  function O(p) {
    if (p.length < 2) return 0;
    const f = Math.max(1, Math.floor(p.length * 0.2)), M = p.slice(0, f).map((G) => G.midi), b = p.slice(Math.max(0, p.length - f)).map((G) => G.midi), F = w(M);
    return w(b) - F;
  }
  function u(p, f, M) {
    const b = e.accuracyTiers;
    if (!b) return "okay";
    const F = Math.abs(p);
    return F <= b.perfect.onsetMs && f <= b.perfect.pitchCents && M >= b.perfect.coverage ? "perfect" : F <= b.good.onsetMs && f <= b.good.pitchCents && M >= b.good.coverage ? "good" : F <= b.okay.onsetMs && f <= b.okay.pitchCents && M >= b.okay.coverage ? "okay" : "miss";
  }
  function A(p) {
    const { note: f, samples: M, onsetSample: b, releaseSample: F } = p, $ = a(f);
    let G = 0;
    b ? G = b.timeMs - f.startTimeMs : G = e.onsetToleranceMs * 2;
    let B = 0;
    const R = f.startTimeMs + f.durationMs;
    F ? B = F.timeMs - R : B = e.releaseToleranceMs * 2;
    const y = e.minCoveragePct ?? e.hitThreshold, P = e.minVoicedMs ?? 0;
    let S = 0, T = 0, I, D, _, E, L = "miss";
    if ($ === "fixedPitch") {
      const V = f.midi ?? 0;
      S = N(M, V), T = C(
        M,
        V,
        f.startTimeMs,
        f.durationMs
      );
      const H = Math.abs(G) <= e.onsetToleranceMs, J = Math.abs(B) <= e.releaseToleranceMs, q = T >= e.hitThreshold;
      L = H && J && q ? "hit" : "miss";
    } else if ($ === "windowAnyPitch") {
      const V = s(
        M,
        (H) => c(H, f),
        f.startTimeMs,
        f.durationMs
      );
      I = V.coveragePct, D = V.coveredMs, T = V.coveragePct, L = I >= y && D >= P ? "hit" : "miss";
    } else if ($ === "windowBand") {
      const V = s(
        M,
        (q) => h(q, f),
        f.startTimeMs,
        f.durationMs
      );
      _ = V.coveragePct, T = V.coveragePct, D = V.coveredMs, I = s(
        M,
        d,
        f.startTimeMs,
        f.durationMs
      ).coveragePct;
      const J = r(f);
      if (J) {
        const q = (J.minMidi + J.maxMidi) / 2, U = M.filter((j) => h(j, f));
        S = N(U, q);
      }
      L = _ >= y && (D ?? 0) >= P ? "hit" : "miss";
    } else if ($ === "slideWindow") {
      const V = M.filter(d), H = s(
        M,
        d,
        f.startTimeMs,
        f.durationMs
      );
      I = H.coveragePct, D = H.coveredMs, T = H.coveragePct, E = O(V);
      const J = e.minSlideSemitones ?? 0;
      let q = !0;
      f.slideDirection === "up" ? q = E >= J : f.slideDirection === "down" ? q = E <= -J : q = Math.abs(E) >= J, L = I >= y && (D ?? 0) >= P && q ? "hit" : "miss";
    }
    const W = u(
      G,
      S,
      T
    );
    return {
      hitStatus: L,
      onsetAccuracyMs: G,
      releaseAccuracyMs: B,
      pitchAccuracyCents: S,
      pitchCoverage: T,
      voicedCoverage: I,
      voicedMs: D,
      bandCoverage: _,
      slideSemitoneSpan: E,
      slideDirection: f.slideDirection,
      pitchSamples: [...M],
      accuracyTier: W
    };
  }
  return {
    startNote(p, f) {
      o.set(p, {
        note: f,
        samples: [],
        onsetSample: null,
        releaseSample: null,
        startedAt: performance.now()
      });
    },
    recordPitchSample(p) {
      for (const [f, M] of o) {
        const { note: b } = M, F = b.startTimeMs + b.durationMs, $ = e.onsetToleranceMs, G = e.releaseToleranceMs;
        if (p.timeMs >= b.startTimeMs - $ && p.timeMs <= F + G) {
          M.samples.push(p);
          const B = l(p, b);
          !M.onsetSample && p.timeMs >= b.startTimeMs - $ && p.timeMs <= b.startTimeMs + $ && B && (M.onsetSample = p), p.timeMs >= F - G && p.timeMs <= F + G && B && (M.releaseSample = p);
        }
      }
    },
    endNote(p) {
      const f = o.get(p);
      if (!f) return null;
      const M = A(f);
      return g.set(p, M), o.delete(p), M;
    },
    getCurrentPerformance(p) {
      const f = o.get(p);
      if (!f) return null;
      const { note: M, samples: b, onsetSample: F } = f, $ = a(M);
      let G = 0;
      F && (G = F.timeMs - M.startTimeMs);
      let B = 0, R = 0, y, P, S, T;
      if ($ === "fixedPitch") {
        const I = M.midi ?? 0;
        B = N(b, I), R = C(
          b,
          I,
          M.startTimeMs,
          M.durationMs
        );
      } else if ($ === "windowAnyPitch") {
        const I = s(
          b,
          (D) => c(D, M),
          M.startTimeMs,
          M.durationMs
        );
        y = I.coveragePct, P = I.coveredMs, R = I.coveragePct;
      } else if ($ === "windowBand") {
        const I = s(
          b,
          (E) => h(E, M),
          M.startTimeMs,
          M.durationMs
        );
        S = I.coveragePct, R = I.coveragePct, P = I.coveredMs, y = s(
          b,
          d,
          M.startTimeMs,
          M.durationMs
        ).coveragePct;
        const _ = r(M);
        if (_) {
          const E = (_.minMidi + _.maxMidi) / 2, L = b.filter((W) => h(W, M));
          B = N(L, E);
        }
      } else if ($ === "slideWindow") {
        const I = b.filter(d), D = s(
          b,
          d,
          M.startTimeMs,
          M.durationMs
        );
        y = D.coveragePct, P = D.coveredMs, R = D.coveragePct, T = O(I);
      }
      return {
        onsetAccuracyMs: G,
        pitchAccuracyCents: B,
        pitchCoverage: R,
        voicedCoverage: y,
        voicedMs: P,
        bandCoverage: S,
        slideSemitoneSpan: T,
        slideDirection: M.slideDirection,
        pitchSamples: [...b]
      };
    },
    getAllPerformances() {
      return new Map(g);
    },
    reset() {
      o.clear(), g.clear();
    },
    dispose() {
      o.clear(), g.clear();
    }
  };
}
const Qe = {
  judgmentLinePosition: 0.12,
  pixelsPerSecond: 200,
  lookAheadMs: 3e3,
  scrollMode: "constant-speed",
  leadInBeats: 4,
  playMetronomeDuringOnramp: !0,
  playTargetNotes: !0,
  playMetronome: !1,
  inputSources: ["microphone"],
  waitForInput: !1,
  feedbackConfig: {
    onsetToleranceMs: 100,
    releaseToleranceMs: 150,
    pitchToleranceCents: 50,
    hitThreshold: 70
  }
};
function Xn(n) {
  const e = {
    ...Qe,
    ...n,
    feedbackConfig: {
      ...Qe.feedbackConfig,
      ...n.feedbackConfig
    }
  }, { stateCallbacks: o, eventCallbacks: g, visualCallbacks: i, logger: a } = e, t = {
    isPlaying: !1,
    isPaused: !1,
    currentTimeMs: 0,
    scrollOffset: 0,
    onrampComplete: !1,
    targetNotes: [],
    activeNotes: /* @__PURE__ */ new Set(),
    startTime: null,
    isWaitingForInput: !1,
    waitingNoteId: null
  }, d = fn(e.feedbackConfig);
  let m = null;
  const r = /* @__PURE__ */ new Set(), h = /* @__PURE__ */ new Set();
  let c = null;
  function l() {
    const P = 60 / o.getTempo() * 1e3;
    return e.leadInBeats * P;
  }
  function N() {
    return o.getViewportWidth() * e.judgmentLinePosition;
  }
  function s(y) {
    const P = e.pixelsPerSecond / 1e3, S = N(), T = l();
    return (y + T) * P - S;
  }
  function C(y) {
    return typeof y == "number" && Number.isFinite(y);
  }
  function w(y) {
    return y.targetKind ?? "fixedPitch";
  }
  function O(y) {
    return !C(y.midi) || y.midi <= 0 ? !1 : typeof y.amplitudeDb == "number" && typeof e.feedbackConfig.minAmplitudeDb == "number" ? y.amplitudeDb >= e.feedbackConfig.minAmplitudeDb : !0;
  }
  function u(y, P) {
    const S = w(y), T = e.feedbackConfig.pitchToleranceCents;
    if (!O(P))
      return !1;
    if (S === "fixedPitch")
      return C(y.midi) ? Math.abs((P.midi - y.midi) * 100) <= T : !1;
    if (S === "windowBand") {
      if (!C(y.minMidi) || !C(y.maxMidi)) return !1;
      const I = Math.min(y.minMidi, y.maxMidi), D = Math.max(y.minMidi, y.maxMidi), _ = e.feedbackConfig.bandToleranceSemitones ?? 0;
      return P.midi >= I - _ && P.midi <= D + _;
    }
    if (S === "windowAnyPitch") {
      if (C(y.minMidi) && C(y.maxMidi)) {
        const I = Math.min(y.minMidi, y.maxMidi), D = Math.max(y.minMidi, y.maxMidi), _ = e.feedbackConfig.bandToleranceSemitones ?? 0;
        return P.midi >= I - _ && P.midi <= D + _;
      }
      return !0;
    }
    return !0;
  }
  function A() {
    if (!e.waitForInput || !t.onrampComplete)
      return null;
    const y = e.feedbackConfig.onsetToleranceMs;
    for (const P of t.targetNotes) {
      if (!P.waitForInput || h.has(P.id))
        continue;
      const S = P.startTimeMs + P.durationMs + y;
      if (t.currentTimeMs >= P.startTimeMs && t.currentTimeMs <= S)
        return P;
    }
    return null;
  }
  function v(y) {
    t.isWaitingForInput || (t.currentTimeMs = y.startTimeMs, t.scrollOffset = s(t.currentTimeMs), t.isWaitingForInput = !0, t.waitingNoteId = y.id, c = performance.now(), g.emit("waitStarted", { noteId: y.id, note: y }), a == null || a.info("NoteHighway", `Wait started for note: ${y.id}`, {
      noteId: y.id,
      targetKind: y.targetKind
    }));
  }
  function p(y, P) {
    !t.isWaitingForInput || t.waitingNoteId !== y || (t.startTime !== null && c !== null && (t.startTime += performance.now() - c), t.isWaitingForInput = !1, t.waitingNoteId = null, c = null, h.add(y), g.emit("waitEnded", { noteId: y, note: P }), a == null || a.info("NoteHighway", `Wait ended for note: ${y}`, {
      noteId: y,
      targetKind: P.targetKind
    }));
  }
  function f(y) {
    const P = N(), S = o.getCellWidth(), T = y.startColumn * S - t.scrollOffset, I = y.endColumn * S - t.scrollOffset, _ = e.feedbackConfig.onsetToleranceMs / 1e3 * e.pixelsPerSecond;
    return T <= P + _ && I >= P - _;
  }
  function M() {
    var P, S;
    const y = /* @__PURE__ */ new Set();
    for (const T of t.targetNotes) {
      const I = T.startTimeMs + T.durationMs, D = e.feedbackConfig.onsetToleranceMs;
      if (t.currentTimeMs >= T.startTimeMs - D && t.currentTimeMs <= I + D)
        y.add(T.id), t.activeNotes.has(T.id) || (d.startNote(T.id, T), a == null || a.debug("NoteHighway", `Note ${T.id} became active`, { note: T }));
      else if (t.activeNotes.has(T.id)) {
        const _ = d.endNote(T.id);
        if (_) {
          T.performance = _;
          const E = { noteId: T.id, note: T, performance: _ };
          _.hitStatus === "hit" ? (g.emit("noteHit", E), (P = i == null ? void 0 : i.onNoteHit) == null || P.call(i, T.id, _.accuracyTier || "okay"), a == null || a.info("NoteHighway", `Note hit: ${T.id}`, _)) : (g.emit("noteMissed", E), (S = i == null ? void 0 : i.onNoteMiss) == null || S.call(i, T.id), a == null || a.info("NoteHighway", `Note missed: ${T.id}`, _));
        }
      }
    }
    t.activeNotes = y;
  }
  function b() {
    for (const y of t.targetNotes) {
      const P = f(y), S = r.has(y.id);
      P && !S ? (r.add(y.id), g.emit("noteEntered", { noteId: y.id, note: y })) : !P && S && (r.delete(y.id), g.emit("noteExited", { noteId: y.id, note: y }));
    }
  }
  function F() {
    var y, P;
    if (!t.onrampComplete)
      if (t.currentTimeMs >= 0)
        t.onrampComplete = !0, g.emit("onrampComplete"), (y = i == null ? void 0 : i.clearOnrampCountdown) == null || y.call(i), a == null || a.info("NoteHighway", "Onramp complete", null);
      else {
        const T = 60 / o.getTempo() * 1e3, I = Math.abs(t.currentTimeMs), D = Math.ceil(I / T);
        (P = i == null ? void 0 : i.updateOnrampCountdown) == null || P.call(i, D);
      }
  }
  function $() {
    if (!t.isPlaying || t.isPaused || !t.startTime) {
      m = null;
      return;
    }
    const y = performance.now(), P = l();
    if (t.isWaitingForInput || (t.currentTimeMs = y - t.startTime - P, t.scrollOffset = s(t.currentTimeMs)), F(), M(), b(), !t.isWaitingForInput) {
      const S = A();
      S && v(S);
    }
    m = requestAnimationFrame($);
  }
  function G() {
    m || (m = requestAnimationFrame($));
  }
  function B() {
    m && (cancelAnimationFrame(m), m = null);
  }
  return {
    init(y) {
      t.targetNotes = y, a == null || a.info("NoteHighway", `Initialized with ${y.length} notes`, null);
    },
    start() {
      t.isPlaying || (t.isPlaying = !0, t.isPaused = !1, t.currentTimeMs = -l(), t.scrollOffset = s(t.currentTimeMs), t.onrampComplete = !1, t.activeNotes.clear(), t.startTime = performance.now(), t.isWaitingForInput = !1, t.waitingNoteId = null, c = null, r.clear(), h.clear(), d.reset(), G(), g.emit("playbackStarted"), a == null || a.info("NoteHighway", "Playback started", { onrampDurationMs: l() }));
    },
    pause() {
      !t.isPlaying || t.isPaused || (t.isPaused = !0, B(), g.emit("playbackPaused"), a == null || a.info("NoteHighway", "Playback paused", { currentTimeMs: t.currentTimeMs }));
    },
    resume() {
      if (!t.isPlaying || !t.isPaused || !t.startTime) return;
      const y = performance.now() - (t.startTime + t.currentTimeMs + l());
      t.startTime += y, t.isPaused = !1, G(), g.emit("playbackResumed"), a == null || a.info("NoteHighway", "Playback resumed", null);
    },
    stop() {
      var P, S;
      if (!t.isPlaying) return;
      t.isPlaying = !1, t.isPaused = !1, t.currentTimeMs = 0, t.scrollOffset = 0, t.onrampComplete = !1, t.activeNotes.clear(), t.startTime = null, t.isWaitingForInput = !1, t.waitingNoteId = null, c = null, r.clear(), h.clear(), B(), (P = i == null ? void 0 : i.clearCanvas) == null || P.call(i), (S = i == null ? void 0 : i.clearOnrampCountdown) == null || S.call(i), g.emit("playbackStopped"), t.targetNotes.every((T) => T.performance !== void 0) && g.emit("performanceComplete"), a == null || a.info("NoteHighway", "Playback stopped", null);
    },
    setScrollOffset(y) {
      if (t.currentTimeMs = y, t.scrollOffset = s(y), t.isWaitingForInput = !1, t.waitingNoteId = null, c = null, t.isPlaying) {
        const P = l();
        t.startTime = performance.now() - (y + P);
      }
      a == null || a.debug("NoteHighway", "Scroll offset set", { timeMs: y, scrollOffset: t.scrollOffset });
    },
    recordPitchInput(y, P, S, T) {
      if (!t.isPlaying || t.isPaused || !e.inputSources.includes(S)) return;
      const I = {
        timeMs: t.currentTimeMs,
        midi: y,
        clarity: P,
        amplitudeDb: T,
        source: S
      };
      if (t.isWaitingForInput && t.waitingNoteId) {
        const D = t.targetNotes.find((_) => _.id === t.waitingNoteId);
        if (D && u(D, I)) {
          p(D.id, D), d.recordPitchSample(I);
          return;
        }
        return;
      }
      d.recordPitchSample(I);
    },
    getState() {
      return t;
    },
    getVisibleNotes() {
      N();
      const y = o.getViewportWidth(), P = o.getCellWidth();
      return t.targetNotes.filter((S) => {
        const T = S.startColumn * P - t.scrollOffset;
        return S.endColumn * P - t.scrollOffset >= 0 && T <= y;
      });
    },
    getPerformanceResults() {
      return d.getAllPerformances();
    },
    getFeedbackCollector() {
      return d;
    },
    dispose() {
      B(), d.dispose(), t.targetNotes = [], t.activeNotes.clear(), t.isWaitingForInput = !1, t.waitingNoteId = null, r.clear(), h.clear(), c = null, a == null || a.info("NoteHighway", "Service disposed", null);
    }
  };
}
function nt(n) {
  return 60 / n / 2;
}
function pn(n, e) {
  const { timeMap: o, tempo: g, cellWidth: i } = e;
  let a, t;
  if (o && o.length > 0) {
    const r = o[n.startColumnIndex] ?? 0, h = o[n.endColumnIndex] ?? r;
    a = r * 1e3, t = h * 1e3;
  } else {
    const r = e.microbeatDurationSec ?? nt(g);
    a = n.startColumnIndex * r * 1e3, t = n.endColumnIndex * r * 1e3;
  }
  const d = t - a, m = n.globalRow !== void 0 ? 108 - n.globalRow : 60;
  return {
    id: n.uuid ?? `note-${n.startColumnIndex}-${n.row}`,
    midi: m,
    startTimeMs: a,
    durationMs: d,
    startColumn: n.startColumnIndex,
    endColumn: n.endColumnIndex,
    color: n.color,
    shape: n.shape,
    globalRow: n.globalRow ?? n.row
  };
}
function gn(n, e) {
  return n.filter((g) => !g.isDrum).map((g) => pn(g, e));
}
function Jn(n, e) {
  const o = [0];
  let g = 0;
  for (let i = 0; i < n.length; i++) {
    const a = n[i] ?? 1;
    g += a * e, o.push(g);
  }
  return o;
}
function zn(n, e) {
  const o = nt(n.tempo), g = {
    tempo: n.tempo,
    cellWidth: n.cellWidth,
    timeMap: e,
    microbeatDurationSec: o
  };
  return gn(n.placedNotes, g);
}
const jn = "0.1.0";
export {
  Ut as ClippingMonitor,
  Kt as DEFAULT_CONTEXT_OPTIONS,
  Jt as DEFAULT_DRUM_SAMPLES,
  Vt as FilteredVoice,
  qt as GainManager,
  te as MODULATION_RATIOS,
  jn as VERSION,
  nt as calculateMicrobeatDuration,
  xn as canvasToTime,
  In as canvasToVisual,
  vn as canvasXToSeconds,
  An as columnToRegularTime,
  Vn as configureAudioContext,
  pn as convertNoteToHighway,
  gn as convertNotesToHighway,
  zn as convertStateToHighway,
  Lt as createColumnMapService,
  Mn as createCoordinateMapping,
  jt as createDrumManager,
  Gn as createEngineController,
  fn as createFeedbackCollector,
  Ln as createLessonMode,
  wt as createModulationMarker,
  Xn as createNoteHighwayService,
  Jn as createSimpleTimeMap,
  Gt as createStore,
  $n as createSynthEngine,
  Xt as createTimeMapCalculator,
  Wn as createTransportService,
  Q as fullRowData,
  Rn as getCanvasColumnWidths,
  En as getColumnEntry,
  Ze as getColumnEntryByCanvas,
  On as getColumnType,
  qn as getContextInfo,
  Ct as getInitialState,
  Fn as getMacrobeatBoundary,
  Nn as getModulationColor,
  Tn as getModulationDisplayText,
  tt as getPerVoiceBaselineGain,
  Cn as getPitchByIndex,
  yn as getPitchByToneNote,
  We as getPitchIndex,
  Wt as getTimeBoundaryAfterMacrobeat,
  Bn as getTotalCanvasWidth,
  Dn as isPlayableColumn,
  Un as renderDrumGrid,
  Hn as renderPitchGrid,
  ut as resolvePitchRange,
  bn as secondsToCanvasX,
  _n as setVoiceLogger,
  Pn as timeToCanvas,
  $t as timeToVisual,
  wn as visualToCanvas,
  _t as visualToTime
};
//# sourceMappingURL=index.js.map
