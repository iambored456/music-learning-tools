import {
  cue, say, pair, play, moved, chart, finish, questionCue, pitch,
  intervalNames, displayIntervalPitch, speakIntervalPitch, speakIntervalName,
  type IntervalCue, type IntervalDistance, type IntervalNote, type IntervalPlan,
  type IntervalQuestion, type IntervalChoice,
} from './lesson13Intervals';

type SectionSeed = { id: string; label: string; description: string; cues: IntervalCue[] };
export const harmonyIntervalPlans: Record<string, IntervalPlan> = {};

function notes(first: string, second: string, prefix = '', positions: readonly [number, number] = [32, 64]): IntervalNote[] {
  return [first, second].map((label, index) => ({ ...pitch(label),
    id: `${prefix}${index === 0 ? 'reference' : 'answer'}`, leftPercent: positions[index] }));
}

function placement(reference: string, distance: IntervalDistance, answer: string,
  extras: Partial<IntervalQuestion> = {}): IntervalQuestion {
  return { reference: pitch(reference), distance, direction: 'above', answer: pitch(answer), ...extras };
}

function replace(reference: string, previous: string, distance: IntervalDistance, answer: string): IntervalQuestion {
  return placement(reference, distance, answer, {
    initialNotes: notes(reference, previous),
    prompt: `Replace the upper note to make a ${intervalNames[distance]} above ${displayIntervalPitch(reference)}.`,
    spokenPrompt: `Replace the upper note to make a ${speakIntervalName(distance)} above ${speakIntervalPitch(reference)}.`,
  });
}

function match(first: string, second: string, reference: string, distance: IntervalDistance, answer: string): IntervalQuestion {
  return placement(reference, distance, answer, {
    initialNotes: [...notes(first, second, 'model-', [18, 36]), { ...pitch(reference), id: 'reference', leftPercent: 72 }],
    prompt: `Make the same distance as the model above ${displayIntervalPitch(reference)}.`,
    spokenPrompt: `Make the same distance as the model above ${speakIntervalPitch(reference)}.`,
    successText: `Correct! You made a ${speakIntervalName(distance)} from a new starting pitch.`,
  });
}

function name(first: string, second: string, distance: IntervalDistance, alternatives: readonly IntervalDistance[]): IntervalQuestion {
  return placement(first, distance, second, {
    prompt: 'What is the name of this interval?', initialNotes: notes(first, second),
    choices: alternatives.map(value => ({ id: String(value), label: intervalNames[value] })),
    correctChoice: String(distance), successText: `Correct! This is a ${speakIntervalName(distance)}.`,
  });
}

function choose(prompt: string, examples: readonly (readonly [string, string])[], correct: number,
  distance: IntervalDistance): IntervalQuestion {
  const choices: IntervalChoice[] = examples.map(([first, second], index) => ({
    id: String(index), label: `Pair ${String.fromCharCode(65 + index)}: ${displayIntervalPitch(first)}–${displayIntervalPitch(second)}`,
    pitches: [pitch(first), pitch(second)],
  }));
  const [first, second] = examples[correct];
  return placement(first, distance, second, {
    prompt, choices, correctChoice: String(correct),
    initialNotes: examples.flatMap(([a, b], index) => notes(a, b, `choice-${index}-`,
      [(index + 1) * 100 / (examples.length + 1), (index + 1) * 100 / (examples.length + 1)])),
  });
}

function gap(reference: string, octave: string, remainder: IntervalDistance,
  distance: IntervalDistance, answer: string): IntervalQuestion {
  return placement(reference, distance, answer, {
    octave: pitch(octave),
    initialNotes: [{ ...pitch(reference), id: 'reference', leftPercent: 32 },
      { ...pitch(octave), id: 'octave', leftPercent: 80 }],
    prompt: `Place a note above ${displayIntervalPitch(reference)} that leaves a ${intervalNames[remainder]} to ${displayIntervalPitch(octave)}.`,
    spokenPrompt: `Place a note above ${speakIntervalPitch(reference)} that leaves a ${speakIntervalName(remainder)} to ${speakIntervalPitch(octave)}.`,
    successText: `Correct! You made a ${speakIntervalName(distance)} above ${speakIntervalPitch(reference)}.`,
  });
}

