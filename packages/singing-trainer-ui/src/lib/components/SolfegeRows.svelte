<script lang="ts">
  import { onDestroy } from 'svelte';
  import { ladukhinLines } from '@mlt/singing-trainer-core/constants/ladukhin.js';
  import { pitchState } from '@mlt/singing-trainer-core/stores/pitchState.svelte.js';
  import { appState } from '@mlt/singing-trainer-core/stores/appState.svelte.js';
  import { startDetection } from '@mlt/singing-trainer-core/services/pitchDetection.js';
  import { toSolfegeTrailPoint, type SolfegeTrailPoint } from '@mlt/singing-trainer-core/services/solfegeTrail.js';
  import { preferencesStore } from '@mlt/singing-trainer-core/stores/preferencesStore.svelte.js';
  import { SolfegeAudio } from '@mlt/singing-trainer-core/services/solfegeAudio.js';
  import { calculateSolfegeAccuracy, solfegeCountdown, SOLFEGE_COUNT_IN_BEATS } from '@mlt/singing-trainer-core/services/solfegePractice.js';
  import SolfegeRowGrid from './SolfegeRowGrid.svelte';
  import type { SolfegeExercise } from '../solfegeExercises.js';

  let {
    exercise,
    shortcutHighlightMidis = [],
    onclose,
  }: {
    exercise: SolfegeExercise;
    shortcutHighlightMidis?: readonly number[];
    onclose: () => void;
  } = $props();
  const group = $derived(exercise.start);
  let selected = $state(1);
  let tempo = $state(80);
  let running = $state(false);
  let starting = $state(false);
  let beat = $state(0);
  let error = $state('');
  let trails = $state<Record<number, SolfegeTrailPoint[]>>({});
  let accuracy = $state<Record<number, number | undefined>>({});
  let completed = $state<Record<number, boolean>>({});
  let playback = $state(false);
  let audio: SolfegeAudio | null = null;
  let frame = 0;
  let generation = 0;
  let lastSampleTime = -Infinity;
  let lastTuningMode = appState.state.pitchTuningMode;
  const rows = $derived(ladukhinLines.filter(row => row.number >= group && row.number < group + 12));
  const current = $derived(ladukhinLines.find(row => row.number === selected)!);
  const speakingMidi = $derived(Math.round(preferencesStore.speakingPitchMidi ?? 60));
  const tuning = $derived(appState.state.pitchTuningMode);
  const countdown = $derived(running && !playback ? solfegeCountdown(beat) : null);
  const livePitch = $derived(appState.state.isDetecting ? pitchState.state.currentPitch : null);

  function stop() {
    generation++;
    audio?.dispose();
    audio = null;
    cancelAnimationFrame(frame);
    running = false;
    starting = false;
  }

  function selectRow(number: number) {
    stop();
    selected = number;
    beat = 0;
    error = '';
  }

  $effect(() => {
    selectRow(exercise.start);
  });

  $effect(() => {
    const nextTuningMode = appState.state.pitchTuningMode;
    if (nextTuningMode === lastTuningMode) return;
    lastTuningMode = nextTuningMode;
    // Scheduled reference notes and the accuracy target must never disagree.
    if (running || starting) stop();
    beat = 0;
    error = '';
  });

  async function start(melody = false) {
    if (starting || running) return;
    starting = true;
    playback = melody;
    error = '';
    const token = ++generation;
    try {
      if (!melody && !appState.state.isDetecting) {
        await startDetection();
        appState.setDetecting(true);
      }
      if (token !== generation) return;
      const player = new SolfegeAudio();
      audio = player;
      await player.init();
      if (token !== generation) { player.dispose(); return; }
      if (!melody) {
        trails = { ...trails, [selected]: [] };
        accuracy = { ...accuracy, [selected]: undefined };
        completed = { ...completed, [selected]: false };
      }
      lastSampleTime = -Infinity;
      let previousVoicedTime = -Infinity;
      let lastAccuracyUpdateTime = -Infinity;

      const duration = current.durationBeats;
      const rowNumber = selected;
      const bpm = tempo;
      const recordedLine = current;
      const recordedTonic = speakingMidi;
      const recordedTuning = tuning;
      const countIn = melody ? 0 : SOLFEGE_COUNT_IN_BEATS;
      player.schedule(current, recordedTonic, bpm, countIn, melody, true, recordedTuning);
      const started = performance.now() - player.elapsedSeconds * 1000;
      running = true;
      beat = -countIn;
      function tick(now: number) {
        if (token !== generation) return;
        if (!melody && !appState.state.isDetecting) {
          stop();
          error = 'Microphone stopped. Start singing again to retry this row.';
          return;
        }
        beat = Math.min(duration, player.elapsedSeconds * bpm / 60 - countIn);
        const history = pitchState.state.history;
        const sample = history[history.length - 1];
        if (!melody && beat >= 0 && sample && sample.time > lastSampleTime && now - sample.time < 150) {
          const point = toSolfegeTrailPoint(sample, started, bpm, countIn, duration, previousVoicedTime);
          if (point) {
            const points = trails[rowNumber] ?? [];
            points.push(point);
            previousVoicedTime = sample.time;
          }
          lastSampleTime = sample.time;
        }
        // Update live feedback at 10 Hz and always calculate the final score.
        if (!melody && beat >= 0 && (now - lastAccuracyUpdateTime >= 100 || beat >= duration)) {
          const score = calculateSolfegeAccuracy(recordedLine, trails[rowNumber] ?? [], recordedTonic, bpm, undefined, beat, recordedTuning);
          if (accuracy[rowNumber] !== score) accuracy = { ...accuracy, [rowNumber]: score };
          lastAccuracyUpdateTime = now;
        }
        if (beat >= duration) {
          if (!melody) completed = { ...completed, [rowNumber]: true };
          stop();
          return;
        }
        frame = requestAnimationFrame(tick);
      }
      frame = requestAnimationFrame(tick);
    } catch {
      if (token === generation) {
        stop();
        error = melody ? 'Could not start playback. Try again.' : 'Could not start practice. Check microphone permissions and audio, then try again.';
      }
    } finally {
      if (token === generation) starting = false;
    }
  }

  function recordRow(number: number) {
    if (selected === number && !playback && (running || starting)) {
      stop();
      return;
    }
    selectRow(number);
    void start();
  }

  function playRow(number: number) {
    if (selected === number && playback && (running || starting)) { stop(); return; }
    selectRow(number);
    void start(true);
  }

  function clearRow(number: number) {
    if (selected === number) {
      stop();
      beat = 0;
      playback = false;
      error = '';
    }
    trails = { ...trails, [number]: [] };
    accuracy = { ...accuracy, [number]: undefined };
    completed = { ...completed, [number]: false };
  }

  onDestroy(stop);
