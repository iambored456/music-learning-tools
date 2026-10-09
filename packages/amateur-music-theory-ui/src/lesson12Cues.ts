import { lessonPacing } from '@mlt/lesson-kit';
import type { LessonCue, LessonCueAction } from './lessonInspector.svelte';
import { blackKeyIntroduction, blackKeyDescent, blackKeySpeech } from './lesson12BlackKeys';
import { letterPositionExamples } from './lesson12LetterPositions';

type Step = readonly [id: string, title: string, detail: string];

function cue(id: string, title: string, steps: readonly Step[]): LessonCue {
  return {
    id, title, prompt: '', visual: '', audio: '', gesture: '', input: '', completion: '', timing: {},
    actions: steps.flatMap(([actionId, actionTitle, detail]): LessonCueAction[] => [
      { id: actionId, title: actionTitle, detail: id === 'place-letters' && actionId === 'place-D4'
        ? `First speak “Let's practice placing notes on the grid.” in an upper bubble. Keep it above “Place a D on the grid.”, then remove the upper bubble for the next question. ${detail}`
        : id === 'identify-next' && actionId === 'above-A'
        ? `First speak “Let's test your knowledge.” in an upper bubble. Keep it visible above the first question, then remove it for the next question. ${detail}`
        : id === 'compare-as' && (actionId === 'same-letter' || actionId.endsWith('-names'))
        ? `${detail} Reveal both letter labels after the correct answer, then slide the pair off to the right before the next example enters.`
        : id === 'compare-as' && actionId.endsWith('-distance')
        ? `Slide this new pair in from the left before opening the question. ${detail}`
        : detail },
      ...(detail === choice || detail === placement || detail === freePlacement ? [{
        id: `retry-${actionId}`, title: 'If incorrect: “Try again.”',
        detail: 'Show the incorrect answer, sound it where applicable, speak “Try again,” then restore the same prompt.',
      }] : []),
    ]),
  };
}

const speech = 'Grammy speaks with the lesson avatar; wait for narration before the next action.';
const tone = 'Show and sound this pitch, then pause briefly before the next action.';
const choice = 'Show and unlock the choices as Grammy starts the prompt. Submitting an answer interrupts the question speech. Incorrect answers retry.';
const placement = 'Unlock the pitch grid while Grammy speaks the prompt. Submitting a placement interrupts question speech. Incorrect placements retry.';
const freePlacement = `Keep the D, F, and B prompts. Place each requested pitch in any invisible grid column. Circle notes snap to two-column positions; hold and move to preview placement, then release to submit and sound the pitch for ${lessonPacing.noteMs} ms. Keep earlier correct notes at the learner’s chosen columns; click them to hear them again. Incorrect pitches retry.`;
const finish = 'Lock input, give completion feedback, then advance to the next subsection.';
const quietFinish = 'Lock input, hold the completed example briefly, then advance to the next subsection.';

export const octavePracticePairs = [
  { id: 'not-octave', tones: ['A3', 'E4'], isOctave: false },
  { id: 'octave-b', tones: ['B3', 'B4'], isOctave: true },
  { id: 'octave-c', tones: ['C4', 'C5'], isOctave: true },
] as const;

