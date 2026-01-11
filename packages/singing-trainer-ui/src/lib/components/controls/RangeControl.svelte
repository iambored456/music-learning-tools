<script lang="ts">
	/**
	 * RangeControl Component
	 *
	 * Wrapper for DualPitchWheel that integrates with singing-trainer app state.
	 * Converts between MIDI values (used in app state) and indices (used by wheels).
	 */
	import { DualPitchWheel, createVoicePresets } from '@mlt/ui-components/pitch-wheels';
	import type { PitchWheelRange, PitchRangePreset } from '@mlt/ui-components/pitch-wheels';
	import { fullRowData } from '@mlt/pitch-data';
	import { appState } from '../../stores/appState.svelte';

	// Convert MIDI to index in fullRowData
	function midiToIndex(midi: number): number {
		const index = fullRowData.findIndex((p) => p.midi === midi);
		return index >= 0 ? index : 0;
	}

	// Current indices derived from app state
	const topIndex = $derived(midiToIndex(appState.state.yAxisRange.maxMidi));
	const bottomIndex = $derived(midiToIndex(appState.state.yAxisRange.minMidi));

	// Create voice presets
	const voicePresets: PitchRangePreset[] = createVoicePresets(fullRowData);

	// Handle range change from wheels
	function handleRangeChange(range: PitchWheelRange) {
		const minMidi = range.bottomPitch.midi ?? 21;
		const maxMidi = range.topPitch.midi ?? 108;
		appState.setYAxisRange({ minMidi, maxMidi });
	}
</script>

<div class="range-control">
	<h3 class="control-title">Pitch Range</h3>
	<DualPitchWheel
		{fullRowData}
		{topIndex}
		{bottomIndex}
		minSpan={7}
		onrangechange={handleRangeChange}
		showSummary={true}
		wheelHeight={200}
		presets={voicePresets}
		showPresets={true}
	/>
</div>

<style>
	.range-control {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 16px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 12px;
	}

	.control-title {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.9);
		text-align: center;
		letter-spacing: 0.5px;
	}
</style>
