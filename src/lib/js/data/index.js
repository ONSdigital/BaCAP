import { measures } from "../config";
import { btoaUtf8 } from "../io";

export { default as getData } from "./get-data.js";

export function makeEmbedHash(
	tables,
	buildState,
	activeArea,
	comparisonArea,
	areaPolygon,
	compPolygon
) {
	const areas = [
		activeArea?.properties?.areanm,
		...(comparisonArea ? [comparisonArea.properties?.areanm] : [])
	];
	const polygons = [
		...(buildState.includeAreaMap ? [areaPolygon] : []),
		...(compPolygon && buildState.includeAreaMap && buildState.includeCompMap
			? [compPolygon]
			: [])
	];
	const dataTables = tables.map((t) => ({
		key: t.meta.key,
		data: t.data
			.filter(t.meta.measures.length > 1 ? (d) => d.measure === "Percent" : () => true)
			.map((d) => d.value),
		range:
			t.meta.dates.length === 1
				? t.meta.dates
				: [t.meta.dates[0], t.meta.dates[t.meta.dates.length - 1]]
	}));
	return btoaUtf8(JSON.stringify({ areas, tables: dataTables, polygons }));
}

export function makeEmbedCode(embedHash) {
	let url = `https://www.ons.gov.uk/visualisations/customprofiles/profile/${embedHash}`;
	return `<div id="custom-profile"></div>
<script src="https://cdn.ons.gov.uk/vendor/pym/1.3.2/pym.min.js"><\/script>
<script>const pymParent = new pym.Parent("custom-profile", "${url}", {name: "custom-profile", title: "Embedded area profile"});<\/script>`;
}

const monthFormat = { month: "short", year: "numeric" };

export function makeDateFormatter(format, length = "short") {
	return format === "month"
		? (d) => new Date(d.padEnd(10, "-01")).toLocaleDateString("en-GB", monthFormat)
		: format === "year-ending" && length === "long"
			? (d) =>
					"Year ending " +
					new Date(d.padEnd(10, "-01")).toLocaleDateString("en-GB", monthFormat)
			: format === "year-ending"
				? (d) => new Date(d.padEnd(10, "-01")).toLocaleDateString("en-GB", monthFormat)
				: (d) => d;
}

export function pivotDataOnMeasures(data) {
	const rows = {};
	for (const d of data) {
		const rowId = `${d.areanm}_${d.category}_${d.date}`;
		if (!rows[rowId])
			rows[rowId] = {
				areanm: d.areanm,
				category: d.category,
				date: d.date,
				...Object.fromEntries(measures.map((m) => [m.label.toLowerCase(), null]))
			};
		const col = d.measure.toLowerCase();
		rows[rowId][col] = d.value;
	}
	return Object.values(rows);
}

export function groupData(data, key) {
	let dataIndexed = {};
	for (const d of data) {
		if (!dataIndexed[d[key]]) {
			dataIndexed[d[key]] = {
				label: d[key],
				values: []
			};
		}
		dataIndexed[d[key]].values.push(d);
	}
	return Object.values(dataIndexed);
}
