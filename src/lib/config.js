// APP STATE CONFIG
export const appVersion = 1;
export const initialState = {
	activeArea: {
		type: "Feature",
		id: null,
		geometry: null,
		properties: {}
	},
	comparisonArea: null,
	savedAreas: {},
	history: [{ geometry: null, oa: new Set(), lsoa: new Set() }],
	selectedTopics: []
};

// GEOGRAPHY CONFIG
export const geoUrl = "https://ons-dp-prod-cdn.s3.eu-west-2.amazonaws.com/maptiles/ap-geos/v4";
export const postcodesUrl =
	"https://ons-dp-prod-cdn.s3.eu-west-2.amazonaws.com/maptiles/postcode-lookup/v1";
export const lookupUrl = `https://ons-dp-prod-cdn.s3.eu-west-2.amazonaws.com/maptiles/area-lookup/v1`;

export const geotypes = [
	{ keys: ["E00", "W00"], label: "Output area" },
	{ keys: ["E01", "W01"], label: "LSOA" },
	{ keys: ["E02", "W02"], label: "MSOA" },
	{ keys: ["E04"], label: "Census merged parish" },
	{ keys: ["W04"], label: "Census merged community" },
	{ keys: ["E05", "W05"], label: "Ward" },
	{ keys: ["E06", "W06"], label: "Unitary authority" },
	{ keys: ["E07"], label: "Non-metropolitan borough" },
	{ keys: ["E08"], label: "Metropolitan borough" },
	{ keys: ["E09"], label: "London borough" },
	{ keys: ["E10"], label: "County" },
	{ keys: ["E11"], label: "Metropolitan county" },
	{ keys: ["E47"], label: "Combined authority" },
	{ keys: ["E12"], label: "Region" },
	{ keys: ["E92", "W92"], label: "Country" },
	{ keys: ["K04"], label: "" },
	{ keys: ["E14", "W07"], label: "Parliamentary constituency" },
	{ keys: ["W09"], label: "Senedd constituency" },
	{ keys: ["W10"], label: "Senedd electoral region" },
	{ keys: ["E30", "K01", "W22"], label: "2011 Travel to work area" },
	{
		keys: ["E34", "K05", "W37", "E63", "K08", "W45"],
		label: "Built-up area"
	},
	{ keys: ["E35", "K06", "W38"], label: "Built-up area, sub-division" }
];
export const geotypesLookup = (() => {
	let lookup = {};
	geotypes.forEach((g) => g.keys.forEach((k) => (lookup[k] = g.label)));
	return lookup;
})();

// ANALYTICS CONFIG
export const analyticsId = "GTM-MBCBVQS";

export const analyticsProps = {
	contentTitle: "Product title", // Insert the title of the product here
	releaseDate: "YYYYMMDD",
	contentType: "content-type", // Optional: eg. scrollytelling, exploratory, edutainment?
	outputSeries: "url-slug-for-output-series" // Should match the slug for the release on CMS
};