export const lesson12Cues: Record<string, readonly LessonCue[]> = {
  'letter-names': [
    cue('introduce-letters', 'Introduce A through G', [
      ['alphabet', '“In Western music, pitches are named using the first seven letters of the alphabet: A through G.”', speech],
      ['legend', '“The legend on the left shows those letter names.”', 'Spotlight the legend while Grammy speaks.'],
    ]),
    cue('reveal-letters', 'Reveal the letter names',
      ['A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4'].map((note) => [`tone-${note}`, `Reveal and sound ${note}`, tone])),
    cue('letter-lines-spaces', 'Locate the letters on lines and spaces', [
      ...letterPositionExamples.map<Step>(example => [example.id, `“${example.spokenText}”`,
        example.id === 'space-A3'
          ? 'Shift C, D, and E two columns to the right while A slides in from the left. Keep every note visible; wait for speech and both animations before continuing.'
          : 'Slide this note from the left screen edge to one column beyond the pitch legend as Grammy names it. Keep earlier notes visible and wait for speech and arrival before continuing.']),
      ['slide-out', 'Slide all seven letter notes off to the right',
        'Hold the completed A–G example, then slide all seven notes past the right screen edge before placement practice. Keep the pitchGrid visible.'],
    ]),
    cue('place-letters', 'Place three named notes', [
      ['place-D4', 'Place D in any column', freePlacement], ['place-F4', 'Place F in any column', freePlacement],
      ['place-B3', 'Place B in any column', freePlacement],
      ['finish', 'Replay completed notes and continue', `Lock input, replay the placed notes from left to right (${lessonPacing.noteMs} ms each, ${lessonPacing.betweenNotesMs} ms between notes), then hold for ${lessonPacing.afterExerciseMs} ms. Slide all notes off to the right and wait for their departure. Keep the grid visible and slide it downward to the next section's position before advancing.`],
    ]),
  ],
  'letter-cycle': [
    cue('repeat-cycle', 'Extend the repeating letter sequence', [
      ['expand', '“After that, we start over and repeat the letters A through G.”', 'Grammy speaks while the grid reveals upward through C5. Higher rows and legend labels are pre-rendered; existing rows stay fixed. Keep the question note hidden.'],
    ]),
    cue('identify-next', 'Name the next letter', [
      ['above-A', 'What is directly above A?', choice], ['above-E', 'What is directly above E?', choice],
      ['above-G', 'What is directly above G?', choice], ['finish', 'Complete Repeating Letter Names', 'Lock input and hold the completed answers, then slide all three note pairs off to the right. Wait for every departure before the Octaves section begins; keep the same A3–C5 pitchGrid visible.'],
    ]),
  ],
  'octaves': [
    cue('hear-two-as', 'Hear two pitches called A', [
      ['listen', '“Listen to these two pitches.”', 'Both A notes slide from the left screen edge while Grammy speaks. Wait for both entrances before playback.'],
      ['play-as', 'Sound A3, then A4', 'Play each pitch with a short gap.'],
      ['same-name', '“These pitches have the same letter name, but one is higher than the other.”', speech],
      ['bracket', '“The distance from one A to the next A is called an octave.”', 'Show the octave bracket while Grammy speaks.'],
    ]),
    cue('compare-as', 'Compare the two As', [
      ['higher', 'Click on the higher pitch', choice],
      ['same-letter', 'Do they have the same letter name?', choice],
      ...octavePracticePairs.flatMap((pair): Step[] => [
        [`${pair.id}-distance`, `Are ${pair.tones.join(' and ')} an octave apart?`, choice],
        [`${pair.id}-names`, 'Do they have the same letter names?', choice],
      ]),
    ]),
    cue('name-octaves', 'Add octave numbers', [
      ['numbers', '“Because letter names repeat, we add a number to identify the exact pitch.”', 'The original labelled A pair slides back in, then Grammy speaks.'],
      ['lower-a', '“The lower pitch is A3.”', 'Add A3 to the legend and lower note while Grammy speaks.'],
      ['higher-a', '“The higher pitch is A4.”', 'Add A4 to the legend and higher note while Grammy speaks.'],
      ['summary', '“The octave number tells us which octave the pitch is in.”', speech],
      ['finish', 'Prepare the grid for Octave Numbers', 'Exit the A notes to the right. Without Bravo narration, smoothly trim the lower grid edge from A3 to C4, then slide the C4–C5 portion down to the position reserved for the upcoming C4–C6 reveal.'],
    ]),
  ],
  'octave-numbers': [
    cue('show-octave-range', 'Show numbered octaves', [
      ['expand', '“Each numbered octave begins on C and ends on B.”', 'Continue from the prepared C4–C5 grid and reveal rows and legend upward through C6. Slide plain letter labels left while octave numbers fade in; preserve the already numbered A4 label. Keep C4 fixed at the bottom.'],
      ['play-boundary', 'Sound G4, A4, B4, C5, D5', 'Show and play five labeled notes across an octave boundary.'],
      ['boundary', '“Notice that the octave number changes when we move from B to C.”', 'Slide an arrow in from the left pointing at B4 while Grammy speaks through “from B”. Wait for speech and arrival, pause 650 ms, then say “to C” as the arrow turns to connect B4 to C5. Hold 450 ms before practice.'],
    ]),
    cue('practice-octave-numbers', 'Choose pitches and names', [
      ['after-B4', 'What note is just above B4?', `Keep B4 from the octave-boundary example and slide it left into the first question's reference position. Clear the other example notes and wait for B4 to arrive before showing the question. ${choice}`],
      ['after-G4', 'What note is just above G4?', choice],
      ['below-C6', 'What note is just below C6?', choice],
      ['below-D4', 'What note is just below D4?', choice],
      ['finish', 'Complete Octave Numbers', 'Keep each correctly named adjacent-note pair in its own left-to-right position. After all four questions, slide all eight notes off to the right and wait for every departure before the closing Bravo. Then smoothly reshape the same grid from C4–C6 to C4–C5, resize it for the piano layout, and center it before starting 1.2.5.'],
    ]),
  ],
  'accidentals': [
    cue('white-keys', 'Connect letter names to piano white keys', [
      ['letter-names', '“We are now familiar with notes that have simple letter names.”', speech],
      ['grid-playback', 'Play natural notes C4 through C5', 'Sound the grid notes from low to high.'],
      ['piano', '“On a piano, these are all the white keys.”', 'Slide the C4–C5 piano keyboard in with all key labels hidden, centered immediately beneath the fitted pitch grid. Wait for arrival before replaying.'],
      ['piano-playback', 'Play the grid and piano together', 'Replay C4 through C5; highlight each corresponding white key and reveal its label as playback starts. Keep earlier labels visible.'],
      ['remaining-pitches', '“Now we’re going to learn the names of the rest of the pitches.”', speech],
    ]),
    cue('black-keys', 'Black keys have two names', [
      ['introduction', `“${blackKeySpeech.introduction[0]}”`, speech],
      ...blackKeyIntroduction.map((note): Step => [`play-${note}`, `Show and sound ${note}`, 'Add an unlabelled, pitch-coloured circle note and sound it with the piano. Retain earlier notes and piano labels.']),
      ['two-names', `“${blackKeySpeech.twoNames[0]}”`, speech],
      ['flat-label', 'Prepare the flat-name example', 'Keep the notes circular and unlabelled before the A-cell motion in b.9. All pitch labels in this Section omit octave numbers.'],
      ['flat-example', `“${blackKeySpeech.flatExample[0]}”`, 'Copy a blank A legend cell into the right-hand column, then slide down to A♭ while blending its colour. Fade in A♭ on arrival, reveal the same name in the circle note, hold its fill, and sound the pitch.'],
      ['flat-direction', `“${blackKeySpeech.flatDirection[0]}”`, 'Keep the circle note highlighted. Move the example bubble upwards and keep it above a second bubble with “lower” underlined.'],
      ['sharp-label', 'Prepare the sharp-name example', 'Retain A♭ in its filled circle before the G-cell motion in b.12.'],
      ['sharp-example', `“${blackKeySpeech.sharpExample[0]}”`, 'Copy a blank G legend cell across, then slide up while blending to A♭/G♯. Fade G♯ in on arrival and append G♯ to the circle’s A♭ label, expanding it into the first stadium. Keep its constant fill.'],
      ['sharp-direction', `“${blackKeySpeech.sharpDirection[0]}”`, 'Move the example bubble upwards and keep it above a second bubble with “raise” underlined.'],
      ...blackKeyDescent.map((note): Step => [`descend-${note}`, `Slide in both names for ${note}, then sound it`, 'Reveal legend labels from high to low; each arrival starts playback, adds both names inside its grid note, and expands it to fit. Retain every revealed name with a constant fill.']),
      ['finish', 'Complete Sharps and Flats', finish],
    ]),
  ],
  'naming-practice': [
    cue('practice-intro', 'Start naming practice', [['start', '“Let’s practice!”', `${speech} Keep the same C4–C5 grid size as 1.2.5, with no octave numbers in labels or prompts.`]]),
    cue('combined-names', 'Place pitches with two names', [
      ['place-Bb4', 'Place B♭ / A♯', placement],
      ['place-Gb4', 'Place G♭ / F♯', placement],
      ['place-Db4', 'Place D♭ / C♯', placement],
    ]),
    cue('flat-practice', 'Place flat names', [
      ['place-Eb4', 'Place E♭', placement], ['place-Ab4', 'Place A♭', placement],
      ['place-Db4', 'Place D♭', placement],
    ]),
    cue('sharp-practice', 'Place sharp names', [
      ['place-Db4', 'Place C♯', placement], ['place-Gb4', 'Place F♯', placement],
      ['place-Ab4', 'Place G♯', placement], ['finish', 'Complete Naming Practice', finish],
    ]),
  ],
};

export function getLesson12SeekTarget(plan: readonly LessonCue[], cueId: string, actionId?: string) {
  const cueEntry = plan.find((item) => item.id === cueId);
  const selectedAction = actionId ?? cueEntry?.actions?.[0]?.id;
  if (!cueEntry || !selectedAction || !cueEntry.actions?.some((item) => item.id === selectedAction)) return null;
  const retry = selectedAction.startsWith('retry-') ? selectedAction : null;
  return {
    targetKey: `${cueId}/${retry ? selectedAction.slice('retry-'.length) : selectedAction}`,
    retry,
  };
}
