<script>
	import { getContext } from "svelte";
	import { Hero, Divider, Notice, Button } from "@onsvisual/svelte-components";
	import DownloadAreas from "./DownloadAreas.svelte";
	import DownloadTopic from "./DownloadTopic.svelte";
	import DownloadTable from "./DownloadTable.svelte";
	import Spinner from "$lib/ui/Spinner.svelte";

	let { data } = $props();

	let appState = $state(getContext("appState")());
	// svelte-ignore non_reactive_update
	let { savedAreas, selectedAreas } = appState;

	const areasList = getContext("areasList")();
	const childLookup = getContext("childLookup")();
	const bestFits = getContext("bestFits")();

	let step = $state($selectedAreas?.length ? 2 : 1);

	let selectedTopic = $derived(!!$selectedAreas && null); // Gets reset when new areas selected
</script>

<Hero
	theme="grey"
	title="Download datasets"
	lede="Select a group of areas to download a dataset"
	width="wider"
/>

<DownloadAreas {areasList} {childLookup} {bestFits} {savedAreas} bind:selectedAreas bind:step />
{#if step === 2}
	<DownloadTopic topics={data.topics} bind:selectedTopic />
	<svelte:boundary>
		<DownloadTable topic={selectedTopic} areas={$selectedAreas} />
		{#snippet pending()}
			<Spinner message="Loading data..." />
		{/snippet}
		{#snippet failed(error, reset)}
			<Notice mode="error">Sorry, there was a problem loading this dataset.</Notice>
			<Button cls="ons-u-mt-s" small on:click={reset}>Try again</Button>
		{/snippet}
	</svelte:boundary>
{/if}

<Divider width="wider" hr={false} />
