<script>
import { setDrawMode,setPanMode, setRadiusMode, zoomIn, zoomOut, newselect, undo, buildProfile, downloadArea, loadGeo, setEraseMode, doSelect, copyAreasToClipboard } from "$lib/config/toolbar"; 
import { Input, ToolbarsContainer,Toolbar,ToolbarButton, ToolbarDivider,ToolControls,ToolControl, Icon, Button, ButtonGroup,ButtonGroupItem } from "@onsvisual/svelte-components";
import { get } from "svelte/store";
import { mapObject, selected,currentMapZoom, user_geometry, addMode } from "$lib/stores/mapstore";
import { minzoom, maxzoom } from "$lib/config/geography";
import Select from "$lib/ui/Select.svelte";
import SliderCombo from "$lib/ui/SliderCombo.svelte";
import { base } from "$app/paths";
import { updateLocalStorage } from "$lib/util/build-utils";
import { update } from "$lib/util/drawing-utils";
import bbox from "@turf/bbox";

let container;
let selectedArea = null;
let uploader;
export let state;
export let radius=0.5;

$:updateLocalStorage($state.name)

let confirmed = {oa: false, lsoa: false};

async function setConfirmed(type = 'oa') {
  confirmed[type] = true;
  await new Promise((resolve) => setTimeout(resolve, 3000));
  confirmed[type] = false;
}

async function addToSelection(selectedArea){
  if (!selectedArea?.detail?.geometry) return;

  $addMode = true;
  await update({ type: 'Feature', geometry: selectedArea.detail.geometry, properties: {} });

  const newGeo = get(user_geometry);

  if ($mapObject && newGeo) {
    const bb = bbox(newGeo);
    $mapObject.fitBounds([[bb[0], bb[1]], [bb[2], bb[3]]], { padding: 40 });
  }
}

</script>

