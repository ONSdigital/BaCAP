<script>
	import { onMount } from "svelte";
	import { Embed, Grid, Card } from "@onsvisual/svelte-components";
	import AreaMap from "$lib/viz/AreaMap.svelte";
	import BigNumber from "$lib/viz/BigNumber.svelte";
	import BarChart from "$lib/viz/BarChart.svelte";
	import LineChart from "$lib/viz/LineChart.svelte";

	let { data } = $props();

	function expandTables(lookup, data) {
		if (!data) return [];
		const areas = [...data.areas];
		if (!areas[0]) areas[0] = "Selected area";

		const tables = [];
		for (const tab of data.tables) {
			const meta = lookup[tab.key];
			const dates = meta.dates.slice(
				...(tab.range.length === 1
					? [0]
					: [
							meta.dates.indexOf(tab.range[0]),
							meta.dates.indexOf(tab.range[tab.range.length - 1]) + 1
						])
			);
			const data = [];
			for (const area of areas) {
				for (const date of dates) {
					for (const cat of meta.categories) {
						data.push({
							areanm: area,
							date,
							category: cat.label,
							value: tab.data[data.length]
						});
					}
				}
			}
			tables.push({ meta, data, range: tab.range });
		}
		return tables;
	}

	let topicsLookup = $derived(Object.fromEntries(data.topics.map((d) => [d.key, d])));
	let embedData = $state();
	let pymChild = $state();
	let tables = $derived(expandTables(topicsLookup, embedData));

	function update() {
		const hash = document.location.hash.slice(1);
		if (hash.length) embedData = JSON.parse(atob(hash));
	}
	onMount(update);
</script>

<svelte:window onhashchange={update} />

<Embed id="embed" bind:pymChild>
	<Grid cls="data-cards">
		{#if embedData?.polygons?.[0]}
			<Card title="Area map" mode="featured" baseline>
				<AreaMap polygons={embedData.polygons} />
			</Card>
		{/if}
		{#each tables as tab}
			<Card title={tab.meta.label} mode="featured" baseline>
				<div class="card-subtitle">{tab.range.join(" to ")}</div>
				{#if tab.meta.chart === "number"}
					<BigNumber data={tab.data} unit={tab.meta.unit} />
				{:else if tab.meta.chart === "line"}
					<LineChart data={tab.data} />
				{:else}
					<BarChart data={tab.data} />
				{/if}
				<div class="card-footnote">Source: {tab.meta.source}</div>
				<div class="card-footnote">
					Small area: {tab.meta.geography.startsWith("lsoa") ? "LSOA" : "Output Area"}
				</div>
			</Card>
		{/each}
	</Grid>
	{JSON.stringify(tables)}
</Embed>

<style>
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
