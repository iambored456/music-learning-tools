<script lang="ts">
	/**
	 * DualPitchWheel Component
	 *
	 * Orchestrates two pitch wheels (top and bottom) with constraint coordination.
	 * Displays range summary showing selected pitch range.
	 */
	import PitchWheel from './PitchWheel.svelte';
	import PresetButtons from './PresetButtons.svelte';
	import type { PitchRowData } from '@mlt/types';
	import type { WheelOption, PitchWheelRange, PitchRangePreset } from './types.js';
	import {
		createWheelOptions,
		computeConstrainedTopIndex,
		computeConstrainedBottomIndex
	} from './pitchWheelUtils.js';

	interface Props {
		fullRowData: PitchRowData[];
		topIndex: number;
		bottomIndex: number;
		minSpan?: number;
		onrangechange?: (range: PitchWheelRange) => void;
		showSummary?: boolean;
		wheelHeight?: number;
		presets?: PitchRangePreset[];
		showPresets?: boolean;
	}

	let {
		fullRowData,
		topIndex = $bindable(),
		bottomIndex = $bindable(),
		minSpan = 7,
		onrangechange,
		showSummary = true,
		wheelHeight,
		presets,
		showPresets = false
	}: Props = $props();

	// Convert pitch data to wheel options
	const options = $derived(createWheelOptions(fullRowData));

	// Derived range data
	const currentRange = $derived<PitchWheelRange>({
		topIndex,
		bottomIndex,
		topPitch: fullRowData[topIndex],
		bottomPitch: fullRowData[bottomIndex],
		span: bottomIndex - topIndex + 1
	});

	const rangeLabel = $derived(
		currentRange.topPitch && currentRange.bottomPitch
			? `${currentRange.topPitch.pitch} – ${currentRange.bottomPitch.pitch}`
			: ''
	);

	const rangeCount = $derived(
		`${currentRange.span} ${currentRange.span === 1 ? 'pitch' : 'pitches'}`
	);

	// Determine which preset is currently active based on current range
	const activePreset = $derived.by(() => {
		if (!presets || presets.length === 0) return undefined;
		const matchingPreset = presets.find(
			(p) => p.topIndex === topIndex && p.bottomIndex === bottomIndex
		);
		return matchingPreset?.label;
	});

	// Constraint functions for each wheel
	function constrainTopIndex(requestedTopIndex: number): number {
		return computeConstrainedTopIndex(bottomIndex, requestedTopIndex, options.length, minSpan);
	}

	function constrainBottomIndex(requestedBottomIndex: number): number {
		return computeConstrainedBottomIndex(topIndex, requestedBottomIndex, options.length, minSpan);
	}

	// Handle top wheel change
	function handleTopChange(newTopIndex: number, _option: WheelOption) {
		topIndex = newTopIndex;
		if (typeof onrangechange === 'function') {
			onrangechange(currentRange);
		}
	}

	// Handle bottom wheel change
	function handleBottomChange(newBottomIndex: number, _option: WheelOption) {
		bottomIndex = newBottomIndex;
		if (typeof onrangechange === 'function') {
			onrangechange(currentRange);
		}
	}

	// Handle preset button click
	function handlePresetClick(preset: PitchRangePreset) {
		topIndex = preset.topIndex;
		bottomIndex = preset.bottomIndex;
		if (typeof onrangechange === 'function') {
			onrangechange(currentRange);
		}
	}
</script>

<div class="dual-pitch-wheel">
	<div class="wheels-container">
		<div class="wheel-column">
			<div class="wheel-label">High</div>
			<PitchWheel
				{options}
				selectedIndex={topIndex}
				onchange={handleTopChange}
				onbeforechange={constrainTopIndex}
				{wheelHeight}
				ariaLabel="High pitch selector"
			/>
		</div>

		<div class="wheel-column">
			<div class="wheel-label">Low</div>
			<PitchWheel
				{options}
				selectedIndex={bottomIndex}
				onchange={handleBottomChange}
				onbeforechange={constrainBottomIndex}
				{wheelHeight}
				ariaLabel="Low pitch selector"
			/>
		</div>
	</div>

	{#if showSummary}
		<div class="summary-card">
			<div class="summary-label">{rangeLabel}</div>
			<div class="summary-metadata">{rangeCount}</div>
		</div>
	{/if}

	{#if showPresets && presets && presets.length > 0}
		<PresetButtons {presets} activePreset={activePreset} onPresetClick={handlePresetClick} />
	{/if}
</div>

<style>
	.dual-pitch-wheel {
		display: flex;
		flex-direction: column;
		gap: 12px;
		align-items: center;
	}

	.wheels-container {
		display: flex;
		flex-direction: row;
		gap: 12px;
		align-items: stretch;
	}

	.wheel-column {
		display: flex;
		flex-direction: column;
		gap: 8px;
		align-items: center;
	}

	.wheel-label {
		font-size: 0.7rem;
		font-weight: 600;
		color: rgba(33, 37, 41, 0.6);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.summary-card {
		background: rgba(255, 255, 255, 0.6);
		border-radius: 12px;
		padding: 10px 16px;
		border: 1px solid rgba(0, 0, 0, 0.08);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
		display: flex;
		flex-direction: column;
		gap: 4px;
		align-items: center;
		min-width: 120px;
	}

	.summary-label {
		font-size: 0.85rem;
		font-weight: 600;
		color: #212529;
		line-height: 1.2;
	}

	.summary-metadata {
		font-size: 0.7rem;
		color: #6c757d;
	}
</style>
