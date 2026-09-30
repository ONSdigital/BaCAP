# Analytics events

Every analytics event is sent through `analyticsEvent()` from `@onsvisual/svelte-components`. Page views are sent from `src/routes/+layout.svelte`. All other events go through the wrapper functions in `src/lib/util/analytics/index.js`.

For events that carry area properties (`areaCode`, `areaName`, `areaType`), `areaType` comes from `geogroupsLookup`, keyed on the area code's 3-character prefix. When no prefix matches, it falls back to the area's `groupnm` and then to `"Custom area"`. A drawn area with no code or name sends none of these three properties.

## `pageView`

**Page view.** Sent after every navigation, including the first page load.

```js
{
	event: "pageView",
	product: "bacap",
	contentTitle: "Build a profile: Build a custom area profile - ONS",
	contentType: "bacap",
	pageUrl: "https://www.ons.gov.uk/visualisations/customprofiles/build/",
	contentSubType: "bacap-profile"
}
```

`contentTitle` and `contentSubType` come from each route's `+page.js`. The possible `contentSubType` values are `bacap-home`, `bacap-draw`, `bacap-profile`, `bacap-download` and `bacap-glossary`.

## `interaction`

### `search-select`

**Area search selection.** The user picks an area from an area search box on `/draw`, in the load modal or on `/download`.

```js
{
	event: "interaction",
	interactionType: "search-select",
	interactionLabel: "Select area",
	areaCode: "E07000178",
	areaName: "Oxford",
	areaType: "Lower-tier/unitary authority"
}
```

Possible labels: `"Select area"`, `"Add area to selection"`, `"Select multiple areas"`.

### `manage-areas`

**Saved area management.** The user loads, saves or deletes areas.

```js
{
	event: "interaction",
	interactionType: "manage-areas",
	interactionLabel: "Save area",
	areaCode: "E07000178",
	areaName: "Oxford",
	areaType: "Lower-tier/unitary authority"
}
```

Possible labels: `"Load area"`, `"Load multiple areas"`, `"Save area"`, `"Save changes"`, `"Save a copy"`, `"Delete area"`, `"Delete all areas"`. `"Load multiple areas"` and `"Delete all areas"` carry no area properties.

### `dataset-select`

**Dataset selection.** The user adds a dataset on `/build` or `/download`, or adds every dataset in a topic on `/build`.

```js
{
	event: "interaction",
	interactionType: "dataset-select",
	interactionLabel: "Select a dataset",
	interactionValue: "Population"
}
```

When the user selects all datasets in a topic, `interactionLabel` is `"Select all datasets by topic"` and `interactionValue` is the topic name, e.g. `"Demography and migration"`.

### `map-draw`

**Map drawing action.** The user draws, erases, undoes, redoes or clears shapes on the `/draw` map.

```js
{
	event: "interaction",
	interactionType: "map-draw",
	interactionLabel: "Add polygon to selection"
}
```

Possible labels: `"Add polygon to selection"`, `"Remove polygon from selection"`, `"Add circle to selection"`, `"Remove circle from selection"`, `"Undo last action"`, `"Redo next action"`, `"Clear all drawn areas"`.

### `copy-area-codes`

**Copy area codes.** The user copies the area's OA or LSOA codes to the clipboard, from the profile page or the save modal.

```js
{
	event: "interaction",
	interactionType: "copy-area-codes",
	interactionLabel: "Copy Output Area codes",
	areaCode: "E07000178",
	areaName: "Oxford",
	areaType: "Lower-tier/unitary authority"
}
```

Possible labels: `"Copy Output Area codes"`, `"Copy LSOA codes"`.

### `save-print`

**Print profile.** The user clicks "Print profile" on `/build`.

```js
{
	event: "interaction",
	interactionType: "save-print",
	interactionLabel: "Print profile",
	chartTitle: "Area profile for Oxford",
	chartType: "dashboard",
	areaCode: "E07000178",
	areaName: "Oxford",
	areaType: "Lower-tier/unitary authority"
}
```

### `modal-toggle`

**Modal open or close.** A modal opens, either from its button or programmatically (for example when switching between the save and load modals), or closes. Closes are tracked however they happen: the close (×) button, Esc, clicking outside, or the modal closing itself after an area is loaded or saved.

```js
{
	event: "interaction",
	interactionType: "modal-toggle",
	interactionLabel: "Load a saved area",
	interactionValue: "open"
}
```

`interactionLabel` is the modal title: `"Load a saved area"`, `"Save current area"` or `"Edit saved areas"`. `interactionValue` is `"open"` or `"close"`.

## `fileDownload`

**File download.** The user downloads a profile, a dataset or an area as a file.

```js
{
	event: "fileDownload",
	extension: "geojson",
	filename: "oxford.geojson",
	linkText: "Download area as GeoJSON",
	linkDomain: "www.ons.gov.uk",
	areaCode: "E07000178",
	areaName: "Oxford",
	areaType: "Lower-tier/unitary authority"
}
```

Possible `linkText` values: `"Download area profile as XLSX"`, `"Download area profile as CSV"`, `"Download dataset as XLSX"`, `"Download dataset as CSV"`, `"Download area as GeoJSON"`, `"Download all areas as GeoJSON"`. Area properties are sent only for single-area profile and GeoJSON downloads.

## `embed`

**Copy embed code.** The user copies the profile's embed code on `/build`.

```js
{
	event: "embed",
	pageUrl: "https://www.ons.gov.uk/visualisations/customprofiles/profile/#",
	linkText: "Copy embed code",
	chartTitle: "Area profile for Oxford",
	chartType: "dashboard",
	areaCode: "E07000178",
	areaName: "Oxford",
	areaType: "Lower-tier/unitary authority"
}
```
