<script>
	import {
		Tabs,
		Tab,
		Input,
		Button,
		Checkbox,
		Tooltip,
		Notice
	} from "@onsvisual/svelte-components";
	import Modal from "./Modal.svelte";
	import AreaSearch from "./AreaSearch.svelte";
	import ConfirmButton from "./ConfirmButton.svelte";
	import Spinner from "./Spinner.svelte";
	import {
		uploadAreas,
		featureCollection,
		parseGeoJSON,
		findDuplicateAreaId
	} from "$lib/util/geo";
	import { downloadArea } from "$lib/util/io";
	import { areaEvent } from "$lib/util/analytics";
	import { defaultAreaName } from "$lib/config";
	import { sleep } from "$lib/util/common";

	let {
		activeArea = $bindable(),
		savedAreas = $bindable(),
		savedAreasLastId = $bindable(),
		modal = $bindable(),
		areasList = null,
		centroids,
		mode = "draw",
		title = mode === "draw" ? "Load a saved area" : "Change primary area",
		label = mode === "draw" ? "Load a saved area" : "Change area",
		updateSelection = () => null,
		switchModals = () => null
	} = $props();

	let uploader = $state();
	let loadedAreas = $state({ status: null });
	let selectAll = $derived(
		loadedAreas.selected ? loadedAreas.selected.every((d) => d === true) : false
	);
	let overwriteAreas = $state(false);
	let processing = $state(null); // null when idle, or { label, current?, total? } while busy

	let selectedArea = $state();

	let editId = $state();
	let editArea = $derived({ ...($savedAreas[editId] || {}) });

	let filterText = $state("");
	let regex = $derived(new RegExp(`\\b${filterText}`, "i"));
	let areas = $derived(Object.values($savedAreas));

	function loadSavedArea(area) {
		$activeArea = $state.snapshot(area);
		updateSelection($activeArea);
		modal.confirmDialog();
		loadedAreas = { status: null };
		areaEvent({ type: "manage-areas", label: "Load area", area: $activeArea?.properties });
	}

	async function loadNewArea(area, sendEvent = true) {
		const isBNG = loadedAreas?.isBNG; // captured before any await, so a later closeFile() can't affect it
		processing = { label: "Processing area..." };
		try {
			await sleep(); // yield so `processing` actually paints before the synchronous parse below
			$activeArea = parseGeoJSON(area, centroids, isBNG);
			updateSelection($activeArea);
			modal.confirmDialog();
			loadedAreas = { status: null };
			if (sendEvent)
				areaEvent({
					type: "manage-areas",
					label: "Load area",
					area: $activeArea?.properties
				});
		} finally {
			processing = null;
		}
	}

	function findMatchId(area) {
		return findDuplicateAreaId($savedAreas, area, loadedAreas.nameKey, loadedAreas.codeKey);
	}

	function saveNewAreaInner(area, isBNG) {
		// The actual parse+store work, shared by saveNewArea() and the bulk loop below, neither of
		// which should pay for a second nested processing/sleep() when the caller already manages it
		let id = overwriteAreas ? findMatchId(area) : null;
		if (!id) {
			$savedAreasLastId += 1;
			id = $savedAreasLastId;
		}
		const parsedArea = parseGeoJSON(area, centroids, isBNG);
		parsedArea.id = id;
		$savedAreas[id] = parsedArea;
	}

	async function saveNewArea(area, isBNG, sendEvent = true) {
		processing = { label: "Saving area..." };
		try {
			await sleep();
			saveNewAreaInner(area, isBNG ?? loadedAreas?.isBNG);
			if (sendEvent)
				areaEvent({
					type: "manage-areas",
					label: "Save area",
					area: $activeArea?.properties
				});
		} finally {
			processing = null;
		}
	}

	async function saveSelectedNewAreas() {
		const selectedAreas = loadedAreas.areas.filter((d, i) => loadedAreas.selected[i]);
		const isBNG = loadedAreas?.isBNG;
		let skipped = 0;
		processing = { label: "Saving areas", current: 0, total: selectedAreas.length };
		try {
			for (const area of selectedAreas) {
				processing.current += 1; // mutating the $state object's field is itself reactive
				await sleep();
				try {
					saveNewAreaInner(area, isBNG);
				} catch (err) {
					console.warn(err); // one bad feature shouldn't lose the rest of the batch
					skipped += 1;
				}
			}
			areaEvent({ type: "manage-areas", label: "Load multiple areas" });
			window.location.hash = "#saved-areas";
			loadedAreas = { status: null };
			if (skipped) {
				processing = {
					label: `Saved ${selectedAreas.length - skipped} of ${selectedAreas.length} areas (${skipped} could not be read)`,
					done: true
				};
			}
		} finally {
			if (!skipped) processing = null;
		}
	}

	function closeFile() {
		loadedAreas = { status: null };
		processing = null;
	}

	function toggleSelectAll() {
		if (selectAll) loadedAreas.selected = loadedAreas.selected.map(() => true);
		else loadedAreas.selected = loadedAreas.selected.map(() => false);
	}
