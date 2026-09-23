# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

BaCAP ("Build a Custom Area Profile") is an ONS (Office for National Statistics) SvelteKit app that lets users draw or select a geographic area of England/Wales, choose census data topics, and generate a data profile (charts, tables, downloadable XLSX/CSV) for that area — aggregated on a best-fit basis from Output Areas (OA) / LSOAs. Built on the ONS `svelte-components` / `svelte-maps` design system, using Svelte 5 runes.

## Commands

```bash
npm run dev              # Start dev server (localhost:5173)
npm run build             # Production build to /build (also runs scripts/js-fix.js to fix JS mimetypes)
npm run build:preview     # Build with PUBLIC_APP_ENV=preview, using base_preview path
npm run preview            # Preview a production build
npm run deploy             # Publish /build to gh-pages
npm run lint                # prettier --check
npm run format              # prettier --write
```

Data pipeline scripts (regenerate static JSON data from `raw_data/` or remote ONS/geo-scripts sources — run only when source data changes):

```bash
npm run data:compress   # Compresses raw_data/*.csv into static/data/*.json (oa21-data, lsoa21-data, places-list)
npm run data:convert    # Converts scripts/data/topics-old.json into static/data/topics-generated.json
npm run data:lookups    # Fetches best-fit and region/combined-authority child lookups from ONSdigital/geo-scripts on GitHub, writes static/data/bestfit-lookup.json and static/data/rgn-cauth-children.json
```

There is no test suite in this repo.

## Base path configuration

Before building for a target environment, `src/app.config.js` sets the base path: `base_prod` for the ONS site (`/visualisations/customprofiles`), `base_preview` for preview/GitHub Pages. `svelte.config.js` picks between them based on `NODE_ENV`/`PUBLIC_APP_ENV`.

## Architecture

### Route groups

Three route groups under `src/routes/`, each with its own layout:

- **`(app)`** — the main interactive tool (`/draw`, `/build`, `/download`). Its `+layout.svelte` does the app's startup: on mount it loads persisted app state plus reference datasets (areas list, best-fit lookups, region/authority child lookups, OA data, LSOA centroids) and exposes them all via Svelte `setContext` (`appState`, `areasList`, `bestFits`, `childLookup`, `centroids`) rather than props — downstream components read these with `getContext`. Nothing under `(app)` renders until this finishes (shows `Spinner` meanwhile).
- **`(embed)`** — pages (`/embed`, `/landing`, `/profile`) meant to be iframed into ONS articles via `pym.js`; sets `noindex` and skips the app chrome (`Header`/`Footer`/`PhaseBanner`).
- **`(static)`** — plain content pages (home, `/glossary`).

The root `+layout.js` prerenders (except in preview mode), sets `trailingSlash: "always"`, and loads `topics.json` (topic/dataset definitions) into every route's `data`.

### State persistence (`src/lib/util/state/`)

App state (`activeArea`, `comparisonArea`, `savedAreas`, draw `history`, `selectedTopics`, etc. — see `initialState` in `src/lib/config/index.js`) is held in Svelte stores that transparently sync to IndexedDB (`db.js`, via `idb-keyval`) on every `.set()`. `getAppState()` rehydrates these stores from IndexedDB on startup, seeding any missing key from `initialState`. Bumping `appVersion` in `src/lib/config/index.js` invalidates old stored state/data caches.

`snapshot.svelte.js` wraps `$state.snapshot` — used whenever a `$state` proxy needs to be serialized (persisted to IndexedDB, JSON-stringified, etc).

### Data loading (`src/lib/util/io/`, `src/lib/util/data/`)

- `io/index.js` — `loadData()` fetches and IndexedDB-caches static JSON reference datasets (with optional decompression via `compress-csv-to-json`), plus the XLSX/CSV export functions (via `@onsvisual/accessible-xlsx`) used on the build/download pages.
- `data/get-data.js` — fetches actual census statistics live from the Nomis API for the selected area/topic. Handles chunking requests to stay under Nomis URL/response-size limits (`makeUrls`), caches raw responses per-URL in IndexedDB (`getCache`/`setCache`, capped at 1000 entries), and derives percentages client-side when Nomis can't provide them (`calcPercentages`).
- `data/index.js` — shared helpers: embed-hash encoding for the `/embed` viewer, date formatting per topic (`month`/`year-ending`), data pivoting/grouping.

### Geography (`src/lib/util/geo/`)

- `Centroids` class (`centroids.js`) — spatial index over OA/LSOA centroids; used to determine which small areas fall inside a drawn/selected polygon (`inPolygon`), compress/expand area-code sets, and find a common parent area for auto-selecting a comparison area.
- `MaplibreDraw` (`draw-lib.js`) — wraps `@mapbox/mapbox-gl-draw` for the polygon-drawing tool on `/draw`.
- `Polygon` (`polygon.svelte.js`) — reactive polygon state for the draw page.
- `parseGeoJSON` — normalizes an arbitrary uploaded/fetched GeoJSON feature into the app's area shape (detects name/code property keys heuristically via `getNameKey`/`getCodeKey`, reprojects British National Grid to WGS84 when needed, computes OA/LSOA membership via `Centroids` if not already embedded in the file).
- `simplifyGeo` — iteratively simplifies/buffers a polygon (via `@turf`) until its serialized size is under a target length, for embedding in the URL/hash used by `/embed`.
- Area code prefixes (E00/W00 = OA, E01/W01 = LSOA, E12 = Region, E47 = Combined authority, etc.) are mapped in `geotypes`/`geogroups` in `src/lib/config/index.js` — consult these when working with geography codes.

### Key pages

- `/draw` — draw a custom polygon area on a MapLibre map (`DrawMap`, `DrawToolbar`, `DrawCounter`); resolves the drawn shape to a set of OA/LSOA codes via `Centroids`.
- `/build` — select an area (`BuildAreas`: search, draw import, saved areas) and data topics (`BuildTopics`), then renders the profile (`BuildProfile`: charts/tables fetched live from Nomis via `getData`). On mount, restores the previously active area from a URL hash (`#<areacode>`) or from a polygon just drawn on `/draw` (coordinated via the shared `appState.lastActivePage`/`history`).
- `/download` — bulk dataset download page (CSV/XLSX exports via `io/index.js`).
- `/embed` — read-only embedded viewer for a profile encoded into the URL hash (via `makeEmbedHash`/`btoaUtf8`), designed to be loaded inside a `pym.js` iframe on ons.gov.uk articles.

### Data sources at runtime

Reference/geometry data (area boundaries, postcode lookups, area-code lookups) is fetched from ONS's S3-backed CDN (`geoUrl`, `postcodesUrl`, `lookupUrl` in `src/lib/config/index.js`); live statistics come from the Nomis API (`nomisweb.co.uk`). Static reference JSON shipped with the app itself lives in `static/data/` (generated by the `data:*` npm scripts above from `raw_data/`).

## Code style

- Tabs for indentation, no trailing commas, 100-char print width — enforced by Prettier (`.prettierrc`); run `npm run format` rather than hand-formatting.
- Svelte 5 runes (`$state`, `$derived`, `$props`, context via `setContext`/`getContext`) are used throughout instead of the older stores-only pattern, except where a `writable` store is specifically needed for IndexedDB sync (see `state/get-app-state.js`).
