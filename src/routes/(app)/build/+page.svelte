<script>
	import { resolve } from "$app/paths";
	import { onMount, getContext } from "svelte";
	import { Grid, GridCell, Button, Notice } from "@onsvisual/svelte-components";
	import BuildAreas from "./BuildAreas.svelte";
	import BuildTopics from "./BuildTopics.svelte";
	import BuildProfile from "./BuildProfile.svelte";
	import { geoUrl } from "$lib/config";
	import { parseGeoJSON, isValidAreaCode } from "$lib/util/geo";

	let { data } = $props();

	let buildState = $state({
		coverage: new Set(["E", "W"]),
		geography: "oa",
		includeAreaMap: true,
		includeCompMap: false
	});
	let appState = $state(getContext("appState")());
	let {
		activeArea,
		comparisonArea,
		history,
		lastActivePage,
		selectedTopics,
		savedAreas,
		savedAreasLastId
	} = appState;

	const areasList = getContext("areasList")();
	const centroids = getContext("centroids")();

	function setGeoState(area) {
		if (!area) return;
		buildState.geography = area.properties.lsoa21cds.size ? "lsoa" : "oa";
		buildState.coverage = new Set(
			[...area.properties[`${buildState.geography}21cds`]].map((cd) => cd[0])
		);
	}

	onMount(async () => {
		let refreshedArea = false;

		const code = (window.location.hash || "").slice(1);
		if (isValidAreaCode(code)) {
			// Load area if the URL has a GSS code in its hash
			const url = `${geoUrl}/${code.slice(0, 3)}/${code}.json`;
			try {
				const data = await (await fetch(url)).json();
				$activeArea = parseGeoJSON(data, centroids);
				window.history.replaceState(null, null, " ");
				refreshedArea = true;
			} catch (err) {
				console.warn(err);
			}
		} else if ($lastActivePage === "draw" && $history[0].geometry) {
			// Refresh area if draw page was updated last
			$activeArea.geometry = $history[0].geometry;
			$activeArea.properties.oa21cds = centroids.compress($history[0].oa);
			$activeArea.properties.lsoa21cds = centroids.compress($history[0].lsoa);
			$activeArea = $activeArea;
			refreshedArea = true;
		}

		if (refreshedArea) {
			// Refresh comparison area if area updated
			const compcd = $activeArea.properties?.oa21cds
				? centroids.commonParent({
						raw: centroids.expand($activeArea.properties.oa21cds),
						compresed: $activeArea.properties.oa21cds
					})
				: null;

			if (compcd) {
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

		setGeoState($activeArea);
	});
</script>

<Grid width="wider" colWidth="medium" marginTop>
	<GridCell cls="ons-col-6@m ons-col-4@l ons-col-3@xl">
		<BuildAreas
			bind:buildState
			bind:activeArea
			bind:comparisonArea
			bind:savedAreas
			bind:savedAreasLastId
			bind:lastActivePage
			{areasList}
			{centroids}
			updateActiveArea={(area) => setGeoState(area)}
		/>
		<BuildTopics {buildState} topics={data.topics} bind:selectedTopics />
	</GridCell>
	<GridCell cls="ons-col-8@l ons-col-9@xl">
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
				datasets you are interested in. You can define a custom area on the <a
					href={resolve("/draw")}>Draw an area</a
				> page</Notice
			>
		{/if}
	</GridCell>
</Grid>
