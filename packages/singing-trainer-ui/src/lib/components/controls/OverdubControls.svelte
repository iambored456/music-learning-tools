<script lang="ts">
  import { overdubState } from '../../stores/overdubState.svelte.js';

  const machine = $derived(overdubState.state.engine);
  const project = $derived(machine.project);
  const layers = $derived(project.layers);
  const mode = $derived(machine.mode);
  const warning = $derived(overdubState.state.warning);
  const isBusy = $derived(overdubState.state.isBusy);
  const isRecording = $derived(overdubState.state.isRecordingActive);
  const isCountIn = $derived(overdubState.state.isCountInActive);
  const captureRatio = $derived(overdubState.captureProgressRatio);
  const captureDurationMs = $derived(overdubState.captureDurationMs);
  const pendingTake = $derived(machine.pendingTake);
  const renderableTrails = $derived(overdubState.getRenderableTrails());

  const canKeep = $derived(mode === 'reviewing' && !!pendingTake);
  const canStopCapture = $derived(isCountIn || isRecording);
  const canRecord = $derived(
    canStopCapture || (!isBusy && !isRecording && mode !== 'playing' && mode !== 'exporting')
  );

  function clampNumber(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  async function handleInitialize() {
    await overdubState.initialize();
  }

  async function handleNewProject() {
    await overdubState.createNewProject();
  }

  async function handleRecord() {
    if (isCountIn || isRecording) {
      await overdubState.stopAndRedoCurrentTake();
      return;
    }
    await overdubState.startRecordingCycle();
  }

  async function handleKeepTake() {
    await overdubState.keepPendingTake();
  }

  function handleRedoTake() {
    overdubState.redoPendingTake();
  }

  async function handleUndoLayer() {
    await overdubState.undoLastLayer();
  }

  async function handlePlay() {
    if (mode === 'playing') {
      await overdubState.stopCompositePlayback();
      return;
    }
    await overdubState.playComposite();
  }

  function handlePhraseTempoInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const tempo = clampNumber(Number.parseInt(target.value, 10) || 120, 20, 320);
    overdubState.setPhraseSettings({ tempoBpm: tempo });
  }

  function handleTimeSigNumeratorInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const numerator = clampNumber(Number.parseInt(target.value, 10) || 4, 1, 12);
    overdubState.setPhraseSettings({ timeSignatureNumerator: numerator });
  }

  function handleTimeSigDenominatorChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const denominator = Number.parseInt(target.value, 10) || 4;
    overdubState.setPhraseSettings({ timeSignatureDenominator: denominator });
  }

  function handleCountInInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const countInBeats = clampNumber(Number.parseInt(target.value, 10) || 4, 0, 32);
    overdubState.setPhraseSettings({ countInBeats });
  }

  function handleMonitoringMode(event: Event) {
    const target = event.target as HTMLSelectElement;
    if (target.value === 'layers-and-click' || target.value === 'layers-only' || target.value === 'none') {
      overdubState.setMonitoringMode(target.value);
    }
  }

  function handleClickEnabled(event: Event) {
    const target = event.target as HTMLInputElement;
    overdubState.setClickEnabled(target.checked);
  }

  function handleAddLayer() {
    overdubState.addLayer();
  }

  function handleRemoveLayer(layerId: string) {
    overdubState.removeLayer(layerId);
  }

  function handleArmLayer(layerId: string) {
    overdubState.armLayer(layerId);
  }

  function handleLayerMuted(layerId: string, event: Event) {
    const target = event.target as HTMLInputElement;
    overdubState.setLayerMuted(layerId, target.checked);
  }

  function handleLayerSolo(layerId: string, event: Event) {
    const target = event.target as HTMLInputElement;
    overdubState.setLayerSolo(layerId, target.checked);
  }

  function handleLayerGain(layerId: string, event: Event) {
    const target = event.target as HTMLInputElement;
    overdubState.setLayerGain(layerId, clampNumber(Number.parseFloat(target.value) || 1, 0, 2));
  }

  function handleLayerPan(layerId: string, event: Event) {
    const target = event.target as HTMLInputElement;
    overdubState.setLayerPan(layerId, clampNumber(Number.parseFloat(target.value) || 0, -1, 1));
  }

  function handleTakeSelect(layerId: string, event: Event) {
    const target = event.target as HTMLSelectElement;
    if (!target.value) return;
    overdubState.setActiveTake(layerId, target.value);
  }

  $effect(() => {
    if (overdubState.state.initialized) return;
    void handleInitialize();
  });
