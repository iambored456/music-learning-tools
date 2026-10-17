<script lang="ts">
  import type { Snippet } from 'svelte';
  import { CHORD_QUALITIES, DIFFICULTIES, GAME_MODES, POCKET_EXERCISES, allowedDegrees, challengePresetGroups, difficultyIndex, exerciseMode, isChordMode, isScored, levelAccess, pathPresetGroups, progressKey, type CustomPreset, type GameMode, type LevelLocks, type Preset, type Progress, type Settings } from '@mlt/audiationer-trainer-core';
  import Icon from './Icon.svelte';
  import DifficultyCard from './DifficultyCard.svelte';
  import Gems from './Gems.svelte';
  import DegreeBelt from './DegreeBelt.svelte';
  import { modeIcon, modePair } from './modePairs.ts';
  let { settings, progress, locks, custom, homeButton, onsettings, ondifficulty, onchoose, oncustom, onedit, ondelete, onadd }: {
    settings: Settings; progress: Progress; locks: LevelLocks; custom: CustomPreset[];
    homeButton: Snippet;
    onsettings: () => void; ondifficulty: (seconds: number) => void;
    onchoose: (preset: Preset, mode?: GameMode) => void; oncustom: (preset: CustomPreset, mode?: GameMode) => void;
    onedit: (preset: CustomPreset) => void; ondelete: (id: string) => void; onadd: () => void;
  } = $props();
  let tab = $state('path');
  const tabs = [{ id: 'path', name: 'Levels' }, { id: 'challenges', name: 'Challenges' }, { id: 'custom', name: 'Custom' }];
  const difficulty = $derived(difficultyIndex(settings.answerSeconds));
  const pair = $derived(modePair(settings.mode));
  const combined = $derived(!!pair);
  const exercises = $derived(GAME_MODES.filter(mode => pair?.modes.some(member => member === mode.id)));
  const modeName = $derived(pair?.name ?? GAME_MODES.find(mode => mode.id === settings.mode)!.name);
  const exercise = $derived(exerciseMode(settings));
  const groups = $derived(tab === 'path' ? pathPresetGroups(exercise) : challengePresetGroups(exercise));
  const saved = $derived(custom.filter(p => pair ? pair.modes.some(mode => mode === p.settings.mode) : p.settings.mode === settings.mode && (settings.mode !== 'pocket' || p.settings.pocket.exercise === settings.pocket.exercise)));
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
  {@const access = levelAccess(settings.mode, preset.id, progress, locks)}
  <article class="at-level-card at-pill" class:at-level-locked={!access.unlocked} aria-label={`${preset.name}${access.unlocked ? '' : ' (locked)'}`}>
    <div class="at-level-copy">
      <h3>{preset.name}</h3>
      <DegreeBelt degrees={allowedDegrees({ ...settings, ...preset.patch, mode: settings.mode })} scale={preset.patch.scale ?? settings.scale} chords={isChordMode(settings.mode)} />
      {#if access.prerequisite}{@render lockMessage(access.prerequisite.name)}{/if}
    </div>
    <div class="at-level-exercises">
      {#each exercises as mode}
        {@const earned = progress[progressKey(mode.id, preset.id)] ?? 0}
        <button class="at-level-mode" data-mode={mode.id} disabled={!access.unlocked} aria-label={access.prerequisite ? `${preset.name} is locked. Earn a gem in ${access.prerequisite.name} to unlock.` : `${preset.name}: practise ${mode.name} at ${DIFFICULTIES[difficulty].name} difficulty, ${earned ? `${DIFFICULTIES[earned - 1].name} completed` : 'no completed difficulty yet'}`} onclick={() => customPreset ? oncustom(customPreset, mode.id) : onchoose(preset, mode.id)}>
          <span class="at-level-mode-name"><span class="at-level-mode-label">{mode.name}</span><Icon name={modeIcon(mode.id)} size={56} /></span>
          <Gems value={earned} />
        </button>
      {/each}
    </div>
    {#if customPreset}
      <div class="at-custom-tools"><button class="at-icon-button" aria-label={`Edit ${preset.name}`} onclick={() => onedit(customPreset)}><Icon name="edit" size={19} /></button><button class="at-icon-button" aria-label={`Delete ${preset.name}`} onclick={() => ondelete(preset.id)}><Icon name="trash" size={19} /></button></div>
    {/if}
  </article>
{/snippet}

<section class="at-presets" class:at-scored-presets={isScored(settings.mode)} style:--at-level-colour={isScored(settings.mode) ? DIFFICULTIES[difficulty].colour : undefined} aria-label="Practice presets">
  <div class="at-mode-card at-pill">
    {@render homeButton()}
    <span class="at-mode-name" class:at-combined-title={combined}>
      {#if pair}<span class="at-mode-icon" data-mode={pair.modes[0]}><Icon name={modeIcon(pair.modes[0])} size={24} /></span>{/if}
      {#if !combined}<span class="at-mode-icon"><Icon name={settings.mode} size={28} /></span>{/if}
      <span>{modeName}</span>
      {#if pair}<span class="at-mode-icon" data-mode={pair.modes[1]}><Icon name={modeIcon(pair.modes[1])} size={24} /></span>{/if}
    </span>
    <button class="at-icon-button" aria-label={`${modeName} settings`} title={`${modeName} settings`} onclick={onsettings}><span class="at-gear-icon" aria-hidden="true"></span></button>
  </div>
  {#if settings.mode === 'pocket'}<label class="at-field at-pocket-exercise">Exercise<select bind:value={settings.pocket.exercise}>{#each POCKET_EXERCISES as item}<option value={item.id}>{item.name}</option>{/each}</select></label>{/if}
  {#if isScored(settings.mode)}
    <DifficultyCard seconds={settings.answerSeconds} onchange={ondifficulty} />
  {/if}
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
