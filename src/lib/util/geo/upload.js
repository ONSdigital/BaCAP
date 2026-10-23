// Parsing and limiting for uploaded GeoJSON files - deliberately has no imports beyond plain JS, so
// it can be unit tested directly without pulling in turf/proj4 or the io/analytics module chain that
// the rest of util/geo drags in via ../io/index.js.

export const maxUploadAreas = 50; // Areas needing an OA/LSOA centroid match, per upload

export function getNameKey(keys) {
	const prefs = ["areanm", "name", "nm", "areacd"];
	for (const pref of prefs) {
		const match = keys.find((key) => key.toLowerCase().includes(pref));
		if (match) return match;
	}
	return null;
}

export function getCodeKey(keys) {
	const prefs = ["areacd", "code", "cd", "id"];
	for (const pref of prefs) {
		const match = keys.find((key) => key.toLowerCase().includes(pref));
		if (match) return match;
	}
	return null;
}

export function isValidAreaCode(code) {
	return !!code.match(/^[EKNSW]\d{8}$/);
}

// True if parseGeoJSON() can resolve this area's codes without scanning the centroids - mirrors its
// first short-circuit (props.oa21cds || props.codes_compressed, and the lsoa equivalent) only;
// deliberately doesn't try to replicate centroids.isValidCode()'s hierarchy lookups, which need a
// live Centroids instance. Under-counting a "cheap" area here only makes the limit stricter, never
// looser, so this stays a safe, simple approximation rather than an exact match.
function hasEmbeddedCodes(properties = {}) {
	return !!(
		(properties.oa21cds || properties.codes_compressed) &&
		(properties.lsoa21cds || properties.codes_compressed_to_lsoa)
	);
}

// Pure parse of raw uploaded GeoJSON text - no FileReader/DOM dependency, so it's unit-testable
// directly. uploadAreas() below is just the browser-file-reading wrapper around this.
export function parseUploadedGeoJSON(text) {
	let data;
	try {
		data = JSON.parse(text);
	} catch (err) {
		console.warn(err);
		return { status: "invalid" };
	}
	const features =
		data.type === "FeatureCollection" ? data.features : data.type === "Feature" ? [data] : [];
	const allAreas = features.filter((d) => ["Polygon", "MultiPolygon"].includes(d.geometry?.type));
	// Folds the previous separate "empty" status in here - the "invalid" message ("did not contain
	// valid Polygon or MultiPolygon features") already covers a file with zero matching features too
	if (!allAreas.length) return { status: "invalid" };

	// Keeps every area that's cheap to resolve (no centroid scan needed) uncapped, but only takes the
	// first maxUploadAreas of the rest, since each of those needs a full OA/LSOA centroid match
	let expensiveSeen = 0;
	const areas = allAreas.filter((d) => {
		if (hasEmbeddedCodes(d.properties)) return true;
		expensiveSeen += 1;
		return expensiveSeen <= maxUploadAreas;
	});
	const totalCount = allAreas.length;
	const truncatedCount = totalCount - areas.length;

	const status = areas.length > 1 ? "multi" : "single";
	const keys = Object.keys(areas[0].properties);
	const isBNG = String(data?.crs?.properties?.name).toUpperCase().includes("EPSG:27700");
	return {
		status,
		areas,
		isBNG,
		selected: areas.map(() => false),
		nameKey: getNameKey(keys),
		codeKey: getCodeKey(keys),
		totalCount,
		truncatedCount
	};
}

export function uploadAreas(uploader) {
	return new Promise((resolve) => {
		const file = uploader?.files?.[0];
		if (!file) {
			resolve({ status: "invalid" });
			return;
		}
		const reader = new FileReader();
		reader.onload = (e) => resolve(parseUploadedGeoJSON(e.target.result));
		reader.onerror = () => resolve({ status: "invalid" });
		reader.readAsText(file);
	});
}
