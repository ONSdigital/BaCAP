<script>
	import { resolve } from "$app/paths";
	import { Map, MapSource, MapLayer } from "@onsvisual/svelte-maps";
	import MaplibreDraw from "$lib/js/geo/draw-lib.js";
	import maplibre from "maplibre-gl";
	import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
	import circle from "@turf/circle";
	import { Polygon } from "$lib/js/geo";
	import { sleep } from "$lib/js/utils";
	import { parseGeoJSON } from "$lib/js/geo";
	import { onsColors, drawLayerStyles } from "$lib/js/config";

	let { appState = $bindable(), drawState, centroids } = $props();
	let { history, rehistory, activeArea, lastActivePage } = appState;
	let map = $state();
	let draw = $state();
	let polygon = $state.raw($history[0] ? new Polygon($history[0].geometry) : new Polygon());
	let codes = $state.raw(
		$history[0]
			? { oa: $history[0].oa, lsoa: $history[0].lsoa }
			: { oa: new Set(), lsoa: new Set() }
	);
	let radius = $state.raw(null);

	function getDrawMode(mode) {
		return mode === "polygon" ? "draw_polygon" : "simple_select";
	}

	function setCursor(mode) {
		const cursor = mode === "pan" ? "grab" : "crosshair";
		const canvas = document.querySelector("#map-container canvas");
		if (canvas) canvas.style.cursor = cursor;
	}

	export async function applyShape(feature, mode = drawState.eraseMode ? "subtract" : "add") {
		$lastActivePage = "draw";
		const _feature = feature.geojson ? parseGeoJSON(feature.geojson, centroids) : feature;

		const oa = _feature?.properties?.oa21cds
			? centroids.expand(_feature.properties.oa21cds, "oa")
			: centroids.inPolygon(_feature, "oa");
		const lsoa = _feature?.properties?.lsoa21cds
			? centroids.expand(_feature.properties.lsoa21cds, "lsoa")
			: centroids.inPolygon(_feature, "lsoa");

		if (mode === "subtract") {
			polygon.subtract(_feature);
			codes = { oa: codes.oa.difference(oa), lsoa: codes.lsoa.difference(lsoa) };
		} else if (mode === "add") {
			polygon.add(_feature);
			codes = { oa: codes.oa.union(oa), lsoa: codes.lsoa.union(lsoa) };
		} else {
			polygon = new Polygon(_feature);
			codes = { oa, lsoa };
		}

		if (mode === "replace") {
			$activeArea = _feature;
		} else {
			// Remove GSS code if an area has been edited
			$activeArea.properties.areacd = null;
		}

		draw?.deleteAll?.();
		await sleep();
		draw?.changeMode?.(getDrawMode(drawState.drawMode), {});
		setCursor(drawState.drawMode);

		$history = [{ ...codes, geometry: polygon.geometry }, ...$history].slice(0, 10);
		$rehistory = [];
	}

	function applyHistory(state) {
		$lastActivePage = "draw";
		polygon = new Polygon(state.geometry);
		codes = { oa: new Set([...state.oa]), lsoa: new Set([...state.lsoa]) };
	}

	export const zoomIn = () => map?.zoomIn?.();
	export const zoomOut = () => map?.zoomOut?.();

	export function fitPolygon() {
		const bbox = polygon?.geometry?.bbox;
		if (bbox) map?.fitBounds?.(bbox, { padding: 40 });
	}

	export function undoDraw() {
		if ($history.length > 1) {
			console.log("undoing", $history.length);
			$rehistory = [$history[0], ...$rehistory];
			$history = $history.slice(1);
			applyHistory($history[0]);
		}
	}

	export function redoDraw() {
		if ($rehistory.length) {
			console.log("redoing", $rehistory.length);
			$history = [$rehistory[0], ...$history];
			$rehistory = $rehistory.slice(1);
			applyHistory($history[0]);
		}
	}

	export function clearDraw() {
		$history = [{ oa: new Set(), lsoa: new Set(), geometry: null }, ...$history].slice(0, 10);
		$rehistory = [];
		$activeArea = { type: "Feature", id: null, geometry: null, properties: {} };
		applyHistory($history[0]);
	}

	function initDraw() {
		draw = new MaplibreDraw({
			displayControlsDefault: false,
			styles: drawLayerStyles
		});
		map.addControl(draw, "bottom-left");
		map.addControl(new maplibre.ScaleControl(), "top-right");

		map.on("draw.create", (e) => {
			const feature = e.features[0];
			applyShape(feature);
		});
		map.on("mousemove", (e) => {
			if (drawState.drawMode === "radius") {
				const center = [e?.lngLat?.lng, e?.lngLat?.lat];
				radius = circle(center, drawState.radius);
			}
		});
		map.on("click", () => {
			if (drawState.drawMode === "radius") {
				applyShape(radius);
			}
		});
		fitPolygon();
	}

	$effect(() => {
		if (draw) {
			draw.changeMode(getDrawMode(drawState.drawMode));
			setCursor(drawState.drawMode);
		}
	});

	$inspect({ codes });
	$inspect({ $activeArea });
</script>

<div id="map-container">
	<Map
		bind:map
		on:load={initDraw}
		style={resolve("/data/style.json")}
		location={{
			bounds: [
				[-6, 49],
				[2, 56]
			]
		}}
		controls
	>
		<MapSource
			id="polygon"
			type="geojson"
			data={polygon?.geometry || { type: "FeatureCollection", features: [] }}
		>
			<MapLayer
				id="polygon-fill"
				type="fill"
				paint={{
					"fill-color": onsColors.skyBlue,
					"fill-opacity": 0.2
				}}
			/>
			<MapLayer
				id="polygon-line"
				type="line"
				paint={{
					"line-color": onsColors.skyBlue,
					"line-width": 2
				}}
			/>
		</MapSource>
		<MapSource
			id="radius"
			type="geojson"
			data={(drawState.drawMode === "radius" && radius) || {
				type: "FeatureCollection",
				features: []
			}}
		>
			<MapLayer
				id="radius-fill"
				type="fill"
				paint={{
					"fill-color": onsColors.oceanBlue,
					"fill-opacity": 0.1
				}}
			/>
			<MapLayer
				id="radius-line"
				type="line"
				layout={{ "line-cap": "round", "line-join": "round" }}
				paint={{
					"line-color": onsColors.nightBlue,
					"line-dasharray": [0.2, 2],
					"line-width": 3
				}}
			/>
		</MapSource>
	</Map>
</div>

<style>
	#map-container {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		right: 0;
	}
	#map-container :global(.maplibregl-ctrl-top-right) {
		top: 60px;
		display: flex;
		flex-direction: row-reverse;
	}
	#map-container :global(.maplibregl-ctrl-scale) {
		height: 24px;
	}
</style>
