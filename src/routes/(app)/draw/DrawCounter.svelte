<script>
	import { Tween } from "svelte/motion";
	import { cubicOut } from "svelte/easing";

	const bestfitOptions = [
		{ id: "none", label: "No best-fit" },
		{ id: "oa", label: "Output Area best-fit" },
		{ id: "lsoa", label: "LSOA best-fit" }
	];

	let { population } = $props();

	let counter = new Tween(population, {
		duration: 500,
		easing: cubicOut
	});

	$effect(() => (counter.target = population));
</script>

<div class="floating-map-control">
	<div class="ons-u-fs-s">Total population</div>
	<strong
		>{counter.current.toLocaleString("en-GB", {
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		})}</strong
	>
</div>

<style>
	.floating-map-control {
		padding-top: 4px;
	}
</style>
