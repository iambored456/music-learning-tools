<script lang="ts">
  import { onDestroy } from 'svelte';
  import { GAME_MODES, TIMING_LIMITS, defaultLessonTiming, lessonTimeline, lessonTiming, midiNote, normalizeLessonTiming, wait,
    type LessonTiming, type Settings, type TimelineStage, type TimingField } from '@mlt/audiationer-trainer-core';
  import { BrowserTrainerAudio } from './audio.ts';
  import Icon from './Icon.svelte';

  let { settings, ontiming }: { settings: Settings; ontiming: (timing: LessonTiming) => void } = $props();
  let correct = $state(false);
  let keyChange = $state(true);
  let freeplayCycle = $state(true);
  let playing = $state(false);
  let currentStage = $state<string | null>(null);
  let error = $state('');
  let drag = $state<{ field: TimingField; y: number; value: number; beats?: number } | null>(null);
  let controller: AbortController | null = null;
  const audio = new BrowserTrainerAudio(true);
  const timing = $derived(lessonTiming(settings));
  const freeplay = $derived(settings.mode === 'freeplay' || settings.mode === 'cycle');
  const stages = $derived(lessonTimeline(settings, { correct, keyChange, freeplayCycle }));
  const modeName = $derived(GAME_MODES.find(mode => mode.id === settings.mode)!.name);
  const rows = $derived.by(() => {
    let elapsed: number | null = 0;
    return stages.map(stage => {
      const start = elapsed;
      elapsed = stage.seconds === null || elapsed === null ? null : elapsed + stage.seconds;
      return { ...stage, start };
    });
  });
  $effect(() => {
    JSON.stringify(settings); correct; keyChange; freeplayCycle;
    stop();
  });
  onDestroy(() => { stop(); audio.dispose(); });

  function stop() { controller?.abort(); controller = null; audio.stop(); playing = false; currentStage = null; }
  function change(field: TimingField, value: number) {
    const rounded = Number(value.toFixed(field === 'tonicizationBpm' ? 1 : 3));
    ontiming(normalizeLessonTiming({ ...timing, [field]: rounded }, timing));
  }
  function startDrag(event: PointerEvent, stage: TimelineStage) {
    if (!stage.field || event.button !== 0) return;
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    drag = { field: stage.field, y: event.clientY, value: timing[stage.field], beats: stage.beats };
  }
  function moveDrag(event: PointerEvent) {
    if (!drag) return;
    const seconds = (event.clientY - drag.y) / 48;
    change(drag.field, drag.beats ? 60 * drag.beats / Math.max(0.1, 60 * drag.beats / drag.value + seconds) : drag.value + seconds);
  }
  function endDrag(event: PointerEvent) {
    const target = event.currentTarget as HTMLElement;
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
    drag = null;
  }
  function keys(event: KeyboardEvent, field: TimingField) {
    const limit = TIMING_LIMITS[field];
    const direction = event.key === 'ArrowUp' || event.key === 'ArrowRight' ? 1 : event.key === 'ArrowDown' || event.key === 'ArrowLeft' ? -1 : 0;
    if (!direction && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    change(field, event.key === 'Home' ? limit.min : event.key === 'End' ? limit.max : timing[field] + direction * limit.step * (event.shiftKey ? 10 : 1));
  }
  async function preview() {
    stop(); error = '';
    const run = new AbortController(); controller = run; playing = true;
    const snapshot = $state.snapshot(settings), plan = $state.snapshot(stages);
    try {
      await audio.unlock(); run.signal.throwIfAborted();
      const options = snapshot.mode === 'pocket' ? snapshot.pocket : snapshot.mode === 'degrees' || snapshot.mode === 'freeplay' ? snapshot.degreeOptions : null;
      audio.separateDroneVolume(options !== null);
      audio.preset(options?.soundPreset ?? 'synth');
      audio.volume(options?.melodyVolume ?? snapshot.volume);
      const droneVolume = options?.droneVolume ?? snapshot.droneVolume;
      audio.drone(snapshot.mode !== 'quality' && (snapshot.drone || snapshot.mode === 'degrees') ? midiNote(snapshot.tonic, 3, 0) : null, droneVolume);
      for (const stage of plan) {
        run.signal.throwIfAborted(); currentStage = stage.id;
        const notes = async () => {
          for (const note of stage.notes ?? []) {
            await audio.notes(note.midis, note.seconds, run.signal);
            if (note.gapSeconds) await wait(note.gapSeconds * 1000, run.signal);
          }
        };
        if (stage.speech) await Promise.all([audio.speak(stage.speech, run.signal, snapshot.pocket.answerVolume), notes()]);
        else if (stage.notes) await notes();
        else await wait((stage.seconds ?? 1.5) * 1000, run.signal);
      }
    } catch (cause) {
      if (!run.signal.aborted) error = cause instanceof Error ? cause.message : 'Preview could not play.';
    } finally {
      if (controller === run) stop();
    }
  }
</script>

<svelte:window onpagehide={stop} onkeydown={(event) => { if (event.key === 'Escape') stop(); }} />

<section class="at-timing" aria-label={`${modeName} timing timeline`}>
  <div class="at-timing-heading"><h3>Timing timeline</h3><button type="button" onclick={() => ontiming(defaultLessonTiming(settings))}>Reset timing</button></div>
  <p class="at-hint">Saved for {modeName}. Drag a segment’s lower handle or enter a value. All question sounds share the same duration and spacing.</p>
  <div class="at-timing-options">
    {#if freeplay}
      <label class="at-field">Show<select bind:value={freeplayCycle}><option value={true}>Cycle</option><option value={false}>Tap and hold</option></select></label>
    {:else}
      {#if settings.mode !== 'pocket'}<label class="at-field">Answer outcome<select bind:value={correct}><option value={false}>Incorrect answer</option><option value={true}>Correct answer</option></select></label>{/if}
      {#if timing.tonicizationEnabled && settings.mode !== 'quality'}<label class="at-timing-check"><input type="checkbox" bind:checked={keyChange} />Key-change question</label>{/if}
    {/if}
    <button type="button" class="at-primary" onclick={() => playing ? stop() : void preview()}><Icon name={playing ? 'stop' : 'play'} size={18} />{playing ? 'Stop preview' : 'Play preview'}</button>
  </div>
  <p class="at-hint">Preview waits 1.5 s at manual steps and uses the full difficulty time limit. Dragging changes timing; event order stays fixed.</p>
  <ol class="at-timing-track">
    {#each rows as stage (stage.id)}
      <li class="at-timing-row" class:at-timing-current={currentStage === stage.id}>
        <span class="at-timing-time">{stage.start === null ? '↓' : `${stage.start.toFixed(2)} s`}</span>
        <div class="at-timing-segment" class:at-timing-wait={stage.seconds === null} style:min-height={`${Math.max(74, Math.min(360, (stage.seconds ?? 1.5) * 48))}px`}>
          <div class="at-timing-copy"><strong>{stage.name}</strong>{#if stage.detail}<span>{stage.detail}</span>{/if}</div>
          {#if stage.field}
            {@const field = stage.field}
            <label class="at-timing-value"><span class="at-sr-only">{stage.name}{field === 'tonicizationBpm' ? ' tempo' : ' duration'}</span><input type="number" min={TIMING_LIMITS[field].min} max={TIMING_LIMITS[field].max} step="any" value={Number(timing[field].toFixed(3))} onchange={(event) => change(field, event.currentTarget.valueAsNumber)} /><span>{field === 'tonicizationBpm' ? 'BPM' : 's'}</span></label>
            <button type="button" class="at-timing-handle" role="slider" aria-label={`Adjust ${stage.name}`} aria-valuemin={TIMING_LIMITS[field].min} aria-valuemax={TIMING_LIMITS[field].max} aria-valuenow={timing[field]} aria-valuetext={`${timing[field].toFixed(field === 'tonicizationBpm' ? 0 : 2)} ${field === 'tonicizationBpm' ? 'BPM' : 'seconds'}`} aria-orientation="vertical" onpointerdown={(event) => startDrag(event, stage)} onpointermove={moveDrag} onpointerup={endDrag} onpointercancel={endDrag} onkeydown={(event) => keys(event, field)}><span aria-hidden="true">━</span></button>
          {:else}<small>{stage.seconds === null ? stage.speech ? 'Until speech finishes' : 'Manual wait' : `Up to ${stage.seconds.toFixed(2)} s`}</small>{/if}
        </div>
      </li>
    {/each}
  </ol>
  {#if error}<p class="at-error" role="alert">{error}</p>{/if}
  <span class="at-sr-only" role="status">{playing ? `Preview: ${stages.find(stage => stage.id === currentStage)?.name ?? 'loading'}` : 'Preview stopped'}</span>
</section>
