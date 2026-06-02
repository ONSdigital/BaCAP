import bbox from "@turf/bbox";

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
