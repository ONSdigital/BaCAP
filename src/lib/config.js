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
	savedAreasLastId: 0,
	history: [{ geometry: null, oa: new Set(), lsoa: new Set() }],
	rehistory: [],
	lastActivePage: null,
	selectedTopics: ["population"]
};

// DATA CONFIG
export const measures = [
	{ label: "Value", cell: 20100 },
	{ label: "Percent", cell: 20301 }
];

// GEOGRAPHY CONFIG
export const geoUrl = "https://ons-dp-prod-cdn.s3.eu-west-2.amazonaws.com/maptiles/ap-geos/v4";
export const postcodesUrl =
	"https://ons-dp-prod-cdn.s3.eu-west-2.amazonaws.com/maptiles/postcode-lookup/v1";
export const lookupUrl = `https://ons-dp-prod-cdn.s3.eu-west-2.amazonaws.com/maptiles/area-lookup/v1`;

export const geotypes = [
	{ codes: ["E00", "W00"], label: "Output Area" },
	{ codes: ["E01", "W01"], label: "LSOA" },
	{ codes: ["E02", "W02"], label: "MSOA" },
	{ codes: ["E04"], label: "Census merged parish" },
	{ codes: ["W04"], label: "Census merged community" },
	{ codes: ["E05", "W05"], label: "Ward" },
	{ codes: ["E06", "W06"], label: "Unitary authority" },
	{ codes: ["E07"], label: "Non-metropolitan borough" },
	{ codes: ["E08"], label: "Metropolitan borough" },
	{ codes: ["E09"], label: "London borough" },
	{ codes: ["E10"], label: "County" },
	{ codes: ["E11"], label: "Metropolitan county" },
	{ codes: ["E47"], label: "Combined authority" },
	{ codes: ["E12"], label: "Region" },
	{ codes: ["E92", "W92"], label: "Country" },
	{ codes: ["K04"], label: "" },
	{ codes: ["E14", "W07"], label: "Parliamentary constituency" },
	{ codes: ["W09"], label: "Senedd constituency" },
	{ codes: ["W10"], label: "Senedd electoral region" },
	{ codes: ["E30", "K01", "W22"], label: "2011 Travel to work area" },
	{
		codes: ["E34", "K05", "W37", "E63", "K08", "W45"],
		label: "Built-up area"
	},
	{ codes: ["E35", "K06", "W38"], label: "Built-up area, sub-division" }
];
export const geotypesLookup = (() => {
	let lookup = {};
	geotypes.forEach((d) => d.codes.forEach((cd) => (lookup[cd] = d.label)));
	return lookup;
})();
export const geogroups = [
	{ key: "msoa", codes: ["E02", "W02"], label: "MSOA" },
	{ key: "par", codes: ["E04", "W04"], label: "Parish/community" },
	{ key: "wd", codes: ["E05", "W05"], label: "Ward" },
	{ key: "wpc", codes: ["E14", "W07"], label: "Parliamentary constituency" },
	{
		key: "ltla",
		codes: ["E06", "E07", "E08", "E09", "W06"],
		label: "Lower-tier/unitary authority"
	},
	{
		key: "utla",
		codes: ["E06", "E08", "E09", "E10", "W06"],
		label: "Upper-tier/unitary authority"
	},
	{ key: "cauth", codes: ["E47"], label: "Combined authority" },
	{ key: "rgn", codes: ["E12"], label: "Region" },
	{ key: "ctry", codes: ["E92", "W92"], label: "Country" }
];
export const geogroupsLookup = (() => {
	let lookup = {};
	geogroups.forEach((d) => d.codes.forEach((cd) => (lookup[cd] = d)));
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
