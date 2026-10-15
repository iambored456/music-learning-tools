<script lang="ts">
  import { FIXED_INTERVAL_COLOUR } from '@mlt/compass-core';
  import { CHORD_QUALITIES, DIFFICULTIES, GAME_MODES, challengePresetGroups, degreeLabel, difficultyIndex, isScored, pathPresetGroups, progressKey, type CustomPreset, type GameMode, type Preset, type Progress, type Settings } from '@mlt/audiationer-trainer-core';
  import Icon from './Icon.svelte';
  import Gem from './Gem.svelte';
  import Gems from './Gems.svelte';
  let { settings, progress, custom, onmode, ondifficulty, onchoose, oncustom, onedit, ondelete, onadd }: {
    settings: Settings; progress: Progress; custom: CustomPreset[];
    onmode: (mode: GameMode) => void; ondifficulty: (seconds: number) => void;
    onchoose: (preset: Preset) => void; oncustom: (preset: CustomPreset) => void;
    onedit: (preset: CustomPreset) => void; ondelete: (id: string) => void; onadd: () => void;
  } = $props();
  let tab = $state('path');
  const tabs = [{ id: 'path', name: 'The Path' }, { id: 'challenges', name: 'Challenges' }, { id: 'custom', name: 'Custom' }];
  const colours: Record<number, string> = FIXED_INTERVAL_COLOUR;
  const difficulty = $derived(difficultyIndex(settings.answerSeconds));
  const groups = $derived(tab === 'path' ? pathPresetGroups(settings.mode) : challengePresetGroups(settings.mode));
  const saved = $derived(custom.filter(p => p.settings.mode === settings.mode));
  function tabKeys(event: KeyboardEvent) {
    const current = tabs.findIndex(t => t.id === tab);
    const index = event.key === 'ArrowRight' ? (current + 1) % 3 : event.key === 'ArrowLeft' ? (current + 2) % 3 : event.key === 'Home' ? 0 : event.key === 'End' ? 2 : -1;
    if (index < 0) return;
    event.preventDefault(); tab = tabs[index].id;
    document.getElementById(`at-tab-${tab}`)?.focus();
  }
</script>

{#snippet contents(preset: Preset)}
  <span class="at-preset-copy"><span class="at-preset-name">{preset.name}</span>
    {#if settings.mode === 'quality'}<span class="at-preset-subtitle">{preset.patch.qualities?.map(q => CHORD_QUALITIES[q].name).join(' · ')}</span>
    {:else}<span class="at-degree-strip" aria-label="Scale degrees">{#each preset.patch.degrees ?? [] as degree}<span style={`--degree-colour:${colours[degree]}`}>{degreeLabel(degree, preset.patch.scale ?? settings.scale)}</span>{/each}</span>{/if}
  </span>
{/snippet}

<section class="at-presets" class:at-scored-presets={isScored(settings.mode)} style:--at-level-colour={isScored(settings.mode) ? DIFFICULTIES[difficulty].colour : undefined} aria-label="Practice presets">
  <label class="at-mode-select at-pill"><span class="at-mode-icon"><Icon name={settings.mode === 'degrees' ? 'note' : settings.mode} size={28} /></span><select aria-label="Game mode" value={settings.mode} onchange={(event) => onmode(event.currentTarget.value as GameMode)}>{#each GAME_MODES.filter(mode => mode.id !== 'cycle') as mode}<option value={mode.id}>{mode.name}</option>{/each}</select><Icon name="chevron" /></label>
  {#if isScored(settings.mode)}
    <div class="at-difficulty-card at-pill">
      <div><h2>Select Difficulty</h2><p>{DIFFICULTIES[difficulty].name}<span>{DIFFICULTIES[difficulty].detail}</span></p></div>
      <div class="at-difficulty-gems" role="group" aria-label="Difficulty">
        {#each DIFFICULTIES as item, i}<button class="at-gem-button" title={`${item.name}: ${item.detail}`} aria-label={`${item.name}: ${item.detail}`} aria-pressed={difficulty === i} onclick={() => ondifficulty(item.seconds)}><Gem lit={i <= difficulty} colour={DIFFICULTIES[difficulty].colour} /></button>{/each}
      </div>
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
          <button class="at-custom-choice" onclick={() => oncustom(preset)}>{@render contents({ id: preset.id, name: preset.name, patch: preset.settings })}{#if isScored(settings.mode)}<Gems value={earned} />{/if}</button>
          <div class="at-custom-tools"><button class="at-icon-button" aria-label={`Edit ${preset.name}`} onclick={() => onedit(preset)}><Icon name="edit" size={19} /></button><button class="at-icon-button" aria-label={`Delete ${preset.name}`} onclick={() => ondelete(preset.id)}><Icon name="trash" size={19} /></button></div>
        </div>
      {/each}</div>
    {:else}
      {#key `${settings.mode}-${tab}`}{#each groups as group (group.id)}
        <details class="at-preset-group" open><summary class="at-section-heading"><h2>{group.name}</h2><Icon name="chevron" /></summary>
          <div class="at-preset-list">{#each group.presets as preset (preset.id)}
            {@const earned = isScored(settings.mode) ? progress[progressKey(settings.mode, preset.id)] ?? 0 : 0}
            <button class="at-preset-row at-pill" onclick={() => onchoose(preset)}>{@render contents(preset)}{#if isScored(settings.mode)}<Gems value={earned} />{:else}<Icon name="play" size={18} />{/if}</button>
          {/each}</div>
        </details>
      {/each}{/key}
    {/if}
  </div>
  {#if isScored(settings.mode)}<p class="at-progress-note">All levels use {DIFFICULTIES[difficulty].name} difficulty. Gems show your highest completed difficulty. Complete a session with at least 80% accuracy to earn its gems.</p>{/if}
</section>
