import { lessonPacing, lessonScreenSlideMs } from '@mlt/lesson-kit';
import type { LessonCue, LessonCueAction } from './lessonInspector.svelte';

export const cueNarration = { rate: 0.92, preSpeakWaveMs: 0 };
export const quizRetry = { prompt: 'Try again.', rate: 1.02, preSpeakWaveMs: 0 };
export const linesSpacesQuizIntroduction = "Let's learn how this grid works.";
const gesture = `Grammy talks with both arms down; speech rate ${cueNarration.rate}.`;
const cueGroups = [
  {
    id: 'introduce-pitch', title: 'Introduce the pitch grid, lines, and spaces',
    prompt: 'This, is the pitch GRID.',
    visual: 'Show the grid, then demonstrate the whole grid, horizontal lines, and space rows with separate glows.',
    audio: 'Narration only.', gesture, input: 'Listen; input is locked.',
    completion: 'The space-row glow stops; continue to notes on lines.', timing: { reveal: 220, glow: 1200, afterGlow: 220 },
  },
  {
    id: 'demonstrate-lines', title: 'Reveal notes on lines', prompt: 'Notes can go on lines.',
    visual: 'Reveal line notes one at a time from low to high; highlight the sounding note.',
    audio: 'Sawtooth pitches overlap narration. Wait for both before continuing.', gesture,
    input: 'Listen; input is locked.', completion: 'All notes, narration, and trailing delay finish.',
    timing: { revealDelay: 100, note: 145, gap: 35, afterSpeech: 2000 },
  },
  {
    id: 'demonstrate-spaces', title: 'Reveal notes in spaces', prompt: 'Or in the spaces.',
    visual: 'Replace line notes with space notes; reveal low to high and highlight each sounding note.',
    audio: 'Sawtooth pitches overlap narration. Wait for both before continuing.', gesture,
    input: 'Listen; input is locked.', completion: 'All notes, narration, and trailing delay finish.',
    timing: { revealDelay: 100, note: 145, gap: 35, afterSpeech: 2000 },
  },
  {
    id: 'identify-line-space', title: 'Identify five notes', prompt: 'Is this note on a line or space?',
    visual: 'Slide each question note in from the left screen edge; retain answered notes. Underline Line / Space in the prompt. Slide all five notes off to the right after playback.',
    audio: `Correct: play the note. Incorrect: say “${quizRetry.prompt}” (rate ${quizRetry.rate}, arms down).`, gesture,
    input: 'Click Line or Space. Correct answer is derived from the current pitch row.',
    completion: 'Five correct answers, followed by playback of all five notes, a closing pause, and their shared exit to the right. Incorrect answers retry the same note.',
    timing: { correctNote: 480, nextQuestion: 140, beforePlayback: 1500, note: 190, gap: 45, afterPlayback: lessonPacing.afterExerciseMs },
  },
  {
    id: 'drag-to-line', title: 'Move all notes onto lines', prompt: 'Move each note onto a line.',
    visual: 'Slide five draggable notes onto the screen from the left; snap vertical movement to pitch rows. After playback, slide the group off to the right and keep the pitchGrid visible.',
    audio: 'Pitch follows dragging. When all notes match, play them in order.', gesture,
    input: 'Drag each note to any line. Input unlocks as narration starts; submitting an answer interrupts it.',
    completion: 'All five notes are on lines; playback and the shared exit finish, then Grammy says “Good job!” with the pitchGrid still visible.',
    timing: { leadIn: lessonScreenSlideMs, note: 190, gap: 45, afterPlayback: lessonPacing.afterExerciseMs },
  },
  {
    id: 'drag-to-space', title: 'Move all notes into spaces', prompt: 'Move each note into a space.',
    visual: 'Slide a fresh assortment of five line pitches onto the screen from the left as Grammy introduces the task; snap vertical movement to pitch rows. After playback, slide the group off to the right.',
    audio: 'Pitch follows dragging. When all notes match, play them in order.', gesture,
    input: 'Drag each note to any space while Grammy introduces the task. Completing placement interrupts narration and starts playback.',
    completion: 'All five notes are in spaces; playback, feedback delay, and the shared exit finish.',
    timing: { leadIn: 0, note: 190, gap: 45, afterPlayback: lessonPacing.afterExerciseMs },
  },
  {
    id: 'finish-section', title: 'Celebrate and continue to High and Low', prompt: 'Terrific!',
    visual: 'Clear the notes and lock input while Grammy celebrates; keep the pitchGrid visible through the transition into section 1.1.2.',
    audio: 'Grammy says “Terrific!”.', gesture, input: 'None.',
    completion: 'Success narration and closing hold finish.', timing: { delay: lessonPacing.afterCelebrationMs },
  },
] as const satisfies readonly LessonCue[];

