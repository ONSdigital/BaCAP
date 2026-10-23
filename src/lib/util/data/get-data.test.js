import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../state/index.js", () => ({
	get: vi.fn(),
	set: vi.fn(),
	update: vi.fn()
}));

import { get, update } from "../state/index.js";
import getData, {
	calcPercentages,
	fillAreaCodes,
	filterMeasures,
	getMaxAreaCodes,
	isNomisCsv,
	makeCategoryLookup,
	makeCells,
	makeGeo,
	makeUrlFn,
	makeUrls,
	parseData
} from "./get-data.js";

describe("makeCells", () => {
	it("returns a single-cell category by its cell code", () => {
		expect(makeCells([{ label: "Total", cells: [0] }])).toBe("0");
	});

	it("encodes a multi-cell category as a MAKE expression", () => {
		expect(
			makeCells([
				{ label: "16-24", cells: [1] },
				{ label: "25-64", cells: [2, 3] }
			])
		).toBe("1,MAKE|25-64|2;3");
	});
});

describe("filterMeasures", () => {
	it("keeps only measures with a Nomis cell code", () => {
		expect(
			filterMeasures([
				{ label: "Value", cell: 20100 },
				{ label: "Percent", cell: null }
			])
		).toEqual([{ label: "Value", cell: 20100 }]);
	});
});

describe("makeUrlFn", () => {
	it("builds a base Nomis URL from the table config and appends area codes via make()", () => {
		const table = {
			tableCode: "NM_123_1",
			cellCode: "c_sex",
			categories: [
				{ label: "Male", cells: [1] },
				{ label: "Female", cells: [2] }
			],
			dates: ["2021"],
			measures: [{ label: "Value", cell: 20100 }]
		};

		const urlFn = makeUrlFn(table);
		const base =
			"https://www.nomisweb.co.uk/api/v01/dataset/NM_123_1.data.csv?" +
			"date=2021&c_sex=1,2&measures=20100" +
			"&select=geography_code,date,c_sex,c_sex_name,measures,obs_value" +
			"&geography=";

		expect(urlFn.make([])).toBe(base);
		expect(urlFn.length).toBe(base.length);
		expect(urlFn.make(["E00000001", "E00000002"])).toBe(base + "E00000001,E00000002");
	});

	it("takes the cellCode cells from measures and fixes the real measures param when measuresCell is set", () => {
		const table = {
			tableCode: "NM_162_1",
			cellCode: "measure",
			measuresCell: 20100,
			measures: [
				{ label: "Value", cell: 1 },
				{ label: "Percent", cell: 2 }
			],
			categories: [{ label: "Claimant count" }],
			dates: ["2026-09"]
		};

		const urlFn = makeUrlFn(table);
		const base =
			"https://www.nomisweb.co.uk/api/v01/dataset/NM_162_1.data.csv?" +
			"date=2026-09&measure=1,2&measures=20100" +
			"&select=geography_code,date,measure,measure_name,measures,obs_value" +
			"&geography=";

		expect(urlFn.make([])).toBe(base);
	});
});

describe("getMaxAreaCodes", () => {
	it("divides the Nomis response-cell budget across categories, dates and measures", () => {
		const table = {
			categories: [{ label: "Total", cells: [0] }],
			dates: ["2021"],
			measures: [{ label: "Value", cell: 20100 }]
		};
		expect(getMaxAreaCodes(table)).toBe(25_000);
	});

	it("shrinks the per-request budget as the table gets wider", () => {
		const table = {
			categories: Array.from({ length: 5 }, (_, i) => ({ label: `cat${i}`, cells: [i] })),
			dates: ["2021", "2022"],
			measures: [
				{ label: "Value", cell: 20100 },
				{ label: "Percent", cell: 20301 }
			]
		};
		// floor(25000 / (5 categories * 2 dates * 2 measures)) = floor(25000 / 20)
		expect(getMaxAreaCodes(table)).toBe(1250);
	});
});

describe("fillAreaCodes", () => {
	it("assigns sequential placeholder codes only to areas missing an area code", () => {
		const areas = [
			{ properties: { areacd: "E00000001" } },
			{ properties: {} },
			{ properties: { areacd: "E00000002" } },
			{ properties: {} }
		];

		const filled = fillAreaCodes(areas);

		expect(filled.map((a) => a.properties.areacd)).toEqual([
			"E00000001",
			"X00000001",
			"E00000002",
			"X00000002"
		]);
	});

	it("does not change the areas passed in", () => {
		const areas = [{ properties: {} }];

		fillAreaCodes(areas);

		expect(areas[0].properties.areacd).toBeUndefined();
	});

	it("gives unique codes when areas share a code or already hold a placeholder", () => {
		const areas = [
			{ properties: { areacd: "X00000001" } },
			{ properties: {} },
			{ properties: { areacd: "E06000001" } },
			{ properties: { areacd: "E06000001" } }
		];

		expect(fillAreaCodes(areas).map((a) => a.properties.areacd)).toEqual([
			"X00000001",
			"X00000002",
			"E06000001",
			"X00000003"
		]);
	});
});

