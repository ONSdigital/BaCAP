<script>
	import { resolve } from "$app/paths";
	import {
		ToolbarsContainer,
		Toolbar,
		ToolbarButton,
		ToolbarDivider,
		ToolControls,
		ToolControl,
		Button
	} from "@onsvisual/svelte-components";
	import SliderCombo from "./SliderCombo.svelte";
	import AreaSearch from "./AreaSearch.svelte";
	import LoadModal from "./LoadModal.svelte";
	import SaveModal from "./SaveModal.svelte";

	let {
		appState = $bindable(),
		drawState = $bindable(),
		centroids,
		areasList = [],
		runAction = () => null
	} = $props();

	let { history, rehistory, activeArea, savedAreas, savedAreasLastId } = appState;
	let selectedArea = $state.raw(null);

	let loadModal = $state();
	let saveModal = $state();

	$inspect({ selectedArea });
</script>

<div id="draw-toolbar">
	<ToolbarsContainer>
		<Toolbar>
			<ToolbarButton
				id="move"
				icon="move"
				label="Move and Pan"
				on:click={() => (drawState.drawMode = "pan")}
				sticky
			>
				<p>Left-click and hold anywhere on the map to move.</p>
			</ToolbarButton>

			<ToolbarButton
				id="polygon"
				icon="polygon"
				label="Draw a polygon"
				on:click={() => (drawState.drawMode = "polygon")}
				hasAriaControls
				sticky
			>
				<p>
					Draw a custom shape. Click on the map to set the corners of your shape boundary
					and the tool will automatically connect the points to form a polygon.
				</p>
			</ToolbarButton>

			<ToolbarButton
				id="circle"
				icon="radius"
				label="Draw a circle"
				on:click={() => (drawState.drawMode = "radius")}
				hasAriaControls
				sticky
			>
				<p>
					Select a circular area on the map. Choose your radius size before clicking on
					the map to select.
				</p>
			</ToolbarButton>

			<ToolbarDivider />

			<ToolbarButton
				id="erase"
				icon="erase"
				label="Toggle erase mode"
				bind:selected={drawState.eraseMode}
				hasAriaControls
				toggle
			>
				<p>
					Toggle erase mode. In erase mode, if you draw a polygon or radius, it will be
					removed from your selection instead of added.
				</p>
			</ToolbarButton>

			<ToolbarDivider />

			<ToolbarButton
				id="clear"
				icon="bin"
				label="Clear all drawn areas"
				disabled={$history.length < 2}
				on:click={() => runAction("clearDraw")}
				transient
			>
				<p>Clear all selected areas from the map.</p>
			</ToolbarButton>
			<ToolbarButton
				id="undo"
				icon="undo"
				label="Undo last step"
				disabled={$history.length < 2}
				on:click={() => runAction("undoDraw")}
				transient
			>
				<p>Undo your last action.</p>
			</ToolbarButton>
			<ToolbarButton
				id="redo"
				icon="redo"
				label="Redo next step"
				disabled={$rehistory.length < 1}
				on:click={() => runAction("redoDraw")}
				transient
			>
				<p>Redo your next action.</p>
			</ToolbarButton>

			<ToolbarDivider />

			<ToolbarButton
				id="zoomin"
				icon="zoomin"
				label="Zoom in"
				on:click={() => runAction("zoomIn")}
				transient
			>
				<p>Zoom in.</p>
			</ToolbarButton>

			<ToolbarButton
				id="zoomout"
				icon="zoomout"
				label="Zoom out"
				on:click={() => runAction("zoomOut")}
				transient
			>
				<p>Zoom out.</p>
			</ToolbarButton>

			<!-- <ToolbarButton id="redo" icon="redo" label="Redo last step" disabled /> -->
			<ToolbarDivider />
			<ToolbarButton id="search" icon="search" label="Search for an area" sticky>
				<p>
					You can use the Area search tool to quickly search for and automatically select
					defined areas and boundaries.
				</p>
			</ToolbarButton>

			<ToolControls slot="controls">
				<ToolControl id="polygon">
					<p>
						Click or tap an area on the map to add a node to the shape. To apply a
						shape, close it by clicking or tapping on the starting node.
					</p>
				</ToolControl>
				<ToolControl id="circle">
					<p>Select a radius size and click or tap on the map to select an area.</p>
					<SliderCombo
						min={0.1}
						max={20}
						step={0.1}
						bind:value={drawState.radius}
						autoFocus
					/>
				</ToolControl>
				<ToolControl id="search">
					<form
						id="search-form"
						onsubmit={(e) => {
							e.preventDefault();
							if (selectedArea) {
								runAction("applyShape", [selectedArea, "replace"]);
								runAction("fitPolygon");
								selectedArea = null;
							}
						}}
					>
						<AreaSearch bind:value={selectedArea} options={areasList} autoFocus />
						<div id="search-inputs">
							<Button type="submit" small>Select area</Button>
							{#if $history.length > 1}
								<Button
									on:click={() => {
										if (selectedArea) {
											runAction("applyShape", [selectedArea, "add"]);
											runAction("fitPolygon");
											selectedArea = null;
										}
									}}
									small
									variant="secondary">Add to current selection</Button
								>
							{/if}
						</div>
					</form>
				</ToolControl>
			</ToolControls>
		</Toolbar>

		<Toolbar>
			<ToolbarButton id="download" icon="download" label="Save current area" custom>
				<div slot="custom">
					<SaveModal
						bind:activeArea
						bind:savedAreas
						bind:savedAreasLastId
						bind:modal={saveModal}
						{history}
						{centroids}
						switchModals={() => {
							saveModal.cancelDialog();
							loadModal.openDialog();
						}}
					/>
				</div>
				<p>
					You can save a selected area as a GeoJSON file, which you can use at a later
					time or share with another person to upload and reselect that area.
				</p>
			</ToolbarButton>
			<ToolbarButton id="upload" icon="upload" label="Load a saved area" custom>
				<div slot="custom">
					<LoadModal
						bind:activeArea
						bind:savedAreas
						bind:savedAreasLastId
						bind:modal={loadModal}
						{centroids}
						updateSelection={(area) => {
							runAction("applyShape", [area, "replace"]);
							runAction("fitPolygon");
						}}
						switchModals={() => {
							loadModal.cancelDialog();
							saveModal.openDialog();
						}}
					/>
				</div>
				<p>
					To automatically select a defined custom area, you can upload a GeoJSON file
					that had been saved previously.
				</p>
			</ToolbarButton>
			<ToolbarDivider />
			<ToolbarButton id="help" icon="help" label="Help">
				<p>To show help and guidance at any time, select this option in the toolbar.</p>
			</ToolbarButton>
			<ToolbarDivider />
			<ToolbarButton id="getstarted" custom label="Get started" hasTooltip={false}>
				<p>
					Once you are happy with the area shape, you can start choosing from a wide
					variety of datasets to build your area profile.
				</p>
				<div slot="custom">
					<Button
						icon="arrow"
						iconPosition="after"
						href={resolve("/build")}
						disabled={$history.length < 2}
						small>Build profile</Button
					>
				</div>
			</ToolbarButton>
		</Toolbar>
	</ToolbarsContainer>
</div>

<style>
	:global(#draw-toolbar) {
		position: absolute;
		pointer-events: none;
		z-index: 1;
		width: 100%;
	}
	:global(.toolbar) {
		pointer-events: all;
		align-items: stretch !important;
	}
	#search-inputs {
		margin-top: 6px;
	}
</style>
