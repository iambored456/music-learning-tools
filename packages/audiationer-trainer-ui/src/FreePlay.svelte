<script lang="ts">
  import { onDestroy, type Snippet } from 'svelte';
  import { CHROMATIC_NOTES } from '@mlt/compass-core';
  import { FREEPLAY_DEGREES, SOUND_PRESETS, WHEEL_VIEWS, FreeplaySession, normalizeFreeplaySettings, type FreeplayGesture, type FreeplaySettings, type FreeplayState } from '@mlt/audiationer-trainer-core';
  import MinimalWheel from './MinimalWheel.svelte';
  import Icon from './Icon.svelte';
  import { BrowserTrainerAudio } from './audio.ts';

  let { settings = $bindable(), homeButton }: { settings: FreeplaySettings; homeButton: Snippet } = $props();
  let chooseSound = $state(false);
  const keyNames = CHROMATIC_NOTES.map(key => key.split('/').at(-1)!);
  let settingsDialog = $state<HTMLDialogElement>();
  let settingsOpen = $state(false);
  let helpDialog = $state<HTMLDialogElement>();
  let playback = $state<FreeplayState>({ sounding: [], sustained: [], cycling: false, awake: false, error: null });
  const audio = new BrowserTrainerAudio(true);
  const session = new FreeplaySession(audio, normalizeFreeplaySettings({}), next => { playback = next; });
  const gestures = new Map<number, { x: number; y: number; dragged: boolean; handle: FreeplayGesture }>();
  const soundName = $derived(SOUND_PRESETS.find(preset => preset.id === settings.soundPreset)!.name);
  $effect(() => session.configure($state.snapshot(settings)));
  $effect(() => { if (settingsOpen && settingsDialog && !settingsDialog.open) settingsDialog.showModal(); });
  onDestroy(() => { session.destroy(); audio.dispose(); });

  function stop() {
    for (const gesture of gestures.values()) gesture.handle.cancel();
    gestures.clear(); session.stopAll();
  }
  function pointer(degree: number, event: PointerEvent) {
    if (event.type === 'pointerdown') {
      if (event.button !== 0) return;
      event.preventDefault();
      (event.currentTarget as Element).setPointerCapture(event.pointerId);
      gestures.set(event.pointerId, { x: event.clientX, y: event.clientY, dragged: false, handle: session.press(degree) });
      return;
    }
    const gesture = gestures.get(event.pointerId);
    if (!gesture) return;
    if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) >= 8) gesture.dragged = true;
    if (event.type !== 'pointermove') {
      gestures.delete(event.pointerId);
      if (event.type === 'pointerup') gesture.handle.finish(gesture.dragged);
      else gesture.handle.cancel();
    }
  }
  function showSettings() { stop(); chooseSound = false; settingsOpen = true; }
  function showHelp() { stop(); helpDialog?.showModal(); }
  function randomKey() {
    if (!settings.randomTonic) return;
    settings.tonic = (settings.tonic + 1 + Math.floor(Math.random() * 11)) % 12;
  }
  function chooseRandom() { settings.randomTonic = true; randomKey(); }
  function visibility() { if (document.hidden) stop(); }
</script>

<svelte:window onblur={stop} onpagehide={stop} onkeydown={(event) => { if (event.key === 'Escape') stop(); }} />
<svelte:document onvisibilitychange={visibility} />

