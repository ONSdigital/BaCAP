<script>
	import { Section, Icon, Notice, Table } from "@onsvisual/svelte-components";
	import { measures } from "$lib/config";
	import { pivotDataOnMeasures } from "$lib/util/data";
	import { downloadDatasetXLSX, downloadDatasetCSV } from "$lib/util/io";

	const columns = [
		{ key: "areanm", label: "Area name" },
		{ key: "category", label: "Category" },
		{ key: "date", label: "Time period" },
		...measures.map((d) => ({ key: d.label.toLowerCase(), label: d.label, numeric: true }))
	];

	let { data } = $props();
	let pivotedData = $derived(data ? pivotDataOnMeasures(data.data) : []);
</script>

{#if data}
	<Section width="wider" title={data.meta.label} marginTop>
		<p>
			{data.meta.summary}
			<a href="https://www.ons.gov.uk/{data.meta.url}"
				>Read more<span class="ons-u-vh"> (opens in a new tab)</span></a
			>
			<Icon type="external" />
		</p>
		<Notice mode="warning"
			>The data provided here is aggregated on a best-fit basis, so may not precisely match
			other data sources.</Notice
		>
		{#key pivotedData}
			<Table data={pivotedData} {columns} sortable />
		{/key}
		<h2 class="ons-u-fs-m ons-u-mb-3xs">Get the data</h2>
		<ul class="profile-actions">
			<li>
				<Icon type="download" /> Download data as
				<a
					href="#0"
					onclick={(e) => {
						e.preventDefault();
						downloadDatasetXLSX(data.meta, pivotedData, columns);
					}}>XLSX</a
				>
				or
				<a
					href="#0"
					onclick={(e) => {
						e.preventDefault();
						downloadDatasetCSV(data.meta, pivotedData, columns);
					}}>CSV</a
				>
			</li>
		</ul>
	</Section>
{/if}

<style>
	ul.profile-actions {
		list-style-type: none;
		padding: 0;
		margin: 0;
	}
	ul.profile-actions > li {
		display: inline-block;
		padding: 0;
		margin-right: 16px;
	}
</style>
