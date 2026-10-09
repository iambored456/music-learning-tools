import type { LessonCue } from './lessonInspector.svelte';

export const diatonicMidi = [60, 62, 64, 65, 67, 69, 71, 72] as const;
export const fDiatonicMidi = [65, 67, 69, 70, 72, 74, 76, 77] as const;
export const diatonicPattern = [2, 2, 1, 2, 2, 2, 1] as const;
export const majorSecondPairs = [0, 1, 3, 4, 5] as const;
export const minorSecondPairs = [2, 6] as const;
const letters = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'];
const fLetters = ['F', 'G', 'A', 'B♭', 'C', 'D', 'E', 'F'];
export type ScaleNote = { id: string; midi: number; label: string; index: number };
export type ScaleState = {
  notes: ScaleNote[]; found: number[]; patternVisible: boolean; bracket: readonly [number, number] | null;
  upperExpanded: boolean;
};
type Action = { id: string; title: string; detail: string };
export type ScaleStep = Action & (
  | { kind: 'setup'; notes: ScaleNote[]; slideIn?: boolean }
  | { kind: 'say'; text: string; stackBubble?: boolean }
  | { kind: 'bracket'; indices: readonly [number, number] | null }
  | { kind: 'pattern' }
  | { kind: 'expand-upper' }
  | { kind: 'play'; indices: readonly number[]; highlightPattern?: boolean }
  | { kind: 'find'; distance: 1 | 2; targetTotal: number; text: string }
  | { kind: 'place'; index: number; text: string }
  | { kind: 'retry' | 'correct' }
  | { kind: 'finish'; text?: string }
);
export type ScaleCue = LessonCue & { steps: readonly ScaleStep[] };
export type ScalePlan = {
  initial: ScaleState; lowMidi: number; highMidi?: number; tonic?: 'C' | 'F';
  hideOctaveLabels?: boolean; cues: readonly ScaleCue[];
};

export function createScaleNotes(count = 8, octaveOffset = 0, tonic: 'C' | 'F' = 'C'): ScaleNote[] {
  const pitches = tonic === 'F' ? fDiatonicMidi : diatonicMidi;
  const names = tonic === 'F' ? fLetters : letters;
  return pitches.slice(0, count).map((midi, index) => ({
    id: `scale-${tonic === 'F' ? 'f-' : ''}${octaveOffset}-${index}`, midi: midi + octaveOffset * 12, index,
    label: `${names[index]}${Math.floor(midi / 12) - 1 + octaveOffset}`,
  }));
}

/** Musical column centers, with two columns per standardized circular note. */
export function scaleColumn(index: number, columns: number): number {
  return Math.floor((columns - 14) / 2) + index * 2;
}

export function isScalePlacementCorrect(index: number, midi: number, centerColumn: number, columns: number, pitches: readonly number[] = diatonicMidi): boolean {
  return Number.isInteger(index) && index >= 1 && index <= 7
    && midi === pitches[index] && centerColumn === scaleColumn(index, columns);
}

export function evaluateScalePair(first: number, second: number, distance: 1 | 2, found: readonly number[]):
  { result: 'correct' | 'retry' | 'duplicate'; pair: number | null } {
  const pair = Math.min(first, second);
  if (!Number.isInteger(first) || !Number.isInteger(second) || pair < 0 || pair > 6
    || Math.abs(first - second) !== 1 || diatonicPattern[pair] !== distance) return { result: 'retry', pair: null };
  return { result: found.includes(pair) ? 'duplicate' : 'correct', pair };
}

export function remainingScalePairs(distance: 1 | 2, found: readonly number[]): number[] {
  return (distance === 2 ? majorSecondPairs : minorSecondPairs).filter(pair => !found.includes(pair));
}

