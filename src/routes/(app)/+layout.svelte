<script>
	import { onMount, setContext } from "svelte";
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
		const storedAppVersion = await getStoredAppVersion();
		const isNewVersion = appVersion !== storedAppVersion;

		const data = await Promise.all([
			getAppState(storedAppVersion),
			getAreasList(isNewVersion),
			getBestFits(isNewVersion),
			getChildLookup(isNewVersion),
			getOAdata(isNewVersion),
			getLSOAcentroids(isNewVersion)
		]);
		// Only record the new version once all reference data has been refreshed
		if (isNewVersion) await setStoredAppVersion();

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
{:else}
	<Spinner />
{/if}
