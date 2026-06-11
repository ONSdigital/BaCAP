<script>
	import { Tabs, Tab, Input, Button, Checkbox } from "@onsvisual/svelte-components";
	import Modal from "./Modal.svelte";
	import { uploadAreas, downloadArea, featureCollection, parseGeoJSON } from "$lib/geo.svelte.js";

	let {
		activeArea = $bindable(),
		savedAreas = $bindable(),
		centroids,
		updateSelection = () => null
	} = $props();

	let modal = $state();

	let uploader = $state();
	let loadedAreas = $state({ status: null });
	let selectAll = $derived(
		loadedAreas.selected ? loadedAreas.selected.every((d) => d === true) : false
	);
	let overwriteAreas = $state(false);

	let editId = $state();
	let editArea = $derived({ ...($savedAreas[editId] || {}) });

	let filterText = $state();
	let regex = $derived(new RegExp(`\\b${filterText}`, "i"));
	let areas = $derived(Object.values($savedAreas));
	let groups = $derived(Array.from(new Set(areas.map((d) => d.properties.group))));
	let activeGroups = $derived([...groups]);

	function loadSavedArea(area) {
		$activeArea = $state.snapshot(area);
		updateSelection($activeArea);
		modal.closeDialog();
		loadedAreas = { status: null };
	}

	function loadNewArea(area) {
		$activeArea = parseGeoJSON(area, centroids);
		updateSelection($activeArea);
		modal.closeDialog();
		loadedAreas = { status: null };
	}

	function saveNewArea(area) {
		const id =
			area.id && overwriteAreas ? area.id : Math.max(...[0, ...Object.keys($savedAreas)]) + 1;
		const parsedArea = parseGeoJSON(area, centroids);
		parsedArea.id = id;
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
</script>

<Modal
	bind:this={modal}
	title="Load a saved area"
	label="Load a saved area"
	hideLabel
	icon="upload"
	onOpen={() => null}
	onConfirm={() => null}
	onCancel={() => null}
>
	<Tabs>
		<Tab title="Saved areas">
			{#if areas.length > 0}
				<Input
					label="Filter by name"
					placeholder="Type an area name"
					bind:value={filterText}
				/>
				<div class="saved-areas-container">
					<table class="saved-areas">
						<thead>
							<tr>
								<th>Name</th>
								<th>Group</th>
								<th class="align-right"><span class="ons-u-vh">Options</span></th>
							</tr>
						</thead>
						<tbody>
							{#each areas as area (area.id)}
								<tr
									style:display={(!filterText ||
										regex.test(area.properties.areanm)) &&
									activeGroups.includes(area.properties.group)
										? null
										: "none"}
								>
									{#if editId === area.id}
										<td><input bind:value={editArea.properties.areanm} /></td>
										<td><input bind:value={editArea.properties.group} /></td>
									{:else}
										<td>{area.properties.areanm}</td>
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
												<Button
													variant="secondary"
													icon="cross"
													small
													hideLabel
													on:click={() => (editId = null)}
													>Cancel changes</Button
												>
											{:else}
												<Button
													variant="secondary"
													icon="edit"
													small
													hideLabel
													on:click={() => (editId = area.id)}
													>Edit area</Button
												>
												<Button
													variant="secondary"
													icon="download"
													small
													hideLabel
													on:click={() => downloadArea(area)}
													>Download area</Button
												>
											{/if}
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
		<Tab title="Upload areas">
			<input
				type="file"
				accept=".geojson,.json"
				style:display="none"
				bind:this={uploader}
				oninput={async () => (loadedAreas = await uploadAreas(uploader))}
			/>
			{#if loadedAreas.status === "single"}
				<p>Uploaded file includes one valid area.</p>
				<Input
					label="Edit area name"
					value={loadedAreas.areas[0].properties[loadedAreas.nameKey]}
				/>
				<Checkbox label="Overwrite existing" bind:checked={overwriteAreas} compact />
				<Button small on:click={() => loadNewArea(loadedAreas.areas[0])}>Add to map</Button>
				<Button variant="secondary" small>Add to saved areas</Button>
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
											small>Add to map</Button
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
					that contains one or more area polygons.
				</p>
				<Button variant="primary" icon="upload" small on:click={() => uploader.click()}
					>Upload a GeoJSON file</Button
				>
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
