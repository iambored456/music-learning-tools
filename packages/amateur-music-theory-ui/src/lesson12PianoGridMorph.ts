import { calculateLessonGridLayout } from '@mlt/lesson-kit';
import { pianoLessonRange } from './lesson12PianoRange';
import { lesson12LegendColumns } from './lesson12Grid';

export type LessonGridLayout = ReturnType<typeof calculateLessonGridLayout>;
export type PianoGridMorph = { from: LessonGridLayout; progress: number };

export const pianoTransitionRange = {
  minMidi: Math.min(60, pianoLessonRange.minMidi), maxMidi: Math.max(84, pianoLessonRange.maxMidi),
};

/** Keep C4–C6 fixed initially, then crop the pre-rendered union into the centered piano range. */
export function calculatePianoGridMorph(options: {
  morph: PianoGridMorph;
  frameWidth: number;
  frameHeight: number;
  compactWidth: number;
  pianoHeight: number;
}) {
  const { morph, frameWidth, frameHeight, compactWidth, pianoHeight } = options;
  const progress = Math.max(0, Math.min(1, morph.progress));
  const target = calculateLessonGridLayout({
    width: compactWidth, height: Math.max(0, frameHeight - pianoHeight),
    columns: pianoLessonRange.gridColumns,
    rows: pianoLessonRange.maxMidi - pianoLessonRange.minMidi + 1, legendColumns: lesson12LegendColumns,
  });
  const mix = (from: number, to: number) => from + (to - from) * progress;
  const cellWidth = mix(morph.from.cellWidth, target.cellWidth);
  const height = (pianoTransitionRange.maxMidi - pianoTransitionRange.minMidi + 2) * cellWidth;
  const top = mix(pianoTransitionRange.maxMidi - 84, pianoTransitionRange.maxMidi - pianoLessonRange.maxMidi) * cellWidth;
  const bottom = mix(60 - pianoTransitionRange.minMidi, pianoLessonRange.minMidi - pianoTransitionRange.minMidi) * cellWidth;
  const visibleTop = mix((frameHeight - morph.from.height) / 2,
    (frameHeight - target.height - pianoHeight) / 2);
  return {
    layout: { width: mix(morph.from.width, target.width), height,
      cellWidth, cellHeight: cellWidth * 2, noteDiameter: cellWidth * 2 },
    top, bottom,
    x: mix(0, (frameWidth - target.width) / 2),
    y: visibleTop - top - (frameHeight - height - pianoHeight) / 2,
  };
}
