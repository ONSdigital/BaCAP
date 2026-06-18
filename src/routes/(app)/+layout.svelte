<script>
	import { onMount, setContext } from "svelte";
	import { page } from "$app/state";
	import { PhaseBanner, Header, Main, Footer } from "@onsvisual/svelte-components";
	import { getAreasList, getOAdata, getLSOAcentroids } from "$lib/utils.js";
	import getAppState from "$lib/app-state.svelte.js";
	import Centroids from "$lib/centroids.js";

	let { children } = $props();

	let mounted = $state(false);
	let appState = $state();
	let areasList = $state.raw();
	let centroids = $state.raw();
	let route = $derived(page.route?.id || "");
	let width = $derived(route.includes("draw") ? "full" : "wider");

	setContext("appState", () => appState);
	setContext("areasList", () => areasList);
	setContext("centroids", () => centroids);

	async function init() {
		appState = await getAppState();
		areasList = await getAreasList();

		const oaData = await getOAdata();
		const lsoaData = await getLSOAcentroids();
		centroids = new Centroids(oaData, lsoaData);

		mounted = true;
	}
	onMount(init);

	// $effect(() => syncAppState($state.snapshot(appState)));
</script>

<PhaseBanner {width} phase="Prototype" />
<Header {width} compact={width === "full"} />
<Main>
	{#if mounted}
		{@render children()}
	{/if}
</Main>
{#if width !== "full"}
	<Footer {width} />
{/if}
