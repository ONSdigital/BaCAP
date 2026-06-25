<script>
	import { Tabs, Tab, Input, Button, Checkbox, Tooltip } from "@onsvisual/svelte-components";
	import Modal from "./Modal.svelte";
	import AreaSearch from "./AreaSearch.svelte";
	import {
		uploadAreas,
		downloadArea,
		featureCollection,
		parseGeoJSON,
		getCodeKey
	} from "$lib/geo.svelte.js";

	let {
		activeArea = $bindable(),
		savedAreas = $bindable(),
		savedAreasLastId = $bindable(),
		modal = $bindable(),
		areasList = null,
		centroids,
		mode = "draw",
		updateSelection = () => null,
		switchModals = () => null
	} = $props();

	let uploader = $state();
	let loadedAreas = $state({ status: null });
	let selectAll = $derived(
		loadedAreas.selected ? loadedAreas.selected.every((d) => d === true) : false
	);
	let overwriteAreas = $state(false);

	let selectedArea = $state();

	let editId = $state();
	let editArea = $derived({ ...($savedAreas[editId] || {}) });

	let filterText = $state("");
	let regex = $derived(new RegExp(`\\b${filterText}`, "i"));
	let areas = $derived(Object.values($savedAreas));
	let groups = $derived(Array.from(new Set(areas.map((d) => d.properties.group))));
	let activeGroups = $derived([...groups]);

	function loadSavedArea(area) {
		$activeArea = $state.snapshot(area);
		updateSelection($activeArea);
		modal.confirmDialog();
		loadedAreas = { status: null };
	}

	function loadNewArea(area) {
		$activeArea = parseGeoJSON(area, centroids);
		updateSelection($activeArea);
		modal.confirmDialog();
		loadedAreas = { status: null };
	}

	function findMatchId(area) {
		const id = area.id;
		const keys = Object.keys(area.properties);
		const code = area.properties[getCodeKey(keys)];
		return $savedAreas[id]
			? id
			: Object.values($savedAreas).find((d) => d.properties.areacd === code)?.id || null;
	}

	function saveNewArea(area) {
		let id = overwriteAreas ? findMatchId(area) : null;
		if (!id) {
			$savedAreasLastId += 1;
			id = $savedAreasLastId;
		}
		const parsedArea = parseGeoJSON(area, centroids);
		parsedArea.id = id;
		if (!parsedArea.properties.group) parsedArea.properties.group = "Uploaded areas";
		$savedAreas[id] = parsedArea;
		// $savedAreas = $savedAreas;
	}

	function saveSelectedNewAreas() {
		for (const area of loadedAreas.areas.filter((d, i) => loadedAreas.selected[i])) {
			saveNewArea(area);
		}
		window.location.hash = "#saved-areas";
		loadedAreas = { status: null };
	}

	function closeFile() {
		loadedAreas = { status: null };
	}

	function toggleSelectAll() {
		if (selectAll) loadedAreas.selected = loadedAreas.selected.map(() => true);
		else loadedAreas.selected = loadedAreas.selected.map(() => false);
	}

	function getTooltipPos(areas, i) {
		return areas.length > 1 && i === areas.length - 1 ? "top" : "bottom";
	}
</script>

<Modal
	bind:this={modal}
	title="Load a saved area"
	label="Load a saved area"
	buttonStyle={mode === "draw" ? "menu" : "primary"}
	hideLabel
	icon="upload"
	onOpen={() => null}
	onConfirm={() => null}
	onCancel={() => null}
