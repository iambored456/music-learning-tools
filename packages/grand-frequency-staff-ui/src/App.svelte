<script lang="ts">
  import { extendedPitches, type ExtendedPitch, type Region } from './data/pitchRange';
  import { INSTRUMENTS, type Instrument } from './data/instruments';

  const pitches = extendedPitches; // 185 pitches, E10 → C-5

  const REGION_LABELS: Record<Region, string> = {
    timbre: 'Timbre  ·  4,000 – 20,000 Hz',
    pitch:  'Pitch  ·  20 – 4,000 Hz',
    rhythm: 'Rhythm  ·  < 20 Hz',
  };

  let selectedMidi = $state<number | null>(null);
  let instrumentOrder = $state<string[]>(INSTRUMENTS.map((instrument) => instrument.id));
  let draggedInstrumentId = $state<string | null>(null);
  let dragOverInstrumentId = $state<string | null>(null);
  let dragOverAfter = $state(false);
  let pitchColumnsReversed = $state(false);
  let hzColumnsReversed = $state(false);
  let midiColumnsReversed = $state(false);
  let pianoColumnsReversed = $state(false);
  let audioCtx: AudioContext | null = null;

  const instrumentById = new Map(INSTRUMENTS.map((instrument) => [instrument.id, instrument]));
  const visibleInstruments = $derived.by<Instrument[]>(() => (
    instrumentOrder
      .map((id) => instrumentById.get(id))
      .filter((instrument): instrument is Instrument => instrument !== undefined)
  ));

  const selectedPitch = $derived(
    pitches.find(p => p.midi === selectedMidi) ?? null
  );

  type OffsetColumn = 'A' | 'B';

  function getColumnOrder(reversed: boolean): OffsetColumn[] {
    return reversed ? ['B', 'A'] : ['A', 'B'];
  }

  function handleInstrumentDragStart(event: DragEvent, instrumentId: string): void {
    draggedInstrumentId = instrumentId;
    dragOverInstrumentId = null;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', instrumentId);
    }
  }

  function handleInstrumentDragOver(event: DragEvent, targetId: string): void {
    event.preventDefault();
    if (!draggedInstrumentId || draggedInstrumentId === targetId) return;
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';

    const target = event.currentTarget as HTMLElement;
    const bounds = target.getBoundingClientRect();
    const insertAfter = event.clientX >= bounds.left + bounds.width / 2;
    if (dragOverInstrumentId === targetId && dragOverAfter === insertAfter) return;

    const next = instrumentOrder.filter((id) => id !== draggedInstrumentId);
    const targetIndex = next.indexOf(targetId);
    if (targetIndex < 0) return;
    next.splice(targetIndex + (insertAfter ? 1 : 0), 0, draggedInstrumentId);
    instrumentOrder = next;
    dragOverInstrumentId = targetId;
    dragOverAfter = insertAfter;
  }

  function handleInstrumentDragEnd(): void {
    draggedInstrumentId = null;
    dragOverInstrumentId = null;
    dragOverAfter = false;
  }

  function handleInstrumentHeaderKey(event: KeyboardEvent, instrumentId: string): void {
    if (!event.altKey || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    event.preventDefault();
    const currentIndex = instrumentOrder.indexOf(instrumentId);
    const nextIndex = currentIndex + (event.key === 'ArrowLeft' ? -1 : 1);
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= instrumentOrder.length) return;
    const next = [...instrumentOrder];
    [next[currentIndex], next[nextIndex]] = [next[nextIndex], next[currentIndex]];
    instrumentOrder = next;
  }

  function playFrequency(frequency: number) {
    if (!audioCtx) audioCtx = new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    // Clamp to audible range for oscillator (Web Audio API struggles below ~1 Hz)
    osc.frequency.value = Math.max(frequency, 0.001);
    const now = audioCtx.currentTime;
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 1.2);
  }

  function handleRowClick(pitch: ExtendedPitch) {
    selectedMidi = pitch.midi === selectedMidi ? null : pitch.midi;
    if (selectedMidi !== null) playFrequency(pitch.frequency);
  }

  function handleRowKey(e: KeyboardEvent, pitch: ExtendedPitch) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleRowClick(pitch);
    }
  }

  function formatHz(hz: number): string {
    if (hz >= 1000) return `${(hz / 1000).toFixed(hz >= 10000 ? 1 : 2)} kHz`;
    if (hz >= 1)    return `${hz.toFixed(2)} Hz`;
    return `${hz.toFixed(3)} Hz`;
  }

  function formatHzShort(hz: number): string {
    if (hz >= 10000) return `${(hz / 1000).toFixed(1)}k`;
    if (hz >= 1000)  return `${(hz / 1000).toFixed(2)}k`;
    if (hz >= 100)   return `${hz.toFixed(0)}`;
    if (hz >= 10)    return `${hz.toFixed(1)}`;
    if (hz >= 1)     return `${hz.toFixed(2)}`;
    return `${hz.toFixed(3)}`;
  }

  const PIANO_MIN_MIDI = 21;  // A0
  const PIANO_MAX_MIDI = 108; // C8

  function getPianoKeyNumber(midi: number): number | null {
    if (midi < PIANO_MIN_MIDI || midi > PIANO_MAX_MIDI) {
      return null;
    }
    return midi - PIANO_MIN_MIDI + 1;
  }
