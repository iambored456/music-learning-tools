<script lang="ts">
	/**
	 * PitchDropdown Component
	 *
	 * A dropdown selector for selecting pitches.
	 * Uses the same constraint callback pattern as PitchWheel.
	 */
	import type { WheelOption } from './types.js';

	interface Props {
		options: WheelOption[];
		selectedIndex: number;
		onchange?: (index: number, option: WheelOption) => void;
		onbeforechange?: (requestedIndex: number) => number;
		label?: string;
		ariaLabel?: string;
	}

	let {
		options,
		selectedIndex = $bindable(),
		onchange,
		onbeforechange,
		label,
		ariaLabel = 'Pitch selector'
	}: Props = $props();

	function handleChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		let newIndex = parseInt(select.value, 10);

		// Apply constraint if provided
		if (typeof onbeforechange === 'function') {
			newIndex = onbeforechange(newIndex);
		}

		// Clamp to valid range
		const clampedIndex = Math.max(0, Math.min(options.length - 1, newIndex));

		if (clampedIndex !== selectedIndex) {
			selectedIndex = clampedIndex;

			if (typeof onchange === 'function') {
				const option = options[clampedIndex];
				if (option) {
					onchange(clampedIndex, option);
				}
			}
		}

		// Reset select value in case constraint changed it
		select.value = String(selectedIndex);
	}
</script>

<div class="pitch-dropdown">
	{#if label}
		<div class="dropdown-label">{label}</div>
	{/if}
	<select
		value={selectedIndex}
		onchange={handleChange}
		aria-label={ariaLabel}
		class="dropdown-select"
	>
		{#each options as option, index (option.index)}
			<option value={index}>{option.label}</option>
		{/each}
	</select>
</div>

<style>
	.pitch-dropdown {
		display: flex;
		flex-direction: column;
		gap: 8px;
		align-items: center;
	}

	.dropdown-label {
		font-size: 0.7rem;
		font-weight: 600;
		color: rgba(33, 37, 41, 0.6);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.dropdown-select {
		appearance: none;
		background: linear-gradient(
			180deg,
			rgba(255, 255, 255, 0.9) 0%,
			rgba(248, 249, 250, 0.85) 100%
		);
		border: 1px solid rgba(0, 0, 0, 0.1);
		border-radius: 12px;
		padding: 10px 32px 10px 16px;
		font-size: 0.9rem;
		font-weight: 500;
		color: #212529;
		cursor: pointer;
		min-width: 90px;
		text-align: center;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
		transition:
			border-color 0.2s ease,
			box-shadow 0.2s ease;

		/* Custom dropdown arrow */
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L2 4h8z'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 12px center;
	}

	.dropdown-select:hover {
		border-color: rgba(0, 0, 0, 0.2);
	}

	.dropdown-select:focus {
		outline: none;
		border-color: #ffc107;
		box-shadow: 0 0 0 3px rgba(255, 193, 7, 0.25);
	}

	.dropdown-select option {
		background: white;
		color: #212529;
		padding: 8px;
	}
</style>
