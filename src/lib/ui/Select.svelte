<script context="module">
  import { base } from "$app/paths";
  import { cdnbase } from "$lib/config/geography";
  import { csvParse, autoType } from "d3-dsv";
  import { analyticsEvent } from "@onsvisual/svelte-components";
  import Pbf from "pbf";
  import vt from "@mapbox/vector-tile";
  import tb from "@mapbox/tilebelt";
  import inPolygon from "@turf/boolean-point-in-polygon";

  // Config for places data
  const geotypes = [
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
      label: "Built-up area",
    },
    { keys: ["E35", "K06", "W38"], label: "Built-up area, sub-division" },
  ];
  export const geotypesLookup = (() => {
    let lookup = {};
    geotypes.forEach((g) => g.keys.forEach((k) => (lookup[k] = g.label)));
    return lookup;
  })();

  async function getData(url) {
    let res = await fetch(url);
    return csvParse(await res.text(), autoType);
  }

  export async function getPlaces() {
    let data = await getData(`${base}/data/places-list.csv`);
    data = data.filter((d) => d.areanm); // Hack for faulty areas. Filter out rows without a name
    let lookup = {};
    data.forEach((d) => (lookup[d.areacd] = d));
    data.forEach((d) => {
      let geocd = d.areacd.slice(0, 3);
      let geotype = geotypesLookup[geocd];

      d.group = d.parentcd
        ? `${geotype} in ${lookup[d.parentcd].areanm}`
        : geotype;
    });
    data.sort((a, b) => a.areanm.localeCompare(b.areanm));
    return data;
  }

  // Get boundary, bbox and output area lookup
  export async function getPlace(code, group = "") {
    let geo;
    try {
      let geoRaw = await fetch(`${cdnbase}/${code.slice(0, 3)}/${code}.json`);
      geo = await geoRaw.json();
    } catch (err) {
      // console.log(err);
      return { type: null };
    }

    let place = {
      type: "place",
      areanm: geo.properties.areanm
        ? geo.properties.areanm
        : geo.properties.areacd,
      areacd: geo.properties.areacd,
      group,
      geometry: geo.geometry,
      bbox: geo.properties.bounds,
      oa21cds: geo.properties.oa21cds,
      lsoa21cds: geo.properties.lsoa21cds ?? [],
      msoa21cds: geo.properties.msoa21cds ?? [],
    };
    analyticsEvent({
      event: "searchSelect",
      areaCode: place.areacd,
      areaName: place.areanm,
      areaType: geotypesLookup[place.areacd.slice(0, 3)],
    });

    return place;
  }

  export async function getOAfromLngLat(lng, lat) {
    const tile = tb.pointToTile(lng, lat, 12);
    const url = `https://cdn.ons.gov.uk/maptiles/administrative/2021/oa/v3/boundaries/${tile[2]}/${tile[0]}/${tile[1]}.pbf`;
    try {
      const geojson = await getTileAsGeoJSON(url, tile);
      const pt = { type: "Point", coordinates: [lng, lat] };
      for (const f of geojson.features) {
        if (inPolygon(pt, f.geometry)) return f.properties.areacd;
      }
      return null;
    } catch {
      return null;
    }
  }

  async function getTileAsGeoJSON(url, tile) {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    const pbf = new Pbf(buf);
    const geojson = { type: "FeatureCollection", features: [] };
    const t = new vt.VectorTile(pbf);
    for (const key in t.layers) {
      for (let i = 0; i < t.layers[key].length; i++) {
        geojson.features.push(t.layers[key].feature(i).toGeoJSON(...tile));
      }
    }
    return geojson;
  }

  function makeGSScodes(str) {
    if (str.length < 10 && /^[eknsw]\d+$/i.test(str) && str.toUpperCase().slice(0, 3) in geotypesLookup) {
      if (str.length === 9) return [str.toUpperCase()].map(cd => ({areacd: cd, areanm: cd}));
      return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
        .slice(str.length < 4 || +str.slice(3) === 0 ? 1 : 0)
        .map(d => `${str.toUpperCase().padEnd(8, "0")}${d}`)
        .map(cd => ({areacd: cd, areanm: cd}));
    } else return [];
  }
</script>

<script>
  import { onMount, createEventDispatcher } from "svelte";
  import { AccessibleSelect } from "@onsvisual/svelte-components";

  const dispatch = createEventDispatcher();

  export let id = "select";
  export let idKey = "areacd";
  export let labelKey = "areanm";
  export let groupKey = "group";
  export let value = null;
  export let placeholder = "Find an area or postcode";
  export let mode = "search";
  export let isClearable = true;
  export let autoClear = false;
  export let label;

  // Data and state for select box
  let items;
  let options;

  const startsWithFilter = (str, filter) =>
    str.toLowerCase().startsWith(filter.toLowerCase());

  // Convert getOptions → ONS loadOptions
  export async function loadOptions(query, populateResults) {
    const filterText = query;

    // Postcode lookup
    if (/^[a-z]{1,2}\d/i.test(filterText)) {
      if (/^[ew]\d{3}/.test(filterText)) {
        populateResults(makeGSScodes(filterText));
        return;
      }
      try {
        const res = await fetch(
          `https://api.postcodes.io/postcodes/${filterText}/autocomplete`
        );
        const json = await res.json();

        const results = json.result
          ? json.result.map((d) => ({
              id: d,
              label: d,
              areacd: d,
              areanm: d,
              group: "",
              postcode: true,
            }))
          : makeGSScodes(filterText);

        populateResults(results);
        return;
      } catch (e) {
        populateResults(makeGSScodes(filterText));
        return;
      }
    }

    // Name search
    const results = items
      .filter((p) => p.areanm.match(new RegExp(`\\b${filterText}`, "i")))
      .sort((a, b) => {
        const fa = startsWithFilter(a.areanm, filterText);
        const fb = startsWithFilter(b.areanm, filterText);
        return fa === fb ? 0 : fa ? -1 : 1;
      })
      .map((p) => ({
        id: p.areacd,
        label: p.areanm,
        ...p,
      }));

    populateResults(results);
    return;
  }

  async function handleSelect(event) {
    const selected = event.detail;

    if (!selected) return;

    // Ignore “Uploaded area”
    if (selected.group === "Uploaded area") return;

    // Handle postcode special case
    if (selected.postcode) {
      const res = await fetch(
        `https://api.postcodes.io/postcodes/${selected.areacd}`
      );
      const json = await res.json();

      if (json.result) {
        const oa = await getOAfromLngLat(
          json.result.longitude,
          json.result.latitude
        );

        if (oa) {
          const place = await getPlace(oa, "Output area");
          dispatch("select", place);
        }
      }

      return;
    }

    // Standard area selection
    const place = await getPlace(selected.areacd, selected.group);
    dispatch("select", place);
  }

  function handleClear() {
    dispatch("clear",null); // or `dispatch("clear")` if preferred
  }

  onMount(() => {
    getPlaces().then((results) => {
      items = results;
      options = results.map((item) => ({
        id: item[idKey],
        label: item[labelKey],
        group: item[groupKey],
      }));
    });
  });
</script>

{#if options}
  <AccessibleSelect
    {id}
    {label}
    {options}
    {mode}
    {placeholder}
    clearable={isClearable}
    {autoClear}
    {labelKey}
    {groupKey}
    {loadOptions}
    showAllValues={!value}
    bind:value
    on:change={handleSelect}
    on:clear={handleClear}
  />
{/if}
