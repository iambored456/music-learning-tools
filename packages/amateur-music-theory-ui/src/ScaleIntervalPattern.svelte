<script lang="ts">
  import { lessonScreenSlide } from '@mlt/lesson-kit';
  import { diatonicPattern } from './lesson14Scale';
  let { activeIndex = null, paused = false, enterFromLeft = false }: {
    activeIndex?: number | null; paused?: boolean; enterFromLeft?: boolean;
  } = $props();
</script>

<div class="pattern" use:lessonScreenSlide={{ direction: enterFromLeft ? 'enter-left' : null, paused }}>
  <p>Interval pattern</p>
  <ol aria-label="Diatonic scale interval pattern">
    {#each diatonicPattern as distance, index}
      <li class:active={activeIndex === index} aria-current={activeIndex === index ? 'step' : undefined}
        aria-label={`${distance === 2 ? 'Major' : 'Minor'} second, ${distance} ${distance === 1 ? 'pitch' : 'pitches'}`}>
        +{distance}
      </li>
    {/each}
  </ol>
</div>

<style>
  .pattern { container-type: inline-size; border: 2px solid #5b4a84; border-radius: 12px; background: #fff8db; padding: 0.6rem; color: #29251f; }
  p { font-size: 0.85rem; text-align: center; margin: 0 0 0.5rem; }
  ol { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.15rem; margin: 0; padding: 0; list-style: none; }
  li { text-align: center; padding: 0.3rem 0; font-size: clamp(0.6rem, 7cqi, 1.1rem); border-radius: 5px; }
  .active { background: #ffe6a1; box-shadow: inset 0 0 0 2px #5b4a84; font-weight: 700; }
</style>
