import { resolve } from "$app/paths";
import { csvFormat, csvFormatRows, csvFormatBody } from "d3-dsv";
import accessibleXLSX from "@onsvisual/accessible-xlsx";
import { get, set, update } from "./db.js";
import { decompressData } from "compress-csv-to-json";
import { initialState, geotypesLookup } from "./config.js";
import { getName, makeFilename } from "./geo.svelte.js";
import { makeDateFormatter } from "./data-utils.js";

async function loadData(key, path, forceRefresh = false, decompressFn = null) {
	const val = !forceRefresh ? await get(key) : null;
	if (val) return val;

	const rawData = await (await fetch(resolve(path))).json();
	const data = decompressFn ? decompressData(rawData, decompressFn) : rawData;
	await set(key, data);
	return data;
}

export async function getAreasList(forceRefresh = false) {
	const fn = (d, i) => ({
		areacd: d[0][i],
		areanm: d[1][i],
		parentcd: d[2][i]
	});
	const data = await loadData("areasList", "/data/places-list.json", forceRefresh, fn);
	const lookup = Object.fromEntries(data.map((d) => [d.areacd, d]));
	for (const d of data) {
		const type = geotypesLookup[d.areacd.slice(0, 3)] || null;
		const parent = lookup[d.parentcd]?.areanm;
		d.group = parent ? `${type} in ${parent}` : type;
	}
	return data;
}

export async function getBestFits(forceRefresh) {
	const key = "bestFits";
	const path = "/data/bestfit-lookup.json";
	return await loadData(key, path, forceRefresh);
}

export async function getChildLookup(forceRefresh) {
	const key = "childLookup";
	const path = "/data/rgn-cauth-children.json";
	return await loadData(key, path, forceRefresh);
}

export async function getOAdata(forceRefresh) {
	const fn = (d, i) => ({
		oa21cd: d[0][i],
		lsoa21cd: d[1][i],
		msoa21cd: d[2][i],
		ltla21cd: d[3][i],
		rgn21cd: d[4][i],
		lng: d[5][i],
		lat: d[6][i],
		population: d[7][i]
	});
	return await loadData("oaData", "/data/oa21-data.json", forceRefresh, fn);
}

export async function getLSOAcentroids(forceRefresh) {
	const fn = (d, i) => ({
		lsoa21cd: d[0][i],
		lng: d[1][i],
		lat: d[2][i]
	});
	return await loadData("lsoaCentroids", "/data/lsoa21-centroids.json", forceRefresh, fn);
}

export async function getStoredAppVersion() {
	const version = await get("appVersion");
	return version || null;
}

export function sleep(ms = 0) {
	return new Promise((resolve) => setInterval(() => resolve(), ms));
}

export function slugify(str) {
	return str.toLowerCase().replaceAll(" ", "-");
}

export function round(num, precision = 0) {
	const multiplier = Math.pow(10, precision);
	return Math.round(num * multiplier) / multiplier;
}

// Recursive function to round numbers in a multi-array (used to round coordinates)
export function roundAll(arr, decimals) {
	let newarr = [];
	arr.forEach((d) => {
		if (typeof d == "number") {
			newarr.push(round(d, decimals));
		} else if (Array.isArray(d)) {
			newarr.push(roundAll(d, decimals));
		} else {
			newarr.push(d);
		}
	});
	return newarr;
}

export function groupData(data, key) {
	let dataIndexed = {};
	for (const d of data) {
		if (!dataIndexed[d[key]]) {
			dataIndexed[d[key]] = {
				label: d[key],
				values: []
			};
		}
		dataIndexed[d[key]].values.push(d);
	}
	return Object.values(dataIndexed);
}

export function download(blob, filename) {
	let url = window.URL || window.webkitURL || window;
	let link = url.createObjectURL(blob);
	let a = document.createElement("a");

	a.download = filename;
	a.href = link;
	document.body.appendChild(a);

	a.click();
	document.body.removeChild(a);
}

