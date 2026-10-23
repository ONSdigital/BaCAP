<script>
	import { onMount } from "svelte";
	import { Embed, Grid, GridCell, Card, Notice } from "@onsvisual/svelte-components";
	import { snapdom } from "@zumer/snapdom";
	import { makeDateFormatter } from "$lib/util/data";
	import { atobUtf8, cleanBase64 } from "$lib/util/io";
	import { makeFilename } from "$lib/util/geo";
	import AreaMap from "$lib/viz/AreaMap.svelte";
	import BigNumber from "$lib/viz/BigNumber.svelte";
	import BarChart from "$lib/viz/BarChart.svelte";
	import LineChart from "$lib/viz/LineChart.svelte";
	import ProfileChart from "$lib/viz/ProfileChart.svelte";

	let { data } = $props();

	const colCls = "ons-col-6@s ons-col-4@m ons-col-3@xl";

	function expandTables(lookup, data) {
		if (!Array.isArray(data?.areas) || !Array.isArray(data?.tables)) return [];
		const areas = [...data.areas];
		if (!areas[0]) areas[0] = "Selected area";

		const tables = [];
		for (const tab of data.tables) {
			const meta = lookup[tab.key];
			if (!meta) continue; // Skip topics no longer in topics.json
			// Look up the stored date range, so dates added to a topic later don't misalign values
			const start = meta.dates.indexOf(tab.range[0]);
			const end = meta.dates.indexOf(tab.range[tab.range.length - 1]) + 1;
			if (start < 0 || end < 1) continue; // Skip topics whose stored dates have been removed
			const dates = meta.dates.slice(start, end);
			const data = [];
			if (tab.data.length) {
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
			}
			tables.push({ meta, data, range: tab.range });
		}
		return tables;
	}

	function makeSubtitle(range, dateFormat, isYearEnding = false) {
		const prefix = isYearEnding
			? `${range.length > 1 ? "% change, years" : "Year"} ending `
			: range.length > 1
				? "% change, "
				: "";
		return prefix + range.map((d) => dateFormat(d)).join(" to ");
	}

	let topicsLookup = $derived(Object.fromEntries(data.topics.map((d) => [d.key, d])));
	let embedHash = $state("");
	let embedData = $state();
	let loadError = $state(false);
	let tables = $derived(expandTables(topicsLookup, embedData));

	async function downloadPNG() {
		const result = await snapdom(document.body, { embedFonts: true, backgroundColor: "white" });
		await result.download({
			format: "png",
			filename: makeFilename(embedData?.areas?.[0], "png")
		});
	}

	function init(e) {
		const { pymChild } = e.detail;
		pymChild.onMessage("png", downloadPNG);
		pymChild.onMessage("print", () => window.print());
	}

	function update() {
		const embedHash = document.location.hash.slice(1);
		if (!embedHash.length) return;
		try {
			embedData = JSON.parse(atobUtf8(cleanBase64(embedHash)));
			loadError = false;
		} catch (err) {
			// Hash may be truncated or altered when an embed code is copied or published
			console.warn(err);
			embedData = null;
			loadError = true;
		}
		console.debug({ embedHash, embedData });
	}
	onMount(update);
</script>

<svelte:window onhashchange={update} />

<Embed id="embed" on:load={init}>
	<Grid cls="data-cards" width="full">
		{#if loadError}
			<GridCell colCls=" ">
				<Notice mode="error"
					>Sorry, this profile could not be loaded. The link or embed code may be
					incomplete.</Notice
				>
			</GridCell>
		{/if}
		{#if embedData?.areas?.[0]}
			<GridCell colCls=" ">
				<h1>
					{embedData.areas[0]}
				</h1>
			</GridCell>
		{/if}
		{#if embedData?.polygons?.[0]}
			<Card title="Area map" mode="featured" {colCls}>
				<AreaMap polygons={embedData.polygons} areas={embedData.areas} />
			</Card>
		{/if}
		{#each tables as tab}
			{@const unit = tab.meta.unit}
			{@const dateFormat = makeDateFormatter(tab.meta.dateFormat)}
			<Card title={tab.meta.label} mode="featured" {colCls}>
				<div class="card-subtitle">
					{makeSubtitle(tab.range, dateFormat, tab.meta.dateFormat === "year-ending")}
				</div>
				{#if !tab.data.length}
					<Notice mode="warning">Failed to load data</Notice>
				{:else if tab.meta.chart === "number"}
					<BigNumber
						data={tab.data}
						unit={!["%", "£"].includes(unit) ? unit : null}
						prefix={unit === "£" ? unit : null}
						suffix={unit === "%" ? unit : null}
					/>
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
