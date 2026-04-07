<script lang="ts">
  import { fullRowData } from '@mlt/pitch-data';
  import { PitchGrid } from '@mlt/ui-components/canvas';
  import type { PitchGridViewport, SingingModeConfig } from '@mlt/ui-components/canvas';
  import { onDestroy } from 'svelte';
  import LessonAvatarDock from './LessonAvatarDock.svelte';
  import { cancelLessonAvatarSpeech, speakWithLessonAvatar } from './lessonAvatar';
  import type { LessonSection } from './lessons';

  export let section: LessonSection;
  export let isPlaying = true;
  export let volume = 72;

  type PitchRegion = 'upper' | 'lower';
  type PracticeTask = {
    id: string;
    badge: string;
    title: string;
    prompt: string;
    narration: string;
    target: PitchRegion;
    tones: number[];
    snapTone: string;
    reinforcement: string;
    replayLabel: string;
  };

  type LegendCell = {
    id: string;
    rowIndex: number;
    column: 'A' | 'B';
    hex: string;
    textColor: string;
    anchorLabel: string | null;
  };

  function getContrastColor(hex: string): string {
    const normalized = hex.replace('#', '');
    if (normalized.length !== 6) return '#ffffff';
    const red = Number.parseInt(normalized.slice(0, 2), 16);
    const green = Number.parseInt(normalized.slice(2, 4), 16);
    const blue = Number.parseInt(normalized.slice(4, 6), 16);
    const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
    return luminance > 164 ? '#1b221e' : '#ffffff';
  }

  function getLegendAnchorLabel(toneNote: string): string | null {
    if (toneNote === 'A0') return toneNote;
    return /^C[1-8]$/.test(toneNote) ? toneNote : null;
  }

  const pitchRows = fullRowData;
  const rowCount = pitchRows.length;
  const pitchGridCellWidth = 18;
  const pitchGridSingingConfig: SingingModeConfig = { pitchHistory: [] };
  const resetY = 50;
  const rowIndexByTone = new Map(pitchRows.map((row, index) => [row.toneNote, index]));
  const legendCells: LegendCell[] = pitchRows.map((row, rowIndex) => ({
    id: `legend-${row.toneNote}`,
    rowIndex,
    column: row.column,
    hex: row.hex,
    textColor: getContrastColor(row.hex),
    anchorLabel: getLegendAnchorLabel(row.toneNote),
  }));

  function roundMetric(value: number, precision = 2): number {
    const factor = 10 ** precision;
    return Math.round(value * factor) / factor;
  }

  const tasks: PracticeTask[] = [
    {
      id: 'low-place',
      badge: 'Prompt 1',
      title: 'Move the note into the low half',
      prompt: 'Drag the note into the lower part of the pitch space.',
      narration: 'Drag the note into the lower part of the pitch space.',
      target: 'lower',
      tones: [220],
      snapTone: 'A3',
      reinforcement: 'Good. Lower sounds belong lower in the pitch space.',
      replayLabel: 'Replay low tone',
    },
    {
      id: 'high-place',
      badge: 'Prompt 2',
      title: 'Move the note into the high half',
      prompt: 'Now drag the note into the higher part of the pitch space.',
      narration: 'Now drag the note into the higher part of the pitch space.',
      target: 'upper',
      tones: [880],
      snapTone: 'A5',
      reinforcement: 'Good. Higher sounds belong higher in the pitch space.',
      replayLabel: 'Replay high tone',
    },
    {
      id: 'contrast-1',
      badge: 'Prompt 3 - 1 of 4',
      title: 'Listen, then place the note',
      prompt: 'Listen, then place the note where it belongs.',
      narration: 'Listen, then place the note where it belongs.',
      target: 'lower',
      tones: [196],
      snapTone: 'G3',
      reinforcement: 'Yes. That sound belongs in the lower region.',
      replayLabel: 'Replay contrast tone',
    },
    {
      id: 'contrast-2',
      badge: 'Prompt 3 - 2 of 4',
      title: 'Listen, then place the note',
      prompt: 'Listen, then place the note where it belongs.',
      narration: 'Listen, then place the note where it belongs.',
      target: 'upper',
      tones: [783.99],
      snapTone: 'G5',
      reinforcement: 'Yes. That sound belongs in the higher region.',
      replayLabel: 'Replay contrast tone',
    },
    {
      id: 'contrast-3',
      badge: 'Prompt 3 - 3 of 4',
      title: 'Listen, then place the note',
      prompt: 'Listen, then place the note where it belongs.',
      narration: 'Listen, then place the note where it belongs.',
      target: 'lower',
      tones: [246.94],
      snapTone: 'B3',
      reinforcement: 'Yes. Lower sounds still belong lower.',
      replayLabel: 'Replay contrast tone',
    },
    {
      id: 'contrast-4',
      badge: 'Prompt 3 - 4 of 4',
      title: 'Listen, then place the note',
      prompt: 'Listen, then place the note where it belongs.',
      narration: 'Listen, then place the note where it belongs.',
      target: 'upper',
      tones: [1046.5],
      snapTone: 'C6',
      reinforcement: 'Yes. Higher sounds still belong higher.',
      replayLabel: 'Replay contrast tone',
    },
    {
      id: 'comparison',
      badge: 'Prompt 4',
      title: 'Match the higher sound',
      prompt: 'Drag the note to match the higher sound.',
      narration: 'Drag the note to match the higher sound.',
      target: 'upper',
      tones: [293.66, 880],
      snapTone: 'A5',
      reinforcement: 'Good. The second sound belongs higher in the pitch space.',
      replayLabel: 'Replay comparison',
    },
  ];

  let fieldEl: HTMLDivElement | null = null;
  let noteEl: HTMLButtonElement | null = null;
  let pitchGridViewportWidth = 0;
  let pitchGridViewportHeight = 0;
  let pitchGridCellHeight = 12;
  let pitchGridLegendWidth = pitchGridCellWidth * 6;
  let pitchGridViewport: PitchGridViewport = {
    startRow: 0,
    endRow: rowCount - 1,
    zoomLevel: 1,
    containerWidth: 0,
    containerHeight: 0,
  };
  let noteY = resetY;
  let dragging = false;
  let interactionEnabled = false;
  let pointerId: number | null = null;
  let activeRegion: PitchRegion | null = null;
  let flashRegion: PitchRegion | null = null;
  let feedbackState: 'success' | 'error' | null = null;
  let avatarReady = false;
  let introStarted = false;
  let introRunning = false;
  let taskIndex = -1;
  let narrationText = '';
  let promptBadge = section.code;
  let promptTitle = section.label;
  let promptStatus = 'This space shows pitch from low to high.';
  let complete = false;
  let previousIsPlaying = isPlaying;
  let flashTimer: ReturnType<typeof setTimeout> | null = null;
  let waitTimer: ReturnType<typeof setTimeout> | null = null;
  let waitResolve: (() => void) | null = null;
  let waitRemainingMs = 0;
  let waitStartedAt = 0;
  let waitPaused = false;
  let sequenceToken = 0;
  let activeOscillator: OscillatorNode | null = null;
  let activeGain: GainNode | null = null;
  let audioContext: AudioContext | null = null;
  let lastLegendMetricsSignature = '';

  $: pitchGridLegendWidth = pitchGridCellWidth * 6;
  $: pitchGridCellHeight = pitchGridViewportHeight > 0
    ? (pitchGridViewportHeight * 2) / (rowCount + 1)
    : 12;
  $: pitchGridViewport = {
    startRow: 0,
    endRow: rowCount - 1,
    zoomLevel: 1,
    containerWidth: pitchGridViewportWidth,
    containerHeight: pitchGridViewportHeight,
  };
  $: if (typeof window !== 'undefined' && pitchGridViewportHeight > 0) {
    const legendMetrics = {
      viewportHeightPx: roundMetric(pitchGridViewportHeight),
      legendCellHeightPx: roundMetric(pitchGridCellHeight),
      legendWidthPx: roundMetric(pitchGridLegendWidth),
      legendSubcolumnWidthPx: roundMetric(pitchGridLegendWidth / 2),
      rowCount,
    };
    const signature = JSON.stringify(legendMetrics);
    if (signature !== lastLegendMetricsSignature) {
      lastLegendMetricsSignature = signature;
      console.log('[AMT][Lesson 1.1.1] PitchGrid legend metrics', legendMetrics);
    }
  }
  $: currentTask = taskIndex >= 0 && taskIndex < tasks.length ? tasks[taskIndex] : null;
  $: closingNotes = [
    { id: 'closing-low', top: `${rowCenter(getRowIndexForTone('A3'))}%`, left: '39%' },
    { id: 'closing-high', top: `${rowCenter(getRowIndexForTone('A5'))}%`, left: '66%' },
  ];

  $: if (avatarReady && !introStarted && isPlaying) {
    introStarted = true;
    void startIntroSequence();
  }

  $: if (isPlaying !== previousIsPlaying) {
    previousIsPlaying = isPlaying;
    if (isPlaying) resumeSequencing();
    else pauseSequencing();
  }

  function getRowIndexForTone(toneNote: string): number {
    return rowIndexByTone.get(toneNote) ?? Math.floor(rowCount / 2);
  }

  function rowCenter(rowIndex: number): number {
    return ((rowIndex + 1) / (rowCount + 1)) * 100;
  }

  function beginSequence(cancelSpeech = true): number {
    sequenceToken += 1;
    stopTone();
    clearFlashRegion();
    cancelWait(true);
    if (cancelSpeech) cancelLessonAvatarSpeech();
    return sequenceToken;
  }

  function isCurrentSequence(token: number): boolean {
    return token === sequenceToken;
  }

  function clearFlashRegion(): void {
    flashRegion = null;
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = null;
  }

  function pulseRegion(region: PitchRegion, durationMs: number): void {
    clearFlashRegion();
    flashRegion = region;
    flashTimer = setTimeout(() => {
      flashRegion = null;
      flashTimer = null;
    }, durationMs);
  }

  function waitMs(durationMs: number): Promise<void> {
    cancelWait(false);
    waitRemainingMs = durationMs;
    waitPaused = false;
    return new Promise((resolve) => {
      waitResolve = () => {
        if (waitTimer) clearTimeout(waitTimer);
        waitTimer = null;
        waitResolve = null;
        waitRemainingMs = 0;
        waitPaused = false;
        resolve();
      };

      if (!isPlaying) {
        waitPaused = true;
        return;
      }

      waitStartedAt = performance.now();
      waitTimer = setTimeout(() => waitResolve?.(), waitRemainingMs);
    });
  }

  function cancelWait(resolvePending = true): void {
    if (waitTimer) clearTimeout(waitTimer);
    waitTimer = null;
    const resolver = waitResolve;
    waitResolve = null;
    waitRemainingMs = 0;
    waitPaused = false;
    if (resolvePending) resolver?.();
  }

  function pauseSequencing(): void {
    if (waitTimer) {
      clearTimeout(waitTimer);
      waitTimer = null;
      waitRemainingMs = Math.max(0, waitRemainingMs - (performance.now() - waitStartedAt));
      waitPaused = true;
    }
    stopTone();
  }

  function resumeSequencing(): void {
    if (!waitPaused || !waitResolve) return;
    waitPaused = false;
    waitStartedAt = performance.now();
    waitTimer = setTimeout(() => waitResolve?.(), waitRemainingMs);
  }

  async function ensureAudioContext(): Promise<AudioContext | null> {
    try {
      if (!audioContext) audioContext = new AudioContext();
      if (audioContext.state === 'suspended') await audioContext.resume();
      return audioContext;
    } catch {
      return null;
    }
  }

  function stopTone(): void {
    if (activeOscillator) {
      try {
        activeOscillator.stop();
      } catch {}
      try {
        activeOscillator.disconnect();
      } catch {}
      activeOscillator = null;
    }

    if (activeGain) {
      try {
        activeGain.disconnect();
      } catch {}
      activeGain = null;
    }
  }

  async function playTone(
    frequency: number,
    durationMs: number,
    region: PitchRegion,
    token: number
  ): Promise<void> {
    if (!isCurrentSequence(token) || !isPlaying) return;
    const context = await ensureAudioContext();
    if (!context || !isCurrentSequence(token)) return;

    stopTone();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const peak = Math.max(0.015, Math.min(0.11, (volume / 100) * 0.08));

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    activeOscillator = oscillator;
    activeGain = gain;

    pulseRegion(region, durationMs + 60);
    await waitMs(durationMs);
    if (!isCurrentSequence(token)) return;
    stopTone();
  }

  async function say(text: string, token: number): Promise<void> {
    narrationText = text;
    if (!avatarReady || !isCurrentSequence(token)) return;
    try {
      await speakWithLessonAvatar(text, { lang: 'en-CA', rate: 0.92, chunking: 'sentence' });
    } catch {}
  }

  async function startIntroSequence(): Promise<void> {
    const token = beginSequence();
    introRunning = true;
    complete = false;
    taskIndex = -1;
    interactionEnabled = false;
    feedbackState = null;
    promptBadge = section.code;
    promptTitle = section.label;
    promptStatus = 'This space shows pitch from low to high.';
    noteY = resetY;
    activeRegion = null;

    await waitMs(320);
    if (!isCurrentSequence(token)) return;

    await say(
      'This space shows pitch from low to high. Lower sounds belong lower down. Higher sounds belong higher up.',
      token
    );
    if (!isCurrentSequence(token)) return;

    promptStatus = 'A low tone will play, then a high tone.';
    await playTone(220, 720, 'lower', token);
    if (!isCurrentSequence(token)) return;

    await waitMs(180);
    if (!isCurrentSequence(token)) return;

    await playTone(880, 720, 'upper', token);
    if (!isCurrentSequence(token)) return;

    await waitMs(220);
    if (!isCurrentSequence(token)) return;

    introRunning = false;
    await startTask(0);
  }

  async function startTask(index: number): Promise<void> {
    if (index >= tasks.length) {
      await finishSubsection();
      return;
    }

    const task = tasks[index];
    const token = beginSequence();
    taskIndex = index;
    complete = false;
    interactionEnabled = false;
    feedbackState = null;
    noteY = resetY;
    activeRegion = null;
    promptBadge = task.badge;
    promptTitle = task.title;
    promptStatus = task.prompt;
    narrationText = task.prompt;

    await waitMs(140);
    if (!isCurrentSequence(token)) return;

    const sequence = task.tones.map((frequency, toneIndex) => ({
      frequency,
      region:
        toneIndex === task.tones.length - 1
          ? task.target
          : task.target === 'upper'
            ? 'lower'
            : 'upper',
    }));

    for (const item of sequence) {
      await playTone(item.frequency, 650, item.region, token);
      if (!isCurrentSequence(token)) return;
      await waitMs(150);
      if (!isCurrentSequence(token)) return;
    }

    if (index < 2 || index === 2 || index === tasks.length - 1) {
      await say(task.narration, token);
      if (!isCurrentSequence(token)) return;
    }

    interactionEnabled = true;
  }

  async function finishSubsection(): Promise<void> {
    const token = beginSequence();
    complete = true;
    interactionEnabled = false;
    feedbackState = null;
    promptBadge = `${section.code} complete`;
    promptTitle = 'High and low are now separate regions';
    promptStatus =
      'Lower pitches belong lower in the space. Higher pitches belong higher in the space.';
    narrationText = promptStatus;
    noteY = resetY;
    activeRegion = null;
    await say(promptStatus, token);
  }

  async function replayCurrentTask(): Promise<void> {
    if (!currentTask || !isPlaying || complete || introRunning) return;
    await startTask(taskIndex);
  }

  async function restartSubsection(): Promise<void> {
    introStarted = true;
    await startIntroSequence();
  }

  async function handleSuccessfulDrop(): Promise<void> {
    if (!currentTask) return;
    const token = beginSequence();
    interactionEnabled = false;
    feedbackState = 'success';
    noteY = rowCenter(getRowIndexForTone(currentTask.snapTone));
    activeRegion = currentTask.target;
    promptStatus = currentTask.reinforcement;
    narrationText = currentTask.reinforcement;

    if (taskIndex < 2 || taskIndex === tasks.length - 1) {
      await say(currentTask.reinforcement, token);
      if (!isCurrentSequence(token)) return;
    }

    await waitMs(820);
    if (!isCurrentSequence(token)) return;

    feedbackState = null;
    await startTask(taskIndex + 1);
  }

  async function handleIncorrectDrop(): Promise<void> {
    const token = beginSequence();
    interactionEnabled = false;
    feedbackState = 'error';
    activeRegion = null;
    promptStatus = 'Try again. Listen for the sound and place the note in the correct half.';
    narrationText = promptStatus;
    noteY = resetY;

    await waitMs(420);
    if (!isCurrentSequence(token)) return;

    feedbackState = null;
    await startTask(taskIndex);
  }

  function getFieldHalfFromY(percentY: number): PitchRegion {
    return percentY < 50 ? 'upper' : 'lower';
  }

  function updateDraggedNote(clientY: number): void {
    if (!fieldEl) return;
    const rect = fieldEl.getBoundingClientRect();
    const normalized = ((clientY - rect.top) / rect.height) * 100;
    noteY = Math.max(4, Math.min(96, normalized));
    activeRegion = getFieldHalfFromY(noteY);
  }

  function handleNotePointerDown(event: PointerEvent): void {
    if (!interactionEnabled || !isPlaying || !noteEl) return;
    dragging = true;
    pointerId = event.pointerId;
    noteEl.setPointerCapture(event.pointerId);
    updateDraggedNote(event.clientY);
  }

  function handleNotePointerMove(event: PointerEvent): void {
    if (!dragging || pointerId !== event.pointerId) return;
    updateDraggedNote(event.clientY);
  }

  async function handleNotePointerUp(event: PointerEvent): Promise<void> {
    if (!dragging || pointerId !== event.pointerId || !noteEl || !currentTask) return;
    noteEl.releasePointerCapture(event.pointerId);
    dragging = false;
    pointerId = null;

    if (getFieldHalfFromY(noteY) === currentTask.target) await handleSuccessfulDrop();
    else await handleIncorrectDrop();
  }

  function handleNotePointerCancel(event: PointerEvent): void {
    if (!dragging || pointerId !== event.pointerId || !noteEl) return;
    noteEl.releasePointerCapture(event.pointerId);
    dragging = false;
    pointerId = null;
    noteY = resetY;
    activeRegion = null;
  }

  function handleAvatarReady(): void {
    avatarReady = true;
  }

  onDestroy(() => {
    sequenceToken += 1;
    cancelWait(true);
    stopTone();
    clearFlashRegion();
    cancelLessonAvatarSpeech();
    if (audioContext && audioContext.state !== 'closed') void audioContext.close();
  });
