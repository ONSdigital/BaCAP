import { describe, expect, it, vi } from "vitest";
import Centroids from "./centroids.js";

// A minimal hierarchy: one OA per English region, plus two OAs in one Welsh authority
const regions = [...Array(9).keys()].map((i) => `E1200000${i + 1}`);
const oaData = [
	...regions.map((rgn, i) => ({
		oa21cd: `E0000000${i + 1}`,
		lsoa21cd: `E0100000${i + 1}`,
		msoa21cd: `E0200000${i + 1}`,
		ltla21cd: `E0600000${i + 1}`,
		rgn21cd: rgn,
		lng: 0,
		lat: 52,
		population: 100
	})),
	...[1, 2].map((i) => ({
		oa21cd: `W0000000${i}`,
		lsoa21cd: `W0100000${i}`,
		msoa21cd: "W02000001",
		ltla21cd: "W06000001",
		rgn21cd: "W92000004",
		lng: -3,
		lat: 52,
		population: 50
	}))
];
const lsoaData = oaData.map((d) => ({ lsoa21cd: d.lsoa21cd, lng: d.lng, lat: d.lat }));
const englandOAs = oaData.filter((d) => d.oa21cd.startsWith("E")).map((d) => d.oa21cd);
const allOAs = oaData.map((d) => d.oa21cd);

describe("Centroids", () => {
	const centroids = new Centroids(oaData, lsoaData);

	it("compresses every English OA to England", () => {
		expect([...centroids.compress(new Set(englandOAs))]).toEqual(["E92000001"]);
	});

	it("compresses every OA to England and Wales", () => {
		expect([...centroids.compress(new Set(allOAs))]).toEqual(["K04000001"]);
	});

	it("expands England and Wales back to every OA", () => {
		expect([...centroids.expand(["E92000001", "W92000004"])].sort()).toEqual(allOAs.sort());
		expect([...centroids.expand(["K04000001"])].sort()).toEqual(allOAs.sort());
	});

	it("skips unknown codes when expanding instead of throwing", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		expect([...centroids.expand(["E05000001", "W00000001"])]).toEqual(["W00000001"]);
	});

	it("finds England and Wales as the common parent of a cross-border selection", () => {
		expect(centroids.commonParent({ raw: new Set(["E00000001", "W00000001"]) })).toBe(
			"K04000001"
		);
	});

	it("finds Wales as the common parent of a selection within Wales", () => {
		expect(centroids.commonParent({ compressed: new Set(["W06000001"]) })).toBe("W92000004");
	});

	it("ignores unknown OA codes when summing population", () => {
		expect(centroids.population(new Set(["E00000001", "E00999999"]))).toBe(100);
	});

	function square(cx, cy, halfSize) {
		return {
			type: "Polygon",
			coordinates: [
				[
					[cx - halfSize, cy - halfSize],
					[cx + halfSize, cy - halfSize],
					[cx + halfSize, cy + halfSize],
					[cx - halfSize, cy + halfSize],
					[cx - halfSize, cy - halfSize]
				]
			],
			bbox: [cx - halfSize, cy - halfSize, cx + halfSize, cy + halfSize]
		};
	}

	it("finds the OA codes whose centroids fall inside a polygon", () => {
		// All English OAs in the fixture sit at (0, 52); both Welsh OAs sit at (-3, 52)
		expect([...centroids.inPolygon(square(0, 52, 1), "oa")].sort()).toEqual(englandOAs.sort());
		expect([...centroids.inPolygon(square(-3, 52, 1), "oa")].sort()).toEqual([
			"W00000001",
			"W00000002"
		]);
	});

	it("finds the LSOA codes whose centroids fall inside a polygon", () => {
		expect([...centroids.inPolygon(square(0, 52, 1), "lsoa")].sort()).toEqual(
			regions.map((_, i) => `E0100000${i + 1}`).sort()
		);
	});

	it("returns no codes for a polygon that contains no centroids", () => {
		expect(centroids.inPolygon(square(10, 10, 1), "oa").size).toBe(0);
	});
});
