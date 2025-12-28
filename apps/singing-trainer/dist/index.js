import { onMount as xe, mount as Se, unmount as Ae } from "svelte";
import "svelte/internal/disclose-version";
import * as e from "svelte/internal/client";
import { calculateViewportWindow as Te, PitchGrid as Pe } from "@mlt/ui-components/canvas";
import { generateRowDataForMidiRange as we, getTonicPitchClass as Me, fullRowData as ie } from "@mlt/pitch-data";
import * as C from "tone";
import { PitchDetector as He } from "pitchy";
import { DualPitchWheel as De } from "@mlt/ui-components/pitch-wheels";
import { writeHandoffSlot as Ce, navigateToStudentNotation as Re, checkForHandoff as qe, consumeHandoffSlot as Ie, clearHandoffParams as V, SNAPSHOT_SCHEMA_VERSION as ae } from "@mlt/handoff";
const se = {
  isDetecting: !1,
  visualizationMode: "stationary",
  tonic: "C",
  useDegrees: !1,
  showAccidentals: !0,
  yAxisRange: { minMidi: 48, maxMidi: 72 },
  drone: { isPlaying: !1, octave: 3, volume: -12 }
};
function Fe() {
  let t = e.state(e.proxy({ ...se }));
  return {
    get state() {
      return e.get(t);
    },
    toggleDetecting() {
      e.get(t).isDetecting = !e.get(t).isDetecting;
    },
    setDetecting(n) {
      e.get(t).isDetecting = n;
    },
    setVisualizationMode(n) {
      e.get(t).visualizationMode = n;
    },
    setTonic(n) {
      e.get(t).tonic = n;
    },
    setUseDegrees(n) {
      e.get(t).useDegrees = n;
    },
    setShowAccidentals(n) {
      e.get(t).showAccidentals = n;
    },
    setYAxisRange(n) {
      e.get(t).yAxisRange = n;
    },
    expandYAxisUpper() {
      e.get(t).yAxisRange.maxMidi < 108 && (e.get(t).yAxisRange = {
        ...e.get(t).yAxisRange,
        maxMidi: e.get(t).yAxisRange.maxMidi + 1
      });
    },
    contractYAxisUpper() {
      e.get(t).yAxisRange.maxMidi > e.get(t).yAxisRange.minMidi + 6 && (e.get(t).yAxisRange = {
        ...e.get(t).yAxisRange,
        maxMidi: e.get(t).yAxisRange.maxMidi - 1
      });
    },
    expandYAxisLower() {
      e.get(t).yAxisRange.minMidi > 21 && (e.get(t).yAxisRange = {
        ...e.get(t).yAxisRange,
        minMidi: e.get(t).yAxisRange.minMidi - 1
      });
    },
    contractYAxisLower() {
      e.get(t).yAxisRange.minMidi < e.get(t).yAxisRange.maxMidi - 6 && (e.get(t).yAxisRange = {
        ...e.get(t).yAxisRange,
        minMidi: e.get(t).yAxisRange.minMidi + 1
      });
    },
    toggleDrone() {
      e.get(t).drone = {
        ...e.get(t).drone,
        isPlaying: !e.get(t).drone.isPlaying
      };
    },
    setDroneOctave(n) {
      e.get(t).drone = { ...e.get(t).drone, octave: n };
    },
    setDroneVolume(n) {
      e.get(t).drone = { ...e.get(t).drone, volume: n };
    },
    reset() {
      e.set(t, { ...se }, !0);
    }
  };
}
const l = Fe(), Le = 500, oe = {
  currentPitch: null,
  history: [],
  stablePitch: { pitchClass: null, opacity: 0, size: 1 }
};
function ke() {
  let t = e.state(e.proxy({ ...oe }));
  return {
    get state() {
      return e.get(t);
    },
    setCurrentPitch(n) {
      e.get(t).currentPitch = n;
    },
    addHistoryPoint(n) {
      const i = [...e.get(t).history, n];
      i.length > Le && i.shift(), e.get(t).history = i;
    },
    setStablePitch(n) {
      e.get(t).stablePitch = n;
    },
    clearHistory() {
      e.get(t).history = [];
    },
    reset() {
      e.set(t, { ...oe }, !0);
    }
  };
}
const p = ke(), re = {
  isPlaying: !1,
  startTime: null,
  currentTimeMs: 0,
  targetNotes: [],
  nowLineX: 100,
  pixelsPerSecond: 200,
  timeWindowMs: 4e3
};
function Ee() {
  let t = e.state(e.proxy({ ...re })), n = null;
  function i() {
    e.get(t).isPlaying && e.get(t).startTime !== null && (e.get(t).currentTimeMs = performance.now() - e.get(t).startTime, n = requestAnimationFrame(i));
  }
  return {
    get state() {
      return e.get(t);
    },
    start() {
      e.get(t).isPlaying = !0, e.get(t).startTime = performance.now(), e.get(t).currentTimeMs = 0, n = requestAnimationFrame(i);
    },
    stop() {
      e.get(t).isPlaying = !1, n !== null && (cancelAnimationFrame(n), n = null);
    },
    pause() {
      e.get(t).isPlaying = !1, n !== null && (cancelAnimationFrame(n), n = null);
    },
    resume() {
      if (e.get(t).startTime !== null) {
        const o = performance.now() - (e.get(t).startTime + e.get(t).currentTimeMs);
        e.get(t).startTime += o, e.get(t).isPlaying = !0, n = requestAnimationFrame(i);
      }
    },
    setTargetNotes(o) {
      e.get(t).targetNotes = o;
    },
    markNoteHit(o) {
      o >= 0 && o < e.get(t).targetNotes.length && (e.get(t).targetNotes = e.get(t).targetNotes.map((r, c) => c === o ? { ...r, hit: !0 } : r));
    },
    setNowLineX(o) {
      e.get(t).nowLineX = o;
    },
    setPixelsPerSecond(o) {
      e.get(t).pixelsPerSecond = o;
    },
    setTimeWindowMs(o) {
      e.get(t).timeWindowMs = o;
    },
    reset() {
      n !== null && (cancelAnimationFrame(n), n = null), e.set(t, { ...re }, !0);
    }
  };
}
const N = Ee();
var Ne = e.from_html('<div class="singing-canvas-container svelte-15ar5r5"><!></div>');
function Oe(t, n) {
  e.push(n, !0);
  let i = e.state(void 0), o = e.state(800), r = e.state(400);
  const c = e.derived(() => we(l.state.yAxisRange.minMidi, l.state.yAxisRange.maxMidi)), u = e.derived(() => Te({
    containerHeight: e.get(r),
    fullRowData: e.get(c),
    preferredCellHeight: 40,
    minCellHeight: 20
  })), g = e.derived(() => l.state.visualizationMode === "highway" ? "highway" : "singing");
  function s() {
    return p.state.history.map((v) => ({
      frequency: v.frequency,
      midi: v.midi,
      time: v.time,
      clarity: v.clarity
    }));
  }
  function a() {
    return N.state.targetNotes.map((v, m) => ({
      id: `target-${m}`,
      midi: v.midi,
      startTimeMs: v.startTimeMs,
      durationMs: v.durationMs
    }));
  }
  const d = e.derived(() => ({
    timeWindowMs: 4e3,
    pixelsPerSecond: 200,
    circleRadius: 9.5,
    proximityThreshold: 35,
    maxConnections: 3,
    connectorLineWidth: 2.5,
    connectorColor: "rgba(0,0,0,0.4)",
    useTonicRelativeColors: !0,
    tonicPitchClass: Me(l.state.tonic),
    clarityThreshold: 0.5,
    maxOpacity: 0.9
  })), h = e.derived(() => e.get(g) === "singing" ? {
    userPitch: p.state.currentPitch ? {
      frequency: p.state.currentPitch.frequency,
      midi: p.state.currentPitch.midi,
      clarity: p.state.currentPitch.clarity,
      pitchClass: p.state.currentPitch.pitchClass
    } : null,
    pitchHistory: s(),
    targetNotes: [],
    pixelsPerSecond: 200,
    timeWindowMs: 4e3,
    trailConfig: e.get(d)
  } : void 0), _ = e.derived(() => e.get(g) === "highway" ? {
    userPitch: p.state.currentPitch ? {
      frequency: p.state.currentPitch.frequency,
      midi: p.state.currentPitch.midi,
      clarity: p.state.currentPitch.clarity,
      pitchClass: p.state.currentPitch.pitchClass
    } : null,
    pitchHistory: s(),
    targetNotes: a(),
    nowLineX: N.state.nowLineX,
    pixelsPerSecond: N.state.pixelsPerSecond,
    currentTimeMs: N.state.currentTimeMs,
    timeWindowMs: N.state.timeWindowMs,
    trailConfig: e.get(d)
  } : void 0), P = e.derived(() => ({
    startRow: e.get(u).startRow,
    endRow: e.get(u).endRow,
    zoomLevel: 1,
    containerWidth: e.get(o),
    containerHeight: e.get(r)
  }));
  e.user_effect(() => {
    if (!e.get(i)) return;
    const v = new ResizeObserver((m) => {
      for (const y of m)
        e.set(o, y.contentRect.width, !0), e.set(r, y.contentRect.height, !0);
    });
    return v.observe(e.get(i)), () => {
      v.disconnect();
    };
  });
  var f = Ne(), x = e.child(f);
  Pe(x, {
    get mode() {
      return e.get(g);
    },
    get fullRowData() {
      return e.get(c);
    },
    get viewport() {
      return e.get(P);
    },
    cellWidth: 20,
    get cellHeight() {
      return e.get(u).cellHeight;
    },
    colorMode: "color",
    showOctaveLabels: !0,
    showFrequencyLabels: !1,
    get singingConfig() {
      return e.get(h);
    },
    get highwayConfig() {
      return e.get(_);
    }
  }), e.reset(f), e.bind_this(f, (v) => e.set(i, v), () => e.get(i)), e.append(t, f), e.pop();
}
const D = {
  FFT_SIZE: 2048,
  CLARITY_THRESHOLD: 0.8,
  MIN_PITCH_HZ: 60,
  MAX_PITCH_HZ: 1600,
  STABILITY_THRESHOLD: 15,
  HIGHLIGHT_FADE_SPEED: 0.2
};
let I = null, F = null, W = null, R = null, Y = !1, O = -1, $ = 0, le = 0, ce = 1;
function $e(t) {
  return 12 * Math.log2(t / 440) + 69;
}
function de() {
  if (!Y || !F || !W) {
    R = null;
    return;
  }
  const t = F.getValue(), [n, i] = W.findPitch(t, C.getContext().sampleRate), o = n !== null && i > D.CLARITY_THRESHOLD && n > D.MIN_PITCH_HZ && n < D.MAX_PITCH_HZ;
  if (o) {
    const s = $e(n), a = {
      frequency: n,
      midi: s,
      clarity: i,
      pitchClass: Math.round(s) % 12
    };
    p.setCurrentPitch(a), p.addHistoryPoint({
      frequency: n,
      midi: s,
      time: performance.now(),
      clarity: i
    });
  } else
    p.addHistoryPoint({
      frequency: 0,
      midi: 0,
      time: performance.now(),
      clarity: 0
    });
  const r = o && p.state.currentPitch ? Math.round(p.state.currentPitch.midi) % 12 : -1;
  r === O && r !== -1 ? $++ : ($ = 0, O = r), le = $ >= D.STABILITY_THRESHOLD ? 1 : 0, ce = $ >= D.STABILITY_THRESHOLD ? 1.05 : 1;
  const c = p.state.stablePitch, u = c.opacity + (le - c.opacity) * D.HIGHLIGHT_FADE_SPEED, g = c.size + (ce - c.size) * D.HIGHLIGHT_FADE_SPEED;
  p.setStablePitch({
    pitchClass: O >= 0 ? O : null,
    opacity: u,
    size: g
  }), R = requestAnimationFrame(de);
}
async function ze() {
  if (!Y) {
    R !== null && cancelAnimationFrame(R), I = new C.UserMedia(), F = new C.Analyser("waveform", D.FFT_SIZE), W = He.forFloat32Array(F.size);
    try {
      await C.start(), await I.open(), I.connect(F), Y = !0, de();
    } catch (t) {
      throw console.error("Microphone access denied or failed:", t), ge(), t;
    }
  }
}
function Ge() {
  Y = !1, ge();
}
function ge() {
  R !== null && (cancelAnimationFrame(R), R = null), I && (I.close(), I = null), F = null, W = null, $ = 0, O = -1, p.setStablePitch({ pitchClass: null, opacity: 0, size: 1 }), p.setCurrentPitch(null);
}
var je = e.from_html('<span class="spinner svelte-cytsjj"></span> Starting...', 1), Be = e.from_html('<span class="icon svelte-cytsjj">&#9632;</span> Stop', 1), Ve = e.from_html('<span class="icon svelte-cytsjj">&#9654;</span> Start', 1), We = e.from_html("<button><!></button>");
function Ye(t, n) {
  e.push(n, !0);
  let i = e.state(!1);
  async function o() {
    if (!e.get(i))
      if (l.state.isDetecting)
        Ge(), l.setDetecting(!1), p.reset();
      else {
        e.set(i, !0);
        try {
          await ze(), l.setDetecting(!0);
        } catch (a) {
          console.error("Failed to start detection:", a), alert("Could not access microphone. Please grant permission and try again.");
        } finally {
          e.set(i, !1);
        }
      }
  }
  var r = We();
  let c;
  r.__click = o;
  var u = e.child(r);
  {
    var g = (a) => {
      var d = je();
      e.next(), e.append(a, d);
    }, s = (a) => {
      var d = e.comment(), h = e.first_child(d);
      {
        var _ = (f) => {
          var x = Be();
          e.next(), e.append(f, x);
        }, P = (f) => {
          var x = Ve();
          e.next(), e.append(f, x);
        };
        e.if(
          h,
          (f) => {
            l.state.isDetecting ? f(_) : f(P, !1);
          },
          !0
        );
      }
      e.append(a, d);
    };
    e.if(u, (a) => {
      e.get(i) ? a(g) : a(s, !1);
    });
  }
  e.reset(r), e.template_effect(() => {
    c = e.set_class(r, 1, "start-button svelte-cytsjj", null, c, {
      active: l.state.isDetecting,
      loading: e.get(i)
    }), r.disabled = e.get(i);
  }), e.append(t, r), e.pop();
}
e.delegate(["click"]);
let T = null, z = !1, G = null;
function Ue() {
  var t;
  if (!T) {
    T = new C.PolySynth(C.Synth, {
      oscillator: { type: "sawtooth" },
      envelope: {
        attack: 0.3,
        decay: 0.1,
        sustain: 0.8,
        release: 0.5
      }
    }).toDestination();
    const n = ((t = T.get().oscillator) == null ? void 0 : t.type) ?? "unknown";
    console.log("[DroneAudio] Initialized drone synth", { oscillatorType: n });
  }
  return T;
}
function ue(t, n) {
  return `${t.replace("b", "#").replace("Db", "C#").replace("Eb", "D#").replace("Gb", "F#").replace("Ab", "G#").replace("Bb", "A#")}${n}`;
}
async function Xe() {
  await C.start();
  const t = Ue(), n = ue(l.state.tonic, l.state.drone.octave);
  t.volume.value = l.state.drone.volume, console.log("[DroneAudio] Starting drone", {
    note: n,
    volume: t.volume.value
  }), G && t.releaseAll(), G = n, t.triggerAttack(n), z = !0;
}
function Ze() {
  T && z && (T.releaseAll(), G = null, z = !1);
}
function ee() {
  if (!z || !T) return;
  const t = ue(l.state.tonic, l.state.drone.octave);
  T.volume.value = l.state.drone.volume, console.log("[DroneAudio] Updating drone", {
    note: t,
    volume: T.volume.value
  }), t !== G && (T.releaseAll(), T.triggerAttack(t), G = t);
}
async function Ke() {
  z ? Ze() : await Xe();
}
var Je = e.from_html("<option> </option>"), Qe = e.from_html('<div class="tonic-selector svelte-16h7our"><label for="tonic-select" class="svelte-16h7our">Key:</label> <select id="tonic-select" class="svelte-16h7our"></select></div>');
function et(t, n) {
  e.push(n, !0);
  const i = [
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
  function o(g) {
    const s = g.target;
    l.setTonic(s.value), ee();
  }
  var r = Qe(), c = e.sibling(e.child(r), 2);
  c.__change = o, e.each(c, 21, () => i, e.index, (g, s) => {
    var a = Je(), d = e.child(a, !0);
    e.reset(a);
    var h = {};
    e.template_effect(() => {
      e.set_text(d, e.get(s)), h !== (h = e.get(s)) && (a.value = (a.__value = e.get(s)) ?? "");
    }), e.append(g, a);
  }), e.reset(c);
  var u;
  e.init_select(c), e.reset(r), e.template_effect(() => {
    u !== (u = l.state.tonic) && (c.value = (c.__value = l.state.tonic) ?? "", e.select_option(c, l.state.tonic));
  }), e.append(t, r), e.pop();
}
e.delegate(["change"]);
var tt = e.from_html("<option> </option>"), nt = e.from_html('<div class="drone-controls svelte-1rkr6nv"><button> </button> <div class="drone-settings svelte-1rkr6nv"><label class="svelte-1rkr6nv">Oct: <select class="svelte-1rkr6nv"></select></label> <label class="svelte-1rkr6nv">Vol: <input type="range" min="-40" max="0" class="svelte-1rkr6nv"/></label></div></div>');
function it(t, n) {
  e.push(n, !0);
  const i = [2, 3, 4, 5];
  async function o() {
    await Ke(), l.toggleDrone();
  }
  function r(v) {
    const m = v.target;
    l.setDroneOctave(parseInt(m.value, 10)), ee();
  }
  function c(v) {
    const m = v.target;
    l.setDroneVolume(parseInt(m.value, 10)), ee();
  }
  var u = nt(), g = e.child(u);
  let s;
  g.__click = o;
  var a = e.child(g, !0);
  e.reset(g);
  var d = e.sibling(g, 2), h = e.child(d), _ = e.sibling(e.child(h));
  _.__change = r, e.each(_, 21, () => i, e.index, (v, m) => {
    var y = tt(), H = e.child(y, !0);
    e.reset(y);
    var w = {};
    e.template_effect(() => {
      e.set_text(H, e.get(m)), w !== (w = e.get(m)) && (y.value = (y.__value = e.get(m)) ?? "");
    }), e.append(v, y);
  }), e.reset(_);
  var P;
  e.init_select(_), e.reset(h);
  var f = e.sibling(h, 2), x = e.sibling(e.child(f));
  e.remove_input_defaults(x), x.__input = c, e.reset(f), e.reset(d), e.reset(u), e.template_effect(() => {
    s = e.set_class(g, 1, "drone-toggle svelte-1rkr6nv", null, s, { active: l.state.drone.isPlaying }), e.set_text(a, l.state.drone.isPlaying ? "Drone On" : "Drone Off"), P !== (P = l.state.drone.octave) && (_.value = (_.__value = l.state.drone.octave) ?? "", e.select_option(_, l.state.drone.octave)), e.set_value(x, l.state.drone.volume);
  }), e.append(t, u), e.pop();
}
e.delegate(["click", "change", "input"]);
var at = e.from_html("<button> </button>"), st = e.from_html('<div class="mode-toggle svelte-i9tkj4"></div>');
function ot(t, n) {
  e.push(n, !0);
  const i = [
    { value: "stationary", label: "Stationary" },
    { value: "highway", label: "Highway" }
  ];
  function o(c) {
    l.setVisualizationMode(c);
  }
  var r = st();
  e.each(r, 21, () => i, e.index, (c, u) => {
    let g = () => e.get(u).value, s = () => e.get(u).label;
    var a = at();
    let d;
    a.__click = () => o(g());
    var h = e.child(a, !0);
    e.reset(a), e.template_effect(() => {
      d = e.set_class(a, 1, "mode-button svelte-i9tkj4", null, d, { active: l.state.visualizationMode === g() }), e.set_text(h, s());
    }), e.append(c, a);
  }), e.reset(r), e.append(t, r), e.pop();
}
e.delegate(["click"]);
var rt = e.from_html('<div class="range-control svelte-1es7ond"><h3 class="control-title svelte-1es7ond">Pitch Range</h3> <!></div>');
function lt(t, n) {
  e.push(n, !0);
  function i(s) {
    const a = ie.findIndex((d) => d.midi === s);
    return a >= 0 ? a : 0;
  }
  const o = e.derived(() => i(l.state.yAxisRange.maxMidi)), r = e.derived(() => i(l.state.yAxisRange.minMidi));
  function c(s) {
    const a = s.bottomPitch.midi ?? 21, d = s.topPitch.midi ?? 108;
    l.setYAxisRange({ minMidi: a, maxMidi: d });
  }
  var u = rt(), g = e.sibling(e.child(u), 2);
  De(g, {
    get fullRowData() {
      return ie;
    },
    get topIndex() {
      return e.get(o);
    },
    get bottomIndex() {
      return e.get(r);
    },
    minSpan: 7,
    onrangechange: c,
    showSummary: !0,
    wheelHeight: 200
  }), e.reset(u), e.append(t, u), e.pop();
}
var ct = e.from_html('<div class="note-display svelte-1hjl33a"><span class="note-name svelte-1hjl33a"> </span> <span class="octave svelte-1hjl33a"> </span></div> <div class="details svelte-1hjl33a"><span class="frequency"> </span> <span> </span> <span class="clarity"> </span></div>', 1), dt = e.from_html('<div class="no-pitch svelte-1hjl33a"><span class="placeholder svelte-1hjl33a">---</span> <span class="hint svelte-1hjl33a">Sing or hum into the microphone</span></div>'), gt = e.from_html('<div class="pitch-readout svelte-1hjl33a"><!></div>');
function ut(t, n) {
  e.push(n, !0);
  const i = [
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
  ], o = e.derived(() => () => {
    const s = p.state.currentPitch;
    if (!s) return null;
    const a = i[s.pitchClass], d = Math.floor(s.midi / 12) - 1, h = Math.round((s.midi - Math.round(s.midi)) * 100);
    return {
      name: a,
      octave: d,
      frequency: s.frequency.toFixed(1),
      cents: h,
      clarity: Math.round(s.clarity * 100)
    };
  });
  var r = gt(), c = e.child(r);
  {
    var u = (s) => {
      const a = e.derived(() => e.get(o)());
      var d = ct(), h = e.first_child(d), _ = e.child(h), P = e.child(_, !0);
      e.reset(_);
      var f = e.sibling(_, 2), x = e.child(f, !0);
      e.reset(f), e.reset(h);
      var v = e.sibling(h, 2), m = e.child(v), y = e.child(m);
      e.reset(m);
      var H = e.sibling(m, 2);
      let w;
      var U = e.child(H);
      e.reset(H);
      var q = e.sibling(H, 2), j = e.child(q);
      e.reset(q), e.reset(v), e.template_effect(() => {
        e.set_text(P, e.get(a).name), e.set_text(x, e.get(a).octave), e.set_text(y, `${e.get(a).frequency ?? ""} Hz`), w = e.set_class(H, 1, "cents svelte-1hjl33a", null, w, { sharp: e.get(a).cents > 0, flat: e.get(a).cents < 0 }), e.set_text(U, `${e.get(a).cents > 0 ? "+" : ""}${e.get(a).cents ?? ""}¢`), e.set_text(j, `${e.get(a).clarity ?? ""}%`);
      }), e.append(s, d);
    }, g = (s) => {
      var a = dt();
      e.append(s, a);
    };
    e.if(c, (s) => {
      e.get(o)() ? s(u) : s(g, !1);
    });
  }
  e.reset(r), e.append(t, r), e.pop();
}
const Q = {
  hasImportedSnapshot: !1,
  snapshot: null,
  isLoading: !1,
  error: null,
  transpositionSemitones: 0
};
function vt() {
  let t = e.state(e.proxy({ ...Q }));
  return {
    get state() {
      return e.get(t);
    },
    /**
     * Check for and consume any pending handoff on app initialization.
     * Should be called once when the app loads.
     */
    async checkAndConsumeHandoff() {
      if (!qe())
        return !1;
      e.get(t).isLoading = !0, e.get(t).error = null;
      try {
        const i = await Ie();
        return i ? i.schemaVersion !== ae ? (e.get(t).error = `Incompatible snapshot version: ${i.schemaVersion}. Expected: ${ae}`, e.get(t).isLoading = !1, V(), !1) : (e.get(t).snapshot = i, e.get(t).hasImportedSnapshot = !0, e.get(t).isLoading = !1, V(), console.log("[HandoffState] Successfully imported snapshot", {
          voices: i.voices.length,
          microbeatCount: i.timeGrid.microbeatCount,
          tempo: i.tempo
        }), !0) : (e.get(t).error = "Handoff data expired or not found. Please try exporting again.", e.get(t).isLoading = !1, V(), !1);
      } catch (i) {
        return console.error("[HandoffState] Failed to process handoff", i), e.get(t).error = "Failed to import data from Student Notation.", e.get(t).isLoading = !1, V(), !1;
      }
    },
    /**
     * Get the imported voices.
     */
    get voices() {
      var n;
      return ((n = e.get(t).snapshot) == null ? void 0 : n.voices) ?? [];
    },
    /**
     * Get the time grid structure.
     */
    get timeGrid() {
      var n;
      return ((n = e.get(t).snapshot) == null ? void 0 : n.timeGrid) ?? null;
    },
    /**
     * Get the tempo (with transposition applied to accompaniment).
     */
    get tempo() {
      var n;
      return ((n = e.get(t).snapshot) == null ? void 0 : n.tempo) ?? 90;
    },
    /**
     * Get the suggested pitch range based on imported notes.
     */
    get suggestedPitchRange() {
      if (!e.get(t).snapshot)
        return null;
      const n = 3, i = e.get(t).snapshot.minMidiPitch, o = e.get(t).snapshot.maxMidiPitch;
      return i === void 0 || o === void 0 ? null : {
        minMidi: Math.max(21, i - n + e.get(t).transpositionSemitones),
        maxMidi: Math.min(108, o + n + e.get(t).transpositionSemitones)
      };
    },
    /**
     * Set transposition in semitones.
     */
    setTransposition(n) {
      e.get(t).transpositionSemitones = n;
    },
    /**
     * Transpose up by one semitone.
     */
    transposeUp() {
      e.get(t).transpositionSemitones += 1;
    },
    /**
     * Transpose down by one semitone.
     */
    transposeDown() {
      e.get(t).transpositionSemitones -= 1;
    },
    /**
     * Get a transposed MIDI pitch.
     */
    getTransposedMidi(n) {
      return n + e.get(t).transpositionSemitones;
    },
    /**
     * Export current state back to Student Notation.
     * Creates a new snapshot and navigates back.
     */
    async bringBackToStudentNotation() {
      if (!e.get(t).snapshot) {
        console.warn("[HandoffState] No snapshot to bring back");
        return;
      }
      const n = {
        ...e.get(t).snapshot,
        sourceApp: "singing-trainer",
        createdAt: Date.now(),
        // Apply transposition to all voices
        voices: e.get(t).snapshot.voices.map((i) => ({
          ...i,
          notes: i.notes.map((o) => ({
            ...o,
            midiPitch: o.midiPitch + e.get(t).transpositionSemitones
          }))
        }))
      };
      try {
        const i = await Ce(n);
        console.log("[HandoffState] Handoff slot written for return", i), Re(i);
      } catch (i) {
        console.error("[HandoffState] Failed to write return handoff", i);
      }
    },
    /**
     * Clear the imported snapshot.
     */
    clearSnapshot() {
      e.set(t, { ...Q }, !0);
    },
    /**
     * Reset the handoff state.
     */
    reset() {
      e.set(t, { ...Q }, !0);
    }
  };
}
const A = vt();
var pt = e.from_html('<div class="handoff-controls svelte-1n46o8q"><div class="transposition-control svelte-1n46o8q"><button class="transpose-btn svelte-1n46o8q" title="Transpose down">-</button> <span class="transposition-label svelte-1n46o8q"> </span> <button class="transpose-btn svelte-1n46o8q" title="Transpose up">+</button></div> <button class="bring-back-btn svelte-1n46o8q">Bring Back to Student Notation</button></div>'), ht = e.from_html('<div class="error-banner svelte-1n46o8q"> </div>'), ft = e.from_html('<div class="import-info svelte-1n46o8q"><span class="import-label svelte-1n46o8q">Microbeats:</span> <span class="import-value svelte-1n46o8q"> </span></div>'), mt = e.from_html('<div class="control-group svelte-1n46o8q"><h3 class="control-group-title svelte-1n46o8q">Imported Material</h3> <div class="import-info svelte-1n46o8q"><span class="import-label svelte-1n46o8q">Voices:</span> <span class="import-value svelte-1n46o8q"> </span></div> <div class="import-info svelte-1n46o8q"><span class="import-label svelte-1n46o8q">Tempo:</span> <span class="import-value svelte-1n46o8q"> </span></div> <!></div>'), _t = e.from_html('<div class="app svelte-1n46o8q"><header class="header svelte-1n46o8q"><h1 class="title svelte-1n46o8q">Singing Trainer</h1> <div class="header-controls svelte-1n46o8q"><!> <!></div></header> <!> <main class="main svelte-1n46o8q"><aside class="sidebar sidebar--left svelte-1n46o8q"><div class="control-group svelte-1n46o8q"><!></div> <div class="control-group svelte-1n46o8q"><!></div> <div class="control-group svelte-1n46o8q"><h3 class="control-group-title svelte-1n46o8q">Settings</h3> <!> <!></div> <div class="control-group svelte-1n46o8q"><!></div> <!></aside> <section class="canvas-area svelte-1n46o8q"><!></section></main></div>');
function yt(t, n) {
  e.push(n, !0), xe(async () => {
    if (await A.checkAndConsumeHandoff()) {
      console.log("[App] Handoff detected and processed");
      const b = A.suggestedPitchRange;
      b && l.setYAxisRange(b);
    }
  });
  const i = e.derived(() => A.state.hasImportedSnapshot), o = e.derived(() => A.state.transpositionSemitones), r = e.derived(() => A.state.error);
  function c() {
    A.bringBackToStudentNotation();
  }
  function u() {
    A.transposeUp();
  }
  function g() {
    A.transposeDown();
  }
  var s = _t(), a = e.child(s), d = e.sibling(e.child(a), 2), h = e.child(d);
  {
    var _ = (S) => {
      var b = pt(), M = e.child(b), L = e.child(M);
      L.__click = g;
      var k = e.sibling(L, 2), E = e.child(k);
      e.reset(k);
      var B = e.sibling(k, 2);
      B.__click = u, e.reset(M);
      var Z = e.sibling(M, 2);
      Z.__click = c, e.reset(b), e.template_effect(() => e.set_text(E, `${e.get(o) >= 0 ? "+" : ""}${e.get(o) ?? ""}`)), e.append(S, b);
    };
    e.if(h, (S) => {
      e.get(i) && S(_);
    });
  }
  var P = e.sibling(h, 2);
  ot(P, {}), e.reset(d), e.reset(a);
  var f = e.sibling(a, 2);
  {
    var x = (S) => {
      var b = ht(), M = e.child(b, !0);
      e.reset(b), e.template_effect(() => e.set_text(M, e.get(r))), e.append(S, b);
    };
    e.if(f, (S) => {
      e.get(r) && S(x);
    });
  }
  var v = e.sibling(f, 2), m = e.child(v), y = e.child(m), H = e.child(y);
  Ye(H, {}), e.reset(y);
  var w = e.sibling(y, 2), U = e.child(w);
  ut(U, {}), e.reset(w);
  var q = e.sibling(w, 2), j = e.sibling(e.child(q), 2);
  et(j, {});
  var ve = e.sibling(j, 2);
  it(ve, {}), e.reset(q);
  var X = e.sibling(q, 2), pe = e.child(X);
  lt(pe, {}), e.reset(X);
  var he = e.sibling(X, 2);
  {
    var fe = (S) => {
      var b = mt(), M = e.sibling(e.child(b), 2), L = e.sibling(e.child(M), 2), k = e.child(L, !0);
      e.reset(L), e.reset(M);
      var E = e.sibling(M, 2), B = e.sibling(e.child(E), 2), Z = e.child(B);
      e.reset(B), e.reset(E);
      var _e = e.sibling(E, 2);
      {
        var ye = (K) => {
          var J = ft(), ne = e.sibling(e.child(J), 2), be = e.child(ne, !0);
          e.reset(ne), e.reset(J), e.template_effect(() => e.set_text(be, A.timeGrid.microbeatCount)), e.append(K, J);
        };
        e.if(_e, (K) => {
          A.timeGrid && K(ye);
        });
      }
      e.reset(b), e.template_effect(() => {
        e.set_text(k, A.voices.length), e.set_text(Z, `${A.tempo ?? ""} BPM`);
      }), e.append(S, b);
    };
    e.if(he, (S) => {
      e.get(i) && S(fe);
    });
  }
  e.reset(m);
  var te = e.sibling(m, 2), me = e.child(te);
  Oe(me, {}), e.reset(te), e.reset(v), e.reset(s), e.append(t, s), e.pop();
}
e.delegate(["click"]);
function bt(t) {
  const n = Se(yt, { target: t });
  return {
    destroy: () => Ae(n)
  };
}
const Ht = bt;
export {
  bt as default,
  Ht as mount,
  bt as mountSingingTrainer
};
//# sourceMappingURL=index.js.map