>
	<Tabs>
		{#if mode === "build" && areasList}
			<Tab title="Find an area">
				<p>
					Find pre-defined areas including local authorities, wards, parishes,
					parliamentary constituencies and build-up areas.
				</p>
				<form
					onsubmit={(e) => {
						e.preventDefault();
						loadNewArea(selectedArea.geojson);
					}}
				>
					<AreaSearch
						bind:value={selectedArea}
						options={areasList}
						label="Find an area"
					/>
					<Button type="submit" cls="ons-u-mt-2xs" disabled={!selectedArea}
						>Select area</Button
					>
				</form>
			</Tab>
		{/if}
		<Tab title="Upload areas">
			<input
				type="file"
				accept=".geojson,.json"
				style:display="none"
				bind:this={uploader}
				oninput={async () => (loadedAreas = await uploadAreas(uploader))}
			/>
			{#if loadedAreas.status === "single"}
				{@const area = loadedAreas.areas[0]}
				<p>Uploaded file includes one valid area.</p>
				<Input
					cls="ons-u-mb-2xs"
					label="Edit area name"
					value={area.properties[loadedAreas.nameKey]}
				/>
				<Checkbox
					label="Overwrite existing on save"
					bind:checked={overwriteAreas}
					compact
				/>
				<Button small on:click={() => loadNewArea(area)}>Select on map</Button>
				<Button variant="secondary" icon="save" on:click={() => saveNewArea(area)} small
					>Add to saved areas</Button
				>
				<Button variant="secondary" icon="cross" small on:click={closeFile}
					>Close file</Button
				>
			{:else if loadedAreas.status === "multi"}
				<p>
					Uploaded file includes {loadedAreas.areas.length.toLocaleString("en-GB")} valid areas.
				</p>
				<div class="saved-areas-container">
					<table class="saved-areas">
						<thead>
							<tr>
								<th style:padding-left="34px">Area name</th>
								<th>Area code</th>
								<th><span class="ons-u-vh">Options</span></th>
							</tr>
						</thead>
						<tbody>
							{#each loadedAreas.areas as area, i}
								<tr>
									<td
										><Checkbox
											label={area.properties?.[loadedAreas.nameKey] || ""}
											bind:checked={loadedAreas.selected[i]}
											compact
										/></td
									>
									<td>{area.properties?.[loadedAreas.codeKey] || ""}</td>
									<td class="align-right"
										><Button
											variant="secondary"
											on:click={() => loadNewArea(area)}
											small>Select on map</Button
										></td
									>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<Checkbox
					label="Select all areas"
					bind:checked={selectAll}
					on:change={toggleSelectAll}
					compact
				/>
				<Checkbox label="Overwrite duplicate areas" bind:checked={overwriteAreas} compact />
				<Button variant="primary" icon="save" small on:click={saveSelectedNewAreas}
					>Save selected areas</Button
				>
				<Button variant="secondary" icon="cross" small on:click={closeFile}
					>Close file</Button
				>
			{:else if loadedAreas.status === "invalid"}
				<p>Uploaded file did not contain valid Polygon or MultiPolygon features.</p>
				<Button variant="primary" icon="upload" small on:click={() => uploader.click()}
					>Upload a GeoJSON file</Button
				>
			{:else}
				<p>
					Upload a file previously saved from this tool, or any other valid GeoJSON file
					that contains one or more area polygons.* You can also select from <a
						href="#saved-areas">previously saved areas</a
					>.
				</p>
				<Button variant="primary" icon="upload" small on:click={() => uploader.click()}
					>Upload a GeoJSON file</Button
				>
				<div>
					<small
						>*GeoJSON files must be saved using the WGS 84 (longitude/latitude)
						coordinate reference system.</small
					>
				</div>
			{/if}
		</Tab>
		<Tab title="Saved areas">
			{#if areas.length > 0}
				<Input
					label="Filter areas by name"
					placeholder="Type an area name"
					bind:value={filterText}
				/>
				<div class="saved-areas-container">
					<table class="saved-areas">
						<thead>
							<tr>
								<th>Name</th>
								<th>Code</th>
								<th>Group</th>
								<th class="align-right"><span class="ons-u-vh">Options</span></th>
							</tr>
						</thead>
						<tbody>
							{#each areas as area, i (area.id)}
								<tr
									style:display={(!filterText ||
										regex.test(area.properties.areanm)) &&
									activeGroups.includes(area.properties.group)
										? null
										: "none"}
								>
									{#if editId === area.id}
										<td
											><input
												class="ons-input ons-input--text ons-input-type__input ons-input--w-20"
												bind:value={editArea.properties.areanm}
											/></td
										>
										<td
											><input
												class="ons-input ons-input--text ons-input-type__input ons-input--w-6"
												bind:value={editArea.properties.areacd}
											/></td
										>
										<td
											><input
												class="ons-input ons-input--text ons-input-type__input ons-input--w-10"
												bind:value={editArea.properties.group}
											/></td
										>
									{:else}
										<td>{area.properties.areanm}</td>
										<td>{area.properties.areacd}</td>
										<td>{area.properties.group}</td>
									{/if}
									<td>
										<div class="area-buttons">
											<Button
												variant="primary"
												small
												on:click={() => loadSavedArea(area)}>Select</Button
											>
											{#if editId === area.id}
												<Tooltip
													text="Confirm changes"
													position={getTooltipPos(areas, i)}
												>
													<Button
														variant="primary"
														icon="tick"
														small
														hideLabel
														on:click={() => {
															$savedAreas[editId] = { ...editArea };
															$savedAreas = $savedAreas;
															editId = null;
														}}>Confirm changes</Button
													>
												</Tooltip>
												<Tooltip
													text="Cancel"
													position={getTooltipPos(areas, i)}
												>
													<Button
														variant="secondary"
														icon="cross"
														small
														hideLabel
														on:click={() => (editId = null)}
														>Cancel changes</Button
													>
												</Tooltip>
											{:else}
												<Tooltip
													text="Edit area"
													position={getTooltipPos(areas, i)}
												>
													<Button
														variant="secondary"
														icon="edit"
														small
														hideLabel
														on:click={() => (editId = area.id)}
														>Edit area</Button
													>
												</Tooltip>
												<Tooltip
													text="Download area"
													position={getTooltipPos(areas, i)}
												>
													<Button
														variant="secondary"
														icon="download"
														small
														hideLabel
														on:click={() => downloadArea(area)}
														>Download area</Button
													>
												</Tooltip>
											{/if}
											<Tooltip text="Delete area" position="left">
												<Button
													variant="secondary"
													icon="delete"
													small
													hideLabel
													on:click={() => {
														delete $savedAreas[area.id];
														$savedAreas = $savedAreas;
													}}>Delete area</Button
												>
											</Tooltip>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<Button
					variant="secondary"
					icon="download"
					small
					on:click={() =>
						downloadArea(
							featureCollection(Object.values($savedAreas)),
							`custom_areas_${new Date().toISOString().slice(0, 10)}`
						)}>Download all areas</Button
				>
				<Button
					variant="primary"
					icon="delete"
					color="#d0021b"
					small
					on:click={() => ($savedAreas = {})}>Delete all areas</Button
				>
			{:else}
				<p>
					No saved areas available. Areas will appear here when you <a
						href="#upload-areas">upload an area</a
					> or save the areas you select on the map.
				</p>
			{/if}
		</Tab>
	</Tabs>
</Modal>

<style>
	.saved-areas-container {
		overflow: auto;
		max-height: calc(100vh - 400px);
		margin: 0.5em 0 1em;
	}
	table.saved-areas {
		width: 100%;
		border-collapse: collapse;
	}
	table.saved-areas thead {
		position: sticky;
		top: 0;
		background: var(--ons-color-page-light);
		border-bottom: none;
		z-index: 2;
	}
	table.saved-areas th,
	table.saved-areas td {
		padding: 4px 2px 6px;
	}
	table.saved-areas th {
		text-align: left;
		box-shadow: 0px -1px var(--ons-color-text) inset;
		border-bottom: none;
	}
	table.saved-areas td {
		border-bottom: 1px solid var(--ons-color-borders-light);
	}
	.align-right {
		text-align: right;
	}
	.area-buttons {
		display: flex;
		flex-direction: row;
		justify-content: flex-end;
		gap: 4px;
	}
	.area-buttons :global(button) {
		margin: 0;
		line-height: 1rem !important;
	}
</style>
