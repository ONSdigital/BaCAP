<script>
	import { onMount, setContext } from "svelte";
	import { page } from "$app/state";
	import { Header, Main, Footer } from "@onsvisual/svelte-components";
	import { getAreasList, getOAdata, getLSOAcentroids, syncAppState } from "$lib/utils.js";
	import getAppState from "$lib/app-state.svelte.js";
	import Centroids from "$lib/centroids.js";

	let { children } = $props();

	let mounted = $state(false);
	let appState = $state();
	let areasList = $state.raw();
	let centroids = $state.raw();
	let route = $derived(page.route?.id || "");

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

{#if route.includes("draw")}
	<Header width="full" compact />
	<Main>
		{#if mounted}
			{@render children()}
		{/if}
	</Main>
{:else}
	<Header />
	<Main>
		{#if mounted}
			{@render children()}
		{/if}
	</Main>
	<Footer />
{/if}
