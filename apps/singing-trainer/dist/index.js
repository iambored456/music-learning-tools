var Xe = Object.defineProperty;
var Ye = (t, s, i) => s in t ? Xe(t, s, { enumerable: !0, configurable: !0, writable: !0, value: i }) : t[s] = i;
var ne = (t, s, i) => Ye(t, typeof s != "symbol" ? s + "" : s, i);
import { onDestroy as Me, onMount as Ze, mount as Ke, unmount as Je } from "svelte";
import "svelte/internal/disclose-version";
import * as e from "svelte/internal/client";
import { calculateViewportWindow as Qe, PitchGrid as et, createTimeCoordinates as tt, drawUserPitchTrace as st } from "@mlt/ui-components/canvas";
import { generateRowDataForMidiRange as it, getTonicPitchClass as nt, fullRowData as Ie, getPitchByMidi as at } from "@mlt/pitch-data";
import { createNoteHighwayService as rt } from "@mlt/student-notation-engine";
import * as F from "tone";
import { PitchDetector as ot } from "pitchy";
import { getNearestMidi as lt, getCentsOffset as ct, midiToPitchClass as gt } from "@mlt/pitch-utils";
import { DualPitchWheel as dt } from "@mlt/ui-components/pitch-wheels";
import { writeHandoffSlot as ut, navigateToStudentNotation as ht, checkForHandoff as pt, consumeHandoffSlot as vt, clearHandoffParams as pe, SNAPSHOT_SCHEMA_VERSION as Ne } from "@mlt/handoff";
const Le = {
  isDetecting: !1,
  visualizationMode: "highway",
  tonic: "C",
  useDegrees: !1,
  showAccidentals: !0,
  pitchHighlightEnabled: !0,
  yAxisRange: { minMidi: 48, maxMidi: 72 },
  drone: { isPlaying: !1, octave: 3, volume: -12 }
};
function ft() {
  let t = e.state(e.proxy({ ...Le }));
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
      e.set(t, { ...Le }, !0);
    }
  };
}
const h = ft(), mt = 200, Ee = {
  currentPitch: null,
  history: [],
  stablePitch: { pitchClass: null, opacity: 0, size: 1 }
};
function _t() {
  let t = e.state(e.proxy({ ...Ee }));
  return {
    get state() {
      return e.get(t);
    },
    setCurrentPitch(s) {
      e.get(t).currentPitch = s;
    },
    addHistoryPoint(s) {
      e.get(t).history.push(s), e.get(t).history.length > mt && e.get(t).history.shift();
    },
    setStablePitch(s) {
      e.get(t).stablePitch = s;
    },
    clearHistory() {
      e.get(t).history = [];
    },
    reset() {
      e.set(t, { ...Ee }, !0);
    }
  };
}
const _ = _t(), qe = {
  isPlaying: !1,
  startTime: null,
  currentTimeMs: 0,
  targetNotes: [],
  nowLineX: 100,
  pixelsPerSecond: 200,
  timeWindowMs: 4e3
};
function yt() {
  let t = e.state(e.proxy({ ...qe })), s = null, i = null;
  function n(l) {
    return l.map((r, c) => ({
      id: `target-${c}`,
      midi: r.midi,
      startTimeMs: r.startTimeMs,
      durationMs: r.durationMs,
      startColumn: 0,
      // Not used in target notes mode
      endColumn: 0,
      // Not used in target notes mode
      color: "#3b82f6",
      shape: "oval",
      globalRow: 0
    }));
  }
  function a() {
    if (!s) return;
    const l = s.getState();
    e.get(t).isPlaying = l.isPlaying && !l.isPaused, e.get(t).currentTimeMs = l.currentTimeMs;
    const r = s.getPerformanceResults();
    e.get(t).targetNotes = e.get(t).targetNotes.map((c, p) => {
      const v = `target-${p}`, f = r.get(v);
      return { ...c, hit: (f == null ? void 0 : f.hitStatus) === "hit" };
    });
  }
  function o() {
    e.get(t).isPlaying && s ? (a(), i = requestAnimationFrame(o)) : i = null;
  }
  function g() {
    s && s.dispose(), s = rt({
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
        emit: (r, c) => {
          if (console.debug("[Highway]", r, c), r === "noteHit") {
            const p = c;
            console.log(`[Highway] Note HIT: ${p.noteId}, accuracy: ${p.performance.accuracyTier || "unknown"}`);
          } else r === "noteMissed" ? console.log(`[Highway] Note MISSED: ${c.noteId}`) : r === "onrampComplete" ? console.log("[Highway] Onramp complete, playback starting!") : r === "performanceComplete" && console.log("[Highway] Performance complete!");
        }
      }
    });
    const l = n(e.get(t).targetNotes);
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
      !s && e.get(t).targetNotes.length > 0 && g(), s && (s.start(), e.get(t).isPlaying = !0, e.get(t).startTime = performance.now(), e.get(t).currentTimeMs = 0, o());
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
        const r = n(l);
        s.init(r);
      }
    },
    markNoteHit(l) {
      l >= 0 && l < e.get(t).targetNotes.length && (e.get(t).targetNotes = e.get(t).targetNotes.map((r, c) => c === l ? { ...r, hit: !0 } : r));
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
    recordPitchInput(l, r) {
      s && e.get(t).isPlaying && s.recordPitchInput(l, r, "microphone");
    },
    getPerformanceResults() {
      return (s == null ? void 0 : s.getPerformanceResults()) ?? /* @__PURE__ */ new Map();
    },
    reset() {
      i !== null && (cancelAnimationFrame(i), i = null), s && (s.dispose(), s = null), e.set(t, { ...qe }, !0);
    }
  };
}
const W = yt(), bt = {
  numLoops: 5,
  minMidi: 48,
  maxMidi: 72,
  tempo: 108,
  referenceVolume: -12
}, Fe = {
  isActive: !1,
  isPlaying: !1,
  config: { ...bt },
  currentLoop: 0,
  currentPhase: "reference",
  currentPitch: null,
  generatedNotes: [],
  results: []
};
function xt(t, s) {
  return Math.floor(Math.random() * (s - t + 1)) + t;
}
function $e(t) {
  return 60 / t * 1e3 / 2;
}
function Pt() {
  let t = e.state(e.proxy({ ...Fe }));
  function s(n) {
    const a = [], o = $e(n.tempo), g = 2e3;
    for (let l = 0; l < n.numLoops; l++) {
      const r = xt(n.minMidi, n.maxMidi), c = g + l * 32 * o;
      a.push({
        midi: r,
        startTimeMs: c,
        durationMs: 8 * o,
        lyric: "👂"
      }), a.push({
        midi: r,
        startTimeMs: c + 16 * o,
        durationMs: 8 * o,
        lyric: "🎤"
      });
    }
    return a;
  }
  function i(n, a) {
    const o = $e(a), g = 32 * o, r = n - 2e3;
    if (r < 0)
      return { loop: 0, phase: "rest2" };
    const c = Math.floor(r / g), p = r % g, v = Math.floor(p / o);
    let f;
    return v < 8 ? f = "reference" : v < 16 ? f = "rest1" : v < 24 ? f = "input" : f = "rest2", { loop: c, phase: f };
  }
  return {
    get state() {
      return e.get(t);
    },
    /**
     * Update exercise configuration
     */
    configure(n) {
      e.get(t).config = { ...e.get(t).config, ...n };
    },
    /**
     * Set pitch range from current Y-axis range
     */
    setPitchRange(n, a) {
      e.get(t).config.minMidi = n, e.get(t).config.maxMidi = a;
    },
    /**
     * Start the demo exercise
     */
    start() {
      const n = s(e.get(t).config);
      e.get(t).generatedNotes = n, e.get(t).isActive = !0, e.get(t).isPlaying = !1, e.get(t).currentLoop = 0, e.get(t).currentPhase = "reference", e.get(t).currentPitch = n.length > 0 ? n[0].midi : null, e.get(t).results = [];
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
    setPlaying(n) {
      e.get(t).isPlaying = n;
    },
    /**
     * Update current phase based on time
     */
    updatePhase(n) {
      const { loop: a, phase: o } = i(n, e.get(t).config.tempo);
      e.get(t).currentLoop = a, e.get(t).currentPhase = o;
      const g = a * 2;
      g < e.get(t).generatedNotes.length && (e.get(t).currentPitch = e.get(t).generatedNotes[g].midi);
    },
    /**
     * Add a performance result for a completed loop
     */
    addResult(n) {
      e.get(t).results.push(n);
    },
    /**
     * Check if we already have a result for a specific loop
     */
    hasResultForLoop(n) {
      return e.get(t).results.some((a) => a.loopIndex === n);
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
      return e.get(t).results.length === 0 ? 0 : e.get(t).results.reduce((a, o) => a + o.accuracy, 0) / e.get(t).results.length;
    },
    /**
     * Count hits
     */
    getHitCount() {
      return e.get(t).results.filter((n) => {
        var a;
        return ((a = n.performance) == null ? void 0 : a.hitStatus) === "hit";
      }).length;
    },
    /**
     * Reset to default state
     */
    reset() {
      e.set(t, { ...Fe, config: { ...e.get(t).config } }, !0);
    }
  };
}
const w = Pt();
var Tt = e.from_html('<div class="singing-canvas-container svelte-15ar5r5"><!> <canvas class="pitch-trail-canvas svelte-15ar5r5"></canvas></div>');
function Mt(t, s) {
  e.push(s, !0);
  let i = e.state(void 0), n = e.state(800), a = e.state(400), o = e.state(void 0), g = e.state(null), l = e.state(null), r = 0, c = 0, p = 0;
  const v = 20, f = !0, U = !1, E = 3, $ = e.derived(() => v * E), C = e.derived(() => e.get($) * 2), T = e.derived(() => e.get(C) * 2), m = e.derived(() => Math.max(0, e.get(n) - e.get(T))), D = e.derived(() => e.get(C)), N = () => {
    try {
      return !!globalThis.__ST_DEBUG_TRAIL;
    } catch {
      return !1;
    }
  }, j = e.derived(() => it(h.state.yAxisRange.minMidi, h.state.yAxisRange.maxMidi)), H = e.derived(() => Qe({
    containerHeight: e.get(a),
    fullRowData: e.get(j),
    preferredCellHeight: 40,
    minCellHeight: 20
  })), x = e.derived(() => h.state.visualizationMode === "highway" ? "highway" : "singing"), Q = e.derived(() => 60 / w.state.config.tempo * 1e3), X = 2e3, Y = e.derived(() => (() => {
    if (!h.state.pitchHighlightEnabled)
      return;
    const u = _.state.stablePitch;
    if (!(u.pitchClass === null || u.opacity <= 0.01))
      return {
        pitchClass: u.pitchClass,
        opacity: u.opacity,
        color: "#ffff00"
      };
  })());
  function ee() {
    return W.state.targetNotes.map((u, M) => ({
      id: `target-${M}`,
      midi: u.midi,
      startTimeMs: u.startTimeMs,
      durationMs: u.durationMs,
      label: u.lyric
      // Pass emoji as label
    }));
  }
  const k = e.derived(() => ({
    timeWindowMs: 4e3,
    pixelsPerSecond: 200,
    circleRadius: 9.5,
    proximityThreshold: 35,
    maxConnections: 3,
    connectorLineWidth: 2.5,
    connectorColor: "rgba(0,0,0,0.4)",
    useTonicRelativeColors: !0,
    tonicPitchClass: nt(h.state.tonic),
    clarityThreshold: 0.5,
    maxOpacity: 0.9
  })), Z = e.derived(() => e.get(x) === "singing" ? {
    userPitch: _.state.currentPitch ? {
      frequency: _.state.currentPitch.frequency,
      midi: _.state.currentPitch.midi,
      clarity: _.state.currentPitch.clarity,
      pitchClass: _.state.currentPitch.pitchClass
    } : null,
    pitchHistory: [],
    targetNotes: [],
    pixelsPerSecond: 200,
    timeWindowMs: 4e3,
    trailConfig: e.get(k)
  } : void 0), L = e.derived(() => e.get(x) === "highway" ? {
    userPitch: _.state.currentPitch ? {
      frequency: _.state.currentPitch.frequency,
      midi: _.state.currentPitch.midi,
      clarity: _.state.currentPitch.clarity,
      pitchClass: _.state.currentPitch.pitchClass
    } : null,
    pitchHistory: [],
    targetNotes: ee(),
    nowLineX: W.state.nowLineX,
    pixelsPerSecond: W.state.pixelsPerSecond,
    currentTimeMs: W.state.currentTimeMs,
    timeWindowMs: W.state.timeWindowMs,
    trailConfig: e.get(k)
  } : void 0), te = e.derived(() => ({
    startRow: e.get(H).startRow,
    endRow: e.get(H).endRow,
    zoomLevel: 1,
    containerWidth: e.get(n),
    containerHeight: e.get(a)
  }));
  function se() {
    if (!e.get(o)) return;
    const u = window.devicePixelRatio || 1;
    e.get(o).width = e.get(m) * u, e.get(o).height = e.get(a) * u, e.get(o).style.width = `${e.get(m)}px`, e.get(o).style.height = `${e.get(a)}px`, e.get(o).style.left = `${e.get(D)}px`;
    const M = e.get(o).getContext("2d");
    if (!M) {
      e.set(g, null);
      return;
    }
    M.setTransform(u, 0, 0, u, 0, 0), e.set(g, M, !0);
  }
  function ie() {
    if (!e.get(g) || e.get(m) <= 0) return;
    e.get(g).clearRect(0, 0, e.get(m), e.get(a));
    const u = _.state.history;
    if (u.length === 0) return;
    const M = e.get(x) === "singing" ? e.get(Z) : e.get(L);
    if (!M) return;
    const O = N(), d = O ? performance.now() : 0, b = e.get(x) === "highway" && e.get(L) ? e.get(L).nowLineX : 100, A = tt({
      cellWidth: v,
      cellHeight: e.get(H).cellHeight,
      viewport: e.get(te),
      pixelsPerSecond: M.pixelsPerSecond ?? 200,
      nowLineX: b,
      currentTimeMs: e.get(x) === "highway" && e.get(L) ? e.get(L).currentTimeMs : 0
    }), R = {
      cellHeight: e.get(H).cellHeight,
      viewportWidth: e.get(m),
      nowLineX: b,
      pixelsPerSecond: M.pixelsPerSecond ?? 200,
      timeWindowMs: M.timeWindowMs ?? 4e3,
      colorMode: "color",
      trailConfig: e.get(k)
    }, G = performance.now();
    if (st(e.get(g), A, u, G, R, e.get(j)), O) {
      const I = performance.now();
      if (c += 1, p += I - d, I - r >= 1e3) {
        const K = c > 0 ? p / c : 0;
        console.log(`[SingingTrail] points=${u.length} avgMs=${K.toFixed(2)} gridWidth=${e.get(m)}`), r = I, c = 0, p = 0;
      }
    }
  }
  function P() {
    if (e.get(l)) return;
    const u = () => {
      ie(), e.set(l, requestAnimationFrame(u), !0);
    };
    e.set(l, requestAnimationFrame(u), !0);
  }
  function y() {
    e.get(l) && (cancelAnimationFrame(e.get(l)), e.set(l, null)), e.get(g) && e.get(m) > 0 && e.get(g).clearRect(0, 0, e.get(m), e.get(a));
  }
  e.user_effect(() => {
    if (!e.get(i)) return;
    const u = new ResizeObserver((M) => {
      for (const O of M)
        e.set(n, O.contentRect.width, !0), e.set(a, O.contentRect.height, !0);
    });
    return u.observe(e.get(i)), () => {
      u.disconnect();
    };
  }), e.user_effect(() => {
    e.get(m), e.get(a), e.get(D), e.get(o), se();
  }), e.user_effect(() => {
    e.get(x), e.get(g), e.get(x) === "singing" || e.get(x) === "highway" ? P() : y();
  }), Me(() => {
    y();
  });
  var S = Tt(), z = e.child(S);
  et(z, {
    get mode() {
      return e.get(x);
    },
    get fullRowData() {
      return e.get(j);
    },
    get viewport() {
      return e.get(te);
    },
    cellWidth: v,
    get cellHeight() {
      return e.get(H).cellHeight;
    },
    colorMode: "color",
    showOctaveLabels: f,
    showFrequencyLabels: U,
    get singingConfig() {
      return e.get(Z);
    },
    get highwayConfig() {
      return e.get(L);
    },
    get legendHighlight() {
      return e.get(Y);
    },
    get beatIntervalMs() {
      return e.get(Q);
    },
    beatTimeOffsetMs: X
  });
  var B = e.sibling(z, 2);
  e.bind_this(B, (u) => e.set(o, u), () => e.get(o)), e.reset(S), e.bind_this(S, (u) => e.set(i, u), () => e.get(i)), e.append(t, S), e.pop();
}
class wt {
  constructor() {
    ne(this, "synth", null);
    ne(this, "scheduledTimeouts", []);
    // Store timeout IDs for cleanup
    ne(this, "volume", null);
    ne(this, "startTime", 0);
    // Performance.now() when playback started
    ne(this, "_isPlaying", !1);
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
    await F.start(), this.volume = new F.Volume(-12).toDestination(), this.synth = new F.Synth({
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
      const n = i.durationMs / 1e3, a = F.Frequency(i.midi, "midi").toFrequency(), o = window.setTimeout(() => {
        this.synth && (console.log(`[ReferenceAudio] Playing ${i.midi} at ${performance.now() - this.startTime}ms`), this._isPlaying = !0, this.synth.triggerAttackRelease(a, n));
      }, i.startTimeMs), g = window.setTimeout(() => {
        this._isPlaying = !1;
      }, i.startTimeMs + i.durationMs);
      this.scheduledTimeouts.push(o, g);
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
    const n = F.Frequency(s, "midi").toFrequency(), a = i / 1e3;
    this.synth.triggerAttackRelease(n, a);
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
const le = new wt(), ae = {
  FFT_SIZE: 2048,
  CLARITY_THRESHOLD: 0.8,
  MIN_PITCH_HZ: 60,
  MAX_PITCH_HZ: 1600,
  HIGHLIGHT_CENTS_RANGE: 50
};
let re = null, oe = null, ve = null, J = null, fe = !1;
const xe = 1;
function St(t) {
  return 12 * Math.log2(t / 440) + 69;
}
function Pe() {
  if (!fe || !oe || !ve) {
    J = null;
    return;
  }
  if (le.isPlaying) {
    _.addHistoryPoint({
      frequency: 0,
      midi: 0,
      time: performance.now(),
      clarity: 0
    }), J = requestAnimationFrame(Pe);
    return;
  }
  const t = oe.getValue(), [s, i] = ve.findPitch(t, F.getContext().sampleRate), n = s !== null && i > ae.CLARITY_THRESHOLD && s > ae.MIN_PITCH_HZ && s < ae.MAX_PITCH_HZ;
  if (n) {
    const a = St(s), o = {
      frequency: s,
      midi: a,
      clarity: i,
      pitchClass: Math.round(a) % 12
    };
    _.setCurrentPitch(o), _.addHistoryPoint({
      frequency: s,
      midi: a,
      time: performance.now(),
      clarity: i
    }), W.recordPitchInput(a, i);
  } else
    _.addHistoryPoint({
      frequency: 0,
      midi: 0,
      time: performance.now(),
      clarity: 0
    });
  if (n && _.state.currentPitch) {
    const a = _.state.currentPitch.midi, o = lt(a), g = ct(a), l = Math.min(Math.abs(g), ae.HIGHLIGHT_CENTS_RANGE), r = Math.max(0, 1 - l / ae.HIGHLIGHT_CENTS_RANGE);
    _.setStablePitch({
      pitchClass: gt(o),
      opacity: r,
      size: xe
    });
  } else
    _.setStablePitch({ pitchClass: null, opacity: 0, size: xe });
  J = requestAnimationFrame(Pe);
}
async function At() {
  if (!fe) {
    J !== null && cancelAnimationFrame(J), re = new F.UserMedia(), oe = new F.Analyser("waveform", ae.FFT_SIZE), ve = ot.forFloat32Array(oe.size);
    try {
      await F.start(), await re.open(), re.connect(oe), fe = !0, Pe();
    } catch (t) {
      throw console.error("Microphone access denied or failed:", t), ke(), t;
    }
  }
}
function Ct() {
  fe = !1, ke();
}
function ke() {
  J !== null && (cancelAnimationFrame(J), J = null), re && (re.close(), re = null), oe = null, ve = null, _.setStablePitch({ pitchClass: null, opacity: 0, size: xe }), _.setCurrentPitch(null);
}
e.from_html('<span class="spinner svelte-cytsjj"></span> Starting...', 1);
e.from_html('<span class="icon svelte-cytsjj">&#9632;</span> Stop', 1);
e.from_html('<span class="icon svelte-cytsjj">&#9654;</span> Start', 1);
e.from_html("<button><!></button>");
e.delegate(["click"]);
let V = null, ce = !1, ge = null;
function Rt() {
  var t;
  if (!V) {
    V = new F.PolySynth(F.Synth, {
      oscillator: { type: "sawtooth" },
      envelope: {
        attack: 0.3,
        decay: 0.1,
        sustain: 0.8,
        release: 0.5
      }
    }).toDestination();
    const s = ((t = V.get().oscillator) == null ? void 0 : t.type) ?? "unknown";
    console.log("[DroneAudio] Initialized drone synth", { oscillatorType: s });
  }
  return V;
}
function Oe(t, s) {
  return `${t.replace("b", "#").replace("Db", "C#").replace("Eb", "D#").replace("Gb", "F#").replace("Ab", "G#").replace("Bb", "A#")}${s}`;
}
async function Ht() {
  await F.start();
  const t = Rt(), s = Oe(h.state.tonic, h.state.drone.octave);
  t.volume.value = h.state.drone.volume, console.log("[DroneAudio] Starting drone", {
    note: s,
    volume: t.volume.value
  }), ge && t.releaseAll(), ge = s, t.triggerAttack(s), ce = !0;
}
function Dt() {
  V && ce && (V.releaseAll(), ge = null, ce = !1);
}
function Te() {
  if (!ce || !V) return;
  const t = Oe(h.state.tonic, h.state.drone.octave);
  V.volume.value = h.state.drone.volume, console.log("[DroneAudio] Updating drone", {
    note: t,
    volume: V.volume.value
  }), t !== ge && (V.releaseAll(), V.triggerAttack(t), ge = t);
}
async function It() {
  ce ? Dt() : await Ht();
}
var Nt = e.from_html("<option> </option>"), Lt = e.from_html('<div class="tonic-selector svelte-16h7our"><label for="tonic-select" class="svelte-16h7our">Key:</label> <select id="tonic-select" class="svelte-16h7our"></select></div>');
function Et(t, s) {
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
  function n(l) {
    const r = l.target;
    h.setTonic(r.value), Te();
  }
  var a = Lt(), o = e.sibling(e.child(a), 2);
  o.__change = n, e.each(o, 21, () => i, e.index, (l, r) => {
    var c = Nt(), p = e.child(c, !0);
    e.reset(c);
    var v = {};
    e.template_effect(() => {
      e.set_text(p, e.get(r)), v !== (v = e.get(r)) && (c.value = (c.__value = e.get(r)) ?? "");
    }), e.append(l, c);
  }), e.reset(o);
  var g;
  e.init_select(o), e.reset(a), e.template_effect(() => {
    g !== (g = h.state.tonic) && (o.value = (o.__value = h.state.tonic) ?? "", e.select_option(o, h.state.tonic));
  }), e.append(t, a), e.pop();
}
e.delegate(["change"]);
var qt = e.from_html("<option> </option>"), Ft = e.from_html('<div class="drone-controls svelte-1rkr6nv"><button> </button> <div class="drone-settings svelte-1rkr6nv"><label class="svelte-1rkr6nv">Oct: <select class="svelte-1rkr6nv"></select></label> <label class="svelte-1rkr6nv">Vol: <input type="range" min="-40" max="0" class="svelte-1rkr6nv"/></label></div></div>');
function $t(t, s) {
  e.push(s, !0);
  const i = [2, 3, 4, 5];
  async function n() {
    await It(), h.toggleDrone();
  }
  function a(C) {
    const T = C.target;
    h.setDroneOctave(parseInt(T.value, 10)), Te();
  }
  function o(C) {
    const T = C.target;
    h.setDroneVolume(parseInt(T.value, 10)), Te();
  }
  var g = Ft(), l = e.child(g);
  let r;
  l.__click = n;
  var c = e.child(l, !0);
  e.reset(l);
  var p = e.sibling(l, 2), v = e.child(p), f = e.sibling(e.child(v));
  f.__change = a, e.each(f, 21, () => i, e.index, (C, T) => {
    var m = qt(), D = e.child(m, !0);
    e.reset(m);
    var N = {};
    e.template_effect(() => {
      e.set_text(D, e.get(T)), N !== (N = e.get(T)) && (m.value = (m.__value = e.get(T)) ?? "");
    }), e.append(C, m);
  }), e.reset(f);
  var U;
  e.init_select(f), e.reset(v);
  var E = e.sibling(v, 2), $ = e.sibling(e.child(E));
  e.remove_input_defaults($), $.__input = o, e.reset(E), e.reset(p), e.reset(g), e.template_effect(() => {
    r = e.set_class(l, 1, "drone-toggle svelte-1rkr6nv", null, r, { active: h.state.drone.isPlaying }), e.set_text(c, h.state.drone.isPlaying ? "Drone On" : "Drone Off"), U !== (U = h.state.drone.octave) && (f.value = (f.__value = h.state.drone.octave) ?? "", e.select_option(f, h.state.drone.octave)), e.set_value($, h.state.drone.volume);
  }), e.append(t, g), e.pop();
}
e.delegate(["click", "change", "input"]);
e.from_html("<button> </button>");
e.from_html('<div class="mode-toggle svelte-i9tkj4"></div>');
e.delegate(["click"]);
var kt = e.from_html('<div class="range-control svelte-1es7ond"><h3 class="control-title svelte-1es7ond">Pitch Range</h3> <!></div>');
function Ot(t, s) {
  e.push(s, !0);
  function i(r) {
    const c = Ie.findIndex((p) => p.midi === r);
    return c >= 0 ? c : 0;
  }
  const n = e.derived(() => i(h.state.yAxisRange.maxMidi)), a = e.derived(() => i(h.state.yAxisRange.minMidi));
  function o(r) {
    const c = r.bottomPitch.midi ?? 21, p = r.topPitch.midi ?? 108;
    h.setYAxisRange({ minMidi: c, maxMidi: p });
  }
  var g = kt(), l = e.sibling(e.child(g), 2);
  dt(l, {
    get fullRowData() {
      return Ie;
    },
    get topIndex() {
      return e.get(n);
    },
    get bottomIndex() {
      return e.get(a);
    },
    minSpan: 7,
    onrangechange: o,
    showSummary: !0,
    wheelHeight: 200
  }), e.reset(g), e.append(t, g), e.pop();
}
var Gt = e.from_html('<div class="pitch-highlight-toggle svelte-e7pwl1"><span class="toggle-label svelte-e7pwl1">Pitch Highlight</span> <button> </button></div>');
function Wt(t, s) {
  e.push(s, !0);
  function i() {
    h.togglePitchHighlight();
  }
  var n = Gt(), a = e.sibling(e.child(n), 2);
  let o;
  a.__click = i;
  var g = e.child(a, !0);
  e.reset(a), e.reset(n), e.template_effect(() => {
    o = e.set_class(a, 1, "toggle-button svelte-e7pwl1", null, o, { active: h.state.pitchHighlightEnabled }), e.set_text(g, h.state.pitchHighlightEnabled ? "On" : "Off");
  }), e.append(t, n), e.pop();
}
e.delegate(["click"]);
var Vt = e.from_html('<button class="start-exercise-btn svelte-118f0cc">Start Demo Exercise</button>'), Ut = e.from_html('<button class="stop-exercise-btn svelte-118f0cc">Stop Exercise</button> <div class="progress-indicator svelte-118f0cc"> </div> <div class="phase-indicator svelte-118f0cc"> </div>', 1), zt = e.from_html('<div><span class="result-loop svelte-118f0cc"></span> <span class="result-pitch svelte-118f0cc"> </span> <span class="result-accuracy svelte-118f0cc"> </span> <span class="result-status svelte-118f0cc"> </span></div>'), jt = e.from_html('<div class="exercise-results svelte-118f0cc"><h4 class="results-title svelte-118f0cc">Results</h4> <div class="results-summary svelte-118f0cc"><div class="stat svelte-118f0cc"><span class="stat-label svelte-118f0cc">Average Accuracy:</span> <span class="stat-value svelte-118f0cc"> </span></div> <div class="stat svelte-118f0cc"><span class="stat-label svelte-118f0cc">Hits:</span> <span class="stat-value svelte-118f0cc"> </span></div></div> <details class="results-details svelte-118f0cc"><summary class="results-summary-label svelte-118f0cc">Detailed Results</summary> <div class="results-list svelte-118f0cc"></div></details></div>'), Bt = e.from_html('<div class="demo-exercise-panel svelte-118f0cc"><h3 class="panel-title svelte-118f0cc">Demo Exercise</h3> <details class="settings-details svelte-118f0cc"><summary class="settings-summary svelte-118f0cc">Settings</summary> <div class="exercise-settings svelte-118f0cc"><label class="setting-label svelte-118f0cc"><span class="label-text svelte-118f0cc">Number of loops:</span> <input class="setting-input svelte-118f0cc" type="number" min="1" max="20"/></label> <label class="setting-label svelte-118f0cc"><span class="label-text svelte-118f0cc">Tempo (BPM):</span> <input class="setting-input svelte-118f0cc" type="number" min="60" max="180"/></label> <label class="setting-label svelte-118f0cc"><span class="label-text svelte-118f0cc">Reference Volume:</span> <input class="setting-slider svelte-118f0cc" type="range" min="-40" max="0"/> <span class="volume-value svelte-118f0cc"> </span></label> <div class="pitch-range-buttons svelte-118f0cc"><button class="range-btn svelte-118f0cc">Use Current Range</button> <button class="range-btn svelte-118f0cc">Use Full Range</button></div></div></details> <div class="exercise-controls svelte-118f0cc"><!></div> <!></div>');
function Xt(t, s) {
  e.push(s, !0);
  let i = e.state(!1), n = e.state(5), a = e.state(108), o = e.state(-12);
  const g = e.derived(() => w.state.isActive), l = e.derived(() => w.state.isPlaying), r = e.derived(() => w.state.currentPhase), c = e.derived(() => w.getCurrentProgress()), p = e.derived(() => w.getResults()), v = e.derived(() => e.get(p).length > 0), f = e.derived(() => w.getAverageAccuracy()), U = e.derived(() => w.getHitCount()), E = e.derived(() => e.get(p).length);
  e.user_effect(() => {
    if (!e.get(g) || !e.get(l)) return;
    const d = W.state.currentTimeMs;
    w.updatePhase(d);
  }), e.user_effect(() => {
    if (!e.get(g)) return;
    const d = W.getPerformanceResults();
    w.getGeneratedNotes().forEach((A, R) => {
      if (A.lyric !== "🎤") return;
      const G = `target-${R}`, I = d.get(G);
      if (I && !w.hasResultForLoop(Math.floor(R / 2))) {
        const K = $(I);
        w.addResult({
          loopIndex: Math.floor(R / 2),
          targetPitch: A.midi,
          accuracy: K,
          performance: I
        });
      }
    });
  });
  function $(d) {
    return d.hitStatus === "hit" ? d.pitchAccuracyCents !== void 0 ? Math.max(0, 100 - Math.abs(d.pitchAccuracyCents) / 50 * 100) : 100 : 0;
  }
  Me(() => {
    e.get(g) && D();
  });
  function C() {
    const d = h.state.yAxisRange;
    w.setPitchRange(d.minMidi, d.maxMidi);
  }
  function T() {
    w.setPitchRange(21, 108);
  }
  async function m() {
    h.setVisualizationMode("highway"), w.configure({
      numLoops: e.get(n),
      tempo: e.get(a),
      referenceVolume: e.get(o)
    }), C(), await le.init(), le.setVolume(e.get(o)), w.start();
    const d = w.getGeneratedNotes();
    W.setTargetNotes(d), W.start(), w.setPlaying(!0);
    const b = d.filter((A) => A.lyric === "👂");
    le.scheduleReferenceTones(b);
  }
  function D() {
    le.stop(), W.stop(), w.stop();
  }
  function N(d) {
    switch (d) {
      case "reference":
        return "👂 Listen";
      case "input":
        return "🎤 Sing";
      default:
        return "Rest";
    }
  }
  function j(d) {
    const b = at(d);
    return (b == null ? void 0 : b.combined) || `MIDI ${d}`;
  }
  var H = Bt(), x = e.sibling(e.child(H), 2), Q = e.sibling(e.child(x), 2), X = e.child(Q), Y = e.sibling(e.child(X), 2);
  e.remove_input_defaults(Y), e.reset(X);
  var ee = e.sibling(X, 2), k = e.sibling(e.child(ee), 2);
  e.remove_input_defaults(k), e.reset(ee);
  var Z = e.sibling(ee, 2), L = e.sibling(e.child(Z), 2);
  e.remove_input_defaults(L);
  var te = e.sibling(L, 2), se = e.child(te);
  e.reset(te), e.reset(Z);
  var ie = e.sibling(Z, 2), P = e.child(ie);
  P.__click = C;
  var y = e.sibling(P, 2);
  y.__click = T, e.reset(ie), e.reset(Q), e.reset(x);
  var S = e.sibling(x, 2), z = e.child(S);
  {
    var B = (d) => {
      var b = Vt();
      b.__click = m, e.append(d, b);
    }, u = (d) => {
      var b = Ut(), A = e.first_child(b);
      A.__click = D;
      var R = e.sibling(A, 2), G = e.child(R);
      e.reset(R);
      var I = e.sibling(R, 2), K = e.child(I, !0);
      e.reset(I), e.template_effect(
        (de) => {
          e.set_text(G, `Loop ${e.get(c).current ?? ""} / ${e.get(c).total ?? ""}`), e.set_text(K, de);
        },
        [() => N(e.get(r))]
      ), e.append(d, b);
    };
    e.if(z, (d) => {
      e.get(g) ? d(u, !1) : d(B);
    });
  }
  e.reset(S);
  var M = e.sibling(S, 2);
  {
    var O = (d) => {
      var b = jt(), A = e.sibling(e.child(b), 2), R = e.child(A), G = e.sibling(e.child(R), 2), I = e.child(G);
      e.reset(G), e.reset(R);
      var K = e.sibling(R, 2), de = e.sibling(e.child(K), 2), Ge = e.child(de);
      e.reset(de), e.reset(K), e.reset(A);
      var we = e.sibling(A, 2), Se = e.sibling(e.child(we), 2);
      e.each(Se, 21, () => e.get(p), e.index, (me, ue, We) => {
        var he = zt();
        let Ae;
        var Ce = e.child(he);
        Ce.textContent = `Loop ${We + 1}:`;
        var _e = e.sibling(Ce, 2), Ve = e.child(_e, !0);
        e.reset(_e);
        var ye = e.sibling(_e, 2), Ue = e.child(ye);
        e.reset(ye);
        var Re = e.sibling(ye, 2), ze = e.child(Re, !0);
        e.reset(Re), e.reset(he), e.template_effect(
          (je, Be) => {
            var He, De;
            Ae = e.set_class(he, 1, "result-item svelte-118f0cc", null, Ae, { hit: ((He = e.get(ue).performance) == null ? void 0 : He.hitStatus) === "hit" }), e.set_text(Ve, je), e.set_text(Ue, `${Be ?? ""}%`), e.set_text(ze, ((De = e.get(ue).performance) == null ? void 0 : De.hitStatus) === "hit" ? "✓" : "✗");
          },
          [
            () => j(e.get(ue).targetPitch),
            () => e.get(ue).accuracy.toFixed(0)
          ]
        ), e.append(me, he);
      }), e.reset(Se), e.reset(we), e.reset(b), e.template_effect(
        (me) => {
          e.set_text(I, `${me ?? ""}%`), e.set_text(Ge, `${e.get(U) ?? ""}/${e.get(E) ?? ""}`);
        },
        [() => e.get(f).toFixed(1)]
      ), e.append(d, b);
    };
    e.if(M, (d) => {
      e.get(v) && !e.get(g) && d(O);
    });
  }
  e.reset(H), e.template_effect(() => {
    Y.disabled = e.get(g), k.disabled = e.get(g), L.disabled = e.get(g), e.set_text(se, `${e.get(o) ?? ""} dB`), P.disabled = e.get(g), y.disabled = e.get(g);
  }), e.bind_value(Y, () => e.get(n), (d) => e.set(n, d)), e.bind_value(k, () => e.get(a), (d) => e.set(a, d)), e.bind_value(L, () => e.get(o), (d) => e.set(o, d)), e.bind_property("open", "toggle", x, (d) => e.set(i, d), () => e.get(i)), e.append(t, H), e.pop();
}
e.delegate(["click"]);
var Yt = e.from_html('<div class="note-display svelte-1hjl33a"><span class="note-name svelte-1hjl33a"> </span> <span class="octave svelte-1hjl33a"> </span></div> <div class="details svelte-1hjl33a"><span class="frequency"> </span> <span> </span> <span class="clarity"> </span></div>', 1), Zt = e.from_html('<div class="no-pitch svelte-1hjl33a"><span class="placeholder svelte-1hjl33a">---</span> <span class="hint svelte-1hjl33a">Sing or hum into the microphone</span></div>'), Kt = e.from_html('<div class="pitch-readout svelte-1hjl33a"><!></div>');
function Jt(t, s) {
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
  ], n = e.derived(() => () => {
    const r = _.state.currentPitch;
    if (!r) return null;
    const c = i[r.pitchClass], p = Math.floor(r.midi / 12) - 1, v = Math.round((r.midi - Math.round(r.midi)) * 100);
    return {
      name: c,
      octave: p,
      frequency: r.frequency.toFixed(1),
      cents: v,
      clarity: Math.round(r.clarity * 100)
    };
  });
  var a = Kt(), o = e.child(a);
  {
    var g = (r) => {
      const c = e.derived(() => e.get(n)());
      var p = Yt(), v = e.first_child(p), f = e.child(v), U = e.child(f, !0);
      e.reset(f);
      var E = e.sibling(f, 2), $ = e.child(E, !0);
      e.reset(E), e.reset(v);
      var C = e.sibling(v, 2), T = e.child(C), m = e.child(T);
      e.reset(T);
      var D = e.sibling(T, 2);
      let N;
      var j = e.child(D);
      e.reset(D);
      var H = e.sibling(D, 2), x = e.child(H);
      e.reset(H), e.reset(C), e.template_effect(() => {
        e.set_text(U, e.get(c).name), e.set_text($, e.get(c).octave), e.set_text(m, `${e.get(c).frequency ?? ""} Hz`), N = e.set_class(D, 1, "cents svelte-1hjl33a", null, N, { sharp: e.get(c).cents > 0, flat: e.get(c).cents < 0 }), e.set_text(j, `${e.get(c).cents > 0 ? "+" : ""}${e.get(c).cents ?? ""}¢`), e.set_text(x, `${e.get(c).clarity ?? ""}%`);
      }), e.append(r, p);
    }, l = (r) => {
      var c = Zt();
      e.append(r, c);
    };
    e.if(o, (r) => {
      e.get(n)() ? r(g) : r(l, !1);
    });
  }
  e.reset(a), e.append(t, a), e.pop();
}
const be = {
  hasImportedSnapshot: !1,
  snapshot: null,
  isLoading: !1,
  error: null,
  transpositionSemitones: 0
};
function Qt() {
  let t = e.state(e.proxy({ ...be }));
  return {
    get state() {
      return e.get(t);
    },
    /**
     * Check for and consume any pending handoff on app initialization.
     * Should be called once when the app loads.
     */
    async checkAndConsumeHandoff() {
      if (!pt())
        return !1;
      e.get(t).isLoading = !0, e.get(t).error = null;
      try {
        const i = await vt();
        return i ? i.schemaVersion !== Ne ? (e.get(t).error = `Incompatible snapshot version: ${i.schemaVersion}. Expected: ${Ne}`, e.get(t).isLoading = !1, pe(), !1) : (e.get(t).snapshot = i, e.get(t).hasImportedSnapshot = !0, e.get(t).isLoading = !1, pe(), console.log("[HandoffState] Successfully imported snapshot", {
          voices: i.voices.length,
          microbeatCount: i.timeGrid.microbeatCount,
          tempo: i.tempo
        }), !0) : (e.get(t).error = "Handoff data expired or not found. Please try exporting again.", e.get(t).isLoading = !1, pe(), !1);
      } catch (i) {
        return console.error("[HandoffState] Failed to process handoff", i), e.get(t).error = "Failed to import data from Student Notation.", e.get(t).isLoading = !1, pe(), !1;
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
      const s = 3, i = e.get(t).snapshot.minMidiPitch, n = e.get(t).snapshot.maxMidiPitch;
      return i === void 0 || n === void 0 ? null : {
        minMidi: Math.max(21, i - s + e.get(t).transpositionSemitones),
        maxMidi: Math.min(108, n + s + e.get(t).transpositionSemitones)
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
          notes: i.notes.map((n) => ({
            ...n,
            midiPitch: n.midiPitch + e.get(t).transpositionSemitones
          }))
        }))
      };
      try {
        const i = await ut(s);
        console.log("[HandoffState] Handoff slot written for return", i), ht(i);
      } catch (i) {
        console.error("[HandoffState] Failed to write return handoff", i);
      }
    },
    /**
     * Clear the imported snapshot.
     */
    clearSnapshot() {
      e.set(t, { ...be }, !0);
    },
    /**
     * Reset the handoff state.
     */
    reset() {
      e.set(t, { ...be }, !0);
    }
  };
}
const q = Qt();
var es = e.from_html('<div class="handoff-controls svelte-1n46o8q"><div class="transposition-control svelte-1n46o8q"><button class="transpose-btn svelte-1n46o8q" title="Transpose down">-</button> <span class="transposition-label svelte-1n46o8q"> </span> <button class="transpose-btn svelte-1n46o8q" title="Transpose up">+</button></div> <button class="bring-back-btn svelte-1n46o8q">Bring Back to Student Notation</button></div>'), ts = e.from_html('<div class="error-banner svelte-1n46o8q"> </div>'), ss = e.from_html('<div class="import-info svelte-1n46o8q"><span class="import-label svelte-1n46o8q">Microbeats:</span> <span class="import-value svelte-1n46o8q"> </span></div>'), is = e.from_html('<div class="control-group svelte-1n46o8q"><h3 class="control-group-title svelte-1n46o8q">Imported Material</h3> <div class="import-info svelte-1n46o8q"><span class="import-label svelte-1n46o8q">Voices:</span> <span class="import-value svelte-1n46o8q"> </span></div> <div class="import-info svelte-1n46o8q"><span class="import-label svelte-1n46o8q">Tempo:</span> <span class="import-value svelte-1n46o8q"> </span></div> <!></div>'), ns = e.from_html('<div class="app svelte-1n46o8q"><header class="header svelte-1n46o8q"><h1 class="title svelte-1n46o8q">Singing Trainer</h1> <div class="header-controls svelte-1n46o8q"><!></div></header> <!> <main class="main svelte-1n46o8q"><aside class="sidebar sidebar--left svelte-1n46o8q"><div class="control-group svelte-1n46o8q"><!></div> <div class="control-group svelte-1n46o8q"><!></div> <div class="control-group svelte-1n46o8q"><details class="settings-details svelte-1n46o8q"><summary class="settings-summary svelte-1n46o8q">Settings</summary> <div class="settings-content svelte-1n46o8q"><!> <!> <!></div></details></div> <div class="control-group svelte-1n46o8q"><!></div> <!></aside> <section class="canvas-area svelte-1n46o8q"><!></section></main></div>');
function as(t, s) {
  e.push(s, !0);
  let i = e.state(!1);
  Ze(async () => {
    if (await q.checkAndConsumeHandoff()) {
      console.log("[App] Handoff detected and processed");
      const y = q.suggestedPitchRange;
      y && h.setYAxisRange(y);
    }
    try {
      await At(), h.setDetecting(!0), console.log("[App] Pitch detection auto-started");
    } catch (y) {
      console.error("[App] Failed to auto-start pitch detection:", y);
    }
  }), Me(() => {
    Ct();
  });
  const n = e.derived(() => q.state.hasImportedSnapshot), a = e.derived(() => q.state.transpositionSemitones), o = e.derived(() => q.state.error);
  function g() {
    q.bringBackToStudentNotation();
  }
  function l() {
    q.transposeUp();
  }
  function r() {
    q.transposeDown();
  }
  var c = ns(), p = e.child(c), v = e.sibling(e.child(p), 2), f = e.child(v);
  {
    var U = (P) => {
      var y = es(), S = e.child(y), z = e.child(S);
      z.__click = r;
      var B = e.sibling(z, 2), u = e.child(B);
      e.reset(B);
      var M = e.sibling(B, 2);
      M.__click = l, e.reset(S);
      var O = e.sibling(S, 2);
      O.__click = g, e.reset(y), e.template_effect(() => e.set_text(u, `${e.get(a) >= 0 ? "+" : ""}${e.get(a) ?? ""}`)), e.append(P, y);
    };
    e.if(f, (P) => {
      e.get(n) && P(U);
    });
  }
  e.reset(v), e.reset(p);
  var E = e.sibling(p, 2);
  {
    var $ = (P) => {
      var y = ts(), S = e.child(y, !0);
      e.reset(y), e.template_effect(() => e.set_text(S, e.get(o))), e.append(P, y);
    };
    e.if(E, (P) => {
      e.get(o) && P($);
    });
  }
  var C = e.sibling(E, 2), T = e.child(C), m = e.child(T), D = e.child(m);
  Jt(D, {}), e.reset(m);
  var N = e.sibling(m, 2), j = e.child(N);
  Xt(j, {}), e.reset(N);
  var H = e.sibling(N, 2), x = e.child(H), Q = e.sibling(e.child(x), 2), X = e.child(Q);
  Et(X, {});
  var Y = e.sibling(X, 2);
  $t(Y, {});
  var ee = e.sibling(Y, 2);
  Wt(ee, {}), e.reset(Q), e.reset(x), e.reset(H);
  var k = e.sibling(H, 2), Z = e.child(k);
  Ot(Z, {}), e.reset(k);
  var L = e.sibling(k, 2);
  {
    var te = (P) => {
      var y = is(), S = e.sibling(e.child(y), 2), z = e.sibling(e.child(S), 2), B = e.child(z, !0);
      e.reset(z), e.reset(S);
      var u = e.sibling(S, 2), M = e.sibling(e.child(u), 2), O = e.child(M);
      e.reset(M), e.reset(u);
      var d = e.sibling(u, 2);
      {
        var b = (A) => {
          var R = ss(), G = e.sibling(e.child(R), 2), I = e.child(G, !0);
          e.reset(G), e.reset(R), e.template_effect(() => e.set_text(I, q.timeGrid.microbeatCount)), e.append(A, R);
        };
        e.if(d, (A) => {
          q.timeGrid && A(b);
        });
      }
      e.reset(y), e.template_effect(() => {
        e.set_text(B, q.voices.length), e.set_text(O, `${q.tempo ?? ""} BPM`);
      }), e.append(P, y);
    };
    e.if(L, (P) => {
      e.get(n) && P(te);
    });
  }
  e.reset(T);
  var se = e.sibling(T, 2), ie = e.child(se);
  Mt(ie, {}), e.reset(se), e.reset(C), e.reset(c), e.bind_property("open", "toggle", x, (P) => e.set(i, P), () => e.get(i)), e.append(t, c), e.pop();
}
e.delegate(["click"]);
function rs(t) {
  const s = Ke(as, { target: t });
  return {
    destroy: () => Je(s)
  };
}
const ms = rs;
export {
  rs as default,
  ms as mount,
  rs as mountSingingTrainer
};
//# sourceMappingURL=index.js.map
