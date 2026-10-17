<script lang="ts">
  import { QUESTIONS_PER_KEY, SOUND_PRESETS, WHEEL_VIEWS, degreeLabel, lessonTiming, setLessonTiming, setWheelView, wheelView, type Settings } from '@mlt/audiationer-trainer-core';
  import Icon from './Icon.svelte';
  import AutoContinueSettings from './AutoContinueSettings.svelte';
  import ReviewSettings from './ReviewSettings.svelte';
  import TimingTimeline from './TimingTimeline.svelte';
  let { settings = $bindable(), custom = false }: { settings: Settings; custom?: boolean } = $props();
  let chooseSound = $state(false);
  const options = $derived(settings.degreeOptions);
  const soundName = $derived(SOUND_PRESETS.find(sound => sound.id === options.soundPreset)!.name);
  const timing = $derived(lessonTiming(settings));
</script>

{#snippet toggle(name: string, value: boolean, change: (value: boolean) => void)}
  <div class="at-settings-segment at-settings-binary" role="group" aria-label={name}>
    {#each [true, false] as option}<button type="button" aria-pressed={value === option} onclick={() => change(option)}>{option ? 'Yes' : 'No'}</button>{/each}
  </div>
{/snippet}

<div class="at-mode-settings">
  <section class="at-mode-setting" aria-label="Sound preset">
    <h3>Sound preset: {soundName}</h3>
    <button type="button" class="at-sound-change" aria-expanded={chooseSound} aria-controls="at-degrees-sounds" onclick={() => { chooseSound = !chooseSound; }}><Icon name="note" />Change</button>
    {#if chooseSound}<fieldset class="at-sound-presets" id="at-degrees-sounds"><legend>Choose a sound</legend>{#each SOUND_PRESETS as sound}<label><input type="radio" name="degrees-sound" value={sound.id} bind:group={options.soundPreset} />{sound.name}</label>{/each}</fieldset>{/if}
  </section>

  <AutoContinueSettings bind:settings />

  <ReviewSettings bind:settings />
  <TimingTimeline {settings} ontiming={(timing) => { settings.timings = { ...settings.timings, [settings.mode]: timing }; }} />

  <section class="at-mode-setting" aria-labelledby="at-degrees-cadence">
    <h3 id="at-degrees-cadence">Play a melody before each key change</h3>
    <p>Helps your ear adjust to the new tonic.</p>
    {@render toggle('Play a melody before each key change', timing.tonicizationEnabled, value => setLessonTiming(settings, { tonicizationEnabled: value }))}
  </section>

  <label class="at-field at-mode-setting">Session length<select bind:value={settings.rounds}>{#each [...new Set([5, 10, 20, 40, settings.rounds])].sort((a, b) => a - b) as rounds}<option value={rounds}>{rounds} questions</option>{/each}</select></label>

  <details class="at-settings-section" open>
    <summary>Volume settings<Icon name="chevron" /></summary>
    <label class="at-mode-setting at-settings-slider">Drone volume: {Math.round(options.droneVolume * 100)}%<input aria-label="Degrees drone volume" type="range" min="0" max="1" step="0.01" bind:value={options.droneVolume} /></label>
    <label class="at-mode-setting at-settings-slider">Melody volume: {Math.round(options.melodyVolume * 100)}%<input aria-label="Degrees melody volume" type="range" min="0" max="1" step="0.01" bind:value={options.melodyVolume} /></label>
  </details>

  <details class="at-settings-section" open>
    <summary>Advanced settings<Icon name="chevron" /></summary>
    <label class="at-field at-mode-setting">Questions per key<select bind:value={settings.questionsPerKey}>{#each [...new Set([...QUESTIONS_PER_KEY, settings.questionsPerKey])].sort((a, b) => a - b) as count}<option value={count}>{count}</option>{/each}</select></label>
    <label class="at-field at-mode-setting">Wheel view<select value={wheelView(settings)} onchange={(event) => setWheelView(settings, event.currentTarget.value)}>{#each WHEEL_VIEWS as view}<option value={view.id}>{view.name}</option>{/each}</select></label>
    <section class="at-mode-setting" aria-labelledby="at-degrees-time">
      <h3 id="at-degrees-time">Show time left to answer</h3>
      <p>Can be distracting for some users. Shown only for games and difficulties with a time limit.</p>
      {@render toggle('Show time left to answer', options.showTimeLeft, value => { options.showTimeLeft = value; })}
    </section>
  </details>

  {#if custom}
    <fieldset class="at-check-list"><legend>Degrees to practise</legend><div class="at-degree-options">{#each Array.from({ length: 12 }, (_, degree) => degree) as degree}<label><input type="checkbox" checked={settings.degrees.includes(degree)} onchange={() => { settings.degrees = settings.degrees.includes(degree) ? settings.degrees.filter(d => d !== degree) : [...settings.degrees, degree].sort((a, b) => a - b); }} />{degreeLabel(degree, settings.scale)}</label>{/each}</div></fieldset>
  {/if}
</div>