describe("makeGeo", () => {
	it("returns the area code directly when it matches its own best-fit code", () => {
		const area = { properties: { areacd: "E00000001" } };
		expect(makeGeo(area, ["E00000001"], 0)).toBe("E00000001");
	});

	it("encodes a MAKE expression when the area is built from multiple best-fit codes", () => {
		const area = { properties: { areacd: "E07000001" } };
		expect(makeGeo(area, ["E00000001", "E00000002"], 0)).toBe(
			"MAKE|E07000001|E00000001;E00000002"
		);
	});
});

describe("makeUrls", () => {
	function makeChunkTable() {
		return {
			tableCode: "NM_1_1",
			cellCode: null,
			// 1000 dummy categories shrinks the per-request area-code budget to 25 (see getMaxAreaCodes)
			categories: Array.from({ length: 1000 }, (_, i) => ({ label: `cat${i}`, cells: [i] })),
			dates: ["2021"],
			measures: [{ label: "Value", cell: 20100 }],
			geography: "oa21"
		};
	}

	function makeChunkAreas() {
		return [0, 1, 2].map((i) => ({
			properties: {
				areacd: `E0700000${i}`,
				areanm: `Area ${i}`,
				oa21cds: Array.from(
					{ length: 15 },
					(_, j) => `E0000${i}${String(j).padStart(2, "0")}`
				)
			}
		}));
	}

	it("splits requests into multiple URLs once the area-code budget is exceeded", () => {
		const table = makeChunkTable();
		const areas = makeChunkAreas();

		expect(getMaxAreaCodes(table)).toBe(25); // sanity check on the fixture

		const urls = makeUrls(table, areas);

		expect(urls).toHaveLength(3);
		areas.forEach((area, i) => {
			const geo = makeGeo(area, area.properties.oa21cds, i);
			expect(urls[i].endsWith(`geography=${geo}`)).toBe(true);
		});
	});

	it("never creates a URL without areas when one area exceeds the budget on its own", () => {
		const table = makeChunkTable();
		const big = {
			properties: {
				areacd: "X00000001",
				oa21cds: Array.from(
					{ length: 30 },
					(_, j) => `E000000${String(j).padStart(2, "0")}`
				)
			}
		};
		const [small] = makeChunkAreas();

		const urls = makeUrls(table, [big, small]);

		expect(urls).toHaveLength(2);
		expect(urls.some((url) => url.endsWith("geography="))).toBe(false);
	});

	it("returns a single URL when areas fit within the limits", () => {
		const table = {
			tableCode: "NM_1_1",
			cellCode: null,
			categories: [{ label: "Total", cells: [0] }],
			dates: ["2021"],
			measures: [{ label: "Value", cell: 20100 }],
			geography: "oa21"
		};
		const areas = [
			{ properties: { areacd: "E00000001", areanm: "Area One", oa21cds: ["E00000001"] } },
			{ properties: { areacd: "E00000002", areanm: "Area Two", oa21cds: ["E00000002"] } }
		];

		const urls = makeUrls(table, areas);
		expect(urls).toHaveLength(1);
		expect(urls[0]).toContain("geography=E00000001,E00000002");
	});

	it("skips areas with no best-fit codes for the requested geography", () => {
		const table = {
			tableCode: "NM_1_1",
			cellCode: null,
			categories: [{ label: "Total", cells: [0] }],
			dates: ["2021"],
			measures: [{ label: "Value", cell: 20100 }],
			geography: "oa21"
		};
		const areas = [
			{ properties: { areacd: "E00000001", areanm: "Area One", oa21cds: ["E00000001"] } },
			{ properties: { areacd: "E00000002", areanm: "Too small", oa21cds: [] } }
		];

		const urls = makeUrls(table, areas);
		expect(urls).toHaveLength(1);
		expect(urls[0]).toContain("geography=E00000001");
		expect(urls[0]).not.toContain("E00000002");
	});
});

describe("makeCategoryLookup", () => {
	it("maps a single-cell category by its cell code", () => {
		expect(makeCategoryLookup([{ label: "Male", cells: [1] }])).toEqual({ 1: "Male" });
	});

	it("maps a multi-cell category by its colon-stripped label, keeping the original label as the value", () => {
		expect(makeCategoryLookup([{ label: "Age: 16-24", cells: [1, 2] }])).toEqual({
			"Age 16-24": "Age: 16-24"
		});
	});
});

