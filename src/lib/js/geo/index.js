import bbox from "@turf/bbox";
import simplify from "@turf/simplify";
import buffer from "@turf/buffer";
import area from "@turf/area";
import { roundAll, slugify } from "../utils";
import { download } from "../io";
import { snapshot } from "../state";

export { default as Centroids } from "./centroids.js";
export { default as MaplibreDraw } from "./draw-lib.js";
export { default as Polygon } from "./polygon.svelte.js";

export function feature(geometry, properties = {}) {
	return { type: "Feature", geometry, properties };
}

export function featureCollection(features) {
	return { type: "FeatureCollection", features };
}

export function getGeometry(geojson) {
	const geometry = geojson.coordinates
		? geojson
		: geojson.type === "Feature"
			? geojson.geometry
			: geojson.type === "FeatureCollection"
				? geojson?.features?.[0]?.geometry
				: null;
	if (!geometry) throw Error("Invalid GeoJSON geometry");
	return geometry;
}

export function getProperties(geojson) {
	return geojson.properties
		? geojson.properties
		: geojson.type === "FeatureCollection"
			? geojson?.features?.[0]?.properties
			: null;
}

export function getNameKey(keys) {
	const prefs = ["areanm", "name", "areacd"];
	for (const pref of prefs) {
		const match = keys.find((key) => key.toLowerCase() === pref);
		if (match) return match;
	}
	return null;
}

export function getCodeKey(keys) {
	const prefs = ["areacd", "code"];
	for (const pref of prefs) {
		const match = keys.find((key) => key.toLowerCase() === pref);
		if (match) return match;
	}
	return null;
}

export function parseGeoJSON(geojson, centroids) {
	if (!geojson.type) throw Error("Feature is not valid GeoJSON");

	const props = getProperties(geojson);
	if (props.areacd === "K04000001") props.oa21cds = props.lsoa21cds = ["E92000001", "W92000001"];

	const geometry = getGeometry(geojson);
	if (!geometry.bbox) geometry.bbox = props.bounds || bbox(geometry);

	const areanm = props[getNameKey(Object.keys(props))] || null;
	const areacd = props[getCodeKey(Object.keys(props))] || null;
	const properties = {
		areanm,
		areacd,
		group: props.group || null,
		oa21cds: new Set(
			props.oa21cds ||
				props.codes_compressed ||
				(centroids.isValidCode(areacd, "oa")
					? [areacd]
					: centroids.compress(centroids.inPolygon(geometry, "oa")))
		),
		lsoa21cds: new Set(
			props.lsoa21cds ||
				props.codes_compressed_to_lsoa ||
				(centroids.isValidCode(areacd, "lsoa")
					? [areacd]
					: centroids.compress(centroids.inPolygon(geometry, "lsoa")))
		)
	};
	console.log({ props, properties });

	return { type: "Feature", id: geojson.id || null, geometry, properties };
}

// Simplifies a geojson geometry
export function simplifyGeo(geometry, maxLength = 5000) {
	let precision = 5;

	let simple = buffer(geometry, 0).geometry; // Fix invalid geometries
	simple.coordinates = roundAll(simple.coordinates, precision + 1);
	let length = JSON.stringify(simple).length;

	while (length >= maxLength && precision >= 2) {
		if (simple.type === "MultiPolygon") {
			const polyArea = area(simple);
			simple.coordinates = simple.coordinates.filter(
				(d) =>
					area({ type: "Polygon", coordinates: d }) >
					polyArea * Math.min(Math.pow(10, -precision), 0.01)
			);
		}
		simple = simplify(simple, {
			highQuality: true,
			tolerance: Math.pow(10, -precision)
		});
		simple.coordinates = roundAll(simple.coordinates, Math.ceil(precision));
		length = JSON.stringify(simple).length;
		precision -= 0.5;
	}
	return simple;
}

export function makeSavedArea(activeArea, current, centroids, id = null) {
	const area = snapshot(activeArea);
	if (id) area.id = id;
	area.geometry = current.geometry;
	if (!area.properties.group) area.properties.group = "Custom areas";
	area.properties.oa21cds = centroids.compress(current.oa);
	area.properties.lsoa21cds = centroids.compress(current.lsoa);
	return area;
}

export function downloadArea(area, filename = null) {
	const name = filename || area.properties?.areanm || "Custom Area";
	const str = JSON.stringify(area, (key, val) => (val instanceof Set ? [...val] : val));
	const file = new Blob([str], { type: "application/json" });
	download(file, `${name.replaceAll(" ", "_")}.json`);
}

export function uploadAreas(uploader) {
	return new Promise((resolve) => {
		let file = uploader?.files?.[0];
		if (!file) resolve({ status: "invalid" });

		const reader = new FileReader();

		reader.onload = (e) => {
			try {
				const data = JSON.parse(e.target.result);
				const features =
					data.type === "FeatureCollection"
						? data.features
						: data.type === "Feature"
							? [data]
							: [];
				const areas = features.filter((d) =>
					["Polygon", "MultiPolygon"].includes(d.geometry?.type)
				);
				const status = !areas.length ? "empty" : areas.length > 1 ? "multi" : "single";
				const keys = status === "empty" ? null : Object.keys(areas[0].properties);
				resolve({
					status,
					areas,
					selected: areas.map(() => false),
					nameKey: keys ? getNameKey(keys) : null,
					codeKey: keys ? getCodeKey(keys) : null
				});
			} catch (err) {
				console.warn(err);
				resolve({ status: "invalid" });
			}
		};
		reader.readAsText(file);
	});
}

export function getName(activeArea, fallback = "Custom Area") {
	return activeArea?.properties?.areanm || fallback;
}

export function makeFilename(activeArea, extension = null) {
	const name = getName(activeArea);
	const ext = extension ? `.${extension}` : "";
	return slugify(name) + ext;
}

export function isValidAreaCode(code) {
	return !!code.match(/^[EKNSW]\d{8}$/);
}
