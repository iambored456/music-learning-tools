<script lang="ts">
  import type { Snippet } from 'svelte';
  import { CHORD_QUALITIES, GAME_MODES, allowedDegrees, challengePresetGroups, difficultyFor, difficultyRank, gemAward, exerciseMode, isChordMode, isScored, levelAccess, pathPresetGroups, progressKey, type CustomPreset, type GameMode, type LevelLocks, type Preset, type Progress, type Settings } from '@mlt/audiationer-trainer-core';
  import Icon from './Icon.svelte';
  import DifficultyCard from './DifficultyCard.svelte';
  import Gems from './Gems.svelte';
  import DegreeBelt from './DegreeBelt.svelte';
  import { modeIcon, modePair } from './modePairs.ts';
  let { settings = $bindable(), progress, locks, custom, homeButton, onsettings, onchoose, oncustom, onedit, ondelete, onadd }: {
    settings: Settings; progress: Progress; locks: LevelLocks; custom: CustomPreset[];
    homeButton: Snippet;
    onsettings: () => void;
    onchoose: (preset: Preset, mode?: GameMode) => void; oncustom: (preset: CustomPreset, mode?: GameMode) => void;
    onedit: (preset: CustomPreset) => void; ondelete: (id: string) => void; onadd: () => void;
  } = $props();
  let tab = $state('path');
  const tabs = [{ id: 'path', name: 'Levels' }, { id: 'challenges', name: 'Challenges' }, { id: 'custom', name: 'Custom' }];
  const difficulty = $derived(gemAward(difficultyRank(settings)));
  const exercise = $derived(exerciseMode(settings));
  const pocket = $derived(settings.mode === 'pocket');
  const pair = $derived(modePair(exercise));
  const combined = $derived(!!pair);
  const exercises = $derived(GAME_MODES.filter(mode => pair?.modes.some(member => member === mode.id)));
  const modeName = $derived(`${pocket ? 'Pocket Mode · ' : ''}${pair?.name ?? GAME_MODES.find(mode => mode.id === exercise)!.name}`);
  const groups = $derived(tab === 'path' ? pathPresetGroups(exercise) : challengePresetGroups(exercise));
  const saved = $derived(custom.filter(p => {
    if ((p.settings.mode === 'pocket') !== pocket) return false;
    const mode = exerciseMode(p.settings);
    return pair ? pair.modes.some(member => member === mode) : mode === exercise;
  }));
  function tabKeys(event: KeyboardEvent) {
    const current = tabs.findIndex(t => t.id === tab);
    const index = event.key === 'ArrowRight' ? (current + 1) % 3 : event.key === 'ArrowLeft' ? (current + 2) % 3 : event.key === 'Home' ? 0 : event.key === 'End' ? 2 : -1;
    if (index < 0) return;
    event.preventDefault(); tab = tabs[index].id;
    document.getElementById(`at-tab-${tab}`)?.focus();
  }
</script>