function questions(items: IntervalQuestion[], ending = 'Good job!'): IntervalCue[] {
  return [...items.map((question, index) => questionCue(`question-${index + 1}`, question, index === 0 ? 'Now you try.' : undefined)),
    finish(ending, 'answers', true)];
}

function introduce(id: string, first: string, second: string, distance: IntervalDistance, explanation: string): IntervalCue {
  return cue(id, intervalNames[distance], [pair(first, first, false), say('explain', explanation),
    moved(second), play(false), chart(distance, `${distance === 12 ? 'An' : 'A'} ${speakIntervalName(distance)} has a distance of ${distance} pitches.`)]);
}

function example(id: string, first: string, second: string, explanation: string): IntervalCue {
  return cue(id, `${displayIntervalPitch(first)}–${displayIntervalPitch(second)}`,
    [pair(first, second, false), say('explain', explanation, true), play(false)]);
}

function section(id: string, label: string, description: string, cues: IntervalCue[]): SectionSeed {
  return { id, label, description, cues };
}

function lesson(code: string, title: string, body: string, base: IntervalDistance[], sections: SectionSeed[]) {
  let introduced = [...base];
  for (const entry of sections) {
    harmonyIntervalPlans[entry.id] = { initialChart: Math.max(...introduced) as IntervalDistance,
      initialChartVisible: true, initialDistances: [...introduced], ascendingPlayback: true, cues: entry.cues };
    for (const step of entry.cues.flatMap(item => item.steps)) {
      if (step.kind === 'chart' && !introduced.includes(step.distance)) introduced.push(step.distance);
    }
  }
  return { code, title, body, trail: ['Harmony'],
    sections: sections.map(({ id, label, description }) => ({ id, label, description })) };
}

