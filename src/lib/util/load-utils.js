import { cdnbase } from "$lib/config/geography";
import { analyticsEvent } from "$lib/layout/AnalyticsBanner.svelte";
import { mapObject, centroids, selected, state, user_geometry } from "$lib/stores/mapstore";
import { newselect } from "$lib/config/toolbar";
import { get } from "svelte/store";
import { changeData } from "$lib/util/drawing-utils";



export async function handleHashSelection(hash) {
    let code = hash.slice(1);
    try {
      const res = await fetch(`${cdnbase}/${code.slice(0, 3)}/${code}.json`);
      const data = await res.json();
  
      newselect();
      updateSelectionWithData(data);
      updateMapWithBounds(data.properties.bounds);
      updateStateName(data.properties);
      triggerAnalyticsEvent(data.properties.areacd, state.name);
    } catch {
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
    selected.update(s=>[...s,{
      oa: new Set(centroids.expand(data.properties.c21cds)),
      lsoa: new Set(
        centroids.expand(
          data.properties.c21cds.filter(code => !code.startsWith("e00") && !code.startsWith("w00"))
        )
      ),
      geo: data.geometry,
    }]);
    user_geometry.set(data.geometry);
    changeData("userGeo", data.geometry);
  }
  
  function updateSelection(oa, lsoa, geo) {
    selected.set([{
        oa: new Set(oa),
        lsoa: new Set(get(centroids).expand(lsoa, "lsoa")),
        geo: geo,
      }]);
    user_geometry.set(geo)
    changeData("userGeo", geo);
  }
  
  function updateMapWithBounds(bounds) {
    get(mapObject).fitBounds(bounds, { padding: 40, linear: true });
  }
  
  function updateStateName(properties) {
    state.name = properties.hclnm || properties.areanm || properties.areacd;
    setDrawData();
  }
  
  function triggerAnalyticsEvent(areaCode, areaName) {
    analyticsEvent({ event: "hashSelect", areaCode, areaName });
  }  