import { csvParse } from "d3-dsv";
import { get, set, update } from "./db.js";

const maxRequestLength = 15_700;
const maxResponseCells = 25_000;

function makeCells(categories) {
	return categories
		.map((cat) =>
			cat.cells.length > 1 ? `MAKE|${cat.label}|${cat.cells.join(";")}` : cat.cells[0]
		)
		.join(",");
}

function makeUrl(table, areas) {
	const base = `https://www.nomisweb.co.uk/api/v01/dataset/${table.tableCode}.data.csv?`;
	const geo = `${table.geography}cds`;

	const params = {
		geography: areas.map(
			(d, i) =>
				`MAKE|${encodeURIComponent(d?.properties?.areanm || `Custom Area ${i}`)}|${[...d?.properties?.[geo]].join(";")}`
		),
		date: table.dates,
		...(table.cellCode ? { [table.cellCode]: makeCells(table.categories) } : {}),
		measures: table.measures.map((d) => d.cell),
		select: [
			"geography_name",
			"date",
			...(table.cellCode ? [table.cellCode] : []),
			...(table.cellCode ? [`${table.cellCode}_name`] : []),
			"measures",
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
		// NOTE: Nomis removes colons from custom field names
		if (cat.cells.length > 1) lookup[cat.label.replaceAll(":", "")] = cat.label;
		else lookup[cat.cells[0]] = cat.label;
	}
	return lookup;
}

function makeRowParser(table) {
	const categoryLookup = table.categories[0].cells ? makeCategoryLookup(table.categories) : null;
	const measureLookup = Object.fromEntries(table.measures.map((d) => [d.cell, d.label]));
	const categoryCol = table.cellCode?.toUpperCase?.();
	const categoryNameCol = categoryCol + "_NAME";
	const getCategory = categoryLookup
		? (d) => categoryLookup[d[categoryCol]] || categoryLookup[d[categoryNameCol]]
		: () => table.categories[0].label;
	return (d) => ({
		areanm: d.GEOGRAPHY_NAME,
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
	const areaLookup = Object.fromEntries(
		areas.map((d, i) => [d?.properties?.areanm || `Custom Areas ${i}`, i])
	);
	const areaSorter = (a, b) => areaLookup[a] - areaLookup[b];

	return (a, b) =>
		areaSorter(a.areanm, b.areanm) ||
		a.date - b.date ||
		catSorter(a.category, b.category) ||
		a.measure.localeCompare(b.measure, "en-GB");
}

function parseData(table, areas, csvString) {
	const rowParser = makeRowParser(table);
	const rowSorter = makeRowSorter(table, areas);
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

function checkRequestValidity(table, areas, url) {
	const length = url.length;
	const geo = `${table.geography}cds`;
	const allCodes = areas.map((d) => d?.properties?.[geo] || []).flat();
	console.log("Request size", {
		url: length,
		geography: allCodes.length,
		categories: table.categories.length,
		dates: table.dates.length,
		measures: table.measures.length
	});

	if (length > maxRequestLength) {
		console.log({ length });
		throw Error(`Request URL longer than ${maxRequestLength.toLocaleString()} character limit`);
	}
	const cells =
		(activeCds.size + comparisonCds.size) *
		table.categories.length *
		table.dates.length *
		table.measures.length;
	if (cells > maxResponseCells) {
		console.log({ cells });
		throw Error(`Request is for more than ${maxResponseCells.toLocaleString()} cell limit`);
	}
	console.log({ length, cells });
}

export default async function getData(table, areas) {
	if (!table || !areas[0]) return null;
	const url = makeUrl(table, areas);
	try {
		checkRequestValidity(table, areas, url);
	} catch (err) {
		console.warn(err);
		// return null;
	}

	let data = await getCache(url);
	if (data) return { meta: table, data: parseData(table, areas, data) };

	try {
		data = await (await fetch(url)).text();
		setCache(url, data);
		return { meta: table, data: parseData(table, areas, data) };
	} catch (err) {
		// May throw error if Nomis is unavailable
		console.warn(err);
		return null;
	}
}
