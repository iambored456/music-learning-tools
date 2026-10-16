import assert from 'node:assert/strict';
import { test } from 'node:test';
import './beatMapMetronome.test.js';
import { createBoomwhackerVideoBuilderProject, deriveTimingModel, withBeatTimes } from '@mlt/boomwhacker-video-builder-core';
import { getHighwayNoteLayout, getHighwayTimeX } from '../src/highwayLayout.js';
import { getExportStartTimeSec, getExportTotalDurationSec, renderExportFrame } from '../src/browser/exportRenderer.js';

test('regular note centers sit halfway through their grid span for every shape, duration, and zoom', () => {
  for (const shape of ['circle', 'oval', 'diamond'] as const) {
    for (const width of [8, 52, 96]) {
      for (const laneHeightPx of [12, 52, 100]) {
        const layout = getHighwayNoteLayout({ note: { shape }, startX: 300, endX: 300 + width, visualRow: 0, laneHeightPx });
        assert.equal(layout.left + layout.width / 2, 300 + width / 2);
      }
    }
  }
});

test('sustained notes start on the attack and extend to the end time', () => {
  const layout = getHighwayNoteLayout({ note: { shape: 'circle' }, startX: 300, endX: 450, visualRow: 2, laneHeightPx: 52, isSustained: true });
  assert.equal(layout.left, 300);
  assert.equal(layout.left + layout.width, 450);
  assert.equal(layout.top, 104);
});

test('musical beat timestamps retain their hit-line positions with irregular spacing', () => {
  for (const onset of [0, 0.325, 0.65, 1.3, 1.66, 2]) {
    for (const pixelsPerSecond of [40, 160, 320]) {
      const at = getHighwayTimeX(onset, onset, 240, pixelsPerSecond);
      const before = getHighwayTimeX(onset, onset - 0.1, 240, pixelsPerSecond);
      const after = getHighwayTimeX(onset, onset + 0.1, 240, pixelsPerSecond);
      assert.equal(at, 240);
      assert.ok(before > 240);
      assert.ok(after < 240);
    }
  }
});

test('export centers notes within their grid span while the hit line follows song time', async () => {
  const project = createBoomwhackerVideoBuilderProject();
  project.songTiming = withBeatTimes(project.songTiming, [0, 0.325, 0.65]);
  project.exportState.titleCard.enabled = false;
  project.exportState.background = { type: 'solid', color: '#000000' };
  const timing = deriveTimingModel(project.songTiming, project.grid);
  const strokes: Array<{ color: unknown; width: unknown; path: number[][] }> = [];
  const ellipses: number[][] = [];
  const labels: string[] = [];
  let path: number[][] = [];
  const context = new Proxy<Record<string, unknown>>({}, {
    get(target, property: string) {
      if (property in target) return target[property];
      if (property === 'createLinearGradient' || property === 'createRadialGradient') return () => ({ addColorStop() {} });
      if (property === 'beginPath') return () => { path = []; };
      if (property === 'moveTo' || property === 'lineTo') return (...point: number[]) => { path.push(point); };
      if (property === 'ellipse') return (...args: number[]) => { ellipses.push(args); };
      if (property === 'stroke') return () => { strokes.push({ color: target.strokeStyle, width: target.lineWidth, path: [...path] }); };
      if (property === 'fillText') return (label: string) => { labels.push(label); };
      return () => {};
    },
  }) as unknown as CanvasRenderingContext2D;
  const canvas = { width: 0, height: 0, getContext: () => context } as unknown as HTMLCanvasElement;
  const frame = { canvas, project, timing, guides: [], frameTimeSec: 0.325,
    timedNotes: [{ id: 'note', row: 0, noteId: '1', label: '1', marker: 'none', pitchInterval: 0,
      startSlotIndex: 4, endSlotIndex: 7, startTimeSec: 0.325, endTimeSec: 0.65, durationSec: 0.325, shape: 'circle', color: '#ff0000' }],
  } satisfies Parameters<typeof renderExportFrame>[0];
  await renderExportFrame(frame);
  const hitLines = strokes.filter(stroke => stroke.color === '#ffd166');
  assert.equal(hitLines.length, 1);
  const [[topX, topY], [bottomX, bottomY]] = hitLines[0].path;
  assert.equal(hitLines[0].width, 3);
  assert.equal(topX, bottomX);
  assert.ok(bottomY > topY);
  assert.equal(ellipses.length, 1);
  assert.ok(ellipses[0][0] > topX);
  assert.equal(labels.filter(label => label === 'HIT').length, 0);
  // The symbol center reaches the line halfway through its span, without retiming the note.
  await renderExportFrame({ ...frame, frameTimeSec: (0.325 + 0.65) / 2 });
  assert.ok(Math.abs(ellipses.at(-1)![0] - topX) < 1e-9);
  assert.equal(frame.timedNotes[0].startTimeSec, 0.325);
});

test('export lead-ins move the frame origin, never the musical beat timestamps', () => {
  for (const countInEnabled of [false, true]) {
    for (const silentLeadInEnabled of [false, true]) {
      const project = createBoomwhackerVideoBuilderProject();
      project.songTiming = withBeatTimes({ ...project.songTiming, countInEnabled, silentLeadInEnabled }, [0, 0.5, 1]);
      const timing = deriveTimingModel(project.songTiming, project.grid);
      const leadIn = (Number(countInEnabled) * 4 + Number(silentLeadInEnabled)) * 0.5;
      assert.equal(getExportStartTimeSec(project, timing), leadIn === 0 ? 0 : -leadIn);
      assert.equal(getExportTotalDurationSec(project, timing), 1 + leadIn);
      assert.equal(timing.slotBoundaries[0].timeSec, 0);
    }
  }
});
