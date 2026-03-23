import type {
  BeatPin,
  BoomwhackerGridNote,
  DerivedBeatSpan,
  DerivedGuideLine,
  DerivedSlotBoundary,
  DerivedTimingModel,
  GridSubdivisionState,
  MacrobeatGrouping,
  TimedBoomwhackerNote,
} from './types.js';
import { getBoomwhackerLane } from './lanes.js';

export function getSlotCountForGrouping(grouping: MacrobeatGrouping): number {
  return grouping === 3 ? 6 : 4;
}

export function getMacrobeatGroupingAtBeatIndex(
  grid: GridSubdivisionState,
  beatIndex: number,
): MacrobeatGrouping {
  return (
    grid.localMacrobeatGroupings.find((override) => override.beatIndex === beatIndex)?.grouping
    ?? grid.defaultMacrobeatGrouping
  );
}

function sortBeatPins(beatPins: BeatPin[]): BeatPin[] {
  return [...beatPins].sort((left, right) => left.timeSec - right.timeSec);
}

export function estimateTempoFromBeatPins(beatPins: BeatPin[]): number | null {
  const orderedBeatPins = sortBeatPins(beatPins);
  if (orderedBeatPins.length < 2) {
    return null;
  }

  const intervals: number[] = [];
  for (let index = 1; index < orderedBeatPins.length; index += 1) {
    const interval = orderedBeatPins[index].timeSec - orderedBeatPins[index - 1].timeSec;
    if (interval > 0) {
      intervals.push(interval);
    }
  }

  if (intervals.length === 0) {
    return null;
  }

  const sortedIntervals = [...intervals].sort((left, right) => left - right);
  const medianInterval = sortedIntervals[Math.floor(sortedIntervals.length / 2)] ?? intervals[0];
  if (medianInterval <= 0) {
    return null;
  }

  return 60 / medianInterval;
}

export function deriveTimingModel(
  beatPins: BeatPin[],
  grid: GridSubdivisionState,
): DerivedTimingModel {
  const orderedBeatPins = sortBeatPins(beatPins);
  if (orderedBeatPins.length < 2) {
    return {
      beatSpans: [],
      slotBoundaries: [
        {
          slotIndex: 0,
          timeSec: orderedBeatPins[0]?.timeSec ?? 0,
          beatIndex: null,
          fractionOfBeat: 0,
          isBeatStart: true,
          isSubdivisionStart: true,
          isDownbeat: orderedBeatPins[0]?.isDownbeat ?? false,
        },
      ],
      totalSlotCount: 0,
      totalDurationSec: 0,
    };
  }

  const beatSpans: DerivedBeatSpan[] = [];
  const slotBoundaries: DerivedSlotBoundary[] = [];
  let runningSlotIndex = 0;

  for (let beatIndex = 0; beatIndex < orderedBeatPins.length - 1; beatIndex += 1) {
    const beatPin = orderedBeatPins[beatIndex];
    const nextBeatPin = orderedBeatPins[beatIndex + 1];
    const grouping = getMacrobeatGroupingAtBeatIndex(grid, beatIndex);
    const slotCount = getSlotCountForGrouping(grouping);
    const durationSec = Math.max(0, nextBeatPin.timeSec - beatPin.timeSec);

    beatSpans.push({
      beatIndex,
      beatPinId: beatPin.id,
      nextBeatPinId: nextBeatPin.id,
      startTimeSec: beatPin.timeSec,
      endTimeSec: nextBeatPin.timeSec,
      durationSec,
      grouping,
      slotCount,
      startSlotIndex: runningSlotIndex,
      endSlotIndex: runningSlotIndex + slotCount - 1,
      isDownbeat: beatPin.isDownbeat,
    });

    for (let localSlotIndex = 0; localSlotIndex < slotCount; localSlotIndex += 1) {
      const fractionOfBeat = localSlotIndex / slotCount;
      slotBoundaries.push({
        slotIndex: runningSlotIndex + localSlotIndex,
        timeSec: beatPin.timeSec + (durationSec * fractionOfBeat),
        beatIndex,
        fractionOfBeat,
        isBeatStart: localSlotIndex === 0,
        isSubdivisionStart: localSlotIndex % 2 === 0,
        isDownbeat: beatPin.isDownbeat && localSlotIndex === 0,
      });
    }

    runningSlotIndex += slotCount;
  }

  const finalBeatPin = orderedBeatPins[orderedBeatPins.length - 1];
  slotBoundaries.push({
    slotIndex: runningSlotIndex,
    timeSec: finalBeatPin.timeSec,
    beatIndex: beatSpans[beatSpans.length - 1]?.beatIndex ?? null,
    fractionOfBeat: 1,
    isBeatStart: true,
    isSubdivisionStart: true,
    isDownbeat: finalBeatPin.isDownbeat,
  });

  return {
    beatSpans,
    slotBoundaries,
    totalSlotCount: runningSlotIndex,
    totalDurationSec: Math.max(0, finalBeatPin.timeSec - orderedBeatPins[0].timeSec),
  };
}

export function deriveGuideLines(timing: DerivedTimingModel): DerivedGuideLine[] {
  const guides: DerivedGuideLine[] = [];

  for (const span of timing.beatSpans) {
    guides.push({
      id: `beat-${span.beatIndex}`,
      timeSec: span.startTimeSec,
      beatIndex: span.beatIndex,
      slotIndex: span.startSlotIndex,
      kind: span.isDownbeat ? 'downbeat' : 'beat',
      emphasis: span.isDownbeat ? 'solid' : 'dashed',
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