describe("calcPercentages", () => {
	it("adds a Percent row after each Value row within a group", () => {
		const data = [
			{ areacd: "A", date: "2021", category: "Cat1", measure: "Value", value: 30 },
			{ areacd: "A", date: "2021", category: "Cat2", measure: "Value", value: 70 }
		];

		expect(calcPercentages(data)).toEqual([
			{ areacd: "A", date: "2021", category: "Cat1", measure: "Value", value: 30 },
			{ areacd: "A", date: "2021", category: "Cat1", measure: "Percent", value: 30 },
			{ areacd: "A", date: "2021", category: "Cat2", measure: "Value", value: 70 },
			{ areacd: "A", date: "2021", category: "Cat2", measure: "Percent", value: 70 }
		]);
	});

	it("rounds percentages to one decimal place", () => {
		const data = [
			{ areacd: "A", date: "2021", category: "Cat1", measure: "Value", value: 1 },
			{ areacd: "A", date: "2021", category: "Cat2", measure: "Value", value: 1 },
			{ areacd: "A", date: "2021", category: "Cat3", measure: "Value", value: 1 }
		];

		const percentValues = calcPercentages(data)
			.filter((d) => d.measure === "Percent")
			.map((d) => d.value);

		expect(percentValues).toEqual([33.3, 33.3, 33.3]);
	});

	it("keeps totals isolated per area/date group", () => {
		const data = [
			{ areacd: "A", date: "2021", category: "Cat1", measure: "Value", value: 50 },
			{ areacd: "B", date: "2021", category: "Cat1", measure: "Value", value: 200 }
		];

		const percentValues = calcPercentages(data)
			.filter((d) => d.measure === "Percent")
			.map((d) => d.value);

		expect(percentValues).toEqual([100, 100]);
	});
});

describe("parseData", () => {
	it("parses CSV rows and sorts them to match the requested area/category order", () => {
		const table = {
			cellCode: "c_sex",
			categories: [
				{ label: "Male", cells: [1] },
				{ label: "Female", cells: [2] }
			],
			measures: [{ label: "Value", cell: 20100 }]
		};
		const areas = [
			{ properties: { areacd: "E00000001", areanm: "Area One" } },
			{ properties: { areacd: "E00000002", areanm: "Area Two" } }
		];
		// Rows deliberately out of order: area two before area one, female before male
		const csv = [
			"GEOGRAPHY_CODE,DATE,C_SEX,C_SEX_NAME,MEASURES,OBS_VALUE",
			"E00000002,2021,2,Female,20100,90",
			"E00000002,2021,1,Male,20100,80",
			"E00000001,2021,2,Female,20100,130",
			"E00000001,2021,1,Male,20100,120"
		].join("\n");

		// Spread into a plain array: d3-dsv attaches a non-index `columns` property
		// to its result, which toEqual would otherwise flag as a mismatch.
		expect([...parseData(table, areas, csv)]).toEqual([
			{
				areacd: "E00000001",
				areanm: "Area One",
				date: "2021",
				category: "Male",
				measure: "Value",
				value: 120
			},
			{
				areacd: "E00000001",
				areanm: "Area One",
				date: "2021",
				category: "Female",
				measure: "Value",
				value: 130
			},
			{
				areacd: "E00000002",
				areanm: "Area Two",
				date: "2021",
				category: "Male",
				measure: "Value",
				value: 80
			},
			{
				areacd: "E00000002",
				areanm: "Area Two",
				date: "2021",
				category: "Female",
				measure: "Value",
				value: 90
			}
		]);
	});

	it("reads the measure label from the cellCode column when measuresCell is set", () => {
		const table = {
			cellCode: "measure",
			measuresCell: 20100,
			measures: [
				{ label: "Value", cell: 1 },
				{ label: "Percent", cell: 2 }
			],
			categories: [{ label: "Claimant count" }]
		};
		const areas = [{ properties: { areacd: "E00000001", areanm: "Area One" } }];
		// Rows deliberately out of order: Percent (cell 2) before Value (cell 1)
		const csv = [
			"GEOGRAPHY_CODE,DATE,MEASURE,MEASURE_NAME,MEASURES,OBS_VALUE",
			"E00000001,2026-09,2,Rate,20100,4.5",
			"E00000001,2026-09,1,Count,20100,320"
		].join("\n");

		expect([...parseData(table, areas, csv)]).toEqual([
			{
				areacd: "E00000001",
				areanm: "Area One",
				date: "2026-09",
				category: "Claimant count",
				measure: "Value",
				value: 320
			},
			{
				areacd: "E00000001",
				areanm: "Area One",
				date: "2026-09",
				category: "Claimant count",
				measure: "Percent",
				value: 4.5
			}
		]);
	});
});

