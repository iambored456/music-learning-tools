import template from './template.html?raw';
import './styles.css';

type Direction = -1 | 1;
type CleanupFn = () => void;
type SoundGenerator = () => void;

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
};

type AudioContextLike = AudioContext;
type AudioContextCtor = typeof AudioContext;

const WALL_WIDTH = 50;
const DEFAULT_BPM = 60;
const DEFAULT_VOLUME = 0.25;
const DEFAULT_BALL_RADIUS = 75;
const MIN_BALL_RADIUS = 5;
const DEFAULT_AMPLITUDE = 150;
const BPM_MIN = 1;
const MICROBEAT_MIN = 1;
const MICROBEAT_MAX = 4;
const HIGHLIGHT_DURATION_MS = 150;
const SAFE_MIN_GAIN = 0.00001;
const TAP_RESET_MS = 2000;
const MAX_TAP_HISTORY = 8;

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

class VisualMetronomeApp {
  private readonly elements: VisualMetronomeElements;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly cleanupFns: CleanupFn[] = [];
  private readonly timeoutIds = new Set<number>();
  private readonly audioContext: AudioContextLike | null;
  private readonly soundGenerators: Record<string, SoundGenerator>;

  private bpm = DEFAULT_BPM;
  private beatInterval = 60000 / DEFAULT_BPM;
  private volume = DEFAULT_VOLUME;
  private ballRadius = DEFAULT_BALL_RADIUS;
  private amplitude = DEFAULT_AMPLITUDE;
  private microbeats = MICROBEAT_MIN;
  private currentSound = 'Beep 1';

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
  private lastSegmentIndex = 0;
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
    this.leftBar.highlight = this.lightenColor(this.leftBar.primary, 50);
    this.rightBar.highlight = this.lightenColor(this.rightBar.primary, 50);
    this.soundGenerators = this.createSoundGenerators();

    this.applyNavigationRoutes();
    this.populateBpmSelect();
    this.populateSoundSelect();
    this.updateMicrobeatButtons();
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
    if (microbeatButtons.length === 0) {
      throw new Error('Visual Metronome: expected microbeat toggle buttons');
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

  private playSubdivisionSound(): void {
    this.playTone({
      type: 'sine',
      frequency: 600,
      durationSeconds: 0.1,
      gainScale: 0.5,
    });
  }

  private async resumeAudioContext(): Promise<void> {
    if (!this.audioContext || this.audioContext.state !== 'suspended') {
      return;
    }
    try {
      await this.audioContext.resume();
    } catch {
      // Audio resume can fail without user gesture in some browsers.
    }
  }

  private getSafeGain(value: number): number {
    return value > 0 ? value : SAFE_MIN_GAIN;
  }

  private bindEvents(): void {
    this.listen(window, 'resize', this.handleResize);
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
    });
    this.listen(this.elements.volumeSlider, 'input', () => {
      this.volume = clamp(Number(this.elements.volumeSlider.value), 0, 1);
    });
    this.listen(this.elements.ballSizeIncrease, 'click', () => this.setBallRadius(this.ballRadius + 2));
    this.listen(this.elements.ballSizeDecrease, 'click', () => this.setBallRadius(this.ballRadius - 2));
    this.listen(this.elements.flashToggle, 'click', () => {
      this.canvasFlashEnabled = !this.canvasFlashEnabled;
      this.elements.flashToggle.textContent = this.canvasFlashEnabled ? 'On' : 'Off';
      this.draw();
    });
    this.listen(this.elements.pathHeightIncrease, 'click', () => this.setPathHeight(this.amplitude + 10));
    this.listen(this.elements.pathHeightDecrease, 'click', () => this.setPathHeight(this.amplitude - 10));
    this.listen(this.elements.togglePath, 'click', () => {
      this.showPath = !this.showPath;
      this.elements.togglePath.textContent = this.showPath ? 'Hide Path' : 'Show Path';
      this.draw();
    });
    this.listen(this.elements.leftBarColor, 'input', () => {
      this.leftBar.primary = this.elements.leftBarColor.value;
      this.leftBar.highlight = this.lightenColor(this.leftBar.primary, 50);
      this.draw();
    });
    this.listen(this.elements.rightBarColor, 'input', () => {
      this.rightBar.primary = this.elements.rightBarColor.value;
      this.rightBar.highlight = this.lightenColor(this.rightBar.primary, 50);
      this.draw();
    });

