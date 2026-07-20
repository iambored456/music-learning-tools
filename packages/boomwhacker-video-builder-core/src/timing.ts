import type {
  BoomwhackerGridNote,
  DerivedBeatSpan,
  DerivedGuideLine,
  DerivedSlotBoundary,
  DerivedTimingModel,
  GridSubdivisionState,
  MacrobeatGrouping,
  SongTimingState,
  TimedBoomwhackerNote,
} from './types.js';
import { getBoomwhackerLane } from './lanes.js';

export function getSlotCountForGrouping(grouping: MacrobeatGrouping): number {
  return grouping === 3 ? 6 : 4;
}

function clampTimingInteger(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function getMacrobeatGroupingAtBeatIndex(
  grid: GridSubdivisionState,
  beatIndex: number,
): MacrobeatGrouping {
  void beatIndex;
  return grid.defaultMacrobeatGrouping;
}

export function deriveTimingModel(
  songTiming: SongTimingState,
  grid: GridSubdivisionState,
): DerivedTimingModel {
  const tempoBpm = Number.isFinite(songTiming.tempoBpm) ? songTiming.tempoBpm : 0;
  const beatCount = Number.isFinite(songTiming.beatCount) ? Math.trunc(songTiming.beatCount) : 0;
  const firstBeatOffsetSec = Number.isFinite(songTiming.firstBeatOffsetSec)
    ? Math.max(0, songTiming.firstBeatOffsetSec)
    : 0;
  const countInBeats = clampTimingInteger(songTiming.countInBeats, 0, 32, 4);
  const countInLeadInBeats = countInBeats > 0 ? 1 : 0;
  const totalCountInBeats = countInBeats + countInLeadInBeats;
  const timeSignatureNumerator = clampTimingInteger(songTiming.timeSignatureNumerator, 1, 16, 4);
  const timeSignatureDenominator = [2, 4, 8, 16].includes(songTiming.timeSignatureDenominator)
    ? songTiming.timeSignatureDenominator
    : 4;

  if (tempoBpm <= 0 || beatCount < 1) {
    return {
      beatSpans: [],
      slotBoundaries: [
        {
          slotIndex: 0,
          timeSec: firstBeatOffsetSec,
          beatIndex: null,
          fractionOfBeat: 0,
          isBeatStart: true,
          isSubdivisionStart: true,
        },
      ],
      totalSlotCount: 0,
      totalDurationSec: 0,
      secondsPerBeat: 0,
      countInBeats,
      countInLeadInBeats,
      countInDurationSec: 0,
      countInStartTimeSec: firstBeatOffsetSec,
      timeSignatureNumerator,
      timeSignatureDenominator,
    };
  }

  const beatSpans: DerivedBeatSpan[] = [];
  const slotBoundaries: DerivedSlotBoundary[] = [];
  let runningSlotIndex = 0;
  const secondsPerBeat = 60 / tempoBpm;
  const countInDurationSec = totalCountInBeats * secondsPerBeat;
  const countInStartTimeSec = firstBeatOffsetSec - countInDurationSec;

  for (let beatIndex = 0; beatIndex < beatCount; beatIndex += 1) {
    const grouping = getMacrobeatGroupingAtBeatIndex(grid, beatIndex);
    const slotCount = getSlotCountForGrouping(grouping);
    const startTimeSec = firstBeatOffsetSec + (beatIndex * secondsPerBeat);
    const endTimeSec = startTimeSec + secondsPerBeat;

    beatSpans.push({
      beatIndex,
      beatId: `beat-${beatIndex + 1}`,
      nextBeatId: `beat-${beatIndex + 2}`,
      startTimeSec,
      endTimeSec,
      durationSec: secondsPerBeat,
      grouping,
      slotCount,
      startSlotIndex: runningSlotIndex,
      endSlotIndex: runningSlotIndex + slotCount - 1,
    });

    for (let localSlotIndex = 0; localSlotIndex < slotCount; localSlotIndex += 1) {
      const fractionOfBeat = localSlotIndex / slotCount;
      slotBoundaries.push({
        slotIndex: runningSlotIndex + localSlotIndex,
        timeSec: startTimeSec + (secondsPerBeat * fractionOfBeat),
        beatIndex,
        fractionOfBeat,
        isBeatStart: localSlotIndex === 0,
        isSubdivisionStart: localSlotIndex % 2 === 0,
      });
    }

    runningSlotIndex += slotCount;
  }

  const finalTimeSec = firstBeatOffsetSec + (beatCount * secondsPerBeat);
  slotBoundaries.push({
    slotIndex: runningSlotIndex,
    timeSec: finalTimeSec,
    beatIndex: beatSpans[beatSpans.length - 1]?.beatIndex ?? null,
    fractionOfBeat: 1,
    isBeatStart: true,
    isSubdivisionStart: true,
  });

  return {
    beatSpans,
    slotBoundaries,
    totalSlotCount: runningSlotIndex,
    totalDurationSec: finalTimeSec,
    secondsPerBeat,
    countInBeats,
    countInLeadInBeats,
    countInDurationSec,
    countInStartTimeSec,
    timeSignatureNumerator,
    timeSignatureDenominator,
  };
}

export function deriveGuideLines(timing: DerivedTimingModel): DerivedGuideLine[] {
  const guides: DerivedGuideLine[] = [];
  const countInBeats = Math.max(0, Math.round(timing.countInBeats));
  const countInLeadInBeats = Math.max(0, Math.round(timing.countInLeadInBeats));
  const visibleCountInStartTimeSec = timing.countInStartTimeSec + (countInLeadInBeats * timing.secondsPerBeat);

  for (let countInIndex = 0; countInIndex < countInBeats; countInIndex += 1) {
    const remainingCount = countInBeats - countInIndex;
    guides.push({
      id: `count-in-${countInIndex}`,
      timeSec: visibleCountInStartTimeSec + (countInIndex * timing.secondsPerBeat),
      beatIndex: -remainingCount,
      slotIndex: 0,
      kind: 'count-in',
      emphasis: 'dashed',
      label: String(remainingCount),
    });
  }

  for (const span of timing.beatSpans) {
    const isMeasureStart = span.beatIndex % timing.timeSignatureNumerator === 0;
    guides.push({
      id: `beat-${span.beatIndex}`,
      timeSec: span.startTimeSec,
      beatIndex: span.beatIndex,
      slotIndex: span.startSlotIndex,
      kind: isMeasureStart ? 'measure' : 'beat',
      emphasis: isMeasureStart ? 'solid' : 'dashed',
      measureIndex: isMeasureStart ? Math.floor(span.beatIndex / timing.timeSignatureNumerator) : undefined,
      label: isMeasureStart ? String(Math.floor(span.beatIndex / timing.timeSignatureNumerator) + 1) : undefined,
    });

    for (let localSlotIndex = 2; localSlotIndex < span.slotCount; localSlotIndex += 2) {
      const boundary = timing.slotBoundaries[span.startSlotIndex + localSlotIndex];
      if (!boundary) {
        continue;
      }

      guides.push({
        id: `subdivision-${span.beatIndex}-${localSlotIndex}`,
        timeSec: boundary.timeSec,
        beatIndex: span.beatIndex,
        slotIndex: boundary.slotIndex,
        kind: 'subdivision',
        emphasis: 'light',
      });
    }
  }

  return guides;
}

export function slotIndexToTimeSec(
  timing: DerivedTimingModel,
  slotIndex: number,
): number {
  if (timing.slotBoundaries.length === 0) {
    return 0;
  }

  const clampedSlotIndex = Math.max(0, Math.min(slotIndex, timing.slotBoundaries.length - 1));
  return timing.slotBoundaries[clampedSlotIndex]?.timeSec ?? timing.slotBoundaries[timing.slotBoundaries.length - 1].timeSec;
}

export function deriveTimedNotes(
  notes: BoomwhackerGridNote[],
  timing: DerivedTimingModel,
): TimedBoomwhackerNote[] {
  const timedNotes: Array<TimedBoomwhackerNote | null> = notes
    .map((note) => {
      const lane = getBoomwhackerLane(note.row);
      if (!lane) {
        return null;
      }

      const startTimeSec = slotIndexToTimeSec(timing, note.startSlotIndex);
      const endTimeSec = slotIndexToTimeSec(timing, note.endSlotIndex + 1);
      const safeEndTimeSec = Math.max(endTimeSec, startTimeSec);

      return {
        id: note.id,
        row: note.row,
        noteId: note.noteId,
        label: lane.label,
        marker: lane.marker,
        pitchInterval: note.pitchInterval,
        startSlotIndex: note.startSlotIndex,
        endSlotIndex: note.endSlotIndex,
        startTimeSec,
        endTimeSec: safeEndTimeSec,
        durationSec: safeEndTimeSec - startTimeSec,
        color: note.color,
        shape: note.shape,
        lyric: note.lyric,
      };
    });

  return timedNotes.filter((note): note is TimedBoomwhackerNote => note !== null);
}