export type LinesSpacesCueId = typeof cueGroups[number]['id'];
export function getLinesSpacesCue<Id extends LinesSpacesCueId>(id: Id) {
  return cueGroups.find((cue) => cue.id === id)! as Extract<typeof cueGroups[number], { id: Id }>;
}

export const lineToneSpecs = [
  ['Bb3', 'A sharp 3'],
  ['C4', 'C 4'],
  ['D4', 'D 4'],
  ['E4', 'E 4'],
  ['Gb4', 'F sharp 4'],
  ['Ab4', 'G sharp 4'],
  ['Bb4', 'A sharp 4'],
  ['C5', 'C 5'],
  ['D5', 'D 5'],
  ['E5', 'E 5'],
  ['Gb5', 'F sharp 5'],
  ['Ab5', 'G sharp 5'],
] as const;

export const spaceToneSpecs = [
  ['A3', 'A 3'],
  ['B3', 'B 3'],
  ['Db4', 'C sharp 4'],
  ['Eb4', 'D sharp 4'],
  ['F4', 'F 4'],
  ['G4', 'G 4'],
  ['A4', 'A 4'],
  ['B4', 'B 4'],
  ['Db5', 'C sharp 5'],
  ['Eb5', 'D sharp 5'],
  ['F5', 'F 5'],
  ['G5', 'G 5'],
  ['A5', 'A 5'],
] as const;

export const quizToneSpecs = [
  ['Db4', 'C sharp 4'],
  ['Ab4', 'G sharp 4'],
  ['Eb5', 'D sharp 5'],
  ['D4', 'D 4'],
  ['F4', 'F 4'],
] as const;

export const dragToneSpecs = [
  ['Db4', 'C sharp 4'],
  ['B4', 'B 4'],
  ['G4', 'G 4'],
  ['F5', 'F 5'],
  ['A3', 'A 3'],
] as const;

export const spaceDragToneSpecs = [
  ['C4', 'C 4'],
  ['E4', 'E 4'],
  ['Ab4', 'G sharp 4'],
  ['D5', 'D 5'],
  ['Gb5', 'F sharp 5'],
] as const;

export type LinesSpacesAction = LessonCueAction & {
  kind: 'show-grid' | 'glow-grid' | 'glow-spaces' | 'show-lines' | 'hide-lines' | 'speech' | 'parallel-speech' | 'wait'
    | 'demo-note' | 'demo-gap' | 'join-speech' | 'quiz-input' | 'quiz-retry'
    | 'quiz-tone' | 'quiz-next' | 'quiz-playback-note' | 'quiz-playback-gap' | 'quiz-exit' | 'drag-input' | 'drag-note' | 'drag-gap' | 'drag-exit' | 'success' | 'end';
  durationMs?: number;
  leadInMs?: number;
  index?: number;
  prompt?: string;
};

