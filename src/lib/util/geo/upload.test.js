import { describe, expect, it, vi } from "vitest";
import {
	findDuplicateAreaId,
	maxUploadAreas,
	parseUploadedGeoJSON,
	uploadAreas
} from "./upload.js";

function polygonFeature(properties = {}) {
	return {
		type: "Feature",
		properties,
		geometry: {
			type: "Polygon",
			coordinates: [
				[
					[0, 0],
					[1, 0],
					[1, 1],
					[0, 1],
					[0, 0]
				]
			]
		}
	};
}

function featureCollection(features, extra = {}) {
	return { type: "FeatureCollection", features, ...extra };
}

describe("parseUploadedGeoJSON", () => {
	it("returns invalid for malformed JSON", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		expect(parseUploadedGeoJSON("not json")).toEqual({ status: "invalid" });
	});

	it("returns invalid for a file with no Polygon/MultiPolygon features", () => {
		const text = JSON.stringify(
			featureCollection([
				{ type: "Feature", geometry: { type: "Point", coordinates: [0, 0] } }
			])
		);
		expect(parseUploadedGeoJSON(text)).toEqual({ status: "invalid" });
	});

	it("parses a single valid area", () => {
		const text = JSON.stringify(
			featureCollection([polygonFeature({ areanm: "Test area", areacd: "E00000001" })])
		);
		const result = parseUploadedGeoJSON(text);
		expect(result.status).toBe("single");
		expect(result.nameKey).toBe("areanm");
		expect(result.codeKey).toBe("areacd");
		expect(result.selected).toEqual([false]);
	});

	it("parses multiple valid areas", () => {
		const text = JSON.stringify(
			featureCollection([polygonFeature({ areanm: "A" }), polygonFeature({ areanm: "B" })])
		);
		const result = parseUploadedGeoJSON(text);
		expect(result.status).toBe("multi");
		expect(result.selected).toEqual([false, false]);
	});

	it("detects British National Grid from the crs property, case-insensitively", () => {
		const text = JSON.stringify(
			featureCollection([polygonFeature()], {
				crs: { properties: { name: "urn:ogc:def:crs:epsg:27700" } }
			})
		);
		expect(parseUploadedGeoJSON(text).isBNG).toBe(true);

		const noCrs = JSON.stringify(featureCollection([polygonFeature()]));
		expect(parseUploadedGeoJSON(noCrs).isBNG).toBe(false);
	});

	it("accepts a file with exactly the area limit", () => {
		const features = Array.from({ length: maxUploadAreas }, () => polygonFeature());
		expect(parseUploadedGeoJSON(JSON.stringify(featureCollection(features))).status).toBe(
			"multi"
		);
	});

	it("truncates to the first maxUploadAreas areas needing a centroid match", () => {
		const features = Array.from({ length: maxUploadAreas + 1 }, (_, i) =>
			polygonFeature({ areanm: `Area ${i}` })
		);
		const result = parseUploadedGeoJSON(JSON.stringify(featureCollection(features)));
		expect(result.status).toBe("multi");
		expect(result.totalCount).toBe(maxUploadAreas + 1);
		expect(result.truncatedCount).toBe(1);
		expect(result.areas).toHaveLength(maxUploadAreas);
		expect(result.selected).toHaveLength(maxUploadAreas);
		// Keeps the first areas in the file, not an arbitrary subset
		expect(result.areas.map((d) => d.properties.areanm)).toEqual(
			features.slice(0, maxUploadAreas).map((d) => d.properties.areanm)
		);
	});

	it("reports no truncation for a file within the limit", () => {
		const features = Array.from({ length: maxUploadAreas }, () => polygonFeature());
		const result = parseUploadedGeoJSON(JSON.stringify(featureCollection(features)));
		expect(result.truncatedCount).toBe(0);
		expect(result.totalCount).toBe(maxUploadAreas);
	});

	it("exempts areas that already carry embedded best-fit codes from the limit", () => {
		const features = Array.from({ length: maxUploadAreas + 50 }, () =>
			polygonFeature({ oa21cds: ["E00000001"], lsoa21cds: ["E01000001"] })
		);
		expect(parseUploadedGeoJSON(JSON.stringify(featureCollection(features))).status).toBe(
			"multi"
		);
	});

	it("only counts areas without embedded codes toward the limit", () => {
		const cheap = Array.from({ length: maxUploadAreas + 50 }, () =>
			polygonFeature({ oa21cds: ["E00000001"], lsoa21cds: ["E01000001"] })
		);
		const expensive = Array.from({ length: maxUploadAreas + 1 }, () => polygonFeature());
		const result = parseUploadedGeoJSON(
			JSON.stringify(featureCollection([...cheap, ...expensive]))
		);
		// All the cheap areas are kept, plus only the first maxUploadAreas expensive ones
		expect(result.totalCount).toBe(cheap.length + expensive.length);
		expect(result.truncatedCount).toBe(1);
		expect(result.areas).toHaveLength(cheap.length + maxUploadAreas);
	});
});

