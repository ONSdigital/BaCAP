import KDBush from "kdbush";
import bbox from "@turf/bbox";
import inPolygon from "@turf/boolean-point-in-polygon";
import { geogroups, geolevelsLookup } from "$lib/config/index.js";

function makeFeatureCollection(data, key, includePopulation = true) {
	return {
		type: "FeatureCollection",
		features: data.map((d) => ({
			type: "Feature",
			properties: {
				areacd: d[key],
				...(includePopulation ? { population: d.population || 0 } : {})
			},
			geometry: { type: "Point", coordinates: [d.lng, d.lat] }
		}))
	};
}

// Builds a static spatial index over a FeatureCollection's points, for fast bounding-box queries
function makeIndex(features) {
	const index = new KDBush(features.length);
	for (const ft of features) index.add(ft.geometry.coordinates[0], ft.geometry.coordinates[1]);
	index.finish();
	return index;
}

function isSmallerThanGeoLevel(code, levelKey) {
	if (code?.startsWith?.("K04")) return false; // England and Wales is above every level
	const areaLevelIndex = geogroups.findIndex((d) => d.codes.includes(code?.slice?.(0, 3)));
	const levelIndex = geogroups.findIndex((d) => d.key === levelKey);
	return areaLevelIndex < levelIndex; // Also returns true if areaLevelIndex not found (-1)
}

const cols = ["oa21cd", "lsoa21cd", "msoa21cd", "ltla21cd", "rgn21cd"];
const ew = "K04000001";
const england = "E92000001";
const wales = "W92000004";
const regions = [...Array(9).keys()].map((i) => `E1200000${i + 1}`);

export default class Centroids {
	#data;
	constructor(oaData, lsoaData) {
		const oa = makeFeatureCollection(oaData, "oa21cd");
		const lsoa = makeFeatureCollection(lsoaData, "lsoa21cd", false);
		const lookup = Object.fromEntries(oa.features.map((ft) => [ft.properties.areacd, ft]));
		const parents = Object.fromEntries([
			[england, ew],
			[wales, ew],
			...regions.map((d) => [d, england])
		]);
		const children = { [ew]: new Set([england, wales]), [england]: new Set(regions) };

		for (const d of oaData) {
			for (let i = 0; i < cols.length - 1; i++) {
				parents[d[cols[i]]] = d[cols[i + 1]];
			}
			for (let i = 1; i < cols.length; i++) {
				if (!children[d[cols[i]]]) children[d[cols[i]]] = new Set();
				children[d[cols[i]]].add(d[cols[i - 1]]);
			}
		}
		this.#data = {
			oa,
			lsoa,
			lookup,
			parents,
			children,
			oaIndex: makeIndex(oa.features),
			lsoaIndex: makeIndex(lsoa.features)
		};
	}
	get data() {
		return this.#data;
	}
	compress(cds) {
		// Compresses to the highest parent area codes that have all their children present.
		// Repeats until stable, as Welsh codes reach country level one step before English codes.
		let compressed = this.#compressOnce(cds);
		let size;
		do {
			size = compressed.size;
			compressed = this.#compressOnce(compressed);
		} while (compressed.size < size);
		return compressed;
	}
	#compressOnce(cds) {
		const orphans = [];
		let current = [...cds];
		while (current.length > 0) {
			const next = [];
			const parents = {};
			for (const cd of current) {
				const pt = this.#data.parents[cd];
				if (!pt) {
					orphans.push(cd);
					continue;
				}
				if (!parents[pt]) parents[pt] = [];
				parents[pt].push(cd);
			}
			for (const pt of Object.keys(parents)) {
				if (parents[pt].length === this.#data.children[pt].size) next.push(pt);
				else orphans.push(...parents[pt]);
			}
			current = next;
		}
		return new Set(orphans);
	}
	expand(cds, level = "oa") {
		// Expands compressed codes to a full list of OA or LSOA codes
		const match = level === "lsoa" ? "01" : "00";
		const expanded = [];
		let current = [...cds];
		while (current.length > 0) {
			const next = [];
			for (const cd of current) {
				if (cd.slice(1, 3) === match) expanded.push(cd);
				else if (this.#data.children[cd]) next.push(...this.#data.children[cd]);
				else console.warn(`Cannot expand unknown area code ${cd}`);
			}
			current = next;
		}
		return new Set(expanded);
	}
	inPolygon(polygon, level = "oa") {
		// Returns the area codes of the centroids within a GeoJSON polygon. Narrows to the polygon's
		// bounding box via a spatial index first, since testing every one of ~225k centroids exactly
		// (as this used to do) is unnecessary when most are nowhere near the shape.
		const { features } = this.#data[level];
		const index = this.#data[`${level}Index`];
		// Every real caller already sets .bbox (DrawMap/Polygon, parseGeoJSON) - this is a safety net
		const [minX, minY, maxX, maxY] = polygon.bbox || bbox(polygon);
		const candidates = index.range(minX, minY, maxX, maxY);
		const matched = candidates.filter((i) => inPolygon(features[i], polygon));
		return new Set(matched.map((i) => features[i].properties.areacd));
	}
	population(cds) {
		// Gets the total population of the selected OAs
		if (cds.size === 0) return 0;
		return Array.from(cds)
			.map((cd) => this.#data.lookup[cd]?.properties?.population || 0)
			.reduce((a, b) => a + b, 0);
	}
	getParentByLevel(cd, level) {
		const levelObj = geolevelsLookup[level];
		let parentcd = this.#data.parents[cd];
		while (parentcd && !levelObj.codes.includes(parentcd.slice(0, 3))) {
			parentcd = this.#data.parents[parentcd];
		}
		return parentcd || null;
	}
	commonParent(cds = { raw: null, compressed: null }, minLevel = "ltla") {
		// Finds the closest parent area that a selection sits fully within
		const getParentByGeoLevel = (cd) =>
			minLevel && isSmallerThanGeoLevel(cd, minLevel)
				? this.getParentByLevel(cd, minLevel)
				: cd;

		let raw = cds.raw;
		let compressed = cds.compressed;
		if (!raw && !compressed) return null;
		if (!compressed) compressed = this.compress(raw);

		if (compressed.size === 1) {
			const parentcd = this.#data.parents[compressed.values().next().value];
			if (!parentcd) return null;
			return getParentByGeoLevel(parentcd);
		}

		let unique = !raw ? this.expand(compressed, "oa") : new Set(raw);
		while (unique.size > 1) {
			unique = new Set([...unique].map((cd) => this.#data.parents[cd]).filter((cd) => cd));
		}
		const parentcd = unique.values().next().value;
		if (!parentcd) return null;
		return getParentByGeoLevel(parentcd);
	}
	isValidCode(cd, level = "oa") {
		// Checks if a code exists in the full heirarchy
		return this.#data.parents[cd] && (level === "oa" || !this.#data.lookup[cd]);
	}
}