</script>

<div class="overdub-panel">
  <div class="overdub-header">
    <span class="title">Overdub Choir Builder</span>
    <button class="mini-btn" onclick={handleNewProject} disabled={isBusy}>
      New Project
    </button>
  </div>

  {#if warning}
    <div class="warning">{warning}</div>
  {/if}

  <div class="grid settings">
    <label class="field">
      <span>Tempo</span>
      <input
        type="number"
        min="20"
        max="320"
        value={project.phrase.tempoBpm}
        oninput={handlePhraseTempoInput}
      />
    </label>
    <label class="field">
      <span>Time Sig Num</span>
      <input
        type="number"
        min="1"
        max="12"
        value={project.phrase.timeSignatureNumerator}
        oninput={handleTimeSigNumeratorInput}
      />
    </label>
    <label class="field">
      <span>Time Sig Den</span>
      <select value={project.phrase.timeSignatureDenominator} onchange={handleTimeSigDenominatorChange}>
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="4">4</option>
        <option value="8">8</option>
        <option value="16">16</option>
      </select>
    </label>
    <label class="field">
      <span>Measures</span>
      <input type="number" value={project.phrase.measures} disabled />
    </label>
    <label class="field">
      <span>Count-In Beats</span>
      <input
        type="number"
        min="0"
        max="32"
        value={project.phrase.countInBeats}
        oninput={handleCountInInput}
      />
    </label>
    <label class="field">
      <span>Monitoring</span>
      <select value={project.monitoringMode} onchange={handleMonitoringMode}>
        <option value="layers-and-click">Layers + Click (Recommended)</option>
        <option value="layers-only">Layers Only</option>
        <option value="none">Record Without Monitoring</option>
      </select>
    </label>
  </div>

  <label class="checkbox">
    <input type="checkbox" checked={project.clickEnabled} onchange={handleClickEnabled} />
    <span>Click Track Enabled</span>
  </label>

  <div class="main-controls">
    <button class="record-btn" onclick={handleRecord} disabled={!canRecord}>
      {#if canStopCapture}
        Stop &amp; Redo
      {:else}
        Record Take
      {/if}
    </button>
    <button class="play-btn" onclick={handlePlay} disabled={isBusy || isRecording || isCountIn}>
      {mode === 'playing' ? 'Stop Playback' : 'Play Mix'}
    </button>
    <button class="undo-btn" onclick={handleUndoLayer} disabled={isBusy || layers.length === 0}>
      Undo Last Layer
    </button>
  </div>

  {#if isCountIn || isRecording}
    <div class="progress-wrap">
      <div class="progress-label">
        {isCountIn ? 'Count-In' : 'Recording'} ({Math.round(captureDurationMs / 1000)}s phrase)
      </div>
      <div class="progress-track">
        <div class="progress-fill" style={`width: ${Math.round(captureRatio * 100)}%`}></div>
      </div>
    </div>
  {/if}

  {#if canKeep}
    <div class="review-controls">
      <button class="keep-btn" onclick={handleKeepTake} disabled={isBusy}>Keep Take</button>
      <button class="redo-btn" onclick={handleRedoTake} disabled={isBusy}>Redo Take</button>
    </div>
  {/if}

  <div class="layer-header">
    <span>Layers ({layers.length}/{project.maxLayers})</span>
    <button class="mini-btn" onclick={handleAddLayer} disabled={layers.length >= project.maxLayers || isBusy}>
      Add Layer
    </button>
  </div>

  <div class="layer-list">
    {#each layers as layer}
      <div class="layer-card">
        <div class="layer-row">
          <span class="layer-name">{layer.name}</span>
          <button class="mini-btn" onclick={() => handleArmLayer(layer.id)} disabled={isBusy || isRecording || isCountIn}>
            Arm
          </button>
          <button
            class="mini-btn"
            onclick={() => handleRemoveLayer(layer.id)}
            disabled={layers.length <= 1 || isBusy}
          >
            Remove
          </button>
        </div>
        <div class="layer-controls">
          <label class="checkbox">
            <input type="checkbox" checked={layer.muted} onchange={(e) => handleLayerMuted(layer.id, e)} />
            <span>Mute</span>
          </label>
          <label class="checkbox">
            <input type="checkbox" checked={layer.solo} onchange={(e) => handleLayerSolo(layer.id, e)} />
            <span>Solo</span>
          </label>
          <label class="inline">
            <span>Gain</span>
            <input
              type="range"
              min="0"
              max="2"
              step="0.01"
              value={layer.gain}
              oninput={(e) => handleLayerGain(layer.id, e)}
            />
          </label>
          <label class="inline">
            <span>Pan</span>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.01"
              value={layer.pan}
              oninput={(e) => handleLayerPan(layer.id, e)}
            />
          </label>
        </div>
        <label class="field">
          <span>Active Take</span>
          <select value={layer.activeTakeId ?? ''} onchange={(e) => handleTakeSelect(layer.id, e)}>
            <option value="" disabled={layer.takes.length > 0}>No take selected</option>
            {#each layer.takes as take}
              <option value={take.id}>{new Date(take.createdAt).toLocaleTimeString()} ({Math.round(take.durationMs / 1000)}s)</option>
            {/each}
          </select>
        </label>
        <div class="layer-meta">
          Takes: {layer.takes.length}/{project.maxTakesPerLayer}
        </div>
      </div>
    {/each}
  </div>

  <div class="trail-meta">
    Visible kept trails: {renderableTrails.length}
  </div>
</div>

<style>
  .overdub-panel {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .overdub-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .title {
    font-weight: 700;
    color: var(--color-text);
    font-size: var(--font-size-sm);
  }

  .warning {
    background: rgba(255, 153, 0, 0.12);
    border: 1px solid rgba(255, 153, 0, 0.45);
    color: #ffd48a;
    border-radius: var(--radius-sm);
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-xs);
    line-height: 1.3;
  }

  .grid.settings {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--spacing-xs);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .field input,
  .field select {
    padding: 6px 8px;
    border-radius: var(--radius-sm);
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.04);
    color: var(--color-text);
    font-size: var(--font-size-xs);
  }

  .checkbox {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .main-controls {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--spacing-xs);
  }

  .record-btn,
  .play-btn,
  .undo-btn,
  .keep-btn,
  .redo-btn,
  .mini-btn {
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: opacity 0.15s ease, transform 0.15s ease;
    font-weight: 600;
  }

  .record-btn,
  .play-btn,
  .undo-btn,
  .keep-btn,
  .redo-btn {
    padding: 8px 10px;
    font-size: var(--font-size-xs);
    color: #fff;
  }

  .record-btn {
    background: #d54e3a;
  }

  .play-btn {
    background: #2a8f60;
  }

  .undo-btn {
    background: #6f6f85;
  }

  .keep-btn {
    background: #1d9d5d;
  }

  .redo-btn {
    background: #aa6a2a;
  }

  .mini-btn {
    padding: 5px 8px;
    font-size: 11px;
    color: var(--color-text);
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .progress-wrap {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .progress-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .progress-track {
    height: 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.09);
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #3ccf8c, #64a6ff);
  }

  .review-controls {
    display: flex;
    gap: var(--spacing-xs);
  }

  .layer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    margin-top: 4px;
  }

  .layer-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    max-height: 260px;
    overflow: auto;
    padding-right: 2px;
  }

  .layer-card {
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-sm);
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: rgba(255, 255, 255, 0.03);
  }

  .layer-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .layer-name {
    flex: 1;
    color: var(--color-text);
    font-size: var(--font-size-xs);
    font-weight: 700;
  }

  .layer-controls {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px 8px;
    align-items: center;
    width: 100%;
  }

  .inline {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--color-text-muted);
    grid-column: 1 / -1;
    min-width: 0;
  }

  .inline span {
    flex: 0 0 34px;
  }

  .inline input[type='range'] {
    flex: 1;
    width: 100%;
    min-width: 0;
  }

  .layer-meta,
  .trail-meta {
    font-size: 11px;
    color: var(--color-text-muted);
  }

  .trail-meta {
    margin-top: 2px;
  }
</style>
