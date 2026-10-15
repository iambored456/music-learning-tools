<script lang="ts">
  import { ANGLE_STEP, CHROMATIC_NOTES, FIXED_INTERVAL_COLOUR, getContrastColor, mod12, wheelPitchClasses, wheelPoint, wheelSegmentPath, type WheelOrder } from '@mlt/compass-core';
  import { chordLabel, degreeLabel, type ScaleMode } from '@mlt/audiationer-trainer-core';
  let { tonic, scale, order, allowed, active, enabled, chords = false, onanswer } = $props<{
    tonic: number; scale: ScaleMode; order: WheelOrder; allowed: number[];
    active: number | null; enabled: boolean; chords?: boolean; onanswer: (degree: number) => void;
  }>();
  const colours: Record<number, string> = FIXED_INTERVAL_COLOUR;
  const display = $derived(wheelPitchClasses(order));
</script>

<svg class="trainer-wheel" viewBox="-240 -240 480 480" role="group" aria-label="Musical degree answer wheel">
  <circle r="229" fill="var(--at-panel)" stroke="var(--at-line)" stroke-width="2" />
  {#each display as degree, index}
    {@const angle = index * ANGLE_STEP - Math.PI / 2}
    {@const outer = wheelPoint(199, angle)}
    {@const inner = wheelPoint(145, angle)}
    {@const available = allowed.includes(degree)}
    {@const label = chords ? chordLabel(degree, scale) : degreeLabel(degree, scale)}
    <g class:unavailable={!available} class:active={active === degree} class:enabled={enabled && available}
      role="button" tabindex={enabled && available ? 0 : -1}
      aria-label={`${chords ? 'Chord' : 'Degree'} ${label}, ${CHROMATIC_NOTES[mod12(tonic + degree)]}`}
      aria-disabled={!enabled || !available}
      onclick={() => { if (enabled && available) onanswer(degree); }}
      onkeydown={(event) => { if (enabled && available && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onanswer(degree); } }}>
      <path class="outer-sector" d={wheelSegmentPath(174, 225, angle)} fill="var(--at-panel)" stroke="var(--at-line)" stroke-width="1.5" />
      <path class="degree-sector" d={wheelSegmentPath(110, 174, angle)} fill={colours[degree]} stroke="var(--at-panel)" stroke-width="2" />
      <text x={outer.x} y={outer.y} fill="var(--at-text)" font-size="14" font-weight="600">{CHROMATIC_NOTES[mod12(tonic + degree)]}</text>
      <text x={inner.x} y={inner.y} fill={getContrastColor(colours[degree])} font-size="23" font-weight="700">{label}</text>
      <path class="focus-sector" d={wheelSegmentPath(110, 225, angle)} fill="none" stroke-width="4" />
    </g>
  {/each}
  <text y="-25" class="centre-caption" fill="var(--at-muted)" font-size="13">TONIC</text>
  <text y="9" fill="var(--at-text)" font-size="29" font-weight="700">{CHROMATIC_NOTES[tonic]}</text>
  <text y="39" fill="var(--at-muted)" font-size="12">{order === 'fifths' ? 'Circle of fifths' : 'Chromatic compass'}</text>
</svg>

<style>
  .trainer-wheel { display:block; width:100%; max-width:560px; margin:auto; overflow:visible; }
  text { text-anchor:middle; dominant-baseline:middle; pointer-events:none; font-family:inherit; }
  .centre-caption { letter-spacing:0.2em; }
  g { outline:none; }
  .unavailable { opacity:0.27; }
  .enabled { cursor:pointer; }
  .focus-sector { stroke:transparent; pointer-events:none; }
  .enabled:hover .focus-sector, g:focus-visible .focus-sector { stroke:var(--at-text); }
  .active .focus-sector { stroke:var(--at-accent); stroke-width:7; }
  .active .outer-sector { fill:var(--at-accent-soft); }
</style>
