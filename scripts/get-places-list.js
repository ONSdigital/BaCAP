import { writeFileSync } from "node:fs";

const url =
	"https://raw.githubusercontent.com/ONSdigital/geo-scripts/refs/heads/main/output/lists/cp_places.csv";
const path = "./raw_data/places-list.csv";
const csvString = await (await fetch(url)).text();

writeFileSync(path, csvString, { encoding: "utf8" });
console.log(`Wrote ${path}`);
