<script>
import { setDrawMode,setPanMode, setRadiusMode, zoomIn, zoomOut, newselect, undo, buildProfile, downloadArea, loadGeo, setEraseMode, doSelect, copyAreasToClipboard } from "$lib/config/toolbar"; 
import { Input, ToolbarsContainer,Toolbar,ToolbarButton, ToolbarDivider,ToolControls,ToolControl, Icon, Button, ButtonGroup,ButtonGroupItem } from "@onsvisual/svelte-components";
import { mapObject,drawType, centroids, selected,currentMapZoom, user_geometry } from "$lib/stores/mapstore";
import { minzoom, maxzoom } from "$lib/config/geography";
import Select from "$lib/ui/Select.svelte";
import SliderCombo from "$lib/ui/SliderCombo.svelte";
import { base } from "$app/paths";
import { updateLocalStorage } from "$lib/util/build-utils";

let container;

let uploader
export let state;
export let radius=0.5;

$:updateLocalStorage($state.name)

let confirmed = {oa: false, lsoa: false};

async function setConfirmed(type = 'oa') {
  confirmed[type] = true;
  await new Promise((resolve) => setTimeout(resolve, 3000));
  confirmed[type] = false;
}

console.log({$state})
console.log({$selected})
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

      <ToolbarButton id="erase" icon="erase" label="Erase a circle" hasAriaControls on:click={setEraseMode} sticky>
        <p>Deselect part of your highlighted area shape. Select how large an area you wish to remove and click on the map.</p>
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
          <Select label="Use the search to select an area to apply it to the map." id="draw-page-search" on:select={doSelect} autoFocus={true} autoClear/>
        </ToolControl>
      </ToolControls>
    </Toolbar>

    <Toolbar>
      <ToolbarButton id="download" icon="download" label="Download area" disabled={!$selected[$selected.length - 1].oa.size > 0}>
        <p>You can save a selected area as a GeoJSON file, which you can use at a later time  or share with another person to upload and reselect that area.</p>
      </ToolbarButton>
      <ToolbarButton id="upload" icon="upload" label="Upload a geometry" on:click={() => uploader.click()}>
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

