<script>
	import { onMount, setContext } from "svelte";
	import {
		getAreasList,
		getBestFits,
		getChildLookup,
		getOAdata,
		getLSOAcentroids
	} from "$lib/utils.js";
	import getAppState from "$lib/app-state.svelte.js";
	import Centroids from "$lib/centroids.js";

	let { children } = $props();

	let mounted = $state(false);
	let appState = $state();
	let areasList = $state.raw();
	let bestFits = $state.raw();
	let childLookup = $state.raw();
	let centroids = $state.raw();

	setContext("appState", () => appState);
	setContext("areasList", () => areasList);
	setContext("bestFits", () => bestFits);
	setContext("childLookup", () => childLookup);
	setContext("centroids", () => centroids);

	async function init() {
		const data = await Promise.all([
			getAppState(),
			getAreasList(),
			getBestFits(),
			getChildLookup(),
			getOAdata(),
			getLSOAcentroids()
		]);

		appState = data[0];
		areasList = data[1];
		bestFits = data[2];
		childLookup = data[3];
		centroids = new Centroids(data[4], data[5]);

		mounted = true;
	}
	onMount(init);
</script>

{#if mounted}
	{@render children()}
{/if}