</script>

<div class="pitch-scene">
  <div class="pitch-scene-support">
    <LessonAvatarDock
      character="grammy"
      speechText={narrationText}
      on:ready={handleAvatarReady}
    />
  </div>

  <section class={`pitch-workspace app-card ${feedbackState ? `is-${feedbackState}` : ''}`}>
    <div class="pitch-grid-frame" style={`--legend-width:${pitchGridLegendWidth}px;`}>
      <div class="pitch-grid-shell">
        <div class="pitch-grid-legend" aria-hidden="true">
          {#each legendCells as cell}
            <div
              class={`pitch-grid-legend-cell ${cell.column === 'B' ? 'is-column-b' : 'is-column-a'} ${cell.anchorLabel ? 'is-anchor-row' : ''}`}
              style={`top:${rowCenter(cell.rowIndex)}%; height:${pitchGridCellHeight}px; background:${cell.hex}; color:${cell.textColor};`}
            >
              {#if cell.anchorLabel}
                <span class="pitch-grid-legend-label">{cell.anchorLabel}</span>
              {/if}
            </div>
          {/each}
        </div>

        <div
          class="pitch-grid-field"
          bind:clientWidth={pitchGridViewportWidth}
          bind:clientHeight={pitchGridViewportHeight}
        >
          {#if pitchGridViewportWidth > 0 && pitchGridViewportHeight > 0}
            <PitchGrid
              mode="singing"
              fullRowData={pitchRows}
              viewport={pitchGridViewport}
              cellWidth={pitchGridCellWidth}
              cellHeight={pitchGridCellHeight}
              colorMode="color"
              showOctaveLabels={false}
              showFrequencyLabels={false}
              showRightLegend={false}
              singingConfig={pitchGridSingingConfig}
              showHorizontalGridLines={true}
              horizontalGridReferencePitchClass={0}
            />

            <div class="pitch-grid-field-overlay" bind:this={fieldEl}>
              <div
                class={`pitch-field-half pitch-field-half--upper ${flashRegion === 'upper' || activeRegion === 'upper' ? 'is-active' : ''}`}
                aria-hidden="true"
              ></div>
              <div
                class={`pitch-field-half pitch-field-half--lower ${flashRegion === 'lower' || activeRegion === 'lower' ? 'is-active' : ''}`}
                aria-hidden="true"
              ></div>

              {#if complete}
                {#each closingNotes as closingNote}
                  <div
                    class="pitch-note pitch-note--settled"
                    style={`top:${closingNote.top}; left:${closingNote.left};`}
                    aria-hidden="true"
                  ></div>
                {/each}
              {:else}
                <button
                  bind:this={noteEl}
                  class={`pitch-note ${dragging ? 'is-dragging' : ''} ${interactionEnabled ? '' : 'is-muted'}`}
                  type="button"
                  style={`top:${noteY}%; left:18%;`}
                  aria-label={interactionEnabled
                    ? 'Draggable pitch note'
                    : 'Pitch note waiting for the next prompt'}
                  on:pointerdown={handleNotePointerDown}
                  on:pointermove={handleNotePointerMove}
                  on:pointerup={handleNotePointerUp}
                  on:pointercancel={handleNotePointerCancel}
                ></button>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </section>
</div>

<style>
  .pitch-scene {
    display: grid;
    grid-template-columns: minmax(16rem, 20rem) minmax(0, 1fr);
    gap: 1rem;
    align-items: stretch;
  }

  .pitch-scene-support {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    min-height: 100%;
  }

  .pitch-workspace {
    display: grid;
    gap: 0.9rem;
    padding: 1rem;
    transition: border-color 0.18s ease, box-shadow 0.18s ease;
  }

  .pitch-workspace.is-success {
    border-color: rgba(66, 151, 94, 0.26);
    box-shadow: var(--amt-shadow), 0 0 0 1px rgba(66, 151, 94, 0.12);
  }

  .pitch-workspace.is-error {
    border-color: rgba(201, 90, 77, 0.24);
    box-shadow: var(--amt-shadow), 0 0 0 1px rgba(201, 90, 77, 0.12);
  }

  .pitch-grid-frame {
    display: block;
  }

  .pitch-grid-shell {
    display: grid;
    grid-template-columns: var(--legend-width) minmax(0, 1fr);
    gap: 0;
    align-items: stretch;
  }

  .pitch-grid-legend {
    position: relative;
    min-height: 34rem;
    overflow: hidden;
    border-radius: 22px 0 0 22px;
    border: 1px solid rgba(84, 65, 39, 0.14);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.84), rgba(249, 245, 237, 0.9));
  }

  .pitch-grid-legend-cell {
    position: absolute;
    width: 50%;
    transform: translateY(-50%);
    box-shadow: inset 0 0 0 0.8px rgba(255, 255, 255, 0.35);
  }

  .pitch-grid-legend-cell.is-column-b {
    left: 0;
  }

  .pitch-grid-legend-cell.is-column-a {
    left: 50%;
  }

  .pitch-grid-legend-cell.is-anchor-row {
    z-index: 1;
  }

  .pitch-grid-legend-label {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.62rem;
    line-height: 1;
    font-weight: 800;
    letter-spacing: 0.01em;
    color: inherit;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35), 0 1px 3px rgba(23, 18, 14, 0.35);
  }

  .pitch-grid-field {
    position: relative;
    min-height: 34rem;
    overflow: hidden;
    border-radius: 0 22px 22px 0;
    border: 1px solid rgba(84, 65, 39, 0.14);
    border-left: 0;
    background:
      radial-gradient(580px 260px at 100% 8%, rgba(78, 176, 226, 0.06), transparent 62%),
      radial-gradient(620px 260px at 0% 100%, rgba(202, 187, 102, 0.06), transparent 64%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(247, 241, 231, 0.94));
  }

  .pitch-grid-field-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .pitch-field-half {
    position: absolute;
    inset-inline: 0;
    height: 50%;
    opacity: 0;
    transition: opacity 0.15s ease;
    pointer-events: none;
  }

  .pitch-field-half--upper {
    top: 0;
    background: linear-gradient(180deg, rgba(78, 176, 226, 0.18), rgba(78, 176, 226, 0.04));
  }

  .pitch-field-half--lower {
    bottom: 0;
    background: linear-gradient(180deg, rgba(202, 187, 102, 0.04), rgba(202, 187, 102, 0.18));
  }

  .pitch-field-half.is-active {
    opacity: 1;
  }

  .pitch-note {
    position: absolute;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 999px;
    border: 3px solid #c95a4d;
    background: radial-gradient(
      circle at 35% 35%,
      rgba(255, 255, 255, 0.96),
      rgba(255, 247, 243, 0.94) 62%,
      rgba(238, 213, 205, 0.92)
    );
    box-shadow: 0 12px 24px rgba(39, 28, 18, 0.16), inset 0 0 0 1px rgba(255, 255, 255, 0.6);
    transform: translate(-50%, -50%);
    transition:
      top 0.22s cubic-bezier(0.2, 0.7, 0.2, 1),
      box-shadow 0.18s ease,
      border-color 0.18s ease,
      transform 0.18s ease;
    cursor: grab;
    z-index: 2;
    pointer-events: auto;
  }

  .pitch-note.is-dragging {
    transition:
      box-shadow 0.15s ease,
      border-color 0.15s ease;
    box-shadow: 0 16px 32px rgba(39, 28, 18, 0.22), 0 0 0 8px rgba(201, 90, 77, 0.08);
    transform: translate(-50%, -50%) scale(1.03);
    cursor: grabbing;
  }

  .pitch-note.is-muted {
    opacity: 0.9;
    cursor: default;
  }

  .pitch-note--settled {
    cursor: default;
    border-color: #2f8d83;
    background: radial-gradient(
      circle at 35% 35%,
      rgba(255, 255, 255, 0.98),
      rgba(243, 252, 249, 0.95) 62%,
      rgba(212, 236, 231, 0.92)
    );
  }

  .pitch-workspace.is-success .pitch-note {
    border-color: #42975e;
  }

  .pitch-workspace.is-error .pitch-note {
    border-color: #b94d42;
  }

  @media (max-width: 980px) {
    .pitch-scene {
      grid-template-columns: 1fr;
    }

    .pitch-scene-support {
      display: grid;
      grid-template-columns: minmax(0, 18rem) minmax(0, 1fr);
      align-items: start;
      min-height: auto;
    }
  }

  @media (max-width: 760px) {
    .pitch-scene-support {
      grid-template-columns: 1fr;
    }

    .pitch-grid-shell {
      gap: 0;
    }

    .pitch-grid-legend,
    .pitch-grid-field {
      min-height: 25rem;
    }

    .pitch-grid-legend-label {
      font-size: 0.56rem;
    }
  }
</style>
