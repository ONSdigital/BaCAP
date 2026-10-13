import fs from "node:fs";
import { csvParse, autoType } from "d3-dsv";
import { compressData } from "compress-csv-to-json";

const parse = (path) =>
	csvParse(fs.readFileSync(path, { encoding: "utf8", flag: "r" }).replace(/\uFEFF/, ""), autoType);

const input = (filename) => `./raw_data/${filename}.csv`;
const output = (filename) => `./static/data/${filename}.json`;

const oaData = parse(input("oa21-data"));
const lsoaData = parse(input("lsoa21-data"));
const placesList = parse(input("places-list"));

const lsoaColumnTypes = [
	{ key: "lsoa21cd", colType: "string" },
	{ key: "lng", colType: 10_000 },
	{ key: "lat", colType: 10_000 }
];
const oaColumnTypes = [
	{ key: "oa21cd", colType: "string" },
	{ key: "lsoa21cd", colType: "interned_string" },
	{ key: "msoa21cd", colType: "interned_string" },
	{ key: "ltla21cd", colType: "interned_string" },
	{ key: "rgn21cd", colType: "interned_string" },
	{ key: "lng", colType: 10_000 },
	{ key: "lat", colType: 10_000 },
	{ key: "population", colType: 1 }
];
const placesColumnTypes = [
	{ key: "areacd", colType: "string" },
	{ key: "areanm", colType: "string" },
	{ key: "parentcd", colType: "string" }
];

const oaCompressed = compressData(oaData, oaColumnTypes);
const lsoaCompressed = compressData(lsoaData, lsoaColumnTypes);
const placesCompressed = compressData(placesList, placesColumnTypes);

fs.writeFileSync(output("oa21-data"), JSON.stringify(oaCompressed));
console.log(`Wrote ${output("oa21-lookup")}`);
fs.writeFileSync(output("lsoa21-centroids"), JSON.stringify(lsoaCompressed));
console.log(`Wrote ${output("lsoa21-lookup")}`);
fs.writeFileSync(output("places-list"), JSON.stringify(placesCompressed));
console.log(`Wrote ${output("places-list")}`);
