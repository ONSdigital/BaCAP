<script>
	import { onMount } from "svelte";
	import { Embed, Grid, Card } from "@onsvisual/svelte-components";
	import BigNumber from "$lib/viz/BigNumber.svelte";
	import BarChart from "$lib/viz/BarChart.svelte";
	import LineChart from "$lib/viz/LineChart.svelte";

	let { data } = $props();

	function expandTables(lookup, data) {
		if (!data) return null;
		const areas = [...data.areas];
		if (!areas[0]) areas[0] = "Selected area";

		const tables = [];
		for (const tab of data.tables) {
			const meta = lookup[tab.key];
			const data = [];
			for (const area of areas) {
				for (const date of meta.dates) {
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
	<Grid>
		{#each tables as tab}
			<Card title={tab.meta.label} mode="featured" baseline>
				{#if tab.meta.chart === "number"}
					<BigNumber data={tab.data} />
				{:else if tab.meta.chart === "line"}
					<LineChart data={tab.data} />
				{:else}
					<BarChart data={tab.data} />
				{/if}
			</Card>
		{/each}
	</Grid>
	{JSON.stringify(tables)}
</Embed>
