import type { LessonCue } from './lessonInspector.svelte';

export type IntervalDistance = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type IntervalDirection = 'above' | 'below' | 'either';
export type IntervalPitch = { midi: number; label: string };
export type IntervalNote = IntervalPitch & { id: string; leftPercent: number };
export type IntervalQuestion = {
  reference: IntervalPitch;
  distance: IntervalDistance;
  direction: IntervalDirection;
  answer?: IntervalPitch;
  prompt?: string;
  spokenPrompt?: string;
  initialNotes?: readonly IntervalNote[];
  choices?: readonly IntervalChoice[];
  correctChoice?: string;
  successText?: string;
  octave?: IntervalPitch;
};
export type IntervalChoice = {
  id: string;
  label: string;
  pitches?: readonly [IntervalPitch, IntervalPitch];
};
type StepText = { id: string; title: string; detail: string };
type IntervalExampleOptions = {
  exampleId?: string;
  leftPercents?: readonly [number, number];
  retainPrevious?: boolean;
};
export type IntervalStep = StepText & (
  | { kind: 'say'; text: string; showDistanceBracket?: boolean }
  | ({ kind: 'setup'; pitches: readonly [IntervalPitch, IntervalPitch]; together: boolean } & IntervalExampleOptions)
  | { kind: 'move'; pitch: IntervalPitch }
  | { kind: 'play'; together: boolean; exampleId?: string }
  | { kind: 'chart'; distance: IntervalDistance; text: string }
  | { kind: 'question'; question: IntervalQuestion; introduction?: string }
  | { kind: 'retry' | 'correct' }
  | { kind: 'finish'; text: string; replay: 'answers' | 'visible'; exitNotes?: boolean }
);
export type IntervalCue = LessonCue & { steps: readonly IntervalStep[] };
export type IntervalPlan = {
  initialChart: IntervalDistance;
  initialChartVisible: boolean;
  initialDistances?: readonly IntervalDistance[];
  ascendingPlayback?: boolean;
  cues: readonly IntervalCue[];
};

export const intervalPitchRange = { lowMidi: 57, highMidi: 81 } as const;
export const intervalNames = ['unison', 'minor 2nd', 'major 2nd', 'minor 3rd', 'major 3rd',
  'perfect 4th', 'tritone', 'perfect 5th', 'minor 6th', 'major 6th', 'minor 7th', 'major 7th', 'octave'] as const;
export const intervalFamilies = ['unison', '2nd', '2nd', '3rd', '3rd', '4th', 'tritone', '5th',
  '6th', '6th', '7th', '7th', 'octave'] as const;
