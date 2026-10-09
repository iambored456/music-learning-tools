<script lang="ts">
  import { getPitchByMidi } from '@mlt/pitch-data';
  let { minMidi = 57, maxMidi = 69, activeMidi = null, showLabels = false, showOctaveLabels = true, labelFontSize, visibleLabelMidi }: {
    minMidi?: number; maxMidi?: number; activeMidi?: number | null; showLabels?: boolean;
    labelFontSize?: number;
    showOctaveLabels?: boolean;
    /** With showLabels enabled, optionally show labels only on these keys. */
    visibleLabelMidi?: ReadonlySet<number>;
  } = $props();
  const isBlack = (midi: number) => [1, 3, 6, 8, 10].includes(midi % 12);
  const keys = $derived(Array.from({ length: Math.max(0, maxMidi - minMidi + 1) }, (_, i) => minMidi + i));
  const whites = $derived(keys.filter(midi => !isBlack(midi)));
  const labelVisible = (midi: number) => showLabels && (visibleLabelMidi === undefined || visibleLabelMidi.has(midi));
  const hasVisibleLabels = $derived(keys.some(labelVisible));
  const formatLabel = (name: string | undefined) => showOctaveLabels ? name : name?.replace(/-?\d+$/, '');
</script>

<div class="keyboard" role="img" style:font-size={labelFontSize === undefined ? undefined : `${labelFontSize}px`}
  aria-label={`Piano keyboard from ${getPitchByMidi(minMidi)?.flatName} to ${getPitchByMidi(maxMidi)?.flatName}${hasVisibleLabels ? ', with labelled keys' : ''}; the sounding key is highlighted`}>
  {#each whites as midi}
    <div class:active={activeMidi === midi} class="white key" data-midi={midi}>
      {#if labelVisible(midi)}<span class="key-label">{formatLabel(getPitchByMidi(midi)?.flatName)}</span>{/if}
    </div>
  {/each}
  {#each keys.filter(isBlack) as midi}
    <div class:active={activeMidi === midi} class="black key" data-midi={midi}
      style:left={`${whites.filter(white => white < midi).length / whites.length * 100}%`} style:width={`${(showLabels ? 75 : 65) / whites.length}%`}>
      {#if labelVisible(midi)}
        <span class="key-label"><span>{formatLabel(getPitchByMidi(midi)?.sharpName)}</span><span>{formatLabel(getPitchByMidi(midi)?.flatName)}</span></span>
      {/if}
    </div>
  {/each}
</div>

<style>
  .keyboard { position: relative; display: flex; width: 100%; height: var(--piano-keyboard-height, clamp(5rem, 12vw, 8rem)); border: 2px solid #343b43; border-radius: .4rem; overflow: hidden; box-sizing: border-box; container-type: inline-size; font-size: clamp(.35rem, 2.2cqi, .85rem); }
  .white { position: relative; flex: 1; background: #fffdf7; border-right: 1px solid #343b43; color: #272c33; }
  .white:last-of-type { border-right: 0; }
  .black { position: absolute; top: 0; height: 62%; transform: translateX(-50%); background: #272c33; border-radius: 0 0 .2rem .2rem; box-shadow: 0 2px 2px #0005; color: #fffdf7; }
  .black .key-label { font-size: .85em; }
  .key.active { background: #72b8f3; box-shadow: inset 0 0 12px #2673c8; color: #172d40; }
  .key-label { position: absolute; bottom: .35rem; inset-inline: 0; display: grid; justify-items: center; gap: .15rem; font-size: inherit;
    font-family: var(--typography-notation-label-font-family, 'Atkinson Hyperlegible Next', system-ui, sans-serif);
    font-weight: var(--typography-notation-label-font-weight, 700); line-height: 1; white-space: nowrap; }
</style>
