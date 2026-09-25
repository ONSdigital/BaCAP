<script>
	import { getContext } from "svelte";
	import { Hero, Divider } from "@onsvisual/svelte-components";
	import DownloadAreas from "./DownloadAreas.svelte";
	import DownloadTopic from "./DownloadTopic.svelte";
	import DownloadTable from "./DownloadTable.svelte";
	import { getData } from "$lib/util/data";

	let { data } = $props();

	let appState = $state(getContext("appState")());
	let { savedAreas, selectedAreas } = appState;

	const areasList = getContext("areasList")();
	const childLookup = getContext("childLookup")();
	const bestFits = getContext("bestFits")();

	let step = $state($selectedAreas?.length ? 2 : 1);

	let selectedTopic = $derived(!!$selectedAreas && null); // Gets reset when new areas selected
	let selectedData = $derived(
		selectedTopic && $selectedAreas?.length
			? await getData(selectedTopic, $selectedAreas)
			: null
	);
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
	<DownloadTable data={selectedData} />
{/if}

<Divider width="wider" hr={false} />
