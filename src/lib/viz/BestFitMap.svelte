<script>
	import { resolve } from "$app/paths";
	import { Map, MapSource, MapLayer } from "@onsvisual/svelte-maps";

	const fitBoundsOptions = { padding: 20 };
	export const layers = [
		{
			key: "oa",
			url: "https://cdn.ons.gov.uk/maptiles/administrative/2021/oa/v3/boundaries/{z}/{x}/{y}.pbf",
			idKey: "areacd",
			color: "blue"
		},
		{
			key: "lsoa",
			url: "https://cdn.ons.gov.uk/maptiles/administrative/2021/lsoa/v3/boundaries/{z}/{x}/{y}.pbf",
			idKey: "areacd",
			color: "red"
		}
	];

	let { activeArea, centroids } = $props();
	let codes = $derived({
		oa: [...centroids.expand($activeArea.properties.oa21cds, "oa")],
		lsoa: [...centroids.expand($activeArea.properties.lsoa21cds, "lsoa")]
	});

	let map = $state();

	$effect(() => map?.fitBounds?.($activeArea?.geometry?.bbox, fitBoundsOptions));
</script>

<ul class="map-legend">
	<li>
		<span class="legend-viz" style:border="3px solid var(--ons-color-info-vibrant)"
		></span>Selected boundary
	</li>
	<li>
		<span class="legend-viz" style:background="rgb(0,0,255,0.3)"></span>Output area best-fit
	</li>
	<li><span class="legend-viz" style:background="rgb(255,0,0,0.3)"></span>LSOA best-fit</li>
	<li><span class="legend-viz" style:background="rgb(128,0,128,0.3)"></span>Overlap</li>
</ul>
<div class="map-container">
	<Map
		bind:map
		style={resolve("/data/style.json")}
		location={{
			bounds: $activeArea?.geometry?.bbox
		}}
		options={{ fitBoundsOptions }}
		controls={true}
	>
		{#each layers as l}
			<MapSource id={l.key} type="vector" url={l.url} layer="boundaries" promoteId={l.idKey}>
				<MapLayer
					id="{l.key}-line"
					type="fill"
					paint={{
						"fill-color": l.color,
						"fill-opacity": 0.2,
						"fill-outline-color": "rgba(0,0,0,0)"
					}}
					filter={["in", l.idKey, ...codes[l.key]]}
				/>
			</MapSource>
		{/each}
		<MapSource id="area" type="geojson" data={$activeArea}>
			<MapLayer
				id="area-line"
				type="line"
				paint={{ "line-color": "#1f8ab0", "line-width": 2.5 }}
			/>
		</MapSource>
	</Map>
</div>

<style>
	.map-container {
		display: block;
		height: 300px;
	}
	.map-legend {
		padding: 0;
		margin: 0;
	}
	.map-legend > li {
		display: inline-block;
		margin-right: 8px;
	}
	.legend-viz {
		display: inline-block;
		width: 1em;
		height: 1em;
		margin-right: 4px;
		transform: translateY(2px);
	}
</style>
