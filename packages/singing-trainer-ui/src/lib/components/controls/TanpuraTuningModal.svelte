<script lang="ts">
  import {
    PURETONES_NOTE_LABELS,
    TANPURA_STRING_BEHAVIOR_LIMITS,
    TANPURA_TUNING_LIMITS,
    getTanpuraFilterFrequencyFromTuning,
    getTanpuraTremoloDepthFromTuning,
    getTanpuraTremoloFrequencyFromTuning,
  } from '@mlt/tanpura-drone';
  import { appState } from '@mlt/singing-trainer-core/stores/appState.svelte.js';
  import { updateDrone } from '@mlt/singing-trainer-core/services/droneAudio.js';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  const tuning = $derived(appState.state.drone.tuning);
  const strings = $derived(appState.state.drone.strings);
  const approxFilterHz = $derived(Math.round(getTanpuraFilterFrequencyFromTuning(tuning)));
  const approxTremoloHz = $derived(getTanpuraTremoloFrequencyFromTuning(tuning).toFixed(2));
  const approxTremoloDepth = $derived((getTanpuraTremoloDepthFromTuning(tuning) * 100).toFixed(1));
  const activeStringsCount = $derived(strings.filter((s) => s.enabled).length);

  let expandedString = $state<number | null>(0);

  function handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) onClose();
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') onClose();
  }

  function updateFineTune(event: Event): void {
    const target = event.target as HTMLInputElement;
    appState.setDroneTuning({ fineTuneCents: Number.parseInt(target.value, 10) });
    updateDrone();
  }

  function updateBrightness(event: Event): void {
    const target = event.target as HTMLInputElement;
    appState.setDroneTuning({ brightness: Number.parseInt(target.value, 10) });
    updateDrone();
  }

  function updateJivari(event: Event): void {
    const target = event.target as HTMLInputElement;
    appState.setDroneTuning({ jivari: Number.parseInt(target.value, 10) });
    updateDrone();
  }

  function updateVariance(event: Event): void {
    const target = event.target as HTMLInputElement;
    appState.setDroneTuning({ variance: Number.parseInt(target.value, 10) });
    updateDrone();
  }

  function handleReset(): void {
    appState.resetDroneTuning();
    appState.resetDroneStrings();
    updateDrone();
  }

  function toggleString(index: number): void {
    expandedString = expandedString === index ? null : index;
  }

  function setStringEnabled(index: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    appState.setDroneString(index, { enabled: target.checked });
    updateDrone();
  }

  function setStringNote(index: number, event: Event): void {
    const target = event.target as HTMLSelectElement;
    appState.setDroneString(index, { noteIndex: Number.parseInt(target.value, 10) });
    updateDrone();
  }

  function setStringFine(index: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    appState.setDroneString(index, { fineTuneCents: Number.parseInt(target.value, 10) });
    updateDrone();
  }

  function setStringUltraFine(index: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    appState.setDroneString(index, { ultraFineTuneCents: Number.parseInt(target.value, 10) });
    updateDrone();
  }

  function setStringGain(index: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    appState.setDroneString(index, { gainDb: Number.parseFloat(target.value) });
    updateDrone();
  }

  function setStringVariance(index: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    appState.setDroneString(index, { variance: Number.parseInt(target.value, 10) });
    updateDrone();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="modal-backdrop"
  onclick={handleBackdropClick}
  role="dialog"
  aria-modal="true"
  aria-labelledby="tanpura-tuning-title"
  tabindex="-1"
>
  <div class="modal-content">
    <div class="modal-header">
      <h2 id="tanpura-tuning-title" class="modal-title">Tanpura Tuning</h2>
      <p class="modal-subtitle">
        PureTones-style behavior controls for the tanpura drone engine.
      </p>
    </div>

    <div class="control-group">
      <label class="control-label" for="fine-tune">
        Fine Tune <span>{tuning.fineTuneCents} cents</span>
      </label>
      <input
        id="fine-tune"
        type="range"
        min={TANPURA_TUNING_LIMITS.fineTuneCents.min}
        max={TANPURA_TUNING_LIMITS.fineTuneCents.max}
        value={tuning.fineTuneCents}
        oninput={updateFineTune}
      />
    </div>

    <div class="control-group">
      <label class="control-label" for="brightness">
        Brightness <span>{tuning.brightness}</span>
      </label>
      <input
        id="brightness"
        type="range"
        min={TANPURA_TUNING_LIMITS.brightness.min}
        max={TANPURA_TUNING_LIMITS.brightness.max}
        value={tuning.brightness}
        oninput={updateBrightness}
      />
    </div>

    <div class="control-group">
      <label class="control-label" for="jivari">
        Jivari / Buzz <span>{tuning.jivari}</span>
      </label>
      <input
        id="jivari"
        type="range"
        min={TANPURA_TUNING_LIMITS.jivari.min}
        max={TANPURA_TUNING_LIMITS.jivari.max}
        value={tuning.jivari}
        oninput={updateJivari}
      />
    </div>

    <div class="control-group">
      <label class="control-label" for="variance">
        Variance / Motion <span>{tuning.variance}</span>
      </label>
      <input
        id="variance"
        type="range"
        min={TANPURA_TUNING_LIMITS.variance.min}
        max={TANPURA_TUNING_LIMITS.variance.max}
        value={tuning.variance}
        oninput={updateVariance}
      />
    </div>

    <div class="approx-panel">
      <div class="approx-title">Approximation Preview</div>
      <div class="approx-row">
        <span>Filter cutoff</span>
        <strong>{approxFilterHz} Hz</strong>
      </div>
      <div class="approx-row">
        <span>Tremolo rate</span>
        <strong>{approxTremoloHz} Hz</strong>
      </div>
      <div class="approx-row">
        <span>Tremolo depth</span>
        <strong>{approxTremoloDepth}%</strong>
      </div>
      <div class="approx-row">
        <span>Active strings</span>
        <strong>{activeStringsCount} / {strings.length}</strong>
      </div>
    </div>

    <div class="strings-section">
      <div class="strings-header">
        <h3>String Tuning</h3>
        <span>PureTones-style per-string controls</span>
      </div>

      {#each strings as stringConfig, index (stringConfig.stringName)}
        <div class="string-card">
          <button
            class="string-header"
            class:string-header--enabled={stringConfig.enabled}
            onclick={() => toggleString(index)}
            aria-expanded={expandedString === index}
          >
            <div class="string-title">
              <span class="string-name">{stringConfig.stringName.replace('_', ' ')}</span>
              <span class="string-note">{PURETONES_NOTE_LABELS[stringConfig.noteIndex]}</span>
            </div>
            <label class="string-enable" onclick={(event) => event.stopPropagation()}>
              <input
                type="checkbox"
                checked={stringConfig.enabled}
                onchange={(event) => setStringEnabled(index, event)}
              />
              <span>On</span>
            </label>
          </button>

          {#if expandedString === index}
            <div class="string-controls">
              <label class="row">
                <span>Note</span>
                <select value={stringConfig.noteIndex} onchange={(event) => setStringNote(index, event)}>
                  {#each PURETONES_NOTE_LABELS as label, noteIndex}
                    <option value={noteIndex}>{label}</option>
                  {/each}
                </select>
              </label>

              <label class="row">
                <span>Fine Tune ({stringConfig.fineTuneCents}c)</span>
                <input
                  type="range"
                  min={TANPURA_STRING_BEHAVIOR_LIMITS.fineTuneCents.min}
                  max={TANPURA_STRING_BEHAVIOR_LIMITS.fineTuneCents.max}
                  value={stringConfig.fineTuneCents}
                  oninput={(event) => setStringFine(index, event)}
                />
              </label>

              <label class="row">
                <span>Ultra Fine ({stringConfig.ultraFineTuneCents})</span>
                <input
                  type="range"
                  min={TANPURA_STRING_BEHAVIOR_LIMITS.ultraFineTuneCents.min}
                  max={TANPURA_STRING_BEHAVIOR_LIMITS.ultraFineTuneCents.max}
                  value={stringConfig.ultraFineTuneCents}
                  oninput={(event) => setStringUltraFine(index, event)}
                />
              </label>

              <label class="row">
                <span>Gain ({stringConfig.gainDb.toFixed(1)} dB)</span>
                <input
                  type="range"
                  min={TANPURA_STRING_BEHAVIOR_LIMITS.gainDb.min}
                  max={TANPURA_STRING_BEHAVIOR_LIMITS.gainDb.max}
                  step="0.5"
                  value={stringConfig.gainDb}
                  oninput={(event) => setStringGain(index, event)}
                />
              </label>

              <label class="row">
                <span>Variance ({stringConfig.variance})</span>
                <input
                  type="range"
                  min={TANPURA_STRING_BEHAVIOR_LIMITS.variance.min}
                  max={TANPURA_STRING_BEHAVIOR_LIMITS.variance.max}
                  value={stringConfig.variance}
                  oninput={(event) => setStringVariance(index, event)}
                />
              </label>
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <div class="actions">
      <button class="btn-secondary" onclick={handleReset}>Reset</button>
      <button class="btn-primary" onclick={onClose}>Done</button>
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1100;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.72);
    animation: fadeIn 0.18s ease;
  }

  .modal-content {
    width: min(92vw, 520px);
    max-height: 86vh;
    overflow: auto;
    background: var(--color-bg, #1a1a2e);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: var(--radius-lg, 12px);
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    animation: slideUp 0.2s ease;
  }

  .modal-header {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .modal-title {
    margin: 0;
    font-size: 1.15rem;
    color: var(--color-text);
  }

  .modal-subtitle {
    margin: 0;
    font-size: 0.82rem;
    color: var(--color-text-muted);
  }

  .control-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .control-label {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    font-size: 0.82rem;
    color: var(--color-text-muted);
  }

  .control-label span {
    color: var(--color-text);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  input[type='range'] {
    width: 100%;
    accent-color: var(--color-secondary, #5f95ff);
  }

  .approx-panel {
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: var(--radius-sm, 8px);
    padding: 0.65rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    background: rgba(255, 255, 255, 0.012);
  }

  .approx-title {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
  }

  .approx-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .approx-row strong {
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.2rem;
  }

  .strings-section {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .strings-header {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .strings-header h3 {
    margin: 0;
    font-size: 0.92rem;
    color: var(--color-text);
  }

  .strings-header span {
    font-size: 0.74rem;
    color: var(--color-text-muted);
  }

  .string-card {
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: var(--radius-sm, 8px);
    background: rgba(255, 255, 255, 0.008);
    overflow: hidden;
  }

  .string-header {
    width: 100%;
    border: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.45rem 0.55rem;
    cursor: pointer;
    background: transparent;
    color: inherit;
  }

  .string-header--enabled {
    background: rgba(95, 149, 255, 0.028);
  }

  .string-title {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  .string-name {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .string-note {
    font-size: 0.74rem;
    color: var(--color-text-muted);
    border: 1px solid rgba(255, 255, 255, 0.15);
    padding: 0.1rem 0.4rem;
    border-radius: 999px;
  }

  .string-enable {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.72rem;
    color: var(--color-text-muted);
  }

  .string-controls {
    border-top: 1px solid rgba(255, 255, 255, 0.09);
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .row {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  .row select {
    width: fit-content;
    min-width: 6.8rem;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.02);
    color: var(--color-text);
    padding: 0.25rem 0.45rem;
  }

  .btn-primary,
  .btn-secondary {
    border-radius: var(--radius-sm, 6px);
    padding: 0.45rem 0.8rem;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-primary {
    border: none;
    color: var(--color-bg);
    background: var(--color-secondary, #5f95ff);
  }

  .btn-secondary {
    border: 1px solid rgba(255, 255, 255, 0.16);
    color: var(--color-text);
    background: transparent;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
