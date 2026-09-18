<script>
	import { resolve } from "$app/paths";
	import bbox from "@turf/bbox";
	import { Map, MapSource, MapLayer } from "@onsvisual/svelte-maps";
	import { feature, featureCollection } from "$lib/js/geo";

	const fitBoundsOptions = { padding: 10 };

	let { polygons = [], areas = [] } = $props();

	const config = {
		primary: {
			color: "#1f8ab0",
			width: 2.5,
			opacity: 0.2,
			class: "bold"
		},
		secondary: {
			color: "#555",
			width: 1,
			opacity: 0.05,
			class: "brackets"
		}
	};

	let map = $state();
	let bounds = $derived(
		polygons[0] ? bbox(featureCollection(polygons.map((d) => feature(d)))) : [-6, 49, 2, 56]
	);

	$effect(() => map?.fitBounds?.(bounds, fitBoundsOptions));
</script>

{#if polygons?.[1]}
	<ul class="legend-block">
		{#each areas.slice(0, polygons.length) as area, i}
			{@const props = config[i === 0 ? "primary" : "secondary"]}
			<li>
				<div class="legend-vis" style:border="{props.width}px solid {props.color}">
					<div style:background={props.color} style:opacity={props.opacity}></div>
				</div>
				<span class={props.class}>{area}</span>
			</li>
		{/each}
	</ul>
{/if}
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
					paint={{
						"fill-color": config.secondary.color,
						"fill-opacity": config.secondary.opacity
					}}
				/>
				<MapLayer
					id="comp-line"
					type="line"
					paint={{
						"line-color": config.secondary.color,
						"line-width": config.secondary.width
					}}
				/>
			</MapSource>
		{/if}
		{#if polygons[0]}
			<MapSource id="area" type="geojson" data={polygons[0]}>
				<MapLayer
					id="area-fill"
					type="fill"
					paint={{
						"fill-color": config.primary.color,
						"fill-opacity": config.primary.opacity
					}}
				/>
				<MapLayer
					id="area-line"
					type="line"
					paint={{
						"line-color": config.primary.color,
						"line-width": config.primary.width
					}}
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
	ul.legend-block {
		list-style-type: none;
		padding: 0;
		margin: 0 0 5px 0;
	}
	ul.legend-block > li {
		display: inline-block;
		margin: 0 10px 0 0;
		padding: 0;
	}
	.legend-vis {
		display: inline-block;
		transform: translate(0, 3px);
		width: 1rem;
		height: 1rem;
	}
	.legend-vis > div {
		width: 100%;
		height: 100%;
	}
	.bold {
		font-weight: bold;
		color: #1b708f;
	}
	.brackets::before {
		content: "(";
	}
	.brackets::after {
		content: ")";
	}
</style>
