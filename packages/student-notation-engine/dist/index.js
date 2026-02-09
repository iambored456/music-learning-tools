var lt = Object.defineProperty;
var ct = (n, e, o) => e in n ? lt(n, e, { enumerable: !0, configurable: !0, writable: !0, value: o }) : n[e] = o;
var X = (n, e, o) => ct(n, typeof e != "symbol" ? e + "" : e, o);
import * as E from "tone";
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
  const o = We(n), p = We(e);
  return o === -1 || p === -1 ? null : {
    topIndex: Math.min(o, p),
    bottomIndex: Math.max(o, p)
  };
}
const ht = {
  attack: 0.1,
  decay: 0.2,
  sustain: 0.8,
  release: 0.3
}, mt = {
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
    const p = new Float32Array(32);
    p[0] = 1;
    const i = new Float32Array(32);
    e[o] = {
      name: "Sine",
      adsr: { ...ht },
      coeffs: p,
      phases: i,
      filter: { ...mt },
      activePresetName: "sine",
      gain: 1,
      vibrato: { ...ft },
      tremelo: { ...pt }
    };
  }), e;
}
function St() {
  const n = new Array(16).fill(2), e = n.slice(0, -1).map((o, p) => (p + 1) % 4 === 0 ? "solid" : "dashed");
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
function he(n, e) {
  if (typeof n.row != "number") return;
  const o = e.length > 0 ? e.length - 1 : -1;
  if (o < 0) return;
  const p = typeof n.globalRow == "number" ? n.globalRow : n.row, i = Math.max(0, Math.min(o, Math.round(p)));
  n.globalRow = i, n.row = i;
}
function se() {
  return `uuid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function Tt(n = {}) {
  const {
    getMacrobeatInfo: e,
    getDegreeForNote: o,
    hasAccidental: p,
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
        (h) => !h.isDrum && h.row === a.row && h.startColumnIndex === a.startColumnIndex && h.color === a.color
      );
      if (t) {
        if (this.state.degreeDisplayMode !== "off" && o && p) {
          const h = o(t, this.state);
          if (h && p(h))
            return t.enharmonicPreference = !t.enharmonicPreference, i("debug", "[ENHARMONIC] Toggled enharmonic preference for note", {
              noteUuid: t.uuid,
              currentDegree: h,
              enharmonicPreference: t.enharmonicPreference
            }), this.emit("notesChanged"), t;
        }
        return null;
      }
      const d = { ...a, uuid: se() };
      return Ve(d), he(d, this.state.fullRowData), this.state.placedNotes.push(d), this.emit("notesChanged"), d;
    },
    updateNoteTail(a, t) {
      let d = t;
      a.shape === "circle" && (d = Math.max(a.startColumnIndex + 1, t)), a.endColumnIndex = d, this.emit("notesChanged");
    },
    updateMultipleNoteTails(a, t) {
      a.forEach((d) => {
        let h = t;
        d.shape === "circle" && (h = Math.max(d.startColumnIndex + 1, t)), d.endColumnIndex = h;
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
      a.forEach((d, h) => {
        const r = t[h];
        r !== void 0 && (d.row = r, he(d, this.state.fullRowData));
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
    eraseInPitchArea(a, t, d = 1, h = !0) {
      const r = a + d - 1, m = t - 1, c = t + 1;
      let l = !1;
      const N = this.state.placedNotes.length;
      return this.state.placedNotes = this.state.placedNotes.filter((s) => {
        if (s.isDrum) return !0;
        const y = typeof s.globalRow == "number" ? s.globalRow : s.row;
        if (s.shape === "circle") {
          const b = s.startColumnIndex + 1, O = typeof s.endColumnIndex == "number" ? Math.max(b, s.endColumnIndex) : b, u = s.startColumnIndex <= r && O >= a, A = y >= m && y <= c;
          if (u && A)
            return !1;
        } else if (y >= m && y <= c && s.startColumnIndex <= r && s.endColumnIndex >= a)
          return !1;
        return !0;
      }), this.state.placedNotes.length < N && (l = !0), l && (this.emit("notesChanged"), h && this.recordState()), l;
    },
    eraseDrumNoteAt(a, t, d = !0) {
      const h = String(t), r = this.state.placedNotes.length;
      this.state.placedNotes = this.state.placedNotes.filter(
        (c) => !(c.isDrum && String(c.drumTrack) === h && c.startColumnIndex === a)
      );
      const m = this.state.placedNotes.length < r;
      return m && (this.emit("notesChanged"), d && this.recordState()), m;
    },
    toggleDrumNote(a) {
      const t = String(a.drumTrack), d = this.state.placedNotes.findIndex(
        (h) => h.isDrum && String(h.drumTrack) === t && h.startColumnIndex === a.startColumnIndex
      );
      if (d >= 0)
        this.state.placedNotes.splice(d, 1);
      else {
        const h = {
          ...a,
          uuid: se(),
          isDrum: !0,
          endColumnIndex: a.endColumnIndex ?? a.startColumnIndex
        };
        this.state.placedNotes.push(h);
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
      const m = this.state.placedNotes.filter((N) => N.startColumnIndex >= r);
      i("debug", "Notes that will be shifted", {
        noteRanges: m.map((N) => `${N.startColumnIndex}-${N.endColumnIndex}`)
      }), this.state.placedNotes.forEach((N) => {
        if (N.startColumnIndex >= r) {
          const s = N.startColumnIndex, y = N.endColumnIndex;
          N.startColumnIndex = N.startColumnIndex + 2, N.endColumnIndex = N.endColumnIndex + 2, i("debug", `Shifted note from ${s}-${y} to ${N.startColumnIndex}-${N.endColumnIndex}`);
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
      const [h, r] = d, m = r[0];
      if (!m) return !1;
      const c = m.preMacrobeatIndex, l = e(this.state, c + 1).startColumn;
      return delete this.state.tonicSignGroups[h], this.state.placedNotes.forEach((N) => {
        N.startColumnIndex >= l && (N.startColumnIndex = N.startColumnIndex - 2, N.endColumnIndex = N.endColumnIndex - 2);
      }), this.emit("notesChanged"), this.emit("rhythmStructureChanged"), t && this.recordState(), !0;
    },
    clearAllNotes() {
      this.state.placedNotes = [], this.state.tonicSignGroups = {}, this.emit("notesChanged"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    loadNotes(a) {
      const t = (a || []).map((d) => {
        const h = {
          ...d,
          uuid: (d == null ? void 0 : d.uuid) ?? se()
        };
        return Ve(h), he(h, this.state.fullRowData), h;
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
    log: p = () => {
    }
  } = n;
  return {
    /**
     * Adds a stamp placement to the state
     * @param startColumn Canvas-space column index (0 = first musical beat)
     * @returns The placement if successful, null if blocked by tonic column
     */
    addSixteenthStampPlacement(i, a, t, d = "#4a90e2") {
      const h = a + 2;
      if (e && o) {
        const l = e(this.state);
        (o(a, l) || o(a + 1, l)) && p("debug", "Cannot place sixteenth stamp - overlaps tonic column", {
          sixteenthStampId: i,
          startColumn: a,
          row: t
        });
      }
      const r = this.state.sixteenthStampPlacements.find(
        (l) => l.row === t && l.startColumn < h && l.endColumn > a
      );
      r && this.removeSixteenthStampPlacement(r.id);
      const m = t, c = {
        id: Nt(),
        sixteenthStampId: i,
        startColumn: a,
        endColumn: h,
        row: t,
        globalRow: m,
        color: d,
        timestamp: Date.now(),
        shapeOffsets: {}
      };
      return this.state.sixteenthStampPlacements.push(c), this.emit("sixteenthStampPlacementsChanged"), p("debug", `Added sixteenth stamp ${i} at canvas-space ${a}-${h},${t}`, {
        sixteenthStampId: i,
        startColumn: a,
        endColumn: h,
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
      return t ? (this.emit("sixteenthStampPlacementsChanged"), p("debug", `Removed sixteenth stamp ${t.sixteenthStampId} at ${t.startColumn}-${t.endColumn},${t.row}`, {
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
      const h = [];
      for (const m of this.state.sixteenthStampPlacements) {
        const c = m.startColumn <= a && m.endColumn >= i, l = m.row >= t && m.row <= d;
        c && l && h.push(m.id);
      }
      let r = !1;
      return h.forEach((m) => {
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
      this.state.sixteenthStampPlacements = [], i && (this.emit("sixteenthStampPlacementsChanged"), p("info", "Cleared all sixteenth stamp placements"));
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
      const d = this.state.sixteenthStampPlacements.find((h) => h.id === i);
      if (!d) {
        p("warn", "[SIXTEENTH STAMP SHAPE OFFSET] Placement not found", { placementId: i });
        return;
      }
      d.shapeOffsets || (d.shapeOffsets = {}), p("debug", "[SIXTEENTH STAMP SHAPE OFFSET] Updating shape offset", {
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
    getColumnMap: p,
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
      if (d && this.removeTripletStampPlacement(d.id), this.state.sixteenthStampPlacements && e && p) {
        const r = p(this.state);
        this.state.sixteenthStampPlacements.filter((c) => {
          if (c.row !== a.row) return !1;
          const l = e(c.startColumn, r);
          return l === null ? !0 : !(l + 2 <= a.startTimeIndex || l >= t);
        }).forEach((c) => {
          this.removeSixteenthStampPlacement && this.removeSixteenthStampPlacement(c.id);
        });
      }
      const h = {
        id: At(),
        ...a,
        shapeOffsets: a.shapeOffsets || {}
      };
      return this.state.tripletStampPlacements.push(h), this.emit("tripletStampPlacementsChanged"), this.emit("rhythmStructureChanged"), i("debug", `Added triplet stamp ${a.tripletStampId} at time ${a.startTimeIndex}, row ${a.row}`, {
        tripletStampId: a.tripletStampId,
        startTimeIndex: a.startTimeIndex,
        span: a.span,
        row: a.row,
        placementId: h.id
      }), h;
    },
    /**
     * Removes a triplet placement by ID
     * @param placementId - The placement ID to remove
     * @returns True if a triplet was removed
     */
    removeTripletStampPlacement(a) {
      if (!this.state.tripletStampPlacements) return !1;
      const t = this.state.tripletStampPlacements.findIndex((h) => h.id === a);
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
    eraseTripletStampsInArea(a, t, d, h) {
      if (!this.state.tripletStampPlacements || !o || !p) return !1;
      const r = p(this.state), m = [];
      for (const l of this.state.tripletStampPlacements)
        if (l.row >= d && l.row <= h) {
          const N = l.span * 2, s = o(l.startTimeIndex, r);
          s + N - 1 < a || s > t || m.push(l.id);
        }
      let c = !1;
      return m.forEach((l) => {
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
      const h = (r = this.state.tripletStampPlacements) == null ? void 0 : r.find((m) => m.id === a);
      if (!h) {
        i("warn", "[TRIPLET STAMP SHAPE OFFSET] Placement not found", { placementId: a });
        return;
      }
      h.shapeOffsets || (h.shapeOffsets = {}), i("debug", "[TRIPLET STAMP SHAPE OFFSET] Updating shape offset", {
        placementId: a,
        shapeKey: t,
        oldOffset: h.shapeOffsets[t] || 0,
        newOffset: d,
        baseRow: h.row,
        targetRow: h.row + d
      }), h.shapeOffsets[t] = d, this.emit("tripletStampPlacementsChanged");
    },
    /**
     * Gets the effective row for a specific shape within a triplet group
     * @param placement - The triplet placement object
     * @param shapeKey - The shape identifier
     * @returns The effective row index
     */
    getTripletStampShapeRow(a, t) {
      var h;
      const d = ((h = a.shapeOffsets) == null ? void 0 : h[t]) || 0;
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
  const { getMacrobeatInfo: p, log: i = () => {
  } } = o;
  if (i("debug", "[MODULATION] measureIndexToColumnIndex called", {
    measureIndex: n,
    hasState: !!e
  }), !e || !e.macrobeatGroupings) {
    i("warn", "[MODULATION] No state or macrobeatGroupings provided for measure conversion");
    const h = n * 4;
    return i("debug", "[MODULATION] Using fallback calculation", h), h;
  }
  if (n === 0)
    return i("debug", "[MODULATION] Measure 0 at canvas-space column 0"), 0;
  if (!p)
    return i("warn", "[MODULATION] getMacrobeatInfo callback not provided"), n * 4;
  const a = n - 1;
  i("debug", `[MODULATION] Converting measureIndex ${n} to macrobeatIndex: ${a}`);
  const t = p(e, a);
  if (i("debug", "[MODULATION] getMacrobeatInfo result", t), t) {
    const h = t.endColumn + 1;
    return i("debug", `[MODULATION] Found measure info, canvas-space endColumn: ${t.endColumn}, first column after: ${h}`), h;
  }
  i("warn", `[MODULATION] Could not find measure info for index: ${n}`);
  const d = n * 4;
  return i("debug", "[MODULATION] Using improved fallback calculation", d), d;
}
function wt(n, e, o = null, p = null, i = null) {
  return {
    id: `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    measureIndex: n,
    ratio: e,
    active: !0,
    xPosition: o,
    // Store the actual boundary position if provided
    columnIndex: p,
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
function Mn(n, e, o = null, p = {}) {
  const { log: i = () => {
  } } = p;
  if (!n || n.length === 0)
    return qe();
  const a = [...n.filter((c) => c.active)].sort((c, l) => c.measureIndex - l.measureIndex);
  if (a.length === 0)
    return qe();
  i("debug", "[MODULATION] Creating coordinate mapping for markers", a);
  const t = a.map((c) => {
    const l = bt(c.measureIndex, o, p);
    return i("debug", `[MODULATION] Marker at measure ${c.measureIndex} calculated column=${l}`), i("debug", "[MODULATION] Full marker data", c), i("debug", "[MODULATION] Final marker position", {
      id: c.id,
      measureIndex: c.measureIndex,
      columnIndex: l
    }), {
      ...c,
      columnIndex: l
    };
  }), d = [];
  let h = 1;
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
    h *= l.ratio, d.push({
      startColumn: l.columnIndex,
      // Canvas-space
      endColumn: s,
      // Canvas-space
      scale: h,
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
  const o = e(n), p = /* @__PURE__ */ new Map();
  o.entries.forEach((i) => {
    i.type === "tonic" && i.tonicSignUuid && typeof i.canvasIndex == "number" && p.set(i.tonicSignUuid, i.canvasIndex);
  }), Object.entries(n.tonicSignGroups || {}).forEach(([i, a]) => {
    const t = p.get(i);
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
    timeIndexToVisualColumn: p = () => null,
    getTimeBoundaryAfterMacrobeat: i = () => 0,
    log: a = () => {
    }
  } = n;
  return {
    setAnacrusis(t) {
      var s, y, b;
      if (this.state.hasAnacrusis === t)
        return;
      const d = [...this.state.macrobeatGroupings], h = [...this.state.macrobeatBoundaryStyles], r = d.reduce((O, u) => O + u, 0);
      let m, c;
      if (t) {
        const O = this._anacrusisCache, u = He.length - Ue.length, A = He.slice(0, u), v = It.slice(0, u), g = (s = O == null ? void 0 : O.groupings) != null && s.length ? [...O.groupings] : [...A], f = (y = O == null ? void 0 : O.boundaryStyles) != null && y.length ? [...O.boundaryStyles] : [...v];
        if (m = [...g, ...d], c = [...f, ...h], !((b = O == null ? void 0 : O.boundaryStyles) != null && b.length))
          for (let M = 0; M < f.length; M++)
            c[M] = M < f.length - 1 ? "anacrusis" : "solid";
        this._anacrusisCache = null, a("debug", "rhythmActions", "Enabled anacrusis", {
          insertedCount: g.length,
          insertedColumns: g.reduce((M, w) => M + w, 0)
        }, "state");
      } else {
        const O = h.findIndex((g) => g === "solid");
        let u = 0;
        if (O !== -1)
          u = O + 1;
        else
          for (; u < h.length && h[u] === "anacrusis"; )
            u++;
        u = Math.min(u, d.length);
        const A = d.slice(0, u), v = h.slice(0, u);
        u > 0 ? this._anacrusisCache = {
          groupings: A,
          boundaryStyles: v
        } : this._anacrusisCache = null, m = d.slice(u), c = h.slice(u).map((g) => g === "anacrusis" ? "dashed" : g), m.length === 0 && (m = [...Ue], c = [...xt]), a("debug", "rhythmActions", "Disabled anacrusis", {
          removalCount: u,
          removedColumns: A.reduce((g, f) => g + f, 0)
        }, "state");
      }
      const N = m.reduce((O, u) => O + u, 0) - r;
      if (this.state.hasAnacrusis = t, this.state.macrobeatGroupings = [...m], this.state.macrobeatBoundaryStyles = [...c], Xe(this.state, e), N !== 0) {
        const O = [];
        this.state.placedNotes.forEach((f) => {
          const M = o(this.state, f.startColumnIndex, d), w = o(this.state, f.endColumnIndex, d);
          if (M === null || w === null)
            return;
          const F = M + N, $ = w + N;
          if (F < 0) {
            O.push(f);
            return;
          }
          const B = p(this.state, F, m), R = p(this.state, $, m);
          if (B === null || R === null) {
            O.push(f);
            return;
          }
          f.startColumnIndex = B, f.endColumnIndex = R;
        }), O.forEach((f) => {
          const M = this.state.placedNotes.indexOf(f);
          M > -1 && this.state.placedNotes.splice(M, 1);
        });
        const u = [];
        this.state.sixteenthStampPlacements.forEach((f) => {
          const M = o(this.state, f.startColumn, d), w = o(this.state, f.endColumn, d);
          if (M === null || w === null)
            return;
          const F = M + N, $ = w + N;
          if (F < 0) {
            u.push(f);
            return;
          }
          const B = p(this.state, F, m), R = p(this.state, $, m);
          if (B === null || R === null) {
            u.push(f);
            return;
          }
          f.startColumn = B, f.endColumn = R;
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
        const v = [], g = t ? m.length - d.length : -(d.length - m.length);
        this.state.tempoModulationMarkers.forEach((f) => {
          const M = f.measureIndex + g;
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
      const d = [...this.state.macrobeatGroupings], h = d[t], r = h === 2 ? 3 : 2, m = r - h, c = [...d];
      c[t] = r;
      const l = i(this.state, t, d), N = [];
      this.state.placedNotes.forEach((s) => {
        const y = o(this.state, s.startColumnIndex, d), b = o(this.state, s.endColumnIndex, d);
        if (!(y === null || b === null) && y >= l) {
          const O = y + m, u = b + m, A = p(this.state, O, c), v = p(this.state, u, c);
          A !== null && v !== null ? (s.startColumnIndex = A, s.endColumnIndex = v) : N.push(s);
        }
      }), N.length && N.forEach((s) => {
        const y = this.state.placedNotes.indexOf(s);
        y > -1 && this.state.placedNotes.splice(y, 1);
      }), this.state.macrobeatGroupings = c, Xe(this.state, e), this.emit("notesChanged"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    cycleMacrobeatBoundaryStyle(t) {
      if (t === void 0 || t < 0 || t >= this.state.macrobeatBoundaryStyles.length) {
        a("error", "rhythmActions", `Invalid index for cycleMacrobeatBoundaryStyle: ${t}`, null, "state");
        return;
      }
      const d = this._isBoundaryInAnacrusis(t);
      let h;
      d ? h = ["dashed", "solid", "anacrusis"] : h = ["dashed", "solid"];
      const r = this.state.macrobeatBoundaryStyles[t] ?? "dashed", m = h.indexOf(r), c = m === -1 ? 0 : (m + 1) % h.length, l = h[c] ?? "dashed";
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
        ), h = [];
        this.state.placedNotes.forEach((c) => {
          const l = o(this.state, c.startColumnIndex, this.state.macrobeatGroupings);
          l !== null && l >= d && h.push(c);
        }), h.forEach((c) => {
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
        const m = [];
        this.state.tripletStampPlacements && (this.state.tripletStampPlacements.forEach((c) => {
          c.startTimeIndex >= d && m.push(c);
        }), m.forEach((c) => {
          const l = this.state.tripletStampPlacements.indexOf(c);
          l > -1 && this.state.tripletStampPlacements.splice(l, 1);
        })), this.state.macrobeatGroupings.pop(), this.state.macrobeatBoundaryStyles.pop(), h.length > 0 && this.emit("notesChanged"), r.length > 0 && this.emit("sixteenthStampPlacementsChanged"), m.length > 0 && this.emit("tripletStampPlacementsChanged"), this.emit("rhythmStructureChanged"), this.recordState();
      }
    },
    updateTimeSignature(t, d) {
      if (!Array.isArray(d) || d.length === 0) {
        a("error", "rhythmActions", "Invalid groupings provided to updateTimeSignature", null, "state");
        return;
      }
      let h = 0, r = 0, m = 0;
      for (let A = 0; A < this.state.macrobeatGroupings.length; A++) {
        if (m === t) {
          h = A;
          break;
        }
        const v = A === this.state.macrobeatGroupings.length - 1;
        (this.state.macrobeatBoundaryStyles[A] === "solid" || v) && m++;
      }
      m = 0;
      for (let A = 0; A < this.state.macrobeatGroupings.length; A++)
        if (m === t) {
          const v = A === this.state.macrobeatGroupings.length - 1;
          if (this.state.macrobeatBoundaryStyles[A] === "solid" || v) {
            r = A;
            break;
          }
        } else if (m < t) {
          const v = A === this.state.macrobeatGroupings.length - 1;
          (this.state.macrobeatBoundaryStyles[A] === "solid" || v) && m++;
        }
      const c = r - h + 1, l = d.length, N = this.state.macrobeatGroupings.slice(h, r + 1).reduce((A, v) => A + v, 0), y = d.reduce((A, v) => A + v, 0) - N, b = i(this.state, r, this.state.macrobeatGroupings);
      if (y !== 0) {
        const A = (() => {
          const g = [...this.state.macrobeatGroupings];
          return g.splice(h, c, ...d), g;
        })(), v = [];
        this.state.placedNotes.forEach((g) => {
          const f = o(this.state, g.startColumnIndex, this.state.macrobeatGroupings), M = o(this.state, g.endColumnIndex, this.state.macrobeatGroupings);
          if (!(f === null || M === null) && f >= b) {
            const w = f + y, F = M + y, $ = p(this.state, w, A), B = p(this.state, F, A);
            $ !== null && B !== null ? (g.startColumnIndex = $, g.endColumnIndex = B) : v.push(g);
          }
        }), v.length && v.forEach((g) => {
          const f = this.state.placedNotes.indexOf(g);
          f > -1 && this.state.placedNotes.splice(f, 1);
        });
      }
      const O = [...d], u = new Array(Math.max(l - 1, 0)).fill("dashed");
      if (r < this.state.macrobeatBoundaryStyles.length) {
        const A = this.state.macrobeatBoundaryStyles[r] ?? "dashed";
        u.push(A);
      }
      this.state.macrobeatGroupings.splice(h, c, ...O), this.state.macrobeatBoundaryStyles.splice(h, c - 1, ...u), this.emit("notesChanged"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    addModulationMarker(t, d, h = null, r = null, m = null) {
      if (!Object.values(te).includes(d))
        return a("error", "rhythmActions", `Invalid modulation ratio: ${d}`, null, "state"), null;
      const c = this.state.tempoModulationMarkers.findIndex((N) => N.measureIndex === t || m !== null && N.macrobeatIndex === m || r !== null && N.columnIndex === r);
      if (c !== -1) {
        const N = this.state.tempoModulationMarkers[c];
        return a("info", "rhythmActions", `Replacing existing modulation marker ${N.id} at measure ${t} (old ratio: ${N.ratio}, new ratio: ${d})`, null, "state"), N.ratio = d, N.xPosition = h, r !== null && (N.columnIndex = r), m !== null && (N.macrobeatIndex = m), this.emit("tempoModulationMarkersChanged"), this.recordState(), N.id;
      }
      const l = wt(t, d, h, r, m);
      return this.state.tempoModulationMarkers.push(l), this.state.tempoModulationMarkers.sort((N, s) => N.measureIndex - s.measureIndex), this.emit("tempoModulationMarkersChanged"), this.recordState(), a("info", "rhythmActions", `Added modulation marker ${l.id} at measure ${t} with ratio=${d}, columnIndex=${r}`, null, "state"), l.id;
    },
    removeModulationMarker(t) {
      const d = this.state.tempoModulationMarkers.findIndex((h) => h.id === t);
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
      const h = this.state.tempoModulationMarkers.find((r) => r.id === t);
      if (!h) {
        a("warn", "rhythmActions", `Modulation marker not found: ${t}`, null, "state");
        return;
      }
      h.ratio = d, this.emit("tempoModulationMarkersChanged"), this.recordState(), a("info", "rhythmActions", `Updated modulation marker ${t} ratio to ${d}`, null, "state");
    },
    moveModulationMarker(t, d) {
      const h = this.state.tempoModulationMarkers.find((r) => r.id === t);
      if (!h) {
        a("warn", "rhythmActions", `Modulation marker not found: ${t}`, null, "state");
        return;
      }
      h.measureIndex = d, this.state.tempoModulationMarkers.sort((r, m) => r.measureIndex - m.measureIndex), this.emit("tempoModulationMarkersChanged"), this.recordState(), a("info", "rhythmActions", `Moved modulation marker ${t} to measure ${d}`, null, "state");
    },
    toggleModulationMarker(t) {
      const d = this.state.tempoModulationMarkers.find((h) => h.id === t);
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
    const p = e[o];
    p.coeffs && typeof p.coeffs == "object" && !Array.isArray(p.coeffs) ? p.coeffs = new Float32Array(Object.values(p.coeffs)) : Array.isArray(p.coeffs) && (p.coeffs = new Float32Array(p.coeffs)), p.phases && typeof p.phases == "object" && !Array.isArray(p.phases) ? p.phases = new Float32Array(Object.values(p.phases)) : Array.isArray(p.phases) && (p.phases = new Float32Array(p.phases));
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
function Gt(n, e) {
  if (n)
    try {
      const o = n.getItem(e);
      if (o === null)
        return;
      const p = JSON.parse(o), i = p.macrobeatGroupings;
      if (!Ot(i)) {
        n.removeItem(e);
        return;
      }
      if (!Ft(p.macrobeatBoundaryStyles, i.length)) {
        n.removeItem(e);
        return;
      }
      if (delete p.timbres, p.pitchRange) {
        const a = Q.length, t = Math.max(0, a - 1), d = Math.max(0, Math.min(t, p.pitchRange.topIndex ?? 0)), h = Math.max(d, Math.min(t, p.pitchRange.bottomIndex ?? t));
        p.pitchRange = { topIndex: d, bottomIndex: h };
      }
      if ("playheadMode" in p) {
        const a = p.playheadMode;
        a !== "cursor" && a !== "microbeat" && a !== "macrobeat" && delete p.playheadMode;
      }
      return p.fullRowData = [...Q], p;
    } catch {
      return;
    }
}
function Rt(n, e, o) {
  if (e)
    try {
      const p = JSON.parse(JSON.stringify({
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
      })), i = JSON.stringify(p);
      e.setItem(o, i);
    } catch {
    }
}
function Bt(n = {}) {
  const {
    storageKey: e = "studentNotationState",
    storage: o,
    initialState: p,
    onClearState: i,
    noteActionCallbacks: a = {},
    sixteenthStampActionCallbacks: t = {},
    tripletStampActionCallbacks: d = {},
    rhythmActionCallbacks: h = {}
  } = n, r = {}, m = Gt(o, e), c = !m, s = {
    state: {
      ...Ct(),
      ...m,
      ...p
    },
    isColdStart: c,
    on(y, b) {
      r[y] || (r[y] = []), r[y].push(b);
    },
    off(y, b) {
      if (r[y]) {
        const O = r[y].indexOf(b);
        O > -1 && r[y].splice(O, 1);
      }
    },
    emit(y, b) {
      r[y] && r[y].forEach((O) => {
        try {
          O(b);
        } catch (u) {
          console.error(`Error in listener for event "${y}"`, u);
        }
      });
    },
    dispose() {
      for (const y in r)
        delete r[y];
    },
    saveState() {
      Rt(s.state, o, e);
    },
    // ========== HISTORY ACTIONS ==========
    recordState() {
      s.state.history = s.state.history.slice(0, s.state.historyIndex + 1);
      const y = JSON.parse(JSON.stringify(s.state.timbres)), b = {
        notes: JSON.parse(JSON.stringify(s.state.placedNotes)),
        tonicSignGroups: JSON.parse(JSON.stringify(s.state.tonicSignGroups)),
        placedChords: JSON.parse(JSON.stringify(s.state.placedChords)),
        sixteenthStampPlacements: JSON.parse(JSON.stringify(s.state.sixteenthStampPlacements)),
        tripletStampPlacements: JSON.parse(JSON.stringify(s.state.tripletStampPlacements || [])),
        timbres: y,
        annotations: s.state.annotations ? JSON.parse(JSON.stringify(s.state.annotations)) : [],
        lassoSelection: JSON.parse(JSON.stringify(s.state.lassoSelection))
      };
      s.state.history.push(b), s.state.historyIndex++, s.emit("historyChanged"), s.saveState();
    },
    undo() {
      var y;
      if (s.state.historyIndex > 0) {
        s.state.historyIndex--;
        const b = s.state.history[s.state.historyIndex];
        if (!b) return;
        s.state.placedNotes = JSON.parse(JSON.stringify(b.notes)), s.state.tonicSignGroups = JSON.parse(JSON.stringify(b.tonicSignGroups)), s.state.sixteenthStampPlacements = JSON.parse(JSON.stringify(b.sixteenthStampPlacements || [])), s.state.tripletStampPlacements = JSON.parse(JSON.stringify(b.tripletStampPlacements || [])), s.state.timbres = Je(b.timbres), s.state.annotations = b.annotations ? JSON.parse(JSON.stringify(b.annotations)) : [], s.emit("notesChanged"), s.emit("sixteenthStampPlacementsChanged"), s.emit("tripletStampPlacementsChanged"), s.emit("rhythmStructureChanged"), (y = s.state.selectedNote) != null && y.color && s.emit("timbreChanged", s.state.selectedNote.color), s.emit("annotationsChanged"), s.emit("historyChanged");
      }
    },
    redo() {
      var y;
      if (s.state.historyIndex < s.state.history.length - 1) {
        s.state.historyIndex++;
        const b = s.state.history[s.state.historyIndex];
        if (!b) return;
        s.state.placedNotes = JSON.parse(JSON.stringify(b.notes)), s.state.tonicSignGroups = JSON.parse(JSON.stringify(b.tonicSignGroups)), s.state.sixteenthStampPlacements = JSON.parse(JSON.stringify(b.sixteenthStampPlacements || [])), s.state.tripletStampPlacements = JSON.parse(JSON.stringify(b.tripletStampPlacements || [])), s.state.timbres = Je(b.timbres), s.state.annotations = b.annotations ? JSON.parse(JSON.stringify(b.annotations)) : [], s.emit("notesChanged"), s.emit("sixteenthStampPlacementsChanged"), s.emit("tripletStampPlacementsChanged"), s.emit("rhythmStructureChanged"), (y = s.state.selectedNote) != null && y.color && s.emit("timbreChanged", s.state.selectedNote.color), s.emit("annotationsChanged"), s.emit("historyChanged");
      }
    },
    clearSavedState() {
      o && (o.removeItem(e), o.removeItem("effectDialValues")), i && i();
    },
    // ========== VIEW ACTIONS ==========
    setPlaybackState(y, b) {
      s.state.isPlaying = y, s.state.isPaused = b, s.emit("playbackStateChanged", { isPlaying: y, isPaused: b });
    },
    setLooping(y) {
      s.state.isLooping = y, s.emit("loopingChanged", y);
    },
    setTempo(y) {
      s.state.tempo = y, s.emit("tempoChanged", y);
    },
    setPlayheadMode(y) {
      s.state.playheadMode = y, s.emit("playheadModeChanged", y);
    },
    setSelectedTool(y, b) {
      const O = s.state.selectedTool;
      if (s.state.previousTool = O, s.state.selectedTool = y, b !== void 0) {
        const u = typeof b == "string" ? parseInt(b, 10) : b;
        isNaN(u) || (s.state.selectedToolTonicNumber = u);
      }
      s.emit("toolChanged", { newTool: y, oldTool: O });
    },
    setSelectedNote(y, b) {
      const O = { ...s.state.selectedNote };
      s.state.selectedNote = { shape: y, color: b }, s.emit("noteChanged", { newNote: s.state.selectedNote, oldNote: O });
    },
    setPitchRange(y) {
      s.state.pitchRange = { ...s.state.pitchRange, ...y }, s.emit("pitchRangeChanged", s.state.pitchRange);
    },
    setDegreeDisplayMode(y) {
      s.state.degreeDisplayMode = y, s.emit("degreeDisplayModeChanged", y);
    },
    setLongNoteStyle(y) {
      s.state.longNoteStyle = y, s.emit("longNoteStyleChanged", y);
    },
    toggleAccidentalMode(y) {
      s.state.accidentalMode[y] = !s.state.accidentalMode[y], s.emit("accidentalModeChanged", s.state.accidentalMode);
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
    setLayoutConfig(y) {
      y.cellWidth !== void 0 && (s.state.cellWidth = y.cellWidth), y.cellHeight !== void 0 && (s.state.cellHeight = y.cellHeight), y.columnWidths !== void 0 && (s.state.columnWidths = y.columnWidths), s.emit("layoutConfigChanged", y);
    },
    setDeviceProfile(y) {
      s.state.deviceProfile = { ...s.state.deviceProfile, ...y }, s.emit("deviceProfileChanged", s.state.deviceProfile);
    },
    setPrintPreviewActive(y) {
      s.state.isPrintPreviewActive = y, s.emit("printPreviewStateChanged", y);
    },
    setPrintOptions(y) {
      s.state.printOptions = { ...s.state.printOptions, ...y }, s.emit("printOptionsChanged", s.state.printOptions);
    },
    setAdsrTimeAxisScale(y) {
      s.state.adsrTimeAxisScale = y, s.emit("adsrTimeAxisScaleChanged", y);
    },
    setAdsrComponentWidth() {
    },
    shiftGridUp() {
    },
    shiftGridDown() {
    },
    setGridPosition() {
    },
    setKeySignature(y) {
      s.state.keySignature = y, s.emit("keySignatureChanged", y);
    },
    // ========== HARMONY ACTIONS ==========
    setActiveChordIntervals(y) {
      s.state.activeChordIntervals = y, s.emit("activeChordIntervalsChanged", y);
    },
    setIntervalsInversion(y) {
      s.state.isIntervalsInverted = y, s.emit("intervalsInversionChanged", y);
    },
    setChordPosition(y) {
      s.state.chordPositionState = y, s.emit("chordPositionChanged", y);
    },
    // ========== TIMBRE ACTIONS ==========
    setADSR(y, b) {
      s.state.timbres[y] && (s.state.timbres[y].adsr = { ...s.state.timbres[y].adsr, ...b }, s.emit("timbreChanged", y));
    },
    setHarmonicCoefficients(y, b) {
      s.state.timbres[y] && (s.state.timbres[y].coeffs = b, s.emit("timbreChanged", y));
    },
    setHarmonicPhases(y, b) {
      s.state.timbres[y] && (s.state.timbres[y].phases = b, s.emit("timbreChanged", y));
    },
    setFilterSettings(y, b) {
      s.state.timbres[y] && (s.state.timbres[y].filter = { ...s.state.timbres[y].filter, ...b }, s.emit("timbreChanged", y));
    },
    applyPreset(y, b) {
      s.state.timbres[y] && (Object.assign(s.state.timbres[y], b), s.emit("timbreChanged", y));
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
    ...Et(h)
  };
  return o && (s.on("tempoChanged", () => s.saveState()), s.on("degreeDisplayModeChanged", () => s.saveState()), s.on("longNoteStyleChanged", () => s.saveState()), s.on("playheadModeChanged", () => s.saveState())), c && o && s.saveState(), s;
}
function Lt(n = {}) {
  const {
    getPlacedTonicSigns: e = () => [],
    sideColumnWidth: o = 0.25,
    beatColumnWidth: p = 1
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
  function h(c) {
    const { macrobeatGroupings: l, macrobeatBoundaryStyles: N } = c, y = [...e(c)].sort((C, x) => C.preMacrobeatIndex - x.preMacrobeatIndex), b = [], O = [];
    let u = 0, A = 0, v = 0, g = 0, f = 0;
    const M = (C) => {
      var x;
      for (; f < y.length; ) {
        const S = y[f];
        if (!S || S.preMacrobeatIndex !== C) break;
        const T = S.uuid || "";
        for (let D = 0; D < 2; D++)
          b.push({
            visualIndex: u,
            canvasIndex: A,
            timeIndex: null,
            type: "tonic",
            widthMultiplier: p,
            xOffsetUnmodulated: g,
            macrobeatIndex: null,
            beatInMacrobeat: null,
            isMacrobeatStart: !1,
            isMacrobeatEnd: !1,
            isPlayable: !1,
            tonicSignUuid: D === 0 ? T : null
            // Only first column stores UUID
          }), u++, A++, g += p;
        const I = T;
        do
          f++;
        while (f < y.length && (((x = y[f]) == null ? void 0 : x.uuid) || "") === I);
      }
    };
    for (let C = 0; C < 2; C++)
      b.push({
        visualIndex: u,
        canvasIndex: null,
        timeIndex: null,
        type: "legend-left",
        widthMultiplier: o,
        xOffsetUnmodulated: g,
        macrobeatIndex: null,
        beatInMacrobeat: null,
        isMacrobeatStart: !1,
        isMacrobeatEnd: !1,
        isPlayable: !1,
        tonicSignUuid: null
      }), u++, g += o;
    M(-1), l.forEach((C, x) => {
      for (let T = 0; T < C; T++)
        b.push({
          visualIndex: u,
          canvasIndex: A,
          timeIndex: v,
          type: "beat",
          widthMultiplier: p,
          xOffsetUnmodulated: g,
          macrobeatIndex: x,
          beatInMacrobeat: T,
          isMacrobeatStart: T === 0,
          isMacrobeatEnd: T === C - 1,
          isPlayable: !0,
          tonicSignUuid: null
        }), u++, A++, v++, g += p;
      const S = N[x] || "dashed";
      O.push({
        macrobeatIndex: x,
        visualColumn: u - 1,
        canvasColumn: A - 1,
        timeColumn: v - 1,
        boundaryType: S,
        isMeasureStart: S === "solid"
      }), M(x);
    });
    for (let C = 0; C < 2; C++)
      b.push({
        visualIndex: u,
        canvasIndex: null,
        timeIndex: null,
        type: "legend-right",
        widthMultiplier: o,
        xOffsetUnmodulated: g,
        macrobeatIndex: null,
        beatInMacrobeat: null,
        isMacrobeatStart: !1,
        isMacrobeatEnd: !1,
        isPlayable: !1,
        tonicSignUuid: null
      }), u++, g += o;
    const w = /* @__PURE__ */ new Map(), F = /* @__PURE__ */ new Map(), $ = /* @__PURE__ */ new Map(), B = /* @__PURE__ */ new Map(), R = /* @__PURE__ */ new Map(), G = /* @__PURE__ */ new Map();
    return b.forEach((C) => {
      w.set(C.visualIndex, C.canvasIndex), F.set(C.visualIndex, C.timeIndex), C.canvasIndex !== null && ($.set(C.canvasIndex, C.visualIndex), B.set(C.canvasIndex, C.timeIndex)), C.timeIndex !== null && (C.canvasIndex !== null && R.set(C.timeIndex, C.canvasIndex), G.set(C.timeIndex, C.visualIndex));
    }), {
      entries: b,
      visualToCanvas: w,
      visualToTime: F,
      canvasToVisual: $,
      canvasToTime: B,
      timeToCanvas: R,
      timeToVisual: G,
      macrobeatBoundaries: O,
      totalVisualColumns: u,
      totalCanvasColumns: A,
      totalTimeColumns: v,
      totalWidthUnmodulated: g
    };
  }
  function r(c) {
    const l = t(c);
    return i && d(l) || (i = h(c), a = l), i;
  }
  function m() {
    i = null, a = null;
  }
  return {
    getColumnMap: r,
    invalidate: m,
    buildColumnMap: h
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
  for (let p = 0; p <= n && p < e.length; p++) {
    const i = e[p];
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
function Gn(n) {
  const e = [];
  for (const o of n.entries)
    o.canvasIndex !== null && (e[o.canvasIndex] = o.widthMultiplier);
  return e;
}
function Rn(n) {
  let e = 0;
  for (const o of n.entries)
    o.canvasIndex !== null && (e += o.widthMultiplier);
  return e;
}
function Bn() {
  let n = !1, e = null, o = null, p = null, i = null, a = !1;
  const t = (r, m, c, l, N) => {
    if (!a && r === "debug") return;
    const s = `[engine:${m}]`;
    console[r](s, c, l || "");
  }, d = (r, m, c) => {
    t(r, "controller", m, c);
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
      a = r.debug || !1, t("info", "controller", "Initializing engine"), p = r.pitchGridContext || null, i = r.drumGridContext || null, o = Lt({
        getPlacedTonicSigns: (c) => {
          if (!e) return [];
          const l = [];
          for (const N of Object.values(c.tonicSignGroups || {}))
            l.push(...N);
          return l;
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
      }), n = !0, t("info", "controller", "Engine initialized successfully"), (p || i) && this.render();
    },
    dispose() {
      n && (t("info", "controller", "Disposing engine"), e && (e.dispose(), e = null), o = null, p = null, i = null, n = !1);
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
    insertNote(r, m, c) {
      if (!e) return null;
      const l = {
        row: r,
        startColumnIndex: m,
        endColumnIndex: c ?? m,
        shape: e.state.selectedNote.shape,
        color: e.state.selectedNote.color
      };
      return e.addNote(l);
    },
    deleteNote(r) {
      if (!e) return !1;
      const m = e.state.placedNotes.find((c) => c.uuid === r);
      return m ? (e.removeNote(m), !0) : !1;
    },
    deleteSelection() {
      if (!e) return;
      const r = e.state.lassoSelection;
      if (!r.isActive || r.selectedItems.length === 0) return;
      const m = r.selectedItems.filter((c) => c.type === "note").map((c) => e.state.placedNotes.find((l) => l.uuid === c.id)).filter((c) => c !== void 0);
      m.length > 0 && e.removeMultipleNotes(m), this.clearSelection();
    },
    moveNote(r, m, c) {
      if (!e) return;
      const l = e.state.placedNotes.find((N) => N.uuid === r);
      l && (e.updateNoteRow(l, m), e.updateNotePosition(l, c));
    },
    setNoteTail(r, m) {
      if (!e) return;
      const c = e.state.placedNotes.find((l) => l.uuid === r);
      c && e.updateNoteTail(c, m);
    },
    clearAllNotes() {
      e && e.clearAllNotes();
    },
    // ============================================================================
    // SELECTION
    // ============================================================================
    setSelection(r) {
      if (!e) return;
      const m = r.map((c) => {
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
        (c) => c.row === r && c.startColumnIndex <= m && c.endColumnIndex >= m
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
        (c) => `${c.uuid},${c.row},${c.startColumnIndex},${c.endColumnIndex},${c.color},${c.shape}`
      );
      return [r, ...m].join(`
`);
    },
    importCSV(r) {
      if (!e) return;
      const m = r.split(`
`).filter((N) => N.trim());
      if (m.length === 0) return;
      const l = m.slice(1).map((N) => {
        const [s, y, b, O, u, A] = N.split(",");
        return {
          uuid: s,
          row: parseInt(y || "0", 10),
          startColumnIndex: parseInt(b || "0", 10),
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
          const m = JSON.parse(r);
          Object.assign(e.state, m), e.emit("stateImported", m), this.render();
        } catch (m) {
          t("error", "import", "Failed to import state", m);
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
      !p || !e || !o || t("debug", "controller", "renderPitchGrid called - canvas rendering not yet wired");
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
class Vt extends E.Synth {
  constructor(o) {
    var i;
    super(o);
    // Core signal path (Tone.js wrappers — needed for shared LFO connection API)
    X(this, "presetGain");
    X(this, "tremoloGain");
    // [PERF:NATIVE-NODES] Native filter nodes (1 node each vs 11 for Tone.Filter)
    X(this, "_hpFilter");
    X(this, "_bpFilter");
    // LP filter for HP→LP bandpass combo
    X(this, "_lpFilter");
    // [PERF:NATIVE-NODES] Native blend/dry gains (4 nodes vs 24 for 3 × Tone.CrossFade)
    X(this, "_dryGain");
    X(this, "_hpGain");
    X(this, "_bpGain");
    X(this, "_lpGain");
    // [PERF:LAZY-FILTER] Track whether the filter wet chain is connected to the audio graph
    X(this, "_filterChainConnected", !1);
    this.oscillator.disconnect(this.envelope);
    const p = this.context.rawContext;
    this.presetGain = new E.Gain(o.gain || 1), this.tremoloGain = new E.Gain(1), this._hpFilter = p.createBiquadFilter(), this._hpFilter.type = "highpass", this._bpFilter = p.createBiquadFilter(), this._bpFilter.type = "lowpass", this._lpFilter = p.createBiquadFilter(), this._lpFilter.type = "lowpass", this._dryGain = p.createGain(), this._dryGain.gain.value = 1, this._hpGain = p.createGain(), this._hpGain.gain.value = 0, this._bpGain = p.createGain(), this._bpGain.gain.value = 0, this._lpGain = p.createGain(), this._lpGain.gain.value = 0, this.oscillator.connect(this.presetGain), this.presetGain.output.connect(this._dryGain), this._dryGain.connect(this.tremoloGain.input), this._hpFilter.connect(this._hpGain), this._hpGain.connect(this.tremoloGain.input), this._hpFilter.connect(this._bpFilter), this._bpFilter.connect(this._bpGain), this._bpGain.connect(this.tremoloGain.input), this._lpFilter.connect(this._lpGain), this._lpGain.connect(this.tremoloGain.input), (i = o.filter) != null && i.enabled && this._connectFilterWetChain(), this.tremoloGain.connect(this.envelope), o.filter && this._setFilter(o.filter);
  }
  _setPresetGain(o) {
    this.presetGain && (this.presetGain.gain.value = o);
  }
  // [PERF:SHARED-LFO] No-op — vibrato is now handled by shared per-color LFOs.
  _setVibrato(o, p = E.now()) {
  }
  // [PERF:SHARED-LFO] No-op — tremolo is now handled by shared per-color LFOs.
  _setTremolo(o, p = E.now()) {
  }
  /**
   * Reset tremoloGain to pass-through (gain=1.0).
   * Called by synthEngine when shared tremolo LFO is disconnected.
   */
  _resetTremoloGain(o = E.now()) {
    this.tremoloGain && (this.tremoloGain.gain.cancelScheduledValues(o), this.tremoloGain.gain.value = 1);
  }
  _setFilter(o) {
    if (o.enabled && !this._filterChainConnected ? this._connectFilterWetChain() : !o.enabled && this._filterChainConnected && this._disconnectFilterWetChain(), this._dryGain.gain.value = o.enabled ? 0 : 1, o.enabled) {
      const p = E.Midi(o.cutoff + 35).toFrequency(), i = o.resonance / 100 * 12 + 0.1;
      this._hpFilter.frequency.value = p, this._hpFilter.Q.value = i, this._bpFilter.frequency.value = p, this._bpFilter.Q.value = i, this._lpFilter.frequency.value = p, this._lpFilter.Q.value = i;
      const a = o.blend;
      a <= 1 ? (this._hpGain.gain.value = 1 - a, this._bpGain.gain.value = a, this._lpGain.gain.value = 0) : (this._hpGain.gain.value = 0, this._bpGain.gain.value = 2 - a, this._lpGain.gain.value = a - 1);
    }
  }
  // [PERF:LAZY-FILTER] Connect filter entrance from presetGain.
  // Internal filter wiring stays permanently connected; only the entrance
  // (presetGain → filters) is toggled, which orphans/re-adopts the subgraph.
  _connectFilterWetChain() {
    this._filterChainConnected || (this.presetGain.output.connect(this._hpFilter), this.presetGain.output.connect(this._lpFilter), this._filterChainConnected = !0, Y == null || Y.debug("FilteredVoice", "Filter wet chain connected", null, "audio"));
  }
  // [PERF:LAZY-FILTER] Disconnect filter entrance. The orphaned filter nodes
  // and downstream blend gains have no input and won't be processed.
  _disconnectFilterWetChain() {
    this._filterChainConnected && (this.presetGain.output.disconnect(this._hpFilter), this.presetGain.output.disconnect(this._lpFilter), this._filterChainConnected = !1, Y == null || Y.debug("FilteredVoice", "Filter wet chain disconnected", null, "audio"));
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
  constructor(e, o = {}, p) {
    X(this, "masterGain");
    X(this, "options");
    X(this, "perVoiceBaselineGain");
    X(this, "voiceCountFn");
    X(this, "activeVoiceCount", 0);
    X(this, "smoothedVoiceCount");
    X(this, "gainUpdateLoopId", null);
    this.masterGain = e, this.options = { ...et, ...o }, this.perVoiceBaselineGain = tt(this.options.polyphonyReference), this.smoothedVoiceCount = this.options.polyphonyReference, this.voiceCountFn = p ?? null;
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
    const { polyphonyReference: e, smoothingTauMs: o, masterGainRampMs: p, gainUpdateIntervalMs: i } = this.options, a = E.now();
    if (this.activeVoiceCount === 0) {
      this.smoothedVoiceCount = 0.01 * e + (1 - 0.01) * this.smoothedVoiceCount;
      return;
    }
    const t = i / 1e3, d = 1 - Math.exp(-t / (o / 1e3)), h = Math.max(1, this.activeVoiceCount);
    this.smoothedVoiceCount = d * h + (1 - d) * this.smoothedVoiceCount;
    const r = Math.sqrt(e / this.smoothedVoiceCount), m = this.perVoiceBaselineGain * r;
    this.masterGain.gain.rampTo(m, p / 1e3, a);
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
      const p = Date.now();
      p - this.lastClippingWarningAt < this.options.clippingWarningCooldownMs || (this.lastClippingWarningAt = p, (a = (i = this.options).onWarning) == null || a.call(i, o));
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
    effectsManager: p,
    harmonicFilter: i,
    logger: a,
    audioInit: t,
    getDrumVolume: d
  } = n, h = {}, r = {};
  let m = null, c = null, l = null, N = null, s = null, y = {}, b = null, O = null;
  const u = { ...e };
  let A = null;
  const v = () => typeof window < "u" && window.__audioDiag === !0, g = {}, f = {};
  function M() {
    var T;
    let S = 0;
    for (const I in h)
      S += ((T = h[I]) == null ? void 0 : T.activeVoices) ?? 0;
    return S;
  }
  function w(S) {
    const T = [], I = /* @__PURE__ */ new Set(), D = S == null ? void 0 : S._activeVoices;
    D && D.forEach((P) => {
      const L = (P == null ? void 0 : P.voice) ?? P;
      L && !I.has(L) && (I.add(L), T.push(L));
    });
    const _ = S == null ? void 0 : S._voices;
    return _ && _.forEach((P) => {
      P && !I.has(P) && (I.add(P), T.push(P));
    }), T;
  }
  function F(S, T) {
    if (T.speed > 0 && T.span > 0) {
      const D = T.speed / 100 * 16, _ = T.span / 100 * 50;
      if (g[S]) {
        const P = g[S];
        P.frequency.value = D, P.min = -_, P.max = _;
      } else {
        const P = new E.LFO({ frequency: D, min: -_, max: _, type: "sine" });
        P.start(), g[S] = P;
        const L = h[S];
        L && w(L).forEach((W) => {
          try {
            P.connect(W.oscillator.detune);
          } catch {
          }
        }), R.debug("SynthEngine", `[PERF:SHARED-LFO] Created shared vibrato LFO for ${S}`, { freqHz: D, depthCents: _ }, "audio");
      }
    } else
      g[S] && (g[S].stop(), g[S].dispose(), g[S] = null, R.debug("SynthEngine", `[PERF:SHARED-LFO] Disposed shared vibrato LFO for ${S}`, null, "audio"));
  }
  function $(S, T) {
    if (T.speed > 0 && T.span > 0) {
      const D = T.speed / 100 * 16, _ = T.span / 100;
      if (f[S]) {
        const P = f[S];
        P.frequency.value = D, P.min = -_, P.max = 0;
      } else {
        const P = new E.LFO({ frequency: D, min: -_, max: 0, type: "sine" });
        P.start(), f[S] = P;
        const L = h[S];
        L && w(L).forEach((W) => {
          try {
            P.connect(W.tremoloGain.gain.input);
          } catch {
          }
        }), R.debug("SynthEngine", `[PERF:SHARED-LFO] Created shared tremolo LFO for ${S}`, { freqHz: D, depth: _ }, "audio");
      }
    } else if (f[S]) {
      f[S].stop(), f[S].dispose(), f[S] = null;
      const D = h[S];
      D && w(D).forEach((_) => {
        var P;
        try {
          (P = _._resetTremoloGain) == null || P.call(_);
        } catch {
        }
      }), R.debug("SynthEngine", `[PERF:SHARED-LFO] Disposed shared tremolo LFO for ${S}`, null, "audio");
    }
  }
  function B(S, T) {
    try {
      const I = g[T];
      I && I.connect(S.oscillator.detune);
      const D = f[T];
      D && D.connect(S.tremoloGain.gain.input);
    } catch (I) {
      R.warn("SynthEngine", `[PERF:SHARED-LFO] Failed to connect shared LFOs to voice for ${T}`, I, "audio");
    }
  }
  const R = a ?? {
    debug: () => {
    },
    info: () => {
    },
    warn: () => {
    }
  };
  function G(S) {
    if (i)
      return i.getFilteredCoefficients(S);
    const T = u[S];
    return T != null && T.coeffs ? T.coeffs : new Float32Array([0, 1]);
  }
  function C(S) {
    const T = S.reduce((I, D) => I + Math.abs(D), 0);
    return T > 1 ? Array.from(S).map((I) => I / T) : Array.from(S);
  }
  const x = {
    init() {
      var S;
      this.stopBackgroundMonitors(), m = new E.Gain(tt()), b = new qt(m, {}, M), b.start(), c = new E.Volume(o), l = new E.Compressor({
        threshold: -12,
        ratio: 3,
        attack: 0.01,
        release: 0.1,
        knee: 6
      }), N = new E.Limiter(-3), s = new E.Meter(), m.connect(c), c.connect(l), l.connect(N), N.toDestination(), N.connect(s), s && (O = new Ut(s, {
        onWarning: (T) => {
          R.warn("SynthEngine", "Limiter input approaching clipping threshold", { level: T }, "audio");
        }
      }), O.start());
      for (const T in u) {
        const I = u[T];
        if (!I) continue;
        I.vibrato || (I.vibrato = { speed: 0, span: 0 }), I.tremelo || (I.tremelo = { speed: 0, span: 0 });
        const D = G(T), _ = C(D), P = I.gain || 1, L = new E.PolySynth({
          maxPolyphony: 1 / 0,
          voice: Vt,
          options: {
            oscillator: { type: "custom", partials: _ },
            envelope: I.adsr,
            filter: I.filter,
            vibrato: I.vibrato,
            tremelo: I.tremelo,
            gain: P
          }
        }).connect(m);
        p && m && p.applySynthEffects(L, T, m), r[T] = /* @__PURE__ */ new WeakSet();
        const W = L.triggerAttack.bind(L);
        L.triggerAttack = function(...V) {
          const q = W(...V), H = (V[1] ?? E.now()) + 5e-3, U = r[T];
          return E.Draw.schedule(() => {
            const j = this._activeVoices, K = (z) => {
              !z || U.has(z) || (B(z, T), p && p.applyEffectsToVoice(z, T), U.add(z));
            };
            j && j.length > 0 ? j.forEach((z) => K((z == null ? void 0 : z.voice) ?? z)) : this._voices && Array.isArray(this._voices) && this._voices.forEach((z) => K(z));
          }, H), q;
        }, L._currentVibrato = I.vibrato, L._currentTremolo = I.tremelo, L._currentFilter = I.filter, h[T] = L, F(T, I.vibrato), $(T, I.tremelo), R.debug("SynthEngine", `Created filtered synth for color: ${T}`, null, "audio");
      }
      try {
        const T = E.context.rawContext;
        (S = T == null ? void 0 : T.addEventListener) == null || S.call(T, "statechange", () => {
          console.warn("[AudioDiag] AudioContext state →", T.state);
        });
      } catch {
      }
      A && (clearInterval(A), A = null), A = setInterval(() => {
        var V, q, J;
        if (!v()) return;
        let T = 0;
        const I = [];
        for (const H in h) {
          const U = ((V = h[H]) == null ? void 0 : V.activeVoices) ?? 0;
          T += U, I.push(`${H.slice(1, 4)}:${U}`);
        }
        const D = (b == null ? void 0 : b.getActiveVoiceCount()) ?? -1, _ = ((q = m == null ? void 0 : m.gain.value) == null ? void 0 : q.toFixed(4)) ?? "?", P = ((J = E.context) == null ? void 0 : J.state) ?? "?";
        let L = "?";
        try {
          const H = s == null ? void 0 : s.getValue(), U = Array.isArray(H) ? H[0] : H;
          U !== void 0 && (L = U.toFixed(1));
        } catch {
        }
        const W = D - T;
        console.log(
          `[AudioDiag] HEALTH | voices: GM=${D} actual=${T} (${I.join(" ")}) | gain: ${_} | ctx: ${P} | meter: ${L}dB` + (Math.abs(W) > 5 ? ` | ⚠ DRIFT=${W}` : "")
        );
      }, 2e3), R.info("SynthEngine", "Initialized with multi-timbral support", null, "audio");
    },
    updateSynthForColor(S) {
      const T = u[S], I = h[S];
      if (!I || !T) return;
      T.vibrato || (T.vibrato = { speed: 0, span: 0 }), T.tremelo || (T.tremelo = { speed: 0, span: 0 }), R.debug("SynthEngine", `Updating timbre for color ${S}`, null, "audio");
      const D = G(S), _ = C(D);
      I.set({
        oscillator: { partials: _ },
        envelope: T.adsr
      }), p && m && p.applySynthEffects(I, S, m), F(S, T.vibrato), $(S, T.tremelo), w(I).forEach((L) => {
        if (L != null && L._setFilter && L._setFilter(T.filter), L != null && L._setPresetGain) {
          const W = T.gain || 1;
          L._setPresetGain(W);
        }
      });
    },
    setBpm(S) {
      var T;
      try {
        (T = E == null ? void 0 : E.Transport) != null && T.bpm && (E.Transport.bpm.value = S, R.debug("SynthEngine", `Tone.Transport BPM updated to ${S}`, null, "audio"));
      } catch (I) {
        R.warn("SynthEngine", "Unable to update BPM on Tone.Transport", { tempo: S, error: I }, "audio");
      }
    },
    setVolume(S) {
      c && (c.volume.value = S);
    },
    async playNote(S, T, I = E.now()) {
      await (t || (() => E.start()))();
      const _ = Object.keys(h);
      if (_.length === 0) return;
      const [P] = _;
      if (!P) return;
      const L = h[P];
      L && L.triggerAttackRelease(S, T, I);
    },
    /**
     * Trigger note attack. Used by Transport scheduling with explicit time parameter.
     * For interactive (user-initiated) triggers, use triggerAttackInteractive instead.
     */
    triggerAttack(S, T, I = E.now(), D = !1) {
      var P;
      const _ = h[T];
      if (_) {
        if (v()) {
          const L = (b == null ? void 0 : b.getActiveVoiceCount()) ?? -1, W = M();
          console.log(`[AudioDiag] ATTACK | color=${T} pitch=${S} | GM=${L} actual=${W} | ctx=${(P = E.context) == null ? void 0 : P.state}`);
        }
        if (D && d) {
          const L = d(), W = _.volume.value, V = W + 20 * Math.log10(L);
          _.volume.value = V, _.triggerAttack(S, I), E.Draw.schedule(() => {
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
      E.context.state !== "running" && E.context.resume(), x.triggerAttack(S, T, E.now() + 0.02);
    },
    quickReleasePitches(S, T) {
      var _;
      const I = h[T];
      if (!I || !S || S.length === 0) return;
      let D;
      try {
        const P = typeof I.get == "function" ? I.get() : null, L = (_ = P == null ? void 0 : P.envelope) == null ? void 0 : _.release;
        D = typeof L == "number" ? L : void 0, I.set({ envelope: { release: 0.01 } }), S.forEach((W) => {
          I.triggerRelease(W, E.now());
        });
      } catch (P) {
        R.warn("SynthEngine", "quickReleasePitches failed", { err: P, color: T, pitches: S }, "audio");
      } finally {
        if (D !== void 0)
          try {
            I.set({ envelope: { release: D } });
          } catch {
          }
      }
    },
    triggerRelease(S, T, I = E.now()) {
      const D = h[T];
      if (D && (D.triggerRelease(S, I), v())) {
        const _ = (b == null ? void 0 : b.getActiveVoiceCount()) ?? -1, P = M(), L = _ - P;
        console.log(`[AudioDiag] RELEASE | color=${T} pitch=${S} | GM=${_} actual=${P}` + (Math.abs(L) > 5 ? ` | ⚠ DRIFT=${L}` : ""));
      }
    },
    releaseAll() {
      var S;
      for (const T in h)
        (S = h[T]) == null || S.releaseAll();
      b == null || b.resetActiveVoiceCount();
    },
    // === Waveform Visualization ===
    createWaveformAnalyzer(S) {
      const T = h[S];
      return T ? (y[S] || (y[S] = new E.Analyser("waveform", 1024), T.connect(y[S]), R.debug("SynthEngine", `Created waveform analyzer for color: ${S}`, null, "waveform")), y[S]) : (R.warn("SynthEngine", `No synth found for color: ${S}`, null, "audio"), null);
    },
    getWaveformAnalyzer(S) {
      return y[S] || null;
    },
    getAllWaveformAnalyzers() {
      const S = /* @__PURE__ */ new Map();
      for (const T in y)
        y[T] && S.set(T, y[T]);
      return S;
    },
    removeWaveformAnalyzer(S) {
      y[S] && (y[S].dispose(), delete y[S], R.debug("SynthEngine", `Removed waveform analyzer for color: ${S}`, null, "waveform"));
    },
    disposeAllWaveformAnalyzers() {
      for (const S in y)
        y[S] && y[S].dispose();
      y = {}, R.debug("SynthEngine", "Disposed all waveform analyzers", null, "waveform");
    },
    // === Node Access ===
    getSynth(S) {
      return h[S] || null;
    },
    getAllSynths() {
      return { ...h };
    },
    getMainVolumeNode() {
      return c || null;
    },
    getMasterGainNode() {
      return m || null;
    },
    // === Cleanup ===
    stopBackgroundMonitors() {
      O == null || O.stop(), b == null || b.stop(), A && (clearInterval(A), A = null);
    },
    dispose() {
      var S, T, I;
      this.stopBackgroundMonitors(), this.disposeAllWaveformAnalyzers();
      for (const D in g)
        (S = g[D]) == null || S.dispose(), g[D] = null;
      for (const D in f)
        (T = f[D]) == null || T.dispose(), f[D] = null;
      for (const D in h)
        (I = h[D]) == null || I.dispose();
      m == null || m.dispose(), c == null || c.dispose(), l == null || l.dispose(), N == null || N.dispose(), s == null || s.dispose(), R.debug("SynthEngine", "Disposed SynthEngine", null, "audio");
    }
  };
  return x;
}
const ze = 1e-4;
function Xt(n) {
  const {
    getMacrobeatInfo: e,
    getPlacedTonicSigns: o,
    getTonicSpanColumnIndices: p,
    updatePlayheadModel: i,
    logger: a
  } = n;
  let t = [], d = 0, h = 0, r = 0, m = null, c = null;
  const l = a ?? {
    debug: () => {
    }
  };
  function N(b) {
    return 60 / (b * 2);
  }
  function s(b, O, u) {
    let A = 0;
    l.debug("TimeMapCalculator", "[TIMEMAP] Building timeMap", {
      columnCount: O.length,
      tonicSignCount: u.length,
      microbeatDuration: b
    });
    const v = O.length, g = p(u);
    for (let f = 0; f < v; f++) {
      t[f] = A;
      const M = g.has(f);
      if (M ? l.debug("TimeMapCalculator", `[TIMEMAP] Column ${f} is tonic, not advancing time`) : A += (O[f] || 0) * b, f < 5) {
        const w = t[f];
        w !== void 0 && l.debug("TimeMapCalculator", `[TIMEMAP] timeMap[${f}] = ${w.toFixed(3)}s (isTonic: ${M})`);
      }
    }
    v > 0 && (t[v] = A), l.debug("TimeMapCalculator", `[TIMEMAP] Complete. Total columns: ${v}, Final time: ${A.toFixed(3)}s`);
  }
  function y(b) {
    const O = t.length > 0 ? t[t.length - 1] ?? 0 : 0;
    if (!Number.isFinite(O) || O === 0) {
      d = 0;
      return;
    }
    if (!m || m.length === 0) {
      d = O;
      return;
    }
    let u = O;
    for (const A of m) {
      const v = (c == null ? void 0 : c.get(A.measureIndex)) ?? null;
      if (v) {
        const g = v.endColumn - 1, f = t[g] ?? O, M = O - f, w = M * A.ratio;
        u = u - M + w;
      }
    }
    d = u;
  }
  return {
    getMicrobeatDuration: N,
    calculate(b) {
      var f, M, w;
      l.debug("TimeMapCalculator", "calculate", { tempo: `${b.tempo} BPM` }), t = [];
      const O = N(b.tempo), { columnWidths: u } = b, A = o();
      s(O, u, A), (M = l.timing) == null || M.call(l, "TimeMapCalculator", "calculate", { totalDuration: `${(f = t[t.length - 1]) == null ? void 0 : f.toFixed(2)}s` });
      const v = ((w = b.tempoModulationMarkers) == null ? void 0 : w.filter((F) => F.active)) || [];
      if (v.length > 0) {
        m = [...v].sort((F, $) => F.measureIndex - $.measureIndex), c = /* @__PURE__ */ new Map();
        for (const F of m)
          c.set(F.measureIndex, e(F.measureIndex));
      } else
        m = null, c = null;
      y();
      const g = d;
      i == null || i({
        timeMap: t,
        musicalEndTime: g,
        columnWidths: b.columnWidths,
        cellWidth: b.cellWidth
      });
    },
    getTimeMap() {
      return t;
    },
    getMusicalEndTime() {
      return d;
    },
    findNonAnacrusisStart(b) {
      if (!b.hasAnacrusis)
        return l.debug("TimeMapCalculator", "[ANACRUSIS] No anacrusis, starting from time 0"), 0;
      for (let O = 0; O < b.macrobeatBoundaryStyles.length; O++)
        if (b.macrobeatBoundaryStyles[O] === "solid") {
          const u = e(O + 1);
          if (u) {
            const A = t[u.startColumn] || 0;
            return l.debug("TimeMapCalculator", `[ANACRUSIS] Found solid boundary at macrobeat ${O}, non-anacrusis starts at column ${u.startColumn}, time ${A.toFixed(3)}s`), A;
          }
        }
      return l.debug("TimeMapCalculator", "[ANACRUSIS] No solid boundary found, starting from time 0"), 0;
    },
    applyModulationToTime(b, O, u) {
      if (!m || m.length === 0)
        return b;
      let A = b;
      O < 5 && l.debug("TimeMapCalculator", `[MODULATION] Column ${O}: baseTime ${b.toFixed(3)}s, ${m.length} active markers`);
      for (const v of m) {
        const g = (c == null ? void 0 : c.get(v.measureIndex)) ?? null;
        if (g) {
          const f = g.endColumn;
          if (O > f) {
            const M = t[f] !== void 0 ? t[f] : 0, w = b - M, F = w * v.ratio;
            A = A - w + F, O < 5 && l.debug("TimeMapCalculator", `[MODULATION] Column ${O}: Applied marker at measure ${v.measureIndex} (col ${f}), ratio ${v.ratio}, adjustedTime ${A.toFixed(3)}s`);
          }
        }
      }
      return A;
    },
    setLoopBounds(b, O, u) {
      const A = N(u), v = Math.max(A, 1e-3), g = Number.isFinite(b) ? b : 0;
      let f = Number.isFinite(O) ? O : g + v;
      f <= g && (f = g + v), h = g, r = f, E != null && E.Transport && (E.Transport.loopStart = g, E.Transport.loopEnd = f);
    },
    getConfiguredLoopBounds() {
      return { loopStart: h, loopEnd: r };
    },
    setConfiguredLoopBounds(b, O) {
      h = b, r = O;
    },
    clearConfiguredLoopBounds() {
      h = 0, r = 0;
    },
    reapplyConfiguredLoopBounds(b) {
      if (r > h) {
        const O = E.Time(E.Transport.loopStart).toSeconds(), u = E.Time(E.Transport.loopEnd).toSeconds(), A = Math.abs(O - h), v = Math.abs(u - r);
        (A > ze || v > ze) && (E.Transport.loopStart = h, E.Transport.loopEnd = r), E.Transport.loop !== b && (E.Transport.loop = b);
      }
    },
    updateLoopBoundsFromTimeline(b) {
      const O = this.findNonAnacrusisStart(b), u = d;
      this.setLoopBounds(O, u, b.tempo);
    }
  };
}
const Jt = {
  H: "https://tonejs.github.io/audio/drum-samples/CR78/hihat.mp3",
  M: "https://tonejs.github.io/audio/drum-samples/CR78/snare.mp3",
  L: "https://tonejs.github.io/audio/drum-samples/CR78/kick.mp3"
}, zt = 1e-4;
function jt(n = {}) {
  var h;
  const {
    samples: e = Jt,
    synthEngine: o,
    initialVolume: p = 0
  } = n;
  let i = null, a = null;
  const t = /* @__PURE__ */ new Map();
  function d(r, m) {
    let c = Number.isFinite(m) ? m : E.now();
    const l = t.get(r) ?? -1 / 0;
    return c > l || (c = l + zt), t.set(r, c), c;
  }
  if (a = new E.Volume(p), i = new E.Players(e).connect(a), o) {
    const r = (h = o.getMainVolumeNode) == null ? void 0 : h.call(o);
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
    trigger(r, m) {
      var l;
      if (!i) return;
      const c = d(r, m);
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
  let o = 0, p = n.length - 2;
  for (; o <= p; ) {
    const i = o + p >>> 1, a = n[i], t = n[i + 1];
    if (e >= a && e < t)
      return i;
    e < a ? p = i - 1 : o = i + 1;
  }
  return -1;
}
function Wn(n) {
  const {
    synthEngine: e,
    stateCallbacks: o,
    eventCallbacks: p,
    visualCallbacks: i,
    logger: a,
    audioInit: t,
    playbackMode: d = "standard",
    highwayService: h
  } = n, r = a ?? {
    debug: () => {
    },
    info: () => {
    },
    warn: () => {
    }
  };
  let m = null, c = !1, l = null, N = null, s = 1, y = null;
  const b = 50, O = [];
  function u(G, C) {
    const x = C.fullRowData[G];
    return x ? x.toneNote.replace(je, "b").replace(ke, "#") : "C4";
  }
  function A(G, C) {
    const x = G.globalRow ?? G.row, S = C.fullRowData[x];
    return S ? S.toneNote.replace(je, "b").replace(ke, "#") : "C4";
  }
  function v() {
    var D, _, P, L;
    if (!l) return;
    const G = o.getState();
    r.debug("TransportService", "scheduleNotes", "Clearing previous transport events and rescheduling all notes"), E.Transport.cancel(), N == null || N.reset(), l.calculate(G), (D = i == null ? void 0 : i.clearAdsrVisuals) == null || D.call(i);
    const C = l.getTimeMap(), { loopEnd: x } = l.getConfiguredLoopBounds(), S = l.findNonAnacrusisStart(G);
    r.debug("TransportService", `[ANACRUSIS] hasAnacrusis: ${G.hasAnacrusis}, anacrusisOffset: ${S.toFixed(3)}s`), G.placedNotes.forEach((W, V) => {
      const q = W.startColumnIndex, J = W.endColumnIndex, H = C[q];
      if (H === void 0) {
        r.warn("TransportService", `[NOTE SCHEDULE] Note ${V}: timeMap[${q}] undefined, skipping`);
        return;
      }
      const U = l.applyModulationToTime(H, q, G), j = C[J + 1];
      if (j === void 0) {
        r.warn("TransportService", `Skipping note with invalid endColumnIndex: ${W.endColumnIndex + 1}`);
        return;
      }
      const z = l.applyModulationToTime(j, J + 1, G) - U;
      W.isDrum ? g(W, U) : f(W, U, z, x, G);
    });
    const T = ((_ = o.getStampPlaybackData) == null ? void 0 : _.call(o)) ?? [];
    T.forEach((W) => {
      M(W, C, G);
    });
    const I = ((P = o.getTripletPlaybackData) == null ? void 0 : P.call(o)) ?? [];
    I.forEach((W) => {
      w(W, C, G);
    }), r.debug("TransportService", "scheduleNotes", `Finished scheduling ${G.placedNotes.length} notes, ${T.length} stamps, and ${I.length} triplets`), typeof window < "u" && window.__audioDiag && console.log(`[AudioDiag] SCHEDULE | notes=${G.placedNotes.length} stamps=${T.length} triplets=${I.length} | ctx=${(L = E.context) == null ? void 0 : L.state} | transport=${E.Transport.state}`);
  }
  function g(G, C) {
    const x = o.getState();
    E.Transport.schedule((S) => {
      if (x.isPaused) return;
      const T = G.drumTrack;
      if (T == null) return;
      const I = String(T);
      N == null || N.trigger(I, S), E.Draw.schedule(() => {
        var D;
        (D = i == null ? void 0 : i.triggerDrumNotePop) == null || D.call(i, G.startColumnIndex, T);
      }, S);
    }, C);
  }
  function f(G, C, x, S, T) {
    var H;
    const I = A(G, T), D = G.color, _ = G.globalRow ?? G.row, P = ((H = T.fullRowData[_]) == null ? void 0 : H.hex) || "#888888", L = G.uuid, W = T.timbres[D];
    if (!W) {
      r.warn("TransportService", `Timbre not found for color ${D}. Skipping note ${L}`);
      return;
    }
    let V = C + x;
    const J = S - 1e-3;
    V >= S && (V = Math.max(C + 1e-3, J)), E.Transport.schedule((U) => {
      o.getState().isPaused || (e.triggerAttack(I, D, U), E.Draw.schedule(() => {
        var j;
        (j = i == null ? void 0 : i.triggerAdsrVisual) == null || j.call(i, L, "attack", P, W.adsr), p.emit("noteAttack", { noteId: L, color: D });
      }, U));
    }, C), E.Transport.schedule((U) => {
      e.triggerRelease(I, D, U), E.Draw.schedule(() => {
        var j;
        (j = i == null ? void 0 : i.triggerAdsrVisual) == null || j.call(i, L, "release", P, W.adsr), p.emit("noteRelease", { noteId: L, color: D });
      }, U);
    }, V);
  }
  function M(G, C, x) {
    var D;
    const S = G.column, T = C[S];
    if (T === void 0) return;
    (((D = o.getStampScheduleEvents) == null ? void 0 : D.call(o, G.sixteenthStampId, G.placement)) ?? []).forEach((_) => {
      F(_, T, G.row, G.color, x);
    });
  }
  function w(G, C, x) {
    var D, _;
    const S = ((D = o.timeToCanvas) == null ? void 0 : D.call(o, G.startTimeIndex, x)) ?? G.startTimeIndex, T = C[S];
    if (T === void 0) return;
    (((_ = o.getTripletScheduleEvents) == null ? void 0 : _.call(o, G.tripletStampId, G.placement)) ?? []).forEach((P) => {
      F(P, T, G.row, G.color, x);
    });
  }
  function F(G, C, x, S, T) {
    const I = E.Time(G.offset).toSeconds(), D = E.Time(G.duration).toSeconds(), _ = C + I, P = _ + D, L = x + G.rowOffset, W = u(L, T), V = G.noteId;
    E.Transport.schedule((q) => {
      o.getState().isPaused || (e.triggerAttack(W, S, q), V && E.Draw.schedule(() => {
        p.emit("noteAttack", { noteId: V, color: S });
      }, q));
    }, _), E.Transport.schedule((q) => {
      o.getState().isPaused || (e.triggerRelease(W, S, q), V && E.Draw.schedule(() => {
        p.emit("noteRelease", { noteId: V, color: S });
      }, q));
    }, P);
  }
  function $() {
    var _, P;
    const C = o.getState().tempo, x = 1e-4, S = 0.5, T = (L) => (L == null ? void 0 : L.xPosition) ?? 477.5, I = typeof ((P = (_ = E.Transport) == null ? void 0 : _.bpm) == null ? void 0 : P.value) == "number" ? E.Transport.bpm.value : C;
    s = C !== 0 ? I / C : 1, c = !0;
    function D() {
      var Me, Ae, ve, be, we, Ie, xe, Pe, Ee, De, Oe, Fe, Ge, Re, Be;
      if (!c || !l)
        return;
      if (E.Transport.state === "stopped") {
        m = requestAnimationFrame(D);
        return;
      }
      const L = o.getState(), W = E.Time(E.Transport.loopEnd).toSeconds(), V = L.isLooping, q = l.getMusicalEndTime(), J = V && W > 0 ? W : q, H = E.Transport.seconds, U = H * 1e3, j = H >= J - 1e-3;
      if (!V && j) {
        r.info("TransportService", "Playback reached end. Stopping playhead."), R.stop();
        return;
      }
      if (L.isPaused) {
        m = requestAnimationFrame(D);
        return;
      }
      const K = l.getTimeMap();
      (Me = i == null ? void 0 : i.clearPlayheadCanvas) == null || Me.call(i), (Ae = i == null ? void 0 : i.clearDrumPlayheadCanvas) == null || Ae.call(i);
      let z = H;
      if (V) {
        const ee = E.Time(E.Transport.loopStart).toSeconds(), k = E.Time(E.Transport.loopEnd).toSeconds() - ee;
        k > 0 && (z = (H - ee) % k + ee);
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
      B(L, oe, C, T, x, S);
      const Te = ((Pe = i == null ? void 0 : i.getPlayheadCanvasHeight) == null ? void 0 : Pe.call(i)) ?? 500, Ne = ((Ee = i == null ? void 0 : i.getDrumCanvasHeight) == null ? void 0 : Ee.call(i)) ?? 100, Z = L.playheadMode === "macrobeat" && le >= 0 ? (De = o.getMacrobeatHighlightRect) == null ? void 0 : De.call(o, le) : null, ce = (Z == null ? void 0 : Z.x) ?? ye, de = (Z == null ? void 0 : Z.width) ?? Ce;
      oe >= 0 && (L.playheadMode === "macrobeat" || L.playheadMode === "microbeat" ? ((Oe = i == null ? void 0 : i.drawPlayheadHighlight) == null || Oe.call(i, ce, de, Te, U), (Fe = i == null ? void 0 : i.drawDrumPlayheadHighlight) == null || Fe.call(i, ce, de, Ne, U)) : ((Ge = i == null ? void 0 : i.drawPlayheadLine) == null || Ge.call(i, oe, Te), (Re = i == null ? void 0 : i.drawDrumPlayheadLine) == null || Re.call(i, oe, Ne)));
      const st = L.playheadMode === "macrobeat" || L.playheadMode === "microbeat";
      (Be = i == null ? void 0 : i.updateBeatLineHighlight) == null || Be.call(i, ce, de, st), m = requestAnimationFrame(D);
    }
    D();
  }
  function B(G, C, x, S, T, I) {
    if (!l) return;
    const _ = (Array.isArray(G.tempoModulationMarkers) ? G.tempoModulationMarkers : []).filter((P) => (P == null ? void 0 : P.active) && typeof P.ratio == "number" && P.ratio !== 0).sort((P, L) => S(P) - S(L));
    if (_.length > 0) {
      let P = 1;
      for (const L of _) {
        const W = S(L);
        if (C + I >= W)
          P *= 1 / L.ratio;
        else
          break;
      }
      if ((!Number.isFinite(P) || P <= 0) && (P = 1), Math.abs(P - s) > T) {
        const L = x * P;
        E.Transport.bpm.value = L, l.reapplyConfiguredLoopBounds(G.isLooping), s = P, r.debug("TransportService", `Tempo multiplier updated to ${P.toFixed(3)} (${L.toFixed(2)} BPM)`);
      }
    } else Math.abs(s - 1) > T && (E.Transport.bpm.value = x, l.reapplyConfiguredLoopBounds(G.isLooping), s = 1, r.debug("TransportService", `Tempo reset to base ${x} BPM`));
  }
  const R = {
    init() {
      const G = o.getState();
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
      }), E.Transport.bpm.value = G.tempo;
      const C = () => this.handleStateChange(), x = () => this.handleStateChange(), S = () => this.handleStateChange(), T = () => {
        if (l && l.getTimeMap().length > 0) {
          const P = o.getState();
          l.calculate(P);
        }
        this.handleStateChange();
      }, I = (P) => {
        var V, q;
        const L = ((V = P == null ? void 0 : P.oldConfig) == null ? void 0 : V.columnWidths) || [], W = ((q = P == null ? void 0 : P.newConfig) == null ? void 0 : q.columnWidths) || [];
        L.length !== W.length && l && l.calculate(o.getState());
      }, D = (P) => {
        if (r.info("TransportService", `tempoChanged triggered with new value: ${P} BPM`), E.Transport.state === "started") {
          const L = E.Transport.position;
          E.Transport.pause(), m && (cancelAnimationFrame(m), m = null), E.Transport.bpm.value = P, l == null || l.reapplyConfiguredLoopBounds(o.getState().isLooping), v(), E.Transport.start(void 0, L), d === "standard" && $();
        } else
          E.Transport.bpm.value = P, l == null || l.reapplyConfiguredLoopBounds(o.getState().isLooping), l == null || l.calculate(o.getState());
      }, _ = (P) => {
        E.Transport.loop = P;
        const L = E.Time(E.Transport.loopStart).toSeconds(), W = E.Time(E.Transport.loopEnd).toSeconds();
        P && W <= L && l && (E.Transport.loopEnd = L + Math.max(l.getMicrobeatDuration(o.getState().tempo), 1e-3)), P && l ? l.setConfiguredLoopBounds(
          E.Time(E.Transport.loopStart).toSeconds(),
          E.Time(E.Transport.loopEnd).toSeconds()
        ) : l == null || l.clearConfiguredLoopBounds();
      };
      p.on("rhythmStructureChanged", C), p.on("notesChanged", x), p.on("sixteenthStampPlacementsChanged", S), p.on("tempoModulationMarkersChanged", T), p.on("layoutConfigChanged", I), p.on("tempoChanged", D), p.on("loopingChanged", _), O.push(
        () => {
        }
        // These would be off() calls if the event system supports them
      ), E.Transport.on("stop", () => {
        var P, L;
        r.info("TransportService", "Tone.Transport 'stop' fired. Resetting playback state"), (P = p.setPlaybackState) == null || P.call(p, !1, !1), (L = i == null ? void 0 : i.clearAdsrVisuals) == null || L.call(i), m && (cancelAnimationFrame(m), m = null);
      }), r.info("TransportService", "Initialized");
    },
    handleStateChange() {
      E.Transport.state === "started" ? (y !== null && clearTimeout(y), y = setTimeout(() => {
        y = null, r.debug("TransportService", "handleStateChange: Rescheduling after debounce");
        const C = E.Transport.position;
        E.Transport.pause(), v(), E.Transport.start(void 0, C);
      }, b)) : l == null || l.calculate(o.getState());
    },
    start() {
      r.info("TransportService", "Starting playback"), (t || (() => E.start()))().then(async () => {
        E.context.state !== "running" && await E.context.resume(), N && await N.waitForLoad();
        const C = o.getState();
        l == null || l.calculate(C);
        const x = (l == null ? void 0 : l.getMusicalEndTime()) ?? 0, S = (l == null ? void 0 : l.findNonAnacrusisStart(C)) ?? 0;
        l == null || l.setLoopBounds(S, x, C.tempo), E.Transport.bpm.value = C.tempo, v();
        const T = E.now() + 0.1;
        E.Transport.start(T, 0), d === "standard" && $(), p.emit("playbackStarted");
      });
    },
    resume() {
      r.info("TransportService", "Resuming playback"), (t || (() => E.start()))().then(async () => {
        E.context.state !== "running" && await E.context.resume(), E.Transport.start(), d === "standard" && $(), p.emit("playbackResumed");
      });
    },
    pause() {
      r.info("TransportService", "Pausing playback"), E.Transport.pause(), m && (cancelAnimationFrame(m), m = null), p.emit("playbackPaused");
    },
    stop() {
      var C, x, S;
      r.info("TransportService", "Stopping playback and clearing visuals"), y !== null && (clearTimeout(y), y = null), c = !1, m && (cancelAnimationFrame(m), m = null), E.Transport.stop(), E.Transport.cancel(), N == null || N.reset();
      const G = o.getState();
      E.Transport.bpm.value = G.tempo, l == null || l.reapplyConfiguredLoopBounds(G.isLooping), e.releaseAll(), (C = i == null ? void 0 : i.clearPlayheadCanvas) == null || C.call(i), (x = i == null ? void 0 : i.clearDrumPlayheadCanvas) == null || x.call(i), (S = i == null ? void 0 : i.updateBeatLineHighlight) == null || S.call(i, 0, 0, !1), p.emit("playbackStopped");
    },
    dispose() {
      this.stop(), N == null || N.dispose(), O.forEach((G) => G()), r.debug("TransportService", "Disposed");
    }
  };
  return R;
}
const Kt = {
  latencyHint: "playback",
  lookAhead: 0.1
};
function Vn(n = {}) {
  const { latencyHint: e, lookAhead: o } = { ...Kt, ...n };
  let p = !1;
  if (E.context.state === "suspended")
    try {
      E.setContext(new E.Context({
        latencyHint: e
      })), p = !0;
    } catch (i) {
      console.warn("Failed to create new AudioContext, using default:", i);
    }
  return o !== void 0 && (E.context.lookAhead = o), p;
}
function qn() {
  const n = E.context.rawContext, e = n && "baseLatency" in n ? n.baseLatency : void 0;
  return {
    state: E.context.state,
    sampleRate: E.context.sampleRate,
    baseLatency: e,
    lookAhead: E.context.lookAhead
  };
}
function Yt(n) {
  let e = null, o = null;
  function p() {
    const l = typeof performance < "u" ? performance.now() : Date.now();
    return (!e || !o || l - o > 1) && (e = n.getViewportInfo(), o = l), e;
  }
  function i() {
    e = null, o = null;
  }
  function a(l, N) {
    if (n.columnToPixelX)
      return n.columnToPixelX(l, N);
    const { columnWidths: s, cellWidth: y } = N;
    let b = 0;
    for (let O = 0; O < l && O < s.length; O++)
      b += (s[O] ?? 1) * y;
    return b;
  }
  function t(l, N) {
    const s = p(), y = l - s.startRank, b = N.cellHeight / 2;
    return (y + 1) * b;
  }
  function d(l, N) {
    if (n.pixelXToColumn)
      return n.pixelXToColumn(l, N);
    const { columnWidths: s, cellWidth: y } = N;
    let b = 0;
    for (let O = 0; O < s.length; O++) {
      const u = (s[O] ?? 1) * y;
      if (l < b + u)
        return O;
      b += u;
    }
    return s.length - 1;
  }
  function h(l, N) {
    const s = p(), y = N.cellHeight / 2;
    return l / y - 1 + s.startRank;
  }
  function r() {
    const l = p(), { startRank: N, endRank: s } = l, y = Math.max(N, s - 1);
    return { startRow: N, endRow: y };
  }
  function m(l) {
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
    getRowFromY: h,
    getVisibleRowRange: r,
    getPitchClass: m,
    getLineStyleFromPitchClass: c,
    invalidateViewportCache: i,
    getCachedViewportInfo: p
  };
}
const me = "♯", fe = "♭", ae = "/", Qt = 0.35, Zt = 0.5, en = 6, tn = 1, nn = 0.08, on = 0.04, sn = 1, ie = 4;
function an(n) {
  const { coords: e } = n;
  function o(u) {
    const A = u == null ? void 0 : u.split("-")[1];
    return Number.parseInt(A ?? "0", 10);
  }
  function p(u) {
    if (!u || typeof u.startColumnIndex != "number" || typeof u.endColumnIndex != "number")
      return !1;
    const A = u.shape === "circle" ? u.startColumnIndex + 1 : u.startColumnIndex;
    return u.endColumnIndex > A;
  }
  function i(u, A) {
    return Number.isFinite(u) && u > 0 && Number.isFinite(A) && A > 0;
  }
  function a(u, A, v) {
    const { cellWidth: g } = v, f = g * 0.25, M = u.uuid;
    if (!M) return 0;
    const w = A.filter(
      (B) => !B.isDrum && B.row === u.row && B.startColumnIndex === u.startColumnIndex && B.uuid && B.uuid !== M
    );
    if (w.length === 0) return 0;
    const F = [u, ...w];
    return F.sort((B, R) => o(B.uuid) - o(R.uuid)), F.findIndex((B) => B.uuid === M) * f;
  }
  function t(u, A) {
    var M, w, F;
    const { cellHeight: v } = A, g = (M = n.getAnimationEffectsManager) == null ? void 0 : M.call(n);
    return (w = g == null ? void 0 : g.shouldAnimateNote) != null && w.call(g, u) ? (((F = g.getVibratoYOffset) == null ? void 0 : F.call(g, u.color)) ?? 0) * v : 0;
  }
  function d(u, A, v) {
    const { cellHeight: g } = v, f = g / 2 * 0.12, M = u.uuid;
    if (!M) return 0;
    const w = A.filter(
      (B) => !B.isDrum && B.row === u.row && B.startColumnIndex === u.startColumnIndex && B.uuid && B.uuid !== M && p(B)
    );
    if (w.length === 0) return 0;
    const F = [u, ...w];
    return F.sort((B, R) => o(B.uuid) - o(R.uuid)), F.findIndex((B) => B.uuid === M) * f;
  }
  function h(u, A) {
    var G, C, x;
    const v = (G = n.getDegreeForNote) == null ? void 0 : G.call(n, u);
    if (!v) return { label: null, isAccidental: !1 };
    if (!(((C = n.hasAccidental) == null ? void 0 : C.call(n, v)) ?? !1)) return { label: v, isAccidental: !1 };
    const f = A.accidentalMode || {}, M = f.sharp ?? !0, w = f.flat ?? !0;
    if (!M && !w) return { label: null, isAccidental: !0 };
    let F = v.includes(me) ? v : null, $ = v.includes(fe) ? v : null;
    const B = (x = n.getEnharmonicDegree) == null ? void 0 : x.call(n, v);
    B && (B.includes(me) && !F && (F = B), B.includes(fe) && !$ && ($ = B));
    let R = null;
    if (M && w) {
      const S = [];
      F && S.push(F), $ && (!F || $ !== F) && S.push($), R = S.join(ae), R || (R = v);
    } else M ? R = F || v : w && (R = $ || v);
    return { label: R, isAccidental: !0 };
  }
  function r(u) {
    if (!u) return { multiplier: 1, category: "natural" };
    const A = u.includes(fe), v = u.includes(me), g = u.includes(ae);
    return !A && !v ? { multiplier: 1, category: "natural" } : g ? { multiplier: 0.75, category: "both-accidentals" } : { multiplier: 0.88, category: "single-accidental" };
  }
  function m(u, A, v, g, f, M) {
    const { label: w } = h(A, v);
    if (!w) return;
    const { multiplier: F, category: $ } = r(w);
    let B;
    if (A.shape === "circle") {
      const R = M * 2 * Zt;
      switch ($) {
        case "natural":
          B = R;
          break;
        case "single-accidental":
          B = R * 0.8;
          break;
        case "both-accidentals":
          B = R * 0.4;
          break;
        default:
          B = R * F;
      }
    } else {
      const R = M * 2 * Qt;
      switch ($) {
        case "natural":
          B = R * 1.5;
          break;
        case "single-accidental":
          B = R * 1.2;
          break;
        case "both-accidentals":
          B = R;
          break;
        default:
          B = R * F;
      }
    }
    if (!(B < en))
      if (u.fillStyle = "#212529", u.font = `bold ${B}px 'Atkinson Hyperlegible', sans-serif`, u.textAlign = "center", u.textBaseline = "middle", A.shape === "oval" && $ === "both-accidentals" && w.includes(ae)) {
        const R = w.split(ae), G = B * 1.1, C = G * (R.length - 1), x = f - C / 2;
        R.forEach((S, T) => {
          const I = x + T * G, D = B * 0.08;
          u.fillText(S.trim(), g, I + D);
        });
      } else {
        const R = B * 0.08;
        u.fillText(w, g, f + R);
      }
  }
  function c(u, A, v) {
    var R, G;
    const g = (R = n.getAnimationEffectsManager) == null ? void 0 : R.call(n), f = g == null ? void 0 : g.hasReverbEffect;
    if (!(typeof f == "function" ? f(A.color) : !!f)) return { shouldApply: !1, blur: 0, spread: 0 };
    const { cellWidth: w } = v, F = (G = g == null ? void 0 : g.getReverbEffect) == null ? void 0 : G.call(g, A.color);
    if (!F) return { shouldApply: !1, blur: 0, spread: 0 };
    const $ = F.blur * (w / 2), B = F.spread * (w / 3);
    return { shouldApply: $ > 0 || B > 0, blur: $, spread: B };
  }
  function l(u, A, v, g, f, M, w) {
    var R, G, C;
    const F = (R = n.getAnimationEffectsManager) == null ? void 0 : R.call(n);
    if (!((G = F == null ? void 0 : F.hasDelayEffect) != null && G.call(F, A.color))) return;
    const { cellWidth: $ } = v, B = (C = F.getDelayEffects) == null ? void 0 : C.call(F, A.color);
    !B || B.length === 0 || B.forEach((x) => {
      const S = x.delay / 500 * $ * 2, T = g + S, I = M * x.scale, D = w * x.scale;
      u.save(), u.globalAlpha = x.opacity * 0.6, u.beginPath(), u.ellipse(T, f, I, D, 0, 0, 2 * Math.PI), u.strokeStyle = A.color, u.lineWidth = Math.max(0.5, I * 0.1), u.setLineDash([2, 2]), u.stroke(), u.restore();
    });
  }
  function N(u, A, v, g, f, M) {
    var R, G, C;
    const w = (R = n.getAnimationEffectsManager) == null ? void 0 : R.call(n);
    if (!((G = w == null ? void 0 : w.shouldFillNote) != null && G.call(w, A))) return;
    const F = ((C = w.getFillLevel) == null ? void 0 : C.call(w, A)) ?? 0;
    if (F <= 0) return;
    u.save();
    const $ = 1 - F, B = u.createRadialGradient(v, g, 0, v, g, Math.max(f, M));
    B.addColorStop(0, "transparent"), B.addColorStop(Math.max(0, $ - 0.05), "transparent"), B.addColorStop($, `${A.color}1F`), B.addColorStop(1, `${A.color}BF`), u.beginPath(), u.ellipse(v, g, f, M, 0, 0, 2 * Math.PI), u.clip(), u.fillStyle = B, u.fillRect(v - f - 10, g - M - 10, (f + 10) * 2, (M + 10) * 2), u.restore();
  }
  function s(u, A, v, g, f, M) {
    var x, S, T;
    const w = (x = n.getAnimationEffectsManager) == null ? void 0 : x.call(n);
    if (!((S = w == null ? void 0 : w.shouldFillNote) != null && S.call(w, A))) return;
    const F = ((T = w.getFillLevel) == null ? void 0 : T.call(w, A)) ?? 0;
    if (F <= 0) return;
    u.save(), u.beginPath(), u.arc(v, f, M, Math.PI / 2, -Math.PI / 2, !1), u.lineTo(g, f - M), u.arc(g, f, M, -Math.PI / 2, Math.PI / 2, !1), u.lineTo(v, f + M), u.closePath(), u.clip();
    const $ = (v + g) / 2, B = g - v, R = Math.max(B / 2 + M, M), G = 1 - F, C = u.createRadialGradient($, f, 0, $, f, R);
    C.addColorStop(0, "transparent"), C.addColorStop(Math.max(0, G - 0.05), "transparent"), C.addColorStop(G, `${A.color}1F`), C.addColorStop(1, `${A.color}BF`), u.fillStyle = C, u.fillRect(v - M - 10, f - M - 10, B + (M + 10) * 2, (M + 10) * 2), u.restore();
  }
  function y(u, A, v, g, f, M, w, F) {
    if (s(u, A, g, f, M, w), u.save(), u.beginPath(), u.arc(g, M, w, Math.PI / 2, -Math.PI / 2, !1), u.lineTo(f, M - w), u.arc(f, M, w, -Math.PI / 2, Math.PI / 2, !1), u.lineTo(g, M + w), u.closePath(), u.strokeStyle = A.color, u.lineWidth = F, u.shadowColor = A.color, u.shadowBlur = ie, u.stroke(), u.shadowBlur = 0, u.shadowColor = "transparent", u.restore(), v.degreeDisplayMode !== "off") {
      const $ = (g + f) / 2;
      m(u, A, v, $, M, w);
    }
  }
  function b(u, A, v, g) {
    const { cellWidth: f, cellHeight: M, tempoModulationMarkers: w, placedNotes: F } = A, $ = e.getRowY(g, A), B = t(v, A), R = $ + B, G = e.getColumnX(v.startColumnIndex, A);
    let C;
    if (w && w.length > 0 ? C = e.getColumnX(v.startColumnIndex + 1, A) - G : C = f, !i(C, M)) return;
    const x = a(v, F, A), S = G + C + x, T = Math.max(tn, C * nn), I = M / 2 - T / 2, D = p(v), _ = A.longNoteStyle || "style1";
    if (D && _ === "style2") {
      const W = S, V = e.getColumnX(v.endColumnIndex, A);
      if (!i(V - W, I)) return;
      y(u, v, A, W, V, R, I, T);
      return;
    }
    if (D) {
      const W = e.getColumnX(v.endColumnIndex + 1, A), V = d(v, F, A), q = R + V;
      u.beginPath(), u.moveTo(S, q), u.lineTo(W, q), u.strokeStyle = v.color, u.lineWidth = Math.max(sn, C * on), u.stroke();
    }
    const P = C - T / 2;
    if (!i(P, I)) return;
    l(u, v, A, S, R, P, I), u.save(), N(u, v, S, R, P, I);
    const L = c(u, v, A);
    L.shouldApply && (u.shadowColor = v.color, u.shadowBlur = ie + L.blur, u.shadowOffsetX = L.spread), u.beginPath(), u.ellipse(S, R, P, I, 0, 0, 2 * Math.PI), u.strokeStyle = v.color, u.lineWidth = T, L.shouldApply || (u.shadowColor = v.color, u.shadowBlur = ie), u.stroke(), u.shadowBlur = 0, u.shadowColor = "transparent", u.shadowOffsetX = 0, u.restore(), A.degreeDisplayMode !== "off" && m(u, v, A, S, R, P);
  }
  function O(u, A, v, g) {
    const { columnWidths: f, cellWidth: M, cellHeight: w, tempoModulationMarkers: F, placedNotes: $ } = A, B = e.getRowY(g, A), R = t(v, A), G = B + R, C = e.getColumnX(v.startColumnIndex, A);
    let x;
    if (F && F.length > 0 ? x = e.getColumnX(v.startColumnIndex + 1, A) - C : x = (f[v.startColumnIndex] ?? 1) * M, !i(x, w)) return;
    const S = a(v, $, A), T = Math.max(0.5, x * 0.15), I = C + x / 2 + S, D = x / 2 - T / 2, _ = w / 2 - T / 2;
    if (!i(D, _)) return;
    l(u, v, A, I, G, D, _), u.save(), N(u, v, I, G, D, _);
    const P = c(u, v, A);
    P.shouldApply && (u.shadowColor = v.color, u.shadowBlur = ie + P.blur, u.shadowOffsetX = P.spread), u.beginPath(), u.ellipse(I, G, D, _, 0, 0, 2 * Math.PI), u.strokeStyle = v.color, u.lineWidth = T, P.shouldApply || (u.shadowColor = v.color, u.shadowBlur = ie), u.stroke(), u.shadowBlur = 0, u.shadowColor = "transparent", u.shadowOffsetX = 0, u.restore(), A.degreeDisplayMode !== "off" && m(u, v, A, I, G, D);
  }
  return {
    drawTwoColumnOvalNote: b,
    drawSingleColumnOvalNote: O,
    hasVisibleTail: p
  };
}
function rn(n) {
  const { coords: e } = n;
  function o(i, a) {
    const { fullRowData: t, canvasWidth: d, cellHeight: h } = a, { startRow: r, endRow: m } = e.getVisibleRowRange();
    for (let c = r; c <= m; c++) {
      const l = t[c];
      if (!l) continue;
      const N = e.getRowY(c, a), s = e.getPitchClass(l.toneNote), y = e.getLineStyleFromPitchClass(s);
      if (i.beginPath(), i.moveTo(0, N), i.lineTo(d, N), i.strokeStyle = y.color, i.lineWidth = y.lineWidth, i.setLineDash(y.dash), i.stroke(), i.setLineDash([]), s === "G") {
        const b = h / 2;
        i.fillStyle = "#f8f9fa", i.fillRect(0, N - b, d, b);
      }
    }
  }
  function p(i, a) {
    var b, O, u, A;
    const {
      columnWidths: t,
      macrobeatBoundaryStyles: d,
      hasAnacrusis: h,
      canvasHeight: r
    } = a, m = ((b = n.getPlacedTonicSigns) == null ? void 0 : b.call(n)) ?? [], c = ((O = n.getTonicSpanColumnIndices) == null ? void 0 : O.call(n, m)) ?? /* @__PURE__ */ new Set(), l = ((u = n.getAnacrusisColors) == null ? void 0 : u.call(n)) ?? {
      background: "rgba(173, 181, 189, 0.15)",
      border: "rgba(173, 181, 189, 0.3)"
    };
    let N = h, s = 0, y = 0;
    for (let v = 0; v <= t.length; v++) {
      const g = e.getColumnX(v, a), f = (A = n.getMacrobeatInfo) == null ? void 0 : A.call(n, y);
      if (f && f.startColumn === v) {
        const w = d[y] ?? "solid";
        N && w === "solid" && (i.fillStyle = l.background, i.fillRect(s, 0, g - s, r), N = !1), i.beginPath(), i.moveTo(g, 0), i.lineTo(g, r), w === "anacrusis" ? (i.strokeStyle = l.border, i.setLineDash([5, 5]), i.lineWidth = 1) : w === "dashed" ? (i.strokeStyle = "#adb5bd", i.setLineDash([5, 5]), i.lineWidth = 1) : (i.strokeStyle = "#adb5bd", i.setLineDash([]), i.lineWidth = 2), i.stroke(), i.setLineDash([]), y++;
      } else v > 0 && !c.has(v - 1) && (i.beginPath(), i.moveTo(g, 0), i.lineTo(g, r), i.strokeStyle = "#dee2e6", i.lineWidth = 1, i.stroke());
      if (c.has(v)) {
        const w = (t[v] ?? 1) * a.cellWidth;
        i.fillStyle = "rgba(255, 193, 7, 0.1)", i.fillRect(g, 0, w, r);
      }
    }
  }
  return {
    drawHorizontalLines: o,
    drawVerticalLines: p
  };
}
function Hn(n, e, o) {
  const p = n.canvas.width, i = n.canvas.height;
  n.clearRect(0, 0, p, i);
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
  }), h = {
    ...e,
    canvasWidth: p,
    canvasHeight: i
  }, r = {
    ...e,
    placedNotes: e.placedNotes
  };
  t.drawHorizontalLines(n, h), t.drawVerticalLines(n, h);
  const { startRow: m, endRow: c } = a.getVisibleRowRange(), l = e.placedNotes.filter((N) => {
    if (N.isDrum) return !1;
    const s = N.globalRow ?? N.row;
    return s >= m && s <= c;
  });
  for (const N of l) {
    const s = N.globalRow ?? N.row;
    N.shape === "circle" ? d.drawTwoColumnOvalNote(n, r, N, s) : d.drawSingleColumnOvalNote(n, r, N, s);
  }
  for (const N of e.placedTonicSigns) {
    const s = N.globalRow ?? N.row;
    s >= m && s <= c && ln(n, e, N, a);
  }
}
function ln(n, e, o, p) {
  const { cellWidth: i, cellHeight: a } = e, t = p.getRowY(o.globalRow ?? o.row, e), d = p.getColumnX(o.columnIndex, e), h = i * 2, r = d + h / 2, m = Math.min(h, a) / 2 * 0.9;
  if (m < 2 || (n.beginPath(), n.arc(r, t, m, 0, 2 * Math.PI), n.strokeStyle = "#212529", n.lineWidth = Math.max(0.5, i * 0.05), n.stroke(), o.tonicNumber == null)) return;
  const c = o.tonicNumber.toString(), l = m * 1.5;
  l < 6 || (n.fillStyle = "#212529", n.font = `bold ${l}px 'Atkinson Hyperlegible', sans-serif`, n.textAlign = "center", n.textBaseline = "middle", n.fillText(c, r, t));
}
const cn = ["H", "M", "L"];
function dn(n) {
  if (n.length === 0) return [];
  const e = [...n].sort((p, i) => p.start - i.start), o = [];
  for (const p of e) {
    if (o.length === 0) {
      o.push({ ...p });
      continue;
    }
    const i = o[o.length - 1];
    p.start <= i.end ? i.end = Math.max(i.end, p.end) : o.push({ ...p });
  }
  return o;
}
function un(n, e, o) {
  const p = /* @__PURE__ */ new Set([n, e]);
  o.forEach((t) => {
    const d = Math.max(n, Math.min(e, t.start)), h = Math.max(n, Math.min(e, t.end));
    h > d && (p.add(d), p.add(h));
  });
  const i = Array.from(p).sort((t, d) => t - d), a = [];
  for (let t = 0; t < i.length - 1; t++) {
    const d = i[t], h = i[t + 1], r = (d + h) / 2, m = o.some((c) => r >= c.start && r < c.end);
    h > d && a.push({ from: d, to: h, light: m });
  }
  return a;
}
function Ke(n, e) {
  return e.some(
    (o) => n === o.columnIndex || n === o.columnIndex + 1
  );
}
function hn(n, e) {
  return !e.some((o) => n === o.columnIndex + 1);
}
function Ye(n, e, o, p, i, a, t = 1) {
  const d = o + i / 2, h = p + a / 2, r = Math.min(i, a) * 0.4 * t;
  if (n.beginPath(), e === 0)
    n.moveTo(d, h - r), n.lineTo(d - r, h + r), n.lineTo(d + r, h + r), n.closePath();
  else if (e === 1)
    n.moveTo(d, h - r), n.lineTo(d + r, h), n.lineTo(d, h + r), n.lineTo(d - r, h), n.closePath();
  else {
    for (let c = 0; c < 5; c++) {
      const l = 2 * Math.PI / 5 * c - Math.PI / 2, N = d + r * Math.cos(l), s = h + r * Math.sin(l);
      c === 0 ? n.moveTo(N, s) : n.lineTo(N, s);
    }
    n.closePath();
  }
  n.fill();
}
function mn(n) {
  const { coords: e } = n, o = {
    stroke: "#c7cfd8"
  };
  function p(h, r) {
    const m = [];
    return r !== null && r > 0 && m.push({
      start: e.getColumnX(0, h),
      end: e.getColumnX(r, h)
    }), h.placedTonicSigns.forEach((c) => {
      const l = e.getColumnX(c.columnIndex, h), N = e.getColumnX(c.columnIndex + 2, h);
      m.push({ start: l, end: N });
    }), dn(m);
  }
  function i(h) {
    if (!h.hasAnacrusis || !n.getMacrobeatInfo) return null;
    const r = h.macrobeatBoundaryStyles.findIndex(
      (c) => c === "solid"
    );
    if (r < 0) return null;
    const m = n.getMacrobeatInfo(r);
    return m ? m.endColumn + 1 : null;
  }
  function a(h, r, m) {
    var v, g;
    const {
      columnWidths: c,
      musicalColumnWidths: l,
      macrobeatGroupings: N,
      macrobeatBoundaryStyles: s,
      placedTonicSigns: y
    } = r, O = (l && l.length > 0 ? l : c).length, u = [];
    for (let f = 0; f < N.length; f++) {
      const M = (v = n.getMacrobeatInfo) == null ? void 0 : v.call(n, f);
      M && u.push(M.endColumn + 1);
    }
    const A = ((g = n.getAnacrusisColors) == null ? void 0 : g.call(n)) ?? o;
    for (let f = 0; f <= O; f++) {
      const M = f === 0 || f === O, w = Ke(f, y), F = y.some((C) => f === C.columnIndex + 2), $ = u.includes(f);
      if (!hn(f, y)) continue;
      let R = null;
      if (M || w || F)
        R = { lineWidth: 2, strokeStyle: "#adb5bd", dash: [] };
      else if ($) {
        const C = u.indexOf(f), x = s[C];
        x === "anacrusis" ? R = { lineWidth: 1, strokeStyle: A.stroke, dash: [4, 4] } : R = {
          lineWidth: 1,
          strokeStyle: "#adb5bd",
          dash: x === "solid" ? [] : [5, 5]
        };
      }
      if (!R) continue;
      const G = e.getColumnX(f, r);
      h.beginPath(), h.moveTo(G, 0), h.lineTo(G, m), h.lineWidth = R.lineWidth, h.strokeStyle = R.strokeStyle, h.setLineDash(R.dash), h.stroke();
    }
    h.setLineDash([]);
  }
  function t(h, r, m, c) {
    var b;
    const l = i(r), N = p(r, l), s = un(0, c, N), y = ((b = n.getAnacrusisColors) == null ? void 0 : b.call(n)) ?? o;
    for (let O = 0; O < 4; O++) {
      const u = O * m;
      s.forEach((A) => {
        A.to <= A.from || (h.beginPath(), h.moveTo(A.from, u), h.lineTo(A.to, u), h.strokeStyle = A.light ? y.stroke : "#ced4da", h.lineWidth = 1, h.globalAlpha = A.light ? 0.6 : 1, h.stroke(), h.globalAlpha = 1);
      });
    }
  }
  function d(h, r, m) {
    var O;
    const { placedNotes: c, columnWidths: l, cellWidth: N, placedTonicSigns: s, tempoModulationMarkers: y } = r, b = l.length + 4;
    for (let u = 0; u < b; u++) {
      if (Ke(u, s)) continue;
      const A = e.getColumnX(u, r);
      let v;
      y && y.length > 0 ? v = e.getColumnX(u + 1, r) - A : v = (l[u] ?? 0) * N;
      for (let g = 0; g < 3; g++) {
        const f = g * m, M = cn[g], w = c.find(
          (F) => F.isDrum && (typeof F.drumTrack == "number" ? String(F.drumTrack) : F.drumTrack) === M && F.startColumnIndex === u
        );
        if (w) {
          h.fillStyle = w.color;
          const F = ((O = n.getAnimationScale) == null ? void 0 : O.call(n, u, M)) ?? 1;
          Ye(h, g, A, f, v, m, F);
        } else
          h.fillStyle = "#ced4da", h.beginPath(), h.arc(A + v / 2, f + m / 2, 2, 0, Math.PI * 2), h.fill();
      }
    }
  }
  return {
    drawVerticalLines: a,
    drawHorizontalLines: t,
    drawDrumNotes: d,
    drawDrumShape: Ye,
    buildLightRanges: p,
    getAnacrusisEndColumn: i
  };
}
function Un(n, e, o) {
  var r;
  const p = n.canvas.width, i = n.canvas.height;
  n.clearRect(0, 0, p, i);
  const a = e.baseDrumRowHeight ?? 30, t = e.drumHeightScaleFactor ?? 1.5, d = Math.max(a, t * e.cellHeight), h = mn(o);
  h.drawHorizontalLines(n, e, d, p), h.drawVerticalLines(n, e, i), h.drawDrumNotes(n, e, d), o.renderModulationMarkers && ((r = e.tempoModulationMarkers) != null && r.length) && o.renderModulationMarkers(n, e);
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
  }, o = /* @__PURE__ */ new Map(), p = /* @__PURE__ */ new Map();
  function i(g, f) {
    return (g - f) * 100;
  }
  function a(g) {
    return g.targetKind ?? "fixedPitch";
  }
  function t(g) {
    return typeof g == "number" && Number.isFinite(g);
  }
  function d(g) {
    return !t(g.midi) || g.midi <= 0 ? !1 : typeof g.amplitudeDb == "number" && typeof e.minAmplitudeDb == "number" ? g.amplitudeDb >= e.minAmplitudeDb : !0;
  }
  function h(g, f) {
    return t(f) ? Math.abs(i(g.midi, f)) <= e.pitchToleranceCents : !1;
  }
  function r(g) {
    return !t(g.minMidi) || !t(g.maxMidi) ? null : {
      minMidi: Math.min(g.minMidi, g.maxMidi),
      maxMidi: Math.max(g.minMidi, g.maxMidi)
    };
  }
  function m(g, f) {
    if (!d(g)) return !1;
    const M = r(f);
    if (!M) return !1;
    const w = e.bandToleranceSemitones ?? 0;
    return g.midi >= M.minMidi - w && g.midi <= M.maxMidi + w;
  }
  function c(g, f) {
    if (!d(g)) return !1;
    const M = r(f);
    if (!M) return !0;
    const w = e.bandToleranceSemitones ?? 0;
    return g.midi >= M.minMidi - w && g.midi <= M.maxMidi + w;
  }
  function l(g, f) {
    const M = a(f);
    return M === "fixedPitch" ? h(g, f.midi ?? 0) : M === "windowBand" ? m(g, f) : M === "windowAnyPitch" ? c(g, f) : d(g);
  }
  function N(g, f) {
    return !t(f) || g.length === 0 ? 0 : g.reduce((w, F) => w + Math.abs(i(F.midi, f)), 0) / g.length;
  }
  function s(g, f, M, w) {
    if (g.length === 0)
      return { coveragePct: 0, coveredMs: 0 };
    const F = g.filter(f);
    if (F.length === 0)
      return { coveragePct: 0, coveredMs: 0 };
    let $ = 0;
    for (let B = 0; B < F.length; B++) {
      const R = F[B];
      if (!R) continue;
      const G = F[B + 1];
      if (G)
        $ += G.timeMs - R.timeMs;
      else {
        const C = M + w, x = Math.min(50, C - R.timeMs);
        $ += x;
      }
    }
    return {
      coveragePct: $ / w * 100,
      coveredMs: $
    };
  }
  function y(g, f, M, w) {
    return s(
      g,
      (F) => h(F, f),
      M,
      w
    ).coveragePct;
  }
  function b(g) {
    if (g.length === 0) return 0;
    const f = [...g].sort((w, F) => w - F), M = Math.floor(f.length / 2);
    return f.length % 2 === 0 ? (f[M - 1] + f[M]) / 2 : f[M] ?? 0;
  }
  function O(g) {
    if (g.length < 2) return 0;
    const f = Math.max(1, Math.floor(g.length * 0.2)), M = g.slice(0, f).map((B) => B.midi), w = g.slice(Math.max(0, g.length - f)).map((B) => B.midi), F = b(M);
    return b(w) - F;
  }
  function u(g, f, M) {
    const w = e.accuracyTiers;
    if (!w) return "okay";
    const F = Math.abs(g);
    return F <= w.perfect.onsetMs && f <= w.perfect.pitchCents && M >= w.perfect.coverage ? "perfect" : F <= w.good.onsetMs && f <= w.good.pitchCents && M >= w.good.coverage ? "good" : F <= w.okay.onsetMs && f <= w.okay.pitchCents && M >= w.okay.coverage ? "okay" : "miss";
  }
  function A(g) {
    const { note: f, samples: M, onsetSample: w, releaseSample: F } = g, $ = a(f);
    let B = 0;
    w ? B = w.timeMs - f.startTimeMs : B = e.onsetToleranceMs * 2;
    let R = 0;
    const G = f.startTimeMs + f.durationMs;
    F ? R = F.timeMs - G : R = e.releaseToleranceMs * 2;
    const C = e.minCoveragePct ?? e.hitThreshold, x = e.minVoicedMs ?? 0;
    let S = 0, T = 0, I, D, _, P, L = "miss";
    if ($ === "fixedPitch") {
      const V = f.midi ?? 0;
      S = N(M, V), T = y(
        M,
        V,
        f.startTimeMs,
        f.durationMs
      );
      const q = Math.abs(B) <= e.onsetToleranceMs, J = Math.abs(R) <= e.releaseToleranceMs, H = T >= e.hitThreshold;
      L = q && J && H ? "hit" : "miss";
    } else if ($ === "windowAnyPitch") {
      const V = s(
        M,
        (q) => c(q, f),
        f.startTimeMs,
        f.durationMs
      );
      I = V.coveragePct, D = V.coveredMs, T = V.coveragePct, L = I >= C && D >= x ? "hit" : "miss";
    } else if ($ === "windowBand") {
      const V = s(
        M,
        (H) => m(H, f),
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
        const H = (J.minMidi + J.maxMidi) / 2, U = M.filter((j) => m(j, f));
        S = N(U, H);
      }
      L = _ >= C && (D ?? 0) >= x ? "hit" : "miss";
    } else if ($ === "slideWindow") {
      const V = M.filter(d), q = s(
        M,
        d,
        f.startTimeMs,
        f.durationMs
      );
      I = q.coveragePct, D = q.coveredMs, T = q.coveragePct, P = O(V);
      const J = e.minSlideSemitones ?? 0;
      let H = !0;
      f.slideDirection === "up" ? H = P >= J : f.slideDirection === "down" ? H = P <= -J : H = Math.abs(P) >= J, L = I >= C && (D ?? 0) >= x && H ? "hit" : "miss";
    }
    const W = u(
      B,
      S,
      T
    );
    return {
      hitStatus: L,
      onsetAccuracyMs: B,
      releaseAccuracyMs: R,
      pitchAccuracyCents: S,
      pitchCoverage: T,
      voicedCoverage: I,
      voicedMs: D,
      bandCoverage: _,
      slideSemitoneSpan: P,
      slideDirection: f.slideDirection,
      pitchSamples: [...M],
      accuracyTier: W
    };
  }
  return {
    startNote(g, f) {
      o.set(g, {
        note: f,
        samples: [],
        onsetSample: null,
        releaseSample: null,
        startedAt: performance.now()
      });
    },
    recordPitchSample(g) {
      for (const [f, M] of o) {
        const { note: w } = M, F = w.startTimeMs + w.durationMs, $ = e.onsetToleranceMs, B = e.releaseToleranceMs;
        if (g.timeMs >= w.startTimeMs - $ && g.timeMs <= F + B) {
          M.samples.push(g);
          const R = l(g, w);
          !M.onsetSample && g.timeMs >= w.startTimeMs - $ && g.timeMs <= w.startTimeMs + $ && R && (M.onsetSample = g), g.timeMs >= F - B && g.timeMs <= F + B && R && (M.releaseSample = g);
        }
      }
    },
    endNote(g) {
      const f = o.get(g);
      if (!f) return null;
      const M = A(f);
      return p.set(g, M), o.delete(g), M;
    },
    getCurrentPerformance(g) {
      const f = o.get(g);
      if (!f) return null;
      const { note: M, samples: w, onsetSample: F } = f, $ = a(M);
      let B = 0;
      F && (B = F.timeMs - M.startTimeMs);
      let R = 0, G = 0, C, x, S, T;
      if ($ === "fixedPitch") {
        const I = M.midi ?? 0;
        R = N(w, I), G = y(
          w,
          I,
          M.startTimeMs,
          M.durationMs
        );
      } else if ($ === "windowAnyPitch") {
        const I = s(
          w,
          (D) => c(D, M),
          M.startTimeMs,
          M.durationMs
        );
        C = I.coveragePct, x = I.coveredMs, G = I.coveragePct;
      } else if ($ === "windowBand") {
        const I = s(
          w,
          (P) => m(P, M),
          M.startTimeMs,
          M.durationMs
        );
        S = I.coveragePct, G = I.coveragePct, x = I.coveredMs, C = s(
          w,
          d,
          M.startTimeMs,
          M.durationMs
        ).coveragePct;
        const _ = r(M);
        if (_) {
          const P = (_.minMidi + _.maxMidi) / 2, L = w.filter((W) => m(W, M));
          R = N(L, P);
        }
      } else if ($ === "slideWindow") {
        const I = w.filter(d), D = s(
          w,
          d,
          M.startTimeMs,
          M.durationMs
        );
        C = D.coveragePct, x = D.coveredMs, G = D.coveragePct, T = O(I);
      }
      return {
        onsetAccuracyMs: B,
        pitchAccuracyCents: R,
        pitchCoverage: G,
        voicedCoverage: C,
        voicedMs: x,
        bandCoverage: S,
        slideSemitoneSpan: T,
        slideDirection: M.slideDirection,
        pitchSamples: [...w]
      };
    },
    getAllPerformances() {
      return new Map(p);
    },
    reset() {
      o.clear(), p.clear();
    },
    dispose() {
      o.clear(), p.clear();
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
  }, { stateCallbacks: o, eventCallbacks: p, visualCallbacks: i, logger: a } = e, t = {
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
  let h = null;
  const r = /* @__PURE__ */ new Set(), m = /* @__PURE__ */ new Set();
  let c = null;
  function l() {
    const x = 60 / o.getTempo() * 1e3;
    return e.leadInBeats * x;
  }
  function N() {
    return o.getViewportWidth() * e.judgmentLinePosition;
  }
  function s(C) {
    const x = e.pixelsPerSecond / 1e3, S = N(), T = l();
    return (C + T) * x - S;
  }
  function y(C) {
    return typeof C == "number" && Number.isFinite(C);
  }
  function b(C) {
    return C.targetKind ?? "fixedPitch";
  }
  function O(C) {
    return !y(C.midi) || C.midi <= 0 ? !1 : typeof C.amplitudeDb == "number" && typeof e.feedbackConfig.minAmplitudeDb == "number" ? C.amplitudeDb >= e.feedbackConfig.minAmplitudeDb : !0;
  }
  function u(C, x) {
    const S = b(C), T = e.feedbackConfig.pitchToleranceCents;
    if (!O(x))
      return !1;
    if (S === "fixedPitch")
      return y(C.midi) ? Math.abs((x.midi - C.midi) * 100) <= T : !1;
    if (S === "windowBand") {
      if (!y(C.minMidi) || !y(C.maxMidi)) return !1;
      const I = Math.min(C.minMidi, C.maxMidi), D = Math.max(C.minMidi, C.maxMidi), _ = e.feedbackConfig.bandToleranceSemitones ?? 0;
      return x.midi >= I - _ && x.midi <= D + _;
    }
    if (S === "windowAnyPitch") {
      if (y(C.minMidi) && y(C.maxMidi)) {
        const I = Math.min(C.minMidi, C.maxMidi), D = Math.max(C.minMidi, C.maxMidi), _ = e.feedbackConfig.bandToleranceSemitones ?? 0;
        return x.midi >= I - _ && x.midi <= D + _;
      }
      return !0;
    }
    return !0;
  }
  function A() {
    if (!e.waitForInput || !t.onrampComplete)
      return null;
    const C = e.feedbackConfig.onsetToleranceMs;
    for (const x of t.targetNotes) {
      if (!x.waitForInput || m.has(x.id))
        continue;
      const S = x.startTimeMs + x.durationMs + C;
      if (t.currentTimeMs >= x.startTimeMs && t.currentTimeMs <= S)
        return x;
    }
    return null;
  }
  function v(C) {
    t.isWaitingForInput || (t.currentTimeMs = C.startTimeMs, t.scrollOffset = s(t.currentTimeMs), t.isWaitingForInput = !0, t.waitingNoteId = C.id, c = performance.now(), p.emit("waitStarted", { noteId: C.id, note: C }), a == null || a.info("NoteHighway", `Wait started for note: ${C.id}`, {
      noteId: C.id,
      targetKind: C.targetKind
    }));
  }
  function g(C, x) {
    !t.isWaitingForInput || t.waitingNoteId !== C || (t.startTime !== null && c !== null && (t.startTime += performance.now() - c), t.isWaitingForInput = !1, t.waitingNoteId = null, c = null, m.add(C), p.emit("waitEnded", { noteId: C, note: x }), a == null || a.info("NoteHighway", `Wait ended for note: ${C}`, {
      noteId: C,
      targetKind: x.targetKind
    }));
  }
  function f(C) {
    const x = N(), S = o.getCellWidth(), T = C.startColumn * S - t.scrollOffset, I = C.endColumn * S - t.scrollOffset, _ = e.feedbackConfig.onsetToleranceMs / 1e3 * e.pixelsPerSecond;
    return T <= x + _ && I >= x - _;
  }
  function M() {
    var x, S;
    const C = /* @__PURE__ */ new Set();
    for (const T of t.targetNotes) {
      const I = T.startTimeMs + T.durationMs, D = e.feedbackConfig.onsetToleranceMs;
      if (t.currentTimeMs >= T.startTimeMs - D && t.currentTimeMs <= I + D)
        C.add(T.id), t.activeNotes.has(T.id) || (d.startNote(T.id, T), a == null || a.debug("NoteHighway", `Note ${T.id} became active`, { note: T }));
      else if (t.activeNotes.has(T.id)) {
        const _ = d.endNote(T.id);
        if (_) {
          T.performance = _;
          const P = { noteId: T.id, note: T, performance: _ };
          _.hitStatus === "hit" ? (p.emit("noteHit", P), (x = i == null ? void 0 : i.onNoteHit) == null || x.call(i, T.id, _.accuracyTier || "okay"), a == null || a.info("NoteHighway", `Note hit: ${T.id}`, _)) : (p.emit("noteMissed", P), (S = i == null ? void 0 : i.onNoteMiss) == null || S.call(i, T.id), a == null || a.info("NoteHighway", `Note missed: ${T.id}`, _));
        }
      }
    }
    t.activeNotes = C;
  }
  function w() {
    for (const C of t.targetNotes) {
      const x = f(C), S = r.has(C.id);
      x && !S ? (r.add(C.id), p.emit("noteEntered", { noteId: C.id, note: C })) : !x && S && (r.delete(C.id), p.emit("noteExited", { noteId: C.id, note: C }));
    }
  }
  function F() {
    var C, x;
    if (!t.onrampComplete)
      if (t.currentTimeMs >= 0)
        t.onrampComplete = !0, p.emit("onrampComplete"), (C = i == null ? void 0 : i.clearOnrampCountdown) == null || C.call(i), a == null || a.info("NoteHighway", "Onramp complete", null);
      else {
        const T = 60 / o.getTempo() * 1e3, I = Math.abs(t.currentTimeMs), D = Math.ceil(I / T);
        (x = i == null ? void 0 : i.updateOnrampCountdown) == null || x.call(i, D);
      }
  }
  function $() {
    if (!t.isPlaying || t.isPaused || !t.startTime) {
      h = null;
      return;
    }
    const C = performance.now(), x = l();
    if (t.isWaitingForInput || (t.currentTimeMs = C - t.startTime - x, t.scrollOffset = s(t.currentTimeMs)), F(), M(), w(), !t.isWaitingForInput) {
      const S = A();
      S && v(S);
    }
    h = requestAnimationFrame($);
  }
  function B() {
    h || (h = requestAnimationFrame($));
  }
  function R() {
    h && (cancelAnimationFrame(h), h = null);
  }
  return {
    init(C) {
      t.targetNotes = C, a == null || a.info("NoteHighway", `Initialized with ${C.length} notes`, null);
    },
    start() {
      t.isPlaying || (t.isPlaying = !0, t.isPaused = !1, t.currentTimeMs = -l(), t.scrollOffset = s(t.currentTimeMs), t.onrampComplete = !1, t.activeNotes.clear(), t.startTime = performance.now(), t.isWaitingForInput = !1, t.waitingNoteId = null, c = null, r.clear(), m.clear(), d.reset(), B(), p.emit("playbackStarted"), a == null || a.info("NoteHighway", "Playback started", { onrampDurationMs: l() }));
    },
    pause() {
      !t.isPlaying || t.isPaused || (t.isPaused = !0, R(), p.emit("playbackPaused"), a == null || a.info("NoteHighway", "Playback paused", { currentTimeMs: t.currentTimeMs }));
    },
    resume() {
      if (!t.isPlaying || !t.isPaused || !t.startTime) return;
      const C = performance.now() - (t.startTime + t.currentTimeMs + l());
      t.startTime += C, t.isPaused = !1, B(), p.emit("playbackResumed"), a == null || a.info("NoteHighway", "Playback resumed", null);
    },
    stop() {
      var x, S;
      if (!t.isPlaying) return;
      t.isPlaying = !1, t.isPaused = !1, t.currentTimeMs = 0, t.scrollOffset = 0, t.onrampComplete = !1, t.activeNotes.clear(), t.startTime = null, t.isWaitingForInput = !1, t.waitingNoteId = null, c = null, r.clear(), m.clear(), R(), (x = i == null ? void 0 : i.clearCanvas) == null || x.call(i), (S = i == null ? void 0 : i.clearOnrampCountdown) == null || S.call(i), p.emit("playbackStopped"), t.targetNotes.every((T) => T.performance !== void 0) && p.emit("performanceComplete"), a == null || a.info("NoteHighway", "Playback stopped", null);
    },
    setScrollOffset(C) {
      if (t.currentTimeMs = C, t.scrollOffset = s(C), t.isWaitingForInput = !1, t.waitingNoteId = null, c = null, t.isPlaying) {
        const x = l();
        t.startTime = performance.now() - (C + x);
      }
      a == null || a.debug("NoteHighway", "Scroll offset set", { timeMs: C, scrollOffset: t.scrollOffset });
    },
    recordPitchInput(C, x, S, T) {
      if (!t.isPlaying || t.isPaused || !e.inputSources.includes(S)) return;
      const I = {
        timeMs: t.currentTimeMs,
        midi: C,
        clarity: x,
        amplitudeDb: T,
        source: S
      };
      if (t.isWaitingForInput && t.waitingNoteId) {
        const D = t.targetNotes.find((_) => _.id === t.waitingNoteId);
        if (D && u(D, I)) {
          g(D.id, D), d.recordPitchSample(I);
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
      const C = o.getViewportWidth(), x = o.getCellWidth();
      return t.targetNotes.filter((S) => {
        const T = S.startColumn * x - t.scrollOffset;
        return S.endColumn * x - t.scrollOffset >= 0 && T <= C;
      });
    },
    getPerformanceResults() {
      return d.getAllPerformances();
    },
    getFeedbackCollector() {
      return d;
    },
    dispose() {
      R(), d.dispose(), t.targetNotes = [], t.activeNotes.clear(), t.isWaitingForInput = !1, t.waitingNoteId = null, r.clear(), m.clear(), c = null, a == null || a.info("NoteHighway", "Service disposed", null);
    }
  };
}
function nt(n) {
  return 60 / n / 2;
}
function pn(n, e) {
  const { timeMap: o, tempo: p, cellWidth: i } = e;
  let a, t;
  if (o && o.length > 0) {
    const r = o[n.startColumnIndex] ?? 0, m = o[n.endColumnIndex] ?? r;
    a = r * 1e3, t = m * 1e3;
  } else {
    const r = e.microbeatDurationSec ?? nt(p);
    a = n.startColumnIndex * r * 1e3, t = n.endColumnIndex * r * 1e3;
  }
  const d = t - a, h = n.globalRow !== void 0 ? 108 - n.globalRow : 60;
  return {
    id: n.uuid ?? `note-${n.startColumnIndex}-${n.row}`,
    midi: h,
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
  return n.filter((p) => !p.isDrum).map((p) => pn(p, e));
}
function Jn(n, e) {
  const o = [0];
  let p = 0;
  for (let i = 0; i < n.length; i++) {
    const a = n[i] ?? 1;
    p += a * e, o.push(p);
  }
  return o;
}
function zn(n, e) {
  const o = nt(n.tempo), p = {
    tempo: n.tempo,
    cellWidth: n.cellWidth,
    timeMap: e,
    microbeatDurationSec: o
  };
  return gn(n.placedNotes, p);
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
  Bn as createEngineController,
  fn as createFeedbackCollector,
  Ln as createLessonMode,
  wt as createModulationMarker,
  Xn as createNoteHighwayService,
  Jn as createSimpleTimeMap,
  Bt as createStore,
  $n as createSynthEngine,
  Xt as createTimeMapCalculator,
  Wn as createTransportService,
  Q as fullRowData,
  Gn as getCanvasColumnWidths,
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
  Rn as getTotalCanvasWidth,
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
