<script lang="ts">
	/**
	 * PitchWheel Component
	 *
	 * A scrollable wheel picker for selecting pitches.
	 * Supports mouse drag, wheel scrolling, and keyboard navigation.
	 */
	import type { WheelOption } from './types.js';

	interface Props {
		options: WheelOption[];
		selectedIndex: number;
		onchange?: (index: number, option: WheelOption) => void;
		onbeforechange?: (requestedIndex: number) => number;
		wheelHeight?: number;
		ariaLabel?: string;
	}

	let {
		options,
		selectedIndex = $bindable(),
		onchange,
		onbeforechange,
		wheelHeight,
		ariaLabel = 'Pitch selector'
	}: Props = $props();

	const OPTION_HEIGHT = 40;
	const SCROLL_STEP = OPTION_HEIGHT;

	// Component state
	let wheelElement: HTMLDivElement | undefined = $state();
	let viewportElement: HTMLDivElement | undefined = $state();
	let optionsElement: HTMLDivElement | undefined = $state();
	let pointerActive = $state(false);
	let pointerId: number | null = $state(null);
	let lastPointerY = $state(0);
	let deltaBuffer = $state(0);
	let measuredOptionHeight = $state(OPTION_HEIGHT);

	// Derived values
	const optionDistances = $derived(
		options.map((_, index) => Math.min(Math.abs(index - selectedIndex), 3))
	);

	const viewportHeight = $derived(viewportElement?.clientHeight ?? 0);
	const padding = $derived(Math.max(0, (viewportHeight - measuredOptionHeight) / 2));
	const centerOffset = $derived(selectedIndex * measuredOptionHeight + measuredOptionHeight / 2);
	// Only apply translateY when we have valid viewport dimensions to avoid incorrect positioning
	const translateY = $derived(viewportHeight > 0 ? viewportHeight / 2 - centerOffset : 0);

	// Set index with optional constraint callback
	function setIndex(index: number) {
		if (!options || options.length === 0) return;

		// Allow parent to pre-validate/constrain the requested index
		let targetIndex = index;
		if (typeof onbeforechange === 'function') {
			targetIndex = onbeforechange(index);
		}

		const clampedIndex = Math.max(0, Math.min(options.length - 1, targetIndex));
		if (clampedIndex === selectedIndex) return;

		selectedIndex = clampedIndex;

		if (typeof onchange === 'function') {
			const option = options[clampedIndex];
			if (option) {
				onchange(clampedIndex, option);
			}
		}
	}

	function increment(step: number) {
		if (step === 0) return;
		setIndex(selectedIndex + step);
	}

	// Event handlers
	function handleWheel(event: WheelEvent) {
		event.preventDefault();
		event.stopPropagation();
		const delta = Math.sign(event.deltaY);
		if (delta !== 0) {
			increment(delta);
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			increment(-1);
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			increment(1);
		} else if (event.key === 'Home') {
			event.preventDefault();
			setIndex(0);
		} else if (event.key === 'End') {
			event.preventDefault();
			setIndex(options.length - 1);
		}
	}

	function handlePointerDown(event: PointerEvent) {
		pointerActive = true;
		pointerId = event.pointerId;
		lastPointerY = event.clientY;
		deltaBuffer = 0;
		if (wheelElement && typeof wheelElement.setPointerCapture === 'function') {
			try {
				wheelElement.setPointerCapture(event.pointerId);
			} catch {
				// ignore
			}
		}
	}

	function handlePointerMove(event: PointerEvent) {
		if (!pointerActive || event.pointerId !== pointerId) return;

		const deltaY = event.clientY - lastPointerY;
		lastPointerY = event.clientY;
		if (deltaY === 0) return;

		deltaBuffer += deltaY;
		const step = measuredOptionHeight || SCROLL_STEP;
		while (Math.abs(deltaBuffer) >= step) {
			const direction = -Math.sign(deltaBuffer); // drag down = scroll up
			increment(direction);
			deltaBuffer -= Math.sign(deltaBuffer) * step;
		}
	}

	function handlePointerEnd(event: PointerEvent) {
		if (pointerActive && event.pointerId === pointerId) {
			pointerActive = false;
			pointerId = null;
			deltaBuffer = 0;
			if (wheelElement?.hasPointerCapture?.(event.pointerId)) {
				wheelElement.releasePointerCapture(event.pointerId);
			}
		}
	}

	// Measure option height effect
	$effect(() => {
		if (!optionsElement || !viewportElement) return;

		const measureHeight = () => {
			const firstOption = optionsElement?.querySelector('.pitch-wheel-option') as HTMLElement;
			if (firstOption) {
				measuredOptionHeight = firstOption.offsetHeight || OPTION_HEIGHT;
			}
		};

		// Initial measurement
		measureHeight();

		// Observe size changes
		const resizeObserver = new ResizeObserver(() => {
			measureHeight();
		});

		resizeObserver.observe(viewportElement);

		return () => {
			resizeObserver.disconnect();
		};
	});
