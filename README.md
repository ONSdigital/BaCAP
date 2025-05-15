# BaCAP (Build a Custom Area Profile)

## Demos
[Version 1](https://stately-salamander-b9768e.netlify.app/draw/)

[Version 2](https://mellifluous-hamster-ecb01e.netlify.app/)

## Running locally
Install packages with 
`npm install`

and then `npm run dev`.

## Build for production
Run `npm run build:prod`

## Detailed information
### Build step
In the folder `raw_data` contains `.csv` files with every OA/LSOA and their parents geographies codes (LSOA21CD, MSOA21CD, LTLA21CD, RGN21CD), the lng, lat of the population weighted centroid, and finally the 2022 mid year estimate of the population. 

These are processed by `/scripts/compress-data` by running `npm run compress-data`. This converts it into JamesT's special format. And saves files in `/static/data` as two lookup files.

These are loaded by the app. 

### Version
The version is stored in `src/lib/stores/mapstore.js` as `export const version = writable(3);`. This needs updated if you are updating datasets metadata. 

### topics.json
The topics are set in `/src/lib/config/topics.json`. This is an important file and drives a lot of the page content. It has the following fields


| Name            | Type            | What it does                                                                                                                                        |
|-----------------|-----------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| code            | String          | Code for the dataset/topic used in the app                                                                                                          |
| label           | String          | Human readable label for the dataset/topic                                                                                                          |
| desc            | String          | Short description of the topic                                                                                                                      |
| dateLabel       | String          | Shorter date label used on the card in the profile                                                                                                                      |
| dateLabelLong   | String          | Longer date label used in the data download                                                                                                             |
| tableCode       | Array           | Array of tableCodes on NOMIS to query                                                                                                               |
| cellCode        | String          | Which cellCode to query on NOMIS. This will change for each dataset/topic. This could be things like male/female, age groups, causes of death etc.  |
| measures        | String or Array | Which measures to query on NOMIS. This is normally 20100 for counts or 20301 for percentages.                                                       |
| chart           | String          | Determines which chart to display on the tiles.                                                                                                     |
| unit            | String          | Units for the dataset/topic e.g. people, households. This is displayed on the tiles.                                                                |
| base            | String          | Metadata for the tile. This is displayed on the tiles, e.g X households of all households.                                                          |
| categories      | Array           | Array of objects which is combined when making queries to NOMIS, e.g. age groups.                                                                   |
| lowestGeography | String          | Sets the lowest available geography for the dataset/topic. Needed to show just OA datasets on build page when only OAs are selected.                |
| doNotRound      | Boolean         | Whether to round the results.                                                                                                                       |
| source          | String          | Source of the dataset/topic to be displayed on tiles and data download                                                                              |
| topic           | String          | Datasets are grouped on the build page by these topics.                                                                                             |
| validFromVersion       | Integer           | Version number where the dataset is available from                                                                                     |
| lastValidVersion       | Integer           | Version number where the dataset is not available after this                                                                               |
| versions       | Object           | uses integer as keys with metadata to overwrite                                                                               |



### Home page
Uses +layout.svelte to set the cookie banner and phase banner (alpha).

Uses topics.json to populate the available datasets by getting valid datasets for the version.

### Draw page
Uses a toolbar component in svelte-components, but it's on a tag called `toolbar` on npmjs. Which means when you are using npm to get svelte-components, you need `npm install @onsvisual/svelte-components@toolbar`. This means that it won't be up to date with svelte-components. 

I think most of the state for this page is saved in a store include one called state. 

There is a javascript class called Centroids which is set to the `centroids` store on the `+layout.svelte` in `(main)`.

The page checks for a GSS code on load, otherwise it uses the `localStorage` items `onsbuild` from the build page or `draw_data` from the draw page.

`$selected` is a store that hold which OAs/LSOAs are selected. Whenever this store updates, through the `subscribe` method, it runs the function `recolour`.

`DrawToolbar.svelte` sets up the functions for the toolbar, with most functions set up in `toolbar.js`.

The rest of the functions for the draw page is in `/src/libi/util/drawing-utils.js`.

### Build page
Bit messier than the draw page as loads of the state are saved as local variables rather than stores. 

Again this page checks for a GSS code on the URL. If so it uses the compressed codes from the CDN. 

Topics/datasets on the left are driven from the topics.json. The build page then generates an embedhash and iframes the `page.svelte` from the embed route.

A useful thing to debug with this page is the `getData` function from the `build-util` as it'll show you requests to NOMIS. I recommend [Postman](https://www.postman.com/) to check queries. 

The data for each dataset/topic is then converted to base64 and encoded into the URL.

The version number is also now embedded in the hash. 

### Embed page
This page decodes from base64 to get back to the data and then loops through all the datasets chosen. It'll decide what visualisations to choose by what's set in the topics.json. It reads the version from the hash then applies the version specific overrides. 

### Updating metadata
To update specific metadata for a dataset/topic do something like this. This example is for residential sales,  when it sends the query it uses the `date` field which matches what NOMIS expects for the `date` field. It then uses the `dateLabel` and `dataLabelLong` for the specific version to overwrite the base metadata when displaying the card or creating the data download.

```
"versions":{
  "2":{
    "dateLabel":"Year ending Sept 2023",
    "date":"2023-09",
    "dateLabelLong": "Year ending September 2023"
  },
  "3":{
    "dateLabel":"Year ending Sept 2024",
    "date":"2024-09",
    "dateLabelLong": "Year ending September 2024"
  }
}
```