<section class="at-freeplay" aria-label="Free Play">
  <header class="at-header at-game-header at-freeplay-header">
    {@render homeButton()}
    <h1 id="at-page-heading" tabindex="-1">Free Play</h1>
    <div class="at-freeplay-tools">
      <button class="at-icon-button at-freeplay-help" aria-label="Free Play help" title="Free Play help" aria-haspopup="dialog" aria-controls="at-freeplay-help" onclick={showHelp}><Icon name="help" size={25} /></button>
      <button class="at-icon-button" aria-label="Free Play settings" title="Free Play settings" aria-haspopup="dialog" aria-controls="at-freeplay-settings" onclick={showSettings}><span class="at-gear-icon" aria-hidden="true"></span></button>
    </div>
  </header>
  {#snippet settingsContent()}
    <div class="at-freeplay-settings">
      <section class="at-key-options" aria-labelledby="at-freeplay-key-title">
        <h2 id="at-freeplay-key-title">Choose a key</h2>
        <button class="at-key-random" aria-pressed={settings.randomTonic} onclick={chooseRandom}><Icon name="shuffle" size={20} />Random</button>
        <div class="at-key-grid" role="group" aria-label="Key">
          {#each keyNames as key, tonic}<button aria-label={`Choose ${key}`} aria-pressed={!settings.randomTonic && settings.tonic === tonic} onclick={() => { settings.randomTonic = false; settings.tonic = tonic; }}>{key}</button>{/each}
        </div>
      </section>
      <p class="at-sound-preset">Sound preset: {soundName}</p>
      <button class="at-sound-change" aria-expanded={chooseSound} aria-controls="at-sound-presets" onclick={() => { chooseSound = !chooseSound; }}><Icon name="note" />Change</button>
      {#if chooseSound}<fieldset class="at-sound-presets" id="at-sound-presets"><legend>Choose a sound</legend>{#each SOUND_PRESETS as preset}<label><input type="radio" name="freeplay-sound" value={preset.id} bind:group={settings.soundPreset} />{preset.name}</label>{/each}</fieldset>{/if}
      <label class="at-field at-freeplay-wheel-view">Wheel view<select bind:value={settings.order}>{#each WHEEL_VIEWS.filter(view => view.wheelStyle === 'minimal') as view}<option value={view.order}>{view.name}</option>{/each}</select></label>
      <details class="at-freeplay-volume" open>
        <summary>Volume settings<Icon name="chevron" /></summary>
        <label class="at-field">Drone volume: {Math.round(settings.droneVolume * 100)}%<input aria-label="Drone volume" type="range" min="0" max="1" step="0.01" bind:value={settings.droneVolume} /></label>
        <label class="at-field">Melody volume: {Math.round(settings.melodyVolume * 100)}%<input aria-label="Melody volume" type="range" min="0" max="1" step="0.01" bind:value={settings.melodyVolume} /></label>
      </details>
    </div>
  {/snippet}
    <div class="at-session-chips"><button disabled={!settings.randomTonic} onclick={randomKey}>{settings.randomTonic ? 'Random Key' : `Key: ${keyNames[settings.tonic]}`}</button><button class:at-cycling={playback.cycling} aria-pressed={playback.cycling} onclick={() => { void session.toggleCycle(); }}>Cycle</button></div>
    <div class="at-wheel-stage at-minimal">
      <MinimalWheel tonic={settings.tonic} scale="1" order={settings.order} allowed={FREEPLAY_DEGREES} active={null} activeDegrees={playback.sounding} sustained={playback.sustained} enabled={true} ongesture={pointer} onanswer={(degree) => session.press(degree).finish(true)} />
      <button class="at-play-button at-wheel-centre" aria-label={playback.awake || playback.cycling ? 'Stop all notes and drone' : 'Play tonic drone'} onclick={() => playback.awake || playback.cycling ? stop() : session.playDrone()}><Icon name={playback.awake || playback.cycling ? 'pause' : 'play'} size={48} /></button>
    </div>
    <div class="at-freeplay-footer">
      <div class="at-octave"><span>Octave</span><div><button class="at-icon-button" aria-label="Lower octave" disabled={settings.octave <= 3} onclick={() => { settings.octave--; }}><Icon name="minus" /></button><span>{settings.octave}</span><button class="at-icon-button" aria-label="Higher octave" disabled={settings.octave >= 6} onclick={() => { settings.octave++; }}><Icon name="plus" /></button></div></div>
    </div>
    {#if playback.error}<p class="at-error" role="alert">{playback.error}</p>{/if}
  <dialog bind:this={settingsDialog} id="at-freeplay-settings" class="at-dialog" aria-labelledby="at-freeplay-settings-title" onclose={() => { settingsOpen = false; }}>
    <div class="at-dialog-heading"><h2 id="at-freeplay-settings-title">Free Play settings</h2><button class="at-icon-button" aria-label="Close Free Play settings" onclick={() => settingsDialog?.close()}><Icon name="close" /></button></div>
    {#if settingsOpen}{@render settingsContent()}{/if}
    <div class="at-dialog-actions"><button class="at-primary" onclick={() => settingsDialog?.close()}>Done</button></div>
  </dialog>
  <dialog bind:this={helpDialog} id="at-freeplay-help" class="at-dialog" aria-labelledby="at-freeplay-help-title" aria-describedby="at-freeplay-help-text">
    <div class="at-dialog-heading"><h2 id="at-freeplay-help-title">Free Play</h2><button class="at-icon-button" aria-label="Close Free Play help" onclick={() => helpDialog?.close()}><Icon name="close" /></button></div>
    <p id="at-freeplay-help-text">Click to play. Drag to sustain. Click a sustained degree to stop it.</p>
  </dialog>
</section>
