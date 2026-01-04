var Xe = Object.defineProperty;
var Ye = (t, s, i) => s in t ? Xe(t, s, { enumerable: !0, configurable: !0, writable: !0, value: i }) : t[s] = i;
var ae = (t, s, i) => Ye(t, typeof s != "symbol" ? s + "" : s, i);
import { onDestroy as we, onMount as Ze, mount as Ke, unmount as Je } from "svelte";
import "svelte/internal/disclose-version";
import * as e from "svelte/internal/client";
import { calculateViewportWindow as Qe, PitchGrid as et, createTimeCoordinates as tt, drawUserPitchTrace as st } from "@mlt/ui-components/canvas";
import { generateRowDataForMidiRange as it, getTonicPitchClass as nt, fullRowData as Ne, getPitchByMidi as at } from "@mlt/pitch-data";
import { createNoteHighwayService as rt } from "@mlt/student-notation-engine";
import * as F from "tone";
import { PitchDetector as ot } from "pitchy";
import { getNearestMidi as lt, getCentsOffset as ct, midiToPitchClass as gt } from "@mlt/pitch-utils";
import { DualPitchWheel as dt } from "@mlt/ui-components/pitch-wheels";
import { writeHandoffSlot as ut, navigateToStudentNotation as ht, checkForHandoff as pt, consumeHandoffSlot as vt, clearHandoffParams as pe, SNAPSHOT_SCHEMA_VERSION as Le } from "@mlt/handoff";
const Ee = {
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
  let t = e.state(e.proxy({ ...Ee }));
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
      e.set(t, { ...Ee }, !0);
    }
  };
}
const h = ft(), mt = 200, qe = {
  currentPitch: null,
  history: [],
  stablePitch: { pitchClass: null, opacity: 0, size: 1 }
};
function _t() {
  let t = e.state(e.proxy({ ...qe }));
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
      e.set(t, { ...qe }, !0);
    }
  };
}
const _ = _t(), Fe = {
  isPlaying: !1,
  startTime: null,
  currentTimeMs: 0,
  targetNotes: [],
  nowLineX: 100,
  pixelsPerSecond: 200,
  timeWindowMs: 4e3
};
function yt() {
  let t = e.state(e.proxy({ ...Fe })), s = null, i = null;
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
      const f = `target-${p}`, v = r.get(f);
      return { ...c, hit: (v == null ? void 0 : v.hitStatus) === "hit" };
    });
  }
  function o() {
    e.get(t).isPlaying && s ? (a(), i = requestAnimationFrame(o)) : i = null;
  }
  function d() {
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
      i !== null && (cancelAnimationFrame(i), i = null), s && (s.dispose(), s = null), e.set(t, { ...Fe }, !0);
    }
  };
}
const W = yt(), bt = {
  numLoops: 5,
  minMidi: 48,
  maxMidi: 72,
  tempo: 108,
  referenceVolume: -12
}, $e = {
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
function ke(t) {
  return 60 / t * 1e3 / 2;
}
function Pt() {
  let t = e.state(e.proxy({ ...$e }));
  function s(n) {
    const a = [], o = ke(n.tempo), d = 2e3;
    for (let l = 0; l < n.numLoops; l++) {
      const r = xt(n.minMidi, n.maxMidi), c = d + l * 32 * o;
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
    const o = ke(a), d = 32 * o, r = n - 2e3;
    if (r < 0)
      return { loop: 0, phase: "rest2" };
    const c = Math.floor(r / d), p = r % d, f = Math.floor(p / o);
    let v;
    return f < 8 ? v = "reference" : f < 16 ? v = "rest1" : f < 24 ? v = "input" : v = "rest2", { loop: c, phase: v };
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
      const d = a * 2;
      d < e.get(t).generatedNotes.length && (e.get(t).currentPitch = e.get(t).generatedNotes[d].midi);
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
      e.set(t, { ...$e, config: { ...e.get(t).config } }, !0);
    }
  };
}
const T = Pt();
var Tt = e.from_html('<div class="singing-canvas-container svelte-15ar5r5"><!> <canvas class="pitch-trail-canvas svelte-15ar5r5"></canvas></div>');
function Mt(t, s) {
  e.push(s, !0);
  let i = e.state(void 0), n = e.state(800), a = e.state(400), o = e.state(void 0), d = e.state(null), l = e.state(null), r = 0, c = 0, p = 0;
  const f = 20, v = !0, U = !1, D = e.derived(() => e.get(n) >= 720), $ = 3, S = e.derived(() => f * $), x = e.derived(() => e.get(S) * 2), A = e.derived(() => v), I = e.derived(() => e.get(A) ? e.get(x) * (e.get(D) ? 2 : 1) : 0), y = e.derived(() => Math.max(0, e.get(n) - e.get(I))), Y = e.derived(() => e.get(A) ? e.get(x) : 0), N = () => {
    try {
      return !!globalThis.__ST_DEBUG_TRAIL;
    } catch {
      return !1;
    }
  }, H = e.derived(() => it(h.state.yAxisRange.minMidi, h.state.yAxisRange.maxMidi)), k = e.derived(() => Qe({
    containerHeight: e.get(a),
    fullRowData: e.get(H),
    preferredCellHeight: 40,
    minCellHeight: 20
  })), R = e.derived(() => h.state.visualizationMode === "highway" ? "highway" : "singing"), Z = e.derived(() => 60 / T.state.config.tempo * 1e3), te = 2e3, X = e.derived(() => (() => {
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
  function se() {
    return W.state.targetNotes.map((u, g) => ({
      id: `target-${g}`,
      midi: u.midi,
      startTimeMs: u.startTimeMs,
      durationMs: u.durationMs,
      label: u.lyric
      // Pass emoji as label
    }));
  }
  const z = e.derived(() => ({
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
  })), ie = e.derived(() => e.get(R) === "singing" ? {
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
    trailConfig: e.get(z)
  } : void 0), O = e.derived(() => e.get(R) === "highway" ? {
    userPitch: _.state.currentPitch ? {
      frequency: _.state.currentPitch.frequency,
      midi: _.state.currentPitch.midi,
      clarity: _.state.currentPitch.clarity,
      pitchClass: _.state.currentPitch.pitchClass
    } : null,
    pitchHistory: [],
    targetNotes: se(),
    nowLineX: W.state.nowLineX,
    pixelsPerSecond: W.state.pixelsPerSecond,
    currentTimeMs: W.state.currentTimeMs,
    timeWindowMs: W.state.timeWindowMs,
    trailConfig: e.get(z)
  } : void 0), ne = e.derived(() => ({
    startRow: e.get(k).startRow,
    endRow: e.get(k).endRow,
    zoomLevel: 1,
    containerWidth: e.get(n),
    containerHeight: e.get(a)
  }));
  function P() {
    if (!e.get(o)) return;
    const u = window.devicePixelRatio || 1;
    e.get(o).width = e.get(y) * u, e.get(o).height = e.get(a) * u, e.get(o).style.width = `${e.get(y)}px`, e.get(o).style.height = `${e.get(a)}px`, e.get(o).style.left = `${e.get(Y)}px`;
    const g = e.get(o).getContext("2d");
    if (!g) {
      e.set(d, null);
      return;
    }
    g.setTransform(u, 0, 0, u, 0, 0), e.set(d, g, !0);
  }
  function b() {
    if (!e.get(d) || e.get(y) <= 0) return;
    e.get(d).clearRect(0, 0, e.get(y), e.get(a));
    const u = _.state.history;
    if (u.length === 0) return;
    const g = e.get(R) === "singing" ? e.get(ie) : e.get(O);
    if (!g) return;
    const m = N(), M = m ? performance.now() : 0, w = e.get(R) === "highway" && e.get(O) ? e.get(O).nowLineX : 100, G = tt({
      cellWidth: f,
      cellHeight: e.get(k).cellHeight,
      viewport: e.get(ne),
      pixelsPerSecond: g.pixelsPerSecond ?? 200,
      nowLineX: w,
      currentTimeMs: e.get(R) === "highway" && e.get(O) ? e.get(O).currentTimeMs : 0
    }), E = {
      cellHeight: e.get(k).cellHeight,
      viewportWidth: e.get(y),
      nowLineX: w,
      pixelsPerSecond: g.pixelsPerSecond ?? 200,
      timeWindowMs: g.timeWindowMs ?? 4e3,
      colorMode: "color",
      trailConfig: e.get(z)
    }, J = performance.now();
    if (st(e.get(d), G, u, J, E, e.get(H)), m) {
      const Q = performance.now();
      if (c += 1, p += Q - M, Q - r >= 1e3) {
        const me = c > 0 ? p / c : 0;
        console.log(`[SingingTrail] points=${u.length} avgMs=${me.toFixed(2)} gridWidth=${e.get(y)}`), r = Q, c = 0, p = 0;
      }
    }
  }
  function C() {
    if (e.get(l)) return;
    const u = () => {
      b(), e.set(l, requestAnimationFrame(u), !0);
    };
    e.set(l, requestAnimationFrame(u), !0);
  }
  function j() {
    e.get(l) && (cancelAnimationFrame(e.get(l)), e.set(l, null)), e.get(d) && e.get(y) > 0 && e.get(d).clearRect(0, 0, e.get(y), e.get(a));
  }
  e.user_effect(() => {
    if (!e.get(i)) return;
    const u = new ResizeObserver((g) => {
      for (const m of g)
        e.set(n, m.contentRect.width, !0), e.set(a, m.contentRect.height, !0);
    });
    return u.observe(e.get(i)), () => {
      u.disconnect();
    };
  }), e.user_effect(() => {
    e.get(y), e.get(a), e.get(Y), e.get(o), P();
  }), e.user_effect(() => {
    e.get(R), e.get(d), e.get(R) === "singing" || e.get(R) === "highway" ? C() : j();
  }), we(() => {
    j();
  });
  var L = Tt(), B = e.child(L);
  et(B, {
    get mode() {
      return e.get(R);
    },
    get fullRowData() {
      return e.get(H);
    },
    get viewport() {
      return e.get(ne);
    },
    cellWidth: f,
    get cellHeight() {
      return e.get(k).cellHeight;
    },
    colorMode: "color",
    showOctaveLabels: v,
    showFrequencyLabels: U,
    get showRightLegend() {
      return e.get(D);
    },
    get singingConfig() {
      return e.get(ie);
    },
    get highwayConfig() {
      return e.get(O);
    },
    get legendHighlight() {
      return e.get(X);
    },
    get beatIntervalMs() {
      return e.get(Z);
    },
    beatTimeOffsetMs: te
  });
  var K = e.sibling(B, 2);
  e.bind_this(K, (u) => e.set(o, u), () => e.get(o)), e.reset(L), e.bind_this(L, (u) => e.set(i, u), () => e.get(i)), e.append(t, L), e.pop();
}
class wt {
  constructor() {
    ae(this, "synth", null);
    ae(this, "scheduledTimeouts", []);
    // Store timeout IDs for cleanup
    ae(this, "volume", null);
    ae(this, "startTime", 0);
    // Performance.now() when playback started
    ae(this, "_isPlaying", !1);
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
      }, i.startTimeMs), d = window.setTimeout(() => {
        this._isPlaying = !1;
      }, i.startTimeMs + i.durationMs);
      this.scheduledTimeouts.push(o, d);
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
const ce = new wt(), re = {
  FFT_SIZE: 2048,
  CLARITY_THRESHOLD: 0.8,
  MIN_PITCH_HZ: 60,
  MAX_PITCH_HZ: 1600,
  HIGHLIGHT_CENTS_RANGE: 50
};
let oe = null, le = null, ve = null, ee = null, fe = !1;
const Pe = 1;
function St(t) {
  return 12 * Math.log2(t / 440) + 69;
}
function Te() {
  if (!fe || !le || !ve) {
    ee = null;
    return;
  }
  if (ce.isPlaying) {
    _.addHistoryPoint({
      frequency: 0,
      midi: 0,
      time: performance.now(),
      clarity: 0
    }), ee = requestAnimationFrame(Te);
    return;
  }
  const t = le.getValue(), [s, i] = ve.findPitch(t, F.getContext().sampleRate), n = s !== null && i > re.CLARITY_THRESHOLD && s > re.MIN_PITCH_HZ && s < re.MAX_PITCH_HZ;
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
    const a = _.state.currentPitch.midi, o = lt(a), d = ct(a), l = Math.min(Math.abs(d), re.HIGHLIGHT_CENTS_RANGE), r = Math.max(0, 1 - l / re.HIGHLIGHT_CENTS_RANGE);
    _.setStablePitch({
      pitchClass: gt(o),
      opacity: r,
      size: Pe
    });
  } else
    _.setStablePitch({ pitchClass: null, opacity: 0, size: Pe });
  ee = requestAnimationFrame(Te);
}
async function At() {
  if (!fe) {
    ee !== null && cancelAnimationFrame(ee), oe = new F.UserMedia(), le = new F.Analyser("waveform", re.FFT_SIZE), ve = ot.forFloat32Array(le.size);
    try {
      await F.start(), await oe.open(), oe.connect(le), fe = !0, Te();
    } catch (t) {
      throw console.error("Microphone access denied or failed:", t), Oe(), t;
    }
  }
}
function Rt() {
  fe = !1, Oe();
}
function Oe() {
  ee !== null && (cancelAnimationFrame(ee), ee = null), oe && (oe.close(), oe = null), le = null, ve = null, _.setStablePitch({ pitchClass: null, opacity: 0, size: Pe }), _.setCurrentPitch(null);
}
e.from_html('<span class="spinner svelte-cytsjj"></span> Starting...', 1);
e.from_html('<span class="icon svelte-cytsjj">&#9632;</span> Stop', 1);
e.from_html('<span class="icon svelte-cytsjj">&#9654;</span> Start', 1);
e.from_html("<button><!></button>");
e.delegate(["click"]);
let V = null, ge = !1, de = null;
function Ct() {
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
function Ge(t, s) {
  return `${t.replace("b", "#").replace("Db", "C#").replace("Eb", "D#").replace("Gb", "F#").replace("Ab", "G#").replace("Bb", "A#")}${s}`;
}
async function Ht() {
  await F.start();
  const t = Ct(), s = Ge(h.state.tonic, h.state.drone.octave);
  t.volume.value = h.state.drone.volume, console.log("[DroneAudio] Starting drone", {
    note: s,
    volume: t.volume.value
  }), de && t.releaseAll(), de = s, t.triggerAttack(s), ge = !0;
}
function Dt() {
  V && ge && (V.releaseAll(), de = null, ge = !1);
}
function Me() {
  if (!ge || !V) return;
  const t = Ge(h.state.tonic, h.state.drone.octave);
  V.volume.value = h.state.drone.volume, console.log("[DroneAudio] Updating drone", {
    note: t,
    volume: V.volume.value
  }), t !== de && (V.releaseAll(), V.triggerAttack(t), de = t);
}
async function It() {
  ge ? Dt() : await Ht();
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
    h.setTonic(r.value), Me();
  }
  var a = Lt(), o = e.sibling(e.child(a), 2);
  o.__change = n, e.each(o, 21, () => i, e.index, (l, r) => {
    var c = Nt(), p = e.child(c, !0);
    e.reset(c);
    var f = {};
    e.template_effect(() => {
      e.set_text(p, e.get(r)), f !== (f = e.get(r)) && (c.value = (c.__value = e.get(r)) ?? "");
    }), e.append(l, c);
  }), e.reset(o);
  var d;
  e.init_select(o), e.reset(a), e.template_effect(() => {
    d !== (d = h.state.tonic) && (o.value = (o.__value = h.state.tonic) ?? "", e.select_option(o, h.state.tonic));
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
  function a(S) {
    const x = S.target;
    h.setDroneOctave(parseInt(x.value, 10)), Me();
  }
  function o(S) {
    const x = S.target;
    h.setDroneVolume(parseInt(x.value, 10)), Me();
  }
  var d = Ft(), l = e.child(d);
  let r;
  l.__click = n;
  var c = e.child(l, !0);
  e.reset(l);
  var p = e.sibling(l, 2), f = e.child(p), v = e.sibling(e.child(f));
  v.__change = a, e.each(v, 21, () => i, e.index, (S, x) => {
    var A = qt(), I = e.child(A, !0);
    e.reset(A);
    var y = {};
    e.template_effect(() => {
      e.set_text(I, e.get(x)), y !== (y = e.get(x)) && (A.value = (A.__value = e.get(x)) ?? "");
    }), e.append(S, A);
  }), e.reset(v);
  var U;
  e.init_select(v), e.reset(f);
  var D = e.sibling(f, 2), $ = e.sibling(e.child(D));
  e.remove_input_defaults($), $.__input = o, e.reset(D), e.reset(p), e.reset(d), e.template_effect(() => {
    r = e.set_class(l, 1, "drone-toggle svelte-1rkr6nv", null, r, { active: h.state.drone.isPlaying }), e.set_text(c, h.state.drone.isPlaying ? "Drone On" : "Drone Off"), U !== (U = h.state.drone.octave) && (v.value = (v.__value = h.state.drone.octave) ?? "", e.select_option(v, h.state.drone.octave)), e.set_value($, h.state.drone.volume);
  }), e.append(t, d), e.pop();
}
e.delegate(["click", "change", "input"]);
e.from_html("<button> </button>");
e.from_html('<div class="mode-toggle svelte-i9tkj4"></div>');
e.delegate(["click"]);
var kt = e.from_html('<div class="range-control svelte-1es7ond"><h3 class="control-title svelte-1es7ond">Pitch Range</h3> <!></div>');
function Ot(t, s) {
  e.push(s, !0);
  function i(r) {
    const c = Ne.findIndex((p) => p.midi === r);
    return c >= 0 ? c : 0;
  }
  const n = e.derived(() => i(h.state.yAxisRange.maxMidi)), a = e.derived(() => i(h.state.yAxisRange.minMidi));
  function o(r) {
    const c = r.bottomPitch.midi ?? 21, p = r.topPitch.midi ?? 108;
    h.setYAxisRange({ minMidi: c, maxMidi: p });
  }
  var d = kt(), l = e.sibling(e.child(d), 2);
  dt(l, {
    get fullRowData() {
      return Ne;
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
  }), e.reset(d), e.append(t, d), e.pop();
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
  var d = e.child(a, !0);
  e.reset(a), e.reset(n), e.template_effect(() => {
    o = e.set_class(a, 1, "toggle-button svelte-e7pwl1", null, o, { active: h.state.pitchHighlightEnabled }), e.set_text(d, h.state.pitchHighlightEnabled ? "On" : "Off");
  }), e.append(t, n), e.pop();
}
e.delegate(["click"]);
var Vt = e.from_html('<button class="start-exercise-btn svelte-118f0cc">Start Demo Exercise</button>'), Ut = e.from_html('<button class="stop-exercise-btn svelte-118f0cc">Stop Exercise</button> <div class="progress-indicator svelte-118f0cc"> </div> <div class="phase-indicator svelte-118f0cc"> </div>', 1), zt = e.from_html('<div><span class="result-loop svelte-118f0cc"></span> <span class="result-pitch svelte-118f0cc"> </span> <span class="result-accuracy svelte-118f0cc"> </span> <span class="result-status svelte-118f0cc"> </span></div>'), jt = e.from_html('<div class="exercise-results svelte-118f0cc"><h4 class="results-title svelte-118f0cc">Results</h4> <div class="results-summary svelte-118f0cc"><div class="stat svelte-118f0cc"><span class="stat-label svelte-118f0cc">Average Accuracy:</span> <span class="stat-value svelte-118f0cc"> </span></div> <div class="stat svelte-118f0cc"><span class="stat-label svelte-118f0cc">Hits:</span> <span class="stat-value svelte-118f0cc"> </span></div></div> <details class="results-details svelte-118f0cc"><summary class="results-summary-label svelte-118f0cc">Detailed Results</summary> <div class="results-list svelte-118f0cc"></div></details></div>'), Bt = e.from_html('<div class="demo-exercise-panel svelte-118f0cc"><h3 class="panel-title svelte-118f0cc">Demo Exercise</h3> <details class="settings-details svelte-118f0cc"><summary class="settings-summary svelte-118f0cc">Settings</summary> <div class="exercise-settings svelte-118f0cc"><label class="setting-label svelte-118f0cc"><span class="label-text svelte-118f0cc">Number of loops:</span> <input class="setting-input svelte-118f0cc" type="number" min="1" max="20"/></label> <label class="setting-label svelte-118f0cc"><span class="label-text svelte-118f0cc">Tempo (BPM):</span> <input class="setting-input svelte-118f0cc" type="number" min="60" max="180"/></label> <label class="setting-label svelte-118f0cc"><span class="label-text svelte-118f0cc">Reference Volume:</span> <input class="setting-slider svelte-118f0cc" type="range" min="-40" max="0"/> <span class="volume-value svelte-118f0cc"> </span></label> <div class="pitch-range-buttons svelte-118f0cc"><button class="range-btn svelte-118f0cc">Use Current Range</button> <button class="range-btn svelte-118f0cc">Use Full Range</button></div></div></details> <div class="exercise-controls svelte-118f0cc"><!></div> <!></div>');
function Xt(t, s) {
  e.push(s, !0);
  let i = e.state(!1), n = e.state(5), a = e.state(108), o = e.state(-12);
  const d = e.derived(() => T.state.isActive), l = e.derived(() => T.state.isPlaying), r = e.derived(() => T.state.currentPhase), c = e.derived(() => T.getCurrentProgress()), p = e.derived(() => T.getResults()), f = e.derived(() => e.get(p).length > 0), v = e.derived(() => T.getAverageAccuracy()), U = e.derived(() => T.getHitCount()), D = e.derived(() => e.get(p).length);
  e.user_effect(() => {
    if (!e.get(d) || !e.get(l)) return;
    const g = W.state.currentTimeMs;
    T.updatePhase(g);
  }), e.user_effect(() => {
    if (!e.get(d)) return;
    const g = W.getPerformanceResults();
    T.getGeneratedNotes().forEach((M, w) => {
      if (M.lyric !== "🎤") return;
      const G = `target-${w}`, E = g.get(G);
      if (E && !T.hasResultForLoop(Math.floor(w / 2))) {
        const J = $(E);
        T.addResult({
          loopIndex: Math.floor(w / 2),
          targetPitch: M.midi,
          accuracy: J,
          performance: E
        });
      }
    });
  });
  function $(g) {
    return g.hitStatus === "hit" ? g.pitchAccuracyCents !== void 0 ? Math.max(0, 100 - Math.abs(g.pitchAccuracyCents) / 50 * 100) : 100 : 0;
  }
  we(() => {
    e.get(d) && I();
  });
  function S() {
    const g = h.state.yAxisRange;
    T.setPitchRange(g.minMidi, g.maxMidi);
  }
  function x() {
    T.setPitchRange(21, 108);
  }
  async function A() {
    h.setVisualizationMode("highway"), T.configure({
      numLoops: e.get(n),
      tempo: e.get(a),
      referenceVolume: e.get(o)
    }), S(), await ce.init(), ce.setVolume(e.get(o)), T.start();
    const g = T.getGeneratedNotes();
    W.setTargetNotes(g), W.start(), T.setPlaying(!0);
    const m = g.filter((M) => M.lyric === "👂");
    ce.scheduleReferenceTones(m);
  }
  function I() {
    ce.stop(), W.stop(), T.stop();
  }
  function y(g) {
    switch (g) {
      case "reference":
        return "👂 Listen";
      case "input":
        return "🎤 Sing";
      default:
        return "Rest";
    }
  }
  function Y(g) {
    const m = at(g);
    return (m == null ? void 0 : m.combined) || `MIDI ${g}`;
  }
  var N = Bt(), H = e.sibling(e.child(N), 2), k = e.sibling(e.child(H), 2), R = e.child(k), Z = e.sibling(e.child(R), 2);
  e.remove_input_defaults(Z), e.reset(R);
  var te = e.sibling(R, 2), X = e.sibling(e.child(te), 2);
  e.remove_input_defaults(X), e.reset(te);
  var se = e.sibling(te, 2), z = e.sibling(e.child(se), 2);
  e.remove_input_defaults(z);
  var ie = e.sibling(z, 2), O = e.child(ie);
  e.reset(ie), e.reset(se);
  var ne = e.sibling(se, 2), P = e.child(ne);
  P.__click = S;
  var b = e.sibling(P, 2);
  b.__click = x, e.reset(ne), e.reset(k), e.reset(H);
  var C = e.sibling(H, 2), j = e.child(C);
  {
    var L = (g) => {
      var m = Vt();
      m.__click = A, e.append(g, m);
    }, B = (g) => {
      var m = Ut(), M = e.first_child(m);
      M.__click = I;
      var w = e.sibling(M, 2), G = e.child(w);
      e.reset(w);
      var E = e.sibling(w, 2), J = e.child(E, !0);
      e.reset(E), e.template_effect(
        (Q) => {
          e.set_text(G, `Loop ${e.get(c).current ?? ""} / ${e.get(c).total ?? ""}`), e.set_text(J, Q);
        },
        [() => y(e.get(r))]
      ), e.append(g, m);
    };
    e.if(j, (g) => {
      e.get(d) ? g(B, !1) : g(L);
    });
  }
  e.reset(C);
  var K = e.sibling(C, 2);
  {
    var u = (g) => {
      var m = jt(), M = e.sibling(e.child(m), 2), w = e.child(M), G = e.sibling(e.child(w), 2), E = e.child(G);
      e.reset(G), e.reset(w);
      var J = e.sibling(w, 2), Q = e.sibling(e.child(J), 2), me = e.child(Q);
      e.reset(Q), e.reset(J), e.reset(M);
      var Se = e.sibling(M, 2), Ae = e.sibling(e.child(Se), 2);
      e.each(Ae, 21, () => e.get(p), e.index, (_e, ue, We) => {
        var he = zt();
        let Re;
        var Ce = e.child(he);
        Ce.textContent = `Loop ${We + 1}:`;
        var ye = e.sibling(Ce, 2), Ve = e.child(ye, !0);
        e.reset(ye);
        var be = e.sibling(ye, 2), Ue = e.child(be);
        e.reset(be);
        var He = e.sibling(be, 2), ze = e.child(He, !0);
        e.reset(He), e.reset(he), e.template_effect(
          (je, Be) => {
            var De, Ie;
            Re = e.set_class(he, 1, "result-item svelte-118f0cc", null, Re, { hit: ((De = e.get(ue).performance) == null ? void 0 : De.hitStatus) === "hit" }), e.set_text(Ve, je), e.set_text(Ue, `${Be ?? ""}%`), e.set_text(ze, ((Ie = e.get(ue).performance) == null ? void 0 : Ie.hitStatus) === "hit" ? "✓" : "✗");
          },
          [
            () => Y(e.get(ue).targetPitch),
            () => e.get(ue).accuracy.toFixed(0)
          ]
        ), e.append(_e, he);
      }), e.reset(Ae), e.reset(Se), e.reset(m), e.template_effect(
        (_e) => {
          e.set_text(E, `${_e ?? ""}%`), e.set_text(me, `${e.get(U) ?? ""}/${e.get(D) ?? ""}`);
        },
        [() => e.get(v).toFixed(1)]
      ), e.append(g, m);
    };
    e.if(K, (g) => {
      e.get(f) && !e.get(d) && g(u);
    });
  }
  e.reset(N), e.template_effect(() => {
    Z.disabled = e.get(d), X.disabled = e.get(d), z.disabled = e.get(d), e.set_text(O, `${e.get(o) ?? ""} dB`), P.disabled = e.get(d), b.disabled = e.get(d);
  }), e.bind_value(Z, () => e.get(n), (g) => e.set(n, g)), e.bind_value(X, () => e.get(a), (g) => e.set(a, g)), e.bind_value(z, () => e.get(o), (g) => e.set(o, g)), e.bind_property("open", "toggle", H, (g) => e.set(i, g), () => e.get(i)), e.append(t, N), e.pop();
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
    const c = i[r.pitchClass], p = Math.floor(r.midi / 12) - 1, f = Math.round((r.midi - Math.round(r.midi)) * 100);
    return {
      name: c,
      octave: p,
      frequency: r.frequency.toFixed(1),
      cents: f,
      clarity: Math.round(r.clarity * 100)
    };
  });
  var a = Kt(), o = e.child(a);
  {
    var d = (r) => {
      const c = e.derived(() => e.get(n)());
      var p = Yt(), f = e.first_child(p), v = e.child(f), U = e.child(v, !0);
      e.reset(v);
      var D = e.sibling(v, 2), $ = e.child(D, !0);
      e.reset(D), e.reset(f);
      var S = e.sibling(f, 2), x = e.child(S), A = e.child(x);
      e.reset(x);
      var I = e.sibling(x, 2);
      let y;
      var Y = e.child(I);
      e.reset(I);
      var N = e.sibling(I, 2), H = e.child(N);
      e.reset(N), e.reset(S), e.template_effect(() => {
        e.set_text(U, e.get(c).name), e.set_text($, e.get(c).octave), e.set_text(A, `${e.get(c).frequency ?? ""} Hz`), y = e.set_class(I, 1, "cents svelte-1hjl33a", null, y, { sharp: e.get(c).cents > 0, flat: e.get(c).cents < 0 }), e.set_text(Y, `${e.get(c).cents > 0 ? "+" : ""}${e.get(c).cents ?? ""}¢`), e.set_text(H, `${e.get(c).clarity ?? ""}%`);
      }), e.append(r, p);
    }, l = (r) => {
      var c = Zt();
      e.append(r, c);
    };
    e.if(o, (r) => {
      e.get(n)() ? r(d) : r(l, !1);
    });
  }
  e.reset(a), e.append(t, a), e.pop();
}
const xe = {
  hasImportedSnapshot: !1,
  snapshot: null,
  isLoading: !1,
  error: null,
  transpositionSemitones: 0
};
function Qt() {
  let t = e.state(e.proxy({ ...xe }));
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
        return i ? i.schemaVersion !== Le ? (e.get(t).error = `Incompatible snapshot version: ${i.schemaVersion}. Expected: ${Le}`, e.get(t).isLoading = !1, pe(), !1) : (e.get(t).snapshot = i, e.get(t).hasImportedSnapshot = !0, e.get(t).isLoading = !1, pe(), console.log("[HandoffState] Successfully imported snapshot", {
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
      e.set(t, { ...xe }, !0);
    },
    /**
     * Reset the handoff state.
     */
    reset() {
      e.set(t, { ...xe }, !0);
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
      const b = q.suggestedPitchRange;
      b && h.setYAxisRange(b);
    }
    try {
      await At(), h.setDetecting(!0), console.log("[App] Pitch detection auto-started");
    } catch (b) {
      console.error("[App] Failed to auto-start pitch detection:", b);
    }
  }), we(() => {
    Rt();
  });
  const n = e.derived(() => q.state.hasImportedSnapshot), a = e.derived(() => q.state.transpositionSemitones), o = e.derived(() => q.state.error);
  function d() {
    q.bringBackToStudentNotation();
  }
  function l() {
    q.transposeUp();
  }
  function r() {
    q.transposeDown();
  }
  var c = ns(), p = e.child(c), f = e.sibling(e.child(p), 2), v = e.child(f);
  {
    var U = (P) => {
      var b = es(), C = e.child(b), j = e.child(C);
      j.__click = r;
      var L = e.sibling(j, 2), B = e.child(L);
      e.reset(L);
      var K = e.sibling(L, 2);
      K.__click = l, e.reset(C);
      var u = e.sibling(C, 2);
      u.__click = d, e.reset(b), e.template_effect(() => e.set_text(B, `${e.get(a) >= 0 ? "+" : ""}${e.get(a) ?? ""}`)), e.append(P, b);
    };
    e.if(v, (P) => {
      e.get(n) && P(U);
    });
  }
  e.reset(f), e.reset(p);
  var D = e.sibling(p, 2);
  {
    var $ = (P) => {
      var b = ts(), C = e.child(b, !0);
      e.reset(b), e.template_effect(() => e.set_text(C, e.get(o))), e.append(P, b);
    };
    e.if(D, (P) => {
      e.get(o) && P($);
    });
  }
  var S = e.sibling(D, 2), x = e.child(S), A = e.child(x), I = e.child(A);
  Jt(I, {}), e.reset(A);
  var y = e.sibling(A, 2), Y = e.child(y);
  Xt(Y, {}), e.reset(y);
  var N = e.sibling(y, 2), H = e.child(N), k = e.sibling(e.child(H), 2), R = e.child(k);
  Et(R, {});
  var Z = e.sibling(R, 2);
  $t(Z, {});
  var te = e.sibling(Z, 2);
  Wt(te, {}), e.reset(k), e.reset(H), e.reset(N);
  var X = e.sibling(N, 2), se = e.child(X);
  Ot(se, {}), e.reset(X);
  var z = e.sibling(X, 2);
  {
    var ie = (P) => {
      var b = is(), C = e.sibling(e.child(b), 2), j = e.sibling(e.child(C), 2), L = e.child(j, !0);
      e.reset(j), e.reset(C);
      var B = e.sibling(C, 2), K = e.sibling(e.child(B), 2), u = e.child(K);
      e.reset(K), e.reset(B);
      var g = e.sibling(B, 2);
      {
        var m = (M) => {
          var w = ss(), G = e.sibling(e.child(w), 2), E = e.child(G, !0);
          e.reset(G), e.reset(w), e.template_effect(() => e.set_text(E, q.timeGrid.microbeatCount)), e.append(M, w);
        };
        e.if(g, (M) => {
          q.timeGrid && M(m);
        });
      }
      e.reset(b), e.template_effect(() => {
        e.set_text(L, q.voices.length), e.set_text(u, `${q.tempo ?? ""} BPM`);
      }), e.append(P, b);
    };
    e.if(z, (P) => {
      e.get(n) && P(ie);
    });
  }
  e.reset(x);
  var O = e.sibling(x, 2), ne = e.child(O);
  Mt(ne, {}), e.reset(O), e.reset(S), e.reset(c), e.bind_property("open", "toggle", H, (P) => e.set(i, P), () => e.get(i)), e.append(t, c), e.pop();
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
