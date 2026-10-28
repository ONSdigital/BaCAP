import { describe, expect, it } from "vitest";
import { simplifyGeo } from "./index.js";

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