describe("isNomisCsv", () => {
	it("accepts a CSV with the Nomis header row, quoted or not", () => {
		expect(isNomisCsv("GEOGRAPHY_CODE,DATE,OBS_VALUE\nE1,2021,5")).toBe(true);
		expect(isNomisCsv('"GEOGRAPHY_CODE","DATE","OBS_VALUE"')).toBe(true);
	});

	it("rejects error pages and empty values", () => {
		expect(isNomisCsv("<html><body>Error</body></html>")).toBe(false);
		expect(isNomisCsv("")).toBe(false);
		expect(isNomisCsv(undefined)).toBe(false);
	});
});

describe("getData", () => {
	function makeTable() {
		return {
			tableCode: "NM_999_1",
			cellCode: null,
			categories: [{ label: "Total" }],
			dates: ["2021"],
			measures: [
				{ label: "Value", cell: 20100 },
				{ label: "Percent", cell: null }
			],
			geography: "oa21"
		};
	}

	function makeAreas() {
		return [
			{ properties: { areacd: "E00000001", areanm: "Area One", oa21cds: ["E00000001"] } }
		];
	}

	beforeEach(() => {
		vi.resetAllMocks();
		get.mockResolvedValue(undefined); // no cached data by default
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("returns null when no table is given", async () => {
		expect(await getData(null, makeAreas())).toBeNull();
	});

	it("returns null when no areas are given", async () => {
		expect(await getData(makeTable(), [])).toBeNull();
	});

	it("fetches, parses and adds calculated percentages when Nomis can't provide them", async () => {
		const csv = "GEOGRAPHY_CODE,DATE,MEASURES,OBS_VALUE\nE00000001,2021,20100,500";
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(csv) });
		vi.stubGlobal("fetch", fetchMock);

		const table = makeTable();
		const result = await getData(table, makeAreas());

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(result.meta).toBe(table);
		expect(result.data).toEqual([
			{
				areacd: "E00000001",
				areanm: "Area One",
				date: "2021",
				category: "Total",
				measure: "Value",
				value: 500
			},
			{
				areacd: "E00000001",
				areanm: "Area One",
				date: "2021",
				category: "Total",
				measure: "Percent",
				value: 100
			}
		]);
	});

	it("returns cached data without calling fetch when the request URL was already cached", async () => {
		const table = makeTable();
		const areas = makeAreas();
		const csv = "GEOGRAPHY_CODE,DATE,MEASURES,OBS_VALUE\nE00000001,2021,20100,500";
		const [url] = makeUrls(table, fillAreaCodes(areas));

		get.mockResolvedValue(new Map([[url, csv]]));

		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		const result = await getData(table, areas);

		expect(fetchMock).not.toHaveBeenCalled();
		expect(result.data).toEqual([
			{
				areacd: "E00000001",
				areanm: "Area One",
				date: "2021",
				category: "Total",
				measure: "Value",
				value: 500
			},
			{
				areacd: "E00000001",
				areanm: "Area One",
				date: "2021",
				category: "Total",
				measure: "Percent",
				value: 100
			}
		]);
	});

	it("labels rows for an unnamed area with the default area name", async () => {
		const csv = "GEOGRAPHY_CODE,DATE,MEASURES,OBS_VALUE\nE00000001,2021,20100,500";
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(csv) })
		);
		const areas = [{ properties: { areacd: "E00000001", oa21cds: ["E00000001"] } }];

		const result = await getData(makeTable(), areas);

		expect(result.data.map((d) => d.areanm)).toEqual(["Unnamed Area", "Unnamed Area"]);
	});

	it("returns an error and caches nothing when Nomis returns an HTTP error", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve("Error") });
		vi.stubGlobal("fetch", fetchMock);
		vi.spyOn(console, "warn").mockImplementation(() => {});

		const result = await getData(makeTable(), makeAreas());

		expect(result.message).toBe("Could not load data");
		expect(update).not.toHaveBeenCalled();
	});

	it("fetches again when the cached response is not a valid Nomis CSV", async () => {
		const table = makeTable();
		const areas = makeAreas();
		const [url] = makeUrls(table, fillAreaCodes(areas));
		get.mockResolvedValue(new Map([[url, "<html>Service unavailable</html>"]]));
		const csv = "GEOGRAPHY_CODE,DATE,MEASURES,OBS_VALUE\nE00000001,2021,20100,500";
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(csv) });
		vi.stubGlobal("fetch", fetchMock);

		const result = await getData(table, areas);

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(result.data[0].value).toBe(500);
	});

	it("returns an error message when the Nomis request fails", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
		vi.spyOn(console, "warn").mockImplementation(() => {});

		const table = makeTable();
		const result = await getData(table, makeAreas());

		expect(result).toEqual({ meta: table, data: [], message: "Could not load data" });
	});
});
