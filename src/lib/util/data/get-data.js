import { csvParse } from "d3-dsv";
import { get, set, update } from "../state/index.js";
import { ascending, round } from "../common/index.js";

const maxRequestLength = 15_700;
const maxResponseCells = 25_000;

function makeCells(categories) {
	return categories
		.map((cat) =>
			cat.cells.length > 1 ? `MAKE|${cat.label}|${cat.cells.join(";")}` : cat.cells[0]
		)
		.join(",");
}

function filterMeasures(measures) {
	return measures.filter((m) => m.cell);
}

function makeUrlFn(table) {
	const base = `https://www.nomisweb.co.uk/api/v01/dataset/${table.tableCode}.data.csv?`;

	const params = {
		date: table.dates,
		...(table.cellCode ? { [table.cellCode]: makeCells(table.categories) } : {}),
		measures: filterMeasures(table.measures).map((d) => d.cell),
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

function getMaxAreaCodes(table) {
	const maxGeoDimSize = Math.floor(
		maxResponseCells /
			(table.categories.length * table.dates.length * filterMeasures(table.measures).length)
	);
	console.log({ maxGeoDimSize });
	return maxGeoDimSize;
}

// Adds unique area codes for non-GSS geographies
function fillAreaCodes(areas) {
	let i = 1;
	for (const area of areas) {
		if (!area.properties?.areacd) {
			area.properties.areacd = "X" + String(i).padStart(8, "0");
			i++;
		}
	}
	return areas;
}

function makeGeo(area, codes, i) {
	const areacd = area?.properties?.areacd || null;
	if (codes[0] === areacd) return areacd;
	return `MAKE|${area.properties.areacd}|${codes.join(";")}`;
}

// Chunks a request into URLs that will not exceed Nomis limits
function makeUrls(table, areas) {
	const urlFn = makeUrlFn(table);
	const geoKey = `${table.geography}cds`;
	const maxAreaCodes = getMaxAreaCodes(table);

	let codesLength = 0;
	let geosLength = 0;
	let geos = [];
	const urls = [];

	console.log({ areas });

	for (let i = 0; i < areas.length; i++) {
		const area = areas[i];
		const codes = [...(area?.properties?.[geoKey] || [])];
		if (!codes.length) continue; // Skip geographies too small for a best-fit

		const geo = makeGeo(area, codes, i);
		if (
			codesLength + codes.length > maxAreaCodes ||
			urlFn.length + geosLength + geo.length >= maxRequestLength
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
	console.log({ urls });
	return urls;
}

function makeCategoryLookup(categories) {
	const lookup = {};
	for (const cat of categories) {
		// NOTE: Nomis removes colons from custom field names
		if (cat.cells.length > 1) lookup[cat.label.replaceAll(":", "")] = cat.label;
		else lookup[cat.cells[0]] = cat.label;
	}
	return lookup;
}

function makeRowParser(table, areas) {
	const categoryLookup = table.categories[0].cells ? makeCategoryLookup(table.categories) : null;
	const measureLookup = Object.fromEntries(
		filterMeasures(table.measures).map((d) => [d.cell, d.label])
	);
	const nameLookup = Object.fromEntries(
		areas.map((d) => [d.properties.areacd, d.properties.areanm])
	);
	const categoryCol = table.cellCode?.toUpperCase?.();
	const categoryNameCol = categoryCol + "_NAME";
	const getCategory = categoryLookup
		? (d) => categoryLookup[d[categoryCol]] || categoryLookup[d[categoryNameCol]]
		: () => table.categories[0].label;
	return (d) => ({
		areacd: d.GEOGRAPHY_CODE,
		areanm: nameLookup[d.GEOGRAPHY_CODE],
		date: d.DATE,
		category: getCategory(d),
		measure: measureLookup[d.MEASURES],
		value: +d.OBS_VALUE
	});
}

function makeRowSorter(table, areas) {
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

function parseData(table, areas, csvString) {
	const rowParser = makeRowParser(table, areas);
	const rowSorter = makeRowSorter(table, areas);
	return csvParse(csvString, rowParser).sort(rowSorter);
}

function calcPercentages(data) {
	const indexed = {};
	for (const d of data) {
		const key = `${d.areanm}_${d.date}`;
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
	const cache = await get("cachedData");
	if (!cache) await set("cachedData", new Map());

	update("cachedData", (map) => {
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

export default async function getData(table, areas) {
	if (!table || !areas[0]) return null;

	let data = [];
	areas = fillAreaCodes(areas);
	const urls = makeUrls(table, areas);

	for (const url of urls) {
		const raw = await getCache(url);
		if (raw) data.push(...parseData(table, areas, raw));
		else {
			try {
				const raw = await (await fetch(url)).text();
				setCache(url, raw);
				data.push(...parseData(table, areas, raw));
			} catch (err) {
				// Handle error if Nomis is unavailable
				console.warn(err);
				return { message: "Could not load data" };
			}
		}
	}
	// Calculate percentages if they cannot be provided by Nomis
	const percentMeasure = table.measures.find((d) => d.label === "Percent");
	if (percentMeasure && !percentMeasure.cell) data = calcPercentages(data);

	console.debug({ meta: table, data });
	return { meta: table, data };
}
