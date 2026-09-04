<script>
	import { onMount } from "svelte";
	import { Embed, Grid, Card } from "@onsvisual/svelte-components";
	import { snapdom } from "@zumer/snapdom";
	import { makeDateFormatter } from "$lib/js/data";
	import { atobUtf8 } from "$lib/js/io";
	import AreaMap from "$lib/viz/AreaMap.svelte";
	import BigNumber from "$lib/viz/BigNumber.svelte";
	import BarChart from "$lib/viz/BarChart.svelte";
	import LineChart from "$lib/viz/LineChart.svelte";
	import ProfileChart from "$lib/viz/ProfileChart.svelte";

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

	function makeSubtitle(range, dateFormat, isYearEnding = false) {
		const prefix = isYearEnding ? `${range.length > 1 ? "Years" : "Year"} ending ` : "";
		return prefix + range.map((d) => dateFormat(d)).join(" to ");
	}

	let topicsLookup = $derived(Object.fromEntries(data.topics.map((d) => [d.key, d])));
	let embedHash = $state("");
	let embedData = $state();
	let tables = $derived(expandTables(topicsLookup, embedData));

	async function downloadPNG() {
		const result = await snapdom(document.body, { embedFonts: true });
		await result.download({
			format: "png",
			filename: `${(embedData?.areas?.[0] || "Custom area").replaceAll(" ", "_")}.png`
		});
	}

	function init(e) {
		const { pymChild } = e.detail;
		pymChild.onMessage("png", downloadPNG);
		pymChild.onMessage("print", () => window.print());
	}

	function update() {
		const embedHash = document.location.hash.slice(1);
		if (embedHash.length) embedData = JSON.parse(atobUtf8(embedHash));
	}
	onMount(update);

	$inspect({ embedData });
</script>

<svelte:window onhashchange={update} />

<Embed id="embed" on:load={init}>
	{#if embedData?.areas?.[0]}
		<h1>
			{embedData.areas[0]}
		</h1>
	{/if}
	<Grid cls="data-cards" width="medium" colWidth="narrow">
		{#if embedData?.polygons?.[0]}
			<Card title="Area map" mode="featured">
				<AreaMap polygons={embedData.polygons} areas={embedData.areas} />
			</Card>
		{/if}
		{#each tables as tab}
			{@const dateFormat = makeDateFormatter(tab.meta.dateFormat)}
			<Card title={tab.meta.label} mode="featured">
				<div class="card-subtitle">
					{makeSubtitle(tab.range, dateFormat, tab.meta.dateFormat === "year-ending")}
				</div>
				{#if tab.meta.chart === "number"}
					<BigNumber data={tab.data} unit={tab.meta.unit} />
				{:else if tab.meta.chart === "line"}
					<LineChart data={tab.data} {dateFormat} />
				{:else if tab.meta.chart === "profile"}
					<ProfileChart data={tab.data} />
				{:else}
					<BarChart data={tab.data} />
				{/if}
				<div class="card-footnote">Source: {tab.meta.source}</div>
				<div class="card-footnote">
					Best-fit: {tab.meta.geography.startsWith("lsoa") ? "LSOA" : "Output Area"}
				</div>
			</Card>
		{/each}
	</Grid>
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
