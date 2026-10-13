<script>
	import { Input } from "@onsvisual/svelte-components";
	import Slider from "./Slider.svelte";
	import { focusChildInput } from "$lib/util/common";

	let {
		min = 0.1,
		max = 20,
		step = 0.1,
		value = $bindable(1),
		unit = "km",
		autoFocus = false
	} = $props();

	function handleInput(e) {
		const val = e?.detail?.value;
		if (+val > min) value = +val > max ? max : +val;
		else value = min;
	}

	let focus = $derived(autoFocus ? focusChildInput : () => null);
</script>

<div class="slider-wrapper" use:focus>
	<Slider {min} {max} {step} bind:value />
	<Input suffix={unit || null} width={2} {value} on:change={handleInput} on:blur={handleInput} />
</div>

<style>
	.slider-wrapper {
		display: flex;
		flex-direction: row;
		gap: 8px;
		margin-top: 8px;
	}
	.slider-wrapper :global(.slider) {
		flex-grow: 1;
	}
	.slider-wrapper :global(.ons-field) {
		flex-shrink: 1;
	}
	.slider-wrapper :global(.ons-field input) {
		margin: 0;
	}
</style>
