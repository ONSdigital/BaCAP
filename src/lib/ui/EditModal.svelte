<script>
	import { Input, Button, Tooltip } from "@onsvisual/svelte-components";
	import Modal from "./Modal.svelte";
	import { downloadArea, featureCollection } from "$lib/geo.svelte.js";

	let { savedAreas = $bindable(), modal = $bindable() } = $props();

	let editId = $state();
	let editArea = $derived({ ...($savedAreas[editId] || {}) });

	let filterText = $state("");
	let regex = $derived(new RegExp(`\\b${filterText}`, "i"));
	let areas = $derived(Object.values($savedAreas));
	let groups = $derived(Array.from(new Set(areas.map((d) => d.properties.group))));
	let activeGroups = $derived([...groups]);
</script>

<Modal
	bind:this={modal}
	title="Edit saved areas"
	label="Edit saved areas"
	buttonStyle="secondary"
	icon="edit"
	onOpen={() => null}
	onConfirm={() => null}
	onCancel={() => null}
>
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
							style:display={(!filterText || regex.test(area.properties.areanm)) &&
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
			No saved areas available. Visit the <a href="#upload-areas">draw an area</a> page to define
			and save areas.
		</p>
	{/if}
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
