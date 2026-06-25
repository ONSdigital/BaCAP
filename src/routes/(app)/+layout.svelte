<script>
	import { onMount, setContext } from "svelte";
	import { getAreasList, getBestFits, getOAdata, getLSOAcentroids } from "$lib/utils.js";
	import getAppState from "$lib/app-state.svelte.js";
	import Centroids from "$lib/centroids.js";

	let { children } = $props();

	let mounted = $state(false);
	let appState = $state();
	let areasList = $state.raw();
	let bestFits = $state.raw();
	let centroids = $state.raw();

	setContext("appState", () => appState);
	setContext("areasList", () => areasList);
	setContext("bestFits", () => bestFits);
	setContext("centroids", () => centroids);

	async function init() {
		appState = await getAppState();
		areasList = await getAreasList();
		bestFits = await getBestFits();

		const oaData = await getOAdata();
		const lsoaData = await getLSOAcentroids();
		centroids = new Centroids(oaData, lsoaData);

		mounted = true;
	}
	onMount(init);
</script>

{#if mounted}
	{@render children()}
{/if}
