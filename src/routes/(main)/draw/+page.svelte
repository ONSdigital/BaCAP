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

    if (!onsbuild?.properties?.compressedToLsoa) {
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

  $:console.log('selected',$selected)
</script>

<div class="draw-page-container">
  <ONSloader isLoading={$isLoading} />
  
  <div id="map">
    <DrawToolbar {state} bind:radius={$radiusInKm}/>
    <PopulationCounter population={$pselect}/>
    <Map drawingTools={true} />
  </div>
  
</div>


 <!-- <nav>
  <div class="nav-left" style:z-index={99}>
    {#each modes as mode}
      <label
        id={"init_" + mode.key}
        class:active={state.mode == mode.key}
        class:disabled={zoom < zoomstop}
        title={mode.label}
        use:tooltip
      >
        <input
          type="radio"
          bind:group={state.mode}
          name="mode"
          value={mode.key}
          disabled={zoom < zoomstop}
        />
        <Icon type={mode.key} />
      </label>
    {/each}
  </div>

  <div class="nav-right">
    <button
      title="Undo last action"
      use:tooltip
      disabled={$selected.length < 2}
      on:click={() => {
        $selected = $selected.slice(0, -1);
        setDrawData();
      }}
    >
      <Icon type="undo" />
    </button>
    <button
      class="alert"
      title="Clear all areas"
      use:tooltip
      on:click={() => {
        newselect();
        state.name = "";
      }}
    >
      <Icon type="clear" />
    </button>

    <button
      title={state.showSave ? "Close save options" : "Save selected area"}
      use:tooltip
      on:click={() => (state.showSave = !state.showSave)}
      class:active={state.showSave}
      disabled={!$selected[$selected.length - 1].oa.size > 0}
    >
      <Icon
        type={state.showSave ? "add" : "download"}
        rotation={state.showSave ? 45 : 0}
      />
    </button>

    <button
      class="text confirm"
      disabled={!$selected[$selected.length - 1].oa.size > 0}
      on:click={() => {
        isLoading = true;
        savedata().then((rdir) => {
          // console.warn(rdir);
          if (rdir) {
            goto(`${base}/build/`);
          } else {
            console.error("not redirecting", rdir);
            isLoading = false;
          }
        });
      }}
    >
      <span>Build profile</span><Icon type="chevron" />
    </button>
  </div>
</nav> -->
<!-- {#if state.showSave}
  <nav class="tray">
    <div />
    <div class="save-buttons">
      <input
        type="text"
        class="input-text"
        bind:value={state.name}
        placeholder="Type your area name"
      />
      <button
        class="text"
        on:click={async () => {
          let data = await $centroids.simplify(
            state.name,
            $selected[$selected.length - 1],
            $mapObject,
          );
          let blob = geoBlob(data);
          download(
            blob,
            `${state.name ? state.name.replaceAll(" ", "_") : "custom_area"}.geojson`,
          );
          state.showSave = false;
          let opts = state.name ? { areaName: state.name } : {};
          analyticsEvent({
            event: "fileDownload",
            fileExtension: "json",
            ...opts,
          });
        }}
      >
        <Icon type="download" /><span>Save geography</span>
      </button>
      <button
        class="text"
        on:click={() => {
          clip(
            Array.from($selected[$selected.length - 1].oa).join(","),
            "Copied output area codes to clipboard",
          );
          state.showSave = false;
          let opts = state.name ? { areaName: state.name } : {};
          analyticsEvent({ event: "geoCopy", ...opts });
        }}
      >
        <Icon type="copy" /><span>Copy area codes</span>
      </button>
    </div>
  </nav>
{:else if showTray}
  <nav class="tray">
    {#if state.mode == "radius"}
      <div class="slider">
        <span>Radius</span>
        <Slider bind:value={$radiusInKm} />
        <input type="number" class="input-text" bind:value={$radiusInKm} step="0.1" min="0" max="10"/>km
      </div>
    {/if}
    <div class="select-mode">
      <span>Selection mode </span>
      <label
        class:active={state.select === "add"}
        title="Add to selection"
        use:tooltip
      >
        <input
          type="radio"
          bind:group={state.select}
          name="select"
          value="add"
        />
        <Icon type="selectAdd" />
      </label>
      <label
        class:active={state.select === "subtract"}
        title="Remove from selection"
        use:tooltip
      >
        <input
          type="radio"
          bind:group={state.select}
          name="select"
          value="subtract"
        />
        <Icon type="selectSubtract" />
      </label>
    </div>
  </nav>
{/if} -->



<!-- <aside class="info-box" style:top="{showTray || state.showSave ? 200 : 158}px">
  <div class="search">
    <Select on:select={doSelect} />
    <button
      title="Upload a saved area"
      use:tooltip
      on:click={() => uploader.click()}
    >
      <Icon type="upload" />
    </button>
    <input
      type="file"
      accept=".geojson,.json"
      style:display="none"
      bind:this={uploader}
      on:input={loadGeo}
    />
  </div>
  {#if state.infoExpand}
    <div class="message">
      {#if (!zoom || zoom < zoomstop) && $selected[$selected.length - 1].oa.size > 0}
        <strong role="status">Zoom in to continue</strong><br />
        You can
        <button
          class="btn-link"
          on:click={() => {
            let q = $selected[$selected.length - 1];
            let bbox = $centroids.bounds([...q.oa],'oa');
            $mapObject.fitBounds(bbox, { padding: 40 });
          }}>click here</button
        > to return to the area you have drawn.
      {:else if !zoom || zoom < zoomstop}
        <strong role="status">How to get started</strong><br />
        Zoom in to an area on the map to start drawing, or use the search box above
        to find a ready-made area.
        <a
          href="https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates/articles/buildacustomareaprofile/2023-01-17"
          target="_blank"
          rel="noreferrer">Read more</a
        >
        <span style:font-size="0.8em" style:margin-left="2px"
          ><Icon type="launch" /></span
        >
      {:else if state.mode == "polygon"}
        <strong role="status">Draw a polygon mode</strong>
        <span class="mode-icon">
          {state.select == "add" ? "+" : "–"}
          <Icon type={state.mode} />
        </span>
        <br />
        Click on the map to draw a polygon. Click again on the first or last point
        to close the polygon.
      {:else if state.mode == "radius"}
        <strong role="status">Draw a radius mode</strong>
        <span class="mode-icon">
          {state.select == "add" ? "+" : "–"}
          <Icon type={state.mode} />
        </span><br />
        Select a radius in kilometres from the menu, then click on the map to draw
        a circle.
      {:else if state.mode == "select"}
        <strong role="status">Click and select mode</strong>
        <span class="mode-icon">
          <Icon type={state.mode} />
        </span><br />
        Click an individual area to add or remove it from your selection.
      {:else}
        <strong role="status">Pan and zoom mode</strong>
        <span class="mode-icon">
          <Icon type={state.mode} />
        </span><br />
        Explore the map to find a location of interest, then select a drawing tool
        from the menu.
      {/if}
      <br />
    </div>
  {/if}
  <div class="population">
    <span>
      {#if pselect}
        Population selected: <strong
          >{roundCount(pselect).toLocaleString("en-GB")}</strong
        >
      {:else}
        No areas selected
      {/if}
    </span>
    <button
      on:click={() => (state.infoExpand = !state.infoExpand)}
      title={state.infoExpand ? "Hide info" : "Show info"}
      use:tooltip
    >
      <Icon type="chevron" rotation={state.infoExpand ? 90 : -90} />
    </button>
  </div>
</aside>  -->
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

  :global(*) {
    font-size: 0.875rem;
  }
</style>