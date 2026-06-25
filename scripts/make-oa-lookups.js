import { writeFileSync } from "node:fs";
import { geogroups } from "../src/lib/config.js";

const keys = ["oa", "lsoa"];
const codes = geogroups
	.slice(1)
	.map((d) => d.codes)
	.flat();
const url = (key) =>
	`https://raw.githubusercontent.com/ONSdigital/geo-scripts/refs/heads/main/input/lookups/lookup_bestfit_${key}21.json`;

const data = {};

console.log("Fetching OA and LSOA best-fit lookups from Github");
for (const key of keys) {
	data[key] = Object.entries(await (await fetch(url(key))).json());
}

const path = `./static/data/bestfit-lookup.json`;
const lookup = {};
for (const key of keys) {
	const _data = data[key].filter((d) => codes.includes(d[0].slice(0, 3)));
	for (const d of _data) {
		if (!lookup[d[0]]) lookup[d[0]] = {};
		lookup[d[0]][key] = d[1];
	}
}
for (const cd of Object.keys(lookup)) {
	if ([...lookup[cd].oa, ...lookup[cd].lsoa].every((d) => d === cd)) delete lookup[cd];
	else
		lookup[cd] = lookup[cd].oa.every((d) => lookup[cd].lsoa.includes(d))
			? [lookup[cd].oa]
			: [lookup[cd].oa, lookup[cd].lsoa];
}
writeFileSync(path, JSON.stringify(lookup));
console.log(`Wrote ${path}`);
