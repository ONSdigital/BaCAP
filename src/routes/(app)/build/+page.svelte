<script>
	import { resolve } from "$app/paths";
	import { goto } from "$app/navigation";
	import { onMount, onDestroy, getContext } from "svelte";
	import {
		Breadcrumb,
		Hero,
		Grid,
		GridCell,
		Accordion,
		AccordionItem,
		Checkboxes,
		Checkbox
	} from "@onsvisual/svelte-components";
	import pym from "pym.js";
	import { geoUrl } from "$lib/config.js";
	import { slugify } from "$lib/utils.js";
	import { parseGeoJSON, simplifyGeo } from "$lib/geo.svelte.js";
	import getData from "$lib/get-data.js";

	let { data } = $props();

	let buildState = $state({
		coverage: null,
		includeAreaMap: true,
		includeCompMap: false
	});
	let appState = $state(getContext("appState")());
	let { activeArea, comparisonArea, history, selectedTopics } = appState;
	let areaPolygon = $derived($activeArea?.geometry ? simplifyGeo($activeArea.geometry) : null);
	let compPolygon = $derived(
		$comparisonArea?.geometry ? simplifyGeo($comparisonArea.geometry) : null
	);

	let pymParent = $state(); // Binding for responsive embed iframe

	const areasList = getContext("areasList")();
	const centroids = getContext("centroids")();

	let topicsLookup = $derived(Object.fromEntries(data.topics.map((d) => [d.key, d])));
	let tables = $derived(
		$activeArea
			? await Promise.all(
					$selectedTopics.map((id) =>
						getData(topicsLookup[id], $activeArea, $comparisonArea)
					)
				)
			: []
	);
	let embedHash = $derived.by(() => {
		const areas = [
			$activeArea?.properties?.areanm,
			...($comparisonArea ? [$comparisonArea.properties?.areanm] : [])
		];
		const polygons = [
			...(buildState.includeAreaMap ? [areaPolygon] : []),
			...(compPolygon && buildState.includeAreaMap && buildState.includeCompMap
				? [compPolygon]
				: [])
		];
		const dataTables = tables.map((t) => ({
			key: t.meta.key,
			data: t.data
				.filter(t.meta.measures.length > 1 ? (d) => d.measure === "Percent" : () => true)
				.map((d) => d.value),
			range:
				t.meta.dates.length === 1
					? t.meta.dates
					: [t.meta.dates[0], t.meta.dates[t.meta.dates.length - 1]]
		}));
		return btoa(JSON.stringify({ areas, tables: dataTables, polygons }));
	});
	$effect(() => {
		if (pymParent) pymParent.iframe.contentWindow.location.hash = embedHash;
		console.log({ pymParent, embedHash });
	});

	function groupTopics(topics) {
		const groups = {};
		for (const topic of topics) {
			if (!groups[topic.topic])
				groups[topic.topic] = {
					key: slugify(topic.topic),
					label: topic.topic,
					children: []
				};
			groups[topic.topic].children.push(topic);
		}
		return Object.values(groups);
	}

	function updateTopics(item) {
		const ids = data.topics.map((d) => d.key);
		if (item.checked)
			$selectedTopics = ids.filter((id) => $selectedTopics.includes(id) || id === item.id);
		else $selectedTopics = $selectedTopics.filter((id) => id !== item.id);
	}

	onMount(async () => {
		if (!$history?.[0]?.geometry) goto(resolve("/draw"));
		// Refresh active area
		$activeArea.geometry = $history[0].geometry;
		$activeArea.properties.oa21cds = centroids.compress($history[0].oa);
		$activeArea.properties.lsoa21cds = centroids.compress($history[0].lsoa);
		$activeArea = $activeArea;

		// Refresh comparison area
		const compcd = centroids.commonParent({
			raw: $history[0].oa,
			compresed: $activeArea.properties.oa21cds
		});
		buildState.coverage = compcd[0] === "K" ? new Set(["E", "W"]) : new Set([compcd[0]]);
		try {
			const url = `${geoUrl}/${compcd.slice(0, 3)}/${compcd}.json`;
			const data = await (await fetch(url)).json();
			$comparisonArea = parseGeoJSON(data, centroids);
		} catch (err) {
			console.warn(err);
			$comparisonArea = null;
		}

		// Initialise embed iframe
		if (!pymParent) {
			pymParent = new pym.Parent("embed", resolve(`/embed#${embedHash || ""}`), {
				name: "embed",
				id: "iframe",
				title: "Embedded area profile"
			});
		}
	});
	onDestroy(() => {
		pymParent?.remove?.();
		pymParent = null;
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
<Hero
	theme="grey"
	title="Area profile{$activeArea?.properties?.areanm
		? ` for ${$activeArea.properties.areanm}`
		: ''}"
/>
<Grid width="wide" colWidth="narrow" marginTop>
	<GridCell>
		<Checkboxes cls="ons-u-mb-l">
			<Checkbox
				label="Show map in profile"
				bind:checked={buildState.includeAreaMap}
				compact
			/>
			<Checkbox
				label="Show comparison area"
				bind:checked={buildState.includeCompMap}
				disabled={!buildState.includeAreaMap}
				compact
			/>
		</Checkboxes>
		<Accordion>
			{#each groupTopics(data.topics, buildState.coverage) as group, i (group.key)}
				<AccordionItem title={group.label} open={i === 0}>
					<Checkboxes>
						{#each group.children as topic}
							<Checkbox
								id={topic.key}
								label={topic.label}
								checked={$selectedTopics.includes(topic.key)}
								groupName="topics"
								on:change={(e) => updateTopics(e?.detail?.item)}
								compact
							/>
						{/each}
					</Checkboxes>
				</AccordionItem>
			{/each}
		</Accordion>
	</GridCell>
	<GridCell colspan={3}>
		<h3>Profile <small>(hash length {embedHash.length})</small></h3>

		<div id="embed"></div>
	</GridCell>
</Grid>

<style>
	small {
		font-weight: normal;
	}
</style>
