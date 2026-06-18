<script>
	import { afterNavigate } from "$app/navigation";
	import { onMount, getContext } from "svelte";
	import { Container, Section, Button } from "@onsvisual/svelte-components";
	import { geoUrl } from "$lib/config.js";
	import { isValidAreaCode, parseGeoJSON } from "$lib/geo.svelte.js";
	import DrawToolbar from "$lib/ui/DrawToolbar.svelte";
	import DrawMap from "$lib/ui/DrawMap.svelte";
	import DrawCounter from "$lib/ui/DrawCounter.svelte";

	let el = $state();

	let drawState = $state({
		drawMode: "simple_select",
		eraseMode: false,
		radius: 1
	});
	let drawMap = $state();

	let appState = $state(getContext("appState")());
	let { history, activeArea } = appState;

	const areasList = getContext("areasList")();
	const centroids = getContext("centroids")();

	afterNavigate(async () => {
		if (!($activeArea?.geometry && $activeArea?.properties?.oa21cds)) return;

		// Update drawn area if active area exists (may have been loaded on /build page)
		// drawMap?.clearDraw?.();
		drawMap?.applyShape?.($activeArea, "replace");
	});

	onMount(async () => {
		const code = (window.location.hash || "").slice(1);
		if (isValidAreaCode(code)) {
			const url = `${geoUrl}/${code.slice(0, 3)}/${code}.json`;
			try {
				const data = await (await fetch(url)).json();
				$activeArea = parseGeoJSON(data, centroids);
				window.history.replaceState(null, null, " ");
				drawMap?.applyShape?.($activeArea, "replace");
			} catch (err) {
				console.warn(err);
			}
		}
	});
</script>

<Section width="wider" marginBottom={false}>
	<Button
		cls="ons-u-mt-s ons-u-mb-s"
		variant="secondary"
		icon="expand"
		small
		on:click={() => {
			el.requestFullscreen();
		}}>Enter full screen map</Button
	>
</Section>
<Container width="wider" marginBottom>
	<div id="draw-container" bind:this={el}>
		<DrawToolbar
			bind:appState
			bind:drawState
			{areasList}
			{centroids}
			runAction={(action, args = []) => drawMap?.[action]?.(...args)}
		/>
		<DrawMap bind:this={drawMap} bind:appState {drawState} {centroids} />
		<DrawCounter population={centroids.population($history?.[0]?.oa || new Set())} />
	</div>
</Container>

<style>
	#draw-container {
		position: relative;
		height: 600px;
	}
</style>
