<script lang="ts">
  import { chordLabel, degreeLabel, type ScaleMode } from '@mlt/audiationer-trainer-core';
  import { PITCH_COLOURS as colours } from './pitchColours.ts';

  let { degrees, scale, chords = false }: { degrees: number[]; scale: ScaleMode; chords?: boolean } = $props();
  // Each layout lists row sizes from bottom to top.
  const rowLayouts: readonly (readonly number[])[] = [
    [], [1], [2], [2, 1], [2, 2], [3, 2], [3, 3],
    [4, 3], [4, 4], [3, 3, 3], [4, 3, 3], [4, 4, 3], [4, 4, 4],
  ];
  const cells = $derived([...new Set(degrees)].sort((a, b) => a - b));
  const rowSizes = $derived(rowLayouts[cells.length] ?? []);
  const columns = $derived(Math.max(1, ...rowSizes));
  const rows = $derived.by(() => {
    let offset = 0;
    return rowSizes.map(size => {
      const row = cells.slice(offset, offset + size);
      offset += size;
      return row;
    });
  });
  function label(degree: number) { return chords ? chordLabel(degree, scale) : degreeLabel(degree, scale); }
  const description = $derived(cells.map(label).join(', '));
</script>

{#if cells.length}
  <span class="at-degree-grid" class:at-chord-grid={chords} role="img" aria-label={`Enabled ${chords ? 'chords' : 'degrees'}, ascending from bottom left: ${description}`} style:--at-degree-columns={columns}>
    {#each rows as row, rowIndex (rowIndex)}
      {#each row as degree, columnIndex (degree)}
        <span class="at-degree-cell" style={`--degree-colour:${colours[degree]}`} style:grid-column={`${columns - row.length + columnIndex * 2 + 1} / span 2`} style:grid-row={rows.length - rowIndex} aria-hidden="true" title={`${chords ? 'Chord' : 'Degree'} ${label(degree)}`}>
          {label(degree)}
        </span>
      {/each}
    {/each}
  </span>
{/if}
