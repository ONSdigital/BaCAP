<script>
	import { Tween } from "svelte/motion";
	import { cubicOut } from "svelte/easing";

	let { population } = $props();

	let counter = new Tween(population, {
		duration: 500,
		easing: cubicOut
	});

	$effect(() => (counter.target = population));
</script>

<div class="counter">
	<span class="ons-u-fs-s">Total population</span><br />
	<strong
		>{counter.current.toLocaleString("en-GB", {
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		})}</strong
	>
</div>

<style>
	.counter {
		background: white;
		padding: 10px;
		border-radius: 8px;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
		position: absolute;
		z-index: 99;
		margin: 8px;
		bottom: 15px;
	}
</style>
