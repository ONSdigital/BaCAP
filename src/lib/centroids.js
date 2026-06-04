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
	constructor(oaData, lsoaData) {
		const oa = makeFeatureCollection(oaData, "oa21cd");
		const lsoa = makeFeatureCollection(lsoaData, "lsoa21cd", false);
		const lookup = Object.fromEntries(
			[...oa.features, ...lsoa.features].map((ft) => [ft.properties.areacd, ft])
		);
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
		this.data = { oa, lsoa, lookup, parents, children };
	}
	get raw() {
		return this.data;
	}
	compress(cds) {
		const orphans = [];
		let current = [...cds];
		while (current.length > 0) {
			const next = [];
			const parents = {};
			for (const cd of current) {
				const pt = this.data.parents[cd];
				if (!pt) {
					orphans.push(cd);
					continue;
				}
				if (!parents[pt]) parents[pt] = [];
				parents[pt].push(cd);
			}
			for (const pt of Object.keys(parents)) {
				if (parents[pt].length === this.data.children[pt].size) next.push(pt);
				else orphans.push(...parents[pt]);
			}
			current = next;
		}
		return new Set(orphans);
	}
	expand(cds, level = "oa") {
		const childFn =
			level === "lsoa"
				? (cd) => (cd.slice(1, 3) === "01" ? [cd] : [...(this.data.children[cd] || [cd])])
				: (cd) => [...(this.data.children[cd] || [cd])];
		const expanded = [...cds].map(childFn).flat();
		if (expanded.length === cds.length) return new Set(cds);
		return this.expand(expanded, level);
	}
	inPolygon(polygon, level = "oa") {
		const features = this.data[level].features.filter((ft) => inPolygon(ft, polygon));
		return new Set(features.map((ft) => ft.properties.areacd));
	}
	population(cds) {
		if (cds.size === 0) return 0;
		return Array.from(cds)
			.map((cd) => this.data.lookup[cd].properties.population)
			.reduce((a, b) => a + b, 0);
	}
	commonParent(cds = { raw: null, compressed: null }) {
		let raw = cds.raw;
		let compressed = cds.compressed;
		if (!raw && !compressed) return null;

		if (!compressed) compressed = this.compress(raw);
		if (compressed.size === 1)
			return this.data.parents[compressed.values().next().value] || null;

		let unique = !raw ? this.expand(compressed, "oa") : new Set(raw);
		while (unique.size > 1) {
			unique = new Set([...unique].map((cd) => this.data.parents[cd]).filter((cd) => cd));
		}
		return unique.values().next().value || 0;
	}
}