describe("findDuplicateAreaId", () => {
	function savedArea(id, areanm, areacd) {
		return { id, type: "Feature", properties: { areanm, areacd } };
	}

	it("matches when the uploaded feature's id and name both match a saved area", () => {
		const savedAreas = { 1: savedArea(1, "Hartlepool", "E06000001") };
		const area = { id: 1, properties: { areanm: "Hartlepool" } };
		expect(findDuplicateAreaId(savedAreas, area, "areanm", "areacd")).toBe(1);
	});

	it("does not match by id alone when the name differs", () => {
		const savedAreas = { 1: savedArea(1, "Hartlepool", "E06000001") };
		const area = { id: 1, properties: { areanm: "Somewhere else" } };
		expect(findDuplicateAreaId(savedAreas, area, "areanm", "areacd")).toBeNull();
	});

	it("matches by GSS code and name when the id doesn't match any saved area", () => {
		const savedAreas = { 1: savedArea(1, "Hartlepool", "E06000001") };
		const area = { id: 999, properties: { areanm: "Hartlepool", areacd: "E06000001" } };
		expect(findDuplicateAreaId(savedAreas, area, "areanm", "areacd")).toBe(1);
	});

	it("does not match by code alone when the name differs", () => {
		const savedAreas = { 1: savedArea(1, "Hartlepool", "E06000001") };
		const area = { id: 999, properties: { areanm: "Somewhere else", areacd: "E06000001" } };
		expect(findDuplicateAreaId(savedAreas, area, "areanm", "areacd")).toBeNull();
	});

	it("returns null when neither id nor code matches", () => {
		const savedAreas = { 1: savedArea(1, "Hartlepool", "E06000001") };
		const area = { id: 999, properties: { areanm: "Hartlepool", areacd: "E09000001" } };
		expect(findDuplicateAreaId(savedAreas, area, "areanm", "areacd")).toBeNull();
	});

	it("returns null when the uploaded area has no name, even if the id matches", () => {
		const savedAreas = { 1: savedArea(1, "Hartlepool", "E06000001") };
		const area = { id: 1, properties: {} };
		expect(findDuplicateAreaId(savedAreas, area, "areanm", "areacd")).toBeNull();
	});

	it("ignores case and surrounding whitespace in the name", () => {
		const savedAreas = { 1: savedArea(1, "Hartlepool", "E06000001") };
		const area = { id: 1, properties: { areanm: "  HARTLEPOOL  " } };
		expect(findDuplicateAreaId(savedAreas, area, "areanm", "areacd")).toBe(1);
	});

	it("doesn't throw when there is no code key, and still checks by id", () => {
		const savedAreas = { 1: savedArea(1, "Hartlepool", "E06000001") };
		const matched = { id: 1, properties: { areanm: "Hartlepool" } };
		const unmatched = { id: 999, properties: { areanm: "Hartlepool" } };
		expect(findDuplicateAreaId(savedAreas, matched, "areanm", null)).toBe(1);
		expect(findDuplicateAreaId(savedAreas, unmatched, "areanm", null)).toBeNull();
	});
});

describe("uploadAreas", () => {
	it("resolves invalid when no file is selected", async () => {
		await expect(uploadAreas({ files: [] })).resolves.toEqual({ status: "invalid" });
	});

	it("resolves invalid when the file can't be read", async () => {
		class FailingFileReader {
			readAsText() {
				this.onerror();
			}
		}
		vi.stubGlobal("FileReader", FailingFileReader);
		await expect(uploadAreas({ files: [{}] })).resolves.toEqual({ status: "invalid" });
		vi.unstubAllGlobals();
	});

	it("parses the file's text content via FileReader", async () => {
		const text = JSON.stringify(featureCollection([polygonFeature({ areanm: "A" })]));
		class FakeFileReader {
			readAsText() {
				this.onload({ target: { result: text } });
			}
		}
		vi.stubGlobal("FileReader", FakeFileReader);
		const result = await uploadAreas({ files: [{}] });
		expect(result.status).toBe("single");
		vi.unstubAllGlobals();
	});
});
