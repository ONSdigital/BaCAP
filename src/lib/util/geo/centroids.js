import inPolygon from "@turf/boolean-point-in-polygon";

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

const cols = ["oa21cd", "lsoa21cd", "msoa21cd", "ltla21cd", "rgn21cd"];
const ew = "K04000001";
const england = "E92000001";
const wales = "E92000001";
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
		const children = { [england]: new Set(regions) };

		for (const d of oaData) {
			for (let i = 0; i < cols.length - 1; i++) {
				parents[d[cols[i]]] = d[cols[i + 1]];
			}
			for (let i = 1; i < cols.length; i++) {
				if (!children[d[cols[i]]]) children[d[cols[i]]] = new Set();
				children[d[cols[i]]].add(d[cols[i - 1]]);
			}
		}
		this.#data = { oa, lsoa, lookup, parents, children };
	}
	get data() {
		return this.#data;
	}
	compress(cds) {
		// Compresses to the highest parent area codes that have all their children present
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
				else next.push(...this.#data.children[cd]);
			}
			current = next;
		}
		return new Set(expanded);
	}
	inPolygon(polygon, level = "oa") {
		// Returns the area codes of the centroids within a GeoJSON polygon
		const features = this.#data[level].features.filter((ft) => inPolygon(ft, polygon));
		return new Set(features.map((ft) => ft.properties.areacd));
	}
	population(cds) {
		// Gets the total population of the selected OAs
		if (cds.size === 0) return 0;
		return Array.from(cds)
			.map((cd) => this.#data.lookup[cd].properties.population)
			.reduce((a, b) => a + b, 0);
	}
	commonParent(cds = { raw: null, compressed: null }) {
		// Finds the closest parent area that a selection sits fully within
		let raw = cds.raw;
		let compressed = cds.compressed;
		if (!raw && !compressed) return null;

		if (!compressed) compressed = this.compress(raw);
		if (compressed.size === 1)
			return this.#data.parents[compressed.values().next().value] || null;

		let unique = !raw ? this.expand(compressed, "oa") : new Set(raw);
		while (unique.size > 1) {
			unique = new Set([...unique].map((cd) => this.#data.parents[cd]).filter((cd) => cd));
		}
		return unique.values().next().value || null;
	}
	isValidCode(cd, level = "oa") {
		// Checks if a code exists in the full heirarchy
		return this.#data.parents[cd] && (level === "oa" || !this.#data.lookup[cd]);
	}
}
