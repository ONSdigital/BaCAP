import { describe, expect, it, vi } from "vitest";
import {
	findDuplicateAreaId,
	getAreaErrorMessage,
	AreaError,
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

	it("returns invalid for JSON that isn't an object", () => {
		expect(parseUploadedGeoJSON("null")).toEqual({ status: "invalid" });
		expect(parseUploadedGeoJSON("42")).toEqual({ status: "invalid" });
	});

	it("returns invalid for a FeatureCollection whose features aren't an array", () => {
		const text = JSON.stringify({ type: "FeatureCollection", features: {} });
		expect(parseUploadedGeoJSON(text)).toEqual({ status: "invalid" });
	});

	it("treats null feature properties as empty, rather than throwing", () => {
		const text = JSON.stringify(featureCollection([polygonFeature(null)]));
		const result = parseUploadedGeoJSON(text);
		expect(result.status).toBe("single");
		expect(result.areas[0].properties).toEqual({});
		expect(result.nameKey).toBeNull();
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

	it("detects the British National Grid CRS name formats written by common GIS tools", () => {
		const isBNG = (name) =>
			parseUploadedGeoJSON(
				JSON.stringify(
					featureCollection([polygonFeature()], { crs: { properties: { name } } })
				)
			).isBNG;
		expect(isBNG("EPSG:27700")).toBe(true);
		expect(isBNG("urn:ogc:def:crs:EPSG::27700")).toBe(true); // QGIS/GDAL
		expect(isBNG("http://www.opengis.net/def/crs/EPSG/0/27700")).toBe(true);
		expect(isBNG("urn:ogc:def:crs:OGC:1.3:CRS84")).toBe(false);
		expect(isBNG("EPSG:277000")).toBe(false);
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

	it("resolves invalid rather than hanging if parsing throws unexpectedly", async () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		class BrokenFileReader {
			readAsText() {
				this.onload({}); // no target, so reading the result throws
			}
		}
		vi.stubGlobal("FileReader", BrokenFileReader);
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

describe("getAreaErrorMessage", () => {
	it("passes through AreaError messages, which are written for users", () => {
		expect(getAreaErrorMessage(new AreaError("Friendly message"))).toBe("Friendly message");
	});

	it("uses a generic message for any other error", () => {
		expect(getAreaErrorMessage(new TypeError("x is undefined"))).toBe(
			"The area could not be read from this file."
		);
	});
});
