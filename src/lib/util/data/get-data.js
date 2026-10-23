import { csvParse } from "d3-dsv";
import { get, update } from "../state/index.js";
import { ascending, round } from "../common/index.js";
import { defaultAreaName } from "../../config/index.js";

const maxRequestLength = 15_700;
const maxResponseCells = 25_000;
const fetchTimeout = 30_000; // Milliseconds before a Nomis request is abandoned

export function makeCells(categories) {
	return categories
		.map((cat) =>
			cat.cells.length > 1 ? `MAKE|${cat.label}|${cat.cells.join(";")}` : cat.cells[0]
		)
		.join(",");
}

export function filterMeasures(measures) {
	return measures.filter((m) => m.cell);
}

export function makeUrlFn(table) {
	const base = `https://www.nomisweb.co.uk/api/v01/dataset/${table.tableCode}.data.csv?`;

	const params = {
		date: table.dates,
		// A handful of Nomis tables (eg. claimant count) have no real Value/Percent measures
		// split, and instead distinguish them via their own "measure" cellCode dimension.
		// `measuresCell` flags this: the cellCode cells come from `measures`, not `categories`,
		// and the real Nomis measures param is fixed rather than derived from `measures`.
		...(table.cellCode
			? {
					[table.cellCode]: table.measuresCell
						? table.measures.map((d) => d.cell).join(",")
						: makeCells(table.categories)
				}
			: {}),
		measures: table.measuresCell
			? [table.measuresCell]
			: filterMeasures(table.measures).map((d) => d.cell),
		select: [
			"geography_code",
			"date",
			...(table.cellCode ? [table.cellCode] : []),
			...(table.cellCode ? [`${table.cellCode}_name`] : []),
			"measures",
			"obs_value"
		],
		...(table.miscParams || {})
	};
	const url =
		base +
		Object.entries(params)
			.map((p) => `${p[0]}=${[p[1]].flat().join(",")}`)
			.join("&") +
		"&geography=";
	return { make: (areas) => url + areas.join(","), length: url.length };
}

export function getMaxAreaCodes(table) {
	const maxGeoDimSize = Math.floor(
		maxResponseCells /
			(table.categories.length * table.dates.length * filterMeasures(table.measures).length)
	);
	console.debug({ maxGeoDimSize });
	return maxGeoDimSize;
}

// Gives a unique placeholder code to areas without one (eg. drawn areas), or whose code is already
// used by another area (eg. the same area selected twice). Returns copies, so the areas held in app
// state are never changed.
export function fillAreaCodes(areas) {
	const used = new Set();
	let i = 1;
	return areas.map((area) => {
		const areacd = area?.properties?.areacd;
		if (areacd && !used.has(areacd)) {
			used.add(areacd);
			return area;
		}
		let code;
		do code = "X" + String(i++).padStart(8, "0");
		while (used.has(code) || areas.some((d) => d?.properties?.areacd === code));
		used.add(code);
		return { ...area, properties: { ...area?.properties, areacd: code } };
	});
}

export function makeGeo(area, codes, i) {
	const areacd = area?.properties?.areacd || null;
	if (codes[0] === areacd) return areacd;
	return `MAKE|${area.properties.areacd}|${codes.join(";")}`;
}

// Chunks a request into URLs that will not exceed Nomis limits
export function makeUrls(table, areas) {
	const urlFn = makeUrlFn(table);
	const geoKey = `${table.geography}cds`;
	const maxAreaCodes = getMaxAreaCodes(table);

	let codesLength = 0;
	let geosLength = 0;
	let geos = [];
	const urls = [];

	console.debug({ areas });

	for (let i = 0; i < areas.length; i++) {
		const area = areas[i];
		const codes = [...(area?.properties?.[geoKey] || [])];
		if (!codes.length) continue; // Skip geographies too small for a best-fit

		const geo = makeGeo(area, codes, i);
		// Start a new URL if this area would exceed a limit. Never send a URL without areas, as Nomis
		// then returns its default geography instead of an error.
		if (
			geos.length &&
			(codesLength + codes.length > maxAreaCodes ||
				urlFn.length + geosLength + geo.length >= maxRequestLength)
		) {
			urls.push(urlFn.make(geos));
			codesLength = 0;
			geosLength = 0;
			geos = [];
		}
		geos.push(geo);
		codesLength += codes.length;
		geosLength += geo.length + 1;
	}
	if (geos.length) urls.push(urlFn.make(geos));
	console.debug({ urls });
	return urls;
}

export function makeCategoryLookup(categories) {
	const lookup = {};
	for (const cat of categories) {
		// NOTE: Nomis removes colons from custom field names
		if (cat.cells.length > 1) lookup[cat.label.replaceAll(":", "")] = cat.label;
		else lookup[cat.cells[0]] = cat.label;
	}
	return lookup;
}