export const harmonyLessonSeeds = [
  lesson('3.1', 'Intervals: Part Two (3rds)',
    'Build, compare, change, and reproduce ascending minor and major 3rds.', [0, 1, 2], [
      section('minor-thirds', 'Minor 3rds', 'Meet the distance of three pitches.', [
        example('recall', 'C4', 'D4', 'You already know the major second. Its distance is two pitches.'),
        introduce('minor-third', 'C4', 'Eb4', 3, 'A minor third has a distance of three pitches.'),
        example('another-third', 'E4', 'G4', 'The starting pitch can change. This is also a minor third.'), finish('', 'answers', true),
      ]),
      section('minor-thirds-above', 'Minor 3rds Above', 'Build minor 3rds from different starting pitches.',
        questions([placement('E4', 3, 'G4'), placement('C4', 3, 'Eb4'), placement('A4', 3, 'C5')])),
      section('major-thirds', 'Major 3rds', 'Compare the two sizes of third.', [
        example('minor-model', 'C4', 'Eb4', 'Here is the minor third again.'),
        cue('widen', 'A Major Third', [say('explain', 'A major third is one pitch wider than a minor third.'),
          moved('E4'), play(false), chart(4, 'A major third has a distance of four pitches.')]),
        questionCue('name-example', name('C4', 'E4', 4, [3, 4]), 'Choose the interval name.'), finish('', 'answers', true),
      ]),
      section('major-thirds-above', 'Major 3rds Above', 'Build major 3rds above the reference.',
        questions([placement('C4', 4, 'E4'), placement('D4', 4, 'F#4'), placement('F4', 4, 'A4')])),
      section('change-third', 'Change the Third', 'Replace the upper note to change the interval size.',
        questions([replace('C4', 'Eb4', 4, 'E4'), replace('D4', 'F#4', 3, 'F4')])),
      section('match-third', 'Same Distance, New Starting Pitch', 'Reproduce a model interval from a new starting pitch.', [
        cue('model-explanation', 'Follow the Model', [say('explain', 'Keep the same distance, but start from the new reference note.')]),
        ...questions([match('C4', 'Eb4', 'D4', 3, 'F4'), match('F4', 'A4', 'G4', 4, 'B4')]),
      ]),
      section('thirds-practice', 'Thirds in Practice', 'Build, name, correct, and compare thirds.', questions([
        placement('B3', 3, 'D4'), name('A3', 'C#4', 4, [4, 3]), replace('F4', 'Ab4', 4, 'A4'),
        match('E4', 'G4', 'C4', 3, 'Eb4'),
        choose('Which pair makes the smaller third?', [['C4', 'E4'], ['C#4', 'E4']], 1, 3),
        placement('E4', 4, 'G#4'),
      ], 'You can build both kinds of third, even when they start on different pitches.')),
    ]),
  lesson('3.2', 'Intervals: Part Three (4ths, Tritones, and 5ths)',
    'Build perfect 4ths and 5ths, find the tritone between them, and check interval examples.', [0, 1, 2, 3, 4], [
      section('perfect-fourths', 'Perfect 4ths', 'Meet the distance of five pitches.', [
        introduce('fourth', 'C4', 'F4', 5, 'A perfect fourth has a distance of five pitches. This interval uses the word perfect.'),
        example('another-fourth', 'E4', 'A4', 'This pair is also a perfect fourth.'), finish('', 'answers', true),
      ]),
      section('perfect-fourths-above', 'Perfect 4ths Above', 'Build perfect 4ths above the reference.',
        questions([placement('C4', 5, 'F4'), placement('B3', 5, 'E4')])),
      section('perfect-fifths', 'Perfect 5ths', 'Compare the fourth and the fifth.', [
        example('fourth-model', 'C4', 'F4', 'Here is a perfect fourth.'),
        cue('fifth', 'A Perfect Fifth', [say('explain', 'A perfect fifth is two pitches wider than a perfect fourth.'),
          moved('G4'), play(false), chart(7, 'A perfect fifth has a distance of seven pitches.')]),
        example('another-fifth', 'D4', 'A4', 'This pair is also a perfect fifth.'), finish('', 'answers', true),
      ]),
      section('perfect-fifths-above', 'Perfect 5ths Above', 'Build perfect 5ths above the reference.',
        questions([placement('D4', 7, 'A4'), placement('Bb3', 7, 'F4')])),
      section('tritones', 'The Tritone Between Them', 'Find the distance between a fourth and a fifth.', [
        example('fourth', 'C4', 'F4', 'A perfect fourth has a distance of five pitches.'),
        example('fifth', 'C4', 'G4', 'A perfect fifth has a distance of seven pitches.'),
        cue('between', 'The Distance Between', [
          pair('C4', 'F4', false, { exampleId: 'fourth', leftPercents: [18, 18] }),
          { ...pair('C4', 'G4', false, { exampleId: 'fifth', leftPercents: [82, 82], retainPrevious: true }), id: 'fifth-pair' },
          { ...pair('C4', 'F#4', false, { exampleId: 'tritone', leftPercents: [50, 50], retainPrevious: true }), id: 'middle-pair' },
          say('explain', 'Between the fourth and fifth is the tritone, with a distance of six pitches.'),
          play(false, 'tritone'), chart(6, 'A tritone has a distance of six pitches.'),
        ]),
        questionCue('question-1', placement('F4', 6, 'B4'), 'Now you try.'),
        questionCue('question-2', placement('B3', 6, 'F4')), finish('Good job!', 'answers', true),
      ]),
      section('check-fourths-fifths', 'Check the Interval', 'Select the interval, find a mismatched label, and correct it.', questions([
        choose('Which pair makes a tritone?', [['C4', 'G4'], ['C4', 'F4'], ['C4', 'F#4']], 2, 6),
        choose('These pairs are labelled perfect fifth. Which pair does not match its label?',
          [['C4', 'G4'], ['D4', 'A4'], ['E4', 'Bb4']], 2, 6),
        replace('E4', 'Bb4', 7, 'B4'),
      ])),
      section('fourths-fifths-practice', 'Fourths, Tritones, and Fifths in Practice', 'Mix construction with interval diagnosis.', questions([
        placement('D4', 5, 'G4'), name('F4', 'B4', 6, [7, 5, 6]), placement('E4', 7, 'B4'),
        replace('C4', 'F#4', 5, 'F4'), match('C4', 'F#4', 'D4', 6, 'G#4'),
        choose('Which pair makes a perfect fifth?', [['A3', 'E4'], ['A3', 'D4'], ['A3', 'D#4']], 0, 7),
      ], 'Fourths, tritones, and fifths are three neighbouring distances: five, six, and seven pitches.')),
    ]),
  lesson('3.3', 'Intervals: Part Four (6ths, 7ths, and Octaves)',
    'Build wide ascending intervals and use an octave to check their distances.', [0, 1, 2, 3, 4, 5, 6, 7], [
      section('interval-octave', 'The Octave', 'Recall the same letter in the next octave and its distance of twelve.', [
        introduce('octave', 'C4', 'C5', 12, 'An octave repeats the same letter in the next octave. We also call it a perfect octave.'),
        example('octave-distance', 'C4', 'C5', 'There are twelve pitch movements from this C to the next C.'), finish('', 'answers', true),
      ]),
      section('interval-octaves-above', 'Octaves Above', 'Place the higher octave, rather than the same pitch.',
        questions([placement('A3', 12, 'A4'), placement('E4', 12, 'E5')], 'An octave is the higher repetition. Unison is the same exact pitch.')),
      section('sixths', 'Two Sizes of Sixth', 'Compare minor and major sixths with an octave reference.', [
        introduce('minor-sixth', 'C4', 'Ab4', 8, 'A minor sixth has a distance of eight pitches.'),
        questionCue('octave-reference', gap('C4', 'C5', 4, 8, 'Ab4'), 'Use the octave to check the remaining distance.'),
        cue('major-sixth', 'A Major Sixth', [pair('C4', 'Ab4', false),
          say('explain', 'A major sixth is one pitch wider than a minor sixth.'), moved('A4'), play(false),
          chart(9, 'A major sixth has a distance of nine pitches.')]),
        questionCue('compare-gap', gap('C4', 'C5', 3, 9, 'A4'), 'A major sixth leaves a minor third to the octave.'),
        finish('', 'answers', true),
      ]),
      section('sixths-above', 'Sixths Above', 'Build both sizes of sixth above the reference.',
        questions([placement('C4', 8, 'Ab4'), placement('F4', 9, 'D5'), placement('E4', 8, 'C5')])),
      section('sevenths', 'Two Sizes of Seventh', 'Compare the gaps between a seventh and an octave.', [
        introduce('minor-seventh', 'C4', 'Bb4', 10, 'A minor seventh has a distance of ten pitches.'),
        questionCue('minor-gap', gap('C4', 'C5', 2, 10, 'Bb4'), 'A minor seventh leaves a major second to the octave.'),
        cue('major-seventh', 'A Major Seventh', [pair('C4', 'Bb4', false),
          say('explain', 'A major seventh is one pitch wider than a minor seventh.'), moved('B4'), play(false),
          chart(11, 'A major seventh has a distance of eleven pitches.')]),
        questionCue('major-gap', gap('C4', 'C5', 1, 11, 'B4'), 'A major seventh leaves a minor second to the octave.'),
        finish('', 'answers', true),
      ]),
      section('sevenths-above', 'Sevenths Above', 'Build minor and major sevenths.',
        questions([placement('D4', 10, 'C5'), placement('C4', 11, 'B4'), placement('E4', 11, 'D#5')])),
      section('octave-gaps', 'Leave Room for the Octave', 'Use the remaining gap to find a wide interval.',
        questions([gap('C4', 'C5', 1, 11, 'B4'), gap('C4', 'C5', 4, 8, 'Ab4')])),
      section('match-wide-interval', 'Same Wide Interval, New Starting Pitch', 'Reproduce sixths and sevenths from new references.',
        questions([match('C4', 'A4', 'Bb3', 9, 'G4'), match('C4', 'Bb4', 'A3', 10, 'G4')])),
      section('wide-interval-practice', 'Wide Intervals in Practice', 'Build, name, correct, and review wide intervals.', questions([
        placement('D4', 8, 'Bb4'), name('C4', 'A4', 9, [8, 10, 9]), replace('C4', 'B4', 10, 'Bb4'),
        placement('F4', 11, 'E5'), placement('D4', 12, 'D5'), match('C4', 'G4', 'E4', 7, 'B4'),
      ], 'You can build wide intervals and use the octave to check their distances.')),
    ]),
];
