<script lang="ts">
  import { pitchState } from '@mlt/singing-trainer-core/stores/pitchState.svelte.js';

  const METER_MIN_DB = -60;
  const METER_MAX_DB = 0;

  const inputLevelDb = $derived(pitchState.state.inputLevelDb);

  const normalizedLevel = $derived.by(() => {
    if (inputLevelDb === null) return 0;
    const clamped = Math.max(METER_MIN_DB, Math.min(METER_MAX_DB, inputLevelDb));
    return (clamped - METER_MIN_DB) / (METER_MAX_DB - METER_MIN_DB);
  });

  const levelPercent = $derived(normalizedLevel * 100);
</script>

<div class="input-decibel-meter">
  <div
    class="meter-track"
    role="meter"
    aria-label="Microphone input level"
    aria-valuemin={METER_MIN_DB}
    aria-valuemax={METER_MAX_DB}
    aria-valuenow={inputLevelDb ?? METER_MIN_DB}
  >
    <div class="meter-fill" style={`transform: scaleX(${normalizedLevel});`}></div>
    <div
      class="meter-indicator"
      class:active={inputLevelDb !== null}
      style={`left: ${levelPercent}%;`}
      aria-hidden="true"
    ></div>
  </div>
</div>

<style>
  .input-decibel-meter {
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 2px 0;
  }

  .meter-track {
    position: relative;
    width: 100%;
    height: 10px;
    box-sizing: border-box;
    border: 1px solid var(--color-border-strong);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.1);
    overflow: hidden;
  }

  .meter-fill {
    width: 100%;
    height: 100%;
    transform-origin: left center;
    transition: transform 80ms linear;
    background: linear-gradient(90deg, #3ca55c 0%, #f8b500 62%, #ff4d4d 100%);
  }

  .meter-indicator {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 3px;
    border-radius: 999px;
    background: #b8bec8;
    box-shadow: 0 0 0 1px rgba(20, 28, 40, 0.45);
    opacity: 0;
    transform: translateX(-50%);
    transition: left 80ms linear, opacity 120ms ease;
  }

  .meter-indicator.active {
    opacity: 1;
  }
</style>