</script>

<div
	bind:this={wheelElement}
	class="pitch-wheel"
	role="slider"
	tabindex="0"
	aria-label={ariaLabel}
	aria-valuemin="0"
	aria-valuemax={options.length - 1}
	aria-valuenow={selectedIndex}
	aria-valuetext={options[selectedIndex]?.label ?? ''}
	style:height={wheelHeight ? `${wheelHeight}px` : '100%'}
	onwheel={handleWheel}
	onkeydown={handleKeydown}
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerup={handlePointerEnd}
	onpointercancel={handlePointerEnd}
	onpointerleave={handlePointerEnd}
>
	<div bind:this={viewportElement} class="pitch-wheel-viewport">
		<div
			bind:this={optionsElement}
			class="pitch-wheel-options"
			style:padding-top="{padding}px"
			style:padding-bottom="{padding}px"
			style:transform="translateY({translateY}px)"
		>
			{#each options as option, index (option.index)}
				<div class="pitch-wheel-option" data-distance={optionDistances[index]}>
					{option.label}
				</div>
			{/each}
		</div>
	</div>
	<div class="pitch-wheel-overlay"></div>
</div>

<style>
	.pitch-wheel {
		position: relative;
		border-radius: 18px;
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 249, 250, 0.85) 100%);
		border: 1px solid rgba(0, 0, 0, 0.05);
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.5);
		min-height: 0;
		width: clamp(70px, 8dvw, 90px);
		min-width: 0;
		outline: none;
		cursor: grab;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: box-shadow 0.2s ease, border-color 0.2s ease;
	}

	.pitch-wheel:focus-visible {
		border-color: #ffc107;
		box-shadow: 0 0 0 3px rgba(255, 193, 7, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.6);
	}

	.pitch-wheel:active {
		cursor: grabbing;
	}

	.pitch-wheel-viewport {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
		display: flex;
		align-items: stretch;
		justify-content: center;
	}

	.pitch-wheel-options {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
		transform: translateY(0);
		transition: transform 0.18s ease-out;
		will-change: transform;
	}

	.pitch-wheel-option {
		width: 100%;
		text-align: center;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.8rem;
		font-weight: 500;
		color: rgba(33, 37, 41, 0.35);
		user-select: none;
		pointer-events: none;
		transform-origin: center;
		transition:
			color 0.18s ease-out,
			transform 0.18s ease-out,
			opacity 0.18s ease-out;
		opacity: 0.3;
	}

	.pitch-wheel-option[data-distance='0'] {
		font-size: 0.95rem;
		color: #212529;
		opacity: 1;
	}

	.pitch-wheel-option[data-distance='1'] {
		opacity: 0.55;
		transform: scale(0.95);
	}

	.pitch-wheel-option[data-distance='2'] {
		opacity: 0.4;
		transform: scale(0.9);
	}

	.pitch-wheel-overlay {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: linear-gradient(
			180deg,
			rgba(248, 249, 250, 0.92) 0%,
			rgba(255, 255, 255, 0) 20%,
			rgba(255, 255, 255, 0) 80%,
			rgba(248, 249, 250, 0.92) 100%
		);
		border-radius: 18px;
	}

	.pitch-wheel-overlay::before {
		content: '';
		position: absolute;
		left: 0%;
		right: 0%;
		top: 50%;
		height: 30px;
		border-radius: 16px;
		border: 1px solid rgba(255, 193, 7, 0.35);
		background: rgba(255, 193, 7, 0.12);
		transform: translateY(-50%);
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.4);
	}
</style>
