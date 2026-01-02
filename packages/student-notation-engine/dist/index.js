var et = Object.defineProperty;
var tt = (o, e, s) => e in o ? et(o, e, { enumerable: !0, configurable: !0, writable: !0, value: s }) : o[e] = s;
var L = (o, e, s) => tt(o, typeof e != "symbol" ? e + "" : e, s);
import * as w from "tone";
const J = [
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
], ue = /* @__PURE__ */ new Map(), nt = /* @__PURE__ */ new Map();
J.forEach((o, e) => {
  ue.set(o.toneNote, e), o.midi !== void 0 && nt.set(o.midi, e);
});
function nn(o) {
  const e = ue.get(o);
  return e !== void 0 ? J[e] : void 0;
}
function on(o) {
  return J[o];
}
function Be(o) {
  return ue.get(o) ?? -1;
}
function ot(o, e) {
  const s = Be(o), g = Be(e);
  return s === -1 || g === -1 ? null : {
    topIndex: Math.min(s, g),
    bottomIndex: Math.max(s, g)
  };
}
const st = {
  attack: 0.01,
  decay: 0.1,
  sustain: 0.7,
  release: 0.3
}, it = {
  enabled: !1,
  blend: 0.5,
  cutoff: 0.5,
  resonance: 0,
  type: "lowpass",
  mix: 1
}, at = {
  speed: 5,
  span: 0
}, rt = {
  speed: 5,
  span: 0
};
function lt() {
  const o = [
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
  return o.forEach((s) => {
    const g = new Float32Array(32);
    g[0] = 1;
    const t = new Float32Array(32);
    e[s] = {
      name: "Sine",
      adsr: { ...st },
      coeffs: g,
      phases: t,
      filter: { ...it },
      activePresetName: "sine",
      gain: 1,
      vibrato: { ...at },
      tremelo: { ...rt }
    };
  }), e;
}
function ct() {
  return {
    macrobeatGroupings: [2, 2, 2, 2],
    macrobeatBoundaryStyles: ["dashed", "dashed", "dashed", "dashed"],
    hasAnacrusis: !1,
    baseMicrobeatPx: 40,
    modulationMarkers: []
  };
}
function dt() {
  const o = ot("G5", "C4");
  return o || {
    topIndex: 0,
    bottomIndex: Math.max(0, J.length - 1)
  };
}
function ut() {
  const o = lt();
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
      timbres: JSON.parse(JSON.stringify(o)),
      placedChords: [],
      sixteenthStampPlacements: [],
      tripletStampPlacements: [],
      annotations: [],
      lassoSelection: { selectedItems: [], convexHull: null, isActive: !1 }
    }],
    historyIndex: 0,
    fullRowData: [...J],
    pitchRange: dt(),
    // --- Rhythm ---
    ...ct(),
    selectedModulationRatio: null,
    // --- Timbres & Colors ---
    timbres: o,
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
function Re(o) {
  if (!(!o || o.isDrum) && o.shape === "circle" && typeof o.startColumnIndex == "number") {
    const e = o.startColumnIndex + 1;
    (typeof o.endColumnIndex != "number" || o.endColumnIndex < e) && (o.endColumnIndex = e);
  }
}
function re(o, e) {
  if (typeof o.row != "number") return;
  const s = e.length > 0 ? e.length - 1 : -1;
  if (s < 0) return;
  const g = typeof o.globalRow == "number" ? o.globalRow : o.row, t = Math.max(0, Math.min(s, Math.round(g)));
  o.globalRow = t, o.row = t;
}
function le() {
  return `uuid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function ht(o = {}) {
  const {
    getMacrobeatInfo: e,
    getDegreeForNote: s,
    hasAccidental: g,
    log: t = () => {
    }
  } = o;
  return {
    /**
     * Adds a note to the state.
     * IMPORTANT: This function no longer records history. The calling function is responsible for that.
     */
    addNote(h) {
      const a = this.state.placedNotes.find(
        (u) => !u.isDrum && u.row === h.row && u.startColumnIndex === h.startColumnIndex && u.color === h.color
      );
      if (a) {
        if (this.state.degreeDisplayMode !== "off" && s && g) {
          const u = s(a, this.state);
          if (u && g(u))
            return a.enharmonicPreference = !a.enharmonicPreference, t("debug", "[ENHARMONIC] Toggled enharmonic preference for note", {
              noteUuid: a.uuid,
              currentDegree: u,
              enharmonicPreference: a.enharmonicPreference
            }), this.emit("notesChanged"), a;
        }
        return null;
      }
      const l = { ...h, uuid: le() };
      return Re(l), re(l, this.state.fullRowData), this.state.placedNotes.push(l), this.emit("notesChanged"), l;
    },
    updateNoteTail(h, a) {
      let l = a;
      h.shape === "circle" && (l = Math.max(h.startColumnIndex + 1, a)), h.endColumnIndex = l, this.emit("notesChanged");
    },
    updateMultipleNoteTails(h, a) {
      h.forEach((l) => {
        let u = a;
        l.shape === "circle" && (u = Math.max(l.startColumnIndex + 1, a)), l.endColumnIndex = u;
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
    updateNoteRow(h, a) {
      h.row = a, h.globalRow = a, this.emit("notesChanged");
    },
    updateMultipleNoteRows(h, a) {
      h.forEach((l, u) => {
        const c = a[u];
        c !== void 0 && (l.row = c, re(l, this.state.fullRowData));
      }), this.emit("notesChanged");
    },
    updateNotePosition(h, a) {
      h.startColumnIndex = a, h.endColumnIndex = h.shape === "circle" ? a + 1 : a, this.emit("notesChanged");
    },
    updateMultipleNotePositions(h, a) {
      h.forEach((l) => {
        l.startColumnIndex = a, l.endColumnIndex = l.shape === "circle" ? a + 1 : a;
      }), this.emit("notesChanged");
    },
    removeNote(h) {
      const a = this.state.placedNotes.indexOf(h);
      a > -1 && (this.state.placedNotes.splice(a, 1), this.emit("notesChanged"));
    },
    removeMultipleNotes(h) {
      const a = new Set(h);
      this.state.placedNotes = this.state.placedNotes.filter((l) => !a.has(l)), this.emit("notesChanged");
    },
    eraseInPitchArea(h, a, l = 1, u = !0) {
      const c = h + l - 1, i = a - 1, d = a + 1;
      let p = !1;
      const y = this.state.placedNotes.length;
      return this.state.placedNotes = this.state.placedNotes.filter((n) => {
        if (n.isDrum) return !0;
        if (n.shape === "circle") {
          const m = n.startColumnIndex + 1, M = typeof n.endColumnIndex == "number" ? Math.max(m, n.endColumnIndex) : m, P = n.startColumnIndex <= c && M >= h, r = n.row >= i && n.row <= d;
          if (P && r)
            return !1;
        } else if (n.row >= i && n.row <= d && n.startColumnIndex <= c && n.endColumnIndex >= h)
          return !1;
        return !0;
      }), this.state.placedNotes.length < y && (p = !0), p && (this.emit("notesChanged"), u && this.recordState()), p;
    },
    addTonicSignGroup(h) {
      t("debug", "Starting addTonicSignGroup", { tonicSignGroup: h });
      const a = h[0];
      if (!a) return;
      const { preMacrobeatIndex: l } = a;
      if (t("debug", "preMacrobeatIndex", { preMacrobeatIndex: l }), Object.entries(this.state.tonicSignGroups).find(
        ([, y]) => y.some((n) => n.preMacrobeatIndex === l)
      )) {
        t("debug", "Existing tonic already present for measure, skipping", { preMacrobeatIndex: l });
        return;
      }
      if (!e) {
        t("error", "getMacrobeatInfo callback not provided");
        return;
      }
      const c = e(this.state, l + 1).startColumn;
      t("debug", "Boundary column (canvas-space) for shifting notes", { boundaryColumn: c });
      const i = this.state.placedNotes.filter((y) => y.startColumnIndex >= c);
      t("debug", "Notes that will be shifted", {
        noteRanges: i.map((y) => `${y.startColumnIndex}-${y.endColumnIndex}`)
      }), this.state.placedNotes.forEach((y) => {
        if (y.startColumnIndex >= c) {
          const n = y.startColumnIndex, m = y.endColumnIndex;
          y.startColumnIndex = y.startColumnIndex + 2, y.endColumnIndex = y.endColumnIndex + 2, t("debug", `Shifted note from ${n}-${m} to ${y.startColumnIndex}-${y.endColumnIndex}`);
        }
      });
      const d = le(), p = h.map((y) => ({
        ...y,
        uuid: d,
        globalRow: typeof y.globalRow == "number" ? y.globalRow : y.row
      }));
      this.state.tonicSignGroups[d] = p, t("debug", "Added tonic group", { uuid: d, columns: p.map((y) => y.columnIndex) }), t("debug", "Emitting events: notesChanged, rhythmStructureChanged"), this.emit("notesChanged"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    /**
     * Erases tonic sign at the specified column index (canvas-space)
     */
    eraseTonicSignAt(h, a = !0) {
      const l = Object.entries(this.state.tonicSignGroups).find(
        ([, y]) => y.some((n) => n.columnIndex === h)
      );
      if (!l)
        return !1;
      if (!e)
        return t("error", "getMacrobeatInfo callback not provided"), !1;
      const [u, c] = l, i = c[0];
      if (!i) return !1;
      const d = i.preMacrobeatIndex, p = e(this.state, d + 1).startColumn;
      return delete this.state.tonicSignGroups[u], this.state.placedNotes.forEach((y) => {
        y.startColumnIndex >= p && (y.startColumnIndex = y.startColumnIndex - 2, y.endColumnIndex = y.endColumnIndex - 2);
      }), this.emit("notesChanged"), this.emit("rhythmStructureChanged"), a && this.recordState(), !0;
    },
    clearAllNotes() {
      this.state.placedNotes = [], this.state.tonicSignGroups = {}, this.emit("notesChanged"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    loadNotes(h) {
      const a = (h || []).map((l) => {
        const u = {
          ...l,
          uuid: (l == null ? void 0 : l.uuid) ?? le()
        };
        return Re(u), re(u, this.state.fullRowData), u;
      });
      this.state.placedNotes = a, this.emit("notesChanged"), this.recordState();
    }
  };
}
function mt() {
  return `sixteenth-stamp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function ft(o = {}) {
  const {
    getPlacedTonicSigns: e,
    isWithinTonicSpan: s,
    log: g = () => {
    }
  } = o;
  return {
    /**
     * Adds a stamp placement to the state
     * @param startColumn Canvas-space column index (0 = first musical beat)
     * @returns The placement if successful, null if blocked by tonic column
     */
    addSixteenthStampPlacement(t, h, a, l = "#4a90e2") {
      const u = h + 2;
      if (e && s) {
        const p = e(this.state);
        (s(h, p) || s(h + 1, p)) && g("debug", "Cannot place sixteenth stamp - overlaps tonic column", {
          sixteenthStampId: t,
          startColumn: h,
          row: a
        });
      }
      const c = this.state.sixteenthStampPlacements.find(
        (p) => p.row === a && p.startColumn < u && p.endColumn > h
      );
      c && this.removeSixteenthStampPlacement(c.id);
      const i = a, d = {
        id: mt(),
        sixteenthStampId: t,
        startColumn: h,
        endColumn: u,
        row: a,
        globalRow: i,
        color: l,
        timestamp: Date.now(),
        shapeOffsets: {}
      };
      return this.state.sixteenthStampPlacements.push(d), this.emit("sixteenthStampPlacementsChanged"), g("debug", `Added sixteenth stamp ${t} at canvas-space ${h}-${u},${a}`, {
        sixteenthStampId: t,
        startColumn: h,
        endColumn: u,
        row: a,
        placementId: d.id
      }), d;
    },
    /**
     * Removes a stamp placement by ID
     */
    removeSixteenthStampPlacement(t) {
      const h = this.state.sixteenthStampPlacements.findIndex((l) => l.id === t);
      if (h === -1) return !1;
      const a = this.state.sixteenthStampPlacements.splice(h, 1)[0];
      return a ? (this.emit("sixteenthStampPlacementsChanged"), g("debug", `Removed sixteenth stamp ${a.sixteenthStampId} at ${a.startColumn}-${a.endColumn},${a.row}`, {
        placementId: t,
        sixteenthStampId: a.sixteenthStampId,
        startColumn: a.startColumn,
        endColumn: a.endColumn,
        row: a.row
      }), !0) : !1;
    },
    /**
     * Removes stamps that intersect with an eraser area
     * @param eraseStartCol Canvas-space column index
     * @param eraseEndCol Canvas-space column index
     */
    eraseSixteenthStampsInArea(t, h, a, l) {
      const u = [];
      for (const i of this.state.sixteenthStampPlacements) {
        const d = i.startColumn <= h && i.endColumn >= t, p = i.row >= a && i.row <= l;
        d && p && u.push(i.id);
      }
      let c = !1;
      return u.forEach((i) => {
        this.removeSixteenthStampPlacement(i) && (c = !0);
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
    getSixteenthStampAt(t, h) {
      return this.state.sixteenthStampPlacements.find(
        (a) => a.row === h && t >= a.startColumn && t < a.endColumn
      ) || null;
    },
    /**
     * Clears all stamp placements
     */
    clearAllSixteenthStamps() {
      const t = this.state.sixteenthStampPlacements.length > 0;
      this.state.sixteenthStampPlacements = [], t && (this.emit("sixteenthStampPlacementsChanged"), g("info", "Cleared all sixteenth stamp placements"));
    },
    /**
     * Gets stamp placements for playback scheduling
     */
    getSixteenthStampPlaybackData() {
      return this.state.sixteenthStampPlacements.map((t) => {
        const h = this.state.fullRowData[t.row];
        return {
          sixteenthStampId: t.sixteenthStampId,
          column: t.startColumn,
          startColumn: t.startColumn,
          endColumn: t.endColumn,
          row: t.row,
          pitch: (h == null ? void 0 : h.toneNote) || "",
          color: t.color,
          placement: t
          // Include full placement object with shapeOffsets
        };
      }).filter((t) => t.pitch);
    },
    /**
     * Updates the pitch offset for an individual shape within a stamp
     */
    updateSixteenthStampShapeOffset(t, h, a) {
      const l = this.state.sixteenthStampPlacements.find((u) => u.id === t);
      if (!l) {
        g("warn", "[SIXTEENTH STAMP SHAPE OFFSET] Placement not found", { placementId: t });
        return;
      }
      l.shapeOffsets || (l.shapeOffsets = {}), g("debug", "[SIXTEENTH STAMP SHAPE OFFSET] Updating shape offset", {
        placementId: t,
        shapeKey: h,
        oldOffset: l.shapeOffsets[h] || 0,
        newOffset: a,
        baseRow: l.row,
        targetRow: l.row + a
      }), l.shapeOffsets[h] = a, this.emit("sixteenthStampPlacementsChanged");
    },
    /**
     * Gets the effective row for a specific shape within a stamp
     */
    getSixteenthStampShapeRow(t, h) {
      var l;
      const a = ((l = t.shapeOffsets) == null ? void 0 : l[h]) || 0;
      return t.row + a;
    }
  };
}
function pt() {
  return `triplet-stamp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function gt(o = {}) {
  const {
    canvasToTime: e,
    timeToCanvas: s,
    getColumnMap: g,
    log: t = () => {
    }
  } = o;
  return {
    /**
     * Adds a triplet placement to the state
     * @param placement - The triplet placement object
     * @returns The placed triplet or null if invalid
     */
    addTripletStampPlacement(h) {
      this.state.tripletStampPlacements || (this.state.tripletStampPlacements = []);
      const a = h.startTimeIndex + h.span * 2, l = this.state.tripletStampPlacements.find((c) => c.row !== h.row ? !1 : !(c.startTimeIndex + c.span * 2 <= h.startTimeIndex || a <= c.startTimeIndex));
      if (l && this.removeTripletStampPlacement(l.id), this.state.sixteenthStampPlacements && e && g) {
        const c = g(this.state);
        this.state.sixteenthStampPlacements.filter((d) => {
          if (d.row !== h.row) return !1;
          const p = e(d.startColumn, c);
          return p === null ? !0 : !(p + 2 <= h.startTimeIndex || p >= a);
        }).forEach((d) => {
          this.removeSixteenthStampPlacement && this.removeSixteenthStampPlacement(d.id);
        });
      }
      const u = {
        id: pt(),
        ...h,
        shapeOffsets: h.shapeOffsets || {}
      };
      return this.state.tripletStampPlacements.push(u), this.emit("tripletStampPlacementsChanged"), this.emit("rhythmStructureChanged"), t("debug", `Added triplet stamp ${h.tripletStampId} at time ${h.startTimeIndex}, row ${h.row}`, {
        tripletStampId: h.tripletStampId,
        startTimeIndex: h.startTimeIndex,
        span: h.span,
        row: h.row,
        placementId: u.id
      }), u;
    },
    /**
     * Removes a triplet placement by ID
     * @param placementId - The placement ID to remove
     * @returns True if a triplet was removed
     */
    removeTripletStampPlacement(h) {
      if (!this.state.tripletStampPlacements) return !1;
      const a = this.state.tripletStampPlacements.findIndex((u) => u.id === h);
      if (a === -1) return !1;
      const l = this.state.tripletStampPlacements.splice(a, 1)[0];
      return l ? (this.emit("tripletStampPlacementsChanged"), t("debug", `Removed triplet stamp ${l.tripletStampId} at time ${l.startTimeIndex}, row ${l.row}`, {
        placementId: h,
        tripletStampId: l.tripletStampId,
        startTimeIndex: l.startTimeIndex,
        span: l.span,
        row: l.row
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
    eraseTripletStampsInArea(h, a, l, u) {
      if (!this.state.tripletStampPlacements || !s || !g) return !1;
      const c = g(this.state), i = [];
      for (const p of this.state.tripletStampPlacements)
        if (p.row >= l && p.row <= u) {
          const y = p.span * 2, n = s(p.startTimeIndex, c);
          n + y - 1 < h || n > a || i.push(p.id);
        }
      let d = !1;
      return i.forEach((p) => {
        this.removeTripletStampPlacement(p) && (d = !0);
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
    getTripletStampAt(h, a) {
      return this.state.tripletStampPlacements && this.state.tripletStampPlacements.find(
        (l) => l.row === a && h >= l.startTimeIndex && h < l.startTimeIndex + l.span * 2
      ) || null;
    },
    /**
     * Clears all triplet placements
     */
    clearAllTripletStamps() {
      if (!this.state.tripletStampPlacements) return;
      const h = this.state.tripletStampPlacements.length > 0;
      this.state.tripletStampPlacements = [], h && (this.emit("tripletStampPlacementsChanged"), t("info", "Cleared all triplet stamp placements"));
    },
    /**
     * Gets triplet placements for playback scheduling
     * @returns Array of playback data for triplets
     */
    getTripletStampPlaybackData() {
      return this.state.tripletStampPlacements ? this.state.tripletStampPlacements.map((h) => {
        const a = this.state.fullRowData[h.row];
        return {
          startTimeIndex: h.startTimeIndex,
          tripletStampId: h.tripletStampId,
          row: h.row,
          pitch: (a == null ? void 0 : a.toneNote) ?? "",
          color: h.color,
          span: h.span,
          placement: h
          // Include full placement object with shapeOffsets
        };
      }).filter((h) => h.pitch) : [];
    },
    /**
     * Updates the pitch offset for an individual shape within a triplet group
     * @param placementId - The triplet placement ID
     * @param shapeKey - The shape identifier (e.g., "triplet_0", "triplet_1", "triplet_2")
     * @param rowOffset - The pitch offset in rows (can be negative)
     */
    updateTripletStampShapeOffset(h, a, l) {
      var c;
      const u = (c = this.state.tripletStampPlacements) == null ? void 0 : c.find((i) => i.id === h);
      if (!u) {
        t("warn", "[TRIPLET STAMP SHAPE OFFSET] Placement not found", { placementId: h });
        return;
      }
      u.shapeOffsets || (u.shapeOffsets = {}), t("debug", "[TRIPLET STAMP SHAPE OFFSET] Updating shape offset", {
        placementId: h,
        shapeKey: a,
        oldOffset: u.shapeOffsets[a] || 0,
        newOffset: l,
        baseRow: u.row,
        targetRow: u.row + l
      }), u.shapeOffsets[a] = l, this.emit("tripletStampPlacementsChanged");
    },
    /**
     * Gets the effective row for a specific shape within a triplet group
     * @param placement - The triplet placement object
     * @param shapeKey - The shape identifier
     * @returns The effective row index
     */
    getTripletStampShapeRow(h, a) {
      var u;
      const l = ((u = h.shapeOffsets) == null ? void 0 : u[a]) || 0;
      return h.row + l;
    }
  };
}
const k = {
  COMPRESSION_2_3: 2 / 3,
  // 0.6666666667
  EXPANSION_3_2: 3 / 2
  // 1.5
};
function St(o, e, s) {
  const { getMacrobeatInfo: g, log: t = () => {
  } } = s;
  if (t("debug", "[MODULATION] measureIndexToColumnIndex called", {
    measureIndex: o,
    hasState: !!e
  }), !e || !e.macrobeatGroupings) {
    t("warn", "[MODULATION] No state or macrobeatGroupings provided for measure conversion");
    const u = o * 4;
    return t("debug", "[MODULATION] Using fallback calculation", u), u;
  }
  if (o === 0)
    return t("debug", "[MODULATION] Measure 0 at canvas-space column 0"), 0;
  if (!g)
    return t("warn", "[MODULATION] getMacrobeatInfo callback not provided"), o * 4;
  const h = o - 1;
  t("debug", `[MODULATION] Converting measureIndex ${o} to macrobeatIndex: ${h}`);
  const a = g(e, h);
  if (t("debug", "[MODULATION] getMacrobeatInfo result", a), a) {
    const u = a.endColumn + 1;
    return t("debug", `[MODULATION] Found measure info, canvas-space endColumn: ${a.endColumn}, first column after: ${u}`), u;
  }
  t("warn", `[MODULATION] Could not find measure info for index: ${o}`);
  const l = o * 4;
  return t("debug", "[MODULATION] Using improved fallback calculation", l), l;
}
function yt(o, e, s = null, g = null, t = null) {
  return {
    id: `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    measureIndex: o,
    ratio: e,
    active: !0,
    xPosition: s,
    // Store the actual boundary position if provided
    columnIndex: g,
    // Store column index for stable positioning
    macrobeatIndex: t
    // Store macrobeat index for stable positioning
  };
}
function sn(o) {
  return Math.abs(o - k.COMPRESSION_2_3) < 1e-3 ? "2:3" : Math.abs(o - k.EXPANSION_3_2) < 1e-3 ? "3:2" : `${o}`;
}
function an(o) {
  const e = "#ffc107";
  return Math.abs(o - k.COMPRESSION_2_3) < 1e-3 || Math.abs(o - k.EXPANSION_3_2) < 1e-3, e;
}
function Ge() {
  const o = [{
    startColumn: 0,
    endColumn: 1 / 0,
    scale: 1
  }];
  return {
    segments: o,
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
      return o[0] || null;
    },
    getGhostGridPositions() {
      return [];
    }
  };
}
function rn(o, e, s = null, g = {}) {
  const { log: t = () => {
  } } = g;
  if (!o || o.length === 0)
    return Ge();
  const h = [...o.filter((d) => d.active)].sort((d, p) => d.measureIndex - p.measureIndex);
  if (h.length === 0)
    return Ge();
  t("debug", "[MODULATION] Creating coordinate mapping for markers", h);
  const a = h.map((d) => {
    const p = St(d.measureIndex, s, g);
    return t("debug", `[MODULATION] Marker at measure ${d.measureIndex} calculated column=${p}`), t("debug", "[MODULATION] Full marker data", d), t("debug", "[MODULATION] Final marker position", {
      id: d.id,
      measureIndex: d.measureIndex,
      columnIndex: p
    }), {
      ...d,
      columnIndex: p
    };
  }), l = [];
  let u = 1;
  const c = a[0];
  if (a.length === 0 || c && c.columnIndex > 0) {
    const d = c ? c.columnIndex : 1 / 0;
    l.push({
      startColumn: 0,
      endColumn: d,
      scale: 1
    });
  }
  for (let d = 0; d < a.length; d++) {
    const p = a[d], y = a[d + 1], n = y ? y.columnIndex : 1 / 0;
    u *= p.ratio, l.push({
      startColumn: p.columnIndex,
      // Canvas-space
      endColumn: n,
      // Canvas-space
      scale: u,
      marker: p
    });
  }
  return {
    segments: l,
    /**
     * Gets the modulation scale for a given column index
     * @param columnIndex - Column index in musical space
     * @returns Scale factor (1.0 = no modulation, 0.667 = compressed, 1.5 = expanded)
     */
    getScaleForColumn(d) {
      for (const p of l)
        if (d >= p.startColumn && d < p.endColumn)
          return p.scale;
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
      return l[0] || null;
    },
    /**
     * Gets all ghost grid positions for a segment
     * NOTE: This method is deprecated - ghost grid now handled differently
     */
    getGhostGridPositions(d, p) {
      return [];
    }
  };
}
function ln(o, e) {
  if (o >= 0 && o < e.length) {
    const s = e[o];
    if (s !== void 0)
      return s;
  }
  return o * 0.333;
}
function cn(o, e, s) {
  return 0;
}
function dn(o, e, s) {
  return 0;
}
const Le = new Array(19).fill(2), Ct = [
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
], _e = new Array(16).fill(2), At = [
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
function Ve(o, e) {
  const s = e(o), g = /* @__PURE__ */ new Map();
  s.entries.forEach((t) => {
    t.type === "tonic" && t.tonicSignUuid && typeof t.canvasIndex == "number" && g.set(t.tonicSignUuid, t.canvasIndex);
  }), Object.entries(o.tonicSignGroups || {}).forEach(([t, h]) => {
    const a = g.get(t);
    a !== void 0 && h.forEach((l) => {
      l.columnIndex = a;
    });
  });
}
const Tt = {
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
function Nt(o = {}) {
  const {
    getColumnMap: e = () => Tt,
    visualToTimeIndex: s = () => null,
    timeIndexToVisualColumn: g = () => null,
    getTimeBoundaryAfterMacrobeat: t = () => 0,
    log: h = () => {
    }
  } = o;
  return {
    setAnacrusis(a) {
      var n, m, M;
      if (this.state.hasAnacrusis === a)
        return;
      const l = [...this.state.macrobeatGroupings], u = [...this.state.macrobeatBoundaryStyles], c = l.reduce((P, r) => P + r, 0);
      let i, d;
      if (a) {
        const P = this._anacrusisCache, r = Le.length - _e.length, C = Le.slice(0, r), A = Ct.slice(0, r), v = (n = P == null ? void 0 : P.groupings) != null && n.length ? [...P.groupings] : [...C], f = (m = P == null ? void 0 : P.boundaryStyles) != null && m.length ? [...P.boundaryStyles] : [...A];
        if (i = [...v, ...l], d = [...f, ...u], !((M = P == null ? void 0 : P.boundaryStyles) != null && M.length))
          for (let S = 0; S < f.length; S++)
            d[S] = S < f.length - 1 ? "anacrusis" : "solid";
        this._anacrusisCache = null, h("debug", "rhythmActions", "Enabled anacrusis", {
          insertedCount: v.length,
          insertedColumns: v.reduce((S, I) => S + I, 0)
        }, "state");
      } else {
        const P = u.findIndex((v) => v === "solid");
        let r = 0;
        if (P !== -1)
          r = P + 1;
        else
          for (; r < u.length && u[r] === "anacrusis"; )
            r++;
        r = Math.min(r, l.length);
        const C = l.slice(0, r), A = u.slice(0, r);
        r > 0 ? this._anacrusisCache = {
          groupings: C,
          boundaryStyles: A
        } : this._anacrusisCache = null, i = l.slice(r), d = u.slice(r).map((v) => v === "anacrusis" ? "dashed" : v), i.length === 0 && (i = [..._e], d = [...At]), h("debug", "rhythmActions", "Disabled anacrusis", {
          removalCount: r,
          removedColumns: C.reduce((v, f) => v + f, 0)
        }, "state");
      }
      const y = i.reduce((P, r) => P + r, 0) - c;
      if (this.state.hasAnacrusis = a, this.state.macrobeatGroupings = [...i], this.state.macrobeatBoundaryStyles = [...d], Ve(this.state, e), y !== 0) {
        const P = [];
        this.state.placedNotes.forEach((f) => {
          const S = s(this.state, f.startColumnIndex, l), I = s(this.state, f.endColumnIndex, l);
          if (S === null || I === null)
            return;
          const T = S + y, x = I + y;
          if (T < 0) {
            P.push(f);
            return;
          }
          const b = g(this.state, T, i), N = g(this.state, x, i);
          if (b === null || N === null) {
            P.push(f);
            return;
          }
          f.startColumnIndex = b, f.endColumnIndex = N;
        }), P.forEach((f) => {
          const S = this.state.placedNotes.indexOf(f);
          S > -1 && this.state.placedNotes.splice(S, 1);
        });
        const r = [];
        this.state.sixteenthStampPlacements.forEach((f) => {
          const S = s(this.state, f.startColumn, l), I = s(this.state, f.endColumn, l);
          if (S === null || I === null)
            return;
          const T = S + y, x = I + y;
          if (T < 0) {
            r.push(f);
            return;
          }
          const b = g(this.state, T, i), N = g(this.state, x, i);
          if (b === null || N === null) {
            r.push(f);
            return;
          }
          f.startColumn = b, f.endColumn = N;
        }), r.forEach((f) => {
          const S = this.state.sixteenthStampPlacements.indexOf(f);
          S > -1 && this.state.sixteenthStampPlacements.splice(S, 1);
        });
        const C = [];
        this.state.tripletStampPlacements && (this.state.tripletStampPlacements.forEach((f) => {
          const S = f.startTimeIndex + y;
          S < 0 ? C.push(f) : f.startTimeIndex = S;
        }), C.forEach((f) => {
          const S = this.state.tripletStampPlacements.indexOf(f);
          S > -1 && this.state.tripletStampPlacements.splice(S, 1);
        }));
        const A = [], v = a ? i.length - l.length : -(l.length - i.length);
        this.state.modulationMarkers.forEach((f) => {
          const S = f.measureIndex + v;
          if (S < 0) {
            A.push(f);
            return;
          }
          f.measureIndex = S, f.columnIndex = null, f.xPosition = null, f.macrobeatIndex = null;
        }), A.forEach((f) => {
          const S = this.state.modulationMarkers.indexOf(f);
          S > -1 && this.state.modulationMarkers.splice(S, 1);
        });
      }
      this.emit("anacrusisChanged", a), this.emit("notesChanged"), this.emit("sixteenthStampPlacementsChanged"), this.emit("tripletStampPlacementsChanged"), this.emit("modulationMarkersChanged"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    toggleMacrobeatGrouping(a) {
      if (a === void 0 || a < 0 || a >= this.state.macrobeatGroupings.length) {
        h("error", "rhythmActions", `Invalid index for toggleMacrobeatGrouping: ${a}`, null, "state");
        return;
      }
      const l = [...this.state.macrobeatGroupings], u = l[a], c = u === 2 ? 3 : 2, i = c - u, d = [...l];
      d[a] = c;
      const p = t(this.state, a, l), y = [];
      this.state.placedNotes.forEach((n) => {
        const m = s(this.state, n.startColumnIndex, l), M = s(this.state, n.endColumnIndex, l);
        if (!(m === null || M === null) && m >= p) {
          const P = m + i, r = M + i, C = g(this.state, P, d), A = g(this.state, r, d);
          C !== null && A !== null ? (n.startColumnIndex = C, n.endColumnIndex = A) : y.push(n);
        }
      }), y.length && y.forEach((n) => {
        const m = this.state.placedNotes.indexOf(n);
        m > -1 && this.state.placedNotes.splice(m, 1);
      }), this.state.macrobeatGroupings = d, Ve(this.state, e), this.emit("notesChanged"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    cycleMacrobeatBoundaryStyle(a) {
      if (a === void 0 || a < 0 || a >= this.state.macrobeatBoundaryStyles.length) {
        h("error", "rhythmActions", `Invalid index for cycleMacrobeatBoundaryStyle: ${a}`, null, "state");
        return;
      }
      const l = this._isBoundaryInAnacrusis(a);
      let u;
      l ? u = ["dashed", "solid", "anacrusis"] : u = ["dashed", "solid"];
      const c = this.state.macrobeatBoundaryStyles[a] ?? "dashed", i = u.indexOf(c), d = i === -1 ? 0 : (i + 1) % u.length, p = u[d] ?? "dashed";
      this.state.macrobeatBoundaryStyles[a] = p, this.emit("rhythmStructureChanged"), this.recordState();
    },
    _isBoundaryInAnacrusis(a) {
      if (!this.state.hasAnacrusis)
        return !1;
      for (let l = 0; l <= a; l++)
        if (this.state.macrobeatBoundaryStyles[l] === "solid")
          return l === a;
      return !0;
    },
    increaseMacrobeatCount() {
      this.state.macrobeatGroupings.push(2), this.state.macrobeatBoundaryStyles.push("dashed"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    decreaseMacrobeatCount() {
      if (this.state.macrobeatGroupings.length > 1) {
        const a = this.state.macrobeatGroupings.length - 1, l = t(
          this.state,
          a - 1,
          this.state.macrobeatGroupings
        ), u = [];
        this.state.placedNotes.forEach((d) => {
          const p = s(this.state, d.startColumnIndex, this.state.macrobeatGroupings);
          p !== null && p >= l && u.push(d);
        }), u.forEach((d) => {
          const p = this.state.placedNotes.indexOf(d);
          p > -1 && this.state.placedNotes.splice(p, 1);
        });
        const c = [];
        this.state.sixteenthStampPlacements.forEach((d) => {
          const p = s(this.state, d.startColumn, this.state.macrobeatGroupings);
          p !== null && p >= l && c.push(d);
        }), c.forEach((d) => {
          const p = this.state.sixteenthStampPlacements.indexOf(d);
          p > -1 && this.state.sixteenthStampPlacements.splice(p, 1);
        });
        const i = [];
        this.state.tripletStampPlacements && (this.state.tripletStampPlacements.forEach((d) => {
          d.startTimeIndex >= l && i.push(d);
        }), i.forEach((d) => {
          const p = this.state.tripletStampPlacements.indexOf(d);
          p > -1 && this.state.tripletStampPlacements.splice(p, 1);
        })), this.state.macrobeatGroupings.pop(), this.state.macrobeatBoundaryStyles.pop(), u.length > 0 && this.emit("notesChanged"), c.length > 0 && this.emit("sixteenthStampPlacementsChanged"), i.length > 0 && this.emit("tripletStampPlacementsChanged"), this.emit("rhythmStructureChanged"), this.recordState();
      }
    },
    updateTimeSignature(a, l) {
      if (!Array.isArray(l) || l.length === 0) {
        h("error", "rhythmActions", "Invalid groupings provided to updateTimeSignature", null, "state");
        return;
      }
      let u = 0, c = 0, i = 0;
      for (let C = 0; C < this.state.macrobeatGroupings.length; C++) {
        if (i === a) {
          u = C;
          break;
        }
        const A = C === this.state.macrobeatGroupings.length - 1;
        (this.state.macrobeatBoundaryStyles[C] === "solid" || A) && i++;
      }
      i = 0;
      for (let C = 0; C < this.state.macrobeatGroupings.length; C++)
        if (i === a) {
          const A = C === this.state.macrobeatGroupings.length - 1;
          if (this.state.macrobeatBoundaryStyles[C] === "solid" || A) {
            c = C;
            break;
          }
        } else if (i < a) {
          const A = C === this.state.macrobeatGroupings.length - 1;
          (this.state.macrobeatBoundaryStyles[C] === "solid" || A) && i++;
        }
      const d = c - u + 1, p = l.length, y = this.state.macrobeatGroupings.slice(u, c + 1).reduce((C, A) => C + A, 0), m = l.reduce((C, A) => C + A, 0) - y, M = t(this.state, c, this.state.macrobeatGroupings);
      if (m !== 0) {
        const C = (() => {
          const v = [...this.state.macrobeatGroupings];
          return v.splice(u, d, ...l), v;
        })(), A = [];
        this.state.placedNotes.forEach((v) => {
          const f = s(this.state, v.startColumnIndex, this.state.macrobeatGroupings), S = s(this.state, v.endColumnIndex, this.state.macrobeatGroupings);
          if (!(f === null || S === null) && f >= M) {
            const I = f + m, T = S + m, x = g(this.state, I, C), b = g(this.state, T, C);
            x !== null && b !== null ? (v.startColumnIndex = x, v.endColumnIndex = b) : A.push(v);
          }
        }), A.length && A.forEach((v) => {
          const f = this.state.placedNotes.indexOf(v);
          f > -1 && this.state.placedNotes.splice(f, 1);
        });
      }
      const P = [...l], r = new Array(Math.max(p - 1, 0)).fill("dashed");
      if (c < this.state.macrobeatBoundaryStyles.length) {
        const C = this.state.macrobeatBoundaryStyles[c] ?? "dashed";
        r.push(C);
      }
      this.state.macrobeatGroupings.splice(u, d, ...P), this.state.macrobeatBoundaryStyles.splice(u, d - 1, ...r), this.emit("notesChanged"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    addModulationMarker(a, l, u = null, c = null, i = null) {
      if (!Object.values(k).includes(l))
        return h("error", "rhythmActions", `Invalid modulation ratio: ${l}`, null, "state"), null;
      const d = this.state.modulationMarkers.findIndex((y) => y.measureIndex === a || i !== null && y.macrobeatIndex === i || c !== null && y.columnIndex === c);
      if (d !== -1) {
        const y = this.state.modulationMarkers[d];
        return h("info", "rhythmActions", `Replacing existing modulation marker ${y.id} at measure ${a} (old ratio: ${y.ratio}, new ratio: ${l})`, null, "state"), y.ratio = l, y.xPosition = u, c !== null && (y.columnIndex = c), i !== null && (y.macrobeatIndex = i), this.emit("modulationMarkersChanged"), this.recordState(), y.id;
      }
      const p = yt(a, l, u, c, i);
      return this.state.modulationMarkers.push(p), this.state.modulationMarkers.sort((y, n) => y.measureIndex - n.measureIndex), this.emit("modulationMarkersChanged"), this.recordState(), h("info", "rhythmActions", `Added modulation marker ${p.id} at measure ${a} with ratio=${l}, columnIndex=${c}`, null, "state"), p.id;
    },
    removeModulationMarker(a) {
      const l = this.state.modulationMarkers.findIndex((u) => u.id === a);
      if (l === -1) {
        h("warn", "rhythmActions", `Modulation marker not found: ${a}`, null, "state");
        return;
      }
      this.state.modulationMarkers.splice(l, 1), this.emit("modulationMarkersChanged"), this.recordState(), h("info", "rhythmActions", `Removed modulation marker ${a}`, null, "state");
    },
    setModulationRatio(a, l) {
      if (!Object.values(k).includes(l)) {
        h("error", "rhythmActions", `Invalid modulation ratio: ${l}`, null, "state");
        return;
      }
      const u = this.state.modulationMarkers.find((c) => c.id === a);
      if (!u) {
        h("warn", "rhythmActions", `Modulation marker not found: ${a}`, null, "state");
        return;
      }
      u.ratio = l, this.emit("modulationMarkersChanged"), this.recordState(), h("info", "rhythmActions", `Updated modulation marker ${a} ratio to ${l}`, null, "state");
    },
    moveModulationMarker(a, l) {
      const u = this.state.modulationMarkers.find((c) => c.id === a);
      if (!u) {
        h("warn", "rhythmActions", `Modulation marker not found: ${a}`, null, "state");
        return;
      }
      u.measureIndex = l, this.state.modulationMarkers.sort((c, i) => c.measureIndex - i.measureIndex), this.emit("modulationMarkersChanged"), this.recordState(), h("info", "rhythmActions", `Moved modulation marker ${a} to measure ${l}`, null, "state");
    },
    toggleModulationMarker(a) {
      const l = this.state.modulationMarkers.find((u) => u.id === a);
      if (!l) {
        h("warn", "rhythmActions", `Modulation marker not found: ${a}`, null, "state");
        return;
      }
      l.active = !l.active, this.emit("modulationMarkersChanged"), this.recordState(), h("info", "rhythmActions", `Toggled modulation marker ${a} active state to ${l.active}`, null, "state");
    },
    clearModulationMarkers() {
      const a = this.state.modulationMarkers.length;
      this.state.modulationMarkers = [], this.emit("modulationMarkersChanged"), this.recordState(), h("info", "rhythmActions", `Cleared ${a} modulation markers`, null, "state");
    }
  };
}
function $e(o) {
  const e = JSON.parse(JSON.stringify(o));
  for (const s in e) {
    const g = e[s];
    g.coeffs && typeof g.coeffs == "object" && !Array.isArray(g.coeffs) ? g.coeffs = new Float32Array(Object.values(g.coeffs)) : Array.isArray(g.coeffs) && (g.coeffs = new Float32Array(g.coeffs)), g.phases && typeof g.phases == "object" && !Array.isArray(g.phases) ? g.phases = new Float32Array(Object.values(g.phases)) : Array.isArray(g.phases) && (g.phases = new Float32Array(g.phases));
  }
  return e;
}
function bt(o, e) {
  if (o)
    try {
      const s = o.getItem(e);
      if (s === null)
        return;
      const g = JSON.parse(s);
      if (g.timbres)
        for (const t in g.timbres) {
          const h = g.timbres[t];
          if (h.coeffs && typeof h.coeffs == "object") {
            const a = Array.isArray(h.coeffs) ? h.coeffs : Object.values(h.coeffs);
            h.coeffs = new Float32Array(a);
          }
          if (h.phases && typeof h.phases == "object") {
            const a = Array.isArray(h.phases) ? h.phases : Object.values(h.phases);
            h.phases = new Float32Array(a);
          }
        }
      if (g.pitchRange) {
        const t = J.length, h = Math.max(0, t - 1), a = Math.max(0, Math.min(h, g.pitchRange.topIndex ?? 0)), l = Math.max(a, Math.min(h, g.pitchRange.bottomIndex ?? h));
        g.pitchRange = { topIndex: a, bottomIndex: l };
      }
      if ("playheadMode" in g) {
        const t = g.playheadMode;
        t !== "cursor" && t !== "microbeat" && t !== "macrobeat" && delete g.playheadMode;
      }
      return g.fullRowData = [...J], g;
    } catch {
      return;
    }
}
function vt(o, e, s) {
  var g;
  if (e)
    try {
      const t = JSON.parse(JSON.stringify({
        placedNotes: o.placedNotes,
        placedChords: o.placedChords,
        tonicSignGroups: o.tonicSignGroups,
        sixteenthStampPlacements: o.sixteenthStampPlacements,
        tripletStampPlacements: o.tripletStampPlacements,
        timbres: o.timbres,
        macrobeatGroupings: o.macrobeatGroupings,
        macrobeatBoundaryStyles: o.macrobeatBoundaryStyles,
        hasAnacrusis: o.hasAnacrusis,
        baseMicrobeatPx: o.baseMicrobeatPx,
        modulationMarkers: o.modulationMarkers,
        tempo: o.tempo,
        activeChordIntervals: o.activeChordIntervals,
        selectedNote: o.selectedNote,
        annotations: o.annotations,
        pitchRange: o.pitchRange,
        degreeDisplayMode: o.degreeDisplayMode,
        showOctaveLabels: o.showOctaveLabels,
        longNoteStyle: o.longNoteStyle,
        playheadMode: o.playheadMode
      }));
      if (o.timbres)
        for (const a in o.timbres) {
          const l = o.timbres[a], u = (g = t.timbres) == null ? void 0 : g[a];
          l != null && l.coeffs && u && (u.coeffs = Array.from(l.coeffs)), l != null && l.phases && u && (u.phases = Array.from(l.phases));
        }
      const h = JSON.stringify(t);
      e.setItem(s, h);
    } catch {
    }
}
function It(o = {}) {
  const {
    storageKey: e = "studentNotationState",
    storage: s,
    initialState: g,
    onClearState: t,
    noteActionCallbacks: h = {},
    sixteenthStampActionCallbacks: a = {},
    tripletStampActionCallbacks: l = {},
    rhythmActionCallbacks: u = {}
  } = o, c = {}, i = bt(s, e), d = !i, n = {
    state: {
      ...ut(),
      ...i,
      ...g
    },
    isColdStart: d,
    on(m, M) {
      c[m] || (c[m] = []), c[m].push(M);
    },
    off(m, M) {
      if (c[m]) {
        const P = c[m].indexOf(M);
        P > -1 && c[m].splice(P, 1);
      }
    },
    emit(m, M) {
      c[m] && c[m].forEach((P) => {
        try {
          P(M);
        } catch (r) {
          console.error(`Error in listener for event "${m}"`, r);
        }
      });
    },
    dispose() {
      for (const m in c)
        delete c[m];
    },
    saveState() {
      vt(n.state, s, e);
    },
    // ========== HISTORY ACTIONS ==========
    recordState() {
      n.state.history = n.state.history.slice(0, n.state.historyIndex + 1);
      const m = JSON.parse(JSON.stringify(n.state.timbres)), M = {
        notes: JSON.parse(JSON.stringify(n.state.placedNotes)),
        tonicSignGroups: JSON.parse(JSON.stringify(n.state.tonicSignGroups)),
        placedChords: JSON.parse(JSON.stringify(n.state.placedChords)),
        sixteenthStampPlacements: JSON.parse(JSON.stringify(n.state.sixteenthStampPlacements)),
        tripletStampPlacements: JSON.parse(JSON.stringify(n.state.tripletStampPlacements || [])),
        timbres: m,
        annotations: n.state.annotations ? JSON.parse(JSON.stringify(n.state.annotations)) : [],
        lassoSelection: JSON.parse(JSON.stringify(n.state.lassoSelection))
      };
      n.state.history.push(M), n.state.historyIndex++, n.emit("historyChanged"), n.saveState();
    },
    undo() {
      var m;
      if (n.state.historyIndex > 0) {
        n.state.historyIndex--;
        const M = n.state.history[n.state.historyIndex];
        if (!M) return;
        n.state.placedNotes = JSON.parse(JSON.stringify(M.notes)), n.state.tonicSignGroups = JSON.parse(JSON.stringify(M.tonicSignGroups)), n.state.sixteenthStampPlacements = JSON.parse(JSON.stringify(M.sixteenthStampPlacements || [])), n.state.tripletStampPlacements = JSON.parse(JSON.stringify(M.tripletStampPlacements || [])), n.state.timbres = $e(M.timbres), n.state.annotations = M.annotations ? JSON.parse(JSON.stringify(M.annotations)) : [], n.emit("notesChanged"), n.emit("sixteenthStampPlacementsChanged"), n.emit("tripletStampPlacementsChanged"), n.emit("rhythmStructureChanged"), (m = n.state.selectedNote) != null && m.color && n.emit("timbreChanged", n.state.selectedNote.color), n.emit("annotationsChanged"), n.emit("historyChanged");
      }
    },
    redo() {
      var m;
      if (n.state.historyIndex < n.state.history.length - 1) {
        n.state.historyIndex++;
        const M = n.state.history[n.state.historyIndex];
        if (!M) return;
        n.state.placedNotes = JSON.parse(JSON.stringify(M.notes)), n.state.tonicSignGroups = JSON.parse(JSON.stringify(M.tonicSignGroups)), n.state.sixteenthStampPlacements = JSON.parse(JSON.stringify(M.sixteenthStampPlacements || [])), n.state.tripletStampPlacements = JSON.parse(JSON.stringify(M.tripletStampPlacements || [])), n.state.timbres = $e(M.timbres), n.state.annotations = M.annotations ? JSON.parse(JSON.stringify(M.annotations)) : [], n.emit("notesChanged"), n.emit("sixteenthStampPlacementsChanged"), n.emit("tripletStampPlacementsChanged"), n.emit("rhythmStructureChanged"), (m = n.state.selectedNote) != null && m.color && n.emit("timbreChanged", n.state.selectedNote.color), n.emit("annotationsChanged"), n.emit("historyChanged");
      }
    },
    clearSavedState() {
      s && (s.removeItem(e), s.removeItem("effectDialValues")), t && t();
    },
    // ========== VIEW ACTIONS ==========
    setPlaybackState(m, M) {
      n.state.isPlaying = m, n.state.isPaused = M, n.emit("playbackStateChanged", { isPlaying: m, isPaused: M });
    },
    setLooping(m) {
      n.state.isLooping = m, n.emit("loopingChanged", m);
    },
    setTempo(m) {
      n.state.tempo = m, n.emit("tempoChanged", m);
    },
    setPlayheadMode(m) {
      n.state.playheadMode = m, n.emit("playheadModeChanged", m);
    },
    setSelectedTool(m, M) {
      const P = n.state.selectedTool;
      if (n.state.previousTool = P, n.state.selectedTool = m, M !== void 0) {
        const r = typeof M == "string" ? parseInt(M, 10) : M;
        isNaN(r) || (n.state.selectedToolTonicNumber = r);
      }
      n.emit("toolChanged", { newTool: m, oldTool: P });
    },
    setSelectedNote(m, M) {
      const P = { ...n.state.selectedNote };
      n.state.selectedNote = { shape: m, color: M }, n.emit("noteChanged", { newNote: n.state.selectedNote, oldNote: P });
    },
    setPitchRange(m) {
      n.state.pitchRange = { ...n.state.pitchRange, ...m }, n.emit("pitchRangeChanged", n.state.pitchRange);
    },
    setDegreeDisplayMode(m) {
      n.state.degreeDisplayMode = m, n.emit("degreeDisplayModeChanged", m);
    },
    setLongNoteStyle(m) {
      n.state.longNoteStyle = m, n.emit("longNoteStyleChanged", m);
    },
    toggleAccidentalMode(m) {
      n.state.accidentalMode[m] = !n.state.accidentalMode[m], n.emit("accidentalModeChanged", n.state.accidentalMode);
    },
    toggleFrequencyLabels() {
      n.state.showFrequencyLabels = !n.state.showFrequencyLabels, n.emit("frequencyLabelsChanged", n.state.showFrequencyLabels);
    },
    toggleOctaveLabels() {
      n.state.showOctaveLabels = !n.state.showOctaveLabels, n.emit("octaveLabelsChanged", n.state.showOctaveLabels);
    },
    toggleFocusColours() {
      n.state.focusColours = !n.state.focusColours, n.emit("focusColoursChanged", n.state.focusColours);
    },
    toggleWaveformExtendedView() {
      n.state.waveformExtendedView = !n.state.waveformExtendedView, n.emit("waveformExtendedViewChanged", n.state.waveformExtendedView);
    },
    setLayoutConfig(m) {
      m.cellWidth !== void 0 && (n.state.cellWidth = m.cellWidth), m.cellHeight !== void 0 && (n.state.cellHeight = m.cellHeight), m.columnWidths !== void 0 && (n.state.columnWidths = m.columnWidths), n.emit("layoutConfigChanged", m);
    },
    setDeviceProfile(m) {
      n.state.deviceProfile = { ...n.state.deviceProfile, ...m }, n.emit("deviceProfileChanged", n.state.deviceProfile);
    },
    setPrintPreviewActive(m) {
      n.state.isPrintPreviewActive = m, n.emit("printPreviewStateChanged", m);
    },
    setPrintOptions(m) {
      n.state.printOptions = { ...n.state.printOptions, ...m }, n.emit("printOptionsChanged", n.state.printOptions);
    },
    setAdsrTimeAxisScale(m) {
      n.state.adsrTimeAxisScale = m, n.emit("adsrTimeAxisScaleChanged", m);
    },
    setAdsrComponentWidth() {
    },
    shiftGridUp() {
    },
    shiftGridDown() {
    },
    setGridPosition() {
    },
    setKeySignature(m) {
      n.state.keySignature = m, n.emit("keySignatureChanged", m);
    },
    // ========== HARMONY ACTIONS ==========
    setActiveChordIntervals(m) {
      n.state.activeChordIntervals = m, n.emit("activeChordIntervalsChanged", m);
    },
    setIntervalsInversion(m) {
      n.state.isIntervalsInverted = m, n.emit("intervalsInversionChanged", m);
    },
    setChordPosition(m) {
      n.state.chordPositionState = m, n.emit("chordPositionChanged", m);
    },
    // ========== TIMBRE ACTIONS ==========
    setADSR(m, M) {
      n.state.timbres[m] && (n.state.timbres[m].adsr = { ...n.state.timbres[m].adsr, ...M }, n.emit("timbreChanged", m));
    },
    setHarmonicCoefficients(m, M) {
      n.state.timbres[m] && (n.state.timbres[m].coeffs = M, n.emit("timbreChanged", m));
    },
    setHarmonicPhases(m, M) {
      n.state.timbres[m] && (n.state.timbres[m].phases = M, n.emit("timbreChanged", m));
    },
    setFilterSettings(m, M) {
      n.state.timbres[m] && (n.state.timbres[m].filter = { ...n.state.timbres[m].filter, ...M }, n.emit("timbreChanged", m));
    },
    applyPreset(m, M) {
      n.state.timbres[m] && (Object.assign(n.state.timbres[m], M), n.emit("timbreChanged", m));
    },
    // ========== NOTE ACTIONS ==========
    // Extracted from note actions module
    ...ht(h),
    // ========== SIXTEENTH STAMP ACTIONS ==========
    // Extracted from sixteenth stamp actions module
    ...ft(a),
    // ========== TRIPLET STAMP ACTIONS ==========
    // Extracted from triplet stamp actions module
    ...gt(l),
    // ========== RHYTHM ACTIONS ==========
    // Extracted from rhythm actions module
    ...Nt(u)
  };
  return s && (n.on("tempoChanged", () => n.saveState()), n.on("degreeDisplayModeChanged", () => n.saveState()), n.on("longNoteStyleChanged", () => n.saveState()), n.on("playheadModeChanged", () => n.saveState())), d && s && n.saveState(), n;
}
function wt(o = {}) {
  const {
    getPlacedTonicSigns: e = () => [],
    sideColumnWidth: s = 0.25,
    beatColumnWidth: g = 1
  } = o;
  let t = null, h = null;
  function a(d) {
    const y = e(d).map((n) => `${n.columnIndex}:${n.preMacrobeatIndex}:${n.uuid || ""}`).sort().join("|");
    return {
      macrobeatGroupings: [...d.macrobeatGroupings],
      tonicSignsHash: y,
      macrobeatBoundaryStyles: [...d.macrobeatBoundaryStyles]
    };
  }
  function l(d) {
    return h ? h.tonicSignsHash === d.tonicSignsHash && JSON.stringify(h.macrobeatGroupings) === JSON.stringify(d.macrobeatGroupings) && JSON.stringify(h.macrobeatBoundaryStyles) === JSON.stringify(d.macrobeatBoundaryStyles) : !1;
  }
  function u(d) {
    const { macrobeatGroupings: p, macrobeatBoundaryStyles: y } = d, m = [...e(d)].sort((E, B) => E.preMacrobeatIndex - B.preMacrobeatIndex), M = [], P = [];
    let r = 0, C = 0, A = 0, v = 0, f = 0;
    const S = (E) => {
      var B;
      for (; f < m.length; ) {
        const O = m[f];
        if (!O || O.preMacrobeatIndex !== E) break;
        const D = O.uuid || "";
        for (let G = 0; G < 2; G++)
          M.push({
            visualIndex: r,
            canvasIndex: C,
            timeIndex: null,
            type: "tonic",
            widthMultiplier: g,
            xOffsetUnmodulated: v,
            macrobeatIndex: null,
            beatInMacrobeat: null,
            isMacrobeatStart: !1,
            isMacrobeatEnd: !1,
            isPlayable: !1,
            tonicSignUuid: G === 0 ? D : null
            // Only first column stores UUID
          }), r++, C++, v += g;
        const R = D;
        do
          f++;
        while (f < m.length && (((B = m[f]) == null ? void 0 : B.uuid) || "") === R);
      }
    };
    for (let E = 0; E < 2; E++)
      M.push({
        visualIndex: r,
        canvasIndex: null,
        timeIndex: null,
        type: "legend-left",
        widthMultiplier: s,
        xOffsetUnmodulated: v,
        macrobeatIndex: null,
        beatInMacrobeat: null,
        isMacrobeatStart: !1,
        isMacrobeatEnd: !1,
        isPlayable: !1,
        tonicSignUuid: null
      }), r++, v += s;
    S(-1), p.forEach((E, B) => {
      for (let D = 0; D < E; D++)
        M.push({
          visualIndex: r,
          canvasIndex: C,
          timeIndex: A,
          type: "beat",
          widthMultiplier: g,
          xOffsetUnmodulated: v,
          macrobeatIndex: B,
          beatInMacrobeat: D,
          isMacrobeatStart: D === 0,
          isMacrobeatEnd: D === E - 1,
          isPlayable: !0,
          tonicSignUuid: null
        }), r++, C++, A++, v += g;
      const O = y[B] || "dashed";
      P.push({
        macrobeatIndex: B,
        visualColumn: r - 1,
        canvasColumn: C - 1,
        timeColumn: A - 1,
        boundaryType: O,
        isMeasureStart: O === "solid"
      }), S(B);
    });
    for (let E = 0; E < 2; E++)
      M.push({
        visualIndex: r,
        canvasIndex: null,
        timeIndex: null,
        type: "legend-right",
        widthMultiplier: s,
        xOffsetUnmodulated: v,
        macrobeatIndex: null,
        beatInMacrobeat: null,
        isMacrobeatStart: !1,
        isMacrobeatEnd: !1,
        isPlayable: !1,
        tonicSignUuid: null
      }), r++, v += s;
    const I = /* @__PURE__ */ new Map(), T = /* @__PURE__ */ new Map(), x = /* @__PURE__ */ new Map(), b = /* @__PURE__ */ new Map(), N = /* @__PURE__ */ new Map(), F = /* @__PURE__ */ new Map();
    return M.forEach((E) => {
      I.set(E.visualIndex, E.canvasIndex), T.set(E.visualIndex, E.timeIndex), E.canvasIndex !== null && (x.set(E.canvasIndex, E.visualIndex), b.set(E.canvasIndex, E.timeIndex)), E.timeIndex !== null && (E.canvasIndex !== null && N.set(E.timeIndex, E.canvasIndex), F.set(E.timeIndex, E.visualIndex));
    }), {
      entries: M,
      visualToCanvas: I,
      visualToTime: T,
      canvasToVisual: x,
      canvasToTime: b,
      timeToCanvas: N,
      timeToVisual: F,
      macrobeatBoundaries: P,
      totalVisualColumns: r,
      totalCanvasColumns: C,
      totalTimeColumns: A,
      totalWidthUnmodulated: v
    };
  }
  function c(d) {
    const p = a(d);
    return t && l(p) || (t = u(d), h = p), t;
  }
  function i() {
    t = null, h = null;
  }
  return {
    getColumnMap: c,
    invalidate: i,
    buildColumnMap: u
  };
}
function un(o, e) {
  return e.visualToCanvas.get(o) ?? null;
}
function Mt(o, e) {
  return e.visualToTime.get(o) ?? null;
}
function hn(o, e) {
  const s = e.canvasToVisual.get(o);
  return s !== void 0 ? s : o + 2;
}
function mn(o, e) {
  return e.canvasToTime.get(o) ?? null;
}
function fn(o, e) {
  const s = e.timeToCanvas.get(o);
  return s !== void 0 ? s : o;
}
function xt(o, e) {
  const s = e.timeToVisual.get(o);
  return s !== void 0 ? s : o + 2;
}
function Pt(o, e) {
  if (o == null) return 0;
  let s = 0;
  for (let g = 0; g <= o && g < e.length; g++) {
    const t = e[g];
    typeof t == "number" && (s += t);
  }
  return s;
}
function pn(o, e) {
  return e.entries[o] || null;
}
function Xe(o, e) {
  const s = e.canvasToVisual.get(o);
  return s !== void 0 && e.entries[s] || null;
}
function gn(o, e) {
  const s = Xe(o, e);
  return (s == null ? void 0 : s.isPlayable) ?? !1;
}
function Sn(o, e) {
  const s = Xe(o, e);
  return (s == null ? void 0 : s.type) ?? null;
}
function yn(o, e) {
  return e.macrobeatBoundaries.find((s) => s.macrobeatIndex === o) || null;
}
function Cn(o) {
  const e = [];
  for (const s of o.entries)
    s.canvasIndex !== null && (e[s.canvasIndex] = s.widthMultiplier);
  return e;
}
function An(o) {
  let e = 0;
  for (const s of o.entries)
    s.canvasIndex !== null && (e += s.widthMultiplier);
  return e;
}
function Tn() {
  let o = !1, e = null, s = null, g = null, t = null, h = !1;
  const a = (c, i, d, p, y) => {
    if (!h && c === "debug") return;
    const n = `[engine:${i}]`;
    console[c](n, d, p || "");
  }, l = (c, i, d) => {
    a(c, "controller", i, d);
  };
  return {
    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    init(c) {
      if (o) {
        a("warn", "controller", "Engine already initialized");
        return;
      }
      h = c.debug || !1, a("info", "controller", "Initializing engine"), g = c.pitchGridContext || null, t = c.drumGridContext || null, s = wt({
        getPlacedTonicSigns: (d) => {
          if (!e) return [];
          const p = [];
          for (const y of Object.values(d.tonicSignGroups || {}))
            p.push(...y);
          return p;
        }
      });
      let i = c.storage;
      !i && typeof window < "u" && window.localStorage && (i = window.localStorage), e = It({
        storageKey: c.storageKey || "studentNotationState",
        storage: i,
        initialState: c.initialState,
        noteActionCallbacks: {
          log: l
        },
        rhythmActionCallbacks: {
          getColumnMap: (d) => s.getColumnMap(d),
          visualToTimeIndex: (d, p, y) => Mt(p, s.getColumnMap(d)),
          timeIndexToVisualColumn: (d, p, y) => xt(p, s.getColumnMap(d)),
          getTimeBoundaryAfterMacrobeat: (d, p, y) => Pt(p, y),
          log: l
        },
        sixteenthStampActionCallbacks: {
          log: l
        },
        tripletStampActionCallbacks: {
          canvasToTime: (d, p) => p.canvasToTime.get(d) ?? null,
          timeToCanvas: (d, p) => p.timeToCanvas.get(d) ?? 0,
          getColumnMap: (d) => s.getColumnMap(d),
          log: l
        }
      }), e.on("rhythmStructureChanged", () => {
        s == null || s.invalidate();
      }), e.on("notesChanged", () => {
        this.renderPitchGrid();
      }), e.on("sixteenthStampPlacementsChanged", () => {
        this.renderDrumGrid();
      }), e.on("tripletStampPlacementsChanged", () => {
        this.renderDrumGrid();
      }), o = !0, a("info", "controller", "Engine initialized successfully"), (g || t) && this.render();
    },
    dispose() {
      o && (a("info", "controller", "Disposing engine"), e && (e.dispose(), e = null), s = null, g = null, t = null, o = !1);
    },
    isInitialized() {
      return o;
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
      const i = e.state.selectedNote.color;
      e.setSelectedNote(c, i);
    },
    setNoteColor(c) {
      if (!e) return;
      const i = e.state.selectedNote.shape;
      e.setSelectedNote(i, c);
    },
    // ============================================================================
    // NOTE MANIPULATION
    // ============================================================================
    insertNote(c, i, d) {
      if (!e) return null;
      const p = {
        row: c,
        startColumnIndex: i,
        endColumnIndex: d ?? i,
        shape: e.state.selectedNote.shape,
        color: e.state.selectedNote.color
      };
      return e.addNote(p);
    },
    deleteNote(c) {
      if (!e) return !1;
      const i = e.state.placedNotes.find((d) => d.uuid === c);
      return i ? (e.removeNote(i), !0) : !1;
    },
    deleteSelection() {
      if (!e) return;
      const c = e.state.lassoSelection;
      if (!c.isActive || c.selectedItems.length === 0) return;
      const i = c.selectedItems.filter((d) => d.type === "note").map((d) => e.state.placedNotes.find((p) => p.uuid === d.id)).filter((d) => d !== void 0);
      i.length > 0 && e.removeMultipleNotes(i), this.clearSelection();
    },
    moveNote(c, i, d) {
      if (!e) return;
      const p = e.state.placedNotes.find((y) => y.uuid === c);
      p && (e.updateNoteRow(p, i), e.updateNotePosition(p, d));
    },
    setNoteTail(c, i) {
      if (!e) return;
      const d = e.state.placedNotes.find((p) => p.uuid === c);
      d && e.updateNoteTail(d, i);
    },
    clearAllNotes() {
      e && e.clearAllNotes();
    },
    // ============================================================================
    // SELECTION
    // ============================================================================
    setSelection(c) {
      if (!e) return;
      const i = c.map((d) => {
        if (d.type === "note") {
          const p = e.state.placedNotes.find((y) => y.uuid === d.id);
          return p ? { type: "note", id: d.id, data: p } : null;
        } else if (d.type === "sixteenthStamp") {
          const p = e.state.sixteenthStampPlacements.find((y) => y.id === d.id);
          return p ? { type: "sixteenthStamp", id: d.id, data: p } : null;
        } else if (d.type === "tripletStamp") {
          const p = e.state.tripletStampPlacements.find((y) => y.id === d.id);
          return p ? { type: "tripletStamp", id: d.id, data: p } : null;
        }
        return null;
      }).filter((d) => d !== null);
      e.state.lassoSelection = {
        isActive: i.length > 0,
        selectedItems: i,
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
      const c = e.state.placedNotes.map((i) => ({
        type: "note",
        id: i.uuid,
        data: i
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
      e && (e.setPlaybackState(!0, !1), a("info", "playback", "Play started"));
    },
    pause() {
      e && (e.setPlaybackState(!0, !0), a("info", "playback", "Paused"));
    },
    resume() {
      e && (e.setPlaybackState(!0, !1), a("info", "playback", "Resumed"));
    },
    stop() {
      e && (e.setPlaybackState(!1, !1), a("info", "playback", "Stopped"));
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
    setMacrobeatGrouping(c, i) {
      if (!e) return;
      e.state.macrobeatGroupings[c] !== i && e.toggleMacrobeatGrouping(c);
    },
    toggleAnacrusis() {
      e && e.setAnacrusis(!e.state.hasAnacrusis);
    },
    addModulationMarker(c, i) {
      return e ? e.addModulationMarker(c, i) : null;
    },
    removeModulationMarker(c) {
      e && e.removeModulationMarker(c);
    },
    // ============================================================================
    // VIEW
    // ============================================================================
    setPitchRange(c, i) {
      e && e.setPitchRange({ topIndex: c, bottomIndex: i });
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
    setTimbreADSR(c, i) {
      e && e.setADSR(c, i);
    },
    setTimbreHarmonics(c, i) {
      e && e.setHarmonicCoefficients(c, new Float32Array(i));
    },
    setTimbreFilter(c, i) {
      e && e.setFilterSettings(c, i);
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
    getNoteAt(c, i) {
      return e && e.state.placedNotes.find(
        (d) => d.row === c && d.startColumnIndex <= i && d.endColumnIndex >= i
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
      const c = "uuid,row,startColumn,endColumn,color,shape", i = e.state.placedNotes.map(
        (d) => `${d.uuid},${d.row},${d.startColumnIndex},${d.endColumnIndex},${d.color},${d.shape}`
      );
      return [c, ...i].join(`
`);
    },
    importCSV(c) {
      if (!e) return;
      const i = c.split(`
`).filter((y) => y.trim());
      if (i.length === 0) return;
      const p = i.slice(1).map((y) => {
        const [n, m, M, P, r, C] = y.split(",");
        return {
          uuid: n,
          row: parseInt(m || "0", 10),
          startColumnIndex: parseInt(M || "0", 10),
          endColumnIndex: parseInt(P || "0", 10),
          color: r || "blue",
          shape: C || "circle"
        };
      });
      e.loadNotes(p);
    },
    exportState() {
      return e ? JSON.stringify(e.state, null, 2) : "{}";
    },
    importState(c) {
      if (e)
        try {
          const i = JSON.parse(c);
          Object.assign(e.state, i), e.emit("stateImported", i), this.render();
        } catch (i) {
          a("error", "import", "Failed to import state", i);
        }
    },
    // ============================================================================
    // EVENTS
    // ============================================================================
    on(c, i) {
      e && e.on(c, i);
    },
    off(c, i) {
      e && e.off(c, i);
    },
    // ============================================================================
    // RENDERING
    // ============================================================================
    render() {
      this.renderPitchGrid(), this.renderDrumGrid();
    },
    renderPitchGrid() {
      !g || !e || !s || a("debug", "controller", "renderPitchGrid called - canvas rendering not yet wired");
    },
    renderDrumGrid() {
      !t || !e || !s || a("debug", "controller", "renderDrumGrid called - canvas rendering not yet wired");
    }
  };
}
function Nn(o) {
  throw new Error("Not yet implemented - will be in @mlt/tutorial-runtime package");
}
let te = null;
function bn(o) {
  te = o;
}
class Et extends w.Synth {
  constructor(s) {
    super(s);
    // Audio effect nodes
    L(this, "presetGain");
    L(this, "vibratoLFO");
    L(this, "vibratoDepth");
    L(this, "vibratoGain");
    L(this, "tremoloLFO");
    L(this, "tremoloDepth");
    L(this, "tremoloGain");
    // Filter nodes
    L(this, "hpFilter");
    L(this, "lpFilterForBP");
    L(this, "lpFilterSolo");
    // Output nodes
    L(this, "hpOutput");
    L(this, "bpOutput");
    L(this, "lpOutput");
    // Crossfade nodes
    L(this, "hp_bp_fade");
    L(this, "main_fade");
    L(this, "wetDryFade");
    this.presetGain = new w.Gain(s.gain || 1), this.vibratoLFO = new w.LFO(0, 0), this.vibratoDepth = new w.Scale(-1, 1), this.vibratoGain = new w.Gain(0), this.vibratoLFO.connect(this.vibratoDepth), this.vibratoDepth.connect(this.vibratoGain), this.vibratoGain.connect(this.oscillator.frequency), this.tremoloLFO = new w.LFO(0, 0), this.tremoloDepth = new w.Scale(0, 1), this.tremoloGain = new w.Gain(1), this.tremoloLFO.connect(this.tremoloDepth), this.tremoloDepth.connect(this.tremoloGain.gain), this.hpFilter = new w.Filter({ type: "highpass" }), this.lpFilterForBP = new w.Filter({ type: "lowpass" }), this.lpFilterSolo = new w.Filter({ type: "lowpass" }), this.hpOutput = new w.Gain(), this.bpOutput = new w.Gain(), this.lpOutput = new w.Gain(), this.hp_bp_fade = new w.CrossFade(0), this.main_fade = new w.CrossFade(0), this.wetDryFade = new w.CrossFade(0), this.oscillator.connect(this.presetGain), this.presetGain.connect(this.wetDryFade.a), this.presetGain.connect(this.hpFilter), this.hpFilter.connect(this.hpOutput), this.hpFilter.connect(this.lpFilterForBP), this.lpFilterForBP.connect(this.bpOutput), this.presetGain.connect(this.lpFilterSolo), this.lpFilterSolo.connect(this.lpOutput), this.hpOutput.connect(this.hp_bp_fade.a), this.bpOutput.connect(this.hp_bp_fade.b), this.lpOutput.connect(this.main_fade.b), this.hp_bp_fade.connect(this.main_fade.a), this.main_fade.connect(this.wetDryFade.b), this.wetDryFade.connect(this.tremoloGain), this.tremoloGain.connect(this.envelope), s.filter && this._setFilter(s.filter), s.vibrato ? this._setVibrato(s.vibrato) : this._setVibrato({ speed: 0, span: 0 }), s.tremelo ? this._setTremolo(s.tremelo) : this._setTremolo({ speed: 0, span: 0 });
  }
  _setPresetGain(s) {
    this.presetGain && (this.presetGain.gain.value = s);
  }
  _setVibrato(s, g = w.now()) {
    var y, n;
    if (!this.vibratoLFO || !this.vibratoGain) return;
    const t = s.speed / 100 * 16, a = (((n = (y = w.getContext()) == null ? void 0 : y.rawContext) == null ? void 0 : n.state) ?? w.context.state) === "running";
    if (s.speed === 0 || s.span === 0) {
      a && this.vibratoLFO.state === "started" && this.vibratoLFO.stop(g), this.vibratoLFO.frequency.value = 0, this.vibratoGain.gain.value = 0;
      return;
    }
    a && this.vibratoLFO.state !== "started" && this.vibratoLFO.start(g), this.vibratoLFO.frequency.value = t;
    const u = s.span / 100 * 50, c = u / 1200, p = 440 * (Math.pow(2, c) - 1);
    this.vibratoGain.gain.value = p, te == null || te.debug("FilteredVoice", "Vibrato gain set", { hzDeviation: p, centsAmplitude: u }, "audio");
  }
  _setTremolo(s, g = w.now()) {
    var i, d;
    if (!this.tremoloLFO || !this.tremoloGain) return;
    const t = s.speed / 100 * 16, a = (((d = (i = w.getContext()) == null ? void 0 : i.rawContext) == null ? void 0 : d.state) ?? w.context.state) === "running";
    if (s.speed === 0 || s.span === 0) {
      a && this.tremoloLFO.state === "started" && this.tremoloLFO.stop(g), this.tremoloLFO.frequency.value = 0, this.tremoloGain.gain.cancelScheduledValues(g), this.tremoloGain.gain.value = 1;
      return;
    }
    a && this.tremoloLFO.state !== "started" && this.tremoloLFO.start(g), this.tremoloLFO.frequency.value = t;
    const l = s.span / 100, u = Math.max(0, 1 - l), c = 1;
    this.tremoloDepth.min = u, this.tremoloDepth.max = c;
  }
  _setFilter(s) {
    this.wetDryFade.fade.value = s.enabled ? 1 : 0;
    const g = w.Midi(s.cutoff + 35).toFrequency(), t = s.resonance / 100 * 12 + 0.1;
    this.hpFilter.set({ frequency: g, Q: t }), this.lpFilterForBP.set({ frequency: g, Q: t }), this.lpFilterSolo.set({ frequency: g, Q: t });
    const h = s.blend;
    h <= 1 ? (this.main_fade.fade.value = 0, this.hp_bp_fade.fade.value = h) : (this.main_fade.fade.value = h - 1, this.hp_bp_fade.fade.value = 1);
  }
}
const ze = {
  polyphonyReference: 32,
  smoothingTauMs: 200,
  masterGainRampMs: 50,
  gainUpdateIntervalMs: 16
};
function je(o = ze.polyphonyReference) {
  return 1 / Math.sqrt(o);
}
class Ot {
  constructor(e, s = {}) {
    L(this, "masterGain");
    L(this, "options");
    L(this, "perVoiceBaselineGain");
    L(this, "activeVoiceCount", 0);
    L(this, "smoothedVoiceCount");
    L(this, "gainUpdateLoopId", null);
    this.masterGain = e, this.options = { ...ze, ...s }, this.perVoiceBaselineGain = je(this.options.polyphonyReference), this.smoothedVoiceCount = this.options.polyphonyReference;
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
    const { polyphonyReference: e, smoothingTauMs: s, masterGainRampMs: g, gainUpdateIntervalMs: t } = this.options, h = w.now();
    if (this.activeVoiceCount === 0) {
      this.smoothedVoiceCount = 0.01 * e + (1 - 0.01) * this.smoothedVoiceCount;
      return;
    }
    const a = t / 1e3, l = 1 - Math.exp(-a / (s / 1e3)), u = Math.max(1, this.activeVoiceCount);
    this.smoothedVoiceCount = l * u + (1 - l) * this.smoothedVoiceCount;
    const c = Math.sqrt(e / this.smoothedVoiceCount), i = this.perVoiceBaselineGain * c;
    this.masterGain.gain.rampTo(i, g / 1e3, h);
  }
}
const Dt = {
  clippingWarningThresholdDb: -3,
  clippingMonitorIntervalMs: 500,
  clippingWarningCooldownMs: 2e3
};
class Ft {
  constructor(e, s = {}) {
    L(this, "meter");
    L(this, "options");
    L(this, "clippingMonitorId", null);
    L(this, "lastClippingWarningAt", 0);
    this.meter = e, this.options = { ...Dt, ...s };
  }
  start() {
    this.stop(), this.lastClippingWarningAt = 0, this.clippingMonitorId = setInterval(() => {
      var t, h;
      const e = this.meter.getValue(), s = Array.isArray(e) ? e[0] : e;
      if (s === void 0 || s <= this.options.clippingWarningThresholdDb)
        return;
      const g = Date.now();
      g - this.lastClippingWarningAt < this.options.clippingWarningCooldownMs || (this.lastClippingWarningAt = g, (h = (t = this.options).onWarning) == null || h.call(t, s));
    }, this.options.clippingMonitorIntervalMs);
  }
  stop() {
    this.clippingMonitorId !== null && (clearInterval(this.clippingMonitorId), this.clippingMonitorId = null);
  }
}
function vn(o) {
  const {
    timbres: e,
    masterVolume: s = 0,
    effectsManager: g,
    harmonicFilter: t,
    logger: h,
    audioInit: a,
    getDrumVolume: l
  } = o, u = {};
  let c = null, i = null, d = null, p = null, y = null, n = {}, m = null, M = null;
  const P = { ...e }, r = h ?? {
    debug: () => {
    },
    info: () => {
    },
    warn: () => {
    }
  };
  function C(f) {
    if (t)
      return t.getFilteredCoefficients(f);
    const S = P[f];
    return S != null && S.coeffs ? S.coeffs : new Float32Array([0, 1]);
  }
  function A(f) {
    const S = f.reduce((I, T) => I + Math.abs(T), 0);
    return S > 1 ? Array.from(f).map((I) => I / S) : Array.from(f);
  }
  const v = {
    init() {
      this.stopBackgroundMonitors(), c = new w.Gain(je()), m = new Ot(c), m.start(), i = new w.Volume(s), d = new w.Compressor({
        threshold: -12,
        ratio: 3,
        attack: 0.01,
        release: 0.1,
        knee: 6
      }), p = new w.Limiter(-3), y = new w.Meter(), c.connect(i), i.connect(d), d.connect(p), p.toDestination(), p.connect(y), y && (M = new Ft(y, {
        onWarning: (f) => {
          r.warn("SynthEngine", "Limiter input approaching clipping threshold", { level: f }, "audio");
        }
      }), M.start());
      for (const f in P) {
        const S = P[f];
        if (!S) continue;
        S.vibrato || (S.vibrato = { speed: 0, span: 0 }), S.tremelo || (S.tremelo = { speed: 0, span: 0 });
        const I = C(f), T = A(I), x = S.gain || 1, b = new w.PolySynth({
          voice: Et,
          options: {
            oscillator: { type: "custom", partials: T },
            envelope: S.adsr,
            filter: S.filter,
            vibrato: S.vibrato,
            tremelo: S.tremelo,
            gain: x
          }
        }).connect(c);
        g && c && g.applySynthEffects(b, f, c);
        const N = b.triggerAttack.bind(b);
        b.triggerAttack = function(...F) {
          const E = N(...F);
          return setTimeout(() => {
            const B = this._activeVoices;
            g ? B && B.size > 0 ? B.forEach((O) => {
              O.effectsApplied || (g.applyEffectsToVoice(O, f), O.effectsApplied = !0);
            }) : this._voices && Array.isArray(this._voices) && this._voices.forEach((O) => {
              O && !O.effectsApplied && (g.applyEffectsToVoice(O, f), O.effectsApplied = !0);
            }) : B && B.size > 0 ? B.forEach((O) => {
              O._setVibrato && O.vibratoApplied !== !0 && (O._setVibrato(this._currentVibrato), O.vibratoApplied = !0), O._setTremolo && O.tremoloApplied !== !0 && (O._setTremolo(this._currentTremolo), O.tremoloApplied = !0);
            }) : this._voices && Array.isArray(this._voices) && this._voices.forEach((O) => {
              O != null && O._setVibrato && O.vibratoApplied !== !0 && (O._setVibrato(this._currentVibrato), O.vibratoApplied = !0), O != null && O._setTremolo && O.tremoloApplied !== !0 && (O._setTremolo(this._currentTremolo), O.tremoloApplied = !0);
            });
          }, 10), E;
        }, b._currentVibrato = S.vibrato, b._currentTremolo = S.tremelo, b._currentFilter = S.filter, u[f] = b, r.debug("SynthEngine", `Created filtered synth for color: ${f}`, null, "audio");
      }
      r.info("SynthEngine", "Initialized with multi-timbral support", null, "audio");
    },
    updateSynthForColor(f) {
      const S = P[f], I = u[f];
      if (!I || !S) return;
      S.vibrato || (S.vibrato = { speed: 0, span: 0 }), S.tremelo || (S.tremelo = { speed: 0, span: 0 }), r.debug("SynthEngine", `Updating timbre for color ${f}`, null, "audio");
      const T = C(f), x = A(T);
      I.set({
        oscillator: { partials: x },
        envelope: S.adsr
      }), g && c && g.applySynthEffects(I, f, c), I._currentVibrato = S.vibrato, I._currentTremolo = S.tremelo, I._currentFilter = S.filter;
      const b = I._activeVoices;
      b && b.size > 0 ? b.forEach((N) => {
        if (N._setFilter && N._setFilter(S.filter), N._setVibrato && (N._setVibrato(S.vibrato), N.vibratoApplied = !0), N._setTremolo && (N._setTremolo(S.tremelo), N.tremoloApplied = !0), N._setPresetGain) {
          const F = S.gain || 1;
          N._setPresetGain(F);
        }
      }) : I._voices && Array.isArray(I._voices) && I._voices.forEach((N) => {
        if (N != null && N._setVibrato && (N._setVibrato(S.vibrato), N.vibratoApplied = !0), N != null && N._setTremolo && (N._setTremolo(S.tremelo), N.tremoloApplied = !0), N != null && N._setFilter && N._setFilter(S.filter), N != null && N._setPresetGain) {
          const F = S.gain || 1;
          N._setPresetGain(F);
        }
      });
    },
    setBpm(f) {
      var S;
      try {
        (S = w == null ? void 0 : w.Transport) != null && S.bpm && (w.Transport.bpm.value = f, r.debug("SynthEngine", `Tone.Transport BPM updated to ${f}`, null, "audio"));
      } catch (I) {
        r.warn("SynthEngine", "Unable to update BPM on Tone.Transport", { tempo: f, error: I }, "audio");
      }
    },
    setVolume(f) {
      i && (i.volume.value = f);
    },
    async playNote(f, S, I = w.now()) {
      await (a || (() => w.start()))();
      const x = Object.keys(u);
      if (x.length === 0) return;
      const b = u[x[0]];
      b && b.triggerAttackRelease(f, S, I);
    },
    /**
     * Trigger note attack. Used by Transport scheduling with explicit time parameter.
     * For interactive (user-initiated) triggers, use triggerAttackInteractive instead.
     */
    triggerAttack(f, S, I = w.now(), T = !1) {
      const x = u[S];
      if (x)
        if (m == null || m.noteOn(1), T && l) {
          const b = l(), N = x.volume.value, F = N + 20 * Math.log10(b);
          x.volume.value = F, x.triggerAttack(f, I), setTimeout(() => {
            x != null && x.volume && (x.volume.value = N);
          }, 100);
        } else
          x.triggerAttack(f, I);
    },
    /**
     * Trigger note attack for interactive (user-initiated) events.
     * Adds a small scheduling offset (20ms) to help the audio thread process
     * the event without pops or clicks.
     *
     * Use this for mouse clicks, keyboard presses, or other immediate UI triggers.
     */
    triggerAttackInteractive(f, S) {
      v.triggerAttack(f, S, w.now() + 0.02);
    },
    quickReleasePitches(f, S) {
      var x, b, N;
      const I = u[S];
      if (!I || !f || f.length === 0) return;
      let T;
      try {
        const F = typeof I.get == "function" ? I.get() : null, E = (x = F == null ? void 0 : F.envelope) == null ? void 0 : x.release;
        T = typeof E == "number" ? E : void 0, I.set({ envelope: { release: 0.01 } }), f.forEach((O) => {
          I.triggerRelease(O, w.now());
        });
        const B = ((b = I._activeVoices) == null ? void 0 : b.size) ?? ((N = I._voices) == null ? void 0 : N.length) ?? (m == null ? void 0 : m.getActiveVoiceCount()) ?? 0;
        m == null || m.clampActiveVoiceCountToAtMost(B);
      } catch (F) {
        r.warn("SynthEngine", "quickReleasePitches failed", { err: F, color: S, pitches: f }, "audio");
      } finally {
        if (T !== void 0)
          try {
            I.set({ envelope: { release: T } });
          } catch {
          }
      }
    },
    triggerRelease(f, S, I = w.now()) {
      var b, N;
      const T = u[S];
      if (!T) return;
      T.triggerRelease(f, I), m == null || m.noteOff(1);
      const x = ((b = T._activeVoices) == null ? void 0 : b.size) ?? ((N = T._voices) == null ? void 0 : N.length) ?? (m == null ? void 0 : m.getActiveVoiceCount()) ?? 0;
      m == null || m.clampActiveVoiceCountToAtMost(x);
    },
    releaseAll() {
      var f;
      for (const S in u)
        (f = u[S]) == null || f.releaseAll();
      m == null || m.resetActiveVoiceCount();
    },
    // === Waveform Visualization ===
    createWaveformAnalyzer(f) {
      const S = u[f];
      return S ? (n[f] || (n[f] = new w.Analyser("waveform", 1024), S.connect(n[f]), r.debug("SynthEngine", `Created waveform analyzer for color: ${f}`, null, "waveform")), n[f]) : (r.warn("SynthEngine", `No synth found for color: ${f}`, null, "audio"), null);
    },
    getWaveformAnalyzer(f) {
      return n[f] || null;
    },
    getAllWaveformAnalyzers() {
      const f = /* @__PURE__ */ new Map();
      for (const S in n)
        n[S] && f.set(S, n[S]);
      return f;
    },
    removeWaveformAnalyzer(f) {
      n[f] && (n[f].dispose(), delete n[f], r.debug("SynthEngine", `Removed waveform analyzer for color: ${f}`, null, "waveform"));
    },
    disposeAllWaveformAnalyzers() {
      for (const f in n)
        n[f] && n[f].dispose();
      n = {}, r.debug("SynthEngine", "Disposed all waveform analyzers", null, "waveform");
    },
    // === Node Access ===
    getSynth(f) {
      return u[f] || null;
    },
    getAllSynths() {
      return { ...u };
    },
    getMainVolumeNode() {
      return i || null;
    },
    getMasterGainNode() {
      return c || null;
    },
    // === Cleanup ===
    stopBackgroundMonitors() {
      M == null || M.stop(), m == null || m.stop();
    },
    dispose() {
      var f;
      this.stopBackgroundMonitors(), this.disposeAllWaveformAnalyzers();
      for (const S in u)
        (f = u[S]) == null || f.dispose();
      c == null || c.dispose(), i == null || i.dispose(), d == null || d.dispose(), p == null || p.dispose(), y == null || y.dispose(), r.debug("SynthEngine", "Disposed SynthEngine", null, "audio");
    }
  };
  return v;
}
const qe = 1e-4;
function Bt(o) {
  const {
    getMacrobeatInfo: e,
    getPlacedTonicSigns: s,
    getTonicSpanColumnIndices: g,
    updatePlayheadModel: t,
    logger: h
  } = o;
  let a = [], l = 0, u = 0, c = 0;
  const i = h ?? {
    debug: () => {
    }
  };
  function d(n) {
    return 60 / (n * 2);
  }
  function p(n, m, M) {
    let P = 0;
    i.debug("TimeMapCalculator", "[TIMEMAP] Building timeMap", {
      columnCount: m.length,
      tonicSignCount: M.length,
      microbeatDuration: n
    });
    const r = m.length, C = g(M);
    for (let A = 0; A < r; A++) {
      a[A] = P;
      const v = C.has(A);
      if (v ? i.debug("TimeMapCalculator", `[TIMEMAP] Column ${A} is tonic, not advancing time`) : P += (m[A] || 0) * n, A < 5) {
        const f = a[A];
        f !== void 0 && i.debug("TimeMapCalculator", `[TIMEMAP] timeMap[${A}] = ${f.toFixed(3)}s (isTonic: ${v})`);
      }
    }
    r > 0 && (a[r] = P), i.debug("TimeMapCalculator", `[TIMEMAP] Complete. Total columns: ${r}, Final time: ${P.toFixed(3)}s`);
  }
  function y(n) {
    var C;
    const m = a.length > 0 ? a[a.length - 1] ?? 0 : 0;
    if (!Number.isFinite(m) || m === 0) {
      l = 0;
      return;
    }
    const M = ((C = n.modulationMarkers) == null ? void 0 : C.filter((A) => A.active)) || [];
    if (M.length === 0) {
      l = m;
      return;
    }
    const P = [...M].sort((A, v) => A.measureIndex - v.measureIndex);
    let r = m;
    for (const A of P) {
      const v = e(A.measureIndex);
      if (v) {
        const f = v.endColumn - 1, S = a[f] ?? m, I = m - S, T = I * A.ratio;
        r = r - I + T;
      }
    }
    l = r;
  }
  return {
    getMicrobeatDuration: d,
    calculate(n) {
      var C, A;
      i.debug("TimeMapCalculator", "calculate", { tempo: `${n.tempo} BPM` }), a = [];
      const m = d(n.tempo), { columnWidths: M } = n, P = s();
      p(m, M, P), (A = i.timing) == null || A.call(i, "TimeMapCalculator", "calculate", { totalDuration: `${(C = a[a.length - 1]) == null ? void 0 : C.toFixed(2)}s` }), y(n);
      const r = l;
      t == null || t({
        timeMap: a,
        musicalEndTime: r,
        columnWidths: n.columnWidths,
        cellWidth: n.cellWidth
      });
    },
    getTimeMap() {
      return a;
    },
    getMusicalEndTime() {
      return l;
    },
    findNonAnacrusisStart(n) {
      if (!n.hasAnacrusis)
        return i.debug("TimeMapCalculator", "[ANACRUSIS] No anacrusis, starting from time 0"), 0;
      for (let m = 0; m < n.macrobeatBoundaryStyles.length; m++)
        if (n.macrobeatBoundaryStyles[m] === "solid") {
          const M = e(m + 1);
          if (M) {
            const P = a[M.startColumn] || 0;
            return i.debug("TimeMapCalculator", `[ANACRUSIS] Found solid boundary at macrobeat ${m}, non-anacrusis starts at column ${M.startColumn}, time ${P.toFixed(3)}s`), P;
          }
        }
      return i.debug("TimeMapCalculator", "[ANACRUSIS] No solid boundary found, starting from time 0"), 0;
    },
    applyModulationToTime(n, m, M) {
      var A;
      const P = ((A = M.modulationMarkers) == null ? void 0 : A.filter((v) => v.active)) || [];
      if (P.length === 0)
        return n;
      const r = [...P].sort((v, f) => v.measureIndex - f.measureIndex);
      let C = n;
      m < 5 && i.debug("TimeMapCalculator", `[MODULATION] Column ${m}: baseTime ${n.toFixed(3)}s, ${r.length} active markers`);
      for (const v of r) {
        const f = e(v.measureIndex);
        if (f) {
          const S = f.endColumn;
          if (m > S) {
            const I = a[S] !== void 0 ? a[S] : 0, T = n - I, x = T * v.ratio;
            C = C - T + x, m < 5 && i.debug("TimeMapCalculator", `[MODULATION] Column ${m}: Applied marker at measure ${v.measureIndex} (col ${S}), ratio ${v.ratio}, adjustedTime ${C.toFixed(3)}s`);
          }
        }
      }
      return C;
    },
    setLoopBounds(n, m, M) {
      const P = d(M), r = Math.max(P, 1e-3), C = Number.isFinite(n) ? n : 0;
      let A = Number.isFinite(m) ? m : C + r;
      A <= C && (A = C + r), u = C, c = A, w != null && w.Transport && (w.Transport.loopStart = C, w.Transport.loopEnd = A);
    },
    getConfiguredLoopBounds() {
      return { loopStart: u, loopEnd: c };
    },
    setConfiguredLoopBounds(n, m) {
      u = n, c = m;
    },
    clearConfiguredLoopBounds() {
      u = 0, c = 0;
    },
    reapplyConfiguredLoopBounds(n) {
      if (c > u) {
        const m = w.Time(w.Transport.loopStart).toSeconds(), M = w.Time(w.Transport.loopEnd).toSeconds(), P = Math.abs(m - u), r = Math.abs(M - c);
        (P > qe || r > qe) && (w.Transport.loopStart = u, w.Transport.loopEnd = c), w.Transport.loop !== n && (w.Transport.loop = n);
      }
    },
    updateLoopBoundsFromTimeline(n) {
      const m = this.findNonAnacrusisStart(n), M = l;
      this.setLoopBounds(m, M, n.tempo);
    }
  };
}
const Rt = {
  H: "https://tonejs.github.io/audio/drum-samples/CR78/hihat.mp3",
  M: "https://tonejs.github.io/audio/drum-samples/CR78/snare.mp3",
  L: "https://tonejs.github.io/audio/drum-samples/CR78/kick.mp3"
}, Gt = 1e-4;
function Lt(o = {}) {
  var u;
  const {
    samples: e = Rt,
    synthEngine: s,
    initialVolume: g = 0
  } = o;
  let t = null, h = null;
  const a = /* @__PURE__ */ new Map();
  function l(c, i) {
    let d = Number.isFinite(i) ? i : w.now();
    const p = a.get(c) ?? -1 / 0;
    return d > p || (d = p + Gt), a.set(c, d), d;
  }
  if (h = new w.Volume(g), t = new w.Players(e).connect(h), s) {
    const c = (u = s.getMainVolumeNode) == null ? void 0 : u.call(s);
    c ? h.connect(c) : h.toDestination();
  } else
    h.toDestination();
  return {
    getPlayers() {
      return t;
    },
    getVolumeNode() {
      return h;
    },
    trigger(c, i) {
      var p;
      if (!t) return;
      const d = l(c, i);
      (p = t.player(c)) == null || p.start(d);
    },
    reset() {
      a.clear();
    },
    dispose() {
      t == null || t.dispose(), h == null || h.dispose(), t = null, h = null, a.clear();
    }
  };
}
const We = "♭", Ue = "♯";
function In(o) {
  const {
    synthEngine: e,
    stateCallbacks: s,
    eventCallbacks: g,
    visualCallbacks: t,
    logger: h,
    audioInit: a
  } = o, l = h ?? {
    debug: () => {
    },
    info: () => {
    },
    warn: () => {
    }
  };
  let u = null, c = !1, i = null, d = null, p = 1;
  const y = [];
  function n(T, x) {
    const b = x.fullRowData[T];
    return b ? b.toneNote.replace(We, "b").replace(Ue, "#") : "C4";
  }
  function m(T, x) {
    const b = T.globalRow ?? T.row, N = x.fullRowData[b];
    return N ? N.toneNote.replace(We, "b").replace(Ue, "#") : "C4";
  }
  function M() {
    var B, O, D;
    if (!i) return;
    const T = s.getState();
    l.debug("TransportService", "scheduleNotes", "Clearing previous transport events and rescheduling all notes"), w.Transport.cancel(), d == null || d.reset(), i.calculate(T), (B = t == null ? void 0 : t.clearAdsrVisuals) == null || B.call(t);
    const x = i.getTimeMap(), { loopEnd: b } = i.getConfiguredLoopBounds(), N = i.findNonAnacrusisStart(T);
    l.debug("TransportService", `[ANACRUSIS] hasAnacrusis: ${T.hasAnacrusis}, anacrusisOffset: ${N.toFixed(3)}s`), T.placedNotes.forEach((R, G) => {
      const _ = R.startColumnIndex, V = R.endColumnIndex, U = x[_];
      if (U === void 0) {
        l.warn("TransportService", `[NOTE SCHEDULE] Note ${G}: timeMap[${_}] undefined, skipping`);
        return;
      }
      const $ = i.applyModulationToTime(U, _, T), q = x[V + 1];
      if (q === void 0) {
        l.warn("TransportService", `Skipping note with invalid endColumnIndex: ${R.endColumnIndex + 1}`);
        return;
      }
      const X = i.applyModulationToTime(q, V + 1, T) - $;
      R.isDrum ? P(R, $) : r(R, $, X, b, T);
    });
    const F = ((O = s.getStampPlaybackData) == null ? void 0 : O.call(s)) ?? [];
    F.forEach((R) => {
      C(R, x, T);
    });
    const E = ((D = s.getTripletPlaybackData) == null ? void 0 : D.call(s)) ?? [];
    E.forEach((R) => {
      A(R, x, T);
    }), l.debug("TransportService", "scheduleNotes", `Finished scheduling ${T.placedNotes.length} notes, ${F.length} stamps, and ${E.length} triplets`);
  }
  function P(T, x) {
    const b = s.getState();
    w.Transport.schedule((N) => {
      if (b.isPaused) return;
      const F = T.drumTrack;
      if (F == null) return;
      const E = String(F);
      d == null || d.trigger(E, N), w.Draw.schedule(() => {
        var B;
        (B = t == null ? void 0 : t.triggerDrumNotePop) == null || B.call(t, T.startColumnIndex, F);
      }, N);
    }, x);
  }
  function r(T, x, b, N, F) {
    var $;
    const E = m(T, F), B = T.color, O = T.globalRow ?? T.row, D = (($ = F.fullRowData[O]) == null ? void 0 : $.hex) || "#888888", R = T.uuid, G = F.timbres[B];
    if (!G) {
      l.warn("TransportService", `Timbre not found for color ${B}. Skipping note ${R}`);
      return;
    }
    let _ = x + b;
    const U = N - 1e-3;
    _ >= N && (_ = Math.max(x + 1e-3, U)), w.Transport.schedule((q) => {
      s.getState().isPaused || (e.triggerAttack(E, B, q), w.Draw.schedule(() => {
        var W;
        (W = t == null ? void 0 : t.triggerAdsrVisual) == null || W.call(t, R, "attack", D, G.adsr), g.emit("noteAttack", { noteId: R, color: B });
      }, q));
    }, x), w.Transport.schedule((q) => {
      e.triggerRelease(E, B, q), w.Draw.schedule(() => {
        var W;
        (W = t == null ? void 0 : t.triggerAdsrVisual) == null || W.call(t, R, "release", D, G.adsr), g.emit("noteRelease", { noteId: R, color: B });
      }, q);
    }, _);
  }
  function C(T, x, b) {
    var B;
    const N = T.column, F = x[N];
    if (F === void 0) return;
    (((B = s.getStampScheduleEvents) == null ? void 0 : B.call(s, T.sixteenthStampId, T.placement)) ?? []).forEach((O) => {
      v(O, F, T.row, T.color, b);
    });
  }
  function A(T, x, b) {
    var B, O;
    const N = ((B = s.timeToCanvas) == null ? void 0 : B.call(s, T.startTimeIndex, b)) ?? T.startTimeIndex, F = x[N];
    if (F === void 0) return;
    (((O = s.getTripletScheduleEvents) == null ? void 0 : O.call(s, T.tripletStampId, T.placement)) ?? []).forEach((D) => {
      v(D, F, T.row, T.color, b);
    });
  }
  function v(T, x, b, N, F) {
    const E = w.Time(T.offset).toSeconds(), B = w.Time(T.duration).toSeconds(), O = x + E, D = O + B, R = b + T.rowOffset, G = n(R, F);
    w.Transport.schedule((_) => {
      s.getState().isPaused || e.triggerAttack(G, N, _);
    }, O), w.Transport.schedule((_) => {
      s.getState().isPaused || e.triggerRelease(G, N, _);
    }, D);
  }
  function f() {
    var O, D;
    const x = s.getState().tempo, b = 1e-4, N = 0.5, F = (R) => (R == null ? void 0 : R.xPosition) ?? 477.5, E = typeof ((D = (O = w.Transport) == null ? void 0 : O.bpm) == null ? void 0 : D.value) == "number" ? w.Transport.bpm.value : x;
    p = x !== 0 ? E / x : 1, c = !0;
    function B() {
      var Se, ye, Ce, Ae, Te, Ne, be, ve, Ie, we, Me, xe, Pe, Ee, Oe;
      if (!c || !i)
        return;
      if (w.Transport.state === "stopped") {
        u = requestAnimationFrame(B);
        return;
      }
      const R = s.getState(), G = w.Time(w.Transport.loopEnd).toSeconds(), _ = R.isLooping, V = i.getMusicalEndTime(), U = _ && G > 0 ? G : V, $ = w.Transport.seconds, q = $ >= U - 1e-3;
      if (!_ && q) {
        l.info("TransportService", "Playback reached end. Stopping playhead."), I.stop();
        return;
      }
      if (R.isPaused) {
        u = requestAnimationFrame(B);
        return;
      }
      const W = i.getTimeMap();
      (Se = t == null ? void 0 : t.clearPlayheadCanvas) == null || Se.call(t), (ye = t == null ? void 0 : t.clearDrumPlayheadCanvas) == null || ye.call(t);
      let X = $;
      if (_) {
        const H = w.Time(w.Transport.loopStart).toSeconds(), j = w.Time(w.Transport.loopEnd).toSeconds() - H;
        j > 0 && (X = ($ - H) % j + H);
      }
      const Ye = ((Ce = s.getCanvasWidth) == null ? void 0 : Ce.call(s)) ?? 1e3, ke = ((Ae = s.getPlacedTonicSigns) == null ? void 0 : Ae.call(s)) ?? [], he = ((Te = s.getTonicSpanColumnIndices) == null ? void 0 : Te.call(s, ke)) ?? /* @__PURE__ */ new Set();
      let ne = 0, me = 0, fe = 0, oe = -1;
      for (let H = 0; H < W.length - 1; H++) {
        const K = W[H], j = W[H + 1];
        if (!(K === void 0 || j === void 0) && X >= K && X < j) {
          let Y = H;
          for (; he.has(Y) && Y < W.length - 1; )
            Y++;
          const ae = ((Ne = s.getColumnStartX) == null ? void 0 : Ne.call(s, Y)) ?? 0, De = ((be = s.getColumnWidth) == null ? void 0 : be.call(s, Y)) ?? 10;
          if (me = ae, fe = De, oe = Y, he.has(H))
            ne = ae;
          else {
            const Fe = j - K, Qe = X - K, Ze = Fe > 0 ? Qe / Fe : 0;
            ne = ae + Ze * De;
          }
          break;
        }
      }
      const Z = Math.min(ne, Ye);
      S(R, Z, x, F, b, N);
      const pe = ((ve = t == null ? void 0 : t.getPlayheadCanvasHeight) == null ? void 0 : ve.call(t)) ?? 500, ge = ((Ie = t == null ? void 0 : t.getDrumCanvasHeight) == null ? void 0 : Ie.call(t)) ?? 100, z = R.playheadMode === "macrobeat" && oe >= 0 ? (we = s.getMacrobeatHighlightRect) == null ? void 0 : we.call(s, oe) : null, se = (z == null ? void 0 : z.x) ?? me, ie = (z == null ? void 0 : z.width) ?? fe;
      Z >= 0 && (R.playheadMode === "macrobeat" || R.playheadMode === "microbeat" ? ((Me = t == null ? void 0 : t.drawPlayheadHighlight) == null || Me.call(t, se, ie, pe, performance.now()), (xe = t == null ? void 0 : t.drawDrumPlayheadHighlight) == null || xe.call(t, se, ie, ge, performance.now())) : ((Pe = t == null ? void 0 : t.drawPlayheadLine) == null || Pe.call(t, Z, pe), (Ee = t == null ? void 0 : t.drawDrumPlayheadLine) == null || Ee.call(t, Z, ge)));
      const Ke = R.playheadMode === "macrobeat" || R.playheadMode === "microbeat";
      (Oe = t == null ? void 0 : t.updateBeatLineHighlight) == null || Oe.call(t, se, ie, Ke), u = requestAnimationFrame(B);
    }
    B();
  }
  function S(T, x, b, N, F, E) {
    if (!i) return;
    const O = (Array.isArray(T.modulationMarkers) ? T.modulationMarkers : []).filter((D) => (D == null ? void 0 : D.active) && typeof D.ratio == "number" && D.ratio !== 0).sort((D, R) => N(D) - N(R));
    if (O.length > 0) {
      let D = 1;
      for (const R of O) {
        const G = N(R);
        if (x + E >= G)
          D *= 1 / R.ratio;
        else
          break;
      }
      if ((!Number.isFinite(D) || D <= 0) && (D = 1), Math.abs(D - p) > F) {
        const R = b * D;
        w.Transport.bpm.value = R, i.reapplyConfiguredLoopBounds(T.isLooping), p = D, l.debug("TransportService", `Tempo multiplier updated to ${D.toFixed(3)} (${R.toFixed(2)} BPM)`);
      }
    } else Math.abs(p - 1) > F && (w.Transport.bpm.value = b, i.reapplyConfiguredLoopBounds(T.isLooping), p = 1, l.debug("TransportService", `Tempo reset to base ${b} BPM`));
  }
  const I = {
    init() {
      const T = s.getState();
      i = Bt({
        getMacrobeatInfo: s.getMacrobeatInfo ?? (() => null),
        getPlacedTonicSigns: s.getPlacedTonicSigns ?? (() => []),
        getTonicSpanColumnIndices: s.getTonicSpanColumnIndices ?? (() => /* @__PURE__ */ new Set()),
        logger: l
      }), d = Lt({
        samples: {
          H: "/audio/drums/hi.mp3",
          M: "/audio/drums/mid.mp3",
          L: "/audio/drums/lo.mp3"
        },
        synthEngine: {
          getMainVolumeNode: () => e.getMainVolumeNode()
        }
      }), w.Transport.bpm.value = T.tempo;
      const x = () => this.handleStateChange(), b = () => this.handleStateChange(), N = () => this.handleStateChange(), F = () => {
        if (i && i.getTimeMap().length > 0) {
          const D = s.getState();
          i.calculate(D);
        }
        this.handleStateChange();
      }, E = (D) => {
        var _, V;
        const R = ((_ = D == null ? void 0 : D.oldConfig) == null ? void 0 : _.columnWidths) || [], G = ((V = D == null ? void 0 : D.newConfig) == null ? void 0 : V.columnWidths) || [];
        R.length !== G.length && i && i.calculate(s.getState());
      }, B = (D) => {
        if (l.info("TransportService", `tempoChanged triggered with new value: ${D} BPM`), w.Transport.state === "started") {
          const R = w.Transport.position;
          w.Transport.pause(), u && (cancelAnimationFrame(u), u = null), w.Transport.bpm.value = D, i == null || i.reapplyConfiguredLoopBounds(s.getState().isLooping), M(), w.Transport.start(void 0, R), f();
        } else
          w.Transport.bpm.value = D, i == null || i.reapplyConfiguredLoopBounds(s.getState().isLooping), i == null || i.calculate(s.getState());
      }, O = (D) => {
        w.Transport.loop = D;
        const R = w.Time(w.Transport.loopStart).toSeconds(), G = w.Time(w.Transport.loopEnd).toSeconds();
        D && G <= R && i && (w.Transport.loopEnd = R + Math.max(i.getMicrobeatDuration(s.getState().tempo), 1e-3)), D && i ? i.setConfiguredLoopBounds(
          w.Time(w.Transport.loopStart).toSeconds(),
          w.Time(w.Transport.loopEnd).toSeconds()
        ) : i == null || i.clearConfiguredLoopBounds();
      };
      g.on("rhythmStructureChanged", x), g.on("notesChanged", b), g.on("sixteenthStampPlacementsChanged", N), g.on("modulationMarkersChanged", F), g.on("layoutConfigChanged", E), g.on("tempoChanged", B), g.on("loopingChanged", O), y.push(
        () => {
        }
        // These would be off() calls if the event system supports them
      ), w.Transport.on("stop", () => {
        var D, R;
        l.info("TransportService", "Tone.Transport 'stop' fired. Resetting playback state"), (D = g.setPlaybackState) == null || D.call(g, !1, !1), (R = t == null ? void 0 : t.clearAdsrVisuals) == null || R.call(t), u && (cancelAnimationFrame(u), u = null);
      }), l.info("TransportService", "Initialized");
    },
    handleStateChange() {
      if (w.Transport.state === "started") {
        l.debug("TransportService", "handleStateChange: Notes or rhythm changed during playback. Rescheduling");
        const x = w.Transport.position;
        w.Transport.pause(), M(), w.Transport.start(void 0, x);
      } else
        i == null || i.calculate(s.getState());
    },
    start() {
      l.info("TransportService", "Starting playback"), (a || (() => w.start()))().then(() => {
        M();
        const x = s.getState();
        i == null || i.getTimeMap();
        const b = (i == null ? void 0 : i.getMusicalEndTime()) ?? 0, N = (i == null ? void 0 : i.findNonAnacrusisStart(x)) ?? 0;
        i == null || i.setLoopBounds(N, b, x.tempo), w.Transport.bpm.value = x.tempo;
        const F = w.now() + 0.1;
        w.Transport.start(F, 0), f(), g.emit("playbackStarted");
      });
    },
    resume() {
      l.info("TransportService", "Resuming playback"), (a || (() => w.start()))().then(() => {
        w.Transport.start(), f(), g.emit("playbackResumed");
      });
    },
    pause() {
      l.info("TransportService", "Pausing playback"), w.Transport.pause(), u && (cancelAnimationFrame(u), u = null), g.emit("playbackPaused");
    },
    stop() {
      var x, b, N;
      l.info("TransportService", "Stopping playback and clearing visuals"), c = !1, u && (cancelAnimationFrame(u), u = null), w.Transport.stop(), w.Transport.cancel(), d == null || d.reset();
      const T = s.getState();
      w.Transport.bpm.value = T.tempo, i == null || i.reapplyConfiguredLoopBounds(T.isLooping), e.releaseAll(), (x = t == null ? void 0 : t.clearPlayheadCanvas) == null || x.call(t), (b = t == null ? void 0 : t.clearDrumPlayheadCanvas) == null || b.call(t), (N = t == null ? void 0 : t.updateBeatLineHighlight) == null || N.call(t, 0, 0, !1), g.emit("playbackStopped");
    },
    dispose() {
      this.stop(), d == null || d.dispose(), y.forEach((T) => T()), l.debug("TransportService", "Disposed");
    }
  };
  return I;
}
const _t = {
  latencyHint: "playback",
  lookAhead: 0.1
};
function wn(o = {}) {
  const { latencyHint: e, lookAhead: s } = { ..._t, ...o };
  let g = !1;
  if (w.context.state === "suspended")
    try {
      w.setContext(new w.Context({
        latencyHint: e
      })), g = !0;
    } catch (t) {
      console.warn("Failed to create new AudioContext, using default:", t);
    }
  return s !== void 0 && (w.context.lookAhead = s), g;
}
function Mn() {
  const o = w.context.rawContext, e = o && "baseLatency" in o ? o.baseLatency : void 0;
  return {
    state: w.context.state,
    sampleRate: w.context.sampleRate,
    baseLatency: e,
    lookAhead: w.context.lookAhead
  };
}
function Vt(o) {
  let e = null, s = null;
  function g() {
    const p = typeof performance < "u" ? performance.now() : Date.now();
    return (!e || !s || p - s > 1) && (e = o.getViewportInfo(), s = p), e;
  }
  function t() {
    e = null, s = null;
  }
  function h(p, y) {
    if (o.columnToPixelX)
      return o.columnToPixelX(p, y);
    const { columnWidths: n, cellWidth: m } = y;
    let M = 0;
    for (let P = 0; P < p && P < n.length; P++)
      M += (n[P] ?? 1) * m;
    return M;
  }
  function a(p, y) {
    const n = g(), m = p - n.startRank, M = y.cellHeight / 2;
    return (m + 1) * M;
  }
  function l(p, y) {
    if (o.pixelXToColumn)
      return o.pixelXToColumn(p, y);
    const { columnWidths: n, cellWidth: m } = y;
    let M = 0;
    for (let P = 0; P < n.length; P++) {
      const r = (n[P] ?? 1) * m;
      if (p < M + r)
        return P;
      M += r;
    }
    return n.length - 1;
  }
  function u(p, y) {
    const n = g(), m = y.cellHeight / 2;
    return p / m - 1 + n.startRank;
  }
  function c() {
    const p = g(), { startRank: y, endRank: n } = p, m = Math.max(y, n - 1);
    return { startRow: y, endRow: m };
  }
  function i(p) {
    let y = (p || "").replace(/\d/g, "").trim();
    return y = y.replace(/b/g, "b-").replace(/#/g, "b_"), y;
  }
  function d(p) {
    switch (p) {
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
    getColumnX: h,
    getRowY: a,
    getColumnFromX: l,
    getRowFromY: u,
    getVisibleRowRange: c,
    getPitchClass: i,
    getLineStyleFromPitchClass: d,
    invalidateViewportCache: t,
    getCachedViewportInfo: g
  };
}
const ce = "♯", de = "♭", ee = "/", $t = 0.35, qt = 0.5, Wt = 6, Ut = 1, Ht = 0.08, Jt = 0.04, Xt = 1, Q = 4;
function zt(o) {
  const { coords: e } = o;
  function s(r) {
    const C = r == null ? void 0 : r.split("-")[1];
    return Number.parseInt(C ?? "0", 10);
  }
  function g(r) {
    if (!r || typeof r.startColumnIndex != "number" || typeof r.endColumnIndex != "number")
      return !1;
    const C = r.shape === "circle" ? r.startColumnIndex + 1 : r.startColumnIndex;
    return r.endColumnIndex > C;
  }
  function t(r, C) {
    return Number.isFinite(r) && r > 0 && Number.isFinite(C) && C > 0;
  }
  function h(r, C, A) {
    const { cellWidth: v } = A, f = v * 0.25, S = r.uuid;
    if (!S) return 0;
    const I = C.filter(
      (b) => !b.isDrum && b.row === r.row && b.startColumnIndex === r.startColumnIndex && b.uuid && b.uuid !== S
    );
    if (I.length === 0) return 0;
    const T = [r, ...I];
    return T.sort((b, N) => s(b.uuid) - s(N.uuid)), T.findIndex((b) => b.uuid === S) * f;
  }
  function a(r, C) {
    var S, I, T;
    const { cellHeight: A } = C, v = (S = o.getAnimationEffectsManager) == null ? void 0 : S.call(o);
    return (I = v == null ? void 0 : v.shouldAnimateNote) != null && I.call(v, r) ? (((T = v.getVibratoYOffset) == null ? void 0 : T.call(v, r.color)) ?? 0) * A : 0;
  }
  function l(r, C, A) {
    const { cellHeight: v } = A, f = v / 2 * 0.12, S = r.uuid;
    if (!S) return 0;
    const I = C.filter(
      (b) => !b.isDrum && b.row === r.row && b.startColumnIndex === r.startColumnIndex && b.uuid && b.uuid !== S && g(b)
    );
    if (I.length === 0) return 0;
    const T = [r, ...I];
    return T.sort((b, N) => s(b.uuid) - s(N.uuid)), T.findIndex((b) => b.uuid === S) * f;
  }
  function u(r, C) {
    var F, E, B;
    const A = (F = o.getDegreeForNote) == null ? void 0 : F.call(o, r);
    if (!A) return { label: null, isAccidental: !1 };
    if (!(((E = o.hasAccidental) == null ? void 0 : E.call(o, A)) ?? !1)) return { label: A, isAccidental: !1 };
    const f = C.accidentalMode || {}, S = f.sharp ?? !0, I = f.flat ?? !0;
    if (!S && !I) return { label: null, isAccidental: !0 };
    let T = A.includes(ce) ? A : null, x = A.includes(de) ? A : null;
    const b = (B = o.getEnharmonicDegree) == null ? void 0 : B.call(o, A);
    b && (b.includes(ce) && !T && (T = b), b.includes(de) && !x && (x = b));
    let N = null;
    if (S && I) {
      const O = [];
      T && O.push(T), x && (!T || x !== T) && O.push(x), N = O.join(ee), N || (N = A);
    } else S ? N = T || A : I && (N = x || A);
    return { label: N, isAccidental: !0 };
  }
  function c(r) {
    if (!r) return { multiplier: 1, category: "natural" };
    const C = r.includes(de), A = r.includes(ce), v = r.includes(ee);
    return !C && !A ? { multiplier: 1, category: "natural" } : v ? { multiplier: 0.75, category: "both-accidentals" } : { multiplier: 0.88, category: "single-accidental" };
  }
  function i(r, C, A, v, f, S) {
    const { label: I } = u(C, A);
    if (!I) return;
    const { multiplier: T, category: x } = c(I);
    let b;
    if (C.shape === "circle") {
      const N = S * 2 * qt;
      switch (x) {
        case "natural":
          b = N;
          break;
        case "single-accidental":
          b = N * 0.8;
          break;
        case "both-accidentals":
          b = N * 0.4;
          break;
        default:
          b = N * T;
      }
    } else {
      const N = S * 2 * $t;
      switch (x) {
        case "natural":
          b = N * 1.5;
          break;
        case "single-accidental":
          b = N * 1.2;
          break;
        case "both-accidentals":
          b = N;
          break;
        default:
          b = N * T;
      }
    }
    if (!(b < Wt))
      if (r.fillStyle = "#212529", r.font = `bold ${b}px 'Atkinson Hyperlegible', sans-serif`, r.textAlign = "center", r.textBaseline = "middle", C.shape === "oval" && x === "both-accidentals" && I.includes(ee)) {
        const N = I.split(ee), F = b * 1.1, E = F * (N.length - 1), B = f - E / 2;
        N.forEach((O, D) => {
          const R = B + D * F, G = b * 0.08;
          r.fillText(O.trim(), v, R + G);
        });
      } else {
        const N = b * 0.08;
        r.fillText(I, v, f + N);
      }
  }
  function d(r, C, A) {
    var N, F;
    const v = (N = o.getAnimationEffectsManager) == null ? void 0 : N.call(o), f = v == null ? void 0 : v.hasReverbEffect;
    if (!(typeof f == "function" ? f(C.color) : !!f)) return { shouldApply: !1, blur: 0, spread: 0 };
    const { cellWidth: I } = A, T = (F = v == null ? void 0 : v.getReverbEffect) == null ? void 0 : F.call(v, C.color);
    if (!T) return { shouldApply: !1, blur: 0, spread: 0 };
    const x = T.blur * (I / 2), b = T.spread * (I / 3);
    return { shouldApply: x > 0 || b > 0, blur: x, spread: b };
  }
  function p(r, C, A, v, f, S, I) {
    var N, F, E;
    const T = (N = o.getAnimationEffectsManager) == null ? void 0 : N.call(o);
    if (!((F = T == null ? void 0 : T.hasDelayEffect) != null && F.call(T, C.color))) return;
    const { cellWidth: x } = A, b = (E = T.getDelayEffects) == null ? void 0 : E.call(T, C.color);
    !b || b.length === 0 || b.forEach((B) => {
      const O = B.delay / 500 * x * 2, D = v + O, R = S * B.scale, G = I * B.scale;
      r.save(), r.globalAlpha = B.opacity * 0.6, r.beginPath(), r.ellipse(D, f, R, G, 0, 0, 2 * Math.PI), r.strokeStyle = C.color, r.lineWidth = Math.max(0.5, R * 0.1), r.setLineDash([2, 2]), r.stroke(), r.restore();
    });
  }
  function y(r, C, A, v, f, S) {
    var N, F, E;
    const I = (N = o.getAnimationEffectsManager) == null ? void 0 : N.call(o);
    if (!((F = I == null ? void 0 : I.shouldFillNote) != null && F.call(I, C))) return;
    const T = ((E = I.getFillLevel) == null ? void 0 : E.call(I, C)) ?? 0;
    if (T <= 0) return;
    r.save();
    const x = 1 - T, b = r.createRadialGradient(A, v, 0, A, v, Math.max(f, S));
    b.addColorStop(0, "transparent"), b.addColorStop(Math.max(0, x - 0.05), "transparent"), b.addColorStop(x, `${C.color}1F`), b.addColorStop(1, `${C.color}BF`), r.beginPath(), r.ellipse(A, v, f, S, 0, 0, 2 * Math.PI), r.clip(), r.fillStyle = b, r.fillRect(A - f - 10, v - S - 10, (f + 10) * 2, (S + 10) * 2), r.restore();
  }
  function n(r, C, A, v, f, S) {
    var B, O, D;
    const I = (B = o.getAnimationEffectsManager) == null ? void 0 : B.call(o);
    if (!((O = I == null ? void 0 : I.shouldFillNote) != null && O.call(I, C))) return;
    const T = ((D = I.getFillLevel) == null ? void 0 : D.call(I, C)) ?? 0;
    if (T <= 0) return;
    r.save(), r.beginPath(), r.arc(A, f, S, Math.PI / 2, -Math.PI / 2, !1), r.lineTo(v, f - S), r.arc(v, f, S, -Math.PI / 2, Math.PI / 2, !1), r.lineTo(A, f + S), r.closePath(), r.clip();
    const x = (A + v) / 2, b = v - A, N = Math.max(b / 2 + S, S), F = 1 - T, E = r.createRadialGradient(x, f, 0, x, f, N);
    E.addColorStop(0, "transparent"), E.addColorStop(Math.max(0, F - 0.05), "transparent"), E.addColorStop(F, `${C.color}1F`), E.addColorStop(1, `${C.color}BF`), r.fillStyle = E, r.fillRect(A - S - 10, f - S - 10, b + (S + 10) * 2, (S + 10) * 2), r.restore();
  }
  function m(r, C, A, v, f, S, I, T) {
    if (n(r, C, v, f, S, I), r.save(), r.beginPath(), r.arc(v, S, I, Math.PI / 2, -Math.PI / 2, !1), r.lineTo(f, S - I), r.arc(f, S, I, -Math.PI / 2, Math.PI / 2, !1), r.lineTo(v, S + I), r.closePath(), r.strokeStyle = C.color, r.lineWidth = T, r.shadowColor = C.color, r.shadowBlur = Q, r.stroke(), r.shadowBlur = 0, r.shadowColor = "transparent", r.restore(), A.degreeDisplayMode !== "off") {
      const x = (v + f) / 2;
      i(r, C, A, x, S, I);
    }
  }
  function M(r, C, A, v) {
    const { cellWidth: f, cellHeight: S, modulationMarkers: I, placedNotes: T } = C, x = e.getRowY(v, C), b = a(A, C), N = x + b, F = e.getColumnX(A.startColumnIndex, C);
    let E;
    if (I && I.length > 0 ? E = e.getColumnX(A.startColumnIndex + 1, C) - F : E = f, !t(E, S)) return;
    const B = h(A, T, C), O = F + E + B, D = Math.max(Ut, E * Ht), R = S / 2 - D / 2, G = g(A), _ = C.longNoteStyle || "style1";
    if (G && _ === "style2") {
      const $ = O, q = e.getColumnX(A.endColumnIndex, C);
      if (!t(q - $, R)) return;
      m(r, A, C, $, q, N, R, D);
      return;
    }
    if (G) {
      const $ = e.getColumnX(A.endColumnIndex + 1, C), q = l(A, T, C), W = N + q;
      r.beginPath(), r.moveTo(O, W), r.lineTo($, W), r.strokeStyle = A.color, r.lineWidth = Math.max(Xt, E * Jt), r.stroke();
    }
    const V = E - D / 2;
    if (!t(V, R)) return;
    p(r, A, C, O, N, V, R), r.save(), y(r, A, O, N, V, R);
    const U = d(r, A, C);
    U.shouldApply && (r.shadowColor = A.color, r.shadowBlur = Q + U.blur, r.shadowOffsetX = U.spread), r.beginPath(), r.ellipse(O, N, V, R, 0, 0, 2 * Math.PI), r.strokeStyle = A.color, r.lineWidth = D, U.shouldApply || (r.shadowColor = A.color, r.shadowBlur = Q), r.stroke(), r.shadowBlur = 0, r.shadowColor = "transparent", r.shadowOffsetX = 0, r.restore(), C.degreeDisplayMode !== "off" && i(r, A, C, O, N, V);
  }
  function P(r, C, A, v) {
    const { columnWidths: f, cellWidth: S, cellHeight: I, modulationMarkers: T, placedNotes: x } = C, b = e.getRowY(v, C), N = a(A, C), F = b + N, E = e.getColumnX(A.startColumnIndex, C);
    let B;
    if (T && T.length > 0 ? B = e.getColumnX(A.startColumnIndex + 1, C) - E : B = (f[A.startColumnIndex] ?? 1) * S, !t(B, I)) return;
    const O = h(A, x, C), D = Math.max(0.5, B * 0.15), R = E + B / 2 + O, G = B / 2 - D / 2, _ = I / 2 - D / 2;
    if (!t(G, _)) return;
    p(r, A, C, R, F, G, _), r.save(), y(r, A, R, F, G, _);
    const V = d(r, A, C);
    V.shouldApply && (r.shadowColor = A.color, r.shadowBlur = Q + V.blur, r.shadowOffsetX = V.spread), r.beginPath(), r.ellipse(R, F, G, _, 0, 0, 2 * Math.PI), r.strokeStyle = A.color, r.lineWidth = D, V.shouldApply || (r.shadowColor = A.color, r.shadowBlur = Q), r.stroke(), r.shadowBlur = 0, r.shadowColor = "transparent", r.shadowOffsetX = 0, r.restore(), C.degreeDisplayMode !== "off" && i(r, A, C, R, F, G);
  }
  return {
    drawTwoColumnOvalNote: M,
    drawSingleColumnOvalNote: P,
    hasVisibleTail: g
  };
}
function jt(o) {
  const { coords: e } = o;
  function s(t, h) {
    const { fullRowData: a, canvasWidth: l, cellHeight: u } = h, { startRow: c, endRow: i } = e.getVisibleRowRange();
    for (let d = c; d <= i; d++) {
      const p = a[d];
      if (!p) continue;
      const y = e.getRowY(d, h), n = e.getPitchClass(p.toneNote), m = e.getLineStyleFromPitchClass(n);
      if (t.beginPath(), t.moveTo(0, y), t.lineTo(l, y), t.strokeStyle = m.color, t.lineWidth = m.lineWidth, t.setLineDash(m.dash), t.stroke(), t.setLineDash([]), n === "G") {
        const M = u / 2;
        t.fillStyle = "#f8f9fa", t.fillRect(0, y - M, l, M);
      }
    }
  }
  function g(t, h) {
    var M, P, r, C;
    const {
      columnWidths: a,
      macrobeatBoundaryStyles: l,
      hasAnacrusis: u,
      canvasHeight: c
    } = h, i = ((M = o.getPlacedTonicSigns) == null ? void 0 : M.call(o)) ?? [], d = ((P = o.getTonicSpanColumnIndices) == null ? void 0 : P.call(o, i)) ?? /* @__PURE__ */ new Set(), p = ((r = o.getAnacrusisColors) == null ? void 0 : r.call(o)) ?? {
      background: "rgba(173, 181, 189, 0.15)",
      border: "rgba(173, 181, 189, 0.3)"
    };
    let y = u, n = 0, m = 0;
    for (let A = 0; A <= a.length; A++) {
      const v = e.getColumnX(A, h), f = (C = o.getMacrobeatInfo) == null ? void 0 : C.call(o, m);
      if (f && f.startColumn === A) {
        const I = l[m] ?? "solid";
        y && I === "solid" && (t.fillStyle = p.background, t.fillRect(n, 0, v - n, c), y = !1), t.beginPath(), t.moveTo(v, 0), t.lineTo(v, c), I === "anacrusis" ? (t.strokeStyle = p.border, t.setLineDash([5, 5]), t.lineWidth = 1) : I === "dashed" ? (t.strokeStyle = "#adb5bd", t.setLineDash([5, 5]), t.lineWidth = 1) : (t.strokeStyle = "#adb5bd", t.setLineDash([]), t.lineWidth = 2), t.stroke(), t.setLineDash([]), m++;
      } else A > 0 && !d.has(A - 1) && (t.beginPath(), t.moveTo(v, 0), t.lineTo(v, c), t.strokeStyle = "#dee2e6", t.lineWidth = 1, t.stroke());
      if (d.has(A)) {
        const I = (a[A] ?? 1) * h.cellWidth;
        t.fillStyle = "rgba(255, 193, 7, 0.1)", t.fillRect(v, 0, I, c);
      }
    }
  }
  return {
    drawHorizontalLines: s,
    drawVerticalLines: g
  };
}
function xn(o, e, s) {
  const g = o.canvas.width, t = o.canvas.height;
  o.clearRect(0, 0, g, t);
  const h = Vt({
    getViewportInfo: s.getViewportInfo,
    columnToPixelX: s.columnToPixelX ? (y, n) => s.columnToPixelX(y, e) : void 0,
    pixelXToColumn: s.pixelXToColumn ? (y, n) => s.pixelXToColumn(y, e) : void 0
  }), a = jt({
    coords: h,
    getMacrobeatInfo: s.getMacrobeatInfo,
    getPlacedTonicSigns: () => e.placedTonicSigns,
    getTonicSpanColumnIndices: s.getTonicSpanColumnIndices,
    getAnacrusisColors: s.getAnacrusisColors
  }), l = zt({
    coords: h,
    getDegreeForNote: s.getDegreeForNote,
    hasAccidental: s.hasAccidental,
    getEnharmonicDegree: s.getEnharmonicDegree,
    getAnimationEffectsManager: s.getAnimationEffectsManager
  }), u = {
    ...e,
    canvasWidth: g,
    canvasHeight: t
  }, c = {
    ...e,
    placedNotes: e.placedNotes
  };
  a.drawHorizontalLines(o, u), a.drawVerticalLines(o, u);
  const { startRow: i, endRow: d } = h.getVisibleRowRange(), p = e.placedNotes.filter((y) => {
    if (y.isDrum) return !1;
    const n = y.globalRow ?? y.row;
    return n >= i && n <= d;
  });
  for (const y of p) {
    const n = y.globalRow ?? y.row;
    y.shape === "circle" ? l.drawTwoColumnOvalNote(o, c, y, n) : l.drawSingleColumnOvalNote(o, c, y, n);
  }
  for (const y of e.placedTonicSigns) {
    const n = y.globalRow ?? y.row;
    n >= i && n <= d && Yt(o, e, y, h);
  }
}
function Yt(o, e, s, g) {
  const { cellWidth: t, cellHeight: h } = e, a = g.getRowY(s.globalRow ?? s.row, e), l = g.getColumnX(s.columnIndex, e), u = t * 2, c = l + u / 2, i = Math.min(u, h) / 2 * 0.9;
  if (i < 2 || (o.beginPath(), o.arc(c, a, i, 0, 2 * Math.PI), o.strokeStyle = "#212529", o.lineWidth = Math.max(0.5, t * 0.05), o.stroke(), s.tonicNumber == null)) return;
  const d = s.tonicNumber.toString(), p = i * 1.5;
  p < 6 || (o.fillStyle = "#212529", o.font = `bold ${p}px 'Atkinson Hyperlegible', sans-serif`, o.textAlign = "center", o.textBaseline = "middle", o.fillText(d, c, a));
}
const kt = ["H", "M", "L"];
function Kt(o) {
  if (o.length === 0) return [];
  const e = [...o].sort((g, t) => g.start - t.start), s = [];
  for (const g of e) {
    if (s.length === 0) {
      s.push({ ...g });
      continue;
    }
    const t = s[s.length - 1];
    g.start <= t.end ? t.end = Math.max(t.end, g.end) : s.push({ ...g });
  }
  return s;
}
function Qt(o, e, s) {
  const g = /* @__PURE__ */ new Set([o, e]);
  s.forEach((a) => {
    const l = Math.max(o, Math.min(e, a.start)), u = Math.max(o, Math.min(e, a.end));
    u > l && (g.add(l), g.add(u));
  });
  const t = Array.from(g).sort((a, l) => a - l), h = [];
  for (let a = 0; a < t.length - 1; a++) {
    const l = t[a], u = t[a + 1], c = (l + u) / 2, i = s.some((d) => c >= d.start && c < d.end);
    u > l && h.push({ from: l, to: u, light: i });
  }
  return h;
}
function He(o, e) {
  return e.some(
    (s) => o === s.columnIndex || o === s.columnIndex + 1
  );
}
function Zt(o, e) {
  return !e.some((s) => o === s.columnIndex + 1);
}
function Je(o, e, s, g, t, h, a = 1) {
  const l = s + t / 2, u = g + h / 2, c = Math.min(t, h) * 0.4 * a;
  if (o.beginPath(), e === 0)
    o.moveTo(l, u - c), o.lineTo(l - c, u + c), o.lineTo(l + c, u + c), o.closePath();
  else if (e === 1)
    o.moveTo(l, u - c), o.lineTo(l + c, u), o.lineTo(l, u + c), o.lineTo(l - c, u), o.closePath();
  else {
    for (let d = 0; d < 5; d++) {
      const p = 2 * Math.PI / 5 * d - Math.PI / 2, y = l + c * Math.cos(p), n = u + c * Math.sin(p);
      d === 0 ? o.moveTo(y, n) : o.lineTo(y, n);
    }
    o.closePath();
  }
  o.fill();
}
function en(o) {
  const { coords: e } = o, s = {
    stroke: "#c7cfd8"
  };
  function g(u, c) {
    const i = [];
    return c !== null && c > 0 && i.push({
      start: e.getColumnX(0, u),
      end: e.getColumnX(c, u)
    }), u.placedTonicSigns.forEach((d) => {
      const p = e.getColumnX(d.columnIndex, u), y = e.getColumnX(d.columnIndex + 2, u);
      i.push({ start: p, end: y });
    }), Kt(i);
  }
  function t(u) {
    if (!u.hasAnacrusis || !o.getMacrobeatInfo) return null;
    const c = u.macrobeatBoundaryStyles.findIndex(
      (d) => d === "solid"
    );
    if (c < 0) return null;
    const i = o.getMacrobeatInfo(c);
    return i ? i.endColumn + 1 : null;
  }
  function h(u, c, i) {
    var A, v;
    const {
      columnWidths: d,
      musicalColumnWidths: p,
      macrobeatGroupings: y,
      macrobeatBoundaryStyles: n,
      placedTonicSigns: m
    } = c, P = (p && p.length > 0 ? p : d).length, r = [];
    for (let f = 0; f < y.length; f++) {
      const S = (A = o.getMacrobeatInfo) == null ? void 0 : A.call(o, f);
      S && r.push(S.endColumn + 1);
    }
    const C = ((v = o.getAnacrusisColors) == null ? void 0 : v.call(o)) ?? s;
    for (let f = 0; f <= P; f++) {
      const S = f === 0 || f === P, I = He(f, m), T = m.some((E) => f === E.columnIndex + 2), x = r.includes(f);
      if (!Zt(f, m)) continue;
      let N = null;
      if (S || I || T)
        N = { lineWidth: 2, strokeStyle: "#adb5bd", dash: [] };
      else if (x) {
        const E = r.indexOf(f), B = n[E];
        B === "anacrusis" ? N = { lineWidth: 1, strokeStyle: C.stroke, dash: [4, 4] } : N = {
          lineWidth: 1,
          strokeStyle: "#adb5bd",
          dash: B === "solid" ? [] : [5, 5]
        };
      }
      if (!N) continue;
      const F = e.getColumnX(f, c);
      u.beginPath(), u.moveTo(F, 0), u.lineTo(F, i), u.lineWidth = N.lineWidth, u.strokeStyle = N.strokeStyle, u.setLineDash(N.dash), u.stroke();
    }
    u.setLineDash([]);
  }
  function a(u, c, i, d) {
    var M;
    const p = t(c), y = g(c, p), n = Qt(0, d, y), m = ((M = o.getAnacrusisColors) == null ? void 0 : M.call(o)) ?? s;
    for (let P = 0; P < 4; P++) {
      const r = P * i;
      n.forEach((C) => {
        C.to <= C.from || (u.beginPath(), u.moveTo(C.from, r), u.lineTo(C.to, r), u.strokeStyle = C.light ? m.stroke : "#ced4da", u.lineWidth = 1, u.globalAlpha = C.light ? 0.6 : 1, u.stroke(), u.globalAlpha = 1);
      });
    }
  }
  function l(u, c, i) {
    var P;
    const { placedNotes: d, columnWidths: p, cellWidth: y, placedTonicSigns: n, modulationMarkers: m } = c, M = p.length + 4;
    for (let r = 0; r < M; r++) {
      if (He(r, n)) continue;
      const C = e.getColumnX(r, c);
      let A;
      m && m.length > 0 ? A = e.getColumnX(r + 1, c) - C : A = (p[r] ?? 0) * y;
      for (let v = 0; v < 3; v++) {
        const f = v * i, S = kt[v], I = d.find(
          (T) => T.isDrum && (typeof T.drumTrack == "number" ? String(T.drumTrack) : T.drumTrack) === S && T.startColumnIndex === r
        );
        if (I) {
          u.fillStyle = I.color;
          const T = ((P = o.getAnimationScale) == null ? void 0 : P.call(o, r, S)) ?? 1;
          Je(u, v, C, f, A, i, T);
        } else
          u.fillStyle = "#ced4da", u.beginPath(), u.arc(C + A / 2, f + i / 2, 2, 0, Math.PI * 2), u.fill();
      }
    }
  }
  return {
    drawVerticalLines: h,
    drawHorizontalLines: a,
    drawDrumNotes: l,
    drawDrumShape: Je,
    buildLightRanges: g,
    getAnacrusisEndColumn: t
  };
}
function Pn(o, e, s) {
  var c;
  const g = o.canvas.width, t = o.canvas.height;
  o.clearRect(0, 0, g, t);
  const h = e.baseDrumRowHeight ?? 30, a = e.drumHeightScaleFactor ?? 1.5, l = Math.max(h, a * e.cellHeight), u = en(s);
  u.drawHorizontalLines(o, e, l, g), u.drawVerticalLines(o, e, t), u.drawDrumNotes(o, e, l), s.renderModulationMarkers && ((c = e.modulationMarkers) != null && c.length) && s.renderModulationMarkers(o, e);
}
const En = "0.1.0";
export {
  Ft as ClippingMonitor,
  _t as DEFAULT_CONTEXT_OPTIONS,
  Rt as DEFAULT_DRUM_SAMPLES,
  Et as FilteredVoice,
  Ot as GainManager,
  k as MODULATION_RATIOS,
  En as VERSION,
  mn as canvasToTime,
  hn as canvasToVisual,
  cn as canvasXToSeconds,
  ln as columnToRegularTime,
  wn as configureAudioContext,
  wt as createColumnMapService,
  rn as createCoordinateMapping,
  Lt as createDrumManager,
  Tn as createEngineController,
  Nn as createLessonMode,
  yt as createModulationMarker,
  It as createStore,
  vn as createSynthEngine,
  Bt as createTimeMapCalculator,
  In as createTransportService,
  J as fullRowData,
  Cn as getCanvasColumnWidths,
  pn as getColumnEntry,
  Xe as getColumnEntryByCanvas,
  Sn as getColumnType,
  Mn as getContextInfo,
  ut as getInitialState,
  yn as getMacrobeatBoundary,
  an as getModulationColor,
  sn as getModulationDisplayText,
  je as getPerVoiceBaselineGain,
  on as getPitchByIndex,
  nn as getPitchByToneNote,
  Be as getPitchIndex,
  Pt as getTimeBoundaryAfterMacrobeat,
  An as getTotalCanvasWidth,
  gn as isPlayableColumn,
  Pn as renderDrumGrid,
  xn as renderPitchGrid,
  ot as resolvePitchRange,
  dn as secondsToCanvasX,
  bn as setVoiceLogger,
  fn as timeToCanvas,
  xt as timeToVisual,
  un as visualToCanvas,
  Mt as visualToTime
};
//# sourceMappingURL=index.js.map
