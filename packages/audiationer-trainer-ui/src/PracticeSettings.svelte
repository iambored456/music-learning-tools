<script lang="ts">
  import { CHROMATIC_NOTES } from '@mlt/compass-core';
  import { CHORD_QUALITIES, SCALE_MODES, DIFFICULTIES, QUESTIONS_PER_KEY, WHEEL_VIEWS, allowedDegrees, chordLabel, degreeLabel, exerciseMode, isChordMode, isScored, lessonTiming, scaleDegrees, setLessonTiming, setWheelView, wheelView, type Settings } from '@mlt/audiationer-trainer-core';
  import AutoContinueSettings from './AutoContinueSettings.svelte';
  import ReviewSettings from './ReviewSettings.svelte';
  import TimingTimeline from './TimingTimeline.svelte';
  import { PITCH_COLOURS as colours } from './pitchColours.ts';
  let { settings = $bindable(), difficultyEditable = true }: { settings: Settings; difficultyEditable?: boolean } = $props();
  const exercise = $derived(exerciseMode(settings));
  const timing = $derived(lessonTiming(settings));
  function toggle(degree: number) {
    settings.degrees = settings.degrees.includes(degree) ? settings.degrees.filter(d => d !== degree) : [...settings.degrees, degree].sort((a, b) => a - b);
  }
</script>
{#if !isScored(settings.mode)}
  <div class="at-pair">
    <label class="at-field">Tonic<select bind:value={settings.tonic}>{#each CHROMATIC_NOTES as note, i}<option value={i}>{note}</option>{/each}</select></label>
    <label class="at-field">Octave<select bind:value={settings.octave}>{#each [2, 3, 4, 5, 6] as octave}<option value={octave}>{octave}</option>{/each}</select></label>
  </div>
{/if}
{#if exercise !== 'quality'}
  <label class="at-field">Scale mode<select bind:value={settings.scale} onchange={(event) => { settings.scale = event.currentTarget.value as Settings['scale']; settings.degrees = scaleDegrees(settings.scale); }}>{#each SCALE_MODES as mode}<option value={mode.id}>{mode.name}</option>{/each}</select></label>
  <details class="at-degree-dropdown">
    <summary><span>{isChordMode(exercise) ? 'Chords' : 'Degrees'} to practice</span><small>{allowedDegrees(settings).length} selected</small></summary>
    <div class="at-degree-menu">
      <div class="at-selection-heading"><button type="button" onclick={() => { settings.degrees = scaleDegrees(settings.scale); }}>Scale</button><button type="button" onclick={() => { settings.degrees = Array.from({ length: 12 }, (_, i) => i); }}>All</button></div>
      <div class="at-degree-options">
        {#each Array.from({ length: 12 }, (_, i) => i) as degree}
          {@const unavailable = isChordMode(exercise) && !scaleDegrees(settings.scale).includes(degree)}
          <label class:at-unavailable={unavailable} style={`--degree-colour:${colours[degree]}`}><input type="checkbox" checked={settings.degrees.includes(degree)} disabled={unavailable} onchange={() => toggle(degree)} /><span>{isChordMode(exercise) ? chordLabel(degree, settings.scale) : degreeLabel(degree, settings.scale)}</span></label>
        {/each}
      </div>
      {#if isChordMode(exercise)}<p class="at-hint">Only chords in the selected scale are used.</p>{/if}
    </div>
  </details>
{:else}
  <fieldset class="at-check-list"><legend>Chord qualities</legend>{#each CHORD_QUALITIES as quality, i}<label><input type="checkbox" checked={settings.qualities.includes(i)} onchange={() => { settings.qualities = settings.qualities.includes(i) ? settings.qualities.filter(q => q !== i) : [...settings.qualities, i]; }} />{quality.name}</label>{/each}</fieldset>
{/if}
{#if isScored(settings.mode)}
  <div class="at-pair">
    {#if difficultyEditable}<label class="at-field">Difficulty<select bind:value={settings.answerSeconds}>{#each DIFFICULTIES as difficulty}<option value={difficulty.seconds}>{difficulty.name} · {difficulty.seconds ? `${difficulty.seconds} s` : 'untimed'}</option>{/each}</select></label>{/if}
    <label class="at-field">Session length<select bind:value={settings.rounds}>{#each [...new Set([5, 10, 20, 40, settings.rounds])].sort((a,b) => a-b) as rounds}<option value={rounds}>{rounds} questions</option>{/each}</select></label>
  </div>
{/if}
{#if settings.mode === 'melody'}<label class="at-field">Melody length<select bind:value={settings.melodyLength}>{#each [2, 3, 4, 5, 6, 7, 8] as length}<option value={length}>{length} notes</option>{/each}</select></label>{/if}
{#if settings.mode === 'chord-progressions'}<label class="at-field">Progression length<select bind:value={settings.progressionLength}>{#each [2, 3, 4, 5, 6, 7, 8] as length}<option value={length}>{length} chords</option>{/each}</select></label>{/if}
{#if isScored(settings.mode)}<AutoContinueSettings bind:settings /><ReviewSettings bind:settings />{/if}
<TimingTimeline {settings} ontiming={(timing) => { settings.timings = { ...settings.timings, [settings.mode]: timing }; }} />
<details class="at-options"><summary>Sound & practice</summary>
  {#if isScored(settings.mode)}<label class="at-field">Questions per key<select bind:value={settings.questionsPerKey}>{#each [...new Set([...QUESTIONS_PER_KEY, settings.questionsPerKey])].sort((a, b) => a - b) as count}<option value={count}>{count}</option>{/each}</select></label>{/if}
  <label class="at-field">Wheel view<select value={wheelView(settings)} onchange={(event) => setWheelView(settings, event.currentTarget.value)}>{#each WHEEL_VIEWS as view}<option value={view.id}>{view.name}</option>{/each}</select></label>
  <label class="at-field">Volume<input type="range" min="0" max="1" step="0.05" bind:value={settings.volume} /></label>
  <div class="at-check-list">
    {#if !isScored(settings.mode)}<label><input type="checkbox" bind:checked={settings.randomTonic} disabled={settings.mode === 'freeplay'} />Random tonic</label>{/if}
    <label><input type="checkbox" bind:checked={settings.randomOctave} disabled={settings.mode === 'freeplay'} />Random octave (3–5)</label>
    <label><input type="checkbox" checked={timing.tonicizationEnabled} onchange={(event) => setLessonTiming(settings, { tonicizationEnabled: event.currentTarget.checked })} disabled={settings.mode === 'quality'} />Cadence on key change</label>
    <label><input type="checkbox" bind:checked={settings.resolve} disabled={settings.mode !== 'degrees' && settings.mode !== 'melody'} />Resolve correct answers</label>
    <label><input type="checkbox" bind:checked={settings.drone} disabled={settings.mode === 'quality'} />Tonic drone</label>
  </div>
  <label class="at-field">Drone volume: {Math.round(settings.droneVolume * 100)}%<input type="range" min="0" max="1" step="0.01" bind:value={settings.droneVolume} disabled={!settings.drone || settings.mode === 'quality'} /></label>
</details>
