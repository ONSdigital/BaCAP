import bbox from "@turf/bbox";
import union from "@turf/union";
import difference from "@turf/difference";
import { getGeometry, feature, featureCollection } from "./index.js";

export default class Polygon {
	geometry = $state(null);

	constructor(geojson) {
		if (!geojson) this.geometry = null;
		else {
			const _bbox = geojson.bbox || bbox(geojson);
			const geometry = getGeometry(geojson);
			geometry.bbox = _bbox;
			this.geometry = geometry;
		}
	}
	add(geojson) {
		const geometry = this.geometry
			? getGeometry(
					union(
						featureCollection([feature(this.geometry), feature(getGeometry(geojson))])
					)
				)
			: getGeometry(geojson);
		geometry.bbox = bbox(geometry);
		this.geometry = geometry;
	}
	subtract(geojson) {
		if (!this.geometry) return;
		const result = difference(
			featureCollection([feature(this.geometry), feature(getGeometry(geojson))])
		);
		if (!result) {
			// Nothing is left when the erased shape covers the whole polygon
			this.geometry = null;
			return;
		}
		const geometry = getGeometry(result);
		geometry.bbox = bbox(geometry);
		this.geometry = geometry;
	}
}
