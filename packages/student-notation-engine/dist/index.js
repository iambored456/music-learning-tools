var z = Object.defineProperty;
var $ = (i, r, s) => r in i ? z(i, r, { enumerable: !0, configurable: !0, writable: !0, value: s }) : i[r] = s;
var v = (i, r, s) => $(i, typeof r != "symbol" ? r + "" : r, s);
import * as c from "tone";
function le() {
  throw new Error("Not yet implemented - engine modules need to be extracted first");
}
function he(i) {
  throw new Error("Not yet implemented - will be in @mlt/tutorial-runtime package");
}
const q = [
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
], I = /* @__PURE__ */ new Map(), U = /* @__PURE__ */ new Map();
q.forEach((i, r) => {
  I.set(i.toneNote, r), i.midi !== void 0 && U.set(i.midi, r);
});
function me(i) {
  const r = I.get(i);
  return r !== void 0 ? q[r] : void 0;
}
function pe(i) {
  return q[i];
}
function V(i) {
  return I.get(i) ?? -1;
}
function W(i, r) {
  const s = V(i), o = V(r);
  return s === -1 || o === -1 ? null : {
    topIndex: Math.min(s, o),
    bottomIndex: Math.max(s, o)
  };
}
const j = {
  attack: 0.01,
  decay: 0.1,
  sustain: 0.7,
  release: 0.3
}, H = {
  type: "lowpass",
  frequency: 2e3,
  Q: 1,
  gain: 0,
  enabled: !1
};
function Q() {
  const i = [
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
  ], r = {};
  return i.forEach((s) => {
    const o = new Float32Array(32);
    o[0] = 1;
    const d = new Float32Array(32);
    r[s] = {
      adsr: { ...j },
      coeffs: o,
      phases: d,
      filter: { ...H },
      activePresetName: "sine"
    };
  }), r;
}
function K() {
  return {
    macrobeatGroupings: [2, 2, 2, 2],
    macrobeatBoundaryStyles: ["dashed", "dashed", "dashed", "dashed"],
    hasAnacrusis: !1,
    baseMicrobeatPx: 40,
    modulationMarkers: []
  };
}
function X() {
  const i = W("G5", "C4");
  return i || {
    topIndex: 0,
    bottomIndex: Math.max(0, q.length - 1)
  };
}
function Y() {
  const i = Q();
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
      timbres: JSON.parse(JSON.stringify(i)),
      placedChords: [],
      sixteenthStampPlacements: [],
      tripletStampPlacements: [],
      annotations: [],
      lassoSelection: { selectedItems: [], convexHull: null, isActive: !1 }
    }],
    historyIndex: 0,
    fullRowData: [...q],
    pitchRange: X(),
    // --- Rhythm ---
    ...K(),
    selectedModulationRatio: null,
    // --- Timbres & Colors ---
    timbres: i,
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
function L(i) {
  const r = JSON.parse(JSON.stringify(i));
  for (const s in r) {
    const o = r[s];
    o.coeffs && typeof o.coeffs == "object" && !Array.isArray(o.coeffs) ? o.coeffs = new Float32Array(Object.values(o.coeffs)) : Array.isArray(o.coeffs) && (o.coeffs = new Float32Array(o.coeffs)), o.phases && typeof o.phases == "object" && !Array.isArray(o.phases) ? o.phases = new Float32Array(Object.values(o.phases)) : Array.isArray(o.phases) && (o.phases = new Float32Array(o.phases));
  }
  return r;
}
function Z(i, r) {
  if (i)
    try {
      const s = i.getItem(r);
      if (s === null)
        return;
      const o = JSON.parse(s);
      if (o.timbres)
        for (const d in o.timbres) {
          const m = o.timbres[d];
          if (m.coeffs && typeof m.coeffs == "object") {
            const u = Array.isArray(m.coeffs) ? m.coeffs : Object.values(m.coeffs);
            m.coeffs = new Float32Array(u);
          }
          if (m.phases && typeof m.phases == "object") {
            const u = Array.isArray(m.phases) ? m.phases : Object.values(m.phases);
            m.phases = new Float32Array(u);
          }
        }
      if (o.pitchRange) {
        const d = q.length, m = Math.max(0, d - 1), u = Math.max(0, Math.min(m, o.pitchRange.topIndex ?? 0)), y = Math.max(u, Math.min(m, o.pitchRange.bottomIndex ?? m));
        o.pitchRange = { topIndex: u, bottomIndex: y };
      }
      if ("playheadMode" in o) {
        const d = o.playheadMode;
        d !== "cursor" && d !== "microbeat" && d !== "macrobeat" && delete o.playheadMode;
      }
      return o.fullRowData = [...q], o;
    } catch {
      return;
    }
}
function ee(i, r, s) {
  var o;
  if (r)
    try {
      const d = JSON.parse(JSON.stringify({
        placedNotes: i.placedNotes,
        placedChords: i.placedChords,
        tonicSignGroups: i.tonicSignGroups,
        sixteenthStampPlacements: i.sixteenthStampPlacements,
        tripletStampPlacements: i.tripletStampPlacements,
        timbres: i.timbres,
        macrobeatGroupings: i.macrobeatGroupings,
        macrobeatBoundaryStyles: i.macrobeatBoundaryStyles,
        hasAnacrusis: i.hasAnacrusis,
        baseMicrobeatPx: i.baseMicrobeatPx,
        modulationMarkers: i.modulationMarkers,
        tempo: i.tempo,
        activeChordIntervals: i.activeChordIntervals,
        selectedNote: i.selectedNote,
        annotations: i.annotations,
        pitchRange: i.pitchRange,
        degreeDisplayMode: i.degreeDisplayMode,
        showOctaveLabels: i.showOctaveLabels,
        longNoteStyle: i.longNoteStyle,
        playheadMode: i.playheadMode
      }));
      if (i.timbres)
        for (const u in i.timbres) {
          const y = i.timbres[u], A = (o = d.timbres) == null ? void 0 : o[u];
          y != null && y.coeffs && A && (A.coeffs = Array.from(y.coeffs)), y != null && y.phases && A && (A.phases = Array.from(y.phases));
        }
      const m = JSON.stringify(d);
      r.setItem(s, m);
    } catch {
    }
}
function de(i = {}) {
  const {
    storageKey: r = "studentNotationState",
    storage: s,
    initialState: o,
    onClearState: d
  } = i, m = {}, u = Z(s, r), y = !u, e = {
    state: {
      ...Y(),
      ...u,
      ...o
    },
    isColdStart: y,
    on(t, l) {
      m[t] || (m[t] = []), m[t].push(l);
    },
    off(t, l) {
      if (m[t]) {
        const D = m[t].indexOf(l);
        D > -1 && m[t].splice(D, 1);
      }
    },
    emit(t, l) {
      m[t] && m[t].forEach((D) => {
        try {
          D(l);
        } catch (p) {
          console.error(`Error in listener for event "${t}"`, p);
        }
      });
    },
    dispose() {
      for (const t in m)
        delete m[t];
    },
    saveState() {
      ee(e.state, s, r);
    },
    // ========== HISTORY ACTIONS ==========
    recordState() {
      e.state.history = e.state.history.slice(0, e.state.historyIndex + 1);
      const t = JSON.parse(JSON.stringify(e.state.timbres)), l = {
        notes: JSON.parse(JSON.stringify(e.state.placedNotes)),
        tonicSignGroups: JSON.parse(JSON.stringify(e.state.tonicSignGroups)),
        placedChords: JSON.parse(JSON.stringify(e.state.placedChords)),
        sixteenthStampPlacements: JSON.parse(JSON.stringify(e.state.sixteenthStampPlacements)),
        tripletStampPlacements: JSON.parse(JSON.stringify(e.state.tripletStampPlacements || [])),
        timbres: t,
        annotations: e.state.annotations ? JSON.parse(JSON.stringify(e.state.annotations)) : [],
        lassoSelection: JSON.parse(JSON.stringify(e.state.lassoSelection))
      };
      e.state.history.push(l), e.state.historyIndex++, e.emit("historyChanged"), e.saveState();
    },
    undo() {
      var t;
      if (e.state.historyIndex > 0) {
        e.state.historyIndex--;
        const l = e.state.history[e.state.historyIndex];
        if (!l) return;
        e.state.placedNotes = JSON.parse(JSON.stringify(l.notes)), e.state.tonicSignGroups = JSON.parse(JSON.stringify(l.tonicSignGroups)), e.state.sixteenthStampPlacements = JSON.parse(JSON.stringify(l.sixteenthStampPlacements || [])), e.state.tripletStampPlacements = JSON.parse(JSON.stringify(l.tripletStampPlacements || [])), e.state.timbres = L(l.timbres), e.state.annotations = l.annotations ? JSON.parse(JSON.stringify(l.annotations)) : [], e.emit("notesChanged"), e.emit("sixteenthStampPlacementsChanged"), e.emit("tripletStampPlacementsChanged"), e.emit("rhythmStructureChanged"), (t = e.state.selectedNote) != null && t.color && e.emit("timbreChanged", e.state.selectedNote.color), e.emit("annotationsChanged"), e.emit("historyChanged");
      }
    },
    redo() {
      var t;
      if (e.state.historyIndex < e.state.history.length - 1) {
        e.state.historyIndex++;
        const l = e.state.history[e.state.historyIndex];
        if (!l) return;
        e.state.placedNotes = JSON.parse(JSON.stringify(l.notes)), e.state.tonicSignGroups = JSON.parse(JSON.stringify(l.tonicSignGroups)), e.state.sixteenthStampPlacements = JSON.parse(JSON.stringify(l.sixteenthStampPlacements || [])), e.state.tripletStampPlacements = JSON.parse(JSON.stringify(l.tripletStampPlacements || [])), e.state.timbres = L(l.timbres), e.state.annotations = l.annotations ? JSON.parse(JSON.stringify(l.annotations)) : [], e.emit("notesChanged"), e.emit("sixteenthStampPlacementsChanged"), e.emit("tripletStampPlacementsChanged"), e.emit("rhythmStructureChanged"), (t = e.state.selectedNote) != null && t.color && e.emit("timbreChanged", e.state.selectedNote.color), e.emit("annotationsChanged"), e.emit("historyChanged");
      }
    },
    clearSavedState() {
      s && (s.removeItem(r), s.removeItem("effectDialValues")), d && d();
    },
    // ========== VIEW ACTIONS ==========
    setPlaybackState(t, l) {
      e.state.isPlaying = t, e.state.isPaused = l, e.emit("playbackStateChanged", { isPlaying: t, isPaused: l });
    },
    setLooping(t) {
      e.state.isLooping = t, e.emit("loopingChanged", t);
    },
    setTempo(t) {
      e.state.tempo = t, e.emit("tempoChanged", t);
    },
    setPlayheadMode(t) {
      e.state.playheadMode = t, e.emit("playheadModeChanged", t);
    },
    setSelectedTool(t) {
      const l = e.state.selectedTool;
      e.state.previousTool = l, e.state.selectedTool = t, e.emit("toolChanged", { newTool: t, oldTool: l });
    },
    setSelectedNote(t) {
      const l = { ...e.state.selectedNote };
      e.state.selectedNote = { ...e.state.selectedNote, ...t }, e.emit("noteChanged", { newNote: e.state.selectedNote, oldNote: l });
    },
    setPitchRange(t, l) {
      e.state.pitchRange = { topIndex: t, bottomIndex: l }, e.emit("pitchRangeChanged", { topIndex: t, bottomIndex: l });
    },
    setDegreeDisplayMode(t) {
      e.state.degreeDisplayMode = t, e.emit("degreeDisplayModeChanged", t);
    },
    setLongNoteStyle(t) {
      e.state.longNoteStyle = t, e.emit("longNoteStyleChanged", t);
    },
    toggleAccidentalMode(t) {
      e.state.accidentalMode[t] = !e.state.accidentalMode[t], e.emit("accidentalModeChanged", e.state.accidentalMode);
    },
    toggleFrequencyLabels() {
      e.state.showFrequencyLabels = !e.state.showFrequencyLabels, e.emit("frequencyLabelsChanged", e.state.showFrequencyLabels);
    },
    toggleOctaveLabels() {
      e.state.showOctaveLabels = !e.state.showOctaveLabels, e.emit("octaveLabelsChanged", e.state.showOctaveLabels);
    },
    toggleFocusColours() {
      e.state.focusColours = !e.state.focusColours, e.emit("focusColoursChanged", e.state.focusColours);
    },
    toggleWaveformExtendedView() {
      e.state.waveformExtendedView = !e.state.waveformExtendedView, e.emit("waveformExtendedViewChanged", e.state.waveformExtendedView);
    },
    setLayoutConfig(t) {
      Object.assign(e.state, t), e.emit("layoutConfigChanged", t);
    },
    setDeviceProfile(t) {
      e.state.deviceProfile = t, e.emit("deviceProfileChanged", t);
    },
    setPrintPreviewActive(t) {
      e.state.isPrintPreviewActive = t, e.emit("printPreviewStateChanged", t);
    },
    setPrintOptions(t) {
      e.state.printOptions = { ...e.state.printOptions, ...t }, e.emit("printOptionsChanged", e.state.printOptions);
    },
    setAdsrTimeAxisScale(t) {
      e.state.adsrTimeAxisScale = t, e.emit("adsrTimeAxisScaleChanged", t);
    },
    setAdsrComponentWidth() {
    },
    shiftGridUp() {
    },
    shiftGridDown() {
    },
    setGridPosition() {
    },
    setKeySignature(t) {
      e.state.keySignature = t, e.emit("keySignatureChanged", t);
    },
    // ========== HARMONY ACTIONS ==========
    setActiveChordIntervals(t) {
      e.state.activeChordIntervals = t, e.emit("activeChordIntervalsChanged", t);
    },
    setIntervalsInversion(t) {
      e.state.isIntervalsInverted = t, e.emit("intervalsInversionChanged", t);
    },
    setChordPosition(t) {
      e.state.chordPositionState = t, e.emit("chordPositionChanged", t);
    },
    // ========== TIMBRE ACTIONS ==========
    setADSR(t, l) {
      e.state.timbres[t] && (e.state.timbres[t].adsr = { ...e.state.timbres[t].adsr, ...l }, e.emit("timbreChanged", t));
    },
    setHarmonicCoefficients(t, l) {
      e.state.timbres[t] && (e.state.timbres[t].coeffs = l, e.emit("timbreChanged", t));
    },
    setHarmonicPhases(t, l) {
      e.state.timbres[t] && (e.state.timbres[t].phases = l, e.emit("timbreChanged", t));
    },
    setFilterSettings(t, l) {
      e.state.timbres[t] && (e.state.timbres[t].filter = { ...e.state.timbres[t].filter, ...l }, e.emit("timbreChanged", t));
    },
    applyPreset(t, l) {
      e.state.timbres[t] && (Object.assign(e.state.timbres[t], l), e.emit("timbreChanged", t));
    },
    // ========== PLACEHOLDER ACTIONS ==========
    // These will be implemented when the full action modules are extracted
    addNote: () => null,
    updateNoteTail: () => {
    },
    updateMultipleNoteTails: () => {
    },
    updateNoteRow: () => {
    },
    updateMultipleNoteRows: () => {
    },
    updateNotePosition: () => {
    },
    updateMultipleNotePositions: () => {
    },
    removeNote: () => {
    },
    removeMultipleNotes: () => {
    },
    clearAllNotes: () => {
    },
    loadNotes: () => {
    },
    eraseInPitchArea: () => !1,
    eraseTonicSignAt: () => !1,
    addTonicSignGroup: () => {
    },
    increaseMacrobeatCount: () => {
    },
    decreaseMacrobeatCount: () => {
    },
    updateTimeSignature: () => {
    },
    setAnacrusis: () => {
    },
    addModulationMarker: () => null,
    removeModulationMarker: () => {
    },
    moveModulationMarker: () => {
    },
    setModulationRatio: () => {
    },
    toggleModulationMarker: () => {
    },
    clearModulationMarkers: () => {
    },
    toggleMacrobeatGrouping: () => {
    },
    cycleMacrobeatBoundaryStyle: () => {
    },
    addSixteenthStampPlacement: () => ({}),
    removeSixteenthStampPlacement: () => !1,
    eraseSixteenthStampsInArea: () => !1,
    getAllSixteenthStampPlacements: () => [],
    getSixteenthStampAt: () => null,
    clearAllSixteenthStamps: () => {
    },
    getSixteenthStampPlaybackData: () => [],
    updateSixteenthStampShapeOffset: () => {
    },
    getSixteenthStampShapeRow: () => 0,
    addTripletStampPlacement: () => ({}),
    removeTripletStampPlacement: () => !1,
    eraseTripletStampsInArea: () => !1,
    getAllTripletStampPlacements: () => [],
    getTripletStampAt: () => null,
    clearAllTripletStamps: () => {
    },
    getTripletStampPlaybackData: () => [],
    updateTripletStampShapeOffset: () => {
    },
    getTripletStampShapeRow: () => 0,
    // Internal helper
    _isBoundaryInAnacrusis: () => !1
  };
  return s && (e.on("tempoChanged", () => e.saveState()), e.on("degreeDisplayModeChanged", () => e.saveState()), e.on("longNoteStyleChanged", () => e.saveState()), e.on("playheadModeChanged", () => e.saveState())), y && s && e.saveState(), e;
}
let P = null;
function ue(i) {
  P = i;
}
class te extends c.Synth {
  constructor(s) {
    super(s);
    // Audio effect nodes
    v(this, "presetGain");
    v(this, "vibratoLFO");
    v(this, "vibratoDepth");
    v(this, "vibratoGain");
    v(this, "tremoloLFO");
    v(this, "tremoloDepth");
    v(this, "tremoloGain");
    // Filter nodes
    v(this, "hpFilter");
    v(this, "lpFilterForBP");
    v(this, "lpFilterSolo");
    // Output nodes
    v(this, "hpOutput");
    v(this, "bpOutput");
    v(this, "lpOutput");
    // Crossfade nodes
    v(this, "hp_bp_fade");
    v(this, "main_fade");
    v(this, "wetDryFade");
    this.presetGain = new c.Gain(s.gain || 1), this.vibratoLFO = new c.LFO(0, 0), this.vibratoDepth = new c.Scale(-1, 1), this.vibratoGain = new c.Gain(0), this.vibratoLFO.connect(this.vibratoDepth), this.vibratoDepth.connect(this.vibratoGain), this.vibratoGain.connect(this.oscillator.frequency), this.tremoloLFO = new c.LFO(0, 0), this.tremoloDepth = new c.Scale(0, 1), this.tremoloGain = new c.Gain(1), this.tremoloLFO.connect(this.tremoloDepth), this.tremoloDepth.connect(this.tremoloGain.gain), this.hpFilter = new c.Filter({ type: "highpass" }), this.lpFilterForBP = new c.Filter({ type: "lowpass" }), this.lpFilterSolo = new c.Filter({ type: "lowpass" }), this.hpOutput = new c.Gain(), this.bpOutput = new c.Gain(), this.lpOutput = new c.Gain(), this.hp_bp_fade = new c.CrossFade(0), this.main_fade = new c.CrossFade(0), this.wetDryFade = new c.CrossFade(0), this.oscillator.connect(this.presetGain), this.presetGain.connect(this.wetDryFade.a), this.presetGain.connect(this.hpFilter), this.hpFilter.connect(this.hpOutput), this.hpFilter.connect(this.lpFilterForBP), this.lpFilterForBP.connect(this.bpOutput), this.presetGain.connect(this.lpFilterSolo), this.lpFilterSolo.connect(this.lpOutput), this.hpOutput.connect(this.hp_bp_fade.a), this.bpOutput.connect(this.hp_bp_fade.b), this.lpOutput.connect(this.main_fade.b), this.hp_bp_fade.connect(this.main_fade.a), this.main_fade.connect(this.wetDryFade.b), this.wetDryFade.connect(this.tremoloGain), this.tremoloGain.connect(this.envelope), s.filter && this._setFilter(s.filter), s.vibrato ? this._setVibrato(s.vibrato) : this._setVibrato({ speed: 0, span: 0 }), s.tremelo ? this._setTremolo(s.tremelo) : this._setTremolo({ speed: 0, span: 0 });
  }
  _setPresetGain(s) {
    this.presetGain && (this.presetGain.gain.value = s);
  }
  _setVibrato(s, o = c.now()) {
    var D, p;
    if (!this.vibratoLFO || !this.vibratoGain) return;
    const d = s.speed / 100 * 16, u = (((p = (D = c.getContext()) == null ? void 0 : D.rawContext) == null ? void 0 : p.state) ?? c.context.state) === "running";
    if (s.speed === 0 || s.span === 0) {
      u && this.vibratoLFO.state === "started" && this.vibratoLFO.stop(o), this.vibratoLFO.frequency.value = 0, this.vibratoGain.gain.value = 0;
      return;
    }
    u && this.vibratoLFO.state !== "started" && this.vibratoLFO.start(o), this.vibratoLFO.frequency.value = d;
    const A = s.span / 100 * 50, g = A / 1200, l = 440 * (Math.pow(2, g) - 1);
    this.vibratoGain.gain.value = l, P == null || P.debug("FilteredVoice", "Vibrato gain set", { hzDeviation: l, centsAmplitude: A }, "audio");
  }
  _setTremolo(s, o = c.now()) {
    var e, t;
    if (!this.tremoloLFO || !this.tremoloGain) return;
    const d = s.speed / 100 * 16, u = (((t = (e = c.getContext()) == null ? void 0 : e.rawContext) == null ? void 0 : t.state) ?? c.context.state) === "running";
    if (s.speed === 0 || s.span === 0) {
      u && this.tremoloLFO.state === "started" && this.tremoloLFO.stop(o), this.tremoloLFO.frequency.value = 0, this.tremoloGain.gain.cancelScheduledValues(o), this.tremoloGain.gain.value = 1;
      return;
    }
    u && this.tremoloLFO.state !== "started" && this.tremoloLFO.start(o), this.tremoloLFO.frequency.value = d;
    const y = s.span / 100, A = Math.max(0, 1 - y), g = 1;
    this.tremoloDepth.min = A, this.tremoloDepth.max = g;
  }
  _setFilter(s) {
    this.wetDryFade.fade.value = s.enabled ? 1 : 0;
    const o = c.Midi(s.cutoff + 35).toFrequency(), d = s.resonance / 100 * 12 + 0.1;
    this.hpFilter.set({ frequency: o, Q: d }), this.lpFilterForBP.set({ frequency: o, Q: d }), this.lpFilterSolo.set({ frequency: o, Q: d });
    const m = s.blend;
    m <= 1 ? (this.main_fade.fade.value = 0, this.hp_bp_fade.fade.value = m) : (this.main_fade.fade.value = m - 1, this.hp_bp_fade.fade.value = 1);
  }
}
const k = {
  polyphonyReference: 32,
  smoothingTauMs: 200,
  masterGainRampMs: 50,
  gainUpdateIntervalMs: 16
};
function J(i = k.polyphonyReference) {
  return 1 / Math.sqrt(i);
}
class ae {
  constructor(r, s = {}) {
    v(this, "masterGain");
    v(this, "options");
    v(this, "perVoiceBaselineGain");
    v(this, "activeVoiceCount", 0);
    v(this, "smoothedVoiceCount");
    v(this, "gainUpdateLoopId", null);
    this.masterGain = r, this.options = { ...k, ...s }, this.perVoiceBaselineGain = J(this.options.polyphonyReference), this.smoothedVoiceCount = this.options.polyphonyReference;
  }
  start() {
    this.stop(), this.gainUpdateLoopId = setInterval(() => this.updateMasterGain(), this.options.gainUpdateIntervalMs);
  }
  stop() {
    this.gainUpdateLoopId !== null && (clearInterval(this.gainUpdateLoopId), this.gainUpdateLoopId = null);
  }
  noteOn(r = 1) {
    r <= 0 || (this.activeVoiceCount += r);
  }
  noteOff(r = 1) {
    r <= 0 || (this.activeVoiceCount = Math.max(0, this.activeVoiceCount - r));
  }
  clampActiveVoiceCountToAtMost(r) {
    Number.isFinite(r) && (this.activeVoiceCount = Math.max(0, Math.min(this.activeVoiceCount, Math.floor(r))));
  }
  resetActiveVoiceCount() {
    this.activeVoiceCount = 0;
  }
  getActiveVoiceCount() {
    return this.activeVoiceCount;
  }
  updateMasterGain() {
    const { polyphonyReference: r, smoothingTauMs: s, masterGainRampMs: o, gainUpdateIntervalMs: d } = this.options, m = c.now();
    if (this.activeVoiceCount === 0) {
      this.smoothedVoiceCount = 0.01 * r + (1 - 0.01) * this.smoothedVoiceCount;
      return;
    }
    const u = d / 1e3, y = 1 - Math.exp(-u / (s / 1e3)), A = Math.max(1, this.activeVoiceCount);
    this.smoothedVoiceCount = y * A + (1 - y) * this.smoothedVoiceCount;
    const g = Math.sqrt(r / this.smoothedVoiceCount), e = this.perVoiceBaselineGain * g;
    this.masterGain.gain.rampTo(e, o / 1e3, m);
  }
}
const ie = {
  clippingWarningThresholdDb: -3,
  clippingMonitorIntervalMs: 500,
  clippingWarningCooldownMs: 2e3
};
class se {
  constructor(r, s = {}) {
    v(this, "meter");
    v(this, "options");
    v(this, "clippingMonitorId", null);
    v(this, "lastClippingWarningAt", 0);
    this.meter = r, this.options = { ...ie, ...s };
  }
  start() {
    this.stop(), this.lastClippingWarningAt = 0, this.clippingMonitorId = setInterval(() => {
      var d, m;
      const r = this.meter.getValue(), s = Array.isArray(r) ? r[0] : r;
      if (s === void 0 || s <= this.options.clippingWarningThresholdDb)
        return;
      const o = Date.now();
      o - this.lastClippingWarningAt < this.options.clippingWarningCooldownMs || (this.lastClippingWarningAt = o, (m = (d = this.options).onWarning) == null || m.call(d, s));
    }, this.options.clippingMonitorIntervalMs);
  }
  stop() {
    this.clippingMonitorId !== null && (clearInterval(this.clippingMonitorId), this.clippingMonitorId = null);
  }
}
function fe(i) {
  const {
    timbres: r,
    masterVolume: s = 0,
    effectsManager: o,
    harmonicFilter: d,
    logger: m,
    audioInit: u,
    getDrumVolume: y
  } = i, A = {};
  let g = null, e = null, t = null, l = null, D = null, p = {}, h = null, x = null;
  const F = { ...r }, C = m ?? {
    debug: () => {
    },
    info: () => {
    },
    warn: () => {
    }
  };
  function w(a) {
    if (d)
      return d.getFilteredCoefficients(a);
    const n = F[a];
    return n != null && n.coeffs ? n.coeffs : new Float32Array([0, 1]);
  }
  function b(a) {
    const n = a.reduce((N, T) => N + Math.abs(T), 0);
    return n > 1 ? Array.from(a).map((N) => N / n) : Array.from(a);
  }
  const B = {
    init() {
      this.stopBackgroundMonitors(), g = new c.Gain(J()), h = new ae(g), h.start(), e = new c.Volume(s), t = new c.Compressor({
        threshold: -12,
        ratio: 3,
        attack: 0.01,
        release: 0.1,
        knee: 6
      }), l = new c.Limiter(-3), D = new c.Meter(), g.connect(e), e.connect(t), t.connect(l), l.toDestination(), l.connect(D), D && (x = new se(D, {
        onWarning: (a) => {
          C.warn("SynthEngine", "Limiter input approaching clipping threshold", { level: a }, "audio");
        }
      }), x.start());
      for (const a in F) {
        const n = F[a];
        if (!n) continue;
        n.vibrato || (n.vibrato = { speed: 0, span: 0 }), n.tremelo || (n.tremelo = { speed: 0, span: 0 });
        const N = w(a), T = b(N), G = n.gain || 1, M = new c.PolySynth({
          voice: te,
          options: {
            oscillator: { type: "custom", partials: T },
            envelope: n.adsr,
            filter: n.filter,
            vibrato: n.vibrato,
            tremelo: n.tremelo,
            gain: G
          }
        }).connect(g);
        o && g && o.applySynthEffects(M, a, g);
        const f = M.triggerAttack.bind(M);
        M.triggerAttack = function(...O) {
          const _ = f(...O);
          return setTimeout(() => {
            const E = this._activeVoices;
            o ? E && E.size > 0 ? E.forEach((S) => {
              S.effectsApplied || (o.applyEffectsToVoice(S, a), S.effectsApplied = !0);
            }) : this._voices && Array.isArray(this._voices) && this._voices.forEach((S) => {
              S && !S.effectsApplied && (o.applyEffectsToVoice(S, a), S.effectsApplied = !0);
            }) : E && E.size > 0 ? E.forEach((S) => {
              S._setVibrato && S.vibratoApplied !== !0 && (S._setVibrato(this._currentVibrato), S.vibratoApplied = !0), S._setTremolo && S.tremoloApplied !== !0 && (S._setTremolo(this._currentTremolo), S.tremoloApplied = !0);
            }) : this._voices && Array.isArray(this._voices) && this._voices.forEach((S) => {
              S != null && S._setVibrato && S.vibratoApplied !== !0 && (S._setVibrato(this._currentVibrato), S.vibratoApplied = !0), S != null && S._setTremolo && S.tremoloApplied !== !0 && (S._setTremolo(this._currentTremolo), S.tremoloApplied = !0);
            });
          }, 10), _;
        }, M._currentVibrato = n.vibrato, M._currentTremolo = n.tremelo, M._currentFilter = n.filter, A[a] = M, C.debug("SynthEngine", `Created filtered synth for color: ${a}`, null, "audio");
      }
      C.info("SynthEngine", "Initialized with multi-timbral support", null, "audio");
    },
    updateSynthForColor(a) {
      const n = F[a], N = A[a];
      if (!N || !n) return;
      n.vibrato || (n.vibrato = { speed: 0, span: 0 }), n.tremelo || (n.tremelo = { speed: 0, span: 0 }), C.debug("SynthEngine", `Updating timbre for color ${a}`, null, "audio");
      const T = w(a), G = b(T);
      N.set({
        oscillator: { partials: G },
        envelope: n.adsr
      }), o && g && o.applySynthEffects(N, a, g), N._currentVibrato = n.vibrato, N._currentTremolo = n.tremelo, N._currentFilter = n.filter;
      const M = N._activeVoices;
      M && M.size > 0 ? M.forEach((f) => {
        if (f._setFilter && f._setFilter(n.filter), f._setVibrato && (f._setVibrato(n.vibrato), f.vibratoApplied = !0), f._setTremolo && (f._setTremolo(n.tremelo), f.tremoloApplied = !0), f._setPresetGain) {
          const O = n.gain || 1;
          f._setPresetGain(O);
        }
      }) : N._voices && Array.isArray(N._voices) && N._voices.forEach((f) => {
        if (f != null && f._setVibrato && (f._setVibrato(n.vibrato), f.vibratoApplied = !0), f != null && f._setTremolo && (f._setTremolo(n.tremelo), f.tremoloApplied = !0), f != null && f._setFilter && f._setFilter(n.filter), f != null && f._setPresetGain) {
          const O = n.gain || 1;
          f._setPresetGain(O);
        }
      });
    },
    setBpm(a) {
      var n;
      try {
        (n = c == null ? void 0 : c.Transport) != null && n.bpm && (c.Transport.bpm.value = a, C.debug("SynthEngine", `Tone.Transport BPM updated to ${a}`, null, "audio"));
      } catch (N) {
        C.warn("SynthEngine", "Unable to update BPM on Tone.Transport", { tempo: a, error: N }, "audio");
      }
    },
    setVolume(a) {
      e && (e.volume.value = a);
    },
    async playNote(a, n, N = c.now()) {
      await (u || (() => c.start()))();
      const G = Object.keys(A);
      if (G.length === 0) return;
      const M = A[G[0]];
      M && M.triggerAttackRelease(a, n, N);
    },
    /**
     * Trigger note attack. Used by Transport scheduling with explicit time parameter.
     * For interactive (user-initiated) triggers, use triggerAttackInteractive instead.
     */
    triggerAttack(a, n, N = c.now(), T = !1) {
      const G = A[n];
      if (G)
        if (h == null || h.noteOn(1), T && y) {
          const M = y(), f = G.volume.value, O = f + 20 * Math.log10(M);
          G.volume.value = O, G.triggerAttack(a, N), setTimeout(() => {
            G != null && G.volume && (G.volume.value = f);
          }, 100);
        } else
          G.triggerAttack(a, N);
    },
    /**
     * Trigger note attack for interactive (user-initiated) events.
     * Adds a small scheduling offset (20ms) to help the audio thread process
     * the event without pops or clicks.
     *
     * Use this for mouse clicks, keyboard presses, or other immediate UI triggers.
     */
    triggerAttackInteractive(a, n) {
      B.triggerAttack(a, n, c.now() + 0.02);
    },
    quickReleasePitches(a, n) {
      var G, M, f;
      const N = A[n];
      if (!N || !a || a.length === 0) return;
      let T;
      try {
        const O = typeof N.get == "function" ? N.get() : null;
        T = (G = O == null ? void 0 : O.envelope) == null ? void 0 : G.release, N.set({ envelope: { release: 0.01 } }), a.forEach((E) => {
          N.triggerRelease(E, c.now());
        });
        const _ = ((M = N._activeVoices) == null ? void 0 : M.size) ?? ((f = N._voices) == null ? void 0 : f.length) ?? (h == null ? void 0 : h.getActiveVoiceCount()) ?? 0;
        h == null || h.clampActiveVoiceCountToAtMost(_);
      } catch (O) {
        C.warn("SynthEngine", "quickReleasePitches failed", { err: O, color: n, pitches: a }, "audio");
      } finally {
        if (T !== void 0)
          try {
            N.set({ envelope: { release: T } });
          } catch {
          }
      }
    },
    triggerRelease(a, n, N = c.now()) {
      var M, f;
      const T = A[n];
      if (!T) return;
      T.triggerRelease(a, N), h == null || h.noteOff(1);
      const G = ((M = T._activeVoices) == null ? void 0 : M.size) ?? ((f = T._voices) == null ? void 0 : f.length) ?? (h == null ? void 0 : h.getActiveVoiceCount()) ?? 0;
      h == null || h.clampActiveVoiceCountToAtMost(G);
    },
    releaseAll() {
      var a;
      for (const n in A)
        (a = A[n]) == null || a.releaseAll();
      h == null || h.resetActiveVoiceCount();
    },
    // === Waveform Visualization ===
    createWaveformAnalyzer(a) {
      const n = A[a];
      return n ? (p[a] || (p[a] = new c.Analyser("waveform", 1024), n.connect(p[a]), C.debug("SynthEngine", `Created waveform analyzer for color: ${a}`, null, "waveform")), p[a]) : (C.warn("SynthEngine", `No synth found for color: ${a}`, null, "audio"), null);
    },
    getWaveformAnalyzer(a) {
      return p[a] || null;
    },
    getAllWaveformAnalyzers() {
      const a = /* @__PURE__ */ new Map();
      for (const n in p)
        p[n] && a.set(n, p[n]);
      return a;
    },
    removeWaveformAnalyzer(a) {
      p[a] && (p[a].dispose(), delete p[a], C.debug("SynthEngine", `Removed waveform analyzer for color: ${a}`, null, "waveform"));
    },
    disposeAllWaveformAnalyzers() {
      for (const a in p)
        p[a] && p[a].dispose();
      p = {}, C.debug("SynthEngine", "Disposed all waveform analyzers", null, "waveform");
    },
    // === Node Access ===
    getSynth(a) {
      return A[a] || null;
    },
    getAllSynths() {
      return { ...A };
    },
    getMainVolumeNode() {
      return e || null;
    },
    getMasterGainNode() {
      return g || null;
    },
    // === Cleanup ===
    stopBackgroundMonitors() {
      x == null || x.stop(), h == null || h.stop();
    },
    dispose() {
      var a;
      this.stopBackgroundMonitors(), this.disposeAllWaveformAnalyzers();
      for (const n in A)
        (a = A[n]) == null || a.dispose();
      g == null || g.dispose(), e == null || e.dispose(), t == null || t.dispose(), l == null || l.dispose(), D == null || D.dispose(), C.debug("SynthEngine", "Disposed SynthEngine", null, "audio");
    }
  };
  return B;
}
function Ne(i) {
  throw new Error(
    "TransportService not yet implemented. Needs to be extracted from apps/student-notation/src/services/transportService.ts"
  );
}
const oe = {
  latencyHint: "playback",
  lookAhead: 0.1
};
function Ae(i = {}) {
  const { latencyHint: r, lookAhead: s } = { ...oe, ...i };
  let o = !1;
  if (c.context.state === "suspended")
    try {
      c.setContext(new c.Context({
        latencyHint: r
      })), o = !0;
    } catch (d) {
      console.warn("Failed to create new AudioContext, using default:", d);
    }
  return s !== void 0 && (c.context.lookAhead = s), o;
}
function ge() {
  const i = c.context.rawContext, r = i && "baseLatency" in i ? i.baseLatency : void 0;
  return {
    state: c.context.state,
    sampleRate: c.context.sampleRate,
    baseLatency: r,
    lookAhead: c.context.lookAhead
  };
}
function ye(i, r) {
  throw new Error(
    "renderPitchGrid not yet implemented. Needs to be extracted from apps/student-notation/src/components/canvas/PitchGrid/renderers/pitchGridRenderer.ts"
  );
}
function Ce(i, r) {
  throw new Error(
    "renderDrumGrid not yet implemented. Needs to be extracted from apps/student-notation/src/components/canvas/drumGrid/drumGridRenderer.ts"
  );
}
const R = 1e-4;
function be(i) {
  const {
    getMacrobeatInfo: r,
    getPlacedTonicSigns: s,
    getTonicSpanColumnIndices: o,
    updatePlayheadModel: d,
    logger: m
  } = i;
  let u = [], y = 0, A = 0, g = 0;
  const e = m ?? {
    debug: () => {
    }
  };
  function t(p) {
    return 60 / (p * 2);
  }
  function l(p, h, x) {
    let F = 0;
    e.debug("TimeMapCalculator", "[TIMEMAP] Building timeMap", {
      columnCount: h.length,
      tonicSignCount: x.length,
      microbeatDuration: p
    });
    const C = h.length, w = o(x);
    for (let b = 0; b < C; b++) {
      u[b] = F;
      const B = w.has(b);
      if (B ? e.debug("TimeMapCalculator", `[TIMEMAP] Column ${b} is tonic, not advancing time`) : F += (h[b] || 0) * p, b < 5) {
        const a = u[b];
        a !== void 0 && e.debug("TimeMapCalculator", `[TIMEMAP] timeMap[${b}] = ${a.toFixed(3)}s (isTonic: ${B})`);
      }
    }
    C > 0 && (u[C] = F), e.debug("TimeMapCalculator", `[TIMEMAP] Complete. Total columns: ${C}, Final time: ${F.toFixed(3)}s`);
  }
  function D(p) {
    var w;
    const h = u.length > 0 ? u[u.length - 1] ?? 0 : 0;
    if (!Number.isFinite(h) || h === 0) {
      y = 0;
      return;
    }
    const x = ((w = p.modulationMarkers) == null ? void 0 : w.filter((b) => b.active)) || [];
    if (x.length === 0) {
      y = h;
      return;
    }
    const F = [...x].sort((b, B) => b.measureIndex - B.measureIndex);
    let C = h;
    for (const b of F) {
      const B = r(b.measureIndex);
      if (B) {
        const a = B.endColumn - 1, n = u[a] ?? h, N = h - n, T = N * b.ratio;
        C = C - N + T;
      }
    }
    y = C;
  }
  return {
    getMicrobeatDuration: t,
    calculate(p) {
      var w, b;
      e.debug("TimeMapCalculator", "calculate", { tempo: `${p.tempo} BPM` }), u = [];
      const h = t(p.tempo), { columnWidths: x } = p, F = s();
      l(h, x, F), (b = e.timing) == null || b.call(e, "TimeMapCalculator", "calculate", { totalDuration: `${(w = u[u.length - 1]) == null ? void 0 : w.toFixed(2)}s` }), D(p);
      const C = y;
      d == null || d({
        timeMap: u,
        musicalEndTime: C,
        columnWidths: p.columnWidths,
        cellWidth: p.cellWidth
      });
    },
    getTimeMap() {
      return u;
    },
    getMusicalEndTime() {
      return y;
    },
    findNonAnacrusisStart(p) {
      if (!p.hasAnacrusis)
        return e.debug("TimeMapCalculator", "[ANACRUSIS] No anacrusis, starting from time 0"), 0;
      for (let h = 0; h < p.macrobeatBoundaryStyles.length; h++)
        if (p.macrobeatBoundaryStyles[h] === "solid") {
          const x = r(h + 1);
          if (x) {
            const F = u[x.startColumn] || 0;
            return e.debug("TimeMapCalculator", `[ANACRUSIS] Found solid boundary at macrobeat ${h}, non-anacrusis starts at column ${x.startColumn}, time ${F.toFixed(3)}s`), F;
          }
        }
      return e.debug("TimeMapCalculator", "[ANACRUSIS] No solid boundary found, starting from time 0"), 0;
    },
    applyModulationToTime(p, h, x) {
      var b;
      const F = ((b = x.modulationMarkers) == null ? void 0 : b.filter((B) => B.active)) || [];
      if (F.length === 0)
        return p;
      const C = [...F].sort((B, a) => B.measureIndex - a.measureIndex);
      let w = p;
      h < 5 && e.debug("TimeMapCalculator", `[MODULATION] Column ${h}: baseTime ${p.toFixed(3)}s, ${C.length} active markers`);
      for (const B of C) {
        const a = r(B.measureIndex);
        if (a) {
          const n = a.endColumn;
          if (h > n) {
            const N = u[n] !== void 0 ? u[n] : 0, T = p - N, G = T * B.ratio;
            w = w - T + G, h < 5 && e.debug("TimeMapCalculator", `[MODULATION] Column ${h}: Applied marker at measure ${B.measureIndex} (col ${n}), ratio ${B.ratio}, adjustedTime ${w.toFixed(3)}s`);
          }
        }
      }
      return w;
    },
    setLoopBounds(p, h, x) {
      const F = t(x), C = Math.max(F, 1e-3), w = Number.isFinite(p) ? p : 0;
      let b = Number.isFinite(h) ? h : w + C;
      b <= w && (b = w + C), A = w, g = b, c != null && c.Transport && (c.Transport.loopStart = w, c.Transport.loopEnd = b);
    },
    getConfiguredLoopBounds() {
      return { loopStart: A, loopEnd: g };
    },
    setConfiguredLoopBounds(p, h) {
      A = p, g = h;
    },
    clearConfiguredLoopBounds() {
      A = 0, g = 0;
    },
    reapplyConfiguredLoopBounds(p) {
      if (g > A) {
        const h = c.Time(c.Transport.loopStart).toSeconds(), x = c.Time(c.Transport.loopEnd).toSeconds(), F = Math.abs(h - A), C = Math.abs(x - g);
        (F > R || C > R) && (c.Transport.loopStart = A, c.Transport.loopEnd = g), c.Transport.loop !== p && (c.Transport.loop = p);
      }
    },
    updateLoopBoundsFromTimeline(p) {
      const h = this.findNonAnacrusisStart(p), x = y;
      this.setLoopBounds(h, x, p.tempo);
    }
  };
}
const ne = {
  H: "https://tonejs.github.io/audio/drum-samples/CR78/hihat.mp3",
  M: "https://tonejs.github.io/audio/drum-samples/CR78/snare.mp3",
  L: "https://tonejs.github.io/audio/drum-samples/CR78/kick.mp3"
}, re = 1e-4;
function Se(i = {}) {
  var A;
  const {
    samples: r = ne,
    synthEngine: s,
    initialVolume: o = 0
  } = i;
  let d = null, m = null;
  const u = /* @__PURE__ */ new Map();
  function y(g, e) {
    let t = Number.isFinite(e) ? e : c.now();
    const l = u.get(g) ?? -1 / 0;
    return t > l || (t = l + re), u.set(g, t), t;
  }
  if (m = new c.Volume(o), d = new c.Players(r).connect(m), s) {
    const g = (A = s.getMainVolumeNode) == null ? void 0 : A.call(s);
    g ? m.connect(g) : m.toDestination();
  } else
    m.toDestination();
  return {
    getPlayers() {
      return d;
    },
    getVolumeNode() {
      return m;
    },
    trigger(g, e) {
      var l;
      if (!d) return;
      const t = y(g, e);
      (l = d.player(g)) == null || l.start(t);
    },
    reset() {
      u.clear();
    },
    dispose() {
      d == null || d.dispose(), m == null || m.dispose(), d = null, m = null, u.clear();
    }
  };
}
const ve = "0.1.0";
export {
  se as ClippingMonitor,
  oe as DEFAULT_CONTEXT_OPTIONS,
  ne as DEFAULT_DRUM_SAMPLES,
  te as FilteredVoice,
  ae as GainManager,
  ve as VERSION,
  Ae as configureAudioContext,
  Se as createDrumManager,
  le as createEngineController,
  he as createLessonMode,
  de as createStore,
  fe as createSynthEngine,
  be as createTimeMapCalculator,
  Ne as createTransportService,
  q as fullRowData,
  ge as getContextInfo,
  Y as getInitialState,
  J as getPerVoiceBaselineGain,
  pe as getPitchByIndex,
  me as getPitchByToneNote,
  V as getPitchIndex,
  Ce as renderDrumGrid,
  ye as renderPitchGrid,
  W as resolvePitchRange,
  ue as setVoiceLogger
};
//# sourceMappingURL=index.js.map
