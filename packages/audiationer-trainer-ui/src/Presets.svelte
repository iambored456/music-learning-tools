<script lang="ts">
  import { CHORD_QUALITIES, DIFFICULTIES, GAME_MODES, POCKET_EXERCISES, allowedDegrees, challengePresetGroups, difficultyIndex, exerciseMode, isScored, pathPresetGroups, progressKey, type CustomPreset, type Preset, type Progress, type Settings } from '@mlt/audiationer-trainer-core';
  import Icon from './Icon.svelte';
  import Gem from './Gem.svelte';
  import Gems from './Gems.svelte';
  import DegreeBelt from './DegreeBelt.svelte';
  let { settings, progress, custom, onsettings, ondifficulty, onchoose, oncustom, onedit, ondelete, onadd }: {
    settings: Settings; progress: Progress; custom: CustomPreset[];
    onsettings: () => void; ondifficulty: (seconds: number) => void;
    onchoose: (preset: Preset) => void; oncustom: (preset: CustomPreset) => void;
    onedit: (preset: CustomPreset) => void; ondelete: (id: string) => void; onadd: () => void;
  } = $props();
  let tab = $state('path');
  const tabs = [{ id: 'path', name: 'Progressions' }, { id: 'challenges', name: 'Challenges' }, { id: 'custom', name: 'Custom' }];
  const difficulty = $derived(difficultyIndex(settings.answerSeconds));
  const modeName = $derived(GAME_MODES.find(mode => mode.id === settings.mode)!.name);
  const exercise = $derived(exerciseMode(settings));
  const groups = $derived(tab === 'path' ? pathPresetGroups(exercise) : challengePresetGroups(exercise));
  const saved = $derived(custom.filter(p => p.settings.mode === settings.mode && (settings.mode !== 'pocket' || p.settings.pocket.exercise === settings.pocket.exercise)));
  function tabKeys(event: KeyboardEvent) {
    const current = tabs.findIndex(t => t.id === tab);
    const index = event.key === 'ArrowRight' ? (current + 1) % 3 : event.key === 'ArrowLeft' ? (current + 2) % 3 : event.key === 'Home' ? 0 : event.key === 'End' ? 2 : -1;
    if (index < 0) return;
    event.preventDefault(); tab = tabs[index].id;
    document.getElementById(`at-tab-${tab}`)?.focus();
  }
</script>

{#snippet contents(preset: Preset, earned: number)}
  <span class="at-preset-copy">
    <span class="at-preset-heading"><span class="at-preset-name">{preset.name}</span>{#if isScored(settings.mode)}<Gems value={earned} />{:else}<Icon name="play" size={18} />{/if}</span>
    {#if exercise === 'quality'}<span class="at-preset-subtitle">{preset.patch.qualities?.map(q => CHORD_QUALITIES[q].name).join(' · ')}</span>
    {:else}<DegreeBelt degrees={allowedDegrees({ ...settings, ...preset.patch, mode: settings.mode })} scale={preset.patch.scale ?? settings.scale} chords={exercise === 'chords'} />{/if}
  </span>
{/snippet}

<section class="at-presets" class:at-scored-presets={isScored(settings.mode)} style:--at-level-colour={isScored(settings.mode) ? DIFFICULTIES[difficulty].colour : undefined} aria-label="Practice presets">
  <div class="at-mode-card at-pill"><span class="at-mode-icon"><Icon name={settings.mode === 'degrees' ? 'note' : settings.mode} size={28} /></span><span class="at-mode-name">{modeName}</span><button class="at-icon-button" aria-label={`${modeName} settings`} title={`${modeName} settings`} onclick={onsettings}><span class="at-gear-icon" aria-hidden="true"></span></button></div>
  {#if settings.mode === 'pocket'}<label class="at-field at-pocket-exercise">Exercise<select bind:value={settings.pocket.exercise}>{#each POCKET_EXERCISES as item}<option value={item.id}>{item.name}</option>{/each}</select></label>{/if}
  {#if isScored(settings.mode)}
    <div class="at-difficulty-card at-pill">
      <div><h2>Select Difficulty</h2><p>{DIFFICULTIES[difficulty].name}<span>{DIFFICULTIES[difficulty].detail}</span></p></div>
      <div class="at-difficulty-gems" role="group" aria-label="Difficulty">
        {#each DIFFICULTIES as item, i}<button class="at-gem-button" title={`${item.name}: ${item.detail}`} aria-label={`${item.name}: ${item.detail}`} aria-pressed={difficulty === i} onclick={() => ondifficulty(item.seconds)}><Gem lit={i <= difficulty} colour={DIFFICULTIES[difficulty].colour} /></button>{/each}
      </div>
      <p class="at-difficulty-note">Score 80% or higher to earn a gem.</p>
    </div>
  {/if}
  <div class="at-tabs" role="tablist" aria-label="Preset collections">
    {#each tabs as item}<button role="tab" id={`at-tab-${item.id}`} aria-selected={tab === item.id} aria-controls="at-preset-panel" tabindex={tab === item.id ? 0 : -1} onclick={() => { tab = item.id; }} onkeydown={tabKeys}>{item.name}</button>{/each}
  </div>
  <div class="at-preset-panel" id="at-preset-panel" role="tabpanel" aria-labelledby={`at-tab-${tab}`} tabindex="0">
    {#if tab === 'custom'}
      <div class="at-section-heading"><h2>Custom</h2><button class="at-icon-button" aria-label="Create custom preset" onclick={onadd}><Icon name="plus" size={28} /></button></div>
      {#if !saved.length}<div class="at-empty"><Icon name="sliders" size={38} /><p>Your own way to practise.</p><span>Choose degrees, a key, and the sounds you want to work with.</span><button onclick={onadd}>Create a preset</button></div>{/if}
      <div class="at-preset-list">{#each saved as preset (preset.id)}
        {@const earned = isScored(settings.mode) ? progress[progressKey(settings.mode, preset.id)] ?? 0 : 0}
        <div class="at-custom-row at-pill">
          <button class="at-custom-choice" onclick={() => oncustom(preset)}>{@render contents({ id: preset.id, name: preset.name, patch: preset.settings }, earned)}</button>
          <div class="at-custom-tools"><button class="at-icon-button" aria-label={`Edit ${preset.name}`} onclick={() => onedit(preset)}><Icon name="edit" size={19} /></button><button class="at-icon-button" aria-label={`Delete ${preset.name}`} onclick={() => ondelete(preset.id)}><Icon name="trash" size={19} /></button></div>
        </div>
      {/each}</div>
    {:else}
      {#key `${settings.mode}-${tab}`}{#each groups as group (group.id)}
        <details class="at-preset-group" open><summary class="at-section-heading"><h2>{group.name}</h2><Icon name="chevron" /></summary>
          <div class="at-preset-list" class:at-chromatic-progression={group.id === 'union'}>{#each group.presets as preset (preset.id)}
            {@const earned = isScored(settings.mode) ? progress[progressKey(settings.mode, preset.id)] ?? 0 : 0}
            <button class="at-preset-row at-pill" onclick={() => onchoose(preset)}>{@render contents(preset, earned)}</button>
          {/each}</div>
        </details>
      {/each}{/key}
    {/if}
  </div>
</section>
