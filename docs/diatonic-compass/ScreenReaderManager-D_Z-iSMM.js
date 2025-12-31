var g = Object.defineProperty;
var y = (o, e, t) => e in o ? g(o, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : o[e] = t;
var c = (o, e, t) => y(o, typeof e != "symbol" ? e + "" : e, t);
import { E as l, C as u, a as i, g as h, c as b } from "./index-D0GARXFn.js";
const m = {
  general: "Use arrow keys to rotate rings, space to play scale, S for settings, H for keyboard shortcuts help.",
  navigation: "Arrow keys rotate rings. Shift plus arrows for chromatic ring. Control plus arrows for large steps.",
  playback: "Press space or enter to play the current scale. Escape to stop playback.",
  settings: "Press S to open settings. Use tab to navigate options. Escape to close.",
  keyboard: "Press H to see all keyboard shortcuts. Use tab to navigate between interface elements."
};
class d {
  /**
   * Initialize screen reader support
   */
  static init() {
    try {
      this.setupLiveRegions(), this.enhanceExistingElements(), this.setupStateMonitoring(), console.log("Screen reader support initialized");
    } catch (e) {
      l.handle(e, u.ERROR_HANDLING.CONTEXTS.UI);
    }
  }
  /**
   * Set up ARIA live regions for announcements
   */
  static setupLiveRegions() {
    const e = document.createElement("div");
    e.id = "sr-main-announcements", e.setAttribute("aria-live", "polite"), e.setAttribute("aria-atomic", "false"), e.className = "sr-only", this.applySROnlyStyles(e), document.body.appendChild(e);
    const t = document.createElement("div");
    t.id = "sr-urgent-announcements", t.setAttribute("aria-live", "assertive"), t.setAttribute("aria-atomic", "true"), t.className = "sr-only", this.applySROnlyStyles(t), document.body.appendChild(t);
    const n = document.createElement("div");
    n.id = "sr-musical-status", n.setAttribute("aria-live", "polite"), n.setAttribute("aria-atomic", "true"), n.className = "sr-only", this.applySROnlyStyles(n), document.body.appendChild(n);
  }
  /**
   * Apply screen reader only styles
   */
  static applySROnlyStyles(e) {
    e.style.position = "absolute", e.style.left = "-10000px", e.style.width = "1px", e.style.height = "1px", e.style.overflow = "hidden", e.style.clip = "rect(1px, 1px, 1px, 1px)", e.style.whiteSpace = "nowrap";
  }
  /**
   * Enhance existing elements with better ARIA attributes
   */
  static enhanceExistingElements() {
    const e = document.querySelector("#chromaWheel");
    if (e) {
      e.setAttribute("role", "application"), e.setAttribute("aria-label", "Interactive Diatonic Compass"), e.setAttribute("aria-describedby", "sr-canvas-description");
      const n = document.createElement("div");
      n.id = "sr-canvas-description", n.className = "sr-only", n.textContent = "A circular interface with three concentric rings representing pitch classes, scale degrees, and chromatic positions. Use arrow keys to rotate rings and explore different musical keys and modes.", this.applySROnlyStyles(n), document.body.appendChild(n);
    }
    const t = document.querySelector("#result-container");
    if (t) {
      t.setAttribute("role", "status"), t.setAttribute("aria-label", "Current musical key and mode"), t.setAttribute("aria-describedby", "sr-result-description");
      const n = document.createElement("div");
      n.id = "sr-result-description", n.className = "sr-only", n.textContent = "Shows the current musical key and mode. Click to play the scale.", this.applySROnlyStyles(n), document.body.appendChild(n);
    }
    this.enhanceBelts(), this.enhanceControls();
  }
  /**
   * Enhance belt elements with accessibility
   */
  static enhanceBelts() {
    [
      { selector: "#pitchBelt", name: "Pitch Class Belt", description: "Shows note names (C, D, E, etc.)" },
      { selector: "#degreeBelt", name: "Scale Degree Belt", description: "Shows scale degrees (1, 2, 3, etc.)" },
      { selector: "#chromaticBelt", name: "Chromatic Belt", description: "Shows chromatic positions (0-11)" }
    ].forEach((t) => {
      const n = document.querySelector(t.selector);
      n && (n.setAttribute("role", "listbox"), n.setAttribute("aria-label", t.name), n.setAttribute("aria-description", t.description), n.setAttribute("tabindex", "0"));
    });
  }
  /**
   * Enhance control elements
   */
  static enhanceControls() {
    var a, r, p;
    const e = document.querySelector("#flat-btn"), t = document.querySelector("#sharp-btn");
    if (e) {
      e.setAttribute("aria-describedby", "sr-flat-description");
      const s = document.createElement("span");
      s.id = "sr-flat-description", s.className = "sr-only", s.textContent = "Toggle display of flat note names like D-flat, E-flat", this.applySROnlyStyles(s), (a = e.parentNode) == null || a.appendChild(s);
    }
    if (t) {
      t.setAttribute("aria-describedby", "sr-sharp-description");
      const s = document.createElement("span");
      s.id = "sr-sharp-description", s.className = "sr-only", s.textContent = "Toggle display of sharp note names like C-sharp, F-sharp", this.applySROnlyStyles(s), (r = t.parentNode) == null || r.appendChild(s);
    }
    const n = document.querySelector("#settings-btn");
    if (n) {
      n.setAttribute("aria-describedby", "sr-settings-description");
      const s = document.createElement("span");
      s.id = "sr-settings-description", s.className = "sr-only", s.textContent = "Open settings panel to change display options, theme, and layout", this.applySROnlyStyles(s), (p = n.parentNode) == null || p.appendChild(s);
    }
  }
  /**
   * Set up monitoring for state changes
   */
  static setupStateMonitoring() {
    setInterval(() => {
      this.shouldAnnounceStateChange() && this.announceCurrentState();
    }, 1e3);
  }
  /**
   * Check if state change should be announced
   */
  static shouldAnnounceStateChange() {
    if (!this.isEnabled) return !1;
    const e = this.getCurrentMusicalState();
    return JSON.stringify(e) !== JSON.stringify(this.lastAnnouncedState) && !i.drag.active && !i.animation;
  }
  /**
   * Get current musical state for comparison
   */
  static getCurrentMusicalState() {
    try {
      const e = h(i);
      return {
        pitch: e == null ? void 0 : e.pitch,
        mode: e == null ? void 0 : e.modeName,
        isPlaying: i.playback.isPlaying
      };
    } catch {
      return {
        pitch: "Unknown",
        mode: "Unknown",
        isPlaying: !1
      };
    }
  }
  /**
   * Announce current musical state
   */
  static announceCurrentState() {
    try {
      const e = h(i);
      if (!e) return;
      const t = `${e.pitch} ${e.modeName}`;
      this.announceToRegion(t, "sr-musical-status"), this.lastAnnouncedState = this.getCurrentMusicalState();
    } catch (e) {
      l.handle(e, u.ERROR_HANDLING.CONTEXTS.UI);
    }
  }
  /**
   * Announce specific musical information
   */
  static announceMusicalChange(e, t = {}) {
    try {
      let n = "";
      switch (e) {
        case "key-change":
          n = `Key changed to ${t.key} ${t.mode}`;
          break;
        case "mode-change":
          n = `Mode changed to ${t.mode}`;
          break;
        case "note-change":
          n = `Root note changed to ${t.note}`;
          break;
        case "playback-start":
          n = `Playing ${t.key} ${t.mode} scale`;
          break;
        case "playback-stop":
          n = "Playback stopped";
          break;
        case "playback-note":
          n = `Playing ${t.note}`;
          break;
        default:
          n = t.message || "Musical state changed";
      }
      this.queueAnnouncement(n);
    } catch (n) {
      l.handle(n, u.ERROR_HANDLING.CONTEXTS.UI);
    }
  }
  /**
   * Announce interaction guidance
   */
  static announceInteractionStart(e) {
    const n = {
      "wheel-drag": "Dragging wheel ring. Move to change musical key.",
      "belt-drag": "Dragging belt. Move to change scale degrees.",
      "chromatic-drag": "Dragging chromatic ring. Move to change perspective.",
      "playback-start": "Scale playback started.",
      "settings-open": "Settings panel opened.",
      "tutorial-start": "Tutorial started. Follow the instructions to learn the interface."
    }[e];
    n && this.queueAnnouncement(n, "polite");
  }
  /**
   * Provide detailed musical context
   */
  static announceMusicalContext(e = !1) {
    try {
      const t = h(i);
      if (!t) return;
      let n = `Current key: ${t.pitch} ${t.modeName}`;
      if (e) {
        const a = this.getScaleNotes(t);
        a.length > 0 && (n += `. Scale notes: ${a.join(", ")}`);
        const r = this.getModeDescription(t.modeName);
        r && (n += `. ${r}`);
      }
      this.queueAnnouncement(n, "polite");
    } catch (t) {
      l.handle(t, u.ERROR_HANDLING.CONTEXTS.UI);
    }
  }
  /**
   * Get scale notes for current key
   */
  static getScaleNotes(e) {
    try {
      const t = b(i);
      return [];
    } catch {
      return [];
    }
  }
  /**
   * Get description of musical mode
   */
  static getModeDescription(e) {
    return {
      Major: "A bright, happy sounding mode",
      Minor: "A darker, more melancholic mode",
      Dorian: "A minor mode with a raised 6th degree",
      Phrygian: "A minor mode with a lowered 2nd degree",
      Lydian: "A major mode with a raised 4th degree",
      Mixolydian: "A major mode with a lowered 7th degree",
      Locrian: "A diminished mode, rarely used in practice"
    }[e] || "";
  }
  /**
   * Announce UI state changes
   */
  static announceUIChange(e, t = {}) {
    const a = {
      "orientation-change": `Layout changed to ${t.orientation}`,
      "theme-change": `Theme changed to ${t.theme} mode`,
      "accidental-change": `${t.accidentalType} names ${t.enabled ? "enabled" : "disabled"}`,
      "sidebar-toggle": `Settings ${t.open ? "opened" : "closed"}`,
      "focus-change": `Focus moved to ${t.element}`
    }[e] || t.message;
    a && this.queueAnnouncement(a);
  }
  /**
   * Queue announcement to prevent overwhelming screen readers
   */
  static queueAnnouncement(e, t = "polite") {
    this.announcementQueue.push({ message: e, priority: t, timestamp: Date.now() }), this.isProcessingQueue || this.processAnnouncementQueue();
  }
  /**
   * Process announcement queue with rate limiting
   */
  static async processAnnouncementQueue() {
    for (this.isProcessingQueue = !0; this.announcementQueue.length > 0; ) {
      const e = this.announcementQueue.shift();
      e && (Date.now() - e.timestamp > 5e3 || (this.announceToRegion(
        e.message,
        e.priority === "assertive" ? "sr-urgent-announcements" : "sr-main-announcements"
      ), await new Promise((t) => setTimeout(t, 500))));
    }
    this.isProcessingQueue = !1;
  }
  /**
   * Announce message to specific ARIA live region
   */
  static announceToRegion(e, t) {
    try {
      const n = document.getElementById(t);
      if (!n || !e) return;
      n.textContent = "", requestAnimationFrame(() => {
        n.textContent = e;
      }), setTimeout(() => {
        n.textContent === e && (n.textContent = "");
      }, 2e3);
    } catch (n) {
      l.handle(n, u.ERROR_HANDLING.CONTEXTS.UI);
    }
  }
  /**
   * Announce tutorial steps
   */
  static announceTutorialStep(e, t, n = "") {
    const a = `Tutorial step ${e}. ${t}${n ? ". Hint: " + n : ""}`;
    this.queueAnnouncement(a, "assertive");
  }
  /**
   * Announce validation messages
   */
  static announceValidation(e, t) {
    const n = e === "error" ? "assertive" : "polite";
    this.queueAnnouncement(t, n);
  }
  /**
   * Provide help and instructions
   */
  static announceHelp(e = "general") {
    const t = m[e] || m.general;
    this.queueAnnouncement(t, "polite");
  }
  /**
   * Enable screen reader support
   */
  static enable() {
    this.isEnabled = !0, this.queueAnnouncement("Screen reader support enabled");
  }
  /**
   * Disable screen reader support
   */
  static disable() {
    this.isEnabled = !1, this.queueAnnouncement("Screen reader support disabled");
  }
  /**
   * Emergency announcement (highest priority)
   */
  static emergencyAnnounce(e) {
    const t = document.getElementById("sr-urgent-announcements");
    t && (t.textContent = e);
  }
  /**
   * Clean up screen reader elements
   */
  static cleanup() {
    ["sr-main-announcements", "sr-urgent-announcements", "sr-musical-status"].forEach((e) => {
      const t = document.getElementById(e);
      t && t.remove();
    }), this.announcementQueue = [], this.isProcessingQueue = !1;
  }
  /**
   * Get screen reader status
   */
  static getStatus() {
    return {
      isEnabled: this.isEnabled,
      queueLength: this.announcementQueue.length,
      isProcessingQueue: this.isProcessingQueue,
      lastAnnouncedState: this.lastAnnouncedState
    };
  }
}
c(d, "isEnabled", !0), c(d, "lastAnnouncedState", null), c(d, "announcementQueue", []), c(d, "isProcessingQueue", !1);
export {
  d as ScreenReaderManager
};
//# sourceMappingURL=ScreenReaderManager-D_Z-iSMM.js.map
