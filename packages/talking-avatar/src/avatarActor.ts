import type { AvatarVisualState, MouthFrameKey, SpeakOptions } from "./types.ts";
import type { AvatarViewDom } from "./avatarViewDom.ts";

/**
 * Default animation timing options
 */
const DEFAULT_BURST_FRAME_MS = 90;
const DEFAULT_BURST_MAX_FRAMES = 8;
const DEFAULT_FALLBACK_PULSE_RANGE: [number, number] = [120, 190];
const DEFAULT_BOUNDARY_DEBOUNCE_MS = 60;

/**
 * Mouth frames for animation (excluding closed)
 */
const MOUTH_OPEN_FRAMES: MouthFrameKey[] = [
  "talk_mouthopen1",
  "talk_mouthopen2",
  "talk_mouthopen3",
  "talk_mouthopen4",
];

export type AvatarActorOptions = {
  view: AvatarViewDom;
  onStateChange?: (state: AvatarVisualState) => void;
  debug?: boolean;
};

export type AvatarActor = {
  /** Current visual state */
  getState(): AvatarVisualState;
  /** Set feedback bad state */
  setFeedbackBad(active: boolean): void;
  /** Start pre-speak wave animation */
  startWave(durationMs: number): Promise<void>;
  /** Start talking animation */
  startTalking(opts?: Partial<SpeakOptions>): void;
  /** Stop talking and return to idle */
  stopTalking(): void;
  /** Trigger a mouth burst (from speech pulse) */
  speechPulse(): void;
  /** Enter/slide-in animation */
  enter(): Promise<void>;
  /** Hide avatar */
  hide(): void;
  /** Clean up */
  dispose(): void;
};

/**
 * Create the avatar actor (state machine + mouth animation engine)
 */
