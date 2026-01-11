<script lang="ts">
	/**
	 * PresetButtons Component
	 *
	 * Renders a set of preset buttons for quick range selection.
	 * Highlights the active preset when the current range matches.
	 */
	import type { PitchRangePreset } from './types.js';

	interface Props {
		presets: PitchRangePreset[];
		activePreset?: string;
		onPresetClick: (preset: PitchRangePreset) => void;
	}

	let { presets, activePreset, onPresetClick }: Props = $props();

	function handleClick(preset: PitchRangePreset) {
		onPresetClick(preset);
	}
</script>

<div class="preset-buttons">
	{#each presets as preset}
		<button
			class="preset-button"
			class:active={activePreset === preset.label}
			onclick={() => handleClick(preset)}
			type="button"
		>
			{preset.label}
		</button>
	{/each}
</div>

<style>
	.preset-buttons {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
		justify-content: center;
		width: 100%;
	}

	.preset-button {
		padding: 6px 12px;
		font-size: 0.7rem;
		font-weight: 600;
		color: rgba(33, 37, 41, 0.8);
		background: rgba(255, 255, 255, 0.6);
		border: 1px solid rgba(0, 0, 0, 0.1);
		border-radius: 8px;
		cursor: pointer;
		transition:
			all 0.15s ease-out;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
		user-select: none;
		letter-spacing: 0.3px;
	}

	.preset-button:hover {
		background: rgba(255, 255, 255, 0.85);
		border-color: rgba(255, 193, 7, 0.3);
		transform: translateY(-1px);
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
	}

	.preset-button:active {
		transform: translateY(0);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	}

	.preset-button.active {
		background: rgba(255, 193, 7, 0.25);
		border-color: rgba(255, 193, 7, 0.5);
		color: #000;
		font-weight: 700;
		box-shadow: 0 2px 8px rgba(255, 193, 7, 0.2);
	}

	.preset-button.active:hover {
		background: rgba(255, 193, 7, 0.35);
	}
</style>
