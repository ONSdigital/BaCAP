import { measures } from "./config.js";

export function ascending(a, b) {
	return a < b ? -1 : a > b ? 1 : 0;
}

export function descending(a, b) {
	return b < a ? -1 : b > a ? 1 : 0;
}

export function round(val, dp = 0) {
	const multiplier = Math.pow(10, dp);
	return Math.round(val * multiplier) / multiplier;
}

export function btoaUtf8(value) {
	const bytes = new TextEncoder().encode(value);
	let binary = "";

	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	}

	return btoa(binary);
}

export function atobUtf8(value) {
	const binary = atob(value);
	const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

	return new TextDecoder().decode(bytes);
}

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