function actionsFor(cue: typeof cueGroups[number]): LinesSpacesAction[] {
  const speech = (parallel = false): LinesSpacesAction => ({
    id: 'narration', kind: parallel ? 'parallel-speech' : 'speech',
    title: `Grammy: “${cue.prompt}”`,
    detail: `${cue.gesture}${parallel ? ' Note reveals start alongside this narration.' : ' Continue when the narration finishes.'}`,
  });
  const wait = (id: string, durationMs: number, detail: string): LinesSpacesAction => ({
    id, kind: 'wait', title: `Pause ${durationMs} ms`, detail, durationMs,
  });

  switch (cue.id) {
    case 'introduce-pitch':
      return [
        { id: 'show-grid', kind: 'show-grid', title: 'Show the pitch grid',
          detail: 'Reveal the grid with input locked.', durationMs: cue.timing.reveal },
        { ...speech(), id: 'name-grid', prompt: 'This, is the pitch GRID.' },
        { id: 'glow-grid', kind: 'glow-grid', title: 'Glow the whole pitch grid',
          detail: `Highlight the entire grid for ${cue.timing.glow} ms.`, durationMs: cue.timing.glow },
        { id: 'grid-glow-off', kind: 'hide-lines', title: 'Stop the grid glow',
          detail: 'Return the grid to its normal appearance.', durationMs: cue.timing.afterGlow },
        { ...speech(), id: 'name-lines', title: 'Grammy: “This grid has lines...”', prompt: 'This grid has lines...' },
        { id: 'glow', kind: 'show-lines', title: 'Glow the horizontal pitch lines',
          detail: `Highlight the horizontal lines for ${cue.timing.glow} ms.`, durationMs: cue.timing.glow },
        { id: 'glow-off', kind: 'hide-lines', title: 'Stop the line glow',
          detail: 'Return the lines to their normal appearance.', durationMs: cue.timing.afterGlow },
        { ...speech(), id: 'name-spaces', title: 'Grammy: “...and spaces”', prompt: '...and spaces' },
        { id: 'glow-spaces', kind: 'glow-spaces', title: 'Glow the space rows',
          detail: `Highlight the spaces between horizontal lines for ${cue.timing.glow} ms.`, durationMs: cue.timing.glow },
        { id: 'space-glow-off', kind: 'hide-lines', title: 'Stop the space-row glow',
          detail: 'Return the grid to normal and continue to segment b.', durationMs: cue.timing.afterGlow },
      ];
    case 'demonstrate-lines':
    case 'demonstrate-spaces': {
      const notes = cue.id === 'demonstrate-lines' ? lineToneSpecs : spaceToneSpecs;
      return [
        speech(true),
        wait('reveal-delay', cue.timing.revealDelay, 'Start measuring this delay with the narration request; do not wait for speech to finish.'),
        ...notes.flatMap(([tone], index): LinesSpacesAction[] => [
          { id: `note-${index}`, kind: 'demo-note', index, durationMs: cue.timing.note,
            title: `Reveal and sound ${tone} · ${cue.timing.note} ms`,
            detail: `Keep the previous ${index} notes visible. Highlight ${tone} and play its sawtooth tone; input stays locked.` },
          { id: `gap-${index}`, kind: 'demo-gap', index, durationMs: cue.timing.gap,
            title: `Pause ${cue.timing.gap} ms after ${tone}`, detail: 'Keep the revealed notes in place before the next action.' },
        ]),
        { id: 'join-narration', kind: 'join-speech', title: 'Wait for the overlapping narration to finish',
          detail: 'Keep all revealed notes visible and remove the sounding-note highlight. If jumping here, earlier speech is not replayed.' },
        wait('settle', cue.timing.afterSpeech, 'Hold the completed demonstration before advancing.'),
      ];
    }
    case 'identify-line-space':
      return [
        { id: 'learn-grid', kind: 'speech', prompt: linesSpacesQuizIntroduction,
          title: `Grammy: “${linesSpacesQuizIntroduction}”`,
          detail: 'Introduce the quiz before its first note appears. Retain this bubble above the question.' },
        ...quizToneSpecs.flatMap(([tone], index): LinesSpacesAction[] => [
          { id: `question-${index}`, kind: 'quiz-input', index,
            title: `Question ${index + 1}: line or space? · ${tone}`,
            detail: `Slide ${tone} in from the left screen edge over ${lessonScreenSlideMs} ms, retaining earlier notes. Unlock the Line / Space buttons and wait for the correct choice and entrance to finish. Underline “line” and “space” in the prompt.` },
          { id: `retry-${index}`, kind: 'quiz-retry', index,
            title: `If incorrect: “${quizRetry.prompt}”`,
            detail: `Keep both arms down and speak at rate ${quizRetry.rate}. Restore the same question and unlock another attempt. This branch runs only after an incorrect answer or when selected directly.` },
          { id: `correct-${index}`, kind: 'quiz-tone', index, durationMs: cue.timing.correctNote,
            title: `If correct: sound ${tone} · ${cue.timing.correctNote} ms`,
            detail: 'Lock the answer buttons while playing the correctly identified pitch.' },
          ...(index < quizToneSpecs.length - 1 ? [{
            id: `next-${index}`, kind: 'quiz-next' as const, index, durationMs: cue.timing.nextQuestion,
            title: `Pause ${cue.timing.nextQuestion} ms before the next question`,
            detail: 'Keep the buttons locked during the transition, then invite the next answer.',
          }] : []),
        ]),
        ...quizToneSpecs.flatMap(([tone], index): LinesSpacesAction[] => [
          { id: `playback-${index}`, kind: 'quiz-playback-note', index, durationMs: cue.timing.note,
            leadInMs: index === 0 ? cue.timing.beforePlayback : 0,
            title: `Sound note ${index + 1}: ${tone} · ${cue.timing.note} ms`,
            detail: 'Keep all five notes visible, hide the answer buttons and pointer, and highlight the sounding note.' },
          { id: `playback-gap-${index}`, kind: 'quiz-playback-gap', index, durationMs: cue.timing.gap,
            title: `Pause ${cue.timing.gap} ms after ${tone}`, detail: 'Keep the notes in place before the next sound.' },
        ]),
        wait('settle', cue.timing.afterPlayback, 'Remove the note highlight and hold the completed quiz before the notes slide offscreen.'),
        { id: 'slide-out', kind: 'quiz-exit', durationMs: lessonScreenSlideMs,
          title: 'Slide all five notes off to the right',
          detail: `Move all five notes together past the right screen edge over ${lessonScreenSlideMs} ms, then begin segment e.` },
      ];
    case 'drag-to-line':
    case 'drag-to-space': {
      const target = cue.id === 'drag-to-line' ? 'line' : 'space';
      const notes = cue.id === 'drag-to-line' ? dragToneSpecs : spaceDragToneSpecs;
      return [
        ...(cue.timing.leadIn ? [wait('lead-in', cue.timing.leadIn, 'Slide five notes onto the screen from the left with dragging locked until they arrive.')] : []),

        { id: 'placement', kind: 'drag-input',
          prompt: cue.prompt,
          title: cue.id === 'drag-to-space' ? 'Grammy introduces the task; move all five notes into spaces' : 'Wait for all five notes on lines',
          detail: `Unlock dragging as Grammy starts the introduction. Snap each note to a pitch row and sound its pitch while dragging. Continue only when every note is on a ${target}; other placements remain editable. Submitting any placement interrupts unfinished question speech.` },
        ...notes.flatMap((_, index): LinesSpacesAction[] => [
          { id: `tone-${index}`, kind: 'drag-note', index, durationMs: cue.timing.note,
            title: `Sound placed note ${index + 1} · ${cue.timing.note} ms`,
            detail: 'Highlight this note and play the pitch chosen by the learner. Direct jumps use a valid example placement.' },
          { id: `gap-${index}`, kind: 'drag-gap', index, durationMs: cue.timing.gap,
            title: `Pause ${cue.timing.gap} ms after note ${index + 1}`, detail: 'Keep the notes in their completed positions.' },
        ]),
        wait('settle', cue.timing.afterPlayback, 'Remove the sounding-note highlight and hold the completed placement before continuing.'),
        { id: 'slide-out', kind: 'drag-exit', durationMs: lessonScreenSlideMs,
          title: 'Slide all five placed notes off to the right',
          detail: `Move the completed placement past the right screen edge over ${lessonScreenSlideMs} ms before success or the next segment.` },
        ...(cue.id === 'drag-to-line' ? [{
          id: 'success', kind: 'success' as const, prompt: 'Good job!', durationMs: lessonPacing.afterCelebrationMs,
          title: 'Grammy: “Good job!”',
          detail: `Clear the notes, keep the pitchGrid visible, and lock input. Wait for Grammy to finish speaking, then hold for ${lessonPacing.afterCelebrationMs} ms before the space-drag task.`,
        }] : []),
      ];
    }
    case 'finish-section':
      return [
        { id: 'success', kind: 'success', prompt: cue.prompt, durationMs: cue.timing.delay,
          title: 'Grammy: “Terrific!”',
          detail: `Clear the notes, keep the pitchGrid visible, and lock input. Wait for narration, then hold for ${cue.timing.delay} ms before continuing.` },
        { id: 'advance', kind: 'end', title: 'Continue to 1.1.2',
          detail: 'Advance to High and Low with the pitchGrid still visible.', durationMs: 0 },
      ];
  }
}