    this.elements.microbeatButtons.forEach((button) => {
      this.listen(button, 'click', () => {
        const selectedValue = Number(button.dataset.value);
        if (!Number.isFinite(selectedValue)) {
          return;
        }
        this.setMicrobeats(selectedValue);
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
    this.elements.canvas.width = width;
    this.elements.canvas.height = height;
  }

  private recalculateBoundaries(preserveProgress: boolean): void {
    const previousDistance = this.rightBoundary - this.leftBoundary;
    const previousProgress =
      preserveProgress && previousDistance > 0
        ? clamp((this.ball.x - this.leftBoundary) / previousDistance, 0, 1)
        : 0;

    this.leftBoundary = WALL_WIDTH + this.ballRadius;
    const rightCandidate = this.elements.canvas.width - WALL_WIDTH - this.ballRadius;
    this.rightBoundary = Math.max(this.leftBoundary, rightCandidate);

    const distance = this.rightBoundary - this.leftBoundary;
    const progress = preserveProgress ? previousProgress : 0;
    this.ball.x = this.leftBoundary + distance * progress;
    this.ball.radius = this.ballRadius;
    this.lastSegmentIndex = this.computeSegmentIndex(this.ball.x);
  }

  private setBpm(value: number): void {
    this.bpm = Math.max(BPM_MIN, Math.round(value));
    this.beatInterval = 60000 / this.bpm;
    this.updateSpeed();
    this.syncBpmSelect();
  }

  private updateSpeed(): void {
    const distance = this.rightBoundary - this.leftBoundary;
    this.ball.speed = distance > 0 ? distance / this.beatInterval : 0;
  }

  private setBallRadius(value: number): void {
    this.ballRadius = Math.max(MIN_BALL_RADIUS, Math.round(value));
    this.recalculateBoundaries(true);
    this.updateSpeed();
    this.draw();
  }

  private setPathHeight(value: number): void {
    this.amplitude = Math.max(0, Math.round(value));
    this.draw();
  }

  private setMicrobeats(value: number): void {
    this.microbeats = clampInt(value, MICROBEAT_MIN, MICROBEAT_MAX);
    this.lastSegmentIndex = this.computeSegmentIndex(this.ball.x);
    this.updateMicrobeatButtons();
    this.draw();
  }

  private updateMicrobeatButtons(): void {
    this.elements.microbeatButtons.forEach((button) => {
      const buttonValue = Number(button.dataset.value);
      const selected = Number.isFinite(buttonValue) && buttonValue <= this.microbeats;
      button.classList.toggle('selected', selected);
    });
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
    this.elements.startStop.textContent = 'Stop';
    void this.resumeAudioContext();

    if (this.rafHandle === null) {
      this.rafHandle = requestAnimationFrame(this.animate);
    }
  }

  private stopPlayback(): void {
    this.isPlaying = false;
    this.elements.startStop.textContent = 'Start';
    this.lastTimestamp = null;

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

    if (this.microbeats > 1) {
      const currentSegmentIndex = this.computeSegmentIndex(this.ball.x);
      if (currentSegmentIndex !== this.lastSegmentIndex) {
        const isInternalBoundary = currentSegmentIndex > 0 && currentSegmentIndex < this.microbeats - 1;
        if (isInternalBoundary) {
          this.playSubdivisionSound();
        }
      }
      this.lastSegmentIndex = currentSegmentIndex;
    }

    if (this.ball.x >= this.rightBoundary) {
      this.ball.x = this.rightBoundary;
      this.ball.direction = -1;
      this.triggerBeat('right');
    } else if (this.ball.x <= this.leftBoundary) {
      this.ball.x = this.leftBoundary;
      this.ball.direction = 1;
      this.triggerBeat('left');
    }

    this.draw();
    this.rafHandle = requestAnimationFrame(this.animate);
  };

  private triggerBeat(side: 'left' | 'right'): void {
    this.playClick();
    const bar = side === 'left' ? this.leftBar : this.rightBar;
    bar.highlighted = true;

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

  private playClick(): void {
    const generator = this.soundGenerators[this.currentSound];
    if (generator) {
      generator();
    }
  }

  private draw(): void {
    const { canvas } = this.elements;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.ctx.fillStyle = this.canvasFlashEnabled && this.flashColor ? this.flashColor : '#121212';
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.drawBars();
    if (this.showPath) {
      this.drawPath();
    }
    this.drawBall();
  }

  private drawBars(): void {
    this.ctx.fillStyle = this.leftBar.highlighted ? this.leftBar.highlight : this.leftBar.primary;
    this.ctx.fillRect(0, 0, WALL_WIDTH, this.elements.canvas.height);

    this.ctx.fillStyle = this.rightBar.highlighted ? this.rightBar.highlight : this.rightBar.primary;
    this.ctx.fillRect(this.elements.canvas.width - WALL_WIDTH, 0, WALL_WIDTH, this.elements.canvas.height);
  }

  private drawPath(): void {
    const distance = this.rightBoundary - this.leftBoundary;
    if (distance <= 0) {
      return;
    }

    this.ctx.save();
    this.ctx.setLineDash([5, 5]);
    this.ctx.strokeStyle = 'grey';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();

    const stepsPerSegment = 20;
    for (let segment = 0; segment < this.microbeats; segment += 1) {
      const segmentStartX = this.leftBoundary + (segment * distance) / this.microbeats;
      const segmentEndX = this.leftBoundary + ((segment + 1) * distance) / this.microbeats;

      for (let step = 0; step <= stepsPerSegment; step += 1) {
        const t = step / stepsPerSegment;
        const x = segmentStartX + t * (segmentEndX - segmentStartX);
        const yOffset = this.amplitude * (1 - Math.pow(2 * t - 1, 2));
        const y = this.elements.canvas.height / 2 - yOffset;
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

  private drawBall(): void {
    const distance = this.rightBoundary - this.leftBoundary;
    const y = this.computeBallY(distance);
    const xCenter = (this.leftBoundary + this.rightBoundary) / 2;

    let targetAngle = 0;
    if (distance > 0) {
      if (this.ball.x >= xCenter) {
        targetAngle = ((this.ball.x - xCenter) / (this.rightBoundary - xCenter || 1)) * Math.PI;
      } else {
        targetAngle = -((xCenter - this.ball.x) / (xCenter - this.leftBoundary || 1)) * Math.PI;
      }
    }

    this.faceAngle += (targetAngle - this.faceAngle) * 0.1;

    this.ctx.save();
    this.ctx.translate(this.ball.x, y);
    this.ctx.rotate(this.faceAngle);

    this.ctx.beginPath();
    this.ctx.arc(0, 0, this.ball.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = '#76FF03';
    this.ctx.fill();
    this.ctx.closePath();

    const eyeOffsetX = this.ball.radius * 0.4;
    const eyeOffsetY = -this.ball.radius * 0.3;
    const eyeRadius = this.ball.radius * 0.15;

    this.ctx.fillStyle = '#000000';
    this.ctx.beginPath();
    this.ctx.arc(-eyeOffsetX, eyeOffsetY, eyeRadius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.closePath();

    this.ctx.beginPath();
    this.ctx.arc(eyeOffsetX, eyeOffsetY, eyeRadius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.closePath();

    this.ctx.beginPath();
    this.ctx.arc(0, 0, this.ball.radius * 0.6, 0.2 * Math.PI, 0.8 * Math.PI);
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    this.ctx.closePath();

    this.ctx.restore();
  }

  private computeBallY(distance: number): number {
    if (distance <= 0) {
      return this.elements.canvas.height / 2;
    }

    if (this.microbeats === 1) {
      const xRelative = this.ball.x - this.leftBoundary;
      const yOffset = this.amplitude * (1 - Math.pow((2 * xRelative) / distance - 1, 2));
      return this.elements.canvas.height / 2 - yOffset;
    }

    const segmentDistance = distance / this.microbeats;
    if (segmentDistance <= 0) {
      return this.elements.canvas.height / 2;
    }

    let segmentIndex = Math.floor((this.ball.x - this.leftBoundary) / segmentDistance);
    segmentIndex = clampInt(segmentIndex, 0, this.microbeats - 1);
    const segmentX = this.ball.x - this.leftBoundary - segmentIndex * segmentDistance;
    const t = segmentX / segmentDistance;
    const yOffset = this.amplitude * (1 - Math.pow(2 * t - 1, 2));
    return this.elements.canvas.height / 2 - yOffset;
  }

  private computeSegmentIndex(x: number): number {
    const distance = this.rightBoundary - this.leftBoundary;
    if (distance <= 0 || this.microbeats <= 1) {
      return 0;
    }
    const segmentDistance = distance / this.microbeats;
    if (segmentDistance <= 0) {
      return 0;
    }
    const raw = Math.floor((x - this.leftBoundary) / segmentDistance);
    return clampInt(raw, 0, this.microbeats - 1);
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
