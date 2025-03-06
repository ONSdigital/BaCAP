<script>
import { setDrawMode,setPanMode, setRadiusMode, zoomIn, zoomOut, newselect, undo, buildProfile, downloadArea, setDrawData, loadGeo, setEraseMode, doSelect } from "$lib/config/toolbar"; 
import { ToolbarsContainer,Toolbar,ToolbarButton, ToolbarDivider,ToolControls,ToolControl, HelpModal, Button, ButtonGroup,ButtonGroupItem } from "@onsvisual/svelte-components";
import { mapObject,drawType, centroids, selected,currentMapZoom, user_geometry } from "$lib/stores/mapstore";
import { minzoom, maxzoom } from "$lib/config/geography";
import { update, simplifyGeo, geoBlob, clearGeo, changeData } from "$lib/util/drawing-utils";
import Select, { getPlace } from "$lib/ui/Select.svelte";


let uploader
export let state;
export let radius=0.5;

</script>

<div style="z-index:99;position:relative;">
  <ToolbarsContainer>
    <Toolbar>
      <ToolbarButton id="move" icon="move" label="Move and Pan" on:click={setPanMode} sticky>
        <p>Left-click anywhere on the map and hold the button down while dragging the mouse to move the map in the desired direction.</p><img src='/img/movepan.png' alt='Move and pan' />
      </ToolbarButton>

      <ToolbarButton id="polygon" icon="polygon" label="Draw a polygon" hasAriaControls on:click={setDrawMode} sticky>
        <p>Draw custom boundaries by creating a polygon shape. Simply click on the map to set the vertices of your polygon, and the tool will automatically connect the points to form the boundary.</p><img src='/img/polygon.png' alt='Image of map showing drawing boundaries by clicking'/>
      </ToolbarButton>

      <ToolbarButton id="circle" icon="radius" label="Draw a circle" hasAriaControls on:click={setRadiusMode} sticky>
        <p>Select an area radius on the map by using the radius tool. Choose from different size selection before clicking on the map to select that area.</p>
      </ToolbarButton>

      <ToolbarButton id="erase" icon="erase" label="Erase a circle" hasAriaControls on:click={setEraseMode} sticky>
        <p>To remove an area from the map, select the Eraser tool. This allows you to select an eraser size, and remove a selected area by clicking on the map.</p>
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton id="clear" icon="bin" label="Clear all drawn areas" on:click={newselect} transient>
        <p>Clear all drawn areas from the map.</p>
      </ToolbarButton>
      <ToolbarButton id="undo" icon="undo" label="Undo last step" on:click={undo} disabled={$selected.length < 2} transient>
        <p>If you make a mistake, you can undo actions by selecting the Undo button from the toolbar.</p>
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton id="zoomin" icon="zoomin" label="Zoom in" on:click={zoomIn} transient disabled={$currentMapZoom >= maxzoom}>
        <p>Get a more detailed view of areas of the map by using the Zoom in </p>
      </ToolbarButton> 

      <ToolbarButton id="zoomout" icon="zoomout" label="Zoom out" on:click={zoomOut} transient disabled={$currentMapZoom <= minzoom}>
        <p>and Zoom out tool.</p>
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
          <!-- <Button variant="secondary" on:click={newselect}>Clear shape</Button> -->
          <!-- <Button variant="primary">Apply shape</Button> -->
        </ToolControl>
        <ToolControl id="circle">
          <p>Select a radius size and click or tap on the map to select an area.</p>
          <ButtonGroup visuallyHideLegend legend="Select a radius size" bind:value="{radius}">
            <ButtonGroupItem value={0.5} label="0.5km"/>
            <ButtonGroupItem value={1} label="1km"/>
            <ButtonGroupItem value={2} label="2km"/>
            <ButtonGroupItem value={5} label="5km"/>
            <ButtonGroupItem value={8} label="8km"/>
            <ButtonGroupItem value={10} label="10km"/>
          </ButtonGroup>
        </ToolControl>
        <ToolControl id="erase">
          <p>Select a radius size and click or tap on the map to remove an area.</p>
          <ButtonGroup visuallyHideLegend legend="Select a radius size" bind:value="{radius}">
            <ButtonGroupItem value={0.5} label="0.5km"/>
            <ButtonGroupItem value={1} label="1km"/>
            <ButtonGroupItem value={2} label="2km"/>
            <ButtonGroupItem value={5} label="5km"/>
            <ButtonGroupItem value={8} label="8km"/>
            <ButtonGroupItem value={10} label="10km"/>
          </ButtonGroup>
        </ToolControl>
        <ToolControl id="search">
          <p>Use the search to select an area to apply it to the map</p>
          <Select on:select={doSelect} />
        </ToolControl>
        
      </ToolControls>
    </Toolbar>
    <Toolbar>
      
      <ToolbarButton id="download" icon="download" label="Download area" disabled={$selected.length < 2} on:click={downloadArea(state)}>
        <p>You can save a selected area as a GeoJSON file, which you can use at a later time  or share with another person to upload and reselect that area.</p>
      </ToolbarButton>
      <ToolbarButton id="upload" icon="upload" label="Upload a geometry" on:click={uploader.click()}>
        <p>To automatically select a defined custom area, you can upload a GeoJSON file that had been saved previously.</p>
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton id="help" icon="help" label="Help" sticky>
        <p>To show help and guidance at any time, select this option in the toolbar.</p>
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton id="getstarted" custom label="Get started">
        <p>Once you are happy with the area shape, you can start choosing from a wide variety of datasets to build your area profile.</p>
        <div slot="custom">
          <Button disabled={!$selected[$selected.length - 1].oa.size > 0} small on:click={buildProfile}>Build profile</Button>
        </div>
      </ToolbarButton>
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
   margin:0;
  }
</style>

