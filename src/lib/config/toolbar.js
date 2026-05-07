import { mapObject,drawType, centroids, selected, user_geometry, isLoading, state, pselect, addMode, buildstate } from "$lib/stores/mapstore";
import { update, simplifyGeo, geoBlob, clearGeo, changeData } from "$lib/util/drawing-utils";
import bbox from "@turf/bbox";
import { analyticsEvent } from "@onsvisual/svelte-components";
import { get } from "svelte/store";
import { download, clip } from "$lib/util/functions";

import {goto} from '$app/navigation';
import {base} from '$app/paths';

export const blank_geo = {type: 'Feature',geometry: {type: 'Polygon',coordinates: [],}}

export function doSelect(e) {
  newselect();
  if (e.detail.type == "place") {
    let bbox = e.detail.bbox;
    let isEW = e.detail.areacd === "K04000001";
    let oa = new Set(get(centroids).expand(isEW ? ["E92000001", "W92000004"] : e.detail.oa21cds,'oa'));
    let lsoa = new Set(get(centroids).expand(isEW ? ["E92000001", "W92000004"] : e.detail.lsoa21cds,'lsoa')); 
    let geometry = e.detail.geometry;
    let geojson = {type: 'Feature', geometry: geometry}

    user_geometry.set(geojson);
    selected.update(s=>[...s,{oa:oa,lsoa:lsoa,geo:geojson}])
    changeData("userGeo", geometry);
    get(mapObject).fitBounds(bbox, { padding: 40 });
    state.name = e.detail.areanm;
  } else if (e.detail.type == "postcode") {
    // does this type exist??
    // I don't think this block runs
    let center = e.detail.center;
    get(mapObject).flyTo({ center: center, zoom: 14 });
    get(mapObject).once("idle", () => {
      let coords = get(mapObject).project(center);
      let features = get(mapObject).queryRenderedFeatures([coords.x, coords.y], {
        layers: ["bounds"],
      });
      // add in lsoas and geo???
      var oa = new Set(features.map((f) => f.properties.oa));
      selected.update(s=>[...s,{oa}])
    });
  }
  setDrawData();
}

export async function copyAreasToClipboard(codes) {
  // const latest = get(selected).at(-1);
  // const oas = Array.from(latest[type])
  //   .join(',');

  const string = [...codes].join(',')

  try {
    await navigator.clipboard.writeText(string);
    console.log('Areas copied to clipboard!'); // Optional success message
    return true;
  } catch {
    console.error('Failed to copy areas to clipboard');
    // Handle the error appropriately, perhaps by informing the user
    return false;
  }
  
}

export function recolour(){
  const items = get(selected).at(-1);

  const totalPopulation = items.oa && items.oa.size
    ? [...items.oa]
        .map((d) => get(centroids).population(d) || 0)
        .reduce((a, b) => a + b, 0)
    : 0;


  pselect.set(totalPopulation);

  if (!items.oa || !items.oa.size) return;

    // This makes the OA layer coloured in when selecting an area
    // if ($mapObject.getLayer("bounds"))
    //   $mapObject.setPaintProperty("bounds", "fill-color", [
    //     "match",
    //     ["get", "areacd"],
    //     ["literal", ...items.oa],
    //     "rgba(32, 96, 149, 0.4)",
    //     "transparent",
    //   ]);

    if (get(mapObject)) {
      changeData("userGeo", items.geo);
    }
      
    if (get(selected).length > 1 && state.name) state.name = "";
  }



/**
 * Undo last selection by removing the last item from selected store.
 */
export function undo() {
  selected.update(s => {
    const newArray = s.slice(0, -1);
    return newArray; // Reassign the new array
  });
  const items = get(selected).at(-1);
  setDrawData();
  if (get(mapObject)) {
    changeData("userGeo", items.geo);
  }
}


/**
 * Saves data and redirects to the build page.
 */
export async function buildProfile() {
  isLoading.set(true);
  const redirect = await savedata();
  if (redirect) {
    goto(`${base}/build/`);
  } else {
    console.error("Not redirecting", redirect);
    isLoading.set(false);
  }
}

/**
 * Downloads the selected area as a GeoJSON file.
 */
export async function downloadArea(state) {
  console.log("downloadArea", state);
  const centroidVal = get(centroids);
  const selectedVal = get(selected);
  const mapObjectVal = get(mapObject);

  if (!selectedVal.length) return console.error("No area selected.");

  let data = await centroidVal.simplify(
    state.name,
    selectedVal[selectedVal.length - 1],
    mapObjectVal
  );

  let blob = geoBlob(data);
  download(
    blob,
    `${state.name ? state.name.replaceAll(" ", "_") : "custom_area"}.geojson`
  );

  let opts = state.name ? { areaName: state.name } : {};
  analyticsEvent({
    event: "fileDownload",
    fileExtension: "json",
    ...opts,
  });
}