const naturalPitchClasses: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function pitch(label: string): IntervalPitch {
  const [, letter, accidental, octave] = /^([A-G])([b#]?)(\d+)$/.exec(label)!;
  return { label, midi: (Number(octave) + 1) * 12 + naturalPitchClasses[letter] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0) };
}

export function displayIntervalPitch(label: string): string {
  return label.replace('#', '♯').replace('b', '♭');
}

export function speakIntervalPitch(label: string): string {
  return label.replace('#', ' sharp ').replace('b', ' flat ').replace(/(\D)(\d)/, '$1 $2');
}

export function intervalPrompt(question: IntervalQuestion, spoken = false): string {
  if (question.prompt) return spoken ? question.spokenPrompt ?? question.prompt : question.prompt;
  const name = intervalNames[question.distance];
  const reference = spoken ? speakIntervalPitch(question.reference.label) : displayIntervalPitch(question.reference.label);
  const interval = spoken ? speakIntervalName(question.distance) : name;
  const article = question.distance === 12 ? 'an' : 'a';
  return question.direction === 'either'
    ? `Place a note to create ${article} ${interval} interval.`
    : `Place a note ${question.direction} ${reference} to create ${article} ${interval} interval.`;
}

export function speakIntervalName(distance: IntervalDistance): string {
  return intervalNames[distance].replace('2nd', 'second').replace('3rd', 'third').replace('4th', 'fourth')
    .replace('5th', 'fifth').replace('6th', 'sixth').replace('7th', 'seventh');
}

/** Time position never changes pitch distance; every musical column is valid. */
export function isIntervalPlacementCorrect(question: IntervalQuestion, placement: { midi: number; leftPercent: number }): boolean {
  const difference = placement.midi - question.reference.midi;
  return !question.choices && Number.isFinite(placement.leftPercent) && Number.isInteger(placement.midi)
    && placement.leftPercent >= 0 && placement.leftPercent <= 100
    && placement.midi >= intervalPitchRange.lowMidi && placement.midi <= intervalPitchRange.highMidi
    && Math.abs(difference) === question.distance
    && (question.direction === 'either' || (question.direction === 'above' ? difference > 0 : difference < 0));
}

/** Preserve authored spelling, or derive the interval's letter distance and octave. */
export function intervalAnswerPitch(question: IntervalQuestion, midi?: number): IntervalPitch {
  const answerMidi = midi ?? question.reference.midi + (question.direction === 'below' ? -question.distance : question.distance);
  if (question.answer?.midi === answerMidi) return { ...question.answer };
  if (answerMidi === question.reference.midi) return { ...question.reference };
  const letters = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const referenceLetter = letters.indexOf(question.reference.label[0]);
  const letterSteps = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6, 7][question.distance];
  const letterIndex = referenceLetter + (answerMidi > question.reference.midi ? letterSteps : -letterSteps);
  const letter = letters[(letterIndex % 7 + 7) % 7];
  const referenceOctave = Number(question.reference.label.match(/\d+$/)![0]);
  const octave = referenceOctave + Math.floor(letterIndex / 7);
  const alteration = answerMidi - ((octave + 1) * 12 + naturalPitchClasses[letter]);
  // Wrong answers use the grid's chromatic spelling instead of inventing double accidentals.
  if (Math.abs(alteration) > 1) {
    const names = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    return { midi: answerMidi, label: `${names[answerMidi % 12]}${octave}` };
  }
  return { midi: answerMidi, label: `${letter}${alteration === 1 ? '#' : alteration === -1 ? 'b' : ''}${octave}` };
}

export function getIntervalQuestionNotes(question: IntervalQuestion): IntervalNote[] {
  return question.initialNotes?.map(note => ({ ...note }))
    ?? [{ ...question.reference, id: 'reference', leftPercent: 32 }];
}

export function getIntervalAnswerNotes(question: IntervalQuestion, answer: IntervalNote): IntervalNote[] {
  if (question.choices) return [{ ...question.reference, id: 'reference', leftPercent: 32 }, answer];
  return [...getIntervalQuestionNotes(question).filter(note => note.id !== 'answer'), answer];
}

export function getIntervalPlaybackOrder(items: readonly IntervalNote[], ascending: boolean): IntervalNote[] {
  return [...items].sort((a, b) => ascending ? a.midi - b.midi : a.leftPercent - b.leftPercent);
}

