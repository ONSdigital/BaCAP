import bbox from "@turf/bbox";
import simplify from "@turf/simplify";
import buffer from "@turf/buffer";
import area from "@turf/area";
import { roundAll } from "$lib/utils.js";

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

export function parseGeoJSON(geojson, centroids) {
	if (!geojson.type) throw Error("Feature is not valid GeoJSON");

	const props = getProperties(geojson);
	if (props.areacd === "K04000001") props.oa21cds = props.lsoa21cds = ["E92000001", "W92000001"];

	const geometry = getGeometry(geojson);
	if (!geometry.bbox) geometry.bbox = props.bounds || bbox(geometry);

	const properties = {
		name: props.name || props.areanm || props.areacd,
		// Convert codes to Set here?
		oa21cds:
			props.oa21cds ||
			props.codes_compressed ||
			centroids.compress(centroids.inPolygon(geometry, "oa")),
		lsoa21cds:
			props.lsoa21cds ||
			props.codes_compressed_to_lsoa ||
			centroids.compress(centroids.inPolygon(geometry, "lsoa"))
	};

	return { type: "Feature", geometry, properties };
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
