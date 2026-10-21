import type { BoomwhackerLane, DerivedTimingModel, TimedBoomwhackerNote } from '@mlt/boomwhacker-video-builder-core';
import { isNoteHitBurstActive, NOTE_HIT_BURST_DURATION_SEC } from './noteHitBurst.js';

/** The latest strike retriggers its own receptor; simultaneous rows pulse independently. */
export function getJudgmentHitAges(
  notes: ReadonlyArray<Pick<TimedBoomwhackerNote, 'row' | 'startTimeSec'>>,
  currentTimeSec: number,
): Map<number, number> {
  const ages = new Map<number, number>();
  for (const note of notes) {
    if (!isNoteHitBurstActive(note.startTimeSec, currentTimeSec)) continue;
    const age = currentTimeSec - note.startTimeSec;
    ages.set(note.row, Math.min(ages.get(note.row) ?? Infinity, age));
  }
  return ages;
}

export function getJudgmentHitFrame(ageSec: number | undefined, reducedMotion = false) {
  if (ageSec === undefined || !isNoteHitBurstActive(0, ageSec)) {
    return { scale: 1, glow: 0, flash: 0, rippleRadius: 0, rippleOpacity: 0 };
  }
  const progress = ageSec / NOTE_HIT_BURST_DURATION_SEC;
  return {
    scale: reducedMotion ? 1 : 1 - 0.1 * Math.sin(Math.PI * Math.min(1, ageSec / 0.16)),
    glow: reducedMotion ? 0.35 * (1 - progress) : 0.85 * (1 - progress) ** 2,
    flash: reducedMotion ? 0 : Math.max(0, 1 - ageSec / 0.1) ** 2,
    rippleRadius: 0.08 + 0.24 * (1 - (1 - progress) ** 3),
    rippleOpacity: reducedMotion ? 0 : 0.85 * (1 - progress),
  };
}

/** A column is one visible beat, including variable-tempo beat maps and count-in. */
export function getJudgmentColumnWidth(timing: DerivedTimingModel, timeSec: number, pixelsPerSecond: number): number {
  const beats = timing.beatSpans;
  if (beats.length === 0) {
    return 0;
  }
  let low = 0;
  let high = beats.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high + 1) / 2);
    if (beats[middle].startTimeSec <= timeSec) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  return Math.max(0, beats[low].durationSec * pixelsPerSecond);
}

export function drawJudgmentColumn(context: CanvasRenderingContext2D, options: {
  left: number;
  top: number;
  width: number;
  laneHeight: number;
  lanes: Pick<BoomwhackerLane, 'row' | 'color'>[];
  hitAges?: ReadonlyMap<number, number>;
  reducedMotion?: boolean;
}): void {
  const { left, top, width, laneHeight, lanes, hitAges, reducedMotion = false } = options;
  if (width <= 0 || laneHeight <= 0) {
    return;
  }
  const height = laneHeight * lanes.length;
  context.save();
  context.beginPath();
  context.rect(left, top, width, height);
  context.clip();
  const columnShade = context.createLinearGradient(left, 0, left + width, 0);
  columnShade.addColorStop(0, 'rgba(3, 8, 15, 0.58)');
  columnShade.addColorStop(1, 'rgba(3, 8, 15, 0.28)');
  context.fillStyle = columnShade;
  context.fillRect(left, top, width, height);
  context.fillStyle = 'rgba(224, 237, 255, 0.18)';
  context.fillRect(left + width - Math.min(1, width * 0.02), top, Math.min(1, width * 0.02), height);

  const diameter = Math.min(width, laneHeight) * 0.84;
  for (const lane of lanes) {
    const centerY = top + (lanes.length - 1 - lane.row + 0.5) * laneHeight;
    const pulse = getJudgmentHitFrame(hitAges?.get(lane.row), reducedMotion);
    context.save();
    context.translate(left + width / 2, centerY);
    context.scale(diameter * pulse.scale, diameter * pulse.scale);

    // Dark plinth and the pitch-colored outer rim.
    context.fillStyle = '#02060c';
    context.beginPath();
    context.arc(0, 0.025, 0.5, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = lane.color;
    context.beginPath();
    context.arc(0, 0, 0.48, 0, Math.PI * 2);
    context.fill();
    const outerBevel = context.createLinearGradient(0, -0.48, 0, 0.48);
    outerBevel.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    outerBevel.addColorStop(0.3, 'rgba(255, 255, 255, 0)');
    outerBevel.addColorStop(1, 'rgba(0, 0, 0, 0.52)');
    context.fillStyle = outerBevel;
    context.fill();

    // Empty inset with a white, silver, and charcoal beveled lip.
    const innerBevel = context.createLinearGradient(0, -0.4, 0, 0.4);
    innerBevel.addColorStop(0, '#ffffff');
    innerBevel.addColorStop(0.22, '#e7edf4');
    innerBevel.addColorStop(0.5, '#9aa7b7');
    innerBevel.addColorStop(0.78, '#394657');
    innerBevel.addColorStop(1, '#e7f1fc');
    context.fillStyle = innerBevel;
    context.beginPath();
    context.arc(0, 0, 0.395, 0, Math.PI * 2);
    context.fill();

    const inset = context.createLinearGradient(0, -0.34, 0, 0.34);
    inset.addColorStop(0, '#03070d');
    inset.addColorStop(0.65, '#101b28');
    inset.addColorStop(1, '#263342');
    context.fillStyle = inset;
    context.beginPath();
    context.arc(0, 0, 0.335, 0, Math.PI * 2);
    context.fill();

    if (pulse.glow > 0) {
      // All hit feedback stays inside the recessed face of this receptor.
      context.save();
      context.beginPath();
      context.arc(0, 0, 0.335, 0, Math.PI * 2);
      context.clip();
      context.globalAlpha = pulse.glow;
      context.fillStyle = lane.color;
      context.fillRect(-0.335, -0.335, 0.67, 0.67);

      const flash = context.createRadialGradient(0, 0.05, 0, 0, 0.05, 0.38);
      flash.addColorStop(0, '#ffffff');
      flash.addColorStop(0.25, 'rgba(255, 255, 255, 0.9)');
      flash.addColorStop(1, 'rgba(255, 255, 255, 0)');
      context.globalAlpha = pulse.flash;
      context.fillStyle = flash;
      context.fillRect(-0.335, -0.335, 0.67, 0.67);

      context.globalAlpha = pulse.rippleOpacity;
      context.strokeStyle = '#f3faff';
      context.lineWidth = 0.024;
      context.beginPath();
      context.arc(0, 0, pulse.rippleRadius, 0, Math.PI * 2);
      context.stroke();
      context.restore();

      context.save();
      context.globalAlpha = pulse.glow * 0.65;
      context.strokeStyle = '#ffffff';
      context.lineWidth = 0.035;
      context.beginPath();
      context.arc(0, 0, 0.395, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }

    context.lineWidth = 0.012;
    context.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    context.beginPath();
    context.arc(0, 0, 0.397, Math.PI * 1.1, Math.PI * 1.9);
    context.stroke();
    context.restore();
  }
  context.restore();
}
