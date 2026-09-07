<script lang="ts">
  import { onDestroy } from 'svelte';
  import { AudioPreview } from '@mlt/singing-trainer-core/services/audioPreview.js';
  import { preferencesStore } from '@mlt/singing-trainer-core/stores/preferencesStore.svelte.js';
  import { AUDIO_MASTER_CHANNELS, AUDIO_MASTER_MAX_PERCENT, getAudioMasterLevels, setAudioMasterLevel, type AudioMasterChannel } from '@mlt/singing-trainer-core/services/audioMixer.js';

  const labels: Record<AudioMasterChannel, string> = {
    tanpura: 'Tanpura', droneSynth: 'Sawtooth Drone', synth: 'Triangle Synth', countIn: 'Count-In', bassDrum: 'Bass Drum',
  };
  let levels = $state(getAudioMasterLevels());
  let saved = $state(true);
  let activePreview = $state<AudioMasterChannel | null>(null);
  let previewError = $state('');
  let preview: AudioPreview | null = null;
  let previewTimeout: ReturnType<typeof setTimeout> | undefined;
  const summary = $derived(AUDIO_MASTER_CHANNELS.map(channel => `${labels[channel]}: ${levels[channel]}%`).join(', '));

  function update(channel: AudioMasterChannel, value: number) {
    saved = setAudioMasterLevel(channel, value);
    levels = getAudioMasterLevels();
  }

  function stopPreview() {
    clearTimeout(previewTimeout);
    preview?.dispose();
    preview = null;
    activePreview = null;
  }

  async function togglePreview(channel: AudioMasterChannel) {
    const wasPlaying = activePreview === channel;
    stopPreview();
    previewError = '';
    if (wasPlaying) return;
    const player = new AudioPreview();
    preview = player;
    activePreview = channel;
    try {
      const duration = await player.play(channel, preferencesStore.speakingPitchMidi ?? 60);
      if (preview === player) previewTimeout = setTimeout(stopPreview, duration);
    } catch {
      if (preview === player) {
        stopPreview();
        previewError = 'Could not play the preview. Please try again.';
      }
    }
  }

  onDestroy(stopPreview);
</script>

<p>Adjust while playing. 100% is the tuned baseline; 0% mutes. Sawtooth is the synth drone; triangle is exercise feedback. Levels are saved in this browser.</p>
<div class="volume-controls">
  {#each AUDIO_MASTER_CHANNELS as channel}
    <label for={`master-volume-${channel}`}>{labels[channel]}</label>
    <input id={`master-volume-${channel}`} type="range" min="0" max={AUDIO_MASTER_MAX_PERCENT} step="1"
      value={levels[channel]} aria-valuetext={`${levels[channel]} percent`}
      oninput={event => update(channel, event.currentTarget.valueAsNumber)} />
    <output for={`master-volume-${channel}`}>{levels[channel]}%</output>
    <button type="button" aria-label={`${activePreview === channel ? 'Stop' : 'Play'} ${labels[channel]} preview`}
      aria-pressed={activePreview === channel} onclick={() => togglePreview(channel)}>
      {activePreview === channel ? 'Stop' : 'Play'}
    </button>
  {/each}
</div>
<label class="share-levels">Levels to share
  <textarea readonly rows="2" value={summary} onclick={event => event.currentTarget.select()}></textarea>
</label>
{#if !saved}<p role="status">Levels apply now, but this browser could not save them.</p>{/if}
{#if previewError}<p role="status">{previewError}</p>{/if}

<style>
  p { margin: 0; font-size: var(--font-size-sm); }
  .volume-controls { display: grid; grid-template-columns: auto minmax(0, 1fr) 4ch auto; gap: 12px; align-items: center; }
  button { min-width: 48px; padding: 6px; border: 1px solid var(--color-border); border-radius: 6px; background: var(--color-control); color: var(--color-text); font: inherit; cursor: pointer; }
  button[aria-pressed='true'] { border-color: var(--color-primary); }
  @media (max-width: 480px) { .volume-controls { gap: 6px; } }
  input { width: 100%; min-width: 0; accent-color: var(--color-primary); }
  output { text-align: right; font-variant-numeric: tabular-nums; }
  .share-levels { display: grid; gap: 6px; font-size: var(--font-size-sm); }
  textarea { box-sizing: border-box; width: 100%; resize: vertical; padding: 8px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-control); color: var(--color-text); font: inherit; }
</style>
