import { describe, expect, it } from "vitest";
import { simplifyGeo, parseGeoJSON, bboxesOverlap } from "./index.js";
import { AreaError } from "./upload.js";

// A detailed ring (so the geometry is long enough to need simplifying) around a centre point
function circle(lng, lat, radius, points = 400) {
	const ring = [...Array(points).keys()].map((i) => {
		const a = (2 * Math.PI * i) / points;
		return [lng + radius * Math.cos(a), lat + radius * Math.sin(a)];
	});
	return [...ring, ring[0]];
}

// A zero-area hole, like those left over from dissolving boundaries in GIS software
const sliverHole = [
	[-3.07162, 51.51801],
	[-3.071011803072167, 51.518517204818046],
	[-3.071011803072164, 51.518517204818046],
	[-3.07162, 51.51801]
];

describe("simplifyGeo", () => {
	it("simplifies a geometry to under the maximum length", () => {
		const geometry = { type: "Polygon", coordinates: [circle(-3.1, 51.5, 0.1)] };
		const simple = simplifyGeo(geometry);
		expect(simple.type).toBe("Polygon");
		expect(JSON.stringify(simple).length).toBeLessThan(5000);
	});

	it("does not throw on a MultiPolygon with a zero-area hole", () => {
		const geometry = {
			type: "MultiPolygon",
			coordinates: [[circle(-3.1, 51.5, 0.1), sliverHole], [circle(-2.9, 51.6, 0.05)]]
		};
		const simple = simplifyGeo(geometry);
		expect(simple.type).toBe("MultiPolygon");
		expect(simple.coordinates.every((rings) => rings.length === 1)).toBe(true);
		expect(JSON.stringify(simple).length).toBeLessThan(5000);
	});

	it("does not throw on a Polygon with a zero-area hole", () => {
		const geometry = { type: "Polygon", coordinates: [circle(-3.1, 51.5, 0.1), sliverHole] };
		const simple = simplifyGeo(geometry);
		expect(simple.coordinates).toHaveLength(1);
		expect(JSON.stringify(simple).length).toBeLessThan(5000);
	});
});

// Just enough of the Centroids API for parseGeoJSON, with no OA/LSOA centroids at all
const emptyCentroids = {
	isValidCode: () => false,
	inPolygon: () => new Set(),
	compress: (cds) => new Set(cds)
};

function square(x, y, size) {
	return {
		type: "Feature",
		properties: { areanm: "Test area" },
		geometry: {
			type: "Polygon",
			coordinates: [
				[
					[x, y],
					[x + size, y],
					[x + size, y + size],
					[x, y + size],
					[x, y]
				]
			]
		}
	};
}

describe("bboxesOverlap", () => {
	it("detects overlapping, touching and separate boxes", () => {
		expect(bboxesOverlap([0, 0, 2, 2], [1, 1, 3, 3])).toBe(true);
		expect(bboxesOverlap([0, 0, 1, 1], [1, 1, 2, 2])).toBe(true);
		expect(bboxesOverlap([0, 0, 1, 1], [2, 2, 3, 3])).toBe(false);
	});
});

describe("parseGeoJSON", () => {
	it("keeps a tiny area in England/Wales that contains no OA centroids", () => {
		// ~10m square in Cardiff - too small to contain any centroid, but still a valid area
		const area = parseGeoJSON(square(-3.18, 51.48, 0.0001), emptyCentroids);
		expect(area.properties.areanm).toBe("Test area");
		expect(area.properties.oa21cds.size).toBe(0);
		expect(area.geometry.bbox).toHaveLength(4);
	});

	it("keeps an area that only partly overlaps England/Wales", () => {
		const area = parseGeoJSON(square(-7, 50, 1), emptyCentroids);
		expect(area.properties.oa21cds.size).toBe(0);
	});

	it("rejects an area that doesn't overlap England/Wales, eg. a mis-projected file", () => {
		// Where WGS84 degrees end up if wrongly treated as British National Grid metres
		const feature = square(-7.5573, 49.7672, 0.00003);
		expect(() => parseGeoJSON(feature, emptyCentroids)).toThrow(AreaError);
		expect(() => parseGeoJSON(feature, emptyCentroids)).toThrow(
			/does not overlap England or Wales/
		);
	});

	it("rejects British National Grid coordinates when the file has no CRS", () => {
		const feature = square(318000, 176000, 1000);
		expect(() => parseGeoJSON(feature, emptyCentroids)).toThrow(
			/not valid longitude\/latitude/
		);
	});

	it("accepts the same British National Grid coordinates when flagged as BNG", () => {
		const area = parseGeoJSON(square(318000, 176000, 1000), emptyCentroids, true);
		expect(area.geometry.bbox[0]).toBeCloseTo(-3.18, 1); // Cardiff;
	});

	it("handles null properties", () => {
		const feature = { ...square(-3.18, 51.48, 0.01), properties: null };
		expect(parseGeoJSON(feature, emptyCentroids).properties.areanm).toBeNull();
	});

	it("rejects a Feature with no geometry", () => {
		const feature = { type: "Feature", properties: {}, geometry: null };
		expect(() => parseGeoJSON(feature, emptyCentroids)).toThrow(AreaError);
	});
});
