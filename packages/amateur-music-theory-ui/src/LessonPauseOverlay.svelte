<script lang="ts">
  let { onResume }: { onResume: () => void } = $props();
</script>

<div class="lesson-pause-overlay">
  <button type="button" class="pause-button" onclick={onResume}
    aria-label="Lesson paused. Resume lesson playback.">
    <svg class="pause-symbol" viewBox="0 0 64 64" aria-hidden="true">
      <rect x="17" y="12" width="10" height="40" rx="3" />
      <rect x="37" y="12" width="10" height="40" rx="3" />
    </svg>
    <strong>Lesson paused</strong>
    <span>Resume lesson</span>
  </button>
</div>

<style>
  .lesson-pause-overlay {
    position: fixed;
    inset: 0;
    z-index: 90;
    display: grid;
    place-items: center;
    padding: 1rem;
    background: rgba(244, 238, 225, .3);
    pointer-events: none;
  }

  .pause-button {
    display: grid;
    justify-items: center;
    gap: .5rem;
    min-width: min(15rem, 100%);
    padding: 1.4rem 2rem;
    border: 1px solid rgba(47, 141, 131, .35);
    border-radius: 24px;
    background: rgba(255, 253, 247, .8);
    box-shadow: 0 12px 40px rgba(37, 27, 18, .15);
    color: #244f46;
    font: inherit;
    text-align: center;
    cursor: pointer;
    pointer-events: auto;
  }

  .pause-symbol { width: clamp(4rem, 10vw, 6rem); height: auto; fill: currentColor; opacity: .65; }
  strong { font-size: 1.3rem; }
  span { font-size: .95rem; }
  .pause-button:hover { background: rgba(255, 253, 247, .94); }
  .pause-button:focus-visible { outline: 3px solid #2f8d83; outline-offset: 5px; }
</style>
