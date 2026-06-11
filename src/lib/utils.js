import { resolve } from "$app/paths";
import { get, set, update } from "./db.js";
import { decompressData } from "compress-csv-to-json";
import { initialState, geotypesLookup } from "./config.js";

async function loadCompressedData(key, path, fn) {
	const val = await get(key);
	if (val) return val;

	const rawData = await (await fetch(resolve(path))).json();
	const data = decompressData(rawData, fn);
	await set(key, data);
	return data;
}

export async function getAreasList() {
	const fn = (d, i) => ({
		areacd: d[0][i],
		areanm: d[1][i],
		parentcd: d[2][i]
	});
	const data = await loadCompressedData("areasList", "/data/places-list.json", fn);
	const lookup = Object.fromEntries(data.map((d) => [d.areacd, d]));
	for (const d of data) {
		const type = geotypesLookup[d.areacd.slice(0, 3)] || null;
		const parent = lookup[d.parentcd]?.areanm;
		d.group = parent ? `${type} in ${parent}` : type;
	}
	return data;
}

export async function getOAdata() {
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
	return await loadCompressedData("oaData", "/data/oa21-data.json", fn);
}

export async function getLSOAcentroids() {
	const fn = (d, i) => ({
		lsoa21cd: d[0][i],
		lng: d[1][i],
		lat: d[2][i]
	});
	return await loadCompressedData("lsoaCentroids", "/data/lsoa21-centroids.json", fn);
}

export function sleep(ms = 0) {
	return new Promise((resolve) => setInterval(() => resolve(), ms));
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
	let keys = [];
	for (const d of data) {
		if (!dataIndexed[d[key]]) {
			dataIndexed[d[key]] = {
				label: d[key],
				values: []
			};
			keys.push(d[key]);
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