</script>

<div class="solfege-workspace">
  <header>
    <button onclick={onclose}>Close</button>
    <h2>{exercise.name}</h2>
    <div class="header-controls">
      <label>Tempo <input type="number" min="30" max="180" value={tempo} disabled={running || starting} onchange={(event) => { tempo = Math.max(30, Math.min(180, Number(event.currentTarget.value) || 80)); }} /> BPM</label>
    </div>
  </header>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  <div class="rows">
    {#each rows as row (row.number)}
      <section class:active={selected === row.number} aria-label={`Exercise ${row.number}`}>
        <div class="row-heading">
          <div class="row-identity">
            <button aria-label={`Exercise ${row.number}`} aria-pressed={selected === row.number} onclick={() => selectRow(row.number)}>#{row.number}</button>
            <span class="accuracy" role="status" aria-label={`Exercise ${row.number} accuracy`}
              aria-live={selected === row.number && running && !playback ? 'off' : 'polite'}>
              {accuracy[row.number] ?? 0}%
            </span>
          </div>
          <button class="record-button row-action-button" class:recording={selected === row.number && !playback && (running || starting)}
            aria-label={selected === row.number && !playback && (running || starting) ? `Stop recording exercise ${row.number}` : `Record exercise ${row.number}`}
            title={selected === row.number && !playback && (running || starting) ? 'Stop recording' : 'Record exercise'}
            onclick={() => recordRow(row.number)}>
            <span aria-hidden="true"></span>
          </button>
          <button class="row-action-button" aria-label={selected === row.number && playback && (running || starting) ? `Stop playback exercise ${row.number}` : `Play exercise ${row.number}`}
            title="Play exercise with triangle wave" aria-pressed={selected === row.number && playback && (running || starting)} onclick={() => playRow(row.number)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              {#if selected === row.number && playback && (running || starting)}
                <rect x="5" y="5" width="14" height="14" rx="1" />
              {:else}
                <path d="M6 3v18l15-9z" />
              {/if}
            </svg>
          </button>
          <button class="clear-button row-action-button" aria-label={`Clear pitch trail and accuracy for exercise ${row.number}`}
            title="Clear pitch trail and accuracy"
            disabled={!trails[row.number]?.length && accuracy[row.number] === undefined && !(selected === row.number && (running || starting || beat !== 0))}
            onclick={() => clearRow(row.number)}>
            <svg width="26" height="26" viewBox="0 0 372 372" fill="none" aria-hidden="true">
              <path fill="currentColor" fill-rule="evenodd" d="M 167.00 326.50 L 156.00 324.50 L 45.50 215.00 L 42.50 210.00 L 43.50 199.00 L 49.00 192.50 L 128.00 151.50 L 147.00 132.50 L 151.00 130.50 L 163.00 129.50 L 169.00 131.50 L 189.00 149.50 L 291.00 46.50 L 298.00 43.50 L 307.00 43.50 L 312.00 45.50 L 321.50 54.00 L 326.50 63.00 L 327.50 70.00 L 323.50 81.00 L 221.50 184.00 L 238.50 202.00 L 240.50 207.00 L 239.50 219.00 L 222.50 236.00 L 179.50 316.00 L 172.00 324.50 L 167.00 326.50 Z M 210.50 172.00 L 309.50 73.00 L 310.50 68.00 L 304.00 60.50 L 300.00 60.50 L 198.50 161.00 L 209.00 172.50 L 210.50 172.00 Z M 215.50 221.00 L 224.50 212.00 L 224.50 209.00 L 160.00 145.50 L 158.00 145.50 L 148.50 155.00 L 148.50 157.00 L 212.00 219.50 L 215.50 221.00 Z M 164.50 308.00 L 204.50 235.00 L 137.00 167.50 L 134.00 165.50 L 59.50 206.00 L 88.00 234.50 L 116.00 215.50 L 120.00 213.50 L 127.00 214.50 L 129.50 218.00 L 129.50 224.00 L 100.50 247.00 L 124.00 270.50 L 145.00 248.50 L 153.00 248.50 L 157.50 254.00 L 156.50 259.00 L 136.50 281.00 L 136.50 283.00 L 162.00 308.50 L 164.50 308.00 Z M 252.00 295.50 L 245.00 295.50 L 238.50 289.00 L 239.50 280.00 L 248.00 274.50 L 253.00 275.50 L 258.50 281.00 L 259.50 285.00 L 257.50 291.00 L 252.00 295.50 Z M 218.00 326.50 L 211.00 325.50 L 205.50 318.00 L 206.50 312.00 L 212.00 306.50 L 220.00 306.50 L 225.50 312.00 L 225.50 321.00 L 218.00 326.50 Z" />
            </svg>
          </button>
        </div>
          <SolfegeRowGrid referencePlaying={selected === row.number && playback && running} line={row} {speakingMidi} {tuning}
            {shortcutHighlightMidis}
            trail={trails[row.number] ?? []} cursorBeat={selected === row.number ? beat : null}
            active={selected === row.number && (running || starting)}
            recordingComplete={!!completed[row.number]}
            listening={selected === row.number && !playback && (running || beat === 0) && appState.state.isDetecting}
            livePitch={selected === row.number && !playback && (running || beat === 0) ? livePitch : null}
            countdown={selected === row.number ? countdown : null} />
      </section>
    {/each}
  </div>
</div>

<style>
  .solfege-workspace { display: flex; flex-direction: column; gap: 10px; flex: 1; min-width: 0; min-height: 0; color: var(--color-text); }
  header, .header-controls, .row-heading { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  header { flex-shrink: 0; }
  .header-controls { border-left: 1px solid var(--color-border-strong); padding-left: 12px; font-size: .85rem; }
  .error { margin: 0; font-size: .85rem; }
  h2 { margin: 0; font-size: 1.2rem; }
  button, input { color: var(--color-text); background: var(--color-panel); border: 1px solid var(--color-border); border-radius: 6px; padding: 7px 10px; font: inherit; }
  button { cursor: pointer; } button:disabled { opacity: .5; cursor: default; }
  button[aria-pressed='true'] { border-color: var(--color-primary); background: var(--color-bg-light); }
  .rows { flex: 1; min-height: 0; overflow: auto; overflow-anchor: none; }
  section { border: 2px solid var(--color-border); border-radius: 10px; padding: 8px; margin-bottom: 10px; background: var(--color-panel); }
  section.active { border-color: var(--color-primary); }
  .row-heading { font-size: .8rem; margin-bottom: 5px; }
  .row-identity { display: flex; align-items: center; gap: 8px; }
  .row-identity > button { flex-shrink: 0; }
  .accuracy { box-sizing: content-box; flex: 0 0 5ch; width: 5ch; text-align: center; padding: 4px 8px; border: 1px solid var(--color-border); border-radius: 999px; background: var(--color-bg-light); font-weight: 700; font-variant-numeric: tabular-nums; }
  .row-action-button { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; padding: 5px; }
  .record-button span { width: 16px; height: 16px; border-radius: 50%; background: #dc3545; }
  .record-button.recording span { border-radius: 2px; }
  label { display: flex; gap: 5px; align-items: center; } input { width: 70px; }
  @media (max-width: 600px) { .header-controls { gap: 6px; } button { padding: 6px; } }
</style>
