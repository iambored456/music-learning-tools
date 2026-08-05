<script lang="ts">
  import { fullRowData } from '@mlt/pitch-data';
  import { PitchGrid } from '@mlt/ui-components/canvas';
  import type {
    PitchGridViewport,
    PitchRowHighlightConfig,
    SingingModeConfig,
  } from '@mlt/ui-components/canvas';
  import { onDestroy } from 'svelte';
  import LessonAvatarDock from './LessonAvatarDock.svelte';
  import { cancelLessonAvatarSpeech, speakWithLessonAvatar } from './lessonAvatar';
  import type { LessonSection } from './lessons';

  type Props = {
    section: LessonSection;
    isPlaying?: boolean;
    volume?: number;
    onComplete?: () => void;
  };

  type GridKind = 'letter-seven' | 'natural-a' | 'natural-c' | 'chromatic-a' | 'practice';
  type InteractionKind = 'none' | 'placement' | 'choice' | 'note-choice';
  type DirectionArrow = 'lower' | 'higher' | null;

  type ChoiceOption = {
    label: string;
    spokenLabel?: string;
    toneNote?: string;
    correct: boolean;
  };

  type ChoiceGridPlacement = {
    leftPercent: number;
    referenceToneNote: string;
    referenceLabel: string;
  };

  type DisplayNote = {
    id: string;
    toneNote: string;
    label: string;
    leftPercent: number;
    clickable?: boolean;
  };

  type PracticeQuestion = {
    toneNote: string;
    prompt: string;
    spokenPrompt: string;
    revealLabel: string;
  };

  type ActiveVoice = {
    oscillator: OscillatorNode;
    gain: GainNode;
  };

  let {
    section,
    isPlaying = true,
    volume = 72,
    onComplete,
  }: Props = $props();

  const pitchRows = fullRowData;
  const sourceRowByTone = new Map(pitchRows.map((row) => [row.toneNote, row]));
  const singingConfig: SingingModeConfig = { pitchHistory: [] };
  const gridColumnCount = 28;
  const legendWidthUnits = 6;
  const fallbackCellSize = 18;

  function selectPitchRows(minMidi: number, maxMidi: number) {
    return pitchRows.filter((row) => {
      const midi = row.midi;
      return (
        typeof midi === 'number' &&
        midi >= minMidi &&
        midi <= maxMidi
      );
    });
  }

  const rowsByGridKind = {
    'letter-seven': selectPitchRows(57, 67),
    'natural-a': selectPitchRows(57, 69),
    'natural-c': selectPitchRows(60, 84),
    'chromatic-a': selectPitchRows(57, 69),
    practice: selectPitchRows(60, 74),
  } satisfies Record<GridKind, ReturnType<typeof selectPitchRows>>;

  const naturalLetterLegend = new Map<number, string>([
    [0, 'C'],
    [2, 'D'],
    [4, 'E'],
    [5, 'F'],
    [7, 'G'],
    [9, 'A'],
    [11, 'B'],
  ]);

  const naturalPlacementQuestions: PracticeQuestion[] = [
    {
      toneNote: 'D4',
      prompt: 'Place a D on the grid.',
      spokenPrompt: 'Place a D on the grid.',
      revealLabel: 'D',
    },
    {
      toneNote: 'F4',
      prompt: 'Place an F on the grid.',
      spokenPrompt: 'Place an F on the grid.',
      revealLabel: 'F',
    },
    {
      toneNote: 'B3',
      prompt: 'Place a B on the grid.',
      spokenPrompt: 'Place a B on the grid.',
      revealLabel: 'B',
    },
  ];

  const combinedPracticeQuestions: PracticeQuestion[] = [
    {
      toneNote: 'Db4',
      prompt: 'Place D♭4 / C♯4 on the grid.',
      spokenPrompt: 'Place D flat 4, or C sharp 4, on the grid.',
      revealLabel: 'D♭4 / C♯4',
    },
    {
      toneNote: 'Gb4',
      prompt: 'Place G♭4 / F♯4 on the grid.',
      spokenPrompt: 'Place G flat 4, or F sharp 4, on the grid.',
      revealLabel: 'G♭4 / F♯4',
    },
    {
      toneNote: 'Bb4',
      prompt: 'Place B♭4 / A♯4 on the grid.',
      spokenPrompt: 'Place B flat 4, or A sharp 4, on the grid.',
      revealLabel: 'B♭4 / A♯4',
    },
  ];

  const flatPracticeQuestions: PracticeQuestion[] = [
    {
      toneNote: 'Eb4',
      prompt: 'Place E♭4 on the grid.',
      spokenPrompt: 'Place E flat 4 on the grid.',
      revealLabel: 'E♭4',
    },
    {
      toneNote: 'Ab4',
      prompt: 'Place A♭4 on the grid.',
      spokenPrompt: 'Place A flat 4 on the grid.',
      revealLabel: 'A♭4',
    },
    {
      toneNote: 'Db5',
      prompt: 'Place D♭5 on the grid.',
      spokenPrompt: 'Place D flat 5 on the grid.',
      revealLabel: 'D♭5',
    },
  ];

  const sharpPracticeQuestions: PracticeQuestion[] = [
    {
      toneNote: 'Db4',
      prompt: 'Place C♯4 on the grid.',
      spokenPrompt: 'Place C sharp 4 on the grid.',
      revealLabel: 'C♯4',
    },
    {
      toneNote: 'Gb4',
      prompt: 'Place F♯4 on the grid.',
      spokenPrompt: 'Place F sharp 4 on the grid.',
      revealLabel: 'F♯4',
    },
    {
      toneNote: 'Ab4',
      prompt: 'Place G♯4 on the grid.',
      spokenPrompt: 'Place G sharp 4 on the grid.',
      revealLabel: 'G♯4',
    },
  ];

  let gridKind = $state<GridKind>('natural-a');
  let letterRangeMaxMidi = $state(67);
  let letterLayoutMaxMidi = $state(72);
  let letterLegendOnly = $state(true);
  let visibleLetterPitchClasses = $state<Set<number> | null>(null);
  let accidentalMode = $state({ sharp: false, flat: false });
  let frameWidth = $state(0);
  let frameHeight = $state(0);
  let viewportWidth = $state(0);
  let viewportHeight = $state(0);
  let avatarReady = $state(false);
  let sequenceStarted = $state(false);
  let narrationText = $state('');
  let interaction = $state<InteractionKind>('none');
  let answerLocked = $state(true);
  let choiceOptions = $state<ChoiceOption[]>([]);
  let choiceSuccessText = $state('Correct!');
  let selectedChoiceLabel = $state<string | null>(null);
  let choiceFeedbackState = $state<'correct' | 'incorrect' | null>(null);
  let choiceGridPlacement = $state<ChoiceGridPlacement | null>(null);
  let transientChoiceNote = $state<DisplayNote | null>(null);
  let activePromptText = $state('');
  let activePromptSpoken = $state('');
  let placementTargetTone = $state<string | null>(null);
  let placementRevealLabel = $state('');
  let placementLeftPercent = $state(48);
  let placementBaseNotes = $state<DisplayNote[]>([]);
  let noteChoiceTargetTone = $state<string | null>(null);
  let noteChoiceLabels = $state(new Map<string, string>());
  let displayNotes = $state<DisplayNote[]>([]);
  let questionNote = $state<DisplayNote | null>(null);
  let placementPreviewTone = $state<string | null>(null);
  let activeToneNote = $state<string | null>(null);
  let feedbackState = $state<'success' | 'error' | null>(null);
  let legendSpotlight = $state(false);
  let highlightedRowMidis = $state<number[]>([]);
  let legendMidiLabelOverrides = $state(new Map<number, string>());
  let showOctaveBracket = $state(false);
  let directionArrow = $state<DirectionArrow>(null);
  let responseResolve: (() => void) | null = null;
  let sequenceToken = 0;
  let audioContext: AudioContext | null = null;
  let activeVoice: ActiveVoice | null = null;

  const displayRows = $derived(
    gridKind === 'letter-seven'
      ? selectPitchRows(57, letterRangeMaxMidi)
      : rowsByGridKind[gridKind],
  );
  const displayRowCount = $derived(Math.max(1, displayRows.length));
  const layoutRowCount = $derived(
    gridKind === 'letter-seven'
      ? selectPitchRows(57, letterLayoutMaxMidi).length
      : displayRowCount,
  );
  const layoutGridColumnCount = $derived(
    frameWidth > 0 && frameWidth <= 720 ? 20 : gridColumnCount,
  );
  const layoutCellSize = $derived(
    frameWidth > 0 && frameHeight > 0
      ? Math.max(
          1,
          Math.min(
            frameHeight / (layoutRowCount + 1),
            frameWidth / (layoutGridColumnCount + legendWidthUnits),
          ),
        )
      : fallbackCellSize,
  );
  const shellWidth = $derived(layoutCellSize * (layoutGridColumnCount + legendWidthUnits));
  const shellHeight = $derived(layoutCellSize * (displayRowCount + 1));
  const cellWidth = $derived(layoutCellSize);
  const cellHeight = $derived(
    layoutCellSize * 2,
  );
  const legendWidth = $derived(cellWidth * legendWidthUnits);
  const noteSize = $derived(Math.max(38, Math.min(64, cellHeight * 0.94)));
  const hasCurrentPlacementNote = $derived(
    displayNotes.some((note) => note.id === 'placement-current'),
  );
  const pitchGridViewport = $derived<PitchGridViewport>({
    startRow: 0,
    endRow: displayRowCount - 1,
    zoomLevel: 1,
    containerWidth: viewportWidth,
    containerHeight: viewportHeight,
  });
  const legendLabelOverrides = $derived.by(() => {
    if (!letterLegendOnly) return undefined;
    if (visibleLetterPitchClasses === null) return naturalLetterLegend;

    const overrides = new Map<number, string>();
    for (const [pitchClass, label] of naturalLetterLegend) {
      overrides.set(
        pitchClass,
        visibleLetterPitchClasses.has(pitchClass) ? label : '',
      );
    }
    return overrides;
  });
  const rowHighlight = $derived<PitchRowHighlightConfig | undefined>(
    highlightedRowMidis.length > 0
      ? highlightedRowMidis.map((midi) => ({
          midi,
          opacity: 0.24,
          glow: 0.72,
          pulse: true,
          heightScale: 0.82,
        }))
      : undefined,
  );
  const underlinedWords = $derived(
    narrationText.includes('octave')
      ? ['octave']
      : narrationText.includes('flat')
        ? ['flat']
        : narrationText.includes('sharp')
          ? ['sharp']
          : [],
  );

  function displayRowIndex(toneNote: string): number {
    return displayRows.findIndex((row) => row.toneNote === toneNote);
  }

  function rowCenter(toneNote: string): number {
    const rowIndex = displayRowIndex(toneNote);
    return rowIndex < 0 ? -100 : ((rowIndex + 1) / (displayRowCount + 1)) * 100;
  }

  function isCurrentSequence(token: number): boolean {
    return token === sequenceToken;
  }

  function rawDelay(durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, durationMs);
    });
  }

  async function waitMs(durationMs: number, token: number): Promise<boolean> {
    let remainingMs = Math.max(0, durationMs);
    while (remainingMs > 0 && isCurrentSequence(token)) {
      if (!isPlaying) {
        await rawDelay(50);
        continue;
      }
      const chunk = Math.min(remainingMs, 50);
      await rawDelay(chunk);
      remainingMs -= chunk;
    }
    return isCurrentSequence(token);
  }

  async function waitForPlayback(token: number): Promise<boolean> {
    while (!isPlaying && isCurrentSequence(token)) {
      await rawDelay(50);
    }
    return isCurrentSequence(token);
  }

  function stopVoice(): void {
    if (!activeVoice) return;
    try {
      activeVoice.oscillator.stop();
    } catch {
      // The oscillator may already have stopped naturally.
    }
    activeVoice.oscillator.disconnect();
    activeVoice.gain.disconnect();
    activeVoice = null;
    activeToneNote = null;
  }

  async function ensureAudioContext(): Promise<AudioContext | null> {
    if (typeof window === 'undefined') return null;
    audioContext ??= new AudioContext();
    if (audioContext.state === 'suspended') {
      await audioContext.resume().catch(() => {});
    }
    return audioContext.state === 'running' ? audioContext : null;
  }

  async function playTone(toneNote: string, token: number, durationMs = 430): Promise<void> {
    if (!(await waitForPlayback(token))) return;
    const row = sourceRowByTone.get(toneNote);
    if (!row || typeof row.frequency !== 'number') return;
    const context = await ensureAudioContext();
    if (!context || !isCurrentSequence(token)) return;

    stopVoice();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const end = now + durationMs / 1000;
    const peak = Math.max(0.0001, Math.min(0.24, (volume / 100) * 0.2));
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(row.frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.025);
    gain.gain.setValueAtTime(peak, Math.max(now + 0.03, end - 0.08));
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(gain);
    gain.connect(context.destination);
    activeVoice = { oscillator, gain };
    activeToneNote = toneNote;
    oscillator.start(now);
    oscillator.stop(end + 0.02);
    await waitMs(durationMs, token);
    if (activeVoice?.oscillator === oscillator) stopVoice();
  }

  async function playSequence(toneNotes: readonly string[], token: number): Promise<void> {
    for (const toneNote of toneNotes) {
      if (!isCurrentSequence(token)) return;
      await playTone(toneNote, token);
      if (!(await waitMs(130, token))) return;
    }
  }

  async function say(text: string, spokenText: string, token: number): Promise<void> {
    narrationText = text;
    if (!avatarReady || !isCurrentSequence(token)) return;
    await speakWithLessonAvatar(spokenText, {
      lang: 'en-CA',
      rate: 0.92,
      chunking: 'sentence',
    }).catch(() => {});
  }

  function waitForResponse(): Promise<void> {
    return new Promise((resolve) => {
      responseResolve = resolve;
    });
  }

  function resolveResponse(): void {
    const resolve = responseResolve;
    responseResolve = null;
    resolve?.();
  }

  function setDisplayNotes(
    notes: Array<{ toneNote: string; label?: string; leftPercent?: number; clickable?: boolean }>,
  ): void {
    displayNotes = notes.map((note, index) => ({
      id: `${note.toneNote}-${index}`,
      toneNote: note.toneNote,
      label: note.label ?? '',
      leftPercent: note.leftPercent ?? 55,
      clickable: note.clickable,
    }));
  }

  async function repeatPrompt(token: number): Promise<void> {
    await say(activePromptText, activePromptSpoken, token);
  }

  async function askChoice(
    prompt: string,
    spokenPrompt: string,
    options: ChoiceOption[],
    token: number,
    successText = 'Correct!',
    gridPlacement: ChoiceGridPlacement | null = null,
  ): Promise<void> {
    interaction = 'choice';
    choiceOptions = options;
    choiceSuccessText = successText;
    choiceGridPlacement = gridPlacement;
    selectedChoiceLabel = null;
    choiceFeedbackState = null;
    transientChoiceNote = null;
    activePromptText = prompt;
    activePromptSpoken = spokenPrompt;
    answerLocked = true;
    feedbackState = null;
    await say(prompt, spokenPrompt, token);
    if (!isCurrentSequence(token)) return;
    answerLocked = false;
    await waitForResponse();
    if (!isCurrentSequence(token)) return;
    interaction = 'none';
    choiceOptions = [];
    choiceGridPlacement = null;
    selectedChoiceLabel = null;
    choiceFeedbackState = null;
    transientChoiceNote = null;
    feedbackState = null;
    await waitMs(280, token);
  }

  async function askPlacement(
    question: PracticeQuestion,
    token: number,
    options: { accumulate?: boolean; leftPercent?: number } = {},
  ): Promise<void> {
    interaction = 'placement';
    placementTargetTone = question.toneNote;
    placementRevealLabel = question.revealLabel;
    placementLeftPercent = options.leftPercent ?? 48;
    activePromptText = question.prompt;
    activePromptSpoken = question.spokenPrompt;
    placementBaseNotes = options.accumulate
      ? displayNotes.map((note, index) => ({ ...note, id: `confirmed-${index}-${note.toneNote}` }))
      : [];
    displayNotes = [...placementBaseNotes];
    placementPreviewTone = null;
    feedbackState = null;
    const response = waitForResponse();
    answerLocked = false;
    void say(question.prompt, question.spokenPrompt, token);
    await response;
    if (!isCurrentSequence(token)) return;
    interaction = 'none';
    placementTargetTone = null;
    feedbackState = null;
    await waitMs(300, token);
  }

  async function askNoteChoice(
    prompt: string,
    spokenPrompt: string,
    toneNotes: readonly string[],
    correctToneNote: string,
    labels: ReadonlyMap<string, string>,
    token: number,
  ): Promise<void> {
    interaction = 'note-choice';
    noteChoiceTargetTone = correctToneNote;
    noteChoiceLabels = new Map(labels);
    activePromptText = prompt;
    activePromptSpoken = spokenPrompt;
    setDisplayNotes(toneNotes.map((toneNote) => ({ toneNote, clickable: true })));
    answerLocked = true;
    feedbackState = null;
    await say(prompt, spokenPrompt, token);
    if (!isCurrentSequence(token)) return;
    answerLocked = false;
    await waitForResponse();
    if (!isCurrentSequence(token)) return;
    interaction = 'none';
    noteChoiceTargetTone = null;
    displayNotes = displayNotes.map((note) => ({ ...note, clickable: false }));
    feedbackState = null;
    await waitMs(320, token);
  }

  async function handleChoice(option: ChoiceOption): Promise<void> {
    if (interaction !== 'choice' || answerLocked || !isPlaying) return;
    const token = sequenceToken;
    answerLocked = true;
    selectedChoiceLabel = option.label;
    if (!option.correct) {
      choiceFeedbackState = 'incorrect';
      feedbackState = 'error';
      if (choiceGridPlacement && option.toneNote) {
        transientChoiceNote = {
          id: `incorrect-${option.toneNote}`,
          toneNote: option.toneNote,
          label: option.label,
          leftPercent: choiceGridPlacement.leftPercent,
        };
        await playTone(option.toneNote, token, 360);
        if (!isCurrentSequence(token)) return;
      }
      await say('Try again.', 'Try again.', token);
      if (!(await waitMs(420, token))) return;
      transientChoiceNote = null;
      selectedChoiceLabel = null;
      choiceFeedbackState = null;
      feedbackState = null;
      await repeatPrompt(token);
      if (isCurrentSequence(token)) answerLocked = false;
      return;
    }

    choiceFeedbackState = 'correct';
    feedbackState = 'success';
    if (choiceGridPlacement && option.toneNote) {
      const answerIndex = displayNotes.length;
      displayNotes = [
        ...displayNotes,
        {
          id: `choice-reference-${answerIndex}`,
          toneNote: choiceGridPlacement.referenceToneNote,
          label: choiceGridPlacement.referenceLabel,
          leftPercent: choiceGridPlacement.leftPercent,
        },
        {
          id: `choice-answer-${answerIndex}`,
          toneNote: option.toneNote,
          label: option.label,
          leftPercent: choiceGridPlacement.leftPercent,
        },
      ];
      questionNote = null;
      await playTone(option.toneNote, token, 360);
      if (!isCurrentSequence(token)) return;
    }
    await say(choiceSuccessText, choiceSuccessText, token);
    if (!(await waitMs(520, token))) return;
    resolveResponse();
  }

  async function handleRowChoice(toneNote: string): Promise<void> {
    if (interaction !== 'placement' || answerLocked || !isPlaying || !placementTargetTone) return;
    const token = sequenceToken;
    answerLocked = true;
    placementPreviewTone = null;
    displayNotes = [
      ...placementBaseNotes,
      {
        id: 'placement-current',
        toneNote,
        label: placementRevealLabel,
        leftPercent: placementLeftPercent,
      },
    ];
    await playTone(toneNote, token);
    if (!isCurrentSequence(token)) return;

    if (toneNote !== placementTargetTone) {
      feedbackState = 'error';
      await say('Try again.', 'Try again.', token);
      if (!(await waitMs(420, token))) return;
      displayNotes = [...placementBaseNotes];
      feedbackState = null;
      await repeatPrompt(token);
      if (isCurrentSequence(token)) answerLocked = false;
      return;
    }

    feedbackState = 'success';
    await say('Correct!', 'Correct!', token);
    if (!isCurrentSequence(token)) return;
    if (!(await waitMs(780, token))) return;
    resolveResponse();
  }

  async function handleNoteChoice(toneNote: string): Promise<void> {
    if (interaction !== 'note-choice' || answerLocked || !isPlaying || !noteChoiceTargetTone) return;
    const token = sequenceToken;
    answerLocked = true;
    await playTone(toneNote, token);
    if (!isCurrentSequence(token)) return;

    if (toneNote !== noteChoiceTargetTone) {
      feedbackState = 'error';
      await say('Try again.', 'Try again.', token);
      if (!isCurrentSequence(token)) return;
      await playSequence(displayNotes.map((note) => note.toneNote), token);
      if (!(await waitMs(300, token))) return;
      feedbackState = null;
      await repeatPrompt(token);
      if (isCurrentSequence(token)) answerLocked = false;
      return;
    }

    feedbackState = 'success';
    await say('Correct!', 'Correct!', token);
    if (!isCurrentSequence(token)) return;
    displayNotes = displayNotes.map((note) => ({
      ...note,
      label: noteChoiceLabels.get(note.toneNote) ?? '',
    }));
    if (!(await waitMs(760, token))) return;
    resolveResponse();
  }

  function showPlacementPreview(toneNote: string): void {
    if (interaction !== 'placement' || answerLocked || !isPlaying) return;
    placementPreviewTone = toneNote;
  }

  function hidePlacementPreview(toneNote: string): void {
    if (placementPreviewTone === toneNote) placementPreviewTone = null;
  }

  async function finishSection(token: number): Promise<void> {
    interaction = 'none';
    answerLocked = true;
    await say('Bravo!', 'Bravo!', token);
    if (!(await waitMs(450, token))) return;
    onComplete?.();
  }

  async function runLetterNames(token: number): Promise<void> {
    gridKind = 'letter-seven';
    letterRangeMaxMidi = 67;
    letterLayoutMaxMidi = 72;
    letterLegendOnly = true;
    visibleLetterPitchClasses = new Set();
    accidentalMode = { sharp: false, flat: false };
    legendSpotlight = false;
    await say(
      'In Western music, pitches are named using the first seven letters of the alphabet: A through G.',
      'In Western music, pitches are named using the first seven letters of the alphabet: A through G.',
      token,
    );
    if (!isCurrentSequence(token)) return;
    legendSpotlight = true;
    await say(
      'The legend on the left shows those letter names.',
      'The legend on the left shows those letter names.',
      token,
    );
    if (!isCurrentSequence(token)) return;

    for (const toneNote of ['A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4']) {
      const pitchClass = sourceRowByTone.get(toneNote)?.pitchClass;
      if (typeof pitchClass === 'number') {
        visibleLetterPitchClasses = new Set([
          ...(visibleLetterPitchClasses ?? []),
          pitchClass,
        ]);
      }
      await playTone(toneNote, token, 360);
      if (!(await waitMs(90, token))) return;
    }
    if (!(await waitMs(300, token))) return;
    legendSpotlight = false;

    for (const [index, question] of naturalPlacementQuestions.entries()) {
      await askPlacement(question, token, {
        accumulate: true,
        leftPercent: 26 + index * 18,
      });
      if (!isCurrentSequence(token)) return;
    }

    interaction = 'none';
    answerLocked = true;
    if (!(await waitMs(320, token))) return;
    onComplete?.();
  }

  async function runLetterCycle(token: number): Promise<void> {
    gridKind = 'letter-seven';
    letterRangeMaxMidi = 67;
    letterLayoutMaxMidi = 72;
    letterLegendOnly = true;
    visibleLetterPitchClasses = null;
    accidentalMode = { sharp: false, flat: false };
    displayNotes = [];
    questionNote = {
      id: 'question-A3',
      toneNote: 'A3',
      label: 'A',
      leftPercent: 26,
    };

    const expansionNarration = say(
      'After that, we start over and repeat the letters A through G.',
      'After that, we start over and repeat the letters A through G.',
      token,
    );
    if (!(await waitMs(420, token))) return;
    for (const maxMidi of [68, 69]) {
      letterRangeMaxMidi = maxMidi;
      if (!(await waitMs(240, token))) return;
    }
    await expansionNarration;
    if (!isCurrentSequence(token)) return;
    await askChoice(
      'What is above A?',
      'What is above A?',
      [
        { label: 'G', toneNote: 'G4', correct: false },
        { label: 'B', toneNote: 'B3', correct: true },
      ],
      token,
      'Correct!',
      {
        leftPercent: 26,
        referenceToneNote: 'A3',
        referenceLabel: 'A',
      },
    );
    if (!isCurrentSequence(token)) return;
    questionNote = {
      id: 'question-E4',
      toneNote: 'E4',
      label: 'E',
      leftPercent: 44,
    };
    await askChoice(
      'What is above E?',
      'What is above E?',
      [
        { label: 'F', toneNote: 'F4', correct: true },
        { label: 'G', toneNote: 'G4', correct: false },
      ],
      token,
      'Correct!',
      {
        leftPercent: 44,
        referenceToneNote: 'E4',
        referenceLabel: 'E',
      },
    );
    if (!isCurrentSequence(token)) return;
    questionNote = {
      id: 'question-G4',
      toneNote: 'G4',
      label: 'G',
      leftPercent: 62,
    };
    await askChoice(
      'What is above G?',
      'What is above G?',
      [
        { label: 'A', toneNote: 'A4', correct: true },
        { label: 'H', correct: false },
      ],
      token,
      'Correct! Above G, the letter names begin again at A.',
      {
        leftPercent: 62,
        referenceToneNote: 'G4',
        referenceLabel: 'G',
      },
    );
    if (!isCurrentSequence(token)) return;
    interaction = 'none';
    answerLocked = true;
    if (!(await waitMs(220, token))) return;
    onComplete?.();
  }

  async function runOctaves(token: number): Promise<void> {
    gridKind = 'natural-a';
    letterLegendOnly = true;
    visibleLetterPitchClasses = null;
    accidentalMode = { sharp: false, flat: false };
    legendMidiLabelOverrides = new Map();
    setDisplayNotes([
      { toneNote: 'A3' },
      { toneNote: 'A4' },
    ]);
    await say('Listen to these two pitches.', 'Listen to these two pitches.', token);
    if (!isCurrentSequence(token)) return;
    await playSequence(['A3', 'A4'], token);
    if (!isCurrentSequence(token)) return;
    await say(
      'These pitches have the same letter name, but one is higher than the other.',
      'These pitches have the same letter name, but one is higher than the other.',
      token,
    );
    if (!isCurrentSequence(token)) return;
    showOctaveBracket = true;
    await say(
      'The distance from one A to the next A is called an octave.',
      'The distance from one A to the next A is called an octave.',
      token,
    );
    if (!isCurrentSequence(token)) return;
    await askNoteChoice(
      'Which pitch is higher?',
      'Which pitch is higher?',
      ['A3', 'A4'],
      'A4',
      new Map([
        ['A3', ''],
        ['A4', ''],
      ]),
      token,
    );
    if (!isCurrentSequence(token)) return;
    await askChoice(
      'Do these pitches have the same letter name?',
      'Do these pitches have the same letter name?',
      [
        { label: 'Yes', correct: true },
        { label: 'No', correct: false },
      ],
      token,
    );
    if (!isCurrentSequence(token)) return;
    displayNotes = displayNotes.map((note) => ({ ...note, label: 'A' }));

    await say(
      'Because letter names repeat, we add a number to identify the exact pitch.',
      'Because letter names repeat, we add a number to identify the exact pitch.',
      token,
    );
    if (!isCurrentSequence(token)) return;
    legendMidiLabelOverrides = new Map([[57, 'A3']]);
    displayNotes = displayNotes.map((note) => ({
      ...note,
      label: note.toneNote === 'A3' ? 'A3' : 'A',
    }));
    await say('The lower pitch is A3.', 'The lower pitch is A 3.', token);
    if (!isCurrentSequence(token)) return;
    legendMidiLabelOverrides = new Map([
      [57, 'A3'],
      [69, 'A4'],
    ]);
    displayNotes = displayNotes.map((note) => ({
      ...note,
      label: note.toneNote === 'A4' ? 'A4' : note.label,
    }));
    await say('The higher pitch is A4.', 'The higher pitch is A 4.', token);
    if (!isCurrentSequence(token)) return;
    await say(
      'When a letter name repeats, the octave number tells us which pitch we mean.',
      'When a letter name repeats, the octave number tells us which pitch we mean.',
      token,
    );
    if (!(await waitMs(420, token))) return;
    await finishSection(token);
  }

  async function runOctaveNumbers(token: number): Promise<void> {
    gridKind = 'letter-seven';
    letterRangeMaxMidi = 69;
    letterLayoutMaxMidi = 84;
    letterLegendOnly = false;
    visibleLetterPitchClasses = null;
    accidentalMode = { sharp: false, flat: false };
    legendMidiLabelOverrides = new Map();
    showOctaveBracket = false;
    displayNotes = [];
    const rangeNarration = say(
      'Each numbered octave begins on C and ends on B.',
      'Each numbered octave begins on C and ends on B.',
      token,
    );
    if (!(await waitMs(260, token))) return;
    for (let maxMidi = 70; maxMidi <= 84; maxMidi += 1) {
      letterRangeMaxMidi = maxMidi;
      if (!(await waitMs(85, token))) return;
    }
    await rangeNarration;
    if (!isCurrentSequence(token)) return;
    setDisplayNotes([
      { toneNote: 'A4', label: 'A4', leftPercent: 30 },
      { toneNote: 'B4', label: 'B4', leftPercent: 46 },
      { toneNote: 'C5', label: 'C5', leftPercent: 62 },
    ]);
    await playSequence(['A4', 'B4', 'C5'], token);
    if (!isCurrentSequence(token)) return;
    await say(
      'Notice that the octave number changes when we move from B to C.',
      'Notice that the octave number changes when we move from B to C.',
      token,
    );
    if (!isCurrentSequence(token)) return;

    await askNoteChoice(
      'Which pitch is higher?',
      'Which pitch is higher?',
      ['A4', 'A5'],
      'A5',
      new Map([
        ['A4', 'A4'],
        ['A5', 'A5'],
      ]),
      token,
    );
    if (!isCurrentSequence(token)) return;
    await askNoteChoice(
      'Which pitch is lower?',
      'Which pitch is lower?',
      ['E4', 'E5'],
      'E4',
      new Map([
        ['E4', 'E4'],
        ['E5', 'E5'],
      ]),
      token,
    );
    if (!isCurrentSequence(token)) return;
    await askChoice(
      'What comes after B4?',
      'What comes after B 4?',
      [
        { label: 'C4', spokenLabel: 'C 4', correct: false },
        { label: 'C5', spokenLabel: 'C 5', correct: true },
      ],
      token,
    );
    if (!isCurrentSequence(token)) return;
    await askChoice(
      'What comes after G4?',
      'What comes after G 4?',
      [
        { label: 'A4', spokenLabel: 'A 4', correct: true },
        { label: 'A5', spokenLabel: 'A 5', correct: false },
      ],
      token,
    );
    if (!isCurrentSequence(token)) return;
    await askChoice(
      'What comes after B5?',
      'What comes after B 5?',
      [
        { label: 'C6', spokenLabel: 'C 6', correct: true },
        { label: 'C5', spokenLabel: 'C 5', correct: false },
      ],
      token,
    );
    if (!isCurrentSequence(token)) return;
    await finishSection(token);
  }

  async function showDirectionExample(
    toneNotes: readonly [string, string],
    labels: readonly [string, string],
    arrow: Exclude<DirectionArrow, null>,
    token: number,
  ): Promise<void> {
    directionArrow = arrow;
    setDisplayNotes([
      { toneNote: toneNotes[0], label: labels[0], leftPercent: 42 },
      { toneNote: toneNotes[1], label: labels[1], leftPercent: 66 },
    ]);
    await playSequence(toneNotes, token);
  }

  async function runAccidentals(token: number): Promise<void> {
    gridKind = 'chromatic-a';
    letterLegendOnly = false;
    accidentalMode = { sharp: false, flat: false };
    highlightedRowMidis = displayRows
      .filter((row) => row.isAccidental && typeof row.midi === 'number')
      .map((row) => row.midi as number);
    await say(
      'The pitches between notes can be named from the notes neighbouring above and below them.',
      'The pitches between notes can be named from the notes neighbouring above and below them.',
      token,
    );
    if (!isCurrentSequence(token)) return;

    await say('A flat lowers the pitch.', 'A flat lowers the pitch.', token);
    if (!isCurrentSequence(token)) return;
    accidentalMode = { sharp: false, flat: true };
    await showDirectionExample(['A4', 'Ab4'], ['A4', 'A♭4'], 'lower', token);
    if (!isCurrentSequence(token)) return;
    await say(
      'The chromatic pitches now have flat names in the pitch legend.',
      'The chromatic pitches now have flat names in the pitch legend.',
      token,
    );
    if (!isCurrentSequence(token)) return;

    await say('A sharp raises the pitch.', 'A sharp raises the pitch.', token);
    if (!isCurrentSequence(token)) return;
    accidentalMode = { sharp: true, flat: false };
    await showDirectionExample(['A4', 'Bb4'], ['A4', 'A♯4'], 'higher', token);
    if (!isCurrentSequence(token)) return;
    await say(
      'The chromatic pitches now have sharp names in the pitch legend.',
      'The chromatic pitches now have sharp names in the pitch legend.',
      token,
    );
    if (!isCurrentSequence(token)) return;

    accidentalMode = { sharp: true, flat: true };
    directionArrow = null;
    setDisplayNotes([{ toneNote: 'Bb4', label: 'A♯4 / B♭4' }]);
    await say(
      'The same pitch can sometimes have two different names.',
      'The same pitch can sometimes have two different names.',
      token,
    );
    if (!isCurrentSequence(token)) return;
    await playTone('Bb4', token, 520);
    if (!isCurrentSequence(token)) return;

    await say('Notice that flat notes are lower.', 'Notice that flat notes are lower.', token);
    if (!isCurrentSequence(token)) return;
    accidentalMode = { sharp: false, flat: true };
    await showDirectionExample(['A4', 'Ab4'], ['A4', 'A♭4'], 'lower', token);
    if (!isCurrentSequence(token)) return;
    await say('Notice that sharp notes are higher.', 'Notice that sharp notes are higher.', token);
    if (!isCurrentSequence(token)) return;
    accidentalMode = { sharp: true, flat: false };
    await showDirectionExample(['A4', 'Bb4'], ['A4', 'A♯4'], 'higher', token);
    if (!isCurrentSequence(token)) return;
    highlightedRowMidis = [];
    directionArrow = null;
    await finishSection(token);
  }

  async function runPractice(token: number): Promise<void> {
    gridKind = 'practice';
    letterLegendOnly = false;
    highlightedRowMidis = [];
    accidentalMode = { sharp: true, flat: true };
    await say('Let’s practice!', 'Let us practice!', token);
    if (!isCurrentSequence(token)) return;
    for (const question of combinedPracticeQuestions) {
      await askPlacement(question, token);
      if (!isCurrentSequence(token)) return;
    }

    accidentalMode = { sharp: false, flat: true };
    for (const question of flatPracticeQuestions) {
      await askPlacement(question, token);
      if (!isCurrentSequence(token)) return;
    }

    accidentalMode = { sharp: true, flat: false };
    for (const question of sharpPracticeQuestions) {
      await askPlacement(question, token);
      if (!isCurrentSequence(token)) return;
    }
    await finishSection(token);
  }

  async function runSection(token: number): Promise<void> {
    switch (section.id) {
      case 'letter-names':
        await runLetterNames(token);
        break;
      case 'letter-cycle':
        await runLetterCycle(token);
        break;
      case 'octaves':
        await runOctaves(token);
        break;
      case 'octave-numbers':
        await runOctaveNumbers(token);
        break;
      case 'accidentals':
        await runAccidentals(token);
        break;
      case 'naming-practice':
        await runPractice(token);
        break;
      default:
        await say(section.description, section.description, token);
    }
  }

  function handleAvatarReady(): void {
    avatarReady = true;
  }

  $effect(() => {
    if (avatarReady && !sequenceStarted) {
      sequenceStarted = true;
      const token = ++sequenceToken;
      void runSection(token);
    }
  });

  $effect(() => {
    if (!isPlaying) stopVoice();
  });

  onDestroy(() => {
    sequenceToken += 1;
    responseResolve = null;
    stopVoice();
    cancelLessonAvatarSpeech();
    if (audioContext && audioContext.state !== 'closed') void audioContext.close();
  });
