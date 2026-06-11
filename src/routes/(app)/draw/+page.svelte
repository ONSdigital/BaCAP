<script>
	import { resolve } from "$app/paths";
	import { getContext } from "svelte";
	import { Container, Breadcrumb } from "@onsvisual/svelte-components";
	import DrawToolbar from "$lib/ui/DrawToolbar.svelte";
	import DrawMap from "$lib/ui/DrawMap.svelte";
	import DrawCounter from "$lib/ui/DrawCounter.svelte";

	let drawState = $state({
		drawMode: "simple_select",
		eraseMode: false,
		radius: 1
	});
	let drawMap = $state();

	let appState = $state(getContext("appState")());
	let { history } = appState;

	const areasList = getContext("areasList")();
	const centroids = getContext("centroids")();
</script>

<Container id="draw-container" width="full" height="calc(100vh - 52px)">
	<div class="breadcrumb-container">
		<Breadcrumb links={[{ label: "Build a custom area profile", href: resolve("/") }]} />
	</div>
	<DrawToolbar
		bind:appState
		bind:drawState
		{areasList}
		{centroids}
		runAction={(action, args = []) => drawMap?.[action]?.(...args)}
	/>
	<DrawMap bind:this={drawMap} bind:appState {drawState} {centroids} />
	<DrawCounter population={centroids.population($history?.[0]?.oa || new Set())} />
</Container>

<style>
	:global(#draw-container) {
		position: relative;
	}
	.breadcrumb-container {
		position: absolute;
		bottom: 100%;
		right: 0;
	}
</style>
