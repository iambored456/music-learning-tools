import template from './template.html?raw';
import './styles.css';

type Direction = -1 | 1;
type CleanupFn = () => void;
type SoundGenerator = () => void;

type VisualMode = 'arc' | 'pendulum' | 'orbit';
type PulseKind = 'beat' | 'subdivision';

type ToneOptions = {
  type: OscillatorType;
  frequency: number;
  durationSeconds: number;
  gainScale?: number;
  bandpass?: {
    frequency: number;
    q: number;
  };
};

type BarState = {
  primary: string;
  highlight: string;
  highlighted: boolean;
};

type BallState = {
  x: number;
  radius: number;
  speed: number;
  direction: Direction;
};

type PulseBurst = {
  kind: PulseKind;
  createdAt: number;
  color: string;
};

type ViewportState = {
  width: number;
  height: number;
  dpr: number;
};

type ModeDescriptor = {
  title: string;
  subtitle: string;
};

type VisualMetronomePreferences = {
  version: 1;
  bpm: number;
  volume: number;
  ballRadius: number;
  amplitude: number;
  microbeats: number;
  currentSound: string;
  mode: VisualMode;
  showPath: boolean;
  canvasFlashEnabled: boolean;
  leftBarPrimary: string;
  rightBarPrimary: string;
};

type VisualMetronomeElements = {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  canvasContainer: HTMLElement;
  tapTempo: HTMLButtonElement;
  bpmSelect: HTMLSelectElement;
  bpmMinus: HTMLButtonElement;
  bpmPlus: HTMLButtonElement;
  startStop: HTMLButtonElement;
  soundSelect: HTMLSelectElement;
  volumeSlider: HTMLInputElement;
  ballSizeDecrease: HTMLButtonElement;
  ballSizeIncrease: HTMLButtonElement;
  flashToggle: HTMLButtonElement;
  pathHeightDecrease: HTMLButtonElement;
  pathHeightIncrease: HTMLButtonElement;
  togglePath: HTMLButtonElement;
  leftBarColor: HTMLInputElement;
  rightBarColor: HTMLInputElement;
  microbeatButtons: HTMLButtonElement[];
  modeButtons: HTMLButtonElement[];
  modeTitle: HTMLElement;
  hudTempo: HTMLElement;
  hudSubdivision: HTMLElement;
};

type AudioContextLike = AudioContext;
type AudioContextCtor = typeof AudioContext;

const MODE_DESCRIPTORS: Record<VisualMode, ModeDescriptor> = {
  arc: {
    title: 'Arc Bounce',
    subtitle: 'Parabolic travel between side rails.',
  },
  pendulum: {
    title: 'Pendulum',
    subtitle: 'Classical swing with weighted bob.',
  },
  orbit: {
    title: 'Orbit Pulse',
    subtitle: 'Circular sweep with expanding pulse rings.',
  },
};

const WALL_WIDTH = 34;
const DEFAULT_BPM = 60;
const DEFAULT_VOLUME = 0.25;
const DEFAULT_BALL_RADIUS = 62;
const MIN_BALL_RADIUS = 12;
const MAX_BALL_RADIUS = 150;
const DEFAULT_AMPLITUDE = 150;
const AMPLITUDE_MIN = 20;
const AMPLITUDE_MAX = 360;
const BPM_MIN = 1;
const BPM_MAX = 420;
const MICROBEAT_MIN = 1;
const MICROBEAT_MAX = 4;
const HIGHLIGHT_DURATION_MS = 140;
const SAFE_MIN_GAIN = 0.00001;
const TAP_RESET_MS = 2000;
const MAX_TAP_HISTORY = 8;
const BEAT_BURST_LIFE_MS = 900;
const SUBDIVISION_BURST_LIFE_MS = 550;
const SETTINGS_STORAGE_KEY = 'visualMetronomePreferences.v1';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampInt(value: number, min: number, max: number): number {
  return Math.round(clamp(value, min, max));
}

function normalizeBase(value?: string): string {
  if (!value) return '/';
  let base = value;
  if (!base.startsWith('/')) base = `/${base}`;
  if (!base.endsWith('/')) base = `${base}/`;
  return base;
}

function resolveHubBase(baseUrl?: string): string {
  const normalized = normalizeBase(baseUrl);
  const appSegment = 'visual-metronome/';
  if (!normalized.endsWith(appSegment)) {
    return normalized;
  }
  const withoutApp = normalized.slice(0, -appSegment.length);
  return withoutApp.length > 0 ? withoutApp : '/';
}

function queryRequired<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector(selector);
  if (!element) {
    throw new Error(`Visual Metronome: missing required element "${selector}"`);
  }
  return element as T;
}

function getAudioContextCtor(): AudioContextCtor | null {
  const windowWithWebkit = window as Window & { webkitAudioContext?: AudioContextCtor };
  return window.AudioContext ?? windowWithWebkit.webkitAudioContext ?? null;
}

