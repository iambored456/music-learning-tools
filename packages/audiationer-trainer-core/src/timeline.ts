import { CHORD_QUALITIES, chordLabel, degreeLabel, melody, midiNote, resolution, spokenChordLabel, triad } from './music.ts';
import { allowedDegrees, exerciseMode, isChordMode, questionLength, type Settings } from './settings.ts';
import { lessonTiming, tonicizationPhrase, type TimingField } from './timing.ts';

export interface TimelineOptions { correct: boolean; keyChange: boolean; freeplayCycle: boolean }
export interface TimelineStage {
  id: string;
  name: string;
  detail?: string;
  seconds: number | null;
  field?: TimingField;
  beats?: number;
  notes?: { midis: number[]; seconds: number; gapSeconds: number }[];
  speech?: string;
}

/** One sample lesson, including conditional and manual waits, without starting audio or scoring. */
export function lessonTimeline(settings: Settings, options: TimelineOptions): TimelineStage[] {
  const t = lessonTiming(settings), mode = exerciseMode(settings), stages: TimelineStage[] = [];
  const freeplay = settings.mode === 'freeplay' || settings.mode === 'cycle';
  const pocket = settings.mode === 'pocket';
  const add = (stage: Omit<TimelineStage, 'id'>) => stages.push({ ...stage, id: `${stages.length}-${stage.field ?? stage.name}` });
  const gap = (name: string, field: TimingField) => add({ name, field, seconds: t[field] });
  const midi = (degree: number, asChord = isChordMode(mode)) => (asChord ? triad(degree, settings.scale) : [degree]).map(value => midiNote(settings.tonic, settings.octave, value));
  const label = (value: number) => mode === 'quality' ? CHORD_QUALITIES[value].name : isChordMode(mode) ? chordLabel(value, settings.scale) : degreeLabel(value, settings.scale);
  const note = (name: string, degree: number, field: 'noteSeconds' | 'feedbackNoteSeconds', asChord = isChordMode(mode)) => add({ name, field, seconds: t[field], notes: [{ midis: midi(degree, asChord), seconds: t[field], gapSeconds: 0 }] });
  if (freeplay) {
    if (!options.freeplayCycle) {
      add({ name: 'Tapped note', field: 'tapSeconds', seconds: t.tapSeconds, notes: [{ midis: midi(0, false), seconds: t.tapSeconds, gapSeconds: 0 }] });
      add({ name: 'Held or sustained notes', detail: 'Until you release or stop them', seconds: null });
    } else {
      for (let degree = 0; degree < 12; degree++) {
        note(`Cycle note ${degreeLabel(degree, '1')}`, degree, 'noteSeconds', false);
        gap('Gap before next cycle note', 'noteGapSeconds');
      }
    }
    return stages;
  }
  if (options.keyChange && t.tonicizationEnabled && settings.mode !== 'quality') {
    const phrase = tonicizationPhrase(settings), beat = 60 / t.tonicizationBpm;
    const beats = phrase.notes.reduce((total, note) => total + note.beats, 0);
    add({ name: 'Tonicization', detail: `${phrase.label} · final note held twice as long · on key changes`, field: 'tonicizationBpm', seconds: beats * beat,
      beats,
      notes: phrase.notes.map(note => ({ midis: midi(note.degree, false), seconds: beat * note.beats * 4 / 5, gapSeconds: beat * note.beats / 5 })) });
  }
  gap('Gap before question', 'leadInSeconds');
  const degrees = allowedDegrees(settings);
  const values = mode === 'quality' ? [settings.qualities[0] ?? 0] : melody(degrees.length ? degrees : [0], questionLength(settings), () => 0);
  const question = (prefix: string) => {
    values.forEach((degree, index) => {
      if (mode === 'quality') add({ name: `${prefix}: ${label(degree)}`, field: 'noteSeconds', seconds: t.noteSeconds,
        notes: [{ midis: CHORD_QUALITIES[degree].intervals.map(value => midiNote(settings.tonic, settings.octave, value)), seconds: t.noteSeconds, gapSeconds: 0 }] });
      else note(`${prefix} ${index + 1}: ${label(degree)}`, degree, 'noteSeconds');
      if (index < values.length - 1) gap('Gap between question sounds', 'noteGapSeconds');
    });
    gap('Gap after question sounds', 'answerGapSeconds');
  };
  for (let repeat = 0; repeat < (pocket ? settings.pocket.repeats : 1); repeat++) {
    if (repeat) gap('Gap before repeat', 'repeatGapSeconds');
    question(repeat ? 'Question repeat' : 'Question');
  }
  if (pocket) {
    gap('Think of the answer', 'thinkSeconds');
    if (settings.pocket.speakAnswer) {
      gap('Gap before spoken answer', 'feedbackGapSeconds');
      values.forEach(value => add({ name: `Spoken answer: ${label(value)}`, seconds: null, speech: isChordMode(mode) ? spokenChordLabel(value, settings.scale) : label(value).replace('♭', 'flat ').replace('♯', 'sharp '),
        notes: settings.pocket.notesWithAnswer ? [{ midis: mode === 'quality' ? CHORD_QUALITIES[value].intervals.map(degree => midiNote(settings.tonic, settings.octave, degree)) : midi(value), seconds: t.noteSeconds, gapSeconds: t.answerGapSeconds }] : undefined }));
    }
    for (let replay = 0; replay < settings.pocket.replays; replay++) { gap('Gap before answer replay', 'replayGapSeconds'); question('Answer replay'); }
  } else {
    add({ name: 'Your answer', seconds: settings.answerSeconds || null,
      detail: settings.answerSeconds ? 'Maximum time · set by difficulty; ends when answered' : 'Until you answer · untimed difficulty' });
    const skip = !options.correct && t.reviewSkip === 'all' || options.correct && !t.autoContinueCorrect && t.reviewSkip !== 'none';
    if (skip) {
      if (options.correct) gap('Correct-answer flash', 'skippedCorrectSeconds');
    } else {
      gap('Gap before feedback', 'feedbackGapSeconds');
      if (!options.correct) question('Correct answer replay');
      else if (settings.resolve && (settings.mode === 'degrees' || settings.mode === 'melody')) {
        for (const degree of resolution(values.at(-1)!)) { note('Resolution note', degree, 'feedbackNoteSeconds', false); gap('Gap after resolution note', 'feedbackNoteGapSeconds'); }
      }
      if (options.correct && t.autoContinueCorrect) gap('Wait before auto-continue', 'correctDelaySeconds');
      else {
        add({ name: 'Answer review', detail: 'Until you press Next · compass exploration stays available', seconds: null });
        if (settings.mode !== 'quality') {
          add({ name: 'Optional compass sound', detail: 'Only when you tap during review', field: 'feedbackNoteSeconds', seconds: t.feedbackNoteSeconds,
            notes: [{ midis: midi(values[0]), seconds: t.feedbackNoteSeconds, gapSeconds: 0 }] });
          gap('Gap after optional compass sound', 'feedbackNoteGapSeconds');
        }
      }
    }
  }
  gap('Gap before next question', 'nextQuestionGapSeconds');
  return stages;
}