function cue(id: string, title: string, steps: readonly ScaleStep[]): ScaleCue {
  const input = steps.find(step => step.kind === 'find' || step.kind === 'place');
  return { id, title, steps, actions: steps.map(({ id, title, detail }) => ({ id, title, detail })),
    prompt: steps.map(step => 'text' in step ? step.text : '').filter(Boolean).join(' '),
    visual: steps.map(step => step.detail).join(' '), audio: 'Shared piano voices and Grammy narration.',
    gesture: input?.kind === 'find' ? 'Select either note first, using pointer or keyboard.'
      : input?.kind === 'place' ? 'Place the next note in the highlighted column, using pointer or keyboard.' : '',
    input: input?.kind === 'find' ? 'Accept each new neighbouring pair of the requested distance once.'
      : input?.kind === 'place' ? 'Both pitch and next column must match.' : '',
    completion: input ? 'Accept input immediately; continue after correct answers.' : 'Finish narration and playback.',
    timing: {} };
}
function say(text: string, stackBubble = false): ScaleStep { return { id: 'say', kind: 'say', text, stackBubble, title: `“${text}”`, detail: 'Grammy explains the visible example.' }; }
function setup(notes = createScaleNotes(), slideIn = false): ScaleStep {
  return { id: 'setup', kind: 'setup', notes, slideIn, title: 'Show the notes',
    detail: slideIn ? 'Slide the scale notes on from the left in their exact pitch colours.' : 'Use standardized notes in their exact pitch colours.' };
}
function play(indices: readonly number[], highlightPattern = false): ScaleStep {
  return { id: 'listen', kind: 'play', indices, highlightPattern, title: 'Hear the example', detail: 'Play notes from left to right; follow their sounding envelopes.' };
}
function bracket(indices: readonly [number, number] | null): ScaleStep {
  return { id: 'bracket', kind: 'bracket', indices, title: indices ? 'Show the pitch distance' : 'Clear the example bracket', detail: 'Extend each bracket arm to its own note.' };
}
const pattern: ScaleStep = { id: 'pattern', kind: 'pattern', title: 'Show the interval pattern', detail: 'Display +2, +2, +1, +2, +2, +2, +1 beneath Grammy.' };
const feedback: ScaleStep[] = [
  { id: 'retry', kind: 'retry', title: 'If incorrect: “Try again.”', detail: 'Keep accepted notes and pairs; reopen the same question.' },
  { id: 'correct', kind: 'correct', title: 'If correct: “Correct!”', detail: 'Keep the accepted note or pair marked and continue.' },
];
function finish(text?: string): ScaleStep {
  return { id: 'finish', kind: 'finish', text, title: text ?? 'Continue to the next Section', detail: 'Finish this Section after the shared completion pause.' };
}
function finding(id: string, distance: 1 | 2, targetTotal: number, text: string): ScaleCue {
  return cue(id, text, [{ id: 'question', kind: 'find', distance, targetTotal, text,
    title: text, detail: 'Keep found intervals marked. Duplicate pairs do not count again. Answers interrupt narration.' }, ...feedback]);
}
function initial(count = 8, found: number[] = [], patternVisible = false): ScaleState {
  return { notes: createScaleNotes(count), found, patternVisible, bracket: null, upperExpanded: false };
}

function buildingCues(tonic: 'C' | 'F'): ScaleCue[] {
  const names = tonic === 'F' ? fLetters : letters;
  const start: ScaleStep[] = tonic === 'F' ? [{ id: 'expand', kind: 'expand-upper',
    title: 'Extend the grid to F5', detail: 'Move the grid down, then expand its upper edge from C5 to F5 without resizing its cells.' }] : [];
  return [
    cue('start', `Build from ${tonic}`, [...start, setup(createScaleNotes(1, 0, tonic)),
      say(tonic === 'F' ? 'Using the interval pattern, create a Diatonic Scale starting on F.' : 'Let’s build a diatonic scale from C.'), play([0])]),
    ...diatonicPattern.map((distance, index) => {
      const text = `Place a note a ${distance === 2 ? 'major' : 'minor'} second above ${names[index]}${tonic === 'C' ? '4' : ''}.`;
      return cue(`note-${index + 1}`, text, [{ id: 'question', kind: 'place', index: index + 1, text, title: text,
        detail: 'The next column is highlighted without revealing the answer pitch. Accept input immediately.' }, ...feedback]);
    }),
    cue('celebrate', 'Hear the completed scale', [play([0, 1, 2, 3, 4, 5, 6, 7], true), finish('You did it! You built a diatonic scale!')]),
  ];
}

