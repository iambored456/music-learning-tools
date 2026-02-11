var Kr = Object.defineProperty;
var eo = (n, e, t) => e in n ? Kr(n, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : n[e] = t;
var J = (n, e, t) => eo(n, typeof e != "symbol" ? e + "" : e, t);
import * as V from "tone";
const Ye = [
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
], In = /* @__PURE__ */ new Map(), to = /* @__PURE__ */ new Map();
Ye.forEach((n, e) => {
  In.set(n.toneNote, e), n.midi !== void 0 && to.set(n.midi, e);
});
function Yd(n) {
  const e = In.get(n);
  return e !== void 0 ? Ye[e] : void 0;
}
function Zd(n) {
  return Ye[n];
}
function ys(n) {
  return In.get(n) ?? -1;
}
function no(n, e) {
  const t = ys(n), s = ys(e);
  return t === -1 || s === -1 ? null : {
    topIndex: Math.min(t, s),
    bottomIndex: Math.max(t, s)
  };
}
const so = {
  attack: 0.1,
  decay: 0.2,
  sustain: 0.8,
  release: 0.3
}, ro = {
  enabled: !0,
  blend: 1,
  cutoff: 16,
  resonance: 0,
  type: "lowpass",
  mix: 0
}, oo = {
  speed: 0,
  span: 0
}, io = {
  speed: 0,
  span: 0
};
function ao() {
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
  return n.forEach((t) => {
    const s = new Float32Array(32);
    s[0] = 1;
    const r = new Float32Array(32);
    e[t] = {
      name: "Sine",
      adsr: { ...so },
      coeffs: s,
      phases: r,
      filter: { ...ro },
      activePresetName: "sine",
      gain: 1,
      vibrato: { ...oo },
      tremelo: { ...io }
    };
  }), e;
}
function co() {
  const n = new Array(16).fill(2), e = n.slice(0, -1).map((t, s) => (s + 1) % 4 === 0 ? "solid" : "dashed");
  return {
    macrobeatGroupings: n,
    macrobeatBoundaryStyles: e,
    hasAnacrusis: !1,
    baseMicrobeatPx: 40,
    tempoModulationMarkers: []
  };
}
function lo() {
  const n = no("G5", "C4");
  return n || {
    topIndex: 0,
    bottomIndex: Math.max(0, Ye.length - 1)
  };
}
function uo() {
  const n = ao();
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
    fullRowData: [...Ye],
    pitchRange: lo(),
    // --- Rhythm ---
    ...co(),
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
function Ss(n) {
  if (!(!n || n.isDrum) && n.shape === "circle" && typeof n.startColumnIndex == "number") {
    const e = n.startColumnIndex + 1;
    (typeof n.endColumnIndex != "number" || n.endColumnIndex < e) && (n.endColumnIndex = e);
  }
}
function hn(n, e) {
  if (typeof n.row != "number") return;
  const t = e.length > 0 ? e.length - 1 : -1;
  if (t < 0) return;
  const s = typeof n.globalRow == "number" ? n.globalRow : n.row, r = Math.max(0, Math.min(t, Math.round(s)));
  n.globalRow = r, n.row = r;
}
function Rt() {
  return `uuid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function ho(n = {}) {
  const {
    getMacrobeatInfo: e,
    getDegreeForNote: t,
    hasAccidental: s,
    log: r = () => {
    }
  } = n;
  return {
    /**
     * Adds a note to the state.
     * IMPORTANT: This function no longer records history. The calling function is responsible for that.
     */
    addNote(o) {
      const i = this.state.placedNotes.find(
        (l) => !l.isDrum && l.row === o.row && l.startColumnIndex === o.startColumnIndex && l.color === o.color
      );
      if (i) {
        if (this.state.degreeDisplayMode !== "off" && t && s) {
          const l = t(i, this.state);
          if (l && s(l))
            return i.enharmonicPreference = !i.enharmonicPreference, r("debug", "[ENHARMONIC] Toggled enharmonic preference for note", {
              noteUuid: i.uuid,
              currentDegree: l,
              enharmonicPreference: i.enharmonicPreference
            }), this.emit("notesChanged"), i;
        }
        return null;
      }
      const a = { ...o, uuid: Rt() };
      return Ss(a), hn(a, this.state.fullRowData), this.state.placedNotes.push(a), this.emit("notesChanged"), a;
    },
    updateNoteTail(o, i) {
      let a = i;
      o.shape === "circle" && (a = Math.max(o.startColumnIndex + 1, i)), o.endColumnIndex = a, this.emit("notesChanged");
    },
    updateMultipleNoteTails(o, i) {
      o.forEach((a) => {
        let l = i;
        a.shape === "circle" && (l = Math.max(a.startColumnIndex + 1, i)), a.endColumnIndex = l;
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
    updateNoteRow(o, i) {
      o.row = i, o.globalRow = i, this.emit("notesChanged");
    },
    updateMultipleNoteRows(o, i) {
      o.forEach((a, l) => {
        const c = i[l];
        c !== void 0 && (a.row = c, hn(a, this.state.fullRowData));
      }), this.emit("notesChanged");
    },
    updateNotePosition(o, i) {
      o.startColumnIndex = i, o.endColumnIndex = o.shape === "circle" ? i + 1 : i, this.emit("notesChanged");
    },
    updateMultipleNotePositions(o, i) {
      o.forEach((a) => {
        a.startColumnIndex = i, a.endColumnIndex = a.shape === "circle" ? i + 1 : i;
      }), this.emit("notesChanged");
    },
    removeNote(o) {
      const i = this.state.placedNotes.indexOf(o);
      i > -1 && (this.state.placedNotes.splice(i, 1), this.emit("notesChanged"));
    },
    removeMultipleNotes(o) {
      const i = new Set(o);
      this.state.placedNotes = this.state.placedNotes.filter((a) => !i.has(a)), this.emit("notesChanged");
    },
    eraseInPitchArea(o, i, a = 1, l = !0) {
      const c = o + a - 1, u = i - 1, d = i + 1;
      let f = !1;
      const m = this.state.placedNotes.length;
      return this.state.placedNotes = this.state.placedNotes.filter((h) => {
        if (h.isDrum) return !0;
        const p = typeof h.globalRow == "number" ? h.globalRow : h.row;
        if (h.shape === "circle") {
          const C = h.startColumnIndex + 1, T = typeof h.endColumnIndex == "number" ? Math.max(C, h.endColumnIndex) : C, S = h.startColumnIndex <= c && T >= o, N = p >= u && p <= d;
          if (S && N)
            return !1;
        } else if (p >= u && p <= d && h.startColumnIndex <= c && h.endColumnIndex >= o)
          return !1;
        return !0;
      }), this.state.placedNotes.length < m && (f = !0), f && (this.emit("notesChanged"), l && this.recordState()), f;
    },
    eraseDrumNoteAt(o, i, a = !0) {
      const l = String(i), c = this.state.placedNotes.length;
      this.state.placedNotes = this.state.placedNotes.filter(
        (d) => !(d.isDrum && String(d.drumTrack) === l && d.startColumnIndex === o)
      );
      const u = this.state.placedNotes.length < c;
      return u && (this.emit("notesChanged"), a && this.recordState()), u;
    },
    toggleDrumNote(o) {
      const i = String(o.drumTrack), a = this.state.placedNotes.findIndex(
        (l) => l.isDrum && String(l.drumTrack) === i && l.startColumnIndex === o.startColumnIndex
      );
      if (a >= 0)
        this.state.placedNotes.splice(a, 1);
      else {
        const l = {
          ...o,
          uuid: Rt(),
          isDrum: !0,
          endColumnIndex: o.endColumnIndex ?? o.startColumnIndex
        };
        this.state.placedNotes.push(l);
      }
      this.emit("notesChanged"), this.recordState();
    },
    addTonicSignGroup(o) {
      r("debug", "Starting addTonicSignGroup", { tonicSignGroup: o });
      const i = o[0];
      if (!i) return;
      const { preMacrobeatIndex: a } = i;
      if (r("debug", "preMacrobeatIndex", { preMacrobeatIndex: a }), Object.entries(this.state.tonicSignGroups).find(
        ([, m]) => m.some((h) => h.preMacrobeatIndex === a)
      )) {
        r("debug", "Existing tonic already present for measure, skipping", { preMacrobeatIndex: a });
        return;
      }
      if (!e) {
        r("error", "getMacrobeatInfo callback not provided");
        return;
      }
      const c = e(this.state, a + 1).startColumn;
      r("debug", "Boundary column (canvas-space) for shifting notes", { boundaryColumn: c });
      const u = this.state.placedNotes.filter((m) => m.startColumnIndex >= c);
      r("debug", "Notes that will be shifted", {
        noteRanges: u.map((m) => `${m.startColumnIndex}-${m.endColumnIndex}`)
      }), this.state.placedNotes.forEach((m) => {
        if (m.startColumnIndex >= c) {
          const h = m.startColumnIndex, p = m.endColumnIndex;
          m.startColumnIndex = m.startColumnIndex + 2, m.endColumnIndex = m.endColumnIndex + 2, r("debug", `Shifted note from ${h}-${p} to ${m.startColumnIndex}-${m.endColumnIndex}`);
        }
      });
      const d = Rt(), f = o.map((m) => ({
        ...m,
        uuid: d,
        globalRow: typeof m.globalRow == "number" ? m.globalRow : m.row
      }));
      this.state.tonicSignGroups[d] = f, r("debug", "Added tonic group", { uuid: d, columns: f.map((m) => m.columnIndex) }), r("debug", "Emitting events: notesChanged, rhythmStructureChanged"), this.emit("notesChanged"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    /**
     * Erases tonic sign at the specified column index (canvas-space)
     */
    eraseTonicSignAt(o, i = !0) {
      const a = Object.entries(this.state.tonicSignGroups).find(
        ([, m]) => m.some((h) => h.columnIndex === o)
      );
      if (!a)
        return !1;
      if (!e)
        return r("error", "getMacrobeatInfo callback not provided"), !1;
      const [l, c] = a, u = c[0];
      if (!u) return !1;
      const d = u.preMacrobeatIndex, f = e(this.state, d + 1).startColumn;
      return delete this.state.tonicSignGroups[l], this.state.placedNotes.forEach((m) => {
        m.startColumnIndex >= f && (m.startColumnIndex = m.startColumnIndex - 2, m.endColumnIndex = m.endColumnIndex - 2);
      }), this.emit("notesChanged"), this.emit("rhythmStructureChanged"), i && this.recordState(), !0;
    },
    clearAllNotes() {
      this.state.placedNotes = [], this.state.tonicSignGroups = {}, this.emit("notesChanged"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    loadNotes(o) {
      const i = (o || []).map((a) => {
        const l = {
          ...a,
          uuid: (a == null ? void 0 : a.uuid) ?? Rt()
        };
        return Ss(l), hn(l, this.state.fullRowData), l;
      });
      this.state.placedNotes = i, this.emit("notesChanged"), this.recordState();
    }
  };
}
function fo() {
  return `sixteenth-stamp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function mo(n = {}) {
  const {
    getPlacedTonicSigns: e,
    isWithinTonicSpan: t,
    log: s = () => {
    }
  } = n;
  return {
    /**
     * Adds a stamp placement to the state
     * @param startColumn Canvas-space column index (0 = first musical beat)
     * @returns The placement if successful, null if blocked by tonic column
     */
    addSixteenthStampPlacement(r, o, i, a = "#4a90e2") {
      const l = o + 2;
      if (e && t) {
        const f = e(this.state);
        (t(o, f) || t(o + 1, f)) && s("debug", "Cannot place sixteenth stamp - overlaps tonic column", {
          sixteenthStampId: r,
          startColumn: o,
          row: i
        });
      }
      const c = this.state.sixteenthStampPlacements.find(
        (f) => f.row === i && f.startColumn < l && f.endColumn > o
      );
      c && this.removeSixteenthStampPlacement(c.id);
      const u = i, d = {
        id: fo(),
        sixteenthStampId: r,
        startColumn: o,
        endColumn: l,
        row: i,
        globalRow: u,
        color: a,
        timestamp: Date.now(),
        shapeOffsets: {}
      };
      return this.state.sixteenthStampPlacements.push(d), this.emit("sixteenthStampPlacementsChanged"), s("debug", `Added sixteenth stamp ${r} at canvas-space ${o}-${l},${i}`, {
        sixteenthStampId: r,
        startColumn: o,
        endColumn: l,
        row: i,
        placementId: d.id
      }), d;
    },
    /**
     * Removes a stamp placement by ID
     */
    removeSixteenthStampPlacement(r) {
      const o = this.state.sixteenthStampPlacements.findIndex((a) => a.id === r);
      if (o === -1) return !1;
      const i = this.state.sixteenthStampPlacements.splice(o, 1)[0];
      return i ? (this.emit("sixteenthStampPlacementsChanged"), s("debug", `Removed sixteenth stamp ${i.sixteenthStampId} at ${i.startColumn}-${i.endColumn},${i.row}`, {
        placementId: r,
        sixteenthStampId: i.sixteenthStampId,
        startColumn: i.startColumn,
        endColumn: i.endColumn,
        row: i.row
      }), !0) : !1;
    },
    /**
     * Removes stamps that intersect with an eraser area
     * @param eraseStartCol Canvas-space column index
     * @param eraseEndCol Canvas-space column index
     */
    eraseSixteenthStampsInArea(r, o, i, a) {
      const l = [];
      for (const u of this.state.sixteenthStampPlacements) {
        const d = u.startColumn <= o && u.endColumn >= r, f = u.row >= i && u.row <= a;
        d && f && l.push(u.id);
      }
      let c = !1;
      return l.forEach((u) => {
        this.removeSixteenthStampPlacement(u) && (c = !0);
      }), c;
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
    getSixteenthStampAt(r, o) {
      return this.state.sixteenthStampPlacements.find(
        (i) => i.row === o && r >= i.startColumn && r < i.endColumn
      ) || null;
    },
    /**
     * Clears all stamp placements
     */
    clearAllSixteenthStamps() {
      const r = this.state.sixteenthStampPlacements.length > 0;
      this.state.sixteenthStampPlacements = [], r && (this.emit("sixteenthStampPlacementsChanged"), s("info", "Cleared all sixteenth stamp placements"));
    },
    /**
     * Gets stamp placements for playback scheduling
     */
    getSixteenthStampPlaybackData() {
      return this.state.sixteenthStampPlacements.map((r) => {
        const o = this.state.fullRowData[r.row];
        return {
          sixteenthStampId: r.sixteenthStampId,
          column: r.startColumn,
          startColumn: r.startColumn,
          endColumn: r.endColumn,
          row: r.row,
          pitch: (o == null ? void 0 : o.toneNote) || "",
          color: r.color,
          placement: r
          // Include full placement object with shapeOffsets
        };
      }).filter((r) => r.pitch);
    },
    /**
     * Updates the pitch offset for an individual shape within a stamp
     */
    updateSixteenthStampShapeOffset(r, o, i) {
      const a = this.state.sixteenthStampPlacements.find((l) => l.id === r);
      if (!a) {
        s("warn", "[SIXTEENTH STAMP SHAPE OFFSET] Placement not found", { placementId: r });
        return;
      }
      a.shapeOffsets || (a.shapeOffsets = {}), s("debug", "[SIXTEENTH STAMP SHAPE OFFSET] Updating shape offset", {
        placementId: r,
        shapeKey: o,
        oldOffset: a.shapeOffsets[o] || 0,
        newOffset: i,
        baseRow: a.row,
        targetRow: a.row + i
      }), a.shapeOffsets[o] = i, this.emit("sixteenthStampPlacementsChanged");
    },
    /**
     * Gets the effective row for a specific shape within a stamp
     */
    getSixteenthStampShapeRow(r, o) {
      var a;
      const i = ((a = r.shapeOffsets) == null ? void 0 : a[o]) || 0;
      return r.row + i;
    }
  };
}
function po() {
  return `triplet-stamp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function go(n = {}) {
  const {
    canvasToTime: e,
    timeToCanvas: t,
    getColumnMap: s,
    log: r = () => {
    }
  } = n;
  return {
    /**
     * Adds a triplet placement to the state
     * @param placement - The triplet placement object
     * @returns The placed triplet or null if invalid
     */
    addTripletStampPlacement(o) {
      this.state.tripletStampPlacements || (this.state.tripletStampPlacements = []);
      const i = o.startTimeIndex + o.span * 2, a = this.state.tripletStampPlacements.find((c) => c.row !== o.row ? !1 : !(c.startTimeIndex + c.span * 2 <= o.startTimeIndex || i <= c.startTimeIndex));
      if (a && this.removeTripletStampPlacement(a.id), this.state.sixteenthStampPlacements && e && s) {
        const c = s(this.state);
        this.state.sixteenthStampPlacements.filter((d) => {
          if (d.row !== o.row) return !1;
          const f = e(d.startColumn, c);
          return f === null ? !0 : !(f + 2 <= o.startTimeIndex || f >= i);
        }).forEach((d) => {
          this.removeSixteenthStampPlacement && this.removeSixteenthStampPlacement(d.id);
        });
      }
      const l = {
        id: po(),
        ...o,
        shapeOffsets: o.shapeOffsets || {}
      };
      return this.state.tripletStampPlacements.push(l), this.emit("tripletStampPlacementsChanged"), this.emit("rhythmStructureChanged"), r("debug", `Added triplet stamp ${o.tripletStampId} at time ${o.startTimeIndex}, row ${o.row}`, {
        tripletStampId: o.tripletStampId,
        startTimeIndex: o.startTimeIndex,
        span: o.span,
        row: o.row,
        placementId: l.id
      }), l;
    },
    /**
     * Removes a triplet placement by ID
     * @param placementId - The placement ID to remove
     * @returns True if a triplet was removed
     */
    removeTripletStampPlacement(o) {
      if (!this.state.tripletStampPlacements) return !1;
      const i = this.state.tripletStampPlacements.findIndex((l) => l.id === o);
      if (i === -1) return !1;
      const a = this.state.tripletStampPlacements.splice(i, 1)[0];
      return a ? (this.emit("tripletStampPlacementsChanged"), r("debug", `Removed triplet stamp ${a.tripletStampId} at time ${a.startTimeIndex}, row ${a.row}`, {
        placementId: o,
        tripletStampId: a.tripletStampId,
        startTimeIndex: a.startTimeIndex,
        span: a.span,
        row: a.row
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
    eraseTripletStampsInArea(o, i, a, l) {
      if (!this.state.tripletStampPlacements || !t || !s) return !1;
      const c = s(this.state), u = [];
      for (const f of this.state.tripletStampPlacements)
        if (f.row >= a && f.row <= l) {
          const m = f.span * 2, h = t(f.startTimeIndex, c);
          h + m - 1 < o || h > i || u.push(f.id);
        }
      let d = !1;
      return u.forEach((f) => {
        this.removeTripletStampPlacement(f) && (d = !0);
      }), d;
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
    getTripletStampAt(o, i) {
      return this.state.tripletStampPlacements && this.state.tripletStampPlacements.find(
        (a) => a.row === i && o >= a.startTimeIndex && o < a.startTimeIndex + a.span * 2
      ) || null;
    },
    /**
     * Clears all triplet placements
     */
    clearAllTripletStamps() {
      if (!this.state.tripletStampPlacements) return;
      const o = this.state.tripletStampPlacements.length > 0;
      this.state.tripletStampPlacements = [], o && (this.emit("tripletStampPlacementsChanged"), r("info", "Cleared all triplet stamp placements"));
    },
    /**
     * Gets triplet placements for playback scheduling
     * @returns Array of playback data for triplets
     */
    getTripletStampPlaybackData() {
      return this.state.tripletStampPlacements ? this.state.tripletStampPlacements.map((o) => {
        const i = this.state.fullRowData[o.row];
        return {
          startTimeIndex: o.startTimeIndex,
          tripletStampId: o.tripletStampId,
          row: o.row,
          pitch: (i == null ? void 0 : i.toneNote) ?? "",
          color: o.color,
          span: o.span,
          placement: o
          // Include full placement object with shapeOffsets
        };
      }).filter((o) => o.pitch) : [];
    },
    /**
     * Updates the pitch offset for an individual shape within a triplet group
     * @param placementId - The triplet placement ID
     * @param shapeKey - The shape identifier (e.g., "triplet_0", "triplet_1", "triplet_2")
     * @param rowOffset - The pitch offset in rows (can be negative)
     */
    updateTripletStampShapeOffset(o, i, a) {
      var c;
      const l = (c = this.state.tripletStampPlacements) == null ? void 0 : c.find((u) => u.id === o);
      if (!l) {
        r("warn", "[TRIPLET STAMP SHAPE OFFSET] Placement not found", { placementId: o });
        return;
      }
      l.shapeOffsets || (l.shapeOffsets = {}), r("debug", "[TRIPLET STAMP SHAPE OFFSET] Updating shape offset", {
        placementId: o,
        shapeKey: i,
        oldOffset: l.shapeOffsets[i] || 0,
        newOffset: a,
        baseRow: l.row,
        targetRow: l.row + a
      }), l.shapeOffsets[i] = a, this.emit("tripletStampPlacementsChanged");
    },
    /**
     * Gets the effective row for a specific shape within a triplet group
     * @param placement - The triplet placement object
     * @param shapeKey - The shape identifier
     * @returns The effective row index
     */
    getTripletStampShapeRow(o, i) {
      var l;
      const a = ((l = o.shapeOffsets) == null ? void 0 : l[i]) || 0;
      return o.row + a;
    }
  };
}
const it = {
  COMPRESSION_2_3: 2 / 3,
  // 0.6666666667
  EXPANSION_3_2: 3 / 2
  // 1.5
};
function yo(n, e, t) {
  const { getMacrobeatInfo: s, log: r = () => {
  } } = t;
  if (r("debug", "[MODULATION] measureIndexToColumnIndex called", {
    measureIndex: n,
    hasState: !!e
  }), !e || !e.macrobeatGroupings) {
    r("warn", "[MODULATION] No state or macrobeatGroupings provided for measure conversion");
    const l = n * 4;
    return r("debug", "[MODULATION] Using fallback calculation", l), l;
  }
  if (n === 0)
    return r("debug", "[MODULATION] Measure 0 at canvas-space column 0"), 0;
  if (!s)
    return r("warn", "[MODULATION] getMacrobeatInfo callback not provided"), n * 4;
  const o = n - 1;
  r("debug", `[MODULATION] Converting measureIndex ${n} to macrobeatIndex: ${o}`);
  const i = s(e, o);
  if (r("debug", "[MODULATION] getMacrobeatInfo result", i), i) {
    const l = i.endColumn + 1;
    return r("debug", `[MODULATION] Found measure info, canvas-space endColumn: ${i.endColumn}, first column after: ${l}`), l;
  }
  r("warn", `[MODULATION] Could not find measure info for index: ${n}`);
  const a = n * 4;
  return r("debug", "[MODULATION] Using improved fallback calculation", a), a;
}
function So(n, e, t = null, s = null, r = null) {
  return {
    id: `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    measureIndex: n,
    ratio: e,
    active: !0,
    xPosition: t,
    // Store the actual boundary position if provided
    columnIndex: s,
    // Store column index for stable positioning
    macrobeatIndex: r
    // Store macrobeat index for stable positioning
  };
}
function Qd(n) {
  return Math.abs(n - it.COMPRESSION_2_3) < 1e-3 ? "2:3" : Math.abs(n - it.EXPANSION_3_2) < 1e-3 ? "3:2" : `${n}`;
}
function Kd(n) {
  const e = "#ffc107";
  return Math.abs(n - it.COMPRESSION_2_3) < 1e-3 || Math.abs(n - it.EXPANSION_3_2) < 1e-3, e;
}
function Cs() {
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
function eh(n, e, t = null, s = {}) {
  const { log: r = () => {
  } } = s;
  if (!n || n.length === 0)
    return Cs();
  const o = [...n.filter((d) => d.active)].sort((d, f) => d.measureIndex - f.measureIndex);
  if (o.length === 0)
    return Cs();
  r("debug", "[MODULATION] Creating coordinate mapping for markers", o);
  const i = o.map((d) => {
    const f = yo(d.measureIndex, t, s);
    return r("debug", `[MODULATION] Marker at measure ${d.measureIndex} calculated column=${f}`), r("debug", "[MODULATION] Full marker data", d), r("debug", "[MODULATION] Final marker position", {
      id: d.id,
      measureIndex: d.measureIndex,
      columnIndex: f
    }), {
      ...d,
      columnIndex: f
    };
  }), a = [];
  let l = 1;
  const c = i[0];
  if (i.length === 0 || c && c.columnIndex > 0) {
    const d = c ? c.columnIndex : 1 / 0;
    a.push({
      startColumn: 0,
      endColumn: d,
      scale: 1
    });
  }
  for (let d = 0; d < i.length; d++) {
    const f = i[d], m = i[d + 1], h = m ? m.columnIndex : 1 / 0;
    l *= f.ratio, a.push({
      startColumn: f.columnIndex,
      // Canvas-space
      endColumn: h,
      // Canvas-space
      scale: l,
      marker: f
    });
  }
  return {
    segments: a,
    /**
     * Gets the modulation scale for a given column index
     * @param columnIndex - Column index in musical space
     * @returns Scale factor (1.0 = no modulation, 0.667 = compressed, 1.5 = expanded)
     */
    getScaleForColumn(d) {
      for (const f of a)
        if (d >= f.startColumn && d < f.endColumn)
          return f.scale;
      return 1;
    },
    /**
     * Converts microbeat index to canvas x position
     * NOTE: This method is deprecated - getColumnX in rendererUtils now handles modulation directly
     */
    microbeatToCanvasX(d) {
      return 0;
    },
    /**
     * Converts canvas x position to microbeat index
     * NOTE: This method is deprecated - coordinate conversion now handled by getColumnFromX
     */
    canvasXToMicrobeat(d) {
      return 0;
    },
    /**
     * Gets the segment containing a given canvas x position
     * NOTE: This method is deprecated - not used in new column-based approach
     */
    getSegmentAtX(d) {
      return a[0] || null;
    },
    /**
     * Gets all ghost grid positions for a segment
     * NOTE: This method is deprecated - ghost grid now handled differently
     */
    getGhostGridPositions(d, f) {
      return [];
    }
  };
}
function th(n, e) {
  if (n >= 0 && n < e.length) {
    const t = e[n];
    if (t !== void 0)
      return t;
  }
  return n * 0.333;
}
function nh(n, e, t) {
  return 0;
}
function sh(n, e, t) {
  return 0;
}
const vs = new Array(19).fill(2), Co = [
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
], _s = new Array(16).fill(2), vo = [
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
function Ts(n, e) {
  const t = e(n), s = /* @__PURE__ */ new Map();
  t.entries.forEach((r) => {
    r.type === "tonic" && r.tonicSignUuid && typeof r.canvasIndex == "number" && s.set(r.tonicSignUuid, r.canvasIndex);
  }), Object.entries(n.tonicSignGroups || {}).forEach(([r, o]) => {
    const i = s.get(r);
    i !== void 0 && o.forEach((a) => {
      a.columnIndex = i;
    });
  });
}
const _o = {
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
function To(n = {}) {
  const {
    getColumnMap: e = () => _o,
    visualToTimeIndex: t = () => null,
    timeIndexToVisualColumn: s = () => null,
    getTimeBoundaryAfterMacrobeat: r = () => 0,
    log: o = () => {
    }
  } = n;
  return {
    setAnacrusis(i) {
      var h, p, C;
      if (this.state.hasAnacrusis === i)
        return;
      const a = [...this.state.macrobeatGroupings], l = [...this.state.macrobeatBoundaryStyles], c = a.reduce((T, S) => T + S, 0);
      let u, d;
      if (i) {
        const T = this._anacrusisCache, S = vs.length - _s.length, N = vs.slice(0, S), M = Co.slice(0, S), g = (h = T == null ? void 0 : T.groupings) != null && h.length ? [...T.groupings] : [...N], y = (p = T == null ? void 0 : T.boundaryStyles) != null && p.length ? [...T.boundaryStyles] : [...M];
        if (u = [...g, ...a], d = [...y, ...l], !((C = T == null ? void 0 : T.boundaryStyles) != null && C.length))
          for (let v = 0; v < y.length; v++)
            d[v] = v < y.length - 1 ? "anacrusis" : "solid";
        this._anacrusisCache = null, o("debug", "rhythmActions", "Enabled anacrusis", {
          insertedCount: g.length,
          insertedColumns: g.reduce((v, _) => v + _, 0)
        }, "state");
      } else {
        const T = l.findIndex((g) => g === "solid");
        let S = 0;
        if (T !== -1)
          S = T + 1;
        else
          for (; S < l.length && l[S] === "anacrusis"; )
            S++;
        S = Math.min(S, a.length);
        const N = a.slice(0, S), M = l.slice(0, S);
        S > 0 ? this._anacrusisCache = {
          groupings: N,
          boundaryStyles: M
        } : this._anacrusisCache = null, u = a.slice(S), d = l.slice(S).map((g) => g === "anacrusis" ? "dashed" : g), u.length === 0 && (u = [..._s], d = [...vo]), o("debug", "rhythmActions", "Disabled anacrusis", {
          removalCount: S,
          removedColumns: N.reduce((g, y) => g + y, 0)
        }, "state");
      }
      const m = u.reduce((T, S) => T + S, 0) - c;
      if (this.state.hasAnacrusis = i, this.state.macrobeatGroupings = [...u], this.state.macrobeatBoundaryStyles = [...d], Ts(this.state, e), m !== 0) {
        const T = [];
        this.state.placedNotes.forEach((y) => {
          const v = t(this.state, y.startColumnIndex, a), _ = t(this.state, y.endColumnIndex, a);
          if (v === null || _ === null)
            return;
          const E = v + m, F = _ + m;
          if (E < 0) {
            T.push(y);
            return;
          }
          const P = s(this.state, E, u), I = s(this.state, F, u);
          if (P === null || I === null) {
            T.push(y);
            return;
          }
          y.startColumnIndex = P, y.endColumnIndex = I;
        }), T.forEach((y) => {
          const v = this.state.placedNotes.indexOf(y);
          v > -1 && this.state.placedNotes.splice(v, 1);
        });
        const S = [];
        this.state.sixteenthStampPlacements.forEach((y) => {
          const v = t(this.state, y.startColumn, a), _ = t(this.state, y.endColumn, a);
          if (v === null || _ === null)
            return;
          const E = v + m, F = _ + m;
          if (E < 0) {
            S.push(y);
            return;
          }
          const P = s(this.state, E, u), I = s(this.state, F, u);
          if (P === null || I === null) {
            S.push(y);
            return;
          }
          y.startColumn = P, y.endColumn = I;
        }), S.forEach((y) => {
          const v = this.state.sixteenthStampPlacements.indexOf(y);
          v > -1 && this.state.sixteenthStampPlacements.splice(v, 1);
        });
        const N = [];
        this.state.tripletStampPlacements && (this.state.tripletStampPlacements.forEach((y) => {
          const v = y.startTimeIndex + m;
          v < 0 ? N.push(y) : y.startTimeIndex = v;
        }), N.forEach((y) => {
          const v = this.state.tripletStampPlacements.indexOf(y);
          v > -1 && this.state.tripletStampPlacements.splice(v, 1);
        }));
        const M = [], g = i ? u.length - a.length : -(a.length - u.length);
        this.state.tempoModulationMarkers.forEach((y) => {
          const v = y.measureIndex + g;
          if (v < 0) {
            M.push(y);
            return;
          }
          y.measureIndex = v, y.columnIndex = null, y.xPosition = null, y.macrobeatIndex = null;
        }), M.forEach((y) => {
          const v = this.state.tempoModulationMarkers.indexOf(y);
          v > -1 && this.state.tempoModulationMarkers.splice(v, 1);
        });
      }
      this.emit("anacrusisChanged", i), this.emit("notesChanged"), this.emit("sixteenthStampPlacementsChanged"), this.emit("tripletStampPlacementsChanged"), this.emit("tempoModulationMarkersChanged"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    toggleMacrobeatGrouping(i) {
      if (i === void 0 || i < 0 || i >= this.state.macrobeatGroupings.length) {
        o("error", "rhythmActions", `Invalid index for toggleMacrobeatGrouping: ${i}`, null, "state");
        return;
      }
      const a = [...this.state.macrobeatGroupings], l = a[i], c = l === 2 ? 3 : 2, u = c - l, d = [...a];
      d[i] = c;
      const f = r(this.state, i, a), m = [];
      this.state.placedNotes.forEach((h) => {
        const p = t(this.state, h.startColumnIndex, a), C = t(this.state, h.endColumnIndex, a);
        if (!(p === null || C === null) && p >= f) {
          const T = p + u, S = C + u, N = s(this.state, T, d), M = s(this.state, S, d);
          N !== null && M !== null ? (h.startColumnIndex = N, h.endColumnIndex = M) : m.push(h);
        }
      }), m.length && m.forEach((h) => {
        const p = this.state.placedNotes.indexOf(h);
        p > -1 && this.state.placedNotes.splice(p, 1);
      }), this.state.macrobeatGroupings = d, Ts(this.state, e), this.emit("notesChanged"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    cycleMacrobeatBoundaryStyle(i) {
      if (i === void 0 || i < 0 || i >= this.state.macrobeatBoundaryStyles.length) {
        o("error", "rhythmActions", `Invalid index for cycleMacrobeatBoundaryStyle: ${i}`, null, "state");
        return;
      }
      const a = this._isBoundaryInAnacrusis(i);
      let l;
      a ? l = ["dashed", "solid", "anacrusis"] : l = ["dashed", "solid"];
      const c = this.state.macrobeatBoundaryStyles[i] ?? "dashed", u = l.indexOf(c), d = u === -1 ? 0 : (u + 1) % l.length, f = l[d] ?? "dashed";
      this.state.macrobeatBoundaryStyles[i] = f, this.emit("rhythmStructureChanged"), this.recordState();
    },
    _isBoundaryInAnacrusis(i) {
      if (!this.state.hasAnacrusis)
        return !1;
      for (let a = 0; a <= i; a++)
        if (this.state.macrobeatBoundaryStyles[a] === "solid")
          return a === i;
      return !0;
    },
    increaseMacrobeatCount() {
      this.state.macrobeatGroupings.push(2), this.state.macrobeatBoundaryStyles.push("dashed"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    decreaseMacrobeatCount() {
      if (this.state.macrobeatGroupings.length > 1) {
        const i = this.state.macrobeatGroupings.length - 1, a = r(
          this.state,
          i - 1,
          this.state.macrobeatGroupings
        ), l = [];
        this.state.placedNotes.forEach((d) => {
          const f = t(this.state, d.startColumnIndex, this.state.macrobeatGroupings);
          f !== null && f >= a && l.push(d);
        }), l.forEach((d) => {
          const f = this.state.placedNotes.indexOf(d);
          f > -1 && this.state.placedNotes.splice(f, 1);
        });
        const c = [];
        this.state.sixteenthStampPlacements.forEach((d) => {
          const f = t(this.state, d.startColumn, this.state.macrobeatGroupings);
          f !== null && f >= a && c.push(d);
        }), c.forEach((d) => {
          const f = this.state.sixteenthStampPlacements.indexOf(d);
          f > -1 && this.state.sixteenthStampPlacements.splice(f, 1);
        });
        const u = [];
        this.state.tripletStampPlacements && (this.state.tripletStampPlacements.forEach((d) => {
          d.startTimeIndex >= a && u.push(d);
        }), u.forEach((d) => {
          const f = this.state.tripletStampPlacements.indexOf(d);
          f > -1 && this.state.tripletStampPlacements.splice(f, 1);
        })), this.state.macrobeatGroupings.pop(), this.state.macrobeatBoundaryStyles.pop(), l.length > 0 && this.emit("notesChanged"), c.length > 0 && this.emit("sixteenthStampPlacementsChanged"), u.length > 0 && this.emit("tripletStampPlacementsChanged"), this.emit("rhythmStructureChanged"), this.recordState();
      }
    },
    updateTimeSignature(i, a) {
      if (!Array.isArray(a) || a.length === 0) {
        o("error", "rhythmActions", "Invalid groupings provided to updateTimeSignature", null, "state");
        return;
      }
      let l = 0, c = 0, u = 0;
      for (let N = 0; N < this.state.macrobeatGroupings.length; N++) {
        if (u === i) {
          l = N;
          break;
        }
        const M = N === this.state.macrobeatGroupings.length - 1;
        (this.state.macrobeatBoundaryStyles[N] === "solid" || M) && u++;
      }
      u = 0;
      for (let N = 0; N < this.state.macrobeatGroupings.length; N++)
        if (u === i) {
          const M = N === this.state.macrobeatGroupings.length - 1;
          if (this.state.macrobeatBoundaryStyles[N] === "solid" || M) {
            c = N;
            break;
          }
        } else if (u < i) {
          const M = N === this.state.macrobeatGroupings.length - 1;
          (this.state.macrobeatBoundaryStyles[N] === "solid" || M) && u++;
        }
      const d = c - l + 1, f = a.length, m = this.state.macrobeatGroupings.slice(l, c + 1).reduce((N, M) => N + M, 0), p = a.reduce((N, M) => N + M, 0) - m, C = r(this.state, c, this.state.macrobeatGroupings);
      if (p !== 0) {
        const N = (() => {
          const g = [...this.state.macrobeatGroupings];
          return g.splice(l, d, ...a), g;
        })(), M = [];
        this.state.placedNotes.forEach((g) => {
          const y = t(this.state, g.startColumnIndex, this.state.macrobeatGroupings), v = t(this.state, g.endColumnIndex, this.state.macrobeatGroupings);
          if (!(y === null || v === null) && y >= C) {
            const _ = y + p, E = v + p, F = s(this.state, _, N), P = s(this.state, E, N);
            F !== null && P !== null ? (g.startColumnIndex = F, g.endColumnIndex = P) : M.push(g);
          }
        }), M.length && M.forEach((g) => {
          const y = this.state.placedNotes.indexOf(g);
          y > -1 && this.state.placedNotes.splice(y, 1);
        });
      }
      const T = [...a], S = new Array(Math.max(f - 1, 0)).fill("dashed");
      if (c < this.state.macrobeatBoundaryStyles.length) {
        const N = this.state.macrobeatBoundaryStyles[c] ?? "dashed";
        S.push(N);
      }
      this.state.macrobeatGroupings.splice(l, d, ...T), this.state.macrobeatBoundaryStyles.splice(l, d - 1, ...S), this.emit("notesChanged"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    addModulationMarker(i, a, l = null, c = null, u = null) {
      if (!Object.values(it).includes(a))
        return o("error", "rhythmActions", `Invalid modulation ratio: ${a}`, null, "state"), null;
      const d = this.state.tempoModulationMarkers.findIndex((m) => m.measureIndex === i || u !== null && m.macrobeatIndex === u || c !== null && m.columnIndex === c);
      if (d !== -1) {
        const m = this.state.tempoModulationMarkers[d];
        return o("info", "rhythmActions", `Replacing existing modulation marker ${m.id} at measure ${i} (old ratio: ${m.ratio}, new ratio: ${a})`, null, "state"), m.ratio = a, m.xPosition = l, c !== null && (m.columnIndex = c), u !== null && (m.macrobeatIndex = u), this.emit("tempoModulationMarkersChanged"), this.recordState(), m.id;
      }
      const f = So(i, a, l, c, u);
      return this.state.tempoModulationMarkers.push(f), this.state.tempoModulationMarkers.sort((m, h) => m.measureIndex - h.measureIndex), this.emit("tempoModulationMarkersChanged"), this.recordState(), o("info", "rhythmActions", `Added modulation marker ${f.id} at measure ${i} with ratio=${a}, columnIndex=${c}`, null, "state"), f.id;
    },
    removeModulationMarker(i) {
      const a = this.state.tempoModulationMarkers.findIndex((l) => l.id === i);
      if (a === -1) {
        o("warn", "rhythmActions", `Modulation marker not found: ${i}`, null, "state");
        return;
      }
      this.state.tempoModulationMarkers.splice(a, 1), this.emit("tempoModulationMarkersChanged"), this.recordState(), o("info", "rhythmActions", `Removed modulation marker ${i}`, null, "state");
    },
    setModulationRatio(i, a) {
      if (!Object.values(it).includes(a)) {
        o("error", "rhythmActions", `Invalid modulation ratio: ${a}`, null, "state");
        return;
      }
      const l = this.state.tempoModulationMarkers.find((c) => c.id === i);
      if (!l) {
        o("warn", "rhythmActions", `Modulation marker not found: ${i}`, null, "state");
        return;
      }
      l.ratio = a, this.emit("tempoModulationMarkersChanged"), this.recordState(), o("info", "rhythmActions", `Updated modulation marker ${i} ratio to ${a}`, null, "state");
    },
    moveModulationMarker(i, a) {
      const l = this.state.tempoModulationMarkers.find((c) => c.id === i);
      if (!l) {
        o("warn", "rhythmActions", `Modulation marker not found: ${i}`, null, "state");
        return;
      }
      l.measureIndex = a, this.state.tempoModulationMarkers.sort((c, u) => c.measureIndex - u.measureIndex), this.emit("tempoModulationMarkersChanged"), this.recordState(), o("info", "rhythmActions", `Moved modulation marker ${i} to measure ${a}`, null, "state");
    },
    toggleModulationMarker(i) {
      const a = this.state.tempoModulationMarkers.find((l) => l.id === i);
      if (!a) {
        o("warn", "rhythmActions", `Modulation marker not found: ${i}`, null, "state");
        return;
      }
      a.active = !a.active, this.emit("tempoModulationMarkersChanged"), this.recordState(), o("info", "rhythmActions", `Toggled modulation marker ${i} active state to ${a.active}`, null, "state");
    },
    clearModulationMarkers() {
      const i = this.state.tempoModulationMarkers.length;
      this.state.tempoModulationMarkers = [], this.emit("tempoModulationMarkersChanged"), this.recordState(), o("info", "rhythmActions", `Cleared ${i} modulation markers`, null, "state");
    }
  };
}
function Ns(n) {
  const e = JSON.parse(JSON.stringify(n));
  for (const t in e) {
    const s = e[t];
    s.coeffs && typeof s.coeffs == "object" && !Array.isArray(s.coeffs) ? s.coeffs = new Float32Array(Object.values(s.coeffs)) : Array.isArray(s.coeffs) && (s.coeffs = new Float32Array(s.coeffs)), s.phases && typeof s.phases == "object" && !Array.isArray(s.phases) ? s.phases = new Float32Array(Object.values(s.phases)) : Array.isArray(s.phases) && (s.phases = new Float32Array(s.phases));
  }
  return e;
}
const No = /* @__PURE__ */ new Set(["dashed", "solid", "anacrusis"]);
function wo(n) {
  return Array.isArray(n) && n.length > 0 && n.every((e) => e === 2 || e === 3);
}
function bo(n, e) {
  return Array.isArray(n) && n.length === Math.max(e - 1, 0) && n.every((t) => No.has(t));
}
function Ao(n, e) {
  if (n)
    try {
      const t = n.getItem(e);
      if (t === null)
        return;
      const s = JSON.parse(t), r = s.macrobeatGroupings;
      if (!wo(r)) {
        n.removeItem(e);
        return;
      }
      if (!bo(s.macrobeatBoundaryStyles, r.length)) {
        n.removeItem(e);
        return;
      }
      if (delete s.timbres, s.pitchRange) {
        const o = Ye.length, i = Math.max(0, o - 1), a = Math.max(0, Math.min(i, s.pitchRange.topIndex ?? 0)), l = Math.max(a, Math.min(i, s.pitchRange.bottomIndex ?? i));
        s.pitchRange = { topIndex: a, bottomIndex: l };
      }
      if ("playheadMode" in s) {
        const o = s.playheadMode;
        o !== "cursor" && o !== "microbeat" && o !== "macrobeat" && delete s.playheadMode;
      }
      return s.fullRowData = [...Ye], s;
    } catch {
      return;
    }
}
function Mo(n, e, t) {
  if (e)
    try {
      const s = JSON.parse(JSON.stringify({
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
      })), r = JSON.stringify(s);
      e.setItem(t, r);
    } catch {
    }
}
function Io(n = {}) {
  const {
    storageKey: e = "studentNotationState",
    storage: t,
    initialState: s,
    onClearState: r,
    noteActionCallbacks: o = {},
    sixteenthStampActionCallbacks: i = {},
    tripletStampActionCallbacks: a = {},
    rhythmActionCallbacks: l = {}
  } = n, c = {}, u = Ao(t, e), d = !u, h = {
    state: {
      ...uo(),
      ...u,
      ...s
    },
    isColdStart: d,
    on(p, C) {
      c[p] || (c[p] = []), c[p].push(C);
    },
    off(p, C) {
      if (c[p]) {
        const T = c[p].indexOf(C);
        T > -1 && c[p].splice(T, 1);
      }
    },
    emit(p, C) {
      c[p] && c[p].forEach((T) => {
        try {
          T(C);
        } catch (S) {
          console.error(`Error in listener for event "${p}"`, S);
        }
      });
    },
    dispose() {
      for (const p in c)
        delete c[p];
    },
    saveState() {
      Mo(h.state, t, e);
    },
    // ========== HISTORY ACTIONS ==========
    recordState() {
      h.state.history = h.state.history.slice(0, h.state.historyIndex + 1);
      const p = JSON.parse(JSON.stringify(h.state.timbres)), C = {
        notes: JSON.parse(JSON.stringify(h.state.placedNotes)),
        tonicSignGroups: JSON.parse(JSON.stringify(h.state.tonicSignGroups)),
        placedChords: JSON.parse(JSON.stringify(h.state.placedChords)),
        sixteenthStampPlacements: JSON.parse(JSON.stringify(h.state.sixteenthStampPlacements)),
        tripletStampPlacements: JSON.parse(JSON.stringify(h.state.tripletStampPlacements || [])),
        timbres: p,
        annotations: h.state.annotations ? JSON.parse(JSON.stringify(h.state.annotations)) : [],
        lassoSelection: JSON.parse(JSON.stringify(h.state.lassoSelection))
      };
      h.state.history.push(C), h.state.historyIndex++, h.emit("historyChanged"), h.saveState();
    },
    undo() {
      var p;
      if (h.state.historyIndex > 0) {
        h.state.historyIndex--;
        const C = h.state.history[h.state.historyIndex];
        if (!C) return;
        h.state.placedNotes = JSON.parse(JSON.stringify(C.notes)), h.state.tonicSignGroups = JSON.parse(JSON.stringify(C.tonicSignGroups)), h.state.sixteenthStampPlacements = JSON.parse(JSON.stringify(C.sixteenthStampPlacements || [])), h.state.tripletStampPlacements = JSON.parse(JSON.stringify(C.tripletStampPlacements || [])), h.state.timbres = Ns(C.timbres), h.state.annotations = C.annotations ? JSON.parse(JSON.stringify(C.annotations)) : [], h.emit("notesChanged"), h.emit("sixteenthStampPlacementsChanged"), h.emit("tripletStampPlacementsChanged"), h.emit("rhythmStructureChanged"), (p = h.state.selectedNote) != null && p.color && h.emit("timbreChanged", h.state.selectedNote.color), h.emit("annotationsChanged"), h.emit("historyChanged");
      }
    },
    redo() {
      var p;
      if (h.state.historyIndex < h.state.history.length - 1) {
        h.state.historyIndex++;
        const C = h.state.history[h.state.historyIndex];
        if (!C) return;
        h.state.placedNotes = JSON.parse(JSON.stringify(C.notes)), h.state.tonicSignGroups = JSON.parse(JSON.stringify(C.tonicSignGroups)), h.state.sixteenthStampPlacements = JSON.parse(JSON.stringify(C.sixteenthStampPlacements || [])), h.state.tripletStampPlacements = JSON.parse(JSON.stringify(C.tripletStampPlacements || [])), h.state.timbres = Ns(C.timbres), h.state.annotations = C.annotations ? JSON.parse(JSON.stringify(C.annotations)) : [], h.emit("notesChanged"), h.emit("sixteenthStampPlacementsChanged"), h.emit("tripletStampPlacementsChanged"), h.emit("rhythmStructureChanged"), (p = h.state.selectedNote) != null && p.color && h.emit("timbreChanged", h.state.selectedNote.color), h.emit("annotationsChanged"), h.emit("historyChanged");
      }
    },
    clearSavedState() {
      t && (t.removeItem(e), t.removeItem("effectDialValues")), r && r();
    },
    // ========== VIEW ACTIONS ==========
    setPlaybackState(p, C) {
      h.state.isPlaying = p, h.state.isPaused = C, h.emit("playbackStateChanged", { isPlaying: p, isPaused: C });
    },
    setLooping(p) {
      h.state.isLooping = p, h.emit("loopingChanged", p);
    },
    setTempo(p) {
      h.state.tempo = p, h.emit("tempoChanged", p);
    },
    setPlayheadMode(p) {
      h.state.playheadMode = p, h.emit("playheadModeChanged", p);
    },
    setSelectedTool(p, C) {
      const T = h.state.selectedTool;
      if (h.state.previousTool = T, h.state.selectedTool = p, C !== void 0) {
        const S = typeof C == "string" ? parseInt(C, 10) : C;
        isNaN(S) || (h.state.selectedToolTonicNumber = S);
      }
      h.emit("toolChanged", { newTool: p, oldTool: T });
    },
    setSelectedNote(p, C) {
      const T = { ...h.state.selectedNote };
      h.state.selectedNote = { shape: p, color: C }, h.emit("noteChanged", { newNote: h.state.selectedNote, oldNote: T });
    },
    setPitchRange(p) {
      h.state.pitchRange = { ...h.state.pitchRange, ...p }, h.emit("pitchRangeChanged", h.state.pitchRange);
    },
    setDegreeDisplayMode(p) {
      h.state.degreeDisplayMode = p, h.emit("degreeDisplayModeChanged", p);
    },
    setLongNoteStyle(p) {
      h.state.longNoteStyle = p, h.emit("longNoteStyleChanged", p);
    },
    toggleAccidentalMode(p) {
      h.state.accidentalMode[p] = !h.state.accidentalMode[p], h.emit("accidentalModeChanged", h.state.accidentalMode);
    },
    toggleFrequencyLabels() {
      h.state.showFrequencyLabels = !h.state.showFrequencyLabels, h.emit("frequencyLabelsChanged", h.state.showFrequencyLabels);
    },
    toggleOctaveLabels() {
      h.state.showOctaveLabels = !h.state.showOctaveLabels, h.emit("octaveLabelsChanged", h.state.showOctaveLabels);
    },
    toggleFocusColours() {
      h.state.focusColours = !h.state.focusColours, h.emit("focusColoursChanged", h.state.focusColours);
    },
    toggleWaveformExtendedView() {
      h.state.waveformExtendedView = !h.state.waveformExtendedView, h.emit("waveformExtendedViewChanged", h.state.waveformExtendedView);
    },
    setLayoutConfig(p) {
      p.cellWidth !== void 0 && (h.state.cellWidth = p.cellWidth), p.cellHeight !== void 0 && (h.state.cellHeight = p.cellHeight), p.columnWidths !== void 0 && (h.state.columnWidths = p.columnWidths), h.emit("layoutConfigChanged", p);
    },
    setDeviceProfile(p) {
      h.state.deviceProfile = { ...h.state.deviceProfile, ...p }, h.emit("deviceProfileChanged", h.state.deviceProfile);
    },
    setPrintPreviewActive(p) {
      h.state.isPrintPreviewActive = p, h.emit("printPreviewStateChanged", p);
    },
    setPrintOptions(p) {
      h.state.printOptions = { ...h.state.printOptions, ...p }, h.emit("printOptionsChanged", h.state.printOptions);
    },
    setAdsrTimeAxisScale(p) {
      h.state.adsrTimeAxisScale = p, h.emit("adsrTimeAxisScaleChanged", p);
    },
    setAdsrComponentWidth() {
    },
    shiftGridUp() {
    },
    shiftGridDown() {
    },
    setGridPosition() {
    },
    setKeySignature(p) {
      h.state.keySignature = p, h.emit("keySignatureChanged", p);
    },
    // ========== HARMONY ACTIONS ==========
    setActiveChordIntervals(p) {
      h.state.activeChordIntervals = p, h.emit("activeChordIntervalsChanged", p);
    },
    setIntervalsInversion(p) {
      h.state.isIntervalsInverted = p, h.emit("intervalsInversionChanged", p);
    },
    setChordPosition(p) {
      h.state.chordPositionState = p, h.emit("chordPositionChanged", p);
    },
    // ========== TIMBRE ACTIONS ==========
    setADSR(p, C) {
      h.state.timbres[p] && (h.state.timbres[p].adsr = { ...h.state.timbres[p].adsr, ...C }, h.emit("timbreChanged", p));
    },
    setHarmonicCoefficients(p, C) {
      h.state.timbres[p] && (h.state.timbres[p].coeffs = C, h.emit("timbreChanged", p));
    },
    setHarmonicPhases(p, C) {
      h.state.timbres[p] && (h.state.timbres[p].phases = C, h.emit("timbreChanged", p));
    },
    setFilterSettings(p, C) {
      h.state.timbres[p] && (h.state.timbres[p].filter = { ...h.state.timbres[p].filter, ...C }, h.emit("timbreChanged", p));
    },
    applyPreset(p, C) {
      h.state.timbres[p] && (Object.assign(h.state.timbres[p], C), h.emit("timbreChanged", p));
    },
    // ========== NOTE ACTIONS ==========
    // Extracted from note actions module
    ...ho(o),
    // ========== SIXTEENTH STAMP ACTIONS ==========
    // Extracted from sixteenth stamp actions module
    ...mo(i),
    // ========== TRIPLET STAMP ACTIONS ==========
    // Extracted from triplet stamp actions module
    ...go(a),
    // ========== RHYTHM ACTIONS ==========
    // Extracted from rhythm actions module
    ...To(l)
  };
  return t && (h.on("tempoChanged", () => h.saveState()), h.on("degreeDisplayModeChanged", () => h.saveState()), h.on("longNoteStyleChanged", () => h.saveState()), h.on("playheadModeChanged", () => h.saveState())), d && t && h.saveState(), h;
}
function Eo(n = {}) {
  const {
    getPlacedTonicSigns: e = () => [],
    sideColumnWidth: t = 0.25,
    beatColumnWidth: s = 1
  } = n;
  let r = null, o = null;
  function i(d) {
    const m = e(d).map((h) => `${h.columnIndex}:${h.preMacrobeatIndex}:${h.uuid || ""}`).sort().join("|");
    return {
      macrobeatGroupings: [...d.macrobeatGroupings],
      tonicSignsHash: m,
      macrobeatBoundaryStyles: [...d.macrobeatBoundaryStyles]
    };
  }
  function a(d) {
    return o ? o.tonicSignsHash === d.tonicSignsHash && JSON.stringify(o.macrobeatGroupings) === JSON.stringify(d.macrobeatGroupings) && JSON.stringify(o.macrobeatBoundaryStyles) === JSON.stringify(d.macrobeatBoundaryStyles) : !1;
  }
  function l(d) {
    const { macrobeatGroupings: f, macrobeatBoundaryStyles: m } = d, p = [...e(d)].sort((w, O) => w.preMacrobeatIndex - O.preMacrobeatIndex), C = [], T = [];
    let S = 0, N = 0, M = 0, g = 0, y = 0;
    const v = (w) => {
      var O;
      for (; y < p.length; ) {
        const b = p[y];
        if (!b || b.preMacrobeatIndex !== w) break;
        const A = b.uuid || "";
        for (let R = 0; R < 2; R++)
          C.push({
            visualIndex: S,
            canvasIndex: N,
            timeIndex: null,
            type: "tonic",
            widthMultiplier: s,
            xOffsetUnmodulated: g,
            macrobeatIndex: null,
            beatInMacrobeat: null,
            isMacrobeatStart: !1,
            isMacrobeatEnd: !1,
            isPlayable: !1,
            tonicSignUuid: R === 0 ? A : null
            // Only first column stores UUID
          }), S++, N++, g += s;
        const x = A;
        do
          y++;
        while (y < p.length && (((O = p[y]) == null ? void 0 : O.uuid) || "") === x);
      }
    };
    for (let w = 0; w < 2; w++)
      C.push({
        visualIndex: S,
        canvasIndex: null,
        timeIndex: null,
        type: "legend-left",
        widthMultiplier: t,
        xOffsetUnmodulated: g,
        macrobeatIndex: null,
        beatInMacrobeat: null,
        isMacrobeatStart: !1,
        isMacrobeatEnd: !1,
        isPlayable: !1,
        tonicSignUuid: null
      }), S++, g += t;
    v(-1), f.forEach((w, O) => {
      for (let A = 0; A < w; A++)
        C.push({
          visualIndex: S,
          canvasIndex: N,
          timeIndex: M,
          type: "beat",
          widthMultiplier: s,
          xOffsetUnmodulated: g,
          macrobeatIndex: O,
          beatInMacrobeat: A,
          isMacrobeatStart: A === 0,
          isMacrobeatEnd: A === w - 1,
          isPlayable: !0,
          tonicSignUuid: null
        }), S++, N++, M++, g += s;
      const b = m[O] || "dashed";
      T.push({
        macrobeatIndex: O,
        visualColumn: S - 1,
        canvasColumn: N - 1,
        timeColumn: M - 1,
        boundaryType: b,
        isMeasureStart: b === "solid"
      }), v(O);
    });
    for (let w = 0; w < 2; w++)
      C.push({
        visualIndex: S,
        canvasIndex: null,
        timeIndex: null,
        type: "legend-right",
        widthMultiplier: t,
        xOffsetUnmodulated: g,
        macrobeatIndex: null,
        beatInMacrobeat: null,
        isMacrobeatStart: !1,
        isMacrobeatEnd: !1,
        isPlayable: !1,
        tonicSignUuid: null
      }), S++, g += t;
    const _ = /* @__PURE__ */ new Map(), E = /* @__PURE__ */ new Map(), F = /* @__PURE__ */ new Map(), P = /* @__PURE__ */ new Map(), I = /* @__PURE__ */ new Map(), D = /* @__PURE__ */ new Map();
    return C.forEach((w) => {
      _.set(w.visualIndex, w.canvasIndex), E.set(w.visualIndex, w.timeIndex), w.canvasIndex !== null && (F.set(w.canvasIndex, w.visualIndex), P.set(w.canvasIndex, w.timeIndex)), w.timeIndex !== null && (w.canvasIndex !== null && I.set(w.timeIndex, w.canvasIndex), D.set(w.timeIndex, w.visualIndex));
    }), {
      entries: C,
      visualToCanvas: _,
      visualToTime: E,
      canvasToVisual: F,
      canvasToTime: P,
      timeToCanvas: I,
      timeToVisual: D,
      macrobeatBoundaries: T,
      totalVisualColumns: S,
      totalCanvasColumns: N,
      totalTimeColumns: M,
      totalWidthUnmodulated: g
    };
  }
  function c(d) {
    const f = i(d);
    return r && a(f) || (r = l(d), o = f), r;
  }
  function u() {
    r = null, o = null;
  }
  return {
    getColumnMap: c,
    invalidate: u,
    buildColumnMap: l
  };
}
function rh(n, e) {
  return e.visualToCanvas.get(n) ?? null;
}
function Po(n, e) {
  return e.visualToTime.get(n) ?? null;
}
function oh(n, e) {
  const t = e.canvasToVisual.get(n);
  return t !== void 0 ? t : n + 2;
}
function ih(n, e) {
  return e.canvasToTime.get(n) ?? null;
}
function ah(n, e) {
  const t = e.timeToCanvas.get(n);
  return t !== void 0 ? t : n;
}
function Oo(n, e) {
  const t = e.timeToVisual.get(n);
  return t !== void 0 ? t : n + 2;
}
function xo(n, e) {
  if (n == null) return 0;
  let t = 0;
  for (let s = 0; s <= n && s < e.length; s++) {
    const r = e[s];
    typeof r == "number" && (t += r);
  }
  return t;
}
function ch(n, e) {
  return e.entries[n] || null;
}
function Js(n, e) {
  const t = e.canvasToVisual.get(n);
  return t !== void 0 && e.entries[t] || null;
}
function lh(n, e) {
  const t = Js(n, e);
  return (t == null ? void 0 : t.isPlayable) ?? !1;
}
function uh(n, e) {
  const t = Js(n, e);
  return (t == null ? void 0 : t.type) ?? null;
}
function dh(n, e) {
  return e.macrobeatBoundaries.find((t) => t.macrobeatIndex === n) || null;
}
function hh(n) {
  const e = [];
  for (const t of n.entries)
    t.canvasIndex !== null && (e[t.canvasIndex] = t.widthMultiplier);
  return e;
}
function fh(n) {
  let e = 0;
  for (const t of n.entries)
    t.canvasIndex !== null && (e += t.widthMultiplier);
  return e;
}
function mh() {
  let n = !1, e = null, t = null, s = null, r = null, o = !1;
  const i = (c, u, d, f, m) => {
    if (!o && c === "debug") return;
    const h = `[engine:${u}]`;
    console[c](h, d, f || "");
  }, a = (c, u, d) => {
    i(c, "controller", u, d);
  };
  return {
    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    init(c) {
      if (n) {
        i("warn", "controller", "Engine already initialized");
        return;
      }
      o = c.debug || !1, i("info", "controller", "Initializing engine"), s = c.pitchGridContext || null, r = c.drumGridContext || null, t = Eo({
        getPlacedTonicSigns: (d) => {
          if (!e) return [];
          const f = [];
          for (const m of Object.values(d.tonicSignGroups || {}))
            f.push(...m);
          return f;
        }
      });
      let u = c.storage;
      !u && typeof window < "u" && window.localStorage && (u = window.localStorage), e = Io({
        storageKey: c.storageKey || "studentNotationState",
        storage: u,
        initialState: c.initialState,
        noteActionCallbacks: {
          log: a
        },
        rhythmActionCallbacks: {
          getColumnMap: (d) => t.getColumnMap(d),
          visualToTimeIndex: (d, f, m) => Po(f, t.getColumnMap(d)),
          timeIndexToVisualColumn: (d, f, m) => Oo(f, t.getColumnMap(d)),
          getTimeBoundaryAfterMacrobeat: (d, f, m) => xo(f, m),
          log: a
        },
        sixteenthStampActionCallbacks: {
          log: a
        },
        tripletStampActionCallbacks: {
          canvasToTime: (d, f) => f.canvasToTime.get(d) ?? null,
          timeToCanvas: (d, f) => f.timeToCanvas.get(d) ?? 0,
          getColumnMap: (d) => t.getColumnMap(d),
          log: a
        }
      }), e.on("rhythmStructureChanged", () => {
        t == null || t.invalidate();
      }), e.on("notesChanged", () => {
        this.renderPitchGrid();
      }), e.on("sixteenthStampPlacementsChanged", () => {
        this.renderDrumGrid();
      }), e.on("tripletStampPlacementsChanged", () => {
        this.renderDrumGrid();
      }), n = !0, i("info", "controller", "Engine initialized successfully"), (s || r) && this.render();
    },
    dispose() {
      n && (i("info", "controller", "Disposing engine"), e && (e.dispose(), e = null), t = null, s = null, r = null, n = !1);
    },
    isInitialized() {
      return n;
    },
    // ============================================================================
    // TOOL SELECTION
    // ============================================================================
    setTool(c) {
      e && e.setSelectedTool(c);
    },
    getTool() {
      return (e == null ? void 0 : e.state.selectedTool) || "note";
    },
    setNoteShape(c) {
      if (!e) return;
      const u = e.state.selectedNote.color;
      e.setSelectedNote(c, u);
    },
    setNoteColor(c) {
      if (!e) return;
      const u = e.state.selectedNote.shape;
      e.setSelectedNote(u, c);
    },
    // ============================================================================
    // NOTE MANIPULATION
    // ============================================================================
    insertNote(c, u, d) {
      if (!e) return null;
      const f = {
        row: c,
        startColumnIndex: u,
        endColumnIndex: d ?? u,
        shape: e.state.selectedNote.shape,
        color: e.state.selectedNote.color
      };
      return e.addNote(f);
    },
    deleteNote(c) {
      if (!e) return !1;
      const u = e.state.placedNotes.find((d) => d.uuid === c);
      return u ? (e.removeNote(u), !0) : !1;
    },
    deleteSelection() {
      if (!e) return;
      const c = e.state.lassoSelection;
      if (!c.isActive || c.selectedItems.length === 0) return;
      const u = c.selectedItems.filter((d) => d.type === "note").map((d) => e.state.placedNotes.find((f) => f.uuid === d.id)).filter((d) => d !== void 0);
      u.length > 0 && e.removeMultipleNotes(u), this.clearSelection();
    },
    moveNote(c, u, d) {
      if (!e) return;
      const f = e.state.placedNotes.find((m) => m.uuid === c);
      f && (e.updateNoteRow(f, u), e.updateNotePosition(f, d));
    },
    setNoteTail(c, u) {
      if (!e) return;
      const d = e.state.placedNotes.find((f) => f.uuid === c);
      d && e.updateNoteTail(d, u);
    },
    clearAllNotes() {
      e && e.clearAllNotes();
    },
    // ============================================================================
    // SELECTION
    // ============================================================================
    setSelection(c) {
      if (!e) return;
      const u = c.map((d) => {
        if (d.type === "note") {
          const f = e.state.placedNotes.find((m) => m.uuid === d.id);
          return f ? { type: "note", id: d.id, data: f } : null;
        } else if (d.type === "sixteenthStamp") {
          const f = e.state.sixteenthStampPlacements.find((m) => m.id === d.id);
          return f ? { type: "sixteenthStamp", id: d.id, data: f } : null;
        } else if (d.type === "tripletStamp") {
          const f = e.state.tripletStampPlacements.find((m) => m.id === d.id);
          return f ? { type: "tripletStamp", id: d.id, data: f } : null;
        }
        return null;
      }).filter((d) => d !== null);
      e.state.lassoSelection = {
        isActive: u.length > 0,
        selectedItems: u,
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
      const c = e.state.placedNotes.map((u) => ({
        type: "note",
        id: u.uuid,
        data: u
      }));
      e.state.lassoSelection = {
        isActive: c.length > 0,
        selectedItems: c,
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
      e && (e.setPlaybackState(!0, !1), i("info", "playback", "Play started"));
    },
    pause() {
      e && (e.setPlaybackState(!0, !0), i("info", "playback", "Paused"));
    },
    resume() {
      e && (e.setPlaybackState(!0, !1), i("info", "playback", "Resumed"));
    },
    stop() {
      e && (e.setPlaybackState(!1, !1), i("info", "playback", "Stopped"));
    },
    isPlaying() {
      return (e == null ? void 0 : e.state.isPlaying) || !1;
    },
    isPaused() {
      return (e == null ? void 0 : e.state.isPaused) || !1;
    },
    setTempo(c) {
      e && e.setTempo(c);
    },
    getTempo() {
      return (e == null ? void 0 : e.state.tempo) || 120;
    },
    setLooping(c) {
      e && e.setLooping(c);
    },
    isLooping() {
      return (e == null ? void 0 : e.state.isLooping) || !1;
    },
    setPlayheadMode(c) {
      e && e.setPlayheadMode(c);
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
    setMacrobeatGrouping(c, u) {
      if (!e) return;
      e.state.macrobeatGroupings[c] !== u && e.toggleMacrobeatGrouping(c);
    },
    toggleAnacrusis() {
      e && e.setAnacrusis(!e.state.hasAnacrusis);
    },
    addModulationMarker(c, u) {
      return e ? e.addModulationMarker(c, u) : null;
    },
    removeModulationMarker(c) {
      e && e.removeModulationMarker(c);
    },
    // ============================================================================
    // VIEW
    // ============================================================================
    setPitchRange(c, u) {
      e && e.setPitchRange({ topIndex: c, bottomIndex: u });
    },
    getPitchRange() {
      return (e == null ? void 0 : e.state.pitchRange) || { topIndex: 0, bottomIndex: 87 };
    },
    setDegreeDisplayMode(c) {
      e && e.setDegreeDisplayMode(c);
    },
    setLongNoteStyle(c) {
      e && e.setLongNoteStyle(c);
    },
    // ============================================================================
    // TIMBRE
    // ============================================================================
    setTimbreADSR(c, u) {
      e && e.setADSR(c, u);
    },
    setTimbreHarmonics(c, u) {
      e && e.setHarmonicCoefficients(c, new Float32Array(u));
    },
    setTimbreFilter(c, u) {
      e && e.setFilterSettings(c, u);
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
    getNoteAt(c, u) {
      return e && e.state.placedNotes.find(
        (d) => d.row === c && d.startColumnIndex <= u && d.endColumnIndex >= u
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
      const c = "uuid,row,startColumn,endColumn,color,shape", u = e.state.placedNotes.map(
        (d) => `${d.uuid},${d.row},${d.startColumnIndex},${d.endColumnIndex},${d.color},${d.shape}`
      );
      return [c, ...u].join(`
`);
    },
    importCSV(c) {
      if (!e) return;
      const u = c.split(`
`).filter((m) => m.trim());
      if (u.length === 0) return;
      const f = u.slice(1).map((m) => {
        const [h, p, C, T, S, N] = m.split(",");
        return {
          uuid: h,
          row: parseInt(p || "0", 10),
          startColumnIndex: parseInt(C || "0", 10),
          endColumnIndex: parseInt(T || "0", 10),
          color: S || "blue",
          shape: N || "circle"
        };
      });
      e.loadNotes(f);
    },
    exportState() {
      return e ? JSON.stringify(e.state, null, 2) : "{}";
    },
    importState(c) {
      if (e)
        try {
          const u = JSON.parse(c);
          Object.assign(e.state, u), e.emit("stateImported", u), this.render();
        } catch (u) {
          i("error", "import", "Failed to import state", u);
        }
    },
    // ============================================================================
    // EVENTS
    // ============================================================================
    on(c, u) {
      e && e.on(c, u);
    },
    off(c, u) {
      e && e.off(c, u);
    },
    // ============================================================================
    // RENDERING
    // ============================================================================
    render() {
      this.renderPitchGrid(), this.renderDrumGrid();
    },
    renderPitchGrid() {
      !s || !e || !t || i("debug", "controller", "renderPitchGrid called - canvas rendering not yet wired");
    },
    renderDrumGrid() {
      !r || !e || !t || i("debug", "controller", "renderDrumGrid called - canvas rendering not yet wired");
    }
  };
}
function ph(n) {
  throw new Error("Not yet implemented - will be in @mlt/tutorial-runtime package");
}
function Do(n, e, t, s) {
  var r = arguments.length, o = r < 3 ? e : s === null ? s = Object.getOwnPropertyDescriptor(e, t) : s, i;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") o = Reflect.decorate(n, e, t, s);
  else for (var a = n.length - 1; a >= 0; a--) (i = n[a]) && (o = (r < 3 ? i(o) : r > 3 ? i(e, t, o) : i(e, t)) || o);
  return r > 3 && o && Object.defineProperty(e, t, o), o;
}
function Ie(n, e, t, s) {
  function r(o) {
    return o instanceof t ? o : new t(function(i) {
      i(o);
    });
  }
  return new (t || (t = Promise))(function(o, i) {
    function a(u) {
      try {
        c(s.next(u));
      } catch (d) {
        i(d);
      }
    }
    function l(u) {
      try {
        c(s.throw(u));
      } catch (d) {
        i(d);
      }
    }
    function c(u) {
      u.done ? o(u.value) : r(u.value).then(a, l);
    }
    c((s = s.apply(n, e || [])).next());
  });
}
const Ys = "15.1.22", ws = (n, e, t) => ({ endTime: e, insertTime: t, type: "exponentialRampToValue", value: n }), bs = (n, e, t) => ({ endTime: e, insertTime: t, type: "linearRampToValue", value: n }), yn = (n, e) => ({ startTime: e, type: "setValue", value: n }), Zs = (n, e, t) => ({ duration: t, startTime: e, type: "setValueCurve", values: n }), Qs = (n, e, { startTime: t, target: s, timeConstant: r }) => s + (e - s) * Math.exp((t - n) / r), nt = (n) => n.type === "exponentialRampToValue", Gt = (n) => n.type === "linearRampToValue", Ge = (n) => nt(n) || Gt(n), En = (n) => n.type === "setValue", Re = (n) => n.type === "setValueCurve", qt = (n, e, t, s) => {
  const r = n[e];
  return r === void 0 ? s : Ge(r) || En(r) ? r.value : Re(r) ? r.values[r.values.length - 1] : Qs(t, qt(n, e - 1, r.startTime, s), r);
}, As = (n, e, t, s, r) => t === void 0 ? [s.insertTime, r] : Ge(t) ? [t.endTime, t.value] : En(t) ? [t.startTime, t.value] : Re(t) ? [
  t.startTime + t.duration,
  t.values[t.values.length - 1]
] : [
  t.startTime,
  qt(n, e - 1, t.startTime, r)
], Sn = (n) => n.type === "cancelAndHold", Cn = (n) => n.type === "cancelScheduledValues", We = (n) => Sn(n) || Cn(n) ? n.cancelTime : nt(n) || Gt(n) ? n.endTime : n.startTime, Ms = (n, e, t, { endTime: s, value: r }) => t === r ? r : 0 < t && 0 < r || t < 0 && r < 0 ? t * (r / t) ** ((n - e) / (s - e)) : 0, Is = (n, e, t, { endTime: s, value: r }) => t + (n - e) / (s - e) * (r - t), Ro = (n, e) => {
  const t = Math.floor(e), s = Math.ceil(e);
  return t === s ? n[t] : (1 - (e - t)) * n[t] + (1 - (s - e)) * n[s];
}, Fo = (n, { duration: e, startTime: t, values: s }) => {
  const r = (n - t) / e * (s.length - 1);
  return Ro(s, r);
}, Ft = (n) => n.type === "setTarget";
class ko {
  constructor(e) {
    this._automationEvents = [], this._currenTime = 0, this._defaultValue = e;
  }
  [Symbol.iterator]() {
    return this._automationEvents[Symbol.iterator]();
  }
  add(e) {
    const t = We(e);
    if (Sn(e) || Cn(e)) {
      const s = this._automationEvents.findIndex((o) => Cn(e) && Re(o) ? o.startTime + o.duration >= t : We(o) >= t), r = this._automationEvents[s];
      if (s !== -1 && (this._automationEvents = this._automationEvents.slice(0, s)), Sn(e)) {
        const o = this._automationEvents[this._automationEvents.length - 1];
        if (r !== void 0 && Ge(r)) {
          if (o !== void 0 && Ft(o))
            throw new Error("The internal list is malformed.");
          const i = o === void 0 ? r.insertTime : Re(o) ? o.startTime + o.duration : We(o), a = o === void 0 ? this._defaultValue : Re(o) ? o.values[o.values.length - 1] : o.value, l = nt(r) ? Ms(t, i, a, r) : Is(t, i, a, r), c = nt(r) ? ws(l, t, this._currenTime) : bs(l, t, this._currenTime);
          this._automationEvents.push(c);
        }
        if (o !== void 0 && Ft(o) && this._automationEvents.push(yn(this.getValue(t), t)), o !== void 0 && Re(o) && o.startTime + o.duration > t) {
          const i = t - o.startTime, a = (o.values.length - 1) / o.duration, l = Math.max(2, 1 + Math.ceil(i * a)), c = i / (l - 1) * a, u = o.values.slice(0, l);
          if (c < 1)
            for (let d = 1; d < l; d += 1) {
              const f = c * d % 1;
              u[d] = o.values[d - 1] * (1 - f) + o.values[d] * f;
            }
          this._automationEvents[this._automationEvents.length - 1] = Zs(u, o.startTime, i);
        }
      }
    } else {
      const s = this._automationEvents.findIndex((i) => We(i) > t), r = s === -1 ? this._automationEvents[this._automationEvents.length - 1] : this._automationEvents[s - 1];
      if (r !== void 0 && Re(r) && We(r) + r.duration > t)
        return !1;
      const o = nt(e) ? ws(e.value, e.endTime, this._currenTime) : Gt(e) ? bs(e.value, t, this._currenTime) : e;
      if (s === -1)
        this._automationEvents.push(o);
      else {
        if (Re(e) && t + e.duration > We(this._automationEvents[s]))
          return !1;
        this._automationEvents.splice(s, 0, o);
      }
    }
    return !0;
  }
  flush(e) {
    const t = this._automationEvents.findIndex((s) => We(s) > e);
    if (t > 1) {
      const s = this._automationEvents.slice(t - 1), r = s[0];
      Ft(r) && s.unshift(yn(qt(this._automationEvents, t - 2, r.startTime, this._defaultValue), r.startTime)), this._automationEvents = s;
    }
  }
  getValue(e) {
    if (this._automationEvents.length === 0)
      return this._defaultValue;
    const t = this._automationEvents.findIndex((i) => We(i) > e), s = this._automationEvents[t], r = (t === -1 ? this._automationEvents.length : t) - 1, o = this._automationEvents[r];
    if (o !== void 0 && Ft(o) && (s === void 0 || !Ge(s) || s.insertTime > e))
      return Qs(e, qt(this._automationEvents, r - 1, o.startTime, this._defaultValue), o);
    if (o !== void 0 && En(o) && (s === void 0 || !Ge(s)))
      return o.value;
    if (o !== void 0 && Re(o) && (s === void 0 || !Ge(s) || o.startTime + o.duration > e))
      return e < o.startTime + o.duration ? Fo(e, o) : o.values[o.values.length - 1];
    if (o !== void 0 && Ge(o) && (s === void 0 || !Ge(s)))
      return o.value;
    if (s !== void 0 && nt(s)) {
      const [i, a] = As(this._automationEvents, r, o, s, this._defaultValue);
      return Ms(e, i, a, s);
    }
    if (s !== void 0 && Gt(s)) {
      const [i, a] = As(this._automationEvents, r, o, s, this._defaultValue);
      return Is(e, i, a, s);
    }
    return this._defaultValue;
  }
}
const Bo = (n) => ({ cancelTime: n, type: "cancelAndHold" }), Lo = (n) => ({ cancelTime: n, type: "cancelScheduledValues" }), Vo = (n, e) => ({ endTime: e, type: "exponentialRampToValue", value: n }), Wo = (n, e) => ({ endTime: e, type: "linearRampToValue", value: n }), Go = (n, e, t) => ({ startTime: e, target: n, timeConstant: t, type: "setTarget" }), qo = () => new DOMException("", "AbortError"), $o = (n) => (e, t, [s, r, o], i) => {
  n(e[r], [t, s, o], (a) => a[0] === t && a[1] === s, i);
}, Uo = (n) => (e, t, s) => {
  const r = [];
  for (let o = 0; o < s.numberOfInputs; o += 1)
    r.push(/* @__PURE__ */ new Set());
  n.set(e, {
    activeInputs: r,
    outputs: /* @__PURE__ */ new Set(),
    passiveInputs: /* @__PURE__ */ new WeakMap(),
    renderer: t
  });
}, Ho = (n) => (e, t) => {
  n.set(e, { activeInputs: /* @__PURE__ */ new Set(), passiveInputs: /* @__PURE__ */ new WeakMap(), renderer: t });
}, at = /* @__PURE__ */ new WeakSet(), Ks = /* @__PURE__ */ new WeakMap(), Pn = /* @__PURE__ */ new WeakMap(), er = /* @__PURE__ */ new WeakMap(), On = /* @__PURE__ */ new WeakMap(), Qt = /* @__PURE__ */ new WeakMap(), tr = /* @__PURE__ */ new WeakMap(), vn = /* @__PURE__ */ new WeakMap(), _n = /* @__PURE__ */ new WeakMap(), Tn = /* @__PURE__ */ new WeakMap(), nr = {
  construct() {
    return nr;
  }
}, jo = (n) => {
  try {
    const e = new Proxy(n, nr);
    new e();
  } catch {
    return !1;
  }
  return !0;
}, Es = /^import(?:(?:[\s]+[\w]+|(?:[\s]+[\w]+[\s]*,)?[\s]*\{[\s]*[\w]+(?:[\s]+as[\s]+[\w]+)?(?:[\s]*,[\s]*[\w]+(?:[\s]+as[\s]+[\w]+)?)*[\s]*}|(?:[\s]+[\w]+[\s]*,)?[\s]*\*[\s]+as[\s]+[\w]+)[\s]+from)?(?:[\s]*)("([^"\\]|\\.)+"|'([^'\\]|\\.)+')(?:[\s]*);?/, Ps = (n, e) => {
  const t = [];
  let s = n.replace(/^[\s]+/, ""), r = s.match(Es);
  for (; r !== null; ) {
    const o = r[1].slice(1, -1), i = r[0].replace(/([\s]+)?;?$/, "").replace(o, new URL(o, e).toString());
    t.push(i), s = s.slice(r[0].length).replace(/^[\s]+/, ""), r = s.match(Es);
  }
  return [t.join(";"), s];
}, Os = (n) => {
  if (n !== void 0 && !Array.isArray(n))
    throw new TypeError("The parameterDescriptors property of given value for processorCtor is not an array.");
}, xs = (n) => {
  if (!jo(n))
    throw new TypeError("The given value for processorCtor should be a constructor.");
  if (n.prototype === null || typeof n.prototype != "object")
    throw new TypeError("The given value for processorCtor should have a prototype.");
}, zo = (n, e, t, s, r, o, i, a, l, c, u, d, f) => {
  let m = 0;
  return (h, p, C = { credentials: "omit" }) => {
    const T = u.get(h);
    if (T !== void 0 && T.has(p))
      return Promise.resolve();
    const S = c.get(h);
    if (S !== void 0) {
      const g = S.get(p);
      if (g !== void 0)
        return g;
    }
    const N = o(h), M = N.audioWorklet === void 0 ? r(p).then(([g, y]) => {
      const [v, _] = Ps(g, y), E = `${v};((a,b)=>{(a[b]=a[b]||[]).push((AudioWorkletProcessor,global,registerProcessor,sampleRate,self,window)=>{${_}
})})(window,'_AWGS')`;
      return t(E);
    }).then(() => {
      const g = f._AWGS.pop();
      if (g === void 0)
        throw new SyntaxError();
      s(N.currentTime, N.sampleRate, () => g(class {
      }, void 0, (y, v) => {
        if (y.trim() === "")
          throw e();
        const _ = _n.get(N);
        if (_ !== void 0) {
          if (_.has(y))
            throw e();
          xs(v), Os(v.parameterDescriptors), _.set(y, v);
        } else
          xs(v), Os(v.parameterDescriptors), _n.set(N, /* @__PURE__ */ new Map([[y, v]]));
      }, N.sampleRate, void 0, void 0));
    }) : Promise.all([
      r(p),
      Promise.resolve(n(d, d))
    ]).then(([[g, y], v]) => {
      const _ = m + 1;
      m = _;
      const [E, F] = Ps(g, y), w = `${E};((AudioWorkletProcessor,registerProcessor)=>{${F}
})(${v ? "AudioWorkletProcessor" : "class extends AudioWorkletProcessor {__b=new WeakSet();constructor(){super();(p=>p.postMessage=(q=>(m,t)=>q.call(p,m,t?t.filter(u=>!this.__b.has(u)):t))(p.postMessage))(this.port)}}"},(n,p)=>registerProcessor(n,class extends p{${v ? "" : "__c = (a) => a.forEach(e=>this.__b.add(e.buffer));"}process(i,o,p){${v ? "" : "i.forEach(this.__c);o.forEach(this.__c);this.__c(Object.values(p));"}return super.process(i.map(j=>j.some(k=>k.length===0)?[]:j),o,p)}}));registerProcessor('__sac${_}',class extends AudioWorkletProcessor{process(){return !1}})`, O = new Blob([w], { type: "application/javascript; charset=utf-8" }), b = URL.createObjectURL(O);
      return N.audioWorklet.addModule(b, C).then(() => {
        if (a(N))
          return N;
        const A = i(N);
        return A.audioWorklet.addModule(b, C).then(() => A);
      }).then((A) => {
        if (l === null)
          throw new SyntaxError();
        try {
          new l(A, `__sac${_}`);
        } catch {
          throw new SyntaxError();
        }
      }).finally(() => URL.revokeObjectURL(b));
    });
    return S === void 0 ? c.set(h, /* @__PURE__ */ new Map([[p, M]])) : S.set(p, M), M.then(() => {
      const g = u.get(h);
      g === void 0 ? u.set(h, /* @__PURE__ */ new Set([p])) : g.add(p);
    }).finally(() => {
      const g = c.get(h);
      g !== void 0 && g.delete(p);
    }), M;
  };
}, be = (n, e) => {
  const t = n.get(e);
  if (t === void 0)
    throw new Error("A value with the given key could not be found.");
  return t;
}, Kt = (n, e) => {
  const t = Array.from(n).filter(e);
  if (t.length > 1)
    throw Error("More than one element was found.");
  if (t.length === 0)
    throw Error("No element was found.");
  const [s] = t;
  return n.delete(s), s;
}, sr = (n, e, t, s) => {
  const r = be(n, e), o = Kt(r, (i) => i[0] === t && i[1] === s);
  return r.size === 0 && n.delete(e), o;
}, wt = (n) => be(tr, n), ct = (n) => {
  if (at.has(n))
    throw new Error("The AudioNode is already stored.");
  at.add(n), wt(n).forEach((e) => e(!0));
}, rr = (n) => "port" in n, bt = (n) => {
  if (!at.has(n))
    throw new Error("The AudioNode is not stored.");
  at.delete(n), wt(n).forEach((e) => e(!1));
}, Nn = (n, e) => {
  !rr(n) && e.every((t) => t.size === 0) && bt(n);
}, Xo = (n, e, t, s, r, o, i, a, l, c, u, d, f) => {
  const m = /* @__PURE__ */ new WeakMap();
  return (h, p, C, T, S) => {
    const { activeInputs: N, passiveInputs: M } = o(p), { outputs: g } = o(h), y = a(h), v = (_) => {
      const E = l(p), F = l(h);
      if (_) {
        const P = sr(M, h, C, T);
        n(N, h, P, !1), !S && !d(h) && t(F, E, C, T), f(p) && ct(p);
      } else {
        const P = s(N, h, C, T);
        e(M, T, P, !1), !S && !d(h) && r(F, E, C, T);
        const I = i(p);
        if (I === 0)
          u(p) && Nn(p, N);
        else {
          const D = m.get(p);
          D !== void 0 && clearTimeout(D), m.set(p, setTimeout(() => {
            u(p) && Nn(p, N);
          }, I * 1e3));
        }
      }
    };
    return c(g, [p, C, T], (_) => _[0] === p && _[1] === C && _[2] === T, !0) ? (y.add(v), u(h) ? n(N, h, [C, T, v], !0) : e(M, T, [h, C, v], !0), !0) : !1;
  };
}, Jo = (n) => (e, t, [s, r, o], i) => {
  const a = e.get(s);
  a === void 0 ? e.set(s, /* @__PURE__ */ new Set([[r, t, o]])) : n(a, [r, t, o], (l) => l[0] === r && l[1] === t, i);
}, Yo = (n) => (e, t) => {
  const s = n(e, {
    channelCount: 1,
    channelCountMode: "explicit",
    channelInterpretation: "discrete",
    gain: 0
  });
  t.connect(s).connect(e.destination);
  const r = () => {
    t.removeEventListener("ended", r), t.disconnect(s), s.disconnect();
  };
  t.addEventListener("ended", r);
}, Zo = (n) => (e, t) => {
  n(e).add(t);
}, Qo = {
  channelCount: 2,
  channelCountMode: "max",
  channelInterpretation: "speakers",
  fftSize: 2048,
  maxDecibels: -30,
  minDecibels: -100,
  smoothingTimeConstant: 0.8
}, Ko = (n, e, t, s, r, o) => class extends n {
  constructor(a, l) {
    const c = r(a), u = { ...Qo, ...l }, d = s(c, u), f = o(c) ? e() : null;
    super(a, !1, d, f), this._nativeAnalyserNode = d;
  }
  get fftSize() {
    return this._nativeAnalyserNode.fftSize;
  }
  set fftSize(a) {
    this._nativeAnalyserNode.fftSize = a;
  }
  get frequencyBinCount() {
    return this._nativeAnalyserNode.frequencyBinCount;
  }
  get maxDecibels() {
    return this._nativeAnalyserNode.maxDecibels;
  }
  set maxDecibels(a) {
    const l = this._nativeAnalyserNode.maxDecibels;
    if (this._nativeAnalyserNode.maxDecibels = a, !(a > this._nativeAnalyserNode.minDecibels))
      throw this._nativeAnalyserNode.maxDecibels = l, t();
  }
  get minDecibels() {
    return this._nativeAnalyserNode.minDecibels;
  }
  set minDecibels(a) {
    const l = this._nativeAnalyserNode.minDecibels;
    if (this._nativeAnalyserNode.minDecibels = a, !(this._nativeAnalyserNode.maxDecibels > a))
      throw this._nativeAnalyserNode.minDecibels = l, t();
  }
  get smoothingTimeConstant() {
    return this._nativeAnalyserNode.smoothingTimeConstant;
  }
  set smoothingTimeConstant(a) {
    this._nativeAnalyserNode.smoothingTimeConstant = a;
  }
  getByteFrequencyData(a) {
    this._nativeAnalyserNode.getByteFrequencyData(a);
  }
  getByteTimeDomainData(a) {
    this._nativeAnalyserNode.getByteTimeDomainData(a);
  }
  getFloatFrequencyData(a) {
    this._nativeAnalyserNode.getFloatFrequencyData(a);
  }
  getFloatTimeDomainData(a) {
    this._nativeAnalyserNode.getFloatTimeDomainData(a);
  }
}, me = (n, e) => n.context === e, ei = (n, e, t) => () => {
  const s = /* @__PURE__ */ new WeakMap(), r = async (o, i) => {
    let a = e(o);
    if (!me(a, i)) {
      const c = {
        channelCount: a.channelCount,
        channelCountMode: a.channelCountMode,
        channelInterpretation: a.channelInterpretation,
        fftSize: a.fftSize,
        maxDecibels: a.maxDecibels,
        minDecibels: a.minDecibels,
        smoothingTimeConstant: a.smoothingTimeConstant
      };
      a = n(i, c);
    }
    return s.set(i, a), await t(o, i, a), a;
  };
  return {
    render(o, i) {
      const a = s.get(i);
      return a !== void 0 ? Promise.resolve(a) : r(o, i);
    }
  };
}, $t = (n) => {
  try {
    n.copyToChannel(new Float32Array(1), 0, -1);
  } catch {
    return !1;
  }
  return !0;
}, Pe = () => new DOMException("", "IndexSizeError"), xn = (n) => {
  n.getChannelData = /* @__PURE__ */ ((e) => (t) => {
    try {
      return e.call(n, t);
    } catch (s) {
      throw s.code === 12 ? Pe() : s;
    }
  })(n.getChannelData);
}, ti = {
  numberOfChannels: 1
}, ni = (n, e, t, s, r, o, i, a) => {
  let l = null;
  return class or {
    constructor(u) {
      if (r === null)
        throw new Error("Missing the native OfflineAudioContext constructor.");
      const { length: d, numberOfChannels: f, sampleRate: m } = { ...ti, ...u };
      l === null && (l = new r(1, 1, 44100));
      const h = s !== null && e(o, o) ? new s({ length: d, numberOfChannels: f, sampleRate: m }) : l.createBuffer(f, d, m);
      if (h.numberOfChannels === 0)
        throw t();
      return typeof h.copyFromChannel != "function" ? (i(h), xn(h)) : e($t, () => $t(h)) || a(h), n.add(h), h;
    }
    static [Symbol.hasInstance](u) {
      return u !== null && typeof u == "object" && Object.getPrototypeOf(u) === or.prototype || n.has(u);
    }
  };
}, ve = -34028234663852886e22, ge = -ve, ke = (n) => at.has(n), si = {
  buffer: null,
  channelCount: 2,
  channelCountMode: "max",
  channelInterpretation: "speakers",
  // Bug #149: Safari does not yet support the detune AudioParam.
  loop: !1,
  loopEnd: 0,
  loopStart: 0,
  playbackRate: 1
}, ri = (n, e, t, s, r, o, i, a) => class extends n {
  constructor(c, u) {
    const d = o(c), f = { ...si, ...u }, m = r(d, f), h = i(d), p = h ? e() : null;
    super(c, !1, m, p), this._audioBufferSourceNodeRenderer = p, this._isBufferNullified = !1, this._isBufferSet = f.buffer !== null, this._nativeAudioBufferSourceNode = m, this._onended = null, this._playbackRate = t(this, h, m.playbackRate, ge, ve);
  }
  get buffer() {
    return this._isBufferNullified ? null : this._nativeAudioBufferSourceNode.buffer;
  }
  set buffer(c) {
    if (this._nativeAudioBufferSourceNode.buffer = c, c !== null) {
      if (this._isBufferSet)
        throw s();
      this._isBufferSet = !0;
    }
  }
  get loop() {
    return this._nativeAudioBufferSourceNode.loop;
  }
  set loop(c) {
    this._nativeAudioBufferSourceNode.loop = c;
  }
  get loopEnd() {
    return this._nativeAudioBufferSourceNode.loopEnd;
  }
  set loopEnd(c) {
    this._nativeAudioBufferSourceNode.loopEnd = c;
  }
  get loopStart() {
    return this._nativeAudioBufferSourceNode.loopStart;
  }
  set loopStart(c) {
    this._nativeAudioBufferSourceNode.loopStart = c;
  }
  get onended() {
    return this._onended;
  }
  set onended(c) {
    const u = typeof c == "function" ? a(this, c) : null;
    this._nativeAudioBufferSourceNode.onended = u;
    const d = this._nativeAudioBufferSourceNode.onended;
    this._onended = d !== null && d === u ? c : d;
  }
  get playbackRate() {
    return this._playbackRate;
  }
  start(c = 0, u = 0, d) {
    if (this._nativeAudioBufferSourceNode.start(c, u, d), this._audioBufferSourceNodeRenderer !== null && (this._audioBufferSourceNodeRenderer.start = d === void 0 ? [c, u] : [c, u, d]), this.context.state !== "closed") {
      ct(this);
      const f = () => {
        this._nativeAudioBufferSourceNode.removeEventListener("ended", f), ke(this) && bt(this);
      };
      this._nativeAudioBufferSourceNode.addEventListener("ended", f);
    }
  }
  stop(c = 0) {
    this._nativeAudioBufferSourceNode.stop(c), this._audioBufferSourceNodeRenderer !== null && (this._audioBufferSourceNodeRenderer.stop = c);
  }
}, oi = (n, e, t, s, r) => () => {
  const o = /* @__PURE__ */ new WeakMap();
  let i = null, a = null;
  const l = async (c, u) => {
    let d = t(c);
    const f = me(d, u);
    if (!f) {
      const m = {
        buffer: d.buffer,
        channelCount: d.channelCount,
        channelCountMode: d.channelCountMode,
        channelInterpretation: d.channelInterpretation,
        // Bug #149: Safari does not yet support the detune AudioParam.
        loop: d.loop,
        loopEnd: d.loopEnd,
        loopStart: d.loopStart,
        playbackRate: d.playbackRate.value
      };
      d = e(u, m), i !== null && d.start(...i), a !== null && d.stop(a);
    }
    return o.set(u, d), f ? await n(u, c.playbackRate, d.playbackRate) : await s(u, c.playbackRate, d.playbackRate), await r(c, u, d), d;
  };
  return {
    set start(c) {
      i = c;
    },
    set stop(c) {
      a = c;
    },
    render(c, u) {
      const d = o.get(u);
      return d !== void 0 ? Promise.resolve(d) : l(c, u);
    }
  };
}, ii = (n) => "playbackRate" in n, ai = (n) => "frequency" in n && "gain" in n, ci = (n) => "offset" in n, li = (n) => !("frequency" in n) && "gain" in n, ui = (n) => "detune" in n && "frequency" in n && !("gain" in n), di = (n) => "pan" in n, ye = (n) => be(Ks, n), At = (n) => be(er, n), wn = (n, e) => {
  const { activeInputs: t } = ye(n);
  t.forEach((r) => r.forEach(([o]) => {
    e.includes(n) || wn(o, [...e, n]);
  }));
  const s = ii(n) ? [
    // Bug #149: Safari does not yet support the detune AudioParam.
    n.playbackRate
  ] : rr(n) ? Array.from(n.parameters.values()) : ai(n) ? [n.Q, n.detune, n.frequency, n.gain] : ci(n) ? [n.offset] : li(n) ? [n.gain] : ui(n) ? [n.detune, n.frequency] : di(n) ? [n.pan] : [];
  for (const r of s) {
    const o = At(r);
    o !== void 0 && o.activeInputs.forEach(([i]) => wn(i, e));
  }
  ke(n) && bt(n);
}, ir = (n) => {
  wn(n.destination, []);
}, hi = (n) => n === void 0 || typeof n == "number" || typeof n == "string" && (n === "balanced" || n === "interactive" || n === "playback"), fi = (n, e, t, s, r, o, i, a, l) => class extends n {
  constructor(u = {}) {
    if (l === null)
      throw new Error("Missing the native AudioContext constructor.");
    let d;
    try {
      d = new l(u);
    } catch (h) {
      throw h.code === 12 && h.message === "sampleRate is not in range" ? t() : h;
    }
    if (d === null)
      throw s();
    if (!hi(u.latencyHint))
      throw new TypeError(`The provided value '${u.latencyHint}' is not a valid enum value of type AudioContextLatencyCategory.`);
    if (u.sampleRate !== void 0 && d.sampleRate !== u.sampleRate)
      throw t();
    super(d, 2);
    const { latencyHint: f } = u, { sampleRate: m } = d;
    if (this._baseLatency = typeof d.baseLatency == "number" ? d.baseLatency : f === "balanced" ? 512 / m : f === "interactive" || f === void 0 ? 256 / m : f === "playback" ? 1024 / m : (
      /*
       * @todo The min (256) and max (16384) values are taken from the allowed bufferSize values of a
       * ScriptProcessorNode.
       */
      Math.max(2, Math.min(128, Math.round(f * m / 128))) * 128 / m
    ), this._nativeAudioContext = d, l.name === "webkitAudioContext" ? (this._nativeGainNode = d.createGain(), this._nativeOscillatorNode = d.createOscillator(), this._nativeGainNode.gain.value = 1e-37, this._nativeOscillatorNode.connect(this._nativeGainNode).connect(d.destination), this._nativeOscillatorNode.start()) : (this._nativeGainNode = null, this._nativeOscillatorNode = null), this._state = null, d.state === "running") {
      this._state = "suspended";
      const h = () => {
        this._state === "suspended" && (this._state = null), d.removeEventListener("statechange", h);
      };
      d.addEventListener("statechange", h);
    }
  }
  get baseLatency() {
    return this._baseLatency;
  }
  get state() {
    return this._state !== null ? this._state : this._nativeAudioContext.state;
  }
  close() {
    return this.state === "closed" ? this._nativeAudioContext.close().then(() => {
      throw e();
    }) : (this._state === "suspended" && (this._state = null), this._nativeAudioContext.close().then(() => {
      this._nativeGainNode !== null && this._nativeOscillatorNode !== null && (this._nativeOscillatorNode.stop(), this._nativeGainNode.disconnect(), this._nativeOscillatorNode.disconnect()), ir(this);
    }));
  }
  createMediaElementSource(u) {
    return new r(this, { mediaElement: u });
  }
  createMediaStreamDestination() {
    return new o(this);
  }
  createMediaStreamSource(u) {
    return new i(this, { mediaStream: u });
  }
  createMediaStreamTrackSource(u) {
    return new a(this, { mediaStreamTrack: u });
  }
  resume() {
    return this._state === "suspended" ? new Promise((u, d) => {
      const f = () => {
        this._nativeAudioContext.removeEventListener("statechange", f), this._nativeAudioContext.state === "running" ? u() : this.resume().then(u, d);
      };
      this._nativeAudioContext.addEventListener("statechange", f);
    }) : this._nativeAudioContext.resume().catch((u) => {
      throw u === void 0 || u.code === 15 ? e() : u;
    });
  }
  suspend() {
    return this._nativeAudioContext.suspend().catch((u) => {
      throw u === void 0 ? e() : u;
    });
  }
}, mi = (n, e, t, s, r, o, i, a) => class extends n {
  constructor(c, u) {
    const d = o(c), f = i(d), m = r(d, u, f), h = f ? e(a) : null;
    super(c, !1, m, h), this._isNodeOfNativeOfflineAudioContext = f, this._nativeAudioDestinationNode = m;
  }
  get channelCount() {
    return this._nativeAudioDestinationNode.channelCount;
  }
  set channelCount(c) {
    if (this._isNodeOfNativeOfflineAudioContext)
      throw s();
    if (c > this._nativeAudioDestinationNode.maxChannelCount)
      throw t();
    this._nativeAudioDestinationNode.channelCount = c;
  }
  get channelCountMode() {
    return this._nativeAudioDestinationNode.channelCountMode;
  }
  set channelCountMode(c) {
    if (this._isNodeOfNativeOfflineAudioContext)
      throw s();
    this._nativeAudioDestinationNode.channelCountMode = c;
  }
  get maxChannelCount() {
    return this._nativeAudioDestinationNode.maxChannelCount;
  }
}, pi = (n) => {
  const e = /* @__PURE__ */ new WeakMap(), t = async (s, r) => {
    const o = r.destination;
    return e.set(r, o), await n(s, r, o), o;
  };
  return {
    render(s, r) {
      const o = e.get(r);
      return o !== void 0 ? Promise.resolve(o) : t(s, r);
    }
  };
}, gi = (n, e, t, s, r, o, i, a) => (l, c) => {
  const u = c.listener, d = () => {
    const g = new Float32Array(1), y = e(c, {
      channelCount: 1,
      channelCountMode: "explicit",
      channelInterpretation: "speakers",
      numberOfInputs: 9
    }), v = i(c);
    let _ = !1, E = [0, 0, -1, 0, 1, 0], F = [0, 0, 0];
    const P = () => {
      if (_)
        return;
      _ = !0;
      const O = s(c, 256, 9, 0);
      O.onaudioprocess = ({ inputBuffer: b }) => {
        const A = [
          o(b, g, 0),
          o(b, g, 1),
          o(b, g, 2),
          o(b, g, 3),
          o(b, g, 4),
          o(b, g, 5)
        ];
        A.some((R, B) => R !== E[B]) && (u.setOrientation(...A), E = A);
        const x = [
          o(b, g, 6),
          o(b, g, 7),
          o(b, g, 8)
        ];
        x.some((R, B) => R !== F[B]) && (u.setPosition(...x), F = x);
      }, y.connect(O);
    }, I = (O) => (b) => {
      b !== E[O] && (E[O] = b, u.setOrientation(...E));
    }, D = (O) => (b) => {
      b !== F[O] && (F[O] = b, u.setPosition(...F));
    }, w = (O, b, A) => {
      const x = t(c, {
        channelCount: 1,
        channelCountMode: "explicit",
        channelInterpretation: "discrete",
        offset: b
      });
      x.connect(y, 0, O), x.start(), Object.defineProperty(x.offset, "defaultValue", {
        get() {
          return b;
        }
      });
      const R = n({ context: l }, v, x.offset, ge, ve);
      return a(R, "value", (B) => () => B.call(R), (B) => (k) => {
        try {
          B.call(R, k);
        } catch (L) {
          if (L.code !== 9)
            throw L;
        }
        P(), v && A(k);
      }), R.cancelAndHoldAtTime = /* @__PURE__ */ ((B) => v ? () => {
        throw r();
      } : (...k) => {
        const L = B.apply(R, k);
        return P(), L;
      })(R.cancelAndHoldAtTime), R.cancelScheduledValues = /* @__PURE__ */ ((B) => v ? () => {
        throw r();
      } : (...k) => {
        const L = B.apply(R, k);
        return P(), L;
      })(R.cancelScheduledValues), R.exponentialRampToValueAtTime = /* @__PURE__ */ ((B) => v ? () => {
        throw r();
      } : (...k) => {
        const L = B.apply(R, k);
        return P(), L;
      })(R.exponentialRampToValueAtTime), R.linearRampToValueAtTime = /* @__PURE__ */ ((B) => v ? () => {
        throw r();
      } : (...k) => {
        const L = B.apply(R, k);
        return P(), L;
      })(R.linearRampToValueAtTime), R.setTargetAtTime = /* @__PURE__ */ ((B) => v ? () => {
        throw r();
      } : (...k) => {
        const L = B.apply(R, k);
        return P(), L;
      })(R.setTargetAtTime), R.setValueAtTime = /* @__PURE__ */ ((B) => v ? () => {
        throw r();
      } : (...k) => {
        const L = B.apply(R, k);
        return P(), L;
      })(R.setValueAtTime), R.setValueCurveAtTime = /* @__PURE__ */ ((B) => v ? () => {
        throw r();
      } : (...k) => {
        const L = B.apply(R, k);
        return P(), L;
      })(R.setValueCurveAtTime), R;
    };
    return {
      forwardX: w(0, 0, I(0)),
      forwardY: w(1, 0, I(1)),
      forwardZ: w(2, -1, I(2)),
      positionX: w(6, 0, D(0)),
      positionY: w(7, 0, D(1)),
      positionZ: w(8, 0, D(2)),
      upX: w(3, 0, I(3)),
      upY: w(4, 1, I(4)),
      upZ: w(5, 0, I(5))
    };
  }, { forwardX: f, forwardY: m, forwardZ: h, positionX: p, positionY: C, positionZ: T, upX: S, upY: N, upZ: M } = u.forwardX === void 0 ? d() : u;
  return {
    get forwardX() {
      return f;
    },
    get forwardY() {
      return m;
    },
    get forwardZ() {
      return h;
    },
    get positionX() {
      return p;
    },
    get positionY() {
      return C;
    },
    get positionZ() {
      return T;
    },
    get upX() {
      return S;
    },
    get upY() {
      return N;
    },
    get upZ() {
      return M;
    }
  };
}, Ut = (n) => "context" in n, Mt = (n) => Ut(n[0]), Qe = (n, e, t, s) => {
  for (const r of n)
    if (t(r)) {
      if (s)
        return !1;
      throw Error("The set contains at least one similar element.");
    }
  return n.add(e), !0;
}, Ds = (n, e, [t, s], r) => {
  Qe(n, [e, t, s], (o) => o[0] === e && o[1] === t, r);
}, Rs = (n, [e, t, s], r) => {
  const o = n.get(e);
  o === void 0 ? n.set(e, /* @__PURE__ */ new Set([[t, s]])) : Qe(o, [t, s], (i) => i[0] === t, r);
}, dt = (n) => "inputs" in n, Ht = (n, e, t, s) => {
  if (dt(e)) {
    const r = e.inputs[s];
    return n.connect(r, t, 0), [r, t, 0];
  }
  return n.connect(e, t, s), [e, t, s];
}, ar = (n, e, t) => {
  for (const s of n)
    if (s[0] === e && s[1] === t)
      return n.delete(s), s;
  return null;
}, yi = (n, e, t) => Kt(n, (s) => s[0] === e && s[1] === t), cr = (n, e) => {
  if (!wt(n).delete(e))
    throw new Error("Missing the expected event listener.");
}, lr = (n, e, t) => {
  const s = be(n, e), r = Kt(s, (o) => o[0] === t);
  return s.size === 0 && n.delete(e), r;
}, jt = (n, e, t, s) => {
  dt(e) ? n.disconnect(e.inputs[s], t, 0) : n.disconnect(e, t, s);
}, se = (n) => be(Pn, n), _t = (n) => be(On, n), Ze = (n) => vn.has(n), Lt = (n) => !at.has(n), Fs = (n, e) => new Promise((t) => {
  if (e !== null)
    t(!0);
  else {
    const s = n.createScriptProcessor(256, 1, 1), r = n.createGain(), o = n.createBuffer(1, 2, 44100), i = o.getChannelData(0);
    i[0] = 1, i[1] = 1;
    const a = n.createBufferSource();
    a.buffer = o, a.loop = !0, a.connect(s).connect(n.destination), a.connect(r), a.disconnect(r), s.onaudioprocess = (l) => {
      const c = l.inputBuffer.getChannelData(0);
      Array.prototype.some.call(c, (u) => u === 1) ? t(!0) : t(!1), a.stop(), s.onaudioprocess = null, a.disconnect(s), s.disconnect(n.destination);
    }, a.start();
  }
}), fn = (n, e) => {
  const t = /* @__PURE__ */ new Map();
  for (const s of n)
    for (const r of s) {
      const o = t.get(r);
      t.set(r, o === void 0 ? 1 : o + 1);
    }
  t.forEach((s, r) => e(r, s));
}, zt = (n) => "context" in n, Si = (n) => {
  const e = /* @__PURE__ */ new Map();
  n.connect = /* @__PURE__ */ ((t) => (s, r = 0, o = 0) => {
    const i = zt(s) ? t(s, r, o) : t(s, r), a = e.get(s);
    return a === void 0 ? e.set(s, [{ input: o, output: r }]) : a.every((l) => l.input !== o || l.output !== r) && a.push({ input: o, output: r }), i;
  })(n.connect.bind(n)), n.disconnect = /* @__PURE__ */ ((t) => (s, r, o) => {
    if (t.apply(n), s === void 0)
      e.clear();
    else if (typeof s == "number")
      for (const [i, a] of e) {
        const l = a.filter((c) => c.output !== s);
        l.length === 0 ? e.delete(i) : e.set(i, l);
      }
    else if (e.has(s))
      if (r === void 0)
        e.delete(s);
      else {
        const i = e.get(s);
        if (i !== void 0) {
          const a = i.filter((l) => l.output !== r && (l.input !== o || o === void 0));
          a.length === 0 ? e.delete(s) : e.set(s, a);
        }
      }
    for (const [i, a] of e)
      a.forEach((l) => {
        zt(i) ? n.connect(i, l.output, l.input) : n.connect(i, l.output);
      });
  })(n.disconnect);
}, Ci = (n, e, t, s) => {
  const { activeInputs: r, passiveInputs: o } = At(e), { outputs: i } = ye(n), a = wt(n), l = (c) => {
    const u = se(n), d = _t(e);
    if (c) {
      const f = lr(o, n, t);
      Ds(r, n, f, !1), !s && !Ze(n) && u.connect(d, t);
    } else {
      const f = yi(r, n, t);
      Rs(o, f, !1), !s && !Ze(n) && u.disconnect(d, t);
    }
  };
  return Qe(i, [e, t], (c) => c[0] === e && c[1] === t, !0) ? (a.add(l), ke(n) ? Ds(r, n, [t, l], !0) : Rs(o, [n, t, l], !0), !0) : !1;
}, vi = (n, e, t, s) => {
  const { activeInputs: r, passiveInputs: o } = ye(e), i = ar(r[s], n, t);
  return i === null ? [sr(o, n, t, s)[2], !1] : [i[2], !0];
}, _i = (n, e, t) => {
  const { activeInputs: s, passiveInputs: r } = At(e), o = ar(s, n, t);
  return o === null ? [lr(r, n, t)[1], !1] : [o[2], !0];
}, Dn = (n, e, t, s, r) => {
  const [o, i] = vi(n, t, s, r);
  if (o !== null && (cr(n, o), i && !e && !Ze(n) && jt(se(n), se(t), s, r)), ke(t)) {
    const { activeInputs: a } = ye(t);
    Nn(t, a);
  }
}, Rn = (n, e, t, s) => {
  const [r, o] = _i(n, t, s);
  r !== null && (cr(n, r), o && !e && !Ze(n) && se(n).disconnect(_t(t), s));
}, Ti = (n, e) => {
  const t = ye(n), s = [];
  for (const r of t.outputs)
    Mt(r) ? Dn(n, e, ...r) : Rn(n, e, ...r), s.push(r[0]);
  return t.outputs.clear(), s;
}, Ni = (n, e, t) => {
  const s = ye(n), r = [];
  for (const o of s.outputs)
    o[1] === t && (Mt(o) ? Dn(n, e, ...o) : Rn(n, e, ...o), r.push(o[0]), s.outputs.delete(o));
  return r;
}, wi = (n, e, t, s, r) => {
  const o = ye(n);
  return Array.from(o.outputs).filter((i) => i[0] === t && (s === void 0 || i[1] === s) && (r === void 0 || i[2] === r)).map((i) => (Mt(i) ? Dn(n, e, ...i) : Rn(n, e, ...i), o.outputs.delete(i), i[0]));
}, bi = (n, e, t, s, r, o, i, a, l, c, u, d, f, m, h, p) => class extends c {
  constructor(T, S, N, M) {
    super(N), this._context = T, this._nativeAudioNode = N;
    const g = u(T);
    d(g) && t(Fs, () => Fs(g, p)) !== !0 && Si(N), Pn.set(this, N), tr.set(this, /* @__PURE__ */ new Set()), T.state !== "closed" && S && ct(this), n(this, M, N);
  }
  get channelCount() {
    return this._nativeAudioNode.channelCount;
  }
  set channelCount(T) {
    this._nativeAudioNode.channelCount = T;
  }
  get channelCountMode() {
    return this._nativeAudioNode.channelCountMode;
  }
  set channelCountMode(T) {
    this._nativeAudioNode.channelCountMode = T;
  }
  get channelInterpretation() {
    return this._nativeAudioNode.channelInterpretation;
  }
  set channelInterpretation(T) {
    this._nativeAudioNode.channelInterpretation = T;
  }
  get context() {
    return this._context;
  }
  get numberOfInputs() {
    return this._nativeAudioNode.numberOfInputs;
  }
  get numberOfOutputs() {
    return this._nativeAudioNode.numberOfOutputs;
  }
  // tslint:disable-next-line:invalid-void
  connect(T, S = 0, N = 0) {
    if (S < 0 || S >= this._nativeAudioNode.numberOfOutputs)
      throw r();
    const M = u(this._context), g = h(M);
    if (f(T) || m(T))
      throw o();
    if (Ut(T)) {
      const _ = se(T);
      try {
        const F = Ht(this._nativeAudioNode, _, S, N), P = Lt(this);
        (g || P) && this._nativeAudioNode.disconnect(...F), this.context.state !== "closed" && !P && Lt(T) && ct(T);
      } catch (F) {
        throw F.code === 12 ? o() : F;
      }
      if (e(this, T, S, N, g)) {
        const F = l([this], T);
        fn(F, s(g));
      }
      return T;
    }
    const y = _t(T);
    if (y.name === "playbackRate" && y.maxValue === 1024)
      throw i();
    try {
      this._nativeAudioNode.connect(y, S), (g || Lt(this)) && this._nativeAudioNode.disconnect(y, S);
    } catch (_) {
      throw _.code === 12 ? o() : _;
    }
    if (Ci(this, T, S, g)) {
      const _ = l([this], T);
      fn(_, s(g));
    }
  }
  disconnect(T, S, N) {
    let M;
    const g = u(this._context), y = h(g);
    if (T === void 0)
      M = Ti(this, y);
    else if (typeof T == "number") {
      if (T < 0 || T >= this.numberOfOutputs)
        throw r();
      M = Ni(this, y, T);
    } else {
      if (S !== void 0 && (S < 0 || S >= this.numberOfOutputs) || Ut(T) && N !== void 0 && (N < 0 || N >= T.numberOfInputs))
        throw r();
      if (M = wi(this, y, T, S, N), M.length === 0)
        throw o();
    }
    for (const v of M) {
      const _ = l([this], v);
      fn(_, a);
    }
  }
}, Ai = (n, e, t, s, r, o, i, a, l, c, u, d, f) => (m, h, p, C = null, T = null) => {
  const S = p.value, N = new ko(S), M = h ? s(N) : null, g = {
    get defaultValue() {
      return S;
    },
    get maxValue() {
      return C === null ? p.maxValue : C;
    },
    get minValue() {
      return T === null ? p.minValue : T;
    },
    get value() {
      return p.value;
    },
    set value(y) {
      p.value = y, g.setValueAtTime(y, m.context.currentTime);
    },
    cancelAndHoldAtTime(y) {
      if (typeof p.cancelAndHoldAtTime == "function")
        M === null && N.flush(m.context.currentTime), N.add(r(y)), p.cancelAndHoldAtTime(y);
      else {
        const v = Array.from(N).pop();
        M === null && N.flush(m.context.currentTime), N.add(r(y));
        const _ = Array.from(N).pop();
        p.cancelScheduledValues(y), v !== _ && _ !== void 0 && (_.type === "exponentialRampToValue" ? p.exponentialRampToValueAtTime(_.value, _.endTime) : _.type === "linearRampToValue" ? p.linearRampToValueAtTime(_.value, _.endTime) : _.type === "setValue" ? p.setValueAtTime(_.value, _.startTime) : _.type === "setValueCurve" && p.setValueCurveAtTime(_.values, _.startTime, _.duration));
      }
      return g;
    },
    cancelScheduledValues(y) {
      return M === null && N.flush(m.context.currentTime), N.add(o(y)), p.cancelScheduledValues(y), g;
    },
    exponentialRampToValueAtTime(y, v) {
      if (y === 0)
        throw new RangeError();
      if (!Number.isFinite(v) || v < 0)
        throw new RangeError();
      const _ = m.context.currentTime;
      return M === null && N.flush(_), Array.from(N).length === 0 && (N.add(c(S, _)), p.setValueAtTime(S, _)), N.add(i(y, v)), p.exponentialRampToValueAtTime(y, v), g;
    },
    linearRampToValueAtTime(y, v) {
      const _ = m.context.currentTime;
      return M === null && N.flush(_), Array.from(N).length === 0 && (N.add(c(S, _)), p.setValueAtTime(S, _)), N.add(a(y, v)), p.linearRampToValueAtTime(y, v), g;
    },
    setTargetAtTime(y, v, _) {
      return M === null && N.flush(m.context.currentTime), N.add(l(y, v, _)), p.setTargetAtTime(y, v, _), g;
    },
    setValueAtTime(y, v) {
      return M === null && N.flush(m.context.currentTime), N.add(c(y, v)), p.setValueAtTime(y, v), g;
    },
    setValueCurveAtTime(y, v, _) {
      const E = y instanceof Float32Array ? y : new Float32Array(y);
      if (d !== null && d.name === "webkitAudioContext") {
        const F = v + _, P = m.context.sampleRate, I = Math.ceil(v * P), D = Math.floor(F * P), w = D - I, O = new Float32Array(w);
        for (let A = 0; A < w; A += 1) {
          const x = (E.length - 1) / _ * ((I + A) / P - v), R = Math.floor(x), B = Math.ceil(x);
          O[A] = R === B ? E[R] : (1 - (x - R)) * E[R] + (1 - (B - x)) * E[B];
        }
        M === null && N.flush(m.context.currentTime), N.add(u(O, v, _)), p.setValueCurveAtTime(O, v, _);
        const b = D / P;
        b < F && f(g, O[O.length - 1], b), f(g, E[E.length - 1], F);
      } else
        M === null && N.flush(m.context.currentTime), N.add(u(E, v, _)), p.setValueCurveAtTime(E, v, _);
      return g;
    }
  };
  return t.set(g, p), e.set(g, m), n(g, M), g;
}, Mi = (n) => ({
  replay(e) {
    for (const t of n)
      if (t.type === "exponentialRampToValue") {
        const { endTime: s, value: r } = t;
        e.exponentialRampToValueAtTime(r, s);
      } else if (t.type === "linearRampToValue") {
        const { endTime: s, value: r } = t;
        e.linearRampToValueAtTime(r, s);
      } else if (t.type === "setTarget") {
        const { startTime: s, target: r, timeConstant: o } = t;
        e.setTargetAtTime(r, s, o);
      } else if (t.type === "setValue") {
        const { startTime: s, value: r } = t;
        e.setValueAtTime(r, s);
      } else if (t.type === "setValueCurve") {
        const { duration: s, startTime: r, values: o } = t;
        e.setValueCurveAtTime(o, r, s);
      } else
        throw new Error("Can't apply an unknown automation.");
  }
});
class ur {
  constructor(e) {
    this._map = new Map(e);
  }
  get size() {
    return this._map.size;
  }
  entries() {
    return this._map.entries();
  }
  forEach(e, t = null) {
    return this._map.forEach((s, r) => e.call(t, s, r, this));
  }
  get(e) {
    return this._map.get(e);
  }
  has(e) {
    return this._map.has(e);
  }
  keys() {
    return this._map.keys();
  }
  values() {
    return this._map.values();
  }
}
const Ii = {
  channelCount: 2,
  // Bug #61: The channelCountMode should be 'max' according to the spec but is set to 'explicit' to achieve consistent behavior.
  channelCountMode: "explicit",
  channelInterpretation: "speakers",
  numberOfInputs: 1,
  numberOfOutputs: 1,
  parameterData: {},
  processorOptions: {}
}, Ei = (n, e, t, s, r, o, i, a, l, c, u, d, f, m) => class extends e {
  constructor(p, C, T) {
    var S;
    const N = a(p), M = l(N), g = u({ ...Ii, ...T });
    f(g);
    const y = _n.get(N), v = y == null ? void 0 : y.get(C), _ = M || N.state !== "closed" ? N : (S = i(N)) !== null && S !== void 0 ? S : N, E = r(_, M ? null : p.baseLatency, c, C, v, g), F = M ? s(C, g, v) : null;
    super(p, !0, E, F);
    const P = [];
    E.parameters.forEach((D, w) => {
      const O = t(this, M, D);
      P.push([w, O]);
    }), this._nativeAudioWorkletNode = E, this._onprocessorerror = null, this._parameters = new ur(P), M && n(N, this);
    const { activeInputs: I } = o(this);
    d(E, I);
  }
  get onprocessorerror() {
    return this._onprocessorerror;
  }
  set onprocessorerror(p) {
    const C = typeof p == "function" ? m(this, p) : null;
    this._nativeAudioWorkletNode.onprocessorerror = C;
    const T = this._nativeAudioWorkletNode.onprocessorerror;
    this._onprocessorerror = T !== null && T === C ? p : T;
  }
  get parameters() {
    return this._parameters === null ? this._nativeAudioWorkletNode.parameters : this._parameters;
  }
  get port() {
    return this._nativeAudioWorkletNode.port;
  }
};
function Xt(n, e, t, s, r) {
  if (typeof n.copyFromChannel == "function")
    e[t].byteLength === 0 && (e[t] = new Float32Array(128)), n.copyFromChannel(e[t], s, r);
  else {
    const o = n.getChannelData(s);
    if (e[t].byteLength === 0)
      e[t] = o.slice(r, r + 128);
    else {
      const i = new Float32Array(o.buffer, r * Float32Array.BYTES_PER_ELEMENT, 128);
      e[t].set(i);
    }
  }
}
const dr = (n, e, t, s, r) => {
  typeof n.copyToChannel == "function" ? e[t].byteLength !== 0 && n.copyToChannel(e[t], s, r) : e[t].byteLength !== 0 && n.getChannelData(s).set(e[t], r);
}, Jt = (n, e) => {
  const t = [];
  for (let s = 0; s < n; s += 1) {
    const r = [], o = typeof e == "number" ? e : e[s];
    for (let i = 0; i < o; i += 1)
      r.push(new Float32Array(128));
    t.push(r);
  }
  return t;
}, Pi = (n, e) => {
  const t = be(Tn, n), s = se(e);
  return be(t, s);
}, Oi = async (n, e, t, s, r, o, i) => {
  const a = e === null ? Math.ceil(n.context.length / 128) * 128 : e.length, l = s.channelCount * s.numberOfInputs, c = r.reduce((C, T) => C + T, 0), u = c === 0 ? null : t.createBuffer(c, a, t.sampleRate);
  if (o === void 0)
    throw new Error("Missing the processor constructor.");
  const d = ye(n), f = await Pi(t, n), m = Jt(s.numberOfInputs, s.channelCount), h = Jt(s.numberOfOutputs, r), p = Array.from(n.parameters.keys()).reduce((C, T) => ({ ...C, [T]: new Float32Array(128) }), {});
  for (let C = 0; C < a; C += 128) {
    if (s.numberOfInputs > 0 && e !== null)
      for (let T = 0; T < s.numberOfInputs; T += 1)
        for (let S = 0; S < s.channelCount; S += 1)
          Xt(e, m[T], S, S, C);
    o.parameterDescriptors !== void 0 && e !== null && o.parameterDescriptors.forEach(({ name: T }, S) => {
      Xt(e, p, T, l + S, C);
    });
    for (let T = 0; T < s.numberOfInputs; T += 1)
      for (let S = 0; S < r[T]; S += 1)
        h[T][S].byteLength === 0 && (h[T][S] = new Float32Array(128));
    try {
      const T = m.map((N, M) => d.activeInputs[M].size === 0 ? [] : N), S = i(C / t.sampleRate, t.sampleRate, () => f.process(T, h, p));
      if (u !== null)
        for (let N = 0, M = 0; N < s.numberOfOutputs; N += 1) {
          for (let g = 0; g < r[N]; g += 1)
            dr(u, h[N], g, M + g, C);
          M += r[N];
        }
      if (!S)
        break;
    } catch (T) {
      n.dispatchEvent(new ErrorEvent("processorerror", {
        colno: T.colno,
        filename: T.filename,
        lineno: T.lineno,
        message: T.message
      }));
      break;
    }
  }
  return u;
}, xi = (n, e, t, s, r, o, i, a, l, c, u, d, f, m, h, p) => (C, T, S) => {
  const N = /* @__PURE__ */ new WeakMap();
  let M = null;
  const g = async (y, v) => {
    let _ = u(y), E = null;
    const F = me(_, v), P = Array.isArray(T.outputChannelCount) ? T.outputChannelCount : Array.from(T.outputChannelCount);
    if (d === null) {
      const I = P.reduce((b, A) => b + A, 0), D = r(v, {
        channelCount: Math.max(1, I),
        channelCountMode: "explicit",
        channelInterpretation: "discrete",
        numberOfOutputs: Math.max(1, I)
      }), w = [];
      for (let b = 0; b < y.numberOfOutputs; b += 1)
        w.push(s(v, {
          channelCount: 1,
          channelCountMode: "explicit",
          channelInterpretation: "speakers",
          numberOfInputs: P[b]
        }));
      const O = i(v, {
        channelCount: T.channelCount,
        channelCountMode: T.channelCountMode,
        channelInterpretation: T.channelInterpretation,
        gain: 1
      });
      O.connect = e.bind(null, w), O.disconnect = l.bind(null, w), E = [D, w, O];
    } else F || (_ = new d(v, C));
    if (N.set(v, E === null ? _ : E[2]), E !== null) {
      if (M === null) {
        if (S === void 0)
          throw new Error("Missing the processor constructor.");
        if (f === null)
          throw new Error("Missing the native OfflineAudioContext constructor.");
        const A = y.channelCount * y.numberOfInputs, x = S.parameterDescriptors === void 0 ? 0 : S.parameterDescriptors.length, R = A + x;
        M = Oi(y, R === 0 ? null : await (async () => {
          const k = new f(
            R,
            // Ceil the length to the next full render quantum.
            // Bug #17: Safari does not yet expose the length.
            Math.ceil(y.context.length / 128) * 128,
            v.sampleRate
          ), L = [], $ = [];
          for (let z = 0; z < T.numberOfInputs; z += 1)
            L.push(i(k, {
              channelCount: T.channelCount,
              channelCountMode: T.channelCountMode,
              channelInterpretation: T.channelInterpretation,
              gain: 1
            })), $.push(r(k, {
              channelCount: T.channelCount,
              channelCountMode: "explicit",
              channelInterpretation: "discrete",
              numberOfOutputs: T.channelCount
            }));
          const U = await Promise.all(Array.from(y.parameters.values()).map(async (z) => {
            const j = o(k, {
              channelCount: 1,
              channelCountMode: "explicit",
              channelInterpretation: "discrete",
              offset: z.value
            });
            return await m(k, z, j.offset), j;
          })), q = s(k, {
            channelCount: 1,
            channelCountMode: "explicit",
            channelInterpretation: "speakers",
            numberOfInputs: Math.max(1, A + x)
          });
          for (let z = 0; z < T.numberOfInputs; z += 1) {
            L[z].connect($[z]);
            for (let j = 0; j < T.channelCount; j += 1)
              $[z].connect(q, j, z * T.channelCount + j);
          }
          for (const [z, j] of U.entries())
            j.connect(q, 0, A + z), j.start(0);
          return q.connect(k.destination), await Promise.all(L.map((z) => h(y, k, z))), p(k);
        })(), v, T, P, S, c);
      }
      const I = await M, D = t(v, {
        buffer: null,
        channelCount: 2,
        channelCountMode: "max",
        channelInterpretation: "speakers",
        loop: !1,
        loopEnd: 0,
        loopStart: 0,
        playbackRate: 1
      }), [w, O, b] = E;
      I !== null && (D.buffer = I, D.start(0)), D.connect(w);
      for (let A = 0, x = 0; A < y.numberOfOutputs; A += 1) {
        const R = O[A];
        for (let B = 0; B < P[A]; B += 1)
          w.connect(R, x + B, B);
        x += P[A];
      }
      return b;
    }
    if (F)
      for (const [I, D] of y.parameters.entries())
        await n(
          v,
          D,
          // @todo The definition that TypeScript uses of the AudioParamMap is lacking many methods.
          _.parameters.get(I)
        );
    else
      for (const [I, D] of y.parameters.entries())
        await m(
          v,
          D,
          // @todo The definition that TypeScript uses of the AudioParamMap is lacking many methods.
          _.parameters.get(I)
        );
    return await h(y, v, _), _;
  };
  return {
    render(y, v) {
      a(v, y);
      const _ = N.get(v);
      return _ !== void 0 ? Promise.resolve(_) : g(y, v);
    }
  };
}, Di = (n, e, t, s, r, o, i, a, l, c, u, d, f, m, h, p, C, T, S, N) => class extends h {
  constructor(g, y) {
    super(g, y), this._nativeContext = g, this._audioWorklet = n === void 0 ? void 0 : {
      addModule: (v, _) => n(this, v, _)
    };
  }
  get audioWorklet() {
    return this._audioWorklet;
  }
  createAnalyser() {
    return new e(this);
  }
  createBiquadFilter() {
    return new r(this);
  }
  createBuffer(g, y, v) {
    return new t({ length: y, numberOfChannels: g, sampleRate: v });
  }
  createBufferSource() {
    return new s(this);
  }
  createChannelMerger(g = 6) {
    return new o(this, { numberOfInputs: g });
  }
  createChannelSplitter(g = 6) {
    return new i(this, { numberOfOutputs: g });
  }
  createConstantSource() {
    return new a(this);
  }
  createConvolver() {
    return new l(this);
  }
  createDelay(g = 1) {
    return new u(this, { maxDelayTime: g });
  }
  createDynamicsCompressor() {
    return new d(this);
  }
  createGain() {
    return new f(this);
  }
  createIIRFilter(g, y) {
    return new m(this, { feedback: y, feedforward: g });
  }
  createOscillator() {
    return new p(this);
  }
  createPanner() {
    return new C(this);
  }
  createPeriodicWave(g, y, v = { disableNormalization: !1 }) {
    return new T(this, { ...v, imag: y, real: g });
  }
  createStereoPanner() {
    return new S(this);
  }
  createWaveShaper() {
    return new N(this);
  }
  decodeAudioData(g, y, v) {
    return c(this._nativeContext, g).then((_) => (typeof y == "function" && y(_), _), (_) => {
      throw typeof v == "function" && v(_), _;
    });
  }
}, Ri = {
  Q: 1,
  channelCount: 2,
  channelCountMode: "max",
  channelInterpretation: "speakers",
  detune: 0,
  frequency: 350,
  gain: 0,
  type: "lowpass"
}, Fi = (n, e, t, s, r, o, i, a) => class extends n {
  constructor(c, u) {
    const d = o(c), f = { ...Ri, ...u }, m = r(d, f), h = i(d), p = h ? t() : null;
    super(c, !1, m, p), this._Q = e(this, h, m.Q, ge, ve), this._detune = e(this, h, m.detune, 1200 * Math.log2(ge), -1200 * Math.log2(ge)), this._frequency = e(this, h, m.frequency, c.sampleRate / 2, 0), this._gain = e(this, h, m.gain, 40 * Math.log10(ge), ve), this._nativeBiquadFilterNode = m, a(this, 1);
  }
  get detune() {
    return this._detune;
  }
  get frequency() {
    return this._frequency;
  }
  get gain() {
    return this._gain;
  }
  get Q() {
    return this._Q;
  }
  get type() {
    return this._nativeBiquadFilterNode.type;
  }
  set type(c) {
    this._nativeBiquadFilterNode.type = c;
  }
  getFrequencyResponse(c, u, d) {
    try {
      this._nativeBiquadFilterNode.getFrequencyResponse(c, u, d);
    } catch (f) {
      throw f.code === 11 ? s() : f;
    }
    if (c.length !== u.length || u.length !== d.length)
      throw s();
  }
}, ki = (n, e, t, s, r) => () => {
  const o = /* @__PURE__ */ new WeakMap(), i = async (a, l) => {
    let c = t(a);
    const u = me(c, l);
    if (!u) {
      const d = {
        Q: c.Q.value,
        channelCount: c.channelCount,
        channelCountMode: c.channelCountMode,
        channelInterpretation: c.channelInterpretation,
        detune: c.detune.value,
        frequency: c.frequency.value,
        gain: c.gain.value,
        type: c.type
      };
      c = e(l, d);
    }
    return o.set(l, c), u ? (await n(l, a.Q, c.Q), await n(l, a.detune, c.detune), await n(l, a.frequency, c.frequency), await n(l, a.gain, c.gain)) : (await s(l, a.Q, c.Q), await s(l, a.detune, c.detune), await s(l, a.frequency, c.frequency), await s(l, a.gain, c.gain)), await r(a, l, c), c;
  };
  return {
    render(a, l) {
      const c = o.get(l);
      return c !== void 0 ? Promise.resolve(c) : i(a, l);
    }
  };
}, Bi = (n, e) => (t, s) => {
  const r = e.get(t);
  if (r !== void 0)
    return r;
  const o = n.get(t);
  if (o !== void 0)
    return o;
  try {
    const i = s();
    return i instanceof Promise ? (n.set(t, i), i.catch(() => !1).then((a) => (n.delete(t), e.set(t, a), a))) : (e.set(t, i), i);
  } catch {
    return e.set(t, !1), !1;
  }
}, Li = {
  channelCount: 1,
  channelCountMode: "explicit",
  channelInterpretation: "speakers",
  numberOfInputs: 6
}, Vi = (n, e, t, s, r) => class extends n {
  constructor(i, a) {
    const l = s(i), c = { ...Li, ...a }, u = t(l, c), d = r(l) ? e() : null;
    super(i, !1, u, d);
  }
}, Wi = (n, e, t) => () => {
  const s = /* @__PURE__ */ new WeakMap(), r = async (o, i) => {
    let a = e(o);
    if (!me(a, i)) {
      const c = {
        channelCount: a.channelCount,
        channelCountMode: a.channelCountMode,
        channelInterpretation: a.channelInterpretation,
        numberOfInputs: a.numberOfInputs
      };
      a = n(i, c);
    }
    return s.set(i, a), await t(o, i, a), a;
  };
  return {
    render(o, i) {
      const a = s.get(i);
      return a !== void 0 ? Promise.resolve(a) : r(o, i);
    }
  };
}, Gi = {
  channelCount: 6,
  channelCountMode: "explicit",
  channelInterpretation: "discrete",
  numberOfOutputs: 6
}, qi = (n, e, t, s, r, o) => class extends n {
  constructor(a, l) {
    const c = s(a), u = o({ ...Gi, ...l }), d = t(c, u), f = r(c) ? e() : null;
    super(a, !1, d, f);
  }
}, $i = (n, e, t) => () => {
  const s = /* @__PURE__ */ new WeakMap(), r = async (o, i) => {
    let a = e(o);
    if (!me(a, i)) {
      const c = {
        channelCount: a.channelCount,
        channelCountMode: a.channelCountMode,
        channelInterpretation: a.channelInterpretation,
        numberOfOutputs: a.numberOfOutputs
      };
      a = n(i, c);
    }
    return s.set(i, a), await t(o, i, a), a;
  };
  return {
    render(o, i) {
      const a = s.get(i);
      return a !== void 0 ? Promise.resolve(a) : r(o, i);
    }
  };
}, Ui = (n) => (e, t, s) => n(t, e, s), Hi = (n) => (e, t, s = 0, r = 0) => {
  const o = e[s];
  if (o === void 0)
    throw n();
  return zt(t) ? o.connect(t, 0, r) : o.connect(t, 0);
}, ji = (n) => (e, t) => {
  const s = n(e, {
    buffer: null,
    channelCount: 2,
    channelCountMode: "max",
    channelInterpretation: "speakers",
    loop: !1,
    loopEnd: 0,
    loopStart: 0,
    playbackRate: 1
  }), r = e.createBuffer(1, 2, 44100);
  return s.buffer = r, s.loop = !0, s.connect(t), s.start(), () => {
    s.stop(), s.disconnect(t);
  };
}, zi = {
  channelCount: 2,
  channelCountMode: "max",
  channelInterpretation: "speakers",
  offset: 1
}, Xi = (n, e, t, s, r, o, i) => class extends n {
  constructor(l, c) {
    const u = r(l), d = { ...zi, ...c }, f = s(u, d), m = o(u), h = m ? t() : null;
    super(l, !1, f, h), this._constantSourceNodeRenderer = h, this._nativeConstantSourceNode = f, this._offset = e(this, m, f.offset, ge, ve), this._onended = null;
  }
  get offset() {
    return this._offset;
  }
  get onended() {
    return this._onended;
  }
  set onended(l) {
    const c = typeof l == "function" ? i(this, l) : null;
    this._nativeConstantSourceNode.onended = c;
    const u = this._nativeConstantSourceNode.onended;
    this._onended = u !== null && u === c ? l : u;
  }
  start(l = 0) {
    if (this._nativeConstantSourceNode.start(l), this._constantSourceNodeRenderer !== null && (this._constantSourceNodeRenderer.start = l), this.context.state !== "closed") {
      ct(this);
      const c = () => {
        this._nativeConstantSourceNode.removeEventListener("ended", c), ke(this) && bt(this);
      };
      this._nativeConstantSourceNode.addEventListener("ended", c);
    }
  }
  stop(l = 0) {
    this._nativeConstantSourceNode.stop(l), this._constantSourceNodeRenderer !== null && (this._constantSourceNodeRenderer.stop = l);
  }
}, Ji = (n, e, t, s, r) => () => {
  const o = /* @__PURE__ */ new WeakMap();
  let i = null, a = null;
  const l = async (c, u) => {
    let d = t(c);
    const f = me(d, u);
    if (!f) {
      const m = {
        channelCount: d.channelCount,
        channelCountMode: d.channelCountMode,
        channelInterpretation: d.channelInterpretation,
        offset: d.offset.value
      };
      d = e(u, m), i !== null && d.start(i), a !== null && d.stop(a);
    }
    return o.set(u, d), f ? await n(u, c.offset, d.offset) : await s(u, c.offset, d.offset), await r(c, u, d), d;
  };
  return {
    set start(c) {
      i = c;
    },
    set stop(c) {
      a = c;
    },
    render(c, u) {
      const d = o.get(u);
      return d !== void 0 ? Promise.resolve(d) : l(c, u);
    }
  };
}, Yi = (n) => (e) => (n[0] = e, n[0]), Zi = {
  buffer: null,
  channelCount: 2,
  channelCountMode: "clamped-max",
  channelInterpretation: "speakers",
  disableNormalization: !1
}, Qi = (n, e, t, s, r, o) => class extends n {
  constructor(a, l) {
    const c = s(a), u = { ...Zi, ...l }, d = t(c, u), m = r(c) ? e() : null;
    super(a, !1, d, m), this._isBufferNullified = !1, this._nativeConvolverNode = d, u.buffer !== null && o(this, u.buffer.duration);
  }
  get buffer() {
    return this._isBufferNullified ? null : this._nativeConvolverNode.buffer;
  }
  set buffer(a) {
    if (this._nativeConvolverNode.buffer = a, a === null && this._nativeConvolverNode.buffer !== null) {
      const l = this._nativeConvolverNode.context;
      this._nativeConvolverNode.buffer = l.createBuffer(1, 1, l.sampleRate), this._isBufferNullified = !0, o(this, 0);
    } else
      this._isBufferNullified = !1, o(this, this._nativeConvolverNode.buffer === null ? 0 : this._nativeConvolverNode.buffer.duration);
  }
  get normalize() {
    return this._nativeConvolverNode.normalize;
  }
  set normalize(a) {
    this._nativeConvolverNode.normalize = a;
  }
}, Ki = (n, e, t) => () => {
  const s = /* @__PURE__ */ new WeakMap(), r = async (o, i) => {
    let a = e(o);
    if (!me(a, i)) {
      const c = {
        buffer: a.buffer,
        channelCount: a.channelCount,
        channelCountMode: a.channelCountMode,
        channelInterpretation: a.channelInterpretation,
        disableNormalization: !a.normalize
      };
      a = n(i, c);
    }
    return s.set(i, a), dt(a) ? await t(o, i, a.inputs[0]) : await t(o, i, a), a;
  };
  return {
    render(o, i) {
      const a = s.get(i);
      return a !== void 0 ? Promise.resolve(a) : r(o, i);
    }
  };
}, ea = (n, e) => (t, s, r) => {
  if (e === null)
    throw new Error("Missing the native OfflineAudioContext constructor.");
  try {
    return new e(t, s, r);
  } catch (o) {
    throw o.name === "SyntaxError" ? n() : o;
  }
}, ta = () => new DOMException("", "DataCloneError"), ks = (n) => {
  const { port1: e, port2: t } = new MessageChannel();
  return new Promise((s) => {
    const r = () => {
      t.onmessage = null, e.close(), t.close(), s();
    };
    t.onmessage = () => r();
    try {
      e.postMessage(n, [n]);
    } catch {
    } finally {
      r();
    }
  });
}, na = (n, e, t, s, r, o, i, a, l, c, u) => (d, f) => {
  const m = i(d) ? d : o(d);
  if (r.has(f)) {
    const h = t();
    return Promise.reject(h);
  }
  try {
    r.add(f);
  } catch {
  }
  return e(l, () => l(m)) ? m.decodeAudioData(f).then((h) => (ks(f).catch(() => {
  }), e(a, () => a(h)) || u(h), n.add(h), h)) : new Promise((h, p) => {
    const C = async () => {
      try {
        await ks(f);
      } catch {
      }
    }, T = (S) => {
      p(S), C();
    };
    try {
      m.decodeAudioData(f, (S) => {
        typeof S.copyFromChannel != "function" && (c(S), xn(S)), n.add(S), C().then(() => h(S));
      }, (S) => {
        T(S === null ? s() : S);
      });
    } catch (S) {
      T(S);
    }
  });
}, sa = (n, e, t, s, r, o, i, a) => (l, c) => {
  const u = e.get(l);
  if (u === void 0)
    throw new Error("Missing the expected cycle count.");
  const d = o(l.context), f = a(d);
  if (u === c) {
    if (e.delete(l), !f && i(l)) {
      const m = s(l), { outputs: h } = t(l);
      for (const p of h)
        if (Mt(p)) {
          const C = s(p[0]);
          n(m, C, p[1], p[2]);
        } else {
          const C = r(p[0]);
          m.connect(C, p[1]);
        }
    }
  } else
    e.set(l, u - c);
}, ra = {
  channelCount: 2,
  channelCountMode: "max",
  channelInterpretation: "speakers",
  delayTime: 0,
  maxDelayTime: 1
}, oa = (n, e, t, s, r, o, i) => class extends n {
  constructor(l, c) {
    const u = r(l), d = { ...ra, ...c }, f = s(u, d), m = o(u), h = m ? t(d.maxDelayTime) : null;
    super(l, !1, f, h), this._delayTime = e(this, m, f.delayTime), i(this, d.maxDelayTime);
  }
  get delayTime() {
    return this._delayTime;
  }
}, ia = (n, e, t, s, r) => (o) => {
  const i = /* @__PURE__ */ new WeakMap(), a = async (l, c) => {
    let u = t(l);
    const d = me(u, c);
    if (!d) {
      const f = {
        channelCount: u.channelCount,
        channelCountMode: u.channelCountMode,
        channelInterpretation: u.channelInterpretation,
        delayTime: u.delayTime.value,
        maxDelayTime: o
      };
      u = e(c, f);
    }
    return i.set(c, u), d ? await n(c, l.delayTime, u.delayTime) : await s(c, l.delayTime, u.delayTime), await r(l, c, u), u;
  };
  return {
    render(l, c) {
      const u = i.get(c);
      return u !== void 0 ? Promise.resolve(u) : a(l, c);
    }
  };
}, aa = (n) => (e, t, s, r) => n(e[r], (o) => o[0] === t && o[1] === s), ca = (n) => (e, t) => {
  n(e).delete(t);
}, la = (n) => "delayTime" in n, ua = (n, e, t) => function s(r, o) {
  const i = Ut(o) ? o : t(n, o);
  if (la(i))
    return [];
  if (r[0] === i)
    return [r];
  if (r.includes(i))
    return [];
  const { outputs: a } = e(i);
  return Array.from(a).map((l) => s([...r, i], l[0])).reduce((l, c) => l.concat(c), []);
}, kt = (n, e, t) => {
  const s = e[t];
  if (s === void 0)
    throw n();
  return s;
}, da = (n) => (e, t = void 0, s = void 0, r = 0) => t === void 0 ? e.forEach((o) => o.disconnect()) : typeof t == "number" ? kt(n, e, t).disconnect() : zt(t) ? s === void 0 ? e.forEach((o) => o.disconnect(t)) : r === void 0 ? kt(n, e, s).disconnect(t, 0) : kt(n, e, s).disconnect(t, 0, r) : s === void 0 ? e.forEach((o) => o.disconnect(t)) : kt(n, e, s).disconnect(t, 0), ha = {
  attack: 3e-3,
  channelCount: 2,
  channelCountMode: "clamped-max",
  channelInterpretation: "speakers",
  knee: 30,
  ratio: 12,
  release: 0.25,
  threshold: -24
}, fa = (n, e, t, s, r, o, i, a) => class extends n {
  constructor(c, u) {
    const d = o(c), f = { ...ha, ...u }, m = s(d, f), h = i(d), p = h ? t() : null;
    super(c, !1, m, p), this._attack = e(this, h, m.attack), this._knee = e(this, h, m.knee), this._nativeDynamicsCompressorNode = m, this._ratio = e(this, h, m.ratio), this._release = e(this, h, m.release), this._threshold = e(this, h, m.threshold), a(this, 6e-3);
  }
  get attack() {
    return this._attack;
  }
  // Bug #108: Safari allows a channelCount of three and above which is why the getter and setter needs to be overwritten here.
  get channelCount() {
    return this._nativeDynamicsCompressorNode.channelCount;
  }
  set channelCount(c) {
    const u = this._nativeDynamicsCompressorNode.channelCount;
    if (this._nativeDynamicsCompressorNode.channelCount = c, c > 2)
      throw this._nativeDynamicsCompressorNode.channelCount = u, r();
  }
  /*
   * Bug #109: Only Chrome and Firefox disallow a channelCountMode of 'max' yet which is why the getter and setter needs to be
   * overwritten here.
   */
  get channelCountMode() {
    return this._nativeDynamicsCompressorNode.channelCountMode;
  }
  set channelCountMode(c) {
    const u = this._nativeDynamicsCompressorNode.channelCountMode;
    if (this._nativeDynamicsCompressorNode.channelCountMode = c, c === "max")
      throw this._nativeDynamicsCompressorNode.channelCountMode = u, r();
  }
  get knee() {
    return this._knee;
  }
  get ratio() {
    return this._ratio;
  }
  get reduction() {
    return typeof this._nativeDynamicsCompressorNode.reduction.value == "number" ? this._nativeDynamicsCompressorNode.reduction.value : this._nativeDynamicsCompressorNode.reduction;
  }
  get release() {
    return this._release;
  }
  get threshold() {
    return this._threshold;
  }
}, ma = (n, e, t, s, r) => () => {
  const o = /* @__PURE__ */ new WeakMap(), i = async (a, l) => {
    let c = t(a);
    const u = me(c, l);
    if (!u) {
      const d = {
        attack: c.attack.value,
        channelCount: c.channelCount,
        channelCountMode: c.channelCountMode,
        channelInterpretation: c.channelInterpretation,
        knee: c.knee.value,
        ratio: c.ratio.value,
        release: c.release.value,
        threshold: c.threshold.value
      };
      c = e(l, d);
    }
    return o.set(l, c), u ? (await n(l, a.attack, c.attack), await n(l, a.knee, c.knee), await n(l, a.ratio, c.ratio), await n(l, a.release, c.release), await n(l, a.threshold, c.threshold)) : (await s(l, a.attack, c.attack), await s(l, a.knee, c.knee), await s(l, a.ratio, c.ratio), await s(l, a.release, c.release), await s(l, a.threshold, c.threshold)), await r(a, l, c), c;
  };
  return {
    render(a, l) {
      const c = o.get(l);
      return c !== void 0 ? Promise.resolve(c) : i(a, l);
    }
  };
}, pa = () => new DOMException("", "EncodingError"), ga = (n) => (e) => new Promise((t, s) => {
  if (n === null) {
    s(new SyntaxError());
    return;
  }
  const r = n.document.head;
  if (r === null)
    s(new SyntaxError());
  else {
    const o = n.document.createElement("script"), i = new Blob([e], { type: "application/javascript" }), a = URL.createObjectURL(i), l = n.onerror, c = () => {
      n.onerror = l, URL.revokeObjectURL(a);
    };
    n.onerror = (u, d, f, m, h) => {
      if (d === a || d === n.location.href && f === 1 && m === 1)
        return c(), s(h), !1;
      if (l !== null)
        return l(u, d, f, m, h);
    }, o.onerror = () => {
      c(), s(new SyntaxError());
    }, o.onload = () => {
      c(), t();
    }, o.src = a, o.type = "module", r.appendChild(o);
  }
}), ya = (n) => class {
  constructor(t) {
    this._nativeEventTarget = t, this._listeners = /* @__PURE__ */ new WeakMap();
  }
  addEventListener(t, s, r) {
    if (s !== null) {
      let o = this._listeners.get(s);
      o === void 0 && (o = n(this, s), typeof s == "function" && this._listeners.set(s, o)), this._nativeEventTarget.addEventListener(t, o, r);
    }
  }
  dispatchEvent(t) {
    return this._nativeEventTarget.dispatchEvent(t);
  }
  removeEventListener(t, s, r) {
    const o = s === null ? void 0 : this._listeners.get(s);
    this._nativeEventTarget.removeEventListener(t, o === void 0 ? null : o, r);
  }
}, Sa = (n) => (e, t, s) => {
  Object.defineProperties(n, {
    currentFrame: {
      configurable: !0,
      get() {
        return Math.round(e * t);
      }
    },
    currentTime: {
      configurable: !0,
      get() {
        return e;
      }
    }
  });
  try {
    return s();
  } finally {
    n !== null && (delete n.currentFrame, delete n.currentTime);
  }
}, Ca = (n) => async (e) => {
  try {
    const t = await fetch(e);
    if (t.ok)
      return [await t.text(), t.url];
  } catch {
  }
  throw n();
}, va = {
  channelCount: 2,
  channelCountMode: "max",
  channelInterpretation: "speakers",
  gain: 1
}, _a = (n, e, t, s, r, o) => class extends n {
  constructor(a, l) {
    const c = r(a), u = { ...va, ...l }, d = s(c, u), f = o(c), m = f ? t() : null;
    super(a, !1, d, m), this._gain = e(this, f, d.gain, ge, ve);
  }
  get gain() {
    return this._gain;
  }
}, Ta = (n, e, t, s, r) => () => {
  const o = /* @__PURE__ */ new WeakMap(), i = async (a, l) => {
    let c = t(a);
    const u = me(c, l);
    if (!u) {
      const d = {
        channelCount: c.channelCount,
        channelCountMode: c.channelCountMode,
        channelInterpretation: c.channelInterpretation,
        gain: c.gain.value
      };
      c = e(l, d);
    }
    return o.set(l, c), u ? await n(l, a.gain, c.gain) : await s(l, a.gain, c.gain), await r(a, l, c), c;
  };
  return {
    render(a, l) {
      const c = o.get(l);
      return c !== void 0 ? Promise.resolve(c) : i(a, l);
    }
  };
}, Na = (n, e) => (t) => e(n, t), wa = (n) => (e) => {
  const t = n(e);
  if (t.renderer === null)
    throw new Error("Missing the renderer of the given AudioNode in the audio graph.");
  return t.renderer;
}, ba = (n) => (e) => {
  var t;
  return (t = n.get(e)) !== null && t !== void 0 ? t : 0;
}, Aa = (n) => (e) => {
  const t = n(e);
  if (t.renderer === null)
    throw new Error("Missing the renderer of the given AudioParam in the audio graph.");
  return t.renderer;
}, Ma = (n) => (e) => n.get(e), de = () => new DOMException("", "InvalidStateError"), Ia = (n) => (e) => {
  const t = n.get(e);
  if (t === void 0)
    throw de();
  return t;
}, Ea = (n, e) => (t) => {
  let s = n.get(t);
  if (s !== void 0)
    return s;
  if (e === null)
    throw new Error("Missing the native OfflineAudioContext constructor.");
  return s = new e(1, 1, 44100), n.set(t, s), s;
}, Pa = (n) => (e) => {
  const t = n.get(e);
  if (t === void 0)
    throw new Error("The context has no set of AudioWorkletNodes.");
  return t;
}, en = () => new DOMException("", "InvalidAccessError"), Oa = (n) => {
  n.getFrequencyResponse = /* @__PURE__ */ ((e) => (t, s, r) => {
    if (t.length !== s.length || s.length !== r.length)
      throw en();
    return e.call(n, t, s, r);
  })(n.getFrequencyResponse);
}, xa = {
  channelCount: 2,
  channelCountMode: "max",
  channelInterpretation: "speakers"
}, Da = (n, e, t, s, r, o) => class extends n {
  constructor(a, l) {
    const c = s(a), u = r(c), d = { ...xa, ...l }, f = e(c, u ? null : a.baseLatency, d), m = u ? t(d.feedback, d.feedforward) : null;
    super(a, !1, f, m), Oa(f), this._nativeIIRFilterNode = f, o(this, 1);
  }
  getFrequencyResponse(a, l, c) {
    return this._nativeIIRFilterNode.getFrequencyResponse(a, l, c);
  }
}, hr = (n, e, t, s, r, o, i, a, l, c, u) => {
  const d = c.length;
  let f = a;
  for (let m = 0; m < d; m += 1) {
    let h = t[0] * c[m];
    for (let p = 1; p < r; p += 1) {
      const C = f - p & l - 1;
      h += t[p] * o[C], h -= n[p] * i[C];
    }
    for (let p = r; p < s; p += 1)
      h += t[p] * o[f - p & l - 1];
    for (let p = r; p < e; p += 1)
      h -= n[p] * i[f - p & l - 1];
    o[f] = c[m], i[f] = h, f = f + 1 & l - 1, u[m] = h;
  }
  return f;
}, Ra = (n, e, t, s) => {
  const r = t instanceof Float64Array ? t : new Float64Array(t), o = s instanceof Float64Array ? s : new Float64Array(s), i = r.length, a = o.length, l = Math.min(i, a);
  if (r[0] !== 1) {
    for (let h = 0; h < i; h += 1)
      o[h] /= r[0];
    for (let h = 1; h < a; h += 1)
      r[h] /= r[0];
  }
  const c = 32, u = new Float32Array(c), d = new Float32Array(c), f = e.createBuffer(n.numberOfChannels, n.length, n.sampleRate), m = n.numberOfChannels;
  for (let h = 0; h < m; h += 1) {
    const p = n.getChannelData(h), C = f.getChannelData(h);
    u.fill(0), d.fill(0), hr(r, i, o, a, l, u, d, 0, c, p, C);
  }
  return f;
}, Fa = (n, e, t, s, r) => (o, i) => {
  const a = /* @__PURE__ */ new WeakMap();
  let l = null;
  const c = async (u, d) => {
    let f = null, m = e(u);
    const h = me(m, d);
    if (d.createIIRFilter === void 0 ? f = n(d, {
      buffer: null,
      channelCount: 2,
      channelCountMode: "max",
      channelInterpretation: "speakers",
      loop: !1,
      loopEnd: 0,
      loopStart: 0,
      playbackRate: 1
    }) : h || (m = d.createIIRFilter(i, o)), a.set(d, f === null ? m : f), f !== null) {
      if (l === null) {
        if (t === null)
          throw new Error("Missing the native OfflineAudioContext constructor.");
        const C = new t(
          // Bug #47: The AudioDestinationNode in Safari gets not initialized correctly.
          u.context.destination.channelCount,
          // Bug #17: Safari does not yet expose the length.
          u.context.length,
          d.sampleRate
        );
        l = (async () => {
          await s(u, C, C.destination);
          const T = await r(C);
          return Ra(T, d, o, i);
        })();
      }
      const p = await l;
      return f.buffer = p, f.start(0), f;
    }
    return await s(u, d, m), m;
  };
  return {
    render(u, d) {
      const f = a.get(d);
      return f !== void 0 ? Promise.resolve(f) : c(u, d);
    }
  };
}, ka = (n, e, t, s, r, o) => (i) => (a, l) => {
  const c = n.get(a);
  if (c === void 0) {
    if (!i && o(a)) {
      const u = s(a), { outputs: d } = t(a);
      for (const f of d)
        if (Mt(f)) {
          const m = s(f[0]);
          e(u, m, f[1], f[2]);
        } else {
          const m = r(f[0]);
          u.disconnect(m, f[1]);
        }
    }
    n.set(a, l);
  } else
    n.set(a, c + l);
}, Ba = (n, e) => (t) => {
  const s = n.get(t);
  return e(s) || e(t);
}, La = (n, e) => (t) => n.has(t) || e(t), Va = (n, e) => (t) => n.has(t) || e(t), Wa = (n, e) => (t) => {
  const s = n.get(t);
  return e(s) || e(t);
}, Ga = (n) => (e) => n !== null && e instanceof n, qa = (n) => (e) => n !== null && typeof n.AudioNode == "function" && e instanceof n.AudioNode, $a = (n) => (e) => n !== null && typeof n.AudioParam == "function" && e instanceof n.AudioParam, Ua = (n, e) => (t) => n(t) || e(t), Ha = (n) => (e) => n !== null && e instanceof n, ja = (n) => n !== null && n.isSecureContext, za = (n, e, t, s) => class extends n {
  constructor(o, i) {
    const a = t(o), l = e(a, i);
    if (s(a))
      throw TypeError();
    super(o, !0, l, null), this._nativeMediaElementAudioSourceNode = l;
  }
  get mediaElement() {
    return this._nativeMediaElementAudioSourceNode.mediaElement;
  }
}, Xa = {
  channelCount: 2,
  channelCountMode: "explicit",
  channelInterpretation: "speakers"
}, Ja = (n, e, t, s) => class extends n {
  constructor(o, i) {
    const a = t(o);
    if (s(a))
      throw new TypeError();
    const l = { ...Xa, ...i }, c = e(a, l);
    super(o, !1, c, null), this._nativeMediaStreamAudioDestinationNode = c;
  }
  get stream() {
    return this._nativeMediaStreamAudioDestinationNode.stream;
  }
}, Ya = (n, e, t, s) => class extends n {
  constructor(o, i) {
    const a = t(o), l = e(a, i);
    if (s(a))
      throw new TypeError();
    super(o, !0, l, null), this._nativeMediaStreamAudioSourceNode = l;
  }
  get mediaStream() {
    return this._nativeMediaStreamAudioSourceNode.mediaStream;
  }
}, Za = (n, e, t) => class extends n {
  constructor(r, o) {
    const i = t(r), a = e(i, o);
    super(r, !0, a, null);
  }
}, Qa = (n, e, t, s, r, o) => class extends t {
  constructor(a, l) {
    super(a), this._nativeContext = a, Qt.set(this, a), s(a) && r.set(a, /* @__PURE__ */ new Set()), this._destination = new n(this, l), this._listener = e(this, a), this._onstatechange = null;
  }
  get currentTime() {
    return this._nativeContext.currentTime;
  }
  get destination() {
    return this._destination;
  }
  get listener() {
    return this._listener;
  }
  get onstatechange() {
    return this._onstatechange;
  }
  set onstatechange(a) {
    const l = typeof a == "function" ? o(this, a) : null;
    this._nativeContext.onstatechange = l;
    const c = this._nativeContext.onstatechange;
    this._onstatechange = c !== null && c === l ? a : c;
  }
  get sampleRate() {
    return this._nativeContext.sampleRate;
  }
  get state() {
    return this._nativeContext.state;
  }
}, Tt = (n) => {
  const e = new Uint32Array([1179011410, 40, 1163280727, 544501094, 16, 131073, 44100, 176400, 1048580, 1635017060, 4, 0]);
  try {
    const t = n.decodeAudioData(e.buffer, () => {
    });
    return t === void 0 ? !1 : (t.catch(() => {
    }), !0);
  } catch {
  }
  return !1;
}, Ka = (n, e) => (t, s, r) => {
  const o = /* @__PURE__ */ new Set();
  return t.connect = /* @__PURE__ */ ((i) => (a, l = 0, c = 0) => {
    const u = o.size === 0;
    if (e(a))
      return i.call(t, a, l, c), n(o, [a, l, c], (d) => d[0] === a && d[1] === l && d[2] === c, !0), u && s(), a;
    i.call(t, a, l), n(o, [a, l], (d) => d[0] === a && d[1] === l, !0), u && s();
  })(t.connect), t.disconnect = /* @__PURE__ */ ((i) => (a, l, c) => {
    const u = o.size > 0;
    if (a === void 0)
      i.apply(t), o.clear();
    else if (typeof a == "number") {
      i.call(t, a);
      for (const f of o)
        f[1] === a && o.delete(f);
    } else {
      e(a) ? i.call(t, a, l, c) : i.call(t, a, l);
      for (const f of o)
        f[0] === a && (l === void 0 || f[1] === l) && (c === void 0 || f[2] === c) && o.delete(f);
    }
    const d = o.size === 0;
    u && d && r();
  })(t.disconnect), t;
}, oe = (n, e, t) => {
  const s = e[t];
  s !== void 0 && s !== n[t] && (n[t] = s);
}, ue = (n, e) => {
  oe(n, e, "channelCount"), oe(n, e, "channelCountMode"), oe(n, e, "channelInterpretation");
}, Bs = (n) => typeof n.getFloatTimeDomainData == "function", ec = (n) => {
  n.getFloatTimeDomainData = (e) => {
    const t = new Uint8Array(e.length);
    n.getByteTimeDomainData(t);
    const s = Math.max(t.length, n.fftSize);
    for (let r = 0; r < s; r += 1)
      e[r] = (t[r] - 128) * 78125e-7;
    return e;
  };
}, tc = (n, e) => (t, s) => {
  const r = t.createAnalyser();
  if (ue(r, s), !(s.maxDecibels > s.minDecibels))
    throw e();
  return oe(r, s, "fftSize"), oe(r, s, "maxDecibels"), oe(r, s, "minDecibels"), oe(r, s, "smoothingTimeConstant"), n(Bs, () => Bs(r)) || ec(r), r;
}, nc = (n) => n === null ? null : n.hasOwnProperty("AudioBuffer") ? n.AudioBuffer : null, ae = (n, e, t) => {
  const s = e[t];
  s !== void 0 && s !== n[t].value && (n[t].value = s);
}, sc = (n) => {
  n.start = /* @__PURE__ */ ((e) => {
    let t = !1;
    return (s = 0, r = 0, o) => {
      if (t)
        throw de();
      e.call(n, s, r, o), t = !0;
    };
  })(n.start);
}, Fn = (n) => {
  n.start = /* @__PURE__ */ ((e) => (t = 0, s = 0, r) => {
    if (typeof r == "number" && r < 0 || s < 0 || t < 0)
      throw new RangeError("The parameters can't be negative.");
    e.call(n, t, s, r);
  })(n.start);
}, kn = (n) => {
  n.stop = /* @__PURE__ */ ((e) => (t = 0) => {
    if (t < 0)
      throw new RangeError("The parameter can't be negative.");
    e.call(n, t);
  })(n.stop);
}, rc = (n, e, t, s, r, o, i, a, l, c, u) => (d, f) => {
  const m = d.createBufferSource();
  return ue(m, f), ae(m, f, "playbackRate"), oe(m, f, "buffer"), oe(m, f, "loop"), oe(m, f, "loopEnd"), oe(m, f, "loopStart"), e(t, () => t(d)) || sc(m), e(s, () => s(d)) || l(m), e(r, () => r(d)) || c(m, d), e(o, () => o(d)) || Fn(m), e(i, () => i(d)) || u(m, d), e(a, () => a(d)) || kn(m), n(d, m), m;
}, oc = (n) => n === null ? null : n.hasOwnProperty("AudioContext") ? n.AudioContext : n.hasOwnProperty("webkitAudioContext") ? n.webkitAudioContext : null, ic = (n, e) => (t, s, r) => {
  const o = t.destination;
  if (o.channelCount !== s)
    try {
      o.channelCount = s;
    } catch {
    }
  r && o.channelCountMode !== "explicit" && (o.channelCountMode = "explicit"), o.maxChannelCount === 0 && Object.defineProperty(o, "maxChannelCount", {
    value: s
  });
  const i = n(t, {
    channelCount: s,
    channelCountMode: o.channelCountMode,
    channelInterpretation: o.channelInterpretation,
    gain: 1
  });
  return e(i, "channelCount", (a) => () => a.call(i), (a) => (l) => {
    a.call(i, l);
    try {
      o.channelCount = l;
    } catch (c) {
      if (l > o.maxChannelCount)
        throw c;
    }
  }), e(i, "channelCountMode", (a) => () => a.call(i), (a) => (l) => {
    a.call(i, l), o.channelCountMode = l;
  }), e(i, "channelInterpretation", (a) => () => a.call(i), (a) => (l) => {
    a.call(i, l), o.channelInterpretation = l;
  }), Object.defineProperty(i, "maxChannelCount", {
    get: () => o.maxChannelCount
  }), i.connect(o), i;
}, ac = (n) => n === null ? null : n.hasOwnProperty("AudioWorkletNode") ? n.AudioWorkletNode : null, cc = (n) => {
  const { port1: e } = new MessageChannel();
  try {
    e.postMessage(n);
  } finally {
    e.close();
  }
}, lc = (n, e, t, s, r) => (o, i, a, l, c, u) => {
  if (a !== null)
    try {
      const d = new a(o, l, u), f = /* @__PURE__ */ new Map();
      let m = null;
      if (Object.defineProperties(d, {
        /*
         * Bug #61: Overwriting the property accessors for channelCount and channelCountMode is necessary as long as some
         * browsers have no native implementation to achieve a consistent behavior.
         */
        channelCount: {
          get: () => u.channelCount,
          set: () => {
            throw n();
          }
        },
        channelCountMode: {
          get: () => "explicit",
          set: () => {
            throw n();
          }
        },
        // Bug #156: Chrome and Edge do not yet fire an ErrorEvent.
        onprocessorerror: {
          get: () => m,
          set: (h) => {
            typeof m == "function" && d.removeEventListener("processorerror", m), m = typeof h == "function" ? h : null, typeof m == "function" && d.addEventListener("processorerror", m);
          }
        }
      }), d.addEventListener = /* @__PURE__ */ ((h) => (...p) => {
        if (p[0] === "processorerror") {
          const C = typeof p[1] == "function" ? p[1] : typeof p[1] == "object" && p[1] !== null && typeof p[1].handleEvent == "function" ? p[1].handleEvent : null;
          if (C !== null) {
            const T = f.get(p[1]);
            T !== void 0 ? p[1] = T : (p[1] = (S) => {
              S.type === "error" ? (Object.defineProperties(S, {
                type: { value: "processorerror" }
              }), C(S)) : C(new ErrorEvent(p[0], { ...S }));
            }, f.set(C, p[1]));
          }
        }
        return h.call(d, "error", p[1], p[2]), h.call(d, ...p);
      })(d.addEventListener), d.removeEventListener = /* @__PURE__ */ ((h) => (...p) => {
        if (p[0] === "processorerror") {
          const C = f.get(p[1]);
          C !== void 0 && (f.delete(p[1]), p[1] = C);
        }
        return h.call(d, "error", p[1], p[2]), h.call(d, p[0], p[1], p[2]);
      })(d.removeEventListener), u.numberOfOutputs !== 0) {
        const h = t(o, {
          channelCount: 1,
          channelCountMode: "explicit",
          channelInterpretation: "discrete",
          gain: 0
        });
        return d.connect(h).connect(o.destination), r(d, () => h.disconnect(), () => h.connect(o.destination));
      }
      return d;
    } catch (d) {
      throw d.code === 11 ? s() : d;
    }
  if (c === void 0)
    throw s();
  return cc(u), e(o, i, c, u);
}, fr = (n, e) => n === null ? 512 : Math.max(512, Math.min(16384, Math.pow(2, Math.round(Math.log2(n * e))))), uc = (n) => new Promise((e, t) => {
  const { port1: s, port2: r } = new MessageChannel();
  s.onmessage = ({ data: o }) => {
    s.close(), r.close(), e(o);
  }, s.onmessageerror = ({ data: o }) => {
    s.close(), r.close(), t(o);
  }, r.postMessage(n);
}), dc = async (n, e) => {
  const t = await uc(e);
  return new n(t);
}, hc = (n, e, t, s) => {
  let r = Tn.get(n);
  r === void 0 && (r = /* @__PURE__ */ new WeakMap(), Tn.set(n, r));
  const o = dc(t, s);
  return r.set(e, o), o;
}, fc = (n, e, t, s, r, o, i, a, l, c, u, d, f) => (m, h, p, C) => {
  if (C.numberOfInputs === 0 && C.numberOfOutputs === 0)
    throw l();
  const T = Array.isArray(C.outputChannelCount) ? C.outputChannelCount : Array.from(C.outputChannelCount);
  if (T.some((G) => G < 1))
    throw l();
  if (T.length !== C.numberOfOutputs)
    throw e();
  if (C.channelCountMode !== "explicit")
    throw l();
  const S = C.channelCount * C.numberOfInputs, N = T.reduce((G, H) => G + H, 0), M = p.parameterDescriptors === void 0 ? 0 : p.parameterDescriptors.length;
  if (S + M > 6 || N > 6)
    throw l();
  const g = new MessageChannel(), y = [], v = [];
  for (let G = 0; G < C.numberOfInputs; G += 1)
    y.push(i(m, {
      channelCount: C.channelCount,
      channelCountMode: C.channelCountMode,
      channelInterpretation: C.channelInterpretation,
      gain: 1
    })), v.push(r(m, {
      channelCount: C.channelCount,
      channelCountMode: "explicit",
      channelInterpretation: "discrete",
      numberOfOutputs: C.channelCount
    }));
  const _ = [];
  if (p.parameterDescriptors !== void 0)
    for (const { defaultValue: G, maxValue: H, minValue: ie, name: Q } of p.parameterDescriptors) {
      const X = o(m, {
        channelCount: 1,
        channelCountMode: "explicit",
        channelInterpretation: "discrete",
        offset: C.parameterData[Q] !== void 0 ? C.parameterData[Q] : G === void 0 ? 0 : G
      });
      Object.defineProperties(X.offset, {
        defaultValue: {
          get: () => G === void 0 ? 0 : G
        },
        maxValue: {
          get: () => H === void 0 ? ge : H
        },
        minValue: {
          get: () => ie === void 0 ? ve : ie
        }
      }), _.push(X);
    }
  const E = s(m, {
    channelCount: 1,
    channelCountMode: "explicit",
    channelInterpretation: "speakers",
    numberOfInputs: Math.max(1, S + M)
  }), F = fr(h, m.sampleRate), P = a(
    m,
    F,
    S + M,
    // Bug #87: Only Firefox will fire an AudioProcessingEvent if there is no connected output.
    Math.max(1, N)
  ), I = r(m, {
    channelCount: Math.max(1, N),
    channelCountMode: "explicit",
    channelInterpretation: "discrete",
    numberOfOutputs: Math.max(1, N)
  }), D = [];
  for (let G = 0; G < C.numberOfOutputs; G += 1)
    D.push(s(m, {
      channelCount: 1,
      channelCountMode: "explicit",
      channelInterpretation: "speakers",
      numberOfInputs: T[G]
    }));
  for (let G = 0; G < C.numberOfInputs; G += 1) {
    y[G].connect(v[G]);
    for (let H = 0; H < C.channelCount; H += 1)
      v[G].connect(E, H, G * C.channelCount + H);
  }
  const w = new ur(p.parameterDescriptors === void 0 ? [] : p.parameterDescriptors.map(({ name: G }, H) => {
    const ie = _[H];
    return ie.connect(E, 0, S + H), ie.start(0), [G, ie.offset];
  }));
  E.connect(P);
  let O = C.channelInterpretation, b = null;
  const A = C.numberOfOutputs === 0 ? [P] : D, x = {
    get bufferSize() {
      return F;
    },
    get channelCount() {
      return C.channelCount;
    },
    set channelCount(G) {
      throw t();
    },
    get channelCountMode() {
      return C.channelCountMode;
    },
    set channelCountMode(G) {
      throw t();
    },
    get channelInterpretation() {
      return O;
    },
    set channelInterpretation(G) {
      for (const H of y)
        H.channelInterpretation = G;
      O = G;
    },
    get context() {
      return P.context;
    },
    get inputs() {
      return y;
    },
    get numberOfInputs() {
      return C.numberOfInputs;
    },
    get numberOfOutputs() {
      return C.numberOfOutputs;
    },
    get onprocessorerror() {
      return b;
    },
    set onprocessorerror(G) {
      typeof b == "function" && x.removeEventListener("processorerror", b), b = typeof G == "function" ? G : null, typeof b == "function" && x.addEventListener("processorerror", b);
    },
    get parameters() {
      return w;
    },
    get port() {
      return g.port2;
    },
    addEventListener(...G) {
      return P.addEventListener(G[0], G[1], G[2]);
    },
    connect: n.bind(null, A),
    disconnect: c.bind(null, A),
    dispatchEvent(...G) {
      return P.dispatchEvent(G[0]);
    },
    removeEventListener(...G) {
      return P.removeEventListener(G[0], G[1], G[2]);
    }
  }, R = /* @__PURE__ */ new Map();
  g.port1.addEventListener = /* @__PURE__ */ ((G) => (...H) => {
    if (H[0] === "message") {
      const ie = typeof H[1] == "function" ? H[1] : typeof H[1] == "object" && H[1] !== null && typeof H[1].handleEvent == "function" ? H[1].handleEvent : null;
      if (ie !== null) {
        const Q = R.get(H[1]);
        Q !== void 0 ? H[1] = Q : (H[1] = (X) => {
          u(m.currentTime, m.sampleRate, () => ie(X));
        }, R.set(ie, H[1]));
      }
    }
    return G.call(g.port1, H[0], H[1], H[2]);
  })(g.port1.addEventListener), g.port1.removeEventListener = /* @__PURE__ */ ((G) => (...H) => {
    if (H[0] === "message") {
      const ie = R.get(H[1]);
      ie !== void 0 && (R.delete(H[1]), H[1] = ie);
    }
    return G.call(g.port1, H[0], H[1], H[2]);
  })(g.port1.removeEventListener);
  let B = null;
  Object.defineProperty(g.port1, "onmessage", {
    get: () => B,
    set: (G) => {
      typeof B == "function" && g.port1.removeEventListener("message", B), B = typeof G == "function" ? G : null, typeof B == "function" && (g.port1.addEventListener("message", B), g.port1.start());
    }
  }), p.prototype.port = g.port1;
  let k = null;
  hc(m, x, p, C).then((G) => k = G);
  const $ = Jt(C.numberOfInputs, C.channelCount), U = Jt(C.numberOfOutputs, T), q = p.parameterDescriptors === void 0 ? [] : p.parameterDescriptors.reduce((G, { name: H }) => ({ ...G, [H]: new Float32Array(128) }), {});
  let z = !0;
  const j = () => {
    C.numberOfOutputs > 0 && P.disconnect(I);
    for (let G = 0, H = 0; G < C.numberOfOutputs; G += 1) {
      const ie = D[G];
      for (let Q = 0; Q < T[G]; Q += 1)
        I.disconnect(ie, H + Q, Q);
      H += T[G];
    }
  }, W = /* @__PURE__ */ new Map();
  P.onaudioprocess = ({ inputBuffer: G, outputBuffer: H }) => {
    if (k !== null) {
      const ie = d(x);
      for (let Q = 0; Q < F; Q += 128) {
        for (let X = 0; X < C.numberOfInputs; X += 1)
          for (let K = 0; K < C.channelCount; K += 1)
            Xt(G, $[X], K, K, Q);
        p.parameterDescriptors !== void 0 && p.parameterDescriptors.forEach(({ name: X }, K) => {
          Xt(G, q, X, S + K, Q);
        });
        for (let X = 0; X < C.numberOfInputs; X += 1)
          for (let K = 0; K < T[X]; K += 1)
            U[X][K].byteLength === 0 && (U[X][K] = new Float32Array(128));
        try {
          const X = $.map((pe, we) => {
            if (ie[we].size > 0)
              return W.set(we, F / 128), pe;
            const He = W.get(we);
            return He === void 0 ? [] : (pe.every((yt) => yt.every((un) => un === 0)) && (He === 1 ? W.delete(we) : W.set(we, He - 1)), pe);
          });
          z = u(m.currentTime + Q / m.sampleRate, m.sampleRate, () => k.process(X, U, q));
          for (let pe = 0, we = 0; pe < C.numberOfOutputs; pe += 1) {
            for (let Ne = 0; Ne < T[pe]; Ne += 1)
              dr(H, U[pe], Ne, we + Ne, Q);
            we += T[pe];
          }
        } catch (X) {
          z = !1, x.dispatchEvent(new ErrorEvent("processorerror", {
            colno: X.colno,
            filename: X.filename,
            lineno: X.lineno,
            message: X.message
          }));
        }
        if (!z) {
          for (let X = 0; X < C.numberOfInputs; X += 1) {
            y[X].disconnect(v[X]);
            for (let K = 0; K < C.channelCount; K += 1)
              v[Q].disconnect(E, K, X * C.channelCount + K);
          }
          if (p.parameterDescriptors !== void 0) {
            const X = p.parameterDescriptors.length;
            for (let K = 0; K < X; K += 1) {
              const pe = _[K];
              pe.disconnect(E, 0, S + K), pe.stop();
            }
          }
          E.disconnect(P), P.onaudioprocess = null, re ? j() : Ve();
          break;
        }
      }
    }
  };
  let re = !1;
  const fe = i(m, {
    channelCount: 1,
    channelCountMode: "explicit",
    channelInterpretation: "discrete",
    gain: 0
  }), ne = () => P.connect(fe).connect(m.destination), Ve = () => {
    P.disconnect(fe), fe.disconnect();
  }, ln = () => {
    if (z) {
      Ve(), C.numberOfOutputs > 0 && P.connect(I);
      for (let G = 0, H = 0; G < C.numberOfOutputs; G += 1) {
        const ie = D[G];
        for (let Q = 0; Q < T[G]; Q += 1)
          I.connect(ie, H + Q, Q);
        H += T[G];
      }
    }
    re = !0;
  }, Dt = () => {
    z && (ne(), j()), re = !1;
  };
  return ne(), f(x, ln, Dt);
}, mr = (n, e) => {
  const t = n.createBiquadFilter();
  return ue(t, e), ae(t, e, "Q"), ae(t, e, "detune"), ae(t, e, "frequency"), ae(t, e, "gain"), oe(t, e, "type"), t;
}, mc = (n, e) => (t, s) => {
  const r = t.createChannelMerger(s.numberOfInputs);
  return n !== null && n.name === "webkitAudioContext" && e(t, r), ue(r, s), r;
}, pc = (n) => {
  const e = n.numberOfOutputs;
  Object.defineProperty(n, "channelCount", {
    get: () => e,
    set: (t) => {
      if (t !== e)
        throw de();
    }
  }), Object.defineProperty(n, "channelCountMode", {
    get: () => "explicit",
    set: (t) => {
      if (t !== "explicit")
        throw de();
    }
  }), Object.defineProperty(n, "channelInterpretation", {
    get: () => "discrete",
    set: (t) => {
      if (t !== "discrete")
        throw de();
    }
  });
}, It = (n, e) => {
  const t = n.createChannelSplitter(e.numberOfOutputs);
  return ue(t, e), pc(t), t;
}, gc = (n, e, t, s, r) => (o, i) => {
  if (o.createConstantSource === void 0)
    return t(o, i);
  const a = o.createConstantSource();
  return ue(a, i), ae(a, i, "offset"), e(s, () => s(o)) || Fn(a), e(r, () => r(o)) || kn(a), n(o, a), a;
}, ht = (n, e) => (n.connect = e.connect.bind(e), n.disconnect = e.disconnect.bind(e), n), yc = (n, e, t, s) => (r, { offset: o, ...i }) => {
  const a = r.createBuffer(1, 2, 44100), l = e(r, {
    buffer: null,
    channelCount: 2,
    channelCountMode: "max",
    channelInterpretation: "speakers",
    loop: !1,
    loopEnd: 0,
    loopStart: 0,
    playbackRate: 1
  }), c = t(r, { ...i, gain: o }), u = a.getChannelData(0);
  u[0] = 1, u[1] = 1, l.buffer = a, l.loop = !0;
  const d = {
    get bufferSize() {
    },
    get channelCount() {
      return c.channelCount;
    },
    set channelCount(h) {
      c.channelCount = h;
    },
    get channelCountMode() {
      return c.channelCountMode;
    },
    set channelCountMode(h) {
      c.channelCountMode = h;
    },
    get channelInterpretation() {
      return c.channelInterpretation;
    },
    set channelInterpretation(h) {
      c.channelInterpretation = h;
    },
    get context() {
      return c.context;
    },
    get inputs() {
      return [];
    },
    get numberOfInputs() {
      return l.numberOfInputs;
    },
    get numberOfOutputs() {
      return c.numberOfOutputs;
    },
    get offset() {
      return c.gain;
    },
    get onended() {
      return l.onended;
    },
    set onended(h) {
      l.onended = h;
    },
    addEventListener(...h) {
      return l.addEventListener(h[0], h[1], h[2]);
    },
    dispatchEvent(...h) {
      return l.dispatchEvent(h[0]);
    },
    removeEventListener(...h) {
      return l.removeEventListener(h[0], h[1], h[2]);
    },
    start(h = 0) {
      l.start.call(l, h);
    },
    stop(h = 0) {
      l.stop.call(l, h);
    }
  }, f = () => l.connect(c), m = () => l.disconnect(c);
  return n(r, l), s(ht(d, c), f, m);
}, Sc = (n, e) => (t, s) => {
  const r = t.createConvolver();
  if (ue(r, s), s.disableNormalization === r.normalize && (r.normalize = !s.disableNormalization), oe(r, s, "buffer"), s.channelCount > 2 || (e(r, "channelCount", (o) => () => o.call(r), (o) => (i) => {
    if (i > 2)
      throw n();
    return o.call(r, i);
  }), s.channelCountMode === "max"))
    throw n();
  return e(r, "channelCountMode", (o) => () => o.call(r), (o) => (i) => {
    if (i === "max")
      throw n();
    return o.call(r, i);
  }), r;
}, pr = (n, e) => {
  const t = n.createDelay(e.maxDelayTime);
  return ue(t, e), ae(t, e, "delayTime"), t;
}, Cc = (n) => (e, t) => {
  const s = e.createDynamicsCompressor();
  if (ue(s, t), t.channelCount > 2 || t.channelCountMode === "max")
    throw n();
  return ae(s, t, "attack"), ae(s, t, "knee"), ae(s, t, "ratio"), ae(s, t, "release"), ae(s, t, "threshold"), s;
}, _e = (n, e) => {
  const t = n.createGain();
  return ue(t, e), ae(t, e, "gain"), t;
}, vc = (n) => (e, t, s) => {
  if (e.createIIRFilter === void 0)
    return n(e, t, s);
  const r = e.createIIRFilter(s.feedforward, s.feedback);
  return ue(r, s), r;
};
function _c(n, e) {
  const t = e[0] * e[0] + e[1] * e[1];
  return [(n[0] * e[0] + n[1] * e[1]) / t, (n[1] * e[0] - n[0] * e[1]) / t];
}
function Tc(n, e) {
  return [n[0] * e[0] - n[1] * e[1], n[0] * e[1] + n[1] * e[0]];
}
function Ls(n, e) {
  let t = [0, 0];
  for (let s = n.length - 1; s >= 0; s -= 1)
    t = Tc(t, e), t[0] += n[s];
  return t;
}
const Nc = (n, e, t, s) => (r, o, { channelCount: i, channelCountMode: a, channelInterpretation: l, feedback: c, feedforward: u }) => {
  const d = fr(o, r.sampleRate), f = c instanceof Float64Array ? c : new Float64Array(c), m = u instanceof Float64Array ? u : new Float64Array(u), h = f.length, p = m.length, C = Math.min(h, p);
  if (h === 0 || h > 20)
    throw s();
  if (f[0] === 0)
    throw e();
  if (p === 0 || p > 20)
    throw s();
  if (m[0] === 0)
    throw e();
  if (f[0] !== 1) {
    for (let _ = 0; _ < p; _ += 1)
      m[_] /= f[0];
    for (let _ = 1; _ < h; _ += 1)
      f[_] /= f[0];
  }
  const T = t(r, d, i, i);
  T.channelCount = i, T.channelCountMode = a, T.channelInterpretation = l;
  const S = 32, N = [], M = [], g = [];
  for (let _ = 0; _ < i; _ += 1) {
    N.push(0);
    const E = new Float32Array(S), F = new Float32Array(S);
    E.fill(0), F.fill(0), M.push(E), g.push(F);
  }
  T.onaudioprocess = (_) => {
    const E = _.inputBuffer, F = _.outputBuffer, P = E.numberOfChannels;
    for (let I = 0; I < P; I += 1) {
      const D = E.getChannelData(I), w = F.getChannelData(I);
      N[I] = hr(f, h, m, p, C, M[I], g[I], N[I], S, D, w);
    }
  };
  const y = r.sampleRate / 2;
  return ht({
    get bufferSize() {
      return d;
    },
    get channelCount() {
      return T.channelCount;
    },
    set channelCount(_) {
      T.channelCount = _;
    },
    get channelCountMode() {
      return T.channelCountMode;
    },
    set channelCountMode(_) {
      T.channelCountMode = _;
    },
    get channelInterpretation() {
      return T.channelInterpretation;
    },
    set channelInterpretation(_) {
      T.channelInterpretation = _;
    },
    get context() {
      return T.context;
    },
    get inputs() {
      return [T];
    },
    get numberOfInputs() {
      return T.numberOfInputs;
    },
    get numberOfOutputs() {
      return T.numberOfOutputs;
    },
    addEventListener(..._) {
      return T.addEventListener(_[0], _[1], _[2]);
    },
    dispatchEvent(..._) {
      return T.dispatchEvent(_[0]);
    },
    getFrequencyResponse(_, E, F) {
      if (_.length !== E.length || E.length !== F.length)
        throw n();
      const P = _.length;
      for (let I = 0; I < P; I += 1) {
        const D = -Math.PI * (_[I] / y), w = [Math.cos(D), Math.sin(D)], O = Ls(m, w), b = Ls(f, w), A = _c(O, b);
        E[I] = Math.sqrt(A[0] * A[0] + A[1] * A[1]), F[I] = Math.atan2(A[1], A[0]);
      }
    },
    removeEventListener(..._) {
      return T.removeEventListener(_[0], _[1], _[2]);
    }
  }, T);
}, wc = (n, e) => n.createMediaElementSource(e.mediaElement), bc = (n, e) => {
  const t = n.createMediaStreamDestination();
  return ue(t, e), t.numberOfOutputs === 1 && Object.defineProperty(t, "numberOfOutputs", { get: () => 0 }), t;
}, Ac = (n, { mediaStream: e }) => {
  const t = e.getAudioTracks();
  t.sort((o, i) => o.id < i.id ? -1 : o.id > i.id ? 1 : 0);
  const s = t.slice(0, 1), r = n.createMediaStreamSource(new MediaStream(s));
  return Object.defineProperty(r, "mediaStream", { value: e }), r;
}, Mc = (n, e) => (t, { mediaStreamTrack: s }) => {
  if (typeof t.createMediaStreamTrackSource == "function")
    return t.createMediaStreamTrackSource(s);
  const r = new MediaStream([s]), o = t.createMediaStreamSource(r);
  if (s.kind !== "audio")
    throw n();
  if (e(t))
    throw new TypeError();
  return o;
}, Ic = (n) => n === null ? null : n.hasOwnProperty("OfflineAudioContext") ? n.OfflineAudioContext : n.hasOwnProperty("webkitOfflineAudioContext") ? n.webkitOfflineAudioContext : null, Ec = (n, e, t, s, r, o) => (i, a) => {
  const l = i.createOscillator();
  return ue(l, a), ae(l, a, "detune"), ae(l, a, "frequency"), a.periodicWave !== void 0 ? l.setPeriodicWave(a.periodicWave) : oe(l, a, "type"), e(t, () => t(i)) || Fn(l), e(s, () => s(i)) || o(l, i), e(r, () => r(i)) || kn(l), n(i, l), l;
}, Pc = (n) => (e, t) => {
  const s = e.createPanner();
  return s.orientationX === void 0 ? n(e, t) : (ue(s, t), ae(s, t, "orientationX"), ae(s, t, "orientationY"), ae(s, t, "orientationZ"), ae(s, t, "positionX"), ae(s, t, "positionY"), ae(s, t, "positionZ"), oe(s, t, "coneInnerAngle"), oe(s, t, "coneOuterAngle"), oe(s, t, "coneOuterGain"), oe(s, t, "distanceModel"), oe(s, t, "maxDistance"), oe(s, t, "panningModel"), oe(s, t, "refDistance"), oe(s, t, "rolloffFactor"), s);
}, Oc = (n, e, t, s, r, o, i, a, l, c) => (u, { coneInnerAngle: d, coneOuterAngle: f, coneOuterGain: m, distanceModel: h, maxDistance: p, orientationX: C, orientationY: T, orientationZ: S, panningModel: N, positionX: M, positionY: g, positionZ: y, refDistance: v, rolloffFactor: _, ...E }) => {
  const F = u.createPanner();
  if (E.channelCount > 2 || E.channelCountMode === "max")
    throw i();
  ue(F, E);
  const P = {
    channelCount: 1,
    channelCountMode: "explicit",
    channelInterpretation: "discrete"
  }, I = t(u, {
    ...P,
    channelInterpretation: "speakers",
    numberOfInputs: 6
  }), D = s(u, { ...E, gain: 1 }), w = s(u, { ...P, gain: 1 }), O = s(u, { ...P, gain: 0 }), b = s(u, { ...P, gain: 0 }), A = s(u, { ...P, gain: 0 }), x = s(u, { ...P, gain: 0 }), R = s(u, { ...P, gain: 0 }), B = r(u, 256, 6, 1), k = o(u, {
    ...P,
    curve: new Float32Array([1, 1]),
    oversample: "none"
  });
  let L = [C, T, S], $ = [M, g, y];
  const U = new Float32Array(1);
  B.onaudioprocess = ({ inputBuffer: W }) => {
    const re = [
      l(W, U, 0),
      l(W, U, 1),
      l(W, U, 2)
    ];
    re.some((ne, Ve) => ne !== L[Ve]) && (F.setOrientation(...re), L = re);
    const fe = [
      l(W, U, 3),
      l(W, U, 4),
      l(W, U, 5)
    ];
    fe.some((ne, Ve) => ne !== $[Ve]) && (F.setPosition(...fe), $ = fe);
  }, Object.defineProperty(O.gain, "defaultValue", { get: () => 0 }), Object.defineProperty(b.gain, "defaultValue", { get: () => 0 }), Object.defineProperty(A.gain, "defaultValue", { get: () => 0 }), Object.defineProperty(x.gain, "defaultValue", { get: () => 0 }), Object.defineProperty(R.gain, "defaultValue", { get: () => 0 });
  const q = {
    get bufferSize() {
    },
    get channelCount() {
      return F.channelCount;
    },
    set channelCount(W) {
      if (W > 2)
        throw i();
      D.channelCount = W, F.channelCount = W;
    },
    get channelCountMode() {
      return F.channelCountMode;
    },
    set channelCountMode(W) {
      if (W === "max")
        throw i();
      D.channelCountMode = W, F.channelCountMode = W;
    },
    get channelInterpretation() {
      return F.channelInterpretation;
    },
    set channelInterpretation(W) {
      D.channelInterpretation = W, F.channelInterpretation = W;
    },
    get coneInnerAngle() {
      return F.coneInnerAngle;
    },
    set coneInnerAngle(W) {
      F.coneInnerAngle = W;
    },
    get coneOuterAngle() {
      return F.coneOuterAngle;
    },
    set coneOuterAngle(W) {
      F.coneOuterAngle = W;
    },
    get coneOuterGain() {
      return F.coneOuterGain;
    },
    set coneOuterGain(W) {
      if (W < 0 || W > 1)
        throw e();
      F.coneOuterGain = W;
    },
    get context() {
      return F.context;
    },
    get distanceModel() {
      return F.distanceModel;
    },
    set distanceModel(W) {
      F.distanceModel = W;
    },
    get inputs() {
      return [D];
    },
    get maxDistance() {
      return F.maxDistance;
    },
    set maxDistance(W) {
      if (W < 0)
        throw new RangeError();
      F.maxDistance = W;
    },
    get numberOfInputs() {
      return F.numberOfInputs;
    },
    get numberOfOutputs() {
      return F.numberOfOutputs;
    },
    get orientationX() {
      return w.gain;
    },
    get orientationY() {
      return O.gain;
    },
    get orientationZ() {
      return b.gain;
    },
    get panningModel() {
      return F.panningModel;
    },
    set panningModel(W) {
      F.panningModel = W;
    },
    get positionX() {
      return A.gain;
    },
    get positionY() {
      return x.gain;
    },
    get positionZ() {
      return R.gain;
    },
    get refDistance() {
      return F.refDistance;
    },
    set refDistance(W) {
      if (W < 0)
        throw new RangeError();
      F.refDistance = W;
    },
    get rolloffFactor() {
      return F.rolloffFactor;
    },
    set rolloffFactor(W) {
      if (W < 0)
        throw new RangeError();
      F.rolloffFactor = W;
    },
    addEventListener(...W) {
      return D.addEventListener(W[0], W[1], W[2]);
    },
    dispatchEvent(...W) {
      return D.dispatchEvent(W[0]);
    },
    removeEventListener(...W) {
      return D.removeEventListener(W[0], W[1], W[2]);
    }
  };
  d !== q.coneInnerAngle && (q.coneInnerAngle = d), f !== q.coneOuterAngle && (q.coneOuterAngle = f), m !== q.coneOuterGain && (q.coneOuterGain = m), h !== q.distanceModel && (q.distanceModel = h), p !== q.maxDistance && (q.maxDistance = p), C !== q.orientationX.value && (q.orientationX.value = C), T !== q.orientationY.value && (q.orientationY.value = T), S !== q.orientationZ.value && (q.orientationZ.value = S), N !== q.panningModel && (q.panningModel = N), M !== q.positionX.value && (q.positionX.value = M), g !== q.positionY.value && (q.positionY.value = g), y !== q.positionZ.value && (q.positionZ.value = y), v !== q.refDistance && (q.refDistance = v), _ !== q.rolloffFactor && (q.rolloffFactor = _), (L[0] !== 1 || L[1] !== 0 || L[2] !== 0) && F.setOrientation(...L), ($[0] !== 0 || $[1] !== 0 || $[2] !== 0) && F.setPosition(...$);
  const z = () => {
    D.connect(F), n(D, k, 0, 0), k.connect(w).connect(I, 0, 0), k.connect(O).connect(I, 0, 1), k.connect(b).connect(I, 0, 2), k.connect(A).connect(I, 0, 3), k.connect(x).connect(I, 0, 4), k.connect(R).connect(I, 0, 5), I.connect(B).connect(u.destination);
  }, j = () => {
    D.disconnect(F), a(D, k, 0, 0), k.disconnect(w), w.disconnect(I), k.disconnect(O), O.disconnect(I), k.disconnect(b), b.disconnect(I), k.disconnect(A), A.disconnect(I), k.disconnect(x), x.disconnect(I), k.disconnect(R), R.disconnect(I), I.disconnect(B), B.disconnect(u.destination);
  };
  return c(ht(q, F), z, j);
}, xc = (n) => (e, { disableNormalization: t, imag: s, real: r }) => {
  const o = s instanceof Float32Array ? s : new Float32Array(s), i = r instanceof Float32Array ? r : new Float32Array(r), a = e.createPeriodicWave(i, o, { disableNormalization: t });
  if (Array.from(s).length < 2)
    throw n();
  return a;
}, Et = (n, e, t, s) => n.createScriptProcessor(e, t, s), Dc = (n, e) => (t, s) => {
  const r = s.channelCountMode;
  if (r === "clamped-max")
    throw e();
  if (t.createStereoPanner === void 0)
    return n(t, s);
  const o = t.createStereoPanner();
  return ue(o, s), ae(o, s, "pan"), Object.defineProperty(o, "channelCountMode", {
    get: () => r,
    set: (i) => {
      if (i !== r)
        throw e();
    }
  }), o;
}, Rc = (n, e, t, s, r, o) => {
  const a = new Float32Array([1, 1]), l = Math.PI / 2, c = { channelCount: 1, channelCountMode: "explicit", channelInterpretation: "discrete" }, u = { ...c, oversample: "none" }, d = (h, p, C, T) => {
    const S = new Float32Array(16385), N = new Float32Array(16385);
    for (let E = 0; E < 16385; E += 1) {
      const F = E / 16384 * l;
      S[E] = Math.cos(F), N[E] = Math.sin(F);
    }
    const M = t(h, { ...c, gain: 0 }), g = s(h, { ...u, curve: S }), y = s(h, { ...u, curve: a }), v = t(h, { ...c, gain: 0 }), _ = s(h, { ...u, curve: N });
    return {
      connectGraph() {
        p.connect(M), p.connect(y.inputs === void 0 ? y : y.inputs[0]), p.connect(v), y.connect(C), C.connect(g.inputs === void 0 ? g : g.inputs[0]), C.connect(_.inputs === void 0 ? _ : _.inputs[0]), g.connect(M.gain), _.connect(v.gain), M.connect(T, 0, 0), v.connect(T, 0, 1);
      },
      disconnectGraph() {
        p.disconnect(M), p.disconnect(y.inputs === void 0 ? y : y.inputs[0]), p.disconnect(v), y.disconnect(C), C.disconnect(g.inputs === void 0 ? g : g.inputs[0]), C.disconnect(_.inputs === void 0 ? _ : _.inputs[0]), g.disconnect(M.gain), _.disconnect(v.gain), M.disconnect(T, 0, 0), v.disconnect(T, 0, 1);
      }
    };
  }, f = (h, p, C, T) => {
    const S = new Float32Array(16385), N = new Float32Array(16385), M = new Float32Array(16385), g = new Float32Array(16385), y = Math.floor(16385 / 2);
    for (let A = 0; A < 16385; A += 1)
      if (A > y) {
        const x = (A - y) / (16384 - y) * l;
        S[A] = Math.cos(x), N[A] = Math.sin(x), M[A] = 0, g[A] = 1;
      } else {
        const x = A / (16384 - y) * l;
        S[A] = 1, N[A] = 0, M[A] = Math.cos(x), g[A] = Math.sin(x);
      }
    const v = e(h, {
      channelCount: 2,
      channelCountMode: "explicit",
      channelInterpretation: "discrete",
      numberOfOutputs: 2
    }), _ = t(h, { ...c, gain: 0 }), E = s(h, {
      ...u,
      curve: S
    }), F = t(h, { ...c, gain: 0 }), P = s(h, {
      ...u,
      curve: N
    }), I = s(h, { ...u, curve: a }), D = t(h, { ...c, gain: 0 }), w = s(h, {
      ...u,
      curve: M
    }), O = t(h, { ...c, gain: 0 }), b = s(h, {
      ...u,
      curve: g
    });
    return {
      connectGraph() {
        p.connect(v), p.connect(I.inputs === void 0 ? I : I.inputs[0]), v.connect(_, 0), v.connect(F, 0), v.connect(D, 1), v.connect(O, 1), I.connect(C), C.connect(E.inputs === void 0 ? E : E.inputs[0]), C.connect(P.inputs === void 0 ? P : P.inputs[0]), C.connect(w.inputs === void 0 ? w : w.inputs[0]), C.connect(b.inputs === void 0 ? b : b.inputs[0]), E.connect(_.gain), P.connect(F.gain), w.connect(D.gain), b.connect(O.gain), _.connect(T, 0, 0), D.connect(T, 0, 0), F.connect(T, 0, 1), O.connect(T, 0, 1);
      },
      disconnectGraph() {
        p.disconnect(v), p.disconnect(I.inputs === void 0 ? I : I.inputs[0]), v.disconnect(_, 0), v.disconnect(F, 0), v.disconnect(D, 1), v.disconnect(O, 1), I.disconnect(C), C.disconnect(E.inputs === void 0 ? E : E.inputs[0]), C.disconnect(P.inputs === void 0 ? P : P.inputs[0]), C.disconnect(w.inputs === void 0 ? w : w.inputs[0]), C.disconnect(b.inputs === void 0 ? b : b.inputs[0]), E.disconnect(_.gain), P.disconnect(F.gain), w.disconnect(D.gain), b.disconnect(O.gain), _.disconnect(T, 0, 0), D.disconnect(T, 0, 0), F.disconnect(T, 0, 1), O.disconnect(T, 0, 1);
      }
    };
  }, m = (h, p, C, T, S) => {
    if (p === 1)
      return d(h, C, T, S);
    if (p === 2)
      return f(h, C, T, S);
    throw r();
  };
  return (h, { channelCount: p, channelCountMode: C, pan: T, ...S }) => {
    if (C === "max")
      throw r();
    const N = n(h, {
      ...S,
      channelCount: 1,
      channelCountMode: C,
      numberOfInputs: 2
    }), M = t(h, { ...S, channelCount: p, channelCountMode: C, gain: 1 }), g = t(h, {
      channelCount: 1,
      channelCountMode: "explicit",
      channelInterpretation: "discrete",
      gain: T
    });
    let { connectGraph: y, disconnectGraph: v } = m(h, p, M, g, N);
    Object.defineProperty(g.gain, "defaultValue", { get: () => 0 }), Object.defineProperty(g.gain, "maxValue", { get: () => 1 }), Object.defineProperty(g.gain, "minValue", { get: () => -1 });
    const _ = {
      get bufferSize() {
      },
      get channelCount() {
        return M.channelCount;
      },
      set channelCount(I) {
        M.channelCount !== I && (E && v(), { connectGraph: y, disconnectGraph: v } = m(h, I, M, g, N), E && y()), M.channelCount = I;
      },
      get channelCountMode() {
        return M.channelCountMode;
      },
      set channelCountMode(I) {
        if (I === "clamped-max" || I === "max")
          throw r();
        M.channelCountMode = I;
      },
      get channelInterpretation() {
        return M.channelInterpretation;
      },
      set channelInterpretation(I) {
        M.channelInterpretation = I;
      },
      get context() {
        return M.context;
      },
      get inputs() {
        return [M];
      },
      get numberOfInputs() {
        return M.numberOfInputs;
      },
      get numberOfOutputs() {
        return M.numberOfOutputs;
      },
      get pan() {
        return g.gain;
      },
      addEventListener(...I) {
        return M.addEventListener(I[0], I[1], I[2]);
      },
      dispatchEvent(...I) {
        return M.dispatchEvent(I[0]);
      },
      removeEventListener(...I) {
        return M.removeEventListener(I[0], I[1], I[2]);
      }
    };
    let E = !1;
    const F = () => {
      y(), E = !0;
    }, P = () => {
      v(), E = !1;
    };
    return o(ht(_, N), F, P);
  };
}, Fc = (n, e, t, s, r, o, i) => (a, l) => {
  const c = a.createWaveShaper();
  if (o !== null && o.name === "webkitAudioContext" && a.createGain().gain.automationRate === void 0)
    return t(a, l);
  ue(c, l);
  const u = l.curve === null || l.curve instanceof Float32Array ? l.curve : new Float32Array(l.curve);
  if (u !== null && u.length < 2)
    throw e();
  oe(c, { curve: u }, "curve"), oe(c, l, "oversample");
  let d = null, f = !1;
  return i(c, "curve", (p) => () => p.call(c), (p) => (C) => (p.call(c, C), f && (s(C) && d === null ? d = n(a, c) : !s(C) && d !== null && (d(), d = null)), C)), r(c, () => {
    f = !0, s(c.curve) && (d = n(a, c));
  }, () => {
    f = !1, d !== null && (d(), d = null);
  });
}, kc = (n, e, t, s, r) => (o, { curve: i, oversample: a, ...l }) => {
  const c = o.createWaveShaper(), u = o.createWaveShaper();
  ue(c, l), ue(u, l);
  const d = t(o, { ...l, gain: 1 }), f = t(o, { ...l, gain: -1 }), m = t(o, { ...l, gain: 1 }), h = t(o, { ...l, gain: -1 });
  let p = null, C = !1, T = null;
  const S = {
    get bufferSize() {
    },
    get channelCount() {
      return c.channelCount;
    },
    set channelCount(g) {
      d.channelCount = g, f.channelCount = g, c.channelCount = g, m.channelCount = g, u.channelCount = g, h.channelCount = g;
    },
    get channelCountMode() {
      return c.channelCountMode;
    },
    set channelCountMode(g) {
      d.channelCountMode = g, f.channelCountMode = g, c.channelCountMode = g, m.channelCountMode = g, u.channelCountMode = g, h.channelCountMode = g;
    },
    get channelInterpretation() {
      return c.channelInterpretation;
    },
    set channelInterpretation(g) {
      d.channelInterpretation = g, f.channelInterpretation = g, c.channelInterpretation = g, m.channelInterpretation = g, u.channelInterpretation = g, h.channelInterpretation = g;
    },
    get context() {
      return c.context;
    },
    get curve() {
      return T;
    },
    set curve(g) {
      if (g !== null && g.length < 2)
        throw e();
      if (g === null)
        c.curve = g, u.curve = g;
      else {
        const y = g.length, v = new Float32Array(y + 2 - y % 2), _ = new Float32Array(y + 2 - y % 2);
        v[0] = g[0], _[0] = -g[y - 1];
        const E = Math.ceil((y + 1) / 2), F = (y + 1) / 2 - 1;
        for (let P = 1; P < E; P += 1) {
          const I = P / E * F, D = Math.floor(I), w = Math.ceil(I);
          v[P] = D === w ? g[D] : (1 - (I - D)) * g[D] + (1 - (w - I)) * g[w], _[P] = D === w ? -g[y - 1 - D] : -((1 - (I - D)) * g[y - 1 - D]) - (1 - (w - I)) * g[y - 1 - w];
        }
        v[E] = y % 2 === 1 ? g[E - 1] : (g[E - 2] + g[E - 1]) / 2, c.curve = v, u.curve = _;
      }
      T = g, C && (s(T) && p === null ? p = n(o, d) : p !== null && (p(), p = null));
    },
    get inputs() {
      return [d];
    },
    get numberOfInputs() {
      return c.numberOfInputs;
    },
    get numberOfOutputs() {
      return c.numberOfOutputs;
    },
    get oversample() {
      return c.oversample;
    },
    set oversample(g) {
      c.oversample = g, u.oversample = g;
    },
    addEventListener(...g) {
      return d.addEventListener(g[0], g[1], g[2]);
    },
    dispatchEvent(...g) {
      return d.dispatchEvent(g[0]);
    },
    removeEventListener(...g) {
      return d.removeEventListener(g[0], g[1], g[2]);
    }
  };
  i !== null && (S.curve = i instanceof Float32Array ? i : new Float32Array(i)), a !== S.oversample && (S.oversample = a);
  const N = () => {
    d.connect(c).connect(m), d.connect(f).connect(u).connect(h).connect(m), C = !0, s(T) && (p = n(o, d));
  }, M = () => {
    d.disconnect(c), c.disconnect(m), d.disconnect(f), f.disconnect(u), u.disconnect(h), h.disconnect(m), C = !1, p !== null && (p(), p = null);
  };
  return r(ht(S, m), N, M);
}, Ce = () => new DOMException("", "NotSupportedError"), Bc = {
  numberOfChannels: 1
}, Lc = (n, e, t, s, r) => class extends n {
  constructor(i, a, l) {
    let c;
    if (typeof i == "number" && a !== void 0 && l !== void 0)
      c = { length: a, numberOfChannels: i, sampleRate: l };
    else if (typeof i == "object")
      c = i;
    else
      throw new Error("The given parameters are not valid.");
    const { length: u, numberOfChannels: d, sampleRate: f } = { ...Bc, ...c }, m = s(d, u, f);
    e(Tt, () => Tt(m)) || m.addEventListener("statechange", /* @__PURE__ */ (() => {
      let h = 0;
      const p = (C) => {
        this._state === "running" && (h > 0 ? (m.removeEventListener("statechange", p), C.stopImmediatePropagation(), this._waitForThePromiseToSettle(C)) : h += 1);
      };
      return p;
    })()), super(m, d), this._length = u, this._nativeOfflineAudioContext = m, this._state = null;
  }
  get length() {
    return this._nativeOfflineAudioContext.length === void 0 ? this._length : this._nativeOfflineAudioContext.length;
  }
  get state() {
    return this._state === null ? this._nativeOfflineAudioContext.state : this._state;
  }
  startRendering() {
    return this._state === "running" ? Promise.reject(t()) : (this._state = "running", r(this.destination, this._nativeOfflineAudioContext).finally(() => {
      this._state = null, ir(this);
    }));
  }
  _waitForThePromiseToSettle(i) {
    this._state === null ? this._nativeOfflineAudioContext.dispatchEvent(i) : setTimeout(() => this._waitForThePromiseToSettle(i));
  }
}, Vc = {
  channelCount: 2,
  channelCountMode: "max",
  // This attribute has no effect for nodes with no inputs.
  channelInterpretation: "speakers",
  // This attribute has no effect for nodes with no inputs.
  detune: 0,
  frequency: 440,
  periodicWave: void 0,
  type: "sine"
}, Wc = (n, e, t, s, r, o, i) => class extends n {
  constructor(l, c) {
    const u = r(l), d = { ...Vc, ...c }, f = t(u, d), m = o(u), h = m ? s() : null, p = l.sampleRate / 2;
    super(l, !1, f, h), this._detune = e(this, m, f.detune, 153600, -153600), this._frequency = e(this, m, f.frequency, p, -p), this._nativeOscillatorNode = f, this._onended = null, this._oscillatorNodeRenderer = h, this._oscillatorNodeRenderer !== null && d.periodicWave !== void 0 && (this._oscillatorNodeRenderer.periodicWave = d.periodicWave);
  }
  get detune() {
    return this._detune;
  }
  get frequency() {
    return this._frequency;
  }
  get onended() {
    return this._onended;
  }
  set onended(l) {
    const c = typeof l == "function" ? i(this, l) : null;
    this._nativeOscillatorNode.onended = c;
    const u = this._nativeOscillatorNode.onended;
    this._onended = u !== null && u === c ? l : u;
  }
  get type() {
    return this._nativeOscillatorNode.type;
  }
  set type(l) {
    this._nativeOscillatorNode.type = l, this._oscillatorNodeRenderer !== null && (this._oscillatorNodeRenderer.periodicWave = null);
  }
  setPeriodicWave(l) {
    this._nativeOscillatorNode.setPeriodicWave(l), this._oscillatorNodeRenderer !== null && (this._oscillatorNodeRenderer.periodicWave = l);
  }
  start(l = 0) {
    if (this._nativeOscillatorNode.start(l), this._oscillatorNodeRenderer !== null && (this._oscillatorNodeRenderer.start = l), this.context.state !== "closed") {
      ct(this);
      const c = () => {
        this._nativeOscillatorNode.removeEventListener("ended", c), ke(this) && bt(this);
      };
      this._nativeOscillatorNode.addEventListener("ended", c);
    }
  }
  stop(l = 0) {
    this._nativeOscillatorNode.stop(l), this._oscillatorNodeRenderer !== null && (this._oscillatorNodeRenderer.stop = l);
  }
}, Gc = (n, e, t, s, r) => () => {
  const o = /* @__PURE__ */ new WeakMap();
  let i = null, a = null, l = null;
  const c = async (u, d) => {
    let f = t(u);
    const m = me(f, d);
    if (!m) {
      const h = {
        channelCount: f.channelCount,
        channelCountMode: f.channelCountMode,
        channelInterpretation: f.channelInterpretation,
        detune: f.detune.value,
        frequency: f.frequency.value,
        periodicWave: i === null ? void 0 : i,
        type: f.type
      };
      f = e(d, h), a !== null && f.start(a), l !== null && f.stop(l);
    }
    return o.set(d, f), m ? (await n(d, u.detune, f.detune), await n(d, u.frequency, f.frequency)) : (await s(d, u.detune, f.detune), await s(d, u.frequency, f.frequency)), await r(u, d, f), f;
  };
  return {
    set periodicWave(u) {
      i = u;
    },
    set start(u) {
      a = u;
    },
    set stop(u) {
      l = u;
    },
    render(u, d) {
      const f = o.get(d);
      return f !== void 0 ? Promise.resolve(f) : c(u, d);
    }
  };
}, qc = {
  channelCount: 2,
  channelCountMode: "clamped-max",
  channelInterpretation: "speakers",
  coneInnerAngle: 360,
  coneOuterAngle: 360,
  coneOuterGain: 0,
  distanceModel: "inverse",
  maxDistance: 1e4,
  orientationX: 1,
  orientationY: 0,
  orientationZ: 0,
  panningModel: "equalpower",
  positionX: 0,
  positionY: 0,
  positionZ: 0,
  refDistance: 1,
  rolloffFactor: 1
}, $c = (n, e, t, s, r, o, i) => class extends n {
  constructor(l, c) {
    const u = r(l), d = { ...qc, ...c }, f = t(u, d), m = o(u), h = m ? s() : null;
    super(l, !1, f, h), this._nativePannerNode = f, this._orientationX = e(this, m, f.orientationX, ge, ve), this._orientationY = e(this, m, f.orientationY, ge, ve), this._orientationZ = e(this, m, f.orientationZ, ge, ve), this._positionX = e(this, m, f.positionX, ge, ve), this._positionY = e(this, m, f.positionY, ge, ve), this._positionZ = e(this, m, f.positionZ, ge, ve), i(this, 1);
  }
  get coneInnerAngle() {
    return this._nativePannerNode.coneInnerAngle;
  }
  set coneInnerAngle(l) {
    this._nativePannerNode.coneInnerAngle = l;
  }
  get coneOuterAngle() {
    return this._nativePannerNode.coneOuterAngle;
  }
  set coneOuterAngle(l) {
    this._nativePannerNode.coneOuterAngle = l;
  }
  get coneOuterGain() {
    return this._nativePannerNode.coneOuterGain;
  }
  set coneOuterGain(l) {
    this._nativePannerNode.coneOuterGain = l;
  }
  get distanceModel() {
    return this._nativePannerNode.distanceModel;
  }
  set distanceModel(l) {
    this._nativePannerNode.distanceModel = l;
  }
  get maxDistance() {
    return this._nativePannerNode.maxDistance;
  }
  set maxDistance(l) {
    this._nativePannerNode.maxDistance = l;
  }
  get orientationX() {
    return this._orientationX;
  }
  get orientationY() {
    return this._orientationY;
  }
  get orientationZ() {
    return this._orientationZ;
  }
  get panningModel() {
    return this._nativePannerNode.panningModel;
  }
  set panningModel(l) {
    this._nativePannerNode.panningModel = l;
  }
  get positionX() {
    return this._positionX;
  }
  get positionY() {
    return this._positionY;
  }
  get positionZ() {
    return this._positionZ;
  }
  get refDistance() {
    return this._nativePannerNode.refDistance;
  }
  set refDistance(l) {
    this._nativePannerNode.refDistance = l;
  }
  get rolloffFactor() {
    return this._nativePannerNode.rolloffFactor;
  }
  set rolloffFactor(l) {
    this._nativePannerNode.rolloffFactor = l;
  }
}, Uc = (n, e, t, s, r, o, i, a, l, c) => () => {
  const u = /* @__PURE__ */ new WeakMap();
  let d = null;
  const f = async (m, h) => {
    let p = null, C = o(m);
    const T = {
      channelCount: C.channelCount,
      channelCountMode: C.channelCountMode,
      channelInterpretation: C.channelInterpretation
    }, S = {
      ...T,
      coneInnerAngle: C.coneInnerAngle,
      coneOuterAngle: C.coneOuterAngle,
      coneOuterGain: C.coneOuterGain,
      distanceModel: C.distanceModel,
      maxDistance: C.maxDistance,
      panningModel: C.panningModel,
      refDistance: C.refDistance,
      rolloffFactor: C.rolloffFactor
    }, N = me(C, h);
    if ("bufferSize" in C)
      p = s(h, { ...T, gain: 1 });
    else if (!N) {
      const M = {
        ...S,
        orientationX: C.orientationX.value,
        orientationY: C.orientationY.value,
        orientationZ: C.orientationZ.value,
        positionX: C.positionX.value,
        positionY: C.positionY.value,
        positionZ: C.positionZ.value
      };
      C = r(h, M);
    }
    if (u.set(h, p === null ? C : p), p !== null) {
      if (d === null) {
        if (i === null)
          throw new Error("Missing the native OfflineAudioContext constructor.");
        const P = new i(
          6,
          // Bug #17: Safari does not yet expose the length.
          m.context.length,
          h.sampleRate
        ), I = e(P, {
          channelCount: 1,
          channelCountMode: "explicit",
          channelInterpretation: "speakers",
          numberOfInputs: 6
        });
        I.connect(P.destination), d = (async () => {
          const D = await Promise.all([
            m.orientationX,
            m.orientationY,
            m.orientationZ,
            m.positionX,
            m.positionY,
            m.positionZ
          ].map(async (w, O) => {
            const b = t(P, {
              channelCount: 1,
              channelCountMode: "explicit",
              channelInterpretation: "discrete",
              offset: O === 0 ? 1 : 0
            });
            return await a(P, w, b.offset), b;
          }));
          for (let w = 0; w < 6; w += 1)
            D[w].connect(I, 0, w), D[w].start(0);
          return c(P);
        })();
      }
      const M = await d, g = s(h, { ...T, gain: 1 });
      await l(m, h, g);
      const y = [];
      for (let P = 0; P < M.numberOfChannels; P += 1)
        y.push(M.getChannelData(P));
      let v = [y[0][0], y[1][0], y[2][0]], _ = [y[3][0], y[4][0], y[5][0]], E = s(h, { ...T, gain: 1 }), F = r(h, {
        ...S,
        orientationX: v[0],
        orientationY: v[1],
        orientationZ: v[2],
        positionX: _[0],
        positionY: _[1],
        positionZ: _[2]
      });
      g.connect(E).connect(F.inputs[0]), F.connect(p);
      for (let P = 128; P < M.length; P += 128) {
        const I = [y[0][P], y[1][P], y[2][P]], D = [y[3][P], y[4][P], y[5][P]];
        if (I.some((w, O) => w !== v[O]) || D.some((w, O) => w !== _[O])) {
          v = I, _ = D;
          const w = P / h.sampleRate;
          E.gain.setValueAtTime(0, w), E = s(h, { ...T, gain: 0 }), F = r(h, {
            ...S,
            orientationX: v[0],
            orientationY: v[1],
            orientationZ: v[2],
            positionX: _[0],
            positionY: _[1],
            positionZ: _[2]
          }), E.gain.setValueAtTime(1, w), g.connect(E).connect(F.inputs[0]), F.connect(p);
        }
      }
      return p;
    }
    return N ? (await n(h, m.orientationX, C.orientationX), await n(h, m.orientationY, C.orientationY), await n(h, m.orientationZ, C.orientationZ), await n(h, m.positionX, C.positionX), await n(h, m.positionY, C.positionY), await n(h, m.positionZ, C.positionZ)) : (await a(h, m.orientationX, C.orientationX), await a(h, m.orientationY, C.orientationY), await a(h, m.orientationZ, C.orientationZ), await a(h, m.positionX, C.positionX), await a(h, m.positionY, C.positionY), await a(h, m.positionZ, C.positionZ)), dt(C) ? await l(m, h, C.inputs[0]) : await l(m, h, C), C;
  };
  return {
    render(m, h) {
      const p = u.get(h);
      return p !== void 0 ? Promise.resolve(p) : f(m, h);
    }
  };
}, Hc = {
  disableNormalization: !1
}, jc = (n, e, t, s) => class gr {
  constructor(o, i) {
    const a = e(o), l = s({ ...Hc, ...i }), c = n(a, l);
    return t.add(c), c;
  }
  static [Symbol.hasInstance](o) {
    return o !== null && typeof o == "object" && Object.getPrototypeOf(o) === gr.prototype || t.has(o);
  }
}, zc = (n, e) => (t, s, r) => (n(s).replay(r), e(s, t, r)), Xc = (n, e, t) => async (s, r, o) => {
  const i = n(s);
  await Promise.all(i.activeInputs.map((a, l) => Array.from(a).map(async ([c, u]) => {
    const f = await e(c).render(c, r), m = s.context.destination;
    !t(c) && (s !== m || !t(s)) && f.connect(o, u, l);
  })).reduce((a, l) => [...a, ...l], []));
}, Jc = (n, e, t) => async (s, r, o) => {
  const i = e(s);
  await Promise.all(Array.from(i.activeInputs).map(async ([a, l]) => {
    const u = await n(a).render(a, r);
    t(a) || u.connect(o, l);
  }));
}, Yc = (n, e, t, s) => (r) => n(Tt, () => Tt(r)) ? Promise.resolve(n(s, s)).then((o) => {
  if (!o) {
    const i = t(r, 512, 0, 1);
    r.oncomplete = () => {
      i.onaudioprocess = null, i.disconnect();
    }, i.onaudioprocess = () => r.currentTime, i.connect(r.destination);
  }
  return r.startRendering();
}) : new Promise((o) => {
  const i = e(r, {
    channelCount: 1,
    channelCountMode: "explicit",
    channelInterpretation: "discrete",
    gain: 0
  });
  r.oncomplete = (a) => {
    i.disconnect(), o(a.renderedBuffer);
  }, i.connect(r.destination), r.startRendering();
}), Zc = (n) => (e, t) => {
  n.set(e, t);
}, Qc = (n) => (e, t) => n.set(e, t), Kc = (n, e, t, s, r, o, i, a) => (l, c) => t(l).render(l, c).then(() => Promise.all(Array.from(s(c)).map((u) => t(u).render(u, c)))).then(() => r(c)).then((u) => (typeof u.copyFromChannel != "function" ? (i(u), xn(u)) : e(o, () => o(u)) || a(u), n.add(u), u)), el = {
  channelCount: 2,
  /*
   * Bug #105: The channelCountMode should be 'clamped-max' according to the spec but is set to 'explicit' to achieve consistent
   * behavior.
   */
  channelCountMode: "explicit",
  channelInterpretation: "speakers",
  pan: 0
}, tl = (n, e, t, s, r, o) => class extends n {
  constructor(a, l) {
    const c = r(a), u = { ...el, ...l }, d = t(c, u), f = o(c), m = f ? s() : null;
    super(a, !1, d, m), this._pan = e(this, f, d.pan);
  }
  get pan() {
    return this._pan;
  }
}, nl = (n, e, t, s, r) => () => {
  const o = /* @__PURE__ */ new WeakMap(), i = async (a, l) => {
    let c = t(a);
    const u = me(c, l);
    if (!u) {
      const d = {
        channelCount: c.channelCount,
        channelCountMode: c.channelCountMode,
        channelInterpretation: c.channelInterpretation,
        pan: c.pan.value
      };
      c = e(l, d);
    }
    return o.set(l, c), u ? await n(l, a.pan, c.pan) : await s(l, a.pan, c.pan), dt(c) ? await r(a, l, c.inputs[0]) : await r(a, l, c), c;
  };
  return {
    render(a, l) {
      const c = o.get(l);
      return c !== void 0 ? Promise.resolve(c) : i(a, l);
    }
  };
}, sl = (n) => () => {
  if (n === null)
    return !1;
  try {
    new n({ length: 1, sampleRate: 44100 });
  } catch {
    return !1;
  }
  return !0;
}, rl = (n, e) => async () => {
  if (n === null)
    return !0;
  if (e === null)
    return !1;
  const t = new Blob(['class A extends AudioWorkletProcessor{process(i){this.port.postMessage(i,[i[0][0].buffer])}}registerProcessor("a",A)'], {
    type: "application/javascript; charset=utf-8"
  }), s = new e(1, 128, 44100), r = URL.createObjectURL(t);
  let o = !1, i = !1;
  try {
    await s.audioWorklet.addModule(r);
    const a = new n(s, "a", { numberOfOutputs: 0 }), l = s.createOscillator();
    a.port.onmessage = () => o = !0, a.onprocessorerror = () => i = !0, l.connect(a), l.start(0), await s.startRendering(), await new Promise((c) => setTimeout(c));
  } catch {
  } finally {
    URL.revokeObjectURL(r);
  }
  return o && !i;
}, ol = (n, e) => () => {
  if (e === null)
    return Promise.resolve(!1);
  const t = new e(1, 1, 44100), s = n(t, {
    channelCount: 1,
    channelCountMode: "explicit",
    channelInterpretation: "discrete",
    gain: 0
  });
  return new Promise((r) => {
    t.oncomplete = () => {
      s.disconnect(), r(t.currentTime !== 0);
    }, t.startRendering();
  });
}, il = () => new DOMException("", "UnknownError"), al = {
  channelCount: 2,
  channelCountMode: "max",
  channelInterpretation: "speakers",
  curve: null,
  oversample: "none"
}, cl = (n, e, t, s, r, o, i) => class extends n {
  constructor(l, c) {
    const u = r(l), d = { ...al, ...c }, f = t(u, d), h = o(u) ? s() : null;
    super(l, !0, f, h), this._isCurveNullified = !1, this._nativeWaveShaperNode = f, i(this, 1);
  }
  get curve() {
    return this._isCurveNullified ? null : this._nativeWaveShaperNode.curve;
  }
  set curve(l) {
    if (l === null)
      this._isCurveNullified = !0, this._nativeWaveShaperNode.curve = new Float32Array([0, 0]);
    else {
      if (l.length < 2)
        throw e();
      this._isCurveNullified = !1, this._nativeWaveShaperNode.curve = l;
    }
  }
  get oversample() {
    return this._nativeWaveShaperNode.oversample;
  }
  set oversample(l) {
    this._nativeWaveShaperNode.oversample = l;
  }
}, ll = (n, e, t) => () => {
  const s = /* @__PURE__ */ new WeakMap(), r = async (o, i) => {
    let a = e(o);
    if (!me(a, i)) {
      const c = {
        channelCount: a.channelCount,
        channelCountMode: a.channelCountMode,
        channelInterpretation: a.channelInterpretation,
        curve: a.curve,
        oversample: a.oversample
      };
      a = n(i, c);
    }
    return s.set(i, a), dt(a) ? await t(o, i, a.inputs[0]) : await t(o, i, a), a;
  };
  return {
    render(o, i) {
      const a = s.get(i);
      return a !== void 0 ? Promise.resolve(a) : r(o, i);
    }
  };
}, ul = () => typeof window > "u" ? null : window, dl = (n, e) => (t) => {
  t.copyFromChannel = (s, r, o = 0) => {
    const i = n(o), a = n(r);
    if (a >= t.numberOfChannels)
      throw e();
    const l = t.length, c = t.getChannelData(a), u = s.length;
    for (let d = i < 0 ? -i : 0; d + i < l && d < u; d += 1)
      s[d] = c[d + i];
  }, t.copyToChannel = (s, r, o = 0) => {
    const i = n(o), a = n(r);
    if (a >= t.numberOfChannels)
      throw e();
    const l = t.length, c = t.getChannelData(a), u = s.length;
    for (let d = i < 0 ? -i : 0; d + i < l && d < u; d += 1)
      c[d + i] = s[d];
  };
}, hl = (n) => (e) => {
  e.copyFromChannel = /* @__PURE__ */ ((t) => (s, r, o = 0) => {
    const i = n(o), a = n(r);
    if (i < e.length)
      return t.call(e, s, a, i);
  })(e.copyFromChannel), e.copyToChannel = /* @__PURE__ */ ((t) => (s, r, o = 0) => {
    const i = n(o), a = n(r);
    if (i < e.length)
      return t.call(e, s, a, i);
  })(e.copyToChannel);
}, fl = (n) => (e, t) => {
  const s = t.createBuffer(1, 1, 44100);
  e.buffer === null && (e.buffer = s), n(e, "buffer", (r) => () => {
    const o = r.call(e);
    return o === s ? null : o;
  }, (r) => (o) => r.call(e, o === null ? s : o));
}, ml = (n, e) => (t, s) => {
  s.channelCount = 1, s.channelCountMode = "explicit", Object.defineProperty(s, "channelCount", {
    get: () => 1,
    set: () => {
      throw n();
    }
  }), Object.defineProperty(s, "channelCountMode", {
    get: () => "explicit",
    set: () => {
      throw n();
    }
  });
  const r = t.createBufferSource();
  e(s, () => {
    const a = s.numberOfInputs;
    for (let l = 0; l < a; l += 1)
      r.connect(s, 0, l);
  }, () => r.disconnect(s));
}, yr = (n, e, t) => n.copyFromChannel === void 0 ? n.getChannelData(t)[0] : (n.copyFromChannel(e, t), e[0]), Sr = (n) => {
  if (n === null)
    return !1;
  const e = n.length;
  return e % 2 !== 0 ? n[Math.floor(e / 2)] !== 0 : n[e / 2 - 1] + n[e / 2] !== 0;
}, Pt = (n, e, t, s) => {
  let r = n;
  for (; !r.hasOwnProperty(e); )
    r = Object.getPrototypeOf(r);
  const { get: o, set: i } = Object.getOwnPropertyDescriptor(r, e);
  Object.defineProperty(n, e, { get: t(o), set: s(i) });
}, pl = (n) => ({
  ...n,
  outputChannelCount: n.outputChannelCount !== void 0 ? n.outputChannelCount : n.numberOfInputs === 1 && n.numberOfOutputs === 1 ? (
    /*
     * Bug #61: This should be the computedNumberOfChannels, but unfortunately that is almost impossible to fake. That's why
     * the channelCountMode is required to be 'explicit' as long as there is not a native implementation in every browser. That
     * makes sure the computedNumberOfChannels is equivilant to the channelCount which makes it much easier to compute.
     */
    [n.channelCount]
  ) : Array.from({ length: n.numberOfOutputs }, () => 1)
}), gl = (n) => ({ ...n, channelCount: n.numberOfOutputs }), yl = (n) => {
  const { imag: e, real: t } = n;
  return e === void 0 ? t === void 0 ? { ...n, imag: [0, 0], real: [0, 0] } : { ...n, imag: Array.from(t, () => 0), real: t } : t === void 0 ? { ...n, imag: e, real: Array.from(e, () => 0) } : { ...n, imag: e, real: t };
}, Cr = (n, e, t) => {
  try {
    n.setValueAtTime(e, t);
  } catch (s) {
    if (s.code !== 9)
      throw s;
    Cr(n, e, t + 1e-7);
  }
}, Sl = (n) => {
  const e = n.createBufferSource();
  e.start();
  try {
    e.start();
  } catch {
    return !0;
  }
  return !1;
}, Cl = (n) => {
  const e = n.createBufferSource(), t = n.createBuffer(1, 1, 44100);
  e.buffer = t;
  try {
    e.start(0, 1);
  } catch {
    return !1;
  }
  return !0;
}, vl = (n) => {
  const e = n.createBufferSource();
  e.start();
  try {
    e.stop();
  } catch {
    return !1;
  }
  return !0;
}, Bn = (n) => {
  const e = n.createOscillator();
  try {
    e.start(-1);
  } catch (t) {
    return t instanceof RangeError;
  }
  return !1;
}, vr = (n) => {
  const e = n.createBuffer(1, 1, 44100), t = n.createBufferSource();
  t.buffer = e, t.start(), t.stop();
  try {
    return t.stop(), !0;
  } catch {
    return !1;
  }
}, Ln = (n) => {
  const e = n.createOscillator();
  try {
    e.stop(-1);
  } catch (t) {
    return t instanceof RangeError;
  }
  return !1;
}, _l = (n) => {
  const { port1: e, port2: t } = new MessageChannel();
  try {
    e.postMessage(n);
  } finally {
    e.close(), t.close();
  }
}, Tl = (n) => {
  n.start = /* @__PURE__ */ ((e) => (t = 0, s = 0, r) => {
    const o = n.buffer, i = o === null ? s : Math.min(o.duration, s);
    o !== null && i > o.duration - 0.5 / n.context.sampleRate ? e.call(n, t, 0, 0) : e.call(n, t, i, r);
  })(n.start);
}, _r = (n, e) => {
  const t = e.createGain();
  n.connect(t);
  const s = /* @__PURE__ */ ((r) => () => {
    r.call(n, t), n.removeEventListener("ended", s);
  })(n.disconnect);
  n.addEventListener("ended", s), ht(n, t), n.stop = /* @__PURE__ */ ((r) => {
    let o = !1;
    return (i = 0) => {
      if (o)
        try {
          r.call(n, i);
        } catch {
          t.gain.setValueAtTime(0, i);
        }
      else
        r.call(n, i), o = !0;
    };
  })(n.stop);
}, ft = (n, e) => (t) => {
  const s = { value: n };
  return Object.defineProperties(t, {
    currentTarget: s,
    target: s
  }), typeof e == "function" ? e.call(n, t) : e.handleEvent.call(n, t);
}, Nl = $o(Qe), wl = Jo(Qe), bl = aa(Kt), Tr = /* @__PURE__ */ new WeakMap(), Al = ba(Tr), Ae = Bi(/* @__PURE__ */ new Map(), /* @__PURE__ */ new WeakMap()), Ee = ul(), Nr = tc(Ae, Pe), Vn = wa(ye), he = Xc(ye, Vn, Ze), Ml = ei(Nr, se, he), te = Ia(Qt), Be = Ic(Ee), Z = Ha(Be), wr = /* @__PURE__ */ new WeakMap(), br = ya(ft), Ot = oc(Ee), Wn = Ga(Ot), Gn = qa(Ee), Ar = $a(Ee), Nt = ac(Ee), ce = bi(Uo(Ks), Xo(Nl, wl, Ht, bl, jt, ye, Al, wt, se, Qe, ke, Ze, Lt), Ae, ka(vn, jt, ye, se, _t, ke), Pe, en, Ce, sa(Ht, vn, ye, se, _t, te, ke, Z), ua(wr, ye, be), br, te, Wn, Gn, Ar, Z, Nt), Il = Ko(ce, Ml, Pe, Nr, te, Z), qn = /* @__PURE__ */ new WeakSet(), Vs = nc(Ee), Mr = Yi(new Uint32Array(1)), $n = dl(Mr, Pe), Un = hl(Mr), Ir = ni(qn, Ae, Ce, Vs, Be, sl(Vs), $n, Un), tn = Yo(_e), Er = Jc(Vn, At, Ze), Oe = Ui(Er), mt = rc(tn, Ae, Sl, Cl, vl, Bn, vr, Ln, Tl, fl(Pt), _r), xe = zc(Aa(At), Er), El = oi(Oe, mt, se, xe, he), Me = Ai(Ho(er), wr, On, Mi, Bo, Lo, Vo, Wo, Go, yn, Zs, Ot, Cr), Pl = ri(ce, El, Me, de, mt, te, Z, ft), Ol = mi(ce, pi, Pe, de, ic(_e, Pt), te, Z, he), xl = ki(Oe, mr, se, xe, he), Ke = Qc(Tr), Dl = Fi(ce, Me, xl, en, mr, te, Z, Ke), $e = Ka(Qe, Gn), Rl = ml(de, $e), Ue = mc(Ot, Rl), Fl = Wi(Ue, se, he), kl = Vi(ce, Fl, Ue, te, Z), Bl = $i(It, se, he), Ll = qi(ce, Bl, It, te, Z, gl), Vl = yc(tn, mt, _e, $e), pt = gc(tn, Ae, Vl, Bn, Ln), Wl = Ji(Oe, pt, se, xe, he), Gl = Xi(ce, Me, Wl, pt, te, Z, ft), Pr = Sc(Ce, Pt), ql = Ki(Pr, se, he), $l = Qi(ce, ql, Pr, te, Z, Ke), Ul = ia(Oe, pr, se, xe, he), Hl = oa(ce, Me, Ul, pr, te, Z, Ke), Or = Cc(Ce), jl = ma(Oe, Or, se, xe, he), zl = fa(ce, Me, jl, Or, Ce, te, Z, Ke), Xl = Ta(Oe, _e, se, xe, he), Jl = _a(ce, Me, Xl, _e, te, Z), Yl = Nc(en, de, Et, Ce), nn = Yc(Ae, _e, Et, ol(_e, Be)), Zl = Fa(mt, se, Be, he, nn), Ql = vc(Yl), Kl = Da(ce, Ql, Zl, te, Z, Ke), eu = gi(Me, Ue, pt, Et, Ce, yr, Z, Pt), xr = /* @__PURE__ */ new WeakMap(), tu = Qa(Ol, eu, br, Z, xr, ft), Dr = Ec(tn, Ae, Bn, vr, Ln, _r), nu = Gc(Oe, Dr, se, xe, he), su = Wc(ce, Me, Dr, nu, te, Z, ft), Rr = ji(mt), ru = kc(Rr, de, _e, Sr, $e), sn = Fc(Rr, de, ru, Sr, $e, Ot, Pt), ou = Oc(Ht, de, Ue, _e, Et, sn, Ce, jt, yr, $e), Fr = Pc(ou), iu = Uc(Oe, Ue, pt, _e, Fr, se, Be, xe, he, nn), au = $c(ce, Me, Fr, iu, te, Z, Ke), cu = xc(Pe), lu = jc(cu, te, /* @__PURE__ */ new WeakSet(), yl), uu = Rc(Ue, It, _e, sn, Ce, $e), kr = Dc(uu, Ce), du = nl(Oe, kr, se, xe, he), hu = tl(ce, Me, kr, du, te, Z), fu = ll(sn, se, he), mu = cl(ce, de, sn, fu, te, Z, Ke), Br = ja(Ee), Hn = Sa(Ee), Lr = /* @__PURE__ */ new WeakMap(), pu = Ea(Lr, Be), gu = Br ? zo(
  Ae,
  Ce,
  ga(Ee),
  Hn,
  Ca(qo),
  te,
  pu,
  Z,
  Nt,
  /* @__PURE__ */ new WeakMap(),
  /* @__PURE__ */ new WeakMap(),
  rl(Nt, Be),
  // @todo window is guaranteed to be defined because isSecureContext checks that as well.
  Ee
) : void 0, yu = Ua(Wn, Z), Su = na(qn, Ae, ta, pa, /* @__PURE__ */ new WeakSet(), te, yu, $t, Tt, $n, Un), Vr = Di(gu, Il, Ir, Pl, Dl, kl, Ll, Gl, $l, Su, Hl, zl, Jl, Kl, tu, su, au, lu, hu, mu), Cu = za(ce, wc, te, Z), vu = Ja(ce, bc, te, Z), _u = Ya(ce, Ac, te, Z), Tu = Mc(de, Z), Nu = Za(ce, Tu, te), wu = fi(Vr, de, Ce, il, Cu, vu, _u, Nu, Ot), jn = Pa(xr), bu = Zo(jn), Wr = Hi(Pe), Au = ca(jn), Gr = da(Pe), qr = /* @__PURE__ */ new WeakMap(), Mu = Na(qr, be), Iu = fc(Wr, Pe, de, Ue, It, pt, _e, Et, Ce, Gr, Hn, Mu, $e), Eu = lc(de, Iu, _e, Ce, $e), Pu = xi(Oe, Wr, mt, Ue, It, pt, _e, Au, Gr, Hn, se, Nt, Be, xe, he, nn), Ou = Ma(Lr), xu = Zc(qr), Ws = Br ? Ei(bu, ce, Me, Pu, Eu, ye, Ou, te, Z, Nt, pl, xu, _l, ft) : void 0, Du = ea(Ce, Be), Ru = Kc(qn, Ae, Vn, jn, nn, $t, $n, Un), Fu = Lc(Vr, Ae, de, Du, Ru), ku = Ba(Qt, Wn), Bu = La(Pn, Gn), Lu = Va(On, Ar), Vu = Wa(Qt, Z);
function rt(n) {
  return n === void 0;
}
function Y(n) {
  return n !== void 0;
}
function bn(n) {
  return typeof n == "number";
}
function ot(n) {
  return Object.prototype.toString.call(n) === "[object Object]" && n.constructor === Object;
}
function Wu(n) {
  return typeof n == "boolean";
}
function zn(n) {
  return Array.isArray(n);
}
function Yt(n) {
  return typeof n == "string";
}
function ee(n, e) {
  if (!n)
    throw new Error(e);
}
function $r(n, e, t = 1 / 0) {
  if (!(e <= n && n <= t))
    throw new RangeError(`Value must be within [${e}, ${t}], got: ${n}`);
}
let Ur = console;
function Gu(...n) {
  Ur.log(...n);
}
function qu(...n) {
  Ur.warn(...n);
}
function $u(n) {
  return new wu(n);
}
function Uu(n, e, t) {
  return new Fu(n, e, t);
}
const Te = typeof self == "object" ? self : null, Hu = Te && (Te.hasOwnProperty("AudioContext") || Te.hasOwnProperty("webkitAudioContext"));
function ju(n, e, t) {
  return ee(Y(Ws), "AudioWorkletNode only works in a secure context (https or localhost)"), new (n instanceof (Te == null ? void 0 : Te.BaseAudioContext) ? Te == null ? void 0 : Te.AudioWorkletNode : Ws)(n, e, t);
}
class zu {
  constructor(e, t, s, r) {
    this._callback = e, this._type = t, this._minimumUpdateInterval = Math.max(128 / (r || 44100), 1e-3), this.updateInterval = s, this._createClock();
  }
  /**
   * Generate a web worker
   */
  _createWorker() {
    const e = new Blob([
      /* javascript */
      `
			// the initial timeout time
			let timeoutTime =  ${(this._updateInterval * 1e3).toFixed(1)};
			// onmessage callback
			self.onmessage = function(msg){
				timeoutTime = parseInt(msg.data);
			};
			// the tick function which posts a message
			// and schedules a new tick
			function tick(){
				setTimeout(tick, timeoutTime);
				self.postMessage('tick');
			}
			// call tick initially
			tick();
			`
    ], { type: "text/javascript" }), t = URL.createObjectURL(e), s = new Worker(t);
    s.onmessage = this._callback.bind(this), this._worker = s;
  }
  /**
   * Create a timeout loop
   */
  _createTimeout() {
    this._timeout = setTimeout(() => {
      this._createTimeout(), this._callback();
    }, this._updateInterval * 1e3);
  }
  /**
   * Create the clock source.
   */
  _createClock() {
    if (this._type === "worker")
      try {
        this._createWorker();
      } catch {
        this._type = "timeout", this._createClock();
      }
    else this._type === "timeout" && this._createTimeout();
  }
  /**
   * Clean up the current clock source
   */
  _disposeClock() {
    this._timeout && clearTimeout(this._timeout), this._worker && (this._worker.terminate(), this._worker.onmessage = null);
  }
  /**
   * The rate in seconds the ticker will update
   */
  get updateInterval() {
    return this._updateInterval;
  }
  set updateInterval(e) {
    var t;
    this._updateInterval = Math.max(e, this._minimumUpdateInterval), this._type === "worker" && ((t = this._worker) === null || t === void 0 || t.postMessage(this._updateInterval * 1e3));
  }
  /**
   * The type of the ticker, either a worker or a timeout
   */
  get type() {
    return this._type;
  }
  set type(e) {
    this._disposeClock(), this._type = e, this._createClock();
  }
  /**
   * Clean up
   */
  dispose() {
    this._disposeClock();
  }
}
function lt(n) {
  return Lu(n);
}
function qe(n) {
  return Bu(n);
}
function Vt(n) {
  return Vu(n);
}
function tt(n) {
  return ku(n);
}
function Xu(n) {
  return n instanceof Ir;
}
function Ju(n, e) {
  return n === "value" || lt(e) || qe(e) || Xu(e);
}
function vt(n, ...e) {
  if (!e.length)
    return n;
  const t = e.shift();
  if (ot(n) && ot(t))
    for (const s in t)
      Ju(s, t[s]) ? n[s] = t[s] : ot(t[s]) ? (n[s] || Object.assign(n, { [s]: {} }), vt(n[s], t[s])) : Object.assign(n, { [s]: t[s] });
  return vt(n, ...e);
}
function Le(n, e, t = [], s) {
  const r = {}, o = Array.from(e);
  if (ot(o[0]) && s && !Reflect.has(o[0], s) && (Object.keys(o[0]).some((a) => Reflect.has(n, a)) || (vt(r, { [s]: o[0] }), t.splice(t.indexOf(s), 1), o.shift())), o.length === 1 && ot(o[0]))
    vt(r, o[0]);
  else
    for (let i = 0; i < t.length; i++)
      Y(o[i]) && (r[t[i]] = o[i]);
  return vt(n, r);
}
function Yu(n) {
  return n.constructor.getDefaults();
}
/**
 * Tone.js
 * @author Yotam Mann
 * @license http://opensource.org/licenses/MIT MIT License
 * @copyright 2014-2024 Yotam Mann
 */
class gt {
  constructor() {
    this.debug = !1, this._wasDisposed = !1;
  }
  /**
   * Returns all of the default options belonging to the class.
   */
  static getDefaults() {
    return {};
  }
  /**
   * Prints the outputs to the console log for debugging purposes.
   * Prints the contents only if either the object has a property
   * called `debug` set to true, or a variable called TONE_DEBUG_CLASS
   * is set to the name of the class.
   * @example
   * const osc = new Tone.Oscillator();
   * // prints all logs originating from this oscillator
   * osc.debug = true;
   * // calls to start/stop will print in the console
   * osc.start();
   */
  log(...e) {
    (this.debug || Te && this.toString() === Te.TONE_DEBUG_CLASS) && Gu(this, ...e);
  }
  /**
   * disconnect and dispose.
   */
  dispose() {
    return this._wasDisposed = !0, this;
  }
  /**
   * Indicates if the instance was disposed. 'Disposing' an
   * instance means that all of the Web Audio nodes that were
   * created for the instance are disconnected and freed for garbage collection.
   */
  get disposed() {
    return this._wasDisposed;
  }
  /**
   * Convert the class to a string
   * @example
   * const osc = new Tone.Oscillator();
   * console.log(osc.toString());
   */
  toString() {
    return this.name;
  }
}
gt.version = Ys;
const Xn = 1e-6;
function An(n, e) {
  return n > e + Xn;
}
function Gs(n, e) {
  return An(n, e) || Fe(n, e);
}
function Zu(n, e) {
  return n + Xn < e;
}
function Fe(n, e) {
  return Math.abs(n - e) < Xn;
}
class rn extends gt {
  constructor() {
    super(), this.name = "Timeline", this._timeline = [];
    const e = Le(rn.getDefaults(), arguments, ["memory"]);
    this.memory = e.memory, this.increasing = e.increasing;
  }
  static getDefaults() {
    return {
      memory: 1 / 0,
      increasing: !1
    };
  }
  /**
   * The number of items in the timeline.
   */
  get length() {
    return this._timeline.length;
  }
  /**
   * Insert an event object onto the timeline. Events must have a "time" attribute.
   * @param event  The event object to insert into the timeline.
   */
  add(e) {
    if (ee(Reflect.has(e, "time"), "Timeline: events must have a time attribute"), e.time = e.time.valueOf(), this.increasing && this.length) {
      const t = this._timeline[this.length - 1];
      ee(Gs(e.time, t.time), "The time must be greater than or equal to the last scheduled time"), this._timeline.push(e);
    } else {
      const t = this._search(e.time);
      this._timeline.splice(t + 1, 0, e);
    }
    if (this.length > this.memory) {
      const t = this.length - this.memory;
      this._timeline.splice(0, t);
    }
    return this;
  }
  /**
   * Remove an event from the timeline.
   * @param  {Object}  event  The event object to remove from the list.
   * @returns {Timeline} this
   */
  remove(e) {
    const t = this._timeline.indexOf(e);
    return t !== -1 && this._timeline.splice(t, 1), this;
  }
  /**
   * Get the nearest event whose time is less than or equal to the given time.
   * @param  time  The time to query.
   */
  get(e, t = "time") {
    const s = this._search(e, t);
    return s !== -1 ? this._timeline[s] : null;
  }
  /**
   * Return the first event in the timeline without removing it
   * @returns {Object} The first event object
   * @deprecated
   */
  peek() {
    return this._timeline[0];
  }
  /**
   * Return the first event in the timeline and remove it
   * @deprecated
   */
  shift() {
    return this._timeline.shift();
  }
  /**
   * Get the event which is scheduled after the given time.
   * @param  time  The time to query.
   */
  getAfter(e, t = "time") {
    const s = this._search(e, t);
    return s + 1 < this._timeline.length ? this._timeline[s + 1] : null;
  }
  /**
   * Get the event before the event at the given time.
   * @param  time  The time to query.
   */
  getBefore(e) {
    const t = this._timeline.length;
    if (t > 0 && this._timeline[t - 1].time < e)
      return this._timeline[t - 1];
    const s = this._search(e);
    return s - 1 >= 0 ? this._timeline[s - 1] : null;
  }
  /**
   * Cancel events at and after the given time
   * @param  after  The time to query.
   */
  cancel(e) {
    if (this._timeline.length > 1) {
      let t = this._search(e);
      if (t >= 0)
        if (Fe(this._timeline[t].time, e)) {
          for (let s = t; s >= 0 && Fe(this._timeline[s].time, e); s--)
            t = s;
          this._timeline = this._timeline.slice(0, t);
        } else
          this._timeline = this._timeline.slice(0, t + 1);
      else
        this._timeline = [];
    } else this._timeline.length === 1 && Gs(this._timeline[0].time, e) && (this._timeline = []);
    return this;
  }
  /**
   * Cancel events before or equal to the given time.
   * @param  time  The time to cancel before.
   */
  cancelBefore(e) {
    const t = this._search(e);
    return t >= 0 && (this._timeline = this._timeline.slice(t + 1)), this;
  }
  /**
   * Returns the previous event if there is one. null otherwise
   * @param  event The event to find the previous one of
   * @return The event right before the given event
   */
  previousEvent(e) {
    const t = this._timeline.indexOf(e);
    return t > 0 ? this._timeline[t - 1] : null;
  }
  /**
   * Does a binary search on the timeline array and returns the
   * nearest event index whose time is after or equal to the given time.
   * If a time is searched before the first index in the timeline, -1 is returned.
   * If the time is after the end, the index of the last item is returned.
   */
  _search(e, t = "time") {
    if (this._timeline.length === 0)
      return -1;
    let s = 0;
    const r = this._timeline.length;
    let o = r;
    if (r > 0 && this._timeline[r - 1][t] <= e)
      return r - 1;
    for (; s < o; ) {
      let i = Math.floor(s + (o - s) / 2);
      const a = this._timeline[i], l = this._timeline[i + 1];
      if (Fe(a[t], e)) {
        for (let c = i; c < this._timeline.length; c++) {
          const u = this._timeline[c];
          if (Fe(u[t], e))
            i = c;
          else
            break;
        }
        return i;
      } else {
        if (Zu(a[t], e) && An(l[t], e))
          return i;
        An(a[t], e) ? o = i : s = i + 1;
      }
    }
    return -1;
  }
  /**
   * Internal iterator. Applies extra safety checks for
   * removing items from the array.
   */
  _iterate(e, t = 0, s = this._timeline.length - 1) {
    this._timeline.slice(t, s + 1).forEach(e);
  }
  /**
   * Iterate over everything in the array
   * @param  callback The callback to invoke with every item
   */
  forEach(e) {
    return this._iterate(e), this;
  }
  /**
   * Iterate over everything in the array at or before the given time.
   * @param  time The time to check if items are before
   * @param  callback The callback to invoke with every item
   */
  forEachBefore(e, t) {
    const s = this._search(e);
    return s !== -1 && this._iterate(t, 0, s), this;
  }
  /**
   * Iterate over everything in the array after the given time.
   * @param  time The time to check if items are before
   * @param  callback The callback to invoke with every item
   */
  forEachAfter(e, t) {
    const s = this._search(e);
    return this._iterate(t, s + 1), this;
  }
  /**
   * Iterate over everything in the array between the startTime and endTime.
   * The timerange is inclusive of the startTime, but exclusive of the endTime.
   * range = [startTime, endTime).
   * @param  startTime The time to check if items are before
   * @param  endTime The end of the test interval.
   * @param  callback The callback to invoke with every item
   */
  forEachBetween(e, t, s) {
    let r = this._search(e), o = this._search(t);
    return r !== -1 && o !== -1 ? (this._timeline[r].time !== e && (r += 1), this._timeline[o].time === t && (o -= 1), this._iterate(s, r, o)) : r === -1 && this._iterate(s, 0, o), this;
  }
  /**
   * Iterate over everything in the array at or after the given time. Similar to
   * forEachAfter, but includes the item(s) at the given time.
   * @param  time The time to check if items are before
   * @param  callback The callback to invoke with every item
   */
  forEachFrom(e, t) {
    let s = this._search(e);
    for (; s >= 0 && this._timeline[s].time >= e; )
      s--;
    return this._iterate(t, s + 1), this;
  }
  /**
   * Iterate over everything in the array at the given time
   * @param  time The time to check if items are before
   * @param  callback The callback to invoke with every item
   */
  forEachAtTime(e, t) {
    const s = this._search(e);
    if (s !== -1 && Fe(this._timeline[s].time, e)) {
      let r = s;
      for (let o = s; o >= 0 && Fe(this._timeline[o].time, e); o--)
        r = o;
      this._iterate((o) => {
        t(o);
      }, r, s);
    }
    return this;
  }
  /**
   * Clean up.
   */
  dispose() {
    return super.dispose(), this._timeline = [], this;
  }
}
const Qu = [];
function Ku(n) {
  Qu.forEach((e) => e(n));
}
const ed = [];
function td(n) {
  ed.forEach((e) => e(n));
}
class Jn extends gt {
  constructor() {
    super(...arguments), this.name = "Emitter";
  }
  /**
   * Bind a callback to a specific event.
   * @param  event     The name of the event to listen for.
   * @param  callback  The callback to invoke when the event is emitted
   */
  on(e, t) {
    return e.split(/\W+/).forEach((r) => {
      rt(this._events) && (this._events = {}), this._events.hasOwnProperty(r) || (this._events[r] = []), this._events[r].push(t);
    }), this;
  }
  /**
   * Bind a callback which is only invoked once
   * @param  event     The name of the event to listen for.
   * @param  callback  The callback to invoke when the event is emitted
   */
  once(e, t) {
    const s = (...r) => {
      t(...r), this.off(e, s);
    };
    return this.on(e, s), this;
  }
  /**
   * Remove the event listener.
   * @param  event     The event to stop listening to.
   * @param  callback  The callback which was bound to the event with Emitter.on.
   *                   If no callback is given, all callbacks events are removed.
   */
  off(e, t) {
    return e.split(/\W+/).forEach((r) => {
      if (rt(this._events) && (this._events = {}), this._events.hasOwnProperty(r))
        if (rt(t))
          this._events[r] = [];
        else {
          const o = this._events[r];
          for (let i = o.length - 1; i >= 0; i--)
            o[i] === t && o.splice(i, 1);
        }
    }), this;
  }
  /**
   * Invoke all of the callbacks bound to the event
   * with any arguments passed in.
   * @param  event  The name of the event.
   * @param args The arguments to pass to the functions listening.
   */
  emit(e, ...t) {
    if (this._events && this._events.hasOwnProperty(e)) {
      const s = this._events[e].slice(0);
      for (let r = 0, o = s.length; r < o; r++)
        s[r].apply(this, t);
    }
    return this;
  }
  /**
   * Add Emitter functions (on/off/emit) to the object
   */
  static mixin(e) {
    ["on", "once", "off", "emit"].forEach((t) => {
      const s = Object.getOwnPropertyDescriptor(Jn.prototype, t);
      Object.defineProperty(e.prototype, t, s);
    });
  }
  /**
   * Clean up
   */
  dispose() {
    return super.dispose(), this._events = void 0, this;
  }
}
class Hr extends Jn {
  constructor() {
    super(...arguments), this.isOffline = !1;
  }
  /*
   * This is a placeholder so that JSON.stringify does not throw an error
   * This matches what JSON.stringify(audioContext) returns on a native
   * audioContext instance.
   */
  toJSON() {
    return {};
  }
}
class xt extends Hr {
  constructor() {
    var e, t;
    super(), this.name = "Context", this._constants = /* @__PURE__ */ new Map(), this._timeouts = new rn(), this._timeoutIds = 0, this._initialized = !1, this._closeStarted = !1, this.isOffline = !1, this._workletPromise = null;
    const s = Le(xt.getDefaults(), arguments, [
      "context"
    ]);
    s.context ? (this._context = s.context, this._latencyHint = ((e = arguments[0]) === null || e === void 0 ? void 0 : e.latencyHint) || "") : (this._context = $u({
      latencyHint: s.latencyHint
    }), this._latencyHint = s.latencyHint), this._ticker = new zu(this.emit.bind(this, "tick"), s.clockSource, s.updateInterval, this._context.sampleRate), this.on("tick", this._timeoutLoop.bind(this)), this._context.onstatechange = () => {
      this.emit("statechange", this.state);
    }, this[!((t = arguments[0]) === null || t === void 0) && t.hasOwnProperty("updateInterval") ? "_lookAhead" : "lookAhead"] = s.lookAhead;
  }
  static getDefaults() {
    return {
      clockSource: "worker",
      latencyHint: "interactive",
      lookAhead: 0.1,
      updateInterval: 0.05
    };
  }
  /**
   * Finish setting up the context. **You usually do not need to do this manually.**
   */
  initialize() {
    return this._initialized || (Ku(this), this._initialized = !0), this;
  }
  //---------------------------
  // BASE AUDIO CONTEXT METHODS
  //---------------------------
  createAnalyser() {
    return this._context.createAnalyser();
  }
  createOscillator() {
    return this._context.createOscillator();
  }
  createBufferSource() {
    return this._context.createBufferSource();
  }
  createBiquadFilter() {
    return this._context.createBiquadFilter();
  }
  createBuffer(e, t, s) {
    return this._context.createBuffer(e, t, s);
  }
  createChannelMerger(e) {
    return this._context.createChannelMerger(e);
  }
  createChannelSplitter(e) {
    return this._context.createChannelSplitter(e);
  }
  createConstantSource() {
    return this._context.createConstantSource();
  }
  createConvolver() {
    return this._context.createConvolver();
  }
  createDelay(e) {
    return this._context.createDelay(e);
  }
  createDynamicsCompressor() {
    return this._context.createDynamicsCompressor();
  }
  createGain() {
    return this._context.createGain();
  }
  createIIRFilter(e, t) {
    return this._context.createIIRFilter(e, t);
  }
  createPanner() {
    return this._context.createPanner();
  }
  createPeriodicWave(e, t, s) {
    return this._context.createPeriodicWave(e, t, s);
  }
  createStereoPanner() {
    return this._context.createStereoPanner();
  }
  createWaveShaper() {
    return this._context.createWaveShaper();
  }
  createMediaStreamSource(e) {
    return ee(tt(this._context), "Not available if OfflineAudioContext"), this._context.createMediaStreamSource(e);
  }
  createMediaElementSource(e) {
    return ee(tt(this._context), "Not available if OfflineAudioContext"), this._context.createMediaElementSource(e);
  }
  createMediaStreamDestination() {
    return ee(tt(this._context), "Not available if OfflineAudioContext"), this._context.createMediaStreamDestination();
  }
  decodeAudioData(e) {
    return this._context.decodeAudioData(e);
  }
  /**
   * The current time in seconds of the AudioContext.
   */
  get currentTime() {
    return this._context.currentTime;
  }
  /**
   * The current time in seconds of the AudioContext.
   */
  get state() {
    return this._context.state;
  }
  /**
   * The current time in seconds of the AudioContext.
   */
  get sampleRate() {
    return this._context.sampleRate;
  }
  /**
   * The listener
   */
  get listener() {
    return this.initialize(), this._listener;
  }
  set listener(e) {
    ee(!this._initialized, "The listener cannot be set after initialization."), this._listener = e;
  }
  /**
   * There is only one Transport per Context. It is created on initialization.
   */
  get transport() {
    return this.initialize(), this._transport;
  }
  set transport(e) {
    ee(!this._initialized, "The transport cannot be set after initialization."), this._transport = e;
  }
  /**
   * This is the Draw object for the context which is useful for synchronizing the draw frame with the Tone.js clock.
   */
  get draw() {
    return this.initialize(), this._draw;
  }
  set draw(e) {
    ee(!this._initialized, "Draw cannot be set after initialization."), this._draw = e;
  }
  /**
   * A reference to the Context's destination node.
   */
  get destination() {
    return this.initialize(), this._destination;
  }
  set destination(e) {
    ee(!this._initialized, "The destination cannot be set after initialization."), this._destination = e;
  }
  /**
   * Create an audio worklet node from a name and options. The module
   * must first be loaded using {@link addAudioWorkletModule}.
   */
  createAudioWorkletNode(e, t) {
    return ju(this.rawContext, e, t);
  }
  /**
   * Add an AudioWorkletProcessor module
   * @param url The url of the module
   */
  addAudioWorkletModule(e) {
    return Ie(this, void 0, void 0, function* () {
      ee(Y(this.rawContext.audioWorklet), "AudioWorkletNode is only available in a secure context (https or localhost)"), this._workletPromise || (this._workletPromise = this.rawContext.audioWorklet.addModule(e)), yield this._workletPromise;
    });
  }
  /**
   * Returns a promise which resolves when all of the worklets have been loaded on this context
   */
  workletsAreReady() {
    return Ie(this, void 0, void 0, function* () {
      (yield this._workletPromise) ? this._workletPromise : Promise.resolve();
    });
  }
  //---------------------------
  // TICKER
  //---------------------------
  /**
   * How often the interval callback is invoked.
   * This number corresponds to how responsive the scheduling
   * can be. Setting to 0 will result in the lowest practial interval
   * based on context properties. context.updateInterval + context.lookAhead
   * gives you the total latency between scheduling an event and hearing it.
   */
  get updateInterval() {
    return this._ticker.updateInterval;
  }
  set updateInterval(e) {
    this._ticker.updateInterval = e;
  }
  /**
   * What the source of the clock is, either "worker" (default),
   * "timeout", or "offline" (none).
   */
  get clockSource() {
    return this._ticker.type;
  }
  set clockSource(e) {
    this._ticker.type = e;
  }
  /**
   * The amount of time into the future events are scheduled. Giving Web Audio
   * a short amount of time into the future to schedule events can reduce clicks and
   * improve performance. This value can be set to 0 to get the lowest latency.
   * Adjusting this value also affects the {@link updateInterval}.
   */
  get lookAhead() {
    return this._lookAhead;
  }
  set lookAhead(e) {
    this._lookAhead = e, this.updateInterval = e ? e / 2 : 0.01;
  }
  /**
   * The type of playback, which affects tradeoffs between audio
   * output latency and responsiveness.
   * In addition to setting the value in seconds, the latencyHint also
   * accepts the strings "interactive" (prioritizes low latency),
   * "playback" (prioritizes sustained playback), "balanced" (balances
   * latency and performance).
   * @example
   * // prioritize sustained playback
   * const context = new Tone.Context({ latencyHint: "playback" });
   * // set this context as the global Context
   * Tone.setContext(context);
   * // the global context is gettable with Tone.getContext()
   * console.log(Tone.getContext().latencyHint);
   */
  get latencyHint() {
    return this._latencyHint;
  }
  /**
   * The unwrapped AudioContext or OfflineAudioContext
   */
  get rawContext() {
    return this._context;
  }
  /**
   * The current audio context time plus a short {@link lookAhead}.
   * @example
   * setInterval(() => {
   * 	console.log("now", Tone.now());
   * }, 100);
   */
  now() {
    return this._context.currentTime + this._lookAhead;
  }
  /**
   * The current audio context time without the {@link lookAhead}.
   * In most cases it is better to use {@link now} instead of {@link immediate} since
   * with {@link now} the {@link lookAhead} is applied equally to _all_ components including internal components,
   * to making sure that everything is scheduled in sync. Mixing {@link now} and {@link immediate}
   * can cause some timing issues. If no lookAhead is desired, you can set the {@link lookAhead} to `0`.
   */
  immediate() {
    return this._context.currentTime;
  }
  /**
   * Starts the audio context from a suspended state. This is required
   * to initially start the AudioContext.
   * @see {@link start}
   */
  resume() {
    return tt(this._context) ? this._context.resume() : Promise.resolve();
  }
  /**
   * Close the context. Once closed, the context can no longer be used and
   * any AudioNodes created from the context will be silent.
   */
  close() {
    return Ie(this, void 0, void 0, function* () {
      tt(this._context) && this.state !== "closed" && !this._closeStarted && (this._closeStarted = !0, yield this._context.close()), this._initialized && td(this);
    });
  }
  /**
   * **Internal** Generate a looped buffer at some constant value.
   */
  getConstant(e) {
    if (this._constants.has(e))
      return this._constants.get(e);
    {
      const t = this._context.createBuffer(1, 128, this._context.sampleRate), s = t.getChannelData(0);
      for (let o = 0; o < s.length; o++)
        s[o] = e;
      const r = this._context.createBufferSource();
      return r.channelCount = 1, r.channelCountMode = "explicit", r.buffer = t, r.loop = !0, r.start(0), this._constants.set(e, r), r;
    }
  }
  /**
   * Clean up. Also closes the audio context.
   */
  dispose() {
    return super.dispose(), this._ticker.dispose(), this._timeouts.dispose(), Object.keys(this._constants).map((e) => this._constants[e].disconnect()), this.close(), this;
  }
  //---------------------------
  // TIMEOUTS
  //---------------------------
  /**
   * The private loop which keeps track of the context scheduled timeouts
   * Is invoked from the clock source
   */
  _timeoutLoop() {
    const e = this.now();
    this._timeouts.forEachBefore(e, (t) => {
      t.callback(), this._timeouts.remove(t);
    });
  }
  /**
   * A setTimeout which is guaranteed by the clock source.
   * Also runs in the offline context.
   * @param  fn       The callback to invoke
   * @param  timeout  The timeout in seconds
   * @returns ID to use when invoking Context.clearTimeout
   */
  setTimeout(e, t) {
    this._timeoutIds++;
    const s = this.now();
    return this._timeouts.add({
      callback: e,
      id: this._timeoutIds,
      time: s + t
    }), this._timeoutIds;
  }
  /**
   * Clears a previously scheduled timeout with Tone.context.setTimeout
   * @param  id  The ID returned from setTimeout
   */
  clearTimeout(e) {
    return this._timeouts.forEach((t) => {
      t.id === e && this._timeouts.remove(t);
    }), this;
  }
  /**
   * Clear the function scheduled by {@link setInterval}
   */
  clearInterval(e) {
    return this.clearTimeout(e);
  }
  /**
   * Adds a repeating event to the context's callback clock
   */
  setInterval(e, t) {
    const s = ++this._timeoutIds, r = () => {
      const o = this.now();
      this._timeouts.add({
        callback: () => {
          e(), r();
        },
        id: s,
        time: o + t
      });
    };
    return r(), s;
  }
}
class nd extends Hr {
  constructor() {
    super(...arguments), this.lookAhead = 0, this.latencyHint = 0, this.isOffline = !1;
  }
  //---------------------------
  // BASE AUDIO CONTEXT METHODS
  //---------------------------
  createAnalyser() {
    return {};
  }
  createOscillator() {
    return {};
  }
  createBufferSource() {
    return {};
  }
  createBiquadFilter() {
    return {};
  }
  createBuffer(e, t, s) {
    return {};
  }
  createChannelMerger(e) {
    return {};
  }
  createChannelSplitter(e) {
    return {};
  }
  createConstantSource() {
    return {};
  }
  createConvolver() {
    return {};
  }
  createDelay(e) {
    return {};
  }
  createDynamicsCompressor() {
    return {};
  }
  createGain() {
    return {};
  }
  createIIRFilter(e, t) {
    return {};
  }
  createPanner() {
    return {};
  }
  createPeriodicWave(e, t, s) {
    return {};
  }
  createStereoPanner() {
    return {};
  }
  createWaveShaper() {
    return {};
  }
  createMediaStreamSource(e) {
    return {};
  }
  createMediaElementSource(e) {
    return {};
  }
  createMediaStreamDestination() {
    return {};
  }
  decodeAudioData(e) {
    return Promise.resolve({});
  }
  //---------------------------
  // TONE AUDIO CONTEXT METHODS
  //---------------------------
  createAudioWorkletNode(e, t) {
    return {};
  }
  get rawContext() {
    return {};
  }
  addAudioWorkletModule(e) {
    return Ie(this, void 0, void 0, function* () {
      return Promise.resolve();
    });
  }
  resume() {
    return Promise.resolve();
  }
  setTimeout(e, t) {
    return 0;
  }
  clearTimeout(e) {
    return this;
  }
  setInterval(e, t) {
    return 0;
  }
  clearInterval(e) {
    return this;
  }
  getConstant(e) {
    return {};
  }
  get currentTime() {
    return 0;
  }
  get state() {
    return {};
  }
  get sampleRate() {
    return 0;
  }
  get listener() {
    return {};
  }
  get transport() {
    return {};
  }
  get draw() {
    return {};
  }
  set draw(e) {
  }
  get destination() {
    return {};
  }
  set destination(e) {
  }
  now() {
    return 0;
  }
  immediate() {
    return 0;
  }
}
function on(n, e) {
  zn(e) ? e.forEach((t) => on(n, t)) : Object.defineProperty(n, e, {
    enumerable: !0,
    writable: !1
  });
}
const Wt = () => {
};
class le extends gt {
  constructor() {
    super(), this.name = "ToneAudioBuffer", this.onload = Wt;
    const e = Le(le.getDefaults(), arguments, ["url", "onload", "onerror"]);
    this.reverse = e.reverse, this.onload = e.onload, Yt(e.url) ? this.load(e.url).catch(e.onerror) : e.url && this.set(e.url);
  }
  static getDefaults() {
    return {
      onerror: Wt,
      onload: Wt,
      reverse: !1
    };
  }
  /**
   * The sample rate of the AudioBuffer
   */
  get sampleRate() {
    return this._buffer ? this._buffer.sampleRate : Ct().sampleRate;
  }
  /**
   * Pass in an AudioBuffer or ToneAudioBuffer to set the value of this buffer.
   */
  set(e) {
    return e instanceof le ? e.loaded ? this._buffer = e.get() : e.onload = () => {
      this.set(e), this.onload(this);
    } : this._buffer = e, this._reversed && this._reverse(), this;
  }
  /**
   * The audio buffer stored in the object.
   */
  get() {
    return this._buffer;
  }
  /**
   * Makes an fetch request for the selected url then decodes the file as an audio buffer.
   * Invokes the callback once the audio buffer loads.
   * @param url The url of the buffer to load. filetype support depends on the browser.
   * @returns A Promise which resolves with this ToneAudioBuffer
   */
  load(e) {
    return Ie(this, void 0, void 0, function* () {
      const t = le.load(e).then((s) => {
        this.set(s), this.onload(this);
      });
      le.downloads.push(t);
      try {
        yield t;
      } finally {
        const s = le.downloads.indexOf(t);
        le.downloads.splice(s, 1);
      }
      return this;
    });
  }
  /**
   * clean up
   */
  dispose() {
    return super.dispose(), this._buffer = void 0, this;
  }
  /**
   * Set the audio buffer from the array.
   * To create a multichannel AudioBuffer, pass in a multidimensional array.
   * @param array The array to fill the audio buffer
   */
  fromArray(e) {
    const t = zn(e) && e[0].length > 0, s = t ? e.length : 1, r = t ? e[0].length : e.length, o = Ct(), i = o.createBuffer(s, r, o.sampleRate), a = !t && s === 1 ? [e] : e;
    for (let l = 0; l < s; l++)
      i.copyToChannel(a[l], l);
    return this._buffer = i, this;
  }
  /**
   * Sums multiple channels into 1 channel
   * @param chanNum Optionally only copy a single channel from the array.
   */
  toMono(e) {
    if (bn(e))
      this.fromArray(this.toArray(e));
    else {
      let t = new Float32Array(this.length);
      const s = this.numberOfChannels;
      for (let r = 0; r < s; r++) {
        const o = this.toArray(r);
        for (let i = 0; i < o.length; i++)
          t[i] += o[i];
      }
      t = t.map((r) => r / s), this.fromArray(t);
    }
    return this;
  }
  /**
   * Get the buffer as an array. Single channel buffers will return a 1-dimensional
   * Float32Array, and multichannel buffers will return multidimensional arrays.
   * @param channel Optionally only copy a single channel from the array.
   */
  toArray(e) {
    if (bn(e))
      return this.getChannelData(e);
    if (this.numberOfChannels === 1)
      return this.toArray(0);
    {
      const t = [];
      for (let s = 0; s < this.numberOfChannels; s++)
        t[s] = this.getChannelData(s);
      return t;
    }
  }
  /**
   * Returns the Float32Array representing the PCM audio data for the specific channel.
   * @param  channel  The channel number to return
   * @return The audio as a TypedArray
   */
  getChannelData(e) {
    return this._buffer ? this._buffer.getChannelData(e) : new Float32Array(0);
  }
  /**
   * Cut a subsection of the array and return a buffer of the
   * subsection. Does not modify the original buffer
   * @param start The time to start the slice
   * @param end The end time to slice. If none is given will default to the end of the buffer
   */
  slice(e, t = this.duration) {
    ee(this.loaded, "Buffer is not loaded");
    const s = Math.floor(e * this.sampleRate), r = Math.floor(t * this.sampleRate);
    ee(s < r, "The start time must be less than the end time");
    const o = r - s, i = Ct().createBuffer(this.numberOfChannels, o, this.sampleRate);
    for (let a = 0; a < this.numberOfChannels; a++)
      i.copyToChannel(this.getChannelData(a).subarray(s, r), a);
    return new le(i);
  }
  /**
   * Reverse the buffer.
   */
  _reverse() {
    if (this.loaded)
      for (let e = 0; e < this.numberOfChannels; e++)
        this.getChannelData(e).reverse();
    return this;
  }
  /**
   * If the buffer is loaded or not
   */
  get loaded() {
    return this.length > 0;
  }
  /**
   * The duration of the buffer in seconds.
   */
  get duration() {
    return this._buffer ? this._buffer.duration : 0;
  }
  /**
   * The length of the buffer in samples
   */
  get length() {
    return this._buffer ? this._buffer.length : 0;
  }
  /**
   * The number of discrete audio channels. Returns 0 if no buffer is loaded.
   */
  get numberOfChannels() {
    return this._buffer ? this._buffer.numberOfChannels : 0;
  }
  /**
   * Reverse the buffer.
   */
  get reverse() {
    return this._reversed;
  }
  set reverse(e) {
    this._reversed !== e && (this._reversed = e, this._reverse());
  }
  /**
   * Create a ToneAudioBuffer from the array. To create a multichannel AudioBuffer,
   * pass in a multidimensional array.
   * @param array The array to fill the audio buffer
   * @return A ToneAudioBuffer created from the array
   */
  static fromArray(e) {
    return new le().fromArray(e);
  }
  /**
   * Creates a ToneAudioBuffer from a URL, returns a promise which resolves to a ToneAudioBuffer
   * @param  url The url to load.
   * @return A promise which resolves to a ToneAudioBuffer
   */
  static fromUrl(e) {
    return Ie(this, void 0, void 0, function* () {
      return yield new le().load(e);
    });
  }
  /**
   * Loads a url using fetch and returns the AudioBuffer.
   */
  static load(e) {
    return Ie(this, void 0, void 0, function* () {
      const t = le.baseUrl === "" || le.baseUrl.endsWith("/") ? le.baseUrl : le.baseUrl + "/", s = yield fetch(t + e);
      if (!s.ok)
        throw new Error(`could not load url: ${e}`);
      const r = yield s.arrayBuffer();
      return yield Ct().decodeAudioData(r);
    });
  }
  /**
   * Checks a url's extension to see if the current browser can play that file type.
   * @param url The url/extension to test
   * @return If the file extension can be played
   * @static
   * @example
   * Tone.ToneAudioBuffer.supportsType("wav"); // returns true
   * Tone.ToneAudioBuffer.supportsType("path/to/file.wav"); // returns true
   */
  static supportsType(e) {
    const t = e.split("."), s = t[t.length - 1];
    return document.createElement("audio").canPlayType("audio/" + s) !== "";
  }
  /**
   * Returns a Promise which resolves when all of the buffers have loaded
   */
  static loaded() {
    return Ie(this, void 0, void 0, function* () {
      for (yield Promise.resolve(); le.downloads.length; )
        yield le.downloads[0];
    });
  }
}
le.baseUrl = "";
le.downloads = [];
class sd extends xt {
  constructor() {
    super({
      clockSource: "offline",
      context: Vt(arguments[0]) ? arguments[0] : Uu(arguments[0], arguments[1] * arguments[2], arguments[2]),
      lookAhead: 0,
      updateInterval: Vt(arguments[0]) ? 128 / arguments[0].sampleRate : 128 / arguments[2]
    }), this.name = "OfflineContext", this._currentTime = 0, this.isOffline = !0, this._duration = Vt(arguments[0]) ? arguments[0].length / arguments[0].sampleRate : arguments[1];
  }
  /**
   * Override the now method to point to the internal clock time
   */
  now() {
    return this._currentTime;
  }
  /**
   * Same as this.now()
   */
  get currentTime() {
    return this._currentTime;
  }
  /**
   * Render just the clock portion of the audio context.
   */
  _renderClock(e) {
    return Ie(this, void 0, void 0, function* () {
      let t = 0;
      for (; this._duration - this._currentTime >= 0; ) {
        this.emit("tick"), this._currentTime += 128 / this.sampleRate, t++;
        const s = Math.floor(this.sampleRate / 128);
        e && t % s === 0 && (yield new Promise((r) => setTimeout(r, 1)));
      }
    });
  }
  /**
   * Render the output of the OfflineContext
   * @param asynchronous If the clock should be rendered asynchronously, which will not block the main thread, but be slightly slower.
   */
  render() {
    return Ie(this, arguments, void 0, function* (e = !0) {
      yield this.workletsAreReady(), yield this._renderClock(e);
      const t = yield this._context.startRendering();
      return new le(t);
    });
  }
  /**
   * Close the context
   */
  close() {
    return Promise.resolve();
  }
}
const jr = new nd();
let st = jr;
function Ct() {
  return st === jr && Hu && rd(new xt()), st;
}
function rd(n, e = !1) {
  e && st.dispose(), tt(n) ? st = new xt(n) : Vt(n) ? st = new sd(n) : st = n;
}
if (Te && !Te.TONE_SILENCE_LOGGING) {
  const e = ` * Tone.js v${Ys} * `;
  console.log(`%c${e}`, "background: #000; color: #fff");
}
function od(n) {
  return Math.pow(10, n / 20);
}
function id(n) {
  return 20 * (Math.log(n) / Math.LN10);
}
function ad(n) {
  return Math.pow(2, n / 12);
}
let an = 440;
function cd() {
  return an;
}
function ld(n) {
  an = n;
}
function Mn(n) {
  return Math.round(ud(n));
}
function ud(n) {
  return 69 + 12 * Math.log2(n / an);
}
function dd(n) {
  return an * Math.pow(2, (n - 69) / 12);
}
class Yn extends gt {
  /**
   * @param context The context associated with the time value. Used to compute
   * Transport and context-relative timing.
   * @param  value  The time value as a number, string or object
   * @param  units  Unit values
   */
  constructor(e, t, s) {
    super(), this.defaultUnits = "s", this._val = t, this._units = s, this.context = e, this._expressions = this._getExpressions();
  }
  /**
   * All of the time encoding expressions
   */
  _getExpressions() {
    return {
      hz: {
        method: (e) => this._frequencyToUnits(parseFloat(e)),
        regexp: /^(\d+(?:\.\d+)?)hz$/i
      },
      i: {
        method: (e) => this._ticksToUnits(parseInt(e, 10)),
        regexp: /^(\d+)i$/i
      },
      m: {
        method: (e) => this._beatsToUnits(parseInt(e, 10) * this._getTimeSignature()),
        regexp: /^(\d+)m$/i
      },
      n: {
        method: (e, t) => {
          const s = parseInt(e, 10), r = t === "." ? 1.5 : 1;
          return s === 1 ? this._beatsToUnits(this._getTimeSignature()) * r : this._beatsToUnits(4 / s) * r;
        },
        regexp: /^(\d+)n(\.?)$/i
      },
      number: {
        method: (e) => this._expressions[this.defaultUnits].method.call(this, e),
        regexp: /^(\d+(?:\.\d+)?)$/
      },
      s: {
        method: (e) => this._secondsToUnits(parseFloat(e)),
        regexp: /^(\d+(?:\.\d+)?)s$/
      },
      samples: {
        method: (e) => parseInt(e, 10) / this.context.sampleRate,
        regexp: /^(\d+)samples$/
      },
      t: {
        method: (e) => {
          const t = parseInt(e, 10);
          return this._beatsToUnits(8 / (Math.floor(t) * 3));
        },
        regexp: /^(\d+)t$/i
      },
      tr: {
        method: (e, t, s) => {
          let r = 0;
          return e && e !== "0" && (r += this._beatsToUnits(this._getTimeSignature() * parseFloat(e))), t && t !== "0" && (r += this._beatsToUnits(parseFloat(t))), s && s !== "0" && (r += this._beatsToUnits(parseFloat(s) / 4)), r;
        },
        regexp: /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?):?(\d+(?:\.\d+)?)?$/
      }
    };
  }
  //-------------------------------------
  // 	VALUE OF
  //-------------------------------------
  /**
   * Evaluate the time value. Returns the time in seconds.
   */
  valueOf() {
    if (this._val instanceof Yn && this.fromType(this._val), rt(this._val))
      return this._noArg();
    if (Yt(this._val) && rt(this._units)) {
      for (const e in this._expressions)
        if (this._expressions[e].regexp.test(this._val.trim())) {
          this._units = e;
          break;
        }
    } else if (ot(this._val)) {
      let e = 0;
      for (const t in this._val)
        if (Y(this._val[t])) {
          const s = this._val[t], r = (
            // @ts-ignore
            new this.constructor(this.context, t).valueOf() * s
          );
          e += r;
        }
      return e;
    }
    if (Y(this._units)) {
      const e = this._expressions[this._units], t = this._val.toString().trim().match(e.regexp);
      return t ? e.method.apply(this, t.slice(1)) : e.method.call(this, this._val);
    } else return Yt(this._val) ? parseFloat(this._val) : this._val;
  }
  //-------------------------------------
  // 	UNIT CONVERSIONS
  //-------------------------------------
  /**
   * Returns the value of a frequency in the current units
   */
  _frequencyToUnits(e) {
    return 1 / e;
  }
  /**
   * Return the value of the beats in the current units
   */
  _beatsToUnits(e) {
    return 60 / this._getBpm() * e;
  }
  /**
   * Returns the value of a second in the current units
   */
  _secondsToUnits(e) {
    return e;
  }
  /**
   * Returns the value of a tick in the current time units
   */
  _ticksToUnits(e) {
    return e * this._beatsToUnits(1) / this._getPPQ();
  }
  /**
   * With no arguments, return 'now'
   */
  _noArg() {
    return this._now();
  }
  //-------------------------------------
  // 	TEMPO CONVERSIONS
  //-------------------------------------
  /**
   * Return the bpm
   */
  _getBpm() {
    return this.context.transport.bpm.value;
  }
  /**
   * Return the timeSignature
   */
  _getTimeSignature() {
    return this.context.transport.timeSignature;
  }
  /**
   * Return the PPQ or 192 if Transport is not available
   */
  _getPPQ() {
    return this.context.transport.PPQ;
  }
  //-------------------------------------
  // 	CONVERSION INTERFACE
  //-------------------------------------
  /**
   * Coerce a time type into this units type.
   * @param type Any time type units
   */
  fromType(e) {
    switch (this._units = void 0, this.defaultUnits) {
      case "s":
        this._val = e.toSeconds();
        break;
      case "i":
        this._val = e.toTicks();
        break;
      case "hz":
        this._val = e.toFrequency();
        break;
      case "midi":
        this._val = e.toMidi();
        break;
    }
    return this;
  }
  /**
   * Return the value in hertz
   */
  toFrequency() {
    return 1 / this.toSeconds();
  }
  /**
   * Return the time in samples
   */
  toSamples() {
    return this.toSeconds() * this.context.sampleRate;
  }
  /**
   * Return the time in milliseconds.
   */
  toMilliseconds() {
    return this.toSeconds() * 1e3;
  }
}
class Xe extends Yn {
  constructor() {
    super(...arguments), this.name = "TimeClass";
  }
  _getExpressions() {
    return Object.assign(super._getExpressions(), {
      now: {
        method: (e) => this._now() + new this.constructor(this.context, e).valueOf(),
        regexp: /^\+(.+)/
      },
      quantize: {
        method: (e) => {
          const t = new Xe(this.context, e).valueOf();
          return this._secondsToUnits(this.context.transport.nextSubdivision(t));
        },
        regexp: /^@(.+)/
      }
    });
  }
  /**
   * Quantize the time by the given subdivision. Optionally add a
   * percentage which will move the time value towards the ideal
   * quantized value by that percentage.
   * @param  subdiv    The subdivision to quantize to
   * @param  percent  Move the time value towards the quantized value by a percentage.
   * @example
   * Tone.Time(21).quantize(2); // returns 22
   * Tone.Time(0.6).quantize("4n", 0.5); // returns 0.55
   */
  quantize(e, t = 1) {
    const s = new this.constructor(this.context, e).valueOf(), r = this.valueOf(), a = Math.round(r / s) * s - r;
    return r + a * t;
  }
  //-------------------------------------
  // CONVERSIONS
  //-------------------------------------
  /**
   * Convert a Time to Notation. The notation values are will be the
   * closest representation between 1m to 128th note.
   * @return {Notation}
   * @example
   * // if the Transport is at 120bpm:
   * Tone.Time(2).toNotation(); // returns "1m"
   */
  toNotation() {
    const e = this.toSeconds(), t = ["1m"];
    for (let o = 1; o < 9; o++) {
      const i = Math.pow(2, o);
      t.push(i + "n."), t.push(i + "n"), t.push(i + "t");
    }
    t.push("0");
    let s = t[0], r = new Xe(this.context, t[0]).toSeconds();
    return t.forEach((o) => {
      const i = new Xe(this.context, o).toSeconds();
      Math.abs(i - e) < Math.abs(r - e) && (s = o, r = i);
    }), s;
  }
  /**
   * Return the time encoded as Bars:Beats:Sixteenths.
   */
  toBarsBeatsSixteenths() {
    const e = this._beatsToUnits(1);
    let t = this.valueOf() / e;
    t = parseFloat(t.toFixed(4));
    const s = Math.floor(t / this._getTimeSignature());
    let r = t % 1 * 4;
    t = Math.floor(t) % this._getTimeSignature();
    const o = r.toString();
    return o.length > 3 && (r = parseFloat(parseFloat(o).toFixed(3))), [s, t, r].join(":");
  }
  /**
   * Return the time in ticks.
   */
  toTicks() {
    const e = this._beatsToUnits(1);
    return this.valueOf() / e * this._getPPQ();
  }
  /**
   * Return the time in seconds.
   */
  toSeconds() {
    return this.valueOf();
  }
  /**
   * Return the value as a midi note.
   */
  toMidi() {
    return Mn(this.toFrequency());
  }
  _now() {
    return this.context.now();
  }
}
class ze extends Xe {
  constructor() {
    super(...arguments), this.name = "Frequency", this.defaultUnits = "hz";
  }
  /**
   * The [concert tuning pitch](https://en.wikipedia.org/wiki/Concert_pitch) which is used
   * to generate all the other pitch values from notes. A4's values in Hertz.
   */
  static get A4() {
    return cd();
  }
  static set A4(e) {
    ld(e);
  }
  //-------------------------------------
  // 	AUGMENT BASE EXPRESSIONS
  //-------------------------------------
  _getExpressions() {
    return Object.assign({}, super._getExpressions(), {
      midi: {
        regexp: /^(\d+(?:\.\d+)?midi)/,
        method(e) {
          return this.defaultUnits === "midi" ? e : ze.mtof(e);
        }
      },
      note: {
        regexp: /^([a-g]{1}(?:b|#|##|x|bb|###|#x|x#|bbb)?)(-?[0-9]+)/i,
        method(e, t) {
          const r = hd[e.toLowerCase()] + (parseInt(t, 10) + 1) * 12;
          return this.defaultUnits === "midi" ? r : ze.mtof(r);
        }
      },
      tr: {
        regexp: /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?):?(\d+(?:\.\d+)?)?/,
        method(e, t, s) {
          let r = 1;
          return e && e !== "0" && (r *= this._beatsToUnits(this._getTimeSignature() * parseFloat(e))), t && t !== "0" && (r *= this._beatsToUnits(parseFloat(t))), s && s !== "0" && (r *= this._beatsToUnits(parseFloat(s) / 4)), r;
        }
      }
    });
  }
  //-------------------------------------
  // 	EXPRESSIONS
  //-------------------------------------
  /**
   * Transposes the frequency by the given number of semitones.
   * @return  A new transposed frequency
   * @example
   * Tone.Frequency("A4").transpose(3); // "C5"
   */
  transpose(e) {
    return new ze(this.context, this.valueOf() * ad(e));
  }
  /**
   * Takes an array of semitone intervals and returns
   * an array of frequencies transposed by those intervals.
   * @return  Returns an array of Frequencies
   * @example
   * Tone.Frequency("A4").harmonize([0, 3, 7]); // ["A4", "C5", "E5"]
   */
  harmonize(e) {
    return e.map((t) => this.transpose(t));
  }
  //-------------------------------------
  // 	UNIT CONVERSIONS
  //-------------------------------------
  /**
   * Return the value of the frequency as a MIDI note
   * @example
   * Tone.Frequency("C4").toMidi(); // 60
   */
  toMidi() {
    return Mn(this.valueOf());
  }
  /**
   * Return the value of the frequency in Scientific Pitch Notation
   * @example
   * Tone.Frequency(69, "midi").toNote(); // "A4"
   */
  toNote() {
    const e = this.toFrequency(), t = Math.log2(e / ze.A4);
    let s = Math.round(12 * t) + 57;
    const r = Math.floor(s / 12);
    return r < 0 && (s += -12 * r), fd[s % 12] + r.toString();
  }
  /**
   * Return the duration of one cycle in seconds.
   */
  toSeconds() {
    return 1 / super.toSeconds();
  }
  /**
   * Return the duration of one cycle in ticks
   */
  toTicks() {
    const e = this._beatsToUnits(1), t = this.valueOf() / e;
    return Math.floor(t * this._getPPQ());
  }
  //-------------------------------------
  // 	UNIT CONVERSIONS HELPERS
  //-------------------------------------
  /**
   * With no arguments, return 0
   */
  _noArg() {
    return 0;
  }
  /**
   * Returns the value of a frequency in the current units
   */
  _frequencyToUnits(e) {
    return e;
  }
  /**
   * Returns the value of a tick in the current time units
   */
  _ticksToUnits(e) {
    return 1 / (e * 60 / (this._getBpm() * this._getPPQ()));
  }
  /**
   * Return the value of the beats in the current units
   */
  _beatsToUnits(e) {
    return 1 / super._beatsToUnits(e);
  }
  /**
   * Returns the value of a second in the current units
   */
  _secondsToUnits(e) {
    return 1 / e;
  }
  /**
   * Convert a MIDI note to frequency value.
   * @param  midi The midi number to convert.
   * @return The corresponding frequency value
   */
  static mtof(e) {
    return dd(e);
  }
  /**
   * Convert a frequency value to a MIDI note.
   * @param frequency The value to frequency value to convert.
   */
  static ftom(e) {
    return Mn(e);
  }
}
const hd = {
  cbbb: -3,
  cbb: -2,
  cb: -1,
  c: 0,
  "c#": 1,
  cx: 2,
  "c##": 2,
  "c###": 3,
  "cx#": 3,
  "c#x": 3,
  dbbb: -1,
  dbb: 0,
  db: 1,
  d: 2,
  "d#": 3,
  dx: 4,
  "d##": 4,
  "d###": 5,
  "dx#": 5,
  "d#x": 5,
  ebbb: 1,
  ebb: 2,
  eb: 3,
  e: 4,
  "e#": 5,
  ex: 6,
  "e##": 6,
  "e###": 7,
  "ex#": 7,
  "e#x": 7,
  fbbb: 2,
  fbb: 3,
  fb: 4,
  f: 5,
  "f#": 6,
  fx: 7,
  "f##": 7,
  "f###": 8,
  "fx#": 8,
  "f#x": 8,
  gbbb: 4,
  gbb: 5,
  gb: 6,
  g: 7,
  "g#": 8,
  gx: 9,
  "g##": 9,
  "g###": 10,
  "gx#": 10,
  "g#x": 10,
  abbb: 6,
  abb: 7,
  ab: 8,
  a: 9,
  "a#": 10,
  ax: 11,
  "a##": 11,
  "a###": 12,
  "ax#": 12,
  "a#x": 12,
  bbbb: 8,
  bbb: 9,
  bb: 10,
  b: 11,
  "b#": 12,
  bx: 13,
  "b##": 13,
  "b###": 14,
  "bx#": 14,
  "b#x": 14
}, fd = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B"
];
class md extends Xe {
  constructor() {
    super(...arguments), this.name = "TransportTime";
  }
  /**
   * Return the current time in whichever context is relevant
   */
  _now() {
    return this.context.transport.seconds;
  }
}
class Je extends gt {
  constructor() {
    super();
    const e = Le(Je.getDefaults(), arguments, ["context"]);
    this.defaultContext ? this.context = this.defaultContext : this.context = e.context;
  }
  static getDefaults() {
    return {
      context: Ct()
    };
  }
  /**
   * Return the current time of the Context clock plus the lookAhead.
   * @example
   * setInterval(() => {
   * 	console.log(Tone.now());
   * }, 100);
   */
  now() {
    return this.context.currentTime + this.context.lookAhead;
  }
  /**
   * Return the current time of the Context clock without any lookAhead.
   * @example
   * setInterval(() => {
   * 	console.log(Tone.immediate());
   * }, 100);
   */
  immediate() {
    return this.context.currentTime;
  }
  /**
   * The duration in seconds of one sample.
   */
  get sampleTime() {
    return 1 / this.context.sampleRate;
  }
  /**
   * The number of seconds of 1 processing block (128 samples)
   * @example
   * console.log(Tone.Destination.blockTime);
   */
  get blockTime() {
    return 128 / this.context.sampleRate;
  }
  /**
   * Convert the incoming time to seconds.
   * This is calculated against the current {@link TransportClass} bpm
   * @example
   * const gain = new Tone.Gain();
   * setInterval(() => console.log(gain.toSeconds("4n")), 100);
   * // ramp the tempo to 60 bpm over 30 seconds
   * Tone.getTransport().bpm.rampTo(60, 30);
   */
  toSeconds(e) {
    return new Xe(this.context, e).toSeconds();
  }
  /**
   * Convert the input to a frequency number
   * @example
   * const gain = new Tone.Gain();
   * console.log(gain.toFrequency("4n"));
   */
  toFrequency(e) {
    return new ze(this.context, e).toFrequency();
  }
  /**
   * Convert the input time into ticks
   * @example
   * const gain = new Tone.Gain();
   * console.log(gain.toTicks("4n"));
   */
  toTicks(e) {
    return new md(this.context, e).toTicks();
  }
  //-------------------------------------
  // 	GET/SET
  //-------------------------------------
  /**
   * Get a subset of the properties which are in the partial props
   */
  _getPartialProperties(e) {
    const t = this.get();
    return Object.keys(t).forEach((s) => {
      rt(e[s]) && delete t[s];
    }), t;
  }
  /**
   * Get the object's attributes.
   * @example
   * const osc = new Tone.Oscillator();
   * console.log(osc.get());
   */
  get() {
    const e = Yu(this);
    return Object.keys(e).forEach((t) => {
      if (Reflect.has(this, t)) {
        const s = this[t];
        Y(s) && Y(s.value) && Y(s.setValueAtTime) ? e[t] = s.value : s instanceof Je ? e[t] = s._getPartialProperties(e[t]) : zn(s) || bn(s) || Yt(s) || Wu(s) ? e[t] = s : delete e[t];
      }
    }), e;
  }
  /**
   * Set multiple properties at once with an object.
   * @example
   * const filter = new Tone.Filter().toDestination();
   * // set values using an object
   * filter.set({
   * 	frequency: "C6",
   * 	type: "highpass"
   * });
   * const player = new Tone.Player("https://tonejs.github.io/audio/berklee/Analogsynth_octaves_highmid.mp3").connect(filter);
   * player.autostart = true;
   */
  set(e) {
    return Object.keys(e).forEach((t) => {
      Reflect.has(this, t) && Y(this[t]) && (this[t] && Y(this[t].value) && Y(this[t].setValueAtTime) ? this[t].value !== e[t] && (this[t].value = e[t]) : this[t] instanceof Je ? this[t].set(e[t]) : this[t] = e[t]);
    }), this;
  }
}
class ut extends Je {
  constructor() {
    const e = Le(ut.getDefaults(), arguments, [
      "param",
      "units",
      "convert"
    ]);
    for (super(e), this.name = "Param", this.overridden = !1, this._minOutput = 1e-7, ee(Y(e.param) && (lt(e.param) || e.param instanceof ut), "param must be an AudioParam"); !lt(e.param); )
      e.param = e.param._param;
    this._swappable = Y(e.swappable) ? e.swappable : !1, this._swappable ? (this.input = this.context.createGain(), this._param = e.param, this.input.connect(this._param)) : this._param = this.input = e.param, this._events = new rn(1e3), this._initialValue = this._param.defaultValue, this.units = e.units, this.convert = e.convert, this._minValue = e.minValue, this._maxValue = e.maxValue, Y(e.value) && e.value !== this._toType(this._initialValue) && this.setValueAtTime(e.value, 0);
  }
  static getDefaults() {
    return Object.assign(Je.getDefaults(), {
      convert: !0,
      units: "number"
    });
  }
  get value() {
    const e = this.now();
    return this.getValueAtTime(e);
  }
  set value(e) {
    this.cancelScheduledValues(this.now()), this.setValueAtTime(e, this.now());
  }
  get minValue() {
    return Y(this._minValue) ? this._minValue : this.units === "time" || this.units === "frequency" || this.units === "normalRange" || this.units === "positive" || this.units === "transportTime" || this.units === "ticks" || this.units === "bpm" || this.units === "hertz" || this.units === "samples" ? 0 : this.units === "audioRange" ? -1 : this.units === "decibels" ? -1 / 0 : this._param.minValue;
  }
  get maxValue() {
    return Y(this._maxValue) ? this._maxValue : this.units === "normalRange" || this.units === "audioRange" ? 1 : this._param.maxValue;
  }
  /**
   * Type guard based on the unit name
   */
  _is(e, t) {
    return this.units === t;
  }
  /**
   * Make sure the value is always in the defined range
   */
  _assertRange(e) {
    return Y(this.maxValue) && Y(this.minValue) && $r(e, this._fromType(this.minValue), this._fromType(this.maxValue)), e;
  }
  /**
   * Convert the given value from the type specified by Param.units
   * into the destination value (such as Gain or Frequency).
   */
  _fromType(e) {
    return this.convert && !this.overridden ? this._is(e, "time") ? this.toSeconds(e) : this._is(e, "decibels") ? od(e) : this._is(e, "frequency") ? this.toFrequency(e) : e : this.overridden ? 0 : e;
  }
  /**
   * Convert the parameters value into the units specified by Param.units.
   */
  _toType(e) {
    return this.convert && this.units === "decibels" ? id(e) : e;
  }
  //-------------------------------------
  // ABSTRACT PARAM INTERFACE
  // all docs are generated from ParamInterface.ts
  //-------------------------------------
  setValueAtTime(e, t) {
    const s = this.toSeconds(t), r = this._fromType(e);
    return ee(isFinite(r) && isFinite(s), `Invalid argument(s) to setValueAtTime: ${JSON.stringify(e)}, ${JSON.stringify(t)}`), this._assertRange(r), this.log(this.units, "setValueAtTime", e, s), this._events.add({
      time: s,
      type: "setValueAtTime",
      value: r
    }), this._param.setValueAtTime(r, s), this;
  }
  getValueAtTime(e) {
    const t = Math.max(this.toSeconds(e), 0), s = this._events.getAfter(t), r = this._events.get(t);
    let o = this._initialValue;
    if (r === null)
      o = this._initialValue;
    else if (r.type === "setTargetAtTime" && (s === null || s.type === "setValueAtTime")) {
      const i = this._events.getBefore(r.time);
      let a;
      i === null ? a = this._initialValue : a = i.value, r.type === "setTargetAtTime" && (o = this._exponentialApproach(r.time, a, r.value, r.constant, t));
    } else if (s === null)
      o = r.value;
    else if (s.type === "linearRampToValueAtTime" || s.type === "exponentialRampToValueAtTime") {
      let i = r.value;
      if (r.type === "setTargetAtTime") {
        const a = this._events.getBefore(r.time);
        a === null ? i = this._initialValue : i = a.value;
      }
      s.type === "linearRampToValueAtTime" ? o = this._linearInterpolate(r.time, i, s.time, s.value, t) : o = this._exponentialInterpolate(r.time, i, s.time, s.value, t);
    } else
      o = r.value;
    return this._toType(o);
  }
  setRampPoint(e) {
    e = this.toSeconds(e);
    let t = this.getValueAtTime(e);
    return this.cancelAndHoldAtTime(e), this._fromType(t) === 0 && (t = this._toType(this._minOutput)), this.setValueAtTime(t, e), this;
  }
  linearRampToValueAtTime(e, t) {
    const s = this._fromType(e), r = this.toSeconds(t);
    return ee(isFinite(s) && isFinite(r), `Invalid argument(s) to linearRampToValueAtTime: ${JSON.stringify(e)}, ${JSON.stringify(t)}`), this._assertRange(s), this._events.add({
      time: r,
      type: "linearRampToValueAtTime",
      value: s
    }), this.log(this.units, "linearRampToValueAtTime", e, r), this._param.linearRampToValueAtTime(s, r), this;
  }
  exponentialRampToValueAtTime(e, t) {
    let s = this._fromType(e);
    s = Fe(s, 0) ? this._minOutput : s, this._assertRange(s);
    const r = this.toSeconds(t);
    return ee(isFinite(s) && isFinite(r), `Invalid argument(s) to exponentialRampToValueAtTime: ${JSON.stringify(e)}, ${JSON.stringify(t)}`), this._events.add({
      time: r,
      type: "exponentialRampToValueAtTime",
      value: s
    }), this.log(this.units, "exponentialRampToValueAtTime", e, r), this._param.exponentialRampToValueAtTime(s, r), this;
  }
  exponentialRampTo(e, t, s) {
    return s = this.toSeconds(s), this.setRampPoint(s), this.exponentialRampToValueAtTime(e, s + this.toSeconds(t)), this;
  }
  linearRampTo(e, t, s) {
    return s = this.toSeconds(s), this.setRampPoint(s), this.linearRampToValueAtTime(e, s + this.toSeconds(t)), this;
  }
  targetRampTo(e, t, s) {
    return s = this.toSeconds(s), this.setRampPoint(s), this.exponentialApproachValueAtTime(e, s, t), this;
  }
  exponentialApproachValueAtTime(e, t, s) {
    t = this.toSeconds(t), s = this.toSeconds(s);
    const r = Math.log(s + 1) / Math.log(200);
    return this.setTargetAtTime(e, t, r), this.cancelAndHoldAtTime(t + s * 0.9), this.linearRampToValueAtTime(e, t + s), this;
  }
  setTargetAtTime(e, t, s) {
    const r = this._fromType(e);
    ee(isFinite(s) && s > 0, "timeConstant must be a number greater than 0");
    const o = this.toSeconds(t);
    return this._assertRange(r), ee(isFinite(r) && isFinite(o), `Invalid argument(s) to setTargetAtTime: ${JSON.stringify(e)}, ${JSON.stringify(t)}`), this._events.add({
      constant: s,
      time: o,
      type: "setTargetAtTime",
      value: r
    }), this.log(this.units, "setTargetAtTime", e, o, s), this._param.setTargetAtTime(r, o, s), this;
  }
  setValueCurveAtTime(e, t, s, r = 1) {
    s = this.toSeconds(s), t = this.toSeconds(t);
    const o = this._fromType(e[0]) * r;
    this.setValueAtTime(this._toType(o), t);
    const i = s / (e.length - 1);
    for (let a = 1; a < e.length; a++) {
      const l = this._fromType(e[a]) * r;
      this.linearRampToValueAtTime(this._toType(l), t + a * i);
    }
    return this;
  }
  cancelScheduledValues(e) {
    const t = this.toSeconds(e);
    return ee(isFinite(t), `Invalid argument to cancelScheduledValues: ${JSON.stringify(e)}`), this._events.cancel(t), this._param.cancelScheduledValues(t), this.log(this.units, "cancelScheduledValues", t), this;
  }
  cancelAndHoldAtTime(e) {
    const t = this.toSeconds(e), s = this._fromType(this.getValueAtTime(t));
    ee(isFinite(t), `Invalid argument to cancelAndHoldAtTime: ${JSON.stringify(e)}`), this.log(this.units, "cancelAndHoldAtTime", t, "value=" + s);
    const r = this._events.get(t), o = this._events.getAfter(t);
    return r && Fe(r.time, t) ? o ? (this._param.cancelScheduledValues(o.time), this._events.cancel(o.time)) : (this._param.cancelAndHoldAtTime(t), this._events.cancel(t + this.sampleTime)) : o && (this._param.cancelScheduledValues(o.time), this._events.cancel(o.time), o.type === "linearRampToValueAtTime" ? this.linearRampToValueAtTime(this._toType(s), t) : o.type === "exponentialRampToValueAtTime" && this.exponentialRampToValueAtTime(this._toType(s), t)), this._events.add({
      time: t,
      type: "setValueAtTime",
      value: s
    }), this._param.setValueAtTime(s, t), this;
  }
  rampTo(e, t = 0.1, s) {
    return this.units === "frequency" || this.units === "bpm" || this.units === "decibels" ? this.exponentialRampTo(e, t, s) : this.linearRampTo(e, t, s), this;
  }
  /**
   * Apply all of the previously scheduled events to the passed in Param or AudioParam.
   * The applied values will start at the context's current time and schedule
   * all of the events which are scheduled on this Param onto the passed in param.
   */
  apply(e) {
    const t = this.context.currentTime;
    e.setValueAtTime(this.getValueAtTime(t), t);
    const s = this._events.get(t);
    if (s && s.type === "setTargetAtTime") {
      const r = this._events.getAfter(s.time), o = r ? r.time : t + 2, i = (o - t) / 10;
      for (let a = t; a < o; a += i)
        e.linearRampToValueAtTime(this.getValueAtTime(a), a);
    }
    return this._events.forEachAfter(this.context.currentTime, (r) => {
      r.type === "cancelScheduledValues" ? e.cancelScheduledValues(r.time) : r.type === "setTargetAtTime" ? e.setTargetAtTime(r.value, r.time, r.constant) : e[r.type](r.value, r.time);
    }), this;
  }
  /**
   * Replace the Param's internal AudioParam. Will apply scheduled curves
   * onto the parameter and replace the connections.
   */
  setParam(e) {
    ee(this._swappable, "The Param must be assigned as 'swappable' in the constructor");
    const t = this.input;
    return t.disconnect(this._param), this.apply(e), this._param = e, t.connect(this._param), this;
  }
  dispose() {
    return super.dispose(), this._events.dispose(), this;
  }
  get defaultValue() {
    return this._toType(this._param.defaultValue);
  }
  //-------------------------------------
  // 	AUTOMATION CURVE CALCULATIONS
  // 	MIT License, copyright (c) 2014 Jordan Santell
  //-------------------------------------
  // Calculates the the value along the curve produced by setTargetAtTime
  _exponentialApproach(e, t, s, r, o) {
    return s + (t - s) * Math.exp(-(o - e) / r);
  }
  // Calculates the the value along the curve produced by linearRampToValueAtTime
  _linearInterpolate(e, t, s, r, o) {
    return t + (r - t) * ((o - e) / (s - e));
  }
  // Calculates the the value along the curve produced by exponentialRampToValueAtTime
  _exponentialInterpolate(e, t, s, r, o) {
    return t * Math.pow(r / t, (o - e) / (s - e));
  }
}
class Se extends Je {
  constructor() {
    super(...arguments), this._internalChannels = [];
  }
  /**
   * The number of inputs feeding into the AudioNode.
   * For source nodes, this will be 0.
   * @example
   * const node = new Tone.Gain();
   * console.log(node.numberOfInputs);
   */
  get numberOfInputs() {
    return Y(this.input) ? lt(this.input) || this.input instanceof ut ? 1 : this.input.numberOfInputs : 0;
  }
  /**
   * The number of outputs of the AudioNode.
   * @example
   * const node = new Tone.Gain();
   * console.log(node.numberOfOutputs);
   */
  get numberOfOutputs() {
    return Y(this.output) ? this.output.numberOfOutputs : 0;
  }
  //-------------------------------------
  // AUDIO PROPERTIES
  //-------------------------------------
  /**
   * Used to decide which nodes to get/set properties on
   */
  _isAudioNode(e) {
    return Y(e) && (e instanceof Se || qe(e));
  }
  /**
   * Get all of the audio nodes (either internal or input/output) which together
   * make up how the class node responds to channel input/output
   */
  _getInternalNodes() {
    const e = this._internalChannels.slice(0);
    return this._isAudioNode(this.input) && e.push(this.input), this._isAudioNode(this.output) && this.input !== this.output && e.push(this.output), e;
  }
  /**
   * Set the audio options for this node such as channelInterpretation
   * channelCount, etc.
   * @param options
   */
  _setChannelProperties(e) {
    this._getInternalNodes().forEach((s) => {
      s.channelCount = e.channelCount, s.channelCountMode = e.channelCountMode, s.channelInterpretation = e.channelInterpretation;
    });
  }
  /**
   * Get the current audio options for this node such as channelInterpretation
   * channelCount, etc.
   */
  _getChannelProperties() {
    const e = this._getInternalNodes();
    ee(e.length > 0, "ToneAudioNode does not have any internal nodes");
    const t = e[0];
    return {
      channelCount: t.channelCount,
      channelCountMode: t.channelCountMode,
      channelInterpretation: t.channelInterpretation
    };
  }
  /**
   * channelCount is the number of channels used when up-mixing and down-mixing
   * connections to any inputs to the node. The default value is 2 except for
   * specific nodes where its value is specially determined.
   */
  get channelCount() {
    return this._getChannelProperties().channelCount;
  }
  set channelCount(e) {
    const t = this._getChannelProperties();
    this._setChannelProperties(Object.assign(t, { channelCount: e }));
  }
  /**
   * channelCountMode determines how channels will be counted when up-mixing and
   * down-mixing connections to any inputs to the node.
   * The default value is "max". This attribute has no effect for nodes with no inputs.
   * * "max" - computedNumberOfChannels is the maximum of the number of channels of all connections to an input. In this mode channelCount is ignored.
   * * "clamped-max" - computedNumberOfChannels is determined as for "max" and then clamped to a maximum value of the given channelCount.
   * * "explicit" - computedNumberOfChannels is the exact value as specified by the channelCount.
   */
  get channelCountMode() {
    return this._getChannelProperties().channelCountMode;
  }
  set channelCountMode(e) {
    const t = this._getChannelProperties();
    this._setChannelProperties(Object.assign(t, { channelCountMode: e }));
  }
  /**
   * channelInterpretation determines how individual channels will be treated
   * when up-mixing and down-mixing connections to any inputs to the node.
   * The default value is "speakers".
   */
  get channelInterpretation() {
    return this._getChannelProperties().channelInterpretation;
  }
  set channelInterpretation(e) {
    const t = this._getChannelProperties();
    this._setChannelProperties(Object.assign(t, { channelInterpretation: e }));
  }
  //-------------------------------------
  // CONNECTIONS
  //-------------------------------------
  /**
   * connect the output of a ToneAudioNode to an AudioParam, AudioNode, or ToneAudioNode
   * @param destination The output to connect to
   * @param outputNum The output to connect from
   * @param inputNum The input to connect to
   */
  connect(e, t = 0, s = 0) {
    return zr(this, e, t, s), this;
  }
  /**
   * Connect the output to the context's destination node.
   * @example
   * const osc = new Tone.Oscillator("C2").start();
   * osc.toDestination();
   */
  toDestination() {
    return this.connect(this.context.destination), this;
  }
  /**
   * Connect the output to the context's destination node.
   * @see {@link toDestination}
   * @deprecated
   */
  toMaster() {
    return qu("toMaster() has been renamed toDestination()"), this.toDestination();
  }
  /**
   * disconnect the output
   */
  disconnect(e, t = 0, s = 0) {
    return gd(this, e, t, s), this;
  }
  /**
   * Connect the output of this node to the rest of the nodes in series.
   * @example
   * const player = new Tone.Player("https://tonejs.github.io/audio/drum-samples/handdrum-loop.mp3");
   * player.autostart = true;
   * const filter = new Tone.AutoFilter(4).start();
   * const distortion = new Tone.Distortion(0.5);
   * // connect the player to the filter, distortion and then to the master output
   * player.chain(filter, distortion, Tone.Destination);
   */
  chain(...e) {
    return pd(this, ...e), this;
  }
  /**
   * connect the output of this node to the rest of the nodes in parallel.
   * @example
   * const player = new Tone.Player("https://tonejs.github.io/audio/drum-samples/conga-rhythm.mp3");
   * player.autostart = true;
   * const pitchShift = new Tone.PitchShift(4).toDestination();
   * const filter = new Tone.Filter("G5").toDestination();
   * // connect a node to the pitch shift and filter in parallel
   * player.fan(pitchShift, filter);
   */
  fan(...e) {
    return e.forEach((t) => this.connect(t)), this;
  }
  /**
   * Dispose and disconnect
   */
  dispose() {
    return super.dispose(), Y(this.input) && (this.input instanceof Se ? this.input.dispose() : qe(this.input) && this.input.disconnect()), Y(this.output) && (this.output instanceof Se ? this.output.dispose() : qe(this.output) && this.output.disconnect()), this._internalChannels = [], this;
  }
}
function pd(...n) {
  const e = n.shift();
  n.reduce((t, s) => (t instanceof Se ? t.connect(s) : qe(t) && zr(t, s), s), e);
}
function zr(n, e, t = 0, s = 0) {
  for (ee(Y(n), "Cannot connect from undefined node"), ee(Y(e), "Cannot connect to undefined node"), (e instanceof Se || qe(e)) && ee(e.numberOfInputs > 0, "Cannot connect to node with no inputs"), ee(n.numberOfOutputs > 0, "Cannot connect from node with no outputs"); e instanceof Se || e instanceof ut; )
    Y(e.input) && (e = e.input);
  for (; n instanceof Se; )
    Y(n.output) && (n = n.output);
  lt(e) ? n.connect(e, t) : n.connect(e, t, s);
}
function gd(n, e, t = 0, s = 0) {
  if (Y(e))
    for (; e instanceof Se; )
      e = e.input;
  for (; !qe(n); )
    Y(n.output) && (n = n.output);
  lt(e) ? n.disconnect(e, t) : qe(e) ? n.disconnect(e, t, s) : n.disconnect();
}
class Zn extends Se {
  constructor() {
    const e = Le(Zn.getDefaults(), arguments, [
      "gain",
      "units"
    ]);
    super(e), this.name = "Gain", this._gainNode = this.context.createGain(), this.input = this._gainNode, this.output = this._gainNode, this.gain = new ut({
      context: this.context,
      convert: e.convert,
      param: this._gainNode.gain,
      units: e.units,
      value: e.gain,
      minValue: e.minValue,
      maxValue: e.maxValue
    }), on(this, "gain");
  }
  static getDefaults() {
    return Object.assign(Se.getDefaults(), {
      convert: !0,
      gain: 1,
      units: "gain"
    });
  }
  /**
   * Clean up.
   */
  dispose() {
    return super.dispose(), this._gainNode.disconnect(), this.gain.dispose(), this;
  }
}
class Qn extends Se {
  constructor() {
    const e = Le(Qn.getDefaults(), arguments, [
      "volume"
    ]);
    super(e), this.name = "Volume", this.input = this.output = new Zn({
      context: this.context,
      gain: e.volume,
      units: "decibels"
    }), this.volume = this.output.gain, on(this, "volume"), this._unmutedVolume = e.volume, this.mute = e.mute;
  }
  static getDefaults() {
    return Object.assign(Se.getDefaults(), {
      mute: !1,
      volume: 0
    });
  }
  /**
   * Mute the output.
   * @example
   * const vol = new Tone.Volume(-12).toDestination();
   * const osc = new Tone.Oscillator().connect(vol).start();
   * // mute the output
   * vol.mute = true;
   */
  get mute() {
    return this.volume.value === -1 / 0;
  }
  set mute(e) {
    !this.mute && e ? (this._unmutedVolume = this.volume.value, this.volume.value = -1 / 0) : this.mute && !e && (this.volume.value = this._unmutedVolume);
  }
  /**
   * clean up
   */
  dispose() {
    return super.dispose(), this.input.dispose(), this.volume.dispose(), this;
  }
}
class Zt extends Se {
  constructor() {
    const e = Le(Zt.getDefaults(), arguments);
    super(e), this._scheduledEvents = [], this._synced = !1, this._original_triggerAttack = this.triggerAttack, this._original_triggerRelease = this.triggerRelease, this._syncedRelease = (t) => this._original_triggerRelease(t), this._volume = this.output = new Qn({
      context: this.context,
      volume: e.volume
    }), this.volume = this._volume.volume, on(this, "volume");
  }
  static getDefaults() {
    return Object.assign(Se.getDefaults(), {
      volume: 0
    });
  }
  /**
   * Sync the instrument to the Transport. All subsequent calls of
   * {@link triggerAttack} and {@link triggerRelease} will be scheduled along the transport.
   * @example
   * const fmSynth = new Tone.FMSynth().toDestination();
   * fmSynth.volume.value = -6;
   * fmSynth.sync();
   * // schedule 3 notes when the transport first starts
   * fmSynth.triggerAttackRelease("C4", "8n", 0);
   * fmSynth.triggerAttackRelease("E4", "8n", "8n");
   * fmSynth.triggerAttackRelease("G4", "8n", "4n");
   * // start the transport to hear the notes
   * Tone.Transport.start();
   */
  sync() {
    return this._syncState() && (this._syncMethod("triggerAttack", 1), this._syncMethod("triggerRelease", 0), this.context.transport.on("stop", this._syncedRelease), this.context.transport.on("pause", this._syncedRelease), this.context.transport.on("loopEnd", this._syncedRelease)), this;
  }
  /**
   * set _sync
   */
  _syncState() {
    let e = !1;
    return this._synced || (this._synced = !0, e = !0), e;
  }
  /**
   * Wrap the given method so that it can be synchronized
   * @param method Which method to wrap and sync
   * @param  timePosition What position the time argument appears in
   */
  _syncMethod(e, t) {
    const s = this["_original_" + e] = this[e];
    this[e] = (...r) => {
      const o = r[t], i = this.context.transport.schedule((a) => {
        r[t] = a, s.apply(this, r);
      }, o);
      this._scheduledEvents.push(i);
    };
  }
  /**
   * Unsync the instrument from the Transport
   */
  unsync() {
    return this._scheduledEvents.forEach((e) => this.context.transport.clear(e)), this._scheduledEvents = [], this._synced && (this._synced = !1, this.triggerAttack = this._original_triggerAttack, this.triggerRelease = this._original_triggerRelease, this.context.transport.off("stop", this._syncedRelease), this.context.transport.off("pause", this._syncedRelease), this.context.transport.off("loopEnd", this._syncedRelease)), this;
  }
  /**
   * Trigger the attack and then the release after the duration.
   * @param  note     The note to trigger.
   * @param  duration How long the note should be held for before
   *                         triggering the release. This value must be greater than 0.
   * @param time  When the note should be triggered.
   * @param  velocity The velocity the note should be triggered at.
   * @example
   * const synth = new Tone.Synth().toDestination();
   * // trigger "C4" for the duration of an 8th note
   * synth.triggerAttackRelease("C4", "8n");
   */
  triggerAttackRelease(e, t, s, r) {
    const o = this.toSeconds(s), i = this.toSeconds(t);
    return this.triggerAttack(e, o, r), this.triggerRelease(o + i), this;
  }
  /**
   * clean up
   * @returns {Instrument} this
   */
  dispose() {
    return super.dispose(), this._volume.dispose(), this.unsync(), this._scheduledEvents = [], this;
  }
}
function yd(n, e = 1 / 0) {
  const t = /* @__PURE__ */ new WeakMap();
  return function(s, r) {
    Reflect.defineProperty(s, r, {
      configurable: !0,
      enumerable: !0,
      get: function() {
        return t.get(this);
      },
      set: function(o) {
        $r(this.toSeconds(o), n, e), t.set(this, o);
      }
    });
  };
}
class cn extends Zt {
  constructor() {
    const e = Le(cn.getDefaults(), arguments);
    super(e), this.portamento = e.portamento, this.onsilence = e.onsilence;
  }
  static getDefaults() {
    return Object.assign(Zt.getDefaults(), {
      detune: 0,
      onsilence: Wt,
      portamento: 0
    });
  }
  /**
   * Trigger the attack of the note optionally with a given velocity.
   * @param  note The note to trigger.
   * @param  time When the note should start.
   * @param  velocity The velocity determines how "loud" the note will be.
   * @example
   * const synth = new Tone.Synth().toDestination();
   * // trigger the note a half second from now at half velocity
   * synth.triggerAttack("C4", "+0.5", 0.5);
   */
  triggerAttack(e, t, s = 1) {
    this.log("triggerAttack", e, t, s);
    const r = this.toSeconds(t);
    return this._triggerEnvelopeAttack(r, s), this.setNote(e, r), this;
  }
  /**
   * Trigger the release portion of the envelope.
   * @param  time If no time is given, the release happens immediately.
   * @example
   * const synth = new Tone.Synth().toDestination();
   * synth.triggerAttack("C4");
   * // trigger the release a second from now
   * synth.triggerRelease("+1");
   */
  triggerRelease(e) {
    this.log("triggerRelease", e);
    const t = this.toSeconds(e);
    return this._triggerEnvelopeRelease(t), this;
  }
  /**
   * Set the note at the given time. If no time is given, the note
   * will set immediately.
   * @param note The note to change to.
   * @param  time The time when the note should be set.
   * @example
   * const synth = new Tone.Synth().toDestination();
   * synth.triggerAttack("C4");
   * // change to F#6 in one quarter note from now.
   * synth.setNote("F#6", "+4n");
   */
  setNote(e, t) {
    const s = this.toSeconds(t), r = e instanceof ze ? e.toFrequency() : e;
    if (this.portamento > 0 && this.getLevelAtTime(s) > 0.05) {
      const o = this.toSeconds(this.portamento);
      this.frequency.exponentialRampTo(r, o, s);
    } else
      this.frequency.setValueAtTime(r, s);
    return this;
  }
}
Do([
  yd(0)
], cn.prototype, "portamento", void 0);
let je = null;
function Uh(n) {
  je = n;
}
const qs = cn;
class Sd extends qs {
  constructor(t) {
    var a, l, c, u, d, f;
    super(t);
    // --- Native oscillator (fire-and-forget per note) ---
    J(this, "_oscillator", null);
    J(this, "_periodicWave");
    J(this, "_currentPartials");
    // --- ADSR state ---
    J(this, "_adsrParams");
    J(this, "_attackStartTime", -1);
    J(this, "_releaseStartTime", -1);
    J(this, "_lastVelocity", 1);
    // --- Native audio nodes (persistent across notes) ---
    J(this, "_detuneBus");
    // #2: vibrato LFO target
    J(this, "_envelopeGain");
    // #3: ADSR gate
    // #4: Instrument._volume (created by base class)
    J(this, "_presetGain");
    // #5: timbre volume
    J(this, "_tremoloGain");
    // #6: tremolo target
    // --- Filter nodes ---
    J(this, "_hpFilter");
    J(this, "_bpFilter");
    // LP filter for HP→LP bandpass combo
    J(this, "_lpFilter");
    J(this, "_dryGain");
    J(this, "_hpGain");
    J(this, "_bpGain");
    J(this, "_lpGain");
    // [PERF:LAZY-FILTER] Track whether the filter wet chain is connected
    J(this, "_filterChainConnected", !1);
    // --- Public LFO connection targets ---
    J(this, "detuneInput");
    // vibrato LFO connects here
    J(this, "tremoloInput");
    // tremolo LFO connects here
    // Frequency proxy — satisfies Monophonic.setNote() with 0 native nodes
    J(this, "frequency");
    const s = this.context.rawContext, r = this;
    this._adsrParams = {
      attack: ((a = t.envelope) == null ? void 0 : a.attack) ?? 5e-3,
      decay: ((l = t.envelope) == null ? void 0 : l.decay) ?? 0.1,
      sustain: ((c = t.envelope) == null ? void 0 : c.sustain) ?? 0.3,
      release: ((u = t.envelope) == null ? void 0 : u.release) ?? 1
    }, this._currentPartials = ((d = t.oscillator) == null ? void 0 : d.partials) ?? [1], this._periodicWave = this._createPeriodicWave(s, this._currentPartials), this.frequency = {
      value: 440,
      setValueAtTime(m, h) {
        const p = r.toFrequency(m);
        r.frequency.value = p, r._oscillator && r._oscillator.frequency.setValueAtTime(p, h);
      },
      exponentialRampTo(m, h, p) {
        const C = r.toFrequency(m);
        r.frequency.value = C, r._oscillator && r._oscillator.frequency.exponentialRampToValueAtTime(C, p + h);
      }
    }, this._detuneBus = s.createGain(), this._detuneBus.gain.value = 1, this._envelopeGain = s.createGain(), this._envelopeGain.gain.value = 0, this._presetGain = s.createGain(), this._presetGain.gain.value = t.gain ?? 1, this._tremoloGain = s.createGain(), this._tremoloGain.gain.value = 1, this._hpFilter = s.createBiquadFilter(), this._hpFilter.type = "highpass", this._bpFilter = s.createBiquadFilter(), this._bpFilter.type = "lowpass", this._lpFilter = s.createBiquadFilter(), this._lpFilter.type = "lowpass", this._dryGain = s.createGain(), this._dryGain.gain.value = 1, this._hpGain = s.createGain(), this._hpGain.gain.value = 0, this._bpGain = s.createGain(), this._bpGain.gain.value = 0, this._lpGain = s.createGain(), this._lpGain.gain.value = 0, this._presetGain.connect(this._dryGain), this._dryGain.connect(this._tremoloGain), this._hpFilter.connect(this._hpGain), this._hpGain.connect(this._tremoloGain), this._hpFilter.connect(this._bpFilter), this._bpFilter.connect(this._bpGain), this._bpGain.connect(this._tremoloGain), this._lpFilter.connect(this._lpGain), this._lpGain.connect(this._tremoloGain), this._tremoloGain.connect(this._envelopeGain);
    const i = this._volume.input._gainNode;
    this._envelopeGain.connect(i), (f = t.filter) != null && f.enabled && this._connectFilterWetChain(), t.filter && this._setFilter(t.filter), this.detuneInput = this._detuneBus, this.tremoloInput = this._tremoloGain.gain;
  }
  static getDefaults() {
    return Object.assign(qs.getDefaults(), {
      envelope: { attack: 5e-3, decay: 0.1, sustain: 0.3, release: 1 },
      oscillator: { type: "custom", partials: [1] },
      filter: void 0,
      gain: 1
    });
  }
  // --- PeriodicWave creation ---
  _createPeriodicWave(t, s) {
    const r = new Float32Array(s.length + 1), o = new Float32Array(s.length + 1);
    for (let i = 0; i < s.length; i++)
      o[i + 1] = s[i];
    return t.createPeriodicWave(r, o);
  }
  _updatePeriodicWave(t) {
    this._currentPartials = t;
    const s = this.context.rawContext;
    this._periodicWave = this._createPeriodicWave(s, t), this._oscillator && this._oscillator.setPeriodicWave(this._periodicWave);
  }
  // --- Monophonic required methods ---
  /**
   * Start the attack portion of the envelope.
   * Called by Monophonic.triggerAttack() BEFORE setNote().
   */
  _triggerEnvelopeAttack(t, s) {
    const r = this.context.rawContext;
    if (this._oscillator) {
      try {
        this._oscillator.onended = null, this._oscillator.stop(t), this._oscillator.disconnect();
      } catch {
      }
      this._oscillator = null;
    }
    this._oscillator = r.createOscillator(), this._oscillator.setPeriodicWave(this._periodicWave), this._oscillator.frequency.setValueAtTime(this.frequency.value, t), this._oscillator.connect(this._presetGain);
    try {
      this._detuneBus.disconnect();
    } catch {
    }
    this._detuneBus.connect(this._oscillator.detune), this._oscillator.start(t), this._attackStartTime = t, this._releaseStartTime = -1, this._lastVelocity = s;
    const { attack: o, decay: i, sustain: a } = this._adsrParams, l = this._envelopeGain.gain;
    l.cancelScheduledValues(t), l.setValueAtTime(0, t), l.linearRampToValueAtTime(s, t + o);
    const c = Math.max(a * s, 1e-4);
    if (i > 0 ? l.exponentialRampToValueAtTime(c, t + o + i) : l.setValueAtTime(c, t + o), a === 0) {
      const u = t + o + i + 0.01;
      this._oscillator.stop(u), this._oscillator.onended = () => {
        this._attackStartTime = -1, this.onsilence(this);
      };
    }
  }
  /**
   * Start the release portion of the envelope.
   * Called by Monophonic.triggerRelease().
   */
  _triggerEnvelopeRelease(t) {
    if (!this._oscillator) return;
    const { release: s } = this._adsrParams, r = this._envelopeGain.gain;
    this._releaseStartTime = t, r.cancelAndHoldAtTime(t), r.linearRampToValueAtTime(0, t + s);
    try {
      this._oscillator.stop(t + s + 0.02);
    } catch {
    }
    this._oscillator.onended = () => {
      this._attackStartTime = -1, this.onsilence(this);
    };
  }
  /**
   * Approximate envelope level at the given time.
   * Used by Monophonic for portamento decisions (> 0.05 means "voice is active").
   */
  getLevelAtTime(t) {
    if (t = this.toSeconds(t), this._attackStartTime < 0) return 0;
    const { attack: s, decay: r, sustain: o, release: i } = this._adsrParams, a = this._lastVelocity;
    if (this._releaseStartTime >= 0) {
      const c = t - this._releaseStartTime;
      if (c >= i) return 0;
      if (c >= 0)
        return o * a * (1 - c / i);
    }
    const l = t - this._attackStartTime;
    if (l < 0) return 0;
    if (l < s)
      return l / s * a;
    if (l < s + r) {
      const c = (l - s) / r;
      return a - (a - o * a) * c;
    }
    return o * a;
  }
  // --- Option handling for PolySynth.set() ---
  set(t) {
    var s;
    return (s = t.oscillator) != null && s.partials && this._updatePeriodicWave(t.oscillator.partials), t.envelope && Object.assign(this._adsrParams, t.envelope), t.gain !== void 0 && this._setPresetGain(t.gain), t.filter && this._setFilter(t.filter), this;
  }
  // --- Public methods (same interface as previous FilteredVoice) ---
  _setPresetGain(t) {
    this._presetGain && (this._presetGain.gain.value = t);
  }
  // [PERF:SHARED-LFO] No-op — vibrato handled by shared per-color LFOs.
  _setVibrato(t, s = V.now()) {
  }
  // [PERF:SHARED-LFO] No-op — tremolo handled by shared per-color LFOs.
  _setTremolo(t, s = V.now()) {
  }
  /**
   * Reset tremoloGain to pass-through (gain=1.0).
   * Called by synthEngine when shared tremolo LFO is disconnected.
   */
  _resetTremoloGain(t = V.now()) {
    this._tremoloGain && (this._tremoloGain.gain.cancelScheduledValues(t), this._tremoloGain.gain.value = 1);
  }
  _setFilter(t) {
    if (t.enabled && !this._filterChainConnected ? this._connectFilterWetChain() : !t.enabled && this._filterChainConnected && this._disconnectFilterWetChain(), this._dryGain.gain.value = t.enabled ? 0 : 1, t.enabled) {
      const s = V.Midi(t.cutoff + 35).toFrequency(), r = t.resonance / 100 * 12 + 0.1;
      this._hpFilter.frequency.value = s, this._hpFilter.Q.value = r, this._bpFilter.frequency.value = s, this._bpFilter.Q.value = r, this._lpFilter.frequency.value = s, this._lpFilter.Q.value = r;
      const o = t.blend;
      o <= 1 ? (this._hpGain.gain.value = 1 - o, this._bpGain.gain.value = o, this._lpGain.gain.value = 0) : (this._hpGain.gain.value = 0, this._bpGain.gain.value = 2 - o, this._lpGain.gain.value = o - 1);
    }
  }
  // [PERF:LAZY-FILTER] Connect filter entrance from _presetGain.
  _connectFilterWetChain() {
    this._filterChainConnected || (this._presetGain.connect(this._hpFilter), this._presetGain.connect(this._lpFilter), this._filterChainConnected = !0, je == null || je.debug("FilteredVoice", "Filter wet chain connected", null, "audio"));
  }
  // [PERF:LAZY-FILTER] Disconnect filter entrance.
  _disconnectFilterWetChain() {
    this._filterChainConnected && (this._presetGain.disconnect(this._hpFilter), this._presetGain.disconnect(this._lpFilter), this._filterChainConnected = !1, je == null || je.debug("FilteredVoice", "Filter wet chain disconnected", null, "audio"));
  }
  /**
   * Clean up all native nodes.
   */
  dispose() {
    if (this._oscillator) {
      try {
        this._oscillator.onended = null, this._oscillator.stop(), this._oscillator.disconnect();
      } catch {
      }
      this._oscillator = null;
    }
    try {
      this._detuneBus.disconnect();
    } catch {
    }
    try {
      this._envelopeGain.disconnect();
    } catch {
    }
    try {
      this._presetGain.disconnect();
    } catch {
    }
    try {
      this._tremoloGain.disconnect();
    } catch {
    }
    try {
      this._dryGain.disconnect();
    } catch {
    }
    try {
      this._hpFilter.disconnect();
    } catch {
    }
    try {
      this._hpGain.disconnect();
    } catch {
    }
    try {
      this._bpFilter.disconnect();
    } catch {
    }
    try {
      this._bpGain.disconnect();
    } catch {
    }
    try {
      this._lpFilter.disconnect();
    } catch {
    }
    try {
      this._lpGain.disconnect();
    } catch {
    }
    return super.dispose(), this;
  }
}
const Xr = {
  polyphonyReference: 32,
  smoothingTauMs: 200,
  masterGainRampMs: 50,
  gainUpdateIntervalMs: 16
};
function Jr(n = Xr.polyphonyReference) {
  return 1 / Math.sqrt(n);
}
class Cd {
  constructor(e, t = {}, s) {
    J(this, "masterGain");
    J(this, "options");
    J(this, "perVoiceBaselineGain");
    J(this, "voiceCountFn");
    J(this, "activeVoiceCount", 0);
    J(this, "smoothedVoiceCount");
    J(this, "gainUpdateLoopId", null);
    this.masterGain = e, this.options = { ...Xr, ...t }, this.perVoiceBaselineGain = Jr(this.options.polyphonyReference), this.smoothedVoiceCount = this.options.polyphonyReference, this.voiceCountFn = s ?? null;
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
    const { polyphonyReference: e, smoothingTauMs: t, masterGainRampMs: s, gainUpdateIntervalMs: r } = this.options, o = V.now();
    if (this.activeVoiceCount === 0) {
      this.smoothedVoiceCount = 0.01 * e + (1 - 0.01) * this.smoothedVoiceCount;
      return;
    }
    const i = r / 1e3, a = 1 - Math.exp(-i / (t / 1e3)), l = Math.max(1, this.activeVoiceCount);
    this.smoothedVoiceCount = a * l + (1 - a) * this.smoothedVoiceCount;
    const c = Math.sqrt(e / this.smoothedVoiceCount), u = this.perVoiceBaselineGain * c;
    this.masterGain.gain.rampTo(u, s / 1e3, o);
  }
}
const vd = {
  clippingWarningThresholdDb: -3,
  clippingMonitorIntervalMs: 500,
  clippingWarningCooldownMs: 2e3
};
class _d {
  constructor(e, t = {}) {
    J(this, "meter");
    J(this, "options");
    J(this, "clippingMonitorId", null);
    J(this, "lastClippingWarningAt", 0);
    this.meter = e, this.options = { ...vd, ...t };
  }
  start() {
    this.stop(), this.lastClippingWarningAt = 0, this.clippingMonitorId = setInterval(() => {
      var r, o;
      const e = this.meter.getValue(), t = Array.isArray(e) ? e[0] : e;
      if (t === void 0 || t <= this.options.clippingWarningThresholdDb)
        return;
      const s = Date.now();
      s - this.lastClippingWarningAt < this.options.clippingWarningCooldownMs || (this.lastClippingWarningAt = s, (o = (r = this.options).onWarning) == null || o.call(r, t));
    }, this.options.clippingMonitorIntervalMs);
  }
  stop() {
    this.clippingMonitorId !== null && (clearInterval(this.clippingMonitorId), this.clippingMonitorId = null);
  }
}
function Hh(n) {
  const {
    timbres: e,
    masterVolume: t = 0,
    effectsManager: s,
    harmonicFilter: r,
    logger: o,
    audioInit: i,
    getDrumVolume: a
  } = n, l = {}, c = {};
  let u = null, d = null, f = null, m = null, h = null, p = {}, C = null, T = null;
  const S = { ...e };
  let N = null;
  const M = () => typeof window < "u" && window.__audioDiag === !0, g = {}, y = {};
  function v() {
    var A;
    let b = 0;
    for (const x in l)
      b += ((A = l[x]) == null ? void 0 : A.activeVoices) ?? 0;
    return b;
  }
  function _(b) {
    const A = [], x = /* @__PURE__ */ new Set(), R = b == null ? void 0 : b._activeVoices;
    R && R.forEach((k) => {
      const L = (k == null ? void 0 : k.voice) ?? k;
      L && !x.has(L) && (x.add(L), A.push(L));
    });
    const B = b == null ? void 0 : b._voices;
    return B && B.forEach((k) => {
      k && !x.has(k) && (x.add(k), A.push(k));
    }), A;
  }
  function E(b, A) {
    if (A.speed > 0 && A.span > 0) {
      const R = A.speed / 100 * 16, B = A.span / 100 * 50;
      if (g[b]) {
        const k = g[b];
        k.frequency.value = R, k.min = -B, k.max = B;
      } else {
        const k = new V.LFO({ frequency: R, min: -B, max: B, type: "sine" });
        k.start(), g[b] = k;
        const L = l[b];
        L && _(L).forEach(($) => {
          try {
            k.connect($.detuneInput);
          } catch {
          }
        }), I.debug("SynthEngine", `[PERF:SHARED-LFO] Created shared vibrato LFO for ${b}`, { freqHz: R, depthCents: B }, "audio");
      }
    } else
      g[b] && (g[b].stop(), g[b].dispose(), g[b] = null, I.debug("SynthEngine", `[PERF:SHARED-LFO] Disposed shared vibrato LFO for ${b}`, null, "audio"));
  }
  function F(b, A) {
    if (A.speed > 0 && A.span > 0) {
      const R = A.speed / 100 * 16, B = A.span / 100;
      if (y[b]) {
        const k = y[b];
        k.frequency.value = R, k.min = -B, k.max = 0;
      } else {
        const k = new V.LFO({ frequency: R, min: -B, max: 0, type: "sine" });
        k.start(), y[b] = k;
        const L = l[b];
        L && _(L).forEach(($) => {
          try {
            k.connect($.tremoloInput);
          } catch {
          }
        }), I.debug("SynthEngine", `[PERF:SHARED-LFO] Created shared tremolo LFO for ${b}`, { freqHz: R, depth: B }, "audio");
      }
    } else if (y[b]) {
      y[b].stop(), y[b].dispose(), y[b] = null;
      const R = l[b];
      R && _(R).forEach((B) => {
        var k;
        try {
          (k = B._resetTremoloGain) == null || k.call(B);
        } catch {
        }
      }), I.debug("SynthEngine", `[PERF:SHARED-LFO] Disposed shared tremolo LFO for ${b}`, null, "audio");
    }
  }
  function P(b, A) {
    try {
      const x = g[A];
      x && x.connect(b.detuneInput);
      const R = y[A];
      R && R.connect(b.tremoloInput);
    } catch (x) {
      I.warn("SynthEngine", `[PERF:SHARED-LFO] Failed to connect shared LFOs to voice for ${A}`, x, "audio");
    }
  }
  const I = o ?? {
    debug: () => {
    },
    info: () => {
    },
    warn: () => {
    }
  };
  function D(b) {
    if (r)
      return r.getFilteredCoefficients(b);
    const A = S[b];
    return A != null && A.coeffs ? A.coeffs : new Float32Array([0, 1]);
  }
  function w(b) {
    const A = b.reduce((x, R) => x + Math.abs(R), 0);
    return A > 1 ? Array.from(b).map((x) => x / A) : Array.from(b);
  }
  const O = {
    init() {
      var b;
      this.stopBackgroundMonitors(), u = new V.Gain(Jr()), C = new Cd(u, {}, v), C.start(), d = new V.Volume(t), f = new V.Compressor({
        threshold: -12,
        ratio: 3,
        attack: 0.01,
        release: 0.1,
        knee: 6
      }), m = new V.Limiter(-3), h = new V.Meter(), u.connect(d), d.connect(f), f.connect(m), m.toDestination(), m.connect(h), h && (T = new _d(h, {
        onWarning: (A) => {
          I.warn("SynthEngine", "Limiter input approaching clipping threshold", { level: A }, "audio");
        }
      }), T.start());
      for (const A in S) {
        const x = S[A];
        if (!x) continue;
        x.vibrato || (x.vibrato = { speed: 0, span: 0 }), x.tremelo || (x.tremelo = { speed: 0, span: 0 });
        const R = D(A), B = w(R), k = x.gain || 1, L = new V.PolySynth({
          maxPolyphony: 1 / 0,
          voice: Sd,
          options: {
            oscillator: { type: "custom", partials: B },
            envelope: x.adsr,
            filter: x.filter,
            vibrato: x.vibrato,
            tremelo: x.tremelo,
            gain: k
          }
        }).connect(u);
        s && u && s.applySynthEffects(L, A, u), c[A] = /* @__PURE__ */ new WeakSet();
        const $ = L.triggerAttack.bind(L);
        L.triggerAttack = function(...U) {
          const q = $(...U), j = (U[1] ?? V.now()) + 5e-3, W = c[A];
          return V.Draw.schedule(() => {
            const re = this._activeVoices, fe = (ne) => {
              !ne || W.has(ne) || (P(ne, A), s && s.applyEffectsToVoice(ne, A), W.add(ne));
            };
            re && re.length > 0 ? re.forEach((ne) => fe((ne == null ? void 0 : ne.voice) ?? ne)) : this._voices && Array.isArray(this._voices) && this._voices.forEach((ne) => fe(ne));
          }, j), q;
        }, L._currentVibrato = x.vibrato, L._currentTremolo = x.tremelo, L._currentFilter = x.filter, l[A] = L, E(A, x.vibrato), F(A, x.tremelo), I.debug("SynthEngine", `Created filtered synth for color: ${A}`, null, "audio");
      }
      try {
        const A = V.context.rawContext;
        (b = A == null ? void 0 : A.addEventListener) == null || b.call(A, "statechange", () => {
          console.warn("[AudioDiag] AudioContext state →", A.state);
        });
      } catch {
      }
      N && (clearInterval(N), N = null), N = setInterval(() => {
        var U, q, z;
        if (!M()) return;
        let A = 0;
        const x = [];
        for (const j in l) {
          const W = ((U = l[j]) == null ? void 0 : U.activeVoices) ?? 0;
          A += W, x.push(`${j.slice(1, 4)}:${W}`);
        }
        const R = (C == null ? void 0 : C.getActiveVoiceCount()) ?? -1, B = ((q = u == null ? void 0 : u.gain.value) == null ? void 0 : q.toFixed(4)) ?? "?", k = ((z = V.context) == null ? void 0 : z.state) ?? "?";
        let L = "?";
        try {
          const j = h == null ? void 0 : h.getValue(), W = Array.isArray(j) ? j[0] : j;
          W !== void 0 && (L = W.toFixed(1));
        } catch {
        }
        const $ = R - A;
        console.log(
          `[AudioDiag] HEALTH | voices: GM=${R} actual=${A} (${x.join(" ")}) | gain: ${B} | ctx: ${k} | meter: ${L}dB` + (Math.abs($) > 5 ? ` | ⚠ DRIFT=${$}` : "")
        );
      }, 2e3), I.info("SynthEngine", "Initialized with multi-timbral support", null, "audio");
    },
    updateSynthForColor(b) {
      const A = S[b], x = l[b];
      if (!x || !A) return;
      A.vibrato || (A.vibrato = { speed: 0, span: 0 }), A.tremelo || (A.tremelo = { speed: 0, span: 0 }), I.debug("SynthEngine", `Updating timbre for color ${b}`, null, "audio");
      const R = D(b), B = w(R);
      x.set({
        oscillator: { partials: B },
        envelope: A.adsr
      }), s && u && s.applySynthEffects(x, b, u), E(b, A.vibrato), F(b, A.tremelo), _(x).forEach((L) => {
        if (L != null && L._setFilter && L._setFilter(A.filter), L != null && L._setPresetGain) {
          const $ = A.gain || 1;
          L._setPresetGain($);
        }
      });
    },
    setBpm(b) {
      var A;
      try {
        (A = V == null ? void 0 : V.Transport) != null && A.bpm && (V.Transport.bpm.value = b, I.debug("SynthEngine", `Tone.Transport BPM updated to ${b}`, null, "audio"));
      } catch (x) {
        I.warn("SynthEngine", "Unable to update BPM on Tone.Transport", { tempo: b, error: x }, "audio");
      }
    },
    setVolume(b) {
      d && (d.volume.value = b);
    },
    async playNote(b, A, x = V.now()) {
      await (i || (() => V.start()))();
      const B = Object.keys(l);
      if (B.length === 0) return;
      const [k] = B;
      if (!k) return;
      const L = l[k];
      L && L.triggerAttackRelease(b, A, x);
    },
    /**
     * Trigger note attack. Used by Transport scheduling with explicit time parameter.
     * For interactive (user-initiated) triggers, use triggerAttackInteractive instead.
     */
    triggerAttack(b, A, x = V.now(), R = !1) {
      var k;
      const B = l[A];
      if (B) {
        if (M()) {
          const L = (C == null ? void 0 : C.getActiveVoiceCount()) ?? -1, $ = v();
          console.log(`[AudioDiag] ATTACK | color=${A} pitch=${b} | GM=${L} actual=${$} | ctx=${(k = V.context) == null ? void 0 : k.state}`);
        }
        if (R && a) {
          const L = a(), $ = B.volume.value, U = $ + 20 * Math.log10(L);
          B.volume.value = U, B.triggerAttack(b, x), V.Draw.schedule(() => {
            B != null && B.volume && (B.volume.value = $);
          }, x + 0.1);
        } else
          B.triggerAttack(b, x);
      }
    },
    /**
     * Trigger note attack for interactive (user-initiated) events.
     * Adds a small scheduling offset (20ms) to help the audio thread process
     * the event without pops or clicks.
     *
     * Use this for mouse clicks, keyboard presses, or other immediate UI triggers.
     */
    triggerAttackInteractive(b, A) {
      V.context.state !== "running" && V.context.resume(), O.triggerAttack(b, A, V.now() + 0.02);
    },
    quickReleasePitches(b, A) {
      var B;
      const x = l[A];
      if (!x || !b || b.length === 0) return;
      let R;
      try {
        const k = typeof x.get == "function" ? x.get() : null, L = (B = k == null ? void 0 : k.envelope) == null ? void 0 : B.release;
        R = typeof L == "number" ? L : void 0, x.set({ envelope: { release: 0.01 } }), b.forEach(($) => {
          x.triggerRelease($, V.now());
        });
      } catch (k) {
        I.warn("SynthEngine", "quickReleasePitches failed", { err: k, color: A, pitches: b }, "audio");
      } finally {
        if (R !== void 0)
          try {
            x.set({ envelope: { release: R } });
          } catch {
          }
      }
    },
    triggerRelease(b, A, x = V.now()) {
      const R = l[A];
      if (R && (R.triggerRelease(b, x), M())) {
        const B = (C == null ? void 0 : C.getActiveVoiceCount()) ?? -1, k = v(), L = B - k;
        console.log(`[AudioDiag] RELEASE | color=${A} pitch=${b} | GM=${B} actual=${k}` + (Math.abs(L) > 5 ? ` | ⚠ DRIFT=${L}` : ""));
      }
    },
    releaseAll() {
      var b;
      for (const A in l)
        (b = l[A]) == null || b.releaseAll();
      C == null || C.resetActiveVoiceCount();
    },
    // === Waveform Visualization ===
    createWaveformAnalyzer(b) {
      const A = l[b];
      return A ? (p[b] || (p[b] = new V.Analyser("waveform", 1024), A.connect(p[b]), I.debug("SynthEngine", `Created waveform analyzer for color: ${b}`, null, "waveform")), p[b]) : (I.warn("SynthEngine", `No synth found for color: ${b}`, null, "audio"), null);
    },
    getWaveformAnalyzer(b) {
      return p[b] || null;
    },
    getAllWaveformAnalyzers() {
      const b = /* @__PURE__ */ new Map();
      for (const A in p)
        p[A] && b.set(A, p[A]);
      return b;
    },
    removeWaveformAnalyzer(b) {
      p[b] && (p[b].dispose(), delete p[b], I.debug("SynthEngine", `Removed waveform analyzer for color: ${b}`, null, "waveform"));
    },
    disposeAllWaveformAnalyzers() {
      for (const b in p)
        p[b] && p[b].dispose();
      p = {}, I.debug("SynthEngine", "Disposed all waveform analyzers", null, "waveform");
    },
    // === Node Access ===
    getSynth(b) {
      return l[b] || null;
    },
    getAllSynths() {
      return { ...l };
    },
    getMainVolumeNode() {
      return d || null;
    },
    getMasterGainNode() {
      return u || null;
    },
    // === Cleanup ===
    stopBackgroundMonitors() {
      T == null || T.stop(), C == null || C.stop(), N && (clearInterval(N), N = null);
    },
    dispose() {
      var b, A, x;
      this.stopBackgroundMonitors(), this.disposeAllWaveformAnalyzers();
      for (const R in g)
        (b = g[R]) == null || b.dispose(), g[R] = null;
      for (const R in y)
        (A = y[R]) == null || A.dispose(), y[R] = null;
      for (const R in l)
        (x = l[R]) == null || x.dispose();
      u == null || u.dispose(), d == null || d.dispose(), f == null || f.dispose(), m == null || m.dispose(), h == null || h.dispose(), I.debug("SynthEngine", "Disposed SynthEngine", null, "audio");
    }
  };
  return O;
}
const $s = 1e-4;
function Td(n) {
  const {
    getMacrobeatInfo: e,
    getPlacedTonicSigns: t,
    getTonicSpanColumnIndices: s,
    updatePlayheadModel: r,
    logger: o
  } = n;
  let i = [], a = 0, l = 0, c = 0, u = null, d = null;
  const f = o ?? {
    debug: () => {
    }
  };
  function m(C) {
    return 60 / (C * 2);
  }
  function h(C, T, S) {
    let N = 0;
    f.debug("TimeMapCalculator", "[TIMEMAP] Building timeMap", {
      columnCount: T.length,
      tonicSignCount: S.length,
      microbeatDuration: C
    });
    const M = T.length, g = s(S);
    for (let y = 0; y < M; y++) {
      i[y] = N;
      const v = g.has(y);
      if (v ? f.debug("TimeMapCalculator", `[TIMEMAP] Column ${y} is tonic, not advancing time`) : N += (T[y] || 0) * C, y < 5) {
        const _ = i[y];
        _ !== void 0 && f.debug("TimeMapCalculator", `[TIMEMAP] timeMap[${y}] = ${_.toFixed(3)}s (isTonic: ${v})`);
      }
    }
    M > 0 && (i[M] = N), f.debug("TimeMapCalculator", `[TIMEMAP] Complete. Total columns: ${M}, Final time: ${N.toFixed(3)}s`);
  }
  function p(C) {
    const T = i.length > 0 ? i[i.length - 1] ?? 0 : 0;
    if (!Number.isFinite(T) || T === 0) {
      a = 0;
      return;
    }
    if (!u || u.length === 0) {
      a = T;
      return;
    }
    let S = T;
    for (const N of u) {
      const M = (d == null ? void 0 : d.get(N.measureIndex)) ?? null;
      if (M) {
        const g = M.endColumn - 1, y = i[g] ?? T, v = T - y, _ = v * N.ratio;
        S = S - v + _;
      }
    }
    a = S;
  }
  return {
    getMicrobeatDuration: m,
    calculate(C) {
      var y, v, _;
      f.debug("TimeMapCalculator", "calculate", { tempo: `${C.tempo} BPM` }), i = [];
      const T = m(C.tempo), { columnWidths: S } = C, N = t();
      h(T, S, N), (v = f.timing) == null || v.call(f, "TimeMapCalculator", "calculate", { totalDuration: `${(y = i[i.length - 1]) == null ? void 0 : y.toFixed(2)}s` });
      const M = ((_ = C.tempoModulationMarkers) == null ? void 0 : _.filter((E) => E.active)) || [];
      if (M.length > 0) {
        u = [...M].sort((E, F) => E.measureIndex - F.measureIndex), d = /* @__PURE__ */ new Map();
        for (const E of u)
          d.set(E.measureIndex, e(E.measureIndex));
      } else
        u = null, d = null;
      p();
      const g = a;
      r == null || r({
        timeMap: i,
        musicalEndTime: g,
        columnWidths: C.columnWidths,
        cellWidth: C.cellWidth
      });
    },
    getTimeMap() {
      return i;
    },
    getMusicalEndTime() {
      return a;
    },
    findNonAnacrusisStart(C) {
      if (!C.hasAnacrusis)
        return f.debug("TimeMapCalculator", "[ANACRUSIS] No anacrusis, starting from time 0"), 0;
      for (let T = 0; T < C.macrobeatBoundaryStyles.length; T++)
        if (C.macrobeatBoundaryStyles[T] === "solid") {
          const S = e(T + 1);
          if (S) {
            const N = i[S.startColumn] || 0;
            return f.debug("TimeMapCalculator", `[ANACRUSIS] Found solid boundary at macrobeat ${T}, non-anacrusis starts at column ${S.startColumn}, time ${N.toFixed(3)}s`), N;
          }
        }
      return f.debug("TimeMapCalculator", "[ANACRUSIS] No solid boundary found, starting from time 0"), 0;
    },
    applyModulationToTime(C, T, S) {
      if (!u || u.length === 0)
        return C;
      let N = C;
      T < 5 && f.debug("TimeMapCalculator", `[MODULATION] Column ${T}: baseTime ${C.toFixed(3)}s, ${u.length} active markers`);
      for (const M of u) {
        const g = (d == null ? void 0 : d.get(M.measureIndex)) ?? null;
        if (g) {
          const y = g.endColumn;
          if (T > y) {
            const v = i[y] !== void 0 ? i[y] : 0, _ = C - v, E = _ * M.ratio;
            N = N - _ + E, T < 5 && f.debug("TimeMapCalculator", `[MODULATION] Column ${T}: Applied marker at measure ${M.measureIndex} (col ${y}), ratio ${M.ratio}, adjustedTime ${N.toFixed(3)}s`);
          }
        }
      }
      return N;
    },
    setLoopBounds(C, T, S) {
      const N = m(S), M = Math.max(N, 1e-3), g = Number.isFinite(C) ? C : 0;
      let y = Number.isFinite(T) ? T : g + M;
      y <= g && (y = g + M), l = g, c = y, V != null && V.Transport && (V.Transport.loopStart = g, V.Transport.loopEnd = y);
    },
    getConfiguredLoopBounds() {
      return { loopStart: l, loopEnd: c };
    },
    setConfiguredLoopBounds(C, T) {
      l = C, c = T;
    },
    clearConfiguredLoopBounds() {
      l = 0, c = 0;
    },
    reapplyConfiguredLoopBounds(C) {
      if (c > l) {
        const T = V.Time(V.Transport.loopStart).toSeconds(), S = V.Time(V.Transport.loopEnd).toSeconds(), N = Math.abs(T - l), M = Math.abs(S - c);
        (N > $s || M > $s) && (V.Transport.loopStart = l, V.Transport.loopEnd = c), V.Transport.loop !== C && (V.Transport.loop = C);
      }
    },
    updateLoopBoundsFromTimeline(C) {
      const T = this.findNonAnacrusisStart(C), S = a;
      this.setLoopBounds(T, S, C.tempo);
    }
  };
}
const Nd = {
  H: "https://tonejs.github.io/audio/drum-samples/CR78/hihat.mp3",
  M: "https://tonejs.github.io/audio/drum-samples/CR78/snare.mp3",
  L: "https://tonejs.github.io/audio/drum-samples/CR78/kick.mp3"
}, wd = 1e-4;
function bd(n = {}) {
  var l;
  const {
    samples: e = Nd,
    synthEngine: t,
    initialVolume: s = 0
  } = n;
  let r = null, o = null;
  const i = /* @__PURE__ */ new Map();
  function a(c, u) {
    let d = Number.isFinite(u) ? u : V.now();
    const f = i.get(c) ?? -1 / 0;
    return d > f || (d = f + wd), i.set(c, d), d;
  }
  if (o = new V.Volume(s), r = new V.Players(e).connect(o), t) {
    const c = (l = t.getMainVolumeNode) == null ? void 0 : l.call(t);
    c ? o.connect(c) : o.toDestination();
  } else
    o.toDestination();
  return {
    getPlayers() {
      return r;
    },
    getVolumeNode() {
      return o;
    },
    trigger(c, u) {
      var f;
      if (!r) return;
      const d = a(c, u);
      (f = r.player(c)) == null || f.start(d);
    },
    reset() {
      i.clear();
    },
    dispose() {
      r == null || r.dispose(), o == null || o.dispose(), r = null, o = null, i.clear();
    },
    isLoaded() {
      return (r == null ? void 0 : r.loaded) ?? !1;
    },
    async waitForLoad() {
      r && await r.loaded;
    }
  };
}
const Us = "♭", Hs = "♯";
function Ad(n, e) {
  if (n.length < 2 || e < n[0] || e >= n[n.length - 1]) return -1;
  let t = 0, s = n.length - 2;
  for (; t <= s; ) {
    const r = t + s >>> 1, o = n[r], i = n[r + 1];
    if (e >= o && e < i)
      return r;
    e < o ? s = r - 1 : t = r + 1;
  }
  return -1;
}
function Md(n) {
  return 60 / (Number.isFinite(n) && n > 0 ? n : 120);
}
function Id(n, e) {
  const t = Md(e);
  if (typeof n.slot == "number") {
    if (n.type === "oval")
      return {
        offsetSeconds: n.slot * (t / 4),
        durationSeconds: t / 2
      };
    if (n.type === "diamond")
      return {
        offsetSeconds: n.slot * (t / 4),
        durationSeconds: t / 4
      };
    if (n.type === "triplet-eighth") {
      const s = t / 3;
      return {
        offsetSeconds: n.slot * s,
        durationSeconds: s
      };
    }
    if (n.type === "triplet-quarter") {
      const s = 2 * t / 3;
      return {
        offsetSeconds: n.slot * s,
        durationSeconds: s
      };
    }
  }
  return {
    offsetSeconds: V.Time(n.offset).toSeconds(),
    durationSeconds: V.Time(n.duration).toSeconds()
  };
}
function jh(n) {
  const {
    synthEngine: e,
    stateCallbacks: t,
    eventCallbacks: s,
    visualCallbacks: r,
    logger: o,
    audioInit: i,
    playbackMode: a = "standard",
    highwayService: l
  } = n, c = o ?? {
    debug: () => {
    },
    info: () => {
    },
    warn: () => {
    }
  };
  let u = null, d = !1, f = null, m = null, h = 1, p = null;
  const C = 50, T = [];
  function S(D, w) {
    const O = w.fullRowData[D];
    return O ? O.toneNote.replace(Us, "b").replace(Hs, "#") : "C4";
  }
  function N(D, w) {
    const O = D.globalRow ?? D.row, b = w.fullRowData[O];
    return b ? b.toneNote.replace(Us, "b").replace(Hs, "#") : "C4";
  }
  function M() {
    var R, B, k, L;
    if (!f) return;
    const D = t.getState();
    c.debug("TransportService", "scheduleNotes", "Clearing previous transport events and rescheduling all notes"), V.Transport.cancel(), m == null || m.reset(), f.calculate(D), (R = r == null ? void 0 : r.clearAdsrVisuals) == null || R.call(r);
    const w = f.getTimeMap(), { loopEnd: O } = f.getConfiguredLoopBounds(), b = f.findNonAnacrusisStart(D);
    c.debug("TransportService", `[ANACRUSIS] hasAnacrusis: ${D.hasAnacrusis}, anacrusisOffset: ${b.toFixed(3)}s`), D.placedNotes.forEach(($, U) => {
      const q = $.startColumnIndex, z = $.endColumnIndex, j = w[q];
      if (j === void 0) {
        c.warn("TransportService", `[NOTE SCHEDULE] Note ${U}: timeMap[${q}] undefined, skipping`);
        return;
      }
      const W = f.applyModulationToTime(j, q, D), re = w[z + 1];
      if (re === void 0) {
        c.warn("TransportService", `Skipping note with invalid endColumnIndex: ${$.endColumnIndex + 1}`);
        return;
      }
      const ne = f.applyModulationToTime(re, z + 1, D) - W;
      $.isDrum ? g($, W) : y($, W, ne, O, D);
    });
    const A = ((B = t.getStampPlaybackData) == null ? void 0 : B.call(t)) ?? [];
    A.forEach(($) => {
      v($, w, D);
    });
    const x = ((k = t.getTripletPlaybackData) == null ? void 0 : k.call(t)) ?? [];
    x.forEach(($) => {
      _($, w, D);
    }), c.debug("TransportService", "scheduleNotes", `Finished scheduling ${D.placedNotes.length} notes, ${A.length} stamps, and ${x.length} triplets`), typeof window < "u" && window.__audioDiag && console.log(`[AudioDiag] SCHEDULE | notes=${D.placedNotes.length} stamps=${A.length} triplets=${x.length} | ctx=${(L = V.context) == null ? void 0 : L.state} | transport=${V.Transport.state}`);
  }
  function g(D, w) {
    const O = t.getState();
    V.Transport.schedule((b) => {
      if (O.isPaused) return;
      const A = D.drumTrack;
      if (A == null) return;
      const x = String(A);
      m == null || m.trigger(x, b), V.Draw.schedule(() => {
        var R;
        (R = r == null ? void 0 : r.triggerDrumNotePop) == null || R.call(r, D.startColumnIndex, A);
      }, b);
    }, w);
  }
  function y(D, w, O, b, A) {
    var j;
    const x = N(D, A), R = D.color, B = D.globalRow ?? D.row, k = ((j = A.fullRowData[B]) == null ? void 0 : j.hex) || "#888888", L = D.uuid, $ = A.timbres[R];
    if (!$) {
      c.warn("TransportService", `Timbre not found for color ${R}. Skipping note ${L}`);
      return;
    }
    let U = w + O;
    const z = b - 1e-3;
    U >= b && (U = Math.max(w + 1e-3, z)), V.Transport.schedule((W) => {
      t.getState().isPaused || (e.triggerAttack(x, R, W), V.Draw.schedule(() => {
        var re;
        (re = r == null ? void 0 : r.triggerAdsrVisual) == null || re.call(r, L, "attack", k, $.adsr), s.emit("noteAttack", { noteId: L, color: R });
      }, W));
    }, w), V.Transport.schedule((W) => {
      e.triggerRelease(x, R, W), V.Draw.schedule(() => {
        var re;
        (re = r == null ? void 0 : r.triggerAdsrVisual) == null || re.call(r, L, "release", k, $.adsr), s.emit("noteRelease", { noteId: L, color: R });
      }, W);
    }, U);
  }
  function v(D, w, O) {
    var R;
    const b = D.column, A = w[b];
    if (A === void 0) return;
    (((R = t.getStampScheduleEvents) == null ? void 0 : R.call(t, D.sixteenthStampId, D.placement)) ?? []).forEach((B) => {
      E(B, A, D.row, D.color, O);
    });
  }
  function _(D, w, O) {
    var R, B;
    const b = ((R = t.timeToCanvas) == null ? void 0 : R.call(t, D.startTimeIndex, O)) ?? D.startTimeIndex, A = w[b];
    if (A === void 0) return;
    (((B = t.getTripletScheduleEvents) == null ? void 0 : B.call(t, D.tripletStampId, D.placement)) ?? []).forEach((k) => {
      E(k, A, D.row, D.color, O);
    });
  }
  function E(D, w, O, b, A) {
    const { offsetSeconds: x, durationSeconds: R } = Id(
      D,
      A.tempo
    ), B = w + x, k = B + R, L = O + D.rowOffset, $ = S(L, A), U = D.noteId;
    V.Transport.schedule((q) => {
      t.getState().isPaused || (e.triggerAttack($, b, q), U && V.Draw.schedule(() => {
        s.emit("noteAttack", { noteId: U, color: b });
      }, q));
    }, B), V.Transport.schedule((q) => {
      t.getState().isPaused || (e.triggerRelease($, b, q), U && V.Draw.schedule(() => {
        s.emit("noteRelease", { noteId: U, color: b });
      }, q));
    }, k);
  }
  function F() {
    var B, k;
    const w = t.getState().tempo, O = 1e-4, b = 0.5, A = (L) => (L == null ? void 0 : L.xPosition) ?? 477.5, x = typeof ((k = (B = V.Transport) == null ? void 0 : B.bpm) == null ? void 0 : k.value) == "number" ? V.Transport.bpm.value : w;
    h = w !== 0 ? x / w : 1, d = !0;
    function R() {
      var Kn, es, ts, ns, ss, rs, os, is, as, cs, ls, us, ds, hs, fs;
      if (!d || !f)
        return;
      if (V.Transport.state === "stopped") {
        u = requestAnimationFrame(R);
        return;
      }
      const L = t.getState(), $ = V.Time(V.Transport.loopEnd).toSeconds(), U = L.isLooping, q = f.getMusicalEndTime(), z = U && $ > 0 ? $ : q, j = V.Transport.seconds, W = j * 1e3, re = j >= z - 1e-3;
      if (!U && re) {
        c.info("TransportService", "Playback reached end. Stopping playhead."), I.stop();
        return;
      }
      if (L.isPaused) {
        u = requestAnimationFrame(R);
        return;
      }
      const fe = f.getTimeMap();
      (Kn = r == null ? void 0 : r.clearPlayheadCanvas) == null || Kn.call(r), (es = r == null ? void 0 : r.clearDrumPlayheadCanvas) == null || es.call(r);
      let ne = j;
      if (U) {
        const et = V.Time(V.Transport.loopStart).toSeconds(), De = V.Time(V.Transport.loopEnd).toSeconds() - et;
        De > 0 && (ne = (j - et) % De + et);
      }
      const Ve = ((ts = t.getCanvasWidth) == null ? void 0 : ts.call(t)) ?? 1e3, ln = ((ns = t.getPlacedTonicSigns) == null ? void 0 : ns.call(t)) ?? [], Dt = ((ss = t.getTonicSpanColumnIndices) == null ? void 0 : ss.call(t, ln)) ?? /* @__PURE__ */ new Set();
      let G = 0, H = 0, ie = 0, Q = -1;
      const X = Ad(fe, ne);
      if (X >= 0) {
        const et = fe[X], ms = fe[X + 1];
        let De = X;
        for (; Dt.has(De) && De < fe.length - 1; )
          De++;
        const dn = ((rs = t.getColumnStartX) == null ? void 0 : rs.call(t, De)) ?? 0, ps = ((os = t.getColumnWidth) == null ? void 0 : os.call(t, De)) ?? 10;
        if (H = dn, ie = ps, Q = De, Dt.has(X))
          G = dn;
        else {
          const gs = ms - et, Zr = ne - et, Qr = gs > 0 ? Zr / gs : 0;
          G = dn + Qr * ps;
        }
      }
      const K = Math.min(G, Ve);
      P(L, K, w, A, O, b);
      const pe = ((is = r == null ? void 0 : r.getPlayheadCanvasHeight) == null ? void 0 : is.call(r)) ?? 500, we = ((as = r == null ? void 0 : r.getDrumCanvasHeight) == null ? void 0 : as.call(r)) ?? 100, Ne = L.playheadMode === "macrobeat" && Q >= 0 ? (cs = t.getMacrobeatHighlightRect) == null ? void 0 : cs.call(t, Q) : null, He = (Ne == null ? void 0 : Ne.x) ?? H, yt = (Ne == null ? void 0 : Ne.width) ?? ie;
      K >= 0 && (L.playheadMode === "macrobeat" || L.playheadMode === "microbeat" ? ((ls = r == null ? void 0 : r.drawPlayheadHighlight) == null || ls.call(r, He, yt, pe, W), (us = r == null ? void 0 : r.drawDrumPlayheadHighlight) == null || us.call(r, He, yt, we, W)) : ((ds = r == null ? void 0 : r.drawPlayheadLine) == null || ds.call(r, K, pe), (hs = r == null ? void 0 : r.drawDrumPlayheadLine) == null || hs.call(r, K, we)));
      const un = L.playheadMode === "macrobeat" || L.playheadMode === "microbeat";
      (fs = r == null ? void 0 : r.updateBeatLineHighlight) == null || fs.call(r, He, yt, un), u = requestAnimationFrame(R);
    }
    R();
  }
  function P(D, w, O, b, A, x) {
    if (!f) return;
    const B = (Array.isArray(D.tempoModulationMarkers) ? D.tempoModulationMarkers : []).filter((k) => (k == null ? void 0 : k.active) && typeof k.ratio == "number" && k.ratio !== 0).sort((k, L) => b(k) - b(L));
    if (B.length > 0) {
      let k = 1;
      for (const L of B) {
        const $ = b(L);
        if (w + x >= $)
          k *= 1 / L.ratio;
        else
          break;
      }
      if ((!Number.isFinite(k) || k <= 0) && (k = 1), Math.abs(k - h) > A) {
        const L = O * k;
        V.Transport.bpm.value = L, f.reapplyConfiguredLoopBounds(D.isLooping), h = k, c.debug("TransportService", `Tempo multiplier updated to ${k.toFixed(3)} (${L.toFixed(2)} BPM)`);
      }
    } else Math.abs(h - 1) > A && (V.Transport.bpm.value = O, f.reapplyConfiguredLoopBounds(D.isLooping), h = 1, c.debug("TransportService", `Tempo reset to base ${O} BPM`));
  }
  const I = {
    init() {
      const D = t.getState();
      f = Td({
        getMacrobeatInfo: t.getMacrobeatInfo ?? (() => null),
        getPlacedTonicSigns: t.getPlacedTonicSigns ?? (() => []),
        getTonicSpanColumnIndices: t.getTonicSpanColumnIndices ?? (() => /* @__PURE__ */ new Set()),
        logger: c
      }), m = bd({
        samples: {
          H: "https://tonejs.github.io/audio/drum-samples/CR78/hihat.mp3",
          M: "https://tonejs.github.io/audio/drum-samples/CR78/snare.mp3",
          L: "https://tonejs.github.io/audio/drum-samples/CR78/kick.mp3"
        },
        synthEngine: {
          getMainVolumeNode: () => e.getMainVolumeNode()
        }
      }), V.Transport.bpm.value = D.tempo;
      const w = () => this.handleStateChange(), O = () => this.handleStateChange(), b = () => this.handleStateChange(), A = () => {
        if (f && f.getTimeMap().length > 0) {
          const k = t.getState();
          f.calculate(k);
        }
        this.handleStateChange();
      }, x = (k) => {
        var U, q;
        const L = ((U = k == null ? void 0 : k.oldConfig) == null ? void 0 : U.columnWidths) || [], $ = ((q = k == null ? void 0 : k.newConfig) == null ? void 0 : q.columnWidths) || [];
        L.length !== $.length && f && f.calculate(t.getState());
      }, R = (k) => {
        if (c.info("TransportService", `tempoChanged triggered with new value: ${k} BPM`), V.Transport.state === "started") {
          const L = V.Transport.position;
          V.Transport.pause(), u && (cancelAnimationFrame(u), u = null), V.Transport.bpm.value = k, f == null || f.reapplyConfiguredLoopBounds(t.getState().isLooping), M(), V.Transport.start(void 0, L), a === "standard" && F();
        } else
          V.Transport.bpm.value = k, f == null || f.reapplyConfiguredLoopBounds(t.getState().isLooping), f == null || f.calculate(t.getState());
      }, B = (k) => {
        V.Transport.loop = k;
        const L = V.Time(V.Transport.loopStart).toSeconds(), $ = V.Time(V.Transport.loopEnd).toSeconds();
        k && $ <= L && f && (V.Transport.loopEnd = L + Math.max(f.getMicrobeatDuration(t.getState().tempo), 1e-3)), k && f ? f.setConfiguredLoopBounds(
          V.Time(V.Transport.loopStart).toSeconds(),
          V.Time(V.Transport.loopEnd).toSeconds()
        ) : f == null || f.clearConfiguredLoopBounds();
      };
      s.on("rhythmStructureChanged", w), s.on("notesChanged", O), s.on("sixteenthStampPlacementsChanged", b), s.on("tempoModulationMarkersChanged", A), s.on("layoutConfigChanged", x), s.on("tempoChanged", R), s.on("loopingChanged", B), T.push(
        () => {
        }
        // These would be off() calls if the event system supports them
      ), V.Transport.on("stop", () => {
        var k, L;
        c.info("TransportService", "Tone.Transport 'stop' fired. Resetting playback state"), (k = s.setPlaybackState) == null || k.call(s, !1, !1), (L = r == null ? void 0 : r.clearAdsrVisuals) == null || L.call(r), u && (cancelAnimationFrame(u), u = null);
      }), c.info("TransportService", "Initialized");
    },
    handleStateChange() {
      V.Transport.state === "started" ? (p !== null && clearTimeout(p), p = setTimeout(() => {
        p = null, c.debug("TransportService", "handleStateChange: Rescheduling after debounce");
        const w = V.Transport.position;
        V.Transport.pause(), M(), V.Transport.start(void 0, w);
      }, C)) : f == null || f.calculate(t.getState());
    },
    start() {
      c.info("TransportService", "Starting playback"), (i || (() => V.start()))().then(async () => {
        V.context.state !== "running" && await V.context.resume(), m && await m.waitForLoad();
        const w = t.getState();
        f == null || f.calculate(w);
        const O = (f == null ? void 0 : f.getMusicalEndTime()) ?? 0, b = (f == null ? void 0 : f.findNonAnacrusisStart(w)) ?? 0;
        f == null || f.setLoopBounds(b, O, w.tempo), V.Transport.bpm.value = w.tempo, M();
        const A = V.now() + 0.1;
        V.Transport.start(A, 0), a === "standard" && F(), s.emit("playbackStarted");
      });
    },
    resume() {
      c.info("TransportService", "Resuming playback"), (i || (() => V.start()))().then(async () => {
        V.context.state !== "running" && await V.context.resume(), V.Transport.start(), a === "standard" && F(), s.emit("playbackResumed");
      });
    },
    pause() {
      c.info("TransportService", "Pausing playback"), V.Transport.pause(), u && (cancelAnimationFrame(u), u = null), s.emit("playbackPaused");
    },
    stop() {
      var w, O, b;
      c.info("TransportService", "Stopping playback and clearing visuals"), p !== null && (clearTimeout(p), p = null), d = !1, u && (cancelAnimationFrame(u), u = null), V.Transport.stop(), V.Transport.cancel(), m == null || m.reset();
      const D = t.getState();
      V.Transport.bpm.value = D.tempo, f == null || f.reapplyConfiguredLoopBounds(D.isLooping), e.releaseAll(), (w = r == null ? void 0 : r.clearPlayheadCanvas) == null || w.call(r), (O = r == null ? void 0 : r.clearDrumPlayheadCanvas) == null || O.call(r), (b = r == null ? void 0 : r.updateBeatLineHighlight) == null || b.call(r, 0, 0, !1), s.emit("playbackStopped");
    },
    dispose() {
      this.stop(), m == null || m.dispose(), T.forEach((D) => D()), c.debug("TransportService", "Disposed");
    }
  };
  return I;
}
const Ed = {
  latencyHint: "playback",
  lookAhead: 0.1
};
function zh(n = {}) {
  const { latencyHint: e, lookAhead: t } = { ...Ed, ...n };
  let s = !1;
  if (V.context.state === "suspended")
    try {
      V.setContext(new V.Context({
        latencyHint: e
      })), s = !0;
    } catch (r) {
      console.warn("Failed to create new AudioContext, using default:", r);
    }
  return t !== void 0 && (V.context.lookAhead = t), s;
}
function Xh() {
  const n = V.context.rawContext, e = n && "baseLatency" in n ? n.baseLatency : void 0;
  return {
    state: V.context.state,
    sampleRate: V.context.sampleRate,
    baseLatency: e,
    lookAhead: V.context.lookAhead
  };
}
function Pd(n) {
  let e = null, t = null;
  function s() {
    const f = typeof performance < "u" ? performance.now() : Date.now();
    return (!e || !t || f - t > 1) && (e = n.getViewportInfo(), t = f), e;
  }
  function r() {
    e = null, t = null;
  }
  function o(f, m) {
    if (n.columnToPixelX)
      return n.columnToPixelX(f, m);
    const { columnWidths: h, cellWidth: p } = m;
    let C = 0;
    for (let T = 0; T < f && T < h.length; T++)
      C += (h[T] ?? 1) * p;
    return C;
  }
  function i(f, m) {
    const h = s(), p = f - h.startRank, C = m.cellHeight / 2;
    return (p + 1) * C;
  }
  function a(f, m) {
    if (n.pixelXToColumn)
      return n.pixelXToColumn(f, m);
    const { columnWidths: h, cellWidth: p } = m;
    let C = 0;
    for (let T = 0; T < h.length; T++) {
      const S = (h[T] ?? 1) * p;
      if (f < C + S)
        return T;
      C += S;
    }
    return h.length - 1;
  }
  function l(f, m) {
    const h = s(), p = m.cellHeight / 2;
    return f / p - 1 + h.startRank;
  }
  function c() {
    const f = s(), { startRank: m, endRank: h } = f, p = Math.max(m, h - 1);
    return { startRow: m, endRow: p };
  }
  function u(f) {
    let m = (f || "").replace(/\d/g, "").trim();
    return m = m.replace(/b/g, "b-").replace(/#/g, "b_"), m;
  }
  function d(f) {
    switch (f) {
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
    getColumnX: o,
    getRowY: i,
    getColumnFromX: a,
    getRowFromY: l,
    getVisibleRowRange: c,
    getPitchClass: u,
    getLineStyleFromPitchClass: d,
    invalidateViewportCache: r,
    getCachedViewportInfo: s
  };
}
const mn = "♯", pn = "♭", Bt = "/", Od = 0.35, xd = 0.5, Dd = 6, Rd = 1, Fd = 0.08, kd = 0.04, Bd = 1, St = 4;
function Ld(n) {
  const { coords: e } = n;
  function t(S) {
    const N = S == null ? void 0 : S.split("-")[1];
    return Number.parseInt(N ?? "0", 10);
  }
  function s(S) {
    if (!S || typeof S.startColumnIndex != "number" || typeof S.endColumnIndex != "number")
      return !1;
    const N = S.shape === "circle" ? S.startColumnIndex + 1 : S.startColumnIndex;
    return S.endColumnIndex > N;
  }
  function r(S, N) {
    return Number.isFinite(S) && S > 0 && Number.isFinite(N) && N > 0;
  }
  function o(S, N, M) {
    const { cellWidth: g } = M, y = g * 0.25, v = S.uuid;
    if (!v) return 0;
    const _ = N.filter(
      (P) => !P.isDrum && P.row === S.row && P.startColumnIndex === S.startColumnIndex && P.uuid && P.uuid !== v
    );
    if (_.length === 0) return 0;
    const E = [S, ..._];
    return E.sort((P, I) => t(P.uuid) - t(I.uuid)), E.findIndex((P) => P.uuid === v) * y;
  }
  function i(S, N) {
    var v, _, E;
    const { cellHeight: M } = N, g = (v = n.getAnimationEffectsManager) == null ? void 0 : v.call(n);
    return (_ = g == null ? void 0 : g.shouldAnimateNote) != null && _.call(g, S) ? (((E = g.getVibratoYOffset) == null ? void 0 : E.call(g, S.color)) ?? 0) * M : 0;
  }
  function a(S, N, M) {
    const { cellHeight: g } = M, y = g / 2 * 0.12, v = S.uuid;
    if (!v) return 0;
    const _ = N.filter(
      (P) => !P.isDrum && P.row === S.row && P.startColumnIndex === S.startColumnIndex && P.uuid && P.uuid !== v && s(P)
    );
    if (_.length === 0) return 0;
    const E = [S, ..._];
    return E.sort((P, I) => t(P.uuid) - t(I.uuid)), E.findIndex((P) => P.uuid === v) * y;
  }
  function l(S, N) {
    var D, w, O;
    const M = (D = n.getDegreeForNote) == null ? void 0 : D.call(n, S);
    if (!M) return { label: null, isAccidental: !1 };
    if (!(((w = n.hasAccidental) == null ? void 0 : w.call(n, M)) ?? !1)) return { label: M, isAccidental: !1 };
    const y = N.accidentalMode || {}, v = y.sharp ?? !0, _ = y.flat ?? !0;
    if (!v && !_) return { label: null, isAccidental: !0 };
    let E = M.includes(mn) ? M : null, F = M.includes(pn) ? M : null;
    const P = (O = n.getEnharmonicDegree) == null ? void 0 : O.call(n, M);
    P && (P.includes(mn) && !E && (E = P), P.includes(pn) && !F && (F = P));
    let I = null;
    if (v && _) {
      const b = [];
      E && b.push(E), F && (!E || F !== E) && b.push(F), I = b.join(Bt), I || (I = M);
    } else v ? I = E || M : _ && (I = F || M);
    return { label: I, isAccidental: !0 };
  }
  function c(S) {
    if (!S) return { multiplier: 1, category: "natural" };
    const N = S.includes(pn), M = S.includes(mn), g = S.includes(Bt);
    return !N && !M ? { multiplier: 1, category: "natural" } : g ? { multiplier: 0.75, category: "both-accidentals" } : { multiplier: 0.88, category: "single-accidental" };
  }
  function u(S, N, M, g, y, v) {
    const { label: _ } = l(N, M);
    if (!_) return;
    const { multiplier: E, category: F } = c(_);
    let P;
    if (N.shape === "circle") {
      const I = v * 2 * xd;
      switch (F) {
        case "natural":
          P = I;
          break;
        case "single-accidental":
          P = I * 0.8;
          break;
        case "both-accidentals":
          P = I * 0.4;
          break;
        default:
          P = I * E;
      }
    } else {
      const I = v * 2 * Od;
      switch (F) {
        case "natural":
          P = I * 1.5;
          break;
        case "single-accidental":
          P = I * 1.2;
          break;
        case "both-accidentals":
          P = I;
          break;
        default:
          P = I * E;
      }
    }
    if (!(P < Dd))
      if (S.fillStyle = "#212529", S.font = `bold ${P}px 'Atkinson Hyperlegible', sans-serif`, S.textAlign = "center", S.textBaseline = "middle", N.shape === "oval" && F === "both-accidentals" && _.includes(Bt)) {
        const I = _.split(Bt), D = P * 1.1, w = D * (I.length - 1), O = y - w / 2;
        I.forEach((b, A) => {
          const x = O + A * D, R = P * 0.08;
          S.fillText(b.trim(), g, x + R);
        });
      } else {
        const I = P * 0.08;
        S.fillText(_, g, y + I);
      }
  }
  function d(S, N, M) {
    var I, D;
    const g = (I = n.getAnimationEffectsManager) == null ? void 0 : I.call(n), y = g == null ? void 0 : g.hasReverbEffect;
    if (!(typeof y == "function" ? y(N.color) : !!y)) return { shouldApply: !1, blur: 0, spread: 0 };
    const { cellWidth: _ } = M, E = (D = g == null ? void 0 : g.getReverbEffect) == null ? void 0 : D.call(g, N.color);
    if (!E) return { shouldApply: !1, blur: 0, spread: 0 };
    const F = E.blur * (_ / 2), P = E.spread * (_ / 3);
    return { shouldApply: F > 0 || P > 0, blur: F, spread: P };
  }
  function f(S, N, M, g, y, v, _) {
    var I, D, w;
    const E = (I = n.getAnimationEffectsManager) == null ? void 0 : I.call(n);
    if (!((D = E == null ? void 0 : E.hasDelayEffect) != null && D.call(E, N.color))) return;
    const { cellWidth: F } = M, P = (w = E.getDelayEffects) == null ? void 0 : w.call(E, N.color);
    !P || P.length === 0 || P.forEach((O) => {
      const b = O.delay / 500 * F * 2, A = g + b, x = v * O.scale, R = _ * O.scale;
      S.save(), S.globalAlpha = O.opacity * 0.6, S.beginPath(), S.ellipse(A, y, x, R, 0, 0, 2 * Math.PI), S.strokeStyle = N.color, S.lineWidth = Math.max(0.5, x * 0.1), S.setLineDash([2, 2]), S.stroke(), S.restore();
    });
  }
  function m(S, N, M, g, y, v) {
    var I, D, w;
    const _ = (I = n.getAnimationEffectsManager) == null ? void 0 : I.call(n);
    if (!((D = _ == null ? void 0 : _.shouldFillNote) != null && D.call(_, N))) return;
    const E = ((w = _.getFillLevel) == null ? void 0 : w.call(_, N)) ?? 0;
    if (E <= 0) return;
    S.save();
    const F = 1 - E, P = S.createRadialGradient(M, g, 0, M, g, Math.max(y, v));
    P.addColorStop(0, "transparent"), P.addColorStop(Math.max(0, F - 0.05), "transparent"), P.addColorStop(F, `${N.color}1F`), P.addColorStop(1, `${N.color}BF`), S.beginPath(), S.ellipse(M, g, y, v, 0, 0, 2 * Math.PI), S.clip(), S.fillStyle = P, S.fillRect(M - y - 10, g - v - 10, (y + 10) * 2, (v + 10) * 2), S.restore();
  }
  function h(S, N, M, g, y, v) {
    var O, b, A;
    const _ = (O = n.getAnimationEffectsManager) == null ? void 0 : O.call(n);
    if (!((b = _ == null ? void 0 : _.shouldFillNote) != null && b.call(_, N))) return;
    const E = ((A = _.getFillLevel) == null ? void 0 : A.call(_, N)) ?? 0;
    if (E <= 0) return;
    S.save(), S.beginPath(), S.arc(M, y, v, Math.PI / 2, -Math.PI / 2, !1), S.lineTo(g, y - v), S.arc(g, y, v, -Math.PI / 2, Math.PI / 2, !1), S.lineTo(M, y + v), S.closePath(), S.clip();
    const F = (M + g) / 2, P = g - M, I = Math.max(P / 2 + v, v), D = 1 - E, w = S.createRadialGradient(F, y, 0, F, y, I);
    w.addColorStop(0, "transparent"), w.addColorStop(Math.max(0, D - 0.05), "transparent"), w.addColorStop(D, `${N.color}1F`), w.addColorStop(1, `${N.color}BF`), S.fillStyle = w, S.fillRect(M - v - 10, y - v - 10, P + (v + 10) * 2, (v + 10) * 2), S.restore();
  }
  function p(S, N, M, g, y, v, _, E) {
    if (h(S, N, g, y, v, _), S.save(), S.beginPath(), S.arc(g, v, _, Math.PI / 2, -Math.PI / 2, !1), S.lineTo(y, v - _), S.arc(y, v, _, -Math.PI / 2, Math.PI / 2, !1), S.lineTo(g, v + _), S.closePath(), S.strokeStyle = N.color, S.lineWidth = E, S.shadowColor = N.color, S.shadowBlur = St, S.stroke(), S.shadowBlur = 0, S.shadowColor = "transparent", S.restore(), M.degreeDisplayMode !== "off") {
      const F = (g + y) / 2;
      u(S, N, M, F, v, _);
    }
  }
  function C(S, N, M, g) {
    const { cellWidth: y, cellHeight: v, tempoModulationMarkers: _, placedNotes: E } = N, F = e.getRowY(g, N), P = i(M, N), I = F + P, D = e.getColumnX(M.startColumnIndex, N);
    let w;
    if (_ && _.length > 0 ? w = e.getColumnX(M.startColumnIndex + 1, N) - D : w = y, !r(w, v)) return;
    const O = o(M, E, N), b = D + w + O, A = Math.max(Rd, w * Fd), x = v / 2 - A / 2, R = s(M), B = N.longNoteStyle || "style1";
    if (R && B === "style2") {
      const $ = b, U = e.getColumnX(M.endColumnIndex, N);
      if (!r(U - $, x)) return;
      p(S, M, N, $, U, I, x, A);
      return;
    }
    if (R) {
      const $ = e.getColumnX(M.endColumnIndex + 1, N), U = a(M, E, N), q = I + U;
      S.beginPath(), S.moveTo(b, q), S.lineTo($, q), S.strokeStyle = M.color, S.lineWidth = Math.max(Bd, w * kd), S.stroke();
    }
    const k = w - A / 2;
    if (!r(k, x)) return;
    f(S, M, N, b, I, k, x), S.save(), m(S, M, b, I, k, x);
    const L = d(S, M, N);
    L.shouldApply && (S.shadowColor = M.color, S.shadowBlur = St + L.blur, S.shadowOffsetX = L.spread), S.beginPath(), S.ellipse(b, I, k, x, 0, 0, 2 * Math.PI), S.strokeStyle = M.color, S.lineWidth = A, L.shouldApply || (S.shadowColor = M.color, S.shadowBlur = St), S.stroke(), S.shadowBlur = 0, S.shadowColor = "transparent", S.shadowOffsetX = 0, S.restore(), N.degreeDisplayMode !== "off" && u(S, M, N, b, I, k);
  }
  function T(S, N, M, g) {
    const { columnWidths: y, cellWidth: v, cellHeight: _, tempoModulationMarkers: E, placedNotes: F } = N, P = e.getRowY(g, N), I = i(M, N), D = P + I, w = e.getColumnX(M.startColumnIndex, N);
    let O;
    if (E && E.length > 0 ? O = e.getColumnX(M.startColumnIndex + 1, N) - w : O = (y[M.startColumnIndex] ?? 1) * v, !r(O, _)) return;
    const b = o(M, F, N), A = Math.max(0.5, O * 0.15), x = w + O / 2 + b, R = O / 2 - A / 2, B = _ / 2 - A / 2;
    if (!r(R, B)) return;
    f(S, M, N, x, D, R, B), S.save(), m(S, M, x, D, R, B);
    const k = d(S, M, N);
    k.shouldApply && (S.shadowColor = M.color, S.shadowBlur = St + k.blur, S.shadowOffsetX = k.spread), S.beginPath(), S.ellipse(x, D, R, B, 0, 0, 2 * Math.PI), S.strokeStyle = M.color, S.lineWidth = A, k.shouldApply || (S.shadowColor = M.color, S.shadowBlur = St), S.stroke(), S.shadowBlur = 0, S.shadowColor = "transparent", S.shadowOffsetX = 0, S.restore(), N.degreeDisplayMode !== "off" && u(S, M, N, x, D, R);
  }
  return {
    drawTwoColumnOvalNote: C,
    drawSingleColumnOvalNote: T,
    hasVisibleTail: s
  };
}
function Vd(n) {
  const { coords: e } = n;
  function t(r, o) {
    const { fullRowData: i, canvasWidth: a, cellHeight: l } = o, { startRow: c, endRow: u } = e.getVisibleRowRange();
    for (let d = c; d <= u; d++) {
      const f = i[d];
      if (!f) continue;
      const m = e.getRowY(d, o), h = e.getPitchClass(f.toneNote), p = e.getLineStyleFromPitchClass(h);
      if (r.beginPath(), r.moveTo(0, m), r.lineTo(a, m), r.strokeStyle = p.color, r.lineWidth = p.lineWidth, r.setLineDash(p.dash), r.stroke(), r.setLineDash([]), h === "G") {
        const C = l / 2;
        r.fillStyle = "#f8f9fa", r.fillRect(0, m - C, a, C);
      }
    }
  }
  function s(r, o) {
    var C, T, S, N;
    const {
      columnWidths: i,
      macrobeatBoundaryStyles: a,
      hasAnacrusis: l,
      canvasHeight: c
    } = o, u = ((C = n.getPlacedTonicSigns) == null ? void 0 : C.call(n)) ?? [], d = ((T = n.getTonicSpanColumnIndices) == null ? void 0 : T.call(n, u)) ?? /* @__PURE__ */ new Set(), f = ((S = n.getAnacrusisColors) == null ? void 0 : S.call(n)) ?? {
      background: "rgba(173, 181, 189, 0.15)",
      border: "rgba(173, 181, 189, 0.3)"
    };
    let m = l, h = 0, p = 0;
    for (let M = 0; M <= i.length; M++) {
      const g = e.getColumnX(M, o), y = (N = n.getMacrobeatInfo) == null ? void 0 : N.call(n, p);
      if (y && y.startColumn === M) {
        const _ = a[p] ?? "solid";
        m && _ === "solid" && (r.fillStyle = f.background, r.fillRect(h, 0, g - h, c), m = !1), r.beginPath(), r.moveTo(g, 0), r.lineTo(g, c), _ === "anacrusis" ? (r.strokeStyle = f.border, r.setLineDash([5, 5]), r.lineWidth = 1) : _ === "dashed" ? (r.strokeStyle = "#adb5bd", r.setLineDash([5, 5]), r.lineWidth = 1) : (r.strokeStyle = "#adb5bd", r.setLineDash([]), r.lineWidth = 2), r.stroke(), r.setLineDash([]), p++;
      } else M > 0 && !d.has(M - 1) && (r.beginPath(), r.moveTo(g, 0), r.lineTo(g, c), r.strokeStyle = "#dee2e6", r.lineWidth = 1, r.stroke());
      if (d.has(M)) {
        const _ = (i[M] ?? 1) * o.cellWidth;
        r.fillStyle = "rgba(255, 193, 7, 0.1)", r.fillRect(g, 0, _, c);
      }
    }
  }
  return {
    drawHorizontalLines: t,
    drawVerticalLines: s
  };
}
function Jh(n, e, t) {
  const s = n.canvas.width, r = n.canvas.height;
  n.clearRect(0, 0, s, r);
  const o = Pd({
    getViewportInfo: t.getViewportInfo,
    columnToPixelX: t.columnToPixelX ? (m, h) => t.columnToPixelX(m, e) : void 0,
    pixelXToColumn: t.pixelXToColumn ? (m, h) => t.pixelXToColumn(m, e) : void 0
  }), i = Vd({
    coords: o,
    getMacrobeatInfo: t.getMacrobeatInfo,
    getPlacedTonicSigns: () => e.placedTonicSigns,
    getTonicSpanColumnIndices: t.getTonicSpanColumnIndices,
    getAnacrusisColors: t.getAnacrusisColors
  }), a = Ld({
    coords: o,
    getDegreeForNote: t.getDegreeForNote,
    hasAccidental: t.hasAccidental,
    getEnharmonicDegree: t.getEnharmonicDegree,
    getAnimationEffectsManager: t.getAnimationEffectsManager
  }), l = {
    ...e,
    canvasWidth: s,
    canvasHeight: r
  }, c = {
    ...e,
    placedNotes: e.placedNotes
  };
  i.drawHorizontalLines(n, l), i.drawVerticalLines(n, l);
  const { startRow: u, endRow: d } = o.getVisibleRowRange(), f = e.placedNotes.filter((m) => {
    if (m.isDrum) return !1;
    const h = m.globalRow ?? m.row;
    return h >= u && h <= d;
  });
  for (const m of f) {
    const h = m.globalRow ?? m.row;
    m.shape === "circle" ? a.drawTwoColumnOvalNote(n, c, m, h) : a.drawSingleColumnOvalNote(n, c, m, h);
  }
  for (const m of e.placedTonicSigns) {
    const h = m.globalRow ?? m.row;
    h >= u && h <= d && Wd(n, e, m, o);
  }
}
function Wd(n, e, t, s) {
  const { cellWidth: r, cellHeight: o } = e, i = s.getRowY(t.globalRow ?? t.row, e), a = s.getColumnX(t.columnIndex, e), l = r * 2, c = a + l / 2, u = Math.min(l, o) / 2 * 0.9;
  if (u < 2 || (n.beginPath(), n.arc(c, i, u, 0, 2 * Math.PI), n.strokeStyle = "#212529", n.lineWidth = Math.max(0.5, r * 0.05), n.stroke(), t.tonicNumber == null)) return;
  const d = t.tonicNumber.toString(), f = u * 1.5;
  f < 6 || (n.fillStyle = "#212529", n.font = `bold ${f}px 'Atkinson Hyperlegible', sans-serif`, n.textAlign = "center", n.textBaseline = "middle", n.fillText(d, c, i));
}
const Gd = ["H", "M", "L"];
function qd(n) {
  if (n.length === 0) return [];
  const e = [...n].sort((s, r) => s.start - r.start), t = [];
  for (const s of e) {
    if (t.length === 0) {
      t.push({ ...s });
      continue;
    }
    const r = t[t.length - 1];
    s.start <= r.end ? r.end = Math.max(r.end, s.end) : t.push({ ...s });
  }
  return t;
}
function $d(n, e, t) {
  const s = /* @__PURE__ */ new Set([n, e]);
  t.forEach((i) => {
    const a = Math.max(n, Math.min(e, i.start)), l = Math.max(n, Math.min(e, i.end));
    l > a && (s.add(a), s.add(l));
  });
  const r = Array.from(s).sort((i, a) => i - a), o = [];
  for (let i = 0; i < r.length - 1; i++) {
    const a = r[i], l = r[i + 1], c = (a + l) / 2, u = t.some((d) => c >= d.start && c < d.end);
    l > a && o.push({ from: a, to: l, light: u });
  }
  return o;
}
function js(n, e) {
  return e.some(
    (t) => n === t.columnIndex || n === t.columnIndex + 1
  );
}
function Ud(n, e) {
  return !e.some((t) => n === t.columnIndex + 1);
}
function zs(n, e, t, s, r, o, i = 1) {
  const a = t + r / 2, l = s + o / 2, c = Math.min(r, o) * 0.4 * i;
  if (n.beginPath(), e === 0)
    n.moveTo(a, l - c), n.lineTo(a - c, l + c), n.lineTo(a + c, l + c), n.closePath();
  else if (e === 1)
    n.moveTo(a, l - c), n.lineTo(a + c, l), n.lineTo(a, l + c), n.lineTo(a - c, l), n.closePath();
  else {
    for (let d = 0; d < 5; d++) {
      const f = 2 * Math.PI / 5 * d - Math.PI / 2, m = a + c * Math.cos(f), h = l + c * Math.sin(f);
      d === 0 ? n.moveTo(m, h) : n.lineTo(m, h);
    }
    n.closePath();
  }
  n.fill();
}
function Hd(n) {
  const { coords: e } = n, t = {
    stroke: "#c7cfd8"
  };
  function s(l, c) {
    const u = [];
    return c !== null && c > 0 && u.push({
      start: e.getColumnX(0, l),
      end: e.getColumnX(c, l)
    }), l.placedTonicSigns.forEach((d) => {
      const f = e.getColumnX(d.columnIndex, l), m = e.getColumnX(d.columnIndex + 2, l);
      u.push({ start: f, end: m });
    }), qd(u);
  }
  function r(l) {
    if (!l.hasAnacrusis || !n.getMacrobeatInfo) return null;
    const c = l.macrobeatBoundaryStyles.findIndex(
      (d) => d === "solid"
    );
    if (c < 0) return null;
    const u = n.getMacrobeatInfo(c);
    return u ? u.endColumn + 1 : null;
  }
  function o(l, c, u) {
    var M, g;
    const {
      columnWidths: d,
      musicalColumnWidths: f,
      macrobeatGroupings: m,
      macrobeatBoundaryStyles: h,
      placedTonicSigns: p
    } = c, T = (f && f.length > 0 ? f : d).length, S = [];
    for (let y = 0; y < m.length; y++) {
      const v = (M = n.getMacrobeatInfo) == null ? void 0 : M.call(n, y);
      v && S.push(v.endColumn + 1);
    }
    const N = ((g = n.getAnacrusisColors) == null ? void 0 : g.call(n)) ?? t;
    for (let y = 0; y <= T; y++) {
      const v = y === 0 || y === T, _ = js(y, p), E = p.some((w) => y === w.columnIndex + 2), F = S.includes(y);
      if (!Ud(y, p)) continue;
      let I = null;
      if (v || _ || E)
        I = { lineWidth: 2, strokeStyle: "#adb5bd", dash: [] };
      else if (F) {
        const w = S.indexOf(y), O = h[w];
        O === "anacrusis" ? I = { lineWidth: 1, strokeStyle: N.stroke, dash: [4, 4] } : I = {
          lineWidth: 1,
          strokeStyle: "#adb5bd",
          dash: O === "solid" ? [] : [5, 5]
        };
      }
      if (!I) continue;
      const D = e.getColumnX(y, c);
      l.beginPath(), l.moveTo(D, 0), l.lineTo(D, u), l.lineWidth = I.lineWidth, l.strokeStyle = I.strokeStyle, l.setLineDash(I.dash), l.stroke();
    }
    l.setLineDash([]);
  }
  function i(l, c, u, d) {
    var C;
    const f = r(c), m = s(c, f), h = $d(0, d, m), p = ((C = n.getAnacrusisColors) == null ? void 0 : C.call(n)) ?? t;
    for (let T = 0; T < 4; T++) {
      const S = T * u;
      h.forEach((N) => {
        N.to <= N.from || (l.beginPath(), l.moveTo(N.from, S), l.lineTo(N.to, S), l.strokeStyle = N.light ? p.stroke : "#ced4da", l.lineWidth = 1, l.globalAlpha = N.light ? 0.6 : 1, l.stroke(), l.globalAlpha = 1);
      });
    }
  }
  function a(l, c, u) {
    var T;
    const { placedNotes: d, columnWidths: f, cellWidth: m, placedTonicSigns: h, tempoModulationMarkers: p } = c, C = f.length + 4;
    for (let S = 0; S < C; S++) {
      if (js(S, h)) continue;
      const N = e.getColumnX(S, c);
      let M;
      p && p.length > 0 ? M = e.getColumnX(S + 1, c) - N : M = (f[S] ?? 0) * m;
      for (let g = 0; g < 3; g++) {
        const y = g * u, v = Gd[g], _ = d.find(
          (E) => E.isDrum && (typeof E.drumTrack == "number" ? String(E.drumTrack) : E.drumTrack) === v && E.startColumnIndex === S
        );
        if (_) {
          l.fillStyle = _.color;
          const E = ((T = n.getAnimationScale) == null ? void 0 : T.call(n, S, v)) ?? 1;
          zs(l, g, N, y, M, u, E);
        } else
          l.fillStyle = "#ced4da", l.beginPath(), l.arc(N + M / 2, y + u / 2, 2, 0, Math.PI * 2), l.fill();
      }
    }
  }
  return {
    drawVerticalLines: o,
    drawHorizontalLines: i,
    drawDrumNotes: a,
    drawDrumShape: zs,
    buildLightRanges: s,
    getAnacrusisEndColumn: r
  };
}
function Yh(n, e, t) {
  var c;
  const s = n.canvas.width, r = n.canvas.height;
  n.clearRect(0, 0, s, r);
  const o = e.baseDrumRowHeight ?? 30, i = e.drumHeightScaleFactor ?? 1.5, a = Math.max(o, i * e.cellHeight), l = Hd(t);
  l.drawHorizontalLines(n, e, a, s), l.drawVerticalLines(n, e, r), l.drawDrumNotes(n, e, a), t.renderModulationMarkers && ((c = e.tempoModulationMarkers) != null && c.length) && t.renderModulationMarkers(n, e);
}
const gn = {
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
function jd(n = {}) {
  const e = {
    ...gn,
    ...n,
    accuracyTiers: n.accuracyTiers ? {
      ...gn.accuracyTiers,
      ...n.accuracyTiers
    } : gn.accuracyTiers
  }, t = /* @__PURE__ */ new Map(), s = /* @__PURE__ */ new Map();
  function r(g, y) {
    return (g - y) * 100;
  }
  function o(g) {
    return g.targetKind ?? "fixedPitch";
  }
  function i(g) {
    return typeof g == "number" && Number.isFinite(g);
  }
  function a(g) {
    return !i(g.midi) || g.midi <= 0 ? !1 : typeof g.amplitudeDb == "number" && typeof e.minAmplitudeDb == "number" ? g.amplitudeDb >= e.minAmplitudeDb : !0;
  }
  function l(g, y) {
    return i(y) ? Math.abs(r(g.midi, y)) <= e.pitchToleranceCents : !1;
  }
  function c(g) {
    return !i(g.minMidi) || !i(g.maxMidi) ? null : {
      minMidi: Math.min(g.minMidi, g.maxMidi),
      maxMidi: Math.max(g.minMidi, g.maxMidi)
    };
  }
  function u(g, y) {
    if (!a(g)) return !1;
    const v = c(y);
    if (!v) return !1;
    const _ = e.bandToleranceSemitones ?? 0;
    return g.midi >= v.minMidi - _ && g.midi <= v.maxMidi + _;
  }
  function d(g, y) {
    if (!a(g)) return !1;
    const v = c(y);
    if (!v) return !0;
    const _ = e.bandToleranceSemitones ?? 0;
    return g.midi >= v.minMidi - _ && g.midi <= v.maxMidi + _;
  }
  function f(g, y) {
    const v = o(y);
    return v === "fixedPitch" ? l(g, y.midi ?? 0) : v === "windowBand" ? u(g, y) : v === "windowAnyPitch" ? d(g, y) : a(g);
  }
  function m(g, y) {
    return !i(y) || g.length === 0 ? 0 : g.reduce((_, E) => _ + Math.abs(r(E.midi, y)), 0) / g.length;
  }
  function h(g, y, v, _) {
    if (g.length === 0)
      return { coveragePct: 0, coveredMs: 0 };
    const E = g.filter(y);
    if (E.length === 0)
      return { coveragePct: 0, coveredMs: 0 };
    let F = 0;
    for (let P = 0; P < E.length; P++) {
      const I = E[P];
      if (!I) continue;
      const D = E[P + 1];
      if (D)
        F += D.timeMs - I.timeMs;
      else {
        const w = v + _, O = Math.min(50, w - I.timeMs);
        F += O;
      }
    }
    return {
      coveragePct: F / _ * 100,
      coveredMs: F
    };
  }
  function p(g, y, v, _) {
    return h(
      g,
      (E) => l(E, y),
      v,
      _
    ).coveragePct;
  }
  function C(g) {
    if (g.length === 0) return 0;
    const y = [...g].sort((_, E) => _ - E), v = Math.floor(y.length / 2);
    return y.length % 2 === 0 ? (y[v - 1] + y[v]) / 2 : y[v] ?? 0;
  }
  function T(g) {
    if (g.length < 2) return 0;
    const y = Math.max(1, Math.floor(g.length * 0.2)), v = g.slice(0, y).map((P) => P.midi), _ = g.slice(Math.max(0, g.length - y)).map((P) => P.midi), E = C(v);
    return C(_) - E;
  }
  function S(g, y, v) {
    const _ = e.accuracyTiers;
    if (!_) return "okay";
    const E = Math.abs(g);
    return E <= _.perfect.onsetMs && y <= _.perfect.pitchCents && v >= _.perfect.coverage ? "perfect" : E <= _.good.onsetMs && y <= _.good.pitchCents && v >= _.good.coverage ? "good" : E <= _.okay.onsetMs && y <= _.okay.pitchCents && v >= _.okay.coverage ? "okay" : "miss";
  }
  function N(g) {
    const { note: y, samples: v, onsetSample: _, releaseSample: E } = g, F = o(y);
    let P = 0;
    _ ? P = _.timeMs - y.startTimeMs : P = e.onsetToleranceMs * 2;
    let I = 0;
    const D = y.startTimeMs + y.durationMs;
    E ? I = E.timeMs - D : I = e.releaseToleranceMs * 2;
    const w = e.minCoveragePct ?? e.hitThreshold, O = e.minVoicedMs ?? 0;
    let b = 0, A = 0, x, R, B, k, L = "miss";
    if (F === "fixedPitch") {
      const U = y.midi ?? 0;
      b = m(v, U), A = p(
        v,
        U,
        y.startTimeMs,
        y.durationMs
      );
      const q = Math.abs(P) <= e.onsetToleranceMs, z = Math.abs(I) <= e.releaseToleranceMs, j = A >= e.hitThreshold;
      L = q && z && j ? "hit" : "miss";
    } else if (F === "windowAnyPitch") {
      const U = h(
        v,
        (q) => d(q, y),
        y.startTimeMs,
        y.durationMs
      );
      x = U.coveragePct, R = U.coveredMs, A = U.coveragePct, L = x >= w && R >= O ? "hit" : "miss";
    } else if (F === "windowBand") {
      const U = h(
        v,
        (j) => u(j, y),
        y.startTimeMs,
        y.durationMs
      );
      B = U.coveragePct, A = U.coveragePct, R = U.coveredMs, x = h(
        v,
        a,
        y.startTimeMs,
        y.durationMs
      ).coveragePct;
      const z = c(y);
      if (z) {
        const j = (z.minMidi + z.maxMidi) / 2, W = v.filter((re) => u(re, y));
        b = m(W, j);
      }
      L = B >= w && (R ?? 0) >= O ? "hit" : "miss";
    } else if (F === "slideWindow") {
      const U = v.filter(a), q = h(
        v,
        a,
        y.startTimeMs,
        y.durationMs
      );
      x = q.coveragePct, R = q.coveredMs, A = q.coveragePct, k = T(U);
      const z = e.minSlideSemitones ?? 0;
      let j = !0;
      y.slideDirection === "up" ? j = k >= z : y.slideDirection === "down" ? j = k <= -z : j = Math.abs(k) >= z, L = x >= w && (R ?? 0) >= O && j ? "hit" : "miss";
    }
    const $ = S(
      P,
      b,
      A
    );
    return {
      hitStatus: L,
      onsetAccuracyMs: P,
      releaseAccuracyMs: I,
      pitchAccuracyCents: b,
      pitchCoverage: A,
      voicedCoverage: x,
      voicedMs: R,
      bandCoverage: B,
      slideSemitoneSpan: k,
      slideDirection: y.slideDirection,
      pitchSamples: [...v],
      accuracyTier: $
    };
  }
  return {
    startNote(g, y) {
      t.set(g, {
        note: y,
        samples: [],
        onsetSample: null,
        releaseSample: null,
        startedAt: performance.now()
      });
    },
    recordPitchSample(g) {
      for (const [y, v] of t) {
        const { note: _ } = v, E = _.startTimeMs + _.durationMs, F = e.onsetToleranceMs, P = e.releaseToleranceMs;
        if (g.timeMs >= _.startTimeMs - F && g.timeMs <= E + P) {
          v.samples.push(g);
          const I = f(g, _);
          !v.onsetSample && g.timeMs >= _.startTimeMs - F && g.timeMs <= _.startTimeMs + F && I && (v.onsetSample = g), g.timeMs >= E - P && g.timeMs <= E + P && I && (v.releaseSample = g);
        }
      }
    },
    endNote(g) {
      const y = t.get(g);
      if (!y) return null;
      const v = N(y);
      return s.set(g, v), t.delete(g), v;
    },
    getCurrentPerformance(g) {
      const y = t.get(g);
      if (!y) return null;
      const { note: v, samples: _, onsetSample: E } = y, F = o(v);
      let P = 0;
      E && (P = E.timeMs - v.startTimeMs);
      let I = 0, D = 0, w, O, b, A;
      if (F === "fixedPitch") {
        const x = v.midi ?? 0;
        I = m(_, x), D = p(
          _,
          x,
          v.startTimeMs,
          v.durationMs
        );
      } else if (F === "windowAnyPitch") {
        const x = h(
          _,
          (R) => d(R, v),
          v.startTimeMs,
          v.durationMs
        );
        w = x.coveragePct, O = x.coveredMs, D = x.coveragePct;
      } else if (F === "windowBand") {
        const x = h(
          _,
          (k) => u(k, v),
          v.startTimeMs,
          v.durationMs
        );
        b = x.coveragePct, D = x.coveragePct, O = x.coveredMs, w = h(
          _,
          a,
          v.startTimeMs,
          v.durationMs
        ).coveragePct;
        const B = c(v);
        if (B) {
          const k = (B.minMidi + B.maxMidi) / 2, L = _.filter(($) => u($, v));
          I = m(L, k);
        }
      } else if (F === "slideWindow") {
        const x = _.filter(a), R = h(
          _,
          a,
          v.startTimeMs,
          v.durationMs
        );
        w = R.coveragePct, O = R.coveredMs, D = R.coveragePct, A = T(x);
      }
      return {
        onsetAccuracyMs: P,
        pitchAccuracyCents: I,
        pitchCoverage: D,
        voicedCoverage: w,
        voicedMs: O,
        bandCoverage: b,
        slideSemitoneSpan: A,
        slideDirection: v.slideDirection,
        pitchSamples: [..._]
      };
    },
    getAllPerformances() {
      return new Map(s);
    },
    reset() {
      t.clear(), s.clear();
    },
    dispose() {
      t.clear(), s.clear();
    }
  };
}
const Xs = {
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
function Zh(n) {
  const e = {
    ...Xs,
    ...n,
    feedbackConfig: {
      ...Xs.feedbackConfig,
      ...n.feedbackConfig
    }
  }, { stateCallbacks: t, eventCallbacks: s, visualCallbacks: r, logger: o } = e, i = {
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
  }, a = jd(e.feedbackConfig);
  let l = null;
  const c = /* @__PURE__ */ new Set(), u = /* @__PURE__ */ new Set();
  let d = null;
  function f() {
    const O = 60 / t.getTempo() * 1e3;
    return e.leadInBeats * O;
  }
  function m() {
    return t.getViewportWidth() * e.judgmentLinePosition;
  }
  function h(w) {
    const O = e.pixelsPerSecond / 1e3, b = m(), A = f();
    return (w + A) * O - b;
  }
  function p(w) {
    return typeof w == "number" && Number.isFinite(w);
  }
  function C(w) {
    return w.targetKind ?? "fixedPitch";
  }
  function T(w) {
    return !p(w.midi) || w.midi <= 0 ? !1 : typeof w.amplitudeDb == "number" && typeof e.feedbackConfig.minAmplitudeDb == "number" ? w.amplitudeDb >= e.feedbackConfig.minAmplitudeDb : !0;
  }
  function S(w, O) {
    const b = C(w), A = e.feedbackConfig.pitchToleranceCents;
    if (!T(O))
      return !1;
    if (b === "fixedPitch")
      return p(w.midi) ? Math.abs((O.midi - w.midi) * 100) <= A : !1;
    if (b === "windowBand") {
      if (!p(w.minMidi) || !p(w.maxMidi)) return !1;
      const x = Math.min(w.minMidi, w.maxMidi), R = Math.max(w.minMidi, w.maxMidi), B = e.feedbackConfig.bandToleranceSemitones ?? 0;
      return O.midi >= x - B && O.midi <= R + B;
    }
    if (b === "windowAnyPitch") {
      if (p(w.minMidi) && p(w.maxMidi)) {
        const x = Math.min(w.minMidi, w.maxMidi), R = Math.max(w.minMidi, w.maxMidi), B = e.feedbackConfig.bandToleranceSemitones ?? 0;
        return O.midi >= x - B && O.midi <= R + B;
      }
      return !0;
    }
    return !0;
  }
  function N() {
    if (!e.waitForInput || !i.onrampComplete)
      return null;
    const w = e.feedbackConfig.onsetToleranceMs;
    for (const O of i.targetNotes) {
      if (!O.waitForInput || u.has(O.id))
        continue;
      const b = O.startTimeMs + O.durationMs + w;
      if (i.currentTimeMs >= O.startTimeMs && i.currentTimeMs <= b)
        return O;
    }
    return null;
  }
  function M(w) {
    i.isWaitingForInput || (i.currentTimeMs = w.startTimeMs, i.scrollOffset = h(i.currentTimeMs), i.isWaitingForInput = !0, i.waitingNoteId = w.id, d = performance.now(), s.emit("waitStarted", { noteId: w.id, note: w }), o == null || o.info("NoteHighway", `Wait started for note: ${w.id}`, {
      noteId: w.id,
      targetKind: w.targetKind
    }));
  }
  function g(w, O) {
    !i.isWaitingForInput || i.waitingNoteId !== w || (i.startTime !== null && d !== null && (i.startTime += performance.now() - d), i.isWaitingForInput = !1, i.waitingNoteId = null, d = null, u.add(w), s.emit("waitEnded", { noteId: w, note: O }), o == null || o.info("NoteHighway", `Wait ended for note: ${w}`, {
      noteId: w,
      targetKind: O.targetKind
    }));
  }
  function y(w) {
    const O = m(), b = t.getCellWidth(), A = w.startColumn * b - i.scrollOffset, x = w.endColumn * b - i.scrollOffset, B = e.feedbackConfig.onsetToleranceMs / 1e3 * e.pixelsPerSecond;
    return A <= O + B && x >= O - B;
  }
  function v() {
    var O, b;
    const w = /* @__PURE__ */ new Set();
    for (const A of i.targetNotes) {
      const x = A.startTimeMs + A.durationMs, R = e.feedbackConfig.onsetToleranceMs;
      if (i.currentTimeMs >= A.startTimeMs - R && i.currentTimeMs <= x + R)
        w.add(A.id), i.activeNotes.has(A.id) || (a.startNote(A.id, A), o == null || o.debug("NoteHighway", `Note ${A.id} became active`, { note: A }));
      else if (i.activeNotes.has(A.id)) {
        const B = a.endNote(A.id);
        if (B) {
          A.performance = B;
          const k = { noteId: A.id, note: A, performance: B };
          B.hitStatus === "hit" ? (s.emit("noteHit", k), (O = r == null ? void 0 : r.onNoteHit) == null || O.call(r, A.id, B.accuracyTier || "okay"), o == null || o.info("NoteHighway", `Note hit: ${A.id}`, B)) : (s.emit("noteMissed", k), (b = r == null ? void 0 : r.onNoteMiss) == null || b.call(r, A.id), o == null || o.info("NoteHighway", `Note missed: ${A.id}`, B));
        }
      }
    }
    i.activeNotes = w;
  }
  function _() {
    for (const w of i.targetNotes) {
      const O = y(w), b = c.has(w.id);
      O && !b ? (c.add(w.id), s.emit("noteEntered", { noteId: w.id, note: w })) : !O && b && (c.delete(w.id), s.emit("noteExited", { noteId: w.id, note: w }));
    }
  }
  function E() {
    var w, O;
    if (!i.onrampComplete)
      if (i.currentTimeMs >= 0)
        i.onrampComplete = !0, s.emit("onrampComplete"), (w = r == null ? void 0 : r.clearOnrampCountdown) == null || w.call(r), o == null || o.info("NoteHighway", "Onramp complete", null);
      else {
        const A = 60 / t.getTempo() * 1e3, x = Math.abs(i.currentTimeMs), R = Math.ceil(x / A);
        (O = r == null ? void 0 : r.updateOnrampCountdown) == null || O.call(r, R);
      }
  }
  function F() {
    if (!i.isPlaying || i.isPaused || !i.startTime) {
      l = null;
      return;
    }
    const w = performance.now(), O = f();
    if (i.isWaitingForInput || (i.currentTimeMs = w - i.startTime - O, i.scrollOffset = h(i.currentTimeMs)), E(), v(), _(), !i.isWaitingForInput) {
      const b = N();
      b && M(b);
    }
    l = requestAnimationFrame(F);
  }
  function P() {
    l || (l = requestAnimationFrame(F));
  }
  function I() {
    l && (cancelAnimationFrame(l), l = null);
  }
  return {
    init(w) {
      i.targetNotes = w, o == null || o.info("NoteHighway", `Initialized with ${w.length} notes`, null);
    },
    start() {
      i.isPlaying || (i.isPlaying = !0, i.isPaused = !1, i.currentTimeMs = -f(), i.scrollOffset = h(i.currentTimeMs), i.onrampComplete = !1, i.activeNotes.clear(), i.startTime = performance.now(), i.isWaitingForInput = !1, i.waitingNoteId = null, d = null, c.clear(), u.clear(), a.reset(), P(), s.emit("playbackStarted"), o == null || o.info("NoteHighway", "Playback started", { onrampDurationMs: f() }));
    },
    pause() {
      !i.isPlaying || i.isPaused || (i.isPaused = !0, I(), s.emit("playbackPaused"), o == null || o.info("NoteHighway", "Playback paused", { currentTimeMs: i.currentTimeMs }));
    },
    resume() {
      if (!i.isPlaying || !i.isPaused || !i.startTime) return;
      const w = performance.now() - (i.startTime + i.currentTimeMs + f());
      i.startTime += w, i.isPaused = !1, P(), s.emit("playbackResumed"), o == null || o.info("NoteHighway", "Playback resumed", null);
    },
    stop() {
      var O, b;
      if (!i.isPlaying) return;
      i.isPlaying = !1, i.isPaused = !1, i.currentTimeMs = 0, i.scrollOffset = 0, i.onrampComplete = !1, i.activeNotes.clear(), i.startTime = null, i.isWaitingForInput = !1, i.waitingNoteId = null, d = null, c.clear(), u.clear(), I(), (O = r == null ? void 0 : r.clearCanvas) == null || O.call(r), (b = r == null ? void 0 : r.clearOnrampCountdown) == null || b.call(r), s.emit("playbackStopped"), i.targetNotes.every((A) => A.performance !== void 0) && s.emit("performanceComplete"), o == null || o.info("NoteHighway", "Playback stopped", null);
    },
    setScrollOffset(w) {
      if (i.currentTimeMs = w, i.scrollOffset = h(w), i.isWaitingForInput = !1, i.waitingNoteId = null, d = null, i.isPlaying) {
        const O = f();
        i.startTime = performance.now() - (w + O);
      }
      o == null || o.debug("NoteHighway", "Scroll offset set", { timeMs: w, scrollOffset: i.scrollOffset });
    },
    recordPitchInput(w, O, b, A) {
      if (!i.isPlaying || i.isPaused || !e.inputSources.includes(b)) return;
      const x = {
        timeMs: i.currentTimeMs,
        midi: w,
        clarity: O,
        amplitudeDb: A,
        source: b
      };
      if (i.isWaitingForInput && i.waitingNoteId) {
        const R = i.targetNotes.find((B) => B.id === i.waitingNoteId);
        if (R && S(R, x)) {
          g(R.id, R), a.recordPitchSample(x);
          return;
        }
        return;
      }
      a.recordPitchSample(x);
    },
    getState() {
      return i;
    },
    getVisibleNotes() {
      m();
      const w = t.getViewportWidth(), O = t.getCellWidth();
      return i.targetNotes.filter((b) => {
        const A = b.startColumn * O - i.scrollOffset;
        return b.endColumn * O - i.scrollOffset >= 0 && A <= w;
      });
    },
    getPerformanceResults() {
      return a.getAllPerformances();
    },
    getFeedbackCollector() {
      return a;
    },
    dispose() {
      I(), a.dispose(), i.targetNotes = [], i.activeNotes.clear(), i.isWaitingForInput = !1, i.waitingNoteId = null, c.clear(), u.clear(), d = null, o == null || o.info("NoteHighway", "Service disposed", null);
    }
  };
}
function Yr(n) {
  return 60 / n / 2;
}
function zd(n, e) {
  const { timeMap: t, tempo: s, cellWidth: r } = e;
  let o, i;
  if (t && t.length > 0) {
    const c = t[n.startColumnIndex] ?? 0, u = t[n.endColumnIndex] ?? c;
    o = c * 1e3, i = u * 1e3;
  } else {
    const c = e.microbeatDurationSec ?? Yr(s);
    o = n.startColumnIndex * c * 1e3, i = n.endColumnIndex * c * 1e3;
  }
  const a = i - o, l = n.globalRow !== void 0 ? 108 - n.globalRow : 60;
  return {
    id: n.uuid ?? `note-${n.startColumnIndex}-${n.row}`,
    midi: l,
    startTimeMs: o,
    durationMs: a,
    startColumn: n.startColumnIndex,
    endColumn: n.endColumnIndex,
    color: n.color,
    shape: n.shape,
    globalRow: n.globalRow ?? n.row
  };
}
function Xd(n, e) {
  return n.filter((s) => !s.isDrum).map((s) => zd(s, e));
}
function Qh(n, e) {
  const t = [0];
  let s = 0;
  for (let r = 0; r < n.length; r++) {
    const o = n[r] ?? 1;
    s += o * e, t.push(s);
  }
  return t;
}
function Kh(n, e) {
  const t = Yr(n.tempo), s = {
    tempo: n.tempo,
    cellWidth: n.cellWidth,
    timeMap: e,
    microbeatDurationSec: t
  };
  return Xd(n.placedNotes, s);
}
const ef = "0.1.0";
export {
  _d as ClippingMonitor,
  Ed as DEFAULT_CONTEXT_OPTIONS,
  Nd as DEFAULT_DRUM_SAMPLES,
  Sd as FilteredVoice,
  Cd as GainManager,
  it as MODULATION_RATIOS,
  ef as VERSION,
  Yr as calculateMicrobeatDuration,
  ih as canvasToTime,
  oh as canvasToVisual,
  nh as canvasXToSeconds,
  th as columnToRegularTime,
  zh as configureAudioContext,
  zd as convertNoteToHighway,
  Xd as convertNotesToHighway,
  Kh as convertStateToHighway,
  Eo as createColumnMapService,
  eh as createCoordinateMapping,
  bd as createDrumManager,
  mh as createEngineController,
  jd as createFeedbackCollector,
  ph as createLessonMode,
  So as createModulationMarker,
  Zh as createNoteHighwayService,
  Qh as createSimpleTimeMap,
  Io as createStore,
  Hh as createSynthEngine,
  Td as createTimeMapCalculator,
  jh as createTransportService,
  Ye as fullRowData,
  hh as getCanvasColumnWidths,
  ch as getColumnEntry,
  Js as getColumnEntryByCanvas,
  uh as getColumnType,
  Xh as getContextInfo,
  uo as getInitialState,
  dh as getMacrobeatBoundary,
  Kd as getModulationColor,
  Qd as getModulationDisplayText,
  Jr as getPerVoiceBaselineGain,
  Zd as getPitchByIndex,
  Yd as getPitchByToneNote,
  ys as getPitchIndex,
  xo as getTimeBoundaryAfterMacrobeat,
  fh as getTotalCanvasWidth,
  lh as isPlayableColumn,
  Yh as renderDrumGrid,
  Jh as renderPitchGrid,
  no as resolvePitchRange,
  sh as secondsToCanvasX,
  Uh as setVoiceLogger,
  ah as timeToCanvas,
  Oo as timeToVisual,
  rh as visualToCanvas,
  Po as visualToTime
};
//# sourceMappingURL=index.js.map