export function cue(id: string, title: string, steps: readonly IntervalStep[]): IntervalCue {
  const question = steps.find(step => step.kind === 'question');
  return { id, title, steps, actions: steps.map(({ id, title, detail }) => ({ id, title, detail })),
    prompt: steps.map(step => step.kind === 'say' || step.kind === 'chart' || step.kind === 'finish'
      ? step.text : step.kind === 'question' ? [step.introduction, intervalPrompt(step.question)].filter(Boolean).join(' ') : '').filter(Boolean).join(' '),
    visual: steps.filter(step => ['setup', 'move', 'chart'].includes(step.kind)).map(step => step.detail).join(' '),
    audio: question ? 'Sound the reference and the attempted interval.' : steps.some(step => step.kind === 'play') ? 'Sound the displayed pair.' : '',
    gesture: question ? question.kind === 'question' && question.question.choices
      ? 'Select an answer or replay a displayed pair with pointer or keyboard.'
      : 'Place a note in any column with pointer or keyboard.' : '',
    input: question ? question.kind === 'question' && question.question.choices
      ? 'The selected choice determines correctness.' : 'Pitch distance and the requested direction determine correctness.' : '',
    completion: question ? 'A correct placement continues to the next question.' : 'Finish narration and playback before continuing.',
    timing: { noteMovementMs: 650, chartRevealMs: 650 } };
}
export function say(id: string, text: string, showDistanceBracket = false): IntervalStep {
  return { id, kind: 'say', title: `“${text}”`, detail: showDistanceBracket
    ? 'Grammy explains while a bracket to the left of the notes spans their pitch distance.'
    : 'Grammy explains while the pitch grid keeps the example visible.', text, showDistanceBracket };
}
export function pair(first: string, second: string, together: boolean, options: IntervalExampleOptions = {}): IntervalStep {
  return { id: 'pair', kind: 'setup', title: together ? 'Place the notes in the same column' : 'Place the notes in different columns',
    detail: options.retainPrevious ? 'Add the simultaneous pair while keeping the earlier pair visible.'
      : 'The two notes keep the same pitches; only their time positions differ.', pitches: [pitch(first), pitch(second)], together, ...options };
}
export function play(together: boolean, exampleId?: string): IntervalStep {
  return { id: 'listen', kind: 'play', title: together ? 'Hear both pitches at the same time' : 'Hear the pitches at different times',
    detail: 'Sound this pair and fill each note with its own audio envelope; keep the other examples visible.', together, exampleId };
}
export function moved(pitchName: string): IntervalStep {
  return { id: 'move', kind: 'move', title: `Move the second note to ${displayIntervalPitch(pitchName)}`,
    detail: 'Move the note vertically without changing its time column.', pitch: pitch(pitchName) };
}
export function chart(distance: IntervalDistance, text: string): IntervalStep {
  return { id: 'chart', kind: 'chart', title: `Show distance ${distance}: ${intervalNames[distance]}`,
    detail: distance === 0 ? 'Slide the chart in from the left screen edge, showing its headers and unison row.'
      : 'Insert the new row in descending distance order, retaining every earlier row.', distance, text };
}
export function finish(text: string, replay: 'answers' | 'visible' = 'answers', exitNotes = false): IntervalCue {
  return cue('finish', 'Complete the Section', [{ id: 'reward', kind: 'finish',
    title: exitNotes ? 'Slide the notes off screen and continue' : 'Hear the intervals and continue',
    detail: replay === 'visible' ? `Replay both visible pairs in grid order, then say “${text}” and continue.`
      : text ? exitNotes ? 'Replay completed answers, celebrate, then slide the remaining notes off the right screen edge before continuing.'
        : 'Replay completed answers, celebrate, then advance after the shared completion pause.'
        : exitNotes ? 'Slide both notes off the right screen edge, then continue without closing narration.'
          : 'Advance after the shared completion pause without closing narration.', text, replay, exitNotes }]);
}
function practice(distance: IntervalDistance, direction: IntervalDirection, references: string[], initialChart: IntervalDistance, introduction?: string, exitNotes = false): IntervalPlan {
  return { initialChart, initialChartVisible: true, cues: [
    ...references.map((name, index) => {
      const question: IntervalQuestion = { reference: pitch(name), distance, direction };
      return questionCue(`question-${index + 1}`, question, index === 0 ? introduction : undefined);
    }), finish('Good job!', 'answers', exitNotes),
  ] };
}
export function questionCue(id: string, question: IntervalQuestion, introduction?: string): IntervalCue {
  return cue(id, `${intervalNames[question.distance]} from ${displayIntervalPitch(question.reference.label)}`, [
    { id: 'question', kind: 'question', title: intervalPrompt(question),
      detail: question.choices ? 'Select a labelled answer. Replay controls sound each example without submitting. Input interrupts narration.'
        : 'Accept placements immediately in any column while the reference sounds and Grammy asks the question. An answer interrupts both. Grammy thinks after speaking. Keyboard arrows choose pitch and column; Enter places.', question, introduction },
    { id: 'retry', kind: 'retry', title: 'If incorrect: “Try again.”',
      detail: 'Sound the attempted interval, give feedback, and reopen the same question.' },
    { id: 'correct', kind: 'correct', title: 'If correct: hear the created interval',
      detail: question.choices ? 'Sound the selected pair, confirm the answer, then continue.'
        : question.distance > 2 ? 'Sound the pair together when their columns match, otherwise from lower to higher. Distance is independent of column.'
        : 'Sound the pair together when their columns match, otherwise in column order. Distance is independent of column.' },
  ]);
}

