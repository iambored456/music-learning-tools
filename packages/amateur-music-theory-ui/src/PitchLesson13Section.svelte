<script lang="ts">
  import '@mlt/lesson-kit/styles.css';
  import {
    calculateLessonGridLayout, lessonGridAppearance, lessonNoteAppearance,
    createLessonAudioOutput, createLessonClock, createLessonQuestion,
    snapLessonPlacement, lessonPacing, completeLessonExercise, lessonOutsidePlacement, lessonScreenSlide,
  } from '@mlt/lesson-kit';
  import { fullRowData } from '@mlt/pitch-data';
  import { PitchGrid } from '@mlt/ui-components/canvas';
  import { getContext, onDestroy, untrack } from 'svelte';
  import LessonAvatarDock from './LessonAvatarDock.svelte';
  import IntervalReferenceChart from './IntervalReferenceChart.svelte';
  import PitchDistanceBracket from './PitchDistanceBracket.svelte';
  import { harmonyIntervalPlans } from './harmonyIntervals';
  import { cancelLessonAvatarSpeech, speakWithLessonAvatar, setLessonAvatarThinking } from './lessonAvatar';
  import { lessonInspectorKey, type LessonInspector } from './lessonInspector.svelte';
  import type { LessonSection } from './lessons';
  import {
    intervalPlans, intervalPitchRange, displayIntervalPitch, intervalPrompt,
    intervalAnswerPitch, isIntervalPlacementCorrect, getIntervalSeekTarget, getIntervalCheckpoint,
    createIntervalExampleNotes, getIntervalPlaybackNotes, getIntervalPlaybackGroups,
    getIntervalQuestionNotes, getIntervalAnswerNotes, getIntervalPlaybackOrder,
    type IntervalDistance, type IntervalNote, type IntervalQuestion, type IntervalStep,
  } from './lesson13Intervals';

  let { section, isPlaying, volume, ensureAudioContext, onComplete }: {
    section: LessonSection;
    isPlaying: boolean;
    volume: number;
    ensureAudioContext: () => Promise<AudioContext | null>;
    onComplete?: () => void;
  } = $props();
  const inspector = getContext<LessonInspector | undefined>(lessonInspectorKey);
  const plan = $derived(intervalPlans[section.id] ?? harmonyIntervalPlans[section.id]);
  const clock = createLessonClock();
  const audioOutput = createLessonAudioOutput();
  const questionNarration = createLessonQuestion(cancelLessonAvatarSpeech, setLessonAvatarThinking);
  const firstRow = fullRowData.findIndex(row => row.midi === intervalPitchRange.highMidi);
  const lastRow = fullRowData.findIndex(row => row.midi === intervalPitchRange.lowMidi);
  const rowCount = lastRow - firstRow + 1;
  const rowByMidi = new Map(fullRowData.map((row, index) => [row.midi, { ...row, index }]));
  const legendColumns = 6;
  const singingConfig = { pitchHistory: [] };
  const voices = new Set<{ oscillator: OscillatorNode; gain: GainNode }>();

  let frameWidth = $state(0);
  let frameHeight = $state(0);
  let viewportWidth = $state(0);
  let viewportHeight = $state(0);
  const columns = $derived(frameWidth > 0 && frameWidth <= 720 ? 20 : 28);
  const layout = $derived(calculateLessonGridLayout({ width: frameWidth, height: frameHeight,
    columns, rows: rowCount, legendColumns }));
  const cellWidth = $derived(layout.cellWidth);
  const viewport = $derived({ startRow: firstRow, endRow: lastRow, zoomLevel: 1,
    containerWidth: viewportWidth, containerHeight: viewportHeight });

  let chartLevel = $state<IntervalDistance>(untrack(() => plan.initialChart));
  let chartDistances = $state<IntervalDistance[]>(untrack(() => getIntervalCheckpoint(plan, 0, 0).chartDistances));
  let chartVisible = $state(untrack(() => plan.initialChartVisible));
  let chartEntering = $state(false);
  let teacherWidth = $state(0);
  let activeDistance = $state<IntervalDistance | null>(null);
  let chartVersion = $state(0);
  let avatarReady = $state(false);
  let sequenceStarted = $state(false);
  let narration = $state('');
  let upperNarration = $state('');
  let notes = $state<IntervalNote[]>([]);
  let showDistanceBracket = $state(false);
  let movingFromNotes = $state<IntervalNote[] | null>(null);
  let notesExiting = $state(false);
  let noteExitVersion = $state(0);
  let pendingNoteExits = new Set<string>();
  let resolveNoteExit: ((finished: boolean) => void) | null = null;
  let currentQuestion = $state<IntervalQuestion | null>(null);
  let answerLocked = $state(true);
  let preview = $state<{ midi: number; leftPercent: number } | null>(null);
  let complete = $state(false);
  let placementLayer = $state<HTMLDivElement | null>(null);
  let pointerId = $state<number | null>(null);
  let sequence = $state(0);
  let activeCue = $state<string | null>(null);
  let responseResolve: ((correct: boolean) => void) | null = null;
  let unregisterInspector: (() => void) | undefined;
  let completed: Array<{ question: IntervalQuestion; answer: IntervalNote }> = [];
  let questionAttempts = 0;
  let previewPlaybackSequence = 0;
  let disposed = false;

  const underlinedWords = $derived(narration.includes('minor 3rd') ? ['minor 3rd']
    : narration.includes('major 3rd') ? ['major 3rd'] : narration.includes('minor 6th') ? ['minor 6th']
    : narration.includes('major 6th') ? ['major 6th'] : narration.includes('minor 7th') ? ['minor 7th']
    : narration.includes('major 7th') ? ['major 7th'] : narration.includes('tritone') ? ['tritone']
    : narration.includes('octave') ? ['octave'] : narration.includes('minor 2nd') ? ['minor 2nd']
    : narration.includes('major 2nd') ? ['major 2nd'] : narration.includes('minor second') ? ['minor second']
    : narration.includes('major second') ? ['major second'] : narration.includes('unison') ? ['unison']
    : narration.includes('interval') ? ['interval'] : []);
  const legendLabels = $derived(new Map(notes.map(note => [note.midi, displayIntervalPitch(note.label)])));
  const distanceBracket = $derived.by(() => {
    const bracketNotes = currentQuestion?.octave ? notes.filter(note => note.id === 'reference' || note.id === 'octave') : notes;
    if ((!showDistanceBracket && !currentQuestion?.octave) || bracketNotes.length !== 2) return null;
    const rows = bracketNotes.map(note => rowCenter(note.midi));
    const [upper, lower] = bracketNotes[0].midi >= bracketNotes[1].midi ? bracketNotes : [bracketNotes[1], bracketNotes[0]];
    const leftColumn = Math.min(...bracketNotes.map(note => columnCenter(note.leftPercent)));
    const musicalWidth = viewportWidth - cellWidth * legendColumns;
    const armLength = (note: IntervalNote) =>
      `calc(1.1rem + ${(columnCenter(note.leftPercent) - leftColumn) / 100 * musicalWidth}px)`;
    return {
      top: Math.min(...rows),
      height: Math.abs(rows[1] - rows[0]),
      left: `calc(${leftColumn}% - var(--lesson-note-size) / 2 - 0.4rem - 1.1rem)`,
      topArmLength: armLength(upper),
      bottomArmLength: armLength(lower),
    };
  });
  const octaveSegments = $derived.by(() => {
    if (!currentQuestion?.octave) return [];
    const reference = notes.find(note => note.id === 'reference');
    const answer = notes.find(note => note.id === 'answer');
    const octave = notes.find(note => note.id === 'octave');
    if (!reference || !answer || !octave) return [];
    const rightColumn = Math.max(...[reference, answer, octave].map(note => columnCenter(note.leftPercent)));
    const musicalWidth = viewportWidth - cellWidth * legendColumns;
    const armLength = (note: IntervalNote) => `calc(1.1rem + ${(rightColumn - columnCenter(note.leftPercent)) / 100 * musicalWidth}px)`;
    return [[reference, answer], [answer, octave]].map(([first, second]) => {
      const [upper, lower] = first.midi > second.midi ? [first, second] : [second, first];
      return { top: rowCenter(upper.midi), height: rowCenter(lower.midi) - rowCenter(upper.midi),
        left: `calc(${rightColumn}% + var(--lesson-note-size) / 2 + 0.4rem)`, side: 'right' as const,
        topArmLength: armLength(upper), bottomArmLength: armLength(lower) };
    });
  });

  function rowCenter(midi: number): number {
    return ((rowByMidi.get(midi)!.index - firstRow + 1) / (rowCount + 1)) * 100;
  }
  function columnCenter(leftPercent: number): number {
    return Math.max(1, Math.min(columns - 1, Math.round(leftPercent / 100 * columns))) / columns * 100;
  }
  function coincidentNotes(items: readonly IntervalNote[] = notes): boolean {
    return items.length === 2 && items[0].midi === items[1].midi
      && columnCenter(items[0].leftPercent) === columnCenter(items[1].leftPercent);
  }
  function noteMargin(note: IntervalNote, items: readonly IntervalNote[] = notes): number {
    return coincidentNotes(items) ? (note.id.endsWith('reference') ? -1 : 1) * cellWidth * 0.12 : 0;
  }
  function noteMovementOffset(note: IntervalNote): { x: number; y: number } {
    const from = movingFromNotes?.find(item => item.id === note.id);
    if (!from || !movingFromNotes) return { x: 0, y: 0 };
    return {
      x: (columnCenter(from.leftPercent) - columnCenter(note.leftPercent)) / 100 * (viewportWidth - cellWidth * legendColumns)
        + noteMargin(from, movingFromNotes) - noteMargin(note),
      y: (rowCenter(from.midi) - rowCenter(note.midi)) / 100 * viewportHeight,
    };
  }
  function isCurrent(token: number): boolean { return !disposed && token === sequence; }
  async function wait(ms: number, token: number): Promise<boolean> {
    clock.setPaused(!isPlaying);
    return isCurrent(token) && await clock.wait(ms) && isCurrent(token);
  }
  function mark(cueId: string, actionId: string): void {
    if (activeCue !== cueId) {
      if (activeCue) inspector?.status('completed');
      activeCue = cueId;
      inspector?.enter(cueId);
    }
    inspector?.action(actionId);
    inspector?.status('running');
  }
  function stopVoices(): void {
    for (const voice of voices) {
      try { voice.oscillator.stop(); } catch { /* Its scheduled stop may already have fired. */ }
      voice.oscillator.disconnect(); voice.gain.disconnect();
      audioOutput.forget(voice.gain);
    }
    voices.clear();
  }
  function cancelPointer(): void {
    const captured = pointerId;
    pointerId = null;
    if (captured !== null && placementLayer?.hasPointerCapture(captured)) placementLayer.releasePointerCapture(captured);
    preview = null;
  }
  function reset(): number {
    sequence++;
    previewPlaybackSequence++;
    cancelNoteExit();
    questionNarration.submit();
    cancelLessonAvatarSpeech(); clock.cancel(); stopVoices(); cancelPointer();
    responseResolve?.(false); responseResolve = null;
    answerLocked = true; currentQuestion = null; complete = false;
    narration = ''; upperNarration = ''; notes = []; movingFromNotes = null; completed = []; activeCue = null; activeDistance = null;
    showDistanceBracket = false;
    return sequence;
  }
  async function say(text: string, token: number, valid: () => boolean = () => true, display = true): Promise<void> {
    if (display) narration = text;
    if (!(await wait(0, token)) || !valid()) return;
    await speakWithLessonAvatar(text, { rate: 0.92, lang: 'en-CA' }).catch(error => {
      inspector?.record('error', `Interval narration failed: ${String(error)}`);
    });
  }
  async function playTogether(items: readonly IntervalNote[], token: number, valid: () => boolean = () => true): Promise<void> {
    if (!(await wait(0, token)) || !valid()) return;
    const context = await ensureAudioContext();
    if (!context || !isCurrent(token) || !valid() || !(await wait(0, token)) || !valid()) return;
    const start = context.currentTime;
    const end = start + lessonPacing.comparisonNoteMs / 1000;
    const group = items.map(note => {
      const frequency = rowByMidi.get(note.midi)!.frequency;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency, start);
      const peak = 0.12;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(peak, start + 0.025);
      gain.gain.setValueAtTime(peak, end - 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.connect(gain);
      audioOutput.connect(gain, context, volume, { frequency, noteIds: [note.id], start,
        attackEnd: start + 0.025, releaseStart: end - 0.08, end, peak });
      oscillator.start(start); oscillator.stop(end + 0.02);
      const voice = { oscillator, gain }; voices.add(voice); return voice;
    });
    await wait(lessonPacing.comparisonNoteMs, token);
    for (const voice of group) {
      if (!voices.delete(voice)) continue;
      try { voice.oscillator.stop(); } catch { /* Scheduled stop already fired. */ }
      voice.oscillator.disconnect(); voice.gain.disconnect(); audioOutput.forget(voice.gain);
    }
  }
  async function playPair(items: readonly IntervalNote[], token: number, together?: boolean, valid: () => boolean = () => true): Promise<void> {
    if (items.length < 2 || !valid()) return;
    if (together ?? (columnCenter(items[0].leftPercent) === columnCenter(items[1].leftPercent))) {
      await playTogether(items, token, valid);
    } else {
      const ordered = getIntervalPlaybackOrder(items, Boolean(plan.ascendingPlayback));
      await playTogether([ordered[0]], token, valid);
      if (!(await wait(lessonPacing.betweenNotesMs, token)) || !valid()) return;
      await playTogether([ordered[1]], token, valid);
    }
  }
  function setExample(step: Extract<IntervalStep, { kind: 'setup' }>): void {
    notes = createIntervalExampleNotes(step, notes);
  }
  function cancelNoteExit(): void {
    noteExitVersion++;
    pendingNoteExits.clear();
    resolveNoteExit?.(false); resolveNoteExit = null;
    notesExiting = false;
  }
  function noteExitFinished(id: string, version: number): void {
    if (version !== noteExitVersion || !pendingNoteExits.delete(id) || pendingNoteExits.size > 0) return;
    resolveNoteExit?.(true); resolveNoteExit = null;
  }
  async function slideNotesOut(token: number): Promise<boolean> {
    if (!(await wait(0, token))) return false;
    if (notes.length === 0) return true;
    cancelNoteExit();
    pendingNoteExits = new Set(notes.map(note => note.id));
    const departure = new Promise<boolean>(resolve => { resolveNoteExit = resolve; });
    notesExiting = true;
    if (!(await departure) || !isCurrent(token)) return false;
    notes = []; notesExiting = false;
    return true;
  }
  async function replayVisibleNotes(token: number): Promise<void> {
    const groups = getIntervalPlaybackGroups(notes, columns);
    for (const [index, group] of groups.entries()) {
      await playTogether(group, token);
      if (!isCurrent(token)) return;
      if (index < groups.length - 1 && !(await wait(lessonPacing.betweenNotesMs, token))) return;
    }
  }
  function restoreCheckpoint(cueIndex: number, stepIndex: number): void {
    const state = getIntervalCheckpoint(plan, cueIndex, stepIndex);
    notes = state.notes; completed = state.completed; chartLevel = state.chartLevel; chartDistances = state.chartDistances;
    chartVisible = state.chartVisible; chartEntering = false;
    chartVersion++;
  }
  function openQuestion(question: IntervalQuestion): void {
    currentQuestion = question;
    answerLocked = false;
    notes = getIntervalQuestionNotes(question);
  }
  async function ask(question: IntervalQuestion, token: number, soundReference = false, introduction?: string): Promise<void> {
    if (!isCurrent(token)) return;
    void questionNarration.start(async valid => {
      if (soundReference) void playTogether(notes.filter(note => note.id === 'reference'), token, valid).catch(error => {
        if (isCurrent(token) && valid()) inspector?.record('error', `Interval reference failed: ${String(error)}`);
      });
      if (introduction) {
        await say(introduction, token, valid, false);
        if (!isCurrent(token) || !valid()) return;
      }
      return say(intervalPrompt(question, true), token, valid);
    }, () => openQuestion(question));
    narration = intervalPrompt(question);
    inspector?.status('waiting');
  }
  async function submit(midi: number, leftPercent: number, token = sequence): Promise<void> {
    if (!isCurrent(token) || !currentQuestion || currentQuestion.choices || answerLocked || !isPlaying) return;
    const question = currentQuestion;
    const cueId = activeCue!;
    questionNarration.submit(); stopVoices(); cancelPointer(); answerLocked = true;
    previewPlaybackSequence++;
    questionAttempts++;
    const correct = isIntervalPlacementCorrect(question, { midi, leftPercent });
    const answer = { ...intervalAnswerPitch(question, midi), id: 'answer', leftPercent };
    notes = getIntervalAnswerNotes(question, answer);
    mark(cueId, correct ? 'correct' : 'retry');
    inspector?.record('input', `${question.reference.label} → ${answer.label}; ${correct ? 'correct' : 'incorrect'}; column ${Math.round(leftPercent / 100 * columns)}`);
    await playPair(notes.filter(note => note.id === 'reference' || note.id === 'answer'), token);
    if (!isCurrent(token)) return;
    let feedback = correct ? question.successText ?? 'Correct!' : 'Try again.';
    if (!correct && plan.ascendingPlayback && questionAttempts >= 2) {
      const difference = midi - question.reference.midi;
      const error = Math.abs(difference - question.distance);
      feedback = difference <= 0 ? 'Try again. Place your note above the reference.'
        : `Try again. That interval is ${error} ${error === 1 ? 'pitch' : 'pitches'} too ${difference > question.distance ? 'wide' : 'small'}.`;
    }
    await say(feedback, token);
    if (!(await wait(correct ? lessonPacing.afterCorrectPlacementMs : lessonPacing.afterRetryMs, token))) return;
    if (correct) {
      activeDistance = question.distance;
      completed.push({ question, answer });
      currentQuestion = null;
      responseResolve?.(true); responseResolve = null;
    } else {
      mark(cueId, 'question');
      await ask(question, token);
    }
  }
  async function submitChoice(choiceId: string, token = sequence): Promise<void> {
    if (!isCurrent(token) || !currentQuestion?.choices || answerLocked || !isPlaying) return;
    const question = currentQuestion;
    const choice = question.choices!.find(item => item.id === choiceId);
    if (!choice) return;
    questionNarration.submit(); stopVoices(); cancelPointer(); answerLocked = true;
    previewPlaybackSequence++;
    const correct = choiceId === question.correctChoice;
    mark(activeCue!, correct ? 'correct' : 'retry');
    inspector?.record('input', `${choice.label}; ${correct ? 'correct' : 'incorrect'}`);
    if (choice.pitches) {
      const chosenNotes = notes.filter(note => note.id.startsWith(`choice-${choice.id}-`));
      await playPair(chosenNotes, token, false);
    } else await playPair(notes, token, false);
    if (!isCurrent(token)) return;
    await say(correct ? question.successText ?? 'Correct!' : 'Try again.', token);
    if (!(await wait(correct ? lessonPacing.afterCorrectPlacementMs : lessonPacing.afterRetryMs, token))) return;
    if (correct) {
      const answer = { ...intervalAnswerPitch(question), id: 'answer', leftPercent: 64 };
      completed.push({ question, answer });
      activeDistance = question.distance;
      notes = getIntervalAnswerNotes(question, answer);
      currentQuestion = null;
      responseResolve?.(true); responseResolve = null;
    } else {
      mark(activeCue!, 'question');
      await ask(question, token);
    }
  }
  async function replayQuestion(choiceId?: string): Promise<void> {
    if (!currentQuestion || answerLocked || !isPlaying) return;
    const question = currentQuestion;
    const token = sequence;
    const version = ++previewPlaybackSequence;
    questionNarration.submit(); stopVoices();
    const valid = () => version === previewPlaybackSequence && currentQuestion === question && !answerLocked && isPlaying;
    const items = choiceId !== undefined ? notes.filter(note => note.id.startsWith(`choice-${choiceId}-`))
      : question.octave ? notes.filter(note => note.id === 'reference' || note.id === 'octave')
      : notes.filter(note => note.id.startsWith('model-') || (!question.initialNotes?.some(item => item.id.startsWith('model-'))
        && (note.id === 'reference' || note.id === 'answer')));
    await playPair(items, token, false, valid);
    if (isCurrent(token) && valid()) questionNarration.wait();
  }
  async function questionStep(question: IntervalQuestion, token: number, branch: 'normal' | 'retry' | 'correct', introduction?: string): Promise<boolean> {
    if (!isCurrent(token)) return false;
    activeDistance = question.choices ? null : question.distance;
    questionAttempts = 0;
    upperNarration = introduction ?? '';
    const response = new Promise<boolean>(resolve => { responseResolve = resolve; });
    if (branch === 'normal') await ask(question, token, true, introduction);
    else {
      if (!(await wait(0, token))) return false;
      openQuestion(question);
      if (question.choices) {
        const choiceId = branch === 'correct' ? question.correctChoice! : question.choices.find(item => item.id !== question.correctChoice)!.id;
        void submitChoice(choiceId, token);
      } else {
        const answer = intervalAnswerPitch(question);
        const midi = branch === 'correct' ? answer.midi : question.reference.midi + (question.distance === 0 ? 1 : 0);
        void submit(midi, 64, token);
      }
    }
    return await response && isCurrent(token);
  }
  async function run(cueIndex = 0, stepIndex = 0, branch: 'normal' | 'retry' | 'correct' = 'normal'): Promise<void> {
    const token = reset();
    restoreCheckpoint(cueIndex, stepIndex);
    for (let ci = cueIndex; ci < plan.cues.length; ci++) {
      const cue = plan.cues[ci];
      for (let si = ci === cueIndex ? stepIndex : 0; si < cue.steps.length; si++) {
        const step = cue.steps[si];
        if (!isCurrent(token)) return;
        if (step.kind === 'retry' || step.kind === 'correct') continue;
        showDistanceBracket = step.kind === 'say' && step.showDistanceBracket === true;
        mark(cue.id, step.id);
        if (step.kind === 'say') await say(step.text, token);
        if (step.kind === 'setup') setExample(step);
        if (step.kind === 'move') {
          movingFromNotes = notes;
          notes = [notes[0], { ...notes[1], ...step.pitch }];
          if (!(await wait(650, token))) return;
          movingFromNotes = null;
        }
        if (step.kind === 'play') await playPair(getIntervalPlaybackNotes(notes, step.exampleId), token, step.together);
        if (step.kind === 'chart') {
          if (!chartVisible) { chartEntering = true; chartVisible = true; }
          chartLevel = step.distance; activeDistance = step.distance;
          chartDistances = [...new Set([...chartDistances, step.distance])];
          await say(step.text, token);
          if (!(await wait(650, token))) return;
        }
        if (step.kind === 'question') {
          const mode = ci === cueIndex && si === stepIndex ? branch : 'normal';
          if (!(await questionStep(step.question, token, mode, step.introduction))) return;
          if (!(await wait(lessonPacing.betweenPlacementQuestionsMs, token))) return;
        }
        if (step.kind === 'finish') {
          upperNarration = '';
          const finished = await completeLessonExercise({
            isCurrent: () => isCurrent(token), wait: ms => wait(ms, token),
            replay: async () => {
              if (step.replay === 'visible') { await replayVisibleNotes(token); return; }
              for (const entry of completed) {
                notes = getIntervalAnswerNotes(entry.question, entry.answer);
                activeDistance = entry.question.distance;
                await playPair(notes.filter(note => note.id === 'reference' || note.id === 'answer'), token);
                if (!isCurrent(token)) return;
              }
            },
          });
          if (!finished) return;
          narration = '';
          if (step.text) {
            await say(step.text, token);
            if (!(await wait(lessonPacing.afterCelebrationMs, token))) return;
          }
          if (step.exitNotes && !(await slideNotesOut(token))) return;
          inspector?.status('completed'); complete = true;
          onComplete?.(); return;
        }
      }
    }
  }
  function seek(cueId: string, actionId?: string): void {
    const target = getIntervalSeekTarget(plan, cueId, actionId);
    if (!target) return;
    sequenceStarted = true;
    inspector?.resetFrom(cueId);
    void run(target.cueIndex, target.stepIndex, target.branch);
  }
  function ready(): void {
    avatarReady = true;
    chartLevel = plan.initialChart;
    chartDistances = getIntervalCheckpoint(plan, 0, 0).chartDistances;
    chartVisible = plan.initialChartVisible; chartEntering = false;
    chartVersion++;
    unregisterInspector = inspector?.register(plan.cues, (cue, action) => { void seek(cue, action); });
  }
  function updatePointer(event: PointerEvent): void {
    if (!currentQuestion || answerLocked || !isPlaying || !placementLayer
      || (pointerId !== null && pointerId !== event.pointerId)) return;
    const bounds = placementLayer.getBoundingClientRect();
    const placement = snapLessonPlacement(event.clientX - bounds.left, event.clientY - bounds.top,
      bounds.width, bounds.height, columns, rowCount);
    const midi = placement && fullRowData[firstRow + placement.row].midi;
    if (placement && typeof midi === 'number') preview = { midi, leftPercent: placement.leftPercent };
  }
  function beginPointer(event: PointerEvent): void {
    if (event.button !== 0 || pointerId !== null || answerLocked || !isPlaying || !currentQuestion || !placementLayer) return;
    event.preventDefault(); updatePointer(event);
    pointerId = event.pointerId; placementLayer.setPointerCapture(event.pointerId);
  }
  function finishPointer(event: PointerEvent, fromOutside = false): void {
    if ((fromOutside ? pointerId !== null : event.pointerId !== pointerId) || !placementLayer) return;
    updatePointer(event);
    const bounds = placementLayer.getBoundingClientRect();
    const inside = event.clientX >= bounds.left && event.clientX <= bounds.right
      && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
    const answer = preview;
    cancelPointer();
    if (inside && answer) void submit(answer.midi, answer.leftPercent);
  }
  function keyboard(event: KeyboardEvent): void {
    if (!currentQuestion || answerLocked || !isPlaying) return;
    const choice = preview ?? { midi: currentQuestion.reference.midi, leftPercent: 50 };
    const column = Math.round(choice.leftPercent / 100 * columns);
    const midi = event.key === 'ArrowUp' ? Math.min(intervalPitchRange.highMidi, choice.midi + 1)
      : event.key === 'ArrowDown' ? Math.max(intervalPitchRange.lowMidi, choice.midi - 1) : choice.midi;
    const center = event.key === 'Home' ? 1 : event.key === 'End' ? columns - 1
      : event.key === 'ArrowLeft' ? column - 1 : event.key === 'ArrowRight' ? column + 1 : column;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault(); preview = { midi, leftPercent: Math.max(1, Math.min(columns - 1, center)) / columns * 100 };
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); void submit(choice.midi, choice.leftPercent);
    } else if (event.key === 'Escape') cancelPointer();
  }
  $effect(() => {
    clock.setPaused(!isPlaying);
    if (!isPlaying) { previewPlaybackSequence++; stopVoices(); cancelPointer(); }
  });
  $effect(() => audioOutput.setVolume(volume));
  $effect(() => {
    if (avatarReady && !sequenceStarted) {
      sequenceStarted = true;
      untrack(() => { void run(); });
    }
  });
  onDestroy(() => { disposed = true; reset(); unregisterInspector?.(); });