function isVisualMode(value: unknown): value is VisualMode {
  return value === 'arc' || value === 'pendulum' || value === 'orbit';
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

class VisualMetronomeApp {
  private readonly elements: VisualMetronomeElements;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly cleanupFns: CleanupFn[] = [];
  private readonly timeoutIds = new Set<number>();
  private readonly audioContext: AudioContextLike | null;
  private readonly soundGenerators: Record<string, SoundGenerator>;

  private readonly viewport: ViewportState = {
    width: 1,
    height: 1,
    dpr: 1,
  };

  private bpm = DEFAULT_BPM;
  private beatInterval = 60000 / DEFAULT_BPM;
  private volume = DEFAULT_VOLUME;
  private ballRadius = DEFAULT_BALL_RADIUS;
  private amplitude = DEFAULT_AMPLITUDE;
  private microbeats = MICROBEAT_MIN;
  private currentSound = 'Beep 1';
  private mode: VisualMode = 'arc';

  private leftBoundary = 0;
  private rightBoundary = 0;
  private ball: BallState = {
    x: 0,
    radius: DEFAULT_BALL_RADIUS,
    speed: 0,
    direction: 1,
  };

  private isPlaying = false;
  private showPath = false;
  private canvasFlashEnabled = false;
  private flashColor: string | null = null;
  private leftBar: BarState = {
    primary: '#2196F3',
    highlight: '#2196F3',
    highlighted: false,
  };
  private rightBar: BarState = {
    primary: '#4CAF50',
    highlight: '#4CAF50',
    highlighted: false,
  };

  private faceAngle = 0;
  private lastTimestamp: number | null = null;
  private rafHandle: number | null = null;
  private tapTimes: number[] = [];
  private lastSubdivisionStep = 0;
  private lastBeatAt = performance.now();
  private pulses: PulseBurst[] = [];
  private destroyed = false;

  constructor(private readonly container: HTMLElement) {
    this.container.innerHTML = template;

    this.elements = this.collectElements();
    const context = this.elements.canvas.getContext('2d');
    if (!context) {
      throw new Error('Visual Metronome: failed to acquire 2D rendering context');
    }
    this.ctx = context;

    this.audioContext = this.createAudioContext();
    this.leftBar.highlight = this.lightenColor(this.leftBar.primary, 42);
    this.rightBar.highlight = this.lightenColor(this.rightBar.primary, 42);
    this.soundGenerators = this.createSoundGenerators();

    this.applyNavigationRoutes();
    this.populateBpmSelect();
    this.populateSoundSelect();
    this.loadPreferences();
    this.updateMicrobeatButtons();
    this.updateModeButtons();
    this.updateReadouts();
    this.updateButtonCopy();
    this.updateCanvasSize();
    this.recalculateBoundaries(false);
    this.updateSpeed();
    this.bindEvents();
    this.draw();
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;

    this.stopPlayback();
    this.clearScheduledTimeouts();
    for (const cleanup of this.cleanupFns) {
      cleanup();
    }
    this.cleanupFns.length = 0;
    this.tapTimes = [];
    this.pulses = [];

    if (this.audioContext && this.audioContext.state !== 'closed') {
      void this.audioContext.close().catch(() => {
        // Best effort close.
      });
    }

    this.container.innerHTML = '';
  }
  private createAudioContext(): AudioContextLike | null {
    const AudioContextClass = getAudioContextCtor();
    return AudioContextClass ? new AudioContextClass() : null;
  }

  private collectElements(): VisualMetronomeElements {
    const root = queryRequired<HTMLElement>(this.container, '#page');
    const microbeatButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('.microbeat-toggle'));
    const modeButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('.mode-toggle'));

    if (microbeatButtons.length === 0) {
      throw new Error('Visual Metronome: expected microbeat toggle buttons');
    }
    if (modeButtons.length === 0) {
      throw new Error('Visual Metronome: expected mode toggle buttons');
    }

    return {
      root,
      canvas: queryRequired<HTMLCanvasElement>(root, '#metronome-canvas'),
      canvasContainer: queryRequired<HTMLElement>(root, '#canvas-container'),
      tapTempo: queryRequired<HTMLButtonElement>(root, '#tap-tempo'),
      bpmSelect: queryRequired<HTMLSelectElement>(root, '#bpm-select'),
      bpmMinus: queryRequired<HTMLButtonElement>(root, '#bpm-minus'),
      bpmPlus: queryRequired<HTMLButtonElement>(root, '#bpm-plus'),
      startStop: queryRequired<HTMLButtonElement>(root, '#start-stop'),
      soundSelect: queryRequired<HTMLSelectElement>(root, '#sound-select'),
      volumeSlider: queryRequired<HTMLInputElement>(root, '#volume-slider'),
      ballSizeDecrease: queryRequired<HTMLButtonElement>(root, '#ball-size-decrease'),
      ballSizeIncrease: queryRequired<HTMLButtonElement>(root, '#ball-size-increase'),
      flashToggle: queryRequired<HTMLButtonElement>(root, '#flash-toggle'),
      pathHeightDecrease: queryRequired<HTMLButtonElement>(root, '#path-height-decrease'),
      pathHeightIncrease: queryRequired<HTMLButtonElement>(root, '#path-height-increase'),
      togglePath: queryRequired<HTMLButtonElement>(root, '#toggle-path'),
      leftBarColor: queryRequired<HTMLInputElement>(root, '#left-bar-color'),
      rightBarColor: queryRequired<HTMLInputElement>(root, '#right-bar-color'),
      microbeatButtons,
      modeButtons,
      modeTitle: queryRequired<HTMLElement>(root, '#visual-mode-title'),
      hudTempo: queryRequired<HTMLElement>(root, '#hud-tempo'),
      hudSubdivision: queryRequired<HTMLElement>(root, '#hud-subdivision'),
    };
  }

  private applyNavigationRoutes(): void {
    const hubBase = resolveHubBase(import.meta.env.BASE_URL);
    const navLinks = this.elements.root.querySelectorAll<HTMLAnchorElement>('a[data-route]');
    navLinks.forEach((link) => {
      const route = (link.dataset.route ?? '').replace(/^\/+/, '');
      link.href = route ? `${hubBase}${route}` : hubBase;
    });
  }

  private populateBpmSelect(): void {
    const select = this.elements.bpmSelect;
    select.innerHTML = '';
    for (let value = 30; value <= 220; value += 10) {
      const option = document.createElement('option');
      option.value = String(value);
      option.textContent = String(value);
      select.appendChild(option);
    }
    this.syncBpmSelect();
  }

  private syncBpmSelect(): void {
    const value = String(this.bpm);
    const select = this.elements.bpmSelect;
    let option = select.querySelector<HTMLOptionElement>(`option[value="${value}"]`);

    if (!option) {
      option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      const sortedOptions = Array.from(select.options);
      const insertBefore = sortedOptions.find((candidate) => Number(candidate.value) > this.bpm) ?? null;
      select.insertBefore(option, insertBefore);
    }

    select.value = value;
  }

  private populateSoundSelect(): void {
    const select = this.elements.soundSelect;
    select.innerHTML = '';

    const names = Object.keys(this.soundGenerators);
    if (names.length > 0 && !names.includes(this.currentSound)) {
      this.currentSound = names[0];
    }

    for (const name of names) {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    }

    if (this.currentSound) {
      select.value = this.currentSound;
    }
  }

  private loadPreferences(): void {
    try {
      const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as Partial<VisualMetronomePreferences>;
      if (typeof parsed.bpm === 'number') {
        this.bpm = clampInt(parsed.bpm, BPM_MIN, BPM_MAX);
        this.beatInterval = 60000 / this.bpm;
      }

      if (typeof parsed.volume === 'number') {
        this.volume = clamp(parsed.volume, 0, 1);
      }

      if (typeof parsed.ballRadius === 'number') {
        this.ballRadius = clampInt(parsed.ballRadius, MIN_BALL_RADIUS, MAX_BALL_RADIUS);
      }

      if (typeof parsed.amplitude === 'number') {
        this.amplitude = clampInt(parsed.amplitude, AMPLITUDE_MIN, AMPLITUDE_MAX);
      }

      if (typeof parsed.microbeats === 'number') {
        this.microbeats = clampInt(parsed.microbeats, MICROBEAT_MIN, MICROBEAT_MAX);
      }

      if (typeof parsed.currentSound === 'string' && this.soundGenerators[parsed.currentSound]) {
        this.currentSound = parsed.currentSound;
      }

      if (isVisualMode(parsed.mode)) {
        this.mode = parsed.mode;
      }

      if (typeof parsed.showPath === 'boolean') {
        this.showPath = parsed.showPath;
      }

      if (typeof parsed.canvasFlashEnabled === 'boolean') {
        this.canvasFlashEnabled = parsed.canvasFlashEnabled;
      }

      if (isHexColor(parsed.leftBarPrimary)) {
        this.leftBar.primary = parsed.leftBarPrimary;
        this.leftBar.highlight = this.lightenColor(this.leftBar.primary, 42);
      }

      if (isHexColor(parsed.rightBarPrimary)) {
        this.rightBar.primary = parsed.rightBarPrimary;
        this.rightBar.highlight = this.lightenColor(this.rightBar.primary, 42);
      }

      this.elements.volumeSlider.value = this.volume.toFixed(2);
      this.elements.leftBarColor.value = this.leftBar.primary;
      this.elements.rightBarColor.value = this.rightBar.primary;
      this.elements.soundSelect.value = this.currentSound;
      this.syncBpmSelect();
    } catch {
      // Ignore malformed or unavailable storage.
    }
  }

  private persistPreferences(): void {
    try {
      const payload: VisualMetronomePreferences = {
        version: 1,
        bpm: this.bpm,
        volume: this.volume,
        ballRadius: this.ballRadius,
        amplitude: this.amplitude,
        microbeats: this.microbeats,
        currentSound: this.currentSound,
        mode: this.mode,
        showPath: this.showPath,
        canvasFlashEnabled: this.canvasFlashEnabled,
        leftBarPrimary: this.leftBar.primary,
        rightBarPrimary: this.rightBar.primary,
      };
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage write failures.
    }
  }

  private updateReadouts(): void {
    this.elements.modeTitle.textContent = MODE_DESCRIPTORS[this.mode].title;
    this.elements.modeTitle.setAttribute('title', MODE_DESCRIPTORS[this.mode].subtitle);
    this.elements.hudTempo.textContent = `${this.bpm} BPM`;
    this.elements.hudSubdivision.textContent = `${this.microbeats} microbeat${this.microbeats > 1 ? 's' : ''}`;
  }

  private updateButtonCopy(): void {
    this.elements.startStop.textContent = this.isPlaying ? 'Stop' : 'Start';
    this.elements.flashToggle.textContent = `Flash: ${this.canvasFlashEnabled ? 'On' : 'Off'}`;
    this.elements.togglePath.textContent = this.showPath ? 'Hide Guide' : 'Show Guide';
  }

  private updateModeButtons(): void {
    this.elements.modeButtons.forEach((button) => {
      const buttonMode = button.dataset.mode as VisualMode | undefined;
      const selected = buttonMode === this.mode;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
  }

  private updateMicrobeatButtons(): void {
    this.elements.microbeatButtons.forEach((button) => {
      const buttonValue = Number(button.dataset.value);
      const selected = Number.isFinite(buttonValue) && buttonValue <= this.microbeats;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
  }

  private bindEvents(): void {
    this.listen(window, 'resize', this.handleResize);
    this.listen(document, 'keydown', (event) => this.handleKeyboardShortcut(event as KeyboardEvent));
    this.listen(this.elements.tapTempo, 'click', () => this.handleTapTempo());
    this.listen(this.elements.bpmSelect, 'change', () => {
      const nextBpm = Number(this.elements.bpmSelect.value);
      if (Number.isFinite(nextBpm)) {
        this.setBpm(nextBpm);
      }
    });
    this.listen(this.elements.bpmPlus, 'click', () => this.setBpm(this.bpm + 1));
    this.listen(this.elements.bpmMinus, 'click', () => this.setBpm(this.bpm - 1));
    this.listen(this.elements.startStop, 'click', () => this.togglePlayback());
    this.listen(this.elements.soundSelect, 'change', () => {
      this.currentSound = this.elements.soundSelect.value;
      this.persistPreferences();
    });
    this.listen(this.elements.volumeSlider, 'input', () => {
      this.volume = clamp(Number(this.elements.volumeSlider.value), 0, 1);
      this.persistPreferences();
    });
    this.listen(this.elements.ballSizeIncrease, 'click', () => this.setBallRadius(this.ballRadius + 3));
    this.listen(this.elements.ballSizeDecrease, 'click', () => this.setBallRadius(this.ballRadius - 3));
    this.listen(this.elements.flashToggle, 'click', () => {
      this.canvasFlashEnabled = !this.canvasFlashEnabled;
      this.updateButtonCopy();
      this.persistPreferences();
      this.draw();
    });
    this.listen(this.elements.pathHeightIncrease, 'click', () => this.setPathHeight(this.amplitude + 12));
    this.listen(this.elements.pathHeightDecrease, 'click', () => this.setPathHeight(this.amplitude - 12));
    this.listen(this.elements.togglePath, 'click', () => {
      this.showPath = !this.showPath;
      this.updateButtonCopy();
      this.persistPreferences();
      this.draw();
    });
    this.listen(this.elements.leftBarColor, 'input', () => {
      this.leftBar.primary = this.elements.leftBarColor.value;
      this.leftBar.highlight = this.lightenColor(this.leftBar.primary, 42);
      this.persistPreferences();
      this.draw();
    });
    this.listen(this.elements.rightBarColor, 'input', () => {
      this.rightBar.primary = this.elements.rightBarColor.value;
      this.rightBar.highlight = this.lightenColor(this.rightBar.primary, 42);
      this.persistPreferences();
      this.draw();
    });

    this.elements.microbeatButtons.forEach((button) => {
      this.listen(button, 'click', () => {
        const selectedValue = Number(button.dataset.value);
        if (Number.isFinite(selectedValue)) {
          this.setMicrobeats(selectedValue);
        }
      });
    });

    this.elements.modeButtons.forEach((button) => {
      this.listen(button, 'click', () => {
        const selectedMode = button.dataset.mode as VisualMode | undefined;
        if (selectedMode) {
          this.setMode(selectedMode);
        }
      });
    });
  }

  private listen(target: EventTarget, event: string, handler: EventListener): void {
    target.addEventListener(event, handler);
    this.cleanupFns.push(() => {
      target.removeEventListener(event, handler);
    });
  }

  private handleResize = (): void => {
    this.updateCanvasSize();
    this.recalculateBoundaries(true);
    this.updateSpeed();
    this.draw();
  };

  private updateCanvasSize(): void {
    const width = Math.max(1, this.elements.canvasContainer.clientWidth);
    const height = Math.max(1, this.elements.canvasContainer.clientHeight);
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    this.viewport.width = width;
    this.viewport.height = height;
    this.viewport.dpr = dpr;

    this.elements.canvas.width = Math.round(width * dpr);
    this.elements.canvas.height = Math.round(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private recalculateBoundaries(preserveProgress: boolean): void {
    const previousDistance = this.rightBoundary - this.leftBoundary;
    const previousProgress =
      preserveProgress && previousDistance > 0
        ? clamp((this.ball.x - this.leftBoundary) / previousDistance, 0, 1)
        : 0;

    this.leftBoundary = WALL_WIDTH + this.ballRadius;
    const rightCandidate = this.viewport.width - WALL_WIDTH - this.ballRadius;
    this.rightBoundary = Math.max(this.leftBoundary, rightCandidate);

    const distance = this.rightBoundary - this.leftBoundary;
    const progress = preserveProgress ? previousProgress : 0;
    this.ball.x = this.leftBoundary + distance * progress;
    this.ball.radius = this.ballRadius;
    this.lastSubdivisionStep = this.computeSubdivisionStep(this.computeHalfProgress(progress));
  }
  private setBpm(value: number): void {
    this.bpm = clampInt(value, BPM_MIN, BPM_MAX);
    this.beatInterval = 60000 / this.bpm;
    this.updateSpeed();
    this.syncBpmSelect();
    this.updateReadouts();
    this.persistPreferences();
  }

  private updateSpeed(): void {
    const distance = this.rightBoundary - this.leftBoundary;
    this.ball.speed = distance > 0 ? distance / this.beatInterval : 0;
  }

  private setBallRadius(value: number): void {
    this.ballRadius = clampInt(value, MIN_BALL_RADIUS, MAX_BALL_RADIUS);
    this.recalculateBoundaries(true);
    this.updateSpeed();
    this.persistPreferences();
    this.draw();
  }

  private setPathHeight(value: number): void {
    this.amplitude = clampInt(value, AMPLITUDE_MIN, AMPLITUDE_MAX);
    this.persistPreferences();
    this.draw();
  }

  private setMicrobeats(value: number): void {
    this.microbeats = clampInt(value, MICROBEAT_MIN, MICROBEAT_MAX);
    this.lastSubdivisionStep = this.computeSubdivisionStep(this.computeHalfProgress(this.getProgress()));
    this.updateMicrobeatButtons();
    this.updateReadouts();
    this.persistPreferences();
    this.draw();
  }

  private setMode(mode: VisualMode): void {
    if (this.mode === mode) {
      return;
    }
    this.mode = mode;
    this.updateModeButtons();
    this.updateReadouts();
    this.persistPreferences();
    this.draw();
  }

  private handleTapTempo(): void {
    const now = Date.now();
    if (this.tapTimes.length > 0 && now - this.tapTimes[this.tapTimes.length - 1] > TAP_RESET_MS) {
      this.tapTimes = [];
    }

    this.tapTimes.push(now);
    if (this.tapTimes.length > MAX_TAP_HISTORY) {
      this.tapTimes.shift();
    }

    if (this.tapTimes.length < 2) {
      return;
    }

    const intervals: number[] = [];
    for (let index = 1; index < this.tapTimes.length; index += 1) {
      intervals.push(this.tapTimes[index] - this.tapTimes[index - 1]);
    }

    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    if (avgInterval > 0) {
      this.setBpm(60000 / avgInterval);
    }
  }

  private handleKeyboardShortcut(event: KeyboardEvent): void {
    if (event.defaultPrevented) {
      return;
    }

    const active = document.activeElement;
    const isInputFocused =
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      active instanceof HTMLSelectElement;

    if (isInputFocused && event.key !== 'Escape') {
      return;
    }

    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    switch (event.key) {
      case ' ': {
        event.preventDefault();
        this.togglePlayback();
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        this.setBpm(this.bpm + 1);
        break;
      }
      case 'ArrowDown': {
        event.preventDefault();
        this.setBpm(this.bpm - 1);
        break;
      }
      case '1': {
        this.setMode('arc');
        break;
      }
      case '2': {
        this.setMode('pendulum');
        break;
      }
      case '3': {
        this.setMode('orbit');
        break;
      }
      case 'm':
      case 'M': {
        const modeOrder: VisualMode[] = ['arc', 'pendulum', 'orbit'];
        const index = modeOrder.indexOf(this.mode);
        const next = modeOrder[(index + 1) % modeOrder.length];
        this.setMode(next);
        break;
      }
      default:
        break;
    }
  }

  private togglePlayback(): void {
    if (this.isPlaying) {
      this.stopPlayback();
      return;
    }
    this.startPlayback();
  }

  private startPlayback(): void {
    this.isPlaying = true;
    this.lastTimestamp = null;
    this.lastSubdivisionStep = this.computeSubdivisionStep(this.computeHalfProgress(this.getProgress()));
    this.updateButtonCopy();
    void this.resumeAudioContext();

    if (this.rafHandle === null) {
      this.rafHandle = requestAnimationFrame(this.animate);
    }
  }

  private stopPlayback(): void {
    this.isPlaying = false;
    this.lastTimestamp = null;
    this.updateButtonCopy();

    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
  }

  private animate = (timestamp: number): void => {
    if (!this.isPlaying || this.destroyed) {
      this.rafHandle = null;
      return;
    }

    if (this.lastTimestamp === null) {
      this.lastTimestamp = timestamp;
    }

    const delta = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;
    this.ball.x += this.ball.speed * this.ball.direction * delta;

    const progress = this.getProgress();
    this.handleSubdivisionCrossings(progress);

    if (this.ball.x >= this.rightBoundary) {
      this.ball.x = this.rightBoundary;
      this.ball.direction = -1;
      this.triggerBeat('right');
    } else if (this.ball.x <= this.leftBoundary) {
      this.ball.x = this.leftBoundary;
      this.ball.direction = 1;
      this.triggerBeat('left');
    }

    this.prunePulses(timestamp);
    this.draw(timestamp);
    this.rafHandle = requestAnimationFrame(this.animate);
  };

  private handleSubdivisionCrossings(progress: number): void {
    if (this.microbeats <= 1) {
      return;
    }

    const halfProgress = this.computeHalfProgress(progress);
    const currentStep = this.computeSubdivisionStep(halfProgress);

    if (currentStep <= this.lastSubdivisionStep) {
      return;
    }

    const crossings = currentStep - this.lastSubdivisionStep;
    for (let index = 0; index < crossings; index += 1) {
      this.playSubdivisionSound();
      const blend = index % 2 === 0 ? this.leftBar.highlight : this.rightBar.highlight;
      this.enqueuePulse('subdivision', blend);
    }

    this.lastSubdivisionStep = currentStep;
  }

  private triggerBeat(side: 'left' | 'right'): void {
    this.playClick();
    this.lastBeatAt = performance.now();
    this.lastSubdivisionStep = 0;

    const bar = side === 'left' ? this.leftBar : this.rightBar;
    bar.highlighted = true;
    this.enqueuePulse('beat', bar.highlight);

    if (this.canvasFlashEnabled) {
      this.flashColor = bar.highlight;
      this.scheduleTimeout(() => {
        this.flashColor = null;
      }, HIGHLIGHT_DURATION_MS);
    }

    this.scheduleTimeout(() => {
      bar.highlighted = false;
    }, HIGHLIGHT_DURATION_MS);
  }

  private enqueuePulse(kind: PulseKind, color: string): void {
    this.pulses.push({
      kind,
      color,
      createdAt: performance.now(),
    });
  }

  private prunePulses(now: number): void {
    this.pulses = this.pulses.filter((pulse) => {
      const life = pulse.kind === 'beat' ? BEAT_BURST_LIFE_MS : SUBDIVISION_BURST_LIFE_MS;
      return now - pulse.createdAt <= life;
    });
  }

  private scheduleTimeout(callback: () => void, delayMs: number): void {
    const id = window.setTimeout(() => {
      this.timeoutIds.delete(id);
      callback();
    }, delayMs);
    this.timeoutIds.add(id);
  }

  private clearScheduledTimeouts(): void {
    this.timeoutIds.forEach((id) => clearTimeout(id));
    this.timeoutIds.clear();
  }

  private createSoundGenerators(): Record<string, SoundGenerator> {
    return {
      'Beep 1': () => this.playTone({ type: 'sine', frequency: 800, durationSeconds: 0.1 }),
      'Beep 2': () => this.playTone({ type: 'square', frequency: 600, durationSeconds: 0.1 }),
      Blip: () => this.playTone({ type: 'triangle', frequency: 1000, durationSeconds: 0.07, gainScale: 0.8 }),
      'Bongos 1': () => this.playTone({ type: 'sine', frequency: 150, durationSeconds: 0.2 }),
      'Bongos 2': () => this.playTone({ type: 'sine', frequency: 200, durationSeconds: 0.2 }),
      Clap: () => this.playClap(),
      'Cowbell 1': () =>
        this.playTone({
          type: 'square',
          frequency: 800,
          durationSeconds: 0.15,
          bandpass: { frequency: 1000, q: 10 },
        }),
      'Cowbell 2': () =>
        this.playTone({
          type: 'triangle',
          frequency: 900,
          durationSeconds: 0.15,
          bandpass: { frequency: 1100, q: 8 },
        }),
      Digital: () => this.playTone({ type: 'square', frequency: 1200, durationSeconds: 0.08 }),
    };
  }

  private playClick(): void {
    const generator = this.soundGenerators[this.currentSound];
    if (generator) {
      generator();
    }
  }

  private playSubdivisionSound(): void {
    this.playTone({
      type: 'sine',
      frequency: 620,
      durationSeconds: 0.09,
      gainScale: 0.5,
    });
  }
  private playTone(options: ToneOptions): void {
    if (!this.audioContext) {
      return;
    }

    void this.resumeAudioContext();
    const startTime = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    oscillator.type = options.type;
    oscillator.frequency.setValueAtTime(options.frequency, startTime);

    let sourceNode: AudioNode = oscillator;
    if (options.bandpass) {
      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(options.bandpass.frequency, startTime);
      filter.Q.setValueAtTime(options.bandpass.q, startTime);
      oscillator.connect(filter);
      sourceNode = filter;
    }

    const gainNode = this.audioContext.createGain();
    const gain = this.getSafeGain(this.volume * (options.gainScale ?? 1));
    gainNode.gain.setValueAtTime(gain, startTime);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(gain * 0.001, SAFE_MIN_GAIN), startTime + options.durationSeconds);

    sourceNode.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + options.durationSeconds);
  }

  private playClap(): void {
    if (!this.audioContext) {
      return;
    }

    void this.resumeAudioContext();
    const burstDuration = 0.02;
    const safeVolume = this.getSafeGain(this.volume);

    const createBurst = (delaySeconds: number): void => {
      if (!this.audioContext) {
        return;
      }
      const startTime = this.audioContext.currentTime + delaySeconds;
      const bufferSize = Math.floor(this.audioContext.sampleRate * burstDuration);
      const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
      const data = buffer.getChannelData(0);

      for (let index = 0; index < bufferSize; index += 1) {
        data[index] = Math.random() * 2 - 1;
      }

      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;

      const gainNode = this.audioContext.createGain();
      gainNode.gain.setValueAtTime(safeVolume, startTime);
      gainNode.gain.exponentialRampToValueAtTime(Math.max(safeVolume * 0.01, SAFE_MIN_GAIN), startTime + burstDuration);

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      source.start(startTime);
      source.stop(startTime + burstDuration);
    };

    createBurst(0);
    createBurst(0.03);
  }

  private async resumeAudioContext(): Promise<void> {
    if (!this.audioContext || this.audioContext.state !== 'suspended') {
      return;
    }

    try {
      await this.audioContext.resume();
    } catch {
      // Browser may block resume before user interaction.
    }
  }

  private getSafeGain(value: number): number {
    return value > 0 ? value : SAFE_MIN_GAIN;
  }

  private getProgress(): number {
    const distance = this.rightBoundary - this.leftBoundary;
    if (distance <= 0) {
      return 0;
    }
    return clamp((this.ball.x - this.leftBoundary) / distance, 0, 1);
  }

  private computeHalfProgress(progress: number): number {
    return this.ball.direction === 1 ? progress : 1 - progress;
  }

  private computeSubdivisionStep(halfProgress: number): number {
    if (this.microbeats <= 1) {
      return 0;
    }
    const step = Math.floor(clamp(halfProgress, 0, 1) * this.microbeats);
    return clampInt(step, 0, this.microbeats - 1);
  }

  private draw(timestamp = performance.now()): void {
    const width = this.viewport.width;
    const height = this.viewport.height;

    this.ctx.clearRect(0, 0, width, height);
    this.drawBackground(width, height, timestamp);
    this.drawSideRails(height);

    const progress = this.getProgress();
    const halfProgress = this.computeHalfProgress(progress);

    if (this.mode === 'arc') {
      this.drawArcVisualization(progress, height);
    } else if (this.mode === 'pendulum') {
      this.drawPendulumVisualization(halfProgress, width, height);
    } else {
      this.drawOrbitVisualization(halfProgress, width, height, timestamp);
    }
  }

  private drawBackground(width: number, height: number, timestamp: number): void {
    const baseGradient = this.ctx.createLinearGradient(0, 0, 0, height);

    if (this.mode === 'arc') {
      baseGradient.addColorStop(0, '#102235');
      baseGradient.addColorStop(1, '#0a1726');
    } else if (this.mode === 'pendulum') {
      baseGradient.addColorStop(0, '#1b1328');
      baseGradient.addColorStop(1, '#0e1525');
    } else {
      baseGradient.addColorStop(0, '#111829');
      baseGradient.addColorStop(1, '#081421');
    }

    this.ctx.fillStyle = baseGradient;
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.save();
    this.ctx.globalAlpha = 0.08;
    this.ctx.strokeStyle = '#b9d5f1';
    this.ctx.lineWidth = 1;
    const stripeGap = 36;
    const phase = (timestamp / 20) % stripeGap;
    for (let y = -stripeGap; y <= height + stripeGap; y += stripeGap) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y + phase);
      this.ctx.lineTo(width, y + phase);
      this.ctx.stroke();
    }
    this.ctx.restore();

    if (this.canvasFlashEnabled && this.flashColor) {
      this.ctx.fillStyle = this.hexToRgba(this.flashColor, 0.26);
      this.ctx.fillRect(0, 0, width, height);
    }
  }

  private drawSideRails(height: number): void {
    const railWidth = WALL_WIDTH;

    this.ctx.fillStyle = this.leftBar.highlighted ? this.leftBar.highlight : this.leftBar.primary;
    this.ctx.fillRect(0, 0, railWidth, height);

    this.ctx.fillStyle = this.rightBar.highlighted ? this.rightBar.highlight : this.rightBar.primary;
    this.ctx.fillRect(this.viewport.width - railWidth, 0, railWidth, height);
  }

  private drawArcVisualization(progress: number, height: number): void {
    const distance = this.rightBoundary - this.leftBoundary;
    const ballY = this.computeArcY(this.ball.x, distance, height);

    if (this.showPath) {
      this.drawArcGuide(distance, height);
    }

    const centerX = (this.leftBoundary + this.rightBoundary) / 2;
    const targetAngle =
      this.ball.x >= centerX
        ? ((this.ball.x - centerX) / Math.max(1, this.rightBoundary - centerX)) * Math.PI
        : -((centerX - this.ball.x) / Math.max(1, centerX - this.leftBoundary)) * Math.PI;

    this.faceAngle += (targetAngle - this.faceAngle) * 0.12;

    this.ctx.save();
    this.ctx.translate(this.ball.x, ballY);
    this.ctx.rotate(this.faceAngle);

    const faceGradient = this.ctx.createRadialGradient(-this.ball.radius * 0.3, -this.ball.radius * 0.4, this.ball.radius * 0.2, 0, 0, this.ball.radius);
    faceGradient.addColorStop(0, '#d8ff8a');
    faceGradient.addColorStop(1, '#5fbf3a');

    this.ctx.beginPath();
    this.ctx.arc(0, 0, this.ball.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = faceGradient;
    this.ctx.fill();

    const eyeOffsetX = this.ball.radius * 0.38;
    const eyeOffsetY = -this.ball.radius * 0.28;
    const eyeRadius = this.ball.radius * 0.13;

    this.ctx.fillStyle = '#0c1f18';
    this.ctx.beginPath();
    this.ctx.arc(-eyeOffsetX, eyeOffsetY, eyeRadius, 0, Math.PI * 2);
    this.ctx.arc(eyeOffsetX, eyeOffsetY, eyeRadius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(0, this.ball.radius * 0.02, this.ball.radius * 0.56, 0.22 * Math.PI, 0.78 * Math.PI);
    this.ctx.lineWidth = Math.max(2, this.ball.radius * 0.04);
    this.ctx.strokeStyle = '#0c1f18';
    this.ctx.stroke();
    this.ctx.restore();

    if (this.showPath && distance > 0) {
      this.drawArcSubdivisionMarkers(distance, height);
    }

    const glowAlpha = clamp((performance.now() - this.lastBeatAt) / 360, 0, 1);
    const beatGlow = 1 - glowAlpha;
    if (beatGlow > 0) {
      this.ctx.fillStyle = this.hexToRgba('#c9f89a', beatGlow * 0.18);
      this.ctx.beginPath();
      this.ctx.arc(this.ball.x, ballY, this.ball.radius * (1.5 + beatGlow * 0.3), 0, Math.PI * 2);
      this.ctx.fill();
    }

    void progress;
  }
  private drawArcGuide(distance: number, height: number): void {
    if (distance <= 0) {
      return;
    }

    this.ctx.save();
    this.ctx.setLineDash([10, 8]);
    this.ctx.strokeStyle = 'rgba(205, 222, 239, 0.45)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();

    const stepsPerSegment = 24;
    for (let segment = 0; segment < this.microbeats; segment += 1) {
      const segmentStartX = this.leftBoundary + (segment * distance) / this.microbeats;
      const segmentEndX = this.leftBoundary + ((segment + 1) * distance) / this.microbeats;

      for (let step = 0; step <= stepsPerSegment; step += 1) {
        const t = step / stepsPerSegment;
        const x = segmentStartX + t * (segmentEndX - segmentStartX);
        const yOffset = this.amplitude * (1 - Math.pow(2 * t - 1, 2));
        const y = height * 0.58 - yOffset;
        if (segment === 0 && step === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }
    }

    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawArcSubdivisionMarkers(distance: number, height: number): void {
    if (this.microbeats <= 1 || distance <= 0) {
      return;
    }

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(218, 237, 255, 0.8)';
    for (let index = 1; index < this.microbeats; index += 1) {
      const x = this.leftBoundary + (distance * index) / this.microbeats;
      const y = this.computeArcY(x, distance, height);
      this.ctx.beginPath();
      this.ctx.arc(x, y, 4, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  private computeArcY(x: number, distance: number, height: number): number {
    if (distance <= 0) {
      return height * 0.58;
    }

    if (this.microbeats === 1) {
      const xRelative = x - this.leftBoundary;
      const yOffset = this.amplitude * (1 - Math.pow((2 * xRelative) / distance - 1, 2));
      return height * 0.58 - yOffset;
    }

    const segmentDistance = distance / this.microbeats;
    if (segmentDistance <= 0) {
      return height * 0.58;
    }

    let segmentIndex = Math.floor((x - this.leftBoundary) / segmentDistance);
    segmentIndex = clampInt(segmentIndex, 0, this.microbeats - 1);

    const segmentX = x - this.leftBoundary - segmentIndex * segmentDistance;
    const t = segmentX / segmentDistance;
    const yOffset = this.amplitude * (1 - Math.pow(2 * t - 1, 2));
    return height * 0.58 - yOffset;
  }

  private drawPendulumVisualization(halfProgress: number, width: number, height: number): void {
    const pivotX = width * 0.5;
    const pivotY = height * 0.14;
    const armLength = clamp(height * 0.5 + this.amplitude * 0.33, height * 0.35, height * 0.76);
    const maxAngle = clamp(0.24 + this.amplitude / 330, 0.26, 1.05);
    const eased = 0.5 - 0.5 * Math.cos(Math.PI * halfProgress);
    const angle = -maxAngle + eased * maxAngle * 2;

    if (this.showPath) {
      this.ctx.save();
      this.ctx.setLineDash([8, 6]);
      this.ctx.strokeStyle = 'rgba(208, 223, 246, 0.55)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(pivotX, pivotY, armLength, Math.PI * 0.5 - maxAngle, Math.PI * 0.5 + maxAngle);
      this.ctx.stroke();

      if (this.microbeats > 1) {
        this.ctx.fillStyle = 'rgba(226, 239, 255, 0.86)';
        for (let index = 1; index < this.microbeats; index += 1) {
          const t = index / this.microbeats;
          const markerAngle = -maxAngle + t * maxAngle * 2;
          const markerX = pivotX + Math.sin(markerAngle) * armLength;
          const markerY = pivotY + Math.cos(markerAngle) * armLength;
          this.ctx.beginPath();
          this.ctx.arc(markerX, markerY, 4, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
      this.ctx.restore();
    }

    const bobX = pivotX + Math.sin(angle) * armLength;
    const bobY = pivotY + Math.cos(angle) * armLength;

    this.ctx.save();
    this.ctx.lineWidth = Math.max(4, this.ballRadius * 0.13);
    this.ctx.strokeStyle = 'rgba(175, 212, 246, 0.78)';
    this.ctx.beginPath();
    this.ctx.moveTo(pivotX, pivotY);
    this.ctx.lineTo(bobX, bobY);
    this.ctx.stroke();

    this.ctx.fillStyle = 'rgba(188, 225, 255, 0.92)';
    this.ctx.beginPath();
    this.ctx.arc(pivotX, pivotY, Math.max(10, this.ballRadius * 0.18), 0, Math.PI * 2);
    this.ctx.fill();

    const bobGradient = this.ctx.createRadialGradient(
      bobX - this.ballRadius * 0.4,
      bobY - this.ballRadius * 0.45,
      this.ballRadius * 0.2,
      bobX,
      bobY,
      this.ballRadius,
    );
    bobGradient.addColorStop(0, '#ffd8b9');
    bobGradient.addColorStop(1, '#ff905f');

    this.ctx.fillStyle = bobGradient;
    this.ctx.beginPath();
    this.ctx.arc(bobX, bobY, this.ballRadius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = 'rgba(32, 17, 8, 0.6)';
    this.ctx.beginPath();
    this.ctx.arc(bobX + this.ballRadius * 0.24, bobY + this.ballRadius * 0.2, this.ballRadius * 0.18, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawOrbitVisualization(halfProgress: number, width: number, height: number, timestamp: number): void {
    const centerX = width * 0.5;
    const centerY = height * 0.56;
    const orbitRadius = clamp(height * 0.2 + this.amplitude * 0.5, 70, Math.min(width, height) * 0.42);
    const angle = -Math.PI * 0.5 + halfProgress * Math.PI * 2;

    if (this.showPath) {
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(188, 210, 238, 0.45)';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([9, 7]);
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, orbitRadius, 0, Math.PI * 2);
      this.ctx.stroke();

      if (this.microbeats > 1) {
        this.ctx.setLineDash([]);
        for (let index = 1; index < this.microbeats; index += 1) {
          const spokeAngle = -Math.PI * 0.5 + (index / this.microbeats) * Math.PI * 2;
          const x = centerX + Math.cos(spokeAngle) * orbitRadius;
          const y = centerY + Math.sin(spokeAngle) * orbitRadius;
          this.ctx.beginPath();
          this.ctx.moveTo(centerX, centerY);
          this.ctx.lineTo(x, y);
          this.ctx.stroke();
        }
      }
      this.ctx.restore();
    }

    this.drawPulseBursts(centerX, centerY, orbitRadius, timestamp);

    const dotX = centerX + Math.cos(angle) * orbitRadius;
    const dotY = centerY + Math.sin(angle) * orbitRadius;

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(99, 227, 191, 0.58)';
    this.ctx.lineWidth = 6;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, orbitRadius, -Math.PI * 0.5, angle);
    this.ctx.stroke();

    const beatEnergy = clamp(1 - (timestamp - this.lastBeatAt) / 350, 0, 1);
    const coreRadius = 18 + beatEnergy * 26;

    this.ctx.fillStyle = this.hexToRgba('#63e3bf', 0.2 + beatEnergy * 0.34);
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
    this.ctx.fill();

    const dotGradient = this.ctx.createRadialGradient(dotX - this.ballRadius * 0.3, dotY - this.ballRadius * 0.35, this.ballRadius * 0.2, dotX, dotY, this.ballRadius);
    dotGradient.addColorStop(0, '#d9ffef');
    dotGradient.addColorStop(1, '#48c69a');
    this.ctx.fillStyle = dotGradient;

    this.ctx.beginPath();
    this.ctx.arc(dotX, dotY, this.ballRadius * 0.78, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = 'rgba(3, 25, 17, 0.62)';
    this.ctx.beginPath();
    this.ctx.arc(dotX + this.ballRadius * 0.15, dotY + this.ballRadius * 0.15, this.ballRadius * 0.2, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }
  private drawPulseBursts(centerX: number, centerY: number, baseRadius: number, now: number): void {
    this.ctx.save();
    for (const pulse of this.pulses) {
      const life = pulse.kind === 'beat' ? BEAT_BURST_LIFE_MS : SUBDIVISION_BURST_LIFE_MS;
      const t = (now - pulse.createdAt) / life;
      if (t > 1) {
        continue;
      }
      const radius = baseRadius * 0.1 + t * (Math.max(this.viewport.width, this.viewport.height) * 0.5);
      const alpha = (1 - t) * (pulse.kind === 'beat' ? 0.62 : 0.34);

      this.ctx.strokeStyle = this.hexToRgba(pulse.color, alpha);
      this.ctx.lineWidth = pulse.kind === 'beat' ? 5 : 3;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  private lightenColor(hex: string, percent: number): string {
    const normalized = hex.replace(/^#/, '');
    const color = Number.parseInt(normalized, 16);
    const red = (color >> 16) & 0xff;
    const green = (color >> 8) & 0xff;
    const blue = color & 0xff;

    const boost = clamp(percent, 0, 100) / 100;
    const nextRed = Math.min(255, Math.floor(red + (255 - red) * boost));
    const nextGreen = Math.min(255, Math.floor(green + (255 - green) * boost));
    const nextBlue = Math.min(255, Math.floor(blue + (255 - blue) * boost));

    return `#${((1 << 24) + (nextRed << 16) + (nextGreen << 8) + nextBlue).toString(16).slice(1)}`;
  }

  private hexToRgba(hex: string, alpha: number): string {
    const normalized = hex.replace(/^#/, '');
    const color = Number.parseInt(normalized, 16);
    const red = (color >> 16) & 0xff;
    const green = (color >> 8) & 0xff;
    const blue = color & 0xff;
    const clampedAlpha = clamp(alpha, 0, 1);
    return `rgba(${red}, ${green}, ${blue}, ${clampedAlpha})`;
  }
}

export type VisualMetronomeInstance = {
  destroy: () => void;
};

export function mountVisualMetronome(container: HTMLElement): VisualMetronomeInstance {
  const app = new VisualMetronomeApp(container);
  return {
    destroy: () => app.destroy(),
  };
}

export const mount = mountVisualMetronome;
export default mountVisualMetronome;
