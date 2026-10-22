<script>
	import { resolve } from "$app/paths";
	import { Map, MapSource, MapLayer } from "@onsvisual/svelte-maps";
	import { bestfitLayers } from "$lib/config";

	const fitBoundsOptions = { padding: 20 };

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
		<span class="legend-viz" style:background="rgba({bestfitLayers[0].color.join(',')},0.3)"
		></span>OA best-fit
	</li>
	<li>
		<span class="legend-viz" style:background="rgba({bestfitLayers[1].color.join(',')},0.3)"
		></span>LSOA best-fit
	</li>
	<li>
		<span class="legend-viz" style:background="rgba(128,0,128,0.3)"></span>OA and LSOA overlap
	</li>
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
		{#each bestfitLayers as l}
			<MapSource
				id={l.key}
				type="vector"
				url={l.url}
				layer={l.layer}
				promoteId={l.idKey}
				maxzoom={12}
			>
				<MapLayer
					id="{l.key}-line"
					type="fill"
					paint={{
						"fill-color": `rgb(${l.color.join(",")})`,
						"fill-opacity": [
							"case",
							["==", ["feature-state", "highlighted"], true],
							0.2,
							0
						],
						"fill-outline-color": "rgba(0,0,0,0)"
					}}
					highlight
					highlighted={codes[l.key]}
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
