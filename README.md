# Build a Custom Area Profile (BaCAP)

An ONS (Office for National Statistics) tool that lets users draw or select a geographic area of
England and Wales, choose from a set of census and administrative data topics, and generate a data
profile for that area — charts, tables, and downloadable XLSX/CSV exports — aggregated on a
best-fit basis from Output Areas (OA) and LSOAs.

Live at: **https://www.ons.gov.uk/visualisations/customprofiles**

Built with SvelteKit (Svelte 5) on the ONS [svelte-components](https://github.com/ONSvisual/svelte-components)
design system, deployed as a static site (no backend/server of its own).

For an overview of how the app works (app structure, best-fit lookups, Nomis data fetching,
embed hashes, and IndexedDB state and caching), see [ARCHITECTURE.md](./ARCHITECTURE.md). Further
notes for developers working in the codebase are in [CLAUDE.md](./CLAUDE.md).

## Development

```bash
npm install
npm run dev
```

The app runs at [localhost:5173](http://localhost:5173).

## Building

```bash
npm run build            # Production build to /build, using the production base path
npm run build:preview    # Preview build, using the preview base path
npm run preview           # Serve a production build locally
```

Base paths for each environment are set in `src/app.config.js`. Publishing the `/build` output to
the live ONS site (`ons.gov.uk/visualisations/customprofiles`) is handled outside this repository —
there's no CI/CD workflow here.

Previews are handled by [Vercel](https://vercel.com/), which automatically builds a preview
deployment for every branch/PR — Vercel posts the preview link as a comment on each pull request.
The preview of the `main`/production branch is at **https://ons-bacap.vercel.app**.

## Testing and linting

```bash
npm test        # Run unit tests (vitest)
npm run lint     # Check formatting (prettier)
npm run format   # Fix formatting (prettier)
```

## Maintaining the app

Day-to-day maintenance of this tool mostly means keeping two kinds of data current: the list of
available **datasets/topics**, and the underlying **geographic reference data**.

### Updating datasets (`static/data/topics.json`)

Every dataset offered on the Build a profile and Download datasets pages is defined by one entry in
[`static/data/topics.json`](./static/data/topics.json). This file is maintained directly — there's
no generation script for it — so add or edit entries in it directly and they'll take effect on the
next deploy, no build step required.

Each entry describes both how to query the dataset from the [Nomis API](https://www.nomisweb.co.uk/)
and how to present it in the UI. Example:

```json
{
	"key": "households",
	"label": "Number of households",
	"topic": "Demography and migration",
	"summary": "The number of households on Census Day, 21 March 2021.",
	"description": null,
	"chart": "number",
	"tableCode": "NM_2059_1",
	"cellCode": "c2021_hh_1",
	"measures": [{ "label": "Value", "cell": 20100 }],
	"categories": [{ "label": "Total households", "cells": [0] }],
	"dates": [2021],
	"unit": "households",
	"dateFormat": "year",
	"base": "all households",
	"geography": "oa21",
	"source": "ONS - Census 2021",
	"url": "peoplepopulationandcommunity/populationandmigration/populationestimates/methodologies/maximisingthequalityofcensus2021populationestimates",
	"census": true
}
```

Field reference:

| Field         | Purpose                                                                                                                                                                                                                             |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `key`         | Unique ID for the topic. Used in URLs/state, so avoid changing it for an existing published topic.                                                                                                                                  |
| `label`       | Dataset name shown to users (checkbox label, chart card title).                                                                                                                                                                     |
| `topic`       | Section heading the dataset is grouped under, on the build page's accordion and the glossary. Use an existing heading to add to a section, or a new string to create one.                                                           |
| `summary`     | Short plain-text description, used as a fallback in the glossary if `description` is empty.                                                                                                                                         |
| `description` | Longer markdown description shown on the [glossary](<./src/routes/(static)/glossary/+page.svelte>) page. Set to `null` to fall back to `summary`.                                                                                   |
| `chart`       | Which chart component renders the data: `"number"` (single figure), `"line"` (time series), `"profile"` (age-band style profile), or anything else falls back to a bar chart.                                                       |
| `tableCode`   | The Nomis table ID (e.g. `NM_2059_1`) — found via the Nomis website's query builder or `https://www.nomisweb.co.uk/api/v01/dataset/def.sdmx.json`.                                                                                  |
| `cellCode`    | The Nomis dimension name used for `categories` (e.g. `c_sex`, `c2021_hh_1`) — visible as a query parameter in the URL Nomis's own query builder generates.                                                                          |
| `measures`    | Which Nomis measures to fetch, e.g. `[{"label":"Value","cell":20100}]`. `20100` = Value and `20301` = Percent are Nomis's standard measure codes. Set `"cell": null` for a measure to have it computed locally instead (see below). |
| `categories`  | The rows/series within the dataset. Each has a `label` and one or more Nomis `cells` codes; a category with multiple `cells` (e.g. `[2,3,4]`) sums them into one bucket.                                                            |
| `dates`       | One or more date values, in whatever format Nomis expects for this table (e.g. `[2021]`, or a list of months for a time series).                                                                                                    |
| `miscParams`  | Optional extra fixed query parameters the Nomis table needs beyond date/geography/cellCode/measures (e.g. `{"gender": 0}` to select "all persons").                                                                                 |
| `unit`        | Unit label shown alongside values (e.g. `"people"`, `"%"`).                                                                                                                                                                         |
| `dateFormat`  | How dates are displayed: `"year"`, `"month"`, or `"year-ending"` (for rolling annual periods).                                                                                                                                      |
| `base`        | Description of the population/denominator the figures are based on (e.g. `"all households"`), shown in exports.                                                                                                                     |
| `geography`   | `"oa21"` (Output Area) if the table is published at OA level, otherwise `"lsoa21"` if it's only available at LSOA level. OA-level topics disappear from the UI once an area is too large to resolve at OA level.                    |
| `coverage`    | Optional array restricting the topic to certain countries, e.g. `["W"]` for a Wales-only dataset (like Welsh language skills). Omit for England & Wales datasets.                                                                   |
| `source`      | Source label shown in exports (e.g. `"ONS - Census 2021"`).                                                                                                                                                                         |
| `url`         | Path (without a leading slash) to the ONS methodology page, appended to `https://www.ons.gov.uk/` for the "Read more" link on the glossary and download pages.                                                                      |
| `census`      | Informational flag for whether the dataset comes from Census 2021.                                                                                                                                                                  |

**If Nomis doesn't provide a percentage for a table directly**, add a `{"label": "Percent", "cell": null}`
entry to `measures` — the app calculates percentages client-side from the Value rows instead
(see `calcPercentages` in `src/lib/util/data/get-data.js`).

After adding or editing an entry, verify it on the `/build` page: select an area, tick the new
dataset, and check the values match what Nomis's own site returns for the same table/area/date.

### Updating geographic reference data

The app's geography data — the list of selectable areas, the boundary data itself, and the
best-fit lookups that translate a drawn area into OA/LSOA codes — comes from the
[ONSdigital/geo-scripts](https://github.com/ONSdigital/geo-scripts) repository. That repository is
updated roughly annually (as local authority boundaries, combined authorities, etc. change) and is
maintained separately — refreshing it is outside the scope of this repo.

Once the data in `geo-scripts` is up to date, refresh this repo's copies by running these npm
scripts. `data:get-places` and `data:compress` must run in that order; `data:lookups` is independent
and can be run separately:

```bash
npm run data:get-places   # 1. Fetch the latest raw_data/places-list.csv from geo-scripts
npm run data:compress     # 2. Compress raw_data/*.csv into static/data/*.json (must run after step 1)
npm run data:lookups      # 3. Independently fetch and write static/data/bestfit-lookup.json
                           #    and static/data/rgn-cauth-children.json from geo-scripts
```

Note that `data:compress` also compresses `raw_data/oa21-data.csv` and `raw_data/lsoa21-data.csv` —
these are Output Area/LSOA centroids and hierarchy codes tied to the 2021 Census geography, and
aren't part of this annual refresh (they'd only need replacing alongside a new Census geography).

After running the scripts, review the diff in `static/data/`, commit the updated files, and rebuild
the app.

## License

MIT