export const intervalPlans: Record<string, IntervalPlan> = {
  'interval-introduction': { initialChart: 0, initialChartVisible: false, cues: [
    cue('definition', 'What Is an Interval?', [
      pair('C4', 'E4', false, { exampleId: 'different-times', leftPercents: [24, 46] }),
      say('explain', 'The distance between two pitches is called an interval.', true),
    ]),
    cue('different-times', 'Pitches at Different Times', [
      pair('C4', 'E4', false, { exampleId: 'different-times', leftPercents: [24, 46] }),
      say('explain', 'The pitches can be at different times.'), play(false, 'different-times'),
    ]),
    cue('same-time', 'Pitches at the Same Time', [
      pair('C4', 'E4', true, { exampleId: 'same-time', leftPercents: [76, 76], retainPrevious: true }),
      say('explain', 'Or they can be at the same time.'), play(true, 'same-time'),
    ]), finish("Let's learn the names of the smallest intervals.", 'visible'),
  ] },
  unison: { initialChart: 0, initialChartVisible: false, cues: [
    cue('same-pitch', 'Unison', [
      pair('G4', 'G4', false), say('explain', 'Two pitches that are the same are in unison.'), play(false),
      chart(0, 'There is no distance between two pitches in unison.'),
    ]),
    cue('together', 'Unison at the Same Time', [pair('G4', 'G4', true), play(true), say('explain', 'These two pitches are still in unison.')]),
    finish('Unison has a distance of zero.'),
  ] },
  'minor-seconds': { initialChart: 0, initialChartVisible: true, cues: [
    cue('above', 'One Pitch Above', [
      pair('E4', 'E4', true), say('explain', 'If a note moves one pitch away, we call it a minor second.'), moved('F4'), play(true),
      chart(1, 'A minor second has a distance of one pitch.'),
    ]),
    cue('below', 'One Pitch Below', [pair('E4', 'F4', true), moved('D#4'), play(true), say('explain', 'One pitch below also creates a minor second.')]),
    finish('', 'answers', true),
  ] },
  'minor-seconds-above': practice(1, 'above', ['E4', 'B4', 'C4'], 1, 'Now you try.', true),
  'minor-seconds-below': practice(1, 'below', ['F4', 'C5', 'Db4'], 1),
  'major-seconds': { initialChart: 1, initialChartVisible: true, cues: [
    cue('above', 'Two Pitches Above', [
      pair('C4', 'C4', true), say('explain', 'If a note moves two pitches away, we call it a major second.'), moved('D4'), play(true),
      chart(2, 'A major second has a distance of two pitches.'),
    ]),
    cue('below', 'Two Pitches Below', [pair('D4', 'D4', false), moved('C4'), play(false), say('explain', 'Two pitches below also creates a major second.')]),
    finish('Now you can create major seconds.'),
  ] },
  'major-seconds-above': practice(2, 'above', ['C4', 'E4', 'G4'], 2),
  'major-seconds-below': practice(2, 'below', ['D4', 'F#4', 'A4'], 2),
  'interval-practice': { initialChart: 2, initialChartVisible: true, cues: [
    cue('introduction', 'Let’s Practice', [say('explain', "Let's practice!")]),
    ...([
      ['G4', 0], ['C4', 1], ['E4', 2], ['F#4', 0], ['F4', 1], ['G4', 2],
    ] as const).map(([reference, distance], index) => questionCue(`question-${index + 1}`, { reference: pitch(reference), distance, direction: 'either' })),
    finish('Bravo! You can create unison, minor second, and major second intervals.'),
  ] },
};