export const linesSpacesCues = cueGroups.map((cue) => ({ ...cue, actions: actionsFor(cue) }));

/** Group execution steps into the same broad teaching actions used by High and Low. */
export function getLinesSpacesInspectorActionId(cueId: string, actionId: string): string | null {
  const cue = linesSpacesCues.find((item) => item.id === cueId);
  const action = cue?.actions.find((item) => item.id === actionId);
  if (!cue || !action) return null;
  switch (cue.id) {
    case 'introduce-pitch': {
      const index = cue.actions.indexOf(action);
      return index < 4 ? 'show-grid' : index < 7 ? 'name-lines' : 'name-spaces';
    }
    case 'demonstrate-lines':
    case 'demonstrate-spaces':
      return 'narration';
    case 'identify-line-space':
      if (action.kind === 'quiz-next') return `correct-${action.index}`;
      if (action.kind === 'quiz-playback-note' || action.kind === 'quiz-playback-gap' || action.id === 'settle') return 'playback-0';
      return action.id;
    case 'drag-to-line':
    case 'drag-to-space':
      if (action.kind === 'success' || action.kind === 'drag-exit') return action.id;
      if (action.kind === 'drag-input') return 'placement';
      if (action.kind === 'drag-note' || action.kind === 'drag-gap' || action.id === 'settle') return 'tone-0';
      return cue.id === 'drag-to-line' ? 'lead-in' : 'narration';
    default:
      return action.id;
  }
}