</script>

<div class="app">
  <header class="app-header">
    <div class="title-row">
      <a class="home-link" href="../" aria-label="Back to home" title="Back to home">
        <span class="home-link-icon" aria-hidden="true"></span>
      </a>
      <h1>Grand Frequency Staff</h1>
    </div>
  </header>

  <div class="body">
    <div class="scroll-area">
      <!-- Sticky detail toolbar and column headers -->
      <div class="table-header">
        <div class="detail-toolbar" aria-live="polite">
          {#if selectedPitch}
            <span class="detail-pitch" style="color: {selectedPitch.color}">{selectedPitch.noteName}</span>
            <span class="detail-hz">{formatHz(selectedPitch.frequency)}</span>
            <span class="detail-midi">MIDI {selectedPitch.midi}</span>
            <span
              class="detail-region"
              style="color: rgb({selectedPitch.stripRgb}); border-color: rgb({selectedPitch.stripRgb})"
            >{REGION_LABELS[selectedPitch.region]}</span>
          {:else}
            <span class="detail-placeholder">Select a pitch row for details</span>
          {/if}
        </div>

        <div class="metadata-header-row">
          <div class="strip-spacer"></div>
          <button
            class="paired-header pitch-header-group"
            type="button"
            onclick={() => (pitchColumnsReversed = !pitchColumnsReversed)}
            aria-label="Swap Pitch A and B columns"
          >
            <span>Pitch</span>
            <span class="column-order">{pitchColumnsReversed ? 'B / A' : 'A / B'}</span>
          </button>
          <button
            class="paired-header hz-header-group"
            type="button"
            onclick={() => (hzColumnsReversed = !hzColumnsReversed)}
            aria-label="Swap Hz A and B columns"
          >
            <span>Hz</span>
            <span class="column-order">{hzColumnsReversed ? 'B / A' : 'A / B'}</span>
          </button>
          <button
            class="paired-header midi-header-group"
            type="button"
            onclick={() => (midiColumnsReversed = !midiColumnsReversed)}
            aria-label="Swap MIDI A and B columns"
          >
            <span>MIDI</span>
            <span class="column-order">{midiColumnsReversed ? 'B / A' : 'A / B'}</span>
          </button>
          <button
            class="paired-header piano-header-group"
            type="button"
            onclick={() => (pianoColumnsReversed = !pianoColumnsReversed)}
            aria-label="Swap Piano Key A and B columns"
          >
            <span>Piano Key</span>
            <span class="column-order">{pianoColumnsReversed ? 'B / A' : 'A / B'}</span>
          </button>
        </div>

        <div class="instrument-header-row">
          {#each visibleInstruments as inst (inst.id)}
          <div
            class="inst-header"
            class:dragging={draggedInstrumentId === inst.id}
            class:drag-over-before={dragOverInstrumentId === inst.id && !dragOverAfter}
            class:drag-over-after={dragOverInstrumentId === inst.id && dragOverAfter}
            style="color: {inst.color}; background: {inst.color}22"
            title={inst.name}
            draggable="true"
            role="button"
            tabindex="0"
            aria-label="Drag {inst.name} to reorder its column"
            onkeydown={(event) => handleInstrumentHeaderKey(event, inst.id)}
            ondragstart={(event) => handleInstrumentDragStart(event, inst.id)}
            ondragover={(event) => handleInstrumentDragOver(event, inst.id)}
            ondrop={(event) => { event.preventDefault(); handleInstrumentDragEnd(); }}
            ondragend={handleInstrumentDragEnd}
          ><span>{inst.name}</span></div>
          {/each}
        </div>
      </div>

      <!-- Pitch rows, with region headers injected at each zone boundary -->
      {#each pitches as pitch, i}
        {#if i === 0 || pitch.region !== pitches[i - 1].region}
          <div class="region-header region-{pitch.region}">
            {REGION_LABELS[pitch.region]}
          </div>
        {/if}

        {@const isSelected = pitch.midi === selectedMidi}
        {@const isOctaveC = pitch.pitchClass === 0}
        {@const isColumnA = pitch.column === 'A'}
        {@const activeColumn: OffsetColumn = isColumnA ? 'A' : 'B'}
        {@const shortHz = formatHzShort(pitch.frequency)}
        {@const pianoKey = getPianoKeyNumber(pitch.midi)}
        {@const isMidiInRange = pitch.midi >= 0 && pitch.midi <= 127}
        {@const isMidiUpperBoundary = pitch.midi === 127}
        {@const isMidiLowerBoundary = pitch.midi === 0}
        <div
          class="pitch-row"
          class:selected={isSelected}
          class:octave-c={isOctaveC}
          style="--row-fill: {pitch.color}1f; --row-accent: {pitch.color}"
          onclick={() => handleRowClick(pitch)}
          onkeydown={(e) => handleRowKey(e, pitch)}
          role="button"
          tabindex="0"
          aria-pressed={isSelected}
          aria-label="{pitch.noteName}, {formatHz(pitch.frequency)}"
        >
          <div class="region-strip" style="background: rgb({pitch.stripRgb})"></div>
          <div class="offset-cells pitch-offset-cells">
            {#each getColumnOrder(pitchColumnsReversed) as column}
              <div class="offset-cell" class:active={activeColumn === column}>
                {#if activeColumn === column}
                  <span class="cell-text pitch-name" style="color: {pitch.color}">{pitch.noteName}</span>
                {/if}
              </div>
            {/each}
          </div>
          <div class="offset-cells hz-offset-cells">
            {#each getColumnOrder(hzColumnsReversed) as column}
              <div class="offset-cell hz-offset-cell" class:active={activeColumn === column}>
                {#if activeColumn === column}<span class="cell-text">{shortHz}</span>{/if}
              </div>
            {/each}
          </div>
          <div
            class="offset-cells midi-offset-cells"
            class:midi-upper-boundary={isMidiUpperBoundary}
            class:midi-lower-boundary={isMidiLowerBoundary}
          >
            {#each getColumnOrder(midiColumnsReversed) as column}
              <div class="offset-cell midi-offset-cell" class:active={activeColumn === column}>
                {#if activeColumn === column && isMidiInRange}<span class="cell-text">{pitch.midi}</span>{/if}
              </div>
            {/each}
          </div>
          <div class="offset-cells piano-offset-cells">
            {#each getColumnOrder(pianoColumnsReversed) as column}
              <div class="offset-cell piano-offset-cell" class:active={activeColumn === column}>
                {#if activeColumn === column && pianoKey !== null}<span class="cell-text">{pianoKey}</span>{/if}
              </div>
            {/each}
          </div>
          {#each visibleInstruments as inst (inst.id)}
            {@const inRange = inst.pitched && inst.minMidi <= pitch.midi && inst.maxMidi >= pitch.midi}
            <div
              class="inst-cell"
              class:in-range={inRange}
              style={inRange ? `background: ${inst.color}70` : ''}
              title={inRange ? inst.name : ''}
            ></div>
          {/each}
        </div>
      {/each}
    </div>

  </div>
</div>

<style>
  :global(*, *::before, *::after) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    padding: 0;
  }

  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #111827;
    color: #d1d5db;
    font-family: system-ui, -apple-system, sans-serif;
    overflow: hidden;
  }

  .app-header {
    padding: 10px 16px;
    background: #0f172a;
    border-bottom: 1px solid #1e293b;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  h1 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #8fa9ff;
    white-space: nowrap;
  }

  .home-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.1rem;
    height: 2.1rem;
    flex: 0 0 auto;
    border-radius: 999px;
    color: #c9dbff;
    text-decoration: none;
    border: 1px solid rgba(143, 169, 255, 0.18);
    background: rgba(143, 169, 255, 0.08);
    transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }

  .home-link:hover {
    color: #ffffff;
    border-color: rgba(143, 169, 255, 0.42);
    background: rgba(143, 169, 255, 0.18);
  }

  .home-link-icon {
    width: 1.05rem;
    height: 1.05rem;
    display: block;
    background-color: currentColor;
    -webkit-mask-image: url('./assets/home-icon.svg');
    -webkit-mask-repeat: no-repeat;
    -webkit-mask-position: center;
    -webkit-mask-size: contain;
    mask-image: url('./assets/home-icon.svg');
    mask-repeat: no-repeat;
    mask-position: center;
    mask-size: contain;
  }

  .body {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .scroll-area {
    --row-step: 11px;
    --row-cell-height: calc(var(--row-step) * 2);
    flex: 1;
    overflow: auto;
    min-width: 0;
  }

  /* Sticky detail toolbar and column headers */
  .table-header {
    display: grid;
    grid-template-columns: 346px max-content;
    grid-template-rows: 36px 60px;
    position: sticky;
    top: 0;
    z-index: 10;
    width: max-content;
    min-width: 100%;
    background: #0f172a;
    border-bottom: 1px solid #1e293b;
  }

  .detail-toolbar {
    grid-column: 1;
    grid-row: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    padding: 5px 10px 5px 12px;
    border-bottom: 1px solid #1e293b;
    border-right: 1px solid #1e293b;
    white-space: nowrap;
  }

  .detail-placeholder {
    color: #64748b;
    font-size: 0.68rem;
  }

  .detail-pitch {
    font-size: 0.88rem;
    font-weight: 700;
  }

  .detail-hz,
  .detail-midi {
    color: #b8c3d4;
    font-size: 0.67rem;
    font-variant-numeric: tabular-nums;
  }

  .detail-region {
    min-width: 0;
    overflow: hidden;
    padding-left: 6px;
    border-left: 2px solid;
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-overflow: ellipsis;
    text-transform: uppercase;
  }

  .metadata-header-row {
    grid-column: 1;
    grid-row: 2;
    display: flex;
  }

  .instrument-header-row {
    grid-column: 2;
    grid-row: 1 / 3;
    display: flex;
    min-width: max-content;
  }

  .strip-spacer {
    width: 6px;
    flex-shrink: 0;
  }

  .pitch-header-group,
  .hz-header-group,
  .midi-header-group,
  .piano-header-group {
    flex-shrink: 0;
  }

  .pitch-header-group {
    width: 96px;
    border-right: 1px solid #1e293b20;
  }

  .hz-header-group {
    width: 88px;
    border-right: 1px solid #1e293b20;
  }

  .midi-header-group {
    width: 72px;
    border-right: 1px solid #1e293b20;
  }

  .piano-header-group {
    width: 84px;
    border-right: 1px solid #1e293b;
  }

  .paired-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 60px;
    padding: 4px 2px;
    border-top: none;
    border-bottom: none;
    border-left: none;
    background: transparent;
    color: #9ca3af;
    cursor: pointer;
    font: inherit;
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    user-select: none;
  }

  .paired-header:hover,
  .paired-header:focus-visible {
    background: #1e293b;
    color: #f8fafc;
    outline: none;
  }

  .column-order {
    margin-top: 3px;
    color: #64748b;
    font-size: 0.52rem;
    font-weight: 500;
    letter-spacing: 0.08em;
  }

  .inst-header {
    width: 36px;
    flex-shrink: 0;
    position: relative;
    height: 96px;
    padding: 0;
    overflow: visible;
    border-right: 1px solid #1e293b30;
    font-size: 0.54rem;
    font-weight: 600;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: grab;
    user-select: none;
  }

  .inst-header > span {
    display: block;
    width: max-content;
    white-space: nowrap;
    transform: rotate(45deg);
    transform-origin: center;
    pointer-events: none;
  }

  .inst-header:hover,
  .inst-header:focus-visible {
    z-index: 1;
    filter: brightness(1.25);
    outline: none;
  }

  .inst-header.dragging {
    z-index: 2;
    opacity: 0.45;
    cursor: grabbing;
  }

  .inst-header.drag-over-before::before,
  .inst-header.drag-over-after::after {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: #f8fafc;
    content: '';
  }

  .inst-header.drag-over-before::before {
    left: -1px;
  }

  .inst-header.drag-over-after::after {
    right: -1px;
  }

  /* Region section headers */
  .region-header {
    position: sticky;
    top: 97px; /* just below the sticky toolbar and column headers */
    z-index: 5;
    padding: 4px 8px 4px 14px;
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    border-bottom: 1px solid transparent;
    pointer-events: none;
    user-select: none;
  }

  .region-header.region-timbre {
    background: #0b1929;
    color: #40a8d8;
    border-color: #40a8d830;
  }

  .region-header.region-pitch {
    background: #091a10;
    color: #3cb864;
    border-color: #3cb86430;
  }

  .region-header.region-rhythm {
    background: #1c0d05;
    color: #d25028;
    border-color: #d2502830;
  }

  /* Pitch rows */
  .region-strip {
    width: 6px;
    flex-shrink: 0;
    height: var(--row-cell-height);
    align-self: center;
  }

  .pitch-row {
    display: flex;
    align-items: center;
    height: var(--row-step);
    position: relative;
    overflow: visible;
    cursor: pointer;
    border-bottom: 1px solid #1e293b30;
    transition: background 0.1s;
  }

  .pitch-row:hover {
    background: #1e293b55;
  }

  .pitch-row.selected {
    background: #1e293b66;
  }

  .pitch-row.octave-c {
    border-bottom-color: #1e293b70;
  }

  .pitch-name {
    font-size: 0.68rem;
    font-weight: 500;
  }

  .offset-cells {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    flex-shrink: 0;
    height: 100%;
    overflow: visible;
  }

  .pitch-offset-cells {
    width: 96px;
    border-right: 1px solid #1e293b20;
  }

  .hz-offset-cells {
    width: 88px;
    border-right: 1px solid #1e293b20;
  }

  .midi-offset-cells {
    width: 72px;
    border-right: 1px solid #1e293b20;
  }

  .piano-offset-cells {
    width: 84px;
    border-right: 1px solid #1e293b;
  }

  .offset-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: center;
    height: var(--row-cell-height);
    border-right: 1px solid #1e293b20;
    padding: 0 4px;
    min-width: 0;
    position: relative;
  }

  .offset-cells .offset-cell:last-child {
    border-right: none;
  }

  .pitch-offset-cells .offset-cell {
    justify-content: flex-start;
    padding-left: 6px;
  }

  .offset-cell.active {
    background: var(--row-fill);
  }

  .hz-offset-cell {
    font-size: 0.6rem;
    color: #6b7280;
    font-variant-numeric: tabular-nums;
  }

  .hz-offset-cell.active {
    color: #9ca3af;
  }

  .midi-offset-cell,
  .piano-offset-cell {
    font-size: 0.6rem;
    color: #94a3b8;
    font-variant-numeric: tabular-nums;
  }

  .midi-offset-cell.active,
  .piano-offset-cell.active {
    color: #cbd5e1;
  }

  .midi-offset-cells.midi-upper-boundary .offset-cell {
    border-top: 1px solid #f59e0b;
  }

  .midi-offset-cells.midi-lower-boundary .offset-cell {
    border-bottom: 1px solid #f59e0b;
  }

  .inst-cell {
    width: 36px;
    flex-shrink: 0;
    height: var(--row-cell-height);
    align-self: center;
    border-right: 1px solid #1e293b20;
  }

  .cell-text {
    position: relative;
    z-index: 1;
    white-space: nowrap;
  }

  .pitch-row.selected .offset-cell.active,
  .pitch-row.selected .inst-cell {
    box-shadow: inset 0 0 0 1px var(--row-accent);
  }

</style>