<div id="toolbar" style="z-index:99;position:relative;pointer-events:none;">
  <ToolbarsContainer bind:this={container}>
    <Toolbar>
      <ToolbarButton id="move" icon="move" label="Move and Pan" on:click={setPanMode} sticky>
        <p>Left-click and hold anywhere on the map to move.</p><img src="{base}/img/movepan.png" alt='Move and pan' />
      </ToolbarButton>

      <ToolbarButton id="polygon" icon="polygon" label="Draw a polygon" hasAriaControls on:click={setDrawMode} sticky>
        <p>Draw a custom shape. Click on the map to set the corners of your shape boundary and the tool will automatically connect the points to form a polygon.</p><img src="{base}/img/polygon.png" alt='Map showing drawing boundaries by clicking.'/>
      </ToolbarButton>

      <ToolbarButton id="circle" icon="radius" label="Draw a circle" hasAriaControls on:click={setRadiusMode} sticky>
        <p>Select a circular area on the map. Choose your radius size before clicking on the map to select.</p>
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton id="erase" icon="erase" label="{$addMode ? "Enable" : "Disable"} erase mode" selected={!$addMode} on:click={() => $addMode = !$addMode} hasAriaControls toggle>
        <p>Toggle erase mode. In erase mode, if you draw a polygon or radius, it will be removed from your selection instead of added.</p>
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton id="clear" icon="bin" label="Clear all drawn areas" on:click={newselect} transient>
        <p>Clear all selected areas from the map.</p>
      </ToolbarButton>
      <ToolbarButton id="undo" icon="undo" label="Undo last step" on:click={undo} disabled={$selected.length < 2} transient>
        <p>Undo your last action.</p>
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton id="zoomin" icon="zoomin" label="Zoom in" on:click={zoomIn} transient disabled={$currentMapZoom >= maxzoom}>
        <p>Zoom in.</p>
      </ToolbarButton> 

      <ToolbarButton id="zoomout" icon="zoomout" label="Zoom out" on:click={zoomOut} transient disabled={$currentMapZoom <= minzoom}>
        <p>Zoom out.</p>
      </ToolbarButton>
      
      
      <!-- <ToolbarButton id="redo" icon="redo" label="Redo last step" disabled /> -->
      <ToolbarDivider />
      <ToolbarButton id="search" icon="search" label="Search for an area" on:click={setPanMode} sticky>
        <p>You can use the Area search tool to quickly search for and automatically select defined areas and boundaries.</p>
      </ToolbarButton>

      <ToolControls slot="controls">
        <ToolControl id="polygon">
          <p>
            Click or tap an area on the map to add a node to the shape. To apply a shape, close it
            by clicking or tapping on the starting node.
          </p>
        </ToolControl>
        <ToolControl id="circle">
          <p>Select a radius size and click or tap on the map to select an area.</p>
          <SliderCombo min={0.1} max={20} step={0.1} bind:value={radius}/>
        </ToolControl>
        <ToolControl id="erase">
          <p>Select a radius size and click or tap on the map to remove an area.</p>
          <SliderCombo min={0.1} max={20} step={0.1} bind:value={radius}/>
        </ToolControl>
        <ToolControl id="search">
          <form id="search-form" on:submit|preventDefault={() => doSelect(selectedArea)}> 
            <Select on:select={(e) => {
              selectedArea = e;
              document?.getElementById?.('search-inputs')?.firstElementChild?.focus?.();
            }} label="Use the search to select an area to apply it to the map." id="draw-page-search" autoFocus={true}/>
            <div id="search-inputs">
              <Button type="submit" small>Select area</Button>
              {#if $selected[$selected.length - 1]?.geo?.geometry?.coordinates?.length}
                <Button on:click={() => addToSelection(selectedArea)} small variant='secondary'>Add to current selection</Button>
              {/if}
            </div>
          </form>
        </ToolControl>
      </ToolControls>
    </Toolbar>

    <Toolbar>
      <ToolbarButton id="download" icon="download" label="Download selected area" disabled={!$selected[$selected.length - 1].oa.size > 0}>
        <p>You can save a selected area as a GeoJSON file, which you can use at a later time  or share with another person to upload and reselect that area.</p>
      </ToolbarButton>
      <ToolbarButton id="upload" icon="upload" label="Upload a GeoJSON boundary" on:click={() => uploader.click()}>
        <p>To automatically select a defined custom area, you can upload a GeoJSON file that had been saved previously.</p>
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton id="help" icon="help" label="Help" on:click={container.resetHelp}>
        <p>To show help and guidance at any time, select this option in the toolbar.</p>
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton id="getstarted" custom label="Get started">
        <p>Once you are happy with the area shape, you can start choosing from a wide variety of datasets to build your area profile.</p>
        <div slot="custom">
          <Button disabled={!$selected[$selected.length - 1].oa.size > 0} icon="arrow" iconPosition="after" small on:click={buildProfile}>Build profile</Button>
        </div>
      </ToolbarButton>
      <ToolControls slot="controls">
        <ToolControl id="download">
          <div id="download-toolbar" style="width: 250px;">
            <Input bind:value={$state.name} id="nameinput" label="Name your area to download"/>
            <Button variant="primary" small icon="download" on:click={() => downloadArea($state)}>Download GeoJSON file</Button>
            <div id="copy-area-codes">
              <p class="clipboard-label ons-u-fs-r--b">Copy best-fit area codes</p>
              <!-- <textarea>{Array.from($selected[$selected.length-1].oa)
                .join(',')}
              </textarea> -->
              <Button variant="secondary" small icon="copy" on:click={async () => {
                const hasCopied = copyAreasToClipboard($selected[$selected.length-1].oa);
                if (hasCopied) setConfirmed('oa');
                }}>Copy Output Area codes</Button>
              {#if confirmed.oa}<Icon type="tick" marginLeft/>{/if}
              <br/>
              <!-- <textarea>{Array.from($selected[$selected.length-1].lsoa)
                .join(',')}
              </textarea> -->
              <Button variant="secondary" small icon="copy" on:click={async () => {
                const hasCopied = copyAreasToClipboard($selected[$selected.length-1].lsoa);
                if (hasCopied) setConfirmed('lsoa');
                }}>Copy LSOA codes</Button>
              {#if confirmed.lsoa}<Icon type="tick" marginLeft/>{/if}
            </div>
          </div>
        </ToolControl>
      </ToolControls>
    </Toolbar>
  </ToolbarsContainer>
</div>

<input
      type="file"
      accept=".geojson,.json"
      style:display="none"
      bind:this={uploader}
      on:input={loadGeo(uploader)}
    />
<style>
  p {
   margin: 0;
   line-height: 1.4;
   box-sizing: border-box;
  }

  img {
    margin-top: 12px;
  }

  .clipboard-label {
    line-height: 1.4;
    margin: 1em 0;
  }

  #download-toolbar :global(button) {
    margin-bottom: 8px;
  }

  #search-inputs :global(button) {
    margin-top: 10px;
  }

  #copy-area-codes :global(.ons-icon) {
    color: var(--ons-color-success);
  }

  :global(#nameinput.ons-input.ons-input--text.ons-input-type__input) {
    width: 100%;
  }

  :global(.button-group) {
    margin-top: 8px;
  }
#toolbar :global(.ons-js-input-abbr) {
  height: 40px;
}
</style>