export const scalePlans: Record<string, ScalePlan> = {
  'scale-introduction': { initial: initial(0), lowMidi: 57, cues: [
    cue('group', 'A group of notes', [say('A scale, put simply, is a group of notes.', true)]),
    cue('cultures', 'Many scales', [say('There are many scales throughout human culture.', true)]),
    cue('diatonic', 'The diatonic scale', [setup(createScaleNotes(), true), say('The Diatonic Scale is a foundation of Western music.', true), finish()]),
  ] },
  'seven-notes': { initial: initial(), lowMidi: 48, cues: [
    cue('seven', 'Seven notes', [setup(), say('The diatonic scale has seven unique pitches in an octave, with an eighth pitch completing the octave.'), play([0, 1, 2, 3, 4, 5, 6, 7])]),
    cue('octave', 'The next C', [setup(), bracket([0, 7]), say('This C repeats the first note, one octave higher.'), play([0, 7])]),
    cue('repeat', 'Repeating in every octave', [bracket(null), setup([...createScaleNotes(8, -1), ...createScaleNotes()]), say('It repeats the same way in every octave.'), play(Array.from({ length: 16 }, (_, index) => index)), finish()]),
  ] },
  'scale-intervals': { initial: initial(), lowMidi: 60, hideOctaveLabels: true, cues: [
    cue('sizes', 'Two interval sizes', [say('Between neighbouring notes in the diatonic scale, there are two kinds of interval: major seconds and minor seconds.')]),
    cue('major', 'A major 2nd', [bracket([0, 1]), say('C to D is a major second: two pitches apart.'), play([0, 1])]),
    cue('minor', 'A minor 2nd', [bracket([2, 3]), say('E to F is a minor second: one pitch apart.'), play([2, 3]), finish()]),
  ] },
  'find-major-seconds': { initial: initial(), lowMidi: 60, hideOctaveLabels: true, cues: [
    finding('first', 2, 1, 'Click on two notes that are a major second apart.'),
    finding('rest', 2, 5, 'Find the rest.'),
    cue('replay', 'Hear all five major 2nds', [...majorSecondPairs.map((pair, index) => ({ ...play([pair, pair + 1]), id: `listen-${index + 1}` })), finish('Good job!')]),
  ] },
  'find-minor-seconds': { initial: initial(8, [...majorSecondPairs]), lowMidi: 60, hideOctaveLabels: true, cues: [
    finding('first', 1, 6, 'Click on two notes that are a minor second apart.'),
    finding('last', 1, 7, 'Find the last pair.'),
    cue('replay', 'Hear both minor 2nds', [...minorSecondPairs.map((pair, index) => ({ ...play([pair, pair + 1]), id: `listen-${index + 1}` })), finish('Good job!')]),
  ] },
  'scale-pattern': { initial: initial(8, [0, 1, 2, 3, 4, 5, 6]), lowMidi: 60, hideOctaveLabels: true, cues: [
    cue('pattern', 'The interval pattern', [pattern, say('The interval pattern for this diatonic scale is plus two, plus two, plus one, plus two, plus two, plus two, plus one.')]),
    cue('listen', 'Hear the pattern', [play([0, 1, 2, 3, 4, 5, 6, 7], true), finish()]),
  ] },
  'build-scale': { initial: initial(0, [], true), lowMidi: 60, hideOctaveLabels: true, cues: buildingCues('C') },
  'build-scale-f': { initial: initial(8, [], true), lowMidi: 60, highMidi: 77, tonic: 'F', hideOctaveLabels: true, cues: buildingCues('F') },
};

/** Restore completed actions before a checkpoint without needing audio or DOM state. */
export function getScaleCheckpoint(plan: ScalePlan, cueIndex: number, stepIndex: number): ScaleState {
  const state: ScaleState = { ...plan.initial, notes: [...plan.initial.notes], found: [...plan.initial.found] };
  for (let ci = 0; ci <= cueIndex; ci++) {
    const steps = plan.cues[ci]?.steps ?? [];
    for (let si = 0; si < (ci === cueIndex ? stepIndex : steps.length); si++) {
      const step = steps[si];
      if (step.kind === 'setup') state.notes = [...step.notes];
      if (step.kind === 'bracket') state.bracket = step.indices;
      if (step.kind === 'pattern') state.patternVisible = true;
      if (step.kind === 'expand-upper') state.upperExpanded = true;
      if (step.kind === 'find') state.found.push(...remainingScalePairs(step.distance, state.found).slice(0, step.targetTotal - state.found.length));
      if (step.kind === 'place') {
        state.notes = createScaleNotes(step.index + 1, 0, plan.tonic);
        state.found = Array.from({ length: step.index }, (_, index) => index);
      }
    }
  }
  return state;
}

/** Restore the retained bubble when seeking without speaking earlier text. */
export function getScaleBubbleCheckpoint(plan: ScalePlan, cueIndex: number, stepIndex: number) {
  let upper = '';
  let current = '';
  for (let ci = 0; ci <= cueIndex; ci++) {
    const steps = plan.cues[ci]?.steps ?? [];
    for (const step of steps.slice(0, ci === cueIndex ? stepIndex : steps.length)) {
      if (step.kind !== 'say') continue;
      upper = step.stackBubble ? current : '';
      current = step.text;
    }
  }
  return { upper, current };
}

export function getScaleSeekTarget(plan: ScalePlan, cueId: string, actionId?: string):
  { cueIndex: number; stepIndex: number; branch: 'normal' | 'retry' | 'correct' } | null {
  const cueIndex = plan.cues.findIndex(cue => cue.id === cueId);
  if (cueIndex < 0) return null;
  const steps = plan.cues[cueIndex].steps;
  const selected = actionId ? steps.findIndex(step => step.id === actionId) : 0;
  if (selected < 0) return null;
  const kind = steps[selected].kind;
  const branch = kind === 'retry' || kind === 'correct' ? kind : 'normal';
  const stepIndex = branch === 'normal' ? selected : steps.findIndex(step => step.kind === 'find' || step.kind === 'place');
  return stepIndex < 0 ? null : { cueIndex, stepIndex, branch };
}
