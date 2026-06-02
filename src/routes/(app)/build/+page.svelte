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
	import { geoUrl } from "$lib/config.js";
	import { parseGeoJSON, simplifyGeo } from "$lib/geo.js";
	import getData from "$lib/get-data.js";

	let { data } = $props();

	let buildState = $state({
		coverage: null,
		includeMap: true,
		includeCompMap: false
	});
	let appState = $state(getContext("appState")());
	let { activeArea, comparisonArea, history, selectedTopics } = appState;

	const areasList = getContext("areasList")();
	const centroids = getContext("centroids")();

	let topicsLookup = $derived(Object.fromEntries(data.topics.map((d) => [d.slug, d])));
	let tables = $derived(
		await Promise.all(
			$selectedTopics.map((id) => getData(topicsLookup[id], $activeArea, $comparisonArea))
		)
	);
	let embedHash = $derived.by(() => {
		const areas = [
			$activeArea?.properties?.name,
			...($comparisonArea ? [$comparisonArea.properties?.name] : [])
		];
		const polygons = [
			...(buildState.includeMap ? [simplifyGeo($activeArea?.geometry)] : []),
			...($comparisonArea && buildState.includeCompMap
				? [simplifyGeo($comparisonArea.geometry)]
				: [])
		];
		const dataTables = tables.map((t) => ({
			key: t.meta.slug,
			data: t.data
				.filter((d) => (t.meta.measures.length > 1 ? (d) => d.measure === "Percent" : true))
				.map((d) => d.value)
		}));
		return btoa(JSON.stringify({ areas, tables: dataTables, polygons }));
	});

	function updateTopics(item) {
		const ids = data.topics.map((d) => d.slug);
		if (item.checked)
			$selectedTopics = ids.filter((id) => $selectedTopics.includes(id) || id === item.id);
		else $selectedTopics = $selectedTopics.filter((id) => id !== item.id);
	}

	onMount(async () => {
		if (!$history?.[0]?.geometry) goto(resolve("/draw"));
		$activeArea = {
			type: "Feature",
			geometry: $history[0].geometry,
			properties: {
				name: $activeArea?.properties?.name || null,
				oa21cds: centroids.compress($history[0].oa),
				lsoa21cds: centroids.compress($history[0].lsoa)
			}
		};
		buildState.coverage = new Set([...$activeArea.properties.oa21cds].map((cd) => cd[0]));
		if (!$comparisonArea) {
			const cd =
				buildState.coverage.size === 2
					? "K04000001"
					: buildState.coverage.has("W")
						? "W92000004"
						: "E92000001";
			try {
				const url = `${geoUrl}/${cd.slice(0, 3)}/${cd}.json`;
				const data = await (await fetch(url)).json();
				$comparisonArea = parseGeoJSON(data);
			} catch (err) {
				console.warn(err);
			}
		}
	});

	$inspect({ appState });
	$inspect({ tables });
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
				<Checkbox
					id={topic.slug}
					label={topic.label}
					checked={$selectedTopics.includes(topic.slug)}
					groupName="topics"
					on:change={(e) => updateTopics(e?.detail?.item)}
					compact
				/>
			{/each}
		</Checkboxes>
	</GridCell>
	<GridCell colspan={3}>
		<h3>Profile</h3>
		<p>Hash length {embedHash.length}</p>
		<p>{embedHash}</p>
		<div id="embed"></div>
	</GridCell>
</Grid>
