import { resolve } from "$app/paths";
import { get, set, update } from "idb-keyval";
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

export async function getAppState() {
	let val = await get("appState");
	if (val) return structuredClone(val);

	return structuredClone(initialState);
}

export async function syncAppState(val) {
	console.log("syncing appState");
	await set("appState", val);
}
