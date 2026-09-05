<script lang="ts">
  import { onDestroy } from 'svelte';
  import { ladukhinLines } from '@mlt/singing-trainer-core/constants/ladukhin.js';
  import { pitchState } from '@mlt/singing-trainer-core/stores/pitchState.svelte.js';
  import { appState } from '@mlt/singing-trainer-core/stores/appState.svelte.js';
  import { startDetection } from '@mlt/singing-trainer-core/services/pitchDetection.js';
  import { toSolfegeTrailPoint, type SolfegeTrailPoint } from '@mlt/singing-trainer-core/services/solfegeTrail.js';
  import { preferencesStore } from '@mlt/singing-trainer-core/stores/preferencesStore.svelte.js';
  import { SolfegeAudio } from '@mlt/singing-trainer-core/services/solfegeAudio.js';
  import SolfegeRowGrid from './SolfegeRowGrid.svelte';

  let { onclose }: { onclose: () => void } = $props();
  const groups = [{ label: '1–12', start: 1 }, { label: '51–62', start: 51 }, { label: '101–112', start: 101 }];
  let group = $state(1);
  let selected = $state(1);
  let tempo = $state(80);
  let transpose = $state(0);
  let running = $state(false);
  let starting = $state(false);
  let beat = $state(0);
  let error = $state('');
  let trails = $state<Record<number, SolfegeTrailPoint[]>>({});
  let playback = $state(false);
  let drums = $state<Record<number, boolean>>({});
  let audio: SolfegeAudio | null = null;
  let frame = 0;
  let generation = 0;
  let lastSampleTime = -Infinity;
  const rows = $derived(ladukhinLines.filter(row => row.number >= group && row.number < group + 12));
  const current = $derived(ladukhinLines.find(row => row.number === selected)!);
  const speakingMidi = $derived(Math.round(preferencesStore.speakingPitchMidi ?? 60) + transpose);

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
      if (!melody) trails = { ...trails, [selected]: [] };
      lastSampleTime = -Infinity;
      let previousVoicedTime = -Infinity;

      const duration = current.durationBeats;
      const rowNumber = selected;
      const bpm = tempo;
      const countIn = melody ? 0 : Number(current.meter.split('/')[0]);
      player.schedule(current, speakingMidi, bpm, countIn, melody, !!drums[selected]);
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
        if (beat >= duration) {
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

  function toggleDrums(number: number) {
    drums[number] = !drums[number];
    if (selected === number) audio?.setDrums(!!drums[number]);
  }

  onDestroy(stop);
</script>

<div class="solfege-workspace">
  <header>
    <div><h2>Ladukhin solfege</h2><p>Select a row, then sing to paint your pitch trail over the notes.</p></div>
    <button onclick={onclose}>Close</button>
  </header>
  <div class="groups" role="group" aria-label="Exercise group">
    {#each groups as item}
      <button aria-pressed={group === item.start} onclick={() => { group = item.start; selectRow(item.start); }}>Lines {item.label}</button>
    {/each}
  </div>
  <div class="rows">
    {#each rows as row (row.number)}
      <section class:active={selected === row.number} aria-label={`Exercise ${row.number}`}>
        <div class="row-heading">
          <button aria-pressed={selected === row.number} onclick={() => selectRow(row.number)}>Exercise {row.number}</button>
          <button class="record-button" class:recording={selected === row.number && !playback && (running || starting)}
            aria-label={selected === row.number && !playback && (running || starting) ? `Stop recording exercise ${row.number}` : `Record exercise ${row.number}`}
            title={selected === row.number && !playback && (running || starting) ? 'Stop recording' : 'Record exercise'}
            onclick={() => recordRow(row.number)}>
            <span aria-hidden="true"></span>
          </button>
          <button aria-label={selected === row.number && playback && (running || starting) ? `Stop playback exercise ${row.number}` : `Play exercise ${row.number}`}
            title="Play exercise with triangle wave" aria-pressed={selected === row.number && playback && (running || starting)} onclick={() => playRow(row.number)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              {#if selected === row.number && playback && (running || starting)}
                <rect x="5" y="5" width="14" height="14" rx="1" />
              {:else}
                <path d="M6 3v18l15-9z" />
              {/if}
            </svg>
          </button>
          <button aria-label={`Bass drum for exercise ${row.number}`} title="Roland TR-33 Kick on each measure" aria-pressed={!!drums[row.number]} onclick={() => toggleDrums(row.number)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><ellipse cx="12" cy="9" rx="9" ry="3"/><path d="M3 9v9c0 4 18 4 18 0V9M7 12v8m10-8v8M5 2l9 5M20 2l-5 5"/></svg>
          </button>
          {#if trails[row.number]?.length}<span>Trail recorded</span>{/if}
        </div>
        <div class="grid-scroll">
          <SolfegeRowGrid referencePlaying={selected === row.number && playback && running} line={row} {speakingMidi} trail={trails[row.number] ?? []} cursorBeat={selected === row.number ? beat : null} />
        </div>
      </section>
    {/each}
  </div>
  <footer aria-label="Solfege practice controls">
    <strong>Exercise {selected}</strong>
    <button disabled={starting} onclick={() => running ? stop() : void start()}>{starting ? 'Starting...' : running ? 'Stop' : 'Sing / retry row'}</button>
    <button disabled={running || starting || !trails[selected]?.length} onclick={() => { trails = { ...trails, [selected]: [] }; }}>Clear trail</button>
    <button disabled={selected === group} onclick={() => selectRow(selected - 1)}>Previous</button>
    <button disabled={selected === group + 11} onclick={() => selectRow(selected + 1)}>Next</button>
    <label>Tempo <input type="number" min="30" max="180" value={tempo} disabled={running || starting} onchange={(event) => { tempo = Math.max(30, Math.min(180, Number(event.currentTarget.value) || 80)); }} /> BPM</label>
    <label>Transpose <select bind:value={transpose} disabled={running || starting}>
      {#each Array.from({ length: 25 }, (_, i) => i - 12) as value}<option {value}>{value > 0 ? '+' : ''}{value}</option>{/each}
    </select></label>
    <span role="status">{error || (running && beat < 0 ? `Count in: ${Math.ceil(-beat)}` : running ? playback ? 'Playing' : 'Sing now' : beat >= current.durationBeats ? 'Row complete' : 'Ready')}</span>
  </footer>
</div>

<style>
  .solfege-workspace { display: flex; flex-direction: column; gap: 10px; flex: 1; min-width: 0; min-height: 0; color: var(--color-text); }
  header, .row-heading, .groups, footer { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  header { justify-content: space-between; }
  h2, p { margin: 0; } h2 { font-size: 1.2rem; } p { font-size: .85rem; color: var(--color-text-muted); }
  button, input, select { color: var(--color-text); background: var(--color-panel); border: 1px solid var(--color-border); border-radius: 6px; padding: 7px 10px; font: inherit; }
  button { cursor: pointer; } button:disabled { opacity: .5; cursor: default; }
  button[aria-pressed='true'] { border-color: var(--color-primary); background: var(--color-bg-light); }
  .rows { flex: 1; min-height: 0; overflow: auto; }
  section { border: 2px solid var(--color-border); border-radius: 10px; padding: 8px; margin-bottom: 10px; background: var(--color-panel); }
  section.active { border-color: var(--color-primary); }
  .row-heading { font-size: .8rem; margin-bottom: 5px; }
  .grid-scroll { overflow-x: auto; }
  .record-button { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; padding: 8px; }
  .record-button span { width: 16px; height: 16px; border-radius: 50%; background: #dc3545; }
  .record-button.recording span { border-radius: 2px; }
  footer { flex-shrink: 0; padding: 10px; border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-panel); font-size: .85rem; }
  label { display: flex; gap: 5px; align-items: center; } input { width: 70px; }
  @media (max-width: 600px) { header p { display: none; } footer { gap: 5px; padding: 6px; } button { padding: 6px; } }
</style>
