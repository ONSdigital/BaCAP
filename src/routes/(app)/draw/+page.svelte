<script>
	import { afterNavigate } from "$app/navigation";
	import { onMount, getContext } from "svelte";
	import { Container, Button } from "@onsvisual/svelte-components";
	import { geoUrl } from "$lib/config.js";
	import { isValidAreaCode, parseGeoJSON } from "$lib/geo.svelte.js";
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
	let { history, activeArea, lastActivePage } = appState;

	const getFullscreen = getContext("getFullscreen");
	const setFullscreen = getContext("setFullscreen");
	let width = $derived(getFullscreen() ? "full" : "wider");

	const areasList = getContext("areasList")();
	const centroids = getContext("centroids")();

	afterNavigate(async () => {
		// Update drawn area if selection was changed on "build" page
		if (
			$lastActivePage === "build" &&
			$activeArea?.geometry &&
			$activeArea?.properties?.oa21cds
		)
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

<Container cls="pos-relative" {width} marginBottom={!getFullscreen()}>
	<Button
		cls="ons-u-mt-s ons-u-mb-s {getFullscreen() ? 'pos-compact' : 'pos-expanded'}"
		variant="ghost"
		icon="chevron"
		iconRotation={getFullscreen() ? 90 : -90}
		iconPosition="after"
		small
		on:click={() => {
			setFullscreen(!getFullscreen());
		}}>{getFullscreen() ? "Shrink map" : "Expand map"}</Button
	>
</Container>
<Container {width} marginBottom>
	<div id="draw-container">
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
		height: calc(100vh - 108px);
	}
	:global(.pos-relative) {
		position: relative;
	}
	:global(.ons-btn.pos-compact) {
		position: absolute;
		top: -3.5em !important;
		right: 1em;
	}
	:global(.ons-btn.pos-expanded) {
		position: absolute;
		top: -5.5em !important;
		right: 1em;
	}
</style>
