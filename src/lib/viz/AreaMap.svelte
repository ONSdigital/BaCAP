<script>
	import { resolve } from "$app/paths";
	import bbox from "@turf/bbox";
	import { Map, MapSource, MapLayer } from "@onsvisual/svelte-maps";
	import { feature, featureCollection } from "$lib/js/geo";

	const fitBoundsOptions = { padding: 10 };

	let { polygons = [] } = $props();

	let map = $state();
	let bounds = $derived(
		polygons[0] ? bbox(featureCollection(polygons.map((d) => feature(d)))) : [-6, 49, 2, 56]
	);

	$effect(() => map?.fitBounds?.(bounds, fitBoundsOptions));
</script>

<div class="map-container">
	<Map
		bind:map
		style={resolve("/data/style.json")}
		location={{
			bounds
		}}
		options={{
			fitBoundsOptions,
			preserveDrawingBuffer: true
		}}
		interactive={false}
		on:load={(e) => console.log(e)}
	>
		{#if polygons[1]}
			<MapSource id="comp" type="geojson" data={polygons[1]}>
				<MapLayer
					id="comp-fill"
					type="fill"
					paint={{ "fill-color": "#222", "fill-opacity": 0.05 }}
				/>
				<MapLayer
					id="comp-line"
					type="line"
					paint={{ "line-color": "#555", "line-width": 1 }}
				/>
			</MapSource>
		{/if}
		{#if polygons[0]}
			<MapSource id="area" type="geojson" data={polygons[0]}>
				<MapLayer
					id="area-fill"
					type="fill"
					paint={{ "fill-color": "#1f8ab0", "fill-opacity": 0.2 }}
				/>
				<MapLayer
					id="area-line"
					type="line"
					paint={{ "line-color": "#1f8ab0", "line-width": 2.5 }}
				/>
			</MapSource>
		{/if}
	</Map>
</div>

<style>
	.map-container {
		display: block;
		height: 250px;
	}
</style>
