<script lang="ts">
	/**
	 * DualPitchDropdown Component
	 *
	 * Orchestrates two pitch dropdowns (top and bottom) with constraint coordination.
	 * Displays range summary showing selected pitch range.
	 */
	import PitchDropdown from './PitchDropdown.svelte';
	import type { PitchRowData } from '@mlt/types';
	import type { WheelOption, PitchWheelRange } from './types.js';
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
	}

	let {
		fullRowData,
		topIndex = $bindable(),
		bottomIndex = $bindable(),
		minSpan = 7,
		onrangechange,
		showSummary = true
	}: Props = $props();

	// Convert pitch data to dropdown options
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

	// Constraint functions for each dropdown
	function constrainTopIndex(requestedTopIndex: number): number {
		return computeConstrainedTopIndex(bottomIndex, requestedTopIndex, options.length, minSpan);
	}

	function constrainBottomIndex(requestedBottomIndex: number): number {
		return computeConstrainedBottomIndex(topIndex, requestedBottomIndex, options.length, minSpan);
	}

	// Handle top dropdown change
	function handleTopChange(newTopIndex: number, _option: WheelOption) {
		topIndex = newTopIndex;
		if (typeof onrangechange === 'function') {
			onrangechange(currentRange);
		}
	}

	// Handle bottom dropdown change
	function handleBottomChange(newBottomIndex: number, _option: WheelOption) {
		bottomIndex = newBottomIndex;
		if (typeof onrangechange === 'function') {
			onrangechange(currentRange);
		}
	}
</script>

<div class="dual-pitch-dropdown">
	<div class="dropdowns-container">
		<PitchDropdown
			{options}
			selectedIndex={topIndex}
			onchange={handleTopChange}
			onbeforechange={constrainTopIndex}
			label="High"
			ariaLabel="High pitch selector"
		/>

		<PitchDropdown
			{options}
			selectedIndex={bottomIndex}
			onchange={handleBottomChange}
			onbeforechange={constrainBottomIndex}
			label="Low"
			ariaLabel="Low pitch selector"
		/>
	</div>

	{#if showSummary}
		<div class="summary-card">
			<div class="summary-label">{rangeLabel}</div>
			<div class="summary-metadata">{rangeCount}</div>
		</div>
	{/if}
</div>

<style>
	.dual-pitch-dropdown {
		display: flex;
		flex-direction: column;
		gap: 12px;
		align-items: center;
	}

	.dropdowns-container {
		display: flex;
		flex-direction: row;
		gap: 16px;
		align-items: flex-start;
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
