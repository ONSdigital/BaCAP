import inPolygon from "@turf/boolean-point-in-polygon";

function makeFeatureCollection(data, key) {
	return {
		type: "FeatureCollection",
		features: data.map((d) => ({
			type: "Feature",
			properties: { areacd: d[key] },
			geometry: { type: "Point", coordinates: [d.lng, d.lat] }
		}))
	};
}

const cols = ["oa21cd", "lsoa21cd", "msoa21cd", "ltla21cd", "rgn21cd"];
const england = "E92000001";
const regions = [...Array(9).keys()].map((i) => `E1200000${i + 1}`);

export default class Centroids {
	constructor(oaData, lsoaData) {
		const oa = makeFeatureCollection(oaData, "oa21cd");
		const lsoa = makeFeatureCollection(lsoaData, "lsoa21cd");
		const lookup = Object.fromEntries(
			[...oa.features, ...lsoa.features].map((ft) => [ft.properties.areacd, ft])
		);
		const parents = Object.fromEntries(regions.map((d) => [d, england]));
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
}
