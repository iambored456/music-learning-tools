<script lang="ts">
  import { ANGLE_STEP, CHROMATIC_NOTES, mod12, wheelPitchClasses, wheelPoint, wheelSegmentPath, type WheelOrder } from '@mlt/compass-core';
  import { FREEPLAY_WHEEL_INNER_RADIUS, FREEPLAY_WHEEL_OUTER_RADIUS, chordLabel, degreeLabel, freeplayWheelPosition, type ScaleMode } from '@mlt/audiationer-trainer-core';
  import { PITCH_COLOURS as colours } from './pitchColours.ts';
  let { tonic, scale, order, allowed, active, enabled, chords = false, onanswer, activeDegrees = [], sustained = [], ongesture }: {
    tonic: number; scale: ScaleMode; order: WheelOrder; allowed: number[];
    active: number | null; enabled: boolean; chords?: boolean; onanswer: (degree: number) => void;
    activeDegrees?: number[]; sustained?: number[]; ongesture?: (degree: number, event: PointerEvent, hit: { degree: number; index: number } | null) => void;
  } = $props();
  const display = $derived(wheelPitchClasses(order));
  function gesture(degree: number, event: PointerEvent) {
    if (!ongesture) return;
    let hit = null;
    const svg = (event.currentTarget as SVGGElement).ownerSVGElement;
    const matrix = svg?.getScreenCTM();
    if (svg && matrix && ['pointerdown', 'pointermove', 'pointerup'].includes(event.type)) {
      const point = svg.createSVGPoint();
      point.x = event.clientX; point.y = event.clientY;
      const local = point.matrixTransform(matrix.inverse());
      hit = freeplayWheelPosition(local.x, local.y, order);
    }
    ongesture(degree, event, hit);
  }
</script>
<svg class="trainer-wheel" style:touch-action={ongesture ? 'none' : undefined} viewBox="-240 -240 480 480" role="group" aria-label="Musical degree answer wheel">
  <circle r="204" fill="none" stroke="var(--at-line)" stroke-width="1" />
  {#each display as degree, index}
    {@const angle = index * ANGLE_STEP - Math.PI / 2}
    {@const dot = wheelPoint(204, angle)}
    {@const labelPoint = wheelPoint(172, angle)}
    {@const available = allowed.includes(degree)}
    {@const label = chords ? chordLabel(degree, scale) : degreeLabel(degree, scale)}
    <g class:unavailable={!available} class:active={active === degree || activeDegrees.includes(degree)} class:enabled={enabled && available}
      role="button" tabindex={enabled && available ? 0 : -1}
      aria-label={`${chords ? 'Chord' : 'Degree'} ${label}, ${CHROMATIC_NOTES[mod12(tonic + degree)]}`}
      aria-disabled={!enabled || !available}
      aria-pressed={ongesture ? sustained.includes(degree) : undefined}
      style={`--degree-colour:${colours[degree]}`}
      onpointerdown={(event) => { if (enabled && available) gesture(degree, event); }}
      onpointermove={(event) => gesture(degree, event)}
      onpointerup={(event) => gesture(degree, event)}
      onpointercancel={(event) => gesture(degree, event)}
      onlostpointercapture={(event) => gesture(degree, event)}
      onclick={(event) => { if (enabled && available && (!ongesture || (event.detail === 0 && !(event instanceof PointerEvent && event.pointerType)))) onanswer(degree); }}
      onkeydown={(event) => { if (enabled && available && (!ongesture || !event.repeat) && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onanswer(degree); } }}>
      <path class="active-halo" d="M-37 0a37 37 0 0 1 74 0Z" transform={`translate(${dot.x} ${dot.y}) rotate(${index * 30})`} fill={colours[degree]} />
      <path class="hit-sector" d={wheelSegmentPath(FREEPLAY_WHEEL_INNER_RADIUS, FREEPLAY_WHEEL_OUTER_RADIUS, angle)} fill="transparent" />
      <circle class="degree-dot" cx={dot.x} cy={dot.y} r={available ? 11 : 7} fill={available ? colours[degree] : 'var(--at-muted)'} />
      <text x={labelPoint.x} y={labelPoint.y} fill="var(--at-muted)" font-size={chords ? 22 : 27}>{label}</text>
      <path class="focus-sector" d={wheelSegmentPath(FREEPLAY_WHEEL_INNER_RADIUS, FREEPLAY_WHEEL_OUTER_RADIUS, angle)} fill="none" stroke-width="2" />
    </g>
  {/each}
</svg>
<style>
  .trainer-wheel { display:block; width:100%; margin:auto; overflow:visible; }
  text { text-anchor:middle; dominant-baseline:middle; pointer-events:none; font-family:inherit; font-weight:300; }
  g { outline:none; }
  .unavailable { opacity:.35; }
  .enabled { cursor:pointer; }
  .focus-sector { stroke:transparent; pointer-events:none; }
  .enabled:hover .hit-sector { fill:var(--at-panel); }
  g:focus-visible .focus-sector { stroke:var(--at-text); }
  .active-halo { opacity:0; pointer-events:none; }
  .active .active-halo { opacity:1; }
  .active text { fill:var(--at-text); font-weight:500; }
  .active .degree-dot { r:12; stroke:var(--at-bg); stroke-width:2; }
</style>
