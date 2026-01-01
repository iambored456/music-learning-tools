import { onDestroy as be, onMount as Te, mount as we, unmount as Se } from "svelte";
import "svelte/internal/disclose-version";
import * as e from "svelte/internal/client";
import { calculateViewportWindow as Ae, PitchGrid as Pe, createTimeCoordinates as Me, drawUserPitchTrace as De } from "@mlt/ui-components/canvas";
import { generateRowDataForMidiRange as He, getTonicPitchClass as Ce, fullRowData as de } from "@mlt/pitch-data";
import * as W from "tone";
import { PitchDetector as Re } from "pitchy";
import { DualPitchWheel as Ie } from "@mlt/ui-components/pitch-wheels";
import { writeHandoffSlot as qe, navigateToStudentNotation as Le, checkForHandoff as Fe, consumeHandoffSlot as Ee, clearHandoffParams as ee, SNAPSHOT_SCHEMA_VERSION as ge } from "@mlt/handoff";
const ue = {
  isDetecting: !1,
  visualizationMode: "stationary",
  tonic: "C",
  useDegrees: !1,
  showAccidentals: !0,
  yAxisRange: { minMidi: 48, maxMidi: 72 },
  drone: { isPlaying: !1, octave: 3, volume: -12 }
};
function Ne() {
  let t = e.state(e.proxy({ ...ue }));
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
      e.set(t, { ...ue }, !0);
    }
  };
}
const c = Ne(), ke = 200, ve = {
  currentPitch: null,
  history: [],
  stablePitch: { pitchClass: null, opacity: 0, size: 1 }
};
function Oe() {
  let t = e.state(e.proxy({ ...ve }));
  return {
    get state() {
      return e.get(t);
    },
    setCurrentPitch(n) {
      e.get(t).currentPitch = n;
    },
    addHistoryPoint(n) {
      e.get(t).history.push(n), e.get(t).history.length > ke && e.get(t).history.shift();
    },
    setStablePitch(n) {
      e.get(t).stablePitch = n;
    },
    clearHistory() {
      e.get(t).history = [];
    },
    reset() {
      e.set(t, { ...ve }, !0);
    }
  };
}
const h = Oe(), pe = {
  isPlaying: !1,
  startTime: null,
  currentTimeMs: 0,
  targetNotes: [],
  nowLineX: 100,
  pixelsPerSecond: 200,
  timeWindowMs: 4e3
};
function $e() {
  let t = e.state(e.proxy({ ...pe })), n = null;
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
      o >= 0 && o < e.get(t).targetNotes.length && (e.get(t).targetNotes = e.get(t).targetNotes.map((r, l) => l === o ? { ...r, hit: !0 } : r));
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
      n !== null && (cancelAnimationFrame(n), n = null), e.set(t, { ...pe }, !0);
    }
  };
}
const U = $e();
var We = e.from_html('<div class="singing-canvas-container svelte-15ar5r5"><!> <canvas class="pitch-trail-canvas svelte-15ar5r5"></canvas></div>');
function Ge(t, n) {
  e.push(n, !0);
  let i = e.state(void 0), o = e.state(800), r = e.state(400), l = e.state(void 0), d = e.state(null), g = e.state(null), a = 0, s = 0, v = 0;
  const p = 20, m = !0, I = !1, _ = 3, A = e.derived(() => p * _), T = e.derived(() => e.get(A) * 2), y = e.derived(() => e.get(T) * 2), f = e.derived(() => Math.max(0, e.get(o) - e.get(y))), D = e.derived(() => e.get(T)), H = () => {
    try {
      return !!globalThis.__ST_DEBUG_TRAIL;
    } catch {
      return !1;
    }
  }, E = e.derived(() => He(c.state.yAxisRange.minMidi, c.state.yAxisRange.maxMidi)), P = e.derived(() => Ae({
    containerHeight: e.get(r),
    fullRowData: e.get(E),
    preferredCellHeight: 40,
    minCellHeight: 20
  })), C = e.derived(() => c.state.visualizationMode === "highway" ? "highway" : "singing");
  function ie() {
    return U.state.targetNotes.map((u, b) => ({
      id: `target-${b}`,
      midi: u.midi,
      startTimeMs: u.startTimeMs,
      durationMs: u.durationMs
    }));
  }
  const N = e.derived(() => ({
    timeWindowMs: 4e3,
    pixelsPerSecond: 200,
    circleRadius: 9.5,
    proximityThreshold: 35,
    maxConnections: 3,
    connectorLineWidth: 2.5,
    connectorColor: "rgba(0,0,0,0.4)",
    useTonicRelativeColors: !0,
    tonicPitchClass: Ce(c.state.tonic),
    clarityThreshold: 0.5,
    maxOpacity: 0.9
  })), k = e.derived(() => e.get(C) === "singing" ? {
    userPitch: h.state.currentPitch ? {
      frequency: h.state.currentPitch.frequency,
      midi: h.state.currentPitch.midi,
      clarity: h.state.currentPitch.clarity,
      pitchClass: h.state.currentPitch.pitchClass
    } : null,
    pitchHistory: [],
    targetNotes: [],
    pixelsPerSecond: 200,
    timeWindowMs: 4e3,
    trailConfig: e.get(N)
  } : void 0), se = e.derived(() => e.get(C) === "highway" ? {
    userPitch: h.state.currentPitch ? {
      frequency: h.state.currentPitch.frequency,
      midi: h.state.currentPitch.midi,
      clarity: h.state.currentPitch.clarity,
      pitchClass: h.state.currentPitch.pitchClass
    } : null,
    pitchHistory: [],
    targetNotes: ie(),
    nowLineX: U.state.nowLineX,
    pixelsPerSecond: U.state.pixelsPerSecond,
    currentTimeMs: U.state.currentTimeMs,
    timeWindowMs: U.state.timeWindowMs,
    trailConfig: e.get(N)
  } : void 0), K = e.derived(() => ({
    startRow: e.get(P).startRow,
    endRow: e.get(P).endRow,
    zoomLevel: 1,
    containerWidth: e.get(o),
    containerHeight: e.get(r)
  }));
  function J() {
    if (!e.get(l)) return;
    const u = window.devicePixelRatio || 1;
    e.get(l).width = e.get(f) * u, e.get(l).height = e.get(r) * u, e.get(l).style.width = `${e.get(f)}px`, e.get(l).style.height = `${e.get(r)}px`, e.get(l).style.left = `${e.get(D)}px`;
    const b = e.get(l).getContext("2d");
    if (!b) {
      e.set(d, null);
      return;
    }
    b.setTransform(u, 0, 0, u, 0, 0), e.set(d, b, !0);
  }
  function ae() {
    if (!e.get(d) || e.get(f) <= 0) return;
    e.get(d).clearRect(0, 0, e.get(f), e.get(r));
    const u = h.state.history;
    if (u.length === 0 || e.get(C) !== "singing" || !e.get(k))
      return;
    const b = H(), L = b ? performance.now() : 0, oe = Me({
      cellWidth: p,
      cellHeight: e.get(P).cellHeight,
      viewport: e.get(K),
      pixelsPerSecond: e.get(k).pixelsPerSecond ?? 200,
      nowLineX: 100,
      currentTimeMs: 0
    }), re = {
      cellHeight: e.get(P).cellHeight,
      viewportWidth: e.get(f),
      nowLineX: 100,
      pixelsPerSecond: e.get(k).pixelsPerSecond ?? 200,
      timeWindowMs: e.get(k).timeWindowMs ?? 4e3,
      colorMode: "color",
      trailConfig: e.get(N)
    }, B = performance.now();
    if (De(e.get(d), oe, u, B, re, e.get(E)), b) {
      const $ = performance.now();
      if (s += 1, v += $ - L, $ - a >= 1e3) {
        const Q = s > 0 ? v / s : 0;
        console.log(`[SingingTrail] points=${u.length} avgMs=${Q.toFixed(2)} gridWidth=${e.get(f)}`), a = $, s = 0, v = 0;
      }
    }
  }
  function w() {
    if (e.get(g)) return;
    const u = () => {
      ae(), e.set(g, requestAnimationFrame(u), !0);
    };
    e.set(g, requestAnimationFrame(u), !0);
  }
  function x() {
    e.get(g) && (cancelAnimationFrame(e.get(g)), e.set(g, null)), e.get(d) && e.get(f) > 0 && e.get(d).clearRect(0, 0, e.get(f), e.get(r));
  }
  e.user_effect(() => {
    if (!e.get(i)) return;
    const u = new ResizeObserver((b) => {
      for (const L of b)
        e.set(o, L.contentRect.width, !0), e.set(r, L.contentRect.height, !0);
    });
    return u.observe(e.get(i)), () => {
      u.disconnect();
    };
  }), e.user_effect(() => {
    e.get(f), e.get(r), e.get(D), e.get(l), J();
  }), e.user_effect(() => {
    e.get(C), e.get(d), e.get(C) === "singing" ? w() : x();
  }), be(() => {
    x();
  });
  var S = We(), q = e.child(S);
  Pe(q, {
    get mode() {
      return e.get(C);
    },
    get fullRowData() {
      return e.get(E);
    },
    get viewport() {
      return e.get(K);
    },
    cellWidth: p,
    get cellHeight() {
      return e.get(P).cellHeight;
    },
    colorMode: "color",
    showOctaveLabels: m,
    showFrequencyLabels: I,
    get singingConfig() {
      return e.get(k);
    },
    get highwayConfig() {
      return e.get(se);
    }
  });
  var O = e.sibling(q, 2);
  e.bind_this(O, (u) => e.set(l, u), () => e.get(l)), e.reset(S), e.bind_this(S, (u) => e.set(i, u), () => e.get(i)), e.append(t, S), e.pop();
}
const F = {
  FFT_SIZE: 2048,
  CLARITY_THRESHOLD: 0.8,
  MIN_PITCH_HZ: 60,
  MAX_PITCH_HZ: 1600,
  STABILITY_THRESHOLD: 15,
  HIGHLIGHT_FADE_SPEED: 0.2
};
let z = null, j = null, te = null, G = null, ne = !1, V = -1, Y = 0, he = 0, fe = 1;
function ze(t) {
  return 12 * Math.log2(t / 440) + 69;
}
function me() {
  if (!ne || !j || !te) {
    G = null;
    return;
  }
  const t = j.getValue(), [n, i] = te.findPitch(t, W.getContext().sampleRate), o = n !== null && i > F.CLARITY_THRESHOLD && n > F.MIN_PITCH_HZ && n < F.MAX_PITCH_HZ;
  if (o) {
    const a = ze(n), s = {
      frequency: n,
      midi: a,
      clarity: i,
      pitchClass: Math.round(a) % 12
    };
    h.setCurrentPitch(s), h.addHistoryPoint({
      frequency: n,
      midi: a,
      time: performance.now(),
      clarity: i
    });
  } else
    h.addHistoryPoint({
      frequency: 0,
      midi: 0,
      time: performance.now(),
      clarity: 0
    });
  const r = o && h.state.currentPitch ? Math.round(h.state.currentPitch.midi) % 12 : -1;
  r === V && r !== -1 ? Y++ : (Y = 0, V = r), he = Y >= F.STABILITY_THRESHOLD ? 1 : 0, fe = Y >= F.STABILITY_THRESHOLD ? 1.05 : 1;
  const l = h.state.stablePitch, d = l.opacity + (he - l.opacity) * F.HIGHLIGHT_FADE_SPEED, g = l.size + (fe - l.size) * F.HIGHLIGHT_FADE_SPEED;
  h.setStablePitch({
    pitchClass: V >= 0 ? V : null,
    opacity: d,
    size: g
  }), G = requestAnimationFrame(me);
}
async function je() {
  if (!ne) {
    G !== null && cancelAnimationFrame(G), z = new W.UserMedia(), j = new W.Analyser("waveform", F.FFT_SIZE), te = Re.forFloat32Array(j.size);
    try {
      await W.start(), await z.open(), z.connect(j), ne = !0, me();
    } catch (t) {
      throw console.error("Microphone access denied or failed:", t), _e(), t;
    }
  }
}
function Be() {
  ne = !1, _e();
}
function _e() {
  G !== null && (cancelAnimationFrame(G), G = null), z && (z.close(), z = null), j = null, te = null, Y = 0, V = -1, h.setStablePitch({ pitchClass: null, opacity: 0, size: 1 }), h.setCurrentPitch(null);
}
var Ue = e.from_html('<span class="spinner svelte-cytsjj"></span> Starting...', 1), Ve = e.from_html('<span class="icon svelte-cytsjj">&#9632;</span> Stop', 1), Ye = e.from_html('<span class="icon svelte-cytsjj">&#9654;</span> Start', 1), Xe = e.from_html("<button><!></button>");
function Ze(t, n) {
  e.push(n, !0);
  let i = e.state(!1);
  async function o() {
    if (!e.get(i))
      if (c.state.isDetecting)
        Be(), c.setDetecting(!1), h.reset();
      else {
        e.set(i, !0);
        try {
          await je(), c.setDetecting(!0);
        } catch (s) {
          console.error("Failed to start detection:", s), alert("Could not access microphone. Please grant permission and try again.");
        } finally {
          e.set(i, !1);
        }
      }
  }
  var r = Xe();
  let l;
  r.__click = o;
  var d = e.child(r);
  {
    var g = (s) => {
      var v = Ue();
      e.next(), e.append(s, v);
    }, a = (s) => {
      var v = e.comment(), p = e.first_child(v);
      {
        var m = (_) => {
          var A = Ve();
          e.next(), e.append(_, A);
        }, I = (_) => {
          var A = Ye();
          e.next(), e.append(_, A);
        };
        e.if(
          p,
          (_) => {
            c.state.isDetecting ? _(m) : _(I, !1);
          },
          !0
        );
      }
      e.append(s, v);
    };
    e.if(d, (s) => {
      e.get(i) ? s(g) : s(a, !1);
    });
  }
  e.reset(r), e.template_effect(() => {
    l = e.set_class(r, 1, "start-button svelte-cytsjj", null, l, {
      active: c.state.isDetecting,
      loading: e.get(i)
    }), r.disabled = e.get(i);
  }), e.append(t, r), e.pop();
}
e.delegate(["click"]);
let R = null, X = !1, Z = null;
function Ke() {
  var t;
  if (!R) {
    R = new W.PolySynth(W.Synth, {
      oscillator: { type: "sawtooth" },
      envelope: {
        attack: 0.3,
        decay: 0.1,
        sustain: 0.8,
        release: 0.5
      }
    }).toDestination();
    const n = ((t = R.get().oscillator) == null ? void 0 : t.type) ?? "unknown";
    console.log("[DroneAudio] Initialized drone synth", { oscillatorType: n });
  }
  return R;
}
function ye(t, n) {
  return `${t.replace("b", "#").replace("Db", "C#").replace("Eb", "D#").replace("Gb", "F#").replace("Ab", "G#").replace("Bb", "A#")}${n}`;
}
async function Je() {
  await W.start();
  const t = Ke(), n = ye(c.state.tonic, c.state.drone.octave);
  t.volume.value = c.state.drone.volume, console.log("[DroneAudio] Starting drone", {
    note: n,
    volume: t.volume.value
  }), Z && t.releaseAll(), Z = n, t.triggerAttack(n), X = !0;
}
function Qe() {
  R && X && (R.releaseAll(), Z = null, X = !1);
}
function ce() {
  if (!X || !R) return;
  const t = ye(c.state.tonic, c.state.drone.octave);
  R.volume.value = c.state.drone.volume, console.log("[DroneAudio] Updating drone", {
    note: t,
    volume: R.volume.value
  }), t !== Z && (R.releaseAll(), R.triggerAttack(t), Z = t);
}
async function et() {
  X ? Qe() : await Je();
}
var tt = e.from_html("<option> </option>"), nt = e.from_html('<div class="tonic-selector svelte-16h7our"><label for="tonic-select" class="svelte-16h7our">Key:</label> <select id="tonic-select" class="svelte-16h7our"></select></div>');
function it(t, n) {
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
    const a = g.target;
    c.setTonic(a.value), ce();
  }
  var r = nt(), l = e.sibling(e.child(r), 2);
  l.__change = o, e.each(l, 21, () => i, e.index, (g, a) => {
    var s = tt(), v = e.child(s, !0);
    e.reset(s);
    var p = {};
    e.template_effect(() => {
      e.set_text(v, e.get(a)), p !== (p = e.get(a)) && (s.value = (s.__value = e.get(a)) ?? "");
    }), e.append(g, s);
  }), e.reset(l);
  var d;
  e.init_select(l), e.reset(r), e.template_effect(() => {
    d !== (d = c.state.tonic) && (l.value = (l.__value = c.state.tonic) ?? "", e.select_option(l, c.state.tonic));
  }), e.append(t, r), e.pop();
}
e.delegate(["change"]);
var st = e.from_html("<option> </option>"), at = e.from_html('<div class="drone-controls svelte-1rkr6nv"><button> </button> <div class="drone-settings svelte-1rkr6nv"><label class="svelte-1rkr6nv">Oct: <select class="svelte-1rkr6nv"></select></label> <label class="svelte-1rkr6nv">Vol: <input type="range" min="-40" max="0" class="svelte-1rkr6nv"/></label></div></div>');
function ot(t, n) {
  e.push(n, !0);
  const i = [2, 3, 4, 5];
  async function o() {
    await et(), c.toggleDrone();
  }
  function r(T) {
    const y = T.target;
    c.setDroneOctave(parseInt(y.value, 10)), ce();
  }
  function l(T) {
    const y = T.target;
    c.setDroneVolume(parseInt(y.value, 10)), ce();
  }
  var d = at(), g = e.child(d);
  let a;
  g.__click = o;
  var s = e.child(g, !0);
  e.reset(g);
  var v = e.sibling(g, 2), p = e.child(v), m = e.sibling(e.child(p));
  m.__change = r, e.each(m, 21, () => i, e.index, (T, y) => {
    var f = st(), D = e.child(f, !0);
    e.reset(f);
    var H = {};
    e.template_effect(() => {
      e.set_text(D, e.get(y)), H !== (H = e.get(y)) && (f.value = (f.__value = e.get(y)) ?? "");
    }), e.append(T, f);
  }), e.reset(m);
  var I;
  e.init_select(m), e.reset(p);
  var _ = e.sibling(p, 2), A = e.sibling(e.child(_));
  e.remove_input_defaults(A), A.__input = l, e.reset(_), e.reset(v), e.reset(d), e.template_effect(() => {
    a = e.set_class(g, 1, "drone-toggle svelte-1rkr6nv", null, a, { active: c.state.drone.isPlaying }), e.set_text(s, c.state.drone.isPlaying ? "Drone On" : "Drone Off"), I !== (I = c.state.drone.octave) && (m.value = (m.__value = c.state.drone.octave) ?? "", e.select_option(m, c.state.drone.octave)), e.set_value(A, c.state.drone.volume);
  }), e.append(t, d), e.pop();
}
e.delegate(["click", "change", "input"]);
var rt = e.from_html("<button> </button>"), lt = e.from_html('<div class="mode-toggle svelte-i9tkj4"></div>');
function ct(t, n) {
  e.push(n, !0);
  const i = [
    { value: "stationary", label: "Stationary" },
    { value: "highway", label: "Highway" }
  ];
  function o(l) {
    c.setVisualizationMode(l);
  }
  var r = lt();
  e.each(r, 21, () => i, e.index, (l, d) => {
    let g = () => e.get(d).value, a = () => e.get(d).label;
    var s = rt();
    let v;
    s.__click = () => o(g());
    var p = e.child(s, !0);
    e.reset(s), e.template_effect(() => {
      v = e.set_class(s, 1, "mode-button svelte-i9tkj4", null, v, { active: c.state.visualizationMode === g() }), e.set_text(p, a());
    }), e.append(l, s);
  }), e.reset(r), e.append(t, r), e.pop();
}
e.delegate(["click"]);
var dt = e.from_html('<div class="range-control svelte-1es7ond"><h3 class="control-title svelte-1es7ond">Pitch Range</h3> <!></div>');
function gt(t, n) {
  e.push(n, !0);
  function i(a) {
    const s = de.findIndex((v) => v.midi === a);
    return s >= 0 ? s : 0;
  }
  const o = e.derived(() => i(c.state.yAxisRange.maxMidi)), r = e.derived(() => i(c.state.yAxisRange.minMidi));
  function l(a) {
    const s = a.bottomPitch.midi ?? 21, v = a.topPitch.midi ?? 108;
    c.setYAxisRange({ minMidi: s, maxMidi: v });
  }
  var d = dt(), g = e.sibling(e.child(d), 2);
  Ie(g, {
    get fullRowData() {
      return de;
    },
    get topIndex() {
      return e.get(o);
    },
    get bottomIndex() {
      return e.get(r);
    },
    minSpan: 7,
    onrangechange: l,
    showSummary: !0,
    wheelHeight: 200
  }), e.reset(d), e.append(t, d), e.pop();
}
var ut = e.from_html('<div class="note-display svelte-1hjl33a"><span class="note-name svelte-1hjl33a"> </span> <span class="octave svelte-1hjl33a"> </span></div> <div class="details svelte-1hjl33a"><span class="frequency"> </span> <span> </span> <span class="clarity"> </span></div>', 1), vt = e.from_html('<div class="no-pitch svelte-1hjl33a"><span class="placeholder svelte-1hjl33a">---</span> <span class="hint svelte-1hjl33a">Sing or hum into the microphone</span></div>'), pt = e.from_html('<div class="pitch-readout svelte-1hjl33a"><!></div>');
function ht(t, n) {
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
    const a = h.state.currentPitch;
    if (!a) return null;
    const s = i[a.pitchClass], v = Math.floor(a.midi / 12) - 1, p = Math.round((a.midi - Math.round(a.midi)) * 100);
    return {
      name: s,
      octave: v,
      frequency: a.frequency.toFixed(1),
      cents: p,
      clarity: Math.round(a.clarity * 100)
    };
  });
  var r = pt(), l = e.child(r);
  {
    var d = (a) => {
      const s = e.derived(() => e.get(o)());
      var v = ut(), p = e.first_child(v), m = e.child(p), I = e.child(m, !0);
      e.reset(m);
      var _ = e.sibling(m, 2), A = e.child(_, !0);
      e.reset(_), e.reset(p);
      var T = e.sibling(p, 2), y = e.child(T), f = e.child(y);
      e.reset(y);
      var D = e.sibling(y, 2);
      let H;
      var E = e.child(D);
      e.reset(D);
      var P = e.sibling(D, 2), C = e.child(P);
      e.reset(P), e.reset(T), e.template_effect(() => {
        e.set_text(I, e.get(s).name), e.set_text(A, e.get(s).octave), e.set_text(f, `${e.get(s).frequency ?? ""} Hz`), H = e.set_class(D, 1, "cents svelte-1hjl33a", null, H, { sharp: e.get(s).cents > 0, flat: e.get(s).cents < 0 }), e.set_text(E, `${e.get(s).cents > 0 ? "+" : ""}${e.get(s).cents ?? ""}¢`), e.set_text(C, `${e.get(s).clarity ?? ""}%`);
      }), e.append(a, v);
    }, g = (a) => {
      var s = vt();
      e.append(a, s);
    };
    e.if(l, (a) => {
      e.get(o)() ? a(d) : a(g, !1);
    });
  }
  e.reset(r), e.append(t, r), e.pop();
}
const le = {
  hasImportedSnapshot: !1,
  snapshot: null,
  isLoading: !1,
  error: null,
  transpositionSemitones: 0
};
function ft() {
  let t = e.state(e.proxy({ ...le }));
  return {
    get state() {
      return e.get(t);
    },
    /**
     * Check for and consume any pending handoff on app initialization.
     * Should be called once when the app loads.
     */
    async checkAndConsumeHandoff() {
      if (!Fe())
        return !1;
      e.get(t).isLoading = !0, e.get(t).error = null;
      try {
        const i = await Ee();
        return i ? i.schemaVersion !== ge ? (e.get(t).error = `Incompatible snapshot version: ${i.schemaVersion}. Expected: ${ge}`, e.get(t).isLoading = !1, ee(), !1) : (e.get(t).snapshot = i, e.get(t).hasImportedSnapshot = !0, e.get(t).isLoading = !1, ee(), console.log("[HandoffState] Successfully imported snapshot", {
          voices: i.voices.length,
          microbeatCount: i.timeGrid.microbeatCount,
          tempo: i.tempo
        }), !0) : (e.get(t).error = "Handoff data expired or not found. Please try exporting again.", e.get(t).isLoading = !1, ee(), !1);
      } catch (i) {
        return console.error("[HandoffState] Failed to process handoff", i), e.get(t).error = "Failed to import data from Student Notation.", e.get(t).isLoading = !1, ee(), !1;
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
        const i = await qe(n);
        console.log("[HandoffState] Handoff slot written for return", i), Le(i);
      } catch (i) {
        console.error("[HandoffState] Failed to write return handoff", i);
      }
    },
    /**
     * Clear the imported snapshot.
     */
    clearSnapshot() {
      e.set(t, { ...le }, !0);
    },
    /**
     * Reset the handoff state.
     */
    reset() {
      e.set(t, { ...le }, !0);
    }
  };
}
const M = ft();
var mt = e.from_html('<div class="handoff-controls svelte-1n46o8q"><div class="transposition-control svelte-1n46o8q"><button class="transpose-btn svelte-1n46o8q" title="Transpose down">-</button> <span class="transposition-label svelte-1n46o8q"> </span> <button class="transpose-btn svelte-1n46o8q" title="Transpose up">+</button></div> <button class="bring-back-btn svelte-1n46o8q">Bring Back to Student Notation</button></div>'), _t = e.from_html('<div class="error-banner svelte-1n46o8q"> </div>'), yt = e.from_html('<div class="import-info svelte-1n46o8q"><span class="import-label svelte-1n46o8q">Microbeats:</span> <span class="import-value svelte-1n46o8q"> </span></div>'), xt = e.from_html('<div class="control-group svelte-1n46o8q"><h3 class="control-group-title svelte-1n46o8q">Imported Material</h3> <div class="import-info svelte-1n46o8q"><span class="import-label svelte-1n46o8q">Voices:</span> <span class="import-value svelte-1n46o8q"> </span></div> <div class="import-info svelte-1n46o8q"><span class="import-label svelte-1n46o8q">Tempo:</span> <span class="import-value svelte-1n46o8q"> </span></div> <!></div>'), bt = e.from_html('<div class="app svelte-1n46o8q"><header class="header svelte-1n46o8q"><h1 class="title svelte-1n46o8q">Singing Trainer</h1> <div class="header-controls svelte-1n46o8q"><!> <!></div></header> <!> <main class="main svelte-1n46o8q"><aside class="sidebar sidebar--left svelte-1n46o8q"><div class="control-group svelte-1n46o8q"><!></div> <div class="control-group svelte-1n46o8q"><!></div> <div class="control-group svelte-1n46o8q"><h3 class="control-group-title svelte-1n46o8q">Settings</h3> <!> <!></div> <div class="control-group svelte-1n46o8q"><!></div> <!></aside> <section class="canvas-area svelte-1n46o8q"><!></section></main></div>');
function Tt(t, n) {
  e.push(n, !0), Te(async () => {
    if (await M.checkAndConsumeHandoff()) {
      console.log("[App] Handoff detected and processed");
      const x = M.suggestedPitchRange;
      x && c.setYAxisRange(x);
    }
  });
  const i = e.derived(() => M.state.hasImportedSnapshot), o = e.derived(() => M.state.transpositionSemitones), r = e.derived(() => M.state.error);
  function l() {
    M.bringBackToStudentNotation();
  }
  function d() {
    M.transposeUp();
  }
  function g() {
    M.transposeDown();
  }
  var a = bt(), s = e.child(a), v = e.sibling(e.child(s), 2), p = e.child(v);
  {
    var m = (w) => {
      var x = mt(), S = e.child(x), q = e.child(S);
      q.__click = g;
      var O = e.sibling(q, 2), u = e.child(O);
      e.reset(O);
      var b = e.sibling(O, 2);
      b.__click = d, e.reset(S);
      var L = e.sibling(S, 2);
      L.__click = l, e.reset(x), e.template_effect(() => e.set_text(u, `${e.get(o) >= 0 ? "+" : ""}${e.get(o) ?? ""}`)), e.append(w, x);
    };
    e.if(p, (w) => {
      e.get(i) && w(m);
    });
  }
  var I = e.sibling(p, 2);
  ct(I, {}), e.reset(v), e.reset(s);
  var _ = e.sibling(s, 2);
  {
    var A = (w) => {
      var x = _t(), S = e.child(x, !0);
      e.reset(x), e.template_effect(() => e.set_text(S, e.get(r))), e.append(w, x);
    };
    e.if(_, (w) => {
      e.get(r) && w(A);
    });
  }
  var T = e.sibling(_, 2), y = e.child(T), f = e.child(y), D = e.child(f);
  Ze(D, {}), e.reset(f);
  var H = e.sibling(f, 2), E = e.child(H);
  ht(E, {}), e.reset(H);
  var P = e.sibling(H, 2), C = e.sibling(e.child(P), 2);
  it(C, {});
  var ie = e.sibling(C, 2);
  ot(ie, {}), e.reset(P);
  var N = e.sibling(P, 2), k = e.child(N);
  gt(k, {}), e.reset(N);
  var se = e.sibling(N, 2);
  {
    var K = (w) => {
      var x = xt(), S = e.sibling(e.child(x), 2), q = e.sibling(e.child(S), 2), O = e.child(q, !0);
      e.reset(q), e.reset(S);
      var u = e.sibling(S, 2), b = e.sibling(e.child(u), 2), L = e.child(b);
      e.reset(b), e.reset(u);
      var oe = e.sibling(u, 2);
      {
        var re = (B) => {
          var $ = yt(), Q = e.sibling(e.child($), 2), xe = e.child(Q, !0);
          e.reset(Q), e.reset($), e.template_effect(() => e.set_text(xe, M.timeGrid.microbeatCount)), e.append(B, $);
        };
        e.if(oe, (B) => {
          M.timeGrid && B(re);
        });
      }
      e.reset(x), e.template_effect(() => {
        e.set_text(O, M.voices.length), e.set_text(L, `${M.tempo ?? ""} BPM`);
      }), e.append(w, x);
    };
    e.if(se, (w) => {
      e.get(i) && w(K);
    });
  }
  e.reset(y);
  var J = e.sibling(y, 2), ae = e.child(J);
  Ge(ae, {}), e.reset(J), e.reset(T), e.reset(a), e.append(t, a), e.pop();
}
e.delegate(["click"]);
function wt(t) {
  const n = we(Tt, { target: t });
  return {
    destroy: () => Se(n)
  };
}
const Rt = wt;
export {
  wt as default,
  Rt as mount,
  wt as mountSingingTrainer
};
//# sourceMappingURL=index.js.map