/**
 * Saves drawing data into local storage.
 */
export function setDrawData() {
  const selectedVal = get(selected);
  let items = selectedVal[selectedVal.length - 1];

  // update user drawn geometry in the store
  user_geometry.set(items.geo); 

  items = JSON.stringify(items, (_key, value) =>
    value instanceof Set ? [...value] : value
  );

  localStorage.setItem("draw_data", items);
}

/**
 * Saves the selected data and prepares it for building.
 */
export async function savedata() {
  document.querySelector("#mapcontainer div canvas").style.cursor = "wait";

  const centroidVal = get(centroids);
  const selectedVal = get(selected);
  const mapObjectVal = get(mapObject);

  return centroidVal
    .simplify(state.name, selectedVal[selectedVal.length - 1], mapObjectVal)
    .then((q) => {
      if (q) {
        const items = selectedVal[selectedVal.length - 1];

        if (items.oa.size > 0) {
          if (q.error) return false;

          localStorage.setItem("onsbuild", JSON.stringify(q));
          document.querySelector("#mapcontainer div canvas").style.cursor = "auto";
          return true;
        }
      }

      alert("No features selected.");
      document.querySelector("#mapcontainer div canvas").style.cursor = "auto";
      return false;
    });
}

/**
 * Loads GeoJSON file and updates selection.
 */
export function loadGeo(uploader) {
  let file = uploader.files[0] || null;

  if (file) {
    // selected.set({ oa: new Set(), lsoa: new Set(), geo: blank_geo });
    newselect();
    const reader = new FileReader();

    reader.onload = async (e) => {
      let b = JSON.parse(e.target.result);
      if (b.type == "FeatureCollection") {
        b = b.features[0];
      } else if (b.type == "Geometry") {
        b = { type: "Feature", geometry: b, properties: {} };
      } else if (b.type == "Polygon") {
        b = { type: "Feature", geometry: b, properties: {} };
      } else if (b.type == "GeometryCollection") {
        b= { type: "Feature", geometry: b.geometries[0], properties: {} };
      }

      if (b.properties && (b.properties.oa21cds || b.properties.codes_compressed)) {
        let oa = b.properties.oa21cds || b.properties.codes_compressed;
        let lsoa = b.properties.lsoa21cds || b.properties.codes_compressed_to_lsoa;
        let bb = b.properties.bounds || b.properties.bbox || bbox(b);

        selected.update((sel) => [
          ...sel,
          {
            oa: new Set(get(centroids).expand(oa, "oa")),
            lsoa: new Set(get(centroids).expand(lsoa, "lsoa")),
            geo: b,
          },
        ]);

        user_geometry.set(b);
        changeData("userGeo", b);
        get(mapObject).fitBounds(bb, { padding: 40 });
      } else if (b.geometry) {
        if (JSON.stringify(b.geometry).length > 10000)
          b.geometry = simplifyGeo(b.geometry, 10000);
        let bb = bbox(b);
        await update(b);
        // user_geometry.set(b);
        // changeData("userGeo", b);
        get(mapObject).fitBounds(bb, { padding: 40 });
      } else {
        alert("Invalid geography file. Must be GeoJSON format.");
      }

      if (b) {
        let props = b.properties;
        state.name = props?.areanm || props?.name || "";
        setDrawData();
        let opts = state.name ? { areaName: state.name } : {};
        analyticsEvent({ event: "geoUpload", ...opts });
      }
    };

    reader.readAsText(file);
  }
}

export const newselect = function () {
        clearGeo();
        localStorage.removeItem('draw_data');
        localStorage.removeItem('onsbuild');
        user_geometry.set(blank_geo)
        pselect.set(0);
        state.name = "";
        if(get(selected).at(-1).oa.size == 0) return; // don't add a new blank selection if the last one is already blank
        selected.update(s=>[...s,{ oa: new Set(), lsoa: new Set(), geo: blank_geo }]);
      };



  export function zoomIn() {
    mapObject.subscribe((map) => {
      if (map && typeof map.zoomIn === "function") {
        map.zoomIn();
      }
    })();
  }

  export function zoomOut() {
    mapObject.subscribe((map) => {
      if (map && typeof map.zoomOut === "function") {
        map.zoomOut();
      }
    })();
  }

  export function setPanMode(){
    drawType.set('move');
  }

  export function setDrawMode(){
    drawType.set('polygon');
    addMode.set(true)
  }

  export function setRadiusMode(){
    drawType.set('radius');
    addMode.set(true)

  }

  export function setEraseMode(){
    drawType.set('radius');
    addMode.set(false)
  }






