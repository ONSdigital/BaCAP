<script>
  import ONSloader from "$lib/ui/ONSloader.svelte";
  import Map from "$lib/charts/Map.svelte";
  import "$lib/css/maplibre-gl.css";
  import { onMount } from "svelte";
  import {
    mapObject,
    drawType,
    addMode,
    radiusInKm,
    selected,
    centroids,
    user_geometry,
    isLoading,
    state,
    pselect,
    currentMapZoom
  } from "$lib/stores/mapstore";
  import { handleHashSelection, handleLocalStorageSelection, handleDrawDataSelection } from "$lib/util/load-utils";

  import DrawToolbar from "$lib/layout/DrawToolbar.svelte";
  import { recolour } from "$lib/config/toolbar"; 
  import PopulationCounter from "$lib/ui/PopulationCounter.svelte";

  // variable custom testing
  $state = {
    mode: "move",
    radius: 5,
    select: "add",
    name: "",
    showSave: false,
    topics: [],
    topicsExpand: false,
    topicsFilter: "",
    infoExpand: true,
  };
  const zoomstop = 6;
  let zoom; // prop bound to map zoom level

  function init() {
    $isLoading = true;
    
    // clear local storage if it doesn't have new things in
    const drawDataString = localStorage.getItem("draw_data");
    const drawData = drawDataString ? JSON.parse(drawDataString) : null;

    if (!drawData?.lsoa) {
      localStorage.clear();
    }

    const onsbuildString = localStorage.getItem("onsbuild");
    const onsbuild = onsbuildString ? JSON.parse(onsbuildString) : null;

    if (!onsbuild?.properties?.compressedLsoa) {
      localStorage.clear();
    }

    $mapObject.on("load", async () => {
      // Main execution logic
      let hash = window.location.hash;

      if (hash.match(/#[EKNSW]\d{8}/)) {
        handleHashSelection(hash);
      } else if (localStorage.getItem("onsbuild")) {
        handleLocalStorageSelection("onsbuild");
      } else if (localStorage.getItem("draw_data")) {
        handleDrawDataSelection();
      }

      // Keep track of map zoom level
      $currentMapZoom = $mapObject.getZoom();
      $mapObject.on("moveend", () => ($currentMapZoom = $mapObject.getZoom()));
      $isLoading = false;
      selected.subscribe(recolour);
    });

  
  } //endinit

  onMount(init);

</script>

<div class="draw-page-container">
  <ONSloader isLoading={$isLoading} />
  
  <div id="map">
    <DrawToolbar {state} bind:radius={$radiusInKm}/>
    <PopulationCounter population={$pselect}/>
    <Map drawingTools={true} />
  </div>
  
</div>

<style>
  #map {
    width: 100%;
    height: 100%;
    flex: 1;
  }
  .draw-page-container{
    position:fixed;
    overflow: hidden;
    height: calc(100vh - 94px);
    width:100%;
  }
  .draw-page-container :global(*) {
    font-size: 0.875rem;
  }
</style>