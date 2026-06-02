import bbox from "@turf/bbox";
import union from "@turf/union";
import difference from "@turf/difference";
import { getGeometry } from "./geo.js";

function makeFeature(geometry) {
	return { type: "Feature", geometry, properties: {} };
}

function featureCollection(geometries) {
	return { type: "FeatureCollection", features: geometries.map((d) => makeFeature(d)) };
}

export default class Polygon {
	geometry = $state(null);

	constructor(geojson) {
		console.log("construct", geojson);
		if (!geojson) this.geometry = null;
		else {
			const _bbox = geojson.bbox || bbox(geojson);
			const geometry = getGeometry(geojson);
			geometry.bbox = _bbox;
			this.geometry = geometry;
		}
	}
	add(geojson) {
		console.log("add", geojson);
		const geometry = this.geometry
			? getGeometry(union(featureCollection([this.geometry, getGeometry(geojson)])))
			: getGeometry(geojson);
		geometry.bbox = bbox(geometry);
		this.geometry = geometry;
	}
	subtract(geojson) {
		console.log("subtract", geojson);
		if (!this.geometry) return;
		const geometry = getGeometry(
			difference(featureCollection([this.geometry, getGeometry(geojson)]))
		);
		if (!geometry) this.geometry = null;
		geometry.bbox = bbox(geometry);
		this.geometry = geometry;
	}
}
