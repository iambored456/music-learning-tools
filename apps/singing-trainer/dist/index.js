var nt = Object.defineProperty;
var rt = (t, s, i) => s in t ? nt(t, s, { enumerable: !0, configurable: !0, writable: !0, value: i }) : t[s] = i;
var he = (t, s, i) => rt(t, typeof s != "symbol" ? s + "" : s, i);
import { onDestroy as Ae, onMount as ot, mount as lt, unmount as ct } from "svelte";
import "svelte/internal/disclose-version";
import * as e from "svelte/internal/client";
import { calculateViewportWindow as dt, PitchGrid as gt, createTimeCoordinates as ut, drawUserPitchTrace as vt } from "@mlt/ui-components/canvas";
import { generateRowDataForMidiRange as ft, getTonicPitchClass as pt, fullRowData as Ue, getPitchByMidi as ht } from "@mlt/pitch-data";
import { createNoteHighwayService as mt } from "@mlt/student-notation-engine";
import * as ce from "tone";
import { PitchDetector as yt } from "pitchy";
import { getNearestMidi as _t, getCentsOffset as bt, midiToPitchClass as Tt } from "@mlt/pitch-utils";
import { DualPitchWheel as Pt } from "@mlt/ui-components/pitch-wheels";
import { writeHandoffSlot as xt, navigateToStudentNotation as Mt, checkForHandoff as wt, consumeHandoffSlot as At, clearHandoffParams as Se, SNAPSHOT_SCHEMA_VERSION as Ve } from "@mlt/handoff";
const Ye = {
  isDetecting: !1,
  visualizationMode: "highway",
  tonic: "C",
  useDegrees: !1,
  showAccidentals: !0,
  pitchHighlightEnabled: !0,
  yAxisRange: { minMidi: 48, maxMidi: 72 },
  drone: { isPlaying: !1, octave: 3, volume: -12 }
};
function St() {
  let t = e.state(e.proxy({ ...Ye }));
  return {
    get state() {
      return e.get(t);
    },
    toggleDetecting() {
      e.get(t).isDetecting = !e.get(t).isDetecting;
    },
    setDetecting(s) {
      e.get(t).isDetecting = s;
    },
    setVisualizationMode(s) {
      e.get(t).visualizationMode = s;
    },
    setTonic(s) {
      e.get(t).tonic = s;
    },
    setUseDegrees(s) {
      e.get(t).useDegrees = s;
    },
    setShowAccidentals(s) {
      e.get(t).showAccidentals = s;
    },
    togglePitchHighlight() {
      e.get(t).pitchHighlightEnabled = !e.get(t).pitchHighlightEnabled;
    },
    setPitchHighlightEnabled(s) {
      e.get(t).pitchHighlightEnabled = s;
    },
    setYAxisRange(s) {
      e.get(t).yAxisRange = s;
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
    setDroneOctave(s) {
      e.get(t).drone = { ...e.get(t).drone, octave: s };
    },
    setDroneVolume(s) {
      e.get(t).drone = { ...e.get(t).drone, volume: s };
    },
    reset() {
      e.set(t, { ...Ye }, !0);
    }
  };
}
const M = St(), Ct = 200, Be = {
  currentPitch: null,
  history: [],
  stablePitch: { pitchClass: null, opacity: 0, size: 1 }
};
function Rt() {
  let t = e.state(e.proxy({ ...Be }));
  return {
    get state() {
      return e.get(t);
    },
    setCurrentPitch(s) {
      e.get(t).currentPitch = s;
    },
    addHistoryPoint(s) {
      e.get(t).history.push(s), e.get(t).history.length > Ct && e.get(t).history.shift();
    },
    setStablePitch(s) {
      e.get(t).stablePitch = s;
    },
    clearHistory() {
      e.get(t).history = [];
    },
    reset() {
      e.set(t, { ...Be }, !0);
    }
  };
}
const O = Rt(), ze = {
  isPlaying: !1,
  startTime: null,
  currentTimeMs: 0,
  targetNotes: [],
  nowLineX: 100,
  pixelsPerSecond: 200,
  timeWindowMs: 4e3
};
function Nt() {
  let t = e.state(e.proxy({ ...ze })), s = null, i = null, a = null;
  function r(l) {
    return l.map((c, g) => ({
      id: `target-${g}`,
      midi: c.midi,
      startTimeMs: c.startTimeMs,
      durationMs: c.durationMs,
      startColumn: 0,
      // Not used in target notes mode
      endColumn: 0,
      // Not used in target notes mode
      color: "#3b82f6",
      shape: "oval",
      globalRow: 0
    }));
  }
  function n() {
    if (!s) return;
    const l = s.getState();
    e.get(t).isPlaying = l.isPlaying && !l.isPaused, e.get(t).currentTimeMs = l.currentTimeMs;
    const c = s.getPerformanceResults();
    e.get(t).targetNotes = e.get(t).targetNotes.map((g, f) => {
      const y = `target-${f}`, C = c.get(y);
      return { ...g, hit: (C == null ? void 0 : C.hitStatus) === "hit" };
    });
  }
  function o() {
    e.get(t).isPlaying && s ? (n(), i = requestAnimationFrame(o)) : i = null;
  }
  function d() {
    s && s.dispose(), s = mt({
      judgmentLinePosition: e.get(t).nowLineX / 800,
      // Assume 800px viewport
      pixelsPerSecond: e.get(t).pixelsPerSecond,
      lookAheadMs: e.get(t).timeWindowMs,
      scrollMode: "constant-speed",
      leadInBeats: 0,
      // No onramp for singing trainer
      playMetronomeDuringOnramp: !1,
      playTargetNotes: !1,
      playMetronome: !1,
      inputSources: ["microphone"],
      feedbackConfig: {
        onsetToleranceMs: 100,
        releaseToleranceMs: 150,
        pitchToleranceCents: 50,
        hitThreshold: 70
      },
      stateCallbacks: {
        getTempo: () => 120,
        getCellWidth: () => 20,
        getViewportWidth: () => 800
      },
      eventCallbacks: {
        emit: (c, g) => {
          if (console.debug("[Highway]", c, g), c === "noteHit") {
            const f = g;
            console.log(`[Highway] Note HIT: ${f.noteId}, accuracy: ${f.performance.accuracyTier || "unknown"}`);
          } else c === "noteMissed" ? console.log(`[Highway] Note MISSED: ${g.noteId}`) : c === "onrampComplete" ? console.log("[Highway] Onramp complete, playback starting!") : c === "performanceComplete" && (console.log("[Highway] Performance complete!"), a && s && a(s.getPerformanceResults()));
        }
      }
    });
    const l = r(e.get(t).targetNotes);
    s.init(l);
  }
  return {
    get state() {
      return e.get(t);
    },
    get engineService() {
      return s;
    },
    start() {
      !s && e.get(t).targetNotes.length > 0 && d(), s && (s.start(), e.get(t).isPlaying = !0, e.get(t).startTime = performance.now(), e.get(t).currentTimeMs = 0, o());
    },
    stop() {
      s && s.stop(), e.get(t).isPlaying = !1, i !== null && (cancelAnimationFrame(i), i = null);
    },
    pause() {
      s && s.pause(), e.get(t).isPlaying = !1, i !== null && (cancelAnimationFrame(i), i = null);
    },
    resume() {
      s && (s.resume(), e.get(t).isPlaying = !0, o());
    },
    setTargetNotes(l) {
      if (e.get(t).targetNotes = l, s) {
        const c = r(l);
        s.init(c);
      }
    },
    markNoteHit(l) {
      l >= 0 && l < e.get(t).targetNotes.length && (e.get(t).targetNotes = e.get(t).targetNotes.map((c, g) => g === l ? { ...c, hit: !0 } : c));
    },
    setNowLineX(l) {
      e.get(t).nowLineX = l;
    },
    setPixelsPerSecond(l) {
      e.get(t).pixelsPerSecond = l;
    },
    setTimeWindowMs(l) {
      e.get(t).timeWindowMs = l;
    },
    recordPitchInput(l, c) {
      s && e.get(t).isPlaying && s.recordPitchInput(l, c, "microphone");
    },
    getPerformanceResults() {
      return (s == null ? void 0 : s.getPerformanceResults()) ?? /* @__PURE__ */ new Map();
    },
    /**
     * Set current time externally (for YouTube sync)
     */
    setCurrentTime(l) {
      e.get(t).currentTimeMs = l, s && s.setScrollOffset(l);
    },
    /**
     * Register callback for performance complete event
     */
    onPerformanceComplete(l) {
      return a = l, () => {
        a = null;
      };
    },
    reset() {
      i !== null && (cancelAnimationFrame(i), i = null), s && (s.dispose(), s = null), e.set(t, { ...ze }, !0);
    }
  };
}
const $ = Nt(), It = {
  numLoops: 5,
  minMidi: 48,
  maxMidi: 72,
  tempo: 108,
  referenceVolume: -12
}, We = {
  isActive: !1,
  isPlaying: !1,
  config: { ...It },
  currentLoop: 0,
  currentPhase: "reference",
  currentPitch: null,
  generatedNotes: [],
  results: []
};
function Et(t, s) {
  return Math.floor(Math.random() * (s - t + 1)) + t;
}
function je(t) {
  return 60 / t * 1e3 / 2;
}
function Lt() {
  let t = e.state(e.proxy({ ...We }));
  function s(a) {
    const r = [], n = je(a.tempo), o = 2e3;
    for (let d = 0; d < a.numLoops; d++) {
      const l = Et(a.minMidi, a.maxMidi), c = o + d * 32 * n;
      r.push({
        midi: l,
        startTimeMs: c,
        durationMs: 8 * n,
        lyric: "👂"
      }), r.push({
        midi: l,
        startTimeMs: c + 16 * n,
        durationMs: 8 * n,
        lyric: "🎤"
      });
    }
    return r;
  }
  function i(a, r) {
    const n = je(r), o = 32 * n, l = a - 2e3;
    if (l < 0)
      return { loop: 0, phase: "rest2" };
    const c = Math.floor(l / o), g = l % o, f = Math.floor(g / n);
    let y;
    return f < 8 ? y = "reference" : f < 16 ? y = "rest1" : f < 24 ? y = "input" : y = "rest2", { loop: c, phase: y };
  }
  return {
    get state() {
      return e.get(t);
    },
    /**
     * Update exercise configuration
     */
    configure(a) {
      e.get(t).config = { ...e.get(t).config, ...a };
    },
    /**
     * Set pitch range from current Y-axis range
     */
    setPitchRange(a, r) {
      e.get(t).config.minMidi = a, e.get(t).config.maxMidi = r;
    },
    /**
     * Start the demo exercise
     */
    start() {
      const a = s(e.get(t).config);
      e.get(t).generatedNotes = a, e.get(t).isActive = !0, e.get(t).isPlaying = !1, e.get(t).currentLoop = 0, e.get(t).currentPhase = "reference", e.get(t).currentPitch = a.length > 0 ? a[0].midi : null, e.get(t).results = [];
    },
    /**
     * Stop the exercise
     */
    stop() {
      e.get(t).isActive = !1, e.get(t).isPlaying = !1, e.get(t).currentLoop = 0, e.get(t).currentPhase = "reference", e.get(t).currentPitch = null;
    },
    /**
     * Mark exercise as playing (called when highway starts)
     */
    setPlaying(a) {
      e.get(t).isPlaying = a;
    },
    /**
     * Update current phase based on time
     */
    updatePhase(a) {
      const { loop: r, phase: n } = i(a, e.get(t).config.tempo);
      e.get(t).currentLoop = r, e.get(t).currentPhase = n;
      const o = r * 2;
      o < e.get(t).generatedNotes.length && (e.get(t).currentPitch = e.get(t).generatedNotes[o].midi);
    },
    /**
     * Add a performance result for a completed loop
     */
    addResult(a) {
      e.get(t).results.push(a);
    },
    /**
     * Check if we already have a result for a specific loop
     */
    hasResultForLoop(a) {
      return e.get(t).results.some((r) => r.loopIndex === a);
    },
    /**
     * Get all results
     */
    getResults() {
      return e.get(t).results;
    },
    /**
     * Get current progress
     */
    getCurrentProgress() {
      return {
        current: e.get(t).currentLoop + 1,
        total: e.get(t).config.numLoops
      };
    },
    /**
     * Get generated notes for highway
     */
    getGeneratedNotes() {
      return e.get(t).generatedNotes;
    },
    /**
     * Calculate average accuracy from results
     */
    getAverageAccuracy() {
      return e.get(t).results.length === 0 ? 0 : e.get(t).results.reduce((r, n) => r + n.accuracy, 0) / e.get(t).results.length;
    },
    /**
     * Count hits
     */
    getHitCount() {
      return e.get(t).results.filter((a) => {
        var r;
        return ((r = a.performance) == null ? void 0 : r.hitStatus) === "hit";
      }).length;
    },
    /**
     * Reset to default state
     */
    reset() {
      e.set(t, { ...We, config: { ...e.get(t).config } }, !0);
    }
  };
}
const z = Lt();
var kt = e.from_html('<div class="singing-canvas-container svelte-15ar5r5"><!> <canvas class="pitch-trail-canvas svelte-15ar5r5"></canvas></div>');
function Dt(t, s) {
  e.push(s, !0);
  let i = e.state(void 0), a = e.state(800), r = e.state(400), n = e.state(void 0), o = e.state(null), d = e.state(null), l = 0, c = 0, g = 0;
  const f = 20, y = !0, C = !1, T = e.derived(() => e.get(a) >= 720), v = 3, p = e.derived(() => f * v), _ = e.derived(() => e.get(p) * 2), h = e.derived(() => y), R = e.derived(() => e.get(h) ? e.get(_) * (e.get(T) ? 2 : 1) : 0), N = e.derived(() => Math.max(0, e.get(a) - e.get(R))), W = e.derived(() => e.get(h) ? e.get(_) : 0), U = () => {
    try {
      return !!globalThis.__ST_DEBUG_TRAIL;
    } catch {
      return !1;
    }
  }, w = e.derived(() => ft(M.state.yAxisRange.minMidi, M.state.yAxisRange.maxMidi)), D = e.derived(() => dt({
    containerHeight: e.get(r),
    fullRowData: e.get(w),
    preferredCellHeight: 40,
    minCellHeight: 20
  })), A = e.derived(() => M.state.visualizationMode === "highway" ? "highway" : "singing"), q = e.derived(() => 60 / z.state.config.tempo * 1e3), j = 2e3, B = e.derived(() => (() => {
    if (!M.state.pitchHighlightEnabled)
      return;
    const m = O.state.stablePitch;
    if (!(m.pitchClass === null || m.opacity <= 0.01))
      return {
        pitchClass: m.pitchClass,
        opacity: m.opacity,
        color: "#ffff00"
      };
  })());
  function X() {
    return $.state.targetNotes.map((m, u) => ({
      id: `target-${u}`,
      midi: m.midi,
      startTimeMs: m.startTimeMs,
      durationMs: m.durationMs,
      label: m.lyric
      // Pass emoji as label
    }));
  }
  const G = e.derived(() => ({
    timeWindowMs: 4e3,
    pixelsPerSecond: 200,
    circleRadius: 9.5,
    proximityThreshold: 35,
    maxConnections: 3,
    connectorLineWidth: 2.5,
    connectorColor: "rgba(0,0,0,0.4)",
    useTonicRelativeColors: !0,
    tonicPitchClass: pt(M.state.tonic),
    clarityThreshold: 0.5,
    maxOpacity: 0.9
  })), E = e.derived(() => e.get(A) === "singing" ? {
    userPitch: O.state.currentPitch ? {
      frequency: O.state.currentPitch.frequency,
      midi: O.state.currentPitch.midi,
      clarity: O.state.currentPitch.clarity,
      pitchClass: O.state.currentPitch.pitchClass
    } : null,
    pitchHistory: [],
    targetNotes: [],
    pixelsPerSecond: 200,
    timeWindowMs: 4e3,
    trailConfig: e.get(G)
  } : void 0), H = e.derived(() => e.get(A) === "highway" ? {
    userPitch: O.state.currentPitch ? {
      frequency: O.state.currentPitch.frequency,
      midi: O.state.currentPitch.midi,
      clarity: O.state.currentPitch.clarity,
      pitchClass: O.state.currentPitch.pitchClass
    } : null,
    pitchHistory: [],
    targetNotes: X(),
    nowLineX: $.state.nowLineX,
    pixelsPerSecond: $.state.pixelsPerSecond,
    currentTimeMs: $.state.currentTimeMs,
    timeWindowMs: $.state.timeWindowMs,
    trailConfig: e.get(G)
  } : void 0), J = e.derived(() => ({
    startRow: e.get(D).startRow,
    endRow: e.get(D).endRow,
    zoomLevel: 1,
    containerWidth: e.get(a),
    containerHeight: e.get(r)
  }));
  function te() {
    if (!e.get(n)) return;
    const m = window.devicePixelRatio || 1;
    e.get(n).width = e.get(N) * m, e.get(n).height = e.get(r) * m, e.get(n).style.width = `${e.get(N)}px`, e.get(n).style.height = `${e.get(r)}px`, e.get(n).style.left = `${e.get(W)}px`;
    const u = e.get(n).getContext("2d");
    if (!u) {
      e.set(o, null);
      return;
    }
    u.setTransform(m, 0, 0, m, 0, 0), e.set(o, u, !0);
  }
  function ie() {
    if (!e.get(o) || e.get(N) <= 0) return;
    e.get(o).clearRect(0, 0, e.get(N), e.get(r));
    const m = O.state.history;
    if (m.length === 0) return;
    const u = e.get(A) === "singing" ? e.get(E) : e.get(H);
    if (!u) return;
    const S = U(), F = S ? performance.now() : 0, V = e.get(A) === "highway" && e.get(H) ? e.get(H).nowLineX : 100, se = ut({
      cellWidth: f,
      cellHeight: e.get(D).cellHeight,
      viewport: e.get(J),
      pixelsPerSecond: u.pixelsPerSecond ?? 200,
      nowLineX: V,
      currentTimeMs: e.get(A) === "highway" && e.get(H) ? e.get(H).currentTimeMs : 0
    }), Q = {
      cellHeight: e.get(D).cellHeight,
      viewportWidth: e.get(N),
      nowLineX: V,
      pixelsPerSecond: u.pixelsPerSecond ?? 200,
      timeWindowMs: u.timeWindowMs ?? 4e3,
      colorMode: "color",
      trailConfig: e.get(G)
    }, ee = performance.now();
    if (vt(e.get(o), se, m, ee, Q, e.get(w)), S) {
      const x = performance.now();
      if (c += 1, g += x - F, x - l >= 1e3) {
        const L = c > 0 ? g / c : 0;
        console.log(`[SingingTrail] points=${m.length} avgMs=${L.toFixed(2)} gridWidth=${e.get(N)}`), l = x, c = 0, g = 0;
      }
    }
  }
  function ae() {
    if (e.get(d)) return;
    const m = () => {
      ie(), e.set(d, requestAnimationFrame(m), !0);
    };
    e.set(d, requestAnimationFrame(m), !0);
  }
  function ue() {
    e.get(d) && (cancelAnimationFrame(e.get(d)), e.set(d, null)), e.get(o) && e.get(N) > 0 && e.get(o).clearRect(0, 0, e.get(N), e.get(r));
  }
  e.user_effect(() => {
    if (!e.get(i)) return;
    const m = new ResizeObserver((u) => {
      for (const S of u)
        e.set(a, S.contentRect.width, !0), e.set(r, S.contentRect.height, !0);
    });
    return m.observe(e.get(i)), () => {
      m.disconnect();
    };
  }), e.user_effect(() => {
    e.get(N), e.get(r), e.get(W), e.get(n), te();
  }), e.user_effect(() => {
    e.get(A), e.get(o), e.get(A) === "singing" || e.get(A) === "highway" ? ae() : ue();
  }), Ae(() => {
    ue();
  });
  var k = kt(), P = e.child(k);
  gt(P, {
    get mode() {
      return e.get(A);
    },
    get fullRowData() {
      return e.get(w);
    },
    get viewport() {
      return e.get(J);
    },
    cellWidth: f,
    get cellHeight() {
      return e.get(D).cellHeight;
    },
    colorMode: "color",
    showOctaveLabels: y,
    showFrequencyLabels: C,
    get showRightLegend() {
      return e.get(T);
    },
    get singingConfig() {
      return e.get(E);
    },
    get highwayConfig() {
      return e.get(H);
    },
    get legendHighlight() {
      return e.get(B);
    },
    get beatIntervalMs() {
      return e.get(q);
    },
    beatTimeOffsetMs: j
  });
  var I = e.sibling(P, 2);
  e.bind_this(I, (m) => e.set(n, m), () => e.get(n)), e.reset(k), e.bind_this(k, (m) => e.set(i, m), () => e.get(i)), e.append(t, k), e.pop();
}
class Ht {
  constructor() {
    he(this, "synth", null);
    he(this, "scheduledTimeouts", []);
    // Store timeout IDs for cleanup
    he(this, "volume", null);
    he(this, "startTime", 0);
    // Performance.now() when playback started
    he(this, "_isPlaying", !1);
  }
  // Track if a reference tone is currently playing
  /**
   * Check if a reference tone is currently playing
   */
  get isPlaying() {
    return this._isPlaying;
  }
  /**
   * Initialize the audio service
   */
  async init() {
    await ce.start(), this.volume = new ce.Volume(-12).toDestination(), this.synth = new ce.Synth({
      oscillator: { type: "triangle" },
      envelope: {
        attack: 0.05,
        decay: 0.1,
        sustain: 0.9,
        release: 0.1
      }
    }).connect(this.volume);
  }
  /**
   * Set reference tone volume
   */
  setVolume(s) {
    this.volume && (this.volume.volume.value = s);
  }
  /**
   * Schedule all reference tones for the exercise
   * Uses setTimeout for precise timing aligned with the highway animation
   */
  scheduleReferenceTones(s) {
    if (!this.synth) {
      console.warn("[ReferenceAudio] Synth not initialized");
      return;
    }
    this.clearScheduled(), this.startTime = performance.now(), s.forEach((i) => {
      const a = i.durationMs / 1e3, r = ce.Frequency(i.midi, "midi").toFrequency(), n = window.setTimeout(() => {
        this.synth && (console.log(`[ReferenceAudio] Playing ${i.midi} at ${performance.now() - this.startTime}ms`), this._isPlaying = !0, this.synth.triggerAttackRelease(r, a));
      }, i.startTimeMs), o = window.setTimeout(() => {
        this._isPlaying = !1;
      }, i.startTimeMs + i.durationMs);
      this.scheduledTimeouts.push(n, o);
    }), console.log(`[ReferenceAudio] Scheduled ${s.length} reference tones`);
  }
  /**
   * Play a single reference tone immediately
   */
  playTone(s, i) {
    if (!this.synth) {
      console.warn("[ReferenceAudio] Synth not initialized");
      return;
    }
    const a = ce.Frequency(s, "midi").toFrequency(), r = i / 1e3;
    this.synth.triggerAttackRelease(a, r);
  }
  /**
   * Clear all scheduled notes
   */
  clearScheduled() {
    this.scheduledTimeouts.forEach((s) => {
      window.clearTimeout(s);
    }), this.scheduledTimeouts = [];
  }
  /**
   * Stop all audio
   */
  stop() {
    this.clearScheduled(), this.synth && this.synth.triggerRelease();
  }
  /**
   * Dispose of audio resources
   */
  dispose() {
    this.stop(), this.synth && (this.synth.dispose(), this.synth = null), this.volume && (this.volume.dispose(), this.volume = null);
  }
}
const Pe = new Ht(), me = {
  FFT_SIZE: 2048,
  CLARITY_THRESHOLD: 0.8,
  MIN_PITCH_HZ: 60,
  MAX_PITCH_HZ: 1600,
  HIGHLIGHT_CENTS_RANGE: 50
};
let ye = null, _e = null, Re = null, fe = null, Ne = !1;
const De = 1;
function Ft(t) {
  return 12 * Math.log2(t / 440) + 69;
}
function He() {
  if (!Ne || !_e || !Re) {
    fe = null;
    return;
  }
  if (Pe.isPlaying) {
    O.addHistoryPoint({
      frequency: 0,
      midi: 0,
      time: performance.now(),
      clarity: 0
    }), fe = requestAnimationFrame(He);
    return;
  }
  const t = _e.getValue(), [s, i] = Re.findPitch(t, ce.getContext().sampleRate), a = s !== null && i > me.CLARITY_THRESHOLD && s > me.MIN_PITCH_HZ && s < me.MAX_PITCH_HZ;
  if (a) {
    const r = Ft(s), n = {
      frequency: s,
      midi: r,
      clarity: i,
      pitchClass: Math.round(r) % 12
    };
    O.setCurrentPitch(n), O.addHistoryPoint({
      frequency: s,
      midi: r,
      time: performance.now(),
      clarity: i
    }), $.recordPitchInput(r, i);
  } else
    O.addHistoryPoint({
      frequency: 0,
      midi: 0,
      time: performance.now(),
      clarity: 0
    });
  if (a && O.state.currentPitch) {
    const r = O.state.currentPitch.midi, n = _t(r), o = bt(r), d = Math.min(Math.abs(o), me.HIGHLIGHT_CENTS_RANGE), l = Math.max(0, 1 - d / me.HIGHLIGHT_CENTS_RANGE);
    O.setStablePitch({
      pitchClass: Tt(n),
      opacity: l,
      size: De
    });
  } else
    O.setStablePitch({ pitchClass: null, opacity: 0, size: De });
  fe = requestAnimationFrame(He);
}
async function Ot() {
  if (!Ne) {
    fe !== null && cancelAnimationFrame(fe), ye = new ce.UserMedia(), _e = new ce.Analyser("waveform", me.FFT_SIZE), Re = yt.forFloat32Array(_e.size);
    try {
      await ce.start(), await ye.open(), ye.connect(_e), Ne = !0, He();
    } catch (t) {
      throw console.error("Microphone access denied or failed:", t), Qe(), t;
    }
  }
}
function $t() {
  Ne = !1, Qe();
}
function Qe() {
  fe !== null && (cancelAnimationFrame(fe), fe = null), ye && (ye.close(), ye = null), _e = null, Re = null, O.setStablePitch({ pitchClass: null, opacity: 0, size: De }), O.setCurrentPitch(null);
}
e.from_html('<span class="spinner svelte-cytsjj"></span> Starting...', 1);
e.from_html('<span class="icon svelte-cytsjj">&#9632;</span> Stop', 1);
e.from_html('<span class="icon svelte-cytsjj">&#9654;</span> Start', 1);
e.from_html("<button><!></button>");
e.delegate(["click"]);
let ge = null, Me = !1, we = null;
function qt() {
  var t;
  if (!ge) {
    ge = new ce.PolySynth(ce.Synth, {
      oscillator: { type: "sawtooth" },
      envelope: {
        attack: 0.3,
        decay: 0.1,
        sustain: 0.8,
        release: 0.5
      }
    }).toDestination();
    const s = ((t = ge.get().oscillator) == null ? void 0 : t.type) ?? "unknown";
    console.log("[DroneAudio] Initialized drone synth", { oscillatorType: s });
  }
  return ge;
}
function et(t, s) {
  return `${t.replace("b", "#").replace("Db", "C#").replace("Eb", "D#").replace("Gb", "F#").replace("Ab", "G#").replace("Bb", "A#")}${s}`;
}
async function Gt() {
  await ce.start();
  const t = qt(), s = et(M.state.tonic, M.state.drone.octave);
  t.volume.value = M.state.drone.volume, console.log("[DroneAudio] Starting drone", {
    note: s,
    volume: t.volume.value
  }), we && t.releaseAll(), we = s, t.triggerAttack(s), Me = !0;
}
function Ut() {
  ge && Me && (ge.releaseAll(), we = null, Me = !1);
}
function Fe() {
  if (!Me || !ge) return;
  const t = et(M.state.tonic, M.state.drone.octave);
  ge.volume.value = M.state.drone.volume, console.log("[DroneAudio] Updating drone", {
    note: t,
    volume: ge.volume.value
  }), t !== we && (ge.releaseAll(), ge.triggerAttack(t), we = t);
}
async function Vt() {
  Me ? Ut() : await Gt();
}
var Yt = e.from_html("<option> </option>"), Bt = e.from_html('<div class="tonic-selector svelte-16h7our"><label for="tonic-select" class="svelte-16h7our">Key:</label> <select id="tonic-select" class="svelte-16h7our"></select></div>');
function zt(t, s) {
  e.push(s, !0);
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
  function a(d) {
    const l = d.target;
    M.setTonic(l.value), Fe();
  }
  var r = Bt(), n = e.sibling(e.child(r), 2);
  n.__change = a, e.each(n, 21, () => i, e.index, (d, l) => {
    var c = Yt(), g = e.child(c, !0);
    e.reset(c);
    var f = {};
    e.template_effect(() => {
      e.set_text(g, e.get(l)), f !== (f = e.get(l)) && (c.value = (c.__value = e.get(l)) ?? "");
    }), e.append(d, c);
  }), e.reset(n);
  var o;
  e.init_select(n), e.reset(r), e.template_effect(() => {
    o !== (o = M.state.tonic) && (n.value = (n.__value = M.state.tonic) ?? "", e.select_option(n, M.state.tonic));
  }), e.append(t, r), e.pop();
}
e.delegate(["change"]);
var Wt = e.from_html("<option> </option>"), jt = e.from_html('<div class="drone-controls svelte-1rkr6nv"><button> </button> <div class="drone-settings svelte-1rkr6nv"><label class="svelte-1rkr6nv">Oct: <select class="svelte-1rkr6nv"></select></label> <label class="svelte-1rkr6nv">Vol: <input type="range" min="-40" max="0" class="svelte-1rkr6nv"/></label></div></div>');
function Xt(t, s) {
  e.push(s, !0);
  const i = [2, 3, 4, 5];
  async function a() {
    await Vt(), M.toggleDrone();
  }
  function r(p) {
    const _ = p.target;
    M.setDroneOctave(parseInt(_.value, 10)), Fe();
  }
  function n(p) {
    const _ = p.target;
    M.setDroneVolume(parseInt(_.value, 10)), Fe();
  }
  var o = jt(), d = e.child(o);
  let l;
  d.__click = a;
  var c = e.child(d, !0);
  e.reset(d);
  var g = e.sibling(d, 2), f = e.child(g), y = e.sibling(e.child(f));
  y.__change = r, e.each(y, 21, () => i, e.index, (p, _) => {
    var h = Wt(), R = e.child(h, !0);
    e.reset(h);
    var N = {};
    e.template_effect(() => {
      e.set_text(R, e.get(_)), N !== (N = e.get(_)) && (h.value = (h.__value = e.get(_)) ?? "");
    }), e.append(p, h);
  }), e.reset(y);
  var C;
  e.init_select(y), e.reset(f);
  var T = e.sibling(f, 2), v = e.sibling(e.child(T));
  e.remove_input_defaults(v), v.__input = n, e.reset(T), e.reset(g), e.reset(o), e.template_effect(() => {
    l = e.set_class(d, 1, "drone-toggle svelte-1rkr6nv", null, l, { active: M.state.drone.isPlaying }), e.set_text(c, M.state.drone.isPlaying ? "Drone On" : "Drone Off"), C !== (C = M.state.drone.octave) && (y.value = (y.__value = M.state.drone.octave) ?? "", e.select_option(y, M.state.drone.octave)), e.set_value(v, M.state.drone.volume);
  }), e.append(t, o), e.pop();
}
e.delegate(["click", "change", "input"]);
e.from_html("<button> </button>");
e.from_html('<div class="mode-toggle svelte-i9tkj4"></div>');
e.delegate(["click"]);
var Zt = e.from_html('<div class="range-control svelte-1es7ond"><h3 class="control-title svelte-1es7ond">Pitch Range</h3> <!></div>');
function Kt(t, s) {
  e.push(s, !0);
  function i(l) {
    const c = Ue.findIndex((g) => g.midi === l);
    return c >= 0 ? c : 0;
  }
  const a = e.derived(() => i(M.state.yAxisRange.maxMidi)), r = e.derived(() => i(M.state.yAxisRange.minMidi));
  function n(l) {
    const c = l.bottomPitch.midi ?? 21, g = l.topPitch.midi ?? 108;
    M.setYAxisRange({ minMidi: c, maxMidi: g });
  }
  var o = Zt(), d = e.sibling(e.child(o), 2);
  Pt(d, {
    get fullRowData() {
      return Ue;
    },
    get topIndex() {
      return e.get(a);
    },
    get bottomIndex() {
      return e.get(r);
    },
    minSpan: 7,
    onrangechange: n,
    showSummary: !0,
    wheelHeight: 200
  }), e.reset(o), e.append(t, o), e.pop();
}
var Jt = e.from_html('<div class="pitch-highlight-toggle svelte-e7pwl1"><span class="toggle-label svelte-e7pwl1">Pitch Highlight</span> <button> </button></div>');
function Qt(t, s) {
  e.push(s, !0);
  function i() {
    M.togglePitchHighlight();
  }
  var a = Jt(), r = e.sibling(e.child(a), 2);
  let n;
  r.__click = i;
  var o = e.child(r, !0);
  e.reset(r), e.reset(a), e.template_effect(() => {
    n = e.set_class(r, 1, "toggle-button svelte-e7pwl1", null, n, { active: M.state.pitchHighlightEnabled }), e.set_text(o, M.state.pitchHighlightEnabled ? "On" : "Off");
  }), e.append(t, a), e.pop();
}
e.delegate(["click"]);
var es = e.from_html('<button class="start-exercise-btn svelte-118f0cc">Start Demo Exercise</button>'), ts = e.from_html('<button class="stop-exercise-btn svelte-118f0cc">Stop Exercise</button> <div class="progress-indicator svelte-118f0cc"> </div> <div class="phase-indicator svelte-118f0cc"> </div>', 1), ss = e.from_html('<div><span class="result-loop svelte-118f0cc"></span> <span class="result-pitch svelte-118f0cc"> </span> <span class="result-accuracy svelte-118f0cc"> </span> <span class="result-status svelte-118f0cc"> </span></div>'), is = e.from_html('<div class="exercise-results svelte-118f0cc"><h4 class="results-title svelte-118f0cc">Results</h4> <div class="results-summary svelte-118f0cc"><div class="stat svelte-118f0cc"><span class="stat-label svelte-118f0cc">Average Accuracy:</span> <span class="stat-value svelte-118f0cc"> </span></div> <div class="stat svelte-118f0cc"><span class="stat-label svelte-118f0cc">Hits:</span> <span class="stat-value svelte-118f0cc"> </span></div></div> <details class="results-details svelte-118f0cc"><summary class="results-summary-label svelte-118f0cc">Detailed Results</summary> <div class="results-list svelte-118f0cc"></div></details></div>'), as = e.from_html('<div class="demo-exercise-panel svelte-118f0cc"><h3 class="panel-title svelte-118f0cc">Demo Exercise</h3> <details class="settings-details svelte-118f0cc"><summary class="settings-summary svelte-118f0cc">Settings</summary> <div class="exercise-settings svelte-118f0cc"><label class="setting-label svelte-118f0cc"><span class="label-text svelte-118f0cc">Number of loops:</span> <input class="setting-input svelte-118f0cc" type="number" min="1" max="20"/></label> <label class="setting-label svelte-118f0cc"><span class="label-text svelte-118f0cc">Tempo (BPM):</span> <input class="setting-input svelte-118f0cc" type="number" min="60" max="180"/></label> <label class="setting-label svelte-118f0cc"><span class="label-text svelte-118f0cc">Reference Volume:</span> <input class="setting-slider svelte-118f0cc" type="range" min="-40" max="0"/> <span class="volume-value svelte-118f0cc"> </span></label> <div class="pitch-range-buttons svelte-118f0cc"><button class="range-btn svelte-118f0cc">Use Current Range</button> <button class="range-btn svelte-118f0cc">Use Full Range</button></div></div></details> <div class="exercise-controls svelte-118f0cc"><!></div> <!></div>');
function ns(t, s) {
  e.push(s, !0);
  let i = e.state(!1), a = e.state(5), r = e.state(108), n = e.state(-12);
  const o = e.derived(() => z.state.isActive), d = e.derived(() => z.state.isPlaying), l = e.derived(() => z.state.currentPhase), c = e.derived(() => z.getCurrentProgress()), g = e.derived(() => z.getResults()), f = e.derived(() => e.get(g).length > 0), y = e.derived(() => z.getAverageAccuracy()), C = e.derived(() => z.getHitCount()), T = e.derived(() => e.get(g).length);
  e.user_effect(() => {
    if (!e.get(o) || !e.get(d)) return;
    const u = $.state.currentTimeMs;
    z.updatePhase(u);
  }), e.user_effect(() => {
    if (!e.get(o)) return;
    const u = $.getPerformanceResults();
    z.getGeneratedNotes().forEach((F, V) => {
      if (F.lyric !== "🎤") return;
      const se = `target-${V}`, Q = u.get(se);
      if (Q && !z.hasResultForLoop(Math.floor(V / 2))) {
        const ee = v(Q);
        z.addResult({
          loopIndex: Math.floor(V / 2),
          targetPitch: F.midi,
          accuracy: ee,
          performance: Q
        });
      }
    });
  });
  function v(u) {
    return u.hitStatus === "hit" ? u.pitchAccuracyCents !== void 0 ? Math.max(0, 100 - Math.abs(u.pitchAccuracyCents) / 50 * 100) : 100 : 0;
  }
  Ae(() => {
    e.get(o) && R();
  });
  function p() {
    const u = M.state.yAxisRange;
    z.setPitchRange(u.minMidi, u.maxMidi);
  }
  function _() {
    z.setPitchRange(21, 108);
  }
  async function h() {
    M.setVisualizationMode("highway"), z.configure({
      numLoops: e.get(a),
      tempo: e.get(r),
      referenceVolume: e.get(n)
    }), p(), await Pe.init(), Pe.setVolume(e.get(n)), z.start();
    const u = z.getGeneratedNotes();
    $.setTargetNotes(u), $.start(), z.setPlaying(!0);
    const S = u.filter((F) => F.lyric === "👂");
    Pe.scheduleReferenceTones(S);
  }
  function R() {
    Pe.stop(), $.stop(), z.stop();
  }
  function N(u) {
    switch (u) {
      case "reference":
        return "👂 Listen";
      case "input":
        return "🎤 Sing";
      default:
        return "Rest";
    }
  }
  function W(u) {
    const S = ht(u);
    return (S == null ? void 0 : S.pitch) || `MIDI ${u}`;
  }
  var U = as(), w = e.sibling(e.child(U), 2), D = e.sibling(e.child(w), 2), A = e.child(D), q = e.sibling(e.child(A), 2);
  e.remove_input_defaults(q), e.reset(A);
  var j = e.sibling(A, 2), B = e.sibling(e.child(j), 2);
  e.remove_input_defaults(B), e.reset(j);
  var X = e.sibling(j, 2), G = e.sibling(e.child(X), 2);
  e.remove_input_defaults(G);
  var E = e.sibling(G, 2), H = e.child(E);
  e.reset(E), e.reset(X);
  var J = e.sibling(X, 2), te = e.child(J);
  te.__click = p;
  var ie = e.sibling(te, 2);
  ie.__click = _, e.reset(J), e.reset(D), e.reset(w);
  var ae = e.sibling(w, 2), ue = e.child(ae);
  {
    var k = (u) => {
      var S = es();
      S.__click = h, e.append(u, S);
    }, P = (u) => {
      var S = ts(), F = e.first_child(S);
      F.__click = R;
      var V = e.sibling(F, 2), se = e.child(V);
      e.reset(V);
      var Q = e.sibling(V, 2), ee = e.child(Q, !0);
      e.reset(Q), e.template_effect(
        (x) => {
          e.set_text(se, `Loop ${e.get(c).current ?? ""} / ${e.get(c).total ?? ""}`), e.set_text(ee, x);
        },
        [() => N(e.get(l))]
      ), e.append(u, S);
    };
    e.if(ue, (u) => {
      e.get(o) ? u(P, !1) : u(k);
    });
  }
  e.reset(ae);
  var I = e.sibling(ae, 2);
  {
    var m = (u) => {
      var S = is(), F = e.sibling(e.child(S), 2), V = e.child(F), se = e.sibling(e.child(V), 2), Q = e.child(se);
      e.reset(se), e.reset(V);
      var ee = e.sibling(V, 2), x = e.sibling(e.child(ee), 2), L = e.child(x);
      e.reset(x), e.reset(ee), e.reset(F);
      var Y = e.sibling(F, 2), ne = e.sibling(e.child(Y), 2);
      e.each(ne, 21, () => e.get(g), e.index, (K, de, ve) => {
        var re = ss();
        let pe;
        var be = e.child(re);
        be.textContent = `Loop ${ve + 1}:`;
        var Te = e.sibling(be, 2), Ie = e.child(Te, !0);
        e.reset(Te);
        var Ee = e.sibling(Te, 2), tt = e.child(Ee);
        e.reset(Ee);
        var $e = e.sibling(Ee, 2), st = e.child($e, !0);
        e.reset($e), e.reset(re), e.template_effect(
          (it, at) => {
            var qe, Ge;
            pe = e.set_class(re, 1, "result-item svelte-118f0cc", null, pe, { hit: ((qe = e.get(de).performance) == null ? void 0 : qe.hitStatus) === "hit" }), e.set_text(Ie, it), e.set_text(tt, `${at ?? ""}%`), e.set_text(st, ((Ge = e.get(de).performance) == null ? void 0 : Ge.hitStatus) === "hit" ? "✓" : "✗");
          },
          [
            () => W(e.get(de).targetPitch),
            () => e.get(de).accuracy.toFixed(0)
          ]
        ), e.append(K, re);
      }), e.reset(ne), e.reset(Y), e.reset(S), e.template_effect(
        (K) => {
          e.set_text(Q, `${K ?? ""}%`), e.set_text(L, `${e.get(C) ?? ""}/${e.get(T) ?? ""}`);
        },
        [() => e.get(y).toFixed(1)]
      ), e.append(u, S);
    };
    e.if(I, (u) => {
      e.get(f) && !e.get(o) && u(m);
    });
  }
  e.reset(U), e.template_effect(() => {
    q.disabled = e.get(o), B.disabled = e.get(o), G.disabled = e.get(o), e.set_text(H, `${e.get(n) ?? ""} dB`), te.disabled = e.get(o), ie.disabled = e.get(o);
  }), e.bind_value(q, () => e.get(a), (u) => e.set(a, u)), e.bind_value(B, () => e.get(r), (u) => e.set(r, u)), e.bind_value(G, () => e.get(n), (u) => e.set(n, u)), e.bind_property("open", "toggle", w, (u) => e.set(i, u), () => e.get(i)), e.append(t, U), e.pop();
}
e.delegate(["click"]);
const rs = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  /^([a-zA-Z0-9_-]{11})$/
  // Direct video ID
], os = {
  gapMs: 0,
  videoGapSec: 0,
  manualOffsetSec: 0
}, Oe = 60;
function ls(t) {
  try {
    const s = t.split(/\r?\n/).map((o) => o.trim()), i = cs(s);
    if (!i.bpm)
      return { success: !1, error: "Missing required #BPM tag" };
    const { notes: a, lineBreaks: r, totalBeats: n } = ds(s);
    return a.length === 0 ? { success: !1, error: "No valid notes found in file" } : {
      success: !0,
      song: {
        metadata: i,
        notes: a,
        lineBreaks: r,
        totalBeats: n
      }
    };
  } catch (s) {
    return {
      success: !1,
      error: s instanceof Error ? s.message : "Unknown parsing error"
    };
  }
}
function cs(t) {
  const s = {};
  for (const i of t) {
    if (!i.startsWith("#")) continue;
    const a = i.indexOf(":");
    if (a === -1) continue;
    const r = i.slice(1, a).toUpperCase().trim(), n = i.slice(a + 1).trim();
    switch (r) {
      case "TITLE":
        s.title = n;
        break;
      case "ARTIST":
        s.artist = n;
        break;
      case "VIDEO":
        s.video = n;
        break;
      case "VIDEOGAP":
        s.videoGap = parseFloat(n.replace(",", ".")) || 0;
        break;
      case "GAP":
        s.gap = parseFloat(n.replace(",", ".")) || 0;
        break;
      case "BPM":
        s.bpm = parseFloat(n.replace(",", ".")) || 0;
        break;
      case "MP3":
      case "AUDIO":
        s.mp3 = n;
        break;
      case "LANGUAGE":
        s.language = n;
        break;
      case "GENRE":
        s.genre = n;
        break;
      case "YEAR":
        s.year = parseInt(n) || void 0;
        break;
      case "CREATOR":
        s.creator = n;
        break;
      case "COVER":
        s.cover = n;
        break;
      case "BACKGROUND":
        s.background = n;
        break;
      case "PREVIEWSTART":
        s.previewStart = parseFloat(n.replace(",", ".")) || 0;
        break;
    }
  }
  return {
    title: s.title || "Unknown Title",
    artist: s.artist || "Unknown Artist",
    bpm: s.bpm || 0,
    ...s
  };
}
function ds(t) {
  const s = [], i = [];
  let a = 0;
  for (const r of t) {
    if (r.length === 0 || r.startsWith("#")) continue;
    const n = r[0];
    if (n === "E") break;
    if (n === "-") {
      const o = r.slice(1).trim().split(/\s+/), d = parseInt(o[0]) || 0;
      i.push(d);
      continue;
    }
    if ([":", "*", "F", "R"].includes(n)) {
      const o = gs(r);
      if (o) {
        s.push(o);
        const d = o.startBeat + o.duration;
        d > a && (a = d);
      }
    }
  }
  return { notes: s, lineBreaks: i, totalBeats: a };
}
function gs(t) {
  const s = t[0], a = t.slice(1).trim().split(/\s+/);
  if (a.length < 3) return null;
  const r = parseInt(a[0]), n = parseInt(a[1]), o = parseInt(a[2]), d = a.slice(3).join(" ") || "";
  return isNaN(r) || isNaN(n) || isNaN(o) ? null : {
    type: s,
    startBeat: r,
    duration: n,
    pitch: o,
    lyric: d
  };
}
function us(t) {
  if (!t) return null;
  const s = t.trim();
  for (const i of rs) {
    const a = s.match(i);
    if (a && a[1])
      return a[1];
  }
  return null;
}
function Xe(t, s = Oe) {
  const { metadata: i, notes: a, lineBreaks: r } = t, { bpm: n } = i, o = 60 / n * 1e3 * 4;
  let d = 0;
  const l = [...r].sort((g, f) => g - f), c = a.length > 0 ? Math.min(...a.map((g) => g.startBeat)) : 0;
  return a.filter((g) => g.type !== "F").map((g) => {
    const f = (g.startBeat - c) * o, y = g.duration * o, C = s + g.pitch;
    for (; d < l.length && g.startBeat >= l[d]; )
      d++;
    const T = {
      midi: C,
      startTimeMs: f,
      durationMs: y,
      lyric: g.lyric.trim() || void 0
    };
    return g.type === "*" && (T.isGolden = !0), T;
  });
}
function vs(t) {
  return {
    gapMs: t.gap || 0,
    videoGapSec: t.videoGap || 0,
    manualOffsetSec: 0
  };
}
function fs(t) {
  const { metadata: s, notes: i, totalBeats: a } = t, { bpm: r } = s, n = 60 / r * 1e3 * 4, o = i.length > 0 ? Math.min(...i.map((l) => l.startBeat)) : 0;
  return (a - o) * n + 2e3;
}
function Ze(t, s = Oe) {
  const i = t.notes.filter((n) => n.type !== "F" && n.type !== "-").map((n) => s + n.pitch);
  if (i.length === 0)
    return { minMidi: 48, maxMidi: 72 };
  const a = Math.min(...i), r = Math.max(...i);
  return {
    minMidi: Math.max(24, a - 3),
    maxMidi: Math.min(108, r + 3)
  };
}
const Ke = {
  isActive: !1,
  isLoading: !1,
  isPlaying: !1,
  song: null,
  targetNotes: [],
  youtubeId: null,
  syncConfig: { ...os },
  baseMidi: Oe,
  totalDurationMs: 0,
  detectedRange: { minMidi: 48, maxMidi: 72 },
  error: null
};
function ps() {
  let t = e.state(e.proxy({ ...Ke })), s = null;
  return {
    get state() {
      return e.get(t);
    },
    /** Load and parse an Ultrastar .txt file */
    async loadFile(i) {
      e.get(t).isLoading = !0, e.get(t).error = null;
      try {
        const a = await i.text(), r = ls(a);
        if (!r.success)
          return e.get(t).error = r.error, e.get(t).isLoading = !1, !1;
        const n = r.song, o = n.metadata.video ? us(n.metadata.video) : null, d = vs(n.metadata), l = Xe(n, e.get(t).baseMidi), c = fs(n), g = Ze(n, e.get(t).baseMidi);
        return e.get(t).song = n, e.get(t).youtubeId = o, e.get(t).syncConfig = d, e.get(t).targetNotes = l, e.get(t).totalDurationMs = c, e.get(t).detectedRange = g, e.get(t).isActive = !0, e.get(t).isLoading = !1, !0;
      } catch (a) {
        return e.get(t).error = a instanceof Error ? a.message : "Failed to load file", e.get(t).isLoading = !1, !1;
      }
    },
    /** Get the computed YouTube offset in seconds */
    get youtubeOffset() {
      const { gapMs: i, videoGapSec: a, manualOffsetSec: r } = e.get(t).syncConfig;
      return i / 1e3 + a + r;
    },
    /** Adjust the manual sync offset */
    adjustOffset(i) {
      e.get(t).syncConfig = {
        ...e.get(t).syncConfig,
        manualOffsetSec: e.get(t).syncConfig.manualOffsetSec + i
      };
    },
    /** Set the manual sync offset directly */
    setManualOffset(i) {
      e.get(t).syncConfig = { ...e.get(t).syncConfig, manualOffsetSec: i };
    },
    /** Reset manual offset to zero */
    resetOffset() {
      e.get(t).syncConfig = { ...e.get(t).syncConfig, manualOffsetSec: 0 };
    },
    /** Set the base MIDI note for pitch conversion */
    setBaseMidi(i) {
      e.get(t).baseMidi = i, e.get(t).song && (e.get(t).targetNotes = Xe(e.get(t).song, i), e.get(t).detectedRange = Ze(e.get(t).song, i));
    },
    /** Set playing state */
    setPlaying(i) {
      e.get(t).isPlaying = i;
    },
    /** Register completion callback */
    onComplete(i) {
      s = i;
    },
    /** Trigger completion (called when song ends) */
    triggerComplete() {
      e.get(t).isPlaying = !1, s && s();
    },
    /** Check if current time has exceeded song duration */
    checkCompletion(i) {
      return !e.get(t).isPlaying || !e.get(t).isActive ? !1 : i >= e.get(t).totalDurationMs - 500 ? (this.triggerComplete(), !0) : !1;
    },
    /** Get song title */
    get title() {
      var i;
      return ((i = e.get(t).song) == null ? void 0 : i.metadata.title) || "";
    },
    /** Get song artist */
    get artist() {
      var i;
      return ((i = e.get(t).song) == null ? void 0 : i.metadata.artist) || "";
    },
    /** Check if YouTube video is available */
    get hasVideo() {
      return e.get(t).youtubeId !== null;
    },
    /** Reset state and clear loaded song */
    reset() {
      e.set(t, { ...Ke }, !0), s = null;
    },
    /** Unload song but preserve settings */
    unload() {
      e.get(t).isActive = !1, e.get(t).isPlaying = !1, e.get(t).song = null, e.get(t).targetNotes = [], e.get(t).youtubeId = null, e.get(t).totalDurationMs = 0, e.get(t).error = null;
    }
  };
}
const b = ps();
let Ce = null, xe = !1;
function hs() {
  return Ce || (xe && window.YT && window.YT.Player ? Promise.resolve() : (Ce = new Promise((t, s) => {
    if (window.YT && window.YT.Player) {
      xe = !0, t();
      return;
    }
    window.onYouTubeIframeAPIReady = () => {
      xe = !0, t();
    };
    const i = document.createElement("script");
    i.src = "https://www.youtube.com/iframe_api", i.async = !0, i.onerror = () => {
      s(new Error("Failed to load YouTube IFrame API"));
    }, document.head.appendChild(i), setTimeout(() => {
      xe || s(new Error("YouTube IFrame API load timeout"));
    }, 1e4);
  }), Ce));
}
function ms(t, s, i = {}) {
  var l;
  if (!xe || !((l = window.YT) != null && l.Player))
    throw new Error("YouTube API not loaded. Call loadYouTubeAPI() first.");
  const { width: a = 320, height: r = 180, onReady: n, onStateChange: o, onError: d } = i;
  return new window.YT.Player(t, {
    width: a,
    height: r,
    videoId: s,
    playerVars: {
      autoplay: 0,
      controls: 1,
      disablekb: 1,
      // Disable keyboard controls (we handle our own)
      enablejsapi: 1,
      fs: 0,
      // Disable fullscreen button
      modestbranding: 1,
      origin: window.location.origin,
      playsinline: 1,
      rel: 0
      // Don't show related videos
    },
    events: {
      onReady: (c) => {
        n == null || n(c.target);
      },
      onStateChange: (c) => {
        o == null || o(c.data);
      },
      onError: (c) => {
        d == null || d(c.data);
      }
    }
  });
}
function ys(t) {
  switch (t) {
    case YT.PlayerError.InvalidParam:
      return "Invalid video ID";
    case YT.PlayerError.Html5Error:
      return "HTML5 player error";
    case YT.PlayerError.VideoNotFound:
      return "Video not found";
    case YT.PlayerError.NotAllowedEmbedded:
    case YT.PlayerError.NotAllowedEmbedded2:
      return "Video cannot be embedded";
    default:
      return "Unknown player error";
  }
}
const Le = {
  isApiLoaded: !1,
  isApiLoading: !1,
  isPlayerReady: !1,
  isPlaying: !1,
  currentTime: 0,
  duration: 0,
  videoId: null,
  error: null,
  isEmbeddable: !0,
  volume: 100,
  isMuted: !1
};
function _s() {
  let t = e.state(e.proxy({ ...Le })), s = null, i = null, a = null;
  return {
    get state() {
      return e.get(t);
    },
    /** Initialize the YouTube IFrame API */
    async initAPI() {
      if (e.get(t).isApiLoaded) return !0;
      if (e.get(t).isApiLoading) return !1;
      e.get(t).isApiLoading = !0, e.get(t).error = null;
      try {
        return await hs(), e.get(t).isApiLoaded = !0, e.get(t).isApiLoading = !1, !0;
      } catch (r) {
        return e.get(t).error = r instanceof Error ? r.message : "Failed to load YouTube API", e.get(t).isApiLoading = !1, !1;
      }
    },
    /** Load a video into the player */
    async loadVideo(r, n) {
      if (!e.get(t).isApiLoaded && !await this.initAPI())
        return !1;
      if (s) {
        try {
          s.destroy();
        } catch {
        }
        s = null;
      }
      return e.get(t).isPlayerReady = !1, e.get(t).error = null, e.get(t).isEmbeddable = !0, e.get(t).videoId = r, new Promise((o) => {
        try {
          s = ms(n, r, {
            onReady: (d) => {
              e.get(t).isPlayerReady = !0, e.get(t).duration = d.getDuration(), e.get(t).volume = d.getVolume(), e.get(t).isMuted = d.isMuted(), o(!0);
            },
            onStateChange: (d) => {
              e.get(t).isPlaying = d === YT.PlayerState.PLAYING, d === YT.PlayerState.ENDED && (e.get(t).isPlaying = !1, this.stopSyncLoop());
            },
            onError: (d) => {
              e.get(t).error = ys(d), e.get(t).isEmbeddable = d !== YT.PlayerError.NotAllowedEmbedded && d !== YT.PlayerError.NotAllowedEmbedded2, e.get(t).isPlayerReady = !1, o(!1);
            }
          });
        } catch (d) {
          e.get(t).error = d instanceof Error ? d.message : "Failed to create player", o(!1);
        }
      });
    },
    /** Play the video */
    play() {
      s && e.get(t).isPlayerReady && s.playVideo();
    },
    /** Pause the video */
    pause() {
      s && e.get(t).isPlayerReady && s.pauseVideo();
    },
    /** Stop the video */
    stop() {
      s && e.get(t).isPlayerReady && (s.stopVideo(), e.get(t).isPlaying = !1), this.stopSyncLoop();
    },
    /** Seek to a specific time in seconds */
    seekTo(r) {
      s && e.get(t).isPlayerReady && (s.seekTo(Math.max(0, r), !0), e.get(t).currentTime = Math.max(0, r));
    },
    /** Get current playback time */
    getCurrentTime() {
      return s && e.get(t).isPlayerReady ? s.getCurrentTime() : e.get(t).currentTime;
    },
    /** Set volume (0-100) */
    setVolume(r) {
      const n = Math.max(0, Math.min(100, r));
      s && e.get(t).isPlayerReady && s.setVolume(n), e.get(t).volume = n;
    },
    /** Mute the video */
    mute() {
      s && e.get(t).isPlayerReady && s.mute(), e.get(t).isMuted = !0;
    },
    /** Unmute the video */
    unmute() {
      s && e.get(t).isPlayerReady && s.unMute(), e.get(t).isMuted = !1;
    },
    /** Toggle mute state */
    toggleMute() {
      e.get(t).isMuted ? this.unmute() : this.mute();
    },
    /** Start the sync loop for drift correction */
    startSyncLoop(r, n = 250) {
      a = r, i !== null && clearInterval(i), i = window.setInterval(
        () => {
          if (s && e.get(t).isPlayerReady && e.get(t).isPlaying) {
            const o = s.getCurrentTime();
            e.get(t).currentTime = o, a == null || a(o);
          }
        },
        n
      );
    },
    /** Stop the sync loop */
    stopSyncLoop() {
      i !== null && (clearInterval(i), i = null), a = null;
    },
    /** Check and correct drift if needed */
    correctDrift(r, n = 150) {
      if (!s || !e.get(t).isPlayerReady || !e.get(t).isPlaying) return !1;
      const o = s.getCurrentTime();
      return Math.abs(o - r) * 1e3 > n ? (s.seekTo(r, !0), !0) : !1;
    },
    /** Get the YouTube video URL for fallback */
    getVideoUrl() {
      return e.get(t).videoId ? `https://www.youtube.com/watch?v=${e.get(t).videoId}` : null;
    },
    /** Dispose of the player and clean up */
    dispose() {
      if (this.stopSyncLoop(), s) {
        try {
          s.destroy();
        } catch {
        }
        s = null;
      }
      e.set(t, { ...Le, isApiLoaded: e.get(t).isApiLoaded }, !0);
    },
    /** Reset to initial state */
    reset() {
      this.dispose(), e.set(t, { ...Le }, !0);
    }
  };
}
const Z = _s();
function bs(t) {
  let s = { ...t.syncConfig };
  const i = t.driftCheckIntervalMs ?? 250, a = t.maxDriftMs ?? 150;
  function r() {
    return s.gapMs / 1e3 + s.videoGapSec + s.manualOffsetSec;
  }
  function n(v) {
    return v / 1e3 + r();
  }
  function o(v) {
    return (v - r()) * 1e3;
  }
  function d(v, p) {
    const _ = n(v), h = p - _, R = Math.abs(h * 1e3);
    if (R > a) {
      const N = o(p);
      return {
        driftMs: R,
        needsCorrection: !0,
        correctedTransportTimeMs: N
      };
    }
    return {
      driftMs: R,
      needsCorrection: !1
    };
  }
  function l(v) {
    s = { ...s, ...v };
  }
  function c(v) {
    s.manualOffsetSec += v;
  }
  function g() {
    s.manualOffsetSec = 0;
  }
  function f() {
    return s.manualOffsetSec;
  }
  function y() {
    return r();
  }
  function C() {
    const v = s.manualOffsetSec;
    return `${v >= 0 ? "+" : ""}${v.toFixed(2)}s`;
  }
  function T() {
    return {
      intervalMs: i,
      maxDriftMs: a
    };
  }
  return {
    // Getters
    getYouTubeOffset: r,
    getTotalOffset: y,
    getManualOffset: f,
    getSyncLoopConfig: T,
    // Conversion
    transportToYouTube: n,
    youTubeToTransport: o,
    // Drift handling
    checkDrift: d,
    // Configuration
    updateConfig: l,
    adjustManualOffset: c,
    resetManualOffset: g,
    // Formatting
    formatOffset: C,
    // Get current config (for persistence)
    getConfig: () => ({ ...s })
  };
}
var Ts = e.from_html('<div class="youtube-loading svelte-10347yi"><div class="spinner svelte-10347yi"></div> <span>Loading video...</span></div>'), Ps = e.from_html('<button class="fallback-btn svelte-10347yi">Open on YouTube ↗</button>'), xs = e.from_html('<div class="youtube-error svelte-10347yi"><span class="error-icon svelte-10347yi">⚠️</span> <span class="error-message svelte-10347yi"> </span> <!></div>'), Ms = e.from_html('<div class="youtube-placeholder svelte-10347yi"><span class="placeholder-icon svelte-10347yi">🎬</span> <span class="placeholder-text svelte-10347yi">No video loaded</span></div>'), ws = e.from_html('<div class="youtube-container svelte-10347yi"><div class="youtube-player svelte-10347yi"></div> <!> <!> <!></div>');
function As(t, s) {
  e.push(s, !0);
  const i = `youtube-player-${Math.random().toString(36).slice(2, 9)}`, a = e.derived(() => Z.state.isApiLoading || Z.state.videoId && !Z.state.isPlayerReady), r = e.derived(() => !!Z.state.error), n = e.derived(() => Z.state.isEmbeddable), o = e.derived(() => b.state.youtubeId);
  e.user_effect(() => {
    e.get(o) && Z.loadVideo(e.get(o), i);
  }), Ae(() => {
    Z.dispose();
  });
  function d() {
    const p = Z.getVideoUrl();
    p && window.open(p, "_blank", "noopener,noreferrer");
  }
  var l = ws(), c = e.child(l), g = e.sibling(c, 2);
  {
    var f = (p) => {
      var _ = Ts();
      e.append(p, _);
    };
    e.if(g, (p) => {
      e.get(a) && e.get(o) && p(f);
    });
  }
  var y = e.sibling(g, 2);
  {
    var C = (p) => {
      var _ = xs(), h = e.sibling(e.child(_), 2), R = e.child(h, !0);
      e.reset(h);
      var N = e.sibling(h, 2);
      {
        var W = (U) => {
          var w = Ps();
          w.__click = d, e.append(U, w);
        };
        e.if(N, (U) => {
          e.get(n) || U(W);
        });
      }
      e.reset(_), e.template_effect(() => e.set_text(R, Z.state.error)), e.append(p, _);
    };
    e.if(y, (p) => {
      e.get(r) && p(C);
    });
  }
  var T = e.sibling(y, 2);
  {
    var v = (p) => {
      var _ = Ms();
      e.append(p, _);
    };
    e.if(T, (p) => {
      !e.get(o) && !e.get(a) && !e.get(r) && p(v);
    });
  }
  e.reset(l), e.template_effect(() => e.set_attribute(c, "id", i)), e.append(t, l), e.pop();
}
e.delegate(["click"]);
var Ss = e.from_html('<div class="sync-controls svelte-1yzfvpa"><div class="sync-header svelte-1yzfvpa"><span class="sync-label svelte-1yzfvpa">Sync Offset</span> <span class="sync-value svelte-1yzfvpa"> </span></div> <div class="sync-buttons svelte-1yzfvpa"><button class="sync-btn coarse svelte-1yzfvpa" title="Earlier by 0.1s">-0.1s</button> <button class="sync-btn fine svelte-1yzfvpa" title="Earlier by 0.01s">-0.01s</button> <button class="sync-btn reset svelte-1yzfvpa" title="Reset offset">0</button> <button class="sync-btn fine svelte-1yzfvpa" title="Later by 0.01s">+0.01s</button> <button class="sync-btn coarse svelte-1yzfvpa" title="Later by 0.1s">+0.1s</button></div> <div class="sync-hint svelte-1yzfvpa">Use arrow keys to adjust (Shift for coarse)</div></div>');
function Cs(t, s) {
  e.push(s, !0);
  const i = e.derived(() => b.state.syncConfig.manualOffsetSec), a = e.derived(() => b.state.isActive);
  function r(h) {
    return `${h >= 0 ? "+" : ""}${h.toFixed(2)}s`;
  }
  function n(h) {
    b.adjustOffset(h);
  }
  function o() {
    b.resetOffset();
  }
  function d(h) {
    if (e.get(a) && !(h.target instanceof HTMLInputElement))
      switch (h.key) {
        case "ArrowLeft":
          h.preventDefault(), n(h.shiftKey ? -0.1 : -0.01);
          break;
        case "ArrowRight":
          h.preventDefault(), n(h.shiftKey ? 0.1 : 0.01);
          break;
      }
  }
  var l = Ss();
  e.event("keydown", e.window, d);
  var c = e.child(l), g = e.sibling(e.child(c), 2), f = e.child(g, !0);
  e.reset(g), e.reset(c);
  var y = e.sibling(c, 2), C = e.child(y);
  C.__click = () => n(-0.1);
  var T = e.sibling(C, 2);
  T.__click = () => n(-0.01);
  var v = e.sibling(T, 2);
  v.__click = o;
  var p = e.sibling(v, 2);
  p.__click = () => n(0.01);
  var _ = e.sibling(p, 2);
  _.__click = () => n(0.1), e.reset(y), e.next(2), e.reset(l), e.template_effect(
    (h) => {
      e.set_text(f, h), C.disabled = !e.get(a), T.disabled = !e.get(a), v.disabled = !e.get(a) || e.get(i) === 0, p.disabled = !e.get(a), _.disabled = !e.get(a);
    },
    [() => r(e.get(i))]
  ), e.append(t, l), e.pop();
}
e.delegate(["click"]);
var Rs = e.from_html('<span class="spinner svelte-183tp03"></span> Loading...', 1), Ns = e.from_html('<div class="error-message svelte-183tp03"> </div>'), Is = e.from_html('<button class="upload-btn svelte-183tp03"><!></button> <!>', 1), Es = e.from_html('<div class="video-section svelte-183tp03"><!> <!></div>'), Ls = e.from_html('<button class="play-btn svelte-183tp03">▶ Play</button>'), ks = e.from_html('<button class="stop-btn svelte-183tp03">⏹ Stop</button>'), Ds = e.from_html('<div class="progress-info svelte-183tp03"><span class="time-display svelte-183tp03"> </span></div>'), Hs = e.from_html('<div class="song-info svelte-183tp03"><div class="song-title svelte-183tp03"> </div> <div class="song-artist svelte-183tp03"> </div></div> <!> <div class="playback-controls svelte-183tp03"><!> <button class="unload-btn svelte-183tp03">Unload</button></div> <!>', 1), Fs = e.from_html('<div class="ultrastar-panel svelte-183tp03"><h3 class="panel-title svelte-183tp03">Ultrastar Song</h3> <input type="file" accept=".txt" style="display: none;"/> <!></div>');
function Os(t, s) {
  e.push(s, !0);
  let i = null, a;
  const r = e.derived(() => b.state.isActive), n = e.derived(() => b.state.isLoading), o = e.derived(() => b.state.isPlaying), d = e.derived(() => b.hasVideo), l = e.derived(() => b.title), c = e.derived(() => b.artist), g = e.derived(() => b.state.error);
  async function f(w) {
    var j, B, X, G;
    const D = w.target, A = (j = D.files) == null ? void 0 : j[0];
    if (!A) return;
    if (await b.loadFile(A)) {
      i = bs({ syncConfig: b.state.syncConfig });
      const E = b.state.detectedRange;
      M.setYAxisRange({ minMidi: E.minMidi, maxMidi: E.maxMidi }), $.setTargetNotes(b.state.targetNotes), console.log("[Ultrastar] File loaded:", {
        title: b.title,
        artist: b.artist,
        youtubeId: b.state.youtubeId,
        bpm: (B = b.state.song) == null ? void 0 : B.metadata.bpm,
        gap: (X = b.state.song) == null ? void 0 : X.metadata.gap,
        videoGap: (G = b.state.song) == null ? void 0 : G.metadata.videoGap,
        noteCount: b.state.targetNotes.length,
        firstNotes: b.state.targetNotes.slice(0, 3),
        lastNotes: b.state.targetNotes.slice(-3),
        totalDurationMs: b.state.totalDurationMs,
        pitchRange: E,
        syncConfig: b.state.syncConfig
      });
    }
    D.value = "";
  }
  async function y() {
    if (e.get(r))
      if (M.setVisualizationMode("highway"), i && i.updateConfig(b.state.syncConfig), $.setTargetNotes(b.state.targetNotes), b.setPlaying(!0), e.get(d) && Z.state.isPlayerReady) {
        const w = (i == null ? void 0 : i.getYouTubeOffset()) ?? 0;
        console.log("[Ultrastar] Starting playback:", {
          youtubeOffset: w,
          noteCount: b.state.targetNotes.length,
          firstNote: b.state.targetNotes[0],
          syncConfig: b.state.syncConfig
        }), $.setCurrentTime(0), Z.seekTo(w), Z.play(), v();
      } else
        $.start();
  }
  function C() {
    $.stop(), b.setPlaying(!1), Z.pause(), p();
  }
  function T() {
    C(), b.unload(), Z.dispose(), $.reset(), i = null;
  }
  function v() {
    Z.startSyncLoop(
      (w) => {
        if (!i) return;
        const D = i.youTubeToTransport(w), A = $.state.currentTimeMs;
        Math.abs(D - A) > 50 && $.setCurrentTime(Math.max(0, D));
      },
      100
    );
  }
  function p() {
    Z.stopSyncLoop();
  }
  function _() {
    a == null || a.click();
  }
  Ae(() => {
    p(), Z.dispose();
  });
  var h = Fs(), R = e.sibling(e.child(h), 2);
  R.__change = f, e.bind_this(R, (w) => a = w, () => a);
  var N = e.sibling(R, 2);
  {
    var W = (w) => {
      var D = Is(), A = e.first_child(D);
      A.__click = _;
      var q = e.child(A);
      {
        var j = (E) => {
          var H = Rs();
          e.next(), e.append(E, H);
        }, B = (E) => {
          var H = e.text("Upload Ultrastar .txt");
          e.append(E, H);
        };
        e.if(q, (E) => {
          e.get(n) ? E(j) : E(B, !1);
        });
      }
      e.reset(A);
      var X = e.sibling(A, 2);
      {
        var G = (E) => {
          var H = Ns(), J = e.child(H, !0);
          e.reset(H), e.template_effect(() => e.set_text(J, e.get(g))), e.append(E, H);
        };
        e.if(X, (E) => {
          e.get(g) && E(G);
        });
      }
      e.template_effect(() => A.disabled = e.get(n)), e.append(w, D);
    }, U = (w) => {
      var D = Hs(), A = e.first_child(D), q = e.child(A), j = e.child(q, !0);
      e.reset(q);
      var B = e.sibling(q, 2), X = e.child(B, !0);
      e.reset(B), e.reset(A);
      var G = e.sibling(A, 2);
      {
        var E = (P) => {
          var I = Es(), m = e.child(I);
          As(m, {});
          var u = e.sibling(m, 2);
          Cs(u, {}), e.reset(I), e.append(P, I);
        };
        e.if(G, (P) => {
          e.get(d) && P(E);
        });
      }
      var H = e.sibling(G, 2), J = e.child(H);
      {
        var te = (P) => {
          var I = Ls();
          I.__click = y, e.append(P, I);
        }, ie = (P) => {
          var I = ks();
          I.__click = C, e.append(P, I);
        };
        e.if(J, (P) => {
          e.get(o) ? P(ie, !1) : P(te);
        });
      }
      var ae = e.sibling(J, 2);
      ae.__click = T, e.reset(H);
      var ue = e.sibling(H, 2);
      {
        var k = (P) => {
          var I = Ds(), m = e.child(I), u = e.child(m);
          e.reset(m), e.reset(I), e.template_effect(
            (S, F) => e.set_text(u, `${S ?? ""}s
          / ${F ?? ""}s`),
            [
              () => Math.floor($.state.currentTimeMs / 1e3),
              () => Math.floor(b.state.totalDurationMs / 1e3)
            ]
          ), e.append(P, I);
        };
        e.if(ue, (P) => {
          e.get(o) && P(k);
        });
      }
      e.template_effect(() => {
        e.set_text(j, e.get(l)), e.set_text(X, e.get(c)), ae.disabled = e.get(o);
      }), e.append(w, D);
    };
    e.if(N, (w) => {
      e.get(r) ? w(U, !1) : w(W);
    });
  }
  e.reset(h), e.append(t, h), e.pop();
}
e.delegate(["change", "click"]);
var $s = e.from_html('<div class="note-display svelte-1hjl33a"><span class="note-name svelte-1hjl33a"> </span> <span class="octave svelte-1hjl33a"> </span></div> <div class="details svelte-1hjl33a"><span class="frequency"> </span> <span> </span> <span class="clarity"> </span></div>', 1), qs = e.from_html('<div class="no-pitch svelte-1hjl33a"><span class="placeholder svelte-1hjl33a">---</span> <span class="hint svelte-1hjl33a">Sing or hum into the microphone</span></div>'), Gs = e.from_html('<div class="pitch-readout svelte-1hjl33a"><!></div>');
function Us(t, s) {
  e.push(s, !0);
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
  ], a = e.derived(() => () => {
    const l = O.state.currentPitch;
    if (!l) return null;
    const c = i[l.pitchClass], g = Math.floor(l.midi / 12) - 1, f = Math.round((l.midi - Math.round(l.midi)) * 100);
    return {
      name: c,
      octave: g,
      frequency: l.frequency.toFixed(1),
      cents: f,
      clarity: Math.round(l.clarity * 100)
    };
  });
  var r = Gs(), n = e.child(r);
  {
    var o = (l) => {
      const c = e.derived(() => e.get(a)());
      var g = $s(), f = e.first_child(g), y = e.child(f), C = e.child(y, !0);
      e.reset(y);
      var T = e.sibling(y, 2), v = e.child(T, !0);
      e.reset(T), e.reset(f);
      var p = e.sibling(f, 2), _ = e.child(p), h = e.child(_);
      e.reset(_);
      var R = e.sibling(_, 2);
      let N;
      var W = e.child(R);
      e.reset(R);
      var U = e.sibling(R, 2), w = e.child(U);
      e.reset(U), e.reset(p), e.template_effect(() => {
        e.set_text(C, e.get(c).name), e.set_text(v, e.get(c).octave), e.set_text(h, `${e.get(c).frequency ?? ""} Hz`), N = e.set_class(R, 1, "cents svelte-1hjl33a", null, N, { sharp: e.get(c).cents > 0, flat: e.get(c).cents < 0 }), e.set_text(W, `${e.get(c).cents > 0 ? "+" : ""}${e.get(c).cents ?? ""}¢`), e.set_text(w, `${e.get(c).clarity ?? ""}%`);
      }), e.append(l, g);
    }, d = (l) => {
      var c = qs();
      e.append(l, c);
    };
    e.if(n, (l) => {
      e.get(a)() ? l(o) : l(d, !1);
    });
  }
  e.reset(r), e.append(t, r), e.pop();
}
const Je = {
  isVisible: !1,
  summary: null,
  songTitle: "",
  artistName: "",
  source: null
}, Vs = {
  totalNotes: 0,
  notesHit: 0,
  notesMissed: 0,
  accuracyPercent: 0,
  goldenNotesHit: 0,
  goldenNotesTotal: 0,
  phraseResults: [],
  averagePitchDeviationCents: 0
};
function Ys() {
  let t = e.state(e.proxy({ ...Je }));
  return {
    get state() {
      return e.get(t);
    },
    /**
     * Show results modal with calculated summary
     */
    show(s, i = {}) {
      e.get(t).summary = s, e.get(t).songTitle = i.title || "", e.get(t).artistName = i.artist || "", e.get(t).source = i.source || null, e.get(t).isVisible = !0;
    },
    /**
     * Hide results modal
     */
    hide() {
      e.get(t).isVisible = !1;
    },
    /**
     * Clear results and hide modal
     */
    clear() {
      e.set(t, { ...Je }, !0);
    },
    /**
     * Calculate summary from performance data and target notes
     */
    calculateSummary(s, i) {
      if (i.length === 0)
        return { ...Vs };
      let a = 0, r = 0, n = 0, o = 0, d = 0;
      const l = /* @__PURE__ */ new Map();
      i.forEach((T, v) => {
        const p = `target-${v}`, _ = s.get(p), h = T.isGolden === !0, R = T.phraseIndex ?? 0;
        h && n++, l.has(R) || l.set(R, { hit: 0, total: 0, lyrics: [] });
        const N = l.get(R);
        N.total++, T.lyric && N.lyrics.push(T.lyric), (_ == null ? void 0 : _.hitStatus) === "hit" && (a++, N.hit++, h && r++, typeof _.pitchAccuracyCents == "number" && (o += Math.abs(_.pitchAccuracyCents), d++));
      });
      const c = i.length, g = c - a, f = c > 0 ? a / c * 100 : 0, y = d > 0 ? o / d : 0, C = [];
      return l.forEach((T, v) => {
        C.push({
          phraseIndex: v,
          notesHit: T.hit,
          totalNotes: T.total,
          accuracyPercent: T.total > 0 ? T.hit / T.total * 100 : 0,
          lyricPreview: T.lyrics.join("").trim().slice(0, 30) || `Phrase ${v + 1}`
        });
      }), C.sort((T, v) => T.phraseIndex - v.phraseIndex), {
        totalNotes: c,
        notesHit: a,
        notesMissed: g,
        accuracyPercent: f,
        goldenNotesHit: r,
        goldenNotesTotal: n,
        phraseResults: C,
        averagePitchDeviationCents: y
      };
    },
    /**
     * Get letter grade based on accuracy
     */
    getLetterGrade(s) {
      return s >= 95 ? "S" : s >= 90 ? "A" : s >= 80 ? "B" : s >= 70 ? "C" : s >= 60 ? "D" : "F";
    },
    /**
     * Get color for accuracy display
     */
    getAccuracyColor(s) {
      return s >= 90 ? "var(--color-success, #28a745)" : s >= 70 ? "var(--color-warning, #ffc107)" : "var(--color-error, #dc3545)";
    }
  };
}
const le = Ys();
var Bs = e.from_html('<span class="song-artist svelte-10siv4r"> </span>'), zs = e.from_html('<div class="song-info svelte-10siv4r"><span class="song-title svelte-10siv4r"> </span> <!></div>'), Ws = e.from_html('<div class="stat-item missed svelte-10siv4r"><span class="stat-value svelte-10siv4r"> </span> <span class="stat-label svelte-10siv4r">Missed</span></div>'), js = e.from_html('<div class="golden-stats svelte-10siv4r"><span class="golden-icon svelte-10siv4r">⭐</span> <span class="golden-text svelte-10siv4r"> </span></div>'), Xs = e.from_html('<div class="pitch-stats svelte-10siv4r"><span class="pitch-label">Avg. Pitch Deviation:</span> <span class="pitch-value svelte-10siv4r"> </span></div>'), Zs = e.from_html('<div><span class="phrase-lyric svelte-10siv4r"> </span> <span class="phrase-accuracy svelte-10siv4r"> </span></div>'), Ks = e.from_html('<details class="phrase-details svelte-10siv4r"><summary class="phrase-summary svelte-10siv4r">Phrase Breakdown</summary> <div class="phrase-list svelte-10siv4r"></div></details>'), Js = e.from_html('<button class="action-btn retry-btn svelte-10siv4r">Try Again</button>'), Qs = e.from_html('<div class="modal-backdrop svelte-10siv4r" role="dialog" aria-modal="true" aria-labelledby="results-title" tabindex="-1"><div class="modal-content svelte-10siv4r"><div class="modal-header svelte-10siv4r"><h2 id="results-title" class="modal-title svelte-10siv4r">Results</h2> <!></div> <div class="stats-section svelte-10siv4r"><div class="grade-display svelte-10siv4r"><span class="grade-letter svelte-10siv4r"> </span></div> <div class="accuracy-display svelte-10siv4r"><span class="accuracy-value svelte-10siv4r"> </span> <span class="accuracy-label svelte-10siv4r">Accuracy</span></div> <div class="stats-row svelte-10siv4r"><div class="stat-item svelte-10siv4r"><span class="stat-value hit svelte-10siv4r"> </span> <span class="stat-label svelte-10siv4r">Hit</span></div> <div class="stat-divider svelte-10siv4r">/</div> <div class="stat-item svelte-10siv4r"><span class="stat-value total svelte-10siv4r"> </span> <span class="stat-label svelte-10siv4r">Total</span></div> <!></div> <!> <!></div> <!> <div class="modal-actions svelte-10siv4r"><!> <button class="action-btn close-btn svelte-10siv4r">Close</button></div></div></div>');
function ei(t, s) {
  e.push(s, !0);
  const i = e.derived(() => le.state.isVisible), a = e.derived(() => le.state.summary), r = e.derived(() => le.state.songTitle), n = e.derived(() => le.state.artistName), o = e.derived(() => e.get(a) ? le.getLetterGrade(e.get(a).accuracyPercent) : "F"), d = e.derived(() => e.get(a) ? le.getAccuracyColor(e.get(a).accuracyPercent) : "");
  function l() {
    var v;
    le.hide(), (v = s.onClose) == null || v.call(s);
  }
  function c() {
    var v;
    le.hide(), (v = s.onRetry) == null || v.call(s);
  }
  function g(v) {
    v.target === v.currentTarget && l();
  }
  function f(v) {
    v.key === "Escape" && e.get(i) && l();
  }
  var y = e.comment();
  e.event("keydown", e.window, f);
  var C = e.first_child(y);
  {
    var T = (v) => {
      var p = Qs();
      p.__click = g, p.__keydown = f;
      var _ = e.child(p), h = e.child(_), R = e.sibling(e.child(h), 2);
      {
        var N = (x) => {
          var L = zs(), Y = e.child(L), ne = e.child(Y, !0);
          e.reset(Y);
          var K = e.sibling(Y, 2);
          {
            var de = (ve) => {
              var re = Bs(), pe = e.child(re);
              e.reset(re), e.template_effect(() => e.set_text(pe, `by ${e.get(n) ?? ""}`)), e.append(ve, re);
            };
            e.if(K, (ve) => {
              e.get(n) && ve(de);
            });
          }
          e.reset(L), e.template_effect(() => e.set_text(ne, e.get(r))), e.append(x, L);
        };
        e.if(R, (x) => {
          e.get(r) && x(N);
        });
      }
      e.reset(h);
      var W = e.sibling(h, 2), U = e.child(W);
      let w;
      var D = e.child(U), A = e.child(D, !0);
      e.reset(D), e.reset(U);
      var q = e.sibling(U, 2);
      let j;
      var B = e.child(q), X = e.child(B);
      e.reset(B), e.next(2), e.reset(q);
      var G = e.sibling(q, 2), E = e.child(G), H = e.child(E), J = e.child(H, !0);
      e.reset(H), e.next(2), e.reset(E);
      var te = e.sibling(E, 4), ie = e.child(te), ae = e.child(ie, !0);
      e.reset(ie), e.next(2), e.reset(te);
      var ue = e.sibling(te, 2);
      {
        var k = (x) => {
          var L = Ws(), Y = e.child(L), ne = e.child(Y, !0);
          e.reset(Y), e.next(2), e.reset(L), e.template_effect(() => e.set_text(ne, e.get(a).notesMissed)), e.append(x, L);
        };
        e.if(ue, (x) => {
          e.get(a).notesMissed > 0 && x(k);
        });
      }
      e.reset(G);
      var P = e.sibling(G, 2);
      {
        var I = (x) => {
          var L = js(), Y = e.sibling(e.child(L), 2), ne = e.child(Y);
          e.reset(Y), e.reset(L), e.template_effect(() => e.set_text(ne, `Golden Notes: ${e.get(a).goldenNotesHit ?? ""}/${e.get(a).goldenNotesTotal ?? ""}`)), e.append(x, L);
        };
        e.if(P, (x) => {
          e.get(a).goldenNotesTotal > 0 && x(I);
        });
      }
      var m = e.sibling(P, 2);
      {
        var u = (x) => {
          var L = Xs(), Y = e.sibling(e.child(L), 2), ne = e.child(Y);
          e.reset(Y), e.reset(L), e.template_effect((K) => e.set_text(ne, `${K ?? ""} cents`), [() => e.get(a).averagePitchDeviationCents.toFixed(1)]), e.append(x, L);
        };
        e.if(m, (x) => {
          e.get(a).averagePitchDeviationCents > 0 && x(u);
        });
      }
      e.reset(W);
      var S = e.sibling(W, 2);
      {
        var F = (x) => {
          var L = Ks(), Y = e.sibling(e.child(L), 2);
          e.each(Y, 21, () => e.get(a).phraseResults, e.index, (ne, K) => {
            var de = Zs();
            let ve;
            var re = e.child(de), pe = e.child(re, !0);
            e.reset(re);
            var be = e.sibling(re, 2), Te = e.child(be);
            e.reset(be), e.reset(de), e.template_effect(
              (Ie) => {
                ve = e.set_class(de, 1, "phrase-item svelte-10siv4r", null, ve, {
                  perfect: e.get(K).accuracyPercent === 100,
                  good: e.get(K).accuracyPercent >= 70 && e.get(K).accuracyPercent < 100,
                  poor: e.get(K).accuracyPercent < 70
                }), e.set_text(pe, e.get(K).lyricPreview), e.set_text(Te, `${e.get(K).notesHit ?? ""}/${e.get(K).totalNotes ?? ""}
                  (${Ie ?? ""}%)`);
              },
              [() => e.get(K).accuracyPercent.toFixed(0)]
            ), e.append(ne, de);
          }), e.reset(Y), e.reset(L), e.append(x, L);
        };
        e.if(S, (x) => {
          e.get(a).phraseResults.length > 1 && x(F);
        });
      }
      var V = e.sibling(S, 2), se = e.child(V);
      {
        var Q = (x) => {
          var L = Js();
          L.__click = c, e.append(x, L);
        };
        e.if(se, (x) => {
          s.onRetry && x(Q);
        });
      }
      var ee = e.sibling(se, 2);
      ee.__click = l, e.reset(V), e.reset(_), e.reset(p), e.template_effect(
        (x) => {
          w = e.set_style(U, "", w, { "--grade-color": e.get(d) }), e.set_text(A, e.get(o)), j = e.set_style(q, "", j, { color: e.get(d) }), e.set_text(X, `${x ?? ""}%`), e.set_text(J, e.get(a).notesHit), e.set_text(ae, e.get(a).totalNotes);
        },
        [() => e.get(a).accuracyPercent.toFixed(1)]
      ), e.append(v, p);
    };
    e.if(C, (v) => {
      e.get(i) && e.get(a) && v(T);
    });
  }
  e.append(t, y), e.pop();
}
e.delegate(["click", "keydown"]);
const ke = {
  hasImportedSnapshot: !1,
  snapshot: null,
  isLoading: !1,
  error: null,
  transpositionSemitones: 0
};
function ti() {
  let t = e.state(e.proxy({ ...ke }));
  return {
    get state() {
      return e.get(t);
    },
    /**
     * Check for and consume any pending handoff on app initialization.
     * Should be called once when the app loads.
     */
    async checkAndConsumeHandoff() {
      if (!wt())
        return !1;
      e.get(t).isLoading = !0, e.get(t).error = null;
      try {
        const i = await At();
        return i ? i.schemaVersion !== Ve ? (e.get(t).error = `Incompatible snapshot version: ${i.schemaVersion}. Expected: ${Ve}`, e.get(t).isLoading = !1, Se(), !1) : (e.get(t).snapshot = i, e.get(t).hasImportedSnapshot = !0, e.get(t).isLoading = !1, Se(), console.log("[HandoffState] Successfully imported snapshot", {
          voices: i.voices.length,
          microbeatCount: i.timeGrid.microbeatCount,
          tempo: i.tempo
        }), !0) : (e.get(t).error = "Handoff data expired or not found. Please try exporting again.", e.get(t).isLoading = !1, Se(), !1);
      } catch (i) {
        return console.error("[HandoffState] Failed to process handoff", i), e.get(t).error = "Failed to import data from Student Notation.", e.get(t).isLoading = !1, Se(), !1;
      }
    },
    /**
     * Get the imported voices.
     */
    get voices() {
      var s;
      return ((s = e.get(t).snapshot) == null ? void 0 : s.voices) ?? [];
    },
    /**
     * Get the time grid structure.
     */
    get timeGrid() {
      var s;
      return ((s = e.get(t).snapshot) == null ? void 0 : s.timeGrid) ?? null;
    },
    /**
     * Get the tempo (with transposition applied to accompaniment).
     */
    get tempo() {
      var s;
      return ((s = e.get(t).snapshot) == null ? void 0 : s.tempo) ?? 90;
    },
    /**
     * Get the suggested pitch range based on imported notes.
     */
    get suggestedPitchRange() {
      if (!e.get(t).snapshot)
        return null;
      const s = 3, i = e.get(t).snapshot.minMidiPitch, a = e.get(t).snapshot.maxMidiPitch;
      return i === void 0 || a === void 0 ? null : {
        minMidi: Math.max(21, i - s + e.get(t).transpositionSemitones),
        maxMidi: Math.min(108, a + s + e.get(t).transpositionSemitones)
      };
    },
    /**
     * Set transposition in semitones.
     */
    setTransposition(s) {
      e.get(t).transpositionSemitones = s;
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
    getTransposedMidi(s) {
      return s + e.get(t).transpositionSemitones;
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
      const s = {
        ...e.get(t).snapshot,
        sourceApp: "singing-trainer",
        createdAt: Date.now(),
        // Apply transposition to all voices
        voices: e.get(t).snapshot.voices.map((i) => ({
          ...i,
          notes: i.notes.map((a) => ({
            ...a,
            midiPitch: a.midiPitch + e.get(t).transpositionSemitones
          }))
        }))
      };
      try {
        const i = await xt(s);
        console.log("[HandoffState] Handoff slot written for return", i), Mt(i);
      } catch (i) {
        console.error("[HandoffState] Failed to write return handoff", i);
      }
    },
    /**
     * Clear the imported snapshot.
     */
    clearSnapshot() {
      e.set(t, { ...ke }, !0);
    },
    /**
     * Reset the handoff state.
     */
    reset() {
      e.set(t, { ...ke }, !0);
    }
  };
}
const oe = ti();
var si = e.from_html('<div class="handoff-controls svelte-1n46o8q"><div class="transposition-control svelte-1n46o8q"><button class="transpose-btn svelte-1n46o8q" title="Transpose down">-</button> <span class="transposition-label svelte-1n46o8q"> </span> <button class="transpose-btn svelte-1n46o8q" title="Transpose up">+</button></div> <button class="bring-back-btn svelte-1n46o8q">Bring Back to Student Notation</button></div>'), ii = e.from_html('<div class="error-banner svelte-1n46o8q"> </div>'), ai = e.from_html('<div class="import-info svelte-1n46o8q"><span class="import-label svelte-1n46o8q">Microbeats:</span> <span class="import-value svelte-1n46o8q"> </span></div>'), ni = e.from_html('<div class="control-group svelte-1n46o8q"><h3 class="control-group-title svelte-1n46o8q">Imported Material</h3> <div class="import-info svelte-1n46o8q"><span class="import-label svelte-1n46o8q">Voices:</span> <span class="import-value svelte-1n46o8q"> </span></div> <div class="import-info svelte-1n46o8q"><span class="import-label svelte-1n46o8q">Tempo:</span> <span class="import-value svelte-1n46o8q"> </span></div> <!></div>'), ri = e.from_html('<div class="app svelte-1n46o8q"><header class="header svelte-1n46o8q"><h1 class="title svelte-1n46o8q">Singing Trainer</h1> <div class="header-controls svelte-1n46o8q"><!></div></header> <!> <main class="main svelte-1n46o8q"><aside class="sidebar sidebar--left svelte-1n46o8q"><div class="control-group svelte-1n46o8q"><!></div> <div class="control-group svelte-1n46o8q"><!></div> <div class="control-group svelte-1n46o8q"><!></div> <div class="control-group svelte-1n46o8q"><details class="settings-details svelte-1n46o8q"><summary class="settings-summary svelte-1n46o8q">Settings</summary> <div class="settings-content svelte-1n46o8q"><!> <!> <!></div></details></div> <div class="control-group svelte-1n46o8q"><!></div> <!></aside> <section class="canvas-area svelte-1n46o8q"><!></section></main> <!></div>');
function oi(t, s) {
  e.push(s, !0);
  let i = e.state(!1);
  e.derived(() => b.state.isActive), e.user_effect(() => $.onPerformanceComplete((P) => {
    if (b.state.isActive && b.state.isPlaying) {
      const I = le.calculateSummary(P, b.state.targetNotes);
      le.show(I, {
        title: b.title,
        artist: b.artist,
        source: "ultrastar"
      }), b.setPlaying(!1);
    }
  }));
  function a() {
    le.state.source === "ultrastar" ? ($.reset(), $.setTargetNotes(b.state.targetNotes), M.setVisualizationMode("highway")) : le.state.source;
  }
  ot(async () => {
    if (await oe.checkAndConsumeHandoff()) {
      console.log("[App] Handoff detected and processed");
      const P = oe.suggestedPitchRange;
      P && M.setYAxisRange(P);
    }
    try {
      await Ot(), M.setDetecting(!0), console.log("[App] Pitch detection auto-started");
    } catch (P) {
      console.error("[App] Failed to auto-start pitch detection:", P);
    }
  }), Ae(() => {
    $t();
  });
  const r = e.derived(() => oe.state.hasImportedSnapshot), n = e.derived(() => oe.state.transpositionSemitones), o = e.derived(() => oe.state.error);
  function d() {
    oe.bringBackToStudentNotation();
  }
  function l() {
    oe.transposeUp();
  }
  function c() {
    oe.transposeDown();
  }
  var g = ri(), f = e.child(g), y = e.sibling(e.child(f), 2), C = e.child(y);
  {
    var T = (k) => {
      var P = si(), I = e.child(P), m = e.child(I);
      m.__click = c;
      var u = e.sibling(m, 2), S = e.child(u);
      e.reset(u);
      var F = e.sibling(u, 2);
      F.__click = l, e.reset(I);
      var V = e.sibling(I, 2);
      V.__click = d, e.reset(P), e.template_effect(() => e.set_text(S, `${e.get(n) >= 0 ? "+" : ""}${e.get(n) ?? ""}`)), e.append(k, P);
    };
    e.if(C, (k) => {
      e.get(r) && k(T);
    });
  }
  e.reset(y), e.reset(f);
  var v = e.sibling(f, 2);
  {
    var p = (k) => {
      var P = ii(), I = e.child(P, !0);
      e.reset(P), e.template_effect(() => e.set_text(I, e.get(o))), e.append(k, P);
    };
    e.if(v, (k) => {
      e.get(o) && k(p);
    });
  }
  var _ = e.sibling(v, 2), h = e.child(_), R = e.child(h), N = e.child(R);
  Us(N, {}), e.reset(R);
  var W = e.sibling(R, 2), U = e.child(W);
  ns(U, {}), e.reset(W);
  var w = e.sibling(W, 2), D = e.child(w);
  Os(D, {}), e.reset(w);
  var A = e.sibling(w, 2), q = e.child(A), j = e.sibling(e.child(q), 2), B = e.child(j);
  zt(B, {});
  var X = e.sibling(B, 2);
  Xt(X, {});
  var G = e.sibling(X, 2);
  Qt(G, {}), e.reset(j), e.reset(q), e.reset(A);
  var E = e.sibling(A, 2), H = e.child(E);
  Kt(H, {}), e.reset(E);
  var J = e.sibling(E, 2);
  {
    var te = (k) => {
      var P = ni(), I = e.sibling(e.child(P), 2), m = e.sibling(e.child(I), 2), u = e.child(m, !0);
      e.reset(m), e.reset(I);
      var S = e.sibling(I, 2), F = e.sibling(e.child(S), 2), V = e.child(F);
      e.reset(F), e.reset(S);
      var se = e.sibling(S, 2);
      {
        var Q = (ee) => {
          var x = ai(), L = e.sibling(e.child(x), 2), Y = e.child(L, !0);
          e.reset(L), e.reset(x), e.template_effect(() => e.set_text(Y, oe.timeGrid.microbeatCount)), e.append(ee, x);
        };
        e.if(se, (ee) => {
          oe.timeGrid && ee(Q);
        });
      }
      e.reset(P), e.template_effect(() => {
        e.set_text(u, oe.voices.length), e.set_text(V, `${oe.tempo ?? ""} BPM`);
      }), e.append(k, P);
    };
    e.if(J, (k) => {
      e.get(r) && k(te);
    });
  }
  e.reset(h);
  var ie = e.sibling(h, 2), ae = e.child(ie);
  Dt(ae, {}), e.reset(ie), e.reset(_);
  var ue = e.sibling(_, 2);
  ei(ue, { onRetry: a }), e.reset(g), e.bind_property("open", "toggle", q, (k) => e.set(i, k), () => e.get(i)), e.append(t, g), e.pop();
}
e.delegate(["click"]);
function li(t) {
  const s = lt(oi, { target: t });
  return {
    destroy: () => ct(s)
  };
}
const _i = li;
export {
  li as default,
  _i as mount,
  li as mountSingingTrainer
};
//# sourceMappingURL=index.js.map
