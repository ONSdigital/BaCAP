import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { csvParse, csvFormat } from "d3-dsv";
import { round } from "../src/lib/util/common/index.js";

// Precision chosen for ~1m accuracy: at UK latitudes, 5 decimal places is
// ~1.1m in latitude and ~0.7m in longitude. 4dp (the previous precision) is
// ~11m/~7m; 6dp would be ~0.1m, well beyond what's needed here.
const coordPrecision = 5;

const recordLimit = 25_000; // Nomis's cell limit for unauthenticated requests

// Frozen OA -> LSOA -> MSOA -> LTLA -> RGN lookup (LTLA/RGN pinned to the 2022
// vintage). Deliberately NOT the live geo-scripts lookup.csv: Nomis's
// geographies lag local government reorganisations by months/years, so using
// current-day LTLA/RGN codes here would produce area codes Nomis doesn't
// recognise yet.
const hierarchyUrl =
	"https://github.com/ONSdigital/geo-source-files/releases/download/lookups/oa21_lsoa21_msoa21_ltla22_rgn22.csv";

const sources = {
	oa: {
		centroidsUrl:
			"https://github.com/ONSdigital/geo-source-files/releases/download/oa-2021/oa21_pwc.json.gz",
		nomisGeography: "TYPE150",
		output: "./raw_data/oa21-data.csv"
	},
	lsoa: {
		centroidsUrl:
			"https://github.com/ONSdigital/geo-source-files/releases/download/lsoa-2021/lsoa21_pwc.json.gz",
		nomisGeography: "TYPE151",
		output: "./raw_data/lsoa21-data.csv"
	}
};

async function fetchHierarchy() {
	console.log(`Fetching frozen OA/LSOA/MSOA/LTLA/RGN hierarchy from ${hierarchyUrl}...`);
	const csv = await (await fetch(hierarchyUrl)).text();
	const rows = csvParse(csv);

	const byOa = {};
	const byLsoa = {};
	for (const row of rows) {
		const entry = { msoa21cd: row.msoa21cd, ltla21cd: row.ltla22cd, rgn21cd: row.rgn22cd };
		byOa[row.oa21cd] = { lsoa21cd: row.lsoa21cd, ...entry };
		byLsoa[row.lsoa21cd] = entry;
	}
	return { oa: byOa, lsoa: byLsoa };
}

async function fetchCentroids(url) {
	console.log(`Fetching centroids from ${url}...`);
	const res = await fetch(url);
	const gzipped = Buffer.from(await res.arrayBuffer());
	const text = gunzipSync(gzipped).toString("utf8");

	const centroids = {};
	for (const line of text.split("\n")) {
		if (!line.trim()) continue;
		const feature = JSON.parse(line);
		const [lng, lat] = feature.geometry.coordinates;
		centroids[feature.properties.areacd] = [
			round(lng, coordPrecision),
			round(lat, coordPrecision)
		];
	}
	return centroids;
}

// Mirrors the cell-encoding logic in src/lib/util/data/get-data.js, kept
// standalone here since that module isn't importable outside the app.
function makeCells(categories) {
	return categories
		.map((cat) =>
			cat.cells.length > 1 ? `MAKE|${cat.label}|${cat.cells.join(";")}` : cat.cells[0]
		)
		.join(",");
}

function makePopulationUrl(topic, nomisGeography) {
	const base = `https://www.nomisweb.co.uk/api/v01/dataset/${topic.tableCode}.data.csv?`;
	const params = {
		date: topic.dates,
		[topic.cellCode]: makeCells(topic.categories),
		measures: topic.measures.filter((m) => m.cell).map((m) => m.cell),
		select: [
			"geography_code",
			"date",
			topic.cellCode,
			`${topic.cellCode}_name`,
			"measures",
			"obs_value"
		],
		...(topic.miscParams || {}),
		geography: nomisGeography
	};
	return (
		base +
		Object.entries(params)
			.map(([key, val]) => `${key}=${[val].flat().join(",")}`)
			.join("&")
	);
}

async function fetchPopulation(topic, nomisGeography) {
	const url = makePopulationUrl(topic, nomisGeography);
	const population = {};
	let offset = 0;

	while (true) {
		console.log(`Fetching population data for ${nomisGeography} (offset ${offset})...`);
		const csv = await (
			await fetch(`${url}&recordlimit=${recordLimit}&recordoffset=${offset}`)
		).text();
		const rows = csvParse(csv);
		if (!rows.length) break;

		for (const row of rows) population[row.GEOGRAPHY_CODE] = +row.OBS_VALUE;

		if (rows.length < recordLimit) break;
		offset += recordLimit;
	}
	return population;
}

async function buildData(key, { centroidsUrl, nomisGeography, output }, topic, hierarchyByCode) {
	const [centroids, population] = await Promise.all([
		fetchCentroids(centroidsUrl),
		fetchPopulation(topic, nomisGeography)
	]);

	const codeKey = `${key}21cd`;
	const rows = [];
	let missingPopulation = 0;
	let missingHierarchy = 0;

	// Sort by code so re-running this script produces a stable row order,
	// keeping future diffs limited to the values that actually changed.
	for (const code of Object.keys(centroids).sort()) {
		const [lng, lat] = centroids[code];
		const hierarchy = hierarchyByCode[code];
		if (!hierarchy) missingHierarchy++;

		const pop = population[code];
		if (pop === undefined) missingPopulation++;

		rows.push({
			[codeKey]: code,
			...hierarchy,
			lng,
			lat,
			population: pop ?? ""
		});
	}

	if (missingHierarchy)
		console.warn(`${missingHierarchy} ${key} codes had no entry in the hierarchy lookup`);
	if (missingPopulation)
		console.warn(`${missingPopulation} ${key} codes had no population figure`);

	writeFileSync(output, csvFormat(rows) + "\n");
	console.log(`Wrote ${output} (${rows.length} rows)`);
}

const topics = JSON.parse(readFileSync("./static/data/topics.json", "utf8"));
const populationTopic = topics[0];
if (populationTopic.key !== "population") {
	throw new Error('Expected the first entry in topics.json to be the "population" dataset');
}

const hierarchy = await fetchHierarchy();
for (const [key, source] of Object.entries(sources)) {
	await buildData(key, source, populationTopic, hierarchy[key]);
}
