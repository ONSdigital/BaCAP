<script>
	import throttle from "throttleit";
	import { pointToTile } from "@mapbox/tilebelt";
	import inPolygon from "@turf/boolean-point-in-polygon";
	import { Select } from "@onsvisual/svelte-components";
	import { geoUrl, postcodesUrl, lookupUrl, geotypesLookup } from "$lib/config";

	let {
		options = [],
		value = $bindable(),
		idKey = "id",
		labelKey = "label",
		groupKey = "group",
		label = "Find an area to add to the map",
		description = null,
		placeholder = "Type a place name or postcode",
		geoTypes = new Set(Object.keys(geotypesLookup)),
		postcodeTypes = new Set(["E00", "W00"]),
		autoFocus = false
	} = $props();

	const startsWithFilter = (str, filter) => str.toLowerCase().startsWith(filter.toLowerCase());

	function filterAreas(str) {
		return options
			.filter((p) => p.areanm.match(new RegExp(`\\b${str}`, "i")))
			.sort((a, b) => {
				const fa = startsWithFilter(a.areanm, str);
				const fb = startsWithFilter(b.areanm, str);
				return fa === fb ? 0 : fa ? -1 : 1;
			})
			.slice(0, 10)
			.map((p) => ({
				[idKey]: p.areacd,
				[labelKey]: p.areanm,
				...p
			}));
	}

	function makeGSScodes(str) {
		if (
			str.length < 10 &&
			/^[eknsw]\d+$/i.test(str) &&
			geoTypes.has(str.toUpperCase().slice(0, 3))
		) {
			if (str.length === 9)
				return [str.toUpperCase()].map((cd) => ({ [idKey]: cd, [labelKey]: cd }));
			return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
				.slice(str.length < 4 || +str.slice(3) === 0 ? 1 : 0)
				.map((d) => `${str.toUpperCase().padEnd(8, "0")}${d}`)
				.map((cd) => ({ [idKey]: cd, [labelKey]: cd }));
		} else return [];
	}

	async function getPostcodes(str) {
		const prefix = str.replaceAll(" ", "").toUpperCase().slice(0, 4);
		if (prefix.length === 0) return [];
		const url = `${postcodesUrl}/${prefix}.json`;

		const getItem = (data, i) => ({
			[idKey]: data.cd[i],
			[labelKey]: data.cd[i],
			lng: data.lng[i],
			lat: data.lat[i]
		});

		try {
			const data = await (await fetch(url)).json();

			const fullMatch = [];
			const partMatch = [];
			for (let i = 0; i < data.cd.length; i++) {
				if (data.cd[i].startsWith(str.toUpperCase())) fullMatch.push(getItem(data, i));
				else if (
					data.cd[i].replaceAll(" ", "").startsWith(str.replaceAll(" ", "").toUpperCase())
				)
					partMatch.push(getItem(data, i));
				if (fullMatch.length === 10) return fullMatch;
			}
			return [...fullMatch, ...partMatch].slice(0, 10);
		} catch {
			return [];
		}
	}

	export async function loadOptionsFn(query, populateResults) {
		const filterText = query;

		// Postcode lookup
		if (/^[a-z]{1,2}\d/i.test(filterText)) {
			if (/^[ew]\d{3}/.test(filterText) || filterText[1] === "0") {
				populateResults(makeGSScodes(filterText));
				return;
			}
			try {
				const postcodes = await getPostcodes(query);
				const results = postcodes.length ? postcodes : makeGSScodes(filterText);

				populateResults(results);
				return;
			} catch (e) {
				populateResults(makeGSScodes(filterText));
				return;
			}
		}

		// Name search
		const results = filterAreas(query);
		console.log({ results });

		populateResults(results);
		return;
	}
	const loadOptions = throttle(loadOptionsFn, 500);

	async function handleChange(e) {
		const obj = e?.detail;

		let areacd;

		if (obj.lng) {
			// Get OA code for postcode
			const tile = pointToTile(obj.lng, obj.lat, 12);

			try {
				const url = `${lookupUrl}/${tile[0]}/${tile[1]}.json`;
				const geojson = await (await fetch(url)).json();
				const point = { type: "Point", coordinates: [obj.lng, obj.lat] };
				const match = geojson.features.find(
					(f) =>
						!f.properties.end &&
						postcodeTypes.has(f.properties.areacd.slice(0, 3)) &&
						inPolygon(point, f)
				);
				areacd = match?.properties?.areacd;
			} catch (err) {
				console.warn(err);
			}
		} else {
			areacd = obj[idKey];
		}
		if (!areacd) return;

		try {
			const geojson = await (
				await fetch(`${geoUrl}/${areacd.slice(0, 3)}/${areacd}.json`)
			).json();
			value = {
				[idKey]: areacd,
				[labelKey]: geojson.properties.areanm || areacd,
				geojson
			};
		} catch (err) {
			console.warn(err);
		}
	}
</script>

<Select
	{value}
	{loadOptions}
	{groupKey}
	mode="search"
	{label}
	{description}
	{placeholder}
	{autoFocus}
	on:change={handleChange}
	autoClear={false}
/>
