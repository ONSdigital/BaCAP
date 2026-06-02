<script>
	import { resolve } from "$app/paths";
	import { goto } from "$app/navigation";
	import { onMount, getContext } from "svelte";
	import {
		Breadcrumb,
		Hero,
		Grid,
		GridCell,
		Checkboxes,
		Checkbox
	} from "@onsvisual/svelte-components";
	import getData from "$lib/get-data.js";

	let { data } = $props();

	let appState = $state(getContext("appState")());
	const areasList = getContext("areasList")();
	const centroids = getContext("centroids")();

	let topicsLookup = $derived(Object.fromEntries(data.topics.map((d) => [d.slug, d])));
	let selectedTopics = $state([]);
	let tables = $derived(
		await Promise.all(
			selectedTopics.map((d) =>
				getData(topicsLookup[d.id], appState.activeArea, appState.comparisonArea)
			)
		)
	);

	onMount(() => {
		if (!appState?.history?.[0]?.geometry) goto(resolve("/draw"));
		appState.activeArea = {
			type: "Feature",
			geometry: appState.history[0].geometry,
			properties: {
				name: appState.activeArea?.properties?.name || null,
				oa21cds: centroids.compress(appState.history[0].oa),
				lsoa21cds: centroids.compress(appState.history[0].lsoa)
			}
		};
	});

	$inspect({ selectedTopics, topicsLookup, tables });
</script>

<Breadcrumb
	theme="grey"
	links={[
		{ label: "Home", href: "/" },
		{ label: "Build a custom area profile", href: resolve("/") }
	]}
/>
<Hero theme="grey" title="Area profile" />
<Grid width="wide" colWidth="narrow" marginTop>
	<GridCell>
		<Checkboxes label="Topics">
			{#each data.topics as topic}
				<Checkbox id={topic.slug} label={topic.label} bind:group={selectedTopics} compact />
			{/each}
		</Checkboxes>
	</GridCell>
	<GridCell colspan={3}>
		<h3>Profile</h3>
	</GridCell>
</Grid>