</script>

<div class="interval-scene" style:--lesson-note-size={`${layout.noteDiameter}px`} style:--legend-width={`${cellWidth * legendColumns}px`}
  class:is-paused={!isPlaying}>
  <div class="teacher-column" bind:clientWidth={teacherWidth}>
    <div class="teacher-anchor" style:width={`${teacherWidth}px`}>
      <LessonAvatarDock character="grammy" speechText={narration} upperSpeechText={upperNarration} {underlinedWords} anchoredStage on:ready={ready} />
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users need to scroll the full interval table.) -->
      <div class="reference-chart-position" role="region" aria-label="Interval reference" tabindex="0">
        {#key chartVersion}
          {#if chartVisible}
            <IntervalReferenceChart level={chartLevel} distances={chartDistances} {activeDistance} paused={!isPlaying} enterFromLeft={chartEntering} />
          {/if}
        {/key}
        {#if complete}<p class="completion" role="status">Lesson complete.</p>{/if}
      </div>
    </div>
  </div>
  <div class="grid-column">
    <div class="mlt-lesson-grid-frame interval-grid-frame" bind:clientWidth={frameWidth} bind:clientHeight={frameHeight}>
      <div class="interval-grid-shell" style:width={`${layout.width}px`} style:height={`${layout.height}px`}>
        <div class="interval-grid-field" bind:clientWidth={viewportWidth} bind:clientHeight={viewportHeight}>
          {#if viewportWidth > 0 && viewportHeight > 0}
            <div class="grid-render">
              <PitchGrid mode="singing" {fullRowData} {viewport} {cellWidth} cellHeight={layout.cellHeight}
                {singingConfig} colorMode="color" accidentalMode={{ sharp: true, flat: true }}
                showRightLegend={false} showOctaveLabels={true} showLegendLabels={true} showAccidentalLabels={true}
                showFrequencyLabels={false} legendMidiLabelOverrides={legendLabels}
                {...lessonGridAppearance} showColumnGrid={false} />
            </div>
            <div class="musical-overlay">
              {#if currentQuestion && !currentQuestion.choices}
                <div class="placement-layer" bind:this={placementLayer} role="group" aria-label="Interval placement"
                  use:lessonOutsidePlacement={{
                    enabled: !answerLocked && isPlaying && pointerId === null,
                    questionKey: `${sequence}-${activeCue}`,
                    onMove: updatePointer, onDrop: (event) => finishPointer(event, true),
                    onCancel: () => { if (pointerId === null) preview = null; },
                  }}
                  onpointermove={updatePointer} onpointerup={finishPointer} onpointercancel={cancelPointer}
                  onlostpointercapture={() => { if (pointerId !== null) cancelPointer(); }}
                  onpointerleave={() => { if (pointerId === null) preview = null; }}>
                  <button class="placement-surface" type="button" disabled={answerLocked || !isPlaying}
                    aria-label="Place a note. Use arrow keys for pitch and column, then Enter to place."
                    onpointerdown={beginPointer}
                    onkeydown={keyboard} onfocus={() => { preview ??= { midi: currentQuestion!.reference.midi, leftPercent: 50 }; }}
                    onblur={() => { if (pointerId === null) preview = null; }}
                    onclick={(event) => { if (event.detail === 0 && preview) void submit(preview.midi, preview.leftPercent); }}
                  ></button>
                </div>
              {/if}
              {#each notes as note (note.id)}
                {@const movement = noteMovementOffset(note)}
                {@const exitVersion = noteExitVersion}
                <span class="mlt-lesson-note interval-note" class:is-reference={note.id.endsWith('reference')}
                  class:is-moving={movingFromNotes !== null}
                  use:lessonNoteAppearance={{ audioOutput, cellWidth, frequency: rowByMidi.get(note.midi)?.frequency, noteId: note.id }}
                  use:lessonScreenSlide={{ direction: notesExiting ? 'exit-right' : null,
                    paused: !isPlaying, replayKey: exitVersion, onComplete: () => noteExitFinished(note.id, exitVersion) }}
                  style:top={`${rowCenter(note.midi)}%`} style:left={`${columnCenter(note.leftPercent)}%`}
                  style:color={rowByMidi.get(note.midi)!.hex}
                  style:--interval-move-x={`${movement.x}px`} style:--interval-move-y={`${movement.y}px`}
                  style:margin-left={`${noteMargin(note)}px`} aria-hidden="true">
                  {#if note.id === 'reference' || !coincidentNotes()}
                    <span class="mlt-lesson-note-label">{displayIntervalPitch(note.label)}</span>
                  {/if}
                </span>
              {/each}
              {#if distanceBracket}
                <PitchDistanceBracket {...distanceBracket} />
              {/if}
              {#each octaveSegments as segment}
                <PitchDistanceBracket {...segment} />
              {/each}
              {#if currentQuestion?.initialNotes?.some(note => note.id.startsWith('model-'))}
                <span class="example-label" style:left="27%">Model</span>
                <span class="example-label" style:left="72%">New reference</span>
              {/if}
              {#each currentQuestion?.choices ?? [] as choice}
                {#if choice.pitches}
                  {@const pairNotes = notes.filter(note => note.id.startsWith(`choice-${choice.id}-`))}
                  {#if pairNotes.length}
                    <span class="example-label" style:left={`${columnCenter(pairNotes[0].leftPercent)}%`}>Pair {String.fromCharCode(65 + Number(choice.id))}</span>
                  {/if}
                {/if}
              {/each}
              {#if preview && !answerLocked}
                <span class="mlt-lesson-note mlt-lesson-note--preview interval-note"
                  use:lessonNoteAppearance={{ audioOutput, cellWidth, frequency: rowByMidi.get(preview.midi)?.frequency }}
                  style:top={`${rowCenter(preview.midi)}%`} style:left={`${preview.leftPercent}%`}
                  style:color={rowByMidi.get(preview.midi)!.hex} aria-hidden="true"></span>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </div>
    {#if currentQuestion?.choices}
      <div class="interval-choices" role="group" aria-label="Choose an interval answer">
        {#each currentQuestion.choices as choice (choice.id)}
          <div class="interval-choice">
            <button type="button" disabled={answerLocked || !isPlaying} onclick={() => { void submitChoice(choice.id); }}>{choice.label}</button>
            {#if choice.pitches}
              <button type="button" class="replay-button" disabled={answerLocked || !isPlaying}
                aria-label={`Hear ${choice.label}`} onclick={() => { void replayQuestion(choice.id); }}>Hear pair</button>
            {/if}
          </div>
        {/each}
        {#if !currentQuestion.choices.some(choice => choice.pitches)}
          <button type="button" class="replay-button" disabled={answerLocked || !isPlaying}
            onclick={() => { void replayQuestion(); }}>Hear interval</button>
        {/if}
      </div>
    {:else if currentQuestion}
      <p class="placement-hint">Choose a pitch in any column. Arrow keys also work; press Enter to place.</p>
      {#if currentQuestion.initialNotes && currentQuestion.initialNotes.length > 1}
        <button type="button" class="replay-button" disabled={answerLocked || !isPlaying}
          onclick={() => { void replayQuestion(); }}>{currentQuestion.octave ? 'Hear octave' : currentQuestion.initialNotes.some(note => note.id.startsWith('model-')) ? 'Hear model' : 'Hear current interval'}</button>
      {/if}
    {/if}
  </div>
</div>

<style>
  .interval-scene { display: grid; grid-template-columns: minmax(16rem, 18rem) minmax(0, 1fr); gap: 1.25rem; align-items: start; }
  .teacher-column { min-width: 0; }
  /* Only the avatar stage determines the anchor height. Speech and the chart
     sit outside its flow, so neither can move Grammy away from screen center. */
  .teacher-anchor { position: fixed; top: 50dvh; transform: translateY(-50%); pointer-events: none; }
  .reference-chart-position { position: absolute; top: calc(100% + 1rem); left: 0; width: 100%;
    max-height: max(8rem, calc(50dvh - 8rem)); overflow-y: auto; pointer-events: auto; overscroll-behavior: contain; }
  .reference-chart-position:focus-visible { outline: 2px solid #3d79aa; outline-offset: 3px; }
  .interval-choices { display: flex; flex-wrap: wrap; gap: 0.65rem; margin-top: 0.75rem; }
  .interval-choice { display: grid; gap: 0.3rem; }
  .interval-choice button, .replay-button { padding: 0.55rem 0.75rem; border: 1px solid #a39073; border-radius: 12px;
    background: #fff8db; color: #29251f; font: inherit; cursor: pointer; }
  .interval-choice button:focus-visible, .replay-button:focus-visible { outline: 3px solid #3d79aa; outline-offset: 2px; }
  .interval-choice button:disabled, .replay-button:disabled { opacity: 0.65; cursor: default; }
  .replay-button { font-size: 0.85rem; }
  .example-label { position: absolute; bottom: 0.4rem; transform: translateX(-50%); font-size: 0.75rem; color: #475048; white-space: nowrap; }
  .grid-column { min-width: 0; }
  .interval-grid-frame { width: 100%; height: clamp(26rem, calc(100svh - 13rem), 42rem); }
  .interval-grid-shell { flex-shrink: 0; }
  .interval-grid-field { position: relative; width: 100%; height: 100%; border-radius: 22px; outline: 1px solid rgba(102, 75, 40, 0.18); outline-offset: -1px;
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.84), rgba(248, 241, 229, 0.86)); box-shadow: var(--amt-shadow); }
  .grid-render { position: absolute; inset: 0; overflow: hidden; border-radius: 22px; }
  .musical-overlay { position: absolute; inset: 0 0 0 var(--legend-width); pointer-events: none; }
  .placement-layer { position: absolute; inset: 0; pointer-events: auto; }
  .placement-surface { position: absolute; inset: 0; width: 100%; height: 100%; padding: 0; border: 0; background: transparent; cursor: crosshair; touch-action: none; }
  .placement-surface:focus-visible { outline: 3px solid #3d79aa; outline-offset: -3px; }
  .placement-surface:disabled { cursor: default; }
  .interval-note { position: absolute; width: var(--lesson-note-size); height: var(--lesson-note-size); display: grid; place-items: center; transform: translate(-50%, -50%); pointer-events: none; }
  .interval-note.is-moving { animation: interval-move 650ms ease-in-out both; }
  .is-paused .interval-note.is-moving { animation-play-state: paused; }
  @keyframes interval-move {
    from { translate: var(--interval-move-x) var(--interval-move-y); }
    to { translate: 0 0; }
  }
  .placement-hint, .completion { color: var(--amt-muted); font-size: 0.9rem; line-height: 1.4; }
  @media (max-width: 980px) {
    .interval-scene { grid-template-columns: clamp(7rem, 28vw, 18rem) minmax(0, 1fr); gap: 0.75rem; }
    .interval-grid-frame { height: clamp(22rem, 58svh, 34rem); }
  }
  @media (prefers-reduced-motion: reduce) { .interval-note.is-moving { animation: none; } }
</style>
