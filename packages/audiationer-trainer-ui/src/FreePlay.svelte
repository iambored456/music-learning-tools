<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import { CHROMATIC_NOTES } from '@mlt/compass-core';
  import { FREEPLAY_DEGREES, SOUND_PRESETS, FreeplaySession, normalizeFreeplaySettings, type FreeplayGesture, type FreeplaySettings, type FreeplayState } from '@mlt/audiationer-trainer-core';
  import MinimalWheel from './MinimalWheel.svelte';
  import Icon from './Icon.svelte';
  import { BrowserTrainerAudio } from './audio.ts';

  let { settings = $bindable(), onclose, onhelp }: { settings: FreeplaySettings; onclose: () => void; onhelp: () => void } = $props();
  let page = $state<'play' | 'settings'>('play');
  let chooseSound = $state(false);
  let keyOpen = $state(false);
  let keyPicker = $state<HTMLDivElement>();
  let playback = $state<FreeplayState>({ sounding: [], sustained: [], cycling: false, awake: false, error: null });
  const audio = new BrowserTrainerAudio(true);
  const session = new FreeplaySession(audio, normalizeFreeplaySettings({}), next => { playback = next; });
  const gestures = new Map<number, { x: number; y: number; dragged: boolean; handle: FreeplayGesture }>();
  const soundName = $derived(SOUND_PRESETS.find(preset => preset.id === settings.soundPreset)!.name);
  $effect(() => session.configure($state.snapshot(settings)));
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
  async function showSettings(value: boolean) {
    stop(); keyOpen = false; chooseSound = false; page = value ? 'settings' : 'play';
    await tick(); document.getElementById('at-page-heading')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }
  function selectKey(tonic: number) { settings.tonic = tonic; keyOpen = false; }
  function randomKey() { settings.tonic = (settings.tonic + 1 + Math.floor(Math.random() * 11)) % 12; }
  function outside(event: PointerEvent) { if (keyPicker && event.target instanceof Node && !keyPicker.contains(event.target)) keyOpen = false; }
  function visibility() { if (document.hidden) stop(); }
</script>

<svelte:window onblur={stop} onpagehide={stop} onpointerdown={outside} onkeydown={(event) => { if (event.key === 'Escape') { keyOpen = false; stop(); } }} />
<svelte:document onvisibilitychange={visibility} />

<section class="at-freeplay" aria-label={page === 'settings' ? 'Free Play settings' : 'Free Play'}>
  <div class="at-screen-heading">
    <button class="at-icon-button" aria-label={page === 'settings' ? 'Close Free Play settings' : 'Back to Audiationer Trainer'} onclick={() => page === 'settings' ? showSettings(false) : onclose()}><Icon name="close" size={27} /></button>
    <h1 id="at-page-heading" tabindex="-1">{page === 'settings' ? 'Settings' : 'Free Play'}</h1>
    <div class="at-practice-tools">{#if page === 'play'}<button class="at-icon-button" aria-label="Free Play guide" onclick={() => { stop(); onhelp(); }}><Icon name="help" size={25} /></button><button class="at-icon-button" aria-label="Free Play settings" onclick={() => showSettings(true)}><Icon name="sliders" size={26} /></button>{/if}</div>
  </div>
  {#if page === 'settings'}
    <div class="at-freeplay-settings">
      <p class="at-sound-preset">Sound preset: {soundName}</p>
      <button class="at-sound-change" aria-expanded={chooseSound} aria-controls="at-sound-presets" onclick={() => { chooseSound = !chooseSound; }}><Icon name="note" />Change</button>
      {#if chooseSound}<fieldset class="at-sound-presets" id="at-sound-presets"><legend>Choose a sound</legend>{#each SOUND_PRESETS as preset}<label><input type="radio" name="freeplay-sound" value={preset.id} bind:group={settings.soundPreset} />{preset.name}</label>{/each}</fieldset>{/if}
      <details class="at-freeplay-volume" open>
        <summary>Volume settings<Icon name="chevron" /></summary>
        <label class="at-field">Drone volume: {Math.round(settings.droneVolume * 100)}%<input aria-label="Drone volume" type="range" min="0" max="1" step="0.01" bind:value={settings.droneVolume} /></label>
        <label class="at-field">Melody volume: {Math.round(settings.melodyVolume * 100)}%<input aria-label="Melody volume" type="range" min="0" max="1" step="0.01" bind:value={settings.melodyVolume} /></label>
      </details>
    </div>
  {:else}
    <div class="at-session-chips"><button onclick={randomKey}>Random Key</button><button class:at-cycling={playback.cycling} aria-pressed={playback.cycling} onclick={() => { void session.toggleCycle(); }}>Cycle</button></div>
    <div class="at-freeplay-space"><p class="at-hint">Click to play. Drag to sustain. Click a sustained degree to stop it.</p></div>
    <div class="at-wheel-stage at-minimal">
      <MinimalWheel tonic={settings.tonic} scale="1" order="fifths" allowed={FREEPLAY_DEGREES} active={null} activeDegrees={playback.sounding} sustained={playback.sustained} enabled={true} ongesture={pointer} onanswer={(degree) => session.press(degree).finish(true)} />
      <button class="at-play-button at-wheel-centre" aria-label={playback.awake || playback.cycling ? 'Stop all notes and drone' : 'Play tonic drone'} onclick={() => playback.awake || playback.cycling ? stop() : session.playDrone()}><Icon name={playback.awake || playback.cycling ? 'pause' : 'play'} size={48} /></button>
    </div>
    <div class="at-freeplay-footer">
      <div class="at-key-picker" bind:this={keyPicker}><button class="at-key-button" aria-expanded={keyOpen} aria-controls="at-freeplay-keys" onclick={() => { keyOpen = !keyOpen; }}>Key of {CHROMATIC_NOTES[settings.tonic]}</button>
        {#if keyOpen}<div class="at-key-menu" id="at-freeplay-keys" role="group" aria-label="Choose a key">{#each CHROMATIC_NOTES as key, tonic}<button aria-pressed={settings.tonic === tonic} onclick={() => selectKey(tonic)}>{key}</button>{/each}</div>{/if}
      </div>
      <div class="at-octave"><span>Octave</span><div><button class="at-icon-button" aria-label="Lower octave" disabled={settings.octave <= 3} onclick={() => { settings.octave--; }}><Icon name="minus" /></button><span>{settings.octave}</span><button class="at-icon-button" aria-label="Higher octave" disabled={settings.octave >= 6} onclick={() => { settings.octave++; }}><Icon name="plus" /></button></div></div>
      <span aria-hidden="true"></span>
    </div>
    {#if playback.error}<p class="at-error" role="alert">{playback.error}</p>{/if}
  {/if}
</section>
