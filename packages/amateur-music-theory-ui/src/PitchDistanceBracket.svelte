<script lang="ts">
  let { top, height, left, side = 'left', topArmLength = '1rem', bottomArmLength = '1rem' }: {
    top: number;
    height: number;
    left: string;
    side?: 'left' | 'right';
    topArmLength?: string;
    bottomArmLength?: string;
  } = $props();

  // Keep the arms inside the note centers, with room between short intervals.
  const inset = $derived(`min(calc(var(--lesson-note-size, 2rem) * 0.18), ${height / 4}%)`);
</script>

<span class="pitch-distance-bracket" class:on-right={side === 'right'}
  style:--bracket-inset={inset}
  style:top={`calc(${top}% + var(--bracket-inset))`}
  style:height={`calc(${height}% - var(--bracket-inset) * 2)`} style:left={left}
  style:--bracket-top-arm-length={topArmLength} style:--bracket-bottom-arm-length={bottomArmLength}
  aria-hidden="true"></span>

<style>
  .pitch-distance-bracket {
    position: absolute;
    width: 1.1rem;
    border-left: 4px solid #5b4a84;
    pointer-events: none;
  }
  .pitch-distance-bracket::before,
  .pitch-distance-bracket::after {
    content: '';
    position: absolute;
    left: -4px;
    border-top: 4px solid #5b4a84;
  }
  .pitch-distance-bracket::before { top: 0; width: var(--bracket-top-arm-length); transform: translateY(-50%); }
  .pitch-distance-bracket::after { bottom: 0; width: var(--bracket-bottom-arm-length); transform: translateY(50%); }
  .on-right { border-left: 0; border-right: 4px solid #5b4a84; }
  .on-right::before,
  .on-right::after { left: auto; right: -4px; }
</style>
