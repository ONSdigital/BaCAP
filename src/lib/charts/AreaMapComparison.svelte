<script>
	import maplibre from "maplibre-gl";
	import "maplibre-gl/dist/maplibre-gl.css";
	import bbox from "@turf/bbox";
	import { onMount } from "svelte";
	import { base } from "$app/paths";
	import { boundaries, lsoaBoundaries} from "$lib/config/geography"

	const style = `${base}/data/style.json`;

	export let name,comp;
	export let geojson = null;
	export let compGeojson = null;
	export let config = {
		boundary: { color: "#1f8ab0", lineWidth: 2.5, fillOpacity: 0.2 },
		comp: { color: "rgba(0,0,0,0.5)", lineWidth: 1.5, fillOpacity: 0.1 },
	};
	export let oa_all=[];
	export let lsoa_all=[];

	let codes = {oa:oa_all,lsoa:lsoa_all};

	let map;
	let container;
	let w;

	onMount(() => {
		map = new maplibre.Map({
			container,
			style,
			bounds,
			interactive: true,
			preserveDrawingBuffer: false,
			maxZoom:12.9,
			minZoom:6
		});

		// Add zoom and rotation controls to the map.
		map.addControl(new maplibre.NavigationControl({
			showZoom: true,
			showCompass:false
		}));

		map.on("load", () => {
			for(const layer of [lsoaBoundaries,boundaries]){
				map.addSource(layer.key,{type:"vector",tiles:[layer.url],promoteId:layer.idKey})
				map.addLayer({
					id:layer.key,
					type:"fill",
					source:layer.key,
					"source-layer":layer.layer,
					paint:{
						"fill-color":layer.colour,
						"fill-opacity":0.2,
						"fill-outline-color": 'rgba(0,0,0,1)'
					},
					filter:['in', layer.idKey, ...codes[layer.key]]
				})
			}

			for (const key of ["boundary", "comp"]) {
				map.addSource(key, { type: "geojson", data: data[key] });
				map.addLayer({
					id: `${key}-fill`,
					type: "fill",
					source: key,
					layout: {},
					paint: {
						"fill-color": config[key].color,
						"fill-opacity": config[key].fillOpacity,
					},
				});
				map.addLayer({
					id: `${key}-line`,
					type: "line",
					source: key,
					layout: {},
					paint: {
						"line-color": config[key].color,
						"line-width": config[key].lineWidth,
					},
				});
			}
		});
	});

	function fitBounds(bounds) {
		// console.log("refitting");
		if (map) {
			map.resize();
			map.fitBounds(bounds, { padding: 50, animate: false });
		}
	}

	function setData(data) {
		if (map) {
			for (const key of ["boundary", "comp"]) {
				const source = map.getSource(key);
				if (source) source.setData(data[key]);
			}
		}
	}

	$: data = {
		boundary: geojson ? geojson : { type: "Polygon", coordinates: [] },
		comp: compGeojson ? compGeojson : { type: "Polygon", coordinates: [] },
	};
	$: bounds = data
		? bbox({
				type: "GeometryCollection",
				geometries: [data.boundary, data.comp],
			})
		: [
				[-9, 49],
				[2, 61],
			];
	$: w && fitBounds(bounds);
	$: setData(data);

</script>

<!-- {#if compGeojson} -->
	<ul class="legend-block">
		{#each [boundaries,lsoaBoundaries] as item}
			<li>
				<div
					class="legend-sq"
					style:color={item.colour}
				></div>
				<span class="legend-text-{item.key}"
					>{item.key=='oa' ? 'Best-fit shape based on output areas' : "Best-fit shape based on lower super output areas"}</span
				>
			</li>
		{/each}
	</ul>
<!-- {/if} -->
<div id="map" class="center" bind:this={container} bind:clientWidth={w} />

<style>
	#map {
		margin: 0;
		padding: 0;
		height: 300px;
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
	.legend-sq {
		position: relative;
		display: inline-block;
		transform: translate(0, 3px);
		width: 1rem;
		height: 1rem;
		/* border: 1px solid grey; */
	}
	.legend-sq::before {
		content: " ";
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: currentColor;
		opacity: 0.2;
	}
	.legend-text-boundary {
		font-weight: bold;
		color: #1b708f;
	}
	.legend-text-comp::before {
		content: "(";
	}
	.legend-text-comp::after {
		content: ")";
	}
</style>
