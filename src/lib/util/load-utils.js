import { cdnbase } from "$lib/config/geography";
import { analyticsEvent } from "$lib/layout/AnalyticsBanner.svelte";
import { mapObject, centroids, selected, state, user_geometry } from "$lib/stores/mapstore";
import { newselect, setDrawData } from "$lib/config/toolbar";
import { get } from "svelte/store";
import { changeData } from "$lib/util/drawing-utils";



export async function handleHashSelection(hash) {
    let code = hash.slice(1);
    try {
      const res = await fetch(`${cdnbase}/${code.slice(0, 3)}/${code}.json`);
      const data = await res.json();
      console.log(data)
      newselect();
      updateSelectionWithData(data);
      updateMapWithBounds(data.properties.bounds);
      updateStateName(data.properties);
      triggerAnalyticsEvent(data.properties.areacd, state.name);
    } catch(error) {
      console.error("Error fetching or processing data:", error.message, error.stack);
      alert(`Requested GSS code ${code} is unavailable or invalid.`);
    }
    history.replaceState(null, null, " ");
  }
  
export function handleLocalStorageSelection(storageKey) {
    const q = JSON.parse(localStorage.getItem(storageKey));
    if (!q || !q.properties?.oaAll?.length) {
        newselect();
      return;
    }
    const bbox = get(centroids).boundsFromGeometry(q.geojson);
    updateMapWithBounds(bbox);
    updateSelection(q.properties.oaAll, q.properties.compressedToLsoa, q.geojson);
  }
  
export function handleDrawDataSelection() {
    const q = JSON.parse(localStorage.getItem("draw_data"));
    if (!q || !q.oa.length) {
        newselect();
      return;
    }
    const bbox = q.geo ? get(centroids).boundsFromGeometry(q.geo) : centroids.bounds([...q.oa], 'oa');
    updateMapWithBounds(bbox);
    updateSelection(q.oa, q.lsoa, q.geo);
  }
  
  function updateSelectionWithData(data) {
    console.log("Updating selection with data:", data);

    if (!data.properties || !Array.isArray(data.properties.c21cds)) {
      console.error("Invalid data format: c21cds is missing or not an array.");
      return;
    }

    let oaSet, lsoaSet;
    try {
      oaSet = new Set(get(centroids).expand(data.properties.c21cds,"oa"));
      lsoaSet = new Set(
        get(centroids).expand(
          data.properties.c21cds.filter(code => !code.startsWith("e00") && !code.startsWith("w00")),"lsoa"
        )
      );
    } catch (error) {
      console.error("Error expanding centroids:", error);
      return;
    }

    selected.update(s=>[...s,{
      oa: oaSet,
      lsoa: lsoaSet,
      geo: data.geometry,
    }]);
    user_geometry.set(data.geometry);
    changeData("userGeo", data.geometry);

    console.log("Updated selection:", selected);
    console.log("Updated user geometry:", user_geometry);
  }
  
  function updateSelection(oa, lsoa, geo) {
    console.log("Updating selection with:", { oa, lsoa, geo });
    selected.set([{
        oa: new Set(oa),
        lsoa: new Set(get(centroids).expand(lsoa, "lsoa")),
        geo: geo,
      }]);
    user_geometry.set(geo)
    changeData("userGeo", geo);
  }
  
  function updateMapWithBounds(bounds) {
    console.log("Updating map with bounds:", bounds);
    get(mapObject).fitBounds(bounds, { padding: 40, linear: true });
  }
  
  function updateStateName(properties) {
    console.log("Updating state name with properties:", properties);
    state.name = properties.hclnm || properties.areanm || properties.areacd;
    setDrawData();
  }
  
  function triggerAnalyticsEvent(areaCode, areaName) {
    console.log("Triggering analytics event:", { areaCode, areaName });
    analyticsEvent({ event: "hashSelect", areaCode, areaName });
  }  