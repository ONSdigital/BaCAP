<script>
	import { getContext } from "svelte";
	import { Hero, Divider, Container, Notice, Button } from "@onsvisual/svelte-components";
	import DownloadAreas from "./DownloadAreas.svelte";
	import DownloadTopic from "./DownloadTopic.svelte";
	import DownloadTable from "./DownloadTable.svelte";
	import { getData } from "$lib/util/data";

	let { data } = $props();

	let appState = $state(getContext("appState")());
	// svelte-ignore non_reactive_update
	let { savedAreas, selectedAreas } = appState;

	const areasList = getContext("areasList")();
	const childLookup = getContext("childLookup")();
	const bestFits = getContext("bestFits")();

	let step = $state($selectedAreas?.length ? 2 : 1);

	let selectedTopic = $derived(!!$selectedAreas && null); // Gets reset when new areas selected

	// Loaded in an effect (as on /build), so a loading indicator can be shown next to the dataset
	// selector, and responses superseded by a newer selection are ignored
	let selectedData = $state.raw(null);
	let loading = $state(false);
	let loadFailed = $state(false);
	let retries = $state(0);
	let requestId = 0;

	$effect(() => {
		retries; // Re-run when the user clicks "Try again"
		const topic = selectedTopic;
		const areas = $selectedAreas;
		const id = ++requestId;
		loadFailed = false;
		if (!topic || !areas?.length) {
			selectedData = null;
			loading = false;
			return;
		}
		loading = true;
		getData(topic, areas)
			.then((data) => {
				if (id === requestId) selectedData = data;
			})
			.catch((err) => {
				console.warn(err);
				if (id === requestId) loadFailed = true;
			})
			.finally(() => {
				if (id === requestId) loading = false;
			});
	});
</script>

<Hero
	theme="grey"
	title="Download datasets"
	lede="Select a group of areas to download a dataset"
	width="wider"
/>

<DownloadAreas {areasList} {childLookup} {bestFits} {savedAreas} bind:selectedAreas bind:step />
{#if step === 2}
	<DownloadTopic topics={data.topics} bind:selectedTopic {loading} />
	{#if loadFailed}
		<Container width="wider">
			<Notice mode="error">Sorry, there was a problem loading this dataset.</Notice>
			<Button cls="ons-u-mt-s" small on:click={() => retries++}>Try again</Button>
		</Container>
	{/if}
	<svelte:boundary>
		<DownloadTable data={selectedData} />
		{#snippet failed(error, reset)}
			<Notice mode="error">Sorry, there was a problem loading this dataset.</Notice>
			<Button cls="ons-u-mt-s" small on:click={reset}>Try again</Button>
		{/snippet}
	</svelte:boundary>
{/if}

<Divider width="wider" hr={false} />