</script>

<Modal
	bind:this={modal}
	{title}
	{label}
	buttonStyle={mode === "draw" ? "menu" : "primary"}
	hideLabel
	icon={mode === "draw" ? "upload" : "edit"}
	onOpen={() => null}
	onConfirm={() => null}
	onCancel={() => null}
	onClose={closeFile}
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
						loadNewArea(selectedArea.geojson, false);
						areaEvent({
							type: "search-select",
							label: "Select area",
							area: selectedArea.geojson?.properties
						});
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
								<th class="align-right"><span class="ons-u-vh">Options</span></th>
							</tr>
						</thead>
						<tbody>
							{#each areas as area, i (area.id)}
								<tr
									style:display={!filterText || regex.test(area.properties.areanm)
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
									{:else}
										<td class:text-light={!area.properties.areanm}
											>{area.properties.areanm || defaultAreaName}</td
										>
										<td>{area.properties.areacd}</td>
									{/if}
									<td>
										<div class="area-buttons">
											{#if editId === area.id}
												<Tooltip text="Confirm changes">
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
												<Tooltip text="Cancel">
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
												<Tooltip text="Edit area">
													<Button
														variant="secondary"
														icon="edit"
														small
														hideLabel
														on:click={() => (editId = area.id)}
														>Edit area</Button
													>
												</Tooltip>
												<Tooltip text="Download area">
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
											<Tooltip text="Delete area">
												<Button
													variant="secondary"
													icon="delete"
													small
													hideLabel
													on:click={() => {
														delete $savedAreas[area.id];
														$savedAreas = $savedAreas;
														areaEvent({
															type: "manage-areas",
															label: "Delete area",
															area: area?.properties
														});
													}}>Delete area</Button
												>
											</Tooltip>
											<Button
												variant="primary"
												small
												on:click={() => {
													loadSavedArea(area);
												}}>Select</Button
											>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<div class="button-row">
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
					<ConfirmButton
						variant="primary"
						icon="delete"
						color="#d0021b"
						small
						onConfirm={() => {
							$savedAreas = {};
							areaEvent({
								type: "manage-areas",
								label: "Delete all areas"
							});
						}}>Delete all areas</ConfirmButton
					>
				</div>
			{:else}
				<p>
					No saved areas available. Areas will appear here after you <a
						href="#upload-areas">upload an area</a
					>
					or
					<a
						href="#0"
						onclick={(e) => {
							e.preventDefault();
							switchModals();
						}}>save an area</a
					> that you selected on the map.
				</p>
			{/if}
		</Tab>
		<Tab title="Upload areas">
			<input
				type="file"
				accept=".geojson,.json"
				style:display="none"
				bind:this={uploader}
				oninput={async () => {
					processing = { label: "Reading file..." };
					loadedAreas = await uploadAreas(uploader);
					uploader.value = "";
					processing = null;
				}}
			/>
			{#if processing?.done}
				<p>{processing.label}</p>
			{:else if processing}
				<Spinner
					inline
					message={processing.total
						? `${processing.label} (${processing.current} of ${processing.total})...`
						: processing.label}
				/>
			{/if}
			{#if loadedAreas.truncatedCount}
				<Notice mode="warning">
					This file included {loadedAreas.totalCount.toLocaleString("en-GB")} areas, which is
					more than this tool can process in one upload. The first {loadedAreas.areas.length.toLocaleString(
						"en-GB"
					)} are shown here; {loadedAreas.truncatedCount.toLocaleString("en-GB")} have been
					left out.
				</Notice>
			{/if}
			{#if loadedAreas.status === "single"}
				{@const area = loadedAreas.areas[0]}
				<p>Uploaded file includes one valid area.</p>
				<Input
					cls="ons-u-mb-2xs"
					label="Edit area name"
					value={area.properties[loadedAreas.nameKey]}
					disabled={!!processing}
				/>
				<Checkbox
					label="Overwrite existing on save"
					bind:checked={overwriteAreas}
					disabled={!!processing}
					compact
				/>
				<div class="button-row">
					<Button small disabled={!!processing} on:click={() => loadNewArea(area)}
						>Select on map</Button
					>
					<Button
						variant="secondary"
						icon="save"
						disabled={!!processing}
						on:click={() => saveNewArea(area)}
						small>Add to saved areas</Button
					>
					<Button
						variant="secondary"
						icon="cross"
						small
						disabled={!!processing}
						on:click={closeFile}>Close file</Button
					>
				</div>
			{:else if loadedAreas.status === "multi"}
				{#if !loadedAreas.truncatedCount}
					<p>
						Uploaded file includes {loadedAreas.areas.length.toLocaleString("en-GB")} valid
						areas.
					</p>
				{/if}
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
											label={area.properties?.[loadedAreas.nameKey] ||
												defaultAreaName}
											bind:checked={loadedAreas.selected[i]}
											disabled={!!processing}
											compact
										/></td
									>
									<td>{area.properties?.[loadedAreas.codeKey] || ""}</td>
									<td class="align-right"
										><Button
											variant="secondary"
											disabled={!!processing}
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
					disabled={!!processing}
					compact
				/>
				<Checkbox
					label="Overwrite duplicate areas"
					bind:checked={overwriteAreas}
					disabled={!!processing}
					compact
				/>
				<div class="button-row">
					<Button
						variant="primary"
						icon="save"
						small
						disabled={!!processing}
						on:click={saveSelectedNewAreas}>Save selected areas</Button
					>
					<Button
						variant="secondary"
						icon="cross"
						small
						disabled={!!processing}
						on:click={closeFile}>Close file</Button
					>
				</div>
			{:else if loadedAreas.status === "invalid"}
				<p>Uploaded file did not contain valid Polygon or MultiPolygon features.</p>
				<div class="button-row">
					<Button variant="primary" icon="upload" small on:click={() => uploader.click()}
						>Upload a GeoJSON file</Button
					>
				</div>
			{:else}
				<p>
					Upload a file previously saved from this tool, or any other valid GeoJSON file
					that contains one or more area polygons.* You can also select from <a
						href="#saved-areas">previously saved areas</a
					>.
				</p>
				<div class="button-row">
					<Button variant="primary" icon="upload" small on:click={() => uploader.click()}
						>Upload a GeoJSON file</Button
					>
				</div>
				<div>
					<small
						>*GeoJSON files must be saved using longitude/latitude (WGS 84) or British
						National Grid coordinates.</small
					>
				</div>
			{/if}
		</Tab>
	</Tabs>
</Modal>

<style>
	/* The tab panel is a flex column (see Modal.svelte), so without this, sibling buttons that used
	   to sit side by side in normal flow would each take their own full-width row instead */
	.button-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
	}
	.saved-areas-container {
		overflow: auto;
		flex: 1 1 auto;
		min-height: 150px;
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
