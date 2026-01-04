var it = Object.defineProperty;
var at = (o, e, i) => e in o ? it(o, e, { enumerable: !0, configurable: !0, writable: !0, value: i }) : o[e] = i;
var V = (o, e, i) => at(o, typeof e != "symbol" ? e + "" : e, i);
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
], fe = /* @__PURE__ */ new Map(), rt = /* @__PURE__ */ new Map();
z.forEach((o, e) => {
  fe.set(o.toneNote, e), o.midi !== void 0 && rt.set(o.midi, e);
});
function un(o) {
  const e = fe.get(o);
  return e !== void 0 ? z[e] : void 0;
}
function hn(o) {
  return z[o];
}
function Le(o) {
  return fe.get(o) ?? -1;
}
function lt(o, e) {
  const i = Le(o), g = Le(e);
  return i === -1 || g === -1 ? null : {
    topIndex: Math.min(i, g),
    bottomIndex: Math.max(i, g)
  };
}
const ct = {
  attack: 0.01,
  decay: 0.1,
  sustain: 0.7,
  release: 0.3
}, dt = {
  enabled: !1,
  blend: 0.5,
  cutoff: 0.5,
  resonance: 0,
  type: "lowpass",
  mix: 1
}, ut = {
  speed: 5,
  span: 0
}, ht = {
  speed: 5,
  span: 0
};
function mt() {
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
  return o.forEach((i) => {
    const g = new Float32Array(32);
    g[0] = 1;
    const t = new Float32Array(32);
    e[i] = {
      name: "Sine",
      adsr: { ...ct },
      coeffs: g,
      phases: t,
      filter: { ...dt },
      activePresetName: "sine",
      gain: 1,
      vibrato: { ...ut },
      tremelo: { ...ht }
    };
  }), e;
}
function ft() {
  return {
    macrobeatGroupings: [2, 2, 2, 2],
    macrobeatBoundaryStyles: ["dashed", "dashed", "dashed", "dashed"],
    hasAnacrusis: !1,
    baseMicrobeatPx: 40,
    modulationMarkers: []
  };
}
function pt() {
  const o = lt("G5", "C4");
  return o || {
    topIndex: 0,
    bottomIndex: Math.max(0, z.length - 1)
  };
}
function gt() {
  const o = mt();
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
    fullRowData: [...z],
    pitchRange: pt(),
    // --- Rhythm ---
    ...ft(),
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
function _e(o) {
  if (!(!o || o.isDrum) && o.shape === "circle" && typeof o.startColumnIndex == "number") {
    const e = o.startColumnIndex + 1;
    (typeof o.endColumnIndex != "number" || o.endColumnIndex < e) && (o.endColumnIndex = e);
  }
}
function ce(o, e) {
  if (typeof o.row != "number") return;
  const i = e.length > 0 ? e.length - 1 : -1;
  if (i < 0) return;
  const g = typeof o.globalRow == "number" ? o.globalRow : o.row, t = Math.max(0, Math.min(i, Math.round(g)));
  o.globalRow = t, o.row = t;
}
function de() {
  return `uuid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function St(o = {}) {
  const {
    getMacrobeatInfo: e,
    getDegreeForNote: i,
    hasAccidental: g,
    log: t = () => {
    }
  } = o;
  return {
    /**
     * Adds a note to the state.
     * IMPORTANT: This function no longer records history. The calling function is responsible for that.
     */
    addNote(r) {
      const s = this.state.placedNotes.find(
        (f) => !f.isDrum && f.row === r.row && f.startColumnIndex === r.startColumnIndex && f.color === r.color
      );
      if (s) {
        if (this.state.degreeDisplayMode !== "off" && i && g) {
          const f = i(s, this.state);
          if (f && g(f))
            return s.enharmonicPreference = !s.enharmonicPreference, t("debug", "[ENHARMONIC] Toggled enharmonic preference for note", {
              noteUuid: s.uuid,
              currentDegree: f,
              enharmonicPreference: s.enharmonicPreference
            }), this.emit("notesChanged"), s;
        }
        return null;
      }
      const h = { ...r, uuid: de() };
      return _e(h), ce(h, this.state.fullRowData), this.state.placedNotes.push(h), this.emit("notesChanged"), h;
    },
    updateNoteTail(r, s) {
      let h = s;
      r.shape === "circle" && (h = Math.max(r.startColumnIndex + 1, s)), r.endColumnIndex = h, this.emit("notesChanged");
    },
    updateMultipleNoteTails(r, s) {
      r.forEach((h) => {
        let f = s;
        h.shape === "circle" && (f = Math.max(h.startColumnIndex + 1, s)), h.endColumnIndex = f;
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
    updateNoteRow(r, s) {
      r.row = s, r.globalRow = s, this.emit("notesChanged");
    },
    updateMultipleNoteRows(r, s) {
      r.forEach((h, f) => {
        const a = s[f];
        a !== void 0 && (h.row = a, ce(h, this.state.fullRowData));
      }), this.emit("notesChanged");
    },
    updateNotePosition(r, s) {
      r.startColumnIndex = s, r.endColumnIndex = r.shape === "circle" ? s + 1 : s, this.emit("notesChanged");
    },
    updateMultipleNotePositions(r, s) {
      r.forEach((h) => {
        h.startColumnIndex = s, h.endColumnIndex = h.shape === "circle" ? s + 1 : s;
      }), this.emit("notesChanged");
    },
    removeNote(r) {
      const s = this.state.placedNotes.indexOf(r);
      s > -1 && (this.state.placedNotes.splice(s, 1), this.emit("notesChanged"));
    },
    removeMultipleNotes(r) {
      const s = new Set(r);
      this.state.placedNotes = this.state.placedNotes.filter((h) => !s.has(h)), this.emit("notesChanged");
    },
    eraseInPitchArea(r, s, h = 1, f = !0) {
      const a = r + h - 1, p = s - 1, c = s + 1;
      let l = !1;
      const S = this.state.placedNotes.length;
      return this.state.placedNotes = this.state.placedNotes.filter((n) => {
        if (n.isDrum) return !0;
        if (n.shape === "circle") {
          const u = n.startColumnIndex + 1, M = typeof n.endColumnIndex == "number" ? Math.max(u, n.endColumnIndex) : u, I = n.startColumnIndex <= a && M >= r, d = n.row >= p && n.row <= c;
          if (I && d)
            return !1;
        } else if (n.row >= p && n.row <= c && n.startColumnIndex <= a && n.endColumnIndex >= r)
          return !1;
        return !0;
      }), this.state.placedNotes.length < S && (l = !0), l && (this.emit("notesChanged"), f && this.recordState()), l;
    },
    addTonicSignGroup(r) {
      t("debug", "Starting addTonicSignGroup", { tonicSignGroup: r });
      const s = r[0];
      if (!s) return;
      const { preMacrobeatIndex: h } = s;
      if (t("debug", "preMacrobeatIndex", { preMacrobeatIndex: h }), Object.entries(this.state.tonicSignGroups).find(
        ([, S]) => S.some((n) => n.preMacrobeatIndex === h)
      )) {
        t("debug", "Existing tonic already present for measure, skipping", { preMacrobeatIndex: h });
        return;
      }
      if (!e) {
        t("error", "getMacrobeatInfo callback not provided");
        return;
      }
      const a = e(this.state, h + 1).startColumn;
      t("debug", "Boundary column (canvas-space) for shifting notes", { boundaryColumn: a });
      const p = this.state.placedNotes.filter((S) => S.startColumnIndex >= a);
      t("debug", "Notes that will be shifted", {
        noteRanges: p.map((S) => `${S.startColumnIndex}-${S.endColumnIndex}`)
      }), this.state.placedNotes.forEach((S) => {
        if (S.startColumnIndex >= a) {
          const n = S.startColumnIndex, u = S.endColumnIndex;
          S.startColumnIndex = S.startColumnIndex + 2, S.endColumnIndex = S.endColumnIndex + 2, t("debug", `Shifted note from ${n}-${u} to ${S.startColumnIndex}-${S.endColumnIndex}`);
        }
      });
      const c = de(), l = r.map((S) => ({
        ...S,
        uuid: c,
        globalRow: typeof S.globalRow == "number" ? S.globalRow : S.row
      }));
      this.state.tonicSignGroups[c] = l, t("debug", "Added tonic group", { uuid: c, columns: l.map((S) => S.columnIndex) }), t("debug", "Emitting events: notesChanged, rhythmStructureChanged"), this.emit("notesChanged"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    /**
     * Erases tonic sign at the specified column index (canvas-space)
     */
    eraseTonicSignAt(r, s = !0) {
      const h = Object.entries(this.state.tonicSignGroups).find(
        ([, S]) => S.some((n) => n.columnIndex === r)
      );
      if (!h)
        return !1;
      if (!e)
        return t("error", "getMacrobeatInfo callback not provided"), !1;
      const [f, a] = h, p = a[0];
      if (!p) return !1;
      const c = p.preMacrobeatIndex, l = e(this.state, c + 1).startColumn;
      return delete this.state.tonicSignGroups[f], this.state.placedNotes.forEach((S) => {
        S.startColumnIndex >= l && (S.startColumnIndex = S.startColumnIndex - 2, S.endColumnIndex = S.endColumnIndex - 2);
      }), this.emit("notesChanged"), this.emit("rhythmStructureChanged"), s && this.recordState(), !0;
    },
    clearAllNotes() {
      this.state.placedNotes = [], this.state.tonicSignGroups = {}, this.emit("notesChanged"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    loadNotes(r) {
      const s = (r || []).map((h) => {
        const f = {
          ...h,
          uuid: (h == null ? void 0 : h.uuid) ?? de()
        };
        return _e(f), ce(f, this.state.fullRowData), f;
      });
      this.state.placedNotes = s, this.emit("notesChanged"), this.recordState();
    }
  };
}
function yt() {
  return `sixteenth-stamp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function Ct(o = {}) {
  const {
    getPlacedTonicSigns: e,
    isWithinTonicSpan: i,
    log: g = () => {
    }
  } = o;
  return {
    /**
     * Adds a stamp placement to the state
     * @param startColumn Canvas-space column index (0 = first musical beat)
     * @returns The placement if successful, null if blocked by tonic column
     */
    addSixteenthStampPlacement(t, r, s, h = "#4a90e2") {
      const f = r + 2;
      if (e && i) {
        const l = e(this.state);
        (i(r, l) || i(r + 1, l)) && g("debug", "Cannot place sixteenth stamp - overlaps tonic column", {
          sixteenthStampId: t,
          startColumn: r,
          row: s
        });
      }
      const a = this.state.sixteenthStampPlacements.find(
        (l) => l.row === s && l.startColumn < f && l.endColumn > r
      );
      a && this.removeSixteenthStampPlacement(a.id);
      const p = s, c = {
        id: yt(),
        sixteenthStampId: t,
        startColumn: r,
        endColumn: f,
        row: s,
        globalRow: p,
        color: h,
        timestamp: Date.now(),
        shapeOffsets: {}
      };
      return this.state.sixteenthStampPlacements.push(c), this.emit("sixteenthStampPlacementsChanged"), g("debug", `Added sixteenth stamp ${t} at canvas-space ${r}-${f},${s}`, {
        sixteenthStampId: t,
        startColumn: r,
        endColumn: f,
        row: s,
        placementId: c.id
      }), c;
    },
    /**
     * Removes a stamp placement by ID
     */
    removeSixteenthStampPlacement(t) {
      const r = this.state.sixteenthStampPlacements.findIndex((h) => h.id === t);
      if (r === -1) return !1;
      const s = this.state.sixteenthStampPlacements.splice(r, 1)[0];
      return s ? (this.emit("sixteenthStampPlacementsChanged"), g("debug", `Removed sixteenth stamp ${s.sixteenthStampId} at ${s.startColumn}-${s.endColumn},${s.row}`, {
        placementId: t,
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
    eraseSixteenthStampsInArea(t, r, s, h) {
      const f = [];
      for (const p of this.state.sixteenthStampPlacements) {
        const c = p.startColumn <= r && p.endColumn >= t, l = p.row >= s && p.row <= h;
        c && l && f.push(p.id);
      }
      let a = !1;
      return f.forEach((p) => {
        this.removeSixteenthStampPlacement(p) && (a = !0);
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
    getSixteenthStampAt(t, r) {
      return this.state.sixteenthStampPlacements.find(
        (s) => s.row === r && t >= s.startColumn && t < s.endColumn
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
        const r = this.state.fullRowData[t.row];
        return {
          sixteenthStampId: t.sixteenthStampId,
          column: t.startColumn,
          startColumn: t.startColumn,
          endColumn: t.endColumn,
          row: t.row,
          pitch: (r == null ? void 0 : r.toneNote) || "",
          color: t.color,
          placement: t
          // Include full placement object with shapeOffsets
        };
      }).filter((t) => t.pitch);
    },
    /**
     * Updates the pitch offset for an individual shape within a stamp
     */
    updateSixteenthStampShapeOffset(t, r, s) {
      const h = this.state.sixteenthStampPlacements.find((f) => f.id === t);
      if (!h) {
        g("warn", "[SIXTEENTH STAMP SHAPE OFFSET] Placement not found", { placementId: t });
        return;
      }
      h.shapeOffsets || (h.shapeOffsets = {}), g("debug", "[SIXTEENTH STAMP SHAPE OFFSET] Updating shape offset", {
        placementId: t,
        shapeKey: r,
        oldOffset: h.shapeOffsets[r] || 0,
        newOffset: s,
        baseRow: h.row,
        targetRow: h.row + s
      }), h.shapeOffsets[r] = s, this.emit("sixteenthStampPlacementsChanged");
    },
    /**
     * Gets the effective row for a specific shape within a stamp
     */
    getSixteenthStampShapeRow(t, r) {
      var h;
      const s = ((h = t.shapeOffsets) == null ? void 0 : h[r]) || 0;
      return t.row + s;
    }
  };
}
function Tt() {
  return `triplet-stamp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function Nt(o = {}) {
  const {
    canvasToTime: e,
    timeToCanvas: i,
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
    addTripletStampPlacement(r) {
      this.state.tripletStampPlacements || (this.state.tripletStampPlacements = []);
      const s = r.startTimeIndex + r.span * 2, h = this.state.tripletStampPlacements.find((a) => a.row !== r.row ? !1 : !(a.startTimeIndex + a.span * 2 <= r.startTimeIndex || s <= a.startTimeIndex));
      if (h && this.removeTripletStampPlacement(h.id), this.state.sixteenthStampPlacements && e && g) {
        const a = g(this.state);
        this.state.sixteenthStampPlacements.filter((c) => {
          if (c.row !== r.row) return !1;
          const l = e(c.startColumn, a);
          return l === null ? !0 : !(l + 2 <= r.startTimeIndex || l >= s);
        }).forEach((c) => {
          this.removeSixteenthStampPlacement && this.removeSixteenthStampPlacement(c.id);
        });
      }
      const f = {
        id: Tt(),
        ...r,
        shapeOffsets: r.shapeOffsets || {}
      };
      return this.state.tripletStampPlacements.push(f), this.emit("tripletStampPlacementsChanged"), this.emit("rhythmStructureChanged"), t("debug", `Added triplet stamp ${r.tripletStampId} at time ${r.startTimeIndex}, row ${r.row}`, {
        tripletStampId: r.tripletStampId,
        startTimeIndex: r.startTimeIndex,
        span: r.span,
        row: r.row,
        placementId: f.id
      }), f;
    },
    /**
     * Removes a triplet placement by ID
     * @param placementId - The placement ID to remove
     * @returns True if a triplet was removed
     */
    removeTripletStampPlacement(r) {
      if (!this.state.tripletStampPlacements) return !1;
      const s = this.state.tripletStampPlacements.findIndex((f) => f.id === r);
      if (s === -1) return !1;
      const h = this.state.tripletStampPlacements.splice(s, 1)[0];
      return h ? (this.emit("tripletStampPlacementsChanged"), t("debug", `Removed triplet stamp ${h.tripletStampId} at time ${h.startTimeIndex}, row ${h.row}`, {
        placementId: r,
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
    eraseTripletStampsInArea(r, s, h, f) {
      if (!this.state.tripletStampPlacements || !i || !g) return !1;
      const a = g(this.state), p = [];
      for (const l of this.state.tripletStampPlacements)
        if (l.row >= h && l.row <= f) {
          const S = l.span * 2, n = i(l.startTimeIndex, a);
          n + S - 1 < r || n > s || p.push(l.id);
        }
      let c = !1;
      return p.forEach((l) => {
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
    getTripletStampAt(r, s) {
      return this.state.tripletStampPlacements && this.state.tripletStampPlacements.find(
        (h) => h.row === s && r >= h.startTimeIndex && r < h.startTimeIndex + h.span * 2
      ) || null;
    },
    /**
     * Clears all triplet placements
     */
    clearAllTripletStamps() {
      if (!this.state.tripletStampPlacements) return;
      const r = this.state.tripletStampPlacements.length > 0;
      this.state.tripletStampPlacements = [], r && (this.emit("tripletStampPlacementsChanged"), t("info", "Cleared all triplet stamp placements"));
    },
    /**
     * Gets triplet placements for playback scheduling
     * @returns Array of playback data for triplets
     */
    getTripletStampPlaybackData() {
      return this.state.tripletStampPlacements ? this.state.tripletStampPlacements.map((r) => {
        const s = this.state.fullRowData[r.row];
        return {
          startTimeIndex: r.startTimeIndex,
          tripletStampId: r.tripletStampId,
          row: r.row,
          pitch: (s == null ? void 0 : s.toneNote) ?? "",
          color: r.color,
          span: r.span,
          placement: r
          // Include full placement object with shapeOffsets
        };
      }).filter((r) => r.pitch) : [];
    },
    /**
     * Updates the pitch offset for an individual shape within a triplet group
     * @param placementId - The triplet placement ID
     * @param shapeKey - The shape identifier (e.g., "triplet_0", "triplet_1", "triplet_2")
     * @param rowOffset - The pitch offset in rows (can be negative)
     */
    updateTripletStampShapeOffset(r, s, h) {
      var a;
      const f = (a = this.state.tripletStampPlacements) == null ? void 0 : a.find((p) => p.id === r);
      if (!f) {
        t("warn", "[TRIPLET STAMP SHAPE OFFSET] Placement not found", { placementId: r });
        return;
      }
      f.shapeOffsets || (f.shapeOffsets = {}), t("debug", "[TRIPLET STAMP SHAPE OFFSET] Updating shape offset", {
        placementId: r,
        shapeKey: s,
        oldOffset: f.shapeOffsets[s] || 0,
        newOffset: h,
        baseRow: f.row,
        targetRow: f.row + h
      }), f.shapeOffsets[s] = h, this.emit("tripletStampPlacementsChanged");
    },
    /**
     * Gets the effective row for a specific shape within a triplet group
     * @param placement - The triplet placement object
     * @param shapeKey - The shape identifier
     * @returns The effective row index
     */
    getTripletStampShapeRow(r, s) {
      var f;
      const h = ((f = r.shapeOffsets) == null ? void 0 : f[s]) || 0;
      return r.row + h;
    }
  };
}
const Q = {
  COMPRESSION_2_3: 2 / 3,
  // 0.6666666667
  EXPANSION_3_2: 3 / 2
  // 1.5
};
function At(o, e, i) {
  const { getMacrobeatInfo: g, log: t = () => {
  } } = i;
  if (t("debug", "[MODULATION] measureIndexToColumnIndex called", {
    measureIndex: o,
    hasState: !!e
  }), !e || !e.macrobeatGroupings) {
    t("warn", "[MODULATION] No state or macrobeatGroupings provided for measure conversion");
    const f = o * 4;
    return t("debug", "[MODULATION] Using fallback calculation", f), f;
  }
  if (o === 0)
    return t("debug", "[MODULATION] Measure 0 at canvas-space column 0"), 0;
  if (!g)
    return t("warn", "[MODULATION] getMacrobeatInfo callback not provided"), o * 4;
  const r = o - 1;
  t("debug", `[MODULATION] Converting measureIndex ${o} to macrobeatIndex: ${r}`);
  const s = g(e, r);
  if (t("debug", "[MODULATION] getMacrobeatInfo result", s), s) {
    const f = s.endColumn + 1;
    return t("debug", `[MODULATION] Found measure info, canvas-space endColumn: ${s.endColumn}, first column after: ${f}`), f;
  }
  t("warn", `[MODULATION] Could not find measure info for index: ${o}`);
  const h = o * 4;
  return t("debug", "[MODULATION] Using improved fallback calculation", h), h;
}
function bt(o, e, i = null, g = null, t = null) {
  return {
    id: `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    measureIndex: o,
    ratio: e,
    active: !0,
    xPosition: i,
    // Store the actual boundary position if provided
    columnIndex: g,
    // Store column index for stable positioning
    macrobeatIndex: t
    // Store macrobeat index for stable positioning
  };
}
function mn(o) {
  return Math.abs(o - Q.COMPRESSION_2_3) < 1e-3 ? "2:3" : Math.abs(o - Q.EXPANSION_3_2) < 1e-3 ? "3:2" : `${o}`;
}
function fn(o) {
  const e = "#ffc107";
  return Math.abs(o - Q.COMPRESSION_2_3) < 1e-3 || Math.abs(o - Q.EXPANSION_3_2) < 1e-3, e;
}
function Ve() {
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
function pn(o, e, i = null, g = {}) {
  const { log: t = () => {
  } } = g;
  if (!o || o.length === 0)
    return Ve();
  const r = [...o.filter((c) => c.active)].sort((c, l) => c.measureIndex - l.measureIndex);
  if (r.length === 0)
    return Ve();
  t("debug", "[MODULATION] Creating coordinate mapping for markers", r);
  const s = r.map((c) => {
    const l = At(c.measureIndex, i, g);
    return t("debug", `[MODULATION] Marker at measure ${c.measureIndex} calculated column=${l}`), t("debug", "[MODULATION] Full marker data", c), t("debug", "[MODULATION] Final marker position", {
      id: c.id,
      measureIndex: c.measureIndex,
      columnIndex: l
    }), {
      ...c,
      columnIndex: l
    };
  }), h = [];
  let f = 1;
  const a = s[0];
  if (s.length === 0 || a && a.columnIndex > 0) {
    const c = a ? a.columnIndex : 1 / 0;
    h.push({
      startColumn: 0,
      endColumn: c,
      scale: 1
    });
  }
  for (let c = 0; c < s.length; c++) {
    const l = s[c], S = s[c + 1], n = S ? S.columnIndex : 1 / 0;
    f *= l.ratio, h.push({
      startColumn: l.columnIndex,
      // Canvas-space
      endColumn: n,
      // Canvas-space
      scale: f,
      marker: l
    });
  }
  return {
    segments: h,
    /**
     * Gets the modulation scale for a given column index
     * @param columnIndex - Column index in musical space
     * @returns Scale factor (1.0 = no modulation, 0.667 = compressed, 1.5 = expanded)
     */
    getScaleForColumn(c) {
      for (const l of h)
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
      return h[0] || null;
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
function gn(o, e) {
  if (o >= 0 && o < e.length) {
    const i = e[o];
    if (i !== void 0)
      return i;
  }
  return o * 0.333;
}
function Sn(o, e, i) {
  return 0;
}
function yn(o, e, i) {
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
], We = new Array(16).fill(2), Mt = [
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
function qe(o, e) {
  const i = e(o), g = /* @__PURE__ */ new Map();
  i.entries.forEach((t) => {
    t.type === "tonic" && t.tonicSignUuid && typeof t.canvasIndex == "number" && g.set(t.tonicSignUuid, t.canvasIndex);
  }), Object.entries(o.tonicSignGroups || {}).forEach(([t, r]) => {
    const s = g.get(t);
    s !== void 0 && r.forEach((h) => {
      h.columnIndex = s;
    });
  });
}
const wt = {
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
function It(o = {}) {
  const {
    getColumnMap: e = () => wt,
    visualToTimeIndex: i = () => null,
    timeIndexToVisualColumn: g = () => null,
    getTimeBoundaryAfterMacrobeat: t = () => 0,
    log: r = () => {
    }
  } = o;
  return {
    setAnacrusis(s) {
      var n, u, M;
      if (this.state.hasAnacrusis === s)
        return;
      const h = [...this.state.macrobeatGroupings], f = [...this.state.macrobeatBoundaryStyles], a = h.reduce((I, d) => I + d, 0);
      let p, c;
      if (s) {
        const I = this._anacrusisCache, d = $e.length - We.length, N = $e.slice(0, d), A = vt.slice(0, d), C = (n = I == null ? void 0 : I.groupings) != null && n.length ? [...I.groupings] : [...N], m = (u = I == null ? void 0 : I.boundaryStyles) != null && u.length ? [...I.boundaryStyles] : [...A];
        if (p = [...C, ...h], c = [...m, ...f], !((M = I == null ? void 0 : I.boundaryStyles) != null && M.length))
          for (let y = 0; y < m.length; y++)
            c[y] = y < m.length - 1 ? "anacrusis" : "solid";
        this._anacrusisCache = null, r("debug", "rhythmActions", "Enabled anacrusis", {
          insertedCount: C.length,
          insertedColumns: C.reduce((y, b) => y + b, 0)
        }, "state");
      } else {
        const I = f.findIndex((C) => C === "solid");
        let d = 0;
        if (I !== -1)
          d = I + 1;
        else
          for (; d < f.length && f[d] === "anacrusis"; )
            d++;
        d = Math.min(d, h.length);
        const N = h.slice(0, d), A = f.slice(0, d);
        d > 0 ? this._anacrusisCache = {
          groupings: N,
          boundaryStyles: A
        } : this._anacrusisCache = null, p = h.slice(d), c = f.slice(d).map((C) => C === "anacrusis" ? "dashed" : C), p.length === 0 && (p = [...We], c = [...Mt]), r("debug", "rhythmActions", "Disabled anacrusis", {
          removalCount: d,
          removedColumns: N.reduce((C, m) => C + m, 0)
        }, "state");
      }
      const S = p.reduce((I, d) => I + d, 0) - a;
      if (this.state.hasAnacrusis = s, this.state.macrobeatGroupings = [...p], this.state.macrobeatBoundaryStyles = [...c], qe(this.state, e), S !== 0) {
        const I = [];
        this.state.placedNotes.forEach((m) => {
          const y = i(this.state, m.startColumnIndex, h), b = i(this.state, m.endColumnIndex, h);
          if (y === null || b === null)
            return;
          const x = y + S, D = b + S;
          if (x < 0) {
            I.push(m);
            return;
          }
          const T = g(this.state, x, p), v = g(this.state, D, p);
          if (T === null || v === null) {
            I.push(m);
            return;
          }
          m.startColumnIndex = T, m.endColumnIndex = v;
        }), I.forEach((m) => {
          const y = this.state.placedNotes.indexOf(m);
          y > -1 && this.state.placedNotes.splice(y, 1);
        });
        const d = [];
        this.state.sixteenthStampPlacements.forEach((m) => {
          const y = i(this.state, m.startColumn, h), b = i(this.state, m.endColumn, h);
          if (y === null || b === null)
            return;
          const x = y + S, D = b + S;
          if (x < 0) {
            d.push(m);
            return;
          }
          const T = g(this.state, x, p), v = g(this.state, D, p);
          if (T === null || v === null) {
            d.push(m);
            return;
          }
          m.startColumn = T, m.endColumn = v;
        }), d.forEach((m) => {
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
        const A = [], C = s ? p.length - h.length : -(h.length - p.length);
        this.state.modulationMarkers.forEach((m) => {
          const y = m.measureIndex + C;
          if (y < 0) {
            A.push(m);
            return;
          }
          m.measureIndex = y, m.columnIndex = null, m.xPosition = null, m.macrobeatIndex = null;
        }), A.forEach((m) => {
          const y = this.state.modulationMarkers.indexOf(m);
          y > -1 && this.state.modulationMarkers.splice(y, 1);
        });
      }
      this.emit("anacrusisChanged", s), this.emit("notesChanged"), this.emit("sixteenthStampPlacementsChanged"), this.emit("tripletStampPlacementsChanged"), this.emit("modulationMarkersChanged"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    toggleMacrobeatGrouping(s) {
      if (s === void 0 || s < 0 || s >= this.state.macrobeatGroupings.length) {
        r("error", "rhythmActions", `Invalid index for toggleMacrobeatGrouping: ${s}`, null, "state");
        return;
      }
      const h = [...this.state.macrobeatGroupings], f = h[s], a = f === 2 ? 3 : 2, p = a - f, c = [...h];
      c[s] = a;
      const l = t(this.state, s, h), S = [];
      this.state.placedNotes.forEach((n) => {
        const u = i(this.state, n.startColumnIndex, h), M = i(this.state, n.endColumnIndex, h);
        if (!(u === null || M === null) && u >= l) {
          const I = u + p, d = M + p, N = g(this.state, I, c), A = g(this.state, d, c);
          N !== null && A !== null ? (n.startColumnIndex = N, n.endColumnIndex = A) : S.push(n);
        }
      }), S.length && S.forEach((n) => {
        const u = this.state.placedNotes.indexOf(n);
        u > -1 && this.state.placedNotes.splice(u, 1);
      }), this.state.macrobeatGroupings = c, qe(this.state, e), this.emit("notesChanged"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    cycleMacrobeatBoundaryStyle(s) {
      if (s === void 0 || s < 0 || s >= this.state.macrobeatBoundaryStyles.length) {
        r("error", "rhythmActions", `Invalid index for cycleMacrobeatBoundaryStyle: ${s}`, null, "state");
        return;
      }
      const h = this._isBoundaryInAnacrusis(s);
      let f;
      h ? f = ["dashed", "solid", "anacrusis"] : f = ["dashed", "solid"];
      const a = this.state.macrobeatBoundaryStyles[s] ?? "dashed", p = f.indexOf(a), c = p === -1 ? 0 : (p + 1) % f.length, l = f[c] ?? "dashed";
      this.state.macrobeatBoundaryStyles[s] = l, this.emit("rhythmStructureChanged"), this.recordState();
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
        const s = this.state.macrobeatGroupings.length - 1, h = t(
          this.state,
          s - 1,
          this.state.macrobeatGroupings
        ), f = [];
        this.state.placedNotes.forEach((c) => {
          const l = i(this.state, c.startColumnIndex, this.state.macrobeatGroupings);
          l !== null && l >= h && f.push(c);
        }), f.forEach((c) => {
          const l = this.state.placedNotes.indexOf(c);
          l > -1 && this.state.placedNotes.splice(l, 1);
        });
        const a = [];
        this.state.sixteenthStampPlacements.forEach((c) => {
          const l = i(this.state, c.startColumn, this.state.macrobeatGroupings);
          l !== null && l >= h && a.push(c);
        }), a.forEach((c) => {
          const l = this.state.sixteenthStampPlacements.indexOf(c);
          l > -1 && this.state.sixteenthStampPlacements.splice(l, 1);
        });
        const p = [];
        this.state.tripletStampPlacements && (this.state.tripletStampPlacements.forEach((c) => {
          c.startTimeIndex >= h && p.push(c);
        }), p.forEach((c) => {
          const l = this.state.tripletStampPlacements.indexOf(c);
          l > -1 && this.state.tripletStampPlacements.splice(l, 1);
        })), this.state.macrobeatGroupings.pop(), this.state.macrobeatBoundaryStyles.pop(), f.length > 0 && this.emit("notesChanged"), a.length > 0 && this.emit("sixteenthStampPlacementsChanged"), p.length > 0 && this.emit("tripletStampPlacementsChanged"), this.emit("rhythmStructureChanged"), this.recordState();
      }
    },
    updateTimeSignature(s, h) {
      if (!Array.isArray(h) || h.length === 0) {
        r("error", "rhythmActions", "Invalid groupings provided to updateTimeSignature", null, "state");
        return;
      }
      let f = 0, a = 0, p = 0;
      for (let N = 0; N < this.state.macrobeatGroupings.length; N++) {
        if (p === s) {
          f = N;
          break;
        }
        const A = N === this.state.macrobeatGroupings.length - 1;
        (this.state.macrobeatBoundaryStyles[N] === "solid" || A) && p++;
      }
      p = 0;
      for (let N = 0; N < this.state.macrobeatGroupings.length; N++)
        if (p === s) {
          const A = N === this.state.macrobeatGroupings.length - 1;
          if (this.state.macrobeatBoundaryStyles[N] === "solid" || A) {
            a = N;
            break;
          }
        } else if (p < s) {
          const A = N === this.state.macrobeatGroupings.length - 1;
          (this.state.macrobeatBoundaryStyles[N] === "solid" || A) && p++;
        }
      const c = a - f + 1, l = h.length, S = this.state.macrobeatGroupings.slice(f, a + 1).reduce((N, A) => N + A, 0), u = h.reduce((N, A) => N + A, 0) - S, M = t(this.state, a, this.state.macrobeatGroupings);
      if (u !== 0) {
        const N = (() => {
          const C = [...this.state.macrobeatGroupings];
          return C.splice(f, c, ...h), C;
        })(), A = [];
        this.state.placedNotes.forEach((C) => {
          const m = i(this.state, C.startColumnIndex, this.state.macrobeatGroupings), y = i(this.state, C.endColumnIndex, this.state.macrobeatGroupings);
          if (!(m === null || y === null) && m >= M) {
            const b = m + u, x = y + u, D = g(this.state, b, N), T = g(this.state, x, N);
            D !== null && T !== null ? (C.startColumnIndex = D, C.endColumnIndex = T) : A.push(C);
          }
        }), A.length && A.forEach((C) => {
          const m = this.state.placedNotes.indexOf(C);
          m > -1 && this.state.placedNotes.splice(m, 1);
        });
      }
      const I = [...h], d = new Array(Math.max(l - 1, 0)).fill("dashed");
      if (a < this.state.macrobeatBoundaryStyles.length) {
        const N = this.state.macrobeatBoundaryStyles[a] ?? "dashed";
        d.push(N);
      }
      this.state.macrobeatGroupings.splice(f, c, ...I), this.state.macrobeatBoundaryStyles.splice(f, c - 1, ...d), this.emit("notesChanged"), this.emit("rhythmStructureChanged"), this.recordState();
    },
    addModulationMarker(s, h, f = null, a = null, p = null) {
      if (!Object.values(Q).includes(h))
        return r("error", "rhythmActions", `Invalid modulation ratio: ${h}`, null, "state"), null;
      const c = this.state.modulationMarkers.findIndex((S) => S.measureIndex === s || p !== null && S.macrobeatIndex === p || a !== null && S.columnIndex === a);
      if (c !== -1) {
        const S = this.state.modulationMarkers[c];
        return r("info", "rhythmActions", `Replacing existing modulation marker ${S.id} at measure ${s} (old ratio: ${S.ratio}, new ratio: ${h})`, null, "state"), S.ratio = h, S.xPosition = f, a !== null && (S.columnIndex = a), p !== null && (S.macrobeatIndex = p), this.emit("modulationMarkersChanged"), this.recordState(), S.id;
      }
      const l = bt(s, h, f, a, p);
      return this.state.modulationMarkers.push(l), this.state.modulationMarkers.sort((S, n) => S.measureIndex - n.measureIndex), this.emit("modulationMarkersChanged"), this.recordState(), r("info", "rhythmActions", `Added modulation marker ${l.id} at measure ${s} with ratio=${h}, columnIndex=${a}`, null, "state"), l.id;
    },
    removeModulationMarker(s) {
      const h = this.state.modulationMarkers.findIndex((f) => f.id === s);
      if (h === -1) {
        r("warn", "rhythmActions", `Modulation marker not found: ${s}`, null, "state");
        return;
      }
      this.state.modulationMarkers.splice(h, 1), this.emit("modulationMarkersChanged"), this.recordState(), r("info", "rhythmActions", `Removed modulation marker ${s}`, null, "state");
    },
    setModulationRatio(s, h) {
      if (!Object.values(Q).includes(h)) {
        r("error", "rhythmActions", `Invalid modulation ratio: ${h}`, null, "state");
        return;
      }
      const f = this.state.modulationMarkers.find((a) => a.id === s);
      if (!f) {
        r("warn", "rhythmActions", `Modulation marker not found: ${s}`, null, "state");
        return;
      }
      f.ratio = h, this.emit("modulationMarkersChanged"), this.recordState(), r("info", "rhythmActions", `Updated modulation marker ${s} ratio to ${h}`, null, "state");
    },
    moveModulationMarker(s, h) {
      const f = this.state.modulationMarkers.find((a) => a.id === s);
      if (!f) {
        r("warn", "rhythmActions", `Modulation marker not found: ${s}`, null, "state");
        return;
      }
      f.measureIndex = h, this.state.modulationMarkers.sort((a, p) => a.measureIndex - p.measureIndex), this.emit("modulationMarkersChanged"), this.recordState(), r("info", "rhythmActions", `Moved modulation marker ${s} to measure ${h}`, null, "state");
    },
    toggleModulationMarker(s) {
      const h = this.state.modulationMarkers.find((f) => f.id === s);
      if (!h) {
        r("warn", "rhythmActions", `Modulation marker not found: ${s}`, null, "state");
        return;
      }
      h.active = !h.active, this.emit("modulationMarkersChanged"), this.recordState(), r("info", "rhythmActions", `Toggled modulation marker ${s} active state to ${h.active}`, null, "state");
    },
    clearModulationMarkers() {
      const s = this.state.modulationMarkers.length;
      this.state.modulationMarkers = [], this.emit("modulationMarkersChanged"), this.recordState(), r("info", "rhythmActions", `Cleared ${s} modulation markers`, null, "state");
    }
  };
}
function He(o) {
  const e = JSON.parse(JSON.stringify(o));
  for (const i in e) {
    const g = e[i];
    g.coeffs && typeof g.coeffs == "object" && !Array.isArray(g.coeffs) ? g.coeffs = new Float32Array(Object.values(g.coeffs)) : Array.isArray(g.coeffs) && (g.coeffs = new Float32Array(g.coeffs)), g.phases && typeof g.phases == "object" && !Array.isArray(g.phases) ? g.phases = new Float32Array(Object.values(g.phases)) : Array.isArray(g.phases) && (g.phases = new Float32Array(g.phases));
  }
  return e;
}
function xt(o, e) {
  if (o)
    try {
      const i = o.getItem(e);
      if (i === null)
        return;
      const g = JSON.parse(i);
      if (g.timbres)
        for (const t in g.timbres) {
          const r = g.timbres[t];
          if (r.coeffs && typeof r.coeffs == "object") {
            const s = Array.isArray(r.coeffs) ? r.coeffs : Object.values(r.coeffs);
            r.coeffs = new Float32Array(s);
          }
          if (r.phases && typeof r.phases == "object") {
            const s = Array.isArray(r.phases) ? r.phases : Object.values(r.phases);
            r.phases = new Float32Array(s);
          }
        }
      if (g.pitchRange) {
        const t = z.length, r = Math.max(0, t - 1), s = Math.max(0, Math.min(r, g.pitchRange.topIndex ?? 0)), h = Math.max(s, Math.min(r, g.pitchRange.bottomIndex ?? r));
        g.pitchRange = { topIndex: s, bottomIndex: h };
      }
      if ("playheadMode" in g) {
        const t = g.playheadMode;
        t !== "cursor" && t !== "microbeat" && t !== "macrobeat" && delete g.playheadMode;
      }
      return g.fullRowData = [...z], g;
    } catch {
      return;
    }
}
function Pt(o, e, i) {
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
        for (const s in o.timbres) {
          const h = o.timbres[s], f = (g = t.timbres) == null ? void 0 : g[s];
          h != null && h.coeffs && f && (f.coeffs = Array.from(h.coeffs)), h != null && h.phases && f && (f.phases = Array.from(h.phases));
        }
      const r = JSON.stringify(t);
      e.setItem(i, r);
    } catch {
    }
}
function Et(o = {}) {
  const {
    storageKey: e = "studentNotationState",
    storage: i,
    initialState: g,
    onClearState: t,
    noteActionCallbacks: r = {},
    sixteenthStampActionCallbacks: s = {},
    tripletStampActionCallbacks: h = {},
    rhythmActionCallbacks: f = {}
  } = o, a = {}, p = xt(i, e), c = !p, n = {
    state: {
      ...gt(),
      ...p,
      ...g
    },
    isColdStart: c,
    on(u, M) {
      a[u] || (a[u] = []), a[u].push(M);
    },
    off(u, M) {
      if (a[u]) {
        const I = a[u].indexOf(M);
        I > -1 && a[u].splice(I, 1);
      }
    },
    emit(u, M) {
      a[u] && a[u].forEach((I) => {
        try {
          I(M);
        } catch (d) {
          console.error(`Error in listener for event "${u}"`, d);
        }
      });
    },
    dispose() {
      for (const u in a)
        delete a[u];
    },
    saveState() {
      Pt(n.state, i, e);
    },
    // ========== HISTORY ACTIONS ==========
    recordState() {
      n.state.history = n.state.history.slice(0, n.state.historyIndex + 1);
      const u = JSON.parse(JSON.stringify(n.state.timbres)), M = {
        notes: JSON.parse(JSON.stringify(n.state.placedNotes)),
        tonicSignGroups: JSON.parse(JSON.stringify(n.state.tonicSignGroups)),
        placedChords: JSON.parse(JSON.stringify(n.state.placedChords)),
        sixteenthStampPlacements: JSON.parse(JSON.stringify(n.state.sixteenthStampPlacements)),
        tripletStampPlacements: JSON.parse(JSON.stringify(n.state.tripletStampPlacements || [])),
        timbres: u,
        annotations: n.state.annotations ? JSON.parse(JSON.stringify(n.state.annotations)) : [],
        lassoSelection: JSON.parse(JSON.stringify(n.state.lassoSelection))
      };
      n.state.history.push(M), n.state.historyIndex++, n.emit("historyChanged"), n.saveState();
    },
    undo() {
      var u;
      if (n.state.historyIndex > 0) {
        n.state.historyIndex--;
        const M = n.state.history[n.state.historyIndex];
        if (!M) return;
        n.state.placedNotes = JSON.parse(JSON.stringify(M.notes)), n.state.tonicSignGroups = JSON.parse(JSON.stringify(M.tonicSignGroups)), n.state.sixteenthStampPlacements = JSON.parse(JSON.stringify(M.sixteenthStampPlacements || [])), n.state.tripletStampPlacements = JSON.parse(JSON.stringify(M.tripletStampPlacements || [])), n.state.timbres = He(M.timbres), n.state.annotations = M.annotations ? JSON.parse(JSON.stringify(M.annotations)) : [], n.emit("notesChanged"), n.emit("sixteenthStampPlacementsChanged"), n.emit("tripletStampPlacementsChanged"), n.emit("rhythmStructureChanged"), (u = n.state.selectedNote) != null && u.color && n.emit("timbreChanged", n.state.selectedNote.color), n.emit("annotationsChanged"), n.emit("historyChanged");
      }
    },
    redo() {
      var u;
      if (n.state.historyIndex < n.state.history.length - 1) {
        n.state.historyIndex++;
        const M = n.state.history[n.state.historyIndex];
        if (!M) return;
        n.state.placedNotes = JSON.parse(JSON.stringify(M.notes)), n.state.tonicSignGroups = JSON.parse(JSON.stringify(M.tonicSignGroups)), n.state.sixteenthStampPlacements = JSON.parse(JSON.stringify(M.sixteenthStampPlacements || [])), n.state.tripletStampPlacements = JSON.parse(JSON.stringify(M.tripletStampPlacements || [])), n.state.timbres = He(M.timbres), n.state.annotations = M.annotations ? JSON.parse(JSON.stringify(M.annotations)) : [], n.emit("notesChanged"), n.emit("sixteenthStampPlacementsChanged"), n.emit("tripletStampPlacementsChanged"), n.emit("rhythmStructureChanged"), (u = n.state.selectedNote) != null && u.color && n.emit("timbreChanged", n.state.selectedNote.color), n.emit("annotationsChanged"), n.emit("historyChanged");
      }
    },
    clearSavedState() {
      i && (i.removeItem(e), i.removeItem("effectDialValues")), t && t();
    },
    // ========== VIEW ACTIONS ==========
    setPlaybackState(u, M) {
      n.state.isPlaying = u, n.state.isPaused = M, n.emit("playbackStateChanged", { isPlaying: u, isPaused: M });
    },
    setLooping(u) {
      n.state.isLooping = u, n.emit("loopingChanged", u);
    },
    setTempo(u) {
      n.state.tempo = u, n.emit("tempoChanged", u);
    },
    setPlayheadMode(u) {
      n.state.playheadMode = u, n.emit("playheadModeChanged", u);
    },
    setSelectedTool(u, M) {
      const I = n.state.selectedTool;
      if (n.state.previousTool = I, n.state.selectedTool = u, M !== void 0) {
        const d = typeof M == "string" ? parseInt(M, 10) : M;
        isNaN(d) || (n.state.selectedToolTonicNumber = d);
      }
      n.emit("toolChanged", { newTool: u, oldTool: I });
    },
    setSelectedNote(u, M) {
      const I = { ...n.state.selectedNote };
      n.state.selectedNote = { shape: u, color: M }, n.emit("noteChanged", { newNote: n.state.selectedNote, oldNote: I });
    },
    setPitchRange(u) {
      n.state.pitchRange = { ...n.state.pitchRange, ...u }, n.emit("pitchRangeChanged", n.state.pitchRange);
    },
    setDegreeDisplayMode(u) {
      n.state.degreeDisplayMode = u, n.emit("degreeDisplayModeChanged", u);
    },
    setLongNoteStyle(u) {
      n.state.longNoteStyle = u, n.emit("longNoteStyleChanged", u);
    },
    toggleAccidentalMode(u) {
      n.state.accidentalMode[u] = !n.state.accidentalMode[u], n.emit("accidentalModeChanged", n.state.accidentalMode);
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
    setLayoutConfig(u) {
      u.cellWidth !== void 0 && (n.state.cellWidth = u.cellWidth), u.cellHeight !== void 0 && (n.state.cellHeight = u.cellHeight), u.columnWidths !== void 0 && (n.state.columnWidths = u.columnWidths), n.emit("layoutConfigChanged", u);
    },
    setDeviceProfile(u) {
      n.state.deviceProfile = { ...n.state.deviceProfile, ...u }, n.emit("deviceProfileChanged", n.state.deviceProfile);
    },
    setPrintPreviewActive(u) {
      n.state.isPrintPreviewActive = u, n.emit("printPreviewStateChanged", u);
    },
    setPrintOptions(u) {
      n.state.printOptions = { ...n.state.printOptions, ...u }, n.emit("printOptionsChanged", n.state.printOptions);
    },
    setAdsrTimeAxisScale(u) {
      n.state.adsrTimeAxisScale = u, n.emit("adsrTimeAxisScaleChanged", u);
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
      n.state.keySignature = u, n.emit("keySignatureChanged", u);
    },
    // ========== HARMONY ACTIONS ==========
    setActiveChordIntervals(u) {
      n.state.activeChordIntervals = u, n.emit("activeChordIntervalsChanged", u);
    },
    setIntervalsInversion(u) {
      n.state.isIntervalsInverted = u, n.emit("intervalsInversionChanged", u);
    },
    setChordPosition(u) {
      n.state.chordPositionState = u, n.emit("chordPositionChanged", u);
    },
    // ========== TIMBRE ACTIONS ==========
    setADSR(u, M) {
      n.state.timbres[u] && (n.state.timbres[u].adsr = { ...n.state.timbres[u].adsr, ...M }, n.emit("timbreChanged", u));
    },
    setHarmonicCoefficients(u, M) {
      n.state.timbres[u] && (n.state.timbres[u].coeffs = M, n.emit("timbreChanged", u));
    },
    setHarmonicPhases(u, M) {
      n.state.timbres[u] && (n.state.timbres[u].phases = M, n.emit("timbreChanged", u));
    },
    setFilterSettings(u, M) {
      n.state.timbres[u] && (n.state.timbres[u].filter = { ...n.state.timbres[u].filter, ...M }, n.emit("timbreChanged", u));
    },
    applyPreset(u, M) {
      n.state.timbres[u] && (Object.assign(n.state.timbres[u], M), n.emit("timbreChanged", u));
    },
    // ========== NOTE ACTIONS ==========
    // Extracted from note actions module
    ...St(r),
    // ========== SIXTEENTH STAMP ACTIONS ==========
    // Extracted from sixteenth stamp actions module
    ...Ct(s),
    // ========== TRIPLET STAMP ACTIONS ==========
    // Extracted from triplet stamp actions module
    ...Nt(h),
    // ========== RHYTHM ACTIONS ==========
    // Extracted from rhythm actions module
    ...It(f)
  };
  return i && (n.on("tempoChanged", () => n.saveState()), n.on("degreeDisplayModeChanged", () => n.saveState()), n.on("longNoteStyleChanged", () => n.saveState()), n.on("playheadModeChanged", () => n.saveState())), c && i && n.saveState(), n;
}
function Ot(o = {}) {
  const {
    getPlacedTonicSigns: e = () => [],
    sideColumnWidth: i = 0.25,
    beatColumnWidth: g = 1
  } = o;
  let t = null, r = null;
  function s(c) {
    const S = e(c).map((n) => `${n.columnIndex}:${n.preMacrobeatIndex}:${n.uuid || ""}`).sort().join("|");
    return {
      macrobeatGroupings: [...c.macrobeatGroupings],
      tonicSignsHash: S,
      macrobeatBoundaryStyles: [...c.macrobeatBoundaryStyles]
    };
  }
  function h(c) {
    return r ? r.tonicSignsHash === c.tonicSignsHash && JSON.stringify(r.macrobeatGroupings) === JSON.stringify(c.macrobeatGroupings) && JSON.stringify(r.macrobeatBoundaryStyles) === JSON.stringify(c.macrobeatBoundaryStyles) : !1;
  }
  function f(c) {
    const { macrobeatGroupings: l, macrobeatBoundaryStyles: S } = c, u = [...e(c)].sort((P, F) => P.preMacrobeatIndex - F.preMacrobeatIndex), M = [], I = [];
    let d = 0, N = 0, A = 0, C = 0, m = 0;
    const y = (P) => {
      var F;
      for (; m < u.length; ) {
        const E = u[m];
        if (!E || E.preMacrobeatIndex !== P) break;
        const G = E.uuid || "";
        for (let B = 0; B < 2; B++)
          M.push({
            visualIndex: d,
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
            tonicSignUuid: B === 0 ? G : null
            // Only first column stores UUID
          }), d++, N++, C += g;
        const L = G;
        do
          m++;
        while (m < u.length && (((F = u[m]) == null ? void 0 : F.uuid) || "") === L);
      }
    };
    for (let P = 0; P < 2; P++)
      M.push({
        visualIndex: d,
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
      }), d++, C += i;
    y(-1), l.forEach((P, F) => {
      for (let G = 0; G < P; G++)
        M.push({
          visualIndex: d,
          canvasIndex: N,
          timeIndex: A,
          type: "beat",
          widthMultiplier: g,
          xOffsetUnmodulated: C,
          macrobeatIndex: F,
          beatInMacrobeat: G,
          isMacrobeatStart: G === 0,
          isMacrobeatEnd: G === P - 1,
          isPlayable: !0,
          tonicSignUuid: null
        }), d++, N++, A++, C += g;
      const E = S[F] || "dashed";
      I.push({
        macrobeatIndex: F,
        visualColumn: d - 1,
        canvasColumn: N - 1,
        timeColumn: A - 1,
        boundaryType: E,
        isMeasureStart: E === "solid"
      }), y(F);
    });
    for (let P = 0; P < 2; P++)
      M.push({
        visualIndex: d,
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
      }), d++, C += i;
    const b = /* @__PURE__ */ new Map(), x = /* @__PURE__ */ new Map(), D = /* @__PURE__ */ new Map(), T = /* @__PURE__ */ new Map(), v = /* @__PURE__ */ new Map(), O = /* @__PURE__ */ new Map();
    return M.forEach((P) => {
      b.set(P.visualIndex, P.canvasIndex), x.set(P.visualIndex, P.timeIndex), P.canvasIndex !== null && (D.set(P.canvasIndex, P.visualIndex), T.set(P.canvasIndex, P.timeIndex)), P.timeIndex !== null && (P.canvasIndex !== null && v.set(P.timeIndex, P.canvasIndex), O.set(P.timeIndex, P.visualIndex));
    }), {
      entries: M,
      visualToCanvas: b,
      visualToTime: x,
      canvasToVisual: D,
      canvasToTime: T,
      timeToCanvas: v,
      timeToVisual: O,
      macrobeatBoundaries: I,
      totalVisualColumns: d,
      totalCanvasColumns: N,
      totalTimeColumns: A,
      totalWidthUnmodulated: C
    };
  }
  function a(c) {
    const l = s(c);
    return t && h(l) || (t = f(c), r = l), t;
  }
  function p() {
    t = null, r = null;
  }
  return {
    getColumnMap: a,
    invalidate: p,
    buildColumnMap: f
  };
}
function Cn(o, e) {
  return e.visualToCanvas.get(o) ?? null;
}
function Dt(o, e) {
  return e.visualToTime.get(o) ?? null;
}
function Tn(o, e) {
  const i = e.canvasToVisual.get(o);
  return i !== void 0 ? i : o + 2;
}
function Nn(o, e) {
  return e.canvasToTime.get(o) ?? null;
}
function An(o, e) {
  const i = e.timeToCanvas.get(o);
  return i !== void 0 ? i : o;
}
function Ft(o, e) {
  const i = e.timeToVisual.get(o);
  return i !== void 0 ? i : o + 2;
}
function Bt(o, e) {
  if (o == null) return 0;
  let i = 0;
  for (let g = 0; g <= o && g < e.length; g++) {
    const t = e[g];
    typeof t == "number" && (i += t);
  }
  return i;
}
function bn(o, e) {
  return e.entries[o] || null;
}
function Ye(o, e) {
  const i = e.canvasToVisual.get(o);
  return i !== void 0 && e.entries[i] || null;
}
function vn(o, e) {
  const i = Ye(o, e);
  return (i == null ? void 0 : i.isPlayable) ?? !1;
}
function Mn(o, e) {
  const i = Ye(o, e);
  return (i == null ? void 0 : i.type) ?? null;
}
function wn(o, e) {
  return e.macrobeatBoundaries.find((i) => i.macrobeatIndex === o) || null;
}
function In(o) {
  const e = [];
  for (const i of o.entries)
    i.canvasIndex !== null && (e[i.canvasIndex] = i.widthMultiplier);
  return e;
}
function xn(o) {
  let e = 0;
  for (const i of o.entries)
    i.canvasIndex !== null && (e += i.widthMultiplier);
  return e;
}
function Pn() {
  let o = !1, e = null, i = null, g = null, t = null, r = !1;
  const s = (a, p, c, l, S) => {
    if (!r && a === "debug") return;
    const n = `[engine:${p}]`;
    console[a](n, c, l || "");
  }, h = (a, p, c) => {
    s(a, "controller", p, c);
  };
  return {
    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    init(a) {
      if (o) {
        s("warn", "controller", "Engine already initialized");
        return;
      }
      r = a.debug || !1, s("info", "controller", "Initializing engine"), g = a.pitchGridContext || null, t = a.drumGridContext || null, i = Ot({
        getPlacedTonicSigns: (c) => {
          if (!e) return [];
          const l = [];
          for (const S of Object.values(c.tonicSignGroups || {}))
            l.push(...S);
          return l;
        }
      });
      let p = a.storage;
      !p && typeof window < "u" && window.localStorage && (p = window.localStorage), e = Et({
        storageKey: a.storageKey || "studentNotationState",
        storage: p,
        initialState: a.initialState,
        noteActionCallbacks: {
          log: h
        },
        rhythmActionCallbacks: {
          getColumnMap: (c) => i.getColumnMap(c),
          visualToTimeIndex: (c, l, S) => Dt(l, i.getColumnMap(c)),
          timeIndexToVisualColumn: (c, l, S) => Ft(l, i.getColumnMap(c)),
          getTimeBoundaryAfterMacrobeat: (c, l, S) => Bt(l, S),
          log: h
        },
        sixteenthStampActionCallbacks: {
          log: h
        },
        tripletStampActionCallbacks: {
          canvasToTime: (c, l) => l.canvasToTime.get(c) ?? null,
          timeToCanvas: (c, l) => l.timeToCanvas.get(c) ?? 0,
          getColumnMap: (c) => i.getColumnMap(c),
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
      }), o = !0, s("info", "controller", "Engine initialized successfully"), (g || t) && this.render();
    },
    dispose() {
      o && (s("info", "controller", "Disposing engine"), e && (e.dispose(), e = null), i = null, g = null, t = null, o = !1);
    },
    isInitialized() {
      return o;
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
      const p = e.state.selectedNote.color;
      e.setSelectedNote(a, p);
    },
    setNoteColor(a) {
      if (!e) return;
      const p = e.state.selectedNote.shape;
      e.setSelectedNote(p, a);
    },
    // ============================================================================
    // NOTE MANIPULATION
    // ============================================================================
    insertNote(a, p, c) {
      if (!e) return null;
      const l = {
        row: a,
        startColumnIndex: p,
        endColumnIndex: c ?? p,
        shape: e.state.selectedNote.shape,
        color: e.state.selectedNote.color
      };
      return e.addNote(l);
    },
    deleteNote(a) {
      if (!e) return !1;
      const p = e.state.placedNotes.find((c) => c.uuid === a);
      return p ? (e.removeNote(p), !0) : !1;
    },
    deleteSelection() {
      if (!e) return;
      const a = e.state.lassoSelection;
      if (!a.isActive || a.selectedItems.length === 0) return;
      const p = a.selectedItems.filter((c) => c.type === "note").map((c) => e.state.placedNotes.find((l) => l.uuid === c.id)).filter((c) => c !== void 0);
      p.length > 0 && e.removeMultipleNotes(p), this.clearSelection();
    },
    moveNote(a, p, c) {
      if (!e) return;
      const l = e.state.placedNotes.find((S) => S.uuid === a);
      l && (e.updateNoteRow(l, p), e.updateNotePosition(l, c));
    },
    setNoteTail(a, p) {
      if (!e) return;
      const c = e.state.placedNotes.find((l) => l.uuid === a);
      c && e.updateNoteTail(c, p);
    },
    clearAllNotes() {
      e && e.clearAllNotes();
    },
    // ============================================================================
    // SELECTION
    // ============================================================================
    setSelection(a) {
      if (!e) return;
      const p = a.map((c) => {
        if (c.type === "note") {
          const l = e.state.placedNotes.find((S) => S.uuid === c.id);
          return l ? { type: "note", id: c.id, data: l } : null;
        } else if (c.type === "sixteenthStamp") {
          const l = e.state.sixteenthStampPlacements.find((S) => S.id === c.id);
          return l ? { type: "sixteenthStamp", id: c.id, data: l } : null;
        } else if (c.type === "tripletStamp") {
          const l = e.state.tripletStampPlacements.find((S) => S.id === c.id);
          return l ? { type: "tripletStamp", id: c.id, data: l } : null;
        }
        return null;
      }).filter((c) => c !== null);
      e.state.lassoSelection = {
        isActive: p.length > 0,
        selectedItems: p,
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
      const a = e.state.placedNotes.map((p) => ({
        type: "note",
        id: p.uuid,
        data: p
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
    setMacrobeatGrouping(a, p) {
      if (!e) return;
      e.state.macrobeatGroupings[a] !== p && e.toggleMacrobeatGrouping(a);
    },
    toggleAnacrusis() {
      e && e.setAnacrusis(!e.state.hasAnacrusis);
    },
    addModulationMarker(a, p) {
      return e ? e.addModulationMarker(a, p) : null;
    },
    removeModulationMarker(a) {
      e && e.removeModulationMarker(a);
    },
    // ============================================================================
    // VIEW
    // ============================================================================
    setPitchRange(a, p) {
      e && e.setPitchRange({ topIndex: a, bottomIndex: p });
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
    setTimbreADSR(a, p) {
      e && e.setADSR(a, p);
    },
    setTimbreHarmonics(a, p) {
      e && e.setHarmonicCoefficients(a, new Float32Array(p));
    },
    setTimbreFilter(a, p) {
      e && e.setFilterSettings(a, p);
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
    getNoteAt(a, p) {
      return e && e.state.placedNotes.find(
        (c) => c.row === a && c.startColumnIndex <= p && c.endColumnIndex >= p
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
      const a = "uuid,row,startColumn,endColumn,color,shape", p = e.state.placedNotes.map(
        (c) => `${c.uuid},${c.row},${c.startColumnIndex},${c.endColumnIndex},${c.color},${c.shape}`
      );
      return [a, ...p].join(`
`);
    },
    importCSV(a) {
      if (!e) return;
      const p = a.split(`
`).filter((S) => S.trim());
      if (p.length === 0) return;
      const l = p.slice(1).map((S) => {
        const [n, u, M, I, d, N] = S.split(",");
        return {
          uuid: n,
          row: parseInt(u || "0", 10),
          startColumnIndex: parseInt(M || "0", 10),
          endColumnIndex: parseInt(I || "0", 10),
          color: d || "blue",
          shape: N || "circle"
        };
      });
      e.loadNotes(l);
    },
    exportState() {
      return e ? JSON.stringify(e.state, null, 2) : "{}";
    },
    importState(a) {
      if (e)
        try {
          const p = JSON.parse(a);
          Object.assign(e.state, p), e.emit("stateImported", p), this.render();
        } catch (p) {
          s("error", "import", "Failed to import state", p);
        }
    },
    // ============================================================================
    // EVENTS
    // ============================================================================
    on(a, p) {
      e && e.on(a, p);
    },
    off(a, p) {
      e && e.off(a, p);
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
      !t || !e || !i || s("debug", "controller", "renderDrumGrid called - canvas rendering not yet wired");
    }
  };
}
function En(o) {
  throw new Error("Not yet implemented - will be in @mlt/tutorial-runtime package");
}
let oe = null;
function On(o) {
  oe = o;
}
class Rt extends w.Synth {
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
    var S, n;
    if (!this.vibratoLFO || !this.vibratoGain) return;
    const t = i.speed / 100 * 16, s = (((n = (S = w.getContext()) == null ? void 0 : S.rawContext) == null ? void 0 : n.state) ?? w.context.state) === "running";
    if (i.speed === 0 || i.span === 0) {
      s && this.vibratoLFO.state === "started" && this.vibratoLFO.stop(g), this.vibratoLFO.frequency.value = 0, this.vibratoGain.gain.value = 0;
      return;
    }
    s && this.vibratoLFO.state !== "started" && this.vibratoLFO.start(g), this.vibratoLFO.frequency.value = t;
    const f = i.span / 100 * 50, a = f / 1200, l = 440 * (Math.pow(2, a) - 1);
    this.vibratoGain.gain.value = l, oe == null || oe.debug("FilteredVoice", "Vibrato gain set", { hzDeviation: l, centsAmplitude: f }, "audio");
  }
  _setTremolo(i, g = w.now()) {
    var p, c;
    if (!this.tremoloLFO || !this.tremoloGain) return;
    const t = i.speed / 100 * 16, s = (((c = (p = w.getContext()) == null ? void 0 : p.rawContext) == null ? void 0 : c.state) ?? w.context.state) === "running";
    if (i.speed === 0 || i.span === 0) {
      s && this.tremoloLFO.state === "started" && this.tremoloLFO.stop(g), this.tremoloLFO.frequency.value = 0, this.tremoloGain.gain.cancelScheduledValues(g), this.tremoloGain.gain.value = 1;
      return;
    }
    s && this.tremoloLFO.state !== "started" && this.tremoloLFO.start(g), this.tremoloLFO.frequency.value = t;
    const h = i.span / 100, f = Math.max(0, 1 - h), a = 1;
    this.tremoloDepth.min = f, this.tremoloDepth.max = a;
  }
  _setFilter(i) {
    this.wetDryFade.fade.value = i.enabled ? 1 : 0;
    const g = w.Midi(i.cutoff + 35).toFrequency(), t = i.resonance / 100 * 12 + 0.1;
    this.hpFilter.set({ frequency: g, Q: t }), this.lpFilterForBP.set({ frequency: g, Q: t }), this.lpFilterSolo.set({ frequency: g, Q: t });
    const r = i.blend;
    r <= 1 ? (this.main_fade.fade.value = 0, this.hp_bp_fade.fade.value = r) : (this.main_fade.fade.value = r - 1, this.hp_bp_fade.fade.value = 1);
  }
}
const Ke = {
  polyphonyReference: 32,
  smoothingTauMs: 200,
  masterGainRampMs: 50,
  gainUpdateIntervalMs: 16
};
function Qe(o = Ke.polyphonyReference) {
  return 1 / Math.sqrt(o);
}
class Gt {
  constructor(e, i = {}) {
    V(this, "masterGain");
    V(this, "options");
    V(this, "perVoiceBaselineGain");
    V(this, "activeVoiceCount", 0);
    V(this, "smoothedVoiceCount");
    V(this, "gainUpdateLoopId", null);
    this.masterGain = e, this.options = { ...Ke, ...i }, this.perVoiceBaselineGain = Qe(this.options.polyphonyReference), this.smoothedVoiceCount = this.options.polyphonyReference;
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
    const { polyphonyReference: e, smoothingTauMs: i, masterGainRampMs: g, gainUpdateIntervalMs: t } = this.options, r = w.now();
    if (this.activeVoiceCount === 0) {
      this.smoothedVoiceCount = 0.01 * e + (1 - 0.01) * this.smoothedVoiceCount;
      return;
    }
    const s = t / 1e3, h = 1 - Math.exp(-s / (i / 1e3)), f = Math.max(1, this.activeVoiceCount);
    this.smoothedVoiceCount = h * f + (1 - h) * this.smoothedVoiceCount;
    const a = Math.sqrt(e / this.smoothedVoiceCount), p = this.perVoiceBaselineGain * a;
    this.masterGain.gain.rampTo(p, g / 1e3, r);
  }
}
const Lt = {
  clippingWarningThresholdDb: -3,
  clippingMonitorIntervalMs: 500,
  clippingWarningCooldownMs: 2e3
};
class _t {
  constructor(e, i = {}) {
    V(this, "meter");
    V(this, "options");
    V(this, "clippingMonitorId", null);
    V(this, "lastClippingWarningAt", 0);
    this.meter = e, this.options = { ...Lt, ...i };
  }
  start() {
    this.stop(), this.lastClippingWarningAt = 0, this.clippingMonitorId = setInterval(() => {
      var t, r;
      const e = this.meter.getValue(), i = Array.isArray(e) ? e[0] : e;
      if (i === void 0 || i <= this.options.clippingWarningThresholdDb)
        return;
      const g = Date.now();
      g - this.lastClippingWarningAt < this.options.clippingWarningCooldownMs || (this.lastClippingWarningAt = g, (r = (t = this.options).onWarning) == null || r.call(t, i));
    }, this.options.clippingMonitorIntervalMs);
  }
  stop() {
    this.clippingMonitorId !== null && (clearInterval(this.clippingMonitorId), this.clippingMonitorId = null);
  }
}
function Dn(o) {
  const {
    timbres: e,
    masterVolume: i = 0,
    effectsManager: g,
    harmonicFilter: t,
    logger: r,
    audioInit: s,
    getDrumVolume: h
  } = o, f = {};
  let a = null, p = null, c = null, l = null, S = null, n = {}, u = null, M = null;
  const I = { ...e }, d = r ?? {
    debug: () => {
    },
    info: () => {
    },
    warn: () => {
    }
  };
  function N(m) {
    if (t)
      return t.getFilteredCoefficients(m);
    const y = I[m];
    return y != null && y.coeffs ? y.coeffs : new Float32Array([0, 1]);
  }
  function A(m) {
    const y = m.reduce((b, x) => b + Math.abs(x), 0);
    return y > 1 ? Array.from(m).map((b) => b / y) : Array.from(m);
  }
  const C = {
    init() {
      this.stopBackgroundMonitors(), a = new w.Gain(Qe()), u = new Gt(a), u.start(), p = new w.Volume(i), c = new w.Compressor({
        threshold: -12,
        ratio: 3,
        attack: 0.01,
        release: 0.1,
        knee: 6
      }), l = new w.Limiter(-3), S = new w.Meter(), a.connect(p), p.connect(c), c.connect(l), l.toDestination(), l.connect(S), S && (M = new _t(S, {
        onWarning: (m) => {
          d.warn("SynthEngine", "Limiter input approaching clipping threshold", { level: m }, "audio");
        }
      }), M.start());
      for (const m in I) {
        const y = I[m];
        if (!y) continue;
        y.vibrato || (y.vibrato = { speed: 0, span: 0 }), y.tremelo || (y.tremelo = { speed: 0, span: 0 });
        const b = N(m), x = A(b), D = y.gain || 1, T = new w.PolySynth({
          voice: Rt,
          options: {
            oscillator: { type: "custom", partials: x },
            envelope: y.adsr,
            filter: y.filter,
            vibrato: y.vibrato,
            tremelo: y.tremelo,
            gain: D
          }
        }).connect(a);
        g && a && g.applySynthEffects(T, m, a);
        const v = T.triggerAttack.bind(T);
        T.triggerAttack = function(...O) {
          const P = v(...O);
          return setTimeout(() => {
            const F = this._activeVoices;
            g ? F && F.size > 0 ? F.forEach((E) => {
              E.effectsApplied || (g.applyEffectsToVoice(E, m), E.effectsApplied = !0);
            }) : this._voices && Array.isArray(this._voices) && this._voices.forEach((E) => {
              E && !E.effectsApplied && (g.applyEffectsToVoice(E, m), E.effectsApplied = !0);
            }) : F && F.size > 0 ? F.forEach((E) => {
              E._setVibrato && E.vibratoApplied !== !0 && (E._setVibrato(this._currentVibrato), E.vibratoApplied = !0), E._setTremolo && E.tremoloApplied !== !0 && (E._setTremolo(this._currentTremolo), E.tremoloApplied = !0);
            }) : this._voices && Array.isArray(this._voices) && this._voices.forEach((E) => {
              E != null && E._setVibrato && E.vibratoApplied !== !0 && (E._setVibrato(this._currentVibrato), E.vibratoApplied = !0), E != null && E._setTremolo && E.tremoloApplied !== !0 && (E._setTremolo(this._currentTremolo), E.tremoloApplied = !0);
            });
          }, 10), P;
        }, T._currentVibrato = y.vibrato, T._currentTremolo = y.tremelo, T._currentFilter = y.filter, f[m] = T, d.debug("SynthEngine", `Created filtered synth for color: ${m}`, null, "audio");
      }
      d.info("SynthEngine", "Initialized with multi-timbral support", null, "audio");
    },
    updateSynthForColor(m) {
      const y = I[m], b = f[m];
      if (!b || !y) return;
      y.vibrato || (y.vibrato = { speed: 0, span: 0 }), y.tremelo || (y.tremelo = { speed: 0, span: 0 }), d.debug("SynthEngine", `Updating timbre for color ${m}`, null, "audio");
      const x = N(m), D = A(x);
      b.set({
        oscillator: { partials: D },
        envelope: y.adsr
      }), g && a && g.applySynthEffects(b, m, a), b._currentVibrato = y.vibrato, b._currentTremolo = y.tremelo, b._currentFilter = y.filter;
      const T = b._activeVoices;
      T && T.size > 0 ? T.forEach((v) => {
        if (v._setFilter && v._setFilter(y.filter), v._setVibrato && (v._setVibrato(y.vibrato), v.vibratoApplied = !0), v._setTremolo && (v._setTremolo(y.tremelo), v.tremoloApplied = !0), v._setPresetGain) {
          const O = y.gain || 1;
          v._setPresetGain(O);
        }
      }) : b._voices && Array.isArray(b._voices) && b._voices.forEach((v) => {
        if (v != null && v._setVibrato && (v._setVibrato(y.vibrato), v.vibratoApplied = !0), v != null && v._setTremolo && (v._setTremolo(y.tremelo), v.tremoloApplied = !0), v != null && v._setFilter && v._setFilter(y.filter), v != null && v._setPresetGain) {
          const O = y.gain || 1;
          v._setPresetGain(O);
        }
      });
    },
    setBpm(m) {
      var y;
      try {
        (y = w == null ? void 0 : w.Transport) != null && y.bpm && (w.Transport.bpm.value = m, d.debug("SynthEngine", `Tone.Transport BPM updated to ${m}`, null, "audio"));
      } catch (b) {
        d.warn("SynthEngine", "Unable to update BPM on Tone.Transport", { tempo: m, error: b }, "audio");
      }
    },
    setVolume(m) {
      p && (p.volume.value = m);
    },
    async playNote(m, y, b = w.now()) {
      await (s || (() => w.start()))();
      const D = Object.keys(f);
      if (D.length === 0) return;
      const T = f[D[0]];
      T && T.triggerAttackRelease(m, y, b);
    },
    /**
     * Trigger note attack. Used by Transport scheduling with explicit time parameter.
     * For interactive (user-initiated) triggers, use triggerAttackInteractive instead.
     */
    triggerAttack(m, y, b = w.now(), x = !1) {
      const D = f[y];
      if (D)
        if (u == null || u.noteOn(1), x && h) {
          const T = h(), v = D.volume.value, O = v + 20 * Math.log10(T);
          D.volume.value = O, D.triggerAttack(m, b), setTimeout(() => {
            D != null && D.volume && (D.volume.value = v);
          }, 100);
        } else
          D.triggerAttack(m, b);
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
      var D, T, v;
      const b = f[y];
      if (!b || !m || m.length === 0) return;
      let x;
      try {
        const O = typeof b.get == "function" ? b.get() : null, P = (D = O == null ? void 0 : O.envelope) == null ? void 0 : D.release;
        x = typeof P == "number" ? P : void 0, b.set({ envelope: { release: 0.01 } }), m.forEach((E) => {
          b.triggerRelease(E, w.now());
        });
        const F = ((T = b._activeVoices) == null ? void 0 : T.size) ?? ((v = b._voices) == null ? void 0 : v.length) ?? (u == null ? void 0 : u.getActiveVoiceCount()) ?? 0;
        u == null || u.clampActiveVoiceCountToAtMost(F);
      } catch (O) {
        d.warn("SynthEngine", "quickReleasePitches failed", { err: O, color: y, pitches: m }, "audio");
      } finally {
        if (x !== void 0)
          try {
            b.set({ envelope: { release: x } });
          } catch {
          }
      }
    },
    triggerRelease(m, y, b = w.now()) {
      var T, v;
      const x = f[y];
      if (!x) return;
      x.triggerRelease(m, b), u == null || u.noteOff(1);
      const D = ((T = x._activeVoices) == null ? void 0 : T.size) ?? ((v = x._voices) == null ? void 0 : v.length) ?? (u == null ? void 0 : u.getActiveVoiceCount()) ?? 0;
      u == null || u.clampActiveVoiceCountToAtMost(D);
    },
    releaseAll() {
      var m;
      for (const y in f)
        (m = f[y]) == null || m.releaseAll();
      u == null || u.resetActiveVoiceCount();
    },
    // === Waveform Visualization ===
    createWaveformAnalyzer(m) {
      const y = f[m];
      return y ? (n[m] || (n[m] = new w.Analyser("waveform", 1024), y.connect(n[m]), d.debug("SynthEngine", `Created waveform analyzer for color: ${m}`, null, "waveform")), n[m]) : (d.warn("SynthEngine", `No synth found for color: ${m}`, null, "audio"), null);
    },
    getWaveformAnalyzer(m) {
      return n[m] || null;
    },
    getAllWaveformAnalyzers() {
      const m = /* @__PURE__ */ new Map();
      for (const y in n)
        n[y] && m.set(y, n[y]);
      return m;
    },
    removeWaveformAnalyzer(m) {
      n[m] && (n[m].dispose(), delete n[m], d.debug("SynthEngine", `Removed waveform analyzer for color: ${m}`, null, "waveform"));
    },
    disposeAllWaveformAnalyzers() {
      for (const m in n)
        n[m] && n[m].dispose();
      n = {}, d.debug("SynthEngine", "Disposed all waveform analyzers", null, "waveform");
    },
    // === Node Access ===
    getSynth(m) {
      return f[m] || null;
    },
    getAllSynths() {
      return { ...f };
    },
    getMainVolumeNode() {
      return p || null;
    },
    getMasterGainNode() {
      return a || null;
    },
    // === Cleanup ===
    stopBackgroundMonitors() {
      M == null || M.stop(), u == null || u.stop();
    },
    dispose() {
      var m;
      this.stopBackgroundMonitors(), this.disposeAllWaveformAnalyzers();
      for (const y in f)
        (m = f[y]) == null || m.dispose();
      a == null || a.dispose(), p == null || p.dispose(), c == null || c.dispose(), l == null || l.dispose(), S == null || S.dispose(), d.debug("SynthEngine", "Disposed SynthEngine", null, "audio");
    }
  };
  return C;
}
const Ue = 1e-4;
function Vt(o) {
  const {
    getMacrobeatInfo: e,
    getPlacedTonicSigns: i,
    getTonicSpanColumnIndices: g,
    updatePlayheadModel: t,
    logger: r
  } = o;
  let s = [], h = 0, f = 0, a = 0;
  const p = r ?? {
    debug: () => {
    }
  };
  function c(n) {
    return 60 / (n * 2);
  }
  function l(n, u, M) {
    let I = 0;
    p.debug("TimeMapCalculator", "[TIMEMAP] Building timeMap", {
      columnCount: u.length,
      tonicSignCount: M.length,
      microbeatDuration: n
    });
    const d = u.length, N = g(M);
    for (let A = 0; A < d; A++) {
      s[A] = I;
      const C = N.has(A);
      if (C ? p.debug("TimeMapCalculator", `[TIMEMAP] Column ${A} is tonic, not advancing time`) : I += (u[A] || 0) * n, A < 5) {
        const m = s[A];
        m !== void 0 && p.debug("TimeMapCalculator", `[TIMEMAP] timeMap[${A}] = ${m.toFixed(3)}s (isTonic: ${C})`);
      }
    }
    d > 0 && (s[d] = I), p.debug("TimeMapCalculator", `[TIMEMAP] Complete. Total columns: ${d}, Final time: ${I.toFixed(3)}s`);
  }
  function S(n) {
    var N;
    const u = s.length > 0 ? s[s.length - 1] ?? 0 : 0;
    if (!Number.isFinite(u) || u === 0) {
      h = 0;
      return;
    }
    const M = ((N = n.modulationMarkers) == null ? void 0 : N.filter((A) => A.active)) || [];
    if (M.length === 0) {
      h = u;
      return;
    }
    const I = [...M].sort((A, C) => A.measureIndex - C.measureIndex);
    let d = u;
    for (const A of I) {
      const C = e(A.measureIndex);
      if (C) {
        const m = C.endColumn - 1, y = s[m] ?? u, b = u - y, x = b * A.ratio;
        d = d - b + x;
      }
    }
    h = d;
  }
  return {
    getMicrobeatDuration: c,
    calculate(n) {
      var N, A;
      p.debug("TimeMapCalculator", "calculate", { tempo: `${n.tempo} BPM` }), s = [];
      const u = c(n.tempo), { columnWidths: M } = n, I = i();
      l(u, M, I), (A = p.timing) == null || A.call(p, "TimeMapCalculator", "calculate", { totalDuration: `${(N = s[s.length - 1]) == null ? void 0 : N.toFixed(2)}s` }), S(n);
      const d = h;
      t == null || t({
        timeMap: s,
        musicalEndTime: d,
        columnWidths: n.columnWidths,
        cellWidth: n.cellWidth
      });
    },
    getTimeMap() {
      return s;
    },
    getMusicalEndTime() {
      return h;
    },
    findNonAnacrusisStart(n) {
      if (!n.hasAnacrusis)
        return p.debug("TimeMapCalculator", "[ANACRUSIS] No anacrusis, starting from time 0"), 0;
      for (let u = 0; u < n.macrobeatBoundaryStyles.length; u++)
        if (n.macrobeatBoundaryStyles[u] === "solid") {
          const M = e(u + 1);
          if (M) {
            const I = s[M.startColumn] || 0;
            return p.debug("TimeMapCalculator", `[ANACRUSIS] Found solid boundary at macrobeat ${u}, non-anacrusis starts at column ${M.startColumn}, time ${I.toFixed(3)}s`), I;
          }
        }
      return p.debug("TimeMapCalculator", "[ANACRUSIS] No solid boundary found, starting from time 0"), 0;
    },
    applyModulationToTime(n, u, M) {
      var A;
      const I = ((A = M.modulationMarkers) == null ? void 0 : A.filter((C) => C.active)) || [];
      if (I.length === 0)
        return n;
      const d = [...I].sort((C, m) => C.measureIndex - m.measureIndex);
      let N = n;
      u < 5 && p.debug("TimeMapCalculator", `[MODULATION] Column ${u}: baseTime ${n.toFixed(3)}s, ${d.length} active markers`);
      for (const C of d) {
        const m = e(C.measureIndex);
        if (m) {
          const y = m.endColumn;
          if (u > y) {
            const b = s[y] !== void 0 ? s[y] : 0, x = n - b, D = x * C.ratio;
            N = N - x + D, u < 5 && p.debug("TimeMapCalculator", `[MODULATION] Column ${u}: Applied marker at measure ${C.measureIndex} (col ${y}), ratio ${C.ratio}, adjustedTime ${N.toFixed(3)}s`);
          }
        }
      }
      return N;
    },
    setLoopBounds(n, u, M) {
      const I = c(M), d = Math.max(I, 1e-3), N = Number.isFinite(n) ? n : 0;
      let A = Number.isFinite(u) ? u : N + d;
      A <= N && (A = N + d), f = N, a = A, w != null && w.Transport && (w.Transport.loopStart = N, w.Transport.loopEnd = A);
    },
    getConfiguredLoopBounds() {
      return { loopStart: f, loopEnd: a };
    },
    setConfiguredLoopBounds(n, u) {
      f = n, a = u;
    },
    clearConfiguredLoopBounds() {
      f = 0, a = 0;
    },
    reapplyConfiguredLoopBounds(n) {
      if (a > f) {
        const u = w.Time(w.Transport.loopStart).toSeconds(), M = w.Time(w.Transport.loopEnd).toSeconds(), I = Math.abs(u - f), d = Math.abs(M - a);
        (I > Ue || d > Ue) && (w.Transport.loopStart = f, w.Transport.loopEnd = a), w.Transport.loop !== n && (w.Transport.loop = n);
      }
    },
    updateLoopBoundsFromTimeline(n) {
      const u = this.findNonAnacrusisStart(n), M = h;
      this.setLoopBounds(u, M, n.tempo);
    }
  };
}
const $t = {
  H: "https://tonejs.github.io/audio/drum-samples/CR78/hihat.mp3",
  M: "https://tonejs.github.io/audio/drum-samples/CR78/snare.mp3",
  L: "https://tonejs.github.io/audio/drum-samples/CR78/kick.mp3"
}, Wt = 1e-4;
function qt(o = {}) {
  var f;
  const {
    samples: e = $t,
    synthEngine: i,
    initialVolume: g = 0
  } = o;
  let t = null, r = null;
  const s = /* @__PURE__ */ new Map();
  function h(a, p) {
    let c = Number.isFinite(p) ? p : w.now();
    const l = s.get(a) ?? -1 / 0;
    return c > l || (c = l + Wt), s.set(a, c), c;
  }
  if (r = new w.Volume(g), t = new w.Players(e).connect(r), i) {
    const a = (f = i.getMainVolumeNode) == null ? void 0 : f.call(i);
    a ? r.connect(a) : r.toDestination();
  } else
    r.toDestination();
  return {
    getPlayers() {
      return t;
    },
    getVolumeNode() {
      return r;
    },
    trigger(a, p) {
      var l;
      if (!t) return;
      const c = h(a, p);
      (l = t.player(a)) == null || l.start(c);
    },
    reset() {
      s.clear();
    },
    dispose() {
      t == null || t.dispose(), r == null || r.dispose(), t = null, r = null, s.clear();
    }
  };
}
const Xe = "♭", Je = "♯";
function Fn(o) {
  const {
    synthEngine: e,
    stateCallbacks: i,
    eventCallbacks: g,
    visualCallbacks: t,
    logger: r,
    audioInit: s,
    playbackMode: h = "standard",
    highwayService: f
  } = o, a = r ?? {
    debug: () => {
    },
    info: () => {
    },
    warn: () => {
    }
  };
  let p = null, c = !1, l = null, S = null, n = 1;
  const u = [];
  function M(T, v) {
    const O = v.fullRowData[T];
    return O ? O.toneNote.replace(Xe, "b").replace(Je, "#") : "C4";
  }
  function I(T, v) {
    const O = T.globalRow ?? T.row, P = v.fullRowData[O];
    return P ? P.toneNote.replace(Xe, "b").replace(Je, "#") : "C4";
  }
  function d() {
    var G, L, B;
    if (!l) return;
    const T = i.getState();
    a.debug("TransportService", "scheduleNotes", "Clearing previous transport events and rescheduling all notes"), w.Transport.cancel(), S == null || S.reset(), l.calculate(T), (G = t == null ? void 0 : t.clearAdsrVisuals) == null || G.call(t);
    const v = l.getTimeMap(), { loopEnd: O } = l.getConfiguredLoopBounds(), P = l.findNonAnacrusisStart(T);
    a.debug("TransportService", `[ANACRUSIS] hasAnacrusis: ${T.hasAnacrusis}, anacrusisOffset: ${P.toFixed(3)}s`), T.placedNotes.forEach((R, _) => {
      const $ = R.startColumnIndex, W = R.endColumnIndex, H = v[$];
      if (H === void 0) {
        a.warn("TransportService", `[NOTE SCHEDULE] Note ${_}: timeMap[${$}] undefined, skipping`);
        return;
      }
      const q = l.applyModulationToTime(H, $, T), X = v[W + 1];
      if (X === void 0) {
        a.warn("TransportService", `Skipping note with invalid endColumnIndex: ${R.endColumnIndex + 1}`);
        return;
      }
      const j = l.applyModulationToTime(X, W + 1, T) - q;
      R.isDrum ? N(R, q) : A(R, q, j, O, T);
    });
    const F = ((L = i.getStampPlaybackData) == null ? void 0 : L.call(i)) ?? [];
    F.forEach((R) => {
      C(R, v, T);
    });
    const E = ((B = i.getTripletPlaybackData) == null ? void 0 : B.call(i)) ?? [];
    E.forEach((R) => {
      m(R, v, T);
    }), a.debug("TransportService", "scheduleNotes", `Finished scheduling ${T.placedNotes.length} notes, ${F.length} stamps, and ${E.length} triplets`);
  }
  function N(T, v) {
    const O = i.getState();
    w.Transport.schedule((P) => {
      if (O.isPaused) return;
      const F = T.drumTrack;
      if (F == null) return;
      const E = String(F);
      S == null || S.trigger(E, P), w.Draw.schedule(() => {
        var G;
        (G = t == null ? void 0 : t.triggerDrumNotePop) == null || G.call(t, T.startColumnIndex, F);
      }, P);
    }, v);
  }
  function A(T, v, O, P, F) {
    var q;
    const E = I(T, F), G = T.color, L = T.globalRow ?? T.row, B = ((q = F.fullRowData[L]) == null ? void 0 : q.hex) || "#888888", R = T.uuid, _ = F.timbres[G];
    if (!_) {
      a.warn("TransportService", `Timbre not found for color ${G}. Skipping note ${R}`);
      return;
    }
    let $ = v + O;
    const H = P - 1e-3;
    $ >= P && ($ = Math.max(v + 1e-3, H)), w.Transport.schedule((X) => {
      i.getState().isPaused || (e.triggerAttack(E, G, X), w.Draw.schedule(() => {
        var U;
        (U = t == null ? void 0 : t.triggerAdsrVisual) == null || U.call(t, R, "attack", B, _.adsr), g.emit("noteAttack", { noteId: R, color: G });
      }, X));
    }, v), w.Transport.schedule((X) => {
      e.triggerRelease(E, G, X), w.Draw.schedule(() => {
        var U;
        (U = t == null ? void 0 : t.triggerAdsrVisual) == null || U.call(t, R, "release", B, _.adsr), g.emit("noteRelease", { noteId: R, color: G });
      }, X);
    }, $);
  }
  function C(T, v, O) {
    var G;
    const P = T.column, F = v[P];
    if (F === void 0) return;
    (((G = i.getStampScheduleEvents) == null ? void 0 : G.call(i, T.sixteenthStampId, T.placement)) ?? []).forEach((L) => {
      y(L, F, T.row, T.color, O);
    });
  }
  function m(T, v, O) {
    var G, L;
    const P = ((G = i.timeToCanvas) == null ? void 0 : G.call(i, T.startTimeIndex, O)) ?? T.startTimeIndex, F = v[P];
    if (F === void 0) return;
    (((L = i.getTripletScheduleEvents) == null ? void 0 : L.call(i, T.tripletStampId, T.placement)) ?? []).forEach((B) => {
      y(B, F, T.row, T.color, O);
    });
  }
  function y(T, v, O, P, F) {
    const E = w.Time(T.offset).toSeconds(), G = w.Time(T.duration).toSeconds(), L = v + E, B = L + G, R = O + T.rowOffset, _ = M(R, F);
    w.Transport.schedule(($) => {
      i.getState().isPaused || e.triggerAttack(_, P, $);
    }, L), w.Transport.schedule(($) => {
      i.getState().isPaused || e.triggerRelease(_, P, $);
    }, B);
  }
  function b() {
    var L, B;
    const v = i.getState().tempo, O = 1e-4, P = 0.5, F = (R) => (R == null ? void 0 : R.xPosition) ?? 477.5, E = typeof ((B = (L = w.Transport) == null ? void 0 : L.bpm) == null ? void 0 : B.value) == "number" ? w.Transport.bpm.value : v;
    n = v !== 0 ? E / v : 1, c = !0;
    function G() {
      var Te, Ne, Ae, be, ve, Me, we, Ie, xe, Pe, Ee, Oe, De, Fe, Be;
      if (!c || !l)
        return;
      if (w.Transport.state === "stopped") {
        p = requestAnimationFrame(G);
        return;
      }
      const R = i.getState(), _ = w.Time(w.Transport.loopEnd).toSeconds(), $ = R.isLooping, W = l.getMusicalEndTime(), H = $ && _ > 0 ? _ : W, q = w.Transport.seconds, X = q >= H - 1e-3;
      if (!$ && X) {
        a.info("TransportService", "Playback reached end. Stopping playhead."), D.stop();
        return;
      }
      if (R.isPaused) {
        p = requestAnimationFrame(G);
        return;
      }
      const U = l.getTimeMap();
      (Te = t == null ? void 0 : t.clearPlayheadCanvas) == null || Te.call(t), (Ne = t == null ? void 0 : t.clearDrumPlayheadCanvas) == null || Ne.call(t);
      let j = q;
      if ($) {
        const J = w.Time(w.Transport.loopStart).toSeconds(), Y = w.Time(w.Transport.loopEnd).toSeconds() - J;
        Y > 0 && (j = (q - J) % Y + J);
      }
      const et = ((Ae = i.getCanvasWidth) == null ? void 0 : Ae.call(i)) ?? 1e3, tt = ((be = i.getPlacedTonicSigns) == null ? void 0 : be.call(i)) ?? [], pe = ((ve = i.getTonicSpanColumnIndices) == null ? void 0 : ve.call(i, tt)) ?? /* @__PURE__ */ new Set();
      let se = 0, ge = 0, Se = 0, ie = -1;
      for (let J = 0; J < U.length - 1; J++) {
        const Z = U[J], Y = U[J + 1];
        if (!(Z === void 0 || Y === void 0) && j >= Z && j < Y) {
          let K = J;
          for (; pe.has(K) && K < U.length - 1; )
            K++;
          const le = ((Me = i.getColumnStartX) == null ? void 0 : Me.call(i, K)) ?? 0, Re = ((we = i.getColumnWidth) == null ? void 0 : we.call(i, K)) ?? 10;
          if (ge = le, Se = Re, ie = K, pe.has(J))
            se = le;
          else {
            const Ge = Y - Z, ot = j - Z, st = Ge > 0 ? ot / Ge : 0;
            se = le + st * Re;
          }
          break;
        }
      }
      const te = Math.min(se, et);
      x(R, te, v, F, O, P);
      const ye = ((Ie = t == null ? void 0 : t.getPlayheadCanvasHeight) == null ? void 0 : Ie.call(t)) ?? 500, Ce = ((xe = t == null ? void 0 : t.getDrumCanvasHeight) == null ? void 0 : xe.call(t)) ?? 100, k = R.playheadMode === "macrobeat" && ie >= 0 ? (Pe = i.getMacrobeatHighlightRect) == null ? void 0 : Pe.call(i, ie) : null, ae = (k == null ? void 0 : k.x) ?? ge, re = (k == null ? void 0 : k.width) ?? Se;
      te >= 0 && (R.playheadMode === "macrobeat" || R.playheadMode === "microbeat" ? ((Ee = t == null ? void 0 : t.drawPlayheadHighlight) == null || Ee.call(t, ae, re, ye, performance.now()), (Oe = t == null ? void 0 : t.drawDrumPlayheadHighlight) == null || Oe.call(t, ae, re, Ce, performance.now())) : ((De = t == null ? void 0 : t.drawPlayheadLine) == null || De.call(t, te, ye), (Fe = t == null ? void 0 : t.drawDrumPlayheadLine) == null || Fe.call(t, te, Ce)));
      const nt = R.playheadMode === "macrobeat" || R.playheadMode === "microbeat";
      (Be = t == null ? void 0 : t.updateBeatLineHighlight) == null || Be.call(t, ae, re, nt), p = requestAnimationFrame(G);
    }
    G();
  }
  function x(T, v, O, P, F, E) {
    if (!l) return;
    const L = (Array.isArray(T.modulationMarkers) ? T.modulationMarkers : []).filter((B) => (B == null ? void 0 : B.active) && typeof B.ratio == "number" && B.ratio !== 0).sort((B, R) => P(B) - P(R));
    if (L.length > 0) {
      let B = 1;
      for (const R of L) {
        const _ = P(R);
        if (v + E >= _)
          B *= 1 / R.ratio;
        else
          break;
      }
      if ((!Number.isFinite(B) || B <= 0) && (B = 1), Math.abs(B - n) > F) {
        const R = O * B;
        w.Transport.bpm.value = R, l.reapplyConfiguredLoopBounds(T.isLooping), n = B, a.debug("TransportService", `Tempo multiplier updated to ${B.toFixed(3)} (${R.toFixed(2)} BPM)`);
      }
    } else Math.abs(n - 1) > F && (w.Transport.bpm.value = O, l.reapplyConfiguredLoopBounds(T.isLooping), n = 1, a.debug("TransportService", `Tempo reset to base ${O} BPM`));
  }
  const D = {
    init() {
      const T = i.getState();
      l = Vt({
        getMacrobeatInfo: i.getMacrobeatInfo ?? (() => null),
        getPlacedTonicSigns: i.getPlacedTonicSigns ?? (() => []),
        getTonicSpanColumnIndices: i.getTonicSpanColumnIndices ?? (() => /* @__PURE__ */ new Set()),
        logger: a
      }), S = qt({
        samples: {
          H: "/audio/drums/hi.mp3",
          M: "/audio/drums/mid.mp3",
          L: "/audio/drums/lo.mp3"
        },
        synthEngine: {
          getMainVolumeNode: () => e.getMainVolumeNode()
        }
      }), w.Transport.bpm.value = T.tempo;
      const v = () => this.handleStateChange(), O = () => this.handleStateChange(), P = () => this.handleStateChange(), F = () => {
        if (l && l.getTimeMap().length > 0) {
          const B = i.getState();
          l.calculate(B);
        }
        this.handleStateChange();
      }, E = (B) => {
        var $, W;
        const R = (($ = B == null ? void 0 : B.oldConfig) == null ? void 0 : $.columnWidths) || [], _ = ((W = B == null ? void 0 : B.newConfig) == null ? void 0 : W.columnWidths) || [];
        R.length !== _.length && l && l.calculate(i.getState());
      }, G = (B) => {
        if (a.info("TransportService", `tempoChanged triggered with new value: ${B} BPM`), w.Transport.state === "started") {
          const R = w.Transport.position;
          w.Transport.pause(), p && (cancelAnimationFrame(p), p = null), w.Transport.bpm.value = B, l == null || l.reapplyConfiguredLoopBounds(i.getState().isLooping), d(), w.Transport.start(void 0, R), h === "standard" && b();
        } else
          w.Transport.bpm.value = B, l == null || l.reapplyConfiguredLoopBounds(i.getState().isLooping), l == null || l.calculate(i.getState());
      }, L = (B) => {
        w.Transport.loop = B;
        const R = w.Time(w.Transport.loopStart).toSeconds(), _ = w.Time(w.Transport.loopEnd).toSeconds();
        B && _ <= R && l && (w.Transport.loopEnd = R + Math.max(l.getMicrobeatDuration(i.getState().tempo), 1e-3)), B && l ? l.setConfiguredLoopBounds(
          w.Time(w.Transport.loopStart).toSeconds(),
          w.Time(w.Transport.loopEnd).toSeconds()
        ) : l == null || l.clearConfiguredLoopBounds();
      };
      g.on("rhythmStructureChanged", v), g.on("notesChanged", O), g.on("sixteenthStampPlacementsChanged", P), g.on("modulationMarkersChanged", F), g.on("layoutConfigChanged", E), g.on("tempoChanged", G), g.on("loopingChanged", L), u.push(
        () => {
        }
        // These would be off() calls if the event system supports them
      ), w.Transport.on("stop", () => {
        var B, R;
        a.info("TransportService", "Tone.Transport 'stop' fired. Resetting playback state"), (B = g.setPlaybackState) == null || B.call(g, !1, !1), (R = t == null ? void 0 : t.clearAdsrVisuals) == null || R.call(t), p && (cancelAnimationFrame(p), p = null);
      }), a.info("TransportService", "Initialized");
    },
    handleStateChange() {
      if (w.Transport.state === "started") {
        a.debug("TransportService", "handleStateChange: Notes or rhythm changed during playback. Rescheduling");
        const v = w.Transport.position;
        w.Transport.pause(), d(), w.Transport.start(void 0, v);
      } else
        l == null || l.calculate(i.getState());
    },
    start() {
      a.info("TransportService", "Starting playback"), (s || (() => w.start()))().then(() => {
        d();
        const v = i.getState();
        l == null || l.getTimeMap();
        const O = (l == null ? void 0 : l.getMusicalEndTime()) ?? 0, P = (l == null ? void 0 : l.findNonAnacrusisStart(v)) ?? 0;
        l == null || l.setLoopBounds(P, O, v.tempo), w.Transport.bpm.value = v.tempo;
        const F = w.now() + 0.1;
        w.Transport.start(F, 0), h === "standard" && b(), g.emit("playbackStarted");
      });
    },
    resume() {
      a.info("TransportService", "Resuming playback"), (s || (() => w.start()))().then(() => {
        w.Transport.start(), h === "standard" && b(), g.emit("playbackResumed");
      });
    },
    pause() {
      a.info("TransportService", "Pausing playback"), w.Transport.pause(), p && (cancelAnimationFrame(p), p = null), g.emit("playbackPaused");
    },
    stop() {
      var v, O, P;
      a.info("TransportService", "Stopping playback and clearing visuals"), c = !1, p && (cancelAnimationFrame(p), p = null), w.Transport.stop(), w.Transport.cancel(), S == null || S.reset();
      const T = i.getState();
      w.Transport.bpm.value = T.tempo, l == null || l.reapplyConfiguredLoopBounds(T.isLooping), e.releaseAll(), (v = t == null ? void 0 : t.clearPlayheadCanvas) == null || v.call(t), (O = t == null ? void 0 : t.clearDrumPlayheadCanvas) == null || O.call(t), (P = t == null ? void 0 : t.updateBeatLineHighlight) == null || P.call(t, 0, 0, !1), g.emit("playbackStopped");
    },
    dispose() {
      this.stop(), S == null || S.dispose(), u.forEach((T) => T()), a.debug("TransportService", "Disposed");
    }
  };
  return D;
}
const Ht = {
  latencyHint: "playback",
  lookAhead: 0.1
};
function Bn(o = {}) {
  const { latencyHint: e, lookAhead: i } = { ...Ht, ...o };
  let g = !1;
  if (w.context.state === "suspended")
    try {
      w.setContext(new w.Context({
        latencyHint: e
      })), g = !0;
    } catch (t) {
      console.warn("Failed to create new AudioContext, using default:", t);
    }
  return i !== void 0 && (w.context.lookAhead = i), g;
}
function Rn() {
  const o = w.context.rawContext, e = o && "baseLatency" in o ? o.baseLatency : void 0;
  return {
    state: w.context.state,
    sampleRate: w.context.sampleRate,
    baseLatency: e,
    lookAhead: w.context.lookAhead
  };
}
function Ut(o) {
  let e = null, i = null;
  function g() {
    const l = typeof performance < "u" ? performance.now() : Date.now();
    return (!e || !i || l - i > 1) && (e = o.getViewportInfo(), i = l), e;
  }
  function t() {
    e = null, i = null;
  }
  function r(l, S) {
    if (o.columnToPixelX)
      return o.columnToPixelX(l, S);
    const { columnWidths: n, cellWidth: u } = S;
    let M = 0;
    for (let I = 0; I < l && I < n.length; I++)
      M += (n[I] ?? 1) * u;
    return M;
  }
  function s(l, S) {
    const n = g(), u = l - n.startRank, M = S.cellHeight / 2;
    return (u + 1) * M;
  }
  function h(l, S) {
    if (o.pixelXToColumn)
      return o.pixelXToColumn(l, S);
    const { columnWidths: n, cellWidth: u } = S;
    let M = 0;
    for (let I = 0; I < n.length; I++) {
      const d = (n[I] ?? 1) * u;
      if (l < M + d)
        return I;
      M += d;
    }
    return n.length - 1;
  }
  function f(l, S) {
    const n = g(), u = S.cellHeight / 2;
    return l / u - 1 + n.startRank;
  }
  function a() {
    const l = g(), { startRank: S, endRank: n } = l, u = Math.max(S, n - 1);
    return { startRow: S, endRow: u };
  }
  function p(l) {
    let S = (l || "").replace(/\d/g, "").trim();
    return S = S.replace(/b/g, "b-").replace(/#/g, "b_"), S;
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
    getColumnX: r,
    getRowY: s,
    getColumnFromX: h,
    getRowFromY: f,
    getVisibleRowRange: a,
    getPitchClass: p,
    getLineStyleFromPitchClass: c,
    invalidateViewportCache: t,
    getCachedViewportInfo: g
  };
}
const ue = "♯", he = "♭", ne = "/", Xt = 0.35, Jt = 0.5, zt = 6, jt = 1, kt = 0.08, Yt = 0.04, Kt = 1, ee = 4;
function Qt(o) {
  const { coords: e } = o;
  function i(d) {
    const N = d == null ? void 0 : d.split("-")[1];
    return Number.parseInt(N ?? "0", 10);
  }
  function g(d) {
    if (!d || typeof d.startColumnIndex != "number" || typeof d.endColumnIndex != "number")
      return !1;
    const N = d.shape === "circle" ? d.startColumnIndex + 1 : d.startColumnIndex;
    return d.endColumnIndex > N;
  }
  function t(d, N) {
    return Number.isFinite(d) && d > 0 && Number.isFinite(N) && N > 0;
  }
  function r(d, N, A) {
    const { cellWidth: C } = A, m = C * 0.25, y = d.uuid;
    if (!y) return 0;
    const b = N.filter(
      (T) => !T.isDrum && T.row === d.row && T.startColumnIndex === d.startColumnIndex && T.uuid && T.uuid !== y
    );
    if (b.length === 0) return 0;
    const x = [d, ...b];
    return x.sort((T, v) => i(T.uuid) - i(v.uuid)), x.findIndex((T) => T.uuid === y) * m;
  }
  function s(d, N) {
    var y, b, x;
    const { cellHeight: A } = N, C = (y = o.getAnimationEffectsManager) == null ? void 0 : y.call(o);
    return (b = C == null ? void 0 : C.shouldAnimateNote) != null && b.call(C, d) ? (((x = C.getVibratoYOffset) == null ? void 0 : x.call(C, d.color)) ?? 0) * A : 0;
  }
  function h(d, N, A) {
    const { cellHeight: C } = A, m = C / 2 * 0.12, y = d.uuid;
    if (!y) return 0;
    const b = N.filter(
      (T) => !T.isDrum && T.row === d.row && T.startColumnIndex === d.startColumnIndex && T.uuid && T.uuid !== y && g(T)
    );
    if (b.length === 0) return 0;
    const x = [d, ...b];
    return x.sort((T, v) => i(T.uuid) - i(v.uuid)), x.findIndex((T) => T.uuid === y) * m;
  }
  function f(d, N) {
    var O, P, F;
    const A = (O = o.getDegreeForNote) == null ? void 0 : O.call(o, d);
    if (!A) return { label: null, isAccidental: !1 };
    if (!(((P = o.hasAccidental) == null ? void 0 : P.call(o, A)) ?? !1)) return { label: A, isAccidental: !1 };
    const m = N.accidentalMode || {}, y = m.sharp ?? !0, b = m.flat ?? !0;
    if (!y && !b) return { label: null, isAccidental: !0 };
    let x = A.includes(ue) ? A : null, D = A.includes(he) ? A : null;
    const T = (F = o.getEnharmonicDegree) == null ? void 0 : F.call(o, A);
    T && (T.includes(ue) && !x && (x = T), T.includes(he) && !D && (D = T));
    let v = null;
    if (y && b) {
      const E = [];
      x && E.push(x), D && (!x || D !== x) && E.push(D), v = E.join(ne), v || (v = A);
    } else y ? v = x || A : b && (v = D || A);
    return { label: v, isAccidental: !0 };
  }
  function a(d) {
    if (!d) return { multiplier: 1, category: "natural" };
    const N = d.includes(he), A = d.includes(ue), C = d.includes(ne);
    return !N && !A ? { multiplier: 1, category: "natural" } : C ? { multiplier: 0.75, category: "both-accidentals" } : { multiplier: 0.88, category: "single-accidental" };
  }
  function p(d, N, A, C, m, y) {
    const { label: b } = f(N, A);
    if (!b) return;
    const { multiplier: x, category: D } = a(b);
    let T;
    if (N.shape === "circle") {
      const v = y * 2 * Jt;
      switch (D) {
        case "natural":
          T = v;
          break;
        case "single-accidental":
          T = v * 0.8;
          break;
        case "both-accidentals":
          T = v * 0.4;
          break;
        default:
          T = v * x;
      }
    } else {
      const v = y * 2 * Xt;
      switch (D) {
        case "natural":
          T = v * 1.5;
          break;
        case "single-accidental":
          T = v * 1.2;
          break;
        case "both-accidentals":
          T = v;
          break;
        default:
          T = v * x;
      }
    }
    if (!(T < zt))
      if (d.fillStyle = "#212529", d.font = `bold ${T}px 'Atkinson Hyperlegible', sans-serif`, d.textAlign = "center", d.textBaseline = "middle", N.shape === "oval" && D === "both-accidentals" && b.includes(ne)) {
        const v = b.split(ne), O = T * 1.1, P = O * (v.length - 1), F = m - P / 2;
        v.forEach((E, G) => {
          const L = F + G * O, B = T * 0.08;
          d.fillText(E.trim(), C, L + B);
        });
      } else {
        const v = T * 0.08;
        d.fillText(b, C, m + v);
      }
  }
  function c(d, N, A) {
    var v, O;
    const C = (v = o.getAnimationEffectsManager) == null ? void 0 : v.call(o), m = C == null ? void 0 : C.hasReverbEffect;
    if (!(typeof m == "function" ? m(N.color) : !!m)) return { shouldApply: !1, blur: 0, spread: 0 };
    const { cellWidth: b } = A, x = (O = C == null ? void 0 : C.getReverbEffect) == null ? void 0 : O.call(C, N.color);
    if (!x) return { shouldApply: !1, blur: 0, spread: 0 };
    const D = x.blur * (b / 2), T = x.spread * (b / 3);
    return { shouldApply: D > 0 || T > 0, blur: D, spread: T };
  }
  function l(d, N, A, C, m, y, b) {
    var v, O, P;
    const x = (v = o.getAnimationEffectsManager) == null ? void 0 : v.call(o);
    if (!((O = x == null ? void 0 : x.hasDelayEffect) != null && O.call(x, N.color))) return;
    const { cellWidth: D } = A, T = (P = x.getDelayEffects) == null ? void 0 : P.call(x, N.color);
    !T || T.length === 0 || T.forEach((F) => {
      const E = F.delay / 500 * D * 2, G = C + E, L = y * F.scale, B = b * F.scale;
      d.save(), d.globalAlpha = F.opacity * 0.6, d.beginPath(), d.ellipse(G, m, L, B, 0, 0, 2 * Math.PI), d.strokeStyle = N.color, d.lineWidth = Math.max(0.5, L * 0.1), d.setLineDash([2, 2]), d.stroke(), d.restore();
    });
  }
  function S(d, N, A, C, m, y) {
    var v, O, P;
    const b = (v = o.getAnimationEffectsManager) == null ? void 0 : v.call(o);
    if (!((O = b == null ? void 0 : b.shouldFillNote) != null && O.call(b, N))) return;
    const x = ((P = b.getFillLevel) == null ? void 0 : P.call(b, N)) ?? 0;
    if (x <= 0) return;
    d.save();
    const D = 1 - x, T = d.createRadialGradient(A, C, 0, A, C, Math.max(m, y));
    T.addColorStop(0, "transparent"), T.addColorStop(Math.max(0, D - 0.05), "transparent"), T.addColorStop(D, `${N.color}1F`), T.addColorStop(1, `${N.color}BF`), d.beginPath(), d.ellipse(A, C, m, y, 0, 0, 2 * Math.PI), d.clip(), d.fillStyle = T, d.fillRect(A - m - 10, C - y - 10, (m + 10) * 2, (y + 10) * 2), d.restore();
  }
  function n(d, N, A, C, m, y) {
    var F, E, G;
    const b = (F = o.getAnimationEffectsManager) == null ? void 0 : F.call(o);
    if (!((E = b == null ? void 0 : b.shouldFillNote) != null && E.call(b, N))) return;
    const x = ((G = b.getFillLevel) == null ? void 0 : G.call(b, N)) ?? 0;
    if (x <= 0) return;
    d.save(), d.beginPath(), d.arc(A, m, y, Math.PI / 2, -Math.PI / 2, !1), d.lineTo(C, m - y), d.arc(C, m, y, -Math.PI / 2, Math.PI / 2, !1), d.lineTo(A, m + y), d.closePath(), d.clip();
    const D = (A + C) / 2, T = C - A, v = Math.max(T / 2 + y, y), O = 1 - x, P = d.createRadialGradient(D, m, 0, D, m, v);
    P.addColorStop(0, "transparent"), P.addColorStop(Math.max(0, O - 0.05), "transparent"), P.addColorStop(O, `${N.color}1F`), P.addColorStop(1, `${N.color}BF`), d.fillStyle = P, d.fillRect(A - y - 10, m - y - 10, T + (y + 10) * 2, (y + 10) * 2), d.restore();
  }
  function u(d, N, A, C, m, y, b, x) {
    if (n(d, N, C, m, y, b), d.save(), d.beginPath(), d.arc(C, y, b, Math.PI / 2, -Math.PI / 2, !1), d.lineTo(m, y - b), d.arc(m, y, b, -Math.PI / 2, Math.PI / 2, !1), d.lineTo(C, y + b), d.closePath(), d.strokeStyle = N.color, d.lineWidth = x, d.shadowColor = N.color, d.shadowBlur = ee, d.stroke(), d.shadowBlur = 0, d.shadowColor = "transparent", d.restore(), A.degreeDisplayMode !== "off") {
      const D = (C + m) / 2;
      p(d, N, A, D, y, b);
    }
  }
  function M(d, N, A, C) {
    const { cellWidth: m, cellHeight: y, modulationMarkers: b, placedNotes: x } = N, D = e.getRowY(C, N), T = s(A, N), v = D + T, O = e.getColumnX(A.startColumnIndex, N);
    let P;
    if (b && b.length > 0 ? P = e.getColumnX(A.startColumnIndex + 1, N) - O : P = m, !t(P, y)) return;
    const F = r(A, x, N), E = O + P + F, G = Math.max(jt, P * kt), L = y / 2 - G / 2, B = g(A), R = N.longNoteStyle || "style1";
    if (B && R === "style2") {
      const W = E, H = e.getColumnX(A.endColumnIndex, N);
      if (!t(H - W, L)) return;
      u(d, A, N, W, H, v, L, G);
      return;
    }
    if (B) {
      const W = e.getColumnX(A.endColumnIndex + 1, N), H = h(A, x, N), q = v + H;
      d.beginPath(), d.moveTo(E, q), d.lineTo(W, q), d.strokeStyle = A.color, d.lineWidth = Math.max(Kt, P * Yt), d.stroke();
    }
    const _ = P - G / 2;
    if (!t(_, L)) return;
    l(d, A, N, E, v, _, L), d.save(), S(d, A, E, v, _, L);
    const $ = c(d, A, N);
    $.shouldApply && (d.shadowColor = A.color, d.shadowBlur = ee + $.blur, d.shadowOffsetX = $.spread), d.beginPath(), d.ellipse(E, v, _, L, 0, 0, 2 * Math.PI), d.strokeStyle = A.color, d.lineWidth = G, $.shouldApply || (d.shadowColor = A.color, d.shadowBlur = ee), d.stroke(), d.shadowBlur = 0, d.shadowColor = "transparent", d.shadowOffsetX = 0, d.restore(), N.degreeDisplayMode !== "off" && p(d, A, N, E, v, _);
  }
  function I(d, N, A, C) {
    const { columnWidths: m, cellWidth: y, cellHeight: b, modulationMarkers: x, placedNotes: D } = N, T = e.getRowY(C, N), v = s(A, N), O = T + v, P = e.getColumnX(A.startColumnIndex, N);
    let F;
    if (x && x.length > 0 ? F = e.getColumnX(A.startColumnIndex + 1, N) - P : F = (m[A.startColumnIndex] ?? 1) * y, !t(F, b)) return;
    const E = r(A, D, N), G = Math.max(0.5, F * 0.15), L = P + F / 2 + E, B = F / 2 - G / 2, R = b / 2 - G / 2;
    if (!t(B, R)) return;
    l(d, A, N, L, O, B, R), d.save(), S(d, A, L, O, B, R);
    const _ = c(d, A, N);
    _.shouldApply && (d.shadowColor = A.color, d.shadowBlur = ee + _.blur, d.shadowOffsetX = _.spread), d.beginPath(), d.ellipse(L, O, B, R, 0, 0, 2 * Math.PI), d.strokeStyle = A.color, d.lineWidth = G, _.shouldApply || (d.shadowColor = A.color, d.shadowBlur = ee), d.stroke(), d.shadowBlur = 0, d.shadowColor = "transparent", d.shadowOffsetX = 0, d.restore(), N.degreeDisplayMode !== "off" && p(d, A, N, L, O, B);
  }
  return {
    drawTwoColumnOvalNote: M,
    drawSingleColumnOvalNote: I,
    hasVisibleTail: g
  };
}
function Zt(o) {
  const { coords: e } = o;
  function i(t, r) {
    const { fullRowData: s, canvasWidth: h, cellHeight: f } = r, { startRow: a, endRow: p } = e.getVisibleRowRange();
    for (let c = a; c <= p; c++) {
      const l = s[c];
      if (!l) continue;
      const S = e.getRowY(c, r), n = e.getPitchClass(l.toneNote), u = e.getLineStyleFromPitchClass(n);
      if (t.beginPath(), t.moveTo(0, S), t.lineTo(h, S), t.strokeStyle = u.color, t.lineWidth = u.lineWidth, t.setLineDash(u.dash), t.stroke(), t.setLineDash([]), n === "G") {
        const M = f / 2;
        t.fillStyle = "#f8f9fa", t.fillRect(0, S - M, h, M);
      }
    }
  }
  function g(t, r) {
    var M, I, d, N;
    const {
      columnWidths: s,
      macrobeatBoundaryStyles: h,
      hasAnacrusis: f,
      canvasHeight: a
    } = r, p = ((M = o.getPlacedTonicSigns) == null ? void 0 : M.call(o)) ?? [], c = ((I = o.getTonicSpanColumnIndices) == null ? void 0 : I.call(o, p)) ?? /* @__PURE__ */ new Set(), l = ((d = o.getAnacrusisColors) == null ? void 0 : d.call(o)) ?? {
      background: "rgba(173, 181, 189, 0.15)",
      border: "rgba(173, 181, 189, 0.3)"
    };
    let S = f, n = 0, u = 0;
    for (let A = 0; A <= s.length; A++) {
      const C = e.getColumnX(A, r), m = (N = o.getMacrobeatInfo) == null ? void 0 : N.call(o, u);
      if (m && m.startColumn === A) {
        const b = h[u] ?? "solid";
        S && b === "solid" && (t.fillStyle = l.background, t.fillRect(n, 0, C - n, a), S = !1), t.beginPath(), t.moveTo(C, 0), t.lineTo(C, a), b === "anacrusis" ? (t.strokeStyle = l.border, t.setLineDash([5, 5]), t.lineWidth = 1) : b === "dashed" ? (t.strokeStyle = "#adb5bd", t.setLineDash([5, 5]), t.lineWidth = 1) : (t.strokeStyle = "#adb5bd", t.setLineDash([]), t.lineWidth = 2), t.stroke(), t.setLineDash([]), u++;
      } else A > 0 && !c.has(A - 1) && (t.beginPath(), t.moveTo(C, 0), t.lineTo(C, a), t.strokeStyle = "#dee2e6", t.lineWidth = 1, t.stroke());
      if (c.has(A)) {
        const b = (s[A] ?? 1) * r.cellWidth;
        t.fillStyle = "rgba(255, 193, 7, 0.1)", t.fillRect(C, 0, b, a);
      }
    }
  }
  return {
    drawHorizontalLines: i,
    drawVerticalLines: g
  };
}
function Gn(o, e, i) {
  const g = o.canvas.width, t = o.canvas.height;
  o.clearRect(0, 0, g, t);
  const r = Ut({
    getViewportInfo: i.getViewportInfo,
    columnToPixelX: i.columnToPixelX ? (S, n) => i.columnToPixelX(S, e) : void 0,
    pixelXToColumn: i.pixelXToColumn ? (S, n) => i.pixelXToColumn(S, e) : void 0
  }), s = Zt({
    coords: r,
    getMacrobeatInfo: i.getMacrobeatInfo,
    getPlacedTonicSigns: () => e.placedTonicSigns,
    getTonicSpanColumnIndices: i.getTonicSpanColumnIndices,
    getAnacrusisColors: i.getAnacrusisColors
  }), h = Qt({
    coords: r,
    getDegreeForNote: i.getDegreeForNote,
    hasAccidental: i.hasAccidental,
    getEnharmonicDegree: i.getEnharmonicDegree,
    getAnimationEffectsManager: i.getAnimationEffectsManager
  }), f = {
    ...e,
    canvasWidth: g,
    canvasHeight: t
  }, a = {
    ...e,
    placedNotes: e.placedNotes
  };
  s.drawHorizontalLines(o, f), s.drawVerticalLines(o, f);
  const { startRow: p, endRow: c } = r.getVisibleRowRange(), l = e.placedNotes.filter((S) => {
    if (S.isDrum) return !1;
    const n = S.globalRow ?? S.row;
    return n >= p && n <= c;
  });
  for (const S of l) {
    const n = S.globalRow ?? S.row;
    S.shape === "circle" ? h.drawTwoColumnOvalNote(o, a, S, n) : h.drawSingleColumnOvalNote(o, a, S, n);
  }
  for (const S of e.placedTonicSigns) {
    const n = S.globalRow ?? S.row;
    n >= p && n <= c && en(o, e, S, r);
  }
}
function en(o, e, i, g) {
  const { cellWidth: t, cellHeight: r } = e, s = g.getRowY(i.globalRow ?? i.row, e), h = g.getColumnX(i.columnIndex, e), f = t * 2, a = h + f / 2, p = Math.min(f, r) / 2 * 0.9;
  if (p < 2 || (o.beginPath(), o.arc(a, s, p, 0, 2 * Math.PI), o.strokeStyle = "#212529", o.lineWidth = Math.max(0.5, t * 0.05), o.stroke(), i.tonicNumber == null)) return;
  const c = i.tonicNumber.toString(), l = p * 1.5;
  l < 6 || (o.fillStyle = "#212529", o.font = `bold ${l}px 'Atkinson Hyperlegible', sans-serif`, o.textAlign = "center", o.textBaseline = "middle", o.fillText(c, a, s));
}
const tn = ["H", "M", "L"];
function nn(o) {
  if (o.length === 0) return [];
  const e = [...o].sort((g, t) => g.start - t.start), i = [];
  for (const g of e) {
    if (i.length === 0) {
      i.push({ ...g });
      continue;
    }
    const t = i[i.length - 1];
    g.start <= t.end ? t.end = Math.max(t.end, g.end) : i.push({ ...g });
  }
  return i;
}
function on(o, e, i) {
  const g = /* @__PURE__ */ new Set([o, e]);
  i.forEach((s) => {
    const h = Math.max(o, Math.min(e, s.start)), f = Math.max(o, Math.min(e, s.end));
    f > h && (g.add(h), g.add(f));
  });
  const t = Array.from(g).sort((s, h) => s - h), r = [];
  for (let s = 0; s < t.length - 1; s++) {
    const h = t[s], f = t[s + 1], a = (h + f) / 2, p = i.some((c) => a >= c.start && a < c.end);
    f > h && r.push({ from: h, to: f, light: p });
  }
  return r;
}
function ze(o, e) {
  return e.some(
    (i) => o === i.columnIndex || o === i.columnIndex + 1
  );
}
function sn(o, e) {
  return !e.some((i) => o === i.columnIndex + 1);
}
function je(o, e, i, g, t, r, s = 1) {
  const h = i + t / 2, f = g + r / 2, a = Math.min(t, r) * 0.4 * s;
  if (o.beginPath(), e === 0)
    o.moveTo(h, f - a), o.lineTo(h - a, f + a), o.lineTo(h + a, f + a), o.closePath();
  else if (e === 1)
    o.moveTo(h, f - a), o.lineTo(h + a, f), o.lineTo(h, f + a), o.lineTo(h - a, f), o.closePath();
  else {
    for (let c = 0; c < 5; c++) {
      const l = 2 * Math.PI / 5 * c - Math.PI / 2, S = h + a * Math.cos(l), n = f + a * Math.sin(l);
      c === 0 ? o.moveTo(S, n) : o.lineTo(S, n);
    }
    o.closePath();
  }
  o.fill();
}
function an(o) {
  const { coords: e } = o, i = {
    stroke: "#c7cfd8"
  };
  function g(f, a) {
    const p = [];
    return a !== null && a > 0 && p.push({
      start: e.getColumnX(0, f),
      end: e.getColumnX(a, f)
    }), f.placedTonicSigns.forEach((c) => {
      const l = e.getColumnX(c.columnIndex, f), S = e.getColumnX(c.columnIndex + 2, f);
      p.push({ start: l, end: S });
    }), nn(p);
  }
  function t(f) {
    if (!f.hasAnacrusis || !o.getMacrobeatInfo) return null;
    const a = f.macrobeatBoundaryStyles.findIndex(
      (c) => c === "solid"
    );
    if (a < 0) return null;
    const p = o.getMacrobeatInfo(a);
    return p ? p.endColumn + 1 : null;
  }
  function r(f, a, p) {
    var A, C;
    const {
      columnWidths: c,
      musicalColumnWidths: l,
      macrobeatGroupings: S,
      macrobeatBoundaryStyles: n,
      placedTonicSigns: u
    } = a, I = (l && l.length > 0 ? l : c).length, d = [];
    for (let m = 0; m < S.length; m++) {
      const y = (A = o.getMacrobeatInfo) == null ? void 0 : A.call(o, m);
      y && d.push(y.endColumn + 1);
    }
    const N = ((C = o.getAnacrusisColors) == null ? void 0 : C.call(o)) ?? i;
    for (let m = 0; m <= I; m++) {
      const y = m === 0 || m === I, b = ze(m, u), x = u.some((P) => m === P.columnIndex + 2), D = d.includes(m);
      if (!sn(m, u)) continue;
      let v = null;
      if (y || b || x)
        v = { lineWidth: 2, strokeStyle: "#adb5bd", dash: [] };
      else if (D) {
        const P = d.indexOf(m), F = n[P];
        F === "anacrusis" ? v = { lineWidth: 1, strokeStyle: N.stroke, dash: [4, 4] } : v = {
          lineWidth: 1,
          strokeStyle: "#adb5bd",
          dash: F === "solid" ? [] : [5, 5]
        };
      }
      if (!v) continue;
      const O = e.getColumnX(m, a);
      f.beginPath(), f.moveTo(O, 0), f.lineTo(O, p), f.lineWidth = v.lineWidth, f.strokeStyle = v.strokeStyle, f.setLineDash(v.dash), f.stroke();
    }
    f.setLineDash([]);
  }
  function s(f, a, p, c) {
    var M;
    const l = t(a), S = g(a, l), n = on(0, c, S), u = ((M = o.getAnacrusisColors) == null ? void 0 : M.call(o)) ?? i;
    for (let I = 0; I < 4; I++) {
      const d = I * p;
      n.forEach((N) => {
        N.to <= N.from || (f.beginPath(), f.moveTo(N.from, d), f.lineTo(N.to, d), f.strokeStyle = N.light ? u.stroke : "#ced4da", f.lineWidth = 1, f.globalAlpha = N.light ? 0.6 : 1, f.stroke(), f.globalAlpha = 1);
      });
    }
  }
  function h(f, a, p) {
    var I;
    const { placedNotes: c, columnWidths: l, cellWidth: S, placedTonicSigns: n, modulationMarkers: u } = a, M = l.length + 4;
    for (let d = 0; d < M; d++) {
      if (ze(d, n)) continue;
      const N = e.getColumnX(d, a);
      let A;
      u && u.length > 0 ? A = e.getColumnX(d + 1, a) - N : A = (l[d] ?? 0) * S;
      for (let C = 0; C < 3; C++) {
        const m = C * p, y = tn[C], b = c.find(
          (x) => x.isDrum && (typeof x.drumTrack == "number" ? String(x.drumTrack) : x.drumTrack) === y && x.startColumnIndex === d
        );
        if (b) {
          f.fillStyle = b.color;
          const x = ((I = o.getAnimationScale) == null ? void 0 : I.call(o, d, y)) ?? 1;
          je(f, C, N, m, A, p, x);
        } else
          f.fillStyle = "#ced4da", f.beginPath(), f.arc(N + A / 2, m + p / 2, 2, 0, Math.PI * 2), f.fill();
      }
    }
  }
  return {
    drawVerticalLines: r,
    drawHorizontalLines: s,
    drawDrumNotes: h,
    drawDrumShape: je,
    buildLightRanges: g,
    getAnacrusisEndColumn: t
  };
}
function Ln(o, e, i) {
  var a;
  const g = o.canvas.width, t = o.canvas.height;
  o.clearRect(0, 0, g, t);
  const r = e.baseDrumRowHeight ?? 30, s = e.drumHeightScaleFactor ?? 1.5, h = Math.max(r, s * e.cellHeight), f = an(i);
  f.drawHorizontalLines(o, e, h, g), f.drawVerticalLines(o, e, t), f.drawDrumNotes(o, e, h), i.renderModulationMarkers && ((a = e.modulationMarkers) != null && a.length) && i.renderModulationMarkers(o, e);
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
function rn(o = {}) {
  const e = {
    ...me,
    ...o,
    accuracyTiers: o.accuracyTiers ? {
      ...me.accuracyTiers,
      ...o.accuracyTiers
    } : me.accuracyTiers
  }, i = /* @__PURE__ */ new Map(), g = /* @__PURE__ */ new Map();
  function t(c, l) {
    return (c - l) * 100;
  }
  function r(c, l) {
    return Math.abs(t(c.midi, l)) <= e.pitchToleranceCents;
  }
  function s(c, l) {
    return c.length === 0 ? 0 : c.reduce((n, u) => n + Math.abs(t(u.midi, l)), 0) / c.length;
  }
  function h(c, l, S, n) {
    if (c.length === 0) return 0;
    const u = c.filter((I) => r(I, l));
    if (u.length === 0) return 0;
    let M = 0;
    for (let I = 0; I < u.length; I++) {
      const d = u[I], N = u[I + 1];
      if (N)
        M += N.timeMs - d.timeMs;
      else {
        const A = S + n, C = Math.min(50, A - d.timeMs);
        M += C;
      }
    }
    return M / n * 100;
  }
  function f(c, l, S) {
    const n = e.accuracyTiers;
    if (!n) return "okay";
    const u = Math.abs(c);
    return u <= n.perfect.onsetMs && l <= n.perfect.pitchCents && S >= n.perfect.coverage ? "perfect" : u <= n.good.onsetMs && l <= n.good.pitchCents && S >= n.good.coverage ? "good" : u <= n.okay.onsetMs && l <= n.okay.pitchCents && S >= n.okay.coverage ? "okay" : "miss";
  }
  function a(c) {
    const { note: l, samples: S, onsetSample: n, releaseSample: u } = c;
    let M = 0;
    n ? M = n.timeMs - l.startTimeMs : M = e.onsetToleranceMs * 2;
    let I = 0;
    const d = l.startTimeMs + l.durationMs;
    u ? I = u.timeMs - d : I = e.releaseToleranceMs * 2;
    const N = s(S, l.midi), A = h(
      S,
      l.midi,
      l.startTimeMs,
      l.durationMs
    ), C = Math.abs(M) <= e.onsetToleranceMs, m = Math.abs(I) <= e.releaseToleranceMs, y = A >= e.hitThreshold, b = C && m && y ? "hit" : "miss", x = f(
      M,
      N,
      A
    );
    return {
      hitStatus: b,
      onsetAccuracyMs: M,
      releaseAccuracyMs: I,
      pitchAccuracyCents: N,
      pitchCoverage: A,
      pitchSamples: [...S],
      accuracyTier: x
    };
  }
  return {
    startNote(c, l) {
      i.set(c, {
        note: l,
        samples: [],
        onsetSample: null,
        releaseSample: null,
        startedAt: performance.now()
      });
    },
    recordPitchSample(c) {
      for (const [l, S] of i) {
        const { note: n } = S, u = n.startTimeMs + n.durationMs, M = e.onsetToleranceMs, I = e.releaseToleranceMs;
        c.timeMs >= n.startTimeMs - M && c.timeMs <= u + I && (S.samples.push(c), !S.onsetSample && c.timeMs >= n.startTimeMs - M && c.timeMs <= n.startTimeMs + M && r(c, n.midi) && (S.onsetSample = c), c.timeMs >= u - I && c.timeMs <= u + I && (S.releaseSample = c));
      }
    },
    endNote(c) {
      const l = i.get(c);
      if (!l) return null;
      const S = a(l);
      return g.set(c, S), i.delete(c), S;
    },
    getCurrentPerformance(c) {
      const l = i.get(c);
      if (!l) return null;
      const { note: S, samples: n, onsetSample: u } = l;
      let M = 0;
      u && (M = u.timeMs - S.startTimeMs);
      const I = s(n, S.midi), d = h(
        n,
        S.midi,
        S.startTimeMs,
        S.durationMs
      );
      return {
        onsetAccuracyMs: M,
        pitchAccuracyCents: I,
        pitchCoverage: d,
        pitchSamples: [...n]
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
const ke = {
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
function _n(o) {
  const e = {
    ...ke,
    ...o,
    feedbackConfig: {
      ...ke.feedbackConfig,
      ...o.feedbackConfig
    }
  }, { stateCallbacks: i, eventCallbacks: g, visualCallbacks: t, logger: r } = e, s = {
    isPlaying: !1,
    isPaused: !1,
    currentTimeMs: 0,
    scrollOffset: 0,
    onrampComplete: !1,
    targetNotes: [],
    activeNotes: /* @__PURE__ */ new Set(),
    startTime: null
  }, h = rn(e.feedbackConfig);
  let f = null;
  const a = /* @__PURE__ */ new Set();
  function p() {
    const m = 60 / i.getTempo() * 1e3;
    return e.leadInBeats * m;
  }
  function c() {
    return i.getViewportWidth() * e.judgmentLinePosition;
  }
  function l(C) {
    const m = e.pixelsPerSecond / 1e3, y = c(), b = p();
    return (C + b) * m - y;
  }
  function S(C) {
    const m = c(), y = i.getCellWidth(), b = C.startColumn * y - s.scrollOffset, x = C.endColumn * y - s.scrollOffset, T = e.feedbackConfig.onsetToleranceMs / 1e3 * e.pixelsPerSecond;
    return b <= m + T && x >= m - T;
  }
  function n() {
    var m, y;
    const C = /* @__PURE__ */ new Set();
    for (const b of s.targetNotes) {
      const x = b.startTimeMs + b.durationMs, D = e.feedbackConfig.onsetToleranceMs;
      if (s.currentTimeMs >= b.startTimeMs - D && s.currentTimeMs <= x + D)
        C.add(b.id), s.activeNotes.has(b.id) || (h.startNote(b.id, b), r == null || r.debug("NoteHighway", `Note ${b.id} became active`, { note: b }));
      else if (s.activeNotes.has(b.id)) {
        const T = h.endNote(b.id);
        if (T) {
          b.performance = T;
          const v = { noteId: b.id, note: b, performance: T };
          T.hitStatus === "hit" ? (g.emit("noteHit", v), (m = t == null ? void 0 : t.onNoteHit) == null || m.call(t, b.id, T.accuracyTier || "okay"), r == null || r.info("NoteHighway", `Note hit: ${b.id}`, T)) : (g.emit("noteMissed", v), (y = t == null ? void 0 : t.onNoteMiss) == null || y.call(t, b.id), r == null || r.info("NoteHighway", `Note missed: ${b.id}`, T));
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
  function M() {
    var C, m;
    if (!s.onrampComplete)
      if (s.currentTimeMs >= 0)
        s.onrampComplete = !0, g.emit("onrampComplete"), (C = t == null ? void 0 : t.clearOnrampCountdown) == null || C.call(t), r == null || r.info("NoteHighway", "Onramp complete", null);
      else {
        const b = 60 / i.getTempo() * 1e3, x = Math.abs(s.currentTimeMs), D = Math.ceil(x / b);
        (m = t == null ? void 0 : t.updateOnrampCountdown) == null || m.call(t, D);
      }
  }
  function I() {
    if (!s.isPlaying || s.isPaused || !s.startTime) {
      f = null;
      return;
    }
    const C = performance.now(), m = p();
    s.currentTimeMs = C - s.startTime - m, s.scrollOffset = l(s.currentTimeMs), M(), n(), u(), f = requestAnimationFrame(I);
  }
  function d() {
    f || (f = requestAnimationFrame(I));
  }
  function N() {
    f && (cancelAnimationFrame(f), f = null);
  }
  return {
    init(C) {
      s.targetNotes = C, r == null || r.info("NoteHighway", `Initialized with ${C.length} notes`, null);
    },
    start() {
      s.isPlaying || (s.isPlaying = !0, s.isPaused = !1, s.currentTimeMs = -p(), s.scrollOffset = l(s.currentTimeMs), s.onrampComplete = !1, s.activeNotes.clear(), s.startTime = performance.now(), a.clear(), h.reset(), d(), g.emit("playbackStarted"), r == null || r.info("NoteHighway", "Playback started", { onrampDurationMs: p() }));
    },
    pause() {
      !s.isPlaying || s.isPaused || (s.isPaused = !0, N(), g.emit("playbackPaused"), r == null || r.info("NoteHighway", "Playback paused", { currentTimeMs: s.currentTimeMs }));
    },
    resume() {
      if (!s.isPlaying || !s.isPaused || !s.startTime) return;
      const C = performance.now() - (s.startTime + s.currentTimeMs + p());
      s.startTime += C, s.isPaused = !1, d(), g.emit("playbackResumed"), r == null || r.info("NoteHighway", "Playback resumed", null);
    },
    stop() {
      var m, y;
      if (!s.isPlaying) return;
      s.isPlaying = !1, s.isPaused = !1, s.currentTimeMs = 0, s.scrollOffset = 0, s.onrampComplete = !1, s.activeNotes.clear(), s.startTime = null, a.clear(), N(), (m = t == null ? void 0 : t.clearCanvas) == null || m.call(t), (y = t == null ? void 0 : t.clearOnrampCountdown) == null || y.call(t), g.emit("playbackStopped"), s.targetNotes.every((b) => b.performance !== void 0) && g.emit("performanceComplete"), r == null || r.info("NoteHighway", "Playback stopped", null);
    },
    setScrollOffset(C) {
      if (s.currentTimeMs = C, s.scrollOffset = l(C), s.isPlaying) {
        const m = p();
        s.startTime = performance.now() - (C + m);
      }
      r == null || r.debug("NoteHighway", "Scroll offset set", { timeMs: C, scrollOffset: s.scrollOffset });
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
      c();
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
      N(), h.dispose(), s.targetNotes = [], s.activeNotes.clear(), a.clear(), r == null || r.info("NoteHighway", "Service disposed", null);
    }
  };
}
function Ze(o) {
  return 60 / o / 2;
}
function ln(o, e) {
  const { timeMap: i, tempo: g, cellWidth: t } = e;
  let r, s;
  if (i && i.length > 0) {
    const a = i[o.startColumnIndex] ?? 0, p = i[o.endColumnIndex] ?? a;
    r = a * 1e3, s = p * 1e3;
  } else {
    const a = e.microbeatDurationSec ?? Ze(g);
    r = o.startColumnIndex * a * 1e3, s = o.endColumnIndex * a * 1e3;
  }
  const h = s - r, f = o.globalRow !== void 0 ? 108 - o.globalRow : 60;
  return {
    id: o.uuid ?? `note-${o.startColumnIndex}-${o.row}`,
    midi: f,
    startTimeMs: r,
    durationMs: h,
    startColumn: o.startColumnIndex,
    endColumn: o.endColumnIndex,
    color: o.color,
    shape: o.shape,
    globalRow: o.globalRow ?? o.row
  };
}
function cn(o, e) {
  return o.filter((g) => !g.isDrum).map((g) => ln(g, e));
}
function Vn(o, e) {
  const i = [0];
  let g = 0;
  for (let t = 0; t < o.length; t++) {
    const r = o[t] ?? 1;
    g += r * e, i.push(g);
  }
  return i;
}
function $n(o, e) {
  const i = Ze(o.tempo), g = {
    tempo: o.tempo,
    cellWidth: o.cellWidth,
    timeMap: e,
    microbeatDurationSec: i
  };
  return cn(o.placedNotes, g);
}
const Wn = "0.1.0";
export {
  _t as ClippingMonitor,
  Ht as DEFAULT_CONTEXT_OPTIONS,
  $t as DEFAULT_DRUM_SAMPLES,
  Rt as FilteredVoice,
  Gt as GainManager,
  Q as MODULATION_RATIOS,
  Wn as VERSION,
  Ze as calculateMicrobeatDuration,
  Nn as canvasToTime,
  Tn as canvasToVisual,
  Sn as canvasXToSeconds,
  gn as columnToRegularTime,
  Bn as configureAudioContext,
  ln as convertNoteToHighway,
  cn as convertNotesToHighway,
  $n as convertStateToHighway,
  Ot as createColumnMapService,
  pn as createCoordinateMapping,
  qt as createDrumManager,
  Pn as createEngineController,
  rn as createFeedbackCollector,
  En as createLessonMode,
  bt as createModulationMarker,
  _n as createNoteHighwayService,
  Vn as createSimpleTimeMap,
  Et as createStore,
  Dn as createSynthEngine,
  Vt as createTimeMapCalculator,
  Fn as createTransportService,
  z as fullRowData,
  In as getCanvasColumnWidths,
  bn as getColumnEntry,
  Ye as getColumnEntryByCanvas,
  Mn as getColumnType,
  Rn as getContextInfo,
  gt as getInitialState,
  wn as getMacrobeatBoundary,
  fn as getModulationColor,
  mn as getModulationDisplayText,
  Qe as getPerVoiceBaselineGain,
  hn as getPitchByIndex,
  un as getPitchByToneNote,
  Le as getPitchIndex,
  Bt as getTimeBoundaryAfterMacrobeat,
  xn as getTotalCanvasWidth,
  vn as isPlayableColumn,
  Ln as renderDrumGrid,
  Gn as renderPitchGrid,
  lt as resolvePitchRange,
  yn as secondsToCanvasX,
  On as setVoiceLogger,
  An as timeToCanvas,
  Ft as timeToVisual,
  Cn as visualToCanvas,
  Dt as visualToTime
};
//# sourceMappingURL=index.js.map
