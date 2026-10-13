<script>
	// IMPORTANT: This route only handles legacy embeds!
	// New-style embeds can be found at /(embed)/profile/+page.svelte

	import { onMount } from "svelte";
	import { Embed, Grid, Card, GridCell, Notice } from "@onsvisual/svelte-components";
	import { cleanBase64 } from "$lib/util/io";
	import AreaMap from "$lib/viz/AreaMap.svelte";
	import BigNumber from "$lib/viz/BigNumber.svelte";
	import BarChart from "$lib/viz/BarChart.svelte";
	import ProfileChart from "$lib/viz/ProfileChart.svelte";

	let { data } = $props();

	const colCls = "ons-col-6@s ons-col-4@m ons-col-3@xl";

	function getDatasetForVersion(dataset, version) {
		const versionKeys = Object.keys(dataset.versions || {})
			.map((v) => parseInt(v))
			.filter((v) => v <= version)
			.sort((a, b) => b - a);

		const matchedVersion = versionKeys[0];
		const overrides = dataset.versions?.[matchedVersion] || {};

		return {
			...dataset,
			...overrides
		};
	}

	function expandTable(table, version, areaName, compName) {
		let def = topicsLookup[table.code];
		let data = [];
		let i = 0;
		let names = table.data.length === def.categories.length ? [areaName] : [areaName, compName];
		names.forEach((name) => {
			def.categories.forEach((cat) => {
				data.push({
					areanm: name,
					category: cat.label,
					value:
						version == 1
							? table.data[i]
							: def.code === "resident_age"
								? table.data[i].percentage
								: table.data[i].value
				});
				i++;
			});
		});
		return data;
	}

	let topicsLookup = $state.raw();
	let embedData = $state.raw();
	let tables = $state.raw([]);
	let loadError = $state(false);

	function update() {
		try {
			parseHash();
			loadError = false;
		} catch (err) {
			// Hash may be truncated or altered when an embed code is copied or published
			console.warn(err);
			embedData = null;
			tables = [];
			loadError = true;
		}
	}

	function parseHash() {
		const hash = document.location.hash;
		if (hash && hash.includes("name=")) {
			const props = {};
			const searchParams = new URLSearchParams(hash.slice(3));
			for (let pair of searchParams.entries()) {
				if (["name", "comp", "showMap", "version"].includes(pair[0])) {
					props[pair[0]] = atob(cleanBase64(pair[1]));
				} else if (["tabs", "poly", "comppoly", "population", "stats"].includes(pair[0])) {
					// Legacy embeds encoded JSON with btoa(), so decode with atob() rather than atobUtf8()
					props[pair[0]] = JSON.parse(atob(cleanBase64(pair[1])));
				}
			}
			const version = props.version || 1;
			topicsLookup = Object.fromEntries(
				data.topics.map((d) => [d.code, getDatasetForVersion(d, version)])
			);

			const name = props.name || "Selected area";
			const comp = props.comp || "";
			const geojson = props.poly;
			const showMapInProfile = props.showMap;
			const compGeojson = props.comppoly;
			const population = props.population;
			const stats = props.stats;
			embedData = {
				name,
				comp,
				geojson,
				version,
				showMapInProfile,
				compGeojson,
				population,
				stats
			};
			tables = (props.tabs || [])
				.filter((t) => topicsLookup[t.code])
				.map((t) => ({
					meta: topicsLookup[t.code],
					data: expandTable(t, version, name, comp)
				}));
		}
	}
	onMount(update);
</script>

<Embed id="embed">
	<Grid cls="data-cards" width="full">
		{#if loadError}
			<GridCell colCls=" ">
				<Notice mode="error"
					>Sorry, this profile could not be loaded. The link or embed code may be
					incomplete.</Notice
				>
			</GridCell>
		{/if}
		{#if embedData?.name}
			<GridCell colCls=" ">
				<h1>
					{embedData?.name}
				</h1>
			</GridCell>
		{/if}
		{#if embedData?.geojson}
			<Card title="Area map" mode="featured" {colCls}>
				<AreaMap polygons={[embedData.geojson, embedData.compGeojson].filter((d) => d)} />
			</Card>
		{/if}
		{#each tables as tab}
			<Card title={tab.meta.label} mode="featured" {colCls}>
				<div class="card-subtitle">
					{tab.meta.dateLabel || "2021"}
				</div>
				{#if tab.meta.chart === "number"}
					<BigNumber data={tab.data} unit={tab.meta.unit} />
				{:else if tab.meta.chart === "profile"}
					<ProfileChart data={tab.data} />
				{:else if !tab.meta.chart}
					<BarChart data={tab.data} />
				{/if}
				<div class="card-footnote">Source: {tab.meta.source}</div>
				<div class="card-footnote">
					Best-fit: {tab.meta.lowestGeography.startsWith("lsoa") ? "LSOA" : "Output Area"}
				</div>
			</Card>
		{/each}
	</Grid>
</Embed>

<style>
	h1 {
		margin: 0;
	}
	:global(.data-cards h2) {
		margin-bottom: 0;
	}
	.card-subtitle {
		margin-bottom: 6px;
	}
	.card-footnote {
		color: #333;
		font-size: 14px;
		line-height: 1.5;
		margin-top: 16px;
	}
	.card-footnote + .card-footnote {
		margin-top: 0;
	}
</style>
