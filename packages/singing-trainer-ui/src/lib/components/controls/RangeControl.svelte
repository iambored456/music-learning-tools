<script lang="ts">
	/**
	 * RangeControl Component
	 *
	 * Dropdown fallback for pitch range selection.
	 * Provides two select inputs (Top Pitch, Bottom Pitch) synced with app state.
	 */
	import { appState } from '@mlt/singing-trainer-core/stores/appState.svelte.js';
	import {
		generateMidiOptions,
		setTop,
		setBottom,
		MIN_RANGE_SEMITONES,
	} from '@mlt/singing-trainer-core/pitch-range/pitchRangeController.js';

	const midiOptions = generateMidiOptions();

	const voicePresets = [
		{ label: 'Voice I', minMidi: 57, maxMidi: 81 },   // A3–A5
		{ label: 'Voice II', minMidi: 48, maxMidi: 72 },   // C3–C5
		{ label: 'Voice III', minMidi: 40, maxMidi: 64 },  // E2–E4
	];

	const topMidi = $derived(appState.state.yAxisRange.maxMidi);
	const bottomMidi = $derived(appState.state.yAxisRange.minMidi);

	function handleTopChange(e: Event) {
		const candidate = Number((e.target as HTMLSelectElement).value);
		const range = setTop({ bottomMidi, topMidi }, candidate);
		appState.setYAxisRange({ minMidi: range.bottomMidi, maxMidi: range.topMidi });
	}

	function handleBottomChange(e: Event) {
		const candidate = Number((e.target as HTMLSelectElement).value);
		const range = setBottom({ bottomMidi, topMidi }, candidate);
		appState.setYAxisRange({ minMidi: range.bottomMidi, maxMidi: range.topMidi });
	}
</script>

<div class="range-control">
	<h3 class="control-title">Pitch Range</h3>

	<div class="range-row">
		<label class="range-label" for="top-pitch">Top</label>
		<select id="top-pitch" class="range-select" value={topMidi} onchange={handleTopChange}>
			{#each midiOptions as opt}
				<option value={opt.midi} disabled={opt.midi < bottomMidi + MIN_RANGE_SEMITONES}>
					{opt.label}
				</option>
			{/each}
		</select>
	</div>

	<div class="range-row">
		<label class="range-label" for="bottom-pitch">Bottom</label>
		<select id="bottom-pitch" class="range-select" value={bottomMidi} onchange={handleBottomChange}>
			{#each midiOptions as opt}
				<option value={opt.midi} disabled={opt.midi > topMidi - MIN_RANGE_SEMITONES}>
					{opt.label}
				</option>
			{/each}
		</select>
	</div>

	<div class="preset-row">
		{#each voicePresets as preset}
			<button
				class="preset-btn"
				class:preset-btn--active={topMidi === preset.maxMidi && bottomMidi === preset.minMidi}
				onclick={() => appState.setYAxisRange({ minMidi: preset.minMidi, maxMidi: preset.maxMidi })}
			>
				{preset.label}
			</button>
		{/each}
	</div>
</div>

<style>
	.range-control {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 8px;
	}

	.control-title {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.9);
		text-align: center;
		letter-spacing: 0.5px;
	}

	.range-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.range-label {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.7);
		min-width: 48px;
	}

	.preset-row {
		display: flex;
		gap: 6px;
	}

	.preset-btn {
		flex: 1;
		padding: 4px 2px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 4px;
		background: rgba(0, 0, 0, 0.3);
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.75rem;
		cursor: pointer;
		transition: background-color 0.15s ease, color 0.15s ease;
	}

	.preset-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.9);
	}

	.preset-btn--active {
		background: var(--color-primary, #5b8dd9);
		color: white;
		border-color: transparent;
	}

	.range-select {
		flex: 1;
		padding: 4px 6px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 4px;
		background: rgba(0, 0, 0, 0.3);
		color: rgba(255, 255, 255, 0.9);
		font-size: 0.8rem;
	}
</style>
