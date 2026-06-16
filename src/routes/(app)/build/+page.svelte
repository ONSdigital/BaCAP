<script>
	import { resolve } from "$app/paths";
	import { goto, afterNavigate } from "$app/navigation";
	import { onMount, getContext } from "svelte";
	import {
		Breadcrumb,
		Hero,
		Notice,
		Grid,
		GridCell,
		Accordion,
		AccordionItem,
		Details,
		Checkboxes,
		Checkbox,
		Input,
		Button
	} from "@onsvisual/svelte-components";
	import LoadModal from "$lib/ui/LoadModal.svelte";
	import BestFitMap from "$lib/viz/BestFitMap.svelte";
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
	let { activeArea, comparisonArea, history, selectedTopics, savedAreas, savedAreasLastId } =
		appState;
	let areaPolygon = $derived($activeArea?.geometry ? simplifyGeo($activeArea.geometry) : null);
	let compPolygon = $derived(
		$comparisonArea?.geometry ? simplifyGeo($comparisonArea.geometry) : null
	);

	let pymParent = $state(); // Binding for responsive embed iframe

	const areasList = getContext("areasList")();
	const centroids = getContext("centroids")();

	let topicsLookup = $derived(Object.fromEntries(data.topics.map((d) => [d.key, d])));
	let tables = $derived(
		$activeArea?.properties?.oa21cds
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

	afterNavigate(async () => {
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
	});

	onMount(() => {
		// Initialise embed iframe
		if (!pymParent) {
			pymParent = new pym.Parent("embed", resolve(`/embed#${embedHash || ""}`), {
				name: "embed",
				id: "iframe",
				title: "Embedded area profile"
			});
		}
		return {
			destroy: () => {
				pymParent?.remove?.();
				pymParent = null;
			}
		};
	});

	$inspect({ appState });
	$inspect({ tables });
	$inspect({ $activeArea });
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
		<p class="ons-u-fs-m ons-u-mb-3xs">Select areas</p>
		<div class="area-selections">
			<div class="input-group">
				<Input
					label="Primary area"
					placeholder="Name your area"
					width="100%"
					bind:value={$activeArea.properties.areanm}
				/>
				<LoadModal
					bind:activeArea
					bind:savedAreas
					bind:savedAreasLastId
					{areasList}
					{centroids}
					mode="build"
					updateSelection={(area) => console.log({ area })}
				/>
			</div>
			<Checkbox
				label="Show map in profile"
				bind:checked={buildState.includeAreaMap}
				compact
			/>
			<div class="input-group">
				<Input
					label="Comparison area"
					value={$comparisonArea?.properties?.areanm}
					readonly
				/>
				<LoadModal
					bind:activeArea={comparisonArea}
					bind:savedAreas
					bind:savedAreasLastId
					{areasList}
					{centroids}
					mode="build"
					updateSelection={(area) => console.log({ area })}
				/>
			</div>
			<Checkbox
				label="Include on map"
				bind:checked={buildState.includeCompMap}
				disabled={!buildState.includeAreaMap}
				compact
			/>
		</div>
		<!-- <div class="selections-divider"></div> -->
		<p class="ons-u-fs-m ons-u-mb-3xs">Select datasets</p>
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
		<Notice mode="warning"
			>The data presented here is aggregated on a best-fit basis, so may not precisely
			represent the selected geographic boundary.</Notice
		>
		<Details
			title="What does my best-fit area selection look like?"
			cls="ons-u-mt-s ons-u-mb-s"
		>
			<p>
				Some datasets are aggregated from Output Areas &mdash; the smallest statistical
				geography &mdash; whereas others are based on larger LSOAs. The map below compares
				your selected geographic boundary with the actual underlying statistical areas
				available in the datasets.
			</p>
			<p>
				Since these boundaries can vary, we advise caution in comparing values from datasets
				based on Output Areas with those based on LSOAs.
			</p>
			{#if $activeArea?.properties?.oa21cds}
				<BestFitMap {activeArea} {centroids} />
			{/if}
		</Details>
		<hr class="ons-u-mt-m ons-u-mb-m" />
		<div id="embed"></div>
	</GridCell>
</Grid>

<style>
	.area-selections {
		background: var(--ons-color-hero-bg);
		padding: 0.5em 0.75em 1.5em;
		margin-bottom: 1em;
	}
	.input-group {
		display: flex;
		flex-direction: row;
		align-items: flex-end;
		gap: 4px;
		margin: 6px 0 4px;
	}
	.input-group :global(.ons-btn__inner) {
		height: 37px;
		transform: translateY(-3px);
	}
	.input-group :global(.ons-label) {
		margin-bottom: 4px;
	}
	.input-group :global(.ons-field) {
		flex-grow: 1;
	}
	.input-group :global(.ons-btn) {
		flex-shrink: 1;
	}
	.input-group :global .selections-divider {
		border-bottom: 1px solid var(--ons-color-borders);
		padding-bottom: 1em;
		margin-bottom: 1em;
	}
</style>