export async function clip(str) {
	return await navigator.clipboard.writeText(str);
}

function formatTable(table, name, compName) {
	const dateFormat = makeDateFormatter(table.meta.dateFormat);
	const rows = {};

	for (const d of table.data) {
		const rowId = `${d.category}_${d.date}`;
		if (!rows[rowId])
			rows[rowId] = {
				Variable: table.meta.label,
				Category: d.category,
				"Time period": dateFormat(d.date),
				[`${name} (value)`]: null,
				...(compName ? { [`${compName} (value)`]: null } : {}),
				[`${name} (%)`]: null,
				...(compName ? { [`${compName} (%)`]: null } : {}),
				Unit:
					table.meta.unit === "%" ? table.meta.base.replace("all ", "") : table.meta.unit,
				"Base population": table.meta.base,
				Source: table.meta.source,
				Geography: table.meta.geography === "lsoa21" ? "LSOA" : "Output Area"
			};
		const col = `${d.areanm} (${d.measure === "Value" ? "value" : "%"})`;
		rows[rowId][col] = d.value;
	}

	return Object.values(rows);
}

const dateLocaleOptions = { year: "numeric", month: "short", day: "numeric" };

export async function downloadProfileXLSX(tables, activeArea, comparisonArea) {
	const name = getName(activeArea);
	const compName = comparisonArea ? getName(comparisonArea) : null;

	const data = tables.map((tab) => formatTable(tab, name, compName)).flat();

	const sheetData = {
		sheetName: `Custom area profile data for ${name}`,
		sheetIntroText: [
			"Source: Office for National Statistics",
			`Data generated by the ONS Build a Custom Area Profile tool on ${new Date().toLocaleDateString(
				"en-GB",
				dateLocaleOptions
			)}`,
			"The data in this profile are aggregated from small areas on a best-fit basis, and therefore may differ slightly from other sources."
		],
		columns: Object.keys(data[0]).map((key) => ({
			key,
			heading: key,
			style:
				key.endsWith("(%)") === "percent"
					? "number_1dp"
					: key.endsWith("(value)")
						? "number_with_commas"
						: "text"
		})),
		rows: data
	};
	const xlsx = await accessibleXLSX(sheetData);
	const blob = new Blob([xlsx], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	});
	download(blob, makeFilename(activeArea, "xlsx"));
}

export function downloadProfileCSV(tables, activeArea, comparisonArea) {
	const name = getName(activeArea);
	const compName = comparisonArea ? getName(comparisonArea) : null;

	const data = tables.map((tab) => formatTable(tab, name, compName)).flat();
	const csv = csvFormat(data);
	const blob = new Blob([csv], { type: "text/csv" });
	download(blob, makeFilename(activeArea, "csv"));
}

export async function downloadDatasetXLSX(table, data, columns) {
	const sheetData = {
		sheetName: table.label,
		sheetIntroText: [
			table.summary,
			`Source: ${table.source}`,
			`Data generated by the ONS Build a Custom Area Profile tool on ${new Date().toLocaleDateString(
				"en-GB",
				dateLocaleOptions
			)}`,
			"The data in this profile are aggregated from small areas on a best-fit basis, and therefore may differ slightly from other sources."
		],
		columns: columns.map((d) => ({
			key: d.key,
			heading: d.label,
			style: d.key === "percent" ? "number_1dp" : d.numeric ? "number_with_commas" : "text"
		})),
		rows: data
	};
	const xlsx = await accessibleXLSX(sheetData);
	const blob = new Blob([xlsx], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	});
	download(blob, `${slugify(table.label)}.xlsx`);
}

export function downloadDatasetCSV(table, data, columns) {
	const csv =
		csvFormatRows([columns.map((d) => d.label)]) +
		"\n" +
		csvFormatBody(
			data,
			columns.map((d) => d.key)
		);
	const blob = new Blob([csv], { type: "text/csv" });
	download(blob, `${slugify(table.label)}.csv`);
}