function inspectorSummary(cue: typeof linesSpacesCues[number], action: LinesSpacesAction): LessonCueAction {
  const summarize = (title: string, detail: string): LessonCueAction => ({ id: action.id, title, detail });
  switch (cue.id) {
    case 'introduce-pitch':
      if (action.id === 'show-grid') return summarize('Introduce the pitch grid',
        'Show the grid, say “This, is the pitch GRID.”, glow the whole grid for 1200 ms, then stop the glow.');
      if (action.id === 'name-lines') return summarize('Introduce the horizontal lines',
        'Say “This grid has lines...”, glow the horizontal lines for 1200 ms, then stop the glow.');
      return summarize('Introduce the spaces',
        'Say “...and spaces”, glow the space rows for 1200 ms, then stop the glow.');
    case 'demonstrate-lines':
    case 'demonstrate-spaces':
      return summarize(`“${cue.prompt}” and reveal the notes`,
        `Grammy speaks with both arms down while the ${cue.id === 'demonstrate-lines' ? 'line' : 'space'} notes appear from low to high. Sound each note for 145 ms with 35 ms gaps. Wait for narration, then hold the completed grid for ${cue.timing.afterSpeech} ms.`);
    case 'identify-line-space':
      if (action.id === 'playback-0') return summarize('Play all five notes',
        `Hide the answer buttons and pointer, pause ${cue.timing.beforePlayback} ms, then highlight and sound all five notes in order for 190 ms each with 45 ms gaps. Remove the highlight and hold for ${cue.timing.afterPlayback} ms before the shared exit.`);
      if (action.kind === 'quiz-tone') return summarize(`If correct: sound ${quizToneSpecs[action.index!][0]} and continue`,
        'Lock the answer buttons, play the correctly identified note for 480 ms, then move to the next question after 140 ms. After the last answer, play all five notes.');
      return { id: action.id, title: action.title, detail: action.detail };
    case 'drag-to-line':
    case 'drag-to-space':
      if (action.kind === 'success' || action.kind === 'drag-exit') return { id: action.id, title: action.title, detail: action.detail };
      if (action.id === 'tone-0') return summarize('Play the completed placement',
        `Lock dragging, highlight and sound each of the five placed notes for 190 ms with 45 ms gaps, then remove the highlight and hold for ${cue.timing.afterPlayback} ms before their shared exit.`);
      if (action.kind === 'drag-input') return { id: action.id, title: action.title, detail: action.detail };
      return summarize(`Grammy: “${cue.prompt}”`,
        `${cue.gesture} Slide five notes onto the screen from the left${cue.id === 'drag-to-line' ? ` over ${lessonScreenSlideMs} ms with dragging locked until arrival` : ', using a fresh assortment of line pitches'}. Unlock dragging as narration starts; submitting a placement interrupts it.`);
    default:
      return { id: action.id, title: action.title, detail: action.detail };
  }
}

