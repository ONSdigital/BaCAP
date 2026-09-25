import { readFileSync, writeFileSync } from "node:fs";
import { csvParse } from "d3-dsv";

const types = ["E06", "E07", "E08", "E09", "E10"];
const parent_types = ["E12", "E47"];

const lookup_url =
	"https://raw.githubusercontent.com/ONSdigital/geo-scripts/refs/heads/main/input/lookups/lookup.csv";

console.log("Loading area lookup from Github...");
const lookup_data = csvParse(await (await fetch(lookup_url)).text());
const lookup = Object.fromEntries(lookup_data.map((d) => [d.areacd, d]));
const child_cds = lookup_data
	.filter((d) => types.includes(d.areacd.slice(0, 3)) && !d.end)
	.map((d) => d.areacd);

const path = "./static/data/rgn-cauth-children.json";
const children = {};

for (const cd of child_cds) {
	let parent_cd = lookup[cd]?.parentcd;
	while (parent_cd) {
		if (parent_types.includes(parent_cd.slice(0, 3))) {
			if (!children[parent_cd]) children[parent_cd] = [];
			children[parent_cd].push(cd);
		}
		parent_cd = lookup[parent_cd]?.parentcd;
	}
}

writeFileSync(path, JSON.stringify(children));
console.log(`Wrote ${path}`);