export function createAvatarActor(opts: AvatarActorOptions): AvatarActor {
  const { view, onStateChange, debug } = opts;

  let state: AvatarVisualState = "hidden";
  let feedbackBad = false;
  let isSpeaking = false;

  // Animation timers
  let burstTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let fallbackPulserTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let burstFrameIndex = 0;
  let burstSequence: MouthFrameKey[] = [];

  // Current animation options
  let burstFrameMs = DEFAULT_BURST_FRAME_MS;
  let burstMaxFrames = DEFAULT_BURST_MAX_FRAMES;
  let fallbackPulseRange = DEFAULT_FALLBACK_PULSE_RANGE;
  let boundaryDebounceMs = DEFAULT_BOUNDARY_DEBOUNCE_MS;
  let lastBoundaryPulseTime = 0;

  const log = debug
    ? (...args: unknown[]) => console.log("[AvatarActor]", ...args)
    : () => {};

  const setState = (newState: AvatarVisualState) => {
    if (state === newState) return;
    log(`State: ${state} -> ${newState}`);
    state = newState;
    onStateChange?.(newState);
  };

  const getIdleState = (): AvatarVisualState => {
    return feedbackBad ? "feedback_bad" : "idle_smile";
  };

  const updateViewForState = () => {
    switch (state) {
      case "hidden":
        view.setVisible(false);
        break;
      case "entering":
      case "idle_smile":
        view.setSvg("smile_nowave");
        break;
      case "pre_speak_wave":
        view.setSvg("smile_wave");
        break;
      case "talking":
        // Mouth animation handles this
        break;
      case "feedback_bad":
        view.setSvg("nosmile_nowave");
        break;
    }
  };

  const clearBurstTimeout = () => {
    if (burstTimeoutId !== null) {
      clearTimeout(burstTimeoutId);
      burstTimeoutId = null;
    }
  };

  const clearFallbackPulser = () => {
    if (fallbackPulserTimeoutId !== null) {
      clearTimeout(fallbackPulserTimeoutId);
      fallbackPulserTimeoutId = null;
    }
  };

  /**
   * Generate a random mouth burst sequence
   * Picks random open frames and ensures we end on closed
   */
  const generateBurstSequence = (): MouthFrameKey[] => {
    const numFrames = 3 + Math.floor(Math.random() * (burstMaxFrames - 3));
    const seq: MouthFrameKey[] = [];

    for (let i = 0; i < numFrames; i++) {
      // Alternate between open and potentially closed
      if (i === numFrames - 1) {
        // Always end on closed
        seq.push("talk_mouthclosed");
      } else if (i % 2 === 0) {
        // Open frame
        const openFrame =
          MOUTH_OPEN_FRAMES[Math.floor(Math.random() * MOUTH_OPEN_FRAMES.length)];
        seq.push(openFrame);
      } else {
        // Either closed or another open (for variety)
        if (Math.random() < 0.3) {
          seq.push("talk_mouthclosed");
        } else {
          const openFrame =
            MOUTH_OPEN_FRAMES[Math.floor(Math.random() * MOUTH_OPEN_FRAMES.length)];
          seq.push(openFrame);
        }
      }
    }

    return seq;
  };

  /**
   * Execute the next frame in the burst sequence
   */
  const stepBurst = () => {
    log(`stepBurst: frame ${burstFrameIndex}/${burstSequence.length}, isSpeaking=${isSpeaking}, state=${state}`);

    if (!isSpeaking || state !== "talking") {
      // Speech ended, ensure closed mouth
      log("stepBurst: stopping - not speaking or not in talking state");
      view.setSvg("talk_mouthclosed");
      clearBurstTimeout();
      return;
    }

    if (burstFrameIndex >= burstSequence.length) {
      // Burst complete, wait for next pulse
      log("stepBurst: burst complete");
      view.setSvg("talk_mouthclosed");
      clearBurstTimeout();
      return;
    }

    const frame = burstSequence[burstFrameIndex];
    log(`stepBurst: setting frame to ${frame}`);
    view.setSvg(frame);
    burstFrameIndex++;

    burstTimeoutId = setTimeout(stepBurst, burstFrameMs);
  };

  /**
   * Start a new mouth burst
   */
  const startBurst = () => {
    log(`startBurst: isSpeaking=${isSpeaking}, state=${state}`);
    if (!isSpeaking || state !== "talking") {
      log("startBurst: skipping - conditions not met");
      return;
    }

    clearBurstTimeout();
    burstSequence = generateBurstSequence();
    log(`startBurst: generated sequence with ${burstSequence.length} frames`);
    burstFrameIndex = 0;
    stepBurst();
  };

  /**
   * Get a random delay for the fallback pulser
   */
  const getRandomPulseDelay = (): number => {
    const [min, max] = fallbackPulseRange;
    return min + Math.random() * (max - min);
  };

  /**
   * Start the fallback pulser that keeps mouth moving
   */
  const startFallbackPulser = () => {
    log("startFallbackPulser: starting");
    clearFallbackPulser();

    const schedulePulse = () => {
      if (!isSpeaking || state !== "talking") {
        log("schedulePulse: stopping - conditions not met");
        return;
      }

      const delay = getRandomPulseDelay();
      log(`schedulePulse: scheduling next pulse in ${delay.toFixed(0)}ms`);
      fallbackPulserTimeoutId = setTimeout(() => {
        if (isSpeaking && state === "talking") {
          log("schedulePulse: firing pulse");
          startBurst();
          schedulePulse();
        }
      }, delay);
    };

    schedulePulse();
  };

  /**
   * Handle a speech pulse (from boundary event)
   */
  const speechPulse = () => {
    if (!isSpeaking || state !== "talking") return;

    const now = Date.now();
    if (now - lastBoundaryPulseTime < boundaryDebounceMs) {
      return; // Debounce
    }
    lastBoundaryPulseTime = now;

    startBurst();
  };

  const enter = async (): Promise<void> => {
    setState("entering");
    await view.enter();
    setState(getIdleState());
    updateViewForState();
  };

  const hide = () => {
    stopTalking();
    setState("hidden");
    view.setVisible(false);
  };

  const setFeedbackBad = (active: boolean) => {
    feedbackBad = active;

    // Only update view if not currently talking
    if (!isSpeaking && state !== "hidden" && state !== "entering") {
      setState(getIdleState());
      updateViewForState();
    }
  };

  const startWave = (durationMs: number): Promise<void> => {
    return new Promise((resolve) => {
      setState("pre_speak_wave");
      updateViewForState();

      setTimeout(() => {
        resolve();
      }, durationMs);
    });
  };

  const startTalking = (animOpts?: Partial<SpeakOptions>) => {
    log("startTalking: called");
    // Apply animation options
    burstFrameMs = animOpts?.burstFrameMs ?? DEFAULT_BURST_FRAME_MS;
    burstMaxFrames = animOpts?.burstMaxFrames ?? DEFAULT_BURST_MAX_FRAMES;
    fallbackPulseRange =
      animOpts?.fallbackPulseRangeMs ?? DEFAULT_FALLBACK_PULSE_RANGE;
    boundaryDebounceMs =
      animOpts?.boundaryPulseDebounceMs ?? DEFAULT_BOUNDARY_DEBOUNCE_MS;

    isSpeaking = true;
    setState("talking");
    log("startTalking: state set to talking, isSpeaking=true");
    view.setSvg("talk_mouthclosed");

    // Start initial burst and fallback pulser
    log("startTalking: starting initial burst and fallback pulser");
    startBurst();
    startFallbackPulser();
  };

  const stopTalking = () => {
    isSpeaking = false;
    clearBurstTimeout();
    clearFallbackPulser();

    // Transition to idle state immediately (no delay)
    setState(getIdleState());
    updateViewForState();
  };

  const dispose = () => {
    clearBurstTimeout();
    clearFallbackPulser();
    view.dispose();
  };

  return {
    getState: () => state,
    setFeedbackBad,
    startWave,
    startTalking,
    stopTalking,
    speechPulse,
    enter,
    hide,
    dispose,
  };
}
