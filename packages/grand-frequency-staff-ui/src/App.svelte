<script lang="ts">
  import { extendedPitches, type ExtendedPitch, type Region } from './data/pitchRange';
  import { INSTRUMENTS, FAMILIES, FAMILY_COLORS, type InstrumentFamily } from './data/instruments';

  const pitches = extendedPitches; // 185 pitches, E10 → C-5

  const REGION_LABELS: Record<Region, string> = {
    timbre: 'Timbre  ·  4,000 – 20,000 Hz',
    pitch:  'Pitch  ·  20 – 4,000 Hz',
    rhythm: 'Rhythm  ·  < 20 Hz',
  };

  let selectedMidi = $state<number | null>(null);
  let activeFamilies = $state<Set<InstrumentFamily>>(new Set(FAMILIES));
  let audioCtx: AudioContext | null = null;

  const visibleInstruments = $derived(
    INSTRUMENTS.filter(i => activeFamilies.has(i.family))
  );

  const selectedPitch = $derived(
    pitches.find(p => p.midi === selectedMidi) ?? null
  );

  const instrumentsForSelected = $derived.by(() => {
    const midi = selectedMidi;
    if (midi === null) return [];
    return INSTRUMENTS.filter(i => i.pitched && i.minMidi <= midi && i.maxMidi >= midi);
  });

  function toggleFamily(family: InstrumentFamily) {
    const next = new Set(activeFamilies);
    if (next.has(family)) next.delete(family);
    else next.add(family);
    activeFamilies = next;
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
    <h1>Grand Frequency Staff</h1>
    <div class="family-filters">
      {#each FAMILIES as family}
        <button
          class="chip"
          class:active={activeFamilies.has(family)}
          style="--chip-color: {FAMILY_COLORS[family]}"
          onclick={() => toggleFamily(family)}
        >{family}</button>
      {/each}
    </div>
  </header>

  <div class="body">
    <div class="scroll-area">
      <!-- Sticky column headers -->
      <div class="header-row">
        <div class="strip-spacer"></div>
        <div class="pitch-header-group">
          <div class="offset-header-cell">Pitch A</div>
          <div class="offset-header-cell">Pitch B</div>
        </div>
        <div class="hz-header-group">
          <div class="offset-header-cell">Hz A</div>
          <div class="offset-header-cell">Hz B</div>
        </div>
        <div class="midi-header-group">
          <div class="offset-header-cell">MIDI A</div>
          <div class="offset-header-cell">MIDI B</div>
        </div>
        <div class="piano-header-group">
          <div class="offset-header-cell">Key A</div>
          <div class="offset-header-cell">Key B</div>
        </div>
        {#each visibleInstruments as inst}
          <div
            class="inst-header"
            style="color: {inst.color}; background: {inst.color}22"
            title={inst.name}
          >{inst.name}</div>
        {/each}
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
            <div class="offset-cell" class:active={isColumnA}>
              {#if isColumnA}
                <span class="cell-text pitch-name" style="color: {pitch.color}">{pitch.noteName}</span>
              {/if}
            </div>
            <div class="offset-cell" class:active={!isColumnA}>
              {#if !isColumnA}
                <span class="cell-text pitch-name" style="color: {pitch.color}">{pitch.noteName}</span>
              {/if}
            </div>
          </div>
          <div class="offset-cells hz-offset-cells">
            <div class="offset-cell hz-offset-cell" class:active={isColumnA}>
              {#if isColumnA}<span class="cell-text">{shortHz}</span>{/if}
            </div>
            <div class="offset-cell hz-offset-cell" class:active={!isColumnA}>
              {#if !isColumnA}<span class="cell-text">{shortHz}</span>{/if}
            </div>
          </div>
          <div
            class="offset-cells midi-offset-cells"
            class:midi-upper-boundary={isMidiUpperBoundary}
            class:midi-lower-boundary={isMidiLowerBoundary}
          >
            <div class="offset-cell midi-offset-cell" class:active={isColumnA}>
              {#if isColumnA && isMidiInRange}<span class="cell-text">{pitch.midi}</span>{/if}
            </div>
            <div class="offset-cell midi-offset-cell" class:active={!isColumnA}>
              {#if !isColumnA && isMidiInRange}<span class="cell-text">{pitch.midi}</span>{/if}
            </div>
          </div>
          <div class="offset-cells piano-offset-cells">
            <div class="offset-cell piano-offset-cell" class:active={isColumnA}>
              {#if isColumnA && pianoKey !== null}<span class="cell-text">{pianoKey}</span>{/if}
            </div>
            <div class="offset-cell piano-offset-cell" class:active={!isColumnA}>
              {#if !isColumnA && pianoKey !== null}<span class="cell-text">{pianoKey}</span>{/if}
            </div>
          </div>
          {#each visibleInstruments as inst}
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

    <!-- Detail sidebar -->
    {#if selectedPitch}
      <aside class="detail-panel">
        <button class="close-btn" onclick={() => { selectedMidi = null; }}>✕</button>

        <div class="detail-pitch" style="color: {selectedPitch.color}">{selectedPitch.noteName}</div>
        <div class="detail-hz">{formatHz(selectedPitch.frequency)}</div>
        <div class="detail-midi">MIDI {selectedPitch.midi} · Oct {selectedPitch.octave}</div>

        <div
          class="detail-region"
          style="color: rgb({selectedPitch.stripRgb}); border-color: rgb({selectedPitch.stripRgb}, 0.3)"
        >{REGION_LABELS[selectedPitch.region]}</div>

        <div class="detail-section-label">Instruments</div>
        {#if instrumentsForSelected.length > 0}
          <ul class="inst-list">
            {#each instrumentsForSelected as inst}
              <li style="color: {FAMILY_COLORS[inst.family]}">{inst.name}</li>
            {/each}
          </ul>
        {:else}
          <p class="no-inst">Outside all standard instrument ranges</p>
        {/if}
      </aside>
    {/if}
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

  h1 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #8fa9ff;
    white-space: nowrap;
  }

  .family-filters {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .chip {
    padding: 3px 10px;
    border-radius: 20px;
    border: 1px solid var(--chip-color);
    background: transparent;
    color: #6b7280;
    cursor: pointer;
    font-size: 0.7rem;
    text-transform: capitalize;
    transition: all 0.15s;
    line-height: 1.4;
  }

  .chip.active {
    background: var(--chip-color);
    color: #111;
    font-weight: 600;
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

  /* Sticky column headers */
  .header-row {
    display: flex;
    position: sticky;
    top: 0;
    z-index: 10;
    background: #0f172a;
    border-bottom: 1px solid #1e293b;
  }

  .strip-spacer {
    width: 6px;
    flex-shrink: 0;
  }

  .pitch-header-group,
  .hz-header-group,
  .midi-header-group,
  .piano-header-group {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
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

  .offset-header-cell {
    font-size: 0.56rem;
    color: #4b5563;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    height: 80px;
    padding: 4px 2px;
    border-right: 1px solid #1e293b30;
    user-select: none;
  }

  .pitch-header-group .offset-header-cell:last-child,
  .hz-header-group .offset-header-cell:last-child,
  .midi-header-group .offset-header-cell:last-child,
  .piano-header-group .offset-header-cell:last-child {
    border-right: none;
  }

  .inst-header {
    width: 36px;
    flex-shrink: 0;
    font-size: 0.55rem;
    text-align: center;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-right: 1px solid #1e293b30;
    padding: 4px 2px;
    overflow: hidden;
    white-space: nowrap;
    font-weight: 500;
  }

  /* Region section headers */
  .region-header {
    position: sticky;
    top: 81px; /* just below the sticky column headers */
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

  /* Detail sidebar */
  .detail-panel {
    width: 200px;
    flex-shrink: 0;
    overflow-y: auto;
    padding: 14px 14px 14px 14px;
    border-left: 1px solid #1e293b;
    background: #0f172a;
    position: relative;
  }

  .close-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    background: none;
    border: none;
    color: #4b5563;
    cursor: pointer;
    font-size: 0.75rem;
    padding: 2px 4px;
    line-height: 1;
  }

  .close-btn:hover {
    color: #9ca3af;
  }

  .detail-pitch {
    font-size: 1.8rem;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 6px;
    padding-right: 20px;
  }

  .detail-hz {
    font-size: 0.9rem;
    color: #9ca3af;
    margin-bottom: 2px;
    font-variant-numeric: tabular-nums;
  }

  .detail-midi {
    font-size: 0.72rem;
    color: #6b7280;
    margin-bottom: 10px;
  }

  .detail-region {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    border-left: 3px solid;
    padding-left: 6px;
    margin-bottom: 14px;
  }

  .detail-section-label {
    font-size: 0.65rem;
    color: #4b5563;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 6px;
  }

  .inst-list {
    list-style: none;
    padding: 0;
    margin: 0;
    font-size: 0.78rem;
  }

  .inst-list li {
    padding: 2px 0;
  }

  .no-inst {
    font-size: 0.72rem;
    color: #4b5563;
    font-style: italic;
    margin: 0;
  }
</style>