export function makeRowParser(table, areas) {
	const categoryLookup = table.categories[0].cells ? makeCategoryLookup(table.categories) : null;
	const measureLookup = Object.fromEntries(
		filterMeasures(table.measures).map((d) => [d.cell, d.label])
	);
	const nameLookup = Object.fromEntries(
		// Unnamed areas get the same default name as getName(), so exported columns line up
		areas.map((d) => [d.properties.areacd, d.properties.areanm || defaultAreaName])
	);
	const categoryCol = table.cellCode?.toUpperCase?.();
	const categoryNameCol = categoryCol + "_NAME";
	const getCategory = categoryLookup
		? (d) => categoryLookup[d[categoryCol]] || categoryLookup[d[categoryNameCol]]
		: () => table.categories[0].label;
	// See the note on `measuresCell` in makeUrlFn: when set, the measure label comes from the
	// cellCode column rather than Nomis's own (fixed) measures column.
	const getMeasure = table.measuresCell
		? (d) => measureLookup[d[categoryCol]]
		: (d) => measureLookup[d.MEASURES];
	return (d) => ({
		areacd: d.GEOGRAPHY_CODE,
		areanm: nameLookup[d.GEOGRAPHY_CODE],
		date: d.DATE,
		category: getCategory(d),
		measure: getMeasure(d),
		value: +d.OBS_VALUE
	});
}

export function makeRowSorter(table, areas) {
	// Force categories and areas to match the requested order
	const catLookup = Object.fromEntries(table.categories.map((d, i) => [d.label, i]));
	const catSorter = (a, b) => catLookup[a] - catLookup[b];
	const areaLookup = Object.fromEntries(areas.map((d, i) => [d.properties.areacd, i]));
	const areaSorter = (a, b) => areaLookup[a] - areaLookup[b];
	const measureLookup = Object.fromEntries(table.measures.map((d, i) => [d.label, i]));
	const measureSorter = (a, b) => measureLookup[a] - measureLookup[b];

	return (a, b) =>
		areaSorter(a.areacd, b.areacd) ||
		ascending(a.date, b.date) ||
		catSorter(a.category, b.category) ||
		measureSorter(a.measure, b.measure);
}

export function parseData(table, areas, csvString) {
	const rowParser = makeRowParser(table, areas);
	const rowSorter = makeRowSorter(table, areas);
	return csvParse(csvString, rowParser).sort(rowSorter);
}

export function calcPercentages(data) {
	const indexed = {};
	for (const d of data) {
		const key = `${d.areacd}_${d.date}`;
		if (!indexed[key]) indexed[key] = { rows: [], total: 0 };
		indexed[key].rows.push(d);
		indexed[key].total += d.value;
	}
	const newData = [];
	for (const group of Object.values(indexed)) {
		for (const row of group.rows) {
			const newRow = { ...row };
			newRow.measure = "Percent";
			newRow.value = round(100 * (row.value / group.total), 1);
			newData.push(row, newRow);
		}
	}
	return newData;
}

const maxCacheSize = 1000; // Number of cached URLs stored in local IndexedDB
async function setCache(key, val) {
	await update("cachedData", (map = new Map()) => {
		map.set(key, val);
		if (map.size > maxCacheSize) {
			const firstKey = map.keys().next().value;
			map.delete(firstKey);
		}
		return map;
	});
}

async function getCache(key) {
	const cache = await get("cachedData");
	return cache?.get?.(key);
}

// Checks for the header row of a Nomis CSV, so error pages are never parsed or cached as data
export function isNomisCsv(str) {
	if (typeof str !== "string") return false;
	const end = str.indexOf("\n");
	const header = end === -1 ? str : str.slice(0, end);
	return header.includes("GEOGRAPHY_CODE") && header.includes("OBS_VALUE");
}

async function fetchCsv(url) {
	const res = await fetch(url, { signal: AbortSignal.timeout(fetchTimeout) });
	if (!res.ok) throw new Error(`Nomis request failed with HTTP ${res.status}`);
	const csv = await res.text();
	if (!isNomisCsv(csv)) throw new Error("Nomis response is not a valid CSV");
	return csv;
}

export default async function getData(table, areas) {
	if (!table || !areas[0]) return null;

	let data = [];
	areas = fillAreaCodes(areas);
	const urls = makeUrls(table, areas);

	for (const url of urls) {
		try {
			let raw = await getCache(url);
			if (!isNomisCsv(raw)) {
				raw = await fetchCsv(url);
				setCache(url, raw);
			}
			data.push(...parseData(table, areas, raw));
		} catch (err) {
			// Handle error if Nomis is unavailable, times out or returns unreadable data
			console.warn(err);
			return { meta: table, data: [], message: "Could not load data" };
		}
	}
	// Calculate percentages if they cannot be provided by Nomis
	const percentMeasure = table.measures.find((d) => d.label === "Percent");
	if (percentMeasure && !percentMeasure.cell) data = calcPercentages(data);

	console.debug({ meta: table, data });
	return { meta: table, data };
}