</script>

<div
  class="lesson-12-scene"
  style={`--legend-width:${legendWidth}px; --lesson-note-size:${noteSize}px;`}
>
  <div class="lesson-12-support">
    <LessonAvatarDock
      character="grammy"
      speechText={narrationText}
      {underlinedWords}
      on:ready={handleAvatarReady}
    />

    {#if interaction === 'choice'}
      <div class="choice-answers" aria-label={activePromptText}>
        {#each choiceOptions as option (option.label)}
          <button
            class={selectedChoiceLabel === option.label && choiceFeedbackState
              ? `is-${choiceFeedbackState}`
              : ''}
            type="button"
            disabled={answerLocked || !isPlaying}
            aria-label={option.spokenLabel ?? option.label}
            onclick={() => void handleChoice(option)}
          >
            {option.label}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <section
    class={`lesson-12-workspace app-card ${feedbackState ? `is-${feedbackState}` : ''}`}
    aria-label={`${section.code} ${section.label}`}
  >
    <div class="pitch-grid-frame" bind:clientWidth={frameWidth} bind:clientHeight={frameHeight}>
      <div class="pitch-grid-shell" style={`width:${shellWidth}px; height:${shellHeight}px;`}>
        <div
          class="pitch-grid-field"
          bind:clientWidth={viewportWidth}
          bind:clientHeight={viewportHeight}
        >
          {#if viewportWidth > 0 && viewportHeight > 0 && sequenceStarted}
            <div class="pitch-grid-render">
              <PitchGrid
                mode="singing"
                fullRowData={displayRows}
                viewport={pitchGridViewport}
                {cellWidth}
                {cellHeight}
                colorMode="color"
                {accidentalMode}
                showOctaveLabels={true}
                showLegendLabels={true}
                showAccidentalLabels={true}
                showFrequencyLabels={false}
                showRightLegend={false}
                {rowHighlight}
                legendLabelOverrides={legendLabelOverrides}
                {legendMidiLabelOverrides}
                {singingConfig}
                showHorizontalGridLines={true}
                extendHorizontalGridLinesBehindLegend={true}
                horizontalGridReferencePitchClass={0}
              />
            </div>

            <div class="pitch-grid-overlay">
              {#if interaction === 'placement'}
                <div class="row-choice-layer" aria-label={activePromptText}>
                  {#each displayRows as row (row.toneNote)}
                    <button
                      type="button"
                      style={`top:${rowCenter(row.toneNote)}%; height:${100 / (displayRowCount + 1)}%;`}
                      disabled={answerLocked || !isPlaying}
                      aria-label={`Choose the ${row.flatName} pitch row`}
                      onpointerenter={() => showPlacementPreview(row.toneNote)}
                      onpointerleave={() => hidePlacementPreview(row.toneNote)}
                      onfocus={() => showPlacementPreview(row.toneNote)}
                      onblur={() => hidePlacementPreview(row.toneNote)}
                      onclick={() => void handleRowChoice(row.toneNote)}
                    ></button>
                  {/each}
                </div>
              {/if}

              {#if interaction === 'placement' && placementPreviewTone && !hasCurrentPlacementNote}
                {@const previewRow = sourceRowByTone.get(placementPreviewTone)}
                <span
                  class="lesson-pitch-note is-preview"
                  style={`top:${rowCenter(placementPreviewTone)}%; left:${placementLeftPercent}%; color:${previewRow?.hex ?? '#6a5140'};`}
                  aria-hidden="true"
                ></span>
              {/if}

              {#if questionNote}
                {@const questionRow = sourceRowByTone.get(questionNote.toneNote)}
                <span
                  class="lesson-pitch-note is-question-note"
                  style={`top:${rowCenter(questionNote.toneNote)}%; left:${questionNote.leftPercent}%; color:${questionRow?.hex ?? '#6a5140'};`}
                  aria-hidden="true"
                >
                  <span>{questionNote.label}</span>
                </span>
              {/if}

              {#if transientChoiceNote}
                {@const transientRow = sourceRowByTone.get(transientChoiceNote.toneNote)}
                <span
                  class="lesson-pitch-note is-incorrect-note"
                  style={`top:${rowCenter(transientChoiceNote.toneNote)}%; left:${transientChoiceNote.leftPercent}%; color:${transientRow?.hex ?? '#6a5140'};`}
                  aria-hidden="true"
                >
                  <span>{transientChoiceNote.label}</span>
                </span>
              {/if}

              {#each displayNotes as note (note.id)}
                {@const row = sourceRowByTone.get(note.toneNote)}
                {#if note.clickable}
                  <button
                    class={`lesson-pitch-note is-clickable ${activeToneNote === note.toneNote ? 'is-active' : ''} ${note.label.length > 5 ? 'has-long-label' : ''}`}
                    type="button"
                    style={`top:${rowCenter(note.toneNote)}%; left:${note.leftPercent}%; color:${row?.hex ?? '#6a5140'};`}
                    disabled={answerLocked || !isPlaying}
                    aria-label={`Choose the note at ${row?.flatName ?? note.toneNote}`}
                    onclick={() => void handleNoteChoice(note.toneNote)}
                  >
                    <span>{note.label}</span>
                  </button>
                {:else}
                  <span
                    class={`lesson-pitch-note ${activeToneNote === note.toneNote ? 'is-active' : ''} ${note.label.length > 5 ? 'has-long-label' : ''}`}
                    style={`top:${rowCenter(note.toneNote)}%; left:${note.leftPercent}%; color:${row?.hex ?? '#6a5140'};`}
                    aria-hidden="true"
                  >
                    <span>{note.label}</span>
                  </span>
                {/if}
              {/each}

              {#if showOctaveBracket}
                <span
                  class="octave-bracket"
                  style={`top:${rowCenter('A4')}%; height:${rowCenter('A3') - rowCenter('A4')}%;`}
                  aria-hidden="true"
                ></span>
              {/if}

              {#if directionArrow}
                <span
                  class={`direction-arrow is-${directionArrow}`}
                  style={`top:${(rowCenter('A4') + rowCenter(directionArrow === 'lower' ? 'Ab4' : 'Bb4')) / 2}%;`}
                  aria-hidden="true"
                >
                  {directionArrow === 'lower' ? '↘' : '↗'}
                </span>
              {/if}
            </div>
          {/if}
        </div>

        {#if legendSpotlight}
          <div class="legend-spotlight" aria-hidden="true"></div>
        {/if}
      </div>
    </div>
  </section>
</div>

<style>
  .lesson-12-scene {
    display: grid;
    grid-template-columns: minmax(16rem, 20rem) minmax(0, 1fr);
    gap: 1rem;
    align-items: stretch;
    min-height: 0;
  }

  .lesson-12-support {
    min-height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
  }

  .choice-answers {
    width: min(18rem, 100%);
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }

  .choice-answers button {
    min-height: 3.25rem;
    padding: 0.7rem 0.85rem;
    border: 2px solid rgba(84, 65, 39, 0.2);
    border-radius: 1rem;
    background: rgba(255, 255, 255, 0.94);
    color: #29353c;
    font: inherit;
    font-size: 1.25rem;
    font-weight: 900;
    cursor: pointer;
    box-shadow: 0 8px 18px rgba(49, 36, 23, 0.08);
    transition:
      transform 0.15s ease,
      border-color 0.15s ease,
      box-shadow 0.15s ease;
  }

  .choice-answers button:hover:not(:disabled),
  .choice-answers button:focus-visible {
    transform: translateY(-2px);
    border-color: rgba(61, 121, 170, 0.55);
    box-shadow: 0 10px 22px rgba(49, 36, 23, 0.13);
  }

  .choice-answers button:disabled {
    cursor: default;
    opacity: 0.72;
  }

  .choice-answers button.is-correct {
    border-color: #2f9d55;
    background: #71dc8f;
    color: #102b18;
    box-shadow: 0 0 0 3px rgba(47, 157, 85, 0.2);
    opacity: 1;
  }

  .choice-answers button.is-incorrect {
    border-color: #d0a92f;
    background: #ffe178;
    color: #3e3107;
    box-shadow: 0 0 0 3px rgba(208, 169, 47, 0.2);
    opacity: 1;
  }

  .lesson-12-workspace {
    min-width: 0;
    min-height: 0;
    width: fit-content;
    max-width: 100%;
    justify-self: start;
    align-self: start;
    padding: 1rem;
    transition:
      border-color 0.16s ease,
      box-shadow 0.16s ease;
  }

  .lesson-12-workspace.is-success {
    border-color: rgba(66, 151, 94, 0.35);
    box-shadow: var(--amt-shadow), 0 0 0 2px rgba(66, 151, 94, 0.15);
  }

  .lesson-12-workspace.is-error {
    border-color: rgba(201, 90, 77, 0.34);
    box-shadow: var(--amt-shadow), 0 0 0 2px rgba(201, 90, 77, 0.13);
  }

  .pitch-grid-frame {
    width: min(100%, 62rem);
    height: clamp(35rem, calc(100svh - 10rem), 54rem);
    display: flex;
    align-items: center;
    justify-content: flex-start;
    overflow: visible;
  }

  .pitch-grid-shell {
    position: relative;
    display: block;
    max-width: 100%;
    max-height: 100%;
    transition: height 0.16s ease-out;
  }

  .pitch-grid-field {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: visible;
    border: 1px solid rgba(84, 65, 39, 0.14);
    border-radius: 22px;
    background:
      radial-gradient(580px 260px at 100% 8%, rgba(78, 176, 226, 0.06), transparent 62%),
      radial-gradient(620px 260px at 0% 100%, rgba(202, 187, 102, 0.06), transparent 64%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(247, 241, 231, 0.94));
  }

  .pitch-grid-render {
    position: absolute;
    z-index: 1;
    inset: 0;
    overflow: hidden;
    border-radius: 22px;
  }

  .legend-spotlight {
    position: absolute;
    z-index: 10;
    top: -5px;
    bottom: -5px;
    left: -5px;
    width: calc(var(--legend-width) + 10px);
    box-sizing: border-box;
    border: 4px solid rgba(255, 209, 60, 0.88);
    border-radius: 27px 4px 4px 27px;
    background: transparent;
    box-shadow:
      0 0 0 2px rgba(255, 255, 255, 0.76),
      0 0 24px rgba(245, 188, 42, 0.5);
    pointer-events: none;
    animation: legend-pulse 1.4s ease-in-out infinite;
  }

  .pitch-grid-overlay {
    position: absolute;
    z-index: 6;
    inset: 0 0 0 var(--legend-width);
    pointer-events: none;
  }

  .row-choice-layer {
    position: absolute;
    inset: 0;
    pointer-events: auto;
  }

  .row-choice-layer button {
    position: absolute;
    left: 0;
    width: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    transform: translateY(-50%);
    cursor: crosshair;
  }

  .row-choice-layer button:focus {
    outline: none;
  }

  .row-choice-layer button:disabled {
    cursor: default;
  }

  .lesson-pitch-note {
    position: absolute;
    z-index: 4;
    width: var(--lesson-note-size);
    height: var(--lesson-note-size);
    display: grid;
    place-items: center;
    padding: 0;
    border: 2px solid currentColor;
    border-radius: 999px;
    background: transparent;
    box-shadow:
      0 0 0 2px rgba(255, 255, 255, 0.84),
      0 7px 16px rgba(39, 28, 18, 0.14);
    color: #6a5140;
    transform: translate(-50%, -50%);
    pointer-events: none;
    transition:
      width 0.18s ease,
      background-color 0.15s ease,
      box-shadow 0.15s ease,
      transform 0.15s ease;
  }

  .lesson-pitch-note.has-long-label {
    width: calc(var(--lesson-note-size) * 2.55);
  }

  .lesson-pitch-note span {
    padding-inline: 0.28rem;
    color: #1f2c34;
    font-size: clamp(1.35rem, calc(var(--lesson-note-size) * 0.54), 2rem);
    font-weight: 900;
    line-height: 1;
    white-space: nowrap;
  }

  .lesson-pitch-note.has-long-label span {
    font-size: clamp(0.9rem, calc(var(--lesson-note-size) * 0.34), 1.35rem);
  }

  button.lesson-pitch-note.is-clickable {
    appearance: none;
    pointer-events: auto;
    cursor: pointer;
  }

  button.lesson-pitch-note.is-clickable:hover:not(:disabled),
  button.lesson-pitch-note.is-clickable:focus-visible {
    transform: translate(-50%, -50%) scale(1.1);
  }

  .lesson-pitch-note.is-active {
    transform: translate(-50%, -50%) scale(1.12);
    background: transparent;
    box-shadow:
      0 0 0 2px rgba(255, 255, 255, 0.9),
      0 0 18px currentColor,
      0 0 32px color-mix(in srgb, currentColor 48%, transparent);
  }

  .lesson-pitch-note.is-preview {
    border-style: dashed;
    background: transparent;
    box-shadow:
      0 0 0 2px rgba(255, 255, 255, 0.76),
      0 0 16px color-mix(in srgb, currentColor 32%, transparent);
    opacity: 0.9;
  }

  .lesson-pitch-note.is-question-note {
    box-shadow:
      0 0 0 3px rgba(255, 255, 255, 0.86),
      0 0 22px color-mix(in srgb, currentColor 58%, transparent);
    animation: question-note-pulse 1.2s ease-in-out infinite;
  }

  .lesson-pitch-note.is-incorrect-note {
    border-color: #d0a92f;
    box-shadow:
      0 0 0 3px rgba(255, 255, 255, 0.86),
      0 0 22px rgba(236, 190, 45, 0.74);
  }

  .octave-bracket {
    position: absolute;
    left: 70%;
    width: 1.1rem;
    border-right: 4px solid #5b4a84;
  }

  .octave-bracket::before,
  .octave-bracket::after {
    content: '';
    position: absolute;
    right: -4px;
    width: 1rem;
    border-top: 4px solid #5b4a84;
  }

  .octave-bracket::before {
    top: 0;
    transform: translateY(-50%);
  }

  .octave-bracket::after {
    bottom: 0;
    transform: translateY(50%);
  }

  .direction-arrow {
    position: absolute;
    left: 54%;
    color: #5b4a84;
    font-size: clamp(2rem, 4vw, 3.2rem);
    font-weight: 900;
    line-height: 1;
    transform: translate(-50%, -50%);
    text-shadow: 0 2px 0 rgba(255, 255, 255, 0.9);
  }

  @keyframes legend-pulse {
    0%,
    100% {
      box-shadow:
        0 0 0 2px rgba(255, 255, 255, 0.76),
        0 0 18px rgba(245, 188, 42, 0.4);
    }
    50% {
      box-shadow:
        0 0 0 2px rgba(255, 255, 255, 0.86),
        0 0 30px rgba(245, 188, 42, 0.7);
    }
  }

  @keyframes question-note-pulse {
    0%,
    100% {
      transform: translate(-50%, -50%) scale(1);
    }
    50% {
      transform: translate(-50%, -50%) scale(1.08);
    }
  }

  @media (max-width: 980px) {
    .lesson-12-scene {
      grid-template-columns: 1fr;
    }

    .lesson-12-support {
      min-height: auto;
    }

    .pitch-grid-frame {
      height: clamp(30rem, calc(100svh - 12rem), 45rem);
    }
  }

  @media (max-width: 720px) {
    .lesson-12-scene {
      gap: 0.7rem;
    }

    .lesson-12-support {
      width: 100%;
      gap: 0.65rem;
    }

    .lesson-12-workspace {
      width: 100%;
      justify-self: stretch;
      padding: 0.65rem;
    }

    .pitch-grid-frame {
      width: 100%;
      height: clamp(22rem, 66svh, 34rem);
    }

    button.lesson-pitch-note.is-clickable::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 2.75rem;
      height: 2.75rem;
      transform: translate(-50%, -50%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .pitch-grid-shell {
      transition: none;
    }

    .legend-spotlight {
      animation: none;
    }

    .lesson-pitch-note.is-question-note {
      animation: none;
    }

    .lesson-pitch-note,
    .choice-answers button {
      transition: none;
    }
  }
</style>
