<script>
	import { onMount, setContext } from "svelte";
	import { get } from "svelte/store";
	import { Container, Notice, Button } from "@onsvisual/svelte-components";
	import Spinner from "$lib/ui/Spinner.svelte";
	import { appVersion } from "$lib/config";
	import {
		getStoredAppVersion,
		setStoredAppVersion,
		getAreasList,
		getBestFits,
		getChildLookup,
		getOAdata,
		getLSOAcentroids
	} from "$lib/util/io";
	import { getAppState } from "$lib/util/state";
	import { Centroids } from "$lib/util/geo";

	let { children, data } = $props();

	let mounted = $state(false);
	let loadError = $state(null);
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
		loadError = null;
		try {
			await loadAll();
			mounted = true;
		} catch (err) {
			console.error(err);
			loadError = err;
		}
	}

	async function loadAll() {
		const storedAppVersion = await getStoredAppVersion();
		const isNewVersion = appVersion !== storedAppVersion;

		const loaded = await Promise.all([
			getAppState(storedAppVersion),
			getAreasList(isNewVersion),
			getBestFits(isNewVersion),
			getChildLookup(isNewVersion),
			getOAdata(isNewVersion),
			getLSOAcentroids(isNewVersion)
		]);
		// Only record the new version once all reference data has been refreshed
		if (isNewVersion) await setStoredAppVersion();

		appState = loaded[0];
		areasList = loaded[1];
		bestFits = loaded[2];
		childLookup = loaded[3];
		centroids = new Centroids(loaded[4], loaded[5]);
		removeUnknownTopics(loaded[0].selectedTopics);
	}
	// Stored topic selections persist across releases, so drop any no longer in topics.json
	function removeUnknownTopics(selectedTopics) {
		const keys = new Set(data.topics.map((d) => d.key));
		const selected = get(selectedTopics) || [];
		const known = selected.filter((key) => keys.has(key));
		if (known.length !== selected.length) selectedTopics.set(known);
	}

	onMount(init);
</script>

{#if mounted}
	{@render children()}
{:else if loadError}
	<Container width="wider" marginTop marginBottom>
		<Notice mode="error"
			>Sorry, the app could not be loaded. Please check your internet connection and try
			again.</Notice
		>
		<Button cls="ons-u-mt-s" small on:click={init}>Try again</Button>
	</Container>
{:else}
	<Spinner />
{/if}
