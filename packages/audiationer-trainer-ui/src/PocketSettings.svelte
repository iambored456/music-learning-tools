<script lang="ts">
  import { CHORD_QUALITIES, POCKET_EXERCISES, POCKET_QUESTIONS_PER_KEY, SCALE_MODES, SOUND_PRESETS, chordLabel, degreeLabel, scaleDegrees, type Settings } from '@mlt/audiationer-trainer-core';
  import Icon from './Icon.svelte';
  let { settings = $bindable() }: { settings: Settings } = $props();
  let chooseSound = $state(false);
  const p = $derived(settings.pocket);
  const soundName = $derived(SOUND_PRESETS.find(sound => sound.id === p.soundPreset)!.name);
  function toggleDegree(degree: number) {
    settings.degrees = settings.degrees.includes(degree) ? settings.degrees.filter(d => d !== degree) : [...settings.degrees, degree].sort((a, b) => a - b);
  }
</script>

{#snippet toggle(name: string, value: boolean, change: (value: boolean) => void)}
  <div class="at-settings-segment at-settings-binary" role="group" aria-label={name}>
    {#each [true, false] as option}<button type="button" aria-pressed={value === option} onclick={() => change(option)}>{option ? 'Yes' : 'No'}</button>{/each}
  </div>
{/snippet}

<div class="at-mode-settings">
  <section class="at-mode-setting" aria-label="Sound preset">
    <h3>Sound preset: {soundName}</h3>
    <button type="button" class="at-sound-change" aria-expanded={chooseSound} aria-controls="at-pocket-sounds" onclick={() => { chooseSound = !chooseSound; }}><Icon name="note" />Change</button>
    {#if chooseSound}<fieldset class="at-sound-presets" id="at-pocket-sounds"><legend>Choose a sound</legend>{#each SOUND_PRESETS as sound}<label><input type="radio" name="pocket-sound" value={sound.id} bind:group={p.soundPreset} />{sound.name}</label>{/each}</fieldset>{/if}
  </section>

  <section class="at-mode-setting" aria-labelledby="at-pocket-cadence">
    <h3 id="at-pocket-cadence">Play a melody before each key change</h3>
    <p>Helps your ear adjust to the new tonic.</p>
    {@render toggle('Play a melody before each key change', settings.cadence, value => { settings.cadence = value; })}
  </section>

  <label class="at-mode-setting at-settings-slider">Tempo: {p.tempo} BPM
    <span>Affects note length and the speed of the game.</span>
    <input aria-label="Pocket tempo" type="range" min="30" max="180" step="10" bind:value={p.tempo} />
  </label>

  <section class="at-mode-setting" aria-labelledby="at-pocket-length">
    <h3 id="at-pocket-length">Number of notes in melody</h3>
    <p>Choose the Melody exercise to practise sequences of up to five notes.</p>
    <div class="at-settings-segment" role="group" aria-label="Number of notes in melody">{#each [1, 2, 3, 4, 5] as length}<button type="button" disabled={p.exercise !== 'melody'} aria-pressed={p.melodyLength === length} onclick={() => { p.melodyLength = length; }}>{length}</button>{/each}</div>
  </section>

  <section class="at-mode-setting" aria-labelledby="at-pocket-repeats">
    <h3 id="at-pocket-repeats">Repeat question before answer</h3>
    <div class="at-settings-segment" role="group" aria-label="Question plays before answer">{#each [1, 2, 3, 4, 5] as count}<button type="button" aria-pressed={p.repeats === count} onclick={() => { p.repeats = count; }}>{count}</button>{/each}</div>
  </section>

  <label class="at-mode-setting at-settings-slider">Wait time before answer: {p.waitSeconds} s
    <span>Silent time to think about the answer.</span>
    <input aria-label="Wait time before answer" type="range" min="0" max="15" step="0.5" bind:value={p.waitSeconds} />
  </label>

  <section class="at-mode-setting" aria-labelledby="at-pocket-replays">
    <h3 id="at-pocket-replays">Replay question after answer</h3>
    <p>Hear the question again after the answer has been given.</p>
    <div class="at-settings-segment" role="group" aria-label="Question replays after answer">{#each [0, 1, 2, 3, 4] as count}<button type="button" aria-pressed={p.replays === count} onclick={() => { p.replays = count; }}>{count || 'No'}</button>{/each}</div>
  </section>

  <details class="at-settings-section" open>
    <summary>Volume settings<Icon name="chevron" /></summary>
    <label class="at-mode-setting at-settings-slider">Answer volume: {Math.round(p.answerVolume * 100)}%<input aria-label="Answer volume" type="range" min="0" max="1" step="0.01" bind:value={p.answerVolume} /></label>
    <label class="at-mode-setting at-settings-slider">Drone volume: {Math.round(p.droneVolume * 100)}%<input aria-label="Pocket drone volume" type="range" min="0" max="1" step="0.01" bind:value={p.droneVolume} /></label>
    <label class="at-mode-setting at-settings-slider">Melody volume: {Math.round(p.melodyVolume * 100)}%<input aria-label="Pocket melody volume" type="range" min="0" max="1" step="0.01" bind:value={p.melodyVolume} /></label>
  </details>

  <details class="at-settings-section" open>
    <summary>Advanced settings<Icon name="chevron" /></summary>
    <section class="at-mode-setting" aria-labelledby="at-pocket-key-count">
      <h3 id="at-pocket-key-count">Questions per key</h3>
      <p>Choose how many questions to play before changing to a new random key.</p>
      <div class="at-settings-segment" role="group" aria-label="Questions per key">{#each POCKET_QUESTIONS_PER_KEY as count}<button type="button" aria-pressed={p.questionsPerKey === count} onclick={() => { p.questionsPerKey = count; }}>{count}</button>{/each}</div>
    </section>
    <section class="at-mode-setting" aria-labelledby="at-pocket-notes-answer">
      <h3 id="at-pocket-notes-answer">Play notes with the answer</h3>
      <p>Play the notes alongside the spoken words. Useful for longer melodies.</p>
      {@render toggle('Play notes with the answer', p.notesWithAnswer, value => { p.notesWithAnswer = value; })}
    </section>
    <section class="at-mode-setting" aria-labelledby="at-pocket-speak">
      <h3 id="at-pocket-speak">Play answer after question</h3>
      <p>Choose No to practise without hearing the answer in words.</p>
      {@render toggle('Play answer after question', p.speakAnswer, value => { p.speakAnswer = value; })}
    </section>
  </details>

  <details class="at-settings-section">
    <summary>Exercise and octave<Icon name="chevron" /></summary>
    <label class="at-field">Exercise<select bind:value={p.exercise}>{#each POCKET_EXERCISES as exercise}<option value={exercise.id}>{exercise.name}</option>{/each}</select></label>
    <label class="at-field">Octave<select bind:value={settings.octave}>{#each [2, 3, 4, 5, 6] as octave}<option value={octave}>{octave}</option>{/each}</select></label>
    {#if p.exercise === 'quality'}
      <fieldset class="at-check-list"><legend>Chord qualities</legend>{#each CHORD_QUALITIES as quality, index}<label><input type="checkbox" checked={settings.qualities.includes(index)} onchange={() => { settings.qualities = settings.qualities.includes(index) ? settings.qualities.filter(q => q !== index) : [...settings.qualities, index]; }} />{quality.name}</label>{/each}</fieldset>
    {:else}
      <label class="at-field">Scale mode<select bind:value={settings.scale} onchange={(event) => { settings.scale = event.currentTarget.value as Settings['scale']; settings.degrees = scaleDegrees(settings.scale); }}>{#each SCALE_MODES as mode}<option value={mode.id}>{mode.name}</option>{/each}</select></label>
      <fieldset class="at-check-list"><legend>{p.exercise === 'chords' ? 'Chords to practise' : 'Degrees to practise'}</legend><div class="at-degree-options">{#each Array.from({ length: 12 }, (_, i) => i) as degree}{@const unavailable = p.exercise === 'chords' && !scaleDegrees(settings.scale).includes(degree)}<label class:at-unavailable={unavailable}><input type="checkbox" disabled={unavailable} checked={settings.degrees.includes(degree)} onchange={() => toggleDegree(degree)} />{p.exercise === 'chords' ? chordLabel(degree, settings.scale) : degreeLabel(degree, settings.scale)}</label>{/each}</div></fieldset>
    {/if}
    <div class="at-check-list"><label><input type="checkbox" bind:checked={settings.randomOctave} />Random octave (3–5)</label><label><input type="checkbox" bind:checked={settings.drone} />Tonic drone</label></div>
  </details>
</div>
