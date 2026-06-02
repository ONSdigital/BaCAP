import { csvParse } from "d3-dsv";
import { get, set, update } from "idb-keyval";

function makeCells(categories) {
	return categories
		.map((cat) =>
			cat.cells.length > 1 ? `MAKE|${cat.label}|${cat.cells.join(";")}` : cat.cells[0]
		)
		.join(",");
}

function makeUrl(table, activeCds, comparisonCds) {
	const base = `https://www.nomisweb.co.uk/api/v01/dataset/${table.tableCode}.data.csv?`;
	const params = {
		geography: [
			`MAKE|MyCustomArea|${[...activeCds].join(";")}`,
			...(comparisonCds ? [`MAKE|ComparisonArea|${[...comparisonCds].join(";")}`] : [])
		],
		date: table.dates,
		...(table.cellCode ? { [table.cellCode]: makeCells(table.categories) } : {}),
		measures: table.measures,
		select: [
			"geography_name",
			"date_name",
			...(table.cellCode ? [table.cellCode] : []),
			"measures_name",
			"obs_value"
		],
		...(table.miscParams || {})
	};
	return (
		base +
		Object.entries(params)
			.map((p) => `${p[0]}=${[p[1]].flat().join(",")}`)
			.join("&")
	);
}

function makeCategoryLookup(categories) {
	const lookup = {};
	for (const cat of categories) {
		if (cat.cells.length > 1) lookup[cat.label] = cat.label;
		else lookup[cat.cells[0]] = cat.label;
	}
	return lookup;
}

function makeRowParser(table) {
	const lookup = table.categories[0].cells ? makeCategoryLookup(table.categories) : null;
	const getCategory = lookup
		? (d) => lookup[d[table.cellCode.toUpperCase()]]
		: () => table.categories[0].label;
	return (d) => ({
		areanm: d.GEOGRAPHY_NAME,
		date: d.DATE_NAME,
		category: getCategory(d),
		measure: d.MEASURES_NAME,
		value: +d.OBS_VALUE
	});
}

function rowSorter(a, b) {
	return (
		b.areanm.localeCompare(a.areanm, "en-GB") ||
		a.date - b.date ||
		a.category.localeCompare(b.category, "en-GB") ||
		a.measure.localeCompare(b.measure, "en-GB")
	);
}

function parseData(table, csvString) {
	const rowParser = makeRowParser(table);
	return csvParse(csvString, rowParser).sort(rowSorter);
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

export default async function getData(table, activeArea, comparisonArea) {
	if (!table || !activeArea) return null;
	const geo = `${table.geography}cds`;
	const url = makeUrl(table, activeArea.properties[geo], comparisonArea?.properties?.[geo]);

	let data = await getCache(url);
	if (data) return { meta: table, data: parseData(table, data) };

	try {
		data = await (await fetch(url)).text();
		setCache(url, data);
		return { meta: table, data: parseData(table, data) };
	} catch (err) {
		// May throw error if Nomis is unavailable
		console.warn(err);
		return null;
	}
}