{#snippet lockMessage(prerequisite: string)}
  <span class="at-level-lock-note"><Icon name="lock" size={16} /><span>Earn a gem in {prerequisite} to unlock.</span></span>
{/snippet}

{#snippet contents(preset: Preset, earned: number, prerequisite: string | null = null)}
  <span class="at-preset-copy">
    <span class="at-preset-heading"><span class="at-preset-name">{preset.name}</span>{#if isScored(settings.mode)}<Gems value={earned} />{:else}<Icon name="play" size={18} />{/if}</span>
    {#if exercise === 'quality'}<span class="at-preset-subtitle">{preset.patch.qualities?.map(q => CHORD_QUALITIES[q].name).join(' · ')}</span>
    {:else}<DegreeBelt degrees={allowedDegrees({ ...settings, ...preset.patch, mode: settings.mode })} scale={preset.patch.scale ?? settings.scale} chords={isChordMode(exercise)} />{/if}
    {#if prerequisite}{@render lockMessage(prerequisite)}{/if}
  </span>
{/snippet}

{#snippet levelCard(preset: Preset, customPreset?: CustomPreset)}
  {@const choices = exercises.map(mode => ({ mode, access: levelAccess(pocket ? 'pocket' : mode.id, preset.id, progress, locks) }))}
  {@const locked = choices.every(choice => !choice.access.unlocked)}
  <article class="at-level-card at-pill" class:at-level-locked={locked} aria-label={`${preset.name}${locked ? ' (locked)' : ''}`}>
    <div class="at-level-copy">
      <h3>{preset.name}</h3>
      <DegreeBelt degrees={allowedDegrees({ ...settings, ...preset.patch, mode: settings.mode })} scale={preset.patch.scale ?? settings.scale} chords={isChordMode(exercise)} />
      {#if customPreset}
        <div class="at-custom-tools"><button class="at-icon-button" aria-label={`Edit ${preset.name}`} onclick={() => onedit(customPreset)}><Icon name="edit" size={19} /></button><button class="at-icon-button" aria-label={`Delete ${preset.name}`} onclick={() => ondelete(preset.id)}><Icon name="trash" size={19} /></button></div>
      {/if}
    </div>
    <div class="at-level-exercises">
      {#each choices as { mode, access }}
        {@const earned = progress[progressKey(mode.id, preset.id)] ?? 0}
        <button class="at-level-mode" class:at-level-mode-locked={!access.unlocked} data-mode={mode.id} disabled={!access.unlocked} aria-label={access.prerequisite ? `${preset.name}: ${mode.name} is locked. Earn a ${mode.name} gem in ${access.prerequisite.name} to unlock.` : pocket ? `${preset.name}: listen to ${mode.name} in Pocket Mode` : `${preset.name}: practise ${mode.name} at ${gemAward(difficultyRank(difficultyFor(settings, mode.id))).name} difficulty, ${earned ? `${gemAward(earned).name} completed` : 'no completed difficulty yet'}`} onclick={() => customPreset ? oncustom(customPreset, mode.id) : onchoose(preset, mode.id)}>
          <span class="at-level-mode-name"><span class="at-level-mode-label">{mode.name}</span><Icon name={access.unlocked ? modeIcon(mode.id) : 'lock'} size={56} /></span>
          {#if pocket}<span class="at-no-touch"><Icon name="no-touch" size={20} /><span>No Touch</span></span>{:else}<Gems value={earned} />{/if}
          {#if access.prerequisite}<span class="at-level-unlock-hint">Earn a gem in {access.prerequisite.name}.</span>{/if}
        </button>
      {/each}
    </div>
  </article>
{/snippet}

<section class="at-presets" class:at-scored-presets={isScored(settings.mode)} style:--at-level-colour={isScored(settings.mode) ? difficulty.colour : undefined} aria-label="Practice presets">
  <div class="at-mode-card at-pill">
    {@render homeButton()}
    <span class="at-mode-name" class:at-combined-title={combined}>
      {#if pair}<span class="at-mode-icon" data-mode={pair.modes[0]}><Icon name={modeIcon(pair.modes[0])} size={24} /></span>{/if}
      {#if !combined}<span class="at-mode-icon"><Icon name={exercise} size={28} /></span>{/if}
      <span>{modeName}</span>
      {#if pair}<span class="at-mode-icon" data-mode={pair.modes[1]}><Icon name={modeIcon(pair.modes[1])} size={24} /></span>{/if}
    </span>
    <button class="at-icon-button" aria-label={`${modeName} settings`} title={`${modeName} settings`} onclick={onsettings}><span class="at-gear-icon" aria-hidden="true"></span></button>
  </div>
  <DifficultyCard bind:settings />
  <p class="at-level-explainer">Choose a level.{#if pair?.id === 'degrees-melody'} 'Degrees' practices one note at a time, 'Melody' practices multiple notes.{:else if pair?.id === 'chords-progressions'} 'Chords' practices one chord at a time, 'Chord Progressions' practices multiple chords.{/if}</p>
  <div class="at-tabs" role="tablist" aria-label="Preset collections">
    {#each tabs as item}<button role="tab" id={`at-tab-${item.id}`} aria-selected={tab === item.id} aria-controls="at-preset-panel" tabindex={tab === item.id ? 0 : -1} onclick={() => { tab = item.id; }} onkeydown={tabKeys}>{item.name}</button>{/each}
  </div>
  <div class="at-preset-panel" id="at-preset-panel" role="tabpanel" aria-labelledby={`at-tab-${tab}`} tabindex="0">
    {#if tab === 'custom'}
      <div class="at-section-heading"><h2>Custom</h2><button class="at-icon-button" aria-label="Create custom preset" onclick={onadd}><Icon name="plus" size={28} /></button></div>
      {#if !saved.length}<div class="at-empty"><Icon name="sliders" size={38} /><p>Your own way to practise.</p><span>Choose degrees, a key, and the sounds you want to work with.</span><button onclick={onadd}>Create a preset</button></div>{/if}
      <div class="at-preset-list" class:at-combined-levels={combined}>{#each saved as preset (preset.id)}
        {#if combined}
          {@render levelCard({ id: preset.id, name: preset.name, patch: preset.settings }, preset)}
        {:else}
        {@const earned = isScored(settings.mode) ? progress[progressKey(settings.mode, preset.id)] ?? 0 : 0}
        <div class="at-custom-row at-pill">
          <button class="at-custom-choice" onclick={() => oncustom(preset)}>{@render contents({ id: preset.id, name: preset.name, patch: preset.settings }, earned)}</button>
          <div class="at-custom-tools"><button class="at-icon-button" aria-label={`Edit ${preset.name}`} onclick={() => onedit(preset)}><Icon name="edit" size={19} /></button><button class="at-icon-button" aria-label={`Delete ${preset.name}`} onclick={() => ondelete(preset.id)}><Icon name="trash" size={19} /></button></div>
        </div>
        {/if}
      {/each}</div>
    {:else}
      {#key `${pair?.id ?? settings.mode}-${tab}`}{#each groups as group (group.id)}
        <details class="at-preset-group" open><summary class="at-section-heading"><h2>{group.name}</h2><Icon name="chevron" /></summary>
          <div class="at-preset-list" class:at-chromatic-progression={group.id === 'union'} class:at-combined-levels={combined}>{#each group.presets as preset (preset.id)}
            {#if combined}
              {@render levelCard(preset)}
            {:else}
            {@const earned = isScored(settings.mode) ? progress[progressKey(settings.mode, preset.id)] ?? 0 : 0}
            {@const access = levelAccess(settings.mode, preset.id, progress, locks)}
            <button class="at-preset-row at-pill" class:at-level-locked={!access.unlocked} disabled={!access.unlocked} onclick={() => onchoose(preset)}>{@render contents(preset, earned, access.prerequisite?.name ?? null)}</button>
            {/if}
          {/each}</div>
        </details>
      {/each}{/key}
    {/if}
  </div>
</section>