export function getIntervalSeekTarget(plan: IntervalPlan, cueId: string, actionId?: string) {
  const cueIndex = plan.cues.findIndex(cue => cue.id === cueId);
  if (cueIndex < 0) return null;
  const cue = plan.cues[cueIndex];
  const actionIndex = actionId ? cue.steps.findIndex(step => step.id === actionId) : 0;
  if (actionIndex < 0) return null;
  const kind = cue.steps[actionIndex].kind;
  return { cueIndex, stepIndex: kind === 'retry' || kind === 'correct' ? 0 : actionIndex,
    branch: kind === 'retry' || kind === 'correct' ? kind : 'normal' as const };
}

/** Keep example identity and positions identical during normal playback and Inspector seeks. */
export function createIntervalExampleNotes(step: Extract<IntervalStep, { kind: 'setup' }>, previous: readonly IntervalNote[] = []): IntervalNote[] {
  const added = step.pitches.map((pitch, position) => ({ ...pitch,
    id: `${step.exampleId ? `${step.exampleId}-` : ''}${position === 0 ? 'reference' : 'answer'}`,
    leftPercent: step.leftPercents?.[position] ?? (step.together ? 48 : position === 0 ? 32 : 64) }));
  return [...(step.retainPrevious ? previous.filter(note => !added.some(item => item.id === note.id)) : []), ...added];
}

export function getIntervalPlaybackNotes(notes: readonly IntervalNote[], exampleId?: string): IntervalNote[] {
  return notes.filter(note => !exampleId || note.id.startsWith(`${exampleId}-`));
}

/** Replay the complete visible timeline: each column sounds its notes together. */
export function getIntervalPlaybackGroups(notes: readonly IntervalNote[], columns: number): IntervalNote[][] {
  const groups = new Map<number, IntervalNote[]>();
  for (const note of notes) {
    const column = Math.max(1, Math.min(columns - 1, Math.round(note.leftPercent / 100 * columns)));
    const group = groups.get(column) ?? [];
    group.push(note); groups.set(column, group);
  }
  return [...groups].sort(([a], [b]) => a - b).map(([, group]) => group);
}

/** Reconstruct visual state without speech/audio when seeking into a demonstration. */
export function getIntervalCheckpoint(plan: IntervalPlan, cueIndex: number, stepIndex: number) {
  let chartLevel = plan.initialChart;
  let chartVisible = plan.initialChartVisible;
  let chartDistances: IntervalDistance[] = [...(plan.initialDistances
    ?? Array.from({ length: plan.initialChart + 1 }, (_, index) => index as IntervalDistance))];
  let notes: IntervalNote[] = [];
  const completed: Array<{ question: IntervalQuestion; answer: IntervalNote }> = [];
  for (let index = 0; index <= cueIndex; index++) {
    const steps = plan.cues[index].steps;
    for (const step of steps.slice(0, index === cueIndex ? stepIndex : steps.length)) {
      if (step.kind === 'chart') {
        chartLevel = step.distance; chartVisible = true;
        chartDistances = [...new Set([...chartDistances, step.distance])];
      }
      if (step.kind === 'setup') notes = createIntervalExampleNotes(step, notes);
      if (step.kind === 'move' && notes[1]) notes = [notes[0], { ...notes[1], ...step.pitch }];
      if (step.kind === 'question') {
        const answer = { ...intervalAnswerPitch(step.question), id: 'answer', leftPercent: 64 };
        completed.push({ question: step.question, answer });
        notes = getIntervalAnswerNotes(step.question, answer);
      }
    }
  }
  return { chartLevel, chartVisible, chartDistances, notes, completed };
}