export const linesSpacesInspectorCues: readonly LessonCue[] = linesSpacesCues.map((cue) => ({
  ...cue,
  actions: cue.actions
    .filter((action) => getLinesSpacesInspectorActionId(cue.id, action.id) === action.id)
    .map((action) => inspectorSummary(cue, action)),
}));

/** Normal progress bypasses retry branches; an explicit retry returns to its question. */
export function nextLinesSpacesActionIndex(actions: readonly LinesSpacesAction[], index: number): number {
  const action = actions[index];
  if (action.kind === 'quiz-retry') return actions.findIndex((item) => item.id === `question-${action.index}`);
  let next = index + 1;
  while (actions[next]?.kind === 'quiz-retry') next += 1;
  return next;
}

/** Resolve only action boundaries that the lesson actually executes. */
export function getLinesSpacesCheckpoint(cueId: string, actionId?: string) {
  const cue = linesSpacesCues.find((item) => item.id === cueId);
  if (!cue) return null;
  const actionIndex = actionId ? cue.actions.findIndex((item) => item.id === actionId) : 0;
  if (actionIndex < 0) return null;
  const action = cue.actions[actionIndex];
  const isDemo = cue.id === 'demonstrate-lines' || cue.id === 'demonstrate-spaces';
  const noteCount = cue.id === 'demonstrate-lines' ? lineToneSpecs.length : spaceToneSpecs.length;
  const quizReview = cue.id === 'identify-line-space'
    && (action.kind === 'quiz-playback-note' || action.kind === 'quiz-playback-gap' || action.id === 'settle' || action.kind === 'quiz-exit');
  const quizIndex = quizReview && (action.id === 'settle' || action.kind === 'quiz-exit')
    ? -1 : (action.index ?? 0) + (action.kind === 'quiz-next' ? 1 : 0);
  return {
    cue, action, actionIndex,
    clearCanvas: action.kind === 'success' || cue.id === 'finish-section',
    keepGridVisible: action.kind === 'success' || cue.id === 'finish-section',
    slideDragIn: (cue.id === 'drag-to-line' || cue.id === 'drag-to-space')
      && (action.id === 'lead-in' || action.kind === 'drag-input'),
    openingNarration: cue.id === 'introduce-pitch'
      ? cue.actions.slice(0, actionIndex + 1).filter((item) => item.prompt).at(-1)?.prompt ?? ''
      : action.prompt ?? cue.prompt,
    upperNarration: cue.id === 'identify-line-space' && action.id !== 'learn-grid' && !quizReview
      ? linesSpacesQuizIntroduction : '',
    visibleDemoNoteCount: isDemo
      ? action.index !== undefined ? action.index + 1
        : action.kind === 'join-speech' || action.id === 'settle' ? noteCount : 0
      : 0,
    quizReview,
    quizIndex,
    visibleQuizNoteCount: cue.id === 'identify-line-space' && action.id !== 'learn-grid' ? quizReview ? quizToneSpecs.length : quizIndex + 1 : 0,
    settledDrag: action.kind === 'drag-note' || action.kind === 'drag-gap' || action.kind === 'drag-exit' || action.id === 'settle',
  };
}

