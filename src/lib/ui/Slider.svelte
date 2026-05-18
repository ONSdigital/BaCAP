<script>
	import { onMount } from "svelte";

	export let min = 0.1;
	export let max = 20;
	export let step = 0.1;
	export let value = 1;
	export let width = null;

	let range, thumb, track;

	const updateSlider = (value) => {
		if (thumb) {
			let percent = ((value - min) / (max - min)) * 100;
			thumb.style.left = `${percent}%`;
			thumb.style.transform = `translate(${-percent}%, -50%)`;
			track.style.width = `${percent}%`;
		}
	};

	onMount(() => {
		range.oninput = (e) => updateSlider(e.target.value);
		updateSlider(value); // Init value
	});

	$: updateSlider(value);
</script>

<div class="slider">
	<input
		type="range"
		class="range"
		{min}
		{max}
		{step}
		bind:value
		bind:this={range}
		style:width="{width}px"
	/>
	<div class="track">
		<div class="track-inner" bind:this={track} />
	</div>
	<div class="thumb" bind:this={thumb} />
</div>

<style>
	.slider {
		position: relative;
	}
	.range {
		cursor: pointer;
		opacity: 0;
		width: 100% !important;
	}
	.range::-ms-tooltip {
		display: none;
	}
	.track {
		width: 100%;
		height: 6px;
		background: #dddddd;
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		pointer-events: none;
		border-radius: 3px;
	}
	.track-inner {
		width: 0;
		height: 100%;
		background: var(--ons-color-branded);
		border-radius: 3px;
	}
	.thumb {
		width: 20px;
		height: 20px;
		background: var(--ons-color-branded);
		border-radius: 50%;
		position: absolute;
		top: 50%;
		left: 0;
		transform: translate(0%, -50%);
		pointer-events: none;
	}
	.slider:focus-within .thumb {
		outline: 3px solid var(--ons-color-focus);
		border: 2px solid black;
	}
</style>
