import {
  getAdsrPlayheadsEnabled,
  subscribeToAdsrPlayheadsEnabled
} from '@services/adsrPlayheadSettings.ts';

export const MAX_CONCURRENT_ADSR_PLAYHEADS = 8;

export interface AdsrPlayheadEnvelope {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface AdsrPlayheadPoint {
  x: number;
  y: number;
}

interface CanvasBinding {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  getEnvelopePoints: (adsr: AdsrPlayheadEnvelope) => AdsrPlayheadPoint[];
  width: number;
  height: number;
}

interface ActivePlayhead {
  noteId: string;
  color: string;
  adsr: AdsrPlayheadEnvelope;
  points: AdsrPlayheadPoint[];
  phase: 'attack' | 'sustain' | 'release';
  phaseStartedAt: number;
}

interface PlayheadPosition {
  x: number;
  y: number;
  complete: boolean;
}

const playheads = new Map<string, ActivePlayhead>();

let binding: CanvasBinding | null = null;
let animationFrameId: number | null = null;
let isPaused = false;
let pausedAt = 0;
let isEnabled = getAdsrPlayheadsEnabled();

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function interpolate(
  start: AdsrPlayheadPoint,
  end: AdsrPlayheadPoint,
  ratio: number
): AdsrPlayheadPoint {
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  return {
    x: start.x + ((end.x - start.x) * clampedRatio),
    y: start.y + ((end.y - start.y) * clampedRatio)
  };
}

function calculatePosition(playhead: ActivePlayhead, timestamp: number): PlayheadPosition {
  const [startPoint, attackPoint, sustainPoint, releasePoint] = playhead.points;
  if (!startPoint || !attackPoint || !sustainPoint || !releasePoint) {
    return { x: 0, y: 0, complete: true };
  }

  const elapsedSeconds = Math.max(0, (timestamp - playhead.phaseStartedAt) / 1000);

  if (playhead.phase === 'attack') {
    if (elapsedSeconds < playhead.adsr.attack) {
      const point = interpolate(
        startPoint,
        attackPoint,
        playhead.adsr.attack > 0 ? elapsedSeconds / playhead.adsr.attack : 1
      );
      return { ...point, complete: false };
    }

    const decayElapsed = elapsedSeconds - playhead.adsr.attack;
    if (decayElapsed < playhead.adsr.decay) {
      const point = interpolate(
        attackPoint,
        sustainPoint,
        playhead.adsr.decay > 0 ? decayElapsed / playhead.adsr.decay : 1
      );
      return { ...point, complete: false };
    }

    playhead.phase = 'sustain';
    return { ...sustainPoint, complete: false };
  }

  if (playhead.phase === 'release') {
    if (elapsedSeconds >= playhead.adsr.release) {
      return { ...releasePoint, complete: true };
    }

    const point = interpolate(
      sustainPoint,
      releasePoint,
      playhead.adsr.release > 0 ? elapsedSeconds / playhead.adsr.release : 1
    );
    return { ...point, complete: false };
  }

  return { ...sustainPoint, complete: false };
}

function drawPlayhead(
  ctx: CanvasRenderingContext2D,
  position: AdsrPlayheadPoint,
  color: string,
  height: number
): void {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(position.x, 0);
  ctx.lineTo(position.x, height);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(position.x, position.y, 4.5, 0, Math.PI * 2);
  ctx.fill();
}

function render(timestamp: number): boolean {
  if (!binding) {
    return false;
  }

  const { ctx, width, height } = binding;
  ctx.clearRect(0, 0, width, height);

  let hasMovingPlayhead = false;
  const completedIds: string[] = [];

  playheads.forEach(playhead => {
    const position = calculatePosition(playhead, timestamp);
    if (position.complete) {
      completedIds.push(playhead.noteId);
      return;
    }

    drawPlayhead(ctx, position, playhead.color, height);
    hasMovingPlayhead ||= playhead.phase !== 'sustain';
  });

  completedIds.forEach(noteId => playheads.delete(noteId));
  return hasMovingPlayhead;
}

function runAnimationFrame(timestamp: number): void {
  animationFrameId = null;
  if (!isEnabled || isPaused || !binding) {
    return;
  }

  if (render(timestamp)) {
    scheduleAnimationFrame();
  }
}

function scheduleAnimationFrame(): void {
  if (animationFrameId !== null || !isEnabled || isPaused || !binding) {
    return;
  }
  animationFrameId = requestAnimationFrame(runAnimationFrame);
}

function cancelAnimationFrameIfNeeded(): void {
  if (animationFrameId === null) {
    return;
  }
  cancelAnimationFrame(animationFrameId);
  animationFrameId = null;
}

function rebuildCachedGeometry(): void {
  if (!binding) {
    return;
  }
  playheads.forEach(playhead => {
    playhead.points = binding?.getEnvelopePoints(playhead.adsr) ?? [];
  });
}

function evictOldestPlayheadIfNeeded(): void {
  if (playheads.size < MAX_CONCURRENT_ADSR_PLAYHEADS) {
    return;
  }
  const oldestNoteId = playheads.keys().next().value as string | undefined;
  if (oldestNoteId) {
    playheads.delete(oldestNoteId);
  }
}

export function attachAdsrPlayheadCanvas(params: {
  canvas: HTMLCanvasElement;
  getEnvelopePoints: (adsr: AdsrPlayheadEnvelope) => AdsrPlayheadPoint[];
}): () => void {
  const ctx = params.canvas.getContext('2d');
  if (!ctx) {
    return () => undefined;
  }

  binding = {
    canvas: params.canvas,
    ctx,
    getEnvelopePoints: params.getEnvelopePoints,
    width: 0,
    height: 0
  };

  return () => {
    if (binding?.canvas !== params.canvas) {
      return;
    }
    clearAdsrPlayheads();
    binding = null;
  };
}

export function resizeAdsrPlayheadCanvas(width: number, height: number): void {
  if (!binding || width <= 0 || height <= 0) {
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  const backingWidth = Math.max(1, Math.round(width * dpr));
  const backingHeight = Math.max(1, Math.round(height * dpr));

  if (binding.canvas.width !== backingWidth || binding.canvas.height !== backingHeight) {
    binding.canvas.width = backingWidth;
    binding.canvas.height = backingHeight;
  }

  binding.width = width;
  binding.height = height;
  binding.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  refreshAdsrPlayheadGeometry();
}

export function refreshAdsrPlayheadGeometry(): void {
  rebuildCachedGeometry();
  render(isPaused ? pausedAt : nowMs());
}

export function triggerAdsrPlayhead(
  noteId: string,
  phase: 'attack' | 'release',
  color: string,
  adsr: AdsrPlayheadEnvelope | null | undefined
): void {
  if (!isEnabled || !binding || !adsr) {
    return;
  }

  const timestamp = isPaused ? pausedAt : nowMs();

  if (phase === 'attack') {
    playheads.delete(noteId);
    evictOldestPlayheadIfNeeded();

    const capturedAdsr = { ...adsr };
    playheads.set(noteId, {
      noteId,
      color,
      adsr: capturedAdsr,
      points: binding.getEnvelopePoints(capturedAdsr),
      phase: 'attack',
      phaseStartedAt: timestamp
    });
  } else {
    const playhead = playheads.get(noteId);
    if (!playhead) {
      return;
    }

    playhead.color = color;
    playhead.adsr = { ...adsr };
    playhead.points = binding.getEnvelopePoints(playhead.adsr);
    playhead.phase = 'release';
    playhead.phaseStartedAt = timestamp;
  }

  render(timestamp);
  scheduleAnimationFrame();
}

export function pauseAdsrPlayheads(): void {
  if (isPaused) {
    return;
  }
  pausedAt = nowMs();
  render(pausedAt);
  isPaused = true;
  cancelAnimationFrameIfNeeded();
}

export function resumeAdsrPlayheads(): void {
  if (!isPaused) {
    return;
  }

  const resumedAt = nowMs();
  const pausedDuration = resumedAt - pausedAt;
  playheads.forEach(playhead => {
    playhead.phaseStartedAt += pausedDuration;
  });

  isPaused = false;
  pausedAt = 0;
  render(resumedAt);
  scheduleAnimationFrame();
}

export function clearAdsrPlayheads(): void {
  cancelAnimationFrameIfNeeded();
  playheads.clear();
  isPaused = false;
  pausedAt = 0;
  if (binding) {
    binding.ctx.clearRect(0, 0, binding.width, binding.height);
  }
}

subscribeToAdsrPlayheadsEnabled(enabled => {
  isEnabled = enabled;
  if (!enabled) {
    clearAdsrPlayheads();
  }
});
