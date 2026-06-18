<script>
	import { resolve } from "$app/paths";
	import { onMount, getContext } from "svelte";
	import { Breadcrumb, Hero, Grid, GridCell, Button, Notice } from "@onsvisual/svelte-components";
	import BuildAreas from "$lib/ui/BuildAreas.svelte";
	import BuildTopics from "$lib/ui/BuildTopics.svelte";
	import BuildProfile from "$lib/ui/BuildProfile.svelte";
	import { geoUrl } from "$lib/config.js";
	import { parseGeoJSON, isValidAreaCode } from "$lib/geo.svelte.js";

	let { data } = $props();

	let buildState = $state({
		coverage: new Set(),
		includeAreaMap: true,
		includeCompMap: false
	});
	let appState = $state(getContext("appState")());
	let { activeArea, comparisonArea, history, selectedTopics, savedAreas, savedAreasLastId } =
		appState;

	const areasList = getContext("areasList")();
	const centroids = getContext("centroids")();

	onMount(async () => {
		let refreshedArea = false;

		const code = (window.location.hash || "").slice(1);
		if (isValidAreaCode(code)) {
			// Load area if the URL has a GSS code in its hash
			const url = `${geoUrl}/${code.slice(0, 3)}/${code}.json`;
			try {
				const data = await (await fetch(url)).json();
				$activeArea = parseGeoJSON(data, centroids);
				console.log("history", window.history);
				window.history.replaceState(null, null, " ");
				refreshedArea = true;
			} catch (err) {
				console.warn(err);
			}
		} else if ($history[0].geometry) {
			// Refresh area if there is a draw history
			$activeArea.geometry = $history[0].geometry;
			$activeArea.properties.oa21cds = centroids.compress($history[0].oa);
			$activeArea.properties.lsoa21cds = centroids.compress($history[0].lsoa);
			$activeArea = $activeArea;
			refreshedArea = true;
		}

		if (refreshedArea) {
			// Refresh comparison area
			const compcd = $activeArea.properties?.oa21cds
				? centroids.commonParent({
						raw: centroids.expand($activeArea.properties.oa21cds),
						compresed: $activeArea.properties.oa21cds
					})
				: null;

			if (compcd) {
				buildState.coverage = new Set(compcd[0] === "K" ? ["E", "W"] : [compcd[0]]);
				try {
					const url = `${geoUrl}/${compcd.slice(0, 3)}/${compcd}.json`;
					const data = await (await fetch(url)).json();
					$comparisonArea = parseGeoJSON(data, centroids);
				} catch (err) {
					console.warn(err);
					$comparisonArea = null;
				}
			}
		}
	});
</script>

<Breadcrumb
	width="wider"
	theme="grey"
	links={[
		{ label: "Home", href: "/" },
		{ label: "Build a custom area profile", href: resolve("/") }
	]}
/>
<Hero width="wider" theme="grey" title="Build your area profile">
	<div>
		<Button icon="arrow" iconRotation={180} href={resolve("/draw")} small
			>Edit selected area</Button
		>
	</div>
</Hero>
<Grid width="wider" colWidth="medium" marginTop>
	<GridCell>
		<BuildAreas
			bind:buildState
			bind:activeArea
			bind:comparisonArea
			bind:savedAreas
			bind:savedAreasLastId
			{areasList}
			{centroids}
		/>
		<BuildTopics {buildState} topics={data.topics} bind:selectedTopics />
	</GridCell>
	<GridCell colspan={3}>
		{#if $activeArea.geometry}
			<BuildProfile
				{buildState}
				topics={data.topics}
				{selectedTopics}
				{activeArea}
				{comparisonArea}
				{centroids}
			/>
		{:else}
			<Notice
				>No area is selected. To build a profile, select a primary area and then choose the
				datasets you are interested in.</Notice
			>
		{/if}
	</GridCell>
</Grid>
