/**
 * Paths to all 8 avatar SVG assets
 */
export type AvatarAssetSet = {
  nosmile_nowave: string;
  smile_nowave: string;
  smile_wave: string;
  talk_mouthclosed: string;
  talk_mouthopen1: string;
  talk_mouthopen2: string;
  talk_mouthopen3: string;
  talk_mouthopen4: string;
};

/**
 * Visual states the avatar can be in
 */
export type AvatarVisualState =
  | "hidden"
  | "entering"
  | "idle_smile"
  | "pre_speak_wave"
  | "talking"
  | "feedback_bad";

/**
 * Options for the speak() method
 */
export type SpeakOptions = {
  /** Language code (default: "en-CA") */
  lang?: string;
  /** Optional persisted voice URI */
  voiceURI?: string;
  /** Speech rate (default: 0.92) */
  rate?: number;
  /** Speech pitch (default: 1.0) */
  pitch?: number;
  /** Speech volume (default: 1.0) */
  volume?: number;
  /** Chunking strategy (default: "sentence") */
  chunking?: "sentence" | "none";
  /** Duration of pre-speak wave cue in ms (default: 450) */
  preSpeakWaveMs?: number;
  /** Duration per frame during mouth burst animation in ms (default: 45) */
  burstFrameMs?: number;
  /** Maximum frames in a burst sequence (default: 8) */
  burstMaxFrames?: number;
  /** Range for fallback pulse timing [min, max] in ms (default: [120, 190]) */
  fallbackPulseRangeMs?: [number, number];
  /** Debounce time for boundary pulse events in ms (default: 60) */
  boundaryPulseDebounceMs?: number;
};

/**
 * Options for creating a TalkingAvatarController
 */
export type TalkingAvatarOptions = {
  /** Paths to all 8 avatar SVGs */
  assets: AvatarAssetSet;
  /** DOM element to mount the avatar into */
  mount: HTMLElement;
  /** Callback when visual state changes */
  onStateChange?: (state: AvatarVisualState) => void;
  /** Enable debug logging */
  debug?: boolean;
};

/**
 * Public API for the talking avatar controller
 */
export type TalkingAvatarController = {
  /** The avatar's root DOM element */
  el: HTMLElement;
  /** Show or hide the avatar */
  setVisible(visible: boolean): void;
  /** Slide the avatar in and show idle_smile state */
  enter(): Promise<void>;
  /** Set bad feedback state (shows nosmile_nowave when not speaking) */
  setFeedbackBad(active: boolean): void;
  /** Speak text with optional configuration */
  speak(textOrHtml: string, opts?: SpeakOptions): Promise<void>;
  /** Cancel current speech and return to idle */
  cancel(): void;
  /** Pause current speech */
  pause(): void;
  /** Resume paused speech */
  resume(): void;
  /** Get available voices asynchronously */
  listVoices(): Promise<SpeechSynthesisVoice[]>;
  /** Set preferred voice by URI */
  setVoiceURI(uri: string | undefined): void;
  /** Set default speech volume for current and future utterances */
  setVolume(volume: number): void;
  /** Clean up resources and remove from DOM */
  dispose(): void;
};

/**
 * Keys for mouth animation frames
 */
export type MouthFrameKey =
  | "talk_mouthclosed"
  | "talk_mouthopen1"
  | "talk_mouthopen2"
  | "talk_mouthopen3"
  | "talk_mouthopen4";

/**
 * All asset keys
 */
export type AvatarAssetKey = keyof AvatarAssetSet;
